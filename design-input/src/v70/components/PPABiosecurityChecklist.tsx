/**
 * PPABiosecurityChecklist — Checklist biosécurité PPA (Peste Porcine Africaine)
 * ────────────────────────────────────────────────────────────────────────────
 * Différenciateur marché Côte d'Ivoire : la PPA est l'enjeu sanitaire n°1
 * du pays (épizootie 2024 = 100 000 têtes abattues, 20 Mds FCFA pertes).
 *
 * Cette checklist guide l'éleveur sur les mesures de biosécurité essentielles
 * pour prévenir l'entrée de la PPA dans son élevage. L'état est persisté en
 * local (kvStore) — pas de table dédiée pour rester migration-free.
 *
 * Composant standalone : intégrable dans /reglages/ma-ferme ou /ressources/
 * protocoles dans un sprint ultérieur.
 */

import React, { useEffect, useState } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'pt:ppa:biosec:v1';

export interface BiosecurityItem {
  id: string;
  label: string;
  description: string;
  critical: boolean;
}

export const BIOSECURITY_ITEMS: ReadonlyArray<BiosecurityItem> = [
  {
    id: 'cloture',
    label: 'Clôture périmétrique',
    description: 'Clôture solide tout autour de la ferme empêche entrée animaux sauvages (phacochères, potamochères) porteurs PPA.',
    critical: true,
  },
  {
    id: 'pediluve',
    label: 'Pédiluve à l\'entrée',
    description: 'Bac avec désinfectant (chlore, ammonium quaternaire) à chaque entrée de bâtiment. Renouveler 1×/jour.',
    critical: true,
  },
  {
    id: 'quarantaine',
    label: 'Quarantaine 30 jours nouveaux animaux',
    description: 'Tout animal entrant (achat, reprise) reste 30 jours isolé avant d\'intégrer le cheptel. Observer fièvre, comportement.',
    critical: true,
  },
  {
    id: 'visiteurs',
    label: 'Contrôle accès visiteurs',
    description: 'Registre signé des visiteurs + 48h sans contact porc avant entrée. Vêtements/bottes dédiés sur place.',
    critical: false,
  },
  {
    id: 'alim_origine',
    label: 'Aliment d\'origine contrôlée',
    description: 'Pas de déchets cuisine non cuits (PPA résiste cuisson partielle). Privilégier aliments commercialisés ou maison cuit.',
    critical: false,
  },
  {
    id: 'morts_evacuation',
    label: 'Évacuation rapide des morts',
    description: 'Animal mort = enfouissement profond (chaux) ou incinération sous 24h. Pas de stockage dans la ferme.',
    critical: true,
  },
  {
    id: 'tiques_lutte',
    label: 'Lutte contre tiques Ornithodoros',
    description: 'Pulvérisation acaricide bâtiments + abords 2×/an. Les tiques sont vectrices reconnues de PPA.',
    critical: false,
  },
  {
    id: 'vehicules_desinfection',
    label: 'Désinfection véhicules entrants',
    description: 'Camions livraison/collecte : passage par pédiluve + pulvérisation roues à l\'entrée et sortie.',
    critical: false,
  },
];

type ChecklistState = Record<string, boolean>;

function loadState(): ChecklistState {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChecklistState) : {};
  } catch {
    return {};
  }
}

function saveState(state: ChecklistState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // silencieux : mode privé strict OK
  }
}

export const PPABiosecurityChecklist: React.FC = () => {
  const [state, setState] = useState<ChecklistState>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  const toggle = (id: string): void => {
    const next = { ...state, [id]: !state[id] };
    setState(next);
    saveState(next);
  };

  if (!hydrated) {
    return null;
  }

  const total = BIOSECURITY_ITEMS.length;
  const done = BIOSECURITY_ITEMS.filter(i => state[i.id]).length;
  const criticalMissing = BIOSECURITY_ITEMS.filter(i => i.critical && !state[i.id]).length;

  return (
    <section
      aria-label="Biosécurité PPA"
      style={{
        background: 'var(--pt-bg, #FAF7F0)',
        border: '1px solid var(--pt-line, rgba(26,26,26,0.08))',
        borderRadius: 16,
        padding: 16,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Shield size={20} aria-hidden style={{ color: 'var(--pt-accent-deep, #c2662b)' }} />
        <div>
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--pt-font-display, system-ui)',
              fontSize: 16,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            Biosécurité PPA
          </h3>
          <p
            style={{
              margin: '2px 0 0',
              fontSize: 12,
              color: 'var(--pt-muted, #6b6357)',
            }}
          >
            {done}/{total} mesures en place
            {criticalMissing > 0 && (
              <span style={{ color: 'var(--pt-danger, #a4453d)', marginLeft: 6 }}>
                · {criticalMissing} critique{criticalMissing > 1 ? 's' : ''} manquante{criticalMissing > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
      </header>

      {criticalMissing > 0 && (
        <div
          role="alert"
          style={{
            display: 'flex',
            gap: 8,
            padding: '10px 12px',
            marginBottom: 12,
            background: 'rgba(164,69,61,0.08)',
            border: '1px solid rgba(164,69,61,0.25)',
            borderRadius: 10,
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          <AlertTriangle
            size={16}
            aria-hidden
            style={{ color: 'var(--pt-danger, #a4453d)', flexShrink: 0, marginTop: 1 }}
          />
          <span>
            La PPA (Peste Porcine Africaine) a coûté plus de <strong>20 Mds FCFA aux éleveurs ivoiriens en 2024</strong>.
            Aucun vaccin disponible. Les mesures critiques ci-dessous sont ta seule protection.
          </span>
        </div>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {BIOSECURITY_ITEMS.map(item => {
          const checked = !!state[item.id];
          return (
            <li key={item.id}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  background: checked ? 'rgba(45,74,31,0.05)' : 'var(--pt-warm, #F1ECE0)',
                  border: '1px solid var(--pt-line, rgba(26,26,26,0.08))',
                  borderRadius: 10,
                  cursor: 'pointer',
                  minHeight: 48,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(item.id)}
                  aria-label={`Activer ${item.label}`}
                  style={{ marginTop: 3, width: 18, height: 18, accentColor: 'var(--pt-primary, #2D4A1F)' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--pt-ink, #1a1a1a)',
                      marginBottom: 2,
                    }}
                  >
                    {item.label}
                    {item.critical && (
                      <span
                        style={{
                          fontSize: 9,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: 'var(--pt-danger, #a4453d)',
                          fontWeight: 700,
                          fontFamily: 'var(--pt-font-mono, monospace)',
                        }}
                      >
                        Critique
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--pt-muted, #6b6357)' }}>
                    {item.description}
                  </div>
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default PPABiosecurityChecklist;
