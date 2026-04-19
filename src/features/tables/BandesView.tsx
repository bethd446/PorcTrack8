import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IonPage, IonContent, IonSpinner,
  IonRefresher, IonRefresherContent, IonModal, IonSegment, IonSegmentButton, IonLabel,
  IonSelect, IonSelectOption
} from '@ionic/react';
import {
  AlertCircle, AlertTriangle, Search, Calendar, ChevronRight,
  TrendingUp, Activity, ClipboardList, Bug, ChevronDown,
  ChevronUp, Stethoscope, ChevronLeft, CheckCheck, X, CheckSquare
} from 'lucide-react';
import { readTableByKey, updateRowById, appendRow } from '../../services/googleSheets';
import TableRowEdit from './TableRowEdit';
import PhotoStrip from '../../components/PhotoStrip';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { Chip, SectionDivider } from '../../components/agritech';
import { BandeIcon } from '../../components/icons';
import QuickNoteForm from '../../components/forms/QuickNoteForm';
import QuickHealthForm from '../../components/forms/QuickHealthForm';
import QuickSexSeparationForm from '../../components/forms/QuickSexSeparationForm';
import BandeCroissanceCard from '../../components/bande/BandeCroissanceCard';
import { useFarm } from '../../context/FarmContext';
import { isDebugEnabled } from '../../config';

// Error Boundary locale pour le module Portées
interface BandesEBProps { children: React.ReactNode; onReset: () => void; }
interface BandesEBState { hasError: boolean; error: Error | null; }

