import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampQuestionIndex,
  stepQuestionIndex,
  resolveActiveQuestionIndex,
  findNextUnansweredIndex,
  computeFocusProgress,
  shouldHandleFocusShortcut,
  getFocusModeToggleCopy,
} from '../src/examFocusEngine';

test('clampQuestionIndex and stepQuestionIndex stay safely within bounds', () => {
  assert.equal(clampQuestionIndex(-5, 10), 0);
  assert.equal(clampQuestionIndex(14, 10), 9);
  assert.equal(clampQuestionIndex(3.8, 10), 3);
  assert.equal(clampQuestionIndex(2, 0), 0);

  assert.equal(stepQuestionIndex(0, -1, 5), 0);
  assert.equal(stepQuestionIndex(0, 1, 5), 1);
  assert.equal(stepQuestionIndex(4, 1, 5), 4);
  assert.equal(stepQuestionIndex(4, -2, 5), 2);
});

test('resolveActiveQuestionIndex preserves active question by ID and falls back cleanly', () => {
  const ids = ['q1', 'q2', 'q3', 'q4'];
  assert.equal(resolveActiveQuestionIndex(ids, 'q3', 0), 2);
  assert.equal(resolveActiveQuestionIndex(ids, 'missing', 1), 1);
  assert.equal(resolveActiveQuestionIndex(ids, null, 99), 3);
  assert.equal(resolveActiveQuestionIndex([], 'q1', 2), 0);
});

test('findNextUnansweredIndex wraps around and returns null when all answered', () => {
  const items = [
    { id: 'q1', answered: false },
    { id: 'q2', answered: true },
    { id: 'q3', answered: true },
    { id: 'q4', answered: false },
  ];
  assert.equal(findNextUnansweredIndex(items, 0), 3);
  assert.equal(findNextUnansweredIndex(items, 3), 0);
  assert.equal(findNextUnansweredIndex(items, 1), 3);

  const allDone = items.map((item) => ({ ...item, answered: true }));
  assert.equal(findNextUnansweredIndex(allDone, 0), null);
});

test('computeFocusProgress reports position, completion percentage, and navigation flags accurately', () => {
  const first = computeFocusProgress(0, 10, 0);
  assert.equal(first.currentPosition, 1);
  assert.equal(first.completionPct, 10);
  assert.equal(first.canGoPrev, false);
  assert.equal(first.canGoNext, true);
  assert.equal(first.isLast, false);

  const last = computeFocusProgress(9, 10, 7);
  assert.equal(last.currentPosition, 10);
  assert.equal(last.answeredCount, 7);
  assert.equal(last.completionPct, 100);
  assert.equal(last.canGoPrev, true);
  assert.equal(last.canGoNext, false);
  assert.equal(last.isLast, true);
});

test('shouldHandleFocusShortcut respects typing targets and modifier keys', () => {
  assert.equal(
    shouldHandleFocusShortcut({
      key: 'ArrowRight',
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      isTypingTarget: false,
      focusEnabled: true,
    }),
    'next'
  );
  assert.equal(
    shouldHandleFocusShortcut({
      key: 'ArrowLeft',
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      isTypingTarget: false,
      focusEnabled: true,
    }),
    'prev'
  );
  assert.equal(
    shouldHandleFocusShortcut({
      key: 'Escape',
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      isTypingTarget: false,
      focusEnabled: true,
    }),
    'exit'
  );
  // Never hijack typing inside textareas or inputs
  assert.equal(
    shouldHandleFocusShortcut({
      key: 'ArrowRight',
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      isTypingTarget: true,
      focusEnabled: true,
    }),
    null
  );
  // Ignored when Focus Mode is disabled
  assert.equal(
    shouldHandleFocusShortcut({
      key: 'ArrowRight',
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      isTypingTarget: false,
      focusEnabled: false,
    }),
    null
  );
  // Alt+F toggles Focus Mode
  assert.equal(
    shouldHandleFocusShortcut({
      key: 'f',
      altKey: true,
      ctrlKey: false,
      metaKey: false,
      isTypingTarget: false,
      focusEnabled: false,
    }),
    'toggle'
  );
});

test('getFocusModeToggleCopy returns accessible dual-coded state labels', () => {
  const off = getFocusModeToggleCopy(false);
  assert.equal(off.label, 'Focus Mode');
  assert.equal(off.isPressed, false);
  assert.equal(off.iconClass, 'fa-expand');

  const on = getFocusModeToggleCopy(true);
  assert.equal(on.label, 'Exit Focus');
  assert.equal(on.isPressed, true);
  assert.equal(on.iconClass, 'fa-compress');
});
