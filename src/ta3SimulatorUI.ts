import {
  CHECK_TYPE_LABELS,
  VALIDATION_SCENARIOS,
  TEST_PLAN_CHALLENGES,
  VERIFICATION_DEMO_FIELDS,
  VERIFICATION_DRILLS,
  DATA_RULE_DRILLS,
  evaluateFieldValidation,
  checkValidationMission,
  evaluateTestPlanSubmission,
  evaluateDoubleEntrySimulation,
  evaluateDataRuleDrill,
  computeTa3MasterySummary,
  type ValidationCheckType,
  type ValidationScenario,
  type FieldValidationResult,
  type TestPlanRowInput,
  type TestPlanEvaluationResult,
  type Ta3SimulatorProgress,
  type Ta3MasterySummary,
} from './ta3SimulatorEngine';

const STORAGE_KEY = 'OCR_R050_TA3_SIMULATOR_V1';

export type Ta3SimulatorTab = 'sandbox' | 'testplan' | 'verification' | 'datarules';

interface Ta3UiState {
  activeTab: Ta3SimulatorTab;
  // Tab 1: Validation Sandbox
  scenarioId: string;
  selectedFieldId: string;
  fieldValues: Record<string, string>;
  fieldRuleToggles: Record<string, Partial<Record<ValidationCheckType, boolean>>>;
  fieldResults: Record<string, FieldValidationResult | null>;
  // Tab 2: Test Plan & Boundary Lab
  testPlanId: string;
  testPlanInputs: Record<
    string,
    Record<'normal' | 'lowerBoundary' | 'upperBoundary' | 'outOfRange' | 'wrongType', TestPlanRowInput>
  >;
  testPlanResults: Record<string, TestPlanEvaluationResult | null>;
  // Tab 3: Validation vs Verification
  verifDemoFieldId: string;
  verifEntry1: string;
  verifEntry2: string;
  verifDemoResult: ReturnType<typeof evaluateDoubleEntrySimulation> | null;
  verifDrillIdx: number;
  verifDrillSelections: Record<string, { category: string; technique: string; checked: boolean }>;
  // Tab 4: Data Types & Rule Matcher
  dataRuleIdx: number;
  dataRuleSelections: Record<string, { dataType: string; check: string; checked: boolean }>;
  // Persisted mastery
  progress: Ta3SimulatorProgress;
}

let containerEl: HTMLElement | null = null;
let onProgressChangeCb: ((summary: Ta3MasterySummary) => void) | null = null;
let onShowToastCb: ((msg: string, type?: string) => void) | null = null;

function esc(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadProgress(): Ta3SimulatorProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        completedMissions: parsed.completedMissions || {},
        completedTestPlans: parsed.completedTestPlans || {},
        completedVerifications: parsed.completedVerifications || {},
        completedDataRules: parsed.completedDataRules || {},
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return {
    completedMissions: {},
    completedTestPlans: {},
    completedVerifications: {},
    completedDataRules: {},
  };
}

function saveProgress(progress: Ta3SimulatorProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage write errors
  }
  if (onProgressChangeCb) {
    onProgressChangeCb(computeTa3MasterySummary(progress));
  }
}

function makeEmptyTestPlanInputs(): Record<
  'normal' | 'lowerBoundary' | 'upperBoundary' | 'outOfRange' | 'wrongType',
  TestPlanRowInput
> {
  return {
    normal: { value: '', expectedOutcome: '' },
    lowerBoundary: { value: '', expectedOutcome: '' },
    upperBoundary: { value: '', expectedOutcome: '' },
    outOfRange: { value: '', expectedOutcome: '' },
    wrongType: { value: '', expectedOutcome: '' },
  };
}

function createInitialState(): Ta3UiState {
  const fieldValues: Record<string, string> = {};
  for (const s of VALIDATION_SCENARIOS) {
    for (const f of s.fields) {
      fieldValues[f.id] = f.sampleValid;
    }
  }

  const testPlanInputs: Ta3UiState['testPlanInputs'] = {};
  const testPlanResults: Ta3UiState['testPlanResults'] = {};
  for (const tp of TEST_PLAN_CHALLENGES) {
    testPlanInputs[tp.id] = makeEmptyTestPlanInputs();
    testPlanResults[tp.id] = null;
  }

  return {
    activeTab: 'sandbox',
    scenarioId: VALIDATION_SCENARIOS[0].id,
    selectedFieldId: VALIDATION_SCENARIOS[0].fields[0].id,
    fieldValues,
    fieldRuleToggles: {},
    fieldResults: {},
    testPlanId: TEST_PLAN_CHALLENGES[0].id,
    testPlanInputs,
    testPlanResults,
    verifDemoFieldId: VERIFICATION_DEMO_FIELDS[0].id,
    verifEntry1: '14/08/2008',
    verifEntry2: '14/03/2008',
    verifDemoResult: null,
    verifDrillIdx: 0,
    verifDrillSelections: {},
    dataRuleIdx: 0,
    dataRuleSelections: {},
    progress: loadProgress(),
  };
}

let uiState: Ta3UiState = createInitialState();

function getActiveScenario(): ValidationScenario {
  return VALIDATION_SCENARIOS.find((s) => s.id === uiState.scenarioId) || VALIDATION_SCENARIOS[0];
}

function getFieldAvailableChecks(field: ValidationScenario['fields'][number]): ValidationCheckType[] {
  const list: ValidationCheckType[] = [];
  if (field.checks.presence) list.push('presence');
  if (field.checks.type) list.push('type');
  if (
    field.checks.exactLength !== undefined ||
    field.checks.minLength !== undefined ||
    field.checks.maxLength !== undefined
  ) {
    list.push('length');
  }
  if (field.checks.min !== undefined || field.checks.max !== undefined) list.push('range');
  if (field.checks.formatRegex) list.push('format');
  if (field.checks.lookupValues && field.checks.lookupValues.length > 0) list.push('lookup');
  return list;
}

