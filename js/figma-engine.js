/* =========================================================
   MN Studio — Figma engine

   Reads a Figma file into a structural model, audits it for
   the debt that only exists inside design files, and derives
   the product context the shared debt engine needs — so a
   half-finished design file can be scored without the user
   answering a questionnaire about it.

   `parse` stands in for the Figma REST API (GET /v1/files/:key
   plus /styles, /components and /variables). Swap it out and
   `audit`, `tokenPlan` and `consolidation` work unchanged.
   ========================================================= */
(() => {
  'use strict';

  const MN = window.MN;
  const { clamp, round, rng, hash, pick, shuffle } = MN;

  /* -------------------------------------------------------
     Example files — three very different states of health
     ------------------------------------------------------- */
  const SAMPLES = [
    {
      key: 'Kq7fB2xNvR', name: 'Northwind — Product', team: 'Northwind Design',
      note: 'Two years old, three designers in and out, no library owner.', health: 'poor'
    },
    {
      key: 'Ld9mT4pQwZ', name: 'Kaido Health — App v3', team: 'Kaido',
      note: 'Mid-rebuild. New library exists, old screens still reference the old one.', health: 'mixed'
    },
    {
      key: 'Ry2cJ8kHsV', name: 'Loop Finance — Design System', team: 'Loop',
      note: 'Actively maintained, variables in use, versioned releases.', health: 'good'
    }
  ];

  const HEALTH = {
    poor: { adoption: 0.22, detach: 0.44, autoLayout: 0.31, vars: 0, dupes: 9 },
    mixed: { adoption: 0.56, detach: 0.24, autoLayout: 0.62, vars: 14, dupes: 5 },
    good: { adoption: 0.86, detach: 0.07, autoLayout: 0.91, vars: 48, dupes: 1 }
  };

  const PAGE_NAMES = [
    '📐 Cover', '🧩 Components', '🎨 Foundations', 'Onboarding', 'Core flows',
    'Dashboard', 'Settings', 'Mobile', '🗄 Archive', '⚠️ WIP — do not use', 'Explorations'
  ];

  /* -------------------------------------------------------
     Parse — the structural read
     ------------------------------------------------------- */
  const parse = (input) => {
    const sample = SAMPLES.find((s) => s.key === input.key || s.name === input.name);
    const seed = hash(input.url || input.key || input.name || 'figma');
    const r = rng(seed);
    const h = HEALTH[(sample && sample.health) || pick(r, ['poor', 'mixed', 'good'])];

    const pageCount = 5 + Math.floor(r() * 5);
    const pages = shuffle(r, PAGE_NAMES).slice(0, pageCount).map((name) => ({
      name,
      frames: 3 + Math.floor(r() * 22),
      components: /component|foundation/i.test(name) ? 12 + Math.floor(r() * 40) : Math.floor(r() * 4),
      lastTouched: Math.floor(r() * 340)
    }));

    const frames = pages.reduce((s, p) => s + p.frames, 0);
    const components = pages.reduce((s, p) => s + p.components, 0);
    const instances = Math.round(frames * (2.4 + r() * 3.4));
    const detached = Math.round(instances * h.detach * (0.8 + r() * 0.4));

    // Screens are top-level frames on non-utility pages.
    const screenPages = pages.filter((p) => !/cover|component|foundation|archive|exploration/i.test(p.name));
    const screens = Math.max(4, screenPages.reduce((s, p) => s + p.frames, 0));

    const colorStyles = Math.round(6 + r() * 26);
    const rawFills = Math.round(colorStyles + frames * (h.vars ? 0.5 : 1.6) * (0.7 + r() * 0.6));
    const textStyles = Math.round(5 + (h.vars ? 4 : 14) * (0.6 + r()));

    return {
      key: (sample && sample.key) || input.key || 'F' + (seed % 1000000),
      name: (sample && sample.name) || input.name || 'Untitled file',
      team: (sample && sample.team) || 'Your team',
      note: sample && sample.note,
      url: input.url || `https://www.figma.com/file/${(sample && sample.key) || 'unknown'}`,
      lastModified: Date.now() - Math.floor(r() * 1000 * 60 * 60 * 24 * 21),
      pages,
      stats: {
        pages: pages.length,
        frames,
        screens,
        components,
        instances,
        detached,
        detachRate: round((detached / Math.max(1, instances)) * 100, 1),
        variants: Math.round(components * (0.6 + r() * 1.6)),
        colorStyles,
        rawFills,
        textStyles,
        effectStyles: Math.round(2 + r() * 9),
        variables: h.vars,
        libraryAdoption: round(h.adoption * 100, 1),
        autoLayoutPct: round(h.autoLayout * 100, 1),
        duplicateClusters: h.dupes,
        orphanFrames: Math.round(frames * (0.06 + r() * 0.18)),
        namingIssues: Math.round(components * (0.12 + r() * 0.4)),
        untouchedPages: pages.filter((p) => p.lastTouched > 120).length,
        publishedVersions: h.vars ? Math.round(3 + r() * 20) : 0
      }
    };
  };

  /* -------------------------------------------------------
     Derive the debt-engine context from the file itself
     ------------------------------------------------------- */
  const deriveContext = (file, overrides = {}) => {
    const s = file.stats;
    const system = s.libraryAdoption >= 70 && s.variables > 0 ? 'mature'
      : s.libraryAdoption >= 35 ? 'partial' : 'none';
    return Object.assign({
      stage: 'series-a',
      surfaces: clamp(s.screens, 3, 160),
      designers: 2,
      engineers: 8,
      system,
      platforms: ['web'],
      cadence: 'biweekly',
      a11yTarget: 'none',
      age: 2,
      rate: 620,
      hasTokens: s.variables > 0,
      hasStorybook: false
    }, overrides);
  };

  /* -------------------------------------------------------
     Figma-native findings
     ------------------------------------------------------- */
  const audit = (file) => {
    const s = file.stats;
    const out = [];
    const add = (o) => out.push({ id: 'FG-' + String(out.length + 1).padStart(2, '0'), ...o });

    if (s.detachRate > 8) {
      add({
        title: 'Instances have been detached from their components',
        severity: s.detachRate > 30 ? 'critical' : s.detachRate > 18 ? 'high' : 'medium',
        metric: `${s.detachRate}% of ${MN.fmt.int(s.instances)} instances`,
        effort: round(clamp(s.detached / 40, 2, 22), 1),
        why: 'A detached instance is a component that will never receive another fix. Every one of them is a silent fork of the design system.',
        fixes: [
          'Sort detached instances by how far they differ from the master — most are cosmetic overrides that can be re-attached directly.',
          'Where the detach exists to express a state the component lacks, add the variant rather than re-attaching.',
          'Turn on library analytics and review the detach rate weekly, not annually.'
        ]
      });
    }

    if (s.variables === 0) {
      add({
        title: 'No variables — every value is a raw fill or a local style',
        severity: 'critical',
        metric: `${s.rawFills} raw fills across ${s.frames} frames`,
        effort: round(clamp(s.rawFills / 22, 3, 20), 1),
        why: 'Without variables there is no theming, no mode switching, and no shared language with code. The file cannot describe intent, only appearance.',
        fixes: [
          'Build a primitive collection (the raw ramp) and a semantic collection (surface, ink, border, accent) that references it.',
          'Bind existing styles to the semantic collection so usages update in place.',
          'Export the same collections as CSS custom properties so design and code share one vocabulary.'
        ]
      });
    } else if (s.rawFills > s.variables * 2.2) {
      add({
        title: 'Variables exist but most values still bypass them',
        severity: 'high',
        metric: `${s.rawFills} raw fills against ${s.variables} variables`,
        effort: round(clamp(s.rawFills / 30, 2, 14), 1),
        why: 'A partially adopted variable system is worse than none — it creates the belief that changes propagate when most of them will not.',
        fixes: [
          'Run a fill audit page by page and bind every raw value to its nearest variable.',
          'Delete unbound local styles once their usages are migrated so they cannot be reselected.'
        ]
      });
    }

    if (s.duplicateClusters > 0) {
      add({
        title: 'Near-duplicate components across pages',
        severity: s.duplicateClusters > 6 ? 'high' : 'medium',
        metric: `${s.duplicateClusters} clusters, ${s.duplicateClusters * 3} components`,
        effort: round(clamp(s.duplicateClusters * 1.6, 2, 20), 1),
        why: 'Duplicates are how a design system quietly stops being one. Each cluster means a change has to be made three times or it gets made once and drifts.',
        fixes: [
          'For each cluster pick the canonical component by usage count, not by recency.',
          'Swap instances of the losers to the canonical component, then delete them.',
          'Where the duplicates encode a real difference, express it as a variant property.'
        ]
      });
    }

    if (s.autoLayoutPct < 80) {
      add({
        title: 'Frames are absolutely positioned rather than auto-laid-out',
        severity: s.autoLayoutPct < 45 ? 'high' : 'medium',
        metric: `${s.autoLayoutPct}% on auto layout`,
        effort: round(clamp(s.frames * (1 - s.autoLayoutPct / 100) / 12, 2, 18), 1),
        why: 'Absolute positioning makes every content change a manual reflow, and it hides responsive behaviour that engineering then has to invent.',
        fixes: [
          'Convert component internals first — they propagate to every instance.',
          'Set resizing behaviour explicitly so the intent survives handoff.',
          'Use the same spacing scale for gaps as the token set defines.'
        ]
      });
    }

    if (s.textStyles > 9) {
      add({
        title: 'Text styles have multiplied past a usable scale',
        severity: s.textStyles > 18 ? 'high' : 'medium',
        metric: `${s.textStyles} text styles`,
        effort: round(clamp(s.textStyles / 4, 1.5, 10), 1),
        why: 'Beyond about seven steps nobody can hold the scale in their head, so people pick by eye and the hierarchy stops meaning anything.',
        fixes: [
          'Collapse to a 7-step scale with semantic names, then map each existing style to its nearest step.',
          'Delete the orphans after migration so they cannot be reselected.'
        ]
      });
    }

    if (s.libraryAdoption < 70) {
      add({
        title: 'The library is published but not adopted',
        severity: s.libraryAdoption < 40 ? 'high' : 'medium',
        metric: `${s.libraryAdoption}% of instances come from the library`,
        effort: round(clamp((70 - s.libraryAdoption) / 6, 2, 14), 1),
        why: 'Publishing a library is not the same as adopting one. Low adoption means the system exists as documentation rather than as infrastructure.',
        fixes: [
          'Find the pages with the lowest adoption and migrate them one page at a time.',
          'Give the library an owner with review rights, and a release cadence people can plan against.'
        ]
      });
    }

    if (s.namingIssues > 4) {
      add({
        title: 'Component naming does not follow one convention',
        severity: 'medium',
        metric: `${s.namingIssues} components off-convention`,
        effort: round(clamp(s.namingIssues / 8, 1, 6), 1),
        why: 'Naming is the search index of a design file. Inconsistent names mean components cannot be found, so they get rebuilt.',
        fixes: [
          'Adopt Category/Component/Variant naming and rename in one pass.',
          'Match the names to the code component names exactly — the mapping is the handoff.'
        ]
      });
    }

    if (s.orphanFrames > 6) {
      add({
        title: 'Orphan frames and abandoned explorations are still in the file',
        severity: 'low',
        metric: `${s.orphanFrames} orphan frames · ${s.untouchedPages} pages untouched for 4+ months`,
        effort: round(clamp(s.orphanFrames / 14, 1, 5), 1),
        why: 'Dead frames are indistinguishable from live ones at a glance, which is how engineering builds the wrong screen.',
        fixes: [
          'Move anything untouched for a quarter to an archive page with a dated name.',
          'Mark the live pages with a status prefix so the file states its own truth.'
        ]
      });
    }

    if (s.publishedVersions === 0) {
      add({
        title: 'The library is unversioned',
        severity: 'medium',
        metric: 'no published releases',
        effort: 3,
        why: 'Without versioned releases, consumers cannot tell what changed or choose when to take it — so they stop taking updates at all.',
        fixes: [
          'Publish with release notes on a fixed cadence.',
          'Match the version to the code package so both sides can name the same state.'
        ]
      });
    }

    return out.sort((a, b) => MN.SEVERITY[b.severity].weight - MN.SEVERITY[a.severity].weight);
  };

  /* -------------------------------------------------------
     Tokenisation plan
     ------------------------------------------------------- */
  const tokenPlan = (file) => {
    const s = file.stats;
    const primitives = clamp(Math.round(9 + s.colorStyles * 0.25), 12, 34);
    return {
      before: { values: s.rawFills + s.colorStyles, styles: s.colorStyles, variables: s.variables, textStyles: s.textStyles },
      after: { primitives, semantic: 18, textStyles: 7, spacing: 8, radius: 5 },
      collections: [
        { name: 'primitive/colour', count: primitives, note: 'The raw ramp — neutrals plus four semantic families, nine steps each.' },
        { name: 'semantic/colour', count: 18, note: 'surface, ink, border, accent, and state. References primitives only.' },
        { name: 'semantic/typography', count: 7, note: 'display, title, subtitle, body, body-sm, caption, mono.' },
        { name: 'semantic/space', count: 8, note: '4pt base grid — named by intent, not by size.' },
        { name: 'semantic/radius', count: 5, note: 'sm through full, tied to component scale.' }
      ],
      reduction: round((1 - (primitives + 18) / Math.max(1, s.rawFills + s.colorStyles)) * 100, 1),
      steps: [
        'Extract every fill and text style in the file with its usage count.',
        'Cluster colours within ΔE < 3 and pick the most-used member of each cluster as the primitive.',
        'Build the semantic collection on top and bind styles to it — usages update in place.',
        'Export both collections as CSS custom properties so code consumes the same names.',
        'Delete unbound local styles so the old values cannot be reselected.'
      ]
    };
  };

  /* -------------------------------------------------------
     Component consolidation map
     ------------------------------------------------------- */
  const CLUSTER_SEEDS = [
    ['Button', ['Button', 'Btn / Primary', 'CTA Button', 'button-new']],
    ['Card', ['Card', 'Card / v2', 'ContentCard', 'card copy 3']],
    ['Input', ['Input', 'TextField', 'Form / Input', 'input-fixed']],
    ['Modal', ['Modal', 'Dialog', 'Overlay / Modal']],
    ['Badge', ['Badge', 'Tag', 'Pill', 'Status chip']],
    ['Avatar', ['Avatar', 'User pic', 'Profile circle']],
    ['Table row', ['TableRow', 'Row / Default', 'List item']],
    ['Nav item', ['NavItem', 'Sidebar link', 'Menu row']],
    ['Empty state', ['EmptyState', 'Blank slate', 'No results']]
  ];

  const consolidation = (file) => {
    const r = rng(hash(file.key + 'cluster'));
    return shuffle(r, CLUSTER_SEEDS).slice(0, file.stats.duplicateClusters).map(([canonical, members], i) => {
      const usages = members.map((m, j) => ({
        name: m,
        instances: Math.round((j === 0 ? 60 : 24) * (0.4 + r()) + 4)
      })).sort((a, b) => b.instances - a.instances);
      return {
        id: 'CL-' + (i + 1),
        canonical,
        keep: usages[0].name,
        retire: usages.slice(1),
        instances: usages.reduce((s, u) => s + u.instances, 0),
        effort: round(clamp(usages.length * 0.9, 1, 6), 1)
      };
    });
  };

  /* -------------------------------------------------------
     Handoff — turn the file into a pipeline design
     ------------------------------------------------------- */
  const toDesign = (file, report) => {
    const r = rng(hash(file.key + 'design'));
    const screenPages = file.pages.filter((p) => !/cover|component|foundation|archive/i.test(p.name));
    const plan = tokenPlan(file);

    const screens = screenPages.slice(0, 10).map((p, i) => ({
      id: 'S' + String(i + 1).padStart(2, '0'),
      name: p.name.replace(/^[^\w]+/, '').trim() || 'Screen ' + (i + 1),
      priority: i < 3 ? 'P0' : i < 6 ? 'P1' : 'P2',
      states: ['default', 'empty', 'loading'],
      flow: 'FL1'
    }));

    const clusters = consolidation(file);
    const components = [
      ...clusters.map((c) => c.canonical),
      'Button', 'TextField', 'Select', 'Toggle', 'Tabs', 'Toast', 'Skeleton', 'EmptyState'
    ].filter((n, i, a) => a.indexOf(n) === i).map((name, i) => ({
      id: 'C' + String(i + 1).padStart(2, '0'),
      name: name.replace(/\s+/g, ''),
      kind: i < clusters.length ? 'domain' : 'foundation',
      variants: 2 + Math.floor(r() * 5),
      usedIn: 1 + Math.floor(r() * 8),
      status: 'specified',
      stories: 0
    }));

    return {
      archetype: 'figma-import',
      archetypeName: `Imported from ${file.name}`,
      generatedAt: Date.now(),
      ia: { root: file.name, primary: screens.slice(0, 5).map((s) => ({ name: s.name, children: [] })) },
      flows: [{
        id: 'FL1', name: 'Core flow reconstructed from the file', critical: true,
        steps: [{ n: 1, name: 'Entry' }, { n: 2, name: 'Input' }, { n: 3, name: 'Confirm' }, { n: 4, name: 'Result' }],
        successMetric: 'Parity with the current product, with the debt findings resolved'
      }],
      screens,
      tokens: {
        color: plan.collections.filter((c) => c.name.includes('colour')).flatMap((c, ci) =>
          ['primary', 'accent', 'positive', 'warning', 'critical', 'surface', 'ink'].slice(0, ci ? 7 : 4).map((n, i) => ({
            name: `${c.name.split('/')[0]}/${n}`,
            value: ['#1c3d5a', '#c1662f', '#2f6b4f', '#a07b12', '#b3261e', '#fffdf9', '#17140f'][i],
            role: c.note
          }))),
        type: [
          { name: 'display', value: '34/38', use: 'Page titles' },
          { name: 'title', value: '25/29', use: 'Section headings' },
          { name: 'subtitle', value: '19/25', use: 'Card headings' },
          { name: 'body', value: '15/23', use: 'Default text' },
          { name: 'body-sm', value: '13.5/20', use: 'Dense tables' },
          { name: 'caption', value: '12/16', use: 'Labels' },
          { name: 'mono', value: '13/20', use: 'Identifiers' }
        ],
        space: ['2', '4', '8', '12', '18', '26', '40', '64'],
        radius: ['4', '8', '12', '18', '999']
      },
      components,
      principles: [
        { name: 'Rebuild from the canonical component', body: `The ${clusters.length} duplicate clusters collapse to one component each before any new screen work starts.` },
        { name: 'Variables before pixels', body: `Every value binds to the semantic collection — ${plan.reduction}% fewer distinct values than the file holds today.` },
        { name: 'The file states its own truth', body: 'Archive pages are dated and prefixed; live pages carry a status so nobody builds a dead exploration.' },
        { name: 'Names match code', body: 'Component names in the file are the component names in the repository. The mapping is the handoff.' }
      ],
      fromFigma: { key: file.key, name: file.name, reportId: report.id }
    };
  };

  MN.Figma = { SAMPLES, parse, deriveContext, audit, tokenPlan, consolidation, toDesign };
})();
