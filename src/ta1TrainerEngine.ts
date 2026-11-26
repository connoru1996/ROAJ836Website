export type FlowchartSymbolType =
  | 'terminator'
  | 'process'
  | 'decision'
  | 'io'
  | 'subroutine';

export interface SymbolDefinition {
  type: FlowchartSymbolType;
  name: string;
  shapeLabel: string;
  purpose: string;
  examExample: string;
  keyRule: string;
}

export interface FlowchartNodeSpec {
  id: string;
  x: number;
  y: number;
  expectedSymbol: FlowchartSymbolType;
  expectedLabel: string;
  locked?: boolean;
  hint: string;
}

export interface FlowchartEdgeSpec {
  id: string;
  from: string;
  to: string;
  branchRole?: 'yes' | 'no' | 'flow';
  expectedBranchLabel?: 'Yes' | 'No';
  labelLocked?: boolean;
  /** Optional SVG waypoint hints for clean orthogonal routing */
  route?: 'straight' | 'left-down' | 'right-down' | 'merge-left' | 'merge-right' | 'loop-left';
}

export interface FlowchartTestCase {
  id: string;
  label: string;
  description: string;
  /** Decision nodeId -> 'Yes' | 'No' outcome for this test case */
  decisions: Record<string, 'Yes' | 'No'>;
}

export interface FlowchartScenario {
  id: string;
  title: string;
  context: string;
  brief: string;
  maxMarks: number;
  viewBoxWidth: number;
  viewBoxHeight: number;
  nodes: FlowchartNodeSpec[];
  edges: FlowchartEdgeSpec[];
  labelBank: string[];
  testCases: FlowchartTestCase[];
}

export interface FlowchartUserSubmission {
  nodeSymbols: Record<string, FlowchartSymbolType | ''>;
  nodeLabels: Record<string, string>;
  edgeLabels: Record<string, string>;
}

export interface MarkSchemeCriterionResult {
  id: string;
  label: string;
  marksEarned: number;
  maxMarks: number;
  passed: boolean;
  feedback: string;
}

export interface FlowchartEvaluationResult {
  marksEarned: number;
  maxMarks: number;
  pct: number;
  nodeResults: Record<string, { symbolCorrect: boolean; labelCorrect: boolean; message: string }>;
  edgeResults: Record<string, { correct: boolean; message: string }>;
  criteria: MarkSchemeCriterionResult[];
  allPassed: boolean;
}

export interface TraceStep {
  stepNumber: number;
  nodeId: string;
  symbol: FlowchartSymbolType | '';
  label: string;
  edgeIdTaken?: string;
  branchTaken?: string;
  note: string;
}

export interface TraceSimulationResult {
  steps: TraceStep[];
  completed: boolean;
  errorMessage?: string;
}

export interface FreeformNode {
  id: string;
  symbol: FlowchartSymbolType;
  label: string;
  x: number;
  y: number;
}

export interface FreeformEdge {
  id: string;
  from: string;
  to: string;
  branchLabel?: 'Yes' | 'No' | '';
}

export interface SymbolDrillItem {
  id: string;
  kind: 'identify' | 'scenario' | 'spot_error';
  prompt: string;
  context?: string;
  displaySymbol?: FlowchartSymbolType;
  errorDiagramId?: 'missing-end' | 'unlabelled-decision' | 'wrong-io-shape' | 'missing-arrows';
  options: Array<{ id: string; label: string; symbol?: FlowchartSymbolType }>;
  correctOptionId: string;
  explanation: string;
  markTip: string;
}

export interface MindMapSlot {
  id: string;
  level: 'central' | 'main' | 'sub';
  parentId?: string;
  x: number;
  y: number;
  expectedLabel: string;
  locked?: boolean;
}

export interface MindMapChallenge {
  id: string;
  title: string;
  brief: string;
  maxMarks: number;
  slots: MindMapSlot[];
  optionBank: string[];
}

export interface WireframeElementOption {
  id: string;
  label: string;
  zone: 'header' | 'nav' | 'hero' | 'form' | 'footer' | 'annotation';
  required: boolean;
  isDistractor: boolean;
  reason: string;
}

export interface WireframeChallenge {
  id: string;
  title: string;
  brief: string;
  maxMarks: number;
  elements: WireframeElementOption[];
}

export interface VisualisationPin {
  id: string;
  number: number;
  x: number;
  y: number;
  regionLabel: string;
  expectedAnnotationId: string;
}

export interface VisualisationChallenge {
  id: string;
  title: string;
  brief: string;
  maxMarks: number;
  pins: VisualisationPin[];
  annotationOptions: Array<{ id: string; label: string; category: string }>;
}

export interface ToolChoiceQuestion {
  id: string;
  scenario: string;
  client: string;
  correctTool: 'Flowchart' | 'Wireframe' | 'Mind Map' | 'Visualisation Diagram' | 'Mood Board' | 'Site Map';
  toolOptions: Array<'Flowchart' | 'Wireframe' | 'Mind Map' | 'Visualisation Diagram' | 'Mood Board' | 'Site Map'>;
  reasonOptions: Array<{ id: string; text: string; correct: boolean }>;
  markSchemeNote: string;
}

export interface Ta1TrainerProgress {
  completedFlowcharts: Record<string, { bestMarks: number; maxMarks: number }>;
  completedDrills: Record<string, boolean>;
  completedBlueprints: Record<string, { bestMarks: number; maxMarks: number }>;
  completedToolMatches: Record<string, boolean>;
}

export interface Ta1MasterySummary {
  completedChallenges: number;
  totalChallenges: number;
  masteryPct: number;
  flowchartsDone: number;
  flowchartsTotal: number;
  drillsDone: number;
  drillsTotal: number;
  blueprintsDone: number;
  blueprintsTotal: number;
  toolsDone: number;
  toolsTotal: number;
}

export const ISO_SYMBOLS: Record<FlowchartSymbolType, SymbolDefinition> = {
  terminator: {
    type: 'terminator',
    name: 'Terminator',
    shapeLabel: 'Rounded Oval / Stadium',
    purpose: 'Marks the Start or End point of an algorithm or process.',
    examExample: 'Start / End',
    keyRule: 'Every valid OCR flowchart must begin with a Start terminator and finish at an End terminator.',
  },
  io: {
    type: 'io',
    name: 'Input / Output',
    shapeLabel: 'Slanted Parallelogram',
    purpose: 'Shows data entered by a user/sensor or information displayed/sent out.',
    examExample: 'Input Quantity / Display Receipt',
    keyRule: 'Use a parallelogram whenever data enters or leaves the system (never a plain rectangle).',
  },
  process: {
    type: 'process',
    name: 'Process',
    shapeLabel: 'Rectangle',
    purpose: 'Represents an internal action, calculation, or database update.',
    examExample: 'Deduct Stock / Calculate Total',
    keyRule: 'Always has one incoming flow and one outgoing flow performing a clear action.',
  },
  decision: {
    type: 'decision',
    name: 'Decision',
    shapeLabel: 'Diamond',
    purpose: 'Tests a Yes/No (True/False) condition that splits program flow into two branches.',
    examExample: 'Stock >= Qty? / Valid QR Code?',
    keyRule: 'Must have TWO labelled outgoing arrows (Yes and No) so both outcomes are unambiguous.',
  },
  subroutine: {
    type: 'subroutine',
    name: 'Sub-routine',
    shapeLabel: 'Double-Barred Rectangle',
    purpose: 'Calls a separate pre-defined reusable sub-process or module.',
    examExample: 'Run Payment Verification()',
    keyRule: 'Saves space and avoids duplicating complex logic that is defined in another flowchart.',
  },
};

