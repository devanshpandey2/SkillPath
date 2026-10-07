export interface ProjectIdea {
  id: string;
  title: string;
  roleIds: string[];
  teaches: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedWeeks: number;
  features: string[];
  why: string;
}

/**
 * Curated project catalog. The recommendation engine picks ideas that teach
 * the student's missing skills for their target role.
 */
export const PROJECT_CATALOG: ProjectIdea[] = [
  {
    id: 'expense_tracker_ts',
    title: 'TypeScript React Expense Tracker',
    roleIds: ['frontend_dev', 'fullstack_dev'],
    teaches: ['typescript', 'react', 'redux', 'rest_api', 'git'],
    difficulty: 'beginner',
    estimatedWeeks: 2,
    features: [
      'Income/expense entries with categories and monthly budgets',
      'Charts for spending breakdown (Recharts)',
      'Type-safe models and API client',
      'Persist to local API or localStorage',
    ],
    why: 'Adds TypeScript on top of React you already know — the single most requested frontend upgrade in Indian job listings.',
  },
  {
    id: 'ecommerce_fullstack',
    title: 'Full-Stack E-Commerce App',
    roleIds: ['fullstack_dev', 'backend_dev', 'frontend_dev'],
    teaches: ['nodejs', 'express', 'sql', 'react', 'rest_api', 'auth', 'docker'],
    difficulty: 'advanced',
    estimatedWeeks: 5,
    features: [
      'Product catalog with search, filters and pagination',
      'Cart + checkout flow with a payments sandbox (Razorpay test mode)',
      'JWT auth with roles (customer/admin)',
      'Admin dashboard for inventory',
      'Dockerized API + deployed frontend',
    ],
    why: 'End-to-end proof you can build and ship a real product — the classic "show, don\'t tell" full-stack portfolio piece.',
  },
  {
    id: 'url_shortener_api',
    title: 'URL Shortener + Rate-Limited API',
    roleIds: ['backend_dev', 'fullstack_dev'],
    teaches: ['nodejs', 'express', 'sql', 'testing', 'docker', 'rest_api'],
    difficulty: 'beginner',
    estimatedWeeks: 2,
    features: [
      'Shorten URLs with custom aliases and expiry',
      'Click analytics endpoint',
      'Rate limiting and input validation',
      'Jest/Supertest integration tests',
      'Dockerfile + docker-compose with Postgres',
    ],
    why: 'Small enough to finish in two weeks, yet demonstrates APIs, databases, testing and deployment — exactly what backend interviews probe.',
  },
  {
    id: 'sales_dashboard_sql',
    title: 'Sales Analytics Dashboard (SQL + Python + BI)',
    roleIds: ['data_analyst', 'ml_engineer'],
    teaches: ['sql', 'python', 'pandas', 'powerbi', 'statistics'],
    difficulty: 'intermediate',
    estimatedWeeks: 3,
    features: [
      'Star-schema warehouse for retail orders data',
      'SQL queries for revenue, retention and cohort analysis',
      'Python cleaning pipeline with pandas',
      'Interactive Power BI / Streamlit dashboard',
    ],
    why: 'Analyst hiring tests are 80% SQL and business framing — this project gives you both, plus a dashboard to show.',
  },
  {
    id: 'recommender_service',
    title: 'Movie Recommender as a REST Microservice',
    roleIds: ['ml_engineer', 'backend_dev'],
    teaches: ['python', 'ml', 'pandas', 'rest_api', 'docker'],
    difficulty: 'advanced',
    estimatedWeeks: 4,
    features: [
      'Content-based + collaborative filtering models',
      'Offline evaluation (precision@k)',
      'FastAPI/Flask serving endpoint',
      'Dockerized and deployed',
    ],
    why: 'Goes beyond notebooks — shows you can productionize a model, which separates ML-engineer candidates from course-completers.',
  },
  {
    id: 'habit_tracker_flutter',
    title: 'Cross-Platform Habit Tracker (Flutter)',
    roleIds: ['mobile_dev'],
    teaches: ['flutter', 'dart', 'firebase', 'ui_ux'],
    difficulty: 'intermediate',
    estimatedWeeks: 3,
    features: [
      'Habit streaks, reminders and widgets',
      'Offline-first with Firebase sync',
      'Light/dark theme, clean state management',
      'Signed release build for Play Store',
    ],
    why: 'A polished shipped app beats ten tutorials — recruiters install it in one tap.',
  },
  {
    id: 'cicd_pipeline',
    title: 'CI/CD Pipeline with Monitoring',
    roleIds: ['devops_engineer', 'backend_dev'],
    teaches: ['ci_cd', 'docker', 'linux', 'aws', 'system_design'],
    difficulty: 'intermediate',
    estimatedWeeks: 3,
    features: [
      'GitHub Actions: lint, test, build, deploy on merge',
      'Dockerized app on an EC2/VM with Nginx reverse proxy',
      'Uptime + log monitoring with alerts',
      'Rollback script',
    ],
    why: 'DevOps interviews are about what you automated — a visible pipeline with monitoring is your proof.',
  },
  {
    id: 'test_automation_suite',
    title: 'Automated Test Suite for a Web App',
    roleIds: ['qa_engineer', 'frontend_dev'],
    teaches: ['testing', 'rest_api', 'ci_cd', 'javascript'],
    difficulty: 'intermediate',
    estimatedWeeks: 2,
    features: [
      'Unit tests (Jest), API tests (Supertest), E2E (Playwright)',
      'Page-object model structure',
      'Runs in CI with reports',
      'Bug reports with reproduction steps',
    ],
    why: 'SDET roles test your testing — a real suite in CI is the strongest signal you can send.',
  },
  {
    id: 'portfolio_site',
    title: 'Personal Portfolio + Blog',
    roleIds: ['frontend_dev', 'fullstack_dev'],
    teaches: ['react', 'nextjs', 'tailwind', 'seo', 'git'],
    difficulty: 'beginner',
    estimatedWeeks: 1,
    features: [
      'Projects, skills and resume sections',
      'Markdown blog with syntax highlighting',
      'SEO meta + OG tags, 90+ Lighthouse',
      'Deployed on Vercel/Netlify with custom domain',
    ],
    why: 'One link that shows everything — recruiters spend under a minute per candidate.',
  },
];

export function projectsForRole(roleId: string): ProjectIdea[] {
  return PROJECT_CATALOG.filter((p) => p.roleIds.includes(roleId));
}
