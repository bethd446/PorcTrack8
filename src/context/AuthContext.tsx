import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { kvGet, kvSet } from '../services/kvStore';
import { UserRole } from '../types/user.types';

interface AuthContextType {
  role: UserRole;
  userName: string;
  setRole: (role: UserRole) => void;
  isOwner: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setInternalRole] = useState<UserRole>((kvGet('user_role') as UserRole) || 'WORKER');
  const [userName, setUserName] = useState<string>(kvGet('user_name') || 'Utilisateur');

  const setRole = useCallback((newRole: UserRole) => {
    setInternalRole(newRole);
    kvSet('user_role', newRole);
    // On pourrait forcer un window.location.reload() ici pour reset l'état de l'app
  }, []);

  const isOwner = role === 'OWNER';

  return (
    <AuthContext.Provider value={{ role, userName, setRole, isOwner }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
};
