import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAsync } from '../hooks';
import { useAuth } from '../context/AuthContext';
import { EmptyState, ErrorBanner, Pill, Spinner, VerificationBadge } from '../components/ui';

export function Recruiter() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useAsync(() => api.jobs.mine(), []);

  if (loading) return <Spinner label="Loading your postings…" />;
  if (error) return <ErrorBanner message={error} onRetry={refetch} />;

  const jobs = data?.jobs ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-5 pt-2 lg:pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{user?.companyName || 'Your'} postings</h1>
          <p className="mt-1 text-sm text-slate-500">Listings you've posted and their verification status.</p>
        </div>
        <Link to="/recruiter/post" className="btn-primary">+ Post internship / job</Link>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon="🏢"
          title="No postings yet"
          hint="Create your first listing with required and preferred skills — students get matched automatically."
          action={<Link to="/recruiter/post" className="btn-primary mt-3">Post your first job</Link>}
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((j) => (
            <div key={j.id} className="card flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-800">{j.title}</span>
                  <Pill tone={j.workType === 'internship' ? 'brand' : 'slate'}>{j.workType}</Pill>
                  <VerificationBadge status={j.verificationStatus} />
                </div>
                <p className="mt-1 text-sm text-slate-500">{j.location} · {j.remote} · {j.requiredSkills.slice(0, 4).join(', ')}</p>
              </div>
              <div className="text-right text-xs text-slate-400">
                {j.deadline && <div>Deadline {j.deadline}</div>}
                <div>Posted {new Date(j.createdAt).toLocaleDateString('en-IN')}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
