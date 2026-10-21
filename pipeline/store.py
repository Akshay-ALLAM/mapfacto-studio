"""Private storage in Supabase: the real history and the real dashboard.

The robot (GitHub Actions) reads and writes with the SUPABASE_SECRET_KEY secret, which
bypasses Row Level Security. Nothing here is ever written into the public repo or website.
The secret is sent in the `apikey` header only (Supabase's rule for sb_secret_ keys) and is
never printed.
"""
import os

import requests

URL = (os.environ.get("SUPABASE_URL") or "https://mhcbyreqascwvqocybvn.supabase.co").rstrip("/")
KEYS = {  # primary key of each history table
    "videos": ["platform", "video_id"],
    "stats": ["pulled_at", "platform", "video_id"],
    "followers": ["pulled_at", "platform"],
    "pulls": ["pulled_at", "platform"],
}
PAGE = 1000


def secret():
    return os.environ.get("SUPABASE_SECRET_KEY", "").strip()


def enabled():
    return bool(secret())


def _headers(extra=None):
    h = {"apikey": secret(), "Content-Type": "application/json"}
    h.update(extra or {})
    return h


def _check(r):
    if r.status_code >= 400:
        # Supabase's error text never contains the key; still keep it short
        raise RuntimeError(f"Supabase {r.request.method} {r.url.split('?')[0].replace(URL, '')} failed: "
                           f"HTTP {r.status_code} {r.text[:200]}")
    return r


def fetch(table, cols):
    """All rows of a history table, oldest first, as lists in `cols` order."""
    out, start = [], 0
    order = "pulled_at" if "pulled_at" in cols else "platform"
    while True:
        r = _check(requests.get(f"{URL}/rest/v1/{table}", timeout=30,
                                params={"select": ",".join(cols), "order": f"{order}.asc"},
                                headers=_headers({"Range": f"{start}-{start + PAGE - 1}"})))
        rows = r.json()
        out += [[row.get(c) for c in cols] for row in rows]
        if len(rows) < PAGE:
            return out
        start += PAGE


def upsert(table, cols, rows):
    if not rows:
        return 0
    payload = [{c: v for c, v in zip(cols, row)} for row in rows]
    for i in range(0, len(payload), 500):
        _check(requests.post(f"{URL}/rest/v1/{table}", timeout=60,
                             params={"on_conflict": ",".join(KEYS[table])},
                             headers=_headers({"Prefer": "resolution=merge-duplicates,return=minimal"}),
                             json=payload[i:i + 500]))
    return len(rows)


def delete_older(table, before_iso):
    _check(requests.delete(f"{URL}/rest/v1/{table}", timeout=30,
                           params={"pulled_at": f"lt.{before_iso}"}, headers=_headers()))


def save_dashboard(data):
    _check(requests.post(f"{URL}/rest/v1/dashboard", timeout=60, params={"on_conflict": "id"},
                         headers=_headers({"Prefer": "resolution=merge-duplicates,return=minimal"}),
                         json={"id": 1, "data": data, "updated_at": data.get("generated_at")}))
