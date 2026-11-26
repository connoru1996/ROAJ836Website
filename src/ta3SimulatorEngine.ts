export type ValidationCheckType =
  | 'presence'
  | 'type'
  | 'length'
  | 'range'
  | 'format'
  | 'lookup';

export type OcrDataType =
  | 'Integer'
  | 'Real / Float'
  | 'String / Text'
  | 'Boolean'
  | 'Date / Time';

export interface FieldRuleConfig {
  id: string;
  label: string;
  placeholder: string;
  dataType: 'integer' | 'real' | 'string';
  displayType: OcrDataType;
  sampleValid: string;
  ruleSummary: string;
  checks: {
    presence?: boolean;
    type?: 'integer' | 'real';
    minLength?: number;
    maxLength?: number;
    exactLength?: number;
    min?: number;
    max?: number;
    formatRegex?: string;
    formatPatternLabel?: string;
    lookupValues?: string[];
  };
}

export interface ValidationMission {
  id: string;
  title: string;
  instruction: string;
  targetFieldId: string;
  expectedStatus: 'accepted' | 'rejected';
  expectedFailedCheck?: ValidationCheckType;
  requireBoundary?: 'lower' | 'upper';
}

export interface ValidationScenario {
  id: string;
  title: string;
  context: string;
  brief: string;
  fields: FieldRuleConfig[];
  missions: ValidationMission[];
}

export interface CheckStepResult {
  check: ValidationCheckType;
  label: string;
  enabled: boolean;
  passed: boolean;
  message: string;
}

export interface FieldValidationResult {
  fieldId: string;
  value: string;
  accepted: boolean;
  firstFailedCheck: ValidationCheckType | null;
  steps: CheckStepResult[];
  disabledBypassWarning: string | null;
  boundaryHit: 'lower' | 'upper' | null;
}

export interface TestPlanRowInput {
  value: string;
  expectedOutcome: 'Accept' | 'Reject' | '';
}

export interface TestPlanChallenge {
  id: string;
  title: string;
  context: string;
  fieldLabel: string;
  ruleDescription: string;
  dataKind: 'integer' | 'length';
  min: number;
  max: number;
  unitLabel: string;
  maxMarks: number;
}

export interface TestPlanRowEvaluation {
  rowKey: 'normal' | 'lowerBoundary' | 'upperBoundary' | 'outOfRange' | 'wrongType';
  label: string;
  value: string;
  expectedOutcome: string;
  valueValid: boolean;
  outcomeValid: boolean;
  passed: boolean;
  numericPosition: number | null;
  feedback: string;
}

export interface TestPlanEvaluationResult {
  marksEarned: number;
  maxMarks: number;
  pct: number;
  rows: TestPlanRowEvaluation[];
  summaryFeedback: string;
}

export interface VerificationDemoField {
  id: string;
  label: string;
  sourceValue: string;
  ruleHint: string;
  checkConfig: FieldRuleConfig;
}

export interface VerificationDrillItem {
  id: string;
  prompt: string;
  example: string;
  correctCategory: 'Validation' | 'Verification';
  correctTechnique: string;
  techniqueOptions: string[];
  explanation: string;
}

export interface DataRuleDrillItem {
  id: string;
  context: string;
  fieldDescription: string;
  correctDataType: OcrDataType;
  dataTypeOptions: OcrDataType[];
  correctCheck: string;
  checkOptions: string[];
  explanation: string;
}

export interface Ta3SimulatorProgress {
  completedMissions: Record<string, boolean>;
  completedTestPlans: Record<string, { bestMarks: number; maxMarks: number }>;
  completedVerifications: Record<string, boolean>;
  completedDataRules: Record<string, boolean>;
}

export interface Ta3MasterySummary {
  completedChallenges: number;
  totalChallenges: number;
  masteryPct: number;
  missionsDone: number;
  missionsTotal: number;
  testPlansDone: number;
  testPlansTotal: number;
  verificationsDone: number;
  verificationsTotal: number;
  dataRulesDone: number;
  dataRulesTotal: number;
}

export const CHECK_TYPE_LABELS: Record<ValidationCheckType, string> = {
  presence: 'Presence Check',
  type: 'Type Check',
  length: 'Length Check',
  range: 'Range Check',
  format: 'Format Check',
  lookup: 'Lookup Check',
};

