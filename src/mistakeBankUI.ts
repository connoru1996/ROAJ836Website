import type { TopicAreaId } from './dashboardAnalytics';
import { TOPIC_AREA_TITLES, TOPIC_ORDER } from './dailyWarmupEngine';
import {
  applyRetryOutcome,
  collectMistakes,
  createEmptyMistakeBankStorage,
  evaluateMistakeRetry,
  filterMistakes,
  reopenMistake,
  type MistakeBankCollection,
  type MistakeBankCollectionInput,
  type MistakeBankStorageState,
  type MistakeBankSummary,
  type MistakeItem,
  type MistakeRetryEvaluation,
  type MistakeStatusFilter,
} from './mistakeBankEngine';

const MISTAKE_STORAGE_KEY = 'OCR_R050_MISTAKE_BANK_V1';

export interface MistakeBankUIOptions {
  getCollectionInput: () => MistakeBankCollectionInput;
  onSummaryChange?: (summary: MistakeBankSummary) => void;
  onStartWarmup?: () => void;
  onStartPracticePaper?: () => void;
  onOpenQuickRef?: (ta: TopicAreaId) => void;
  onShowToast?: (message: string, type?: string) => void;
}

interface RetryDeckState {
  queueIds: string[];
  currentIndex: number;
  draftAnswer: unknown;
  evaluation: MistakeRetryEvaluation | null;
  clearedInSession: number;
  attemptedInSession: number;
  finished: boolean;
}

interface MistakeBankUiState {
  storage: MistakeBankStorageState;
  statusFilter: MistakeStatusFilter;
  topicFilter: 'ALL' | TopicAreaId;
  deck: RetryDeckState | null;
}

