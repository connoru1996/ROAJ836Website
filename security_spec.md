# Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default Deny**: Every unmatched path in `/databases/{database}/documents` denies all reads and writes.
2. **Strict Owner Isolation (No PII Leaks / No List Scraping)**:
   - `/users/{userId}` allows `get`, `create`, `update`, and `delete` ONLY when `request.auth != null && request.auth.uid == userId` and `isValidId(userId)`.
   - `allow list` is denied (`false`) on both `/users` and `/users/{userId}/progress`.
3. **Master Gate Relational Sync**:
   - `/users/{userId}/progress/{progressId}` requires `progressId == 'snapshot'`, `isValidId(userId)`, `isValidId(progressId)`, and verifies via `get(/databases/$(database)/documents/users/$(userId)).data.uid == request.auth.uid` that the parent profile exists and belongs to the caller.
4. **Validation Blueprints & Anti-Update-Gap**:
   - `isValidUserProfile(data, userId)` runs on every `create` and `update` of `/users/{userId}` enforcing required/allowed keys, regex patterns, string length bounds, enum allowlist (`['password', 'google']`), and `data.uid == request.auth.uid`.
   - `isValidProgressSnapshot(data, userId)` runs on every `create` and `update` of `/users/{userId}/progress/{progressId}` enforcing required/allowed keys, `data.ownerId == request.auth.uid`, `data.schemaVersion == 1`, and native `map` allowlist on `data.modules.keys()`.
5. **Immortal Fields & Temporal Integrity**:
   - `uid`, `authProvider`, `ownerId`, and `createdAt` are strictly immutable on `update`.
   - `createdAt == request.time` on `create`, and `updatedAt == request.time` on both `create` and `update`.
6. **Verified Federated / Password Identity**:
   - Write operations require either `request.auth.token.email_verified == true` (for Google Sign-In) or `request.auth.token.firebase.sign_in_provider == 'password'` (for username+password student accounts whose UID is cryptographically bound to `userId`).

## 2. The "Dirty Dozen" Adversarial Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Profile Read**: `GET /users/student_a` with `auth = null`.
2. **Cross-User Profile Read (PII Blanket Test)**: `GET /users/student_a` signed in as `student_b`.
3. **Collection Scrape (`list` Attack)**: `LIST /users` signed in as `student_a`.
4. **Identity Spoofing on Create**: `CREATE /users/student_a` as `student_a` with `{ uid: "student_b", ... }`.
5. **Shadow / Ghost Field Injection (Shadow Update Test)**: `CREATE /users/student_a` with extra key `{ isAdmin: true }` or `{ role: "teacher" }`.
6. **Resource Poisoning via Oversized Display Name**: `CREATE /users/student_a` with `displayName` of 500 characters (`> 80`).
7. **ID Poisoning Attack**: `CREATE /users/bad$id!with*symbols` (violates `isValidId`).
8. **Immortal Field Tampering**: `UPDATE /users/student_a` changing `createdAt` or `authProvider` or `uid`.
9. **Client Timestamp Forgery**: `UPDATE /users/student_a` setting `updatedAt` to a past client timestamp instead of `request.time`.
10. **Orphaned Progress Write (Master Gate Bypass)**: `CREATE /users/student_a/progress/snapshot` when `/users/student_a` parent document does not exist.
11. **Arbitrary Progress Subcollection Spam**: `CREATE /users/student_a/progress/doc_999` (`progressId != 'snapshot'`).
12. **Value Poisoning on Progress Modules**: `UPDATE /users/student_a/progress/snapshot` with `modules: { unknownKey: {}, examState: "not-a-map" }` (unknown module key or JSON string instead of native Map).
