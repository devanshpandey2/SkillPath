# SkillPath 🎯

**AI-powered internship & job skill-matching for Indian college students.**

SkillPath answers one question instead of dumping thousands of listings on students:

> *"Which opportunities fit me, what am I missing, and what should I do next?"*

---

## Problem statement

College students face a major problem when searching for internships and entry-level jobs. There are thousands of listings across different platforms, but students often don't know:

- Which jobs are actually **suitable** for them
- Whether they have the **required skills**
- Which skills they are **missing**
- What **projects** they should build
- What they should **learn next**
- Whether an internship listing is **legitimate**
- How their profile **compares** with job requirements

Traditional job boards optimize for volume. Students need **direction**.

## Solution

SkillPath is a guidance-first platform built around a single workflow:

**Student Profile → Target Role → Job Matching → Skill Gap → Learning Roadmap → Project → Application**

Instead of "here are 5,000 listings," SkillPath says:

```
Match: 72% for Frontend Intern @ Zencart

You have:   ✓ JavaScript  ✓ React  ✓ Git
You need:   ⚠ TypeScript  ⚠ Node.js  ⚠ REST APIs

Your path (4 weeks):
  Week 1: TypeScript fundamentals — why: required by 62% of frontend roles…
  Week 2: Node.js …
  Week 3: REST APIs …
  Week 4: Capstone — build a project that demonstrates the gap
```

Match percentages are **estimates of skill coverage, never a guarantee of selection** — the UI says so explicitly. Internship verification surfaces **signals** (🟢/🟡/🔴) and always leaves the fraud judgment to a human reviewer; the platform never claims a listing is fraudulent on its own.

---

## Features

### For students
| Feature | What it does |
|---|---|
| **Profile builder** | College, degree, branch, year, CGPA, skills (with levels), certifications, projects, GitHub/LinkedIn, resume, target role, preferred locations, remote preference |
| **Skill matching engine** | Scores every listing: required skills (60) + preferred (15) + location (12) + experience (8) + education (5). Full "why this matches / what you're missing" breakdown per job |
| **Skill gap analysis** | Readiness % vs. target role, strong skills, missing core skills, bonus skills |
| **Personalized roadmap** | Week-by-week plan, each step explains *why* the skill matters, ends in a capstone project |
| **Project recommendations** | Projects chosen to close *your* gaps, with skills demonstrated, difficulty, estimated weeks |
| **Resume analysis** | Upload or paste → skills detected, sections, ATS-style score, keyword gaps vs. target role, missing info, formatting issues. Never fabricates qualifications |
| **Opportunity dashboard** | Job cards with company, role, location, remote/onsite, stipend, required skills, match %, deadline, verification status, experience — filterable by role, location, remote, stipend, skills, match % |
| **Application tracker** | Kanban: Saved → Applied → Assessment → Interview → Offer / Rejected, with notes, applied date, deadline, interview date |
| **Career dashboard** | "What should I do next?" — profile completeness, readiness, strong skills, improve list, recommended project, upcoming deadlines |

### For recruiters
- Company profile, post internships/jobs with required + preferred skills, min experience, education, deadline
- **JD auto-fill**: paste a raw job description, the AI layer extracts fields into the form
- Manage your postings and see verification status of what you post

### For admins
- Verification overview (verified / needs review / flagged counts)
- Review queue: re-scan automated signals, record a human verification decision with a reason

### Trust & safety
- Every listing is auto-checked for risk signals: registration/payment fees, "earn ₹X,000/day" claims, WhatsApp-only contact, unrealistic pay vs. requirements, zero required skills
- Signals are shown transparently — the app explains *what* was detected, and badges are labeled:
  - 🟢 **Verified** — concrete pay, detailed description, registered recruiter
  - 🟡 **Needs review** — automated checks inconclusive, human review pending
  - 🔴 **Potential concern** — several risk signals found; **does NOT prove fraud**, a human decides

---

## User flow

```
        ┌────────────┐
        │  Register   │  student / recruiter / admin (JWT)
        └─────┬──────┘
              ▼
        ┌────────────┐      Complete profile → pick a TARGET ROLE
        │  Dashboard  │◄─────────────────────────────────────┐
        └─────┬──────┘                                       │
              ▼                                              │
   Matching (jobs ranked by fit %) → Job detail (explanation)
              │                                              │
              ▼                                              ▼
        Skill Gap ──────► Roadmap (weekly plan) ──► Projects
              │                                              │
              └──────────────► Applications tracker ◄────────┘
                               (Saved → … → Offer)
```

Demo data ships with a realistic student (Aarav, frontend-leaning profile) and 8 listings — including one **intentionally suspicious posting** so the verification UI can be seen in action.

## Demo logins

Password for all demo accounts: `password123`

| Role | Email |
|---|---|
| Student | `aarav@student.dev` |
| Recruiter | `priya@zencart.dev` |
| Admin | `admin@skillpath.dev` |

---

