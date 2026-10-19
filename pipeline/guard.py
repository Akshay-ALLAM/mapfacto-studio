"""Leak guard: refuses to let any API key or token reach the public repo or website.

Scans every text file that the robot commits (data/ and docs/) plus the code, for:
  * the exact values of the secrets present in the environment, and
  * anything shaped like a Meta / Instagram / Google / GitHub token.
Exits with an error (so the workflow stops before committing) if anything is found.
It never prints the secret itself, only the file and line.

Run:  python pipeline/guard.py
"""
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCAN_DIRS = ["data", "docs", "pipeline", ".github"]
SCAN_FILES = ["README.md", "requirements.txt"]
SKIP_DIRS = {"vendor", "fonts", "__pycache__"}
TEXT_EXT = {".csv", ".json", ".js", ".html", ".css", ".py", ".yml", ".yaml", ".md", ".txt", ""}
SECRET_VARS = ["YT_API_KEY", "IG_TOKEN", "FB_PAGE_TOKEN", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN",
               "TIKTOK_TOKEN", "TIKTOK_CLIENT_SECRET", "TIKTOK_REFRESH_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"]
PATTERNS = {
    "Facebook/Meta token": re.compile(r"\bEAA[A-Za-z0-9]{30,}"),
    "Instagram token": re.compile(r"\bIG(?:AA|QV)[A-Za-z0-9_-]{30,}"),
    "Google API key": re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"),
    "Google OAuth token": re.compile(r"\bya29\.[0-9A-Za-z_-]{20,}|\b1//0[0-9A-Za-z_-]{30,}"),
    "GitHub token": re.compile(r"\b(?:ghp|gho|ghs|ghu)_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{40,}"),
    "access_token in a URL": re.compile(r"access_token=[A-Za-z0-9._-]{20,}"),
}


def files():
    for name in SCAN_FILES:
        p = ROOT / name
        if p.is_file():
            yield p
    for d in SCAN_DIRS:
        for p in (ROOT / d).rglob("*"):
            if p.is_file() and not (SKIP_DIRS & set(p.relative_to(ROOT).parts)) and p.suffix.lower() in TEXT_EXT:
                yield p


def main():
    secrets = {v: os.environ[v].strip() for v in SECRET_VARS if len(os.environ.get(v, "").strip()) >= 12}
    problems = []
    for p in files():
        if p.name == "guard.py":
            continue  # this file contains the patterns themselves
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for i, line in enumerate(text.splitlines(), 1):
            for var, val in secrets.items():
                if val in line:
                    problems.append(f"{p.relative_to(ROOT)}:{i}: contains the value of {var}")
            for label, rx in PATTERNS.items():
                if rx.search(line):
                    problems.append(f"{p.relative_to(ROOT)}:{i}: looks like a {label}")
    if problems:
        print("Leak guard: refusing to continue, a key or token would be published:")
        for msg in sorted(set(problems)):
            print("  " + msg)
        sys.exit(1)
    print("Leak guard: no keys or tokens found in the files that get published.")


if __name__ == "__main__":
    main()
