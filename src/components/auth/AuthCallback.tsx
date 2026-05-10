import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import { ArrowRight, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

type Phase = 'processing' | 'confirmed' | 'error';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [phase, setPhase] = useState<Phase>('processing');
  const [error, setError] = useState<string | null>(null);

  // Si l'URL inclut ?status=confirmed (variante mockup H.4b), on affiche
  // directement le hero "Compte activé" sans rappeler getSession.
  const params = new URLSearchParams(location.search);
  const explicitConfirmed = params.get('status') === 'confirmed';

  useEffect(() => {
    if (explicitConfirmed) {
      setPhase('confirmed');
      return;
    }

    let cancelled = false;

    const handle = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (cancelled) return;

        if (data.session) {
          navigate('/today', { replace: true });
        } else {
          setTimeout(() => {
            supabase.auth.getSession().then(({ data: retryData }) => {
              if (cancelled) return;
              if (retryData.session) {
                navigate('/today', { replace: true });
              } else {
                navigate('/login', { replace: true });
              }
            });
          }, 800);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setPhase('error');
        }
      }
    };

    handle();

    return () => {
      cancelled = true;
    };
  }, [navigate, explicitConfirmed]);

  return (
    <IonPage>
      <IonContent fullscreen scrollY={true}>
        <div data-public-page className="auth-shell">
          <header className="auth-brand">
            <span className="auth-brand__mark">P8</span>
            <div className="auth-brand__main">
              <span className="auth-brand__name">PorcTrack 8</span>
              <span className="auth-brand__meta">Cahier de troupeau · Côte d’Ivoire</span>
            </div>
          </header>

          {phase === 'processing' && (
            <>
              <div className="auth-hero-icon" aria-hidden>
                <Mail strokeWidth={2} />
              </div>
              <h1 className="auth-hero-h1">Confirme ton email</h1>
              <p className="auth-hero-sub">
                Connexion en cours. Si rien ne se passe, vérifie le lien dans ta boîte mail.
              </p>
              <p className="resend-counter" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                Patiente un instant…
              </p>
            </>
          )}

          {phase === 'confirmed' && (
            <>
              <div className="auth-hero-icon auth-hero-icon--success" aria-hidden>
                <CheckCircle2 strokeWidth={2} />
              </div>
              <h1 className="auth-hero-h1">Compte activé</h1>
              <p className="auth-hero-sub">
                Bienvenue sur PorcTrack. On t’emmène à ton cahier de troupeau.
              </p>
              <button
                type="button"
                className="primary-cta-block"
                onClick={() => navigate('/today', { replace: true })}
              >
                Continuer vers PorcTrack
                <ArrowRight size={16} strokeWidth={2} />
              </button>
            </>
          )}

          {phase === 'error' && (
            <>
              <h1 className="auth-h1">Connexion impossible</h1>
              <p className="auth-sub" style={{ wordBreak: 'break-word' }}>
                {error ?? 'Une erreur est survenue lors de la confirmation.'}
              </p>
              <button
                type="button"
                className="primary-cta-block"
                onClick={() => {
                  window.location.href = '/login';
                }}
              >
                Retour à la connexion
                <ArrowRight size={16} strokeWidth={2} />
              </button>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
