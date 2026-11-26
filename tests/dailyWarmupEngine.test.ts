import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SPEC_CHECKLIST_ITEMS,
  WARMUP_QUESTION_BANK,
  TOPIC_ORDER,
  generateDailyWarmupSet,
  evaluateWarmupAnswer,
  computeSpecChecklistSummary,
  computeStreakSummary,
  filterSpecChecklistItems,
  formatCountdownMmSs,
  buildSpecChecklistCsv,
  type SpecConfidence,
  type WarmupSessionRecord,
} from '../src/dailyWarmupEngine';

test('specification checklist covers all 6 Topic Areas with 30 checkpoints and valid links', () => {
  assert.equal(SPEC_CHECKLIST_ITEMS.length, 30);
  for (const ta of TOPIC_ORDER) {
    const taItems = SPEC_CHECKLIST_ITEMS.filter((i) => i.ta === ta);
    assert.equal(taItems.length, 5, `Expected 5 spec items for ${ta}`);
  }
  const specIds = new Set(SPEC_CHECKLIST_ITEMS.map((i) => i.id));
  assert.equal(specIds.size, 30);

  // Every warm-up question must map to a real spec item
  assert.equal(WARMUP_QUESTION_BANK.length, 36);
  for (const q of WARMUP_QUESTION_BANK) {
    assert.ok(specIds.has(q.specItemId), `Question ${q.id} references unknown specItemId ${q.specItemId}`);
  }
});

test('daily warm-up generator is deterministic per calendar date and covers 5 distinct Topic Areas', () => {
  const runA = generateDailyWarmupSet({ dateKey: '2026-11-26', mode: 'daily' });
  const runB = generateDailyWarmupSet({ dateKey: '2026-11-26', mode: 'daily' });
  const runNextDay = generateDailyWarmupSet({ dateKey: '2026-11-27', mode: 'daily' });

  assert.equal(runA.length, 5);
  assert.deepEqual(
    runA.map((q) => q.id),
    runB.map((q) => q.id)
  );
  assert.equal(new Set(runA.map((q) => q.ta)).size, 5);
  assert.notDeepEqual(
    runA.map((q) => q.id),
    runNextDay.map((q) => q.id)
  );
});

test('weak-spots sprint prioritises Red and Amber spec checkpoints', () => {
  const ratings: Record<string, SpecConfidence> = {
    'ta3-2': 'red',
    'ta4-4': 'red',
    'ta6-1': 'amber',
    'ta1-1': 'green',
    'ta2-3': 'green',
  };
  const weakSet = generateDailyWarmupSet({
    dateKey: '2026-11-26',
    mode: 'weak-spots',
    specRatings: ratings,
  });
  assert.equal(weakSet.length, 5);
  const topIds = weakSet.slice(0, 3).map((q) => q.specItemId);
  assert.ok(topIds.includes('ta3-2'), 'Expected red item ta3-2 in top weak-spot questions');
  assert.ok(topIds.includes('ta4-4'), 'Expected red item ta4-4 in top weak-spot questions');
});

test('answer evaluator scores MCQ, True/False, and Short-Recall deterministically', () => {
  const mcq = WARMUP_QUESTION_BANK.find((q) => q.type === 'mcq')!;
  assert.equal(evaluateWarmupAnswer(mcq, mcq.correctOptionIndex!).isCorrect, true);
  assert.equal(evaluateWarmupAnswer(mcq, (mcq.correctOptionIndex! + 1) % 4).isCorrect, false);

  const tf = WARMUP_QUESTION_BANK.find((q) => q.type === 'true-false')!;
  assert.equal(evaluateWarmupAnswer(tf, tf.correctBoolean!).isCorrect, true);
  assert.equal(evaluateWarmupAnswer(tf, !tf.correctBoolean!).isCorrect, false);

  const recall = WARMUP_QUESTION_BANK.find((q) => q.id === 'wq-ta3-2')!; // Range Check
  assert.equal(evaluateWarmupAnswer(recall, '  Range Check! ').isCorrect, true);
  assert.equal(evaluateWarmupAnswer(recall, 'use a range check').isCorrect, true);
  assert.equal(evaluateWarmupAnswer(recall, 'presence check').isCorrect, false);
  assert.equal(evaluateWarmupAnswer(recall, '').isCorrect, false);
});

test('spec checklist summary and filtering accurately compute RAG counts and priorities', () => {
  const ratings: Record<string, SpecConfidence> = {
    'ta1-1': 'green',
    'ta1-2': 'green',
    'ta3-2': 'red',
    'ta4-4': 'amber',
  };
  const summary = computeSpecChecklistSummary(ratings);
  assert.equal(summary.totalItems, 30);
  assert.equal(summary.greenCount, 2);
  assert.equal(summary.amberCount, 1);
  assert.equal(summary.redCount, 1);
  assert.equal(summary.unratedCount, 26);
  assert.equal(summary.ratedCount, 4);
  assert.equal(summary.topPriorities[0].id, 'ta3-2');
  assert.equal(summary.topPriorities[1].id, 'ta4-4');

  const filtered = filterSpecChecklistItems(SPEC_CHECKLIST_ITEMS, ratings, 'TA3', 'red', 'validation');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'ta3-2');
});

test('streak calculator tracks consecutive days, best streak, 7-day strip, and CSV export', () => {
  const sessions: WarmupSessionRecord[] = [
    { id: 's1', dateKey: '2026-11-20', mode: 'daily', score: 3, total: 5, secondsUsed: 140, completedAt: '2026-11-20T09:00:00Z', missedSpecIds: [] },
    { id: 's2', dateKey: '2026-11-21', mode: 'daily', score: 4, total: 5, secondsUsed: 120, completedAt: '2026-11-21T09:00:00Z', missedSpecIds: [] },
    { id: 's3', dateKey: '2026-11-24', mode: 'daily', score: 5, total: 5, secondsUsed: 110, completedAt: '2026-11-24T09:00:00Z', missedSpecIds: [] },
    { id: 's4', dateKey: '2026-11-25', mode: 'daily', score: 4, total: 5, secondsUsed: 130, completedAt: '2026-11-25T09:00:00Z', missedSpecIds: [] },
    { id: 's5', dateKey: '2026-11-26', mode: 'daily', score: 5, total: 5, secondsUsed: 95, completedAt: '2026-11-26T09:00:00Z', missedSpecIds: [] },
  ];

  const streak = computeStreakSummary(sessions, '2026-11-26');
  assert.equal(streak.currentStreak, 3);
  assert.equal(streak.bestStreak, 3);
  assert.equal(streak.completedToday, true);
  assert.equal(streak.todayBestScore, 5);
  assert.equal(streak.overallAccuracyPct, 84);
  assert.equal(streak.last7Days.length, 7);
  assert.equal(streak.last7Days[6].isToday, true);
  assert.equal(streak.last7Days[6].completed, true);
  assert.equal(formatCountdownMmSs(300), '05:00');
  assert.equal(formatCountdownMmSs(65), '01:05');

  const csv = buildSpecChecklistCsv({ 'ta1-1': 'green' }, streak);
  assert.ok(csv.includes('Flowcharts & ISO 5807 Symbols'));
  assert.ok(csv.includes('Exam Ready (Green)'));
  assert.ok(csv.includes('Daily Warm-Up Streak (Days),3'));
});
