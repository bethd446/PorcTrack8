import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Landing from '../pages/Landing';

export default function SmartRoot() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: 'var(--bg-app, #f0f4f3)' }}
      >
        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted, #6B7280)' }}>
          Chargement…
        </p>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/cockpit" replace />;
  }

  return <Landing />;
}
