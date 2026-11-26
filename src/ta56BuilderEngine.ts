export type ConnectivityTechId =
  | 'nfc'
  | 'bluetooth'
  | 'wifi'
  | 'cellular-5g'
  | 'ethernet-fibre'
  | 'satellite-lorawan';

export interface ConnectivityTechSpec {
  id: ConnectivityTechId;
  name: string;
  shortName: string;
  typicalRange: string;
  bandwidth: string;
  powerUsage: string;
  bestFor: string;
  examWatchout: string;
}

export interface ConnectivityChallenge {
  id: string;
  title: string;
  contextTag: string;
  scenario: string;
  constraints: string[];
  correctTechId: ConnectivityTechId;
  reasonOptions: { id: string; label: string }[];
  correctReasonId: string;
  examinerNote: string;
}

export interface ConnectivityEvaluation {
  techCorrect: boolean;
  reasonCorrect: boolean;
  marksEarned: number;
  maxMarks: number;
  isMastered: boolean;
  feedbackTitle: string;
  examinerNote: string;
  correctTechName: string;
  correctReasonLabel: string;
}

export type IoeStageKey = 'sensor' | 'network' | 'process' | 'actuator';

export interface IoeStageOption {
  id: string;
  label: string;
  shortLabel: string;
  pillarTag: 'Things' | 'Data' | 'Process' | 'People';
  detail: string;
}

export interface IoeSystemBlueprint {
  id: string;
  title: string;
  domain: string;
  scenario: string;
  goalOutcome: string;
  stages: Record<
    IoeStageKey,
    {
      stageLabel: string;
      pillarName: string;
      prompt: string;
      correctOptionId: string;
      options: IoeStageOption[];
    }
  >;
  examinerSummary: string;
}

export interface IoeStageEval {
  stage: IoeStageKey;
  stageLabel: string;
  pillarName: string;
  selectedLabel: string;
  correctLabel: string;
  isCorrect: boolean;
}

export interface IoeBuildEvaluation {
  marksEarned: number;
  maxMarks: number;
  isMastered: boolean;
  pipelineStatus: 'operational' | 'degraded' | 'broken';
  stageResults: IoeStageEval[];
  feedbackTitle: string;
  examinerSummary: string;
}

export interface CommsChallenge {
  id: string;
  title: string;
  specRef: string;
  scenario: string;
  promptQuestion: string;
  channelOptions: { id: string; label: string }[];
  correctChannelId: string;
  detailPrompt: string;
  detailOptions: { id: string; label: string }[];
  correctDetailId: string;
  examinerNote: string;
}

export interface TwoPartEvaluation {
  part1Correct: boolean;
  part2Correct: boolean;
  marksEarned: number;
  maxMarks: number;
  isMastered: boolean;
  feedbackTitle: string;
  examinerNote: string;
  correctPart1Label: string;
  correctPart2Label: string;
}

export interface TradeoffChallenge {
  id: string;
  title: string;
  topicTag: 'TA5' | 'TA6';
  systemName: string;
  telemetryReadings: { label: string; value: string; severity: 'nominal' | 'warning' | 'critical' }[];
  scenario: string;
  riskOptions: { id: string; label: string }[];
  correctRiskId: string;
  mitigationOptions: { id: string; label: string }[];
  correctMitigationId: string;
  examinerNote: string;
}

export interface Ta56Progress {
  completedConnectivity: Record<string, boolean>;
  completedIoe: Record<string, boolean>;
  completedComms: Record<string, boolean>;
  completedTradeoffs: Record<string, boolean>;
}

export interface Ta56MasterySummary {
  totalChallenges: number;
  completedChallenges: number;
  masteryPct: number;
  byMode: {
    connectivity: { done: number; total: number };
    ioe: { done: number; total: number };
    comms: { done: number; total: number };
    tradeoffs: { done: number; total: number };
  };
}

export const CONNECTIVITY_SPECS: ConnectivityTechSpec[] = [
  {
    id: 'nfc',
    name: 'NFC (Near Field Communication)',
    shortName: 'NFC',
    typicalRange: '< 10 cm',
    bandwidth: 'Very Low (~424 kbps)',
    powerUsage: 'Ultra-Low / Passive',
    bestFor: 'Contactless payments, access keycards, quick tap-to-pair',
    examWatchout: 'Tiny range (<10 cm) is a security advantage because eavesdroppers cannot tap from across a room.',
  },
  {
    id: 'bluetooth',
    name: 'Bluetooth (PAN)',
    shortName: 'Bluetooth',
    typicalRange: '~10 m (up to 30 m)',
    bandwidth: 'Low–Medium (1–3 Mbps)',
    powerUsage: 'Low (BLE)',
    bestFor: 'Wearables, wireless headphones, fitness sensors paired to a phone',
    examWatchout: 'Short-range Personal Area Network (PAN); low battery drain makes it ideal for body-worn sensors.',
  },
  {
    id: 'wifi',
    name: 'Wi-Fi (Wireless LAN)',
    shortName: 'Wi-Fi',
    typicalRange: '30–100 m indoors',
    bandwidth: 'High (100 Mbps–1+ Gbps)',
    powerUsage: 'Medium',
    bestFor: 'Office laptops, smart home hubs, school tablets on a local site',
    examWatchout: 'Suffers from wall attenuation and shared-channel congestion; requires WPA2/WPA3 encryption.',
  },
  {
    id: 'cellular-5g',
    name: '4G / 5G Cellular Mobile',
    shortName: '4G / 5G',
    typicalRange: 'Nationwide masts (km)',
    bandwidth: 'High (50 Mbps–1 Gbps+)',
    powerUsage: 'Medium–High',
    bestFor: 'Mobile vehicles, field engineers, remote patients away from Wi-Fi',
    examWatchout: 'Works anywhere with mast coverage, but rural blackspots and ongoing SIM data costs apply.',
  },
  {
    id: 'ethernet-fibre',
    name: 'Wired Ethernet / Fibre Optic',
    shortName: 'Wired / Fibre',
    typicalRange: '100 m (Cat6) / km (Fibre)',
    bandwidth: 'Very High (1–10+ Gbps)',
    powerUsage: 'Mains / Powered',
    bestFor: 'Fixed desktop suites, media editing studios, core server backbones',
    examWatchout: 'Zero wireless interference, lowest latency, and harder to intercept — but zero physical mobility.',
  },
  {
    id: 'satellite-lorawan',
    name: 'Satellite / Long-Range LPWAN',
    shortName: 'Satellite / LPWAN',
    typicalRange: 'Global / 10+ km rural',
    bandwidth: 'Low–Medium (higher latency)',
    powerUsage: 'Solar / Multi-year battery',
    bestFor: 'Off-grid remote weather stations, maritime vessels, rural farms',
    examWatchout: 'Reaches locations with zero cellular or fibre cables, but has higher latency or weather sensitivity.',
  },
];

