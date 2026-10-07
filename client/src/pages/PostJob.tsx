import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ErrorBanner, Pill, Spinner } from '../components/ui';

interface ParsedSpec {
  title?: string;
  company?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  minExperienceMonths?: number;
  minCGPA?: number | null;
  workType?: string;
  remote?: string;
  stipendMin?: number | null;
  stipendMax?: number | null;
  salaryMinLpa?: number | null;
  salaryMaxLpa?: number | null;
  location?: string | null;
  deadline?: string | null;
}

const PRETTY_SKILL: Record<string, string> = {
  ui_ux: 'UI/UX', rest_api: 'REST APIs', api: 'API', dsa: 'DSA', oop: 'OOP', sql: 'SQL',
  html: 'HTML', css: 'CSS', seo: 'SEO', cicd: 'CI/CD', nlp: 'NLP', aws: 'AWS',
};

function prettySkill(s: string): string {
  return PRETTY_SKILL[s] ?? s.split(/[ _]/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function PostJob() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', company: '', location: '', workType: 'internship', remote: 'onsite',
    stipendMin: '', stipendMax: '', salaryMinLpa: '', salaryMaxLpa: '',
    requiredSkills: '', preferredSkills: '', experienceReq: 'Fresher',
    minExperienceMonths: '0', educationReq: 'Any graduate', minCGPA: '', deadline: '', description: '',
  });
  const [busy, setBusy] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedHint, setParsedHint] = useState<ParsedSpec | null>(null);

  function set<K extends keyof typeof form>(key: K, v: string) {
    setForm((f) => ({ ...f, [key]: v }));
  }

  async function parseDescription() {
    if (form.description.trim().length < 40) {
      setError('Paste a longer description (at least 40 characters) to parse.');
      return;
    }
    setParsing(true);
    setError(null);
    try {
      const { parsed } = await api.jobs.parseDescription(form.description);
      const p = parsed as ParsedSpec;
      setParsedHint(p);
      setForm((f) => ({
        ...f,
        title: f.title || p.title || '',
        company: f.company || p.company || '',
        location: f.location || p.location || '',
        requiredSkills: f.requiredSkills || (p.requiredSkills ?? []).map(prettySkill).join(', '),
        preferredSkills: f.preferredSkills || (p.preferredSkills ?? []).map(prettySkill).join(', '),
        minCGPA: f.minCGPA || (p.minCGPA != null ? String(p.minCGPA) : ''),
        stipendMin: f.stipendMin || (p.stipendMin != null ? String(p.stipendMin) : ''),
        stipendMax: f.stipendMax || (p.stipendMax != null ? String(p.stipendMax) : ''),
        salaryMinLpa: f.salaryMinLpa || (p.salaryMinLpa != null ? String(p.salaryMinLpa) : ''),
        salaryMaxLpa: f.salaryMaxLpa || (p.salaryMaxLpa != null ? String(p.salaryMaxLpa) : ''),
        deadline: f.deadline || p.deadline || '',
        workType: f.workType !== 'internship' ? f.workType : (p.workType as string) ?? f.workType,
        remote: p.remote as string ?? f.remote,
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setParsing(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.jobs.post({
        title: form.title,
        company: form.company,
        location: form.location,
        workType: form.workType,
        remote: form.remote,
        stipendMin: form.stipendMin ? Number(form.stipendMin) : null,
        stipendMax: form.stipendMax ? Number(form.stipendMax) : null,
        salaryMinLpa: form.salaryMinLpa ? Number(form.salaryMinLpa) : null,
        salaryMaxLpa: form.salaryMaxLpa ? Number(form.salaryMaxLpa) : null,
        requiredSkills: form.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
        preferredSkills: form.preferredSkills.split(',').map((s) => s.trim()).filter(Boolean),
        experienceReq: form.experienceReq,
        minExperienceMonths: Number(form.minExperienceMonths) || 0,
        educationReq: form.educationReq,
        minCGPA: form.minCGPA ? Number(form.minCGPA) : null,
        deadline: form.deadline || null,
        description: form.description,
      });
      navigate('/recruiter');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pt-2 lg:pt-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Post an opportunity</h1>
        <p className="mt-1 text-sm text-slate-500">Detailed listings with concrete skills build trust and match better.</p>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="card p-6">
        <label className="label">Paste an existing job description to auto-fill (optional)</label>
        <textarea className="input min-h-[100px] text-sm" placeholder="Paste JD text here — we'll extract skills, title and requirements…" value={form.description} onChange={(e) => set('description', e.target.value)} />
        <button type="button" onClick={parseDescription} disabled={parsing} className="btn-secondary mt-2 !py-1.5 text-xs">
          {parsing ? 'Parsing…' : '✨ Auto-fill from description'}
        </button>
        {parsedHint && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Pill tone="brand">Extracted {(parsedHint.requiredSkills ?? []).length} skills</Pill>
            {(parsedHint.requiredSkills ?? []).slice(0, 6).map((s) => <Pill key={s}>{prettySkill(s)}</Pill>)}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="card space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Job title *</label><input required className="input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Frontend Developer Intern" /></div>
          <div><label className="label">Company *</label><input required className="input" value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="Zencart Technologies" /></div>
          <div><label className="label">Location *</label><input required className="input" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Bengaluru, Karnataka" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type *</label>
              <select className="input" value={form.workType} onChange={(e) => set('workType', e.target.value)}>
                <option value="internship">Internship</option>
                <option value="job">Full-time job</option>
              </select>
            </div>
            <div>
              <label className="label">Mode *</label>
              <select className="input" value={form.remote} onChange={(e) => set('remote', e.target.value)}>
                <option value="onsite">On-site</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Stipend min (₹/mo)</label><input className="input" type="number" min={0} value={form.stipendMin} onChange={(e) => set('stipendMin', e.target.value)} /></div>
            <div><label className="label">Stipend max (₹/mo)</label><input className="input" type="number" min={0} value={form.stipendMax} onChange={(e) => set('stipendMax', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Salary min (LPA)</label><input className="input" type="number" min={0} step={0.5} value={form.salaryMinLpa} onChange={(e) => set('salaryMinLpa', e.target.value)} /></div>
            <div><label className="label">Salary max (LPA)</label><input className="input" type="number" min={0} step={0.5} value={form.salaryMaxLpa} onChange={(e) => set('salaryMaxLpa', e.target.value)} /></div>
          </div>
          <div><label className="label">Required skills * (comma-separated)</label><input required className="input" value={form.requiredSkills} onChange={(e) => set('requiredSkills', e.target.value)} placeholder="React, JavaScript, Git" /></div>
          <div><label className="label">Preferred skills</label><input className="input" value={form.preferredSkills} onChange={(e) => set('preferredSkills', e.target.value)} placeholder="TypeScript, REST APIs" /></div>
          <div><label className="label">Experience requirement</label><input className="input" value={form.experienceReq} onChange={(e) => set('experienceReq', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Min exp (months)</label><input className="input" type="number" min={0} value={form.minExperienceMonths} onChange={(e) => set('minExperienceMonths', e.target.value)} /></div>
            <div><label className="label">Min CGPA</label><input className="input" type="number" min={0} max={10} step={0.1} value={form.minCGPA} onChange={(e) => set('minCGPA', e.target.value)} /></div>
          </div>
          <div><label className="label">Education requirement</label><input className="input" value={form.educationReq} onChange={(e) => set('educationReq', e.target.value)} /></div>
          <div><label className="label">Application deadline</label><input className="input" type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} /></div>
          <div className="sm:col-span-2">
            <label className="label">Full description * (min 80 chars)</label>
            <textarea required className="input min-h-[160px]" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Responsibilities, requirements, culture, application process…" />
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          New listings run through automated verification before going live — concrete pay, detailed descriptions and official channels build trust with students.
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Publishing…' : 'Publish listing'}</button>
          <Link to="/recruiter" className="btn-secondary">Cancel</Link>
        </div>
      </form>

      {parsing && <Spinner label="Extracting requirements…" />}
    </div>
  );
}
