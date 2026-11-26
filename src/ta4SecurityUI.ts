import {
  THREAT_CLASSIFICATION_LABELS,
  THREAT_INSPECTOR_CASES,
  LAYERED_DEFENCE_SCENARIOS,
  UK_LAW_GUIDES,
  LEGISLATION_CASES,
  INCIDENT_CHALLENGES,
  evaluateThreatInspectorCase,
  evaluateLayeredDefence,
  evaluateLegislationCase,
  evaluateIncidentChallenge,
  computeTa4MasterySummary,
  type ThreatClassification,
  type ThreatInspectorEvaluation,
  type LayeredDefenceEvaluation,
  type UkLawActId,
  type LegislationEvaluation,
  type IncidentEvaluation,
  type Ta4LabProgress,
  type Ta4LabMasterySummary,
} from './ta4SecurityEngine';

const STORAGE_KEY = 'OCR_R050_TA4_SECURITY_LAB_V1';

export type Ta4LabTab = 'inspector' | 'defence' | 'legislation' | 'incident';

export interface Ta4LabInitOptions {
  initialTab?: Ta4LabTab;
  onProgressChange?: (summary: Ta4LabMasterySummary) => void;
  onShowToast?: (msg: string, type?: string) => void;
}

interface Ta4LabUiState {
  activeTab: Ta4LabTab;
  // Tab 1: Threat Inspector
  inspectorCaseId: string;
  inspectorSelectedClues: Record<string, string[]>;
  inspectorSelectedClass: Record<string, ThreatClassification | ''>;
  inspectorResults: Record<string, ThreatInspectorEvaluation | null>;
  inspectorValidationMsg: string | null;
  // Tab 2: Layered Defence Builder
  defenceScenarioId: string;
  defenceSelectedControls: Record<string, string[]>;
  defenceResults: Record<string, LayeredDefenceEvaluation | null>;
  defenceValidationMsg: string | null;
  // Tab 3: UK Legislation Courtroom
  activeLawGuideId: UkLawActId;
  lawCaseId: string;
  lawSelectedAct: Record<string, UkLawActId | ''>;
  lawSelectedClause: Record<string, string>;
  lawResults: Record<string, LegislationEvaluation | null>;
  lawValidationMsg: string | null;
  // Tab 4: Incident Response & Controls
  incidentId: string;
  incidentOrders: Record<string, string[]>;
  incidentDecisions: Record<string, string>;
  incidentResults: Record<string, IncidentEvaluation | null>;
  incidentValidationMsg: string | null;
  // Persisted mastery
  progress: Ta4LabProgress;
}

let containerEl: HTMLElement | null = null;
let onProgressChangeCb: ((summary: Ta4LabMasterySummary) => void) | null = null;
let onShowToastCb: ((msg: string, type?: string) => void) | null = null;
let uiState: Ta4LabUiState | null = null;

function esc(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadProgress(): Ta4LabProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        completedInspector: parsed?.completedInspector || {},
        completedDefence: parsed?.completedDefence || {},
        completedLegislation: parsed?.completedLegislation || {},
        completedIncident: parsed?.completedIncident || {},
      };
    }
  } catch {
    // Ignore storage errors
  }
  return {
    completedInspector: {},
    completedDefence: {},
    completedLegislation: {},
    completedIncident: {},
  };
}

function saveProgress(progress: Ta4LabProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage errors
  }
  if (onProgressChangeCb) {
    onProgressChangeCb(computeTa4MasterySummary(progress));
  }
}

export function getTa4LabMasterySummary(): Ta4LabMasterySummary {
  const prog = uiState ? uiState.progress : loadProgress();
  return computeTa4MasterySummary(prog);
}

function buildInitialIncidentOrders(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const ch of INCIDENT_CHALLENGES) {
    if (ch.kind === 'order') {
      map[ch.id] = [...ch.initialOrderIds];
    }
  }
  return map;
}

function createInitialState(initialTab: Ta4LabTab = 'inspector'): Ta4LabUiState {
  return {
    activeTab: initialTab,
    inspectorCaseId: THREAT_INSPECTOR_CASES[0].id,
    inspectorSelectedClues: {},
    inspectorSelectedClass: {},
    inspectorResults: {},
    inspectorValidationMsg: null,
    defenceScenarioId: LAYERED_DEFENCE_SCENARIOS[0].id,
    defenceSelectedControls: {},
    defenceResults: {},
    defenceValidationMsg: null,
    activeLawGuideId: 'dpa-2018',
    lawCaseId: LEGISLATION_CASES[0].id,
    lawSelectedAct: {},
    lawSelectedClause: {},
    lawResults: {},
    lawValidationMsg: null,
    incidentId: INCIDENT_CHALLENGES[0].id,
    incidentOrders: buildInitialIncidentOrders(),
    incidentDecisions: {},
    incidentResults: {},
    incidentValidationMsg: null,
    progress: loadProgress(),
  };
}

