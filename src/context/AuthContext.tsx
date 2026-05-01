import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { kvGet, kvSet } from '../services/kvStore';
import type { UserRole } from '../types/user.types';

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

  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;

  role: UserRole;
  userName: string;
  setRole: (role: UserRole) => void;
  isOwner: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapToLegacyRole(supabaseRole: string | null | undefined, fallback: UserRole): UserRole {
  if (supabaseRole === 'OWNER' || supabaseRole === 'ADMIN') return 'OWNER';
  if (supabaseRole === 'WORKER' || supabaseRole === 'PORCHER') return 'WORKER';
  return fallback;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<SupabaseProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [legacyRole, setLegacyRoleState] = useState<UserRole>(
    () => (kvGet('user_role') as UserRole | null) ?? 'OWNER',
  );

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .single();
    if (error || !data) {
      setProfile(null);
      return;
    }
    setProfile(data as SupabaseProfile);
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
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.warn('[Dev autologin] échec :', error.message);
      } else {
        console.info('[Dev autologin] connecté en tant que', email);
      }
    };

    supabase.auth.getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        if (!data.session) {
          await tryDevAutologin();
          const { data: refreshed } = await supabase.auth.getSession();
          setSession(refreshed.session);
          if (refreshed.session?.user.id) {
            await fetchProfile(refreshed.session.user.id);
          }
        } else {
          setSession(data.session);
          if (data.session.user.id) {
            await fetchProfile(data.session.user.id);
          }
        }
      })
      .catch((err) => {
        console.error('[AuthContext] getSession failed', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      if (newSession?.user.id) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
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

  const role = mapToLegacyRole(profile?.role, legacyRole);
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
        signOut,
        refreshProfile,
        role,
        userName,
        setRole,
        isOwner,
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
