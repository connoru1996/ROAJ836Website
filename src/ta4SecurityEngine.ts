export type ThreatClassification =
  | 'phishing'
  | 'blagging'
  | 'ransomware-trojan'
  | 'pharming'
  | 'shoulder-mitm'
  | 'legitimate';

export interface ThreatClueItem {
  id: string;
  zoneLabel: string;
  displayText: string;
  isRedFlag: boolean;
  explanation: string;
}

export interface ThreatInspectorCase {
  id: string;
  title: string;
  artifactType: 'email' | 'call' | 'browser' | 'workplace';
  scenarioIntro: string;
  artifactMeta: {
    headerTitle: string;
    fromOrUrl: string;
    contextNote: string;
  };
  clues: ThreatClueItem[];
  expectedClassification: ThreatClassification;
  examinerSummary: string;
}

export interface ThreatInspectorEvaluation {
  marksEarned: number;
  maxMarks: number;
  isMastered: boolean;
  classificationCorrect: boolean;
  truePositives: string[];
  missedFlags: string[];
  falsePositives: string[];
  feedbackHeadline: string;
  examinerNote: string;
}

export interface DefenceControlOption {
  id: string;
  label: string;
  layer: 'Technical' | 'Human / Procedural' | 'Recovery';
  shortDetail: string;
}

export interface LayeredDefenceScenario {
  id: string;
  title: string;
  organisation: string;
  attackName: string;
  brief: string;
  requiredControlIds: string[]; // 3 optimal layered controls
  controlOptions: DefenceControlOption[]; // 6 total (3 required + 3 plausible distractors)
  distractorReasons: Record<string, string>;
  examinerTakeaway: string;
}

export interface LayeredDefenceEvaluation {
  marksEarned: number;
  maxMarks: number;
  isMastered: boolean;
  outcome: 'blocked' | 'partial' | 'breached';
  outcomeLabel: string;
  matchedIds: string[];
  wrongIds: string[];
  missingIds: string[];
  resistancePct: number;
  examinerTakeaway: string;
}

export type UkLawActId = 'dpa-2018' | 'cma-1990' | 'cdpa-1988' | 'equality-2010';

export interface UkLawGuide {
  id: UkLawActId;
  shortName: string;
  fullName: string;
  focusArea: string;
  keyClauses: string[];
  penalties: string;
  examTip: string;
}

export interface LegislationCase {
  id: string;
  title: string;
  scenario: string;
  correctActId: UkLawActId;
  clauseOptions: Array<{ id: string; label: string }>;
  correctClauseId: string;
  examinerExplanation: string;
}

export interface LegislationEvaluation {
  marksEarned: number;
  maxMarks: number;
  isMastered: boolean;
  actCorrect: boolean;
  clauseCorrect: boolean;
  correctActFullName: string;
  correctClauseLabel: string;
  examinerExplanation: string;
}

export interface IncidentOrderStep {
  id: string;
  label: string;
  detail: string;
}

export interface IncidentOrderCase {
  id: string;
  kind: 'order';
  title: string;
  scenario: string;
  steps: IncidentOrderStep[]; // stored in correct chronological order
  initialOrderIds: string[]; // deterministic scrambled starting order
  examinerRationale: string;
}

export interface IncidentDecisionCase {
  id: string;
  kind: 'decision';
  title: string;
  scenario: string;
  question: string;
  options: Array<{ id: string; label: string; controlCategory: string }>;
  correctOptionId: string;
  examinerRationale: string;
}

export type IncidentChallenge = IncidentOrderCase | IncidentDecisionCase;

export interface IncidentEvaluation {
  marksEarned: number;
  maxMarks: number;
  isMastered: boolean;
  headline: string;
  examinerRationale: string;
  perStepCorrect?: Record<string, boolean>;
}

export interface Ta4LabProgress {
  completedInspector: Record<string, boolean>;
  completedDefence: Record<string, boolean>;
  completedLegislation: Record<string, boolean>;
  completedIncident: Record<string, boolean>;
}

export interface Ta4LabMasterySummary {
  inspectorDone: number;
  inspectorTotal: number;
  defenceDone: number;
  defenceTotal: number;
  legislationDone: number;
  legislationTotal: number;
  incidentDone: number;
  incidentTotal: number;
  completedChallenges: number;
  totalChallenges: number;
  masteryPct: number;
}

export const THREAT_CLASSIFICATION_LABELS: Record<ThreatClassification, string> = {
  phishing: 'Phishing (Deceptive Email / Link)',
  blagging: 'Blagging / Pretexting (Social Engineering Call)',
  'ransomware-trojan': 'Ransomware / Trojan Malware Attachment',
  pharming: 'Pharming (DNS / Fake Site Redirect)',
  'shoulder-mitm': 'Shoulder Surfing & Unsecured Wi-Fi Interception',
  legitimate: 'Legitimate / Safe Communication (No Attack)',
};

