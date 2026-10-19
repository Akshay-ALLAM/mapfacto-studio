"""MapFacto collectors + SQLite storage.

All API tokens are read from environment variables (or a local .env file).
They are never hard-coded, logged or printed; error text is redacted.
Run `python collect.py` to do a single pull (handy for a cron job).
"""
import os
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

try:
    from dotenv import load_dotenv

    load_dotenv(override=True)
except ImportError:  # python-dotenv is optional
    pass

DB_PATH = Path(os.environ.get("MAPFACTO_DB", Path(__file__).with_name("mapfacto.db")))
GRAPH_VERSION = os.environ.get("GRAPH_VERSION", "v21.0")
YT_HANDLE = os.environ.get("YT_HANDLE", "MapFacto").lstrip("@").strip()
TT_HANDLE = os.environ.get("TT_HANDLE", "mapfacto_").lstrip("@").strip()
FB_PAGE_ID = (os.environ.get("FB_PAGE_ID") or "1058710957321832").strip()  # an empty secret falls back to the MapFacto Page
SECRET_VARS = (
    "YT_API_KEY", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN", "IG_TOKEN",
    "FB_PAGE_TOKEN",
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS videos(
  platform TEXT, video_id TEXT, title TEXT, published_at TEXT, duration_s REAL, url TEXT,
  PRIMARY KEY(platform, video_id));
CREATE TABLE IF NOT EXISTS stats(
  pulled_at TEXT, platform TEXT, video_id TEXT, views INTEGER, likes INTEGER,
  comments INTEGER, shares INTEGER, avg_watch_s REAL);
CREATE INDEX IF NOT EXISTS stats_idx ON stats(platform, video_id, pulled_at);
CREATE TABLE IF NOT EXISTS followers(pulled_at TEXT, platform TEXT, followers INTEGER);
CREATE TABLE IF NOT EXISTS pulls(pulled_at TEXT, platform TEXT, ok INTEGER, message TEXT);
CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT);
"""


def env(name):
    return os.environ.get(name, "").strip()


def redact(text):
    text = str(text)
    for name in SECRET_VARS:
        val = env(name)
        if val:
            text = text.replace(val, "***")
    return text


def connect():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.executescript(SCHEMA)
    return conn


# ---------------------------------------------------------------- helpers
def http(method, url, *, headers=None, params=None, json=None, data=None):
    """HTTP call. Tokens travel in headers; errors never include the URL."""
    r = requests.request(method, url, headers=headers, params=params,
                         json=json, data=data, timeout=30)
    if r.status_code >= 400:
        raise RuntimeError(f"HTTP {r.status_code}: {redact(r.text[:200])}")
    return r.json()


def parse_ts(s):
    s = s.replace("Z", "+00:00")
    s = re.sub(r"([+-]\d{2})(\d{2})$", r"\1:\2", s)
    return datetime.fromisoformat(s).astimezone(timezone.utc)


def iso_duration(s):
    m = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", s or "")
    if not m:
        return None
    d, h, mi, sec = (int(x or 0) for x in m.groups())
    return d * 86400 + h * 3600 + mi * 60 + sec


def first_line(text):
    lines = (text or "").strip().splitlines()
    return lines[0][:120] if lines else "(untitled)"


def video(vid, title, published, duration=None, views=None, likes=None,
          comments=None, shares=None, avg_watch=None, url=None):
    return dict(id=str(vid), title=title, published=published, duration=duration,
                views=views, likes=likes, comments=comments, shares=shares,
                avg_watch=avg_watch, url=url)


def to_int(x):
    try:
        return int(x)
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------- YouTube
def yt_avg_watch():
    """Optional: average view duration per video (needs OAuth, YouTube Analytics API)."""
    cid, cs, rt = env("YT_CLIENT_ID"), env("YT_CLIENT_SECRET"), env("YT_REFRESH_TOKEN")
    if not (cid and cs and rt):
        return {}
    tok = http("POST", "https://oauth2.googleapis.com/token", data={
        "client_id": cid, "client_secret": cs, "refresh_token": rt,
        "grant_type": "refresh_token"})["access_token"]
    today = datetime.now(timezone.utc).date()
    rep = http("GET", "https://youtubeanalytics.googleapis.com/v2/reports",
               headers={"Authorization": f"Bearer {tok}"},
               params={"ids": "channel==MINE", "startDate": str(today - timedelta(days=400)),
                       "endDate": str(today), "metrics": "views,averageViewDuration",
                       "dimensions": "video", "sort": "-views", "maxResults": 200})
    return {row[0]: row[2] for row in rep.get("rows", [])}


def pull_youtube():
    h = {"x-goog-api-key": env("YT_API_KEY")}
    base = "https://www.googleapis.com/youtube/v3"
    ch = http("GET", f"{base}/channels", headers=h, params={
        "part": "contentDetails,statistics", "forHandle": YT_HANDLE})
    if not ch.get("items"):
        raise RuntimeError("channel @MapFacto not found")
    item = ch["items"][0]
    followers = to_int(item["statistics"].get("subscriberCount"))
    uploads = item["contentDetails"]["relatedPlaylists"]["uploads"]
    ids, token = [], None
    for _ in range(2):  # last 100 videos
        params = {"part": "contentDetails", "playlistId": uploads, "maxResults": 50}
        if token:
            params["pageToken"] = token
        page = http("GET", f"{base}/playlistItems", headers=h, params=params)
        ids += [i["contentDetails"]["videoId"] for i in page["items"]]
        token = page.get("nextPageToken")
        if not token:
            break
    try:
        avg = yt_avg_watch()
    except Exception:
        avg = {}
    vids = []
    for i in range(0, len(ids), 50):
        data = http("GET", f"{base}/videos", headers=h, params={
            "part": "snippet,statistics,contentDetails", "id": ",".join(ids[i:i + 50])})
        for x in data["items"]:
            st = x["statistics"]
            vids.append(video(
                x["id"], x["snippet"]["title"], parse_ts(x["snippet"]["publishedAt"]),
                iso_duration(x["contentDetails"].get("duration")),
                to_int(st.get("viewCount")), to_int(st.get("likeCount")),
                to_int(st.get("commentCount")), None, avg.get(x["id"])))
    return followers, vids


# -------------------------------------------------------------- Instagram
def pull_instagram():
    h = {"Authorization": f"Bearer {env('IG_TOKEN')}"}
    base = f"https://graph.instagram.com/{GRAPH_VERSION}"
    me = http("GET", f"{base}/me", headers=h, params={"fields": "followers_count"})
    media = http("GET", f"{base}/me/media", headers=h, params={
        "fields": "id,caption,media_product_type,timestamp,like_count,comments_count,permalink",
        "limit": 50}).get("data", [])
    vids = []
    for m in media:
        if m.get("media_product_type") != "REELS":
            continue
        ins = {}
        try:
            d = http("GET", f"{base}/{m['id']}/insights", headers=h, params={
                "metric": "views,reach,ig_reels_avg_watch_time,shares,likes,comments"})
            for e in d.get("data", []):
                val = (e.get("values") or [{}])[0].get("value")
                if val is None:
                    val = (e.get("total_value") or {}).get("value")
                ins[e["name"]] = val
        except RuntimeError:
            pass
        avg_ms = ins.get("ig_reels_avg_watch_time")
        vids.append(video(
            m["id"], first_line(m.get("caption")), parse_ts(m["timestamp"]), None,
            to_int(ins.get("views")),
            to_int(ins.get("likes", m.get("like_count"))),
            to_int(ins.get("comments", m.get("comments_count"))),
            to_int(ins.get("shares")),
            (avg_ms / 1000.0) if avg_ms is not None else None,
            url=m.get("permalink")))
    return to_int(me.get("followers_count")), vids


# --------------------------------------------------------------- Facebook
def pull_facebook():
    h = {"Authorization": f"Bearer {env('FB_PAGE_TOKEN')}"}
    base = f"https://graph.facebook.com/{GRAPH_VERSION}"
    page = http("GET", f"{base}/{FB_PAGE_ID}", headers=h,
                params={"fields": "followers_count,fan_count"})
    followers = to_int(page.get("followers_count") or page.get("fan_count"))
    reels = http("GET", f"{base}/{FB_PAGE_ID}/video_reels", headers=h, params={
        "fields": "id,description,created_time", "limit": 25}).get("data", [])
    vids = []
    for r in reels:
        try:
            d = http("GET", f"{base}/{r['id']}", headers=h, params={
                "fields": "views,length,likes.summary(true).limit(0),"
                          "comments.summary(true).limit(0)"})
        except RuntimeError:
            d = {}
        vids.append(video(
            r["id"], first_line(r.get("description")), parse_ts(r["created_time"]),
            d.get("length"), to_int(d.get("views")),
            to_int((d.get("likes") or {}).get("summary", {}).get("total_count")),
            to_int((d.get("comments") or {}).get("summary", {}).get("total_count")),
            None, None))
    return followers, vids


# ----------------------------------------------------------------- TikTok
TIKTOK_PROFILE = f"https://www.tiktok.com/@{TT_HANDLE}"
TIKTOK_MAX_VIDEOS = int(os.environ.get("TIKTOK_MAX_VIDEOS", "30"))


def _ydl(opts=None):
    from yt_dlp import YoutubeDL  # pip install yt-dlp
    base = {"quiet": True, "no_warnings": True, "skip_download": True,
            "noprogress": True, "socket_timeout": 30}
    try:  # TikTok blocks plain requests; impersonating Chrome needs curl_cffi
        from yt_dlp.networking.impersonate import ImpersonateTarget
        import curl_cffi  # noqa: F401
        base["impersonate"] = ImpersonateTarget("chrome")
    except ImportError:
        pass
    base.update(opts or {})
    return YoutubeDL(base)


def _tt_video(url):
    with _ydl() as ydl:
        x = ydl.extract_info(url, download=False)
    ts = x.get("timestamp")
    if ts is None and x.get("upload_date"):
        published = datetime.strptime(x["upload_date"], "%Y%m%d").replace(tzinfo=timezone.utc)
    else:
        published = datetime.fromtimestamp(ts or 0, tz=timezone.utc)
    v = video(x["id"], first_line(x.get("title") or x.get("description")), published,
              x.get("duration"), to_int(x.get("view_count")), to_int(x.get("like_count")),
              to_int(x.get("comment_count")), to_int(x.get("repost_count")), None)
    return v, to_int(x.get("channel_follower_count"))


def pull_tiktok(known_ids=()):
    """Public TikTok stats via yt-dlp. No token needed.

    Same as: yt-dlp --dump-json --skip-download --flat-playlist https://www.tiktok.com/@mapfacto_
    then one lookup per video URL. If TikTok blocks the profile listing (common from cloud
    servers), the videos already in the history are still refreshed one by one.
    """
    from concurrent.futures import ThreadPoolExecutor

    listing_error = None
    try:
        with _ydl({"extract_flat": "in_playlist", "playlistend": TIKTOK_MAX_VIDEOS}) as ydl:
            listing = ydl.extract_info(TIKTOK_PROFILE, download=False)
        ids = [str(e["id"]) for e in (listing.get("entries") or []) if e and e.get("id")]
    except Exception as e:  # keep going with the videos we already know
        listing_error, ids = e, []
    ids = list(dict.fromkeys(ids[:TIKTOK_MAX_VIDEOS] + [str(i) for i in known_ids]))
    urls = [f"{TIKTOK_PROFILE}/video/{i}" for i in ids]
    if not urls:
        raise RuntimeError(f"TikTok profile could not be read: {clean_error(listing_error)}"
                           if listing_error else "yt-dlp found no public videos for @" + TT_HANDLE)
    vids, followers, failed = [], None, 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        for res in pool.map(lambda u: _safe(_tt_video, u), urls):
            if res is None:
                failed += 1
                continue
            v, f = res
            vids.append(v)
            followers = followers or f
    if not vids:
        raise RuntimeError(f"TikTok blocked all {len(urls)} video lookups"
                           + (f" ({clean_error(listing_error)})" if listing_error else ""))
    return followers if followers is not None else _tt_followers(), vids


def clean_error(e):
    """Short, readable error text (no colour codes, no yt-dlp boilerplate)."""
    t = re.sub(r"\x1b\[[0-9;]*m", "", str(e))
    t = re.sub(r"^ERROR:\s*", "", t.strip())
    t = re.sub(r"\s*(please report this issue|If you are able to get).*$", "", t, flags=re.I | re.S)
    return redact(t)[:160]


def _tt_followers():
    """yt-dlp often leaves the follower count empty; read it from the public profile page."""
    try:
        from curl_cffi import requests as creq
        html = creq.get(TIKTOK_PROFILE, impersonate="chrome", timeout=30).text
        m = re.search(r'"followerCount":(\d+)', html)
        return int(m.group(1)) if m else None
    except Exception:
        return None


def _safe(fn, *args):
    try:
        return fn(*args)
    except Exception:
        return None


# ------------------------------------------------------------ storage/pull
def collectors(conn):
    return {
        "YouTube": ("YT_API_KEY", pull_youtube),
        "Instagram": ("IG_TOKEN", pull_instagram),
        "Facebook": ("FB_PAGE_TOKEN", pull_facebook),
        "TikTok": (None, lambda: pull_tiktok([r[0] for r in conn.execute(
            "SELECT video_id FROM videos WHERE platform='TikTok' ORDER BY published_at DESC LIMIT ?",
            (TIKTOK_MAX_VIDEOS,))])),
    }


def save(conn, now, platform, followers, vids):
    if followers is not None:
        conn.execute("INSERT INTO followers VALUES(?,?,?)", (now, platform, followers))
    for v in vids:
        conn.execute(
            "INSERT INTO videos VALUES(?,?,?,?,?,?) ON CONFLICT(platform, video_id) DO UPDATE SET "
            "title=excluded.title, duration_s=COALESCE(excluded.duration_s, duration_s), "
            "url=COALESCE(excluded.url, url)",
            (platform, v["id"], v["title"], v["published"].isoformat(), v["duration"], v.get("url")))
        conn.execute("INSERT INTO stats VALUES(?,?,?,?,?,?,?,?)", (
            now, platform, v["id"], v["views"], v["likes"], v["comments"],
            v["shares"], v["avg_watch"]))


def pull_all(conn):
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    for platform, (var, fn) in collectors(conn).items():
        if var and not env(var):
            conn.execute("INSERT INTO pulls VALUES(?,?,0,?)", (now, platform, f"{var} not set"))
            continue
        try:
            followers, vids = fn()
            save(conn, now, platform, followers, vids)
            conn.execute("INSERT INTO pulls VALUES(?,?,1,?)",
                         (now, platform, f"{len(vids)} video{'' if len(vids) == 1 else 's'}"))
        except Exception as e:  # never leak a token in an error message
            conn.execute("INSERT INTO pulls VALUES(?,?,0,?)",
                         (now, platform, clean_error(e)))
    conn.commit()


def is_stale(conn, minutes=14):
    last = conn.execute("SELECT MAX(pulled_at) FROM pulls").fetchone()[0]
    if not last:
        return True
    return datetime.now(timezone.utc) - datetime.fromisoformat(last) > timedelta(minutes=minutes)


if __name__ == "__main__":
    c = connect()
    pull_all(c)
    for row in c.execute("SELECT platform, ok, message FROM pulls ORDER BY rowid DESC LIMIT 4"):
        print(row)
