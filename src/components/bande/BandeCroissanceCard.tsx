import React, { useMemo, useState } from 'react';
import { Scale, HelpCircle, TrendingUp, Target, Weight } from 'lucide-react';
import { KpiCard, Chip, SectionDivider, DataRow } from '../agritech';
import type { ChipTone } from '../agritech';
import {
  computeBandeGrowthStats,
  type GrowthAlerte,
  type PeseeRecord,
} from '../../services/growthAnalyzer';
import type { Note } from '../../types';
import type { BandePorcelets } from '../../types/farm';

/* ═════════════════════════════════════════════════════════════════════════
   BandeCroissanceCard · Card autonome suivi de croissance d'une bande
   ─────────────────────────────────────────────────────────────────────────
   Affiche : historique pesées, GMQ actuel, cible phase, alertes,
   projection finition (ENGRAISSEMENT).
   Pure component — tout le calcul est mémoïsé via computeBandeGrowthStats.
   ═════════════════════════════════════════════════════════════════════════ */

export interface BandeCroissanceCardProps {
  bande: BandePorcelets;
  notes: readonly Note[];
}

// ─── Helpers affichage ──────────────────────────────────────────────────────

const ALERTE_CHIP: Record<GrowthAlerte, { tone: ChipTone; label: string }> = {
  OK: { tone: 'accent', label: 'Croissance conforme' },
  SOUS_CIBLE: { tone: 'amber', label: 'GMQ sous cible' },
  NOUS_PEU_DE_DATA: { tone: 'default', label: 'Peu de données' },
};

/**
 * Formatte une date ISO YYYY-MM-DD en format court JJ/MM.
 * Retourne la chaîne brute si parsing échoue.
 */
function fmtDateCourt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

/**
 * Ajoute une date en jours à une date de départ ISO et retourne ISO YYYY-MM-DD.
 */
