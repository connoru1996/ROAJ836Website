export type TopicAreaCode = 'TA1' | 'TA2' | 'TA3' | 'TA4' | 'TA5' | 'TA6';

export type OcrCommandWord =
  | 'Identify / State'
  | 'Define'
  | 'Outline'
  | 'Describe'
  | 'Explain'
  | 'Compare'
  | 'Justify'
  | 'Discuss / Evaluate';

export interface CommandWordGuide {
  word: OcrCommandWord;
  typicalMarks: string;
  markFormula: string;
  sentenceStarter: string;
  classicTrap: string;
}

export interface FixAnswerFlawOption {
  id: string;
  label: string;
  isTrueFlaw: boolean;
  reason: string;
}

export interface FixAnswerPatchOption {
  id: string;
  text: string;
  isBestUpgrade: boolean;
  examinerNote: string;
}

export interface FixAnswerPatchSlot {
  id: string;
  slotTitle: string;
  weakFragment: string;
  options: FixAnswerPatchOption[];
}

export interface FreeRewriteCriterion {
  id: string;
  label: string;
  anyKeywords: string[];
}

export interface FixAnswerCase {
  id: string;
  topicArea: TopicAreaCode;
  scenario: string;
  commandWord: OcrCommandWord;
  maxMarks: number;
  weakMarks: number;
  questionPrompt: string;
  weakAnswer: string;
  weakExaminerNote: string;
  flawOptions: FixAnswerFlawOption[];
  patchSlots: FixAnswerPatchSlot[];
  assembleUpgradedAnswer: (chosenTexts: Record<string, string>) => string;
  modelFullMarkAnswer: string;
  freeRewriteRubric: FreeRewriteCriterion[];
  bannedVaguePhrases: string[];
}

export interface CommandWordDrill {
  id: string;
  topicArea: TopicAreaCode;
  marks: number;
  scenario: string;
  questionStem: string;
  commandOptions: OcrCommandWord[];
  correctCommand: OcrCommandWord;
  formulaOptions: string[];
  correctFormula: string;
  examinerTip: string;
}

export interface ExaminerScriptClause {
  text: string;
  credit: 'awarded' | 'missed';
  tag: string;
  note: string;
}

export interface ExaminerMarkingCase {
  id: string;
  topicArea: TopicAreaCode;
  commandWord: OcrCommandWord;
  maxMarks: number;
  scenario: string;
  questionPrompt: string;
  markSchemePoints: string[];
  candidateScript: string;
  correctMarks: number;
  reasonOptions: string[];
  correctReason: string;
  annotatedClauses: ExaminerScriptClause[];
  examinerVerdict: string;
}

export interface VaguePhraseItem {
  id: string;
  topicArea: TopicAreaCode;
  scenarioHint: string;
  weakPhrase: string;
  options: Array<{
    id: string;
    text: string;
    isExamReady: boolean;
    feedback: string;
  }>;
}

export interface VaguePhraseSet {
  id: string;
  title: string;
  topicBand: string;
  description: string;
  items: VaguePhraseItem[];
}

export interface CommandDrillsProgress {
  completedFixCases: Record<string, boolean>;
  completedCommandDrills: Record<string, boolean>;
  completedExaminerCases: Record<string, boolean>;
  completedVagueSets: Record<string, boolean>;
}

export interface CommandDrillsMasterySummary {
  fixDone: number;
  fixTotal: number;
  commandDone: number;
  commandTotal: number;
  examinerDone: number;
  examinerTotal: number;
  vagueDone: number;
  vagueTotal: number;
  completedChallenges: number;
  totalChallenges: number;
  masteryPct: number;
}

export const COMMAND_WORD_GUIDES: CommandWordGuide[] = [
  {
    word: 'Identify / State',
    typicalMarks: '1–2 Marks',
    markFormula: '1 mark per distinct valid fact, component, or term (no long essay needed).',
    sentenceStarter: '"A Range Check." / "Two-Factor Authentication."',
    classicTrap: 'Writing the same point twice in different words or wasting 5 minutes explaining a 1-mark question.',
  },
  {
    word: 'Define',
    typicalMarks: '1–2 Marks',
    markFormula: 'Give the exact technical meaning of an IT term using precise OCR vocabulary.',
    sentenceStarter: '"Validation is an automated check that ensures entered data is sensible and follows set rules..."',
    classicTrap: 'Giving an example instead of a definition, or confusing paired terms like Validation vs Verification.',
  },
  {
    word: 'Outline',
    typicalMarks: '2 Marks',
    markFormula: 'Brief summary of main features or steps (1 mark per clear point without deep evaluation).',
    sentenceStarter: '"First, the sensor captures real-time energy usage; then the hub transmits it to the supplier..."',
    classicTrap: 'Writing a single word when a short phrase showing how it works is required.',
  },
  {
    word: 'Describe',
    typicalMarks: '2–4 Marks',
    markFormula: 'Paint a clear picture of HOW a feature, tool, or process works (1 mark per linked step/feature).',
    sentenceStarter: '"A wireframe uses simple boxes and placeholder labels to show the layout and navigation of each screen..."',
    classicTrap: 'Naming a feature without saying what it actually looks like or does in the scenario.',
  },
  {
    word: 'Explain',
    typicalMarks: '2–6 Marks',
    markFormula: 'Point (AO1) + Linked Development / "because / which means / therefore" impact in context (AO2).',
    sentenceStarter: '"Using AES encryption scrambles customer card details so that if intercepted, attackers cannot read them without the key."',
    classicTrap: 'Stopping after the first mark (making a point without explaining the cause or consequence).',
  },
  {
    word: 'Compare',
    typicalMarks: '4–6 Marks',
    markFormula: 'Explicitly contrast BOTH options using comparative connectives ("whereas", "however", "in contrast").',
    sentenceStarter: '"Cloud storage allows staff to access files remotely from any device, whereas local storage requires physical access to the office server..."',
    classicTrap: 'Only describing Option A and forgetting to state how Option B differs.',
  },
  {
    word: 'Justify',
    typicalMarks: '2–4 Marks',
    markFormula: 'Give clear scenario-linked reasons WHY a specific choice/decision is the best fit for the user.',
    sentenceStarter: '"Boundary data (18 and 99) must be tested because coding errors often use < instead of <= and reject valid edge users."',
    classicTrap: 'Stating what the item is rather than arguing WHY it is appropriate for this specific brief.',
  },
  {
    word: 'Discuss / Evaluate',
    typicalMarks: '6–9 Marks',
    markFormula: 'Balanced AO1 knowledge + AO2 scenario pros AND cons + AO3 reasoned final judgement/recommendation.',
    sentenceStarter: '"Although biometric logins speed up gym entry, hardware costs are higher; overall, SwiftFit should adopt..."',
    classicTrap: 'Giving a one-sided list of benefits with no drawbacks and no justified conclusion (caps at Level 1/2).',
  },
];

