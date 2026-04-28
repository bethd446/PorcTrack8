import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';

interface AdminLog {
  id: string;
  action: string;
  details: unknown;
  created_at: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminDashboard() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (err) {
        setError(err.message);
      } else {
        setLogs(data ?? []);
      }
      setLoading(false);
    };

    fetchLogs();
  }, []);

  return (
    <div className="min-h-screen bg-[#f0f4f3]">

      {/* Header */}
      <header className="bg-gradient-to-b from-[#065f46] to-[#064e3b] rounded-b-[36px] px-6 pt-12 pb-8 shadow-lg">
        <p className="text-xs text-emerald-300 uppercase tracking-widest mb-1 font-medium">
          Administration
        </p>
        <h1
          className="text-4xl text-white uppercase tracking-tight"
          style={{ fontFamily: 'BigShoulders, sans-serif' }}
        >
          Admin Dashboard
        </h1>
        <p className="text-emerald-200 text-sm mt-1 opacity-80">
          Journal des actions système
        </p>
      </header>

      {/* Contenu */}
      <main className="px-4 pt-6 pb-24 space-y-4 max-w-2xl mx-auto">

        {/* KPI rapide */}
        <div className="bg-white rounded-[28px] shadow-sm px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Entrées totales</p>
            <p
              className="text-3xl font-bold text-[#064e3b]"
              style={{ fontFamily: 'BricolageGrotesque, sans-serif' }}
            >
              {loading ? '…' : logs.length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <span className="text-2xl">📋</span>
          </div>
        </div>

        {/* Tableau des logs */}
        <div className="bg-white rounded-[28px] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-[#064e3b] uppercase tracking-wide">
              Dernières actions
            </h2>
          </div>

          {loading && (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              Chargement…
            </div>
          )}

          {error && (
            <div className="px-6 py-4 text-sm text-red-600 bg-red-50">
              Erreur : {error}
            </div>
          )}

          {!loading && !error && logs.length === 0 && (
            <div className="px-6 py-8 text-center text-sm text-gray-400">
              Aucun log enregistré.
            </div>
          )}

          {!loading && logs.map((log, i) => (
            <div
              key={log.id}
              className={`px-6 py-4 flex items-start gap-4 ${i < logs.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              {/* Pastille action */}
              <span className="mt-0.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-[#064e3b] whitespace-nowrap"
                style={{ fontFamily: 'DMMono, monospace' }}
              >
                {log.action}
              </span>

              {/* Date */}
              <div className="ml-auto text-right flex-shrink-0">
                <p className="text-xs text-gray-400" style={{ fontFamily: 'DMMono, monospace' }}>
                  {formatDate(log.created_at)}
                </p>
                <p className="text-[10px] text-gray-300 mt-0.5" style={{ fontFamily: 'DMMono, monospace' }}>
                  {log.id.substring(0, 8)}…
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
