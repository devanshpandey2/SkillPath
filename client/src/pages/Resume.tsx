import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAsync } from '../hooks';
import { ErrorBanner, Pill, ProgressBar, Spinner } from '../components/ui';
import type { ResumeAnalysis } from '../types';

export function Resume() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [filename, setFilename] = useState<string>('');

  const { data: profileData } = useAsync(() => api.profile.get(), []);
  const targetRoleId = profileData?.profile?.targetRoleId ?? null;

  async function analyze(t: string, name: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await api.resume.analyzeText(t, targetRoleId);
      setAnalysis(res.analysis);
      setFilename(name);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (/\.(txt|md)$/i.test(f.name)) {
      const t = await f.text();
      await analyze(t, f.name);
    } else {
      // PDF/DOCX: send to server for best-effort extraction
      setBusy(true);
      setErr(null);
      try {
        const res = await api.resume.analyzeFile(f, targetRoleId);
        setAnalysis(res.analysis);
        setFilename(res.filename);
      } catch (e2) {
        setErr((e2 as Error).message);
      } finally {
        setBusy(false);
      }
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pt-2 lg:pt-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Resume analysis</h1>
        <p className="mt-1 text-sm text-slate-500">
          Resume → detected skills → target role → gaps. We only report what's actually in your resume — nothing is invented.
        </p>
      </div>

      <div className="card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="file">Upload resume (.txt / .md recommended)</label>
            <input id="file" type="file" accept=".txt,.md,.pdf,.doc,.docx" onChange={onFile} className="input !py-1.5 text-sm" />
            <p className="mt-1 text-xs text-slate-400">PDF/DOCX text extraction is best-effort — pasting text below is more reliable.</p>
          </div>
          <div className="text-xs text-slate-400 sm:text-right sm:self-end">
            Target role: <strong className="text-slate-600">{profileData?.roles.find((r) => r.id === targetRoleId)?.title ?? 'not set'}</strong>{' '}
            {!targetRoleId && <Link to="/profile" className="font-medium text-brand-600 hover:underline">set one →</Link>}
          </div>
        </div>

        <div className="mt-4">
          <label className="label" htmlFor="rtext">…or paste resume text</label>
          <textarea
            id="rtext"
            className="input min-h-[140px] font-mono text-xs"
            placeholder="Paste the full text of your resume here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button onClick={() => analyze(text, 'pasted text')} disabled={busy || text.trim().length < 80} className="btn-primary mt-3">
            {busy ? 'Analyzing…' : 'Analyze resume'}
          </button>
        </div>

        {err && <div className="mt-3"><ErrorBanner message={err} /></div>}
      </div>

      {busy && <Spinner label="Reviewing your resume…" />}

      {analysis && (
        <div className="space-y-5">
          <div className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-800">Analysis{filename ? ` — ${filename}` : ''}</h2>
                <p className="mt-0.5 text-sm text-slate-500">{analysis.summary}</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-brand-600">{analysis.atsScore}</div>
                <div className="text-xs text-slate-400">ATS-style score</div>
              </div>
            </div>
            <ProgressBar value={analysis.atsScore} className="mt-4" />
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill tone={analysis.generatedBy === 'llm' ? 'brand' : 'slate'}>
                {analysis.generatedBy === 'llm' ? '✨ AI-reviewed' : 'Rule-based analysis'}
              </Pill>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800">Skills detected</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {analysis.skillsDetected.length ? analysis.skillsDetected.map((s) => <Pill key={s} tone="green">{pretty(s)}</Pill>) : <p className="text-sm text-slate-400">No known skills detected — add concrete skill names.</p>}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800">Sections</h3>
              <div className="mt-2 space-y-1.5 text-sm">
                {analysis.sectionsFound.map((s) => <div key={s} className="text-emerald-700">✓ {s}</div>)}
                {analysis.sectionsMissing.map((s) => <div key={s} className="text-amber-700">⚠ Missing: {s}</div>)}
              </div>
            </div>
            {analysis.certificationsDetected.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-slate-800">Certifications found</h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {analysis.certificationsDetected.map((c, i) => <li key={i}>🎓 {c}</li>)}
                </ul>
              </div>
            )}
            {analysis.projectsDetected.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-slate-800">Projects detected</h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {analysis.projectsDetected.slice(0, 5).map((p, i) => <li key={i}>🛠️ {p}</li>)}
                </ul>
              </div>
            )}
            {analysis.keywordsMissing.length > 0 && (
              <div className="card p-5 md:col-span-2">
                <h3 className="font-semibold text-slate-800">Keywords missing for your target role</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {analysis.keywordsMissing.map((k) => <Pill key={k} tone="amber">{k}</Pill>)}
                </div>
                <p className="mt-2 text-xs text-slate-400">Only add keywords for skills you genuinely have — never fabricate.</p>
              </div>
            )}
            {analysis.issues.length > 0 && (
              <div className="card p-5 md:col-span-2">
                <h3 className="font-semibold text-slate-800">Formatting & content issues</h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {analysis.issues.map((i, idx) => <li key={idx} className="flex gap-2"><span className="text-amber-500">⚠</span>{i}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function pretty(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