export const FIX_ANSWER_CASES: FixAnswerCase[] = [
  {
    id: 'fix-ta4-encryption',
    topicArea: 'TA4',
    scenario: 'GreenLeaf Online Checkout',
    commandWord: 'Explain',
    maxMarks: 2,
    weakMarks: 0,
    questionPrompt: 'Explain why GreenLeaf should use encryption when transmitting customer payment details over the internet. [2 marks]',
    weakAnswer: 'Encryption stops hackers from stealing or intercepting customer payment details.',
    weakExaminerNote: '0/2 Marks: Common OCR misconception — encryption does NOT prevent data from being intercepted; it protects confidentiality if intercepted.',
    flawOptions: [
      {
        id: 'f1',
        label: 'Claims encryption stops interception (factually inaccurate in OCR mark schemes)',
        isTrueFlaw: true,
        reason: 'Correct — attackers can still intercept encrypted packets; encryption makes the data unreadable without the key.',
      },
      {
        id: 'f2',
        label: 'Fails to mention scrambling / ciphertext and needing a decryption key',
        isTrueFlaw: true,
        reason: 'Correct — naming the scrambling mechanism and decryption key unlocks the AO1 + AO2 marks.',
      },
      {
        id: 'f3',
        label: 'Forgot to include a diagram of a firewall',
        isTrueFlaw: false,
        reason: 'Not needed — this is a 2-mark Explain question on encryption, not firewalls or diagrams.',
      },
      {
        id: 'f4',
        label: 'Did not write at least 150 words',
        isTrueFlaw: false,
        reason: 'OCR 2-mark questions only need 1–2 concise, technically accurate sentences.',
      },
    ],
    patchSlots: [
      {
        id: 'slot-mech',
        slotTitle: '1. Fix the technical mechanism (AO1 — 1 mark)',
        weakFragment: 'Encryption stops hackers from stealing...',
        options: [
          {
            id: 'm-a',
            text: 'Encryption scrambles customer payment details into unreadable ciphertext during transmission',
            isBestUpgrade: true,
            examinerNote: 'Spot-on AO1 mark: accurately states that encryption scrambles plaintext into unreadable ciphertext.',
          },
          {
            id: 'm-b',
            text: 'Encryption deletes customer payment details before hackers can see them',
            isBestUpgrade: false,
            examinerNote: 'Incorrect — encryption converts data reversibly; deleting it would break checkout.',
          },
          {
            id: 'm-c',
            text: 'Encryption makes the website safer and more secure against viruses',
            isBestUpgrade: false,
            examinerNote: 'Too vague ("safer/secure") and confuses encryption with anti-malware.',
          },
        ],
      },
      {
        id: 'slot-impact',
        slotTitle: '2. Add linked consequence ("so that...") (AO2 — 1 mark)',
        weakFragment: '...or intercepting customer payment details.',
        options: [
          {
            id: 'i-a',
            text: 'so that even if a cyber-criminal intercepts the packets, the card data cannot be understood or misused without the decryption key.',
            isBestUpgrade: true,
            examinerNote: 'Full AO2 mark: clearly explains the consequence if intercepted and names the decryption key.',
          },
          {
            id: 'i-b',
            text: 'so the checkout page loads faster for GreenLeaf customers.',
            isBestUpgrade: false,
            examinerNote: 'Wrong impact — encryption adds slight overhead; it protects confidentiality, not speed.',
          },
          {
            id: 'i-c',
            text: 'so customers know the business is professional.',
            isBestUpgrade: false,
            examinerNote: 'Too generic — does not explain how encryption protects the transmitted payment data.',
          },
        ],
      },
    ],
    assembleUpgradedAnswer: (chosen) => `${chosen['slot-mech']} ${chosen['slot-impact']}`,
    modelFullMarkAnswer:
      'Encryption scrambles customer payment details into unreadable ciphertext during transmission so that even if a cyber-criminal intercepts the packets, the card data cannot be understood or misused without the decryption key.',
    freeRewriteRubric: [
      { id: 'r1', label: 'Mechanism: scrambles / converts data into unreadable ciphertext', anyKeywords: ['scrambl', 'cipher', 'unreadab', 'code', 'encode'] },
      { id: 'r2', label: 'Impact: useless if intercepted without decryption key', anyKeywords: ['key', 'decrypt', 'intercept', 'cannot read', 'meaningless'] },
    ],
    bannedVaguePhrases: ['stops hackers', 'safer', 'more secure'],
  },
  {
    id: 'fix-ta3-validation',
    topicArea: 'TA3',
    scenario: 'Online Bank Savings Account',
    commandWord: 'Explain',
    maxMarks: 2,
    weakMarks: 0,
    questionPrompt: 'Explain why a Format Check on Date of Birth (DD/MM/YYYY) cannot guarantee that the customer entered their real birthday. [2 marks]',
    weakAnswer: 'Validation makes sure the customer date of birth is accurate and right.',
    weakExaminerNote: '0/2 Marks: Directly contradicts the OCR definition — Validation checks sensibility/rules, NEVER factual accuracy!',
    flawOptions: [
      {
        id: 'f1',
        label: 'Confuses Validation (sensible/follows format) with Verification (factual accuracy)',
        isTrueFlaw: true,
        reason: 'Correct — OCR examiners specifically test whether you know Validation only checks rules, not truth.',
      },
      {
        id: 'f2',
        label: 'Gives no concrete example of a sensible typo that passes the format rule',
        isTrueFlaw: true,
        reason: 'Correct — giving a concrete valid-format typo (e.g., 14/08/2008 instead of 14/03/2008) locks in the second mark.',
      },
      {
        id: 'f3',
        label: 'Forgot to mention Boolean data types',
        isTrueFlaw: false,
        reason: 'Irrelevant — Date of Birth uses Date/String format checking, not Boolean.',
      },
    ],
    patchSlots: [
      {
        id: 'slot-rule',
        slotTitle: '1. State what Format Validation actually checks (AO1 — 1 mark)',
        weakFragment: 'Validation makes sure the customer date of birth is accurate...',
        options: [
          {
            id: 'r-a',
            text: 'A Format Check only verifies that the input follows the required DD/MM/YYYY pattern and is sensible',
            isBestUpgrade: true,
            examinerNote: 'Accurate AO1 mark: clearly separates format/sensibility from factual truth.',
          },
          {
            id: 'r-b',
            text: 'A Format Check checks the government database to verify the date of birth',
            isBestUpgrade: false,
            examinerNote: 'Incorrect — Format Check only checks character pattern, not external identity records.',
          },
          {
            id: 'r-c',
            text: 'A Format Check makes sure the box is not left blank',
            isBestUpgrade: false,
            examinerNote: 'That describes a Presence Check, not a Format Check.',
          },
        ],
      },
      {
        id: 'slot-example',
        slotTitle: '2. Explain why a real typo still slips through (AO2 — 1 mark)',
        weakFragment: '...and right.',
        options: [
          {
            id: 'e-a',
            text: 'so a mistyped date like 14/08/2008 instead of 14/03/2008 still passes validation even though it is factually inaccurate — Verification (such as double entry or proofreading) is needed to check accuracy.',
            isBestUpgrade: true,
            examinerNote: 'Exemplary AO2 development with a concrete typo and explicit link to Verification.',
          },
          {
            id: 'e-b',
            text: 'so hackers cannot type letters into the box.',
            isBestUpgrade: false,
            examinerNote: 'Does not answer why a customer’s real birthday isn’t guaranteed.',
          },
          {
            id: 'e-c',
            text: 'because computers always make mistakes when saving dates.',
            isBestUpgrade: false,
            examinerNote: 'Inaccurate — the issue is human data-entry error passing a valid pattern.',
          },
        ],
      },
    ],
    assembleUpgradedAnswer: (chosen) => `${chosen['slot-rule']}, ${chosen['slot-example']}`,
    modelFullMarkAnswer:
      'A Format Check only verifies that the input follows the required DD/MM/YYYY pattern and is sensible, so a mistyped date like 14/08/2008 instead of 14/03/2008 still passes validation even though it is factually inaccurate — Verification (such as double entry or proofreading) is needed to check accuracy.',
    freeRewriteRubric: [
      { id: 'r1', label: 'Validation only checks rules / pattern / sensibility (not accuracy)', anyKeywords: ['sensib', 'pattern', 'rule', 'format', 'not accur'] },
      { id: 'r2', label: 'Wrong date in valid format passes / needs Verification', anyKeywords: ['typo', 'wrong date', 'mistyp', 'verif', 'proofread', 'double entry', '2008', 'different date'] },
    ],
    bannedVaguePhrases: ['is accurate', 'is right', 'always works'],
  },
  {
    id: 'fix-ta1-wireframe',
    topicArea: 'TA1',
    scenario: 'Progress Fitness Centre Booking App',
    commandWord: 'Explain',
    maxMarks: 2,
    weakMarks: 0,
    questionPrompt: 'Explain one reason why designers create a Wireframe before coding the Progress Fitness booking screen. [2 marks]',
    weakAnswer: 'A wireframe shows the final colours, fonts, and gym logo so the client likes how it looks.',
    weakExaminerNote: '0/2 Marks: Confuses a Wireframe with a Visualisation Diagram! Wireframes are intentionally low-fidelity and greyscale.',
    flawOptions: [
      {
        id: 'f1',
        label: 'Confuses Wireframe (structure/layout/navigation) with Visualisation Diagram (colours/fonts/branding)',
        isTrueFlaw: true,
        reason: 'Correct — OCR explicitly penalises describing colours/logos as part of a Wireframe.',
      },
      {
        id: 'f2',
        label: 'Misses the benefit of early structural feedback before costly coding begins',
        isTrueFlaw: true,
        reason: 'Correct — linking low-fidelity layout planning to saving development time/rework earns the Explain mark.',
      },
      {
        id: 'f3',
        label: 'Did not list ISO 5807 flowchart symbols',
        isTrueFlaw: false,
        reason: 'Not relevant — flowcharts model process logic, whereas wireframes plan UI layout.',
      },
    ],
    patchSlots: [
      {
        id: 'slot-def',
        slotTitle: '1. State the true purpose of a Wireframe (AO1 — 1 mark)',
        weakFragment: 'A wireframe shows the final colours, fonts, and gym logo...',
        options: [
          {
            id: 'w-a',
            text: 'A wireframe provides a low-fidelity blueprint of screen layout, button placement, and navigation hierarchy without distracting colours or styling',
            isBestUpgrade: true,
            examinerNote: 'Clear AO1 mark: accurately defines low-fidelity structure and navigation.',
          },
          {
            id: 'w-b',
            text: 'A wireframe is the finished HTML code for the gym website',
            isBestUpgrade: false,
            examinerNote: 'Incorrect — wireframes are pre-development design tools, not finished code.',
          },
          {
            id: 'w-c',
            text: 'A wireframe brainstorms keywords radiating from a central node',
            isBestUpgrade: false,
            examinerNote: 'That describes a Mind Map, not a Wireframe.',
          },
        ],
      },
      {
        id: 'slot-why',
        slotTitle: '2. Link to client approval / development efficiency (AO2 — 1 mark)',
        weakFragment: '...so the client likes how it looks.',
        options: [
          {
            id: 'y-a',
            text: 'so Progress Fitness can review usability and request layout changes early, avoiding expensive rework once programming has started.',
            isBestUpgrade: true,
            examinerNote: 'Strong AO2 link to the client scenario and cost/time saved before coding.',
          },
          {
            id: 'y-b',
            text: 'so the app automatically passes cyber-security tests.',
            isBestUpgrade: false,
            examinerNote: 'Unrelated — wireframes plan HCI layout, not cyber security.',
          },
          {
            id: 'y-c',
            text: 'because it looks nicer.',
            isBestUpgrade: false,
            examinerNote: 'Too vague and ignores the low-fidelity nature of wireframes.',
          },
        ],
      },
    ],
    assembleUpgradedAnswer: (chosen) => `${chosen['slot-def']} ${chosen['slot-why']}`,
    modelFullMarkAnswer:
      'A wireframe provides a low-fidelity blueprint of screen layout, button placement, and navigation hierarchy without distracting colours or styling so Progress Fitness can review usability and request layout changes early, avoiding expensive rework once programming has started.',
    freeRewriteRubric: [
      { id: 'r1', label: 'Low-fidelity layout / structure / navigation placement (no colours)', anyKeywords: ['layout', 'structur', 'navigat', 'low-fidelity', 'placeholder', 'position', 'wireframe'] },
      { id: 'r2', label: 'Early client feedback / saves coding rework time or cost', anyKeywords: ['feedback', 'change', 'rework', 'before coding', 'save time', 'cost', 'client'] },
    ],
    bannedVaguePhrases: ['looks nicer', 'final colours', 'gym logo'],
  },
  {
    id: 'fix-ta2-accessibility',
    topicArea: 'TA2',
    scenario: 'Sports Centre Online Booking App',
    commandWord: 'Describe',
    maxMarks: 3,
    weakMarks: 0,
    questionPrompt: 'Describe how the sports centre booking app can be designed to be accessible for visually impaired members. [3 marks]',
    weakAnswer: 'Make the app accessible by making it easy to use and clear for everyone.',
    weakExaminerNote: '0/3 Marks: "Easy to use" and "clear" are banned vague phrases in OCR TA2 mark schemes — you must name concrete HCI features and how they assist visually impaired users.',
    flawOptions: [
      {
        id: 'f1',
        label: 'Uses generic banned phrase "easy to use" with zero specific HCI features',
        isTrueFlaw: true,
        reason: 'Correct — OCR requires named accessibility tools (screen reader compatibility, high contrast, resizable fonts, alt text).',
      },
      {
        id: 'f2',
        label: 'Does not explain HOW each feature helps visually impaired users book a class',
        isTrueFlaw: true,
        reason: 'Correct — 3 marks require naming concrete features AND describing their effect for visually impaired members.',
      },
      {
        id: 'f3',
        label: 'Forgot to discuss cloud hosting tariffs',
        isTrueFlaw: false,
        reason: 'Off-topic — TA2 focuses on HCI usability and accessibility.',
      },
    ],
    patchSlots: [
      {
        id: 'slot-feat1',
        slotTitle: '1. Name a visual contrast / text control (1 mark)',
        weakFragment: 'Make the app accessible by making it easy to use...',
        options: [
          {
            id: 'a-1',
            text: 'Provide high-contrast colour themes and resizable sans-serif text so members with low vision can read class times clearly',
            isBestUpgrade: true,
            examinerNote: 'Earns credit for specific visual HCI controls linked to reading class schedules.',
          },
          {
            id: 'a-2',
            text: 'Use bright neon flashing colours so the buttons stand out',
            isBestUpgrade: false,
            examinerNote: 'Poor accessibility practice — flashing neon colours harm legibility and can trigger seizures.',
          },
          {
            id: 'a-3',
            text: 'Make the website good and simple to navigate',
            isBestUpgrade: false,
            examinerNote: 'Still vague — names no actual accessibility control.',
          },
        ],
      },
      {
        id: 'slot-feat2',
        slotTitle: '2. Add assistive technology support + scenario impact (2 marks)',
        weakFragment: '...and clear for everyone.',
        options: [
          {
            id: 'b-1',
            text: 'and include descriptive alt-text on icons plus full screen-reader / text-to-speech compatibility so blind users can hear button labels and book sports sessions independently.',
            isBestUpgrade: true,
            examinerNote: 'Full 3/3 marks: combines alt-text + screen reader support tied directly to booking sessions.',
          },
          {
            id: 'b-2',
            text: 'and add background music to welcome members.',
            isBestUpgrade: false,
            examinerNote: 'Background music actually interferes with screen readers!',
          },
          {
            id: 'b-3',
            text: 'and force users to type long postcodes twice.',
            isBestUpgrade: false,
            examinerNote: 'That is Double-Entry Verification (TA3), not a visual accessibility aid.',
          },
        ],
      },
    ],
    assembleUpgradedAnswer: (chosen) => `${chosen['slot-feat1']}, ${chosen['slot-feat2']}`,
    modelFullMarkAnswer:
      'Provide high-contrast colour themes and resizable sans-serif text so members with low vision can read class times clearly, and include descriptive alt-text on icons plus full screen-reader / text-to-speech compatibility so blind users can hear button labels and book sports sessions independently.',
    freeRewriteRubric: [
      { id: 'r1', label: 'Named visual aid (high contrast / resizable text / magnification)', anyKeywords: ['contrast', 'resiz', 'font size', 'zoom', 'magnif', 'large text'] },
      { id: 'r2', label: 'Assistive tech (screen reader / text-to-speech / alt-text)', anyKeywords: ['screen reader', 'text-to-speech', 'alt text', 'alt-text', 'audio', 'voice'] },
      { id: 'r3', label: 'Linked to visually impaired members booking classes', anyKeywords: ['book', 'class', 'session', 'visually impaired', 'blind', 'low vision', 'hear'] },
    ],
    bannedVaguePhrases: ['easy to use', 'user friendly', 'clear for everyone'],
  },
  {
    id: 'fix-ta5-cloud',
    topicArea: 'TA5',
    scenario: 'Westwood Catering Client Records',
    commandWord: 'Compare',
    maxMarks: 4,
    weakMarks: 1,
    questionPrompt: 'Compare Cloud Storage and Local Server Storage for Westwood Catering when managing event bookings. [4 marks]',
    weakAnswer: 'Cloud storage is good because staff can access booking files from anywhere on any device.',
    weakExaminerNote: '1/4 Marks: One-sided! The command word is COMPARE — you only gave one benefit of Cloud and never contrasted it with Local Storage or trade-offs.',
    flawOptions: [
      {
        id: 'f1',
        label: 'Only mentions Cloud Storage — completely omits Local Storage comparison',
        isTrueFlaw: true,
        reason: 'Correct — "Compare" requires direct contrast of BOTH options using words like "whereas" or "however".',
      },
      {
        id: 'f2',
        label: 'Only covers remote access (1 point) and omits a second comparison criterion such as cost, internet dependency, or security control',
        isTrueFlaw: true,
        reason: 'Correct — a 4-mark Compare needs 2 distinct comparative pairs (2 × 2 marks).',
      },
      {
        id: 'f3',
        label: 'Did not explain how Bluetooth pairing works',
        isTrueFlaw: false,
        reason: 'Off-topic — the question asks to compare Cloud vs Local storage.',
      },
    ],
    patchSlots: [
      {
        id: 'slot-pair1',
        slotTitle: '1. Complete Comparison Pair 1: Accessibility (2 marks)',
        weakFragment: 'Cloud storage is good because staff can access booking files from anywhere...',
        options: [
          {
            id: 'c-1',
            text: 'Cloud storage allows Westwood Catering staff to access and update event bookings remotely at venues via the internet, whereas local server storage restricts direct access to devices connected to the office network unless a VPN is configured.',
            isBestUpgrade: true,
            examinerNote: 'Clean 2-mark comparative pair using "whereas" with scenario context.',
          },
          {
            id: 'c-2',
            text: 'Cloud storage lets you open files anywhere and is much better than local storage.',
            isBestUpgrade: false,
            examinerNote: '"Much better" does not explain how local storage actually differs.',
          },
          {
            id: 'c-3',
            text: 'Cloud storage uses the cloud while local storage uses local computers.',
            isBestUpgrade: false,
            examinerNote: 'Circular restatement of the question — earns 0 marks.',
          },
        ],
      },
      {
        id: 'slot-pair2',
        slotTitle: '2. Add Comparison Pair 2: Connectivity / Cost / Control (2 marks)',
        weakFragment: '(Missing second comparative pair)',
        options: [
          {
            id: 'd-1',
            text: 'However, cloud storage relies on a stable internet connection and ongoing subscription fees, whereas local storage works offline at the office and gives Westwood full physical control over hardware — though they must manage their own backups and maintenance.',
            isBestUpgrade: true,
            examinerNote: 'Full 4/4 marks: balanced contrast covering connectivity, ongoing cost, and backup responsibility.',
          },
          {
            id: 'd-2',
            text: 'Also, cloud storage is cheaper and faster in every way.',
            isBestUpgrade: false,
            examinerNote: 'Over-generalised and ignores ongoing subscription costs and offline/bandwidth limits.',
          },
          {
            id: 'd-3',
            text: 'Local servers are old fashioned so nobody uses them anymore.',
            isBestUpgrade: false,
            examinerNote: 'Inaccurate assertion with no technical comparison.',
          },
        ],
      },
    ],
    assembleUpgradedAnswer: (chosen) => `${chosen['slot-pair1']} ${chosen['slot-pair2']}`,
    modelFullMarkAnswer:
      'Cloud storage allows Westwood Catering staff to access and update event bookings remotely at venues via the internet, whereas local server storage restricts direct access to devices connected to the office network unless a VPN is configured. However, cloud storage relies on a stable internet connection and ongoing subscription fees, whereas local storage works offline at the office and gives Westwood full physical control over hardware — though they must manage their own backups and maintenance.',
    freeRewriteRubric: [
      { id: 'r1', label: 'Cloud remote access vs Local office/LAN limitation', anyKeywords: ['remote', 'anywhere', 'office', 'lan', 'venue'] },
      { id: 'r2', label: 'Explicit comparative connective ("whereas", "however", "while", "in contrast")', anyKeywords: ['whereas', 'however', 'in contrast', 'while', 'unlike'] },
      { id: 'r3', label: 'Second trade-off (internet dependency, subscription vs upfront hardware/backups)', anyKeywords: ['internet', 'offline', 'subscription', 'backup', 'maintenance', 'control'] },
    ],
    bannedVaguePhrases: ['much better', 'is good', 'cheaper and faster'],
  },
  {
    id: 'fix-ta6-ioe',
    topicArea: 'TA6',
    scenario: 'Energy Supplier Smart Meter Device',
    commandWord: 'Explain',
    maxMarks: 3,
    weakMarks: 0,
    questionPrompt: 'Explain how the four pillars of the Internet of Everything (IoE) work together in a home smart energy meter. [3 marks]',
    weakAnswer: 'Smart meters use the internet to automatically save people money on electricity.',
    weakExaminerNote: '0/3 Marks: Never names the IoE pillars (Things, Data, Process, People) or explains how sensor data flows into automated action/decisions.',
    flawOptions: [
      {
        id: 'f1',
        label: 'Fails to reference the IoE pillars (Things/Sensors, Data, Process, People)',
        isTrueFlaw: true,
        reason: 'Correct — TA6 IoE questions expect explicit links to the 4 pillars and sensor/data flow.',
      },
      {
        id: 'f2',
        label: 'Does not explain HOW electricity savings actually happen (capture → transmit/analyse → user/automated decision)',
        isTrueFlaw: true,
        reason: 'Correct — simply claiming it "saves money" skips the technical explanation.',
      },
      {
        id: 'f3',
        label: 'Forgot to include a Gantt chart',
        isTrueFlaw: false,
        reason: 'Not relevant — this is a TA6 IoE architecture question.',
      },
    ],
    patchSlots: [
      {
        id: 'slot-capture',
        slotTitle: '1. Link Things + Data pillars (1–2 marks)',
        weakFragment: 'Smart meters use the internet...',
        options: [
          {
            id: 'ioe-1',
            text: 'The smart meter (Thing) uses built-in sensors to measure real-time electricity consumption (Data) and transmits readings over a wireless network to the energy supplier',
            isBestUpgrade: true,
            examinerNote: 'Clearly maps Things + Sensors + real-time Data transmission.',
          },
          {
            id: 'ioe-2',
            text: 'The smart meter plugs into Wi-Fi and turns off all appliances randomly',
            isBestUpgrade: false,
            examinerNote: 'Inaccurate — smart meters measure usage and send data; they do not randomly switch off appliances.',
          },
          {
            id: 'ioe-3',
            text: 'Smart meters are modern gadgets connected to the web',
            isBestUpgrade: false,
            examinerNote: 'Too vague — fails to identify sensors, data capture, or IoE pillars.',
          },
        ],
      },
      {
        id: 'slot-action',
        slotTitle: '2. Link Process + People pillars for energy reduction (1–2 marks)',
        weakFragment: '...to automatically save people money on electricity.',
        options: [
          {
            id: 'ioe-b1',
            text: 'where automated billing software (Process) calculates live tariff costs and displays alerts on an in-home display so householders (People) can shift high-energy tasks to off-peak times.',
            isBestUpgrade: true,
            examinerNote: 'Full 3/3 marks: completes all 4 IoE pillars with a concrete cause-and-effect chain.',
          },
          {
            id: 'ioe-b2',
            text: 'so bills go down immediately.',
            isBestUpgrade: false,
            examinerNote: 'Does not explain the Process or People actions that lead to lower usage.',
          },
          {
            id: 'ioe-b3',
            text: 'using a flowchart symbol to draw the tariff.',
            isBestUpgrade: false,
            examinerNote: 'Confuses TA1 design tools with TA6 IoE operation.',
          },
        ],
      },
    ],
    assembleUpgradedAnswer: (chosen) => `${chosen['slot-capture']}, ${chosen['slot-action']}`,
    modelFullMarkAnswer:
      'The smart meter (Thing) uses built-in sensors to measure real-time electricity consumption (Data) and transmits readings over a wireless network to the energy supplier, where automated billing software (Process) calculates live tariff costs and displays alerts on an in-home display so householders (People) can shift high-energy tasks to off-peak times.',
    freeRewriteRubric: [
      { id: 'r1', label: 'Things & Data: sensor captures real-time energy usage data', anyKeywords: ['thing', 'sensor', 'data', 'usage', 'reading', 'real-time'] },
      { id: 'r2', label: 'Process: network transmits & software analyses tariff/cost', anyKeywords: ['process', 'software', 'transmit', 'calculat', 'tariff', 'analy'] },
      { id: 'r3', label: 'People: householders view display/alerts to adjust usage', anyKeywords: ['people', 'householder', 'user', 'display', 'off-peak', 'decision', 'alert'] },
    ],
    bannedVaguePhrases: ['automatically save', 'modern gadgets', 'bills go down'],
  },
  {
    id: 'fix-ta4-phishing',
    topicArea: 'TA4',
    scenario: 'SwiftFit Gym Reception Staff',
    commandWord: 'Describe',
    maxMarks: 3,
    weakMarks: 0,
    questionPrompt: 'Describe how SwiftFit can reduce the risk of reception staff falling victim to a phishing attack. [3 marks]',
    weakAnswer: 'Staff should be careful with emails and not click bad links so they do not get hacked.',
    weakExaminerNote: '0/3 Marks: "Be careful" and "not get hacked" are generic everyday advice — OCR expects named organisational and technical defences.',
    flawOptions: [
      {
        id: 'f1',
        label: 'Uses vague advice ("be careful", "bad links") instead of named TA4 controls',
        isTrueFlaw: true,
        reason: 'Correct — name concrete controls like staff security awareness training, email spam/phishing filters, and 2FA.',
      },
      {
        id: 'f2',
        label: 'Does not describe HOW each measure stops credential theft or account takeover',
        isTrueFlaw: true,
        reason: 'Correct — 3 marks require linking each defence to its specific protective mechanism.',
      },
      {
        id: 'f3',
        label: 'Forgot to describe a Lookup Check',
        isTrueFlaw: false,
        reason: 'Not relevant — Lookup Checks belong to TA3 form validation, not phishing defence.',
      },
    ],
    patchSlots: [
      {
        id: 'slot-human',
        slotTitle: '1. Name a specific human/organisational measure (1–2 marks)',
        weakFragment: 'Staff should be careful with emails...',
        options: [
          {
            id: 'p-1',
            text: 'Run regular cyber-security awareness training and simulated phishing tests so reception staff recognise spoofed sender addresses, urgent social-engineering language, and mismatched URLs',
            isBestUpgrade: true,
            examinerNote: 'Strong specific human control with concrete phishing indicators.',
          },
          {
            id: 'p-2',
            text: 'Tell staff to delete every email they receive at work',
            isBestUpgrade: false,
            examinerNote: 'Unrealistic — reception staff need legitimate member emails to do their job.',
          },
          {
            id: 'p-3',
            text: 'Remind staff to stay safe online',
            isBestUpgrade: false,
            examinerNote: 'Still too vague to earn OCR marks.',
          },
        ],
      },
      {
        id: 'slot-tech',
        slotTitle: '2. Pair with a technical safeguard (1–2 marks)',
        weakFragment: '...and not click bad links so they do not get hacked.',
        options: [
          {
            id: 't-1',
            text: 'and deploy automated email spam filters alongside Two-Factor Authentication (2FA) so even if a password is entered on a fake login page, attackers still cannot access SwiftFit member records without the second factor.',
            isBestUpgrade: true,
            examinerNote: 'Full 3/3 marks: layers technical filtering + 2FA with exact account-takeover impact.',
          },
          {
            id: 't-2',
            text: 'and buy faster broadband so emails arrive quicker.',
            isBestUpgrade: false,
            examinerNote: 'Broadband speed does not prevent phishing.',
          },
          {
            id: 't-3',
            text: 'and use a bigger monitor on reception.',
            isBestUpgrade: false,
            examinerNote: 'Not a cyber-security control.',
          },
        ],
      },
    ],
    assembleUpgradedAnswer: (chosen) => `${chosen['slot-human']}, ${chosen['slot-tech']}`,
    modelFullMarkAnswer:
      'Run regular cyber-security awareness training and simulated phishing tests so reception staff recognise spoofed sender addresses, urgent social-engineering language, and mismatched URLs, and deploy automated email spam filters alongside Two-Factor Authentication (2FA) so even if a password is entered on a fake login page, attackers still cannot access SwiftFit member records without the second factor.',
    freeRewriteRubric: [
      { id: 'r1', label: 'Human control: staff training / spotting spoofed sender or URLs', anyKeywords: ['train', 'spoof', 'url', 'sender', 'social engineering', 'simulat'] },
      { id: 'r2', label: 'Technical control: email filter / anti-phishing / 2FA', anyKeywords: ['filter', 'spam', '2fa', 'two-factor', 'multi-factor', 'mfa'] },
      { id: 'r3', label: 'Scenario impact: stops credential theft / unauthorised access to member records', anyKeywords: ['credential', 'password', 'login', 'unauthori', 'member', 'record'] },
    ],
    bannedVaguePhrases: ['be careful', 'get hacked', 'stay safe'],
  },
  {
    id: 'fix-ta3-testdata',
    topicArea: 'TA3',
    scenario: 'Customer Age Input (18 to 99 inclusive)',
    commandWord: 'Justify',
    maxMarks: 3,
    weakMarks: 1,
    questionPrompt: 'Justify why the developer should test the Customer Age field (18–99 inclusive) with more than just values 25 and 30. [3 marks]',
    weakAnswer: 'Testing with 25 and 30 shows the age box works properly for normal customers.',
    weakExaminerNote: '1/3 Marks: Only covers Normal test data — fails to justify Boundary (18, 99) and Erroneous (17, 100, "abc") test categories.',
    flawOptions: [
      {
        id: 'f1',
        label: 'Only tests Normal data and ignores Boundary limits (18 and 99)',
        isTrueFlaw: true,
        reason: 'Correct — without Boundary testing, an off-by-one bug (> 18 instead of >= 18) would silently reject valid 18-year-olds.',
      },
      {
        id: 'f2',
        label: 'Omits Erroneous test data (out-of-range and wrong type) to prove invalid entries are rejected',
        isTrueFlaw: true,
        reason: 'Correct — you must prove the system rejects invalid values like 17, 100, or text "twenty".',
      },
      {
        id: 'f3',
        label: 'Forgot to use a Mind Map',
        isTrueFlaw: false,
        reason: 'Off-topic — test plans evaluate validation rules with Normal, Boundary, and Erroneous data.',
      },
    ],
    patchSlots: [
      {
        id: 'slot-bound',
        slotTitle: '1. Justify Boundary test data (1–2 marks)',
        weakFragment: 'Testing with 25 and 30 shows the age box works properly...',
        options: [
          {
            id: 'td-1',
            text: '25 and 30 are only Normal data; the developer must also test exact Boundary values (18 and 99) to prove the inclusive limits are accepted and not blocked by an off-by-one rule error',
            isBestUpgrade: true,
            examinerNote: 'Earns Boundary category + clear justification of why edge values matter.',
          },
          {
            id: 'td-2',
            text: 'The developer should also test 26, 27, and 28 to be extra sure',
            isBestUpgrade: false,
            examinerNote: '26, 27, and 28 are all still Normal data — does not test the boundaries or rejection.',
          },
          {
            id: 'td-3',
            text: 'Testing 25 and 30 is fine as long as you click Submit twice',
            isBestUpgrade: false,
            examinerNote: 'Clicking twice never tests edge limits or invalid rejection.',
          },
        ],
      },
      {
        id: 'slot-err',
        slotTitle: '2. Justify Erroneous test data (1–2 marks)',
        weakFragment: '...for normal customers.',
        options: [
          {
            id: 'te-1',
            text: 'and test Erroneous data — both out-of-range (17 or 100) and wrong data type ("twenty") — to prove the validation checks reject invalid entries and show an error message instead of corrupting the database.',
            isBestUpgrade: true,
            examinerNote: 'Full 3/3 marks: names both Erroneous subtypes + clear rejection justification.',
          },
          {
            id: 'te-2',
            text: 'and delete the Range Check so everyone can register.',
            isBestUpgrade: false,
            examinerNote: 'Removing validation causes database corruption.',
          },
          {
            id: 'te-3',
            text: 'and check that the screen uses nice colours.',
            isBestUpgrade: false,
            examinerNote: 'Irrelevant to functional test data.',
          },
        ],
      },
    ],
    assembleUpgradedAnswer: (chosen) => `${chosen['slot-bound']}, ${chosen['slot-err']}`,
    modelFullMarkAnswer:
      '25 and 30 are only Normal data; the developer must also test exact Boundary values (18 and 99) to prove the inclusive limits are accepted and not blocked by an off-by-one rule error, and test Erroneous data — both out-of-range (17 or 100) and wrong data type ("twenty") — to prove the validation checks reject invalid entries and show an error message instead of corrupting the database.',
    freeRewriteRubric: [
      { id: 'r1', label: 'Recognises 25/30 as only Normal data', anyKeywords: ['normal'] },
      { id: 'r2', label: 'Justifies Boundary data (18, 99) to test exact limits', anyKeywords: ['boundary', '18', '99', 'limit', 'edge'] },
      { id: 'r3', label: 'Justifies Erroneous data (17/100/text) to confirm rejection', anyKeywords: ['erroneous', 'invalid', 'reject', '17', '100', 'text', 'wrong type'] },
    ],
    bannedVaguePhrases: ['works properly', 'extra sure'],
  },
];

