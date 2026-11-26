import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  extractUsernameFromEmail,
  sanitizeForFirestore,
  type SyncModuleKey,
} from './authSyncEngine';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIREBASE_AUTH_PROVIDERS_URL = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export interface StudentAccountProfile {
  uid: string;
  username: string;
  displayName: string;
  studentClass: string;
  authProvider: 'password' | 'google';
  updatedAtMs?: number;
}

export interface StudentProgressSnapshotDoc {
  ownerId: string;
  schemaVersion: number;
  modules: Partial<Record<SyncModuleKey, unknown>>;
  updatedAtMs?: number;
}

function timestampToMs(ts: unknown): number | undefined {
  if (ts && typeof ts === 'object' && 'toMillis' in ts && typeof (ts as Timestamp).toMillis === 'function') {
    return (ts as Timestamp).toMillis();
  }
  return undefined;
}

export async function ensureUserProfile(
  user: User,
  defaults?: {
    username?: string;
    displayName?: string;
    studentClass?: string;
    authProvider?: 'password' | 'google';
  }
): Promise<StudentAccountProfile> {
  const userPath = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);

  let existingSnap;
  try {
    existingSnap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (existingSnap.exists()) {
    const data = existingSnap.data();
    return {
      uid: String(data.uid || user.uid),
      username: String(data.username || extractUsernameFromEmail(user.email, user.uid)),
      displayName: String(data.displayName || user.displayName || 'Student'),
      studentClass: String(data.studentClass || ''),
      authProvider: data.authProvider === 'google' ? 'google' : 'password',
      updatedAtMs: timestampToMs(data.updatedAt),
    };
  }

  const inferredProvider: 'password' | 'google' =
    defaults?.authProvider ||
    (user.providerData.some((p) => p.providerId === 'google.com') ? 'google' : 'password');

  const username = (
    defaults?.username || extractUsernameFromEmail(user.email, user.uid)
  ).slice(0, 32);
  const displayName = (
    defaults?.displayName ||
    user.displayName ||
    username
  )
    .trim()
    .slice(0, 80);
  const studentClass = String(defaults?.studentClass || '')
    .trim()
    .slice(0, 60);

  const payload = {
    uid: user.uid,
    username,
    displayName: displayName || 'Student',
    studentClass,
    authProvider: inferredProvider,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, userPath);
  }

  return {
    uid: user.uid,
    username,
    displayName: payload.displayName,
    studentClass,
    authProvider: inferredProvider,
    updatedAtMs: Date.now(),
  };
}

export async function updateStudentAccountProfile(
  uid: string,
  updates: { displayName: string; studentClass: string }
): Promise<void> {
  const userPath = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  const displayName = updates.displayName.trim().slice(0, 80);
  const studentClass = updates.studentClass.trim().slice(0, 60);

  try {
    await updateDoc(ref, {
      displayName,
      studentClass,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }

  if (auth.currentUser && auth.currentUser.uid === uid) {
    try {
      await updateProfile(auth.currentUser, { displayName });
    } catch {
      // Non-critical Auth displayName sync
    }
  }
}

export async function fetchProgressSnapshot(
  uid: string
): Promise<StudentProgressSnapshotDoc | null> {
  const snapPath = `users/${uid}/progress/snapshot`;
  const ref = doc(db, 'users', uid, 'progress', 'snapshot');

  let snap;
  try {
    snap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, snapPath);
  }

  if (!snap.exists()) return null;
  const data = snap.data();
  const rawModules =
    data.modules && typeof data.modules === 'object' && !Array.isArray(data.modules)
      ? (data.modules as Partial<Record<SyncModuleKey, unknown>>)
      : {};

  return {
    ownerId: String(data.ownerId || uid),
    schemaVersion: Number(data.schemaVersion || 1),
    modules: rawModules,
    updatedAtMs: timestampToMs(data.updatedAt),
  };
}

export async function saveProgressSnapshot(
  uid: string,
  modules: Partial<Record<SyncModuleKey, unknown>>
): Promise<void> {
  const snapPath = `users/${uid}/progress/snapshot`;
  const ref = doc(db, 'users', uid, 'progress', 'snapshot');
  const sanitizedModules = sanitizeForFirestore(modules, 0) as Partial<
    Record<SyncModuleKey, unknown>
  >;

  let existsAlready = false;
  try {
    const existing = await getDoc(ref);
    existsAlready = existing.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, snapPath);
  }

  if (existsAlready) {
    try {
      await updateDoc(ref, {
        modules: sanitizedModules,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, snapPath);
    }
  } else {
    try {
      await setDoc(ref, {
        ownerId: uid,
        schemaVersion: 1,
        modules: sanitizedModules,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, snapPath);
    }
  }
}

export async function registerUsernamePasswordAccount(params: {
  authEmail: string;
  username: string;
  displayName: string;
  studentClass: string;
  password: string;
}): Promise<{ user: User; profile: StudentAccountProfile }> {
  const cred = await createUserWithEmailAndPassword(auth, params.authEmail, params.password);
  try {
    await updateProfile(cred.user, { displayName: params.displayName });
  } catch {
    // Profile displayName is persisted in Firestore below
  }
  const profile = await ensureUserProfile(cred.user, {
    username: params.username,
    displayName: params.displayName,
    studentClass: params.studentClass,
    authProvider: 'password',
  });
  return { user: cred.user, profile };
}

export async function loginUsernamePasswordAccount(params: {
  authEmail: string;
  password: string;
}): Promise<{ user: User; profile: StudentAccountProfile }> {
  const cred = await signInWithEmailAndPassword(auth, params.authEmail, params.password);
  const profile = await ensureUserProfile(cred.user, { authProvider: 'password' });
  return { user: cred.user, profile };
}

export async function loginWithGooglePopup(): Promise<{
  user: User;
  profile: StudentAccountProfile;
}> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  const profile = await ensureUserProfile(cred.user, { authProvider: 'google' });
  return { user: cred.user, profile };
}

export async function logoutAccount(): Promise<void> {
  await signOut(auth);
}

export function subscribeAuthChanges(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
