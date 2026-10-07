import { Pool } from 'pg';
import type {
  Application,
  ApplicationStatus,
  Job,
  StudentProfile,
  UserRole,
} from '../types.js';

/**
 * Data layer with two interchangeable backends:
 *  - Postgres (production) when DATABASE_URL is set: schema in schema.sql.
 *    Tables are mirrored into memory at boot; reads are synchronous and
 *    mutations write through to Postgres asynchronously. This keeps the whole
 *    app simple while persisting real data.
 *  - In-memory demo store (zero setup) with identical semantics.
 */

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  companyName: string | null;
}

export interface NewJobInput {
  title: string;
  company: string;
  companyId?: string | null;
  postedBy?: string | null;
  location: string;
  workType: Job['workType'];
  remote: Job['remote'];
  stipendMin?: number | null;
  stipendMax?: number | null;
  salaryMinLpa?: number | null;
  salaryMaxLpa?: number | null;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceReq?: string;
  minExperienceMonths?: number;
  educationReq?: string;
  minCGPA?: number | null;
  deadline?: string | null;
  description: string;
  source?: Job['source'];
}

export interface Store {
  // users
  findUserByEmail(email: string): StoredUser | null;
  getUser(id: string): StoredUser | null;
  createUser(input: { name: string; email: string; passwordHash: string; role: UserRole; companyName?: string }): StoredUser;
  // profiles
  getProfile(userId: string): StudentProfile | null;
  saveProfile(userId: string, patch: Partial<StudentProfile>): StudentProfile;
  // jobs
  listJobs(): Job[];
  getJob(id: string): Job | null;
  createJob(input: NewJobInput): Job;
  updateJobVerification(id: string, status: Job['verificationStatus'], reason?: string, signals?: string[]): Job | null;
  // applications
  listApplications(userId: string): Application[];
  createApplication(input: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>): Application;
  updateApplication(id: string, userId: string, patch: Partial<Application>): Application | null;
  deleteApplication(id: string, userId: string): boolean;
}

export function createStore(): Store {
  if (process.env.DATABASE_URL) {
    console.log('[store] Using PostgreSQL (write-through mirror)');
    return new PostgresStore(process.env.DATABASE_URL);
  }
  console.log('[store] DATABASE_URL not set — using in-memory demo store');
  return new MemoryStore();
}

/** App-wide singleton. Call initStore() once at boot before serving requests. */
/** App-wide singleton. */

function blankProfile(userId: string, name = ''): StudentProfile {
  return {
    userId,
    name,
    college: '',
    degree: '',
    branch: '',
    gradYear: null,
    cgpa: null,
    skills: [],
    certifications: [],
    projects: [],
    github: '',
    linkedin: '',
    targetRoleId: null,
    preferredLocations: [],
    remotePref: 'any',
    resumeText: null,
    resumeParsed: null,
    updatedAt: new Date().toISOString(),
  };
}

// ==================================================================
// Memory store
// ==================================================================

class MemoryStore implements Store {
  protected users: StoredUser[] = [];
  protected profiles = new Map<string, StudentProfile>();
  protected jobs: Job[] = [];
  protected applications: Application[] = [];
  protected seq = 1;

  protected nextId(prefix: string): string {
    return `${prefix}_${(this.seq++).toString(36).padStart(4, '0')}`;
  }

  findUserByEmail(email: string): StoredUser | null {
    return this.users.find((u) => u.email === email.toLowerCase()) ?? null;
  }

  getUser(id: string): StoredUser | null {
    return this.users.find((u) => u.id === id) ?? null;
  }

  createUser(input: { name: string; email: string; passwordHash: string; role: UserRole; companyName?: string }): StoredUser {
    const user: StoredUser = {
      id: this.nextId('usr'),
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      role: input.role,
      companyName: input.companyName ?? null,
    };
    this.users.push(user);
    if (input.role === 'student') {
      this.profiles.set(user.id, blankProfile(user.id, input.name));
    }
    return user;
  }

  getProfile(userId: string): StudentProfile | null {
    return this.profiles.get(userId) ?? null;
  }

  saveProfile(userId: string, patch: Partial<StudentProfile>): StudentProfile {
    const existing = this.profiles.get(userId) ?? blankProfile(userId);
    const merged: StudentProfile = { ...existing, ...patch, userId, updatedAt: new Date().toISOString() };
    this.profiles.set(userId, merged);
    return merged;
  }

  listJobs(): Job[] {
    return [...this.jobs];
  }