export const CONNECTIVITY_CHALLENGES: ConnectivityChallenge[] = [
  {
    id: 'conn-1',
    title: 'Contactless Gym Turnstile Entry',
    contextTag: 'SwiftFit Leisure · Access Control',
    scenario: 'SwiftFit members tap their membership wristband or smartphone against a reception reader to unlock the gym turnstile instantly without entering a PIN.',
    constraints: ['Instant tap interaction', 'Must prevent accidental unlocks from people walking past', 'Wristband has no rechargeable battery'],
    correctTechId: 'nfc',
    reasonOptions: [
      { id: 'nfc-prox', label: 'Ultra-short range (<10 cm) prevents accidental or distant interception and works with passive wristbands' },
      { id: 'wifi-hd', label: 'Streams 4K video at 1 Gbps across the entire building' },
      { id: 'sat-global', label: 'Connects directly to orbiting satellites so no local electricity is needed' },
      { id: 'bt-100m', label: 'Automatically unlocks the barrier from 100 metres away in the car park' },
    ],
    correctReasonId: 'nfc-prox',
    examinerNote: 'OCR rewards linking NFC’s <10 cm range directly to deliberate proximity and security, plus support for battery-free passive tags.',
  },
  {
    id: 'conn-2',
    title: 'Wearable Heart-Rate Strap to Smartphone',
    contextTag: 'Fitness Coaching · Wearable Sensor',
    scenario: 'A runner wears a lightweight chest heart-rate monitor that streams live beats-per-minute readings to a sports app on the phone strapped to their arm.',
    constraints: ['Distance under 2 metres', 'Tiny coin-cell battery must last months', 'Small numeric readings only'],
    correctTechId: 'bluetooth',
    reasonOptions: [
      { id: 'bt-ble', label: 'Short-range (~10 m) low-power PAN pairing (BLE) preserves wearable battery life while linking directly to the phone' },
      { id: 'eth-cable', label: 'Requires a rigid Cat6 Ethernet cable between the runner’s chest and phone' },
      { id: 'nfc-stream', label: 'Works only if the phone is pressed continuously against the chest sensor (<10 cm)' },
      { id: 'sat-gps', label: 'Uploads directly to a geostationary satellite every second' },
    ],
    correctReasonId: 'bt-ble',
    examinerNote: 'Bluetooth (especially Bluetooth Low Energy) is the standard OCR answer for short-range, low-power Personal Area Network (PAN) wearable peripherals.',
  },
  {
    id: 'conn-3',
    title: '30-PC School Video Editing Suite',
    contextTag: 'Media Department · Fixed Workstations',
    scenario: 'Thirty fixed desktop PCs in a college media lab simultaneously save and edit multi-gigabyte HD video projects stored on a central school file server.',
    constraints: ['Fixed desks (no mobility required)', 'Sustained high throughput for 30 simultaneous users', 'Must avoid wireless signal congestion'],
    correctTechId: 'ethernet-fibre',
    reasonOptions: [
      { id: 'eth-stable', label: 'Delivers consistent gigabit bandwidth, low latency, and zero wireless interference across fixed workstations' },
      { id: 'bt-mesh', label: 'Uses Bluetooth pairing to transfer gigabytes faster than fibre optic cables' },
      { id: 'nfc-tap', label: 'Transfers multi-gigabyte video edits by tapping monitors together' },
      { id: 'cell-sim', label: 'Pays for 30 separate 5G SIM contracts indoors instead of using the school LAN' },
    ],
    correctReasonId: 'eth-stable',
    examinerNote: 'Whenever devices are stationary and move heavy files simultaneously, Wired Ethernet/Fibre beats Wi-Fi on stability, throughput, security, and latency.',
  },
  {
    id: 'conn-4',
    title: 'National Courier Van Live Routing',
    contextTag: 'GreenLeaf Logistics · Mobile Fleet',
    scenario: 'Fifty electric delivery vans travel across UK motorways and towns, continuously sending GPS location and receiving live traffic reroutes and parcel signatures.',
    constraints: ['Continuous movement across hundreds of miles', 'Real-time two-way data updates', 'Must work away from office routers'],
    correctTechId: 'cellular-5g',
    reasonOptions: [
      { id: 'cell-wide', label: 'Provides wide-area mobile coverage across road networks via cellular masts with fast low-latency data' },
      { id: 'wifi-office', label: 'Maintains a direct office Wi-Fi connection up to 200 miles from headquarters' },
      { id: 'eth-reel', label: 'Connects each moving van to the depot using a trailing Ethernet cable' },
      { id: 'nfc-road', label: 'Reads parcel updates only when parked within 5 cm of a road sign' },
    ],
    correctReasonId: 'cell-wide',
    examinerNote: '4G/5G cellular is essential for mobile wide-area telemetry; strong answers also note rural signal dead-zones as a limitation to mitigate with offline caching.',
  },
  {
    id: 'conn-5',
    title: 'Open-Plan Office Laptops & Smart Printers',
    contextTag: 'Business Workspace · Local Mobility',
    scenario: 'Forty staff move freely between hot-desks and meeting rooms inside a two-storey office building, printing reports and joining cloud video meetings on laptops.',
    constraints: ['Movement across rooms inside one building', 'High bandwidth needed for video calls', 'Must connect dozens of laptops without trailing cables'],
    correctTechId: 'wifi',
    reasonOptions: [
      { id: 'wifi-lan', label: 'Provides high-bandwidth Wireless LAN coverage across indoor rooms so laptops stay mobile without SIM costs' },
      { id: 'nfc-desk', label: 'Limits laptops to working within 4 cm of the router' },
      { id: 'bt-video', label: 'Streams 40 simultaneous HD video conferences over Bluetooth PAN' },
      { id: 'sat-roof', label: 'Installs individual satellite dishes on every employee’s laptop lid' },
    ],
    correctReasonId: 'wifi-lan',
    examinerNote: 'Wi-Fi (Wireless LAN) balances high indoor throughput and local mobility across a site, secured with WPA2/WPA3 encryption.',
  },
  {
    id: 'conn-6',
    title: 'Off-Grid Scottish Highland Weather Beacon',
    contextTag: 'Environmental Agency · Remote Telemetry',
    scenario: 'An automated mountain weather station 40 km from the nearest town or mobile phone mast sends hourly wind-speed and rainfall readings back to headquarters.',
    constraints: ['Zero cellular mast or fibre cable coverage', 'Solar-powered battery operation', 'Small periodic text telemetry packets'],
    correctTechId: 'satellite-lorawan',
    reasonOptions: [
      { id: 'sat-remote', label: 'Operates in remote off-grid areas without terrestrial mobile masts or cables, ideal for small periodic sensor packets' },
      { id: 'wifi-40km', label: 'Connects to a standard home Wi-Fi router 40 km away through mountain terrain' },
      { id: 'nfc-mountain', label: 'Transmits weather alerts 40 km using Near Field Communication' },
      { id: 'bt-hiker', label: 'Requires a fixed Ethernet trench dug up a protected mountain peak' },
    ],
    correctReasonId: 'sat-remote',
    examinerNote: 'Satellite or long-range LPWAN links solve remote geographical connectivity where cellular and wired infrastructure cannot reach.',
  },
];

