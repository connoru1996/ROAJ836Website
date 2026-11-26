import type { TopicAreaId } from './dashboardAnalytics';

export type SpecConfidence = 'unrated' | 'red' | 'amber' | 'green';

export type WarmupQuestionType = 'mcq' | 'true-false' | 'short-recall';

export type WarmupSprintMode = 'daily' | 'weak-spots' | 'topic' | 'bonus';

export type SpecPracticeTarget =
  | { type: 'ta1-trainer'; tab: 'flowchart' | 'diagrams' | 'drill' }
  | { type: 'ta3-simulator'; tab: 'sandbox' | 'testplan' | 'verify' | 'match' }
  | { type: 'ta4-lab'; tab: 'inspector' | 'defence' | 'legislation' | 'incident' }
  | { type: 'ta56-builder'; tab: 'connectivity' | 'ioe' | 'comms' | 'tradeoffs' }
  | { type: 'command-drills'; tab: 'fix' | 'commands' | 'examiner' | 'vague' }
  | { type: 'flashcards'; topic: TopicAreaId }
  | { type: 'quick-ref'; topic: TopicAreaId };

export interface SpecChecklistItem {
  id: string;
  code: string;
  ta: TopicAreaId;
  title: string;
  specDetail: string;
  keyTerms: string[];
  examTip: string;
  practiceLabel: string;
  practiceTarget: SpecPracticeTarget;
}

export interface WarmupQuestion {
  id: string;
  ta: TopicAreaId;
  specItemId: string;
  specCode: string;
  type: WarmupQuestionType;
  prompt: string;
  context?: string;
  options?: string[];
  correctOptionIndex?: number;
  correctBoolean?: boolean;
  acceptedAnswers?: string[];
  displayAnswer: string;
  examinerNote: string;
}

export interface WarmupSessionRecord {
  id: string;
  dateKey: string; // YYYY-MM-DD local date
  mode: WarmupSprintMode;
  score: number;
  total: number;
  secondsUsed: number;
  completedAt: string; // ISO timestamp
  missedSpecIds: string[];
}

export interface DailyWarmupStorageState {
  specRatings: Record<string, SpecConfidence>;
  sessions: WarmupSessionRecord[];
  bonusCounter: number;
}

export interface WarmupAnswerEvaluation {
  isCorrect: boolean;
  marksEarned: number;
  maxMarks: number;
  correctAnswerDisplay: string;
  feedbackTitle: string;
  examinerNote: string;
}

export interface TopicChecklistBreakdown {
  ta: TopicAreaId;
  title: string;
  total: number;
  green: number;
  amber: number;
  red: number;
  unrated: number;
  readyPct: number;
}

export interface SpecChecklistSummary {
  totalItems: number;
  ratedCount: number;
  greenCount: number;
  amberCount: number;
  redCount: number;
  unratedCount: number;
  readinessPct: number;
  confidenceScorePct: number;
  byTopic: TopicChecklistBreakdown[];
  topPriorities: SpecChecklistItem[];
}

export interface StreakDayCell {
  dateKey: string;
  weekdayShort: string;
  dayNum: number;
  completed: boolean;
  bestScore: number | null;
  bestTotal: number | null;
  isToday: boolean;
}

export interface StreakSummary {
  currentStreak: number;
  bestStreak: number;
  completedToday: boolean;
  todaySessionsCount: number;
  todayBestScore: number | null;
  todayBestTotal: number | null;
  totalCompletedSessions: number;
  totalQuestionsAnswered: number;
  overallAccuracyPct: number | null;
  last7Days: StreakDayCell[];
}

export const TOPIC_AREA_TITLES: Record<TopicAreaId, string> = {
  TA1: 'Design Tools',
  TA2: 'Human Computer Interface (HCI)',
  TA3: 'Data and Testing',
  TA4: 'Cyber-Security and Legislation',
  TA5: 'Digital Communications',
  TA6: 'Internet of Everything (IoE)',
};

export const TOPIC_ORDER: TopicAreaId[] = ['TA1', 'TA2', 'TA3', 'TA4', 'TA5', 'TA6'];

export const WARMUP_DURATION_SECONDS = 300; // 5 minutes
export const WARMUP_QUESTIONS_PER_SPRINT = 5;

