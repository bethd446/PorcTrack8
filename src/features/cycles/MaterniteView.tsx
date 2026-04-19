import React, { useMemo } from 'react';
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { Baby } from 'lucide-react';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechNav from '../../components/AgritechNav';
import {
  KpiCard,
  Chip,
  DataRow,
  SectionDivider,
  type ChipTone,
  type KpiTone,
} from '../../components/agritech';
import { TruieIcon } from '../../components/icons';
import { useFarm } from '../../context/FarmContext';
import {
  logesMaterniteOccupation,
  filterRealPortees,
  type LogeOccupation,
  type LogeOccupationAlerte,
} from '../../services/bandesAggregator';
import type { BandePorcelets, Truie } from '../../types/farm';

/**
 * MaterniteView — vue opérationnelle "maternité" (A130).
 *
 * Pour chaque truie en maternité (statut "En maternité" / "allaitante" / "lactation"),
 * affiche :
 *  - sa portée sous-mère (reliée via `bande.truie === truie.id` OU
 *    `bande.boucleMere === truie.boucle`)
 *  - le nb de jours depuis la mise-bas (J+X)
 *  - un état chip (récent / proche sevrage J+18+ / mortalité >15%)
 *
 * Source de capacité : `FARM_CONFIG.MATERNITE_LOGES_CAPACITY` (9 loges chauffage).
 * Pas de pesées J3/J7/J14/J21 à ce sprint (placeholder UX).
 */

// ─── Constantes métier (duplication minimale — pas de changement service) ───
const SEVRAGE_JOURS = 21;
const SEVRAGE_PROCHE_JOURS = 18;
const MORTALITE_SEUIL_PCT = 15;

// ─── Helpers internes ───────────────────────────────────────────────────────

/** Parse une date au format `dd/MM/yyyy` ou `YYYY-MM-DD[…]`. */
function parseDate(s?: string): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

