import {
  CONNECTIVITY_SPECS,
  CONNECTIVITY_CHALLENGES,
  IOE_SYSTEM_BLUEPRINTS,
  COMMS_CHALLENGES,
  TRADEOFF_CHALLENGES,
  evaluateConnectivityChallenge,
  evaluateIoeBuild,
  evaluateCommsChallenge,
  evaluateTradeoffChallenge,
  computeTa56MasterySummary,
  type ConnectivityTechId,
  type ConnectivityEvaluation,
  type IoeStageKey,
  type IoeBuildEvaluation,
  type TwoPartEvaluation,
  type Ta56Progress,
  type Ta56MasterySummary,
} from './ta56BuilderEngine';

const STORAGE_KEY = 'OCR_R050_TA56_SYSTEM_BUILDER_V1';

export type Ta56BuilderTab = 'connectivity' | 'ioe' | 'comms' | 'tradeoffs';

export interface Ta56InitOptions {
  initialTab?: Ta56BuilderTab;
  onProgressChange?: (summary: Ta56MasterySummary) => void;
  onShowToast?: (msg: string, type?: string) => void;
}

interface Ta56UiState {
  activeTab: Ta56BuilderTab;
  // Tab 1: Connectivity
  activeSpecId: ConnectivityTechId;
  connChallengeId: string;
  connSelectedTech: Record<string, ConnectivityTechId | ''>;
  connSelectedReason: Record<string, string>;
  connResults: Record<string, ConnectivityEvaluation | null>;
  connValidationMsg: string | null;
  // Tab 2: IoE System Builder
  ioeBlueprintId: string;
  ioeSelections: Record<string, Partial<Record<IoeStageKey, string>>>;
  ioeResults: Record<string, IoeBuildEvaluation | null>;
  ioeValidationMsg: string | null;
  // Tab 3: Digital Comms Studio
  commsId: string;
  commsSelectedChannel: Record<string, string>;
  commsSelectedDetail: Record<string, string>;
  commsResults: Record<string, TwoPartEvaluation | null>;
  commsValidationMsg: string | null;
  // Tab 4: Reliability & Trade-Offs
  tradeoffId: string;
  tradeoffSelectedRisk: Record<string, string>;
  tradeoffSelectedMitigation: Record<string, string>;
  tradeoffResults: Record<string, TwoPartEvaluation | null>;
  tradeoffValidationMsg: string | null;
  // Persisted mastery
  progress: Ta56Progress;
}

let containerEl: HTMLElement | null = null;
let onProgressChangeCb: ((summary: Ta56MasterySummary) => void) | null = null;
let onShowToastCb: ((msg: string, type?: string) => void) | null = null;
let uiState: Ta56UiState | null = null;

function esc(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadProgress(): Ta56Progress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        completedConnectivity: parsed?.completedConnectivity || {},
        completedIoe: parsed?.completedIoe || {},
        completedComms: parsed?.completedComms || {},
        completedTradeoffs: parsed?.completedTradeoffs || {},
      };
    }
  } catch {
    // Ignore storage access errors
  }
  return {
    completedConnectivity: {},
    completedIoe: {},
    completedComms: {},
    completedTradeoffs: {},
  };
}

function saveProgress(progress: Ta56Progress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage access errors
  }
  if (onProgressChangeCb) {
    onProgressChangeCb(computeTa56MasterySummary(progress));
  }
}

export function getTa56MasterySummary(): Ta56MasterySummary {
  const prog = uiState ? uiState.progress : loadProgress();
  return computeTa56MasterySummary(prog);
}

function createInitialState(initialTab: Ta56BuilderTab = 'connectivity'): Ta56UiState {
  return {
    activeTab: initialTab,
    activeSpecId: 'nfc',
    connChallengeId: CONNECTIVITY_CHALLENGES[0].id,
    connSelectedTech: {},
    connSelectedReason: {},
    connResults: {},
    connValidationMsg: null,
    ioeBlueprintId: IOE_SYSTEM_BLUEPRINTS[0].id,
    ioeSelections: {},
    ioeResults: {},
    ioeValidationMsg: null,
    commsId: COMMS_CHALLENGES[0].id,
    commsSelectedChannel: {},
    commsSelectedDetail: {},
    commsResults: {},
    commsValidationMsg: null,
    tradeoffId: TRADEOFF_CHALLENGES[0].id,
    tradeoffSelectedRisk: {},
    tradeoffSelectedMitigation: {},
    tradeoffResults: {},
    tradeoffValidationMsg: null,
    progress: loadProgress(),
  };
}

