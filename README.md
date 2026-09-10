# MN Studio

A product design boutique site, plus **MN Studio Platform** — a working prototype of a
UX research, product design, delivery and design-debt workspace.

Static, fully responsive, no build step, no dependencies — plain HTML, CSS and vanilla JS.

## Structure

```
index.html              Studio homepage (hero, services, work, process, about,
                        platform band, contact)
css/
  style.css             Marketing site styles
  platform.css          Platform app-shell design system (light + dark)
js/
  main.js               Marketing site behaviour
  platform-core.js      Shared runtime: persistent state, app shell, seeded PRNG,
                        toasts, modals, tabs, accordions, formatting
  debt-engine.js        Design Debt Index model — dimensions, findings, economics,
                        refactoring waves, markdown + ticket exports
  debt-report.js        Report renderer shared by the debt and Figma journeys
  debt.js               Journey 1 controller
  pipeline-engine.js    Research synthesis, viability scoring, design generation,
                        agent roster and agent run scripts
  build.js              Journey 2 controller
  figma-engine.js       Figma file model, file-native audit, tokenisation and
                        consolidation plans, pipeline handoff
  figma.js              Journey 3 controller
  agents.js             Agent roster, workflow composer, connections, activity
  overview.js           Workspace overview and demo seeder
platform/
  index.html            Workspace overview
  debt.html             Journey 1 — design debt calculator
  figma.html            Journey 3 — Figma audit
  build.html            Journey 2 — product pipeline
  agents.html           Agents, custom workflows, connections, activity
```

## Running locally

Any static file server works:

```bash
python3 -m http.server 8080
```

- Studio site — <http://localhost:8080/>
- Platform — <http://localhost:8080/platform/>

Opening `platform/index.html` straight from the filesystem also works, though a server
is preferable so relative paths behave consistently.

**Fastest way to see everything:** open the platform, then press **Load demo workspace**
in the header. It populates all three journeys with one coherent worked example — a debt
report, a Figma audit, and a product taken from research through to four components
published in Storybook — so every screen has real content to click through.

## The three journeys

**1 · Design debt calculator** (`platform/debt.html`)
Give it a live URL or a demo video plus your team context. Returns a Design Debt Index
(0–100, weighted across eight dimensions), a findings ledger with evidence, impact,
effort and remediation for each, the debt economics (principal, interest per sprint,
capacity lost, payback, ROI), an impact-versus-effort quadrant, and a three-wave
refactoring strategy. Exports as markdown, or straight into the pipeline as tickets.

**2 · Product pipeline** (`platform/build.html`)
Research → viability → design → build → ship, with each stage gating the next.

- **Research** — add weighted signals (interviews, sales calls, support patterns,
  analytics, competitor teardowns); an agent clusters them into themes, jobs-to-be-done
  and ranked pains, and flags gaps that make the synthesis unsafe to act on.
- **Viability** — six weighted axes produce a GO / CONDITIONAL / NO-GO verdict with risks
  and the specific unlocks that would change it. A non-GO verdict really does block the
  design stage; overriding it is possible and gets recorded with its rationale.
- **Design** — generates information architecture, core flows, a prioritised screen
  inventory, a token set and the component system, driven by a product archetype
  classified from the brief.
- **Build** — a kanban board fed by the design, the debt report, or imported Linear and
  Jira tickets. Agents pick tickets up, stream a run log, and open pull requests.
- **Ship** — reviewed components publish to Storybook with a story per variant and
  visual-regression results.

**3 · Figma audit** (`platform/figma.html`)
Connect a file (three examples included). Reads its structure, then reports the debt that
only exists inside a design file — detached instances, unbound values, duplicate
component clusters, auto-layout coverage, text style sprawl, library adoption, naming,
orphan frames. Produces a tokenisation plan and a component consolidation map, scores the
file on the same index as a live product, and hands off into the pipeline's design stage.

**Agents & workflows** (`platform/agents.html`)
Twelve agents across research, design debt, design, build and ship. A workflow composer
chains them with triggers (schedule, Figma publish, ticket created, PR opened, deploy,
new research signal, manual), gates (threshold, verdict, human approval, checks pass) and
outputs (tickets, PR, Storybook, report, Slack, write back to Figma). Workflows run with a
live step-by-step log, and halt at a gate when its condition is not met.

## How the models work

Two classes of signal feed every score:

- **Declared** — facts you provide (surface count, design-system maturity, team shape,
  accessibility target, release cadence). These drive the deterministic base scores and
  are marked `measured: true`.
- **Observed** — what a real crawler, vision pass or Figma read would collect (token
  sprawl, contrast failures, detached instances). In this prototype they are synthesised
  from a seeded PRNG keyed to the source, so **the same input always produces the same
  report**. They are marked `measured: false` and labelled *observed* in the UI.

The scoring, economics, roadmap and ticket generation around those signals are real. To
make this production, replace `observe()` in `debt-engine.js`, `parse()` in
`figma-engine.js`, and the generators in `pipeline-engine.js` with real analysers and
model calls — the surrounding structure is unchanged.

State persists in `localStorage` under `mn.platform.v1`, which is how the journeys hand
work to each other: a Figma audit seeds the design stage, a debt report becomes tickets,
agents read whatever the workspace knows. **Reset the workspace** on the overview page
clears it.

## Notes

- Connections to Figma, Linear, Jira, Storybook, GitHub and Slack are simulated. No OAuth
  is performed and nothing leaves the browser.
- Light and dark themes are both supported; the toggle is in the app header.
- Reports are print-friendly — use Export → *Print / save as PDF* on a debt report.

## Customising the studio site

- **Colours / fonts / spacing** — CSS custom properties at the top of `css/style.css`
  (`:root`); the platform's own tokens sit at the top of `css/platform.css`.
- **Copy & sections** — edit `index.html`; each section is clearly commented.
- **Work thumbnails** — currently CSS gradient placeholders (`.work-1` … `.work-6`).
  Swap the `.work-thumb` markup for `<img>` tags when real imagery is ready.
- **Contact form** — `js/main.js` simulates a submit. Wire the `fetch()` call in the
  `submit` handler to your form endpoint when ready.
