/**
 * V80 — EngraissementV70 (page /engraissement, archétype Hub Lots).
 *
 * Sprint V80 P0 #2. Couvre l'écart "module Engraissement" (cf.
 * PROJECT_BLUEPRINT §8.3) : réception lots, pesées hebdo, GMQ auto,
 * alerte poids vente, mortalité par cause, coût total partiel.
 *
 * Structure :
 *  - Header `.ph--primary` (DNA V78)
 *  - 4 KPI strip : Total lots actifs / Porcs en stock / GMQ moyen / Mortalité moyenne
 *  - Liste lots actifs (Card par lot avec code, nb porcs vivants, poids estimé,
 *    GMQ courant, badge "PRÊT VENTE" si poids ≥ 110)
 *  - FAB "+ Lot" → QuickAddLotForm
 *  - Empty state V78 si 0 lot
 *  - Click sur lot → expand pour saisir pesée + mortalité
 */
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Boxes, ChevronDown, ChevronUp, Plus, Scale, Skull } from 'lucide-react';
import { Card } from '../components/ds/Card';
import { Section } from '../components/ds/Section';
import { Pill } from '../components/ds/Pill';
import { FARM_CONFIG } from '../../config/farm';
import { formatDateFr } from '../lib';
import {
  listLotsByFarm,
  listPeseesByLot,
  listMortalitesByLot,
  computeGMQ,
  currentAvgWeight,
  porcsVivants,
  tauxMortalite,
  isPretVente,
  coutAchatTotal,
  type LotRow,
  type LotPeseeRow,
  type LotMortaliteRow,
} from '../../services/repos/lots.repo';

const QuickAddLotForm = lazy(() => import('../../components/forms/QuickAddLotForm'));
const QuickAddPeseeLotForm = lazy(() => import('../../components/forms/QuickAddPeseeLotForm'));
const QuickAddMortaliteLotForm = lazy(() => import('../../components/forms/QuickAddMortaliteLotForm'));

interface LotEnriched {
  lot: LotRow;
  pesees: LotPeseeRow[];
  morts: LotMortaliteRow[];
}

const SEUIL_VENTE = FARM_CONFIG.FINITION_POIDS_MAX_KG;

