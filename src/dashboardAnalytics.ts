export type TopicAreaId = 'TA1' | 'TA2' | 'TA3' | 'TA4' | 'TA5' | 'TA6';

export type DashboardSourceFilter = 'all' | 'official' | 'practice';

export type TopicSortMode = 'weakest' | 'spec';

export type ReadinessStatus = 'priority' | 'building' | 'ready' | 'untested';

export interface TopicAreaMeta {
  id: TopicAreaId;
  code: string;
  title: string;
}

export interface GradeBoundaryResult {
  grade: string;
  shortGrade: string;
  normalizedOutOf80: number;
  pct: number;
  nextGrade: string | null;
  pointsToNextOutOf80: number;
  pctToNext: number;
}

export interface OfficialAttemptSummary {
  totalAwarded: number;
  totalMax: number;
  percentage?: number;
  grade?: string;
  taBreakdown?: Record<string, { earned: number; max: number }>;
}

export interface OfficialAttemptInput {
  answers?: Record<string, unknown>;
  diagrams?: Record<string, { hasDrawing?: boolean }>;
  grades?: Record<string, { marksAwarded: number; maxMarks: number }>;
  summary?: OfficialAttemptSummary | null;
  submitted?: boolean;
  updatedAt?: string | number | null;
}

export interface OfficialPaperCatalogEntry {
  id: string;
  title: string;
  series: string;
  totalMarks: number;
  questionCount?: number;
}

export interface PracticeQuestionLite {
  id: string;
  ta: string;
  marks: number;
  isScenarioHeader?: boolean;
}

export interface PracticePaperDefLite {
  id: string;
  title: string;
  shortTitle: string;
  totalMarks: number;
  sectionA: PracticeQuestionLite[];
  sectionB: PracticeQuestionLite[];
}

export interface PracticeSnapshotInput {
  paperId?: string;
  mode?: string;
  topicFilter?: string | null;
  answers?: Record<string, unknown>;
  submitted?: boolean;
  scores?: Record<string, number>;
  totalScore?: number;
  maxMarks?: number;
  taScores?: Record<string, { name?: string; score: number; max: number }> | null;
  answeredCount?: number;
  totalQuestions?: number;
  updatedAt?: number | string | null;
}

export interface ShuffledRunInput {
  id: string;
  title: string;
  shortTitle?: string;
  totalMarks: number;
  questionCount?: number;
  mode?: string;
  submitted?: boolean;
  totalScore?: number;
  answeredCount?: number;
  updatedAt?: number | string | null;
  customPaper?: PracticePaperDefLite;
  snapshot?: PracticeSnapshotInput;
}

export interface FlashcardItemLite {
  id: string;
  ta: string;
}

export interface CoachPromptLite {
  id: string;
  title: string;
  primaryTA: string;
}

export interface DashboardComputationInput {
  candidateName?: string;
  candidateClass?: string;
  sourceFilter?: DashboardSourceFilter;
  topicSort?: TopicSortMode;
  topics?: TopicAreaMeta[];
  officialCatalog?: OfficialPaperCatalogEntry[];
  officialAttempts?: Record<string, OfficialAttemptInput>;
  practicePaperDefs?: Record<string, PracticePaperDefLite>;
  practiceArchivePapers?: Record<string, PracticeSnapshotInput>;
  shuffledRuns?: ShuffledRunInput[];
  liveState?: PracticeSnapshotInput & { customPaper?: PracticePaperDefLite | null };
  flashcardDeck?: FlashcardItemLite[];
  flashcardProgress?: Record<string, 'mastered' | 'learning' | string>;
  coachPrompts?: CoachPromptLite[];
  coachDrafts?: Record<string, string>;
}

export interface TopicAreaStat {
  id: TopicAreaId;
  code: string;
  title: string;
  examEarned: number;
  examMax: number;
  examPct: number | null;
  status: ReadinessStatus;
  statusLabel: string;
  flashcardsMastered: number;
  flashcardsLearning: number;
  flashcardsTotal: number;
  flashcardPct: number;
}

