/* =========================================================
   MN Studio — Workspace overview
   What the workspace currently knows, and the way in to each
   journey. Also carries the demo seeder, which populates all
   three journeys with a coherent worked example.
   ========================================================= */
(() => {
  'use strict';

  const MN = window.MN;
  const { esc, fmt } = MN;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const S = () => MN.store.all;

  /* -------------------------------------------------------
     KPIs — only what the workspace actually knows
     ------------------------------------------------------- */
  const renderKpis = () => {
    const s = S();
    const tiles = [];

    if (s.debt) {
      const r = s.debt.report;
      tiles.push({
        label: 'Design debt index', value: r.index, note: `${esc(r.band.label)} · ${r.findings.length} findings`,
        tone: r.index >= 55 ? 'up' : ''
      });
      tiles.push({
        label: 'Carrying cost', value: fmt.money0(r.economics.interestPerSprint),
        note: `every sprint · ${r.economics.velocityDrag}% capacity lost`, tone: 'up'
      });
    }
    if (s.figma) {
      tiles.push({
        label: 'Figma detach rate', value: s.figma.file.stats.detachRate + '%',
        note: `${esc(s.figma.file.name)} · ${s.figma.audit.length} file findings`,
        tone: s.figma.file.stats.detachRate > 18 ? 'up' : ''
      });
    }
    if (s.pipeline.viability) {
      tiles.push({
        label: 'Viability', value: s.pipeline.viability.score,
        note: s.pipeline.viability.verdict.toUpperCase() + (s.pipeline.viability.overridden ? ' · overridden' : ''),
        tone: s.pipeline.viability.verdict === 'go' ? 'down' : ''
      });
    }
    const open = s.pipeline.build.tickets.filter((t) => t.status !== 'shipped').length;
    if (s.pipeline.build.tickets.length) {
      tiles.push({
        label: 'Open tickets', value: open,
        note: `${s.pipeline.build.tickets.length - open} shipped · ${s.pipeline.ship.published} components published`
      });
    }

    $('#kpis').innerHTML = tiles.length
      ? `<div class="grid g4">${tiles.slice(0, 4).map((t) => `
          <div class="tile">
            <p class="tile-label">${esc(t.label)}</p>
            <p class="tile-value">${t.value}</p>
            <p class="tile-note ${t.tone || ''}">${t.note}</p>
          </div>`).join('')}</div>`
      : `<div class="note">
           <span class="note-ico">ℹ</span>
           <div>
             <b>The workspace is empty.</b> Start any journey below, or press
             <b>Load demo workspace</b> in the header to populate all three with a worked
             example you can click through immediately.
           </div>
         </div>`;
  };

  /* -------------------------------------------------------
     Journey cards
     ------------------------------------------------------- */
  const renderJourneys = () => {
    const s = S();
    const p = s.pipeline;
    const stageName = { research: 'Research', viability: 'Viability', design: 'Design', build: 'Build', ship: 'Ship' }[p.stage];

    const cards = [
      {
        href: 'debt.html', icon: '🔬', title: 'Design debt calculator',
        blurb: 'A live URL or a demo video in; a scored debt ledger, its cost per sprint, and a costed refactoring strategy out.',
        state: s.debt
          ? { badge: `Index ${s.debt.report.index}`, tone: 'medium', line: `${esc(s.debt.label)} · ${s.debt.report.findings.length} findings · ${fmt.when(s.debt.report.generatedAt)}` }
          : { badge: 'Not started', tone: '', line: 'Point it at something real and it returns a report in about ten seconds.' },
        cta: s.debt ? 'Open the report' : 'Calculate design debt'
      },
      {
        href: 'figma.html', icon: '🎨', title: 'Figma audit',
        blurb: 'Already halfway into design? Read the file, score the debt that only exists inside it, and get a tokenisation and consolidation plan.',
        state: s.figma
          ? { badge: `Index ${s.figma.report.index}`, tone: 'medium', line: `${esc(s.figma.file.name)} · ${s.figma.audit.length} file findings · ${s.figma.clusters.length} duplicate clusters` }
          : { badge: 'Not connected', tone: '', line: 'Three example files are ready if you do not have one to hand.' },
        cta: s.figma ? 'Open the audit' : 'Audit a Figma file'
      },
      {
        href: 'build.html', icon: '🗺', title: 'Product pipeline',
        blurb: 'Research to viability gate to generated design to agent-built tickets, shipped into Storybook.',
        state: p.research.synthesis
          ? { badge: `At ${stageName}`, tone: 'good', line: `${esc((p.product && p.product.name) || 'Project')} · ${p.research.signals.length} signals · ${p.build.tickets.length} tickets` }
          : { badge: 'Not started', tone: '', line: 'Bring your own research, or load the worked example.' },
        cta: p.research.synthesis ? 'Continue the pipeline' : 'Start with research'
      }
    ];

    $('#journeyCards').innerHTML = cards.map((c) => `
      <a class="card card-pad" href="${c.href}"
         style="display:flex;flex-direction:column;gap:12px;transition:border-color .18s ease,transform .25s var(--ease)">
        <div class="row-between">
          <span class="agent-ava" style="width:42px;height:42px;font-size:19px">${c.icon}</span>
          <span class="badge ${c.state.tone}">${esc(c.state.badge)}</span>
        </div>
        <h3 style="margin:0">${esc(c.title)}</h3>
        <p class="small" style="margin:0;flex:1">${esc(c.blurb)}</p>
        <p class="tiny muted" style="margin:0;padding-top:12px;border-top:1px solid var(--line-soft)">${c.state.line}</p>
        <span class="strong small" style="color:var(--accent-dark)">${esc(c.cta)} →</span>
      </a>`).join('');
  };

  /* -------------------------------------------------------
     Activity + connections
     ------------------------------------------------------- */
  const KIND_ICON = { debt: '🔬', research: '🎙', viability: '⚖', design: '🗺', pipeline: '🗂', agent: '🤖', ship: '📚', workflow: '⚡', figma: '🎨', connector: '🔌' };

  const renderActivity = () => {
    const acts = MN.store.get('activity', []).slice(0, 12);
    $('#activity').innerHTML = acts.length ? `
      <div class="card card-pad">
        <div class="stack">
          ${acts.map((a) => `
            <div class="row" style="gap:12px;padding:8px 0;border-bottom:1px solid var(--line-soft)">
              <span style="font-size:15px">${KIND_ICON[a.kind] || '•'}</span>
              <span class="grow small" style="color:var(--ink)">${esc(a.text)}</span>
              <span class="tiny muted nowrap">${fmt.when(a.ts)}</span>
            </div>`).join('')}
        </div>
      </div>` : `
      <div class="empty">
        <h4>Nothing yet</h4>
        <p>Analyses, agent runs and workflow executions all land here.</p>
      </div>`;
  };

  const CONNECTORS = [
    ['figma', 'Figma', 'figma'], ['linear', 'Linear', 'linear'], ['jira', 'Jira', 'jira'],
    ['storybook', 'Storybook', 'sb'], ['github', 'GitHub', 'gh'], ['slack', 'Slack', 'slack']
  ];

  const renderConn = () => {
    const c = MN.store.get('connectors');
    const on = Object.values(c).filter(Boolean).length;
    $('#connSummary').innerHTML = `
      <div class="card card-pad">
        <div class="row-between" style="margin-bottom:14px">
          <span class="strong">${on} of 6 connected</span>
          <a class="tiny" href="agents.html#connectors" style="color:var(--accent-dark)">Manage →</a>
        </div>
        <div class="row-wrap">
          ${CONNECTORS.map(([k, name, cls]) => `
            <span class="chip" style="${c[k] ? '' : 'opacity:.5'}">
              <span class="conn-logo ${cls}" style="width:18px;height:18px;font-size:8px;border-radius:5px">${name[0]}</span>
              ${esc(name)}
            </span>`).join('')}
        </div>
      </div>`;
  };

  /* -------------------------------------------------------
     Demo seeder — a coherent worked example across all three
     ------------------------------------------------------- */
  const seedDemo = async () => {
    const btn = $('#demoBtn');
    btn.disabled = true;
    btn.innerHTML = 'Seeding…';

    // 1 — design debt on a live product
    const debtCtx = {
      stage: 'seed', cadence: 'weekly', surfaces: 26, designers: 1, engineers: 6,
      system: 'partial', a11yTarget: 'none', platforms: ['web', 'ios'],
      age: 2.5, rate: 620, hasTokens: false, hasStorybook: false
    };
    const debtReport = MN.DebtEngine.analyze({
      kind: 'url', source: 'https://app.northwind.io', label: 'app.northwind.io', context: debtCtx
    });

    // 2 — Figma audit on the same company's file
    const file = MN.Figma.parse({ key: 'Kq7fB2xNvR' });
    const figCtx = MN.Figma.deriveContext(file, { stage: 'seed', designers: 1, engineers: 6, rate: 620 });
    const figReport = MN.DebtEngine.analyze({ kind: 'figma', source: file.key, label: file.name, context: figCtx });

    // 3 — the pipeline, run through to a shipped component
    const product = {
      name: 'Fernbank',
      audience: 'Operations leads at 20–200 person design and dev agencies',
      oneLiner: 'Reconcile agency retainers against delivered work without leaving the accounting tool',
      problem: 'Agency ops leads reconcile retainer invoices against timesheets and delivered scope every month. '
        + 'The data lives in three places, so the reconciliation happens in a spreadsheet one person maintains. '
        + 'It takes two to three days a month and errors surface only when a client disputes an invoice.'
    };
    const signals = [
      ['interview', 'Priya, ops lead, Havenly (48 people)', 'Spends the first three days of every month in a reconciliation spreadsheet she built herself. Nobody else can run it.'],
      ['interview', 'Marcus, MD, Solstice (22 people)', 'Found out about a £14k under-billing nine months late. Now checks manually and still does not trust it.'],
      ['interview', 'Dee, finance manager, Kaido', 'Says the accounting tool is fine — the problem is that delivered scope never gets back into it.'],
      ['sales', 'Discovery call — Northwind', 'Asked directly about price. Said they would pay per seat if it removed the monthly spreadsheet entirely.'],
      ['support', 'Competitor forum thread, 84 replies', 'Recurring complaint that existing tools reconcile time but not scope, so the number is still wrong.'],
      ['analytics', 'Time-tracker export, 6 agencies', 'Between 11% and 19% of tracked hours never make it onto an invoice.'],
      ['competitor', 'Teardown — three incumbents', 'All three are built for firms above 200 people and price accordingly. Setup assumes a finance team.']
    ].map(([type, source, note]) => ({ id: MN.uid('sig'), type, source, note }));

    const synthesis = MN.Pipeline.synthesise(product, signals);
    const viability = MN.Pipeline.assessViability(product, synthesis, {
      market: 'focused', competitors: 4, wtp: 'loi', complexity: 'medium',
      teamFit: 'strong', channel: 'audience', wedge: true, unlock: true
    });
    const design = MN.Pipeline.generateDesign(product, synthesis, viability);
    const tickets = [
      ...MN.Pipeline.designToTickets(design, 'mn'),
      ...MN.DebtEngine.toTickets(debtReport, 'linear').slice(0, 6)
    ];

    // Work the first few component tickets through to shipped.
    const shipComponents = [];
    tickets.filter((t) => t.type === 'component').slice(0, 4).forEach((t) => {
      const agent = MN.Pipeline.agentFor(t);
      t.status = 'shipped';
      t.agent = agent.id;
      t.pr = 300 + Math.floor(MN.rng(MN.hash(t.key))() * 400);
      t.log = MN.Pipeline.agentScript(t, agent).map((l) => ({ ...l, time: fmt.clock() }));
      const spec = design.components.find((c) => c.name === t.component);
      shipComponents.push({
        name: t.component, stories: spec ? spec.variants : 3,
        published: true, coverage: 100, diffs: 0, from: t.key
      });
    });
    tickets.filter((t) => t.type === 'bug').slice(0, 2).forEach((t) => {
      const agent = MN.Pipeline.agentFor(t);
      t.status = 'review';
      t.agent = agent.id;
      t.pr = 300 + Math.floor(MN.rng(MN.hash(t.key))() * 400);
      t.log = MN.Pipeline.agentScript(t, agent).map((l) => ({ ...l, time: fmt.clock() }));
    });

    await MN.sleep(900);

    MN.store.patch((s) => {
      s.debt = { source: 'https://app.northwind.io', label: 'app.northwind.io', kind: 'url', context: debtCtx, report: debtReport };
      s.figma = { file, report: figReport, audit: MN.Figma.audit(file), plan: MN.Figma.tokenPlan(file), clusters: MN.Figma.consolidation(file) };
      s.pipeline = {
        stage: 'build',
        product,
        research: { signals, synthesis },
        viability,
        design,
        build: { tickets, sprint: 3 },
        ship: { components: shipComponents, published: shipComponents.length }
      };
      s.connectors = { figma: true, linear: true, jira: false, storybook: true, github: true, slack: false };
      s.activity = [
        ['ship', `${shipComponents.length} components published to Storybook`],
        ['agent', 'Feature Builder completed FEA-301 — PR #412 open'],
        ['pipeline', `${tickets.length} build tickets created`],
        ['design', `Generated ${design.screens.length} screens and ${design.components.length} components`],
        ['viability', `Viability ${viability.score} — ${viability.verdict.toUpperCase()}`],
        ['research', `Synthesised ${synthesis.themes.length} themes from ${signals.length} signals`],
        ['figma', `Audited ${file.name} — index ${figReport.index}`],
        ['debt', `Design debt report ${debtReport.id} — index ${debtReport.index} for app.northwind.io`]
      ].map(([kind, text], i) => ({ id: MN.uid('act'), kind, text, ts: Date.now() - i * 1000 * 60 * 37 }));
    });

    MN.shell.refresh();
    paint();
    btn.disabled = false;
    btn.innerHTML = 'Reseed <span class="lbl">demo</span>';
    MN.toast('Demo workspace loaded', 'All three journeys are populated — open any of them.', 'ok');
  };

  /* -------------------------------------------------------
     Boot
     ------------------------------------------------------- */
  const paint = () => {
    renderKpis();
    renderJourneys();
    renderActivity();
    renderConn();
    const s = S();
    const has = s.debt || s.figma || s.pipeline.research.synthesis;
    $('#demoBtn').innerHTML = has
      ? 'Reseed <span class="lbl">demo</span>'
      : 'Load <span class="lbl">demo workspace</span>';
    $('#wsTitle').textContent = has ? 'Where things stand.' : 'Good to see you.';
  };

  $('#demoBtn').addEventListener('click', seedDemo);

  $('#resetBtn').addEventListener('click', () => {
    MN.modal({
      title: 'Reset the workspace',
      sub: 'Clears every journey, ticket, workflow and connection.',
      body: '<p>This empties local storage for the platform. Nothing else on your machine is touched.</p>',
      foot: `<button class="btn btn-ghost" data-close>Cancel</button>
             <button class="btn btn-accent" id="doReset">Reset everything</button>`,
      onMount: (root) => root.querySelector('#doReset').addEventListener('click', () => {
        MN.store.reset();
        MN.closeModal();
        window.location.reload();
      })
    });
  });

  paint();
})();