export const THREAT_INSPECTOR_CASES: ThreatInspectorCase[] = [
  {
    id: 'insp-1',
    title: 'Urgent Bank Account Suspension Email',
    artifactType: 'email',
    scenarioIntro: 'A finance clerk at GreenLeaf receives this email during a busy Monday morning. Flag all genuine red-flag clues (ignore safe items) and choose the OCR threat type.',
    artifactMeta: {
      headerTitle: 'Inbox Message · Action Required',
      fromOrUrl: 'alerts@secure-barclays-verify-uk.co',
      contextNote: 'Received 09:14 · External Sender',
    },
    clues: [
      {
        id: 'c1-sender',
        zoneLabel: 'Sender Address',
        displayText: 'From: alerts@secure-barclays-verify-uk.co (lookalike domain, not barclays.co.uk)',
        isRedFlag: true,
        explanation: 'Attackers register lookalike domains that mimic a trusted bank name to bypass quick visual checks.',
      },
      {
        id: 'c1-greeting',
        zoneLabel: 'Greeting & Urgency',
        displayText: '"Dear Valued Customer, your business account will be PERMANENTLY FROZEN in 2 hours unless you verify now."',
        isRedFlag: true,
        explanation: 'Generic greetings paired with artificial time pressure rush victims into acting without verifying.',
      },
      {
        id: 'c1-link',
        zoneLabel: 'Hyperlink Destination',
        displayText: 'Button points to: http://barclays-login-check.ru/confirm-pin (unencrypted HTTP, foreign domain)',
        isRedFlag: true,
        explanation: 'Hovering reveals an unencrypted HTTP link on an unrelated foreign domain designed to harvest login credentials.',
      },
      {
        id: 'c1-footer',
        zoneLabel: 'Date Stamp',
        displayText: 'Received: Monday, 09:14 GMT via standard office email client',
        isRedFlag: false,
        explanation: 'Receiving an email at 09:14 in an email client is completely normal and is not evidence of an attack.',
      },
    ],
    expectedClassification: 'phishing',
    examinerSummary: 'Phishing uses deceptive emails with spoofed sender domains, artificial urgency, and fraudulent links to harvest credentials. Staff should verify directly via the official banking portal rather than clicking email links.',
  },
  {
    id: 'insp-2',
    title: 'Urgent Helpdesk Phone Call ("Senior Director")',
    artifactType: 'call',
    scenarioIntro: 'A junior IT technician answers an incoming phone call from someone claiming to be the Finance Director. Flag the social engineering red flags and classify the attack.',
    artifactMeta: {
      headerTitle: 'IT Support Call Transcript',
      fromOrUrl: 'Caller ID: Withheld / Unknown Number',
      contextNote: 'Live Helpdesk Audio Log',
    },
    clues: [
      {
        id: 'c2-authority',
        zoneLabel: 'Invented Authority & Pressure',
        displayText: '"This is Marcus, the Finance Director. I am stuck at an airport—skip the ticket system and reset my admin password right now or we miss payroll."',
        isRedFlag: true,
        explanation: 'Fabricating an urgent high-status scenario to intimidate staff into bypassing security protocols is classic blagging (pretexting).',
      },
      {
        id: 'c2-bypass',
        zoneLabel: 'Bypassing Identity Checks',
        displayText: '"I do not have my staff ID badge or 2FA phone with me—just read the temporary password out loud and email it to marcus.personal99@gmail.com."',
        isRedFlag: true,
        explanation: 'Refusing identity verification and asking for credentials to be sent to an external personal email is a major credential-theft indicator.',
      },
      {
        id: 'c2-normal',
        zoneLabel: 'Department Name Mentioned',
        displayText: 'Caller correctly knows that the organisation runs monthly payroll.',
        isRedFlag: false,
        explanation: 'Knowing general business facts (like payroll existing) is easily found online and is not itself the suspicious request.',
      },
      {
        id: 'c2-callback',
        zoneLabel: 'Discouraging Verification',
        displayText: '"Do NOT call the main office to double-check—I am about to board my flight and will lose signal."',
        isRedFlag: true,
        explanation: 'Stopping the target from independently verifying identity through a known internal number is a hallmark of blagging.',
      },
    ],
    expectedClassification: 'blagging',
    examinerSummary: 'Blagging (pretexting) relies on inventing a plausible story—often combining authority and urgency—to manipulate a human into revealing passwords or bypassing access controls.',
  },
  {
    id: 'insp-3',
    title: 'Public Café Remote Working Session',
    artifactType: 'workplace',
    scenarioIntro: 'A SwiftFit manager logs into the customer database from a busy coffee shop. Flag the security vulnerabilities exposed in this workplace scene and classify the threat.',
    artifactMeta: {
      headerTitle: 'Remote Work Security Audit',
      fromOrUrl: 'Location: High Street Coffee Shop Window Seat',
      contextNote: 'Unsecured Public Environment',
    },
    clues: [
      {
        id: 'c3-screen',
        zoneLabel: 'Screen Visibility',
        displayText: 'Laptop faces a busy queue with no privacy screen filter while typing admin password and viewing customer addresses.',
        isRedFlag: true,
        explanation: 'Exposing credentials and personal data in public allows bystanders to steal logins via shoulder surfing.',
      },
      {
        id: 'c3-wifi',
        zoneLabel: 'Network Connection',
        displayText: 'Connected to open public Wi-Fi "Free_Cafe_Guest" (no password, no VPN) while transmitting staff files.',
        isRedFlag: true,
        explanation: 'Open public Wi-Fi lets attackers perform Man-in-the-Middle (MITM) packet interception unless protected by a VPN and HTTPS/TLS.',
      },
      {
        id: 'c3-battery',
        zoneLabel: 'Laptop Battery Level',
        displayText: 'Laptop battery is at 78% and plugged into a wall socket.',
        isRedFlag: false,
        explanation: 'Battery charge percentage has no impact on shoulder surfing or wireless interception risk.',
      },
    ],
    expectedClassification: 'shoulder-mitm',
    examinerSummary: 'Working in public without a privacy filter exposes data to shoulder surfing, while open Wi-Fi without a VPN risks network interception (MITM). Both can cause a DPA 2018 personal data breach.',
  },
  {
    id: 'insp-4',
    title: 'Unexpected "Overdue Invoice" Attachment',
    artifactType: 'email',
    scenarioIntro: 'An office receptionist receives an invoice email from an unknown overseas supplier with an unusual file attached. Flag all red flags and classify the malware threat.',
    artifactMeta: {
      headerTitle: 'Inbox Message · Attachment Warning',
      fromOrUrl: 'billing@global-freight-docs.biz',
      contextNote: 'Attachment: Invoice_8821.pdf.exe (412 KB)',
    },
    clues: [
      {
        id: 'c4-ext',
        zoneLabel: 'Double File Extension',
        displayText: 'Attached file is named "Invoice_8821.pdf.exe" disguised with a PDF icon.',
        isRedFlag: true,
        explanation: 'A .exe file disguised as a .pdf is a Trojan technique used to trick users into executing ransomware or spyware.',
      },
      {
        id: 'c4-macro',
        zoneLabel: 'Instruction to Disable Protection',
        displayText: '"If Windows Defender blocks the invoice, click Run Anyway and Enable Macros to view payment totals."',
        isRedFlag: true,
        explanation: 'Legitimate invoices never ask recipients to bypass anti-malware warnings or enable executable macros.',
      },
      {
        id: 'c4-unknown',
        zoneLabel: 'Unrecognised Supplier',
        displayText: 'Sender "global-freight-docs.biz" is not on the company’s approved supplier list and quotes no order reference.',
        isRedFlag: true,
        explanation: 'Unsolicited invoices lacking valid purchase order numbers are a primary delivery method for ransomware payloads.',
      },
      {
        id: 'c4-size',
        zoneLabel: 'Plain-Text Subject Line',
        displayText: 'Email subject is formatted in standard sentence case.',
        isRedFlag: false,
        explanation: 'Sentence case formatting alone is normal and is not a malware indicator.',
      },
    ],
    expectedClassification: 'ransomware-trojan',
    examinerSummary: 'Trojans disguise malicious executables (.pdf.exe) as harmless documents. Once run, ransomware encrypts network drives and demands payment—which is why anti-malware, staff training, and offline backups are critical.',
  },
  {
    id: 'insp-5',
    title: 'Redirected Online Banking Login Page',
    artifactType: 'browser',
    scenarioIntro: 'A user typed "mybank.co.uk" into their browser, yet the page redirected automatically to an unusual web address. Flag the technical red flags and identify the attack.',
    artifactMeta: {
      headerTitle: 'Web Browser Address Bar & Login Form',
      fromOrUrl: 'http://mybank-secure-uk.net/login.php',
      contextNote: 'Not Secure · No TLS Padlock',
    },
    clues: [
      {
        id: 'c5-redirect',
        zoneLabel: 'Unexpected Domain Redirect',
        displayText: 'Typing the genuine address "mybank.co.uk" silently redirected to "http://mybank-secure-uk.net/login.php".',
        isRedFlag: true,
        explanation: 'DNS poisoning or local hosts-file tampering silently reroutes legitimate web addresses to fake lookalike sites—this is Pharming.',
      },
      {
        id: 'c5-http',
        zoneLabel: 'Missing HTTPS / Padlock',
        displayText: 'Browser shows "Not Secure" (HTTP instead of HTTPS) with no valid SSL/TLS certificate.',
        isRedFlag: true,
        explanation: 'Genuine banking portals enforce HTTPS/TLS encryption with a verified digital certificate to authenticate the server.',
      },
      {
        id: 'c5-pin',
        zoneLabel: 'Excessive Credential Prompt',
        displayText: 'Form demands your FULL 4-digit card PIN, CVV security code, and entire memorable password all at once.',
        isRedFlag: true,
        explanation: 'Banks only ask for selected characters of a passcode and never ask for a full card PIN online.',
      },
      {
        id: 'c5-logo',
        zoneLabel: 'Familiar Brand Colours',
        displayText: 'The page uses blue and white colours similar to the real bank.',
        isRedFlag: false,
        explanation: 'Attackers easily clone brand colours and logos—visual appearance never proves authenticity, nor is using blue/white itself a red flag.',
      },
    ],
    expectedClassification: 'pharming',
    examinerSummary: 'Unlike phishing (which lures users via email/SMS links), pharming compromises DNS records or local devices to redirect even correctly typed URLs to a fraudulent website.',
  },
  {
    id: 'insp-6',
    title: 'Scheduled IT Maintenance Announcement',
    artifactType: 'email',
    scenarioIntro: 'Not every IT message is a cyber attack! Inspect this internal school bulletin carefully. Flag any genuine red flags (select none if completely safe) and classify it.',
    artifactMeta: {
      headerTitle: 'Internal Staff & Student Notice',
      fromOrUrl: 'it-support@oakridge-academy.sch.uk',
      contextNote: 'Verified Internal Domain · Signed Notice',
    },
    clues: [
      {
        id: 'c6-domain',
        zoneLabel: 'Verified Official Domain',
        displayText: 'From: it-support@oakridge-academy.sch.uk (exact matching school domain)',
        isRedFlag: false,
        explanation: 'Matches the official internal domain with no lookalike spelling tricks.',
      },
      {
        id: 'c6-nocreds',
        zoneLabel: 'No Credentials Requested',
        displayText: '"Server updates take place Saturday 02:00–04:00. No action is needed—never share your password with anyone."',
        isRedFlag: false,
        explanation: 'Informational notice that asks for zero logins, zero downloads, and zero urgent transfers.',
      },
      {
        id: 'c6-intranet',
        zoneLabel: 'Official HTTPS Intranet Link',
        displayText: 'Status page: https://status.oakridge-academy.sch.uk (verified HTTPS)',
        isRedFlag: false,
        explanation: 'Uses encrypted HTTPS on the authentic internal subdomain.',
      },
    ],
    expectedClassification: 'legitimate',
    examinerSummary: 'Good security practice avoids both falling for attacks AND false alarms. Authentic domain, encrypted HTTPS, zero credential requests, and no artificial urgency confirm this notice is legitimate.',
  },
];