export const IOE_SYSTEM_BLUEPRINTS: IoeSystemBlueprint[] = [
  {
    id: 'ioe-1',
    title: 'Smart Agricultural Greenhouse',
    domain: 'TA6 · Precision Farming',
    scenario: 'A commercial nursery wants to keep tomato crops at optimal soil hydration automatically without wasting water or requiring manual checks every hour.',
    goalOutcome: 'Automatically waters crops when soil dries below 30% and logs usage for the grower.',
    stages: {
      sensor: {
        stageLabel: '1. Input Sensor',
        pillarName: 'Things',
        prompt: 'Select the physical Thing / Sensor to capture crop conditions:',
        correctOptionId: 'soil-moisture',
        options: [
          { id: 'soil-moisture', label: 'Soil Moisture & Temp Sensor', shortLabel: 'Soil Moisture Sensor', pillarTag: 'Things', detail: 'Continuously measures root-zone water % and air temperature.' },
          { id: 'barcode-gun', label: 'Handheld Checkout Barcode Scanner', shortLabel: 'Barcode Scanner', pillarTag: 'Things', detail: 'Reads retail product barcodes at a shop till.' },
          { id: 'mic-array', label: 'Voice Dictation Microphone', shortLabel: 'Voice Microphone', pillarTag: 'Things', detail: 'Captures human speech commands.' },
        ],
      },
      network: {
        stageLabel: '2. Network Link',
        pillarName: 'Data',
        prompt: 'Select how raw sensor data travels to the processing hub:',
        correctOptionId: 'farm-wifi-lpwan',
        options: [
          { id: 'farm-wifi-lpwan', label: 'Site Wi-Fi / LPWAN Gateway', shortLabel: 'Wi-Fi / LPWAN Hub', pillarTag: 'Data', detail: 'Transmits low-power sensor packets across glasshouses to the cloud.' },
          { id: 'nfc-manual', label: 'NFC Tap (<10 cm)', shortLabel: 'NFC Tap (<10 cm)', pillarTag: 'Data', detail: 'Requires walking up to touch each sensor by hand.' },
          { id: 'printed-log', label: 'Paper Clipboard Sheet', shortLabel: 'Paper Logbook', pillarTag: 'Data', detail: 'Manually written once a day with no network transmission.' },
        ],
      },
      process: {
        stageLabel: '3. Processing Rule',
        pillarName: 'Process',
        prompt: 'Select the automated cloud/edge processing logic:',
        correctOptionId: 'threshold-rule',
        options: [
          { id: 'threshold-rule', label: 'If Moisture < 30% → Trigger Irrigation', shortLabel: 'Moisture < 30% Rule', pillarTag: 'Process', detail: 'Evaluates live moisture data against crop thresholds and weather forecast.' },
          { id: 'spell-check', label: 'Word Processor Spell Checker', shortLabel: 'Spell Checker', pillarTag: 'Process', detail: 'Highlights grammar errors in written documents.' },
          { id: 'raw-archive', label: 'Store Raw Numbers Without Checking', shortLabel: 'Unprocessed Storage', pillarTag: 'Process', detail: 'Saves figures to disk without evaluating any condition.' },
        ],
      },
      actuator: {
        stageLabel: '4. Action & Feedback',
        pillarName: 'People',
        prompt: 'Select the physical Actuator and People output:',
        correctOptionId: 'valve-alert',
        options: [
          { id: 'valve-alert', label: 'Solenoid Water Valve + Grower App Alert', shortLabel: 'Water Valve + App', pillarTag: 'People', detail: 'Actuator opens drip irrigation and notifies the grower with daily usage.' },
          { id: 'receipt-printer', label: 'Thermal Till Receipt Printer', shortLabel: 'Receipt Printer', pillarTag: 'People', detail: 'Prints paper shopping receipts.' },
          { id: 'screen-bright', label: 'Dim Office Monitor Brightness', shortLabel: 'Dim Monitor', pillarTag: 'People', detail: 'Adjusts desktop display backlight only.' },
        ],
      },
    },
    examinerSummary: 'A complete OCR IoE chain unites all 4 pillars: Things (soil sensor & valve actuator), Data (live moisture packets via Wi-Fi/LPWAN), Process (threshold rule evaluation), and People (grower dashboard & override).',
  },
  {
    id: 'ioe-2',
    title: 'Independent Living Health Monitor',
    domain: 'TA6 · Remote Healthcare',
    scenario: 'An elderly patient living independently wears a smart wristband that detects sudden falls or dangerously irregular heart rates even while walking in the park.',
    goalOutcome: 'Alerts carers and clinicians rapidly with GPS location if a fall or cardiac spike occurs.',
    stages: {
      sensor: {
        stageLabel: '1. Input Sensor',
        pillarName: 'Things',
        prompt: 'Select the wearable Thing / Sensor:',
        correctOptionId: 'ppg-accel',
        options: [
          { id: 'ppg-accel', label: 'Optical Heart-Rate & Fall Accelerometer', shortLabel: 'Pulse & Fall Sensor', pillarTag: 'Things', detail: 'Monitors pulse rate and sudden impact/fall motion 24/7.' },
          { id: 'light-ldr', label: 'Outdoor Streetlight LDR Sensor', shortLabel: 'Light Sensor', pillarTag: 'Things', detail: 'Detects sunset to turn street lamps on.' },
          { id: 'rfid-pallet', label: 'Warehouse Forklift RFID Gate', shortLabel: 'Pallet RFID Gate', pillarTag: 'Things', detail: 'Scans bulk shipping pallets passing a loading bay.' },
        ],
      },
      network: {
        stageLabel: '2. Network Link',
        pillarName: 'Data',
        prompt: 'Select the connectivity that works both at home and outdoors:',
        correctOptionId: 'cell-sim',
        options: [
          { id: 'cell-sim', label: '4G / 5G eSIM Cellular Link', shortLabel: '4G / 5G eSIM', pillarTag: 'Data', detail: 'Sends encrypted vitals and GPS coordinates away from home Wi-Fi.' },
          { id: 'cat6-wire', label: 'Wired Cat6 Ethernet Cable', shortLabel: 'Wired Ethernet', pillarTag: 'Data', detail: 'Tethers the wearer to a wall socket indoors.' },
          { id: 'nfc-only', label: 'NFC Tap Only (<10 cm)', shortLabel: 'NFC Only', pillarTag: 'Data', detail: 'Cannot transmit alerts remotely.' },
        ],
      },
      process: {
        stageLabel: '3. Processing Rule',
        pillarName: 'Process',
        prompt: 'Select the cloud health monitoring logic:',
        correctOptionId: 'anomaly-engine',
        options: [
          { id: 'anomaly-engine', label: 'Vitals Anomaly & Fall Verification Engine', shortLabel: 'Anomaly Check Engine', pillarTag: 'Process', detail: 'Checks for hard fall + 30s no-movement or unsafe heart-rate spike.' },
          { id: 'ad-targeting', label: 'Social Media Advert Recommender', shortLabel: 'Advert Engine', pillarTag: 'Process', detail: 'Matches browsing history to retail banners.' },
          { id: 'no-process', label: 'Delete Readings Every Hour', shortLabel: 'Auto-Delete Data', pillarTag: 'Process', detail: 'Discards sensor data before checking safety thresholds.' },
        ],
      },
      actuator: {
        stageLabel: '4. Action & Feedback',
        pillarName: 'People',
        prompt: 'Select the response for People & emergency care:',
        correctOptionId: 'carer-alert',
        options: [
          { id: 'carer-alert', label: 'Haptic Wrist Buzz + Carer/Clinician GPS Alert', shortLabel: 'Carer GPS Alert', pillarTag: 'People', detail: 'Alerts emergency contacts with live map pin and opens two-way voice check.' },
          { id: 'turn-music', label: 'Play Louder Gym Music', shortLabel: 'Boost Speaker Volume', pillarTag: 'People', detail: 'Increases entertainment audio volume.' },
          { id: 'lock-door', label: 'Permanently Lock Front Door', shortLabel: 'Lock Front Door', pillarTag: 'People', detail: 'Prevents paramedics from entering the property.' },
        ],
      },
    },
    examinerSummary: 'In healthcare IoE questions, explain the real human benefit (People pillar): continuous automated monitoring lets patients stay independent while enabling faster emergency intervention.',
  },
  {
    id: 'ioe-3',
    title: 'Cold-Chain Warehouse Stock System',
    domain: 'TA6 · Industry & Logistics',
    scenario: 'A chilled food distribution warehouse must verify every incoming crate automatically and prevent chilled stock spoiling if a fridge unit warms above 5 °C.',
    goalOutcome: 'Tracks live stock counts and boosts cooling immediately if chilled storage rises above 5 °C.',
    stages: {
      sensor: {
        stageLabel: '1. Input Sensor',
        pillarName: 'Things',
        prompt: 'Select the industrial sensors needed:',
        correctOptionId: 'rfid-temp',
        options: [
          { id: 'rfid-temp', label: 'RFID Stock Readers & Thermal Probes', shortLabel: 'RFID + Temp Sensors', pillarTag: 'Things', detail: 'Logs pallet arrivals automatically and measures bay temperature continuously.' },
          { id: 'fingerprint-pad', label: 'Smartphone Fingerprint Reader', shortLabel: 'Fingerprint Pad', pillarTag: 'Things', detail: 'Unlocks personal phones only.' },
          { id: 'soil-probe', label: 'Garden Soil pH Probe', shortLabel: 'Soil pH Probe', pillarTag: 'Things', detail: 'Measures soil acidity outdoors.' },
        ],
      },
      network: {
        stageLabel: '2. Network Link',
        pillarName: 'Data',
        prompt: 'Select the warehouse network link:',
        correctOptionId: 'warehouse-lan',
        options: [
          { id: 'warehouse-lan', label: 'Enterprise Wi-Fi & Wired Server Backbone', shortLabel: 'Site Wi-Fi / LAN', pillarTag: 'Data', detail: 'Streams continuous temperature and stock scans across warehouse bays.' },
          { id: 'bt-earbuds', label: 'Personal Bluetooth Earbuds Link', shortLabel: 'Bluetooth Audio', pillarTag: 'Data', detail: 'Short 10 m audio-only link unsuitable for warehouse bays.' },
          { id: 'usb-walk', label: 'Weekly USB Stick Copy', shortLabel: 'Weekly USB Copy', pillarTag: 'Data', detail: 'Too slow — spoiled food would go unnoticed for days.' },
        ],
      },
      process: {
        stageLabel: '3. Processing Rule',
        pillarName: 'Process',
        prompt: 'Select the stock & spoilage rule engine:',
        correctOptionId: 'cold-chain-rule',
        options: [
          { id: 'cold-chain-rule', label: 'Update Stock DB + Check Temp > 5 °C Rule', shortLabel: 'Stock & >5°C Rule', pillarTag: 'Process', detail: 'Reconciles crate inventory and detects thermal breaches in real time.' },
          { id: 'video-compress', label: 'MP4 Video Transcoder', shortLabel: 'Video Compressor', pillarTag: 'Process', detail: 'Shrinks movie files for web streaming.' },
          { id: 'manual-email', label: 'Wait for Monthly Accountant Audit', shortLabel: 'Monthly Audit', pillarTag: 'Process', detail: 'No automated processing of live temperature alerts.' },
        ],
      },
      actuator: {
        stageLabel: '4. Action & Feedback',
        pillarName: 'People',
        prompt: 'Select the automated cooling & manager output:',
        correctOptionId: 'hvac-manager',
        options: [
          { id: 'hvac-manager', label: 'Activate Backup Chiller + Alert Facilities Manager', shortLabel: 'Backup Chiller + Alert', pillarTag: 'People', detail: 'Actuator engages backup refrigeration while alerting staff to inspect door seals.' },
          { id: 'dim-lights', label: 'Turn Off Loading Bay Safety Lights', shortLabel: 'Turn Off Lights', pillarTag: 'People', detail: 'Creates a health-and-safety hazard without fixing temperature.' },
          { id: 'auto-order-fuel', label: 'Post Temperature on Public Social Media', shortLabel: 'Public Social Post', pillarTag: 'People', detail: 'Publishes internal operational faults externally.' },
        ],
      },
    },
    examinerSummary: 'Industrial IoE eliminates slow manual stock-taking and catches costly spoilage immediately by pairing RFID/thermal sensors with automated HVAC actuators.',
  },
  {
    id: 'ioe-4',
    title: 'Smart Home Energy & Heating Hub',
    domain: 'TA6 · Smart Homes',
    scenario: 'A household wants to cut winter heating bills by warming rooms only when family members are home or approaching home, with manual wall override if broadband drops.',
    goalOutcome: 'Balances comfort and lower energy usage automatically with local manual fallback.',
    stages: {
      sensor: {
        stageLabel: '1. Input Sensor',
        pillarName: 'Things',
        prompt: 'Select the home sensors:',
        correctOptionId: 'temp-pir',
        options: [
          { id: 'temp-pir', label: 'Room Thermostat & Motion/Geofence Sensor', shortLabel: 'Temp + Presence', pillarTag: 'Things', detail: 'Detects room temperature and whether occupants are present.' },
          { id: 'wind-vane', label: 'Airport Runway Wind-Shear Radar', shortLabel: 'Runway Radar', pillarTag: 'Things', detail: 'Measures aircraft crosswinds.' },
          { id: 'nfc-turnstile', label: 'Stadium Ticket Barcode Gate', shortLabel: 'Ticket Gate', pillarTag: 'Things', detail: 'Scans event tickets.' },
        ],
      },
      network: {
        stageLabel: '2. Network Link',
        pillarName: 'Data',
        prompt: 'Select the home hub connectivity:',
        correctOptionId: 'home-wifi-mesh',
        options: [
          { id: 'home-wifi-mesh', label: 'Encrypted Home Wi-Fi / Low-Power Smart Hub', shortLabel: 'Home Wi-Fi / Hub', pillarTag: 'Data', detail: 'Connects room sensors to the thermostat hub and smartphone app.' },
          { id: 'sat-dish', label: 'Dedicated Geostationary Satellite Uplink', shortLabel: 'Satellite Dish', pillarTag: 'Data', detail: 'Unnecessarily expensive with high latency for an indoor home.' },
          { id: 'nfc-wall', label: 'NFC Tap Required per Room', shortLabel: 'NFC Tap Only', pillarTag: 'Data', detail: 'Cannot report room temperatures remotely.' },
        ],
      },
      process: {
        stageLabel: '3. Processing Rule',
        pillarName: 'Process',
        prompt: 'Select the heating optimisation logic:',
        correctOptionId: 'heating-schedule',
        options: [
          { id: 'heating-schedule', label: 'Compare Room Temp vs Target & Occupancy', shortLabel: 'Target & Occupancy Rule', pillarTag: 'Process', detail: 'Switches boiler off in empty rooms and pre-heats before arrival.' },
          { id: 'payroll-calc', label: 'Staff Payroll Tax Calculator', shortLabel: 'Payroll Calculator', pillarTag: 'Process', detail: 'Calculates monthly employee salaries.' },
          { id: 'random-timer', label: 'Switch Boiler On Randomly Every Hour', shortLabel: 'Random Timer', pillarTag: 'Process', detail: 'Wastes energy regardless of temperature.' },
        ],
      },
      actuator: {
        stageLabel: '4. Action & Feedback',
        pillarName: 'People',
        prompt: 'Select the actuator and homeowner control:',
        correctOptionId: 'boiler-relay-app',
        options: [
          { id: 'boiler-relay-app', label: 'Smart Boiler Relay + Mobile App & Wall Dial', shortLabel: 'Boiler Relay + App', pillarTag: 'People', detail: 'Controls heating valves automatically while preserving manual wall control offline.' },
          { id: 'open-windows', label: 'Leave All Windows Locked Open', shortLabel: 'Open Windows', pillarTag: 'People', detail: 'Loses heat continuously in winter.' },
          { id: 'sms-neighbours', label: 'Text Room Temperature to Neighbours', shortLabel: 'Text Neighbours', pillarTag: 'People', detail: 'Leaks household occupancy privacy.' },
        ],
      },
    },
    examinerSummary: 'Top-band OCR answers mention both the benefit (lower energy bills & convenience) AND local manual fallback so heating still works during a broadband outage.',
  },
  {
    id: 'ioe-5',
    title: 'Smart City Adaptive Traffic Signals',
    domain: 'TA6 · Smart Cities',
    scenario: 'A city council wants junctions to lengthen green lights automatically during rush-hour queues and prioritise approaching ambulances to cut response times.',
    goalOutcome: 'Reduces congestion emissions and clears emergency routes automatically.',
    stages: {
      sensor: {
        stageLabel: '1. Input Sensor',
        pillarName: 'Things',
        prompt: 'Select the roadside sensors:',
        correctOptionId: 'loop-cam',
        options: [
          { id: 'loop-cam', label: 'Road Induction Loops & Emergency Beacon Receiver', shortLabel: 'Road Loops + Beacon', pillarTag: 'Things', detail: 'Counts queued vehicles per lane and detects approaching ambulance transponders.' },
          { id: 'smart-scale', label: 'Bathroom Body-Fat Scale', shortLabel: 'Bathroom Scale', pillarTag: 'Things', detail: 'Measures household weight indoors.' },
          { id: 'heart-watch', label: 'Personal Smartwatch Pedometer', shortLabel: 'Pedometer', pillarTag: 'Things', detail: 'Tracks walking steps for one individual.' },
        ],
      },
      network: {
        stageLabel: '2. Network Link',
        pillarName: 'Data',
        prompt: 'Select the city-wide junction connectivity:',
        correctOptionId: 'city-fibre-5g',
        options: [
          { id: 'city-fibre-5g', label: 'City Fibre Backbone & Low-Latency 5G', shortLabel: 'Fibre / 5G Backhaul', pillarTag: 'Data', detail: 'Links junctions to the traffic control centre with near-instant response.' },
          { id: 'bt-10m', label: 'Bluetooth Between Adjacent Cars Only', shortLabel: 'Bluetooth PAN', pillarTag: 'Data', detail: 'Too short-range to coordinate city-wide junctions.' },
          { id: 'nfc-bumper', label: 'NFC Reader on Road Kerb', shortLabel: 'Kerb NFC', pillarTag: 'Data', detail: 'Vehicles cannot tap a kerb within 10 cm while driving.' },
        ],
      },
      process: {
        stageLabel: '3. Processing Rule',
        pillarName: 'Process',
        prompt: 'Select the city traffic processing engine:',
        correctOptionId: 'flow-optimiser',
        options: [
          { id: 'flow-optimiser', label: 'Queue Density & Emergency Priority Algorithm', shortLabel: 'Flow & Priority Logic', pillarTag: 'Process', detail: 'Dynamically adjusts green phases and creates a safe green wave for ambulances.' },
          { id: 'photo-filter', label: 'Social Media Photo Crop Filter', shortLabel: 'Photo Filter', pillarTag: 'Process', detail: 'Edits portrait brightness only.' },
          { id: 'fixed-clock', label: 'Ignore Sensors & Use Fixed 60s Timer', shortLabel: 'Fixed 60s Timer', pillarTag: 'Process', detail: 'Never adapts to real-time queues or emergency vehicles.' },
        ],
      },
      actuator: {
        stageLabel: '4. Action & Feedback',
        pillarName: 'People',
        prompt: 'Select the physical junction actuator and driver output:',
        correctOptionId: 'signals-satnav',
        options: [
          { id: 'signals-satnav', label: 'LED Traffic Signal Controller + Live Sat-Nav Feed', shortLabel: 'Traffic Signals + Feed', pillarTag: 'People', detail: 'Updates junction lights safely and warns commuters of busy routes.' },
          { id: 'turn-off-lights', label: 'Switch All Traffic Lights Off Completely', shortLabel: 'Switch Lights Off', pillarTag: 'People', detail: 'Causes severe junction collisions.' },
          { id: 'print-posters', label: 'Print Paper Road Posters Weekly', shortLabel: 'Weekly Posters', pillarTag: 'People', detail: 'Cannot react to live traffic changes.' },
        ],
      },
    },
    examinerSummary: 'Smart city IoE systems rely on low-latency Fibre/5G backhaul and strict fail-safe defaults so junctions remain safe even if the central server loses contact.',
  },
  {
    id: 'ioe-6',
    title: 'SwiftFit Connected Cardio Equipment',
    domain: 'TA6 · Leisure & Fitness',
    scenario: 'SwiftFit wants gym members to tap their wristband on any treadmill to load personal pace targets, log workouts automatically, and alert technicians if a motor overheats.',
    goalOutcome: 'Delivers personalised workout summaries for members and proactive motor maintenance alerts.',
    stages: {
      sensor: {
        stageLabel: '1. Input Sensor',
        pillarName: 'Things',
        prompt: 'Select the treadmill & member sensors:',
        correctOptionId: 'nfc-speed-temp',
        options: [
          { id: 'nfc-speed-temp', label: 'NFC Wristband Reader, Belt Speed & Motor Temp Sensor', shortLabel: 'NFC + Belt & Temp', pillarTag: 'Things', detail: 'Identifies the member on tap and tracks distance, speed, and motor heat.' },
          { id: 'rain-gauge', label: 'Outdoor Rainfall Bucket Gauge', shortLabel: 'Rain Gauge', pillarTag: 'Things', detail: 'Measures outdoor precipitation.' },
          { id: 'gps-sat', label: 'Marine Sonar Depth Finder', shortLabel: 'Marine Sonar', pillarTag: 'Things', detail: 'Measures ocean depth under boats.' },
        ],
      },
      network: {
        stageLabel: '2. Network Link',
        pillarName: 'Data',
        prompt: 'Select how gym machines sync with SwiftFit servers:',
        correctOptionId: 'gym-wifi-lan',
        options: [
          { id: 'gym-wifi-lan', label: 'Secured Gym Wi-Fi / Ethernet LAN', shortLabel: 'Gym Wi-Fi / LAN', pillarTag: 'Data', detail: 'Syncs workout logs and motor diagnostics securely to SwiftFit cloud.' },
          { id: 'sat-indoor', label: 'Outdoor Satellite Dish per Treadmill', shortLabel: 'Satellite Dish', pillarTag: 'Data', detail: 'Satellite signals are blocked by indoor gym roofs.' },
          { id: 'paper-card', label: 'Handwritten Member Fitness Card', shortLabel: 'Paper Card', pillarTag: 'Data', detail: 'No automated syncing or motor fault monitoring.' },
        ],
      },
      process: {
        stageLabel: '3. Processing Rule',
        pillarName: 'Process',
        prompt: 'Select the SwiftFit cloud processing workflow:',
        correctOptionId: 'workout-maint-engine',
        options: [
          { id: 'workout-maint-engine', label: 'Compute Member Stats + Flag Motor Heat > 80 °C', shortLabel: 'Stats & Heat Rule', pillarTag: 'Process', detail: 'Calculates calories/PB progress and raises predictive maintenance alerts.' },
          { id: 'font-render', label: 'Poster Typography Resizer', shortLabel: 'Font Resizer', pillarTag: 'Process', detail: 'Adjusts print heading sizes only.' },
          { id: 'discard-faults', label: 'Ignore Hardware Error Codes', shortLabel: 'Ignore Faults', pillarTag: 'Process', detail: 'Lets motors burn out without warning technicians.' },
        ],
      },
      actuator: {
        stageLabel: '4. Action & Feedback',
        pillarName: 'People',
        prompt: 'Select the outputs for members & gym technicians:',
        correctOptionId: 'incline-app-ticket',
        options: [
          { id: 'incline-app-ticket', label: 'Auto Incline/Display + Member App & Tech Ticket', shortLabel: 'App Summary + Ticket', pillarTag: 'People', detail: 'Adjusts treadmill display/incline, updates member app, and logs technician repair tickets.' },
          { id: 'lock-exit', label: 'Lock Gym Changing Room Doors', shortLabel: 'Lock Exit Doors', pillarTag: 'People', detail: 'Unrelated safety hazard.' },
          { id: 'sell-vitals', label: 'Publish Member Heart Rates on Public Website', shortLabel: 'Publish Vitals', pillarTag: 'People', detail: 'Breaches DPA 2018 personal health data privacy.' },
        ],
      },
    },
    examinerSummary: 'Connected leisure IoE serves two People groups at once: members get automated workout tracking while gym managers cut downtime through predictive maintenance.',
  },
];

