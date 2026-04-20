import React, { useMemo } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFarm } from '../../context/FarmContext';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechNav from '../../components/AgritechNav';
import { Chip, DataRow, SectionDivider } from '../../components/agritech';
import { BandeIcon } from '../../components/icons';
import { FARM_CONFIG } from '../../config/farm';
import { Bandes } from '../../services/bandAnalysisEngine';
import type { BandePorcelets } from '../../types/farm';

// ─── Utilitaires locaux ────────────────────────────────────────────────────

/**
 * Parse une date au format `dd/MM/yyyy`, `YYYY-MM-DD`, ou ISO. Retourne `null`
 * si le format n'est pas reconnu. Duplique la logique défensive déjà présente
 * dans `bandesAggregator.parseDateFr` mais tolère aussi les dates Date/ISO.
 */
function parseDateLoose(raw: string | undefined): Date | null {
  if (!raw) return null;
  const fr = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

/** Jours écoulés entre deux dates (arrondi bas, positif si `to` ≥ `from`). */
function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Âge en jours depuis la MB, ou `null` si date illisible. */
function ageDepuisMB(bande: BandePorcelets, today: Date = new Date()): number | null {
  const d = parseDateLoose(bande.dateMB);
  if (!d) return null;
  return daysBetween(d, today);
}

/** Jours écoulés depuis le sevrage (réel ou prévu), ou `null`. */
function joursDepuisSevrage(bande: BandePorcelets, today: Date = new Date()): number | null {
  const d = parseDateLoose(bande.dateSevrageReelle || bande.dateSevragePrevue);
  if (!d) return null;
  return daysBetween(d, today);
}

// ─── Composant principal ───────────────────────────────────────────────────

/**
 * TroupeauPorceletsView — vue dédiée aux bandes actives et porcelets.
 *
 * Trois sections principales :
 *  1. Sous mère        — portées en maternité (bandes actives, statut "Sous mère").
 *  2. Post-sevrage     — 4 loges physiques (répartition manuelle FARM_CONFIG).
 *  3. Engraissement    — bandes sevrées depuis > POST_SEVRAGE_DUREE_JOURS.
 *
 * Montée sur `/troupeau/porcelets`.
 */
const TroupeauPorceletsView: React.FC = () => {
  const navigate = useNavigate();
  const { bandes, refreshData } = useFarm();

  // ── Données dérivées ────────────────────────────────────────────────────
  const realBandes = useMemo(() => Bandes.filterReal(bandes), [bandes]);

  /** Bandes en maternité (statut "Sous mère"). */
  const sousMere = useMemo(
    () => realBandes.filter(b => /sous.m/i.test(b.statut || '')),
    [realBandes],
  );

  /** Bandes en engraissement (Sevrés + > POST_SEVRAGE_DUREE_JOURS jours post-sevrage). */
  const engraissement = useMemo(() => {
    return realBandes.filter(b => {
      if (!/sevr/i.test(b.statut || '')) return false;
      const jours = joursDepuisSevrage(b);
      if (jours === null) return false;
      return jours > FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS;
    });
  }, [realBandes]);

  /** Totaux porcelets. */
  const smCount = useMemo(() => Bandes.countSm(realBandes), [realBandes]);
  const postSevragePorcelets = useMemo(
    () => FARM_CONFIG.POST_SEVRAGE_LOGES_REPARTITION.reduce((s, l) => s + l.porcelets, 0),
    [],
  );
  const totalPorcelets = smCount.porcelets + postSevragePorcelets;

  const hasAnyActive = realBandes.length > 0;

  const handleRefresh = async (e: CustomEvent<{ complete: () => void }>) => {
    await refreshData();
    e.detail.complete();
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <AgritechLayout>
          <AgritechHeader
            title="Porcelets"
            subtitle={`${totalPorcelets} porcelets · A130`}
            backTo="/troupeau"
          />

          <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
            {/* Summary strip ─────────────────────────────────────────── */}
            <div
              className="flex items-stretch justify-between gap-3 card-dense py-3"
              role="region"
              aria-label="Résumé porcelets"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="kpi-label">Total</span>
                <span className="font-mono tabular-nums text-[15px] font-bold text-text-0">
                  {totalPorcelets}
                  <span className="text-text-2 font-medium"> porcelets</span>
                </span>
              </div>
              <div className="h-8 w-px bg-border shrink-0" aria-hidden="true" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="kpi-label">Sous mère</span>
                <span className="font-mono tabular-nums text-[15px] font-bold text-text-0">
                  {smCount.porcelets}
                </span>
              </div>
              <div className="h-8 w-px bg-border shrink-0" aria-hidden="true" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="kpi-label">Post-sevrage</span>
                <span className="font-mono tabular-nums text-[15px] font-bold text-text-0">
                  {postSevragePorcelets}
                </span>
              </div>
            </div>

            {/* Empty state ─────────────────────────────────────────────── */}
            {!hasAnyActive ? (
              <div
                className="flex flex-col items-center justify-center gap-3 py-16 text-center"
                role="region"
                aria-label="État vide porcelets"
              >
                <BandeIcon size={48} className="text-text-2" />
                <p className="text-[14px] font-medium text-text-1">
                  Aucune bande en cours
                </p>
                <p className="font-mono text-[11px] text-text-2">
                  Les bandes apparaîtront ici dès la première mise-bas.
                </p>
              </div>
            ) : (
              <>
                {/* Section Sous mère ──────────────────────────────────── */}
                <section role="region" aria-label="Bandes sous mère">
                  <SectionDivider label={`Sous mère · ${sousMere.length}`} />
                  {sousMere.length === 0 ? (
                    <p className="px-1 font-mono text-[11px] text-text-2">
                      Aucune portée en maternité actuellement.
                    </p>
                  ) : (
                    <div
                      role="list"
                      aria-label="Liste des portées sous mère"
                      className="rounded-md border border-border bg-bg-1 overflow-hidden"
                    >
                      {sousMere.map(b => {
                        const age = ageDepuisMB(b);
                        const porcelets = b.vivants ?? 0;
                        const boucle = b.boucleMere ? ` · B.${b.boucleMere}` : '';
                        const primary = `${b.idPortee}${boucle}`;
                        const secondaryParts: string[] = [];
                        secondaryParts.push(`${porcelets} porcelets`);
                        if (age !== null) secondaryParts.push(`J+${age}`);
                        const secondary = secondaryParts.join(' · ');

                        return (
                          <div role="listitem" key={b.id}>
                            <DataRow
                              primary={primary}
                              secondary={secondary}
                              accessory={
                                <div className="flex items-center gap-2">
                                  <BandeIcon size={18} className="text-text-2" />
                                  <Chip label="Maternité" tone="gold" size="xs" />
                                </div>
                              }
                              onClick={() => navigate(`/troupeau/bandes/${b.id}`)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* Section Post-sevrage ───────────────────────────────── */}
                <section role="region" aria-label="Loges post-sevrage">
                  <SectionDivider
                    label={`Post-sevrage · ${postSevragePorcelets} porcelets`}
                  />
                  <div
                    role="list"
                    aria-label="Loges post-sevrage"
                    className="rounded-md border border-border bg-bg-1 overflow-hidden"
                  >
                    {FARM_CONFIG.POST_SEVRAGE_LOGES_REPARTITION.map(loge => {
                      // Seuil indicatif par loge (30 porcelets → barre à 100 %).
                      const cap = 30;
                      const pct = Math.min(100, Math.round((loge.porcelets / cap) * 100));
                      return (
                        <div role="listitem" key={loge.id}>
                          <DataRow
                            primary={`${loge.id} · ${loge.porcelets} porcelets`}
                            secondary={`${pct}% de capacité (${cap})`}
                            accessory={
                              <Home size={18} className="text-text-2" aria-hidden="true" />
                            }
                            meta={
                              <div
                                className="h-1.5 w-16 rounded-full bg-bg-2 overflow-hidden"
                                role="progressbar"
                                aria-valuenow={pct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`${loge.id} remplissage`}
                              >
                                <div
                                  className="h-full bg-accent"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-text-2">
                    Total post-sevrage: {postSevragePorcelets} porcelets
                  </p>
                </section>

                {/* Section Engraissement ──────────────────────────────── */}
                {engraissement.length > 0 && (
                  <section role="region" aria-label="Bandes en engraissement">
                    <SectionDivider label={`Engraissement · ${engraissement.length}`} />
                    <div
                      role="list"
                      aria-label="Liste des bandes en engraissement"
                      className="rounded-md border border-border bg-bg-1 overflow-hidden"
                    >
                      {engraissement.map(b => {
                        const porcelets = b.vivants ?? 0;
                        const primary = `${b.idPortee}`;
                        const secondary = `${porcelets} vivants`;
                        return (
                          <div role="listitem" key={b.id}>
                            <DataRow
                              primary={primary}
                              secondary={secondary}
                              accessory={
                                <div className="flex items-center gap-2">
                                  <BandeIcon size={18} className="text-text-2" />
                                  <Chip label="Engraissement" tone="amber" size="xs" />
                                </div>
                              }
                              onClick={() => navigate(`/troupeau/bandes/${b.id}`)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </AgritechLayout>
        <AgritechNav />
      </IonContent>
    </IonPage>
  );
};

export default TroupeauPorceletsView;
