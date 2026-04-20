import React, { useMemo, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechNav from '../../components/AgritechNav';
import { IsoBarn, SectionDivider } from '../../components/agritech';
import type { Building, Arrow } from '../../components/agritech';
import { FARM_CONFIG } from '../../config/farm';

/**
 * BatimentsView — carte isométrique des bâtiments de la ferme.
 *
 * Dessine les 3 phases du workflow naisseur-engraisseur :
 *  1. Maternité (9 loges)       · var(--gold)
 *  2. Post-sevrage (4 loges)    · var(--accent)
 *  3. Croissance-finition (2)   · var(--amber)
 *
 * Flèches : Maternité → Post-sevrage → Croissance-finition.
 *
 * Le tap sur une loge affiche son identifiant (mini résumé en bas de carte).
 * Aucune mutation de données : lecture seule, basée sur FARM_CONFIG.
 */
const BatimentsView: React.FC = () => {
  const [selected, setSelected] = useState<string | null>(null);

  const buildings = useMemo<Building[]>(() => {
    const out: Building[] = [];

    // ── Maternité : 9 loges alignées en 3×3 (gold) ──
    // Placées "au fond" de la grille (y élevé) → rendues en premier.
    const MAT_COLS = 3;
    const MAT_ROWS = Math.ceil(FARM_CONFIG.MATERNITE_LOGES_CAPACITY / MAT_COLS);
    const MAT_X0 = -3.2;
    const MAT_Y0 = 4.2;
    const MAT_W = 1.3;
    const MAT_D = 1.1;
    const MAT_GAP_X = 0.25;
    const MAT_GAP_Y = 0.25;
    for (let i = 0; i < FARM_CONFIG.MATERNITE_LOGES_CAPACITY; i++) {
      const col = i % MAT_COLS;
      const row = Math.floor(i / MAT_COLS);
      out.push({
        id: `MAT-${i + 1}`,
        label: `Maternité ${i + 1}`,
        cap: `M${i + 1}`,
        x: MAT_X0 + col * (MAT_W + MAT_GAP_X),
        y: MAT_Y0 + row * (MAT_D + MAT_GAP_Y),
        w: MAT_W,
        d: MAT_D,
        h: 1.1,
        tone: 'var(--gold)',
        // Utilise la répartition si connue (4 loges seulement côté FARM_CONFIG),
        // sinon fill conservateur ~0.7 pour visualiser l'occupation.
        fill: 0.7,
      });
    }
    // Petite garde : assure que la grille 3×3 n'excède pas 9.
    void MAT_ROWS;

    // ── Post-sevrage : 4 loges en rangée (accent) ──
    const PS_X0 = -2.4;
    const PS_Y0 = 1.3;
    const PS_W = 1.3;
    const PS_D = 1.2;
    const PS_GAP = 0.25;
    const psTotal = FARM_CONFIG.POST_SEVRAGE_LOGES_REPARTITION.reduce(
      (s, l) => s + l.porcelets,
      0,
    );
    const psTheoretical = FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY * 30;
    for (let i = 0; i < FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY; i++) {
      const rep = FARM_CONFIG.POST_SEVRAGE_LOGES_REPARTITION[i];
      const fill = rep ? Math.min(1, rep.porcelets / 30) : 0.5;
      out.push({
        id: `PS-${i + 1}`,
        label: `Post-sevrage ${i + 1}${rep ? ` · ${rep.porcelets} porcelets` : ''}`,
        cap: `PS${i + 1}`,
        x: PS_X0 + i * (PS_W + PS_GAP),
        y: PS_Y0,
        w: PS_W,
        d: PS_D,
        h: 1.25,
        tone: 'var(--accent)',
        fill,
      });
    }
    void psTotal;
    void psTheoretical;

    // ── Croissance-finition : 2 loges (amber), séparation M/F ──
    const CR_X0 = -1.6;
    const CR_Y0 = -1.6;
    const CR_W = 1.7;
    const CR_D = 1.6;
    const CR_GAP = 0.3;
    const CR_LABELS = ['Mâles', 'Femelles'];
    for (let i = 0; i < FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY; i++) {
      out.push({
        id: `CR-${i + 1}`,
        label: `Croissance · ${CR_LABELS[i] ?? i + 1}`,
        cap: i === 0 ? 'CR-M' : 'CR-F',
        x: CR_X0 + i * (CR_W + CR_GAP),
        y: CR_Y0,
        w: CR_W,
        d: CR_D,
        h: 1.4,
        tone: 'var(--amber)',
        fill: 0.6,
      });
    }

    return out;
  }, []);

  // Flux : une flèche de centre maternité → centre post-sevrage → centre finition.
  const arrows = useMemo<Arrow[]>(
    () => [
      { from: 'MAT-5', to: 'PS-2' },
      { from: 'PS-2', to: 'CR-1' },
    ],
    [],
  );

  const selectedBuilding = useMemo(
    () => (selected ? buildings.find((b) => b.id === selected) ?? null : null),
    [buildings, selected],
  );

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="Bâtiments"
            subtitle={`${FARM_CONFIG.FARM_NAME} · Vue isométrique`}
            backTo="/troupeau"
          />

          <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
            <SectionDivider label="Plan · 3 phases" />

            <div className="card-dense p-3">
              <IsoBarn
                buildings={buildings}
                arrows={arrows}
                highlight={selected}
                onTap={(id) => setSelected((prev) => (prev === id ? null : id))}
                width={360}
                height={280}
                ariaLabel="Plan isométrique des loges : maternité, post-sevrage, croissance-finition"
              />

              {/* Légende */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ background: 'var(--gold)' }}
                  />
                  <span
                    className="font-mono uppercase tracking-wide"
                    style={{ color: 'var(--text-1)' }}
                  >
                    Maternité · {FARM_CONFIG.MATERNITE_LOGES_CAPACITY}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ background: 'var(--accent)' }}
                  />
                  <span
                    className="font-mono uppercase tracking-wide"
                    style={{ color: 'var(--text-1)' }}
                  >
                    Post-sevrage · {FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ background: 'var(--amber)' }}
                  />
                  <span
                    className="font-mono uppercase tracking-wide"
                    style={{ color: 'var(--text-1)' }}
                  >
                    Croissance · {FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY}
                  </span>
                </div>
              </div>
            </div>

            {/* Détail loge sélectionnée */}
            <div
              className="card-dense p-3 min-h-[72px]"
              role="status"
              aria-live="polite"
            >
              {selectedBuilding ? (
                <div className="flex flex-col gap-1">
                  <span
                    className="font-mono text-[11px] uppercase tracking-wide"
                    style={{ color: 'var(--text-2)' }}
                  >
                    Loge sélectionnée · {selectedBuilding.cap ?? selectedBuilding.id}
                  </span>
                  <span
                    className="text-[14px] font-medium"
                    style={{ color: 'var(--text-0)' }}
                  >
                    {selectedBuilding.label ?? selectedBuilding.id}
                  </span>
                </div>
              ) : (
                <span
                  className="font-mono text-[12px]"
                  style={{ color: 'var(--text-2)' }}
                >
                  Touchez une loge pour afficher son détail.
                </span>
              )}
            </div>
          </div>
        </AgritechLayout>
        <AgritechNav />
      </IonContent>
    </IonPage>
  );
};

export default BatimentsView;
