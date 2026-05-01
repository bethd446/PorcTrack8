import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import { ArrowRight, Mail, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import Eyebrow from '../design/Eyebrow';
import Button from '../design/Button';

const FONT_DISPLAY = 'BigShoulders, "InstrumentSans", sans-serif';
const FONT_BODY = 'InstrumentSans, -apple-system, system-ui, sans-serif';
const FONT_MONO = 'DMMono, ui-monospace, monospace';

type Mode = 'magic' | 'password';

type AuthError = { message?: string; status?: number; code?: string };

const RESEND_COOLDOWN_S = 60;

function validateEmailShape(raw: string): string | null {
  const value = raw.trim();
  const invalid = 'Format email invalide.';
  if (!value) return invalid;
  const atIdx = value.indexOf('@');
  if (atIdx <= 0 || atIdx !== value.lastIndexOf('@')) return invalid;
  const domain = value.slice(atIdx + 1).toLowerCase();
  if (!domain || !domain.includes('.')) return invalid;
  if (domain === 'localhost' || domain.endsWith('.local')) return invalid;
  if (domain.startsWith('.') || domain.endsWith('.')) return invalid;
  return null;
}

function extractDomain(raw: string): string {
  const at = raw.lastIndexOf('@');
  return at >= 0 ? raw.slice(at + 1) : raw;
}

function mapSupabaseAuthError(err: AuthError, email: string): string {
  const msg = err.message ?? '';
  if (/Email address .* is invalid/i.test(msg) || /email.*invalid/i.test(msg)) {
    const domain = extractDomain(email) || 'inconnu';
    return [
      'Domaine email non reconnu.',
      `Le service email n'a pas pu valider ton domaine (${domain}).`,
      'Utilise plutôt un email standard (gmail.com, outlook.com, ton-domaine.fr, etc.) ou contacte-nous si tu as une adresse pro non standard.',
    ].join('\n');
  }
  if (/User already registered/i.test(msg) || err.code === 'user_already_exists') {
    return 'Un compte existe déjà avec cet email. Connecte-toi ou réinitialise ton mot de passe.';
  }
  if (/rate limit/i.test(msg) || err.status === 429) {
    return 'Trop de tentatives. Patiente une minute avant de réessayer.';
  }
  return msg || 'Une erreur est survenue. Réessaie dans un instant.';
}

export default function Signup() {
  const [mode, setMode] = useState<Mode>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  // theme-day est désormais forcé globalement dans main.tsx (refonte v6 light).

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const shapeError = validateEmailShape(email);
    if (shapeError) {
      setError(shapeError);
      return;
    }

    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: err } =
      mode === 'magic'
        ? await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
    setLoading(false);

    if (err) {
      const e2 = err as AuthError;
      console.error('[Signup] Supabase auth error', {
        mode,
        message: e2.message,
        status: e2.status,
        code: e2.code,
      });
      setError(mapSupabaseAuthError(e2, email));
      return;
    }

    setSent(true);
    setResendCooldown(RESEND_COOLDOWN_S);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendNotice(null);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setResendLoading(false);
    if (err) {
      const e2 = err as AuthError;
      console.error('[Signup] Supabase resend error', {
        message: e2.message,
        status: e2.status,
        code: e2.code,
      });
      setResendNotice(mapSupabaseAuthError(e2, email));
      return;
    }
    setResendNotice('Lien renvoyé.');
    setResendCooldown(RESEND_COOLDOWN_S);
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
            to="/login"
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
            Se connecter
          </Link>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-md px-5 py-12 md:py-20"
        style={{ flex: 1, display: 'flex', alignItems: 'center' }}
      >
        <div style={{ width: '100%' }}>
          <Eyebrow dotColor="amber">Rejoignez PorcTrack</Eyebrow>

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
            Démarrez avec votre ferme.
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
            2 minutes pour créer votre compte. Marius vous accompagne dès la première saisie.
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
            {sent ? (
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
                <CheckCircle2 size={20} strokeWidth={2} style={{ color: 'var(--color-accent-600)', flexShrink: 0, marginTop: 2 }} />
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
                    Vérifiez votre boîte mail à <strong style={{ color: 'var(--ink)' }}>{email}</strong> (et le dossier spam si besoin).
                  </p>
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resendCooldown > 0 || resendLoading}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--color-accent-500)',
                        cursor: resendCooldown > 0 || resendLoading ? 'not-allowed' : 'pointer',
                        opacity: resendCooldown > 0 || resendLoading ? 0.6 : 1,
                        fontFamily: FONT_MONO,
                        fontSize: 11,
                        letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        color: 'var(--color-accent-600)',
                        minHeight: 36,
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-card)',
                        fontWeight: 500,
                      }}
                    >
                      {resendLoading
                        ? 'Envoi…'
                        : resendCooldown > 0
                          ? `Renvoyer le lien (${resendCooldown}s)`
                          : 'Renvoyer le lien'}
                    </button>
                    {resendNotice && (
                      <span
                        style={{
                          fontFamily: FONT_BODY,
                          fontSize: 12,
                          color: 'var(--ink-soft)',
                        }}
                      >
                        {resendNotice}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <form
                  onSubmit={submit}
                  className="space-y-4"
                >
                  <Field
                    label="Email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    autoComplete="email"
                    placeholder="vous@exemple.com"
                    required
                  />

                  {mode === 'password' && (
                    <Field
                      label="Mot de passe"
                      type="password"
                      value={password}
                      onChange={setPassword}
                      autoComplete="new-password"
                      placeholder="8 caractères minimum"
                      required
                      minLength={8}
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
                        whiteSpace: 'pre-line',
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
                  >
                    {loading
                      ? 'Envoi…'
                      : mode === 'magic'
                        ? 'Recevoir le lien magique'
                        : 'Créer mon compte'}
                    {!loading && (mode === 'magic' ? <Mail size={16} strokeWidth={2} /> : <ArrowRight size={16} strokeWidth={2} />)}
                  </Button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => setMode(mode === 'magic' ? 'password' : 'magic')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: FONT_MONO,
                      fontSize: 11,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      color: 'var(--color-accent-600)',
                      minHeight: 44,
                      padding: '0 8px',
                      fontWeight: 500,
                    }}
                  >
                    {mode === 'magic'
                      ? '→ Utiliser un mot de passe'
                      : '→ Utiliser un lien magique'}
                  </button>
                </div>
              </>
            )}

            <p
              style={{
                fontFamily: FONT_BODY,
                fontSize: 12,
                lineHeight: 1.5,
                color: 'var(--muted)',
                textAlign: 'center',
                margin: '18px 0 0',
                paddingTop: 18,
                borderTop: '1px solid var(--line)',
              }}
            >
              En vous inscrivant, vous acceptez nos{' '}
              <Link to="/cgu" style={{ color: 'var(--color-accent-600)', textDecoration: 'none' }}>
                CGU
              </Link>{' '}
              et notre{' '}
              <Link to="/privacy" style={{ color: 'var(--color-accent-600)', textDecoration: 'none' }}>
                Confidentialité
              </Link>
              .
            </p>
          </div>

          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: 14,
              lineHeight: 1.5,
              color: 'var(--ink-soft)',
              textAlign: 'center',
              margin: '20px 0 0',
            }}
          >
            Déjà un compte ?{' '}
            <Link
              to="/login"
              style={{
                color: 'var(--color-accent-600)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Se connecter
            </Link>
          </p>
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