export const COMMAND_WORD_DRILLS: CommandWordDrill[] = [
  {
    id: 'cmd-1',
    topicArea: 'TA3',
    marks: 2,
    scenario: 'SwiftFit Member Sign-Up Form',
    questionStem: '[2 Marks] "________ why SwiftFit should apply a Presence Check to the Emergency Contact Phone field."',
    commandOptions: ['Identify / State', 'Explain', 'Compare', 'Discuss / Evaluate'],
    correctCommand: 'Explain',
    formulaOptions: [
      '1 × Point (what Presence Check does) + 1 × Linked Impact ("so that..." in SwiftFit context)',
      'Write two one-word validation names as a bullet list',
      'Give pros, cons, and a final balanced recommendation across 3 paragraphs',
      'Draw a full ISO 5807 flowchart with decision diamonds',
    ],
    correctFormula: '1 × Point (what Presence Check does) + 1 × Linked Impact ("so that..." in SwiftFit context)',
    examinerTip: 'Whenever a 2-mark OCR question asks "why", it uses Explain: state the mechanism (cannot be left blank) + the scenario consequence (staff can always contact next-of-kin in an emergency).',
  },
  {
    id: 'cmd-2',
    topicArea: 'TA4',
    marks: 1,
    scenario: 'Online Bank Security',
    questionStem: '[1 Mark] "________ one type of malware that encrypts a victim’s files and demands payment for the decryption key."',
    commandOptions: ['Identify / State', 'Describe', 'Compare', 'Justify'],
    correctCommand: 'Identify / State',
    formulaOptions: [
      'Give the single precise term ("Ransomware") — no extra explanation needed',
      'Write a balanced argument comparing ransomware and spyware',
      'Give two linked impacts using "therefore"',
      'Evaluate the financial cost of downtime for the bank',
    ],
    correctFormula: 'Give the single precise term ("Ransomware") — no extra explanation needed',
    examinerTip: '1-mark Identify/State questions test rapid recall. Name "Ransomware" cleanly and save your writing time for 4–9 mark questions.',
  },
  {
    id: 'cmd-3',
    topicArea: 'TA5',
    marks: 4,
    scenario: 'Mobile Delivery Fleet Connectivity',
    questionStem: '[4 Marks] "________ the use of 5G mobile data and Wi-Fi for delivery drivers updating parcel status on the road."',
    commandOptions: ['Define', 'Identify / State', 'Compare', 'Outline'],
    correctCommand: 'Compare',
    formulaOptions: [
      '2 comparative pairs contrasting BOTH 5G and Wi-Fi using connectives ("whereas / however")',
      'List 4 features of 5G without mentioning Wi-Fi',
      'Define the acronym Wi-Fi in one sentence',
      'Give a single personal preference with no technical detail',
    ],
    correctFormula: '2 comparative pairs contrasting BOTH 5G and Wi-Fi using connectives ("whereas / however")',
    examinerTip: 'Compare = side-by-side differences/similarities! For 4 marks, contrast BOTH technologies across two clear criteria (e.g., wide geographic coverage while driving vs short-range hotspots; ongoing data plan cost vs free depot Wi-Fi).',
  },
  {
    id: 'cmd-4',
    topicArea: 'TA1',
    marks: 3,
    scenario: 'Animal Charity Discovery Trail App',
    questionStem: '[3 Marks] "________ the key components that should be included on a Visualisation Diagram for the app’s home screen."',
    commandOptions: ['Describe', 'Define', 'Identify / State', 'Discuss / Evaluate'],
    correctCommand: 'Describe',
    formulaOptions: [
      'Detail 3 concrete visual features (colour scheme, typography/fonts, logo/imagery placement) showing how the finished screen looks',
      'Give a single dictionary definition of a wireframe',
      'Write pros and cons of using a computer',
      'Name 1 colour and stop',
    ],
    correctFormula: 'Detail 3 concrete visual features (colour scheme, typography/fonts, logo/imagery placement) showing how the finished screen looks',
    examinerTip: 'Describe asks you to paint a picture of features or steps (1 mark per clear descriptive detail). Keep Visualisation Diagram (colours/fonts/images) distinct from Wireframe (greyscale layout).',
  },
  {
    id: 'cmd-5',
    topicArea: 'TA6',
    marks: 9,
    scenario: 'Smart City Traffic Management',
    questionStem: '[9 Marks] "________ the impact of introducing IoE smart traffic sensors and automated signals across the city centre."',
    commandOptions: ['Outline', 'Identify / State', 'Define', 'Discuss / Evaluate'],
    correctCommand: 'Discuss / Evaluate',
    formulaOptions: [
      'AO1 knowledge + balanced AO2 scenario benefits AND drawbacks (privacy, cost, failure) + AO3 reasoned conclusion',
      'A bullet list of 9 single-word IoE benefits',
      'Only write about how sensors work with no drawbacks or conclusion',
      'A 1-sentence definition of the Internet of Everything',
    ],
    correctFormula: 'AO1 knowledge + balanced AO2 scenario benefits AND drawbacks (privacy, cost, failure) + AO3 reasoned conclusion',
    examinerTip: 'Level 3 (7–9 marks) on Discuss/Evaluate ALWAYS requires balanced pros AND cons applied to the scenario, finishing with a justified AO3 conclusion.',
  },
  {
    id: 'cmd-6',
    topicArea: 'TA3',
    marks: 2,
    scenario: 'Database Design',
    questionStem: '[2 Marks] "________ the term Data Verification."',
    commandOptions: ['Define', 'Compare', 'Discuss / Evaluate', 'Justify'],
    correctCommand: 'Define',
    formulaOptions: [
      'State the exact technical meaning (checking data entered matches the original source accurately) + method example (double entry / visual check)',
      'Contrast RAM and ROM in two paragraphs',
      'List three range checks',
      'Write a balanced evaluation with a conclusion',
    ],
    correctFormula: 'State the exact technical meaning (checking data entered matches the original source accurately) + method example (double entry / visual check)',
    examinerTip: 'For a 2-mark Define question, give the precise core meaning (1 mark) plus the qualifying detail or standard method that separates it from related terms like Validation (1 mark).',
  },
  {
    id: 'cmd-7',
    topicArea: 'TA2',
    marks: 3,
    scenario: 'Self-Service Supermarket Checkout',
    questionStem: '[3 Marks] "________ the choice of a Touchscreen GUI instead of a Command Line Interface (CLI) for supermarket shoppers."',
    commandOptions: ['Justify', 'Define', 'Identify / State', 'Outline'],
    correctCommand: 'Justify',
    formulaOptions: [
      'Give 3 scenario-linked reasons WHY Touchscreen GUI fits novice shoppers (visual icons, no memorised commands, accessible touch targets)',
      'State "Touchscreen" as a one-word answer',
      'Define what CLI stands for and stop',
      'Describe how to build a database table',
    ],
    correctFormula: 'Give 3 scenario-linked reasons WHY Touchscreen GUI fits novice shoppers (visual icons, no memorised commands, accessible touch targets)',
    examinerTip: 'Justify requires making the case WHY a decision fits the specific user group — link every point to everyday supermarket shoppers with mixed IT confidence.',
  },
  {
    id: 'cmd-8',
    topicArea: 'TA4',
    marks: 2,
    scenario: 'Data Breach Incident Response',
    questionStem: '[2 Marks] "________ two actions a business must take under the UK GDPR / Data Protection Act 2018 after a personal data breach."',
    commandOptions: ['Outline', 'Compare', 'Discuss / Evaluate', 'Define'],
    correctCommand: 'Outline',
    formulaOptions: [
      'Briefly state 2 clear legal actions (e.g., report breach to the ICO within 72 hours; notify affected individuals if high risk)',
      'Write a 400-word essay comparing the Computer Misuse Act and Copyright Act',
      'Write "pay a fine" twice',
      'Draw a network topology diagram',
    ],
    correctFormula: 'Briefly state 2 clear legal actions (e.g., report breach to the ICO within 72 hours; notify affected individuals if high risk)',
    examinerTip: 'Outline asks for the key steps or main points concisely (1 mark per distinct accurate action — naming the ICO 72-hour rule is classic high-value TA4 detail).',
  },
];