export const SPEC_CHECKLIST_ITEMS: SpecChecklistItem[] = [
  // TA1: Design Tools
  {
    id: 'ta1-1',
    code: '1.1',
    ta: 'TA1',
    title: 'Flowcharts & ISO 5807 Symbols',
    specDetail: 'Use standard flowchart symbols (Terminator, Process, Decision, Input/Output, Sub-routine) with directional arrows and labelled Yes/No decision branches.',
    keyTerms: ['Terminator', 'Decision Diamond', 'Parallelogram', 'Flow Arrows'],
    examTip: 'Always label both outgoing arrows from a Decision diamond (Yes/No or True/False) to avoid dropping a mark.',
    practiceLabel: 'TA1 Flowchart Builder',
    practiceTarget: { type: 'ta1-trainer', tab: 'flowchart' },
  },
  {
    id: 'ta1-2',
    code: '1.2',
    ta: 'TA1',
    title: 'Mind Maps (Nodes, Sub-nodes & Branches)',
    specDetail: 'Structure ideas around a central node with radiating branches, sub-nodes, keywords, and visual grouping to brainstorm requirements or website content.',
    keyTerms: ['Central Node', 'Sub-nodes', 'Branches', 'Brainstorming'],
    examTip: 'Distinguish Mind Maps (single central topic) from Concept Maps (labelled connecting verbs between multiple ideas).',
    practiceLabel: 'TA1 Diagram Blueprints',
    practiceTarget: { type: 'ta1-trainer', tab: 'diagrams' },
  },
  {
    id: 'ta1-3',
    code: '1.3',
    ta: 'TA1',
    title: 'Visualisation Diagrams',
    specDetail: 'Draft annotated static visual layouts (posters, packaging, digital graphics, kiosk screens) showing colour schemes, typography, imagery, and positioning.',
    keyTerms: ['Annotations', 'Static Layout', 'Colour Palette', 'Typography'],
    examTip: 'Visualisation diagrams are for static visual assets — never recommend one for showing step-by-step logic.',
    practiceLabel: 'TA1 Diagram Blueprints',
    practiceTarget: { type: 'ta1-trainer', tab: 'diagrams' },
  },
  {
    id: 'ta1-4',
    code: '1.4',
    ta: 'TA1',
    title: 'Wireframes (Low-Fidelity vs High-Fidelity)',
    specDetail: 'Plan UI screen hierarchy, navigation bars, placeholders, and interactive controls for apps or websites before adding final branding or code.',
    keyTerms: ['Wireframe', 'Navigation', 'Placeholders', 'Low-Fidelity'],
    examTip: 'State that wireframes focus on layout structure and user flow rather than colours or final photos.',
    practiceLabel: 'TA1 Symbol & Tool Drill',
    practiceTarget: { type: 'ta1-trainer', tab: 'drill' },
  },
  {
    id: 'ta1-5',
    code: '1.5',
    ta: 'TA1',
    title: 'Selecting & Justifying Design Tools for Scenarios',
    specDetail: 'Evaluate which design tool best fits a client brief, justifying strengths, limitations, and suitability for technical vs non-technical stakeholders.',
    keyTerms: ['Stakeholder', 'Suitability', 'Advantages', 'Limitations'],
    examTip: 'Link your tool justification directly to the named client in the scenario (AO2) for full marks.',
    practiceLabel: 'Command Word Drills',
    practiceTarget: { type: 'command-drills', tab: 'fix' },
  },

  // TA2: Human Computer Interface (HCI) in Everyday Life
  {
    id: 'ta2-1',
    code: '2.1',
    ta: 'TA2',
    title: 'Purpose, Importance & Uses of HCI',
    specDetail: 'Explain how HCI enables human-to-computer interaction across banking ATMs, retail self-checkouts, embedded car dashboards, and healthcare kiosks.',
    keyTerms: ['HCI', 'Usability', 'Embedded System', 'Self-Checkout'],
    examTip: 'Avoid vague claims like "easy to use" — specify reduced input errors, faster checkout time, or clearer navigation.',
    practiceLabel: 'TA2 Cheat Sheet',
    practiceTarget: { type: 'quick-ref', topic: 'TA2' },
  },
  {
    id: 'ta2-2',
    code: '2.2',
    ta: 'TA2',
    title: 'Hardware & Software Considerations for HCI',
    specDetail: 'Match screen size, processing power, memory, battery life, and OS/driver requirements to the environment where the HCI operates.',
    keyTerms: ['Screen Resolution', 'Operating System', 'Battery Life', 'Processing Power'],
    examTip: 'Always connect hardware choices to the physical environment (e.g., rugged high-brightness touchscreens for outdoor kiosks).',
    practiceLabel: 'TA2 Flashcards',
    practiceTarget: { type: 'flashcards', topic: 'TA2' },
  },
  {
    id: 'ta2-3',
    code: '2.3',
    ta: 'TA2',
    title: 'Interface Types (GUI, Menu, Voice, Sensor, CLI)',
    specDetail: 'Compare Graphical User Interfaces (WIMP), Menu-driven interfaces, Natural Language / Voice interfaces, Gesture/Sensor UIs, and Command Line Interfaces.',
    keyTerms: ['GUI / WIMP', 'Menu-Driven', 'Voice UI', 'Sensor / Gesture'],
    examTip: 'For Menu-driven interfaces (like ATMs), explain how restricting options prevents invalid user inputs.',
    practiceLabel: 'TA2 Flashcards',
    practiceTarget: { type: 'flashcards', topic: 'TA2' },
  },
  {
    id: 'ta2-4',
    code: '2.4',
    ta: 'TA2',
    title: 'Interaction Methods & Visual Design Consistency',
    specDetail: 'Apply consistent layout, house style, clear iconography, audio/haptic feedback, and intuitive touch/keyboard/pointing controls.',
    keyTerms: ['Consistency', 'Haptic Feedback', 'House Style', 'Touchscreen'],
    examTip: 'Explain the consequence of consistency: users recognise controls immediately without re-learning each screen.',
    practiceLabel: 'Fix the Answer Clinic',
    practiceTarget: { type: 'command-drills', tab: 'fix' },
  },
  {
    id: 'ta2-5',
    code: '2.5',
    ta: 'TA2',
    title: 'Accessibility & Inclusive HCI Design',
    specDetail: 'Design for visual, hearing, motor, and cognitive needs using screen readers, alt text, high-contrast palettes, adjustable fonts, subtitles, and voice input.',
    keyTerms: ['Screen Reader', 'High Contrast', 'Alt Text', 'WCAG / Accessibility'],
    examTip: 'Name a specific user group (e.g., visually impaired users) and the exact HCI feature that helps them.',
    practiceLabel: 'TA2 Cheat Sheet',
    practiceTarget: { type: 'quick-ref', topic: 'TA2' },
  },

  // TA3: Data and Testing
  {
    id: 'ta3-1',
    code: '3.1',
    ta: 'TA3',
    title: 'Data vs Information & Data Types',
    specDetail: 'Differentiate raw data from processed contextualised information, and assign accurate data types (String/Text, Integer, Real/Float, Boolean, Date/Time, Currency).',
    keyTerms: ['Data vs Information', 'String', 'Integer', 'Boolean'],
    examTip: 'UK phone numbers and postcodes must be stored as String/Text — storing a phone number as an Integer strips the leading zero!',
    practiceLabel: 'TA3 Cheat Sheet',
    practiceTarget: { type: 'quick-ref', topic: 'TA3' },
  },
  {
    id: 'ta3-2',
    code: '3.2',
    ta: 'TA3',
    title: 'Validation Rules (Presence, Length, Range, Format, Type, Lookup)',
    specDetail: 'Configure automated software checks that ensure entered data is sensible, reasonable, and conforms to defined input rules before acceptance.',
    keyTerms: ['Presence Check', 'Range Check', 'Format Check', 'Lookup Table'],
    examTip: 'Remember: validation checks that data is sensible and follows rules, NOT that it is factually accurate.',
    practiceLabel: 'TA3 Live Sandbox',
    practiceTarget: { type: 'ta3-simulator', tab: 'sandbox' },
  },
  {
    id: 'ta3-3',
    code: '3.3',
    ta: 'TA3',
    title: 'Verification Methods (Double Entry & Visual Check)',
    specDetail: 'Explain how Double Entry (typing twice and comparing) and Visual Checking (proofreading against the source) prevent transcription errors during input.',
    keyTerms: ['Verification', 'Double Entry', 'Visual Check', 'Transcription Error'],
    examTip: 'Pair validation and verification in exam answers: a format check cannot catch a mistyped email that still looks valid, so double entry is needed.',
    practiceLabel: 'TA3 Validation vs Verification',
    practiceTarget: { type: 'ta3-simulator', tab: 'verify' },
  },
  {
    id: 'ta3-4',
    code: '3.4',
    ta: 'TA3',
    title: 'Data Collection Methods, Reliability & Bias',
    specDetail: 'Compare primary vs secondary data collection (surveys, sensors, interviews, web scraping) and evaluate sample size, bias, timeliness, and storage.',
    keyTerms: ['Primary Data', 'Secondary Data', 'Sensors', 'Sample Bias'],
    examTip: 'Automated sensors remove human reading errors and log continuously 24/7, but require calibration and hardware cost.',
    practiceLabel: 'TA3 Flashcards',
    practiceTarget: { type: 'flashcards', topic: 'TA3' },
  },
  {
    id: 'ta3-5',
    code: '3.5',
    ta: 'TA3',
    title: 'Test Plans & Test Data (Normal, Boundary, Erroneous)',
    specDetail: 'Construct test tables with Test ID, input data, test category (Normal/Valid, Boundary/Extreme, Erroneous/Invalid), expected outcome, and actual result.',
    keyTerms: ['Normal Data', 'Boundary Data', 'Erroneous Data', 'Expected Outcome'],
    examTip: 'For a range of 1–100, Boundary tests include both the exact edge values (1, 100) and just outside the edges (0, 101).',
    practiceLabel: 'TA3 Test Plan Plotter',
    practiceTarget: { type: 'ta3-simulator', tab: 'testplan' },
  },

  // TA4: Cyber-Security and Legislation
  {
    id: 'ta4-1',
    code: '4.1',
    ta: 'TA4',
    title: 'Social Engineering & Malware Threats',
    specDetail: 'Identify how attackers exploit human behaviour (phishing, blagging, shoulder surfing, baiting) and deploy malware (ransomware, viruses, trojans, spyware).',
    keyTerms: ['Phishing', 'Blagging', 'Ransomware', 'Trojan'],
    examTip: 'Always state both how the threat works (AO1) and the impact on the organisation such as data theft or downtime (AO2).',
    practiceLabel: 'TA4 Threat Inspector',
    practiceTarget: { type: 'ta4-lab', tab: 'inspector' },
  },
  {
    id: 'ta4-2',
    code: '4.2',
    ta: 'TA4',
    title: 'Technical Network & System Attacks',
    specDetail: 'Explain brute-force password attacks, Denial of Service (DoS/DDoS), SQL injection, pharming, man-in-the-middle interception, and unpatched software exploits.',
    keyTerms: ['Brute Force', 'DDoS', 'SQL Injection', 'Pharming'],
    examTip: 'DoS floods a server with traffic to disrupt availability; SQL injection inserts malicious database commands into input fields.',
    practiceLabel: 'TA4 Defence Builder',
    practiceTarget: { type: 'ta4-lab', tab: 'defence' },
  },
  {
    id: 'ta4-3',
    code: '4.3',
    ta: 'TA4',
    title: 'Security Prevention, Mitigation & Recovery',
    specDetail: 'Recommend layered defences: firewalls, encryption, multi-factor authentication (2FA), access levels, anti-malware, staff training, and offline 3-2-1 backups.',
    keyTerms: ['Encryption', 'Firewall', '2FA / MFA', 'Offline Backup'],
    examTip: 'Never write "makes it more secure" — specify that encryption renders intercepted data unreadable without the decryption key.',
    practiceLabel: 'TA4 Incident & Recovery',
    practiceTarget: { type: 'ta4-lab', tab: 'incident' },
  },
  {
    id: 'ta4-4',
    code: '4.4',
    ta: 'TA4',
    title: 'Data Protection Act 2018 (UK GDPR) & Computer Misuse Act 1990',
    specDetail: 'Apply the 7 DPA 2018 / UK GDPR principles (lawful, accurate, limited retention, secure) and the 3 offences of the Computer Misuse Act 1990.',
    keyTerms: ['DPA 2018 / UK GDPR', 'Computer Misuse Act', 'ICO Fines', 'Unauthorised Access'],
    examTip: 'Quote the full Act name and year (e.g., Data Protection Act 2018) and match the exact offence or data-subject right.',
    practiceLabel: 'UK Legislation Courtroom',
    practiceTarget: { type: 'ta4-lab', tab: 'legislation' },
  },
  {
    id: 'ta4-5',
    code: '4.5',
    ta: 'TA4',
    title: 'Copyright Act 1988, Equality Act 2010 & Ethical Impacts',
    specDetail: 'Understand intellectual property protection (CDPA 1988), Creative Commons licensing, legal accessibility duties (Equality Act 2010), and ethical/environmental IT issues.',
    keyTerms: ['CDPA 1988', 'Creative Commons', 'Equality Act 2010', 'E-Waste'],
    examTip: 'Remember that copyright applies automatically on creation — students do not need to register a work for it to be protected.',
    practiceLabel: 'UK Legislation Courtroom',
    practiceTarget: { type: 'ta4-lab', tab: 'legislation' },
  },

  // TA5: Digital Communications
  {
    id: 'ta5-1',
    code: '5.1',
    ta: 'TA5',
    title: 'Digital Communication Types & Use Cases',
    specDetail: 'Compare synchronous vs asynchronous methods: email, VoIP, video conferencing, instant messaging, SMS, and collaborative platforms for business and personal use.',
    keyTerms: ['VoIP', 'Video Conferencing', 'Email', 'Instant Messaging'],
    examTip: 'Explain trade-offs clearly: video conferencing saves travel costs and shows body language, but relies on high-bandwidth stability.',
    practiceLabel: 'Digital Comms Studio',
    practiceTarget: { type: 'ta56-builder', tab: 'comms' },
  },
  {
    id: 'ta5-2',
    code: '5.2',
    ta: 'TA5',
    title: 'Distribution Channels (Cloud, Web, Social, Podcasts, Vlogs)',
    specDetail: 'Select suitable digital distribution channels for reaching target demographics, considering global reach, interactivity, cost, and moderation requirements.',
    keyTerms: ['Cloud Storage', 'Social Media', 'Podcast / Vlog', 'Target Audience'],
    examTip: 'Always link the chosen distribution channel back to the age group or technical skill of the scenario audience.',
    practiceLabel: 'Digital Comms Studio',
    practiceTarget: { type: 'ta56-builder', tab: 'comms' },
  },
  {
    id: 'ta5-3',
    code: '5.3',
    ta: 'TA5',
    title: 'Software & Hardware Requirements for Digital Comms',
    specDetail: 'Identify required hardware (webcam, microphone, router, NIC, smartphone) and software (web browser, VoIP client, codecs, email client) for reliable communication.',
    keyTerms: ['NIC', 'Router', 'VoIP Client', 'Bandwidth'],
    examTip: 'Check whether the question asks for hardware or software — listing "Zoom" when asked for hardware earns 0 marks.',
    practiceLabel: 'Digital Comms Studio',
    practiceTarget: { type: 'ta56-builder', tab: 'comms' },
  },
  {
    id: 'ta5-4',
    code: '5.4',
    ta: 'TA5',
    title: 'Connectivity Technologies (Wi-Fi, 4G/5G, Bluetooth, NFC, Wired)',
    specDetail: 'Compare wireless and wired standards by range, bandwidth, latency, interference, power consumption, and security suitability.',
    keyTerms: ['Wi-Fi', '4G / 5G', 'Bluetooth', 'NFC'],
    examTip: 'NFC has a tiny range (<10 cm), which is actually a security advantage for contactless payments.',
    practiceLabel: 'Connectivity Matcher',
    practiceTarget: { type: 'ta56-builder', tab: 'connectivity' },
  },
  {
    id: 'ta5-5',
    code: '5.5',
    ta: 'TA5',
    title: 'Digital Divide, Security & Communication Risks',
    specDetail: 'Evaluate barriers to digital communication (rural broadband gaps, cost, digital literacy) alongside eavesdropping, phishing, and data privacy risks.',
    keyTerms: ['Digital Divide', 'Latency', 'Encryption (TLS/HTTPS)', 'Digital Literacy'],
    examTip: 'When discussing the digital divide, cite concrete barriers: affordability of devices, rural connectivity, or lack of digital skills.',
    practiceLabel: 'Reliability & Trade-Offs',
    practiceTarget: { type: 'ta56-builder', tab: 'tradeoffs' },
  },

  // TA6: Internet of Everything (IoE)
  {
    id: 'ta6-1',
    code: '6.1',
    ta: 'TA6',
    title: 'The Four Pillars of the Internet of Everything (IoE)',
    specDetail: 'Define how People, Process, Data, and Things interact over network connections to turn raw sensor measurements into automated, valuable actions.',
    keyTerms: ['People', 'Process', 'Data', 'Things'],
    examTip: 'Do not confuse IoT (Things/devices) with IoE — IoE explicitly brings together all four pillars: People, Process, Data, and Things.',
    practiceLabel: 'IoE System Builder',
    practiceTarget: { type: 'ta56-builder', tab: 'ioe' },
  },
  {
    id: 'ta6-2',
    code: '6.2',
    ta: 'TA6',
    title: 'How IoE Works: Sensors, Actuators & the World Wide Web',
    specDetail: 'Trace how smart devices capture physical readings via sensors, transmit data over the internet/cloud for processing, and trigger automated actions via actuators.',
    keyTerms: ['Sensor', 'Actuator', 'Cloud Processing', 'Automation'],
    examTip: 'Walk through the exact chain: Sensor reads environment → Data sent to cloud/hub → Rule evaluated → Actuator or user alert triggered.',
    practiceLabel: 'IoE System Builder',
    practiceTarget: { type: 'ta56-builder', tab: 'ioe' },
  },
  {
    id: 'ta6-3',
    code: '6.3',
    ta: 'TA6',
    title: 'Real-World IoE Applications (Homes, Health, Industry, Farming)',
    specDetail: 'Apply IoE concepts to smart thermostats, wearable health monitors, automated warehouse stock tracking, precision agriculture, and smart city traffic systems.',
    keyTerms: ['Smart Thermostat', 'Wearable Monitor', 'Precision Farming', 'Smart Grid'],
    examTip: 'Always describe the concrete benefit for the stakeholder (e.g., remote heart-rate alerts reduce hospital readmissions).',
    practiceLabel: 'IoE System Builder',
    practiceTarget: { type: 'ta56-builder', tab: 'ioe' },
  },
  {
    id: 'ta6-4',
    code: '6.4',
    ta: 'TA6',
    title: 'IoE Suitability, Reliability & Interoperability',
    specDetail: 'Evaluate bandwidth demands, single points of failure, battery maintenance, proprietary ecosystem lock-in, and cross-vendor interoperability.',
    keyTerms: ['Interoperability', 'Reliability', 'Single Point of Failure', 'Scalability'],
    examTip: 'High-band answers mention what happens if the internet drops: critical systems need local fallback control.',
    practiceLabel: 'Reliability & Trade-Offs',
    practiceTarget: { type: 'ta56-builder', tab: 'tradeoffs' },
  },
  {
    id: 'ta6-5',
    code: '6.5',
    ta: 'TA6',
    title: 'IoE Privacy, Security & Ethical Trade-offs',
    specDetail: 'Assess risks of always-on microphones/cameras, weak default firmware passwords, botnet hijacking, profiling of personal habits, and electronic waste.',
    keyTerms: ['Default Passwords', 'Firmware Updates', 'Profiling', 'Botnet'],
    examTip: 'Always balance benefits with concrete privacy/security countermeasures like firmware patching and network segmentation.',
    practiceLabel: 'Reliability & Trade-Offs',
    practiceTarget: { type: 'ta56-builder', tab: 'tradeoffs' },
  },
];

