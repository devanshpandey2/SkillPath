-- SkillPath Postgres schema
-- The server runs against Postgres when DATABASE_URL is set; otherwise it
-- falls back to an in-memory demo store with identical semantics, so the app
-- always boots.

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(80)  NOT NULL,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role          VARCHAR(20)  NOT NULL CHECK (role IN ('student', 'recruiter', 'admin')),
  company_name  VARCHAR(120),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name                VARCHAR(80),
  college             VARCHAR(160),
  degree              VARCHAR(80),
  branch              VARCHAR(80),
  grad_year           INTEGER,
  cgpa                NUMERIC(4, 2),
  skills              JSONB      NOT NULL DEFAULT '[]',
  certifications      JSONB      NOT NULL DEFAULT '[]',
  projects            JSONB      NOT NULL DEFAULT '[]',
  github              VARCHAR(200),
  linkedin            VARCHAR(200),
  target_role_id      VARCHAR(60),
  preferred_locations JSONB      NOT NULL DEFAULT '[]',
  remote_pref         VARCHAR(10) NOT NULL DEFAULT 'any',
  resume_text         TEXT,
  resume_parsed       JSONB,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companies (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name     VARCHAR(120) NOT NULL UNIQUE,
  website  VARCHAR(200),
  about    TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID REFERENCES companies(id) ON DELETE SET NULL,
  posted_by            UUID REFERENCES users(id) ON DELETE SET NULL,
  title                VARCHAR(120) NOT NULL,
  company              VARCHAR(120) NOT NULL,
  location             VARCHAR(120) NOT NULL,
  work_type            VARCHAR(20)  NOT NULL CHECK (work_type IN ('internship', 'job')),
  remote               VARCHAR(10)  NOT NULL CHECK (remote IN ('remote', 'onsite', 'hybrid')),
  stipend_min          INTEGER,
  stipend_max          INTEGER,
  salary_min_lpa       NUMERIC(5, 2),
  salary_max_lpa       NUMERIC(5, 2),
  required_skills      JSONB        NOT NULL DEFAULT '[]',
  preferred_skills     JSONB        NOT NULL DEFAULT '[]',
  experience_req       VARCHAR(80),
  min_experience_months INTEGER     NOT NULL DEFAULT 0,
  education_req        VARCHAR(160),
  min_cgpa             NUMERIC(4, 2),
  deadline             DATE,
  description          TEXT,
  source               VARCHAR(20)  NOT NULL DEFAULT 'platform',
  verification_status  VARCHAR(20)  NOT NULL DEFAULT 'needs_review',
  verification_signals JSONB        NOT NULL DEFAULT '[]',
  verification_reason  TEXT,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id        UUID REFERENCES jobs(id) ON DELETE SET NULL,
  company       VARCHAR(120) NOT NULL,
  role          VARCHAR(120) NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'saved'
                CHECK (status IN ('saved','applied','assessment','interview','offer','rejected')),
  applied_date  DATE,
  deadline      DATE,
  interview_date DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status      ON jobs (verification_status);
CREATE INDEX IF NOT EXISTS idx_jobs_worktype    ON jobs (work_type);
CREATE INDEX IF NOT EXISTS idx_apps_user        ON applications (user_id);
CREATE INDEX IF NOT EXISTS idx_apps_status      ON applications (status);
CREATE INDEX IF NOT EXISTS idx_profiles_role    ON profiles (target_role_id);
