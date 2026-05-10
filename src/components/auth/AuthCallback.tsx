import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

type Phase = 'processing' | 'confirmed' | 'error';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [phase, setPhase] = useState<Phase>('processing');
  const [error, setError] = useState<string | null>(null);

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
        <div className="pt-screen">
          <div data-public-page className="auth-shell">
            <header className="auth-hero">
              <h1 className="auth-hero__brand">PorcTrack</h1>
              <p className="auth-hero__tagline">Gestion technique troupeau porcin</p>
            </header>

            {phase === 'processing' && (
              <>
                <div className="auth-hero-icon" aria-hidden>
                  <Mail strokeWidth={2} />
                </div>
                <h2 className="auth-hero-h1">Confirme ton email</h2>
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
                <h2 className="auth-hero-h1">Compte activé</h2>
                <p className="auth-hero-sub">
                  Bienvenue sur PorcTrack. On t’emmène à ton cahier de troupeau.
                </p>
                <button
                  type="button"
                  className="btn-primary--lg"
                  onClick={() => navigate('/today', { replace: true })}
                >
                  Continuer vers PorcTrack
                  <ArrowRight size={16} strokeWidth={2} />
                </button>
              </>
            )}

            {phase === 'error' && (
              <>
                <h2 className="auth-h1">Connexion impossible</h2>
                <div role="alert" className="alert-card alert-card--danger">
                  <span className="alert-card__icon" aria-hidden>
                    <AlertTriangle size={18} strokeWidth={2} />
                  </span>
                  <div className="alert-card__body">
                    <div className="alert-card__title">Erreur</div>
                    <div className="alert-card__text" style={{ wordBreak: 'break-word' }}>
                      {error ?? 'Une erreur est survenue lors de la confirmation.'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary--lg"
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
        </div>
      </IonContent>
    </IonPage>
  );
}
