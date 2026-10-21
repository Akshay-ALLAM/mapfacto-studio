"""Demo data for the public website: a realistic, made-up channel history.

The public dashboard shows this until the owner signs in, so visitors and recruiters can see
every chart working without seeing MapFacto's real numbers. Titles and numbers are invented;
it is built with the same build.py as the real dashboard, so it always has the same shape.

Run:  python pipeline/demo.py      (writes docs/data.json)
"""
import json
import math
import os
import random
import sqlite3
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

os.environ.setdefault("MAPFACTO_DB", str(Path(tempfile.gettempdir()) / "mapfacto_demo_unused.db"))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import build  # noqa: E402
import collect  # noqa: E402

OUT = Path(__file__).resolve().parent.parent / "docs" / "data.json"
DAYS = 10
STEP_H = 1
PROFILE = {
    "YouTube": "https://www.youtube.com/@MapFacto",
    "TikTok": "https://www.tiktok.com/@mapfacto_",
    "Instagram": "https://www.instagram.com/mapfacto/",
    "Facebook": "https://www.facebook.com/1058710957321832",
}
# (title, posted days ago, size, platforms it is on)
VIDEOS = [
    ("Countries Shaped Like Animals", 9.6, 1.0, "YT TT IG FB"),
    ("The Only Country With No Rivers", 8.2, 1.7, "YT TT IG FB"),
    ("Why Russia Has 11 Time Zones", 6.9, 0.8, "YT TT IG"),
    ("Islands You Can Walk To at Low Tide", 5.4, 2.4, "YT TT IG FB"),
    ("The Border That Moves Every Year", 3.8, 1.2, "YT TT IG"),
    ("Capitals That Changed Their Names", 2.1, 1.5, "YT TT IG FB"),
    ("Where the Sun Doesn't Set for 76 Days", 0.7, 1.9, "YT TT IG"),
]
CODE = {"YT": "YouTube", "TT": "TikTok", "IG": "Instagram", "FB": "Facebook"}
REACH = {"YouTube": 1400, "TikTok": 900, "Instagram": 1100, "Facebook": 160}
LIKE_RATE = {"YouTube": 0.028, "TikTok": 0.075, "Instagram": 0.03, "Facebook": 0.035}
FOLLOWERS = {"YouTube": (180, 1.6), "TikTok": (95, 1.2), "Instagram": (140, 0.9), "Facebook": (60, 0.25)}


def make(conn, now):
    rnd = random.Random(42)
    start = now - timedelta(days=DAYS)
    times = [start + timedelta(hours=h) for h in range(0, DAYS * 24 + 1, STEP_H)]
    iso = lambda t: t.isoformat(timespec="seconds")
    for i, (title, ago, size, where) in enumerate(VIDEOS):
        posted = now - timedelta(days=ago)
        for code in where.split():
            pl = CODE[code]
            vid = f"demo-{pl.lower()}-{i}"
            dur = 24 + (i * 7) % 20
            conn.execute("INSERT INTO videos VALUES(?,?,?,?,?,?)",
                         (pl, vid, title, iso(posted), dur, PROFILE[pl]))
            total = REACH[pl] * size * (0.75 + rnd.random() * 0.5)
            speed = 0.35 + rnd.random() * 0.4          # how fast it saturates (per day)
            for t in times:
                age = (t - posted).total_seconds() / 86400
                if age < 0:
                    continue
                v = int(total * (1 - math.exp(-speed * age * 2.2)) + age * 3)
                likes = int(v * LIKE_RATE[pl])
                comments = int(v * 0.004)
                shares = None if pl in ("YouTube", "Facebook") else int(v * 0.006)
                watch = round(dur * (0.42 + 0.1 * math.sin(i)), 2) if pl == "Instagram" else None
                conn.execute("INSERT INTO stats VALUES(?,?,?,?,?,?,?,?)",
                             (iso(t), pl, vid, v, likes, comments, shares, watch))
    for t in times:
        for pl, (base, per_day) in FOLLOWERS.items():
            days = (t - start).total_seconds() / 86400
            conn.execute("INSERT INTO followers VALUES(?,?,?)", (iso(t), pl, int(base + per_day * days)))
            n = len([1 for v in VIDEOS if any(CODE[c] == pl for c in v[3].split())
                     and t >= now - timedelta(days=v[1])])
            conn.execute("INSERT INTO pulls VALUES(?,?,1,?)", (iso(t), pl, f"{n} video{'' if n == 1 else 's'}"))
    conn.commit()


def main():
    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    conn = sqlite3.connect(":memory:")
    conn.executescript(collect.SCHEMA)
    make(conn, now)
    data = build.build(conn)
    data["demo"] = True
    for v in data.get("videos", []):
        v["thumb"] = None  # no real thumbnails in the demo
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    t = data["totals"]
    print(f"Wrote demo {OUT.name}: {t['views']:,} views, {t['videos']} videos (all made up)")


if __name__ == "__main__":
    main()