export const FLOWCHART_SCENARIOS: FlowchartScenario[] = [
  {
    id: 'greenleaf-stock',
    title: 'GreenLeaf Online Order Stock Check',
    context: 'TA1 · E-Commerce Algorithm (Paper 1 Style)',
    brief: 'Complete the missing ISO flowchart symbols, step labels, and Yes/No decision branches for GreenLeaf Nursery’s online checkout stock verification.',
    maxMarks: 6,
    viewBoxWidth: 720,
    viewBoxHeight: 540,
    nodes: [
      {
        id: 'n1',
        x: 360,
        y: 44,
        expectedSymbol: 'terminator',
        expectedLabel: 'Start',
        locked: true,
        hint: 'Every flowchart starts with a Start Terminator (oval).',
      },
      {
        id: 'n2',
        x: 360,
        y: 132,
        expectedSymbol: 'io',
        expectedLabel: 'Input item & quantity',
        hint: 'The customer enters data into the system — which ISO symbol represents Input/Output?',
      },
      {
        id: 'n3',
        x: 360,
        y: 234,
        expectedSymbol: 'decision',
        expectedLabel: 'Stock >= quantity?',
        hint: 'This step asks a Yes/No condition that splits the flow into two paths.',
      },
      {
        id: 'n4',
        x: 175,
        y: 356,
        expectedSymbol: 'process',
        expectedLabel: 'Deduct stock & confirm',
        hint: 'Updating the inventory database is an internal calculation/action.',
      },
      {
        id: 'n5',
        x: 545,
        y: 356,
        expectedSymbol: 'io',
        expectedLabel: 'Display "Out of stock"',
        hint: 'Showing an alert message on screen sends information out to the user.',
      },
      {
        id: 'n6',
        x: 360,
        y: 478,
        expectedSymbol: 'terminator',
        expectedLabel: 'End',
        hint: 'Both branches must converge cleanly into a final Terminator symbol.',
      },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2', branchRole: 'flow', route: 'straight' },
      { id: 'e2', from: 'n2', to: 'n3', branchRole: 'flow', route: 'straight' },
      { id: 'e3', from: 'n3', to: 'n4', branchRole: 'yes', expectedBranchLabel: 'Yes', route: 'left-down' },
      { id: 'e4', from: 'n3', to: 'n5', branchRole: 'no', expectedBranchLabel: 'No', route: 'right-down' },
      { id: 'e5', from: 'n4', to: 'n6', branchRole: 'flow', route: 'merge-left' },
      { id: 'e6', from: 'n5', to: 'n6', branchRole: 'flow', route: 'merge-right' },
    ],
    labelBank: [
      'Input item & quantity',
      'Stock >= quantity?',
      'Deduct stock & confirm',
      'Display "Out of stock"',
      'End',
      'Print warehouse map',
    ],
    testCases: [
      {
        id: 'in-stock',
        label: 'In Stock (Qty 2, Stock 14)',
        description: 'Stock >= quantity evaluates to Yes, deducting inventory before ending.',
        decisions: { n3: 'Yes' },
      },
      {
        id: 'out-of-stock',
        label: 'Out of Stock (Qty 5, Stock 1)',
        description: 'Stock >= quantity evaluates to No, alerting the shopper before ending.',
        decisions: { n3: 'No' },
      },
    ],
  },
  {
    id: 'swiftfit-turnstile',
    title: 'SwiftFit Smart Turnstile Access',
    context: 'TA1 + TA6 · Smart Entry System (OCR Past Paper Style)',
    brief: 'Configure the symbols, labels, and branches for SwiftFit Gym’s automated QR membership gate, including calling a reusable sub-routine.',
    maxMarks: 6,
    viewBoxWidth: 720,
    viewBoxHeight: 540,
    nodes: [
      {
        id: 'n1',
        x: 360,
        y: 44,
        expectedSymbol: 'terminator',
        expectedLabel: 'Start',
        locked: true,
        hint: 'Begins the turnstile entry sequence.',
      },
      {
        id: 'n2',
        x: 360,
        y: 132,
        expectedSymbol: 'io',
        expectedLabel: 'Scan member QR code',
        hint: 'Reading a QR code from a scanner is data input to the system.',
      },
      {
        id: 'n3',
        x: 360,
        y: 234,
        expectedSymbol: 'decision',
        expectedLabel: 'Membership active?',
        hint: 'Checks whether the scanned account is valid and active.',
      },
      {
        id: 'n4',
        x: 175,
        y: 356,
        expectedSymbol: 'subroutine',
        expectedLabel: 'Run UnlockGate()',
        hint: 'Calls a pre-defined reusable hardware routine defined elsewhere.',
      },
      {
        id: 'n5',
        x: 545,
        y: 356,
        expectedSymbol: 'io',
        expectedLabel: 'Show "See Reception"',
        hint: 'Outputs a message on the turnstile screen.',
      },
      {
        id: 'n6',
        x: 360,
        y: 478,
        expectedSymbol: 'terminator',
        expectedLabel: 'End',
        hint: 'Marks completion of the gate cycle.',
      },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2', branchRole: 'flow', route: 'straight' },
      { id: 'e2', from: 'n2', to: 'n3', branchRole: 'flow', route: 'straight' },
      { id: 'e3', from: 'n3', to: 'n4', branchRole: 'yes', expectedBranchLabel: 'Yes', route: 'left-down' },
      { id: 'e4', from: 'n3', to: 'n5', branchRole: 'no', expectedBranchLabel: 'No', route: 'right-down' },
      { id: 'e5', from: 'n4', to: 'n6', branchRole: 'flow', route: 'merge-left' },
      { id: 'e6', from: 'n5', to: 'n6', branchRole: 'flow', route: 'merge-right' },
    ],
    labelBank: [
      'Scan member QR code',
      'Membership active?',
      'Run UnlockGate()',
      'Show "See Reception"',
      'End',
      'Reset gym Wi-Fi',
    ],
    testCases: [
      {
        id: 'active-member',
        label: 'Active Member QR',
        description: 'Valid membership triggers the UnlockGate() sub-routine.',
        decisions: { n3: 'Yes' },
      },
      {
        id: 'expired-member',
        label: 'Expired Pass QR',
        description: 'Inactive membership displays the reception prompt.',
        decisions: { n3: 'No' },
      },
    ],
  },
  {
    id: 'ecocharge-meter',
    title: 'EcoCharge Smart Meter Budget Alert',
    context: 'TA1 + TA6 · Smart Energy Monitoring (June 2024 Style)',
    brief: 'Build the logic for a home smart energy display that reads sensor usage, compares against the daily budget, and either sends a warning or updates normal status.',
    maxMarks: 6,
    viewBoxWidth: 720,
    viewBoxHeight: 540,
    nodes: [
      {
        id: 'n1',
        x: 360,
        y: 44,
        expectedSymbol: 'terminator',
        expectedLabel: 'Start',
        locked: true,
        hint: 'Starts the scheduled meter check.',
      },
      {
        id: 'n2',
        x: 360,
        y: 132,
        expectedSymbol: 'io',
        expectedLabel: 'Read kWh sensor',
        hint: 'Captures live energy reading input from the meter sensor.',
      },
      {
        id: 'n3',
        x: 360,
        y: 234,
        expectedSymbol: 'decision',
        expectedLabel: 'Usage > daily limit?',
        hint: 'Compares live kWh against the customer’s daily threshold.',
      },
      {
        id: 'n4',
        x: 175,
        y: 356,
        expectedSymbol: 'io',
        expectedLabel: 'Send high-usage alert',
        hint: 'Outputs a push notification to the homeowner’s phone.',
      },
      {
        id: 'n5',
        x: 545,
        y: 356,
        expectedSymbol: 'process',
        expectedLabel: 'Log normal usage',
        hint: 'Stores the normal daily metric inside the database.',
      },
      {
        id: 'n6',
        x: 360,
        y: 478,
        expectedSymbol: 'terminator',
        expectedLabel: 'End',
        hint: 'Finishes the hourly check cleanly.',
      },
    ],
    edges: [
      { id: 'e1', from: 'n1', to: 'n2', branchRole: 'flow', route: 'straight' },
      { id: 'e2', from: 'n2', to: 'n3', branchRole: 'flow', route: 'straight' },
      { id: 'e3', from: 'n3', to: 'n4', branchRole: 'yes', expectedBranchLabel: 'Yes', route: 'left-down' },
      { id: 'e4', from: 'n3', to: 'n5', branchRole: 'no', expectedBranchLabel: 'No', route: 'right-down' },
      { id: 'e5', from: 'n4', to: 'n6', branchRole: 'flow', route: 'merge-left' },
      { id: 'e6', from: 'n5', to: 'n6', branchRole: 'flow', route: 'merge-right' },
    ],
    labelBank: [
      'Read kWh sensor',
      'Usage > daily limit?',
      'Send high-usage alert',
      'Log normal usage',
      'End',
      'Order solar panel',
    ],
    testCases: [
      {
        id: 'over-budget',
        label: 'Over Limit (18.4 kWh > 15 kWh)',
        description: 'Exceeds daily limit — outputs high-usage alert notification.',
        decisions: { n3: 'Yes' },
      },
      {
        id: 'within-budget',
        label: 'Within Limit (9.2 kWh <= 15 kWh)',
        description: 'Within limit — logs normal usage in database.',
        decisions: { n3: 'No' },
      },
    ],
  },
];