## Architecture

```
skillpath/
├── client/                 React 18 + TypeScript + Tailwind (Vite)
│   ├── src/api.ts          Typed fetch wrapper (Bearer token, ApiError)
│   ├── src/context/        AuthContext (login/register/logout, token storage)
│   ├── src/hooks/          useAsync (loading/error/retry), helpers
│   ├── src/components/     Reusable UI primitives, JobCard, Layout
│   └── src/pages/          15 pages, all with loading + error + empty states
└── server/                 Node + Express + TypeScript
    ├── src/ai/             LLM abstraction layer (provider + per-feature wrappers)
    ├── src/domain/         Pure logic: skills taxonomy, roles, matcher, roadmap,
    │                       projects catalog, verifier, resume analyzer
    ├── src/data/           Store interface, MemoryStore, PostgresStore, schema.sql
    ├── src/middleware/     requireAuth / requireRole / optionalAuth (JWT)
    ├── src/routes/         auth, profile, matching, projects, resume,
    │                       applications, jobs, admin
    └── src/seed/           Idempotent demo data (users, profile, jobs, apps)
```

Key design decisions:

- **Domain logic is pure** (no I/O) — the matcher, verifier, roadmap and resume analyzer are deterministic and fully unit-testable.
- **Store abstraction**: the server speaks to a `Store` interface. With `DATABASE_URL` set it uses `PostgresStore` (write-through mirror); without it, an in-memory store with identical semantics boots so the demo always runs. The Postgres DDL lives in [server/src/data/schema.sql](server/src/data/schema.sql).
- **Every page** handles loading, error (with retry) and empty states.
- **Match % is presented as an estimate**, with an explicit non-guarantee disclaimer.

### Matching score

| Component | Weight |
|---|---|
| Required skills coverage | 60 |
| Preferred skills coverage | 15 |
| Location / remote preference | 12 |
| Experience fit | 8 |
| Education fit | 5 |

Listings with **zero required skills** score 0 on coverage (a deliberate guard against "no skills needed, earn daily" spam ranking highly).

---

## Database schema

`server/src/data/schema.sql` defines five tables:

- **users** — `id, name, email (unique), password_hash (bcrypt), role (student|recruiter|admin), company_name, created_at`
- **profiles** — 1:1 with users; identity, academics (`degree, branch, grad_year, cgpa`), JSONB `skills / certifications / projects`, `github, linkedin`, `target_role_id`, `preferred_locations`, `remote_pref`, `resume_text`, `resume_parsed`
- **companies** — `name (unique), website, about, owner_id`
- **jobs** — `title, company, location, work_type, remote, stipend/salary ranges, required_skills, preferred_skills, experience_req, min_experience_months, education_req, min_cgpa, deadline, description, source, verification_status, verification_signals, verification_reason`
- **applications** — `user_id, job_id, company, role, status (saved|applied|assessment|interview|offer|rejected), applied_date, deadline, interview_date, notes`

All JSONB columns are defaulted, statuses are CHECK-constrained, and hot lookup paths are indexed.

---

## API endpoints

Base URL: `http://localhost:4000/api`

### Auth (`/api/auth`)
| Method | Path | Description |
|---|---|---|
| POST | `/register` | `{ name, email, password, role }` → 201 `{ user, token }` |
| POST | `/login` | `{ email, password }` → `{ user, token }` (also sets `sp_token` cookie) |
| GET | `/me` | Current user (requires auth) |
| POST | `/logout` | Clears cookie |

### Profile (`/api/profile`)
| Method | Path | Description |
|---|---|---|
| GET | `/` | Signed-in student's profile + role catalog |
| PATCH | `/` | Partial update, zod-validated (skills, academics, target role, preferences…) |
| GET | `/roles` | Target role catalog (8 roles) |

### Matching (`/api/matching`)
| Method | Path | Description |
|---|---|---|
| GET | `/jobs` | All listings scored for the student, sorted by match. Filters: `role, location, remote, workType, minStipend, skills, minMatch, verification` |
| GET | `/jobs/:id` | One scored job with full match explanation (have/missing per skill) |
| GET | `/skill-gap` | Readiness %, strong/missing/bonus skills vs. target role |
| POST | `/roadmap` | `{ jobId? , roleId? }` → week-by-week plan + capstone |

### Projects (`/api/projects`)
| Method | Path | Description |
|---|---|---|
| GET | `/recommendations?role=&jobId=` | Gap-targeted project recommendations |

### Resume (`/api/resume`)
| Method | Path | Description |
|---|---|---|
| POST | `/analyze` | Multipart file (`resume` field) **or** `{ text }` → skills, sections, ATS score, keyword gaps, issues; result is saved to the profile |

### Applications (`/api/applications`)
| Method | Path | Description |
|---|---|---|
| GET | `/` | Student's tracked applications (+ linked job) |
| POST | `/` | Create (dedupes per job; `saved` status allowed directly from a job card) |
| PATCH | `/:id` | Move through pipeline / edit details |
| DELETE | `/:id` | Remove |