export interface AssessmentHistoryItem {
  id: string;
  paperId: string;
  title: string;
  shortTitle: string;
  source: 'official' | 'practice' | 'shuffled';
  sourceLabel: string;
  modeLabel: string;
  status: 'marked' | 'in_progress';
  earned: number;
  maxMarks: number;
  pct: number;
  grade: string;
  answeredCount: number;
  totalQuestions: number;
  updatedAtMs: number;
  runId?: string;
}

export interface ScoreTrajectoryPoint {
  id: string;
  label: string;
  fullTitle: string;
  source: 'official' | 'practice' | 'shuffled';
  pct: number;
  earned: number;
  maxMarks: number;
  grade: string;
  updatedAtMs: number;
}

export interface WeaknessRecommendation {
  hasExamData: boolean;
  primaryTA: TopicAreaId;
  primaryTitle: string;
  secondaryTA: TopicAreaId | null;
  targetTAs: TopicAreaId[];
  headline: string;
  explanation: string;
  primaryPct: number | null;
}

export interface ProgressDashboardReport {
  candidateName: string;
  candidateClass: string;
  sourceFilter: DashboardSourceFilter;
  topicSort: TopicSortMode;
  hasExamData: boolean;
  hasAnyActivity: boolean;
  overallEarned: number;
  overallMax: number;
  overallPct: number | null;
  overallGrade: GradeBoundaryResult | null;
  papersMarkedCount: number;
  papersInProgressCount: number;
  totalCatalogPapers: number;
  averagePaperPct: number | null;
  flashcardsMastered: number;
  flashcardsLearning: number;
  flashcardsTotal: number;
  coachDraftedCount: number;
  coachTotalPrompts: number;
  coachTotalWords: number;
  topicStats: TopicAreaStat[];
  weakness: WeaknessRecommendation;
  trajectory: ScoreTrajectoryPoint[];
  history: AssessmentHistoryItem[];
}

export const DEFAULT_TOPIC_AREAS: TopicAreaMeta[] = [
  { id: 'TA1', code: 'TA1', title: 'Design Tools' },
  { id: 'TA2', code: 'TA2', title: 'HCI in Everyday Life' },
  { id: 'TA3', code: 'TA3', title: 'Data & Testing' },
  { id: 'TA4', code: 'TA4', title: 'Cyber-Security & Legislation' },
  { id: 'TA5', code: 'TA5', title: 'Digital Communications' },
  { id: 'TA6', code: 'TA6', title: 'Internet of Everything (IoE)' },
];

const GRADE_BOUNDARIES: Array<{ minOutOf80: number; grade: string; shortGrade: string }> = [
  { minOutOf80: 70, grade: 'Level 2 Distinction*', shortGrade: 'L2 D*' },
  { minOutOf80: 60, grade: 'Level 2 Distinction', shortGrade: 'L2 D' },
  { minOutOf80: 50, grade: 'Level 2 Merit', shortGrade: 'L2 M' },
  { minOutOf80: 40, grade: 'Level 2 Pass', shortGrade: 'L2 P' },
  { minOutOf80: 32, grade: 'Level 1 Distinction', shortGrade: 'L1 D' },
  { minOutOf80: 24, grade: 'Level 1 Merit', shortGrade: 'L1 M' },
  { minOutOf80: 16, grade: 'Level 1 Pass', shortGrade: 'L1 P' },
  { minOutOf80: 0, grade: 'Unclassified (U)', shortGrade: 'U' },
];

