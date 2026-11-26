export interface FocusQuestionStatus {
  id: string;
  answered: boolean;
}

export interface FocusProgressSnapshot {
  currentIndex: number;
  currentPosition: number;
  total: number;
  answeredCount: number;
  completionPct: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  isLast: boolean;
}

export interface FocusShortcutInput {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  isTypingTarget: boolean;
  focusEnabled: boolean;
}

export type FocusShortcutAction = 'prev' | 'next' | 'exit' | 'toggle' | null;

export interface FocusToggleCopy {
  label: string;
  ariaLabel: string;
  iconClass: string;
  isPressed: boolean;
}

export function clampQuestionIndex(index: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const normalized = Number.isFinite(index) ? Math.trunc(index) : 0;
  return Math.max(0, Math.min(total - 1, normalized));
}

export function stepQuestionIndex(currentIndex: number, delta: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return clampQuestionIndex(currentIndex + delta, total);
}

export function resolveActiveQuestionIndex(
  questionIds: string[],
  preferredId: string | null | undefined,
  fallbackIndex = 0
): number {
  if (!Array.isArray(questionIds) || questionIds.length === 0) return 0;
  if (preferredId) {
    const matched = questionIds.indexOf(preferredId);
    if (matched >= 0) return matched;
  }
  return clampQuestionIndex(fallbackIndex, questionIds.length);
}

export function findNextUnansweredIndex(
  items: FocusQuestionStatus[],
  currentIndex: number
): number | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  const safeCurrent = clampQuestionIndex(currentIndex, items.length);

  for (let offset = 1; offset <= items.length; offset++) {
    const idx = (safeCurrent + offset) % items.length;
    if (!items[idx].answered) {
      return idx;
    }
  }
  return null;
}

export function computeFocusProgress(
  index: number,
  total: number,
  answeredCount: number
): FocusProgressSnapshot {
  const safeTotal = Math.max(0, Math.trunc(total || 0));
  const safeIndex = clampQuestionIndex(index, safeTotal);
  const safeAnswered = Math.max(0, Math.min(safeTotal, Math.trunc(answeredCount || 0)));
  const completionPct =
    safeTotal > 0 ? Math.round(((safeIndex + 1) / safeTotal) * 100) : 0;

  return {
    currentIndex: safeIndex,
    currentPosition: safeTotal > 0 ? safeIndex + 1 : 0,
    total: safeTotal,
    answeredCount: safeAnswered,
    completionPct,
    canGoPrev: safeTotal > 0 && safeIndex > 0,
    canGoNext: safeTotal > 0 && safeIndex < safeTotal - 1,
    isLast: safeTotal > 0 && safeIndex === safeTotal - 1,
  };
}

export function shouldHandleFocusShortcut(input: FocusShortcutInput): FocusShortcutAction {
  const key = input.key || '';

  // Alt+F toggles Focus Mode even when focus is on a control, unless Ctrl/Meta is also pressed
  if (input.altKey && !input.ctrlKey && !input.metaKey && key.toLowerCase() === 'f') {
    return 'toggle';
  }

  if (!input.focusEnabled) return null;
  if (input.altKey || input.ctrlKey || input.metaKey) return null;

  // Escape always exits Focus Mode cleanly unless typing in a field where user might just blur
  if (key === 'Escape' && !input.isTypingTarget) {
    return 'exit';
  }

  // Never hijack arrow keys while typing inside inputs, textareas, or selects
  if (input.isTypingTarget) return null;

  if (key === 'ArrowLeft') return 'prev';
  if (key === 'ArrowRight') return 'next';

  return null;
}

export function getFocusModeToggleCopy(enabled: boolean): FocusToggleCopy {
  if (enabled) {
    return {
      label: 'Exit Focus',
      ariaLabel: 'Exit Focus Mode and show full exam layout',
      iconClass: 'fa-compress',
      isPressed: true,
    };
  }
  return {
    label: 'Focus Mode',
    ariaLabel: 'Enable Focus Mode to concentrate on one question at a time',
    iconClass: 'fa-expand',
    isPressed: false,
  };
}