  getJob(id: string): Job | null {
    return this.jobs.find((j) => j.id === id) ?? null;
  }

  createJob(input: NewJobInput): Job {
    const job: Job = {
      id: this.nextId('job'),
      companyId: input.companyId ?? null,
      postedBy: input.postedBy ?? null,
      title: input.title,
      company: input.company,
      location: input.location,
      workType: input.workType,
      remote: input.remote,
      stipendMin: input.stipendMin ?? null,
      stipendMax: input.stipendMax ?? null,
      salaryMinLpa: input.salaryMinLpa ?? null,
      salaryMaxLpa: input.salaryMaxLpa ?? null,
      requiredSkills: [...input.requiredSkills],
      preferredSkills: [...input.preferredSkills],
      experienceReq: input.experienceReq ?? 'Fresher / 0-1 years',
      minExperienceMonths: input.minExperienceMonths ?? 0,
      educationReq: input.educationReq ?? 'Any graduate',
      minCGPA: input.minCGPA ?? null,
      deadline: input.deadline ?? null,
      description: input.description,
      source: input.source ?? 'platform',
      verificationStatus: 'needs_review',
      verificationSignals: [],
      verificationReason: '',
      createdAt: new Date().toISOString(),
    };
    this.jobs.push(job);
    return job;
  }

  updateJobVerification(id: string, status: Job['verificationStatus'], reason?: string, signals?: string[]): Job | null {
    const job = this.getJob(id);
    if (!job) return null;
    job.verificationStatus = status;
    if (reason !== undefined) job.verificationReason = reason;
    if (signals !== undefined) job.verificationSignals = signals;
    return job;
  }

  listApplications(userId: string): Application[] {
    return this.applications.filter((a) => a.userId === userId);
  }

  createApplication(input: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>): Application {
    const now = new Date().toISOString();
    const app: Application = { ...input, id: this.nextId('app'), createdAt: now, updatedAt: now };
    this.applications.push(app);
    return app;
  }

  updateApplication(id: string, userId: string, patch: Partial<Application>): Application | null {
    const app = this.applications.find((a) => a.id === id && a.userId === userId);
    if (!app) return null;
    Object.assign(app, patch, { updatedAt: new Date().toISOString() });
    return app;
  }

  deleteApplication(id: string, userId: string): boolean {
    const before = this.applications.length;
    this.applications = this.applications.filter((a) => !(a.id === id && a.userId === userId));
    return this.applications.length < before;
  }
}

// ==================================================================
// Postgres store — write-through mirror
// ==================================================================

interface UserRow {
  id: string; name: string; email: string; password_hash: string; role: UserRole; company_name: string | null;
}
interface ProfileRow {
  user_id: string; name: string | null; college: string | null; degree: string | null; branch: string | null;
  grad_year: number | null; cgpa: string | number | null; skills: StudentProfile['skills'] | null;
  certifications: string[] | null; projects: StudentProfile['projects'] | null; github: string | null;
  linkedin: string | null; target_role_id: string | null; preferred_locations: string[] | null;
  remote_pref: StudentProfile['remotePref'] | null; resume_text: string | null;
  resume_parsed: StudentProfile['resumeParsed'] | null; updated_at: Date;
}
interface JobRow {
  id: string; company_id: string | null; posted_by: string | null; title: string; company: string;
  location: string; work_type: Job['workType']; remote: Job['remote']; stipend_min: number | null;
  stipend_max: number | null; salary_min_lpa: string | number | null; salary_max_lpa: string | number | null;
  required_skills: string[]; preferred_skills: string[]; experience_req: string | null;
  min_experience_months: number; education_req: string | null; min_cgpa: string | number | null;
  deadline: Date | string | null; description: string | null; source: Job['source'];
  verification_status: Job['verificationStatus']; verification_signals: string[] | null;
  verification_reason: string | null; created_at: Date;
}
interface AppRow {
  id: string; user_id: string; job_id: string | null; company: string; role: string;
  status: ApplicationStatus; applied_date: Date | string | null; deadline: Date | string | null;
  interview_date: Date | string | null; notes: string | null; created_at: Date; updated_at: Date;
}

function userRowToStored(r: UserRow): StoredUser {
  return { id: r.id, name: r.name, email: r.email, passwordHash: r.password_hash, role: r.role, companyName: r.company_name ?? null };
}