export const WARMUP_QUESTION_BANK: WarmupQuestion[] = [
  // TA1 (6 questions)
  {
    id: 'wq-ta1-1',
    ta: 'TA1',
    specItemId: 'ta1-1',
    specCode: '1.1',
    type: 'mcq',
    prompt: 'Which standard ISO 5807 flowchart symbol must be used to represent a user entering their PIN or displaying a receipt message?',
    options: ['Rectangle (Process)', 'Parallelogram (Input / Output)', 'Diamond (Decision)', 'Rounded Rectangle (Terminator)'],
    correctOptionIndex: 1,
    displayAnswer: 'Parallelogram (Input / Output)',
    examinerNote: 'Parallelograms represent any data entering (Input) or leaving (Output) the system; rectangles are strictly for internal processing.',
  },
  {
    id: 'wq-ta1-2',
    ta: 'TA1',
    specItemId: 'ta1-1',
    specCode: '1.1',
    type: 'true-false',
    prompt: 'True or False: A Decision diamond in an OCR exam flowchart only needs a label on the "Yes" arrow because the other branch is obviously "No".',
    correctBoolean: false,
    displayAnswer: 'False',
    examinerNote: 'OCR mark schemes require BOTH outgoing branches from every Decision symbol to be clearly labelled (e.g., Yes/No or True/False).',
  },
  {
    id: 'wq-ta1-3',
    ta: 'TA1',
    specItemId: 'ta1-2',
    specCode: '1.2',
    type: 'short-recall',
    prompt: 'Name the design tool built around a single central node with radiating branches and sub-nodes used to brainstorm ideas for a new app.',
    acceptedAnswers: ['mind map', 'mindmap', 'mind-map', 'mind maps'],
    displayAnswer: 'Mind Map',
    examinerNote: 'A Mind Map starts with one central topic node and expands outward into themed branches and sub-nodes.',
  },
  {
    id: 'wq-ta1-4',
    ta: 'TA1',
    specItemId: 'ta1-3',
    specCode: '1.3',
    type: 'mcq',
    prompt: 'A café wants an annotated design showing the final colour scheme, font styles, and logo placement for a printed menu poster. Which design tool is most suitable?',
    options: ['Flowchart', 'Visualisation Diagram', 'Low-Fidelity Wireframe', 'Concept Map'],
    correctOptionIndex: 1,
    displayAnswer: 'Visualisation Diagram',
    examinerNote: 'Visualisation diagrams show how a static visual product (poster, flyer, packaging, screen graphic) will look, annotated with colours, fonts, and imagery.',
  },
  {
    id: 'wq-ta1-5',
    ta: 'TA1',
    specItemId: 'ta1-4',
    specCode: '1.4',
    type: 'mcq',
    prompt: 'What is the primary purpose of creating a low-fidelity wireframe before developing a mobile app?',
    options: [
      'To finalise exact photography and brand gradients',
      'To plan screen layout, navigation hierarchy, and interactive placeholders quickly',
      'To test database validation rules using boundary data',
      'To trace looping conditional logic step by step',
    ],
    correctOptionIndex: 1,
    displayAnswer: 'To plan screen layout, navigation hierarchy, and interactive placeholders quickly',
    examinerNote: 'Low-fidelity wireframes focus on structure, navigation flow, and element placement so changes are fast and inexpensive before coding.',
  },
  {
    id: 'wq-ta1-6',
    ta: 'TA1',
    specItemId: 'ta1-5',
    specCode: '1.5',
    type: 'true-false',
    prompt: 'True or False: A Flowchart is a better design tool than a Wireframe when showing how an online checkout system checks stock and handles declined payments.',
    correctBoolean: true,
    displayAnswer: 'True',
    examinerNote: 'Flowcharts model sequential logic, branching decisions, and loops; wireframes only depict visual screen layouts.',
  },

  // TA2 (6 questions)
  {
    id: 'wq-ta2-1',
    ta: 'TA2',
    specItemId: 'ta2-3',
    specCode: '2.3',
    type: 'mcq',
    prompt: 'Why is a menu-driven interface preferred over a command line interface (CLI) on a public train ticket kiosk?',
    options: [
      'It requires users to memorise syntax commands',
      'It restricts choices to valid options step by step, preventing user errors for first-time travellers',
      'It eliminates the need for any screen hardware',
      'It uses less memory than a text terminal',
    ],
    correctOptionIndex: 1,
    displayAnswer: 'It restricts choices to valid options step by step, preventing user errors for first-time travellers',
    examinerNote: 'Menu-driven HCIs guide novices through structured choices without needing prior training or command recall.',
  },
  {
    id: 'wq-ta2-2',
    ta: 'TA2',
    specItemId: 'ta2-5',
    specCode: '2.5',
    type: 'mcq',
    prompt: 'Which HCI accessibility feature specifically helps users with red-green colour blindness distinguish an error state from a success state?',
    options: [
      'Removing all icons to keep the screen minimal',
      'Pairing colours with explicit text labels and distinct icon shapes',
      'Reducing the screen brightness to 30%',
      'Requiring voice commands for every button',
    ],
    correctOptionIndex: 1,
    displayAnswer: 'Pairing colours with explicit text labels and distinct icon shapes',
    examinerNote: 'Never rely on colour alone — dual-coding states with icons/symbols and clear text labels ensures accessible HCI.',
  },
  {
    id: 'wq-ta2-3',
    ta: 'TA2',
    specItemId: 'ta2-3',
    specCode: '2.3',
    type: 'short-recall',
    prompt: 'What 4-letter acronym describes the classic Graphical User Interface elements: Windows, Icons, Menus, and Pointers?',
    acceptedAnswers: ['wimp', 'w.i.m.p', 'w.i.m.p.'],
    displayAnswer: 'WIMP',
    examinerNote: 'WIMP stands for Windows, Icons, Menus, and Pointers — the standard interaction paradigm for desktop GUIs.',
  },
  {
    id: 'wq-ta2-4',
    ta: 'TA2',
    specItemId: 'ta2-2',
    specCode: '2.2',
    type: 'true-false',
    prompt: 'True or False: A natural language (voice) interface is always the best choice for entering private banking PINs in a crowded shopping centre.',
    correctBoolean: false,
    displayAnswer: 'False',
    examinerNote: 'Background noise degrades voice recognition accuracy AND speaking sensitive credentials aloud creates a major privacy/security risk.',
  },
  {
    id: 'wq-ta2-5',
    ta: 'TA2',
    specItemId: 'ta2-4',
    specCode: '2.4',
    type: 'mcq',
    prompt: 'What is the main usability benefit of maintaining a consistent layout and navigation bar across every screen of a retail app?',
    options: [
      'It increases the app file size so it looks more professional',
      'Users build familiarity quickly and complete tasks faster with fewer navigation errors',
      'It removes the need to test the app on smartphones',
      'It prevents the app from requiring an operating system',
    ],
    correctOptionIndex: 1,
    displayAnswer: 'Users build familiarity quickly and complete tasks faster with fewer navigation errors',
    examinerNote: 'Consistency reduces cognitive load: users immediately recognise where menus, back buttons, and primary actions sit.',
  },
  {
    id: 'wq-ta2-6',
    ta: 'TA2',
    specItemId: 'ta2-1',
    specCode: '2.1',
    type: 'mcq',
    prompt: 'Which physical feedback mechanism confirms a virtual button press on a smartphone touchscreen without needing sound?',
    options: ['Haptic vibration feedback', 'Optical character recognition', 'Thermal printing', 'SQL indexing'],
    correctOptionIndex: 0,
    displayAnswer: 'Haptic vibration feedback',
    examinerNote: 'Haptic feedback gives tactile confirmation (a subtle vibration pulse), useful in noisy settings or for visually/hearing impaired users.',
  },

  // TA3 (6 questions)
  {
    id: 'wq-ta3-1',
    ta: 'TA3',
    specItemId: 'ta3-1',
    specCode: '3.1',
    type: 'mcq',
    prompt: 'Which data type must be used to store a UK telephone number such as "07700900123" in a customer database?',
    options: ['Integer', 'Real / Float', 'String / Text', 'Boolean'],
    correctOptionIndex: 2,
    displayAnswer: 'String / Text',
    examinerNote: 'Storing a phone number as an Integer removes the leading zero (0) and prevents spaces or "+" country codes; no arithmetic is done on phone numbers.',
  },
  {
    id: 'wq-ta3-2',
    ta: 'TA3',
    specItemId: 'ta3-2',
    specCode: '3.2',
    type: 'short-recall',
    prompt: 'Which validation check ensures a booking form field for "Number of Guests" only accepts values between 1 and 12 inclusive?',
    acceptedAnswers: ['range', 'range check', 'range validation'],
    displayAnswer: 'Range Check',
    examinerNote: 'A Range Check verifies that a numeric or date value falls within a specified minimum and maximum boundary.',
  },
  {
    id: 'wq-ta3-3',
    ta: 'TA3',
    specItemId: 'ta3-3',
    specCode: '3.3',
    type: 'true-false',
    prompt: 'True or False: Validation rules can guarantee that a customer typed their own true date of birth rather than accidentally typing a different valid date.',
    correctBoolean: false,
    displayAnswer: 'False',
    examinerNote: 'Validation only confirms data is sensible and matches rules. Verification (Double Entry or Visual Check) is needed to check accuracy against the source.',
  },
  {
    id: 'wq-ta3-4',
    ta: 'TA3',
    specItemId: 'ta3-5',
    specCode: '3.5',
    type: 'mcq',
    prompt: 'A gym discount field accepts member ages from 16 to 65 inclusive. Which set of test inputs correctly represents Boundary (extreme) test data?',
    options: ['25 and 40', '15, 16, 65, and 66', '"Twenty" and "@@"', '30 and 50'],
    correctOptionIndex: 1,
    displayAnswer: '15, 16, 65, and 66',
    examinerNote: 'Boundary data tests values directly on the valid edges (16, 65) and immediately outside them (15, 66) to catch < vs <= coding mistakes.',
  },
  {
    id: 'wq-ta3-5',
    ta: 'TA3',
    specItemId: 'ta3-2',
    specCode: '3.2',
    type: 'mcq',
    prompt: 'Which validation rule checks that a UK postcode follows the pattern of letters and numbers such as "LLNN NLL" (e.g., CB1 2AB)?',
    options: ['Presence Check', 'Format Check (Input Mask)', 'Range Check', 'Check Digit'],
    correctOptionIndex: 1,
    displayAnswer: 'Format Check (Input Mask)',
    examinerNote: 'A Format Check enforces a strict sequence of character types (letters, digits, separators) using a predefined pattern or input mask.',
  },
  {
    id: 'wq-ta3-6',
    ta: 'TA3',
    specItemId: 'ta3-3',
    specCode: '3.3',
    type: 'short-recall',
    prompt: 'Name the verification method where a user must type their new password or email address twice so the system can check both entries match.',
    acceptedAnswers: ['double entry', 'double-entry', 'double keying', 'dual entry'],
    displayAnswer: 'Double Entry',
    examinerNote: 'Double Entry compares two independent keystrokes of the same value and rejects mismatches, catching accidental typos.',
  },

  // TA4 (6 questions)
  {
    id: 'wq-ta4-1',
    ta: 'TA4',
    specItemId: 'ta4-1',
    specCode: '4.1',
    type: 'mcq',
    prompt: 'An attacker phones an IT helpdesk pretending to be a senior manager who urgently needs a password reset. Which social engineering technique is this?',
    options: ['Blagging (Pretexting)', 'SQL Injection', 'Pharming', 'Shoulder Surfing'],
    correctOptionIndex: 0,
    displayAnswer: 'Blagging (Pretexting)',
    examinerNote: 'Blagging involves inventing a convincing scenario or false identity (often using urgency or authority) to trick staff into disclosing access.',
  },
  {
    id: 'wq-ta4-2',
    ta: 'TA4',
    specItemId: 'ta4-4',
    specCode: '4.4',
    type: 'short-recall',
    prompt: 'Which UK law makes gaining unauthorised access to a computer system or intentionally spreading malware a criminal offence?',
    acceptedAnswers: ['computer misuse act', 'computer misuse act 1990', 'cma', 'cma 1990'],
    displayAnswer: 'Computer Misuse Act 1990',
    examinerNote: 'The Computer Misuse Act 1990 covers unauthorised access (Section 1), access with criminal intent (Section 2), and unauthorised modification/impairment (Section 3).',
  },
  {
    id: 'wq-ta4-3',
    ta: 'TA4',
    specItemId: 'ta4-3',
    specCode: '4.3',
    type: 'mcq',
    prompt: 'A company stores sensitive patient records on laptops that staff take on home visits. Which security measure ensures stolen data cannot be read if a laptop is lost?',
    options: ['Defragmenting the drive', 'Full-disk Encryption', 'Increasing screen resolution', 'Using a lookup validation rule'],
    correctOptionIndex: 1,
    displayAnswer: 'Full-disk Encryption',
    examinerNote: 'Encryption scrambles plaintext data into unreadable ciphertext so an unauthorised person cannot read files without the decryption key.',
  },
  {
    id: 'wq-ta4-4',
    ta: 'TA4',
    specItemId: 'ta4-4',
    specCode: '4.4',
    type: 'true-false',
    prompt: 'True or False: Under the Data Protection Act 2018 (UK GDPR), businesses are allowed to keep former customers’ personal details forever "just in case".',
    correctBoolean: false,
    displayAnswer: 'False',
    examinerNote: 'The Storage Limitation principle requires organisations to keep personal data for no longer than necessary for the original stated purpose.',
  },
  {
    id: 'wq-ta4-5',
    ta: 'TA4',
    specItemId: 'ta4-2',
    specCode: '4.2',
    type: 'mcq',
    prompt: 'What is the primary goal of a Distributed Denial of Service (DDoS) attack against an e-commerce website?',
    options: [
      'To encrypt individual Word documents on an employee’s USB stick',
      'To flood the server with traffic from many compromised devices so legitimate customers cannot access it',
      'To trick one employee into clicking an email attachment',
      'To automatically fix broken hyperlinks on the site',
    ],
    correctOptionIndex: 1,
    displayAnswer: 'To flood the server with traffic from many compromised devices so legitimate customers cannot access it',
    examinerNote: 'DDoS targets system availability by overwhelming bandwidth or server resources using a botnet of hijacked devices.',
  },
  {
    id: 'wq-ta4-6',
    ta: 'TA4',
    specItemId: 'ta4-5',
    specCode: '4.5',
    type: 'true-false',
    prompt: 'True or False: Under the Copyright, Designs and Patents Act 1988, an original photograph uploaded to a public blog is automatically protected even without a © symbol.',
    correctBoolean: true,
    displayAnswer: 'True',
    examinerNote: 'Copyright arises automatically upon creation of an original work in the UK; copying it without permission or a valid licence (such as Creative Commons) infringes the Act.',
  },

  // TA5 (6 questions)
  {
    id: 'wq-ta5-1',
    ta: 'TA5',
    specItemId: 'ta5-4',
    specCode: '5.4',
    type: 'mcq',
    prompt: 'Why is NFC (Near Field Communication) well suited to contactless payment terminals in shops?',
    options: [
      'It transmits data over 5 kilometres',
      'Its very short range (<10 cm) prevents accidental or distant interception during payment',
      'It provides higher streaming bandwidth than fibre broadband',
      'It requires a manual pairing PIN every time',
    ],
    correctOptionIndex: 1,
    displayAnswer: 'Its very short range (<10 cm) prevents accidental or distant interception during payment',
    examinerNote: 'NFC’s ultra-short operating distance ensures deliberate proximity tap-to-pay and limits remote eavesdropping.',
  },
  {
    id: 'wq-ta5-2',
    ta: 'TA5',
    specItemId: 'ta5-1',
    specCode: '5.1',
    type: 'short-recall',
    prompt: 'What 4-letter acronym stands for Voice over Internet Protocol, enabling real-time phone calls over an internet connection?',
    acceptedAnswers: ['voip', 'v.o.i.p', 'v.o.i.p.'],
    displayAnswer: 'VoIP',
    examinerNote: 'VoIP converts analogue speech into digital packets transmitted over IP networks, reducing international call costs.',
  },
  {
    id: 'wq-ta5-3',
    ta: 'TA5',
    specItemId: 'ta5-2',
    specCode: '5.2',
    type: 'mcq',
    prompt: 'A national charity wants distributed volunteers across the UK to co-edit one live event spreadsheet at the same time from laptops and tablets. Which distribution/storage method fits best?',
    options: ['Cloud-hosted collaborative storage', 'Mailing printed copies each morning', 'Copying files onto a single local USB stick', 'Sending one-way SMS messages'],
    correctOptionIndex: 0,
    displayAnswer: 'Cloud-hosted collaborative storage',
    examinerNote: 'Cloud storage enables real-time multi-user editing, version control, and cross-device access from any internet-connected location.',
  },
  {
    id: 'wq-ta5-4',
    ta: 'TA5',
    specItemId: 'ta5-3',
    specCode: '5.3',
    type: 'true-false',
    prompt: 'True or False: High network latency and low upload bandwidth cause audio lag, freezing video, and dropped frames during video conferencing.',
    correctBoolean: true,
    displayAnswer: 'True',
    examinerNote: 'Real-time video conferencing needs steady upload/download bandwidth and low latency (minimal delay) for smooth two-way speech.',
  },
  {
    id: 'wq-ta5-5',
    ta: 'TA5',
    specItemId: 'ta5-5',
    specCode: '5.5',
    type: 'mcq',
    prompt: 'Which statement accurately explains the "Digital Divide" in an OCR R050 exam answer?',
    options: [
      'Splitting a network cable into two separate ports',
      'The gap between individuals or regions with reliable digital access/skills and those without due to cost, geography, or literacy',
      'Separating Section A and Section B of an exam paper',
      'Blocking pop-up adverts in a web browser',
    ],
    correctOptionIndex: 1,
    displayAnswer: 'The gap between individuals or regions with reliable digital access/skills and those without due to cost, geography, or literacy',
    examinerNote: 'Always mention concrete causes (rural broadband infrastructure, device affordability, age/digital skills) when explaining the digital divide.',
  },
  {
    id: 'wq-ta5-6',
    ta: 'TA5',
    specItemId: 'ta5-4',
    specCode: '5.4',
    type: 'mcq',
    prompt: 'Which wireless technology is best suited for connecting a smartphone to wireless headphones 2 metres away with low power usage?',
    options: ['Bluetooth', '5G Cellular', 'NFC', 'Fibre Optic'],
    correctOptionIndex: 0,
    displayAnswer: 'Bluetooth',
    examinerNote: 'Bluetooth provides short-range (~10 m) low-power Personal Area Network (PAN) pairing for peripherals like headphones and wearables.',
  },

  // TA6 (6 questions)
  {
    id: 'wq-ta6-1',
    ta: 'TA6',
    specItemId: 'ta6-1',
    specCode: '6.1',
    type: 'mcq',
    prompt: 'What are the four official pillars of the Internet of Everything (IoE) in the OCR R050 specification?',
    options: [
      'Hardware, Software, Networks, Cloud',
      'People, Process, Data, Things',
      'Input, Process, Output, Storage',
      'Sensors, Routers, Firewalls, Users',
    ],
    correctOptionIndex: 1,
    displayAnswer: 'People, Process, Data, Things',
    examinerNote: 'IoE extends the Internet of Things by uniting People, Process, Data, and Things into connected decision-making ecosystems.',
  },
  {
    id: 'wq-ta6-2',
    ta: 'TA6',
    specItemId: 'ta6-2',
    specCode: '6.2',
    type: 'short-recall',
    prompt: 'In an automated smart greenhouse, a moisture sensor detects dry soil and sends data to the hub. What component physically opens the water valve to carry out the action?',
    acceptedAnswers: ['actuator', 'actuators'],
    displayAnswer: 'Actuator',
    examinerNote: 'Sensors capture physical measurements (input), whereas Actuators perform physical actions (output) such as opening valves or switching motors.',
  },
  {
    id: 'wq-ta6-3',
    ta: 'TA6',
    specItemId: 'ta6-3',
    specCode: '6.3',
    type: 'mcq',
    prompt: 'How does an IoE wearable heart-rate monitor improve care for an elderly patient living independently at home?',
    options: [
      'It replaces all doctors with offline spreadsheets',
      'It continuously logs vital signs and automatically alerts carers or clinicians if abnormal readings occur',
      'It requires the patient to type readings manually every hour',
      'It eliminates the need for battery charging or internet connectivity',
    ],
    correctOptionIndex: 1,
    displayAnswer: 'It continuously logs vital signs and automatically alerts carers or clinicians if abnormal readings occur',
    examinerNote: 'Continuous remote monitoring enables rapid early intervention while letting patients remain independent.',
  },
  {
    id: 'wq-ta6-4',
    ta: 'TA6',
    specItemId: 'ta6-4',
    specCode: '6.4',
    type: 'true-false',
    prompt: 'True or False: Interoperability means IoE devices from different manufacturers can seamlessly share data and work together on the same platform.',
    correctBoolean: true,
    displayAnswer: 'True',
    examinerNote: 'Poor interoperability forces users into a single vendor’s ecosystem ("vendor lock-in") and makes scaling smart systems expensive.',
  },
  {
    id: 'wq-ta6-5',
    ta: 'TA6',
    specItemId: 'ta6-5',
    specCode: '6.5',
    type: 'mcq',
    prompt: 'Why are inexpensive IoE devices such as smart cameras frequently targeted by cyber criminals to form DDoS botnets?',
    options: [
      'They have the largest hard drives on the network',
      'They often ship with weak default passwords and rarely receive automatic firmware security updates',
      'They only run on wired Ethernet cables',
      'They cannot connect to the internet',
    ],
    correctOptionIndex: 1,
    displayAnswer: 'They often ship with weak default passwords and rarely receive automatic firmware security updates',
    examinerNote: 'Unchanged default credentials and unpatched firmware make IoE devices easy entry points for attackers and botnet malware.',
  },
  {
    id: 'wq-ta6-6',
    ta: 'TA6',
    specItemId: 'ta6-4',
    specCode: '6.4',
    type: 'true-false',
    prompt: 'True or False: If a smart home relies solely on cloud servers with no local fallback, an internet outage can disable remote lighting and heating schedules.',
    correctBoolean: true,
    displayAnswer: 'True',
    examinerNote: 'Dependency on continuous internet connectivity is a classic IoE reliability limitation — good exam answers recommend local manual override or edge fallback.',
  },
];

