import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAsync, stipendLabel, daysUntil } from '../hooks';
import { EmptyState, ErrorBanner, MatchRing, Pill, SkillHave, SkillMissing, Spinner, VerificationBadge } from '../components/ui';

export function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data, loading, error, refetch } = useAsync(
    async () => {
      if (!id) throw new Error('Missing job id');
      const [matchRes, jobRes] = await Promise.all([api.matching.job(id), api.jobs.get(id)]);
      return { match: matchRes.match, job: jobRes.job };
    },
    [id]
  );

  async function track() {
    if (!data) return;
    setBusy(true);
    setErr(null);
    try {
      await api.applications.create({
        jobId: data.job.id,
        company: data.job.company,
        role: data.job.title,
        status: 'saved',
        deadline: data.job.deadline,
      });
      navigate('/applications');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner label="Analyzing this opportunity for you…" />;
  if (error) return <ErrorBanner message={error} onRetry={refetch} />;
  if (!data) return null;

  const { match, job } = data;
  const days = daysUntil(job.deadline);

  return (
    <div className="mx-auto max-w-4xl space-y-5 pt-2 lg:pt-4">
      <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-700">← Back</button>

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">{job.title}</h1>
              <VerificationBadge status={job.verificationStatus} />
            </div>
            <p className="mt-1 text-slate-600">{job.company} · {job.location} · {job.remote === 'remote' ? 'Remote' : job.remote === 'hybrid' ? 'Hybrid' : 'On-site'}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              <Pill tone="brand">{stipendLabel(job)}</Pill>
              <Pill>{job.workType === 'internship' ? 'Internship' : 'Full-time'}</Pill>
              <Pill>Experience: {job.experienceReq}</Pill>
              {job.minCGPA != null && <Pill>Min CGPA {job.minCGPA}</Pill>}
              {days !== null && <Pill tone={days <= 7 ? 'amber' : 'slate'}>{days < 0 ? 'Deadline passed' : `Apply in ${days}d`}</Pill>}
            </div>
          </div>
          <MatchRing score={match.score} size={84} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={track} disabled={busy} className="btn-primary">📮 Track this application</button>
          <Link to={`/roadmap?jobId=${job.id}`} className="btn-secondary">🗺️ Build my roadmap for this role</Link>
        </div>
        {err && <div className="mt-3"><ErrorBanner message={err} /></div>}
      </div>

      {/* Why this matches you */}
      <div className="card p-6">
        <h2 className="font-semibold text-slate-800">Why this matches you</h2>
        <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
          {match.reasons.map((r, i) => (
            <li key={i} className="flex gap-2"><span className="text-brand-600">•</span>{r}</li>
          ))}
        </ul>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">You have ({match.matched.length})</div>
            <div className="flex flex-wrap gap-1.5">
              {match.matched.length ? match.matched.map((m) => <SkillHave key={m.name} label={m.label} />) : <span className="text-sm text-slate-400">None of the required skills yet</span>}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">You're missing ({match.missingRequired.length} required)</div>
            <div className="flex flex-wrap gap-1.5">
              {match.missingRequired.length ? match.missingRequired.map((l) => <SkillMissing key={l} label={l} />) : <span className="text-sm text-emerald-600">✓ All required skills covered!</span>}
              {match.missingPreferred.map((l) => <SkillMissing key={`p-${l}`} label={l} required={false} />)}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
          <strong className="text-slate-600">Score breakdown:</strong> required skills {match.breakdown.requiredCoverage}/60 · preferred {match.breakdown.preferredBonus}/15 ·
          location, experience and education make up the rest. <em>This is a skill-coverage estimate, not a guarantee of selection.</em>
        </div>
      </div>

      {/* Verification transparency */}
      <div className="card p-6">
        <h2 className="font-semibold text-slate-800">Verification signals</h2>
        <p className="mt-1 text-sm text-slate-500">{job.verificationReason || 'Automated analysis of public listing signals.'}</p>
        {job.verificationSignals.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
            {job.verificationSignals.map((s, i) => (
              <li key={i} className="flex gap-2"><span>{s.startsWith('⚠') ? '🚩' : '✓'}</span>{s.replace('⚠ ', '')}</li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-slate-400">
          Automated signal analysis only — SkillPath never claims a company is fraudulent. Always verify via the official careers page and never pay any fee.
        </p>
      </div>

      {/* Description */}
      <div className="card p-6">
        <h2 className="font-semibold text-slate-800">Job description</h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">{job.description}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {job.requiredSkills.map((s) => <Pill key={s} tone="brand">{s}</Pill>)}
          {job.preferredSkills.map((s) => <Pill key={s}>{s}</Pill>)}
        </div>
      </div>

      {!match.matched.length && (
        <EmptyState icon="🌱" title="Every expert was once a beginner" hint="Build your first skills on the Roadmap page and revisit this role." />
      )}
    </div>
  );
}