function profileRowToProfile(r: ProfileRow): StudentProfile {
  return {
    userId: r.user_id,
    name: r.name ?? '',
    college: r.college ?? '',
    degree: r.degree ?? '',
    branch: r.branch ?? '',
    gradYear: r.grad_year,
    cgpa: r.cgpa != null ? Number(r.cgpa) : null,
    skills: r.skills ?? [],
    certifications: r.certifications ?? [],
    projects: r.projects ?? [],
    github: r.github ?? '',
    linkedin: r.linkedin ?? '',
    targetRoleId: r.target_role_id,
    preferredLocations: r.preferred_locations ?? [],
    remotePref: r.remote_pref ?? 'any',
    resumeText: r.resume_text,
    resumeParsed: r.resume_parsed,
    updatedAt: r.updated_at?.toISOString?.() ?? new Date().toISOString(),
  };
}

function jobRowToJob(r: JobRow): Job {
  return {
    id: r.id,
    companyId: r.company_id,
    postedBy: r.posted_by,
    title: r.title,
    company: r.company,
    location: r.location,
    workType: r.work_type,
    remote: r.remote,
    stipendMin: r.stipend_min,
    stipendMax: r.stipend_max,
    salaryMinLpa: r.salary_min_lpa != null ? Number(r.salary_min_lpa) : null,
    salaryMaxLpa: r.salary_max_lpa != null ? Number(r.salary_max_lpa) : null,
    requiredSkills: r.required_skills ?? [],
    preferredSkills: r.preferred_skills ?? [],
    experienceReq: r.experience_req ?? '',
    minExperienceMonths: r.min_experience_months ?? 0,
    educationReq: r.education_req ?? '',
    minCGPA: r.min_cgpa != null ? Number(r.min_cgpa) : null,
    deadline: r.deadline ? String(r.deadline).slice(0, 10) : null,
    description: r.description ?? '',
    source: r.source,
    verificationStatus: r.verification_status,
    verificationSignals: r.verification_signals ?? [],
    verificationReason: r.verification_reason ?? '',
    createdAt: r.created_at?.toISOString?.() ?? new Date().toISOString(),
  };
}

function appRowToApp(r: AppRow): Application {
  return {
    id: r.id,
    userId: r.user_id,
    jobId: r.job_id,
    company: r.company,
    role: r.role,
    status: r.status,
    appliedDate: r.applied_date ? String(r.applied_date).slice(0, 10) : null,
    deadline: r.deadline ? String(r.deadline).slice(0, 10) : null,
    interviewDate: r.interview_date ? String(r.interview_date).slice(0, 10) : null,
    notes: r.notes ?? '',
    createdAt: r.created_at?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: r.updated_at?.toISOString?.() ?? new Date().toISOString(),
  };
}

class PostgresStore extends MemoryStore {
  private pool: Pool;

  constructor(connString: string) {
    super();
    this.pool = new Pool({ connectionString: connString, max: 10 });
  }

  /** Ensure schema + mirror existing rows into memory. Called once at boot. */
  async init(): Promise<void> {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const here = path.dirname(fileURLToPath(import.meta.url));
    await this.pool.query(fs.readFileSync(path.join(here, 'schema.sql'), 'utf-8'));

    const [users, profiles, jobs, apps] = await Promise.all([
      this.pool.query<UserRow>('SELECT * FROM users'),
      this.pool.query<ProfileRow>('SELECT * FROM profiles'),
      this.pool.query<JobRow>('SELECT * FROM jobs'),
      this.pool.query<AppRow>('SELECT * FROM applications'),
    ]);
    this.users = users.rows.map(userRowToStored);
    for (const row of profiles.rows) this.profiles.set(row.user_id, profileRowToProfile(row));
    this.jobs = jobs.rows.map(jobRowToJob);
    this.applications = apps.rows.map(appRowToApp);
    this.seq = Math.max(this.users.length, this.jobs.length, this.applications.length) + 100; // avoid id clashes
    console.log(`[store] Mirrored ${this.users.length} users, ${this.jobs.length} jobs, ${this.applications.length} applications from Postgres`);
  }

  private w(statement: string, params: unknown[]): void {
    // Write-through: apply to memory synchronously (done by caller), persist async.
    this.pool.query(statement, params).catch((e) => console.error('[store] Postgres write failed:', e.message));
  }

  override createUser(input: { name: string; email: string; passwordHash: string; role: UserRole; companyName?: string }): StoredUser {
    const user = super.createUser(input);
    this.w(
      'INSERT INTO users (id, name, email, password_hash, role, company_name) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (email) DO NOTHING',
      [user.id, user.name, user.email, user.passwordHash, user.role, user.companyName]
    );
    return user;
  }

