/**
 * V70 — Placeholder /sante (Journal santé).
 *
 * Route câblée pour résoudre les liens orphelins suivants :
 *   - features/admin/PendingValidationsView.tsx:80 — fallback `navigate('/sante')`
 *   - features/outils/OutilsView.tsx:97 — item "Journal santé" (vue legacy non routée)
 *   - components/AppSidebar.tsx:411 — bouton sidebar legacy
 *
 * Section dédiée à venir. En attendant : message clair "en construction" +
 * retour vers /today. DNA V70 strict (tokens var(--pt-*)).
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

export const SantePlaceholder: React.FC = () => {
  const navigate = useNavigate();
  const handleHome = () => navigate('/today', { replace: true });

  return (
    <div
      role="status"
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
          fontSize: 48,
          fontWeight: 800,
          lineHeight: 1,
          color: 'var(--pt-primary)',
          letterSpacing: '-0.04em',
          textTransform: 'uppercase',
        }}
      >
        Journal santé
      </span>
      <h1
        style={{
          fontFamily: 'var(--pt-font-display)',
          fontSize: 18,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
          color: 'var(--pt-ink, var(--pt-text))',
          margin: 0,
        }}
      >
        Section en construction
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
        La consultation centralisée des soins, traitements et mortalités arrive
        bientôt. En attendant, retrouve ces informations sur la fiche bande
        concernée.
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

export default SantePlaceholder;
