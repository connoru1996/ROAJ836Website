import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SYNC_MODULE_DESCRIPTORS,
  validateUsername,
  usernameToAuthEmail,
  usernameOrEmailToAuthEmail,
  extractUsernameFromEmail,
  validateSignUpInput,
  validateSignInInput,
  validateProfileUpdateInput,
  sanitizeForFirestore,
  collectLocalProgressModules,
  mergeCloudAndLocalModules,
  countSyncedModules,
  mapFirebaseAuthError,
} from '../src/authSyncEngine';

test('validateUsername enforces length and allowed lowercase character pattern', () => {
  assert.equal(validateUsername('ab').valid, false);
  assert.equal(validateUsername('a'.repeat(33)).valid, false);
  assert.equal(validateUsername('bad name!').valid, false);
  assert.equal(validateUsername('Alex_Smith.10').valid, true);
  assert.equal(usernameToAuthEmail('Alex_Smith'), 'alex_smith@students.r050.local');
});

test('usernameOrEmailToAuthEmail accepts both bare usernames and real email addresses', () => {
  const fromUser = usernameOrEmailToAuthEmail('  Year10_Maya ');
  assert.equal(fromUser.valid, true);
  assert.equal(fromUser.authEmail, 'year10_maya@students.r050.local');

  const fromEmail = usernameOrEmailToAuthEmail('student@school.org.uk');
  assert.equal(fromEmail.valid, true);
  assert.equal(fromEmail.authEmail, 'student@school.org.uk');

  assert.equal(extractUsernameFromEmail('year10_maya@students.r050.local'), 'year10_maya');
  assert.equal(extractUsernameFromEmail('connor.upton@gmail.com'), 'connor.upton');
});

test('validateSignUpInput and validateSignInInput enforce password match and blueprint limits', () => {
  const mismatch = validateSignUpInput({
    username: 'sam_11b',
    displayName: 'Sam Patel',
    studentClass: '11B',
    password: 'Password123',
    confirmPassword: 'Password456',
  });
  assert.equal(mismatch.valid, false);
  assert.match(mismatch.error || '', /match/i);

  const shortPw = validateSignUpInput({
    username: 'sam_11b',
    displayName: 'Sam Patel',
    studentClass: '11B',
    password: 'short',
    confirmPassword: 'short',
  });
  assert.equal(shortPw.valid, false);

  const ok = validateSignUpInput({
    username: 'Sam_11B',
    displayName: 'Sam Patel',
    studentClass: '11B IT',
    password: 'StrongPassword99',
    confirmPassword: 'StrongPassword99',
  });
  assert.equal(ok.valid, true);
  assert.equal(ok.normalizedUsername, 'sam_11b');
  assert.equal(ok.authEmail, 'sam_11b@students.r050.local');

  const signInOk = validateSignInInput({ identifier: 'Sam_11B', password: 'StrongPassword99' });
  assert.equal(signInOk.valid, true);
  assert.equal(signInOk.authEmail, 'sam_11b@students.r050.local');

  const badProfile = validateProfileUpdateInput({ displayName: '', studentClass: '11B' });
  assert.equal(badProfile.valid, false);
});

test('sanitizeForFirestore strips undefined, nested arrays, and oversized base64 blobs', () => {
  const hugeDataUrl = 'data:image/png;base64,' + 'A'.repeat(50000);
  const cleaned = sanitizeForFirestore({
    studentName: 'Alex',
    undefinedKey: undefined,
    sketch: hugeDataUrl,
    nestedArr: [[1, 2]],
    score: 64,
    badNum: Number.NaN,
  }) as Record<string, unknown>;

  assert.equal(cleaned.studentName, 'Alex');
  assert.equal('undefinedKey' in cleaned, false);
  assert.equal(cleaned.sketch, '');
  assert.deepEqual(cleaned.nestedArr, [{ items: [1, 2] }]);
  assert.equal(cleaned.score, 64);
  assert.equal(cleaned.badNum, 0);
});

test('collectLocalProgressModules and mergeCloudAndLocalModules preserve cloud data and local-only modules', () => {
  assert.equal(SYNC_MODULE_DESCRIPTORS.length, 12);

  const fakeStorage: Record<string, string> = {
    OCR_R050_TA56_SYSTEM_BUILDER_V1: JSON.stringify({ completedConnectivity: { 'conn-1': true } }),
    OCR_R050_FLASHCARDS_V1: JSON.stringify({ mastered: { 'fc-1': true } }),
    OCR_R050_CUSTOM_PAPERS_V1: JSON.stringify([{ id: 'cp-1', title: 'Mock' }]),
    OCR_R050_TA1_TRAINER_V1: '{corrupt-json',
  };

  const localMods = collectLocalProgressModules((k) => fakeStorage[k] ?? null);
  assert.equal(countSyncedModules(localMods), 3);
  assert.equal('ta1Trainer' in localMods, false);

  const cloudMods = {
    flashcards: { mastered: { 'fc-1': true, 'fc-2': true } },
    ta4SecurityLab: { completedThreatInspector: { 'ti-1': true } },
  };
  const merged = mergeCloudAndLocalModules(localMods, cloudMods);
  assert.equal(countSyncedModules(merged), 4);
  assert.deepEqual(merged.flashcards, cloudMods.flashcards);
  assert.deepEqual(merged.ta56SystemBuilder, localMods.ta56SystemBuilder);
  assert.deepEqual(merged.ta4SecurityLab, cloudMods.ta4SecurityLab);
});

test('mapFirebaseAuthError surfaces console setup guidance for auth/operation-not-allowed', () => {
  const opNotAllowed = mapFirebaseAuthError('auth/operation-not-allowed', 'signup');
  assert.equal(opNotAllowed.needsConsoleEmailPasswordEnable, true);
  assert.match(opNotAllowed.message, /Firebase Console/i);

  const taken = mapFirebaseAuthError('auth/email-already-in-use', 'signup');
  assert.equal(taken.needsConsoleEmailPasswordEnable, undefined);
  assert.match(taken.message, /already registered/i);

  const wrongPw = mapFirebaseAuthError('auth/invalid-credential', 'signin');
  assert.match(wrongPw.message, /Incorrect username or password/i);
});
