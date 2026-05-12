import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { kvGet, kvSet } from '../services/kvStore';
import type { UserRole } from '../types/user.types';
import type { FarmRole } from '../types/farm';

interface SupabaseProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: SupabaseProfile | null;
  loading: boolean;
  profileLoaded: boolean;

  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;

  role: UserRole;
  userName: string;
  setRole: (role: UserRole) => void;
  isOwner: boolean;
  /** V71-P2 — Rôle effectif dans la ferme courante (null = inconnu). */
  currentRole: FarmRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** V71-P2 — Clé de persistance Capacitor Preferences (mirror FarmContext). */
const CURRENT_FARM_ID_KV_KEY = 'pt:current_farm_id';

/**
 * Map un rôle (profiles.role legacy OU farm_members.role V71-P2) vers le
 * UserRole binaire historique consommé par l'UI ('OWNER' / 'WORKER').
 *
 * V71-P2 — Priorité au rôle farm_members ; fallback profiles.role ; fallback
 * `legacyRole` persisté localement.
 */
function mapToLegacyRole(
  membershipRole: FarmRole | null,
  profileRole: string | null | undefined,
  fallback: UserRole,
): UserRole {
  // Priorité 1 : rôle dans la ferme courante (farm_members).
  if (membershipRole === 'OWNER' || membershipRole === 'ADMIN') return 'OWNER';
  if (membershipRole === 'PORCHER') return 'WORKER';
  // Priorité 2 : profiles.role legacy.
  if (profileRole === 'OWNER' || profileRole === 'ADMIN') return 'OWNER';
  if (profileRole === 'WORKER' || profileRole === 'PORCHER') return 'WORKER';
  return fallback;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<SupabaseProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [legacyRole, setLegacyRoleState] = useState<UserRole>(
    () => (kvGet('user_role') as UserRole | null) ?? 'OWNER',
  );
  // V71-P2 — Memberships chargés en parallèle du profile pour calculer le
  // rôle effectif dans la ferme courante.
  const [memberships, setMemberships] = useState<Array<{ farm_id: string; role: FarmRole }>>([]);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      // Profile + memberships en parallèle.
      const [profileRes, membersRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, full_name, role')
          .eq('id', userId)
          .single(),
        supabase
          .from('farm_members')
          .select('farm_id, role')
          .eq('user_id', userId),
      ]);

      if (profileRes.error || !profileRes.data) {
        setProfile(null);
      } else {
        setProfile(profileRes.data as SupabaseProfile);
      }

      if (membersRes.error || !Array.isArray(membersRes.data)) {
        setMemberships([]);
      } else {
        const rows = (membersRes.data as Array<{ farm_id: string; role: string }>)
          .map((r) => ({
            farm_id: r.farm_id,
            role: (r.role === 'OWNER' || r.role === 'ADMIN' || r.role === 'PORCHER')
              ? (r.role as FarmRole)
              : 'PORCHER' as FarmRole,
          }));
        setMemberships(rows);
      }
    } finally {
      setProfileLoaded(true);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user.id) {
      await fetchProfile(session.user.id);
    }
  }, [session, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const tryDevAutologin = async () => {
      if (!import.meta.env.DEV) return;
      const email = import.meta.env.VITE_DEV_AUTOLOGIN_EMAIL as string | undefined;
      const password = import.meta.env.VITE_DEV_AUTOLOGIN_PASSWORD as string | undefined;
      if (!email || !password) return;
      // v3.4.1 — Skip si placeholder non remplacé (évite 400 invalid_grant
      // qui pollue la console et empêche le splash de finir.
      if (
        password.includes('REMPLACEZ') ||
        password.includes('YOUR_PASSWORD') ||
        password.length < 8
      ) {
        if (import.meta.env.DEV) console.info('[Dev autologin] skip (placeholder)');
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (import.meta.env.DEV) { console.warn('[Dev autologin] échec :', error.message); }
      } else {
        if (import.meta.env.DEV) { console.info('[Dev autologin] connecté en tant que', email); }
      }
    };

    // Safety: force loading=false après 6s même si tout hang. Évite splash bloquant définitif.
    const safetyTimeout = window.setTimeout(() => {
      if (mounted) {
        if (import.meta.env.DEV) { console.warn('[AuthContext] safety timeout — forcing loading=false'); }
        setLoading(false);
      }
    }, 6000);

    const finishLoading = () => {
      if (mounted) {
        window.clearTimeout(safetyTimeout);
        setLoading(false);
      }
    };

    supabase.auth.getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        if (!data.session) {
          await tryDevAutologin();
          const { data: refreshed } = await supabase.auth.getSession();
          setSession(refreshed.session);
          finishLoading();
          if (refreshed.session?.user.id) {
            void fetchProfile(refreshed.session.user.id);
          }
        } else {
          setSession(data.session);
          finishLoading();
          if (data.session.user.id) {
            void fetchProfile(data.session.user.id);
          }
        }
      })
      .catch((err) => {
        if (import.meta.env.DEV) { console.error('[AuthContext] getSession failed', err); }
        finishLoading();
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession?.user.id) {
        void fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
        setMemberships([]);
      }
    });

    return () => {
      mounted = false;
      window.clearTimeout(safetyTimeout);
      listener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const setRole = useCallback((newRole: UserRole) => {
    setLegacyRoleState(newRole);
    void kvSet('user_role', newRole);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // V71-P2 — Résout le rôle effectif :
  //  1. Lit `pt:current_farm_id` (kvStore) — partagé avec FarmContext ;
  //  2. Match dans memberships ; sinon prend le 1er membership (single-farm
  //     case courant : 7 users actuels = 7 fermes solo) ;
  //  3. Map vers UserRole legacy via mapToLegacyRole().
  const storedFarmId = kvGet(CURRENT_FARM_ID_KV_KEY);
  const activeMembership =
    (storedFarmId && memberships.find((m) => m.farm_id === storedFarmId)) ||
    memberships[0] ||
    null;
  const currentRole: FarmRole | null = activeMembership?.role ?? null;
  const role = mapToLegacyRole(currentRole, profile?.role, legacyRole);
  const userName = profile?.full_name ?? (kvGet('user_name') as string | null) ?? 'Utilisateur';
  const isOwner = role === 'OWNER';
  const user = session?.user ?? null;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        profileLoaded,
        signOut,
        refreshProfile,
        role,
        userName,
        setRole,
        isOwner,
        currentRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
};
