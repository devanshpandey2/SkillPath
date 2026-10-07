import type { ReactNode } from 'react';
import type { VerificationStatus } from '../types';

// ------------------------------------------------------------- feedback ----

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
      <div className="flex items-start justify-between gap-3">
        <span>⚠️ {message}</span>
        {onRetry && (
          <button onClick={onRetry} className="font-semibold underline underline-offset-2 hover:text-red-900">
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon: string; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
      <span className="text-4xl" aria-hidden>
        {icon}
      </span>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {hint && <p className="max-w-md text-sm text-slate-500">{hint}</p>}
      {action}
    </div>
  );
}

// --------------------------------------------------------------- badges ----

const VERIFICATION_META: Record<VerificationStatus, { icon: string; label: string; cls: string; title: string }> = {
  verified: { icon: '🟢', label: 'Verified', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', title: 'Posted by a registered recruiter with strong trust signals' },
  needs_review: { icon: '🟡', label: 'Needs review', cls: 'bg-amber-50 text-amber-700 border-amber-200', title: 'Automated checks could not confirm all trust signals' },
  flagged: { icon: '🔴', label: 'Potential concern', cls: 'bg-red-50 text-red-700 border-red-200', title: 'Automated analysis found risk signals — verify independently (this is not an accusation)' },
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const meta = VERIFICATION_META[status];
  return (
    <span title={meta.title} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${meta.cls}`}>
      {meta.icon} {meta.label}
    </span>
  );
}

export function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'amber' | 'brand' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    brand: 'bg-brand-50 text-brand-700 border-brand-200',
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function SkillHave({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
      ✓ {label}
    </span>
  );
}

export function SkillMissing({ label, required = true }: { label: string; required?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${
        required ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600'
      }`}
    >
      {required ? '⚠' : '+'} {label}
    </span>
  );
}

// ---------------------------------------------------------------- score ----

export function MatchRing({ score, size = 64 }: { score: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = clamped >= 75 ? '#059669' : clamped >= 50 ? '#d97706' : '#dc2626';
  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color} ${clamped * 3.6}deg, #e2e8f0 0deg)`,
      }}
      title="Skill match estimate — not a guarantee of selection"
    >
      <div className="flex h-[82%] w-[82%] items-center justify-center rounded-full bg-white text-sm font-bold" style={{ color }}>
        {Math.round(clamped)}%
      </div>
    </div>
  );
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-200 ${className}`}>
      <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${v}%` }} />
    </div>
  );
}

// ----------------------------------------------------------------- misc ----

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-800">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}
