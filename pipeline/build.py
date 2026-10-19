"""Turns the stored history into docs/data.json for the MapFacto Studio website.

Everything the page shows (totals, verdicts, insights, matrix, charts, point updates) is
computed here, so the website itself only has to draw it.
"""
import json
import re
from datetime import datetime, timezone

import numpy as np
import pandas as pd

PLATFORMS = ["YouTube", "TikTok", "Instagram", "Facebook"]
TITLE_PRIORITY = {"YouTube": 0, "Instagram": 1, "Facebook": 2, "TikTok": 3}
DEFAULT_LEN_S = 30
MAX_POINTS = 300
UPDATE_EVERY_MIN = 30


# ------------------------------------------------------------------ helpers
def clean(title):
    return re.sub(r"\s+", " ", re.sub(r"#[^\W\d]\w*", "", title or "")).strip() or "(untitled)"


def words(title):
    return re.sub(r"[^a-z0-9à-ÿ]+", " ", clean(title).lower()).split()


def match_keys(df):
    """One key per video across platforms. Captions that START with another platform's
    title (TikTok adds text after it) get that title's key."""
    canon = {}
    for pl in sorted(df.platform.unique(), key=lambda p: TITLE_PRIORITY.get(p, 9)):
        for t in df[df.platform == pl].title.unique():
            w = tuple(words(t))
            if len(w) >= 3 and not any(w[:len(c)] == c for c in canon):
                canon[w] = " ".join(w)
    ordered = sorted(canon, key=len)

    def key(t):
        w = tuple(words(t))
        hits = [c for c in ordered if w[:len(c)] == c]
        return canon[hits[-1]] if hits else " ".join(w)
    return df.title.map(key)


def num(x, digits=None):
    if x is None:
        return None
    try:
        if pd.isna(x):
            return None
    except (TypeError, ValueError):
        pass
    x = float(x)
    return round(x, digits) if digits is not None else int(round(x))


def iso(ts):
    return None if ts is None or pd.isna(ts) else pd.Timestamp(ts).isoformat()


def fmt(n):
    return "—" if n is None or pd.isna(n) else f"{int(round(n)):,}"


def short(t, n=48):
    return t if len(t) <= n else t[: n - 1] + "…"


def video_url(platform, vid):
    return {
        "YouTube": f"https://www.youtube.com/shorts/{vid}",
        "TikTok": f"https://www.tiktok.com/@mapfacto_/video/{vid}",
        "Facebook": f"https://www.facebook.com/reel/{vid}",
        "Instagram": "https://www.instagram.com/mapfacto/",
    }.get(platform)


# ------------------------------------------------------------------ load
def load(conn):
    s = pd.read_sql_query(
        "SELECT s.pulled_at, s.platform, s.video_id, s.views, s.likes, s.comments, s.shares, "
        "s.avg_watch_s, v.title, v.published_at, v.duration_s, v.url FROM stats s "
        "JOIN videos v ON v.platform=s.platform AND v.video_id=s.video_id", conn)
    f = pd.read_sql_query("SELECT * FROM followers", conn)
    p = pd.read_sql_query("SELECT * FROM pulls", conn)
    for df, cols in ((s, ("pulled_at", "published_at")), (f, ("pulled_at",)), (p, ("pulled_at",))):
        for c in cols:
            df[c] = pd.to_datetime(df[c], utc=True, format="ISO8601")
    for c in ("views", "likes", "comments", "shares", "avg_watch_s", "duration_s"):
        s[c] = pd.to_numeric(s[c], errors="coerce")
    f["followers"] = pd.to_numeric(f["followers"], errors="coerce")
    p["ok"] = pd.to_numeric(p["ok"], errors="coerce").fillna(0).astype(int)
    s["views"] = s["views"].fillna(0)
    return s.sort_values("pulled_at"), f.sort_values("pulled_at"), p.sort_values("pulled_at")