export const VALIDATION_SCENARIOS: ValidationScenario[] = [
  {
    id: 'swiftfit-signup',
    title: 'SwiftFit Membership Registration',
    context: 'TA3 · Gym Portal Validation Pipeline',
    brief: 'Test live inputs against SwiftFit’s registration rules, toggle individual validation checks on/off to see how bad data slips through, and complete the 3 OCR test missions.',
    fields: [
      {
        id: 'member-age',
        label: 'Member Age (years)',
        placeholder: 'e.g., 24',
        dataType: 'integer',
        displayType: 'Integer',
        sampleValid: '24',
        ruleSummary: 'Presence · Integer Type · Range 16 to 85 inclusive',
        checks: { presence: true, type: 'integer', min: 16, max: 85 },
      },
      {
        id: 'postcode',
        label: 'UK Postcode',
        placeholder: 'e.g., SW1 4AA',
        dataType: 'string',
        displayType: 'String / Text',
        sampleValid: 'SW1 4AA',
        ruleSummary: 'Presence · Format Check (LL0 0LL, e.g., SR1 3DP)',
        checks: {
          presence: true,
          formatRegex: '^[A-Za-z]{2}[0-9] [0-9][A-Za-z]{2}$',
          formatPatternLabel: 'LL0 0LL (e.g., SW1 4AA)',
        },
      },
      {
        id: 'card-number',
        label: 'Payment Card Number',
        placeholder: '16 digits, e.g., 4532190844129901',
        dataType: 'string',
        displayType: 'String / Text',
        sampleValid: '4532190844129901',
        ruleSummary: 'Presence · Digits Only (Type) · Exact Length 16',
        checks: { presence: true, type: 'integer', exactLength: 16 },
      },
      {
        id: 'tier',
        label: 'Membership Tier',
        placeholder: 'Standard, Peak, or Student',
        dataType: 'string',
        displayType: 'String / Text',
        sampleValid: 'Peak',
        ruleSummary: 'Presence · Lookup List (Standard, Peak, Student)',
        checks: { presence: true, lookupValues: ['Standard', 'Peak', 'Student'] },
      },
    ],
    missions: [
      {
        id: 'm-sf-1',
        title: 'Hit an Upper Boundary',
        instruction: 'Enter the exact upper boundary value for Member Age so it is accepted.',
        targetFieldId: 'member-age',
        expectedStatus: 'accepted',
        requireBoundary: 'upper',
      },
      {
        id: 'm-sf-2',
        title: 'Trigger a Format Check Error',
        instruction: 'Enter a non-empty UK Postcode that breaks the LL0 0LL pattern.',
        targetFieldId: 'postcode',
        expectedStatus: 'rejected',
        expectedFailedCheck: 'format',
      },
      {
        id: 'm-sf-3',
        title: 'Trigger a Length Check Error',
        instruction: 'Enter digits in Payment Card Number that fail the exact 16-digit length rule.',
        targetFieldId: 'card-number',
        expectedStatus: 'rejected',
        expectedFailedCheck: 'length',
      },
    ],
  },
  {
    id: 'greenleaf-checkout',
    title: 'GreenLeaf Online Order Checkout',
    context: 'TA3 · E-Commerce Input Validation',
    brief: 'Verify order quantities, promo codes, and delivery windows before stock is deducted from GreenLeaf’s nursery database.',
    fields: [
      {
        id: 'order-qty',
        label: 'Order Quantity (plants)',
        placeholder: 'e.g., 12',
        dataType: 'integer',
        displayType: 'Integer',
        sampleValid: '12',
        ruleSummary: 'Presence · Integer Type · Range 1 to 50 inclusive',
        checks: { presence: true, type: 'integer', min: 1, max: 50 },
      },
      {
        id: 'promo-code',
        label: 'Discount Voucher Code',
        placeholder: 'e.g., GL-405',
        dataType: 'string',
        displayType: 'String / Text',
        sampleValid: 'GL-405',
        ruleSummary: 'Presence · Format Check (GL-000)',
        checks: {
          presence: true,
          formatRegex: '^GL-[0-9]{3}$',
          formatPatternLabel: 'GL-000 (e.g., GL-405)',
        },
      },
      {
        id: 'delivery-slot',
        label: 'Delivery Window',
        placeholder: 'Morning, Afternoon, or Evening',
        dataType: 'string',
        displayType: 'String / Text',
        sampleValid: 'Morning',
        ruleSummary: 'Presence · Lookup List (Morning, Afternoon, Evening)',
        checks: { presence: true, lookupValues: ['Morning', 'Afternoon', 'Evening'] },
      },
      {
        id: 'customer-name',
        label: 'Recipient Full Name',
        placeholder: 'e.g., Samira Khan',
        dataType: 'string',
        displayType: 'String / Text',
        sampleValid: 'Samira Khan',
        ruleSummary: 'Presence Check (Mandatory) · Min Length 2',
        checks: { presence: true, minLength: 2, maxLength: 60 },
      },
    ],
    missions: [
      {
        id: 'm-gl-1',
        title: 'Trigger a Range Check Error',
        instruction: 'Enter a valid integer for Order Quantity that falls outside 1 to 50.',
        targetFieldId: 'order-qty',
        expectedStatus: 'rejected',
        expectedFailedCheck: 'range',
      },
      {
        id: 'm-gl-2',
        title: 'Trigger a Lookup Check Error',
        instruction: 'Enter a non-empty Delivery Window that is not in the permitted list.',
        targetFieldId: 'delivery-slot',
        expectedStatus: 'rejected',
        expectedFailedCheck: 'lookup',
      },
      {
        id: 'm-gl-3',
        title: 'Trigger a Presence Check Error',
        instruction: 'Leave Recipient Full Name empty and run the validation pipeline.',
        targetFieldId: 'customer-name',
        expectedStatus: 'rejected',
        expectedFailedCheck: 'presence',
      },
    ],
  },
  {
    id: 'bank-savings',
    title: 'Online Savings Account Application',
    context: 'TA3 · Jan 2025 OCR Past Paper Style',
    brief: 'Test opening deposit limits, sort code formatting, and mandatory applicant fields for an online bank savings account.',
    fields: [
      {
        id: 'opening-deposit',
        label: 'Opening Deposit (£)',
        placeholder: 'e.g., 250',
        dataType: 'real',
        displayType: 'Real / Float',
        sampleValid: '250',
        ruleSummary: 'Presence · Numeric Type · Range £10 to £25000 inclusive',
        checks: { presence: true, type: 'real', min: 10, max: 25000 },
      },
      {
        id: 'sort-code',
        label: 'Bank Sort Code',
        placeholder: 'e.g., 20-45-18',
        dataType: 'string',
        displayType: 'String / Text',
        sampleValid: '20-45-18',
        ruleSummary: 'Presence · Format Check (00-00-00)',
        checks: {
          presence: true,
          formatRegex: '^[0-9]{2}-[0-9]{2}-[0-9]{2}$',
          formatPatternLabel: '00-00-00 (e.g., 20-45-18)',
        },
      },
      {
        id: 'account-type',
        label: 'Account Product',
        placeholder: 'Easy Access, Fixed 1Yr, or ISA',
        dataType: 'string',
        displayType: 'String / Text',
        sampleValid: 'ISA',
        ruleSummary: 'Presence · Lookup List (Easy Access, Fixed 1Yr, ISA)',
        checks: { presence: true, lookupValues: ['Easy Access', 'Fixed 1Yr', 'ISA'] },
      },
    ],
    missions: [
      {
        id: 'm-bk-1',
        title: 'Hit the Lower Boundary',
        instruction: 'Enter the exact minimum valid Opening Deposit (£10) so it is accepted.',
        targetFieldId: 'opening-deposit',
        expectedStatus: 'accepted',
        requireBoundary: 'lower',
      },
      {
        id: 'm-bk-2',
        title: 'Trigger a Type Check Error',
        instruction: 'Enter non-numeric text (e.g., "fifty") into Opening Deposit.',
        targetFieldId: 'opening-deposit',
        expectedStatus: 'rejected',
        expectedFailedCheck: 'type',
      },
      {
        id: 'm-bk-3',
        title: 'Valid Format Check Pass',
        instruction: 'Enter a properly formatted Bank Sort Code (00-00-00) that is accepted.',
        targetFieldId: 'sort-code',
        expectedStatus: 'accepted',
      },
    ],
  },
];

