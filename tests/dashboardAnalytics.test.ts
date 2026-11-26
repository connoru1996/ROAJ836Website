import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeGradeFromScore,
  computeProgressDashboardData,
  buildProgressCsv,
  DEFAULT_TOPIC_AREAS,
} from '../src/dashboardAnalytics.ts';

test('computeGradeFromScore maps OCR Level 1/2 grade boundaries and next target accurately', () => {
  const distStar = computeGradeFromScore(72, 80);
  assert.equal(distStar.grade, 'Level 2 Distinction*');
  assert.equal(distStar.pct, 90);
  assert.equal(distStar.nextGrade, null);
  assert.equal(distStar.pointsToNextOutOf80, 0);

  const merit = computeGradeFromScore(52, 80);
  assert.equal(merit.grade, 'Level 2 Merit');
  assert.equal(merit.pct, 65);
  assert.equal(merit.nextGrade, 'Level 2 Distinction');
  assert.equal(merit.pointsToNextOutOf80, 8);

  const unclassified = computeGradeFromScore(5, 70);
  assert.equal(unclassified.grade, 'Unclassified (U)');
  assert.equal(unclassified.pct, 7);
  assert.equal(unclassified.nextGrade, 'Level 1 Pass');
});

test('computeProgressDashboardData handles brand-new empty state cleanly', () => {
  const report = computeProgressDashboardData({
    candidateName: '',
    candidateClass: '',
    flashcardDeck: [
      { id: 'fc1', ta: 'TA1' },
      { id: 'fc2', ta: 'TA4' },
    ],
    flashcardProgress: {},
    coachPrompts: [{ id: 'p1', title: 'Prompt 1', primaryTA: 'TA4' }],
    coachDrafts: {},
  });

  assert.equal(report.hasExamData, false);
  assert.equal(report.hasAnyActivity, false);
  assert.equal(report.overallPct, null);
  assert.equal(report.overallGrade, null);
  assert.equal(report.papersMarkedCount, 0);
  assert.equal(report.topicStats.length, 6);
  assert.equal(report.weakness.hasExamData, false);
  assert.equal(report.trajectory.length, 0);
  assert.equal(report.history.length, 0);
});

test('computeProgressDashboardData aggregates official papers, practice papers, shuffled runs, flashcards, and identifies weakest TA', () => {
  const report = computeProgressDashboardData({
    candidateName: 'Alex Turner',
    candidateClass: '11A/IT1',
    sourceFilter: 'all',
    topicSort: 'weakest',
    topics: DEFAULT_TOPIC_AREAS,
    officialCatalog: [
      { id: 'ocr_jan2026', title: 'January 2026 Exam Paper', series: 'Jan 2026 · R050/01', totalMarks: 70, questionCount: 28 },
    ],
    officialAttempts: {
      ocr_jan2026: {
        submitted: true,
        updatedAt: '2026-10-01T10:00:00.000Z',
        grades: { q1: { marksAwarded: 1, maxMarks: 1 } },
        summary: {
          totalAwarded: 49,
          totalMax: 70,
          taBreakdown: {
            TA1: { earned: 10, max: 12 },
            TA2: { earned: 9, max: 12 },
            TA3: { earned: 12, max: 14 },
            TA4: { earned: 3, max: 12 },
            TA5: { earned: 8, max: 10 },
            TA6: { earned: 7, max: 10 },
          },
        },
      },
    },
    practicePaperDefs: {
      paper1: {
        id: 'paper1',
        title: 'Practice Paper 1',
        shortTitle: 'Paper 1',
        totalMarks: 80,
        sectionA: [{ id: 'q1', ta: 'TA1', marks: 1 }],
        sectionB: [{ id: 'q2', ta: 'TA4', marks: 9 }],
      },
    },
    practiceArchivePapers: {
      paper1: {
        paperId: 'paper1',
        submitted: true,
        totalScore: 56,
        maxMarks: 80,
        updatedAt: Date.parse('2026-10-05T12:00:00.000Z'),
        taScores: {
          TA1: { score: 10, max: 12 },
          TA4: { score: 4, max: 10 },
        },
      },
    },
    shuffledRuns: [
      {
        id: 'shuf_1',
        title: 'Shuffled #1',
        shortTitle: 'Shuffled #1',
        totalMarks: 20,
        submitted: true,
        totalScore: 16,
        updatedAt: Date.parse('2026-10-08T12:00:00.000Z'),
        snapshot: {
          submitted: true,
          totalScore: 16,
          maxMarks: 20,
          taScores: {
            TA5: { score: 16, max: 20 },
          },
        },
      },
    ],
    flashcardDeck: [
      { id: 'c1', ta: 'TA1' },
      { id: 'c2', ta: 'TA4' },
      { id: 'c3', ta: 'TA4' },
    ],
    flashcardProgress: {
      c1: 'mastered',
      c2: 'learning',
    },
    coachPrompts: [
      { id: 'greenleaf', title: 'GreenLeaf', primaryTA: 'TA4' },
      { id: 'swiftfit', title: 'SwiftFit', primaryTA: 'TA6' },
    ],
    coachDrafts: {
      greenleaf: 'Usability and encryption protect customer records under UK GDPR.',
    },
  });

  assert.equal(report.hasExamData, true);
  assert.equal(report.papersMarkedCount, 3);
  assert.equal(report.flashcardsMastered, 1);
  assert.equal(report.flashcardsLearning, 1);
  assert.equal(report.coachDraftedCount, 1);
  assert.equal(report.coachTotalWords, 9);

  // TA4 has 3+4 = 7 / 22 = 32% -> clearly the weakest Topic Area
  assert.equal(report.weakness.primaryTA, 'TA4');
  assert.equal(report.weakness.primaryPct, 32);
  assert.equal(report.topicStats[0].id, 'TA4');
  assert.equal(report.topicStats[0].status, 'priority');

  // Trajectory ordered oldest -> newest (3 marked papers)
  assert.equal(report.trajectory.length, 3);
  assert.equal(report.trajectory[0].source, 'official');
  assert.equal(report.trajectory[1].source, 'practice');
  assert.equal(report.trajectory[2].source, 'shuffled');

  // History ordered newest -> oldest
  assert.equal(report.history[0].source, 'shuffled');
});