function renderInspectorTab(): string {
  if (!uiState) return '';
  const activeCase = THREAT_INSPECTOR_CASES.find((c) => c.id === uiState!.inspectorCaseId) || THREAT_INSPECTOR_CASES[0];
  const selectedClues = uiState.inspectorSelectedClues[activeCase.id] || [];
  const selectedClass = uiState.inspectorSelectedClass[activeCase.id] || '';
  const result = uiState.inspectorResults[activeCase.id] || null;
  const activeIdx = THREAT_INSPECTOR_CASES.findIndex((c) => c.id === activeCase.id);

  const caseStripHtml = THREAT_INSPECTOR_CASES.map((item, idx) => {
    const isActive = item.id === activeCase.id;
    const isDone = Boolean(uiState!.progress.completedInspector[item.id]);
    return `
      <button type="button" data-ta4-action="select-inspector" data-id="${esc(item.id)}"
        class="px-3 py-2 text-xs font-semibold rounded-xl border transition-colors text-left flex items-center justify-between gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          isActive
            ? 'bg-slate-900 text-white border-slate-900'
            : isDone
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        }">
        <span>Case ${idx + 1}: ${esc(item.title.split(' ').slice(0, 2).join(' '))}</span>
        ${isDone ? '<i class="fa-solid fa-circle-check text-emerald-500 text-[11px]" aria-hidden="true"></i>' : ''}
      </button>
    `;
  }).join('');

  const artifactIcon =
    activeCase.artifactType === 'email'
      ? 'fa-envelope-open-text'
      : activeCase.artifactType === 'call'
        ? 'fa-phone-volume'
        : activeCase.artifactType === 'browser'
          ? 'fa-globe'
          : 'fa-laptop';

  const cluesHtml = activeCase.clues
    .map((clue) => {
      const isSelected = selectedClues.includes(clue.id);
      let cardCls = isSelected
        ? 'bg-rose-50 border-rose-400 text-slate-900'
        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800';
      let badgeHtml = isSelected
        ? '<span class="text-xs font-bold text-rose-700 shrink-0"><i class="fa-solid fa-flag mr-1" aria-hidden="true"></i>Flagged Red Flag</span>'
        : '<span class="text-xs font-medium text-slate-500 shrink-0">Click to flag</span>';

      if (result) {
        if (clue.isRedFlag && isSelected) {
          cardCls = 'bg-emerald-50 border-emerald-400 text-slate-900';
          badgeHtml = '<span class="text-xs font-bold text-emerald-700 shrink-0"><i class="fa-solid fa-circle-check mr-1" aria-hidden="true"></i>Correct Red Flag</span>';
        } else if (clue.isRedFlag && !isSelected) {
          cardCls = 'bg-amber-50 border-amber-400 text-slate-900';
          badgeHtml = '<span class="text-xs font-bold text-amber-800 shrink-0"><i class="fa-solid fa-triangle-exclamation mr-1" aria-hidden="true"></i>Missed Red Flag</span>';
        } else if (!clue.isRedFlag && isSelected) {
          cardCls = 'bg-rose-50 border-rose-400 text-slate-900';
          badgeHtml = '<span class="text-xs font-bold text-rose-700 shrink-0"><i class="fa-solid fa-circle-xmark mr-1" aria-hidden="true"></i>False Alarm (Safe)</span>';
        } else {
          cardCls = 'bg-slate-50 border-slate-200 text-slate-600';
          badgeHtml = '<span class="text-xs font-semibold text-slate-500 shrink-0">Safe Detail</span>';
        }
      }

      return `
        <button type="button"
          data-ta4-action="toggle-clue"
          data-clue-id="${esc(clue.id)}"
          aria-pressed="${isSelected ? 'true' : 'false'}"
          class="w-full text-left p-4 rounded-xl border ${cardCls} transition-colors space-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs font-bold text-indigo-700">${esc(clue.zoneLabel)}</span>
            ${badgeHtml}
          </div>
          <p class="text-sm font-medium leading-relaxed text-slate-900">${esc(clue.displayText)}</p>
          ${
            result
              ? `<p class="text-xs text-slate-600 pt-1.5 border-t border-slate-200/70 leading-relaxed"><strong class="text-slate-800">Examiner Note:</strong> ${esc(clue.explanation)}</p>`
              : ''
          }
        </button>
      `;
    })
    .join('');

  const classOptionsHtml = (Object.keys(THREAT_CLASSIFICATION_LABELS) as ThreatClassification[])
    .map((key) => {
      const checked = selectedClass === key;
      let optCls = checked
        ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-semibold'
        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700';
      if (result) {
        if (key === activeCase.expectedClassification) {
          optCls = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
        } else if (checked && key !== activeCase.expectedClassification) {
          optCls = 'bg-rose-50 border-rose-300 text-rose-900';
        }
      }
      return `
        <button type="button" data-ta4-action="select-threat-class" data-class="${key}" aria-pressed="${checked ? 'true' : 'false'}"
          class="w-full text-left px-3.5 py-2.5 rounded-xl border ${optCls} text-xs transition-colors flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          <span>${esc(THREAT_CLASSIFICATION_LABELS[key])}</span>
          ${checked ? '<i class="fa-solid fa-circle-dot text-indigo-600 shrink-0" aria-hidden="true"></i>' : '<i class="fa-regular fa-circle text-slate-300 shrink-0" aria-hidden="true"></i>'}
        </button>
      `;
    })
    .join('');

  const resultHtml = result
    ? `
      <div class="rounded-xl border ${result.isMastered ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'} p-4 space-y-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-sm font-bold ${result.isMastered ? 'text-emerald-900' : 'text-amber-950'}">
            <i class="fa-solid ${result.isMastered ? 'fa-circle-check text-emerald-600' : 'fa-circle-exclamation text-amber-600'} mr-1.5" aria-hidden="true"></i>
            ${esc(result.feedbackHeadline)}
          </span>
          <span class="text-xs font-extrabold tabular-nums text-slate-800">${result.marksEarned} / ${result.maxMarks} Marks</span>
        </div>
        <div class="text-xs text-slate-700 tabular-nums">
          Classification: <strong>${result.classificationCorrect ? 'Correct (+1)' : `Expected ${THREAT_CLASSIFICATION_LABELS[activeCase.expectedClassification]}`}</strong>
          · Red flags caught: <strong>${result.truePositives.length}</strong>
          · Missed: <strong>${result.missedFlags.length}</strong>
          · False alarms: <strong>${result.falsePositives.length}</strong>
        </div>
        <p class="text-xs text-slate-700 leading-relaxed">
          <strong class="text-slate-900">OCR Examiner Summary:</strong> ${esc(result.examinerNote)}
        </p>
        ${
          activeIdx + 1 < THREAT_INSPECTOR_CASES.length
            ? `<div class="pt-1 flex justify-end"><button type="button" data-ta4-action="select-inspector" data-id="${esc(THREAT_INSPECTOR_CASES[activeIdx + 1].id)}" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors">Next Threat Case →</button></div>`
            : ''
        }
      </div>
    `
    : '';

  return `
    <div class="space-y-5">
      <!-- Case Selector -->
      <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Threat Inspector cases">
        ${caseStripHtml}
      </div>

      <!-- Two-Zone Inspection Stage & Verdict Deck -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Left 7 cols: Interactive Artifact Inspector -->
        <div class="lg:col-span-7 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div class="px-5 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2.5 min-w-0">
              <i class="fa-solid ${artifactIcon} text-indigo-400 text-sm shrink-0" aria-hidden="true"></i>
              <div class="min-w-0">
                <div class="text-xs font-bold text-white truncate">${esc(activeCase.artifactMeta.headerTitle)}</div>
                <div class="text-[11px] font-mono text-slate-300 truncate">${esc(activeCase.artifactMeta.fromOrUrl)}</div>
              </div>
            </div>
            <span class="text-[11px] text-slate-400 font-medium whitespace-nowrap">${esc(activeCase.artifactMeta.contextNote)}</span>
          </div>

          <div class="p-5 sm:p-6 space-y-4">
            <div class="space-y-1">
              <h2 class="text-base sm:text-lg font-bold text-slate-900">${esc(activeCase.title)}</h2>
              <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">${esc(activeCase.scenarioIntro)}</p>
            </div>

            <div class="space-y-3" role="group" aria-label="Inspectable clues inside artifact">
              ${cluesHtml}
            </div>
          </div>
        </div>

        <!-- Right 5 cols: Verdict & Classification Controls -->
        <div class="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
          <div class="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <h3 class="text-sm font-bold text-slate-900">Step 2: Classify the Threat</h3>
            <span class="text-xs font-semibold text-slate-500 tabular-nums">${selectedClues.length} flagged</span>
          </div>

          <div class="space-y-2" role="group" aria-label="Choose OCR threat classification">
            ${classOptionsHtml}
          </div>

          ${
            uiState.inspectorValidationMsg
              ? `<p class="text-xs font-semibold text-rose-700">${esc(uiState.inspectorValidationMsg)}</p>`
              : ''
          }

          <div class="flex flex-wrap items-center gap-2.5">
            <button type="button" data-ta4-action="check-inspector" class="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              Check Threat Verdict
            </button>
            <button type="button" data-ta4-action="reset-inspector" class="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl border border-slate-200 transition-colors whitespace-nowrap">
              Reset
            </button>
          </div>

          ${resultHtml}
        </div>
      </div>
    </div>
  `;
}

function renderDefenceTab(): string {
  if (!uiState) return '';
  const scenario =
    LAYERED_DEFENCE_SCENARIOS.find((s) => s.id === uiState!.defenceScenarioId) || LAYERED_DEFENCE_SCENARIOS[0];
  const selectedIds = uiState.defenceSelectedControls[scenario.id] || [];
  const result = uiState.defenceResults[scenario.id] || null;
  const activeIdx = LAYERED_DEFENCE_SCENARIOS.findIndex((s) => s.id === scenario.id);

  const scenarioStripHtml = LAYERED_DEFENCE_SCENARIOS.map((item, idx) => {
    const isActive = item.id === scenario.id;
    const isDone = Boolean(uiState!.progress.completedDefence[item.id]);
    return `
      <button type="button" data-ta4-action="select-defence" data-id="${esc(item.id)}"
        class="px-3 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          isActive
            ? 'bg-slate-900 text-white border-slate-900'
            : isDone
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        }">
        <span>Mission ${idx + 1}: ${esc(item.organisation.split(' ')[0])}</span>
        ${isDone ? '<i class="fa-solid fa-circle-check text-emerald-500 text-[11px]" aria-hidden="true"></i>' : ''}
      </button>
    `;
  }).join('');

  const optionsHtml = scenario.controlOptions
    .map((opt) => {
      const isSelected = selectedIds.includes(opt.id);
      const isReq = scenario.requiredControlIds.includes(opt.id);
      let cls = isSelected
        ? 'bg-indigo-50 border-indigo-400 text-slate-900'
        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800';
      let marker = isSelected
        ? '<span class="text-xs font-bold text-indigo-700 shrink-0"><i class="fa-solid fa-shield-halved mr-1" aria-hidden="true"></i>Selected</span>'
        : '<span class="text-xs text-slate-400 shrink-0">Select</span>';

      if (result) {
        if (isSelected && isReq) {
          cls = 'bg-emerald-50 border-emerald-400 text-slate-900';
          marker = '<span class="text-xs font-bold text-emerald-700 shrink-0"><i class="fa-solid fa-circle-check mr-1" aria-hidden="true"></i>Effective (+1)</span>';
        } else if (isSelected && !isReq) {
          cls = 'bg-rose-50 border-rose-400 text-slate-900';
          marker = '<span class="text-xs font-bold text-rose-700 shrink-0"><i class="fa-solid fa-circle-xmark mr-1" aria-hidden="true"></i>Ineffective</span>';
        } else if (!isSelected && isReq) {
          cls = 'bg-amber-50 border-amber-300 text-slate-900';
          marker = '<span class="text-xs font-bold text-amber-800 shrink-0"><i class="fa-solid fa-triangle-exclamation mr-1" aria-hidden="true"></i>Missing Layer</span>';
        }
      }

      const distractorReason = result && isSelected && !isReq ? scenario.distractorReasons[opt.id] : null;

      return `
        <button type="button" data-ta4-action="toggle-defence-control" data-control-id="${esc(opt.id)}" aria-pressed="${isSelected ? 'true' : 'false'}"
          class="text-left p-4 rounded-xl border ${cls} transition-colors flex flex-col justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          <div class="space-y-1">
            <div class="flex items-start justify-between gap-2">
              <span class="text-xs font-semibold text-slate-500">${esc(opt.layer)}</span>
              ${marker}
            </div>
            <div class="text-sm font-bold text-slate-900 leading-snug">${esc(opt.label)}</div>
            <p class="text-xs text-slate-600 leading-relaxed">${esc(opt.shortDetail)}</p>
          </div>
          ${
            distractorReason
              ? `<p class="text-xs font-medium text-rose-800 pt-2 border-t border-rose-200">${esc(distractorReason)}</p>`
              : ''
          }
        </button>
      `;
    })
    .join('');

  const simBannerHtml = result
    ? `
      <div class="rounded-2xl border ${
        result.outcome === 'blocked'
          ? 'bg-emerald-50 border-emerald-200'
          : result.outcome === 'partial'
            ? 'bg-amber-50 border-amber-200'
            : 'bg-rose-50 border-rose-200'
      } p-5 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="text-sm font-bold ${
            result.outcome === 'blocked'
              ? 'text-emerald-900'
              : result.outcome === 'partial'
                ? 'text-amber-950'
                : 'text-rose-900'
          }">
            <i class="fa-solid ${
              result.outcome === 'blocked'
                ? 'fa-shield-check text-emerald-600'
                : result.outcome === 'partial'
                  ? 'fa-triangle-exclamation text-amber-600'
                  : 'fa-burst text-rose-600'
            } mr-1.5" aria-hidden="true"></i>
            ${esc(result.outcomeLabel)}
          </div>
          <span class="text-sm font-extrabold tabular-nums text-slate-900">${result.marksEarned} / ${result.maxMarks} Controls Optimal (${result.resistancePct}%)</span>
        </div>
        <div class="w-full h-2 bg-white/80 rounded-full overflow-hidden border border-slate-200">
          <div class="${result.outcome === 'blocked' ? 'bg-emerald-500' : result.outcome === 'partial' ? 'bg-amber-500' : 'bg-rose-500'} h-full transition-all duration-300" style="width: ${result.resistancePct}%"></div>
        </div>
        <p class="text-xs sm:text-sm text-slate-700 leading-relaxed">
          <strong class="text-slate-900">OCR Defence-in-Depth Takeaway:</strong> ${esc(result.examinerTakeaway)}
        </p>
        ${
          activeIdx + 1 < LAYERED_DEFENCE_SCENARIOS.length
            ? `<div class="flex justify-end"><button type="button" data-ta4-action="select-defence" data-id="${esc(LAYERED_DEFENCE_SCENARIOS[activeIdx + 1].id)}" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors">Next Defence Mission →</button></div>`
            : ''
        }
      </div>
    `
    : '';

  return `
    <div class="space-y-5">
      <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Layered defence scenarios">
        ${scenarioStripHtml}
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
        <div class="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div class="space-y-1.5 max-w-3xl">
            <div class="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span class="font-bold text-indigo-700">${esc(scenario.organisation)}</span>
              <span aria-hidden="true">·</span>
              <span class="font-semibold text-rose-700">Threat Vector: ${esc(scenario.attackName)}</span>
            </div>
            <h2 class="text-lg sm:text-xl font-bold text-slate-900">${esc(scenario.title)}</h2>
            <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">${esc(scenario.brief)}</p>
          </div>

          <div class="shrink-0 text-left md:text-right">
            <div class="text-xs font-medium text-slate-500">Selected Layers</div>
            <div class="text-xl font-extrabold tabular-nums ${selectedIds.length === 3 ? 'text-indigo-700' : 'text-slate-900'}">${selectedIds.length} / 3</div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5" role="group" aria-label="Available security controls">
          ${optionsHtml}
        </div>

        ${
          uiState.defenceValidationMsg
            ? `<p class="text-xs font-semibold text-rose-700">${esc(uiState.defenceValidationMsg)}</p>`
            : ''
        }

        <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <span class="text-xs text-slate-500">Choose exactly 3 controls that combine prevention, mitigation, and recovery.</span>
          <div class="flex items-center gap-2">
            <button type="button" data-ta4-action="reset-defence" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors whitespace-nowrap">
              Clear Stack
            </button>
            <button type="button" data-ta4-action="check-defence" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              Deploy &amp; Test Defences
            </button>
          </div>
        </div>

        ${simBannerHtml}
      </div>
    </div>
  `;
}

function renderLegislationTab(): string {
  if (!uiState) return '';
  const activeGuide = UK_LAW_GUIDES.find((g) => g.id === uiState!.activeLawGuideId) || UK_LAW_GUIDES[0];
  const lawCase = LEGISLATION_CASES.find((c) => c.id === uiState!.lawCaseId) || LEGISLATION_CASES[0];
  const chosenAct = uiState.lawSelectedAct[lawCase.id] || '';
  const chosenClause = uiState.lawSelectedClause[lawCase.id] || '';
  const result = uiState.lawResults[lawCase.id] || null;
  const activeIdx = LEGISLATION_CASES.findIndex((c) => c.id === lawCase.id);

  const actGuideButtonsHtml = UK_LAW_GUIDES.map((g) => {
    const active = g.id === activeGuide.id;
    return `
      <button type="button" data-ta4-action="select-law-guide" data-act="${g.id}"
        class="px-3.5 py-2.5 rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          active
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
        }">
        <div class="text-xs font-bold">${esc(g.shortName)}</div>
        <div class="text-[11px] mt-0.5 ${active ? 'text-slate-300' : 'text-slate-500'} line-clamp-1">${esc(g.focusArea)}</div>
      </button>
    `;
  }).join('');

  const caseButtonsHtml = LEGISLATION_CASES.map((c, idx) => {
    const isActive = c.id === lawCase.id;
    const isDone = Boolean(uiState!.progress.completedLegislation[c.id]);
    return `
      <button type="button" data-ta4-action="select-law-case" data-id="${esc(c.id)}"
        class="px-3 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          isActive
            ? 'bg-slate-900 text-white border-slate-900'
            : isDone
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        }">
        <span>Case ${idx + 1}</span>
        ${isDone ? '<i class="fa-solid fa-circle-check text-emerald-500 text-[11px]" aria-hidden="true"></i>' : ''}
      </button>
    `;
  }).join('');

  const actChoiceHtml = UK_LAW_GUIDES.map((g) => {
    const selected = chosenAct === g.id;
    let cls = selected
      ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-semibold'
      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800';
    if (result) {
      if (g.id === lawCase.correctActId) cls = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
      else if (selected) cls = 'bg-rose-50 border-rose-300 text-rose-900';
    }
    return `
      <button type="button" data-ta4-action="choose-law-act" data-act="${g.id}" aria-pressed="${selected ? 'true' : 'false'}"
        class="px-3.5 py-2.5 rounded-xl border ${cls} text-xs text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
        ${esc(g.fullName)}
      </button>
    `;
  }).join('');

  const clauseChoiceHtml = lawCase.clauseOptions
    .map((cl) => {
      const selected = chosenClause === cl.id;
      let cls = selected
        ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-semibold'
        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800';
      if (result) {
        if (cl.id === lawCase.correctClauseId) cls = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
        else if (selected) cls = 'bg-rose-50 border-rose-300 text-rose-900';
      }
      return `
        <button type="button" data-ta4-action="choose-law-clause" data-clause-id="${esc(cl.id)}" aria-pressed="${selected ? 'true' : 'false'}"
          class="w-full px-3.5 py-2.5 rounded-xl border ${cls} text-xs text-left leading-relaxed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          ${esc(cl.label)}
        </button>
      `;
    })
    .join('');

  return `
    <div class="space-y-6">
      <!-- Interactive UK IT Legislation Quick-Reference Deck -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="text-sm font-bold text-slate-900">UK IT Legislation Reference Bar (Click any Act to revise)</h2>
          <span class="text-xs text-slate-500">4 Core OCR R050 Statutes</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          ${actGuideButtonsHtml}
        </div>

        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="lg:col-span-8 space-y-2">
            <div class="text-sm font-bold text-slate-900">${esc(activeGuide.fullName)}</div>
            <ul class="space-y-1 text-xs text-slate-700 list-disc pl-4">
              ${activeGuide.keyClauses.map((c) => `<li>${esc(c)}</li>`).join('')}
            </ul>
          </div>
          <div class="lg:col-span-4 space-y-2 text-xs border-t lg:border-t-0 lg:border-l border-slate-200 pt-3 lg:pt-0 lg:pl-4">
            <div><span class="font-bold text-slate-900">Penalties:</span> <span class="text-slate-600">${esc(activeGuide.penalties)}</span></div>
            <div><span class="font-bold text-indigo-700">Exam Tip:</span> <span class="text-slate-700">${esc(activeGuide.examTip)}</span></div>
          </div>
        </div>
      </div>

      <!-- Courtroom Case Verdict Stage -->
      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-2" role="group" aria-label="UK Legislation cases">
          ${caseButtonsHtml}
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
          <div class="space-y-1.5 pb-4 border-b border-slate-100">
            <div class="text-xs font-semibold text-indigo-700">Case ${activeIdx + 1} of ${LEGISLATION_CASES.length} · 2-Mark Legal Verdict</div>
            <h3 class="text-lg font-bold text-slate-900">${esc(lawCase.title)}</h3>
            <p class="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2">${esc(lawCase.scenario)}</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="space-y-2.5">
              <div class="text-xs font-bold text-slate-800">1. Which UK Act has been breached? (+1 Mark)</div>
              <div class="grid grid-cols-1 gap-2" role="group" aria-label="Select UK Act">
                ${actChoiceHtml}
              </div>
            </div>

            <div class="space-y-2.5">
              <div class="text-xs font-bold text-slate-800">2. Which specific legal principle or offence applies? (+1 Mark)</div>
              <div class="space-y-2" role="group" aria-label="Select legal clause or offence">
                ${clauseChoiceHtml}
              </div>
            </div>
          </div>

          ${
            uiState.lawValidationMsg
              ? `<p class="text-xs font-semibold text-rose-700">${esc(uiState.lawValidationMsg)}</p>`
              : ''
          }

          <div class="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button type="button" data-ta4-action="reset-law" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors">
              Clear Verdict
            </button>
            <button type="button" data-ta4-action="check-law" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              Submit Legal Verdict
            </button>
          </div>

          ${
            result
              ? `
                <div class="rounded-xl border ${result.isMastered ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'} p-4 sm:p-5 space-y-2">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="text-sm font-bold ${result.isMastered ? 'text-emerald-900' : 'text-amber-950'}">
                      <i class="fa-solid ${result.isMastered ? 'fa-scale-balanced text-emerald-600' : 'fa-circle-exclamation text-amber-600'} mr-1.5" aria-hidden="true"></i>
                      ${result.isMastered ? 'Exact Legal Verdict — 2 / 2 Marks' : `Verdict Score: ${result.marksEarned} / ${result.maxMarks} Marks`}
                    </span>
                    <span class="text-xs font-semibold text-slate-700">Act: <strong>${esc(result.correctActFullName)}</strong></span>
                  </div>
                  <p class="text-xs sm:text-sm text-slate-700 leading-relaxed">${esc(result.examinerExplanation)}</p>
                  ${
                    activeIdx + 1 < LEGISLATION_CASES.length
                      ? `<div class="pt-1 flex justify-end"><button type="button" data-ta4-action="select-law-case" data-id="${esc(LEGISLATION_CASES[activeIdx + 1].id)}" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors">Next Legal Case →</button></div>`
                      : ''
                  }
                </div>
              `
              : ''
          }
        </div>
      </div>
    </div>
  `;
}

