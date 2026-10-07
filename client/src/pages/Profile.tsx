import { useEffect, useState } from 'react';
import { api } from '../api';
import { useAsync } from '../hooks';
import { ErrorBanner, Pill, ProgressBar, Spinner } from '../components/ui';
import type { ProfileProject, RoleDef, SkillEntry, SkillLevel, StudentProfile } from '../types';

const ALL_LOCATIONS = ['Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune', 'Chennai', 'Kolkata', 'Ahmedabad', 'Remote (India)'];

export function Profile() {
  const { data, loading, error, refetch } = useAsync(() => api.profile.get(), []);
  const [form, setForm] = useState<Partial<StudentProfile>>({});
  const [newSkill, setNewSkill] = useState('');
  const [newLevel, setNewLevel] = useState<SkillLevel>('intermediate');
  const [newProject, setNewProject] = useState<ProfileProject>({ title: '', description: '', techStack: [], link: '' });
  const [newCert, setNewCert] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  useEffect(() => {
    if (data?.profile) setForm(data.profile);
  }, [data]);

  if (loading) return <Spinner label="Loading your profile…" />;
  if (error) return <ErrorBanner message={error} onRetry={refetch} />;
  if (!data?.profile) {
    return (
      <div className="mx-auto max-w-3xl pt-10">
        <ErrorBanner message="Profile not available for this account type." />
      </div>
    );
  }

  const roles: RoleDef[] = data.roles;
  const skills: SkillEntry[] = form.skills ?? [];

  function set<K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setSaveErr(null);
    try {
      const { profile } = await api.profile.update(form as Record<string, unknown>);
      setForm(profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setSaveErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function addSkill() {
    const name = newSkill.trim();
    if (!name) return;
    if (skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    set('skills', [...skills, { name, level: newLevel, source: 'manual' }]);
    setNewSkill('');
  }

  const completeness = Math.round(
    ([Boolean(form.name), Boolean(form.college), Boolean(form.degree), Boolean(form.branch), form.gradYear !== null, form.cgpa !== null,
      (form.skills?.length ?? 0) >= 3, (form.projects?.length ?? 0) > 0, Boolean(form.github), Boolean(form.targetRoleId),
      (form.preferredLocations?.length ?? 0) > 0].filter(Boolean).length / 11) * 100
  );

  return (
    <div className="mx-auto max-w-4xl space-y-5 pt-2 lg:pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My profile</h1>
          <p className="mt-1 text-sm text-slate-500">Everything here feeds your match scores and roadmap.</p>
        </div>
        <div className="w-40">
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>Completeness</span><span className="font-semibold text-brand-600">{completeness}%</span>
          </div>
          <ProgressBar value={completeness} />
        </div>
      </div>

      {saveErr && <ErrorBanner message={saveErr} />}
      {saved && <div className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">✓ Profile saved</div>}

      {/* Basics */}
      <section className="card p-6">
        <h2 className="font-semibold text-slate-800">Basics</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label className="label">Full name</label><input className="input" value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></div>
          <div><label className="label">College</label><input className="input" value={form.college ?? ''} onChange={(e) => set('college', e.target.value)} placeholder="e.g. VJTI Mumbai" /></div>
          <div>
            <label className="label">Degree</label>
            <select className="input" value={form.degree ?? ''} onChange={(e) => set('degree', e.target.value)}>
              <option value="">Select…</option>
              {['B.Tech', 'B.E.', 'B.Sc', 'BCA', 'M.Tech', 'MCA', 'M.Sc'].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div><label className="label">Branch</label><input className="input" value={form.branch ?? ''} onChange={(e) => set('branch', e.target.value)} placeholder="e.g. Computer Engineering" /></div>
          <div><label className="label">Graduation year</label><input className="input" type="number" min={2000} max={2100} value={form.gradYear ?? ''} onChange={(e) => set('gradYear', e.target.value ? Number(e.target.value) : null)} /></div>
          <div><label className="label">CGPA (out of 10)</label><input className="input" type="number" step={0.01} min={0} max={10} value={form.cgpa ?? ''} onChange={(e) => set('cgpa', e.target.value ? Number(e.target.value) : null)} /></div>
        </div>
      </section>

      {/* Target role & preferences */}
      <section className="card p-6">
        <h2 className="font-semibold text-slate-800">Target & preferences</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Target role</label>
            <select className="input" value={form.targetRoleId ?? ''} onChange={(e) => set('targetRoleId', e.target.value || null)}>
              <option value="">Not set</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
            {form.targetRoleId && (
              <p className="mt-1 text-xs text-slate-400">{roles.find((r) => r.id === form.targetRoleId)?.blurb}</p>
            )}
          </div>
          <div>
            <label className="label">Work mode preference</label>
            <select className="input" value={form.remotePref ?? 'any'} onChange={(e) => set('remotePref', e.target.value as StudentProfile['remotePref'])}>
              <option value="any">Any</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Preferred locations</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_LOCATIONS.map((loc) => {
                const active = (form.preferredLocations ?? []).includes(loc);
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => set('preferredLocations', active ? (form.preferredLocations ?? []).filter((l) => l !== loc) : [...(form.preferredLocations ?? []), loc])}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>
          </div>
          <div><label className="label">GitHub</label><input className="input" value={form.github ?? ''} onChange={(e) => set('github', e.target.value)} placeholder="github.com/you" /></div>
          <div><label className="label">LinkedIn</label><input className="input" value={form.linkedin ?? ''} onChange={(e) => set('linkedin', e.target.value)} placeholder="linkedin.com/in/you" /></div>
        </div>
      </section>

      {/* Skills */}
      <section className="card p-6">
        <h2 className="font-semibold text-slate-800">Skills</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.length === 0 && <p className="text-sm text-slate-400">No skills yet — add at least 3 for accurate matching.</p>}
          {skills.map((s) => (
            <span key={s.name} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${s.source === 'resume' ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
              {s.name}
              <span className="text-[10px] uppercase text-slate-400">{s.level}</span>
              <button onClick={() => set('skills', skills.filter((x) => x.name !== s.name))} className="text-slate-400 hover:text-red-500" aria-label={`Remove ${s.name}`}>×</button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className="input max-w-[200px]" placeholder="Add a skill (e.g. React)" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} />
          <select className="input max-w-[140px]" value={newLevel} onChange={(e) => setNewLevel(e.target.value as SkillLevel)}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
          <button type="button" onClick={addSkill} className="btn-secondary">Add</button>
        </div>
      </section>

      {/* Projects */}
      <section className="card p-6">
        <h2 className="font-semibold text-slate-800">Projects</h2>
        <div className="mt-3 space-y-3">
          {(form.projects ?? []).map((p, i) => (
            <div key={i} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3">
              <div>
                <div className="text-sm font-semibold text-slate-700">{p.title}</div>
                <div className="text-xs text-slate-500">{p.description}</div>
                {p.techStack.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{p.techStack.map((t) => <Pill key={t}>{t}</Pill>)}</div>}
              </div>
              <button onClick={() => set('projects', (form.projects ?? []).filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">×</button>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input className="input" placeholder="Project title" value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} />
          <input className="input" placeholder="Link (GitHub/live)" value={newProject.link} onChange={(e) => setNewProject({ ...newProject, link: e.target.value })} />
          <input className="input sm:col-span-2" placeholder="One-line description" value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} />
          <input className="input sm:col-span-2" placeholder="Tech stack (comma-separated)" value={newProject.techStack.join(', ')} onChange={(e) => setNewProject({ ...newProject, techStack: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
        </div>
        <button
          type="button"
          onClick={() => {
            if (!newProject.title) return;
            set('projects', [...(form.projects ?? []), newProject]);
            setNewProject({ title: '', description: '', techStack: [], link: '' });
          }}
          className="btn-secondary mt-3"
        >
          + Add project
        </button>
      </section>

      {/* Certifications */}
      <section className="card p-6">
        <h2 className="font-semibold text-slate-800">Certifications</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(form.certifications ?? []).map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
              🎓 {c}
              <button onClick={() => set('certifications', (form.certifications ?? []).filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">×</button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input className="input max-w-xs" placeholder="e.g. AWS Cloud Practitioner" value={newCert} onChange={(e) => setNewCert(e.target.value)} onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (newCert.trim()) {
                set('certifications', [...(form.certifications ?? []), newCert.trim()]);
                setNewCert('');
              }
            }
          }} />
          <button type="button" onClick={() => { if (newCert.trim()) { set('certifications', [...(form.certifications ?? []), newCert.trim()]); setNewCert(''); } }} className="btn-secondary">Add</button>
        </div>
      </section>

      <div className="sticky bottom-4 flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary shadow-lg">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save profile'}
        </button>
      </div>
    </div>
  );
}