export const SYMBOL_DRILL_BANK: SymbolDrillItem[] = [
  {
    id: 'sd-1',
    kind: 'identify',
    prompt: 'Identify the ISO 5807 flowchart symbol shown below and its purpose:',
    displaySymbol: 'decision',
    options: [
      { id: 'a', label: 'Process — performs a calculation or database update' },
      { id: 'b', label: 'Decision — tests a Yes/No condition and branches flow' },
      { id: 'c', label: 'Input / Output — receives user data or displays output' },
      { id: 'd', label: 'Terminator — marks the Start or End of a flowchart' },
    ],
    correctOptionId: 'b',
    explanation: 'A diamond represents a Decision (selection) point where flow splits along two labelled outgoing branches (e.g. Yes and No).',
    markTip: 'Always draw two labelled arrows exiting a decision diamond to earn full OCR layout marks.',
  },
  {
    id: 'sd-2',
    kind: 'identify',
    prompt: 'Identify this slanted parallelogram symbol used in TA1 flowcharts:',
    displaySymbol: 'io',
    options: [
      { id: 'a', label: 'Input / Output — data entered or information output' },
      { id: 'b', label: 'Sub-routine — calls a pre-defined reusable module' },
      { id: 'c', label: 'Process — updates a stored variable or record' },
      { id: 'd', label: 'Decision — evaluates a Boolean expression' },
    ],
    correctOptionId: 'a',
    explanation: 'A parallelogram denotes any Input (typing a password, scanning a barcode) or Output (displaying an error, printing a receipt).',
    markTip: 'A very common exam mistake is drawing a rectangle for "Enter Username" — always use a parallelogram.',
  },
  {
    id: 'sd-3',
    kind: 'identify',
    prompt: 'What does this double-barred rectangle represent in an OCR flowchart?',
    displaySymbol: 'subroutine',
    options: [
      { id: 'a', label: 'Terminator — stops the program immediately' },
      { id: 'b', label: 'Sub-routine — calls a separate pre-defined process' },
      { id: 'c', label: 'Input / Output — sends data to an external screen' },
      { id: 'd', label: 'Loop — repeats a step ten times automatically' },
    ],
    correctOptionId: 'b',
    explanation: 'A rectangle with double vertical bars represents a Sub-routine (pre-defined process) whose steps are detailed in another flowchart.',
    markTip: 'Using sub-routines keeps complex flowcharts readable and prevents repeating identical validation steps.',
  },
  {
    id: 'sd-4',
    kind: 'scenario',
    prompt: 'A ticket kiosk calculates: TotalCost = AdultTickets × £12 + ChildTickets × £7. Which symbol must wrap this step?',
    context: 'OCR Scenario Application',
    options: [
      { id: 'a', label: 'Terminator (Oval)', symbol: 'terminator' },
      { id: 'b', label: 'Input / Output (Parallelogram)', symbol: 'io' },
      { id: 'c', label: 'Process (Rectangle)', symbol: 'process' },
      { id: 'd', label: 'Decision (Diamond)', symbol: 'decision' },
    ],
    correctOptionId: 'c',
    explanation: 'Performing an arithmetic calculation is an internal system action, so it must be placed inside a Process rectangle.',
    markTip: 'Calculations, sorting, and updating database fields are always Process rectangles.',
  },
  {
    id: 'sd-5',
    kind: 'spot_error',
    prompt: 'Spot the OCR exam error in this mini-flowchart:',
    errorDiagramId: 'unlabelled-decision',
    options: [
      { id: 'a', label: 'The Start node uses a Terminator instead of a Process box' },
      { id: 'b', label: 'The Decision diamond has unlabelled outgoing branches (missing Yes / No)' },
      { id: 'c', label: 'There are too many flowlines entering the Start node' },
      { id: 'd', label: 'A flowchart cannot display a message to a user' },
    ],
    correctOptionId: 'b',
    explanation: 'Decision diamonds MUST have clearly labelled outgoing branches (such as Yes/No or True/False); without labels, developers cannot tell which path to follow.',
    markTip: 'Examiners deduct convention marks whenever a decision arrow lacks a Yes/No label.',
  },
  {
    id: 'sd-6',
    kind: 'spot_error',
    prompt: 'Identify the convention mistake in this student’s flowchart:',
    errorDiagramId: 'wrong-io-shape',
    options: [
      { id: 'a', label: '"Input PIN" is drawn inside a Process rectangle instead of an Input/Output parallelogram' },
      { id: 'b', label: 'The End node should be a Decision diamond' },
      { id: 'c', label: 'Flowcharts should run from bottom to top' },
      { id: 'd', label: 'PIN entry requires a Sub-routine instead of Input' },
    ],
    correctOptionId: 'a',
    explanation: 'Entering a PIN is user input, so it requires a slanted Input/Output parallelogram rather than a standard Process rectangle.',
    markTip: 'Look for verbs like Input, Enter, Scan, Display, Print, or Send — all of those require a parallelogram.',
  },
  {
    id: 'sd-7',
    kind: 'spot_error',
    prompt: 'Why would this flowchart lose marks under the OCR R050 mark scheme?',
    errorDiagramId: 'missing-end',
    options: [
      { id: 'a', label: 'The Process rectangle is shaped incorrectly' },
      { id: 'b', label: 'It has no End terminator — one branch stops at a dead end' },
      { id: 'c', label: 'It uses Yes and No labels instead of 1 and 0' },
      { id: 'd', label: 'Start should be placed inside a parallelogram' },
    ],
    correctOptionId: 'b',
    explanation: 'Every branch in an OCR flowchart must reach a valid termination point (End terminator) or loop back clearly — leaving a dangling dead end loses structure marks.',
    markTip: 'Trace every single branch with your finger before finishing an exam drawing to verify all paths terminate.',
  },
  {
    id: 'sd-8',
    kind: 'spot_error',
    prompt: 'What essential flowchart convention is missing from the diagram shown?',
    errorDiagramId: 'missing-arrows',
    options: [
      { id: 'a', label: 'Colour-coded shading inside each box' },
      { id: 'b', label: 'Directional arrowheads on the connecting lines showing order of flow' },
      { id: 'c', label: 'A legend explaining the font size used' },
      { id: 'd', label: 'A wireframe header box at the top' },
    ],
    correctOptionId: 'b',
    explanation: 'Plain lines without arrowheads do not show the direction of execution. Flowlines must include arrowheads indicating the exact sequence.',
    markTip: 'Flowcharts flow top-to-bottom or left-to-right, and every connector line needs a clear directional arrowhead.',
  },
];

