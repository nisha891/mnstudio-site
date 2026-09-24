(() => {
  'use strict';

  /* ---------- Navigation: mega menus + mobile drawer ---------- */
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  const megaItems = Array.from(document.querySelectorAll('.nav-item.has-mega'));
  const mobileMQ = window.matchMedia('(max-width: 1080px)');
  let closeTimer;

  const setOpen = (item, open) => {
    item.classList.toggle('open', open);
    item.querySelector('.nav-link').setAttribute('aria-expanded', String(open));
  };
  const closeAll = (except) => megaItems.forEach((it) => { if (it !== except) setOpen(it, false); });

  megaItems.forEach((item) => {
    const trigger = item.querySelector('.nav-link');

    trigger.addEventListener('click', () => {
      const open = !item.classList.contains('open');
      closeAll(item);
      setOpen(item, open);
    });

    // Desktop: open on hover, with a short grace period on leave
    item.addEventListener('mouseenter', () => {
      if (mobileMQ.matches) return;
      clearTimeout(closeTimer);
      closeAll(item);
      setOpen(item, true);
    });
    item.addEventListener('mouseleave', () => {
      if (mobileMQ.matches) return;
      closeTimer = setTimeout(() => setOpen(item, false), 150);
    });

    // Keyboard: close when focus leaves the item
    item.addEventListener('focusout', (e) => {
      if (!mobileMQ.matches && !item.contains(e.relatedTarget)) setOpen(item, false);
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openItem = megaItems.find((it) => it.classList.contains('open'));
    if (openItem) {
      setOpen(openItem, false);
      openItem.querySelector('.nav-link').focus();
    } else if (mainNav && mainNav.classList.contains('open')) {
      setDrawer(false);
      navToggle.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!mobileMQ.matches && !e.target.closest('.nav-item.has-mega')) closeAll();
  });

  const setDrawer = (open) => {
    mainNav.classList.toggle('open', open);
    navToggle.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
    if (!open) closeAll();
  };

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', () => setDrawer(!mainNav.classList.contains('open')));

    // Close menus when a link is followed
    mainNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        closeAll();
        if (mobileMQ.matches) setDrawer(false);
      });
    });

    mobileMQ.addEventListener('change', () => { setDrawer(false); });
  }

  /* ---------- Theme toggle ---------- */
  const themeToggle = document.getElementById('themeToggle');
  const root = document.documentElement;
  const storedTheme = (() => { try { return localStorage.getItem('theme'); } catch (_) { return null; } })();
  const applyTheme = (theme) => {
    root.setAttribute('data-theme', theme);
    if (themeToggle) themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  };
  applyTheme(storedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('theme', next); } catch (_) { /* storage unavailable */ }
    });
  }

  /* ---------- Header scroll state ---------- */
  const header = document.getElementById('siteHeader');
  const toTopBtn = document.getElementById('toTop');

  const onScroll = () => {
    const scrolled = window.scrollY > 12;
    if (header) header.classList.toggle('scrolled', scrolled);
    if (toTopBtn) toTopBtn.classList.toggle('visible', window.scrollY > 600);
  };
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTopBtn) {
    toTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---------- Scroll reveal ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i % 6, 6) * 60}ms`;
      io.observe(el);
    });
  } else {
    revealEls.forEach((el) => el.classList.add('in-view'));
  }

  /* ---------- Featured case studies: expanding panels ---------- */
  const rail = document.getElementById('caseRail');
  if (rail) {
    const panels = Array.from(rail.querySelectorAll('.cs-panel'));
    const DURATION = 7000; // ms each case study stays open while auto-playing
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stacked = window.matchMedia('(max-width: 860px)'); // phones: accordion, no auto-rotate
    let active = Math.max(0, panels.findIndex((p) => p.classList.contains('is-active')));
    let autoplay = !reduceMotion;
    let hovered = false;
    let focused = false;
    let inView = false;
    let elapsed = 0;
    let last = null;

    const bar = (i) => panels[i].querySelector('.cs-progress');

    // Testimonial under the rail follows the open case study; hidden when a panel has no quote
    const quote = document.getElementById('caseQuote');
    const showQuote = (i) => {
      if (!quote) return;
      const { quote: text, cite } = panels[i].dataset;
      quote.classList.add('is-swapping');
      setTimeout(() => {
        quote.hidden = !text;
        if (text) {
          quote.querySelector('blockquote p').textContent = text;
          quote.querySelector('figcaption').textContent = cite || '';
        }
        quote.classList.remove('is-swapping');
      }, reduceMotion ? 0 : 200);
    };

    const activate = (i, { fromUser = false } = {}) => {
      panels.forEach((panel, idx) => {
        const on = idx === i;
        panel.classList.toggle('is-active', on);
        panel.querySelector('.cs-tab').setAttribute('aria-expanded', String(on));
        const body = panel.querySelector('.cs-body');
        if (on) body.removeAttribute('inert'); else body.setAttribute('inert', '');
        bar(idx).style.width = '0';
      });
      active = i;
      elapsed = 0;
      showQuote(i);
      if (fromUser) {
        autoplay = false; // the visitor has taken over; stop rotating
        panels[i].querySelector('.cs-body').focus({ preventScroll: true });
      }
    };

    panels.forEach((panel, i) => {
      panel.querySelector('.cs-tab').addEventListener('click', () => activate(i, { fromUser: true }));
    });

    // Left/right arrows move between case studies when focus is inside the rail
    rail.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const step = e.key === 'ArrowRight' ? 1 : -1;
      activate((active + step + panels.length) % panels.length, { fromUser: true });
    });

    rail.addEventListener('mouseenter', () => { hovered = true; });
    rail.addEventListener('mouseleave', () => { hovered = false; });
    rail.addEventListener('focusin', () => { focused = true; });
    rail.addEventListener('focusout', (e) => { if (!rail.contains(e.relatedTarget)) focused = false; });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }, { threshold: 0.35 }).observe(rail);
    }

    const tick = (now) => {
      if (last === null) last = now;
      const dt = now - last;
      last = now;
      if (autoplay && inView && !hovered && !focused && !document.hidden && !stacked.matches) {
        elapsed += dt;
        bar(active).style.width = `${Math.min(elapsed / DURATION, 1) * 100}%`;
        if (elapsed >= DURATION) activate((active + 1) % panels.length);
      }
      if (autoplay) requestAnimationFrame(tick);
      else bar(active).style.width = '0';
    };
    if (autoplay) requestAnimationFrame(tick);
  }

  /* ---------- Hero ribbon: twisting, grainy band drawn on canvas ---------- */
  const ribbon = document.getElementById('heroRibbon');
  if (ribbon && ribbon.getContext) {
    const ctx = ribbon.getContext('2d');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const FACE_A = [214, 40, 40];   // brand red
    const FACE_B = [24, 24, 24];    // near-black
    const LIGHT = [252, 236, 236];  // highlight where the ribbon turns edge-on
    const STEP = 4;                 // px per slice (quads keep edges smooth)
    let w = 0, h = 0, t = 0, last = null, running = false, visible = true;

    // Grain: a static noise mask (generated once) punches tiny holes in the
    // ribbon, giving the stippled look. Applied by CSS so it costs nothing per frame.
    const noise = document.createElement('canvas');
    noise.width = noise.height = 160;
    const nctx = noise.getContext('2d');
    const img = nctx.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i + 3] = Math.random() < 0.24 ? Math.random() * 150 : 255;
    }
    nctx.putImageData(img, 0, 0);
    const maskUrl = `url(${noise.toDataURL()})`;
    ribbon.style.webkitMaskImage = maskUrl;
    ribbon.style.maskImage = maskUrl;
    ribbon.style.webkitMaskSize = ribbon.style.maskSize = '160px 160px';

    const mix = (a, b, k) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = ribbon.clientWidth;
      h = ribbon.clientHeight;
      ribbon.width = Math.round(w * dpr);
      ribbon.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    const draw = () => {
      if (!w || !h) return;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);
      const TAU = Math.PI * 2;
      // Sample the ribbon edge at each slice, then fill quads between neighbours
      // so the edges stay smooth even where the curve is steep.
      const at = (x) => {
        const u = x / w;
        const cy = h / 2
          + h * 0.13 * Math.sin(TAU * u * 1.05 - t * 0.45)
          + h * 0.06 * Math.sin(TAU * u * 2.4 + t * 0.3);
        const thickness = h * 0.33 * (0.6 + 0.4 * Math.sin(TAU * u * 0.8 + t * 0.22));
        const twist = Math.sin(TAU * u * 1.55 - t * 0.6);
        const half = Math.abs(thickness * twist);
        return { top: cy - half, bot: cy + half, twist };
      };
      let prev = at(0);
      for (let x = STEP; x <= w + STEP; x += STEP) {
        const cur = at(x);
        const twist = (prev.twist + cur.twist) / 2;
        const face = twist >= 0 ? FACE_A : FACE_B;
        const edgeOn = 1 - Math.abs(twist);
        const top = Math.min(prev.top, cur.top);
        const bot = Math.max(prev.bot, cur.bot, top + 1);
        const base = mix(face, LIGHT, Math.min(edgeOn * edgeOn * 0.9, 0.9));
        const g = ctx.createLinearGradient(0, top, 0, bot);
        g.addColorStop(0, mix(face, LIGHT, Math.min(0.55 + edgeOn * 0.4, 0.95)));
        g.addColorStop(0.45, base);
        g.addColorStop(1, base);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - STEP - 0.4, prev.top);
        ctx.lineTo(x + 0.4, cur.top);
        ctx.lineTo(x + 0.4, cur.bot);
        ctx.lineTo(x - STEP - 0.4, prev.bot);
        ctx.closePath();
        ctx.fill();
        prev = cur;
      }
    };

    const frame = (now) => {
      if (!running) return;
      if (last !== null) t += Math.min((now - last) / 1000, 0.05);
      last = now;
      draw();
      requestAnimationFrame(frame);
    };
    const start = () => {
      if (still || running || !visible || document.hidden) return;
      running = true; last = null;
      requestAnimationFrame(frame);
    };
    const stop = () => { running = false; };

    t = 2; // a pleasing starting pose (also the static frame for reduced motion)
    resize();
    window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start(); else stop();
      }).observe(ribbon);
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    start();
  }

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
