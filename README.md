# MapFacto Studio

![MapFacto Studio, demo data](docs/preview-desktop.jpg)

**Live demo: https://akshay-allam.github.io/mapfacto-studio/**

A live analytics dashboard for the MapFacto map-facts channel on **YouTube, TikTok, Instagram and Facebook**.
A robot collects fresh numbers every 30 minutes, 24/7, with no server and no cost.

> **The public site shows demo data.** Every number on it is made up, so the channel's real results
> stay private. The owner signs in to see the real dashboard, which lives in a private database.

## What it does
- **One view for four platforms:** total views, followers, views in the last 24 hours, engagement and share of views per platform.
- **Views matrix:** every video on every platform, with views, recent growth and engagement.
- **Charts:** views over time, views gained per day, followers over time, views and engagement per video.
- **Insights:** what's working and what needs work, such as the best reach, the most engaged audience, weak videos and videos missing on a platform.
- **Live status:** whether each platform answered the last update, plus alerts by email when one keeps failing.
- **Owner sign-in:** invite-only accounts. Visitors see the demo.

## How it works
```
GitHub Actions, every 30 min                    Supabase (private)
  pipeline/run.py                                 history tables  (RLS: robot only)
    YouTube Data API  ┐                           dashboard row   (RLS: owner only)
    Instagram Graph   ├─► build.py ─► real JSON ───────►  ▲
    Facebook Graph    │                                   │ signed-in owner
    TikTok (yt-dlp)   ┘                                   │
                                                 GitHub Pages: docs/
  pipeline/demo.py ─► docs/data.json (demo) ──►  index.html + app.js ◄── everyone
```
- **Robot:** `.github/workflows/update.yml` runs `pipeline/run.py`. It loads the history from Supabase, pulls each platform, saves only the rows that changed, builds the dashboard and stores it in Supabase.
- **Website:** a static site on GitHub Pages using ECharts, GSAP, Lenis and a d3-geo brand globe. Visitors load `docs/data.json` (demo). The owner signs in with Supabase Auth and loads the real dashboard instead.
- **Security:**
  - **Row Level Security:** the history tables have no policies, so only the robot's secret key can read or write them. The dashboard row is readable only by signed-in emails on an allow list.
  - **Invite-only accounts:** a database trigger rejects sign-ups from any other email.
  - **No keys in the code:** API keys and the Supabase secret key are encrypted GitHub secrets, never in the code, the site or the logs.
  - **Leak guard:** `pipeline/guard.py` stops the run if a key, a token or anything that isn't demo data would be published.

## Tech
Python (pandas, requests, yt-dlp), GitHub Actions, Supabase (Postgres, Auth, RLS), GitHub Pages, vanilla JavaScript, ECharts, GSAP, Lenis, d3-geo.

## Run it yourself
1. Fork the repo and enable **GitHub Pages** (Settings → Pages → branch `main`, folder `/docs`).
2. Create a free **Supabase** project and apply the schema used here: tables `videos`, `stats`, `followers`, `pulls`, `dashboard` and `allowed_users`, with RLS on. Add your email to `allowed_users`.
3. Add repository secrets: `YT_API_KEY`, `IG_TOKEN`, `FB_PAGE_TOKEN`, `SUPABASE_SECRET_KEY` (and `SUPABASE_URL` for your own project).
4. Put your project URL and publishable key in `docs/app.js` (`SB`). The publishable key is meant to be public.
5. Run **Actions → Update MapFacto stats → Run workflow**, open the site, click **Sign in** and create your account.

Locally:
```
pip install -r requirements.txt
python pipeline/demo.py          # rebuild the public demo data
python pipeline/run.py           # pull + build (uses .env; without Supabase it keeps data in data/, not committed)
python -m http.server -d docs    # then open http://localhost:8000
```

## Files
| Path | What it is |
|---|---|
| `docs/index.html`, `app.js`, `styles.css`, `globe.js`, `motion.js` | the website |
| `docs/data.json` | demo data shown to visitors (made up, built by `demo.py`) |
| `pipeline/collect.py` | talks to each platform |
| `pipeline/build.py` | computes totals, verdicts, insights and charts |
| `pipeline/run.py` | one update: load history → pull → save → build → store |
| `pipeline/store.py` | private storage in Supabase |
| `pipeline/demo.py` | generates the demo data |
| `pipeline/guard.py` | leak guard |
| `pipeline/alert.py` | opens a GitHub issue (email) when a platform keeps failing |
| `docs/vendor/` | ECharts (Apache-2.0), GSAP, Lenis, d3-geo, topojson, world-atlas, supabase-js (MIT/ISC) |
