/**
 * EntityNotFoundGuard — V74 Vague U
 * ════════════════════════════════════════════════════════════════════════════
 * Composants partagés utilisés par les vues "Detail" (truie, verrat, bande,
 * loge…) pour traiter uniformément les états :
 *   - SpinnerCenter        : pendant chargement initial / retry FarmContext
 *   - EntityNotFoundCard   : entité réellement absente après retry
 *
 * Couplé au hook `useEntityWithRetry` (src/hooks/useEntityWithRetry.ts).
 *
 * DNA V70 strict : tokens var(--pt-*), pas d'emoji, copy concrète métier.
 */
import React from 'react';
import { IonSpinner } from '@ionic/react';

interface SpinnerCenterProps {
  label?: string;
}

export const SpinnerCenter: React.FC<SpinnerCenterProps> = ({
  label = 'Chargement…',
}) => (
  <div
    role="status"
    aria-live="polite"
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 48,
      gap: 12,
      minHeight: 240,
    }}
  >
    <IonSpinner name="dots" color="primary" aria-hidden="true" />
    <span
      style={{
        fontSize: 13,
        color: 'var(--pt-muted, var(--pt-text-muted))',
        fontFamily: 'var(--pt-font-body)',
      }}
    >
      {label}
    </span>
  </div>
);

interface EntityNotFoundCardProps {
  /** Libellé de l'entité au singulier ("bande", "truie", "verrat", "loge"). */
  label: string;
  /** Callback bouton "Retour" (par défaut : navigate(-1) côté appelant). */
  onBack: () => void;
  /** Override message si besoin. Par défaut : "Cette {label} n'existe pas ou plus." */
  message?: string;
}

export const EntityNotFoundCard: React.FC<EntityNotFoundCardProps> = ({
  label,
  onBack,
  message,
}) => {
  const cap = label.charAt(0).toUpperCase() + label.slice(1);
  const defaultMsg = `Cette ${label} n'existe pas ou plus dans votre exploitation.`;
  return (
    <div
      role="alert"
      style={{
        padding: 32,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        minHeight: 240,
        justifyContent: 'center',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--pt-font-display)',
          fontSize: 22,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
          color: 'var(--pt-text)',
          margin: 0,
        }}
      >
        {cap} introuvable
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
        {message ?? defaultMsg}
      </p>
      <button
        type="button"
        onClick={onBack}
        style={{
          padding: '10px 24px',
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
        }}
      >
        Retour
      </button>
    </div>
  );
};
