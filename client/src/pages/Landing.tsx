import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="text-xl font-bold text-slate-800">
          🛤️ Skill<span className="text-brand-600">Path</span>
        </span>
        <div className="flex items-center gap-3">
          {user ? (
            <Link to="/dashboard" className="btn-primary">Go to dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn-secondary">Sign in</Link>
              <Link to="/register" className="btn-primary">Get started</Link>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <section className="py-14 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Stop scrolling listings. Start closing skill gaps.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            SkillPath tells Indian college students <strong>which internships fit you, what you're missing, and exactly what to learn next</strong> — not another job board.
          </p>
          {!user && (
            <div className="mt-8 flex justify-center gap-3">
              <Link to="/register" className="btn-primary !px-6 !py-3 text-base">Find my skill gaps →</Link>
              <Link to="/login" className="btn-secondary !px-6 !py-3 text-base">Try the demo</Link>
            </div>
          )}
        </section>

        <section className="grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: '🎯', title: 'Explainable matching', text: 'Every match shows your score, the skills you have, and the ones you need — with reasons, never guarantees.' },
            { icon: '🗺️', title: 'Week-by-week roadmap', text: 'A personalized plan from your current skills to your target role, ending in a portfolio project.' },
            { icon: '📄', title: 'Resume analysis', text: 'ATS-style checks, detected skills and role keyword gaps — without fabricating anything.' },
            { icon: '🛠️', title: 'Project recommendations', text: 'Projects chosen to fill your exact gaps and impress recruiters in your target role.' },
            { icon: '🟢', title: 'Listing verification', text: 'Transparent signals flag suspicious postings — fee demands, WhatsApp-only hiring and unrealistic pay.' },
            { icon: '📮', title: 'Application tracker', text: 'Saved → Applied → Assessment → Interview → Offer, with deadlines and interview dates.' },
          ].map((f) => (
            <div key={f.title} className="card p-6">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-3 font-semibold text-slate-800">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{f.text}</p>
            </div>
          ))}
        </section>

        <section className="py-10 text-center">
          <div className="mx-auto max-w-2xl rounded-2xl bg-slate-900 p-8 text-left text-slate-100">
            <div className="text-xs font-semibold uppercase tracking-widest text-brand-300">The central workflow</div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium">
              {['Student Profile', 'Target Role', 'Job Matching', 'Skill Gap', 'Learning Roadmap', 'Project', 'Application'].map((s, i) => (
                <span key={s} className="flex items-center gap-2">
                  {i > 0 && <span className="text-slate-500">→</span>}
                  <span className="rounded-full bg-slate-800 px-3 py-1">{s}</span>
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-300">
              From "I don't know what to learn" to "I know exactly what skills and projects I need for my target role."
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        SkillPath — built for Indian college students. Match percentages are skill-coverage estimates, not guarantees of selection.
      </footer>
    </div>
  );
}
