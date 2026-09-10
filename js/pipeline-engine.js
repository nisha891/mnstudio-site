/* =========================================================
   MN Studio — Product pipeline engine

   Research synthesis, viability assessment, product design
   generation and agent execution. Like the debt engine,
   everything is deterministic: the same product brief always
   produces the same synthesis, verdict and design.

   Generation is archetype-driven. We classify the brief into
   a product archetype from its language, then compose IA,
   flows, screens, tokens and components from that archetype's
   patterns. A real deployment swaps `classify` and the
   templates for model calls; the surrounding structure —
   gates, scoring, ticket shapes — is unchanged.
   ========================================================= */
(() => {
  'use strict';

  const MN = window.MN;
  const { clamp, round, rng, hash, pick, shuffle } = MN;

  /* -------------------------------------------------------
     Archetypes
     ------------------------------------------------------- */
  const ARCHETYPES = {
    fintech: {
      name: 'Financial product',
      keys: ['pay', 'bank', 'invoice', 'finance', 'money', 'lend', 'wallet', 'billing', 'ledger', 'accounting', 'tax', 'payroll', 'credit'],
      nav: ['Overview', 'Transactions', 'Accounts', 'Reports', 'Settings'],
      objects: ['account', 'transaction', 'payee', 'statement'],
      flows: ['Connect a bank account', 'Send a payment', 'Reconcile a statement', 'Invite an approver'],
      screens: ['Balances overview', 'Transaction ledger', 'Transaction detail', 'Payment composer', 'Approval queue', 'Account connection', 'Reconciliation view', 'Statement export'],
      components: ['AmountInput', 'CurrencyBadge', 'TransactionRow', 'ApprovalStepper', 'BankConnectCard'],
      palette: ['#1c3d5a', '#2f7d62', '#c1662f', '#8b2f47'],
      risks: ['regulatory approval', 'payment rails partner', 'fraud exposure']
    },
    health: {
      name: 'Health product',
      keys: ['health', 'clinic', 'patient', 'care', 'therapy', 'medical', 'wellness', 'doctor', 'symptom', 'treatment', 'mental'],
      nav: ['Today', 'Patients', 'Programmes', 'Messages', 'Settings'],
      objects: ['patient', 'programme', 'session', 'note'],
      flows: ['Onboard a patient', 'Book a session', 'Log an outcome', 'Escalate to a clinician'],
      screens: ['Care dashboard', 'Patient list', 'Patient record', 'Session scheduler', 'Outcome logging', 'Secure messaging', 'Programme builder', 'Consent capture'],
      components: ['PatientCard', 'ConsentGate', 'OutcomeChart', 'RiskFlag', 'SessionSlot'],
      palette: ['#2f6b6b', '#4f6f52', '#c1662f', '#5a4a7a'],
      risks: ['clinical validation', 'data residency', 'safeguarding duty of care']
    },
    marketplace: {
      name: 'Marketplace',
      keys: ['marketplace', 'seller', 'buyer', 'listing', 'vendor', 'booking', 'supply', 'demand', 'freelance', 'rental', 'host'],
      nav: ['Discover', 'Bookings', 'Listings', 'Messages', 'Earnings'],
      objects: ['listing', 'booking', 'review', 'payout'],
      flows: ['Search and filter listings', 'Complete a booking', 'Publish a listing', 'Resolve a dispute'],
      screens: ['Discovery grid', 'Search filters', 'Listing detail', 'Booking flow', 'Listing editor', 'Inbox', 'Earnings dashboard', 'Review capture'],
      components: ['ListingCard', 'FilterSheet', 'RatingStars', 'AvailabilityCalendar', 'PayoutRow'],
      palette: ['#c1662f', '#2f6b4f', '#2c5a7a', '#8b5a2f'],
      risks: ['cold-start liquidity', 'trust and safety', 'take-rate resistance']
    },
    devtool: {
      name: 'Developer tool',
      keys: ['developer', 'api', 'deploy', 'code', 'sdk', 'infra', 'devops', 'pipeline', 'repository', 'observability', 'logs', 'kubernetes'],
      nav: ['Projects', 'Deployments', 'Logs', 'Integrations', 'Settings'],
      objects: ['project', 'deployment', 'environment', 'token'],
      flows: ['Connect a repository', 'Run a first deploy', 'Debug a failed run', 'Invite a teammate'],
      screens: ['Project list', 'Deployment timeline', 'Run detail with logs', 'Environment variables', 'Integration catalogue', 'API keys', 'Onboarding CLI hand-off', 'Usage and limits'],
      components: ['LogStream', 'StatusPill', 'CodeBlock', 'EnvVarTable', 'DiffViewer'],
      palette: ['#2b2b3d', '#2f6b4f', '#c1662f', '#2c5a7a'],
      risks: ['self-host expectations', 'migration cost from incumbent', 'pricing on usage volatility']
    },
    analytics: {
      name: 'Analytics product',
      keys: ['analytic', 'dashboard', 'insight', 'metric', 'report', 'data', 'bi', 'warehouse', 'tracking', 'attribution', 'kpi'],
      nav: ['Dashboards', 'Explore', 'Sources', 'Alerts', 'Settings'],
      objects: ['dashboard', 'metric', 'source', 'alert'],
      flows: ['Connect a data source', 'Build a first dashboard', 'Share a report', 'Set an alert threshold'],
      screens: ['Dashboard gallery', 'Dashboard canvas', 'Metric explorer', 'Query builder', 'Source connection', 'Alert rules', 'Scheduled reports', 'Sharing and permissions'],
      components: ['ChartFrame', 'MetricTile', 'DimensionPicker', 'DateRangeControl', 'AlertRuleRow'],
      palette: ['#2c5a7a', '#4f6f52', '#c1662f', '#6b3f6b'],
      risks: ['data-model complexity', 'time to first insight', 'competing with the incumbent BI seat']
    },
    ecommerce: {
      name: 'Commerce product',
      keys: ['shop', 'store', 'cart', 'retail', 'checkout', 'merch', 'order', 'inventory', 'brand', 'dtc'],
      nav: ['Shop', 'Orders', 'Inventory', 'Customers', 'Settings'],
      objects: ['product', 'order', 'customer', 'collection'],
      flows: ['Browse to checkout', 'Fulfil an order', 'Add a product', 'Handle a return'],
      screens: ['Storefront grid', 'Product detail', 'Cart and checkout', 'Order list', 'Order detail', 'Product editor', 'Inventory counts', 'Customer record'],
      components: ['ProductCard', 'VariantPicker', 'CartLine', 'OrderStatusTrack', 'StockBadge'],
      palette: ['#8b2f47', '#c1662f', '#2f6b4f', '#2b2b3d'],
      risks: ['margin under paid acquisition', 'fulfilment reliability', 'platform dependency']
    },
    education: {
      name: 'Learning product',
      keys: ['learn', 'course', 'student', 'teach', 'training', 'curriculum', 'lesson', 'school', 'skill', 'certification'],
      nav: ['Learn', 'Courses', 'Progress', 'Community', 'Settings'],
      objects: ['course', 'lesson', 'cohort', 'assessment'],
      flows: ['Enrol on a course', 'Complete a lesson', 'Submit an assessment', 'Track cohort progress'],
      screens: ['Course catalogue', 'Course overview', 'Lesson player', 'Assessment runner', 'Progress dashboard', 'Cohort view', 'Certificate issue', 'Instructor authoring'],
      components: ['LessonPlayer', 'ProgressRing', 'QuizOption', 'CertificateCard', 'CohortRow'],
      palette: ['#4a3f7a', '#c1662f', '#2f6b4f', '#2c5a7a'],
      risks: ['completion rates', 'content production cost', 'credential credibility']
    },
    community: {
      name: 'Community product',
      keys: ['community', 'social', 'network', 'feed', 'creator', 'forum', 'member', 'chat', 'club', 'audience'],
      nav: ['Feed', 'Spaces', 'Members', 'Events', 'Settings'],
      objects: ['post', 'space', 'member', 'event'],
      flows: ['Join a space', 'Post and get a first reply', 'Run an event', 'Moderate a report'],
      screens: ['Home feed', 'Space detail', 'Composer', 'Thread view', 'Member directory', 'Event page', 'Moderation queue', 'Notification centre'],
      components: ['PostCard', 'ReactionBar', 'ThreadReply', 'MemberChip', 'ModerationAction'],
      palette: ['#6b3f6b', '#c1662f', '#2c5a7a', '#2f6b4f'],
      risks: ['empty-room problem', 'moderation load', 'engagement decay']
    },
    saas: {
      name: 'B2B SaaS product',
      keys: [],
      nav: ['Home', 'Work', 'Team', 'Reports', 'Settings'],
      objects: ['workspace', 'item', 'member', 'report'],
      flows: ['Sign up and reach first value', 'Invite the team', 'Complete the core task', 'Upgrade a plan'],
      screens: ['Workspace home', 'Item list', 'Item detail', 'Creation flow', 'Team and roles', 'Reporting', 'Billing and plans', 'Account settings'],
      components: ['WorkspaceSwitcher', 'ItemRow', 'RoleSelect', 'PlanCard', 'InviteDialog'],
      palette: ['#2c5a7a', '#c1662f', '#2f6b4f', '#6b3f6b'],
      risks: ['undifferentiated positioning', 'seat-based expansion', 'onboarding drop-off']
    }
  };

  const classify = (text) => {
    const t = String(text || '').toLowerCase();
    let best = 'saas', bestScore = 0;
    Object.entries(ARCHETYPES).forEach(([key, a]) => {
      const score = a.keys.reduce((s, k) => s + (t.includes(k) ? 1 : 0), 0);
      if (score > bestScore) { bestScore = score; best = key; }
    });
    return { key: best, ...ARCHETYPES[best], matched: bestScore };
  };

  /* -------------------------------------------------------
     Research signals
     ------------------------------------------------------- */
  const SIGNAL_TYPES = {
    interview: { label: 'User interview', weight: 3.0, icon: '🎙' },
    survey: { label: 'Survey response set', weight: 2.0, icon: '📋' },
    support: { label: 'Support ticket pattern', weight: 2.2, icon: '🎫' },
    analytics: { label: 'Analytics observation', weight: 2.4, icon: '📈' },
    competitor: { label: 'Competitor teardown', weight: 1.6, icon: '🔍' },
    sales: { label: 'Sales call note', weight: 2.6, icon: '💬' },
    desk: { label: 'Desk research', weight: 1.2, icon: '📚' }
  };

  const THEME_SHAPES = [
    { title: 'The current workaround is a spreadsheet', tone: 'opportunity' },
    { title: 'Trust is the gate, not price', tone: 'risk' },
    { title: 'The pain is felt weekly, not daily', tone: 'risk' },
    { title: 'One role carries the cost for everyone else', tone: 'opportunity' },
    { title: 'Setup effort is the reason people abandon', tone: 'risk' },
    { title: 'The decision is made by someone who never uses it', tone: 'risk' },
    { title: 'People pay to avoid the reporting, not the work', tone: 'opportunity' },
    { title: 'Existing tools solve it for larger teams only', tone: 'opportunity' },
    { title: 'The trigger event is predictable and recurring', tone: 'opportunity' },
    { title: 'Switching cost is mostly emotional, not technical', tone: 'opportunity' }
  ];

  const synthesise = (product, signals) => {
    const arch = classify(`${product.name} ${product.oneLiner} ${product.problem} ${product.audience}`);
    const r = rng(hash(product.name + product.problem + signals.length));

    const weighted = signals.reduce((s, sig) => s + (SIGNAL_TYPES[sig.type] || { weight: 1 }).weight, 0);
    const coverage = clamp((weighted / 26) * 100, 8, 96);

    const themeCount = clamp(Math.round(2 + signals.length / 2.4), 3, 6);
    const themes = shuffle(r, THEME_SHAPES).slice(0, themeCount).map((t, i) => {
      const backing = Math.max(2, Math.round(signals.length * (0.55 - i * 0.07) + r() * 2));
      return {
        id: 'T' + (i + 1),
        title: t.title,
        tone: t.tone,
        signals: Math.min(backing, signals.length),
        confidence: round(clamp(46 + (backing / Math.max(1, signals.length)) * 48 + r() * 10, 30, 95)),
        quote: pick(r, [
          `"We tried three tools and went back to the sheet because at least everyone can see it."`,
          `"I do this every Monday and I dread it every Monday."`,
          `"Nobody signs off on a new tool unless it survives the security review."`,
          `"It's not that it's hard, it's that it's on me and I never have the time."`,
          `"We'd pay for it if it meant I never build that report again."`,
          `"The trial ended before I'd got our data in."`
        ])
      };
    });

    const jtbd = arch.flows.slice(0, 3).map((f, i) => ({
      id: 'J' + (i + 1),
      statement: `When I need to ${f.toLowerCase()}, I want to do it without leaving my current context, so I can keep moving instead of context-switching.`,
      frequency: pick(r, ['Daily', 'Weekly', 'Every sprint', 'Monthly']),
      currentSolution: pick(r, ['Spreadsheet', 'A competing tool', 'Manual process', 'Internal script', 'Nothing — it goes undone'])
    }));

    const pains = shuffle(r, [
      { text: 'Setup takes longer than the value it returns in week one', sev: 4 },
      { text: 'The person who feels the pain cannot authorise the purchase', sev: 5 },
      { text: 'Data has to be re-entered from a system that already has it', sev: 4 },
      { text: 'There is no way to see whether it worked', sev: 3 },
      { text: 'The workflow breaks the moment a second person is involved', sev: 4 },
      { text: 'Errors are only discovered downstream, after they cost something', sev: 5 },
      { text: 'Nobody trusts the numbers enough to act on them', sev: 4 }
    ]).slice(0, 5).map((p, i) => ({
      ...p,
      id: 'P' + (i + 1),
      frequency: round(clamp(80 - i * 11 + r() * 14, 18, 96)),
      score: 0
    }));
    pains.forEach((p) => { p.score = round((p.frequency / 100) * p.sev * 20); });
    pains.sort((a, b) => b.score - a.score);

    const opportunities = themes.filter((t) => t.tone === 'opportunity').slice(0, 3).map((t, i) => ({
      id: 'O' + (i + 1),
      title: t.title.replace(/^The |^One |^People |^Existing /, ''),
      bet: pick(r, [
        'Remove the setup entirely by importing from what they already use.',
        'Make the output the thing they buy, not the workflow that produces it.',
        'Design for the second user from day one — the workflow is never solo.',
        'Win the security review before the trial, not after it.',
        'Trigger the product at the recurring event rather than waiting to be opened.'
      ]),
      linkedTheme: t.id
    }));

    return {
      archetype: arch.key,
      archetypeName: arch.name,
      coverage: round(coverage),
      signalCount: signals.length,
      weightedSignals: round(weighted, 1),
      themes, jtbd, pains, opportunities,
      gaps: coverage < 55 ? [
        'Too few primary interviews to separate a real pattern from a loud one',
        'No evidence yet from the person who authorises spend',
        'Nothing from users who chose a competitor instead'
      ].slice(0, coverage < 35 ? 3 : 2) : []
    };
  };

  /* -------------------------------------------------------
     Viability
     ------------------------------------------------------- */
  const VIABILITY_AXES = [
    { key: 'desirability', name: 'Desirability', weight: 0.24, blurb: 'Evidence that the pain is real, frequent and felt by a nameable person.' },
    { key: 'viability', name: 'Business viability', weight: 0.22, blurb: 'Willingness to pay, at a price that clears cost of acquisition.' },
    { key: 'feasibility', name: 'Feasibility', weight: 0.16, blurb: 'Whether this team can build and run it at acceptable cost.' },
    { key: 'differentiation', name: 'Differentiation', weight: 0.16, blurb: 'A reason to choose this over the incumbent and the spreadsheet.' },
    { key: 'distribution', name: 'Distribution', weight: 0.14, blurb: 'A repeatable route to the buyer that is not paid-only.' },
    { key: 'timing', name: 'Timing', weight: 0.08, blurb: 'Why this is buildable and buyable now rather than two years ago.' }
  ];

  const WTP = { none: 12, signals: 42, loi: 68, paying: 92 };
  const MARKET = { niche: 38, focused: 62, broad: 84 };
  const COMPLEXITY = { low: 84, medium: 58, high: 30 };
  const TEAMFIT = { weak: 32, ok: 60, strong: 88 };
  const CHANNEL = { none: 18, organic: 52, audience: 76, partnerships: 68, outbound: 58 };

  const assessViability = (product, synthesis, inputs) => {
    const r = rng(hash(product.name + JSON.stringify(inputs)));
    const jit = () => (r() - 0.5) * 7;

    const painStrength = synthesis.pains.length
      ? synthesis.pains.reduce((s, p) => s + p.score, 0) / synthesis.pains.length
      : 40;
    const competitors = clamp(Number(inputs.competitors) || 0, 0, 40);

    const raw = {
      desirability: painStrength * 0.62 + synthesis.coverage * 0.34 + jit(),
      viability: (WTP[inputs.wtp] ?? 12) * 0.66 + (MARKET[inputs.market] ?? 62) * 0.3 + jit(),
      feasibility: (COMPLEXITY[inputs.complexity] ?? 58) * 0.62 + (TEAMFIT[inputs.teamFit] ?? 60) * 0.36 + jit(),
      differentiation: clamp(92 - competitors * 6, 14, 92) * 0.55 + (inputs.wedge ? 38 : 12) + jit(),
      distribution: (CHANNEL[inputs.channel] ?? 18) * 0.82 + (inputs.wedge ? 10 : 0) + jit(),
      timing: 48 + (inputs.unlock ? 30 : 0) + (competitors > 6 ? -14 : 8) + jit()
    };

    const axes = VIABILITY_AXES.map((a) => ({
      ...a,
      score: round(clamp(raw[a.key], 4, 97), 1)
    }));

    const score = round(axes.reduce((s, a) => s + a.score * a.weight, 0), 1);
    const weakest = [...axes].sort((a, b) => a.score - b.score).slice(0, 2);

    let verdict, headline;
    if (score >= 68) {
      verdict = 'go';
      headline = 'Proceed to design. The evidence supports building this.';
    } else if (score >= 48) {
      verdict = 'pivot';
      headline = `Conditional. ${weakest[0].name.toLowerCase()} has to move before this is worth building.`;
    } else {
      verdict = 'no-go';
      headline = 'Do not build this yet. The evidence does not support it.';
    }

    const arch = ARCHETYPES[synthesis.archetype];
    const risks = [
      ...weakest.map((a) => ({
        axis: a.name,
        score: a.score,
        text: {
          desirability: 'The pain is not yet demonstrated to be frequent or severe enough that anyone changes behaviour over it.',
          viability: 'Nobody has committed money or a signature. Stated intent is not willingness to pay.',
          feasibility: 'The build is heavier than this team can carry alongside everything else it owns.',
          differentiation: 'A buyer comparing this to the incumbent has no clear reason to switch.',
          distribution: 'There is no repeatable way to reach the buyer that does not depend on paid acquisition.',
          timing: 'Nothing has changed recently that makes this newly possible or newly urgent.'
        }[a.key]
      })),
      ...arch.risks.slice(0, 1).map((t) => ({ axis: 'Domain', score: null, text: `Category risk: ${t}.` }))
    ];

    const unlocks = weakest.map((a) => ({
      axis: a.name,
      action: {
        desirability: 'Run 6 more interviews with the people who feel the pain weekly, and measure how they solve it today.',
        viability: 'Take 3 letters of intent or 3 pre-payments at the real price before writing production code.',
        feasibility: 'Cut the first release to the single flow that proves the value and buy the rest.',
        differentiation: 'Pick one wedge you can be unambiguously best at and drop the parity features from v1.',
        distribution: 'Prove one repeatable non-paid channel converts before scaling anything.',
        timing: 'Name the specific change — regulation, cost curve, behaviour — that makes now the moment.'
      }[a.key],
      lifts: round(clamp((70 - a.score) * a.weight * 1.3, 1, 18), 1)
    }));

    return {
      axes, score, verdict, headline, risks, unlocks,
      inputs,
      projectedScore: round(clamp(score + unlocks.reduce((s, u) => s + u.lifts, 0), 0, 97), 1)
    };
  };

  /* -------------------------------------------------------
     Design generation
     ------------------------------------------------------- */
  const BASE_COMPONENTS = [
    'Button', 'IconButton', 'TextField', 'Select', 'Checkbox', 'RadioGroup', 'Toggle',
    'Card', 'Modal', 'Drawer', 'Toast', 'Tooltip', 'Tabs', 'Badge', 'Avatar',
    'Table', 'Pagination', 'Breadcrumb', 'EmptyState', 'Skeleton', 'Banner'
  ];

  const generateDesign = (product, synthesis, viability) => {
    const arch = ARCHETYPES[synthesis.archetype];
    const r = rng(hash(product.name + synthesis.archetype + 'design'));

    const ia = {
      root: product.name || 'Product',
      primary: arch.nav.map((n, i) => ({
        name: n,
        children: i === 0 ? [] : shuffle(r, ['All', 'Assigned to me', 'Archived', 'Templates', 'Trash']).slice(0, 2)
      }))
    };

    const flows = arch.flows.map((f, i) => {
      const steps = 3 + Math.floor(r() * 3);
      return {
        id: 'FL' + (i + 1),
        name: f,
        critical: i < 2,
        steps: Array.from({ length: steps }, (_, s) => ({
          n: s + 1,
          name: ['Entry', 'Input', 'Confirm', 'Result', 'Follow-up'][s] || 'Step ' + (s + 1)
        })),
        successMetric: pick(r, [
          'Time to first success under 4 minutes',
          'Completion rate above 70%',
          'Fewer than 2 support contacts per 100 completions',
          'Return within 7 days above 45%'
        ])
      };
    });

    const screens = arch.screens.map((s, i) => ({
      id: 'S' + String(i + 1).padStart(2, '0'),
      name: s,
      priority: i < 4 ? 'P0' : i < 6 ? 'P1' : 'P2',
      states: shuffle(r, ['empty', 'loading', 'error', 'populated', 'permission-denied']).slice(0, 2 + Math.floor(r() * 2)).concat('default'),
      flow: flows[Math.min(flows.length - 1, Math.floor(i / 2))].id
    }));

    const paletteBase = arch.palette;
    const tokens = {
      color: [
        { name: 'brand/primary', value: paletteBase[0], role: 'Primary actions and active state' },
        { name: 'brand/accent', value: paletteBase[2], role: 'Emphasis, focus and highlights' },
        { name: 'support/positive', value: '#2f6b4f', role: 'Success and confirmation' },
        { name: 'support/warning', value: '#a07b12', role: 'Caution and pending' },
        { name: 'support/critical', value: '#b3261e', role: 'Destructive and error' },
        { name: 'surface/base', value: '#fffdf9', role: 'Page and card background' },
        { name: 'surface/sunk', value: '#f2ece1', role: 'Recessed and disabled areas' },
        { name: 'ink/primary', value: '#17140f', role: 'Body and heading text' },
        { name: 'ink/muted', value: '#736c60', role: 'Secondary and metadata text' }
      ],
      type: [
        { name: 'display', value: '34/38', use: 'Page titles' },
        { name: 'title', value: '25/29', use: 'Section headings' },
        { name: 'subtitle', value: '19/25', use: 'Card headings' },
        { name: 'body', value: '15/23', use: 'Default text' },
        { name: 'body-sm', value: '13.5/20', use: 'Dense tables and meta' },
        { name: 'caption', value: '12/16', use: 'Labels and hints' },
        { name: 'mono', value: '13/20', use: 'Identifiers and code' }
      ],
      space: ['2', '4', '8', '12', '18', '26', '40', '64'],
      radius: ['4', '8', '12', '18', '999']
    };

    const components = [...BASE_COMPONENTS, ...arch.components].map((name, i) => ({
      id: 'C' + String(i + 1).padStart(2, '0'),
      name,
      kind: BASE_COMPONENTS.includes(name) ? 'foundation' : 'domain',
      variants: 2 + Math.floor(r() * 5),
      usedIn: 1 + Math.floor(r() * Math.min(8, screens.length)),
      status: 'specified',
      stories: 0
    }));

    return {
      archetype: synthesis.archetype,
      archetypeName: arch.name,
      generatedAt: Date.now(),
      ia, flows, screens, tokens, components,
      principles: [
        {
          name: 'One screen, one decision',
          body: `Every ${arch.objects[0]} view answers a single question. Anything the user does not need to decide here moves to a detail view or a default.`
        },
        {
          name: 'The empty state is the onboarding',
          body: 'No blank frames. Each empty view states what it is, why it is empty and the one action that fills it.'
        },
        {
          name: 'Show state, not spinners',
          body: 'Every wait over 400ms uses a skeleton shaped like the content that is coming.'
        },
        {
          name: 'Accessible by construction',
          body: 'Contrast is guaranteed at the token layer and accessible names are required props, so no call site can opt out.'
        }
      ]
    };
  };

  /** Turn the generated design into build tickets. */
  const designToTickets = (design, source = 'mn') => {
    const t = [];
    design.screens.filter((s) => s.priority !== 'P2').forEach((s, i) => {
      t.push({
        id: MN.uid('tkt'),
        key: `${source === 'jira' ? 'PRD' : 'FEA'}-${200 + i}`,
        source,
        title: `Build ${s.name}`,
        body: `Implement the ${s.name} screen with states: ${s.states.join(', ')}. Belongs to flow ${s.flow}.`,
        type: 'feature',
        severity: s.priority === 'P0' ? 'high' : 'medium',
        points: s.priority === 'P0' ? 5 : 3,
        status: 'backlog',
        dimension: 'Product design',
        origin: 'design',
        fixes: [`Cover every state: ${s.states.join(', ')}`, 'Use only system components and tokens', 'Ship with stories for each state'],
        agent: null,
        log: []
      });
    });
    design.components.filter((c) => c.kind === 'domain').forEach((c, i) => {
      t.push({
        id: MN.uid('tkt'),
        key: `${source === 'jira' ? 'PRD' : 'FEA'}-${300 + i}`,
        source,
        title: `Build ${c.name} component`,
        body: `${c.variants} variants, used on ${c.usedIn} screens. Domain component for the ${design.archetypeName.toLowerCase()}.`,
        type: 'component',
        severity: 'medium',
        points: 3,
        status: 'backlog',
        dimension: 'Design system',
        origin: 'design',
        component: c.name,
        fixes: ['Implement the full state matrix', 'Accessible name as a required prop', 'One story per variant'],
        agent: null,
        log: []
      });
    });
    return t;
  };

  /* -------------------------------------------------------
     Agents
     ------------------------------------------------------- */
  const AGENTS = [
    { id: 'synthesist', name: 'Research Synthesist', role: 'Research', icon: '🎙', desc: 'Clusters raw signals into themes, jobs-to-be-done and ranked pains, keeping every claim traceable to the interview it came from.', area: 'research' },
    { id: 'analyst', name: 'Viability Analyst', role: 'Research', icon: '⚖', desc: 'Scores desirability, viability, feasibility, differentiation, distribution and timing, then states what would have to change to flip the verdict.', area: 'research' },
    { id: 'auditor', name: 'Debt Auditor', role: 'Design debt', icon: '🔬', desc: 'Crawls a live product or reads a Figma file, scores eight debt dimensions and writes the costed refactoring strategy.', area: 'debt' },
    { id: 'tokens', name: 'Token Architect', role: 'Design debt', icon: '🎨', desc: 'Extracts the live palette, type and spacing, collapses near-duplicates and emits tokens for both CSS and Figma variables.', area: 'debt' },
    { id: 'consolidator', name: 'Component Consolidator', role: 'Design debt', icon: '🧩', desc: 'Clusters near-duplicate components, picks the canonical implementation and codemods the call sites in waves.', area: 'debt' },
    { id: 'a11y', name: 'Accessibility Guardian', role: 'Design debt', icon: '♿', desc: 'Checks contrast, names, focus order and target size on every change, and blocks the ones that regress.', area: 'debt' },
    { id: 'architect', name: 'Product Architect', role: 'Design', icon: '🗺', desc: 'Turns synthesis into information architecture, core flows and a prioritised screen inventory.', area: 'design' },
    { id: 'systemsmith', name: 'System Smith', role: 'Design', icon: '⚙', desc: 'Generates the token set and component inventory the screens need, with the full state matrix specified.', area: 'design' },
    { id: 'triager', name: 'Ticket Triager', role: 'Build', icon: '🗂', desc: 'Reads incoming Linear and Jira tickets, classifies them, sizes them and routes them to the right agent or human.', area: 'build' },
    { id: 'fixer', name: 'Bug Fixer', role: 'Build', icon: '🔧', desc: 'Reproduces the defect, writes a failing test, fixes it against the design system and opens the pull request.', area: 'build' },
    { id: 'builder', name: 'Feature Builder', role: 'Build', icon: '🏗', desc: 'Implements a feature ticket from the spec using only system components, with stories and tests attached.', area: 'build' },
    { id: 'publisher', name: 'Storybook Publisher', role: 'Ship', icon: '📚', desc: 'Publishes reviewed components with a story per variant and runs visual regression against the baseline.', area: 'ship' }
  ];

  const agentFor = (ticket) => {
    if (ticket.type === 'bug') return AGENTS.find((a) => a.id === 'fixer');
    if (ticket.type === 'component') return AGENTS.find((a) => a.id === 'systemsmith');
    if (ticket.type === 'chore') return AGENTS.find((a) => a.id === (ticket.dimension === 'Accessibility' ? 'a11y' : 'consolidator'));
    return AGENTS.find((a) => a.id === 'builder');
  };

  /** Deterministic run script for an agent working a ticket. */
  const agentScript = (ticket, agent) => {
    const r = rng(hash(ticket.key + agent.id));
    const slug = (ticket.component || ticket.title)
      .replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/).slice(0, 3)
      .map((w) => w[0].toUpperCase() + w.slice(1)).join('');
    const branch = `${ticket.type === 'bug' ? 'fix' : 'feat'}/${ticket.key.toLowerCase()}-${slug.toLowerCase()}`;
    const files = [
      `src/components/${slug}/${slug}.tsx`,
      `src/components/${slug}/${slug}.stories.tsx`,
      `src/components/${slug}/${slug}.test.tsx`
    ];

    const common = [
      { t: 'dim', s: `reading ticket ${ticket.key} — ${ticket.title}` },
      { t: 'ag', s: `${agent.name} picked up the ticket` },
      { t: 'dim', s: `loading design system context: tokens, ${20 + Math.floor(r() * 14)} components, state matrix` },
      { t: 'dim', s: `branch ${branch}` }
    ];

    const body = ticket.type === 'bug' ? [
      { t: 'dim', s: 'reproducing against the reported conditions' },
      { t: 'err', s: `reproduced — assertion failed in ${files[0].replace('.tsx', '')}` },
      { t: 'dim', s: 'writing a failing test that captures the defect' },
      { t: 'ok', s: `+ ${files[2]} (1 failing test)` },
      { t: 'dim', s: 'applying fix using system tokens rather than local values' },
      { t: 'ok', s: `~ ${files[0]}` }
    ] : ticket.type === 'component' ? [
      { t: 'dim', s: `generating component from spec — ${2 + Math.floor(r() * 4)} variants, full state matrix` },
      { t: 'ok', s: `+ ${files[0]}` },
      { t: 'dim', s: 'accessible name enforced as a required prop' },
      { t: 'ok', s: `+ ${files[1]} (story per variant)` },
      { t: 'ok', s: `+ ${files[2]}` }
    ] : [
      { t: 'dim', s: 'reading the spec and the screens it touches' },
      { t: 'ok', s: `+ ${files[0]}` },
      { t: 'dim', s: 'wiring empty, loading and error states' },
      { t: 'ok', s: `+ ${files[1]}` },
      { t: 'ok', s: `+ ${files[2]}` }
    ];

    const checks = [
      { t: 'dim', s: 'running checks' },
      { t: 'ok', s: `typecheck passed` },
      { t: 'ok', s: `unit tests passed (${8 + Math.floor(r() * 22)} tests)` },
      { t: r() > 0.72 ? 'warn' : 'ok', s: r() > 0.72
        ? `contrast 4.38:1 on the muted label — nudged to the next token step`
        : `accessibility checks passed — contrast, names, focus, targets` },
      { t: 'ok', s: `visual regression: ${Math.floor(r() * 3)} diffs, none unexpected` },
      { t: 'ag', s: `opened PR #${300 + Math.floor(r() * 400)} — ready for review` }
    ];

    return [...common, ...body, ...checks];
  };

  MN.Pipeline = {
    ARCHETYPES, SIGNAL_TYPES, VIABILITY_AXES, AGENTS,
    classify, synthesise, assessViability, generateDesign,
    designToTickets, agentFor, agentScript
  };
})();
