/**
 * V70 — ToggleAdvancedMode (Réglages)
 *
 * Switch de bascule "Mode avancé" connecté au contexte UIPreferences.
 * Active : tableaux détaillés + export CSV.
 */
import React from 'react';
import { useUIPreferences } from '../../context/UIPreferencesContext';

export const ToggleAdvancedMode: React.FC = () => {
  const { advancedMode, setAdvancedMode } = useUIPreferences();

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Mode avancé</div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--pt-muted)',
            marginTop: 4,
          }}
        >
          Affiche les tableaux détaillés et active l'export CSV. Les graphiques
          avancés et l'export PDF arrivent prochainement.
        </div>
      </div>
      <input
        type="checkbox"
        role="switch"
        aria-label="Mode avancé"
        checked={advancedMode}
        onChange={(e) => setAdvancedMode(e.target.checked)}
        style={{ transform: 'scale(1.5)', cursor: 'pointer' }}
      />
    </div>
  );
};