function renderHeaderAndTabs(summary: Ta3MasterySummary): string {
  const tabs: Array<{ id: Ta3SimulatorTab; label: string; meta: string; icon: string }> = [
    {
      id: 'sandbox',
      label: 'Live Validation Sandbox',
      meta: `${summary.missionsDone}/${summary.missionsTotal}`,
      icon: 'fa-shield-halved',
    },
    {
      id: 'testplan',
      label: 'Test Plan & Boundary Lab',
      meta: `${summary.testPlansDone}/${summary.testPlansTotal}`,
      icon: 'fa-sliders',
    },
    {
      id: 'verification',
      label: 'Validation vs Verification',
      meta: `${summary.verificationsDone}/${summary.verificationsTotal}`,
      icon: 'fa-check-double',
    },
    {
      id: 'datarules',
      label: 'Data Types & Rule Matcher',
      meta: `${summary.dataRulesDone}/${summary.dataRulesTotal}`,
      icon: 'fa-database',
    },
  ];

  return `
    <div class="space-y-1.5">
      <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium tabular-nums">
        <span class="font-bold text-emerald-700">Topic Area 3 · Data &amp; Testing</span>
        <span aria-hidden="true">·</span>
        <span>OCR Unit R050 Interactive Simulator</span>
        <span aria-hidden="true">·</span>
        <span data-testid="ta3-mastery-summary">${summary.completedChallenges} of ${summary.totalChallenges} Challenges Mastered (${summary.masteryPct}%)</span>
      </div>
      <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900" style="text-wrap: balance;">
        TA3 Validation &amp; Test Data Simulator
      </h1>
      <p class="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
        Run live inputs through Presence, Type, Length, Range, Format, and Lookup validation pipelines, build 6-mark OCR test plans on an interactive boundary scale, and see how Verification catches sensible typos that Validation misses.
      </p>
    </div>

    <div role="tablist" aria-label="TA3 Simulator Modes" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 p-1.5 bg-slate-200/75 rounded-2xl border border-slate-200">
      ${tabs
        .map((t) => {
          const active = uiState.activeTab === t.id;
          return `
            <button type="button" role="tab" aria-selected="${active ? 'true' : 'false'}" data-ta3-tab="${t.id}"
              class="w-full min-w-0 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between sm:justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }">
              <span class="flex items-center gap-2 min-w-0">
                <i class="fa-solid ${t.icon} shrink-0 ${active ? 'text-emerald-600' : 'text-slate-400'}"></i>
                <span class="truncate">${esc(t.label)}</span>
              </span>
              <span class="font-mono tabular-nums text-[11px] shrink-0 ${active ? 'text-emerald-700 font-bold' : 'text-slate-500'}">${t.meta}</span>
            </button>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderSandboxTab(): string {
  const scenario = getActiveScenario();
  const activeField = scenario.fields.find((f) => f.id === uiState.selectedFieldId) || scenario.fields[0];
  const activeResult = uiState.fieldResults[activeField.id] || null;
  const toggles = uiState.fieldRuleToggles[activeField.id] || {};
  const availableChecks = getFieldAvailableChecks(activeField);

  const pipelineHtml = activeResult
    ? `
      <div data-testid="ta3-pipeline-output" class="space-y-3">
        <div class="p-3.5 rounded-xl border ${
          activeResult.disabledBypassWarning
            ? 'bg-amber-50 border-amber-300 text-amber-950'
            : activeResult.accepted
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
        }">
          <div class="flex items-center justify-between gap-2 text-xs font-bold">
            <span>
              ${
                activeResult.disabledBypassWarning
                  ? '▲ Accepted (Rule Bypassed — Corrupt Data Risk!)'
                  : activeResult.accepted
                    ? '✓ Input Accepted by Validation Pipeline'
                    : `✗ Rejected by ${CHECK_TYPE_LABELS[activeResult.firstFailedCheck!]}`
              }
            </span>
            <span class="font-mono tabular-nums">Value: "${esc(activeResult.value || '(blank)')}"</span>
          </div>
          ${
            activeResult.disabledBypassWarning
              ? `<p class="text-xs mt-1 text-amber-900">${esc(activeResult.disabledBypassWarning)}</p>`
              : activeResult.boundaryHit
                ? `<p class="text-xs mt-1 text-emerald-800">Boundary hit: exact ${activeResult.boundaryHit} inclusive limit accepted.</p>`
                : ''
          }
        </div>

        <div class="space-y-2">
          ${activeResult.steps
            .map(
              (st, idx) => `
              <div class="flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl border text-xs ${
                !st.enabled
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                  : st.passed
                    ? 'bg-slate-50 border-slate-200 text-slate-800'
                    : 'bg-rose-50 border-rose-200 text-rose-950'
              }">
                <div class="space-y-0.5">
                  <div class="font-bold">
                    <span class="font-mono tabular-nums text-slate-400 mr-1.5">${idx + 1}.</span>${esc(st.label)}
                  </div>
                  <p class="text-slate-600">${esc(st.message)}</p>
                </div>
                <span class="font-mono font-bold shrink-0 ${
                  !st.enabled ? 'text-amber-700' : st.passed ? 'text-emerald-700' : 'text-rose-700'
                }">
                  ${!st.enabled ? 'OFF' : st.passed ? '✓ Pass' : '✗ Fail'}
                </span>
              </div>
            `
            )
            .join('')}
        </div>
      </div>
    `
    : `<p class="text-xs text-slate-500">Enter a value in <strong>${esc(activeField.label)}</strong> and click <strong>Test Field</strong> or <strong>Run All Fields</strong> to inspect every validation stage.</p>`;

  return `
    <!-- Scenario Selector Bar -->
    <div class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        ${VALIDATION_SCENARIOS.map((s, idx) => {
          const active = s.id === scenario.id;
          const doneCount = s.missions.filter((m) => uiState.progress.completedMissions[m.id]).length;
          return `
            <button type="button" data-ta3-scenario="${s.id}"
              class="px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                active ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }">
              <span class="font-mono tabular-nums opacity-80">0${idx + 1}</span>
              <span>${esc(s.title.split(' ').slice(0, 3).join(' '))}</span>
              <span class="font-mono tabular-nums text-[11px] ${active ? 'text-emerald-300' : 'text-slate-500'}">${doneCount}/${s.missions.length}</span>
            </button>
          `;
        }).join('')}
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" data-ta3-action="reset-sandbox" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap">
          Reset Form &amp; Rules
        </button>
        <button type="button" data-ta3-action="run-all-fields" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
          <i class="fa-solid fa-play text-[11px]"></i>
          <span>Run Full Validation Pipeline</span>
        </button>
      </div>
    </div>

    <!-- Two-Zone Sandbox Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Left Zone: Interactive Validated Form (7 cols) -->
      <div class="lg:col-span-7 bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100">
          <div class="text-xs font-semibold text-emerald-700">${esc(scenario.context)}</div>
          <h2 class="text-base font-bold text-slate-900">${esc(scenario.title)}</h2>
          <p class="text-xs text-slate-600 mt-1">${esc(scenario.brief)}</p>
        </div>

        <div class="p-5 space-y-4">
          ${scenario.fields
            .map((f) => {
              const val = uiState.fieldValues[f.id] ?? '';
              const res = uiState.fieldResults[f.id];
              const isSelected = f.id === activeField.id;
              const statusText = res
                ? res.disabledBypassWarning
                  ? '▲ Bypassed'
                  : res.accepted
                    ? '✓ Accepted'
                    : `✗ ${CHECK_TYPE_LABELS[res.firstFailedCheck!]}`
                : 'Not run';
              const statusColor = res
                ? res.disabledBypassWarning
                  ? 'text-amber-700'
                  : res.accepted
                    ? 'text-emerald-700'
                    : 'text-rose-700'
                : 'text-slate-400';

              return `
                <div class="p-4 rounded-xl border transition-colors ${
                  isSelected ? 'border-indigo-400 bg-indigo-50/35' : 'border-slate-200 bg-white'
                }">
                  <div class="flex flex-wrap items-baseline justify-between gap-2 mb-1.5">
                    <label for="ta3-input-${f.id}" class="text-xs font-bold text-slate-900">
                      ${esc(f.label)}
                      <span class="font-normal text-slate-500 ml-1">· ${esc(f.displayType)}</span>
                    </label>
                    <span class="text-xs font-mono font-bold ${statusColor}" data-testid="ta3-field-status-${f.id}">${statusText}</span>
                  </div>
                  <p class="text-[11px] text-slate-500 mb-2.5">${esc(f.ruleSummary)}</p>
                  <div class="flex items-center gap-2">
                    <input id="ta3-input-${f.id}" type="text" value="${esc(val)}" placeholder="${esc(f.placeholder)}" data-ta3-field-input="${f.id}"
                      class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <button type="button" data-ta3-test-field="${f.id}"
                      class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0">
                      Test Field
                    </button>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>

      <!-- Right Zone: Pipeline Inspector, Experiment Toggles & Missions (5 cols) -->
      <div class="lg:col-span-5 space-y-5">
        <!-- Pipeline Trace & Experiment Toggles -->
        <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div class="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div class="text-xs font-semibold text-indigo-600">Inspecting Field</div>
              <h3 class="text-sm font-bold text-slate-900">${esc(activeField.label)}</h3>
            </div>
            <span class="text-xs text-slate-500 font-mono">${esc(activeField.displayType)}</span>
          </div>

          ${pipelineHtml}

          <!-- Experiment Mode: Toggle Validation Checks ON/OFF -->
          <div class="pt-4 border-t border-slate-100 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-900">Experiment Mode: Toggle Rules</span>
              <span class="text-[11px] text-slate-500">Turn OFF to test data corruption</span>
            </div>
            <div class="flex flex-wrap gap-2">
              ${availableChecks
                .map((chk) => {
                  const enabled = toggles[chk] !== false;
                  return `
                    <label class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                      enabled
                        ? 'bg-slate-50 border-slate-200 text-slate-800'
                        : 'bg-amber-50 border-amber-300 text-amber-900'
                    }">
                      <input type="checkbox" data-ta3-rule-toggle="${activeField.id}:${chk}" ${enabled ? 'checked' : ''} class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
                      <span>${esc(CHECK_TYPE_LABELS[chk].replace(' Check', ''))}</span>
                    </label>
                  `;
                })
                .join('')}
            </div>
          </div>
        </div>

        <!-- 3 Targeted OCR Missions -->
        <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <div class="text-xs font-semibold text-emerald-700">Hands-On Objectives</div>
              <h3 class="text-sm font-bold text-slate-900">Scenario Testing Missions</h3>
            </div>
            <span class="text-xs font-mono tabular-nums text-slate-500">
              ${scenario.missions.filter((m) => uiState.progress.completedMissions[m.id]).length}/${scenario.missions.length} Done
            </span>
          </div>
          <div class="space-y-2.5">
            ${scenario.missions
              .map((m) => {
                const done = uiState.progress.completedMissions[m.id] === true;
                return `
                  <div class="p-3 rounded-xl border text-xs flex items-start justify-between gap-2.5 ${
                    done ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50/70 border-slate-200'
                  }">
                    <div class="space-y-0.5">
                      <div class="font-bold text-slate-900">${esc(m.title)}</div>
                      <p class="text-slate-600">${esc(m.instruction)}</p>
                    </div>
                    <span class="font-mono font-bold shrink-0 ${done ? 'text-emerald-700' : 'text-slate-400'}">
                      ${done ? '✓ Done' : 'Todo'}
                    </span>
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderBoundaryScaleSvg(
  challenge: (typeof TEST_PLAN_CHALLENGES)[number],
  inputs: Record<'normal' | 'lowerBoundary' | 'upperBoundary' | 'outOfRange' | 'wrongType', TestPlanRowInput>
): string {
  const span = challenge.max - challenge.min;
  const pad = Math.max(2, Math.round(span * 0.28));
  const scaleMin = challenge.min - pad;
  const scaleMax = challenge.max + pad;
  const xStart = 50;
  const xEnd = 630;
  const mapX = (val: number) => {
    const clamped = Math.max(scaleMin, Math.min(scaleMax, val));
    return xStart + ((clamped - scaleMin) / (scaleMax - scaleMin)) * (xEnd - xStart);
  };

  const minX = mapX(challenge.min);
  const maxX = mapX(challenge.max);

  const measureVal = (raw: string): number | null => {
    const t = raw.trim();
    if (!t) return null;
    if (challenge.dataKind === 'integer') return /^-?\d+$/.test(t) ? Number(t) : null;
    return /^\d+$/.test(t) ? t.length : null;
  };

  const markers: Array<{ label: string; val: number; color: string; yOff: number; kind: 'normal' | 'low' | 'high' | 'oor' }> = [];
  const norm = measureVal(inputs.normal.value);
  if (norm !== null) markers.push({ label: `Normal (${norm})`, val: norm, color: '#059669', yOff: 44, kind: 'normal' });
  const low = measureVal(inputs.lowerBoundary.value);
  if (low !== null) markers.push({ label: `Low (${low})`, val: low, color: '#4f46e5', yOff: 22, kind: 'low' });
  const high = measureVal(inputs.upperBoundary.value);
  if (high !== null) markers.push({ label: `High (${high})`, val: high, color: '#4f46e5', yOff: 22, kind: 'high' });
  const oor = measureVal(inputs.outOfRange.value);
  if (oor !== null) markers.push({ label: `Erroneous (${oor})`, val: oor, color: '#dc2626', yOff: 44, kind: 'oor' });

  const pinsSvg = markers
    .map((m) => {
      const px = mapX(m.val);
      let textX = px;
      let anchor: 'start' | 'middle' | 'end' = 'middle';
      if (m.kind === 'oor') {
        if (m.val > challenge.max) {
          // Keep erroneous label strictly to the right of the upper boundary stem
          textX = Math.min(xEnd - 2, Math.max(px, maxX + 12));
          anchor = px > xEnd - 65 ? 'end' : 'start';
          if (anchor === 'start') textX = Math.max(px - 4, maxX + 10);
        } else if (m.val < challenge.min) {
          // Keep erroneous label strictly to the left of the lower boundary stem
          anchor = px < xStart + 65 ? 'start' : 'end';
          textX = anchor === 'end' ? Math.min(px + 4, minX - 10) : Math.max(xStart + 2, px);
        }
      } else if (m.kind === 'normal') {
        // Keep normal label away from boundary stems if typed near an edge
        if (px - minX < 55) {
          anchor = 'start';
          textX = Math.max(px, minX + 10);
        } else if (maxX - px < 55) {
          anchor = 'end';
          textX = Math.min(px, maxX - 10);
        }
      }
      return `
        <line x1="${px}" y1="${m.yOff + 6}" x2="${px}" y2="86" stroke="${m.color}" stroke-width="1.8" stroke-dasharray="3 2" />
        <circle cx="${px}" cy="86" r="6" fill="${m.color}" stroke="#ffffff" stroke-width="2" />
        <text x="${textX}" y="${m.yOff}" text-anchor="${anchor}" font-size="10" font-weight="700" fill="${m.color}" stroke="#f8fafc" stroke-width="4" stroke-linejoin="round" paint-order="stroke" font-family="JetBrains Mono, monospace">${esc(m.label)}</text>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 680 140" class="w-full h-auto select-none" data-testid="ta3-boundary-svg" role="img" aria-label="Interactive test data boundary scale">
      <!-- Invalid Left Zone -->
      <rect x="${xStart}" y="76" width="${Math.max(4, minX - xStart)}" height="20" rx="4" fill="#fee2e2" stroke="#fca5a5" stroke-width="1" />
      <!-- Valid Accepted Interior Zone -->
      <rect x="${minX}" y="76" width="${Math.max(4, maxX - minX)}" height="20" fill="#d1fae5" stroke="#34d399" stroke-width="1.5" />
      <!-- Invalid Right Zone -->
      <rect x="${maxX}" y="76" width="${Math.max(4, xEnd - maxX)}" height="20" rx="4" fill="#fee2e2" stroke="#fca5a5" stroke-width="1" />

      <!-- Exact Boundary Vertical Guides -->
      <line x1="${minX}" y1="68" x2="${minX}" y2="104" stroke="#047857" stroke-width="2.5" />
      <line x1="${maxX}" y1="68" x2="${maxX}" y2="104" stroke="#047857" stroke-width="2.5" />

      <!-- Boundary Numeric Ticks -->
      <text x="${minX}" y="116" text-anchor="middle" font-size="10" font-weight="800" fill="#047857" font-family="JetBrains Mono, monospace">${challenge.min}</text>
      <text x="${maxX}" y="116" text-anchor="middle" font-size="10" font-weight="800" fill="#047857" font-family="JetBrains Mono, monospace">${challenge.max}</text>

      <!-- Zone Labels -->
      <text x="${(xStart + minX) / 2}" y="131" text-anchor="middle" font-size="10" font-weight="700" fill="#b91c1c" font-family="Plus Jakarta Sans, sans-serif">Invalid (&lt; ${challenge.min})</text>
      <text x="${(minX + maxX) / 2}" y="131" text-anchor="middle" font-size="10.5" font-weight="700" fill="#065f46" font-family="Plus Jakarta Sans, sans-serif">Valid Accepted Zone (${challenge.min} to ${challenge.max} ${esc(challenge.unitLabel)})</text>
      <text x="${(maxX + xEnd) / 2}" y="131" text-anchor="middle" font-size="10" font-weight="700" fill="#b91c1c" font-family="Plus Jakarta Sans, sans-serif">Invalid (&gt; ${challenge.max})</text>

      ${pinsSvg}
    </svg>
  `;
}

function renderTestPlanTab(): string {
  const challenge = TEST_PLAN_CHALLENGES.find((t) => t.id === uiState.testPlanId) || TEST_PLAN_CHALLENGES[0];
  const inputs = uiState.testPlanInputs[challenge.id] || makeEmptyTestPlanInputs();
  const evalRes = uiState.testPlanResults[challenge.id] || null;

  const rowSpecs: Array<{
    key: 'normal' | 'lowerBoundary' | 'upperBoundary' | 'outOfRange' | 'wrongType';
    title: string;
    hint: string;
  }> = [
    {
      key: 'normal',
      title: '1. Normal (Valid) Data',
      hint: challenge.dataKind === 'integer'
        ? `Typical value strictly inside ${challenge.min + 1}–${challenge.max - 1}`
        : `Sample numeric PIN of ${challenge.min + 1}–${challenge.max - 1} digits`,
    },
    {
      key: 'lowerBoundary',
      title: '2. Lower Boundary Data',
      hint: challenge.dataKind === 'integer'
        ? `Exact minimum accepted value (${challenge.min})`
        : `Numeric PIN of exact min length (${challenge.min} digits)`,
    },
    {
      key: 'upperBoundary',
      title: '3. Upper Boundary Data',
      hint: challenge.dataKind === 'integer'
        ? `Exact maximum accepted value (${challenge.max})`
        : `Numeric PIN of exact max length (${challenge.max} digits)`,
    },
    {
      key: 'outOfRange',
      title: '4. Erroneous (Out of Range)',
      hint: challenge.dataKind === 'integer'
        ? `Integer below ${challenge.min} or above ${challenge.max}`
        : `Numeric PIN shorter than ${challenge.min} or longer than ${challenge.max} digits`,
    },
    {
      key: 'wrongType',
      title: '5. Erroneous (Wrong Data Type)',
      hint: 'Non-numeric text or symbols (e.g., "twenty" or "abc")',
    },
  ];

  return `
    <div class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        ${TEST_PLAN_CHALLENGES.map((tp, idx) => {
          const active = tp.id === challenge.id;
          const saved = uiState.progress.completedTestPlans[tp.id];
          const done = saved && saved.bestMarks >= Math.ceil(tp.maxMarks * 0.8);
          return `
            <button type="button" data-ta3-testplan="${tp.id}"
              class="px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                active ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }">
              <span class="font-mono tabular-nums opacity-80">0${idx + 1}</span>
              <span>${esc(tp.fieldLabel)} (${tp.min}–${tp.max})</span>
              ${done ? '<span class="text-emerald-400 font-bold">✓</span>' : ''}
            </button>
          `;
        }).join('')}
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" data-ta3-tp-action="model" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap">
          Load Model Plan
        </button>
        <button type="button" data-ta3-tp-action="check" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap">
          Run Test Plan &amp; Check Marks (6 Marks)
        </button>
      </div>
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div class="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div class="text-xs font-semibold text-indigo-600">${esc(challenge.context)} · ${challenge.maxMarks} Marks</div>
          <h2 class="text-base font-bold text-slate-900">${esc(challenge.title)}</h2>
          <p class="text-xs text-slate-600 mt-0.5">${esc(challenge.ruleDescription)}</p>
        </div>
        <span class="text-xs font-mono tabular-nums text-slate-500">Live Range Plotter</span>
      </div>

      <!-- SVG Number-Line Visualizer -->
      <div class="px-4 py-3 bg-slate-50 border-b border-slate-100" style="background-image: radial-gradient(#cbd5e1 1px, transparent 1px); background-size: 16px 16px;">
        ${renderBoundaryScaleSvg(challenge, inputs)}
      </div>

      <!-- Interactive OCR Test Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600">
              <th class="py-3 pl-5 pr-3">Test Data Category</th>
              <th class="py-3 px-3">Your Test Input</th>
              <th class="py-3 px-3">Expected Outcome</th>
              <th class="py-3 pl-3 pr-5 text-right">OCR Check</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-xs">
            ${rowSpecs
              .map((row) => {
                const cur = inputs[row.key];
                const rowEval = evalRes?.rows.find((r) => r.rowKey === row.key) || null;
                return `
                  <tr class="${rowEval ? (rowEval.passed ? 'bg-emerald-50/40' : 'bg-rose-50/40') : ''}">
                    <td class="py-3.5 pl-5 pr-3 align-top">
                      <div class="font-bold text-slate-900">${esc(row.title)}</div>
                      <div class="text-[11px] text-slate-500 mt-0.5">${esc(row.hint)}</div>
                      ${rowEval ? `<div class="text-[11px] mt-1 ${rowEval.passed ? 'text-emerald-800' : 'text-rose-800'} font-medium">${esc(rowEval.feedback)}</div>` : ''}
                    </td>
                    <td class="py-3.5 px-3 align-top">
                      <input type="text" id="ta3-tp-val-${row.key}" aria-label="${esc(row.title)} value" value="${esc(cur.value)}" data-ta3-tp-val="${row.key}" placeholder="Enter test value"
                        class="w-36 sm:w-44 px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    </td>
                    <td class="py-3.5 px-3 align-top">
                      <select id="ta3-tp-out-${row.key}" aria-label="${esc(row.title)} expected outcome" data-ta3-tp-out="${row.key}"
                        class="w-32 px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">-- Select --</option>
                        <option value="Accept" ${cur.expectedOutcome === 'Accept' ? 'selected' : ''}>Accept</option>
                        <option value="Reject" ${cur.expectedOutcome === 'Reject' ? 'selected' : ''}>Reject</option>
                      </select>
                    </td>
                    <td class="py-3.5 pl-3 pr-5 align-top text-right font-mono font-bold whitespace-nowrap">
                      ${
                        rowEval
                          ? rowEval.passed
                            ? '<span class="text-emerald-700">✓ Pass (+1)</span>'
                            : '<span class="text-rose-700">✗ Fix</span>'
                          : '<span class="text-slate-400">Pending</span>'
                      }
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>

      ${
        evalRes
          ? `
            <div data-testid="ta3-testplan-score" class="px-5 py-4 border-t border-slate-200 ${evalRes.marksEarned === evalRes.maxMarks ? 'bg-emerald-50' : 'bg-amber-50'} flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <div class="font-bold text-slate-900 font-mono tabular-nums text-sm">Test Plan Score: ${evalRes.marksEarned} / ${evalRes.maxMarks} Marks (${evalRes.pct}%)</div>
                <p class="text-slate-700 mt-0.5">${esc(evalRes.summaryFeedback)}</p>
              </div>
            </div>
          `
          : ''
      }
    </div>
  `;
}

function renderVerificationTab(): string {
  const demoField = VERIFICATION_DEMO_FIELDS.find((f) => f.id === uiState.verifDemoFieldId) || VERIFICATION_DEMO_FIELDS[0];
  const demoRes = uiState.verifDemoResult;
  const safeIdx = Math.max(0, Math.min(uiState.verifDrillIdx, VERIFICATION_DRILLS.length - 1));
  const drill = VERIFICATION_DRILLS[safeIdx];
  const sel = uiState.verifDrillSelections[drill.id] || { category: '', technique: '', checked: false };

  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Left: Interactive Double-Entry & Proofreading Live Simulator (5 cols) -->
      <div class="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div class="pb-3 border-b border-slate-100">
          <div class="text-xs font-semibold text-indigo-600">Interactive Proof</div>
          <h2 class="text-base font-bold text-slate-900">Why Validation Alone Cannot Guarantee Accuracy</h2>
          <p class="text-xs text-slate-600 mt-1">Compare a handwritten source document against Double-Entry Verification and automated Format Validation.</p>
        </div>

        <div class="flex items-center gap-1.5">
          ${VERIFICATION_DEMO_FIELDS.map(
            (df) => `
            <button type="button" data-ta3-verif-field="${df.id}"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                df.id === demoField.id ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }">
              ${esc(df.label.split(' (')[0])}
            </button>
          `
          ).join('')}
        </div>

        <!-- Simulated Paper Source Document -->
        <div class="p-4 rounded-xl bg-slate-900 text-white space-y-1">
          <div class="text-[11px] font-semibold text-slate-400">Original Paper Source Document</div>
          <div class="flex items-baseline justify-between gap-2">
            <span class="text-xs text-slate-300">${esc(demoField.label)}:</span>
            <span class="font-mono text-base font-bold text-amber-300 tracking-wide">${esc(demoField.sourceValue)}</span>
          </div>
          <p class="text-[11px] text-slate-400 pt-1">${esc(demoField.ruleHint)}</p>
        </div>

        <div class="space-y-3">
          <div>
            <label for="ta3-verif-e1" class="block text-xs font-semibold text-slate-700 mb-1">Entry 1 (First Typing)</label>
            <input id="ta3-verif-e1" type="text" value="${esc(uiState.verifEntry1)}" data-ta3-verif-input="1"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>
          <div>
            <label for="ta3-verif-e2" class="block text-xs font-semibold text-slate-700 mb-1">Entry 2 (Confirm Double Entry)</label>
            <input id="ta3-verif-e2" type="text" value="${esc(uiState.verifEntry2)}" data-ta3-verif-input="2"
              class="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>
          <button type="button" data-ta3-verif-action="run-demo" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors">
            Run Validation &amp; Double-Entry Check
          </button>
        </div>

        ${
          demoRes
            ? `
              <div data-testid="ta3-verif-demo-result" class="p-4 rounded-xl border text-xs space-y-2 ${
                demoRes.outcomeType === 'verified_accurate'
                  ? 'bg-emerald-50 border-emerald-300'
                  : demoRes.outcomeType === 'caught_by_verification'
                    ? 'bg-indigo-50 border-indigo-300'
                    : 'bg-amber-50 border-amber-300'
              }">
                <div class="font-bold text-slate-900">${esc(demoRes.headline)}</div>
                <div class="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div class="p-2 rounded-lg bg-white border border-slate-200">
                    Validation: <strong class="${demoRes.validationPassed ? 'text-emerald-700' : 'text-rose-700'}">${demoRes.validationPassed ? '✓ Passed' : '✗ Blocked'}</strong>
                  </div>
                  <div class="p-2 rounded-lg bg-white border border-slate-200">
                    Double Entry: <strong class="${demoRes.doubleEntryMatched ? 'text-emerald-700' : 'text-rose-700'}">${demoRes.doubleEntryMatched ? '✓ Match' : '✗ Mismatch'}</strong>
                  </div>
                </div>
                <p class="text-slate-700 leading-relaxed">${esc(demoRes.explanation)}</p>
              </div>
            `
            : ''
        }
      </div>

      <!-- Right: 6 Validation vs Verification Exam Drills (7 cols) -->
      <div class="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div class="text-xs font-semibold text-emerald-700">OCR Exam Distinction Drill</div>
            <h2 class="text-base font-bold text-slate-900">Validation or Verification?</h2>
          </div>
          <span class="font-mono tabular-nums text-xs font-semibold text-slate-500">Scenario ${safeIdx + 1} of ${VERIFICATION_DRILLS.length}</span>
        </div>

        <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <p class="text-sm text-slate-800 leading-relaxed">${esc(drill.prompt)}</p>
          <div class="text-xs font-mono text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 inline-block">${esc(drill.example)}</div>
        </div>

        <div class="space-y-2">
          <div class="text-xs font-bold text-slate-900">1. Is this Data Validation or Data Verification?</div>
          <div class="grid grid-cols-2 gap-2.5">
            {CATEGORIES}
          </div>
        </div>

        <div class="space-y-2">
          <div class="text-xs font-bold text-slate-900">2. Select the exact method or rule</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            ${drill.techniqueOptions
              .map((tech) => {
                const picked = sel.technique === tech;
                let cls = picked
                  ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-semibold'
                  : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-700';
                if (sel.checked) {
                  if (tech === drill.correctTechnique) cls = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold';
                  else if (picked) cls = 'bg-rose-50 border-rose-400 text-rose-950 font-bold';
                }
                return `
                  <button type="button" data-ta3-vd-tech="${drill.id}:${esc(tech)}"
                    class="px-3.5 py-2.5 rounded-xl border text-left text-xs transition-colors ${cls}">
                    ${esc(tech)}
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <button type="button" data-ta3-vd-nav="-1" ${safeIdx === 0 ? 'disabled' : ''}
            class="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40">
            ← Previous
          </button>
          <div class="flex items-center gap-2">
            <button type="button" data-ta3-vd-check="${drill.id}" ${!sel.category || !sel.technique ? 'disabled' : ''}
              class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors">
              Check Answer
            </button>
            <button type="button" data-ta3-vd-nav="1" ${safeIdx === VERIFICATION_DRILLS.length - 1 ? 'disabled' : ''}
              class="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-40">
              Next →
            </button>
          </div>
        </div>

        ${
          sel.checked
            ? `
              <div data-testid="ta3-vd-feedback" class="p-4 rounded-xl border ${
                sel.category === drill.correctCategory && sel.technique === drill.correctTechnique
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-amber-50 border-amber-200'
              } text-xs space-y-1">
                <div class="font-bold text-slate-900">
                  ${
                    sel.category === drill.correctCategory && sel.technique === drill.correctTechnique
                      ? '✓ Mastered — Correct Category & Technique!'
                      : `Review: ${drill.correctCategory} · ${drill.correctTechnique}`
                  }
                </div>
                <p class="text-slate-700 leading-relaxed">${esc(drill.explanation)}</p>
              </div>
            `
            : ''
        }
      </div>
    </div>
  `.replace(
    '{CATEGORIES}',
    (['Validation', 'Verification'] as const)
      .map((cat) => {
        const picked = sel.category === cat;
        let cls = picked
          ? 'bg-slate-900 border-slate-900 text-white'
          : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-800';
        if (sel.checked) {
          if (cat === drill.correctCategory) cls = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold';
          else if (picked) cls = 'bg-rose-50 border-rose-400 text-rose-950 font-bold';
        }
        return `
          <button type="button" data-ta3-vd-cat="${drill.id}:${cat}"
            class="px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-colors ${cls}">
            Data ${cat}
          </button>
        `;
      })
      .join('')
  );
}

function renderDataRulesTab(): string {
  const safeIdx = Math.max(0, Math.min(uiState.dataRuleIdx, DATA_RULE_DRILLS.length - 1));
  const item = DATA_RULE_DRILLS[safeIdx];
  const sel = uiState.dataRuleSelections[item.id] || { dataType: '', check: '', checked: false };
  const res = sel.checked ? evaluateDataRuleDrill(item, sel.dataType, sel.check) : null;

  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div class="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div class="text-xs font-semibold text-indigo-600">${esc(item.context)} · 2 Marks</div>
            <h2 class="text-base sm:text-lg font-bold text-slate-900">Select the Best Data Type &amp; Validation Check</h2>
          </div>
          <span class="font-mono tabular-nums text-xs font-semibold text-slate-500">Field ${safeIdx + 1} of ${DATA_RULE_DRILLS.length}</span>
        </div>

        <p class="text-sm font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-4">
          ${esc(item.fieldDescription)}
        </p>

        <div class="space-y-2">
          <div class="text-xs font-bold text-slate-900">1. Choose the most appropriate OCR Data Type (1 mark)</div>
          <div class="grid grid-cols-2 gap-2.5">
            ${item.dataTypeOptions
              .map((dt) => {
                const picked = sel.dataType === dt;
                let cls = picked
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-800';
                if (sel.checked) {
                  if (dt === item.correctDataType) cls = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold';
                  else if (picked) cls = 'bg-rose-50 border-rose-400 text-rose-950 font-bold';
                }
                return `
                  <button type="button" data-ta3-dr-type="${item.id}:${esc(dt)}"
                    class="px-3.5 py-2.5 rounded-xl border text-left text-xs sm:text-sm font-semibold transition-colors ${cls}">
                    ${esc(dt)}
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>

        <div class="space-y-2">
          <div class="text-xs font-bold text-slate-900">2. Choose the primary Validation Check (1 mark)</div>
          <div class="grid grid-cols-2 gap-2.5">
            ${item.checkOptions
              .map((chk) => {
                const picked = sel.check === chk;
                let cls = picked
                  ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-semibold'
                  : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-700';
                if (sel.checked) {
                  if (chk === item.correctCheck) cls = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold';
                  else if (picked) cls = 'bg-rose-50 border-rose-400 text-rose-950 font-bold';
                }
                return `
                  <button type="button" data-ta3-dr-check="${item.id}:${esc(chk)}"
                    class="px-3.5 py-2.5 rounded-xl border text-left text-xs sm:text-sm font-semibold transition-colors ${cls}">
                    ${esc(chk)}
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <button type="button" data-ta3-dr-nav="-1" ${safeIdx === 0 ? 'disabled' : ''}
            class="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40">
            ← Previous Field
          </button>
          <div class="flex items-center gap-2">
            <button type="button" data-ta3-dr-submit="${item.id}" ${!sel.dataType || !sel.check ? 'disabled' : ''}
              class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors">
              Check Answer (2 Marks)
            </button>
            <button type="button" data-ta3-dr-nav="1" ${safeIdx === DATA_RULE_DRILLS.length - 1 ? 'disabled' : ''}
              class="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-40">
              Next Field →
            </button>
          </div>
        </div>

        ${
          res
            ? `
              <div data-testid="ta3-dr-feedback" class="p-4 rounded-xl border ${res.marksEarned === 2 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'} text-xs space-y-1">
                <div class="font-bold text-slate-900 font-mono tabular-nums">
                  Awarded ${res.marksEarned} / ${res.maxMarks} Marks · Data Type: ${res.typeCorrect ? '✓ Correct' : '✗ Review'} · Validation Check: ${res.checkCorrect ? '✓ Correct' : '✗ Review'}
                </div>
                <p class="text-slate-700">${esc(item.explanation)}</p>
              </div>
            `
            : ''
        }
      </div>

      <div class="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div>
          <div class="text-xs font-semibold text-emerald-700">OCR Exam Key</div>
          <h3 class="text-sm font-bold text-slate-900">Data Types &amp; Trigger Clues</h3>
        </div>
        <dl class="space-y-2.5 text-xs">
          <div class="pb-2 border-b border-slate-100"><dt class="font-bold text-slate-900">Integer</dt><dd class="text-slate-600">Whole numbers used in calculations (age, stock quantity, score).</dd></div>
          <div class="pb-2 border-b border-slate-100"><dt class="font-bold text-slate-900">Real / Float</dt><dd class="text-slate-600">Numbers with decimals (prices £12.99, weights, sensor readings).</dd></div>
          <div class="pb-2 border-b border-slate-100"><dt class="font-bold text-slate-900">String / Text</dt><dd class="text-slate-600">Letters, mixed codes, AND phone/card numbers (preserves leading zeros!).</dd></div>
          <div class="pb-2 border-b border-slate-100"><dt class="font-bold text-slate-900">Boolean</dt><dd class="text-slate-600">Two-state logic values only: True/False or Yes/No.</dd></div>
          <div><dt class="font-bold text-slate-900">Date / Time</dt><dd class="text-slate-600">Calendar dates (DD/MM/YYYY) or timestamps.</dd></div>
        </dl>
      </div>
    </div>
  `;
}

export function renderTa3Simulator(): void {
  if (!containerEl) return;
  const summary = computeTa3MasterySummary(uiState.progress);

  let bodyHtml = '';
  if (uiState.activeTab === 'sandbox') {
    bodyHtml = renderSandboxTab();
  } else if (uiState.activeTab === 'testplan') {
    bodyHtml = renderTestPlanTab();
  } else if (uiState.activeTab === 'verification') {
    bodyHtml = renderVerificationTab();
  } else {
    bodyHtml = renderDataRulesTab();
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

function runValidationForField(scenario: ValidationScenario, fieldId: string): FieldValidationResult | null {
  const field = scenario.fields.find((f) => f.id === fieldId);
  if (!field) return null;
  const value = uiState.fieldValues[field.id] ?? '';
  const toggles = uiState.fieldRuleToggles[field.id];
  const res = evaluateFieldValidation(field, value, toggles);
  uiState.fieldResults[field.id] = res;

  // Check if any scenario missions were completed (only when rules aren't turned off)
  let missionUnlocked = false;
  if (!res.disabledBypassWarning) {
    for (const mission of scenario.missions) {
      if (!uiState.progress.completedMissions[mission.id] && checkValidationMission(mission, res)) {
        uiState.progress.completedMissions[mission.id] = true;
        missionUnlocked = true;
      }
    }
  }
  if (missionUnlocked) {
    saveProgress(uiState.progress);
    if (onShowToastCb) onShowToastCb('TA3 Validation Mission completed!', 'success');
  }
  return res;
}

function handleClick(e: Event): void {
  const target = e.target as HTMLElement | null;
  if (!target) return;

  const tabBtn = target.closest<HTMLElement>('[data-ta3-tab]');
  if (tabBtn) {
    uiState.activeTab = tabBtn.dataset.ta3Tab as Ta3SimulatorTab;
    renderTa3Simulator();
    return;
  }

  const scenarioBtn = target.closest<HTMLElement>('[data-ta3-scenario]');
  if (scenarioBtn) {
    uiState.scenarioId = scenarioBtn.dataset.ta3Scenario!;
    const sc = getActiveScenario();
    uiState.selectedFieldId = sc.fields[0].id;
    renderTa3Simulator();
    return;
  }

  const testFieldBtn = target.closest<HTMLElement>('[data-ta3-test-field]');
  if (testFieldBtn) {
    const fieldId = testFieldBtn.dataset.ta3TestField!;
    const sc = getActiveScenario();
    uiState.selectedFieldId = fieldId;
    runValidationForField(sc, fieldId);
    renderTa3Simulator();
    return;
  }

  const actionBtn = target.closest<HTMLElement>('[data-ta3-action]');
  if (actionBtn) {
    const sc = getActiveScenario();
    if (actionBtn.dataset.ta3Action === 'reset-sandbox') {
      for (const f of sc.fields) {
        uiState.fieldValues[f.id] = f.sampleValid;
        uiState.fieldRuleToggles[f.id] = {};
        uiState.fieldResults[f.id] = null;
      }
      renderTa3Simulator();
      return;
    }
    if (actionBtn.dataset.ta3Action === 'run-all-fields') {
      for (const f of sc.fields) {
        runValidationForField(sc, f.id);
      }
      renderTa3Simulator();
      return;
    }
  }

  // Test Plan handlers
  const tpBtn = target.closest<HTMLElement>('[data-ta3-testplan]');
  if (tpBtn) {
    uiState.testPlanId = tpBtn.dataset.ta3Testplan!;
    renderTa3Simulator();
    return;
  }

  const tpAction = target.closest<HTMLElement>('[data-ta3-tp-action]');
  if (tpAction) {
    const ch = TEST_PLAN_CHALLENGES.find((t) => t.id === uiState.testPlanId) || TEST_PLAN_CHALLENGES[0];
    if (tpAction.dataset.ta3TpAction === 'model') {
      const mid = Math.floor((ch.min + ch.max) / 2);
      uiState.testPlanInputs[ch.id] =
        ch.dataKind === 'integer'
          ? {
              normal: { value: String(mid), expectedOutcome: 'Accept' },
              lowerBoundary: { value: String(ch.min), expectedOutcome: 'Accept' },
              upperBoundary: { value: String(ch.max), expectedOutcome: 'Accept' },
              outOfRange: { value: String(ch.max + 1), expectedOutcome: 'Reject' },
              wrongType: { value: 'twenty', expectedOutcome: 'Reject' },
            }
          : {
              normal: { value: '1'.repeat(mid), expectedOutcome: 'Accept' },
              lowerBoundary: { value: '1'.repeat(ch.min), expectedOutcome: 'Accept' },
              upperBoundary: { value: '9'.repeat(ch.max), expectedOutcome: 'Accept' },
              outOfRange: { value: '1'.repeat(Math.max(1, ch.min - 1)), expectedOutcome: 'Reject' },
              wrongType: { value: 'abcd', expectedOutcome: 'Reject' },
            };
      uiState.testPlanResults[ch.id] = evaluateTestPlanSubmission(ch, uiState.testPlanInputs[ch.id]);
      renderTa3Simulator();
      return;
    }
    if (tpAction.dataset.ta3TpAction === 'check') {
      const res = evaluateTestPlanSubmission(ch, uiState.testPlanInputs[ch.id]);
      uiState.testPlanResults[ch.id] = res;
      const prev = uiState.progress.completedTestPlans[ch.id];
      uiState.progress.completedTestPlans[ch.id] = {
        bestMarks: Math.max(prev?.bestMarks || 0, res.marksEarned),
        maxMarks: res.maxMarks,
      };
      saveProgress(uiState.progress);
      if (onShowToastCb) {
        onShowToastCb(
          res.marksEarned === res.maxMarks
            ? `Full marks! ${res.marksEarned}/${res.maxMarks} on ${ch.title}.`
            : `Scored ${res.marksEarned}/${res.maxMarks} — check highlighted rows.`,
          res.marksEarned === res.maxMarks ? 'success' : 'info'
        );
      }
      renderTa3Simulator();
      return;
    }
  }

  // Verification simulator & drill handlers
  const verifFieldBtn = target.closest<HTMLElement>('[data-ta3-verif-field]');
  if (verifFieldBtn) {
    uiState.verifDemoFieldId = verifFieldBtn.dataset.ta3VerifField!;
    const df = VERIFICATION_DEMO_FIELDS.find((f) => f.id === uiState.verifDemoFieldId) || VERIFICATION_DEMO_FIELDS[0];
    uiState.verifEntry1 = df.id === 'v-dob' ? '14/08/2008' : 'M14 5TP';
    uiState.verifEntry2 = df.sourceValue;
    uiState.verifDemoResult = null;
    renderTa3Simulator();
    return;
  }

  const verifAction = target.closest<HTMLElement>('[data-ta3-verif-action]');
  if (verifAction && verifAction.dataset.ta3VerifAction === 'run-demo') {
    const df = VERIFICATION_DEMO_FIELDS.find((f) => f.id === uiState.verifDemoFieldId) || VERIFICATION_DEMO_FIELDS[0];
    uiState.verifDemoResult = evaluateDoubleEntrySimulation(df, uiState.verifEntry1, uiState.verifEntry2);
    renderTa3Simulator();
    return;
  }

  const vdCat = target.closest<HTMLElement>('[data-ta3-vd-cat]');
  if (vdCat) {
    const [id, cat] = vdCat.dataset.ta3VdCat!.split(':');
    const cur = uiState.verifDrillSelections[id] || { category: '', technique: '', checked: false };
    uiState.verifDrillSelections[id] = { ...cur, category: cat, checked: false };
    renderTa3Simulator();
    return;
  }

  const vdTech = target.closest<HTMLElement>('[data-ta3-vd-tech]');
  if (vdTech) {
    const idx = vdTech.dataset.ta3VdTech!.indexOf(':');
    const id = vdTech.dataset.ta3VdTech!.slice(0, idx);
    const tech = vdTech.dataset.ta3VdTech!.slice(idx + 1);
    const cur = uiState.verifDrillSelections[id] || { category: '', technique: '', checked: false };
    uiState.verifDrillSelections[id] = { ...cur, technique: tech, checked: false };
    renderTa3Simulator();
    return;
  }

  const vdCheck = target.closest<HTMLElement>('[data-ta3-vd-check]');
  if (vdCheck) {
    const id = vdCheck.dataset.ta3VdCheck!;
    const drill = VERIFICATION_DRILLS.find((d) => d.id === id);
    const cur = uiState.verifDrillSelections[id];
    if (drill && cur && cur.category && cur.technique) {
      cur.checked = true;
      if (cur.category === drill.correctCategory && cur.technique === drill.correctTechnique) {
        uiState.progress.completedVerifications[id] = true;
        saveProgress(uiState.progress);
      }
      renderTa3Simulator();
    }
    return;
  }

  const vdNav = target.closest<HTMLElement>('[data-ta3-vd-nav]');
  if (vdNav) {
    uiState.verifDrillIdx += Number(vdNav.dataset.ta3VdNav);
    renderTa3Simulator();
    return;
  }

  // Data Types & Rules handlers
  const drType = target.closest<HTMLElement>('[data-ta3-dr-type]');
  if (drType) {
    const idx = drType.dataset.ta3DrType!.indexOf(':');
    const id = drType.dataset.ta3DrType!.slice(0, idx);
    const dt = drType.dataset.ta3DrType!.slice(idx + 1);
    const cur = uiState.dataRuleSelections[id] || { dataType: '', check: '', checked: false };
    uiState.dataRuleSelections[id] = { ...cur, dataType: dt, checked: false };
    renderTa3Simulator();
    return;
  }

  const drCheck = target.closest<HTMLElement>('[data-ta3-dr-check]');
  if (drCheck) {
    const idx = drCheck.dataset.ta3DrCheck!.indexOf(':');
    const id = drCheck.dataset.ta3DrCheck!.slice(0, idx);
    const chk = drCheck.dataset.ta3DrCheck!.slice(idx + 1);
    const cur = uiState.dataRuleSelections[id] || { dataType: '', check: '', checked: false };
    uiState.dataRuleSelections[id] = { ...cur, check: chk, checked: false };
    renderTa3Simulator();
    return;
  }

  const drSubmit = target.closest<HTMLElement>('[data-ta3-dr-submit]');
  if (drSubmit) {
    const id = drSubmit.dataset.ta3DrSubmit!;
    const item = DATA_RULE_DRILLS.find((d) => d.id === id);
    const cur = uiState.dataRuleSelections[id];
    if (item && cur && cur.dataType && cur.check) {
      cur.checked = true;
      const res = evaluateDataRuleDrill(item, cur.dataType, cur.check);
      if (res.marksEarned === 2) {
        uiState.progress.completedDataRules[id] = true;
        saveProgress(uiState.progress);
      }
      renderTa3Simulator();
    }
    return;
  }

  const drNav = target.closest<HTMLElement>('[data-ta3-dr-nav]');
  if (drNav) {
    uiState.dataRuleIdx += Number(drNav.dataset.ta3DrNav);
    renderTa3Simulator();
    return;
  }
}

function handleInput(e: Event): void {
  const target = e.target as HTMLInputElement | null;
  if (!target) return;

  if (target.dataset.ta3FieldInput) {
    const fieldId = target.dataset.ta3FieldInput;
    uiState.fieldValues[fieldId] = target.value;
    uiState.selectedFieldId = fieldId;
    return;
  }

  if (target.dataset.ta3TpVal) {
    const key = target.dataset.ta3TpVal as 'normal' | 'lowerBoundary' | 'upperBoundary' | 'outOfRange' | 'wrongType';
    const ch = TEST_PLAN_CHALLENGES.find((t) => t.id === uiState.testPlanId) || TEST_PLAN_CHALLENGES[0];
    uiState.testPlanInputs[ch.id][key].value = target.value;
    uiState.testPlanResults[ch.id] = null;
    // Update the SVG boundary plotter live without losing input focus!
    const svgHost = containerEl?.querySelector('[data-testid="ta3-boundary-svg"]')?.parentElement;
    if (svgHost) {
      svgHost.innerHTML = renderBoundaryScaleSvg(ch, uiState.testPlanInputs[ch.id]);
    }
    return;
  }

  if (target.dataset.ta3VerifInput) {
    if (target.dataset.ta3VerifInput === '1') uiState.verifEntry1 = target.value;
    if (target.dataset.ta3VerifInput === '2') uiState.verifEntry2 = target.value;
    uiState.verifDemoResult = null;
  }
}

function handleChange(e: Event): void {
  const target = e.target as HTMLInputElement | HTMLSelectElement | null;
  if (!target) return;

  if (target.dataset.ta3RuleToggle) {
    const [fieldId, chk] = target.dataset.ta3RuleToggle.split(':') as [string, ValidationCheckType];
    if (!uiState.fieldRuleToggles[fieldId]) uiState.fieldRuleToggles[fieldId] = {};
    uiState.fieldRuleToggles[fieldId][chk] = (target as HTMLInputElement).checked;
    const sc = getActiveScenario();
    runValidationForField(sc, fieldId);
    renderTa3Simulator();
    return;
  }

  if (target.dataset.ta3TpOut) {
    const key = target.dataset.ta3TpOut as 'normal' | 'lowerBoundary' | 'upperBoundary' | 'outOfRange' | 'wrongType';
    const ch = TEST_PLAN_CHALLENGES.find((t) => t.id === uiState.testPlanId) || TEST_PLAN_CHALLENGES[0];
    uiState.testPlanInputs[ch.id][key].expectedOutcome = target.value as 'Accept' | 'Reject' | '';
    uiState.testPlanResults[ch.id] = null;
  }
}

export function initTa3Simulator(options: {
  container: HTMLElement;
  onProgressChange?: (summary: Ta3MasterySummary) => void;
  onShowToast?: (msg: string, type?: string) => void;
}): void {
  containerEl = options.container;
  onProgressChangeCb = options.onProgressChange || null;
  onShowToastCb = options.onShowToast || null;

  if (!containerEl.dataset.ta3Bound) {
    containerEl.addEventListener('click', handleClick);
    containerEl.addEventListener('input', handleInput);
    containerEl.addEventListener('change', handleChange);
    containerEl.dataset.ta3Bound = '1';
  }
  uiState.progress = loadProgress();
  renderTa3Simulator();
}

export function setTa3SimulatorTab(tab: Ta3SimulatorTab): void {
  uiState.activeTab = tab;
  uiState.progress = loadProgress();
  renderTa3Simulator();
}

export function getTa3MasterySummary(): Ta3MasterySummary {
  uiState.progress = loadProgress();
  return computeTa3MasterySummary(uiState.progress);
}
