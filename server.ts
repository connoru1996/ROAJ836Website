import express from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const PDF_ASSETS_DIR = path.resolve(PUBLIC_DIR, 'assets', 'aistudio');
const PREBUILT_PAPERS_DIR = path.resolve(__dirname, 'data', 'official-papers');
const CACHE_DIR = path.resolve(__dirname, '.paper-cache');
const MAX_PDF_BYTES = 16 * 1024 * 1024; // 16 MB
const MAX_DIAGRAM_BYTES = 4 * 1024 * 1024; // 4 MB
const GEMINI_MODEL = 'gemini-4-hydrogen';

interface OfficialPaperMeta {
  id: string;
  title: string;
  series: string;
  year: number;
  category: 'past' | 'practice' | 'specimen' | 'mapped';
  scenario: string;
  filename: string;
  pages: number;
  defaultMarks: number;
  defaultDurationMinutes: number;
}

interface ParsedQuestion {
  id: string;
  qNum: string;
  section: string;
  ta: string;
  marks: number;
  pageNumber: number;
  hasFigure: boolean;
  figureNote: string;
  scenarioContext: string;
  prompt: string;
  inputType: 'mcq' | 'short' | 'multi' | 'matching' | 'table' | 'diagram' | 'extended';
  options: string[];
  subFieldLabels: string[];
  matchingLeft: string[];
  matchingRight: string[];
  tableColumns: string[];
  tableRows: string[][];
  markSchemeHint: string;
  officialMarkScheme?: string;
}

interface ParsedPaperPayload {
  paperId: string;
  title: string;
  series: string;
  totalMarks: number;
  durationMinutes: number;
  pdfUrl: string;
  hasOfficialMarkScheme: boolean;
  markSchemeSummary?: string;
  parsedAt: string;
  questions: ParsedQuestion[];
}

// Explicit server-side allowlist of the 10 uploaded OCR R050/01 PDF papers
const OFFICIAL_OCR_PAPERS: OfficialPaperMeta[] = [
  {
    id: 'ocr_jan2026',
    title: 'January 2026 Exam Paper',
    series: 'Jan 2026 · R050/01',
    year: 2026,
    category: 'past',
    scenario: 'Sports centre online booking system & mind map planning',
    filename: 'R05001_IT_in_the_Digital_World_Level_12_January_2026_fee57e78.pdf',
    pages: 12,
    defaultMarks: 70,
    defaultDurationMinutes: 90,
  },
  {
    id: 'ocr_jun2026',
    title: 'June 2026 Exam Paper',
    series: 'June 2026 · R050/01',
    year: 2026,
    category: 'past',
    scenario: 'Energy supplier smart meter device & flowchart design',
    filename: 'R05001_IT_in_the_Digital_World_Level_12_June_2026_4a7569d6.pdf',
    pages: 10,
    defaultMarks: 70,
    defaultDurationMinutes: 90,
  },
  {
    id: 'ocr_jun2025',
    title: 'June 2025 Exam Paper',
    series: 'June 2025 · R050/01',
    year: 2025,
    category: 'past',
    scenario: 'Wearable fitness device, HCI & cyber security',
    filename: 'R05001_IT_in_the_Digital_World_Level_12_June_2025_347afdda.pdf',
    pages: 12,
    defaultMarks: 70,
    defaultDurationMinutes: 90,
  },
  {
    id: 'ocr_jan2025',
    title: 'January 2025 Exam Paper',
    series: 'Jan 2025 · R050/01',
    year: 2025,
    category: 'past',
    scenario: 'Online bank savings account, validation & security',
    filename: 'R05001_IT_in_the_Digital_World_Level_12_January_2025_3e0f845e.pdf',
    pages: 9,
    defaultMarks: 70,
    defaultDurationMinutes: 90,
  },
  {
    id: 'ocr_jun2024',
    title: 'June 2024 Exam Paper',
    series: 'June 2024 · R050/01',
    year: 2024,
    category: 'past',
    scenario: 'Road safety computer game, IoE pillars & visualisation',
    filename: 'R05001_IT_in_the_Digital_World_Level_12_June_2024_a1e12af4.pdf',
    pages: 10,
    defaultMarks: 70,
    defaultDurationMinutes: 90,
  },
  {
    id: 'ocr_jan2024',
    title: 'January 2024 Exam Paper',
    series: 'Jan 2024 · R050/01',
    year: 2024,
    category: 'past',
    scenario: 'Animal charity discovery trail app & data types',
    filename: 'R05001_IT_in_the_Digital_World_Level_12_January_2024_1ef33e71.pdf',
    pages: 12,
    defaultMarks: 70,
    defaultDurationMinutes: 90,
  },
  {
    id: 'ocr_practice',
    title: 'Official Practice Paper',
    series: 'Practice · R050/01',
    year: 2023,
    category: 'practice',
    scenario: 'Progress Fitness Centre membership & wireframe planning',
    filename: 'R05001_IT_in_the_Digital_World_Level_12_Practice_21c405be.pdf',
    pages: 8,
    defaultMarks: 70,
    defaultDurationMinutes: 90,
  },
  {
    id: 'ocr_specimen',
    title: 'Official Specimen Paper',
    series: 'Specimen · R050/01',
    year: 2022,
    category: 'specimen',
    scenario: 'Monty Bella takeaway restaurant ordering & database design',
    filename: 'R05001_IT_in_the_Digital_World_Level_12_Specimen_d821d165.pdf',
    pages: 13,
    defaultMarks: 70,
    defaultDurationMinutes: 90,
  },
  {
    id: 'ocr_jan2022',
    title: 'January 2022 Mapped Questions',
    series: 'Jan 2022 Mapped · R050/01',
    year: 2022,
    category: 'mapped',
    scenario: 'Progress Performance & Westwood Catering (with figures)',
    filename: 'R05001_IT_in_the_Digital_World_Level_12_January_2022_mapped_questions_b3115deb.pdf',
    pages: 15,
    defaultMarks: 55,
    defaultDurationMinutes: 70,
  },
  {
    id: 'ocr_jun2022',
    title: 'June 2022 Mapped Questions',
    series: 'June 2022 Mapped · R050/01',
    year: 2022,
    category: 'mapped',
    scenario: 'Progress Talent Show & Ski Trip spreadsheet scenario',
    filename: 'R05001_IT_in_the_Digital_World_Level_12_June_2022_mapped_questions_25007a7e.pdf',
    pages: 6,
    defaultMarks: 29,
    defaultDurationMinutes: 40,
  },
];

