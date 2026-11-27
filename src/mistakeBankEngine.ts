import type { TopicAreaId } from './dashboardAnalytics';
import {
  TOPIC_AREA_TITLES,
  TOPIC_ORDER,
  WARMUP_QUESTION_BANK,
  evaluateWarmupAnswer,
  type DailyWarmupStorageState,
  type WarmupQuestion,
} from './dailyWarmupEngine';

export type MistakeSource = 'exam' | 'warmup';
export type MistakeReason = 'wrong' | 'partial' | 'flagged' | 'missed-warmup';
export type MistakeStatusFilter = 'to-fix' | 'flagged' | 'cleared' | 'all';

export interface ExamPaperQuestionLike {
  id: string;
  isScenarioHeader?: boolean;
  title?: string;
  description?: string;
  ta?: string;
  taName?: string;
  marks?: number;
  type?: 'mcq' | 'text' | 'multiselect' | 'cloze' | 'matrix' | 'sequence' | 'extended';
  question?: string;
  options?: Array<string | { id: string; text: string; correct?: boolean }>;
  correct?: string;
  accepted?: string[];
  text?: string;
  dropdowns?: Record<string, string[]>;
  answers?: Record<string, string>;
  rows?: Array<{ id: string; label: string }>;
  cols?: string[];
  correctMap?: Record<string, string>;
  items?: Array<{ id: string; label: string; text?: string }>;
  correctOrder?: string[];
  scaffoldPrompt?: string;
  keywords?: { ao1: string[]; ao2: string[]; ao3: string[] };
  explanation?: string;
}

export interface ExamPaperSnapshotInput {
  paperId: string;
  paperTitle: string;
  shortTitle?: string;
  sectionA: ExamPaperQuestionLike[];
  sectionB: ExamPaperQuestionLike[];
  answers?: Record<string, unknown>;
  flags?: Record<string, boolean>;
  checked?: Record<string, boolean>;
  submitted?: boolean;
  scores?: Record<string, number>;
  updatedAt?: number;
}

export interface MistakeBankCollectionInput {
  papers: ExamPaperSnapshotInput[];
  warmupStorage?: DailyWarmupStorageState | null;
  warmupQuestionBank?: WarmupQuestion[];
}

export interface MistakeBankStorageState {
  clearedAtMap: Record<string, number>;
  retryCounts: Record<string, number>;
}

export type MistakeInputSpec =
  | {
      kind: 'mcq';
      options: Array<{ value: string; label: string }>;
      correctValue: string;
    }
  | {
      kind: 'true-false';
      correctBoolean: boolean;
    }
  | {
      kind: 'text';
      accepted: string[];
      displayAnswer: string;
    }
  | {
      kind: 'multiselect';
      options: Array<{ id: string; text: string; correct: boolean }>;
    }
  | {
      kind: 'cloze';
      templateText: string;
      dropdowns: Record<string, string[]>;
      answers: Record<string, string>;
    }
  | {
      kind: 'matrix';
      rows: Array<{ id: string; label: string }>;
      cols: string[];
      correctMap: Record<string, string>;
    }
  | {
      kind: 'sequence';
      items: Array<{ id: string; label: string }>;
      correctOrder: string[];
    }
  | {
      kind: 'extended';
      scaffoldPrompt: string;
      keywords: { ao1: string[]; ao2: string[]; ao3: string[] };
    };

export interface MistakeItem {
  id: string;
  source: MistakeSource;
  reason: MistakeReason;
  isFlagged: boolean;
  sourceLabel: string;
  ta: TopicAreaId;
  taName: string;
  scenarioTitle: string | null;
  scenarioDescription: string | null;
  question: string;
  marks: number;
  lastScore: number | null;
  explanation: string;
  correctSummary: string;
  inputSpec: MistakeInputSpec;
  sourceUpdatedAt: number;
  cleared: boolean;
  clearedAt: number | null;
  retryAttempts: number;
}

