import type { Job, ResumeAnalysis, SkillEntry } from '../types.js';
import { SKILL_TAXONOMY, canonicalizeSkill, skillLabel } from './skills.js';
import { resolveRole } from './roles.js';

const SECTION_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'Contact', re: /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})|(\+?\d[\d\s-]{9,})/i },
  { name: 'Education', re: /\b(b\.?tech|b\.?e\.?|bca|mca|b\.?sc|m\.?sc|cgpa|sgpa|10th|12th|class x\b|class xii\b|university|college)\b/i },
  { name: 'Skills', re: /\b(skills?|technical skills|technologies|tech stack)\b/i },
  { name: 'Projects', re: /\b(projects?|key projects|academic project)\b/i },
  { name: 'Experience', re: /\b(experience|internship|employment|work history)\b/i },
  { name: 'Certifications', re: /\b(certifi\w*|courses?|licenses?)\b/i },
  { name: 'Achievements', re: /\b(achievement|awards?|hackathon|competition|rank)\b/i },
];

/** Analyze raw resume text without any LLM: sections, skills, ATS-style score. */
export function analyzeResumeText(text: string, targetRoleId: string | null): ResumeAnalysis {
  const lower = text.toLowerCase();
  const issues: string[] = [];

  // --- Sections ---
  const sectionsFound: string[] = [];
  const sectionsMissing: string[] = [];
  for (const s of SECTION_PATTERNS) {
    (s.re.test(lower) ? sectionsFound : sectionsMissing).push(s.name);
  }

  // --- Skills detection ---
  const skillsDetected: string[] = [];
  for (const def of SKILL_TAXONOMY) {
    const variants = [def.canonical, def.label.toLowerCase(), ...def.aliases];
    if (variants.some((v) => new RegExp(`(^|[^a-z0-9+#])${escapeRe(v)}([^a-z0-9+#]|$)`, 'i').test(lower))) {
      skillsDetected.push(def.canonical);
    }
  }

  // --- Certifications ---
  const certMatches = text.match(
    /(?:certified|certifications?(?:\s*in)?|course(?:\s*on)?)\s*[:\-]?\s*([A-Z][A-Za-z0-9+#.,()' -]{3,60})/gi
  ) ?? [];
  const certificationsDetected = [
    ...new Set(certMatches.map((m) => m.replace(/^(certified|certifications?(?:\s*in)?|course(?:\s*on)?)\s*[:\-]?\s*/i, '').trim()).filter(Boolean)),
  ].slice(0, 10);

  // --- Projects ---
  const projectMatches = text.match(/(?:^|\n)\s*(?:[-•*]?\s*)?((?:Built|Developed|Created|Designed|Implemented)[^.]{5,120}\.)/gi) ?? [];
  const projectsDetected = projectMatches.map((m) => m.trim().replace(/\s+/g, ' ')).slice(0, 8);

  // --- Formatting / ATS issues ---
  if (text.length < 700) issues.push('Resume looks very short — aim for at least a solid page of relevant content.');
  if (text.length > 12000) issues.push('Resume is very long; for freshers, 1 page is ideal and 2 pages is the maximum.');
  if (!/@/.test(text)) issues.push('No email address found — recruiters cannot reach you without contact details.');
  if (!/(\+?\d[\d\s-]{9,})/.test(text)) issues.push('No phone number detected.');
  if (/github\.com|linkedin\.com/i.test(text) === false) issues.push('No GitHub/LinkedIn link found — recruiters expect both for tech roles.');
  if (/\t{2,}/.test(text) || /\|\s*\|/.test(text)) issues.push('Heavy tab/pipe layout detected — this often breaks ATS parsing; use simple headings and bullet lists.');
  if (/\b(resume|curriculum vitae|cv)\b/i.test(lower.slice(0, 60))) issues.push('Do not title the document "Resume"/"CV" — use your name as the headline.');

  // --- Target-role keyword gap ---
  const role = resolveRole(targetRoleId);
  const keywordsMissing: string[] = [];
  if (role) {
    for (const sk of [...role.coreSkills, ...role.commonSkills]) {
      if (!skillsDetected.includes(sk)) keywordsMissing.push(skillLabel(sk));
    }
  }

  // --- ATS score (0-100) ---
  let score = 0;
  score += sectionsFound.length * 8;          // up to 64
  score += Math.min(skillsDetected.length, 10) * 2; // up to 20
  score += issues.length === 0 ? 16 : issues.length <= 2 ? 10 : 4;
  score = Math.min(100, score);

  const summary = role
    ? `Detected ${skillsDetected.length} skills. Against your target role (${role.title}), ${skillsDetected.filter((s) => [...role.coreSkills, ...role.commonSkills].includes(s)).length} of ${role.coreSkills.length + role.commonSkills.length} expected keywords appear. ${issues.length} formatting issues flagged.`
    : `Detected ${skillsDetected.length} skills and ${sectionsFound.length}/7 standard sections. ${issues.length} formatting issues flagged. Set a target role for a keyword-gap report.`;

  return {
    atsScore: score,
    sectionsFound,
    sectionsMissing,
    skillsDetected,
    certificationsDetected,
    projectsDetected,
    keywordsMissing,
    issues,
    summary,
    generatedBy: 'deterministic',
  };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Convert analysis to profile-ready skill entries (conservative: only known skills). */
export function skillsFromAnalysis(analysis: ResumeAnalysis): SkillEntry[] {
  return analysis.skillsDetected.map((name) => ({
    name,
    level: 'intermediate' as const,
    source: 'resume' as const,
  }));
}