def status_of(p):
    out = {}
    for pl in PLATFORMS:
        d = p[p.platform == pl]
        if d.empty:
            out[pl] = dict(ok=False, message="Not connected yet", at=None, last_ok=None)
            continue
        last = d.iloc[-1]
        ok_rows = d[d.ok == 1]
        msg = re.sub(r"\x1b\[[0-9;]*m", "", str(last.message)).replace("ERROR: ", "")[:160]
        out[pl] = dict(ok=bool(last.ok), message=msg, at=iso(last.pulled_at),
                       last_ok=iso(ok_rows.pulled_at.iloc[-1]) if len(ok_rows) else None)
    return out


# ------------------------------------------------------------------ build
def build(conn):
    s, f, p = load(conn)
    now = pd.Timestamp.now(tz="UTC")
    last_pull = p.pulled_at.max() if len(p) else None
    status = status_of(p)
    base = dict(generated_at=iso(now), last_pull=iso(last_pull), update_every_min=UPDATE_EVERY_MIN,
                channel="MapFacto", platforms_order=PLATFORMS, status=status)
    if s.empty:
        return {**base, "empty": True}

    s["key"] = match_keys(s)
    s["title"] = s["title"].map(clean)
    ids = ["platform", "video_id"]

    # latest value per video, and the change made in the most recent update of its platform
    latest = s.groupby(ids).tail(1).set_index(ids)
    prev = s[s.groupby(ids).cumcount(ascending=False) == 1].set_index(ids)
    last_by_pl = p[p.ok == 1].groupby("platform").pulled_at.max()
    changed_now = latest.pulled_at.values >= latest.reset_index().platform.map(last_by_pl).values
    for m in ("views", "likes", "comments", "shares"):
        d = latest[m] - prev[m].reindex(latest.index)
        latest[f"d_{m}"] = np.where(changed_now, d.fillna(0), 0)
    first_seen = s.groupby(ids).pulled_at.min().reindex(latest.index)
    latest["is_new"] = (first_seen.values >= latest.reset_index().platform.map(last_by_pl).values) & \
        prev.views.reindex(latest.index).isna().values

    # 24h growth (forward-filled: the last stored value at or before 24h ago)
    cutoff = now - pd.Timedelta(hours=24)
    partial24 = bool(s.pulled_at.min() > cutoff)
    older = s[s.pulled_at <= cutoff].groupby(ids).tail(1).set_index(ids).views.reindex(latest.index)
    firstv = s.groupby(ids).head(1).set_index(ids).views.reindex(latest.index)
    base24 = older.where(older.notna(), np.where(latest.published_at > cutoff, 0, firstv))
    latest["g24"] = (latest.views - base24).clip(lower=0)
    latest = latest.reset_index()

    eng = latest[["likes", "comments", "shares"]].fillna(0).sum(axis=1)
    latest["engagement"] = np.where(latest.views > 0, eng / latest.views * 100, np.nan)
    yt_len = latest[latest.platform == "YouTube"].drop_duplicates("key").set_index("key").duration_s
    dur = latest.duration_s.fillna(latest.key.map(yt_len)).fillna(DEFAULT_LEN_S)
    latest["retention"] = np.where(latest.avg_watch_s > 0, latest.avg_watch_s / dur * 100, np.nan)

    meta = (latest.assign(pr=latest.platform.map(TITLE_PRIORITY))
            .sort_values(["pr", "published_at"])
            .groupby("key").agg(title=("title", "first"), posted=("published_at", "min")))
    yt_ids = latest[latest.platform == "YouTube"].drop_duplicates("key").set_index("key").video_id

    # followers
    fol = {}
    for pl, g in f.groupby("platform"):
        cur = int(g.followers.iloc[-1])
        old = g[g.pulled_at <= cutoff]
        b = int(old.followers.iloc[-1]) if len(old) else int(g.followers.iloc[0])
        tl = [[iso(t), int(v)] for t, v in zip(g.pulled_at, g.followers)][-MAX_POINTS:]
        if last_pull is not None and g.pulled_at.iloc[-1] < last_pull:
            tl.append([iso(last_pull), cur])  # history only stores changes; extend to "now"
        fol[pl] = dict(now=cur, d24=cur - b, timeline=tl)

    # views over time per platform (forward-filled across every update time)
    grid = sorted(set(s.pulled_at) | set(p[p.ok == 1].pulled_at))
    pv = (s.pivot_table(index="pulled_at", columns=ids, values="views", aggfunc="last")
          .reindex(grid).ffill())
    tot = pv.T.groupby(level=0).sum().T
    timeline = {}
    for pl in tot.columns:
        start = s[s.platform == pl].pulled_at.min()
        col = tot.loc[tot.index >= start, pl]
        if len(col) > MAX_POINTS:
            col = col.iloc[np.linspace(0, len(col) - 1, MAX_POINTS).astype(int)]
        timeline[pl] = [[iso(t), int(v)] for t, v in col.items()]
    allv = tot.sum(axis=1)
    allv = allv[allv.index >= s.pulled_at.min()]
    if len(allv) > MAX_POINTS:
        allv = allv.iloc[np.linspace(0, len(allv) - 1, MAX_POINTS).astype(int)]
    timeline["All"] = [[iso(t), int(v)] for t, v in allv.items()]

    # views gained per Paris day: today's last value minus the previous day's last value.
    # A video's first tracked day only counts if it was published that day (otherwise its
    # earlier views would look like they were all gained on the day tracking started).
    d = s.copy()
    d["day"] = d.pulled_at.dt.tz_convert("Europe/Paris").dt.strftime("%Y-%m-%d")
    d["pub_day"] = d.published_at.dt.tz_convert("Europe/Paris").dt.strftime("%Y-%m-%d")
    last = d.groupby(ids + ["day"]).tail(1).sort_values("day")
    rows_d = []
    for (pl, vid), g in last.groupby(ids):
        prev_v = None
        for _, r in g.iterrows():
            if prev_v is None:
                gain = r.views if r.day == r.pub_day else None
            else:
                gain = max(0, r.views - prev_v)
            prev_v = r.views
            if gain is not None:
                rows_d.append((pl, r.day, gain))
    dg = pd.DataFrame(rows_d, columns=["platform", "day", "gain"])
    all_days = sorted(d["day"].unique())
    daily = {pl: [[day, int(dg[(dg.platform == pl) & (dg.day == day)].gain.sum())] for day in all_days]
             for pl in PLATFORMS if (s.platform == pl).any()}

    # per platform summary + verdict
    total_views = latest.views.sum()
    rows = {}
    for pl in PLATFORMS:
        dpl = latest[latest.platform == pl]
        n = len(dpl)
        views = dpl.views.sum()
        e = dpl[["likes", "comments", "shares"]].fillna(0).sum().sum()
        rows[pl] = dict(
            videos=n, views=num(views), share=num(views / total_views * 100, 1) if total_views else 0,
            vpv=num(views / n) if n else None,
            engagement=num(e / views * 100, 1) if views else None,
            likes=num(dpl.likes.sum()), comments=num(dpl.comments.sum()),
            shares=num(dpl.shares.sum()) if dpl.shares.notna().any() else None,
            g24=num(dpl.g24.sum()) if n else None, d_last=num(dpl.d_views.sum()) if n else None,
            followers=fol.get(pl, {}).get("now"), followers_d24=fol.get(pl, {}).get("d24"),
            retention=num(dpl.retention.mean(), 1) if dpl.retention.notna().any() else None)
    live = {pl: r for pl, r in rows.items() if r["videos"]}
    best_pl = max(live, key=lambda k: live[k]["vpv"] or 0) if live else None
    best_vpv = live[best_pl]["vpv"] if best_pl else 0
    MIN_VIEWS_ENG = 100  # don't crown "most engaged" on a handful of views
    eng_cand = {k: v for k, v in live.items() if (v["views"] or 0) >= MIN_VIEWS_ENG}
    eng_pl = max(eng_cand, key=lambda k: eng_cand[k]["engagement"] or 0) if eng_cand else None
    for pl, r in rows.items():
        st = status[pl]
        if not r["videos"]:
            r["verdict"], r["reason"] = "bad", f"No data yet: {st['message']}"
            continue
        ratio = (r["vpv"] or 0) / best_vpv if best_vpv else 0
        if pl == best_pl:
            v, why = "good", f"Best reach: {fmt(r['vpv'])} views per video"
        elif ratio >= 0.6:
            v, why = "good", f"{fmt(r['vpv'])} views per video, close to {best_pl}"
        elif ratio >= 0.25:
            v, why = "watch", f"{fmt(r['vpv'])} views per video, {ratio * 100:.0f}% of {best_pl}"
        else:
            v, why = "bad", f"Only {fmt(r['vpv'])} views per video vs {fmt(best_vpv)} on {best_pl}"
        if pl == eng_pl and (r["engagement"] or 0) > 0:
            why += f". Most engaged audience ({r['engagement']}%)"
            v = "watch" if v == "bad" else v
        if not st["ok"]:
            v = "bad" if v == "bad" else "watch"
        r["verdict"], r["reason"] = v, why
        r["timeline"] = timeline.get(pl, [])
        r["daily"] = daily.get(pl, [])
        r["followers_timeline"] = fol.get(pl, {}).get("timeline", [])

    # videos (one per key, platform columns)
    vids = []
    for k, m in meta.sort_values("posted", ascending=False).iterrows():
        per = {}
        for _, r in latest[latest.key == k].iterrows():
            per[r.platform] = dict(
                id=str(r.video_id), url=(r.url if isinstance(r.url, str) and r.url.startswith("https://") else video_url(r.platform, r.video_id)),
                views=num(r.views),
                likes=num(r.likes), comments=num(r.comments), shares=num(r.shares),
                d_views=num(r.d_views), g24=num(r.g24), engagement=num(r.engagement, 1),
                retention=num(r.retention, 0), posted=iso(r.published_at),
                duration=num(r.duration_s))
        vids.append(dict(key=k, title=m.title, posted=iso(m.posted),
                         thumb=f"https://i.ytimg.com/vi/{yt_ids[k]}/mqdefault.jpg" if k in yt_ids else None,
                         total=num(sum(x["views"] or 0 for x in per.values())),
                         g24=num(sum(x["g24"] or 0 for x in per.values())), per=per))

    # insights
    good, bad = [], []
    if vids:
        top = max(vids, key=lambda v: v["total"] or 0)
        best_on = max(top["per"], key=lambda q: top["per"][q]["views"] or 0)
        good.append(dict(kind="top", text=f"**{short(top['title'], 60)}** is your top video: "
                         f"{fmt(top['total'])} views, strongest on {best_on}."))
    if best_pl:
        good.append(dict(kind="reach", platform=best_pl,
                         text=f"**{best_pl}** gives the best reach: {fmt(best_vpv)} views per video."))
    if eng_pl and (rows[eng_pl]["engagement"] or 0) > 0:
        good.append(dict(kind="engagement", platform=eng_pl,
                         text=f"**{eng_pl}** has the most engaged viewers: {rows[eng_pl]['engagement']}% "
                         "like, comment or share."))
    g_pl = max(live, key=lambda k: live[k]["g24"] or 0) if live else None
    if g_pl and (rows[g_pl]["g24"] or 0) > 0:
        good.append(dict(kind="growth", platform=g_pl,
                         text=f"**{g_pl}** is growing fastest: +{fmt(rows[g_pl]['g24'])} views in the last 24 hours."))
    for pl, r in rows.items():
        if r["verdict"] == "bad":
            bad.append(dict(kind="platform", platform=pl, text=f"**{pl}**: {r['reason']}."))
        elif not status[pl]["ok"]:
            bad.append(dict(kind="error", platform=pl, text=f"**{pl}** update failed: {short(status[pl]['message'], 80)}."))
    for v in vids:
        missing = [pl for pl in live if pl not in v["per"]]
        if missing and len(v["per"]) >= 2:
            bad.append(dict(kind="missing", text=f"**{short(v['title'], 50)}** isn't on {', '.join(missing)} yet."))
    old = latest[latest.published_at < cutoff]
    for pl, g in old.groupby("platform"):
        if len(g) >= 3:
            med = g.views.median()
            for _, r in g[g.views < med * 0.5].iterrows():
                bad.append(dict(kind="low", platform=pl,
                                text=f"**{short(meta.title[r.key], 50)}** is low on {pl}: {fmt(r.views)} views, "
                                f"under half your usual {fmt(med)}."))
    if not partial24:
        for _, r in old[(old.g24 == 0) & (old.views > 0)].head(4).iterrows():
            bad.append(dict(kind="stalled", platform=r.platform,
                            text=f"**{short(meta.title[r.key], 50)}** got no new views on {r.platform} in 24 hours."))

    # point updates: what moved in each platform's latest update
    moved = latest[(latest[["d_views", "d_likes", "d_comments", "d_shares"]].abs().sum(axis=1) > 0) | latest.is_new]
    updates = [dict(platform=r.platform, title=meta.title[r.key], views=num(r.views), d_views=num(r.d_views),
                    d_likes=num(r.d_likes), d_comments=num(r.d_comments), d_shares=num(r.d_shares),
                    is_new=bool(r.is_new), at=iso(last_by_pl.get(r.platform)))
               for _, r in moved.sort_values("d_views", ascending=False).iterrows()]

    # recent update log (for the activity strip)
    log = []
    for t, g in p.groupby("pulled_at"):
        log.append(dict(at=iso(t), ok={r.platform: bool(r.ok) for _, r in g.iterrows()}))
    log = log[-48:]
    # views gained per update, counting only platforms already tracked before that update
    per_pl = {pl: dict((t, v) for t, v in zip(tot.index.map(iso), tot[pl])) for pl in tot.columns}
    starts = {pl: iso(s[s.platform == pl].pulled_at.min()) for pl in tot.columns}
    prev_t = None
    for e in log:
        t = e["at"]
        if prev_t is None or t not in per_pl.get(next(iter(per_pl)), {}):
            e["gain"] = None
        else:
            g = [per_pl[pl][t] - per_pl[pl][prev_t] for pl in per_pl
                 if starts[pl] and starts[pl] <= prev_t and t in per_pl[pl] and prev_t in per_pl[pl]]
            e["gain"] = int(sum(g)) if g else None
        prev_t = t if t in per_pl.get(next(iter(per_pl)), {}) else prev_t

    eng_all = latest[["likes", "comments", "shares"]].fillna(0).sum().sum()
    totals = dict(views=num(total_views), d_last=num(latest.d_views.sum()), g24=num(latest.g24.sum()),
                  followers=sum(x["now"] for x in fol.values()) if fol else None,
                  followers_d24=sum(x["d24"] for x in fol.values()) if fol else None,
                  engagement=num(eng_all / total_views * 100, 1) if total_views else None,
                  videos=len(vids), likes=num(latest.likes.sum()), comments=num(latest.comments.sum()))
    return {**base, "empty": False, "partial24": partial24, "totals": totals, "platforms": rows,
            "videos": vids, "timeline_all": timeline["All"], "insights": dict(good=good, bad=bad),
            "updates": updates[:30], "log": log, "history_since": iso(s.pulled_at.min())}


def write_dashboard(conn, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    data = build(conn)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return data
