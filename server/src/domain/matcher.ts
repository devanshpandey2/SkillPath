import type { Job, JobMatch, MatchBreakdown, MatchedSkill, SkillEntry, SkillLevel } from '../types.js';
import { canonicalizeSkill, skillLabel } from './skills.js';
import { TARGET_ROLES } from './roles.js';

// Weights — required-skill coverage dominates; the rest are tie-breakers.
const W_REQUIRED = 60;
const W_PREFERRED = 15;
const W_LOCATION = 12;
const W_EXPERIENCE = 8;
const W_EDUCATION = 5;

export interface StudentContext {
  skills: SkillEntry[];
  targetRoleId: string | null;
  preferredLocations: string[];
  remotePref: 'remote' | 'onsite' | 'hybrid' | 'any';
  minCgpa: number | null;
}

/**
 * Deterministic, explainable match between a student and a job.
 * Score components (max 100):
 *  - required-skill coverage   (60)
 *  - preferred-skill bonus     (15)
 *  - location/remote fit       (12)
 *  - experience fit            (8)
 *  - education/CGPA fit        (5)
 */
export function scoreJobForStudent(job: Job, s: StudentContext): JobMatch {
  const studentKeys = new Set(s.skills.map((k) => k.name));
  const studentLevels = new Map(s.skills.map((k) => [k.name, k.level]));

  const matched: MatchedSkill[] = [];
  const missingRequired: string[] = [];
  const missingPreferred: string[] = [];

  for (const raw of job.requiredSkills) {
    const key = canonicalizeSkill(raw) ?? raw.toLowerCase();
    if (studentKeys.has(key)) {
      matched.push({
        name: key,
        label: skillLabel(key),
        level: studentLevels.get(key) ?? 'beginner',
      });
    } else {
      missingRequired.push(skillLabel(key));
    }
  }

  for (const raw of job.preferredSkills) {
    const key = canonicalizeSkill(raw) ?? raw.toLowerCase();
    if (studentKeys.has(key)) {
      matched.push({
        name: key,
        label: skillLabel(key),
        level: studentLevels.get(key) ?? 'beginner',
      });
    } else {
      missingPreferred.push(skillLabel(key));
    }
  }

  // A listing that requires nothing demonstrates nothing — never rank highly.
  const reqCoverage = job.requiredSkills.length
    ? (job.requiredSkills.length - missingRequired.length) / job.requiredSkills.length
    : 0;
  const prefBonus = job.preferredSkills.length
    ? (job.preferredSkills.length - missingPreferred.length) / job.preferredSkills.length
    : 0;

  // --- Location & remote fit ---
  const locText = s.preferredLocations.map((l) => l.toLowerCase());
  const locationHit = locText.some((l) => job.location.toLowerCase().includes(l));
  let locScore: number;
  if (job.remote === 'remote') {
    locScore = 1;
  } else if (s.remotePref === 'any') {
    locScore = locationHit ? 1 : 0.7;
  } else if (s.remotePref === 'remote') {
    locScore = locationHit ? 1 : job.remote === 'hybrid' ? 0.5 : 0.3;
  } else if (s.remotePref === 'onsite') {
    locScore = locationHit ? 1 : 0.4;
  } else {
    // hybrid preference
    locScore = locationHit ? 1 : job.remote === 'hybrid' ? 0.9 : 0.6;
  }

  // --- Experience fit ---
  let expScore: number;
  const studentMonths = estimateStudentExperience(s.skills);
  if (job.minExperienceMonths === 0) {
    expScore = 1;
  } else {
    expScore = studentMonths >= job.minExperienceMonths
      ? 1
      : Math.max(0.15, studentMonths / job.minExperienceMonths);
  }

  // --- Education / CGPA fit ---
  let eduScore = 1;
  if (job.minCGPA != null) {
    if (s.minCgpa == null) eduScore = 0.5;
    else if (s.minCgpa >= job.minCGPA) eduScore = 1;
    else eduScore = Math.max(0.1, s.minCgpa / job.minCGPA - 0.2);
  }

  const reqPts = Math.round(W_REQUIRED * reqCoverage * 10) / 10;
  const prefPts = Math.round(W_PREFERRED * prefBonus * 10) / 10;
  const locPts = Math.round(W_LOCATION * locScore * 10) / 10;
  const expPts = Math.round(W_EXPERIENCE * expScore * 10) / 10;
  const eduPts = Math.round(W_EDUCATION * eduScore * 10) / 10;

  const breakdown: MatchBreakdown = {
    requiredCoverage: reqPts,
    preferredBonus: prefPts,
    total: Math.min(100, Math.round(reqPts + prefPts + locPts + expPts + eduPts)),
  };

  // --- Explanations ---
  const reasons: string[] = [];
  if (matched.length) {
    const names = matched.slice(0, 3).map((m) => m.label).join(', ');
    reasons.push(
      `You already have ${names}${matched.length > 3 ? ` and ${matched.length - 3} more` : ''} — directly relevant to this role.`
    );
  }
  if (missingRequired.length) {
    reasons.push(`Missing required skills: ${missingRequired.join(', ')}.`);
  }
  if (missingPreferred.length) {
    reasons.push(`Nice to have (optional): ${missingPreferred.join(', ')}.`);
  }
  if (job.remote === 'remote') reasons.push('Remote role — your location does not matter.');
  else if (locationHit) reasons.push(`Location fits — ${job.location} matches your preferences.`);
  if (job.minExperienceMonths === 0) reasons.push('Open to freshers — no prior experience required.');
  if (job.minCGPA != null) {
    reasons.push(
      s.minCgpa != null && s.minCgpa >= job.minCGPA
        ? `Your CGPA meets the ${job.minCGPA} cutoff.`
        : `Listed CGPA cutoff is ${job.minCGPA}.`
    );
  }

  return { job, score: breakdown.total, breakdown, matched, missingRequired, missingPreferred, reasons };
}

function estimateStudentExperience(skills: SkillEntry[]): number {
  // Heuristic: advanced skills imply ~8 months each, intermediate ~4, beginner ~1.
  const perLevel: Record<SkillLevel, number> = { advanced: 8, intermediate: 4, beginner: 1 };
  return Math.min(24, skills.reduce((sum, s) => sum + perLevel[s.level], 0));
}

/** Suggest a target role for a student based on their skills (used when unset). */
export function inferTargetRole(skills: SkillEntry[]): string | null {
  const keys = new Set(skills.map((s) => s.name));
  let best: { id: string; hit: number } | null = null;
  for (const r of TARGET_ROLES) {
    const hit = r.coreSkills.filter((k) => keys.has(k)).length;
    if (!best || hit > best.hit) best = { id: r.id, hit };
  }
  return best && best.hit >= 2 ? best.id : null;
}
