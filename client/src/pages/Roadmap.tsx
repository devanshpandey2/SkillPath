import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAsync } from '../hooks';
import { ErrorBanner, EmptyState, Pill, Spinner } from '../components/ui';
import type { Roadmap } from '../types';

type RoadmapResponse = Awaited<ReturnType<typeof api.matching.roadmap>>;

function prettySkill(s: string): string {
  return s.includes(' ') ? s : s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Roadmap() {
  const [params] = useSearchParams();
  const jobId = params.get('jobId');
  const [result, setResult] = useState<RoadmapResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { loading, error, refetch } = useAsync<RoadmapResponse | null>(async () => {
    const res = await api.matching.roadmap(jobId ? { jobId } : {});
    setResult(res);
    return res;
  }, [jobId]);

  async function regenerate(roleId: string | null) {
    setBusy(true);
    setErr(null);
    try {
      const res = await api.matching.roadmap(roleId ? { roleId } : {});
      setResult(res);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !result) return <Spinner label="Designing your personalized roadmap…" />;
  if (error && !result) return <ErrorBanner message={error} onRetry={refetch} />;

  const r = result?.roadmap;

  return (
    <div className="mx-auto max-w-3xl space-y-5 pt-2 lg:pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Your learning roadmap</h1>
          <p className="mt-1 text-sm text-slate-500">
            {jobId ? 'Built from the gaps in a specific job.' : 'From your current skills to your target role.'}{' '}
            {r && <Pill tone={r.generatedBy === 'llm' ? 'brand' : 'slate'}>{r.generatedBy === 'llm' ? '✨ AI-generated' : 'Rule-based plan'}</Pill>}
          </p>
        </div>
        <div className="flex gap-2">
          {!jobId && (
            <>
              <button onClick={() => regenerate(null)} disabled={busy} className="btn-secondary !py-1.5 text-xs">↻ Regenerate</button>
              <Link to="/profile" className="btn-secondary !py-1.5 text-xs">Change target role</Link>
            </>
          )}
        </div>
      </div>

      {err && <ErrorBanner message={err} />}

      {r && r.weeks.length > 0 ? (
        <>
          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Target</div>
              <div className="font-semibold text-slate-800">{r.targetRole}</div>
            </div>
            <ol className="divide-y divide-slate-100">
              {r.weeks.map((w) => (
                <li key={w.week} className="flex gap-4 px-5 py-4">
                  <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    W{w.week}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800">{w.skill}</div>
                    {w.why && <p className="mt-0.5 text-sm text-slate-500">{w.why}</p>}
                    {w.resource && <p className="mt-1 text-xs text-brand-600">📘 {w.resource}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Finish with a portfolio project</div>
            <div className="mt-1 font-semibold text-emerald-800">{r.capstoneProject}</div>
            <Link to="/projects" className="btn-primary mt-3 !py-1.5 text-xs">🛠️ See recommended projects</Link>
          </div>

          {result?.missingSkills && result.missingSkills.length > 0 && (
            <div className="card p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Skills this plan closes</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.missingSkills.map((s) => <Pill key={s} tone="amber">{prettySkill(s)}</Pill>)}
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon="🗺️"
          title="No roadmap yet"
          hint={result?.message ?? 'Set a target role in your profile and generate a plan.'}
          action={<Link to="/profile" className="btn-primary mt-3">Set a target role</Link>}
        />
      )}
    </div>
  );
}
