export type SyncModuleKey =
  | 'examState'
  | 'flashcards'
  | 'coachDrafts'
  | 'papersArchive'
  | 'officialAttempts'
  | 'customPapers'
  | 'ta1Trainer'
  | 'ta3Simulator'
  | 'ta4SecurityLab'
  | 'ta56SystemBuilder'
  | 'commandDrills'
  | 'dailyWarmup';

export interface SyncModuleDescriptor {
  key: SyncModuleKey;
  storageKey: string;
  label: string;
  expectArray?: boolean;
}

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;
export const USERNAME_REGEX = /^[a-z0-9._-]+$/;
export const DISPLAY_NAME_MIN_LENGTH = 1;
export const DISPLAY_NAME_MAX_LENGTH = 80;
export const STUDENT_CLASS_MAX_LENGTH = 60;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const UID_REGEX = /^[a-zA-Z0-9_-]+$/;
export const SYNTHETIC_EMAIL_DOMAIN = 'students.r050.local';
export const MAX_CUSTOM_PAPERS = 20;
export const MAX_SYNC_STRING_CHARS = 40000;

export const SYNC_MODULE_DESCRIPTORS: SyncModuleDescriptor[] = [
  { key: 'examState', storageKey: 'OCR_R050_EXAM_STATE_V1', label: 'Practice & Mock Exam' },
  { key: 'flashcards', storageKey: 'OCR_R050_FLASHCARDS_V1', label: 'Flashcards & Quiz' },
  { key: 'coachDrafts', storageKey: 'OCR_R050_COACH_DRAFTS_V1', label: '9-Mark Coach Drafts' },
  { key: 'papersArchive', storageKey: 'OCR_R050_PAPERS_ARCHIVE_V1', label: 'Paper Archive & Shuffles' },
  { key: 'officialAttempts', storageKey: 'OCR_R050_OFFICIAL_ATTEMPTS_V1', label: 'Official Past Papers' },
  {
    key: 'customPapers',
    storageKey: 'OCR_R050_CUSTOM_PAPERS_V1',
    label: 'Custom Papers',
    expectArray: true,
  },
  { key: 'ta1Trainer', storageKey: 'OCR_R050_TA1_TRAINER_V1', label: 'TA1 Diagram Trainer' },
  { key: 'ta3Simulator', storageKey: 'OCR_R050_TA3_SIMULATOR_V1', label: 'TA3 Validation Simulator' },
  { key: 'ta4SecurityLab', storageKey: 'OCR_R050_TA4_SECURITY_LAB_V1', label: 'TA4 Cyber-Security Lab' },
  {
    key: 'ta56SystemBuilder',
    storageKey: 'OCR_R050_TA56_SYSTEM_BUILDER_V1',
    label: 'TA5 & TA6 System Builder',
  },
  { key: 'commandDrills', storageKey: 'OCR_R050_COMMAND_DRILLS_V1', label: 'Command Word Drills' },
  {
    key: 'dailyWarmup',
    storageKey: 'OCR_R050_DAILY_WARMUP_SPEC_V1',
    label: 'Daily Warm-Up & Spec Checklist',
  },
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface SignUpInput {
  username: string;
  displayName: string;
  studentClass: string;
  password: string;
  confirmPassword: string;
}

export interface SignUpValidationResult {
  valid: boolean;
  normalizedUsername: string;
  authEmail: string;
  displayName: string;
  studentClass: string;
  error?: string;
}

export interface SignInInput {
  identifier: string;
  password: string;
}

export interface SignInValidationResult {
  valid: boolean;
  authEmail: string;
  displayIdentifier: string;
  error?: string;
}

export interface ProfileUpdateValidationResult {
  valid: boolean;
  displayName: string;
  studentClass: string;
  error?: string;
}

export interface MappedAuthError {
  message: string;
  needsConsoleEmailPasswordEnable?: boolean;
}

export function normalizeUsername(raw: string): string {
  return String(raw || '').trim().toLowerCase();
}

export function validateUsername(raw: string): ValidationResult {
  const normalized = normalizeUsername(raw);
  if (normalized.length < USERNAME_MIN_LENGTH) {
    return {
      valid: false,
      error: `Username must be at least ${USERNAME_MIN_LENGTH} characters.`,
    };
  }
  if (normalized.length > USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Username must be ${USERNAME_MAX_LENGTH} characters or fewer.`,
    };
  }
  if (!USERNAME_REGEX.test(normalized)) {
    return {
      valid: false,
      error: 'Username can only use lowercase letters, numbers, dots, underscores, or hyphens.',
    };
  }
  return { valid: true };
}

export function usernameToAuthEmail(username: string): string {
  return `${normalizeUsername(username)}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

export function extractUsernameFromEmail(email: string | null | undefined, fallbackUid = 'student'): string {
  const cleaned = String(email || '').trim().toLowerCase();
  if (cleaned.includes('@')) {
    const localPart = cleaned.split('@')[0] || '';
    const safeLocal = localPart.replace(/[^a-z0-9._-]/g, '_').slice(0, USERNAME_MAX_LENGTH);
    if (safeLocal.length >= USERNAME_MIN_LENGTH && USERNAME_REGEX.test(safeLocal)) {
      return safeLocal;
    }
  }
  const uidPart = String(fallbackUid || 'student')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 12);
  const candidate = `student_${uidPart || 'user'}`.slice(0, USERNAME_MAX_LENGTH);
  return candidate.length >= USERNAME_MIN_LENGTH ? candidate : 'student_user';
}

export function usernameOrEmailToAuthEmail(identifier: string): {
  valid: boolean;
  authEmail: string;
  error?: string;
} {
  const trimmed = String(identifier || '').trim().toLowerCase();
  if (!trimmed) {
    return { valid: false, authEmail: '', error: 'Please enter your username or email.' };
  }
  if (trimmed.includes('@')) {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) && trimmed.length <= 160;
    if (!emailValid) {
      return { valid: false, authEmail: '', error: 'Please enter a valid username or email address.' };
    }
    return { valid: true, authEmail: trimmed };
  }
  const uCheck = validateUsername(trimmed);
  if (!uCheck.valid) {
    return { valid: false, authEmail: '', error: uCheck.error };
  }
  return { valid: true, authEmail: usernameToAuthEmail(trimmed) };
}

export function validateSignUpInput(input: SignUpInput): SignUpValidationResult {
  const normalizedUsername = normalizeUsername(input.username);
  const uCheck = validateUsername(normalizedUsername);
  if (!uCheck.valid) {
    return {
      valid: false,
      normalizedUsername,
      authEmail: '',
      displayName: '',
      studentClass: '',
      error: uCheck.error,
    };
  }

  const displayName = String(input.displayName || '').trim() || normalizedUsername;
  if (displayName.length < DISPLAY_NAME_MIN_LENGTH || displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return {
      valid: false,
      normalizedUsername,
      authEmail: '',
      displayName,
      studentClass: '',
      error: `Display name must be between ${DISPLAY_NAME_MIN_LENGTH} and ${DISPLAY_NAME_MAX_LENGTH} characters.`,
    };
  }

  const studentClass = String(input.studentClass || '').trim();
  if (studentClass.length > STUDENT_CLASS_MAX_LENGTH) {
    return {
      valid: false,
      normalizedUsername,
      authEmail: '',
      displayName,
      studentClass,
      error: `Class / group must be ${STUDENT_CLASS_MAX_LENGTH} characters or fewer.`,
    };
  }

  const password = String(input.password || '');
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      normalizedUsername,
      authEmail: '',
      displayName,
      studentClass,
      error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
    };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return {
      valid: false,
      normalizedUsername,
      authEmail: '',
      displayName,
      studentClass,
      error: `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer.`,
    };
  }
  if (password !== String(input.confirmPassword || '')) {
    return {
      valid: false,
      normalizedUsername,
      authEmail: '',
      displayName,
      studentClass,
      error: 'Passwords do not match.',
    };
  }

  return {
    valid: true,
    normalizedUsername,
    authEmail: usernameToAuthEmail(normalizedUsername),
    displayName,
    studentClass,
  };
}

