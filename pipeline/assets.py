"""Cache-busting: writes ?v=<hash of the file> after every local script/style in docs/index.html,
so browsers load a changed app.js/styles.css straight away instead of a cached copy."""
import hashlib
import re
from pathlib import Path

DOCS = Path(__file__).resolve().parent.parent / "docs"


def stamp():
    page = DOCS / "index.html"
    html = page.read_text(encoding="utf-8")

    def fix(m):
        attr, path = m.group(1), m.group(2).split("?")[0]
        f = DOCS / path
        if not f.is_file():
            return m.group(0)
        return f'{attr}="{path}?v={hashlib.sha1(f.read_bytes()).hexdigest()[:8]}"'

    new = re.sub(r'\b(src|href)="((?:[\w./-]+)\.(?:js|css))(?:\?[^"]*)?"', fix, html)
    if new != html:
        page.write_text(new, encoding="utf-8")
    return new != html


if __name__ == "__main__":
    print("index.html updated" if stamp() else "index.html already current")
