import type {
  Job,
  ProjectRecommendation,
  ResumeAnalysis,
  Roadmap,
  SkillEntry,
} from '../types.js';
import { aiConfigFromEnv, createProvider, type LlmMessage } from './provider.js';
import { analyzeResumeText, skillsFromAnalysis } from '../domain/resume.js';
import { generateRoadmap } from '../domain/roadmap.js';
import { PROJECT_CATALOG } from '../domain/projects.js';
import { canonicalizeSkill, skillLabel, SKILL_TAXONOMY } from '../domain/skills.js';

/**
 * AI service layer. Every LLM call has a deterministic fallback, so the app is
 * fully functional with zero AI configuration. When AI_PROVIDER/AI_API_KEY are
 * set, responses are model-generated; on any error we fall back silently.
 */

let provider: ReturnType<typeof createProvider> | null = null;
let providerName: 'none' | 'deterministic' | string = 'none';

export function initAi(): void {
  const cfg = aiConfigFromEnv();
  if (cfg) {
    try {
      provider = createProvider(cfg);
      providerName = cfg.provider;
      console.log(`[ai] LLM provider enabled: ${cfg.provider} (${cfg.model})`);
    } catch (e) {
      console.warn('[ai] provider init failed, using deterministic engine', e);
      provider = null;
      providerName = 'none';
    }
  } else {
    console.log('[ai] No AI provider configured — using deterministic engine (set AI_PROVIDER + AI_API_KEY to enable)');
  }
}

export function aiStatus() {
  return { enabled: provider !== null, provider: providerName };
}

async function tryLlm(messages: LlmMessage[]): Promise<string | null> {
  if (!provider) return null;
  try {
    return await provider.complete(messages, { temperature: 0.2, maxTokens: 1500 });
  } catch (e) {
    console.warn('[ai] LLM call failed, falling back to deterministic engine:', (e as Error).message);
    return null;
  }
}

// ---------------------------------------------------------------- resume ----

export async function analyzeResume(text: string, targetRoleId: string | null): Promise<ResumeAnalysis> {
  const base = analyzeResumeText(text, targetRoleId);
  const raw = await tryLlm([
    {
      role: 'system',
      content:
        'You are an expert Indian fresher-hiring resume reviewer. Return ONLY compact JSON: ' +
        '{"atsScore":0-100,"summary":"2 sentences","skillsDetected":["..."],"certificationsDetected":["..."],' +
        '"projectsDetected":["..."],"sectionsMissing":["..."],"issues":["actionable issue"],"keywordsMissing":["for the given target role"]}. ' +
        'Never invent skills, companies, dates or experience that are not in the resume text.',
    },
    {
      role: 'user',
      content: `Target role: ${targetRoleId ?? 'unspecified'}\n\nResume text (plain, may be imperfect extraction):\n${text.slice(0, 9000)}`,
    },
  ]);

  if (!raw) return base;
  try {
    const parsed = JSON.parse(extractJson(raw)) as Partial<ResumeAnalysis>;
    return {
      atsScore: clampInt(parsed.atsScore ?? base.atsScore, 0, 100),
      sectionsFound: base.sectionsFound,
      sectionsMissing: arr(parsed.sectionsMissing, base.sectionsMissing),
      skillsDetected: arr(parsed.skillsDetected, base.skillsDetected),
      certificationsDetected: arr(parsed.certificationsDetected, base.certificationsDetected),
      projectsDetected: arr(parsed.projectsDetected, base.projectsDetected),
      keywordsMissing: arr(parsed.keywordsMissing, base.keywordsMissing),
      issues: arr(parsed.issues, base.issues),
      summary: str(parsed.summary, base.summary),
      generatedBy: 'llm',
    };
  } catch {
    return base;
  }
}

// -------------------------------------------------------------- roadmap ----

