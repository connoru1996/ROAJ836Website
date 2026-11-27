import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyRetryOutcome,
  collectMistakes,
  createEmptyMistakeBankStorage,
  evaluateMistakeRetry,
  filterMistakes,
  reopenMistake,
  type ExamPaperSnapshotInput,
} from '../src/mistakeBankEngine';

const SAMPLE_PAPER: ExamPaperSnapshotInput = {
  paperId: 'paper1',
  paperTitle: 'OCR R050 Practice Paper 1',
  shortTitle: 'Paper 1',
  updatedAt: 1000,
  submitted: false,
  checked: { q1: true, q2: true, q21: true },
  flags: { q2: true, q3: true },
  scores: { q1: 1, q2: 0, q21: 1 },
  sectionA: [
    {
      id: 'q1',
      ta: 'TA1',
      taName: 'Design Tools',
      marks: 1,
      type: 'mcq',
      question: 'Which tool maps screen navigation?',
      options: ['A) Mood Board', 'B) Wireframe', 'C) Mind Map', 'D) Gantt'],
      correct: 'B',
      explanation: 'Wireframes map screen layout and navigation.',
    },
    {
      id: 'q2',
      ta: 'TA3',
      taName: 'Data & Testing',
      marks: 1,
      type: 'text',
      question: 'Name the check that verifies data is not blank.',
      accepted: ['presence check', 'presence'],
      explanation: 'Presence checks stop required fields from being empty.',
    },
    {
      id: 'q3',
      ta: 'TA4',
      taName: 'Cyber-Security',
      marks: 1,
      type: 'mcq',
      question: 'Which law covers unauthorised access?',
      options: ['A) DPA', 'B) CMA 1990', 'C) CDPA', 'D) FOIA'],
      correct: 'B',
      explanation: 'Computer Misuse Act 1990 covers hacking.',
    },
  ],
  sectionB: [
    {
      id: 'scen-1',
      isScenarioHeader: true,
      title: 'SCENARIO 1: GreenLeaf Garden Centre',
      description: 'Online click-and-collect portal.',
    },
    {
      id: 'q21',
      ta: 'TA1',
      taName: 'Design Tools',
      marks: 2,
      type: 'multiselect',
      question: 'Select TWO pre-coding design tools.',
      options: [
        { id: 'a', text: 'Wireframe', correct: true },
        { id: 'b', text: 'Flowchart', correct: true },
        { id: 'c', text: 'Server rack', correct: false },
      ],
      explanation: 'Wireframes and flowcharts are planning tools.',
    },
  ],
};

test('collectMistakes gathers wrong, partial, flagged exam questions and missed warm-up items', () => {
  const result = collectMistakes({
    papers: [SAMPLE_PAPER],
    warmupStorage: {
      specRatings: {},
      bonusCounter: 0,
      sessions: [
        {
          id: 's1',
          dateKey: '2026-11-26',
          mode: 'daily',
          score: 4,
          total: 5,
          secondsUsed: 120,
          completedAt: '2026-11-26T10:00:00.000Z',
          missedSpecIds: ['ta1-1'],
        },
      ],
    },
  });

  // q1 got full marks (1/1) & not flagged -> NOT included
  assert.equal(result.items.some((i) => i.id === 'exam:paper1:q1'), false);
  // q2 got 0/1 -> included as wrong + flagged
  const q2 = result.items.find((i) => i.id === 'exam:paper1:q2');
  assert.ok(q2);
  assert.equal(q2.reason, 'wrong');
  assert.equal(q2.isFlagged, true);
  // q3 is flagged (unchecked) -> included as flagged
  const q3 = result.items.find((i) => i.id === 'exam:paper1:q3');
  assert.ok(q3);
  assert.equal(q3.reason, 'flagged');
  // q21 got 1/2 -> included as partial with Section B scenario preserved
  const q21 = result.items.find((i) => i.id === 'exam:paper1:q21');
  assert.ok(q21);
  assert.equal(q21.reason, 'partial');
  assert.equal(q21.scenarioTitle, 'SCENARIO 1: GreenLeaf Garden Centre');
  // Warmup missedSpecIds -> included as missed-warmup
  const wu = result.items.find((i) => i.source === 'warmup');
  assert.ok(wu);
  assert.equal(wu.reason, 'missed-warmup');

  assert.equal(result.summary.totalCount, 4);
  assert.equal(result.summary.toFixCount, 4);
  assert.equal(result.summary.flaggedCount, 2);
});

