import React, { useMemo } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { Home } from 'lucide-react';
import { TruieIcon, VerratIcon, BandeIcon } from '../../components/icons';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { HubTile, Chip, SectionDivider } from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import {
  filterRealPortees,
  countSousMere,
  countBandesByPhase,
  logesMaterniteOccupation,
  logesPostSevrageOccupation,
  logesEngraissementOccupation,
  type LogeOccupation,
  type LogeOccupationAlerte,
} from '../../services/bandesAggregator';

/**
 * TroupeauHub — entrée sous-hubs : Truies · Verrats · Portées · Loges.
 *
 * Note data model :
 *  - "Portée" = lot issu d'une mise-bas (1 truie = 1 portée).
 *  - "Loge"   = unité physique post-sevrage regroupant plusieurs portées.
 *    La ferme A130 a 4 loges ; voir `bandesAggregator.countLoges`.
 */
const TroupeauHub: React.FC = () => {
  const { truies, verrats, bandes } = useFarm();

  const stats = useMemo(() => {
    const isPleine = (s: string): boolean => /pleine/i.test(s);
    const isMater = (s: string): boolean => /mater|allait|lactation/i.test(s);
    const isAttente = (s: string): boolean => /attente|saillie|vide/i.test(s);
    const isSurv = (s: string): boolean => /surveill|réform|reforme/i.test(s);

    const truiesPleines = truies.filter(t => isPleine(t.statut)).length;
    const truiesMater = truies.filter(t => isMater(t.statut)).length;
    const truiesAttente = truies.filter(t => isAttente(t.statut)).length;
    const truiesSurv = truies.filter(t => isSurv(t.statut)).length;

    const verratsActifs = verrats.filter(v => /actif/i.test(v.statut)).length;

    // Portées réelles (exclut RECAP) — source de vérité pour le comptage.
    const portees = filterRealPortees(bandes);
    const sousMere = countSousMere(portees);
    const phases = countBandesByPhase(portees);
    const materniteOcc = logesMaterniteOccupation(truies);
    const postSevrageOcc = logesPostSevrageOccupation(portees);
    const engraissementOcc = logesEngraissementOccupation(portees);

    return {
      truiesPleines,
      truiesMater,
      truiesAttente,
      truiesSurv,
      verratsActifs,
      porteesTotal: portees.length,
      sousMerePortees: sousMere.portees,
      postSevragePortees: phases.POST_SEVRAGE,
      engraissementPortees: phases.ENGRAISSEMENT,
      sevresPortees: phases.POST_SEVRAGE + phases.ENGRAISSEMENT,
      materniteOcc,
      postSevrageOcc,
      engraissementOcc,
    };
  }, [truies, verrats, bandes]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader title="TROUPEAU" subtitle="A130 · Reproducteurs & descendance" />

          <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
            {/* Global stats strip */}
            <div
              role="group"
              aria-label="Résumé troupeau"
              className="card-dense flex items-center justify-between gap-3"
            >
              <div className="flex flex-col items-start gap-0.5 min-w-0">
                <span className="kpi-label">Truies</span>
                <span className="font-mono tabular-nums text-[20px] font-bold text-text-0">
                  {truies.length}
                </span>
              </div>
              <div className="h-8 w-px bg-border shrink-0" aria-hidden="true" />
              <div className="flex flex-col items-start gap-0.5 min-w-0">
                <span className="kpi-label">Verrats</span>
                <span className="font-mono tabular-nums text-[20px] font-bold text-text-0">
                  {verrats.length}
                </span>
              </div>
              <div className="h-8 w-px bg-border shrink-0" aria-hidden="true" />
              <div className="flex flex-col items-start gap-0.5 min-w-0">
                <span className="kpi-label">Portées</span>
                <span className="font-mono tabular-nums text-[20px] font-bold text-text-0">
                  {stats.porteesTotal}
                </span>
              </div>
              <div className="h-8 w-px bg-border shrink-0" aria-hidden="true" />
              <div className="flex flex-col items-start gap-0.5 min-w-0">
                <span className="kpi-label">Loges</span>
                <span className="font-mono tabular-nums text-[13px] font-bold text-text-0 leading-tight">
                  Mat {stats.materniteOcc.occupees}
                  <span className="text-text-2" aria-hidden="true"> · </span>
                  P-Sevr {stats.postSevrageOcc.occupees}
                  <span className="text-text-2" aria-hidden="true"> · </span>
                  Engr {stats.engraissementOcc.occupees}
                </span>
              </div>
            </div>

            <SectionDivider label="Occupation loges" />

            {/* Loges occupation — maternité + post-sevrage + engraissement */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <LogeOccupationCard
                label="Loges maternité"
                hint="Chauffage porcelet · 1 truie/loge"
                occupation={stats.materniteOcc}
              />
              <LogeOccupationCard
                label="Loges post-sevrage"
                hint="Porcelets groupés · J21→~J81"
                occupation={stats.postSevrageOcc}
              />
              <LogeOccupationCard
                label="Loges engraissement"
                hint="Séparation par sexe · finition"
                occupation={stats.engraissementOcc}
              />
            </div>

            <SectionDivider label="Sous-sections" />

            {/* Truies tile + chips */}
            <div className="flex flex-col gap-2">
              <HubTile
                icon={<TruieIcon size={22} />}
                title="Truies"
                subtitle={`${stats.truiesPleines} pleines · ${stats.truiesMater} mater · ${stats.truiesAttente} attente`}
                count={truies.length}
                to="/troupeau/truies"
                tone="accent"
              />
              <div className="flex flex-wrap gap-1.5 px-1" aria-hidden="true">
                {stats.truiesPleines > 0 && (
                  <Chip label={`${stats.truiesPleines} pleines`} tone="accent" size="xs" />
                )}
                {stats.truiesMater > 0 && (
                  <Chip label={`${stats.truiesMater} maternité`} tone="gold" size="xs" />
                )}
                {stats.truiesAttente > 0 && (
                  <Chip label={`${stats.truiesAttente} attente`} tone="default" size="xs" />
                )}
                {stats.truiesSurv > 0 && (
                  <Chip label={`${stats.truiesSurv} à surveiller`} tone="amber" size="xs" />
                )}
              </div>
            </div>

            {/* Verrats tile + chip */}
            <div className="flex flex-col gap-2">
              <HubTile
                icon={<VerratIcon size={22} />}
                title="Verrats"
                subtitle={`${stats.verratsActifs} actif${stats.verratsActifs > 1 ? 's' : ''}`}
                count={verrats.length}
                to="/troupeau/verrats"
              />
              <div className="flex flex-wrap gap-1.5 px-1" aria-hidden="true">
                {stats.verratsActifs > 0 && (
                  <Chip label={`${stats.verratsActifs} actifs`} tone="accent" size="xs" />
                )}
              </div>
            </div>

            {/* Portées tile + chips (ex-"Bandes") */}
            <div className="flex flex-col gap-2">
              <HubTile
                icon={<BandeIcon size={22} />}
                title="Portées"
                subtitle={`${stats.sousMerePortees} sous mère · ${stats.postSevragePortees} post-sevrage · ${stats.engraissementPortees} engraissement`}
                count={stats.porteesTotal}
                to="/troupeau/bandes"
                tone="amber"
              />
              <div className="flex flex-wrap gap-1.5 px-1" aria-hidden="true">
                {stats.sousMerePortees > 0 && (
                  <Chip label={`${stats.sousMerePortees} sous mère`} tone="amber" size="xs" />
                )}
                {stats.postSevragePortees > 0 && (
                  <Chip label={`${stats.postSevragePortees} post-sevrage`} tone="blue" size="xs" />
                )}
                {stats.engraissementPortees > 0 && (
                  <Chip label={`${stats.engraissementPortees} engraissement`} tone="accent" size="xs" />
                )}
              </div>
            </div>

            {/* Loges tile — 3 phases physiques : maternité · post-sevrage · engraissement */}
            <div className="flex flex-col gap-2">
              <HubTile
                icon={<Home size={22} />}
                title="Loges"
                subtitle={`Mat ${stats.materniteOcc.occupees}/${stats.materniteOcc.capacite} · P-Sevr ${stats.postSevrageOcc.occupees}/${stats.postSevrageOcc.capacite} · Engr ${stats.engraissementOcc.occupees}/${stats.engraissementOcc.capacite}`}
                count={
                  stats.materniteOcc.occupees +
                  stats.postSevrageOcc.occupees +
                  stats.engraissementOcc.occupees
                }
                to="/troupeau/bandes"
                tone="accent"
              />
              <div className="flex flex-wrap gap-1.5 px-1" aria-hidden="true">
                <Chip
                  label={`Maternité ${stats.materniteOcc.tauxPct}%`}
                  tone={chipToneForAlerte(stats.materniteOcc.alerte)}
                  size="xs"
                />
                <Chip
                  label={`Post-sevrage ${stats.postSevrageOcc.tauxPct}%`}
                  tone={chipToneForAlerte(stats.postSevrageOcc.alerte)}
                  size="xs"
                />
                <Chip
                  label={`Engraissement ${stats.engraissementOcc.tauxPct}%`}
                  tone={chipToneForAlerte(stats.engraissementOcc.alerte)}
                  size="xs"
                />
              </div>
            </div>
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

// ─── Sous-composants locaux ─────────────────────────────────────────────────

function chipToneForAlerte(
  alerte: LogeOccupationAlerte
): 'accent' | 'amber' | 'red' {
  if (alerte === 'FULL') return 'red';
  if (alerte === 'HIGH') return 'amber';
  return 'accent';
}

interface LogeOccupationCardProps {
  label: string;
  hint: string;
  occupation: LogeOccupation;
}

const LogeOccupationCard: React.FC<LogeOccupationCardProps> = ({
  label,
  hint,
  occupation,
}) => {
  const { occupees, capacite, tauxPct, alerte } = occupation;

  const barFill =
    alerte === 'FULL' ? 'bg-red' : alerte === 'HIGH' ? 'bg-amber' : 'bg-accent';

  const statusLabel =
    alerte === 'FULL' ? 'Saturé' : alerte === 'HIGH' ? 'Proche saturation' : 'OK';
  const statusTone: 'accent' | 'amber' | 'red' =
    alerte === 'FULL' ? 'red' : alerte === 'HIGH' ? 'amber' : 'accent';

  // Width capé à 100 % pour l'affichage de la barre, mais on laisse tauxPct brut
  // dans le texte pour signaler toute anomalie (>100%).
  const barWidth = Math.min(tauxPct, 100);

  return (
    <div
      className="card-dense flex flex-col gap-2"
      role="group"
      aria-label={`${label} : ${occupees} sur ${capacite}, ${tauxPct}%, ${statusLabel}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="kpi-label">{label}</div>
          <div className="mt-0.5 font-mono text-[11px] text-text-2 leading-tight">
            {hint}
          </div>
        </div>
        <Chip label={statusLabel} tone={statusTone} size="xs" />
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-mono tabular-nums text-[24px] font-bold text-text-0 leading-none">
          {occupees}
        </span>
        <span className="font-mono text-[13px] text-text-2 leading-none">
          / {capacite}
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
        aria-label={`Occupation ${label} ${tauxPct}%`}
      >
        <div
          className={`h-full ${barFill} rounded-full transition-[width]`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
};

export default TroupeauHub;
