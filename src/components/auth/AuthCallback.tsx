import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const handle = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (cancelled) return;

        if (data.session) {
          navigate('/cockpit', { replace: true });
        } else {
          // Attend une frame pour laisser onAuthStateChange prendre le relais
          // (Supabase parse l'URL au chargement et déclenche un event SIGNED_IN)
          setTimeout(() => {
            supabase.auth.getSession().then(({ data: retryData }) => {
              if (cancelled) return;
              if (retryData.session) {
                navigate('/cockpit', { replace: true });
              } else {
                navigate('/login', { replace: true });
              }
            });
          }, 800);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    };

    handle();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0A0D0C] text-[#F4F7F6] flex items-center justify-center p-6">
      <div className="text-center">
        {error ? (
          <>
            <p className="text-red-400 mb-2 font-semibold">Erreur d'authentification</p>
            <p className="text-xs text-[#A8B3B8] max-w-sm mb-6">{error}</p>
            <button
              onClick={() => (window.location.href = '/login')}
              className="px-4 py-2 rounded-md bg-[#10B981] text-[#0A0D0C] font-semibold text-sm hover:bg-[#0EA371] transition-colors"
            >
              Retour à la connexion
            </button>
          </>
        ) : (
          <p className="text-sm text-[#A8B3B8] uppercase tracking-widest">Connexion en cours…</p>
        )}
      </div>
    </div>
  );
}