export const MIND_MAP_CHALLENGE: MindMapChallenge = {
  id: 'mindmap-sports-centre',
  title: 'Mind Map: ActiveLife Sports Centre App',
  brief: 'Place the central theme, main branches, and sub-nodes into the correct hierarchy for a new sports centre online booking system (OCR June 2024 / Practice style).',
  maxMarks: 6,
  slots: [
    { id: 'mm-center', level: 'central', x: 360, y: 210, expectedLabel: 'Sports Centre Booking App', locked: true },
    { id: 'mm-b1', level: 'main', parentId: 'mm-center', x: 165, y: 110, expectedLabel: 'Facilities & Classes' },
    { id: 'mm-b2', level: 'main', parentId: 'mm-center', x: 555, y: 110, expectedLabel: 'Payment & Memberships' },
    { id: 'mm-b3', level: 'main', parentId: 'mm-center', x: 360, y: 345, expectedLabel: 'User Accounts & Accessibility' },
    { id: 'mm-s1', level: 'sub', parentId: 'mm-b1', x: 85, y: 38, expectedLabel: 'Swimming & Gym Slots' },
    { id: 'mm-s2', level: 'sub', parentId: 'mm-b2', x: 630, y: 38, expectedLabel: 'Card / Apple Pay Checkout' },
    { id: 'mm-s3', level: 'sub', parentId: 'mm-b3', x: 560, y: 390, expectedLabel: 'Screen Reader & Large Text' },
  ],
  optionBank: [
    'Facilities & Classes',
    'Payment & Memberships',
    'User Accounts & Accessibility',
    'Swimming & Gym Slots',
    'Card / Apple Pay Checkout',
    'Screen Reader & Large Text',
  ],
};

export const WIREFRAME_CHALLENGE: WireframeChallenge = {
  id: 'wireframe-peaktours',
  title: 'Wireframe: PeakTours Mobile Booking Screen',
  brief: 'Toggle ON the 6 structural elements that belong on a low-fidelity Wireframe, and leave OFF the 3 distractor items that belong on a Mood Board or Visualisation Diagram.',
  maxMarks: 6,
  elements: [
    {
      id: 'wf-logo',
      label: 'Header bar with Logo placeholder box',
      zone: 'header',
      required: true,
      isDistractor: false,
      reason: 'Wireframes define top header placement and logo box proportions without final artwork.',
    },
    {
      id: 'wf-nav',
      label: 'Primary navigation bar (Home · Trips · Bookings)',
      zone: 'nav',
      required: true,
      isDistractor: false,
      reason: 'Mapping navigation placement and hierarchy is a core purpose of a wireframe.',
    },
    {
      id: 'wf-hero',
      label: 'Crossed placeholder box [X] for hero banner image',
      zone: 'hero',
      required: true,
      isDistractor: false,
      reason: 'Low-fidelity wireframes mark image areas using crossed boxes [X] rather than final photos.',
    },
    {
      id: 'wf-form',
      label: 'Destination search input & date picker fields',
      zone: 'form',
      required: true,
      isDistractor: false,
      reason: 'Interactive inputs and form controls must be positioned early to plan user flow.',
    },
    {
      id: 'wf-cta',
      label: 'Primary "Search Holidays" button placement',
      zone: 'form',
      required: true,
      isDistractor: false,
      reason: 'Clear CTA button placement verifies usability and interactive navigation.',
    },
    {
      id: 'wf-notes',
      label: 'Layout & interaction annotations in the margin',
      zone: 'annotation',
      required: true,
      isDistractor: false,
      reason: 'OCR mark schemes award higher-band marks for clear annotations explaining navigation and element behaviour.',
    },
    {
      id: 'wf-dist-photo',
      label: 'Full-colour high-res holiday beach photography',
      zone: 'hero',
      required: false,
      isDistractor: true,
      reason: 'Distractor: Wireframes are low-fidelity greyscale skeletons — final photography belongs in a mockup or prototype, not a wireframe.',
    },
    {
      id: 'wf-dist-palette',
      label: 'Brand hex colour swatches & fabric textures',
      zone: 'annotation',
      required: false,
      isDistractor: true,
      reason: 'Distractor: Colour schemes and visual textures belong on a Mood Board or Visualisation Diagram, not a wireframe.',
    },
    {
      id: 'wf-dist-copy',
      label: 'Final 500-word marketing brochure paragraphs',
      zone: 'footer',
      required: false,
      isDistractor: true,
      reason: 'Distractor: Wireframes use placeholder text lines rather than final polished marketing prose.',
    },
  ],
};

