/* =========================================================
   MN Studio — Design Debt Engine

   Turns a product source (live URL, demo video, or Figma
   file) plus declared team context into a Design Debt Index,
   a findings ledger, debt economics, and a phased
   refactoring strategy.

   HOW THE MODEL WORKS
   -------------------
   Two classes of signal feed every score:

     • DECLARED  — facts the user gives us (surface count,
                   design-system maturity, team shape,
                   accessibility target, release cadence).
                   These drive the deterministic base scores
                   and are marked `measured: true`.

     • OBSERVED  — signals a real crawler/vision pass would
                   collect from the artefact (token sprawl,
                   contrast failures, detached instances).
                   In this prototype they are synthesised
                   from a seeded PRNG keyed to the source, so
                   the same input always produces the same
                   report. Marked `measured: false` and
                   surfaced as "simulated" in the UI.

   Swap `observe()` for a real analyzer and the rest of the
   engine — scoring, economics, roadmap — works unchanged.
   ========================================================= */
(() => {
  'use strict';

  const MN = window.MN = window.MN || {};
  const { clamp, round, rng, hash } = MN;

  /* -------------------------------------------------------
     Dimensions — weights sum to 1.00
     ------------------------------------------------------- */
  const DIMENSIONS = [
    {
      key: 'consistency', weight: 0.16, name: 'Visual consistency',
      blurb: 'Colour, type, spacing and elevation applied from one source of truth.'
    },
    {
      key: 'system', weight: 0.16, name: 'Component system health',
      blurb: 'Reuse versus one-off components, variant coverage, and API coherence.'
    },
    {
      key: 'a11y', weight: 0.14, name: 'Accessibility',
      blurb: 'Contrast, focus order, target size, semantics and assistive-tech support.'
    },
    {
      key: 'flow', weight: 0.13, name: 'Interaction & flow',
      blurb: 'Step count, dead ends, error recovery, empty and loading states.'
    },
    {
      key: 'ia', weight: 0.11, name: 'IA & content',
      blurb: 'Navigation depth, labelling, hierarchy and microcopy consistency.'
    },
    {
      key: 'responsive', weight: 0.10, name: 'Responsive & platform fit',
      blurb: 'Breakpoint integrity and native conventions per platform.'
    },
    {
      key: 'perf', weight: 0.10, name: 'Perceived performance',
      blurb: 'Layout shift, skeletons, optimistic UI and interaction latency.'
    },
    {
      key: 'drift', weight: 0.10, name: 'Design–code drift',
      blurb: 'How far shipped UI has diverged from the design source and its docs.'
    }
  ];

  /* -------------------------------------------------------
     Context normalisation
     ------------------------------------------------------- */
  const STAGE_PRESSURE = { 'pre-seed': 22, seed: 16, 'series-a': 10, growth: 4, scale: 0 };
  const SYSTEM_DEBT = { none: 70, partial: 44, mature: 20 };
  const A11Y_DEBT = { none: 66, aa: 36, aaa: 20 };
  const CADENCE_PRESSURE = { monthly: 2, biweekly: 6, weekly: 11, daily: 17 };
  const PEER_MEDIAN = { 'pre-seed': 58, seed: 54, 'series-a': 47, growth: 41, scale: 34 };

  const normalise = (ctx) => ({
    stage: ctx.stage || 'seed',
    surfaces: clamp(Number(ctx.surfaces) || 20, 1, 400),
    designers: clamp(Number(ctx.designers) || 1, 0, 60),
    engineers: clamp(Number(ctx.engineers) || 4, 1, 400),
    system: ctx.system || 'partial',
    platforms: (ctx.platforms && ctx.platforms.length) ? ctx.platforms : ['web'],
    cadence: ctx.cadence || 'biweekly',
    a11yTarget: ctx.a11yTarget || 'none',
    rate: clamp(Number(ctx.rate) || 620, 100, 5000),
    age: clamp(Number(ctx.age) || 2, 0, 30),
    hasStorybook: !!ctx.hasStorybook,
    hasTokens: !!ctx.hasTokens,
    notes: ctx.notes || ''
  });

  /* -------------------------------------------------------
     OBSERVED signals — replace with a real analyzer
     ------------------------------------------------------- */
  const observe = (source, c, r) => {
    const scale = Math.sqrt(c.surfaces);
    const looseness = c.system === 'none' ? 1.5 : c.system === 'partial' ? 1 : 0.55;

    return {
      hexValues: Math.round((9 + scale * 4.2 * looseness) * (0.8 + r() * 0.5)),
      tokenHexes: c.hasTokens ? Math.round(8 + r() * 6) : 0,
      textStyles: Math.round((5 + scale * 2.1 * looseness) * (0.8 + r() * 0.5)),
      spacingValues: Math.round((6 + scale * 2.6 * looseness) * (0.8 + r() * 0.45)),
      shadowStyles: Math.round(2 + scale * 0.9 * looseness * (0.7 + r() * 0.7)),
      components: Math.round(18 + c.surfaces * (1.5 + r())),
      oneOffs: 0, // filled below
      variantGaps: Math.round(3 + r() * 9 * looseness),
      contrastFails: Math.round((c.a11yTarget === 'none' ? 9 : 3) * scale * 0.55 * (0.6 + r())),
      smallTargets: Math.round((c.a11yTarget === 'none' ? 7 : 2) * scale * 0.4 * (0.6 + r())),
      unlabelled: Math.round((c.a11yTarget === 'none' ? 11 : 3) * scale * 0.4 * (0.6 + r())),
      focusTraps: Math.round(r() * (c.a11yTarget === 'none' ? 4 : 1.4)),
      deadEnds: Math.round(r() * scale * 0.75),
      missingEmpty: Math.round(scale * (0.8 + r() * 0.9)),
      missingError: Math.round(scale * (0.6 + r() * 0.8)),
      longestFlow: Math.round(4 + r() * 7),
      navDepth: Math.round(2 + r() * 3),
      labelClashes: Math.round(2 + scale * 0.8 * (0.5 + r())),
      breakpointBreaks: Math.round(scale * 0.7 * (0.4 + r()) * c.platforms.length),
      cls: round(0.03 + r() * 0.24, 3),
      lcp: round(1.3 + r() * 3.1, 2),
      noSkeleton: Math.round(scale * (0.5 + r())),
      driftedScreens: Math.round(c.surfaces * (c.system === 'mature' ? 0.12 : c.system === 'partial' ? 0.28 : 0.46) * (0.7 + r() * 0.6)),
      storyCoverage: c.hasStorybook ? Math.round(45 + r() * 45) : Math.round(r() * 18),
      staleSpecs: Math.round(3 + r() * 14)
    };
  };

  /* -------------------------------------------------------
     Dimension scoring — 0 healthy … 100 crushing debt
     ------------------------------------------------------- */
  const scoreDimensions = (c, o, r) => {
    const stage = STAGE_PRESSURE[c.stage] ?? 12;
    const cadence = CADENCE_PRESSURE[c.cadence] ?? 6;
    const scale = Math.sqrt(c.surfaces) / 4;              // 20 screens ≈ 1.1
    const designRatio = c.designers / Math.max(1, c.engineers); // <0.12 is thin cover
    const thinCover = clamp((0.18 - designRatio) * 90, 0, 18);
    const jitter = () => (r() - 0.5) * 8;

    const raw = {
      consistency:
        (SYSTEM_DEBT[c.system] ?? 44) * 0.62 +
        (c.hasTokens ? -9 : 9) +
        scale * 7 + thinCover * 0.5 + stage * 0.35 + jitter(),

      system:
        (SYSTEM_DEBT[c.system] ?? 44) * 0.8 +
        scale * 6 + thinCover * 0.7 + cadence * 0.4 + jitter(),

      a11y:
        (A11Y_DEBT[c.a11yTarget] ?? 66) * 0.86 +
        scale * 5 + stage * 0.3 + jitter(),

      flow:
        24 + stage * 0.9 + scale * 8 + thinCover * 0.8 + jitter(),

      ia:
        20 + scale * 11 + stage * 0.5 + (c.age > 3 ? 9 : 0) + jitter(),

      responsive:
        16 + (c.platforms.length - 1) * 13 + scale * 8 + thinCover * 0.4 + jitter(),

      perf:
        18 + cadence * 0.9 + scale * 7 + stage * 0.4 + jitter(),

      drift:
        (c.hasStorybook ? 20 : 46) +
        (SYSTEM_DEBT[c.system] ?? 44) * 0.28 +
        cadence * 0.8 + scale * 5 + thinCover * 0.6 + jitter()
    };

    return DIMENSIONS.map((d) => ({
      ...d,
      score: round(clamp(raw[d.key], 3, 97), 1)
    }));
  };

  /* -------------------------------------------------------
     Findings catalogue
       gate  — minimum dimension score for this to fire
       imp   — business impact 0-100
       eff   — remediation effort in person-days
     ------------------------------------------------------- */
  const CATALOG = [
    /* --- consistency --- */
    {
      dim: 'consistency', gate: 30, imp: 74, eff: 6, owner: 'Design systems',
      title: 'Colour is applied ad hoc rather than from tokens',
      why: 'Every new hex value is a decision the next person has to re-make, and a value no theme switch or rebrand can reach. It is the single largest multiplier on every other consistency problem.',
      ev: (o, c) => [
        { label: 'Distinct colour values in shipped UI', value: o.hexValues, measured: false },
        { label: 'Values defined as tokens', value: o.tokenHexes || 'none', measured: true },
        { label: 'Untokenised share', value: MN.fmt.pct(100 - (o.tokenHexes / o.hexValues) * 100), measured: false }
      ],
      fixes: [
        'Extract the live palette, cluster near-duplicates within ΔE < 3, and collapse to a ramp of 9 neutrals plus 4 semantic families.',
        'Publish as CSS custom properties and Figma variables from one source file so both sides consume the same names.',
        'Add a lint rule that fails CI on raw hex values outside the token file.'
      ]
    },
    {
      dim: 'consistency', gate: 34, imp: 62, eff: 5, owner: 'Design systems',
      title: 'Type scale has drifted into arbitrary sizes',
      why: 'An unbounded type scale makes hierarchy unreadable and forces per-screen judgement calls that no two people make the same way.',
      ev: (o) => [
        { label: 'Distinct font-size / line-height pairs', value: o.textStyles, measured: false },
        { label: 'Sizes a modular scale would need', value: 7, measured: true },
        { label: 'Redundant styles', value: Math.max(0, o.textStyles - 7), measured: false }
      ],
      fixes: [
        'Define a 7-step modular scale (1.25 ratio) with paired line-heights and semantic names — display, title, body, caption.',
        'Map every existing style to its nearest scale step; ship the mapping table as the migration checklist.',
        'Delete the orphan styles from Figma so they cannot be re-picked.'
      ]
    },
    {
      dim: 'consistency', gate: 42, imp: 55, eff: 4, owner: 'Design systems',
      title: 'Spacing is eyeballed, not gridded',
      why: 'Off-grid spacing reads as "slightly broken" without anyone being able to say why, and makes every layout unmergeable with a systematised one later.',
      ev: (o) => [
        { label: 'Distinct spacing values', value: o.spacingValues, measured: false },
        { label: 'On a 4pt grid', value: MN.fmt.pct(Math.max(24, 100 - o.spacingValues * 2.4)), measured: false }
      ],
      fixes: [
        'Adopt a 4pt base grid with a 6-step spacing scale and name the steps by intent, not size.',
        'Auto-snap existing values to the nearest step; hand-review only the deltas above 4px.'
      ]
    },
    {
      dim: 'consistency', gate: 52, imp: 44, eff: 3, owner: 'Design systems',
      title: 'Elevation and radius have no shared language',
      why: 'Inconsistent depth cues break the visual hierarchy that tells users what is interactive, floating or fixed.',
      ev: (o) => [
        { label: 'Distinct shadow definitions', value: o.shadowStyles, measured: false },
        { label: 'Elevation levels a system needs', value: 4, measured: true }
      ],
      fixes: [
        'Reduce to 4 elevation levels tied to z-index bands, plus 3 radius steps.',
        'Express both as tokens and forbid inline shadow values in review.'
      ]
    },

    /* --- system --- */
    {
      dim: 'system', gate: 28, imp: 82, eff: 14, owner: 'Design systems',
      title: 'One-off components outnumber systematised ones',
      why: 'This is the compounding core of design debt: every bespoke component is a future bug surface, a fresh accessibility risk, and a change that has to be made N times instead of once.',
      ev: (o, c) => {
        const oneOff = Math.round(o.components * (c.system === 'none' ? 0.62 : c.system === 'partial' ? 0.38 : 0.16));
        return [
          { label: 'Total components in product', value: o.components, measured: false },
          { label: 'Bespoke / one-off', value: oneOff, measured: false },
          { label: 'Reuse rate', value: MN.fmt.pct(100 - (oneOff / o.components) * 100), measured: false },
          { label: 'Healthy reuse rate', value: '78%+', measured: true }
        ];
      },
      fixes: [
        'Run a component census, cluster by visual and behavioural similarity, and pick one canonical implementation per cluster.',
        'Rebuild the canonical set with a variant API rather than forking — props for state, size and emphasis.',
        'Codemod call sites in waves, most-used component first, so each wave retires real duplicates.'
      ]
    },
    {
      dim: 'system', gate: 36, imp: 66, eff: 8, owner: 'Design systems',
      title: 'Components lack the states they are used in',
      why: 'Missing loading, disabled, error and empty variants get improvised at the call site, which is how one component becomes eleven.',
      ev: (o) => [
        { label: 'Components missing required variants', value: o.variantGaps, measured: false },
        { label: 'Most common gap', value: 'loading / disabled', measured: false }
      ],
      fixes: [
        'Define a mandatory state matrix — default, hover, focus, active, disabled, loading, error — for every interactive component.',
        'Block new components in review until every cell in the matrix is either implemented or explicitly marked N/A.'
      ]
    },
    {
      dim: 'system', gate: 55, imp: 58, eff: 7, owner: 'Design systems',
      title: 'No component ownership or deprecation path',
      why: 'Without an owner and a deprecation route, the system accumulates instead of evolving — old and new patterns ship side by side indefinitely.',
      ev: () => [
        { label: 'Documented component owners', value: 'none found', measured: false },
        { label: 'Deprecation policy', value: 'absent', measured: false }
      ],
      fixes: [
        'Assign an owner per component family and publish a two-release deprecation policy.',
        'Emit console deprecation warnings and track remaining call sites as a burn-down.'
      ]
    },

    /* --- a11y --- */
    {
      dim: 'a11y', gate: 25, imp: 88, eff: 5, owner: 'Design + Front-end',
      title: 'Text and UI fail WCAG AA contrast',
      why: 'Contrast failures exclude users outright, and in most jurisdictions carry direct legal exposure. They are also among the cheapest defects to fix at the token layer.',
      ev: (o) => [
        { label: 'Elements below 4.5:1', value: o.contrastFails, measured: false },
        { label: 'Worst measured ratio', value: '2.1:1', measured: false },
        { label: 'Required (AA body text)', value: '4.5:1', measured: true }
      ],
      fixes: [
        'Re-derive the neutral ramp so each step is contrast-safe against its intended background, then re-map usages.',
        'Add an automated contrast check to CI against the token pairings, not against rendered screenshots.',
        'Fix the accent-on-accent pairings first — they carry the primary actions.'
      ]
    },
    {
      dim: 'a11y', gate: 30, imp: 79, eff: 4, owner: 'Front-end',
      title: 'Interactive elements are unlabelled for assistive tech',
      why: 'Icon-only buttons and unlabelled inputs make core flows unusable with a screen reader, and silently break voice control for everyone.',
      ev: (o) => [
        { label: 'Controls with no accessible name', value: o.unlabelled, measured: false },
        { label: 'Most affected', value: 'icon buttons, form inputs', measured: false }
      ],
      fixes: [
        'Add accessible names at the component level so every call site inherits them.',
        'Make the name a required prop on icon-only components — a type error, not a lint warning.'
      ]
    },
    {
      dim: 'a11y', gate: 40, imp: 68, eff: 3, owner: 'Design + Front-end',
      title: 'Touch targets fall below the 44px minimum',
      why: 'Under-sized targets raise mis-tap rates sharply on mobile, which shows up as funnel drop-off rather than as a bug report.',
      ev: (o) => [{ label: 'Targets under 44×44', value: o.smallTargets, measured: false }],
      fixes: [
        'Give every interactive component a minimum hit area independent of its visual size.',
        'Keep the visual density — expand the tappable box, not the paint.'
      ]
    },
    {
      dim: 'a11y', gate: 48, imp: 71, eff: 4, owner: 'Front-end',
      title: 'Focus order and focus visibility are broken',
      why: 'Keyboard users cannot complete flows they cannot see themselves moving through, and modal focus traps strand them entirely.',
      ev: (o) => [
        { label: 'Focus traps detected', value: o.focusTraps, measured: false },
        { label: 'Visible focus ring', value: 'suppressed globally', measured: false }
      ],
      fixes: [
        'Restore a token-driven :focus-visible ring across all interactive components.',
        'Implement proper focus containment and restoration in overlays.'
      ]
    },

    /* --- flow --- */
    {
      dim: 'flow', gate: 30, imp: 76, eff: 6, owner: 'Product design',
      title: 'Core flows carry avoidable steps',
      why: 'Every additional step in a conversion flow costs measurable completion. Steps added for internal convenience are the most expensive kind.',
      ev: (o) => [
        { label: 'Steps in longest core flow', value: o.longestFlow, measured: false },
        { label: 'Steps genuinely required', value: Math.max(2, o.longestFlow - 3), measured: false }
      ],
      fixes: [
        'Map the flow against the decisions the user actually has to make; defer or infer everything else.',
        'Collapse sequential single-field screens into one grouped step with progressive disclosure.',
        'Instrument per-step drop-off before and after so the change is defensible.'
      ]
    },
    {
      dim: 'flow', gate: 34, imp: 64, eff: 5, owner: 'Product design',
      title: 'Empty and error states are undesigned',
      why: 'Empty states are the first thing a new user sees and the strongest onboarding surface in the product. Undesigned, they read as breakage.',
      ev: (o) => [
        { label: 'Views with no empty state', value: o.missingEmpty, measured: false },
        { label: 'Views with no error state', value: o.missingError, measured: false }
      ],
      fixes: [
        'Design a three-part empty-state pattern — what this is, why it is empty, the one action that fills it.',
        'Define an error taxonomy (recoverable, retryable, terminal) and one component per class.'
      ]
    },
    {
      dim: 'flow', gate: 48, imp: 70, eff: 4, owner: 'Product design',
      title: 'Flows dead-end with no recovery path',
      why: 'A dead end converts a recoverable moment into an abandoned session and a support ticket.',
      ev: (o) => [{ label: 'Dead-end screens found', value: o.deadEnds, measured: false }],
      fixes: [
        'Guarantee every terminal screen offers a next action, a way back, and a way to get help.',
        'Add a global error boundary with a route home rather than a blank frame.'
      ]
    },

    /* --- ia --- */
    {
      dim: 'ia', gate: 30, imp: 60, eff: 6, owner: 'Product design',
      title: 'Navigation is deeper than the mental model',
      why: 'Depth beyond three levels reliably hides features from the people paying for them, and inflates support load for functionality that already exists.',
      ev: (o) => [
        { label: 'Maximum navigation depth', value: o.navDepth + ' levels', measured: false },
        { label: 'Recommended maximum', value: '3 levels', measured: true }
      ],
      fixes: [
        'Run a tree test against the current IA to find where the model and the menu disagree.',
        'Flatten to a maximum of three levels and promote high-frequency destinations.'
      ]
    },
    {
      dim: 'ia', gate: 38, imp: 52, eff: 4, owner: 'Content design',
      title: 'The same concept is named several different things',
      why: 'Terminology drift between UI, docs and support is a hidden tax on every conversation a user or a colleague has about the product.',
      ev: (o) => [
        { label: 'Concepts with competing labels', value: o.labelClashes, measured: false },
        { label: 'Example', value: 'workspace / project / board', measured: false }
      ],
      fixes: [
        'Build a product lexicon with one approved term per concept and its banned synonyms.',
        'Wire the lexicon into the writing review and into component prop names.'
      ]
    },

    /* --- responsive --- */
    {
      dim: 'responsive', gate: 30, imp: 63, eff: 6, owner: 'Front-end',
      title: 'Layouts break between the designed breakpoints',
      why: 'Designing to three fixed widths leaves the ranges between them undefined — which is where most real devices sit.',
      ev: (o) => [
        { label: 'Views breaking off-breakpoint', value: o.breakpointBreaks, measured: false },
        { label: 'Worst range', value: '820–1040px', measured: false }
      ],
      fixes: [
        'Move from fixed breakpoints to intrinsic layouts — clamp(), grid auto-fit and container queries.',
        'Test the ranges, not the three canonical widths.'
      ]
    },
    {
      dim: 'responsive', gate: 46, imp: 56, eff: 8, owner: 'Product design',
      title: 'Native platform conventions are overridden by web patterns',
      why: 'Users judge a native app against its platform, not against your web app. Convention breaks read as low quality even when the design is objectively fine.',
      ev: (o, c) => [
        { label: 'Platforms shipped', value: c.platforms.join(', '), measured: true },
        { label: 'Convention breaks', value: Math.round(o.breakpointBreaks * 0.6), measured: false }
      ],
      fixes: [
        'Define which patterns are shared and which are deliberately per-platform, then document the split.',
        'Adopt platform-native navigation, sheets and system typography before customising anything.'
      ]
    },

    /* --- perf --- */
    {
      dim: 'perf', gate: 30, imp: 67, eff: 5, owner: 'Front-end',
      title: 'Layout shift makes the interface feel unstable',
      why: 'Cumulative layout shift is perceived as unreliability rather than slowness, and it directly causes mis-taps on the elements that move.',
      ev: (o) => [
        { label: 'Cumulative Layout Shift', value: o.cls, measured: false },
        { label: 'Good threshold', value: '< 0.1', measured: true }
      ],
      fixes: [
        'Reserve space for images, embeds and async content with explicit aspect ratios.',
        'Replace late-injected banners with slots that exist in the first paint.'
      ]
    },
    {
      dim: 'perf', gate: 38, imp: 61, eff: 5, owner: 'Front-end',
      title: 'Waiting states are blank rather than structural',
      why: 'A spinner tells the user nothing is happening; a skeleton tells them what is about to arrive. Perceived speed moves without the backend changing at all.',
      ev: (o) => [
        { label: 'Largest Contentful Paint', value: o.lcp + 's', measured: false },
        { label: 'Views with no skeleton', value: o.noSkeleton, measured: false }
      ],
      fixes: [
        'Ship skeletons shaped like the eventual content for every view above 400ms.',
        'Apply optimistic UI to the actions users repeat most.'
      ]
    },

    /* --- drift --- */
    {
      dim: 'drift', gate: 26, imp: 77, eff: 9, owner: 'Design + Front-end',
      title: 'Shipped UI has diverged from the design source',
      why: 'Once the design file stops describing the product, every future decision is made against a fiction — and design review stops catching anything real.',
      ev: (o, c) => [
        { label: 'Screens that differ from source', value: o.driftedScreens, measured: false },
        { label: 'Share of product', value: MN.fmt.pct((o.driftedScreens / c.surfaces) * 100), measured: false }
      ],
      fixes: [
        'Reconcile in one direction only: shipped code becomes the truth, and the design file is rebuilt from it.',
        'Introduce visual regression tests so the reconciled state cannot silently drift again.',
        'Publish components to Storybook as the shared reference both sides review against.'
      ]
    },
    {
      dim: 'drift', gate: 34, imp: 64, eff: 7, owner: 'Front-end',
      title: 'Components ship without stories or documentation',
      why: 'Undocumented components get rebuilt by the next engineer who cannot find them, which is how the one-off count grows even after a system exists.',
      ev: (o) => [
        { label: 'Storybook coverage', value: MN.fmt.pct(o.storyCoverage), measured: true },
        { label: 'Healthy coverage', value: '85%+', measured: true }
      ],
      fixes: [
        'Require a story per variant as a merge condition for anything in the component directory.',
        'Auto-publish Storybook per branch so review happens against the real component.'
      ]
    },
    {
      dim: 'drift', gate: 50, imp: 49, eff: 4, owner: 'Product design',
      title: 'Specs describe features that no longer exist',
      why: 'Stale specs cost more than no specs — they send engineers confidently in the wrong direction.',
      ev: (o) => [{ label: 'Specs stale > 90 days', value: o.staleSpecs, measured: false }],
      fixes: [
        'Archive anything untouched for a quarter and mark the survivors with a review date.',
        'Move durable decisions into the component docs and let the specs stay disposable.'
      ]
    }
  ];

  /* -------------------------------------------------------
     Severity from impact + how bad the dimension is
     ------------------------------------------------------- */
  const severityOf = (imp, dimScore) => {
    const s = imp * 0.62 + dimScore * 0.38;
    if (s >= 74) return 'critical';
    if (s >= 60) return 'high';
    if (s >= 45) return 'medium';
    return 'low';
  };

  /* -------------------------------------------------------
     Economics
     ------------------------------------------------------- */
  const economics = (index, findings, c) => {
    const principalDays = round(findings.reduce((sum, f) => sum + f.effort, 0), 1);
    const principalCost = principalDays * c.rate;

    // Velocity drag: the share of delivery capacity lost to working
    // around the debt. Non-linear — debt compounds past the midpoint.
    const velocityDrag = round(clamp(Math.pow(index / 100, 1.45) * 52, 0, 44), 1);

    const teamSize = c.designers + c.engineers;
    const sprintDays = teamSize * 10;
    const interestPerSprint = round((velocityDrag / 100) * sprintDays * c.rate);
    const annualInterest = interestPerSprint * 26;

    const reworkRate = round(clamp(index * 0.34, 4, 38), 1);
    const paybackSprints = interestPerSprint > 0 ? round(principalCost / interestPerSprint, 1) : 0;
    const yearOneRoi = principalCost > 0 ? round(((annualInterest - principalCost) / principalCost) * 100) : 0;

    return {
      principalDays, principalCost, velocityDrag, interestPerSprint,
      annualInterest, reworkRate, paybackSprints, yearOneRoi,
      teamSize, sprintDays, rate: c.rate
    };
  };

  /* -------------------------------------------------------
     Refactoring strategy — three waves
     ------------------------------------------------------- */
  const buildRoadmap = (findings, index, c) => {
    const value = (f) => f.impact / Math.max(1, f.effort);

    // Every finding lands in exactly one wave — nothing is dropped.
    const waveFor = (f) => {
      if (f.severity === 'critical') return 1;
      if (f.impact >= 55 && f.effort <= 6) return 1;          // quick win
      if (['consistency', 'system', 'a11y'].includes(f.dimension)) return 2;
      return 3;
    };

    const buckets = { 1: [], 2: [], 3: [] };
    findings.forEach((f) => buckets[waveFor(f)].push(f));
    Object.values(buckets).forEach((b) => b.sort((a, z) => value(z) - value(a)));

    // Wave 1 has to stay shippable inside a quarter. Overflow slides
    // down a wave rather than disappearing from the plan.
    while (buckets[1].length > 8) buckets[2].unshift(buckets[1].pop());
    while (buckets[2].length > 9) buckets[3].unshift(buckets[2].pop());

    // A remediation squad, not the whole team — 35% of people, capped at 6.
    const squad = Math.max(1, Math.min(6, round((c.designers + c.engineers) * 0.35, 1)));

    const META = [
      {
        name: 'Wave 1 — Stabilise',
        goal: 'Stop the bleeding. Ship the fixes that remove user-visible harm and legal exposure, and buy back the capacity needed to do the rest.',
        outcome: 'Accessibility exposure closed, dead ends removed, and the most expensive inconsistencies pulled into tokens.'
      },
      {
        name: 'Wave 2 — Systematise',
        goal: 'Build the single source of truth: tokens, a consolidated component set, and the review gates that keep both honest.',
        outcome: 'One canonical component per pattern, a contrast-safe token ramp, and a mandatory state matrix in review.'
      },
      {
        name: 'Wave 3 — Scale',
        goal: 'Make the improvement permanent. Close the design–code loop so drift is caught by machines rather than by memory.',
        outcome: 'Storybook as the shared reference, visual regression in CI, and a deprecation path that actually retires code.'
      }
    ];

    const waves = [1, 2, 3].map((n) => {
      const items = buckets[n];
      const days = round(items.reduce((s, f) => s + f.effort, 0), 1);
      return {
        ...META[n - 1],
        items,
        days,
        squad,
        weeks: Math.max(1, Math.ceil(days / squad / 5)),
        reduction: 0,
        indexAfter: index
      };
    }).filter((w) => w.items.length);

    // Project the index down as each wave lands, weighted by the
    // impact it removes. 0.82 leaves headroom for debt taken on while
    // the remediation itself is in flight.
    const totalImpact = findings.reduce((s, f) => s + f.impact, 0) || 1;
    let running = index;
    waves.forEach((w) => {
      const share = w.items.reduce((s, f) => s + f.impact, 0) / totalImpact;
      w.reduction = round(index * share * 0.82, 1);
      running = round(clamp(running - w.reduction, 5, 100), 1);
      w.indexAfter = running;
    });

    const quickWins = findings
      .filter((f) => f.impact >= 55 && f.effort <= 6)
      .sort((a, z) => value(z) - value(a));

    return { waves, quickWins, projectedIndex: running };
  };

  /* -------------------------------------------------------
     Scan choreography (per source kind)
     ------------------------------------------------------- */
  const SCAN_STEPS = {
    url: [
      'Resolving target and crawling reachable routes',
      'Capturing rendered DOM, computed styles and screenshots',
      'Extracting colour, type, spacing and elevation values',
      'Clustering components by visual and structural similarity',
      'Running accessibility checks — contrast, names, focus, targets',
      'Replaying core flows and probing empty / error states',
      'Measuring layout stability and paint timings',
      'Scoring dimensions and composing the refactor strategy'
    ],
    video: [
      'Decoding upload and sampling keyframes at scene boundaries',
      'Detecting screens, transitions and repeated regions',
      'Reading on-screen text and inferring the interaction graph',
      'Sampling palette, type and spacing from rendered frames',
      'Estimating contrast and target sizes from pixel geometry',
      'Reconstructing the demoed flow and its branch points',
      'Timing interaction latency between input and response',
      'Scoring dimensions and composing the refactor strategy'
    ],
    figma: [
      'Reading file tree — pages, frames, components and variants',
      'Indexing local styles, variables and published library links',
      'Detecting detached instances and overridden components',
      'Clustering near-duplicate components across pages',
      'Checking contrast and target sizes on rendered frames',
      'Auditing auto-layout, constraints and naming conventions',
      'Comparing library usage against the shipped front-end',
      'Scoring dimensions and composing the refactor strategy'
    ]
  };

  /* -------------------------------------------------------
     Public API
     ------------------------------------------------------- */
  const analyze = (input) => {
    const c = normalise(input.context || {});
    const seed = hash(`${input.kind}|${input.source}|${c.surfaces}|${c.system}|${c.a11yTarget}|${c.stage}`);
    const r = rng(seed);
    const o = observe(input.source, c, r);

    const dims = scoreDimensions(c, o, r);
    const dimMap = Object.fromEntries(dims.map((d) => [d.key, d]));

    // Composite Design Debt Index — weighted dimension scores.
    const index = round(dims.reduce((s, d) => s + d.score * d.weight, 0), 1);

    // Fire the findings whose dimension is bad enough to warrant them.
    const findings = CATALOG
      .filter((f) => dimMap[f.dim].score >= f.gate)
      .map((f, i) => {
        const dimScore = dimMap[f.dim].score;
        const wobble = (r() - 0.5) * 10;
        const impact = round(clamp(f.imp * 0.72 + dimScore * 0.28 + wobble, 8, 99));
        const effort = round(clamp(f.eff * (0.72 + (dimScore / 100) * 0.8), 1, 40), 1);
        return {
          id: `F-${String(i + 1).padStart(2, '0')}`,
          dimension: f.dim,
          dimensionName: dimMap[f.dim].name,
          title: f.title,
          why: f.why,
          owner: f.owner,
          severity: severityOf(impact, dimScore),
          impact,
          effort,
          confidence: round(clamp(62 + r() * 34, 40, 97)),
          evidence: f.ev(o, c),
          fixes: f.fixes
        };
      })
      .sort((a, b) => b.impact - a.impact || a.effort - b.effort);

    // Attach finding counts back onto their dimensions.
    dims.forEach((d) => {
      d.findings = findings.filter((f) => f.dimension === d.key).length;
      d.band = MN.band(d.score);
    });

    const econ = economics(index, findings, c);
    const roadmap = buildRoadmap(findings, index, c);
    const band = MN.band(index);

    // Confidence in the whole report: a live URL gives us more than a video.
    const baseConfidence = { url: 84, figma: 91, video: 68 }[input.kind] || 75;
    const confidence = round(clamp(baseConfidence - (c.surfaces > 60 ? 6 : 0) + (c.hasStorybook ? 4 : 0), 40, 97));

    return {
      id: uidReport(seed),
      kind: input.kind,
      source: input.source,
      label: input.label || input.source,
      generatedAt: Date.now(),
      context: c,
      observed: o,
      index,
      band,
      confidence,
      dimensions: dims,
      findings,
      economics: econ,
      roadmap: roadmap.waves,
      quickWins: roadmap.quickWins,
      projectedIndex: roadmap.projectedIndex,
      benchmark: {
        you: index,
        peerMedian: PEER_MEDIAN[c.stage] ?? 48,
        topQuartile: round((PEER_MEDIAN[c.stage] ?? 48) * 0.58, 1)
      },
      scanSteps: SCAN_STEPS[input.kind] || SCAN_STEPS.url
    };
  };

  const uidReport = (seed) => 'DDR-' + (seed % 100000).toString().padStart(5, '0');

  /* -------------------------------------------------------
     Exports: markdown report, and tickets for the pipeline
     ------------------------------------------------------- */
  const toMarkdown = (rep) => {
    const L = [];
    L.push(`# Design debt report — ${rep.label}`);
    L.push('');
    L.push(`**Report** ${rep.id}  ·  **Generated** ${new Date(rep.generatedAt).toISOString().slice(0, 10)}  ·  **Confidence** ${rep.confidence}%`);
    L.push('');
    L.push(`## Design Debt Index: ${rep.index} / 100 — ${rep.band.label} (grade ${rep.band.grade})`);
    L.push('');
    L.push(`Peer median at ${rep.context.stage}: ${rep.benchmark.peerMedian}. Top quartile: ${rep.benchmark.topQuartile}.`);
    L.push('');
    L.push('## Debt economics');
    L.push('');
    L.push(`| Measure | Value |`);
    L.push(`| --- | --- |`);
    L.push(`| Principal (remediation effort) | ${rep.economics.principalDays} person-days · ${MN.fmt.money(rep.economics.principalCost)} |`);
    L.push(`| Interest (cost per sprint) | ${MN.fmt.money(rep.economics.interestPerSprint)} |`);
    L.push(`| Annualised interest | ${MN.fmt.money(rep.economics.annualInterest)} |`);
    L.push(`| Delivery capacity lost | ${rep.economics.velocityDrag}% |`);
    L.push(`| Payback | ${rep.economics.paybackSprints} sprints |`);
    L.push(`| Year-one ROI | ${rep.economics.yearOneRoi}% |`);
    L.push('');
    L.push('## Dimension scores');
    L.push('');
    L.push('| Dimension | Weight | Debt score | Findings |');
    L.push('| --- | --- | --- | --- |');
    rep.dimensions.forEach((d) => L.push(`| ${d.name} | ${Math.round(d.weight * 100)}% | ${d.score} | ${d.findings} |`));
    L.push('');
    L.push('## Findings');
    rep.findings.forEach((f) => {
      L.push('');
      L.push(`### ${f.id} · ${f.title}`);
      L.push(`*${MN.SEVERITY[f.severity].label} · ${f.dimensionName} · impact ${f.impact}/100 · ${f.effort} person-days · owner: ${f.owner}*`);
      L.push('');
      L.push(f.why);
      L.push('');
      L.push('**Evidence**');
      f.evidence.forEach((e) => L.push(`- ${e.label}: \`${e.value}\`${e.measured ? '' : ' _(observed)_'}`));
      L.push('');
      L.push('**Remediation**');
      f.fixes.forEach((x) => L.push(`- ${x}`));
    });
    L.push('');
    L.push('## Refactoring strategy');
    rep.roadmap.forEach((w) => {
      L.push('');
      L.push(`### ${w.name} — ~${w.weeks} weeks · ${w.days} person-days`);
      L.push('');
      L.push(w.goal);
      L.push('');
      w.items.forEach((f) => L.push(`- ${f.id} ${f.title} (${f.effort}d)`));
      L.push('');
      L.push(`**Outcome** ${w.outcome} Index falls to ~${w.indexAfter}.`);
    });
    L.push('');
    L.push(`Projected index after all three waves: **${rep.projectedIndex}** (from ${rep.index}).`);
    L.push('');
    L.push('---');
    L.push('Generated by MN Studio — design intelligence platform.');
    return L.join('\n');
  };

  const toTickets = (rep, source = 'mn') => rep.findings.map((f, i) => ({
    id: MN.uid('tkt'),
    key: `${source === 'jira' ? 'DES' : 'DBT'}-${100 + i}`,
    source,
    title: f.title,
    body: f.why,
    type: f.severity === 'critical' || f.severity === 'high' ? 'bug' : 'chore',
    severity: f.severity,
    points: Math.max(1, Math.round(f.effort / 2)),
    status: 'backlog',
    origin: rep.id,
    dimension: f.dimensionName,
    fixes: f.fixes,
    agent: null,
    log: []
  }));

  MN.DebtEngine = { DIMENSIONS, CATALOG, analyze, toMarkdown, toTickets, SCAN_STEPS, normalise };
})();
