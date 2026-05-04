import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
} from '@ionic/react';
import {
  Heart,
  LayoutGrid,
  List as ListIcon,
  Plus,
  Search,
  Syringe,
  Users,
} from 'lucide-react';

import { TruieIcon } from '../../components/icons';
import {
  AnimalListItem,
  SectionDivider,
  type ChipTone,
} from '../../components/agritech';
import EmptyStateShared from '../../components/design/EmptyState';
import { Tag, Segment, Chip as DsChip, Button } from '../../design-system';

type TagVariantKind = 'default' | 'primary' | 'accent' | 'soft' | 'danger' | 'warning';
function chipToneToTagVariant(tone: ChipTone): TagVariantKind {
  switch (tone) {
    case 'accent':  return 'primary';
    case 'gold':    return 'soft';
    case 'coral':   return 'warning';
    case 'red':     return 'accent';
    case 'amber':   return 'warning';
    case 'default':
    default:        return 'default';
  }
}
import QuickAddTruieForm from '../../components/forms/QuickAddTruieForm';
import QuickSaillieForm from '../../components/forms/QuickSaillieForm';
import type { Truie } from '../../types/farm';
import { normaliseStatut } from '../../lib/truieStatut';
import { kvGet, kvSet } from '../../services/kvStore';
import { useTroupeauPipeline } from '../../hooks/useTroupeauStats';

// ─── Types & Helpers ─────────────────────────────────────────────────────────

type FilterKey = 'tout' | 'pleines' | 'maternite' | 'chaleur' | 'vides' | 'reforme';

interface StatutVisu {
  label: string;
  tone: ChipTone;
  filter: FilterKey;
}

function statutVisu(statut: string | undefined): StatutVisu {
  const canon = normaliseStatut(statut);
  switch (canon) {
    case 'PLEINE':
      return { label: 'Pleine', tone: 'accent', filter: 'pleines' };
    case 'MATERNITE':
      return { label: 'Allaitante', tone: 'gold', filter: 'maternite' };
    case 'CHALEUR':
      return { label: 'Chaleur', tone: 'coral', filter: 'chaleur' };
    case 'VIDE':
      return { label: 'Vide', tone: 'default', filter: 'vides' };
    case 'REFORME':
      return { label: 'Réforme', tone: 'red', filter: 'reforme' };
    case 'SURVEILLANCE':
      return { label: 'Surveillance', tone: 'amber', filter: 'tout' };
    case 'FLUSHING':
      return { label: 'Flushing', tone: 'amber', filter: 'tout' };
    case 'INCONNU':
    default:
      return { label: statut || '—', tone: 'default', filter: 'tout' };
  }
}

function daysSince(dateFr: string | undefined, today: Date): number | null {
  if (!dateFr) return null;
  const parts = dateFr.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y) return null;
  const dt = new Date(y, m - 1, d);
  const diffMs = today.getTime() - dt.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  return Number.isFinite(days) ? days : null;
}

function truieMeta(t: Truie, today: Date): string {
  const v = statutVisu(t.statut);
  if (v.filter === 'maternite' && t.dateMBPrevue) {
    const j = daysSince(t.dateMBPrevue, today);
    if (j === null) return `MB prévue ${t.dateMBPrevue}`;
    if (j < 0) return `MB J${j}`;
    if (j === 0) return `MB aujourd'hui`;
    return `MB J+${j}`;
  }
  if (v.filter === 'pleines' && t.dateMBPrevue) {
    const j = daysSince(t.dateMBPrevue, today);
    return j !== null && j < 0
      ? `MB prévue ${t.dateMBPrevue} · dans ${-j}j`
      : `Gestation · MB ${t.dateMBPrevue}`;
  }
  if (v.filter === 'reforme') {
    return typeof t.nbPortees === 'number'
      ? `${t.nbPortees} portées · à sortir`
      : 'À sortir';
  }
  if (v.filter === 'vides') {
    return t.stade ? `Stade ${t.stade}` : 'En attente de saillie';
  }
  if (v.filter === 'chaleur') {
    return t.stade ? `Chaleur · ${t.stade}` : 'Chaleur détectée';
  }
  return t.stade || t.statut || '—';
}

