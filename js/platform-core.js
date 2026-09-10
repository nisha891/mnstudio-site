/* =========================================================
   MN Studio — Platform core
   Shared runtime for every platform page: persistent state,
   app shell, deterministic randomness, and UI primitives.

   Everything is client-side. State lives in localStorage so
   the three journeys can hand work to each other (a Figma
   audit feeds the design stage; a debt report becomes
   tickets; agents read whatever the workspace knows).
   ========================================================= */
(() => {
  'use strict';

  const MN = window.MN = window.MN || {};

  /* -------------------------------------------------------
     Utilities
     ------------------------------------------------------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  /** Stable 32-bit hash — same input always yields the same analysis. */
  const hash = (str) => {
    let h = 2166136261;
    for (let i = 0; i < String(str).length; i++) {
      h ^= String(str).charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  /** mulberry32 — small seeded PRNG. Deterministic per source. */
  const rng = (seed) => {
    let a = typeof seed === 'number' ? seed : hash(seed);
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
  const round = (n, p = 0) => { const f = 10 ** p; return Math.round(n * f) / f; };
  const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
  const shuffle = (r, arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}`;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;

  const fmt = {
    int: (n) => Math.round(n).toLocaleString('en-US'),
    money: (n) => '$' + Math.round(n).toLocaleString('en-US'),
    money0: (n) => n >= 1000 ? '$' + round(n / 1000, 1) + 'k' : '$' + Math.round(n),
    pct: (n, p = 0) => round(n, p) + '%',
    days: (d) => d >= 10 ? `${round(d)}d` : `${round(d, 1)}d`,
    when: (ts) => {
      const diff = (Date.now() - ts) / 1000;
      if (diff < 60) return 'just now';
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    },
    clock: () => new Date().toLocaleTimeString('en-GB', { hour12: false })
  };

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  Object.assign(MN, { esc, hash, rng, clamp, round, pick, shuffle, uid, plural, fmt, sleep });

  /* -------------------------------------------------------
     Persistent store
     ------------------------------------------------------- */
  const KEY = 'mn.platform.v1';

  const blank = () => ({
    version: 1,
    theme: 'light',
    workspace: { name: 'MN Studio', plan: 'Studio', seats: 12 },
    connectors: { figma: false, linear: false, jira: false, storybook: false, github: false, slack: false },
    debt: null,
    figma: null,
    pipeline: {
      stage: 'research',
      product: null,
      research: { signals: [], synthesis: null },
      viability: null,
      design: null,
      build: { tickets: [], sprint: 1 },
      ship: { components: [], published: 0 }
    },
    workflows: null,
    activity: []
  });

  let state = null;

  const load = () => {
    if (state) return state;
    try {
      const raw = localStorage.getItem(KEY);
      state = raw ? Object.assign(blank(), JSON.parse(raw)) : blank();
    } catch (e) {
      state = blank();
    }
    return state;
  };

  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* quota / private mode */ }
    listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } });
  };

  const listeners = new Set();

  const store = {
    get all() { return load(); },
    get(path, fallback) {
      const s = load();
      const v = String(path).split('.').reduce((o, k) => (o == null ? o : o[k]), s);
      return v === undefined ? fallback : v;
    },
    set(path, value) {
      const s = load();
      const keys = String(path).split('.');
      const last = keys.pop();
      const target = keys.reduce((o, k) => (o[k] = o[k] || {}), s);
      target[last] = value;
      save();
      return value;
    },
    patch(fn) { fn(load()); save(); },
    reset() { state = blank(); save(); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    log(kind, text) {
      const s = load();
      s.activity.unshift({ id: uid('act'), kind, text, ts: Date.now() });
      s.activity = s.activity.slice(0, 40);
      save();
    }
  };
  MN.store = store;

  /* -------------------------------------------------------
     Theme
     ------------------------------------------------------- */
  const applyTheme = (t) => {
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
  };
  MN.theme = {
    get() { return store.get('theme', 'light'); },
    set(t) { store.set('theme', t); applyTheme(t); },
    toggle() { const next = MN.theme.get() === 'dark' ? 'light' : 'dark'; MN.theme.set(next); return next; }
  };
  applyTheme(store.get('theme', 'light'));

  /* -------------------------------------------------------
     Icons
     ------------------------------------------------------- */
  const ico = (d) => `<svg class="nav-ico" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    home: ico('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>'),
    gauge: ico('<path d="M12 21a9 9 0 1 0-9-9"/><path d="M3 12h3M12 21v-3M21 12h-3"/><path d="m12 12 4.5-4"/>'),
    figma: ico('<path d="M9 3h3v6H9a3 3 0 1 1 0-6Z"/><path d="M12 3h3a3 3 0 0 1 0 6h-3"/><path d="M9 9h3v6H9a3 3 0 1 1 0-6Z"/><path d="M9 15h3v3a3 3 0 1 1-3-3Z"/><circle cx="15" cy="12" r="3"/>'),
    pipeline: ico('<circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 6h10M5 8v3a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8"/><path d="M12 14v2"/>'),
    agent: ico('<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M8 14h.01M16 14h.01M9 18h6"/>'),
    book: ico('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>'),
    plug: ico('<path d="M9 3v6M15 3v6"/><path d="M6 9h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6Z"/><path d="M12 18v3"/>'),
    sun: ico('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    moon: ico('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>'),
    menu: ico('<path d="M4 7h16M4 12h16M4 17h16"/>')
  };
  MN.ICONS = ICONS;

  /* -------------------------------------------------------
     App shell — sidebar rendered from one definition
     ------------------------------------------------------- */
  const NAV = [
    {
      label: 'Workspace',
      items: [{ id: 'overview', href: 'index.html', icon: 'home', name: 'Overview' }]
    },
    {
      label: 'Journeys',
      items: [
        { id: 'debt', href: 'debt.html', icon: 'gauge', name: 'Design debt' },
        { id: 'figma', href: 'figma.html', icon: 'figma', name: 'Figma audit' },
        { id: 'build', href: 'build.html', icon: 'pipeline', name: 'Product pipeline' }
      ]
    },
    {
      label: 'Intelligence',
      items: [{ id: 'agents', href: 'agents.html', icon: 'agent', name: 'Agents & workflows' }]
    }
  ];

  const badgeFor = (id) => {
    const s = load();
    if (id === 'debt' && s.debt) return String(s.debt.report.findings.length);
    if (id === 'figma' && s.figma) return String(s.figma.report.findings.length);
    if (id === 'build') {
      const open = s.pipeline.build.tickets.filter((t) => t.status !== 'shipped').length;
      return open ? String(open) : '';
    }
    if (id === 'agents' && s.workflows) return String(s.workflows.filter((w) => w.enabled).length);
    return '';
  };

  const mountSide = () => {
    const side = document.getElementById('side');
    if (!side) return;
    const page = side.dataset.page || '';
    const s = load();
    const connected = Object.values(s.connectors).filter(Boolean).length;

    side.innerHTML = `
      <a class="side-brand" href="index.html">
        <span class="side-mark">MN</span>
        <span class="side-brand-text">
          <b>${esc(s.workspace.name)}</b>
          <span>Design intelligence</span>
        </span>
      </a>
      <nav class="side-nav" aria-label="Platform">
        ${NAV.map((g) => `
          <div class="nav-group">
            <p class="nav-label">${esc(g.label)}</p>
            ${g.items.map((it) => {
              const n = badgeFor(it.id);
              return `<a class="nav-item${it.id === page ? ' active' : ''}" href="${it.href}"
                ${it.id === page ? 'aria-current="page"' : ''}>
                ${ICONS[it.icon]}<span>${esc(it.name)}</span>
                ${n ? `<span class="nav-count">${esc(n)}</span>` : ''}
              </a>`;
            }).join('')}
          </div>`).join('')}
      </nav>
      <div class="side-foot">
        <div class="side-card">
          <b>${connected}/6 connected</b>
          ${connected
            ? esc(Object.entries(s.connectors).filter(([, v]) => v)
                .map(([k]) => k[0].toUpperCase() + k.slice(1)).join(', ')) + ' syncing.'
            : 'Connect Figma, Linear/Jira and Storybook to close the loop.'}
          <div style="margin-top:10px"><a class="btn btn-sm btn-ghost btn-full" href="agents.html#connectors"
            style="color:var(--nav-fg-strong);border-color:var(--nav-line)">Manage connections</a></div>
        </div>
      </div>`;
  };

  const mountTop = () => {
    const toggle = document.getElementById('sideToggle');
    const side = document.getElementById('side');
    if (toggle && side) {
      toggle.innerHTML = ICONS.menu;
      toggle.addEventListener('click', () => {
        const open = side.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
        let scrim = document.querySelector('.scrim');
        if (open && !scrim) {
          scrim = document.createElement('div');
          scrim.className = 'scrim';
          scrim.addEventListener('click', () => {
            side.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
            scrim.remove();
          });
          document.body.appendChild(scrim);
        } else if (!open && scrim) {
          scrim.remove();
        }
      });
    }

    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
      const paint = () => {
        const dark = MN.theme.get() === 'dark';
        themeBtn.innerHTML = dark ? ICONS.sun : ICONS.moon;
        themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      };
      paint();
      themeBtn.addEventListener('click', () => { MN.theme.toggle(); paint(); });
    }
  };

  MN.shell = {
    mount() { mountSide(); mountTop(); },
    refresh() { mountSide(); }
  };

  /* -------------------------------------------------------
     Toasts
     ------------------------------------------------------- */
  const toastWrap = () => {
    let w = document.querySelector('.toast-wrap');
    if (!w) {
      w = document.createElement('div');
      w.className = 'toast-wrap';
      w.setAttribute('role', 'status');
      w.setAttribute('aria-live', 'polite');
      document.body.appendChild(w);
    }
    return w;
  };

  MN.toast = (title, body, kind = 'ok') => {
    const icons = { ok: '✓', info: 'ℹ', warn: '!', bad: '✕', agent: '◆' };
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span class="tico">${icons[kind] || '✓'}</span>
      <div><b>${esc(title)}</b>${body ? `<span>${esc(body)}</span>` : ''}</div>`;
    const wrap = toastWrap();
    wrap.appendChild(t);
    // Keep the stack readable — drop the oldest beyond three.
    while (wrap.children.length > 3) wrap.firstElementChild.remove();
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 300);
    }, 4200);
  };

  /* -------------------------------------------------------
     Modal
     ------------------------------------------------------- */
  let openModal = null;

  MN.modal = (opts) => {
    MN.closeModal();
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `
      <div class="modal${opts.wide ? ' modal-wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(opts.title || 'Dialog')}">
        <div class="modal-head">
          <div>
            <h3>${esc(opts.title || '')}</h3>
            ${opts.sub ? `<p class="sub">${esc(opts.sub)}</p>` : ''}
          </div>
          <button class="modal-x" data-close aria-label="Close">✕</button>
        </div>
        <div class="modal-body">${opts.body || ''}</div>
        ${opts.foot ? `<div class="modal-foot">${opts.foot}</div>` : ''}
      </div>`;
    document.body.appendChild(back);
    document.body.style.overflow = 'hidden';
    openModal = back;

    back.addEventListener('click', (e) => {
      if (e.target === back || e.target.closest('[data-close]')) MN.closeModal();
    });
    document.addEventListener('keydown', onEsc);
    const focusable = back.querySelector('button, [href], input, select, textarea');
    if (focusable) focusable.focus();
    if (opts.onMount) opts.onMount(back);
    return back;
  };

  const onEsc = (e) => { if (e.key === 'Escape') MN.closeModal(); };

  MN.closeModal = () => {
    if (!openModal) return;
    openModal.remove();
    openModal = null;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onEsc);
  };

  /* -------------------------------------------------------
     Tabs & accordions (declarative, no per-page wiring)
     ------------------------------------------------------- */
  MN.bindTabs = (root = document) => {
    root.querySelectorAll('[data-tabs]').forEach((group) => {
      if (group.dataset.bound) return;
      group.dataset.bound = '1';
      const tabs = [...group.querySelectorAll('.tab')];
      tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          tabs.forEach((t) => {
            const on = t === tab;
            t.setAttribute('aria-selected', String(on));
            const p = document.getElementById(t.getAttribute('aria-controls'));
            if (p) p.hidden = !on;
          });
        });
      });
    });
  };

  MN.bindAccordions = (root = document) => {
    root.querySelectorAll('.finding-head').forEach((head) => {
      if (head.dataset.bound) return;
      head.dataset.bound = '1';
      head.addEventListener('click', () => {
        const f = head.closest('.finding');
        const body = f.querySelector('.finding-body');
        const open = f.classList.toggle('open');
        head.setAttribute('aria-expanded', String(open));
        if (body) body.hidden = !open;
      });
    });
  };

  /* -------------------------------------------------------
     Animated counters & meters
     ------------------------------------------------------- */
  MN.countTo = (el, to, opts = {}) => {
    const dur = opts.duration || 900;
    const from = opts.from || 0;
    const suffix = opts.suffix || '';
    const dp = opts.decimals || 0;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from + (to - from) * eased;
      el.textContent = (dp ? v.toFixed(dp) : String(Math.round(v))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /** Fill .meter-fill widths and .gauge values once they are in the DOM. */
  MN.paintMeters = (root = document) => {
    requestAnimationFrame(() => {
      root.querySelectorAll('.meter-fill[data-v]').forEach((m) => { m.style.width = m.dataset.v + '%'; });
      root.querySelectorAll('.gauge[data-v]').forEach((g) => { g.style.setProperty('--v', g.dataset.v); });
    });
  };

  /* -------------------------------------------------------
     Severity helpers, shared across journeys
     ------------------------------------------------------- */
  MN.SEVERITY = {
    critical: { label: 'Critical', weight: 4 },
    high: { label: 'High', weight: 3 },
    medium: { label: 'Medium', weight: 2 },
    low: { label: 'Low', weight: 1 }
  };

  /** Debt score → band. Higher score means more debt. */
  MN.band = (score) => {
    if (score >= 70) return { key: 'critical', label: 'Critical debt', grade: 'F' };
    if (score >= 55) return { key: 'high', label: 'Heavy debt', grade: 'D' };
    if (score >= 38) return { key: 'medium', label: 'Moderate debt', grade: 'C' };
    if (score >= 22) return { key: 'low', label: 'Light debt', grade: 'B' };
    return { key: 'good', label: 'Healthy', grade: 'A' };
  };

  /* -------------------------------------------------------
     Copy / export helpers
     ------------------------------------------------------- */
  MN.copy = async (text, label = 'Copied') => {
    try {
      await navigator.clipboard.writeText(text);
      MN.toast(label, 'Pasted straight into your clipboard.');
    } catch (e) {
      MN.modal({
        title: 'Copy manually',
        sub: 'Clipboard access was blocked by the browser.',
        body: `<textarea class="textarea" style="min-height:280px" readonly>${esc(text)}</textarea>`
      });
    }
  };

  /* -------------------------------------------------------
     Boot
     ------------------------------------------------------- */
  const boot = () => {
    MN.shell.mount();
    MN.bindTabs();
    MN.bindAccordions();
    document.querySelectorAll('[data-year]').forEach((e) => { e.textContent = new Date().getFullYear(); });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
