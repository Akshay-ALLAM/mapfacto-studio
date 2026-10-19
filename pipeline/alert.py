"""Alerting: notice when a platform keeps failing (expired token, API change, TikTok block).

Reads data/pulls.csv and counts each platform's failed updates in a row. Prints one line
per platform that crossed its limit, as  ALERT|<platform>|<count>|<last error>  so the
workflow can open (or close) a GitHub issue, which emails the repository owner.
It never prints a key: error messages were already cleaned and the leak guard ran first.
"""
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIMITS = {"YouTube": 3, "Instagram": 3, "Facebook": 3, "TikTok": 6}  # TikTok blips more often


def streaks():
    rows = list(csv.DictReader((ROOT / "data" / "pulls.csv").open(encoding="utf-8")))
    out = {}
    for pl in LIMITS:
        mine = [r for r in rows if r["platform"] == pl]
        n = 0
        for r in reversed(mine):
            if str(r["ok"]) in ("1", "True", "true"):
                break
            n += 1
        out[pl] = (n, mine[-1]["message"] if mine else "")
    return out


def main():
    for pl, (n, msg) in streaks().items():
        state = "ALERT" if n >= LIMITS[pl] else "OK"
        print(f"{state}|{pl}|{n}|{msg.replace('|', '/')[:200]}")


if __name__ == "__main__":
    main()