export const COMMS_CHALLENGES: CommsChallenge[] = [
  {
    id: 'comm-1',
    title: 'Hardware vs Software Exam Trap (Video Calls)',
    specRef: 'TA5.3 · Requirements',
    scenario: 'A small charity wants remote trustees to hold monthly live video meetings with screen sharing. An exam question specifically asks for TWO required HARDWARE components.',
    promptQuestion: '1. Which pair contains ONLY valid HARDWARE components for video conferencing? (+1 Mark)',
    channelOptions: [
      { id: 'hw-pair', label: 'Webcam / Microphone and Network Interface Card (NIC) or Router' },
      { id: 'sw-trap', label: 'Microsoft Teams and Google Chrome Web Browser' },
      { id: 'mixed-trap', label: 'Zoom Video Client and Webcam' },
      { id: 'irrelevant-hw', label: 'Thermal Receipt Printer and Barcode Scanner' },
    ],
    correctChannelId: 'hw-pair',
    detailPrompt: '2. Why would writing "Zoom and Speakers" lose half the marks on a Hardware question? (+1 Mark)',
    detailOptions: [
      { id: 'zoom-is-sw', label: 'Zoom is application software, not physical hardware — OCR awards 0 marks for software named in a hardware question' },
      { id: 'speakers-sw', label: 'Speakers are cloud software and cannot connect to a computer' },
      { id: 'video-no-hw', label: 'Video conferencing does not require any physical input devices' },
      { id: 'zoom-illegal', label: 'Video conferencing software is banned under the Copyright Act 1988' },
    ],
    correctDetailId: 'zoom-is-sw',
    examinerNote: 'Classic OCR TA5 examiner report warning: always separate physical Hardware (webcam, mic, speakers, router, NIC) from Software (VoIP/video client, OS, browser, codecs).',
  },
  {
    id: 'comm-2',
    title: 'Real-Time Multi-Author Event Spreadsheet',
    specRef: 'TA5.2 · Distribution Channels',
    scenario: 'Twelve festival volunteers across four UK cities need to update one live stall-booking spreadsheet at the exact same time from laptops and tablets without creating conflicting copies.',
    promptQuestion: '1. Which digital distribution & storage channel best fits this workflow? (+1 Mark)',
    channelOptions: [
      { id: 'cloud-collab', label: 'Cloud-Hosted Collaborative Workspace (e.g., shared cloud spreadsheet)' },
      { id: 'email-attach', label: 'Emailing spreadsheet attachments back and forth' },
      { id: 'usb-post', label: 'Posting a single USB flash drive between cities' },
      { id: 'sms-broadcast', label: 'Sending one-way SMS text messages' },
    ],
    correctChannelId: 'cloud-collab',
    detailPrompt: '2. What is the key operational advantage over emailing file attachments? (+1 Mark)',
    detailOptions: [
      { id: 'single-truth', label: 'Simultaneous live editing with automatic version history prevents conflicting duplicate files' },
      { id: 'no-internet', label: 'Works across four cities without any internet connection at all' },
      { id: 'no-passwords', label: 'Removes the need for access controls or user logins' },
      { id: 'free-hardware', label: 'Provides free physical laptops to every volunteer' },
    ],
    correctDetailId: 'single-truth',
    examinerNote: 'Cloud collaboration solves version-control conflicts, supports cross-device access, and provides role-based permissions (view vs edit).',
  },
  {
    id: 'comm-3',
    title: 'Cutting International Support Call Costs',
    specRef: 'TA5.1 · Digital Comms',
    scenario: 'A UK travel agency makes hundreds of daily voice calls to partner hotels in Spain, France, and Japan and wants to replace expensive traditional landline charges.',
    promptQuestion: '1. Which synchronous communication technology directly solves this? (+1 Mark)',
    channelOptions: [
      { id: 'voip', label: 'VoIP (Voice over Internet Protocol)' },
      { id: 'podcast', label: 'Pre-recorded Audio Podcast' },
      { id: 'nfc-tap', label: 'NFC Contactless Tap' },
      { id: 'blog-post', label: 'Public Static Blog Article' },
    ],
    correctChannelId: 'voip',
    detailPrompt: '2. What is the main technical trade-off the agency must plan for with VoIP? (+1 Mark)',
    detailOptions: [
      { id: 'voip-bandwidth', label: 'Call audio quality drops (jitter/lag) or cuts out completely if internet bandwidth is congested or power fails' },
      { id: 'voip-async', label: 'VoIP only sends asynchronous text emails that arrive the next day' },
      { id: 'voip-paper', label: 'VoIP requires a colour laser printer on every desk' },
      { id: 'voip-short', label: 'VoIP only works within 10 metres of the caller' },
    ],
    correctDetailId: 'voip-bandwidth',
    examinerNote: 'Always pair VoIP’s benefit (low-cost global voice calls over existing broadband) with its limitation (dependency on stable, low-latency internet and power).',
  },
  {
    id: 'comm-4',
    title: 'Reaching Teenagers vs Older Community Members',
    specRef: 'TA5.2 · Audience & Channels',
    scenario: 'A local council is launching a new youth skatepark AND a weekly over-70s digital café. Staff must pick effective distribution channels rather than using one channel for everyone.',
    promptQuestion: '1. Which pairing matches the right distribution channels to each target audience? (+1 Mark)',
    channelOptions: [
      { id: 'targeted-mix', label: 'Short-form Social Media / Vlogs for teens; Website, Email newsletters & local printed notices for over-70s' },
      { id: 'tiktok-only', label: 'Publish both exclusively on a single mobile-only video app with no website' },
      { id: 'fax-only', label: 'Send fax messages to teenagers’ homes' },
      { id: 'cli-only', label: 'Require residents to query a Command Line server over SSH' },
    ],
    correctChannelId: 'targeted-mix',
    detailPrompt: '2. Which TA5 concept explains why relying ONLY on a smartphone app excludes some older or low-income residents? (+1 Mark)',
    detailOptions: [
      { id: 'digital-divide', label: 'The Digital Divide — unequal access to devices, broadband affordability, or digital literacy skills' },
      { id: 'range-check', label: 'A database Range Check validation error' },
      { id: 'pharming', label: 'DNS Pharming redirection' },
      { id: 'interoperability', label: 'Actuator mechanical wear' },
    ],
    correctDetailId: 'digital-divide',
    examinerNote: 'OCR frequently links TA5.2 (target audience channel choice) with TA5.5 (Digital Divide: age, income, rural connectivity, and digital skills).',
  },
  {
    id: 'comm-5',
    title: 'Asynchronous vs Synchronous Global Project Handover',
    specRef: 'TA5.1 · Communication Types',
    scenario: 'Software designers in London finish work at 17:00 GMT and need to leave detailed annotated design updates and formal client approvals for developers in Sydney who start 10 hours later.',
    promptQuestion: '1. Which communication approach fits non-overlapping time zones best? (+1 Mark)',
    channelOptions: [
      { id: 'async-email-portal', label: 'Asynchronous Email / Shared Project Portal with structured notes and attachments' },
      { id: 'live-phone-3am', label: 'Mandatory live synchronous phone call at 03:00 local time every day' },
      { id: 'bluetooth-drop', label: 'Direct Bluetooth file transfer between London and Sydney' },
      { id: 'verbal-only', label: 'Unrecorded hallway chat with no written audit trail' },
    ],
    correctChannelId: 'async-email-portal',
    detailPrompt: '2. Why is asynchronous written communication valuable for formal client approvals? (+1 Mark)',
    detailOptions: [
      { id: 'audit-timezone', label: 'Recipients read and reply in their own working hours while creating a timestamped written record' },
      { id: 'instant-body-lang', label: 'It shows live facial expressions and tone of voice in real time' },
      { id: 'zero-storage', label: 'Messages vanish permanently before anyone can read them' },
      { id: 'needs-5g', label: 'It only functions over 5G mobile towers' },
    ],
    correctDetailId: 'audit-timezone',
    examinerNote: 'Synchronous tools (VoIP, video calls) suit immediate discussion and body language; Asynchronous tools (email, portals) suit time-zone gaps and formal audit trails.',
  },
  {
    id: 'comm-6',
    title: 'On-Demand Audio Revision for Commuters',
    specRef: 'TA5.2 · Media Distribution',
    scenario: 'A college IT department wants to publish 10-minute topic revision summaries that students can download on Wi-Fi and listen to hands-free on the bus without mobile data charges.',
    promptQuestion: '1. Which distribution format best matches hands-free offline listening? (+1 Mark)',
    channelOptions: [
      { id: 'podcast', label: 'Downloadable Audio Podcast series' },
      { id: 'live-webinar', label: 'Unrecorded live-only video webinar' },
      { id: 'spreadsheet', label: 'Raw CSV database export' },
      { id: 'sms-chain', label: '40 separate SMS text messages' },
    ],
    correctChannelId: 'podcast',
    detailPrompt: '2. What accessibility step should the college add to make the podcast inclusive (TA2/TA4 link)? (+1 Mark)',
    detailOptions: [
      { id: 'transcript', label: 'Publish a full written text transcript alongside each audio episode for deaf or hard-of-hearing learners' },
      { id: 'higher-bitrate', label: 'Double the file size so downloads take longer on bus Wi-Fi' },
      { id: 'remove-titles', label: 'Remove episode titles so students guess the topic' },
      { id: 'block-pause', label: 'Disable pause and rewind controls' },
    ],
    correctDetailId: 'transcript',
    examinerNote: 'Audio podcasts enable convenient on-the-go learning with low file sizes, and pairing them with transcripts meets Equality Act 2010 accessibility standards.',
  },
];

