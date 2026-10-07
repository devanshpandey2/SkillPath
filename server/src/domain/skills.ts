// Deterministic skill taxonomy shared by the matching engine, resume parser
// and AI fallbacks. Aliases map free text to canonical skill names.
export interface SkillDef {
  canonical: string;
  label: string;
  aliases: string[];
  category: 'language' | 'framework' | 'database' | 'devops' | 'concept' | 'soft' | 'other';
}

export const SKILL_TAXONOMY: SkillDef[] = [
  // --- Languages ---
  { canonical: 'javascript', label: 'JavaScript', aliases: ['js', 'es6', 'ecmascript'], category: 'language' },
  { canonical: 'typescript', label: 'TypeScript', aliases: ['ts'], category: 'language' },
  { canonical: 'python', label: 'Python', aliases: ['py'], category: 'language' },
  { canonical: 'java', label: 'Java', aliases: ['core java', 'java 8'], category: 'language' },
  { canonical: 'cpp', label: 'C++', aliases: ['c++', 'cpp'], category: 'language' },
  { canonical: 'c', label: 'C', aliases: [], category: 'language' },
  { canonical: 'csharp', label: 'C#', aliases: ['c#', 'csharp', '.net'], category: 'language' },
  { canonical: 'go', label: 'Go', aliases: ['golang'], category: 'language' },
  { canonical: 'sql', label: 'SQL', aliases: ['mysql', 'postgres', 'postgresql'], category: 'database' },
  { canonical: 'html', label: 'HTML', aliases: ['html5'], category: 'language' },
  { canonical: 'css', label: 'CSS', aliases: ['css3'], category: 'language' },

  // --- Frameworks & libraries ---
  { canonical: 'react', label: 'React', aliases: ['reactjs', 'react.js'], category: 'framework' },
  { canonical: 'nextjs', label: 'Next.js', aliases: ['next', 'nextjs'], category: 'framework' },
  { canonical: 'nodejs', label: 'Node.js', aliases: ['node', 'nodejs'], category: 'framework' },
  { canonical: 'express', label: 'Express', aliases: ['expressjs', 'express.js'], category: 'framework' },
  { canonical: 'angular', label: 'Angular', aliases: ['angularjs'], category: 'framework' },
  { canonical: 'vue', label: 'Vue', aliases: ['vuejs', 'vue.js'], category: 'framework' },
  { canonical: 'django', label: 'Django', aliases: [], category: 'framework' },
  { canonical: 'flask', label: 'Flask', aliases: [], category: 'framework' },
  { canonical: 'spring_boot', label: 'Spring Boot', aliases: ['spring', 'springboot'], category: 'framework' },
  { canonical: 'flutter', label: 'Flutter', aliases: [], category: 'framework' },
  { canonical: 'react_native', label: 'React Native', aliases: ['rn'], category: 'framework' },
  { canonical: 'tailwind', label: 'Tailwind CSS', aliases: ['tailwindcss'], category: 'framework' },
  { canonical: 'redux', label: 'Redux', aliases: ['redux toolkit', 'rtk'], category: 'framework' },

  // --- Databases / data ---
  { canonical: 'mongodb', label: 'MongoDB', aliases: ['mongo'], category: 'database' },
  { canonical: 'postgresql', label: 'PostgreSQL', aliases: ['postgres'], category: 'database' },
  { canonical: 'mysql', label: 'MySQL', aliases: [], category: 'database' },
  { canonical: 'firebase', label: 'Firebase', aliases: [], category: 'database' },
  { canonical: 'pandas', label: 'pandas', aliases: [], category: 'database' },
  { canonical: 'numpy', label: 'NumPy', aliases: [], category: 'database' },

  // --- DevOps / tooling ---
  { canonical: 'git', label: 'Git', aliases: ['github', 'version control'], category: 'devops' },
  { canonical: 'docker', label: 'Docker', aliases: ['containers'], category: 'devops' },
  { canonical: 'aws', label: 'AWS', aliases: ['amazon web services', 'ec2', 's3'], category: 'devops' },
  { canonical: 'linux', label: 'Linux', aliases: ['bash', 'shell'], category: 'devops' },
  { canonical: 'ci_cd', label: 'CI/CD', aliases: ['github actions', 'jenkins'], category: 'devops' },
  { canonical: 'rest_api', label: 'REST APIs', aliases: ['rest', 'api development', 'apis'], category: 'concept' },
  { canonical: 'graphql', label: 'GraphQL', aliases: [], category: 'framework' },

  // --- Concepts ---
  { canonical: 'dsa', label: 'Data Structures & Algorithms', aliases: ['dsa', 'algorithms', 'data structures'], category: 'concept' },
  { canonical: 'oops', label: 'OOP', aliases: ['object oriented programming', 'oop'], category: 'concept' },
  { canonical: 'system_design', label: 'System Design', aliases: ['system design', 'hld', 'lld'], category: 'concept' },
  { canonical: 'testing', label: 'Testing', aliases: ['unit testing', 'jest', 'pytest'], category: 'concept' },
  { canonical: 'ml', label: 'Machine Learning', aliases: ['machine learning', 'scikit-learn', 'sklearn'], category: 'concept' },
  { canonical: 'ui_ux', label: 'UI/UX', aliases: ['figma', 'ui design', 'ux'], category: 'concept' },
];

export const SKILL_BY_CANONICAL = new Map(SKILL_TAXONOMY.map((s) => [s.canonical, s]));

const ALIAS_MAP = new Map<string, SkillDef>();
for (const s of SKILL_TAXONOMY) {
  ALIAS_MAP.set(s.canonical.toLowerCase(), s);
  ALIAS_MAP.set(s.label.toLowerCase(), s);
  for (const a of s.aliases) ALIAS_MAP.set(a.toLowerCase(), s);
}

/** Normalize free text to a canonical skill key, or null if unknown. */
export function canonicalizeSkill(raw: string): string | null {
  const k = raw.trim().toLowerCase().replace(/[.\s]+/g, ' ').trim();
  if (!k) return null;
  const direct = ALIAS_MAP.get(k);
  if (direct) return direct.canonical;
  // Last resort: strip filler words like "basics of", "knowledge of"
  const cleaned = k.replace(/^(basics? of|fundamentals? of|knowledge of)\s+/, '');
  return ALIAS_MAP.get(cleaned)?.canonical ?? null;
}

/** Canonical display label for a skill key. */
export function skillLabel(key: string): string {
  return SKILL_BY_CANONICAL.get(key)?.label ?? key;
}

export function skillCategory(key: string): string {
  return SKILL_BY_CANONICAL.get(key)?.category ?? 'other';
}
