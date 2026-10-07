import { Router } from 'express';
import { z } from 'zod';
import { store } from '../data/store.js';
import { HttpError } from '../lib/httpError.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { resolveRole } from '../domain/roles.js';
import { PROJECT_CATALOG } from '../domain/projects.js';
import { recommendProjectsAi } from '../ai/index.js';
import { skillLabel } from '../domain/skills.js';

export const projectsRouter = Router();

/** GET /api/projects/recommendations?role=&jobId= — projects targeting the student's gaps */
projectsRouter.get('/recommendations', requireAuth, asyncHandler(async (req, res) => {
  const profile = store.getProfile(req.userId!);
  if (!profile) throw new HttpError(400, 'Complete your student profile first');

  const roleId = (req.query.role as string | undefined) || profile.targetRoleId;
  const role = resolveRole(roleId);
  if (!role) throw new HttpError(400, 'Set a target role to get project recommendations');

  const have = new Set(profile.skills.map((s) => s.name));
  const missingSkills = role.coreSkills.filter((s) => !have.has(s));

  // Blend: AI/catalog projects targeting gaps first, then generic role projects.
  const aiRecs = await recommendProjectsAi(role.id, role.title, missingSkills);
  const catalogExtras = PROJECT_CATALOG.filter(
    (p) => p.roleIds.includes(role.id) && !aiRecs.some((r) => r.title === p.title)
  ).map((p) => ({
    id: p.id,
    title: p.title,
    why: p.why,
    skillsDemonstrated: p.teaches.map((t) => skillLabel(t)),
    difficulty: p.difficulty,
    estimatedWeeks: p.estimatedWeeks,
    features: p.features,
    targetRole: role.title,
    generatedBy: 'deterministic' as const,
  }));

  res.json({
    role: { id: role.id, title: role.title },
    missingSkills: missingSkills.map((s) => skillLabel(s)),
    recommendations: [...aiRecs, ...catalogExtras].slice(0, 6),
  });
}));