const OFFICIAL_PAPER_MAP = new Map<string, OfficialPaperMeta>(
  OFFICIAL_OCR_PAPERS.map((p) => [p.id, p])
);

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      'Gemini API key is not configured yet. Please select or attach your Gemini API key in Settings > Secrets to enable AI Examiner marking and PDF mark scheme parsing.'
    );
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' },
    },
  });
}

function getSafePdfPath(meta: OfficialPaperMeta): string {
  const resolved = path.resolve(PDF_ASSETS_DIR, meta.filename);
  const boundary = PDF_ASSETS_DIR.endsWith(path.sep) ? PDF_ASSETS_DIR : `${PDF_ASSETS_DIR}${path.sep}`;
  if (!resolved.startsWith(boundary)) {
    throw new Error('Invalid asset path.');
  }
  return resolved;
}

function getSafePrebuiltPaperPath(paperId: string): string {
  if (!/^[a-z0-9_-]{3,40}$/i.test(paperId)) {
    throw new Error('Invalid paper identifier.');
  }
  const resolved = path.resolve(PREBUILT_PAPERS_DIR, `${paperId}.json`);
  const boundary = PREBUILT_PAPERS_DIR.endsWith(path.sep) ? PREBUILT_PAPERS_DIR : `${PREBUILT_PAPERS_DIR}${path.sep}`;
  if (!resolved.startsWith(boundary)) {
    throw new Error('Invalid prebuilt paper path.');
  }
  return resolved;
}

function getSafeCachePath(paperId: string, suffix: string): string {
  if (!/^[a-z0-9_-]{3,40}$/i.test(paperId)) {
    throw new Error('Invalid paper identifier.');
  }
  const resolved = path.resolve(CACHE_DIR, `${paperId}${suffix}`);
  const boundary = CACHE_DIR.endsWith(path.sep) ? CACHE_DIR : `${CACHE_DIR}${path.sep}`;
  if (!resolved.startsWith(boundary)) {
    throw new Error('Invalid cache path.');
  }
  return resolved;
}

async function loadBundledPaperData(paperId: string): Promise<ParsedPaperPayload | null> {
  const cached = await readJsonFile<ParsedPaperPayload>(getSafeCachePath(paperId, '.parsed.json'));
  if (cached && Array.isArray(cached.questions) && cached.questions.length > 0) {
    return cached;
  }
  const prebuilt = await readJsonFile<ParsedPaperPayload>(getSafePrebuiltPaperPath(paperId));
  if (prebuilt && Array.isArray(prebuilt.questions) && prebuilt.questions.length > 0) {
    return prebuilt;
  }
  return null;
}

function validateBase64Pdf(rawBase64: unknown): { ok: true; cleanBase64: string } | { ok: false; error: string } {
  if (typeof rawBase64 !== 'string' || !rawBase64.trim()) {
    return { ok: false, error: 'Missing PDF file payload.' };
  }
  const stripped = rawBase64.replace(/^data:application\/pdf;base64,/i, '').trim();
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(stripped)) {
    return { ok: false, error: 'Invalid base64 encoding for PDF file.' };
  }
  const estimatedBytes = Math.floor((stripped.length * 3) / 4);
  if (estimatedBytes > MAX_PDF_BYTES) {
    return { ok: false, error: 'PDF file exceeds the 16 MB upload limit.' };
  }
  const buf = Buffer.from(stripped.slice(0, 64), 'base64');
  const header = buf.toString('ascii', 0, Math.min(buf.length, 5));
  if (header !== '%PDF-') {
    return { ok: false, error: 'Uploaded file is not a valid PDF document.' };
  }
  return { ok: true, cleanBase64: stripped.replace(/\s+/g, '') };
}

function validateDiagramDataUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(raw.trim());
  if (!match) return null;
  const estimatedBytes = Math.floor((match[2].length * 3) / 4);
  if (estimatedBytes > MAX_DIAGRAM_BYTES) return null;
  return raw.trim();
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function normalizeTaCode(raw: unknown): string {
  const str = String(raw || '').toUpperCase().trim();
  if (/^TA[1-6]$/.test(str)) return str;
  const match = str.match(/TA\s*([1-6])/);
  if (match) return `TA${match[1]}`;
  return 'TA1';
}

function normalizeInputType(raw: unknown, marks: number, prompt: string): ParsedQuestion['inputType'] {
  const val = String(raw || '').toLowerCase().trim();
  const allowed: ParsedQuestion['inputType'][] = ['mcq', 'short', 'multi', 'matching', 'table', 'diagram', 'extended'];
  if (allowed.includes(val as ParsedQuestion['inputType'])) {
    return val as ParsedQuestion['inputType'];
  }
  const lower = prompt.toLowerCase();
  if (/(draw|create|sketch|design).*(wireframe|mind map|flowchart|visualisation diagram|visualization diagram)/.test(lower)) {
    return 'diagram';
  }
  if (marks >= 6) return 'extended';
  return 'short';
}

function calculateOcrGrade(score: number, maxMarks: number): { grade: string; pct: number } {
  const pct = maxMarks > 0 ? Math.round((score / maxMarks) * 100) : 0;
  if (pct >= 84) return { grade: 'Level 2 Distinction*', pct };
  if (pct >= 74) return { grade: 'Level 2 Distinction', pct };
  if (pct >= 62) return { grade: 'Level 2 Merit', pct };
  if (pct >= 50) return { grade: 'Level 2 Pass', pct };
  if (pct >= 40) return { grade: 'Level 1 Distinction', pct };
  if (pct >= 30) return { grade: 'Level 1 Merit', pct };
  if (pct >= 20) return { grade: 'Level 1 Pass', pct };
  return { grade: 'Unclassified (U)', pct };
}