type SortKey = 'recent' | 'mbPrevue' | 'parite' | 'id';

const SORT_OPTIONS: ReadonlyArray<{ id: SortKey; label: string }> = [
  { id: 'recent', label: 'Récent' },
  { id: 'mbPrevue', label: 'MB prévue' },
  { id: 'parite', label: 'Parité' },
  { id: 'id', label: 'ID' },
];

type ViewMode = 'list' | 'grid';
const VIEW_MODE_KEY = 'troupeau_view_mode';

/**
 * V42-bugfix B1 : accepte les deux formats stockés dans Supabase
 *   - ISO `YYYY-MM-DD` (format renvoyé par les colonnes date Postgres)
 *   - Locale FR `DD/MM/YYYY` (format saisie utilisateur historique)
 * Retourne un timestamp ms ou null si pas parseable.
 */
function parseDateMs(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  // ISO YYYY-MM-DD
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const [, y, m, d] = iso.map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d).getTime();
  }
  // FR DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts.map(Number);
    if (!d || !m || !y) return null;
    return new Date(y, m - 1, d).getTime();
  }
  return null;
}

function idSortKey(t: Truie): string {
  const raw = String(t.displayId || t.id || '');
  return raw.replace(/\d+/g, (n) => n.padStart(6, '0')).toUpperCase();
}

function isBoucleLikeQuery(q: string): boolean {
  const s = q.trim().toLowerCase();
  if (s.length === 0) return false;
  if (/\d/.test(s)) return true;
  return s.startsWith('b.') || s.startsWith('b ') || s === 'b' || s.startsWith('fr-');
}

function boucleMatches(boucle: string | undefined, q: string): boolean {
  if (!boucle || !q) return false;
  return boucle.toLowerCase().includes(q.trim().toLowerCase());
}

interface TroupeauTruiesViewProps {
  searchText: string;
  setSearchText: (val: string) => void;
}

// ─── Composant ──────────────────────────────────────────────────────────────

