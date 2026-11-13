# Brian Kim — portfolio (draft)

Single-page static site. Plain HTML, CSS and JavaScript. There's no build step.

## Open locally
- Quickest: double-click `index.html`, or open it in a browser (`file://` works).
- With a local server (closer to GitHub Pages):
  ```
  cd brian-kim-portfolio
  python3 -m http.server 8000
  # then visit http://localhost:8000
  ```

## Structure
```
index.html          page markup (all content lives here)
css/style.css       styles (12-col grid, pale field, black top bar, Geist + Geist Mono, cards, rows)
js/main.js          footer year, active top-bar link, ASCII contour background (canvas), ASCII hero image
assets/             thumbnails + favicon (all local, no hotlinking)
tools/make_ascii.py   sketch of how the two ASCII card panels were generated (panels live inline in index.html)
CREDITS.md          image sources
```

## Deploying later
The site runs from the repo root, so GitHub Pages ("Deploy from branch → main / root") works as-is.
Fonts come from Google Fonts (Geist, Geist Mono), with system fallbacks.

## Editing
- Text: edit `index.html`.
- Colors and fonts: the `:root` variables at the top of `css/style.css`.
- Motion follows `prefers-reduced-motion` (the background renders one still frame).
- The hero image is drawn as ASCII from `assets/lol-arcane.webp` when served over http(s); opened via `file://` it falls back to the plain photo.
