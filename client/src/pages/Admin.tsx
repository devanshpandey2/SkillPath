import { useState } from 'react';
import { api } from '../api';
import { useAsync } from '../hooks';
import { EmptyState, ErrorBanner, Pill, Spinner, VerificationBadge } from '../components/ui';
import type { Job } from '../types';

export function Admin() {
  const [filter, setFilter] = useState<string>('');
  const { data, loading, error, refetch } = useAsync(async () => {
    const [overview, jobs] = await Promise.all([api.admin.overview(), api.admin.jobs(filter || undefined)]);
    return { overview, jobs: jobs.jobs };
  }, [filter]);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function review(job: Job, status: 'verified' | 'needs_review' | 'flagged') {
    setBusyId(job.id);
    setErr(null);
    try {
      await api.admin.review(job.id, status, `Manual review by admin: ${status}`);
      await refetch();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function rescan(job: Job) {
    setBusyId(job.id);
    setErr(null);
    try {
      await api.admin.rescan(job.id);
      await refetch();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading && !data) return <Spinner label="Loading admin console…" />;
  if (error && !data) return <ErrorBanner message={error} onRetry={refetch} />;

  const counts = data?.overview.jobs;

  return (
    <div className="mx-auto max-w-6xl space-y-5 pt-2 lg:pt-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Admin console</h1>
        <p className="mt-1 text-sm text-slate-500">Human review of listing verification. Automated signals assist — humans decide.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { k: 'total', l: 'Total listings', c: 'text-slate-800' },
          { k: 'verified', l: '🟢 Verified', c: 'text-emerald-600' },
          { k: 'needs_review', l: '🟡 Needs review', c: 'text-amber-600' },
          { k: 'flagged', l: '🔴 Flagged', c: 'text-red-600' },
        ].map((s) => (
          <button key={s.k} onClick={() => setFilter(filter === s.k ? '' : s.k)} className={`card p-4 text-left transition-shadow hover:shadow-card-hover ${filter === s.k ? 'ring-2 ring-brand-400' : ''}`}>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.l}</div>
            <div className={`mt-1 text-2xl font-bold ${s.c}`}>{counts?.[s.k] ?? 0}</div>
          </button>
        ))}
      </div>

      <div className="card p-4 text-xs text-slate-500">
        <strong className="text-slate-600">Badge meanings:</strong> {Object.values(data?.overview.verificationBadges ?? {}).join(' · ')}
      </div>

      {err && <ErrorBanner message={err} />}

      {(data?.jobs ?? []).length === 0 ? (
        <EmptyState icon="🛡️" title="Nothing in this queue" hint="Try a different filter." />
      ) : (
        <div className="space-y-3">
          {data!.jobs.map((j) => (
            <div key={j.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-800">{j.title}</span>
                    <Pill tone="slate">{j.company}</Pill>
                    <VerificationBadge status={j.verificationStatus} />
                    {j.source === 'sample' && <Pill tone="amber">sample</Pill>}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{j.location} · deadline {j.deadline ?? 'none'}</p>
                  {j.verificationSignals.length > 0 && (
                    <ul className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                      {j.verificationSignals.map((s, i) => <li key={i}>{s.startsWith('⚠') ? '🚩' : '✓'} {s.replace('⚠ ', '')}</li>)}
                    </ul>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => review(j, 'verified')} disabled={busyId === j.id} className="btn-primary !px-3 !py-1.5 text-xs">Approve</button>
                  <button onClick={() => review(j, 'needs_review')} disabled={busyId === j.id} className="btn-secondary !px-3 !py-1.5 text-xs">Hold</button>
                  <button onClick={() => review(j, 'flagged')} disabled={busyId === j.id} className="btn-danger !px-3 !py-1.5 text-xs">Flag</button>
                  <button onClick={() => rescan(j)} disabled={busyId === j.id} className="btn-secondary !px-3 !py-1.5 text-xs">↻ Rescan</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