const PAPER_EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    totalMarks: { type: Type.INTEGER },
    durationMinutes: { type: Type.INTEGER },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          qNum: { type: Type.STRING, description: 'Exact OCR question number such as 1, 2(a), 12(b)(i)' },
          section: { type: Type.STRING, description: 'Section A or Section B' },
          ta: { type: Type.STRING, description: 'Topic Area code TA1, TA2, TA3, TA4, TA5, or TA6' },
          marks: { type: Type.INTEGER, description: 'Exact marks shown in square brackets e.g. [1], [2], [8]' },
          pageNumber: { type: Type.INTEGER, description: '1-based PDF page number where this question starts' },
          hasFigure: { type: Type.BOOLEAN, description: 'True if the question references a figure, screenshot, diagram, or image in the PDF' },
          figureNote: { type: Type.STRING, description: 'Short note e.g. See Fig. 3 on page 4, or empty string' },
          scenarioContext: { type: Type.STRING, description: 'Scenario or stem text directly relevant to this question (concise, accurate)' },
          prompt: { type: Type.STRING, description: 'The full exact question text students must answer' },
          inputType: {
            type: Type.STRING,
            description: 'One of: mcq, short, multi, matching, table, diagram, extended',
          },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Choices for mcq questions (empty array if not mcq)',
          },
          subFieldLabels: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Labels for multi-item questions like ["Point 1", "Point 2"] or ["Advantage 1", "Advantage 2"] (empty array if not multi)',
          },
          matchingLeft: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Left-column items for Draw-a-line matching questions (empty array if not matching)',
          },
          matchingRight: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Right-column options for Draw-a-line matching questions (empty array if not matching)',
          },
          tableColumns: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Column headers for table-completion questions (empty array if not table)',
          },
          tableRows: {
            type: Type.ARRAY,
            items: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            description: 'Pre-filled cells for each row; use empty string "" for blank cells the student must fill in (empty array if not table)',
          },
          markSchemeHint: {
            type: Type.STRING,
            description: 'Concise OCR R050 examiner guidance describing what earns full marks',
          },
        },
        required: [
          'qNum',
          'section',
          'ta',
          'marks',
          'pageNumber',
          'hasFigure',
          'figureNote',
          'scenarioContext',
          'prompt',
          'inputType',
          'options',
          'subFieldLabels',
          'matchingLeft',
          'matchingRight',
          'tableColumns',
          'tableRows',
          'markSchemeHint',
        ],
      },
    },
  },
  required: ['totalMarks', 'durationMinutes', 'questions'],
};

const MARKSCHEME_MAPPING_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: 'Short title/series of the attached mark scheme PDF' },
    mappings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionId: { type: Type.STRING },
          officialMarkScheme: {
            type: Type.STRING,
            description: 'Complete official OCR mark scheme points, acceptable answers, guidance, and level descriptors for this exact question',
          },
        },
        required: ['questionId', 'officialMarkScheme'],
      },
    },
  },
  required: ['summary', 'mappings'],
};

const SINGLE_GRADE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    marksAwarded: { type: Type.INTEGER },
    maxMarks: { type: Type.INTEGER },
    status: { type: Type.STRING, description: 'full, partial, or zero' },
    band: { type: Type.STRING, description: 'e.g. Full Marks, Partial Credit, Level 3 (7-9), Level 2 (4-6), Level 1 (1-3), No Credit' },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Specific points in the student answer that earned marks',
    },
    missedPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Specific mark-scheme points or expansions missing from the student answer',
    },
    examinerFeedback: {
      type: Type.STRING,
      description: 'Concise, constructive OCR examiner explanation justifying the exact mark awarded',
    },
    modelAnswer: {
      type: Type.STRING,
      description: 'A clear, concise full-mark exemplar answer written to OCR R050 standards',
    },
  },
  required: ['marksAwarded', 'maxMarks', 'status', 'band', 'strengths', 'missedPoints', 'examinerFeedback', 'modelAnswer'],
};

const BATCH_GRADE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionId: { type: Type.STRING },
          marksAwarded: { type: Type.INTEGER },
          maxMarks: { type: Type.INTEGER },
          status: { type: Type.STRING },
          band: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          missedPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          examinerFeedback: { type: Type.STRING },
          modelAnswer: { type: Type.STRING },
        },
        required: ['questionId', 'marksAwarded', 'maxMarks', 'status', 'band', 'strengths', 'missedPoints', 'examinerFeedback', 'modelAnswer'],
      },
    },
  },
  required: ['results'],
};

