/* =========================================================
   MN Studio — Figma audit (journey three)
   Read a file → structural audit + debt score → tokenisation
   and consolidation plans → hand off into the pipeline.
   ========================================================= */
(() => {
  'use strict';

  const MN = window.MN;
  const F = MN.Figma;
  const { esc, fmt } = MN;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const views = { connect: $('#connect'), scanning: $('#scanning'), result: $('#result') };
  const show = (name) => {
    Object.entries(views).forEach(([k, el]) => el.classList.toggle('hidden', k !== name));
    ['#newFile', '#handoffBtn'].forEach((sel) => $(sel).classList.toggle('hidden', name !== 'result'));
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  /* -------------------------------------------------------
     Sample files
     ------------------------------------------------------- */
  $('#sampleList').innerHTML = F.SAMPLES.map((s) => `
    <button class="conn" data-sample="${esc(s.key)}" style="width:100%;text-align:left;cursor:pointer;font:inherit">
      <span class="conn-logo figma">F</span>
      <span class="conn-body grow">
        <b>${esc(s.name)}</b>
        <span>${esc(s.team)} · ${esc(s.note)}</span>
      </span>
      <span class="badge ${s.health === 'good' ? 'good' : s.health === 'mixed' ? 'medium' : 'critical'}">${esc(s.health)}</span>
    </button>`).join('');

  $$('[data-sample]').forEach((b) => b.addEventListener('click', () => run({ key: b.dataset.sample })));

  $('#readBtn').addEventListener('click', () => {
    const url = $('#figUrl').value.trim();
    if (!url) { MN.toast('Add a file URL', 'Or pick one of the example files below.', 'warn'); return; }
    const m = url.match(/figma\.com\/(?:file|design)\/([A-Za-z0-9]+)(?:\/([^/?#]+))?/);
    run({ url, key: m ? m[1] : undefined, name: m && m[2] ? decodeURIComponent(m[2]).replace(/-/g, ' ') : undefined });
  });

  /* -------------------------------------------------------
     Run
     ------------------------------------------------------- */
  const overrides = () => ({
    designers: Number($('#fDesigners').value),
    engineers: Number($('#fEngineers').value),
    stage: $('#fStage').value,
    rate: Number($('#fRate').value)
  });

  const run = async (input) => {
    const file = F.parse(input);
    const ctx = F.deriveContext(file, overrides());
    const report = MN.DebtEngine.analyze({
      kind: 'figma',
      source: file.key,
      label: file.name,
      context: ctx
    });

    show('scanning');
    $('#connState').textContent = 'Connected';
    $('#scanTarget').textContent = file.name;

    const steps = report.scanSteps;
    const list = $('#scanSteps');
    list.innerHTML = steps.map((s) => `
      <div class="scan-step"><span class="dot">✓</span><span class="grow">${esc(s)}</span><span class="t"></span></div>`).join('');
    const rows = $$('.scan-step', list);
    for (let i = 0; i < rows.length; i++) {
      rows[i].classList.add('run');
      const t0 = performance.now();
      await MN.sleep(520 + Math.random() * 560);
      rows[i].classList.replace('run', 'done');
      rows[i].querySelector('.t').textContent = ((performance.now() - t0) / 1000).toFixed(1) + 's';
      $('#scanFill').style.width = ((i + 1) / rows.length * 100) + '%';
    }
    await MN.sleep(300);

    const audit = F.audit(file);
    const plan = F.tokenPlan(file);
    const clusters = F.consolidation(file);

    MN.store.set('figma', { file, report, audit, plan, clusters });
    MN.store.log('figma', `Audited ${file.name} — index ${report.index}, ${audit.length} file findings`);
    MN.shell.refresh();

    render();
    MN.toast('File audited', `${audit.length} file findings · debt index ${report.index}`, 'ok');
  };

  /* -------------------------------------------------------
     Render
     ------------------------------------------------------- */
  const render = () => {
    const saved = MN.store.get('figma');
    if (!saved) { show('connect'); return; }
    const { file, report, audit, plan, clusters } = saved;
    const s = file.stats;

    const stat = (label, value, note) => `
      <div class="tile">
        <p class="tile-label">${esc(label)}</p>
        <p class="tile-value">${value}</p>
        <p class="tile-note">${note}</p>
      </div>`;

    views.result.innerHTML = `
      <div class="card" style="margin-bottom:18px">
        <div class="card-body" style="display:flex;gap:20px;align-items:center;flex-wrap:wrap">
          <span class="conn-logo figma" style="width:52px;height:52px;border-radius:14px;font-size:20px">F</span>
          <div class="grow" style="min-width:260px">
            <h2 style="margin:0 0 4px">${esc(file.name)}</h2>
            <p class="small muted" style="margin:0">
              ${esc(file.team)} · ${s.pages} pages · ${fmt.int(s.frames)} frames ·
              ${fmt.int(s.components)} components · edited ${fmt.when(file.lastModified)}
            </p>
            ${file.note ? `<p class="small" style="margin:8px 0 0">${esc(file.note)}</p>` : ''}
          </div>
          <div class="row-wrap">
            <span class="chip">Debt index <b>${report.index}</b></span>
            <span class="badge ${report.band.key === 'good' ? 'good' : report.band.key}">${esc(report.band.label)}</span>
          </div>
        </div>
      </div>

      <div class="grid g4" style="margin-bottom:22px">
        ${stat('Library adoption', `${s.libraryAdoption}<small>%</small>`,
          `${fmt.int(s.instances)} instances, ${fmt.int(s.detached)} detached`)}
        ${stat('Detach rate', `${s.detachRate}<small>%</small>`,
          s.detachRate > 18 ? '<span style="color:var(--critical)">Well above the 10% bar</span>' : 'Within a workable range')}
        ${stat('Variables', fmt.int(s.variables),
          s.variables ? `against ${fmt.int(s.rawFills)} raw fills` : 'none — every value is raw or a local style')}
        ${stat('Auto layout', `${s.autoLayoutPct}<small>%</small>`,
          `${s.orphanFrames} orphan frames · ${s.untouchedPages} stale pages`)}
      </div>

      <div class="tabs" data-tabs role="tablist" aria-label="Audit output">
        <button class="tab" role="tab" id="t-file" aria-controls="p-file" aria-selected="true">
          File findings <span class="badge" style="margin-left:6px">${audit.length}</span>
        </button>
        <button class="tab" role="tab" id="t-tokens" aria-controls="p-tokens" aria-selected="false">Tokenisation plan</button>
        <button class="tab" role="tab" id="t-cons" aria-controls="p-cons" aria-selected="false">
          Consolidation <span class="badge" style="margin-left:6px">${clusters.length}</span>
        </button>
        <button class="tab" role="tab" id="t-pages" aria-controls="p-pages" aria-selected="false">File structure</button>
        <button class="tab" role="tab" id="t-debt" aria-controls="p-debt" aria-selected="false">Full debt report</button>
      </div>

      <!-- file findings -->
      <div class="panel" id="p-file" role="tabpanel">
        <p class="small muted" style="margin-bottom:14px">
          Debt that only exists inside the design file — it never reaches a browser, so a live-product
          crawl cannot see it.
        </p>
        ${audit.map((f) => `
          <div class="finding">
            <button class="finding-head" aria-expanded="false">
              <span class="finding-sev ${esc(f.severity)}"></span>
              <span class="grow">
                <span class="finding-title">${esc(f.title)}</span>
                <span class="finding-meta">
                  <span class="mono">${esc(f.id)}</span>
                  <span>${esc(f.metric)}</span>
                  <span>${f.effort} person-days</span>
                </span>
              </span>
              <span class="badge ${esc(f.severity)} dot">${esc(MN.SEVERITY[f.severity].label)}</span>
              <span class="finding-caret">›</span>
            </button>
            <div class="finding-body" hidden>
              <p style="max-width:74ch">${esc(f.why)}</p>
              <h5>Remediation</h5>
              <ul class="fix-list">${f.fixes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
            </div>
          </div>`).join('')}
      </div>

      <!-- tokenisation -->
      <div class="panel" id="p-tokens" role="tabpanel" hidden>
        <div class="grid g-side">
          <div class="stack-lg">
            <div class="card">
              <div class="card-head">
                <div>
                  <h3>From ${plan.before.values} values to ${plan.after.primitives + plan.after.semantic}</h3>
                  <p class="sub">A ${plan.reduction}% reduction in distinct values, with nothing losing its meaning.</p>
                </div>
                <span class="badge good">−${plan.reduction}%</span>
              </div>
              <div class="card-body">
                <div class="table-wrap">
                  <table class="tbl">
                    <thead><tr><th>Collection</th><th>Tokens</th><th>What it holds</th></tr></thead>
                    <tbody>
                      ${plan.collections.map((c) => `
                        <tr>
                          <td><span class="t-main mono">${esc(c.name)}</span></td>
                          <td class="num">${c.count}</td>
                          <td>${esc(c.note)}</td>
                        </tr>`).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-head"><h4>Migration sequence</h4></div>
              <div class="card-body">
                <div class="flow">
                  ${plan.steps.map((step, i) => `
                    <div class="flow-node">
                      <span class="flow-ico">${i + 1}</span>
                      <span class="grow"><span class="flow-name">${esc(step)}</span></span>
                    </div>
                    ${i < plan.steps.length - 1 ? '<div class="flow-link"></div>' : ''}`).join('')}
                </div>
              </div>
            </div>
          </div>

          <aside class="stack-lg">
            <div class="card card-pad">
              <p class="eyebrow">Before</p>
              <div class="stack small">
                <div class="row-between"><span>Raw fills &amp; colour styles</span><b class="strong">${plan.before.values}</b></div>
                <div class="row-between"><span>Variables</span><b class="strong">${plan.before.variables || 'none'}</b></div>
                <div class="row-between"><span>Text styles</span><b class="strong">${plan.before.textStyles}</b></div>
              </div>
              <hr>
              <p class="eyebrow">After</p>
              <div class="stack small">
                <div class="row-between"><span>Primitive colour</span><b class="strong">${plan.after.primitives}</b></div>
                <div class="row-between"><span>Semantic colour</span><b class="strong">${plan.after.semantic}</b></div>
                <div class="row-between"><span>Text styles</span><b class="strong">${plan.after.textStyles}</b></div>
                <div class="row-between"><span>Spacing / radius</span><b class="strong">${plan.after.spacing} / ${plan.after.radius}</b></div>
              </div>
            </div>
            <div class="note ok">
              <span class="note-ico">✓</span>
              <div>Both collections export as CSS custom properties, so the file and the repository end up speaking the same vocabulary.</div>
            </div>
          </aside>
        </div>
      </div>

      <!-- consolidation -->
      <div class="panel" id="p-cons" role="tabpanel" hidden>
        ${clusters.length ? `
          <p class="small muted" style="margin-bottom:14px">
            ${clusters.length} clusters of near-duplicate components.
            Canonical picked by instance count, not by which was made last.
          </p>
          <div class="stack">
            ${clusters.map((c) => `
              <div class="card card-pad">
                <div class="row-between" style="margin-bottom:12px;flex-wrap:wrap;gap:10px">
                  <div>
                    <span class="mono tiny muted">${esc(c.id)}</span>
                    <h4 style="margin:2px 0 0">${esc(c.canonical)}</h4>
                  </div>
                  <div class="row-wrap">
                    <span class="chip">${fmt.int(c.instances)} instances</span>
                    <span class="chip">${c.effort}d</span>
                  </div>
                </div>
                <div class="row-wrap">
                  <span class="badge good">Keep · ${esc(c.keep)}</span>
                  ${c.retire.map((x) => `<span class="badge critical">Retire · ${esc(x.name)} (${x.instances})</span>`).join('')}
                </div>
              </div>`).join('')}
          </div>` : `
          <div class="empty"><h4>No duplicate clusters</h4>
            <p>Every component in this file is distinct. That is unusual and worth protecting.</p></div>`}
      </div>

      <!-- structure -->
      <div class="panel" id="p-pages" role="tabpanel" hidden>
        <div class="table-wrap card">
          <table class="tbl">
            <thead><tr><th>Page</th><th>Frames</th><th>Components</th><th>Last touched</th><th>Status</th></tr></thead>
            <tbody>
              ${file.pages.map((p) => `
                <tr>
                  <td><span class="t-main">${esc(p.name)}</span></td>
                  <td class="num">${p.frames}</td>
                  <td class="num">${p.components || '—'}</td>
                  <td class="num">${p.lastTouched}d ago</td>
                  <td>${p.lastTouched > 120
                    ? '<span class="badge medium">Stale</span>'
                    : /archive|wip|exploration/i.test(p.name)
                      ? '<span class="badge">Not for build</span>'
                      : '<span class="badge good">Live</span>'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- full debt report -->
      <div class="panel" id="p-debt" role="tabpanel" hidden>
        <div class="note" style="margin-bottom:18px">
          <span class="note-ico">ℹ</span>
          <div>
            Scored on the same eight dimensions as a live product, so a Figma audit and a
            production crawl are directly comparable. Surface count, system maturity and token
            coverage were read from the file rather than declared.
          </div>
        </div>
        <div id="debtHost"></div>
      </div>`;

    MN.bindTabs(views.result);
    MN.bindAccordions(views.result);
    MN.renderReport($('#debtHost'), report);
    show('result');
  };

  /* -------------------------------------------------------
     Header actions
     ------------------------------------------------------- */
  $('#newFile').addEventListener('click', () => {
    MN.store.set('figma', null);
    MN.shell.refresh();
    $('#connState').textContent = 'Not connected';
    show('connect');
  });

  $('#handoffBtn').addEventListener('click', () => {
    const saved = MN.store.get('figma');
    if (!saved) return;
    const existing = MN.store.get('pipeline.design');

    MN.modal({
      title: 'Continue in the product pipeline',
      sub: 'Carry the file into the design stage and build from there.',
      body: `
        <p>This seeds the pipeline's design stage from <b class="strong">${esc(saved.file.name)}</b> —
        the consolidated component set, the token collections, and the screens worth building —
        and creates the tickets to get there.</p>
        ${existing ? `
          <div class="note warn" style="margin-top:14px">
            <span class="note-ico">!</span>
            <div>The pipeline already holds a generated design. Continuing replaces it.</div>
          </div>` : ''}
        <div class="field" style="margin:18px 0 0">
          <span class="field-label">Also create tickets for</span>
          <div class="choices c2">
            <label class="choice"><input type="checkbox" id="hoFile" checked>
              <b>File findings</b><span>${saved.audit.length} Figma-native fixes</span></label>
            <label class="choice"><input type="checkbox" id="hoDebt" checked>
              <b>Debt findings</b><span>${saved.report.findings.length} from the debt report</span></label>
          </div>
        </div>`,
      foot: `<button class="btn btn-ghost" data-close>Cancel</button>
             <button class="btn btn-primary" id="doHandoff">Continue in the pipeline</button>`,
      onMount: (root) => {
        root.querySelector('#doHandoff').addEventListener('click', () => {
          const wantFile = root.querySelector('#hoFile').checked;
          const wantDebt = root.querySelector('#hoDebt').checked;
          const design = F.toDesign(saved.file, saved.report);

          const tickets = [];
          if (wantDebt) tickets.push(...MN.DebtEngine.toTickets(saved.report, 'mn'));
          if (wantFile) {
            tickets.push(...saved.audit.map((f, i) => ({
              id: MN.uid('tkt'),
              key: `FIG-${100 + i}`,
              source: 'mn',
              title: f.title,
              body: f.why,
              type: 'chore',
              severity: f.severity,
              points: Math.max(1, Math.round(f.effort / 2)),
              status: 'backlog',
              dimension: 'Design system',
              origin: 'figma',
              fixes: f.fixes,
              agent: null,
              log: []
            })));
          }

          MN.store.patch((s) => {
            s.pipeline.design = design;
            s.pipeline.stage = 'build';
            s.pipeline.product = s.pipeline.product || {
              name: saved.file.name, audience: '', oneLiner: '', problem: 'Imported from Figma.'
            };
            s.connectors.figma = true;
            s.pipeline.build.tickets = [...tickets, ...s.pipeline.build.tickets];
          });
          MN.store.log('figma', `${saved.file.name} handed off to the pipeline with ${tickets.length} tickets`);
          MN.shell.refresh();
          MN.closeModal();
          MN.toast('Handed off', `${tickets.length} tickets created. Opening the pipeline.`, 'ok');
          setTimeout(() => { window.location.href = 'build.html#build'; }, 900);
        });
      }
    });
  });

  /* -------------------------------------------------------
     Restore
     ------------------------------------------------------- */
  if (MN.store.get('figma')) { $('#connState').textContent = 'Connected'; render(); } else { show('connect'); }
})();