function addDays(fromIso: string, days: number): string {
  const d = new Date(fromIso);
  if (Number.isNaN(d.getTime())) return fromIso;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Jours entre deux dates ISO (positif si toIso après fromIso). */
function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

// ─── Sous-composant — ligne historique ──────────────────────────────────────

interface PeseeRowProps {
  pesee: PeseeRecord;
  /** Pesée précédente (pour calcul delta GMQ affiché). */
  prev?: PeseeRecord;
}

const PeseeRow: React.FC<PeseeRowProps> = ({ pesee, prev }) => {
  const primary = [
    fmtDateCourt(pesee.date),
    `${pesee.poidsMoyen} kg moy`,
    `${pesee.nbPeses} porc`,
  ].join(' · ');

  let secondary = '';
  if (pesee.ecartType !== undefined) secondary += `±${pesee.ecartType}kg`;
  if (prev) {
    const jours = daysBetween(prev.date, pesee.date);
    if (jours > 0) {
      const gmq = Math.round(((pesee.poidsMoyen - prev.poidsMoyen) * 1000) / jours);
      const sign = gmq > 0 ? '+' : '';
      secondary += (secondary ? ' · ' : '') + `GMQ ${sign}${gmq}g/j`;
    }
  } else {
    secondary += (secondary ? ' · ' : '') + 'Pesée initiale';
  }
  if (pesee.observation) {
    secondary += (secondary ? ' · ' : '') + pesee.observation;
  }

  return <DataRow primary={primary} secondary={secondary || undefined} />;
};

// ─── Composant principal ────────────────────────────────────────────────────

const BandeCroissanceCard: React.FC<BandeCroissanceCardProps> = ({ bande, notes }) => {
  const [showHelp, setShowHelp] = useState(false);

  const stats = useMemo(
    () => computeBandeGrowthStats(bande, notes),
    [bande, notes],
  );

  const { pesees, dernierPoids, gmqMoyenGlobal, phaseCourante, gmqCibleActuel,
    alerte, poidsProjeteFin, joursDepuisDerniere } = stats;

  const chipMeta = ALERTE_CHIP[alerte];

  // Projection — estimation date finition (depuis dernière pesée + GMQ moyen)
  const projectionInfo = useMemo(() => {
    if (phaseCourante !== 'ENGRAISSEMENT' || !poidsProjeteFin || !pesees.length) return null;
    if (gmqMoyenGlobal <= 0) return null;
    const derniere = pesees[pesees.length - 1];
    const joursAvant = Math.max(
      0,
      Math.round(((poidsProjeteFin - derniere.poidsMoyen) * 1000) / gmqMoyenGlobal),
    );
    const dateFinition = addDays(derniere.date, joursAvant);
    return { joursAvant, dateFinition };
  }, [phaseCourante, poidsProjeteFin, pesees, gmqMoyenGlobal]);

  return (
    <div className="card-dense">
      <SectionDivider
        label="Croissance"
        action={
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            aria-label="Aide croissance"
            aria-expanded={showHelp}
            className="pressable inline-flex h-7 w-7 items-center justify-center rounded-md bg-bg-2 text-text-2 hover:text-text-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            <HelpCircle size={14} aria-hidden="true" />
          </button>
        }
      />

      {showHelp ? (
        <div className="mb-3 rounded-md bg-bg-2 p-3 font-mono text-[11px] leading-relaxed text-text-1">
          Le GMQ (Gain Moyen Quotidien) est calculé entre pesées successives.
          Cibles professionnelles :<br />
          <span className="text-text-2">• Sous mère (0-21j) : 180-250 g/j</span><br />
          <span className="text-text-2">• Post-sevrage (21-70j) : 400-500 g/j</span><br />
          <span className="text-text-2">• Engraissement (70-180j) : 750-900 g/j</span><br />
          Alerte si GMQ réel &lt; 80% de la cible.
        </div>
      ) : null}

      {pesees.length === 0 ? (
        /* ── État vide : aucune pesée ─────────────────────────────────── */
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Scale size={36} className="text-text-2 mb-3" aria-hidden="true" strokeWidth={1.5} />
          <p className="font-mono text-[12px] text-text-1 uppercase tracking-wide">
            Aucune pesée enregistrée
          </p>
          <p className="mt-1.5 font-mono text-[11px] text-text-2">
            Utilisez le bouton Pesée du Cockpit pour commencer.
          </p>
        </div>
      ) : (
        <>
          {/* ── Grid KPIs ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-2">
            <KpiCard
              icon={<Weight size={12} aria-hidden="true" />}
              label="Dernier poids"
              value={dernierPoids !== undefined ? dernierPoids.toFixed(1) : '—'}
              unit="kg"
              deltaLabel={
                joursDepuisDerniere !== undefined && joursDepuisDerniere >= 0
                  ? joursDepuisDerniere === 0
                    ? 'aujourd\'hui'
                    : `il y a ${joursDepuisDerniere}j`
                  : undefined
              }
            />
            <KpiCard
              icon={<TrendingUp size={12} aria-hidden="true" />}
              label="GMQ moyen"
              value={gmqMoyenGlobal > 0 ? gmqMoyenGlobal : '—'}
              unit={gmqMoyenGlobal > 0 ? 'g/j' : undefined}
              tone={alerte === 'SOUS_CIBLE' ? 'warning' : 'default'}
            />
            <KpiCard
              icon={<Target size={12} aria-hidden="true" />}
              label="Cible phase"
              value={
                gmqCibleActuel.max > 0
                  ? `${gmqCibleActuel.min}-${gmqCibleActuel.max}`
                  : '—'
              }
              unit={gmqCibleActuel.max > 0 ? 'g/j' : undefined}
            />
          </div>

          {/* ── Chip alerte ──────────────────────────────────────────── */}
          <div className="mt-3 flex items-center gap-2">
            <Chip label={chipMeta.label} tone={chipMeta.tone} />
          </div>

          {/* ── Historique pesées (DESC) ─────────────────────────────── */}
          <div className="mt-4">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-wide text-text-2">
              Historique
            </div>
            <ul className="card-dense !p-0 overflow-hidden">
              {pesees
                .slice()
                .reverse()
                .map((p, idxFromEnd) => {
                  // prev dans l'ordre chronologique = pesée avant p
                  const chronoIdx = pesees.length - 1 - idxFromEnd;
                  const prev = chronoIdx > 0 ? pesees[chronoIdx - 1] : undefined;
                  return (
                    <li key={`${p.date}-${chronoIdx}`}>
                      <PeseeRow pesee={p} prev={prev} />
                    </li>
                  );
                })}
            </ul>
          </div>

          {/* ── Projection finition (ENGRAISSEMENT) ──────────────────── */}
          {projectionInfo && poidsProjeteFin ? (
            <div className="mt-3 rounded-md border border-border bg-bg-2 p-3">
              <div className="font-mono text-[10px] uppercase tracking-wide text-text-2">
                Projection finition
              </div>
              <div className="mt-1 font-mono text-[13px] tabular-nums text-text-0">
                {poidsProjeteFin} kg dans {projectionInfo.joursAvant}j
                <span className="ml-1.5 text-text-2">
                  ({fmtDateCourt(projectionInfo.dateFinition)})
                </span>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default BandeCroissanceCard;
