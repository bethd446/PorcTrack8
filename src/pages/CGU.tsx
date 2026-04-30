import { Link } from 'react-router-dom';

export default function CGU() {
  return (
    <div className="min-h-screen bg-[#0A0D0C] text-[#F4F7F6] flex flex-col">
      <header className="border-b border-[#2A3239]">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link
            to="/"
            className="text-xl font-black tracking-tighter text-[#F4F7F6]"
            style={{ fontFamily: 'BigShoulders, sans-serif' }}
          >
            PORCTRACK
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-6 py-12">
        <h1
          className="text-4xl font-black tracking-tighter mb-6"
          style={{ fontFamily: 'BigShoulders, sans-serif' }}
        >
          Conditions générales d'utilisation
        </h1>
        <p className="text-[#A8B3B8] mb-4 leading-relaxed">
          Stub T2 — boilerplate RGPD agritech FR généré en T3.
        </p>
      </main>

      <footer className="border-t border-[#2A3239]">
        <div className="max-w-3xl mx-auto px-6 py-6 text-xs text-[#6B7880]">
          <Link to="/" className="hover:text-[#A8B3B8] transition-colors">
            ← Retour à l'accueil
          </Link>
        </div>
      </footer>
    </div>
  );
}
