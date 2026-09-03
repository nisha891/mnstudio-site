# MN Studio — Boutique Product Design Firm

A static, fully responsive marketing site for MN Studio, positioned around
three offers: **consulting**, **fractional Head of Design / Head of Product**,
and **AI-assisted development**.

Strictly black and white — the palette is black, white and neutral greys, with
no hue anywhere in the stylesheet. No build step, no dependencies: plain HTML,
CSS and vanilla JS.

## Structure

```
index.html       Page markup — hero, discipline ticker, services (3 pillars),
                  fractional leadership, AI-assisted development, process,
                  manifesto, about, CTA banner, contact form, footer
css/style.css     All styling — greyscale tokens, layout, responsive rules
js/main.js        Mobile nav toggle, sticky header state, scroll-reveal,
                  active nav-link tracking, back-to-top, footer year,
                  contact form UI (front-end only, no backend wired up)
```

## Running locally

Any static file server works, e.g.:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Or just open `index.html` directly in a browser.

## Design system

Everything is driven by custom properties at the top of `css/style.css`:

- **Greyscale ramp** — `--black`, `--ink`, `--grey-700` … `--grey-100`,
  `--paper`, `--white`, plus `--line` / `--line-strong` / `--line-invert`
  for the hairline rules that carry most of the layout.
- **Type** — `--font-serif` for headings (display voice), `--font-sans` for
  body copy, `--font-mono` for eyebrows, labels, step markers and form
  labels. The mono labels are what give the page its technical register;
  they all use the shared `.label` class.
- **Contrast blocks** — the Fractional section, CTA banner and footer invert
  to black; everything else sits on white or `--paper`.

Keeping it monochrome is a constraint worth defending: if you add a brand
colour later, introduce it as a single `--accent` token and use it sparingly
(links, the active nav underline) rather than sprinkling it through sections.

## Placeholders to replace before launch

These are deliberately generic — swap them for real details:

- **Contact block** (`#contact`) — `hello@mnstudio.net`, the "Remote-first,
  working across UK & US hours" line, and the availability line.
- **Social links** — the LinkedIn and "Read our notes" links are `href="#"`
  in both the contact section and the footer.
- **Contact form** — `js/main.js` currently simulates a submit. Replace the
  `setTimeout` in the `submit` handler with a `fetch()` to your form endpoint
  (Formspree, Basin, a serverless function, etc.).
- **Proof** — the site intentionally ships without client logos, invented
  metrics or third-party testimonials. When real case studies and quotes are
  available, the natural home is a new section between *Process* and
  *Manifesto*, or a `/work` page linked from the nav.

## Responsive breakpoints

- `1024px` — pillars, role cards and split layouts collapse to one column;
  process grid goes 2-up
- `860px`  — nav collapses into the hamburger menu; hero facts stack
- `720px`  — single-column throughout, tightened section padding
- `420px`  — hero buttons stack full-width, contact rows stack

## Accessibility notes

- Skip link, visible `:focus-visible` outlines, and a labelled nav toggle
  with `aria-expanded` / `aria-controls`.
- The form status message is a `role="status"` live region.
- All motion (reveals, ticker, hover shifts) is disabled under
  `prefers-reduced-motion: reduce`.
- Body text sits at `--grey-700` on white (≈10:1) and secondary text at
  `--grey-500` (≈5.7:1); keep new greys at or above `--grey-500` for text.
