import type { TopicAreaId } from './dashboardAnalytics';

export type AchievementCategory = 'streak' | 'mastery' | 'milestone';
export type AchievementFilter = 'all' | AchievementCategory | 'unlocked';

export interface TopicMasteryInput {
  id: TopicAreaId;
  examPct: number | null;
  flashcardsMastered: number;
  flashcardsTotal: number;
  labPct?: number | null;
}

export interface AchievementComputationInput {
  currentStreak: number;
  bestStreak: number;
  totalWarmupSessions: number;
  specGreenCount: number;
  specTotalCount: number;
  papersMarkedCount: number;
  hasExamData: boolean;
  overallPct: number | null;
  flashcardsMastered: number;
  flashcardsTotal: number;
  coachDraftedCount: number;
  topics: Partial<Record<TopicAreaId, TopicMasteryInput>>;
}

export interface AchievementBadge {
  id: string;
  title: string;
  category: AchievementCategory;
  categoryLabel: string;
  icon: string;
  accent: 'emerald' | 'amber' | 'indigo' | 'sky' | 'rose' | 'teal';
  description: string;
  unlocked: boolean;
  progressCurrent: number;
  progressTarget: number;
  progressPct: number;
  progressLabel: string;
  unlockedReason: string;
  actionLabel: string;
  actionHandler: string;
}

export interface AchievementSummary {
  badges: AchievementBadge[];
  unlockedCount: number;
  totalCount: number;
  completionPct: number;
  rankTitle: string;
  nextClosest: AchievementBadge | null;
  countsByCategory: Record<AchievementCategory, { unlocked: number; total: number }>;
}

const TOPIC_META: Array<{
  id: TopicAreaId;
  name: string;
  icon: string;
  accent: AchievementBadge['accent'];
  hasLab: boolean;
  labHint?: string;
  actionLabel: string;
  actionHandler: string;
}> = [
  {
    id: 'TA1',
    name: 'Design Tools',
    icon: 'fa-diagram-project',
    accent: 'teal',
    hasLab: true,
    labHint: 'or 50%+ in Diagram Lab',
    actionLabel: 'Practise TA1',
    actionHandler: "openTa1DiagramTrainer('flowchart')",
  },
  {
    id: 'TA2',
    name: 'User Interfaces',
    icon: 'fa-display',
    accent: 'indigo',
    hasLab: false,
    actionLabel: 'Practise TA2',
    actionHandler: "openFlashcardsWorkspace('TA2', 'flashcards')",
  },
  {
    id: 'TA3',
    name: 'Data & Testing',
    icon: 'fa-shield-halved',
    accent: 'emerald',
    hasLab: true,
    labHint: 'or 50%+ in Validation Lab',
    actionLabel: 'Practise TA3',
    actionHandler: "openTa3ValidationSimulator('sandbox')",
  },
  {
    id: 'TA4',
    name: 'Cyber Security & Law',
    icon: 'fa-user-shield',
    accent: 'sky',
    hasLab: true,
    labHint: 'or 50%+ in Security Lab',
    actionLabel: 'Practise TA4',
    actionHandler: "openTa4SecurityLab('inspector')",
  },
  {
    id: 'TA5',
    name: 'Digital Comms',
    icon: 'fa-tower-broadcast',
    accent: 'amber',
    hasLab: true,
    labHint: 'or 50%+ in Networks Lab',
    actionLabel: 'Practise TA5',
    actionHandler: "openTa56SystemBuilder('connectivity')",
  },
  {
    id: 'TA6',
    name: 'Smart Tech (IoE)',
    icon: 'fa-microchip',
    accent: 'rose',
    hasLab: true,
    labHint: 'or 50%+ in IoE Builder',
    actionLabel: 'Practise TA6',
    actionHandler: "openTa56SystemBuilder('ioe')",
  },
];

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getStudentRankTitle(unlockedCount: number): string {
  if (unlockedCount >= 14) return 'Unit R050 Master';
  if (unlockedCount >= 10) return 'Exam Contender';
  if (unlockedCount >= 6) return 'Rising Reviser';
  if (unlockedCount >= 3) return 'Steady Starter';
  return 'Getting Started';
}

