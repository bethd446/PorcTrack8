import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { Trophy, ChevronRight, Coins } from 'lucide-react';
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
} from '../../services/bandesAggregator';
import type { BandePorcelets } from '../../types/farm';

/**
 * FinitionView — écran /cycles/finition.
 *
 * Affiche les bandes proches du poids d'abattage (≥80 kg estimé). La finition
 * est une sous-catégorie de l'engraissement basée sur le poids (et non la
 * durée stricte post-sevrage). La ferme K13 pratique un abattage vers 90 kg
 * vif (race Large White × Duroc tropical Côte d'Ivoire).
 *
 * Heuristique poids : 25 kg au sevrage + 650 g/j (GMQ moyen post-sevrage),
 * cap à 110 kg. Pour un porcelet sevré depuis ~100 j, le poids estimé est
 * de ~90 kg — seuil commercial d'abattage.
 *
 * Affichage :
 *  - Summary : nb bandes · poids moyen · jours avant abattage moyen
 *  - Liste bandes triées par poids décroissant (proches abattage en tête)
 *  - Projection ventes : total porcelets × poids moyen × 2 100 FCFA/kg
 */

// ─── Constantes métier ──────────────────────────────────────────────────────
const FINITION_SEUIL_KG = 80;
const POIDS_ABATTAGE_CIBLE_KG = 90;
const POIDS_SEVRAGE_KG = 25;
const GMQ_POST_SEVRAGE_KG = 0.65;
const PRIX_KG_VIF_FCFA = 2100;
const POIDS_MAX_KG = 110;

