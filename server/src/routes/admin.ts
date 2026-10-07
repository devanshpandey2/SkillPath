import { Router } from 'express';
import { z } from 'zod';
import { store } from '../data/store.js';
import { HttpError } from '../lib/httpError.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { verifyListing } from '../domain/verifier.js';

export const adminRouter = Router();

/** GET /api/admin/overview — platform stats for the admin console */
adminRouter.get('/overview', requireAuth, requireRole('admin'), (_req, res) => {
  const jobs = store.listJobs();
  const counts = {
    verified: jobs.filter((j) => j.verificationStatus === 'verified').length,
    needs_review: jobs.filter((j) => j.verificationStatus === 'needs_review').length,
    flagged: jobs.filter((j) => j.verificationStatus === 'flagged').length,
    total: jobs.length,
  };
  res.json({
    jobs: counts,
    verificationBadges: {
      verified: 'Posted by a registered recruiter with concrete pay and a detailed description.',
      needs_review: 'Automated checks could not confirm all trust signals — under human review.',
      flagged: 'Automated analysis found several risk signals. This does NOT prove fraud; a human reviewer decides.',
    },
  });
});

const reviewSchema = z.object({
  status: z.enum(['verified', 'needs_review', 'flagged']),
  reason: z.string().max(500).optional(),
});

/** GET /api/admin/jobs?status= — listings queue for review */
adminRouter.get('/jobs', requireAuth, requireRole('admin'), (req, res) => {
  const status = req.query.status as string | undefined;
  let jobs = store.listJobs();
  if (status && ['verified', 'needs_review', 'flagged'].includes(status)) {
    jobs = jobs.filter((j) => j.verificationStatus === status);
  }
  res.json({ jobs });
});

/** POST /api/admin/jobs/:id/review — human verification decision */
adminRouter.post('/jobs/:id/review', requireAuth, requireRole('admin'), (req, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'Invalid review payload');
  const updated = store.updateJobVerification(String(req.params.id), parsed.data.status, parsed.data.reason);
  if (!updated) throw new HttpError(404, 'Job not found');
  res.json({ job: updated });
});

/** POST /api/admin/jobs/:id/rescan — re-run automated verification */
adminRouter.post('/jobs/:id/rescan', requireAuth, requireRole('admin'), (req, res) => {
  const job = store.getJob(String(req.params.id));
  if (!job) throw new HttpError(404, 'Job not found');
  const v = verifyListing(job);
  const updated = store.updateJobVerification(job.id, v.status, v.reason);
  updated!.verificationSignals = v.signals;
  res.json({ job: updated, verification: v });
});
