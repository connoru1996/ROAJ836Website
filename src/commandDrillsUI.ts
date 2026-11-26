import {
  COMMAND_WORD_GUIDES,
  FIX_ANSWER_CASES,
  COMMAND_WORD_DRILLS,
  EXAMINER_MARKING_CASES,
  VAGUE_PHRASE_SETS,
  evaluateFixAnswerDiagnosis,
  evaluateFixAnswerPatches,
  evaluateFreeRewrite,
  evaluateCommandWordDrill,
  evaluateExaminerMarking,
  evaluateVaguePhraseSet,
  computeCommandDrillsMasterySummary,
  type OcrCommandWord,
  type CommandDrillsProgress,
  type CommandDrillsMasterySummary,
  type DiagnosisEvaluation,
  type PatchEvaluation,
  type FreeRewriteEvaluation,
  type ExaminerMarkingEvaluation,
  type VaguePhraseSetEvaluation,
} from './commandDrillsEngine';

const STORAGE_KEY = 'OCR_R050_COMMAND_DRILLS_V1';

export type CommandDrillsTab = 'fix' | 'commands' | 'examiner' | 'vague';

interface CommandDrillsUiState {
  activeTab: CommandDrillsTab;
  // Tab 1: Fix the Answer Clinic
  fixCaseId: string;
  fixSelectedFlaws: Record<string, string[]>;
  fixDiagResults: Record<string, DiagnosisEvaluation | null>;
  fixChosenPatches: Record<string, Record<string, string>>;
  fixPatchResults: Record<string, PatchEvaluation | null>;
  fixFreeText: Record<string, string>;
  fixFreeResults: Record<string, FreeRewriteEvaluation | null>;
  fixShowModel: Record<string, boolean>;
  // Tab 2: Command Word Decoder
  activeGuideWord: OcrCommandWord;
  cmdDrillIdx: number;
  cmdSelections: Record<string, { command: string; formula: string; checked: boolean }>;
  // Tab 3: Be the Examiner
  examinerIdx: number;
  examinerSelections: Record<string, { score: number | null; reason: string; result: ExaminerMarkingEvaluation | null }>;
  // Tab 4: Vague -> Exam-Ready
  vagueSetId: string;
  vagueSelections: Record<string, Record<string, string>>;
  vagueResults: Record<string, VaguePhraseSetEvaluation | null>;
  // Persisted mastery
  progress: CommandDrillsProgress;
}

let containerEl: HTMLElement | null = null;
let onProgressChangeCb: ((summary: CommandDrillsMasterySummary) => void) | null = null;
let onShowToastCb: ((msg: string, type?: string) => void) | null = null;

function esc(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadProgress(): CommandDrillsProgress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        completedFixCases: parsed.completedFixCases || {},
        completedCommandDrills: parsed.completedCommandDrills || {},
        completedExaminerCases: parsed.completedExaminerCases || {},
        completedVagueSets: parsed.completedVagueSets || {},
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return {
    completedFixCases: {},
    completedCommandDrills: {},
    completedExaminerCases: {},
    completedVagueSets: {},
  };
}

function saveProgress(progress: CommandDrillsProgress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage write errors
  }
  if (onProgressChangeCb) {
    onProgressChangeCb(computeCommandDrillsMasterySummary(progress));
  }
}

function createInitialState(): CommandDrillsUiState {
  return {
    activeTab: 'fix',
    fixCaseId: FIX_ANSWER_CASES[0].id,
    fixSelectedFlaws: {},
    fixDiagResults: {},
    fixChosenPatches: {},
    fixPatchResults: {},
    fixFreeText: {},
    fixFreeResults: {},
    fixShowModel: {},
    activeGuideWord: 'Explain',
    cmdDrillIdx: 0,
    cmdSelections: {},
    examinerIdx: 0,
    examinerSelections: {},
    vagueSetId: VAGUE_PHRASE_SETS[0].id,
    vagueSelections: {},
    vagueResults: {},
    progress: loadProgress(),
  };
}

let uiState: CommandDrillsUiState = createInitialState();

