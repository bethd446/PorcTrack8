/**
 * V70 — Page 404 (Not Found)
 *
 * P2 UX fix : remplace le catch-all `<Navigate to="/today">` silencieux par
 * une page 404 explicite. L'éleveur doit comprendre qu'il a atterri sur une
 * URL invalide (typo, lien obsolète, deep-link cassé) plutôt que de se
 * retrouver muet sur /today sans signal.
 *
 * DNA V70 strict : tokens var(--pt-*), pas d'emoji, copy métier sobre.
 * Pattern visuel aligné sur EntityNotFoundCard.
 */
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const NotFoundV70: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleHome = () => navigate('/today', { replace: true });

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        padding: 32,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        minHeight: 'calc(100vh - 200px)',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--pt-font-display)',
          fontSize: 64,
          fontWeight: 800,
          lineHeight: 1,
          color: 'var(--pt-primary)',
          letterSpacing: '-0.04em',
        }}
      >
        404
      </span>
      <h1
        style={{
          fontFamily: 'var(--pt-font-display)',
          fontSize: 24,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
          color: 'var(--pt-text)',
          margin: 0,
        }}
      >
        Page introuvable
      </h1>
      <p
        style={{
          fontSize: 14,
          color: 'var(--pt-muted, var(--pt-text-muted))',
          maxWidth: 360,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        L'adresse <code style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 12 }}>{location.pathname}</code> n'existe pas dans PorcTrack. Lien obsolète ou faute de frappe.
      </p>
      <button
        type="button"
        onClick={handleHome}
        style={{
          padding: '12px 28px',
          background: 'var(--pt-primary)',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontWeight: 600,
          fontFamily: 'var(--pt-font-display)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontSize: 13,
          marginTop: 8,
        }}
      >
        Retour à l'accueil
      </button>
    </div>
  );
};

export default NotFoundV70;
