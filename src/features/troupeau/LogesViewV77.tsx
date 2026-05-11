/**
 * V77 — LogesViewV77
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Vue plate des loges montée DANS le tab "loges" de `/troupeau` (AnimalsV70).
 *
 * Hypothèse de wrapping : le composant est rendu DANS le hub Élevage,
 * sous le header `.ph--primary` et le `TabsMini` existants. Il ne re-rend
 * donc PAS son propre header — il fournit pills filtres + cards + FAB +
 * form. Le wrapper `.pt-screen` est porté par AnimalsV70 (déjà en place).
 *
 * Décisions data binding :
 *  - `listLoges()` + `getLogeContents()` (existants, déjà testés via
 *    TroupeauLogesListView). RLS scoped farm_id auto.
 *  - Si `listLoges()` retourne [] (cas réel d'une ferme sans loges configurées
 *    OU erreur RLS silencieuse) → empty state `.empty-state` avec CTA création.
 *
 * Markup V77 :
 *  - Pills filtres par type : Toutes / Maternité / Post-sevrage /
 *    Engraissement / Quarantaine (mappée sur INFIRMERIE).
 *  - Cards `.card-link` : numéro mono uppercase, type chip couleur,
 *    occupation X/Y mono + barre `.bar-progress`, statut Disponible/Pleine/
 *    Surdense.
 *  - FAB `.fab` "+" → ouvre `QuickAddLogeForm` (form existant).
 *
 * Tokens : `--pt-*` uniquement. Polices `var(--pt-font-*)`. Icônes lucide.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, ChevronRight } from 'lucide-react';

import { listLoges, getLogeContents } from '../../services/supabaseWrites';
import type { Loge, LogeType } from '../../types/farm';
import QuickAddLogeForm from '../../components/forms/QuickAddLogeForm';
import { Pill, type PillVariant } from '../../v70/components/ds/Pill';

interface LogeWithOccupation extends Loge {
  occupation: number;
}

type FilterValue = 'ALL' | 'MATERNITE' | 'POST_SEVRAGE' | 'ENGRAISSEMENT' | 'INFIRMERIE';

const FILTER_OPTIONS: ReadonlyArray<{ value: FilterValue; label: string }> = [
  { value: 'ALL', label: 'Toutes' },
  { value: 'MATERNITE', label: 'Maternité' },
  { value: 'POST_SEVRAGE', label: 'Post-sevrage' },
  { value: 'ENGRAISSEMENT', label: 'Engraissement' },
  { value: 'INFIRMERIE', label: 'Quarantaine' },
];

const TYPE_LABELS: Record<LogeType, string> = {
  MATERNITE: 'Maternité',
  POST_SEVRAGE: 'Post-sevrage',
  CROISSANCE: 'Croissance',
  ENGRAISSEMENT: 'Engraissement',
  FINITION: 'Finition',
  GESTANTE: 'Gestante',
  VERRAT: 'Verrat',
  INFIRMERIE: 'Quarantaine',
  AUTRE: 'Autre',
};

const TYPE_PILL_VARIANT: Record<LogeType, PillVariant> = {
  MATERNITE: 'warm',
  POST_SEVRAGE: 'info',
  CROISSANCE: 'info',
  ENGRAISSEMENT: 'success',
  FINITION: 'success',
  GESTANTE: 'warm',
  VERRAT: 'accent',
  INFIRMERIE: 'warning',
  AUTRE: 'ghost',
};

interface StatusInfo {
  label: string;
  variant: PillVariant;
}

function computeStatus(occupation: number, capaciteMax?: number): StatusInfo {
  if (capaciteMax === undefined || capaciteMax <= 0) {
    return {
      label: occupation > 0 ? 'Occupée' : 'Disponible',
      variant: occupation > 0 ? 'info' : 'success',
    };
  }
  if (occupation === 0) return { label: 'Disponible', variant: 'success' };
  if (occupation > capaciteMax) return { label: 'Surdense', variant: 'danger' };
  if (occupation >= capaciteMax) return { label: 'Pleine', variant: 'warning' };
  return { label: 'Occupée', variant: 'info' };
}

function progressPct(occupation: number, capaciteMax?: number): number {
  if (capaciteMax === undefined || capaciteMax <= 0) return 0;
  return Math.min(100, Math.round((occupation / capaciteMax) * 100));
}

export interface LogesViewV77Props {
  /** Override CTA "Créer une loge" du empty state. */
  onCreateClick?: () => void;
}

