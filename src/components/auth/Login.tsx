import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { getAuthRedirectURL } from '../../lib/authRedirect';

type Mode = 'login' | 'reset';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

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
        <div data-public-page className="auth-shell">
          <header className="auth-brand">
            <span className="auth-brand__mark">P8</span>
            <div className="auth-brand__main">
              <span className="auth-brand__name">PorcTrack 8</span>
              <span className="auth-brand__meta">Cahier de troupeau · Côte d’Ivoire</span>
            </div>
          </header>

          <h1 className="auth-h1">{mode === 'reset' ? 'Mot de passe oublié' : 'Connexion'}</h1>
          <p className="auth-sub">
            {mode === 'reset'
              ? 'On t’envoie un lien par email pour le réinitialiser.'
              : 'Reprends ton cahier d’éleveur.'}
          </p>

          {mode === 'reset' && resetSent ? (
            <div
              role="status"
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                padding: '16px 16px',
                background: 'rgba(74, 122, 47, 0.10)',
                border: '1px solid rgba(74, 122, 47, 0.35)',
                borderRadius: 12,
                marginBottom: 14,
              }}
            >
              <CheckCircle2 size={22} strokeWidth={2} style={{ color: 'var(--pt-success)', flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: 'var(--pt-font-display)',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    fontSize: 14,
                    letterSpacing: '0.02em',
                    color: 'var(--pt-success)',
                    marginBottom: 4,
                  }}
                >
                  Email envoyé
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--pt-ink)' }}>
                  Vérifie ta boîte mail à <b style={{ color: 'var(--pt-ink)' }}>{email}</b> (y compris les spams). Le lien est valide 24 h.
                </p>
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={switchToLogin}
                    className="btn--ghost btn--sm"
                    style={{ display: 'inline-flex' }}
                  >
                    <ArrowLeft size={14} strokeWidth={2} />
                    Retour à la connexion
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form
              className="auth-form"
              onSubmit={mode === 'reset' ? handleResetSubmit : handleLogin}
              method="post"
            >
              <div className="field field--icon">
                <label className="field__label" htmlFor="login-email">
                  {mode === 'reset' ? 'Email du compte' : 'Email'}
                </label>
                <span className="field__icon" aria-hidden>
                  <Mail size={16} strokeWidth={2} />
                </span>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  className="field__input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="yao@porctrack.test"
                  required
                />
              </div>

              {mode === 'login' && (
                <div className="field field--icon">
                  <label className="field__label" htmlFor="login-password">
                    Mot de passe
                  </label>
                  <span className="field__icon" aria-hidden>
                    <Lock size={16} strokeWidth={2} />
                  </span>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="field__input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="field__btn"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                  </button>
                </div>
              )}

              {error && (
                <div role="alert" className="alert-card">
                  <span className="alert-card__icon" aria-hidden>
                    <Mail size={18} strokeWidth={2} />
                  </span>
                  <div>
                    <div className="alert-card__title">Identifiants refusés</div>
                    <div className="alert-card__text">{error}</div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="primary-cta-block"
                disabled={loading}
                aria-busy={loading}
                style={{ marginTop: 4 }}
              >
                {loading && <Loader2 size={16} strokeWidth={2} className="animate-spin" aria-hidden="true" />}
                {loading
                  ? mode === 'reset'
                    ? 'Envoi en cours…'
                    : 'Connexion…'
                  : mode === 'reset'
                  ? 'Recevoir le lien'
                  : 'Se connecter'}
                {!loading && (mode === 'reset' ? <Mail size={16} strokeWidth={2} /> : <ArrowRight size={16} strokeWidth={2} />)}
              </button>

              {mode === 'login' ? (
                <button
                  type="button"
                  className="auth-link-ghost"
                  onClick={switchToReset}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '12px 8px' }}
                >
                  Mot de passe oublié ?
                </button>
              ) : (
                <button
                  type="button"
                  className="auth-link-ghost"
                  onClick={switchToLogin}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '12px 8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    justifyContent: 'center',
                  }}
                >
                  <ArrowLeft size={14} strokeWidth={2} />
                  Retour à la connexion
                </button>
              )}
            </form>
          )}

          {mode === 'login' && (
            <>
              <div className="auth-divider">— ou —</div>
              <p className="auth-foot">
                Pas encore de compte ?{' '}
                <Link to="/signup">S’inscrire →</Link>
              </p>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