export const VISUALISATION_CHALLENGE: VisualisationChallenge = {
  id: 'vis-roadsafety',
  title: 'Visualisation Diagram: Road Safety Game Poster',
  brief: 'Match each numbered annotation callout on the poster sketch to the exact OCR Visualisation Diagram detail required for top-band marks.',
  maxMarks: 6,
  pins: [
    { id: 'vp-1', number: 1, x: 300, y: 58, regionLabel: 'Top Headline Banner', expectedAnnotationId: 'va-font' },
    { id: 'vp-2', number: 2, x: 475, y: 120, regionLabel: 'Background & Border', expectedAnnotationId: 'va-colour' },
    { id: 'vp-3', number: 3, x: 240, y: 205, regionLabel: 'Central Hero Graphic', expectedAnnotationId: 'va-image' },
    { id: 'vp-4', number: 4, x: 465, y: 270, regionLabel: 'Game Features Box', expectedAnnotationId: 'va-text' },
    { id: 'vp-5', number: 5, x: 135, y: 342, regionLabel: 'Bottom-Left QR & Badge', expectedAnnotationId: 'va-logo' },
    { id: 'vp-6', number: 6, x: 465, y: 365, regionLabel: 'Outer Page Margin', expectedAnnotationId: 'va-dims' },
  ],
  annotationOptions: [
    { id: 'va-font', label: 'Bold Sans-Serif 48pt title ("Cross Smart!") for readability', category: 'Typography' },
    { id: 'va-colour', label: 'High-contrast Yellow (#FACC15) & Navy house-style palette', category: 'Colour Scheme' },
    { id: 'va-image', label: 'Vector illustration of zebra crossing & cyclist (14cm × 10cm)', category: 'Imagery & Scale' },
    { id: 'va-text', label: '3 bullet points aimed at ages 11–14 explaining gameplay', category: 'Target Audience Copy' },
    { id: 'va-logo', label: 'Council sponsor logo + scannable download QR code', category: 'Branding & Assets' },
    { id: 'va-dims', label: 'A3 Portrait (297mm × 420mm) with 15mm print safe margin', category: 'Dimensions & Layout' },
  ],
};

export const TOOL_CHOICE_QUESTIONS: ToolChoiceQuestion[] = [
  {
    id: 'tc-1',
    client: 'GreenLeaf Garden Centre',
    scenario: 'The developer needs to map out the exact step-by-step checkout logic, including checking whether stock is sufficient and branching to an error message if not.',
    correctTool: 'Flowchart',
    toolOptions: ['Flowchart', 'Mood Board', 'Mind Map', 'Visualisation Diagram'],
    reasonOptions: [
      { id: 'r1', text: 'Shows sequential processes, input/output steps, and Yes/No decision branches clearly before coding.', correct: true },
      { id: 'r2', text: 'Collects colour palettes and imagery to agree on brand tone with the client.', correct: false },
      { id: 'r3', text: 'Displays the exact pixel dimensions and typography of a printed poster.', correct: false },
    ],
    markSchemeNote: 'Flowcharts model algorithms, validation checks, and decision branching prior to programming.',
  },
  {
    id: 'tc-2',
    client: 'PeakTours Travel Agency',
    scenario: 'Before hiring front-end coders, the UX designer wants to sketch the screen layout, navigation menu placement, and image placeholder boxes for the mobile booking app.',
    correctTool: 'Wireframe',
    toolOptions: ['Wireframe', 'Flowchart', 'Mind Map', 'Mood Board'],
    reasonOptions: [
      { id: 'r1', text: 'Defines low-fidelity screen structure, interactive controls, and navigation hierarchy without distracting colour styling.', correct: true },
      { id: 'r2', text: 'Tests Boolean logic conditions inside the payment database.', correct: false },
      { id: 'r3', text: 'Groups initial brainstorming ideas into central and sub-nodes.', correct: false },
    ],
    markSchemeNote: 'Wireframes focus strictly on UI layout, placeholders, and navigation flow before development.',
  },
  {
    id: 'tc-3',
    client: 'NovaCare Health Portal',
    scenario: 'The project manager wants a clear diagram showing how the Home page connects hierarchically to Appointments, Prescriptions, GP Profiles, and Help sub-pages.',
    correctTool: 'Site Map',
    toolOptions: ['Site Map', 'Visualisation Diagram', 'Mood Board', 'Flowchart'],
    reasonOptions: [
      { id: 'r1', text: 'Illustrates parent-child web page hierarchy and navigation link pathways across a multi-page website.', correct: true },
      { id: 'r2', text: 'Shows detailed font styles, colour codes, and dimensions for a single leaflet.', correct: false },
      { id: 'r3', text: 'Collects photographic inspiration and textures for branding.', correct: false },
    ],
    markSchemeNote: 'Site maps plan multi-page website architecture and navigation depth.',
  },
  {
    id: 'tc-4',
    client: 'City Youth Road Safety Campaign',
    scenario: 'A graphic designer must show the client an annotated rough sketch of what a single static A3 awareness poster will look like, including colours, fonts, and image positions.',
    correctTool: 'Visualisation Diagram',
    toolOptions: ['Visualisation Diagram', 'Wireframe', 'Site Map', 'Flowchart'],
    reasonOptions: [
      { id: 'r1', text: 'Presents an annotated visual plan of a static final product including colours, typography, imagery, and layout.', correct: true },
      { id: 'r2', text: 'Maps conditional loops and hardware sensor triggers.', correct: false },
      { id: 'r3', text: 'Maps hierarchical link structure between 20 website pages.', correct: false },
    ],
    markSchemeNote: 'Visualisation diagrams are specifically for static visual products (posters, covers, packaging, single graphics).',
  },
  {
    id: 'tc-5',
    client: 'SwiftFit Fitness Wearable',
    scenario: 'During the first creative meeting, the design team wants to quickly generate and organise raw ideas for app features into main categories and sub-ideas.',
    correctTool: 'Mind Map',
    toolOptions: ['Mind Map', 'Flowchart', 'Wireframe', 'Site Map'],
    reasonOptions: [
      { id: 'r1', text: 'Uses a central node with radiating branches and sub-nodes to structure creative brainstorming.', correct: true },
      { id: 'r2', text: 'Specifies exact screen button positions and form fields.', correct: false },
      { id: 'r3', text: 'Traces step-by-step authentication decisions with ISO symbols.', correct: false },
    ],
    markSchemeNote: 'Mind maps are ideal at the earliest ideation stage to organise themes and sub-topics.',
  },
  {
    id: 'tc-6',
    client: 'Aurora Artisan Coffee',
    scenario: 'Before designing any screens or packaging, the agency wants to agree on the overall visual look, warm colour palette, photography style, and textures with the client.',
    correctTool: 'Mood Board',
    toolOptions: ['Mood Board', 'Wireframe', 'Flowchart', 'Site Map'],
    reasonOptions: [
      { id: 'r1', text: 'Collates colours, fonts, textures, and sample imagery to establish creative direction and house style.', correct: true },
      { id: 'r2', text: 'Maps out the logic of an online loyalty points calculation.', correct: false },
      { id: 'r3', text: 'Shows page-to-page hyperlinks across the e-commerce store.', correct: false },
    ],
    markSchemeNote: 'Mood boards set creative tone and visual identity — they do NOT show exact layout or code logic.',
  },
];