export const TEST_PLAN_CHALLENGES: TestPlanChallenge[] = [
  {
    id: 'tp-age',
    title: 'Customer Age Registration Rule',
    context: 'TA3 · Range & Type Test Plan',
    fieldLabel: 'Applicant Age',
    ruleDescription: 'Must be a whole number (Integer) from 18 to 99 inclusive.',
    dataKind: 'integer',
    min: 18,
    max: 99,
    unitLabel: 'years',
    maxMarks: 6,
  },
  {
    id: 'tp-qty',
    title: 'GreenLeaf Basket Quantity Rule',
    context: 'TA3 · E-Commerce Limit Test Plan',
    fieldLabel: 'Order Quantity',
    ruleDescription: 'Must be a whole number (Integer) between 1 and 50 inclusive.',
    dataKind: 'integer',
    min: 1,
    max: 50,
    unitLabel: 'items',
    maxMarks: 6,
  },
  {
    id: 'tp-pin',
    title: 'Smart Locker Passcode Length Rule',
    context: 'TA3 · String Length Test Plan',
    fieldLabel: 'Passcode Length',
    ruleDescription: 'Must be an integer length between 4 and 8 characters inclusive (enter a sample numeric PIN of that length, e.g., 1234).',
    dataKind: 'length',
    min: 4,
    max: 8,
    unitLabel: 'chars',
    maxMarks: 6,
  },
];

export const VERIFICATION_DEMO_FIELDS: VerificationDemoField[] = [
  {
    id: 'v-dob',
    label: 'Date of Birth (DD/MM/YYYY)',
    sourceValue: '14/03/2008',
    ruleHint: 'Format DD/MM/YYYY (e.g., try typing 14/08/2008 once to see Validation pass while Verification catches the mismatch!)',
    checkConfig: {
      id: 'v-dob',
      label: 'Date of Birth',
      placeholder: '14/03/2008',
      dataType: 'string',
      displayType: 'Date / Time',
      sampleValid: '14/03/2008',
      ruleSummary: 'Presence · Format DD/MM/YYYY',
      checks: {
        presence: true,
        formatRegex: '^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/(19|20)[0-9]{2}$',
        formatPatternLabel: 'DD/MM/YYYY',
      },
    },
  },
  {
    id: 'v-postcode',
    label: 'Postcode',
    sourceValue: 'M14 5TQ',
    ruleHint: 'Format LL0/L00 0LL (e.g., typing M14 5TP passes Format Validation, but fails Double-Entry Verification)',
    checkConfig: {
      id: 'v-postcode',
      label: 'Postcode',
      placeholder: 'M14 5TQ',
      dataType: 'string',
      displayType: 'String / Text',
      sampleValid: 'M14 5TQ',
      ruleSummary: 'Presence · UK Postcode Format',
      checks: {
        presence: true,
        formatRegex: '^[A-Za-z]{1,2}[0-9]{1,2} [0-9][A-Za-z]{2}$',
        formatPatternLabel: 'UK Postcode',
      },
    },
  },
];

