import { Router } from 'express';
import { z } from 'zod';
import { store } from '../data/store.js';
import { HttpError } from '../lib/httpError.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { verifyListing } from '../domain/verifier.js';
import { parseJobDescriptionAi } from '../ai/index.js';

export const jobsRouter = Router();

/**
 * GET /api/jobs?workType=&remote=&location=&verification=&q=
 * Raw listings (no matching) — used for browsing without a student profile.
 */
jobsRouter.get('/', (req, res) => {
  const q = req.query as Record<string, string | undefined>;
  let jobs = store.listJobs();
  if (q.workType && ['internship', 'job'].includes(q.workType)) {
    jobs = jobs.filter((j) => j.workType === q.workType);
  }
  if (q.remote && ['remote', 'onsite', 'hybrid'].includes(q.remote)) {
    jobs = jobs.filter((j) => j.remote === q.remote);
  }
  if (q.verification && ['verified', 'needs_review', 'flagged'].includes(q.verification)) {
    jobs = jobs.filter((j) => j.verificationStatus === q.verification);
  }
  if (q.location) {
    const loc = q.location.toLowerCase();
    jobs = jobs.filter((j) => j.location.toLowerCase().includes(loc));
  }
  if (q.q) {
    const needle = q.q.toLowerCase();
    jobs = jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(needle) ||
        j.company.toLowerCase().includes(needle) ||
        j.requiredSkills.some((s) => s.toLowerCase().includes(needle))
    );
  }
  res.json({ jobs, count: jobs.length });
});

/** GET /api/jobs/mine — jobs posted by the signed-in recruiter (must precede /:id) */
jobsRouter.get('/mine', requireAuth, requireRole('recruiter', 'admin'), (req, res) => {
  const mine = store.listJobs().filter((j) => j.postedBy === req.userId);
  res.json({ jobs: mine });
});

/** GET /api/jobs/:id — single listing with verification details */
jobsRouter.get('/:id', (req, res) => {
  const job = store.getJob(req.params.id);
  if (!job) throw new HttpError(404, 'Job not found');
  res.json({ job });
});

const postJobSchema = z.object({
  title: z.string().trim().min(3).max(120),
  company: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(120),
  workType: z.enum(['internship', 'job']),
  remote: z.enum(['remote', 'onsite', 'hybrid']),
  stipendMin: z.number().min(0).max(500000).nullable().optional(),
  stipendMax: z.number().min(0).max(500000).nullable().optional(),
  salaryMinLpa: z.number().min(0).max(200).nullable().optional(),
  salaryMaxLpa: z.number().min(0).max(200).nullable().optional(),
  requiredSkills: z.array(z.string().max(40)).min(1, 'Add at least one required skill').max(15),
  preferredSkills: z.array(z.string().max(40)).max(15).default([]),
  experienceReq: z.string().max(80).default('Fresher'),
  minExperienceMonths: z.number().int().min(0).max(120).default(0),
  educationReq: z.string().max(160).default('Any graduate'),
  minCGPA: z.number().min(0).max(10).nullable().optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  description: z.string().trim().min(80, 'Description must be at least 80 characters — detailed listings build trust').max(6000),
});

/** POST /api/jobs/parse-description — AI/deterministic parser for pasted JDs (recruiter helper) */
jobsRouter.post('/parse-description', requireAuth, requireRole('recruiter', 'admin'), asyncHandler(async (req, res) => {
  const text = typeof req.body?.text === 'string' ? req.body.text : '';
  if (text.trim().length < 40) throw new HttpError(400, 'Paste a job description (at least 40 characters)');
  const parsed = await parseJobDescriptionAi(text);
  res.json({ parsed });
}));

/** POST /api/jobs — recruiters post an internship/job */
jobsRouter.post('/', requireAuth, requireRole('recruiter', 'admin'), (req, res) => {
  const parsed = postJobSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  const d = parsed.data;
  const job = store.createJob({
    ...d,
    companyId: null,
    postedBy: req.userId!,
    source: 'platform',
  });
  // Auto-verify on creation; admins can re-review from the admin console.
  const v = verifyListing(job);
  const updated = store.updateJobVerification(job.id, v.status, v.reason);
  updated!.verificationSignals = v.signals;
  res.status(201).json({ job: updated ?? job, verification: v });
});
