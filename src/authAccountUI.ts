import {
  SYNC_MODULE_DESCRIPTORS,
  collectLocalProgressModules,
  countSyncedModules,
  mapFirebaseAuthError,
  mergeCloudAndLocalModules,
  validateProfileUpdateInput,
  validateSignInInput,
  validateSignUpInput,
  type SyncModuleKey,
} from './authSyncEngine';
import {
  FIREBASE_AUTH_PROVIDERS_URL,
  ensureUserProfile,
  fetchProgressSnapshot,
  loginUsernamePasswordAccount,
  loginWithGooglePopup,
  logoutAccount,
  registerUsernamePasswordAccount,
  saveProgressSnapshot,
  subscribeAuthChanges,
  updateStudentAccountProfile,
  type StudentAccountProfile,
} from './firebaseClient';

export type AuthModalMode = 'signin' | 'signup' | 'account';

export interface AuthUIHooks {
  onShowToast?: (message: string, type?: string) => void;
  onProfileApplied?: (profile: StudentAccountProfile | null) => void;
  onCloudProgressRestored?: () => void;
}

interface AuthUIState {
  initialized: boolean;
  isOpen: boolean;
  mode: AuthModalMode;
  loadingAuthState: boolean;
  busy: boolean;
  showPassword: boolean;
  errorMsg: string;
  needsEmailPasswordEnable: boolean;
  statusMsg: string;
  userUid: string | null;
  profile: StudentAccountProfile | null;
  syncedModulesCount: number;
  lastSyncedAt: number | null;
  syncState: 'idle' | 'syncing' | 'synced' | 'error';
  // Controlled form drafts so re-renders preserve typed values
  signInIdentifier: string;
  signInPassword: string;
  signUpUsername: string;
  signUpDisplayName: string;
  signUpClass: string;
  signUpPassword: string;
  signUpConfirm: string;
  editDisplayName: string;
  editStudentClass: string;
}

const uiState: AuthUIState = {
  initialized: false,
  isOpen: false,
  mode: 'signin',
  loadingAuthState: true,
  busy: false,
  showPassword: false,
  errorMsg: '',
  needsEmailPasswordEnable: false,
  statusMsg: '',
  userUid: null,
  profile: null,
  syncedModulesCount: 0,
  lastSyncedAt: null,
  syncState: 'idle',
  signInIdentifier: '',
  signInPassword: '',
  signUpUsername: '',
  signUpDisplayName: '',
  signUpClass: '',
  signUpPassword: '',
  signUpConfirm: '',
  editDisplayName: '',
  editStudentClass: '',
};

let modalContainer: HTMLElement | null = null;
let hooks: AuthUIHooks = {};
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let suppressStorageIntercept = false;
let storageHookInstalled = false;

const SYNC_STORAGE_KEYS = new Set(SYNC_MODULE_DESCRIPTORS.map((d) => d.storageKey));

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatSyncTime(ms: number | null): string {
  if (!ms) return 'Not synced yet';
  try {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Just now';
  }
}

function installLocalStorageSyncHook(): void {
  if (storageHookInstalled || typeof window === 'undefined' || !window.Storage) return;
  storageHookInstalled = true;
  try {
    const originalSetItem = window.Storage.prototype.setItem;
    window.Storage.prototype.setItem = function patchedSetItem(key: string, value: string): void {
      originalSetItem.call(this, key, value);
      if (this === window.localStorage && !suppressStorageIntercept && SYNC_STORAGE_KEYS.has(key)) {
        scheduleCloudSync();
      }
    };
  } catch {
    // Fallback: explicit scheduleCloudSync() calls still trigger sync
  }
}

function writeMergedModulesToLocalStorage(
  modules: Partial<Record<SyncModuleKey, unknown>>
): void {
  suppressStorageIntercept = true;
  try {
    for (const desc of SYNC_MODULE_DESCRIPTORS) {
      const value = modules[desc.key];
      if (value !== undefined && value !== null) {
        try {
          window.localStorage.setItem(desc.storageKey, JSON.stringify(value));
        } catch {
          // Ignore quota errors on individual browser keys
        }
      }
    }
  } finally {
    suppressStorageIntercept = false;
  }
}

