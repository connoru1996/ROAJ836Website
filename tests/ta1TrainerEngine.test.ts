import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLOWCHART_SCENARIOS,
  MIND_MAP_CHALLENGE,
  WIREFRAME_CHALLENGE,
  VISUALISATION_CHALLENGE,
  TOOL_CHOICE_QUESTIONS,
  createInitialSubmission,
  createModelSubmission,
  evaluateFlowchartSubmission,
  traceFlowchartExecution,
  validateFreeformFlowchart,
  evaluateMindMap,
  evaluateWireframeSelection,
  evaluateVisualisationDiagram,
  evaluateToolChoice,
  computeTa1MasterySummary,
} from '../src/ta1TrainerEngine';

test('evaluateFlowchartSubmission awards 6/6 marks for model solution', () => {
  const scenario = FLOWCHART_SCENARIOS[0];
  const model = createModelSubmission(scenario);
  const res = evaluateFlowchartSubmission(scenario, model);

  assert.equal(res.marksEarned, 6);
  assert.equal(res.maxMarks, 6);
  assert.equal(res.pct, 100);
  assert.equal(res.allPassed, true);
  assert.equal(res.criteria.every((c) => c.passed), true);
});

test('evaluateFlowchartSubmission catches missing symbols, wrong shapes, and unlabelled branches', () => {
  const scenario = FLOWCHART_SCENARIOS[0];
  const initial = createInitialSubmission(scenario);

  // Blank initial submission should score 0/6
  const emptyRes = evaluateFlowchartSubmission(scenario, initial);
  assert.equal(emptyRes.marksEarned, 0);
  assert.equal(emptyRes.allPassed, false);

  // Partial submission: correct End terminator & Decision, wrong I/O shape, missing branch labels
  const partial = createModelSubmission(scenario);
  partial.nodeSymbols['n2'] = 'process'; // Wrong! Input should be 'io'
  partial.edgeLabels['e3'] = ''; // Missing Yes label
  const partialRes = evaluateFlowchartSubmission(scenario, partial);

  assert.equal(partialRes.nodeResults['n2'].symbolCorrect, false);
  assert.equal(partialRes.nodeResults['n2'].labelCorrect, true);
  assert.equal(partialRes.edgeResults['e3'].correct, false);
  assert.equal(partialRes.marksEarned, 4); // Loses 1 for branches + 1 for ISO shapes (3/4 non-term symbols = 1/2 marks)
});

test('traceFlowchartExecution follows Yes and No branches accurately to End', () => {
  const scenario = FLOWCHART_SCENARIOS[0];
  const model = createModelSubmission(scenario);

  const yesTrace = traceFlowchartExecution(scenario, model, 'in-stock');
  assert.equal(yesTrace.completed, true);
  assert.deepEqual(
    yesTrace.steps.map((s) => s.nodeId),
    ['n1', 'n2', 'n3', 'n4', 'n6']
  );

  const noTrace = traceFlowchartExecution(scenario, model, 'out-of-stock');
  assert.equal(noTrace.completed, true);
  assert.deepEqual(
    noTrace.steps.map((s) => s.nodeId),
    ['n1', 'n2', 'n3', 'n5', 'n6']
  );
});

test('validateFreeformFlowchart enforces Start, End, I/O or Process, Decision with Yes/No, and full connectivity', () => {
  const validNodes = [
    { id: 'f1', symbol: 'terminator' as const, label: 'Start', x: 100, y: 40 },
    { id: 'f2', symbol: 'io' as const, label: 'Enter PIN', x: 100, y: 120 },
    { id: 'f3', symbol: 'decision' as const, label: 'PIN valid?', x: 100, y: 200 },
    { id: 'f4', symbol: 'process' as const, label: 'Open menu', x: 40, y: 300 },
    { id: 'f5', symbol: 'io' as const, label: 'Show error', x: 180, y: 300 },
    { id: 'f6', symbol: 'terminator' as const, label: 'End', x: 100, y: 390 },
  ];
  const validEdges = [
    { id: 'fe1', from: 'f1', to: 'f2' },
    { id: 'fe2', from: 'f2', to: 'f3' },
    { id: 'fe3', from: 'f3', to: 'f4', branchLabel: 'Yes' as const },
    { id: 'fe4', from: 'f3', to: 'f5', branchLabel: 'No' as const },
    { id: 'fe5', from: 'f4', to: 'f6' },
    { id: 'fe6', from: 'f5', to: 'f6' },
  ];

  const passRes = validateFreeformFlowchart(validNodes, validEdges);
  assert.equal(passRes.score, 5);
  assert.equal(passRes.maxScore, 5);

  // Removing No label fails decision criterion
  const brokenEdges = validEdges.map((e) => (e.id === 'fe4' ? { ...e, branchLabel: '' as const } : e));
  const failRes = validateFreeformFlowchart(validNodes, brokenEdges);
  assert.equal(failRes.score, 4);
});

test('evaluateWireframeSelection rewards required elements and penalises non-wireframe distractors', () => {
  const allRequired = WIREFRAME_CHALLENGE.elements.filter((e) => e.required).map((e) => e.id);
  const perfect = evaluateWireframeSelection(WIREFRAME_CHALLENGE, allRequired);
  assert.equal(perfect.marksEarned, 6);
  assert.equal(perfect.distractorsPicked.length, 0);

  const withDistractors = [...allRequired, 'wf-dist-photo', 'wf-dist-palette'];
  const penalised = evaluateWireframeSelection(WIREFRAME_CHALLENGE, withDistractors);
  assert.equal(penalised.marksEarned, 4);
  assert.equal(penalised.distractorsPicked.length, 2);
});

test('evaluateMindMap, evaluateVisualisationDiagram, evaluateToolChoice, and computeTa1MasterySummary work end-to-end', () => {
  const mmAssignments: Record<string, string> = {};
  for (const s of MIND_MAP_CHALLENGE.slots) {
    mmAssignments[s.id] = s.expectedLabel;
  }
  const mmRes = evaluateMindMap(MIND_MAP_CHALLENGE, mmAssignments);
  assert.equal(mmRes.marksEarned, 6);

  const visAssignments: Record<string, string> = {};
  for (const p of VISUALISATION_CHALLENGE.pins) {
    visAssignments[p.id] = p.expectedAnnotationId;
  }
  const visRes = evaluateVisualisationDiagram(VISUALISATION_CHALLENGE, visAssignments);
  assert.equal(visRes.marksEarned, 6);

  const q = TOOL_CHOICE_QUESTIONS[0];
  const rightReason = q.reasonOptions.find((r) => r.correct)!.id;
  const tcRes = evaluateToolChoice(q, q.correctTool, rightReason);
  assert.equal(tcRes.marksEarned, 2);

  const summary = computeTa1MasterySummary({
    completedFlowcharts: { 'greenleaf-stock': { bestMarks: 6, maxMarks: 6 } },
    completedDrills: { 'sd-1': true, 'sd-2': true },
    completedBlueprints: { [MIND_MAP_CHALLENGE.id]: { bestMarks: 6, maxMarks: 6 } },
    completedToolMatches: { 'tc-1': true },
  });
  assert.equal(summary.flowchartsDone, 1);
  assert.equal(summary.drillsDone, 2);
  assert.equal(summary.blueprintsDone, 1);
  assert.equal(summary.toolsDone, 1);
  assert.equal(summary.completedChallenges, 5);
  assert.equal(summary.totalChallenges, 20);
  assert.equal(summary.masteryPct, 25);
});