const TroupeauTruiesView: React.FC<TroupeauTruiesViewProps> = ({ searchText, setSearchText }) => {
  const navigate = useNavigate();
  const { activeTruies } = useTroupeauPipeline();
  const today = useMemo(() => new Date(), []);

  const [filter, setFilter] = useState<FilterKey>('tout');
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = kvGet(VIEW_MODE_KEY);
    return stored === 'grid' ? 'grid' : 'list';
  });

  useEffect(() => {
    kvSet(VIEW_MODE_KEY, viewMode).catch(() => {});
  }, [viewMode]);

  const [addOpen, setAddOpen] = useState(false);
  const [saillieOpen, setSaillieOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const base = activeTruies.filter((t) => {
      const v = statutVisu(t.statut);
      if (filter !== 'tout' && v.filter !== filter) return false;
      if (q) {
        const haystack = [t.displayId, t.id, t.nom, t.boucle, t.stade]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'recent') return base;
    const arr = [...base];
    if (sortBy === 'mbPrevue') {
      arr.sort((a, b) => {
        const da = parseDateMs(a.dateMBPrevue);
        const db = parseDateMs(b.dateMBPrevue);
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });
    } else if (sortBy === 'parite') {
      arr.sort((a, b) => (b.nbPortees ?? -1) - (a.nbPortees ?? -1));
    } else if (sortBy === 'id') {
      arr.sort((a, b) => idSortKey(a).localeCompare(idSortKey(b)));
    }
    return arr;
  }, [activeTruies, filter, searchText, sortBy]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      tout: activeTruies.length,
      pleines: 0,
      maternite: 0,
      chaleur: 0,
      vides: 0,
      reforme: 0,
    };
    for (const t of activeTruies) {
      const v = statutVisu(t.statut);
      if (v.filter !== 'tout') c[v.filter] += 1;
    }
    return c;
  }, [activeTruies]);

  const ALL_FILTERS: ReadonlyArray<{ id: FilterKey; label: string }> = [
    { id: 'tout', label: 'Tout' },
    { id: 'pleines', label: 'Pleines' },
    { id: 'maternite', label: 'Allaitantes' },
    { id: 'chaleur', label: 'Chaleur' },
    { id: 'vides', label: 'Vides' },
    { id: 'reforme', label: 'Réforme' },
  ];
  const visibleFilters = ALL_FILTERS.filter(
    (f) => f.id === 'tout' || counts[f.id] > 0,
  );

  const handleSaillir = (t: Truie): void => {
    navigate(`/troupeau/truies/${encodeURIComponent(t.id)}?action=saillie`);
  };
  const handleSoigner = (t: Truie): void => {
    navigate(`/troupeau/truies/${encodeURIComponent(t.id)}?action=soin`);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* V41 : toolbar uniformisée — composants DS V2 (Segment + Chips) */}
      {/* ── CTA primaire : ajouter une truie + toggle viewMode (DS V2 Segment) ── */}
      <div className="flex items-center justify-between gap-2">
        <Segment<ViewMode>
          ariaLabel="Mode d'affichage"
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: 'list', label: <ListIcon size={14} aria-label="Liste" /> },
            { value: 'grid', label: <LayoutGrid size={14} aria-label="Grille" /> },
          ]}
        />
        <Button
          variant="primary"
          size="small"
          onClick={() => setAddOpen(true)}
          ariaLabel="Ajouter une truie"
        >
          <Plus size={14} aria-hidden="true" />
          Ajouter une truie
        </Button>
      </div>

      {/* ── Recherche ───────────────────────────────────────────── */}
      <div className="relative">
        <input
          type="search"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="ID, boucle, nom, stade…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          aria-label="Rechercher une truie par ID, nom, boucle ou stade"
          className="pt-field__input"
          style={{ paddingLeft: 38 }}
        />
        <Search
          size={16}
          aria-hidden="true"
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--pt-text-subtle)', pointerEvents: 'none' }}
        />
      </div>

      {/* ── Tri (DS V2 Segment) ─────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          style={{
            flexShrink: 0,
            fontSize: 11,
            letterSpacing: 'var(--pt-tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--pt-text-muted)',
            fontWeight: 600,
          }}
        >
          Trier par
        </span>
        <Segment<SortKey>
          ariaLabel="Trier par"
          value={sortBy}
          onChange={setSortBy}
          options={SORT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
        />
      </div>

      {/* ── Sub-filter statuts (DS V2 Chips) ────────────────────── */}
      <div
        role="tablist"
        aria-label="Filtrer par statut"
        style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}
        className="pt-chips"
      >
        {visibleFilters.map((f) => (
          <span key={f.id}>
            <DsChip
              label={f.label}
              count={counts[f.id]}
              active={filter === f.id}
              onClick={() => setFilter(f.id)}
            />
          </span>
        ))}
      </div>

      {/* ── Divider + compteur résultats ────────────────────────── */}
      <SectionDivider
        label={`${filtered.length} truie${filtered.length !== 1 ? 's' : ''}`}
      />

      {/* ── Liste ou Grille ─────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyStateShared
          size="sm"
          icon={<Users size={20} aria-hidden="true" />}
          title={searchText.trim().length > 0 ? 'Aucun résultat' : 'Aucune truie'}
          description={
            searchText.trim().length > 0
              ? 'Aucune truie ne correspond à ta recherche.'
              : 'Ta feuille TRUIES est vide ou non accessible.'
          }
        />
      ) : viewMode === 'grid' ? (
        <ul
          role="list"
          aria-label="Grille des truies"
          className="grid grid-cols-2 gap-2"
        >
          {filtered.map((t) => {
            const v = statutVisu(t.statut);
            const meta = truieMeta(t, today);
            const q = searchText.trim();
            const highlightBoucle =
              isBoucleLikeQuery(q) && boucleMatches(t.boucle, q);
            const boucleClass = highlightBoucle ? 'text-accent' : 'text-text-1';
            return (
              <li key={t.id} role="listitem">
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => navigate(`/troupeau/truies/${encodeURIComponent(t.id)}`)}
                  ariaLabel={`Truie ${t.displayId || t.id}${t.boucle ? ` boucle ${t.boucle}` : ''} · ${v.label}`}
                  className="!flex !flex-col !items-center !gap-1.5 !rounded-xl !bg-bg-1 !border !border-border !p-3 !aspect-square !justify-between !h-auto"
                  style={{ textTransform: 'none' }}
                >
                  <TruieIcon size={30} aria-hidden="true" />
                  <div className="text-[14px] font-semibold text-text-0 tabular-nums">
                    {t.displayId || t.id}
                  </div>
                  <Tag variant={chipToneToTagVariant(v.tone)}>{v.label}</Tag>
                  {t.boucle ? (
                    <div
                      className={`ft-code text-[18px] font-semibold tabular-nums leading-none ${boucleClass}`}
                      aria-label={`Boucle ${t.boucle}`}
                    >
                      {t.boucle}
                    </div>
                  ) : (
                    <div className="ft-code text-[18px] text-text-2 leading-none" aria-hidden="true">
                      —
                    </div>
                  )}
                  <div className="text-[10px] text-text-2 truncate w-full text-center">
                    {meta}
                  </div>
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul
          role="list"
          aria-label="Liste des truies"
          className="card-dense !p-0 overflow-hidden"
        >
          {filtered.map((t) => {
            const v = statutVisu(t.statut);
            const meta = truieMeta(t, today);
            const q = searchText.trim();
            const highlightBoucle =
              isBoucleLikeQuery(q) && boucleMatches(t.boucle, q);
            const boucleClass = highlightBoucle ? 'text-accent' : 'text-text-1';
            const idLabel = t.displayId || t.id;
            const primaryNode = t.nom ? `${idLabel} · ${t.nom}` : idLabel;
            const secondaryNode = (
              <span className="inline-flex items-baseline gap-1.5 flex-wrap">
                {t.boucle ? (
                  <span
                    className={`ft-code tabular-nums ${boucleClass}`}
                    aria-label={`Boucle ${t.boucle}`}
                  >
                    {t.boucle}
                  </span>
                ) : null}
                {t.boucle ? (
                  <span aria-hidden="true" className="text-text-2">·</span>
                ) : null}
                <span>{meta}</span>
              </span>
            );
            return (
              <IonItemSliding key={t.id}>
                <li role="listitem">
                  <AnimalListItem
                    avatar={<TruieIcon size={22} aria-hidden="true" />}
                    primary={primaryNode}
                    secondary={secondaryNode}
                    chip={{ label: v.label, tone: v.tone }}
                    ariaLabel={`Truie ${idLabel}${t.boucle ? ` boucle ${t.boucle}` : ''} · ${v.label}`}
                    onClick={() =>
                      navigate(`/troupeau/truies/${encodeURIComponent(t.id)}`)
                    }
                  />
                </li>
                <IonItemOptions side="end">
                  <IonItemOption
                    color="warning"
                    aria-label={`Enregistrer une saillie pour ${idLabel}`}
                    onClick={() => handleSaillir(t)}
                  >
                    <div className="flex flex-col items-center gap-1 px-2">
                      <Heart size={18} aria-hidden="true" />
                      <span className="text-[10px] uppercase tracking-wide">Saillir</span>
                    </div>
                  </IonItemOption>
                  <IonItemOption
                    color="danger"
                    aria-label={`Enregistrer un soin pour ${idLabel}`}
                    onClick={() => handleSoigner(t)}
                  >
                    <div className="flex flex-col items-center gap-1 px-2">
                      <Syringe size={18} aria-hidden="true" />
                      <span className="text-[10px] uppercase tracking-wide">Soigner</span>
                    </div>
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            );
          })}
        </ul>
      )}

      <QuickAddTruieForm isOpen={addOpen} onClose={() => setAddOpen(false)} />
      <QuickSaillieForm isOpen={saillieOpen} onClose={() => setSaillieOpen(false)} />
    </div>
  );
};

// V41 : ViewModeToggle local supprimé — remplacé par <Segment> du DS V2 (uniformité).

export default TroupeauTruiesView;
