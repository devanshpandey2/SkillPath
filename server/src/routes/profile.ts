import { Router } from 'express';
import { z } from 'zod';
import { store } from '../data/store.js';
import { HttpError } from '../lib/httpError.js';
import { requireAuth } from '../middleware/auth.js';
import { TARGET_ROLES, ROLE_BY_ID } from '../domain/roles.js';

export const profileRouter = Router();

const skillEntrySchema = z.object({
  name: z.string().min(1),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  source: z.enum(['manual', 'resume', 'ai', 'derived']).default('manual'),
});

const projectSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(600).default(''),
  techStack: z.array(z.string().max(40)).max(12).default([]),
  link: z.string().max(200).default(''),
});

const profilePatchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  college: z.string().trim().max(160).optional(),
  degree: z.string().trim().max(80).optional(),
  branch: z.string().trim().max(80).optional(),
  gradYear: z.number().int().min(2000).max(2100).nullable().optional(),
  cgpa: z.number().min(0).max(10).nullable().optional(),
  skills: z.array(skillEntrySchema).max(60).optional(),
  certifications: z.array(z.string().max(120)).max(20).optional(),
  projects: z.array(projectSchema).max(15).optional(),
  github: z.string().trim().max(200).optional(),
  linkedin: z.string().trim().max(200).optional(),
  targetRoleId: z.string().max(60).nullable().optional(),
  preferredLocations: z.array(z.string().max(60)).max(10).optional(),
  remotePref: z.enum(['remote', 'onsite', 'hybrid', 'any']).optional(),
});

/** GET /api/profile — the signed-in student's profile (creates blank one for students). */
profileRouter.get('/', requireAuth, (req, res) => {
  const user = store.getUser(req.userId!);
  if (!user) throw new HttpError(401, 'Session no longer valid');

  if (user.role === 'recruiter') {
    res.json({ profile: null, recruiter: { companyName: user.companyName } });
    return;
  }

  let profile = store.getProfile(req.userId!);
  if (!profile && user.role === 'student') {
    profile = store.saveProfile(req.userId!, { name: user.name });
  }
  res.json({ profile, roles: TARGET_ROLES });
});

/** PATCH /api/profile — partial update with validation */
profileRouter.patch('/', requireAuth, (req, res) => {
  const user = store.getUser(req.userId!);
  if (!user) throw new HttpError(401, 'Session no longer valid');
  if (user.role !== 'student') throw new HttpError(403, 'Only students have a profile');

  const parsed = profilePatchSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  const patch = parsed.data;
  if (patch.targetRoleId != null && !ROLE_BY_ID.has(patch.targetRoleId)) {
    throw new HttpError(400, 'Unknown target role');
  }
  const profile = store.saveProfile(req.userId!, patch as Record<string, unknown>);
  res.json({ profile });
});

/** GET /api/profile/roles — target role catalog */
profileRouter.get('/roles', (_req, res) => {
  res.json({ roles: TARGET_ROLES });
});
