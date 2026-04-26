import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/user.types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}

/**
 * Wrapper de sécurisation des routes par rôle
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { role } = useAuth();

  if (!allowedRoles.includes(role)) {
    // Redirection si le rôle n'est pas autorisé
    return <Navigate to="/cycles" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
