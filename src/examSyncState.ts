export type QuestionNavVisualState =
  | 'unanswered'
  | 'saved-local'
  | 'flagged'
  | 'submitted-full'
  | 'submitted-partial'
  | 'submitted-wrong';

export interface QuestionNavStateInput {
  isAnswered: boolean;
  isFlagged: boolean;
  isChecked: boolean;
  isPaperSubmitted: boolean;
  score: number;
  maxMarks: number;
}

export interface QuestionNavStateMeta {
  status: QuestionNavVisualState;
  statusLabel: string;
  ariaStatus: string;
  isSubmitted: boolean;
  isSavedLocally: boolean;
}

export function classifyExamQuestionNavState(
  input: QuestionNavStateInput
): QuestionNavStateMeta {
  const isSubmitted = Boolean(input.isPaperSubmitted || input.isChecked);

  if (isSubmitted) {
    if (input.score >= input.maxMarks && input.maxMarks > 0) {
      return {
        status: 'submitted-full',
        statusLabel: 'Submitted',
        ariaStatus: `Submitted (${input.score}/${input.maxMarks} marks)`,
        isSubmitted: true,
        isSavedLocally: false,
      };
    }
    if (input.score > 0) {
      return {
        status: 'submitted-partial',
        statusLabel: 'Submitted',
        ariaStatus: `Submitted (${input.score}/${input.maxMarks} marks)`,
        isSubmitted: true,
        isSavedLocally: false,
      };
    }
    return {
      status: 'submitted-wrong',
      statusLabel: 'Submitted',
      ariaStatus: `Submitted (${input.score}/${input.maxMarks} marks)`,
      isSubmitted: true,
      isSavedLocally: false,
    };
  }

  if (input.isFlagged) {
    return {
      status: 'flagged',
      statusLabel: input.isAnswered ? 'Saved & Flagged' : 'Flagged',
      ariaStatus: input.isAnswered
        ? 'Saved locally and flagged for review'
        : 'Flagged for review',
      isSubmitted: false,
      isSavedLocally: input.isAnswered,
    };
  }

  if (input.isAnswered) {
    return {
      status: 'saved-local',
      statusLabel: 'Saved locally',
      ariaStatus: 'Saved locally, not yet submitted',
      isSubmitted: false,
      isSavedLocally: true,
    };
  }

  return {
    status: 'unanswered',
    statusLabel: 'Unanswered',
    ariaStatus: 'Not answered yet',
    isSubmitted: false,
    isSavedLocally: false,
  };
}

export interface NavbarSyncStatusInput {
  isSignedIn: boolean;
  syncState: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt: number | null;
  username?: string | null;
}

export interface NavbarSyncStatusView {
  stateKey: 'local-only' | 'syncing' | 'synced' | 'error';
  shortLabel: string;
  titleTooltip: string;
  iconClass: string;
  badgeClasses: string;
}

export function getNavbarSyncStatusView(
  input: NavbarSyncStatusInput
): NavbarSyncStatusView {
  if (!input.isSignedIn) {
    return {
      stateKey: 'local-only',
      shortLabel: 'Saved locally',
      titleTooltip: 'Progress is saved on this browser. Sign in to sync across devices.',
      iconClass: 'fa-solid fa-hard-drive text-amber-300',
      badgeClasses: 'bg-slate-800/90 hover:bg-slate-700 text-amber-200 border-slate-700',
    };
  }

  if (input.syncState === 'syncing') {
    return {
      stateKey: 'syncing',
      shortLabel: 'Syncing…',
      titleTooltip: 'Saving your latest exam progress to the cloud…',
      iconClass: 'fa-solid fa-arrows-rotate fa-spin text-sky-300',
      badgeClasses: 'bg-slate-800/90 hover:bg-slate-700 text-sky-200 border-sky-500/40',
    };
  }

  if (input.syncState === 'error') {
    return {
      stateKey: 'error',
      shortLabel: 'Sync paused',
      titleTooltip: 'Saved locally, but cloud sync paused. Click to retry sync.',
      iconClass: 'fa-solid fa-triangle-exclamation text-rose-300',
      badgeClasses: 'bg-rose-950/70 hover:bg-rose-900/70 text-rose-200 border-rose-500/40',
    };
  }

  const timeNote = input.lastSyncedAt
    ? ` at ${new Date(input.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : '';
  const who = input.username ? ` as @${input.username}` : '';

  return {
    stateKey: 'synced',
    shortLabel: 'Synced',
    titleTooltip: `All progress synced to cloud${who}${timeNote}. Click to manage sync.`,
    iconClass: 'fa-solid fa-cloud-check text-emerald-300',
    badgeClasses: 'bg-slate-800/90 hover:bg-slate-700 text-emerald-200 border-emerald-500/35',
  };
}
