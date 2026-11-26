import {
  computeAchievements,
  detectNewlyUnlockedBadges,
  filterAchievements,
  type AchievementBadge,
  type AchievementComputationInput,
  type AchievementFilter,
  type AchievementSummary,
} from './achievementsEngine';

const SEEN_BADGES_KEY = 'OCR_R050_SEEN_BADGES_V1';

let activeFilter: AchievementFilter = 'all';
let latestSummary: AchievementSummary | null = null;
let lastContainer: HTMLElement | null = null;

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getAccentPalette(accent: AchievementBadge['accent'], unlocked: boolean): {
  cardBorder: string;
  iconBg: string;
  iconColor: string;
  barFill: string;
  statusText: string;
} {
  if (!unlocked) {
    return {
      cardBorder: 'border-slate-200 bg-slate-50/70',
      iconBg: 'bg-slate-200/80',
      iconColor: 'text-slate-500',
      barFill: 'bg-indigo-500',
      statusText: 'text-slate-500',
    };
  }
  switch (accent) {
    case 'emerald':
      return {
        cardBorder: 'border-emerald-200 bg-white',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-700',
        barFill: 'bg-emerald-600',
        statusText: 'text-emerald-700',
      };
    case 'amber':
      return {
        cardBorder: 'border-amber-200 bg-white',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-700',
        barFill: 'bg-amber-500',
        statusText: 'text-amber-700',
      };
    case 'sky':
      return {
        cardBorder: 'border-sky-200 bg-white',
        iconBg: 'bg-sky-100',
        iconColor: 'text-sky-700',
        barFill: 'bg-sky-600',
        statusText: 'text-sky-700',
      };
    case 'rose':
      return {
        cardBorder: 'border-rose-200 bg-white',
        iconBg: 'bg-rose-100',
        iconColor: 'text-rose-700',
        barFill: 'bg-rose-600',
        statusText: 'text-rose-700',
      };
    case 'teal':
      return {
        cardBorder: 'border-teal-200 bg-white',
        iconBg: 'bg-teal-100',
        iconColor: 'text-teal-700',
        barFill: 'bg-teal-600',
        statusText: 'text-teal-700',
      };
    default:
      return {
        cardBorder: 'border-indigo-200 bg-white',
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-700',
        barFill: 'bg-indigo-600',
        statusText: 'text-indigo-700',
      };
  }
}

