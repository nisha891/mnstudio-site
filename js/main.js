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

  /* ---------- Contact form (front-end only demo) ---------- */
  const form = document.getElementById('contactForm');
  const formNote = document.getElementById('formNote');

  if (form && formNote) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!form.checkValidity()) {
        formNote.textContent = 'Please fill in the required fields before sending.';
        form.reportValidity();
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalLabel = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';

      // Front-end only: no backend is wired up yet. Replace this with a
      // real fetch() call to your form endpoint / API when ready.
      setTimeout(() => {
        formNote.textContent = 'Thanks! Your message has been noted — we’ll be in touch within one business day.';
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
        form.reset();
      }, 700);
    });
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

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
