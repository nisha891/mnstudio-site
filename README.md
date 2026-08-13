# MN Studio — Product Design Boutique

A static, fully responsive homepage for a product design boutique studio.
No build step, no dependencies — plain HTML, CSS and vanilla JS.

## Structure

```
index.html      Page markup (hero, services, work, process, testimonial,
                 about, CTA, contact form, footer)
css/style.css    All styling — layout, theming, responsive breakpoints
js/main.js       Mobile nav toggle, sticky header state, scroll-reveal
                 animations, back-to-top button, footer year, contact
                 form UI (front-end only, no backend wired up)
```

## Running locally

Any static file server works, e.g.:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Or just open `index.html` directly in a browser.

## Customizing

- **Colors / fonts / spacing** — CSS custom properties at the top of
  `css/style.css` (`:root`).
- **Copy & sections** — edit `index.html` directly; each section is
  clearly commented (`<!-- ===== SECTION ===== -->`).
- **Work / portfolio thumbnails** — currently CSS gradient placeholders
  (`.work-1` … `.work-6` in `style.css`). Swap the `.work-thumb` markup
  for `<img>` tags when real project imagery is ready.
- **Contact form** — `js/main.js` currently just simulates a submit.
  Wire the `fetch()` call in the `submit` handler up to your form
  endpoint / API when ready.

## Responsive breakpoints

- `1024px` — 3-col grids collapse to 2-col
- `860px`  — nav collapses into the hamburger menu
- `720px`  — single-column layout, tightened section padding
- `420px`  — buttons stack full-width

Tested at 1440×900 (desktop), 834×1100 (tablet) and 390×844 (mobile).
