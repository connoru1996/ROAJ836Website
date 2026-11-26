import test from 'node:test';
import assert from 'node:assert/strict';
import {
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
} from '../src/commandDrillsEngine';

test('evaluateFixAnswerDiagnosis detects exact flaws and rejects distractors', () => {
  const encCase = FIX_ANSWER_CASES.find((c) => c.id === 'fix-ta4-encryption')!;
  const passRes = evaluateFixAnswerDiagnosis(encCase, ['f1', 'f2']);
  assert.equal(passRes.passed, true);
  assert.equal(passRes.correctPicked, 2);
  assert.equal(passRes.wrongPicked, 0);

  const distractorRes = evaluateFixAnswerDiagnosis(encCase, ['f1', 'f2', 'f3']);
  assert.equal(distractorRes.passed, false);
  assert.equal(distractorRes.wrongPicked, 1);

  const partialRes = evaluateFixAnswerDiagnosis(encCase, ['f1']);
  assert.equal(partialRes.passed, false);
  assert.equal(partialRes.correctPicked, 1);
});

test('evaluateFixAnswerPatches upgrades weak script to full marks and detects weak patch choices', () => {
  const encCase = FIX_ANSWER_CASES.find((c) => c.id === 'fix-ta4-encryption')!;
  const fullRes = evaluateFixAnswerPatches(encCase, {
    'slot-mech': 'm-a',
    'slot-impact': 'i-a',
  });
  assert.equal(fullRes.passed, true);
  assert.equal(fullRes.projectedMarks, 2);
  assert.match(fullRes.upgradedAnswer, /ciphertext/i);
  assert.match(fullRes.upgradedAnswer, /decryption key/i);

  const weakRes = evaluateFixAnswerPatches(encCase, {
    'slot-mech': 'm-c',
    'slot-impact': 'i-a',
  });
  assert.equal(weakRes.passed, false);
  assert.equal(weakRes.slotsCorrect, 1);
  assert.ok(weakRes.projectedMarks < 2);
});

test('evaluateFreeRewrite scores rubric criteria and warns on banned vague phrases', () => {
  const encCase = FIX_ANSWER_CASES.find((c) => c.id === 'fix-ta4-encryption')!;
  const strong = evaluateFreeRewrite(
    encCase,
    'Encryption scrambles payment data into unreadable ciphertext so if intercepted it cannot be read without the decryption key.'
  );
  assert.equal(strong.criteriaMet, 2);
  assert.equal(strong.estimatedMarks, 2);
  assert.equal(strong.vagueWarnings.length, 0);

  const vague = evaluateFreeRewrite(
    encCase,
    'Encryption scrambles data and makes it safer so hackers cannot decrypt it.'
  );
  assert.equal(vague.vagueWarnings.includes('safer'), true);
  assert.equal(vague.estimatedMarks, 1);
});

test('evaluateCommandWordDrill awards 2 marks for matching command word and mark formula', () => {
  const drill = COMMAND_WORD_DRILLS[0];
  const perfect = evaluateCommandWordDrill(drill, drill.correctCommand, drill.correctFormula);
  assert.equal(perfect.marksEarned, 2);
  assert.equal(perfect.commandCorrect, true);
  assert.equal(perfect.formulaCorrect, true);

  const partial = evaluateCommandWordDrill(drill, drill.correctCommand, drill.formulaOptions[1]);
  assert.equal(partial.marksEarned, 1);
  assert.equal(partial.formulaCorrect, false);
});

test('evaluateExaminerMarking validates exact examiner score and rationale', () => {
  const scriptCase = EXAMINER_MARKING_CASES[0];
  const passRes = evaluateExaminerMarking(scriptCase, scriptCase.correctMarks, scriptCase.correctReason);
  assert.equal(passRes.passed, true);
  assert.equal(passRes.marksDelta, 0);

  const overMarked = evaluateExaminerMarking(scriptCase, 2, scriptCase.correctReason);
  assert.equal(overMarked.passed, false);
  assert.equal(overMarked.marksDelta, 1);
});

test('evaluateVaguePhraseSet and computeCommandDrillsMasterySummary compute totals accurately', () => {
  const set1 = VAGUE_PHRASE_SETS[0];
  const perfectSelections: Record<string, string> = {};
  for (const item of set1.items) {
    perfectSelections[item.id] = item.options.find((o) => o.isExamReady)!.id;
  }
  const setRes = evaluateVaguePhraseSet(set1, perfectSelections);
  assert.equal(setRes.passed, true);
  assert.equal(setRes.correctCount, 4);

  const summary = computeCommandDrillsMasterySummary({
    completedFixCases: { 'fix-ta4-encryption': true, 'fix-ta3-validation': true },
    completedCommandDrills: { 'cmd-1': true },
    completedExaminerCases: { 'exam-1-ta4-2fa': true },
    completedVagueSets: { 'vague-set-1': true },
  });
  assert.equal(summary.totalChallenges, 24);
  assert.equal(summary.completedChallenges, 5);
  assert.equal(summary.masteryPct, 21);
});
