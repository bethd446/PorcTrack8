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
        <div className="pt-screen">
          <div data-public-page className="auth-shell">
            <header className="auth-hero">
              <h1 className="auth-hero__brand">PorcTrack</h1>
              <p className="auth-hero__tagline">Gestion technique troupeau porcin</p>
            </header>

            <h2 className="auth-h1">{mode === 'reset' ? 'Mot de passe oublié' : 'Connexion'}</h2>
            <p className="auth-sub">
              {mode === 'reset'
                ? 'On t’envoie un lien par email pour le réinitialiser.'
                : 'Reprends ton cahier d’éleveur.'}
            </p>

            {mode === 'reset' && resetSent ? (
              <div role="status" className="alert-card alert-card--success">
                <span className="alert-card__icon" aria-hidden>
                  <CheckCircle2 size={22} strokeWidth={2} />
                </span>
                <div className="alert-card__body">
                  <div className="alert-card__title">Email envoyé</div>
                  <p className="alert-card__text">
                    Vérifie ta boîte mail à <b>{email}</b> (y compris les spams). Le lien est valide 24 h.
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={switchToLogin}
                      className="btn btn--ghost btn--sm"
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
                  <label className="label--v77" htmlFor="login-email">
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
                    <label className="label--v77" htmlFor="login-password">
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
                  <div role="alert" className="alert-card alert-card--danger">
                    <span className="alert-card__icon" aria-hidden>
                      <Mail size={18} strokeWidth={2} />
                    </span>
                    <div className="alert-card__body">
                      <div className="alert-card__title">Identifiants refusés</div>
                      <div className="alert-card__text">{error}</div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn--primary btn--lg btn--block"
                  disabled={loading}
                  aria-busy={loading}
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
                  >
                    Mot de passe oublié ?
                  </button>
                ) : (
                  <button
                    type="button"
                    className="auth-link-ghost"
                    onClick={switchToLogin}
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
                  <Link to="/signup" className="auth-link-ghost">S’inscrire ›</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