function renderConnectivityTab(): string {
  if (!uiState) return '';
  const activeSpec =
    CONNECTIVITY_SPECS.find((s) => s.id === uiState!.activeSpecId) || CONNECTIVITY_SPECS[0];
  const challenge =
    CONNECTIVITY_CHALLENGES.find((c) => c.id === uiState!.connChallengeId) ||
    CONNECTIVITY_CHALLENGES[0];
  const activeIdx = CONNECTIVITY_CHALLENGES.findIndex((c) => c.id === challenge.id);
  const selectedTech = uiState.connSelectedTech[challenge.id] || '';
  const selectedReason = uiState.connSelectedReason[challenge.id] || '';
  const result = uiState.connResults[challenge.id] || null;

  const specTabsHtml = CONNECTIVITY_SPECS.map((spec) => {
    const active = spec.id === activeSpec.id;
    return `
      <button type="button" data-ta56-action="select-spec" data-spec="${spec.id}"
        aria-pressed="${active ? 'true' : 'false'}"
        class="px-3 py-2.5 rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          active
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
        }">
        <div class="text-xs font-bold whitespace-nowrap">${esc(spec.shortName)}</div>
        <div class="text-[11px] mt-0.5 tabular-nums ${active ? 'text-slate-300' : 'text-slate-500'} whitespace-nowrap">${esc(spec.typicalRange)}</div>
      </button>
    `;
  }).join('');

  const connShortLabels: Record<string, string> = {
    'conn-1': 'Gym Turnstile',
    'conn-2': 'Heart-Rate Band',
    'conn-3': 'Exam Room LAN',
    'conn-4': 'Courier Tracking',
    'conn-5': 'Office Wi-Fi',
    'conn-6': 'Highland Farm',
  };

  const challengeStripHtml = CONNECTIVITY_CHALLENGES.map((item, idx) => {
    const isActive = item.id === challenge.id;
    const isDone = Boolean(uiState!.progress.completedConnectivity[item.id]);
    const shortName = connShortLabels[item.id] || item.title;
    return `
      <button type="button" data-ta56-action="select-conn" data-id="${esc(item.id)}"
        class="px-3 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          isActive
            ? 'bg-slate-900 text-white border-slate-900'
            : isDone
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        }">
        <span>Case ${idx + 1}: ${esc(shortName)}</span>
        ${isDone ? '<i class="fa-solid fa-circle-check text-emerald-500 text-[11px]" aria-hidden="true"></i>' : ''}
      </button>
    `;
  }).join('');

  const techChoicesHtml = CONNECTIVITY_SPECS.map((spec) => {
    const selected = selectedTech === spec.id;
    let cls = selected
      ? 'border-indigo-500 bg-indigo-50 text-indigo-950'
      : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50';
    if (result) {
      if (spec.id === challenge.correctTechId) {
        cls = 'border-emerald-500 bg-emerald-50 text-emerald-950';
      } else if (selected) {
        cls = 'border-rose-400 bg-rose-50 text-rose-950';
      }
    }
    return `
      <button type="button" data-ta56-action="choose-conn-tech" data-tech="${spec.id}"
        aria-pressed="${selected ? 'true' : 'false'}"
        class="w-full text-left px-3.5 py-2.5 rounded-xl border ${cls} transition-colors flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
        <span class="text-xs font-semibold">${esc(spec.name)}</span>
        <span class="text-[11px] text-slate-500 tabular-nums shrink-0">${esc(spec.typicalRange)}</span>
      </button>
    `;
  }).join('');

  const reasonChoicesHtml = challenge.reasonOptions
    .map((opt) => {
      const selected = selectedReason === opt.id;
      let cls = selected
        ? 'border-indigo-500 bg-indigo-50 text-indigo-950'
        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50';
      if (result) {
        if (opt.id === challenge.correctReasonId) {
          cls = 'border-emerald-500 bg-emerald-50 text-emerald-950';
        } else if (selected) {
          cls = 'border-rose-400 bg-rose-50 text-rose-950';
        }
      }
      return `
        <button type="button" data-ta56-action="choose-conn-reason" data-reason-id="${esc(opt.id)}"
          aria-pressed="${selected ? 'true' : 'false'}"
          class="w-full text-left px-3.5 py-3 rounded-xl border ${cls} text-xs font-medium leading-relaxed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          ${esc(opt.label)}
        </button>
      `;
    })
    .join('');

  const feedbackHtml = result
    ? `
      <div class="p-4 rounded-xl border ${
        result.isMastered
          ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
          : result.marksEarned === 1
            ? 'border-amber-300 bg-amber-50 text-amber-950'
            : 'border-rose-300 bg-rose-50 text-rose-950'
      } space-y-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="text-sm font-bold flex items-center gap-2">
            <i class="fa-solid ${result.isMastered ? 'fa-circle-check text-emerald-600' : 'fa-triangle-exclamation text-amber-600'}" aria-hidden="true"></i>
            <span>${esc(result.feedbackTitle)}</span>
          </div>
          <span class="text-xs font-semibold tabular-nums">Best Fit: ${esc(result.correctTechName)}</span>
        </div>
        <p class="text-xs leading-relaxed"><strong>OCR Examiner Note:</strong> ${esc(result.examinerNote)}</p>
        ${
          activeIdx < CONNECTIVITY_CHALLENGES.length - 1
            ? `<div class="pt-1 flex justify-end"><button type="button" data-ta56-action="select-conn" data-id="${esc(CONNECTIVITY_CHALLENGES[activeIdx + 1].id)}" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors">Next Connectivity Case →</button></div>`
            : ''
        }
      </div>
    `
    : '';

  return `
    <div class="space-y-6">
      <!-- Interactive TA5 Connectivity Reference Comparator -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-sm font-bold text-slate-900">TA5 Connectivity Technology Comparator</h2>
            <p class="text-xs text-slate-500 mt-0.5">Select any standard to compare range, bandwidth, power profile, and OCR exam watchouts.</p>
          </div>
          <span class="text-xs font-medium text-slate-500">6 OCR R050 Standards</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2" role="group" aria-label="Connectivity technology comparator">
          ${specTabsHtml}
        </div>

        <div class="bg-slate-50 rounded-xl border border-slate-200 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="lg:col-span-5 space-y-1.5">
            <h3 class="text-sm font-bold text-slate-900">${esc(activeSpec.name)}</h3>
            <p class="text-xs text-slate-600 leading-relaxed"><strong>Best For:</strong> ${esc(activeSpec.bestFor)}</p>
          </div>
          <div class="lg:col-span-4 grid grid-cols-3 gap-2 text-xs tabular-nums">
            <div class="bg-white rounded-lg border border-slate-200 p-2.5">
              <div class="text-[11px] text-slate-500">Range</div>
              <div class="font-bold text-slate-900 mt-0.5 leading-snug">${esc(activeSpec.typicalRange)}</div>
            </div>
            <div class="bg-white rounded-lg border border-slate-200 p-2.5">
              <div class="text-[11px] text-slate-500">Speed</div>
              <div class="font-bold text-slate-900 mt-0.5 leading-snug">${esc(activeSpec.bandwidth.split(' ')[0])}</div>
            </div>
            <div class="bg-white rounded-lg border border-slate-200 p-2.5">
              <div class="text-[11px] text-slate-500">Power</div>
              <div class="font-bold text-slate-900 mt-0.5 leading-snug">${esc(activeSpec.powerUsage.split(' ')[0])}</div>
            </div>
          </div>
          <div class="lg:col-span-3 text-xs text-slate-700 leading-relaxed lg:border-l lg:border-slate-200 lg:pl-4">
            <strong class="text-indigo-700">Exam Watchout:</strong> ${esc(activeSpec.examWatchout)}
          </div>
        </div>
      </div>

      <!-- Connectivity Scenario Matcher -->
      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Connectivity scenario challenges">
          ${challengeStripHtml}
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
          <div class="space-y-2">
            <div class="text-xs font-semibold text-indigo-700 tabular-nums">
              Case ${activeIdx + 1} of ${CONNECTIVITY_CHALLENGES.length} · ${esc(challenge.contextTag)} · 2 Marks
            </div>
            <h3 class="text-lg font-bold text-slate-900">${esc(challenge.title)}</h3>
            <p class="text-sm text-slate-700 leading-relaxed">${esc(challenge.scenario)}</p>
            <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600 pt-1">
              <strong class="text-slate-800">Requirements:</strong>
              ${challenge.constraints.map((c, idx) => `${idx > 0 ? '<span aria-hidden="true" class="text-slate-300">·</span>' : ''}<span>${esc(c)}</span>`).join('')}
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div class="space-y-2">
              <div class="text-xs font-bold text-slate-800">1. Choose the Most Suitable Connectivity Technology (+1 Mark)</div>
              <div class="space-y-2">${techChoicesHtml}</div>
            </div>
            <div class="space-y-2">
              <div class="text-xs font-bold text-slate-800">2. Choose the Exam-Ready Technical Justification (+1 Mark)</div>
              <div class="space-y-2">${reasonChoicesHtml}</div>
            </div>
          </div>

          ${
            uiState.connValidationMsg
              ? `<p class="text-xs font-semibold text-rose-700">${esc(uiState.connValidationMsg)}</p>`
              : ''
          }

          <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" data-ta56-action="reset-conn" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors">
              Reset Case
            </button>
            <button type="button" data-ta56-action="check-conn" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              Check Connectivity Verdict
            </button>
          </div>

          ${feedbackHtml}
        </div>
      </div>
    </div>
  `;
}

function buildIoePipelineSvg(
  blueprint: (typeof IOE_SYSTEM_BLUEPRINTS)[number],
  selections: Partial<Record<IoeStageKey, string>>,
  result: IoeBuildEvaluation | null
): string {
  const stageKeys: IoeStageKey[] = ['sensor', 'network', 'process', 'actuator'];
  const xs = [20, 235, 450, 665];
  const nodeW = 195;
  const nodeH = 120;
  const nodeY = 34;

  const arrowColor =
    result?.pipelineStatus === 'operational'
      ? '#059669'
      : result?.pipelineStatus === 'degraded'
        ? '#d97706'
        : '#64748b';

  const arrowsSvg = [0, 1, 2]
    .map((i) => {
      const x1 = xs[i] + nodeW + 2;
      const x2 = xs[i + 1] - 8;
      const midY = nodeY + nodeH / 2;
      return `
        <line x1="${x1}" y1="${midY}" x2="${x2}" y2="${midY}" stroke="${arrowColor}" stroke-width="2.5" ${
          result?.pipelineStatus === 'operational' ? '' : 'stroke-dasharray="5 4"'
        } />
        <polygon points="${x2 + 6},${midY} ${x2 - 2},${midY - 5} ${x2 - 2},${midY + 5}" fill="${arrowColor}" />
      `;
    })
    .join('');

  const nodesSvg = stageKeys
    .map((key, i) => {
      const cfg = blueprint.stages[key];
      const selId = selections[key] || '';
      const selOpt = cfg.options.find((o) => o.id === selId);
      const evalItem = result?.stageResults.find((r) => r.stage === key) || null;

      let stroke = '#cbd5e1';
      let fill = '#ffffff';
      let statusLabel = selOpt ? 'Wired' : 'Empty Slot';
      let statusFill = selOpt ? '#4338ca' : '#64748b';

      if (evalItem) {
        if (evalItem.isCorrect) {
          stroke = '#10b981';
          fill = '#ecfdf5';
          statusLabel = 'Verified ✓';
          statusFill = '#047857';
        } else {
          stroke = '#f43f5e';
          fill = '#fff1f2';
          statusLabel = 'Mismatch ✕';
          statusFill = '#be123c';
        }
      } else if (selOpt) {
        stroke = '#6366f1';
        fill = '#eef2ff';
      }

      const displayName = selOpt ? selOpt.shortLabel : 'Select below...';
      const x = xs[i];

      return `
        <g>
          <rect x="${x}" y="${nodeY}" width="${nodeW}" height="${nodeH}" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="2" />
          <text x="${x + 14}" y="${nodeY + 24}" font-size="11" font-weight="700" fill="#475569">${esc(cfg.stageLabel)}</text>
          <text x="${x + nodeW - 14}" y="${nodeY + 24}" text-anchor="end" font-size="11" font-weight="700" fill="#0369a1">${esc(cfg.pillarName)}</text>
          <line x1="${x + 14}" y1="${nodeY + 34}" x2="${x + nodeW - 14}" y2="${nodeY + 34}" stroke="#e2e8f0" stroke-width="1" />
          <text x="${x + 14}" y="${nodeY + 64}" font-size="13" font-weight="700" fill="#0f172a">${esc(displayName.slice(0, 22))}</text>
          <text x="${x + 14}" y="${nodeY + 100}" font-size="11" font-weight="700" fill="${statusFill}">${esc(statusLabel)}</text>
        </g>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 880 180" class="w-full h-auto" role="img" aria-label="Interactive four-stage IoE system pipeline diagram showing Things, Data, Process, and People">
      <rect x="0" y="0" width="880" height="180" rx="14" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />
      <text x="20" y="22" font-size="11" font-weight="700" fill="#475569">LIVE IOE DATA-FLOW PIPELINE (THINGS → DATA → PROCESS → PEOPLE)</text>
      ${arrowsSvg}
      ${nodesSvg}
    </svg>
  `;
}

function renderIoeBuilderTab(): string {
  if (!uiState) return '';
  const blueprint =
    IOE_SYSTEM_BLUEPRINTS.find((b) => b.id === uiState!.ioeBlueprintId) ||
    IOE_SYSTEM_BLUEPRINTS[0];
  const activeIdx = IOE_SYSTEM_BLUEPRINTS.findIndex((b) => b.id === blueprint.id);
  const selections = uiState.ioeSelections[blueprint.id] || {};
  const result = uiState.ioeResults[blueprint.id] || null;
  const stageKeys: IoeStageKey[] = ['sensor', 'network', 'process', 'actuator'];

  const ioeShortLabels: Record<string, string> = {
    'ioe-1': 'Smart Greenhouse',
    'ioe-2': 'Fall Monitor',
    'ioe-3': 'Cold-Chain Depot',
    'ioe-4': 'Smart Heating',
    'ioe-5': 'Smart Traffic',
    'ioe-6': 'Connected Gym',
  };

  const blueprintStripHtml = IOE_SYSTEM_BLUEPRINTS.map((item, idx) => {
    const isActive = item.id === blueprint.id;
    const isDone = Boolean(uiState!.progress.completedIoe[item.id]);
    const shortName = ioeShortLabels[item.id] || item.title;
    return `
      <button type="button" data-ta56-action="select-ioe" data-id="${esc(item.id)}"
        class="px-3 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          isActive
            ? 'bg-slate-900 text-white border-slate-900'
            : isDone
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        }">
        <span>System ${idx + 1}: ${esc(shortName)}</span>
        ${isDone ? '<i class="fa-solid fa-circle-check text-emerald-500 text-[11px]" aria-hidden="true"></i>' : ''}
      </button>
    `;
  }).join('');

  const wiredCount = stageKeys.filter((k) => Boolean(selections[k])).length;

  const stageDeckHtml = stageKeys
    .map((key) => {
      const cfg = blueprint.stages[key];
      const chosenId = selections[key] || '';
      const evalItem = result?.stageResults.find((r) => r.stage === key) || null;

      const optionsHtml = cfg.options
        .map((opt) => {
          const isSelected = chosenId === opt.id;
          let cls = isSelected
            ? 'border-indigo-500 bg-indigo-50 text-indigo-950'
            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50';
          if (result) {
            if (opt.id === cfg.correctOptionId) {
              cls = 'border-emerald-500 bg-emerald-50 text-emerald-950';
            } else if (isSelected) {
              cls = 'border-rose-400 bg-rose-50 text-rose-950';
            }
          }
          return `
            <button type="button" data-ta56-action="choose-ioe-stage" data-stage="${key}" data-opt-id="${esc(opt.id)}"
              aria-pressed="${isSelected ? 'true' : 'false'}"
              class="w-full text-left p-3 rounded-xl border ${cls} transition-colors space-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <div class="text-xs font-bold text-slate-900">${esc(opt.label)}</div>
              <div class="text-[11px] text-slate-600 leading-relaxed">${esc(opt.detail)}</div>
            </button>
          `;
        })
        .join('');

      return `
        <div class="bg-slate-50/70 rounded-xl border border-slate-200 p-4 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div>
              <div class="text-xs font-bold text-slate-900">${esc(cfg.stageLabel)}</div>
              <div class="text-[11px] text-slate-500">${esc(cfg.prompt)}</div>
            </div>
            <span class="text-xs font-bold text-sky-700 whitespace-nowrap">Pillar: ${esc(cfg.pillarName)}</span>
          </div>
          <div class="space-y-2">${optionsHtml}</div>
          ${
            evalItem && !evalItem.isCorrect
              ? `<p class="text-[11px] font-semibold text-rose-700">Expected for ${esc(cfg.pillarName)}: ${esc(evalItem.correctLabel)}</p>`
              : ''
          }
        </div>
      `;
    })
    .join('');

  const feedbackHtml = result
    ? `
      <div class="p-4 rounded-xl border ${
        result.isMastered
          ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
          : result.pipelineStatus === 'degraded'
            ? 'border-amber-300 bg-amber-50 text-amber-950'
            : 'border-rose-300 bg-rose-50 text-rose-950'
      } space-y-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="text-sm font-bold flex items-center gap-2">
            <i class="fa-solid ${result.isMastered ? 'fa-circle-check text-emerald-600' : 'fa-triangle-exclamation text-amber-600'}" aria-hidden="true"></i>
            <span>${esc(result.feedbackTitle)}</span>
          </div>
          <span class="text-xs font-bold tabular-nums">${result.marksEarned} / ${result.maxMarks} Marks</span>
        </div>
        <p class="text-xs leading-relaxed"><strong>OCR TA6 Summary:</strong> ${esc(result.examinerSummary)}</p>
        ${
          activeIdx < IOE_SYSTEM_BLUEPRINTS.length - 1
            ? `<div class="pt-1 flex justify-end"><button type="button" data-ta56-action="select-ioe" data-id="${esc(IOE_SYSTEM_BLUEPRINTS[activeIdx + 1].id)}" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors">Next IoE System →</button></div>`
            : ''
        }
      </div>
    `
    : '';

  return `
    <div class="space-y-5">
      <div class="flex flex-wrap items-center gap-2" role="group" aria-label="IoE system build blueprints">
        ${blueprintStripHtml}
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
        <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div class="space-y-1.5">
            <div class="text-xs font-semibold text-sky-700 tabular-nums">
              System ${activeIdx + 1} of ${IOE_SYSTEM_BLUEPRINTS.length} · ${esc(blueprint.domain)} · 4 Marks
            </div>
            <h2 class="text-lg font-bold text-slate-900">${esc(blueprint.title)}</h2>
            <p class="text-sm text-slate-700 leading-relaxed max-w-3xl">${esc(blueprint.scenario)}</p>
          </div>
          <div class="text-xs font-semibold text-slate-600 tabular-nums shrink-0">
            Wired: <strong class="text-slate-900">${wiredCount} / 4 Stages</strong>
          </div>
        </div>

        <!-- Live SVG Pipeline Canvas -->
        <div class="overflow-x-auto">
          <div class="min-w-[640px]">
            ${buildIoePipelineSvg(blueprint, selections, result)}
          </div>
        </div>

        <div class="text-xs text-slate-600">
          <strong class="text-slate-800">Target Outcome:</strong> ${esc(blueprint.goalOutcome)}
        </div>

        <!-- 4-Pillar Component Wiring Deck -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          ${stageDeckHtml}
        </div>

        ${
          uiState.ioeValidationMsg
            ? `<p class="text-xs font-semibold text-rose-700">${esc(uiState.ioeValidationMsg)}</p>`
            : ''
        }

        <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" data-ta56-action="reset-ioe" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors">
            Reset Wiring
          </button>
          <button type="button" data-ta56-action="check-ioe" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            Test IoE Pipeline
          </button>
        </div>

        ${feedbackHtml}
      </div>
    </div>
  `;
}

function renderCommsTab(): string {
  if (!uiState) return '';
  const challenge =
    COMMS_CHALLENGES.find((c) => c.id === uiState!.commsId) || COMMS_CHALLENGES[0];
  const activeIdx = COMMS_CHALLENGES.findIndex((c) => c.id === challenge.id);
  const chosenChannel = uiState.commsSelectedChannel[challenge.id] || '';
  const chosenDetail = uiState.commsSelectedDetail[challenge.id] || '';
  const result = uiState.commsResults[challenge.id] || null;

  const stripHtml = COMMS_CHALLENGES.map((item, idx) => {
    const isActive = item.id === challenge.id;
    const isDone = Boolean(uiState!.progress.completedComms[item.id]);
    return `
      <button type="button" data-ta56-action="select-comms" data-id="${esc(item.id)}"
        class="px-3 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          isActive
            ? 'bg-slate-900 text-white border-slate-900'
            : isDone
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        }">
        <span>Brief ${idx + 1}</span>
        ${isDone ? '<i class="fa-solid fa-circle-check text-emerald-500 text-[11px]" aria-hidden="true"></i>' : ''}
      </button>
    `;
  }).join('');

  const chOptsHtml = challenge.channelOptions
    .map((opt) => {
      const selected = chosenChannel === opt.id;
      let cls = selected
        ? 'border-indigo-500 bg-indigo-50 text-indigo-950'
        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50';
      if (result) {
        if (opt.id === challenge.correctChannelId) {
          cls = 'border-emerald-500 bg-emerald-50 text-emerald-950';
        } else if (selected) {
          cls = 'border-rose-400 bg-rose-50 text-rose-950';
        }
      }
      return `
        <button type="button" data-ta56-action="choose-comms-channel" data-opt-id="${esc(opt.id)}"
          aria-pressed="${selected ? 'true' : 'false'}"
          class="w-full text-left px-3.5 py-3 rounded-xl border ${cls} text-xs font-medium leading-relaxed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          ${esc(opt.label)}
        </button>
      `;
    })
    .join('');

  const detOptsHtml = challenge.detailOptions
    .map((opt) => {
      const selected = chosenDetail === opt.id;
      let cls = selected
        ? 'border-indigo-500 bg-indigo-50 text-indigo-950'
        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50';
      if (result) {
        if (opt.id === challenge.correctDetailId) {
          cls = 'border-emerald-500 bg-emerald-50 text-emerald-950';
        } else if (selected) {
          cls = 'border-rose-400 bg-rose-50 text-rose-950';
        }
      }
      return `
        <button type="button" data-ta56-action="choose-comms-detail" data-opt-id="${esc(opt.id)}"
          aria-pressed="${selected ? 'true' : 'false'}"
          class="w-full text-left px-3.5 py-3 rounded-xl border ${cls} text-xs font-medium leading-relaxed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          ${esc(opt.label)}
        </button>
      `;
    })
    .join('');

  const feedbackHtml = result
    ? `
      <div class="p-4 rounded-xl border ${
        result.isMastered
          ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
          : result.marksEarned === 1
            ? 'border-amber-300 bg-amber-50 text-amber-950'
            : 'border-rose-300 bg-rose-50 text-rose-950'
      } space-y-2.5">
        <div class="text-sm font-bold flex items-center gap-2">
          <i class="fa-solid ${result.isMastered ? 'fa-circle-check text-emerald-600' : 'fa-triangle-exclamation text-amber-600'}" aria-hidden="true"></i>
          <span>${esc(result.feedbackTitle)}</span>
        </div>
        <p class="text-xs leading-relaxed"><strong>OCR Examiner Note:</strong> ${esc(result.examinerNote)}</p>
        ${
          activeIdx < COMMS_CHALLENGES.length - 1
            ? `<div class="pt-1 flex justify-end"><button type="button" data-ta56-action="select-comms" data-id="${esc(COMMS_CHALLENGES[activeIdx + 1].id)}" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors">Next Comms Brief →</button></div>`
            : ''
        }
      </div>
    `
    : '';

  return `
    <div class="space-y-5">
      <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Digital communications briefs">
        ${stripHtml}
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
        <div class="space-y-1.5">
          <div class="text-xs font-semibold text-indigo-700 tabular-nums">
            Brief ${activeIdx + 1} of ${COMMS_CHALLENGES.length} · ${esc(challenge.specRef)} · 2 Marks
          </div>
          <h2 class="text-lg font-bold text-slate-900">${esc(challenge.title)}</h2>
          <p class="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2">
            ${esc(challenge.scenario)}
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div class="space-y-2">
            <div class="text-xs font-bold text-slate-800">${esc(challenge.promptQuestion)}</div>
            <div class="space-y-2">${chOptsHtml}</div>
          </div>
          <div class="space-y-2">
            <div class="text-xs font-bold text-slate-800">${esc(challenge.detailPrompt)}</div>
            <div class="space-y-2">${detOptsHtml}</div>
          </div>
        </div>

        ${
          uiState.commsValidationMsg
            ? `<p class="text-xs font-semibold text-rose-700">${esc(uiState.commsValidationMsg)}</p>`
            : ''
        }

        <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" data-ta56-action="reset-comms" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors">
            Reset Brief
          </button>
          <button type="button" data-ta56-action="check-comms" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            Check Comms Answer
          </button>
        </div>

        ${feedbackHtml}
      </div>
    </div>
  `;
}

function renderTradeoffsTab(): string {
  if (!uiState) return '';
  const challenge =
    TRADEOFF_CHALLENGES.find((t) => t.id === uiState!.tradeoffId) || TRADEOFF_CHALLENGES[0];
  const activeIdx = TRADEOFF_CHALLENGES.findIndex((t) => t.id === challenge.id);
  const chosenRisk = uiState.tradeoffSelectedRisk[challenge.id] || '';
  const chosenMit = uiState.tradeoffSelectedMitigation[challenge.id] || '';
  const result = uiState.tradeoffResults[challenge.id] || null;

  const stripHtml = TRADEOFF_CHALLENGES.map((item, idx) => {
    const isActive = item.id === challenge.id;
    const isDone = Boolean(uiState!.progress.completedTradeoffs[item.id]);
    return `
      <button type="button" data-ta56-action="select-tradeoff" data-id="${esc(item.id)}"
        class="px-3 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          isActive
            ? 'bg-slate-900 text-white border-slate-900'
            : isDone
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        }">
        <span>Audit ${idx + 1}: ${esc(item.topicTag)}</span>
        ${isDone ? '<i class="fa-solid fa-circle-check text-emerald-500 text-[11px]" aria-hidden="true"></i>' : ''}
      </button>
    `;
  }).join('');

  const readingsHtml = challenge.telemetryReadings
    .map((r) => {
      const severityMeta =
        r.severity === 'critical'
          ? { cls: 'border-rose-200 bg-rose-50/70 text-rose-900', icon: 'fa-circle-xmark text-rose-600', label: 'Critical' }
          : r.severity === 'warning'
            ? { cls: 'border-amber-200 bg-amber-50/70 text-amber-900', icon: 'fa-triangle-exclamation text-amber-600', label: 'Warning' }
            : { cls: 'border-emerald-200 bg-emerald-50/70 text-emerald-900', icon: 'fa-circle-check text-emerald-600', label: 'Nominal' };
      return `
        <div class="rounded-xl border ${severityMeta.cls} p-3.5 space-y-1 tabular-nums">
          <div class="flex items-center justify-between gap-2 text-[11px] font-semibold">
            <span>${esc(r.label)}</span>
            <span class="flex items-center gap-1">
              <i class="fa-solid ${severityMeta.icon}" aria-hidden="true"></i>
              <span>${severityMeta.label}</span>
            </span>
          </div>
          <div class="text-sm font-bold">${esc(r.value)}</div>
        </div>
      `;
    })
    .join('');

  const riskOptsHtml = challenge.riskOptions
    .map((opt) => {
      const selected = chosenRisk === opt.id;
      let cls = selected
        ? 'border-indigo-500 bg-indigo-50 text-indigo-950'
        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50';
      if (result) {
        if (opt.id === challenge.correctRiskId) {
          cls = 'border-emerald-500 bg-emerald-50 text-emerald-950';
        } else if (selected) {
          cls = 'border-rose-400 bg-rose-50 text-rose-950';
        }
      }
      return `
        <button type="button" data-ta56-action="choose-to-risk" data-opt-id="${esc(opt.id)}"
          aria-pressed="${selected ? 'true' : 'false'}"
          class="w-full text-left px-3.5 py-3 rounded-xl border ${cls} text-xs font-medium leading-relaxed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          ${esc(opt.label)}
        </button>
      `;
    })
    .join('');

  const mitOptsHtml = challenge.mitigationOptions
    .map((opt) => {
      const selected = chosenMit === opt.id;
      let cls = selected
        ? 'border-indigo-500 bg-indigo-50 text-indigo-950'
        : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50';
      if (result) {
        if (opt.id === challenge.correctMitigationId) {
          cls = 'border-emerald-500 bg-emerald-50 text-emerald-950';
        } else if (selected) {
          cls = 'border-rose-400 bg-rose-50 text-rose-950';
        }
      }
      return `
        <button type="button" data-ta56-action="choose-to-mitigation" data-opt-id="${esc(opt.id)}"
          aria-pressed="${selected ? 'true' : 'false'}"
          class="w-full text-left px-3.5 py-3 rounded-xl border ${cls} text-xs font-medium leading-relaxed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          ${esc(opt.label)}
        </button>
      `;
    })
    .join('');

  const feedbackHtml = result
    ? `
      <div class="p-4 rounded-xl border ${
        result.isMastered
          ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
          : result.marksEarned === 1
            ? 'border-amber-300 bg-amber-50 text-amber-950'
            : 'border-rose-300 bg-rose-50 text-rose-950'
      } space-y-2.5">
        <div class="text-sm font-bold flex items-center gap-2">
          <i class="fa-solid ${result.isMastered ? 'fa-circle-check text-emerald-600' : 'fa-triangle-exclamation text-amber-600'}" aria-hidden="true"></i>
          <span>${esc(result.feedbackTitle)}</span>
        </div>
        <p class="text-xs leading-relaxed"><strong>OCR Examiner Note:</strong> ${esc(result.examinerNote)}</p>
        ${
          activeIdx < TRADEOFF_CHALLENGES.length - 1
            ? `<div class="pt-1 flex justify-end"><button type="button" data-ta56-action="select-tradeoff" data-id="${esc(TRADEOFF_CHALLENGES[activeIdx + 1].id)}" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors">Next Stress-Test →</button></div>`
            : ''
        }
      </div>
    `
    : '';

  return `
    <div class="space-y-5">
      <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Reliability and trade-off audits">
        ${stripHtml}
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
        <div class="space-y-1.5">
          <div class="text-xs font-semibold text-indigo-700 tabular-nums">
            Stress-Test ${activeIdx + 1} of ${TRADEOFF_CHALLENGES.length} · ${esc(challenge.topicTag)} · ${esc(challenge.systemName)} · 2 Marks
          </div>
          <h2 class="text-lg font-bold text-slate-900">${esc(challenge.title)}</h2>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          ${readingsHtml}
        </div>

        <p class="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-4">
          ${esc(challenge.scenario)}
        </p>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div class="space-y-2">
            <div class="text-xs font-bold text-slate-800">1. Diagnose the Primary Risk / Limitation (+1 Mark)</div>
            <div class="space-y-2">${riskOptsHtml}</div>
          </div>
          <div class="space-y-2">
            <div class="text-xs font-bold text-slate-800">2. Recommend the Strongest Engineering or Ethical Mitigation (+1 Mark)</div>
            <div class="space-y-2">${mitOptsHtml}</div>
          </div>
        </div>

        ${
          uiState.tradeoffValidationMsg
            ? `<p class="text-xs font-semibold text-rose-700">${esc(uiState.tradeoffValidationMsg)}</p>`
            : ''
        }

        <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" data-ta56-action="reset-tradeoff" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors">
            Reset Audit
          </button>
          <button type="button" data-ta56-action="check-tradeoff" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            Verify System Audit
          </button>
        </div>

        ${feedbackHtml}
      </div>
    </div>
  `;
}

function renderWorkspace(): void {
  if (!containerEl || !uiState) return;
  const summary = computeTa56MasterySummary(uiState.progress);

  const tabs: { id: Ta56BuilderTab; label: string; icon: string; iconCls: string; count: string }[] = [
    {
      id: 'connectivity',
      label: 'Connectivity Matcher',
      icon: 'fa-wifi',
      iconCls: 'text-indigo-500',
      count: `${summary.byMode.connectivity.done}/${summary.byMode.connectivity.total}`,
    },
    {
      id: 'ioe',
      label: 'IoE System Builder',
      icon: 'fa-microchip',
      iconCls: 'text-sky-500',
      count: `${summary.byMode.ioe.done}/${summary.byMode.ioe.total}`,
    },
    {
      id: 'comms',
      label: 'Digital Comms Studio',
      icon: 'fa-tower-broadcast',
      iconCls: 'text-emerald-500',
      count: `${summary.byMode.comms.done}/${summary.byMode.comms.total}`,
    },
    {
      id: 'tradeoffs',
      label: 'Reliability & Trade-Offs',
      icon: 'fa-gauge-high',
      iconCls: 'text-amber-500',
      count: `${summary.byMode.tradeoffs.done}/${summary.byMode.tradeoffs.total}`,
    },
  ];

  const tabsHtml = tabs
    .map((t) => {
      const active = uiState!.activeTab === t.id;
      return `
        <button type="button" role="tab" aria-selected="${active ? 'true' : 'false'}"
          data-ta56-action="switch-tab" data-tab="${t.id}"
          class="px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-colors flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            active
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }">
          <span class="flex items-center gap-2 min-w-0">
            <i class="fa-solid ${t.icon} ${active ? 'text-sky-300' : t.iconCls} text-xs shrink-0" aria-hidden="true"></i>
            <span class="truncate">${esc(t.label)}</span>
          </span>
          <span class="font-mono tabular-nums text-[11px] shrink-0 ${active ? 'text-slate-300' : 'text-slate-500'}">${t.count}</span>
        </button>
      `;
    })
    .join('');

  let activeContentHtml = '';
  if (uiState.activeTab === 'connectivity') activeContentHtml = renderConnectivityTab();
  else if (uiState.activeTab === 'ioe') activeContentHtml = renderIoeBuilderTab();
  else if (uiState.activeTab === 'comms') activeContentHtml = renderCommsTab();
  else activeContentHtml = renderTradeoffsTab();

  containerEl.innerHTML = `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500 tabular-nums">
            <button type="button" data-ta56-action="go-home" class="hover:text-slate-900 transition-colors font-semibold">Home</button>
            <span aria-hidden="true">/</span>
            <span class="text-indigo-700 font-semibold">TA5 &amp; TA6 Connectivity &amp; IoE Builder</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
            TA5 &amp; TA6 Connectivity &amp; IoE System Builder
          </h1>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <div class="text-left md:text-right tabular-nums">
            <div class="text-xs font-bold text-slate-900">${summary.completedChallenges} of ${summary.totalChallenges} Mastered (${summary.masteryPct}%)</div>
            <div class="w-40 h-2 bg-slate-200 rounded-full overflow-hidden mt-1.5">
              <div class="h-full bg-indigo-600 rounded-full transition-all" style="width: ${summary.masteryPct}%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4-Mode Responsive Tab Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5" role="tablist" aria-label="TA5 and TA6 Connectivity and IoE System Builder modes">
        ${tabsHtml}
      </div>

      ${activeContentHtml}
    </div>
  `;

  bindEvents();
}

function bindEvents(): void {
  if (!containerEl || !uiState) return;

  containerEl.querySelectorAll<HTMLElement>('[data-ta56-action]').forEach((el) => {
    el.addEventListener('click', () => {
      if (!uiState) return;
      const action = el.dataset.ta56Action;

      if (action === 'go-home') {
        const w = window as unknown as { returnToHomeScreen?: () => void };
        if (typeof w.returnToHomeScreen === 'function') w.returnToHomeScreen();
        return;
      }

      if (action === 'switch-tab') {
        const tab = el.dataset.tab as Ta56BuilderTab | undefined;
        if (tab) {
          uiState.activeTab = tab;
          renderWorkspace();
        }
        return;
      }

      // --- Tab 1: Connectivity ---
      if (action === 'select-spec') {
        const spec = el.dataset.spec as ConnectivityTechId | undefined;
        if (spec) {
          uiState.activeSpecId = spec;
          renderWorkspace();
        }
        return;
      }

      if (action === 'select-conn') {
        const id = el.dataset.id;
        if (id) {
          uiState.connChallengeId = id;
          uiState.connValidationMsg = null;
          renderWorkspace();
        }
        return;
      }

      if (action === 'choose-conn-tech') {
        const tech = el.dataset.tech as ConnectivityTechId | undefined;
        const cid = uiState.connChallengeId;
        if (tech) {
          uiState.connSelectedTech[cid] = tech;
          uiState.connResults[cid] = null;
          uiState.connValidationMsg = null;
          renderWorkspace();
        }
        return;
      }

      if (action === 'choose-conn-reason') {
        const rid = el.dataset.reasonId || '';
        const cid = uiState.connChallengeId;
        uiState.connSelectedReason[cid] = rid;
        uiState.connResults[cid] = null;
        uiState.connValidationMsg = null;
        renderWorkspace();
        return;
      }

      if (action === 'reset-conn') {
        const cid = uiState.connChallengeId;
        uiState.connSelectedTech[cid] = '';
        uiState.connSelectedReason[cid] = '';
        uiState.connResults[cid] = null;
        uiState.connValidationMsg = null;
        renderWorkspace();
        return;
      }

      if (action === 'check-conn') {
        const cid = uiState.connChallengeId;
        const ch = CONNECTIVITY_CHALLENGES.find((c) => c.id === cid);
        if (!ch) return;
        const selTech = uiState.connSelectedTech[cid] || '';
        const selReason = uiState.connSelectedReason[cid] || '';
        if (!selTech || !selReason) {
          uiState.connValidationMsg = 'Choose both a connectivity technology and a technical justification before checking.';
          renderWorkspace();
          return;
        }
        const evalRes = evaluateConnectivityChallenge(ch, selTech, selReason);
        uiState.connResults[cid] = evalRes;
        uiState.connValidationMsg = null;
        if (evalRes.isMastered) {
          uiState.progress.completedConnectivity[cid] = true;
          saveProgress(uiState.progress);
          if (onShowToastCb) onShowToastCb('Connectivity challenge mastered (+2/2 marks)!', 'success');
        }
        renderWorkspace();
        return;
      }

      // --- Tab 2: IoE System Builder ---
      if (action === 'select-ioe') {
        const id = el.dataset.id;
        if (id) {
          uiState.ioeBlueprintId = id;
          uiState.ioeValidationMsg = null;
          renderWorkspace();
        }
        return;
      }

      if (action === 'choose-ioe-stage') {
        const stage = el.dataset.stage as IoeStageKey | undefined;
        const optId = el.dataset.optId || '';
        const bid = uiState.ioeBlueprintId;
        if (stage) {
          uiState.ioeSelections[bid] = {
            ...(uiState.ioeSelections[bid] || {}),
            [stage]: optId,
          };
          uiState.ioeResults[bid] = null;
          uiState.ioeValidationMsg = null;
          renderWorkspace();
        }
        return;
      }

      if (action === 'reset-ioe') {
        const bid = uiState.ioeBlueprintId;
        uiState.ioeSelections[bid] = {};
        uiState.ioeResults[bid] = null;
        uiState.ioeValidationMsg = null;
        renderWorkspace();
        return;
      }

      if (action === 'check-ioe') {
        const bid = uiState.ioeBlueprintId;
        const bp = IOE_SYSTEM_BLUEPRINTS.find((b) => b.id === bid);
        if (!bp) return;
        const sels = uiState.ioeSelections[bid] || {};
        if (!sels.sensor || !sels.network || !sels.process || !sels.actuator) {
          uiState.ioeValidationMsg = 'Wire all 4 IoE pipeline stages (Sensor, Network, Process, and Actuator) before testing.';
          renderWorkspace();
          return;
        }
        const evalRes = evaluateIoeBuild(bp, sels);
        uiState.ioeResults[bid] = evalRes;
        uiState.ioeValidationMsg = null;
        if (evalRes.isMastered) {
          uiState.progress.completedIoe[bid] = true;
          saveProgress(uiState.progress);
          if (onShowToastCb) onShowToastCb('IoE 4-pillar system mastered (+4/4 marks)!', 'success');
        }
        renderWorkspace();
        return;
      }

      // --- Tab 3: Digital Comms ---
      if (action === 'select-comms') {
        const id = el.dataset.id;
        if (id) {
          uiState.commsId = id;
          uiState.commsValidationMsg = null;
          renderWorkspace();
        }
        return;
      }

      if (action === 'choose-comms-channel') {
        const optId = el.dataset.optId || '';
        const cid = uiState.commsId;
        uiState.commsSelectedChannel[cid] = optId;
        uiState.commsResults[cid] = null;
        uiState.commsValidationMsg = null;
        renderWorkspace();
        return;
      }

      if (action === 'choose-comms-detail') {
        const optId = el.dataset.optId || '';
        const cid = uiState.commsId;
        uiState.commsSelectedDetail[cid] = optId;
        uiState.commsResults[cid] = null;
        uiState.commsValidationMsg = null;
        renderWorkspace();
        return;
      }

      if (action === 'reset-comms') {
        const cid = uiState.commsId;
        uiState.commsSelectedChannel[cid] = '';
        uiState.commsSelectedDetail[cid] = '';
        uiState.commsResults[cid] = null;
        uiState.commsValidationMsg = null;
        renderWorkspace();
        return;
      }

      if (action === 'check-comms') {
        const cid = uiState.commsId;
        const ch = COMMS_CHALLENGES.find((c) => c.id === cid);
        if (!ch) return;
        const sel1 = uiState.commsSelectedChannel[cid] || '';
        const sel2 = uiState.commsSelectedDetail[cid] || '';
        if (!sel1 || !sel2) {
          uiState.commsValidationMsg = 'Answer both parts of the communications brief before checking.';
          renderWorkspace();
          return;
        }
        const evalRes = evaluateCommsChallenge(ch, sel1, sel2);
        uiState.commsResults[cid] = evalRes;
        uiState.commsValidationMsg = null;
        if (evalRes.isMastered) {
          uiState.progress.completedComms[cid] = true;
          saveProgress(uiState.progress);
          if (onShowToastCb) onShowToastCb('Digital comms brief mastered (+2/2 marks)!', 'success');
        }
        renderWorkspace();
        return;
      }

      // --- Tab 4: Reliability & Trade-Offs ---
      if (action === 'select-tradeoff') {
        const id = el.dataset.id;
        if (id) {
          uiState.tradeoffId = id;
          uiState.tradeoffValidationMsg = null;
          renderWorkspace();
        }
        return;
      }

      if (action === 'choose-to-risk') {
        const optId = el.dataset.optId || '';
        const tid = uiState.tradeoffId;
        uiState.tradeoffSelectedRisk[tid] = optId;
        uiState.tradeoffResults[tid] = null;
        uiState.tradeoffValidationMsg = null;
        renderWorkspace();
        return;
      }

      if (action === 'choose-to-mitigation') {
        const optId = el.dataset.optId || '';
        const tid = uiState.tradeoffId;
        uiState.tradeoffSelectedMitigation[tid] = optId;
        uiState.tradeoffResults[tid] = null;
        uiState.tradeoffValidationMsg = null;
        renderWorkspace();
        return;
      }

      if (action === 'reset-tradeoff') {
        const tid = uiState.tradeoffId;
        uiState.tradeoffSelectedRisk[tid] = '';
        uiState.tradeoffSelectedMitigation[tid] = '';
        uiState.tradeoffResults[tid] = null;
        uiState.tradeoffValidationMsg = null;
        renderWorkspace();
        return;
      }

      if (action === 'check-tradeoff') {
        const tid = uiState.tradeoffId;
        const ch = TRADEOFF_CHALLENGES.find((t) => t.id === tid);
        if (!ch) return;
        const selRisk = uiState.tradeoffSelectedRisk[tid] || '';
        const selMit = uiState.tradeoffSelectedMitigation[tid] || '';
        if (!selRisk || !selMit) {
          uiState.tradeoffValidationMsg = 'Select both the primary risk and the recommended mitigation before verifying.';
          renderWorkspace();
          return;
        }
        const evalRes = evaluateTradeoffChallenge(ch, selRisk, selMit);
        uiState.tradeoffResults[tid] = evalRes;
        uiState.tradeoffValidationMsg = null;
        if (evalRes.isMastered) {
          uiState.progress.completedTradeoffs[tid] = true;
          saveProgress(uiState.progress);
          if (onShowToastCb) onShowToastCb('System stress-test mastered (+2/2 marks)!', 'success');
        }
        renderWorkspace();
      }
    });
  });
}

export function initTa56SystemBuilder(
  container: HTMLElement,
  options: Ta56InitOptions = {}
): void {
  containerEl = container;
  onProgressChangeCb = options.onProgressChange || null;
  onShowToastCb = options.onShowToast || null;

  if (!uiState) {
    uiState = createInitialState(options.initialTab || 'connectivity');
  } else {
    uiState.progress = loadProgress();
    if (options.initialTab) {
      uiState.activeTab = options.initialTab;
    }
  }

  renderWorkspace();
  if (onProgressChangeCb) {
    onProgressChangeCb(computeTa56MasterySummary(uiState.progress));
  }
}

export function setTa56BuilderTab(tab: Ta56BuilderTab): void {
  if (!uiState) return;
  uiState.activeTab = tab;
  renderWorkspace();
}