const fmt = (v: number | null | undefined, decimals = 0, suffix = ''): string => {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v.toFixed(decimals)}${suffix}`;
};

export const EngraissementV70: React.FC = () => {
  const [lots, setLots] = useState<LotEnriched[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [peseeFor, setPeseeFor] = useState<LotRow | null>(null);
  const [mortaliteFor, setMortaliteFor] = useState<LotRow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const lotRows = await listLotsByFarm();
      if (signal?.aborted) return;
      const enriched: LotEnriched[] = await Promise.all(
        lotRows.map(async (lot) => {
          const [pesees, morts] = await Promise.all([
            listPeseesByLot(lot.id),
            listMortalitesByLot(lot.id),
          ]);
          return { lot, pesees, morts };
        }),
      );
      if (signal?.aborted) return;
      setLots(enriched);
    } catch (e) {
      if (signal?.aborted) return;
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    void refresh(ctrl.signal);
    return () => ctrl.abort();
  }, [refresh]);

  // KPIs agrégés (cap statistique respecté côté GMQ individuel)
  const kpis = useMemo(() => {
    const actifs = lots.filter((l) => l.lot.statut === 'EN_COURS');
    const totalLotsActifs = actifs.length;
    const porcsEnStock = actifs.reduce(
      (acc, e) => acc + porcsVivants(e.lot, e.morts),
      0,
    );
    const gmqs = actifs
      .map((e) => computeGMQ(e.lot, e.pesees))
      .filter((g): g is number => g != null);
    const gmqMoy = gmqs.length > 0
      ? Math.round(gmqs.reduce((a, b) => a + b, 0) / gmqs.length)
      : null;
    const mortaliteMoy = actifs.length > 0
      ? actifs.reduce((acc, e) => acc + tauxMortalite(e.lot, e.morts), 0) / actifs.length
      : null;
    return { totalLotsActifs, porcsEnStock, gmqMoy, mortaliteMoy };
  }, [lots]);

  const handleLotCreated = (): void => {
    void refresh();
  };

  const lotsActifs = useMemo(
    () => lots.filter((e) => e.lot.statut === 'EN_COURS'),
    [lots],
  );

  return (
    <div
      className="pt-screen phone-content"
      style={{ padding: '24px 24px 168px', maxWidth: 600, margin: '0 auto' }}
    >
      <header className="ph ph--primary">
        <div className="ph__row">
          <div>
            <div className="ph__eyebrow">
              {loading ? 'Engraissement' : `Engraissement · ${kpis.totalLotsActifs} lot${kpis.totalLotsActifs > 1 ? 's' : ''}`}
            </div>
            <h1 className="ph__h1">Lots</h1>
            <p className="ph__sub">
              {loading
                ? 'Chargement…'
                : kpis.porcsEnStock > 0
                  ? `${kpis.porcsEnStock} porcs en stock · GMQ moy. ${fmt(kpis.gmqMoy, 0, ' g/j')}`
                  : 'Aucun lot en cours · réceptionne pour démarrer.'}
            </p>
          </div>
        </div>
      </header>

      {/* 4 KPI strip */}
      <div
        className="kpis-strip"
        aria-label="Indicateurs clés engraissement"
        data-pt-strip="engraissement"
        style={{ marginBottom: 16 }}
      >
        <div className="kpi">
          {/* v3.4.9 : labels raccourcis pour ne pas tronquer à 360px */}
          <div className="kpi__label">Lots</div>
          <div className="kpi__val">{kpis.totalLotsActifs}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Effectif</div>
          <div className="kpi__val">{kpis.porcsEnStock}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">GMQ g/j</div>
          <div
            className="kpi__val"
            title={kpis.gmqMoy == null ? '2 pesées minimum requises sur au moins 1 lot' : undefined}
          >
            {fmt(kpis.gmqMoy, 0)}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__label">Mortalité</div>
          <div className="kpi__val">{fmt(kpis.mortaliteMoy, 1, '%')}</div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: 'var(--pt-danger-bg-soft)',
            color: 'var(--pt-danger)',
            padding: '10px 14px',
            borderRadius: 12,
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Liste lots actifs */}
      {!loading && lotsActifs.length === 0 ? (
        <div className="empty-state empty" data-testid="empty-state-engraissement">
          <Boxes size={38} strokeWidth={2} color="var(--pt-subtle)" aria-hidden />
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
            Aucun lot en cours
          </div>
          <div style={{ fontSize: 13, color: 'var(--pt-muted)', maxWidth: '32ch' }}>
            Réceptionne ton premier lot pour suivre GMQ, mortalité et coût total.
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            aria-label="Réceptionner un lot"
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
            Réceptionner un lot
          </button>
        </div>
      ) : (
        <Section label={`${lotsActifs.length} lot${lotsActifs.length > 1 ? 's' : ''} actif${lotsActifs.length > 1 ? 's' : ''}`}>
          {lotsActifs.map((e) => (
            <LotCard
              key={e.lot.id}
              data={e}
              expanded={expandedId === e.lot.id}
              onToggle={() =>
                setExpandedId((prev) => (prev === e.lot.id ? null : e.lot.id))
              }
              onPeser={() => setPeseeFor(e.lot)}
              onMortalite={() => setMortaliteFor(e.lot)}
            />
          ))}
        </Section>
      )}

      {/* FAB orange "+" (ne pas afficher quand empty state — duplique le CTA) */}
      {(!loading && lotsActifs.length > 0) && (
        <button
          type="button"
          className="fab"
          aria-label="Réceptionner un lot"
          onClick={() => setAddOpen(true)}
          style={{ fontSize: 28, fontWeight: 700 }}
        >
          <Plus size={26} strokeWidth={2.6} aria-hidden="true" />
        </button>
      )}

      <Suspense fallback={null}>
        <QuickAddLotForm
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
          onSuccess={handleLotCreated}
        />
        {peseeFor && (
          <QuickAddPeseeLotForm
            isOpen={peseeFor !== null}
            lotId={peseeFor.id}
            lotCode={peseeFor.code}
            onClose={() => setPeseeFor(null)}
            onSuccess={() => {
              setPeseeFor(null);
              void refresh();
            }}
          />
        )}
        {mortaliteFor && (
          <QuickAddMortaliteLotForm
            isOpen={mortaliteFor !== null}
            lotId={mortaliteFor.id}
            lotCode={mortaliteFor.code}
            onClose={() => setMortaliteFor(null)}
            onSuccess={() => {
              setMortaliteFor(null);
              void refresh();
            }}
          />
        )}
      </Suspense>
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────────
// LotCard — card pour un lot, avec expand pesées/morts + actions
// ───────────────────────────────────────────────────────────────────────────
interface LotCardProps {
  data: LotEnriched;
  expanded: boolean;
  onToggle: () => void;
  onPeser: () => void;
  onMortalite: () => void;
}

const LotCard: React.FC<LotCardProps> = ({ data, expanded, onToggle, onPeser, onMortalite }) => {
  const { lot, pesees, morts } = data;
  const vivants = porcsVivants(lot, morts);
  const poidsMoy = currentAvgWeight(lot, pesees);
  const gmq = computeGMQ(lot, pesees);
  const pret = isPretVente(lot, pesees, SEUIL_VENTE);
  const tauxMort = tauxMortalite(lot, morts);
  const coutAchat = coutAchatTotal(lot);

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`Lot ${lot.code} — ${expanded ? 'replier' : 'déplier'}`}
        style={{
          all: 'unset',
          display: 'block',
          width: '100%',
          padding: '12px 14px',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontFamily: 'var(--pt-font-mono)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--pt-ink)',
                letterSpacing: '0.02em',
              }}
            >
              {lot.code}
            </div>
            <div style={{ fontSize: 12, color: 'var(--pt-muted)', marginTop: 2 }}>
              {vivants} porc{vivants > 1 ? 's' : ''} · {fmt(poidsMoy, 1, ' kg')} moy. · arrivée {formatDateFr(lot.date_arrivee)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--pt-subtle)', marginTop: 2, fontFamily: 'var(--pt-font-mono)' }}>
              GMQ {fmt(gmq, 0, ' g/j')} · mortalité {fmt(tauxMort, 1, '%')}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            {pret ? (
              <Pill variant="warning">Prêt vente</Pill>
            ) : (
              <Pill variant="info">En cours</Pill>
            )}
            <span aria-hidden="true" style={{ color: 'var(--pt-muted)' }}>
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div
          style={{
            borderTop: '1px solid var(--pt-line)',
            padding: '12px 14px',
            background: 'var(--pt-bg)',
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <button
              type="button"
              onClick={onPeser}
              className="btn btn--ghost"
              aria-label="Saisir une pesée"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Scale size={14} aria-hidden="true" />
              Peser
            </button>
            <button
              type="button"
              onClick={onMortalite}
              className="btn btn--ghost"
              aria-label="Signaler une mortalité"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Skull size={14} aria-hidden="true" />
              Mortalité
            </button>
          </div>

          <div style={{ fontSize: 12, color: 'var(--pt-muted)', lineHeight: 1.5 }}>
            <div>
              <strong style={{ color: 'var(--pt-ink)' }}>Initial :</strong> {lot.nb_porcs_initial} porcs
              {lot.poids_moyen_arrivee != null && ` · ${lot.poids_moyen_arrivee} kg moy.`}
              {lot.fournisseur && ` · ${lot.fournisseur}`}
            </div>
            <div style={{ marginTop: 4 }}>
              <strong style={{ color: 'var(--pt-ink)' }}>Pesées :</strong>{' '}
              {pesees.length === 0 ? '—' : `${pesees.length} (dernière ${formatDateFr(pesees[pesees.length - 1].date)})`}
            </div>
            <div style={{ marginTop: 4 }}>
              <strong style={{ color: 'var(--pt-ink)' }}>Morts :</strong>{' '}
              {morts.length === 0
                ? '—'
                : `${morts.reduce((a, m) => a + m.nb_morts, 0)} (${morts.length} épisode${morts.length > 1 ? 's' : ''})`}
            </div>
            <div style={{ marginTop: 4 }}>
              <strong style={{ color: 'var(--pt-ink)' }}>Coût achat :</strong>{' '}
              {coutAchat != null ? `${coutAchat.toLocaleString('fr-FR')} FCFA` : '—'}
              <span
                title="Module Aliment-Conso à venir"
                style={{ marginLeft: 4, color: 'var(--pt-subtle)', cursor: 'help' }}
              >
                (aliment + véto à venir)
              </span>
            </div>
            {pesees.length === 1 && (
              <div style={{ marginTop: 8, color: 'var(--pt-warning)', fontSize: 11 }}>
                Note : 2 pesées minimum requises pour calculer le GMQ.
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default EngraissementV70;