export const VERIFICATION_DRILLS: VerificationDrillItem[] = [
  {
    id: 'vd-1',
    prompt: 'A customer sets up a new account password and must type it into two separate boxes ("Password" and "Confirm Password") so the system can check both entries match.',
    example: 'Entry 1: GreenLeaf26!  |  Entry 2: GreenLeaf26!',
    correctCategory: 'Verification',
    correctTechnique: 'Double Entry',
    techniqueOptions: ['Double Entry', 'Format Check', 'Range Check', 'Presence Check'],
    explanation: 'Double entry is a Data Verification method that detects typing/transcription mistakes by comparing two independent entries of the same value.',
  },
  {
    id: 'vd-2',
    prompt: 'An online booking form automatically rejects the entry "200" in the "Number of Cinema Seats" box because the maximum allowed per order is 12.',
    example: 'Input: 200  →  Error: Must be between 1 and 12',
    correctCategory: 'Validation',
    correctTechnique: 'Range Check',
    techniqueOptions: ['Range Check', 'Visual Proofreading', 'Double Entry', 'Lookup Check'],
    explanation: 'A Range Check is an automated Data Validation rule enforced by software to ensure a number sits between defined minimum and maximum bounds.',
  },
  {
    id: 'vd-3',
    prompt: 'A receptionist types a patient’s handwritten registration form into the computer, then reads the screen line by line against the paper sheet to confirm the spelling of the surname.',
    example: 'Paper form: "O’Connor"  ↔  Screen: "O’Connor"',
    correctCategory: 'Verification',
    correctTechnique: 'Visual Proofreading',
    techniqueOptions: ['Visual Proofreading', 'Type Check', 'Length Check', 'Presence Check'],
    explanation: 'Visual proofreading (visual check) is a manual Data Verification process comparing entered data directly against the original source document.',
  },
  {
    id: 'vd-4',
    prompt: 'A form displays an error when a shopper clicks "Continue" without entering an email address in a mandatory input box.',
    example: 'Email: ""  →  Error: Required field cannot be blank',
    correctCategory: 'Validation',
    correctTechnique: 'Presence Check',
    techniqueOptions: ['Presence Check', 'Double Entry', 'Visual Proofreading', 'Range Check'],
    explanation: 'A Presence Check is automated Data Validation that blocks submission when a mandatory field is left blank.',
  },
  {
    id: 'vd-5',
    prompt: 'A student’s actual birthday is 05/04/2010, but they accidentally type 04/05/2010 into an online form. Why did the software accept it without warning?',
    example: 'Entered: 04/05/2010 (sensible valid date, factually wrong)',
    correctCategory: 'Verification',
    correctTechnique: 'Validation checks rules, not factual accuracy',
    techniqueOptions: [
      'Validation checks rules, not factual accuracy',
      'Presence Check failed silently',
      'Range Check only works on letters',
      'Format Check removes slashes automatically',
    ],
    explanation: 'Crucial OCR exam rule: Data Validation can only prove data is sensible and follows rules — it CANNOT guarantee factual accuracy. Verification is needed to catch sensible typos.',
  },
  {
    id: 'vd-6',
    prompt: 'A warehouse system forces staff to pick a courier ("Royal Mail", "DPD", "Evri") from a dropdown list rather than typing free text.',
    example: 'Dropdown options: [Royal Mail, DPD, Evri]',
    correctCategory: 'Validation',
    correctTechnique: 'Lookup Check',
    techniqueOptions: ['Lookup Check', 'Double Entry', 'Visual Proofreading', 'Length Check'],
    explanation: 'A Lookup Check is automated Data Validation restricting input to a predefined list of valid values.',
  },
];

export const DATA_RULE_DRILLS: DataRuleDrillItem[] = [
  {
    id: 'dr-1',
    context: 'Sports Centre App',
    fieldDescription: 'Member Age — must be a whole number from 16 to 90 inclusive.',
    correctDataType: 'Integer',
    dataTypeOptions: ['Integer', 'Real / Float', 'String / Text', 'Boolean'],
    correctCheck: 'Range Check',
    checkOptions: ['Range Check', 'Format Check', 'Lookup Check', 'Presence Check'],
    explanation: 'Age in whole years is an Integer, and enforcing 16–90 inclusive requires a Range Check.',
  },
  {
    id: 'dr-2',
    context: 'E-Commerce Checkout',
    fieldDescription: 'UK Postcode — must follow the character pattern LL0 0LL (e.g. SR1 3DP).',
    correctDataType: 'String / Text',
    dataTypeOptions: ['String / Text', 'Integer', 'Date / Time', 'Boolean'],
    correctCheck: 'Format Check',
    checkOptions: ['Format Check', 'Range Check', 'Lookup Check', 'Type Check'],
    explanation: 'Postcodes mix letters, digits, and spaces so they are stored as String/Text and verified with a Format (pattern) Check.',
  },
  {
    id: 'dr-3',
    context: 'Online Banking Portal',
    fieldDescription: 'Payment Card Number — must contain exactly 16 characters (leading zeros preserved).',
    correctDataType: 'String / Text',
    dataTypeOptions: ['String / Text', 'Real / Float', 'Boolean', 'Date / Time'],
    correctCheck: 'Length Check',
    checkOptions: ['Length Check', 'Range Check', 'Lookup Check', 'Format Check'],
    explanation: 'Identifiers like card or phone numbers are stored as String/Text (no arithmetic, keeps leading zeros) and validated with an exact Length Check (16 characters).',
  },
  {
    id: 'dr-4',
    context: 'Retail Inventory System',
    fieldDescription: 'Item Price in Pounds (£12.99) — must reject letters like "twelve".',
    correctDataType: 'Real / Float',
    dataTypeOptions: ['Real / Float', 'Integer', 'Boolean', 'Date / Time'],
    correctCheck: 'Type Check',
    checkOptions: ['Type Check', 'Lookup Check', 'Length Check', 'Format Check'],
    explanation: 'Currency values with decimal pence use Real/Float, and blocking alphabetic characters uses a Type Check.',
  },
  {
    id: 'dr-5',
    context: 'Cinema Booking System',
    fieldDescription: 'Store Branch — customer must choose one branch from a predefined dropdown list.',
    correctDataType: 'String / Text',
    dataTypeOptions: ['String / Text', 'Integer', 'Boolean', 'Real / Float'],
    correctCheck: 'Lookup Check',
    checkOptions: ['Lookup Check', 'Range Check', 'Length Check', 'Type Check'],
    explanation: 'Branch names are String/Text values constrained to an approved list via a Lookup Check.',
  },
  {
    id: 'dr-6',
    context: 'Hospital Appointment Portal',
    fieldDescription: 'Emergency Contact Phone — mandatory field that cannot be submitted empty.',
    correctDataType: 'String / Text',
    dataTypeOptions: ['String / Text', 'Integer', 'Real / Float', 'Boolean'],
    correctCheck: 'Presence Check',
    checkOptions: ['Presence Check', 'Range Check', 'Lookup Check', 'Format Check'],
    explanation: 'Phone numbers keep leading zeros (e.g. 07700...) so they are String/Text, and preventing blank entry is a Presence Check.',
  },
  {
    id: 'dr-7',
    context: 'Smart Gym Turnstile',
    fieldDescription: 'Membership Active Flag — stores strictly True (active) or False (expired).',
    correctDataType: 'Boolean',
    dataTypeOptions: ['Boolean', 'Integer', 'String / Text', 'Date / Time'],
    correctCheck: 'Type Check',
    checkOptions: ['Type Check', 'Range Check', 'Length Check', 'Format Check'],
    explanation: 'A binary Yes/No or True/False state is stored as a Boolean data type.',
  },
  {
    id: 'dr-8',
    context: 'Travel Agency Portal',
    fieldDescription: 'Departure Date — must follow DD/MM/YYYY sequence when entered.',
    correctDataType: 'Date / Time',
    dataTypeOptions: ['Date / Time', 'Integer', 'Real / Float', 'Boolean'],
    correctCheck: 'Format Check',
    checkOptions: ['Format Check', 'Length Check', 'Lookup Check', 'Range Check'],
    explanation: 'Calendar dates use the Date/Time data type, and enforcing DD/MM/YYYY structure uses a Format Check.',
  },
];

