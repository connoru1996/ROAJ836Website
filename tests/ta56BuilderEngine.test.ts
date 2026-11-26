import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONNECTIVITY_SPECS,
  CONNECTIVITY_CHALLENGES,
  IOE_SYSTEM_BLUEPRINTS,
  COMMS_CHALLENGES,
  TRADEOFF_CHALLENGES,
  evaluateConnectivityChallenge,
  evaluateIoeBuild,
  evaluateCommsChallenge,
  evaluateTradeoffChallenge,
  computeTa56MasterySummary,
} from '../src/ta56BuilderEngine';

test('TA5 & TA6 Builder contains 24 structured challenges across 4 modes and 6 connectivity specs', () => {
  assert.equal(CONNECTIVITY_SPECS.length, 6);
  assert.equal(CONNECTIVITY_CHALLENGES.length, 6);
  assert.equal(IOE_SYSTEM_BLUEPRINTS.length, 6);
  assert.equal(COMMS_CHALLENGES.length, 6);
  assert.equal(TRADEOFF_CHALLENGES.length, 6);

  const summary = computeTa56MasterySummary({
    completedConnectivity: {},
    completedIoe: {},
    completedComms: {},
    completedTradeoffs: {},
  });
  assert.equal(summary.totalChallenges, 24);
  assert.equal(summary.completedChallenges, 0);
  assert.equal(summary.masteryPct, 0);
});

test('evaluateConnectivityChallenge grades technology choice and technical justification independently', () => {
  const nfcCase = CONNECTIVITY_CHALLENGES[0];
  const full = evaluateConnectivityChallenge(nfcCase, nfcCase.correctTechId, nfcCase.correctReasonId);
  assert.equal(full.marksEarned, 2);
  assert.equal(full.isMastered, true);
  assert.equal(full.techCorrect, true);
  assert.equal(full.reasonCorrect, true);

  const partial = evaluateConnectivityChallenge(nfcCase, nfcCase.correctTechId, 'wifi-hd');
  assert.equal(partial.marksEarned, 1);
  assert.equal(partial.isMastered, false);
  assert.equal(partial.techCorrect, true);
  assert.equal(partial.reasonCorrect, false);

  const zero = evaluateConnectivityChallenge(nfcCase, 'wifi', 'wifi-hd');
  assert.equal(zero.marksEarned, 0);
  assert.equal(zero.isMastered, false);
});

test('evaluateIoeBuild verifies all 4 IoE pipeline stages and reports operational, degraded, or broken status', () => {
  const greenhouse = IOE_SYSTEM_BLUEPRINTS[0];
  const full = evaluateIoeBuild(greenhouse, {
    sensor: greenhouse.stages.sensor.correctOptionId,
    network: greenhouse.stages.network.correctOptionId,
    process: greenhouse.stages.process.correctOptionId,
    actuator: greenhouse.stages.actuator.correctOptionId,
  });
  assert.equal(full.marksEarned, 4);
  assert.equal(full.isMastered, true);
  assert.equal(full.pipelineStatus, 'operational');
  assert.equal(full.stageResults.every((s) => s.isCorrect), true);

  const degraded = evaluateIoeBuild(greenhouse, {
    sensor: greenhouse.stages.sensor.correctOptionId,
    network: 'nfc-manual',
    process: greenhouse.stages.process.correctOptionId,
    actuator: 'receipt-printer',
  });
  assert.equal(degraded.marksEarned, 2);
  assert.equal(degraded.isMastered, false);
  assert.equal(degraded.pipelineStatus, 'degraded');

  const broken = evaluateIoeBuild(greenhouse, {
    sensor: 'barcode-gun',
    network: 'printed-log',
    process: 'spell-check',
    actuator: 'receipt-printer',
  });
  assert.equal(broken.marksEarned, 0);
  assert.equal(broken.pipelineStatus, 'broken');
});

test('evaluateCommsChallenge grades channel selection and exam trade-off accurately', () => {
  const hwTrap = COMMS_CHALLENGES[0];
  const pass = evaluateCommsChallenge(hwTrap, hwTrap.correctChannelId, hwTrap.correctDetailId);
  assert.equal(pass.marksEarned, 2);
  assert.equal(pass.isMastered, true);

  const fail = evaluateCommsChallenge(hwTrap, 'sw-trap', hwTrap.correctDetailId);
  assert.equal(fail.marksEarned, 1);
  assert.equal(fail.isMastered, false);
});

test('evaluateTradeoffChallenge grades system risk diagnosis and mitigation independently', () => {
  const cloudOutage = TRADEOFF_CHALLENGES[0];
  const full = evaluateTradeoffChallenge(cloudOutage, cloudOutage.correctRiskId, cloudOutage.correctMitigationId);
  assert.equal(full.marksEarned, 2);
  assert.equal(full.isMastered, true);

  const partial = evaluateTradeoffChallenge(cloudOutage, cloudOutage.correctRiskId, 'remove-locks');
  assert.equal(partial.marksEarned, 1);
  assert.equal(partial.isMastered, false);
});

test('computeTa56MasterySummary aggregates completed challenges across all 4 modes', () => {
  const summary = computeTa56MasterySummary({
    completedConnectivity: { 'conn-1': true, 'conn-2': true },
    completedIoe: { 'ioe-1': true },
    completedComms: { 'comm-1': true },
    completedTradeoffs: { 'to-1': true, 'to-2': true },
  });
  assert.equal(summary.completedChallenges, 6);
  assert.equal(summary.totalChallenges, 24);
  assert.equal(summary.masteryPct, 25);
  assert.equal(summary.byMode.connectivity.done, 2);
  assert.equal(summary.byMode.ioe.done, 1);
  assert.equal(summary.byMode.comms.done, 1);
  assert.equal(summary.byMode.tradeoffs.done, 2);
});
