import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import Eyebrow from '../design/Eyebrow';
import Button from '../design/Button';

const FONT_DISPLAY = 'var(--font-heading)';
const FONT_BODY = 'var(--font-body)';

type SessionState = 'checking' | 'valid' | 'invalid';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (cancelled) return;
        if (sessionError || !data.session) {
          setSessionState('invalid');
          return;
        }
        setSessionState('valid');
      } catch {
        if (!cancelled) setSessionState('invalid');
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message || 'Impossible de mettre à jour le mot de passe.');
      return;
    }

    setSuccess(true);
    window.setTimeout(() => {
      navigate('/login', { replace: true });
    }, 1500);
  };

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
            flexDirection: 'column',
          }}
        >
          <header
            style={{
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
              <Link
                to="/"
                className="inline-flex items-center gap-2"
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 18,
                  color: 'var(--ink)',
                  letterSpacing: '-0.01em',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 28,
                    height: 28,
                    background: 'var(--color-accent-500)',
                    borderRadius: 8,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--bg-surface)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" />
                    <path d="M12 3v9l5 3" />
                  </svg>
                </span>
                <span className="uppercase tracking-wide">PorcTrack</span>
              </Link>

              <Link
                to="/login"
                className="inline-flex items-center px-3"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  minHeight: 44,
                }}
              >
                Se connecter
              </Link>
            </div>
          </header>

          <main
            className="mx-auto w-full max-w-md px-5 py-12 md:py-20"
            style={{ flex: 1, display: 'flex', alignItems: 'center' }}
          >
            <div style={{ width: '100%' }}>
              <Eyebrow dotColor="accent">Nouveau mot de passe</Eyebrow>

              <h1
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 'clamp(32px, 5vw, 40px)',
                  lineHeight: 1.0,
                  letterSpacing: '-0.025em',
                  color: 'var(--ink)',
                  margin: '14px 0 10px',
                }}
              >
                Définis ton nouveau mot de passe.
              </h1>

              <p
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: 'var(--ink-soft)',
                  margin: '0 0 28px',
                }}
              >
                6 caractères minimum. Confirme-le pour éviter une faute de frappe.
              </p>

              <div
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--line)',
                  boxShadow: 'var(--shadow-card)',
                  padding: '28px 24px',
                }}
              >
                {sessionState === 'checking' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                          fontSize: 11,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                      padding: '8px 0',
                    }}
                  >
                    <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                    Vérification du lien…
                  </div>
                )}

                {sessionState === 'invalid' && (
                  <div
                    role="alert"
                    style={{
                      background: 'var(--color-pig-soft)',
                      color: 'var(--color-pig-deep)',
                      border: '1px solid var(--color-pig)',
                      borderRadius: 'var(--radius-card)',
                      padding: '14px 16px',
                      fontFamily: FONT_BODY,
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Lien expiré.</div>
                    <p style={{ margin: '0 0 14px', color: 'var(--color-pig-deep)' }}>
                      Ce lien de réinitialisation n'est plus valide. Demande un nouveau lien depuis l'écran de
                      connexion.
                    </p>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => navigate('/login', { replace: true })}
                    >
                      <ArrowLeft size={14} strokeWidth={2} />
                      Retour à la connexion
                    </Button>
                  </div>
                )}

                {sessionState === 'valid' && success && (
                  <div
                    style={{
                      background: 'var(--color-accent-100)',
                      border: '1px solid var(--color-accent-500)',
                      borderRadius: 'var(--radius-card)',
                      padding: '18px 18px',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <CheckCircle2
                      size={20}
                      strokeWidth={2}
                      style={{ color: 'var(--color-accent-600)', flexShrink: 0, marginTop: 2 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: FONT_DISPLAY,
                          fontWeight: 700,
                          fontSize: 18,
                          color: 'var(--ink)',
                          lineHeight: 1.2,
                          marginBottom: 6,
                        }}
                      >
                        Mot de passe mis à jour.
                      </div>
                      <p
                        style={{
                          fontFamily: FONT_BODY,
                          fontSize: 14,
                          lineHeight: 1.5,
                          color: 'var(--ink-soft)',
                          margin: 0,
                        }}
                      >
                        Redirection vers la connexion…
                      </p>
                    </div>
                  </div>
                )}

                {sessionState === 'valid' && !success && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Field
                      label="Nouveau mot de passe"
                      type="password"
                      value={password}
                      onChange={setPassword}
                      autoComplete="new-password"
                      placeholder="6 caractères minimum"
                      required
                      minLength={6}
                    />

                    <Field
                      label="Confirmation"
                      type="password"
                      value={confirm}
                      onChange={setConfirm}
                      autoComplete="new-password"
                      placeholder="Retape le mot de passe"
                      required
                      minLength={6}
                    />

                    {error && (
                      <div
                        role="alert"
                        style={{
                          background: 'var(--color-pig-soft)',
                          color: 'var(--color-pig-deep)',
                          border: '1px solid var(--color-pig)',
                          borderRadius: 'var(--radius-card)',
                          padding: '10px 14px',
                          fontFamily: FONT_BODY,
                          fontSize: 13,
                          lineHeight: 1.45,
                        }}
                      >
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={loading}
                      style={{ width: '100%', marginTop: 4 }}
                      aria-busy={loading}
                    >
                      {loading
                        ? <Loader2 size={16} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                        : null}
                      {loading ? 'Mise à jour…' : 'Définir le nouveau mot de passe'}
                      {!loading && <ArrowRight size={16} strokeWidth={2} />}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </main>

          <footer
            style={{
              background: 'var(--bg-surface)',
              borderTop: '1px solid var(--line)',
            }}
          >
            <div
              className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-5 py-6 md:flex-row md:items-center md:justify-between md:px-8"
              style={{
                fontSize: 11,
                letterSpacing: '0.06em',
                color: 'var(--muted)',
              }}
            >
              <Link
                to="/login"
                className="uppercase"
                style={{ color: 'var(--muted)', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
              >
                ← Retour
              </Link>
              <nav className="flex flex-wrap gap-5">
                <Link
                  to="/privacy"
                  className="uppercase"
                  style={{ color: 'var(--muted)', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
                >
                  Confidentialité
                </Link>
                <Link
                  to="/cgu"
                  className="uppercase"
                  style={{ color: 'var(--muted)', minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
                >
                  CGU
                </Link>
              </nav>
            </div>
          </footer>
        </div>
      </IonContent>
    </IonPage>
  );
}

interface FieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}

function Field({ label, type, value, onChange, autoComplete, placeholder, required, minLength }: FieldProps) {
  return (
    <label style={{ display: 'block' }}>
      <span
        style={{
          display: 'block',
          fontSize: 10,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          marginBottom: 6,
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        style={{
          width: '100%',
          minHeight: 44,
          padding: '10px 14px',
          fontFamily: FONT_BODY,
          fontSize: 15,
          color: 'var(--ink)',
          background: 'var(--bg-surface-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius-card)',
          outline: 'none',
          transition: 'border-color 160ms var(--ease-emil), background 160ms var(--ease-emil)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-accent-500)';
          e.currentTarget.style.background = 'var(--bg-surface)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--line)';
          e.currentTarget.style.background = 'var(--bg-surface-2)';
        }}
      />
    </label>
  );
}
