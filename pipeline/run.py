"""One MapFacto update, as run every 30 minutes by GitHub Actions.

1. Load the stored history (data/*.csv) into a temporary SQLite database.
2. Pull fresh numbers from every platform (collect.py).
3. Save the history back to CSV, keeping only rows where something changed.
4. Build docs/data.json, the file the website reads.

Run locally with:  python pipeline/run.py          (pull + build)
                   python pipeline/run.py --build  (rebuild data.json only, no API calls)
API keys come from environment variables only and are never printed.
"""
import csv
import os
import sqlite3
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DOCS = ROOT / "docs"
TMP_DB = Path(tempfile.gettempdir()) / "mapfacto_run.db"
os.environ["MAPFACTO_DB"] = str(TMP_DB)
sys.path.insert(0, str(Path(__file__).resolve().parent))

import collect  # noqa: E402  (needs MAPFACTO_DB set first)
import build  # noqa: E402

TABLES = {
    "videos": ["platform", "video_id", "title", "published_at", "duration_s", "url"],
    "stats": ["pulled_at", "platform", "video_id", "views", "likes", "comments", "shares", "avg_watch_s"],
    "followers": ["pulled_at", "platform", "followers"],
    "pulls": ["pulled_at", "platform", "ok", "message"],
}
KEEP_PULLS = 4000  # about a month of update logs


def load_history(conn):
    for table, cols in TABLES.items():
        path = DATA / f"{table}.csv"
        if not path.exists():
            continue
        with path.open(newline="", encoding="utf-8") as f:
            rows = [[(r.get(c) if r.get(c) not in ("", None) else None) for c in cols] for r in csv.DictReader(f)]
        verb = "INSERT OR REPLACE" if table == "videos" else "INSERT"
        conn.executemany(f"{verb} INTO {table}({','.join(cols)}) VALUES({','.join('?' * len(cols))})", rows)
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
        with (DATA / f"{table}.csv").open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(TABLES[table])
            w.writerows(rows)

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
    build.write_dashboard(conn, DOCS / "data.json")
    print("Wrote", DOCS / "data.json")
    import guard  # stop here if anything that looks like a key ended up in a public file
    guard.main()


if __name__ == "__main__":
    main()