function normalizeText(value: string | undefined | null): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function createInitialSubmission(scenario: FlowchartScenario): FlowchartUserSubmission {
  const nodeSymbols: Record<string, FlowchartSymbolType | ''> = {};
  const nodeLabels: Record<string, string> = {};
  const edgeLabels: Record<string, string> = {};

  for (const node of scenario.nodes) {
    if (node.locked) {
      nodeSymbols[node.id] = node.expectedSymbol;
      nodeLabels[node.id] = node.expectedLabel;
    } else {
      nodeSymbols[node.id] = '';
      nodeLabels[node.id] = '';
    }
  }
  for (const edge of scenario.edges) {
    if (edge.expectedBranchLabel) {
      edgeLabels[edge.id] = edge.labelLocked ? edge.expectedBranchLabel : '';
    }
  }
  return { nodeSymbols, nodeLabels, edgeLabels };
}

export function createModelSubmission(scenario: FlowchartScenario): FlowchartUserSubmission {
  const nodeSymbols: Record<string, FlowchartSymbolType | ''> = {};
  const nodeLabels: Record<string, string> = {};
  const edgeLabels: Record<string, string> = {};

  for (const node of scenario.nodes) {
    nodeSymbols[node.id] = node.expectedSymbol;
    nodeLabels[node.id] = node.expectedLabel;
  }
  for (const edge of scenario.edges) {
    if (edge.expectedBranchLabel) {
      edgeLabels[edge.id] = edge.expectedBranchLabel;
    }
  }
  return { nodeSymbols, nodeLabels, edgeLabels };
}

export function evaluateFlowchartSubmission(
  scenario: FlowchartScenario,
  submission: FlowchartUserSubmission
): FlowchartEvaluationResult {
  const nodeResults: Record<string, { symbolCorrect: boolean; labelCorrect: boolean; message: string }> = {};
  const edgeResults: Record<string, { correct: boolean; message: string }> = {};

  const editableNodes = scenario.nodes.filter((n) => !n.locked);
  let correctSymbolsCount = 0;
  let correctLabelsCount = 0;

  for (const node of scenario.nodes) {
    const userSym = submission.nodeSymbols[node.id] || '';
    const userLabel = submission.nodeLabels[node.id] || '';
    const symbolCorrect = userSym === node.expectedSymbol;
    const labelCorrect = normalizeText(userLabel) === normalizeText(node.expectedLabel);

    if (!node.locked) {
      if (symbolCorrect) correctSymbolsCount++;
      if (labelCorrect) correctLabelsCount++;
    }

    let message = 'Matches OCR mark scheme.';
    if (!userSym && !userLabel) {
      message = `Unfilled slot — select ${ISO_SYMBOLS[node.expectedSymbol].name} and "${node.expectedLabel}".`;
    } else if (!symbolCorrect && !labelCorrect) {
      message = `Expected ${ISO_SYMBOLS[node.expectedSymbol].name} with label "${node.expectedLabel}".`;
    } else if (!symbolCorrect) {
      message = `Label is right, but use a ${ISO_SYMBOLS[node.expectedSymbol].name} (${ISO_SYMBOLS[node.expectedSymbol].shapeLabel}).`;
    } else if (!labelCorrect) {
      message = `Symbol is right, but expected step "${node.expectedLabel}".`;
    }

    nodeResults[node.id] = { symbolCorrect, labelCorrect, message };
  }

  const branchEdges = scenario.edges.filter((e) => Boolean(e.expectedBranchLabel));
  let correctBranchesCount = 0;

  for (const edge of branchEdges) {
    const userBranch = submission.edgeLabels[edge.id] || '';
    const correct = normalizeText(userBranch) === normalizeText(edge.expectedBranchLabel);
    if (correct) correctBranchesCount++;
    edgeResults[edge.id] = {
      correct,
      message: correct
        ? `Branch correctly labelled "${edge.expectedBranchLabel}".`
        : `Label this decision branch "${edge.expectedBranchLabel}".`,
    };
  }

  // OCR 6-Mark Rubric Breakdown:
  // 1. Start & End Terminators (1 mark)
  const endNodes = scenario.nodes.filter((n) => n.expectedSymbol === 'terminator');
  const terminatorsPass = endNodes.every((n) => nodeResults[n.id].symbolCorrect && nodeResults[n.id].labelCorrect);

  // 2. Decision Diamond + Logic Condition (1 mark)
  const decisionNodes = scenario.nodes.filter((n) => n.expectedSymbol === 'decision');
  const decisionPass = decisionNodes.every((n) => nodeResults[n.id].symbolCorrect && nodeResults[n.id].labelCorrect);

  // 3. Labelled Yes/No Decision Branches (1 mark)
  const branchesPass = branchEdges.length > 0 && correctBranchesCount === branchEdges.length;

  // 4. Input / Output & Action Symbols (2 marks: 1 for >=50% editable shapes, 2 for all non-terminator shapes)
  const nonTermEditable = editableNodes.filter((n) => n.expectedSymbol !== 'terminator');
  const nonTermSymbolsCorrect = nonTermEditable.filter((n) => nodeResults[n.id].symbolCorrect).length;
  const isoShapesMarks =
    nonTermEditable.length > 0 && nonTermSymbolsCorrect === nonTermEditable.length
      ? 2
      : nonTermSymbolsCorrect >= Math.ceil(nonTermEditable.length / 2)
        ? 1
        : 0;

  // 5. Accurate Logical Step Sequence (1 mark: all editable labels correct)
  const sequencePass = editableNodes.length > 0 && correctLabelsCount === editableNodes.length;

  const criteria: MarkSchemeCriterionResult[] = [
    {
      id: 'c-terminators',
      label: 'Start & End Terminators (Oval)',
      marksEarned: terminatorsPass ? 1 : 0,
      maxMarks: 1,
      passed: terminatorsPass,
      feedback: terminatorsPass
        ? 'Flowchart opens with Start and terminates cleanly with an End oval.'
        : 'Ensure the final node uses a Terminator (oval) labelled "End".',
    },
    {
      id: 'c-decision',
      label: 'Decision Diamond & Condition',
      marksEarned: decisionPass ? 1 : 0,
      maxMarks: 1,
      passed: decisionPass,
      feedback: decisionPass
        ? 'Decision point uses a Diamond symbol with the exact Yes/No condition.'
        : 'Place the conditional check inside a Decision diamond symbol.',
    },
    {
      id: 'c-branches',
      label: 'Labelled Yes / No Branches',
      marksEarned: branchesPass ? 1 : 0,
      maxMarks: 1,
      passed: branchesPass,
      feedback: branchesPass
        ? 'Both outgoing decision arrows are clearly labelled Yes and No.'
        : 'Label both arrows leaving the Decision diamond as "Yes" and "No".',
    },
    {
      id: 'c-shapes',
      label: 'Correct ISO 5807 Symbols (I/O, Process, Sub-routine)',
      marksEarned: isoShapesMarks,
      maxMarks: 2,
      passed: isoShapesMarks === 2,
      feedback:
        isoShapesMarks === 2
          ? 'Every step uses the exact ISO symbol for Input/Output, Process, or Sub-routine.'
          : `${nonTermSymbolsCorrect}/${nonTermEditable.length} non-terminator symbols match ISO conventions (Parallelogram for I/O, Rectangle for Process).`,
    },
    {
      id: 'c-sequence',
      label: 'Logical Sequence & Scenario Labels',
      marksEarned: sequencePass ? 1 : 0,
      maxMarks: 1,
      passed: sequencePass,
      feedback: sequencePass
        ? 'All scenario steps follow the exact logical order from input through branching to output.'
        : `${correctLabelsCount}/${editableNodes.length} editable step labels match the scenario flow.`,
    },
  ];

  const marksEarned = criteria.reduce((sum, c) => sum + c.marksEarned, 0);
  const maxMarks = scenario.maxMarks;
  const pct = maxMarks > 0 ? Math.round((marksEarned / maxMarks) * 100) : 0;

  return {
    marksEarned,
    maxMarks,
    pct,
    nodeResults,
    edgeResults,
    criteria,
    allPassed: marksEarned === maxMarks && correctSymbolsCount === editableNodes.length,
  };
}