export function formatLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKeyUtc(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map((v) => Number.parseInt(v, 10));
  return new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
}

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const dt = parseDateKeyUtc(dateKey);
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seedStr: string): T[] {
  const arr = [...items];
  const rand = mulberry32(hashSeed(seedStr));
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface GenerateWarmupOptions {
  dateKey: string;
  mode: WarmupSprintMode;
  topicFilter?: TopicAreaId;
  specRatings?: Record<string, SpecConfidence>;
  bonusSeed?: number;
  count?: number;
}

/**
 * Deterministically builds a 5-question 5-minute warm-up sprint.
 * - 'daily': Balanced cross-topic mix seeded by today's calendar date (prioritising Red/Amber items when available).
 * - 'weak-spots': Strictly prioritises questions linked to Red, then Amber, then Unrated spec items.
 * - 'topic': Focuses on a single Topic Area (TA1–TA6).
 * - 'bonus': Generates a fresh cross-topic mix keyed by bonusSeed.
 */
export function generateDailyWarmupSet(options: GenerateWarmupOptions): WarmupQuestion[] {
  const count = Math.max(1, Math.min(options.count ?? WARMUP_QUESTIONS_PER_SPRINT, WARMUP_QUESTION_BANK.length));
  const ratings = options.specRatings || {};
  const seedBase = `${options.dateKey}|${options.mode}|${options.topicFilter || 'ALL'}|${options.bonusSeed || 0}`;

  if (options.mode === 'topic' && options.topicFilter) {
    const topicPool = WARMUP_QUESTION_BANK.filter((q) => q.ta === options.topicFilter);
    return seededShuffle(topicPool, seedBase).slice(0, count);
  }

  if (options.mode === 'weak-spots') {
    const priorityScore = (q: WarmupQuestion): number => {
      const rating = ratings[q.specItemId] || 'unrated';
      if (rating === 'red') return 3;
      if (rating === 'amber') return 2;
      if (rating === 'unrated') return 1;
      return 0;
    };
    const shuffled = seededShuffle(WARMUP_QUESTION_BANK, seedBase);
    shuffled.sort((a, b) => priorityScore(b) - priorityScore(a));
    return shuffled.slice(0, count);
  }

  // 'daily' or 'bonus': Pick 1 question per distinct Topic Area (shuffled topic order) so students revise across the spec.
  const shuffledTopics = seededShuffle([...TOPIC_ORDER], `${seedBase}|topics`);
  const selected: WarmupQuestion[] = [];
  const usedIds = new Set<string>();

  for (const ta of shuffledTopics) {
    if (selected.length >= count) break;
    const candidates = seededShuffle(
      WARMUP_QUESTION_BANK.filter((q) => q.ta === ta && !usedIds.has(q.id)),
      `${seedBase}|${ta}`
    );
    // Slightly favour red/amber items in daily mode while preserving daily determinism
    candidates.sort((a, b) => {
      const weight = (q: WarmupQuestion) => {
        const r = ratings[q.specItemId] || 'unrated';
        return r === 'red' ? 2 : r === 'amber' ? 1 : 0;
      };
      return weight(b) - weight(a);
    });
    if (candidates[0]) {
      selected.push(candidates[0]);
      usedIds.add(candidates[0].id);
    }
  }

  if (selected.length < count) {
    const remaining = seededShuffle(
      WARMUP_QUESTION_BANK.filter((q) => !usedIds.has(q.id)),
      `${seedBase}|extra`
    );
    for (const q of remaining) {
      if (selected.length >= count) break;
      selected.push(q);
      usedIds.add(q.id);
    }
  }

  return selected;
}

function normalizeRecallInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function evaluateWarmupAnswer(
  question: WarmupQuestion,
  submission: number | boolean | string
): WarmupAnswerEvaluation {
  let isCorrect = false;

  if (question.type === 'mcq') {
    isCorrect = typeof submission === 'number' && submission === question.correctOptionIndex;
  } else if (question.type === 'true-false') {
    isCorrect = typeof submission === 'boolean' && submission === question.correctBoolean;
  } else if (question.type === 'short-recall') {
    const normalized = normalizeRecallInput(String(submission || ''));
    const accepted = (question.acceptedAnswers || []).map(normalizeRecallInput);
    if (normalized.length > 0) {
      isCorrect = accepted.some((ans) => normalized === ans || (ans.length >= 4 && normalized.includes(ans)));
    }
  }

  return {
    isCorrect,
    marksEarned: isCorrect ? 1 : 0,
    maxMarks: 1,
    correctAnswerDisplay: question.displayAnswer,
    feedbackTitle: isCorrect ? 'Correct — +1 Mark' : 'Not Quite — 0 Marks',
    examinerNote: question.examinerNote,
  };
}

export function computeSpecChecklistSummary(
  specRatings: Record<string, SpecConfidence>
): SpecChecklistSummary {
  let greenCount = 0;
  let amberCount = 0;
  let redCount = 0;
  let unratedCount = 0;

  const byTopic: TopicChecklistBreakdown[] = TOPIC_ORDER.map((ta) => {
    const items = SPEC_CHECKLIST_ITEMS.filter((item) => item.ta === ta);
    let g = 0;
    let a = 0;
    let r = 0;
    let u = 0;
    for (const item of items) {
      const rating = specRatings[item.id] || 'unrated';
      if (rating === 'green') g += 1;
      else if (rating === 'amber') a += 1;
      else if (rating === 'red') r += 1;
      else u += 1;
    }
    greenCount += g;
    amberCount += a;
    redCount += r;
    unratedCount += u;
    return {
      ta,
      title: TOPIC_AREA_TITLES[ta],
      total: items.length,
      green: g,
      amber: a,
      red: r,
      unrated: u,
      readyPct: items.length > 0 ? Math.round((g / items.length) * 100) : 0,
    };
  });

  const totalItems = SPEC_CHECKLIST_ITEMS.length;
  const ratedCount = totalItems - unratedCount;
  const readinessPct = totalItems > 0 ? Math.round((greenCount / totalItems) * 100) : 0;
  // Weighted confidence: green = 100%, amber = 50%, red/unrated = 0%
  const confidenceScorePct =
    totalItems > 0 ? Math.round(((greenCount + amberCount * 0.5) / totalItems) * 100) : 0;

  const priorityRank = (rating: SpecConfidence): number => {
    if (rating === 'red') return 0;
    if (rating === 'amber') return 1;
    if (rating === 'unrated') return 2;
    return 3;
  };

  const topPriorities = [...SPEC_CHECKLIST_ITEMS]
    .filter((item) => (specRatings[item.id] || 'unrated') !== 'green')
    .sort((a, b) => {
      const ra = priorityRank(specRatings[a.id] || 'unrated');
      const rb = priorityRank(specRatings[b.id] || 'unrated');
      if (ra !== rb) return ra - rb;
      return a.code.localeCompare(b.code);
    })
    .slice(0, 4);

  return {
    totalItems,
    ratedCount,
    greenCount,
    amberCount,
    redCount,
    unratedCount,
    readinessPct,
    confidenceScorePct,
    byTopic,
    topPriorities,
  };
}

export function computeStreakSummary(
  sessions: WarmupSessionRecord[],
  todayDateKey: string = formatLocalDateKey()
): StreakSummary {
  const byDate = new Map<string, WarmupSessionRecord[]>();
  let totalQuestions = 0;
  let totalMarks = 0;

  for (const s of sessions) {
    if (!s || !s.dateKey) continue;
    const list = byDate.get(s.dateKey) || [];
    list.push(s);
    byDate.set(s.dateKey, list);
    totalQuestions += s.total || 0;
    totalMarks += s.score || 0;
  }

  const uniqueDates = Array.from(byDate.keys()).sort(); // ascending YYYY-MM-DD

  // Best streak across all recorded dates
  let bestStreak = 0;
  let run = 0;
  let prevDate: string | null = null;
  for (const dk of uniqueDates) {
    if (prevDate && shiftDateKey(prevDate, 1) === dk) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > bestStreak) bestStreak = run;
    prevDate = dk;
  }

  // Current streak ending today or yesterday
  const completedToday = byDate.has(todayDateKey);
  const yesterdayKey = shiftDateKey(todayDateKey, -1);
  let currentStreak = 0;
  if (completedToday || byDate.has(yesterdayKey)) {
    let cursor = completedToday ? todayDateKey : yesterdayKey;
    while (byDate.has(cursor)) {
      currentStreak += 1;
      cursor = shiftDateKey(cursor, -1);
    }
  }

  const todayList = byDate.get(todayDateKey) || [];
  let todayBestScore: number | null = null;
  let todayBestTotal: number | null = null;
  for (const s of todayList) {
    if (todayBestScore === null || s.score > todayBestScore) {
      todayBestScore = s.score;
      todayBestTotal = s.total;
    }
  }

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const last7Days: StreakDayCell[] = [];
  for (let offset = -6; offset <= 0; offset += 1) {
    const dk = shiftDateKey(todayDateKey, offset);
    const dt = parseDateKeyUtc(dk);
    const daySessions = byDate.get(dk) || [];
    let bestScore: number | null = null;
    let bestTotal: number | null = null;
    for (const s of daySessions) {
      if (bestScore === null || s.score > bestScore) {
        bestScore = s.score;
        bestTotal = s.total;
      }
    }
    last7Days.push({
      dateKey: dk,
      weekdayShort: WEEKDAYS[dt.getUTCDay()],
      dayNum: dt.getUTCDate(),
      completed: daySessions.length > 0,
      bestScore,
      bestTotal,
      isToday: dk === todayDateKey,
    });
  }

  return {
    currentStreak,
    bestStreak,
    completedToday,
    todaySessionsCount: todayList.length,
    todayBestScore,
    todayBestTotal,
    totalCompletedSessions: sessions.length,
    totalQuestionsAnswered: totalQuestions,
    overallAccuracyPct: totalQuestions > 0 ? Math.round((totalMarks / totalQuestions) * 100) : null,
    last7Days,
  };
}