export async function generateRoadmapAi(
  missingSkills: string[],
  targetRoleTitle: string,
  capstoneProject: string,
  jobId: string | null = null
): Promise<Roadmap> {
  const base = generateRoadmap(missingSkills, targetRoleTitle, capstoneProject, jobId);
  const raw = await tryLlm([
    {
      role: 'system',
      content:
        'You are a pragmatic mentor for Indian engineering students. Return ONLY JSON: ' +
        '{"weeks":[{"week":1,"skill":"...","why":"1-2 sentences on why this matters for the role","resource":"free resource"}],' +
        '"capstoneProject":"..."} — 4 to 8 weeks, ordered from foundational to advanced, ending with a project.',
    },
    {
      role: 'user',
      content: `Target role: ${targetRoleTitle}\nMissing skills: ${missingSkills.join(', ') || 'none — suggest interview prep'}\nSuggested capstone: ${capstoneProject}`,
    },
  ]);

  if (!raw) return base;
  try {
    const parsed = JSON.parse(extractJson(raw)) as { weeks?: Roadmap['weeks']; capstoneProject?: string };
    if (!Array.isArray(parsed.weeks) || parsed.weeks.length === 0) return base;
    const weeks = parsed.weeks.slice(0, 12).map((w, i) => ({
      week: i + 1,
      skill: str(w.skill, `Week ${i + 1}`),
      why: str(w.why, ''),
      resource: str(w.resource, ''),
    }));
    return {
      targetRole: targetRoleTitle,
      jobId,
      weeks,
      capstoneProject: str(parsed.capstoneProject, base.capstoneProject),
      generatedBy: 'llm',
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return base;
  }
}

// -------------------------------------------------------- project recs ----

export async function recommendProjectsAi(
  targetRoleId: string,
  targetRoleTitle: string,
  missingSkills: string[]
): Promise<ProjectRecommendation[]> {
  const role = { title: targetRoleTitle };
  const base: ProjectRecommendation[] = PROJECT_CATALOG.filter((p) =>
    p.teaches.some((t) => missingSkills.includes(t))
  )
    .slice(0, 4)
    .map((p) => ({
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

  const raw = await tryLlm([
    {
      role: 'system',
      content:
        'You suggest portfolio projects for Indian college students. Return ONLY JSON: ' +
        '{"projects":[{"title":"...","why":"1-2 sentences","skillsDemonstrated":["..."],"difficulty":"beginner|intermediate|advanced","estimatedWeeks":1-6,"features":["3-5 concrete features"]}]} — 3 projects max, each must exercise at least one missing skill.',
    },
    {
      role: 'user',
      content: `Target role: ${targetRoleTitle}\nMissing skills: ${missingSkills.join(', ')}`,
    },
  ]);

  if (!raw) return base;
  try {
    const parsed = JSON.parse(extractJson(raw)) as { projects?: Array<Partial<ProjectRecommendation>> };
    if (!Array.isArray(parsed.projects) || parsed.projects.length === 0) return base;
    return parsed.projects.slice(0, 4).map((p, i) => ({
      id: `llm-${i + 1}`,
      title: str(p.title, `Project ${i + 1}`),
      why: str(p.why, ''),
      skillsDemonstrated: arr(p.skillsDemonstrated, []),
      difficulty: (['beginner', 'intermediate', 'advanced'] as const).includes(p.difficulty as 'beginner') ? p.difficulty as 'beginner' : 'intermediate',
      estimatedWeeks: clampInt(p.estimatedWeeks ?? 3, 1, 8),
      features: arr(p.features, []),
      targetRole: role.title,
      generatedBy: 'llm',
    }));
  } catch {
    return base;
  }
}

// ------------------------------------------------------ job parsing ----

export interface ParsedJobRequirements {
  title: string;
  company: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minExperienceMonths: number;
  minCGPA: number | null;
  workType: 'internship' | 'job';
  remote: 'remote' | 'onsite' | 'hybrid';
  stipendMin: number | null;
  stipendMax: number | null;
  salaryMinLpa: number | null;
  salaryMaxLpa: number | null;
  location: string | null;
  deadline: string | null; // YYYY-MM-DD
}

export async function parseJobDescriptionAi(rawText: string): Promise<ParsedJobRequirements> {
  const fallback = parseJobDescriptionDeterministic(rawText);
  const raw = await tryLlm([
    {
      role: 'system',
      content:
        'Extract structured internship/job requirements from raw text for Indian hiring. Return ONLY JSON: ' +
        '{"title":"...","company":"...","requiredSkills":["..."],"preferredSkills":["..."],' +
        '"minExperienceMonths":0,"minCGPA":null,"workType":"internship|job","remote":"remote|onsite|hybrid",' +
        '"stipendMin":null,"stipendMax":null,"salaryMinLpa":null,"salaryMaxLpa":null,"location":"City, State","deadline":"YYYY-MM-DD"}. ' +
        'Use null / empty arrays when not stated. Do not guess skills not mentioned.',
    },
    { role: 'user', content: rawText.slice(0, 8000) },
  ]);

  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(extractJson(raw)) as Partial<ParsedJobRequirements>;
    return {
      title: str(parsed.title, fallback.title),
      company: str(parsed.company, fallback.company),
      requiredSkills: arr(parsed.requiredSkills, fallback.requiredSkills),
      preferredSkills: arr(parsed.preferredSkills, fallback.preferredSkills),
      minExperienceMonths: clampInt(parsed.minExperienceMonths ?? 0, 0, 60),
      minCGPA: typeof parsed.minCGPA === 'number' ? parsed.minCGPA : null,
      workType: parsed.workType === 'job' ? 'job' : 'internship',
      remote: parsed.remote === 'remote' || parsed.remote === 'onsite' ? parsed.remote : 'hybrid',
      stipendMin: numOrNull(parsed.stipendMin) ?? fallback.stipendMin,
      stipendMax: numOrNull(parsed.stipendMax) ?? fallback.stipendMax,
      salaryMinLpa: numOrNull(parsed.salaryMinLpa) ?? fallback.salaryMinLpa,
      salaryMaxLpa: numOrNull(parsed.salaryMaxLpa) ?? fallback.salaryMaxLpa,
      location: str(parsed.location ?? '', '') || fallback.location,
      deadline: str(parsed.deadline ?? '', '') || fallback.deadline,
    };
  } catch {
    return fallback;
  }
}

function parseJobDescriptionDeterministic(rawText: string): ParsedJobRequirements {
  const lower = rawText.toLowerCase();
  const workType: ParsedJobRequirements['workType'] = /\bjob\b|full[- ]?time/.test(lower) && !/intern/i.test(lower) ? 'job' : 'internship';
  const remote = /remote/.test(lower) ? 'remote' : /hybrid/.test(lower) ? 'hybrid' : 'onsite';

  // Word-boundary matching so "javascript" never matches the "java" alias.
  const skills: string[] = [];
  for (const def of SKILL_TAXONOMY) {
    const variants = [def.label.toLowerCase(), ...def.aliases];
    if (variants.some((v) => new RegExp(`(^|[^a-z0-9+#])${escapeRe(v)}([^a-z0-9+#]|$)`, 'i').test(rawText))) {
      skills.push(def.canonical);
    }
  }

  // Pay: LPA/lakh figures → salary fields; plain ₹ figures → monthly stipend.
  const paySentence = rawText.match(/(?:stipend|salary|pay)[^.\n]{0,140}/i)?.[0] ?? '';
  const lpaNums = [...paySentence.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*(?:lpa|lakh)/gi)].map((m) => Number(m[1]!.replace(/,/g, '')));
  const rawNums = [...paySentence.matchAll(/₹?\s?(\d[\d,]*)\s?(k\b)?/gi)].map((m) =>
    m[2] ? Number(m[1]!.replace(/,/g, '')) * 1000 : Number(m[1]!.replace(/,/g, ''))
  );
  const stipendNums = lpaNums.length ? [] : rawNums;

  const CITY_PATTERNS: Array<[RegExp, string]> = [
    [/bengaluru|bangalore/i, 'Bengaluru, Karnataka'],
    [/mumbai/i, 'Mumbai, Maharashtra'],
    [/pune/i, 'Pune, Maharashtra'],
    [/hyderabad/i, 'Hyderabad, Telangana'],
    [/chennai/i, 'Chennai, Tamil Nadu'],
    [/kolkata/i, 'Kolkata, West Bengal'],
    [/delhi|noida|gurgaon|gurugram|\bncr\b/i, 'Delhi NCR'],
    [/ahmedabad/i, 'Ahmedabad, Gujarat'],
    [/remote/i, 'Remote (India)'],
  ];
  const location = CITY_PATTERNS.find(([re]) => re.test(rawText))?.[1] ?? null;

  const isoMatch = rawText.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  const dmyMatch = rawText.match(/\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\b/);
  let deadline: string | null = null;
  if (isoMatch?.[1]) {
    deadline = isoMatch[1];
  } else if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    if (d && m && y) deadline = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const cgpaMatch = lower.match(/(?:cgpa|percentage)[:\s]*(\d(?:\.\d)?)/);
  const expMatch = lower.match(/(\d+)\s*(?:\+)?\s*(?:years?|yrs?|months?)\s+(?:of\s+)?experience/);

  return {
    title: extractTitle(rawText) ?? 'Software Intern',
    company: extractCompany(rawText) ?? 'Unknown Company',
    requiredSkills: [...new Set(skills)].slice(0, 12),
    preferredSkills: [],
    minExperienceMonths: expMatch ? (lower.includes('month') ? Number(expMatch[1]) : Number(expMatch[1]) * 12) : 0,
    minCGPA: cgpaMatch ? Number(cgpaMatch[1]) : null,
    workType,
    remote,
    stipendMin: pick(stipendNums),
    stipendMax: stipendNums.length > 1 ? stipendNums[1]! : pick(stipendNums),
    salaryMinLpa: pick(lpaNums),
    salaryMaxLpa: lpaNums.length > 1 ? lpaNums[1]! : pick(lpaNums),
    location,
    deadline,
  };
}

function extractTitle(text: string): string | null {
  // A run of TitleCase words ending in a role keyword, e.g. "React Native Developer Intern".
  const tc = text.match(/\b([A-Z][A-Za-z0-9+#.]*(?:\s+(?:and|&|\+)?\s*[A-Z][A-Za-z0-9+#.]*){0,4}\s+(?:Intern|Developer|Engineer|Analyst|Associate|Trainee)s?)\b/);
  if (tc?.[1]) return tc[1].trim();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const l of lines.slice(0, 5)) {
    if (/(intern|developer|engineer|analyst|associate|trainee)/i.test(l) && l.length < 80) return l;
  }
  return null;
}

function extractCompany(text: string): string | null {
  const m = text.match(/(?:company|at)\s*[:\-]\s*([A-Z][\w&. ]{1,50})/);
  const g = m?.[1];
  return g ? g.trim() : null;
}

// ------------------------------------------------------------ helpers ----

function extractJson(s: string): string {
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no json');
  return s.slice(start, end + 1);
}

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function pick(nums: number[]): number | null {
  return nums.length > 0 ? nums[0]! : null;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function arr(v: unknown, fallback: string[]): string[] {
  return Array.isArray(v) ? v.map(String).filter(Boolean) : fallback;
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function clampInt(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}