export function traceFlowchartExecution(
  scenario: FlowchartScenario,
  submission: FlowchartUserSubmission,
  testCaseId: string
): TraceSimulationResult {
  const testCase = scenario.testCases.find((t) => t.id === testCaseId) || scenario.testCases[0];
  if (!testCase || scenario.nodes.length === 0) {
    return { steps: [], completed: false, errorMessage: 'No test case available.' };
  }

  const nodeById = new Map(scenario.nodes.map((n) => [n.id, n]));
  const startNode = scenario.nodes[0];
  const steps: TraceStep[] = [];
  const visited = new Set<string>();

  let currentId: string | null = startNode.id;
  let incomingEdgeId: string | undefined;
  let incomingBranch: string | undefined;

  while (currentId && steps.length < 15) {
    if (visited.has(currentId)) {
      return {
        steps,
        completed: false,
        errorMessage: 'Loop detected during trace.',
      };
    }
    visited.add(currentId);
    const node = nodeById.get(currentId);
    if (!node) break;

    const sym = submission.nodeSymbols[node.id] || node.expectedSymbol;
    const label = (submission.nodeLabels[node.id] || '').trim() || `[Unlabelled: ${node.expectedLabel}]`;
    const symName = ISO_SYMBOLS[sym]?.name || 'Unassigned';

    let note = `${symName}: ${label}`;
    const outgoing = scenario.edges.filter((e) => e.from === node.id);

    if (outgoing.length === 0) {
      steps.push({
        stepNumber: steps.length + 1,
        nodeId: node.id,
        symbol: sym,
        label,
        edgeIdTaken: incomingEdgeId,
        branchTaken: incomingBranch,
        note: `${symName}: Algorithm terminates cleanly.`,
      });
      return { steps, completed: true };
    }

    if (outgoing.length === 1) {
      steps.push({
        stepNumber: steps.length + 1,
        nodeId: node.id,
        symbol: sym,
        label,
        edgeIdTaken: incomingEdgeId,
        branchTaken: incomingBranch,
        note,
      });
      incomingEdgeId = outgoing[0].id;
      incomingBranch = undefined;
      currentId = outgoing[0].to;
    } else {
      // Decision node branching
      const outcome = testCase.decisions[node.id] || 'Yes';
      // Prefer user-labelled matching edge; fall back to expectedBranchLabel if user hasn't labelled yet
      let chosenEdge = outgoing.find(
        (e) => normalizeText(submission.edgeLabels[e.id]) === normalizeText(outcome)
      );
      let usedFallback = false;
      if (!chosenEdge) {
        chosenEdge = outgoing.find(
          (e) => normalizeText(e.expectedBranchLabel) === normalizeText(outcome)
        );
        usedFallback = true;
      }

      if (!chosenEdge) {
        steps.push({
          stepNumber: steps.length + 1,
          nodeId: node.id,
          symbol: sym,
          label,
          edgeIdTaken: incomingEdgeId,
          branchTaken: incomingBranch,
          note: `Decision "${label}" evaluated to ${outcome}, but no matching branch exists.`,
        });
        return {
          steps,
          completed: false,
          errorMessage: `Missing "${outcome}" branch from "${label}".`,
        };
      }

      const branchNote = usedFallback
        ? `Condition evaluated to ${outcome} (remember to label this arrow "${outcome}"!).`
        : `Condition evaluated to ${outcome} — following "${outcome}" branch.`;

      steps.push({
        stepNumber: steps.length + 1,
        nodeId: node.id,
        symbol: sym,
        label,
        edgeIdTaken: incomingEdgeId,
        branchTaken: incomingBranch,
        note: branchNote,
      });

      incomingEdgeId = chosenEdge.id;
      incomingBranch = outcome;
      currentId = chosenEdge.to;
    }
  }

  return { steps, completed: false, errorMessage: 'Trace did not reach an End terminator.' };
}

export function validateFreeformFlowchart(
  nodes: FreeformNode[],
  edges: FreeformEdge[]
): { score: number; maxScore: number; checks: MarkSchemeCriterionResult[] } {
  const hasStart = nodes.some(
    (n) => n.symbol === 'terminator' && normalizeText(n.label).includes('start')
  );
  const hasEnd = nodes.some(
    (n) => n.symbol === 'terminator' && (normalizeText(n.label).includes('end') || normalizeText(n.label).includes('stop'))
  );
  const hasIOOrProcess = nodes.some((n) => n.symbol === 'io' || n.symbol === 'process');
  const decisionNodes = nodes.filter((n) => n.symbol === 'decision');
  const decisionsValid =
    decisionNodes.length > 0 &&
    decisionNodes.every((d) => {
      const outs = edges.filter((e) => e.from === d.id);
      const hasYes = outs.some((e) => normalizeText(e.branchLabel) === 'yes');
      const hasNo = outs.some((e) => normalizeText(e.branchLabel) === 'no');
      return outs.length >= 2 && hasYes && hasNo;
    });

  const allConnected =
    nodes.length >= 2 &&
    nodes.every((n) => edges.some((e) => e.from === n.id || e.to === n.id));

  const checks: MarkSchemeCriterionResult[] = [
    {
      id: 'ff-start',
      label: 'Starts with a "Start" Terminator',
      marksEarned: hasStart ? 1 : 0,
      maxMarks: 1,
      passed: hasStart,
      feedback: hasStart ? 'Start oval present.' : 'Add a Terminator symbol labelled "Start".',
    },
    {
      id: 'ff-end',
      label: 'Finishes with an "End" Terminator',
      marksEarned: hasEnd ? 1 : 0,
      maxMarks: 1,
      passed: hasEnd,
      feedback: hasEnd ? 'End oval present.' : 'Add a Terminator symbol labelled "End".',
    },
    {
      id: 'ff-actions',
      label: 'Includes Input/Output or Process Steps',
      marksEarned: hasIOOrProcess ? 1 : 0,
      maxMarks: 1,
      passed: hasIOOrProcess,
      feedback: hasIOOrProcess ? 'Core processing / I/O step included.' : 'Add at least one Input/Output or Process box.',
    },
    {
      id: 'ff-decision',
      label: 'Decision Diamond with Yes & No Branches',
      marksEarned: decisionsValid ? 1 : 0,
      maxMarks: 1,
      passed: decisionsValid,
      feedback: decisionsValid
        ? 'Decision diamond has both Yes and No labelled outgoing arrows.'
        : 'Add a Decision diamond with two outgoing connectors labelled "Yes" and "No".',
    },
    {
      id: 'ff-flow',
      label: 'All Symbols Connected with Directional Flowlines',
      marksEarned: allConnected ? 1 : 0,
      maxMarks: 1,
      passed: allConnected,
      feedback: allConnected ? 'Every symbol is connected into the flow.' : 'Connect every symbol with directional arrows.',
    },
  ];

  const score = checks.reduce((s, c) => s + c.marksEarned, 0);
  return { score, maxScore: 5, checks };
}

