import { useState } from 'react';
import { api } from '../api';
import { useAsync, daysUntil } from '../hooks';
import { EmptyState, ErrorBanner, Pill, Spinner } from '../components/ui';
import type { Application, ApplicationStatus } from '../types';

const PIPELINE: Array<{ key: ApplicationStatus; label: string; icon: string }> = [
  { key: 'saved', label: 'Saved', icon: '🔖' },
  { key: 'applied', label: 'Applied', icon: '📤' },
  { key: 'assessment', label: 'Assessment', icon: '🧪' },
  { key: 'interview', label: 'Interview', icon: '🎤' },
  { key: 'offer', label: 'Offer', icon: '🎉' },
  { key: 'rejected', label: 'Rejected', icon: '📁' },
];

export function Applications() {
  const { data, loading, error, refetch } = useAsync(() => api.applications.list(), []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [dateDraft, setDateDraft] = useState('');

  async function move(a: Application, status: ApplicationStatus) {
    setBusyId(a.id);
    try {
      await api.applications.update(a.id, { status, appliedDate: status !== 'saved' && !a.appliedDate ? new Date().toISOString().slice(0, 10) : a.appliedDate });
      await refetch();
    } finally {
      setBusyId(null);
    }
  }

  async function saveDetails(a: Application) {
    setBusyId(a.id);
    try {
      await api.applications.update(a.id, { notes: noteDraft, interviewDate: dateDraft || null });
      setExpanded(null);
      await refetch();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <Spinner label="Loading your applications…" />;
  if (error) return <ErrorBanner message={error} onRetry={refetch} />;

  const apps = data?.applications ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-5 pt-2 lg:pt-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Application tracker</h1>
        <p className="mt-1 text-sm text-slate-500">Every opportunity you're pursuing, from saved to offer.</p>
      </div>

      {apps.length === 0 ? (
        <EmptyState
          icon="📮"
          title="Nothing tracked yet"
          hint="Save opportunities from the Jobs page and manage your pipeline here."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map((stage) => {
            const items = apps.filter((a) => a.status === stage.key);
            return (
              <div key={stage.key} className="rounded-xl bg-slate-100/70 p-3">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold text-slate-700">{stage.icon} {stage.label}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((a) => {
                    const dl = daysUntil(a.deadline);
                    return (
                      <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-card">
                        <div className="text-sm font-semibold text-slate-800">{a.role}</div>
                        <div className="text-xs text-slate-500">{a.company}</div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {a.deadline && dl !== null && dl >= 0 && (
                            <Pill tone={dl <= 7 ? 'amber' : 'slate'}>{dl === 0 ? 'Due today' : `${dl}d to deadline`}</Pill>
                          )}
                          {a.interviewDate && <Pill tone="brand">🎤 {a.interviewDate}</Pill>}
                        </div>
                        {a.notes && <p className="mt-2 line-clamp-2 text-xs text-slate-500">{a.notes}</p>}

                        <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-100 pt-2">
                          {PIPELINE.filter((s) => s.key !== a.status).slice(0, 3).map((s) => (
                            <button
                              key={s.key}
                              onClick={() => move(a, s.key)}
                              disabled={busyId === a.id}
                              className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-brand-50 hover:text-brand-700"
                            >
                              → {s.label}
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              setExpanded(expanded === a.id ? null : a.id);
                              setNoteDraft(a.notes);
                              setDateDraft(a.interviewDate ?? '');
                            }}
                            className="ml-auto rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-400 hover:text-slate-700"
                          >
                            {expanded === a.id ? 'Close' : 'Edit'}
                          </button>
                        </div>

                        {expanded === a.id && (
                          <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
                            <textarea
                              className="input min-h-[60px] text-xs"
                              placeholder="Notes (rounds, contacts, reminders…)"
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                            />
                            <input type="date" className="input text-xs" value={dateDraft} onChange={(e) => setDateDraft(e.target.value)} aria-label="Interview date" />
                            <div className="flex gap-2">
                              <button onClick={() => saveDetails(a)} disabled={busyId === a.id} className="btn-primary !px-2 !py-1 text-[11px]">Save</button>
                              <button
                                onClick={async () => {
                                  await api.applications.remove(a.id);
                                  await refetch();
                                }}
                                className="btn-danger !px-2 !py-1 text-[11px]"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