let rootContainer: HTMLElement | null = null;
let uiOptions: MistakeBankUIOptions | null = null;
let uiState: MistakeBankUiState | null = null;

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function loadStorage(): MistakeBankStorageState {
  try {
    const raw = window.localStorage.getItem(MISTAKE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        clearedAtMap:
          parsed && typeof parsed.clearedAtMap === 'object' && parsed.clearedAtMap
            ? parsed.clearedAtMap
            : {},
        retryCounts:
          parsed && typeof parsed.retryCounts === 'object' && parsed.retryCounts
            ? parsed.retryCounts
            : {},
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return createEmptyMistakeBankStorage();
}

function saveStorage(storage: MistakeBankStorageState): void {
  try {
    window.localStorage.setItem(MISTAKE_STORAGE_KEY, JSON.stringify(storage));
  } catch {
    // Ignore storage quota errors
  }
}

function getLiveCollection(): MistakeBankCollection {
  const storage = uiState ? uiState.storage : loadStorage();
  const input = uiOptions ? uiOptions.getCollectionInput() : { papers: [], warmupStorage: null };
  return collectMistakes(input, storage);
}

function buildInitialDraft(item: MistakeItem): unknown {
  const spec = item.inputSpec;
  if (spec.kind === 'multiselect') return [];
  if (spec.kind === 'cloze' || spec.kind === 'matrix') return {};
  if (spec.kind === 'sequence') {
    // Reverse order as starting prompt so student actively arranges steps
    const ids = spec.items.map((i) => i.id);
    if (ids.length >= 2) {
      return [...ids.slice(1), ids[0]];
    }
    return ids;
  }
  if (spec.kind === 'true-false') return null;
  return '';
}

function notifySummary(summary: MistakeBankSummary): void {
  const navMeta = document.getElementById('nav-mistake-bank-meta');
  if (navMeta) {
    navMeta.textContent =
      summary.totalCount === 0
        ? 'No mistakes yet'
        : `${summary.toFixCount} to fix · ${summary.clearedCount} cleared`;
  }
  uiOptions?.onSummaryChange?.(summary);
}

function getReasonDisplay(item: MistakeItem): {
  label: string;
  icon: string;
  textClass: string;
} {
  if (item.cleared) {
    return { label: 'Cleared', icon: 'fa-circle-check', textClass: 'text-emerald-700' };
  }
  if (item.reason === 'partial') {
    return { label: 'Partial marks', icon: 'fa-circle-half-stroke', textClass: 'text-amber-700' };
  }
  if (item.reason === 'flagged') {
    return { label: 'Flagged to review', icon: 'fa-flag', textClass: 'text-amber-700' };
  }
  if (item.reason === 'missed-warmup') {
    return { label: 'Missed in Warm-Up', icon: 'fa-rotate-left', textClass: 'text-rose-700' };
  }
  return { label: 'Missed in Exam', icon: 'fa-circle-xmark', textClass: 'text-rose-700' };
}

function startRetryDeck(queueIds: string[]): void {
  if (!uiState || queueIds.length === 0) return;
  const collection = getLiveCollection();
  const firstItem = collection.items.find((i) => i.id === queueIds[0]);
  if (!firstItem) return;

  uiState.deck = {
    queueIds,
    currentIndex: 0,
    draftAnswer: buildInitialDraft(firstItem),
    evaluation: null,
    clearedInSession: 0,
    attemptedInSession: 0,
    finished: false,
  };
  renderMistakeBank();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getActiveDeckItem(collection: MistakeBankCollection): MistakeItem | null {
  if (!uiState?.deck) return null;
  const id = uiState.deck.queueIds[uiState.deck.currentIndex];
  return collection.items.find((i) => i.id === id) || null;
}

function renderRetryInputHtml(item: MistakeItem, draft: unknown, locked: boolean): string {
  const spec = item.inputSpec;
  const dis = locked ? 'disabled' : '';

  if (spec.kind === 'mcq') {
    const chosen = typeof draft === 'string' ? draft : '';
    return `
      <div class="space-y-2.5">
        ${spec.options
          .map((opt) => {
            const checked = chosen === opt.value;
            const ring = checked ? 'border-indigo-500 bg-indigo-50/70' : 'border-slate-200 hover:bg-slate-50';
            return `
              <label class="flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${ring}">
                <input type="radio" name="mb-mcq" value="${esc(opt.value)}" ${checked ? 'checked' : ''} ${dis} data-mb-mcq="${esc(opt.value)}" class="mt-0.5 text-indigo-600 focus:ring-indigo-500">
                <span class="text-sm text-slate-800 font-medium leading-snug">${esc(opt.label)}</span>
              </label>
            `;
          })
          .join('')}
      </div>
    `;
  }

  if (spec.kind === 'true-false') {
    const val = typeof draft === 'boolean' ? draft : null;
    return `
      <div class="grid grid-cols-2 gap-3">
        ${[true, false]
          .map((b) => {
            const active = val === b;
            const cls = active
              ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800';
            return `
              <button type="button" ${dis} data-mb-tf="${b ? 'true' : 'false'}" class="px-4 py-3.5 rounded-xl border text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${cls}">
                ${b ? 'True' : 'False'}
              </button>
            `;
          })
          .join('')}
      </div>
    `;
  }

  if (spec.kind === 'text') {
    const val = typeof draft === 'string' ? draft : '';
    return `
      <div class="space-y-1.5">
        <label for="mb-text-input" class="block text-xs font-semibold text-slate-600">Type your answer</label>
        <input id="mb-text-input" type="text" ${dis} value="${esc(val)}" placeholder="Enter the exact IT term or answer..." class="w-full px-3.5 py-2.5 text-sm font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
      </div>
    `;
  }

  if (spec.kind === 'multiselect') {
    const selected = Array.isArray(draft) ? draft.map(String) : [];
    return `
      <div class="space-y-2.5">
        ${spec.options
          .map((opt) => {
            const checked = selected.includes(opt.id);
            const ring = checked ? 'border-indigo-500 bg-indigo-50/70' : 'border-slate-200 hover:bg-slate-50';
            return `
              <label class="flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${ring}">
                <input type="checkbox" ${checked ? 'checked' : ''} ${dis} data-mb-multi="${esc(opt.id)}" class="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500">
                <span class="text-sm text-slate-800 font-medium leading-snug">${esc(opt.text)}</span>
              </label>
            `;
          })
          .join('')}
      </div>
    `;
  }

  if (spec.kind === 'cloze') {
    const mapAns = draft && typeof draft === 'object' ? (draft as Record<string, string>) : {};
    const htmlWithSelects = esc(spec.templateText).replace(/\{(\d+)\}/g, (_match, num) => {
      const opts = spec.dropdowns[num] || [];
      const cur = mapAns[num] || '';
      const optionsHtml = [
        `<option value="">— choose —</option>`,
        ...opts.map(
          (o) => `<option value="${esc(o)}" ${cur === o ? 'selected' : ''}>${esc(o)}</option>`
        ),
      ].join('');
      return `<select ${dis} data-mb-cloze="${esc(num)}" aria-label="Blank ${esc(num)}" class="mx-1 px-2.5 py-1 text-sm font-semibold border border-indigo-300 rounded-lg bg-white text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">${optionsHtml}</select>`;
    });
    return `<div class="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 leading-loose">${htmlWithSelects}</div>`;
  }

  if (spec.kind === 'matrix') {
    const mapAns = draft && typeof draft === 'object' ? (draft as Record<string, string>) : {};
    return `
      <div class="space-y-3">
        ${spec.rows
          .map((row) => {
            const cur = mapAns[row.id] || '';
            const optsHtml = [
              `<option value="">Select match…</option>`,
              ...spec.cols.map(
                (col) => `<option value="${esc(col)}" ${cur === col ? 'selected' : ''}>${esc(col)}</option>`
              ),
            ].join('');
            return `
              <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span class="text-sm font-medium text-slate-800">${esc(row.label)}</span>
                <select ${dis} data-mb-matrix="${esc(row.id)}" aria-label="${esc(row.label)}" class="px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shrink-0">
                  ${optsHtml}
                </select>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  if (spec.kind === 'sequence') {
    const order = Array.isArray(draft) ? draft.map(String) : spec.items.map((i) => i.id);
    const labelById = new Map(spec.items.map((i) => [i.id, i.label]));
    return `
      <div class="space-y-2">
        ${order
          .map((stepId, idx) => {
            const label = labelById.get(stepId) || stepId;
            return `
              <div class="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="h-6 w-6 rounded-lg bg-slate-900 text-white text-xs font-bold tabular-nums flex items-center justify-center shrink-0">${idx + 1}</span>
                  <span class="text-sm text-slate-800 font-medium">${esc(label)}</span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button type="button" ${locked || idx === 0 ? 'disabled' : ''} data-mb-seq-move="${idx}:-1" aria-label="Move step up" class="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center">
                    <i class="fa-solid fa-arrow-up text-xs" aria-hidden="true"></i>
                  </button>
                  <button type="button" ${locked || idx === order.length - 1 ? 'disabled' : ''} data-mb-seq-move="${idx}:1" aria-label="Move step down" class="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center">
                    <i class="fa-solid fa-arrow-down text-xs" aria-hidden="true"></i>
                  </button>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  // Extended 9-mark response
  const val = typeof draft === 'string' ? draft : '';
  const words = val.trim() ? val.trim().split(/\s+/).length : 0;
  return `
    <div class="space-y-2.5">
      ${
        spec.scaffoldPrompt
          ? `<div class="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-950 whitespace-pre-line leading-relaxed">${esc(spec.scaffoldPrompt)}</div>`
          : ''
      }
      <div class="flex items-center justify-between text-xs text-slate-600">
        <label for="mb-extended-input" class="font-semibold">Write your improved response (aim for 120+ words for Level 3)</label>
        <span id="mb-extended-words" class="tabular-nums font-semibold">${words} words</span>
      </div>
      <textarea id="mb-extended-input" rows="6" ${dis} placeholder="Include AO1 concepts, AO2 scenario benefits & risks, and an AO3 justified conclusion..." class="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">${esc(val)}</textarea>
    </div>
  `;
}

function renderRetryDeckView(collection: MistakeBankCollection): string {
  const deck = uiState!.deck!;

  if (deck.finished) {
    return `
      <div class="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 text-center space-y-5">
        <div class="mx-auto h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <i class="fa-solid fa-circle-check text-xl" aria-hidden="true"></i>
        </div>
        <div class="space-y-1.5">
          <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900">Retry Session Complete</h2>
          <p class="text-sm text-slate-600">
            You cleared <strong class="text-emerald-700 tabular-nums">${deck.clearedInSession}</strong> of <strong class="tabular-nums">${deck.attemptedInSession}</strong> questions in this session.
            ${
              collection.summary.toFixCount > 0
                ? `${collection.summary.toFixCount} ${collection.summary.toFixCount === 1 ? 'question remains' : 'questions remain'} in your To Fix list.`
                : 'Your Mistake Bank is completely clear!'
            }
          </p>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button type="button" data-mb-action="exit-deck" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors whitespace-nowrap">
            Back to Mistake Bank
          </button>
          ${
            collection.summary.toFixCount > 0
              ? `<button type="button" data-mb-action="start-to-fix" class="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap">Retry Remaining (${collection.summary.toFixCount})</button>`
              : ''
          }
        </div>
      </div>
    `;
  }

  const item = getActiveDeckItem(collection);
  if (!item) {
    return `
      <div class="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-3">
        <p class="text-sm font-semibold text-slate-800">That question is no longer in the queue.</p>
        <button type="button" data-mb-action="exit-deck" class="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl">Back to Mistake Bank</button>
      </div>
    `;
  }

  const total = deck.queueIds.length;
  const pos = deck.currentIndex + 1;
  const pct = Math.round((pos / total) * 100);
  const evalRes = deck.evaluation;
  const isLast = deck.currentIndex >= total - 1;

  return `
    <div class="max-w-3xl mx-auto space-y-5">
      <!-- Slim Top Progress Strip -->
      <div class="bg-white rounded-xl border border-slate-200 px-4 sm:px-5 py-3.5 space-y-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div class="flex flex-wrap items-center gap-2 text-slate-600">
            <span class="font-bold text-indigo-700">Retry Session</span>
            <span aria-hidden="true" class="text-slate-300">·</span>
            <span class="font-semibold text-slate-900 tabular-nums">Question ${pos} of ${total}</span>
            <span aria-hidden="true" class="text-slate-300">·</span>
            <span>${esc(item.ta)}: ${esc(item.taName)}</span>
          </div>
          <div class="flex items-center gap-3">
            <button type="button" data-mb-action="open-cheat-sheet" data-ta="${esc(item.ta)}" class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline underline-offset-2 whitespace-nowrap">
              ${esc(item.ta)} Cheat Sheet
            </button>
            <button type="button" data-mb-action="exit-deck" class="text-xs font-semibold text-slate-500 hover:text-slate-900 hover:underline underline-offset-2 whitespace-nowrap">
              ← Mistake Bank
            </button>
          </div>
        </div>
        <div class="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Retry session progress">
          <div class="h-full rounded-full bg-indigo-600 transition-all duration-200" style="width: ${pct}%"></div>
        </div>
      </div>

      ${
        item.scenarioTitle && item.scenarioDescription
          ? `
        <div class="bg-slate-800 text-white rounded-xl p-5 border border-slate-700 space-y-1.5">
          <div class="text-[11px] font-semibold text-amber-300">Exam Scenario Context</div>
          <h3 class="text-base font-bold text-slate-100">${esc(item.scenarioTitle)}</h3>
          <p class="text-xs text-slate-300 leading-relaxed">${esc(item.scenarioDescription)}</p>
        </div>
      `
          : ''
      }

      <!-- Question Card -->
      <article class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
        <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs">
          <div class="flex flex-wrap items-center gap-2 text-slate-600">
            <span class="font-bold text-slate-900">${esc(item.sourceLabel)}</span>
            <span aria-hidden="true" class="text-slate-300">·</span>
            <span class="font-semibold text-indigo-700">${esc(item.ta)}</span>
            <span aria-hidden="true" class="text-slate-300">·</span>
            <span class="font-semibold text-slate-700 tabular-nums">${item.marks} ${item.marks === 1 ? 'Mark' : 'Marks'}</span>
          </div>
          ${
            item.lastScore !== null
              ? `<span class="text-slate-500 tabular-nums">Previous score: <strong class="text-slate-800">${item.lastScore}/${item.marks}</strong></span>`
              : `<span class="font-semibold text-amber-700"><i class="fa-solid fa-flag mr-1" aria-hidden="true"></i>Flagged</span>`
          }
        </div>

        <h2 class="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">${esc(item.question)}</h2>

        <div>
          ${renderRetryInputHtml(item, deck.draftAnswer, Boolean(evalRes))}
        </div>

        ${
          evalRes
            ? `
          <div id="mb-retry-feedback" class="rounded-xl border p-4 space-y-2 text-xs sm:text-sm ${
            evalRes.isFullMarks
              ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
              : 'border-rose-200 bg-rose-50 text-rose-950'
          }">
            <div class="font-bold flex items-center gap-2">
              <i class="fa-solid ${evalRes.isFullMarks ? 'fa-circle-check text-emerald-600' : 'fa-circle-xmark text-rose-600'}" aria-hidden="true"></i>
              <span>${esc(evalRes.feedbackTitle)}</span>
            </div>
            <p class="leading-relaxed"><strong>Correct answer:</strong> ${esc(evalRes.correctSummary)}</p>
            <p class="leading-relaxed text-slate-700">${esc(evalRes.explanation)}</p>
          </div>
        `
            : ''
        }

        <div class="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          ${
            !evalRes
              ? `
            <span class="text-xs text-slate-500">Get full marks to clear this question from your To Fix list.</span>
            <button type="button" data-mb-action="check-retry" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <i class="fa-solid fa-circle-check text-xs" aria-hidden="true"></i>
              <span>Check My Retry</span>
            </button>
          `
              : `
            <div class="flex items-center gap-2">
              ${
                !evalRes.isFullMarks
                  ? `<button type="button" data-mb-action="retry-same" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap">Try Again</button>`
                  : `<span class="text-xs font-semibold text-emerald-700"><i class="fa-solid fa-check mr-1" aria-hidden="true"></i>Moved to Cleared</span>`
              }
            </div>
            <button type="button" data-mb-action="next-question" class="px-5 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              <span>${isLast ? 'Finish Session' : 'Next Question'}</span>
              <i class="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i>
            </button>
          `
          }
        </div>
      </article>
    </div>
  `;
}

function renderQueueView(collection: MistakeBankCollection): string {
  const { summary, items } = collection;
  const state = uiState!;
  const filtered = filterMistakes(items, {
    status: state.statusFilter,
    topic: state.topicFilter,
  });

  const statusTabs: Array<{ id: MistakeStatusFilter; label: string }> = [
    { id: 'to-fix', label: `To Fix (${summary.toFixCount})` },
    { id: 'flagged', label: `Flagged (${summary.flaggedCount})` },
    { id: 'cleared', label: `Cleared (${summary.clearedCount})` },
    { id: 'all', label: `All (${summary.totalCount})` },
  ];

  const topicOptionsHtml = [
    `<option value="ALL" ${state.topicFilter === 'ALL' ? 'selected' : ''}>All Topics (TA1–TA6)</option>`,
    ...TOPIC_ORDER.map((ta) => {
      const counts = summary.countsByTopic[ta];
      return `<option value="${ta}" ${state.topicFilter === ta ? 'selected' : ''}>${ta}: ${esc(TOPIC_AREA_TITLES[ta])} (${counts.toFix} to fix)</option>`;
    }),
  ].join('');

  const listHtml =
    summary.totalCount === 0
      ? `
      <div class="bg-white rounded-2xl border border-slate-200 px-6 py-12 text-center space-y-4">
        <div class="mx-auto h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <i class="fa-solid fa-clipboard-check text-xl" aria-hidden="true"></i>
        </div>
        <div class="space-y-1.5 max-w-md mx-auto">
          <h3 class="text-base sm:text-lg font-bold text-slate-900">No mistakes collected yet</h3>
          <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Any question you miss or flag in a Practice Paper, Timed Mock, or 5-Minute Warm-Up appears here automatically so you can retry it until it sticks.
          </p>
        </div>
        <div class="flex flex-wrap items-center justify-center gap-3 pt-1">
          <button type="button" data-mb-action="go-warmup" class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors whitespace-nowrap">
            Start 5-Min Warm-Up →
          </button>
          <button type="button" data-mb-action="go-paper" class="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 transition-colors whitespace-nowrap">
            Start Practice Paper
          </button>
        </div>
      </div>
    `
      : filtered.length === 0
        ? `
      <div class="bg-white rounded-2xl border border-slate-200 px-6 py-10 text-center space-y-3">
        <div class="mx-auto h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <i class="fa-solid fa-circle-check text-base" aria-hidden="true"></i>
        </div>
        <div class="space-y-1">
          <h3 class="text-base font-bold text-slate-900">
            ${
              state.statusFilter === 'to-fix' && summary.clearedCount > 0
                ? 'All mistakes in this view are cleared!'
                : 'No questions match this filter'
            }
          </h3>
          <p class="text-xs text-slate-600">
            ${
              state.statusFilter === 'to-fix' && summary.clearedCount > 0
                ? 'Great work — you can switch to the Cleared tab to re-test them anytime.'
                : 'Try switching tabs or selecting All Topics above.'
            }
          </p>
        </div>
      </div>
    `
        : `
      <div class="space-y-3">
        ${filtered
          .map((item) => {
            const r = getReasonDisplay(item);
            return `
              <article data-mb-item-id="${esc(item.id)}" data-mb-cleared="${item.cleared ? 'true' : 'false'}" class="bg-white rounded-2xl border ${item.cleared ? 'border-emerald-200/80' : 'border-slate-200'} p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="space-y-1.5 min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2 text-xs">
                    <span class="font-bold text-indigo-700">${esc(item.ta)}</span>
                    <span aria-hidden="true" class="text-slate-300">·</span>
                    <span class="font-semibold text-slate-700">${esc(item.sourceLabel)}</span>
                    <span aria-hidden="true" class="text-slate-300">·</span>
                    <span class="font-semibold ${r.textClass} flex items-center gap-1">
                      <i class="fa-solid ${r.icon} text-[11px]" aria-hidden="true"></i>
                      <span>${esc(r.label)}</span>
                    </span>
                    ${
                      item.lastScore !== null
                        ? `<span aria-hidden="true" class="text-slate-300">·</span><span class="text-slate-500 tabular-nums">Last: ${item.lastScore}/${item.marks}</span>`
                        : ''
                    }
                  </div>
                  <p class="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">${esc(item.question)}</p>
                </div>

                <div class="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  ${
                    item.cleared
                      ? `<button type="button" data-mb-reopen="${esc(item.id)}" class="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline underline-offset-2 whitespace-nowrap">Move to To Fix</button>`
                      : ''
                  }
                  <button type="button" data-mb-retry-one="${esc(item.id)}" class="px-4 py-2 ${
                    item.cleared
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  } text-xs font-semibold rounded-xl transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                    ${item.cleared ? 'Practise Again' : 'Retry Now →'}
                  </button>
                </div>
              </article>
            `;
          })
          .join('')}
      </div>
    `;

  return `
    <div class="space-y-6">
      <!-- Overview Header Card -->
      <section class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="space-y-1.5 min-w-0">
            <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
              <span class="text-indigo-700">Mistake Bank</span>
              <span aria-hidden="true" class="text-slate-300">·</span>
              <span class="tabular-nums text-slate-900">${summary.toFixCount} to fix</span>
              <span aria-hidden="true" class="text-slate-300">·</span>
              <span class="tabular-nums text-emerald-700">${summary.clearedCount} cleared</span>
              <span aria-hidden="true" class="text-slate-300">·</span>
              <span class="tabular-nums text-amber-700">${summary.flaggedCount} flagged</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Retry My Wrong Answers</h1>
            <p class="text-xs sm:text-sm text-slate-600 max-w-2xl">
              Every missed or flagged question from your Practice Papers and Daily Warm-Ups is collected here. Answer a question for full marks to clear it.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2.5 shrink-0">
            ${
              summary.toFixCount > 0
                ? `
              <button type="button" data-mb-action="start-to-fix" class="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                <span>Start Retry Session (${summary.toFixCount})</span>
                <i class="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i>
              </button>
            `
                : summary.clearedCount > 0
                  ? `
              <button type="button" data-mb-action="start-cleared" class="px-5 py-3 bg-slate-900 hover:bg-indigo-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap">
                <span>Re-test Cleared (${summary.clearedCount})</span>
                <i class="fa-solid fa-rotate-right text-xs" aria-hidden="true"></i>
              </button>
            `
                  : ''
            }
          </div>
        </div>

        ${
          summary.totalCount > 0
            ? `
          <div class="space-y-1.5 pt-2 border-t border-slate-100">
            <div class="flex items-center justify-between text-xs text-slate-600">
              <span class="font-semibold">Mistakes Cleared Progress</span>
              <span class="font-bold text-slate-900 tabular-nums">${summary.clearedCount} / ${summary.totalCount} (${summary.clearedPct}%)</span>
            </div>
            <div class="w-full h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow="${summary.clearedPct}" aria-valuemin="0" aria-valuemax="100" aria-label="Mistakes cleared progress">
              <div class="h-full rounded-full bg-emerald-600 transition-all duration-300" style="width: ${summary.clearedPct}%"></div>
            </div>
          </div>
        `
            : ''
        }
      </section>

      <!-- Filter Toolbar -->
      ${
        summary.totalCount > 0
          ? `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div role="tablist" aria-label="Filter mistakes by status" class="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-xl self-start">
            ${statusTabs
              .map((tab) => {
                const active = state.statusFilter === tab.id;
                const cls = active
                  ? 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-slate-900 shadow-sm whitespace-nowrap'
                  : 'px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 whitespace-nowrap';
                return `<button type="button" role="tab" aria-selected="${active ? 'true' : 'false'}" data-mb-status="${tab.id}" class="${cls} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">${esc(tab.label)}</button>`;
              })
              .join('')}
          </div>

          <div class="flex items-center gap-2">
            <label for="mb-topic-filter" class="text-xs font-semibold text-slate-600 whitespace-nowrap">Topic:</label>
            <select id="mb-topic-filter" class="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              ${topicOptionsHtml}
            </select>
          </div>
        </div>
      `
          : ''
      }

      ${listHtml}
    </div>
  `;
}

function attachMistakeBankListeners(): void {
  if (!rootContainer || !uiState) return;
  const collection = getLiveCollection();

  // Status filter tabs
  rootContainer.querySelectorAll<HTMLButtonElement>('[data-mb-status]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.dataset.mbStatus as MistakeStatusFilter;
      if (uiState && next) {
        uiState.statusFilter = next;
        renderMistakeBank();
      }
    });
  });

  // Topic dropdown
  const topicSel = rootContainer.querySelector<HTMLSelectElement>('#mb-topic-filter');
  if (topicSel) {
    topicSel.addEventListener('change', () => {
      if (uiState) {
        uiState.topicFilter = topicSel.value as 'ALL' | TopicAreaId;
        renderMistakeBank();
      }
    });
  }

  // Queue actions
  rootContainer.querySelectorAll<HTMLButtonElement>('[data-mb-retry-one]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.mbRetryOne;
      if (id) startRetryDeck([id]);
    });
  });

  rootContainer.querySelectorAll<HTMLButtonElement>('[data-mb-reopen]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.mbReopen;
      if (!id || !uiState) return;
      uiState.storage = reopenMistake(uiState.storage, id);
      saveStorage(uiState.storage);
      renderMistakeBank();
      uiOptions?.onShowToast?.('Moved back to your To Fix list.', 'info');
    });
  });

  rootContainer.querySelectorAll<HTMLButtonElement>('[data-mb-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!uiState) return;
      const action = btn.dataset.mbAction;
      if (action === 'go-warmup') {
        uiOptions?.onStartWarmup?.();
      } else if (action === 'go-paper') {
        uiOptions?.onStartPracticePaper?.();
      } else if (action === 'start-to-fix') {
        const toFix = filterMistakes(collection.items, {
          status: 'to-fix',
          topic: uiState.topicFilter,
        });
        const queue = toFix.length > 0 ? toFix : filterMistakes(collection.items, { status: 'to-fix' });
        startRetryDeck(queue.map((i) => i.id));
      } else if (action === 'start-cleared') {
        const cleared = filterMistakes(collection.items, { status: 'cleared' });
        startRetryDeck(cleared.map((i) => i.id));
      } else if (action === 'exit-deck') {
        uiState.deck = null;
        renderMistakeBank();
      } else if (action === 'open-cheat-sheet') {
        const ta = (btn.dataset.ta || 'TA1') as TopicAreaId;
        uiOptions?.onOpenQuickRef?.(ta);
      } else if (action === 'check-retry') {
        const deck = uiState.deck;
        const item = getActiveDeckItem(collection);
        if (!deck || !item) return;
        const evalRes = evaluateMistakeRetry(item, deck.draftAnswer);
        deck.evaluation = evalRes;
        deck.attemptedInSession += 1;
        if (evalRes.isFullMarks) {
          deck.clearedInSession += 1;
        }
        uiState.storage = applyRetryOutcome(uiState.storage, item.id, evalRes.isFullMarks, Date.now());
        saveStorage(uiState.storage);
        renderMistakeBank();
        if (evalRes.isFullMarks) {
          uiOptions?.onShowToast?.('Cleared! Question mastered.', 'success');
        }
      } else if (action === 'retry-same') {
        const deck = uiState.deck;
        const item = getActiveDeckItem(collection);
        if (!deck || !item) return;
        deck.draftAnswer = buildInitialDraft(item);
        deck.evaluation = null;
        renderMistakeBank();
      } else if (action === 'next-question') {
        const deck = uiState.deck;
        if (!deck) return;
        if (deck.currentIndex >= deck.queueIds.length - 1) {
          deck.finished = true;
          renderMistakeBank();
          return;
        }
        deck.currentIndex += 1;
        const nextItem = getActiveDeckItem(collection);
        deck.draftAnswer = nextItem ? buildInitialDraft(nextItem) : '';
        deck.evaluation = null;
        renderMistakeBank();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  // Deck input listeners
  const deck = uiState.deck;
  if (!deck || deck.evaluation) return;

  rootContainer.querySelectorAll<HTMLInputElement>('[data-mb-mcq]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        deck.draftAnswer = radio.dataset.mbMcq || '';
        renderMistakeBank();
      }
    });
  });

  rootContainer.querySelectorAll<HTMLButtonElement>('[data-mb-tf]').forEach((btn) => {
    btn.addEventListener('click', () => {
      deck.draftAnswer = btn.dataset.mbTf === 'true';
      renderMistakeBank();
    });
  });

  const textInput = rootContainer.querySelector<HTMLInputElement>('#mb-text-input');
  if (textInput) {
    textInput.addEventListener('input', () => {
      deck.draftAnswer = textInput.value;
    });
  }

  rootContainer.querySelectorAll<HTMLInputElement>('[data-mb-multi]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.mbMulti || '';
      const current = Array.isArray(deck.draftAnswer) ? [...deck.draftAnswer.map(String)] : [];
      if (cb.checked && !current.includes(id)) current.push(id);
      else if (!cb.checked) {
        const idx = current.indexOf(id);
        if (idx >= 0) current.splice(idx, 1);
      }
      deck.draftAnswer = current;
      renderMistakeBank();
    });
  });

  rootContainer.querySelectorAll<HTMLSelectElement>('[data-mb-cloze]').forEach((sel) => {
    sel.addEventListener('change', () => {
      const key = sel.dataset.mbCloze || '';
      const cur =
        deck.draftAnswer && typeof deck.draftAnswer === 'object'
          ? { ...(deck.draftAnswer as Record<string, string>) }
          : {};
      cur[key] = sel.value;
      deck.draftAnswer = cur;
    });
  });

  rootContainer.querySelectorAll<HTMLSelectElement>('[data-mb-matrix]').forEach((sel) => {
    sel.addEventListener('change', () => {
      const rowId = sel.dataset.mbMatrix || '';
      const cur =
        deck.draftAnswer && typeof deck.draftAnswer === 'object'
          ? { ...(deck.draftAnswer as Record<string, string>) }
          : {};
      cur[rowId] = sel.value;
      deck.draftAnswer = cur;
    });
  });

  rootContainer.querySelectorAll<HTMLButtonElement>('[data-mb-seq-move]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [idxStr, deltaStr] = (btn.dataset.mbSeqMove || '').split(':');
      const idx = Number(idxStr);
      const delta = Number(deltaStr);
      const order = Array.isArray(deck.draftAnswer) ? [...deck.draftAnswer.map(String)] : [];
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= order.length) return;
      const tmp = order[idx];
      order[idx] = order[nextIdx];
      order[nextIdx] = tmp;
      deck.draftAnswer = order;
      renderMistakeBank();
    });
  });

  const extArea = rootContainer.querySelector<HTMLTextAreaElement>('#mb-extended-input');
  if (extArea) {
    extArea.addEventListener('input', () => {
      deck.draftAnswer = extArea.value;
      const wcEl = rootContainer?.querySelector('#mb-extended-words');
      if (wcEl) {
        const words = extArea.value.trim() ? extArea.value.trim().split(/\s+/).length : 0;
        wcEl.textContent = `${words} words`;
      }
    });
  }
}

export function renderMistakeBank(): void {
  if (!rootContainer || !uiState) return;
  const collection = getLiveCollection();
  notifySummary(collection.summary);
  rootContainer.innerHTML = uiState.deck
    ? renderRetryDeckView(collection)
    : renderQueueView(collection);
  attachMistakeBankListeners();
}

export function initMistakeBankWorkspace(
  container: HTMLElement | null,
  options: MistakeBankUIOptions
): void {
  uiOptions = options;
  rootContainer = container;
  uiState = {
    storage: loadStorage(),
    statusFilter: 'to-fix',
    topicFilter: 'ALL',
    deck: null,
  };
  renderMistakeBank();
}

export function getMistakeBankSummary(
  getCollectionInput: () => MistakeBankCollectionInput
): MistakeBankSummary {
  const storage = uiState ? uiState.storage : loadStorage();
  const collection = collectMistakes(getCollectionInput(), storage);
  return collection.summary;
}
