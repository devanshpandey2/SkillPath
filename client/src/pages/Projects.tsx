import { api } from '../api';
import { useAsync } from '../hooks';
import { EmptyState, ErrorBanner, Pill, Spinner } from '../components/ui';

type ProjectsResponse = Awaited<ReturnType<typeof api.projects.recommendations>>;

const DIFFICULTY_TONE = {
  beginner: 'green',
  intermediate: 'amber',
  advanced: 'brand',
} as const;

export function Projects() {
  const { data, loading, error, refetch } = useAsync<ProjectsResponse>(() => api.projects.recommendations(), []);

  if (loading) return <Spinner label="Finding projects that close your gaps…" />;
  if (error) return <ErrorBanner message={error} onRetry={refetch} />;
  if (!data) return null;

  if (data.recommendations.length === 0) {
    return (
      <div className="mx-auto max-w-3xl pt-10">
        <EmptyState icon="🛠️" title="No recommendations yet" hint="Set a target role in your profile to get personalized project ideas." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pt-2 lg:pt-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Projects for {data.role.title}</h1>
        <p className="mt-1 text-sm text-slate-500">Chosen to demonstrate the skills you're missing — build these and your profile proves itself.</p>
        {data.missingSkills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Closing gaps:</span>
            {data.missingSkills.map((s) => <Pill key={s} tone="amber">{s}</Pill>)}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.recommendations.map((p) => (
          <div key={p.id} className="card flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold text-slate-800">{p.title}</h2>
              <Pill tone={DIFFICULTY_TONE[p.difficulty]}>{p.difficulty}</Pill>
            </div>
            <p className="mt-2 text-sm text-slate-500">{p.why}</p>
            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Skills demonstrated</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {p.skillsDemonstrated.map((s) => <Pill key={s} tone="brand">{s}</Pill>)}
              </div>
            </div>
            {p.features.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                {p.features.slice(0, 4).map((f, i) => (
                  <li key={i} className="flex gap-2"><span className="text-brand-500">▸</span>{f}</li>
                ))}
              </ul>
            )}
            <div className="mt-auto pt-3 text-xs text-slate-400">
              ⏱️ ~{p.estimatedWeeks} {p.estimatedWeeks === 1 ? 'week' : 'weeks'}
              {p.generatedBy === 'llm' && <span className="ml-2 text-brand-500">✨ AI-suggested</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
