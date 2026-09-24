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

  /* ---------- Line strands: a twisting bundle of lines (hero + footer) ---------- */
  // opts.mirror flips it left-to-right; opts.dark switches to glowing lines for dark backgrounds.
  const initStrands = (canvas, opts = {}) => {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const LINES = 30;
    const TAU = Math.PI * 2;
    let w = 0, h = 0, t = 3, last = null, running = false, visible = true;
    let grad = null;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      grad = null;
      draw();
    };

    // One ribbon, described in a rotated local frame that runs bottom-left to top-right
    const frameOf = () => {
      const mobile = w < 720;
      const place = (mobile ? opts.mobile : opts.desktop) || {};
      return {
        len: Math.hypot(w, h) * 1.15,
        cx: w * (place.cx ?? 0.66),
        cy: h * (place.cy ?? 0.5),
        angle: place.angle ?? -0.46,
        amp: Math.min(h * (place.amp ?? 0.26), 210),
      };
    };
    const curve = (u, f) => {
      const cy = f.amp * 0.35 * Math.sin(TAU * u * 0.7 - t * 0.22)
        + f.amp * 0.15 * Math.sin(TAU * u * 1.6 + t * 0.17);
      const thickness = f.amp * (0.7 + 0.3 * Math.sin(TAU * u * 0.5 + t * 0.13));
      const twist = Math.sin(TAU * u * 0.95 - t * 0.33);
      return { cy, half: thickness * twist };
    };

    const draw = () => {
      if (!w || !h) return;
      const f = frameOf();
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      if (opts.mirror) { ctx.translate(w, 0); ctx.scale(-1, 1); }
      ctx.translate(f.cx, f.cy);
      ctx.rotate(f.angle);
      if (!grad) {
        grad = ctx.createLinearGradient(-f.len / 2, 0, f.len / 2, 0);
        if (opts.dark) {
          grad.addColorStop(0, 'rgba(214,40,40,0)');
          grad.addColorStop(0.15, 'rgba(214,40,40,.7)');
          grad.addColorStop(0.55, 'rgba(255,92,92,.95)');
          grad.addColorStop(0.8, 'rgba(255,190,190,.9)');
          grad.addColorStop(1, 'rgba(255,120,120,.15)');
        } else {
          grad.addColorStop(0, 'rgba(214,40,40,0)');
          grad.addColorStop(0.15, 'rgba(214,40,40,.55)');
          grad.addColorStop(0.55, 'rgba(214,40,40,.9)');
          grad.addColorStop(0.8, 'rgba(150,20,20,.85)');
          grad.addColorStop(1, 'rgba(214,40,40,.1)');
        }
      }
      // Light backgrounds: multiply deepens overlaps. Dark backgrounds: lighter makes them glow.
      ctx.globalCompositeOperation = opts.dark ? 'lighter' : 'multiply';
      ctx.lineWidth = 1;
      ctx.strokeStyle = grad;
      const STEP = 10;
      const n = Math.ceil(f.len / STEP);
      // Sample the ribbon once, then offset each strand across its width
      const pts = new Array(n + 1);
      for (let i = 0; i <= n; i++) pts[i] = curve(i / n, f);
      const baseAlpha = opts.dark ? 0.26 : 0.22;
      for (let k = 0; k < LINES; k++) {
        const sOff = (k / (LINES - 1)) * 2 - 1; // -1 .. 1 across the ribbon
        ctx.globalAlpha = baseAlpha + 0.5 * (1 - Math.abs(sOff));
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const x = -f.len / 2 + i * STEP;
          const y = pts[i].cy + sOff * pts[i].half;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // Two particles (glowing dots) travelling along individual strands
      const dot = opts.dark ? '255,255,255' : '10,10,10';
      const halo = opts.dark ? '255,120,120' : '214,40,40';
      ctx.globalCompositeOperation = 'source-over';
      [[7, 0], [21, 0.5]].forEach(([k, phase]) => {
        const sOff = (k / (LINES - 1)) * 2 - 1;
        const pos = ((t * 0.06 + phase) % 1) * 0.8 + 0.18; // 0..1 along the strand
        const fi = pos * n;
        const i = Math.min(n - 1, Math.floor(fi));
        const frac = fi - i;
        const yA = pts[i].cy + sOff * pts[i].half;
        const yB = pts[i + 1].cy + sOff * pts[i + 1].half;
        const x = -f.len / 2 + fi * STEP;
        const y = yA + (yB - yA) * frac;
        ctx.globalAlpha = 1;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 12);
        g.addColorStop(0, `rgba(${halo},.45)`);
        g.addColorStop(1, `rgba(${halo},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 12, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(${dot},.95)`;
        ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill();
      });
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
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

    resize();
    window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start(); else stop();
      }).observe(canvas);
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    start();
  };

  initStrands(document.getElementById('heroStrands'), {
    desktop: { cx: 0.66, cy: 0.5, angle: -0.46, amp: 0.26 },
    mobile: { cx: 0.55, cy: 0.97, angle: -0.3, amp: 0.26 },
  });
  // Footer: the same bundle, mirrored so it sweeps in from the opposite side
  initStrands(document.getElementById('footerStrands'), {
    mirror: true,
    dark: true,
    desktop: { cx: 0.5, cy: 0.86, angle: -0.16, amp: 0.14 },
    mobile: { cx: 0.5, cy: 0.93, angle: -0.3, amp: 0.1 },
  });

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
