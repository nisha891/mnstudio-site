/* =========================================================
   MN Studio — Design debt calculator (journey one)
   Live link or demo video → scored report → pipeline.
   ========================================================= */
(() => {
  'use strict';

  const MN = window.MN;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const views = {
    intake: $('#intake'),
    scanning: $('#scanning'),
    report: $('#report')
  };

  const show = (name) => {
    Object.entries(views).forEach(([k, el]) => el.classList.toggle('hidden', k !== name));
    const onReport = name === 'report';
    ['#restartBtn', '#ticketsBtn', '#exportBtn'].forEach((sel) => {
      const b = $(sel);
      if (b) b.classList.toggle('hidden', !onReport);
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  /* -------------------------------------------------------
     Aside: the eight dimensions, straight from the engine
     ------------------------------------------------------- */
  const preview = $('#dimPreview');
  if (preview) {
    preview.innerHTML = MN.DebtEngine.DIMENSIONS.map((d) => `
      <div>
        <div class="row-between" style="gap:8px">
          <span class="small strong">${MN.esc(d.name)}</span>
          <span class="tiny muted mono">${Math.round(d.weight * 100)}%</span>
        </div>
        <p class="tiny muted" style="margin:2px 0 0;line-height:1.45">${MN.esc(d.blurb)}</p>
      </div>`).join('');
  }

  /* -------------------------------------------------------
     Intake wiring
     ------------------------------------------------------- */
  let sourceKind = 'url';
  let videoFile = null;

  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => { sourceKind = tab.id === 'tab-video' ? 'video' : 'url'; });
  });

  $$('[data-demo-url]').forEach((chip) => {
    chip.addEventListener('click', () => { $('#urlInput').value = chip.dataset.demoUrl; });
  });

  const surfaces = $('#ctxSurfaces');
  const surfacesVal = $('#surfacesVal');
  surfaces.addEventListener('input', () => { surfacesVal.textContent = surfaces.value; });

  /* video intake */
  const dropzone = $('#dropzone');
  const fileInput = $('#fileInput');
  const filePicked = $('#filePicked');

  const acceptFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      MN.toast('Not a video', 'Upload an MP4, MOV or WebM walkthrough.', 'warn');
      return;
    }
    videoFile = file;
    filePicked.classList.remove('hidden');
    filePicked.innerHTML = `
      <div class="file-pill">
        <span class="fp-ico">▶</span>
        <span class="grow">
          <b>${MN.esc(file.name)}</b>
          <span>${(file.size / 1048576).toFixed(1)} MB · ${MN.esc(file.type || 'video')}</span>
        </span>
        <button class="btn btn-quiet btn-sm" type="button" id="dropFile">Remove</button>
      </div>`;
    $('#dropFile').addEventListener('click', () => {
      videoFile = null;
      fileInput.value = '';
      filePicked.classList.add('hidden');
      filePicked.innerHTML = '';
    });
  };

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', () => acceptFile(fileInput.files[0]));
  ['dragenter', 'dragover'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
    e.preventDefault(); dropzone.classList.add('over');
  }));
  ['dragleave', 'drop'].forEach((ev) => dropzone.addEventListener(ev, (e) => {
    e.preventDefault(); dropzone.classList.remove('over');
  }));
  dropzone.addEventListener('drop', (e) => acceptFile(e.dataTransfer.files[0]));

  /* -------------------------------------------------------
     Gather context
     ------------------------------------------------------- */
  const readContext = () => ({
    stage: $('#ctxStage').value,
    cadence: $('#ctxCadence').value,
    surfaces: Number(surfaces.value),
    designers: Number($('#ctxDesigners').value),
    engineers: Number($('#ctxEngineers').value),
    system: ($$('input[name="system"]').find((r) => r.checked) || {}).value,
    a11yTarget: ($$('input[name="a11y"]').find((r) => r.checked) || {}).value,
    platforms: $$('input[name="platform"]:checked').map((c) => c.value),
    age: Number($('#ctxAge').value),
    rate: Number($('#ctxRate').value),
    hasTokens: $('#ctxTokens').checked,
    hasStorybook: $('#ctxStorybook').checked,
    notes: $('#ctxNotes').value.trim()
  });

  /* -------------------------------------------------------
     Scan choreography
     ------------------------------------------------------- */
  const runScan = async (steps, label, kindLabel) => {
    show('scanning');
    $('#scanKind').textContent = kindLabel;
    $('#scanTarget').textContent = label;
    const list = $('#scanSteps');
    list.innerHTML = steps.map((s) => `
      <div class="scan-step"><span class="dot">✓</span><span class="grow">${MN.esc(s)}</span><span class="t"></span></div>
    `).join('');
    const rows = $$('.scan-step', list);
    const fill = $('#scanFill');

    for (let i = 0; i < rows.length; i++) {
      rows[i].classList.add('run');
      const started = performance.now();
      await MN.sleep(560 + Math.random() * 620);
      rows[i].classList.remove('run');
      rows[i].classList.add('done');
      rows[i].querySelector('.t').textContent = ((performance.now() - started) / 1000).toFixed(1) + 's';
      fill.style.width = ((i + 1) / rows.length * 100) + '%';
    }
    await MN.sleep(320);
  };

  /* -------------------------------------------------------
     Run
     ------------------------------------------------------- */
  const runBtn = $('#runBtn');

  runBtn.addEventListener('click', async () => {
    const ctx = readContext();
    let source, label, kindLabel;

    if (sourceKind === 'url') {
      const raw = $('#urlInput').value.trim();
      if (!raw) {
        MN.toast('Add a product URL', 'Or switch to the demo video tab.', 'warn');
        $('#urlInput').focus();
        return;
      }
      source = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
      label = source.replace(/^https?:\/\//, '').replace(/\/$/, '');
      kindLabel = 'Crawling live product';
    } else {
      if (!videoFile) {
        MN.toast('Add a demo video', 'Drop an MP4, MOV or WebM to analyse.', 'warn');
        return;
      }
      source = videoFile.name;
      label = videoFile.name;
      kindLabel = 'Analysing demo video';
    }

    if (!ctx.platforms.length) {
      MN.toast('Pick at least one platform', 'Web, iOS or Android.', 'warn');
      return;
    }

    runBtn.disabled = true;
    const report = MN.DebtEngine.analyze({ kind: sourceKind, source, label, context: ctx });

    await runScan(report.scanSteps, label, kindLabel);

    MN.store.set('debt', { source, label, kind: sourceKind, context: ctx, report });
    MN.store.log('debt', `Design debt report ${report.id} — index ${report.index} for ${label}`);
    MN.shell.refresh();

    renderReport(report);
    runBtn.disabled = false;
    MN.toast('Analysis complete', `${report.findings.length} findings · index ${report.index}`, 'ok');
  });

  /* -------------------------------------------------------
     Report + header actions
     ------------------------------------------------------- */
  const renderReport = (report) => {
    MN.renderReport(views.report, report);
    show('report');
    wireHeader(report);
  };

  let headerWired = false;
  const wireHeader = (report) => {
    if (headerWired) return;
    headerWired = true;

    $('#restartBtn').addEventListener('click', () => {
      MN.store.set('debt', null);
      MN.shell.refresh();
      show('intake');
    });

    $('#exportBtn').addEventListener('click', () => {
      const rep = MN.store.get('debt').report;
      const md = MN.DebtEngine.toMarkdown(rep);
      MN.modal({
        title: 'Export report',
        sub: `${rep.id} · ${rep.findings.length} findings`,
        wide: true,
        body: `
          <div class="row-wrap" style="margin-bottom:14px">
            <button class="btn btn-primary btn-sm" id="copyMd">Copy markdown</button>
            <button class="btn btn-ghost btn-sm" id="printRep">Print / save as PDF</button>
          </div>
          <textarea class="textarea mono" style="min-height:340px;font-size:12px" readonly>${MN.esc(md)}</textarea>`,
        onMount: (root) => {
          root.querySelector('#copyMd').addEventListener('click', () => MN.copy(md, 'Report copied'));
          root.querySelector('#printRep').addEventListener('click', () => { MN.closeModal(); setTimeout(() => window.print(), 120); });
        }
      });
    });

    $('#ticketsBtn').addEventListener('click', () => {
      const rep = MN.store.get('debt').report;
      MN.modal({
        title: 'Send findings to the product pipeline',
        sub: 'Each finding becomes a ticket the agents can pick up.',
        body: `
          <p>Create <b class="strong">${rep.findings.length} tickets</b> from report
             ${MN.esc(rep.id)}, ordered by the refactoring strategy.</p>
          <div class="field">
            <span class="field-label">Ticket destination</span>
            <div class="choices c3">
              <label class="choice"><input type="radio" name="dest" value="mn" checked>
                <b>MN board</b><span>Native, no connector needed</span></label>
              <label class="choice"><input type="radio" name="dest" value="linear">
                <b>Linear</b><span>Sync as issues</span></label>
              <label class="choice"><input type="radio" name="dest" value="jira">
                <b>Jira</b><span>Sync as tasks</span></label>
            </div>
          </div>`,
        foot: `<button class="btn btn-ghost" data-close>Cancel</button>
               <button class="btn btn-primary" id="confirmTickets">Create tickets</button>`,
        onMount: (root) => {
          root.querySelector('#confirmTickets').addEventListener('click', () => {
            const dest = [...root.querySelectorAll('input[name="dest"]')].find((r) => r.checked).value;
            const tickets = MN.DebtEngine.toTickets(rep, dest);
            MN.store.patch((s) => {
              s.pipeline.build.tickets = [...tickets, ...s.pipeline.build.tickets];
              if (dest !== 'mn') s.connectors[dest] = true;
            });
            MN.store.log('pipeline', `${tickets.length} debt tickets created from ${rep.id}`);
            MN.shell.refresh();
            MN.closeModal();
            MN.toast(`${tickets.length} tickets created`, 'Open the product pipeline to assign agents.', 'ok');
            setTimeout(() => MN.goto('build', 'build'), 900);
          });
        }
      });
    });
  };

  /* -------------------------------------------------------
     Restore a previous report
     ------------------------------------------------------- */
  const saved = MN.store.get('debt');
  if (saved && saved.report) {
    renderReport(saved.report);
  } else {
    show('intake');
  }
})();