export const EXAMINER_MARKING_CASES: ExaminerMarkingCase[] = [
  {
    id: 'exam-1-ta4-2fa',
    topicArea: 'TA4',
    commandWord: 'Explain',
    maxMarks: 2,
    scenario: 'Online Bank Savings Account',
    questionPrompt: 'Explain how Two-Factor Authentication (2FA) improves security for customers logging into their online savings account. [2 marks]',
    markSchemePoints: [
      '1 mark (AO1): Requires a second independent verification factor in addition to the password (e.g., one-time SMS/authenticator code or biometric).',
      '1 mark (AO2): Therefore, even if a criminal steals or guesses the password, they still cannot log in without physical access to the customer’s second factor.',
    ],
    candidateScript:
      '2FA asks the customer for a one-time code sent to their phone as well as their password. This makes the bank account much safer and better protected.',
    correctMarks: 1,
    reasonOptions: [
      '1/2 Marks: Earned AO1 for naming the second factor (phone code + password), but second sentence is too vague ("safer/better") with no explanation of blocking stolen passwords.',
      '2/2 Marks: Full marks because the candidate mentioned phones and safety.',
      '0/2 Marks: No valid technical point was made.',
    ],
    correctReason:
      '1/2 Marks: Earned AO1 for naming the second factor (phone code + password), but second sentence is too vague ("safer/better") with no explanation of blocking stolen passwords.',
    annotatedClauses: [
      {
        text: '2FA asks the customer for a one-time code sent to their phone as well as their password.',
        credit: 'awarded',
        tag: '+1 AO1',
        note: 'Accurately identifies requiring two independent factors (something you know + something you have).',
      },
      {
        text: 'This makes the bank account much safer and better protected.',
        credit: 'missed',
        tag: '0 — Vague',
        note: '"Safer / better protected" is uncredited generic phrasing. Needed: "so even if a hacker steals the password, they cannot log in without the phone code."',
      },
    ],
    examinerVerdict: 'Award 1 / 2 Marks. Always replace "makes it safer" with the concrete attack prevented!',
  },
  {
    id: 'exam-2-ta3-checks',
    topicArea: 'TA3',
    commandWord: 'Explain',
    maxMarks: 4,
    scenario: 'SwiftFit Membership Sign-Up',
    questionPrompt: 'Explain two validation checks that could be used on a UK Postcode field (e.g., SR1 3DP). [4 marks]',
    markSchemePoints: [
      'Check 1 (1 mark): Presence Check + (1 mark) ensures the postcode box is not left blank so membership cards can be posted.',
      'Check 2 (1 mark): Format Check (or Length Check) + (1 mark) checks characters match the UK letter/digit pattern (e.g. LL0 0LL) so invalid codes like "12345" are rejected.',
    ],
    candidateScript:
      'Use a Presence Check so the field is not left blank. Also use a Format Check to make sure the postcode matches the right letter and number pattern.',
    correctMarks: 2,
    reasonOptions: [
      '2/4 Marks: Named two valid checks with basic definitions, OR capped at 2 because neither check includes linked scenario impact / concrete example of what gets rejected.',
      '4/4 Marks: Named two checks and wrote two sentences, so full marks.',
      '0/4 Marks: Presence Check cannot be used on postcodes.',
    ],
    correctReason:
      '2/4 Marks: Named two valid checks with basic definitions, OR capped at 2 because neither check includes linked scenario impact / concrete example of what gets rejected.',
    annotatedClauses: [
      {
        text: 'Use a Presence Check so the field is not left blank.',
        credit: 'awarded',
        tag: '+1 AO1 (No AO2)',
        note: 'Valid check identified (+1), but does not explain the SwiftFit impact (e.g., needed for billing/posting membership cards).',
      },
      {
        text: 'Also use a Format Check to make sure the postcode matches the right letter and number pattern.',
        credit: 'awarded',
        tag: '+1 AO1 (No AO2)',
        note: 'Second valid check identified (+1), but lacks concrete pattern/example (e.g., LL0 0LL rejecting "12345") or consequence.',
      },
    ],
    examinerVerdict: 'Award 2 / 4 Marks. On "Explain two..." (4 marks), every point needs BOTH the rule AND its linked scenario consequence!',
  },
  {
    id: 'exam-3-ta1-flowchart',
    topicArea: 'TA1',
    commandWord: 'Describe',
    maxMarks: 3,
    scenario: 'Smart Meter Low-Credit Alert Flowchart',
    questionPrompt: 'Describe three standard conventions that must be followed when drawing a system flowchart. [3 marks]',
    markSchemePoints: [
      '1 mark: Use ovals/rounded rectangles (Terminators) for Start and End.',
      '1 mark: Use a Diamond for Decisions with two labelled exit branches (Yes / No).',
      '1 mark: Connect symbols with directional arrows showing flow order (top-to-bottom / left-to-right), plus Parallelogram for Input/Output or Rectangle for Process.',
    ],
    candidateScript:
      'Start and End must use oval terminator symbols. Every decision diamond must have labelled Yes and No arrows leaving it. All boxes must be joined with directional arrows showing the order of steps.',
    correctMarks: 3,
    reasonOptions: [
      '3/3 Marks: Three distinct, technically accurate ISO 5807 flowchart conventions with zero repetition.',
      '2/3 Marks: Missing a paragraph about colours.',
      '1/3 Marks: Ovals are only used for Inputs.',
    ],
    correctReason:
      '3/3 Marks: Three distinct, technically accurate ISO 5807 flowchart conventions with zero repetition.',
    annotatedClauses: [
      {
        text: 'Start and End must use oval terminator symbols.',
        credit: 'awarded',
        tag: '+1 Mark',
        note: 'Exact ISO 5807 terminator convention.',
      },
      {
        text: 'Every decision diamond must have labelled Yes and No arrows leaving it.',
        credit: 'awarded',
        tag: '+1 Mark',
        note: 'Correct decision symbol + mandatory Yes/No branch labelling.',
      },
      {
        text: 'All boxes must be joined with directional arrows showing the order of steps.',
        credit: 'awarded',
        tag: '+1 Mark',
        note: 'Distinct third convention: directional flowlines.',
      },
    ],
    examinerVerdict: 'Award 3 / 3 Marks! Crisp, distinct, technical conventions with zero fluff.',
  },
  {
    id: 'exam-4-ta5-protocols',
    topicArea: 'TA5',
    commandWord: 'Explain',
    maxMarks: 2,
    scenario: 'GreenLeaf Web Store',
    questionPrompt: 'Explain why GreenLeaf uses HTTPS rather than HTTP on its customer account login page. [2 marks]',
    markSchemePoints: [
      '1 mark (AO1): HTTPS encrypts data in transit using TLS/SSL (whereas HTTP sends data in plain text).',
      '1 mark (AO2): This prevents attackers on the network from reading intercepted login passwords or customer details.',
    ],
    candidateScript:
      'HTTPS is secure so it keeps login details safe. It also protects the website from being insecure.',
    correctMarks: 0,
    reasonOptions: [
      '0/2 Marks: Purely circular/vague ("secure", "safe", "protects from being insecure") — never mentions encryption or plain text interception.',
      '2/2 Marks: Mentioned security twice so earns 2 marks.',
      '1/2 Marks: Earned 1 mark for saying "keeps login details safe".',
    ],
    correctReason:
      '0/2 Marks: Purely circular/vague ("secure", "safe", "protects from being insecure") — never mentions encryption or plain text interception.',
    annotatedClauses: [
      {
        text: 'HTTPS is secure so it keeps login details safe.',
        credit: 'missed',
        tag: '0 — Circular',
        note: 'Restating "S = secure/safe" without mentioning TLS/SSL encryption earns 0 marks at Level 2.',
      },
      {
        text: 'It also protects the website from being insecure.',
        credit: 'missed',
        tag: '0 — Repetition',
        note: 'Repeats the same vague claim in different words.',
      },
    ],
    examinerVerdict: 'Award 0 / 2 Marks. Always state the mechanism: HTTPS encrypts data with TLS/SSL so intercepted passwords cannot be read.',
  },
  {
    id: 'exam-5-ta6-wearable',
    topicArea: 'TA6',
    commandWord: 'Compare',
    maxMarks: 4,
    scenario: 'Wearable Fitness Tracker',
    questionPrompt: 'Compare Bluetooth and Wi-Fi for syncing daily step data from a wearable fitness watch to a user’s smartphone. [4 marks]',
    markSchemePoints: [
      'Pair 1 (2 marks): Bluetooth uses much lower battery power (ideal for a small watch battery), whereas Wi-Fi drains the watch battery faster.',
      'Pair 2 (2 marks): Bluetooth pairs directly device-to-device over short range (~10m) without needing a router, whereas Wi-Fi has longer range/higher bandwidth but typically requires a wireless access point/router.',
    ],
    candidateScript:
      'Bluetooth uses much less battery power on the small fitness watch, whereas Wi-Fi drains the battery much faster. Bluetooth also syncs directly to the phone over short range without needing a router, whereas Wi-Fi needs an access point.',
    correctMarks: 4,
    reasonOptions: [
      '4/4 Marks: Two complete comparative pairs (battery life + direct pairing/router dependency) contrasting BOTH Bluetooth and Wi-Fi using "whereas".',
      '2/4 Marks: Only talked about Bluetooth.',
      '1/4 Marks: Forgot to mention 5G cellular towers.',
    ],
    correctReason:
      '4/4 Marks: Two complete comparative pairs (battery life + direct pairing/router dependency) contrasting BOTH Bluetooth and Wi-Fi using "whereas".',
    annotatedClauses: [
      {
        text: 'Bluetooth uses much less battery power on the small fitness watch, whereas Wi-Fi drains the battery much faster.',
        credit: 'awarded',
        tag: '+2 Marks (Pair 1)',
        note: 'Direct battery-consumption contrast linked to the wearable watch.',
      },
      {
        text: 'Bluetooth also syncs directly to the phone over short range without needing a router, whereas Wi-Fi needs an access point.',
        credit: 'awarded',
        tag: '+2 Marks (Pair 2)',
        note: 'Second distinct technical contrast covering short-range direct pairing vs router/AP requirement.',
      },
    ],
    examinerVerdict: 'Award 4 / 4 Marks! Model OCR Compare structure: two distinct criteria, both sides contrasted cleanly.',
  },
];

