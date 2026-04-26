import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { Activity, ChevronRight } from 'lucide-react';
import { PorceletIcon } from '../../components/icons';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import {
  KpiCard,
  DataRow,
  Chip,
  SectionDivider,
  type ChipTone,
} from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import {
  computeBandePhase,
  filterRealPortees,
  logesEngraissementOccupation,
  type LogeOccupation,
  type LogeOccupationAlerte,
} from '../../services/bandesAggregator';
import { FARM_CONFIG } from '../../config/farm';

/**
 * CroissanceView — écran /cycles/croissance.
 *
 * Liste les portées en phase CROISSANCE (J63 à J100 d'âge).
 * Affiche l'occupation des loges de croissance/finition (6 loges).
 * Cible : 37 jours dans cette phase.
 */
const CroissanceView: React.FC = () => {
  const navigate = useNavigate();
  const { bandes } = useFarm();

  const { portees, summary, occupation } = useMemo(() => {
    const realPortees = filterRealPortees(bandes);
    const today = new Date();
    const inPhase = realPortees.filter(
      (b) => computeBandePhase(b, today) === 'CROISSANCE'
    );

    const rows: CroissanceRow[] = inPhase.map((b) => {
      const sevrageRaw = b.dateSevrageReelle || b.dateSevragePrevue || '';
      const sevrageDate = parseDateFr(sevrageRaw);
      const joursDepuisSevrage =
        sevrageDate !== null ? daysBetween(sevrageDate, today) : null;

      const joursEnCroissance = joursDepuisSevrage !== null
        ? Math.max(0, joursDepuisSevrage - FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS)
        : null;

      return {
        id: b.id,
        idPortee: b.idPortee || b.id,
        boucleMere: b.boucleMere,
        vivants: b.vivants ?? 0,
        sevrageLabel: sevrageRaw ? formatDateShort(sevrageRaw) : null,
        joursEnCroissance,
      };
    });

    // Tri : plus avancées d'abord
    rows.sort((a, b) => {
      const ja = a.joursEnCroissance ?? -1;
      const jb = b.joursEnCroissance ?? -1;
      return jb - ja;
    });

    const totalVivants = rows.reduce((acc, r) => acc + r.vivants, 0);
    const rowsAvecJours = rows.filter((r) => r.joursEnCroissance !== null);
    const moyJours =
      rowsAvecJours.length > 0
        ? Math.round(
            rowsAvecJours.reduce(
              (acc, r) => acc + (r.joursEnCroissance as number),
              0
            ) / rowsAvecJours.length
          )
        : 0;

    return {
      portees: rows,
      summary: {
        nbPortees: rows.length,
        totalVivants,
        moyJours,
      },
      occupation: logesEngraissementOccupation(realPortees, today),
    };
  }, [bandes]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="CROISSANCE"
            subtitle="Développement musculaire · Séparation M/F effectuée"
            backTo="/cycles"
          />

          <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
            {/* Summary strip — 4 KPI */}
            <div
              role="group"
              aria-label="Résumé croissance"
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              <KpiCard
                label="Portées"
                value={summary.nbPortees}
                icon={<Activity size={14} aria-hidden="true" />}
                tone="warning"
              />
              <KpiCard
                label="Effectif"
                value={summary.totalVivants}
                tone="success"
              />
              <KpiCard
                label="J. moy. phase"
                value={summary.moyJours}
                unit="j"
              />
              <KpiCard
                label="Loges"
                value={`${occupation.occupees}/${occupation.capacite}`}
                tone={kpiToneForAlerte(occupation.alerte)}
              />
            </div>

            {/* Loges occupation */}
            <LogesOccupationCard occupation={occupation} />

            {/* Liste portées */}
            <SectionDivider
              label={`Portées en croissance${
                portees.length > 0 ? ` · ${portees.length}` : ''
              }`}
            />

            {portees.length === 0 ? (
              <EmptyState />
            ) : (
              <div
                role="list"
                aria-label="Portées en croissance"
                className="card-dense !p-0 overflow-hidden"
              >
                {portees.map((p) => (
                  <PorteeRow
                    key={p.id}
                    row={p}
                    onOpen={() =>
                      navigate(`/troupeau/bandes/${encodeURIComponent(p.id)}`)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

// ─── Sous-composants locaux ─────────────────────────────────────────────────

interface CroissanceRow {
  id: string;
  idPortee: string;
  boucleMere?: string;
  vivants: number;
  sevrageLabel: string | null;
  joursEnCroissance: number | null;
}

interface PorteeRowProps {
  row: CroissanceRow;
  onOpen: () => void;
}

const PorteeRow: React.FC<PorteeRowProps> = ({ row, onOpen }) => {
  const jours = row.joursEnCroissance;
  const cible = FARM_CONFIG.CROISSANCE_DUREE_JOURS;
  const pct = cible > 0 ? Math.min(100, Math.round(((jours ?? 0) / cible) * 100)) : 0;

  const chipTone: ChipTone = pct >= 100 ? 'amber' : 'amber';
  const chipLabel = jours !== null ? `J+${jours}` : 'Croiss.';

  const primaryParts = [row.idPortee];
  if (row.boucleMere) primaryParts.push(`(${row.boucleMere})`);
  const primary = primaryParts.join(' · ');

  const secondaryParts: string[] = [];
  secondaryParts.push(`${row.vivants} porcs`);
  if (row.sevrageLabel) secondaryParts.push(`Sevré ${row.sevrageLabel}`);
  const secondary = secondaryParts.join(' · ');

  const meta =
    jours !== null ? (
      <span aria-label={`Jour ${jours} sur ${cible} en croissance`}>{jours}/{cible}j</span>
    ) : (
      <span className="text-text-2">—</span>
    );

  return (
    <div role="listitem">
      <DataRow
        primary={primary}
        secondary={secondary}
        meta={meta}
        accessory={
          <div className="flex items-center gap-2">
            <Chip label={chipLabel} tone={chipTone} size="xs" />
            <ChevronRight
              size={14}
              className="text-text-2"
              aria-hidden="true"
            />
          </div>
        }
        onClick={onOpen}
      />
      {jours !== null && (
        <div className="px-4 pb-3 -mt-1.5">
          <div className="h-1 w-full bg-bg-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface LogesOccupationCardProps {
  occupation: LogeOccupation;
}

const LogesOccupationCard: React.FC<LogesOccupationCardProps> = ({
  occupation,
}) => {
  const { occupees, capacite, tauxPct, alerte } = occupation;
  const barFill =
    alerte === 'FULL' ? 'bg-red' : alerte === 'HIGH' ? 'bg-amber' : 'bg-amber';
  const statusLabel =
    alerte === 'FULL'
      ? 'Saturé'
      : alerte === 'HIGH'
        ? 'Proche saturation'
        : 'OK';
  const barWidth = Math.min(tauxPct, 100);

  return (
    <div
      className="card-dense flex flex-col gap-2 border-l-2 border-l-amber"
      role="group"
      aria-label={`Loges croissance : ${occupees} sur ${capacite}, ${tauxPct}%, ${statusLabel}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="kpi-label">Loges Croissance & Finition</div>
          <div className="mt-0.5 font-mono text-[11px] text-text-2 leading-tight">
            Capacité partagée · {FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY} loges totales
          </div>
        </div>
        <Chip
          label={statusLabel}
          tone={chipToneForAlerte(alerte)}
          size="xs"
        />
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
        aria-label={`Occupation loges croissance ${tauxPct}%`}
      >
        <div
          className={`h-full ${barFill} rounded-full transition-[width]`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div
    className="flex flex-col items-center justify-center py-16 px-8 text-center animate-fade-in-up"
    role="status"
  >
    <div className="w-20 h-20 rounded-2xl bg-bg-1 border border-border flex items-center justify-center mb-4 text-amber">
      <PorceletIcon size={48} aria-hidden="true" />
    </div>
    <h3 className="ft-heading text-text-0 text-[18px] mb-2 uppercase tracking-wide">
      Aucune portée en croissance
    </h3>
    <p className="text-text-2 text-[13px] max-w-xs leading-relaxed">
      La phase de croissance démarre à J63 (après le post-sevrage) et dure environ 37 jours.
    </p>
  </div>
);

// ─── Helpers (non exportés) ─────────────────────────────────────────────────

function kpiToneForAlerte(
  alerte: LogeOccupationAlerte
): 'default' | 'warning' | 'critical' | 'success' {
  if (alerte === 'FULL') return 'critical';
  if (alerte === 'HIGH') return 'warning';
  return 'success';
}

function chipToneForAlerte(alerte: LogeOccupationAlerte): ChipTone {
  if (alerte === 'FULL') return 'red';
  if (alerte === 'HIGH') return 'amber';
  return 'amber';
}

function parseDateFr(s: string): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

function daysBetween(from: Date, to: Date): number {
  const diffMs = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function formatDateShort(s: string): string {
  const d = parseDateFr(s);
  if (!d) return s;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

export default CroissanceView;
