import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0A0D0C] text-[#F4F7F6]">
      <header className="border-b border-[#2A3239]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="text-2xl font-black tracking-tighter text-[#F4F7F6]"
            style={{ fontFamily: 'BigShoulders, sans-serif' }}
          >
            PORCTRACK
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link to="/a-propos" className="text-[#A8B3B8] hover:text-[#F4F7F6] transition-colors">
              À propos
            </Link>
            <Link to="/login" className="text-[#A8B3B8] hover:text-[#F4F7F6] transition-colors">
              Connexion
            </Link>
            <Link
              to="/signup"
              className="px-4 py-2 rounded-md bg-[#10B981] text-[#0A0D0C] font-semibold hover:bg-[#0EA371] transition-colors"
            >
              Commencer
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-24">
        <h1
          className="text-5xl md:text-6xl font-black tracking-tighter mb-6 leading-[0.95]"
          style={{ fontFamily: 'BigShoulders, sans-serif' }}
        >
          Pilotez votre élevage
          <br />
          comme un cockpit.
        </h1>
        <p className="text-lg text-[#A8B3B8] max-w-2xl mb-10 leading-relaxed">
          PorcTrack — gestion technique de troupeau porcin. KPIs en temps réel, alertes biologiques
          automatiques, offline-first. Pour éleveurs naisseurs-engraisseurs.
        </p>
        <div className="flex items-center gap-4">
          <Link
            to="/signup"
            className="inline-block px-8 py-4 rounded-md bg-[#10B981] text-[#0A0D0C] font-semibold text-base hover:bg-[#0EA371] transition-colors"
          >
            Démarrer gratuitement
          </Link>
          <Link
            to="/login"
            className="inline-block px-8 py-4 rounded-md border border-[#2A3239] text-[#F4F7F6] hover:bg-[#12171A] transition-colors"
          >
            Se connecter
          </Link>
        </div>

        <p className="mt-16 text-xs uppercase tracking-widest text-[#6B7880]">
          Stub T2 — contenu marketing complet en T6
        </p>
      </main>

      <footer className="border-t border-[#2A3239] mt-24">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#6B7880]">
          <span>© 2026 PorcTrack</span>
          <nav className="flex gap-6">
            <Link to="/privacy" className="hover:text-[#A8B3B8] transition-colors">
              Confidentialité
            </Link>
            <Link to="/cgu" className="hover:text-[#A8B3B8] transition-colors">
              CGU
            </Link>
            <Link to="/a-propos" className="hover:text-[#A8B3B8] transition-colors">
              À propos
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
