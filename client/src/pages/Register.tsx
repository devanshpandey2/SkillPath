import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function validate(): string | null {
    if (form.name.trim().length < 2) return 'Please enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return 'Please enter a valid email address';
    if (form.password.length < 8) return 'Password must be at least 8 characters';
    if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) return 'Password must include letters and numbers';
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const user = await register(form);
      navigate(user.role === 'recruiter' ? '/recruiter' : user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-4xl">🛤️</div>
          <h1 className="mt-2 text-2xl font-bold text-slate-800">
            Join Skill<span className="text-brand-600">Path</span>
          </h1>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800">Create your account</h2>
          {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">⚠️ {error}</div>}
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="name">Full name</label>
              <input id="name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Aarav Sharma" />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@college.edu" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 chars, letters + numbers" />
              <p className="mt-1 text-xs text-slate-400">At least 8 characters with letters and numbers.</p>
            </div>
            <div>
              <label className="label">I am a</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 'student', l: '🎒 Student' },
                  { v: 'recruiter', l: '🏢 Recruiter' },
                  { v: 'admin', l: '🛡️ Admin' },
                ].map((r) => (
                  <button
                    key={r.v}
                    type="button"
                    onClick={() => setForm({ ...form, role: r.v })}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                      form.role === r.v ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {r.l}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
