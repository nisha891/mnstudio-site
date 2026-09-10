#!/usr/bin/env node
/* =========================================================
   MN Studio — single-file build

   Bundles the five platform pages into one self-contained
   HTML file with a hash router, so the whole platform can be
   opened from a single URL (or a single local file) with no
   server and no separate assets.

   The multi-page app under platform/ stays the source of
   truth. This script reads it and emits dist/mn-platform.html.

     node tools/build-single.js

   How it works
     • Each page's crumbs, top actions and <main> contents are
       extracted into a template, so only one page's markup is
       ever in the DOM — which is what keeps element ids from
       colliding between pages.
     • Each page controller is an IIFE of a known shape; it is
       rewritten into MN.PAGES[name] and invoked on navigation.
     • Cross-page links and MN.goto() are routed to hashes.
   ========================================================= */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* Shared runtime and engines — loaded once, in order. */
const SHARED = [
  'js/platform-core.js',
  'js/debt-engine.js',
  'js/debt-report.js',
  'js/pipeline-engine.js',
  'js/figma-engine.js'
];

/* page id → source html, controller, sidebar key, document title */
const PAGES = [
  { id: 'overview', html: 'platform/index.html', js: 'js/overview.js', title: 'Workspace' },
  { id: 'debt', html: 'platform/debt.html', js: 'js/debt.js', title: 'Design debt' },
  { id: 'figma', html: 'platform/figma.html', js: 'js/figma.js', title: 'Figma audit' },
  { id: 'build', html: 'platform/build.html', js: 'js/build.js', title: 'Product pipeline' },
  { id: 'agents', html: 'platform/agents.html', js: 'js/agents.js', title: 'Agents & workflows' }
];

/* ---------- extraction ---------- */
const between = (src, startRe, endTag, label, file) => {
  const m = src.match(startRe);
  if (!m) throw new Error(`${file}: could not find ${label}`);
  const from = m.index + m[0].length;
  const to = src.indexOf(endTag, from);
  if (to < 0) throw new Error(`${file}: unterminated ${label}`);
  return src.slice(from, to).trim();
};

const extract = (file) => {
  const src = read(file);
  return {
    crumbs: between(src, /<nav class="crumbs"[^>]*>/, '</nav>', 'crumbs', file),
    actions: between(src, /<div class="top-actions">/, '</header>', 'top actions', file)
      .replace(/<\/div>\s*$/, '').trim(),
    body: between(src, /<main class="canvas"[^>]*>/, '</main>', 'canvas', file)
  };
};

/* ---------- controller rewrite ---------- */
const asPageInit = (file, id) => {
  const src = read(file);
  const open = src.indexOf('(() => {');
  const close = src.lastIndexOf('})();');
  if (open < 0 || close < 0) throw new Error(`${file}: unexpected controller shape`);
  return src.slice(0, open)
    + `MN.PAGES[${JSON.stringify(id)}] = () => {`
    + src.slice(open + '(() => {'.length, close)
    + '};\n';
};

/* ---------- assemble ---------- */
const templates = {};
for (const p of PAGES) {
  const t = extract(p.html);
  // The studio-site link has nowhere to go inside a single file.
  t.actions = t.actions.replace(/<a class="btn btn-ghost btn-sm hide-sm"[^>]*>[^<]*<\/a>\s*/, '');
  templates[p.id] = { ...t, title: p.title };
}

const css = read('css/platform.css');
const sharedJs = SHARED.map(read).join('\n');
const pageJs = PAGES.map((p) => asPageInit(p.js, p.id)).join('\n');

const router = `
/* =========================================================
   Single-file router
   ========================================================= */
(() => {
  'use strict';
  const MN = window.MN;
  const TPL = ${JSON.stringify(templates)};
  const IDS = Object.keys(TPL);

  const $ = (s) => document.querySelector(s);

  /* Override the multi-page navigator with hash routing. */
  MN.goto = (page, sub) => {
    window.location.hash = '#/' + page + (sub ? '/' + sub : '');
  };

  const parse = () => {
    const raw = String(location.hash || '').replace(/^#\\/?/, '');
    const [page, sub] = raw.split('/');
    return { page: TPL[page] ? page : 'overview', sub: sub || '' };
  };

  let currentPage = null;

  const route = () => {
    const { page, sub } = parse();
    const t = TPL[page];
    MN.sub = sub;

    $('#side').dataset.page = page;
    $('#crumbHost').innerHTML = t.crumbs;
    $('#actionHost').innerHTML = t.actions;
    $('#canvas').innerHTML = t.body;
    document.title = t.title + ' — MN Studio Platform';

    MN.shell.mount();
    MN.bindTabs();
    MN.bindAccordions();

    try {
      MN.PAGES[page]();
    } catch (err) {
      console.error(err);
      $('#canvas').innerHTML =
        '<div class="empty"><h4>Something went wrong on this page</h4>' +
        '<p>' + MN.esc(err.message) + '</p>' +
        '<button class="btn btn-primary btn-sm" onclick="location.reload()">Reload</button></div>';
    }

    if (page !== currentPage) window.scrollTo({ top: 0, behavior: 'auto' });
    currentPage = page;
  };

  /* Links written for the multi-page app resolve to routes here. */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const m = (a.getAttribute('href') || '')
      .match(/^(?:\\.\\.?\\/)?(index|debt|figma|build|agents)\\.html(?:#(.+))?$/);
    if (!m) return;
    e.preventDefault();
    MN.goto(m[1] === 'index' ? 'overview' : m[1], m[2] || '');
    const side = $('#side');
    if (side) side.classList.remove('open');
    const scrim = document.querySelector('.scrim');
    if (scrim) scrim.remove();
  });

  window.addEventListener('hashchange', route);
  route();
})();
`;

const out = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MN Studio Platform</title>
<meta name="description" content="UX research, product design, delivery and design debt in one workspace, with AI agents wired through all of it.">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2222%22 fill=%22%23161513%22/><text x=%2250%22 y=%2268%22 font-size=%2258%22 font-family=%22Georgia,serif%22 fill=%22%23f2c48d%22 text-anchor=%22middle%22>M</text></svg>">
<style>
${css}
</style>
</head>
<body class="app-body">

<div class="app">
  <aside class="side" id="side" data-page="overview"></aside>
  <div>
    <header class="top">
      <div class="top-inner">
        <button class="side-toggle" id="sideToggle" aria-expanded="false" aria-label="Toggle navigation"></button>
        <div id="crumbHost" class="crumbs grow"></div>
        <div class="top-actions" id="actionHost"></div>
      </div>
    </header>
    <main class="canvas" id="canvas"></main>
  </div>
</div>

<script>
${sharedJs}
</script>
<script>
window.MN.PAGES = {};
${pageJs}
</script>
<script>
${router}
</script>
</body>
</html>
`;

fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const dest = path.join(ROOT, 'dist', 'mn-platform.html');
fs.writeFileSync(dest, out);
console.log(`built dist/mn-platform.html — ${(out.length / 1024).toFixed(0)} KB`);
console.log(`  pages:  ${PAGES.map((p) => p.id).join(', ')}`);
console.log(`  shared: ${SHARED.length} modules`);
