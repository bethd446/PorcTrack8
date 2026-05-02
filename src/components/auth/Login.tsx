import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { getAuthRedirectURL } from '../../lib/authRedirect';
import Eyebrow from '../design/Eyebrow';
import Button from '../design/Button';

const FONT_DISPLAY = 'BigShoulders, "InstrumentSans", sans-serif';
const FONT_BODY = 'InstrumentSans, -apple-system, system-ui, sans-serif';
const FONT_MONO = 'DMMono, ui-monospace, monospace';

type Mode = 'login' | 'reset';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  // theme-day est désormais forcé globalement dans main.tsx (refonte v6 light).

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      navigate('/today', { replace: true });
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const redirectTo = getAuthRedirectURL('/reset-password');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setResetSent(true);
  };

  const switchToReset = () => {
    setMode('reset');
    setError(null);
    setPassword('');
  };

  const switchToLogin = () => {
    setMode('login');
    setError(null);
    setResetSent(false);
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
      {/* Header minimaliste */}
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
            to="/signup"
            className="inline-flex items-center px-3"
            style={{
              fontFamily: FONT_MONO,
              fontSize: 11,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              minHeight: 44,
            }}
          >
            Créer un compte
          </Link>
        </div>
      </header>

      {/* Card centrée */}
      <main
        className="mx-auto w-full max-w-md px-5 py-12 md:py-20"
        style={{ flex: 1, display: 'flex', alignItems: 'center' }}
      >
        <div style={{ width: '100%' }}>
          <Eyebrow dotColor="accent">{mode === 'reset' ? 'Récupération' : 'Connexion éleveur'}</Eyebrow>

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
            {mode === 'reset' ? 'Mot de passe oublié.' : 'Bienvenue à la ferme.'}
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
            {mode === 'reset'
              ? 'Renseigne ton email, on t\'envoie un lien pour le redéfinir.'
              : "Reprenez votre cockpit là où vous l'avez laissé."}
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
            {mode === 'reset' && resetSent ? (
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
                    Email envoyé.
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
                    Vérifie ta boîte mail à <strong style={{ color: 'var(--ink)' }}>{email}</strong>{' '}
                    (y compris les spams).
                  </p>
                  <div style={{ marginTop: 14 }}>
                    <button
                      type="button"
                      onClick={switchToLogin}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: FONT_MONO,
                        fontSize: 11,
                        letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        color: 'var(--color-accent-600)',
                        minHeight: 36,
                        padding: '0 0',
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <ArrowLeft size={14} strokeWidth={2} />
                      Retour à la connexion
                    </button>
                  </div>
                </div>
              </div>
            ) : (
            <form onSubmit={mode === 'reset' ? handleResetSubmit : handleLogin} className="space-y-4">
              <Field
                label={mode === 'reset' ? 'Email du compte' : 'Email'}
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                placeholder="vous@exemple.com"
                required
              />

              {mode === 'login' && (
                <Field
                  label="Mot de passe"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                />
              )}

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
                className="w-full"
                style={{ width: '100%', marginTop: 4 }}
                aria-busy={loading}
              >
                {loading
                  ? <Loader2 size={16} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                  : null}
                {loading
                  ? mode === 'reset' ? 'Envoi en cours…' : 'Connexion en cours…'
                  : mode === 'reset' ? 'Recevoir le lien' : 'Se connecter'}
                {!loading && (mode === 'reset'
                  ? <Mail size={16} strokeWidth={2} />
                  : <ArrowRight size={16} strokeWidth={2} />)}
              </Button>

              <div style={{ textAlign: 'center', marginTop: 6 }}>
                {mode === 'login' ? (
                  <button
                    type="button"
                    onClick={switchToReset}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: FONT_MONO,
                      fontSize: 11,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      minHeight: 44,
                      padding: '0 8px',
                      fontWeight: 500,
                    }}
                  >
                    Mot de passe oublié ?
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={switchToLogin}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: FONT_MONO,
                      fontSize: 11,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      color: 'var(--color-accent-600)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      minHeight: 44,
                      padding: '0 8px',
                      fontWeight: 500,
                    }}
                  >
                    <ArrowLeft size={14} strokeWidth={2} />
                    Retour à la connexion
                  </button>
                )}
              </div>
            </form>
            )}

            {mode === 'login' && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    margin: '20px 0 18px',
                  }}
                >
                  <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 10,
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                    }}
                  >
                    ou
                  </span>
                  <span style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                </div>

                <p
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: 'var(--ink-soft)',
                    textAlign: 'center',
                    margin: 0,
                  }}
                >
                  Pas encore de compte ?{' '}
                  <Link
                    to="/signup"
                    style={{
                      color: 'var(--color-accent-600)',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Créer un compte
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Footer minimaliste */}
      <footer
        style={{
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--line)',
        }}
      >
        <div
          className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-5 py-6 md:flex-row md:items-center md:justify-between md:px-8"
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            letterSpacing: '0.06em',
            color: 'var(--muted)',
          }}
        >
          <Link
            to="/"
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
          fontFamily: FONT_MONO,
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