test('sourceFilter isolates Official OCR vs Practice & Shuffled data accurately', () => {
  const base = {
    officialCatalog: [{ id: 'ocr_jan2026', title: 'Jan 2026', series: 'Jan 2026', totalMarks: 70 }],
    officialAttempts: {
      ocr_jan2026: {
        submitted: true,
        updatedAt: '2026-10-01T10:00:00.000Z',
        summary: {
          totalAwarded: 63,
          totalMax: 70,
          taBreakdown: { TA1: { earned: 63, max: 70 } },
        },
      },
    },
    practiceArchivePapers: {
      paper1: {
        paperId: 'paper1',
        submitted: true,
        totalScore: 32,
        maxMarks: 80,
        taScores: { TA2: { score: 32, max: 80 } },
      },
    },
  };

  const officialOnly = computeProgressDashboardData({ ...base, sourceFilter: 'official' });
  assert.equal(officialOnly.papersMarkedCount, 1);
  assert.equal(officialOnly.overallPct, 90);
  assert.equal(officialOnly.weakness.primaryTA, 'TA1');

  const practiceOnly = computeProgressDashboardData({ ...base, sourceFilter: 'practice' });
  assert.equal(practiceOnly.papersMarkedCount, 1);
  assert.equal(practiceOnly.overallPct, 40);
  assert.equal(practiceOnly.weakness.primaryTA, 'TA2');
});

test('buildProgressCsv escapes commas and quotes safely', () => {
  const report = computeProgressDashboardData({
    candidateName: 'Turner, "Alex"',
    candidateClass: '11A/IT1',
  });
  const csv = buildProgressCsv(report);
  assert.ok(csv.includes('"Turner, ""Alex"""'));
  assert.ok(csv.includes('"TA1","Design Tools"'));
});

test('empty default liveState does not shadow an archived submitted practice paper', () => {
  const report = computeProgressDashboardData({
    liveState: {
      paperId: 'paper1',
      submitted: false,
      answers: {},
      scores: {},
    },
    practiceArchivePapers: {
      paper1: {
        paperId: 'paper1',
        submitted: true,
        totalScore: 62,
        maxMarks: 80,
        taScores: { TA4: { score: 8, max: 18 } },
      },
    },
  });
  assert.equal(report.papersMarkedCount, 1);
  assert.equal(report.history.length, 1);
  assert.equal(report.history[0].earned, 62);
});

