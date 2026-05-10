import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  Warehouse,
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { getAuthRedirectURL } from '../../lib/authRedirect';

type AuthError = { message?: string; status?: number; code?: string };

const RESEND_COOLDOWN_S = 60;

const COUNTRIES: ReadonlyArray<{ code: string; flag: string; name: string }> = [
  { code: 'CI', flag: '🇨🇮', name: 'Côte d’Ivoire' },
  { code: 'SN', flag: '🇸🇳', name: 'Sénégal' },
  { code: 'BF', flag: '🇧🇫', name: 'Burkina Faso' },
  { code: 'ML', flag: '🇲🇱', name: 'Mali' },
  { code: 'BJ', flag: '🇧🇯', name: 'Bénin' },
  { code: 'TG', flag: '🇹🇬', name: 'Togo' },
  { code: 'GN', flag: '🇬🇳', name: 'Guinée' },
  { code: 'NE', flag: '🇳🇪', name: 'Niger' },
  { code: 'CM', flag: '🇨🇲', name: 'Cameroun' },
  { code: 'FR', flag: '🇫🇷', name: 'France' },
];

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
      `Le service email n’a pas pu valider ton domaine (${domain}).`,
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

function passwordStrength(p: string): { score: 0 | 1 | 2 | 3 | 4; label: string; color: string } {
  if (!p) return { score: 0, label: '', color: 'var(--pt-subtle)' };
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) score++;
  const s = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  const labels: Record<typeof s, { label: string; color: string }> = {
    0: { label: '', color: 'var(--pt-subtle)' },
    1: { label: `Force faible · ${p.length} caractères`, color: 'var(--pt-warm-deep)' },
    2: { label: `Force moyenne · ${p.length} caractères`, color: 'var(--pt-accent)' },
    3: { label: `Force bonne · ${p.length} caractères`, color: 'var(--pt-primary-light)' },
    4: { label: `Force fort · ${p.length} caractères`, color: 'var(--pt-success)' },
  };
  return { score: s, ...labels[s] };
}

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [farmName, setFarmName] = useState('');
  const [country, setCountry] = useState<string>('CI');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  const strength = passwordStrength(password);

  const canSubmit =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    acceptTerms &&
    !loading;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const shapeError = validateEmailShape(email);
    if (shapeError) {
      setError(shapeError);
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (!acceptTerms) {
      setError('Tu dois accepter les conditions d’utilisation pour continuer.');
      return;
    }

    setLoading(true);
    const redirectTo = getAuthRedirectURL('/auth/callback');
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: fullName.trim(),
          farm_name: farmName.trim(),
          country,
        },
      },
    });
    setLoading(false);

    if (err) {
      const e2 = err as AuthError;
      console.error('[Signup] Supabase auth error', {
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
    const redirectTo = getAuthRedirectURL('/auth/callback');
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setResendLoading(false);
    if (err) {
      const e2 = err as AuthError;
      setResendNotice(mapSupabaseAuthError(e2, email));
      return;
    }
    setResendNotice('Lien renvoyé.');
    setResendCooldown(RESEND_COOLDOWN_S);
  };

  if (sent) {
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

            <div className="auth-hero-icon" aria-hidden>
              <Mail strokeWidth={2} />
            </div>
            <h1 className="auth-hero-h1">Confirme ton email</h1>
            <p className="auth-hero-sub">
              On t’a envoyé un lien à <b>{email}</b>. Clique dessus pour activer ton compte.
            </p>

            <button
              type="button"
              className="btn--ghost btn--lg btn--full"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resendLoading}
              aria-busy={resendLoading}
            >
              {resendLoading && <Loader2 size={16} strokeWidth={2} className="animate-spin" aria-hidden="true" />}
              {resendLoading
                ? 'Envoi…'
                : resendCooldown > 0
                ? `Renvoyer le lien (${resendCooldown}s)`
                : 'Renvoyer le lien'}
            </button>
            {resendNotice && <div className="resend-counter">{resendNotice}</div>}

            <button
              type="button"
              className="auth-link-ghost"
              onClick={() => {
                setSent(false);
                setResendCooldown(0);
                setResendNotice(null);
              }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 'auto' }}
            >
              ← Changer d’email
            </button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent fullscreen scrollY={true}>
        <div data-public-page className="auth-shell" style={{ overflowY: 'auto' }}>
          <header className="auth-brand">
            <span className="auth-brand__mark">P8</span>
            <div className="auth-brand__main">
              <span className="auth-brand__name">PorcTrack 8</span>
              <span className="auth-brand__meta">Cahier de troupeau · Côte d’Ivoire</span>
            </div>
          </header>

          <h1 className="auth-h1">Créer un compte</h1>
          <p className="auth-sub">Démarre ton suivi de troupeau.</p>

          <form className="auth-form" onSubmit={submit} noValidate>
            <div className="field field--icon">
              <label className="field__label" htmlFor="signup-name">
                Nom complet <span className="req">REQUIS</span>
              </label>
              <span className="field__icon" aria-hidden>
                <User size={16} strokeWidth={2} />
              </span>
              <input
                id="signup-name"
                name="name"
                type="text"
                className="field__input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                placeholder="Yao Kouassi"
                required
              />
            </div>

            <div className="field field--icon">
              <label className="field__label" htmlFor="signup-email">
                Email <span className="req">REQUIS</span>
              </label>
              <span className="field__icon" aria-hidden>
                <Mail size={16} strokeWidth={2} />
              </span>
              <input
                id="signup-email"
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

            <div className="field field--icon">
              <label className="field__label" htmlFor="signup-password">
                Mot de passe <span className="req">REQUIS</span>
              </label>
              <span className="field__icon" aria-hidden>
                <Lock size={16} strokeWidth={2} />
              </span>
              <input
                id="signup-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="field__input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="8 caractères min."
                required
                minLength={8}
              />
              <button
                type="button"
                className="field__btn"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
              </button>
              {password.length > 0 && (
                <>
                  <div className={`pwd-strength s${strength.score}`} aria-hidden>
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="pwd-strength__label" style={{ color: strength.color }}>
                    {strength.label}
                  </div>
                </>
              )}
            </div>

            <div className="field field--icon">
              <label className="field__label" htmlFor="signup-farm">
                Nom de la ferme
              </label>
              <span className="field__icon" aria-hidden>
                <Warehouse size={16} strokeWidth={2} />
              </span>
              <input
                id="signup-farm"
                name="farm"
                type="text"
                className="field__input"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="Ferme Yamoussoukro"
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="signup-country">
                Pays
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  id="signup-country"
                  name="country"
                  className="country-select"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  strokeWidth={2}
                  aria-hidden
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--pt-subtle)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>

            <label className="checkbox-row" style={{ marginTop: 6 }}>
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
              />
              <span className={`checkbox-row__box${acceptTerms ? ' checked' : ''}`} aria-hidden>
                {acceptTerms && <Check strokeWidth={3} />}
              </span>
              <span>
                J’accepte les <Link to="/cgu">conditions d’utilisation</Link> et la{' '}
                <Link to="/privacy">politique de confidentialité</Link>.
              </span>
            </label>

            {error && (
              <div role="alert" className="alert-card">
                <span className="alert-card__icon" aria-hidden>
                  <CheckCircle2 size={18} strokeWidth={2} />
                </span>
                <div>
                  <div className="alert-card__title">Inscription impossible</div>
                  <div className="alert-card__text" style={{ whiteSpace: 'pre-line' }}>
                    {error}
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="primary-cta-block"
              disabled={!canSubmit}
              aria-busy={loading}
              style={{ marginTop: 6 }}
            >
              {loading && <Loader2 size={16} strokeWidth={2} className="animate-spin" aria-hidden="true" />}
              {loading ? 'Création…' : 'Créer mon compte'}
              {!loading && <ArrowRight size={16} strokeWidth={2} />}
            </button>
          </form>

          <p className="auth-foot" style={{ paddingTop: 18 }}>
            Déjà un compte ?{' '}
            <Link to="/login" onClick={() => navigate('/login')}>
              Se connecter →
            </Link>
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