export function computeGradeFromScore(earned: number, maxMarks: number): GradeBoundaryResult {
  const safeMax = Math.max(0, Number(maxMarks) || 0);
  const safeEarned = Math.max(0, Math.min(safeMax || Number.MAX_SAFE_INTEGER, Number(earned) || 0));
  const pct = safeMax > 0 ? Math.round((safeEarned / safeMax) * 100) : 0;
  const normalizedOutOf80 = safeMax > 0 ? Math.round((safeEarned / safeMax) * 80) : 0;

  let matchedIdx = GRADE_BOUNDARIES.length - 1;
  for (let i = 0; i < GRADE_BOUNDARIES.length; i++) {
    if (normalizedOutOf80 >= GRADE_BOUNDARIES[i].minOutOf80) {
      matchedIdx = i;
      break;
    }
  }

  const current = GRADE_BOUNDARIES[matchedIdx];
  const nextBoundary = matchedIdx > 0 ? GRADE_BOUNDARIES[matchedIdx - 1] : null;
  const pointsToNextOutOf80 = nextBoundary ? Math.max(1, nextBoundary.minOutOf80 - normalizedOutOf80) : 0;
  const nextPct = nextBoundary ? Math.ceil((nextBoundary.minOutOf80 / 80) * 100) : 100;
  const pctToNext = nextBoundary ? Math.max(1, nextPct - pct) : 0;

  return {
    grade: current.grade,
    shortGrade: current.shortGrade,
    normalizedOutOf80,
    pct,
    nextGrade: nextBoundary ? nextBoundary.grade : null,
    pointsToNextOutOf80,
    pctToNext,
  };
}

