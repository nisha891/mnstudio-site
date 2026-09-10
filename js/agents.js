/* =========================================================
   MN Studio — Agents & custom workflows
   The agent roster, a workflow composer, connections and
   the workspace activity log.
   ========================================================= */
(() => {
  'use strict';

  const MN = window.MN;
  const P = MN.Pipeline;
  const { esc, fmt } = MN;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* -------------------------------------------------------
     Node vocabulary
     ------------------------------------------------------- */
  const TRIGGERS = {
    schedule: { label: 'On a schedule', icon: '⏱', detail: 'Every night at 02:00 UTC' },
    figma: { label: 'Figma library published', icon: '🎨', detail: 'Any file in the connected team' },
    ticket: { label: 'Ticket created or labelled', icon: '🎫', detail: 'Linear or Jira, matching a filter' },
    pr: { label: 'Pull request opened', icon: '🔀', detail: 'Any branch targeting main' },
    deploy: { label: 'Production deploy', icon: '🚀', detail: 'After the release completes' },
    research: { label: 'Research signal added', icon: '🎙', detail: 'Transcript or note lands in the workspace' },
    manual: { label: 'Run manually', icon: '▶', detail: 'Only when someone asks for it' }
  };

  const GATES = {
    threshold: { label: 'Threshold gate', desc: 'Continue only if the measured value crosses the bound.' },
    verdict: { label: 'Verdict gate', desc: 'Continue only on a specific outcome.' },
    approval: { label: 'Human approval', desc: 'Pause and wait for a person to approve.' },
    checks: { label: 'Checks pass', desc: 'Continue only if types, tests and accessibility all pass.' }
  };

  const OUTPUTS = {
    tickets: { label: 'Create tickets', desc: 'Open issues in Linear or Jira with the findings attached.' },
    pr: { label: 'Open a pull request', desc: 'Push the branch and open a PR for review.' },
    storybook: { label: 'Publish to Storybook', desc: 'Publish the component with a story per variant.' },
    report: { label: 'Publish a report', desc: 'Write the report into the workspace and share the link.' },
    notify: { label: 'Notify the team', desc: 'Post to Slack with a summary and a link.' },
    figma: { label: 'Write back to Figma', desc: 'Update variables and post a comment on the affected frames.' }
  };

  /* -------------------------------------------------------
     Seed workflows
     ------------------------------------------------------- */
  const node = (kind, ref, name, desc) => ({ id: MN.uid('n'), kind, ref, name, desc });

  const SEED = () => ([
    {
      id: MN.uid('wf'), name: 'Nightly debt watch', enabled: true,
      desc: 'Re-scores production every night and raises tickets only when the index moves against you.',
      trigger: 'schedule', runs: 128, lastRun: Date.now() - 1000 * 60 * 60 * 7,
      nodes: [
        node('agent', 'auditor', 'Debt Auditor', 'Crawls the production URL and scores all eight dimensions.'),
        node('gate', 'threshold', 'Index rose by more than 3', 'Compare against the last accepted baseline.'),
        node('agent', 'triager', 'Ticket Triager', 'Sizes each new finding and picks an owner.'),
        node('output', 'tickets', 'Create tickets in Linear', 'One per finding, tagged design-debt, sorted into the current cycle.'),
        node('output', 'notify', 'Notify #design-system', 'Summary with the delta and the three biggest movers.')
      ]
    },
    {
      id: MN.uid('wf'), name: 'Figma publish → token sync', enabled: true,
      desc: 'Keeps the repository tokens honest whenever the library is republished.',
      trigger: 'figma', runs: 41, lastRun: Date.now() - 1000 * 60 * 60 * 30,
      nodes: [
        node('agent', 'tokens', 'Token Architect', 'Diffs the published variables against the tokens in the repository.'),
        node('agent', 'a11y', 'Accessibility Guardian', 'Checks every changed pairing still clears AA contrast.'),
        node('gate', 'checks', 'Contrast checks pass', 'Block the sync if any pairing regressed.'),
        node('output', 'pr', 'Open a token PR', 'CSS custom properties regenerated, with the diff summarised.')
      ]
    },
    {
      id: MN.uid('wf'), name: 'UI ticket → shipped component', enabled: true,
      desc: 'Takes a labelled ticket all the way to a published Storybook entry.',
      trigger: 'ticket', runs: 76, lastRun: Date.now() - 1000 * 60 * 90,
      nodes: [
        node('agent', 'triager', 'Ticket Triager', 'Classifies the ticket and routes bugs and features differently.'),
        node('agent', 'builder', 'Feature Builder', 'Implements against the design system, with stories and tests.'),
        node('agent', 'a11y', 'Accessibility Guardian', 'Contrast, names, focus order and target size.'),
        node('gate', 'checks', 'All checks pass', 'Types, unit tests, accessibility and visual regression.'),
        node('gate', 'approval', 'Human review', 'A person approves the pull request before anything publishes.'),
        node('output', 'storybook', 'Publish to Storybook', 'One story per variant, baseline updated.')
      ]
    },
    {
      id: MN.uid('wf'), name: 'Research inbox', enabled: false,
      desc: 'Re-synthesises the research whenever a new transcript lands, and flags when the picture changes.',
      trigger: 'research', runs: 12, lastRun: Date.now() - 1000 * 60 * 60 * 24 * 4,
      nodes: [
        node('agent', 'synthesist', 'Research Synthesist', 'Re-clusters every signal and re-ranks the pains.'),
        node('gate', 'threshold', 'A theme changed rank', 'Only continue when the synthesis actually moved.'),
        node('agent', 'analyst', 'Viability Analyst', 'Re-scores the six axes against the new evidence.'),
        node('output', 'report', 'Publish the updated synthesis', 'Written into the workspace with the diff highlighted.'),
        node('output', 'notify', 'Notify the product lead', 'Only when the verdict itself changes.')
      ]
    }
  ]);

  if (!MN.store.get('workflows')) MN.store.set('workflows', SEED());

  const flows = () => MN.store.get('workflows');
  let selectedId = flows()[0] && flows()[0].id;

  /* -------------------------------------------------------
     Workflow list
     ------------------------------------------------------- */
  const renderList = () => {
    $('#flowList').innerHTML = `
      <div class="stack">
        ${flows().map((w) => `
          <button class="card card-pad" data-flow="${w.id}"
            style="width:100%;text-align:left;cursor:pointer;font:inherit;border-color:${w.id === selectedId ? 'var(--accent)' : 'var(--line-soft)'}">
            <div class="row-between" style="margin-bottom:6px;gap:8px">
              <span class="tiny muted">${TRIGGERS[w.trigger].icon} ${esc(TRIGGERS[w.trigger].label)}</span>
              <span class="badge ${w.enabled ? 'good' : ''}">${w.enabled ? 'live' : 'paused'}</span>
            </div>
            <p class="strong" style="margin:0 0 5px">${esc(w.name)}</p>
            <p class="tiny muted" style="margin:0;line-height:1.45">${esc(w.desc)}</p>
            <p class="tiny muted" style="margin:9px 0 0">
              ${MN.plural(w.nodes.length, 'step')} · ${fmt.int(w.runs)} runs · last ${fmt.when(w.lastRun)}
            </p>
          </button>`).join('')}
      </div>`;
    $$('[data-flow]').forEach((b) => b.addEventListener('click', () => {
      selectedId = b.dataset.flow;
      renderList();
      renderDetail();
    }));
  };

  /* -------------------------------------------------------
     Workflow detail / composer
     ------------------------------------------------------- */
  const iconFor = (n) => n.kind === 'trigger' ? TRIGGERS[n.ref].icon
    : n.kind === 'agent' ? (P.AGENTS.find((a) => a.id === n.ref) || { icon: '◆' }).icon
    : n.kind === 'gate' ? '◇' : '↗';

  const renderDetail = () => {
    const w = flows().find((f) => f.id === selectedId);
    const host = $('#flowDetail');
    if (!w) { host.innerHTML = '<div class="empty"><h4>No workflow selected</h4></div>'; return; }

    const chain = [{ id: 'trg', kind: 'trigger', ref: w.trigger, name: TRIGGERS[w.trigger].label, desc: TRIGGERS[w.trigger].detail }, ...w.nodes];

    host.innerHTML = `
      <div class="card">
        <div class="card-head">
          <div>
            <h3>${esc(w.name)}</h3>
            <p class="sub">${esc(w.desc)}</p>
          </div>
          <div class="row-wrap">
            <label class="toggle">
              <input type="checkbox" id="wfEnabled" ${w.enabled ? 'checked' : ''}>
              <span class="toggle-track"></span>
              <span class="small">${w.enabled ? 'Live' : 'Paused'}</span>
            </label>
            <button class="btn btn-ghost btn-sm" id="renameFlow">Rename</button>
            <button class="btn btn-primary btn-sm" id="runFlow">▶ Run once</button>
          </div>
        </div>
        <div class="card-body">
          <div class="flow" id="flowNodes">
            ${chain.map((n, i) => `
              <div class="flow-node ${esc(n.kind)}" data-node="${esc(n.id)}">
                <span class="flow-ico">${iconFor(n)}</span>
                <span class="grow">
                  <span class="flow-kind">${esc(n.kind)}</span>
                  <span class="flow-name">${esc(n.name)}</span>
                  <span class="flow-desc">${esc(n.desc)}</span>
                </span>
                ${n.kind === 'trigger' ? `
                  <span class="flow-tools">
                    <button class="flow-tool" data-edit-trigger title="Change trigger">✎</button>
                  </span>` : `
                  <span class="flow-tools">
                    <button class="flow-tool" data-up="${esc(n.id)}" title="Move up" ${i === 1 ? 'disabled style="opacity:.3"' : ''}>↑</button>
                    <button class="flow-tool" data-down="${esc(n.id)}" title="Move down" ${i === chain.length - 1 ? 'disabled style="opacity:.3"' : ''}>↓</button>
                    <button class="flow-tool del" data-del="${esc(n.id)}" title="Remove step">✕</button>
                  </span>`}
              </div>
              ${i < chain.length - 1 ? '<div class="flow-link"></div>' : ''}`).join('')}
          </div>
          <div style="margin-top:16px">
            <button class="btn btn-ghost btn-sm btn-full" id="addStep">+ Add a step</button>
          </div>
        </div>
        <div class="card-foot">
          <div class="row-between">
            <p class="small muted" style="margin:0">
              ${fmt.int(w.runs)} runs · last ${fmt.when(w.lastRun)} ·
              ${w.nodes.filter((n) => n.kind === 'agent').length} agents,
              ${w.nodes.filter((n) => n.kind === 'gate').length} gates,
              ${w.nodes.filter((n) => n.kind === 'output').length} outputs
            </p>
            <button class="btn btn-quiet btn-sm" id="deleteFlow" style="color:var(--critical)">Delete workflow</button>
          </div>
        </div>
      </div>
      <div id="runOut" style="margin-top:18px"></div>`;

    $('#wfEnabled').addEventListener('change', (e) => {
      patchFlow(w.id, (f) => { f.enabled = e.target.checked; });
      MN.shell.refresh();
      renderList(); renderDetail();
    });

    $('#renameFlow').addEventListener('click', () => {
      MN.modal({
        title: 'Rename workflow',
        body: `<label class="field"><span class="field-label">Name</span>
                 <input class="input" id="wfName" value="${esc(w.name)}"></label>
               <label class="field" style="margin:0"><span class="field-label">Description</span>
                 <textarea class="textarea" id="wfDesc">${esc(w.desc)}</textarea></label>`,
        foot: `<button class="btn btn-ghost" data-close>Cancel</button>
               <button class="btn btn-primary" id="saveName">Save</button>`,
        onMount: (root) => root.querySelector('#saveName').addEventListener('click', () => {
          const name = root.querySelector('#wfName').value.trim();
          if (!name) { MN.toast('Name required', '', 'warn'); return; }
          patchFlow(w.id, (f) => { f.name = name; f.desc = root.querySelector('#wfDesc').value.trim(); });
          MN.closeModal(); renderList(); renderDetail();
        })
      });
    });

    $('#deleteFlow').addEventListener('click', () => {
      MN.modal({
        title: 'Delete this workflow?',
        body: `<p>“${esc(w.name)}” will be removed. Its ${fmt.int(w.runs)} run records go with it.</p>`,
        foot: `<button class="btn btn-ghost" data-close>Cancel</button>
               <button class="btn btn-accent" id="delYes">Delete</button>`,
        onMount: (root) => root.querySelector('#delYes').addEventListener('click', () => {
          MN.store.set('workflows', flows().filter((f) => f.id !== w.id));
          selectedId = (flows()[0] || {}).id;
          MN.closeModal(); MN.shell.refresh(); renderList(); renderDetail();
          MN.toast('Workflow deleted', '', 'info');
        })
      });
    });

    $('[data-edit-trigger]').addEventListener('click', () => pickTrigger(w.id));
    $('#addStep').addEventListener('click', () => pickStep(w.id));

    $$('[data-del]').forEach((b) => b.addEventListener('click', () => {
      patchFlow(w.id, (f) => { f.nodes = f.nodes.filter((n) => n.id !== b.dataset.del); });
      renderList(); renderDetail();
    }));
    $$('[data-up]').forEach((b) => b.addEventListener('click', () => move(w.id, b.dataset.up, -1)));
    $$('[data-down]').forEach((b) => b.addEventListener('click', () => move(w.id, b.dataset.down, 1)));

    $('#runFlow').addEventListener('click', () => runFlow(w.id));
  };

  const patchFlow = (id, fn) => {
    const all = flows();
    const f = all.find((x) => x.id === id);
    fn(f);
    MN.store.set('workflows', all);
  };

  const move = (wid, nid, dir) => {
    patchFlow(wid, (f) => {
      const i = f.nodes.findIndex((n) => n.id === nid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= f.nodes.length) return;
      [f.nodes[i], f.nodes[j]] = [f.nodes[j], f.nodes[i]];
    });
    renderDetail();
  };

  const pickTrigger = (wid) => {
    MN.modal({
      title: 'Change the trigger',
      sub: 'What starts this workflow.',
      body: `<div class="choices">
        ${Object.entries(TRIGGERS).map(([k, t]) => `
          <label class="choice"><input type="radio" name="trg" value="${k}">
            <b>${t.icon} ${esc(t.label)}</b><span>${esc(t.detail)}</span></label>`).join('')}
      </div>`,
      foot: `<button class="btn btn-ghost" data-close>Cancel</button>
             <button class="btn btn-primary" id="saveTrg">Set trigger</button>`,
      onMount: (root) => root.querySelector('#saveTrg').addEventListener('click', () => {
        const sel = $$('input[name="trg"]', root).find((r) => r.checked);
        if (!sel) { MN.toast('Pick a trigger', '', 'warn'); return; }
        patchFlow(wid, (f) => { f.trigger = sel.value; });
        MN.closeModal(); renderList(); renderDetail();
      })
    });
  };

  const pickStep = (wid) => {
    MN.modal({
      title: 'Add a step',
      sub: 'Agents do work. Gates decide whether the run continues. Outputs put the result somewhere.',
      wide: true,
      body: `
        <div class="tabs" data-tabs role="tablist">
          <button class="tab" role="tab" id="s-agent" aria-controls="sp-agent" aria-selected="true">Agent</button>
          <button class="tab" role="tab" id="s-gate" aria-controls="sp-gate" aria-selected="false">Gate</button>
          <button class="tab" role="tab" id="s-out" aria-controls="sp-out" aria-selected="false">Output</button>
        </div>
        <div class="panel" id="sp-agent" role="tabpanel">
          <div class="choices">
            ${P.AGENTS.map((a) => `
              <label class="choice"><input type="radio" name="step" value="agent:${a.id}">
                <b>${a.icon} ${esc(a.name)}</b><span>${esc(a.desc)}</span></label>`).join('')}
          </div>
        </div>
        <div class="panel" id="sp-gate" role="tabpanel" hidden>
          <div class="choices">
            ${Object.entries(GATES).map(([k, g]) => `
              <label class="choice"><input type="radio" name="step" value="gate:${k}">
                <b>◇ ${esc(g.label)}</b><span>${esc(g.desc)}</span></label>`).join('')}
          </div>
        </div>
        <div class="panel" id="sp-out" role="tabpanel" hidden>
          <div class="choices">
            ${Object.entries(OUTPUTS).map(([k, o]) => `
              <label class="choice"><input type="radio" name="step" value="output:${k}">
                <b>↗ ${esc(o.label)}</b><span>${esc(o.desc)}</span></label>`).join('')}
          </div>
        </div>
        <label class="field" style="margin:18px 0 0">
          <span class="field-label">Note for this step <span class="muted">(optional)</span></span>
          <input class="input" id="stepNote" placeholder="e.g. only for tickets labelled ui">
        </label>`,
      foot: `<button class="btn btn-ghost" data-close>Cancel</button>
             <button class="btn btn-primary" id="addStepGo">Add step</button>`,
      onMount: (root) => {
        MN.bindTabs(root);
        root.querySelector('#addStepGo').addEventListener('click', () => {
          const sel = $$('input[name="step"]', root).find((r) => r.checked);
          if (!sel) { MN.toast('Pick a step', 'Choose an agent, a gate or an output.', 'warn'); return; }
          const [kind, ref] = sel.value.split(':');
          const note = root.querySelector('#stepNote').value.trim();
          const meta = kind === 'agent' ? P.AGENTS.find((a) => a.id === ref)
            : kind === 'gate' ? GATES[ref] : OUTPUTS[ref];
          patchFlow(wid, (f) => f.nodes.push({
            id: MN.uid('n'), kind, ref,
            name: meta.name || meta.label,
            desc: note || meta.desc
          }));
          MN.closeModal(); renderList(); renderDetail();
          MN.toast('Step added', '', 'ok');
        });
      }
    });
  };

  /* -------------------------------------------------------
     Run a workflow
     ------------------------------------------------------- */
  const runFlow = async (wid) => {
    const w = flows().find((f) => f.id === wid);
    const out = $('#runOut');
    const nodeEls = $$('#flowNodes .flow-node');
    nodeEls.forEach((el) => el.classList.remove('running', 'ran'));

    out.innerHTML = `
      <div class="card">
        <div class="card-head"><h4>Run log</h4><span class="badge info" id="runState">running</span></div>
        <div class="card-body"><div class="log" id="runLog"></div></div>
      </div>`;
    const log = $('#runLog');
    const lines = [];
    const emit = (t, s) => {
      lines.push({ t, s, time: fmt.clock() });
      log.innerHTML = lines.map((l) =>
        `<div class="log-line"><span class="log-t">${esc(l.time)}</span><span class="${esc(l.t)}">${esc(l.s)}</span></div>`
      ).join('') + '<div class="log-line log-cursor"></div>';
      log.scrollTop = log.scrollHeight;
    };

    emit('ag', `workflow "${w.name}" started`);
    emit('dim', `trigger: ${TRIGGERS[w.trigger].label.toLowerCase()} — ${TRIGGERS[w.trigger].detail.toLowerCase()}`);

    const r = MN.rng(MN.hash(w.id + w.runs));
    let halted = false;

    for (let i = 0; i < nodeEls.length; i++) {
      const el = nodeEls[i];
      const n = i === 0 ? null : w.nodes[i - 1];
      el.classList.add('running');
      await MN.sleep(520 + r() * 420);

      if (n) {
        if (n.kind === 'agent') {
          emit('ag', `${n.name} → ${n.desc.toLowerCase()}`);
          emit('ok', `completed in ${(1.2 + r() * 6).toFixed(1)}s`);
        } else if (n.kind === 'gate') {
          const pass = n.ref === 'approval' ? true : r() > 0.16;
          emit(pass ? 'ok' : 'warn', `gate "${n.name}" — ${pass ? 'passed' : 'not met, halting the run'}`);
          if (!pass) {
            el.classList.remove('running');
            el.classList.add('ran');
            halted = true;
            break;
          }
        } else {
          emit('ok', `${n.name} — ${n.desc.toLowerCase()}`);
        }
      } else {
        emit('dim', 'context loaded: workspace, design system, open tickets');
      }

      el.classList.remove('running');
      el.classList.add('ran');
    }

    if (halted) {
      emit('warn', 'run ended early — nothing was written');
      $('#runState').textContent = 'halted at a gate';
      $('#runState').className = 'badge medium';
    } else {
      emit('ag', 'workflow complete');
      $('#runState').textContent = 'complete';
      $('#runState').className = 'badge good';
    }
    log.querySelector('.log-cursor')?.remove();

    patchFlow(wid, (f) => { f.runs += 1; f.lastRun = Date.now(); });
    MN.store.log('workflow', `Ran "${w.name}" — ${halted ? 'halted at a gate' : 'completed'}`);
    renderList();
    MN.toast(halted ? 'Run halted at a gate' : 'Workflow complete',
      halted ? 'Nothing was written — the gate condition was not met.' : `${w.nodes.length} steps executed.`,
      halted ? 'warn' : 'agent');
  };

  /* -------------------------------------------------------
     New workflow
     ------------------------------------------------------- */
  $('#newWorkflow').addEventListener('click', () => {
    MN.modal({
      title: 'New workflow',
      sub: 'Start from a trigger, then add the steps.',
      body: `
        <label class="field"><span class="field-label">Name</span>
          <input class="input" id="nwName" placeholder="e.g. Weekly accessibility sweep"></label>
        <label class="field"><span class="field-label">What it does</span>
          <input class="input" id="nwDesc" placeholder="One line — what this workflow is for"></label>
        <div class="field" style="margin:0">
          <span class="field-label">Trigger</span>
          <div class="choices c2">
            ${Object.entries(TRIGGERS).map(([k, t], i) => `
              <label class="choice"><input type="radio" name="nwTrg" value="${k}" ${i === 0 ? 'checked' : ''}>
                <b>${t.icon} ${esc(t.label)}</b><span>${esc(t.detail)}</span></label>`).join('')}
          </div>
        </div>`,
      foot: `<button class="btn btn-ghost" data-close>Cancel</button>
             <button class="btn btn-primary" id="createWf">Create workflow</button>`,
      onMount: (root) => root.querySelector('#createWf').addEventListener('click', () => {
        const name = root.querySelector('#nwName').value.trim();
        if (!name) { MN.toast('Name it', 'Workflows need a name.', 'warn'); return; }
        const wf = {
          id: MN.uid('wf'), name,
          desc: root.querySelector('#nwDesc').value.trim() || 'No description yet.',
          enabled: false,
          trigger: $$('input[name="nwTrg"]', root).find((x) => x.checked).value,
          runs: 0, lastRun: Date.now(), nodes: []
        };
        MN.store.set('workflows', [wf, ...flows()]);
        selectedId = wf.id;
        MN.closeModal();
        MN.shell.refresh();
        renderList(); renderDetail();
        MN.toast('Workflow created', 'Add its steps, then set it live.', 'ok');
      })
    });
  });

  /* -------------------------------------------------------
     Agent roster
     ------------------------------------------------------- */
  const AREAS = [
    ['research', 'Research', 'Turning raw signals into decisions you can defend.'],
    ['debt', 'Design debt', 'Finding what the product owes and costing the way out.'],
    ['design', 'Design', 'Turning a proven problem into an architecture and a system.'],
    ['build', 'Build', 'Working tickets against the design system, not around it.'],
    ['ship', 'Ship', 'Getting the result into the shared reference.']
  ];

  const renderRoster = () => {
    $('#agentRoster').innerHTML = AREAS.map(([key, name, blurb]) => {
      const list = P.AGENTS.filter((a) => a.area === key);
      if (!list.length) return '';
      return `
        <div class="section-head" style="margin-top:${key === 'research' ? 0 : 34}px">
          <div>
            <h3>${esc(name)}</h3>
            <p class="small muted" style="margin:2px 0 0">${esc(blurb)}</p>
          </div>
          <span class="badge">${MN.plural(list.length, 'agent')}</span>
        </div>
        <div class="grid g3">
          ${list.map((a) => {
            const r = MN.rng(MN.hash(a.id));
            const runs = Math.round(30 + r() * 900);
            const success = (92 + r() * 7.4).toFixed(1);
            return `
              <div class="agent-card" data-agent="${a.id}" tabindex="0" role="button">
                <div class="agent-top">
                  <span class="agent-ava">${a.icon}</span>
                  <div>
                    <h4>${esc(a.name)}</h4>
                    <span class="agent-role">${esc(a.role)}</span>
                  </div>
                </div>
                <p>${esc(a.desc)}</p>
                <div class="agent-stats">
                  <span><b>${fmt.int(runs)}</b> runs</span>
                  <span><b>${success}%</b> clean</span>
                  <span><b>${(1.4 + r() * 8).toFixed(1)}s</b> median</span>
                </div>
              </div>`;
          }).join('')}
        </div>`;
    }).join('');

    $$('[data-agent]').forEach((el) => {
      const open = () => showAgent(el.dataset.agent);
      el.addEventListener('click', open);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
    });
  };

  const AGENT_TOOLS = {
    synthesist: ['workspace.signals.read', 'transcript.parse', 'synthesis.write'],
    analyst: ['synthesis.read', 'market.lookup', 'viability.write'],
    auditor: ['browser.crawl', 'screenshot.capture', 'a11y.axe', 'report.write'],
    tokens: ['styles.extract', 'figma.variables.read', 'tokens.write', 'pr.open'],
    consolidator: ['components.index', 'similarity.cluster', 'codemod.apply', 'pr.open'],
    a11y: ['contrast.check', 'axe.run', 'focus.trace', 'pr.comment'],
    architect: ['synthesis.read', 'ia.write', 'flows.write'],
    systemsmith: ['tokens.read', 'component.spec', 'component.generate'],
    triager: ['linear.read', 'jira.read', 'ticket.classify', 'ticket.assign'],
    fixer: ['repo.read', 'test.write', 'repo.write', 'ci.read', 'pr.open'],
    builder: ['spec.read', 'design-system.read', 'repo.write', 'story.write', 'pr.open'],
    publisher: ['storybook.publish', 'visual-regression.run', 'baseline.update']
  };

  const showAgent = (id) => {
    const a = P.AGENTS.find((x) => x.id === id);
    const tools = AGENT_TOOLS[id] || [];
    MN.modal({
      title: `${a.icon}  ${a.name}`,
      sub: `${a.role} · ${a.area}`,
      body: `
        <p>${esc(a.desc)}</p>
        <h5 style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-mute);margin:20px 0 8px">Tools it can call</h5>
        <div class="row-wrap">${tools.map((t) => `<span class="chip mono">${esc(t)}</span>`).join('')}</div>
        <h5 style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-mute);margin:20px 0 8px">Guardrails</h5>
        <ul class="fix-list small">
          <li>Never merges its own work — a pull request always waits for a human.</li>
          <li>Cannot write outside the repositories and files the workspace has granted.</li>
          <li>Every claim it makes carries the evidence it came from, or it is not made.</li>
          <li>Halts and escalates rather than guessing when the context is insufficient.</li>
        </ul>
        <h5 style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-mute);margin:20px 0 8px">Used in</h5>
        <div class="row-wrap">
          ${flows().filter((w) => w.nodes.some((n) => n.ref === id)).map((w) => `<span class="chip">${esc(w.name)}</span>`).join('')
            || '<span class="tiny muted">Not currently in any workflow.</span>'}
        </div>`
    });
  };

  /* -------------------------------------------------------
     Connections
     ------------------------------------------------------- */
  const CONNECTORS = [
    ['figma', 'Figma', 'figma', 'Read files, styles, components and variables. Write variables back on approval.'],
    ['linear', 'Linear', 'linear', 'Read and create issues, sync status, and comment with findings.'],
    ['jira', 'Jira', 'jira', 'Read and create tasks and epics, and transition them as work lands.'],
    ['storybook', 'Storybook', 'sb', 'Publish components with stories and run visual regression.'],
    ['github', 'GitHub', 'gh', 'Read repositories, open branches and pull requests, read CI results.'],
    ['slack', 'Slack', 'slack', 'Post run summaries and escalate anything that needs a person.']
  ];

  const renderConnections = () => {
    const conn = MN.store.get('connectors');
    $('#connList').innerHTML = CONNECTORS.map(([k, name, cls, desc]) => `
      <div class="conn">
        <span class="conn-logo ${cls}">${name[0]}${k === 'storybook' ? 'B' : ''}</span>
        <span class="conn-body grow">
          <b>${esc(name)}</b>
          <span>${esc(desc)}</span>
        </span>
        <button class="btn btn-sm ${conn[k] ? 'btn-ghost' : 'btn-primary'}" data-conn="${k}">
          ${conn[k] ? 'Disconnect' : 'Connect'}
        </button>
      </div>`).join('');

    $$('[data-conn]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.conn;
      MN.store.patch((s) => { s.connectors[k] = !s.connectors[k]; });
      MN.store.log('connector', `${k[0].toUpperCase() + k.slice(1)} ${MN.store.get('connectors')[k] ? 'connected' : 'disconnected'}`);
      MN.shell.refresh();
      renderConnections();
      renderActivity();
    }));
  };

  /* -------------------------------------------------------
     Activity
     ------------------------------------------------------- */
  const KIND_ICON = { debt: '🔬', research: '🎙', viability: '⚖', design: '🗺', pipeline: '🗂', agent: '🤖', ship: '📚', workflow: '⚡', figma: '🎨', connector: '🔌' };

  const renderActivity = () => {
    const acts = MN.store.get('activity', []);
    $('#activityList').innerHTML = acts.length ? `
      <div class="card">
        <div class="card-head">
          <h3>Workspace activity</h3>
          <button class="btn btn-quiet btn-sm" id="clearActivity">Clear</button>
        </div>
        <div class="card-body">
          <div class="stack">
            ${acts.map((a) => `
              <div class="row" style="gap:12px;padding:9px 0;border-bottom:1px solid var(--line-soft)">
                <span style="font-size:15px">${KIND_ICON[a.kind] || '•'}</span>
                <span class="grow small" style="color:var(--ink)">${esc(a.text)}</span>
                <span class="tiny muted nowrap">${fmt.when(a.ts)}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>` : `
      <div class="empty">
        <h4>Nothing has happened yet</h4>
        <p>Run a debt analysis, audit a Figma file or work a ticket, and it shows up here.</p>
      </div>`;

    const c = $('#clearActivity');
    if (c) c.addEventListener('click', () => {
      MN.store.patch((s) => { s.activity = []; });
      renderActivity();
    });
  };

  /* -------------------------------------------------------
     Boot
     ------------------------------------------------------- */
  renderList();
  renderDetail();
  renderRoster();
  renderConnections();
  renderActivity();

  if (MN.sub === 'connectors') {
    $('#t-conn').click();
    $('#t-conn').scrollIntoView({ block: 'center' });
  }
})();