export const VAGUE_PHRASE_SETS: VaguePhraseSet[] = [
  {
    id: 'vague-set-1',
    title: 'Design Tools & HCI (TA1–TA2)',
    topicBand: 'TA1–TA2',
    description: 'Eliminate generic phrases like "easy to use" and "looks nice" in design and interface questions.',
    items: [
      {
        id: 'vp-1',
        topicArea: 'TA2',
        scenarioHint: 'Booking App Navigation',
        weakPhrase: '"The interface is easy to use."',
        options: [
          {
            id: 'a',
            text: 'Consistent navigation icons, clear labels, and logical grouping reduce cognitive load so new users can complete bookings without training.',
            isExamReady: true,
            feedback: 'Exam-ready: names specific HCI design principles + user impact.',
          },
          {
            id: 'b',
            text: 'The interface is user-friendly and simple to click around.',
            isExamReady: false,
            feedback: '"User-friendly" is just another synonym for "easy to use" — still 0 marks.',
          },
          {
            id: 'c',
            text: 'The interface uses lots of bright animations on every button.',
            isExamReady: false,
            feedback: 'Excessive animation harms usability and accessibility.',
          },
        ],
      },
      {
        id: 'vp-2',
        topicArea: 'TA1',
        scenarioHint: 'Pre-Production Mind Map',
        weakPhrase: '"A mind map is good for ideas."',
        options: [
          {
            id: 'a',
            text: 'A mind map organises brainstormed sub-topics hierarchically around a central theme, helping the team spot missing app features before detailed design.',
            isExamReady: true,
            feedback: 'Exam-ready: describes hierarchical structure + pre-production purpose.',
          },
          {
            id: 'b',
            text: 'A mind map helps people think of stuff quickly.',
            isExamReady: false,
            feedback: '"Think of stuff" is informal and omits hierarchical structure.',
          },
          {
            id: 'c',
            text: 'A mind map shows exact pixel positions and SQL code.',
            isExamReady: false,
            feedback: 'Incorrect — mind maps are for high-level idea generation, not pixel layout or code.',
          },
        ],
      },
      {
        id: 'vp-3',
        topicArea: 'TA2',
        scenarioHint: 'Kiosk Feedback Messages',
        weakPhrase: '"The system tells you when something goes wrong."',
        options: [
          {
            id: 'a',
            text: 'Inline validation displays a specific, constructive error message next to the invalid field (e.g., "Enter a 4-digit PIN") so the user knows exactly how to correct it.',
            isExamReady: true,
            feedback: 'Exam-ready: explains actionable inline feedback and user recovery.',
          },
          {
            id: 'b',
            text: 'A red pop-up says "Error!" and closes the app.',
            isExamReady: false,
            feedback: 'Poor HCI — generic error messages and crashing frustrate users.',
          },
          {
            id: 'c',
            text: 'The screen makes a loud noise whenever you type.',
            isExamReady: false,
            feedback: 'Intrusive and unhelpful without clear corrective guidance.',
          },
        ],
      },
      {
        id: 'vp-4',
        topicArea: 'TA1',
        scenarioHint: 'Visualisation Diagram',
        weakPhrase: '"It shows what the poster looks like so it looks nice."',
        options: [
          {
            id: 'a',
            text: 'It communicates exact typography, colour palette, imagery placement, and branding to the client so visual styling can be approved before production.',
            isExamReady: true,
            feedback: 'Exam-ready: names exact visualisation components + client sign-off benefit.',
          },
          {
            id: 'b',
            text: 'It makes the product attractive and eye-catching for everyone.',
            isExamReady: false,
            feedback: 'Still vague marketing fluff without naming diagram elements.',
          },
          {
            id: 'c',
            text: 'It shows the decision diamonds and database fields.',
            isExamReady: false,
            feedback: 'Confuses Visualisation Diagrams with Flowcharts and Databases.',
          },
        ],
      },
    ],
  },
  {
    id: 'vague-set-2',
    title: 'Data, Testing & Cyber Security (TA3–TA4)',
    topicBand: 'TA3–TA4',
    description: 'Replace "keeps data safe", "stops hackers", and "checks it works" with mark-scheme mechanisms.',
    items: [
      {
        id: 'vp-5',
        topicArea: 'TA4',
        scenarioHint: 'Firewall Defence',
        weakPhrase: '"A firewall stops all hackers and viruses."',
        options: [
          {
            id: 'a',
            text: 'A firewall monitors incoming and outgoing network traffic against security rules, blocking unauthorised ports/connections into the private network.',
            isExamReady: true,
            feedback: 'Exam-ready: accurately explains packet/port filtering without over-claiming.',
          },
          {
            id: 'b',
            text: 'A firewall makes computers 100% impossible to hack.',
            isExamReady: false,
            feedback: 'No single control is 100% effective — exaggerations lose marks.',
          },
          {
            id: 'c',
            text: 'A firewall encrypts paper files in the filing cabinet.',
            isExamReady: false,
            feedback: 'Incorrect — firewalls filter network traffic, not physical paper.',
          },
        ],
      },
      {
        id: 'vp-6',
        topicArea: 'TA3',
        scenarioHint: 'Lookup Check on Membership Tier',
        weakPhrase: '"A lookup check stops bad typing."',
        options: [
          {
            id: 'a',
            text: 'A Lookup Check restricts input to a predefined list of valid values (e.g., Peak, Off-Peak, Student), preventing misspelt or non-existent tiers from entering the database.',
            isExamReady: true,
            feedback: 'Exam-ready: defines predefined list + exact data-integrity outcome.',
          },
          {
            id: 'b',
            text: 'A lookup check looks up answers on Google automatically.',
            isExamReady: false,
            feedback: 'Common misconception — Lookup checks against a fixed internal table/list.',
          },
          {
            id: 'c',
            text: 'A lookup check makes sure the text is between 1 and 50 characters.',
            isExamReady: false,
            feedback: 'That describes a Length Check, not a Lookup Check.',
          },
        ],
      },
      {
        id: 'vp-7',
        topicArea: 'TA4',
        scenarioHint: 'UK GDPR / Data Protection Act 2018',
        weakPhrase: '"Businesses must follow the law and keep data safe."',
        options: [
          {
            id: 'a',
            text: 'Data controllers must process personal data lawfully, collect only what is necessary (data minimisation), keep it accurate, and protect it with appropriate technical security.',
            isExamReady: true,
            feedback: 'Exam-ready: cites actual UK GDPR principles accurately.',
          },
          {
            id: 'b',
            text: 'Businesses must never store any customer names on computers.',
            isExamReady: false,
            feedback: 'Incorrect — organisations can store personal data with a lawful basis.',
          },
          {
            id: 'c',
            text: 'Businesses must buy copyright licences for customer emails.',
            isExamReady: false,
            feedback: 'Confuses the Data Protection Act with the Copyright, Designs and Patents Act.',
          },
        ],
      },
      {
        id: 'vp-8',
        topicArea: 'TA4',
        scenarioHint: 'Backups vs Ransomware',
        weakPhrase: '"Backups stop ransomware attacks from happening."',
        options: [
          {
            id: 'a',
            text: 'Regular offline/immutable backups allow the organisation to restore encrypted systems and records without paying a ransom, minimising downtime.',
            isExamReady: true,
            feedback: 'Exam-ready: correctly frames backups as recovery/resilience rather than prevention.',
          },
          {
            id: 'b',
            text: 'Backups block phishing links inside staff emails.',
            isExamReady: false,
            feedback: 'Incorrect — backups help you recover after an incident; they do not filter emails.',
          },
          {
            id: 'c',
            text: 'Backups make the hard drive run much faster.',
            isExamReady: false,
            feedback: 'Unrelated to ransomware recovery.',
          },
        ],
      },
    ],
  },
  {
    id: 'vague-set-3',
    title: 'Digital Comms & IoE (TA5–TA6)',
    topicBand: 'TA5–TA6',
    description: 'Upgrade "it is faster", "cheaper", and "uses the internet" into crisp TA5 & TA6 technical explanations.',
    items: [
      {
        id: 'vp-9',
        topicArea: 'TA5',
        scenarioHint: 'VoIP / Video Conferencing',
        weakPhrase: '"Video calls are cheaper and faster for the company."',
        options: [
          {
            id: 'a',
            text: 'Video conferencing removes staff travel expenses and journey time across regional branches while enabling real-time screen sharing for collaborative decisions.',
            isExamReady: true,
            feedback: 'Exam-ready: specifies WHICH cost is reduced (travel) and HOW collaboration improves.',
          },
          {
            id: 'b',
            text: 'Video calls are free and never lag.',
            isExamReady: false,
            feedback: 'Inaccurate — still requires broadband/licensing and depends on bandwidth.',
          },
          {
            id: 'c',
            text: 'Video calls are better for business than everything else.',
            isExamReady: false,
            feedback: 'Generic filler phrase — earns 0 marks.',
          },
        ],
      },
      {
        id: 'vp-10',
        topicArea: 'TA5',
        scenarioHint: 'Bandwidth & Latency',
        weakPhrase: '"Fibre broadband is faster."',
        options: [
          {
            id: 'a',
            text: 'Fibre-optic connections provide higher bandwidth and lower latency, enabling multiple staff to upload large cloud backups simultaneously without buffering.',
            isExamReady: true,
            feedback: 'Exam-ready: replaces "faster" with bandwidth + latency + real workload effect.',
          },
          {
            id: 'b',
            text: 'Fibre makes the keyboard type faster.',
            isExamReady: false,
            feedback: 'Incorrect — bandwidth affects data transfer rate, not local typing speed.',
          },
          {
            id: 'c',
            text: 'Fibre is super quick and good.',
            isExamReady: false,
            feedback: 'Just repeats "faster" in informal words.',
          },
        ],
      },
      {
        id: 'vp-11',
        topicArea: 'TA6',
        scenarioHint: 'Smart Agriculture Soil Sensors',
        weakPhrase: '"IoE sensors help farmers grow better crops."',
        options: [
          {
            id: 'a',
            text: 'Wireless soil-moisture sensors stream live readings to cloud software that triggers automated irrigation actuators only when moisture drops below a set threshold, reducing water waste.',
            isExamReady: true,
            feedback: 'Exam-ready: traces sensor → threshold processing → actuator → measurable resource benefit.',
          },
          {
            id: 'b',
            text: 'Sensors use the internet to make plants grow automatically.',
            isExamReady: false,
            feedback: 'Vague and misses the data-to-actuator control loop.',
          },
          {
            id: 'c',
            text: 'Sensors replace all human farmers immediately.',
            isExamReady: false,
            feedback: 'Exaggerated and skips the technical IoE mechanism.',
          },
        ],
      },
      {
        id: 'vp-12',
        topicArea: 'TA6',
        scenarioHint: 'IoE Security & Privacy Risk',
        weakPhrase: '"Smart home devices can be bad for privacy."',
        options: [
          {
            id: 'a',
            text: 'Always-on microphones and occupancy sensors collect sensitive household behaviour data; if poorly secured or using default passwords, attackers could intercept feeds or infer when the home is empty.',
            isExamReady: true,
            feedback: 'Exam-ready: names the exact data collected, vulnerability, and real-world risk.',
          },
          {
            id: 'b',
            text: 'Smart devices are scary because people might see your stuff.',
            isExamReady: false,
            feedback: 'Informal and lacks technical cause/effect.',
          },
          {
            id: 'c',
            text: 'Smart devices use too much Bluetooth range.',
            isExamReady: false,
            feedback: 'Does not explain a privacy risk.',
          },
        ],
      },
    ],
  },
];

