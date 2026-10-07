import type {
  Application,
  Job,
  JobMatch,
  ProjectRecommendation,
  ResumeAnalysis,
  RoleDef,
  Roadmap,
  StudentProfile,
  User,
} from './types';

/**
 * Thin typed API layer over the SkillPath backend.
 * Auth token is sent via Bearer header (cookie is also set server-side).
 */

const BASE = '/api';

let authToken: string | null = localStorage.getItem('sp_token');

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (token) localStorage.setItem('sp_token', token);
  else localStorage.removeItem('sp_token');
}

export function getAuthToken(): string | null {
  return authToken;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string>),
  };
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });

  if (res.status === 401 && !path.startsWith('/auth')) {
    setAuthToken(null);
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }

  if (!res.ok) {
    const msg = (data as { error?: string })?.error ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

function get<T>(path: string): Promise<T> {
  return request<T>(path);
}
function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined });
}
function patchReq<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}
function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

// ------------------------------------------------------------------ auth ----

export const api = {
  auth: {
    login: (email: string, password: string) => post<{ user: User; token: string }>('/auth/login', { email, password }),
    register: (input: { name: string; email: string; password: string; role: string }) =>
      post<{ user: User; token: string }>('/auth/register', input),
    me: () => get<{ user: User }>('/auth/me'),
    logout: () => post<{ ok: true }>('/auth/logout'),
  },

  profile: {
    get: () => get<{ profile: StudentProfile | null; roles: RoleDef[] }>('/profile'),
    update: (p: Record<string, unknown>) => patchReq<{ profile: StudentProfile }>('/profile', p),
  },

  matching: {
    jobs: (filters: Record<string, string> = {}) => {
      const qs = new URLSearchParams(filters).toString();
      return get<{ matches: JobMatch[]; count: number }>(`/matching/jobs${qs ? `?${qs}` : ''}`);
    },
    job: (id: string) => get<{ match: JobMatch }>(`/matching/jobs/${id}`),
    skillGap: (role?: string) => get<{ role: { id: string; title: string; blurb: string; capstone: string } | null; readiness?: number; strongSkills?: string[]; missingSkills?: string[]; bonusSkills?: string[]; missingBonus?: string[]; message?: string; disclaimer?: string }>(`/matching/skill-gap${role ? `?role=${role}` : ''}`),
    roadmap: (input: { jobId?: string | null; roleId?: string | null }) =>
      post<{ roadmap: Roadmap | null; missingSkills: string[]; message?: string }>('/matching/roadmap', input),
  },

  jobs: {
    list: (filters: Record<string, string> = {}) => {
      const qs = new URLSearchParams(filters).toString();
      return get<{ jobs: Job[]; count: number }>(`/jobs${qs ? `?${qs}` : ''}`);
    },
    get: (id: string) => get<{ job: Job }>(`/jobs/${id}`),
    mine: () => get<{ jobs: Job[] }>('/jobs/mine'),
    post: (body: Record<string, unknown>) => post<{ job: Job }>('/jobs', body),
    parseDescription: (text: string) => post<{ parsed: Record<string, unknown> }>('/jobs/parse-description', { text }),
  },

  projects: {
    recommendations: (role?: string) =>
      get<{ role: { id: string; title: string }; missingSkills: string[]; recommendations: ProjectRecommendation[] }>(
        `/projects/recommendations${role ? `?role=${role}` : ''}`
      ),
  },

  resume: {
    analyzeText: (text: string, targetRoleId?: string | null) =>
      post<{ analysis: ResumeAnalysis; filename: string }>('/resume/analyze', { text, targetRoleId }),
    analyzeFile: (file: File, targetRoleId?: string | null) => {
      const fd = new FormData();
      fd.append('resume', file);
      if (targetRoleId) fd.append('targetRoleId', targetRoleId);
      return request<{ analysis: ResumeAnalysis; filename: string }>('/resume/analyze', { method: 'POST', body: fd });
    },
  },

  applications: {
    list: () => get<{ applications: Application[]; statuses: string[] }>('/applications'),
    create: (body: Record<string, unknown>) => post<{ application: Application }>('/applications', body),
    update: (id: string, p: Record<string, unknown>) => patchReq<{ application: Application }>(`/applications/${id}`, p),
    remove: (id: string) => del<{ ok: true }>(`/applications/${id}`),
  },

  admin: {
    overview: () => get<{ jobs: Record<string, number>; verificationBadges: Record<string, string> }>('/admin/overview'),
    jobs: (status?: string) => get<{ jobs: Job[] }>(`/admin/jobs${status ? `?status=${status}` : ''}`),
    review: (id: string, status: string, reason?: string) => post<{ job: Job }>(`/admin/jobs/${id}/review`, { status, reason }),
    rescan: (id: string) => post<{ job: Job }>(`/admin/jobs/${id}/rescan`, {}),
  },
};