const LogesViewV77: React.FC<LogesViewV77Props> = ({ onCreateClick }) => {
  const navigate = useNavigate();
  const [loges, setLoges] = useState<LogeWithOccupation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>('ALL');
  const [addOpen, setAddOpen] = useState(false);

  const refresh = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true);
    try {
      const list = await listLoges();
      if (signal?.cancelled) return;
      const active = list.filter((l) => l.active);
      const enriched = await Promise.all(
        active.map(async (l) => {
          try {
            const c = await getLogeContents(l.id);
            return { ...l, occupation: c.totalAnimaux };
          } catch {
            return { ...l, occupation: 0 };
          }
        }),
      );
      if (signal?.cancelled) return;
      setLoges(enriched);
    } finally {
      if (!signal?.cancelled) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    void refresh(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [refresh]);

  const filtered = useMemo<LogeWithOccupation[]>(() => {
    if (filter === 'ALL') return loges;
    return loges.filter((l) => l.type === filter);
  }, [loges, filter]);

  const handleOpenAdd = useCallback(() => {
    if (onCreateClick) onCreateClick();
    else setAddOpen(true);
  }, [onCreateClick]);

  const handleAddSuccess = useCallback(() => {
    setAddOpen(false);
    void refresh();
  }, [refresh]);

  const totalActives = loges.length;

  return (
    <div data-testid="loges-view-v77">
      {/* ── Pills filtres par type ─────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Filtrer par type de loge"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14, marginBottom: 16 }}
      >
        {FILTER_OPTIONS.map((opt) => {
          const active = filter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              role="tab"
              aria-selected={active}
              className="pill-wrapper"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <Pill variant={active ? 'primary' : 'ghost'}>{opt.label}</Pill>
            </button>
          );
        })}
      </div>

      {/* ── Liste / loading / empty ──────────────────────────────────── */}
      {loading ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: 24,
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--pt-muted)',
          }}
        >
          Chargement…
        </div>
      ) : totalActives === 0 ? (
        <div className="empty-state empty" data-testid="loges-empty-state">
          <Home size={38} strokeWidth={2} color="var(--pt-subtle)" aria-hidden />
          <div
            style={{
              fontFamily: 'var(--pt-font-display)',
              fontWeight: 900,
              textTransform: 'uppercase',
              fontSize: 22,
              letterSpacing: '-0.005em',
              color: 'var(--pt-ink)',
            }}
          >
            Aucune loge configurée
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--pt-muted)',
              maxWidth: '32ch',
            }}
          >
            Ajoute tes loges pour activer le suivi de l&apos;occupation et des mouvements.
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            aria-label="Créer une loge"
            className="btn btn--primary"
            style={{
              marginTop: 6,
              background: 'var(--pt-primary)',
              color: 'var(--pt-warm)',
              border: 'none',
              borderRadius: 12,
              padding: '11px 18px',
              fontFamily: 'var(--pt-font-mono)',
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Créer une loge
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div
          role="status"
          style={{
            padding: 18,
            textAlign: 'center',
            color: 'var(--pt-muted)',
            fontSize: 13,
          }}
        >
          Aucune loge pour ce filtre.
        </div>
      ) : (
        <div data-testid="loges-list">
          {filtered.map((l) => {
            const cap = l.capaciteMax;
            const occupationLabel = cap !== undefined ? `${l.occupation}/${cap}` : `${l.occupation}`;
            const pct = progressPct(l.occupation, cap);
            const status = computeStatus(l.occupation, cap);
            const typeLabel = TYPE_LABELS[l.type];
            const typeVariant = TYPE_PILL_VARIANT[l.type];

            return (
              <button
                key={l.id}
                type="button"
                className="card-link"
                onClick={() => navigate(`/troupeau/loges/${l.id}`)}
                aria-label={`Loge ${l.numero}, ${typeLabel}, occupation ${occupationLabel}, ${status.label}`}
                style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
                  <span className="card-link__icon" aria-hidden="true">
                    <Home />
                  </span>
                  <div className="card-link__main">
                    <div
                      className="card-link__title"
                      style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
                    >
                      {l.numero}
                    </div>
                    <div
                      className="card-link__sub"
                      style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}
                    >
                      <Pill variant={typeVariant}>{typeLabel}</Pill>
                      <Pill variant={status.variant}>{status.label}</Pill>
                      {l.batiment ? <span>· {l.batiment}</span> : null}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--pt-font-mono)',
                      fontWeight: 600,
                      fontSize: 12,
                      color: 'var(--pt-ink)',
                      letterSpacing: '0.02em',
                    }}
                    aria-hidden="true"
                  >
                    {occupationLabel}
                  </span>
                  <span className="card-link__chev" aria-hidden="true">
                    <ChevronRight />
                  </span>
                </div>
                {cap !== undefined ? (
                  <div
                    className="bar-progress"
                    role="presentation"
                    style={{
                      height: 4,
                      width: '100%',
                      background: 'var(--pt-line)',
                      borderRadius: 999,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: status.variant === 'danger'
                          ? 'var(--pt-danger)'
                          : status.variant === 'warning'
                          ? 'var(--pt-warning)'
                          : 'var(--pt-primary)',
                        transition: 'width 240ms ease',
                      }}
                    />
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {/* QuickAddLogeForm est rendu uniquement quand l'empty state CTA local
          est utilisé (pas de onCreateClick override). Sinon AnimalsV70 gère
          son propre FAB+form pour le tab Loges. */}
      {!onCreateClick && (
        <QuickAddLogeForm
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  );
};

export default LogesViewV77;
