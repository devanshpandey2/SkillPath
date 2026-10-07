export interface RoleDef {
  id: string;
  title: string;
  aliases: string[];
  /** Skills without which a student would struggle in this role. */
  coreSkills: string[];
  /** Nice-to-haves that strengthen a candidacy. */
  commonSkills: string[];
  capstone: string;
  blurb: string;
}

export const TARGET_ROLES: RoleDef[] = [
  {
    id: 'frontend_dev',
    title: 'Frontend Developer',
    aliases: ['frontend', 'front end', 'ui developer', 'react developer', 'web developer'],
    coreSkills: ['javascript', 'react', 'html', 'css', 'git', 'rest_api'],
    commonSkills: ['typescript', 'tailwind', 'redux', 'testing', 'ui_ux', 'nextjs'],
    capstone: 'Full-featured React + TypeScript expense tracker with charts, auth and API integration',
    blurb: 'Builds the user-facing web experience: components, state, accessibility and performance.',
  },
  {
    id: 'fullstack_dev',
    title: 'Full Stack Developer',
    aliases: ['full stack', 'fullstack', 'mern developer', 'software developer'],
    coreSkills: ['javascript', 'react', 'nodejs', 'express', 'sql', 'rest_api', 'git'],
    commonSkills: ['typescript', 'mongodb', 'docker', 'testing', 'nextjs', 'ci_cd'],
    capstone: 'Full-stack e-commerce application with auth, payments sandbox, admin panel and deployed API',
    blurb: 'Owns features end-to-end: UI, APIs, database schema and deployment.',
  },
  {
    id: 'backend_dev',
    title: 'Backend Developer',
    aliases: ['backend', 'back end', 'api developer', 'node developer'],
    coreSkills: ['nodejs', 'express', 'sql', 'rest_api', 'git'],
    commonSkills: ['typescript', 'mongodb', 'docker', 'testing', 'system_design', 'aws'],
    capstone: 'URL shortener + rate-limited REST API with Postgres, JWT auth, tests and Docker deployment',
    blurb: 'Designs APIs, data models and the server logic behind products.',
  },
  {
    id: 'data_analyst',
    title: 'Data Analyst',
    aliases: ['business analyst', 'bi analyst', 'analytics'],
    coreSkills: ['sql', 'python', 'pandas'],
    commonSkills: ['ml', 'numpy', 'excel', 'statistics', 'powerbi', 'tableau'],
    capstone: 'End-to-end sales analytics dashboard: SQL warehouse, Python cleaning and interactive BI dashboard',
    blurb: 'Turns raw data into dashboards and decisions business teams act on.',
  },
  {
    id: 'ml_engineer',
    title: 'ML Engineer',
    aliases: ['machine learning', 'ml', 'ai engineer', 'data scientist'],
    coreSkills: ['python', 'ml', 'pandas', 'numpy', 'sql'],
    commonSkills: ['docker', 'aws', 'system_design', 'statistics', 'testing'],
    capstone: 'Train, evaluate and deploy a movie recommender as a containerized REST microservice',
    blurb: 'Builds and ships models: features, training, evaluation and serving.',
  },
  {
    id: 'mobile_dev',
    title: 'Mobile App Developer',
    aliases: ['android developer', 'flutter developer', 'app developer'],
    coreSkills: ['flutter', 'dart', 'rest_api', 'git'],
    commonSkills: ['firebase', 'kotlin', 'swift', 'ui_ux', 'testing'],
    capstone: 'Cross-platform habit-tracker app with offline sync, push notifications and Play Store build',
    blurb: 'Ships mobile apps for Android/iOS with smooth, offline-tolerant UX.',
  },
  {
    id: 'devops_engineer',
    title: 'DevOps Engineer',
    aliases: ['sre', 'site reliability', 'cloud engineer'],
    coreSkills: ['linux', 'docker', 'ci_cd', 'git', 'aws'],
    commonSkills: ['python', 'system_design', 'testing', 'terraform', 'kubernetes'],
    capstone: 'CI/CD pipeline that tests, containersizes and deploys an app to a cloud VM with monitoring',
    blurb: 'Automates build, release and infrastructure so teams ship safely and fast.',
  },
  {
    id: 'qa_engineer',
    title: 'QA / Test Engineer',
    aliases: ['quality assurance', 'sdet', 'test engineer'],
    coreSkills: ['testing', 'java', 'sql', 'git'],
    commonSkills: ['python', 'selenium', 'ci_cd', 'rest_api'],
    capstone: 'Automated test suite for a web app: unit, API and end-to-end Selenium tests in CI',
    blurb: 'Protects product quality through automated and exploratory testing.',
  },
];

export const ROLE_BY_ID = new Map(TARGET_ROLES.map((r) => [r.id, r]));

/** Resolve a role id, title or alias (case-insensitive) to a RoleDef. */
export function resolveRole(input: string | null | undefined): RoleDef | null {
  if (!input) return null;
  const q = input.trim().toLowerCase();
  if (!q) return null;
  if (ROLE_BY_ID.has(q)) return ROLE_BY_ID.get(q)!;
  return (
    TARGET_ROLES.find((r) => r.title.toLowerCase() === q) ??
    TARGET_ROLES.find((r) => r.aliases.some((a) => a === q)) ??
    TARGET_ROLES.find((r) => r.title.toLowerCase().includes(q) || q.includes(r.title.toLowerCase())) ??
    null
  );
}
