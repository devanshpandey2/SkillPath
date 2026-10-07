import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAsync } from '../hooks';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner, EmptyState, Pill, ProgressBar, SkillHave, SkillMissing, Spinner, StatCard } from '../components/ui';
import type { Application, JobMatch } from '../types';
import { daysUntil } from '../hooks';

interface DashboardData {
  profile: Awaited<ReturnType<typeof api.profile.get>>['profile'];
  skillGap: Awaited<ReturnType<typeof api.matching.skillGap>>;
  topMatches: JobMatch[];
  applications: Application[];
}

export function Dashboard() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useAsync<DashboardData>(async () => {
    const [profileRes, gap, matches, apps] = await Promise.all([
      api.profile.get(),
      api.matching.skillGap(),
      api.matching.jobs(),
      api.applications.list(),
    ]);
    return {
      profile: profileRes.profile,
      skillGap: gap,
      topMatches: matches.matches.slice(0, 3),
      applications: apps.applications,
    };
  }, []);

  if (loading) return <Spinner label="Building your career dashboard…" />;
  if (error) return <ErrorBanner message={error} onRetry={refetch} />;
  if (!data) return null;

  const { profile, skillGap: gap, topMatches, applications } = data;

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl pt-10">
        <EmptyState
          icon="🎒"
          title="Let's set up your profile"
          hint="Add your college, skills and target role to unlock matching, skill gaps and your roadmap."
          action={<Link to="/profile" className="btn-primary mt-3">Set up profile</Link>}
        />
      </div>
    );
  }

  const completeness = profileCompleteness(profile);
  const readiness = gap.readiness ?? null;
  const active = applications.filter((a) => !['offer', 'rejected'].includes(a.status));
  const upcoming = applications
    .filter((a) => a.deadline && daysUntil(a.deadline) !== null && (daysUntil(a.deadline) ?? 0) >= 0)
    .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pt-2 lg:pt-4">
      {/* Hero: the one question the dashboard must answer */}
      <section className="rounded-2xl bg-gradient-to-r from-brand-700 to-brand-500 p-6 text-white sm:p-8">
        <div className="text-xs font-semibold uppercase tracking-widest text-brand-100">
          {greeting()}, {profile.name?.split(' ')[0] || user?.name?.split(' ')[0]}
        </div>
        <h1 className="mt-2 max-w-3xl text-2xl font-bold sm:text-3xl">{nextStep(gap, profile, applications)}</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/skill-gap" className="btn bg-white/15 text-white backdrop-blur hover:bg-white/25">🎯 See skill gap</Link>
          <Link to="/roadmap" className="btn bg-white/15 text-white backdrop-blur hover:bg-white/25">🗺️ My roadmap</Link>
          <Link to="/jobs" className="btn bg-white text-brand-700 hover:bg-brand-50">💼 Best-fit jobs</Link>
        </div>
      </section>

      {/* Stats row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Target role" value={<span className="text-lg">{gap.role ? gap.role.title : 'Not set'}</span>} hint={gap.role ? gap.role.blurb : 'Pick one in your profile'} />
        <StatCard label="Readiness" value={readiness !== null ? `${readiness}%` : '—'} hint={readiness !== null ? 'Skill coverage vs target role' : 'Set a target role'} />
        <StatCard label="Profile completeness" value={`${completeness}%`} hint="More detail = better matches" />
        <StatCard label="Active applications" value={active.length} hint={`${applications.length} tracked overall`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Skills snapshot */}
        <section className="card p-5 lg:col-span-1">
          <h2 className="font-semibold text-slate-800">Skills for {gap.role?.title ?? 'your role'}</h2>
          {gap.role ? (
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Strong skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {gap.strongSkills?.length ? gap.strongSkills.map((s) => <SkillHave key={s} label={pretty(s)} />) : <span className="text-sm text-slate-400">None yet</span>}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Improve next</div>
                <div className="flex flex-wrap gap-1.5">
                  {gap.missingSkills?.length ? (
                    gap.missingSkills.map((s) => <SkillMissing key={s} label={pretty(s)} />)
                  ) : (
                    <span className="text-sm text-emerald-600">✓ Core skills covered — focus on interview prep!</span>
                  )}
                </div>
              </div>
              <Link to="/skill-gap" className="btn-secondary w-full !py-1.5 text-xs">Full skill-gap analysis →</Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Choose a target role in your <Link to="/profile" className="font-medium text-brand-600 hover:underline">profile</Link> to see your gap analysis.
            </p>
          )}
        </section>

        {/* Recommended opportunities */}
        <section className="lg:col-span-2">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Recommended for you</h2>
              <Link to="/jobs" className="text-xs font-semibold text-brand-600 hover:underline">View all →</Link>
            </div>
            <div className="mt-4 space-y-3">
              {topMatches.length === 0 && <p className="text-sm text-slate-500">No listings yet — check back soon.</p>}
              {topMatches.map((m) => (
                <Link key={m.job.id} to={`/jobs/${m.job.id}`} className="flex items-center gap-4 rounded-xl border border-slate-200 p-3 transition-colors hover:border-brand-300 hover:bg-brand-50/40">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">{Math.round(m.score)}%</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{m.job.title}</div>
                    <div className="truncate text-xs text-slate-500">{m.job.company} · {m.job.location}</div>
                  </div>
                  <div className="hidden sm:block">
                    <Pill tone={m.job.remote === 'remote' ? 'green' : 'slate'}>{m.job.remote}</Pill>
                  </div>
                </Link>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-400">Match % reflects skill coverage — not a guarantee of selection.</p>
          </div>

          {/* Upcoming deadlines */}
          <div className="card mt-6 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Upcoming deadlines</h2>
              <Link to="/applications" className="text-xs font-semibold text-brand-600 hover:underline">Tracker →</Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No deadlines to worry about. Track applications to see them here.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {upcoming.map((a) => {
                  const d = daysUntil(a.deadline) ?? 0;
                  return (
                    <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="truncate font-medium text-slate-700">{a.role} · {a.company}</span>
                      <span className={d <= 7 ? 'font-semibold text-red-600' : 'text-slate-500'}>{d === 0 ? 'Today' : `${d}d left`}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Profile completeness */}
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Profile completeness</h2>
          <span className="text-sm font-semibold text-brand-600">{completeness}%</span>
        </div>
        <ProgressBar value={completeness} className="mt-3" />
        <p className="mt-2 text-xs text-slate-500">
          {completeness < 100 ? 'Add skills, projects and preferences to sharpen your matches.' : 'Your profile is complete — great job!'}
        </p>
      </section>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function pretty(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function profileCompleteness(p: NonNullable<Awaited<ReturnType<typeof api.profile.get>>['profile']>): number {
  const checks = [
    Boolean(p.name),
    Boolean(p.college),
    Boolean(p.degree),
    Boolean(p.branch),
    p.gradYear !== null,
    p.cgpa !== null,
    p.skills.length >= 3,
    p.certifications.length > 0,
    p.projects.length > 0,
    Boolean(p.github),
    Boolean(p.linkedin),
    Boolean(p.targetRoleId),
    p.preferredLocations.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function nextStep(gap: { role: { title: string } | null; missingSkills?: string[] }, profile: { skills: unknown[] }, applications: Application[]): string {
  if (!gap.role) return 'Set a target role to unlock your personalized skill gap and roadmap.';
  if (profile.skills.length < 3) return 'Add at least 3 skills to your profile so we can match you accurately.';
  if (gap.missingSkills && gap.missingSkills.length > 0) {
    return `Your next step: learn ${pretty(gap.missingSkills[0])} — it's the top gap for ${gap.role.title}.`;
  }
  if (applications.length === 0) return `You cover ${gap.role.title} core skills — time to start applying!`;
  return `Keep momentum: follow up on your applications and prep for interviews.`;
}
