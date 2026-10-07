import { useState } from 'react';
import { api } from '../api';
import { useAsync } from '../hooks';
import { JobCard } from '../components/JobCard';
import { EmptyState, ErrorBanner, Spinner } from '../components/ui';
import type { JobMatch } from '../types';

const WORK_TYPES = [
  { v: '', l: 'All' },
  { v: 'internship', l: 'Internships' },
  { v: 'job', l: 'Jobs' },
];
const REMOTE_OPTS = [
  { v: '', l: 'Any' },
  { v: 'remote', l: 'Remote' },
  { v: 'hybrid', l: 'Hybrid' },
  { v: 'onsite', l: 'On-site' },
];
const MATCH_TIERS = [
  { v: '', l: 'Any match' },
  { v: '50', l: '50%+' },
  { v: '65', l: '65%+' },
  { v: '80', l: '80%+' },
];
const VERIFICATION_OPTS = [
  { v: '', l: 'All listings' },
  { v: 'verified', l: '🟢 Verified only' },
];

export function Jobs() {
  const [workType, setWorkType] = useState('');
  const [remote, setRemote] = useState('');
  const [minMatch, setMinMatch] = useState('');
  const [verification, setVerification] = useState('');
  const [location, setLocation] = useState('');
  const [skill, setSkill] = useState('');
  const [minStipend, setMinStipend] = useState('');

  const { data, loading, error, refetch } = useAsync<JobMatch[]>(async () => {
    const filters: Record<string, string> = {};
    if (workType) filters.workType = workType;
    if (remote) filters.remote = remote;
    if (minMatch) filters.minMatch = minMatch;
    if (verification) filters.verification = verification;
    if (location) filters.location = location;
    if (skill) filters.skills = skill;
    if (minStipend) filters.minStipend = minStipend;
    const res = await api.matching.jobs(filters);
    return res.matches;
  }, [workType, remote, minMatch, verification, location, skill, minStipend]);

  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);

  async function track(m: JobMatch) {
    setSavingId(m.job.id);
    setSaveError(null);
    try {
      await api.applications.create({
        jobId: m.job.id,
        company: m.job.company,
        role: m.job.title,
        status: 'saved',
        deadline: m.job.deadline,
      });
      setSavedIds((s) => new Set(s).add(m.job.id));
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 pt-2 lg:pt-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Opportunities ranked for you</h1>
        <p className="mt-1 text-sm text-slate-500">Sorted by skill-match score. Match % is a skill-coverage estimate — never a guarantee of selection.</p>
      </div>

      {/* Filters */}
      <div className="card grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-7">
        <div>
          <label className="label">Type</label>
          <select className="input" value={workType} onChange={(e) => setWorkType(e.target.value)}>
            {WORK_TYPES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Work mode</label>
          <select className="input" value={remote} onChange={(e) => setRemote(e.target.value)}>
            {REMOTE_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Min match</label>
          <select className="input" value={minMatch} onChange={(e) => setMinMatch(e.target.value)}>
            {MATCH_TIERS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Trust</label>
          <select className="input" value={verification} onChange={(e) => setVerification(e.target.value)}>
            {VERIFICATION_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Location</label>
          <input className="input" placeholder="e.g. Bengaluru" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <label className="label">Skill</label>
          <input className="input" placeholder="e.g. React" value={skill} onChange={(e) => setSkill(e.target.value)} />
        </div>
        <div>
          <label className="label">Min stipend (₹)</label>
          <input className="input" type="number" min={0} placeholder="e.g. 20000" value={minStipend} onChange={(e) => setMinStipend(e.target.value)} />
        </div>
      </div>

      {saveError && <ErrorBanner message={`Could not track: ${saveError}`} />}
      {loading && <Spinner label="Scoring listings against your profile…" />}
      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {!loading && !error && data && (
        <>
          <div className="text-sm text-slate-500">{data.length} listings match your filters</div>
          {data.length === 0 ? (
            <EmptyState icon="🔍" title="No listings match" hint="Try relaxing a filter or two — or widen your skills in your profile." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.map((m) => (
                <JobCard
                  key={m.job.id}
                  match={m}
                  onSave={track}
                  saveState={savedIds.has(m.job.id) ? 'saved' : savingId === m.job.id ? 'saving' : 'idle'}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
