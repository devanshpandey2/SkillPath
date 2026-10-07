// Shared client-side types mirroring the server API responses.

export type UserRole = 'student' | 'recruiter' | 'admin';
export type RemoteType = 'remote' | 'onsite' | 'hybrid';
export type WorkType = 'internship' | 'job';
export type VerificationStatus = 'verified' | 'needs_review' | 'flagged';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyName?: string | null;
}

export interface SkillEntry {
  name: string;
  level: SkillLevel;
  source: 'manual' | 'resume' | 'ai' | 'derived';
}

export interface ProfileProject {
  title: string;
  description: string;
  techStack: string[];
  link: string;
}

export interface RoleDef {
  id: string;
  title: string;
  aliases: string[];
  coreSkills: string[];
  commonSkills: string[];
  capstone: string;
  blurb: string;
}

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
  remotePref: 'remote' | 'onsite' | 'hybrid' | 'any';
  resumeText: string | null;
  resumeParsed: {
    skills: SkillEntry[];
    certifications: string[];
    projects: ProfileProject[];
    issues: string[];
    rawAnalysis: ResumeAnalysis;
  } | null;
  updatedAt: string;
}

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
  source: 'platform' | 'sample';
  verificationStatus: VerificationStatus;
  verificationSignals: string[];
  verificationReason: string;
  createdAt: string;
}

export interface MatchedSkill {
  name: string;
  label: string;
  level: SkillLevel;
}

export interface JobMatch {
  job: Job;
  score: number;
  breakdown: { requiredCoverage: number; preferredBonus: number; total: number };
  matched: MatchedSkill[];
  missingRequired: string[];
  missingPreferred: string[];
  reasons: string[];
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

export type ApplicationStatus = 'saved' | 'applied' | 'assessment' | 'interview' | 'offer' | 'rejected';

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
  job?: Job | null;
}
