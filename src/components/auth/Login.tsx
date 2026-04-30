import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      navigate('/cockpit');
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f3] flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <h1
            className="text-5xl uppercase tracking-tighter text-[#064e3b] mb-2"
            style={{ fontFamily: 'BigShoulders, sans-serif' }}
          >
            PorcTrack
          </h1>
          <p className="text-sm text-[#065f46] opacity-70">Gestion Technique Troupeau</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[28px] shadow-sm p-8">
          <h2 className="text-lg font-semibold text-[#064e3b] mb-6">Connexion</h2>

          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-[#064e3b] mb-1 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#f8faf9] text-[#064e3b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b] focus:border-transparent transition"
                placeholder="vous@exemple.com"
              />
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-xs font-medium text-[#064e3b] mb-1 uppercase tracking-wide">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-[#f8faf9] text-[#064e3b] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#064e3b] focus:border-transparent transition"
                placeholder="••••••••"
              />
            </div>

            {/* Erreur */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[54px] rounded-full bg-[#064e3b] text-white font-bold uppercase tracking-wide text-sm hover:bg-[#065f46] active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{ fontFamily: 'BigShoulders, sans-serif' }}
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>

        {/* Accent ambre bas */}
        <div className="mt-6 text-center">
          <span className="text-xs text-[#F4A261] font-medium uppercase tracking-widest">
            Réservé aux éleveurs autorisés
          </span>
        </div>
      </div>
    </div>
  );
}