export function evaluateFieldValidation(
  field: FieldRuleConfig,
  rawValue: string,
  enabledChecks?: Partial<Record<ValidationCheckType, boolean>>
): FieldValidationResult {
  const value = String(rawValue ?? '');
  const trimmed = value.trim();
  const steps: CheckStepResult[] = [];
  let firstFailedCheck: ValidationCheckType | null = null;
  let disabledBypassWarning: string | null = null;
  let boundaryHit: 'lower' | 'upper' | null = null;

  const isEnabled = (check: ValidationCheckType) =>
    enabledChecks && typeof enabledChecks[check] === 'boolean' ? Boolean(enabledChecks[check]) : true;

  // 1. Presence Check
  if (field.checks.presence) {
    const enabled = isEnabled('presence');
    const rulePasses = trimmed.length > 0;
    const effectivePass = enabled ? rulePasses : true;
    if (!enabled && !rulePasses) {
      disabledBypassWarning = 'Presence Check is OFF — empty input slipped into the database!';
    }
    if (!effectivePass && !firstFailedCheck) firstFailedCheck = 'presence';
    steps.push({
      check: 'presence',
      label: CHECK_TYPE_LABELS.presence,
      enabled,
      passed: effectivePass,
      message: !enabled
        ? rulePasses
          ? 'Disabled (input is non-empty).'
          : 'Disabled — blank value was NOT blocked!'
        : rulePasses
          ? 'Mandatory value provided.'
          : 'Rejected: mandatory field cannot be left blank.',
    });
  }

  // Only run downstream checks if value is non-empty (standard OCR pipeline behavior)
  if (trimmed.length > 0) {
    // 2. Type Check
    if (field.checks.type) {
      const enabled = isEnabled('type');
      const rulePasses =
        field.checks.type === 'integer'
          ? /^-?\d+$/.test(trimmed)
          : /^-?\d+(\.\d+)?$/.test(trimmed);
      const effectivePass = enabled ? rulePasses : true;
      if (!enabled && !rulePasses && !disabledBypassWarning) {
        disabledBypassWarning = `Type Check is OFF — non-numeric "${trimmed}" slipped past validation!`;
      }
      if (!effectivePass && !firstFailedCheck) firstFailedCheck = 'type';
      steps.push({
        check: 'type',
        label: CHECK_TYPE_LABELS.type,
        enabled,
        passed: effectivePass,
        message: !enabled
          ? rulePasses
            ? 'Disabled (value matches numeric type).'
            : 'Disabled — wrong data type was NOT blocked!'
          : rulePasses
            ? `Matches ${field.checks.type === 'integer' ? 'whole number / digits' : 'numeric'} type.`
            : `Rejected: expected ${field.checks.type === 'integer' ? 'digits / whole number only' : 'a valid number'}.`,
      });
    }

    // 3. Length Check
    if (
      field.checks.exactLength !== undefined ||
      field.checks.minLength !== undefined ||
      field.checks.maxLength !== undefined
    ) {
      const enabled = isEnabled('length');
      const len = trimmed.length;
      let rulePasses = true;
      let ruleDesc = '';
      if (field.checks.exactLength !== undefined) {
        rulePasses = len === field.checks.exactLength;
        ruleDesc = `exactly ${field.checks.exactLength} characters (entered ${len})`;
      } else {
        const minL = field.checks.minLength ?? 0;
        const maxL = field.checks.maxLength ?? Number.MAX_SAFE_INTEGER;
        rulePasses = len >= minL && len <= maxL;
        ruleDesc = `${minL}–${maxL} characters (entered ${len})`;
      }
      const effectivePass = enabled ? rulePasses : true;
      if (!enabled && !rulePasses && !disabledBypassWarning) {
        disabledBypassWarning = `Length Check is OFF — wrong length (${len} chars) slipped through!`;
      }
      if (!effectivePass && !firstFailedCheck) firstFailedCheck = 'length';
      steps.push({
        check: 'length',
        label: CHECK_TYPE_LABELS.length,
        enabled,
        passed: effectivePass,
        message: !enabled
          ? rulePasses
            ? `Disabled (length ${len} is valid).`
            : `Disabled — invalid length (${len} chars) was NOT blocked!`
          : rulePasses
            ? `Passed: length is ${ruleDesc}.`
            : `Rejected: must be ${ruleDesc}.`,
      });
    }

    // 4. Range Check
    if (field.checks.min !== undefined || field.checks.max !== undefined) {
      const enabled = isEnabled('range');
      const num = Number(trimmed);
      const isNum = Number.isFinite(num) && /^-?\d+(\.\d+)?$/.test(trimmed);
      const minV = field.checks.min ?? -Infinity;
      const maxV = field.checks.max ?? Infinity;
      const rulePasses = isNum && num >= minV && num <= maxV;
      if (rulePasses) {
        if (field.checks.min !== undefined && num === field.checks.min) boundaryHit = 'lower';
        if (field.checks.max !== undefined && num === field.checks.max) boundaryHit = 'upper';
      }
      const effectivePass = enabled ? rulePasses : true;
      if (!enabled && !rulePasses && !disabledBypassWarning) {
        disabledBypassWarning = `Range Check is OFF — out-of-range value "${trimmed}" corrupted the record!`;
      }
      if (!effectivePass && !firstFailedCheck) firstFailedCheck = 'range';
      steps.push({
        check: 'range',
        label: CHECK_TYPE_LABELS.range,
        enabled,
        passed: effectivePass,
        message: !enabled
          ? rulePasses
            ? `Disabled (${trimmed} is inside ${minV}–${maxV}).`
            : `Disabled — out-of-range "${trimmed}" was NOT blocked!`
          : rulePasses
            ? boundaryHit
              ? `Passed on exact ${boundaryHit} boundary (${num} in ${minV}–${maxV}).`
              : `Passed: ${num} sits within ${minV} to ${maxV} inclusive.`
            : `Rejected: must be between ${minV} and ${maxV} inclusive.`,
      });
    }

    // 5. Format Check
    if (field.checks.formatRegex) {
      const enabled = isEnabled('format');
      const regex = new RegExp(field.checks.formatRegex);
      const rulePasses = regex.test(trimmed);
      const effectivePass = enabled ? rulePasses : true;
      if (!enabled && !rulePasses && !disabledBypassWarning) {
        disabledBypassWarning = `Format Check is OFF — malformed pattern "${trimmed}" was accepted!`;
      }
      if (!effectivePass && !firstFailedCheck) firstFailedCheck = 'format';
      steps.push({
        check: 'format',
        label: CHECK_TYPE_LABELS.format,
        enabled,
        passed: effectivePass,
        message: !enabled
          ? rulePasses
            ? 'Disabled (matches format).'
            : 'Disabled — broken pattern was NOT blocked!'
          : rulePasses
            ? `Matches required pattern ${field.checks.formatPatternLabel || ''}.`
            : `Rejected: must match pattern ${field.checks.formatPatternLabel || ''}.`,
      });
    }

    // 6. Lookup Check
    if (field.checks.lookupValues && field.checks.lookupValues.length > 0) {
      const enabled = isEnabled('lookup');
      const allowed = field.checks.lookupValues;
      const rulePasses = allowed.some((opt) => opt.toLowerCase() === trimmed.toLowerCase());
      const effectivePass = enabled ? rulePasses : true;
      if (!enabled && !rulePasses && !disabledBypassWarning) {
        disabledBypassWarning = `Lookup Check is OFF — unlisted option "${trimmed}" slipped in!`;
      }
      if (!effectivePass && !firstFailedCheck) firstFailedCheck = 'lookup';
      steps.push({
        check: 'lookup',
        label: CHECK_TYPE_LABELS.lookup,
        enabled,
        passed: effectivePass,
        message: !enabled
          ? rulePasses
            ? 'Disabled (option is in list).'
            : 'Disabled — unlisted option was NOT blocked!'
          : rulePasses
            ? `Found in approved lookup list (${allowed.join(', ')}).`
            : `Rejected: must match one of [${allowed.join(', ')}].`,
      });
    }
  }

  return {
    fieldId: field.id,
    value,
    accepted: firstFailedCheck === null,
    firstFailedCheck,
    steps,
    disabledBypassWarning,
    boundaryHit,
  };
}

