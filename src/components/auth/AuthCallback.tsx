import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import { supabase } from '../../services/supabaseClient';
import Eyebrow from '../design/Eyebrow';
import { Button } from '@/design-system';

const FONT_DISPLAY = 'var(--font-heading)';
const FONT_BODY = 'var(--font-body)';

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
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    };

    handle();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <IonPage>
      <IonContent fullscreen scrollY={true}>
        <div
          data-public-page
          style={{
            minHeight: '100%',
            width: '100%',
            background: 'var(--bg-app)',
            color: 'var(--ink)',
            fontFamily: FONT_BODY,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 420,
              background: 'var(--bg-surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-card)',
              boxShadow: 'var(--shadow-card)',
              padding: '28px 24px',
              textAlign: 'center',
            }}
          >
            {error ? (
              <>
                <Eyebrow dotColor="pig">Erreur d'authentification</Eyebrow>
                <h1
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 700,
                    fontSize: 'clamp(24px, 4vw, 30px)',
                    lineHeight: 1.05,
                    letterSpacing: '-0.02em',
                    color: 'var(--ink)',
                    margin: '14px 0 10px',
                  }}
                >
                  Connexion impossible.
                </h1>
                <p
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: 'var(--ink-soft)',
                    margin: '0 0 22px',
                    wordBreak: 'break-word',
                  }}
                >
                  {error}
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => (window.location.href = '/login')}
                  style={{ width: '100%' }}
                >
                  Retour à la connexion
                </Button>
              </>
            ) : (
              <>
                <Eyebrow dotColor="accent">Authentification</Eyebrow>
                <h1
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 700,
                    fontSize: 'clamp(24px, 4vw, 30px)',
                    lineHeight: 1.05,
                    letterSpacing: '-0.02em',
                    color: 'var(--ink)',
                    margin: '14px 0 10px',
                  }}
                >
                  Connexion en cours.
                </h1>
                <p
                  style={{
                    fontSize: 11,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    margin: 0,
                  }}
                >
                  Patientez un instant…
                </p>
              </>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
