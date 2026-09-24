# MN Studio — Product Design Boutique

A static, fully responsive homepage for a product design boutique studio.
No build step, no dependencies — plain HTML, CSS and vanilla JS.

## Structure

```
index.html      Page markup (hero, client logos, who we work with, featured
                 case studies, what we do, FAQ, results, ready-to-start CTA,
                 footer)
css/style.css    Page styling — layout, theming, responsive breakpoints
css/nav.css      Header: announcement bar, mega-menu nav, theme toggle,
                 mobile drawer (black / white / red, light + dark)
assets/clients/  Client logos (transparent PNGs) for the scrolling logo strip
js/main.js       Mega-menus (hover/click/Esc), mobile drawer, theme toggle,
                 sticky header state, scroll-reveal animations, back-to-top
                 button, footer year, featured case study rail
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
  `css/style.css` (`:root`). Inter is used throughout.
- **Copy & sections** — edit `index.html` directly; each section is
  clearly commented (`<!-- ===== SECTION ===== -->`).

## Hero

Light hero with a Mintlify-inspired bundle of red line strands
(`#heroStrands`, drawn in `js/main.js`, "Hero strands" block) twisting
diagonally behind the content. Strands use multiply blending so they
deepen where they overlap. Animation pauses off-screen and is static for
reduced motion.

Saved alternatives: grainy ribbon hero at commit `ae7d7cf`; dark
Mintlify-style hero with Qualux headlines at commit `ffa1905`.

## Featured case studies

The "Take a look at work we're proud of" section is an expanding-panel
rail (`#caseRail`). Each `.cs-panel` in `index.html` is one case study;
add, remove or reorder panels there. The first panel with `is-active`
opens by default. On desktop it auto-advances every 7s (pauses on hover
or focus, stops once a visitor clicks); on phones it is a tap-to-open
accordion. Panel colours are the `.cs-<name>` rules in `css/style.css`.

Testimonials: each panel's `data-quote` and `data-cite` attributes feed
the quote shown under the rail, and it swaps with the open panel. They
are **placeholders** until real client quotes are supplied. Remove
`data-quote` from a panel to hide the quote for that case study.

## Navigation

- **Book a call** buttons link to Calendly
  (`calendly.com/munmun_mnstudio/lets_get_to_know_each_other`).
- **Talk to the founder** buttons link to WhatsApp (`https://wa.me/919099344578`).
  Change the number in both places in `index.html` if needed.
- Mega-menu content for Services / Our Work / Newsroom is in the header
  markup in `index.html`.

## Responsive breakpoints

- `1024px` — 3-col grids collapse to 2-col
- `1100px` — mega-menu feature card drops below the three columns
- `1080px` — nav collapses into the full-screen hamburger drawer
- `720px`  — single-column layout, tightened section padding
- `420px`  — buttons stack full-width

Tested at 1440×900 (desktop), 834×1100 (tablet) and 390×844 (mobile).
