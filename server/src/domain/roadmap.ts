import type { Job, Roadmap, RoadmapStep, SkillEntry } from '../types.js';
import { skillLabel } from './skills.js';
import { resolveRole } from './roles.js';

const SKILL_WHY: Record<string, string> = {
  typescript: 'Most frontend/full-stack listings in India now ask for TypeScript; it catches bugs before they ship and makes your React code interview-ready.',
  nodejs: 'The backend half of the MERN stack that dominates Indian startup hiring — without it your React skills cap at UI-only roles.',
  express: 'The minimal framework every Node.js listing expects; it is how you turn code into working APIs.',
  rest_api: 'Almost every company interview includes "build/consume an API" — REST is the shared language of the web.',
  sql: 'SQL appears in more Indian job descriptions than any other single skill, across dev, analyst and even QA roles.',
  mongodb: 'The most common NoSQL database in Indian full-stack (MERN) job listings.',
  git: 'Non-negotiable in every team — your commits and PRs are how your work is evaluated.',
  docker: 'Increasingly required even for internships; it proves you can ship beyond your own laptop.',
  python: 'The entry point for data/ML roles and widely used for automation and testing.',
  testing: 'Tested in SDET interviews and expected in quality teams — "it works on my machine" is not a career skill.',
  system_design: 'What separates junior from senior candidates; even internships at product companies ask basics.',
  aws: 'The most-mentioned cloud in Indian listings; free tier is enough to learn.',
  ci_cd: 'Shows you understand how code reaches production, not just how to write it.',
  ml: 'Core for ML/data-science internships; projects matter more than certificates here.',
  pandas: 'The workhorse of any data role — cleaning, joining and summarizing data.',
  ui_ux: 'Frontend interviews increasingly probe design sense: spacing, hierarchy and usability.',
  flutter: 'Cross-platform apps are the fastest way for students to ship something installable.',
  firebase: 'Instant backend for student apps — auth, storage and sync without a server.',
  redux: 'Asked in mid-tier React interviews; demonstrates you can manage complex app state.',
  tailwind: 'Speeds up UI work and is frequently listed as a preferred skill in frontend roles.',
  dsa: 'The gateway filter in most Indian hiring processes — clearing DSA rounds is often the main hurdle.',
  oops: 'Asked in service-company and campus interviews; the foundation of Java/C# codebases.',
  java: 'Dominant in service companies (TCS, Infosys) and Android — broadest fresher hiring volume.',
  cpp: 'The language of choice for DSA-heavy interviews and performance-critical roles.',
  graphql: 'Preferred at product startups as an alternative to REST; good differentiator.',
  aws_lambda: 'Serverless is a growing niche — a differentiator for backend/DevOps roles.',
  statistics: 'Data/ML interviews test whether you understand the math behind your models.',
  powerbi: 'The most common BI tool requirement in Indian analyst job posts.',
  tableau: 'Frequently paired with Power BI in analyst descriptions.',
  linux: 'Servers are Linux — basics are expected in backend, DevOps and QA roles.',
};

function whyFor(skillKey: string, roleTitle: string): string {
  return (
    SKILL_WHY[skillKey] ??
    `${skillLabel(skillKey)} appears frequently in ${roleTitle} requirements — adding it removes a common screening filter.`
  );
}

const SKILL_WEEKS: Record<string, number> = {
  typescript: 1.5,
  nodejs: 2,
  express: 1,
  sql: 2,
  mongodb: 1,
  git: 0.5,
  docker: 1.5,
  python: 2,
  rest_api: 1,
  testing: 1.5,
  system_design: 2,
  aws: 2,
  ml: 4,
  dsa: 6,
};

function weeksFor(skillKey: string): number {
  return SKILL_WEEKS[skillKey] ?? 1;
}

