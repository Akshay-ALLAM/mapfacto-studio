"""One MapFacto update, as run every 30 minutes by GitHub Actions.

1. Load the stored history from Supabase (private) into a temporary SQLite database.
2. Pull fresh numbers from every platform (collect.py).
3. Save the new rows back to Supabase, keeping only rows where something changed.
4. Build the real dashboard and store it in Supabase, where only signed-in owners can read it.

The real numbers never go into the public repo or website: the website shows demo data
(docs/data.json, made by demo.py) until the owner signs in.

Run locally with:  python pipeline/run.py          (pull + build)
                   python pipeline/run.py --build  (rebuild only, no API calls)
Without SUPABASE_SECRET_KEY it works on local files in data/ (not committed) instead.
API keys come from environment variables only and are never printed.
"""
import csv
import json
import os
import sqlite3
import sys
import tempfile
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DOCS = ROOT / "docs"
TMP_DB = Path(tempfile.gettempdir()) / "mapfacto_run.db"
os.environ["MAPFACTO_DB"] = str(TMP_DB)
sys.path.insert(0, str(Path(__file__).resolve().parent))

import collect  # noqa: E402  (needs MAPFACTO_DB set first)
import build  # noqa: E402
import store  # noqa: E402

TABLES = {
    "videos": ["platform", "video_id", "title", "published_at", "duration_s", "url"],
    "stats": ["pulled_at", "platform", "video_id", "views", "likes", "comments", "shares", "avg_watch_s"],
    "followers": ["pulled_at", "platform", "followers"],
    "pulls": ["pulled_at", "platform", "ok", "message"],
}
KEEP_PULLS = 4000  # about a month of update logs


LOADED = {t: set() for t in TABLES}  # keys already stored in Supabase


def key(table, cols, row):
    out = []
    for c in store.KEYS[table]:
        v = row[cols.index(c)]
        out.append(datetime.fromisoformat(str(v).replace("Z", "+00:00")).isoformat() if c == "pulled_at" else str(v))
    return tuple(out)


def load_history(conn):
    for table, cols in TABLES.items():
        rows = []
        path = DATA / f"{table}.csv"  # local history (older setup, or runs without Supabase)
        if path.exists():
            with path.open(newline="", encoding="utf-8") as f:
                rows += [[(r.get(c) if r.get(c) not in ("", None) else None) for c in cols] for r in csv.DictReader(f)]
        if store.enabled():
            remote = store.fetch(table, cols)
            LOADED[table] = {key(table, cols, r) for r in remote}
            rows += remote
        seen, uniq = set(), []
        for r in reversed(rows):  # newest copy of a key wins
            k = key(table, cols, r)
            if k not in seen:
                seen.add(k)
                uniq.append(r)
        uniq.reverse()
        conn.executemany(f"INSERT INTO {table}({','.join(cols)}) VALUES({','.join('?' * len(cols))})", uniq)
    conn.commit()


def _same(a, b):
    def n(x):
        if x is None or x == "":
            return None
        try:
            return round(float(x), 1)
        except (TypeError, ValueError):
            return x
    return all(n(x) == n(y) for x, y in zip(a, b))


def save_history(conn):
    DATA.mkdir(exist_ok=True)

    def write(table, rows):
        # local copy for this run only (data/ is not committed); the alert step reads pulls.csv
        with (DATA / f"{table}.csv").open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(TABLES[table])
            w.writerows(rows)
        if store.enabled():
            cols = TABLES[table]
            new = rows if table == "videos" else [r for r in rows if key(table, cols, r) not in LOADED[table]]
            n = store.upsert(table, cols, [list(r) for r in new])
            if table == "pulls" and rows:
                store.delete_older("pulls", rows[0][0])
            print(f"Supabase: {table} +{n}")

    write("videos", conn.execute("SELECT * FROM videos ORDER BY platform, published_at").fetchall())

    # stats: keep a row only when one of its numbers changed since the last kept row
    kept, last = [], {}
    for r in conn.execute("SELECT * FROM stats ORDER BY platform, video_id, pulled_at"):
        k = (r[1], r[2])
        if k not in last or not _same(last[k][3:], r[3:]):
            kept.append(r)
            last[k] = r
    write("stats", kept)

    kept, last = [], {}
    for r in conn.execute("SELECT * FROM followers ORDER BY platform, pulled_at"):
        if r[1] not in last or last[r[1]] != r[2]:
            kept.append(r)
            last[r[1]] = r[2]
    write("followers", kept)

    rows = conn.execute("SELECT * FROM pulls ORDER BY pulled_at").fetchall()[-KEEP_PULLS:]
    write("pulls", rows)


def main():
    TMP_DB.unlink(missing_ok=True)
    conn = collect.connect()
    load_history(conn)
    if "--build" not in sys.argv:
        collect.pull_all(conn)
        save_history(conn)
        for row in conn.execute("SELECT platform, ok, message FROM pulls ORDER BY rowid DESC LIMIT 4"):
            print(("OK  " if row[1] else "ERR ") + f"{row[0]}: {row[2]}")
    elif store.enabled():
        save_history(conn)  # --build with Supabase: also uploads any local history (first-time move)
    data = build.build(conn)
    if os.environ.get("GITHUB_ACTIONS") and not store.enabled():
        sys.exit("SUPABASE_SECRET_KEY is missing: add it in Settings > Secrets and variables > Actions.")
    if store.enabled():
        store.save_dashboard(data)
        print("Saved the real dashboard to Supabase (owners only)")
    else:
        DATA.mkdir(exist_ok=True)
        (DATA / "private_dashboard.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        print("No SUPABASE_SECRET_KEY: real dashboard kept locally in data/private_dashboard.json")
    import assets
    assets.stamp()  # ?v=<hash> on app.js, styles.css... so a changed file is never served from cache
    import guard  # stop here if anything that looks like a key ended up in a public file
    guard.main()


if __name__ == "__main__":
    main()