export const LAYERED_DEFENCE_SCENARIOS: LayeredDefenceScenario[] = [
  {
    id: 'def-1',
    title: 'Ransomware Outbreak at GreenLeaf Clinic',
    organisation: 'GreenLeaf Health Clinic',
    attackName: 'Ransomware via Phishing Attachment',
    brief: 'A receptionist opened a fake courier invoice attachment, encrypting appointment databases across the shared network drive. Choose the 3 strongest layered defences to prevent reinfection and ensure full recovery without paying the ransom.',
    requiredControlIds: ['offline-backup', 'anti-malware-patch', 'phishing-training'],
    controlOptions: [
      { id: 'offline-backup', label: 'Offline / Air-Gapped 3-2-1 Backups', layer: 'Recovery', shortDetail: 'Disconnected daily copies that ransomware cannot encrypt.' },
      { id: 'anti-malware-patch', label: 'Updated Anti-Malware & OS Patching', layer: 'Technical', shortDetail: 'Quarantines malicious payloads and closes known vulnerabilities.' },
      { id: 'phishing-training', label: 'Regular Staff Phishing Awareness Training', layer: 'Human / Procedural', shortDetail: 'Teaches staff to spot spoofed senders and unsafe attachments.' },
      { id: 'bigger-monitor', label: 'Upgrade Reception Screens to 4K', layer: 'Technical', shortDetail: 'Improves display clarity for appointment calendars.' },
      { id: 'open-wifi', label: 'Disable Wi-Fi Passwords for Guests', layer: 'Technical', shortDetail: 'Removes authentication steps for clinic visitors.' },
      { id: 'pay-ransom', label: 'Reserve Budget to Pay Attackers', layer: 'Recovery', shortDetail: 'Hopes criminals supply a working decryption key.' },
    ],
    distractorReasons: {
      'bigger-monitor': 'Higher screen resolution does not detect malware or protect shared files.',
      'open-wifi': 'Removing Wi-Fi security weakens the network perimeter instead of stopping ransomware.',
      'pay-ransom': 'Paying a ransom never guarantees file recovery and funds further criminal attacks.',
    },
    examinerTakeaway: 'OCR rewards defence-in-depth: combine Human training (stopping the click), Technical anti-malware/patching (blocking execution), and Offline backups (guaranteeing clean recovery).',
  },
  {
    id: 'def-2',
    title: 'Brute-Force Attack on SwiftFit Member Portal',
    organisation: 'SwiftFit Leisure Centres',
    attackName: 'Automated Password Guessing / Brute Force',
    brief: 'Automated scripts are trying thousands of common passwords per minute against SwiftFit member accounts. Select the 3 controls that directly block brute-force account takeovers.',
    requiredControlIds: ['mfa-2fa', 'lockout-policy', 'strong-passwords'],
    controlOptions: [
      { id: 'mfa-2fa', label: 'Multi-Factor Authentication (2FA)', layer: 'Technical', shortDetail: 'Requires a second code/device even if a password is guessed.' },
      { id: 'lockout-policy', label: 'Account Lockout & Rate Limiting', layer: 'Technical', shortDetail: 'Temporarily locks accounts after repeated failed login attempts.' },
      { id: 'strong-passwords', label: 'Complex Password Policy (Length & Mix)', layer: 'Human / Procedural', shortDetail: 'Bans common passwords and enforces long mixed-character passphrases.' },
      { id: 'cctv-door', label: 'Install CCTV at Gym Reception', layer: 'Human / Procedural', shortDetail: 'Records physical visitors entering the building.' },
      { id: 'lookup-check', label: 'Add Dropdown Lookup for Membership Tier', layer: 'Technical', shortDetail: 'Validates membership plan names on signup forms.' },
      { id: 'plaintext-log', label: 'Store Passwords in a Plain-Text Spreadsheet', layer: 'Recovery', shortDetail: 'Makes it easy for staff to look up forgotten logins.' },
    ],
    distractorReasons: {
      'cctv-door': 'Physical CCTV protects premises, not remote online login endpoints.',
      'lookup-check': 'A lookup validation rule checks form options, not automated login brute-forcing.',
      'plaintext-log': 'Storing passwords in plain text is a severe security vulnerability that breaches DPA 2018.',
    },
    examinerTakeaway: 'Account lockout stops automated rapid guesses, strong passphrases increase search complexity, and 2FA prevents access even when a password is compromised.',
  },
  {
    id: 'def-3',
    title: 'Lost Unencrypted Staff Laptop on Commuter Train',
    organisation: 'Oakridge Community Care',
    attackName: 'Physical Device Theft & Data Exposure',
    brief: 'A mobile care worker accidentally left a work laptop holding 400 client records on a train. Select the 3 controls that ensure confidential data remains unreadable and compliant with DPA 2018.',
    requiredControlIds: ['full-disk-encryption', 'biometric-login', 'aup-remote-wipe'],
    controlOptions: [
      { id: 'full-disk-encryption', label: 'Full-Disk Encryption (AES-256)', layer: 'Technical', shortDetail: 'Scrambles stored files into unreadable ciphertext without the key.' },
      { id: 'biometric-login', label: 'Strong Device Login / Biometrics + Auto-Lock', layer: 'Technical', shortDetail: 'Locks the OS after brief inactivity and blocks casual access.' },
      { id: 'aup-remote-wipe', label: 'Acceptable Use Policy & Remote Wipe / Cloud Sync', layer: 'Human / Procedural', shortDetail: 'Prevents local storage of raw exports and erases lost devices remotely.' },
      { id: 'ddos-shield', label: 'Web Server DDoS Scrubbing', layer: 'Technical', shortDetail: 'Absorbs high-volume website traffic floods.' },
      { id: 'format-check', label: 'Postcode Format Validation', layer: 'Technical', shortDetail: 'Ensures UK postcodes follow the right character pattern.' },
      { id: 'usb-copies', label: 'Copy Records to Unencrypted USB Sticks', layer: 'Recovery', shortDetail: 'Creates portable copies for workers to carry.' },
    ],
    distractorReasons: {
      'ddos-shield': 'DDoS mitigation protects web servers from traffic floods, not stolen laptops.',
      'format-check': 'Validation checks input patterns during typing; it does not protect data at rest on a lost disk.',
      'usb-copies': 'Unencrypted USB drives multiply the risk of portable data loss.',
    },
    examinerTakeaway: 'Always specify Full-Disk Encryption for portable devices: if stolen, the data is scrambled into ciphertext and unreadable without the decryption key.',
  },
  {
    id: 'def-4',
    title: 'Unauthorised Internal Access & Network Scanning',
    organisation: 'Midland College IT Network',
    attackName: 'External Port Scan & Privilege Escalation',
    brief: 'External attackers are probing open network ports while a student account tried opening the staff payroll folder on the shared server. Select the 3 controls that enforce network and internal access boundaries.',
    requiredControlIds: ['firewall', 'access-levels', 'audit-logs'],
    controlOptions: [
      { id: 'firewall', label: 'Configured Hardware & Software Firewall', layer: 'Technical', shortDetail: 'Filters incoming/outgoing network packets and blocks unauthorised ports.' },
      { id: 'access-levels', label: 'Role-Based Access Control (Least Privilege)', layer: 'Technical', shortDetail: 'Restricts read/write permissions so students only access student folders.' },
      { id: 'audit-logs', label: 'Access Audit Trails & Network Monitoring', layer: 'Recovery', shortDetail: 'Logs failed access attempts and alerts administrators early.' },
      { id: 'spell-checker', label: 'Enable Document Spell-Check', layer: 'Human / Procedural', shortDetail: 'Highlights spelling errors in student essays.' },
      { id: 'shared-admin', label: 'Share One Admin Password Among All Teachers', layer: 'Human / Procedural', shortDetail: 'Avoids creating separate teacher login accounts.' },
      { id: 'public-hotspot', label: 'Bridge Staff LAN Directly to Guest Wi-Fi', layer: 'Technical', shortDetail: 'Merges internal and visitor networks together.' },
    ],
    distractorReasons: {
      'spell-checker': 'Spell-checking is a word-processor feature unrelated to network or file security.',
      'shared-admin': 'Shared accounts destroy accountability and violate least-privilege principles.',
      'public-hotspot': 'Guest and internal networks should be segmented, never bridged together.',
    },
    examinerTakeaway: 'Firewalls guard the network boundary by filtering packets/ports, while Role-Based Access Levels restrict what authenticated users can read or modify inside the network.',
  },
  {
    id: 'def-5',
    title: 'SQL Injection on Event Ticket Checkout',
    organisation: 'CityLive Box Office',
    attackName: 'SQL Injection (Database Manipulation)',
    brief: 'An attacker entered malicious SQL code into the ticket search box (`\' OR 1=1 --`) to dump customer emails from the backend database. Choose the 3 defences that directly stop SQL injection.',
    requiredControlIds: ['input-sanitisation', 'least-priv-db', 'pen-testing'],
    controlOptions: [
      { id: 'input-sanitisation', label: 'Input Validation & Parameterised Queries', layer: 'Technical', shortDetail: 'Strips/escapes control characters so input is treated as data, not SQL code.' },
      { id: 'least-priv-db', label: 'Least-Privilege Database Account', layer: 'Technical', shortDetail: 'Prevents the web app from running DROP/admin commands on tables.' },
      { id: 'pen-testing', label: 'Penetration Testing & Security Patching', layer: 'Human / Procedural', shortDetail: 'Proactively tests forms for injection flaws before attackers find them.' },
      { id: 'privacy-screen', label: 'Laptop Privacy Screen Filter', layer: 'Human / Procedural', shortDetail: 'Narrows viewing angles for office screens.' },
      { id: 'nfc-badge', label: 'Contactless NFC Building Badges', layer: 'Technical', shortDetail: 'Controls physical entry through office turnstiles.' },
      { id: 'screen-reader', label: 'Add Screen-Reader Alt Text', layer: 'Human / Procedural', shortDetail: 'Improves visual accessibility for blind users.' },
    ],
    distractorReasons: {
      'privacy-screen': 'Privacy filters stop shoulder surfing, not web-form SQL injection.',
      'nfc-badge': 'Physical door badges cannot filter malicious HTTP database queries.',
      'screen-reader': 'Accessibility features improve HCI inclusion (TA2), not database query security.',
    },
    examinerTakeaway: 'SQL injection happens when raw user text is executed as database commands. Parameterised queries + input validation neutralise it, while penetration testing catches flaws early.',
  },
  {
    id: 'def-6',
    title: 'Botnet DDoS Flood During Flash Sale',
    organisation: 'SwiftGear Online Retail',
    attackName: 'Distributed Denial of Service (DDoS)',
    brief: 'Thousands of hijacked IoE devices are flooding SwiftGear’s checkout server with fake HTTP requests, taking the shop offline. Select the 3 controls that mitigate and recover from a DDoS outage.',
    requiredControlIds: ['ddos-filtering', 'redundant-bandwidth', 'incident-continuity'],
    controlOptions: [
      { id: 'ddos-filtering', label: 'Firewall & Cloud DDoS Traffic Scrubbing', layer: 'Technical', shortDetail: 'Identifies and drops abnormal botnet floods before they hit the origin server.' },
      { id: 'redundant-bandwidth', label: 'Load Balancing & Scalable Bandwidth', layer: 'Technical', shortDetail: 'Distributes traffic spikes across multiple resilient servers.' },
      { id: 'incident-continuity', label: 'Business Continuity & Incident Response Plan', layer: 'Recovery', shortDetail: 'Defines failover steps, ISP escalation, and customer status updates.' },
      { id: 'double-entry', label: 'Double-Entry Email Verification', layer: 'Technical', shortDetail: 'Asks shoppers to type their email twice to avoid typos.' },
      { id: 'shredder', label: 'Cross-Cut Paper Shredder in Office', layer: 'Human / Procedural', shortDetail: 'Destroys printed paper invoices securely.' },
      { id: 'default-iot', label: 'Keep Default Admin Passwords on Routers', layer: 'Technical', shortDetail: 'Uses factory-set credentials for faster router setup.' },
    ],
    distractorReasons: {
      'double-entry': 'Double entry is a TA3 verification check for typing accuracy, not a DDoS mitigation.',
      'shredder': 'Physical paper disposal does not filter volumetric network traffic floods.',
      'default-iot': 'Leaving default passwords actually allows attackers to hijack your devices into a botnet!',
    },
    examinerTakeaway: 'DDoS attacks target Availability. Traffic filtering/firewalls drop malicious packets, load balancing absorbs surges, and a continuity plan restores service quickly.',
  },
];

