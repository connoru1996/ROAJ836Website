import express from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const PREBUILT_PAPERS_DIR = path.resolve(__dirname, 'data', 'official-papers');

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
}

interface ParsedPaperPayload {
  paperId: string;
  title: string;
  series: string;
  totalMarks: number;
  durationMinutes: number;
  pdfUrl: string;
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

function getSafePrebuiltPaperPath(paperId: string): string {
  if (!/^[a-z0-9_-]{3,40}$/i.test(paperId)) {
    throw new Error('Invalid paper identifier.');
  }
  const resolved = path.resolve(PREBUILT_PAPERS_DIR, `${paperId}.json`);
  const boundary = PREBUILT_PAPERS_DIR.endsWith(path.sep)
    ? PREBUILT_PAPERS_DIR
    : `${PREBUILT_PAPERS_DIR}${path.sep}`;
  if (!resolved.startsWith(boundary)) {
    throw new Error('Invalid prebuilt paper path.');
  }
  return resolved;
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Serve public assets directly (ensures PDFs in /public/assets/aistudio are always accessible)
  app.use(
    '/assets',
    express.static(path.resolve(PUBLIC_DIR, 'assets'), {
      setHeaders: (res, filePath) => {
        if (filePath.toLowerCase().endsWith('.pdf')) {
          res.setHeader('Content-Disposition', 'inline');
          res.setHeader('Content-Type', 'application/pdf');
        }
      },
    })
  );

  // 1. List the 10 bundled official OCR R050/01 papers
  app.get('/api/official-papers', async (_req: Request, res: Response) => {
    try {
      const papers = await Promise.all(
        OFFICIAL_OCR_PAPERS.map(async (meta) => {
          const parsedData = await readJsonFile<ParsedPaperPayload>(getSafePrebuiltPaperPath(meta.id));
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
          };
        })
      );
      res.json({ papers });
    } catch (err) {
      console.error('Error listing official papers:', err);
      res.status(500).json({ error: 'Unable to list official OCR exam papers.' });
    }
  });

  // 2. Retrieve structured questions for any of the 10 official OCR papers
  async function handleGetOfficialPaper(req: Request, res: Response) {
    try {
      const paperId = String(req.params.paperId || '').trim();
      const meta = OFFICIAL_PAPER_MAP.get(paperId);
      if (!meta) {
        res.status(404).json({ error: 'Official exam paper not found.' });
        return;
      }

      const paper = await readJsonFile<ParsedPaperPayload>(getSafePrebuiltPaperPath(meta.id));
      if (!paper || !Array.isArray(paper.questions) || paper.questions.length === 0) {
        res.status(404).json({ error: 'Structured questions not available for this paper.' });
        return;
      }

      const payload: ParsedPaperPayload = {
        ...paper,
        paperId: meta.id,
        title: paper.title || meta.title,
        series: paper.series || meta.series,
        pdfUrl: `/assets/aistudio/${meta.filename}`,
        questions: paper.questions.map((q) => ({ ...q })),
      };

      res.json({ paper: payload });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load exam paper.';
      console.error('Error loading official paper:', err);
      res.status(500).json({ error: message });
    }
  }

  app.get('/api/official-papers/:paperId', handleGetOfficialPaper);
  app.post('/api/official-papers/:paperId/parse', handleGetOfficialPaper);

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  if (IS_PROD) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OCR R050 Exam Platform running at http://0.0.0.0:${PORT}`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
