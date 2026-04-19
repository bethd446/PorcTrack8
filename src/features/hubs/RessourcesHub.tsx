import React, { useMemo } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import {
  Wheat,
  Syringe,
  Calculator,
  ClipboardList,
  AlertOctagon,
  Package,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { HubTile, Chip } from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import { cn } from '../../lib/utils';

/**
 * RessourcesHub — entrée stocks : Aliments · Pharmacie · Formules · Plan Alim.
 *
 * Enrichi avec une bannière d'alertes RUPTURE (Aliments + Véto) au-dessus
 * des HubTiles, et des chips de statut sur chaque tuile.
 */
const RessourcesHub: React.FC = () => {
  const { stockAliment, stockVeto } = useFarm();
  const navigate = useNavigate();

  // Agrégations live (memo pour éviter recompute à chaque render parent).
  const counts = useMemo(() => {
    const alimentRupture = stockAliment.filter(s => s.statutStock === 'RUPTURE').length;
    const alimentBas = stockAliment.filter(s => s.statutStock === 'BAS').length;
    const vetoRupture = stockVeto.filter(v => v.statutStock === 'RUPTURE').length;
    const vetoBas = stockVeto.filter(v => v.statutStock === 'BAS').length;
    return {
      alimentTotal: stockAliment.length,
      alimentRupture,
      alimentBas,
      vetoTotal: stockVeto.length,
      vetoRupture,
      vetoBas,
      hasAlerts: alimentRupture > 0 || vetoRupture > 0,
    };
  }, [stockAliment, stockVeto]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader title="RESSOURCES" subtitle="Aliments · Pharmacie · Protocoles" />

          <div className="px-4 pt-4 flex flex-col gap-3">
            {/* ── Bannière alertes RUPTURE ────────────────────────── */}
            {counts.hasAlerts ? (
              <button
                type="button"
                onClick={() => navigate('/alerts')}
                aria-label="Voir les alertes stock"
                className={cn(
                  'card-dense pressable w-full text-left flex items-center gap-3',
                  'border-l-2 border-l-red',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2'
                )}
              >
                <span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-bg-2 text-red"
                  aria-hidden="true"
                >
                  <AlertOctagon size={22} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="agritech-heading text-[15px] uppercase leading-tight text-red">
                    Alertes stock
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-text-2">
                    {counts.alimentRupture > 0 ? (
                      <span>
                        Aliments : {counts.alimentRupture} en RUPTURE
                      </span>
                    ) : null}
                    {counts.vetoRupture > 0 || counts.vetoBas > 0 ? (
                      <span>
                        Véto :
                        {counts.vetoRupture > 0 ? ` ${counts.vetoRupture} en RUPTURE` : ''}
                        {counts.vetoRupture > 0 && counts.vetoBas > 0 ? ' ·' : ''}
                        {counts.vetoBas > 0 ? ` ${counts.vetoBas} en BAS` : ''}
                      </span>
                    ) : null}
                  </div>
                </div>

                <ChevronRight size={18} className="shrink-0 text-text-2" aria-hidden="true" />
              </button>
            ) : null}

            {/* ── HubTile Aliments ────────────────────────────────── */}
            <div className="relative">
              <HubTile
                icon={<Wheat size={22} />}
                title="Aliments"
                subtitle="Stocks · plan d'alimentation"
                count={counts.alimentTotal}
                to="/ressources/aliments"
                tone="amber"
              />
              {counts.alimentRupture > 0 ? (
                <div className="pointer-events-none absolute right-14 top-1/2 -translate-y-1/2">
                  <Chip tone="red" label={`${counts.alimentRupture} rupture`} />
                </div>
              ) : null}
            </div>

            {/* ── HubTile Plan Alim ───────────────────────────────── */}
            <HubTile
              icon={<Calculator size={22} />}
              title="Plan Alim"
              subtitle="Couverture · rations/j"
              to="/ressources/aliments/plan"
              tone="accent"
            />

            {/* ── HubTile Formules ────────────────────────────────── */}
            <HubTile
              icon={<ClipboardList size={22} />}
              title="Formules"
              subtitle="5 recettes validées"
              count={5}
              to="/ressources/aliments/formules"
              tone="amber"
            />

            {/* ── HubTile Pharmacie (NOUVEAU) ─────────────────────── */}
            <div className="relative">
              <HubTile
                icon={<Package size={22} />}
                title="Pharmacie"
                subtitle="Produits vétérinaires actifs"
                count={counts.vetoTotal}
                to="/ressources/pharmacie"
                tone="accent"
              />
              {counts.vetoRupture > 0 || counts.vetoBas > 0 ? (
                <div className="pointer-events-none absolute right-14 top-1/2 -translate-y-1/2">
                  <Chip
                    tone={counts.vetoRupture > 0 ? 'red' : 'amber'}
                    label={
                      counts.vetoRupture > 0
                        ? `${counts.vetoRupture} rupture`
                        : `${counts.vetoBas} bas`
                    }
                  />
                </div>
              ) : null}
            </div>

            {/* ── HubTile Véto (legacy — table brute) ─────────────── */}
            <HubTile
              icon={<Syringe size={22} />}
              title="Véto"
              subtitle="Vue tabulaire (brut)"
              count={counts.vetoTotal}
              to="/ressources/veto"
              tone="accent"
            />
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default RessourcesHub;