export interface MistakeBankSummary {
  totalCount: number;
  toFixCount: number;
  clearedCount: number;
  flaggedCount: number;
  examCount: number;
  warmupCount: number;
  clearedPct: number;
  countsByTopic: Record<TopicAreaId, { toFix: number; total: number }>;
}

export interface MistakeBankCollection {
  items: MistakeItem[];
  summary: MistakeBankSummary;
}

export interface MistakeRetryEvaluation {
  isFullMarks: boolean;
  score: number;
  maxMarks: number;
  feedbackTitle: string;
  explanation: string;
  correctSummary: string;
}

const VALID_TA_SET = new Set<string>(TOPIC_ORDER);

function normalizeTa(raw: string | undefined): TopicAreaId {
  const upper = String(raw || 'TA1').toUpperCase();
  if (VALID_TA_SET.has(upper)) return upper as TopicAreaId;
  return 'TA1';
}

function buildExamInputSpec(q: ExamPaperQuestionLike): {
  spec: MistakeInputSpec;
  correctSummary: string;
} | null {
  if (q.type === 'mcq' && Array.isArray(q.options) && typeof q.correct === 'string') {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const mapped = q.options.map((opt, idx) => {
      const label = typeof opt === 'string' ? opt : opt.text;
      const letterMatch = typeof opt === 'string' ? opt.match(/^([A-F])\)/i) : null;
      const value = letterMatch ? letterMatch[1].toUpperCase() : letters[idx] || String(idx);
      return { value, label };
    });
    const correctOpt = mapped.find((o) => o.value === q.correct);
    return {
      spec: {
        kind: 'mcq',
        options: mapped,
        correctValue: q.correct,
      },
      correctSummary: correctOpt ? correctOpt.label : q.correct,
    };
  }

  if (q.type === 'text' && Array.isArray(q.accepted) && q.accepted.length > 0) {
    return {
      spec: {
        kind: 'text',
        accepted: q.accepted,
        displayAnswer: q.accepted[0],
      },
      correctSummary: q.accepted.slice(0, 3).join(' / '),
    };
  }

  if (q.type === 'multiselect' && Array.isArray(q.options)) {
    const normalized = q.options
      .filter((o): o is { id: string; text: string; correct?: boolean } => typeof o !== 'string')
      .map((o) => ({ id: o.id, text: o.text, correct: Boolean(o.correct) }));
    const correctTexts = normalized.filter((o) => o.correct).map((o) => o.text);
    return {
      spec: {
        kind: 'multiselect',
        options: normalized,
      },
      correctSummary: correctTexts.join(' · '),
    };
  }

  if (q.type === 'cloze' && typeof q.text === 'string' && q.dropdowns && q.answers) {
    const keys = Object.keys(q.answers).sort((a, b) => Number(a) - Number(b));
    return {
      spec: {
        kind: 'cloze',
        templateText: q.text,
        dropdowns: q.dropdowns,
        answers: q.answers,
      },
      correctSummary: keys.map((k) => `(${k}) ${q.answers![k]}`).join(' · '),
    };
  }

  if (q.type === 'matrix' && Array.isArray(q.rows) && Array.isArray(q.cols) && q.correctMap) {
    return {
      spec: {
        kind: 'matrix',
        rows: q.rows,
        cols: q.cols,
        correctMap: q.correctMap,
      },
      correctSummary: q.rows.map((r) => `${r.label} → ${q.correctMap![r.id]}`).join(' | '),
    };
  }

  if (q.type === 'sequence' && Array.isArray(q.items) && Array.isArray(q.correctOrder)) {
    const labelById = new Map(q.items.map((i) => [i.id, i.label]));
    return {
      spec: {
        kind: 'sequence',
        items: q.items.map((i) => ({ id: i.id, label: i.label })),
        correctOrder: q.correctOrder,
      },
      correctSummary: q.correctOrder
        .map((id, idx) => `${idx + 1}. ${labelById.get(id) || id}`)
        .join(' → '),
    };
  }

  if (q.type === 'extended' && q.keywords) {
    return {
      spec: {
        kind: 'extended',
        scaffoldPrompt: q.scaffoldPrompt || '',
        keywords: q.keywords,
      },
      correctSummary:
        'Level 3 (7–9 marks): 120+ words covering AO1 concepts, AO2 applied benefits/risks, and an AO3 justified conclusion.',
    };
  }

  return null;
}

