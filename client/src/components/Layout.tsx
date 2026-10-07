import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STUDENT_NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/jobs', label: 'Jobs', icon: '💼' },
  { to: '/skill-gap', label: 'Skill Gap', icon: '🎯' },
  { to: '/roadmap', label: 'Roadmap', icon: '🗺️' },
  { to: '/projects', label: 'Projects', icon: '🛠️' },
  { to: '/resume', label: 'Resume', icon: '📄' },
  { to: '/applications', label: 'Applications', icon: '📮' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

const RECRUITER_NAV = [
  { to: '/recruiter', label: 'Recruiter Home', icon: '🏢' },
  { to: '/recruiter/post', label: 'Post a Job', icon: '➕' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

const ADMIN_NAV = [
  { to: '/admin', label: 'Admin Console', icon: '🛡️' },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const nav = !user ? [] : user.role === 'student' ? STUDENT_NAV : user.role === 'recruiter' ? RECRUITER_NAV : ADMIN_NAV;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="text-2xl">🛤️</span>
          <span className="text-lg font-bold tracking-tight text-slate-800">
            Skill<span className="text-brand-600">Path</span>
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }`
              }
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        {user && (
          <div className="border-t border-slate-200 p-4">
            <div className="mb-2 truncate text-sm font-medium text-slate-700">{user.name}</div>
            <div className="mb-3 truncate text-xs text-slate-400">{user.email}</div>
            <button
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="btn-secondary w-full !py-1.5 text-xs"
            >
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* Mobile topbar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <span className="text-base font-bold text-slate-800">
          🛤️ Skill<span className="text-brand-600">Path</span>
        </span>
        <button onClick={() => setOpen(!open)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Toggle menu">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="text-slate-600">
            <path d="M2 4.5h16M2 10h16M2 15.5h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="mt-12 space-y-1 bg-white p-3" onClick={(e) => e.stopPropagation()}>
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600'
                  }`
                }
              >
                <span>{item.icon}</span> {item.label}
              </NavLink>
            ))}
            {user && (
              <button onClick={() => logout().then(() => navigate('/login'))} className="btn-secondary w-full">
                Sign out
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="w-full px-4 pb-16 pt-16 lg:ml-60 lg:max-w-[calc(100%-15rem)] lg:px-8 lg:pt-8">{children}</main>
    </div>
  );
}
