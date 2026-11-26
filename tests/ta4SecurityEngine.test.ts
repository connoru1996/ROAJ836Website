import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THREAT_INSPECTOR_CASES,
  LAYERED_DEFENCE_SCENARIOS,
  LEGISLATION_CASES,
  INCIDENT_CHALLENGES,
  UK_LAW_GUIDES,
  evaluateThreatInspectorCase,
  evaluateLayeredDefence,
  evaluateLegislationCase,
  evaluateIncidentChallenge,
  computeTa4MasterySummary,
} from '../src/ta4SecurityEngine';

test('TA4 Security Lab contains 24 structured challenges across all 4 modes', () => {
  assert.equal(THREAT_INSPECTOR_CASES.length, 6);
  assert.equal(LAYERED_DEFENCE_SCENARIOS.length, 6);
  assert.equal(LEGISLATION_CASES.length, 6);
  assert.equal(INCIDENT_CHALLENGES.length, 6);
  assert.equal(UK_LAW_GUIDES.length, 4);

  const empty = computeTa4MasterySummary({
    completedInspector: {},
    completedDefence: {},
    completedLegislation: {},
    completedIncident: {},
  });
  assert.equal(empty.totalChallenges, 24);
  assert.equal(empty.completedChallenges, 0);
  assert.equal(empty.masteryPct, 0);
});

test('evaluateThreatInspectorCase scores exact phishing flags, rejects false flags, and handles legitimate notice', () => {
  const phishingCase = THREAT_INSPECTOR_CASES[0];
  const redFlags = phishingCase.clues.filter((c) => c.isRedFlag).map((c) => c.id);

  const perfect = evaluateThreatInspectorCase(phishingCase, redFlags, 'phishing');
  assert.equal(perfect.marksEarned, 3);
  assert.equal(perfect.isMastered, true);
  assert.equal(perfect.falsePositives.length, 0);

  // Including a safe decoy element drops a mark
  const allClues = phishingCase.clues.map((c) => c.id);
  const withFalseFlag = evaluateThreatInspectorCase(phishingCase, allClues, 'phishing');
  assert.equal(withFalseFlag.isMastered, false);
  assert.equal(withFalseFlag.falsePositives.length, 1);

  // Legitimate notice requires 0 red flags + 'legitimate' classification
  const safeCase = THREAT_INSPECTOR_CASES.find((c) => c.expectedClassification === 'legitimate')!;
  const safePass = evaluateThreatInspectorCase(safeCase, [], 'legitimate');
  assert.equal(safePass.isMastered, true);
  assert.equal(safePass.marksEarned, 3);
});

test('evaluateLayeredDefence scores 3/3 blocked, partial mitigation, and breached outcomes accurately', () => {
  const ransomwareScenario = LAYERED_DEFENCE_SCENARIOS[0];
  const blocked = evaluateLayeredDefence(ransomwareScenario, ransomwareScenario.requiredControlIds);
  assert.equal(blocked.outcome, 'blocked');
  assert.equal(blocked.marksEarned, 3);
  assert.equal(blocked.isMastered, true);
  assert.equal(blocked.resistancePct, 100);

  const partial = evaluateLayeredDefence(ransomwareScenario, [
    ransomwareScenario.requiredControlIds[0],
    ransomwareScenario.requiredControlIds[1],
    'pay-ransom',
  ]);
  assert.equal(partial.outcome, 'partial');
  assert.equal(partial.marksEarned, 2);
  assert.equal(partial.isMastered, false);
  assert.deepEqual(partial.wrongIds, ['pay-ransom']);

  const breached = evaluateLayeredDefence(ransomwareScenario, ['bigger-monitor', 'open-wifi', 'pay-ransom']);
  assert.equal(breached.outcome, 'breached');
  assert.equal(breached.marksEarned, 0);
});

test('evaluateLegislationCase grades UK Act and specific legal clause independently', () => {
  const dpaCase = LEGISLATION_CASES[0];
  const full = evaluateLegislationCase(dpaCase, dpaCase.correctActId, dpaCase.correctClauseId);
  assert.equal(full.marksEarned, 2);
  assert.equal(full.isMastered, true);
  assert.ok(full.correctActFullName.includes('Data Protection Act 2018'));

  const actOnly = evaluateLegislationCase(dpaCase, dpaCase.correctActId, 'cma-s1');
  assert.equal(actOnly.marksEarned, 1);
  assert.equal(actOnly.actCorrect, true);
  assert.equal(actOnly.clauseCorrect, false);
  assert.equal(actOnly.isMastered, false);
});

test('evaluateIncidentChallenge grades chronological sequence ordering and security control decisions', () => {
  const orderChallenge = INCIDENT_CHALLENGES.find((c) => c.kind === 'order')!;
  assert.equal(orderChallenge.kind, 'order');

  const scrambled = evaluateIncidentChallenge(orderChallenge, orderChallenge.initialOrderIds);
  assert.equal(scrambled.isMastered, false);

  const exactOrder = orderChallenge.steps.map((s) => s.id);
  const perfectOrder = evaluateIncidentChallenge(orderChallenge, exactOrder);
  assert.equal(perfectOrder.isMastered, true);
  assert.equal(perfectOrder.marksEarned, orderChallenge.steps.length);

  const decisionChallenge = INCIDENT_CHALLENGES.find((c) => c.kind === 'decision')!;
  assert.equal(decisionChallenge.kind, 'decision');
  assert.equal(evaluateIncidentChallenge(decisionChallenge, decisionChallenge.correctOptionId).isMastered, true);
  assert.equal(evaluateIncidentChallenge(decisionChallenge, 'wrong-opt').isMastered, false);
});

test('computeTa4MasterySummary aggregates progress across all 4 TA4 lab modes', () => {
  const summary = computeTa4MasterySummary({
    completedInspector: { 'insp-1': true, 'insp-2': true },
    completedDefence: { 'def-1': true },
    completedLegislation: { 'law-1': true, 'law-2': true },
    completedIncident: { 'inc-1': true },
  });
  assert.equal(summary.inspectorDone, 2);
  assert.equal(summary.defenceDone, 1);
  assert.equal(summary.legislationDone, 2);
  assert.equal(summary.incidentDone, 1);
  assert.equal(summary.completedChallenges, 6);
  assert.equal(summary.masteryPct, 25);
});