async function extractPaperWithGemini(
  pdfBase64: string,
  meta: { paperId: string; title: string; series: string; pdfUrl: string; defaultMarks: number; defaultDurationMinutes: number }
): Promise<ParsedPaperPayload> {
  const ai = getGeminiClient();

  const extractionPrompt = [
    'You are an expert OCR Cambridge National in IT (J836) Unit R050 exam digitiser.',
    'Extract EVERY single question and individually marked sub-question (e.g. 1, 2, 12(a), 12(b)(i), 12(b)(ii)) from this official OCR R050/01 PDF in exact order.',
    'Rules:',
    '1. Every item in `questions` MUST correspond to an actual marked question part with its exact bracketed marks `[1]`, `[2]`, `[3]`, `[4]`, `[6]`, `[8]`, `[9]`, etc. Do not invent or skip questions.',
    '2. Classify `ta` accurately into TA1 (Design Tools), TA2 (Human Computer Interface), TA3 (Data & Testing), TA4 (Cyber-Security & Legislation), TA5 (Digital Communications), or TA6 (Internet of Everything).',
    '3. Choose the exact `inputType`:',
    '   - `mcq`: Tick one box / circle one option / multiple choice. Populate `options` with every option text.',
    '   - `matching`: Draw a line to link / match terms on left to right. Populate `matchingLeft` and `matchingRight`.',
    '   - `table`: Complete the table (e.g., Data Type + Justification, Test Data tables, IoE Pillars tables). Populate `tableColumns` and `tableRows` (using "" for blank cells the student must fill).',
    '   - `diagram`: Draw / create / sketch a Wireframe, Mind Map, Flowchart, or Visualisation Diagram (typically 6–8 marks).',
    '   - `multi`: Identify/State/Give/Explain two or three distinct items (e.g., "State two...", "Explain two advantages..."). Populate `subFieldLabels` such as ["1.", "2."] or ["Advantage 1", "Advantage 2"].',
    '   - `extended`: Long written Discuss / Evaluate / Explain questions (typically 6–10 marks).',
    '   - `short`: Standard 1–4 mark written or fill-in-the-blank questions.',
    '4. Include any introductory scenario text in `scenarioContext` on the first question of a scenario (and brief context on follow-up sub-questions where needed so students can answer without losing track).',
    '5. Record the accurate 1-based `pageNumber` in the PDF, and set `hasFigure: true` with a clear `figureNote` whenever the question refers to a figure, diagram, screenshot, or table printed in the PDF.',
    '6. Provide a concise, accurate OCR R050 `markSchemeHint` for each question.',
    '7. Sum the marks into `totalMarks`.',
  ].join('\n');

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64,
        },
      },
      { text: extractionPrompt },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: PAPER_EXTRACTION_SCHEMA,
    },
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error('AI returned an empty response while parsing the exam paper.');
  }

  const parsed = JSON.parse(rawText) as {
    totalMarks?: number;
    durationMinutes?: number;
    questions?: Array<Record<string, unknown>>;
  };

  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
  if (rawQuestions.length === 0) {
    throw new Error('No questions could be extracted from the PDF.');
  }

  const questions: ParsedQuestion[] = rawQuestions.map((q, idx) => {
    const qNum = String(q.qNum || `${idx + 1}`).trim();
    const marks = Math.max(1, Math.min(20, Number(q.marks) || 1));
    const prompt = String(q.prompt || '').trim();
    const inputType = normalizeInputType(q.inputType, marks, prompt);

    return {
      id: `q_${idx + 1}_${qNum.replace(/[^a-zA-Z0-9]/g, '') || idx + 1}`,
      qNum,
      section: String(q.section || (idx < 10 ? 'Section A' : 'Section B')).trim(),
      ta: normalizeTaCode(q.ta),
      marks,
      pageNumber: Math.max(1, Number(q.pageNumber) || 1),
      hasFigure: Boolean(q.hasFigure),
      figureNote: String(q.figureNote || '').trim(),
      scenarioContext: String(q.scenarioContext || '').trim(),
      prompt,
      inputType,
      options: Array.isArray(q.options) ? q.options.map((o) => String(o)).filter(Boolean) : [],
      subFieldLabels: Array.isArray(q.subFieldLabels) ? q.subFieldLabels.map((s) => String(s)).filter(Boolean) : [],
      matchingLeft: Array.isArray(q.matchingLeft) ? q.matchingLeft.map((s) => String(s)).filter(Boolean) : [],
      matchingRight: Array.isArray(q.matchingRight) ? q.matchingRight.map((s) => String(s)).filter(Boolean) : [],
      tableColumns: Array.isArray(q.tableColumns) ? q.tableColumns.map((s) => String(s)).filter(Boolean) : [],
      tableRows: Array.isArray(q.tableRows)
        ? q.tableRows
            .filter((row): row is unknown[] => Array.isArray(row))
            .map((row) => row.map((cell) => String(cell ?? '')))
        : [],
      markSchemeHint: String(q.markSchemeHint || '').trim(),
    };
  });

  const computedTotalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  return {
    paperId: meta.paperId,
    title: meta.title,
    series: meta.series,
    totalMarks: computedTotalMarks || parsed.totalMarks || meta.defaultMarks,
    durationMinutes: Number(parsed.durationMinutes) || meta.defaultDurationMinutes,
    pdfUrl: meta.pdfUrl,
    hasOfficialMarkScheme: false,
    parsedAt: new Date().toISOString(),
    questions,
  };
}

async function mapMarkSchemeWithGemini(
  msPdfBase64: string,
  questions: Array<{ id: string; qNum: string; marks: number; prompt: string }>
): Promise<{ summary: string; criteriaByQuestionId: Record<string, string> }> {
  const ai = getGeminiClient();

  const questionIndexText = questions
    .map((q) => `- ID: "${q.id}" | Q${q.qNum} [${q.marks} marks]: ${q.prompt.slice(0, 180)}`)
    .join('\n');

  const promptText = [
    'You are an OCR Cambridge National in IT (J836) R050 Senior Examiner.',
    'Match the official OCR Mark Scheme in the attached PDF to each question listed below.',
    'For every question ID, copy/summarise the exact acceptable answers, marking points, guidance, "do not accept" rules, and Level 1/2/3 band descriptors from the mark scheme PDF.',
    'Questions in this paper:',
    questionIndexText,
  ].join('\n\n');

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: msPdfBase64,
        },
      },
      { text: promptText },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: MARKSCHEME_MAPPING_SCHEMA,
    },
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error('AI returned an empty response while reading the mark scheme PDF.');
  }

  const parsed = JSON.parse(rawText) as {
    summary?: string;
    mappings?: Array<{ questionId?: string; officialMarkScheme?: string }>;
  };

  const criteriaByQuestionId: Record<string, string> = {};
  if (Array.isArray(parsed.mappings)) {
    for (const item of parsed.mappings) {
      if (item.questionId && typeof item.officialMarkScheme === 'string' && item.officialMarkScheme.trim()) {
        criteriaByQuestionId[item.questionId] = item.officialMarkScheme.trim();
      }
    }
  }

  return {
    summary: String(parsed.summary || 'Official OCR Mark Scheme Attached').trim(),
    criteriaByQuestionId,
  };
}

