export type StudentHomeTab = 'start' | 'papers' | 'labs' | 'topics';

export interface StudentHomeTabMeta {
  id: StudentHomeTab;
  label: string;
  shortLabel: string;
  description: string;
}

export interface StudentRecommendationInput {
  answeredCount: number;
  totalQuestions: number;
  isSubmitted: boolean;
  warmupDoneToday: boolean;
  hasExamData: boolean;
  weakestTA: string | null;
  weakestTitle: string | null;
  weakestPct: number | null;
}

export interface StudentRecommendation {
  kicker: string;
  ctaLabel: string;
  action: 'resume' | 'warmup' | 'weakest' | 'official';
  targetTA?: string;
  hint: string;
}

export interface PlainTopicCopy {
  id: 'TA1' | 'TA2' | 'TA3' | 'TA4' | 'TA5' | 'TA6';
  shortNumber: string;
  plainTitle: string;
  plainSummary: string;
  labLabel?: string;
  labAction?: string;
}

export const STUDENT_HOME_TABS: readonly StudentHomeTabMeta[] = [
  {
    id: 'start',
    label: 'Start Here',
    shortLabel: 'Start',
    description: 'The easiest ways to revise today',
  },
  {
    id: 'papers',
    label: 'Exam Papers',
    shortLabel: 'Papers',
    description: 'Real OCR past papers, untimed practice, and timed mocks',
  },
  {
    id: 'labs',
    label: 'Practice Labs',
    shortLabel: 'Labs',
    description: 'Interactive activities to learn by doing',
  },
  {
    id: 'topics',
    label: 'By Topic (TA1–TA6)',
    shortLabel: 'Topics',
    description: 'Revise one Unit R050 topic at a time',
  },
];

export const PLAIN_TOPIC_COPY: Record<PlainTopicCopy['id'], PlainTopicCopy> = {
  TA1: {
    id: 'TA1',
    shortNumber: 'Topic 1',
    plainTitle: 'Design Tools',
    plainSummary: 'Flowcharts, mind maps, wireframes, and planning diagrams.',
    labLabel: 'Diagram Lab',
    labAction: "openTa1DiagramTrainer('flowchart')",
  },
  TA2: {
    id: 'TA2',
    shortNumber: 'Topic 2',
    plainTitle: 'User Interfaces (HCI)',
    plainSummary: 'Designing apps and screens that are clear and easy for everyone.',
  },
  TA3: {
    id: 'TA3',
    shortNumber: 'Topic 3',
    plainTitle: 'Data & Testing',
    plainSummary: 'Validation checks, verification, and choosing good test data.',
    labLabel: 'Validation Lab',
    labAction: "openTa3ValidationSimulator('sandbox')",
  },
  TA4: {
    id: 'TA4',
    shortNumber: 'Topic 4',
    plainTitle: 'Cyber Security & UK Law',
    plainSummary: 'Threats, phishing, defences, and key UK IT laws.',
    labLabel: 'Security Lab',
    labAction: "openTa4SecurityLab('inspector')",
  },
  TA5: {
    id: 'TA5',
    shortNumber: 'Topic 5',
    plainTitle: 'Digital Communications',
    plainSummary: 'Wi-Fi, 5G, Bluetooth, cloud storage, and online tools.',
    labLabel: 'Networks Lab',
    labAction: "openTa56SystemBuilder('connectivity')",
  },
  TA6: {
    id: 'TA6',
    shortNumber: 'Topic 6',
    plainTitle: 'Smart Tech (IoE)',
    plainSummary: 'Sensors, smart devices, and how connected systems work together.',
    labLabel: 'IoE Builder',
    labAction: "openTa56SystemBuilder('ioe')",
  },
};

const IGNORED_PLACEHOLDER_NAMES = new Set([
  'practice student',
  'mock candidate',
  'student',
  'student name',
  'guest',
]);

export function normalizeHomeTab(raw: unknown): StudentHomeTab {
  if (raw === 'start' || raw === 'papers' || raw === 'labs' || raw === 'topics') {
    return raw;
  }
  return 'start';
}

export function getStudentGreeting(studentName: string | null | undefined): string {
  const cleaned = String(studentName ?? '').trim();
  if (!cleaned || IGNORED_PLACEHOLDER_NAMES.has(cleaned.toLowerCase())) {
    return 'Simple revision for OCR Unit R050';
  }
  const firstWord = cleaned.split(/\s+/)[0].replace(/[^a-zA-Z0-9'-]/g, '');
  if (!firstWord || firstWord.length < 2) {
    return 'Simple revision for OCR Unit R050';
  }
  const safeName = firstWord.slice(0, 20);
  return `Hi ${safeName}, ready to revise?`;
}

export function getRecommendedNextStep(input: StudentRecommendationInput): StudentRecommendation {
  if (input.answeredCount > 0 && !input.isSubmitted) {
    return {
      kicker: 'Pick up where you left off',
      ctaLabel: 'Continue Saved Paper',
      action: 'resume',
      hint: `${input.answeredCount} of ${Math.max(1, input.totalQuestions)} questions answered so far`,
    };
  }

  if (!input.warmupDoneToday) {
    return {
      kicker: 'Best place to start today',
      ctaLabel: 'Start 5-Min Warm-Up',
      action: 'warmup',
      hint: '5 quick questions to wake up your memory',
    };
  }

  if (
    input.hasExamData &&
    input.weakestTA &&
    typeof input.weakestPct === 'number' &&
    input.weakestPct < 80
  ) {
    const plainTitle =
      (PLAIN_TOPIC_COPY as Record<string, PlainTopicCopy | undefined>)[input.weakestTA]?.plainTitle ||
      input.weakestTitle ||
      input.weakestTA;
    return {
      kicker: 'Suggested next step',
      ctaLabel: `Practise ${input.weakestTA}: ${plainTitle}`,
      action: 'weakest',
      targetTA: input.weakestTA,
      hint: `Currently your lowest topic at ${input.weakestPct}%`,
    };
  }

  return {
    kicker: 'Ready for an exam paper?',
    ctaLabel: 'Browse 10 Past Papers',
    action: 'official',
    hint: 'Real OCR exam papers with built-in mark schemes',
  };
}

export function getPlainTopicCopy(taId: string): PlainTopicCopy | null {
  return (PLAIN_TOPIC_COPY as Record<string, PlainTopicCopy | undefined>)[taId] ?? null;
}
