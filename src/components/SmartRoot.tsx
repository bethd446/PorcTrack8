import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Landing from '../pages/Landing';

export default function SmartRoot() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0D0C]">
        <p className="text-xs uppercase tracking-widest text-[#A8B3B8]">Chargement…</p>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/cockpit" replace />;
  }

  return <Landing />;
}