function readSeenBadgeIds(): string[] {
  try {
    const raw = window.localStorage.getItem(SEEN_BADGES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeSeenBadgeIds(ids: string[]): void {
  try {
    window.localStorage.setItem(SEEN_BADGES_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage quota issues
  }
}

export function evaluateAndNotifyAchievements(
  input: AchievementComputationInput,
  onToast?: (msg: string, type?: string) => void,
  silent = false
): AchievementSummary {
  const summary = computeAchievements(input);
  latestSummary = summary;

  if (typeof window !== 'undefined') {
    const seen = readSeenBadgeIds();
    const newlyUnlocked = detectNewlyUnlockedBadges(summary.badges, seen);
    if (newlyUnlocked.length > 0) {
      const updatedSeen = Array.from(new Set([...seen, ...newlyUnlocked.map((b) => b.id)]));
      writeSeenBadgeIds(updatedSeen);
      if (!silent && onToast) {
        const first = newlyUnlocked[0];
        const extra = newlyUnlocked.length > 1 ? ` (+${newlyUnlocked.length - 1} more)` : '';
        onToast(`Badge unlocked: ${first.title}${extra}`, 'success');
      }
    }
  }

  return summary;
}

export function setAchievementsFilter(filter: AchievementFilter): void {
  activeFilter = filter;
  if (lastContainer && latestSummary) {
    renderAchievementsSection(lastContainer, latestSummary);
  }
}

export function renderAchievementsSection(
  container: HTMLElement | null,
  summary: AchievementSummary
): void {
  if (!container) return;
  lastContainer = container;
  latestSummary = summary;

  const filtered = filterAchievements(summary.badges, activeFilter);

  const filterButtons: Array<{ id: AchievementFilter; label: string }> = [
    { id: 'all', label: `All (${summary.totalCount})` },
    { id: 'streak', label: `Streaks (${summary.countsByCategory.streak.unlocked}/${summary.countsByCategory.streak.total})` },
    { id: 'mastery', label: `Topic Pro (${summary.countsByCategory.mastery.unlocked}/${summary.countsByCategory.mastery.total})` },
    { id: 'milestone', label: `Milestones (${summary.countsByCategory.milestone.unlocked}/${summary.countsByCategory.milestone.total})` },
    { id: 'unlocked', label: `Unlocked (${summary.unlockedCount})` },
  ];

  const filterHtml = filterButtons
    .map((btn) => {
      const isActive = activeFilter === btn.id;
      const cls = isActive
        ? 'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap bg-white text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
        : 'px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500';
      return `<button type="button" role="tab" aria-selected="${isActive ? 'true' : 'false'}" data-badge-filter="${btn.id}" onclick="setAchievementsFilter('${btn.id}')" class="${cls}">${esc(btn.label)}</button>`;
    })
    .join('');

  const nextClosestHtml = summary.nextClosest
    ? `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div class="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span class="font-semibold text-slate-900">Next closest badge:</span>
          <span class="font-semibold text-indigo-700">${esc(summary.nextClosest.title)}</span>
          <span aria-hidden="true">·</span>
          <span class="tabular-nums">${esc(summary.nextClosest.progressLabel)}</span>
        </div>
        <button type="button" onclick="${esc(summary.nextClosest.actionHandler)}" class="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline underline-offset-4 whitespace-nowrap self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
          ${esc(summary.nextClosest.actionLabel)} →
        </button>
      </div>
    `
    : `
      <div class="pt-3 border-t border-slate-100 text-xs font-semibold text-emerald-700">
        <i class="fa-solid fa-circle-check mr-1.5" aria-hidden="true"></i>
        Every Unit R050 badge unlocked — incredible revision consistency!
      </div>
    `;

  const gridHtml =
    filtered.length === 0
      ? `
        <div class="rounded-xl border border-slate-200 bg-slate-50 px-5 py-8 text-center space-y-2">
          <p class="text-sm font-semibold text-slate-800">No badges unlocked in this view yet</p>
          <p class="text-xs text-slate-600">Start a 5-Minute Warm-Up or learn a set of flashcards to earn your first badge.</p>
          <button type="button" onclick="openDailyWarmupWorkspace('warmup')" class="mt-1 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap">
            <span>Start 5-Min Warm-Up</span>
            <i class="fa-solid fa-arrow-right text-[10px]" aria-hidden="true"></i>
          </button>
        </div>
      `
      : `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          ${filtered
            .map((badge) => {
              const p = getAccentPalette(badge.accent, badge.unlocked);
              return `
                <article data-badge-id="${esc(badge.id)}" data-unlocked="${badge.unlocked ? 'true' : 'false'}" class="rounded-xl border ${p.cardBorder} p-4 flex flex-col justify-between gap-3.5 transition-colors">
                  <div class="flex items-start gap-3">
                    <div class="h-10 w-10 rounded-xl ${p.iconBg} ${p.iconColor} flex items-center justify-center shrink-0">
                      <i class="fa-solid ${esc(badge.icon)} text-sm" aria-hidden="true"></i>
                    </div>
                    <div class="min-w-0 flex-1 space-y-1">
                      <div class="flex items-center justify-between gap-2">
                        <h3 class="text-sm font-bold text-slate-900 truncate">${esc(badge.title)}</h3>
                        <span class="text-[11px] font-semibold ${p.statusText} whitespace-nowrap shrink-0 flex items-center gap-1">
                          <i class="fa-solid ${badge.unlocked ? 'fa-circle-check' : 'fa-lock'} text-[10px]" aria-hidden="true"></i>
                          <span>${badge.unlocked ? 'Unlocked' : 'Locked'}</span>
                        </span>
                      </div>
                      <p class="text-xs text-slate-600 leading-relaxed">
                        ${esc(badge.unlocked ? badge.unlockedReason : badge.description)}
                      </p>
                    </div>
                  </div>

                  <div class="space-y-1.5 pt-1">
                    <div class="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span class="tabular-nums font-medium">${esc(badge.progressLabel)}</span>
                      ${
                        badge.unlocked
                          ? `<span class="font-semibold ${p.statusText} tabular-nums">100%</span>`
                          : `<button type="button" onclick="${esc(badge.actionHandler)}" class="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline underline-offset-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">${esc(badge.actionLabel)} →</button>`
                      }
                    </div>
                    <div class="w-full h-1.5 rounded-full bg-slate-200/80 overflow-hidden" role="progressbar" aria-valuenow="${badge.progressPct}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(badge.title)} progress">
                      <div class="h-full rounded-full ${p.barFill} transition-all" style="width: ${badge.progressPct}%"></div>
                    </div>
                  </div>
                </article>
              `;
            })
            .join('')}
        </div>
      `;

  container.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium tabular-nums">
            <span class="font-bold text-indigo-600">${esc(summary.rankTitle)}</span>
            <span aria-hidden="true">·</span>
            <span id="achievements-unlocked-count" class="font-semibold text-slate-800">${summary.unlockedCount} / ${summary.totalCount} badges unlocked</span>
            <span aria-hidden="true">·</span>
            <span>${summary.completionPct}% complete</span>
          </div>
          <h2 class="text-base sm:text-lg font-bold text-slate-900">Achievements &amp; Badges</h2>
        </div>

        <div class="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto max-w-full no-print" role="tablist" aria-label="Filter achievement badges">
          ${filterHtml}
        </div>
      </div>

      ${nextClosestHtml}
      ${gridHtml}
    </div>
  `;
}