async function gradeSingleQuestionWithGemini(params: {
  paperTitle: string;
  question: ParsedQuestion;
  studentAnswerText: string;
  studentDiagramDataUrl: string | null;
  officialMarkScheme: string;
}) {
  const { paperTitle, question, studentAnswerText, studentDiagramDataUrl, officialMarkScheme } = params;
  const ai = getGeminiClient();
  const hasOfficialMs = Boolean(officialMarkScheme && officialMarkScheme.trim());

  const systemGuidance = [
    `You are a strict, supportive official OCR Cambridge National in IT (J836) Unit R050 Senior Examiner marking "${paperTitle}".`,
    hasOfficialMs
      ? 'You MUST mark strictly against the OFFICIAL OCR MARK SCHEME provided below. Follow its exact point allocation, acceptable answers, and level-of-response descriptors.'
      : 'No official mark scheme PDF has been attached yet for this paper. Mark strictly using official OCR Cambridge National in IT (J836) Unit R050 specification examiner standards, awarding 1 mark per valid point/expansion (or OCR Level 1/2/3 bands for 6–10 mark questions and Content + Layout criteria for 8-mark diagrams).',
    'Never award marks for blank, nonsensical, or completely off-topic answers.',
    'For diagram questions (Wireframe, Mind Map, Flowchart, Visualisation Diagram), carefully inspect the attached student sketch image AND any accompanying notes, checking OCR criteria: Content (relevant scenario elements, labels, annotations, flow/nodes) and Layout/Design Conventions (standard flowchart shapes, clear visual hierarchy, readability).',
    `Question ${question.qNum} (${question.ta}, Max Marks: ${question.marks}, Type: ${question.inputType}):`,
    question.scenarioContext ? `Scenario Context:\n${question.scenarioContext}` : '',
    `Question Prompt:\n${question.prompt}`,
    question.options.length ? `MCQ Options:\n${question.options.join('\n')}` : '',
    question.tableColumns.length ? `Table Columns: ${question.tableColumns.join(' | ')}` : '',
    hasOfficialMs
      ? `OFFICIAL OCR MARK SCHEME:\n${officialMarkScheme}`
      : question.markSchemeHint
      ? `OCR Specification Guidance:\n${question.markSchemeHint}`
      : '',
    `STUDENT'S WRITTEN / STRUCTURED ANSWER:\n${studentAnswerText || '(No written text provided)'}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const contentParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (studentDiagramDataUrl) {
    const match = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(studentDiagramDataUrl);
    if (match) {
      contentParts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2],
        },
      });
    }
  }
  contentParts.push({ text: systemGuidance });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: contentParts,
    config: {
      responseMimeType: 'application/json',
      responseSchema: SINGLE_GRADE_SCHEMA,
    },
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error('AI Examiner returned an empty marking response.');
  }

  const result = JSON.parse(rawText) as {
    marksAwarded?: number;
    maxMarks?: number;
    status?: string;
    band?: string;
    strengths?: string[];
    missedPoints?: string[];
    examinerFeedback?: string;
    modelAnswer?: string;
  };

  const maxMarks = Math.max(1, question.marks);
  const marksAwarded = Math.max(0, Math.min(maxMarks, Math.round(Number(result.marksAwarded) || 0)));
  const status = marksAwarded >= maxMarks ? 'full' : marksAwarded > 0 ? 'partial' : 'zero';

  return {
    questionId: question.id,
    marksAwarded,
    maxMarks,
    status,
    band: String(result.band || (status === 'full' ? 'Full Marks' : status === 'partial' ? 'Partial Credit' : 'No Credit')),
    markedAgainst: hasOfficialMs ? 'official_mark_scheme' : 'ocr_specification',
    strengths: Array.isArray(result.strengths) ? result.strengths.map((s) => String(s)).filter(Boolean) : [],
    missedPoints: Array.isArray(result.missedPoints) ? result.missedPoints.map((s) => String(s)).filter(Boolean) : [],
    examinerFeedback: String(result.examinerFeedback || '').trim(),
    modelAnswer: String(result.modelAnswer || '').trim(),
  };
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '35mb' }));

  // Serve public assets directly (ensures PDFs in /public/assets/aistudio are always accessible)
  app.use('/assets', express.static(path.resolve(PUBLIC_DIR, 'assets')));

  // 1. List the 10 bundled official OCR R050/01 papers + prebuilt/cache/markscheme status
  app.get('/api/official-papers', async (_req: Request, res: Response) => {
    try {
      const papers = await Promise.all(
        OFFICIAL_OCR_PAPERS.map(async (meta) => {
          const parsedData = await loadBundledPaperData(meta.id);
          const msCache = await readJsonFile<{ summary: string; criteriaByQuestionId: Record<string, string> }>(
            getSafeCachePath(meta.id, '.markscheme.json')
          );

          return {
            id: meta.id,
            title: meta.title,
            series: meta.series,
            year: meta.year,
            category: meta.category,
            scenario: meta.scenario,
            pages: meta.pages,
            pdfUrl: `/assets/aistudio/${meta.filename}`,
            isParsed: Boolean(parsedData && parsedData.questions?.length),
            totalMarks: parsedData?.totalMarks || meta.defaultMarks,
            questionCount: parsedData?.questions?.length || 0,
            durationMinutes: parsedData?.durationMinutes || meta.defaultDurationMinutes,
            hasOfficialMarkScheme: Boolean(msCache && Object.keys(msCache.criteriaByQuestionId || {}).length > 0),
            markSchemeSummary: msCache?.summary || '',
          };
        })
      );
      res.json({ papers });
    } catch (err) {
      console.error('Error listing official papers:', err);
      res.status(500).json({ error: 'Unable to list official OCR exam papers.' });
    }
  });

  // Helper to resolve a bundled official OCR paper (prebuilt JSON -> cache -> optional Gemini fallback)
  async function handleGetOrParseOfficialPaper(req: Request, res: Response) {
    try {
      const paperId = String(req.params.paperId || '').trim();
      const meta = OFFICIAL_PAPER_MAP.get(paperId);
      if (!meta) {
        res.status(404).json({ error: 'Official exam paper not found.' });
        return;
      }

      const forceReparse = Boolean(req.body?.forceReparse);
      const parsedCachePath = getSafeCachePath(meta.id, '.parsed.json');
      const msCachePath = getSafeCachePath(meta.id, '.markscheme.json');

      let paper = !forceReparse ? await loadBundledPaperData(meta.id) : null;

      if (!paper) {
        const pdfPath = getSafePdfPath(meta);
        const pdfBuffer = await fs.readFile(pdfPath);
        const pdfBase64 = pdfBuffer.toString('base64');

        paper = await extractPaperWithGemini(pdfBase64, {
          paperId: meta.id,
          title: meta.title,
          series: meta.series,
          pdfUrl: `/assets/aistudio/${meta.filename}`,
          defaultMarks: meta.defaultMarks,
          defaultDurationMinutes: meta.defaultDurationMinutes,
        });

        await writeJsonFile(parsedCachePath, paper);
      }

      // Clone questions array before overlaying any attached official mark scheme
      const payload: ParsedPaperPayload = {
        ...paper,
        paperId: meta.id,
        title: paper.title || meta.title,
        series: paper.series || meta.series,
        pdfUrl: `/assets/aistudio/${meta.filename}`,
        questions: paper.questions.map((q) => ({ ...q })),
      };

      const msCache = await readJsonFile<{ summary: string; criteriaByQuestionId: Record<string, string> }>(msCachePath);
      if (msCache && msCache.criteriaByQuestionId) {
        payload.hasOfficialMarkScheme = Object.keys(msCache.criteriaByQuestionId).length > 0;
        payload.markSchemeSummary = msCache.summary;
        payload.questions = payload.questions.map((q) => ({
          ...q,
          officialMarkScheme: msCache.criteriaByQuestionId[q.id] || q.officialMarkScheme || '',
        }));
      }

      res.json({ paper: payload });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load exam paper.';
      console.error('Error loading official paper:', err);
      res.status(500).json({ error: message });
    }
  }

  // 2. Retrieve or parse structured questions for a bundled official OCR PDF
  app.get('/api/official-papers/:paperId', handleGetOrParseOfficialPaper);
  app.post('/api/official-papers/:paperId/parse', handleGetOrParseOfficialPaper);

  // 3. Upload a custom Question Paper PDF + optional Mark Scheme PDF
  app.post('/api/official-papers/import', async (req: Request, res: Response) => {
    try {
      const title = String(req.body?.title || '').trim().slice(0, 120);
      const series = String(req.body?.series || 'Uploaded Exam Paper').trim().slice(0, 80);
      if (!title) {
        res.status(400).json({ error: 'Please provide a paper title.' });
        return;
      }

      const qpCheck = validateBase64Pdf(req.body?.questionPaperBase64);
      if (!qpCheck.ok) {
        res.status(400).json({ error: qpCheck.error });
        return;
      }

      let msBase64: string | null = null;
      if (req.body?.markSchemeBase64) {
        const msCheck = validateBase64Pdf(req.body.markSchemeBase64);
        if (!msCheck.ok) {
          res.status(400).json({ error: `Mark scheme PDF error: ${msCheck.error}` });
          return;
        }
        msBase64 = msCheck.cleanBase64;
      }

      const customId = `custom_${Date.now()}`;
      const paper = await extractPaperWithGemini(qpCheck.cleanBase64, {
        paperId: customId,
        title,
        series,
        pdfUrl: '',
        defaultMarks: 70,
        defaultDurationMinutes: 90,
      });

      if (msBase64) {
        const msResult = await mapMarkSchemeWithGemini(
          msBase64,
          paper.questions.map((q) => ({ id: q.id, qNum: q.qNum, marks: q.marks, prompt: q.prompt }))
        );
        paper.hasOfficialMarkScheme = Object.keys(msResult.criteriaByQuestionId).length > 0;
        paper.markSchemeSummary = msResult.summary;
        paper.questions = paper.questions.map((q) => ({
          ...q,
          officialMarkScheme: msResult.criteriaByQuestionId[q.id] || '',
        }));
      }

      res.json({ paper });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to import custom exam paper.';
      console.error('Error importing custom paper:', err);
      res.status(500).json({ error: message });
    }
  });

  // 4. Attach an Official OCR Mark Scheme PDF to any bundled or custom paper
  app.post('/api/official-papers/attach-markscheme', async (req: Request, res: Response) => {
    try {
      const paperId = String(req.body?.paperId || '').trim();
      const msCheck = validateBase64Pdf(req.body?.markSchemeBase64);
      if (!msCheck.ok) {
        res.status(400).json({ error: msCheck.error });
        return;
      }

      let questionsInput: Array<{ id: string; qNum: string; marks: number; prompt: string }> = [];
      if (Array.isArray(req.body?.questions) && req.body.questions.length > 0) {
        questionsInput = req.body.questions.slice(0, 80).map((q: Record<string, unknown>, i: number) => ({
          id: String(q.id || `q_${i + 1}`),
          qNum: String(q.qNum || `${i + 1}`),
          marks: Math.max(1, Number(q.marks) || 1),
          prompt: String(q.prompt || '').slice(0, 500),
        }));
      } else if (OFFICIAL_PAPER_MAP.has(paperId)) {
        const loaded = await loadBundledPaperData(paperId);
        if (loaded?.questions?.length) {
          questionsInput = loaded.questions.map((q) => ({
            id: q.id,
            qNum: q.qNum,
            marks: q.marks,
            prompt: q.prompt,
          }));
        }
      }

      if (questionsInput.length === 0) {
        res.status(400).json({ error: 'Please open the paper first so its questions are extracted before attaching the mark scheme.' });
        return;
      }

      const mapped = await mapMarkSchemeWithGemini(msCheck.cleanBase64, questionsInput);

      // Persist mark scheme cache for bundled official papers
      if (OFFICIAL_PAPER_MAP.has(paperId)) {
        await writeJsonFile(getSafeCachePath(paperId, '.markscheme.json'), mapped);
      }

      res.json({
        summary: mapped.summary,
        matchedCount: Object.keys(mapped.criteriaByQuestionId).length,
        criteriaByQuestionId: mapped.criteriaByQuestionId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process mark scheme PDF.';
      console.error('Error attaching mark scheme:', err);
      res.status(500).json({ error: message });
    }
  });

  // 5. AI Examiner: Grade a single question (supports text, tables, matching, AND drawn diagram PNGs)
  app.post('/api/ai/grade-question', async (req: Request, res: Response) => {
    try {
      const paperTitle = String(req.body?.paperTitle || 'OCR Unit R050 Exam Paper').trim().slice(0, 140);
      const q = req.body?.question as ParsedQuestion | undefined;
      if (!q || typeof q.prompt !== 'string' || !q.prompt.trim()) {
        res.status(400).json({ error: 'Invalid question data.' });
        return;
      }

      const studentAnswerText = String(req.body?.studentAnswerText || '').trim().slice(0, 12000);
      const studentDiagramDataUrl = validateDiagramDataUrl(req.body?.studentDiagramDataUrl);
      const officialMarkScheme = String(req.body?.officialMarkScheme || q.officialMarkScheme || '').trim().slice(0, 8000);

      if (!studentAnswerText && !studentDiagramDataUrl) {
        res.status(400).json({ error: 'Please enter an answer or draw a diagram before asking the AI Examiner to check.' });
        return;
      }

      const normalizedQ: ParsedQuestion = {
        id: String(q.id || 'q1'),
        qNum: String(q.qNum || '1'),
        section: String(q.section || 'Section B'),
        ta: normalizeTaCode(q.ta),
        marks: Math.max(1, Math.min(20, Number(q.marks) || 1)),
        pageNumber: Math.max(1, Number(q.pageNumber) || 1),
        hasFigure: Boolean(q.hasFigure),
        figureNote: String(q.figureNote || ''),
        scenarioContext: String(q.scenarioContext || '').slice(0, 2500),
        prompt: q.prompt.slice(0, 2500),
        inputType: normalizeInputType(q.inputType, Number(q.marks) || 1, q.prompt),
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        subFieldLabels: Array.isArray(q.subFieldLabels) ? q.subFieldLabels.map(String) : [],
        matchingLeft: Array.isArray(q.matchingLeft) ? q.matchingLeft.map(String) : [],
        matchingRight: Array.isArray(q.matchingRight) ? q.matchingRight.map(String) : [],
        tableColumns: Array.isArray(q.tableColumns) ? q.tableColumns.map(String) : [],
        tableRows: [],
        markSchemeHint: String(q.markSchemeHint || '').slice(0, 1500),
        officialMarkScheme,
      };

      const grade = await gradeSingleQuestionWithGemini({
        paperTitle,
        question: normalizedQ,
        studentAnswerText,
        studentDiagramDataUrl,
        officialMarkScheme,
      });

      res.json({ grade });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI Examiner failed to mark this question.';
      console.error('Error grading question:', err);
      res.status(500).json({ error: message });
    }
  });

  // 6. AI Examiner: Grade an entire completed paper
  app.post('/api/ai/grade-paper', async (req: Request, res: Response) => {
    try {
      const paperTitle = String(req.body?.paperTitle || 'OCR Unit R050 Exam Paper').trim().slice(0, 140);
      const items = Array.isArray(req.body?.items) ? (req.body.items as Array<Record<string, unknown>>) : [];
      if (items.length === 0) {
        res.status(400).json({ error: 'No questions submitted for marking.' });
        return;
      }

      const ai = getGeminiClient();
      const gradesByQuestionId: Record<
        string,
        {
          questionId: string;
          marksAwarded: number;
          maxMarks: number;
          status: string;
          band: string;
          markedAgainst: string;
          strengths: string[];
          missedPoints: string[];
          examinerFeedback: string;
          modelAnswer: string;
        }
      > = {};

      const textBatchItems: Array<{
        question: ParsedQuestion;
        studentAnswerText: string;
        officialMarkScheme: string;
      }> = [];
      const diagramItems: Array<{
        question: ParsedQuestion;
        studentAnswerText: string;
        studentDiagramDataUrl: string;
        officialMarkScheme: string;
      }> = [];

      const allQuestions: ParsedQuestion[] = [];

      for (const rawItem of items.slice(0, 80)) {
        const q = rawItem.question as ParsedQuestion | undefined;
        if (!q || !q.id) continue;

        const marks = Math.max(1, Math.min(20, Number(q.marks) || 1));
        const normalizedQ: ParsedQuestion = {
          id: String(q.id),
          qNum: String(q.qNum || '1'),
          section: String(q.section || 'Section B'),
          ta: normalizeTaCode(q.ta),
          marks,
          pageNumber: Math.max(1, Number(q.pageNumber) || 1),
          hasFigure: Boolean(q.hasFigure),
          figureNote: String(q.figureNote || ''),
          scenarioContext: String(q.scenarioContext || '').slice(0, 1200),
          prompt: String(q.prompt || '').slice(0, 1500),
          inputType: normalizeInputType(q.inputType, marks, String(q.prompt || '')),
          options: Array.isArray(q.options) ? q.options.map(String) : [],
          subFieldLabels: [],
          matchingLeft: [],
          matchingRight: [],
          tableColumns: Array.isArray(q.tableColumns) ? q.tableColumns.map(String) : [],
          tableRows: [],
          markSchemeHint: String(q.markSchemeHint || '').slice(0, 1000),
          officialMarkScheme: String(rawItem.officialMarkScheme || q.officialMarkScheme || '').trim().slice(0, 3500),
        };
        allQuestions.push(normalizedQ);

        const studentAnswerText = String(rawItem.studentAnswerText || '').trim().slice(0, 6000);
        const diagramUrl = validateDiagramDataUrl(rawItem.studentDiagramDataUrl);

        if (!studentAnswerText && !diagramUrl) {
          gradesByQuestionId[normalizedQ.id] = {
            questionId: normalizedQ.id,
            marksAwarded: 0,
            maxMarks: marks,
            status: 'zero',
            band: 'Unanswered',
            markedAgainst: normalizedQ.officialMarkScheme ? 'official_mark_scheme' : 'ocr_specification',
            strengths: [],
            missedPoints: ['No answer was submitted for this question.'],
            examinerFeedback: 'This question was left blank (0 marks). Review the model guidance to see what earns full marks.',
            modelAnswer: normalizedQ.officialMarkScheme || normalizedQ.markSchemeHint || 'Review the official OCR R050 specification for this topic.',
          };
          continue;
        }

        if (diagramUrl) {
          diagramItems.push({
            question: normalizedQ,
            studentAnswerText,
            studentDiagramDataUrl: diagramUrl,
            officialMarkScheme: normalizedQ.officialMarkScheme || '',
          });
        } else {
          textBatchItems.push({
            question: normalizedQ,
            studentAnswerText,
            officialMarkScheme: normalizedQ.officialMarkScheme || '',
          });
        }
      }

      // Batch grade text items in chunks of 14 so Gemini keeps high accuracy & avoids output truncation
      const CHUNK_SIZE = 14;
      for (let i = 0; i < textBatchItems.length; i += CHUNK_SIZE) {
        const chunk = textBatchItems.slice(i, i + CHUNK_SIZE);
        const chunkPrompt = [
          `You are a strict, constructive OCR Cambridge National in IT (J836) Unit R050 Senior Examiner marking "${paperTitle}".`,
          'Mark EVERY question below independently. Where an OFFICIAL MARK SCHEME is supplied, mark strictly against it; otherwise mark against OCR R050 specification examiner standards.',
          'Return one entry in `results` for every `questionId` below.',
          '',
          ...chunk.map((entry) =>
            [
              `--- QUESTION ID: ${entry.question.id} | Q${entry.question.qNum} (${entry.question.ta}, Max Marks: ${entry.question.marks}) ---`,
              entry.question.scenarioContext ? `Context: ${entry.question.scenarioContext}` : '',
              `Prompt: ${entry.question.prompt}`,
              entry.officialMarkScheme
                ? `OFFICIAL MARK SCHEME: ${entry.officialMarkScheme}`
                : entry.question.markSchemeHint
                ? `OCR Guidance: ${entry.question.markSchemeHint}`
                : '',
              `STUDENT ANSWER: ${entry.studentAnswerText}`,
            ]
              .filter(Boolean)
              .join('\n')
          ),
        ].join('\n');

        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: [{ text: chunkPrompt }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: BATCH_GRADE_SCHEMA,
          },
        });

        const rawText = response.text;
        if (!rawText) {
          throw new Error('AI Examiner returned an empty batch marking response.');
        }

        const parsed = JSON.parse(rawText) as { results?: Array<Record<string, unknown>> };
        const resultList = Array.isArray(parsed.results) ? parsed.results : [];

        for (const entry of chunk) {
          const matched = resultList.find((r) => String(r.questionId) === entry.question.id);
          const maxMarks = entry.question.marks;
          const marksAwarded = matched
            ? Math.max(0, Math.min(maxMarks, Math.round(Number(matched.marksAwarded) || 0)))
            : 0;
          const status = marksAwarded >= maxMarks ? 'full' : marksAwarded > 0 ? 'partial' : 'zero';

          gradesByQuestionId[entry.question.id] = {
            questionId: entry.question.id,
            marksAwarded,
            maxMarks,
            status,
            band: String(matched?.band || (status === 'full' ? 'Full Marks' : status === 'partial' ? 'Partial Credit' : 'No Credit')),
            markedAgainst: entry.officialMarkScheme ? 'official_mark_scheme' : 'ocr_specification',
            strengths: Array.isArray(matched?.strengths) ? matched.strengths.map(String).filter(Boolean) : [],
            missedPoints: Array.isArray(matched?.missedPoints) ? matched.missedPoints.map(String).filter(Boolean) : [],
            examinerFeedback: String(matched?.examinerFeedback || 'Marked against OCR R050 criteria.').trim(),
            modelAnswer: String(matched?.modelAnswer || entry.officialMarkScheme || entry.question.markSchemeHint || '').trim(),
          };
        }
      }

      // Grade any drawn diagram answers individually with multimodal Vision
      for (const diag of diagramItems) {
        const grade = await gradeSingleQuestionWithGemini({
          paperTitle,
          question: diag.question,
          studentAnswerText: diag.studentAnswerText,
          studentDiagramDataUrl: diag.studentDiagramDataUrl,
          officialMarkScheme: diag.officialMarkScheme,
        });
        gradesByQuestionId[diag.question.id] = grade;
      }

      // Aggregate totals & TA1–TA6 breakdown
      const taBreakdown: Record<string, { earned: number; max: number }> = {
        TA1: { earned: 0, max: 0 },
        TA2: { earned: 0, max: 0 },
        TA3: { earned: 0, max: 0 },
        TA4: { earned: 0, max: 0 },
        TA5: { earned: 0, max: 0 },
        TA6: { earned: 0, max: 0 },
      };

      let totalAwarded = 0;
      let totalMax = 0;
      for (const q of allQuestions) {
        const g = gradesByQuestionId[q.id];
        const earned = g ? g.marksAwarded : 0;
        totalAwarded += earned;
        totalMax += q.marks;
        const taKey = taBreakdown[q.ta] ? q.ta : 'TA1';
        taBreakdown[taKey].earned += earned;
        taBreakdown[taKey].max += q.marks;
      }

      const { grade, pct } = calculateOcrGrade(totalAwarded, totalMax);

      res.json({
        summary: {
          totalAwarded,
          totalMax,
          percentage: pct,
          grade,
          taBreakdown,
        },
        gradesByQuestionId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI Examiner failed to mark the complete paper.';
      console.error('Error batch grading paper:', err);
      res.status(500).json({ error: message });
    }
  });

  if (IS_PROD) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OCR R050 Exam Simulation server listening on http://0.0.0.0:${PORT}`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