export function evaluateMindMap(
  challenge: MindMapChallenge,
  assignments: Record<string, string>
): { marksEarned: number; maxMarks: number; slotResults: Record<string, boolean>; feedback: string } {
  const editable = challenge.slots.filter((s) => !s.locked);
  const slotResults: Record<string, boolean> = {};
  let correct = 0;

  for (const slot of challenge.slots) {
    if (slot.locked) {
      slotResults[slot.id] = true;
      continue;
    }
    const ok = normalizeText(assignments[slot.id]) === normalizeText(slot.expectedLabel);
    slotResults[slot.id] = ok;
    if (ok) correct++;
  }

  const marksEarned = Math.min(challenge.maxMarks, correct);
  const feedback =
    marksEarned === challenge.maxMarks
      ? 'Full marks — main branches radiate cleanly from the central theme and each sub-node sits under its matching parent branch.'
      : `${marksEarned}/${challenge.maxMarks} slots match the OCR hierarchy. Make sure main categories connect directly to the centre and specific details sit on outer sub-nodes.`;

  return { marksEarned, maxMarks: challenge.maxMarks, slotResults, feedback };
}

export function evaluateWireframeSelection(
  challenge: WireframeChallenge,
  selectedIds: string[]
): {
  marksEarned: number;
  maxMarks: number;
  requiredHit: number;
  requiredTotal: number;
  distractorsPicked: string[];
  missingRequired: string[];
  feedback: string;
} {
  const selectedSet = new Set(selectedIds);
  const required = challenge.elements.filter((e) => e.required);
  const distractors = challenge.elements.filter((e) => e.isDistractor);

  const requiredHit = required.filter((e) => selectedSet.has(e.id)).length;
  const missingRequired = required.filter((e) => !selectedSet.has(e.id)).map((e) => e.id);
  const distractorsPicked = distractors.filter((e) => selectedSet.has(e.id)).map((e) => e.id);

  // Each required wireframe element = +1 mark, each non-wireframe distractor picked = -1 mark (clamped >= 0)
  const marksEarned = Math.max(0, Math.min(challenge.maxMarks, requiredHit - distractorsPicked.length));

  let feedback = '';
  if (marksEarned === challenge.maxMarks && distractorsPicked.length === 0) {
    feedback = 'Full marks! You included all structural wireframe components and kept out high-fidelity visual distractors.';
  } else if (distractorsPicked.length > 0) {
    feedback = `You included ${distractorsPicked.length} non-wireframe distractor(s) (-1 mark each). Remember: wireframes are low-fidelity layout skeletons without final photos, hex swatches, or full copy.`;
  } else {
    feedback = `Good structure (${requiredHit}/${required.length} core wireframe elements placed). Add the missing elements for full marks.`;
  }

  return {
    marksEarned,
    maxMarks: challenge.maxMarks,
    requiredHit,
    requiredTotal: required.length,
    distractorsPicked,
    missingRequired,
    feedback,
  };
}

export function evaluateVisualisationDiagram(
  challenge: VisualisationChallenge,
  assignments: Record<string, string>
): { marksEarned: number; maxMarks: number; pinResults: Record<string, boolean>; feedback: string } {
  const pinResults: Record<string, boolean> = {};
  let correct = 0;

  for (const pin of challenge.pins) {
    const ok = assignments[pin.id] === pin.expectedAnnotationId;
    pinResults[pin.id] = ok;
    if (ok) correct++;
  }

  const marksEarned = Math.min(challenge.maxMarks, correct);
  const feedback =
    marksEarned === challenge.maxMarks
      ? 'Full marks! Every poster zone has an explicit OCR annotation covering typography, colour scheme, imagery, target audience, branding, and dimensions.'
      : `${marksEarned}/${challenge.maxMarks} annotations matched. Visualisation diagrams earn top band when every visual region is explicitly labelled with font, colour, size, and audience details.`;

  return { marksEarned, maxMarks: challenge.maxMarks, pinResults, feedback };
}

export function evaluateToolChoice(
  question: ToolChoiceQuestion,
  selectedTool: string,
  selectedReasonId: string
): { toolCorrect: boolean; reasonCorrect: boolean; marksEarned: number; maxMarks: number } {
  const toolCorrect = selectedTool === question.correctTool;
  const chosenReason = question.reasonOptions.find((r) => r.id === selectedReasonId);
  const reasonCorrect = Boolean(chosenReason?.correct);
  const marksEarned = (toolCorrect ? 1 : 0) + (reasonCorrect ? 1 : 0);
  return { toolCorrect, reasonCorrect, marksEarned, maxMarks: 2 };
}

export function computeTa1MasterySummary(progress: Ta1TrainerProgress | null | undefined): Ta1MasterySummary {
  const safe: Ta1TrainerProgress = {
    completedFlowcharts: progress?.completedFlowcharts || {},
    completedDrills: progress?.completedDrills || {},
    completedBlueprints: progress?.completedBlueprints || {},
    completedToolMatches: progress?.completedToolMatches || {},
  };

  const flowchartsTotal = FLOWCHART_SCENARIOS.length;
  const flowchartsDone = FLOWCHART_SCENARIOS.filter((s) => {
    const entry = safe.completedFlowcharts[s.id];
    return entry && entry.bestMarks >= Math.ceil(s.maxMarks * 0.8);
  }).length;

  const drillsTotal = SYMBOL_DRILL_BANK.length;
  const drillsDone = SYMBOL_DRILL_BANK.filter((d) => safe.completedDrills[d.id] === true).length;

  const blueprintIds = [MIND_MAP_CHALLENGE.id, WIREFRAME_CHALLENGE.id, VISUALISATION_CHALLENGE.id];
  const blueprintsTotal = blueprintIds.length;
  const blueprintsDone = blueprintIds.filter((id) => {
    const entry = safe.completedBlueprints[id];
    return entry && entry.bestMarks >= Math.ceil(entry.maxMarks * 0.8);
  }).length;

  const toolsTotal = TOOL_CHOICE_QUESTIONS.length;
  const toolsDone = TOOL_CHOICE_QUESTIONS.filter((q) => safe.completedToolMatches[q.id] === true).length;

  const completedChallenges = flowchartsDone + drillsDone + blueprintsDone + toolsDone;
  const totalChallenges = flowchartsTotal + drillsTotal + blueprintsTotal + toolsTotal;
  const masteryPct = totalChallenges > 0 ? Math.round((completedChallenges / totalChallenges) * 100) : 0;

  return {
    completedChallenges,
    totalChallenges,
    masteryPct,
    flowchartsDone,
    flowchartsTotal,
    drillsDone,
    drillsTotal,
    blueprintsDone,
    blueprintsTotal,
    toolsDone,
    toolsTotal,
  };
}
