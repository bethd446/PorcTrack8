import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Plus, Search } from 'lucide-react';

import { VerratIcon } from '../../components/icons';
import { EntityAvatar } from '../../components/ds/EntityAvatar';
import {
  AnimalListItem,
  SectionDivider,
  type ChipTone,
} from '../../components/agritech';
import { Button } from '@/design-system';
import EmptyState from '../../components/design/EmptyState';
import ListingSkeleton from '../../components/design/ListingSkeleton';
import QuickAddVerratForm from '../../components/forms/QuickAddVerratForm';
import QuickSaillieForm from '../../components/forms/QuickSaillieForm';
import { useFarm, useMeta } from '../../context/FarmContext';
import { useListingLoadingGuard } from '../../hooks/useListingLoadingGuard';
import type { Verrat, Saillie } from '../../types/farm';

// ─── Helpers ────────────────────────────────────────────────────────────────

function normaliseVerratStatut(statut: string | undefined): 'ACTIF' | 'REFORME' | 'INCONNU' {
  if (!statut) return 'INCONNU';
  if (/r[ée]form/i.test(statut)) return 'REFORME';
  if (/actif/i.test(statut)) return 'ACTIF';
  return 'INCONNU';
}

function statutTone(statut: string | undefined): ChipTone {
  switch (normaliseVerratStatut(statut)) {
    case 'ACTIF':   return 'accent';
    case 'REFORME': return 'red';
    default:        return 'default';
  }
}

function parseSaillieDate(s: string | undefined): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) {
    const d = new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = Date.parse(s);
  if (Number.isNaN(iso)) return null;
  return new Date(iso);
}

