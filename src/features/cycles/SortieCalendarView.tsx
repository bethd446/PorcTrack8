import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { Calendar, Truck, Scale, TrendingUp } from 'lucide-react';

import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { KpiCard, DataRow, Chip, SectionDivider, type ChipTone } from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import { filterRealPortees } from '../../services/bandesAggregator';
import type { BandePorcelets } from '../../types/farm';
import QuickVenteForm from '../../components/forms/QuickVenteForm';

/**
 * SortieCalendarView — Calendrier prévisionnel des sorties abattoir.
 *
 * Basé sur le modèle de croissance : 25 kg (sevrage) + 0.65 kg/j.
 * Cible abattage : 90 kg vif.
 */

const POIDS_SEVRAGE_KG = 25;
const GMQ_POST_SEVRAGE_KG = 0.65;
const POIDS_CIBLE_KG = 90;

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

const SortieCalendarView: React.FC = () => {
  const navigate = useNavigate();
  const { bandes, refreshData } = useFarm();
  const today = useMemo(() => new Date(), []);
  const [venteBande, setVenteBande] = useState<BandePorcelets | null>(null);

  const calendar = useMemo(() => {
    const realBandes = filterRealPortees(bandes);
    const sevrées = realBandes.filter(b => /sevr/i.test(b.statut || ''));

    const items = sevrées.map(b => {
      const sevrage = parseDate(b.dateSevrageReelle || b.dateSevragePrevue);
      if (!sevrage) return null;

      // Jours pour atteindre 90kg depuis le sevrage (25kg)
      // (90 - 25) / 0.65 = 100 jours
      const joursEngraissement = Math.ceil((POIDS_CIBLE_KG - POIDS_SEVRAGE_KG) / GMQ_POST_SEVRAGE_KG);
      const dateSortiePrevue = addDays(sevrage, joursEngraissement);

      const diffMs = dateSortiePrevue.getTime() - today.getTime();
      const daysAhead = Math.ceil(diffMs / 86_400_000);

      return {
        bande: b,
        dateSortiePrevue,
        daysAhead,
        poidsActuel: Math.min(110, POIDS_SEVRAGE_KG + (Math.max(0, Math.floor((today.getTime() - sevrage.getTime()) / 86_400_000)) * GMQ_POST_SEVRAGE_KG))
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    // Tri par date de sortie croissante
    items.sort((a, b) => a.dateSortiePrevue.getTime() - b.dateSortiePrevue.getTime());

    return items;
  }, [bandes, today]);

  const sortiesProches = calendar.filter(i => i.daysAhead <= 14);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <IonRefresher slot="fixed" onIonRefresh={e => refreshData().finally(() => e.detail.complete())}>
          <IonRefresherContent />
        </IonRefresher>

        <AgritechLayout>
          <AgritechHeader
            title="Sorties Abattoir"
            subtitle="Prévisions basées sur le poids (90kg)"
            backTo="/cycles/finition"
          />

          <div className="px-4 pt-4 pb-32 space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                label="Prochaines 14j"
                value={sortiesProches.length}
                icon={<Truck size={14} />}
                tone={sortiesProches.length > 0 ? 'warning' : 'default'}
              />
              <KpiCard
                label="Total en cours"
                value={calendar.length}
                icon={<Scale size={14} />}
              />
            </div>

            <section aria-label="Calendrier des sorties">
              <SectionDivider label="Échéancier sorties" />
              {calendar.length === 0 ? (
                <div className="card-dense text-center py-12">
                  <Calendar size={40} className="mx-auto text-text-2 mb-3 opacity-20" />
                  <p className="font-mono text-[12px] text-text-2">Aucune bande sevrée enregistrée.</p>
                </div>
              ) : (
                <div className="card-dense !p-0 overflow-hidden mt-3">
                  {calendar.map(({ bande, dateSortiePrevue, daysAhead, poidsActuel }) => {
                    const tone: ChipTone = daysAhead <= 0 ? 'red' : daysAhead <= 7 ? 'amber' : 'default';
                    const label = daysAhead <= 0 ? 'À SORTIR' : daysAhead === 1 ? 'DEMAIN' : `J-${daysAhead}`;

                    return (
                      <div key={bande.id} className="border-b border-border last:border-b-0">
                        <DataRow
                          primary={bande.idPortee || bande.id}
                          secondary={`~${Math.round(poidsActuel)} kg · ${bande.vivants} têtes · MB ${bande.dateMB || '?'}`}
                          meta={formatDate(dateSortiePrevue)}
                          accessory={<Chip label={label} tone={tone} size="xs" />}
                          onClick={() => navigate(`/troupeau/bandes/${encodeURIComponent(bande.id)}`)}
                        />
                        <div className="px-4 pb-3 -mt-1 flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setVenteBande(bande);
                            }}
                            className="pressable inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-amber/10 text-amber border border-amber/30 font-mono text-[11px] font-bold uppercase tracking-wide transition-colors hover:bg-amber/20"
                          >
                            <TrendingUp size={12} aria-hidden="true" />
                            Saisir sortie abattoir
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </AgritechLayout>

        {venteBande && (
          <QuickVenteForm
            isOpen={!!venteBande}
            onClose={() => setVenteBande(null)}
            bande={venteBande}
          />
        )}
      </IonContent>
    </IonPage>
  );
};

export default SortieCalendarView;