export interface DiagnosisEvaluation {
  passed: boolean;
  correctPicked: number;
  totalTrueFlaws: number;
  wrongPicked: number;
  feedback: string;
}

export function evaluateFixAnswerDiagnosis(
  item: FixAnswerCase,
  selectedFlawIds: string[]
): DiagnosisEvaluation {
  const pickedSet = new Set(selectedFlawIds);
  const trueFlaws = item.flawOptions.filter((f) => f.isTrueFlaw);
  const falseFlaws = item.flawOptions.filter((f) => !f.isTrueFlaw);

  const correctPicked = trueFlaws.filter((f) => pickedSet.has(f.id)).length;
  const wrongPicked = falseFlaws.filter((f) => pickedSet.has(f.id)).length;
  const passed = correctPicked === trueFlaws.length && wrongPicked === 0;

  let feedback = '';
  if (passed) {
    feedback = `Spot-on diagnosis! You identified all ${trueFlaws.length} examiner mark-loss flaws cleanly.`;
  } else if (wrongPicked > 0) {
    feedback = `You selected ${wrongPicked} distractor(s) that are not actual flaws in this script. Uncheck them and focus on why OCR capped the marks.`;
  } else {
    feedback = `Found ${correctPicked} of ${trueFlaws.length} flaws — check the remaining reason why the script missed marks.`;
  }

  return {
    passed,
    correctPicked,
    totalTrueFlaws: trueFlaws.length,
    wrongPicked,
    feedback,
  };
}

