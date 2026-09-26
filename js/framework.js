(() => {
  'use strict';
  // Highlight a vertex of the triangle when its definition is hovered, focused or tapped
  const diagram = document.getElementById('fwDiagram');
  const defs = Array.from(document.querySelectorAll('.fw-def'));
  if (diagram && defs.length) {
    const nodes = Array.from(diagram.querySelectorAll('.fw-node'));
    let locked = null;
    const show = (debt) => {
      diagram.classList.toggle('is-focus', !!debt);
      nodes.forEach((n) => n.classList.toggle('is-on', n.dataset.debt === debt));
      defs.forEach((d) => d.classList.toggle('is-on', d.dataset.debt === debt));
    };
    defs.forEach((d) => {
      d.setAttribute('aria-pressed', 'false');
      d.addEventListener('mouseenter', () => show(d.dataset.debt));
      d.addEventListener('mouseleave', () => show(locked));
      d.addEventListener('focus', () => show(d.dataset.debt));
      d.addEventListener('blur', () => show(locked));
      d.addEventListener('click', () => {
        locked = locked === d.dataset.debt ? null : d.dataset.debt;
        defs.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.debt === locked)));
        show(locked);
      });
    });
  }
  // Respect reduced motion for the SVG dot animations
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.fw-page svg').forEach((svg) => svg.pauseAnimations && svg.pauseAnimations());
  }
})();