export const UK_LAW_GUIDES: UkLawGuide[] = [
  {
    id: 'dpa-2018',
    shortName: 'DPA 2018 / UK GDPR',
    fullName: 'Data Protection Act 2018 (UK GDPR)',
    focusArea: 'Personal data privacy, accuracy, security & data-subject rights',
    keyClauses: [
      'Lawful, fair & transparent processing (consent / stated purpose)',
      'Data minimisation & Storage limitation (do not keep data longer than needed)',
      'Accuracy (keep personal records up to date and correct errors)',
      'Integrity & confidentiality (protect with encryption/access controls; report serious breaches to the ICO within 72 hours)',
    ],
    penalties: 'ICO fines up to £17.5 million or 4% of global annual turnover, plus compensation claims.',
    examTip: 'Always quote the full title "Data Protection Act 2018 (UK GDPR)" and name the specific principle breached.',
  },
  {
    id: 'cma-1990',
    shortName: 'Computer Misuse Act 1990',
    fullName: 'Computer Misuse Act 1990',
    focusArea: 'Hacking, unauthorised system access, malware & DoS attacks',
    keyClauses: [
      'Section 1: Unauthorised access to computer material (e.g., logging in with stolen/guessed password)',
      'Section 2: Unauthorised access with intent to commit further offences (e.g., fraud or blackmail)',
      'Section 3: Unauthorised acts with intent to impair operation (e.g., deleting files, spreading ransomware, DDoS)',
    ],
    penalties: 'Unlimited fines and criminal imprisonment (up to 10+ years for severe Section 3 offences).',
    examTip: 'Use CMA 1990 whenever someone hacks into a system, deletes/alters data without permission, or launches malware/DDoS.',
  },
  {
    id: 'cdpa-1988',
    shortName: 'Copyright Act 1988',
    fullName: 'Copyright, Designs and Patents Act 1988',
    focusArea: 'Intellectual property protection for original digital & creative works',
    keyClauses: [
      'Automatic protection on creation for original code, graphics, photos, music, and text',
      'Illegal to copy, distribute, or adapt protected assets without permission or a valid licence',
      'Must respect licence terms (e.g., Creative Commons attribution or commercial restrictions)',
    ],
    penalties: 'Civil damages, takedown injunctions, and criminal fines/imprisonment for commercial piracy.',
    examTip: 'Never say you have to "register" copyright in the UK—protection applies automatically the moment an original work is created.',
  },
  {
    id: 'equality-2010',
    shortName: 'Equality Act 2010',
    fullName: 'Equality Act 2010',
    focusArea: 'Preventing discrimination & requiring accessible digital services',
    keyClauses: [
      'Protects users against discrimination based on protected characteristics including disability',
      'Requires organisations to make "reasonable adjustments" so websites, apps, and kiosks are accessible',
      'Supports alt text, screen readers, keyboard navigation, captions, and high-contrast palettes',
    ],
    penalties: 'Legal enforcement claims, compensation orders, and reputational damage.',
    examTip: 'Link Equality Act 2010 directly to TA2 HCI accessibility features (e.g., screen-reader compatibility or captions for hearing-impaired users).',
  },
];