function toTimestampMs(val: string | number | null | undefined): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim()) {
    const parsed = Date.parse(val);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function countMeaningfulAnswers(answers: Record<string, unknown> | undefined): number {
  if (!answers || typeof answers !== 'object') return 0;
  let count = 0;
  for (const val of Object.values(answers)) {
    if (val === null || val === undefined) continue;
    if (typeof val === 'string') {
      if (val.trim().length > 0) count++;
    } else if (Array.isArray(val)) {
      if (val.some((v) => String(v ?? '').trim().length > 0)) count++;
    } else if (typeof val === 'object') {
      if (Object.values(val as Record<string, unknown>).some((v) => String(v ?? '').trim().length > 0)) {
        count++;
      }
    } else {
      count++;
    }
  }
  return count;
}

function getStatusForPct(pct: number | null): { status: ReadinessStatus; label: string } {
  if (pct === null) return { status: 'untested', label: 'Not Tested' };
  if (pct < 50) return { status: 'priority', label: 'Priority Focus' };
  if (pct < 75) return { status: 'building', label: 'Building' };
  return { status: 'ready', label: 'Exam Ready' };
}

function extractPracticeTaBreakdown(
  snapshot: PracticeSnapshotInput,
  paperDef?: PracticePaperDefLite | null
): Record<TopicAreaId, { earned: number; max: number }> {
  const result: Record<TopicAreaId, { earned: number; max: number }> = {
    TA1: { earned: 0, max: 0 },
    TA2: { earned: 0, max: 0 },
    TA3: { earned: 0, max: 0 },
    TA4: { earned: 0, max: 0 },
    TA5: { earned: 0, max: 0 },
    TA6: { earned: 0, max: 0 },
  };

  if (snapshot.taScores && typeof snapshot.taScores === 'object') {
    for (const ta of ['TA1', 'TA2', 'TA3', 'TA4', 'TA5', 'TA6'] as TopicAreaId[]) {
      const entry = snapshot.taScores[ta];
      if (entry && entry.max > 0) {
        result[ta].earned += Math.max(0, Number(entry.score) || 0);
        result[ta].max += Math.max(0, Number(entry.max) || 0);
      }
    }
    const hasAnyFromTaScores = Object.values(result).some((v) => v.max > 0);
    if (hasAnyFromTaScores) return result;
  }

  if (paperDef && snapshot.scores && typeof snapshot.scores === 'object') {
    const questions = [
      ...(Array.isArray(paperDef.sectionA) ? paperDef.sectionA : []),
      ...(Array.isArray(paperDef.sectionB) ? paperDef.sectionB.filter((q) => !q.isScenarioHeader) : []),
    ];
    for (const q of questions) {
      const ta = q.ta as TopicAreaId;
      if (!result[ta]) continue;
      if (snapshot.submitted || Object.prototype.hasOwnProperty.call(snapshot.scores, q.id)) {
        const earned = Number(snapshot.scores[q.id]) || 0;
        result[ta].earned += Math.max(0, Math.min(q.marks, earned));
        result[ta].max += q.marks;
      }
    }
  }

  return result;
}

export function computeProgressDashboardData(input: DashboardComputationInput): ProgressDashboardReport {
  const topics = input.topics && input.topics.length ? input.topics : DEFAULT_TOPIC_AREAS;
  const sourceFilter: DashboardSourceFilter = input.sourceFilter || 'all';
  const topicSort: TopicSortMode = input.topicSort || 'weakest';

  const taExamTotals: Record<TopicAreaId, { earned: number; max: number }> = {
    TA1: { earned: 0, max: 0 },
    TA2: { earned: 0, max: 0 },
    TA3: { earned: 0, max: 0 },
    TA4: { earned: 0, max: 0 },
    TA5: { earned: 0, max: 0 },
    TA6: { earned: 0, max: 0 },
  };

  const history: AssessmentHistoryItem[] = [];

  // 1. Official OCR Past Papers
  const officialCatalog = input.officialCatalog || [];
  const officialMap = new Map(officialCatalog.map((p) => [p.id, p]));
  const officialAttempts = input.officialAttempts || {};

  if (sourceFilter === 'all' || sourceFilter === 'official') {
    for (const [paperId, attempt] of Object.entries(officialAttempts)) {
      if (!attempt) continue;
      const meta = officialMap.get(paperId);
      const grades = attempt.grades || {};
      const gradeEntries = Object.values(grades);
      const answeredAnswers = countMeaningfulAnswers(attempt.answers);
      const drawnDiagrams = Object.values(attempt.diagrams || {}).filter((d) => d && d.hasDrawing).length;
      const answeredCount = Math.max(answeredAnswers, drawnDiagrams, gradeEntries.length);

      const summary = attempt.summary || null;
      const hasMarkedData = Boolean(attempt.submitted || (summary && summary.totalMax > 0 && gradeEntries.length > 0) || gradeEntries.length > 0);
      if (!hasMarkedData && answeredCount === 0) continue;

      const maxMarks = (summary && summary.totalMax > 0 ? summary.totalMax : meta?.totalMarks) || 70;
      const earned = summary
        ? Math.max(0, Number(summary.totalAwarded) || 0)
        : gradeEntries.reduce((s, g) => s + (Number(g.marksAwarded) || 0), 0);

      const gradeInfo = computeGradeFromScore(earned, maxMarks);
      const isMarked = Boolean(attempt.submitted || gradeEntries.length > 0);

      if (isMarked && summary && summary.taBreakdown) {
        for (const ta of ['TA1', 'TA2', 'TA3', 'TA4', 'TA5', 'TA6'] as TopicAreaId[]) {
          const entry = summary.taBreakdown[ta];
          if (entry && entry.max > 0) {
            taExamTotals[ta].earned += Math.max(0, Number(entry.earned) || 0);
            taExamTotals[ta].max += Math.max(0, Number(entry.max) || 0);
          }
        }
      }

      history.push({
        id: `official_${paperId}`,
        paperId,
        title: meta?.title || paperId,
        shortTitle: meta?.series ? meta.series.replace(' · R050/01', '') : paperId,
        source: 'official',
        sourceLabel: 'Official OCR',
        modeLabel: attempt.submitted ? 'Completed' : 'Self-Marking',
        status: isMarked ? 'marked' : 'in_progress',
        earned,
        maxMarks,
        pct: gradeInfo.pct,
        grade: isMarked ? gradeInfo.grade : 'In Progress',
        answeredCount,
        totalQuestions: meta?.questionCount || 27,
        updatedAtMs: toTimestampMs(attempt.updatedAt),
      });
    }
  }

  // 2. Practice Papers (Paper 1, 2, 3) + Shuffled Runs (deduplicating liveState)
  const practiceDefs = input.practicePaperDefs || {};
  const archivePapers = input.practiceArchivePapers || {};
  const shuffledRuns = input.shuffledRuns || [];
  const liveState = input.liveState || null;

  if (sourceFilter === 'all' || sourceFilter === 'practice') {
    const mergedPracticeIds = new Set<string>([
      ...Object.keys(archivePapers),
      ...(liveState && liveState.paperId && liveState.paperId !== 'shuffled' ? [liveState.paperId] : []),
    ]);

    for (const pid of mergedPracticeIds) {
      const def = practiceDefs[pid] || null;
      const archived = archivePapers[pid];
      const liveMatches = Boolean(liveState && liveState.paperId === pid);
      const liveHasProgress = Boolean(
        liveMatches &&
          liveState &&
          (liveState.submitted ||
            countMeaningfulAnswers(liveState.answers) > 0 ||
            Object.keys(liveState.scores || {}).length > 0)
      );
      const snap: PracticeSnapshotInput | undefined = liveHasProgress && liveState ? liveState : archived || (liveMatches ? liveState || undefined : undefined);
      if (!snap) continue;
      const isLive = Boolean(liveHasProgress && snap === liveState);

      const allQs = def
        ? [...def.sectionA, ...def.sectionB.filter((q) => !q.isScenarioHeader)]
        : [];
      const totalQuestions = snap.totalQuestions || allQs.length || 32;
      const answeredCount = snap.answeredCount !== undefined ? snap.answeredCount : countMeaningfulAnswers(snap.answers);
      const checkedScoreEntries = Object.values(snap.scores || {});
      const isMarked = Boolean(snap.submitted);
      const hasCheckedPartial = checkedScoreEntries.length > 0;

      if (!isMarked && !hasCheckedPartial && answeredCount === 0) continue;

      const taBreakdown = extractPracticeTaBreakdown(snap, def);
      if (isMarked || hasCheckedPartial) {
        for (const ta of ['TA1', 'TA2', 'TA3', 'TA4', 'TA5', 'TA6'] as TopicAreaId[]) {
          taExamTotals[ta].earned += taBreakdown[ta].earned;
          taExamTotals[ta].max += taBreakdown[ta].max;
        }
      }

      const maxMarks = snap.maxMarks || def?.totalMarks || 80;
      const earned = isMarked
        ? Math.max(0, Number(snap.totalScore) || 0)
        : checkedScoreEntries.reduce((s, v) => s + (Number(v) || 0), 0);
      const gradeInfo = computeGradeFromScore(earned, maxMarks);

      history.push({
        id: `practice_${pid}`,
        paperId: pid,
        title: def?.title || pid,
        shortTitle: def?.shortTitle || pid,
        source: 'practice',
        sourceLabel: 'Practice Paper',
        modeLabel: snap.topicFilter ? `${snap.topicFilter} Focus` : (snap.mode === 'mock' ? 'Timed Mock' : 'Practice'),
        status: isMarked ? 'marked' : 'in_progress',
        earned,
        maxMarks,
        pct: gradeInfo.pct,
        grade: isMarked ? gradeInfo.grade : 'In Progress',
        answeredCount,
        totalQuestions,
        updatedAtMs: toTimestampMs(snap.updatedAt) || (isLive ? Date.now() : 0),
      });
    }

    // Shuffled custom sets
    const seenRunIds = new Set<string>();
    const allShuffled: ShuffledRunInput[] = [...shuffledRuns];
    if (liveState && liveState.paperId === 'shuffled' && liveState.customPaper) {
      const liveRunId = (liveState.customPaper as PracticePaperDefLite & { runId?: string }).runId || 'shuf_live';
      if (!allShuffled.some((r) => r.id === liveRunId)) {
        allShuffled.unshift({
          id: liveRunId,
          title: liveState.customPaper.title,
          shortTitle: liveState.customPaper.shortTitle,
          totalMarks: liveState.customPaper.totalMarks,
          mode: liveState.mode,
          submitted: liveState.submitted,
          totalScore: liveState.totalScore,
          answeredCount: countMeaningfulAnswers(liveState.answers),
          updatedAt: Date.now(),
          customPaper: liveState.customPaper,
          snapshot: liveState,
        });
      }
    }

    for (const run of allShuffled) {
      if (!run || seenRunIds.has(run.id)) continue;
      seenRunIds.add(run.id);

      const snap = run.snapshot || {};
      const isMarked = Boolean(run.submitted || snap.submitted);
      const checkedCount = Object.keys(snap.scores || {}).length;
      const answeredCount = run.answeredCount !== undefined ? run.answeredCount : countMeaningfulAnswers(snap.answers);
      if (!isMarked && checkedCount === 0 && answeredCount === 0) continue;

      const taBreakdown = extractPracticeTaBreakdown(snap, run.customPaper || null);
      if (isMarked || checkedCount > 0) {
        for (const ta of ['TA1', 'TA2', 'TA3', 'TA4', 'TA5', 'TA6'] as TopicAreaId[]) {
          taExamTotals[ta].earned += taBreakdown[ta].earned;
          taExamTotals[ta].max += taBreakdown[ta].max;
        }
      }

      const maxMarks = snap.maxMarks || run.totalMarks || 40;
      const earned = isMarked
        ? Math.max(0, Number(run.totalScore ?? snap.totalScore) || 0)
        : Object.values(snap.scores || {}).reduce((s, v) => s + (Number(v) || 0), 0);
      const gradeInfo = computeGradeFromScore(earned, maxMarks);

      history.push({
        id: `shuffled_${run.id}`,
        paperId: 'shuffled',
        runId: run.id,
        title: run.title || 'Custom Shuffled Set',
        shortTitle: run.shortTitle || 'Shuffled Set',
        source: 'shuffled',
        sourceLabel: 'Shuffled Set',
        modeLabel: (run.mode || snap.mode) === 'mock' ? 'Timed Mock' : 'Practice',
        status: isMarked ? 'marked' : 'in_progress',
        earned,
        maxMarks,
        pct: gradeInfo.pct,
        grade: isMarked ? gradeInfo.grade : 'In Progress',
        answeredCount,
        totalQuestions: run.questionCount || snap.totalQuestions || 16,
        updatedAtMs: toTimestampMs(run.updatedAt || snap.updatedAt),
      });
    }
  }

  // Sort history newest first
  history.sort((a, b) => b.updatedAtMs - a.updatedAtMs);

  // 3. Flashcard mastery by TA
  const flashcardDeck = input.flashcardDeck || [];
  const flashcardProgress = input.flashcardProgress || {};
  const fcByTa: Record<TopicAreaId, { mastered: number; learning: number; total: number }> = {
    TA1: { mastered: 0, learning: 0, total: 0 },
    TA2: { mastered: 0, learning: 0, total: 0 },
    TA3: { mastered: 0, learning: 0, total: 0 },
    TA4: { mastered: 0, learning: 0, total: 0 },
    TA5: { mastered: 0, learning: 0, total: 0 },
    TA6: { mastered: 0, learning: 0, total: 0 },
  };
  let flashcardsMastered = 0;
  let flashcardsLearning = 0;

  for (const card of flashcardDeck) {
    const ta = card.ta as TopicAreaId;
    const status = flashcardProgress[card.id];
    if (fcByTa[ta]) fcByTa[ta].total++;
    if (status === 'mastered') {
      flashcardsMastered++;
      if (fcByTa[ta]) fcByTa[ta].mastered++;
    } else if (status === 'learning') {
      flashcardsLearning++;
      if (fcByTa[ta]) fcByTa[ta].learning++;
    }
  }

  // 4. 9-Mark Coach drafts
  const coachPrompts = input.coachPrompts || [];
  const coachDrafts = input.coachDrafts || {};
  let coachDraftedCount = 0;
  let coachTotalWords = 0;
  for (const p of coachPrompts) {
    const draft = (coachDrafts[p.id] || '').trim();
    if (draft.length > 0) {
      coachDraftedCount++;
      coachTotalWords += draft.split(/\s+/).length;
    }
  }

  // 5. Build Topic Area stats
  const unsortedTopicStats: TopicAreaStat[] = topics.map((t) => {
    const exam = taExamTotals[t.id] || { earned: 0, max: 0 };
    const examPct = exam.max > 0 ? Math.round((exam.earned / exam.max) * 100) : null;
    const st = getStatusForPct(examPct);
    const fc = fcByTa[t.id] || { mastered: 0, learning: 0, total: 0 };
    const flashcardPct = fc.total > 0 ? Math.round((fc.mastered / fc.total) * 100) : 0;
    return {
      id: t.id,
      code: t.code,
      title: t.title,
      examEarned: exam.earned,
      examMax: exam.max,
      examPct,
      status: st.status,
      statusLabel: st.label,
      flashcardsMastered: fc.mastered,
      flashcardsLearning: fc.learning,
      flashcardsTotal: fc.total,
      flashcardPct,
    };
  });

  // Overall totals from TA exam data (or marked papers if TA breakdown wasn't stored)
  let overallEarned = Object.values(taExamTotals).reduce((s, v) => s + v.earned, 0);
  let overallMax = Object.values(taExamTotals).reduce((s, v) => s + v.max, 0);

  const markedPapers = history.filter((h) => h.status === 'marked');
  const inProgressPapers = history.filter((h) => h.status === 'in_progress');

  if (overallMax === 0 && markedPapers.length > 0) {
    overallEarned = markedPapers.reduce((s, p) => s + p.earned, 0);
    overallMax = markedPapers.reduce((s, p) => s + p.maxMarks, 0);
  }

  const hasExamData = overallMax > 0;
  const overallGrade = hasExamData ? computeGradeFromScore(overallEarned, overallMax) : null;
  const overallPct = overallGrade ? overallGrade.pct : null;
  const averagePaperPct =
    markedPapers.length > 0
      ? Math.round(markedPapers.reduce((s, p) => s + p.pct, 0) / markedPapers.length)
      : null;

  // 6. Identify weakest Topic Areas
  const testedTopics = unsortedTopicStats.filter((t) => t.examPct !== null);
  let weakness: WeaknessRecommendation;

  if (testedTopics.length > 0) {
    const ranked = [...testedTopics].sort((a, b) => {
      const diff = (a.examPct ?? 100) - (b.examPct ?? 100);
      if (diff !== 0) return diff;
      return a.flashcardPct - b.flashcardPct;
    });
    const weakest = ranked[0];
    const second = ranked.length > 1 && (ranked[1].examPct ?? 100) < 75 ? ranked[1] : null;
    const targetTAs: TopicAreaId[] = second ? [weakest.id, second.id] : [weakest.id];

    const gradeHint =
      overallGrade && overallGrade.nextGrade
        ? ` Raising your overall average by ${overallGrade.pctToNext}% moves you up to ${overallGrade.nextGrade}.`
        : ' Keep drilling to maintain Level 2 Distinction* consistency.';

    const headline =
      (weakest.examPct ?? 0) < 75
        ? `Focus on ${weakest.code}: ${weakest.title} (${weakest.examPct}%)`
        : `Strong performance across all tested topics — sharpen ${weakest.code} (${weakest.examPct}%)`;

    const explanation = second
      ? `${weakest.code} (${weakest.examEarned}/${weakest.examMax} marks) and ${second.code} (${second.examPct}%) are your lowest-scoring Topic Areas right now.${gradeHint}`
      : `${weakest.code} is currently your lowest-scoring Topic Area at ${weakest.examEarned}/${weakest.examMax} marks (${weakest.examPct}%).${gradeHint}`;

    weakness = {
      hasExamData: true,
      primaryTA: weakest.id,
      primaryTitle: weakest.title,
      secondaryTA: second ? second.id : null,
      targetTAs,
      headline,
      explanation,
      primaryPct: weakest.examPct,
    };
  } else {
    // Fallback to lowest flashcard mastery if no exam marks recorded yet
    const byFlashcards = [...unsortedTopicStats].sort((a, b) => a.flashcardPct - b.flashcardPct);
    const fallback = byFlashcards[0] || unsortedTopicStats[0];
    weakness = {
      hasExamData: false,
      primaryTA: fallback.id,
      primaryTitle: fallback.title,
      secondaryTA: null,
      targetTAs: [fallback.id],
      headline: 'Complete your first paper or question check to unlock weakness tracking',
      explanation:
        'Your TA1–TA6 mastery breakdown, OCR grade trajectory, and targeted revision drills populate automatically as soon as you check questions or finish any practice or official past paper.',
      primaryPct: null,
    };
  }

  // Sort Topic Area rows for display
  const topicStats = [...unsortedTopicStats];
  if (topicSort === 'weakest') {
    topicStats.sort((a, b) => {
      const aTested = a.examPct !== null;
      const bTested = b.examPct !== null;
      if (aTested && !bTested) return -1;
      if (!aTested && bTested) return 1;
      if (aTested && bTested) {
        const diff = (a.examPct as number) - (b.examPct as number);
        if (diff !== 0) return diff;
      }
      return a.flashcardPct - b.flashcardPct;
    });
  }

  // 7. Score trajectory (chronological oldest -> newest for marked papers)
  const trajectory: ScoreTrajectoryPoint[] = [...markedPapers]
    .sort((a, b) => a.updatedAtMs - b.updatedAtMs)
    .slice(-10)
    .map((item) => ({
      id: item.id,
      label: item.shortTitle.length > 14 ? `${item.shortTitle.slice(0, 13)}…` : item.shortTitle,
      fullTitle: item.title,
      source: item.source,
      pct: item.pct,
      earned: item.earned,
      maxMarks: item.maxMarks,
      grade: item.grade,
      updatedAtMs: item.updatedAtMs,
    }));

  const totalCatalogPapers =
    sourceFilter === 'official'
      ? Math.max(officialCatalog.length, 10)
      : sourceFilter === 'practice'
      ? 3
      : Math.max(officialCatalog.length, 10) + 3;

  const hasAnyActivity =
    history.length > 0 || flashcardsMastered > 0 || flashcardsLearning > 0 || coachDraftedCount > 0;

  return {
    candidateName: (input.candidateName || '').trim() || 'Student',
    candidateClass: (input.candidateClass || '').trim() || 'Unit R050',
    sourceFilter,
    topicSort,
    hasExamData,
    hasAnyActivity,
    overallEarned,
    overallMax,
    overallPct,
    overallGrade,
    papersMarkedCount: markedPapers.length,
    papersInProgressCount: inProgressPapers.length,
    totalCatalogPapers,
    averagePaperPct,
    flashcardsMastered,
    flashcardsLearning,
    flashcardsTotal: flashcardDeck.length,
    coachDraftedCount,
    coachTotalPrompts: coachPrompts.length,
    coachTotalWords,
    topicStats,
    weakness,
    trajectory,
    history,
  };
}

export function buildProgressCsv(report: ProgressDashboardReport): string {
  const esc = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const lines: string[] = [];

  lines.push(['OCR Unit R050 Progress & Weakness Report', report.candidateName, report.candidateClass].map(esc).join(','));
  lines.push(
    [
      'Overall Score',
      report.hasExamData ? `${report.overallEarned}/${report.overallMax}` : 'Not assessed',
      'Overall %',
      report.overallPct !== null ? `${report.overallPct}%` : 'N/A',
      'Estimated OCR Grade',
      report.overallGrade ? report.overallGrade.grade : 'Not assessed',
    ]
      .map(esc)
      .join(',')
  );
  lines.push('');

  lines.push(['Topic Area', 'Title', 'Exam Marks Earned', 'Exam Marks Attempted', 'Exam Accuracy %', 'Status', 'Flashcards Mastered'].map(esc).join(','));
  for (const t of report.topicStats) {
    lines.push(
      [
        t.code,
        t.title,
        t.examEarned,
        t.examMax,
        t.examPct !== null ? `${t.examPct}%` : 'Not tested',
        t.statusLabel,
        `${t.flashcardsMastered}/${t.flashcardsTotal}`,
      ]
        .map(esc)
        .join(',')
    );
  }
  lines.push('');

  lines.push(['Paper', 'Source', 'Status', 'Marks Earned', 'Max Marks', 'Percentage', 'Estimated Grade'].map(esc).join(','));
  for (const h of report.history) {
    lines.push(
      [
        h.title,
        h.sourceLabel,
        h.status === 'marked' ? 'Marked' : 'In Progress',
        h.earned,
        h.maxMarks,
        h.status === 'marked' ? `${h.pct}%` : '—',
        h.grade,
      ]
        .map(esc)
        .join(',')
    );
  }

  return lines.join('\n');
}