export function validateSignInInput(input: SignInInput): SignInValidationResult {
  const idCheck = usernameOrEmailToAuthEmail(input.identifier);
  if (!idCheck.valid) {
    return {
      valid: false,
      authEmail: '',
      displayIdentifier: String(input.identifier || '').trim(),
      error: idCheck.error,
    };
  }
  const password = String(input.password || '');
  if (!password) {
    return {
      valid: false,
      authEmail: idCheck.authEmail,
      displayIdentifier: String(input.identifier || '').trim(),
      error: 'Please enter your password.',
    };
  }
  return {
    valid: true,
    authEmail: idCheck.authEmail,
    displayIdentifier: String(input.identifier || '').trim(),
  };
}

export function validateProfileUpdateInput(input: {
  displayName: string;
  studentClass: string;
}): ProfileUpdateValidationResult {
  const displayName = String(input.displayName || '').trim();
  if (displayName.length < DISPLAY_NAME_MIN_LENGTH || displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return {
      valid: false,
      displayName,
      studentClass: '',
      error: `Display name must be between ${DISPLAY_NAME_MIN_LENGTH} and ${DISPLAY_NAME_MAX_LENGTH} characters.`,
    };
  }
  const studentClass = String(input.studentClass || '').trim();
  if (studentClass.length > STUDENT_CLASS_MAX_LENGTH) {
    return {
      valid: false,
      displayName,
      studentClass,
      error: `Class / group must be ${STUDENT_CLASS_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { valid: true, displayName, studentClass };
}

/**
 * Recursively converts JS objects into Firestore-safe native Maps, Lists, and primitives.
 * Strips undefined values, functions, NaN/Infinity, and oversized inline data URLs (>40KB)
 * to stay comfortably inside Firestore's 1 MB document limit.
 */
export function sanitizeForFirestore(value: unknown, depth = 0): unknown {
  if (depth > 10) return null;
  if (value === null || value === undefined) return null;

  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    if (value.startsWith('data:') && value.length > MAX_SYNC_STRING_CHARS) {
      return '';
    }
    if (value.length > MAX_SYNC_STRING_CHARS) {
      return value.slice(0, MAX_SYNC_STRING_CHARS);
    }
    return value;
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (let i = 0; i < value.length && i < 200; i += 1) {
      const sanitizedItem = sanitizeForFirestore(value[i], depth + 1);
      // Firestore does not allow nested arrays directly inside arrays
      if (Array.isArray(sanitizedItem)) {
        out.push({ items: sanitizedItem });
      } else {
        out.push(sanitizedItem);
      }
    }
    return out;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined || typeof v === 'function' || typeof v === 'symbol') continue;
      if (!k || k.length > 120) continue;
      out[k] = sanitizeForFirestore(v, depth + 1);
    }
    return out;
  }
  return null;
}

export function collectLocalProgressModules(
  getItem: (key: string) => string | null
): Partial<Record<SyncModuleKey, unknown>> {
  const modules: Partial<Record<SyncModuleKey, unknown>> = {};
  for (const desc of SYNC_MODULE_DESCRIPTORS) {
    try {
      const raw = getItem(desc.storageKey);
      if (!raw) continue;
      const parsed: unknown = JSON.parse(raw);
      if (desc.expectArray) {
        if (Array.isArray(parsed)) {
          const sanitizedList = parsed
            .slice(0, MAX_CUSTOM_PAPERS)
            .map((entry) => sanitizeForFirestore(entry, 1))
            .filter((entry) => entry !== null && typeof entry === 'object' && !Array.isArray(entry));
          if (sanitizedList.length > 0) {
            modules[desc.key] = sanitizedList;
          }
        }
      } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const sanitizedMap = sanitizeForFirestore(parsed, 1);
        if (sanitizedMap && typeof sanitizedMap === 'object' && !Array.isArray(sanitizedMap)) {
          if (Object.keys(sanitizedMap as Record<string, unknown>).length > 0) {
            modules[desc.key] = sanitizedMap;
          }
        }
      }
    } catch {
      // Ignore corrupt local entry so valid modules still sync
    }
  }
  return modules;
}

/**
 * Merges cloud progress with local progress on sign-in.
 * Cloud data takes precedence for modules already synced on the account,
 * while local-only modules (e.g. practice completed just before signing up) are preserved.
 */
export function mergeCloudAndLocalModules(
  localModules: Partial<Record<SyncModuleKey, unknown>>,
  cloudModules: Partial<Record<SyncModuleKey, unknown>> | null | undefined
): Partial<Record<SyncModuleKey, unknown>> {
  const merged: Partial<Record<SyncModuleKey, unknown>> = {};
  const cloud = cloudModules || {};

  for (const desc of SYNC_MODULE_DESCRIPTORS) {
    const cloudVal = cloud[desc.key];
    const localVal = localModules[desc.key];
    if (cloudVal !== undefined && cloudVal !== null) {
      merged[desc.key] = cloudVal;
    } else if (localVal !== undefined && localVal !== null) {
      merged[desc.key] = localVal;
    }
  }
  return merged;
}

export function countSyncedModules(
  modules: Partial<Record<SyncModuleKey, unknown>> | null | undefined
): number {
  if (!modules) return 0;
  return SYNC_MODULE_DESCRIPTORS.filter((desc) => {
    const val = modules[desc.key];
    if (Array.isArray(val)) return val.length > 0;
    if (val && typeof val === 'object') return Object.keys(val as Record<string, unknown>).length > 0;
    return false;
  }).length;
}

export function mapFirebaseAuthError(
  code: string | undefined,
  mode: 'signin' | 'signup' | 'google'
): MappedAuthError {
  switch (code) {
    case 'auth/operation-not-allowed':
      return {
        message:
          'Username & Password sign-in needs Email/Password enabled once in your Firebase Console.',
        needsConsoleEmailPasswordEnable: true,
      };
    case 'auth/email-already-in-use':
      return {
        message: 'That username is already registered. Choose a different username or sign in instead.',
      };
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return {
        message: 'Incorrect username or password. Please check your details and try again.',
      };
    case 'auth/weak-password':
      return {
        message: 'Password is too weak. Please use at least 8 characters.',
      };
    case 'auth/too-many-requests':
      return {
        message: 'Too many failed attempts. Please wait a minute and try again.',
      };
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return {
        message: 'Google sign-in popup was closed before completing. Click the button again to retry.',
      };
    case 'auth/popup-blocked':
      return {
        message: 'Your browser blocked the Google sign-in popup. Please allow popups and try again.',
      };
    case 'auth/network-request-failed':
      return {
        message: 'Network error while contacting Firebase. Check your connection and try again.',
      };
    default:
      if (mode === 'google') {
        return { message: 'Could not complete Google sign-in. Please try again.' };
      }
      if (mode === 'signup') {
        return { message: 'Could not create your account right now. Please check your inputs and retry.' };
      }
      return { message: 'Sign-in failed. Please check your username and password and try again.' };
  }
}
