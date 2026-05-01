/**
 * BandeICRealCard — Indicateur alimentaire (IC théorique vs IC réel)
 * ════════════════════════════════════════════════════════════════════════
 * V21-3 (2026-05-01).
 *
 * Affiche pour une bande :
 *   - IC théorique (constante 2.85 — référence ferme)
 *   - IC réel (calculé depuis `feed_consumption_logs`)
 *   - Écart en %
 *
 * Empty state si aucune saisie : invite à saisir la première conso aliment.
 * Badge orange si nb_saisies < seuil de fiabilité.
 */

import React, { useEffect, useState } from 'react';
import { Wheat } from 'lucide-react';
import {
  IC_THEORIQUE_DEFAUT,
  computeICReel,
  type ICReel,
} from '../../services/feedConsumptionAnalyzer';

interface BandeICRealCardProps {
  bandeId: string;
  /** Callback ouverture du form de saisie conso aliment (deep-link). */
  onSaisirConso?: () => void;
}

const BandeICRealCard: React.FC<BandeICRealCardProps> = ({
  bandeId,
  onSaisirConso,
}) => {
  const [data, setData] = useState<ICReel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    computeICReel(bandeId)
      .then(res => {
        if (cancelled) return;
        setData(res);
      })
      .catch(e => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Erreur calcul IC');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bandeId]);

  if (loading) {
    return (
      <div className="card-dense !p-4 animate-pulse">
        <p className="font-mono text-[11px] uppercase tracking-wide text-text-2">
          Indicateur alimentaire — chargement…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-dense !p-4">
        <p className="font-mono text-[11px] text-red">
          IC réel indisponible : {error}
        </p>
      </div>
    );
  }

  // Empty state — pas de saisie ou pas de poids moyen
  if (!data || data.nb_saisies === 0) {
    return (
      <div className="card-dense !p-4">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-bg-2 text-amber-pork">
            <Wheat size={18} aria-hidden="true" />
          </div>
          <div className="flex-1 space-y-2">
            <p className="font-mono text-[12px] uppercase tracking-wide text-text-1">
              IC réel — non disponible
            </p>
            <p className="font-sans text-[13px] text-text-2">
              {data
                ? 'Saisis ta première conso aliment pour activer l’IC réel.'
                : 'Pas de poids moyen ou de saisie disponible.'}
            </p>
            {onSaisirConso ? (
              <button
                type="button"
                onClick={onSaisirConso}
                className="pressable inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 font-mono text-[12px] font-bold uppercase tracking-wide text-bg-0 hover:brightness-110"
              >
                <Wheat size={14} aria-hidden="true" />
                Saisir ma conso
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const ecartPositif = data.vs_theorique_pct > 0;
  const ecartLabel = ecartPositif
    ? `+${data.vs_theorique_pct.toFixed(1)}%`
    : `${data.vs_theorique_pct.toFixed(1)}%`;

  return (
    <div className="card-dense !p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-wide text-text-2">
          Indicateur alimentaire
        </p>
        {!data.fiable ? (
          <span
            className="font-mono text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 bg-amber-pork/15 text-amber-pork border border-amber-pork/30"
            title={`${data.nb_saisies} saisie(s) — peu fiable`}
          >
            Peu fiable
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-wide text-text-2">
            IC théorique
          </p>
          <p className="font-mono text-[20px] tabular-nums text-text-0">
            {IC_THEORIQUE_DEFAUT.toFixed(2)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-wide text-text-2">
            IC réel
          </p>
          <p
            className={[
              'font-mono text-[20px] tabular-nums',
              data.fiable ? 'text-text-0' : 'text-amber-pork',
            ].join(' ')}
          >
            {data.ic_reel.toFixed(2)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-wide text-text-2">
            Écart
          </p>
          <p
            className={[
              'font-mono text-[20px] tabular-nums',
              ecartPositif ? 'text-red' : 'text-accent',
            ].join(' ')}
          >
            {ecartLabel}
          </p>
        </div>
      </div>

      <p className="font-mono text-[10px] text-text-2">
        {data.total_kg_livre.toFixed(0)} kg livrés ·{' '}
        {data.total_kg_porc_produit.toFixed(0)} kg produit ·{' '}
        {data.nb_saisies} saisie{data.nb_saisies > 1 ? 's' : ''}
      </p>
    </div>
  );
};

export default BandeICRealCard;
