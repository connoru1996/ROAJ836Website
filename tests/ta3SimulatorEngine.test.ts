import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VALIDATION_SCENARIOS,
  TEST_PLAN_CHALLENGES,
  VERIFICATION_DEMO_FIELDS,
  DATA_RULE_DRILLS,
  evaluateFieldValidation,
  checkValidationMission,
  evaluateTestPlanSubmission,
  evaluateDoubleEntrySimulation,
  evaluateDataRuleDrill,
  computeTa3MasterySummary,
} from '../src/ta3SimulatorEngine';

test('evaluateFieldValidation enforces Presence, Type, Length, Range, Format, and Lookup accurately', () => {
  const sf = VALIDATION_SCENARIOS[0];
  const ageField = sf.fields.find((f) => f.id === 'member-age')!;
  const postcodeField = sf.fields.find((f) => f.id === 'postcode')!;
  const cardField = sf.fields.find((f) => f.id === 'card-number')!;
  const tierField = sf.fields.find((f) => f.id === 'tier')!;

  // Presence
  assert.equal(evaluateFieldValidation(ageField, '').firstFailedCheck, 'presence');
  // Type
  assert.equal(evaluateFieldValidation(ageField, 'twenty').firstFailedCheck, 'type');
  // Range + Boundary
  assert.equal(evaluateFieldValidation(ageField, '120').firstFailedCheck, 'range');
  const upperRes = evaluateFieldValidation(ageField, '85');
  assert.equal(upperRes.accepted, true);
  assert.equal(upperRes.boundaryHit, 'upper');

  // Format
  assert.equal(evaluateFieldValidation(postcodeField, '12345').firstFailedCheck, 'format');
  assert.equal(evaluateFieldValidation(postcodeField, 'SW1 4AA').accepted, true);

  // Length
  assert.equal(evaluateFieldValidation(cardField, '12345678').firstFailedCheck, 'length');
  assert.equal(evaluateFieldValidation(cardField, '4532190844129901').accepted, true);

  // Lookup
  assert.equal(evaluateFieldValidation(tierField, 'VIP Gold').firstFailedCheck, 'lookup');
  assert.equal(evaluateFieldValidation(tierField, 'Peak').accepted, true);
});

test('evaluateFieldValidation detects bypassed bad data when a rule is toggled OFF in Experiment Mode', () => {
  const ageField = VALIDATION_SCENARIOS[0].fields.find((f) => f.id === 'member-age')!;
  const res = evaluateFieldValidation(ageField, '150', { range: false });

  assert.equal(res.accepted, true);
  assert.ok(res.disabledBypassWarning && res.disabledBypassWarning.includes('Range Check is OFF'));
});

test('checkValidationMission matches upper boundary and specific failed checks', () => {
  const sf = VALIDATION_SCENARIOS[0];
  const ageField = sf.fields.find((f) => f.id === 'member-age')!;
  const postcodeField = sf.fields.find((f) => f.id === 'postcode')!;

  const upperMission = sf.missions[0];
  assert.equal(checkValidationMission(upperMission, evaluateFieldValidation(ageField, '85')), true);
  assert.equal(checkValidationMission(upperMission, evaluateFieldValidation(ageField, '40')), false);

  const formatMission = sf.missions[1];
  assert.equal(checkValidationMission(formatMission, evaluateFieldValidation(postcodeField, 'BAD')), true);
  assert.equal(checkValidationMission(formatMission, evaluateFieldValidation(postcodeField, '')), false);
});

