import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFarm } from '../../context/FarmContext';
import { AnimalListItem, SectionDivider, type ChipTone } from '../../components/agritech';
import { BandeIcon } from '../../components/icons';
import { listLoges } from '../../services/supabaseWrites';
import { Bandes } from '../../services/bandAnalysisEngine';
import type { BandePorcelets, Loge } from '../../types/farm';
import { usePhaseTransitions } from '../../hooks/usePhaseTransitions';
import PhaseTransitionModal from '../../components/modals/PhaseTransitionModal';
import type { PendingTransition } from '../../services/phaseEngine';
import QuickAddBandeFromLogeForm from '../../components/forms/QuickAddBandeFromLogeForm';

/* ═════════════════════════════════════════════════════════════════════════
   TroupeauPorceletsView · Vue par LOGE (refonte V25)
   ─────────────────────────────────────────────────────────────────────────
   Aujourd'hui : 1 card par loge occupée par une bande de porcelets.
   Préfixe loge selon type : M-/PS-/C-/E-/F-.
   Sub-section "Loges vides" en bas.
   ═════════════════════════════════════════════════════════════════════════ */

interface TroupeauPorceletsViewProps {
  searchText: string;
  setSearchText: (val: string) => void;
}

/** Phase humaine + tone affichés sur la card. */
interface PhaseDisplay {
  label: 'Maternité' | 'Post-sevrage' | 'Croissance' | 'Engraissement' | 'Finition';
  tone: ChipTone;
}

const PHASE_DISPLAY: Record<
  ReturnType<typeof Bandes.computePhase>,
  PhaseDisplay | null
> = {
  SOUS_MERE: { label: 'Maternité', tone: 'gold' },
  POST_SEVRAGE: { label: 'Post-sevrage', tone: 'teal' },
  CROISSANCE: { label: 'Croissance', tone: 'amber' },
  ENGRAISSEMENT: { label: 'Engraissement', tone: 'accent' },
  FINITION: { label: 'Finition', tone: 'blue' },
  INCONNU: null,
};

/** Préfixe loge selon le type (M-/PS-/C-/E-/F-/G-/V-/I-/A-). */
export function logeNumeroPrefixed(loge: Pick<Loge, 'type' | 'numero'>): string {
  const map: Record<Loge['type'], string> = {
    MATERNITE: 'M',
    POST_SEVRAGE: 'PS',
    CROISSANCE: 'C',
    ENGRAISSEMENT: 'E',
    FINITION: 'F',
    GESTANTE: 'G',
    VERRAT: 'V',
    INFIRMERIE: 'I',
    AUTRE: 'A',
  };
  const prefix = map[loge.type];
  // Si le numero contient déjà un préfixe (ex: "M-01"), on n'en rajoute pas.
  if (/^[A-Z]{1,2}-/i.test(loge.numero)) return loge.numero;
  return `${prefix}-${loge.numero}`;
}

/** Calcule le nombre de jours écoulés depuis le sevrage (réel ou prévu). */
export function joursPostSevrage(
  bande: BandePorcelets,
  today: Date = new Date(),
): number | null {
  const ref = bande.dateSevrageReelle ?? bande.dateSevragePrevue;
  if (!ref) return null;
  // Accept ISO yyyy-MM-dd ou dd/MM/yyyy
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(ref)
    ? ref
    : /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(ref)
        ? ref.split('/').reverse().join('-')
        : null;
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const sevrage = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const diff = Math.floor((todayUtc.getTime() - sevrage.getTime()) / 86_400_000);
  return Number.isFinite(diff) ? diff : null;
}

/** Types de loges considérées comme "loges porcelets" pour la sub-section "vides". */
const LOGE_TYPES_PORCELETS: Loge['type'][] = [
  'MATERNITE',
  'POST_SEVRAGE',
  'CROISSANCE',
  'ENGRAISSEMENT',
  'FINITION',
];

interface OccupiedLoge {
  loge: Loge;
  bande: BandePorcelets;
  phase: PhaseDisplay | null;
  jPostSevrage: number | null;
}

