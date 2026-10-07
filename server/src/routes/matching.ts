import { Router } from 'express';
import { z } from 'zod';
import { store } from '../data/store.js';
import { HttpError } from '../lib/httpError.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { scoreJobForStudent, inferTargetRole, type StudentContext } from '../domain/matcher.js';
import { generateRoadmapAi } from '../ai/index.js';
import { resolveRole, TARGET_ROLES } from '../domain/roles.js';
import { canonicalizeSkill, skillLabel } from '../domain/skills.js';

export const matchingRouter = Router();

function requireStudentCtx(userId: string): { ctx: StudentContext; profile: NonNullable<ReturnType<typeof store.getProfile>> } {
  const profile = store.getProfile(userId);
  if (!profile) throw new HttpError(400, 'Complete your student profile first');
  const ctx: StudentContext = {
    skills: profile.skills,
    targetRoleId: profile.targetRoleId,
    preferredLocations: profile.preferredLocations,
    remotePref: profile.remotePref,
    minCgpa: profile.cgpa,
  };
  return { ctx, profile };
}

/**
 * GET /api/matching/jobs?role=&location=&remote=&minStipend=&skills=&maxExp=&minMatch=&workType=&verification=
 * Returns all listings scored for the signed-in student, sorted by match score.
 */
matchingRouter.get('/jobs', requireAuth, (req, res) => {
  const { ctx } = requireStudentCtx(req.userId!);
  const q = req.query as Record<string, string | undefined>;

  let matches = store.listJobs().map((job) => scoreJobForStudent(job, ctx));

  if (q.role) {
    const role = resolveRole(q.role);
    if (role) {
      matches = matches.filter((m) => {
        const requiredKeys = m.job.requiredSkills.map((s) => canonicalizeSkill(s) ?? s.toLowerCase());
        const overlap = role.coreSkills.filter((k) => requiredKeys.includes(k)).length;
        return overlap >= 2;
      });
    }
  }
  if (q.location) {
    const loc = q.location.toLowerCase();
    matches = matches.filter((m) => m.job.location.toLowerCase().includes(loc));
  }
  if (q.remote && ['remote', 'onsite', 'hybrid'].includes(q.remote)) {
    matches = matches.filter((m) => m.job.remote === q.remote);
  }
  if (q.workType && ['internship', 'job'].includes(q.workType)) {
    matches = matches.filter((m) => m.job.workType === q.workType);
  }
  if (q.minStipend && !Number.isNaN(Number(q.minStipend))) {
    const min = Number(q.minStipend);
    matches = matches.filter((m) => (m.job.stipendMax ?? m.job.stipendMin ?? 0) >= min || (m.job.salaryMinLpa ?? 0) > 0);
  }
  if (q.skills) {
    const wanted = q.skills.split(',').map((s) => canonicalizeSkill(s) ?? s.toLowerCase()).filter(Boolean);
    if (wanted.length) {
      matches = matches.filter((m) => {
        const jobKeys = [...m.job.requiredSkills, ...m.job.preferredSkills].map((s) => canonicalizeSkill(s) ?? s.toLowerCase());
        return wanted.every((w) => jobKeys.includes(w));
      });
    }
  }
  if (q.verification && ['verified', 'needs_review', 'flagged'].includes(q.verification)) {
    matches = matches.filter((m) => m.job.verificationStatus === q.verification);
  }
  if (q.minMatch && !Number.isNaN(Number(q.minMatch))) {
    matches = matches.filter((m) => m.score >= Number(q.minMatch));
  }

  matches.sort((a, b) => b.score - a.score);
  res.json({ matches, count: matches.length });
});

/** GET /api/matching/jobs/:id — one job scored for the student, with full explanation */
matchingRouter.get('/jobs/:id', requireAuth, (req, res) => {
  const { ctx } = requireStudentCtx(req.userId!);
  const job = store.getJob(String(req.params.id));
  if (!job) throw new HttpError(404, 'Job not found');
  const match = scoreJobForStudent(job, ctx);
  res.json({ match });
});

/** GET /api/matching/skill-gap — gap vs chosen target role + readiness estimate */
matchingRouter.get('/skill-gap', requireAuth, (req, res) => {
  const { ctx, profile } = requireStudentCtx(req.userId!);
  const roleId = (req.query.role as string | undefined) || profile.targetRoleId || inferTargetRole(profile.skills);
  const role = resolveRole(roleId);

  if (!role) {
    res.json({ role: null, message: 'Set a target role in your profile to see your skill gap.' });
    return;
  }

  const have = new Set(ctx.skills.map((s) => s.name));
  const strongSkills = role.coreSkills.filter((s) => have.has(s));
  const missingSkills = role.coreSkills.filter((s) => !have.has(s));
  const bonusSkills = role.commonSkills.filter((s) => have.has(s));
  const missingBonus = role.commonSkills.filter((s) => !have.has(s));

  const coverage = role.coreSkills.length ? strongSkills.length / role.coreSkills.length : 0;
  const bonusCov = role.commonSkills.length ? bonusSkills.length / role.commonSkills.length : 0;
  const readiness = Math.round(coverage * 80 + bonusCov * 20);

  res.json({
    role: { id: role.id, title: role.title, blurb: role.blurb, capstone: role.capstone },
    readiness,
    strongSkills: strongSkills.map((s) => skillLabel(s)),
    missingSkills: missingSkills.map((s) => skillLabel(s)),
    bonusSkills: bonusSkills.map((s) => skillLabel(s)),
    missingBonus: missingBonus.map((s) => skillLabel(s)),
    disclaimer: 'Readiness is an estimate of skill coverage, not a promise of interview outcomes.',
  });
});

const roadmapSchema = z.object({
  jobId: z.string().optional().nullable(),
  roleId: z.string().optional().nullable(),
});

/** POST /api/matching/roadmap — personalized week-by-week plan */
matchingRouter.post('/roadmap', requireAuth, asyncHandler(async (req, res) => {
  const { ctx, profile } = requireStudentCtx(req.userId!);
  const parsed = roadmapSchema.safeParse(req.body ?? {});
  const jobId = parsed.success ? (parsed.data.jobId ?? null) : null;
  const roleId = parsed.success ? (parsed.data.roleId ?? null) : null;

  let missing: string[] = [];
  let roleTitle = 'your target role';
  let capstone = 'Build a project that demonstrates your target-role skills';

  if (jobId) {
    const job = store.getJob(jobId);
    if (!job) throw new HttpError(404, 'Job not found');
    const match = scoreJobForStudent(job, ctx);
    missing = match.missingRequired;
    roleTitle = job.title;
    capstone = `Build a small project combining ${match.missingRequired.slice(0, 3).join(' + ') || job.requiredSkills[0]}`;
  } else {
    const rid = roleId || profile.targetRoleId || inferTargetRole(profile.skills);
    const role = resolveRole(rid);
    if (!role) {
      // Friendly empty state instead of an error: the UI shows a "set a target role" hint.
      res.json({ roadmap: null, missingSkills: [], message: 'Set a target role in your profile to generate your roadmap.' });
      return;
    }
    const have = new Set(ctx.skills.map((s) => s.name));
    missing = role.coreSkills.filter((s) => !have.has(s));
    roleTitle = role.title;
    capstone = role.capstone;
  }

  const roadmap = await generateRoadmapAi(missing, roleTitle, capstone, jobId);
  res.json({ roadmap, missingSkills: missing.map((s) => skillLabel(s)) });
}));