function formatDateFr(s: string | undefined): string {
  const d = parseSaillieDate(s);
  if (!d) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function countSailliesThisMonth(saillies: Saillie[], now: Date): number {
  const y = now.getFullYear();
  const m = now.getMonth();
  return saillies.reduce((n, s) => {
    const d = parseSaillieDate(s.dateSaillie);
    if (!d) return n;
    return d.getFullYear() === y && d.getMonth() === m ? n + 1 : n;
  }, 0);
}

interface TroupeauVerratsViewProps {
  searchText: string;
  setSearchText: (val: string) => void;
}

// ─── Composant ──────────────────────────────────────────────────────────────

const TroupeauVerratsView: React.FC<TroupeauVerratsViewProps> = ({ searchText, setSearchText }) => {
  const navigate = useNavigate();
  const { verrats, saillies } = useFarm();
  const { loading: farmLoading } = useMeta();
  const isInitialLoading = useListingLoadingGuard(farmLoading, verrats.length);
  const [sheetVerratId, setSheetVerratId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const now = useMemo(() => new Date(), []);

  const sailliesByVerrat = useMemo(() => {
    const idx = new Map<string, Saillie[]>();
    for (const s of saillies) {
      const key = s.verratId;
      if (!key) continue;
      const bucket = idx.get(key);
      if (bucket) bucket.push(s);
      else idx.set(key, [s]);
    }
    return idx;
  }, [saillies]);

  const totalSaillies = saillies.length;
  const sailliesCeMois = useMemo(() => countSailliesThisMonth(saillies, now), [saillies, now]);

  const filteredVerrats = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const base = verrats.filter((v) => {
      if (!q) return true;
      const haystack = [v.displayId, v.id, v.nom, v.boucle, v.origine]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    return [...base].sort((a, b) => {
      const aActif = normaliseVerratStatut(a.statut) === 'ACTIF' ? 0 : 1;
      const bActif = normaliseVerratStatut(b.statut) === 'ACTIF' ? 0 : 1;
      if (aActif !== bActif) return aActif - bActif;
      return a.displayId.localeCompare(b.displayId, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });
  }, [verrats, searchText]);

  const goToDetail = (v: Verrat): void => {
    navigate(`/troupeau/verrats/${v.displayId}`);
  };

  const openSaillieFor = (v: Verrat): void => {
    setSheetVerratId(v.displayId);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ── CTA primaire : ajouter un verrat ──────────────────── */}
      <div className="flex items-center justify-end">
        <Button
          variant="primary"
          onClick={() => setAddOpen(true)}
          ariaLabel="Ajouter un verrat"
        >
          <Plus size={15} aria-hidden="true" />
          Ajouter un verrat
        </Button>
      </div>

      {/* ── Summary strip ──────────────────────────────────────── */}
      <section
        role="region"
        aria-label="Résumé verrats"
        className="card-dense flex items-center justify-between gap-3 py-3"
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="kpi-label">Verrats</span>
          <span className="font-mono tabular-nums text-[15px] font-bold text-text-0">
            {verrats.length}
          </span>
        </div>
        <div className="h-8 w-px bg-border shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="kpi-label">Saillies totales</span>
          <span className="font-mono tabular-nums text-[15px] font-bold text-text-0">
            {totalSaillies}
          </span>
        </div>
        <div className="h-8 w-px bg-border shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="kpi-label">Ce mois</span>
          <span className="font-mono tabular-nums text-[15px] font-bold text-text-0">
            {sailliesCeMois}
          </span>
        </div>
      </section>

      {/* ── Recherche ───────────────────────────────────────────── */}
      <div className="relative">
        <input
          type="search"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="ID, nom, boucle, origine…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          aria-label="Rechercher un verrat"
          className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-bg-2 border border-border text-[13px] text-text-0 placeholder:text-text-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        />
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* ── Liste verrats ──────────────────────────────────────── */}
      {isInitialLoading ? (
        <ListingSkeleton count={3} />
      ) : verrats.length === 0 ? (
        <EmptyState
          icon={<VerratIcon size={32} />}
          title="Aucun verrat enregistré"
          description="Les verrats de la ferme apparaîtront ici dès qu'ils seront saisis dans la feuille VERRATS."
        />
      ) : (
        <section
          role="region"
          aria-label="Liste des verrats"
          className="flex flex-col gap-3"
        >
          <SectionDivider label={`Verrats · ${filteredVerrats.length}`} />

          {filteredVerrats.map((v) => {
            const vSaillies = sailliesByVerrat.get(v.displayId)
              ?? sailliesByVerrat.get(v.id)
              ?? [];
            const nbSaillies = vSaillies.length;
            const derniere = vSaillies
              .map((s) => parseSaillieDate(s.dateSaillie))
              .filter((d): d is Date => d !== null)
              .sort((a, b) => b.getTime() - a.getTime())[0];

            const statutLabel = v.statut || '—';
            const tone = statutTone(v.statut);
            const displayId = v.displayId || v.id;
            const nomPart = v.nom ? ` · ${v.nom}` : '';
            const title = `${displayId}${nomPart}`;

            return (
              <VerratCard
                key={v.id}
                title={title}
                displayId={displayId}
                photoUrl={v.photoUrl ?? null}
                statutLabel={statutLabel}
                statutTone={tone}
                boucle={v.boucle}
                origine={v.origine}
                ration={v.ration}
                alimentation={v.alimentation}
                nbSaillies={nbSaillies}
                derniereDate={derniere ? formatDateFr(
                  `${String(derniere.getDate()).padStart(2, '0')}/${String(derniere.getMonth() + 1).padStart(2, '0')}/${derniere.getFullYear()}`,
                ) : null}
                onCardClick={() => goToDetail(v)}
                onSaillieClick={() => openSaillieFor(v)}
              />
            );
          })}

          {filteredVerrats.length === 0 && (
            <p className="text-center py-8 text-[12px] text-text-2">
              Aucun verrat ne correspond à ta recherche.
            </p>
          )}
        </section>
      )}

      <QuickSaillieForm
        isOpen={sheetVerratId !== null}
        onClose={() => setSheetVerratId(null)}
      />

      <QuickAddVerratForm
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
      />
    </div>
  );
};

// ─── Sous-composants ────────────────────────────────────────────────────────

interface VerratCardProps {
  title: string;
  displayId: string;
  photoUrl?: string | null;
  statutLabel: string;
  statutTone: ChipTone;
  boucle?: string;
  origine?: string;
  ration?: number;
  alimentation?: string;
  nbSaillies: number;
  derniereDate: string | null;
  onCardClick: () => void;
  onSaillieClick: () => void;
}

const VerratCard: React.FC<VerratCardProps> = ({
  title,
  displayId,
  photoUrl,
  statutLabel,
  statutTone,
  boucle,
  origine,
  ration,
  alimentation,
  nbSaillies,
  derniereDate,
  onCardClick,
  onSaillieClick,
}) => {
  const meta1 = `Origine: ${origine || '—'}`;
  const meta2 = `Ration: ${typeof ration === 'number' && ration > 0 ? `${ration} kg/j` : '—'} · Alimentation: ${alimentation || '—'}`;
  const statsLabel = nbSaillies > 0
    ? `${nbSaillies} saillie${nbSaillies > 1 ? 's' : ''}${derniereDate ? ` · dernière ${derniereDate}` : ''}`
    : 'Aucune saillie enregistrée';

  const secondaryNode = (
    <span className="flex flex-col gap-0.5">
      {boucle ? (
        <span className="ft-code text-[12px] text-text-1 tabular-nums" aria-label={`Boucle ${boucle}`}>
          {boucle}
        </span>
      ) : null}
      <span>{meta1}</span>
      <span>{meta2}</span>
      <span className="text-text-1 tabular-nums">{statsLabel}</span>
    </span>
  );

  return (
    <div className="card-dense !p-0 overflow-hidden">
      <AnimalListItem
        avatar={<EntityAvatar species="verrat" photoUrl={photoUrl} size="md" shortCode={displayId} />}
        primary={title}
        secondary={secondaryNode}
        chip={{ label: statutLabel, tone: statutTone }}
        ariaLabel={`Voir le détail de ${displayId}${boucle ? ` boucle ${boucle}` : ''}`}
        onClick={onCardClick}
        className="!border-b-0"
      />
      <div className="px-4 pb-3 pt-0">
        <Button
          variant="secondary"
          fullWidth
          onClick={(e) => {
            e.stopPropagation();
            onSaillieClick();
          }}
          ariaLabel={`Saisir une saillie avec le verrat ${displayId}`}
          className="!rounded-md"
        >
          <Heart size={14} aria-hidden="true" />
          Saisir saillie avec ce verrat
        </Button>
      </div>
    </div>
  );
};

export default TroupeauVerratsView;
