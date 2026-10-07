import { Router } from 'express';
import { z } from 'zod';
import { store } from '../data/store.js';
import { HttpError } from '../lib/httpError.js';
import { requireAuth } from '../middleware/auth.js';
import { APPLICATION_STATUSES, type ApplicationStatus } from '../types.js';

export const applicationsRouter = Router();

const createSchema = z.object({
  jobId: z.string().optional().nullable(),
  company: z.string().trim().min(1, 'Company is required').max(120),
  role: z.string().trim().min(1, 'Role is required').max(120),
  status: z.enum(['saved', 'applied', 'assessment', 'interview', 'offer', 'rejected']).default('saved'),
  appliedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  interviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().max(2000).default(''),
});

const updateSchema = createSchema.partial().extend({
  status: z.enum(['saved', 'applied', 'assessment', 'interview', 'offer', 'rejected']).optional(),
});

/** GET /api/applications — the student's tracked applications */
applicationsRouter.get('/', requireAuth, (req, res) => {
  const apps = store.listApplications(req.userId!);
  const jobs = new Map(store.listJobs().map((j) => [j.id, j]));
  res.json({
    applications: apps.map((a) => ({
      ...a,
      job: a.jobId ? jobs.get(a.jobId) ?? null : null,
    })),
    statuses: APPLICATION_STATUSES,
  });
});

/** POST /api/applications — create (supports saving from a job card) */
applicationsRouter.post('/', requireAuth, (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  const d = parsed.data;
  if (d.jobId && !store.getJob(d.jobId)) throw new HttpError(404, 'Job not found');
  if (d.jobId) {
    const dupes = store.listApplications(req.userId!).filter((a) => a.jobId === d.jobId);
    if (dupes.length) throw new HttpError(409, 'You are already tracking this opportunity');
  }
  const app = store.createApplication({
    userId: req.userId!,
    jobId: d.jobId ?? null,
    company: d.company,
    role: d.role,
    status: d.status as ApplicationStatus,
    appliedDate: d.status === 'saved' ? d.appliedDate ?? null : d.appliedDate ?? today(),
    deadline: d.deadline ?? null,
    interviewDate: d.interviewDate ?? null,
    notes: d.notes ?? '',
  });
  res.status(201).json({ application: app });
});

/** PATCH /api/applications/:id — move through the pipeline / edit details */
applicationsRouter.patch('/:id', requireAuth, (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  const patch = { ...parsed.data } as Record<string, unknown>;
  if (parsed.data.status) patch.status = parsed.data.status;
  const updated = store.updateApplication(String(req.params.id), req.userId!, patch);
  if (!updated) throw new HttpError(404, 'Application not found');
  res.json({ application: updated });
});

/** DELETE /api/applications/:id */
applicationsRouter.delete('/:id', requireAuth, (req, res) => {
  const ok = store.deleteApplication(String(req.params.id), req.userId!);
  if (!ok) throw new HttpError(404, 'Application not found');
  res.json({ ok: true });
});

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