const FinitionView: React.FC = () => {
  const navigate = useNavigate();
  const { bandes } = useFarm();

  const { portees, summary, projection } = useMemo(() => {
    const today = new Date();
    const realPortees = filterRealPortees(bandes);

    const inFinition = realPortees.filter((b) => isFinition(b, today));

    const rows: FinitionRow[] = inFinition.map((b) => {
      const sevrageRaw = b.dateSevrageReelle || b.dateSevragePrevue || '';
      const sevrageDate = parseDate(sevrageRaw);
      const joursDepuisSevrage =
        sevrageDate !== null ? daysBetween(sevrageDate, today) : null;
      const poidsKg = estimateWeightKg(b, today);
      const joursAvantAbattage = computeJoursAvantAbattage(poidsKg);
      return {
        id: b.id,
        idPortee: b.idPortee || b.id,
        boucleMere: b.boucleMere,
        dateMB: b.dateMB ? formatDateShort(b.dateMB) : null,
        vivants: b.vivants ?? 0,
        joursDepuisSevrage,
        poidsKg,
        joursAvantAbattage,
        sortieProche: joursAvantAbattage <= 0,
      };
    });

    // Tri : poids décroissant (plus proches abattage en tête)
    rows.sort((a, b) => b.poidsKg - a.poidsKg);

    const nbBandes = rows.length;
    const totalVivants = rows.reduce((acc, r) => acc + r.vivants, 0);
    const poidsMoyen =
      nbBandes > 0
        ? Math.round(rows.reduce((acc, r) => acc + r.poidsKg, 0) / nbBandes)
        : 0;
    const joursAbattageMoyen =
      nbBandes > 0
        ? Math.round(
            rows.reduce((acc, r) => acc + Math.max(0, r.joursAvantAbattage), 0) /
              nbBandes
          )
        : 0;

    // Projection ventes : total vivants × poids moyen × prix kg vif
    const revenuEstime = totalVivants * poidsMoyen * PRIX_KG_VIF_FCFA;

    return {
      portees: rows,
      summary: {
        nbBandes,
        poidsMoyen,
        joursAbattageMoyen,
      },
      projection: {
        totalVivants,
        poidsMoyen,
        revenuEstime,
      },
    };
  }, [bandes]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="FINITION"
            subtitle="Bandes proches du poids abattage"
            backTo="/cycles"
          />

          <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
            {/* Summary — 3 KPI */}
            <div
              role="group"
              aria-label="Résumé finition"
              className="grid grid-cols-3 gap-3"
            >
              <KpiCard
                label="Bandes"
                value={summary.nbBandes}
                tone={summary.nbBandes > 0 ? 'warning' : 'default'}
              />
              <KpiCard
                label="Poids moy."
                value={summary.poidsMoyen}
                unit="kg"
              />
              <KpiCard
                label="Jours avant abattage"
                value={summary.joursAbattageMoyen}
                unit="j"
              />
            </div>

            <SectionDivider
              label={`Bandes en finition${portees.length > 0 ? ` · ${portees.length}` : ''}`}
            />

            {portees.length === 0 ? (
              <EmptyState />
            ) : (
              <div
                role="list"
                aria-label="Bandes en finition"
                className="card-dense !p-0 overflow-hidden"
              >
                {portees.map((p) => (
                  <PorteeFinitionRow
                    key={p.id}
                    row={p}
                    onOpen={() =>
                      navigate(`/troupeau/bandes/${encodeURIComponent(p.id)}`)
                    }
                  />
                ))}
              </div>
            )}

            {/* Projection ventes */}
            {portees.length > 0 ? (
              <>
                <SectionDivider label="Projections ventes" />
                <ProjectionCard projection={projection} />
              </>
            ) : null}
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

// ─── Sous-composants ────────────────────────────────────────────────────────

interface FinitionRow {
  id: string;
  idPortee: string;
  boucleMere?: string;
  dateMB: string | null;
  vivants: number;
  joursDepuisSevrage: number | null;
  poidsKg: number;
  joursAvantAbattage: number;
  sortieProche: boolean;
}

interface ProjectionData {
  totalVivants: number;
  poidsMoyen: number;
  revenuEstime: number;
}

interface PorteeFinitionRowProps {
  row: FinitionRow;
  onOpen: () => void;
}

const PorteeFinitionRow: React.FC<PorteeFinitionRowProps> = ({ row, onOpen }) => {
  const chipTone: ChipTone = row.sortieProche ? 'amber' : 'gold';
  const chipLabel = row.sortieProche
    ? 'À sortir'
    : `J-${row.joursAvantAbattage}`;

  const primaryParts = [row.idPortee];
  if (row.boucleMere) primaryParts.push(`(${row.boucleMere})`);
  const primary = primaryParts.join(' · ');

  const secondaryParts: string[] = [];
  if (row.joursDepuisSevrage !== null) {
    secondaryParts.push(`J+${row.joursDepuisSevrage} post-sevrage`);
  }
  secondaryParts.push(`~${Math.round(row.poidsKg)} kg estimé`);
  secondaryParts.push(`${row.vivants} vivants`);
  if (row.dateMB) secondaryParts.push(`MB ${row.dateMB}`);
  const secondary = secondaryParts.join(' · ');

  const meta = (
    <span aria-label={`Poids estimé ${Math.round(row.poidsKg)} kilogrammes`}>
      {Math.round(row.poidsKg)} kg
    </span>
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

interface ProjectionCardProps {
  projection: ProjectionData;
}

const ProjectionCard: React.FC<ProjectionCardProps> = ({ projection }) => {
  const { totalVivants, poidsMoyen, revenuEstime } = projection;
  const revenuFormatted = formatFCFA(revenuEstime);

  return (
    <div
      className="card-dense flex flex-col gap-3"
      role="group"
      aria-label={`Projection ventes : ${totalVivants} porcelets, poids moyen ${poidsMoyen} kilogrammes, revenu estimé ${revenuFormatted}`}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-bg-2 text-amber"
          aria-hidden="true"
        >
          <Coins size={16} />
        </span>
        <div>
          <div className="kpi-label">Revenu brut estimé</div>
          <div className="font-mono text-[11px] text-text-2 leading-tight">
            À 2 100 FCFA / kg vif
          </div>
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="font-mono tabular-nums text-[24px] font-bold text-accent leading-none">
          {revenuFormatted}
        </span>
        <span className="font-mono text-[11px] text-text-2 leading-none">
          FCFA
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
        <div>
          <div className="kpi-label">Porcelets</div>
          <div className="mt-1 font-mono tabular-nums text-[16px] font-semibold text-text-0">
            {totalVivants}
          </div>
        </div>
        <div>
          <div className="kpi-label">Poids moy.</div>
          <div className="mt-1 font-mono tabular-nums text-[16px] font-semibold text-text-0">
            {poidsMoyen} kg
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div
    className="card-dense flex flex-col items-center justify-center gap-3 py-10 text-center"
    role="status"
  >
    <Trophy size={36} className="text-text-2" aria-hidden="true" />
    <p className="font-mono text-[12px] uppercase tracking-wide text-text-2">
      Aucune bande en finition
    </p>
    <p className="font-mono text-[11px] text-text-2 max-w-xs leading-relaxed">
      Les bandes apparaîtront ici quand leur poids estimé dépassera{' '}
      {FINITION_SEUIL_KG} kg (~{Math.round((FINITION_SEUIL_KG - POIDS_SEVRAGE_KG) / GMQ_POST_SEVRAGE_KG)} j post-sevrage).
    </p>
  </div>
);

// ─── Helpers métier (non exportés) ──────────────────────────────────────────

/**
 * Parse date dd/MM/yyyy ou ISO.
 */
function parseDate(s?: string): Date | null {
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

/**
 * Estimation poids vif (kg) d'une bande depuis la date de sevrage.
 * 25 kg au sevrage + GMQ 0.65 kg/j, cap 110 kg.
 */
function estimateWeightKg(bande: BandePorcelets, today: Date): number {
  const sevrage = parseDate(bande.dateSevrageReelle || bande.dateSevragePrevue);
  if (!sevrage) return 0;
  const j = daysBetween(sevrage, today);
  return Math.min(POIDS_SEVRAGE_KG + j * GMQ_POST_SEVRAGE_KG, POIDS_MAX_KG);
}

/**
 * Une bande est en finition si elle est sevrée ET poids estimé ≥ 80 kg.
 * Volontairement tolérant sur la phase (couvre POST_SEVRAGE + ENGRAISSEMENT).
 */
function isFinition(bande: BandePorcelets, today: Date): boolean {
  if (!/sevr/i.test(bande.statut ?? '')) return false;
  // Exclut explicitement les bandes INCONNU / sans phase définie
  const phase = computeBandePhase(bande, today);
  if (phase !== 'POST_SEVRAGE' && phase !== 'ENGRAISSEMENT') return false;
  return estimateWeightKg(bande, today) >= FINITION_SEUIL_KG;
}

/**
 * Jours restants avant atteinte du poids commercial d'abattage (90 kg).
 * Retourne 0 si déjà atteint.
 */
function computeJoursAvantAbattage(poidsKg: number): number {
  if (poidsKg >= POIDS_ABATTAGE_CIBLE_KG) return 0;
  const deltaKg = POIDS_ABATTAGE_CIBLE_KG - poidsKg;
  return Math.max(0, Math.ceil(deltaKg / GMQ_POST_SEVRAGE_KG));
}

function formatDateShort(s: string): string {
  const d = parseDate(s);
  if (!d) return s;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

/**
 * Formatage FCFA avec espace comme séparateur de milliers.
 * Ex : 1250000 → "1 250 000"
 */
function formatFCFA(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '0';
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export default FinitionView;