function renderHeaderAndTabs(summary: CommandDrillsMasterySummary): string {
  const tabs: Array<{ id: CommandDrillsTab; label: string; meta: string; icon: string }> = [
    {
      id: 'fix',
      label: 'Fix the Answer Clinic',
      meta: `${summary.fixDone}/${summary.fixTotal}`,
      icon: 'fa-wrench',
    },
    {
      id: 'commands',
      label: 'Command Word Decoder',
      meta: `${summary.commandDone}/${summary.commandTotal}`,
      icon: 'fa-bullseye',
    },
    {
      id: 'examiner',
      label: 'Be the OCR Examiner',
      meta: `${summary.examinerDone}/${summary.examinerTotal}`,
      icon: 'fa-clipboard-check',
    },
    {
      id: 'vague',
      label: 'Vague → Exam-Ready',
      meta: `${summary.vagueDone}/${summary.vagueTotal}`,
      icon: 'fa-arrow-up-right-dots',
    },
  ];

  return `
    <div class="space-y-1.5">
      <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium tabular-nums">
        <span class="font-bold text-rose-700">OCR Exam Technique Studio</span>
        <span aria-hidden="true">·</span>
        <span>Unit R050 Command Words &amp; Mark-Scheme Drills</span>
        <span aria-hidden="true">·</span>
        <span data-testid="cmd-mastery-summary">${summary.completedChallenges} of ${summary.totalChallenges} Challenges Mastered (${summary.masteryPct}%)</span>
      </div>
      <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900" style="text-wrap: balance;">
        OCR Command Word &amp; &ldquo;Fix the Answer&rdquo; Drills
      </h1>
      <p class="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
        Diagnose why weak exam answers lose marks, upgrade vague scripts into full-mark OCR responses, decode command-word mark formulas, and mark real-style scripts as the examiner.
      </p>
    </div>

    <div role="tablist" aria-label="Command Word & Fix the Answer Modes" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 p-1.5 bg-slate-200/75 rounded-2xl border border-slate-200">
      ${tabs
        .map((t) => {
          const active = uiState.activeTab === t.id;
          return `
            <button type="button" role="tab" aria-selected="${active ? 'true' : 'false'}" data-cmd-tab="${t.id}"
              class="w-full min-w-0 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between sm:justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }">
              <span class="flex items-center gap-2 min-w-0">
                <i class="fa-solid ${t.icon} shrink-0 ${active ? 'text-rose-600' : 'text-slate-400'}"></i>
                <span class="truncate">${esc(t.label)}</span>
              </span>
              <span class="font-mono tabular-nums text-[11px] shrink-0 ${active ? 'text-rose-700 font-bold' : 'text-slate-500'}">${t.meta}</span>
            </button>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderFreeRewriteFeedbackHtml(item: (typeof FIX_ANSWER_CASES)[number], freeRes: FreeRewriteEvaluation | null): string {
  if (!freeRes) {
    return `<p class="text-[11px] text-slate-500">Type your own upgraded answer above and click <strong>Scan Mark Points</strong> to check against the OCR rubric.</p>`;
  }
  return `
    <div data-testid="cmd-free-rewrite-result" class="p-3.5 rounded-xl border text-xs space-y-2 ${
      freeRes.estimatedMarks === item.maxMarks && freeRes.vagueWarnings.length === 0
        ? 'bg-emerald-50 border-emerald-200'
        : 'bg-amber-50 border-amber-200'
    }">
      <div class="flex flex-wrap items-center justify-between gap-2 font-bold text-slate-900 font-mono tabular-nums">
        <span>Rubric Match: ${freeRes.criteriaMet} / ${freeRes.totalCriteria} Mark Points</span>
        <span>Estimated: ${freeRes.estimatedMarks} / ${item.maxMarks} Marks</span>
      </div>
      <div class="space-y-1">
        ${freeRes.results
          .map(
            (r) => `
          <div class="flex items-start gap-2 text-[11px] ${r.met ? 'text-emerald-900' : 'text-slate-700'}">
            <span class="font-mono font-bold shrink-0">${r.met ? '✓' : '✗'}</span>
            <span>${esc(r.label)}</span>
          </div>
        `
          )
          .join('')}
      </div>
      ${
        freeRes.vagueWarnings.length > 0
          ? `<div class="pt-1 text-[11px] font-semibold text-rose-800">▲ Vague/banned phrase detected: ${freeRes.vagueWarnings.map((w) => `"${esc(w)}"`).join(', ')} — replace with a concrete IT mechanism.</div>`
          : ''
      }
    </div>
  `;
}

function renderFixAnswerTab(): string {
  const item = FIX_ANSWER_CASES.find((c) => c.id === uiState.fixCaseId) || FIX_ANSWER_CASES[0];
  const itemIdx = FIX_ANSWER_CASES.findIndex((c) => c.id === item.id);
  const selectedFlaws = uiState.fixSelectedFlaws[item.id] || [];
  const diagRes = uiState.fixDiagResults[item.id] || null;
  const chosenPatches = uiState.fixChosenPatches[item.id] || {};
  const patchRes = uiState.fixPatchResults[item.id] || null;
  const freeText = uiState.fixFreeText[item.id] ?? '';
  const freeRes = uiState.fixFreeResults[item.id] || null;
  const showModel = uiState.fixShowModel[item.id] === true;
  const isMastered = uiState.progress.completedFixCases[item.id] === true;

  // Build live preview of patched text
  const previewTexts: Record<string, string> = {};
  let pickedCount = 0;
  for (const slot of item.patchSlots) {
    const opt = slot.options.find((o) => o.id === chosenPatches[slot.id]);
    if (opt) {
      previewTexts[slot.id] = opt.text;
      pickedCount += 1;
    } else {
      previewTexts[slot.id] = `[Select upgrade for: ${slot.slotTitle}]`;
    }
  }
  const liveDraftText = pickedCount > 0 ? item.assembleUpgradedAnswer(previewTexts) : '';

  const guide = COMMAND_WORD_GUIDES.find((g) => g.word === item.commandWord);

  return `
    <!-- Case Selector Bar -->
    <div class="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="text-xs font-semibold text-slate-600">
          Select an OCR Script to Diagnose &amp; Upgrade (${itemIdx + 1} of ${FIX_ANSWER_CASES.length})
        </div>
        <div class="flex items-center gap-2">
          <button type="button" data-cmd-fix-nav="-1" ${itemIdx === 0 ? 'disabled' : ''}
            class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40 whitespace-nowrap">
            ← Previous
          </button>
          <button type="button" data-cmd-fix-nav="1" ${itemIdx === FIX_ANSWER_CASES.length - 1 ? 'disabled' : ''}
            class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-40 whitespace-nowrap">
            Next Script →
          </button>
        </div>
      </div>
      <div class="flex flex-wrap gap-1.5">
        ${FIX_ANSWER_CASES.map((c, idx) => {
          const active = c.id === item.id;
          const done = uiState.progress.completedFixCases[c.id] === true;
          return `
            <button type="button" data-cmd-fix-case="${c.id}"
              class="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                active
                  ? 'bg-slate-900 text-white'
                  : done
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }">
              <span class="font-mono tabular-nums opacity-75">0${idx + 1}</span>
              <span>${c.topicArea} · ${esc(c.commandWord)}</span>
              ${done ? '<span class="font-bold text-emerald-500">✓</span>' : ''}
            </button>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Two-Zone Fix-the-Answer Workbench -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Left Zone: Question, Weak vs Upgraded Script Diff, Patch Builder (7 cols) -->
      <div class="lg:col-span-7 space-y-5">
        <!-- Exam Prompt + Weak Candidate Script -->
        <div class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium tabular-nums">
              <span class="font-bold text-indigo-700">${item.topicArea}</span>
              <span aria-hidden="true">·</span>
              <span class="font-bold text-rose-700">${esc(item.commandWord)}</span>
              <span aria-hidden="true">·</span>
              <span>${esc(item.scenario)}</span>
            </div>
            <span class="font-mono tabular-nums text-xs font-bold ${isMastered ? 'text-emerald-700' : 'text-slate-600'}">
              ${isMastered ? `✓ Mastered (${item.maxMarks}/${item.maxMarks})` : `Target: ${item.maxMarks} Marks`}
            </span>
          </div>

          <h2 class="text-sm sm:text-base font-bold text-slate-900 leading-snug">
            ${esc(item.questionPrompt)}
          </h2>

          <!-- Before: Weak Script -->
          <div class="p-4 rounded-xl bg-rose-50/75 border border-rose-200 space-y-1.5">
            <div class="flex items-center justify-between gap-2 text-xs">
              <span class="font-bold text-rose-900">Before · Weak Candidate Script</span>
              <span class="font-mono tabular-nums font-bold text-rose-700">Scored ${item.weakMarks} / ${item.maxMarks} Marks</span>
            </div>
            <p class="text-sm text-slate-900 font-medium leading-relaxed">&ldquo;${esc(item.weakAnswer)}&rdquo;</p>
            <p class="text-xs text-rose-800 pt-1">${esc(item.weakExaminerNote)}</p>
          </div>

          <!-- Live Upgraded Script Preview -->
          <div class="p-4 rounded-xl border ${
            patchRes?.passed
              ? 'bg-emerald-50 border-emerald-300'
              : 'bg-slate-50 border-slate-200'
          } space-y-1.5">
            <div class="flex items-center justify-between gap-2 text-xs">
              <span class="font-bold ${patchRes?.passed ? 'text-emerald-900' : 'text-slate-700'}">
                After · Your Upgraded Script Preview
              </span>
              <span class="font-mono tabular-nums font-bold ${patchRes?.passed ? 'text-emerald-700' : 'text-indigo-700'}" data-testid="cmd-fix-score">
                ${
                  patchRes
                    ? patchRes.passed
                      ? `✓ ${item.maxMarks} / ${item.maxMarks} Marks — Full Marks!`
                      : `Projected ${patchRes.projectedMarks} / ${item.maxMarks} Marks`
                    : `${pickedCount} / ${item.patchSlots.length} Clauses Patched`
                }
              </span>
            </div>
            <p class="text-xs sm:text-sm ${liveDraftText ? 'text-slate-900 font-medium' : 'text-slate-500 italic'} leading-relaxed">
              ${liveDraftText ? `&ldquo;${esc(liveDraftText)}&rdquo;` : 'Select the strongest upgrade clause for each weak segment below to assemble a full-mark OCR response.'}
            </p>
          </div>
        </div>

        <!-- Step 2: Patch Each Weak Segment -->
        <div class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <div class="text-xs font-semibold text-indigo-600">Step 2 · Rebuild to Full Marks</div>
              <h3 class="text-sm sm:text-base font-bold text-slate-900">Replace Each Weak Fragment with Exam-Ready Clauses</h3>
            </div>
            <button type="button" data-cmd-fix-action="apply-patches"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              Apply Upgrade &amp; Check Marks
            </button>
          </div>

          <div class="space-y-5">
            ${item.patchSlots
              .map((slot) => {
                const pickedId = chosenPatches[slot.id] || '';
                const slotEval = patchRes?.slotResults.find((r) => r.slotId === slot.id) || null;
                return `
                  <div class="space-y-2.5">
                    <div class="flex flex-wrap items-baseline justify-between gap-2">
                      <div class="text-xs font-bold text-slate-900">${esc(slot.slotTitle)}</div>
                      <span class="text-[11px] font-mono text-rose-700 line-through">${esc(slot.weakFragment)}</span>
                    </div>
                    <div class="space-y-2">
                      ${slot.options
                        .map((opt) => {
                          const isPicked = pickedId === opt.id;
                          let cls = isPicked
                            ? 'bg-indigo-50 border-indigo-400 text-slate-900 font-medium'
                            : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-700';
                          if (patchRes) {
                            if (opt.isBestUpgrade && isPicked) cls = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
                            else if (isPicked && !opt.isBestUpgrade) cls = 'bg-rose-50 border-rose-400 text-rose-950 font-semibold';
                          }
                          return `
                            <button type="button" data-cmd-patch-opt="${item.id}:${slot.id}:${opt.id}"
                              class="w-full text-left px-3.5 py-2.5 rounded-xl border text-xs leading-relaxed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${cls}">
                              ${esc(opt.text)}
                            </button>
                          `;
                        })
                        .join('')}
                    </div>
                    ${
                      slotEval
                        ? `<p class="text-[11px] font-medium ${slotEval.passed ? 'text-emerald-800' : 'text-rose-800'}">
                            <span class="font-mono font-bold mr-1">${slotEval.passed ? '✓' : '✗'}</span>${esc(slotEval.note)}
                          </p>`
                        : ''
                    }
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>

        <!-- Optional Free-Write Practice with Deterministic Rubric Scanner -->
        <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div class="text-xs font-semibold text-slate-500">Optional Self-Practice</div>
              <h3 class="text-sm font-bold text-slate-900">Practice Writing Your Own Full-Mark Upgrade</h3>
            </div>
            <button type="button" data-cmd-fix-action="scan-free"
              class="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap">
              Scan Mark Points
            </button>
          </div>
          <label for="cmd-free-textarea" class="sr-only">Write your own upgraded exam answer</label>
          <textarea id="cmd-free-textarea" rows="3" data-cmd-free-input="${item.id}" placeholder="Try rewriting the weak answer in your own words using precise OCR terminology..."
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">${esc(freeText)}</textarea>
          <div id="cmd-free-rewrite-feedback">
            ${renderFreeRewriteFeedbackHtml(item, freeRes)}
          </div>
        </div>
      </div>

      <!-- Right Zone: Step 1 Diagnosis + Command Formula + Model Script (5 cols) -->
      <div class="lg:col-span-5 space-y-5">
        <!-- Step 1: Diagnose the Flaws -->
        <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div class="pb-3 border-b border-slate-100">
            <div class="text-xs font-semibold text-rose-700">Step 1 · Examiner Diagnosis</div>
            <h3 class="text-sm font-bold text-slate-900">Why Did This Candidate Lose Marks?</h3>
            <p class="text-xs text-slate-500 mt-0.5">Select all true examiner flaws in the weak script.</p>
          </div>

          <div class="space-y-2.5">
            ${item.flawOptions
              .map((flaw) => {
                const checked = selectedFlaws.includes(flaw.id);
                let cls = checked
                  ? 'bg-slate-50 border-indigo-400 text-slate-900'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700';
                if (diagRes) {
                  if (flaw.isTrueFlaw && checked) cls = 'bg-emerald-50 border-emerald-300 text-emerald-950';
                  else if (!flaw.isTrueFlaw && checked) cls = 'bg-rose-50 border-rose-300 text-rose-950';
                  else if (flaw.isTrueFlaw && !checked) cls = 'bg-amber-50 border-amber-300 text-amber-950';
                }
                return `
                  <label class="flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${cls}">
                    <input type="checkbox" data-cmd-flaw-check="${item.id}:${flaw.id}" ${checked ? 'checked' : ''}
                      class="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0">
                    <div class="space-y-1">
                      <div class="font-semibold">${esc(flaw.label)}</div>
                      ${diagRes ? `<div class="text-[11px] text-slate-600">${esc(flaw.reason)}</div>` : ''}
                    </div>
                  </label>
                `;
              })
              .join('')}
          </div>

          <button type="button" data-cmd-fix-action="check-diagnosis"
            class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors">
            Check Diagnosis
          </button>

          ${
            diagRes
              ? `
                <div data-testid="cmd-diag-feedback" class="p-3.5 rounded-xl border text-xs ${
                  diagRes.passed ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-amber-50 border-amber-200 text-amber-950'
                }">
                  <div class="font-bold font-mono">${diagRes.passed ? '✓ Diagnosis Complete' : '▲ Review Flaws'}</div>
                  <p class="mt-1">${esc(diagRes.feedback)}</p>
                </div>
              `
              : ''
          }
        </div>

        <!-- Command Word Reminder for this Case -->
        ${
          guide
            ? `
              <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-2.5">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-bold text-indigo-700">Command Word Formula</span>
                  <span class="font-mono text-slate-500">${esc(guide.word)} · ${esc(guide.typicalMarks)}</span>
                </div>
                <p class="text-xs text-slate-700 leading-relaxed">${esc(guide.markFormula)}</p>
                <div class="pt-2 border-t border-slate-100 text-[11px] text-rose-800">
                  <strong>Trap to avoid:</strong> ${esc(guide.classicTrap)}
                </div>
              </div>
            `
            : ''
        }

        <!-- Model Full-Mark Reveal -->
        <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-bold text-slate-900">Official Full-Mark Model (${item.maxMarks} Marks)</span>
            <button type="button" data-cmd-fix-action="toggle-model"
              class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline">
              ${showModel ? 'Hide Model' : 'Reveal Model'}
            </button>
          </div>
          ${
            showModel
              ? `<p class="text-xs text-slate-800 leading-relaxed bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl">${esc(item.modelFullMarkAnswer)}</p>`
              : `<p class="text-xs text-slate-500">Try diagnosing and patching the script first, or reveal the full-mark exemplar to compare wording.</p>`
          }
        </div>
      </div>
    </div>
  `;
}

function renderCommandWordTab(): string {
  const activeGuide = COMMAND_WORD_GUIDES.find((g) => g.word === uiState.activeGuideWord) || COMMAND_WORD_GUIDES[4];
  const safeIdx = Math.max(0, Math.min(uiState.cmdDrillIdx, COMMAND_WORD_DRILLS.length - 1));
  const drill = COMMAND_WORD_DRILLS[safeIdx];
  const sel = uiState.cmdSelections[drill.id] || { command: '', formula: '', checked: false };
  const evalRes = sel.checked ? evaluateCommandWordDrill(drill, sel.command, sel.formula) : null;

  return `
    <!-- Interactive OCR Command Word Cheat Bar -->
    <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div class="text-xs font-semibold text-indigo-600">Interactive Reference</div>
          <h2 class="text-sm sm:text-base font-bold text-slate-900">Official OCR Unit R050 Command Word Decoder</h2>
        </div>
        <span class="text-xs text-slate-500">Click any command word to inspect its mark formula</span>
      </div>

      <div class="flex flex-wrap gap-1.5">
        ${COMMAND_WORD_GUIDES.map((g) => {
          const active = g.word === activeGuide.word;
          return `
            <button type="button" data-cmd-guide="${esc(g.word)}"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                active ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }">
              ${esc(g.word)}
            </button>
          `;
        }).join('')}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
        <div class="space-y-1">
          <div class="font-bold text-slate-900">${esc(activeGuide.word)} · <span class="font-mono text-indigo-700">${esc(activeGuide.typicalMarks)}</span></div>
          <p class="text-slate-700 leading-relaxed">${esc(activeGuide.markFormula)}</p>
        </div>
        <div class="space-y-1">
          <div class="font-bold text-emerald-800">High-Band Stem</div>
          <p class="text-slate-700 italic leading-relaxed">${esc(activeGuide.sentenceStarter)}</p>
        </div>
        <div class="space-y-1">
          <div class="font-bold text-rose-800">Classic Examiner Trap</div>
          <p class="text-slate-700 leading-relaxed">${esc(activeGuide.classicTrap)}</p>
        </div>
      </div>
    </div>

    <!-- Command Word Matching Drill -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <div class="text-xs font-semibold text-rose-700">${drill.topicArea} · ${esc(drill.scenario)} · 2-Mark Drill</div>
            <h3 class="text-base font-bold text-slate-900">Decode the Command Word &amp; Mark Formula</h3>
          </div>
          <span class="font-mono tabular-nums text-xs font-semibold text-slate-500">Drill ${safeIdx + 1} of ${COMMAND_WORD_DRILLS.length}</span>
        </div>

        <div class="p-4 rounded-xl bg-slate-900 text-white text-sm font-medium leading-relaxed">
          ${esc(drill.questionStem)}
        </div>

        <div class="space-y-2">
          <div class="text-xs font-bold text-slate-900">1. Which OCR Command Word belongs in the blank? (1 mark)</div>
          <div class="grid grid-cols-2 gap-2.5">
            ${drill.commandOptions
              .map((cmd) => {
                const picked = sel.command === cmd;
                let cls = picked
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-800';
                if (sel.checked) {
                  if (cmd === drill.correctCommand) cls = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold';
                  else if (picked) cls = 'bg-rose-50 border-rose-400 text-rose-950 font-bold';
                }
                return `
                  <button type="button" data-cmd-drill-word="${drill.id}:${esc(cmd)}"
                    class="px-3.5 py-2.5 rounded-xl border text-left text-xs sm:text-sm font-semibold transition-colors ${cls}">
                    ${esc(cmd)}
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>

        <div class="space-y-2">
          <div class="text-xs font-bold text-slate-900">2. Which answer structure earns full marks? (1 mark)</div>
          <div class="space-y-2">
            ${drill.formulaOptions
              .map((form, idx) => {
                const picked = sel.formula === form;
                let cls = picked
                  ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-semibold'
                  : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-700';
                if (sel.checked) {
                  if (form === drill.correctFormula) cls = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold';
                  else if (picked) cls = 'bg-rose-50 border-rose-400 text-rose-950 font-bold';
                }
                return `
                  <button type="button" data-cmd-drill-formula="${drill.id}:${idx}"
                    class="w-full px-3.5 py-2.5 rounded-xl border text-left text-xs leading-relaxed transition-colors ${cls}">
                    ${esc(form)}
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <button type="button" data-cmd-drill-nav="-1" ${safeIdx === 0 ? 'disabled' : ''}
            class="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40">
            ← Previous Drill
          </button>
          <div class="flex items-center gap-2">
            <button type="button" data-cmd-drill-submit="${drill.id}" ${!sel.command || !sel.formula ? 'disabled' : ''}
              class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors">
              Check Answer (2 Marks)
            </button>
            <button type="button" data-cmd-drill-nav="1" ${safeIdx === COMMAND_WORD_DRILLS.length - 1 ? 'disabled' : ''}
              class="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-40">
              Next Drill →
            </button>
          </div>
        </div>

        ${
          evalRes
            ? `
              <div data-testid="cmd-drill-feedback" class="p-4 rounded-xl border text-xs space-y-1 ${
                evalRes.marksEarned === 2 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
              }">
                <div class="font-bold text-slate-900 font-mono tabular-nums">
                  Awarded ${evalRes.marksEarned} / 2 Marks · Command Word: ${evalRes.commandCorrect ? '✓ Correct' : '✗ Review'} · Formula: ${evalRes.formulaCorrect ? '✓ Correct' : '✗ Review'}
                </div>
                <p class="text-slate-700 leading-relaxed">${esc(drill.examinerTip)}</p>
              </div>
            `
            : ''
        }
      </div>

      <!-- Right Progress Ladder -->
      <div class="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div>
          <div class="text-xs font-semibold text-slate-500">Command Word Checklist</div>
          <h3 class="text-sm font-bold text-slate-900">8 Exam Drills</h3>
        </div>
        <div class="space-y-1.5">
          ${COMMAND_WORD_DRILLS.map((d, idx) => {
            const done = uiState.progress.completedCommandDrills[d.id] === true;
            const current = idx === safeIdx;
            return `
              <button type="button" data-cmd-drill-jump="${idx}"
                class="w-full px-3 py-2 rounded-xl border text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                  current
                    ? 'bg-slate-900 border-slate-900 text-white font-semibold'
                    : done
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950 font-medium'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                }">
                <span class="truncate"><span class="font-mono mr-1.5 opacity-75">0${idx + 1}</span>${d.topicArea} · ${d.marks}m</span>
                <span class="font-mono font-bold shrink-0">${done ? '✓' : current ? '●' : '–'}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderExaminerTab(): string {
  const safeIdx = Math.max(0, Math.min(uiState.examinerIdx, EXAMINER_MARKING_CASES.length - 1));
  const item = EXAMINER_MARKING_CASES[safeIdx];
  const sel = uiState.examinerSelections[item.id] || { score: null, reason: '', result: null };
  const scoreChoices = Array.from({ length: item.maxMarks + 1 }, (_, i) => i);

  return `
    <!-- Script Selector Bar -->
    <div class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-1.5">
        ${EXAMINER_MARKING_CASES.map((c, idx) => {
          const active = idx === safeIdx;
          const done = uiState.progress.completedExaminerCases[c.id] === true;
          return `
            <button type="button" data-cmd-exam-jump="${idx}"
              class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                active
                  ? 'bg-slate-900 text-white'
                  : done
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }">
              <span class="font-mono opacity-75">Script ${idx + 1}</span>
              <span>${c.topicArea} (${c.maxMarks}m)</span>
              ${done ? '<span class="text-emerald-500 font-bold">✓</span>' : ''}
            </button>
          `;
        }).join('')}
      </div>
      <div class="flex items-center gap-2">
        <button type="button" data-cmd-exam-nav="-1" ${safeIdx === 0 ? 'disabled' : ''}
          class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 disabled:opacity-40">
          ← Previous
        </button>
        <button type="button" data-cmd-exam-nav="1" ${safeIdx === EXAMINER_MARKING_CASES.length - 1 ? 'disabled' : ''}
          class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-40">
          Next Script →
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Left: Question, Mark Scheme & Candidate Script (7 cols) -->
      <div class="lg:col-span-7 space-y-5">
        <div class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs">
            <div class="flex items-center gap-2 text-slate-500 font-medium">
              <span class="font-bold text-indigo-700">${item.topicArea}</span>
              <span aria-hidden="true">·</span>
              <span class="font-bold text-slate-900">${esc(item.commandWord)}</span>
              <span aria-hidden="true">·</span>
              <span>${esc(item.scenario)}</span>
            </div>
            <span class="font-mono tabular-nums font-bold text-slate-700">Max ${item.maxMarks} Marks</span>
          </div>

          <h2 class="text-sm sm:text-base font-bold text-slate-900">${esc(item.questionPrompt)}</h2>

          <!-- Official Mark Scheme -->
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div class="text-xs font-bold text-slate-900">Official OCR Mark Scheme</div>
            <ul class="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
              ${item.markSchemePoints.map((pt) => `<li>${esc(pt)}</li>`).join('')}
            </ul>
          </div>

          <!-- Candidate Script (Plain before grading; Annotated after grading) -->
          <div class="p-4 rounded-xl border ${sel.result ? 'bg-white border-indigo-200' : 'bg-amber-50/50 border-amber-200'} space-y-3">
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-slate-900">${sel.result ? 'Official Examiner-Annotated Script' : 'Candidate Script to Mark'}</span>
              ${
                sel.result
                  ? `<span class="font-mono font-bold text-indigo-700">Official Score: ${item.correctMarks} / ${item.maxMarks}</span>`
                  : `<span class="text-amber-800 font-medium">Read carefully against mark scheme</span>`
              }
            </div>

            ${
              sel.result
                ? `
                  <div data-testid="cmd-examiner-annotations" class="space-y-2.5">
                    ${item.annotatedClauses
                      .map(
                        (cl) => `
                      <div class="p-3 rounded-xl border text-xs space-y-1 ${
                        cl.credit === 'awarded'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                          : 'bg-rose-50 border-rose-200 text-rose-950'
                      }">
                        <div class="flex items-start justify-between gap-2">
                          <span class="font-semibold">&ldquo;${esc(cl.text)}&rdquo;</span>
                          <span class="font-mono font-bold shrink-0 ${cl.credit === 'awarded' ? 'text-emerald-700' : 'text-rose-700'}">${esc(cl.tag)}</span>
                        </div>
                        <p class="text-[11px] text-slate-700">${esc(cl.note)}</p>
                      </div>
                    `
                      )
                      .join('')}
                  </div>
                `
                : `<p class="text-sm font-medium text-slate-900 leading-relaxed">&ldquo;${esc(item.candidateScript)}&rdquo;</p>`
            }
          </div>
        </div>
      </div>

      <!-- Right: Examiner Marking Controls (5 cols) -->
      <div class="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
        <div class="pb-3 border-b border-slate-100">
          <div class="text-xs font-semibold text-indigo-600">Examiner Desk</div>
          <h3 class="text-sm font-bold text-slate-900">Award the Exact OCR Mark &amp; Rationale</h3>
        </div>

        <div class="space-y-2">
          <div class="text-xs font-bold text-slate-900">1. How many marks does this script earn?</div>
          <div class="flex flex-wrap gap-2">
            ${scoreChoices
              .map((sc) => {
                const picked = sel.score === sc;
                let cls = picked
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-800';
                if (sel.result) {
                  if (sc === item.correctMarks) cls = 'bg-emerald-600 border-emerald-600 text-white';
                  else if (picked) cls = 'bg-rose-600 border-rose-600 text-white';
                }
                return `
                  <button type="button" data-cmd-exam-score="${item.id}:${sc}"
                    class="flex-1 min-w-[52px] py-2.5 rounded-xl border font-mono tabular-nums text-xs font-bold transition-colors ${cls}">
                    ${sc} / ${item.maxMarks}
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>

        <div class="space-y-2">
          <div class="text-xs font-bold text-slate-900">2. Select the examiner justification</div>
          <div class="space-y-2">
            ${item.reasonOptions
              .map((reason, idx) => {
                const picked = sel.reason === reason;
                let cls = picked
                  ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-semibold'
                  : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-700';
                if (sel.result) {
                  if (reason === item.correctReason) cls = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold';
                  else if (picked) cls = 'bg-rose-50 border-rose-400 text-rose-950 font-bold';
                }
                return `
                  <button type="button" data-cmd-exam-reason="${item.id}:${idx}"
                    class="w-full p-3 rounded-xl border text-left text-xs leading-relaxed transition-colors ${cls}">
                    ${esc(reason)}
                  </button>
                `;
              })
              .join('')}
          </div>
        </div>

        <button type="button" data-cmd-exam-submit="${item.id}" ${sel.score === null || !sel.reason ? 'disabled' : ''}
          class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-colors">
          Submit Examiner Judgement
        </button>

        ${
          sel.result
            ? `
              <div data-testid="cmd-examiner-feedback" class="p-4 rounded-xl border text-xs space-y-1 ${
                sel.result.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
              }">
                <div class="font-bold text-slate-900 font-mono">
                  ${
                    sel.result.passed
                      ? '✓ Exact Examiner Match — Script Mastered!'
                      : `Review · Score: ${sel.result.scoreCorrect ? '✓' : `✗ (Official: ${item.correctMarks}/${item.maxMarks})`} · Rationale: ${sel.result.reasonCorrect ? '✓' : '✗'}`
                  }
                </div>
                <p class="text-slate-700 leading-relaxed">${esc(item.examinerVerdict)}</p>
              </div>
            `
            : ''
        }
      </div>
    </div>
  `;
}

function renderVagueTab(): string {
  const activeSet = VAGUE_PHRASE_SETS.find((s) => s.id === uiState.vagueSetId) || VAGUE_PHRASE_SETS[0];
  const selections = uiState.vagueSelections[activeSet.id] || {};
  const setRes = uiState.vagueResults[activeSet.id] || null;

  return `
    <!-- Set Selector Bar -->
    <div class="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2">
        ${VAGUE_PHRASE_SETS.map((s) => {
          const active = s.id === activeSet.id;
          const done = uiState.progress.completedVagueSets[s.id] === true;
          return `
            <button type="button" data-cmd-vague-set="${s.id}"
              class="px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                active
                  ? 'bg-slate-900 text-white'
                  : done
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }">
              <span>${esc(s.title)}</span>
              ${done ? '<span class="text-emerald-500 font-bold">✓</span>' : ''}
            </button>
          `;
        }).join('')}
      </div>
      <button type="button" data-cmd-vague-submit="${activeSet.id}"
        class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap">
        Grade Set (4 Clauses)
      </button>
    </div>

    <!-- Set Intro + Score Banner -->
    <div class="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div class="text-xs font-semibold text-rose-700">${esc(activeSet.topicBand)} · Banned Vague Phrases Clinic</div>
        <h2 class="text-base font-bold text-slate-900">${esc(activeSet.title)}</h2>
        <p class="text-xs text-slate-600 mt-0.5">${esc(activeSet.description)}</p>
      </div>
      ${
        setRes
          ? `<div data-testid="cmd-vague-score" class="px-4 py-2 rounded-xl border font-mono tabular-nums text-xs font-bold shrink-0 ${
              setRes.passed ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-amber-50 border-amber-300 text-amber-900'
            }">
              ${setRes.passed ? `✓ 4 / 4 Mastered!` : `${setRes.correctCount} / ${setRes.totalCount} Exam-Ready`}
            </div>`
          : `<span class="text-xs font-mono tabular-nums text-slate-500 shrink-0">Score 4/4 to master set</span>`
      }
    </div>

    <!-- 4 Phrase Upgrade Cards -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      ${activeSet.items
        .map((item, idx) => {
          const picked = selections[item.id] || '';
          const itemEval = setRes?.itemResults.find((r) => r.itemId === item.id) || null;
          return `
            <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-3.5">
              <div class="flex items-center justify-between gap-2 text-xs">
                <span class="font-bold text-indigo-700">${item.topicArea} · ${esc(item.scenarioHint)}</span>
                <span class="font-mono text-slate-400">Clause ${idx + 1}/4</span>
              </div>
              <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                <span class="font-bold text-rose-800 mr-1.5">Banned Weak Phrase:</span>
                <span class="font-semibold text-slate-900">${esc(item.weakPhrase)}</span>
              </div>
              <div class="space-y-2">
                ${item.options
                  .map((opt) => {
                    const isPicked = picked === opt.id;
                    let cls = isPicked
                      ? 'bg-indigo-50 border-indigo-400 text-slate-900 font-semibold'
                      : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-700';
                    if (setRes) {
                      if (opt.isExamReady && isPicked) cls = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
                      else if (isPicked && !opt.isExamReady) cls = 'bg-rose-50 border-rose-400 text-rose-950 font-semibold';
                    }
                    return `
                      <button type="button" data-cmd-vague-opt="${activeSet.id}:${item.id}:${opt.id}"
                        class="w-full p-3 rounded-xl border text-left text-xs leading-relaxed transition-colors ${cls}">
                        ${esc(opt.text)}
                      </button>
                    `;
                  })
                  .join('')}
              </div>
              ${
                itemEval
                  ? `<p class="text-[11px] font-medium ${itemEval.passed ? 'text-emerald-800' : 'text-rose-800'}">
                      <span class="font-mono font-bold mr-1">${itemEval.passed ? '✓' : '✗'}</span>${esc(itemEval.feedback)}
                    </p>`
                  : ''
              }
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

export function renderCommandDrills(): void {
  if (!containerEl) return;
  const summary = computeCommandDrillsMasterySummary(uiState.progress);

  let bodyHtml = '';
  if (uiState.activeTab === 'fix') {
    bodyHtml = renderFixAnswerTab();
  } else if (uiState.activeTab === 'commands') {
    bodyHtml = renderCommandWordTab();
  } else if (uiState.activeTab === 'examiner') {
    bodyHtml = renderExaminerTab();
  } else {
    bodyHtml = renderVagueTab();
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

  const tabBtn = target.closest<HTMLElement>('[data-cmd-tab]');
  if (tabBtn) {
    uiState.activeTab = tabBtn.dataset.cmdTab as CommandDrillsTab;
    renderCommandDrills();
    return;
  }

  // Tab 1: Fix the Answer interactions
  const fixCaseBtn = target.closest<HTMLElement>('[data-cmd-fix-case]');
  if (fixCaseBtn) {
    uiState.fixCaseId = fixCaseBtn.dataset.cmdFixCase || FIX_ANSWER_CASES[0].id;
    renderCommandDrills();
    return;
  }

  const fixNavBtn = target.closest<HTMLElement>('[data-cmd-fix-nav]');
  if (fixNavBtn) {
    const delta = Number(fixNavBtn.dataset.cmdFixNav || 0);
    const idx = FIX_ANSWER_CASES.findIndex((c) => c.id === uiState.fixCaseId);
    const nextIdx = Math.max(0, Math.min(FIX_ANSWER_CASES.length - 1, idx + delta));
    uiState.fixCaseId = FIX_ANSWER_CASES[nextIdx].id;
    renderCommandDrills();
    return;
  }

  const patchOptBtn = target.closest<HTMLElement>('[data-cmd-patch-opt]');
  if (patchOptBtn) {
    const [caseId, slotId, optId] = (patchOptBtn.dataset.cmdPatchOpt || '').split(':');
    if (caseId && slotId && optId) {
      if (!uiState.fixChosenPatches[caseId]) uiState.fixChosenPatches[caseId] = {};
      uiState.fixChosenPatches[caseId][slotId] = optId;
      uiState.fixPatchResults[caseId] = null;
      renderCommandDrills();
    }
    return;
  }

  const fixActionBtn = target.closest<HTMLElement>('[data-cmd-fix-action]');
  if (fixActionBtn) {
    const action = fixActionBtn.dataset.cmdFixAction;
    const item = FIX_ANSWER_CASES.find((c) => c.id === uiState.fixCaseId) || FIX_ANSWER_CASES[0];

    if (action === 'check-diagnosis') {
      const picked = uiState.fixSelectedFlaws[item.id] || [];
      const diag = evaluateFixAnswerDiagnosis(item, picked);
      uiState.fixDiagResults[item.id] = diag;
      if (diag.passed && onShowToastCb) {
        onShowToastCb('Exact flaw diagnosis! Now upgrade each weak segment.', 'success');
      }
      renderCommandDrills();
      return;
    }

    if (action === 'apply-patches') {
      const chosen = uiState.fixChosenPatches[item.id] || {};
      const patchEval = evaluateFixAnswerPatches(item, chosen);
      uiState.fixPatchResults[item.id] = patchEval;
      if (patchEval.passed) {
        const wasDone = uiState.progress.completedFixCases[item.id] === true;
        uiState.progress.completedFixCases[item.id] = true;
        saveProgress(uiState.progress);
        if (!wasDone && onShowToastCb) {
          onShowToastCb(`Upgraded to ${item.maxMarks}/${item.maxMarks} full OCR marks!`, 'success');
        }
      }
      renderCommandDrills();
      return;
    }

    if (action === 'scan-free') {
      const text = uiState.fixFreeText[item.id] || '';
      const freeEval = evaluateFreeRewrite(item, text);
      uiState.fixFreeResults[item.id] = freeEval;
      const fbEl = containerEl?.querySelector('#cmd-free-rewrite-feedback');
      if (fbEl) {
        fbEl.innerHTML = renderFreeRewriteFeedbackHtml(item, freeEval);
      } else {
        renderCommandDrills();
      }
      return;
    }

    if (action === 'toggle-model') {
      uiState.fixShowModel[item.id] = !uiState.fixShowModel[item.id];
      renderCommandDrills();
      return;
    }
  }

  // Tab 2: Command Word Decoder
  const guideBtn = target.closest<HTMLElement>('[data-cmd-guide]');
  if (guideBtn) {
    uiState.activeGuideWord = (guideBtn.dataset.cmdGuide as OcrCommandWord) || 'Explain';
    renderCommandDrills();
    return;
  }

  const drillWordBtn = target.closest<HTMLElement>('[data-cmd-drill-word]');
  if (drillWordBtn) {
    const raw = drillWordBtn.dataset.cmdDrillWord || '';
    const sep = raw.indexOf(':');
    const drillId = raw.slice(0, sep);
    const word = raw.slice(sep + 1);
    const cur = uiState.cmdSelections[drillId] || { command: '', formula: '', checked: false };
    uiState.cmdSelections[drillId] = { ...cur, command: word, checked: false };
    renderCommandDrills();
    return;
  }

  const drillFormBtn = target.closest<HTMLElement>('[data-cmd-drill-formula]');
  if (drillFormBtn) {
    const [drillId, idxStr] = (drillFormBtn.dataset.cmdDrillFormula || '').split(':');
    const drill = COMMAND_WORD_DRILLS.find((d) => d.id === drillId);
    if (drill) {
      const form = drill.formulaOptions[Number(idxStr)] || '';
      const cur = uiState.cmdSelections[drillId] || { command: '', formula: '', checked: false };
      uiState.cmdSelections[drillId] = { ...cur, formula: form, checked: false };
      renderCommandDrills();
    }
    return;
  }

  const drillSubmitBtn = target.closest<HTMLElement>('[data-cmd-drill-submit]');
  if (drillSubmitBtn) {
    const drillId = drillSubmitBtn.dataset.cmdDrillSubmit || '';
    const drill = COMMAND_WORD_DRILLS.find((d) => d.id === drillId);
    const sel = uiState.cmdSelections[drillId];
    if (drill && sel && sel.command && sel.formula) {
      sel.checked = true;
      const res = evaluateCommandWordDrill(drill, sel.command, sel.formula);
      if (res.marksEarned === 2) {
        const wasDone = uiState.progress.completedCommandDrills[drill.id] === true;
        uiState.progress.completedCommandDrills[drill.id] = true;
        saveProgress(uiState.progress);
        if (!wasDone && onShowToastCb) {
          onShowToastCb('2/2 Marks — Command Word & Mark Formula mastered!', 'success');
        }
      }
      renderCommandDrills();
    }
    return;
  }

  const drillNavBtn = target.closest<HTMLElement>('[data-cmd-drill-nav]');
  if (drillNavBtn) {
    const delta = Number(drillNavBtn.dataset.cmdDrillNav || 0);
    uiState.cmdDrillIdx = Math.max(0, Math.min(COMMAND_WORD_DRILLS.length - 1, uiState.cmdDrillIdx + delta));
    renderCommandDrills();
    return;
  }

  const drillJumpBtn = target.closest<HTMLElement>('[data-cmd-drill-jump]');
  if (drillJumpBtn) {
    uiState.cmdDrillIdx = Number(drillJumpBtn.dataset.cmdDrillJump || 0);
    renderCommandDrills();
    return;
  }

  // Tab 3: Be the Examiner
  const examJumpBtn = target.closest<HTMLElement>('[data-cmd-exam-jump]');
  if (examJumpBtn) {
    uiState.examinerIdx = Number(examJumpBtn.dataset.cmdExamJump || 0);
    renderCommandDrills();
    return;
  }

  const examNavBtn = target.closest<HTMLElement>('[data-cmd-exam-nav]');
  if (examNavBtn) {
    const delta = Number(examNavBtn.dataset.cmdExamNav || 0);
    uiState.examinerIdx = Math.max(0, Math.min(EXAMINER_MARKING_CASES.length - 1, uiState.examinerIdx + delta));
    renderCommandDrills();
    return;
  }

  const examScoreBtn = target.closest<HTMLElement>('[data-cmd-exam-score]');
  if (examScoreBtn) {
    const [caseId, scoreStr] = (examScoreBtn.dataset.cmdExamScore || '').split(':');
    const cur = uiState.examinerSelections[caseId] || { score: null, reason: '', result: null };
    uiState.examinerSelections[caseId] = { ...cur, score: Number(scoreStr), result: null };
    renderCommandDrills();
    return;
  }

  const examReasonBtn = target.closest<HTMLElement>('[data-cmd-exam-reason]');
  if (examReasonBtn) {
    const [caseId, idxStr] = (examReasonBtn.dataset.cmdExamReason || '').split(':');
    const item = EXAMINER_MARKING_CASES.find((c) => c.id === caseId);
    if (item) {
      const reason = item.reasonOptions[Number(idxStr)] || '';
      const cur = uiState.examinerSelections[caseId] || { score: null, reason: '', result: null };
      uiState.examinerSelections[caseId] = { ...cur, reason, result: null };
      renderCommandDrills();
    }
    return;
  }

  const examSubmitBtn = target.closest<HTMLElement>('[data-cmd-exam-submit]');
  if (examSubmitBtn) {
    const caseId = examSubmitBtn.dataset.cmdExamSubmit || '';
    const item = EXAMINER_MARKING_CASES.find((c) => c.id === caseId);
    const cur = uiState.examinerSelections[caseId];
    if (item && cur && cur.score !== null && cur.reason) {
      const evalRes = evaluateExaminerMarking(item, cur.score, cur.reason);
      cur.result = evalRes;
      if (evalRes.passed) {
        const wasDone = uiState.progress.completedExaminerCases[item.id] === true;
        uiState.progress.completedExaminerCases[item.id] = true;
        saveProgress(uiState.progress);
        if (!wasDone && onShowToastCb) {
          onShowToastCb('Spot-on Examiner Judgement! Script mastered.', 'success');
        }
      }
      renderCommandDrills();
    }
    return;
  }

  // Tab 4: Vague -> Exam-Ready
  const vagueSetBtn = target.closest<HTMLElement>('[data-cmd-vague-set]');
  if (vagueSetBtn) {
    uiState.vagueSetId = vagueSetBtn.dataset.cmdVagueSet || VAGUE_PHRASE_SETS[0].id;
    renderCommandDrills();
    return;
  }

  const vagueOptBtn = target.closest<HTMLElement>('[data-cmd-vague-opt]');
  if (vagueOptBtn) {
    const [setId, itemId, optId] = (vagueOptBtn.dataset.cmdVagueOpt || '').split(':');
    if (setId && itemId && optId) {
      if (!uiState.vagueSelections[setId]) uiState.vagueSelections[setId] = {};
      uiState.vagueSelections[setId][itemId] = optId;
      uiState.vagueResults[setId] = null;
      renderCommandDrills();
    }
    return;
  }

  const vagueSubmitBtn = target.closest<HTMLElement>('[data-cmd-vague-submit]');
  if (vagueSubmitBtn) {
    const setId = vagueSubmitBtn.dataset.cmdVagueSubmit || '';
    const activeSet = VAGUE_PHRASE_SETS.find((s) => s.id === setId);
    if (activeSet) {
      const res = evaluateVaguePhraseSet(activeSet, uiState.vagueSelections[setId] || {});
      uiState.vagueResults[setId] = res;
      if (res.passed) {
        const wasDone = uiState.progress.completedVagueSets[setId] === true;
        uiState.progress.completedVagueSets[setId] = true;
        saveProgress(uiState.progress);
        if (!wasDone && onShowToastCb) {
          onShowToastCb(`4/4 Exam-Ready! ${activeSet.title} mastered.`, 'success');
        }
      }
      renderCommandDrills();
    }
  }
}

function handleChange(e: Event): void {
  const target = e.target as HTMLInputElement | null;
  if (!target) return;

  if (target.dataset.cmdFlawCheck) {
    const [caseId, flawId] = target.dataset.cmdFlawCheck.split(':');
    const list = new Set(uiState.fixSelectedFlaws[caseId] || []);
    if (target.checked) list.add(flawId);
    else list.delete(flawId);
    uiState.fixSelectedFlaws[caseId] = Array.from(list);
    uiState.fixDiagResults[caseId] = null;
    renderCommandDrills();
  }
}

function handleInput(e: Event): void {
  const target = e.target as HTMLTextAreaElement | null;
  if (!target) return;
  if (target.dataset.cmdFreeInput) {
    const caseId = target.dataset.cmdFreeInput;
    uiState.fixFreeText[caseId] = target.value;
  }
}

export function getCommandDrillsMasterySummary(): CommandDrillsMasterySummary {
  return computeCommandDrillsMasterySummary(loadProgress());
}

export function initCommandDrills(
  el: HTMLElement,
  options?: {
    initialTab?: CommandDrillsTab;
    onProgressChange?: (summary: CommandDrillsMasterySummary) => void;
    onShowToast?: (msg: string, type?: string) => void;
  }
): void {
  const isNewEl = containerEl !== el;
  containerEl = el;
  onProgressChangeCb = options?.onProgressChange || null;
  onShowToastCb = options?.onShowToast || null;
  uiState.progress = loadProgress();
  if (options?.initialTab) {
    uiState.activeTab = options.initialTab;
  }
  if (isNewEl) {
    containerEl.addEventListener('click', handleClick);
    containerEl.addEventListener('change', handleChange);
    containerEl.addEventListener('input', handleInput);
  }
  renderCommandDrills();
}

export function setCommandDrillsTab(tab: CommandDrillsTab): void {
  uiState.activeTab = tab;
  renderCommandDrills();
}
