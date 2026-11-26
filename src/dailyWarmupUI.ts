import type { TopicAreaId } from './dashboardAnalytics';
import {
  SPEC_CHECKLIST_ITEMS,
  TOPIC_AREA_TITLES,
  TOPIC_ORDER,
  WARMUP_DURATION_SECONDS,
  WARMUP_QUESTIONS_PER_SPRINT,
  formatLocalDateKey,
  generateDailyWarmupSet,
  evaluateWarmupAnswer,
  computeSpecChecklistSummary,
  computeStreakSummary,
  formatCountdownMmSs,
  filterSpecChecklistItems,
  buildSpecChecklistCsv,
  type SpecConfidence,
  type SpecPracticeTarget,
  type WarmupQuestion,
  type WarmupSprintMode,
  type WarmupAnswerEvaluation,
  type DailyWarmupStorageState,
  type SpecChecklistSummary,
  type StreakSummary,
} from './dailyWarmupEngine';

const STORAGE_KEY = 'OCR_R050_DAILY_WARMUP_SPEC_V1';

export type DailyWarmupTab = 'warmup' | 'checklist';

export interface DailyWarmupOverviewSummary {
  streak: StreakSummary;
  checklist: SpecChecklistSummary;
}

export interface DailyWarmupInitOptions {
  initialTab?: DailyWarmupTab;
  onSummaryChange?: (summary: DailyWarmupOverviewSummary) => void;
  onLaunchPractice?: (target: SpecPracticeTarget) => void;
  onShowToast?: (message: string, type?: string) => void;
}

interface ActiveSprintState {
  mode: WarmupSprintMode;
  modeLabel: string;
  topicFilter?: TopicAreaId;
  timed: boolean;
  questions: WarmupQuestion[];
  currentIndex: number;
  secondsRemaining: number;
  paused: boolean;
  finished: boolean;
  timedOut: boolean;
  answers: Record<string, number | boolean | string>;
  evaluations: Record<string, WarmupAnswerEvaluation>;
  draftRecallText: string;
  validationError: string | null;
}

interface DailyWarmupUiState {
  activeTab: DailyWarmupTab;
  storage: DailyWarmupStorageState;
  timedPreference: boolean;
  selectedTopicSprint: TopicAreaId;
  activeSprint: ActiveSprintState | null;
  // Checklist filters
  checklistTopic: 'ALL' | TopicAreaId;
  checklistConfidence: 'all' | SpecConfidence;
  checklistSearch: string;
  expandedTips: Record<string, boolean>;
}

let containerEl: HTMLElement | null = null;
let onSummaryChangeCb: ((summary: DailyWarmupOverviewSummary) => void) | null = null;
let onLaunchPracticeCb: ((target: SpecPracticeTarget) => void) | null = null;
let onShowToastCb: ((message: string, type?: string) => void) | null = null;
let timerHandle: number | null = null;
let uiState: DailyWarmupUiState | null = null;

function esc(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadStorage(): DailyWarmupStorageState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        specRatings: parsed && typeof parsed.specRatings === 'object' && parsed.specRatings ? parsed.specRatings : {},
        sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : [],
        bonusCounter: typeof parsed?.bonusCounter === 'number' ? parsed.bonusCounter : 0,
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return {
    specRatings: {},
    sessions: [],
    bonusCounter: 0,
  };
}

function saveStorage(storage: DailyWarmupStorageState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch {
    // Ignore storage write errors
  }
  if (onSummaryChangeCb) {
    onSummaryChangeCb(buildOverviewSummary(storage));
  }
}

function buildOverviewSummary(storage: DailyWarmupStorageState): DailyWarmupOverviewSummary {
  const todayKey = formatLocalDateKey();
  return {
    streak: computeStreakSummary(storage.sessions, todayKey),
    checklist: computeSpecChecklistSummary(storage.specRatings),
  };
}

export function getDailyWarmupSummary(): DailyWarmupOverviewSummary {
  const storage = uiState ? uiState.storage : loadStorage();
  return buildOverviewSummary(storage);
}

export function stopDailyWarmupTimers(): void {
  if (timerHandle !== null) {
    window.clearInterval(timerHandle);
    timerHandle = null;
  }
}

function ensureTimerRunning(): void {
  stopDailyWarmupTimers();
  if (!uiState?.activeSprint) return;
  const sprint = uiState.activeSprint;
  if (!sprint.timed || sprint.paused || sprint.finished) return;

  timerHandle = window.setInterval(() => {
    if (!uiState?.activeSprint || uiState.activeSprint.paused || uiState.activeSprint.finished) {
      stopDailyWarmupTimers();
      return;
    }
    uiState.activeSprint.secondsRemaining = Math.max(0, uiState.activeSprint.secondsRemaining - 1);
    const timerTextEl = document.getElementById('dw-live-timer-text');
    if (timerTextEl) {
      timerTextEl.textContent = formatCountdownMmSs(uiState.activeSprint.secondsRemaining);
      if (uiState.activeSprint.secondsRemaining <= 60) {
        timerTextEl.classList.add('text-rose-600');
        timerTextEl.classList.remove('text-slate-900');
      }
    }
    if (uiState.activeSprint.secondsRemaining <= 0) {
      finishActiveSprint(true);
    }
  }, 1000);
}

