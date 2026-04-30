import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

type Mode = 'magic' | 'password';

export default function Signup() {
  const [mode, setMode] = useState<Mode>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (err) setError(err.message);
    else setSent(true);
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (err) setError(err.message);
    else setSent(true);
  };

  return (
    <div className="min-h-screen bg-[#0A0D0C] text-[#F4F7F6] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="block text-center text-2xl font-black tracking-tighter text-[#10B981] mb-6"
          style={{ fontFamily: 'BigShoulders, sans-serif' }}
        >
          PORCTRACK
        </Link>

        <div className="bg-[#12171A] rounded-lg border border-[#2A3239] p-8">
          <h1
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: 'BigShoulders, sans-serif' }}
          >
            Créer un compte
          </h1>
          <p className="text-sm text-[#A8B3B8] mb-6">
            {mode === 'magic'
              ? 'On vous envoie un lien magique par email — pas besoin de mot de passe.'
              : 'Choisissez un mot de passe pour votre compte.'}
          </p>

          {sent ? (
            <div className="rounded-md border border-[#10B981] bg-[#065F46]/30 p-4 text-sm leading-relaxed">
              Email envoyé à <strong className="text-[#10B981]">{email}</strong>.<br />
              Vérifiez votre boîte mail (et le dossier spam si besoin).
            </div>
          ) : (
            <>
              <form
                onSubmit={mode === 'magic' ? handleMagicLink : handlePassword}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#A8B3B8] mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full px-3 py-2 bg-[#0A0D0C] border border-[#2A3239] rounded-md text-[#F4F7F6] focus:border-[#10B981] focus:outline-none transition-colors"
                    placeholder="vous@exemple.com"
                  />
                </div>

                {mode === 'password' && (
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#A8B3B8] mb-1">
                      Mot de passe
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full px-3 py-2 bg-[#0A0D0C] border border-[#2A3239] rounded-md text-[#F4F7F6] focus:border-[#10B981] focus:outline-none transition-colors"
                      placeholder="8 caractères minimum"
                    />
                  </div>
                )}

                {error && (
                  <div className="rounded-md border border-red-700 bg-red-900/30 p-3 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-md bg-[#10B981] text-[#0A0D0C] font-semibold hover:bg-[#0EA371] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? 'Envoi…'
                    : mode === 'magic'
                      ? 'Recevoir le lien magique'
                      : 'Créer mon compte'}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-[#2A3239] text-center">
                <button
                  type="button"
                  onClick={() => setMode(mode === 'magic' ? 'password' : 'magic')}
                  className="text-xs uppercase tracking-widest text-[#A8B3B8] hover:text-[#10B981] transition-colors"
                >
                  {mode === 'magic'
                    ? '→ Utiliser un mot de passe'
                    : '→ Utiliser un lien magique'}
                </button>
              </div>
            </>
          )}

          <p className="mt-6 text-center text-xs text-[#A8B3B8]">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-[#10B981] hover:text-[#0EA371] transition-colors">
              Se connecter
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-[#6B7880]">
          Onboarding multi-tenant complet en T5
        </p>
      </div>
    </div>
  );
}
