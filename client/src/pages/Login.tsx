import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'recruiter' ? '/recruiter' : user.role === 'admin' ? '/admin' : (location.state?.from as string) || '/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function fillDemo(kind: 'student' | 'recruiter' | 'admin') {
    setEmail(kind === 'student' ? 'aarav@student.dev' : kind === 'recruiter' ? 'priya@zencart.dev' : 'admin@skillpath.dev');
    setPassword('password123');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-4xl">🛤️</div>
          <h1 className="mt-2 text-2xl font-bold text-slate-800">
            Skill<span className="text-brand-600">Path</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Which opportunities fit you, what are you missing, and what should you do next?</p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-800">Sign in</h2>
          {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">⚠️ {error}</div>}
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Demo accounts (password: password123)</div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => fillDemo('student')} className="btn-secondary !px-2 !py-1.5 text-xs">🎒 Student</button>
              <button onClick={() => fillDemo('recruiter')} className="btn-secondary !px-2 !py-1.5 text-xs">🏢 Recruiter</button>
              <button onClick={() => fillDemo('admin')} className="btn-secondary !px-2 !py-1.5 text-xs">🛡️ Admin</button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          New here?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
