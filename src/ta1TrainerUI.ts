import {
  ISO_SYMBOLS,
  FLOWCHART_SCENARIOS,
  SYMBOL_DRILL_BANK,
  MIND_MAP_CHALLENGE,
  WIREFRAME_CHALLENGE,
  VISUALISATION_CHALLENGE,
  TOOL_CHOICE_QUESTIONS,
  createInitialSubmission,
  createModelSubmission,
  evaluateFlowchartSubmission,
  traceFlowchartExecution,
  validateFreeformFlowchart,
  evaluateMindMap,
  evaluateWireframeSelection,
  evaluateVisualisationDiagram,
  evaluateToolChoice,
  computeTa1MasterySummary,
  type FlowchartSymbolType,
  type FlowchartScenario,
  type FlowchartUserSubmission,
  type FlowchartEvaluationResult,
  type TraceSimulationResult,
  type FreeformNode,
  type FreeformEdge,
  type Ta1TrainerProgress,
  type Ta1MasterySummary,
} from './ta1TrainerEngine';

const STORAGE_KEY = 'OCR_R050_TA1_TRAINER_V1';

export type Ta1TrainerTab = 'flowchart' | 'drill' | 'blueprints' | 'tools';
export type BlueprintSubTab = 'mindmap' | 'wireframe' | 'visualisation';

interface Ta1TrainerUiState {
  activeTab: Ta1TrainerTab;
  // Tab 1: Flowchart
  flowchartMode: 'scenario' | 'freeform';
  scenarioId: string;
  selectedNodeId: string;
  submissions: Record<string, FlowchartUserSubmission>;
  evaluations: Record<string, FlowchartEvaluationResult | null>;
  selectedTestCaseId: Record<string, string>;
  traceResult: TraceSimulationResult | null;
  traceStepIndex: number;
  traceTimer: number | null;
  // Freeform
  freeformNodes: FreeformNode[];
  freeformEdges: FreeformEdge[];
  freeformSelectedId: string | null;
  freeformCheckResult: ReturnType<typeof validateFreeformFlowchart> | null;
  // Tab 2: Symbol & Error Drill
  drillFilter: 'all' | 'symbols' | 'errors';
  drillIndex: number;
  drillAnswers: Record<string, string>;
  // Tab 3: Blueprints
  blueprintTab: BlueprintSubTab;
  mindMapSelectedSlotId: string;
  mindMapAssignments: Record<string, string>;
  mindMapResult: ReturnType<typeof evaluateMindMap> | null;
  wireframeSelectedIds: string[];
  wireframeResult: ReturnType<typeof evaluateWireframeSelection> | null;
  visSelectedPinId: string;
  visAssignments: Record<string, string>;
  visResult: ReturnType<typeof evaluateVisualisationDiagram> | null;
  // Tab 4: Choose the Tool
  toolIndex: number;
  toolSelections: Record<string, { tool: string; reasonId: string; checked: boolean }>;
  // Persisted mastery
  progress: Ta1TrainerProgress;
}

let containerEl: HTMLElement | null = null;
let onProgressChangeCb: ((summary: Ta1MasterySummary) => void) | null = null;
let onOpenQuickRefCb: ((topicId: string) => void) | null = null;
let onShowToastCb: ((msg: string, type?: string) => void) | null = null;

function esc(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadProgress(): Ta1TrainerProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        completedFlowcharts: parsed.completedFlowcharts || {},
        completedDrills: parsed.completedDrills || {},
        completedBlueprints: parsed.completedBlueprints || {},
        completedToolMatches: parsed.completedToolMatches || {},
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return {
    completedFlowcharts: {},
    completedDrills: {},
    completedBlueprints: {},
    completedToolMatches: {},
  };
}

function saveProgress(progress: Ta1TrainerProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage write errors
  }
  if (onProgressChangeCb) {
    onProgressChangeCb(computeTa1MasterySummary(progress));
  }
}

function createInitialState(): Ta1TrainerUiState {
  const submissions: Record<string, FlowchartUserSubmission> = {};
  const evaluations: Record<string, FlowchartEvaluationResult | null> = {};
  const selectedTestCaseId: Record<string, string> = {};

  for (const s of FLOWCHART_SCENARIOS) {
    submissions[s.id] = createInitialSubmission(s);
    evaluations[s.id] = null;
    selectedTestCaseId[s.id] = s.testCases[0]?.id || '';
  }

  return {
    activeTab: 'flowchart',
    flowchartMode: 'scenario',
    scenarioId: FLOWCHART_SCENARIOS[0].id,
    selectedNodeId: 'n2',
    submissions,
    evaluations,
    selectedTestCaseId,
    traceResult: null,
    traceStepIndex: -1,
    traceTimer: null,
    freeformNodes: [
      { id: 'ff-1', symbol: 'terminator', label: 'Start', x: 340, y: 46 },
      { id: 'ff-2', symbol: 'io', label: 'Input password', x: 340, y: 132 },
      { id: 'ff-3', symbol: 'decision', label: 'Password valid?', x: 340, y: 230 },
      { id: 'ff-4', symbol: 'process', label: 'Grant access', x: 170, y: 344 },
      { id: 'ff-5', symbol: 'io', label: 'Show error', x: 510, y: 344 },
      { id: 'ff-6', symbol: 'terminator', label: 'End', x: 340, y: 452 },
    ],
    freeformEdges: [
      { id: 'fe-1', from: 'ff-1', to: 'ff-2', branchLabel: '' },
      { id: 'fe-2', from: 'ff-2', to: 'ff-3', branchLabel: '' },
      { id: 'fe-3', from: 'ff-3', to: 'ff-4', branchLabel: 'Yes' },
      { id: 'fe-4', from: 'ff-3', to: 'ff-5', branchLabel: 'No' },
      { id: 'fe-5', from: 'ff-4', to: 'ff-6', branchLabel: '' },
      { id: 'fe-6', from: 'ff-5', to: 'ff-6', branchLabel: '' },
    ],
    freeformSelectedId: 'ff-2',
    freeformCheckResult: null,
    drillFilter: 'all',
    drillIndex: 0,
    drillAnswers: {},
    blueprintTab: 'mindmap',
    mindMapSelectedSlotId: 'mm-b1',
    mindMapAssignments: { 'mm-center': MIND_MAP_CHALLENGE.slots[0].expectedLabel },
    mindMapResult: null,
    wireframeSelectedIds: ['wf-logo', 'wf-nav'],
    wireframeResult: null,
    visSelectedPinId: 'vp-1',
    visAssignments: {},
    visResult: null,
    toolIndex: 0,
    toolSelections: {},
    progress: loadProgress(),
  };
}

let uiState: Ta1TrainerUiState = createInitialState();

function stopTracePlayback(): void {
  if (uiState.traceTimer !== null) {
    window.clearInterval(uiState.traceTimer);
    uiState.traceTimer = null;
  }
}

function getActiveScenario(): FlowchartScenario {
  return FLOWCHART_SCENARIOS.find((s) => s.id === uiState.scenarioId) || FLOWCHART_SCENARIOS[0];
}

function renderSymbolSvgShape(
  type: FlowchartSymbolType | '',
  cx: number,
  cy: number,
  opts: {
    fill: string;
    stroke: string;
    strokeWidth?: number;
    dashed?: boolean;
    w?: number;
    h?: number;
  }
): string {
  const sw = opts.strokeWidth ?? 2;
  const dashAttr = opts.dashed ? 'stroke-dasharray="6 4"' : '';
  const w = opts.w ?? 186;
  const h = opts.h ?? 52;
  const x = cx - w / 2;
  const y = cy - h / 2;

  if (!type) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${opts.fill}" stroke="${opts.stroke}" stroke-width="${sw}" ${dashAttr} />`;
  }

  switch (type) {
    case 'terminator':
      return `<rect x="${x + 14}" y="${y + 4}" width="${w - 28}" height="${h - 8}" rx="${(h - 8) / 2}" ry="${(h - 8) / 2}" fill="${opts.fill}" stroke="${opts.stroke}" stroke-width="${sw}" ${dashAttr} />`;
    case 'process':
      return `<rect x="${x + 4}" y="${y + 2}" width="${w - 8}" height="${h - 4}" rx="4" fill="${opts.fill}" stroke="${opts.stroke}" stroke-width="${sw}" ${dashAttr} />`;
    case 'io': {
      const skew = 16;
      const pts = [
        `${x + skew},${y + 2}`,
        `${x + w},${y + 2}`,
        `${x + w - skew},${y + h - 2}`,
        `${x},${y + h - 2}`,
      ].join(' ');
      return `<polygon points="${pts}" fill="${opts.fill}" stroke="${opts.stroke}" stroke-width="${sw}" stroke-linejoin="round" ${dashAttr} />`;
    }
    case 'decision': {
      const isMini = h < 34;
      const dw = isMini ? w - 6 : w + 28;
      const dh = isMini ? h + 10 : h + 32;
      const pts = [
        `${cx},${cy - dh / 2}`,
        `${cx + dw / 2},${cy}`,
        `${cx},${cy + dh / 2}`,
        `${cx - dw / 2},${cy}`,
      ].join(' ');
      return `<polygon points="${pts}" fill="${opts.fill}" stroke="${opts.stroke}" stroke-width="${sw}" stroke-linejoin="round" ${dashAttr} />`;
    }
    case 'subroutine': {
      const rx = x + 4;
      const ry = y + 2;
      const rw = w - 8;
      const rh = h - 4;
      return `
        <g>
          <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="3" fill="${opts.fill}" stroke="${opts.stroke}" stroke-width="${sw}" ${dashAttr} />
          <line x1="${rx + 14}" y1="${ry}" x2="${rx + 14}" y2="${ry + rh}" stroke="${opts.stroke}" stroke-width="${sw}" />
          <line x1="${rx + rw - 14}" y1="${ry}" x2="${rx + rw - 14}" y2="${ry + rh}" stroke="${opts.stroke}" stroke-width="${sw}" />
        </g>
      `;
    }
  }
}

function renderSymbolIconMini(type: FlowchartSymbolType, active = false): string {
  const stroke = active ? '#ffffff' : '#334155';
  const fill = active ? 'rgba(255,255,255,0.16)' : '#f8fafc';
  return `<svg viewBox="0 0 80 42" class="w-11 h-6 shrink-0" aria-hidden="true">${renderSymbolSvgShape(type, 40, 21, {
    fill,
    stroke,
    strokeWidth: 2.4,
    w: 64,
    h: 26,
  })}</svg>`;
}

function buildScenarioEdgePath(
  fromNode: { x: number; y: number },
  toNode: { x: number; y: number },
  route?: string
): { d: string; labelX: number; labelY: number } {
  const fromYBottom = fromNode.y + 28;
  const toYTop = toNode.y - 28;

  if (route === 'left-down') {
    const startX = fromNode.x - 107;
    const startY = fromNode.y;
    const endX = toNode.x;
    const endY = toNode.y - 28;
    return {
      d: `M ${startX} ${startY} L ${endX} ${startY} L ${endX} ${endY}`,
      labelX: (startX + endX) / 2,
      labelY: startY - 12,
    };
  }
  if (route === 'right-down') {
    const startX = fromNode.x + 107;
    const startY = fromNode.y;
    const endX = toNode.x;
    const endY = toNode.y - 28;
    return {
      d: `M ${startX} ${startY} L ${endX} ${startY} L ${endX} ${endY}`,
      labelX: (startX + endX) / 2,
      labelY: startY - 12,
    };
  }
  if (route === 'merge-left') {
    const startX = fromNode.x;
    const startY = fromNode.y + 28;
    const endX = toNode.x - 79;
    const endY = toNode.y;
    return {
      d: `M ${startX} ${startY} L ${startX} ${endY} L ${endX} ${endY}`,
      labelX: startX + 24,
      labelY: endY - 10,
    };
  }
  if (route === 'merge-right') {
    const startX = fromNode.x;
    const startY = fromNode.y + 28;
    const endX = toNode.x + 79;
    const endY = toNode.y;
    return {
      d: `M ${startX} ${startY} L ${startX} ${endY} L ${endX} ${endY}`,
      labelX: startX - 24,
      labelY: endY - 10,
    };
  }
  return {
    d: `M ${fromNode.x} ${fromYBottom} L ${toNode.x} ${toYTop}`,
    labelX: (fromNode.x + toNode.x) / 2 + 12,
    labelY: (fromYBottom + toYTop) / 2,
  };
}