class BandesErrorBoundary extends (React.Component as any) {
  constructor(props: BandesEBProps) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): BandesEBState { return { hasError: true, error }; }

  private handleReset = () => {
    (this as any).setState({ hasError: false, error: null });
    (this as any).props.onReset();
  };

  render() {
    if ((this as any).state.hasError) {
      return (
        <div className="agritech-root p-10 text-center space-y-6 flex flex-col items-center justify-center min-h-[60vh]">
          <AlertTriangle size={48} className="text-red mb-4" />
          <h2 className="agritech-heading text-xl uppercase">Erreur d'affichage</h2>
          <p className="font-mono text-[12px] text-text-2 leading-relaxed max-w-xs">
            {(this as any).state.error?.message || 'Une erreur critique est survenue dans le module Portées.'}
          </p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              onClick={this.handleReset}
              className="pressable w-full h-11 rounded-md bg-accent text-bg-0 font-mono text-[12px] uppercase tracking-wide transition-colors"
            >
              Rafraîchir
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="pressable w-full h-11 rounded-md bg-bg-1 border border-border text-text-1 font-mono text-[12px] uppercase tracking-wide transition-colors"
            >
              Retour Accueil
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const DebugPanel: React.FC<{meta: any, header: string[], rowsCount: number, error: any, bandeKey: string}> = ({ meta, header, rowsCount, error, bandeKey }) => {
    const [open, setOpen] = useState(false);
    if (!isDebugEnabled()) return null;
    return (
        <div className="mx-4 mb-4">
            <button
              onClick={() => setOpen(!open)}
              className="pressable w-full flex items-center justify-between bg-bg-1 text-accent border border-border px-3 py-2 rounded-md font-mono text-[11px] uppercase tracking-wide transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Bug size={14} />
                    <span>Debug Panel</span>
                </div>
                {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {open && (
                <div className="bg-bg-1 border border-t-0 border-border text-text-0 p-3 rounded-b-md font-mono text-[11px] space-y-1 overflow-x-auto">
                    <p><span className="text-accent">SHEET:</span> {meta?.sheetName || 'N/A'}</p>
                    <p><span className="text-accent">ID_HEADER:</span> {meta?.idHeader || 'N/A'}</p>
                    <p><span className="text-accent">PORTEE_KEY:</span> {bandeKey || 'N/A'}</p>
                    <p><span className="text-accent">ROWS:</span> {rowsCount}</p>
                    <p><span className="text-accent">HEADER:</span> {header.join(', ')}</p>
                    {error && <p className="text-red font-semibold"><span className="text-accent">ERROR:</span> {error}</p>}
                </div>
            )}
        </div>
    );
};

// ──────────────────────────────────────────────────────────────────────────
// Status tone mapping — for borders + chips
// ──────────────────────────────────────────────────────────────────────────
type StatusTone = 'gold' | 'accent' | 'default';
function statusTone(status: string | null | undefined): StatusTone {
  if (!status) return 'default';
  const s = String(status).toUpperCase();
  if (s.includes('RECAP')) return 'default';
  if (s.includes('SEVR')) return 'accent';
  if (s.includes('SOUS')) return 'gold';
  return 'default';
}

function statusBorderClass(status: string | null | undefined, hasAlert: boolean): string {
  if (hasAlert) return 'border-l-red';
  const tone = statusTone(status);
  if (tone === 'gold') return 'border-l-[#D4A056]';
  if (tone === 'accent') return 'border-l-accent';
  return 'border-l-border';
}

// ──────────────────────────────────────────────────────────────────────────
// FilterChip — extracted at module scope to keep its reference stable
// across BandesView renders (fix react-hooks/static-components).
// ──────────────────────────────────────────────────────────────────────────
interface FilterChipProps {
  active: boolean;
  label: string;
  onClick: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ active, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`pressable h-8 px-3 rounded-md font-mono text-[11px] uppercase tracking-wide transition-colors ${
      active
        ? 'bg-accent text-bg-0 border border-accent'
        : 'bg-bg-1 text-text-1 border border-border hover:bg-bg-2'
    }`}
  >
    {label}
  </button>
);

const BandesView: React.FC = () => {
  const { bandeId: urlBandeId } = useParams<{ bandeId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [header, setHeader] = useState<string[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [showSexSeparation, setShowSexSeparation] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SOUS' | 'SEVRES'>('ALL');

  const [bandeKey, setBandeKey] = useState<string>("ID Portée");

  const tableKey = 'PORCELETS_BANDES_DETAIL';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await readTableByKey(tableKey);

      if (result.success) {
        setHeader(result.header || []);
        setRows(result.rows || []);
        setMeta(result.meta || null);
      } else {
        setError(result.message || 'Impossible de charger les portées');
      }
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Legitimate I/O: async fetch of bandes + related tables
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const bandeIdIndex = useMemo(() => {
      if (!bandeKey || header.length === 0) return -1;
      // Normalisation pour robustesse
      return header.findIndex(h => h.trim().toUpperCase() === bandeKey.toUpperCase());
  }, [header, bandeKey]);

  const aggregatedBandes = useMemo(() => {
      if (rows.length === 0 || bandeIdIndex === -1) return [];
      const groups: Record<string, any[]> = {};

      rows.forEach(row => {
          const id = String(row[bandeIdIndex] || '').trim();
          if (!id) return;
          if (!groups[id]) groups[id] = [];
          groups[id].push(row);
      });

      return Object.entries(groups).map(([id, rows]) => {
          const findVal = (names: string[]) => {
              const idx = header.findIndex(h => names.some(n => h.toUpperCase().includes(n.toUpperCase())));
              return idx !== -1 ? rows[0][idx] : null;
          };

          const dateMB = findVal(['DATE MB', 'DATE_MB']);
          const dateSevragePrevue = findVal(['DATE SEVRAGE PRÉVUE', 'SEVRAGE_PREVUE']);
          const dateSevrageReelle = findVal(['DATE SEVRAGE RÉELLE', 'SEVRAGE_REELLE']);
          const morts = parseInt(String(findVal(['MORTS']) || '0'));

          // Calcul alertes
          let hasAlert = morts > 0;
          if (dateSevragePrevue && !dateSevrageReelle) {
              let dS = new Date(dateSevragePrevue);
              if (isNaN(dS.getTime())) {
                  const parts = String(dateSevragePrevue).split(/[/-]/);
                  if (parts.length === 3) {
                      if (parts[0].length === 4) dS = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
                      else dS = new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
                  }
              }
              if (!isNaN(dS.getTime()) && dS.getTime() < new Date().getTime()) {
                  hasAlert = true;
              }
          }

          // Calcul âge
          let age = null;
          if (dateMB) {
              // Tentative de parse robuste (ISO ou FR)
              let d = new Date(dateMB);
              if (isNaN(d.getTime())) {
                  const parts = String(dateMB).split(/[/-]/);
                  if (parts.length === 3) {
                      if (parts[0].length === 4) d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
                      else d = new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
                  }
              }

              if (!isNaN(d.getTime())) {
                  const diff = new Date().getTime() - d.getTime();
                  age = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
              }
          }

          return {
              id,
              count: rows.length,
              truie: findVal(['TRUIE']),
              boucleMere: findVal(['BOUCLE MÈRE', 'BOUCLE_MERE']),
              dateMB: dateMB,
              age,
              nv: findVal(['NV']),
              morts,
              vivants: findVal(['VIVANTS']),
              status: findVal(['STATUT']),
              hasAlert,
              rows
          };
      }).filter(b => {
          // Text search
          const txt = searchText.toLowerCase();
          const matchesText =
              b.id.toLowerCase().includes(txt) ||
              (b.truie && String(b.truie).toLowerCase().includes(txt)) ||
              (b.boucleMere && String(b.boucleMere).toLowerCase().includes(txt));
          if (!matchesText) return false;
          // Status filter
          if (statusFilter === 'ALL') return true;
          const s = String(b.status || '').toUpperCase();
          if (statusFilter === 'SEVRES') return s.includes('SEVR');
          if (statusFilter === 'SOUS') return s.includes('SOUS') || (!s.includes('SEVR') && !s.includes('RECAP'));
          return true;
      });
  }, [rows, bandeIdIndex, header, searchText, statusFilter]);

  const selectedBandeId = urlBandeId || null;

  const selectedBandeData = useMemo(() => {
      return aggregatedBandes.find(b => b.id === selectedBandeId);
  }, [aggregatedBandes, selectedBandeId]);

  const toggleSelection = (id: string) => {
      setSelectedIds(prev =>
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
  };

  const handleOpenBande = (id: string) => {
      if (selectionMode) {
          toggleSelection(id);
          return;
      }
      navigate(`/bandes/${encodeURIComponent(id)}`);
  };

  const handleCloseBande = () => {
      navigate('/bandes');
  };

  const selectedBandesDataList = useMemo(() => {
      return aggregatedBandes.filter(b => selectedIds.includes(b.id));
  }, [aggregatedBandes, selectedIds]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout withNav={false}>
          <IonRefresher slot="fixed" onIonRefresh={(e) => loadData().then(() => e.detail.complete())}>
            <IonRefresherContent />
          </IonRefresher>

          <AgritechHeader
            title="Portées"
            subtitle={selectionMode ? `${selectedIds.length} sélectionné(s)` : "Suivi porcelets"}
            action={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSexSeparation(true)}
                  className="pressable inline-flex h-9 px-3 items-center justify-center rounded-md transition-colors bg-bg-2 text-text-1 hover:bg-bg-1 font-mono text-[11px] uppercase tracking-wide"
                  aria-label="Séparation par sexe"
                >
                  ♂ / ♀
                </button>
                <button
                  type="button"
                  onClick={() => {
                      setSelectionMode(!selectionMode);
                      setSelectedIds([]);
                  }}
                  className={`pressable inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                      selectionMode
                          ? 'bg-red text-bg-0'
                          : 'bg-bg-2 text-text-1 hover:bg-bg-1'
                  }`}
                  aria-label={selectionMode ? "Annuler la sélection" : "Mode sélection"}
                >
                    {selectionMode ? <X size={18} /> : <CheckSquare size={18} />}
                </button>
              </div>
            }
          >
              {/* Search */}
              <div className="flex items-center gap-2 bg-bg-1 border border-border rounded-md px-3 h-10">
                 <Search size={16} className="text-text-2 shrink-0" />
                 <input
                    className="bg-transparent border-none text-text-0 placeholder-text-2 text-sm w-full outline-none font-mono"
                    placeholder="Rechercher une portée, truie, boucle..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    aria-label="Rechercher une portée"
                 />
                 {searchText && (
                   <button
                     type="button"
                     onClick={() => setSearchText('')}
                     className="pressable text-text-2 hover:text-text-1 transition-colors"
                     aria-label="Effacer la recherche"
                   >
                     <X size={14} />
                   </button>
                 )}
              </div>

              {/* Filters */}
              <div className="flex gap-2 mt-3">
                <FilterChip active={statusFilter === 'ALL'} label="Toutes" onClick={() => setStatusFilter('ALL')} />
                <FilterChip active={statusFilter === 'SOUS'} label="Sous mère" onClick={() => setStatusFilter('SOUS')} />
                <FilterChip active={statusFilter === 'SEVRES'} label="Sevrés" onClick={() => setStatusFilter('SEVRES')} />
              </div>
          </AgritechHeader>

        <BandesErrorBoundary onReset={loadData}>
            <div className="pt-4 pb-32">
                <DebugPanel meta={meta} header={header} rowsCount={rows.length} error={error} bandeKey={bandeKey} />

                {loading && rows.length === 0 ? (
                    <div className="px-4 space-y-3">
                        {[0, 1, 2].map(i => (
                            <div
                                key={i}
                                className="card-dense animate-pulse"
                                style={{ opacity: 1 - i * 0.2 }}
                            >
                                <div className="h-4 bg-bg-2 rounded w-1/3 mb-2" />
                                <div className="h-3 bg-bg-2 rounded w-2/3" />
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="mx-4 card-dense border-l-2 border-l-red text-center py-10">
                        <AlertTriangle size={36} className="text-red mb-4 mx-auto" />
                        <h3 className="agritech-heading text-[14px] uppercase mb-2">Erreur flux</h3>
                        <p className="font-mono text-[11px] text-text-2 uppercase mb-6">{error}</p>
                        <button
                          onClick={loadData}
                          className="pressable h-11 px-6 rounded-md bg-accent text-bg-0 font-mono text-[12px] uppercase tracking-wide transition-colors"
                        >
                          Réessayer
                        </button>
                    </div>
                ) : header.length > 0 && bandeIdIndex === -1 ? (
                    <div className="mx-4 card-dense border-l-2 border-l-[#F4A261]">
                         <div className="flex items-center gap-3 mb-4 text-[#F4A261]">
                             <AlertCircle size={18} />
                             <h3 className="agritech-heading text-[13px] uppercase">Configuration requise</h3>
                         </div>
                         <p className="font-mono text-[11px] text-text-2 leading-relaxed mb-4">
                             Impossible de détecter la colonne identifiant les portées. Veuillez la sélectionner.
                         </p>
                         <IonSelect
                            value={bandeKey}
                            placeholder="Choisir la colonne"
                            className="bg-bg-2 rounded-md mb-2"
                            onIonChange={e => {
                                const val = e.detail.value;
                                setBandeKey(val);
                                localStorage.setItem('porcTrack_bandeKey', val);
                            }}
                         >
                             {header.map(h => <IonSelectOption key={h} value={h}>{h}</IonSelectOption>)}
                         </IonSelect>
                    </div>
                ) : aggregatedBandes.length === 0 ? (
                    <div className="text-center mt-24 px-6 flex flex-col items-center gap-3">
                        <BandeIcon size={48} className="text-text-2" />
                        <p className="font-mono text-[12px] uppercase tracking-wide text-text-2">
                          {searchText || statusFilter !== 'ALL' ? 'Aucune portée ne correspond' : 'Aucune portée détectée'}
                        </p>
                    </div>
                ) : (
                    <div className="px-4">
                        <SectionDivider label={`${aggregatedBandes.length} portée${aggregatedBandes.length > 1 ? 's' : ''}`} />
                        <div className="space-y-2">
                            {aggregatedBandes.map((bande) => {
                              const isSelected = selectedIds.includes(bande.id);
                              const tone = statusTone(bande.status);
                              return (
                                <button
                                    key={bande.id}
                                    type="button"
                                    onClick={() => handleOpenBande(bande.id)}
                                    className={`card-dense pressable w-full text-left border-l-2 ${statusBorderClass(bande.status, bande.hasAlert)} transition-colors ${
                                        isSelected ? 'bg-bg-2 outline outline-2 outline-accent outline-offset-[-2px]' : ''
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                      {/* Selection circle */}
                                      {selectionMode && (
                                        <div
                                            className={`mt-1 shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                isSelected
                                                    ? 'bg-accent border-accent text-bg-0'
                                                    : 'border-border bg-bg-2'
                                            }`}
                                            aria-hidden="true"
                                        >
                                            {isSelected && <CheckCheck size={12} />}
                                        </div>
                                      )}

                                      <div className="min-w-0 flex-1">
                                          {/* Row 1: ID · Truie · Boucle */}
                                          <div className="flex items-center justify-between gap-2 mb-1">
                                              <div className="min-w-0 flex items-baseline gap-2 flex-wrap">
                                                  <span className="font-mono text-[14px] font-semibold text-text-0 tabular-nums">
                                                      {bande.id}
                                                  </span>
                                                  {bande.truie && (
                                                      <>
                                                          <span className="text-text-2" aria-hidden="true">·</span>
                                                          <span className="text-[13px] text-text-1 truncate">
                                                              {String(bande.truie)}
                                                          </span>
                                                      </>
                                                  )}
                                                  {bande.boucleMere && (
                                                      <span className="font-mono text-[11px] text-text-2">
                                                          ({String(bande.boucleMere)})
                                                      </span>
                                                  )}
                                              </div>
                                              {/* Status chip */}
                                              {bande.status && (
                                                  <Chip
                                                      label={String(bande.status)}
                                                      tone={tone === 'gold' ? 'gold' : tone === 'accent' ? 'accent' : 'default'}
                                                      size="xs"
                                                  />
                                              )}
                                          </div>

                                          {/* Row 2: Meta — date MB · NV · Vivants · Morts · Alert */}
                                          <div className="flex items-center gap-3 font-mono text-[11px] text-text-2 flex-wrap">
                                              {bande.dateMB && (
                                                  <span>MB&nbsp;{String(bande.dateMB)}</span>
                                              )}
                                              {bande.age !== null && (
                                                  <span className="text-accent">
                                                      {bande.age}j
                                                  </span>
                                              )}
                                              <span>
                                                  NV <span className="text-text-0 tabular-nums">{bande.nv || 0}</span>
                                              </span>
                                              <span>
                                                  Viv. <span className="text-text-0 tabular-nums">{bande.vivants || 0}</span>
                                              </span>
                                              {bande.morts > 0 && (
                                                  <span className="text-red">
                                                      † {bande.morts}
                                                  </span>
                                              )}
                                              {bande.hasAlert && !selectionMode && (
                                                  <span className="inline-flex items-center gap-1 text-red">
                                                      <AlertCircle size={11} />
                                                      Alerte
                                                  </span>
                                              )}
                                          </div>
                                      </div>

                                      {!selectionMode && (
                                        <ChevronRight size={16} className="shrink-0 text-text-2 mt-1" aria-hidden="true" />
                                      )}
                                    </div>
                                </button>
                              );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </BandesErrorBoundary>

        {selectionMode && selectedIds.length > 0 && (
            <div className="fixed bottom-6 left-4 right-4 z-[100] animate-in slide-in-from-bottom-10 duration-[160ms]">
                <button
                    type="button"
                    onClick={() => setShowBatchModal(true)}
                    className="pressable w-full h-14 rounded-md bg-accent text-bg-0 flex items-center justify-center gap-3 shadow-2xl shadow-black/40 transition-transform active:scale-[0.98]"
                >
                    <CheckCheck size={18} />
                    <span className="font-mono text-[12px] uppercase tracking-wide font-semibold">
                        Clôturer sevrage ({selectedIds.length})
                    </span>
                </button>
            </div>
        )}

        <IonModal
            isOpen={showBatchModal}
            onDidDismiss={() => setShowBatchModal(false)}
            className="premium-modal"
        >
            <BatchWeaningModal
                selectedBandes={selectedBandesDataList}
                onClose={() => setShowBatchModal(false)}
                onSuccess={() => {
                    setShowBatchModal(false);
                    setSelectionMode(false);
                    setSelectedIds([]);
                    loadData();
                }}
                meta={meta}
                header={header}
            />
        </IonModal>

        <IonModal
            isOpen={!!selectedBandeId}
            onDidDismiss={handleCloseBande}
            className="premium-modal"
        >
            <BandesErrorBoundary onReset={loadData}>
                {selectedBandeData ? (
                    <BandeDetailView
                        bande={selectedBandeData}
                        header={header}
                        meta={meta}
                        onClose={handleCloseBande}
                        onRefresh={loadData}
                    />
                ) : (
                    <div className="agritech-root p-10 text-center flex flex-col items-center justify-center min-h-[60vh] gap-4">
                        <AlertTriangle size={32} className="text-red" />
                        <p className="font-mono text-[12px] uppercase text-text-1">Portée introuvable</p>
                        <button
                          onClick={handleCloseBande}
                          className="pressable h-11 px-6 rounded-md bg-accent text-bg-0 font-mono text-[12px] uppercase tracking-wide"
                        >
                          Fermer
                        </button>
                    </div>
                )}
            </BandesErrorBoundary>
        </IonModal>
        </AgritechLayout>
      </IonContent>

      <QuickSexSeparationForm
        isOpen={showSexSeparation}
        onClose={() => setShowSexSeparation(false)}
        onSuccess={() => loadData()}
      />
    </IonPage>
  );
};

const CycleTimeline: React.FC<{ age: number | null, status: string }> = ({ age, status }) => {
    const phases = [
        { id: 'maternite', label: 'Maternité', min: 0, max: 21 },
        { id: 'sevrage', label: 'Sevrage', min: 21, max: 28 },
        { id: 'post-sevrage', label: 'Post-Sevrage', min: 28, max: 70 },
        { id: 'engraissement', label: 'Engraissement', min: 70, max: 180 }
    ];

    const currentPhaseIndex = status.toUpperCase().includes('SEVRÉ') ? 2 : phases.findIndex(p => age !== null && age >= p.min && age < p.max);
    const activeIndex = currentPhaseIndex === -1 ? (age && age > 180 ? 3 : 0) : currentPhaseIndex;

    return (
        <div className="card-dense">
            <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={14} className="text-accent" />
                <h4 className="kpi-label">Timeline du cycle</h4>
            </div>
            <div className="relative flex justify-between px-1">
                <div className="absolute top-3 left-3 right-3 h-px bg-border" />
                {phases.map((phase, idx) => {
                    const isCompleted = idx < activeIndex;
                    const isCurrent = idx === activeIndex;
                    return (
                        <div key={phase.id} className="relative z-10 flex flex-col items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-[160ms] ${
                                isCurrent
                                  ? 'bg-accent text-bg-0 ring-2 ring-accent/30'
                                  : isCompleted
                                    ? 'bg-accent-dim text-accent'
                                    : 'bg-bg-2 text-text-2 border border-border'
                            }`}>
                                {isCompleted || isCurrent ? <CheckCheck size={12} /> : <span className="w-1.5 h-1.5 rounded-full bg-text-2" />}
                            </div>
                            <span className={`font-mono text-[9px] uppercase tracking-wide text-center w-14 ${
                              isCurrent ? 'text-text-0' : 'text-text-2'
                            }`}>
                                {phase.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const BandeDetailView: React.FC<{
    bande: any,
    header: string[],
    meta: any,
    onClose: () => void,
    onRefresh: () => void
}> = ({ bande, header, meta, onClose, onRefresh }) => {
    const [tab, setTab] = useState('resumé');
    const [editRow, setEditRow] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [healthData, setHealthData] = useState<any[][]>([]);
    const [healthHeader, setHealthHeader] = useState<string[]>([]);
    const [notesData, setNotesData] = useState<any[][]>([]);
    const [notesHeader, setNotesHeader] = useState<string[]>([]);
    const { notes: notesAsNotes } = useFarm();

    const loadRelatedData = useCallback(async () => {
        setLoading(true);
        try {
            const [healthRes, notesRes] = await Promise.all([
                readTableByKey('JOURNAL_SANTE'),
                readTableByKey('NOTES_TERRAIN')
            ]);
            if (healthRes.success) {
                setHealthData(healthRes.rows);
                setHealthHeader(healthRes.header);
            }
            if (notesRes.success) {
                setNotesData(notesRes.rows);
                setNotesHeader(notesRes.header);
            }
        } catch (e) {
            console.error("Error loading related data", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Legitimate I/O: async fetch of health + notes related to bande
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadRelatedData();
    }, [loadRelatedData]);

    const filteredHealth = useMemo(() => {
        if (!bande.id || healthData.length === 0) return [];
        const typeIdx = healthHeader.findIndex(h => ['CIBLE_TYPE', 'SUJET_TYPE', 'TYPE'].includes(h.toUpperCase()));
        const idIdx = healthHeader.findIndex(h => ['CIBLE_ID', 'SUJET_ID', 'ID', 'BOUCLE'].includes(h.toUpperCase()));

        if (idIdx === -1) return [];

        return healthData.filter(r => {
            const rowId = String(r[idIdx]).trim().toUpperCase();
            const targetId = String(bande.id).trim().toUpperCase();
            const rowType = typeIdx !== -1 ? String(r[typeIdx]).trim().toUpperCase() : 'BANDE';
            return rowId === targetId && (rowType === 'BANDE' || typeIdx === -1);
        });
    }, [healthData, healthHeader, bande.id]);

    const filteredNotes = useMemo(() => {
        if (!bande.id || notesData.length === 0) return [];
        const typeIdx = notesHeader.findIndex(h => ['SUBJECTTYPE', 'TYPE_SUJET'].includes(h.toUpperCase()));
        const idIdx = notesHeader.findIndex(h => ['SUBJECTID', 'ID_SUJET'].includes(h.toUpperCase()));

        if (idIdx !== -1 && typeIdx !== -1) {
            return notesData.filter(r =>
                String(r[idIdx]).trim().toUpperCase() === String(bande.id).trim().toUpperCase() &&
                String(r[typeIdx]).trim().toUpperCase() === 'BANDE'
            );
        }
        return notesData.filter(r => r.some(cell => String(cell).trim().toUpperCase() === String(bande.id).trim().toUpperCase()));
    }, [notesData, notesHeader, bande.id]);

    return (
        <div className="agritech-root h-full flex flex-col">
            {/* Custom dark header */}
            <header className="bg-bg-0 border-b border-border px-4 pt-4 pb-3">
                <div className="flex items-center gap-3 mb-3">
                    <button
                      onClick={onClose}
                      className="pressable inline-flex h-9 w-9 items-center justify-center rounded-md bg-bg-2 text-text-1 transition-colors"
                      aria-label="Retour"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <h1 className="agritech-heading uppercase leading-none truncate" style={{ fontSize: 'clamp(20px, 5vw, 24px)' }}>
                            Portée {bande.id}
                        </h1>
                        <p className="mt-1 font-mono text-[11px] text-text-2 leading-none truncate">
                            {bande.status || 'Détails'} {bande.truie ? `· ${bande.truie}` : ''}
                        </p>
                    </div>
                </div>

                <IonSegment
                    value={tab}
                    onIonChange={e => setTab(e.detail.value as string)}
                    className="premium-segment bg-bg-1 border border-border rounded-md overflow-hidden"
                >
                    <IonSegmentButton value="resumé"><IonLabel className="text-[11px] font-mono uppercase tracking-wide">Résumé</IonLabel></IonSegmentButton>
                    <IonSegmentButton value="details"><IonLabel className="text-[11px] font-mono uppercase tracking-wide">Détails</IonLabel></IonSegmentButton>
                    <IonSegmentButton value="sante"><IonLabel className="text-[11px] font-mono uppercase tracking-wide">Santé</IonLabel></IonSegmentButton>
                    <IonSegmentButton value="notes"><IonLabel className="text-[11px] font-mono uppercase tracking-wide">Notes</IonLabel></IonSegmentButton>
                </IonSegment>
            </header>

            <IonContent className="ion-no-padding">
                <div className="agritech-root px-4 py-5">
                    {tab === 'resumé' && (
                        <div className="space-y-4 pb-32">
                            <PhotoStrip subjectType="BANDE" subjectId={bande.id} />

                            <CycleTimeline age={bande.age} status={bande.status || ''} />

                            <BandeCroissanceCard bande={bande} notes={notesAsNotes} />

                            <div className="grid grid-cols-2 gap-3">
                                <div className="card-dense">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp size={14} className="text-accent" />
                                        <span className="kpi-label">Performances</span>
                                    </div>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="font-mono text-[22px] font-semibold tabular-nums text-text-0">{bande.vivants || 0}</span>
                                        <span className="font-mono text-[11px] uppercase text-text-2">Vivants</span>
                                    </div>
                                </div>
                                <div className="card-dense">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Stethoscope size={14} className="text-red" />
                                        <span className="kpi-label">Alertes santé</span>
                                    </div>
                                    <span className={`font-mono text-[22px] font-semibold tabular-nums ${filteredHealth.length > 0 ? 'text-red' : 'text-text-0'}`}>
                                        {filteredHealth.length}
                                    </span>
                                </div>
                            </div>

                            <div className="card-dense space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Activity size={14} className="text-accent" />
                                    <h4 className="kpi-label">Informations générales</h4>
                                </div>
                                <div className="grid grid-cols-1 gap-0">
                                    {[
                                        { label: 'Truie', value: bande.truie },
                                        { label: 'Boucle mère', value: bande.boucleMere },
                                        { label: 'Date MB', value: bande.dateMB },
                                        { label: 'Nés vivants', value: bande.nv },
                                        { label: 'Morts', value: bande.morts },
                                        { label: 'Âge', value: bande.age ? `${bande.age} jours` : '—' },
                                        { label: 'Statut actuel', value: bande.status }
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center border-b border-border last:border-b-0 py-2">
                                            <span className="font-mono text-[11px] uppercase tracking-wide text-text-2">{item.label}</span>
                                            <span className="font-mono text-[12px] text-text-0">{String(item.value || '—')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <QuickHealthForm subjectType="BANDE" subjectId={bande.id} onSuccess={() => { onRefresh(); loadRelatedData(); }} />
                        </div>
                    )}

                    {tab === 'details' && (
                        <div className="space-y-3 pb-32">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="kpi-label">Registre complet</h3>
                                <Chip label={`${bande.rows.length} lignes`} tone="accent" size="xs" />
                            </div>
                            {bande.rows && bande.rows.length > 0 ? (
                                bande.rows.map((row: any[], i: number) => (
                                    <button
                                        type="button"
                                        key={i}
                                        onClick={() => setEditRow(row)}
                                        className="card-dense pressable w-full text-left flex items-center justify-between transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-md bg-bg-2 border border-border flex items-center justify-center text-text-2 font-mono text-[11px]">
                                                #{i+1}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-medium text-text-0">Ligne de registre</p>
                                                <p className="font-mono text-[10px] uppercase tracking-wide text-text-2 truncate">
                                                    {header && header.includes('DATE MB') ? String(row[header.indexOf('DATE MB')]) : 'ID: ' + bande.id}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="text-right">
                                                <p className="font-mono text-[11px] text-text-0">{String(row[header.indexOf('STATUT') || 0] || '—')}</p>
                                                <p className="font-mono text-[9px] uppercase tracking-wide text-text-2">Statut</p>
                                            </div>
                                            <ChevronRight size={14} className="text-text-2" />
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="card-dense text-center py-10">
                                    <AlertCircle size={32} className="text-text-2 mb-2 mx-auto opacity-50" />
                                    <p className="font-mono text-[11px] uppercase tracking-wide text-text-2">Aucune donnée brute</p>
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'sante' && (
                        <div className="space-y-4 pb-32">
                            <QuickHealthForm subjectType="BANDE" subjectId={bande.id} onSuccess={() => { onRefresh(); loadRelatedData(); }} />

                            <div className="flex items-center justify-between mb-1">
                                <h3 className="kpi-label">Journal santé portée</h3>
                            </div>

                            {loading ? (
                                <div className="text-center py-10">
                                    <IonSpinner name="bubbles" />
                                </div>
                            ) : filteredHealth.length === 0 ? (
                                <div className="card-dense text-center py-10">
                                    <Stethoscope size={32} className="text-text-2 mb-2 mx-auto opacity-50" />
                                    <p className="font-mono text-[11px] uppercase tracking-wide text-text-2">Aucun soin pour cette portée</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredHealth.map((row, i) => (
                                        <div key={i} className="card-dense border-l-2 border-l-red">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-mono text-[11px] uppercase tracking-wide text-text-2">
                                                  {String(row[healthHeader.findIndex(h => h.toUpperCase().includes('DATE')) || 0])}
                                                </span>
                                                <Chip
                                                    label={String(row[healthHeader.findIndex(h => h.toUpperCase().includes('TYPE')) || 1])}
                                                    tone="red"
                                                    size="xs"
                                                />
                                            </div>
                                            <p className="text-[13px] font-medium text-text-0 mb-1">
                                                {String(row[healthHeader.findIndex(h => h.toUpperCase().includes('SOIN') || h.toUpperCase().includes('TRAITEMENT')) || 2])}
                                            </p>
                                            <p className="font-mono text-[11px] text-text-2 leading-relaxed">
                                                {String(row[healthHeader.findIndex(h => h.toUpperCase().includes('OBS')) || 3])}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'notes' && (
                        <div className="space-y-4 pb-32">
                            <QuickNoteForm subjectType="BANDE" subjectId={bande.id} onSuccess={() => { onRefresh(); loadRelatedData(); }} />

                            <div className="flex items-center justify-between mb-1">
                                <h3 className="kpi-label">Journal de bord</h3>
                            </div>

                            {loading ? (
                                <div className="text-center py-10">
                                    <IonSpinner name="bubbles" />
                                </div>
                            ) : filteredNotes.length === 0 ? (
                                <div className="card-dense text-center py-10">
                                    <ClipboardList size={32} className="text-text-2 mb-2 mx-auto opacity-50" />
                                    <p className="font-mono text-[11px] uppercase tracking-wide text-text-2">Journal vide</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredNotes.map((row, i) => (
                                        <div key={i} className="card-dense border-l-2 border-l-accent">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-mono text-[11px] uppercase tracking-wide text-text-2">
                                                  {String(row[notesHeader.indexOf('DATE') || 0])}
                                                </span>
                                            </div>
                                            <p className="text-[13px] text-text-0 leading-relaxed italic">
                                                "{String(row[notesHeader.findIndex(h => h.toUpperCase().includes('NOTE') || h.toUpperCase().includes('TEXTE')) || 1])}"
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <PhotoStrip subjectType="BANDE" subjectId={bande.id} />
                        </div>
                    )}
                </div>

                <IonModal isOpen={!!editRow} onDidDismiss={() => setEditRow(null)} className="premium-modal">
                    {editRow && meta && (
                        <TableRowEdit
                            meta={meta}
                            header={header}
                            rowData={editRow}
                            onClose={() => setEditRow(null)}
                            onSaved={() => { setEditRow(null); onRefresh(); }}
                        />
                    )}
                </IonModal>
            </IonContent>
        </div>
    );
};

const BatchWeaningModal: React.FC<{
    selectedBandes: any[],
    onClose: () => void,
    onSuccess: () => void,
    meta: any,
    header: string[]
}> = ({ selectedBandes, onClose, onSuccess, meta, header }) => {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: selectedBandes.length, phase: '' });
    const [errors, setErrors] = useState<string[]>([]);

    const [dateSevrage, setDateSevrage] = useState(new Date().toISOString().split('T')[0]);
    const [poidsMoyen, setPoidsMoyen] = useState('');
    const [note, setNote] = useState('');
    const [pointHebdo, setPointHebdo] = useState(true);

    const handleConfirm = async () => {
        setLoading(true);
        setErrors([]);
        const totalSteps = selectedBandes.length + (pointHebdo ? 1 : 0);
        let currentStep = 0;

        try {
            // Détection dynamique de l'ID pour PORCELETS_BANDES
            // Si header[0] est "ID Portée", on utilise ça comme idHeader
            const effectiveIdHeader = (header[0] === "ID Portée" || header[0] === "ID_PORTEE") ? header[0] : meta.idHeader;

            // Load Truies meta for update
            setProgress({ current: 0, total: totalSteps, phase: 'Chargement référentiel Truies...' });
            const truiesRes = await readTableByKey('SUIVI_TRUIES_REPRODUCTION');
            const truiesMeta = truiesRes.success ? truiesRes.meta : null;
            const truiesHeader = truiesRes.success ? truiesRes.header : [];

            // 1. Update each selected bande
            for (const bande of selectedBandes) {
                currentStep++;
                setProgress({ current: currentStep, total: totalSteps, phase: `Sevrage lot ${bande.id}...` });

                try {
                    // Update every row associated with this bande ID
                    for (const row of bande.rows) {
                        const idIdx = header.findIndex(h => h.trim().toUpperCase() === effectiveIdHeader.toUpperCase() || h.trim().toUpperCase() === 'ID');
                        const idValue = idIdx !== -1 ? row[idIdx] : null;

                        if (idValue) {
                            const patch: any = {
                                'STATUT': 'SEVRÉ',
                                'DATE SEVRAGE RÉELLE': dateSevrage,
                            };
                            if (poidsMoyen) patch['POIDS_SEVRAGE_MOYEN'] = poidsMoyen;
                            if (note) patch['NOTES_SEVRAGE'] = note;

                            // On utilise updateRowById en direct pour avoir le feedback,
                            // mais on pourrait passer par la queue si on voulait du pur offline.
                            // Ici le "Batch" demande un succès visuel immédiat.
                            const res = await updateRowById(meta.sheetName, effectiveIdHeader, String(idValue), patch);
                            if (!res.success) throw new Error(res.message);
                        }
                    }

                    // 2. Update Truies (SUIVI_TRUIES_REPRODUCTION)
                    // Post-sevrage : la truie passe en "En attente saillie" (schéma 2026).
                    // La colonne Alimentation n'est plus modifiée ici — c'est un flux alimentaire
                    // géré séparément.
                    if (bande.boucleMere && truiesMeta) {
                        const tStatusIdx = truiesHeader.findIndex(h => h.toUpperCase().includes('STATUT'));
                        const tNoteIdx = truiesHeader.findIndex(h => h.toUpperCase().includes('NOTE') || h.toUpperCase().includes('OBSERVATION'));

                        const patch: Record<string, string> = {};
                        if (tStatusIdx !== -1) patch[truiesHeader[tStatusIdx]] = 'En attente saillie';

                        if (tNoteIdx !== -1) {
                            // On essaie de ne pas écraser les notes (logique complexe côté GAS normalement,
                            // mais ici on peut envoyer un préfixe)
                            patch[truiesHeader[tNoteIdx]] = `[SEVRAGE ${dateSevrage}] ${note}`.trim();
                        }

                        await updateRowById(truiesMeta.sheetName, truiesMeta.idHeader, bande.boucleMere, patch);
                    }
                } catch (err: any) {
                    setErrors(prev => [...prev, `Erreur sur ${bande.id}: ${err.message}`]);
                }
            }

            // 3. Generation auto du "Point Hebdo" dans NOTES_TERRAIN (TYPE="POINT_HEBDO_AUTO")
            if (pointHebdo) {
                currentStep++;
                setProgress({ current: currentStep, total: totalSteps, phase: 'Génération du Point Hebdo...' });

                const summary = `Sevrage groupé de ${selectedBandes.length} lots. Poids moy: ${poidsMoyen || '?'}kg. Notes: ${note || 'N/A'}`;

                // DATE, TYPE, SUBJECT_TYPE, SUBJECT_ID, NOTE, AUTHOR
                await appendRow('NOTES_TERRAIN', [
                    new Date().toLocaleDateString('fr-FR'),
                    'POINT_HEBDO_AUTO',
                    'BATCH',
                    'SEVRAGE',
                    summary,
                    localStorage.getItem('user_name') || 'Système'
                ]);
            }

            if (errors.length === 0) {
                onSuccess();
            }
        } catch (e: any) {
            setErrors(prev => [...prev, `Erreur critique: ${e.message}`]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="agritech-root h-full flex flex-col items-center justify-center p-10 space-y-6">
                <div className="relative">
                    <div className="w-28 h-28 rounded-full border-2 border-border border-t-accent animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-mono text-[18px] font-semibold text-accent tabular-nums">
                            {Math.round((progress.current / progress.total) * 100)}%
                        </span>
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h3 className="agritech-heading text-[14px] uppercase">Traitement en cours</h3>
                    <p className="font-mono text-[11px] uppercase tracking-wide text-text-2 animate-pulse">{progress.phase}</p>
                    <p className="font-mono text-[12px] text-accent tabular-nums">{progress.current} / {progress.total}</p>
                </div>
                {errors.length > 0 && (
                    <div className="w-full max-w-sm card-dense border-l-2 border-l-red max-h-40 overflow-y-auto">
                         {errors.map((err, i) => (
                           <p key={i} className="font-mono text-[11px] text-red mb-1">{err}</p>
                         ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="agritech-root h-full flex flex-col">
            {/* Header */}
            <header className="bg-bg-0 border-b border-border px-4 pt-4 pb-4">
                <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0 flex-1">
                        <h2 className="agritech-heading uppercase leading-none" style={{ fontSize: 'clamp(20px, 5vw, 24px)' }}>
                            Clôture sevrage
                        </h2>
                        <p className="mt-1 font-mono text-[11px] text-text-2 leading-none">
                            {selectedBandes.length} portée{selectedBandes.length > 1 ? 's' : ''} sélectionnée{selectedBandes.length > 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="pressable inline-flex h-9 w-9 items-center justify-center rounded-md bg-bg-2 text-text-1 transition-colors"
                      aria-label="Fermer"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="card-dense flex items-center gap-3 !py-3">
                    <div className="w-10 h-10 rounded-md bg-accent text-bg-0 flex items-center justify-center font-mono text-[16px] font-semibold tabular-nums">
                        {selectedBandes.length}
                    </div>
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-wide text-text-2">Lots prêts</p>
                        <p className="text-[12px] text-text-0 font-medium">Pour le sevrage</p>
                    </div>
                </div>
            </header>

            <IonContent className="ion-no-padding">
                <div className="agritech-root px-4 py-5 space-y-4">
                    {errors.length > 0 && (
                        <div className="card-dense border-l-2 border-l-red">
                             <h4 className="font-mono text-[11px] font-semibold uppercase tracking-wide text-red mb-2">
                               Erreurs lors de la dernière tentative
                             </h4>
                             {errors.map((err, i) => (
                               <p key={i} className="font-mono text-[11px] text-red mb-1">• {err}</p>
                             ))}
                        </div>
                    )}

                    <div className="card-dense space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                             <Calendar size={14} className="text-accent" />
                             <h4 className="kpi-label">Paramètres sevrage</h4>
                        </div>

                        <div>
                            <label className="block font-mono text-[11px] uppercase tracking-wide text-text-2 mb-2">
                              Date de sevrage
                            </label>
                            <input
                                type="date"
                                value={dateSevrage}
                                onChange={e => setDateSevrage(e.target.value)}
                                className="w-full bg-bg-2 border border-border rounded-md px-3 h-11 font-mono text-[13px] text-text-0 outline-none focus:border-accent transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block font-mono text-[11px] uppercase tracking-wide text-text-2 mb-2">
                              Poids moyen du lot (kg)
                            </label>
                            <input
                                type="number"
                                inputMode="numeric"
                                placeholder="Ex: 7.5"
                                value={poidsMoyen}
                                onChange={e => setPoidsMoyen(e.target.value)}
                                className="w-full bg-bg-2 border border-border rounded-md px-3 h-11 font-mono text-[13px] text-text-0 placeholder-text-2 outline-none focus:border-accent transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block font-mono text-[11px] uppercase tracking-wide text-text-2 mb-2">
                              Observations
                            </label>
                            <textarea
                                placeholder="Notes sur l'état des porcelets, homogénéité..."
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                className="w-full bg-bg-2 border border-border rounded-md px-3 py-3 text-[13px] text-text-0 placeholder-text-2 outline-none focus:border-accent transition-colors h-24 resize-none"
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setPointHebdo(!pointHebdo)}
                        className={`pressable card-dense w-full flex items-center justify-between transition-colors text-left ${
                          pointHebdo ? 'border-accent-dim' : ''
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${
                              pointHebdo ? 'bg-accent text-bg-0' : 'bg-bg-2 text-text-2 border border-border'
                            }`}>
                                <TrendingUp size={16} />
                            </div>
                            <div>
                                <h4 className={`font-mono text-[11px] uppercase tracking-wide ${pointHebdo ? 'text-text-0' : 'text-text-1'}`}>
                                  Rapport d'activité
                                </h4>
                                <p className="font-mono text-[10px] uppercase tracking-wide text-text-2">
                                  Générer Point Hebdo auto
                                </p>
                            </div>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          pointHebdo ? 'bg-accent border-accent text-bg-0' : 'border-border bg-bg-2'
                        }`}>
                            {pointHebdo && <CheckCheck size={12} />}
                        </div>
                    </button>
                </div>
            </IonContent>

            <div className="agritech-root px-4 py-4 bg-bg-0 border-t border-border space-y-2">
                <button
                    disabled={loading}
                    onClick={handleConfirm}
                    className="pressable w-full h-14 rounded-md bg-accent text-bg-0 flex items-center justify-center gap-3 transition-transform active:scale-[0.98]"
                >
                    <CheckCheck size={18} />
                    <span className="font-mono text-[12px] uppercase tracking-wide font-semibold">
                        Lancer le sevrage
                    </span>
                </button>
                <button
                    onClick={onClose}
                    className="pressable w-full h-11 rounded-md bg-bg-1 border border-border text-text-1 font-mono text-[11px] uppercase tracking-wide transition-colors"
                >
                    Annuler
                </button>
            </div>
        </div>
    );
};

export default BandesView;
