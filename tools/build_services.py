import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from services_data import PAGES, CASES, ENGAGE, CAL, WA

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
BY = {p["slug"]: p for p in PAGES}
MAIL = "mailto:munmun@mnstudio.net?subject=Giving%20back%20application"

WA_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>'


def esc(s):
    return s.replace("&", "&amp;").replace("&amp;amp;", "&amp;")


def main_html(p):
    apply = p.get("apply")
    if apply:
        ctas = (f'<a href="{MAIL}" class="btn btn-primary">Apply by email</a>\n'
                f'        <a href="#how" class="btn btn-ghost">How it works</a>')
    else:
        ctas = (f'<a href="{CAL}" target="_blank" rel="noopener" class="btn btn-primary">Book a 30-minute meeting</a>\n'
                f'        <a href="{WA}" target="_blank" rel="noopener" class="btn btn-ghost">Talk to the founder</a>')

    problem = "\n".join(f"        <p>{x}</p>" for x in p["problem"])
    gets = "\n".join(
        f'        <article class="csp-goal reveal"><span class="csp-goal-num">{i+1:02d}</span><h3>{esc(t)}</h3><p>{d}</p></article>'
        for i, (t, d) in enumerate(p["get"]))
    steps = "\n".join(
        f'        <li><span class="csp-tl-stage">{esc(a)}</span><strong>{esc(b)}</strong></li>' for a, b in p["steps"])
    ncols = len(p["steps"])

    cards = []
    for k in p["cases"]:
        name, tag, stat, desc, href = CASES[k]
        internal = href.startswith("../case-studies/")
        cta = "Read the case study" if internal else "See the work"
        cards.append(
            f'        <a class="svc-case reveal" href="{href}">\n'
            f'          <span class="svc-case-tag">{esc(tag)}</span>\n'
            f'          <span class="svc-case-name">{esc(name)}</span>\n'
            f'          <span class="svc-case-stat">{esc(stat)}</span>\n'
            f'          <span class="svc-case-desc">{desc}</span>\n'
            f'          <span class="svc-case-cta">{cta} <span aria-hidden="true">→</span></span>\n'
            f'        </a>')
    cards = "\n".join(cards)

    engage = ""
    if not apply:
        items = "\n".join(
            f'        <div class="svc-engage-item reveal"><h3>{t}</h3><p>{d}</p></div>' for t, d in ENGAGE)
        engage = f'''
  <!-- ================= ENGAGEMENT ================= -->
  <section class="ab-section" id="engage">
    <div class="wrap">
      <p class="eyebrow eyebrow-muted reveal">Ways to work with us</p>
      <h2 class="reveal">Flexible engagement, <span class="accent">senior people.</span></h2>
      <div class="svc-engage">
{items}
      </div>
    </div>
  </section>
'''

    apply_block = ""
    if apply:
        apply_block = f'''
  <!-- ================= APPLY ================= -->
  <section class="ab-section" id="apply">
    <div class="wrap ab-narrow">
      <p class="eyebrow eyebrow-muted reveal">Apply</p>
      <h2 class="reveal">Tell us about <span class="accent">your mission.</span></h2>
      <p class="reveal">Email <a href="{MAIL}"><strong>munmun@mnstudio.net</strong></a> with a few lines about your organisation, the problem you’re working on, and what you’d like designed. We read every application and reply to each one.</p>
      <div class="hero-cta reveal"><a href="{MAIL}" class="btn btn-primary">Apply by email</a></div>
    </div>
  </section>
'''

    faqs = "\n".join(
        f'        <details class="faq-item"{" open" if i == 0 else ""}>\n'
        f'          <summary>{q}<span class="faq-icon" aria-hidden="true"></span></summary>\n'
        f'          <div class="faq-answer"><p>{a}</p></div>\n'
        f'        </details>' for i, (q, a) in enumerate(p["faq"]))

    related = "\n".join(
        f'        <li><a href="{r}.html"><span class="svc-rel-group">{BY[r]["group"]}</span><span class="svc-rel-name">{esc(BY[r]["name"])}</span><span aria-hidden="true" class="svc-rel-arrow">→</span></a></li>'
        for r in p["related"])

    case_head = "Impact work we’ve designed" if apply else "Work in this area"

    next_block = (f'''      <p class="eyebrow eyebrow-muted reveal">Working on something that matters?</p>
      <h2 class="reveal">Apply for <span class="accent">this quarter.</span></h2>
      <div class="hero-cta reveal">
        <a href="{MAIL}" class="btn btn-primary">Apply by email</a>
        <a href="../index.html#case-studies" class="btn btn-ghost">See our work</a>
      </div>''' if apply else f'''      <p class="eyebrow eyebrow-muted reveal">Ready when you are</p>
      <h2 class="reveal">Tell us what <span class="accent">you’re building.</span></h2>
      <div class="hero-cta reveal">
        <a href="{CAL}" target="_blank" rel="noopener" class="btn btn-primary">Book a 30-minute meeting</a>
        <a href="../index.html#case-studies" class="btn btn-ghost">See our work</a>
      </div>''')

    return f'''<main id="main" class="about-page case-page svc-page">

  <!-- ================= SERVICE HERO ================= -->
  <section class="csp-hero svc-hero">
    <div class="wrap">
      <a href="../index.html#services" class="csp-back reveal"><span aria-hidden="true">←</span> All services</a>
      <p class="eyebrow eyebrow-muted reveal">{esc(p["group"])} · {esc(p["name"])}</p>
      <h1 class="reveal">{p["h1"]}</h1>
      <p class="ab-lede reveal">{p["lede"]}</p>
      <div class="hero-cta svc-hero-cta reveal">
        {ctas}
      </div>
    </div>
  </section>

  <!-- ================= WHY ================= -->
  <section class="ab-section ab-alt" id="why">
    <div class="wrap">
      <p class="eyebrow eyebrow-muted reveal">Why it matters</p>
      <h2 class="reveal">{p["problem_h"]}</h2>
      <div class="csp-problem reveal">
{problem}
      </div>
    </div>
  </section>

  <!-- ================= WHAT YOU GET ================= -->
  <section class="ab-section" id="what">
    <div class="wrap">
      <p class="eyebrow eyebrow-muted reveal">What’s included</p>
      <h2 class="reveal">{p["get_h"]}</h2>
      <div class="csp-goals">
{gets}
      </div>
    </div>
  </section>

  <!-- ================= HOW ================= -->
  <section class="ab-section ab-alt" id="how">
    <div class="wrap">
      <p class="eyebrow eyebrow-muted reveal">How it works</p>
      <h2 class="reveal">Test every assumption, <span class="accent">then build.</span></h2>
      <ol class="csp-timeline svc-steps-{ncols} reveal">
{steps}
      </ol>
    </div>
  </section>
{apply_block}
  <!-- ================= PROOF ================= -->
  <section class="ab-section{"" if apply else ""}" id="work">
    <div class="wrap">
      <p class="eyebrow eyebrow-muted reveal">{case_head}</p>
      <h2 class="reveal">Proof, <span class="accent">not promises.</span></h2>
      <div class="svc-cases">
{cards}
      </div>
    </div>
  </section>
{engage}
  <!-- ================= FAQ ================= -->
  <section class="ab-section ab-alt" id="faq">
    <div class="wrap svc-faq">
      <div>
        <p class="eyebrow eyebrow-muted reveal">FAQs</p>
        <h2 class="reveal">Good <span class="accent">questions.</span></h2>
      </div>
      <div class="faq-list reveal">
{faqs}
      </div>
    </div>
  </section>

  <!-- ================= RELATED ================= -->
  <section class="ab-section svc-related-section" id="related">
    <div class="wrap">
      <p class="eyebrow eyebrow-muted reveal">Explore more services</p>
      <ul class="svc-related reveal">
{related}
      </ul>
    </div>
  </section>

  <!-- ================= NEXT ================= -->
  <section class="csp-next">
    <div class="wrap">
{next_block}
    </div>
  </section>

</main>'''


