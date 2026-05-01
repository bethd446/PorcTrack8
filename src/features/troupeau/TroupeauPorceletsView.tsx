import React, { useMemo } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFarm } from '../../context/FarmContext';
import { Chip, SectionDivider } from '../../components/agritech';
import { BandeIcon } from '../../components/icons';
import { FARM_CONFIG } from '../../config/farm';
import { Bandes } from '../../services/bandAnalysisEngine';
import type { BandePorcelets } from '../../types/farm';
import { usePhaseTransitions } from '../../hooks/usePhaseTransitions';
import PhaseTransitionModal from '../../components/modals/PhaseTransitionModal';
import type { PendingTransition } from '../../services/phaseEngine';

interface TroupeauPorceletsViewProps {
  searchText: string;
  setSearchText: (val: string) => void;
}

const TroupeauPorceletsView: React.FC<TroupeauPorceletsViewProps> = ({ searchText, setSearchText }) => {
  const navigate = useNavigate();
  const { bandes } = useFarm();
  const today = useMemo(() => new Date(), []);

  const { pending, confirm } = usePhaseTransitions();
  const [manualTarget, setManualTarget] = React.useState<PendingTransition | null>(null);

  const realBandes = useMemo(() => Bandes.filterReal(bandes), [bandes]);

  const filteredBandes = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return realBandes;
    return realBandes.filter(b => {
      const haystack = [b.idPortee, b.id, b.truie, b.boucleMere, b.statut]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [realBandes, searchText]);

  const smCountTotal = useMemo(() => Bandes.countSm(realBandes), [realBandes]);

  const postSevragePorcelets = useMemo(
    () => FARM_CONFIG.POST_SEVRAGE_LOGES_REPARTITION.reduce((s, l) => s + l.porcelets, 0),
    [],
  );

  const totalPorceletsCalculated = useMemo(
    () => realBandes.reduce((acc, b) => acc + (b.vivants ?? 0), 0),
    [realBandes],
  );

  // Group by phase using central engine
  const groups = useMemo(() => {
    const res = {
      SOUS_MERE: [] as BandePorcelets[],
      POST_SEVRAGE: [] as BandePorcelets[],
      CROISSANCE: [] as BandePorcelets[],
      ENGRAISSEMENT: [] as BandePorcelets[],
      FINITION: [] as BandePorcelets[],
    };
    for (const b of filteredBandes) {
      const phase = Bandes.computePhase(b, today);
      if (phase !== 'INCONNU') {
        res[phase].push(b);
      }
    }
    return res;
  }, [filteredBandes, today]);

  const hasAnyActive = realBandes.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary strip */}
      <div className="flex items-stretch justify-between gap-3 card-dense py-3" role="region" aria-label="Résumé porcelets">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="kpi-label">Total en stock</span>
          <span className="font-mono tabular-nums text-[15px] font-bold text-text-0">
            {totalPorceletsCalculated} <span className="text-text-2 font-medium">porcs</span>
          </span>
        </div>
        <div className="h-8 w-px bg-border shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="kpi-label">Maternité</span>
          <span className="font-mono tabular-nums text-[15px] font-bold text-text-0">{smCountTotal.porcelets}</span>
        </div>
        <div className="h-8 w-px bg-border shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="kpi-label">Sevrés</span>
          <span className="font-mono tabular-nums text-[15px] font-bold text-text-0">
            {totalPorceletsCalculated - smCountTotal.porcelets}
          </span>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative">
        <input
          type="search"
          placeholder="Portée, Truie, Boucle…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-bg-2 border border-border font-mono text-[13px] text-text-0 placeholder:text-text-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        />
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none" />
      </div>

      {!hasAnyActive ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <BandeIcon size={48} className="text-text-2" />
          <p className="text-[14px] font-medium text-text-1">Aucune bande en cours</p>
        </div>
      ) : (
        <>
          {/* Section Sous mère */}
          {(groups.SOUS_MERE.length > 0 || !searchText) && (
            <section role="region" aria-label="Bandes sous mère">
              <SectionDivider label={`Sous mère · ${groups.SOUS_MERE.length}`} />
              {groups.SOUS_MERE.length === 0 ? (
                <p className="px-1 font-mono text-[11px] text-text-2">Aucun résultat.</p>
              ) : (
                <ul className="card-dense !p-0 overflow-hidden">
                  {groups.SOUS_MERE.map(b => (
                    <BandeRow
                      key={b.id}
                      bande={b}
                      phase="Maternité"
                      tone="gold"
                      onClick={() => navigate(`/troupeau/bandes/${b.id}`)}
                      pendingTransition={pending.find(p => p.bandeId === b.id)}
                      onTransition={setManualTarget}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Section Post-sevrage */}
          {(groups.POST_SEVRAGE.length > 0 || !searchText) && (
            <section role="region" aria-label="Bandes en post-sevrage">
              <SectionDivider label={`Post-sevrage · ${groups.POST_SEVRAGE.length}`} />
              {groups.POST_SEVRAGE.length === 0 ? (
                <p className="px-1 font-mono text-[11px] text-text-2">Aucun résultat.</p>
              ) : (
                <ul className="card-dense !p-0 overflow-hidden">
                  {groups.POST_SEVRAGE.map(b => (
                    <BandeRow
                      key={b.id}
                      bande={b}
                      phase="Post-sevrage"
                      tone="teal"
                      onClick={() => navigate(`/troupeau/bandes/${b.id}`)}
                      pendingTransition={pending.find(p => p.bandeId === b.id)}
                      onTransition={setManualTarget}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Section Croissance */}
          {groups.CROISSANCE.length > 0 && (
            <section role="region" aria-label="Bandes en croissance">
              <SectionDivider label={`Croissance · ${groups.CROISSANCE.length}`} />
              <ul className="card-dense !p-0 overflow-hidden">
                {groups.CROISSANCE.map(b => (
                  <BandeRow
                    key={b.id}
                    bande={b}
                    phase="Croissance"
                    tone="amber"
                    onClick={() => navigate(`/troupeau/bandes/${b.id}`)}
                    pendingTransition={pending.find(p => p.bandeId === b.id)}
                    onTransition={setManualTarget}
                  />
                ))}
              </ul>
            </section>
          )}

          {/* Section Engraissement */}
          {groups.ENGRAISSEMENT.length > 0 && (
            <section role="region" aria-label="Bandes en engraissement">
              <SectionDivider label={`Engraissement · ${groups.ENGRAISSEMENT.length}`} />
              <ul className="card-dense !p-0 overflow-hidden">
                {groups.ENGRAISSEMENT.map(b => (
                  <BandeRow
                    key={b.id}
                    bande={b}
                    phase="Engraissement"
                    tone="accent"
                    onClick={() => navigate(`/troupeau/bandes/${b.id}`)}
                    pendingTransition={pending.find(p => p.bandeId === b.id)}
                    onTransition={setManualTarget}
                  />
                ))}
              </ul>
            </section>
          )}

          {/* Section Finition */}
          {groups.FINITION.length > 0 && (
            <section role="region" aria-label="Bandes en finition">
              <SectionDivider label={`Finition · ${groups.FINITION.length}`} />
              <ul className="card-dense !p-0 overflow-hidden">
                {groups.FINITION.map(b => (
                  <BandeRow
                    key={b.id}
                    bande={b}
                    phase="Finition"
                    tone="blue"
                    onClick={() => navigate(`/troupeau/bandes/${b.id}`)}
                    pendingTransition={pending.find(p => p.bandeId === b.id)}
                    onTransition={setManualTarget}
                  />
                ))}
              </ul>
            </section>
          )}

          {!searchText && (
            <section role="region" aria-label="Loges post-sevrage">
              <SectionDivider label={`Loges PS · ${postSevragePorcelets} têtes`} />
              <div className="grid grid-cols-2 gap-2">
                {FARM_CONFIG.POST_SEVRAGE_LOGES_REPARTITION.map(loge => {
                  const pct = Math.min(100, Math.round((loge.porcelets / 30) * 100));
                  return (
                    <div key={loge.id} className="card-dense p-2.5 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase text-text-2">{loge.id}</span>
                        <span className="font-mono text-[11px] font-bold text-text-0">{loge.porcelets}</span>
                      </div>
                      <div className="h-1 w-full bg-bg-2 rounded-full overflow-hidden">
                        <div className="h-full bg-teal" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
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
    </div>
  );
};

// ─── Sous-composant BandeRow ───────────────────────────────────────────────

interface BandeRowProps {
  bande: BandePorcelets;
  phase: string;
  tone: import('../../components/agritech').ChipTone;
  onClick: () => void;
  pendingTransition?: PendingTransition;
  onTransition?: (t: PendingTransition) => void;
}

const BandeRow: React.FC<BandeRowProps> = ({
  bande, phase, tone, onClick, pendingTransition, onTransition,
}) => {
  const primary = bande.idPortee || bande.id;

  return (
    <li className="border-b border-border last:border-b-0">
      <div className="flex items-center w-full">
        <button
          type="button"
          onClick={onClick}
          className="pressable flex-1 text-left flex items-center gap-3 px-3 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          <div className="w-9 h-9 rounded-lg bg-bg-2 flex items-center justify-center text-text-1 shrink-0">
            <BandeIcon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-[14px] font-semibold text-text-0 tabular-nums">{primary}</span>
              <span className="text-[11px] text-text-2 font-mono truncate">{bande.vivants ?? 0} vivants</span>
            </div>
            <div className="font-mono text-[10px] text-text-2 mt-0.5 truncate">
              {bande.boucleMere ? `Mère ${bande.boucleMere} · ` : ''}
              {bande.statut}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Chip label={phase} tone={tone} size="xs" className="!normal-case" />
            <ChevronRight size={14} className="text-text-2" />
          </div>
        </button>

        {pendingTransition && onTransition && (
          <div className="pr-3">
            <button
              type="button"
              aria-label={`Confirmer transfert ${pendingTransition.label}`}
              onClick={(e) => {
                e.stopPropagation();
                onTransition(pendingTransition);
              }}
              className="pressable px-2 py-2 rounded-md bg-amber/15 text-amber font-mono text-[10px] font-bold uppercase tracking-wide border border-amber/20"
            >
              Transfert →
            </button>
          </div>
        )}
      </div>
    </li>
  );
};

export default TroupeauPorceletsView;