export interface PatchEvaluation {
  passed: boolean;
  slotsCorrect: number;
  totalSlots: number;
  projectedMarks: number;
  upgradedAnswer: string;
  slotResults: Array<{
    slotId: string;
    passed: boolean;
    note: string;
  }>;
}

export function evaluateFixAnswerPatches(
  item: FixAnswerCase,
  chosenOptionIds: Record<string, string>
): PatchEvaluation {
  const chosenTexts: Record<string, string> = {};
  const slotResults: PatchEvaluation['slotResults'] = [];
  let slotsCorrect = 0;

  for (const slot of item.patchSlots) {
    const optId = chosenOptionIds[slot.id];
    const opt = slot.options.find((o) => o.id === optId);
    if (opt) {
      chosenTexts[slot.id] = opt.text;
      if (opt.isBestUpgrade) {
        slotsCorrect += 1;
        slotResults.push({ slotId: slot.id, passed: true, note: opt.examinerNote });
      } else {
        slotResults.push({ slotId: slot.id, passed: false, note: opt.examinerNote });
      }
    } else {
      chosenTexts[slot.id] = slot.weakFragment;
      slotResults.push({ slotId: slot.id, passed: false, note: 'Select an upgrade option for this segment.' });
    }
  }

  const passed = slotsCorrect === item.patchSlots.length;
  const ratio = item.patchSlots.length > 0 ? slotsCorrect / item.patchSlots.length : 0;
  const projectedMarks = passed
    ? item.maxMarks
    : Math.max(item.weakMarks, Math.round(item.weakMarks + (item.maxMarks - item.weakMarks) * ratio * 0.7));

  return {
    passed,
    slotsCorrect,
    totalSlots: item.patchSlots.length,
    projectedMarks,
    upgradedAnswer: item.assembleUpgradedAnswer(chosenTexts),
    slotResults,
  };
}

