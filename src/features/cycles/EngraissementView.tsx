import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { Scale, TrendingUp, ChevronRight } from 'lucide-react';
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

/**
 * EngraissementView — écran /cycles/engraissement.
 *
 * Liste les portées en phase ENGRAISSEMENT (sevrées depuis ≥60 j, séparées par
 * sexe, jusqu'à finition). Affiche occupation des 2 loges d'engraissement et
 * J+X depuis sevrage (pas de cap fixe côté biologique : la finition dépend du
 * poids commercial et non d'une durée stricte).
 */
const EngraissementView: React.FC = () => {
  const navigate = useNavigate();
  const { bandes } = useFarm();

  const { portees, summary, occupation } = useMemo(() => {
    const realPortees = filterRealPortees(bandes);
    const today = new Date();
    const inPhase = realPortees.filter(
      (b) => computeBandePhase(b, today) === 'ENGRAISSEMENT'
    );

    const rows: EngraissementRow[] = inPhase.map((b) => {
      const sevrageRaw = b.dateSevrageReelle || b.dateSevragePrevue || '';
      const sevrageDate = parseDateFr(sevrageRaw);
      const joursDepuisSevrage =
        sevrageDate !== null ? daysBetween(sevrageDate, today) : null;
      return {
        id: b.id,
        idPortee: b.idPortee || b.id,
        boucleMere: b.boucleMere,
        vivants: b.vivants ?? 0,
        sevrageLabel: sevrageRaw ? formatDateShort(sevrageRaw) : null,
        joursDepuisSevrage,
      };
    });

    // Tri : plus avancées d'abord (proche finition)
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
      occupation: logesEngraissementOccupation(realPortees, today),
    };
  }, [bandes]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="ENGRAISSEMENT"
            subtitle="Porcelets séparés par sexe · jusqu'à finition"
            backTo="/cycles"
          />

          <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
            {/* Summary strip — 4 KPI */}
            <div
              role="group"
              aria-label="Résumé engraissement"
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              <KpiCard
                label="Portées"
                value={summary.nbPortees}
                icon={<TrendingUp size={14} aria-hidden="true" />}
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
              label={`Portées en engraissement${
                portees.length > 0 ? ` · ${portees.length}` : ''
              }`}
            />

            {portees.length === 0 ? (
              <EmptyState />
            ) : (
              <div
                role="list"
                aria-label="Portées en engraissement"
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

interface EngraissementRow {
  id: string;
  idPortee: string;
  boucleMere?: string;
  vivants: number;
  sevrageLabel: string | null;
  joursDepuisSevrage: number | null;
}

interface PorteeRowProps {
  row: EngraissementRow;
  onOpen: () => void;
}

const PorteeRow: React.FC<PorteeRowProps> = ({ row, onOpen }) => {
  const jours = row.joursDepuisSevrage;
  // Phase engraissement = ton spécifique `gold` (métrique premium, finition).
  // Seul distinguo : si J+>=120 post-sevrage, on bascule en `amber` (séjour
  // anormalement long, finition à vérifier).
  const chipTone: ChipTone =
    jours !== null && jours >= 120 ? 'amber' : 'gold';
  const chipLabel = jours !== null ? `J+${jours}` : 'Engrais.';

  const primaryParts = [row.idPortee];
  if (row.boucleMere) primaryParts.push(`(${row.boucleMere})`);
  const primary = primaryParts.join(' · ');

  const secondaryParts: string[] = [];
  secondaryParts.push(`Vivants ${row.vivants}`);
  if (row.sevrageLabel) secondaryParts.push(`Sevrage ${row.sevrageLabel}`);
  if (jours !== null) secondaryParts.push(`J+${jours} post-sevrage`);
  const secondary = secondaryParts.join(' · ');

  // Pas de cap fixe côté biologique : la finition dépend du poids commercial.
  // On affiche simplement "J+X / —" pour signifier l'absence de durée cible.
  const meta =
    jours !== null ? (
      <span aria-label={`Jour ${jours} depuis sevrage`}>J+{jours}/—</span>
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
      aria-label={`Loges engraissement : ${occupees} sur ${capacite}, ${tauxPct}%, ${statusLabel}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="kpi-label">Loges engraissement</div>
          <div className="mt-0.5 font-mono text-[11px] text-text-2 leading-tight">
            Séparation par sexe · finition
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
        aria-label={`Occupation loges engraissement ${tauxPct}%`}
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
    className="card-dense flex flex-col items-center justify-center gap-3 py-10 text-center"
    role="status"
  >
    <Scale size={36} className="text-text-2" aria-hidden="true" />
    <p className="font-mono text-[12px] uppercase tracking-wide text-text-2">
      Aucune portée en engraissement
    </p>
    <p className="font-mono text-[11px] text-text-2 max-w-xs leading-relaxed">
      Les portées apparaîtront ici quand elles auront dépassé 60 j après
      sevrage (séparation par sexe · finition).
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

export default EngraissementView;