  override saveProfile(userId: string, patch: Partial<StudentProfile>): StudentProfile {
    const merged = super.saveProfile(userId, patch);
    this.w(
      `INSERT INTO profiles (user_id, name, college, degree, branch, grad_year, cgpa, skills,
         certifications, projects, github, linkedin, target_role_id, preferred_locations,
         remote_pref, resume_text, resume_parsed, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, now())
       ON CONFLICT (user_id) DO UPDATE SET
         name=EXCLUDED.name, college=EXCLUDED.college, degree=EXCLUDED.degree, branch=EXCLUDED.branch,
         grad_year=EXCLUDED.grad_year, cgpa=EXCLUDED.cgpa, skills=EXCLUDED.skills,
         certifications=EXCLUDED.certifications, projects=EXCLUDED.projects, github=EXCLUDED.github,
         linkedin=EXCLUDED.linkedin, target_role_id=EXCLUDED.target_role_id,
         preferred_locations=EXCLUDED.preferred_locations, remote_pref=EXCLUDED.remote_pref,
         resume_text=EXCLUDED.resume_text, resume_parsed=EXCLUDED.resume_parsed, updated_at=now()`,
      [merged.userId, merged.name, merged.college, merged.degree, merged.branch, merged.gradYear,
       merged.cgpa, JSON.stringify(merged.skills), JSON.stringify(merged.certifications),
       JSON.stringify(merged.projects), merged.github, merged.linkedin, merged.targetRoleId,
       JSON.stringify(merged.preferredLocations), merged.remotePref, merged.resumeText,
       merged.resumeParsed ? JSON.stringify(merged.resumeParsed) : null]
    );
    return merged;
  }

  override createJob(input: NewJobInput): Job {
    const job = super.createJob(input);
    this.w(
      `INSERT INTO jobs (id, company_id, posted_by, title, company, location, work_type, remote,
         stipend_min, stipend_max, salary_min_lpa, salary_max_lpa, required_skills, preferred_skills,
         experience_req, min_experience_months, education_req, min_cgpa, deadline, description, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       ON CONFLICT (id) DO NOTHING`,
      [job.id, job.companyId, job.postedBy, job.title, job.company, job.location, job.workType, job.remote,
       job.stipendMin, job.stipendMax, job.salaryMinLpa, job.salaryMaxLpa, JSON.stringify(job.requiredSkills),
       JSON.stringify(job.preferredSkills), job.experienceReq, job.minExperienceMonths, job.educationReq,
       job.minCGPA, job.deadline, job.description, job.source]
    );
    return job;
  }

  override updateJobVerification(id: string, status: Job['verificationStatus'], reason?: string, signals?: string[]): Job | null {
    const job = super.updateJobVerification(id, status, reason, signals);
    if (job) {
      this.w('UPDATE jobs SET verification_status=$1, verification_reason=$2, verification_signals=$3 WHERE id=$4',
        [job.verificationStatus, job.verificationReason, JSON.stringify(job.verificationSignals), id]);
    }
    return job;
  }

  override createApplication(input: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>): Application {
    const app = super.createApplication(input);
    this.w(
      `INSERT INTO applications (id, user_id, job_id, company, role, status, applied_date, deadline, interview_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
      [app.id, app.userId, app.jobId, app.company, app.role, app.status, app.appliedDate, app.deadline, app.interviewDate, app.notes]
    );
    return app;
  }

  override updateApplication(id: string, userId: string, patch: Partial<Application>): Application | null {
    const app = super.updateApplication(id, userId, patch);
    if (app) {
      this.w(
        'UPDATE applications SET status=$1, applied_date=$2, deadline=$3, interview_date=$4, notes=$5, updated_at=now() WHERE id=$6',
        [app.status, app.appliedDate, app.deadline, app.interviewDate, app.notes, id]
      );
    }
    return app;
  }

  override deleteApplication(id: string, userId: string): boolean {
    const ok = super.deleteApplication(id, userId);
    if (ok) this.w('DELETE FROM applications WHERE id=$1 AND user_id=$2', [id, userId]);
    return ok;
  }
}

// App-wide singleton (created after class definitions).
export const store: Store = createStore();

/** One-time boot init: schema creation + mirror load for Postgres. */
export async function initStore(): Promise<void> {
  const s = store as unknown as { init?: () => Promise<void> };
  if (typeof s.init === 'function') {
    await s.init();
    console.log('[store] Schema ensured');
  }
}