export interface FreeRewriteEvaluation {
  criteriaMet: number;
  totalCriteria: number;
  estimatedMarks: number;
  vagueWarnings: string[];
  results: Array<{ id: string; label: string; met: boolean }>;
}

export function evaluateFreeRewrite(item: FixAnswerCase, text: string): FreeRewriteEvaluation {
  const lower = text.trim().toLowerCase();
  const results = item.freeRewriteRubric.map((crit) => {
    const met = crit.anyKeywords.some((kw) => lower.includes(kw.toLowerCase()));
    return { id: crit.id, label: crit.label, met };
  });
  const criteriaMet = results.filter((r) => r.met).length;
  const vagueWarnings = item.bannedVaguePhrases.filter((phrase) => lower.includes(phrase.toLowerCase()));
  const rawRatio = item.freeRewriteRubric.length > 0 ? criteriaMet / item.freeRewriteRubric.length : 0;
  let estimatedMarks = Math.round(rawRatio * item.maxMarks);
  if (vagueWarnings.length > 0 && estimatedMarks === item.maxMarks) {
    estimatedMarks = Math.max(0, estimatedMarks - 1);
  }
  return {
    criteriaMet,
    totalCriteria: item.freeRewriteRubric.length,
    estimatedMarks,
    vagueWarnings,
    results,
  };
}

export interface CommandWordDrillEvaluation {
  commandCorrect: boolean;
  formulaCorrect: boolean;
  marksEarned: number;
  maxMarks: 2;
}

export function evaluateCommandWordDrill(
  drill: CommandWordDrill,
  pickedCommand: string,
  pickedFormula: string
): CommandWordDrillEvaluation {
  const commandCorrect = pickedCommand === drill.correctCommand;
  const formulaCorrect = pickedFormula === drill.correctFormula;
  return {
    commandCorrect,
    formulaCorrect,
    marksEarned: (commandCorrect ? 1 : 0) + (formulaCorrect ? 1 : 0),
    maxMarks: 2,
  };
}

export interface ExaminerMarkingEvaluation {
  scoreCorrect: boolean;
  reasonCorrect: boolean;
  passed: boolean;
  marksDelta: number;
}

export function evaluateExaminerMarking(
  item: ExaminerMarkingCase,
  pickedScore: number,
  pickedReason: string
): ExaminerMarkingEvaluation {
  const scoreCorrect = pickedScore === item.correctMarks;
  const reasonCorrect = pickedReason === item.correctReason;
  return {
    scoreCorrect,
    reasonCorrect,
    passed: scoreCorrect && reasonCorrect,
    marksDelta: pickedScore - item.correctMarks,
  };
}

export interface VaguePhraseSetEvaluation {
  correctCount: number;
  totalCount: number;
  passed: boolean;
  itemResults: Array<{
    itemId: string;
    passed: boolean;
    feedback: string;
  }>;
}

export function evaluateVaguePhraseSet(
  set: VaguePhraseSet,
  selections: Record<string, string>
): VaguePhraseSetEvaluation {
  let correctCount = 0;
  const itemResults: VaguePhraseSetEvaluation['itemResults'] = [];

  for (const item of set.items) {
    const pickedId = selections[item.id];
    const opt = item.options.find((o) => o.id === pickedId);
    if (opt) {
      if (opt.isExamReady) correctCount += 1;
      itemResults.push({ itemId: item.id, passed: opt.isExamReady, feedback: opt.feedback });
    } else {
      itemResults.push({ itemId: item.id, passed: false, feedback: 'Choose an exam-ready replacement.' });
    }
  }

  return {
    correctCount,
    totalCount: set.items.length,
    passed: correctCount === set.items.length,
    itemResults,
  };
}

export function computeCommandDrillsMasterySummary(
  progress: CommandDrillsProgress
): CommandDrillsMasterySummary {
  const fixTotal = FIX_ANSWER_CASES.length;
  const commandTotal = COMMAND_WORD_DRILLS.length;
  const examinerTotal = EXAMINER_MARKING_CASES.length;
  const vagueTotal = VAGUE_PHRASE_SETS.length;

  const fixDone = FIX_ANSWER_CASES.filter((c) => progress.completedFixCases[c.id]).length;
  const commandDone = COMMAND_WORD_DRILLS.filter((c) => progress.completedCommandDrills[c.id]).length;
  const examinerDone = EXAMINER_MARKING_CASES.filter((c) => progress.completedExaminerCases[c.id]).length;
  const vagueDone = VAGUE_PHRASE_SETS.filter((c) => progress.completedVagueSets[c.id]).length;

  const totalChallenges = fixTotal + commandTotal + examinerTotal + vagueTotal;
  const completedChallenges = fixDone + commandDone + examinerDone + vagueDone;
  const masteryPct = totalChallenges > 0 ? Math.round((completedChallenges / totalChallenges) * 100) : 0;

  return {
    fixDone,
    fixTotal,
    commandDone,
    commandTotal,
    examinerDone,
    examinerTotal,
    vagueDone,
    vagueTotal,
    completedChallenges,
    totalChallenges,
    masteryPct,
  };
}
