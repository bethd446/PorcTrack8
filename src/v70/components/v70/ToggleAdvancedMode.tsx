/**
 * V70 — ToggleAdvancedMode (Réglages)
 *
 * Switch de bascule "Mode avancé" connecté au contexte UIPreferences.
 * Active : tableaux détaillés (DataTable triable) + export CSV.
 *
 * Toute la card est zone de tap (label) — touch target ≥44px garanti
 * même avec des gants. Le sous-texte liste explicitement ce que le
 * mode débloque ; pas de promesse vague.
 */
import React from 'react';
import { useUIPreferences } from '../../context/UIPreferencesContext';

export const ToggleAdvancedMode: React.FC = () => {
  const { advancedMode, setAdvancedMode } = useUIPreferences();

  return (
    <label
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        cursor: 'pointer',
        minHeight: 44,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: 'var(--pt-font-mono)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--pt-muted)',
            marginBottom: 4,
          }}
        >
          {advancedMode ? 'Activé' : 'Désactivé'}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--pt-ink)' }}>
          Mode avancé
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--pt-muted)',
            marginTop: 4,
            lineHeight: 1.45,
          }}
        >
          Débloque les tableaux triables et l&apos;export CSV dans Performance.
          Graphiques détaillés et export PDF à venir.
        </div>
      </div>
      <input
        type="checkbox"
        role="switch"
        aria-label="Mode avancé"
        aria-checked={advancedMode}
        checked={advancedMode}
        onChange={(e) => setAdvancedMode(e.target.checked)}
        style={{
          width: 28,
          height: 28,
          flexShrink: 0,
          accentColor: 'var(--pt-primary)',
          cursor: 'pointer',
        }}
      />
    </label>
  );
};
