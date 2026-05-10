import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

type SessionState = 'checking' | 'valid' | 'invalid';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [sessionState, setSessionState] = useState<SessionState>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        <div data-public-page className="auth-shell">
          <header className="auth-brand">
            <span className="auth-brand__mark">P8</span>
            <div className="auth-brand__main">
              <span className="auth-brand__name">PorcTrack 8</span>
              <span className="auth-brand__meta">Cahier de troupeau · Côte d’Ivoire</span>
            </div>
          </header>

          {sessionState === 'checking' && (
            <>
              <h1 className="auth-h1">Vérification…</h1>
              <p className="auth-sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={14} strokeWidth={2} className="animate-spin" aria-hidden="true" />
                Vérification du lien de réinitialisation…
              </p>
            </>
          )}

          {sessionState === 'invalid' && (
            <>
              <h1 className="auth-h1">Lien expiré</h1>
              <p className="auth-sub">
                Ce lien de réinitialisation n’est plus valide. Demande un nouveau lien depuis l’écran de connexion.
              </p>
              <button
                type="button"
                className="primary-cta-block"
                onClick={() => navigate('/login', { replace: true })}
              >
                <ArrowLeft size={16} strokeWidth={2} />
                Retour à la connexion
              </button>
            </>
          )}

          {sessionState === 'valid' && success && (
            <>
              <div className="auth-hero-icon auth-hero-icon--success" aria-hidden>
                <CheckCircle2 strokeWidth={2} />
              </div>
              <h1 className="auth-hero-h1">Mot de passe mis à jour</h1>
              <p className="auth-hero-sub">Redirection vers la connexion…</p>
            </>
          )}

          {sessionState === 'valid' && !success && (
            <>
              <h1 className="auth-h1">Nouveau mot de passe</h1>
              <p className="auth-sub">6 caractères minimum. Confirme-le pour éviter une faute de frappe.</p>

              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="field field--icon">
                  <label className="field__label" htmlFor="reset-password">
                    Nouveau mot de passe
                  </label>
                  <span className="field__icon" aria-hidden>
                    <Lock size={16} strokeWidth={2} />
                  </span>
                  <input
                    id="reset-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="field__input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder="6 caractères minimum"
                    required
                    minLength={6}
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

                <div className="field field--icon">
                  <label className="field__label" htmlFor="reset-confirm">
                    Confirmation
                  </label>
                  <span className="field__icon" aria-hidden>
                    <Lock size={16} strokeWidth={2} />
                  </span>
                  <input
                    id="reset-confirm"
                    name="confirm"
                    type={showPassword ? 'text' : 'password'}
                    className="field__input"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Retape le mot de passe"
                    required
                    minLength={6}
                  />
                </div>

                {error && (
                  <div role="alert" className="alert-card">
                    <span className="alert-card__icon" aria-hidden>
                      <CheckCircle2 size={18} strokeWidth={2} />
                    </span>
                    <div>
                      <div className="alert-card__title">Erreur</div>
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
                  {loading ? 'Mise à jour…' : 'Définir le nouveau mot de passe'}
                  {!loading && <ArrowRight size={16} strokeWidth={2} />}
                </button>
              </form>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