export function checkValidationMission(
  mission: ValidationMission,
  result: FieldValidationResult
): boolean {
  if (result.fieldId !== mission.targetFieldId) return false;
  if (mission.expectedStatus === 'accepted' && !result.accepted) return false;
  if (mission.expectedStatus === 'rejected' && result.accepted) return false;
  if (mission.expectedFailedCheck && result.firstFailedCheck !== mission.expectedFailedCheck) {
    return false;
  }
  if (mission.requireBoundary && result.boundaryHit !== mission.requireBoundary) {
    return false;
  }
  return true;
}

export function evaluateTestPlanSubmission(
  challenge: TestPlanChallenge,
  inputs: Record<'normal' | 'lowerBoundary' | 'upperBoundary' | 'outOfRange' | 'wrongType', TestPlanRowInput>
): TestPlanEvaluationResult {
  const isIntString = (s: string) => /^-?\d+$/.test(s.trim());
  const measure = (s: string): number | null => {
    const t = s.trim();
    if (!t) return null;
    if (challenge.dataKind === 'integer') {
      return isIntString(t) ? Number(t) : null;
    }
    // Length challenge: numeric PIN length
    return /^\d+$/.test(t) ? t.length : null;
  };

  const rows: TestPlanRowEvaluation[] = [];

  // 1. Normal Data
  {
    const inp = inputs.normal || { value: '', expectedOutcome: '' };
    const m = measure(inp.value);
    const valueValid = m !== null && m > challenge.min && m < challenge.max;
    const outcomeValid = inp.expectedOutcome === 'Accept';
    rows.push({
      rowKey: 'normal',
      label: 'Normal (Valid) Data',
      value: inp.value,
      expectedOutcome: inp.expectedOutcome,
      valueValid,
      outcomeValid,
      passed: valueValid && outcomeValid,
      numericPosition: m,
      feedback: valueValid && outcomeValid
        ? `Valid typical value strictly inside ${challenge.min}–${challenge.max} with expected outcome Accept.`
        : !valueValid
          ? challenge.dataKind === 'integer'
            ? `Enter a whole number strictly between ${challenge.min + 1} and ${challenge.max - 1} (not on the boundary).`
            : `Enter a numeric passcode of ${challenge.min + 1} to ${challenge.max - 1} digits (e.g., 123456).`
          : 'Normal test data must have Expected Outcome set to "Accept".',
    });
  }

  // 2. Lower Boundary
  {
    const inp = inputs.lowerBoundary || { value: '', expectedOutcome: '' };
    const m = measure(inp.value);
    const valueValid = m !== null && m === challenge.min;
    const outcomeValid = inp.expectedOutcome === 'Accept';
    rows.push({
      rowKey: 'lowerBoundary',
      label: 'Lower Boundary Data',
      value: inp.value,
      expectedOutcome: inp.expectedOutcome,
      valueValid,
      outcomeValid,
      passed: valueValid && outcomeValid,
      numericPosition: m,
      feedback: valueValid && outcomeValid
        ? `Exact lower acceptable limit (${challenge.min} ${challenge.unitLabel}) set to Accept.`
        : !valueValid
          ? challenge.dataKind === 'integer'
            ? `Lower boundary must be the exact minimum accepted edge: ${challenge.min}.`
            : `Enter a passcode of exact minimum length ${challenge.min} digits (e.g., ${'1'.repeat(challenge.min)}).`
          : 'Inclusive lower boundary values are valid and must be set to "Accept".',
    });
  }

  // 3. Upper Boundary
  {
    const inp = inputs.upperBoundary || { value: '', expectedOutcome: '' };
    const m = measure(inp.value);
    const valueValid = m !== null && m === challenge.max;
    const outcomeValid = inp.expectedOutcome === 'Accept';
    rows.push({
      rowKey: 'upperBoundary',
      label: 'Upper Boundary Data',
      value: inp.value,
      expectedOutcome: inp.expectedOutcome,
      valueValid,
      outcomeValid,
      passed: valueValid && outcomeValid,
      numericPosition: m,
      feedback: valueValid && outcomeValid
        ? `Exact upper acceptable limit (${challenge.max} ${challenge.unitLabel}) set to Accept.`
        : !valueValid
          ? challenge.dataKind === 'integer'
            ? `Upper boundary must be the exact maximum accepted edge: ${challenge.max}.`
            : `Enter a passcode of exact maximum length ${challenge.max} digits (e.g., ${'9'.repeat(challenge.max)}).`
          : 'Inclusive upper boundary values are valid and must be set to "Accept".',
    });
  }

  // 4. Erroneous (Out of Range / Out of Length)
  {
    const inp = inputs.outOfRange || { value: '', expectedOutcome: '' };
    const m = measure(inp.value);
    const valueValid = m !== null && (m < challenge.min || m > challenge.max);
    const outcomeValid = inp.expectedOutcome === 'Reject';
    rows.push({
      rowKey: 'outOfRange',
      label: challenge.dataKind === 'integer' ? 'Erroneous (Out of Range)' : 'Erroneous (Too Short / Too Long)',
      value: inp.value,
      expectedOutcome: inp.expectedOutcome,
      valueValid,
      outcomeValid,
      passed: valueValid && outcomeValid,
      numericPosition: m,
      feedback: valueValid && outcomeValid
        ? `Correctly tests an out-of-bounds value (${m}) that the system must Reject.`
        : !valueValid
          ? challenge.dataKind === 'integer'
            ? `Enter an integer outside ${challenge.min}–${challenge.max} (e.g., ${challenge.min - 1} or ${challenge.max + 1}).`
            : `Enter a numeric passcode shorter than ${challenge.min} or longer than ${challenge.max} digits (e.g., 123).`
          : 'Out-of-bounds erroneous data must have Expected Outcome set to "Reject".',
    });
  }

  // 5. Erroneous (Wrong Data Type)
  {
    const inp = inputs.wrongType || { value: '', expectedOutcome: '' };
    const t = inp.value.trim();
    const hasNonNumeric = t.length > 0 && !/^-?\d+(\.\d+)?$/.test(t);
    const valueValid = hasNonNumeric;
    const outcomeValid = inp.expectedOutcome === 'Reject';
    rows.push({
      rowKey: 'wrongType',
      label: 'Erroneous (Wrong Data Type)',
      value: inp.value,
      expectedOutcome: inp.expectedOutcome,
      valueValid,
      outcomeValid,
      passed: valueValid && outcomeValid,
      numericPosition: null,
      feedback: valueValid && outcomeValid
        ? `Correctly tests non-numeric text ("${t}") to verify the Type Check rejects it.`
        : !valueValid
          ? 'Enter alphabetic text or symbols (e.g., "twenty" or "abc") to test wrong data type.'
          : 'Wrong data type erroneous input must have Expected Outcome set to "Reject".',
    });
  }

  // 6 Marks total: 1 mark per passing row (5 marks) + 1 bonus mark when all 5 expected outcomes are accurately predicted
  const passedRows = rows.filter((r) => r.passed).length;
  const allOutcomesRight = rows.every((r) => r.outcomeValid && r.value.trim().length > 0);
  const marksEarned = Math.min(challenge.maxMarks, passedRows + (allOutcomesRight ? 1 : 0));
  const pct = Math.round((marksEarned / challenge.maxMarks) * 100);

  const summaryFeedback =
    marksEarned === challenge.maxMarks
      ? 'Full marks (6/6)! Your test table covers Normal, both exact Boundaries, Out-of-Range Erroneous, and Wrong-Type Erroneous with accurate Accept/Reject predictions.'
      : `${passedRows}/5 test cases passed${allOutcomesRight ? ' (+1 mark for accurate expected outcomes)' : ''}. Review the highlighted rows below to hit all 6 OCR marks.`;

  return {
    marksEarned,
    maxMarks: challenge.maxMarks,
    pct,
    rows,
    summaryFeedback,
  };
}

