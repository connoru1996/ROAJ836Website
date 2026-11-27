import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyExamQuestionNavState,
  getNavbarSyncStatusView,
} from '../src/examSyncState';

test('classifyExamQuestionNavState clearly distinguishes Unanswered, Saved locally, Flagged, and Submitted states', () => {
  const unans = classifyExamQuestionNavState({
    isAnswered: false,
    isFlagged: false,
    isChecked: false,
    isPaperSubmitted: false,
    score: 0,
    maxMarks: 1,
  });
  assert.equal(unans.status, 'unanswered');
  assert.equal(unans.isSavedLocally, false);
  assert.equal(unans.isSubmitted, false);

  const saved = classifyExamQuestionNavState({
    isAnswered: true,
    isFlagged: false,
    isChecked: false,
    isPaperSubmitted: false,
    score: 0,
    maxMarks: 2,
  });
  assert.equal(saved.status, 'saved-local');
  assert.equal(saved.isSavedLocally, true);
  assert.equal(saved.isSubmitted, false);

  const flaggedSaved = classifyExamQuestionNavState({
    isAnswered: true,
    isFlagged: true,
    isChecked: false,
    isPaperSubmitted: false,
    score: 0,
    maxMarks: 1,
  });
  assert.equal(flaggedSaved.status, 'flagged');
  assert.equal(flaggedSaved.isSavedLocally, true);

  const subFull = classifyExamQuestionNavState({
    isAnswered: true,
    isFlagged: false,
    isChecked: true,
    isPaperSubmitted: false,
    score: 2,
    maxMarks: 2,
  });
  assert.equal(subFull.status, 'submitted-full');
  assert.equal(subFull.isSubmitted, true);
  assert.equal(subFull.isSavedLocally, false);

  const subPartial = classifyExamQuestionNavState({
    isAnswered: true,
    isFlagged: false,
    isChecked: false,
    isPaperSubmitted: true,
    score: 1,
    maxMarks: 3,
  });
  assert.equal(subPartial.status, 'submitted-partial');
  assert.equal(subPartial.isSubmitted, true);

  const subWrong = classifyExamQuestionNavState({
    isAnswered: true,
    isFlagged: false,
    isChecked: false,
    isPaperSubmitted: true,
    score: 0,
    maxMarks: 1,
  });
  assert.equal(subWrong.status, 'submitted-wrong');
  assert.equal(subWrong.isSubmitted, true);
});

test('getNavbarSyncStatusView reflects guest local save, syncing, cloud synced, and error states', () => {
  const guest = getNavbarSyncStatusView({
    isSignedIn: false,
    syncState: 'idle',
    lastSyncedAt: null,
  });
  assert.equal(guest.stateKey, 'local-only');
  assert.equal(guest.shortLabel, 'Saved locally');

  const syncing = getNavbarSyncStatusView({
    isSignedIn: true,
    syncState: 'syncing',
    lastSyncedAt: null,
  });
  assert.equal(syncing.stateKey, 'syncing');
  assert.equal(syncing.shortLabel, 'Syncing…');

  const synced = getNavbarSyncStatusView({
    isSignedIn: true,
    syncState: 'synced',
    lastSyncedAt: 1700000000000,
    username: 'alex11a',
  });
  assert.equal(synced.stateKey, 'synced');
  assert.equal(synced.shortLabel, 'Synced');
  assert.ok(synced.titleTooltip.includes('@alex11a'));

  const errored = getNavbarSyncStatusView({
    isSignedIn: true,
    syncState: 'error',
    lastSyncedAt: null,
  });
  assert.equal(errored.stateKey, 'error');
  assert.equal(errored.shortLabel, 'Sync paused');
});