function readLocalModules(): Partial<Record<SyncModuleKey, unknown>> {
  return collectLocalProgressModules((k) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  });
}

async function hydrateCloudProgressForSignedInUser(uid: string): Promise<void> {
  uiState.syncState = 'syncing';
  updateHostSurfaces();

  try {
    const localModules = readLocalModules();
    const cloudDoc = await fetchProgressSnapshot(uid);
    const merged = mergeCloudAndLocalModules(localModules, cloudDoc?.modules);
    const mergedCount = countSyncedModules(merged);

    if (cloudDoc && countSyncedModules(cloudDoc.modules) > 0) {
      writeMergedModulesToLocalStorage(merged);
      hooks.onCloudProgressRestored?.();
    }

    // If we have local-only progress not yet in cloud (or no cloud snapshot yet), push merged snapshot
    const cloudCount = countSyncedModules(cloudDoc?.modules);
    if (!cloudDoc || mergedCount > cloudCount) {
      await saveProgressSnapshot(uid, merged);
    }

    uiState.syncedModulesCount = mergedCount;
    uiState.lastSyncedAt = cloudDoc?.updatedAtMs || Date.now();
    uiState.syncState = 'synced';
  } catch (err) {
    console.warn('Cloud progress hydration warning:', err);
    uiState.syncState = 'error';
  }

  updateHostSurfaces();
  if (uiState.isOpen) renderModal();
}

export async function syncLocalProgressNow(showFeedback = false): Promise<void> {
  if (!uiState.userUid) return;
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
  uiState.syncState = 'syncing';
  updateHostSurfaces();
  if (uiState.isOpen) renderModal();

  try {
    const localModules = readLocalModules();
    await saveProgressSnapshot(uiState.userUid, localModules);
    uiState.syncedModulesCount = countSyncedModules(localModules);
    uiState.lastSyncedAt = Date.now();
    uiState.syncState = 'synced';
    if (showFeedback) {
      uiState.statusMsg = 'All revision progress synced to your cloud account.';
      hooks.onShowToast?.('Progress synced to your account!', 'success');
    }
  } catch (err) {
    console.warn('Cloud sync failed:', err);
    uiState.syncState = 'error';
    if (showFeedback) {
      uiState.errorMsg = 'Cloud sync failed. Check your connection and try again.';
    }
  }

  updateHostSurfaces();
  if (uiState.isOpen) renderModal();
}

export function scheduleCloudSync(): void {
  if (!uiState.userUid) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void syncLocalProgressNow(false);
  }, 2200);
}