export function evaluateDoubleEntrySimulation(
  field: VerificationDemoField,
  entry1: string,
  entry2: string
): {
  validationPassed: boolean;
  doubleEntryMatched: boolean;
  matchesSourceDocument: boolean;
  headline: string;
  explanation: string;
  outcomeType: 'verified_accurate' | 'caught_by_validation' | 'caught_by_verification' | 'sensible_typo_both_matched';
} {
  const valRes = evaluateFieldValidation(field.checkConfig, entry1);
  const e1 = entry1.trim();
  const e2 = entry2.trim();
  const doubleEntryMatched = e1.length > 0 && e1.toLowerCase() === e2.toLowerCase();
  const matchesSourceDocument = e1.toLowerCase() === field.sourceValue.toLowerCase();

  if (!valRes.accepted) {
    return {
      validationPassed: false,
      doubleEntryMatched,
      matchesSourceDocument,
      outcomeType: 'caught_by_validation',
      headline: 'Caught by Automated Validation',
      explanation: `Entry 1 ("${e1 || 'empty'}") broke the automated format/presence rule, so software Validation blocked it immediately.`,
    };
  }

  if (!doubleEntryMatched) {
    return {
      validationPassed: true,
      doubleEntryMatched: false,
      matchesSourceDocument,
      outcomeType: 'caught_by_verification',
      headline: 'Validation Passed, Caught by Double-Entry Verification!',
      explanation: `Entry 1 ("${e1}") followed the format rule so Validation accepted it — but Entry 2 ("${e2 || 'empty'}") did not match, proving why Verification catches transcription typos!`,
    };
  }

  if (!matchesSourceDocument) {
    return {
      validationPassed: true,
      doubleEntryMatched: true,
      matchesSourceDocument: false,
      outcomeType: 'sensible_typo_both_matched',
      headline: 'Sensible Typo! Passed Validation & Double Entry — Needs Visual Proofreading',
      explanation: `You entered "${e1}" twice identically, so both Format Validation and Double Entry passed — yet it differs from the paper source ("${field.sourceValue}"). Only Visual Proofreading against the source document catches a repeated sensible error.`,
    };
  }

  return {
    validationPassed: true,
    doubleEntryMatched: true,
    matchesSourceDocument: true,
    outcomeType: 'verified_accurate',
    headline: 'Validated & Verified Accurate',
    explanation: `"${e1}" follows the automated Validation rule, matches across Double Entry, and matches the original source document ("${field.sourceValue}").`,
  };
}