/** Diff en jours entier (today − date). `null` si date invalide. */
function daysSince(s: string | undefined, today: Date): number | null {
  const d = parseDate(s);
  if (!d) return null;
  const diffMs = today.getTime() - d.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/** Retourne la portée sous-mère associée à une truie (match par id ou boucle). */
function getTruiePortee(
  truie: Truie,
  bandes: BandePorcelets[]
): BandePorcelets | undefined {
  const sm = bandes.filter(b => /sous.m/i.test(b.statut ?? ''));
  return sm.find(b => {
    if (b.truie && b.truie === truie.id) return true;
    if (b.boucleMere && truie.boucle && b.boucleMere === truie.boucle) return true;
    return false;
  });
}

/** Pourcentage de mortalité d'une portée (0 si NV = 0). */
function mortsPercent(bande: BandePorcelets | undefined): number {
  if (!bande) return 0;
  const nv = bande.nv ?? 0;
  const morts = bande.morts ?? 0;
  if (nv <= 0) return 0;
  return (morts / nv) * 100;
}

/** Tone pour la Chip d'état porté par chaque row. */
function porteeStateChip(
  bande: BandePorcelets | undefined,
  jSinceMB: number | null
): { label: string; tone: ChipTone } {
  if (!bande) return { label: 'Sans portée', tone: 'default' };
  if (mortsPercent(bande) > MORTALITE_SEUIL_PCT) {
    return { label: `Mortalité ${Math.round(mortsPercent(bande))}%`, tone: 'red' };
  }
  if (jSinceMB !== null && jSinceMB >= SEVRAGE_PROCHE_JOURS) {
    return { label: `Sevrage J+${jSinceMB}`, tone: 'gold' };
  }
  return { label: 'Sous mère', tone: 'accent' };
}

/** Couleur de bordure gauche — gold si proche sevrage, red si mortalité, accent sinon. */
function rowBorderColor(
  bande: BandePorcelets | undefined,
  jSinceMB: number | null
): string {
  if (!bande) return 'border-l-border';
  if (mortsPercent(bande) > MORTALITE_SEUIL_PCT) return 'border-l-red';
  if (jSinceMB !== null && jSinceMB >= SEVRAGE_PROCHE_JOURS) return 'border-l-gold';
  return 'border-l-accent';
}

/** Tone de Chip pour le badge d'alerte loges (réutilisé de TroupeauHub). */
function chipToneForAlerte(alerte: LogeOccupationAlerte): ChipTone {
  if (alerte === 'FULL') return 'red';
  if (alerte === 'HIGH') return 'amber';
  return 'accent';
}

// ─── Composant principal ────────────────────────────────────────────────────

const MaterniteView: React.FC = () => {
  const navigate = useNavigate();
  const { truies, bandes, refreshData } = useFarm();

  const today = useMemo(() => new Date(), []);

  // Truies actuellement en maternité
  const truiesEnMat = useMemo<Truie[]>(
    () =>
      truies
        .filter(t => /maternit|allait|lactation/i.test(t.statut ?? ''))
        .sort((a, b) =>
          a.displayId.localeCompare(b.displayId, undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        ),
    [truies]
  );

  // Portées réelles (exclut RECAP) pour éviter les doublons d'agrégat
  const porteesReelles = useMemo(() => filterRealPortees(bandes), [bandes]);

  // Pour chaque truie : portée + J+X + pcts
  const rows = useMemo(() => {
    return truiesEnMat.map(truie => {
      const portee = getTruiePortee(truie, porteesReelles);
      const jSinceMB = daysSince(portee?.dateMB, today);
      return { truie, portee, jSinceMB };
    });
  }, [truiesEnMat, porteesReelles, today]);

  // Agrégations summary
  const summary = useMemo(() => {
    const occupation: LogeOccupation = logesMaterniteOccupation(truies);
    const totalVivants = rows.reduce(
      (acc, r) => acc + (r.portee?.vivants ?? 0),
      0
    );
    const totalMorts = rows.reduce((acc, r) => acc + (r.portee?.morts ?? 0), 0);
    const totalNV = rows.reduce((acc, r) => acc + (r.portee?.nv ?? 0), 0);
    const mortsGlobalPct = totalNV > 0 ? (totalMorts / totalNV) * 100 : 0;
    const procheSevrage = rows.some(
      r => r.jSinceMB !== null && r.jSinceMB >= SEVRAGE_PROCHE_JOURS
    );
    return {
      occupation,
      nbTruies: truiesEnMat.length,
      totalVivants,
      totalMorts,
      mortsGlobalPct,
      procheSevrage,
    };
  }, [truies, truiesEnMat, rows]);

  const handleRefresh = async (
    e: CustomEvent<{ complete: () => void }>
  ): Promise<void> => {
    await refreshData();
    e.detail.complete();
  };

  // Tons KPI
  const kpiTruiesTone: KpiTone = summary.procheSevrage ? 'warning' : 'default';
  const kpiLogesTone: KpiTone =
    summary.occupation.alerte === 'FULL'
      ? 'critical'
      : summary.occupation.alerte === 'HIGH'
        ? 'warning'
        : 'default';
  const kpiMortsTone: KpiTone =
    summary.mortsGlobalPct > MORTALITE_SEUIL_PCT ? 'critical' : 'default';

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <AgritechLayout>
          <AgritechHeader
            title="MATERNITÉ"
            subtitle="Suivi truies en maternité · loges & portées"
            backTo="/cycles"
          />

          <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
            {/* ── Summary strip : 4 KPI ───────────────────────────────── */}
            <div
              role="group"
              aria-label="Résumé maternité"
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              <KpiCard
                label="Truies en mat"
                value={summary.nbTruies}
                icon={<TruieIcon size={14} />}
                tone={kpiTruiesTone}
              />
              <KpiCard
                label="Loges capa"
                value={`${summary.occupation.occupees}/${summary.occupation.capacite}`}
                icon={<Baby size={14} />}
                tone={kpiLogesTone}
                deltaLabel={`${summary.occupation.tauxPct}% occ.`}
              />
              <KpiCard
                label="Porcelets s/m"
                value={summary.totalVivants}
                unit="vivants"
                tone="default"
              />
              <KpiCard
                label="Morts cumulés"
                value={summary.totalMorts}
                unit={
                  summary.mortsGlobalPct > 0
                    ? `${summary.mortsGlobalPct.toFixed(1)}%`
                    : undefined
                }
                tone={kpiMortsTone}
              />
            </div>

            {/* ── Loges occupation card (reprise pattern TroupeauHub) ──── */}
            <LogesMaterniteCard occupation={summary.occupation} />

            <SectionDivider label={`Truies en maternité · ${summary.nbTruies}`} />

            {/* ── Liste des truies en maternité ───────────────────────── */}
            {rows.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center gap-3 py-16 text-center"
                role="status"
              >
                <TruieIcon size={48} className="text-text-2" />
                <p className="text-[14px] font-medium text-text-1">
                  Aucune truie en maternité actuellement
                </p>
                <p className="font-mono text-[11px] text-text-2">
                  Les prochaines mises-bas apparaîtront ici
                </p>
              </div>
            ) : (
              <div
                role="list"
                aria-label="Liste des truies en maternité"
                className="rounded-md border border-border bg-bg-1 overflow-hidden"
              >
                {rows.map((r, idx) => {
                  const { truie, portee, jSinceMB } = r;
                  const boucle = truie.boucle ? `B.${truie.boucle}` : '—';
                  const namePart = truie.nom ? ` · ${truie.nom}` : '';
                  const primary = `${boucle} · ${truie.displayId}${namePart}`;

                  const nv = portee?.nv ?? 0;
                  const vivants = portee?.vivants ?? 0;
                  const morts = portee?.morts ?? 0;

                  const secondary = portee
                    ? `Portée ${portee.idPortee || portee.id} · NV ${nv} · Vivants ${vivants} · Morts ${morts}`
                    : 'Aucune portée sous-mère liée';

                  const meta =
                    jSinceMB !== null
                      ? `J+${jSinceMB}`
                      : portee
                        ? 'MB ?'
                        : '—';

                  const state = porteeStateChip(portee, jSinceMB);
                  const border = rowBorderColor(portee, jSinceMB);
                  const staggerIdx = Math.min(idx + 1, 5);

                  return (
                    <div
                      role="listitem"
                      key={truie.id}
                      className={`animate-fade-in-up stagger-${staggerIdx} border-l-2 ${border}`}
                    >
                      <DataRow
                        primary={primary}
                        secondary={secondary}
                        meta={meta}
                        accessory={
                          <Chip label={state.label} tone={state.tone} size="xs" />
                        }
                        onClick={() => navigate(`/troupeau/truies/${truie.id}`)}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Placeholder quick actions (sprint futur) ─────────────── */}
            <div
              className="card-dense flex flex-col gap-2"
              aria-label="Pesées porcelets (à venir)"
            >
              <div className="flex items-center gap-2">
                <Baby size={14} className="text-text-2" aria-hidden="true" />
                <span className="kpi-label">Pesées porcelets</span>
              </div>
              <p className="font-mono text-[11px] text-text-2 leading-snug">
                Les pesées J3 · J7 · J14 · J21 seront accessibles depuis cette vue
                dans une prochaine mise à jour.
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Chip label="J3" tone="default" size="xs" />
                <Chip label="J7" tone="default" size="xs" />
                <Chip label="J14" tone="default" size="xs" />
                <Chip label={`J${SEVRAGE_JOURS}`} tone="default" size="xs" />
              </div>
            </div>
          </div>
        </AgritechLayout>
        <AgritechNav />
      </IonContent>
    </IonPage>
  );
};

// ─── Sous-composants locaux ─────────────────────────────────────────────────

interface LogesMaterniteCardProps {
  occupation: LogeOccupation;
}

const LogesMaterniteCard: React.FC<LogesMaterniteCardProps> = ({ occupation }) => {
  const { occupees, capacite, tauxPct, alerte } = occupation;

  const barFill =
    alerte === 'FULL' ? 'bg-red' : alerte === 'HIGH' ? 'bg-amber' : 'bg-accent';
  const statusLabel =
    alerte === 'FULL' ? 'Saturé' : alerte === 'HIGH' ? 'Proche saturation' : 'OK';
  const statusTone = chipToneForAlerte(alerte);
  const barWidth = Math.min(tauxPct, 100);

  return (
    <div
      className="card-dense flex flex-col gap-2"
      role="group"
      aria-label={`Loges maternité : ${occupees} sur ${capacite}, ${tauxPct}%, ${statusLabel}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="kpi-label">Loges maternité</div>
          <div className="mt-0.5 font-mono text-[11px] text-text-2 leading-tight">
            Chauffage porcelet · 1 truie / loge · J0 → J{SEVRAGE_JOURS}
          </div>
        </div>
        <Chip label={statusLabel} tone={statusTone} size="xs" />
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-mono tabular-nums text-[24px] font-bold text-text-0 leading-none">
          {occupees}
        </span>
        <span className="font-mono text-[13px] text-text-2 leading-none">
          / {capacite} occupées
        </span>
        <span className="ml-auto font-mono tabular-nums text-[12px] text-text-2">
          {tauxPct}%
        </span>
      </div>

      <div
        className="h-1.5 w-full bg-bg-2 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={tauxPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Occupation loges maternité ${tauxPct}%`}
      >
        <div
          className={`h-full ${barFill} rounded-full transition-[width]`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
};

export default MaterniteView;