export const TRADEOFF_CHALLENGES: TradeoffChallenge[] = [
  {
    id: 'to-1',
    title: 'Cloud-Only Smart Lock During Broadband Outage',
    topicTag: 'TA6',
    systemName: 'Smart Office Entry & Heating Hub',
    telemetryReadings: [
      { label: 'Broadband WAN', value: 'Offline (ISP Fault)', severity: 'critical' },
      { label: 'Cloud Server', value: 'Unreachable', severity: 'critical' },
      { label: 'Local Power', value: 'Mains OK (240V)', severity: 'nominal' },
    ],
    scenario: 'The office’s ISP fibre line is severed by roadworks. Because the smart doors and heating only validate commands via a remote cloud server, staff are locked outside and heating cannot be adjusted.',
    riskOptions: [
      { id: 'spof-cloud', label: 'Single Point of Failure / Total Dependency on Continuous Internet Connectivity' },
      { id: 'too-much-ram', label: 'Excessive RAM installed inside the reception desktop PC' },
      { id: 'cdpa-breach', label: 'Breach of the Copyright, Designs and Patents Act 1988' },
      { id: 'nfc-too-fast', label: 'NFC wristbands tapping faster than 10 seconds' },
    ],
    correctRiskId: 'spof-cloud',
    mitigationOptions: [
      { id: 'local-fallback', label: 'Build Local Edge Processing & Physical Key / Manual Override Fallback when offline' },
      { id: 'buy-4k-tv', label: 'Install larger 4K TV screens in the lobby' },
      { id: 'remove-locks', label: 'Leave the building unlocked permanently overnight' },
      { id: 'switch-bluetooth', label: 'Email staff once a week with a PDF of door rules' },
    ],
    correctMitigationId: 'local-fallback',
    examinerNote: 'Dependency on cloud connectivity is one of the highest-scoring TA6.4 evaluation points — always recommend local edge fallback or manual override.',
  },
  {
    id: 'to-2',
    title: 'Budget Smart Cameras Recruited Into Botnet',
    topicTag: 'TA6',
    systemName: '24-Camera Retail Security Fleet',
    telemetryReadings: [
      { label: 'Admin Password', value: 'admin / 1234 (Default)', severity: 'critical' },
      { label: 'Firmware Build', value: 'v1.0 (Unpatched 2021)', severity: 'critical' },
      { label: 'Outbound Traffic', value: '980 Mbps Spike', severity: 'warning' },
    ],
    scenario: 'An independent retailer installed 24 inexpensive Wi-Fi cameras straight out of the box. Suddenly the shop’s broadband crawls to a halt because attackers hijacked the cameras to flood a third-party website.',
    riskOptions: [
      { id: 'iot-botnet', label: 'Weak Default Credentials & Unpatched Firmware allowing DDoS Botnet Hijacking' },
      { id: 'digital-divide', label: 'Rural Digital Divide caused by mountain geography' },
      { id: 'colour-contrast', label: 'Low HCI colour contrast on checkout buttons' },
      { id: 'lookup-error', label: 'Missing dropdown lookup rule in a spreadsheet' },
    ],
    correctRiskId: 'iot-botnet',
    mitigationOptions: [
      { id: 'patch-segment', label: 'Enforce Unique Strong Passwords, Automatic Firmware Patching & Separate IoE VLAN/Network Segmentation' },
      { id: 'buy-more-cams', label: 'Buy 24 more cameras with the same factory password' },
      { id: 'turn-off-firewall', label: 'Disable the shop’s router firewall to speed up traffic' },
      { id: 'rename-ssid', label: 'Change the camera plastic casing colour from white to black' },
    ],
    correctMitigationId: 'patch-segment',
    examinerNote: 'TA6.5 + TA4 synergy: cheap IoE devices with unchanged default passwords and stale firmware are prime targets for Mirai-style DDoS botnets.',
  },
  {
    id: 'to-3',
    title: 'Proprietary Smart Home Ecosystem Lock-In',
    topicTag: 'TA6',
    systemName: 'Multi-Room Connected Lighting & Security',
    telemetryReadings: [
      { label: 'Hub Protocol', value: 'Closed Proprietary API', severity: 'warning' },
      { label: 'New Smoke Sensor', value: 'Incompatible Brand', severity: 'critical' },
      { label: 'Vendor App', value: 'Mandatory Subscription', severity: 'warning' },
    ],
    scenario: 'A homeowner bought Brand-A smart lights and hub. When trying to add a top-rated Brand-B smoke detector and Brand-C thermostat, none of the devices can exchange triggers or share one control app.',
    riskOptions: [
      { id: 'poor-interop', label: 'Poor Interoperability & Vendor Lock-In across Proprietary Ecosystems' },
      { id: 'brute-force', label: 'Brute-force password cracking on a bank login page' },
      { id: 'sql-inject', label: 'SQL Injection on a public web form' },
      { id: 'high-latency', label: 'Satellite rain-fade signal loss' },
    ],
    correctRiskId: 'poor-interop',
    mitigationOptions: [
      { id: 'open-standards', label: 'Select Devices Supporting Open Cross-Vendor Standards (e.g., Matter / Zigbee / Open APIs)' },
      { id: 'use-5-apps', label: 'Ask users to keep 6 separate apps open all day and copy readings manually' },
      { id: 'disable-wifi', label: 'Unplug the home router permanently' },
      { id: 'double-entry', label: 'Type every room temperature twice into a spreadsheet' },
    ],
    correctMitigationId: 'open-standards',
    examinerNote: 'Interoperability (TA6.4) is a favourite OCR keyword: open standards prevent expensive vendor lock-in and allow smooth scalability as new devices are added.',
  },
  {
    id: 'to-4',
    title: 'Freezing Video Calls on Congested Rural Broadband',
    topicTag: 'TA5',
    systemName: 'Remote GP Telehealth Video Consultation',
    telemetryReadings: [
      { label: 'Upload Speed', value: '1.2 Mbps (Congested)', severity: 'critical' },
      { label: 'Latency (Ping)', value: '360 ms', severity: 'critical' },
      { label: 'Packet Loss', value: '8.4%', severity: 'warning' },
    ],
    scenario: 'During a remote rural GP video consultation, the patient’s video freezes mid-sentence and audio arrives two seconds late, making clinical advice hard to follow.',
    riskOptions: [
      { id: 'latency-bw', label: 'Insufficient Upload Bandwidth, High Latency & Packet Loss degrading synchronous video' },
      { id: 'nfc-range', label: 'NFC range exceeding 10 cm' },
      { id: 'copyright-audio', label: 'Copyright infringement of the doctor’s voice' },
      { id: 'storage-limit', label: 'Hard drive running out of local USB ports' },
    ],
    correctRiskId: 'latency-bw',
    mitigationOptions: [
      { id: 'adaptive-audio', label: 'Switch to Adaptive Lower-Bitrate / Audio-Only Fallback and Wire to Router or Upgrade Fibre/5G' },
      { id: 'stream-4k', label: 'Force 4K Ultra-HD video at 60 fps to make the picture sharper' },
      { id: 'open-downloads', label: 'Start large background cloud backups during the call' },
      { id: 'use-nfc', label: 'Ask the patient to tap their phone on the doctor’s laptop 20 miles away' },
    ],
    correctMitigationId: 'adaptive-audio',
    examinerNote: 'Synchronous video requires steady upload bandwidth and low latency; dropping to audio-only preserves clear clinical speech on weak rural links.',
  },
  {
    id: 'to-5',
    title: 'Always-On Smart Speaker Privacy & Profiling',
    topicTag: 'TA6',
    systemName: 'Hospitality Room Voice Assistant',
    telemetryReadings: [
      { label: 'Microphone', value: 'Always Listening', severity: 'warning' },
      { label: 'Voice Clips', value: 'Stored Indefinitely in Cloud', severity: 'critical' },
      { label: 'Guest Consent', value: 'Pre-Ticked / Unclear', severity: 'critical' },
    ],
    scenario: 'A hotel installs always-on voice assistants in guest bedrooms that record ambient speech to cloud servers indefinitely and share preference profiles with third-party advertisers.',
    riskOptions: [
      { id: 'privacy-profiling', label: 'Invasive Audio Surveillance, Behavioural Profiling & DPA 2018 Consent/Retention Breach' },
      { id: 'low-battery', label: 'Coin-cell battery drain inside wired bedside mains units' },
      { id: 'cable-trip', label: 'Wired Ethernet latency exceeding 1 second' },
      { id: 'format-check', label: 'Invalid UK postcode format check' },
    ],
    correctRiskId: 'privacy-profiling',
    mitigationOptions: [
      { id: 'mute-optin', label: 'Provide Physical Hardware Mic-Mute Switch, Explicit Opt-In Consent & Auto-Deletion After Checkout' },
      { id: 'hide-speaker', label: 'Hide the microphone behind a painting so guests do not notice it' },
      { id: 'keep-forever', label: 'Retain guest audio recordings for 20 years without telling guests' },
      { id: 'louder-voice', label: 'Increase speaker volume to 100%' },
    ],
    correctMitigationId: 'mute-optin',
    examinerNote: 'Always connect TA6.5 ethical/privacy risks (profiling, always-on sensing) with concrete safeguards: hardware mute switches, transparency, and strict retention limits.',
  },
  {
    id: 'to-6',
    title: 'Short-Lifespan Sealed Sensors & E-Waste Impact',
    topicTag: 'TA6',
    systemName: 'Disposable Parcel Tracking Tags',
    telemetryReadings: [
      { label: 'Battery Design', value: 'Glued / Non-Replaceable', severity: 'critical' },
      { label: 'Device Lifespan', value: '18 Months Before Landfill', severity: 'critical' },
      { label: 'Annual Volume', value: '120,000 Units', severity: 'warning' },
    ],
    scenario: 'A logistics company ships 120,000 sealed plastic smart trackers a year whose batteries cannot be replaced or recharged, causing tonnes of hazardous lithium e-waste in landfill.',
    riskOptions: [
      { id: 'ewaste-env', label: 'Severe Environmental E-Waste, Toxic Lithium Disposal & Unsustainable Device Lifecycle' },
      { id: 'ddos-flood', label: 'Distributed Denial of Service against a web server' },
      { id: 'shoulder-surf', label: 'Shoulder surfing at a public café' },
      { id: 'blagging-call', label: 'Blagging phone call to an IT helpdesk' },
    ],
    correctRiskId: 'ewaste-env',
    mitigationOptions: [
      { id: 'reusable-modular', label: 'Adopt Reusable Rechargeable Return-Loop Trackers, Modular Batteries & WEEE Certified Recycling' },
      { id: 'throw-general', label: 'Instruct customers to place lithium trackers in general household bins' },
      { id: 'make-smaller', label: 'Glue the battery tighter so nobody can recycle it' },
      { id: 'add-leds', label: 'Add brighter flashing LEDs so batteries die in 3 months instead of 18' },
    ],
    correctMitigationId: 'reusable-modular',
    examinerNote: 'Environmental ethics (TA6.5 & TA4.5) earns easy AO3 marks: cite finite rare-earth metals, toxic battery leachate, and circular reuse/WEEE recycling schemes.',
  },
];