test('evaluateTestPlanSubmission grades integer and length test plans dynamically out of 6 marks', () => {
  const ageChallenge = TEST_PLAN_CHALLENGES[0]; // 18-99
  const perfect = evaluateTestPlanSubmission(ageChallenge, {
    normal: { value: '42', expectedOutcome: 'Accept' },
    lowerBoundary: { value: '18', expectedOutcome: 'Accept' },
    upperBoundary: { value: '99', expectedOutcome: 'Accept' },
    outOfRange: { value: '100', expectedOutcome: 'Reject' },
    wrongType: { value: 'eighteen', expectedOutcome: 'Reject' },
  });
  assert.equal(perfect.marksEarned, 6);
  assert.equal(perfect.pct, 100);

  // Catch boundary confusion (putting 18 as normal or 17 as lower boundary)
  const flawed = evaluateTestPlanSubmission(ageChallenge, {
    normal: { value: '18', expectedOutcome: 'Accept' }, // On boundary, not strictly interior normal
    lowerBoundary: { value: '17', expectedOutcome: 'Reject' }, // Out of range, not inclusive lower boundary
    upperBoundary: { value: '99', expectedOutcome: 'Accept' },
    outOfRange: { value: '120', expectedOutcome: 'Reject' },
    wrongType: { value: 'abc', expectedOutcome: 'Reject' },
  });
  assert.equal(flawed.rows[0].passed, false);
  assert.equal(flawed.rows[1].passed, false);
  assert.equal(flawed.marksEarned, 3);

  // Length challenge (4-8 digits)
  const pinChallenge = TEST_PLAN_CHALLENGES[2];
  const pinPerfect = evaluateTestPlanSubmission(pinChallenge, {
    normal: { value: '123456', expectedOutcome: 'Accept' },
    lowerBoundary: { value: '1234', expectedOutcome: 'Accept' },
    upperBoundary: { value: '12345678', expectedOutcome: 'Accept' },
    outOfRange: { value: '123', expectedOutcome: 'Reject' },
    wrongType: { value: 'abcd', expectedOutcome: 'Reject' },
  });
  assert.equal(pinPerfect.marksEarned, 6);
});

test('evaluateDoubleEntrySimulation distinguishes Validation from Double Entry and Visual Proofreading', () => {
  const dob = VERIFICATION_DEMO_FIELDS[0]; // Source: 14/03/2008

  // 1. Broken format -> caught by Validation
  const badFormat = evaluateDoubleEntrySimulation(dob, '99/99/2008', '99/99/2008');
  assert.equal(badFormat.outcomeType, 'caught_by_validation');
  assert.equal(badFormat.validationPassed, false);

  // 2. Sensible typo in Entry 1, correct in Entry 2 -> Validation passed, caught by Double Entry Verification
  const mismatch = evaluateDoubleEntrySimulation(dob, '14/08/2008', '14/03/2008');
  assert.equal(mismatch.outcomeType, 'caught_by_verification');
  assert.equal(mismatch.validationPassed, true);
  assert.equal(mismatch.doubleEntryMatched, false);

  // 3. Same sensible typo typed twice -> needs Visual Proofreading
  const repeatedTypo = evaluateDoubleEntrySimulation(dob, '14/08/2008', '14/08/2008');
  assert.equal(repeatedTypo.outcomeType, 'sensible_typo_both_matched');
  assert.equal(repeatedTypo.validationPassed, true);
  assert.equal(repeatedTypo.doubleEntryMatched, true);
  assert.equal(repeatedTypo.matchesSourceDocument, false);

  // 4. Accurate & verified
  const exact = evaluateDoubleEntrySimulation(dob, '14/03/2008', '14/03/2008');
  assert.equal(exact.outcomeType, 'verified_accurate');
});

test('evaluateDataRuleDrill and computeTa3MasterySummary compute totals accurately', () => {
  const d1 = DATA_RULE_DRILLS[0];
  const res = evaluateDataRuleDrill(d1, d1.correctDataType, d1.correctCheck);
  assert.equal(res.marksEarned, 2);

  const summary = computeTa3MasterySummary({
    completedMissions: { 'm-sf-1': true, 'm-sf-2': true },
    completedTestPlans: { 'tp-age': { bestMarks: 6, maxMarks: 6 } },
    completedVerifications: { 'vd-1': true },
    completedDataRules: { 'dr-1': true, 'dr-2': true },
  });
  assert.equal(summary.missionsDone, 2);
  assert.equal(summary.missionsTotal, 9);
  assert.equal(summary.testPlansDone, 1);
  assert.equal(summary.testPlansTotal, 3);
  assert.equal(summary.verificationsDone, 1);
  assert.equal(summary.verificationsTotal, 6);
  assert.equal(summary.dataRulesDone, 2);
  assert.equal(summary.dataRulesTotal, 8);
  assert.equal(summary.completedChallenges, 6);
  assert.equal(summary.totalChallenges, 26);
  assert.equal(summary.masteryPct, 23);
});
