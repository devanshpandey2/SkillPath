import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { store } from '../data/store.js';
import { HttpError } from '../lib/httpError.js';
import { requireAuth } from '../middleware/auth.js';
import { analyzeResume } from '../ai/index.js';
import { skillsFromAnalysis } from '../domain/resume.js';

export const resumeRouter = Router();

// In-memory upload buffer; 2 MB cap is plenty for text resumes.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(txt|md|pdf|docx?)$/i.test(file.originalname) || file.mimetype.startsWith('text/');
    if (!ok) {
      cb(null, false);
      return;
    }
    cb(null, true);
  },
});

const parseText = multer({ storage: multer.memoryStorage() }).none();

/**
 * POST /api/resume/analyze — multipart file OR pasted text.
 * Every error (multer, validation, analysis) is forwarded to the central
 * error middleware — nothing escapes to crash the process.
 */
resumeRouter.post('/analyze', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  parseText(req, res, (multerErr: unknown) => {
    if (multerErr) {
      next(multerErr instanceof HttpError ? multerErr : new HttpError(400, (multerErr as Error)?.message || 'Upload failed'));
      return;
    }
    void handleAnalyze(req, res).catch(next);
  });
});

async function handleAnalyze(req: Request, res: Response): Promise<void> {
  const profile = store.getProfile(req.userId!);
  if (!profile) throw new HttpError(400, 'Complete your profile first');

  let text = (req.body?.text as string | undefined) ?? '';
  let filename = 'pasted text';

  // If multipart with a file field named "resume"
  if (!text && req.is('multipart/form-data')) {
    await new Promise<void>((resolve) => {
      upload.single('resume')(req as never, res as never, () => resolve());
    });
    const f = (req as unknown as { file?: Express.Multer.File }).file;
    if (f) {
      filename = f.originalname;
      text = extractText(f);
    }
  }

  if (!text || text.trim().length < 80) {
    throw new HttpError(400, 'Provide resume text (at least ~80 characters) or upload a .txt/.md file. PDF/DOCX text is extracted best-effort — paste the text for reliable results.');
  }

  const targetRoleId = (req.body?.targetRoleId as string | undefined) || profile.targetRoleId;
  const analysis = await analyzeResume(text, targetRoleId);

  store.saveProfile(req.userId!, {
    resumeText: text.slice(0, 20000),
    resumeParsed: {
      skills: skillsFromAnalysis(analysis),
      certifications: analysis.certificationsDetected,
      projects: analysis.projectsDetected.map((p) => ({ title: p.slice(0, 120), description: p, techStack: [], link: '' })),
      issues: analysis.issues,
      rawAnalysis: analysis,
    },
  });

  res.json({ analysis, filename, targetRoleId: targetRoleId ?? null });
}

/** Best-effort text extraction: plain text works fully; PDF/DOCX yield raw bytes. */
function extractText(f: Express.Multer.File): string {
  const buf = f.buffer;
  const isText = /^text\//.test(f.mimetype) || /\.(txt|md)$/i.test(f.originalname);
  if (isText) return buf.toString('utf-8');
  // PDF/DOCX: crude extraction — readable ASCII runs only. Recommend pasting text.
  const raw = buf.toString('latin1');
  const runs = raw.match(/[\x20-\x7E]{6,}/g) ?? [];
  return runs.join('\n').replace(/\s{3,}/g, '\n');
}