export const LEGISLATION_CASES: LegislationCase[] = [
  {
    id: 'law-1',
    title: 'Selling Former Members’ Emails & 10-Year Retention',
    scenario: 'A fitness chain keeps personal details of members who cancelled 10 years ago and sells their email addresses to a third-party supplement company without ever asking for consent.',
    correctActId: 'dpa-2018',
    clauseOptions: [
      { id: 'purpose-storage', label: 'Purpose Limitation & Storage Limitation (no consent for new use; kept longer than necessary)' },
      { id: 'cma-s1', label: 'Section 1 Unauthorised Access to Computer Material' },
      { id: 'cdpa-copy', label: 'Unlicensed Reproduction of Copyrighted Photographs' },
      { id: 'eq-adjust', label: 'Failure to Provide Screen-Reader Reasonable Adjustments' },
    ],
    correctClauseId: 'purpose-storage',
    examinerExplanation: 'Under the Data Protection Act 2018 (UK GDPR), personal data must only be used for the explicit purpose collected (Purpose Limitation) and deleted once no longer needed (Storage Limitation).',
  },
  {
    id: 'law-2',
    title: 'Disgruntled Ex-Employee Deletes Server Timetables',
    scenario: 'After being dismissed, a former worker guesses a colleague’s weak password, remotely logs into the company server without permission, and deliberately deletes the summer booking database.',
    correctActId: 'cma-1990',
    clauseOptions: [
      { id: 'cma-s1-s3', label: 'Sections 1 & 3: Unauthorised Access and Unauthorised Modification / Impairment of Data' },
      { id: 'dpa-acc', label: 'Data Accuracy Principle under UK GDPR' },
      { id: 'cdpa-cc', label: 'Breach of Creative Commons Attribution Licence' },
      { id: 'eq-color', label: 'Insufficient Colour Contrast under Accessibility Rules' },
    ],
    correctClauseId: 'cma-s1-s3',
    examinerExplanation: 'Logging in without authority breaches Section 1 of the Computer Misuse Act 1990, and intentionally deleting files to impair operations breaches Section 3.',
  },
  {
    id: 'law-3',
    title: 'Copying Competitor Photos Into a Commercial App',
    scenario: 'A small startup downloads 25 original product photographs and custom icon illustrations from a rival website and publishes them inside its own paid mobile app without permission or licence.',
    correctActId: 'cdpa-1988',
    clauseOptions: [
      { id: 'cdpa-unlicensed', label: 'Unauthorised Copying & Commercial Distribution of Protected Original Works' },
      { id: 'dpa-breach', label: 'Failure to Report a Personal Data Breach to the ICO' },
      { id: 'cma-ddos', label: 'Section 3 Unauthorised Denial of Service Attack' },
      { id: 'eq-caption', label: 'Missing Video Captions for Deaf Users' },
    ],
    correctClauseId: 'cdpa-unlicensed',
    examinerExplanation: 'Original photographs and illustrations are automatically protected by the Copyright, Designs and Patents Act 1988. Using them commercially without a licence or permission infringes copyright.',
  },
  {
    id: 'law-4',
    title: 'Inaccessible Public Council Permit Portal',
    scenario: 'A town council replaces paper parking permits with a mandatory online portal that lacks alt text, ignores keyboard navigation, and uses pale grey text on white—preventing blind and low-vision residents from applying.',
    correctActId: 'equality-2010',
    clauseOptions: [
      { id: 'eq-reasonable', label: 'Failure to Make Reasonable Adjustments for Disabled Users Accessing a Public Service' },
      { id: 'cma-s2', label: 'Section 2 Unauthorised Access with Intent to Commit Fraud' },
      { id: 'cdpa-software', label: 'Software Piracy Without a Seat Licence' },
      { id: 'dpa-retention', label: 'Excessive Retention of Archived Customer Logs' },
    ],
    correctClauseId: 'eq-reasonable',
    examinerExplanation: 'The Equality Act 2010 places a legal duty on service providers to make reasonable adjustments so disabled users are not disadvantaged when accessing digital interfaces.',
  },
  {
    id: 'law-5',
    title: 'Unencrypted Patient Spreadsheets Leaked & Hidden',
    scenario: 'A clinic stores sensitive patient medical notes in an unencrypted folder with shared passwords. After hackers steal the records, management hides the incident and refuses to notify the ICO or patients.',
    correctActId: 'dpa-2018',
    clauseOptions: [
      { id: 'dpa-security-ico', label: 'Integrity & Confidentiality Principle (inadequate security) plus Failure to Report Breach to ICO within 72 Hours' },
      { id: 'cdpa-music', label: 'Unauthorised Streaming of Protected Audio Tracks' },
      { id: 'eq-motor', label: 'Lack of Voice-Input Accessibility Support' },
      { id: 'cma-victim', label: 'Section 1 Criminal Hacking by the Clinic Receptionists' },
    ],
    correctClauseId: 'dpa-security-ico',
    examinerExplanation: 'DPA 2018 (UK GDPR) requires appropriate technical security (Integrity & Confidentiality) and mandatory reporting of high-risk personal data breaches to the Information Commissioner’s Office (ICO) within 72 hours.',
  },
  {
    id: 'law-6',
    title: 'Launching a Botnet DDoS & Malware Payload',
    scenario: 'An attacker rents a botnet to flood an online ticket retailer’s web servers with traffic during a concert launch, intentionally crashing checkout systems for six hours.',
    correctActId: 'cma-1990',
    clauseOptions: [
      { id: 'cma-impair', label: 'Section 3: Unauthorised Acts with Intent to Impair the Operation of a Computer System' },
      { id: 'dpa-transparent', label: 'Failure to Publish a Clear Cookie Notice' },
      { id: 'cdpa-font', label: 'Unlicensed Commercial Font Embedding' },
      { id: 'eq-alt', label: 'Missing Alternative Text on Product Banners' },
    ],
    correctClauseId: 'cma-impair',
    examinerExplanation: 'Deliberately impairing the operation or availability of a computer system through DDoS traffic floods or malware is a criminal offence under Section 3 of the Computer Misuse Act 1990.',
  },
];