export function computeAchievements(input: AchievementComputationInput): AchievementSummary {
  const effectiveStreak = Math.max(0, Number(input.bestStreak) || 0, Number(input.currentStreak) || 0);
  const warmupsDone = Math.max(0, Number(input.totalWarmupSessions) || 0);
  const specGreen = Math.max(0, Number(input.specGreenCount) || 0);
  const papersMarked = Math.max(0, Number(input.papersMarkedCount) || 0);
  const flashcardsMastered = Math.max(0, Number(input.flashcardsMastered) || 0);
  const coachDrafts = Math.max(0, Number(input.coachDraftedCount) || 0);
  const overallPct = input.hasExamData && typeof input.overallPct === 'number' ? input.overallPct : 0;

  const badges: AchievementBadge[] = [];

  // 1. Streak Badges (3)
  const firstWarmupDone = effectiveStreak >= 1 || warmupsDone >= 1;
  badges.push({
    id: 'streak_1',
    title: 'First Warm-Up',
    category: 'streak',
    categoryLabel: 'Streak',
    icon: 'fa-fire-flame-simple',
    accent: 'emerald',
    description: 'Complete your first 5-Minute Daily Warm-Up.',
    unlocked: firstWarmupDone,
    progressCurrent: firstWarmupDone ? 1 : 0,
    progressTarget: 1,
    progressPct: firstWarmupDone ? 100 : 0,
    progressLabel: firstWarmupDone ? 'Completed' : '0 / 1 warm-up',
    unlockedReason: 'Completed your first daily warm-up',
    actionLabel: 'Start Warm-Up',
    actionHandler: "openDailyWarmupWorkspace('warmup')",
  });

  const streak5Unlocked = effectiveStreak >= 5;
  badges.push({
    id: 'streak_5',
    title: '5-Day Streak',
    category: 'streak',
    categoryLabel: 'Streak',
    icon: 'fa-fire',
    accent: 'amber',
    description: 'Revise 5 days in a row with the Daily Warm-Up.',
    unlocked: streak5Unlocked,
    progressCurrent: Math.min(5, effectiveStreak),
    progressTarget: 5,
    progressPct: clampPct((effectiveStreak / 5) * 100),
    progressLabel: `${Math.min(5, effectiveStreak)} / 5 days`,
    unlockedReason: `Reached a ${effectiveStreak}-day revision streak`,
    actionLabel: 'Daily Warm-Up',
    actionHandler: "openDailyWarmupWorkspace('warmup')",
  });

  const streak10Unlocked = effectiveStreak >= 10;
  badges.push({
    id: 'streak_10',
    title: '10-Day Unstoppable',
    category: 'streak',
    categoryLabel: 'Streak',
    icon: 'fa-bolt',
    accent: 'rose',
    description: 'Keep your daily revision streak alive for 10 days.',
    unlocked: streak10Unlocked,
    progressCurrent: Math.min(10, effectiveStreak),
    progressTarget: 10,
    progressPct: clampPct((effectiveStreak / 10) * 100),
    progressLabel: `${Math.min(10, effectiveStreak)} / 10 days`,
    unlockedReason: `Reached a ${effectiveStreak}-day streak`,
    actionLabel: 'Daily Warm-Up',
    actionHandler: "openDailyWarmupWorkspace('warmup')",
  });

  // 2. Topic Mastery Badges: TA1 Pro - TA6 Pro (6)
  for (const meta of TOPIC_META) {
    const stat = input.topics?.[meta.id];
    const examPct = stat && typeof stat.examPct === 'number' ? stat.examPct : null;
    const fcDone = stat ? Math.max(0, Number(stat.flashcardsMastered) || 0) : 0;
    const fcTotal = stat && stat.flashcardsTotal > 0 ? stat.flashcardsTotal : 6;
    const labPct = stat && typeof stat.labPct === 'number' ? stat.labPct : null;

    const examRatio = examPct !== null ? Math.min(1, examPct / 75) : 0;
    const fcRatio = fcTotal > 0 ? Math.min(1, fcDone / fcTotal) : 0;
    const labRatio = meta.hasLab && labPct !== null ? Math.min(1, labPct / 50) : 0;

    const unlockedByExam = examPct !== null && examPct >= 75;
    const unlockedByFc = fcTotal > 0 && fcDone >= fcTotal;
    const unlockedByLab = meta.hasLab && labPct !== null && labPct >= 50;
    const unlocked = unlockedByExam || unlockedByFc || unlockedByLab;

    const bestRatio = Math.max(examRatio, fcRatio, labRatio);
    const progressPct = unlocked ? 100 : clampPct(bestRatio * 100);

    let progressLabel = `${fcDone} / ${fcTotal} cards`;
    let progressCurrent = fcDone;
    let progressTarget = fcTotal;
    if (examPct !== null && examRatio >= fcRatio && examRatio >= labRatio) {
      progressLabel = `${examPct}% / 75% exam`;
      progressCurrent = examPct;
      progressTarget = 75;
    } else if (meta.hasLab && labPct !== null && labRatio >= fcRatio && labRatio > 0) {
      progressLabel = `${labPct}% / 50% lab`;
      progressCurrent = labPct;
      progressTarget = 50;
    }

    let unlockedReason = `Mastered ${meta.id} (${meta.name})`;
    if (unlockedByExam) {
      unlockedReason = `Scored ${examPct}% in ${meta.id} exam questions`;
    } else if (unlockedByFc) {
      unlockedReason = `Learned all ${fcTotal} ${meta.id} flashcards`;
    } else if (unlockedByLab) {
      unlockedReason = `Completed ${labPct}% of the ${meta.id} lab`;
    }

    const goalText = meta.hasLab
      ? `Score 75%+ in ${meta.id}, learn all ${fcTotal} cards, ${meta.labHint}.`
      : `Score 75%+ in ${meta.id} exam questions or learn all ${fcTotal} ${meta.id} cards.`;

    badges.push({
      id: `${meta.id.toLowerCase()}_pro`,
      title: `${meta.id} Pro`,
      category: 'mastery',
      categoryLabel: meta.name,
      icon: meta.icon,
      accent: meta.accent,
      description: goalText,
      unlocked,
      progressCurrent,
      progressTarget,
      progressPct,
      progressLabel: unlocked ? 'Mastered' : progressLabel,
      unlockedReason,
      actionLabel: meta.actionLabel,
      actionHandler: meta.actionHandler,
    });
  }

  // 3. Revision Milestones (6)
  badges.push({
    id: 'paper_1',
    title: 'First Paper Done',
    category: 'milestone',
    categoryLabel: 'Milestone',
    icon: 'fa-file-circle-check',
    accent: 'indigo',
    description: 'Complete and mark your first practice or OCR past paper.',
    unlocked: papersMarked >= 1,
    progressCurrent: Math.min(1, papersMarked),
    progressTarget: 1,
    progressPct: papersMarked >= 1 ? 100 : 0,
    progressLabel: `${Math.min(1, papersMarked)} / 1 paper`,
    unlockedReason: 'Completed and marked your first exam paper',
    actionLabel: 'Past Papers',
    actionHandler: 'openOfficialPapersWorkspace()',
  });

  badges.push({
    id: 'paper_3',
    title: 'Past Paper Veteran',
    category: 'milestone',
    categoryLabel: 'Milestone',
    icon: 'fa-medal',
    accent: 'amber',
    description: 'Complete and mark 3 full Unit R050 exam papers.',
    unlocked: papersMarked >= 3,
    progressCurrent: Math.min(3, papersMarked),
    progressTarget: 3,
    progressPct: clampPct((papersMarked / 3) * 100),
    progressLabel: `${Math.min(3, papersMarked)} / 3 papers`,
    unlockedReason: `Completed ${papersMarked} marked exam papers`,
    actionLabel: 'Past Papers',
    actionHandler: 'openOfficialPapersWorkspace()',
  });

  const fcAceTarget = Math.min(18, Math.max(1, input.flashcardsTotal || 36));
  badges.push({
    id: 'flashcards_18',
    title: 'Flashcard Ace',
    category: 'milestone',
    categoryLabel: 'Milestone',
    icon: 'fa-layer-group',
    accent: 'emerald',
    description: `Learn at least ${fcAceTarget} key-term flashcards across TA1–TA6.`,
    unlocked: flashcardsMastered >= fcAceTarget,
    progressCurrent: Math.min(fcAceTarget, flashcardsMastered),
    progressTarget: fcAceTarget,
    progressPct: clampPct((flashcardsMastered / fcAceTarget) * 100),
    progressLabel: `${Math.min(fcAceTarget, flashcardsMastered)} / ${fcAceTarget} cards`,
    unlockedReason: `Mastered ${flashcardsMastered} key-term flashcards`,
    actionLabel: 'Flashcards',
    actionHandler: "openFlashcardsWorkspace('ALL', 'flashcards')",
  });

  badges.push({
    id: 'coach_1',
    title: '9-Mark Writer',
    category: 'milestone',
    categoryLabel: 'Milestone',
    icon: 'fa-pen-nib',
    accent: 'sky',
    description: 'Write your first extended answer in the 9-Mark Essay Coach.',
    unlocked: coachDrafts >= 1,
    progressCurrent: Math.min(1, coachDrafts),
    progressTarget: 1,
    progressPct: coachDrafts >= 1 ? 100 : 0,
    progressLabel: `${Math.min(1, coachDrafts)} / 1 essay`,
    unlockedReason: `Drafted ${coachDrafts} extended 9-mark answer${coachDrafts === 1 ? '' : 's'}`,
    actionLabel: '9-Mark Coach',
    actionHandler: 'openNineMarkCoach()',
  });

  const specTarget = Math.min(15, Math.max(1, input.specTotalCount || 30));
  badges.push({
    id: 'spec_15',
    title: 'Halfway Ready',
    category: 'milestone',
    categoryLabel: 'Milestone',
    icon: 'fa-list-check',
    accent: 'teal',
    description: `Mark ${specTarget} specification checkpoints as Exam Ready (Green).`,
    unlocked: specGreen >= specTarget,
    progressCurrent: Math.min(specTarget, specGreen),
    progressTarget: specTarget,
    progressPct: clampPct((specGreen / specTarget) * 100),
    progressLabel: `${Math.min(specTarget, specGreen)} / ${specTarget} topics`,
    unlockedReason: `Marked ${specGreen} specification topics as Exam Ready`,
    actionLabel: 'Checklist',
    actionHandler: "openDailyWarmupWorkspace('checklist')",
  });

  const distUnlocked = input.hasExamData && overallPct >= 75;
  badges.push({
    id: 'grade_distinction',
    title: 'Distinction Target',
    category: 'milestone',
    categoryLabel: 'Milestone',
    icon: 'fa-trophy',
    accent: 'amber',
    description: 'Reach 75%+ overall (Level 2 Distinction) on marked exam papers.',
    unlocked: distUnlocked,
    progressCurrent: Math.min(75, overallPct),
    progressTarget: 75,
    progressPct: clampPct((overallPct / 75) * 100),
    progressLabel: input.hasExamData ? `${overallPct}% / 75%` : 'No papers marked',
    unlockedReason: `Achieved ${overallPct}% overall across marked papers`,
    actionLabel: 'Sit a Paper',
    actionHandler: 'openOfficialPapersWorkspace()',
  });

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const totalCount = badges.length;
  const completionPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const countsByCategory: Record<AchievementCategory, { unlocked: number; total: number }> = {
    streak: { unlocked: 0, total: 0 },
    mastery: { unlocked: 0, total: 0 },
    milestone: { unlocked: 0, total: 0 },
  };
  for (const b of badges) {
    countsByCategory[b.category].total += 1;
    if (b.unlocked) countsByCategory[b.category].unlocked += 1;
  }

  // Pick the closest locked badge (highest progressPct; ties broken by order so First Warm-Up comes first when fresh)
  const lockedBadges = badges.filter((b) => !b.unlocked);
  let nextClosest: AchievementBadge | null = null;
  if (lockedBadges.length > 0) {
    nextClosest = [...lockedBadges].sort((a, b) => b.progressPct - a.progressPct)[0];
  }

  return {
    badges,
    unlockedCount,
    totalCount,
    completionPct,
    rankTitle: getStudentRankTitle(unlockedCount),
    nextClosest,
    countsByCategory,
  };
}

export function filterAchievements(
  badges: AchievementBadge[],
  filter: AchievementFilter
): AchievementBadge[] {
  if (filter === 'all') return badges;
  if (filter === 'unlocked') return badges.filter((b) => b.unlocked);
  return badges.filter((b) => b.category === filter);
}

export function detectNewlyUnlockedBadges(
  badges: AchievementBadge[],
  seenIds: Iterable<string>
): AchievementBadge[] {
  const seen = new Set(seenIds);
  return badges.filter((b) => b.unlocked && !seen.has(b.id));
}
