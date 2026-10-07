import { z } from 'zod';

export const ROLES = ['student', 'recruiter', 'admin'] as const;
export type UserRole = (typeof ROLES)[number];

export const REMOTE_PREFS = ['remote', 'onsite', 'hybrid', 'any'] as const;
export type RemotePref = (typeof REMOTE_PREFS)[number];

export const REMOTE_TYPES = ['remote', 'onsite', 'hybrid'] as const;
export type RemoteType = (typeof REMOTE_TYPES)[number];

export const WORK_TYPES = ['internship', 'job'] as const;
export type WorkType = (typeof WORK_TYPES)[number];

export const VERIFICATION_STATUSES = ['verified', 'needs_review', 'flagged'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** A single skill with a proficiency label — used for student skills and job requirements. */
export interface SkillEntry {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  source: 'manual' | 'resume' | 'ai' | 'derived';
}

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_SOURCES = ['manual', 'resume', 'ai', 'derived'] as const;
export type SkillSource = (typeof SKILL_SOURCES)[number];

export const SKILL_CATEGORY_LABELS: Record<string, string> = {
  language: 'Programming languages',
  framework: 'Frameworks & libraries',
  database: 'Databases',
  devops: 'Tools & DevOps',
  concept: 'Concepts',
  soft: 'Soft skills',
  other: 'Other',
};

export interface StudentProfile {
  userId: string;
  name: string;
  college: string;
  degree: string;
  branch: string;
  gradYear: number | null;
  cgpa: number | null;
  skills: SkillEntry[];
  certifications: string[];
  projects: ProfileProject[];
  github: string;
  linkedin: string;
  targetRoleId: string | null;
  preferredLocations: string[];
  remotePref: RemotePref;
  resumeText: string | null;
  resumeParsed: ResumeParseResult | null;
  updatedAt: string;
}

export interface ProfileProject {
  title: string;
  description: string;
  techStack: string[];
  link: string;
}

export const TargetRoleSchema = z.object({
  title: z.string().min(2).max(80),
  skills: z.array(z.string()).default([]),
  minCGPA: z.number().min(0).max(10).optional(),
});

export type TargetRole = z.infer<typeof TargetRoleSchema>;

export interface Job {
  id: string;
  title: string;
  company: string;
  companyId: string | null;
  location: string;
  workType: WorkType;
  remote: RemoteType;
  stipendMin: number | null;
  stipendMax: number | null;
  salaryMinLpa: number | null;
  salaryMaxLpa: number | null;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceReq: string;
  minExperienceMonths: number;
  educationReq: string;
  minCGPA: number | null;
  deadline: string | null;
  description: string;
  postedBy: string | null;
  source: 'platform' | 'sample';
  verificationStatus: VerificationStatus;
  verificationSignals: string[];
  verificationReason: string;
  createdAt: string;
}

export interface JobMatch {
  job: Job;
  score: number;
  breakdown: MatchBreakdown;
  matched: MatchedSkill[];
  missingRequired: string[];
  missingPreferred: string[];
  reasons: string[];
}

export interface MatchBreakdown {
  requiredCoverage: number;
  preferredBonus: number;
  total: number;
}

export interface MatchedSkill {
  name: string;
  label: string;
  level: SkillLevel;
}

export interface RoadmapStep {
  week: number;
  skill: string;
  why: string;
  resource: string;
}

export interface Roadmap {
  targetRole: string;
  jobId: string | null;
  weeks: RoadmapStep[];
  capstoneProject: string;
  generatedBy: 'deterministic' | 'llm';
  generatedAt: string;
}

export interface ProjectRecommendation {
  id: string;
  title: string;
  why: string;
  skillsDemonstrated: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedWeeks: number;
  features: string[];
  targetRole: string;
  generatedBy: 'deterministic' | 'llm';
}

export interface ResumeAnalysis {
  atsScore: number;
  sectionsFound: string[];
  sectionsMissing: string[];
  skillsDetected: string[];
  certificationsDetected: string[];
  projectsDetected: string[];
  keywordsMissing: string[];
  issues: string[];
  summary: string;
  generatedBy: 'deterministic' | 'llm';
}

export interface ResumeParseResult {
  skills: SkillEntry[];
  certifications: string[];
  projects: ProfileProject[];
  issues: string[];
  rawAnalysis: ResumeAnalysis;
}

export type ApplicationStatus =
  | 'saved'
  | 'applied'
  | 'assessment'
  | 'interview'
  | 'offer'
  | 'rejected';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'saved',
  'applied',
  'assessment',
  'interview',
  'offer',
  'rejected',
];

export interface Application {
  id: string;
  userId: string;
  jobId: string | null;
  company: string;
  role: string;
  status: ApplicationStatus;
  appliedDate: string | null;
  deadline: string | null;
  interviewDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