export const INCIDENT_CHALLENGES: IncidentChallenge[] = [
  {
    id: 'inc-1',
    kind: 'order',
    title: 'Incident Response Order: Ransomware Detected on Shared PC',
    scenario: 'A staff member reports a ransom note on their screen. Arrange the 5 OCR incident response phases into the exact chronological order (Step 1 to Step 5) to contain damage and recover safely.',
    steps: [
      { id: 'ir1-1', label: 'Detect & Report Immediately', detail: 'Spot the ransom screen and alert the IT security lead straight away.' },
      { id: 'ir1-2', label: 'Isolate & Contain Infected Devices', detail: 'Disconnect the affected PC from Wi-Fi/Ethernet so malware stops spreading across network drives.' },
      { id: 'ir1-3', label: 'Investigate & Preserve Evidence Logs', detail: 'Identify patient zero, entry method (e.g., phishing email), and scope of affected data.' },
      { id: 'ir1-4', label: 'Eradicate Malware & Restore from Offline Backups', detail: 'Wipe/rebuild infected machines, patch flaws, and restore verified clean offline backups.' },
      { id: 'ir1-5', label: 'Notify ICO / Stakeholders & Update Policy', detail: 'Report any personal data breach within 72 hours and retrain staff to prevent recurrence.' },
    ],
    initialOrderIds: ['ir1-4', 'ir1-1', 'ir1-5', 'ir1-2', 'ir1-3'],
    examinerRationale: 'Containment (disconnecting infected devices) must happen immediately after detection—restoring backups before isolating and eradicating malware simply re-encrypts the restored data!',
  },
  {
    id: 'inc-2',
    kind: 'order',
    title: 'Incident Response Order: Compromised Staff Email Account',
    scenario: 'A teacher accidentally typed their password into a phishing page and suspicious emails are now being sent from their account. Order the 5 response steps correctly.',
    steps: [
      { id: 'ir2-1', label: 'Identify Compromised Account', detail: 'Confirm unauthorised sign-ins or outgoing spam from the teacher’s mailbox.' },
      { id: 'ir2-2', label: 'Suspend Account & Revoke Active Sessions', detail: 'Lock the account immediately and sign out all active remote devices.' },
      { id: 'ir2-3', label: 'Audit Sent Mail & Forwarding Rules', detail: 'Check whether attackers exported personal data or added hidden auto-forwarding rules.' },
      { id: 'ir2-4', label: 'Reset Password & Enable 2FA', detail: 'Issue a new strong passphrase and enforce Multi-Factor Authentication before reopening access.' },
      { id: 'ir2-5', label: 'Alert Affected Contacts & Run Refresher Training', detail: 'Warn recipients not to click malicious links and review email filtering rules.' },
    ],
    initialOrderIds: ['ir2-3', 'ir2-5', 'ir2-1', 'ir2-4', 'ir2-2'],
    examinerRationale: 'Locking the account and revoking sessions immediately stops ongoing misuse before auditing forwarding rules, resetting credentials with 2FA, and notifying affected contacts.',
  },
  {
    id: 'inc-3',
    kind: 'order',
    title: 'Data Lifecycle Order: Safely Retiring Old Office PCs',
    scenario: 'A clinic is replacing 20 old reception computers that stored patient records. Put the 5 secure disposal & compliance steps into the right order.',
    steps: [
      { id: 'ir3-1', label: 'Back Up & Migrate Required Active Records', detail: 'Transfer still-needed files securely to the encrypted replacement server.' },
      { id: 'ir3-2', label: 'Verify Integrity of Migrated Data', detail: 'Confirm all active records open cleanly on the new system before wiping old drives.' },
      { id: 'ir3-3', label: 'Cryptographically Wipe or Physically Shred Drives', detail: 'Use certified data erasure software or physical destruction (not just pressing Delete).' },
      { id: 'ir3-4', label: 'Log Disposal Certificates for DPA Compliance', detail: 'Record serial numbers and destruction certificates as audit proof under DPA 2018.' },
      { id: 'ir3-5', label: 'Recycle Hardware via WEEE-Certified Partner', detail: 'Dispose of electronics responsibly to minimise toxic e-waste environmental impact.' },
    ],
    initialOrderIds: ['ir3-3', 'ir3-1', 'ir3-5', 'ir3-2', 'ir3-4'],
    examinerRationale: 'Always migrate and verify data before wiping, use certified erasure/destruction rather than simple file deletion, keep audit proof for DPA 2018, and recycle responsibly under WEEE rules.',
  },
  {
    id: 'inc-4',
    kind: 'decision',
    title: 'Physical vs Logical Security Control Choice',
    scenario: 'A small pharmacy stores its server rack inside a shared back hallway where delivery drivers frequently walk past unsupervised.',
    question: 'Which Physical security measure directly addresses the risk of someone unplugging or stealing the server hardware?',
    options: [
      { id: 'opt-lock', label: 'Move the server into a locked, keycard-restricted cabinet/room with CCTV monitoring', controlCategory: 'Physical Security' },
      { id: 'opt-firewall', label: 'Install a software firewall on the server operating system', controlCategory: 'Logical / Technical' },
      { id: 'opt-format', label: 'Add a format validation rule to customer prescription dates', controlCategory: 'Data Validation (TA3)' },
      { id: 'opt-cc', label: 'Publish the pharmacy logo under a Creative Commons licence', controlCategory: 'Copyright Licensing' },
    ],
    correctOptionId: 'opt-lock',
    examinerRationale: 'Software firewalls cannot stop someone physically walking off with a server! Physical security (locked server rooms, access badges, cable locks, CCTV) protects hardware from physical tampering or theft.',
  },
  {
    id: 'inc-5',
    kind: 'decision',
    title: 'Disaster Recovery: On-Site vs Off-Site / Cloud Backups',
    scenario: 'A design studio backs up its work every night onto an external hard drive sitting permanently on top of the main office server.',
    question: 'What is the critical weakness of this backup strategy during a fire, flood, or ransomware attack?',
    options: [
      { id: 'opt-single-site', label: 'Both the server and the plugged-in backup drive would be destroyed or encrypted together; an offline off-site/cloud copy is needed', controlCategory: 'Backup & Continuity' },
      { id: 'opt-slow-wifi', label: 'The office Wi-Fi password is too short for the external drive', controlCategory: 'Wireless Networking' },
      { id: 'opt-copyright', label: 'Backing up company files violates the Copyright Act 1988', controlCategory: 'Legislation' },
      { id: 'opt-hci', label: 'External hard drives do not support high-contrast fonts', controlCategory: 'HCI Accessibility' },
    ],
    correctOptionId: 'opt-single-site',
    examinerRationale: 'An always-connected drive in the same room fails the 3-2-1 backup rule: fire/flood destroys both copies and ransomware encrypts attached drives. Keep at least one copy off-site and disconnected/immutable.',
  },
  {
    id: 'inc-6',
    kind: 'decision',
    title: 'Ethical & Environmental Impact of Rapid Hardware Upgrades',
    scenario: 'A company replaces 300 working laptops every 18 months purely for cosmetic branding and throws old machines into general landfill.',
    question: 'Which exam-ready statement accurately evaluates the environmental and ethical impact?',
    options: [
      { id: 'opt-ewaste', label: 'Increases hazardous e-waste (toxic heavy metals leaching into landfill) and carbon footprint from manufacturing; refurbishing or WEEE recycling mitigates harm', controlCategory: 'Environmental & Ethical Impact' },
      { id: 'opt-cma', label: 'Throwing away old laptops is a Section 1 Computer Misuse Act hacking offence', controlCategory: 'Legislation' },
      { id: 'opt-blag', label: 'Replacing laptops frequently causes blagging phone calls', controlCategory: 'Social Engineering' },
      { id: 'opt-range', label: 'It prevents boundary test data from working on spreadsheets', controlCategory: 'Testing (TA3)' },
    ],
    correctOptionId: 'opt-ewaste',
    examinerRationale: 'High-band OCR answers specify concrete environmental harms (toxic heavy metals in e-waste, energy/mining carbon footprint) and sustainable alternatives (extending lifespan, refurbishing, or certified WEEE recycling after secure wiping).',
  },
];