function finishActiveSprint(timedOut = false): void {
  if (!uiState?.activeSprint || uiState.activeSprint.finished) return;
  stopDailyWarmupTimers();
  const sprint = uiState.activeSprint;
  sprint.finished = true;
  sprint.timedOut = timedOut;

  let score = 0;
  const missedSpecIds: string[] = [];
  for (const q of sprint.questions) {
    const ev = sprint.evaluations[q.id];
    if (ev && ev.isCorrect) {
      score += 1;
    } else {
      missedSpecIds.push(q.specItemId);
    }
  }

  const secondsUsed = sprint.timed
    ? Math.max(1, WARMUP_DURATION_SECONDS - sprint.secondsRemaining)
    : Math.max(1, sprint.questions.length * 20);

  const todayKey = formatLocalDateKey();
  uiState.storage.sessions.push({
    id: `wu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    dateKey: todayKey,
    mode: sprint.mode,
    score,
    total: sprint.questions.length,
    secondsUsed,
    completedAt: new Date().toISOString(),
    missedSpecIds,
  });

  if (sprint.mode === 'bonus') {
    uiState.storage.bonusCounter += 1;
  }

  saveStorage(uiState.storage);
  renderWorkspace();
}

function startSprint(mode: WarmupSprintMode, topicFilter?: TopicAreaId): void {
  if (!uiState) return;
  stopDailyWarmupTimers();

  const todayKey = formatLocalDateKey();
  const questions = generateDailyWarmupSet({
    dateKey: todayKey,
    mode,
    topicFilter,
    specRatings: uiState.storage.specRatings,
    bonusSeed: mode === 'bonus' ? uiState.storage.bonusCounter + 1 : 0,
    count: WARMUP_QUESTIONS_PER_SPRINT,
  });

  let modeLabel = "Today's 5-Minute Warm-Up";
  if (mode === 'weak-spots') modeLabel = 'Red & Amber Spec Gap Sprint';
  else if (mode === 'topic' && topicFilter) modeLabel = `${topicFilter} Focused 5-Min Sprint`;
  else if (mode === 'bonus') modeLabel = `Bonus Sprint #${uiState.storage.bonusCounter + 1}`;

  uiState.activeTab = 'warmup';
  uiState.activeSprint = {
    mode,
    modeLabel,
    topicFilter,
    timed: uiState.timedPreference,
    questions,
    currentIndex: 0,
    secondsRemaining: WARMUP_DURATION_SECONDS,
    paused: false,
    finished: false,
    timedOut: false,
    answers: {},
    evaluations: {},
    draftRecallText: '',
    validationError: null,
  };

  renderWorkspace();
  ensureTimerRunning();
}

function submitCurrentAnswer(submission: number | boolean | string): void {
  if (!uiState?.activeSprint || uiState.activeSprint.finished) return;
  const sprint = uiState.activeSprint;
  const q = sprint.questions[sprint.currentIndex];
  if (!q || sprint.evaluations[q.id]) return;

  if (q.type === 'short-recall' && String(submission).trim().length === 0) {
    sprint.validationError = 'Type a short answer or key term before checking.';
    renderWorkspace();
    return;
  }

  sprint.validationError = null;
  sprint.answers[q.id] = submission;
  sprint.evaluations[q.id] = evaluateWarmupAnswer(q, submission);
  renderWorkspace();
}

function advanceSprintQuestion(): void {
  if (!uiState?.activeSprint || uiState.activeSprint.finished) return;
  const sprint = uiState.activeSprint;
  if (sprint.currentIndex + 1 >= sprint.questions.length) {
    finishActiveSprint(false);
    return;
  }
  sprint.currentIndex += 1;
  sprint.draftRecallText = '';
  sprint.validationError = null;
  renderWorkspace();
}

function setSpecConfidence(itemId: string, confidence: SpecConfidence): void {
  if (!uiState) return;
  const current = uiState.storage.specRatings[itemId] || 'unrated';
  uiState.storage.specRatings[itemId] = current === confidence ? 'unrated' : confidence;
  saveStorage(uiState.storage);
  renderWorkspace();
}

function flagMissedSpecItemsAsRed(specIds: string[]): void {
  if (!uiState || specIds.length === 0) return;
  for (const id of specIds) {
    uiState.storage.specRatings[id] = 'red';
  }
  saveStorage(uiState.storage);
  if (onShowToastCb) {
    onShowToastCb(`Flagged ${specIds.length} missed checkpoint${specIds.length === 1 ? '' : 's'} as Needs Revision in your Spec Checklist.`, 'success');
  }
  renderWorkspace();
}

function exportChecklistCsv(): void {
  if (!uiState) return;
  const summary = buildOverviewSummary(uiState.storage);
  const csv = buildSpecChecklistCsv(uiState.storage.specRatings, summary.streak);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `OCR_R050_Spec_Checklist_${formatLocalDateKey()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (onShowToastCb) {
    onShowToastCb('R050 Specification Checklist exported to CSV.', 'success');
  }
}

function renderStreakStrip(streak: StreakSummary, checklist: SpecChecklistSummary): string {
  const todayStatusText = streak.completedToday
    ? `Completed today · Best ${streak.todayBestScore}/${streak.todayBestTotal}`
    : 'Not completed yet today';

  const dayCellsHtml = streak.last7Days
    .map((day) => {
      const boxCls = day.completed
        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
        : day.isToday
          ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
          : 'bg-slate-50 border-slate-200 text-slate-500';
      const stateIcon = day.completed
        ? '<i class="fa-solid fa-circle-check text-emerald-600 text-xs" aria-hidden="true"></i>'
        : day.isToday
          ? '<i class="fa-regular fa-clock text-indigo-600 text-xs" aria-hidden="true"></i>'
          : '<i class="fa-solid fa-minus text-slate-300 text-xs" aria-hidden="true"></i>';
      const ariaState = day.completed
        ? `Completed (${day.bestScore}/${day.bestTotal})`
        : day.isToday
          ? 'Due today'
          : 'Not completed';
      return `
        <div class="rounded-xl border ${boxCls} px-1.5 sm:px-2.5 py-2 text-center flex flex-col items-center justify-between gap-1 min-w-0" aria-label="${esc(day.weekdayShort)} ${day.dayNum}: ${esc(ariaState)}">
          <span class="text-[11px] font-semibold ${day.isToday ? 'text-indigo-700' : 'text-slate-500'}">${esc(day.weekdayShort)}</span>
          ${stateIcon}
          <span class="text-[11px] font-mono tabular-nums font-bold">${day.completed && day.bestScore !== null ? `${day.bestScore}/${day.bestTotal}` : day.dayNum}</span>
        </div>
      `;
    })
    .join('');

  return `
    <div class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
      <div class="lg:col-span-5 grid grid-cols-3 gap-3 sm:gap-4 divide-x divide-slate-200">
        <div class="pr-2">
          <div class="text-xs font-medium text-slate-500">Daily Streak</div>
          <div class="text-2xl font-extrabold text-slate-900 tabular-nums mt-0.5">${streak.currentStreak} <span class="text-xs font-semibold text-slate-500">${streak.currentStreak === 1 ? 'day' : 'days'}</span></div>
          <div class="text-[11px] text-slate-500 tabular-nums mt-0.5">Best: ${streak.bestStreak} ${streak.bestStreak === 1 ? 'day' : 'days'}</div>
        </div>
        <div class="pl-3 sm:pl-4 pr-2">
          <div class="text-xs font-medium text-slate-500">Warm-Up Accuracy</div>
          <div class="text-2xl font-extrabold text-slate-900 tabular-nums mt-0.5">${streak.overallAccuracyPct !== null ? `${streak.overallAccuracyPct}%` : '—'}</div>
          <div class="text-[11px] text-slate-500 tabular-nums mt-0.5">${streak.totalCompletedSessions} ${streak.totalCompletedSessions === 1 ? 'sprint' : 'sprints'} done</div>
        </div>
        <div class="pl-3 sm:pl-4">
          <div class="text-xs font-medium text-slate-500">Spec Exam-Ready</div>
          <div class="text-2xl font-extrabold text-emerald-700 tabular-nums mt-0.5">${checklist.greenCount}<span class="text-sm font-semibold text-slate-400">/${checklist.totalItems}</span></div>
          <div class="text-[11px] text-slate-500 tabular-nums mt-0.5">${checklist.redCount} red · ${checklist.amberCount} amber</div>
        </div>
      </div>

      <div class="lg:col-span-7 space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span class="font-bold text-slate-800">Last 7 Days Consistency</span>
          <span class="font-semibold ${streak.completedToday ? 'text-emerald-700' : 'text-indigo-700'}">${esc(todayStatusText)}</span>
        </div>
        <div class="grid grid-cols-7 gap-1.5 sm:gap-2">
          ${dayCellsHtml}
        </div>
      </div>
    </div>
  `;
}

function renderWarmupHub(summary: DailyWarmupOverviewSummary): string {
  if (!uiState) return '';
  const { streak, checklist } = summary;
  const redOrAmberCount = checklist.redCount + checklist.amberCount;
  const todayDateLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const prioritiesHtml =
    checklist.topPriorities.length > 0
      ? checklist.topPriorities
          .map((item) => {
            const rating = uiState!.storage.specRatings[item.id] || 'unrated';
            const statusText =
              rating === 'red'
                ? 'Needs Revision'
                : rating === 'amber'
                  ? 'Reviewing'
                  : 'Unrated';
            const statusCls =
              rating === 'red'
                ? 'text-rose-700'
                : rating === 'amber'
                  ? 'text-amber-700'
                  : 'text-slate-500';
            return `
              <div class="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-b-0">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 text-xs">
                    <span class="font-bold text-indigo-700 font-mono tabular-nums">${esc(item.code)}</span>
                    <span aria-hidden="true" class="text-slate-300">·</span>
                    <span class="font-semibold ${statusCls}">${statusText}</span>
                  </div>
                  <div class="text-sm font-semibold text-slate-900 truncate mt-0.5">${esc(item.title)}</div>
                </div>
                <button type="button" data-dw-action="open-checklist-topic" data-topic="${esc(item.ta)}" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0">
                  Review ${esc(item.ta)}
                </button>
              </div>
            `;
          })
          .join('')
      : `<p class="text-xs text-emerald-700 font-semibold py-3">All 30 R050 specification checkpoints are rated Exam Ready. Keep your recall sharp with daily sprints!</p>`;

  return `
    <div class="space-y-6">
      ${renderStreakStrip(streak, checklist)}

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <!-- Focal Daily Warm-Up Launch Card -->
        <div class="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 flex flex-col justify-between gap-6">
          <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-500">
              <span class="font-bold text-indigo-700">${esc(todayDateLabel)}</span>
              <span class="tabular-nums">5 Questions · 5:00 Target · TA1–TA6 Mix</span>
            </div>
            <div class="space-y-2">
              <h2 class="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900" style="text-wrap: balance;">
                ${streak.completedToday ? "You've completed today's warm-up — ready for another round?" : "Start today's 5-minute R050 warm-up"}
              </h2>
              <p class="text-sm text-slate-600 leading-relaxed">
                Five fast, exam-authentic questions combining multiple-choice, misconception True/False checks, and typed active recall. Missed questions link straight to your R050 Specification Checklist.
              </p>
            </div>

            <!-- Timer Preference Control -->
            <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div>
                <div class="text-xs font-bold text-slate-800">Sprint Pacing</div>
                <div class="text-xs text-slate-500">Run with a 05:00 exam countdown or untimed study mode</div>
              </div>
              <div class="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200" role="group" aria-label="Warm-up timer mode">
                <button type="button" data-dw-action="set-timed" data-timed="true" class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${uiState.timedPreference ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
                  5:00 Timed
                </button>
                <button type="button" data-dw-action="set-timed" data-timed="false" class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${!uiState.timedPreference ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
                  Untimed
                </button>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3 pt-2">
            <button type="button" data-dw-action="start-sprint" data-mode="daily" class="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <i class="fa-solid fa-play text-xs" aria-hidden="true"></i>
              <span>${streak.completedToday ? "Replay Today's Warm-Up" : "Start Today's 5-Min Warm-Up"}</span>
            </button>
            <button type="button" data-dw-action="start-sprint" data-mode="bonus" class="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-xs sm:text-sm rounded-xl border border-slate-200 transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <i class="fa-solid fa-shuffle text-indigo-600 text-xs" aria-hidden="true"></i>
              <span>Bonus Fresh Sprint</span>
            </button>
          </div>
        </div>

        <!-- Secondary Targeted Sprints & Priorities Deck -->
        <div class="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between gap-5">
          <div class="space-y-4">
            <div class="flex items-center justify-between gap-2">
              <h3 class="text-sm font-bold text-slate-900">Targeted 5-Minute Drills</h3>
              <span class="text-xs font-medium text-slate-500 tabular-nums">${redOrAmberCount} flagged gaps</span>
            </div>

            <!-- Weak-Spots Launcher -->
            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div class="flex items-center justify-between gap-2">
                <div class="text-xs font-bold text-slate-900">Drill Red &amp; Amber Spec Gaps</div>
                <span class="text-[11px] font-semibold text-rose-700 tabular-nums">${checklist.redCount} Red · ${checklist.amberCount} Amber</span>
              </div>
              <p class="text-xs text-slate-600 leading-relaxed">
                Automatically pulls questions tied to checkpoints you flagged as Needs Revision or Reviewing.
              </p>
              <button type="button" data-dw-action="start-sprint" data-mode="weak-spots" class="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap">
                <i class="fa-solid fa-bullseye text-amber-400 text-xs" aria-hidden="true"></i>
                <span>Start Weak-Spots Sprint</span>
              </button>
            </div>

            <!-- Single Topic Quick Sprint -->
            <div class="flex items-center gap-2">
              <label for="dw-topic-sprint-select" class="sr-only">Choose Topic Area for 5-Minute Sprint</label>
              <select id="dw-topic-sprint-select" class="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                ${TOPIC_ORDER.map(
                  (ta) =>
                    `<option value="${ta}" ${uiState!.selectedTopicSprint === ta ? 'selected' : ''}>${ta}: ${esc(TOPIC_AREA_TITLES[ta])}</option>`
                ).join('')}
              </select>
              <button type="button" data-dw-action="start-topic-sprint" class="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0">
                Drill Topic
              </button>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-100">
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-xs font-bold text-slate-800">Next Spec Priorities</span>
              <button type="button" data-dw-action="switch-tab" data-tab="checklist" class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline">
                Full Checklist
              </button>
            </div>
            <div>${prioritiesHtml}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderActiveSprint(sprint: ActiveSprintState): string {
  const q = sprint.questions[sprint.currentIndex];
  const ev = sprint.evaluations[q.id] || null;
  const currentAnswer = sprint.answers[q.id];
  const totalQ = sprint.questions.length;
  const answeredCount = Object.keys(sprint.evaluations).length;
  const correctSoFar = Object.values(sprint.evaluations).filter((item) => item.isCorrect).length;
  const typeLabel =
    q.type === 'mcq'
      ? 'Multiple Choice'
      : q.type === 'true-false'
        ? 'Misconception Check (True / False)'
        : 'Active Recall (Type Key Term)';

  const progressStepsHtml = sprint.questions
    .map((item, idx) => {
      const itemEv = sprint.evaluations[item.id];
      let barCls = 'bg-slate-200';
      if (itemEv) {
        barCls = itemEv.isCorrect ? 'bg-emerald-500' : 'bg-rose-500';
      } else if (idx === sprint.currentIndex) {
        barCls = 'bg-indigo-600';
      }
      return `<div class="h-2 rounded-full flex-1 ${barCls} transition-colors"></div>`;
    })
    .join('');

  let interactionHtml = '';
  if (q.type === 'mcq' && q.options) {
    interactionHtml = `
      <div class="grid grid-cols-1 gap-2.5" role="group" aria-label="Multiple choice options">
        ${q.options
          .map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx);
            let btnCls = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800';
            let statusMarker = '';
            if (ev) {
              if (idx === q.correctOptionIndex) {
                btnCls = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold';
                statusMarker = '<span class="text-xs font-bold text-emerald-700 ml-auto shrink-0"><i class="fa-solid fa-circle-check mr-1" aria-hidden="true"></i>Correct</span>';
              } else if (currentAnswer === idx) {
                btnCls = 'bg-rose-50 border-rose-300 text-rose-900';
                statusMarker = '<span class="text-xs font-bold text-rose-700 ml-auto shrink-0"><i class="fa-solid fa-circle-xmark mr-1" aria-hidden="true"></i>Your Choice</span>';
              } else {
                btnCls = 'bg-slate-50 border-slate-200 text-slate-500 opacity-75';
              }
            }
            return `
              <button type="button" data-dw-action="answer-mcq" data-idx="${idx}" ${ev ? 'disabled' : ''} class="w-full text-left px-4 py-3.5 rounded-xl border ${btnCls} transition-colors flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-default">
                <span class="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-slate-700 flex items-center justify-center shrink-0">${letter}</span>
                <span class="text-sm leading-snug">${esc(opt)}</span>
                ${statusMarker}
              </button>
            `;
          })
          .join('')}
      </div>
    `;
  } else if (q.type === 'true-false') {
    const tfButtons = [
      { label: 'True', val: true, icon: 'fa-check' },
      { label: 'False', val: false, icon: 'fa-xmark' },
    ];
    interactionHtml = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="True or False choices">
        ${tfButtons
          .map((item) => {
            let btnCls = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900';
            let statusNote = '';
            if (ev) {
              if (item.val === q.correctBoolean) {
                btnCls = 'bg-emerald-50 border-emerald-400 text-emerald-950';
                statusNote = '<span class="text-xs font-bold text-emerald-700">Correct Answer</span>';
              } else if (currentAnswer === item.val) {
                btnCls = 'bg-rose-50 border-rose-300 text-rose-900';
                statusNote = '<span class="text-xs font-bold text-rose-700">Your Choice</span>';
              } else {
                btnCls = 'bg-slate-50 border-slate-200 text-slate-500 opacity-75';
              }
            }
            return `
              <button type="button" data-dw-action="answer-tf" data-val="${item.val ? 'true' : 'false'}" ${ev ? 'disabled' : ''} class="px-5 py-4 rounded-xl border ${btnCls} transition-colors flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-default">
                <span class="text-base font-bold flex items-center gap-2.5">
                  <i class="fa-solid ${item.icon} text-sm" aria-hidden="true"></i>
                  <span>${item.label}</span>
                </span>
                ${statusNote}
              </button>
            `;
          })
          .join('')}
      </div>
    `;
  } else {
    interactionHtml = `
      <form id="dw-recall-form" class="space-y-3">
        <div>
          <label for="dw-recall-input" class="block text-xs font-semibold text-slate-700 mb-1.5">Type the exact OCR technical term</label>
          <div class="flex flex-col sm:flex-row gap-2.5">
            <input type="text" id="dw-recall-input" value="${esc(ev ? String(currentAnswer || '') : sprint.draftRecallText)}" ${ev ? 'disabled' : ''} placeholder="Type your answer here..." autocomplete="off"
              class="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-600" />
            ${
              !ev
                ? `<button type="submit" class="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Check Answer</button>`
                : ''
            }
          </div>
          ${sprint.validationError ? `<p class="text-xs font-semibold text-rose-700 mt-1.5">${esc(sprint.validationError)}</p>` : ''}
        </div>
      </form>
    `;
  }

  const feedbackHtml = ev
    ? `
      <div class="rounded-xl border ${ev.isCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'} p-4 sm:p-5 space-y-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2 text-sm font-bold ${ev.isCorrect ? 'text-emerald-900' : 'text-rose-900'}">
            <i class="fa-solid ${ev.isCorrect ? 'fa-circle-check text-emerald-600' : 'fa-circle-exclamation text-rose-600'}" aria-hidden="true"></i>
            <span>${esc(ev.feedbackTitle)}</span>
          </div>
          ${
            !ev.isCorrect
              ? `<span class="text-xs font-semibold text-slate-700">Expected: <strong class="text-slate-900">${esc(ev.correctAnswerDisplay)}</strong></span>`
              : ''
          }
        </div>
        <p class="text-xs sm:text-sm ${ev.isCorrect ? 'text-emerald-900/90' : 'text-rose-950/90'} leading-relaxed">
          <span class="font-bold">OCR Examiner Tip:</span> ${esc(ev.examinerNote)}
        </p>
        <div class="pt-2 flex justify-end">
          <button type="button" data-dw-action="next-question" class="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            <span>${sprint.currentIndex + 1 >= totalQ ? 'Finish & View Summary' : 'Next Question'}</span>
            <i class="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    `
    : '';

  return `
    <div class="max-w-3xl mx-auto space-y-5">
      <!-- Sprint Top Status Bar -->
      <div class="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
        <div class="space-y-0.5">
          <div class="text-xs font-semibold text-indigo-700">${esc(sprint.modeLabel)}</div>
          <div class="text-sm font-bold text-slate-900 tabular-nums">
            Question ${sprint.currentIndex + 1} of ${totalQ}
            <span class="text-slate-400 font-normal mx-1.5">·</span>
            <span class="text-slate-600 font-semibold">${correctSoFar} / ${answeredCount} correct</span>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          ${
            sprint.timed
              ? `
                <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200">
                  <i class="fa-solid fa-stopwatch text-indigo-600 text-xs" aria-hidden="true"></i>
                  <span id="dw-live-timer-text" class="font-mono tabular-nums text-sm font-bold ${sprint.secondsRemaining <= 60 ? 'text-rose-600' : 'text-slate-900'}">${formatCountdownMmSs(sprint.secondsRemaining)}</span>
                </div>
                <button type="button" data-dw-action="toggle-pause" class="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors whitespace-nowrap">
                  ${sprint.paused ? 'Resume' : 'Pause'}
                </button>
              `
              : `<span class="text-xs font-semibold text-slate-500">Untimed Mode</span>`
          }
          <button type="button" data-dw-action="cancel-sprint" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap">
            Exit Sprint
          </button>
        </div>
      </div>

      <!-- 5-Step Progress Strip -->
      <div class="flex items-center gap-2" aria-label="Warm-up progress">
        ${progressStepsHtml}
      </div>

      ${
        sprint.paused
          ? `
            <div class="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
              <h2 class="text-lg font-bold text-slate-900">Warm-Up Paused</h2>
              <p class="text-sm text-slate-600">Your countdown timer is paused at <span class="font-mono font-bold tabular-nums">${formatCountdownMmSs(sprint.secondsRemaining)}</span>.</p>
              <button type="button" data-dw-action="toggle-pause" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
                Resume Warm-Up
              </button>
            </div>
          `
          : `
            <div class="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 space-y-5">
              <div class="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-500">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-bold text-indigo-700">${esc(q.ta)} · Spec ${esc(q.specCode)}</span>
                  <span aria-hidden="true">·</span>
                  <span>${esc(TOPIC_AREA_TITLES[q.ta])}</span>
                </div>
                <span class="font-semibold text-slate-700">${esc(typeLabel)}</span>
              </div>

              <h2 class="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                ${esc(q.prompt)}
              </h2>

              ${interactionHtml}
              ${feedbackHtml}
            </div>
          `
      }
    </div>
  `;
}

function renderSprintSummary(sprint: ActiveSprintState, summary: DailyWarmupOverviewSummary): string {
  if (!uiState) return '';
  const totalQ = sprint.questions.length;
  let score = 0;
  const missedSpecIds: string[] = [];

  for (const q of sprint.questions) {
    const ev = sprint.evaluations[q.id];
    if (ev?.isCorrect) score += 1;
    else missedSpecIds.push(q.specItemId);
  }

  const uniqueMissed = Array.from(new Set(missedSpecIds));
  const pct = Math.round((score / totalQ) * 100);
  const secondsUsed = sprint.timed ? WARMUP_DURATION_SECONDS - sprint.secondsRemaining : null;

  const reviewRowsHtml = sprint.questions
    .map((q, idx) => {
      const ev = sprint.evaluations[q.id];
      const correct = Boolean(ev?.isCorrect);
      const specItem = SPEC_CHECKLIST_ITEMS.find((i) => i.id === q.specItemId);
      const currentRating = uiState!.storage.specRatings[q.specItemId] || 'unrated';
      return `
        <div class="p-4 sm:p-5 rounded-xl border border-slate-200 bg-white space-y-3">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="space-y-1 flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2 text-xs">
                <span class="font-mono font-bold text-slate-500">Q${idx + 1}</span>
                <span aria-hidden="true" class="text-slate-300">·</span>
                <span class="font-bold text-indigo-700">${esc(q.ta)} · Spec ${esc(q.specCode)}</span>
                <span aria-hidden="true" class="text-slate-300">·</span>
                <span class="font-bold ${correct ? 'text-emerald-700' : 'text-rose-700'}">
                  <i class="fa-solid ${correct ? 'fa-circle-check' : 'fa-circle-xmark'} mr-1" aria-hidden="true"></i>
                  ${correct ? '1 / 1 Mark' : '0 / 1 Mark'}
                </span>
              </div>
              <p class="text-sm font-semibold text-slate-900 leading-snug">${esc(q.prompt)}</p>
              <p class="text-xs text-slate-600 leading-relaxed">
                <span class="font-semibold text-slate-800">Answer:</span> ${esc(q.displayAnswer)} — ${esc(q.examinerNote)}
              </p>
            </div>
          </div>

          ${
            specItem
              ? `
                <div class="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div class="text-xs text-slate-600">
                    Spec Checkpoint: <strong class="text-slate-900">${esc(specItem.code)} ${esc(specItem.title)}</strong>
                  </div>
                  <div class="inline-flex items-center gap-1" role="group" aria-label="Rate confidence for ${esc(specItem.title)}">
                    ${renderRagButtons(specItem.id, specItem.title, currentRating, true)}
                  </div>
                </div>
              `
              : ''
          }
        </div>
      `;
    })
    .join('');

  return `
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-700">
              <span>${sprint.timedOut ? 'Time Up — Warm-Up Submitted' : '5-Minute Warm-Up Complete'}</span>
              <span aria-hidden="true" class="text-slate-300">·</span>
              <span class="text-slate-600 tabular-nums">${summary.streak.currentStreak}-day streak active</span>
            </div>
            <h2 class="text-2xl font-extrabold tracking-tight text-slate-900">
              You scored ${score} out of ${totalQ} (${pct}%)
            </h2>
            <p class="text-xs sm:text-sm text-slate-600">
              ${
                score === totalQ
                  ? 'Full marks! Your recall across these specification checkpoints is exam-ready.'
                  : 'Update your Spec Checklist ratings below so future Weak-Spots sprints automatically target missed topics.'
              }
            </p>
          </div>
          <div class="flex items-center gap-5 shrink-0 tabular-nums">
            <div class="text-right">
              <div class="text-3xl font-extrabold ${pct >= 80 ? 'text-emerald-700' : pct >= 60 ? 'text-amber-700' : 'text-rose-700'}">${score}/${totalQ}</div>
              <div class="text-xs text-slate-500">${secondsUsed !== null ? `Finished in ${formatCountdownMmSs(secondsUsed)}` : 'Untimed Sprint'}</div>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2.5">
            ${
              uniqueMissed.length > 0
                ? `
                  <button type="button" data-dw-action="flag-missed-red" data-spec-ids="${esc(uniqueMissed.join(','))}" class="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap">
                    <i class="fa-solid fa-flag text-xs" aria-hidden="true"></i>
                    <span>Mark ${uniqueMissed.length} Missed Spec ${uniqueMissed.length === 1 ? 'Point' : 'Points'} as Red</span>
                  </button>
                `
                : ''
            }
            <button type="button" data-dw-action="switch-tab" data-tab="checklist" class="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap">
              Open R050 Spec Checklist
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button type="button" data-dw-action="start-sprint" data-mode="bonus" class="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap">
              Start Bonus Sprint
            </button>
            <button type="button" data-dw-action="close-summary" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors whitespace-nowrap">
              Back to Warm-Up Hub
            </button>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <h3 class="text-sm font-bold text-slate-900">Question Breakdown &amp; Spec Confidence Sync</h3>
        ${reviewRowsHtml}
      </div>
    </div>
  `;
}

function renderRagButtons(itemId: string, itemTitle: string, rating: SpecConfidence, compact = false): string {
  const pad = compact ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs';
  const configs: Array<{ key: SpecConfidence; label: string; shortLabel: string; icon: string; activeCls: string; idleCls: string }> = [
    {
      key: 'red',
      label: 'Needs Revision',
      shortLabel: 'Red',
      icon: 'fa-triangle-exclamation',
      activeCls: 'bg-rose-600 text-white border-rose-600 shadow-xs',
      idleCls: 'bg-white text-slate-600 border-slate-200 hover:border-rose-300 hover:text-rose-700',
    },
    {
      key: 'amber',
      label: 'Reviewing',
      shortLabel: 'Amber',
      icon: 'fa-circle-half-stroke',
      activeCls: 'bg-amber-500 text-white border-amber-500 shadow-xs',
      idleCls: 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:text-amber-800',
    },
    {
      key: 'green',
      label: 'Exam Ready',
      shortLabel: 'Green',
      icon: 'fa-circle-check',
      activeCls: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
      idleCls: 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700',
    },
  ];

  return configs
    .map((cfg) => {
      const isActive = rating === cfg.key;
      return `
        <button type="button"
          data-dw-action="rate-spec"
          data-spec-id="${esc(itemId)}"
          data-rating="${cfg.key}"
          aria-pressed="${isActive ? 'true' : 'false'}"
          aria-label="Mark ${esc(itemTitle)} as ${cfg.label}"
          class="${pad} font-semibold rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${isActive ? cfg.activeCls : cfg.idleCls}">
          <i class="fa-solid ${cfg.icon} text-[10px]" aria-hidden="true"></i>
          <span>${compact ? cfg.shortLabel : cfg.label}</span>
        </button>
      `;
    })
    .join('');
}

function renderChecklistItemsHtml(): string {
  if (!uiState) return '';
  const filtered = filterSpecChecklistItems(
    SPEC_CHECKLIST_ITEMS,
    uiState.storage.specRatings,
    uiState.checklistTopic,
    uiState.checklistConfidence,
    uiState.checklistSearch
  );

  if (filtered.length === 0) {
    return `
      <div class="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
        <p class="text-sm font-bold text-slate-900">No specification checkpoints match your current filter</p>
        <p class="text-xs text-slate-500">Try clearing the search query or switching back to All Topic Areas.</p>
        <button type="button" data-dw-action="reset-checklist-filters" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors">
          Reset Filters
        </button>
      </div>
    `;
  }

  const groupedTopics = TOPIC_ORDER.filter((ta) => filtered.some((item) => item.ta === ta));

  return groupedTopics
    .map((ta) => {
      const groupItems = filtered.filter((item) => item.ta === ta);
      const allTaItems = SPEC_CHECKLIST_ITEMS.filter((i) => i.ta === ta);
      const readyInTa = allTaItems.filter((i) => uiState!.storage.specRatings[i.id] === 'green').length;

      const rowsHtml = groupItems
        .map((item) => {
          const rating = uiState!.storage.specRatings[item.id] || 'unrated';
          const tipExpanded = Boolean(uiState!.expandedTips[item.id]);
          return `
            <div class="p-4 sm:p-5 border-t border-slate-100 first:border-t-0 space-y-3">
              <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div class="space-y-1.5 flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-mono text-xs font-bold text-indigo-700 tabular-nums">${esc(item.code)}</span>
                    <h4 class="text-sm sm:text-base font-bold text-slate-900">${esc(item.title)}</h4>
                  </div>
                  <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">${esc(item.specDetail)}</p>
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 pt-0.5">
                    <span class="font-semibold text-slate-700">Key terms:</span>
                    <span>${item.keyTerms.map(esc).join(' · ')}</span>
                  </div>
                </div>

                <div class="flex flex-col sm:items-end gap-2.5 shrink-0">
                  <div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="Confidence rating for ${esc(item.title)}">
                    ${renderRagButtons(item.id, item.title, rating, false)}
                  </div>
                  <div class="flex flex-wrap items-center gap-3 text-xs font-semibold">
                    <button type="button" data-dw-action="toggle-tip" data-spec-id="${esc(item.id)}" aria-expanded="${tipExpanded ? 'true' : 'false'}" class="text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1">
                      <i class="fa-solid ${tipExpanded ? 'fa-chevron-up' : 'fa-lightbulb'} text-[11px] text-amber-600" aria-hidden="true"></i>
                      <span>${tipExpanded ? 'Hide Examiner Tip' : 'Examiner Tip'}</span>
                    </button>
                    <span aria-hidden="true" class="text-slate-300">·</span>
                    <button type="button" data-dw-action="launch-practice" data-spec-id="${esc(item.id)}" class="text-indigo-600 hover:text-indigo-800 hover:underline transition-colors flex items-center gap-1">
                      <span>${esc(item.practiceLabel)}</span>
                      <i class="fa-solid fa-arrow-up-right-from-square text-[10px]" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
              </div>

              ${
                tipExpanded
                  ? `
                    <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                      <span class="font-bold text-slate-900">OCR Examiner Tip (${esc(item.code)}):</span> ${esc(item.examTip)}
                    </div>
                  `
                  : ''
              }
            </div>
          `;
        })
        .join('');

      return `
        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div class="px-5 py-4 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <span class="text-xs font-extrabold font-mono text-indigo-700">${esc(ta)}</span>
              <span aria-hidden="true" class="text-slate-300">/</span>
              <h3 class="text-sm sm:text-base font-bold text-slate-900">${esc(TOPIC_AREA_TITLES[ta])}</h3>
            </div>
            <div class="flex items-center gap-3 text-xs tabular-nums">
              <span class="font-semibold text-emerald-700">${readyInTa} / ${allTaItems.length} Exam Ready</span>
              <button type="button" data-dw-action="start-ta-sprint" data-topic="${esc(ta)}" class="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-200 font-semibold rounded-lg transition-colors whitespace-nowrap">
                5-Min ${esc(ta)} Drill
              </button>
            </div>
          </div>
          <div>${rowsHtml}</div>
        </div>
      `;
    })
    .join('');
}

function renderSpecChecklistTab(summary: DailyWarmupOverviewSummary): string {
  if (!uiState) return '';
  const { checklist } = summary;
  const greenPct = Math.round((checklist.greenCount / checklist.totalItems) * 100);
  const amberPct = Math.round((checklist.amberCount / checklist.totalItems) * 100);
  const redPct = Math.round((checklist.redCount / checklist.totalItems) * 100);

  const topicTabsHtml = (['ALL', ...TOPIC_ORDER] as Array<'ALL' | TopicAreaId>)
    .map((ta) => {
      const active = uiState!.checklistTopic === ta;
      const label = ta === 'ALL' ? `All (${checklist.totalItems})` : ta;
      return `
        <button type="button" data-dw-action="filter-topic" data-topic="${ta}" class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${active ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}">
          ${label}
        </button>
      `;
    })
    .join('');

  const confOptions: Array<{ key: 'all' | SpecConfidence; label: string }> = [
    { key: 'all', label: 'All Statuses' },
    { key: 'red', label: `Needs Revision (${checklist.redCount})` },
    { key: 'amber', label: `Reviewing (${checklist.amberCount})` },
    { key: 'green', label: `Exam Ready (${checklist.greenCount})` },
    { key: 'unrated', label: `Unrated (${checklist.unratedCount})` },
  ];

  return `
    <div class="space-y-6">
      <!-- Readiness Overview Card -->
      <div class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 tabular-nums">
              <span class="font-bold text-slate-900">OCR J836 Unit R050 Full Specification</span>
              <span aria-hidden="true">·</span>
              <span>${checklist.ratedCount} of ${checklist.totalItems} checkpoints rated</span>
            </div>
            <div class="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm tabular-nums">
              <span class="font-extrabold text-emerald-700">${checklist.greenCount} Exam Ready (${checklist.readinessPct}%)</span>
              <span class="font-semibold text-amber-700">${checklist.amberCount} Reviewing</span>
              <span class="font-semibold text-rose-700">${checklist.redCount} Needs Revision</span>
              <span class="text-slate-500">${checklist.unratedCount} Unrated</span>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button type="button" data-dw-action="start-sprint" data-mode="weak-spots" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap">
              <i class="fa-solid fa-bolt text-amber-300 text-xs" aria-hidden="true"></i>
              <span>Drill Red/Amber Gaps (5-Min)</span>
            </button>
            <button type="button" data-dw-action="export-csv" class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap">
              <i class="fa-solid fa-file-csv text-slate-600 text-xs" aria-hidden="true"></i>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <!-- Stacked RAG Progress Bar -->
        <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex" aria-label="Specification readiness distribution">
          <div class="bg-emerald-500 h-full transition-all duration-300" style="width: ${greenPct}%"></div>
          <div class="bg-amber-400 h-full transition-all duration-300" style="width: ${amberPct}%"></div>
          <div class="bg-rose-500 h-full transition-all duration-300" style="width: ${redPct}%"></div>
        </div>
      </div>

      <!-- Filter & Search Bar -->
      <div class="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
            ${topicTabsHtml}
          </div>
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <label for="dw-conf-filter" class="sr-only">Filter by confidence rating</label>
            <select id="dw-conf-filter" class="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              ${confOptions
                .map((opt) => `<option value="${opt.key}" ${uiState!.checklistConfidence === opt.key ? 'selected' : ''}>${esc(opt.label)}</option>`)
                .join('')}
            </select>
            <div class="relative">
              <label for="dw-spec-search" class="sr-only">Search R050 specification checkpoints</label>
              <i class="fa-solid fa-magnifying-glass text-slate-400 text-xs absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true"></i>
              <input type="search" id="dw-spec-search" value="${esc(uiState.checklistSearch)}" placeholder="Search spec, code, or term..."
                class="w-full sm:w-56 pl-8 pr-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
          </div>
        </div>
      </div>

      <!-- Grouped Specification Checkpoints -->
      <div id="dw-checklist-list" class="space-y-4">
        ${renderChecklistItemsHtml()}
      </div>
    </div>
  `;
}

function renderWorkspace(): void {
  if (!containerEl || !uiState) return;
  const summary = buildOverviewSummary(uiState.storage);

  let bodyHtml = '';
  if (uiState.activeTab === 'warmup') {
    if (uiState.activeSprint) {
      bodyHtml = uiState.activeSprint.finished
        ? renderSprintSummary(uiState.activeSprint, summary)
        : renderActiveSprint(uiState.activeSprint);
    } else {
      bodyHtml = renderWarmupHub(summary);
    }
  } else {
    bodyHtml = renderSpecChecklistTab(summary);
  }

  containerEl.innerHTML = `
    <div class="space-y-6">
      <!-- Workspace Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div class="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 tabular-nums">
            <button type="button" data-dw-action="go-home" class="hover:text-slate-900 transition-colors font-semibold">Home</button>
            <span aria-hidden="true">/</span>
            <span class="text-indigo-700 font-semibold">Daily Routine &amp; Spec Audit</span>
            <span aria-hidden="true">·</span>
            <span>${summary.streak.currentStreak}-day streak</span>
            <span aria-hidden="true">·</span>
            <span>${summary.checklist.greenCount} / ${summary.checklist.totalItems} Exam Ready</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
            5-Minute Daily Warm-Up &amp; Spec Checklist
          </h1>
        </div>

        <!-- Two-Tab Mode Switcher -->
        <div class="grid grid-cols-2 sm:inline-flex items-center p-1 bg-slate-200/80 rounded-xl border border-slate-200 w-full sm:w-auto self-stretch md:self-auto gap-1 sm:gap-0" role="tablist" aria-label="Daily Warm-Up and Specification Checklist modes">
          <button type="button" role="tab" aria-selected="${uiState.activeTab === 'warmup' ? 'true' : 'false'}" data-dw-action="switch-tab" data-tab="warmup" class="px-2.5 sm:px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 sm:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${uiState.activeTab === 'warmup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
            <i class="fa-solid fa-stopwatch text-indigo-600 shrink-0" aria-hidden="true"></i>
            <span class="sm:hidden">Daily Warm-Up</span>
            <span class="hidden sm:inline">5-Min Daily Warm-Up</span>
          </button>
          <button type="button" role="tab" aria-selected="${uiState.activeTab === 'checklist' ? 'true' : 'false'}" data-dw-action="switch-tab" data-tab="checklist" class="px-2.5 sm:px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 sm:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${uiState.activeTab === 'checklist' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}">
            <i class="fa-solid fa-list-check text-emerald-600 shrink-0" aria-hidden="true"></i>
            <span class="sm:hidden">Checklist (${summary.checklist.greenCount}/${summary.checklist.totalItems})</span>
            <span class="hidden sm:inline">R050 Spec Checklist (${summary.checklist.greenCount}/${summary.checklist.totalItems})</span>
          </button>
        </div>
      </div>

      ${bodyHtml}
    </div>
  `;

  bindEvents();
}

function bindEvents(): void {
  if (!containerEl || !uiState) return;

  containerEl.querySelectorAll<HTMLElement>('[data-dw-action]').forEach((el) => {
    el.addEventListener('click', () => {
      if (!uiState) return;
      const action = el.dataset.dwAction;
      if (action === 'go-home') {
        const win = window as unknown as { returnToHomeScreen?: () => void };
        if (typeof win.returnToHomeScreen === 'function') win.returnToHomeScreen();
      } else if (action === 'switch-tab') {
        const nextTab = (el.dataset.tab as DailyWarmupTab) || 'warmup';
        if (nextTab !== 'warmup') stopDailyWarmupTimers();
        uiState.activeTab = nextTab;
        renderWorkspace();
        if (nextTab === 'warmup' && uiState.activeSprint && !uiState.activeSprint.finished && !uiState.activeSprint.paused) {
          ensureTimerRunning();
        }
      } else if (action === 'set-timed') {
        uiState.timedPreference = el.dataset.timed === 'true';
        renderWorkspace();
      } else if (action === 'start-sprint') {
        const mode = (el.dataset.mode as WarmupSprintMode) || 'daily';
        startSprint(mode);
      } else if (action === 'start-topic-sprint') {
        startSprint('topic', uiState.selectedTopicSprint);
      } else if (action === 'start-ta-sprint') {
        const topic = el.dataset.topic as TopicAreaId;
        if (topic) startSprint('topic', topic);
      } else if (action === 'answer-mcq') {
        const idx = Number.parseInt(el.dataset.idx || '-1', 10);
        if (idx >= 0) submitCurrentAnswer(idx);
      } else if (action === 'answer-tf') {
        submitCurrentAnswer(el.dataset.val === 'true');
      } else if (action === 'next-question') {
        advanceSprintQuestion();
      } else if (action === 'toggle-pause') {
        if (!uiState.activeSprint) return;
        uiState.activeSprint.paused = !uiState.activeSprint.paused;
        if (uiState.activeSprint.paused) stopDailyWarmupTimers();
        else ensureTimerRunning();
        renderWorkspace();
      } else if (action === 'cancel-sprint' || action === 'close-summary') {
        stopDailyWarmupTimers();
        uiState.activeSprint = null;
        renderWorkspace();
      } else if (action === 'flag-missed-red') {
        const rawIds = el.dataset.specIds || '';
        const ids = rawIds.split(',').map((s) => s.trim()).filter(Boolean);
        flagMissedSpecItemsAsRed(ids);
      } else if (action === 'rate-spec') {
        const specId = el.dataset.specId;
        const rating = el.dataset.rating as SpecConfidence;
        if (specId && rating) setSpecConfidence(specId, rating);
      } else if (action === 'toggle-tip') {
        const specId = el.dataset.specId;
        if (specId) {
          uiState.expandedTips[specId] = !uiState.expandedTips[specId];
          renderWorkspace();
        }
      } else if (action === 'launch-practice') {
        const specId = el.dataset.specId;
        const item = SPEC_CHECKLIST_ITEMS.find((i) => i.id === specId);
        if (item && onLaunchPracticeCb) {
          stopDailyWarmupTimers();
          onLaunchPracticeCb(item.practiceTarget);
        }
      } else if (action === 'open-checklist-topic') {
        const topic = (el.dataset.topic as TopicAreaId) || 'ALL';
        uiState.activeTab = 'checklist';
        uiState.checklistTopic = topic;
        uiState.checklistConfidence = 'all';
        renderWorkspace();
      } else if (action === 'filter-topic') {
        uiState.checklistTopic = (el.dataset.topic as 'ALL' | TopicAreaId) || 'ALL';
        renderWorkspace();
      } else if (action === 'reset-checklist-filters') {
        uiState.checklistTopic = 'ALL';
        uiState.checklistConfidence = 'all';
        uiState.checklistSearch = '';
        renderWorkspace();
      } else if (action === 'export-csv') {
        exportChecklistCsv();
      }
    });
  });

  const topicSelect = containerEl.querySelector<HTMLSelectElement>('#dw-topic-sprint-select');
  if (topicSelect) {
    topicSelect.addEventListener('change', () => {
      if (uiState) uiState.selectedTopicSprint = topicSelect.value as TopicAreaId;
    });
  }

  const recallForm = containerEl.querySelector<HTMLFormElement>('#dw-recall-form');
  const recallInput = containerEl.querySelector<HTMLInputElement>('#dw-recall-input');
  if (recallInput) {
    recallInput.addEventListener('input', () => {
      if (uiState?.activeSprint) {
        uiState.activeSprint.draftRecallText = recallInput.value;
      }
    });
  }
  if (recallForm && recallInput) {
    recallForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitCurrentAnswer(recallInput.value);
    });
  }

  const confSelect = containerEl.querySelector<HTMLSelectElement>('#dw-conf-filter');
  if (confSelect) {
    confSelect.addEventListener('change', () => {
      if (!uiState) return;
      uiState.checklistConfidence = confSelect.value as 'all' | SpecConfidence;
      renderWorkspace();
    });
  }

  const searchInput = containerEl.querySelector<HTMLInputElement>('#dw-spec-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (!uiState) return;
      uiState.checklistSearch = searchInput.value;
      const listEl = document.getElementById('dw-checklist-list');
      if (listEl) {
        listEl.innerHTML = renderChecklistItemsHtml();
        // Re-bind only buttons inside the refreshed list so search input keeps focus!
        listEl.querySelectorAll<HTMLElement>('[data-dw-action]').forEach((el) => {
          el.addEventListener('click', () => {
            if (!uiState) return;
            const action = el.dataset.dwAction;
            if (action === 'rate-spec') {
              const specId = el.dataset.specId;
              const rating = el.dataset.rating as SpecConfidence;
              if (specId && rating) setSpecConfidence(specId, rating);
            } else if (action === 'toggle-tip') {
              const specId = el.dataset.specId;
              if (specId) {
                uiState.expandedTips[specId] = !uiState.expandedTips[specId];
                renderWorkspace();
              }
            } else if (action === 'launch-practice') {
              const specId = el.dataset.specId;
              const item = SPEC_CHECKLIST_ITEMS.find((i) => i.id === specId);
              if (item && onLaunchPracticeCb) {
                stopDailyWarmupTimers();
                onLaunchPracticeCb(item.practiceTarget);
              }
            } else if (action === 'start-ta-sprint') {
              const topic = el.dataset.topic as TopicAreaId;
              if (topic) startSprint('topic', topic);
            } else if (action === 'reset-checklist-filters') {
              uiState.checklistTopic = 'ALL';
              uiState.checklistConfidence = 'all';
              uiState.checklistSearch = '';
              renderWorkspace();
            }
          });
        });
      }
    });
  }
}

export function initDailyWarmupWorkspace(
  container: HTMLElement,
  options: DailyWarmupInitOptions = {}
): void {
  containerEl = container;
  onSummaryChangeCb = options.onSummaryChange || null;
  onLaunchPracticeCb = options.onLaunchPractice || null;
  onShowToastCb = options.onShowToast || null;

  if (!uiState) {
    uiState = {
      activeTab: options.initialTab || 'warmup',
      storage: loadStorage(),
      timedPreference: true,
      selectedTopicSprint: 'TA1',
      activeSprint: null,
      checklistTopic: 'ALL',
      checklistConfidence: 'all',
      checklistSearch: '',
      expandedTips: {},
    };
  } else {
    uiState.storage = loadStorage();
    if (options.initialTab) {
      uiState.activeTab = options.initialTab;
    }
  }

  renderWorkspace();
  if (onSummaryChangeCb) {
    onSummaryChangeCb(buildOverviewSummary(uiState.storage));
  }
}

export function setDailyWarmupTab(tab: DailyWarmupTab): void {
  if (!uiState) return;
  if (tab !== 'warmup') stopDailyWarmupTimers();
  uiState.activeTab = tab;
  renderWorkspace();
}
