import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAchievements,
  detectNewlyUnlockedBadges,
  filterAchievements,
  getStudentRankTitle,
  type AchievementComputationInput,
} from '../src/achievementsEngine';

function makeEmptyInput(): AchievementComputationInput {
  return {
    currentStreak: 0,
    bestStreak: 0,
    totalWarmupSessions: 0,
    specGreenCount: 0,
    specTotalCount: 30,
    papersMarkedCount: 0,
    hasExamData: false,
    overallPct: null,
    flashcardsMastered: 0,
    flashcardsTotal: 36,
    coachDraftedCount: 0,
    topics: {
      TA1: { id: 'TA1', examPct: null, flashcardsMastered: 0, flashcardsTotal: 6, labPct: 0 },
      TA2: { id: 'TA2', examPct: null, flashcardsMastered: 0, flashcardsTotal: 6, labPct: null },
      TA3: { id: 'TA3', examPct: null, flashcardsMastered: 0, flashcardsTotal: 6, labPct: 0 },
      TA4: { id: 'TA4', examPct: null, flashcardsMastered: 0, flashcardsTotal: 6, labPct: 0 },
      TA5: { id: 'TA5', examPct: null, flashcardsMastered: 0, flashcardsTotal: 6, labPct: 0 },
      TA6: { id: 'TA6', examPct: null, flashcardsMastered: 0, flashcardsTotal: 6, labPct: 0 },
    },
  };
}

test('fresh student starts with 0/15 badges unlocked and Getting Started rank', () => {
  const summary = computeAchievements(makeEmptyInput());
  assert.equal(summary.totalCount, 15);
  assert.equal(summary.unlockedCount, 0);
  assert.equal(summary.completionPct, 0);
  assert.equal(summary.rankTitle, 'Getting Started');
  assert.ok(summary.nextClosest);
  assert.equal(summary.nextClosest.id, 'streak_1');
});

test('streak badges unlock at 1, 5, and 10 days with accurate partial progress', () => {
  const day3 = computeAchievements({
    ...makeEmptyInput(),
    currentStreak: 3,
    bestStreak: 3,
    totalWarmupSessions: 3,
  });
  const s1 = day3.badges.find((b) => b.id === 'streak_1');
  const s5 = day3.badges.find((b) => b.id === 'streak_5');
  const s10 = day3.badges.find((b) => b.id === 'streak_10');
  assert.equal(s1?.unlocked, true);
  assert.equal(s5?.unlocked, false);
  assert.equal(s5?.progressPct, 60);
  assert.equal(s10?.unlocked, false);
  assert.equal(s10?.progressPct, 30);

  const day5 = computeAchievements({
    ...makeEmptyInput(),
    currentStreak: 5,
    bestStreak: 5,
    totalWarmupSessions: 5,
  });
  assert.equal(day5.badges.find((b) => b.id === 'streak_5')?.unlocked, true);
  assert.equal(day5.badges.find((b) => b.id === 'streak_10')?.unlocked, false);

  const day10 = computeAchievements({
    ...makeEmptyInput(),
    currentStreak: 2,
    bestStreak: 10,
    totalWarmupSessions: 12,
  });
  assert.equal(day10.badges.find((b) => b.id === 'streak_10')?.unlocked, true);
});

test('TA Pro badges unlock via exam accuracy (75%+), all flashcards, or lab mastery (50%+)', () => {
  const input = makeEmptyInput();
  input.topics.TA1 = { id: 'TA1', examPct: 82, flashcardsMastered: 1, flashcardsTotal: 6, labPct: 10 };
  input.topics.TA2 = { id: 'TA2', examPct: null, flashcardsMastered: 6, flashcardsTotal: 6, labPct: null };
  input.topics.TA3 = { id: 'TA3', examPct: 40, flashcardsMastered: 2, flashcardsTotal: 6, labPct: 55 };
  input.topics.TA4 = { id: 'TA4', examPct: 50, flashcardsMastered: 3, flashcardsTotal: 6, labPct: 20 };

  const summary = computeAchievements(input);
  assert.equal(summary.badges.find((b) => b.id === 'ta1_pro')?.unlocked, true);
  assert.equal(summary.badges.find((b) => b.id === 'ta2_pro')?.unlocked, true);
  assert.equal(summary.badges.find((b) => b.id === 'ta3_pro')?.unlocked, true);

  const ta4 = summary.badges.find((b) => b.id === 'ta4_pro');
  assert.equal(ta4?.unlocked, false);
  assert.equal(ta4?.progressPct, 67); // 50/75 = 66.67% -> 67%
});

test('milestone badges, rank progression, filtering, and newly-unlocked detection work cleanly', () => {
  const summary = computeAchievements({
    ...makeEmptyInput(),
    bestStreak: 6,
    totalWarmupSessions: 6,
    papersMarkedCount: 3,
    hasExamData: true,
    overallPct: 78,
    flashcardsMastered: 20,
    coachDraftedCount: 2,
    specGreenCount: 16,
  });

  // 2 streak badges (1 & 5) + all 6 milestone badges = 8 unlocked
  assert.equal(summary.unlockedCount, 8);
  assert.equal(summary.rankTitle, 'Rising Reviser');
  assert.equal(getStudentRankTitle(14), 'Unit R050 Master');

  assert.equal(filterAchievements(summary.badges, 'streak').length, 3);
  assert.equal(filterAchievements(summary.badges, 'mastery').length, 6);
  assert.equal(filterAchievements(summary.badges, 'milestone').length, 6);
  assert.equal(filterAchievements(summary.badges, 'unlocked').length, 8);

  const newly = detectNewlyUnlockedBadges(summary.badges, ['streak_1', 'paper_1']);
  assert.equal(newly.length, 6);
  assert.ok(newly.some((b) => b.id === 'streak_5'));
  assert.ok(!newly.some((b) => b.id === 'streak_1'));
});
