import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rulesText = fs.readFileSync(rulesPath, 'utf8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

test('firestore.rules enforces global default deny and zero allow list rules', () => {
  assert.match(rulesText, /rules_version\s*=\s*'2';/);
  assert.match(rulesText, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
  assert.doesNotMatch(rulesText, /allow list:\s*if\s+(?!false)/);
});

test('firestore.rules covers every collection declared in firebase-blueprint.json', () => {
  const paths = Object.keys(blueprint.firestore || {});
  assert.ok(paths.includes('/users/{userId}'));
  assert.ok(paths.includes('/users/{userId}/progress/{progressId}'));
  assert.match(rulesText, /match \/users\/\{userId\}/);
  assert.match(rulesText, /match \/progress\/\{progressId\}/);
});

test('firestore.rules enforces Eight Pillars: isValidId, validation blueprints, Master Gate, immutable fields, and request.time', () => {
  assert.match(rulesText, /function isValidId\(id\)/);
  assert.match(rulesText, /function isValidUserProfile\(data, userId\)/);
  assert.match(rulesText, /function isValidProgressSnapshot\(data, userId\)/);
  assert.match(rulesText, /function hasValidParentProfile\(userId\)/);
  assert.match(rulesText, /incoming\(\)\.createdAt == request\.time/);
  assert.match(rulesText, /incoming\(\)\.updatedAt == request\.time/);
  assert.match(rulesText, /incoming\(\)\.uid == existing\(\)\.uid/);
  assert.match(rulesText, /incoming\(\)\.authProvider == existing\(\)\.authProvider/);
  assert.match(rulesText, /incoming\(\)\.ownerId == existing\(\)\.ownerId/);
  assert.match(rulesText, /affectedKeys\(\)\.hasOnly\(\['modules', 'updatedAt'\]\)/);
  assert.match(rulesText, /modules\.customPapers is list && modules\.customPapers\.size\(\) <= 20/);
});