test('applyRetryOutcome clears mistakes and auto-reopens if missed again later', () => {
  const initialStorage = createEmptyMistakeBankStorage();
  const clearedStorage = applyRetryOutcome(initialStorage, 'exam:paper1:q2', true, 2000);

  const afterClear = collectMistakes({ papers: [SAMPLE_PAPER] }, clearedStorage);
  const q2AfterClear = afterClear.items.find((i) => i.id === 'exam:paper1:q2');
  assert.ok(q2AfterClear);
  assert.equal(q2AfterClear.cleared, true);
  assert.equal(q2AfterClear.retryAttempts, 1);
  assert.equal(afterClear.summary.clearedCount, 1);

  // If the paper is updated/missed again AFTER clearedAt (3000 > 2000), it reopens automatically
  const newerPaper: ExamPaperSnapshotInput = { ...SAMPLE_PAPER, updatedAt: 3000 };
  const afterNewMiss = collectMistakes({ papers: [newerPaper] }, clearedStorage);
  const q2Reopened = afterNewMiss.items.find((i) => i.id === 'exam:paper1:q2');
  assert.ok(q2Reopened);
  assert.equal(q2Reopened.cleared, false);

  // Manual reopen works cleanly too
  const reopenedStorage = reopenMistake(clearedStorage, 'exam:paper1:q2');
  const afterManualReopen = collectMistakes({ papers: [SAMPLE_PAPER] }, reopenedStorage);
  assert.equal(afterManualReopen.items.find((i) => i.id === 'exam:paper1:q2')?.cleared, false);
});

test('evaluateMistakeRetry grades mcq, text, multiselect, cloze, matrix, sequence, and extended accurately', () => {
  const collected = collectMistakes({ papers: [SAMPLE_PAPER] });
  const q2 = collected.items.find((i) => i.id === 'exam:paper1:q2')!;
  const q3 = collected.items.find((i) => i.id === 'exam:paper1:q3')!;
  const q21 = collected.items.find((i) => i.id === 'exam:paper1:q21')!;

  assert.equal(evaluateMistakeRetry(q2, 'presence check').isFullMarks, true);
  assert.equal(evaluateMistakeRetry(q2, 'length check').isFullMarks, false);

  assert.equal(evaluateMistakeRetry(q3, 'B').isFullMarks, true);
  assert.equal(evaluateMistakeRetry(q3, 'A').isFullMarks, false);

  assert.equal(evaluateMistakeRetry(q21, ['a', 'b']).isFullMarks, true);
  const partialMulti = evaluateMistakeRetry(q21, ['a', 'c']);
  assert.equal(partialMulti.isFullMarks, false);
  assert.equal(partialMulti.score, 0);

  // Cloze, matrix, sequence checks
  const richPaper: ExamPaperSnapshotInput = {
    paperId: 'p-rich',
    paperTitle: 'Rich Paper',
    updatedAt: 1000,
    submitted: true,
    scores: { c1: 0, m1: 0, s1: 0 },
    sectionA: [],
    sectionB: [
      {
        id: 'c1',
        ta: 'TA2',
        marks: 2,
        type: 'cloze',
        question: 'Fill blanks',
        text: 'High {1} and {2} text',
        dropdowns: { '1': ['contrast', 'low'], '2': ['alt', 'none'] },
        answers: { '1': 'contrast', '2': 'alt' },
      },
      {
        id: 'm1',
        ta: 'TA3',
        marks: 2,
        type: 'matrix',
        question: 'Match checks',
        rows: [
          { id: 'r1', label: 'Not empty' },
          { id: 'r2', label: '1 to 50' },
        ],
        cols: ['Presence', 'Range'],
        correctMap: { r1: 'Presence', r2: 'Range' },
      },
      {
        id: 's1',
        ta: 'TA1',
        marks: 2,
        type: 'sequence',
        question: 'Order steps',
        items: [
          { id: 'a', label: 'Start' },
          { id: 'b', label: 'End' },
        ],
        correctOrder: ['a', 'b'],
      },
    ],
  };

  const richItems = collectMistakes({ papers: [richPaper] }).items;
  assert.equal(
    evaluateMistakeRetry(richItems.find((i) => i.id === 'exam:p-rich:c1')!, { '1': 'contrast', '2': 'alt' })
      .isFullMarks,
    true
  );
  assert.equal(
    evaluateMistakeRetry(richItems.find((i) => i.id === 'exam:p-rich:m1')!, { r1: 'Presence', r2: 'Range' })
      .isFullMarks,
    true
  );
  assert.equal(
    evaluateMistakeRetry(richItems.find((i) => i.id === 'exam:p-rich:s1')!, ['a', 'b']).isFullMarks,
    true
  );
});

test('filterMistakes filters cleanly by status, topic, and source', () => {
  const storage = applyRetryOutcome(createEmptyMistakeBankStorage(), 'exam:paper1:q2', true, 2000);
  const { items } = collectMistakes(
    {
      papers: [SAMPLE_PAPER],
      warmupStorage: {
        specRatings: {},
        bonusCounter: 0,
        sessions: [
          {
            id: 's1',
            dateKey: '2026-11-26',
            mode: 'daily',
            score: 4,
            total: 5,
            secondsUsed: 100,
            completedAt: '2026-11-26T10:00:00.000Z',
            missedSpecIds: ['ta1-1'],
          },
        ],
      },
    },
    storage
  );

  assert.equal(filterMistakes(items, { status: 'to-fix' }).length, 3);
  assert.equal(filterMistakes(items, { status: 'cleared' }).length, 1);
  assert.equal(filterMistakes(items, { status: 'flagged' }).length, 2);
  assert.equal(filterMistakes(items, { status: 'all', topic: 'TA1' }).length, 2);
  assert.equal(filterMistakes(items, { status: 'all', source: 'warmup' }).length, 1);
});