export function evaluateDataRuleDrill(
  item: DataRuleDrillItem,
  chosenDataType: string,
  chosenCheck: string
): { typeCorrect: boolean; checkCorrect: boolean; marksEarned: number; maxMarks: number } {
  const typeCorrect = chosenDataType === item.correctDataType;
  const checkCorrect = chosenCheck === item.correctCheck;
  return {
    typeCorrect,
    checkCorrect,
    marksEarned: (typeCorrect ? 1 : 0) + (checkCorrect ? 1 : 0),
    maxMarks: 2,
  };
}

export function computeTa3MasterySummary(
  progress: Ta3SimulatorProgress | null | undefined
): Ta3MasterySummary {
  const safe: Ta3SimulatorProgress = {
    completedMissions: progress?.completedMissions || {},
    completedTestPlans: progress?.completedTestPlans || {},
    completedVerifications: progress?.completedVerifications || {},
    completedDataRules: progress?.completedDataRules || {},
  };

  const allMissions = VALIDATION_SCENARIOS.flatMap((s) => s.missions);
  const missionsTotal = allMissions.length;
  const missionsDone = allMissions.filter((m) => safe.completedMissions[m.id] === true).length;

  const testPlansTotal = TEST_PLAN_CHALLENGES.length;
  const testPlansDone = TEST_PLAN_CHALLENGES.filter((tp) => {
    const rec = safe.completedTestPlans[tp.id];
    return rec && rec.bestMarks >= Math.ceil(tp.maxMarks * 0.8);
  }).length;

  const verificationsTotal = VERIFICATION_DRILLS.length;
  const verificationsDone = VERIFICATION_DRILLS.filter((v) => safe.completedVerifications[v.id] === true).length;

  const dataRulesTotal = DATA_RULE_DRILLS.length;
  const dataRulesDone = DATA_RULE_DRILLS.filter((d) => safe.completedDataRules[d.id] === true).length;

  const completedChallenges = missionsDone + testPlansDone + verificationsDone + dataRulesDone;
  const totalChallenges = missionsTotal + testPlansTotal + verificationsTotal + dataRulesTotal;
  const masteryPct = totalChallenges > 0 ? Math.round((completedChallenges / totalChallenges) * 100) : 0;

  return {
    completedChallenges,
    totalChallenges,
    masteryPct,
    missionsDone,
    missionsTotal,
    testPlansDone,
    testPlansTotal,
    verificationsDone,
    verificationsTotal,
    dataRulesDone,
    dataRulesTotal,
  };
}
