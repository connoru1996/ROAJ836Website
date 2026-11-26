import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAIN_TOPIC_COPY,
  STUDENT_HOME_TABS,
  getPlainTopicCopy,
  getRecommendedNextStep,
  getStudentGreeting,
  normalizeHomeTab,
} from '../src/studentHomeHub';

test('normalizeHomeTab accepts valid tabs and defaults safely', () => {
  assert.equal(normalizeHomeTab('start'), 'start');
  assert.equal(normalizeHomeTab('papers'), 'papers');
  assert.equal(normalizeHomeTab('labs'), 'labs');
  assert.equal(normalizeHomeTab('topics'), 'topics');
  assert.equal(normalizeHomeTab('unknown'), 'start');
  assert.equal(normalizeHomeTab(null), 'start');
});

test('getStudentGreeting uses first name and ignores default placeholders', () => {
  assert.equal(getStudentGreeting('Alex Turner'), 'Hi Alex, ready to revise?');
  assert.equal(getStudentGreeting('  Maya-Jane Patel  '), 'Hi Maya-Jane, ready to revise?');
  assert.equal(getStudentGreeting('Practice Student'), 'Simple revision for OCR Unit R050');
  assert.equal(getStudentGreeting('Mock Candidate'), 'Simple revision for OCR Unit R050');
  assert.equal(getStudentGreeting(''), 'Simple revision for OCR Unit R050');
});

test('getRecommendedNextStep prioritizes resume -> warmup -> weakest topic -> past papers', () => {
  const resume = getRecommendedNextStep({
    answeredCount: 6,
    totalQuestions: 32,
    isSubmitted: false,
    warmupDoneToday: false,
    hasExamData: true,
    weakestTA: 'TA4',
    weakestTitle: 'Cyber-Security',
    weakestPct: 45,
  });
  assert.equal(resume.action, 'resume');
  assert.equal(resume.ctaLabel, 'Continue Saved Paper');

  const warmup = getRecommendedNextStep({
    answeredCount: 0,
    totalQuestions: 32,
    isSubmitted: false,
    warmupDoneToday: false,
    hasExamData: false,
    weakestTA: null,
    weakestTitle: null,
    weakestPct: null,
  });
  assert.equal(warmup.action, 'warmup');
  assert.equal(warmup.ctaLabel, 'Start 5-Min Warm-Up');

  const weakest = getRecommendedNextStep({
    answeredCount: 32,
    totalQuestions: 32,
    isSubmitted: true,
    warmupDoneToday: true,
    hasExamData: true,
    weakestTA: 'TA4',
    weakestTitle: 'Cyber-Security',
    weakestPct: 52,
  });
  assert.equal(weakest.action, 'weakest');
  assert.equal(weakest.targetTA, 'TA4');
  assert.match(weakest.ctaLabel, /TA4/);

  const official = getRecommendedNextStep({
    answeredCount: 0,
    totalQuestions: 32,
    isSubmitted: false,
    warmupDoneToday: true,
    hasExamData: true,
    weakestTA: 'TA1',
    weakestTitle: 'Design Tools',
    weakestPct: 88,
  });
  assert.equal(official.action, 'official');
});

test('all 4 student tabs and all 6 topics have plain-English copy', () => {
  assert.equal(STUDENT_HOME_TABS.length, 4);
  const expectedTopics = ['TA1', 'TA2', 'TA3', 'TA4', 'TA5', 'TA6'] as const;
  for (const ta of expectedTopics) {
    const copy = getPlainTopicCopy(ta);
    assert.ok(copy, `Missing plain copy for ${ta}`);
    assert.ok(copy.plainTitle.length > 0);
    assert.ok(copy.plainSummary.length > 0 && copy.plainSummary.length < 95);
  }
  assert.equal(Object.keys(PLAIN_TOPIC_COPY).length, 6);
});