function updateHostSurfaces(): void {
  // 1. Update top navbar account button
  const navBtn = document.getElementById('nav-auth-btn');
  const navLabel = document.getElementById('nav-auth-label');
  const navIcon = document.getElementById('nav-auth-icon');

  if (navBtn && navLabel) {
    if (uiState.profile) {
      navLabel.textContent = `@${uiState.profile.username}`;
      navBtn.setAttribute('aria-label', `Signed in as ${uiState.profile.displayName}. Open My Account.`);
      navBtn.className =
        'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-1.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400';
      if (navIcon) navIcon.className = 'fa-solid fa-user-check text-emerald-100';
    } else {
      navLabel.textContent = 'Sign In';
      navBtn.setAttribute('aria-label', 'Sign in or create a student account');
      navBtn.className =
        'bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center space-x-1.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400';
      if (navIcon) navIcon.className = 'fa-solid fa-right-to-bracket text-indigo-100';
    }
  }

  // 2. Update Home screen Account & Cloud Sync bar inside the profile card
  const homeStrip = document.getElementById('home-auth-strip');
  if (homeStrip) {
    if (uiState.profile) {
      const syncText =
        uiState.syncState === 'syncing'
          ? 'Saving progress…'
          : uiState.syncState === 'error'
            ? 'Save paused · Tap to retry'
            : 'Progress saved online';
      homeStrip.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3.5 mt-1 border-t border-slate-100">
          <div class="flex items-center gap-2 text-xs text-slate-700 min-w-0">
            <i class="fa-solid fa-cloud-arrow-up text-emerald-600 shrink-0" aria-hidden="true"></i>
            <span class="font-semibold text-slate-900 truncate">@${esc(uiState.profile.username)}</span>
            <span aria-hidden="true" class="text-slate-300">·</span>
            <span class="text-slate-600 truncate">${esc(syncText)}</span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" onclick="openAuthAccountModal('account')" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              My Account
            </button>
          </div>
        </div>
      `;
    } else {
      homeStrip.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3.5 mt-1 border-t border-slate-100">
          <p class="text-xs text-slate-600 leading-snug">
            Save your scores across devices with a free account.
          </p>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" onclick="openAuthAccountModal('signin')" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              Sign In
            </button>
            <button type="button" onclick="openAuthAccountModal('signup')" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              Sign Up
            </button>
          </div>
        </div>
      `;
    }
  }
}

function renderConsoleEnableBanner(): string {
  if (!uiState.needsEmailPasswordEnable) return '';
  return `
    <div class="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2">
      <div class="font-bold flex items-center gap-1.5">
        <i class="fa-solid fa-sliders text-amber-700" aria-hidden="true"></i>
        <span>One-Time Firebase Console Step Required</span>
      </div>
      <p class="leading-relaxed">
        Google Sign-In works immediately, while Username &amp; Password requires turning on the <strong>Email/Password</strong> provider once in Firebase Console:
      </p>
      <ol class="list-decimal list-inside space-y-0.5 text-[11px] leading-relaxed">
        <li>Open <a href="${esc(FIREBASE_AUTH_PROVIDERS_URL)}" target="_blank" rel="noopener noreferrer" class="font-bold underline text-amber-900 hover:text-indigo-700">Firebase Authentication Sign-In Providers</a></li>
        <li>Click <strong>Add new provider</strong> → choose <strong>Email/Password</strong></li>
        <li>Switch <strong>Enable</strong> ON and click <strong>Save</strong>, then retry here</li>
      </ol>
    </div>
  `;
}

