/* =========================================================
   MN Studio — Debt report renderer

   One renderer, two entry points: the live-link / demo-video
   calculator and the Figma audit both produce the same report
   shape, so they share this view.
   ========================================================= */
(() => {
  'use strict';

  const MN = window.MN;
  const { esc, fmt } = MN;

  const sevBadge = (s) => `<span class="badge ${s} dot">${MN.SEVERITY[s].label}</span>`;

  /* ---------- summary ---------- */
  const summary = (rep) => {
    const b = rep.band;
    const e = rep.economics;
    const delta = MN.round(rep.benchmark.peerMedian - rep.index, 1);
    const vsPeer = delta > 0
      ? `<b class="strong">${Math.abs(delta)} points better</b> than the median at ${esc(rep.context.stage)}`
      : `<b class="strong">${Math.abs(delta)} points worse</b> than the median at ${esc(rep.context.stage)}`;

    return `
      <div class="card" style="overflow:hidden">
        <div class="card-body" style="display:flex;gap:34px;align-items:center;flex-wrap:wrap">
          <div class="gauge" data-v="${rep.index}" style="--gc:var(--${b.key === 'good' ? 'good' : b.key})">
            <div class="gauge-inner">
              <div class="gauge-num" id="ddiNum">0</div>
              <div class="gauge-cap">Debt index</div>
            </div>
          </div>

          <div class="grow" style="min-width:280px">
            <div class="row-wrap" style="margin-bottom:10px">
              <span class="grade g-${b.grade.toLowerCase()}">${b.grade}</span>
              <div>
                <h2 style="margin:0 0 2px">${esc(b.label)}</h2>
                <p class="small muted" style="margin:0">
                  ${esc(rep.id)} · ${MN.plural(rep.findings.length, 'finding')} ·
                  ${rep.confidence}% confidence · ${esc(new Date(rep.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }))}
                </p>
              </div>
            </div>
            <p style="max-width:56ch">
              ${esc(rep.label)} carries a debt index of <b class="strong">${rep.index}</b> — ${vsPeer}.
              Paying it down costs <b class="strong">${e.principalDays} person-days</b>; carrying it
              costs <b class="strong">${fmt.money(e.interestPerSprint)} every sprint</b> in lost capacity.
            </p>
            <div class="row-wrap">
              <span class="chip">Source <b>${esc(rep.kind === 'url' ? 'live crawl' : rep.kind === 'video' ? 'demo video' : 'Figma file')}</b></span>
              <span class="chip">${MN.plural(rep.context.surfaces, 'surface')}</span>
              <span class="chip">${MN.plural(rep.context.designers, 'designer')} · ${MN.plural(rep.context.engineers, 'engineer')}</span>
              <span class="chip">${esc(rep.context.system)} design system</span>
            </div>
          </div>
        </div>
      </div>`;
  };

  /* ---------- economics tiles ---------- */
  const tiles = (rep) => {
    const e = rep.economics;
    return `
      <div class="grid g4" style="margin-top:18px">
        <div class="tile">
          <p class="tile-label">Principal</p>
          <p class="tile-value">${fmt.money0(e.principalCost)}</p>
          <p class="tile-note">${e.principalDays} person-days to clear the ledger</p>
        </div>
        <div class="tile">
          <p class="tile-label">Interest / sprint</p>
          <p class="tile-value">${fmt.money0(e.interestPerSprint)}</p>
          <p class="tile-note up">↑ ${fmt.money0(e.annualInterest)} a year if nothing changes</p>
        </div>
        <div class="tile">
          <p class="tile-label">Capacity lost</p>
          <p class="tile-value">${e.velocityDrag}<small>%</small></p>
          <p class="tile-note">of ${MN.plural(e.teamSize, 'person')}' delivery time, ${e.reworkRate}% of work is rework</p>
        </div>
        <div class="tile">
          <p class="tile-label">Payback</p>
          <p class="tile-value">${e.paybackSprints}<small>sprints</small></p>
          <p class="tile-note down">↓ ${e.yearOneRoi}% year-one return on the fix</p>
        </div>
      </div>`;
  };

  /* ---------- benchmark ---------- */
  const benchmark = (rep) => {
    const bm = rep.benchmark;
    const pos = (v) => MN.clamp(v, 2, 98);
    return `
      <div class="card card-pad" style="margin-top:18px">
        <div class="row-between" style="margin-bottom:26px">
          <div>
            <h3 style="margin:0">Where you sit</h3>
            <p class="small muted" style="margin:3px 0 0">Against products at the same stage. Lower is healthier.</p>
          </div>
          <span class="badge ${bm.you <= bm.peerMedian ? 'good' : 'high'}">
            ${bm.you <= bm.peerMedian ? 'Better than median' : 'Worse than median'}
          </span>
        </div>
        <div class="bench">
          <span class="bench-mark ghost" style="left:${pos(bm.topQuartile)}%" data-label="Top quartile ${bm.topQuartile}"></span>
          <span class="bench-mark ghost" style="left:${pos(bm.peerMedian)}%" data-label="Peer median ${bm.peerMedian}"></span>
          <span class="bench-mark" style="left:${pos(bm.you)}%" data-label="You ${bm.you}"></span>
        </div>
        <div class="q-axis" style="margin-top:34px">
          <span>0 · healthy</span><span>50</span><span>100 · critical</span>
        </div>
      </div>`;
  };

  /* ---------- dimensions ---------- */
  const dimensions = (rep) => `
    <div class="card">
      <div class="card-head">
        <div>
          <h3>Where the debt sits</h3>
          <p class="sub">Eight weighted dimensions. The weight is how much each moves the index.</p>
        </div>
      </div>
      <div class="card-body">
        <div class="meters">
          ${rep.dimensions.map((d) => `
            <div class="meter-row" data-dim="${d.key}" tabindex="0" role="button"
                 aria-label="Filter findings by ${esc(d.name)}">
              <div class="meter-top">
                <span class="meter-name">${esc(d.name)} <span class="w">${Math.round(d.weight * 100)}%</span></span>
                <span class="meter-score">${d.score} <span class="muted" style="font-weight:500">
                  · ${MN.plural(d.findings, 'finding')}</span></span>
              </div>
              <div class="meter-track">
                <div class="meter-fill ${d.band.key}" data-v="${d.score}"></div>
              </div>
              <p class="meter-foot">${esc(d.blurb)}</p>
            </div>`).join('')}
        </div>
      </div>
    </div>`;

  /* ---------- impact / effort quadrant ---------- */
  const quadrant = (rep) => {
    const maxEffort = Math.max(...rep.findings.map((f) => f.effort), 1);
    return `
      <div class="card">
        <div class="card-head">
          <div>
            <h3>Impact against effort</h3>
            <p class="sub">Top-left is where to start. Hover a dot for the finding.</p>
          </div>
        </div>
        <div class="card-body">
          <div style="display:flex;gap:10px">
            <div class="q-axis-y">Business impact →</div>
            <div class="grow">
              <div class="quadrant">
                <span class="q-label q-tl">Quick wins</span>
                <span class="q-label q-tr">Major projects</span>
                <span class="q-label q-bl">Fill-ins</span>
                <span class="q-label q-br">Reconsider</span>
                ${rep.findings.map((f) => `
                  <button class="q-dot ${f.severity}" data-finding="${f.id}"
                    style="left:${MN.clamp((f.effort / maxEffort) * 92 + 4, 4, 96)}%;bottom:${MN.clamp(f.impact * 0.9 + 4, 4, 94)}%"
                    title="${esc(f.id)} · ${esc(f.title)} — impact ${f.impact}, ${f.effort}d"
                    aria-label="${esc(f.title)}"></button>`).join('')}
              </div>
              <div class="q-axis"><span>Low effort</span><span>Effort →</span><span>${maxEffort}d</span></div>
            </div>
          </div>
        </div>
      </div>`;
  };

  /* ---------- findings ---------- */
  const findingCard = (f) => `
    <div class="finding" data-id="${f.id}" data-sev="${f.severity}" data-dim="${f.dimension}">
      <button class="finding-head" aria-expanded="false">
        <span class="finding-sev ${f.severity}"></span>
        <span class="grow">
          <span class="finding-title">${esc(f.title)}</span>
          <span class="finding-meta">
            <span class="mono">${esc(f.id)}</span>
            <span>${esc(f.dimensionName)}</span>
            <span>Impact ${f.impact}/100</span>
            <span>${f.effort} person-days</span>
            <span>${esc(f.owner)}</span>
          </span>
        </span>
        ${sevBadge(f.severity)}
        <span class="finding-caret">›</span>
      </button>
      <div class="finding-body" hidden>
        <p style="margin-bottom:18px;max-width:74ch">${esc(f.why)}</p>
        <div class="finding-grid">
          <div>
            <h5>Evidence</h5>
            <ul class="evidence">
              ${f.evidence.map((e) => `
                <li><span class="k">${esc(e.label)}</span>: ${esc(e.value)}${e.measured ? '' : ' <span class="muted">(observed)</span>'}</li>
              `).join('')}
            </ul>
            <p class="tiny muted" style="margin-top:9px">
              Confidence ${f.confidence}%. Entries marked <em>observed</em> come from the scan;
              the rest from the context you declared.
            </p>
          </div>
          <div>
            <h5>Remediation</h5>
            <ul class="fix-list">${f.fixes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          </div>
        </div>
      </div>
    </div>`;

  const findings = (rep) => {
    const counts = ['critical', 'high', 'medium', 'low']
      .map((s) => [s, rep.findings.filter((f) => f.severity === s).length])
      .filter(([, n]) => n);

    return `
      <div class="section-head" id="findings">
        <div>
          <h2>Findings</h2>
          <p class="small muted" style="margin:2px 0 0">
            ${MN.plural(rep.findings.length, 'finding')} ranked by impact, then by how cheap they are to fix.
          </p>
        </div>
        <div class="row-wrap">
          <button class="btn btn-ghost btn-sm" id="expandAll">Expand all</button>
        </div>
      </div>

      <div class="filters" id="findingFilters">
        <span class="tiny muted" style="font-weight:700;letter-spacing:.08em;text-transform:uppercase">Severity</span>
        <button class="filter-btn" data-filter="all" aria-pressed="true">All ${rep.findings.length}</button>
        ${counts.map(([s, n]) => `<button class="filter-btn" data-filter="${s}" aria-pressed="false">${MN.SEVERITY[s].label} ${n}</button>`).join('')}
        <span style="flex:1"></span>
        <button class="filter-btn" data-filter="quick" aria-pressed="false">⚡ Quick wins ${rep.quickWins.length}</button>
        <button class="btn btn-quiet btn-sm hidden" id="clearDim">Clear dimension filter ✕</button>
      </div>

      <div id="findingList">${rep.findings.map(findingCard).join('')}</div>`;
  };

  /* ---------- strategy ---------- */
  const strategy = (rep) => `
    <div class="section-head" id="strategy">
      <div>
        <h2>Refactoring strategy</h2>
        <p class="small muted" style="margin:2px 0 0">
          Sequenced so each wave frees the capacity that funds the next.
          A squad of ${rep.roadmap[0] ? rep.roadmap[0].squad : 2} against a
          ${MN.plural(rep.economics.teamSize, 'person')} team.
        </p>
      </div>
      <span class="badge good">Index ${rep.index} → ${rep.projectedIndex} projected</span>
    </div>

    <div class="card card-pad">
      ${rep.roadmap.map((w, i) => `
        <div class="wave">
          <span class="wave-dot">${i + 1}</span>
          <div class="wave-head">
            <h4>${esc(w.name)}</h4>
            <span class="badge">${w.weeks} ${w.weeks === 1 ? 'week' : 'weeks'}</span>
            <span class="badge">${w.days} person-days</span>
            <span class="badge good">−${w.reduction} index</span>
          </div>
          <p class="wave-goal">${esc(w.goal)}</p>
          <div class="wave-items">
            ${w.items.map((f) => `
              <div class="wave-item">
                <span class="finding-sev ${f.severity}" style="height:20px;align-self:center"></span>
                <span class="mono tiny muted">${esc(f.id)}</span>
                <span class="wi-title">${esc(f.title)}</span>
                <span class="wi-meta">
                  <span>${f.effort}d</span>
                  <span class="badge ${f.severity}">${MN.SEVERITY[f.severity].label}</span>
                </span>
              </div>`).join('')}
          </div>
          <p class="small" style="margin-top:12px">
            <b class="strong">Outcome.</b> ${esc(w.outcome)}
            Debt index falls to <b class="strong">${w.indexAfter}</b>.
          </p>
        </div>`).join('')}
    </div>`;

  /* ---------- economics detail ---------- */
  const economics = (rep) => {
    const e = rep.economics;
    return `
      <div class="section-head" id="economics"><h2>The economics</h2></div>
      <div class="grid g-side">
        <div class="card">
          <div class="card-head"><h3>How the cost is derived</h3></div>
          <div class="table-wrap">
            <table class="tbl">
              <thead><tr><th>Measure</th><th>Value</th><th>How it is calculated</th></tr></thead>
              <tbody>
                <tr>
                  <td><span class="t-main">Principal</span></td>
                  <td class="num">${e.principalDays}d · ${fmt.money(e.principalCost)}</td>
                  <td>Sum of remediation effort across all ${rep.findings.length} findings, at ${fmt.money(e.rate)}/day.</td>
                </tr>
                <tr>
                  <td><span class="t-main">Velocity drag</span></td>
                  <td class="num">${e.velocityDrag}%</td>
                  <td>Share of delivery capacity spent working around the debt. Compounds non-linearly with the index.</td>
                </tr>
                <tr>
                  <td><span class="t-main">Interest per sprint</span></td>
                  <td class="num">${fmt.money(e.interestPerSprint)}</td>
                  <td>${e.velocityDrag}% of ${e.sprintDays} person-days per two-week sprint, at ${fmt.money(e.rate)}/day.</td>
                </tr>
                <tr>
                  <td><span class="t-main">Annualised interest</span></td>
                  <td class="num">${fmt.money(e.annualInterest)}</td>
                  <td>26 sprints of carrying the debt unchanged.</td>
                </tr>
                <tr>
                  <td><span class="t-main">Rework rate</span></td>
                  <td class="num">${e.reworkRate}%</td>
                  <td>Proportion of shipped work that gets revisited because the foundation moved.</td>
                </tr>
                <tr>
                  <td><span class="t-main">Payback</span></td>
                  <td class="num">${e.paybackSprints} sprints</td>
                  <td>Principal divided by the interest each sprint stops costing once it is paid.</td>
                </tr>
                <tr>
                  <td><span class="t-main">Year-one ROI</span></td>
                  <td class="num">${e.yearOneRoi}%</td>
                  <td>Annual interest avoided against the one-off principal.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="stack-lg">
          <div class="card card-quiet card-pad">
            <p class="eyebrow">Assumptions</p>
            <ul class="fix-list small">
              <li>Two-week sprints, ${MN.plural(e.teamSize, 'person')} on the product.</li>
              <li>${fmt.money(e.rate)} fully-loaded blended day rate.</li>
              <li>Remediation runs alongside feature work, not instead of it.</li>
              <li>Interest is capacity lost, not revenue lost — the revenue case sits on top of this.</li>
            </ul>
          </div>
          <div class="note warn">
            <span class="note-ico">!</span>
            <div>
              <b>Read the ROI carefully.</b> A high return here reflects a large team losing a
              steady share of its capacity. It is an argument for sequencing the work, not for
              stopping feature delivery to do all of it at once.
            </div>
          </div>
        </div>
      </div>`;
  };

  /* ---------- provenance ---------- */
  const provenance = (rep) => `
    <div class="card card-sunk card-pad no-print" style="margin-top:26px">
      <div class="row-between" style="align-items:flex-start;gap:20px">
        <div style="max-width:72ch">
          <p class="eyebrow">How this report was produced</p>
          <p class="small" style="margin:0">
            The model scored eight weighted dimensions from the context you declared and
            ${MN.plural(Object.keys(rep.observed).length, 'signal')} from the
            ${esc(rep.kind === 'url' ? 'crawl' : rep.kind === 'video' ? 'video pass' : 'Figma read')}.
            In this prototype those scan signals are synthesised deterministically from the source —
            report <span class="mono">${esc(rep.id)}</span> will reproduce exactly for
            <span class="mono">${esc(rep.source)}</span>. Findings mark which numbers are declared
            and which are observed.
          </p>
        </div>
        <button class="btn btn-ghost btn-sm" id="rawBtn">View raw signals</button>
      </div>
    </div>`;

  /* -------------------------------------------------------
     Mount + interactions
     ------------------------------------------------------- */
  MN.renderReport = (host, rep) => {
    host.innerHTML = `
      ${summary(rep)}
      ${tiles(rep)}
      ${benchmark(rep)}
      <div class="grid g-side" style="margin-top:18px">${dimensions(rep)}${quadrant(rep)}</div>
      ${findings(rep)}
      ${strategy(rep)}
      ${economics(rep)}
      ${provenance(rep)}`;

    MN.paintMeters(host);
    MN.bindAccordions(host);
    const num = host.querySelector('#ddiNum');
    if (num) MN.countTo(num, rep.index, { duration: 1100, decimals: 1 });

    /* severity + quick-win filters */
    let sevFilter = 'all';
    let dimFilter = null;

    const apply = () => {
      const quickIds = new Set(rep.quickWins.map((f) => f.id));
      host.querySelectorAll('.finding').forEach((el) => {
        const okSev = sevFilter === 'all' ? true
          : sevFilter === 'quick' ? quickIds.has(el.dataset.id)
          : el.dataset.sev === sevFilter;
        const okDim = !dimFilter || el.dataset.dim === dimFilter;
        el.classList.toggle('hidden', !(okSev && okDim));
      });
      const clear = host.querySelector('#clearDim');
      if (clear) clear.classList.toggle('hidden', !dimFilter);
    };

    host.querySelectorAll('#findingFilters .filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        sevFilter = btn.dataset.filter;
        host.querySelectorAll('#findingFilters .filter-btn').forEach((b) => {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        apply();
      });
    });

    const setDim = (key) => {
      dimFilter = dimFilter === key ? null : key;
      apply();
      if (dimFilter) {
        host.querySelector('#findings').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    host.querySelectorAll('.meter-row').forEach((row) => {
      row.addEventListener('click', () => setDim(row.dataset.dim));
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDim(row.dataset.dim); }
      });
    });

    const clearBtn = host.querySelector('#clearDim');
    if (clearBtn) clearBtn.addEventListener('click', () => { dimFilter = null; apply(); });

    /* quadrant dot → open that finding */
    host.querySelectorAll('.q-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        const el = host.querySelector(`.finding[data-id="${dot.dataset.finding}"]`);
        if (!el) return;
        sevFilter = 'all'; dimFilter = null;
        host.querySelectorAll('#findingFilters .filter-btn').forEach((b) => {
          b.setAttribute('aria-pressed', String(b.dataset.filter === 'all'));
        });
        apply();
        if (!el.classList.contains('open')) el.querySelector('.finding-head').click();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });

    /* expand all */
    const expandBtn = host.querySelector('#expandAll');
    if (expandBtn) {
      expandBtn.addEventListener('click', () => {
        const anyClosed = [...host.querySelectorAll('.finding:not(.hidden)')].some((f) => !f.classList.contains('open'));
        host.querySelectorAll('.finding:not(.hidden)').forEach((f) => {
          if (f.classList.contains('open') !== anyClosed) return;
          f.querySelector('.finding-head').click();
        });
        expandBtn.textContent = anyClosed ? 'Collapse all' : 'Expand all';
      });
    }

    /* raw signals */
    const rawBtn = host.querySelector('#rawBtn');
    if (rawBtn) {
      rawBtn.addEventListener('click', () => {
        const rows = Object.entries(rep.observed)
          .map(([k, v]) => `<tr><td class="mono">${esc(k)}</td><td class="num">${esc(v)}</td></tr>`).join('');
        MN.modal({
          title: 'Raw scan signals',
          sub: `${rep.id} · seeded from ${rep.source}`,
          body: `<div class="table-wrap"><table class="tbl">
            <thead><tr><th>Signal</th><th>Value</th></tr></thead><tbody>${rows}</tbody></table></div>
            <p class="tiny muted" style="margin-top:14px">
              These are the values a real crawler, vision pass or Figma read would return.
              Here they are synthesised deterministically from the source string and your context.
            </p>`
        });
      });
    }
  };
})();