const TroupeauPorceletsView: React.FC<TroupeauPorceletsViewProps> = ({
  searchText,
  setSearchText,
}) => {
  const navigate = useNavigate();
  const { bandes } = useFarm();
  const today = useMemo(() => new Date(), []);

  const { pending, confirm } = usePhaseTransitions();
  const [manualTarget, setManualTarget] = useState<PendingTransition | null>(null);

  const [loges, setLoges] = useState<Loge[]>([]);
  const [addBandeOpen, setAddBandeOpen] = useState(false);
  const [addBandePreselectLogeId, setAddBandePreselectLogeId] = useState<
    string | undefined
  >(undefined);

  const refreshLoges = useCallback(() => {
    let cancelled = false;
    listLoges()
      .then(rows => {
        if (cancelled) return;
        setLoges(rows.filter(l => l.active));
      })
      .catch(() => {
        if (!cancelled) setLoges([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return refreshLoges();
  }, [refreshLoges]);

  const openAddBande = useCallback((logeId?: string) => {
    setAddBandePreselectLogeId(logeId);
    setAddBandeOpen(true);
  }, []);

  const realBandes = useMemo(() => Bandes.filterReal(bandes), [bandes]);

  // Filtrage texte
  const filteredBandes = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return realBandes;
    return realBandes.filter(b => {
      const haystack = [b.idPortee, b.id, b.truie, b.boucleMere, b.statut, b.logeNumero]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [realBandes, searchText]);

  // Loges occupées par une bande active
  const occupiedLoges = useMemo<OccupiedLoge[]>(() => {
    const byLogeId = new Map<string, BandePorcelets>();
    for (const b of filteredBandes) {
      if (b.logeId) byLogeId.set(b.logeId, b);
    }
    const result: OccupiedLoge[] = [];
    for (const loge of loges) {
      const bande = byLogeId.get(loge.id);
      if (!bande) continue;
      const phaseKey = Bandes.computePhase(bande, today);
      result.push({
        loge,
        bande,
        phase: PHASE_DISPLAY[phaseKey],
        jPostSevrage: joursPostSevrage(bande, today),
      });
    }
    // Tri stable : par type puis numero
    result.sort((a, b) => {
      const ta = LOGE_TYPES_PORCELETS.indexOf(a.loge.type);
      const tb = LOGE_TYPES_PORCELETS.indexOf(b.loge.type);
      if (ta !== tb) return ta - tb;
      return a.loge.numero.localeCompare(b.loge.numero, 'fr', { numeric: true });
    });
    return result;
  }, [filteredBandes, loges, today]);

  // Loges vides (parmi les types porcelets)
  const emptyLoges = useMemo<Loge[]>(() => {
    const occupiedIds = new Set(occupiedLoges.map(o => o.loge.id));
    return loges
      .filter(l => LOGE_TYPES_PORCELETS.includes(l.type) && !occupiedIds.has(l.id))
      .sort((a, b) => {
        const ta = LOGE_TYPES_PORCELETS.indexOf(a.type);
        const tb = LOGE_TYPES_PORCELETS.indexOf(b.type);
        if (ta !== tb) return ta - tb;
        return a.numero.localeCompare(b.numero, 'fr', { numeric: true });
      });
  }, [loges, occupiedLoges]);

  // V36-A — BUG-4 : aligner totalTetes avec le badge tab (Hub).
  // Le badge tab compte les vivants sur TOUTES les realBandes (avec ou sans
  // logeId résolu). On somme donc les vivants sur la même base ici, plutôt
  // que de limiter à `occupiedLoges` — cela évite l'écart "tab 75 vs liste 65".
  // `nbBandes` reste sur les occupiedLoges (= nb de cards affichées).
  const totalTetes = useMemo(
    () => realBandes.reduce((acc, b) => acc + (b.vivants ?? 0), 0),
    [realBandes],
  );
  const nbBandes = occupiedLoges.length;

  const hasAnyActive = realBandes.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* CTA primaire — Nouvelle bande */}
      <button
        type="button"
        onClick={() => openAddBande()}
        aria-label="Créer une nouvelle bande dans une loge"
        data-testid="new-bande-cta"
        className="pressable inline-flex items-center justify-center gap-2 h-12 rounded-md bg-accent text-bg-0 text-[12px] font-bold uppercase tracking-wide hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        <Plus size={14} aria-hidden="true" />
        Nouvelle bande
      </button>

      {/* Summary strip */}
      <div
        className="flex items-stretch justify-between gap-3 card-dense py-3"
        role="region"
        aria-label="Résumé porcelets"
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="kpi-label">Bandes</span>
          <span className="font-mono tabular-nums text-[15px] font-bold text-text-0">
            {nbBandes}
          </span>
        </div>
        <div className="h-8 w-px bg-border shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="kpi-label">Têtes total</span>
          <span className="font-mono tabular-nums text-[15px] font-bold text-text-0">
            {totalTetes}
          </span>
        </div>
        <div className="h-8 w-px bg-border shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="kpi-label">Loges vides</span>
          <span className="font-mono tabular-nums text-[15px] font-bold text-text-0">
            {emptyLoges.length}
          </span>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative">
        <input
          type="search"
          placeholder="Loge, bande, truie, boucle…"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-bg-2 border border-border text-[13px] text-text-0 placeholder:text-text-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        />
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none"
        />
      </div>

      {!hasAnyActive ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <BandeIcon size={48} className="text-text-2" />
          <p className="text-[14px] font-medium text-text-1">Aucune bande en cours</p>
        </div>
      ) : (
        <>
          {/* Loges occupées */}
          <section role="region" aria-label="Loges occupées par une bande">
            <SectionDivider label={`Loges occupées · ${occupiedLoges.length}`} />
            {occupiedLoges.length === 0 ? (
              <p className="px-1 text-[11px] text-text-2">
                Aucune bande assignée à une loge structurée.
              </p>
            ) : (
              <ul className="card-dense !p-0 overflow-hidden">
                {occupiedLoges.map(o => (
                  <LogeBandeRow
                    key={o.loge.id}
                    occupied={o}
                    onClick={() => navigate(`/troupeau/bandes/${o.bande.id}`)}
                    pendingTransition={pending.find(p => p.bandeId === o.bande.id)}
                    onTransition={setManualTarget}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* Loges vides */}
          {!searchText && emptyLoges.length > 0 ? (
            <section role="region" aria-label="Loges vides">
              <SectionDivider label={`Loges vides · ${emptyLoges.length}`} />
              <ul className="card-dense !p-0 overflow-hidden" data-testid="empty-loges-list">
                {emptyLoges.map(loge => (
                  <li key={loge.id}>
                    <AnimalListItem
                      avatar={
                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-bg-2 text-text-2 ft-code text-[10px] font-bold">
                          {logeNumeroPrefixed(loge).split('-')[0]}
                        </div>
                      }
                      primary={logeNumeroPrefixed(loge)}
                      secondary={loge.batiment ?? loge.type.replace('_', '-').toLowerCase()}
                      meta="vide"
                      accessory={
                        <button
                          type="button"
                          aria-label={`Créer une bande dans ${loge.numero}`}
                          data-testid={`empty-loge-cta-${loge.id}`}
                          onClick={e => {
                            e.stopPropagation();
                            openAddBande(loge.id);
                          }}
                          className="pressable inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[10px] uppercase tracking-wide text-text-1 hover:border-accent hover:text-accent"
                        >
                          <Plus size={11} aria-hidden="true" />
                          Nouvelle bande
                        </button>
                      }
                      onClick={() => openAddBande(loge.id)}
                      ariaLabel={`Loge vide ${logeNumeroPrefixed(loge)}`}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <PhaseTransitionModal
        transition={manualTarget}
        isOpen={manualTarget !== null}
        onConfirm={async (t, poids) => {
          await confirm(t, poids);
          setManualTarget(null);
        }}
        onDismiss={() => setManualTarget(null)}
      />

      <QuickAddBandeFromLogeForm
        isOpen={addBandeOpen}
        onClose={() => setAddBandeOpen(false)}
        onSuccess={() => {
          refreshLoges();
        }}
        preselectedLogeId={addBandePreselectLogeId}
      />
    </div>
  );
};

// ─── Sous-composant LogeBandeRow ───────────────────────────────────────────

interface LogeBandeRowProps {
  occupied: OccupiedLoge;
  onClick: () => void;
  pendingTransition?: PendingTransition;
  onTransition?: (t: PendingTransition) => void;
}

const LogeBandeRow: React.FC<LogeBandeRowProps> = ({
  occupied,
  onClick,
  pendingTransition,
  onTransition,
}) => {
  const { loge, bande, phase, jPostSevrage } = occupied;
  const primary = logeNumeroPrefixed(loge);
  const bandeLabel = bande.idPortee || bande.id;
  const poids = bande.poidsMoyenKg;
  const secondaryParts: string[] = [bandeLabel];
  if (poids != null && poids > 0) secondaryParts.push(`${poids} kg/tête`);
  if (jPostSevrage != null && jPostSevrage >= 0 && phase?.label !== 'Maternité') {
    secondaryParts.push(`J+${jPostSevrage} post-sev`);
  }

  const transferAccessory = pendingTransition && onTransition ? (
    <button
      type="button"
      aria-label={`Confirmer transfert ${pendingTransition.label}`}
      onClick={e => {
        e.stopPropagation();
        onTransition(pendingTransition);
      }}
      className="pressable px-2 py-2 rounded-md bg-amber/15 text-amber text-[10px] font-bold uppercase tracking-wide border border-amber/20"
    >
      Transfert →
    </button>
  ) : (
    <ChevronRight size={14} className="text-text-2" />
  );

  return (
    <li>
      <AnimalListItem
        avatar={<BandeIcon size={20} aria-hidden="true" />}
        primary={primary}
        secondary={secondaryParts.join(' · ')}
        meta={`${bande.vivants ?? 0} vivants`}
        chip={phase ? { label: phase.label, tone: phase.tone } : undefined}
        accessory={transferAccessory}
        onClick={onClick}
        ariaLabel={`Loge ${primary}, bande ${bandeLabel}, ${bande.vivants ?? 0} vivants`}
      />
    </li>
  );
};

export default TroupeauPorceletsView;
