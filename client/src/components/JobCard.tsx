import { Link } from 'react-router-dom';
import type { JobMatch } from '../types';
import { stipendLabel, daysUntil } from '../hooks';
import { MatchRing, Pill, SkillHave, SkillMissing, VerificationBadge } from './ui';

export function JobCard({ match, onSave, saveState }: { match: JobMatch; onSave?: (m: JobMatch) => void; saveState?: 'idle' | 'saving' | 'saved' | 'error' }) {
  const { job, score, matched, missingRequired } = match;
  const days = daysUntil(job.deadline);

  return (
    <div className="card flex flex-col gap-3 p-5 transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-800">{job.title}</h3>
            <Pill tone={job.workType === 'internship' ? 'brand' : 'slate'}>{job.workType === 'internship' ? 'Internship' : 'Job'}</Pill>
            <Pill>{job.remote === 'remote' ? '🏠 Remote' : job.remote === 'hybrid' ? '🔀 Hybrid' : '🏢 On-site'}</Pill>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {job.company} · {job.location}
          </p>
        </div>
        <MatchRing score={score} />
      </div>

      <div className="flex flex-wrap gap-1.5 text-sm">
        <span className="font-medium text-slate-700">{stipendLabel(job)}</span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-600">{job.experienceReq}</span>
        {days !== null && (
          <>
            <span className="text-slate-300">|</span>
            <span className={days <= 7 ? 'font-medium text-red-600' : 'text-slate-600'}>
              {days < 0 ? 'Deadline passed' : `${days}d left`}
            </span>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {matched.slice(0, 4).map((m) => (
          <SkillHave key={`have-${m.name}`} label={m.label} />
        ))}
        {missingRequired.slice(0, 3).map((label) => (
          <SkillMissing key={`miss-${label}`} label={label} />
        ))}
        {missingRequired.length > 3 && <Pill>+{missingRequired.length - 3} more gaps</Pill>}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <VerificationBadge status={job.verificationStatus} />
        <div className="flex gap-2">
          <Link to={`/jobs/${job.id}`} className="btn-secondary !px-3 !py-1.5 text-xs">
            Details
          </Link>
          {onSave && (
            <button
              onClick={() => onSave(match)}
              disabled={saveState === 'saving' || saveState === 'saved'}
              className="btn-primary !px-3 !py-1.5 text-xs"
            >
              {saveState === 'saved' ? '✓ Tracked' : saveState === 'saving' ? 'Saving…' : 'Track'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
