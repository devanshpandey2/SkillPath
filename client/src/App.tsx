import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Spinner } from './components/ui';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Jobs } from './pages/Jobs';
import { JobDetail } from './pages/JobDetail';
import { SkillGap } from './pages/SkillGap';
import { Roadmap } from './pages/Roadmap';
import { Projects } from './pages/Projects';
import { Resume } from './pages/Resume';
import { Applications } from './pages/Applications';
import { Profile } from './pages/Profile';
import { Recruiter } from './pages/Recruiter';
import { PostJob } from './pages/PostJob';
import { Admin } from './pages/Admin';

function Protected({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Loading your workspace…" />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/jobs" element={<Protected><Jobs /></Protected>} />
      <Route path="/jobs/:id" element={<Protected><JobDetail /></Protected>} />
      <Route path="/skill-gap" element={<Protected><SkillGap /></Protected>} />
      <Route path="/roadmap" element={<Protected><Roadmap /></Protected>} />
      <Route path="/projects" element={<Protected><Projects /></Protected>} />
      <Route path="/resume" element={<Protected><Resume /></Protected>} />
      <Route path="/applications" element={<Protected><Applications /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />

      <Route path="/recruiter" element={<Protected roles={['recruiter', 'admin']}><Recruiter /></Protected>} />
      <Route path="/recruiter/post" element={<Protected roles={['recruiter', 'admin']}><PostJob /></Protected>} />
      <Route path="/admin" element={<Protected roles={['admin']}><Admin /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
