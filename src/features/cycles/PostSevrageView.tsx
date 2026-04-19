import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { PackageCheck, ChevronRight } from 'lucide-react';
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
  logesPostSevrageOccupation,
  type LogeOccupation,
  type LogeOccupationAlerte,
} from '../../services/bandesAggregator';
import { FARM_CONFIG } from '../../config/farm';

/**
 * PostSevrageView — écran /cycles/post-sevrage.
 *
 * Liste les portées en phase POST_SEVRAGE (sevrées depuis <60 j). Chaque portée
 * affiche sa progression J+X/60 vers l'engraissement. L'occupation des 4 loges
 * post-sevrage est rappelée en haut avec une barre + taux.
 *
 * Design : dark agritech complet (AgritechLayout + AgritechHeader + card-dense).
 */
const PostSevrageView: React.FC = () => {
  const navigate = useNavigate();
  const { bandes } = useFarm();

  const { portees, summary, occupation } = useMemo(() => {
    const realPortees = filterRealPortees(bandes);
    const today = new Date();
    const inPhase = realPortees.filter(
      (b) => computeBandePhase(b, today) === 'POST_SEVRAGE'
    );

    const rows: PostSevrageRow[] = inPhase.map((b) => {
      const sevrageRaw = b.dateSevrageReelle || b.dateSevragePrevue || '';
      const sevrageDate = parseDateFr(sevrageRaw);
      const joursDepuisSevrage =
        sevrageDate !== null ? daysBetween(sevrageDate, today) : null;
      return {
        id: b.id,
        idPortee: b.idPortee || b.id,
        truie: b.truie,
        boucleMere: b.boucleMere,
        vivants: b.vivants ?? 0,
        sevrageLabel: sevrageRaw ? formatDateShort(sevrageRaw) : null,
        joursDepuisSevrage,
      };
    });

    // Tri : anciennement sevrées d'abord (proche engraissement)
    rows.sort((a, b) => {
      const ja = a.joursDepuisSevrage ?? -1;
      const jb = b.joursDepuisSevrage ?? -1;
      return jb - ja;
    });

    const totalVivants = rows.reduce((acc, r) => acc + r.vivants, 0);
    const rowsAvecJours = rows.filter((r) => r.joursDepuisSevrage !== null);
    const moyJours =
      rowsAvecJours.length > 0
        ? Math.round(
            rowsAvecJours.reduce(
              (acc, r) => acc + (r.joursDepuisSevrage as number),
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
      occupation: logesPostSevrageOccupation(realPortees, today),
    };
  }, [bandes]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="POST-SEVRAGE"
            subtitle="Porcelets sevrés jusqu'à 2 mois"
            backTo="/cycles"
          />

          <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
            {/* Summary strip — 4 KPI */}
            <div
              role="group"
              aria-label="Résumé post-sevrage"
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              <KpiCard
                label="Portées"
                value={summary.nbPortees}
                icon={<PackageCheck size={14} aria-hidden="true" />}
              />
              <KpiCard
                label="Porcelets vivants"
                value={summary.totalVivants}
                tone="success"
              />
              <KpiCard
                label="J. moy. sevrage"
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
              label={`Portées post-sevrage${
                portees.length > 0 ? ` · ${portees.length}` : ''
              }`}
            />

            {portees.length === 0 ? (
              <EmptyState />
            ) : (
              <div
                role="list"
                aria-label="Portées en post-sevrage"
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

interface PostSevrageRow {
  id: string;
  idPortee: string;
  truie?: string;
  boucleMere?: string;
  vivants: number;
  sevrageLabel: string | null;
  joursDepuisSevrage: number | null;
}

interface PorteeRowProps {
  row: PostSevrageRow;
  onOpen: () => void;
}

/**
 * Seuils colorimétriques Chip (phase post-sevrage, durée cible 60 j) :
 *  - `blue`  : J+<30 (lot récent, adaptation)
 *  - `amber` : J+30 à J+50 (mi-parcours)
 *  - `gold`  : J+50+ (proche bascule engraissement)
 *  - `default` : aucune date sevrage renseignée
 */
function chipForPostSevrage(jours: number | null): {
  tone: ChipTone;
  label: string;
} {
  if (jours === null) return { tone: 'default', label: 'Récent' };
  if (jours < 30) return { tone: 'blue', label: `J+${jours}` };
  if (jours < 50) return { tone: 'amber', label: `J+${jours}` };
  return { tone: 'gold', label: `J+${jours}` };
}

const PorteeRow: React.FC<PorteeRowProps> = ({ row, onOpen }) => {
  const chip = chipForPostSevrage(row.joursDepuisSevrage);
  const cap = FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS;
  const jours = row.joursDepuisSevrage;

  const primaryParts = [row.idPortee];
  if (row.truie) primaryParts.push(row.truie);
  if (row.boucleMere) primaryParts.push(`(${row.boucleMere})`);
  const primary = primaryParts.join(' · ');

  const secondaryParts: string[] = [];
  secondaryParts.push(`Vivants ${row.vivants}`);
  if (row.sevrageLabel) secondaryParts.push(`Sevrage ${row.sevrageLabel}`);
  if (jours !== null) secondaryParts.push(`J+${jours}`);
  const secondary = secondaryParts.join(' · ');

  const meta =
    jours !== null ? (
      <span aria-label={`Progression ${jours} jours sur ${cap}`}>
        J+{jours}/{cap}
      </span>
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
            <Chip label={chip.label} tone={chip.tone} size="xs" />
            <ChevronRight
              size={14}
              className="text-text-2"
              aria-hidden="true"
            />
          </div>
        }
        onClick={onOpen}
      />
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
    alerte === 'FULL' ? 'bg-red' : alerte === 'HIGH' ? 'bg-amber' : 'bg-accent';
  const statusLabel =
    alerte === 'FULL'
      ? 'Saturé'
      : alerte === 'HIGH'
        ? 'Proche saturation'
        : 'OK';
  const barWidth = Math.min(tauxPct, 100);

  return (
    <div
      className="card-dense flex flex-col gap-2"
      role="group"
      aria-label={`Loges post-sevrage : ${occupees} sur ${capacite}, ${tauxPct}%, ${statusLabel}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="kpi-label">Loges post-sevrage</div>
          <div className="mt-0.5 font-mono text-[11px] text-text-2 leading-tight">
            Porcelets groupés · J21→~J81
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
        aria-label={`Occupation loges post-sevrage ${tauxPct}%`}
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
    <div className="w-20 h-20 rounded-2xl bg-bg-1 border border-border flex items-center justify-center mb-4 text-text-2">
      <PorceletIcon size={48} aria-hidden="true" />
    </div>
    <h3 className="ft-heading text-text-0 text-[18px] mb-2 uppercase tracking-wide">
      Aucune portée post-sevrage
    </h3>
    <p className="text-text-2 text-[13px] max-w-xs leading-relaxed">
      Les portées arriveront après sevrage (J+21). Elles resteront ici jusqu'à J+81.
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
  return 'accent';
}

/**
 * Parse une date FR (`dd/MM/yyyy`) ou ISO (`YYYY-MM-DD`). Renvoie `null`
 * si le format n'est pas reconnu.
 */
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

/** Restitue une date au format court FR `dd/MM/yy` (robuste ISO + FR). */
function formatDateShort(s: string): string {
  const d = parseDateFr(s);
  if (!d) return s;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

export default PostSevrageView;