### Jobs (`/api/jobs`)
| Method | Path | Description |
|---|---|---|
| GET | `/` | Raw listings, filterable (`workType, remote, verification, location, q`) — browsable without a student profile |
| GET | `/:id` | Single listing + verification details |
| POST | `/parse-description` | Recruiter helper: paste a JD → parsed fields (AI or deterministic) |
| POST | `/` | Post a listing (recruiter/admin); auto-runs verification |
| GET | `/mine` | Recruiter's own postings |

### Admin (`/api/admin`)
| Method | Path | Description |
|---|---|---|
| GET | `/overview` | Verification counts + badge explanations |
| GET | `/jobs?status=` | Review queue |
| POST | `/jobs/:id/review` | Human decision: `{ status, reason? }` |
| POST | `/jobs/:id/rescan` | Re-run automated verification |

Also: `GET /api/health` (uptime + AI status) and `GET /api/meta` (roles + skills taxonomy).

---

## AI integration

SkillPath has an **LLM abstraction layer** — the app is fully functional with **zero AI configuration** (deterministic fallbacks everywhere), and upgrades automatically when keys are provided.

**No API keys are hard-coded.** Configuration is env-only:

```bash
# server/.env
AI_PROVIDER=openai        # openai | anthropic | gemini | groq
AI_API_KEY=sk-...         # only from environment, never in code
AI_MODEL=gpt-4o-mini      # optional; sensible default per provider
```

| Feature | With LLM | Without LLM (default) |
|---|---|---|
| Resume analysis | LLM extraction | Rule-based parser: sections, skills (60+ entry taxonomy with aliases), certifications, ATS score, formatting checks |
| Job-description parsing | LLM field extraction | Regex/keyword extraction of skills, stipend, remote, deadline |
| Roadmap | LLM-generated weekly plan | Ordered plan from role skill graph; every step carries a "why this matters" rationale |
| Project recommendations | LLM ideas | Curated catalog mapped to roles + gaps |

Every AI call is wrapped: on missing config, network failure, or malformed output, the deterministic engine answers instead — the UI labels results as `✨ AI-generated` or `Rule-based` so the user always knows the source.

Supported providers: **OpenAI**, **Anthropic**, **Gemini**, **Groq** (see `server/src/ai/provider.ts`).

---

## Setup instructions

**Requirements:** Node.js ≥ 20 (developed on Node 24), npm ≥ 10. PostgreSQL is *optional*.

```bash
# 1. Install dependencies (workspaces: server + client)
npm install

# 2. Configure the server (optional)
cp server/.env.example server/.env   # or edit server/.env directly
```

`server/.env` options — everything is optional, defaults are demo-friendly:

```bash
PORT=4000                 # API port
JWT_SECRET=dev-secret     # set a strong secret in production
DATABASE_URL=postgres://… # set to use Postgres; unset → in-memory demo store
AI_PROVIDER=openai        # optional; unset → deterministic engine
AI_API_KEY=…              # optional
AI_MODEL=…                # optional
CLIENT_ORIGIN=http://localhost:5173
```

```bash
# 3. Run both server and client
npm run dev
#   → API  http://localhost:4000  (health: /api/health)
#   → App  http://localhost:5173  (Vite proxies /api → 4000)
```

Log in with a demo account (above) or register a new one. The seed runs automatically and is idempotent.

### Using PostgreSQL

1. Create a database and set `DATABASE_URL` in `server/.env`
2. Apply the schema: `psql "$DATABASE_URL" -f server/src/data/schema.sql`
3. Restart the server — it will mirror writes through to Postgres

### Production build

```bash
npm run build   # builds client (Vite) and server (tsc)
npm start       # serves the API; deploy client/dist statically
```

---

## Future scope

- **Real resume files**: proper PDF/DOCX text extraction (currently best-effort; pasting text is recommended)
- **Recruiter-side candidate matching**: rank applicants against a posting using the same engine
- **Notifications**: deadline reminders, application status changes, new high-match listings
- **Learning resources**: curated course links per roadmap step, progress tracking
- **Verified company profiles**: recruiter KYC flow to strengthen the 🟢 badge
- **Skill assessments**: short quizzes that let students level-up skills beyond self-report
- **Mock interviews**: AI-driven question sets per target role
- **Referral network**: alumni mentors per college
- **Analytics**: cohort readiness trends for colleges/placement cells
- **Mobile app**: React Native client sharing the same API

---

## Product principles

1. **Not another job board.** The dashboard always answers *"what should I do next?"*
2. **Match % ≠ selection guarantee.** Shown as skill-coverage estimate, with disclaimers.
3. **Verification surfaces signals, never verdicts.** 🔴 means "potential concern — human review decides"; the app never claims fraud from automated analysis alone.
4. **Works without AI, better with it.** Deterministic fallbacks keep the product honest and always available.