function buildWarmupInputSpec(q: WarmupQuestion): {
  spec: MistakeInputSpec;
  correctSummary: string;
} {
  if (q.type === 'mcq' && Array.isArray(q.options)) {
    const options = q.options.map((label, idx) => ({
      value: String(idx),
      label,
    }));
    const correctIdx = typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0;
    return {
      spec: {
        kind: 'mcq',
        options,
        correctValue: String(correctIdx),
      },
      correctSummary: q.displayAnswer || q.options[correctIdx] || '',
    };
  }

  if (q.type === 'true-false') {
    const boolVal = Boolean(q.correctBoolean);
    return {
      spec: {
        kind: 'true-false',
        correctBoolean: boolVal,
      },
      correctSummary: q.displayAnswer || (boolVal ? 'True' : 'False'),
    };
  }

  return {
    spec: {
      kind: 'text',
      accepted: q.acceptedAnswers || [q.displayAnswer],
      displayAnswer: q.displayAnswer,
    },
    correctSummary: q.displayAnswer,
  };
}

export function createEmptyMistakeBankStorage(): MistakeBankStorageState {
  return {
    clearedAtMap: {},
    retryCounts: {},
  };
}

export function collectMistakes(
  input: MistakeBankCollectionInput,
  storage: MistakeBankStorageState = createEmptyMistakeBankStorage()
): MistakeBankCollection {
  const map = new Map<string, MistakeItem>();
  const clearedAtMap = storage?.clearedAtMap || {};
  const retryCounts = storage?.retryCounts || {};

  // 1. Collect wrong, partial, and flagged questions from exam papers
  for (const paper of input.papers || []) {
    const flags = paper.flags || {};
    const checked = paper.checked || {};
    const scores = paper.scores || {};
    const submitted = Boolean(paper.submitted);
    const updatedAt = typeof paper.updatedAt === 'number' ? paper.updatedAt : 0;
    const labelBase = paper.shortTitle || paper.paperTitle || 'Exam Paper';

    let qNum = 1;

    // Section A
    for (const q of paper.sectionA || []) {
      const currentNum = qNum++;
      const isFlagged = Boolean(flags[q.id]);
      const isEvaluated = Boolean(submitted || checked[q.id]);
      const maxMarks = typeof q.marks === 'number' && q.marks > 0 ? q.marks : 1;
      const score = typeof scores[q.id] === 'number' ? scores[q.id] : 0;
      const isMissed = isEvaluated && score < maxMarks;

      if (!isMissed && !isFlagged) continue;

      const built = buildExamInputSpec(q);
      if (!built) continue;

      const id = `exam:${paper.paperId}:${q.id}`;
      const ta = normalizeTa(q.ta);
      const clearedAt = typeof clearedAtMap[id] === 'number' ? clearedAtMap[id] : null;
      const isCleared = clearedAt !== null && clearedAt >= updatedAt;

      const reason: MistakeReason = isMissed
        ? score > 0
          ? 'partial'
          : 'wrong'
        : 'flagged';

      map.set(id, {
        id,
        source: 'exam',
        reason,
        isFlagged,
        sourceLabel: `${labelBase} · Q${currentNum}`,
        ta,
        taName: q.taName || TOPIC_AREA_TITLES[ta],
        scenarioTitle: null,
        scenarioDescription: null,
        question: q.question || '',
        marks: maxMarks,
        lastScore: isEvaluated ? score : null,
        explanation: q.explanation || 'Review the key Unit R050 specification points for this question.',
        correctSummary: built.correctSummary,
        inputSpec: built.spec,
        sourceUpdatedAt: updatedAt,
        cleared: isCleared,
        clearedAt: isCleared ? clearedAt : null,
        retryAttempts: retryCounts[id] || 0,
      });
    }

    // Section B (track active scenario header so students always see full context!)
    let activeScenarioTitle: string | null = null;
    let activeScenarioDesc: string | null = null;
    for (const q of paper.sectionB || []) {
      if (q.isScenarioHeader) {
        activeScenarioTitle = q.title || null;
        activeScenarioDesc = q.description || null;
        continue;
      }
      const currentNum = qNum++;
      const isFlagged = Boolean(flags[q.id]);
      const isEvaluated = Boolean(submitted || checked[q.id]);
      const maxMarks = typeof q.marks === 'number' && q.marks > 0 ? q.marks : 1;
      const score = typeof scores[q.id] === 'number' ? scores[q.id] : 0;
      const isMissed = isEvaluated && score < maxMarks;

      if (!isMissed && !isFlagged) continue;

      const built = buildExamInputSpec(q);
      if (!built) continue;

      const id = `exam:${paper.paperId}:${q.id}`;
      const ta = normalizeTa(q.ta);
      const clearedAt = typeof clearedAtMap[id] === 'number' ? clearedAtMap[id] : null;
      const isCleared = clearedAt !== null && clearedAt >= updatedAt;

      const reason: MistakeReason = isMissed
        ? score > 0
          ? 'partial'
          : 'wrong'
        : 'flagged';

      map.set(id, {
        id,
        source: 'exam',
        reason,
        isFlagged,
        sourceLabel: `${labelBase} · Q${currentNum}`,
        ta,
        taName: q.taName || TOPIC_AREA_TITLES[ta],
        scenarioTitle: activeScenarioTitle,
        scenarioDescription: activeScenarioDesc,
        question: q.question || '',
        marks: maxMarks,
        lastScore: isEvaluated ? score : null,
        explanation: q.explanation || 'Review the key Unit R050 specification points for this question.',
        correctSummary: built.correctSummary,
        inputSpec: built.spec,
        sourceUpdatedAt: updatedAt,
        cleared: isCleared,
        clearedAt: isCleared ? clearedAt : null,
        retryAttempts: retryCounts[id] || 0,
      });
    }
  }

  // 2. Collect missed Daily Warm-Up questions via missedSpecIds
  const warmupSessions = input.warmupStorage?.sessions || [];
  const warmupBank = input.warmupQuestionBank || WARMUP_QUESTION_BANK;
  const latestMissedBySpec = new Map<string, number>();

  for (const sess of warmupSessions) {
    const ts = Date.parse(sess.completedAt || '') || 0;
    for (const specId of sess.missedSpecIds || []) {
      const prev = latestMissedBySpec.get(specId) || 0;
      if (ts >= prev) {
        latestMissedBySpec.set(specId, ts);
      }
    }
  }

  for (const [specId, missedTs] of latestMissedBySpec.entries()) {
    const matched = warmupBank.find((wq) => wq.specItemId === specId);
    if (!matched) continue;

    const id = `warmup:${matched.id}`;
    const built = buildWarmupInputSpec(matched);
    const ta = normalizeTa(matched.ta);
    const clearedAt = typeof clearedAtMap[id] === 'number' ? clearedAtMap[id] : null;
    const isCleared = clearedAt !== null && clearedAt >= missedTs;

    map.set(id, {
      id,
      source: 'warmup',
      reason: 'missed-warmup',
      isFlagged: false,
      sourceLabel: `Daily Warm-Up · ${matched.specCode}`,
      ta,
      taName: TOPIC_AREA_TITLES[ta],
      scenarioTitle: matched.context ? `Context (${matched.specCode})` : null,
      scenarioDescription: matched.context || null,
      question: matched.prompt,
      marks: 1,
      lastScore: 0,
      explanation: matched.examinerNote,
      correctSummary: built.correctSummary,
      inputSpec: built.spec,
      sourceUpdatedAt: missedTs,
      cleared: isCleared,
      clearedAt: isCleared ? clearedAt : null,
      retryAttempts: retryCounts[id] || 0,
    });
  }

  // Sort: To Fix first (most recently updated first), then Cleared
  const items = Array.from(map.values()).sort((a, b) => {
    if (a.cleared !== b.cleared) return a.cleared ? 1 : -1;
    if (a.sourceUpdatedAt !== b.sourceUpdatedAt) return b.sourceUpdatedAt - a.sourceUpdatedAt;
    return a.id.localeCompare(b.id);
  });

  const countsByTopic = {} as Record<TopicAreaId, { toFix: number; total: number }>;
  for (const ta of TOPIC_ORDER) {
    countsByTopic[ta] = { toFix: 0, total: 0 };
  }

  let toFixCount = 0;
  let clearedCount = 0;
  let flaggedCount = 0;
  let examCount = 0;
  let warmupCount = 0;

  for (const item of items) {
    countsByTopic[item.ta].total++;
    if (item.cleared) {
      clearedCount++;
    } else {
      toFixCount++;
      countsByTopic[item.ta].toFix++;
    }
    if (item.isFlagged) flaggedCount++;
    if (item.source === 'exam') examCount++;
    else warmupCount++;
  }

  const totalCount = items.length;
  const clearedPct = totalCount > 0 ? Math.round((clearedCount / totalCount) * 100) : 100;

  return {
    items,
    summary: {
      totalCount,
      toFixCount,
      clearedCount,
      flaggedCount,
      examCount,
      warmupCount,
      clearedPct,
      countsByTopic,
    },
  };
}