function renderIncidentTab(): string {
  if (!uiState) return '';
  const challenge = INCIDENT_CHALLENGES.find((c) => c.id === uiState!.incidentId) || INCIDENT_CHALLENGES[0];
  const activeIdx = INCIDENT_CHALLENGES.findIndex((c) => c.id === challenge.id);
  const result = uiState.incidentResults[challenge.id] || null;

  const stripHtml = INCIDENT_CHALLENGES.map((item, idx) => {
    const isActive = item.id === challenge.id;
    const isDone = Boolean(uiState!.progress.completedIncident[item.id]);
    return `
      <button type="button" data-ta4-action="select-incident" data-id="${esc(item.id)}"
        class="px-3 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          isActive
            ? 'bg-slate-900 text-white border-slate-900'
            : isDone
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        }">
        <span>${item.kind === 'order' ? `Sequence ${idx + 1}` : `Control ${idx + 1}`}</span>
        ${isDone ? '<i class="fa-solid fa-circle-check text-emerald-500 text-[11px]" aria-hidden="true"></i>' : ''}
      </button>
    `;
  }).join('');

  let bodyStageHtml = '';
  if (challenge.kind === 'order') {
    const currentOrder = uiState.incidentOrders[challenge.id] || [...challenge.initialOrderIds];
    const stepMap = new Map(challenge.steps.map((s) => [s.id, s]));

    const rowsHtml = currentOrder
      .map((stepId, idx) => {
        const step = stepMap.get(stepId);
        if (!step) return '';
        const stepCorrect = result?.perStepCorrect ? result.perStepCorrect[stepId] : null;
        const rowCls =
          stepCorrect === true
            ? 'bg-emerald-50 border-emerald-300'
            : stepCorrect === false
              ? 'bg-rose-50 border-rose-300'
              : 'bg-white border-slate-200';
        return `
          <div class="p-4 rounded-xl border ${rowCls} flex items-center justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0">
              <span class="w-7 h-7 rounded-lg bg-slate-900 text-white text-xs font-mono font-bold flex items-center justify-center shrink-0 tabular-nums">${idx + 1}</span>
              <div class="min-w-0">
                <div class="text-sm font-bold text-slate-900">${esc(step.label)}</div>
                <p class="text-xs text-slate-600 mt-0.5 leading-relaxed">${esc(step.detail)}</p>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button type="button" data-ta4-action="move-step" data-idx="${idx}" data-dir="-1" ${idx === 0 ? 'disabled' : ''} aria-label="Move step ${idx + 1} up"
                class="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors disabled:opacity-35 disabled:cursor-not-allowed">
                <i class="fa-solid fa-arrow-up text-xs" aria-hidden="true"></i>
              </button>
              <button type="button" data-ta4-action="move-step" data-idx="${idx}" data-dir="1" ${idx === currentOrder.length - 1 ? 'disabled' : ''} aria-label="Move step ${idx + 1} down"
                class="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors disabled:opacity-35 disabled:cursor-not-allowed">
                <i class="fa-solid fa-arrow-down text-xs" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    bodyStageHtml = `
      <div class="space-y-2.5">${rowsHtml}</div>
      <div class="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
        <button type="button" data-ta4-action="reset-incident" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors">
          Reset Order
        </button>
        <button type="button" data-ta4-action="check-incident" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          Check Response Sequence
        </button>
      </div>
    `;
  } else {
    const chosenId = uiState.incidentDecisions[challenge.id] || '';
    const optionsHtml = challenge.options
      .map((opt) => {
        const selected = chosenId === opt.id;
        let cls = selected
          ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-semibold'
          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800';
        if (result) {
          if (opt.id === challenge.correctOptionId) cls = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
          else if (selected) cls = 'bg-rose-50 border-rose-300 text-rose-900';
        }
        return `
          <button type="button" data-ta4-action="choose-incident-option" data-opt-id="${esc(opt.id)}" aria-pressed="${selected ? 'true' : 'false'}"
            class="w-full text-left p-4 rounded-xl border ${cls} transition-colors space-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            <div class="text-[11px] font-bold text-slate-500">${esc(opt.controlCategory)}</div>
            <div class="text-sm leading-snug text-slate-900">${esc(opt.label)}</div>
          </button>
        `;
      })
      .join('');

    bodyStageHtml = `
      <div class="text-sm font-bold text-slate-900">${esc(challenge.question)}</div>
      <div class="grid grid-cols-1 gap-2.5">${optionsHtml}</div>
      ${
        uiState.incidentValidationMsg
          ? `<p class="text-xs font-semibold text-rose-700">${esc(uiState.incidentValidationMsg)}</p>`
          : ''
      }
      <div class="flex justify-end pt-2 border-t border-slate-100">
        <button type="button" data-ta4-action="check-incident" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          Check Security Control
        </button>
      </div>
    `;
  }

  return `
    <div class="space-y-5">
      <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Incident response challenges">
        ${stripHtml}
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
        <div class="space-y-1.5 pb-4 border-b border-slate-100">
          <div class="text-xs font-semibold text-indigo-700">
            ${challenge.kind === 'order' ? 'Incident Response Lifecycle Ordering' : 'Physical, Recovery & Ethical Security Verdict'}
          </div>
          <h2 class="text-lg font-bold text-slate-900">${esc(challenge.title)}</h2>
          <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">${esc(challenge.scenario)}</p>
        </div>

        ${bodyStageHtml}

        ${
          result
            ? `
              <div class="rounded-xl border ${result.isMastered ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'} p-4 sm:p-5 space-y-2">
                <div class="text-sm font-bold ${result.isMastered ? 'text-emerald-900' : 'text-amber-950'}">
                  <i class="fa-solid ${result.isMastered ? 'fa-circle-check text-emerald-600' : 'fa-circle-exclamation text-amber-600'} mr-1.5" aria-hidden="true"></i>
                  ${esc(result.headline)}
                </div>
                <p class="text-xs sm:text-sm text-slate-700 leading-relaxed">${esc(result.examinerRationale)}</p>
                ${
                  activeIdx + 1 < INCIDENT_CHALLENGES.length
                    ? `<div class="pt-1 flex justify-end"><button type="button" data-ta4-action="select-incident" data-id="${esc(INCIDENT_CHALLENGES[activeIdx + 1].id)}" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors">Next Challenge →</button></div>`
                    : ''
                }
              </div>
            `
            : ''
        }
      </div>
    </div>
  `;
}

function renderWorkspace(): void {
  if (!containerEl || !uiState) return;
  const summary = computeTa4MasterySummary(uiState.progress);

  const tabs: Array<{ id: Ta4LabTab; label: string; count: string; icon: string; iconCls: string }> = [
    { id: 'inspector', label: 'Threat & Phishing Inspector', count: `${summary.inspectorDone}/${summary.inspectorTotal}`, icon: 'fa-magnifying-glass-chart', iconCls: 'text-rose-600' },
    { id: 'defence', label: 'Layered Defence Builder', count: `${summary.defenceDone}/${summary.defenceTotal}`, icon: 'fa-shield-halved', iconCls: 'text-indigo-600' },
    { id: 'legislation', label: 'UK Legislation Courtroom', count: `${summary.legislationDone}/${summary.legislationTotal}`, icon: 'fa-scale-balanced', iconCls: 'text-amber-600' },
    { id: 'incident', label: 'Incident Response & Recovery', count: `${summary.incidentDone}/${summary.incidentTotal}`, icon: 'fa-list-ol', iconCls: 'text-emerald-600' },
  ];

  const tabsHtml = tabs
    .map((t) => {
      const active = uiState!.activeTab === t.id;
      return `
        <button type="button" role="tab" aria-selected="${active ? 'true' : 'false'}" data-ta4-action="switch-tab" data-tab="${t.id}"
          class="px-3.5 py-3 rounded-xl border text-left transition-colors flex items-center justify-between gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            active
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }">
          <span class="flex items-center gap-2 min-w-0">
            <i class="fa-solid ${t.icon} ${active ? 'text-indigo-300' : t.iconCls} text-xs shrink-0" aria-hidden="true"></i>
            <span class="text-xs font-bold truncate">${esc(t.label)}</span>
          </span>
          <span class="text-[11px] font-mono tabular-nums font-semibold shrink-0 ${active ? 'text-slate-300' : 'text-slate-500'}">${t.count}</span>
        </button>
      `;
    })
    .join('');

  let activeContentHtml = '';
  if (uiState.activeTab === 'inspector') activeContentHtml = renderInspectorTab();
  else if (uiState.activeTab === 'defence') activeContentHtml = renderDefenceTab();
  else if (uiState.activeTab === 'legislation') activeContentHtml = renderLegislationTab();
  else activeContentHtml = renderIncidentTab();

  containerEl.innerHTML = `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500 tabular-nums">
            <button type="button" data-ta4-action="go-home" class="hover:text-slate-900 transition-colors font-semibold">Home</button>
            <span aria-hidden="true">/</span>
            <span class="text-sky-700 font-semibold">TA4 Cyber-Security &amp; Legislation Lab</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
            TA4 Cyber-Security &amp; UK Legislation Lab
          </h1>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <div class="text-left md:text-right tabular-nums">
            <div class="text-xs font-bold text-slate-900">${summary.completedChallenges} of ${summary.totalChallenges} Mastered (${summary.masteryPct}%)</div>
            <div class="w-40 h-2 bg-slate-200 rounded-full overflow-hidden mt-1.5">
              <div class="h-full bg-sky-600 rounded-full transition-all" style="width: ${summary.masteryPct}%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4-Mode Responsive Tab Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5" role="tablist" aria-label="TA4 Cyber-Security and Legislation Lab modes">
        ${tabsHtml}
      </div>

      ${activeContentHtml}
    </div>
  `;

  bindEvents();
}

function bindEvents(): void {
  if (!containerEl || !uiState) return;

  containerEl.querySelectorAll<HTMLElement>('[data-ta4-action]').forEach((el) => {
    el.addEventListener('click', () => {
      if (!uiState) return;
      const action = el.dataset.ta4Action;

      if (action === 'go-home') {
        const win = window as unknown as { returnToHomeScreen?: () => void };
        if (typeof win.returnToHomeScreen === 'function') win.returnToHomeScreen();
      } else if (action === 'open-ta4-ref') {
        const win = window as unknown as { openQuickReference?: (ta: string, force: boolean) => void };
        if (typeof win.openQuickReference === 'function') win.openQuickReference('TA4', true);
      } else if (action === 'switch-tab') {
        uiState.activeTab = (el.dataset.tab as Ta4LabTab) || 'inspector';
        renderWorkspace();
      } else if (action === 'select-inspector') {
        const id = el.dataset.id;
        if (id) {
          uiState.inspectorCaseId = id;
          uiState.inspectorValidationMsg = null;
          renderWorkspace();
        }
      } else if (action === 'toggle-clue') {
        const clueId = el.dataset.clueId;
        if (!clueId) return;
        const cid = uiState.inspectorCaseId;
        const list = [...(uiState.inspectorSelectedClues[cid] || [])];
        const idx = list.indexOf(clueId);
        if (idx >= 0) list.splice(idx, 1);
        else list.push(clueId);
        uiState.inspectorSelectedClues[cid] = list;
        uiState.inspectorResults[cid] = null;
        uiState.inspectorValidationMsg = null;
        renderWorkspace();
      } else if (action === 'select-threat-class') {
        const cls = el.dataset.class as ThreatClassification;
        const cid = uiState.inspectorCaseId;
        uiState.inspectorSelectedClass[cid] = cls;
        uiState.inspectorResults[cid] = null;
        uiState.inspectorValidationMsg = null;
        renderWorkspace();
      } else if (action === 'reset-inspector') {
        const cid = uiState.inspectorCaseId;
        uiState.inspectorSelectedClues[cid] = [];
        uiState.inspectorSelectedClass[cid] = '';
        uiState.inspectorResults[cid] = null;
        uiState.inspectorValidationMsg = null;
        renderWorkspace();
      } else if (action === 'check-inspector') {
        const cid = uiState.inspectorCaseId;
        const caseItem = THREAT_INSPECTOR_CASES.find((c) => c.id === cid);
        if (!caseItem) return;
        const chosenClass = uiState.inspectorSelectedClass[cid] || '';
        if (!chosenClass) {
          uiState.inspectorValidationMsg = 'Choose an OCR Threat Classification before checking your verdict.';
          renderWorkspace();
          return;
        }
        const evalRes = evaluateThreatInspectorCase(caseItem, uiState.inspectorSelectedClues[cid] || [], chosenClass);
        uiState.inspectorResults[cid] = evalRes;
        uiState.inspectorValidationMsg = null;
        if (evalRes.isMastered) {
          uiState.progress.completedInspector[cid] = true;
          saveProgress(uiState.progress);
          if (onShowToastCb) onShowToastCb('Threat case mastered (+3/3 marks)!', 'success');
        }
        renderWorkspace();
      } else if (action === 'select-defence') {
        const id = el.dataset.id;
        if (id) {
          uiState.defenceScenarioId = id;
          uiState.defenceValidationMsg = null;
          renderWorkspace();
        }
      } else if (action === 'toggle-defence-control') {
        const ctrlId = el.dataset.controlId;
        if (!ctrlId) return;
        const sid = uiState.defenceScenarioId;
        const list = [...(uiState.defenceSelectedControls[sid] || [])];
        const idx = list.indexOf(ctrlId);
        if (idx >= 0) {
          list.splice(idx, 1);
          uiState.defenceValidationMsg = null;
        } else if (list.length >= 3) {
          uiState.defenceValidationMsg = 'Maximum of 3 layered controls selected. Deselect one control to swap it.';
        } else {
          list.push(ctrlId);
          uiState.defenceValidationMsg = null;
        }
        uiState.defenceSelectedControls[sid] = list;
        uiState.defenceResults[sid] = null;
        renderWorkspace();
      } else if (action === 'reset-defence') {
        const sid = uiState.defenceScenarioId;
        uiState.defenceSelectedControls[sid] = [];
        uiState.defenceResults[sid] = null;
        uiState.defenceValidationMsg = null;
        renderWorkspace();
      } else if (action === 'check-defence') {
        const sid = uiState.defenceScenarioId;
        const scenario = LAYERED_DEFENCE_SCENARIOS.find((s) => s.id === sid);
        if (!scenario) return;
        const chosen = uiState.defenceSelectedControls[sid] || [];
        if (chosen.length < 3) {
          uiState.defenceValidationMsg = 'Select 3 layered security controls before deploying your defence stack.';
          renderWorkspace();
          return;
        }
        const evalRes = evaluateLayeredDefence(scenario, chosen);
        uiState.defenceResults[sid] = evalRes;
        uiState.defenceValidationMsg = null;
        if (evalRes.isMastered) {
          uiState.progress.completedDefence[sid] = true;
          saveProgress(uiState.progress);
          if (onShowToastCb) onShowToastCb('Attack blocked! Defence-in-depth mastered.', 'success');
        }
        renderWorkspace();
      } else if (action === 'select-law-guide') {
        uiState.activeLawGuideId = (el.dataset.act as UkLawActId) || 'dpa-2018';
        renderWorkspace();
      } else if (action === 'select-law-case') {
        const id = el.dataset.id;
        if (id) {
          uiState.lawCaseId = id;
          uiState.lawValidationMsg = null;
          renderWorkspace();
        }
      } else if (action === 'choose-law-act') {
        const lid = uiState.lawCaseId;
        uiState.lawSelectedAct[lid] = (el.dataset.act as UkLawActId) || '';
        uiState.lawResults[lid] = null;
        uiState.lawValidationMsg = null;
        renderWorkspace();
      } else if (action === 'choose-law-clause') {
        const lid = uiState.lawCaseId;
        uiState.lawSelectedClause[lid] = el.dataset.clauseId || '';
        uiState.lawResults[lid] = null;
        uiState.lawValidationMsg = null;
        renderWorkspace();
      } else if (action === 'reset-law') {
        const lid = uiState.lawCaseId;
        uiState.lawSelectedAct[lid] = '';
        uiState.lawSelectedClause[lid] = '';
        uiState.lawResults[lid] = null;
        uiState.lawValidationMsg = null;
        renderWorkspace();
      } else if (action === 'check-law') {
        const lid = uiState.lawCaseId;
        const lawCase = LEGISLATION_CASES.find((c) => c.id === lid);
        if (!lawCase) return;
        const act = uiState.lawSelectedAct[lid] || '';
        const clause = uiState.lawSelectedClause[lid] || '';
        if (!act || !clause) {
          uiState.lawValidationMsg = 'Select both the breached UK Act and the specific legal clause before submitting.';
          renderWorkspace();
          return;
        }
        const evalRes = evaluateLegislationCase(lawCase, act, clause);
        uiState.lawResults[lid] = evalRes;
        uiState.lawValidationMsg = null;
        if (evalRes.isMastered) {
          uiState.progress.completedLegislation[lid] = true;
          saveProgress(uiState.progress);
          if (onShowToastCb) onShowToastCb('Legal verdict mastered (+2/2 marks)!', 'success');
        }
        renderWorkspace();
      } else if (action === 'select-incident') {
        const id = el.dataset.id;
        if (id) {
          uiState.incidentId = id;
          uiState.incidentValidationMsg = null;
          renderWorkspace();
        }
      } else if (action === 'move-step') {
        const iid = uiState.incidentId;
        const idx = Number.parseInt(el.dataset.idx || '-1', 10);
        const dir = Number.parseInt(el.dataset.dir || '0', 10);
        const order = [...(uiState.incidentOrders[iid] || [])];
        const nextIdx = idx + dir;
        if (idx >= 0 && nextIdx >= 0 && nextIdx < order.length) {
          [order[idx], order[nextIdx]] = [order[nextIdx], order[idx]];
          uiState.incidentOrders[iid] = order;
          uiState.incidentResults[iid] = null;
          renderWorkspace();
        }
      } else if (action === 'reset-incident') {
        const iid = uiState.incidentId;
        const challenge = INCIDENT_CHALLENGES.find((c) => c.id === iid);
        if (challenge && challenge.kind === 'order') {
          uiState.incidentOrders[iid] = [...challenge.initialOrderIds];
          uiState.incidentResults[iid] = null;
          renderWorkspace();
        }
      } else if (action === 'choose-incident-option') {
        const iid = uiState.incidentId;
        uiState.incidentDecisions[iid] = el.dataset.optId || '';
        uiState.incidentResults[iid] = null;
        uiState.incidentValidationMsg = null;
        renderWorkspace();
      } else if (action === 'check-incident') {
        const iid = uiState.incidentId;
        const challenge = INCIDENT_CHALLENGES.find((c) => c.id === iid);
        if (!challenge) return;
        let evalRes: IncidentEvaluation;
        if (challenge.kind === 'order') {
          evalRes = evaluateIncidentChallenge(challenge, uiState.incidentOrders[iid] || []);
        } else {
          const chosen = uiState.incidentDecisions[iid] || '';
          if (!chosen) {
            uiState.incidentValidationMsg = 'Choose a security control option before checking.';
            renderWorkspace();
            return;
          }
          evalRes = evaluateIncidentChallenge(challenge, chosen);
        }
        uiState.incidentResults[iid] = evalRes;
        uiState.incidentValidationMsg = null;
        if (evalRes.isMastered) {
          uiState.progress.completedIncident[iid] = true;
          saveProgress(uiState.progress);
          if (onShowToastCb) onShowToastCb('Incident response challenge mastered!', 'success');
        }
        renderWorkspace();
      }
    });
  });
}

export function initTa4SecurityLab(
  container: HTMLElement,
  options: Ta4LabInitOptions = {}
): void {
  containerEl = container;
  onProgressChangeCb = options.onProgressChange || null;
  onShowToastCb = options.onShowToast || null;

  if (!uiState) {
    uiState = createInitialState(options.initialTab || 'inspector');
  } else {
    uiState.progress = loadProgress();
    if (options.initialTab) {
      uiState.activeTab = options.initialTab;
    }
  }

  renderWorkspace();
  if (onProgressChangeCb) {
    onProgressChangeCb(computeTa4MasterySummary(uiState.progress));
  }
}

export function setTa4LabTab(tab: Ta4LabTab): void {
  if (!uiState) return;
  uiState.activeTab = tab;
  renderWorkspace();
}