function renderHeaderAndTabs(summary: Ta1MasterySummary): string {
  const tabs: Array<{ id: Ta1TrainerTab; label: string; meta: string; icon: string }> = [
    {
      id: 'flowchart',
      label: 'Flowchart Builder & Tracer',
      meta: `${summary.flowchartsDone}/${summary.flowchartsTotal}`,
      icon: 'fa-diagram-project',
    },
    {
      id: 'drill',
      label: 'ISO Symbols & Spot the Error',
      meta: `${summary.drillsDone}/${summary.drillsTotal}`,
      icon: 'fa-shapes',
    },
    {
      id: 'blueprints',
      label: 'Mind Map · Wireframe · Visualisation',
      meta: `${summary.blueprintsDone}/${summary.blueprintsTotal}`,
      icon: 'fa-compass-drafting',
    },
    {
      id: 'tools',
      label: 'Choose the TA1 Tool',
      meta: `${summary.toolsDone}/${summary.toolsTotal}`,
      icon: 'fa-list-check',
    },
  ];

  return `
    <div class="space-y-1.5">
      <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium tabular-nums">
        <span class="font-bold text-indigo-600">Topic Area 1 · Design Tools</span>
        <span aria-hidden="true">·</span>
        <span>OCR Unit R050 Interactive Studio</span>
        <span aria-hidden="true">·</span>
        <span data-testid="ta1-mastery-summary">${summary.completedChallenges} of ${summary.totalChallenges} Challenges Mastered (${summary.masteryPct}%)</span>
      </div>
      <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900" style="text-wrap: balance;">
        Interactive TA1 Diagram &amp; Flowchart Trainer
      </h1>
      <p class="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
        Build exam-ready ISO 5807 flowcharts, trace execution step by step, spot convention mistakes, and practise Mind Maps, Wireframes, and Visualisation Diagrams with instant OCR mark-scheme checks.
      </p>
    </div>

    <!-- Mode Navigation Tabs -->
    <div role="tablist" aria-label="TA1 Trainer Modes" class="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-200/75 rounded-2xl border border-slate-200">
      ${tabs
        .map((t) => {
          const active = uiState.activeTab === t.id;
          return `
            <button type="button" role="tab" aria-selected="${active ? 'true' : 'false'}" data-ta1-tab="${t.id}"
              class="flex-1 min-w-[165px] px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }">
              <i class="fa-solid ${t.icon} ${active ? 'text-indigo-600' : 'text-slate-400'}"></i>
              <span>${esc(t.label)}</span>
              <span class="font-mono tabular-nums text-[11px] ${active ? 'text-indigo-600 font-bold' : 'text-slate-500'}">${t.meta}</span>
            </button>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderFlowchartScenarioTab(): string {
  const scenario = getActiveScenario();
  const submission = uiState.submissions[scenario.id] || createInitialSubmission(scenario);
  const evaluation = uiState.evaluations[scenario.id] || null;
  const selectedNode = scenario.nodes.find((n) => n.id === uiState.selectedNodeId) || scenario.nodes[1] || scenario.nodes[0];
  const activeTestCaseId = uiState.selectedTestCaseId[scenario.id] || scenario.testCases[0].id;
  const activeTestCase = scenario.testCases.find((t) => t.id === activeTestCaseId) || scenario.testCases[0];

  const activeTraceStep =
    uiState.traceResult && uiState.traceStepIndex >= 0
      ? uiState.traceResult.steps[uiState.traceStepIndex] || null
      : null;

  const tracedNodeIds = new Set<string>();
  const tracedEdgeIds = new Set<string>();
  if (uiState.traceResult && uiState.traceStepIndex >= 0) {
    for (let i = 0; i <= uiState.traceStepIndex && i < uiState.traceResult.steps.length; i++) {
      const st = uiState.traceResult.steps[i];
      tracedNodeIds.add(st.nodeId);
      if (st.edgeIdTaken) tracedEdgeIds.add(st.edgeIdTaken);
    }
  }

  const nodeMap = new Map(scenario.nodes.map((n) => [n.id, n]));

  const edgesSvg = scenario.edges
    .map((edge) => {
      const from = nodeMap.get(edge.from);
      const to = nodeMap.get(edge.to);
      if (!from || !to) return '';
      const pathInfo = buildScenarioEdgePath(from, to, edge.route);
      const isTraced = tracedEdgeIds.has(edge.id);
      const edgeEval = evaluation?.edgeResults[edge.id];
      const stroke = isTraced
        ? '#059669'
        : edgeEval
          ? edgeEval.correct
            ? '#059669'
            : '#dc2626'
          : '#475569';
      const marker = isTraced ? 'url(#ta1-arrow-trace)' : 'url(#ta1-arrow)';
      const branchLabel = edge.expectedBranchLabel ? submission.edgeLabels[edge.id] || '' : '';

      let branchBadgeSvg = '';
      if (edge.expectedBranchLabel) {
        const displayBranch = branchLabel || '? Branch';
        const badgeBg = isTraced
          ? '#059669'
          : edgeEval
            ? edgeEval.correct
              ? '#ecfdf5'
              : '#fef2f2'
            : branchLabel
              ? '#eef2ff'
              : '#fffbeb';
        const badgeBorder = isTraced
          ? '#059669'
          : edgeEval
            ? edgeEval.correct
              ? '#10b981'
              : '#ef4444'
            : branchLabel
              ? '#6366f1'
              : '#f59e0b';
        const badgeText = isTraced
          ? '#ffffff'
          : edgeEval
            ? edgeEval.correct
              ? '#065f46'
              : '#991b1b'
            : branchLabel
              ? '#312e81'
              : '#92400e';

        branchBadgeSvg = `
          <g class="cursor-pointer" data-ta1-edge-toggle="${edge.id}" role="button" tabindex="0" aria-label="Toggle branch label for ${edge.id}, currently ${esc(displayBranch)}">
            <rect x="${pathInfo.labelX - 34}" y="${pathInfo.labelY - 12}" width="68" height="24" rx="6" fill="${badgeBg}" stroke="${badgeBorder}" stroke-width="1.5" />
            <text x="${pathInfo.labelX}" y="${pathInfo.labelY + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${badgeText}" font-family="Plus Jakarta Sans, sans-serif">${esc(displayBranch)}</text>
          </g>
        `;
      }

      return `
        <path d="${pathInfo.d}" fill="none" stroke="${stroke}" stroke-width="${isTraced ? 3.2 : 2}" marker-end="${marker}" stroke-linejoin="round" />
        ${branchBadgeSvg}
      `;
    })
    .join('');

  const nodesSvg = scenario.nodes
    .map((node, idx) => {
      const sym = submission.nodeSymbols[node.id] || '';
      const label = submission.nodeLabels[node.id] || '';
      const isSelected = selectedNode.id === node.id;
      const isCurrentTrace = activeTraceStep?.nodeId === node.id;
      const isVisitedTrace = tracedNodeIds.has(node.id);
      const nodeEval = evaluation?.nodeResults[node.id];

      let fill = '#ffffff';
      let stroke = '#334155';
      let dashed = false;

      if (!sym && !node.locked) {
        fill = '#f8fafc';
        stroke = '#94a3b8';
        dashed = true;
      }
      if (node.locked) {
        fill = '#f1f5f9';
        stroke = '#334155';
      }
      if (nodeEval && !node.locked) {
        if (nodeEval.symbolCorrect && nodeEval.labelCorrect) {
          fill = '#ecfdf5';
          stroke = '#059669';
          dashed = false;
        } else {
          fill = '#fef2f2';
          stroke = '#dc2626';
          dashed = false;
        }
      }
      if (isSelected) {
        stroke = '#4f46e5';
      }
      if (isCurrentTrace) {
        fill = '#ecfdf5';
        stroke = '#059669';
        dashed = false;
      }

      const displaySym: FlowchartSymbolType | '' = sym;
      const displayText = label || (node.locked ? node.expectedLabel : `Step ${idx + 1}: Click to assign`);
      const textFill = label || node.locked ? '#0f172a' : '#64748b';
      const halo = isCurrentTrace
        ? `<circle cx="${node.x}" cy="${node.y}" r="42" fill="none" stroke="#10b981" stroke-width="2.5" opacity="0.45" />`
        : isSelected
          ? `<rect x="${node.x - 104}" y="${node.y - 34}" width="208" height="68" rx="14" fill="none" stroke="#6366f1" stroke-width="2" stroke-dasharray="5 3" opacity="0.85" />`
          : '';

      const tagText = displaySym === 'decision'
        ? `SLOT ${idx + 1}`
        : `SLOT ${idx + 1}${sym ? ` · ${ISO_SYMBOLS[sym].name.toUpperCase()}` : ''}`;
      const stepTag = !node.locked
        ? `<text x="${node.x}" y="${node.y - (displaySym === 'decision' ? 14 : 13)}" text-anchor="middle" font-size="9" font-weight="700" fill="${isSelected ? '#4f46e5' : '#64748b'}" font-family="JetBrains Mono, monospace">${tagText}</text>`
        : '';

      const textY = !node.locked ? node.y + 6 : node.y + 4;
      const visitedDot =
        isVisitedTrace && !isCurrentTrace
          ? `<circle cx="${node.x + 86}" cy="${node.y - 18}" r="6" fill="#059669" /><text x="${node.x + 86}" y="${node.y - 15}" text-anchor="middle" font-size="8" font-weight="700" fill="#ffffff">✓</text>`
          : '';

      return `
        <g class="cursor-pointer" data-ta1-select-node="${node.id}" role="button" tabindex="0" aria-label="Flowchart Slot ${idx + 1}: ${esc(displayText)}">
          ${halo}
          ${renderSymbolSvgShape(displaySym, node.x, node.y, {
            fill,
            stroke,
            strokeWidth: isSelected || isCurrentTrace ? 2.8 : 2,
            dashed,
          })}
          ${stepTag}
          <text x="${node.x}" y="${textY}" text-anchor="middle" font-size="12" font-weight="${label || node.locked ? '700' : '600'}" fill="${textFill}" font-family="Plus Jakarta Sans, sans-serif">${esc(displayText)}</text>
          ${visitedDot}
        </g>
      `;
    })
    .join('');

  const selectedSym = submission.nodeSymbols[selectedNode.id] || '';
  const selectedLabel = submission.nodeLabels[selectedNode.id] || '';
  const selectedIndex = scenario.nodes.findIndex((n) => n.id === selectedNode.id) + 1;
  const branchEdges = scenario.edges.filter((e) => Boolean(e.expectedBranchLabel));

  const traceLogHtml = uiState.traceResult
    ? `
      <div class="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
        ${uiState.traceResult.steps
          .map((st, idx) => {
            const isCurrent = idx === uiState.traceStepIndex;
            const isPast = idx < uiState.traceStepIndex;
            return `
              <div class="px-3 py-2 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                isCurrent
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                  : isPast
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-white border-slate-100 text-slate-400'
              }">
                <div class="min-w-0">
                  <span class="font-mono tabular-nums font-bold mr-1.5">${st.stepNumber}.</span>
                  <span>${esc(st.note)}</span>
                </div>
                ${isCurrent ? '<span class="text-[11px] font-bold text-emerald-700 shrink-0">Active</span>' : isPast ? '<span class="text-[11px] font-semibold text-slate-500 shrink-0">Done</span>' : ''}
              </div>
            `;
          })
          .join('')}
      </div>
    `
    : `<p class="text-xs text-slate-500">Pick a test case above and click <strong>Play Trace</strong> or <strong>Step Forward</strong> to watch data flow through your symbols and decision branches.</p>`;

  const evaluationHtml = evaluation
    ? `
      <div data-testid="ta1-flowchart-score" class="bg-white rounded-2xl border ${evaluation.allPassed ? 'border-emerald-300' : 'border-slate-200'} p-5 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <p class="text-xs font-semibold ${evaluation.allPassed ? 'text-emerald-700' : 'text-amber-700'}">
              ${evaluation.allPassed ? 'Full OCR Mark Scheme Met' : 'OCR Mark Scheme Feedback'}
            </p>
            <h3 class="text-base font-bold text-slate-900">
              Score: <span class="font-mono tabular-nums">${evaluation.marksEarned} / ${evaluation.maxMarks} Marks</span> (${evaluation.pct}%)
            </h3>
          </div>
          <button type="button" data-ta1-action="show-model" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap">
            Load Model Solution
          </button>
        </div>
        <div class="space-y-2">
          ${evaluation.criteria
            .map(
              (c) => `
              <div class="flex items-start justify-between gap-3 text-xs py-1.5 border-b border-slate-100 last:border-b-0">
                <div class="space-y-0.5">
                  <div class="font-semibold text-slate-900">${esc(c.label)}</div>
                  <p class="text-slate-600">${esc(c.feedback)}</p>
                </div>
                <div class="shrink-0 text-right font-mono tabular-nums font-bold ${c.passed ? 'text-emerald-700' : 'text-rose-700'}">
                  ${c.passed ? '✓ Awarded' : '✗ Missing'} · ${c.marksEarned}/${c.maxMarks}
                </div>
              </div>
            `
            )
            .join('')}
        </div>
      </div>
    `
    : '';

  return `
    <!-- Scenario & Freeform Switcher Row -->
    <div class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        ${FLOWCHART_SCENARIOS.map((s, idx) => {
          const isCurrent = uiState.flowchartMode === 'scenario' && uiState.scenarioId === s.id;
          const saved = uiState.progress.completedFlowcharts[s.id];
          const done = saved && saved.bestMarks >= Math.ceil(s.maxMarks * 0.8);
          return `
            <button type="button" data-ta1-scenario="${s.id}"
              class="px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isCurrent
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }">
              <span class="font-mono tabular-nums opacity-80">0${idx + 1}</span>
              <span>${esc(s.title.split(' ').slice(0, 3).join(' '))}</span>
              ${done ? '<span class="text-emerald-400 font-bold" aria-label="Mastered">✓</span>' : ''}
            </button>
          `;
        }).join('')}
        <button type="button" data-ta1-flowchart-mode="freeform"
          class="px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            uiState.flowchartMode === 'freeform'
              ? 'bg-indigo-600 text-white'
              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
          }">
          <i class="fa-solid fa-pen-ruler text-[11px]"></i>
          <span>Freeform Sandbox</span>
        </button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" data-ta1-action="reset-scenario" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap">
          Reset Slots
        </button>
        <button type="button" data-ta1-action="check-flowchart" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          <i class="fa-solid fa-clipboard-check text-xs"></i>
          <span>Check OCR Mark Scheme</span>
        </button>
      </div>
    </div>

    <!-- Two-Zone Interactive Sandbox -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Left Stage: Interactive SVG Flowchart Canvas (7 cols) -->
      <div class="lg:col-span-7 space-y-4">
        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div class="text-xs font-semibold text-indigo-600">${esc(scenario.context)} · ${scenario.maxMarks} Marks</div>
              <h2 class="text-base font-bold text-slate-900">${esc(scenario.title)}</h2>
            </div>
            <span class="text-xs text-slate-500">Click any slot or branch badge to edit</span>
          </div>
          <div class="px-5 py-3 bg-slate-50/80 border-b border-slate-100 text-xs text-slate-700 leading-relaxed">
            ${esc(scenario.brief)}
          </div>

          <!-- Architectural Dot-Grid SVG Canvas -->
          <div class="p-3 sm:p-4 bg-slate-50" style="background-image: radial-gradient(#cbd5e1 1px, transparent 1px); background-size: 18px 18px;">
            <svg viewBox="0 0 ${scenario.viewBoxWidth} ${scenario.viewBoxHeight}" class="w-full h-auto max-h-[540px] select-none" data-testid="ta1-flowchart-svg" role="img" aria-label="${esc(scenario.title)} interactive flowchart">
              <defs>
                <marker id="ta1-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
                </marker>
                <marker id="ta1-arrow-trace" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#059669" />
                </marker>
              </defs>
              ${edgesSvg}
              ${nodesSvg}
            </svg>
          </div>

          <!-- Accessible Slot Strip for Fast Keyboard / Mobile Selection -->
          <div class="px-4 py-3 bg-white border-t border-slate-100 flex flex-wrap items-center gap-1.5">
            <span class="text-[11px] font-semibold text-slate-500 mr-1">Slots:</span>
            ${scenario.nodes
              .map((n, idx) => {
                const active = n.id === selectedNode.id;
                const filled = Boolean(submission.nodeSymbols[n.id] && submission.nodeLabels[n.id]);
                return `
                  <button type="button" data-ta1-select-node="${n.id}"
                    class="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors font-mono tabular-nums whitespace-nowrap ${
                      active
                        ? 'bg-indigo-600 text-white'
                        : filled
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }">
                    Slot ${idx + 1}${n.locked ? ' (Start)' : ''}
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>

        ${evaluationHtml}
      </div>

      <!-- Right Deck: Slot Inspector + Live Execution Tracer (5 cols) -->
      <div class="lg:col-span-5 space-y-5">
        <!-- Slot Editor Card -->
        <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div class="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div class="text-xs font-semibold text-indigo-600 font-mono tabular-nums">Editing Slot ${selectedIndex} of ${scenario.nodes.length}</div>
              <h3 class="text-sm font-bold text-slate-900">
                ${selectedNode.locked ? 'Locked Start Terminator' : 'Assign ISO Symbol &amp; Step Label'}
              </h3>
            </div>
            <span class="text-xs text-slate-500">${selectedSym ? ISO_SYMBOLS[selectedSym].name : 'Unassigned'}</span>
          </div>

          ${
            selectedNode.locked
              ? `
                <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                  <p class="font-semibold text-slate-900">Start Terminator (Fixed)</p>
                  <p>${esc(selectedNode.hint)} Select Slot 2 through Slot ${scenario.nodes.length} to complete the flowchart.</p>
                </div>
              `
              : `
                <div class="space-y-2">
                  <label class="block text-xs font-semibold text-slate-700">1. Choose ISO 5807 Symbol</label>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    ${(Object.keys(ISO_SYMBOLS) as FlowchartSymbolType[])
                      .map((symKey) => {
                        const def = ISO_SYMBOLS[symKey];
                        const isPicked = selectedSym === symKey;
                        return `
                          <button type="button" data-ta1-assign-symbol="${symKey}"
                            class="px-3 py-2 rounded-xl border text-left transition-colors flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                              isPicked
                                ? 'bg-slate-900 border-slate-900 text-white'
                                : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-800'
                            }">
                            ${renderSymbolIconMini(symKey, isPicked)}
                            <div class="min-w-0">
                              <div class="text-xs font-bold leading-tight truncate">${esc(def.name)}</div>
                              <div class="text-[11px] ${isPicked ? 'text-slate-300' : 'text-slate-500'} truncate">${esc(def.shapeLabel.split(' ')[0])}</div>
                            </div>
                          </button>
                        `;
                      })
                      .join('')}
                  </div>
                </div>

                <div class="space-y-2">
                  <label for="ta1-slot-label-select" class="block text-xs font-semibold text-slate-700">2. Choose Step Label for Slot ${selectedIndex}</label>
                  <select id="ta1-slot-label-select" data-ta1-assign-label="${selectedNode.id}"
                    class="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">-- Select a scenario step --</option>
                    ${scenario.labelBank
                      .map(
                        (lbl) =>
                          `<option value="${esc(lbl)}" ${selectedLabel === lbl ? 'selected' : ''}>${esc(lbl)}</option>`
                      )
                      .join('')}
                  </select>
                </div>

                <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                  <span class="font-semibold text-slate-900">Hint:</span> ${esc(selectedNode.hint)}
                </div>
              `
          }

          <!-- Decision Branch Labels Control -->
          <div class="pt-3 border-t border-slate-100 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-700">3. Decision Outgoing Branch Labels</span>
              <span class="text-[11px] text-slate-500">Required for 1 OCR mark</span>
            </div>
            <div class="grid grid-cols-2 gap-2.5">
              ${branchEdges
                .map((edge, idx) => {
                  const val = submission.edgeLabels[edge.id] || '';
                  const side = idx === 0 ? 'Left Branch' : 'Right Branch';
                  return `
                    <div>
                      <label for="ta1-branch-${edge.id}" class="block text-[11px] font-semibold text-slate-600 mb-1">${side}</label>
                      <select id="ta1-branch-${edge.id}" data-ta1-branch-select="${edge.id}"
                        class="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">Unlabelled</option>
                        <option value="Yes" ${val === 'Yes' ? 'selected' : ''}>Yes</option>
                        <option value="No" ${val === 'No' ? 'selected' : ''}>No</option>
                      </select>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </div>
        </div>

        <!-- Live Execution Tracer Card -->
        <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div class="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div class="text-xs font-semibold text-emerald-700">Live Simulation</div>
              <h3 class="text-sm font-bold text-slate-900">Step-by-Step Execution Tracer</h3>
            </div>
            <span class="text-xs font-mono tabular-nums text-slate-500">
              ${
                uiState.traceResult && uiState.traceStepIndex >= 0
                  ? `Step ${uiState.traceStepIndex + 1}/${uiState.traceResult.steps.length}`
                  : 'Ready'
              }
            </span>
          </div>

          <div class="space-y-2">
            <span class="block text-xs font-semibold text-slate-700">Test Case Input</span>
            <div class="grid grid-cols-1 gap-1.5">
              ${scenario.testCases
                .map((tc) => {
                  const picked = tc.id === activeTestCase.id;
                  return `
                    <button type="button" data-ta1-testcase="${tc.id}"
                      class="px-3 py-2 rounded-xl border text-left text-xs transition-colors ${
                        picked
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }">
                      <div>${esc(tc.label)}</div>
                      <div class="text-[11px] font-normal text-slate-500 mt-0.5">${esc(tc.description)}</div>
                    </button>
                  `;
                })
                .join('')}
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button type="button" data-ta1-action="trace-play" class="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap">
              <i class="fa-solid ${uiState.traceTimer !== null ? 'fa-pause' : 'fa-play'} text-[11px]"></i>
              <span>${uiState.traceTimer !== null ? 'Pause Trace' : 'Play Trace'}</span>
            </button>
            <button type="button" data-ta1-action="trace-step" class="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap">
              Step Forward
            </button>
            <button type="button" data-ta1-action="trace-reset" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap">
              Reset
            </button>
          </div>

          <div class="space-y-1.5" data-testid="ta1-trace-log">
            <div class="text-[11px] font-semibold text-slate-500">Execution Trace Log</div>
            ${traceLogHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderFreeformFlowchartTab(): string {
  const nodes = uiState.freeformNodes;
  const edges = uiState.freeformEdges;
  const selected = nodes.find((n) => n.id === uiState.freeformSelectedId) || nodes[0] || null;
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const edgesSvg = edges
    .map((e) => {
      const from = nodeMap.get(e.from);
      const to = nodeMap.get(e.to);
      if (!from || !to) return '';
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      return `
        <line x1="${from.x}" y1="${from.y + 24}" x2="${to.x}" y2="${to.y - 26}" stroke="#475569" stroke-width="2" marker-end="url(#ta1-ff-arrow)" />
        ${
          e.branchLabel
            ? `<rect x="${midX - 20}" y="${midY - 10}" width="40" height="20" rx="5" fill="#eef2ff" stroke="#6366f1" stroke-width="1.2" />
               <text x="${midX}" y="${midY + 4}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#312e81" font-family="Plus Jakarta Sans, sans-serif">${esc(e.branchLabel)}</text>`
            : ''
        }
      `;
    })
    .join('');

  const nodesSvg = nodes
    .map((n) => {
      const isSel = selected?.id === n.id;
      return `
        <g class="cursor-pointer" data-ta1-ff-select="${n.id}" role="button" tabindex="0" aria-label="Freeform node ${esc(n.label)}">
          ${renderSymbolSvgShape(n.symbol, n.x, n.y, {
            fill: isSel ? '#eef2ff' : '#ffffff',
            stroke: isSel ? '#4f46e5' : '#334155',
            strokeWidth: isSel ? 2.6 : 2,
            w: 168,
            h: 46,
          })}
          <text x="${n.x}" y="${n.y + 4}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#0f172a" font-family="Plus Jakarta Sans, sans-serif">${esc(n.label)}</text>
        </g>
      `;
    })
    .join('');

  const checkHtml = uiState.freeformCheckResult
    ? `
      <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 class="text-sm font-bold text-slate-900">OCR Convention Check</h3>
          <span class="font-mono tabular-nums text-xs font-bold text-indigo-700">${uiState.freeformCheckResult.score} / ${uiState.freeformCheckResult.maxScore} Checks Passed</span>
        </div>
        <div class="space-y-2">
          ${uiState.freeformCheckResult.checks
            .map(
              (c) => `
              <div class="flex items-start justify-between gap-2 text-xs">
                <div>
                  <div class="font-semibold text-slate-900">${esc(c.label)}</div>
                  <div class="text-slate-500">${esc(c.feedback)}</div>
                </div>
                <span class="font-mono font-bold shrink-0 ${c.passed ? 'text-emerald-700' : 'text-rose-700'}">${c.passed ? '✓ Pass' : '✗ Fix'}</span>
              </div>
            `
            )
            .join('')}
        </div>
      </div>
    `
    : '';

  return `
    <div class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" data-ta1-flowchart-mode="scenario" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap">
          <i class="fa-solid fa-arrow-left text-[11px]"></i>
          <span>Back to Exam Scenarios</span>
        </button>
        <span class="text-xs font-semibold text-indigo-700">Freeform ISO Flowchart Sandbox</span>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" data-ta1-ff-action="clear" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap">
          Clear Canvas
        </button>
        <button type="button" data-ta1-ff-action="check" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap">
          Validate OCR Conventions
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-7 space-y-4">
        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <h2 class="text-sm font-bold text-slate-900">Your Custom Flowchart Canvas</h2>
            <span class="text-xs text-slate-500 tabular-nums">${nodes.length} Symbols · ${edges.length} Arrows</span>
          </div>
          <div class="p-3 bg-slate-50" style="background-image: radial-gradient(#cbd5e1 1px, transparent 1px); background-size: 18px 18px;">
            <svg viewBox="0 0 680 510" class="w-full h-auto max-h-[500px] select-none" role="img" aria-label="Freeform flowchart canvas">
              <defs>
                <marker id="ta1-ff-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#475569" />
                </marker>
              </defs>
              ${edgesSvg}
              ${nodesSvg}
            </svg>
          </div>
        </div>
        ${checkHtml}
      </div>

      <div class="lg:col-span-5 space-y-4">
        <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h3 class="text-sm font-bold text-slate-900">Add ISO Symbol</h3>
          <div class="grid grid-cols-2 gap-2">
            ${(Object.keys(ISO_SYMBOLS) as FlowchartSymbolType[])
              .map(
                (sym) => `
                <button type="button" data-ta1-ff-add="${sym}" class="px-3 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-xs font-semibold text-slate-800 flex items-center gap-2 transition-colors">
                  ${renderSymbolIconMini(sym, false)}
                  <span class="truncate">+ ${esc(ISO_SYMBOLS[sym].name)}</span>
                </button>
              `
              )
              .join('')}
          </div>

          ${
            selected
              ? `
                <div class="pt-4 border-t border-slate-100 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-indigo-700">Selected Symbol</span>
                    <button type="button" data-ta1-ff-delete="${selected.id}" class="text-xs font-semibold text-rose-600 hover:text-rose-700">
                      Remove Symbol
                    </button>
                  </div>
                  <div>
                    <label for="ta1-ff-label-input" class="block text-xs font-semibold text-slate-700 mb-1">Symbol Text</label>
                    <input id="ta1-ff-label-input" type="text" value="${esc(selected.label)}" data-ta1-ff-label="${selected.id}"
                      class="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  </div>
                  <div class="grid grid-cols-4 gap-1.5">
                    <button type="button" data-ta1-ff-move="${selected.id}:-40:0" class="py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700">← Left</button>
                    <button type="button" data-ta1-ff-move="${selected.id}:40:0" class="py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700">Right →</button>
                    <button type="button" data-ta1-ff-move="${selected.id}:0:-36" class="py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700">↑ Up</button>
                    <button type="button" data-ta1-ff-move="${selected.id}:0:36" class="py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold text-slate-700">↓ Down</button>
                  </div>
                </div>
              `
              : ''
          }

          <div class="pt-4 border-t border-slate-100 space-y-2.5">
            <h4 class="text-xs font-bold text-slate-900">Connect Two Symbols</h4>
            <div class="grid grid-cols-3 gap-2">
              <select id="ta1-ff-from" aria-label="Connector start symbol" class="px-2 py-2 rounded-lg border border-slate-300 text-xs bg-white">
                ${nodes.map((n) => `<option value="${n.id}">${esc(n.label)}</option>`).join('')}
              </select>
              <select id="ta1-ff-to" aria-label="Connector end symbol" class="px-2 py-2 rounded-lg border border-slate-300 text-xs bg-white">
                ${nodes.map((n, idx) => `<option value="${n.id}" ${idx === Math.min(1, nodes.length - 1) ? 'selected' : ''}>${esc(n.label)}</option>`).join('')}
              </select>
              <select id="ta1-ff-branch" aria-label="Branch label" class="px-2 py-2 rounded-lg border border-slate-300 text-xs bg-white">
                <option value="">Plain</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <button type="button" data-ta1-ff-action="connect" class="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors">
              Add Directional Connector
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderErrorMiniDiagramSvg(errorDiagramId: string): string {
  const arrowDef = `
    <defs>
      <marker id="err-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#334155" />
      </marker>
    </defs>
  `;

  if (errorDiagramId === 'unlabelled-decision') {
    return `
      <svg viewBox="0 0 540 280" class="w-full max-w-lg mx-auto h-auto" role="img" aria-label="Flowchart with unlabelled decision branches">
        ${arrowDef}
        <line x1="270" y1="54" x2="270" y2="86" stroke="#334155" stroke-width="2" marker-end="url(#err-arrow)" />
        <path d="M 188 130 L 115 130 L 115 186" fill="none" stroke="#334155" stroke-width="2" marker-end="url(#err-arrow)" />
        <path d="M 352 130 L 425 130 L 425 186" fill="none" stroke="#334155" stroke-width="2" marker-end="url(#err-arrow)" />
        ${renderSymbolSvgShape('terminator', 270, 32, { fill: '#ffffff', stroke: '#334155', w: 140, h: 42 })}
        <text x="270" y="36" text-anchor="middle" font-size="12" font-weight="700" fill="#0f172a">Start</text>
        ${renderSymbolSvgShape('decision', 270, 130, { fill: '#fffbeb', stroke: '#d97706', w: 150, h: 52 })}
        <text x="270" y="134" text-anchor="middle" font-size="11.5" font-weight="700" fill="#0f172a">Age &gt;= 16?</text>
        ${renderSymbolSvgShape('io', 115, 214, { fill: '#ffffff', stroke: '#334155', w: 156, h: 44 })}
        <text x="115" y="218" text-anchor="middle" font-size="11" font-weight="700" fill="#0f172a">Display "Allowed"</text>
        ${renderSymbolSvgShape('io', 425, 214, { fill: '#ffffff', stroke: '#334155', w: 156, h: 44 })}
        <text x="425" y="218" text-anchor="middle" font-size="11" font-weight="700" fill="#0f172a">Display "Denied"</text>
      </svg>
    `;
  }

  if (errorDiagramId === 'wrong-io-shape') {
    return `
      <svg viewBox="0 0 540 270" class="w-full max-w-lg mx-auto h-auto" role="img" aria-label="Flowchart using rectangle for user input">
        ${arrowDef}
        <line x1="270" y1="54" x2="270" y2="96" stroke="#334155" stroke-width="2" marker-end="url(#err-arrow)" />
        <line x1="270" y1="150" x2="270" y2="196" stroke="#334155" stroke-width="2" marker-end="url(#err-arrow)" />
        ${renderSymbolSvgShape('terminator', 270, 32, { fill: '#ffffff', stroke: '#334155', w: 140, h: 42 })}
        <text x="270" y="36" text-anchor="middle" font-size="12" font-weight="700" fill="#0f172a">Start</text>
        ${renderSymbolSvgShape('process', 270, 124, { fill: '#fef2f2', stroke: '#dc2626', w: 180, h: 48 })}
        <text x="270" y="128" text-anchor="middle" font-size="12" font-weight="700" fill="#0f172a">Input PIN</text>
        ${renderSymbolSvgShape('terminator', 270, 220, { fill: '#ffffff', stroke: '#334155', w: 140, h: 42 })}
        <text x="270" y="224" text-anchor="middle" font-size="12" font-weight="700" fill="#0f172a">End</text>
      </svg>
    `;
  }

  if (errorDiagramId === 'missing-end') {
    return `
      <svg viewBox="0 0 540 270" class="w-full max-w-lg mx-auto h-auto" role="img" aria-label="Flowchart missing End terminator">
        ${arrowDef}
        <line x1="270" y1="54" x2="270" y2="86" stroke="#334155" stroke-width="2" marker-end="url(#err-arrow)" />
        <path d="M 190 130 L 120 130 L 120 186" fill="none" stroke="#334155" stroke-width="2" marker-end="url(#err-arrow)" />
        <path d="M 350 130 L 420 130 L 420 186" fill="none" stroke="#334155" stroke-width="2" marker-end="url(#err-arrow)" />
        <text x="150" y="120" font-size="11" font-weight="700" fill="#059669">Yes</text>
        <text x="380" y="120" font-size="11" font-weight="700" fill="#dc2626">No</text>
        ${renderSymbolSvgShape('terminator', 270, 32, { fill: '#ffffff', stroke: '#334155', w: 140, h: 42 })}
        <text x="270" y="36" text-anchor="middle" font-size="12" font-weight="700" fill="#0f172a">Start</text>
        ${renderSymbolSvgShape('decision', 270, 130, { fill: '#ffffff', stroke: '#334155', w: 146, h: 52 })}
        <text x="270" y="134" text-anchor="middle" font-size="11.5" font-weight="700" fill="#0f172a">Paid?</text>
        ${renderSymbolSvgShape('process', 120, 214, { fill: '#ffffff', stroke: '#334155', w: 150, h: 44 })}
        <text x="120" y="218" text-anchor="middle" font-size="11" font-weight="700" fill="#0f172a">Issue E-Ticket</text>
        ${renderSymbolSvgShape('io', 420, 214, { fill: '#ffffff', stroke: '#334155', w: 150, h: 44 })}
        <text x="420" y="218" text-anchor="middle" font-size="11" font-weight="700" fill="#0f172a">Show Retry Msg</text>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 540 270" class="w-full max-w-lg mx-auto h-auto" role="img" aria-label="Flowchart missing directional arrowheads">
      <line x1="270" y1="54" x2="270" y2="100" stroke="#334155" stroke-width="2" />
      <line x1="270" y1="150" x2="270" y2="198" stroke="#334155" stroke-width="2" />
      ${renderSymbolSvgShape('terminator', 270, 32, { fill: '#ffffff', stroke: '#334155', w: 140, h: 42 })}
      <text x="270" y="36" text-anchor="middle" font-size="12" font-weight="700" fill="#0f172a">Start</text>
      ${renderSymbolSvgShape('process', 270, 124, { fill: '#ffffff', stroke: '#334155', w: 180, h: 48 })}
      <text x="270" y="128" text-anchor="middle" font-size="12" font-weight="700" fill="#0f172a">Calculate Total</text>
      ${renderSymbolSvgShape('terminator', 270, 220, { fill: '#ffffff', stroke: '#334155', w: 140, h: 42 })}
      <text x="270" y="224" text-anchor="middle" font-size="12" font-weight="700" fill="#0f172a">End</text>
    </svg>
  `;
}

function renderSymbolDrillTab(): string {
  const filtered = SYMBOL_DRILL_BANK.filter((item) => {
    if (uiState.drillFilter === 'symbols') return item.kind !== 'spot_error';
    if (uiState.drillFilter === 'errors') return item.kind === 'spot_error';
    return true;
  });

  const safeIdx = Math.max(0, Math.min(uiState.drillIndex, filtered.length - 1));
  const item = filtered[safeIdx];
  const chosen = uiState.drillAnswers[item.id] || '';
  const isAnswered = Boolean(chosen);
  const isCorrect = chosen === item.correctOptionId;

  const visualBlock = item.displaySymbol
    ? `
      <div class="py-6 px-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2" style="background-image: radial-gradient(#cbd5e1 1px, transparent 1px); background-size: 16px 16px;">
        <svg viewBox="0 0 260 110" class="w-60 h-28" role="img" aria-label="ISO flowchart symbol to identify">
          ${renderSymbolSvgShape(item.displaySymbol, 130, 55, {
            fill: '#ffffff',
            stroke: '#1e293b',
            strokeWidth: 2.6,
            w: 196,
            h: 58,
          })}
        </svg>
      </div>
    `
    : item.errorDiagramId
      ? `
        <div class="py-4 px-3 bg-slate-50 rounded-xl border border-slate-200" style="background-image: radial-gradient(#cbd5e1 1px, transparent 1px); background-size: 16px 16px;">
          ${renderErrorMiniDiagramSvg(item.errorDiagramId)}
        </div>
      `
      : '';

  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Left: Active Drill Card (8 cols) -->
      <div class="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div class="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            ${(
              [
                { id: 'all', label: `All Drills (${SYMBOL_DRILL_BANK.length})` },
                { id: 'symbols', label: 'ISO Symbols (4)' },
                { id: 'errors', label: 'Spot the Error (4)' },
              ] as const
            )
              .map(
                (f) => `
                <button type="button" data-ta1-drill-filter="${f.id}"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    uiState.drillFilter === f.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }">
                  ${f.label}
                </button>
              `
              )
              .join('')}
          </div>
          <span class="text-xs font-mono tabular-nums font-semibold text-slate-500">
            Challenge ${safeIdx + 1} of ${filtered.length}
          </span>
        </div>

        <div class="space-y-3">
          <div class="text-xs font-semibold ${item.kind === 'spot_error' ? 'text-amber-700' : 'text-indigo-600'}">
            ${item.kind === 'spot_error' ? 'Spot the OCR Convention Error' : item.context || 'ISO 5807 Symbol Recognition'}
          </div>
          <h2 class="text-base sm:text-lg font-bold text-slate-900">${esc(item.prompt)}</h2>
          ${visualBlock}
        </div>

        <div class="space-y-2.5">
          ${item.options
            .map((opt) => {
              const picked = chosen === opt.id;
              const right = opt.id === item.correctOptionId;
              let cls = 'bg-white border-slate-200 hover:border-indigo-300 text-slate-800';
              let statusText = '';
              if (isAnswered) {
                if (right) {
                  cls = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
                  statusText = '✓ Correct';
                } else if (picked) {
                  cls = 'bg-rose-50 border-rose-400 text-rose-950 font-semibold';
                  statusText = '✗ Incorrect';
                } else {
                  cls = 'bg-slate-50 border-slate-200 text-slate-500';
                }
              }
              return `
                <button type="button" data-ta1-drill-answer="${item.id}:${opt.id}"
                  class="w-full px-4 py-3 rounded-xl border text-left text-xs sm:text-sm transition-colors flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${cls}">
                  <div class="flex items-center gap-3 min-w-0">
                    ${opt.symbol ? renderSymbolIconMini(opt.symbol, false) : `<span class="font-mono uppercase font-bold text-xs text-slate-400">${opt.id}.</span>`}
                    <span>${esc(opt.label)}</span>
                  </div>
                  ${statusText ? `<span class="text-xs font-bold shrink-0">${statusText}</span>` : ''}
                </button>
              `;
            })
            .join('')}
        </div>

        ${
          isAnswered
            ? `
              <div data-testid="ta1-drill-feedback" class="p-4 rounded-xl border ${isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'} space-y-1.5 text-xs">
                <div class="font-bold ${isCorrect ? 'text-emerald-900' : 'text-amber-900'}">
                  ${isCorrect ? 'Correct — Mastered!' : 'Review OCR Mark Scheme Rule'}
                </div>
                <p class="text-slate-800 leading-relaxed">${esc(item.explanation)}</p>
                <p class="text-slate-600"><strong class="text-slate-900">Examiner Tip:</strong> ${esc(item.markTip)}</p>
              </div>
            `
            : ''
        }

        <div class="flex items-center justify-between pt-2 border-t border-slate-100">
          <button type="button" data-ta1-drill-nav="-1" ${safeIdx === 0 ? 'disabled' : ''}
            class="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 transition-colors">
            ← Previous
          </button>
          <button type="button" data-ta1-drill-nav="1" ${safeIdx === filtered.length - 1 ? 'disabled' : ''}
            class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-40 transition-colors">
            Next Challenge →
          </button>
        </div>
      </div>

      <!-- Right: ISO 5807 Quick Symbol Reference Deck (4 cols) -->
      <div class="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div>
          <div class="text-xs font-semibold text-indigo-600">Exam Reference</div>
          <h3 class="text-sm font-bold text-slate-900">ISO 5807 Flowchart Symbol Key</h3>
        </div>
        <div class="space-y-3">
          ${(Object.values(ISO_SYMBOLS))
            .map(
              (sym) => `
              <div class="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0">
                ${renderSymbolIconMini(sym.type, false)}
                <div class="space-y-0.5 text-xs">
                  <div class="font-bold text-slate-900">${esc(sym.name)} <span class="font-normal text-slate-500">· ${esc(sym.shapeLabel)}</span></div>
                  <p class="text-slate-600 leading-snug">${esc(sym.purpose)}</p>
                </div>
              </div>
            `
            )
            .join('')}
        </div>
      </div>
    </div>
  `;
}

function renderMindMapBlueprint(): string {
  const challenge = MIND_MAP_CHALLENGE;
  const slotMap = new Map(challenge.slots.map((s) => [s.id, s]));
  const selectedSlot = slotMap.get(uiState.mindMapSelectedSlotId) || challenge.slots[1];
  const result = uiState.mindMapResult;

  const linesSvg = challenge.slots
    .filter((s) => s.parentId)
    .map((s) => {
      const parent = slotMap.get(s.parentId!);
      if (!parent) return '';
      return `<line x1="${parent.x}" y1="${parent.y}" x2="${s.x}" y2="${s.y}" stroke="${s.level === 'main' ? '#4f46e5' : '#94a3b8'}" stroke-width="${s.level === 'main' ? 3 : 2}" />`;
    })
    .join('');

  const nodesSvg = challenge.slots
    .map((s) => {
      const assigned = s.locked ? s.expectedLabel : uiState.mindMapAssignments[s.id] || '';
      const isSelected = selectedSlot.id === s.id;
      const isOk = result ? result.slotResults[s.id] : null;
      const w = s.level === 'central' ? 210 : s.level === 'main' ? 186 : 168;
      const h = s.level === 'central' ? 54 : 42;
      const rx = s.level === 'central' ? 27 : 12;

      let fill = s.level === 'central' ? '#1e293b' : '#ffffff';
      let stroke = s.level === 'central' ? '#1e293b' : isSelected ? '#4f46e5' : '#64748b';
      let textFill = s.level === 'central' ? '#ffffff' : assigned ? '#0f172a' : '#64748b';

      if (isOk !== null && !s.locked) {
        fill = isOk ? '#ecfdf5' : '#fef2f2';
        stroke = isOk ? '#059669' : '#dc2626';
      }

      const tag = s.level === 'main' ? 'MAIN BRANCH' : s.level === 'sub' ? 'SUB-NODE' : 'CENTRAL NODE';

      return `
        <g class="${s.locked ? '' : 'cursor-pointer'}" data-ta1-mm-slot="${s.id}" role="button" tabindex="0" aria-label="${tag}: ${esc(assigned || 'Empty slot')}">
          <rect x="${s.x - w / 2}" y="${s.y - h / 2}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${isSelected ? 2.8 : 2}" ${!assigned && !s.locked ? 'stroke-dasharray="5 3"' : ''} />
          <text x="${s.x}" y="${s.y - (s.level === 'central' ? 7 : 5)}" text-anchor="middle" font-size="8.5" font-weight="700" fill="${s.level === 'central' ? '#a5b4fc' : '#64748b'}" font-family="JetBrains Mono, monospace">${tag}</text>
          <text x="${s.x}" y="${s.y + 10}" text-anchor="middle" font-size="11" font-weight="700" fill="${textFill}" font-family="Plus Jakarta Sans, sans-serif">${esc(assigned || 'Click to assign')}</text>
        </g>
      `;
    })
    .join('');

  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-8 bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div class="text-xs font-semibold text-indigo-600">TA1 Mind Map Hierarchy · ${challenge.maxMarks} Marks</div>
            <h2 class="text-base font-bold text-slate-900">${esc(challenge.title)}</h2>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" data-ta1-mm-action="reset" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg">Reset</button>
            <button type="button" data-ta1-mm-action="check" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg">Check Mind Map</button>
          </div>
        </div>
        <div class="px-5 py-3 bg-slate-50/80 border-b border-slate-100 text-xs text-slate-700">${esc(challenge.brief)}</div>
        <div class="p-3 bg-slate-50" style="background-image: radial-gradient(#cbd5e1 1px, transparent 1px); background-size: 18px 18px;">
          <svg viewBox="0 0 720 430" class="w-full h-auto max-h-[430px] select-none" role="img" aria-label="Interactive Mind Map diagram">
            ${linesSvg}
            ${nodesSvg}
          </svg>
        </div>
        ${
          result
            ? `
              <div data-testid="ta1-mindmap-result" class="px-5 py-4 border-t border-slate-100 ${result.marksEarned === result.maxMarks ? 'bg-emerald-50' : 'bg-amber-50'} text-xs space-y-1">
                <div class="font-bold text-slate-900 font-mono tabular-nums">Mind Map Score: ${result.marksEarned} / ${result.maxMarks} Marks</div>
                <p class="text-slate-700">${esc(result.feedback)}</p>
              </div>
            `
            : ''
        }
      </div>

      <div class="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div>
          <div class="text-xs font-semibold text-indigo-600">Assign Node Content</div>
          <h3 class="text-sm font-bold text-slate-900">All 6 Mind Map Slots</h3>
        </div>
        <div class="space-y-3">
          ${challenge.slots
            .filter((s) => !s.locked)
            .map((s) => {
              const val = uiState.mindMapAssignments[s.id] || '';
              const slotLabel = s.level === 'main' ? 'Main Branch' : 'Sub-Node';
              return `
                <div>
                  <label for="mm-select-${s.id}" class="block text-xs font-semibold ${s.id === selectedSlot.id ? 'text-indigo-700' : 'text-slate-700'} mb-1">
                    ${slotLabel} (${s.id.replace('mm-', '').toUpperCase()})
                  </label>
                  <select id="mm-select-${s.id}" data-ta1-mm-assign="${s.id}"
                    class="w-full px-3 py-2 rounded-lg border ${s.id === selectedSlot.id ? 'border-indigo-400 ring-1 ring-indigo-300' : 'border-slate-300'} bg-white text-xs font-medium text-slate-900">
                    <option value="">-- Choose node label --</option>
                    ${challenge.optionBank
                      .map((opt) => `<option value="${esc(opt)}" ${val === opt ? 'selected' : ''}>${esc(opt)}</option>`)
                      .join('')}
                  </select>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    </div>
  `;
}

function renderWireframeBlueprint(): string {
  const challenge = WIREFRAME_CHALLENGE;
  const selected = new Set(uiState.wireframeSelectedIds);
  const res = uiState.wireframeResult;

  const hasLogo = selected.has('wf-logo');
  const hasNav = selected.has('wf-nav');
  const hasHero = selected.has('wf-hero');
  const hasForm = selected.has('wf-form');
  const hasCta = selected.has('wf-cta');
  const hasNotes = selected.has('wf-notes');
  const hasDistPhoto = selected.has('wf-dist-photo');
  const hasDistPalette = selected.has('wf-dist-palette');
  const hasDistCopy = selected.has('wf-dist-copy');

  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-6 bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div class="text-xs font-semibold text-indigo-600">Low-Fidelity Wireframe Preview</div>
            <h2 class="text-base font-bold text-slate-900">${esc(challenge.title)}</h2>
          </div>
          <button type="button" data-ta1-wf-action="check" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg">
            Check Wireframe (6 Marks)
          </button>
        </div>

        <div class="p-4 bg-slate-50 flex justify-center" style="background-image: radial-gradient(#cbd5e1 1px, transparent 1px); background-size: 16px 16px;">
          <svg viewBox="0 0 460 440" class="w-full max-w-md h-auto" role="img" aria-label="Interactive mobile wireframe preview">
            <!-- Phone Wireframe Outline -->
            <rect x="44" y="16" width="232" height="408" rx="22" fill="#ffffff" stroke="#334155" stroke-width="2.5" />
            <line x1="130" y1="30" x2="190" y2="30" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round" />

            <!-- Header & Logo -->
            ${
              hasLogo
                ? `<rect x="58" y="44" width="204" height="36" rx="4" fill="#f8fafc" stroke="#334155" stroke-width="1.5" />
                   <rect x="66" y="51" width="48" height="22" rx="3" fill="#e2e8f0" stroke="#475569" stroke-width="1.2" />
                   <text x="90" y="65" text-anchor="middle" font-size="9" font-weight="700" fill="#334155">LOGO</text>
                   <text x="192" y="65" text-anchor="middle" font-size="10" font-weight="600" fill="#475569">Header Bar</text>`
                : `<rect x="58" y="44" width="204" height="36" rx="4" fill="none" stroke="#cbd5e1" stroke-dasharray="4 3" />`
            }

            <!-- Navigation Bar -->
            ${
              hasNav
                ? `<rect x="58" y="88" width="204" height="28" rx="4" fill="#f1f5f9" stroke="#334155" stroke-width="1.5" />
                   <text x="160" y="106" text-anchor="middle" font-size="10" font-weight="700" fill="#334155">Home  ·  Trips  ·  Bookings</text>`
                : `<rect x="58" y="88" width="204" height="28" rx="4" fill="none" stroke="#cbd5e1" stroke-dasharray="4 3" />`
            }

            <!-- Hero Placeholder or Photo Distractor -->
            ${
              hasDistPhoto
                ? `<rect x="58" y="126" width="204" height="92" rx="4" fill="#fef3c7" stroke="#d97706" stroke-width="2" />
                   <circle cx="96" cy="156" r="14" fill="#f59e0b" />
                   <path d="M 58 198 Q 140 165 262 195 L 262 218 L 58 218 Z" fill="#38bdf8" />
                   <text x="160" y="210" text-anchor="middle" font-size="9.5" font-weight="700" fill="#0f172a">Colour Photo (Too Detailed?)</text>`
                : hasHero
                  ? `<rect x="58" y="126" width="204" height="92" rx="4" fill="#f8fafc" stroke="#334155" stroke-width="1.5" />
                     <line x1="58" y1="126" x2="262" y2="218" stroke="#94a3b8" stroke-width="1.4" />
                     <line x1="262" y1="126" x2="58" y2="218" stroke="#94a3b8" stroke-width="1.4" />
                     <rect x="114" y="160" width="92" height="22" rx="4" fill="#ffffff" stroke="#cbd5e1" />
                     <text x="160" y="175" text-anchor="middle" font-size="9.5" font-weight="700" fill="#334155">Image Box [X]</text>`
                  : `<rect x="58" y="126" width="204" height="92" rx="4" fill="none" stroke="#cbd5e1" stroke-dasharray="4 3" />`
            }

            <!-- Form Inputs -->
            ${
              hasForm
                ? `<rect x="58" y="230" width="204" height="28" rx="4" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
                   <text x="70" y="248" font-size="9.5" fill="#64748b">[ Input: Destination ]</text>
                   <rect x="58" y="266" width="204" height="28" rx="4" fill="#ffffff" stroke="#334155" stroke-width="1.5" />
                   <text x="70" y="284" font-size="9.5" fill="#64748b">[ Date Picker: Check-in ]</text>`
                : ''
            }

            <!-- CTA Button -->
            ${
              hasCta
                ? `<rect x="58" y="304" width="204" height="34" rx="6" fill="#334155" />
                   <text x="160" y="325" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">Search Holidays</text>`
                : ''
            }

            <!-- Distractor Final Copy -->
            ${
              hasDistCopy
                ? `<rect x="58" y="348" width="204" height="58" rx="4" fill="#fff1f2" stroke="#e11d48" stroke-width="1.5" />
                   <text x="66" y="365" font-size="8.5" font-weight="600" fill="#881337">Discover sun-soaked beaches and</text>
                   <text x="66" y="379" font-size="8.5" font-weight="600" fill="#881337">luxury 5-star resorts with our award</text>
                   <text x="66" y="393" font-size="8.5" font-weight="600" fill="#881337">winning PeakTours brochure text...</text>`
                : ''
            }

            <!-- Margin Annotations -->
            ${
              hasNotes
                ? `<line x1="262" y1="102" x2="298" y2="102" stroke="#4f46e5" stroke-width="1.5" />
                   <text x="304" y="100" font-size="9.5" font-weight="700" fill="#312e81">Sticky top nav</text>
                   <text x="304" y="113" font-size="8.5" fill="#475569">Links to 3 pages</text>
                   <line x1="262" y1="321" x2="298" y2="321" stroke="#4f46e5" stroke-width="1.5" />
                   <text x="304" y="319" font-size="9.5" font-weight="700" fill="#312e81">Primary CTA</text>
                   <text x="304" y="332" font-size="8.5" fill="#475569">Opens results list</text>`
                : ''
            }

            <!-- Distractor Colour Swatches -->
            ${
              hasDistPalette
                ? `<rect x="296" y="180" width="144" height="62" rx="8" fill="#fff1f2" stroke="#e11d48" stroke-width="1.5" />
                   <text x="308" y="198" font-size="9" font-weight="700" fill="#9f1239">Hex Colour Swatches</text>
                   <circle cx="322" cy="220" r="10" fill="#0ea5e9" />
                   <circle cx="348" cy="220" r="10" fill="#f59e0b" />
                   <circle cx="374" cy="220" r="10" fill="#10b981" />`
                : ''
            }
          </svg>
        </div>

        ${
          res
            ? `
              <div data-testid="ta1-wireframe-result" class="px-5 py-4 border-t border-slate-100 ${res.marksEarned === res.maxMarks ? 'bg-emerald-50' : 'bg-amber-50'} text-xs space-y-1">
                <div class="font-bold text-slate-900 font-mono tabular-nums">Wireframe Score: ${res.marksEarned} / ${res.maxMarks} Marks</div>
                <p class="text-slate-700">${esc(res.feedback)}</p>
              </div>
            `
            : ''
        }
      </div>

      <div class="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div>
          <div class="text-xs font-semibold text-indigo-600">Select Only Valid Wireframe Components</div>
          <h3 class="text-sm font-bold text-slate-900">Element Checklist (Watch Out for 3 OCR Distractors!)</h3>
          <p class="text-xs text-slate-600 mt-1">${esc(challenge.brief)}</p>
        </div>
        <div class="space-y-2">
          ${challenge.elements
            .map((el) => {
              const checked = selected.has(el.id);
              let badge = '';
              if (res) {
                if (el.isDistractor && checked) {
                  badge = '<span class="text-[11px] font-bold text-rose-700 shrink-0">✗ Distractor (-1)</span>';
                } else if (el.required && checked) {
                  badge = '<span class="text-[11px] font-bold text-emerald-700 shrink-0">✓ Valid (+1)</span>';
                } else if (el.required && !checked) {
                  badge = '<span class="text-[11px] font-bold text-amber-700 shrink-0">Missing</span>';
                } else if (el.isDistractor && !checked) {
                  badge = '<span class="text-[11px] font-semibold text-slate-500 shrink-0">Avoided</span>';
                }
              }
              return `
                <label class="flex items-start justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  checked ? 'bg-indigo-50/70 border-indigo-300' : 'bg-white border-slate-200 hover:border-slate-300'
                }">
                  <div class="flex items-start gap-2.5">
                    <input type="checkbox" data-ta1-wf-toggle="${el.id}" ${checked ? 'checked' : ''} class="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
                    <div class="text-xs">
                      <div class="font-semibold text-slate-900">${esc(el.label)}</div>
                      ${res ? `<div class="text-slate-600 mt-0.5">${esc(el.reason)}</div>` : ''}
                    </div>
                  </div>
                  ${badge}
                </label>
              `;
            })
            .join('')}
        </div>
      </div>
    </div>
  `;
}

function renderVisualisationBlueprint(): string {
  const challenge = VISUALISATION_CHALLENGE;
  const res = uiState.visResult;
  const selectedPin = challenge.pins.find((p) => p.id === uiState.visSelectedPinId) || challenge.pins[0];

  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-6 bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div class="text-xs font-semibold text-indigo-600">Annotated Static Graphic Plan · ${challenge.maxMarks} Marks</div>
            <h2 class="text-base font-bold text-slate-900">${esc(challenge.title)}</h2>
          </div>
          <button type="button" data-ta1-vis-action="check" class="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg">
            Check Annotations
          </button>
        </div>

        <div class="p-4 bg-slate-50" style="background-image: radial-gradient(#cbd5e1 1px, transparent 1px); background-size: 16px 16px;">
          <svg viewBox="0 0 540 420" class="w-full h-auto max-h-[420px]" role="img" aria-label="Road safety poster visualisation diagram">
            <!-- A3 Poster Frame -->
            <rect x="70" y="20" width="400" height="380" rx="6" fill="#0f172a" stroke="#334155" stroke-width="2.5" />
            <rect x="86" y="36" width="368" height="348" fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="5 4" />
            <!-- Headline Banner -->
            <rect x="104" y="48" width="332" height="52" rx="6" fill="#facc15" />
            <text x="270" y="81" text-anchor="middle" font-size="22" font-weight="800" fill="#0f172a" font-family="Plus Jakarta Sans, sans-serif">CROSS SMART!</text>
            <!-- Hero Graphic -->
            <rect x="104" y="114" width="236" height="176" rx="6" fill="#1e293b" stroke="#64748b" stroke-width="1.5" />
            <rect x="128" y="218" width="188" height="46" fill="#334155" />
            <rect x="144" y="226" width="22" height="30" fill="#f8fafc" />
            <rect x="182" y="226" width="22" height="30" fill="#f8fafc" />
            <rect x="220" y="226" width="22" height="30" fill="#f8fafc" />
            <rect x="258" y="226" width="22" height="30" fill="#f8fafc" />
            <text x="222" y="170" text-anchor="middle" font-size="11" font-weight="700" fill="#e2e8f0">Zebra Crossing &amp; Cyclist Sketch</text>
            <!-- Features Box -->
            <rect x="352" y="114" width="84" height="176" rx="6" fill="#1e293b" stroke="#facc15" stroke-width="1.5" />
            <text x="394" y="142" text-anchor="middle" font-size="9.5" font-weight="700" fill="#facc15">FEATURES</text>
            <line x1="364" y1="162" x2="424" y2="162" stroke="#cbd5e1" stroke-width="2" />
            <line x1="364" y1="184" x2="420" y2="184" stroke="#cbd5e1" stroke-width="2" />
            <line x1="364" y1="206" x2="424" y2="206" stroke="#cbd5e1" stroke-width="2" />
            <!-- Bottom Sponsor + QR -->
            <rect x="104" y="306" width="110" height="62" rx="6" fill="#f8fafc" />
            <text x="159" y="341" text-anchor="middle" font-size="10" font-weight="700" fill="#0f172a">LOGO + QR</text>

            <!-- Numbered Interactive Pins -->
            ${challenge.pins
              .map((pin) => {
                const isSel = selectedPin.id === pin.id;
                const assigned = Boolean(uiState.visAssignments[pin.id]);
                const ok = res ? res.pinResults[pin.id] : null;
                const fill =
                  ok === true ? '#059669' : ok === false ? '#dc2626' : isSel ? '#4f46e5' : assigned ? '#0284c7' : '#f59e0b';
                return `
                  <g class="cursor-pointer" data-ta1-vis-pin="${pin.id}" role="button" tabindex="0" aria-label="Pin ${pin.number}: ${esc(pin.regionLabel)}">
                    <circle cx="${pin.x}" cy="${pin.y}" r="${isSel ? 17 : 14}" fill="${fill}" stroke="#ffffff" stroke-width="2.5" />
                    <text x="${pin.x}" y="${pin.y + 4.5}" text-anchor="middle" font-size="12" font-weight="800" fill="#ffffff" font-family="JetBrains Mono, monospace">${pin.number}</text>
                  </g>
                `;
              })
              .join('')}
          </svg>
        </div>

        ${
          res
            ? `
              <div data-testid="ta1-vis-result" class="px-5 py-4 border-t border-slate-100 ${res.marksEarned === res.maxMarks ? 'bg-emerald-50' : 'bg-amber-50'} text-xs space-y-1">
                <div class="font-bold text-slate-900 font-mono tabular-nums">Visualisation Diagram Score: ${res.marksEarned} / ${res.maxMarks} Marks</div>
                <p class="text-slate-700">${esc(res.feedback)}</p>
              </div>
            `
            : ''
        }
      </div>

      <div class="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div>
          <div class="text-xs font-semibold text-indigo-600">Callout Annotations</div>
          <h3 class="text-sm font-bold text-slate-900">Attach OCR Specification Notes to Pins 1–6</h3>
          <p class="text-xs text-slate-600 mt-1">${esc(challenge.brief)}</p>
        </div>
        <div class="space-y-3">
          ${challenge.pins
            .map((pin) => {
              const val = uiState.visAssignments[pin.id] || '';
              const ok = res ? res.pinResults[pin.id] : null;
              return `
                <div class="p-3 rounded-xl border ${pin.id === selectedPin.id ? 'border-indigo-400 bg-indigo-50/40' : 'border-slate-200 bg-white'}">
                  <div class="flex items-center justify-between gap-2 mb-1.5">
                    <label for="vis-pin-${pin.id}" class="text-xs font-bold text-slate-900">
                      <span class="font-mono text-indigo-600 mr-1">#${pin.number}</span> ${esc(pin.regionLabel)}
                    </label>
                    ${ok === true ? '<span class="text-[11px] font-bold text-emerald-700">✓ Correct</span>' : ok === false ? '<span class="text-[11px] font-bold text-rose-700">✗ Check</span>' : ''}
                  </div>
                  <select id="vis-pin-${pin.id}" data-ta1-vis-assign="${pin.id}"
                    class="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900">
                    <option value="">-- Select annotation detail --</option>
                    ${challenge.annotationOptions
                      .map((opt) => `<option value="${opt.id}" ${val === opt.id ? 'selected' : ''}>${esc(opt.category)}: ${esc(opt.label)}</option>`)
                      .join('')}
                  </select>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    </div>
  `;
}

function renderBlueprintsTab(): string {
  const subTabs: Array<{ id: BlueprintSubTab; label: string; challengeId: string; maxMarks: number }> = [
    { id: 'mindmap', label: '1. Mind Map Builder', challengeId: MIND_MAP_CHALLENGE.id, maxMarks: MIND_MAP_CHALLENGE.maxMarks },
    { id: 'wireframe', label: '2. Wireframe Challenge', challengeId: WIREFRAME_CHALLENGE.id, maxMarks: WIREFRAME_CHALLENGE.maxMarks },
    { id: 'visualisation', label: '3. Visualisation Diagram', challengeId: VISUALISATION_CHALLENGE.id, maxMarks: VISUALISATION_CHALLENGE.maxMarks },
  ];

  const bar = `
    <div class="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200">
      ${subTabs
        .map((st) => {
          const active = uiState.blueprintTab === st.id;
          const saved = uiState.progress.completedBlueprints[st.challengeId];
          const done = saved && saved.bestMarks >= Math.ceil(st.maxMarks * 0.8);
          return `
            <button type="button" data-ta1-blueprint-tab="${st.id}"
              class="px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                active ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }">
              <span>${st.label}</span>
              ${done ? '<span class="text-emerald-400 font-bold">✓</span>' : ''}
            </button>
          `;
        })
        .join('')}
    </div>
  `;

  const body =
    uiState.blueprintTab === 'mindmap'
      ? renderMindMapBlueprint()
      : uiState.blueprintTab === 'wireframe'
        ? renderWireframeBlueprint()
        : renderVisualisationBlueprint();

  return `${bar}${body}`;
}

function renderToolMatcherTab(): string {
  const safeIdx = Math.max(0, Math.min(uiState.toolIndex, TOOL_CHOICE_QUESTIONS.length - 1));
  const q = TOOL_CHOICE_QUESTIONS[safeIdx];
  const sel = uiState.toolSelections[q.id] || { tool: '', reasonId: '', checked: false };
  const evalRes = sel.checked ? evaluateToolChoice(q, sel.tool, sel.reasonId) : null;

  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div class="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <div class="text-xs font-semibold text-indigo-600">AO1 + AO2 Exam Application · 2 Marks</div>
            <h2 class="text-base sm:text-lg font-bold text-slate-900">${esc(q.client)}</h2>
          </div>
          <span class="font-mono tabular-nums text-xs font-semibold text-slate-500">Brief ${safeIdx + 1} of ${TOOL_CHOICE_QUESTIONS.length}</span>
        </div>

        <p class="text-sm text-slate-800 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-4">
          "${esc(q.scenario)}"
        </p>

        <div class="space-y-2.5">
          <div class="text-xs font-bold text-slate-900">1. Select the most suitable TA1 Design Tool (1 mark)</div>
          <div class="grid grid-cols-2 gap-2.5">
            ${q.toolOptions
              .map((tool) => {
                const picked = sel.tool === tool;
                let cls = picked
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-800';
                if (sel.checked) {
                  if (tool === q.correctTool) {
                    cls = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold';
                  } else if (picked) {
                    cls = 'bg-rose-50 border-rose-400 text-rose-950 font-bold';
                  }
                }
                return `
                  <button type="button" data-ta1-tool-pick="${q.id}:${esc(tool)}"
                    class="px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold text-left transition-colors ${cls}">
                    ${esc(tool)}
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>

        <div class="space-y-2.5">
          <div class="text-xs font-bold text-slate-900">2. Pick the strongest AO2 justification (1 mark)</div>
          <div class="space-y-2">
            ${q.reasonOptions
              .map((r) => {
                const picked = sel.reasonId === r.id;
                let cls = picked
                  ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-semibold'
                  : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-700';
                if (sel.checked) {
                  if (r.correct) {
                    cls = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
                  } else if (picked) {
                    cls = 'bg-rose-50 border-rose-400 text-rose-950 font-semibold';
                  }
                }
                return `
                  <button type="button" data-ta1-reason-pick="${q.id}:${r.id}"
                    class="w-full px-4 py-3 rounded-xl border text-left text-xs sm:text-sm transition-colors ${cls}">
                    ${esc(r.text)}
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <button type="button" data-ta1-tool-nav="-1" ${safeIdx === 0 ? 'disabled' : ''}
            class="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40">
            ← Previous Brief
          </button>
          <div class="flex items-center gap-2">
            <button type="button" data-ta1-tool-check="${q.id}" ${!sel.tool || !sel.reasonId ? 'disabled' : ''}
              class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors">
              Check Answer (2 Marks)
            </button>
            <button type="button" data-ta1-tool-nav="1" ${safeIdx === TOOL_CHOICE_QUESTIONS.length - 1 ? 'disabled' : ''}
              class="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-40">
              Next Brief →
            </button>
          </div>
        </div>

        ${
          evalRes
            ? `
              <div data-testid="ta1-tool-feedback" class="p-4 rounded-xl border ${evalRes.marksEarned === 2 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'} text-xs space-y-1">
                <div class="font-bold text-slate-900 font-mono tabular-nums">
                  Awarded ${evalRes.marksEarned} / ${evalRes.maxMarks} Marks · Tool: ${evalRes.toolCorrect ? '✓ Correct' : '✗ Review'} · Justification: ${evalRes.reasonCorrect ? '✓ Correct' : '✗ Review'}
                </div>
                <p class="text-slate-700">${esc(q.markSchemeNote)}</p>
              </div>
            `
            : ''
        }
      </div>

      <div class="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div>
          <div class="text-xs font-semibold text-indigo-600">TA1 Exam Distinctions</div>
          <h3 class="text-sm font-bold text-slate-900">Never Confuse These 6 Tools</h3>
        </div>
        <dl class="space-y-2.5 text-xs">
          <div class="pb-2 border-b border-slate-100"><dt class="font-bold text-slate-900">Flowchart</dt><dd class="text-slate-600">Algorithm steps, data inputs/outputs, and Yes/No logic branches.</dd></div>
          <div class="pb-2 border-b border-slate-100"><dt class="font-bold text-slate-900">Wireframe</dt><dd class="text-slate-600">Low-fidelity interactive UI screen layout, placeholders [X], and navigation.</dd></div>
          <div class="pb-2 border-b border-slate-100"><dt class="font-bold text-slate-900">Visualisation Diagram</dt><dd class="text-slate-600">Annotated static visual layout (poster, cover) with fonts, colours, and sizes.</dd></div>
          <div class="pb-2 border-b border-slate-100"><dt class="font-bold text-slate-900">Mind Map</dt><dd class="text-slate-600">Central theme with radiating main branches and sub-nodes for brainstorming.</dd></div>
          <div class="pb-2 border-b border-slate-100"><dt class="font-bold text-slate-900">Mood Board</dt><dd class="text-slate-600">Visual tone, textures, sample photos, and colour palette inspiration.</dd></div>
          <div><dt class="font-bold text-slate-900">Site Map</dt><dd class="text-slate-600">Hierarchical parent-child diagram showing how website pages connect.</dd></div>
        </dl>
      </div>
    </div>
  `;
}

export function renderTa1Trainer(): void {
  if (!containerEl) return;
  const summary = computeTa1MasterySummary(uiState.progress);

  let bodyHtml = '';
  if (uiState.activeTab === 'flowchart') {
    bodyHtml = uiState.flowchartMode === 'freeform' ? renderFreeformFlowchartTab() : renderFlowchartScenarioTab();
  } else if (uiState.activeTab === 'drill') {
    bodyHtml = renderSymbolDrillTab();
  } else if (uiState.activeTab === 'blueprints') {
    bodyHtml = renderBlueprintsTab();
  } else {
    bodyHtml = renderToolMatcherTab();
  }

  containerEl.innerHTML = `
    <div class="space-y-6">
      ${renderHeaderAndTabs(summary)}
      ${bodyHtml}
    </div>
  `;

  if (onProgressChangeCb) {
    onProgressChangeCb(summary);
  }
}

function handleClick(e: Event): void {
  const target = e.target as HTMLElement | null;
  if (!target) return;

  const tabBtn = target.closest<HTMLElement>('[data-ta1-tab]');
  if (tabBtn) {
    stopTracePlayback();
    uiState.activeTab = tabBtn.dataset.ta1Tab as Ta1TrainerTab;
    renderTa1Trainer();
    return;
  }

  const scenarioBtn = target.closest<HTMLElement>('[data-ta1-scenario]');
  if (scenarioBtn) {
    stopTracePlayback();
    uiState.flowchartMode = 'scenario';
    uiState.scenarioId = scenarioBtn.dataset.ta1Scenario!;
    uiState.selectedNodeId = 'n2';
    uiState.traceResult = null;
    uiState.traceStepIndex = -1;
    renderTa1Trainer();
    return;
  }

  const ffModeBtn = target.closest<HTMLElement>('[data-ta1-flowchart-mode]');
  if (ffModeBtn) {
    stopTracePlayback();
    uiState.flowchartMode = ffModeBtn.dataset.ta1FlowchartMode as 'scenario' | 'freeform';
    renderTa1Trainer();
    return;
  }

  const nodeEl = target.closest<HTMLElement>('[data-ta1-select-node]');
  if (nodeEl) {
    uiState.selectedNodeId = nodeEl.dataset.ta1SelectNode!;
    renderTa1Trainer();
    return;
  }

  const edgeToggle = target.closest<HTMLElement>('[data-ta1-edge-toggle]');
  if (edgeToggle) {
    const edgeId = edgeToggle.dataset.ta1EdgeToggle!;
    const scenario = getActiveScenario();
    const sub = uiState.submissions[scenario.id];
    const current = sub.edgeLabels[edgeId] || '';
    sub.edgeLabels[edgeId] = current === '' ? 'Yes' : current === 'Yes' ? 'No' : '';
    uiState.evaluations[scenario.id] = null;
    renderTa1Trainer();
    return;
  }

  const symBtn = target.closest<HTMLElement>('[data-ta1-assign-symbol]');
  if (symBtn) {
    const scenario = getActiveScenario();
    const node = scenario.nodes.find((n) => n.id === uiState.selectedNodeId);
    if (node && !node.locked) {
      uiState.submissions[scenario.id].nodeSymbols[node.id] = symBtn.dataset.ta1AssignSymbol as FlowchartSymbolType;
      uiState.evaluations[scenario.id] = null;
      renderTa1Trainer();
    }
    return;
  }

  const tcBtn = target.closest<HTMLElement>('[data-ta1-testcase]');
  if (tcBtn) {
    stopTracePlayback();
    const scenario = getActiveScenario();
    uiState.selectedTestCaseId[scenario.id] = tcBtn.dataset.ta1Testcase!;
    uiState.traceResult = null;
    uiState.traceStepIndex = -1;
    renderTa1Trainer();
    return;
  }

  const actionBtn = target.closest<HTMLElement>('[data-ta1-action]');
  if (actionBtn) {
    const act = actionBtn.dataset.ta1Action;
    const scenario = getActiveScenario();
    if (act === 'open-ta1-sheet') {
      if (onOpenQuickRefCb) onOpenQuickRefCb('TA1');
      return;
    }
    if (act === 'reset-scenario') {
      stopTracePlayback();
      uiState.submissions[scenario.id] = createInitialSubmission(scenario);
      uiState.evaluations[scenario.id] = null;
      uiState.traceResult = null;
      uiState.traceStepIndex = -1;
      renderTa1Trainer();
      return;
    }
    if (act === 'show-model') {
      stopTracePlayback();
      uiState.submissions[scenario.id] = createModelSubmission(scenario);
      uiState.evaluations[scenario.id] = evaluateFlowchartSubmission(scenario, uiState.submissions[scenario.id]);
      renderTa1Trainer();
      return;
    }
    if (act === 'check-flowchart') {
      const evalRes = evaluateFlowchartSubmission(scenario, uiState.submissions[scenario.id]);
      uiState.evaluations[scenario.id] = evalRes;
      const prev = uiState.progress.completedFlowcharts[scenario.id];
      const bestMarks = Math.max(prev?.bestMarks || 0, evalRes.marksEarned);
      uiState.progress.completedFlowcharts[scenario.id] = { bestMarks, maxMarks: evalRes.maxMarks };
      saveProgress(uiState.progress);
      if (onShowToastCb) {
        onShowToastCb(
          evalRes.allPassed
            ? `Full marks! ${evalRes.marksEarned}/${evalRes.maxMarks} on ${scenario.title}.`
            : `Scored ${evalRes.marksEarned}/${evalRes.maxMarks} — check the OCR mark scheme breakdown.`,
          evalRes.allPassed ? 'success' : 'info'
        );
      }
      renderTa1Trainer();
      return;
    }
    if (act === 'trace-step') {
      stopTracePlayback();
      const tcId = uiState.selectedTestCaseId[scenario.id] || scenario.testCases[0].id;
      if (!uiState.traceResult) {
        uiState.traceResult = traceFlowchartExecution(scenario, uiState.submissions[scenario.id], tcId);
        uiState.traceStepIndex = 0;
      } else if (uiState.traceStepIndex < uiState.traceResult.steps.length - 1) {
        uiState.traceStepIndex++;
      } else {
        uiState.traceStepIndex = 0;
      }
      renderTa1Trainer();
      return;
    }
    if (act === 'trace-play') {
      if (uiState.traceTimer !== null) {
        stopTracePlayback();
        renderTa1Trainer();
        return;
      }
      const tcId = uiState.selectedTestCaseId[scenario.id] || scenario.testCases[0].id;
      uiState.traceResult = traceFlowchartExecution(scenario, uiState.submissions[scenario.id], tcId);
      uiState.traceStepIndex = 0;
      renderTa1Trainer();
      uiState.traceTimer = window.setInterval(() => {
        if (!uiState.traceResult || uiState.traceStepIndex >= uiState.traceResult.steps.length - 1) {
          stopTracePlayback();
          renderTa1Trainer();
          return;
        }
        uiState.traceStepIndex++;
        renderTa1Trainer();
      }, 950);
      return;
    }
    if (act === 'trace-reset') {
      stopTracePlayback();
      uiState.traceResult = null;
      uiState.traceStepIndex = -1;
      renderTa1Trainer();
      return;
    }
  }

  // Freeform handlers
  const ffSelect = target.closest<HTMLElement>('[data-ta1-ff-select]');
  if (ffSelect) {
    uiState.freeformSelectedId = ffSelect.dataset.ta1FfSelect!;
    renderTa1Trainer();
    return;
  }
  const ffAdd = target.closest<HTMLElement>('[data-ta1-ff-add]');
  if (ffAdd) {
    const sym = ffAdd.dataset.ta1FfAdd as FlowchartSymbolType;
    const id = `ff-${Date.now().toString(36)}`;
    const y = Math.min(460, 56 + uiState.freeformNodes.length * 64);
    const defaultLabel =
      sym === 'terminator'
        ? 'End'
        : sym === 'decision'
          ? 'Condition?'
          : sym === 'io'
            ? 'Input / Output'
            : sym === 'subroutine'
              ? 'Run Sub()'
              : 'Process step';
    uiState.freeformNodes.push({ id, symbol: sym, label: defaultLabel, x: 340, y });
    uiState.freeformSelectedId = id;
    uiState.freeformCheckResult = null;
    renderTa1Trainer();
    return;
  }
  const ffDel = target.closest<HTMLElement>('[data-ta1-ff-delete]');
  if (ffDel) {
    const delId = ffDel.dataset.ta1FfDelete!;
    uiState.freeformNodes = uiState.freeformNodes.filter((n) => n.id !== delId);
    uiState.freeformEdges = uiState.freeformEdges.filter((edge) => edge.from !== delId && edge.to !== delId);
    uiState.freeformSelectedId = uiState.freeformNodes[0]?.id || null;
    uiState.freeformCheckResult = null;
    renderTa1Trainer();
    return;
  }
  const ffMove = target.closest<HTMLElement>('[data-ta1-ff-move]');
  if (ffMove) {
    const [id, dxStr, dyStr] = ffMove.dataset.ta1FfMove!.split(':');
    const node = uiState.freeformNodes.find((n) => n.id === id);
    if (node) {
      node.x = Math.max(95, Math.min(585, node.x + Number(dxStr)));
      node.y = Math.max(36, Math.min(474, node.y + Number(dyStr)));
      renderTa1Trainer();
    }
    return;
  }
  const ffAction = target.closest<HTMLElement>('[data-ta1-ff-action]');
  if (ffAction) {
    const act = ffAction.dataset.ta1FfAction;
    if (act === 'clear') {
      uiState.freeformNodes = [];
      uiState.freeformEdges = [];
      uiState.freeformSelectedId = null;
      uiState.freeformCheckResult = null;
      renderTa1Trainer();
      return;
    }
    if (act === 'connect' && containerEl) {
      const fromEl = containerEl.querySelector<HTMLSelectElement>('#ta1-ff-from');
      const toEl = containerEl.querySelector<HTMLSelectElement>('#ta1-ff-to');
      const brEl = containerEl.querySelector<HTMLSelectElement>('#ta1-ff-branch');
      if (fromEl && toEl && fromEl.value && toEl.value && fromEl.value !== toEl.value) {
        uiState.freeformEdges.push({
          id: `fe-${Date.now().toString(36)}`,
          from: fromEl.value,
          to: toEl.value,
          branchLabel: (brEl?.value || '') as 'Yes' | 'No' | '',
        });
        uiState.freeformCheckResult = null;
        renderTa1Trainer();
      }
      return;
    }
    if (act === 'check') {
      uiState.freeformCheckResult = validateFreeformFlowchart(uiState.freeformNodes, uiState.freeformEdges);
      renderTa1Trainer();
      return;
    }
  }

  // Drill handlers
  const drillFilter = target.closest<HTMLElement>('[data-ta1-drill-filter]');
  if (drillFilter) {
    uiState.drillFilter = drillFilter.dataset.ta1DrillFilter as 'all' | 'symbols' | 'errors';
    uiState.drillIndex = 0;
    renderTa1Trainer();
    return;
  }
  const drillAns = target.closest<HTMLElement>('[data-ta1-drill-answer]');
  if (drillAns) {
    const [itemId, optId] = drillAns.dataset.ta1DrillAnswer!.split(':');
    const item = SYMBOL_DRILL_BANK.find((d) => d.id === itemId);
    if (item) {
      uiState.drillAnswers[itemId] = optId;
      if (optId === item.correctOptionId) {
        uiState.progress.completedDrills[itemId] = true;
        saveProgress(uiState.progress);
      }
      renderTa1Trainer();
    }
    return;
  }
  const drillNav = target.closest<HTMLElement>('[data-ta1-drill-nav]');
  if (drillNav) {
    uiState.drillIndex += Number(drillNav.dataset.ta1DrillNav);
    renderTa1Trainer();
    return;
  }

  // Blueprint handlers
  const bpTab = target.closest<HTMLElement>('[data-ta1-blueprint-tab]');
  if (bpTab) {
    uiState.blueprintTab = bpTab.dataset.ta1BlueprintTab as BlueprintSubTab;
    renderTa1Trainer();
    return;
  }
  const mmSlot = target.closest<HTMLElement>('[data-ta1-mm-slot]');
  if (mmSlot) {
    const sid = mmSlot.dataset.ta1MmSlot!;
    const slot = MIND_MAP_CHALLENGE.slots.find((s) => s.id === sid);
    if (slot && !slot.locked) {
      uiState.mindMapSelectedSlotId = sid;
      renderTa1Trainer();
    }
    return;
  }
  const mmAction = target.closest<HTMLElement>('[data-ta1-mm-action]');
  if (mmAction) {
    if (mmAction.dataset.ta1MmAction === 'reset') {
      uiState.mindMapAssignments = { 'mm-center': MIND_MAP_CHALLENGE.slots[0].expectedLabel };
      uiState.mindMapResult = null;
      renderTa1Trainer();
      return;
    }
    if (mmAction.dataset.ta1MmAction === 'check') {
      const res = evaluateMindMap(MIND_MAP_CHALLENGE, uiState.mindMapAssignments);
      uiState.mindMapResult = res;
      const prev = uiState.progress.completedBlueprints[MIND_MAP_CHALLENGE.id];
      uiState.progress.completedBlueprints[MIND_MAP_CHALLENGE.id] = {
        bestMarks: Math.max(prev?.bestMarks || 0, res.marksEarned),
        maxMarks: res.maxMarks,
      };
      saveProgress(uiState.progress);
      renderTa1Trainer();
      return;
    }
  }
  const wfAction = target.closest<HTMLElement>('[data-ta1-wf-action]');
  if (wfAction && wfAction.dataset.ta1WfAction === 'check') {
    const res = evaluateWireframeSelection(WIREFRAME_CHALLENGE, uiState.wireframeSelectedIds);
    uiState.wireframeResult = res;
    const prev = uiState.progress.completedBlueprints[WIREFRAME_CHALLENGE.id];
    uiState.progress.completedBlueprints[WIREFRAME_CHALLENGE.id] = {
      bestMarks: Math.max(prev?.bestMarks || 0, res.marksEarned),
      maxMarks: res.maxMarks,
    };
    saveProgress(uiState.progress);
    renderTa1Trainer();
    return;
  }
  const visPin = target.closest<HTMLElement>('[data-ta1-vis-pin]');
  if (visPin) {
    uiState.visSelectedPinId = visPin.dataset.ta1VisPin!;
    renderTa1Trainer();
    return;
  }
  const visAction = target.closest<HTMLElement>('[data-ta1-vis-action]');
  if (visAction && visAction.dataset.ta1VisAction === 'check') {
    const res = evaluateVisualisationDiagram(VISUALISATION_CHALLENGE, uiState.visAssignments);
    uiState.visResult = res;
    const prev = uiState.progress.completedBlueprints[VISUALISATION_CHALLENGE.id];
    uiState.progress.completedBlueprints[VISUALISATION_CHALLENGE.id] = {
      bestMarks: Math.max(prev?.bestMarks || 0, res.marksEarned),
      maxMarks: res.maxMarks,
    };
    saveProgress(uiState.progress);
    renderTa1Trainer();
    return;
  }

  // Tool Matcher handlers
  const toolPick = target.closest<HTMLElement>('[data-ta1-tool-pick]');
  if (toolPick) {
    const idx = toolPick.dataset.ta1ToolPick!.indexOf(':');
    const qid = toolPick.dataset.ta1ToolPick!.slice(0, idx);
    const tool = toolPick.dataset.ta1ToolPick!.slice(idx + 1);
    const cur = uiState.toolSelections[qid] || { tool: '', reasonId: '', checked: false };
    uiState.toolSelections[qid] = { ...cur, tool, checked: false };
    renderTa1Trainer();
    return;
  }
  const reasonPick = target.closest<HTMLElement>('[data-ta1-reason-pick]');
  if (reasonPick) {
    const [qid, reasonId] = reasonPick.dataset.ta1ReasonPick!.split(':');
    const cur = uiState.toolSelections[qid] || { tool: '', reasonId: '', checked: false };
    uiState.toolSelections[qid] = { ...cur, reasonId, checked: false };
    renderTa1Trainer();
    return;
  }
  const toolCheck = target.closest<HTMLElement>('[data-ta1-tool-check]');
  if (toolCheck) {
    const qid = toolCheck.dataset.ta1ToolCheck!;
    const q = TOOL_CHOICE_QUESTIONS.find((item) => item.id === qid);
    const cur = uiState.toolSelections[qid];
    if (q && cur && cur.tool && cur.reasonId) {
      cur.checked = true;
      const res = evaluateToolChoice(q, cur.tool, cur.reasonId);
      if (res.marksEarned === 2) {
        uiState.progress.completedToolMatches[qid] = true;
        saveProgress(uiState.progress);
      }
      renderTa1Trainer();
    }
    return;
  }
  const toolNav = target.closest<HTMLElement>('[data-ta1-tool-nav]');
  if (toolNav) {
    uiState.toolIndex += Number(toolNav.dataset.ta1ToolNav);
    renderTa1Trainer();
    return;
  }
}

function handleChange(e: Event): void {
  const target = e.target as HTMLInputElement | HTMLSelectElement | null;
  if (!target) return;

  if (target.dataset.ta1AssignLabel) {
    const scenario = getActiveScenario();
    const nodeId = target.dataset.ta1AssignLabel;
    uiState.submissions[scenario.id].nodeLabels[nodeId] = target.value;
    uiState.evaluations[scenario.id] = null;
    renderTa1Trainer();
    return;
  }

  if (target.dataset.ta1BranchSelect) {
    const scenario = getActiveScenario();
    const edgeId = target.dataset.ta1BranchSelect;
    uiState.submissions[scenario.id].edgeLabels[edgeId] = target.value;
    uiState.evaluations[scenario.id] = null;
    renderTa1Trainer();
    return;
  }

  if (target.dataset.ta1MmAssign) {
    const slotId = target.dataset.ta1MmAssign;
    uiState.mindMapAssignments[slotId] = target.value;
    uiState.mindMapResult = null;
    renderTa1Trainer();
    return;
  }

  if (target.dataset.ta1WfToggle) {
    const elId = target.dataset.ta1WfToggle;
    const isChecked = (target as HTMLInputElement).checked;
    const set = new Set(uiState.wireframeSelectedIds);
    if (isChecked) set.add(elId);
    else set.delete(elId);
    uiState.wireframeSelectedIds = Array.from(set);
    uiState.wireframeResult = null;
    renderTa1Trainer();
    return;
  }

  if (target.dataset.ta1VisAssign) {
    const pinId = target.dataset.ta1VisAssign;
    uiState.visAssignments[pinId] = target.value;
    uiState.visResult = null;
    renderTa1Trainer();
    return;
  }
}

function handleInput(e: Event): void {
  const target = e.target as HTMLInputElement | null;
  if (!target) return;
  if (target.dataset.ta1FfLabel) {
    const node = uiState.freeformNodes.find((n) => n.id === target.dataset.ta1FfLabel);
    if (node) {
      node.label = target.value;
      const svgText = containerEl?.querySelector(`[data-ta1-ff-select="${node.id}"] text`);
      if (svgText) svgText.textContent = target.value;
    }
  }
}

export function initTa1Trainer(options: {
  container: HTMLElement;
  onProgressChange?: (summary: Ta1MasterySummary) => void;
  onOpenQuickRef?: (topicId: string) => void;
  onShowToast?: (msg: string, type?: string) => void;
}): void {
  containerEl = options.container;
  onProgressChangeCb = options.onProgressChange || null;
  onOpenQuickRefCb = options.onOpenQuickRef || null;
  onShowToastCb = options.onShowToast || null;

  if (!containerEl.dataset.ta1Bound) {
    containerEl.addEventListener('click', handleClick);
    containerEl.addEventListener('change', handleChange);
    containerEl.addEventListener('input', handleInput);
    containerEl.dataset.ta1Bound = '1';
  }
  uiState.progress = loadProgress();
  renderTa1Trainer();
}

export function setTa1TrainerTab(tab: Ta1TrainerTab): void {
  stopTracePlayback();
  uiState.activeTab = tab;
  uiState.progress = loadProgress();
  renderTa1Trainer();
}

export function getTa1MasterySummary(): Ta1MasterySummary {
  uiState.progress = loadProgress();
  return computeTa1MasterySummary(uiState.progress);
}

export function stopTa1TrainerTimers(): void {
  stopTracePlayback();
}