export function evaluateThreatInspectorCase(
  caseItem: ThreatInspectorCase,
  selectedClueIds: string[],
  selectedClassification: ThreatClassification | ''
): ThreatInspectorEvaluation {
  const selectedSet = new Set(selectedClueIds);
  const redFlags = caseItem.clues.filter((c) => c.isRedFlag).map((c) => c.id);
  const redFlagSet = new Set(redFlags);

  const truePositives = selectedClueIds.filter((id) => redFlagSet.has(id));
  const falsePositives = selectedClueIds.filter((id) => !redFlagSet.has(id));
  const missedFlags = redFlags.filter((id) => !selectedSet.has(id));

  const classificationCorrect = selectedClassification === caseItem.expectedClassification;
  const cluesPerfect = missedFlags.length === 0 && falsePositives.length === 0;

  let marksEarned = 0;
  if (classificationCorrect) marksEarned += 1;
  if (cluesPerfect) {
    marksEarned += 2;
  } else if (redFlags.length > 0 && truePositives.length > 0 && falsePositives.length === 0) {
    marksEarned += 1;
  }

  const maxMarks = 3;
  const isMastered = marksEarned === maxMarks;

  let feedbackHeadline = 'Review the Clues Carefully';
  if (isMastered) {
    feedbackHeadline = 'Spot-On Threat Verdict — 3 / 3 Marks';
  } else if (marksEarned >= 2) {
    feedbackHeadline = 'Nearly Full Marks — Refine One Detail';
  }

  return {
    marksEarned,
    maxMarks,
    isMastered,
    classificationCorrect,
    truePositives,
    missedFlags,
    falsePositives,
    feedbackHeadline,
    examinerNote: caseItem.examinerSummary,
  };
}