export function evaluateConnectivityChallenge(
  challenge: ConnectivityChallenge,
  selectedTechId: ConnectivityTechId | '',
  selectedReasonId: string
): ConnectivityEvaluation {
  const techCorrect = selectedTechId === challenge.correctTechId;
  const reasonCorrect = selectedReasonId === challenge.correctReasonId;
  const marksEarned = (techCorrect ? 1 : 0) + (reasonCorrect ? 1 : 0);
  const maxMarks = 2;
  const isMastered = marksEarned === maxMarks;

  const correctTech = CONNECTIVITY_SPECS.find((t) => t.id === challenge.correctTechId);
  const correctReason = challenge.reasonOptions.find((r) => r.id === challenge.correctReasonId);

  let feedbackTitle = 'Needs Revision — 0 / 2 Marks';
  if (marksEarned === 2) {
    feedbackTitle = 'Full Marks — 2 / 2 Marks';
  } else if (marksEarned === 1) {
    feedbackTitle = techCorrect
      ? 'Right Technology, Refine Justification — 1 / 2 Marks'
      : 'Good Justification, Check Technology Choice — 1 / 2 Marks';
  }

  return {
    techCorrect,
    reasonCorrect,
    marksEarned,
    maxMarks,
    isMastered,
    feedbackTitle,
    examinerNote: challenge.examinerNote,
    correctTechName: correctTech ? correctTech.name : challenge.correctTechId,
    correctReasonLabel: correctReason ? correctReason.label : '',
  };
}

