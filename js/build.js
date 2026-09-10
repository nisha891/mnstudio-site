/* =========================================================
   MN Studio — Product pipeline (journey two)
   Research → viability gate → design → build → ship.
   ========================================================= */
(() => {
  'use strict';

  const MN = window.MN;
  const P = MN.Pipeline;
  const { esc, fmt } = MN;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const STAGES = [
    { key: 'research', title: 'Research', sub: 'Signals & synthesis' },
    { key: 'viability', title: 'Viability', sub: 'The gate' },
    { key: 'design', title: 'Design', sub: 'IA, flows, system' },
    { key: 'build', title: 'Build', sub: 'Tickets & agents' },
    { key: 'ship', title: 'Ship', sub: 'Storybook' }
  ];

  const st = () => MN.store.get('pipeline');
  /** store.patch hands back the whole state; pipeline code wants its own slice. */
  const pat = (fn) => MN.store.patch((root) => fn(root.pipeline));
  const conn = () => MN.store.get('connectors');

  /* Which stages the project has actually earned. */
  const reached = (key) => {
    const s = st();
    switch (key) {
      case 'research': return true;
      case 'viability': return !!s.research.synthesis;
      case 'design': return !!s.viability && (s.viability.verdict === 'go' || s.viability.overridden);
      case 'build': return !!s.design || s.build.tickets.length > 0;
      case 'ship': return !!s.design;
      default: return false;
    }
  };

  const stageDone = (key) => {
    const s = st();
    return { research: !!s.research.synthesis, viability: !!s.viability, design: !!s.design,
      build: s.build.tickets.some((t) => t.status !== 'backlog'), ship: s.ship.published > 0 }[key];
  };

  /* -------------------------------------------------------
     Stepper + stage switching
     ------------------------------------------------------- */
  let current = st().stage || 'research';

  const paintStepper = () => {
    $('#stepper').innerHTML = STAGES.map((s, i) => {
      const ok = reached(s.key);
      const done = stageDone(s.key) && s.key !== current;
      return `<button class="step${s.key === current ? ' active' : done ? ' done' : ''}"
        data-stage="${s.key}" ${ok ? '' : 'disabled'}
        title="${ok ? '' : 'Complete the previous stage first'}">
        <span class="step-n">${done ? '✓' : i + 1}</span>
        <span class="step-t"><b>${esc(s.title)}</b><span>${esc(s.sub)}</span></span>
      </button>`;
    }).join('');
    $$('#stepper .step').forEach((b) => b.addEventListener('click', () => goto(b.dataset.stage)));
  };

  const goto = (key) => {
    if (!reached(key)) { MN.toast('Not yet', 'Finish the earlier stage first.', 'warn'); return; }
    current = key;
    MN.store.set('pipeline.stage', key);
    STAGES.forEach((s) => $('#stage-' + s.key).classList.toggle('hidden', s.key !== key));
    paintStepper();
    render(key);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const render = (key) => ({
    research: renderResearch, viability: renderViability,
    design: renderDesign, build: renderBuild, ship: renderShip
  }[key] || (() => {}))();

  /* =======================================================
     STAGE 1 — RESEARCH
     ======================================================= */
  const brief = () => ({
    name: $('#pName').value.trim(),
    audience: $('#pAudience').value.trim(),
    oneLiner: $('#pOneLiner').value.trim(),
    problem: $('#pProblem').value.trim()
  });

  const restoreBrief = () => {
    const p = st().product;
    if (!p) return;
    $('#pName').value = p.name || '';
    $('#pAudience').value = p.audience || '';
    $('#pOneLiner').value = p.oneLiner || '';
    $('#pProblem').value = p.problem || '';
  };

  $('#weightTable').innerHTML = Object.entries(P.SIGNAL_TYPES)
    .sort((a, b) => b[1].weight - a[1].weight)
    .map(([, v]) => `
      <div class="row-between" style="gap:10px">
        <span class="small">${v.icon} ${esc(v.label)}</span>
        <span class="tiny mono muted">×${v.weight.toFixed(1)}</span>
      </div>`).join('');

  const renderSignals = () => {
    const sig = st().research.signals;
    const host = $('#signalList');
    if (!sig.length) {
      host.innerHTML = `<div class="empty">
        <h4>No signals yet</h4>
        <p>Add interviews, support patterns, analytics observations or competitor teardowns.
           Four is the minimum for a synthesis worth acting on.</p>
      </div>`;
    } else {
      host.innerHTML = `<div class="table-wrap"><table class="tbl">
        <thead><tr><th>Type</th><th>Source</th><th>What it told you</th><th></th></tr></thead>
        <tbody>${sig.map((s) => `
          <tr>
            <td class="nowrap">${P.SIGNAL_TYPES[s.type].icon} <span class="t-main" style="display:inline">${esc(P.SIGNAL_TYPES[s.type].label)}</span></td>
            <td class="nowrap">${esc(s.source)}</td>
            <td>${esc(s.note)}</td>
            <td class="right"><button class="btn btn-quiet btn-sm" data-drop="${s.id}" aria-label="Remove signal">✕</button></td>
          </tr>`).join('')}</tbody>
      </table></div>`;
      $$('[data-drop]', host).forEach((b) => b.addEventListener('click', () => {
        pat((s) => { s.research.signals = s.research.signals.filter((x) => x.id !== b.dataset.drop); });
        renderSignals();
      }));
    }

    const n = sig.length;
    const weighted = sig.reduce((a, s) => a + P.SIGNAL_TYPES[s.type].weight, 0);
    $('#signalHint').innerHTML = n < 4
      ? `${MN.plural(n, 'signal')} — add ${4 - n} more to synthesise.`
      : `${MN.plural(n, 'signal')} · weighted evidence <b class="strong">${weighted.toFixed(1)}</b>`;
    $('#synthBtn').disabled = n < 4;
  };

  $('#addSignal').addEventListener('click', () => {
    MN.modal({
      title: 'Add a research signal',
      sub: 'One observation, one source.',
      body: `
        <label class="field">
          <span class="field-label">Type</span>
          <select class="select" id="sType">
            ${Object.entries(P.SIGNAL_TYPES).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span class="field-label">Source</span>
          <input class="input" id="sSource" placeholder="e.g. Priya, ops lead at Havenly">
        </label>
        <label class="field" style="margin:0">
          <span class="field-label">What it told you</span>
          <textarea class="textarea" id="sNote" placeholder="The observation itself — not your interpretation of it."></textarea>
        </label>`,
      foot: `<button class="btn btn-ghost" data-close>Cancel</button>
             <button class="btn btn-primary" id="saveSignal">Add signal</button>`,
      onMount: (root) => {
        root.querySelector('#saveSignal').addEventListener('click', () => {
          const source = root.querySelector('#sSource').value.trim();
          const note = root.querySelector('#sNote').value.trim();
          if (!source || !note) { MN.toast('Fill both fields', 'A signal needs a source and an observation.', 'warn'); return; }
          pat((s) => s.research.signals.push({
            id: MN.uid('sig'), type: root.querySelector('#sType').value, source, note
          }));
          MN.closeModal();
          renderSignals();
        });
      }
    });
  });

  $('#exampleBrief').addEventListener('click', () => {
    $('#pName').value = 'Fernbank';
    $('#pAudience').value = 'Operations leads at 20–200 person design and dev agencies';
    $('#pOneLiner').value = 'Reconcile agency retainers against delivered work without leaving the accounting tool';
    $('#pProblem').value = 'Agency ops leads reconcile retainer invoices against timesheets and delivered scope every month. '
      + 'The data lives in three places — the accounting tool, the time tracker and the project board — so the reconciliation '
      + 'happens in a spreadsheet that one person maintains. It takes two to three days a month, errors surface only when a '
      + 'client disputes an invoice, and nobody else in the business can pick it up.';
    const seed = [
      ['interview', 'Priya, ops lead, Havenly (48 people)', 'Spends the first three days of every month in a reconciliation spreadsheet she built herself. Nobody else can run it.'],
      ['interview', 'Marcus, MD, Solstice (22 people)', 'Found out about a £14k under-billing nine months late. Now checks manually and still does not trust it.'],
      ['interview', 'Dee, finance manager, Kaido', 'Says the accounting tool is fine — the problem is that delivered scope never gets back into it.'],
      ['sales', 'Discovery call — Northwind', 'Asked directly about price. Said they would pay per seat if it removed the monthly spreadsheet entirely.'],
      ['support', 'Competitor forum thread, 84 replies', 'Recurring complaint that existing tools reconcile time but not scope, so the number is still wrong.'],
      ['analytics', 'Time-tracker export, 6 agencies', 'Between 11% and 19% of tracked hours never make it onto an invoice.'],
      ['competitor', 'Teardown — three incumbents', 'All three are built for firms above 200 people and price accordingly. Setup assumes a finance team.']
    ];
    pat((s) => {
      s.research.signals = seed.map(([type, source, note]) => ({ id: MN.uid('sig'), type, source, note }));
    });
    renderSignals();
    MN.toast('Example loaded', 'A brief plus seven research signals.', 'ok');
  });

  $('#synthBtn').addEventListener('click', async () => {
    const b = brief();
    if (!b.name || !b.problem) {
      MN.toast('Complete the brief', 'A name and a problem statement at minimum.', 'warn');
      $('#pName').focus();
      return;
    }
    const btn = $('#synthBtn');
    btn.disabled = true;
    btn.textContent = 'Synthesising…';

    MN.store.set('pipeline.product', b);
    await MN.sleep(1300);

    const synthesis = P.synthesise(b, st().research.signals);
    MN.store.set('pipeline.research.synthesis', synthesis);
    MN.store.log('research', `Synthesised ${synthesis.themes.length} themes from ${synthesis.signalCount} signals`);

    btn.textContent = 'Re-synthesise';
    btn.disabled = false;
    renderResearch();
    paintStepper();
    MN.toast('Synthesis complete', `${synthesis.themes.length} themes · ${synthesis.coverage}% coverage`, 'ok');
  });

  const renderResearch = () => {
    renderSignals();
    const syn = st().research.synthesis;
    const host = $('#synthesisOut');
    if (!syn) { host.innerHTML = ''; return; }

    host.innerHTML = `
      <div class="card card-accent">
        <div class="card-head">
          <div>
            <h3>Synthesis</h3>
            <p class="sub">Classified as a <b class="strong">${esc(syn.archetypeName.toLowerCase())}</b> ·
               ${syn.signalCount} signals · weighted ${syn.weightedSignals}</p>
          </div>
          <span class="badge ${syn.coverage >= 65 ? 'good' : syn.coverage >= 45 ? 'medium' : 'high'}">
            ${syn.coverage}% evidence coverage
          </span>
        </div>
        <div class="card-body stack-lg">

          ${syn.gaps.length ? `
            <div class="note bad">
              <span class="note-ico">!</span>
              <div><b>Gaps in the evidence.</b>
                <ul class="fix-list small" style="margin-top:8px">
                  ${syn.gaps.map((g) => `<li>${esc(g)}</li>`).join('')}
                </ul>
              </div>
            </div>` : ''}

          <div>
            <h4>Themes</h4>
            <div class="grid g2" style="margin-top:12px">
              ${syn.themes.map((t) => `
                <div class="card card-quiet card-pad">
                  <div class="row-between" style="margin-bottom:8px">
                    <span class="badge ${t.tone === 'opportunity' ? 'good' : 'medium'}">${t.tone}</span>
                    <span class="tiny mono muted">${t.signals} signals · ${t.confidence}%</span>
                  </div>
                  <p class="strong" style="margin-bottom:8px">${esc(t.title)}</p>
                  <p class="small" style="margin:0;font-style:italic">${esc(t.quote)}</p>
                </div>`).join('')}
            </div>
          </div>

          <div class="grid g2">
            <div>
              <h4>Jobs to be done</h4>
              <div class="stack" style="margin-top:12px">
                ${syn.jtbd.map((j) => `
                  <div class="card card-quiet card-pad">
                    <p class="small" style="margin-bottom:8px">${esc(j.statement)}</p>
                    <div class="row-wrap">
                      <span class="chip">${esc(j.frequency)}</span>
                      <span class="chip">Today: <b>${esc(j.currentSolution)}</b></span>
                    </div>
                  </div>`).join('')}
              </div>
            </div>
            <div>
              <h4>Pains, ranked</h4>
              <div class="meters" style="margin-top:12px">
                ${syn.pains.map((p) => `
                  <div>
                    <div class="meter-top">
                      <span class="meter-name" style="font-weight:500;font-size:13.5px">${esc(p.text)}</span>
                      <span class="meter-score">${p.score}</span>
                    </div>
                    <div class="meter-track"><div class="meter-fill ${p.score >= 70 ? 'critical' : p.score >= 50 ? 'high' : 'medium'}" data-v="${p.score}"></div></div>
                    <p class="meter-foot">${p.frequency}% of signals · severity ${p.sev}/5</p>
                  </div>`).join('')}
              </div>
            </div>
          </div>

          ${syn.opportunities.length ? `
            <div>
              <h4>Opportunity bets</h4>
              <div class="stack" style="margin-top:12px">
                ${syn.opportunities.map((o) => `
                  <div class="wave-item" style="align-items:flex-start">
                    <span class="badge good">${esc(o.id)}</span>
                    <span class="grow">
                      <span class="wi-title">${esc(o.title)}</span>
                      <p class="small muted" style="margin:4px 0 0">${esc(o.bet)}</p>
                    </span>
                  </div>`).join('')}
              </div>
            </div>` : ''}
        </div>
        <div class="card-foot row-between">
          <p class="small muted" style="margin:0">Every theme is traceable to the signals behind it.</p>
          <button class="btn btn-primary" id="toViability">Take it to the viability gate →</button>
        </div>
      </div>`;

    MN.paintMeters(host);
    $('#toViability').addEventListener('click', () => goto('viability'));
  };

  /* =======================================================
     STAGE 2 — VIABILITY
     ======================================================= */
  $('#axisPreview').innerHTML = P.VIABILITY_AXES.map((a) => `
    <div>
      <div class="row-between" style="gap:8px">
        <span class="small strong">${esc(a.name)}</span>
        <span class="tiny mono muted">${Math.round(a.weight * 100)}%</span>
      </div>
      <p class="tiny muted" style="margin:2px 0 0;line-height:1.45">${esc(a.blurb)}</p>
    </div>`).join('');

  $('#viabilityBtn').addEventListener('click', async () => {
    const inputs = {
      market: $('#vMarket').value,
      competitors: Number($('#vCompetitors').value),
      wtp: ($$('input[name="wtp"]').find((r) => r.checked) || {}).value,
      complexity: $('#vComplexity').value,
      teamFit: $('#vTeamFit').value,
      channel: $('#vChannel').value,
      wedge: $('#vWedge').checked,
      unlock: $('#vUnlock').checked
    };
    const btn = $('#viabilityBtn');
    btn.disabled = true;
    btn.textContent = 'Assessing…';
    await MN.sleep(1100);

    const v = P.assessViability(st().product, st().research.synthesis, inputs);
    MN.store.set('pipeline.viability', v);
    MN.store.log('viability', `Viability ${v.score} — ${v.verdict.toUpperCase()}`);

    btn.disabled = false;
    btn.textContent = 'Re-run assessment';
    renderViability();
    paintStepper();
    MN.toast(`Verdict: ${v.verdict.toUpperCase()}`, v.headline, v.verdict === 'go' ? 'ok' : v.verdict === 'pivot' ? 'warn' : 'bad');
  });

  const renderViability = () => {
    const v = st().viability;
    const host = $('#viabilityOut');
    if (!v) { host.innerHTML = ''; return; }

    const tone = { go: 'good', pivot: 'medium', 'no-go': 'critical' }[v.verdict];
    const label = { go: 'GO', pivot: 'CONDITIONAL', 'no-go': 'NO-GO' }[v.verdict];

    host.innerHTML = `
      <div class="card card-accent">
        <div class="card-body" style="display:flex;gap:32px;align-items:center;flex-wrap:wrap">
          <div class="gauge gauge-sm" data-v="${v.score}" style="--gc:var(--${tone})">
            <div class="gauge-inner"><div class="gauge-num" id="vNum">0</div><div class="gauge-cap">Score</div></div>
          </div>
          <div class="grow" style="min-width:280px">
            <span class="badge ${tone}" style="font-size:13px;padding:5px 13px">${label}</span>
            <h2 style="margin:10px 0 6px">${esc(v.headline)}</h2>
            <p class="small" style="margin:0">
              ${v.verdict === 'go'
                ? 'The design stage is unlocked.'
                : `Acting on the two unlocks below would take this to about <b class="strong">${v.projectedScore}</b>.`}
            </p>
          </div>
          ${v.verdict !== 'go' ? `
            <button class="btn btn-ghost btn-sm" id="overrideGate">Override the gate</button>` : ''}
        </div>
      </div>

      <div class="grid g-side" style="margin-top:18px">
        <div class="card">
          <div class="card-head"><h3>The six axes</h3></div>
          <div class="card-body">
            <div class="meters">
              ${v.axes.map((a) => `
                <div>
                  <div class="meter-top">
                    <span class="meter-name">${esc(a.name)} <span class="w">${Math.round(a.weight * 100)}%</span></span>
                    <span class="meter-score">${a.score}</span>
                  </div>
                  <div class="meter-track">
                    <div class="meter-fill ${a.score >= 70 ? 'good' : a.score >= 50 ? 'low' : a.score >= 35 ? 'medium' : 'critical'}" data-v="${a.score}"></div>
                  </div>
                  <p class="meter-foot">${esc(a.blurb)}</p>
                </div>`).join('')}
            </div>
          </div>
        </div>

        <div class="stack-lg">
          <div class="card">
            <div class="card-head"><h4>Risks</h4></div>
            <div class="card-body">
              <ul class="fix-list small">
                ${v.risks.map((rk) => `<li><b class="strong">${esc(rk.axis)}${rk.score !== null ? ` (${rk.score})` : ''}.</b> ${esc(rk.text)}</li>`).join('')}
              </ul>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><h4>What would change the verdict</h4></div>
            <div class="card-body">
              <div class="stack">
                ${v.unlocks.map((u) => `
                  <div class="wave-item" style="align-items:flex-start">
                    <span class="grow">
                      <span class="wi-title">${esc(u.axis)}</span>
                      <p class="small muted" style="margin:4px 0 0">${esc(u.action)}</p>
                    </span>
                    <span class="badge good nowrap">+${u.lifts}</span>
                  </div>`).join('')}
              </div>
            </div>
          </div>
          ${reached('design') ? `
            <button class="btn btn-primary btn-full btn-lg" id="toDesign">Design the product →</button>` : ''}
        </div>
      </div>`;

    MN.paintMeters(host);
    MN.countTo($('#vNum'), v.score, { duration: 900, decimals: 1 });

    const od = $('#overrideGate');
    if (od) od.addEventListener('click', () => {
      MN.modal({
        title: 'Override the viability gate',
        sub: 'This is recorded on the project.',
        body: `<p>The assessment scored <b class="strong">${v.score}</b> and returned
               <b class="strong">${label}</b>. Overriding unlocks the design stage anyway.</p>
               <label class="field" style="margin:0">
                 <span class="field-label">Why are you proceeding?</span>
                 <textarea class="textarea" id="odWhy" placeholder="e.g. strategic bet — we are accepting the distribution risk deliberately"></textarea>
               </label>`,
        foot: `<button class="btn btn-ghost" data-close>Cancel</button>
               <button class="btn btn-accent" id="odGo">Override and continue</button>`,
        onMount: (root) => {
          root.querySelector('#odGo').addEventListener('click', () => {
            const why = root.querySelector('#odWhy').value.trim();
            if (!why) { MN.toast('Give a reason', 'The override is recorded with its rationale.', 'warn'); return; }
            pat((s) => { s.viability.overridden = true; s.viability.overrideReason = why; });
            MN.store.log('viability', `Gate overridden: ${why}`);
            MN.closeModal();
            paintStepper();
            renderViability();
            MN.toast('Gate overridden', 'The design stage is unlocked.', 'warn');
          });
        }
      });
    });

    const td = $('#toDesign');
    if (td) td.addEventListener('click', () => goto('design'));
  };

  /* =======================================================
     STAGE 3 — DESIGN
     ======================================================= */
  const renderDesign = () => {
    const host = $('#designOut');
    const d = st().design;

    if (!d) {
      host.innerHTML = `
        <div class="card" style="max-width:760px;margin:0 auto">
          <div class="card-body center" style="padding:44px 30px">
            <p class="eyebrow">Stage three</p>
            <h2>Design the product</h2>
            <p style="max-width:52ch;margin:0 auto 22px">
              Product Architect and System Smith turn the synthesis into an information
              architecture, the core flows, a prioritised screen inventory, a token set and the
              component system those screens need.
            </p>
            <button class="btn btn-primary btn-lg" id="genDesign">Generate the product design →</button>
          </div>
        </div>`;
      $('#genDesign').addEventListener('click', async () => {
        const btn = $('#genDesign');
        btn.disabled = true;
        btn.textContent = 'Generating…';
        await MN.sleep(1500);
        const design = P.generateDesign(st().product, st().research.synthesis, st().viability);
        MN.store.set('pipeline.design', design);
        MN.store.log('design', `Generated ${design.screens.length} screens and ${design.components.length} components`);
        paintStepper();
        renderDesign();
        MN.toast('Design generated', `${design.screens.length} screens · ${design.components.length} components`, 'ok');
      });
      return;
    }

    const inBuild = st().build.tickets.some((t) => t.origin === 'design');

    host.innerHTML = `
      <div class="row-between" style="margin-bottom:20px;align-items:flex-start">
        <div>
          <h2 style="margin-bottom:4px">${esc(st().product.name)} — product design</h2>
          <p class="small muted" style="margin:0">
            ${esc(d.archetypeName)} · ${d.screens.length} screens · ${d.flows.length} core flows ·
            ${d.components.length} components · ${d.tokens.color.length} colour tokens
          </p>
        </div>
        <button class="btn ${inBuild ? 'btn-ghost' : 'btn-primary'}" id="toBuild">
          ${inBuild ? 'Open the build board →' : 'Create build tickets →'}
        </button>
      </div>

      <div class="tabs" data-tabs role="tablist" aria-label="Design output">
        <button class="tab" role="tab" id="t-prin" aria-controls="p-prin" aria-selected="true">Principles</button>
        <button class="tab" role="tab" id="t-ia" aria-controls="p-ia" aria-selected="false">Architecture</button>
        <button class="tab" role="tab" id="t-flows" aria-controls="p-flows" aria-selected="false">Flows</button>
        <button class="tab" role="tab" id="t-screens" aria-controls="p-screens" aria-selected="false">Screens</button>
        <button class="tab" role="tab" id="t-tokens" aria-controls="p-tokens" aria-selected="false">Tokens</button>
        <button class="tab" role="tab" id="t-comps" aria-controls="p-comps" aria-selected="false">Components</button>
      </div>

      <div class="panel" id="p-prin" role="tabpanel">
        <div class="grid g2">
          ${d.principles.map((p, i) => `
            <div class="card card-pad">
              <span class="grade g-b" style="width:32px;height:32px;font-size:15px;border-radius:9px">${i + 1}</span>
              <h4 style="margin:12px 0 6px">${esc(p.name)}</h4>
              <p class="small" style="margin:0">${esc(p.body)}</p>
            </div>`).join('')}
        </div>
      </div>

      <div class="panel" id="p-ia" role="tabpanel" hidden>
        <div class="card card-pad">
          <p class="mono small" style="color:var(--ink)">${esc(d.ia.root)}</p>
          <div style="margin-top:10px">
            ${d.ia.primary.map((n, i) => `
              <div style="padding-left:14px;border-left:1px solid var(--line);margin-left:6px">
                <p class="mono small" style="margin:0;padding:5px 0;color:var(--ink)">
                  ├─ ${esc(n.name)} <span class="muted">/${n.name.toLowerCase().replace(/\s+/g, '-')}</span>
                </p>
                ${n.children.map((c) => `
                  <p class="mono tiny muted" style="margin:0;padding:3px 0 3px 22px">│  └─ ${esc(c)}</p>`).join('')}
              </div>`).join('')}
          </div>
          <p class="small muted" style="margin-top:16px">
            Three levels maximum. Anything deeper is a filter on a list, not a destination.
          </p>
        </div>
      </div>

      <div class="panel" id="p-flows" role="tabpanel" hidden>
        <div class="stack-lg">
          ${d.flows.map((f) => `
            <div class="card">
              <div class="card-head">
                <div>
                  <h4>${esc(f.name)}</h4>
                  <p class="sub">${esc(f.successMetric)}</p>
                </div>
                ${f.critical ? '<span class="badge high">Critical path</span>' : '<span class="badge">Secondary</span>'}
              </div>
              <div class="card-body">
                <div class="row-wrap" style="gap:0">
                  ${f.steps.map((s, i) => `
                    <span class="chip" style="border-radius:${i === 0 ? '999px 0 0 999px' : i === f.steps.length - 1 ? '0 999px 999px 0' : '0'};border-right:${i === f.steps.length - 1 ? '' : '0'}">
                      <b>${s.n}</b> ${esc(s.name)}
                    </span>`).join('')}
                </div>
              </div>
            </div>`).join('')}
        </div>
      </div>

      <div class="panel" id="p-screens" role="tabpanel" hidden>
        <div class="table-wrap card">
          <table class="tbl">
            <thead><tr><th>ID</th><th>Screen</th><th>Priority</th><th>States required</th><th>Flow</th></tr></thead>
            <tbody>
              ${d.screens.map((s) => `
                <tr>
                  <td class="num">${esc(s.id)}</td>
                  <td><span class="t-main">${esc(s.name)}</span></td>
                  <td><span class="badge ${s.priority === 'P0' ? 'high' : s.priority === 'P1' ? 'medium' : 'low'}">${s.priority}</span></td>
                  <td>${s.states.map((x) => `<span class="chip tiny" style="padding:2px 8px">${esc(x)}</span>`).join(' ')}</td>
                  <td class="num">${esc(s.flow)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel" id="p-tokens" role="tabpanel" hidden>
        <div class="grid g2">
          <div class="card">
            <div class="card-head"><h4>Colour</h4></div>
            <div class="card-body">
              ${d.tokens.color.map((t) => `
                <div class="row" style="padding:7px 0;border-bottom:1px solid var(--line-soft)">
                  <span style="width:26px;height:26px;border-radius:7px;background:${esc(t.value)};border:1px solid var(--line);flex:none"></span>
                  <span class="grow">
                    <span class="mono small" style="color:var(--ink)">${esc(t.name)}</span>
                    <span class="tiny muted" style="display:block">${esc(t.role)}</span>
                  </span>
                  <span class="mono tiny muted">${esc(t.value)}</span>
                </div>`).join('')}
            </div>
          </div>
          <div class="stack-lg">
            <div class="card">
              <div class="card-head"><h4>Type scale</h4></div>
              <div class="card-body">
                ${d.tokens.type.map((t) => `
                  <div class="row-between" style="padding:6px 0;border-bottom:1px solid var(--line-soft)">
                    <span class="mono small" style="color:var(--ink)">${esc(t.name)}</span>
                    <span class="tiny muted">${esc(t.use)}</span>
                    <span class="mono tiny">${esc(t.value)}</span>
                  </div>`).join('')}
              </div>
            </div>
            <div class="card card-pad">
              <h4>Spacing &amp; radius</h4>
              <p class="tiny muted" style="margin:10px 0 6px">4pt base grid</p>
              <div class="row-wrap">${d.tokens.space.map((s) => `<span class="chip mono">${s}</span>`).join('')}</div>
              <p class="tiny muted" style="margin:14px 0 6px">Radius</p>
              <div class="row-wrap">${d.tokens.radius.map((s) => `<span class="chip mono">${s}</span>`).join('')}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel" id="p-comps" role="tabpanel" hidden>
        <div class="filters">
          <span class="tiny muted" style="font-weight:700;letter-spacing:.08em;text-transform:uppercase">
            ${d.components.filter((c) => c.kind === 'foundation').length} foundation ·
            ${d.components.filter((c) => c.kind === 'domain').length} domain
          </span>
        </div>
        <div class="table-wrap card">
          <table class="tbl">
            <thead><tr><th>ID</th><th>Component</th><th>Kind</th><th>Variants</th><th>Used on</th></tr></thead>
            <tbody>
              ${d.components.map((c) => `
                <tr>
                  <td class="num">${esc(c.id)}</td>
                  <td><span class="t-main mono">${esc(c.name)}</span></td>
                  <td><span class="badge ${c.kind === 'domain' ? 'info' : ''}">${esc(c.kind)}</span></td>
                  <td class="num">${c.variants}</td>
                  <td class="num">${MN.plural(c.usedIn, 'screen')}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    MN.bindTabs(host);

    $('#toBuild').addEventListener('click', () => {
      if (inBuild) { goto('build'); return; }
      const tickets = P.designToTickets(d, 'mn');
      pat((s) => { s.build.tickets = [...s.build.tickets, ...tickets]; });
      MN.store.log('pipeline', `${tickets.length} build tickets created from the design`);
      MN.shell.refresh();
      MN.toast(`${tickets.length} tickets created`, 'Assign agents on the build board.', 'ok');
      goto('build');
    });
  };

  /* =======================================================
     STAGE 4 — BUILD
     ======================================================= */
  const COLUMNS = [
    { key: 'backlog', name: 'Backlog' },
    { key: 'progress', name: 'Agent working' },
    { key: 'review', name: 'In review' },
    { key: 'shipped', name: 'Shipped' }
  ];

  const ticketCard = (t) => {
    const agent = t.agent ? P.AGENTS.find((a) => a.id === t.agent) : null;
    return `
      <article class="ticket${t.status === 'progress' ? ' agent-on' : ''}" data-ticket="${t.id}" tabindex="0">
        <div class="ticket-key">
          <span class="ticket-src ${esc(t.source)}">${t.source === 'linear' ? 'L' : t.source === 'jira' ? 'J' : 'M'}</span>
          ${esc(t.key)}
        </div>
        <p class="ticket-title">${esc(t.title)}</p>
        <div class="ticket-foot">
          <span class="badge ${esc(t.severity)}">${esc(t.type)}</span>
          <span class="chip tiny" style="padding:2px 8px">${t.points} pts</span>
        </div>
        ${agent ? `
          <div class="ticket-agent">
            ${t.status === 'progress' ? '<span class="pulse"></span>' : '<span class="avatar bot" style="width:16px;height:16px;font-size:8px">✓</span>'}
            ${esc(agent.name)}${t.pr ? ` · PR #${t.pr}` : ''}
          </div>` : ''}
      </article>`;
  };

  const renderBuild = () => {
    const s = st();
    const tickets = s.build.tickets;
    const host = $('#buildOut');
    const debt = MN.store.get('debt');

    host.innerHTML = `
      <div class="card card-quiet" style="margin-bottom:20px">
        <div class="card-body" style="padding:14px 18px">
          <div class="row-wrap" style="gap:10px 22px">
            <span class="tiny muted" style="font-weight:700;letter-spacing:.08em;text-transform:uppercase">Connectors</span>
            ${[['linear', 'Linear', 'L'], ['jira', 'Jira', 'J'], ['github', 'GitHub', 'G'], ['storybook', 'Storybook', 'SB']]
              .map(([k, name, mark]) => `
                <button class="chip" data-conn="${k}" style="cursor:pointer">
                  <span class="conn-logo ${k === 'storybook' ? 'sb' : k === 'github' ? 'gh' : k}"
                        style="width:20px;height:20px;font-size:9px;border-radius:6px">${mark}</span>
                  <b>${esc(name)}</b>
                  <span class="badge ${conn()[k] ? 'good' : ''}" style="font-size:10px;padding:1px 7px">
                    ${conn()[k] ? 'connected' : 'connect'}
                  </span>
                </button>`).join('')}
          </div>
        </div>
      </div>

      <div>
        <div>
          <div class="row-between" style="margin-bottom:16px;align-items:flex-start">
            <div>
              <h2 style="margin-bottom:4px">Build board</h2>
              <p class="small muted" style="margin:0">
                ${tickets.length} tickets · ${tickets.filter((t) => t.status === 'shipped').length} shipped ·
                ${tickets.reduce((a, t) => a + (t.status === 'shipped' ? 0 : t.points), 0)} points remaining
              </p>
            </div>
            <div class="row-wrap">
              <button class="btn btn-ghost btn-sm" id="importTickets">Import tickets</button>
              <button class="btn btn-primary btn-sm" id="runAll"
                title="Works the next four tickets, components first — the screens that consume them depend on them"
                ${tickets.some((t) => t.status === 'backlog') ? '' : 'disabled'}>
                Run agents on backlog
              </button>
            </div>
          </div>

          ${tickets.length ? `
            <div class="board">
              ${COLUMNS.map((c) => {
                const items = tickets.filter((t) => t.status === c.key);
                return `<div class="col" data-col="${c.key}">
                  <div class="col-head">${esc(c.name)}
                    <span class="n${c.key === 'progress' && items.length ? ' live' : ''}">${items.length}</span>
                  </div>
                  ${items.map(ticketCard).join('') || '<p class="tiny muted center" style="padding:14px 0">—</p>'}
                </div>`;
              }).join('')}
            </div>` : `
            <div class="empty">
              <h4>No tickets yet</h4>
              <p>Create them from the generated design, import a design debt report, or connect Linear or Jira.</p>
              <button class="btn btn-primary btn-sm" id="emptyImport">Import tickets</button>
            </div>`}
        </div>

        <div class="grid g2" style="margin-top:22px">
          ${debt ? `
            <div class="card card-accent card-pad">
              <p class="eyebrow">Design debt in scope</p>
              <p class="small" style="margin-bottom:12px">
                Report ${esc(debt.report.id)} — index ${debt.report.index},
                ${debt.report.findings.length} findings on ${esc(debt.label)}.
              </p>
              <button class="btn btn-ghost btn-sm" id="pullDebt">Pull debt findings in</button>
            </div>` : ''}
          <div class="card card-quiet card-pad">
            <p class="eyebrow">How agents work a ticket</p>
            <ol class="fix-list small" style="margin:0">
              <li>Triager classifies and sizes the ticket.</li>
              <li>The matched agent loads the design system as context.</li>
              <li>It branches, implements, and writes stories and tests.</li>
              <li>Checks run — types, tests, accessibility, visual regression.</li>
              <li>A pull request opens for human review.</li>
            </ol>
          </div>
        </div>
      </div>`;

    $$('[data-conn]', host).forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.conn;
      MN.store.patch((x) => { x.connectors[k] = !x.connectors[k]; });
      MN.shell.refresh();
      MN.toast(conn()[k] ? 'Connected' : 'Disconnected',
        `${k[0].toUpperCase() + k.slice(1)} ${conn()[k] ? 'is now syncing.' : 'sync stopped.'}`,
        conn()[k] ? 'ok' : 'info');
      renderBuild();
    }));

    [$('#importTickets'), $('#emptyImport')].filter(Boolean).forEach((b) => b.addEventListener('click', importModal));

    const pull = $('#pullDebt');
    if (pull) pull.addEventListener('click', () => {
      const t = MN.DebtEngine.toTickets(debt.report, 'mn');
      pat((x) => { x.build.tickets = [...x.build.tickets, ...t]; });
      MN.store.log('pipeline', `${t.length} debt tickets pulled into the board`);
      MN.shell.refresh();
      renderBuild();
      MN.toast(`${t.length} debt tickets added`, 'Agents can pick these up like any other ticket.', 'ok');
    });

    $$('[data-ticket]', host).forEach((el) => {
      const open = () => openTicket(el.dataset.ticket);
      el.addEventListener('click', open);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
    });

    const runAll = $('#runAll');
    if (runAll) runAll.addEventListener('click', async () => {
      // Components first: the screens that consume them depend on them existing.
      const backlog = st().build.tickets
        .filter((t) => t.status === 'backlog')
        .sort((a, b) => (a.type === 'component' ? 0 : 1) - (b.type === 'component' ? 0 : 1))
        .slice(0, 4);
      if (!backlog.length) return;
      runAll.disabled = true;
      runAll.textContent = `Working ${backlog.length} tickets…`;
      for (const t of backlog) {
        await runAgent(t.id, { quiet: true });
        renderBuild();
      }
      MN.toast(`${backlog.length} tickets worked`, 'All are in review with pull requests open.', 'agent');
    });
  };

  const importModal = () => {
    const debt = MN.store.get('debt');
    MN.modal({
      title: 'Import tickets',
      sub: 'Pull work in from a connected tracker or from your own analysis.',
      body: `
        <div class="stack">
          <button class="btn btn-solid btn-full" data-import="linear" style="justify-content:flex-start;border-radius:12px;padding:14px 16px">
            <span class="conn-logo linear" style="width:28px;height:28px;font-size:12px">L</span>
            <span style="text-align:left"><b>Linear</b><br><span class="tiny muted">Pull 6 open issues from the current cycle</span></span>
          </button>
          <button class="btn btn-solid btn-full" data-import="jira" style="justify-content:flex-start;border-radius:12px;padding:14px 16px">
            <span class="conn-logo jira" style="width:28px;height:28px;font-size:12px">J</span>
            <span style="text-align:left"><b>Jira</b><br><span class="tiny muted">Pull 5 tasks from the active sprint</span></span>
          </button>
          ${debt ? `
            <button class="btn btn-solid btn-full" data-import="debt" style="justify-content:flex-start;border-radius:12px;padding:14px 16px">
              <span class="conn-logo" style="width:28px;height:28px;font-size:12px;background:var(--accent)">D</span>
              <span style="text-align:left"><b>Design debt report ${esc(debt.report.id)}</b><br>
                <span class="tiny muted">${debt.report.findings.length} findings as tickets</span></span>
            </button>` : ''}
        </div>`,
      onMount: (root) => {
        $$('[data-import]', root).forEach((b) => b.addEventListener('click', () => {
          const kind = b.dataset.import;
          let added = [];
          if (kind === 'debt') {
            added = MN.DebtEngine.toTickets(debt.report, 'mn');
          } else {
            added = mockTracker(kind);
            MN.store.patch((s) => { s.connectors[kind] = true; });
          }
          pat((s) => { s.build.tickets = [...s.build.tickets, ...added]; });
          MN.store.log('pipeline', `${added.length} tickets imported from ${kind}`);
          MN.shell.refresh();
          MN.closeModal();
          renderBuild();
          MN.toast(`${added.length} tickets imported`, `From ${kind === 'debt' ? 'the debt report' : kind}.`, 'ok');
        }));
      }
    });
  };

  /** Stand-in for a real Linear/Jira fetch. */
  const mockTracker = (source) => {
    const rows = source === 'linear' ? [
      ['Date picker traps keyboard focus on Safari', 'bug', 'critical', 3],
      ['Empty state missing on the saved views list', 'chore', 'medium', 2],
      ['Add bulk select to the item table', 'feature', 'medium', 5],
      ['Toast stacks overlap the primary action on mobile', 'bug', 'high', 2],
      ['Invite dialog does not announce validation errors', 'bug', 'high', 3],
      ['Settings nav is three levels deep for one setting', 'chore', 'low', 3]
    ] : [
      ['Checkout totals shift after fonts load', 'bug', 'high', 3],
      ['Support filtering by owner on the report screen', 'feature', 'medium', 5],
      ['Disabled buttons fail contrast at AA', 'bug', 'critical', 2],
      ['Session expiry drops the user to a blank page', 'bug', 'critical', 3],
      ['Add skeletons to the dashboard cards', 'chore', 'medium', 2]
    ];
    return rows.map(([title, type, severity, points], i) => ({
      id: MN.uid('tkt'),
      key: `${source === 'jira' ? 'PROJ' : 'ENG'}-${(source === 'jira' ? 400 : 500) + i}`,
      source, title, type, severity, points,
      body: `Imported from ${source[0].toUpperCase() + source.slice(1)}.`,
      status: 'backlog',
      dimension: type === 'bug' ? 'Interaction & flow' : 'Product design',
      origin: source,
      fixes: ['Reproduce and confirm the conditions', 'Fix using system components and tokens', 'Add a regression test'],
      agent: null,
      log: []
    }));
  };

  /* ---------- ticket detail + agent run ---------- */
  const openTicket = (id) => {
    const t = st().build.tickets.find((x) => x.id === id);
    if (!t) return;
    const agent = P.agentFor(t);

    MN.modal({
      title: t.title,
      sub: `${t.key} · ${t.type} · ${t.points} points · ${t.dimension}`,
      wide: true,
      body: `
        <p>${esc(t.body)}</p>
        ${t.fixes && t.fixes.length ? `
          <h5 style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-mute);margin:18px 0 8px">Acceptance</h5>
          <ul class="fix-list small">${t.fixes.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
        <h5 style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-mute);margin:20px 0 8px">Agent run</h5>
        <div class="log" id="agentLog">${t.log && t.log.length
          ? t.log.map((l) => `<div class="log-line"><span class="log-t">${esc(l.time)}</span><span class="${esc(l.t)}">${esc(l.s)}</span></div>`).join('')
          : `<div class="log-line"><span class="log-t">--:--:--</span><span class="dim">no run yet — ${esc(agent.name)} is matched to this ticket</span></div>`}</div>`,
      foot: `
        <button class="btn btn-ghost" data-close>Close</button>
        ${t.status === 'review' ? `<button class="btn btn-primary" id="approve">Approve &amp; ship</button>`
          : t.status === 'shipped' ? `<span class="badge good" style="align-self:center">Shipped</span>`
          : `<button class="btn btn-primary" id="runOne">${agent.icon} Run ${esc(agent.name)}</button>`}`,
      onMount: (root) => {
        const run = root.querySelector('#runOne');
        if (run) run.addEventListener('click', async () => {
          run.disabled = true;
          run.textContent = 'Working…';
          await runAgent(id, { logEl: root.querySelector('#agentLog') });
          MN.closeModal();
          renderBuild();
        });
        const ap = root.querySelector('#approve');
        if (ap) ap.addEventListener('click', () => {
          shipTicket(id);
          MN.closeModal();
          renderBuild();
        });
      }
    });
  };

  const runAgent = async (id, opts = {}) => {
    const ticket = st().build.tickets.find((x) => x.id === id);
    if (!ticket) return;
    const agent = P.agentFor(ticket);
    const script = P.agentScript(ticket, agent);

    pat((s) => {
      const t = s.build.tickets.find((x) => x.id === id);
      t.status = 'progress';
      t.agent = agent.id;
      t.log = [];
    });
    if (!opts.quiet) renderBuild();

    const lines = [];
    for (const step of script) {
      const line = { ...step, time: fmt.clock() };
      lines.push(line);
      if (opts.logEl) {
        opts.logEl.innerHTML = lines.map((l) =>
          `<div class="log-line"><span class="log-t">${esc(l.time)}</span><span class="${esc(l.t)}">${esc(l.s)}</span></div>`
        ).join('') + '<div class="log-line log-cursor"></div>';
        opts.logEl.scrollTop = opts.logEl.scrollHeight;
      }
      await MN.sleep(opts.quiet ? 90 : 230 + Math.random() * 200);
    }

    const pr = 300 + Math.floor(MN.rng(MN.hash(ticket.key))() * 400);
    pat((s) => {
      const t = s.build.tickets.find((x) => x.id === id);
      t.status = 'review';
      t.log = lines;
      t.pr = pr;
    });
    MN.store.log('agent', `${agent.name} completed ${ticket.key} — PR #${pr} open`);
    if (!opts.quiet) MN.toast(`${agent.name} finished`, `${ticket.key} is in review — PR #${pr}.`, 'agent');
  };

  const shipTicket = (id) => {
    const ticket = st().build.tickets.find((x) => x.id === id);
    pat((s) => {
      const t = s.build.tickets.find((x) => x.id === id);
      t.status = 'shipped';
      if (t.component || t.type === 'component') {
        const name = t.component || t.title.replace(/^Build /, '').replace(/ component$/, '');
        if (!s.ship.components.some((c) => c.name === name)) {
          s.ship.components.push({ name, stories: 0, published: false, coverage: 0, diffs: 0, from: t.key });
        }
      }
    });
    MN.store.log('pipeline', `${ticket.key} approved and merged`);
    MN.shell.refresh();
    MN.toast('Merged', `${ticket.key} is shipped.`, 'ok');
  };

  /* =======================================================
     STAGE 5 — SHIP
     ======================================================= */
  const PREVIEWS = {
    Button: '<span class="mini-btn">Continue</span>',
    IconButton: '<span class="mini-btn" style="padding:6px 9px">✦</span>',
    TextField: '<div style="width:100%"><div class="mini-bar" style="width:34%;margin-bottom:6px"></div><div class="mini-input"></div></div>',
    Select: '<div class="mini-input" style="display:flex;align-items:center;justify-content:flex-end;padding-right:8px;font-size:9px;color:var(--ink-mute)">▾</div>',
    Toggle: '<span class="mini-toggle"></span>',
    Card: '<div class="mini-card"><div class="mini-bar" style="width:60%"></div><div class="mini-bar"></div></div>',
    Badge: '<span class="mini-badge">Active</span>',
    Avatar: '<span class="mini-avatars"><i></i><i></i><i></i></span>',
    Table: '<div style="width:100%"><div class="mini-bar" style="width:100%"></div><div class="mini-bar" style="width:88%"></div><div class="mini-bar" style="width:94%"></div></div>',
    EmptyState: '<div class="center"><div style="font-size:16px;opacity:.4">◍</div><div class="mini-bar" style="width:54px;margin:6px auto 0"></div></div>',
    Skeleton: '<div style="width:100%"><div class="mini-bar" style="width:100%"></div><div class="mini-bar"></div></div>'
  };

  const previewFor = (name) => PREVIEWS[name]
    || (/chart|graph|metric/i.test(name) ? '<div style="width:100%;display:flex;align-items:flex-end;gap:4px;height:44px">'
        + [60, 34, 78, 46, 88].map((h) => `<span style="flex:1;height:${h}%;background:var(--accent);opacity:.75;border-radius:3px 3px 0 0"></span>`).join('') + '</div>'
    : /card|row|tile|cell/i.test(name) ? PREVIEWS.Card
    : /input|field|picker|composer/i.test(name) ? PREVIEWS.TextField
    : /badge|pill|flag|status/i.test(name) ? PREVIEWS.Badge
    : `<span class="mini-badge" style="background:var(--surface-3);color:var(--ink-mute)">${esc(name)}</span>`);

  const renderShip = () => {
    const s = st();
    const host = $('#shipOut');
    const d = s.design;
    const shipped = s.build.tickets.filter((t) => t.status === 'shipped');

    // Everything the design specified, annotated with what has actually shipped.
    const catalogue = (d ? d.components : []).map((c) => {
      const live = s.ship.components.find((x) => x.name === c.name);
      return { ...c, live: !!live, stories: live ? live.stories : 0, published: live ? live.published : false, diffs: live ? live.diffs : 0 };
    });
    const published = catalogue.filter((c) => c.published);
    const coverage = catalogue.length ? Math.round((published.length / catalogue.length) * 100) : 0;

    host.innerHTML = `
      <div class="row-between" style="margin-bottom:18px;align-items:flex-start">
        <div>
          <h2 style="margin-bottom:4px">Ship to Storybook</h2>
          <p class="small muted" style="margin:0">
            Reviewed components publish with a story per variant and run against the visual baseline.
          </p>
        </div>
        <div class="row-wrap">
          <button class="btn btn-ghost btn-sm" data-conn-sb>
            ${conn().storybook ? 'Storybook connected' : 'Connect Storybook'}
          </button>
          <button class="btn btn-primary btn-sm" id="publishAll"
            ${catalogue.some((c) => c.live && !c.published) ? '' : 'disabled'}>Publish ready components</button>
        </div>
      </div>

      <div class="grid g4" style="margin-bottom:22px">
        <div class="tile"><p class="tile-label">Components specified</p><p class="tile-value">${catalogue.length}</p>
          <p class="tile-note">${catalogue.filter((c) => c.kind === 'domain').length} domain, ${catalogue.filter((c) => c.kind === 'foundation').length} foundation</p></div>
        <div class="tile"><p class="tile-label">Built &amp; merged</p><p class="tile-value">${catalogue.filter((c) => c.live).length}</p>
          <p class="tile-note">${shipped.length} tickets merged in total</p></div>
        <div class="tile"><p class="tile-label">Published</p><p class="tile-value">${published.length}</p>
          <p class="tile-note">${published.reduce((a, c) => a + c.stories, 0)} stories live</p></div>
        <div class="tile"><p class="tile-label">Story coverage</p><p class="tile-value">${coverage}<small>%</small></p>
          <p class="tile-note ${coverage >= 85 ? 'down' : 'up'}">${coverage >= 85 ? 'Above the 85% bar' : `${85 - coverage} points below the bar`}</p></div>
      </div>

      ${catalogue.length && !catalogue.some((c) => c.live) ? `
        <div class="note" style="margin-bottom:20px">
          <span class="note-ico">ℹ</span>
          <div>
            Nothing is ready to publish yet. Components reach Storybook by being built on the
            board — run an agent on a <b>component</b> ticket, then approve its pull request.
            Screen tickets ship as features and do not produce a published component.
          </div>
        </div>` : ''}

      ${catalogue.length ? `
        <div class="sb-grid">
          ${catalogue.map((c) => `
            <div class="sb-item">
              <div class="sb-canvas">${previewFor(c.name)}</div>
              <div class="sb-meta">
                <b>${esc(c.name)}</b>
                <span>${c.variants} variants</span>
                <div class="sb-tags">
                  ${c.published
                    ? `<span class="badge good">Published</span><span class="badge">${c.stories} stories</span>
                       ${c.diffs ? `<span class="badge medium">${c.diffs} diffs</span>` : '<span class="badge low">No diffs</span>'}`
                    : c.live ? '<span class="badge medium">Ready to publish</span>'
                    : '<span class="badge">Specified</span>'}
                </div>
              </div>
            </div>`).join('')}
        </div>` : `
        <div class="empty">
          <h4>Nothing to ship yet</h4>
          <p>Generate the product design and merge component tickets on the build board first.</p>
        </div>`}`;

    const sb = host.querySelector('[data-conn-sb]');
    if (sb) sb.addEventListener('click', () => {
      MN.store.patch((x) => { x.connectors.storybook = !x.connectors.storybook; });
      MN.shell.refresh();
      renderShip();
    });

    const pub = $('#publishAll');
    if (pub) pub.addEventListener('click', async () => {
      if (!conn().storybook) {
        MN.toast('Connect Storybook first', 'Publishing needs the connector enabled.', 'warn');
        return;
      }
      pub.disabled = true;
      pub.textContent = 'Publishing…';
      await MN.sleep(1200);
      pat((x) => {
        x.ship.components.forEach((c) => {
          if (c.published) return;
          const spec = (x.design.components || []).find((k) => k.name === c.name);
          const r = MN.rng(MN.hash(c.name));
          c.published = true;
          c.stories = spec ? spec.variants : 3;
          c.diffs = r() > 0.7 ? 1 : 0;
        });
        x.ship.published = x.ship.components.filter((c) => c.published).length;
      });
      MN.store.log('ship', `${st().ship.published} components published to Storybook`);
      MN.shell.refresh();
      paintStepper();
      renderShip();
      MN.toast('Published', `${st().ship.published} components are live in Storybook.`, 'ok');
    });
  };

  /* =======================================================
     Boot
     ======================================================= */
  $('#resetPipeline').addEventListener('click', () => {
    MN.modal({
      title: 'Reset the pipeline',
      sub: 'This clears research, viability, design, tickets and shipped components.',
      body: '<p>The design debt report and your workflows are not affected.</p>',
      foot: `<button class="btn btn-ghost" data-close>Cancel</button>
             <button class="btn btn-accent" id="doReset">Reset pipeline</button>`,
      onMount: (root) => root.querySelector('#doReset').addEventListener('click', () => {
        MN.store.patch((s) => {
          s.pipeline = {
            stage: 'research', product: null,
            research: { signals: [], synthesis: null },
            viability: null, design: null,
            build: { tickets: [], sprint: 1 },
            ship: { components: [], published: 0 }
          };
        });
        MN.closeModal();
        window.location.reload();
      })
    });
  });

  restoreBrief();
  paintStepper();
  STAGES.forEach((s) => $('#stage-' + s.key).classList.toggle('hidden', s.key !== current));
  render(current);

  if (MN.sub === 'build' && reached('build')) goto('build');
})();
