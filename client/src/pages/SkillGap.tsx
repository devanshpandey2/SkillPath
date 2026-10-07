import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAsync } from '../hooks';
import { EmptyState, ErrorBanner, MatchRing, Pill, SkillHave, SkillMissing, Spinner } from '../components/ui';
import type { RoleDef } from '../types';

type GapResponse = Awaited<ReturnType<typeof api.matching.skillGap>>;

export function SkillGap() {
  const [roles, setRoles] = useState<RoleDef[] | null>(null);

  const { data, loading, error, refetch } = useAsync<GapResponse>(async () => {
    if (!roles) {
      const res = await api.profile.get();
      setRoles(res.roles);
    }
    return api.matching.skillGap();
  }, []);

  async function switchRole(roleId: string) {
    await api.profile.update({ targetRoleId: roleId });
    await refetch();
  }

  if (loading && !data) return <Spinner label="Analyzing your skill gaps…" />;
  if (error) return <ErrorBanner message={error} onRetry={refetch} />;
  if (!data) return null;

  if (!data.role) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 pt-2 lg:pt-4">
        <h1 className="text-2xl font-bold text-slate-800">Skill gap</h1>
        <EmptyState
          icon="🎯"
          title="Pick a target role first"
          hint="Your skill gap is measured against a specific role. Choose one to see exactly where you stand."
          action={
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {(roles ?? []).map((r) => (
                <button key={r.id} onClick={() => switchRole(r.id)} className="btn-secondary text-xs">{r.title}</button>
              ))}
            </div>
          }
        />
      </div>
    );
  }

  const readiness = data.readiness ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pt-2 lg:pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Skill gap</h1>
          <p className="mt-1 text-sm text-slate-500">{data.role.blurb}</p>
        </div>
        <RolePicker roles={roles ?? []} current={data.role.id} onPick={switchRole} />
      </div>

      {/* Readiness hero */}
      <div className="card flex flex-col items-center gap-5 p-6 sm:flex-row">
        <MatchRing score={readiness} size={110} />
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-lg font-semibold text-slate-800">Readiness for {data.role.title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Coverage of the core skills this role needs. {data.disclaimer}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Link to="/roadmap" className="btn-primary !py-1.5 text-xs">🗺️ Get my roadmap</Link>
            <Link to="/projects" className="btn-secondary !py-1.5 text-xs">🛠️ Projects to build</Link>
            <Link to="/jobs" className="btn-secondary !py-1.5 text-xs">💼 Matched jobs</Link>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800">✓ Strong skills</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {data.strongSkills?.length ? data.strongSkills.map((s) => <SkillHave key={s} label={pretty(s)} />) : <p className="text-sm text-slate-400">None yet — your roadmap starts from fundamentals.</p>}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800">⚠ Core gaps</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {data.missingSkills?.length ? data.missingSkills.map((s) => <SkillMissing key={s} label={pretty(s)} />) : <p className="text-sm text-emerald-600">All core skills covered — outstanding!</p>}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800">★ Bonus skills you have</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {data.bonusSkills?.length ? data.bonusSkills.map((s) => <Pill key={s} tone="brand">{pretty(s)}</Pill>) : <p className="text-sm text-slate-400">Common differentiators for this role appear here as you learn them.</p>}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800">+ Bonus skills to consider</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {data.missingBonus?.length ? data.missingBonus.map((s) => <Pill key={s}>{pretty(s)}</Pill>) : <p className="text-sm text-slate-400">You've covered all the common differentiators!</p>}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
        <strong>Suggested capstone:</strong> {data.role.capstone}
      </div>
    </div>
  );
}

function RolePicker({ roles, current, onPick }: { roles: RoleDef[]; current: string; onPick: (id: string) => void }) {
  return (
    <select
      className="input max-w-xs"
      value={current}
      onChange={(e) => onPick(e.target.value)}
      aria-label="Change target role"
    >
      {roles.map((r) => (
        <option key={r.id} value={r.id}>{r.title}</option>
      ))}
    </select>
  );
}

function pretty(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