export function evaluateIoeBuild(
  blueprint: IoeSystemBlueprint,
  selections: Partial<Record<IoeStageKey, string>>
): IoeBuildEvaluation {
  const stageKeys: IoeStageKey[] = ['sensor', 'network', 'process', 'actuator'];
  const stageResults: IoeStageEval[] = stageKeys.map((key) => {
    const cfg = blueprint.stages[key];
    const selectedId = selections[key] || '';
    const selectedOpt = cfg.options.find((o) => o.id === selectedId);
    const correctOpt = cfg.options.find((o) => o.id === cfg.correctOptionId);
    return {
      stage: key,
      stageLabel: cfg.stageLabel,
      pillarName: cfg.pillarName,
      selectedLabel: selectedOpt ? selectedOpt.shortLabel : 'Not wired',
      correctLabel: correctOpt ? correctOpt.shortLabel : '',
      isCorrect: selectedId === cfg.correctOptionId,
    };
  });

  const marksEarned = stageResults.filter((s) => s.isCorrect).length;
  const maxMarks = 4;
  const isMastered = marksEarned === maxMarks;

  let pipelineStatus: 'operational' | 'degraded' | 'broken' = 'broken';
  let feedbackTitle = `Pipeline Faulty — ${marksEarned} / 4 Stages Verified`;
  if (marksEarned === 4) {
    pipelineStatus = 'operational';
    feedbackTitle = 'IoE System Operational — 4 / 4 Pillars Connected';
  } else if (marksEarned >= 2) {
    pipelineStatus = 'degraded';
    feedbackTitle = `Pipeline Partially Working — ${marksEarned} / 4 Stages Verified`;
  }

  return {
    marksEarned,
    maxMarks,
    isMastered,
    pipelineStatus,
    stageResults,
    feedbackTitle,
    examinerSummary: blueprint.examinerSummary,
  };
}