export function evaluateLayeredDefence(
  scenario: LayeredDefenceScenario,
  selectedControlIds: string[]
): LayeredDefenceEvaluation {
  const uniqueSelected = Array.from(new Set(selectedControlIds)).slice(0, 3);
  const reqSet = new Set(scenario.requiredControlIds);

  const matchedIds = uniqueSelected.filter((id) => reqSet.has(id));
  const wrongIds = uniqueSelected.filter((id) => !reqSet.has(id));
  const missingIds = scenario.requiredControlIds.filter((id) => !uniqueSelected.includes(id));

  const marksEarned = matchedIds.length;
  const maxMarks = scenario.requiredControlIds.length;
  const isMastered = marksEarned === maxMarks && wrongIds.length === 0;

  let outcome: 'blocked' | 'partial' | 'breached' = 'breached';
  let outcomeLabel = 'System Breached — Critical Gaps Exposed';
  if (isMastered) {
    outcome = 'blocked';
    outcomeLabel = 'Attack Blocked & Contained (Defence-in-Depth Achieved)';
  } else if (marksEarned >= 2) {
    outcome = 'partial';
    outcomeLabel = 'Partially Mitigated — 1 Layer Still Vulnerable';
  }

  const resistancePct = Math.round((marksEarned / maxMarks) * 100);

  return {
    marksEarned,
    maxMarks,
    isMastered,
    outcome,
    outcomeLabel,
    matchedIds,
    wrongIds,
    missingIds,
    resistancePct,
    examinerTakeaway: scenario.examinerTakeaway,
  };
}

export function evaluateLegislationCase(
  lawCase: LegislationCase,
  selectedActId: UkLawActId | '',
  selectedClauseId: string
): LegislationEvaluation {
  const actCorrect = selectedActId === lawCase.correctActId;
  const clauseCorrect = selectedClauseId === lawCase.correctClauseId;
  const marksEarned = (actCorrect ? 1 : 0) + (clauseCorrect ? 1 : 0);
  const maxMarks = 2;

  const guide = UK_LAW_GUIDES.find((g) => g.id === lawCase.correctActId);
  const clause = lawCase.clauseOptions.find((c) => c.id === lawCase.correctClauseId);

  return {
    marksEarned,
    maxMarks,
    isMastered: marksEarned === maxMarks,
    actCorrect,
    clauseCorrect,
    correctActFullName: guide ? guide.fullName : lawCase.correctActId,
    correctClauseLabel: clause ? clause.label : lawCase.correctClauseId,
    examinerExplanation: lawCase.examinerExplanation,
  };
}

export function evaluateIncidentChallenge(
  challenge: IncidentChallenge,
  submission: string[] | string
): IncidentEvaluation {
  if (challenge.kind === 'order') {
    const orderedIds = Array.isArray(submission) ? submission : [];
    const perStepCorrect: Record<string, boolean> = {};
    let correctPositions = 0;

    challenge.steps.forEach((step, idx) => {
      const match = orderedIds[idx] === step.id;
      perStepCorrect[step.id] = match;
      if (match) correctPositions += 1;
    });

    const maxMarks = challenge.steps.length;
    const isMastered = correctPositions === maxMarks;
    return {
      marksEarned: correctPositions,
      maxMarks,
      isMastered,
      headline: isMastered
        ? `Perfect Response Sequence — ${maxMarks} / ${maxMarks}`
        : `${correctPositions} of ${maxMarks} Steps in Correct Order`,
      examinerRationale: challenge.examinerRationale,
      perStepCorrect,
    };
  }

  const chosenId = typeof submission === 'string' ? submission : '';
  const isCorrect = chosenId === challenge.correctOptionId;
  return {
    marksEarned: isCorrect ? 2 : 0,
    maxMarks: 2,
    isMastered: isCorrect,
    headline: isCorrect ? 'Correct Control Verdict — 2 / 2 Marks' : 'Review Security Control Category',
    examinerRationale: challenge.examinerRationale,
  };
}

export function computeTa4MasterySummary(progress: Ta4LabProgress): Ta4LabMasterySummary {
  const inspectorDone = THREAT_INSPECTOR_CASES.filter((c) => progress.completedInspector[c.id]).length;
  const defenceDone = LAYERED_DEFENCE_SCENARIOS.filter((c) => progress.completedDefence[c.id]).length;
  const legislationDone = LEGISLATION_CASES.filter((c) => progress.completedLegislation[c.id]).length;
  const incidentDone = INCIDENT_CHALLENGES.filter((c) => progress.completedIncident[c.id]).length;

  const inspectorTotal = THREAT_INSPECTOR_CASES.length;
  const defenceTotal = LAYERED_DEFENCE_SCENARIOS.length;
  const legislationTotal = LEGISLATION_CASES.length;
  const incidentTotal = INCIDENT_CHALLENGES.length;

  const completedChallenges = inspectorDone + defenceDone + legislationDone + incidentDone;
  const totalChallenges = inspectorTotal + defenceTotal + legislationTotal + incidentTotal;
  const masteryPct = totalChallenges > 0 ? Math.round((completedChallenges / totalChallenges) * 100) : 0;

  return {
    inspectorDone,
    inspectorTotal,
    defenceDone,
    defenceTotal,
    legislationDone,
    legislationTotal,
    incidentDone,
    incidentTotal,
    completedChallenges,
    totalChallenges,
    masteryPct,
  };
}
