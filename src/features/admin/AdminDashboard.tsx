import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ── Types ────────────────────────────────────────────────────────────────────

interface AdminLog {
  id: string;
  action: string;
  details: unknown;
  created_at: string;
}

interface UserProfile {
  id: string;
  email?: string;
  role: string;
  last_sign_in_at?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function shortId(id: string): string {
  return id.substring(0, 8) + '…';
}

// ── Sous-composants ──────────────────────────────────────────────────────────

function KpiCard({ value, label, icon }: { value: string | number; label: string; icon: string }) {
  return (
    <div className="premium-card flex items-center justify-between px-6 py-5">
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
        <p className="ft-values text-3xl font-bold text-[#064e3b]">{value}</p>
      </div>
      <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl">
        {icon}
      </div>
    </div>
  );
}

function SectionHeader({ title, badge }: { title: string; badge?: number }) {
  return (
    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <h2 className="ft-heading text-sm text-[#064e3b] uppercase tracking-wide">{title}</h2>
      {badge !== undefined && (
        <span className="premium-badge bg-emerald-50 text-[#064e3b] text-xs px-3 py-1">
          {badge}
        </span>
      )}
    </div>
  );
}

// ── Panel 1 : Logs temps réel ────────────────────────────────────────────────

function LogsPanel() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Chargement initial
    supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setLogs(data ?? []);
        setLoading(false);
      });

    // Souscription temps réel
    channelRef.current = supabase
      .channel('admin_logs_rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_logs' },
        (payload) => {
          setLogs(prev => [payload.new as AdminLog, ...prev].slice(0, 50));
          // Scroll to top pour voir le nouveau log
          listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, []);

  return (
    <div className="premium-card overflow-hidden">
      <SectionHeader title="Journal temps réel" badge={logs.length} />
      <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: 380 }}>
        {loading && (
          <p className="px-6 py-8 text-center text-sm text-gray-400">Chargement…</p>
        )}
        {!loading && logs.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-gray-400">Aucun log enregistré.</p>
        )}
        {logs.map((log, i) => (
          <div
            key={log.id}
            className={`px-6 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
              i === 0 ? 'bg-emerald-50/50' : ''
            } ${i < logs.length - 1 ? 'border-b border-gray-50' : ''}`}
          >
            {/* Indicateur live */}
            {i === 0 && (
              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
            {i > 0 && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-gray-200" />}

            {/* Action badge */}
            <span
              className="ft-code text-xs bg-emerald-50 text-[#064e3b] px-2 py-0.5 rounded-full whitespace-nowrap"
            >
              {log.action}
            </span>

            {/* ID tronqué */}
            <span className="ft-code text-xs text-gray-300 hidden sm:inline">
              {shortId(log.id)}
            </span>

            {/* Date */}
            <span className="ft-code text-xs text-gray-400 ml-auto whitespace-nowrap">
              {fmtDate(log.created_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Panel 2 : User Management ────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-amber-50 text-amber-700',
  OWNER: 'bg-emerald-50 text-emerald-700',
  PORCHER: 'bg-blue-50 text-blue-700',
};

function UsersPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, role, last_sign_in_at, email')
      .order('role', { ascending: true })
      .then(({ data }) => {
        setUsers(data ?? []);
        setLoading(false);
      });
  }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId);
    await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    setUpdating(null);
  };

  return (
    <div className="premium-card overflow-hidden">
      <SectionHeader title="Gestion des utilisateurs" badge={users.length} />
      <div className="overflow-x-auto">
        {loading && (
          <p className="px-6 py-8 text-center text-sm text-gray-400">Chargement…</p>
        )}
        {!loading && users.length === 0 && (
          <p className="px-6 py-8 text-center text-sm text-gray-400">Aucun profil trouvé.</p>
        )}
        {!loading && users.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="ft-heading text-left px-6 py-3 text-xs text-gray-400 font-normal uppercase tracking-wide">ID</th>
                <th className="ft-heading text-left px-6 py-3 text-xs text-gray-400 font-normal uppercase tracking-wide">Email</th>
                <th className="ft-heading text-left px-6 py-3 text-xs text-gray-400 font-normal uppercase tracking-wide">Rôle</th>
                <th className="ft-heading text-left px-6 py-3 text-xs text-gray-400 font-normal uppercase tracking-wide">Dernière connexion</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr
                  key={user.id}
                  className={`hover:bg-gray-50 transition-colors ${i < users.length - 1 ? 'border-b border-gray-50' : ''}`}
                >
                  <td className="ft-code px-6 py-3 text-xs text-gray-300">
                    {shortId(user.id)}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600 max-w-[180px] truncate">
                    {user.email ?? '—'}
                  </td>
                  <td className="px-6 py-3">
                    <select
                      value={user.role}
                      disabled={updating === user.id}
                      onChange={e => handleRoleChange(user.id, e.target.value)}
                      className={`ft-code text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${
                        ROLE_COLORS[user.role] ?? 'bg-gray-50 text-gray-600'
                      } disabled:opacity-50`}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="OWNER">OWNER</option>
                      <option value="PORCHER">PORCHER</option>
                    </select>
                  </td>
                  <td className="ft-code px-6 py-3 text-xs text-gray-400">
                    {fmtDate(user.last_sign_in_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import { WebhookPanel } from "./AdminDashboardWebhook";

// ── Panel 3 : Monitoring ─────────────────────────────────────────────────────

function MonitoringPanel({ logs }: { logs: AdminLog[] }) {
  // Comptage des actions par type
  const actionCounts = logs.reduce<Record<string, number>>((acc, log) => {
    acc[log.action] = (acc[log.action] ?? 0) + 1;
    return acc;
  }, {});

  const sorted = Object.entries(actionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const maxCount = sorted[0]?.[1] ?? 1;

  return (
    <div className="premium-card overflow-hidden">
      <SectionHeader title="Monitoring — Requêtes récentes" />
      <div className="px-6 py-4 space-y-3">
        {sorted.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Aucune donnée.</p>
        )}
        {sorted.map(([action, count]) => (
          <div key={action}>
            <div className="flex items-center justify-between mb-1">
              <span className="ft-code text-xs text-[#064e3b]">{action}</span>
              <span className="ft-values text-xs text-gray-400">{count}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#064e3b] rounded-full transition-all duration-500"
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AdminDashboard principal ──────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [userCount, setUserCount] = useState<number>(0);
  const [todayCount, setTodayCount] = useState<number>(0);

  useEffect(() => {
    // Logs pour monitoring panel
    supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        const allLogs = data ?? [];
        setLogs(allLogs);
        // Logs du jour
        const today = new Date().toISOString().slice(0, 10);
        setTodayCount(allLogs.filter(l => l.created_at.startsWith(today)).length);
      });

    // Comptage users
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setUserCount(count ?? 0));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#f0f4f3]">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="premium-header rounded-b-[36px] px-6 pt-12 pb-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-emerald-300 uppercase tracking-widest mb-1 font-medium">
              Console d'administration
            </p>
            <h1 className="ft-heading text-4xl text-white uppercase tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-emerald-200 text-sm mt-1 opacity-80">
              Supervision · Utilisateurs · Logs
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 text-xs text-emerald-300 hover:text-white transition-colors uppercase tracking-wide ft-code"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* ── Contenu ─────────────────────────────────────────────── */}
      <main className="px-4 pt-6 pb-24 space-y-6 max-w-4xl mx-auto">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <KpiCard value={logs.length} label="Logs totaux" icon="📋" />
          <KpiCard value={todayCount} label="Logs aujourd'hui" icon="📡" />
          <KpiCard value={userCount} label="Utilisateurs" icon="👥" />
        </div>

        {/* Logs temps réel */}
        <LogsPanel />

        {/* Users + Monitoring côte à côte sur large écran */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UsersPanel />
          <MonitoringPanel logs={logs} />
          <WebhookPanel />
        </div>

        {/* Lien retour app */}
        <div className="text-center pt-2">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-gray-400 hover:text-[#064e3b] transition-colors ft-code uppercase tracking-wide"
          >
            ← Retour au dashboard élevage
          </button>
        </div>
      </main>
    </div>
  );
}
