import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0D0C] text-[#F4F7F6] flex flex-col items-center justify-center px-6">
      <p
        className="text-8xl font-black tracking-tighter text-[#10B981] mb-4"
        style={{ fontFamily: 'BigShoulders, sans-serif' }}
      >
        404
      </p>
      <h1
        className="text-2xl font-bold tracking-tighter mb-2"
        style={{ fontFamily: 'BigShoulders, sans-serif' }}
      >
        Page introuvable
      </h1>
      <p className="text-sm text-[#A8B3B8] mb-8">Cette page n'existe pas ou a été déplacée.</p>
      <Link
        to="/"
        className="px-6 py-3 rounded-md bg-[#10B981] text-[#0A0D0C] font-semibold hover:bg-[#0EA371] transition-colors"
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}
