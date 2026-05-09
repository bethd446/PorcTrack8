/**
 * PoidsTriView — Bandeau « Tri par poids » pour BandeDetailView.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Affiché uniquement quand la bande est en phase ENGRAISSEMENT ou FINITION.
 *
 * Contexte métier :
 *   En engraissement, tous les porcs n'atteignent pas 110 kg en même temps.
 *   Le porcher pèse régulièrement et ventile :
 *     ≥ 110 kg  → prêts vente
 *     100-110   → bientôt
 *     90-100    → ok
 *     < 90      → retardés
 *
 *   Optimiser : vendre les ≥ 110 kg en lots successifs plutôt que tout en
 *   bloc (cash-flow + libère places de loge).
 *
 * Deux actions :
 *   • Saisir tri par poids → ouvre QuickWeightDistForm
 *   • Vendre les ≥ 110 kg → ouvre QuickVenteForm avec quantité présaisie
 *
 * Empty state : "Aucun tri enregistré — saisis ton premier".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Scale, ShoppingCart, AlertTriangle } from 'lucide-react';
import { Button } from '@/design-system';

import {
  listWeightDistributions,
  type WeightDistributionRow,
} from '../../services/supabaseWrites';
import type { BandePorcelets } from '../../types/farm';

export interface PoidsTriViewProps {
  bande: BandePorcelets;
  onSaisirTri: () => void;
  onVendrePrets: (nbPretsVente: number) => void;
  /** Inject for tests (sinon, lit depuis Supabase). */
  initialDist?: WeightDistributionRow | null;
}

interface DistSummary {
  under90: number;
  r90To100: number;
  r100To110: number;
  above110: number;
  total: number;
  date: string;
}

function summarize(row: WeightDistributionRow | null): DistSummary | null {
  if (!row) return null;
  const total =
    (row.nb_under_90kg || 0) +
    (row.nb_90_to_100kg || 0) +
    (row.nb_100_to_110kg || 0) +
    (row.nb_above_110kg || 0);
  return {
    under90: row.nb_under_90kg || 0,
    r90To100: row.nb_90_to_100kg || 0,
    r100To110: row.nb_100_to_110kg || 0,
    above110: row.nb_above_110kg || 0,
    total,
    date: row.date_pesee,
  };
}

function formatDateFr(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

const PoidsTriView: React.FC<PoidsTriViewProps> = ({
  bande,
  onSaisirTri,
  onVendrePrets,
  initialDist,
}) => {
  const [latest, setLatest] = useState<WeightDistributionRow | null>(
    initialDist ?? null,
  );
  const [loading, setLoading] = useState<boolean>(initialDist === undefined);
  const [error, setError] = useState<string>('');

  const bandeIdValue = bande.id;
  const fetchLatest = useCallback(async (signal?: { cancelled: boolean }) => {
    if (!bandeIdValue) return;
    setLoading(true);
    setError('');
    try {
      const rows = await listWeightDistributions(bandeIdValue);
      if (signal?.cancelled) return;
      setLatest(rows[0] ?? null);
    } catch (e) {
      if (signal?.cancelled) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (!signal?.cancelled) setLoading(false);
    }
  }, [bandeIdValue]);

  useEffect(() => {
    if (initialDist === undefined) {
      const signal = { cancelled: false };
      void fetchLatest(signal);
      return () => {
        signal.cancelled = true;
      };
    }
    return undefined;
  }, [fetchLatest, initialDist]);

  const summary = summarize(latest);

  return (
    <section
      aria-label="Tri par poids"
      className="card-dense flex flex-col gap-3"
    >
      <div className="flex items-center gap-2">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-bg-2 text-amber">
          <Scale size={16} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wide text-text-2">
            Tri par poids
          </div>
          <div className="text-[12px] text-text-0 truncate">
            Bande {bande.idPortee || bande.id}
          </div>
        </div>
        {summary ? (
          <span className="text-[10px] tabular-nums text-text-2">
            {formatDateFr(summary.date)}
          </span>
        ) : null}
      </div>

      <div className="hairline" />

      {loading ? (
        <p className="text-[11px] text-text-2">Chargement…</p>
      ) : error ? (
        <div
          className="flex items-center gap-2 text-red"
          role="alert"
          aria-live="polite"
        >
          <AlertTriangle size={14} aria-hidden="true" />
          <p className="text-[11px]">{error}</p>
        </div>
      ) : !summary ? (
        <div
          className="py-3 text-center"
          role="status"
          aria-label="Aucun tri par poids enregistré"
        >
          <p className="text-[12px] text-text-2">
            Aucun tri enregistré
          </p>
          <p className="text-[10px] text-text-2 mt-1">
            Saisis ton premier tri pour visualiser la distribution.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <DistRow
            label="≥ 110 kg"
            tag="Prêts vente"
            count={summary.above110}
            tone="green"
          />
          <DistRow
            label="100 - 110 kg"
            tag="Bientôt"
            count={summary.r100To110}
            tone="amber"
          />
          <DistRow
            label="90 - 100 kg"
            tag="OK"
            count={summary.r90To100}
            tone="default"
          />
          <DistRow
            label="< 90 kg"
            tag="Retardés"
            count={summary.under90}
            tone="red"
          />
          <div className="hairline" />
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide">
            <span className="text-text-2">Total pesé</span>
            <span className="text-text-0 tabular-nums">{summary.total}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="secondary"
          onClick={onSaisirTri}
          ariaLabel="Saisir un nouveau tri par poids"
          className="!flex-1"
        >
          <Scale size={14} aria-hidden="true" />
          <span>Saisir tri</span>
        </Button>
        <Button
          variant="primary"
          onClick={() => onVendrePrets(summary?.above110 ?? 0)}
          disabled={!summary || summary.above110 <= 0}
          ariaLabel="Vendre les porcs prêts à la vente"
          className="!flex-1"
        >
          <ShoppingCart size={14} aria-hidden="true" />
          <span>
            Vendre ≥110 {summary?.above110 ? `(${summary.above110})` : ''}
          </span>
        </Button>
      </div>
    </section>
  );
};

interface DistRowProps {
  label: string;
  tag: string;
  count: number;
  tone: 'green' | 'amber' | 'default' | 'red';
}

const TONE_CLASSES: Record<DistRowProps['tone'], string> = {
  green: 'text-green-600',
  amber: 'text-amber',
  default: 'text-text-0',
  red: 'text-red',
};

const DistRow: React.FC<DistRowProps> = ({ label, tag, count, tone }) => (
  <div className="flex items-center justify-between gap-2">
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[12px] text-text-0">{label}</span>
      <span className="text-[10px] uppercase tracking-wide text-text-2 truncate">
        · {tag}
      </span>
    </div>
    <span
      className={[
        'font-mono text-[14px] tabular-nums font-bold',
        TONE_CLASSES[tone],
      ].join(' ')}
    >
      {count}
    </span>
  </div>
);

export default PoidsTriView;