export function filterMistakes(
  items: MistakeItem[],
  options: {
    status?: MistakeStatusFilter;
    topic?: 'ALL' | TopicAreaId;
    source?: 'all' | MistakeSource;
  } = {}
): MistakeItem[] {
  const status = options.status || 'to-fix';
  const topic = options.topic || 'ALL';
  const source = options.source || 'all';

  return items.filter((item) => {
    if (status === 'to-fix' && item.cleared) return false;
    if (status === 'cleared' && !item.cleared) return false;
    if (status === 'flagged' && !item.isFlagged) return false;
    if (topic !== 'ALL' && item.ta !== topic) return false;
    if (source !== 'all' && item.source !== source) return false;
    return true;
  });
}

export function evaluateMistakeRetry(
  item: MistakeItem,
  userAnswer: unknown
): MistakeRetryEvaluation {
  const spec = item.inputSpec;
  let score = 0;
  const maxMarks = item.marks;

  if (spec.kind === 'mcq') {
    if (typeof userAnswer === 'string' && userAnswer === spec.correctValue) {
      score = maxMarks;
    }
  } else if (spec.kind === 'true-false') {
    if (typeof userAnswer === 'boolean' && userAnswer === spec.correctBoolean) {
      score = maxMarks;
    }
  } else if (spec.kind === 'text') {
    const textVal = typeof userAnswer === 'string' ? userAnswer : '';
    const warmupEval = evaluateWarmupAnswer(
      {
        id: item.id,
        ta: item.ta,
        specItemId: item.id,
        specCode: item.ta,
        type: 'short-recall',
        prompt: item.question,
        acceptedAnswers: spec.accepted,
        displayAnswer: spec.displayAnswer,
        examinerNote: item.explanation,
      },
      textVal
    );
    score = warmupEval.isCorrect ? maxMarks : 0;
  } else if (spec.kind === 'multiselect') {
    const selected = Array.isArray(userAnswer) ? userAnswer.map(String) : [];
    const correctIds = spec.options.filter((o) => o.correct).map((o) => o.id);
    const wrongIds = spec.options.filter((o) => !o.correct).map((o) => o.id);
    let tally = 0;
    for (const id of selected) {
      if (correctIds.includes(id)) tally++;
      if (wrongIds.includes(id)) tally = Math.max(0, tally - 1);
    }
    score = Math.min(maxMarks, tally);
  } else if (spec.kind === 'cloze') {
    const mapAns =
      userAnswer && typeof userAnswer === 'object' ? (userAnswer as Record<string, string>) : {};
    let hits = 0;
    for (const key of Object.keys(spec.answers)) {
      if (mapAns[key] === spec.answers[key]) hits++;
    }
    score = Math.min(maxMarks, hits);
  } else if (spec.kind === 'matrix') {
    const mapAns =
      userAnswer && typeof userAnswer === 'object' ? (userAnswer as Record<string, string>) : {};
    let hits = 0;
    for (const rowId of Object.keys(spec.correctMap)) {
      if (mapAns[rowId] === spec.correctMap[rowId]) hits++;
    }
    score = Math.min(maxMarks, hits);
  } else if (spec.kind === 'sequence') {
    const orderAns = Array.isArray(userAnswer) ? userAnswer.map(String) : [];
    let hits = 0;
    spec.correctOrder.forEach((expectedId, idx) => {
      if (orderAns[idx] === expectedId) hits++;
    });
    score =
      spec.correctOrder.length > 0
        ? Math.round((hits / spec.correctOrder.length) * maxMarks)
        : 0;
  } else if (spec.kind === 'extended') {
    const raw = typeof userAnswer === 'string' ? userAnswer.toLowerCase() : '';
    const wordCount = raw.trim() ? raw.trim().split(/\s+/).length : 0;
    let ao1 = 0;
    let ao2 = 0;
    let ao3 = 0;
    spec.keywords.ao1.forEach((kw) => {
      if (raw.includes(kw.toLowerCase())) ao1++;
    });
    spec.keywords.ao2.forEach((kw) => {
      if (raw.includes(kw.toLowerCase())) ao2++;
    });
    spec.keywords.ao3.forEach((kw) => {
      if (raw.includes(kw.toLowerCase())) ao3++;
    });

    if (wordCount < 20) {
      score = 0;
    } else if (wordCount < 60) {
      score = Math.min(3, 1 + (ao1 > 0 ? 1 : 0) + (ao2 > 0 ? 1 : 0));
    } else if (wordCount < 120) {
      score = Math.min(6, 3 + (ao1 > 1 ? 1 : 0) + (ao2 > 1 ? 1 : 0) + (ao3 > 0 ? 1 : 0));
    } else {
      score = 5 + (ao1 >= 2 ? 1 : 0) + (ao2 >= 3 ? 1 : 0) + (ao3 >= 2 ? 2 : 0);
      score = Math.min(maxMarks, score);
    }
  }

  // For 9-mark extended responses, achieving Level 3 (7+/9) clears the mistake
  const isFullMarks = spec.kind === 'extended' ? score >= Math.min(7, maxMarks) : score >= maxMarks;

  const feedbackTitle = isFullMarks
    ? spec.kind === 'extended'
      ? `Cleared! Level 3 Achieved (${score} / ${maxMarks} Marks)`
      : `Cleared! Full Marks (${score} / ${maxMarks})`
    : score > 0
      ? `Almost there — ${score} / ${maxMarks} Marks`
      : `Not quite yet — ${score} / ${maxMarks} Marks`;

  return {
    isFullMarks,
    score,
    maxMarks,
    feedbackTitle,
    explanation: item.explanation,
    correctSummary: item.correctSummary,
  };
}

export function applyRetryOutcome(
  storage: MistakeBankStorageState,
  mistakeId: string,
  isCleared: boolean,
  nowMs: number = Date.now()
): MistakeBankStorageState {
  const nextCleared = { ...(storage?.clearedAtMap || {}) };
  const nextRetries = { ...(storage?.retryCounts || {}) };
  nextRetries[mistakeId] = (nextRetries[mistakeId] || 0) + 1;

  if (isCleared) {
    nextCleared[mistakeId] = nowMs;
  } else {
    delete nextCleared[mistakeId];
  }

  return {
    clearedAtMap: nextCleared,
    retryCounts: nextRetries,
  };
}

export function reopenMistake(
  storage: MistakeBankStorageState,
  mistakeId: string
): MistakeBankStorageState {
  const nextCleared = { ...(storage?.clearedAtMap || {}) };
  delete nextCleared[mistakeId];
  return {
    clearedAtMap: nextCleared,
    retryCounts: { ...(storage?.retryCounts || {}) },
  };
}