function renderSignedOutBody(): string {
  const isSignIn = uiState.mode !== 'signup';
  const inputType = uiState.showPassword ? 'text' : 'password';

  return `
    <div class="space-y-4">
      <!-- Mode Toggle -->
      <div class="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200" role="tablist" aria-label="Account mode">
        <button type="button" role="tab" aria-selected="${isSignIn ? 'true' : 'false'}" data-auth-action="switch-mode" data-mode="signin"
          class="py-2 px-3 text-xs font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            isSignIn ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }">
          Sign In
        </button>
        <button type="button" role="tab" aria-selected="${!isSignIn ? 'true' : 'false'}" data-auth-action="switch-mode" data-mode="signup"
          class="py-2 px-3 text-xs font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            !isSignIn ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }">
          Create Account
        </button>
      </div>

      ${
        uiState.errorMsg
          ? `<div role="alert" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium leading-relaxed flex items-start gap-2">
              <i class="fa-solid fa-circle-exclamation text-rose-600 mt-0.5 shrink-0" aria-hidden="true"></i>
              <span>${esc(uiState.errorMsg)}</span>
            </div>`
          : ''
      }

      ${renderConsoleEnableBanner()}

      ${
        isSignIn
          ? `
        <form data-auth-form="signin" class="space-y-3.5" novalidate>
          <div>
            <label for="auth-signin-identifier" class="block text-xs font-semibold text-slate-700 mb-1">Username (or Email)</label>
            <input id="auth-signin-identifier" name="identifier" type="text" autocomplete="username" required maxlength="160"
              value="${esc(uiState.signInIdentifier)}"
              placeholder="e.g. alex_11b"
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900" />
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <label for="auth-signin-password" class="block text-xs font-semibold text-slate-700">Password</label>
              <button type="button" data-auth-action="toggle-password" class="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800">
                ${uiState.showPassword ? 'Hide password' : 'Show password'}
              </button>
            </div>
            <input id="auth-signin-password" name="password" type="${inputType}" autocomplete="current-password" required maxlength="128"
              value="${esc(uiState.signInPassword)}"
              placeholder="Enter your password"
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900" />
          </div>
          <button type="submit" ${uiState.busy ? 'disabled' : ''}
            class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            ${uiState.busy ? 'Signing in…' : 'Sign In with Username'}
          </button>
        </form>
      `
          : `
        <form data-auth-form="signup" class="space-y-3" novalidate>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="auth-signup-username" class="block text-xs font-semibold text-slate-700 mb-1">Username</label>
              <input id="auth-signup-username" name="username" type="text" autocomplete="username" required minlength="3" maxlength="32"
                value="${esc(uiState.signUpUsername)}"
                placeholder="e.g. alex_11b"
                class="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900" />
              <p class="text-[11px] text-slate-500 mt-1">3–32 chars (letters, numbers, . _ -)</p>
            </div>
            <div>
              <label for="auth-signup-displayname" class="block text-xs font-semibold text-slate-700 mb-1">Display Name</label>
              <input id="auth-signup-displayname" name="displayName" type="text" autocomplete="name" required maxlength="80"
                value="${esc(uiState.signUpDisplayName)}"
                placeholder="e.g. Alex Taylor"
                class="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900" />
            </div>
          </div>

          <div>
            <label for="auth-signup-class" class="block text-xs font-semibold text-slate-700 mb-1">Class / Form Group <span class="font-normal text-slate-400">(optional)</span></label>
            <input id="auth-signup-class" name="studentClass" type="text" maxlength="60"
              value="${esc(uiState.signUpClass)}"
              placeholder="e.g. Year 11 IT — Group B"
              class="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label for="auth-signup-password" class="block text-xs font-semibold text-slate-700">Password</label>
                <button type="button" data-auth-action="toggle-password" class="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800">
                  ${uiState.showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input id="auth-signup-password" name="password" type="${inputType}" autocomplete="new-password" required minlength="8" maxlength="128"
                value="${esc(uiState.signUpPassword)}"
                placeholder="Min 8 characters"
                class="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900" />
            </div>
            <div>
              <label for="auth-signup-confirm" class="block text-xs font-semibold text-slate-700 mb-1">Confirm Password</label>
              <input id="auth-signup-confirm" name="confirmPassword" type="${inputType}" autocomplete="new-password" required minlength="8" maxlength="128"
                value="${esc(uiState.signUpConfirm)}"
                placeholder="Re-enter password"
                class="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900" />
            </div>
          </div>

          <button type="submit" ${uiState.busy ? 'disabled' : ''}
            class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            ${uiState.busy ? 'Creating account…' : 'Create Student Account'}
          </button>
        </form>
      `
      }

      <div class="relative flex items-center py-1">
        <div class="flex-grow border-t border-slate-200"></div>
        <span class="mx-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">or</span>
        <div class="flex-grow border-t border-slate-200"></div>
      </div>

      <button type="button" data-auth-action="google-signin" ${uiState.busy ? 'disabled' : ''}
        class="w-full py-2.5 px-4 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-800 text-sm font-semibold rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
        <i class="fa-brands fa-google text-indigo-600" aria-hidden="true"></i>
        <span>Continue with Google</span>
      </button>

      <p class="text-[11px] text-slate-500 text-center leading-relaxed">
        You can also continue without signing in — local progress stays saved in this browser.
      </p>
    </div>
  `;
}

function renderSignedInBody(): string {
  const profile = uiState.profile;
  if (!profile) return renderSignedOutBody();

  const providerLabel = profile.authProvider === 'google' ? 'Google Account' : 'Username & Password';
  const syncStatusLabel =
    uiState.syncState === 'syncing'
      ? 'Syncing…'
      : uiState.syncState === 'error'
        ? 'Sync paused — click Sync Now'
        : `Last synced at ${formatSyncTime(uiState.lastSyncedAt)}`;

  return `
    <div class="space-y-4">
      <div class="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2.5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-sm font-bold text-slate-900 truncate">${esc(profile.displayName)}</div>
            <div class="text-xs text-slate-600 font-medium">@${esc(profile.username)} · ${esc(providerLabel)}</div>
          </div>
          <span class="text-xs font-semibold text-emerald-700 shrink-0">Signed In</span>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-xs text-slate-600">
          <span class="tabular-nums"><strong>${uiState.syncedModulesCount} / ${SYNC_MODULE_DESCRIPTORS.length}</strong> modules synced to cloud</span>
          <span>${esc(syncStatusLabel)}</span>
        </div>
      </div>

      ${
        uiState.errorMsg
          ? `<div role="alert" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium">${esc(uiState.errorMsg)}</div>`
          : ''
      }
      ${
        uiState.statusMsg
          ? `<div role="status" class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">${esc(uiState.statusMsg)}</div>`
          : ''
      }

      <form data-auth-form="profile" class="space-y-3" novalidate>
        <div>
          <label for="auth-edit-displayname" class="block text-xs font-semibold text-slate-700 mb-1">Display Name</label>
          <input id="auth-edit-displayname" name="displayName" type="text" required maxlength="80"
            value="${esc(uiState.editDisplayName)}"
            class="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900" />
        </div>
        <div>
          <label for="auth-edit-class" class="block text-xs font-semibold text-slate-700 mb-1">Class / Form Group</label>
          <input id="auth-edit-class" name="studentClass" type="text" maxlength="60"
            value="${esc(uiState.editStudentClass)}"
            placeholder="e.g. Year 11 IT"
            class="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900" />
        </div>
        <div class="flex flex-wrap items-center gap-2 pt-1">
          <button type="submit" ${uiState.busy ? 'disabled' : ''}
            class="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            ${uiState.busy ? 'Saving…' : 'Save Profile'}
          </button>
          <button type="button" data-auth-action="sync-now" ${uiState.busy || uiState.syncState === 'syncing' ? 'disabled' : ''}
            class="py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 disabled:opacity-60 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            <i class="fa-solid fa-rotate text-[11px]" aria-hidden="true"></i>
            <span>Sync Now</span>
          </button>
        </div>
      </form>

      <div class="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
        <span class="text-[11px] text-slate-500">Changes sync automatically while signed in.</span>
        <button type="button" data-auth-action="signout" ${uiState.busy ? 'disabled' : ''}
          class="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">
          Sign Out
        </button>
      </div>
    </div>
  `;
}

function renderModal(): void {
  if (!modalContainer) return;
  if (!uiState.isOpen) {
    modalContainer.innerHTML = '';
    return;
  }

  const title = uiState.profile
    ? 'Student Account & Cloud Sync'
    : uiState.mode === 'signup'
      ? 'Create Student Account'
      : 'Student Sign In';
  const subtitle = uiState.profile
    ? 'Your exam scores, flashcards, streaks, and studio progress sync automatically.'
    : 'Sign in with a username & password or Google to sync your OCR R050 progress across devices.';

  modalContainer.innerHTML = `
    <div data-auth-action="backdrop-close" class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="auth-modal-heading">
      <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden my-auto" data-auth-card="true">
        <div class="px-5 py-4 bg-slate-900 text-white flex items-start justify-between gap-3">
          <div class="space-y-0.5">
            <h2 id="auth-modal-heading" class="text-base font-bold tracking-tight">${esc(title)}</h2>
            <p class="text-xs text-slate-300 leading-relaxed">${esc(subtitle)}</p>
          </div>
          <button type="button" data-auth-action="close" aria-label="Close account dialog"
            class="text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
            <i class="fa-solid fa-xmark text-sm" aria-hidden="true"></i>
          </button>
        </div>
        <div class="p-5 sm:p-6">
          ${uiState.profile ? renderSignedInBody() : renderSignedOutBody()}
        </div>
      </div>
    </div>
  `;
}

async function handleSignInSubmit(form: HTMLFormElement): Promise<void> {
  const fd = new FormData(form);
  const identifier = String(fd.get('identifier') || '');
  const password = String(fd.get('password') || '');
  uiState.signInIdentifier = identifier;
  uiState.signInPassword = password;
  uiState.errorMsg = '';
  uiState.needsEmailPasswordEnable = false;
  uiState.statusMsg = '';

  const check = validateSignInInput({ identifier, password });
  if (!check.valid) {
    uiState.errorMsg = check.error || 'Please check your login details.';
    renderModal();
    return;
  }

  uiState.busy = true;
  renderModal();

  try {
    const { user, profile } = await loginUsernamePasswordAccount({
      authEmail: check.authEmail,
      password,
    });
    uiState.userUid = user.uid;
    uiState.profile = profile;
    uiState.editDisplayName = profile.displayName;
    uiState.editStudentClass = profile.studentClass;
    uiState.signInPassword = '';
    uiState.mode = 'account';
    hooks.onProfileApplied?.(profile);
    await hydrateCloudProgressForSignedInUser(user.uid);
    hooks.onShowToast?.(`Welcome back, ${profile.displayName}!`, 'success');
    uiState.isOpen = false;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const mapped = mapFirebaseAuthError(code, 'signin');
    uiState.errorMsg = mapped.message;
    uiState.needsEmailPasswordEnable = Boolean(mapped.needsConsoleEmailPasswordEnable);
  } finally {
    uiState.busy = false;
    updateHostSurfaces();
    renderModal();
  }
}

async function handleSignUpSubmit(form: HTMLFormElement): Promise<void> {
  const fd = new FormData(form);
  const username = String(fd.get('username') || '');
  const displayName = String(fd.get('displayName') || '');
  const studentClass = String(fd.get('studentClass') || '');
  const password = String(fd.get('password') || '');
  const confirmPassword = String(fd.get('confirmPassword') || '');

  uiState.signUpUsername = username;
  uiState.signUpDisplayName = displayName;
  uiState.signUpClass = studentClass;
  uiState.signUpPassword = password;
  uiState.signUpConfirm = confirmPassword;
  uiState.errorMsg = '';
  uiState.needsEmailPasswordEnable = false;
  uiState.statusMsg = '';

  const check = validateSignUpInput({
    username,
    displayName,
    studentClass,
    password,
    confirmPassword,
  });
  if (!check.valid) {
    uiState.errorMsg = check.error || 'Please check your registration details.';
    renderModal();
    return;
  }

  uiState.busy = true;
  renderModal();

  try {
    const { user, profile } = await registerUsernamePasswordAccount({
      authEmail: check.authEmail,
      username: check.normalizedUsername,
      displayName: check.displayName,
      studentClass: check.studentClass,
      password,
    });
    uiState.userUid = user.uid;
    uiState.profile = profile;
    uiState.editDisplayName = profile.displayName;
    uiState.editStudentClass = profile.studentClass;
    uiState.signUpPassword = '';
    uiState.signUpConfirm = '';
    uiState.mode = 'account';
    hooks.onProfileApplied?.(profile);
    await hydrateCloudProgressForSignedInUser(user.uid);
    hooks.onShowToast?.(`Account @${profile.username} created and synced!`, 'success');
    uiState.isOpen = false;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const mapped = mapFirebaseAuthError(code, 'signup');
    uiState.errorMsg = mapped.message;
    uiState.needsEmailPasswordEnable = Boolean(mapped.needsConsoleEmailPasswordEnable);
  } finally {
    uiState.busy = false;
    updateHostSurfaces();
    renderModal();
  }
}

async function handleGoogleSignIn(): Promise<void> {
  uiState.errorMsg = '';
  uiState.needsEmailPasswordEnable = false;
  uiState.statusMsg = '';
  uiState.busy = true;
  renderModal();

  try {
    const { user, profile } = await loginWithGooglePopup();
    uiState.userUid = user.uid;
    uiState.profile = profile;
    uiState.editDisplayName = profile.displayName;
    uiState.editStudentClass = profile.studentClass;
    uiState.mode = 'account';
    hooks.onProfileApplied?.(profile);
    await hydrateCloudProgressForSignedInUser(user.uid);
    hooks.onShowToast?.(`Signed in as ${profile.displayName}!`, 'success');
    uiState.isOpen = false;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const mapped = mapFirebaseAuthError(code, 'google');
    uiState.errorMsg = mapped.message;
  } finally {
    uiState.busy = false;
    updateHostSurfaces();
    renderModal();
  }
}

async function handleProfileUpdate(form: HTMLFormElement): Promise<void> {
  if (!uiState.userUid || !uiState.profile) return;
  const fd = new FormData(form);
  const displayName = String(fd.get('displayName') || '');
  const studentClass = String(fd.get('studentClass') || '');
  uiState.editDisplayName = displayName;
  uiState.editStudentClass = studentClass;
  uiState.errorMsg = '';
  uiState.statusMsg = '';

  const check = validateProfileUpdateInput({ displayName, studentClass });
  if (!check.valid) {
    uiState.errorMsg = check.error || 'Please check your profile inputs.';
    renderModal();
    return;
  }

  uiState.busy = true;
  renderModal();

  try {
    await updateStudentAccountProfile(uiState.userUid, {
      displayName: check.displayName,
      studentClass: check.studentClass,
    });
    uiState.profile = {
      ...uiState.profile,
      displayName: check.displayName,
      studentClass: check.studentClass,
    };
    uiState.editDisplayName = check.displayName;
    uiState.editStudentClass = check.studentClass;
    uiState.statusMsg = 'Profile updated.';
    hooks.onProfileApplied?.(uiState.profile);
    hooks.onShowToast?.('Student profile updated!', 'success');
  } catch (err) {
    console.warn('Profile update failed:', err);
    uiState.errorMsg = 'Could not update your profile right now. Please try again.';
  } finally {
    uiState.busy = false;
    updateHostSurfaces();
    renderModal();
  }
}

async function handleSignOut(): Promise<void> {
  uiState.busy = true;
  uiState.errorMsg = '';
  uiState.statusMsg = '';
  renderModal();

  try {
    await syncLocalProgressNow(false);
    await logoutAccount();
    uiState.userUid = null;
    uiState.profile = null;
    uiState.syncState = 'idle';
    uiState.syncedModulesCount = 0;
    uiState.lastSyncedAt = null;
    uiState.mode = 'signin';
    uiState.isOpen = false;
    hooks.onProfileApplied?.(null);
    hooks.onShowToast?.('Signed out. Local browser progress remains available.', 'info');
  } catch (err) {
    console.warn('Sign out failed:', err);
    uiState.errorMsg = 'Could not sign out right now. Please retry.';
  } finally {
    uiState.busy = false;
    updateHostSurfaces();
    renderModal();
  }
}

function attachModalListeners(container: HTMLElement): void {
  container.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const actionEl = target.closest<HTMLElement>('[data-auth-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.authAction;

    if (action === 'backdrop-close') {
      if (target === actionEl) {
        closeAuthModal();
      }
      return;
    }

    if (action === 'close') {
      closeAuthModal();
    } else if (action === 'switch-mode') {
      const nextMode = (actionEl.dataset.mode as AuthModalMode) || 'signin';
      uiState.mode = nextMode;
      uiState.errorMsg = '';
      uiState.needsEmailPasswordEnable = false;
      uiState.statusMsg = '';
      renderModal();
    } else if (action === 'toggle-password') {
      uiState.showPassword = !uiState.showPassword;
      renderModal();
    } else if (action === 'google-signin') {
      void handleGoogleSignIn();
    } else if (action === 'sync-now') {
      void syncLocalProgressNow(true);
    } else if (action === 'signout') {
      void handleSignOut();
    }
  });

  container.addEventListener('input', (event) => {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;
    if (input.id === 'auth-signin-identifier') uiState.signInIdentifier = input.value;
    else if (input.id === 'auth-signin-password') uiState.signInPassword = input.value;
    else if (input.id === 'auth-signup-username') uiState.signUpUsername = input.value;
    else if (input.id === 'auth-signup-displayname') uiState.signUpDisplayName = input.value;
    else if (input.id === 'auth-signup-class') uiState.signUpClass = input.value;
    else if (input.id === 'auth-signup-password') uiState.signUpPassword = input.value;
    else if (input.id === 'auth-signup-confirm') uiState.signUpConfirm = input.value;
    else if (input.id === 'auth-edit-displayname') uiState.editDisplayName = input.value;
    else if (input.id === 'auth-edit-class') uiState.editStudentClass = input.value;
  });

  container.addEventListener('submit', (event) => {
    const form = (event.target as HTMLElement | null)?.closest<HTMLFormElement>('[data-auth-form]');
    if (!form) return;
    event.preventDefault();
    const formType = form.dataset.authForm;
    if (formType === 'signin') void handleSignInSubmit(form);
    else if (formType === 'signup') void handleSignUpSubmit(form);
    else if (formType === 'profile') void handleProfileUpdate(form);
  });
}

export function openAuthModal(mode: AuthModalMode = 'signin'): void {
  uiState.isOpen = true;
  uiState.mode = uiState.profile ? 'account' : mode;
  uiState.errorMsg = '';
  uiState.needsEmailPasswordEnable = false;
  uiState.statusMsg = '';
  renderModal();
}

export function closeAuthModal(): void {
  uiState.isOpen = false;
  renderModal();
}

export function getAuthSnapshot(): {
  signedIn: boolean;
  profile: StudentAccountProfile | null;
  syncedModulesCount: number;
  syncState: string;
} {
  return {
    signedIn: Boolean(uiState.profile),
    profile: uiState.profile,
    syncedModulesCount: uiState.syncedModulesCount,
    syncState: uiState.syncState,
  };
}

export function initAuthAccountSystem(
  container: HTMLElement | null,
  options: AuthUIHooks = {}
): void {
  hooks = options;
  if (!container || uiState.initialized) {
    updateHostSurfaces();
    return;
  }

  modalContainer = container;
  uiState.initialized = true;
  installLocalStorageSyncHook();
  attachModalListeners(container);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && uiState.isOpen) {
      closeAuthModal();
    }
  });

  updateHostSurfaces();

  subscribeAuthChanges((user) => {
    uiState.loadingAuthState = false;
    if (!user) {
      uiState.userUid = null;
      uiState.profile = null;
      uiState.syncState = 'idle';
      uiState.syncedModulesCount = 0;
      uiState.lastSyncedAt = null;
      updateHostSurfaces();
      if (uiState.isOpen) renderModal();
      return;
    }

    if (uiState.userUid === user.uid && uiState.profile) {
      updateHostSurfaces();
      return;
    }

    uiState.userUid = user.uid;
    void (async () => {
      try {
        const profile = await ensureUserProfile(user);
        uiState.profile = profile;
        uiState.editDisplayName = profile.displayName;
        uiState.editStudentClass = profile.studentClass;
        hooks.onProfileApplied?.(profile);
        await hydrateCloudProgressForSignedInUser(user.uid);
      } catch (err) {
        console.warn('Auth state profile hydration failed:', err);
      } finally {
        updateHostSurfaces();
        if (uiState.isOpen) renderModal();
      }
    })();
  });
}