export function evaluateCommsChallenge(
  challenge: CommsChallenge,
  selectedChannelId: string,
  selectedDetailId: string
): TwoPartEvaluation {
  const part1Correct = selectedChannelId === challenge.correctChannelId;
  const part2Correct = selectedDetailId === challenge.correctDetailId;
  const marksEarned = (part1Correct ? 1 : 0) + (part2Correct ? 1 : 0);
  const maxMarks = 2;

  const c1 = challenge.channelOptions.find((o) => o.id === challenge.correctChannelId);
  const c2 = challenge.detailOptions.find((o) => o.id === challenge.correctDetailId);

  return {
    part1Correct,
    part2Correct,
    marksEarned,
    maxMarks,
    isMastered: marksEarned === maxMarks,
    feedbackTitle:
      marksEarned === 2
        ? 'Exam-Ready Comms Verdict — 2 / 2 Marks'
        : marksEarned === 1
          ? 'Partial Credit — 1 / 2 Marks'
          : 'Review Channel & Trade-Off — 0 / 2 Marks',
    examinerNote: challenge.examinerNote,
    correctPart1Label: c1 ? c1.label : '',
    correctPart2Label: c2 ? c2.label : '',
  };
}

export function evaluateTradeoffChallenge(
  challenge: TradeoffChallenge,
  selectedRiskId: string,
  selectedMitigationId: string
): TwoPartEvaluation {
  const part1Correct = selectedRiskId === challenge.correctRiskId;
  const part2Correct = selectedMitigationId === challenge.correctMitigationId;
  const marksEarned = (part1Correct ? 1 : 0) + (part2Correct ? 1 : 0);
  const maxMarks = 2;

  const c1 = challenge.riskOptions.find((o) => o.id === challenge.correctRiskId);
  const c2 = challenge.mitigationOptions.find((o) => o.id === challenge.correctMitigationId);

  return {
    part1Correct,
    part2Correct,
    marksEarned,
    maxMarks,
    isMastered: marksEarned === maxMarks,
    feedbackTitle:
      marksEarned === 2
        ? 'Risk & Mitigation Mastered — 2 / 2 Marks'
        : marksEarned === 1
          ? 'Halfway There — 1 / 2 Marks'
          : 'System Risk Unresolved — 0 / 2 Marks',
    examinerNote: challenge.examinerNote,
    correctPart1Label: c1 ? c1.label : '',
    correctPart2Label: c2 ? c2.label : '',
  };
}

export function computeTa56MasterySummary(progress: Ta56Progress): Ta56MasterySummary {
  const connDone = CONNECTIVITY_CHALLENGES.filter((c) => progress.completedConnectivity[c.id]).length;
  const ioeDone = IOE_SYSTEM_BLUEPRINTS.filter((b) => progress.completedIoe[b.id]).length;
  const commsDone = COMMS_CHALLENGES.filter((c) => progress.completedComms[c.id]).length;
  const toDone = TRADEOFF_CHALLENGES.filter((t) => progress.completedTradeoffs[t.id]).length;

  const totalChallenges =
    CONNECTIVITY_CHALLENGES.length +
    IOE_SYSTEM_BLUEPRINTS.length +
    COMMS_CHALLENGES.length +
    TRADEOFF_CHALLENGES.length;
  const completedChallenges = connDone + ioeDone + commsDone + toDone;
  const masteryPct = totalChallenges > 0 ? Math.round((completedChallenges / totalChallenges) * 100) : 0;

  return {
    totalChallenges,
    completedChallenges,
    masteryPct,
    byMode: {
      connectivity: { done: connDone, total: CONNECTIVITY_CHALLENGES.length },
      ioe: { done: ioeDone, total: IOE_SYSTEM_BLUEPRINTS.length },
      comms: { done: commsDone, total: COMMS_CHALLENGES.length },
      tradeoffs: { done: toDone, total: TRADEOFF_CHALLENGES.length },
    },
  };
}