# ---------- build pages from the case-study shell ----------
shell = open("case-studies/resultbook.html").read()
s = shell.index('<main id="main"'); e = shell.index("</main>") + len("</main>")
os.makedirs("services", exist_ok=True)
for p in PAGES:
    out = shell[:s] + main_html(p) + shell[e:]
    out = re.sub(r'href="(flowmo|freedai|resultbook|reunion-pwa|space)\.html"', r'href="../case-studies/\1.html"', out)
    out = re.sub(r"<title>[^<]*</title>", f"<title>{esc(p['title'])}</title>", out)
    out = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{esc(p["meta"])}">', out)
    open(f"services/{p['slug']}.html", "w").write(out)

# ---------- rewire links on every page ----------
MENU = {BY[k]["name"]: k for k in BY}
MENU["For Impact-Driven Startups"] = "impact-startups"
MENU["For VC &amp; Private Equity"] = "vc-private-equity"
MENU["UI/UX Overhauls"] = "ux-overhauls"
FOOT = {"Founding MVP": "founding-mvp", "Agentic Workflows": "agentic-workflows", "UI/UX Overhauls": "ux-overhauls",
        "CRO for E-commerce": "cro-ecommerce", "Full-Stack Product Design": "full-stack-design",
        "Product Management &amp; Leadership": "product-management",
        "For impact-driven startups": "impact-startups", "For enterprises": "impact-startups",
        "For VC &amp; private equity": "vc-private-equity"}

files = ["index.html", "about.html"] + [f"case-studies/{f}" for f in os.listdir("case-studies")] + [f"services/{p['slug']}.html" for p in PAGES]
for f in files:
    t = open(f).read()
    sub = "/" in f
    base = "../services/" if sub else "services/"
    if f.startswith("services/"):
        base = ""
    for title, slug in MENU.items():
        t = re.sub(r'<li><a href="[^"]*"><span class="mega-title">' + re.escape(title) + "</span>",
                   f'<li><a href="{base}{slug}.html"><span class="mega-title">{title}</span>', t)
    for label, slug in FOOT.items():
        t = re.sub(r'<li><a href="[^"]*">' + re.escape(label) + "</a></li>",
                   f'<li><a href="{base}{slug}.html">{label}</a></li>', t)
    t = re.sub(r'<a href="[^"]*" class="nav-btn nav-btn-outline">See the program</a>',
               f'<a href="{base}giving-back.html" class="nav-btn nav-btn-outline">See the program</a>', t)
    t = re.sub(r'<a href="[^"]*" class="nav-btn nav-btn-accent">Apply',
               f'<a href="{base}giving-back.html#apply" class="nav-btn nav-btn-accent">Apply', t)
    if f == "index.html":
        t = t.replace('<a href="#services" class="btn btn-primary audience-btn">Explore founding MVP design</a>',
                      '<a href="services/impact-startups.html" class="btn btn-primary audience-btn">Explore founding MVP design</a>')
        t = t.replace('<a href="#services" class="btn btn-primary audience-btn">Explore portfolio support</a>',
                      '<a href="services/vc-private-equity.html" class="btn btn-primary audience-btn">Explore portfolio support</a>')
    open(f, "w").write(t)
print("built", len(PAGES), "pages; rewired", len(files), "files")
