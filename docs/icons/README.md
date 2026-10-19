# Platform icons

Put the official icon of each platform here to replace the generic symbols on the dashboard.
Use these exact file names (SVG preferred, PNG also works, square, at least 256 × 256 px):

- `youtube.svg`
- `tiktok.svg`
- `instagram.svg`
- `facebook.svg`

Download them from each platform's own brand resources page and follow its usage rules.
Then list each one in `icons.json`, for example `{"youtube": "youtube.svg", "tiktok": "tiktok.svg"}`. The dashboard picks them up on the next page load. (The list is what keeps the browser console free of "not found" errors.)