export function formatCountdownMmSs(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function filterSpecChecklistItems(
  items: SpecChecklistItem[],
  ratings: Record<string, SpecConfidence>,
  topicFilter: 'ALL' | TopicAreaId,
  confidenceFilter: 'all' | SpecConfidence,
  searchQuery: string
): SpecChecklistItem[] {
  const q = searchQuery.trim().toLowerCase();
  return items.filter((item) => {
    if (topicFilter !== 'ALL' && item.ta !== topicFilter) return false;
    const rating = ratings[item.id] || 'unrated';
    if (confidenceFilter !== 'all' && rating !== confidenceFilter) return false;
    if (!q) return true;
    const haystack = [
      item.code,
      item.ta,
      TOPIC_AREA_TITLES[item.ta],
      item.title,
      item.specDetail,
      item.examTip,
      ...item.keyTerms,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

function escapeCsvCell(val: string): string {
  if (/[",\n\r]/.test(val)) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function buildSpecChecklistCsv(
  specRatings: Record<string, SpecConfidence>,
  streak: StreakSummary
): string {
  const header = ['Topic Area', 'Spec Code', 'Checkpoint', 'Confidence Status', 'Key Terms', 'Examiner Tip'];
  const labelMap: Record<SpecConfidence, string> = {
    green: 'Exam Ready (Green)',
    amber: 'Reviewing (Amber)',
    red: 'Needs Revision (Red)',
    unrated: 'Not Rated',
  };
  const rows = SPEC_CHECKLIST_ITEMS.map((item) => {
    const status = specRatings[item.id] || 'unrated';
    return [
      `${item.ta} - ${TOPIC_AREA_TITLES[item.ta]}`,
      item.code,
      item.title,
      labelMap[status],
      item.keyTerms.join('; '),
      item.examTip,
    ].map(escapeCsvCell);
  });
  const summaryFooter = [
    [],
    ['Daily Warm-Up Streak (Days)', String(streak.currentStreak)],
    ['Best Streak (Days)', String(streak.bestStreak)],
    ['Completed Warm-Ups', String(streak.totalCompletedSessions)],
    ['Overall Warm-Up Accuracy', streak.overallAccuracyPct !== null ? `${streak.overallAccuracyPct}%` : 'N/A'],
  ].map((r) => r.map(escapeCsvCell).join(','));

  return [header.map(escapeCsvCell).join(','), ...rows.map((r) => r.join(',')), ...summaryFooter].join('\n');
}