const RESOURCE_HINTS: Record<string, string> = {
  typescript: 'TypeScript Handbook → migrate a small React component to .tsx',
  nodejs: 'Node.js docs + build a tiny Express CRUD API',
  express: 'Express guide → routing, middleware, error handling',
  sql: 'SQLBolt → then practice joins on a real dataset',
  mongodb: 'MongoDB University M001 (free)',
  git: 'Learn Git Branching (interactive)',
  docker: 'Docker "Get Started" → containerize your own API',
  python: 'Python.org tutorial → automate one boring task',
  rest_api: 'Design & document a small API with proper status codes',
  testing: 'Jest docs → write tests for an existing project',
  system_design: 'System Design Primer (GitHub) → design a URL shortener',
  aws: 'AWS free tier → deploy your API on EC2/S3',
  ci_cd: 'GitHub Actions quickstart → auto-deploy a repo',
  ml: 'scikit-learn docs → train a classifier end-to-end',
  pandas: 'Kaggle Learn: Pandas',
  dsa: 'NeetCode 150 / Striver A2Z sheet',
  flutter: 'Flutter codelab → build your first app',
  firebase: 'Firebase console → add auth to an existing app',
};

function resourceFor(skillKey: string): string {
  return RESOURCE_HINTS[skillKey] ?? `Official docs + one small hands-on exercise for ${skillLabel(skillKey)}`;
}

/**
 * Deterministic roadmap: order missing skills by how foundational they are,
 * then chunk them into week-by-week steps, ending with a capstone project.
 */
export function generateRoadmap(
  missingSkills: string[],
  targetRoleTitle: string,
  capstoneProject: string,
  jobId: string | null = null
): Roadmap {
  const priority = ['sql', 'git', 'javascript', 'typescript', 'html', 'css', 'react', 'nodejs', 'express', 'rest_api', 'mongodb', 'sql', 'testing', 'docker', 'aws'];
  const keys = [...new Set(missingSkills.map((s) => canonicalizeKey(s)))];

  const sorted = [...keys].sort((a, b) => {
    const ia = priority.indexOf(a);
    const ib = priority.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const weeks: RoadmapStep[] = [];
  let week = 1;
  for (const key of sorted) {
    const dur = weeksFor(key);
    const span = Math.max(1, Math.round(dur));
    for (let i = 0; i < span; i++) {
      weeks.push({
        week: week++,
        skill: skillLabel(key),
        why: whyFor(key, targetRoleTitle),
        resource: resourceFor(key),
      });
      const last = weeks[weeks.length - 1];
      if (last && i === 0 && span > 1) last.skill = `${skillLabel(key)} (part ${i + 1})`;
    }
    if (weeks.length >= 12) break;
  }

  if (!weeks.length) {
    weeks.push({
      week: 1,
      skill: 'Interview prep & DSA',
      why: `You already cover the core skills for ${targetRoleTitle} — now focus on clearing technical interviews.`,
      resource: 'NeetCode 150 + mock interviews',
    });
  }

  return {
    targetRole: targetRoleTitle,
    jobId,
    weeks,
    capstoneProject: capstoneProject,
    generatedBy: 'deterministic',
    generatedAt: new Date().toISOString(),
  };
}

function canonicalizeKey(raw: string): string {
  // Roadmap input may be a label like "TypeScript" or a canonical key.
  return raw.toLowerCase().startsWith('typescript') ? 'typescript' : raw.toLowerCase().replace(/\s+/g, '_');
}

/** Roadmap for a role the student has chosen (independent of a specific job). */
export function roadmapForRole(roleId: string, studentSkills: SkillEntry[]): Roadmap {
  const role = resolveRole(roleId);
  if (!role) {
    return generateRoadmap([], 'your target role', 'Build a project that demonstrates your target-role skills');
  }
  const have = new Set(studentSkills.map((s) => s.name));
  const missing = role.coreSkills.filter((s) => !have.has(s));
  return generateRoadmap(missing, role.title, role.capstone);
}
