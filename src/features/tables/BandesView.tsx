import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IonPage, IonHeader, IonContent, IonSpinner,
  IonRefresher, IonRefresherContent, IonModal, IonSegment, IonSegmentButton, IonLabel,
  IonSelect, IonSelectOption, IonButtons, IonButton,
  IonCheckbox, IonFooter, IonToolbar, IonTitle
} from '@ionic/react';
import {
  AlertCircle, Search, Calendar, ChevronRight, RefreshCw, Layers,
  TrendingUp, Skull, Activity, ClipboardList, Bug, ChevronDown,
  ChevronUp, Stethoscope, ChevronLeft, CheckCheck, X, CheckSquare,
  Square, Filter, SlidersHorizontal, TrendingDown
} from 'lucide-react';
import { readTableByKey, updateRowById, appendRow } from '../../services/googleSheets';
import { enqueueUpdateRow, enqueueAppendRow } from '../../services/offlineQueue';
import TableRowEdit from './TableRowEdit';
import PhotoStrip from '../../components/PhotoStrip';
import PremiumHeader from '../../components/PremiumHeader';
import QuickNoteForm from '../../components/forms/QuickNoteForm';
import QuickHealthForm from '../../components/forms/QuickHealthForm';
import { PremiumCard } from '../../components/PremiumUI';
import { isDebugEnabled } from '../../config';

// Error Boundary locale pour le module Bandes
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
        <div className="p-10 text-center space-y-6 bg-white h-full flex flex-col items-center justify-center">
          <AlertCircle size={48} className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Erreur d'affichage</h2>
          <p className="text-[13px] text-gray-500 leading-relaxed max-w-xs">
            {(this as any).state.error?.message || 'Une erreur critique est survenue dans le module Bandes.'}
          </p>
          <div className="flex flex-col gap-3 w-full">
            <button onClick={this.handleReset} className="premium-btn premium-btn-primary w-full">Rafraîchir</button>
            <button onClick={() => { window.location.href = '/'; }} className="premium-btn bg-gray-100 text-gray-600 w-full font-bold uppercase text-[11px]">Retour Accueil</button>
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
        <div className="mx-6 mb-6">
            <button onClick={() => setOpen(!open)} className="pressable w-full flex items-center justify-between bg-gray-900 text-accent-400 px-4 py-2 rounded-xl text-[12px] font-bold uppercase shadow-lg shadow-black/20 border border-accent-600/20">
                <div className="flex items-center gap-2">
                    <Bug />
                    <span>Debug Panel</span>
                </div>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {open && (
                <div className="bg-gray-900 text-white p-4 rounded-b-xl border-x border-b border-accent-600/20 text-[11px] font-mono space-y-2 overflow-x-auto">
                    <p><span className="text-accent-500">SHEET:</span> {meta?.sheetName || 'N/A'}</p>
                    <p><span className="text-accent-500">ID_HEADER:</span> {meta?.idHeader || 'N/A'}</p>
                    <p><span className="text-accent-500">BANDE_KEY:</span> {bandeKey || 'N/A'}</p>
                    <p><span className="text-accent-500">ROWS:</span> {rowsCount}</p>
                    <p><span className="text-accent-500">HEADER:</span> {header.join(', ')}</p>
                    {error && <p className="text-rose-300 font-bold"><span className="text-accent-500">ERROR:</span> {error}</p>}
                </div>
            )}
        </div>
    );
};

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const [bandeKey, setBandeKey] = useState<string>("ID Portée");

  const tableKey = 'PORCELETS_BANDES_DETAIL';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [result, healthRes, notesRes] = await Promise.all([
        readTableByKey(tableKey),
        readTableByKey('JOURNAL_SANTE'),
        readTableByKey('NOTES_TERRAIN')
      ]);

      if (result.success) {
        setHeader(result.header || []);
        setRows(result.rows || []);
        setMeta(result.meta || null);
        // On pourrait stocker health/notes ici aussi si on veut les passer au detail
      } else {
        setError(result.message || 'Impossible de charger les bandes');
      }
    } catch (e) {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
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
                  const parts = String(dateSevragePrevue).split(/[\/\-]/);
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
                  const parts = String(dateMB).split(/[\/\-]/);
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
      }).filter(b =>
          b.id.toLowerCase().includes(searchText.toLowerCase()) ||
          (b.truie && String(b.truie).toLowerCase().includes(searchText.toLowerCase())) ||
          (b.boucleMere && String(b.boucleMere).toLowerCase().includes(searchText.toLowerCase()))
      );
  }, [rows, bandeIdIndex, header, searchText]);

  const selectedBandeId = urlBandeId || null;

  const selectedBandeData = useMemo(() => {
      return aggregatedBandes.find(b => b.id === selectedBandeId);
  }, [aggregatedBandes, selectedBandeId]);

  const handleOpenBande = (id: string) => {
      if (selectionMode) {
          toggleSelection(id);
          return;
      }
      navigate(`/bandes/${encodeURIComponent(id)}`);
  };

  const toggleSelection = (id: string) => {
      setSelectedIds(prev =>
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
  };

  const handleCloseBande = () => {
      navigate('/bandes');
  };

  const selectedBandesDataList = useMemo(() => {
      return aggregatedBandes.filter(b => selectedIds.includes(b.id));
  }, [aggregatedBandes, selectedIds]);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <PremiumHeader title="Bandes Porcelets" subtitle={selectionMode ? `${selectedIds.length} sélectionné(s)` : "Module d'Élevage"}>
          <div className="flex gap-2.5">
              <div className="bg-gray-50 rounded-xl flex items-center px-4 py-1.5 border border-gray-100 flex-1">
                 <Search size={18} className="text-gray-400 mr-3" />
                 <input
                    className="bg-transparent border-none text-gray-900 placeholder-gray-300 text-sm w-full py-2.5 outline-none font-bold tracking-wide"
                    placeholder="Chercher une bande..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                 />
              </div>
              <button
                onClick={() => {
                    setSelectionMode(!selectionMode);
                    setSelectedIds([]);
                }}
                className={`pressable p-3 rounded-xl flex items-center justify-center transition-colors ${selectionMode ? 'bg-red-500 text-white' : 'bg-gray-50 text-gray-500 border border-gray-100'}`}
                aria-label={selectionMode ? "Mode sélection" : "Rechercher"}
              >
                  {selectionMode ? <X size={20} /> : <CheckSquare size={20} />}
              </button>
          </div>
        </PremiumHeader>
      </IonHeader>

      <IonContent className="bg-white">
        <IonRefresher slot="fixed" onIonRefresh={(e) => loadData().then(() => e.detail.complete())}>
          <IonRefresherContent />
        </IonRefresher>

        <BandesErrorBoundary onReset={loadData}>
            <div className="py-8">
                <DebugPanel meta={meta} header={header} rowsCount={rows.length} error={error} bandeKey={bandeKey} />

                {loading && rows.length === 0 ? (
                    <div className="px-5 grid grid-cols-1 gap-6">
                        <PremiumCard loading />
                        <PremiumCard loading />
                        <PremiumCard loading />
                    </div>
                ) : error ? (
                    <div className="mx-6 premium-card p-10 text-center bg-white">
                        <AlertCircle size={40} className="text-red-500 mb-4" />
                        <h3 className="font-bold text-gray-900 mb-2">Erreur Flux</h3>
                        <p className="text-xs text-gray-400 font-bold uppercase mb-6">{error}</p>
                        <button onClick={loadData} className="premium-btn premium-btn-primary w-full">Réessayer</button>
                    </div>
                ) : header.length > 0 && bandeIdIndex === -1 ? (
                    <div className="mx-6 premium-card p-8 bg-white border-amber-100 border-2">
                         <div className="flex items-center gap-3 mb-4 text-amber-500">
                             <AlertCircle size={22} />
                             <h3 className="font-bold text-[13px]">Configuration Requise</h3>
                         </div>
                         <p className="text-[11px] font-bold text-gray-400 uppercase leading-relaxed mb-6">
                             Impossible de détecter la colonne identifiant les bandes automatiquement. Veuillez la sélectionner.
                         </p>
                         <IonSelect
                            value={bandeKey}
                            placeholder="Choisir colonne Bande"
                            className="premium-select bg-gray-50 rounded-xl mb-4"
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
                    <div className="text-center mt-24 opacity-40 px-5">
                        <Layers size={48} className="text-gray-400 mb-4" />
                        <p className="font-bold text-[13px]">Aucune bande détectée</p>
                    </div>
                ) : (
                    <div className="space-y-6 pb-32 px-5">
                        {aggregatedBandes.map((bande) => {
                            return (
                            <PremiumCard
                                key={bande.id}
                                variant={bande.hasAlert ? 'alert' : 'default'}
                                onClick={() => handleOpenBande(bande.id)}
                                className={`relative overflow-hidden ${selectedIds.includes(bande.id) ? 'ring-2 ring-accent-600 ring-offset-2 bg-accent-50/30' : ''}`}
                            >
                                {selectionMode && (
                                    <div className="absolute top-4 right-4 z-10">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedIds.includes(bande.id) ? 'bg-accent-600 border-accent-600 text-white' : 'bg-white border-gray-200'}`}>
                                            {selectedIds.includes(bande.id) && <CheckCheck size={14} />}
                                        </div>
                                    </div>
                                )}
                                {bande.hasAlert && !selectionMode && (
                                    <div className="absolute top-0 right-0 bg-red-500 text-white px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                                        <AlertCircle size={14} />
                                        <span className="text-[11px] font-bold uppercase">Alerte</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-xl text-white shadow-lg ${bande.hasAlert ? 'bg-red-500 shadow-red-500/15' : 'bg-accent-600 shadow-accent-600/15'}`}>
                                            <Layers size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-[18px] font-bold text-gray-900 leading-none mb-1 ft-heading">{bande.id}</h2>
                                            <span className="text-[12px] text-gray-400">Bande Porcelets</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {bande.status && (
                                            <div className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 text-[11px] font-bold uppercase text-gray-600">
                                                {String(bande.status)}
                                            </div>
                                        )}
                                        {bande.age !== null && (
                                            <span className="text-[12px] font-bold text-accent-600 bg-accent-50 px-2 py-0.5 rounded-lg uppercase">
                                                {bande.age} Jours
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4 mt-2">
                                    <div>
                                        <span className="block text-[11px] text-gray-400 mb-1">Truie / Mère</span>
                                        <span className="text-xs font-bold text-gray-700 truncate block">
                                            {bande.truie || '—'} {bande.boucleMere ? `(${bande.boucleMere})` : ''}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[11px] text-gray-400 mb-1">Date MB</span>
                                        <span className="text-xs font-bold text-gray-700">{bande.dateMB || '—'}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mt-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <div className="text-center">
                                        <span className="block text-[11px] font-bold text-gray-400 uppercase mb-0.5">Nés Viv.</span>
                                        <span className="text-[14px] font-bold text-gray-900 ft-values">{bande.nv || 0}</span>
                                    </div>
                                    <div className="text-center border-x border-gray-100">
                                        <span className="block text-[11px] font-bold text-gray-400 uppercase mb-0.5">Morts</span>
                                        <span className={`text-sm font-bold ${bande.morts > 0 ? 'text-red-500' : 'text-gray-800'}`}>{bande.morts}</span>
                                    </div>
                                    <div className="text-center">
                                        <span className="block text-[11px] font-bold text-gray-400 uppercase mb-0.5">Vivants</span>
                                        <span className="text-sm font-bold text-accent-700">{bande.vivants || 0}</span>
                                    </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-6 h-6 rounded-full bg-accent-100 flex items-center justify-center text-[11px] font-bold text-emerald-800 border border-accent-300">
                                            {bande.count}
                                        </div>
                                        <span className="text-[11px] font-bold text-gray-400 uppercase">Lignes</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-accent-600 font-bold text-[11px] uppercase">
                                        <span>Ouvrir Fiche</span>
                                        <ChevronRight size={18} />
                                    </div>
                                </div>
                            </PremiumCard>
                            );
                        })}
                    </div>
                )}
            </div>
        </BandesErrorBoundary>

        {selectionMode && selectedIds.length > 0 && (
            <div className="fixed bottom-6 left-6 right-6 z-[100] animate-in slide-in-from-bottom-10 duration-[160ms]">
                <button
                    onClick={() => setShowBatchModal(true)}
                    className="pressable w-full premium-btn-primary h-16 rounded-xl shadow-2xl shadow-emerald-900/40 flex items-center justify-center gap-3 active:scale-95 transition-transform"
                >
                    <CheckCheck size={20} />
                    <span className="font-bold uppercase text-sm">Clôturer Sevrage ({selectedIds.length})</span>
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
                    <div className="p-10 text-center">
                        <AlertCircle size={32} className="text-red-500 mb-2" />
                        <p className="font-bold text-[13px]">Bande introuvable</p>
                        <button onClick={handleCloseBande} className="mt-4 premium-btn premium-btn-primary w-full">Fermer</button>
                    </div>
                )}
            </BandesErrorBoundary>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

const CycleTimeline: React.FC<{ age: number | null, status: string }> = ({ age, status }) => {
    const phases = [
        { id: 'maternite', label: 'Maternité', min: 0, max: 21, icon: '🍼' },
        { id: 'sevrage', label: 'Sevrage', min: 21, max: 28, icon: '🚜' },
        { id: 'post-sevrage', label: 'Post-Sevrage', min: 28, max: 70, icon: '🌱' },
        { id: 'engraissement', label: 'Engraissement', min: 70, max: 180, icon: '🐖' }
    ];

    const currentPhaseIndex = status.toUpperCase().includes('SEVRÉ') ? 2 : phases.findIndex(p => age !== null && age >= p.min && age < p.max);
    const activeIndex = currentPhaseIndex === -1 ? (age && age > 180 ? 3 : 0) : currentPhaseIndex;

    return (
        <div className="premium-card p-6 bg-white border-gray-100 shadow-sm overflow-hidden mb-6">
            <div className="flex items-center gap-2 mb-6">
                <TrendingUp size={18} className="text-accent-600" />
                <h4 className="text-[11px] font-bold uppercase text-gray-400">Timeline du Cycle</h4>
            </div>
            <div className="relative flex justify-between px-2">
                <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-100" />
                {phases.map((phase, idx) => {
                    const isCompleted = idx < activeIndex;
                    const isCurrent = idx === activeIndex;
                    return (
                        <div key={phase.id} className="relative z-10 flex flex-col items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] shadow-sm transition-colors duration-[160ms] ${
                                isCurrent ? 'bg-emerald-600 text-white scale-110 ring-4 ring-emerald-100' :
                                isCompleted ? 'bg-accent-100 text-accent-700' : 'bg-gray-50 text-gray-400'
                            }`}>
                                {isCompleted ? <CheckCheck size={14} /> : <span>{phase.icon}</span>}
                            </div>
                            <span className={`text-[6px] font-bold uppercase text-center w-12 ${isCurrent ? 'text-emerald-900' : 'text-gray-400'}`}>
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
        <div className="h-full bg-white flex flex-col">
            <div className="flex items-center bg-accent-600 px-4 pt-4">
                 <button onClick={onClose} className="pressable p-2 text-white/80 hover:text-white transition-colors" aria-label="Retour">
                    <ChevronLeft size={22} />
                 </button>
                 <div className="flex-1 text-center pr-8">
                    <h1 className="text-white font-bold uppercase text-sm ft-heading">Fiche Bande</h1>
                 </div>
            </div>
            <PremiumHeader title={`Bande ${bande.id}`} subtitle={bande.status || 'Détails du Lot'} cibleId={bande.id} module="BANDES" />

            <div className="-mt-14 mb-4 z-10">
                <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as string)} className="premium-segment mx-6 rounded-xl bg-white shadow-xl shadow-emerald-900/10 border border-emerald-50 overflow-hidden">
                    <IonSegmentButton value="resumé"><IonLabel className="text-[12px] font-bold uppercase">Résumé</IonLabel></IonSegmentButton>
                    <IonSegmentButton value="details"><IonLabel className="text-[12px] font-bold uppercase">Détails</IonLabel></IonSegmentButton>
                    <IonSegmentButton value="sante"><IonLabel className="text-[12px] font-bold uppercase">Santé</IonLabel></IonSegmentButton>
                    <IonSegmentButton value="notes"><IonLabel className="text-[12px] font-bold uppercase">Notes</IonLabel></IonSegmentButton>
                </IonSegment>
            </div>

            <IonContent className="bg-white">
                <div className="px-5 py-8">
                    {tab === 'resumé' && (
                        <div className="space-y-8 pb-32">
                            <PhotoStrip subjectType="BANDE" subjectId={bande.id} />

                            <CycleTimeline age={bande.age} status={bande.status || ''} />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="premium-card p-5 bg-white border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp size={18} className="text-accent-500" />
                                        <span className="text-[11px] font-bold text-gray-400 uppercase">Performances</span>
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-bold text-gray-900 ft-values">{bande.vivants || 0}</span>
                                        <span className="text-[11px] text-gray-400 uppercase">Vivants</span>
                                    </div>
                                </div>
                                <div className="premium-card p-5 bg-white border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Stethoscope size={18} className="text-red-500" />
                                        <span className="text-[11px] font-bold text-gray-400 uppercase">Alertes Santé</span>
                                    </div>
                                    <span className={`text-xl font-bold ${filteredHealth.length > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                        {filteredHealth.length}
                                    </span>
                                </div>
                            </div>

                            <div className="premium-card p-6 bg-white border-gray-100 space-y-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <Activity size={18} className="text-emerald-800" />
                                    <h4 className="text-[11px] font-bold uppercase text-emerald-800 ft-heading">Informations Générales</h4>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { label: 'Truie', value: bande.truie },
                                        { label: 'Boucle Mère', value: bande.boucleMere },
                                        { label: 'Date MB', value: bande.dateMB },
                                        { label: 'Nés Vivants', value: bande.nv },
                                        { label: 'Morts', value: bande.morts },
                                        { label: 'Âge', value: bande.age ? `${bande.age} jours` : '—' },
                                        { label: 'Statut Actuel', value: bande.status }
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center border-b border-gray-50 pb-2">
                                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">{item.label}</span>
                                            <span className="text-xs font-bold text-gray-800">{String(item.value || '—')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <QuickHealthForm subjectType="BANDE" subjectId={bande.id} onSuccess={() => { onRefresh(); loadRelatedData(); }} />
                        </div>
                    )}

                    {tab === 'details' && (
                        <div className="space-y-4 pb-32">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[11px] font-bold text-gray-400 uppercase ft-heading">Registre Complet</h3>
                                <span className="text-[11px] font-bold text-accent-600 bg-accent-50 px-2 py-1 rounded">{bande.rows.length} Lignes</span>
                            </div>
                            {bande.rows && bande.rows.length > 0 ? (
                                bande.rows.map((row: any[], i: number) => (
                                    <div
                                        key={i}
                                        onClick={() => setEditRow(row)}
                                        className="premium-card p-5 bg-white border-gray-100 flex items-center justify-between active:scale-[0.97] transition-transform duration-[160ms] shadow-sm pressable"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 font-bold text-xs ft-code">
                                                #{i+1}
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-800">Ligne de registre</p>
                                                <p className="text-[11px] text-gray-400 uppercase ft-code">
                                                    {header && header.includes('DATE MB') ? String(row[header.indexOf('DATE MB')]) : 'ID: ' + bande.id}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="text-[11px] font-bold text-gray-900">{String(row[header.indexOf('STATUT') || 0] || '—')}</p>
                                                <p className="text-[11px] font-bold text-gray-400 uppercase">Statut</p>
                                            </div>
                                            <ChevronRight size={18} className="text-slate-200" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="premium-card p-10 text-center bg-gray-50 border-2 border-dashed border-gray-200">
                                    <AlertCircle size={32} className="text-gray-400 mb-2 opacity-20" />
                                    <p className="text-[12px] font-bold text-gray-400 uppercase">Aucune donnée brute</p>
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'sante' && (
                        <div className="space-y-6 pb-32">
                            <QuickHealthForm subjectType="BANDE" subjectId={bande.id} onSuccess={() => { onRefresh(); loadRelatedData(); }} />

                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[11px] font-bold text-gray-400 uppercase ft-heading">Journal Santé Bande</h3>
                            </div>

                            {loading ? (
                                <div className="text-center py-10">
                                    <IonSpinner name="bubbles" color="primary" />
                                </div>
                            ) : filteredHealth.length === 0 ? (
                                <div className="premium-card p-10 text-center bg-gray-50 border-2 border-dashed border-gray-200">
                                    <Stethoscope size={32} className="text-gray-400 mb-2 opacity-20" />
                                    <p className="text-[12px] font-bold text-gray-400 uppercase">Aucun soin pour cette bande</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredHealth.map((row, i) => (
                                        <div key={i} className="premium-card p-5 bg-white border-gray-100 shadow-sm border-l-4 border-l-rose-400">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[12px] font-bold text-gray-400 uppercase ft-code">{String(row[healthHeader.findIndex(h => h.toUpperCase().includes('DATE')) || 0])}</span>
                                                <span className="bg-red-50 text-red-800 text-[11px] font-bold px-2 py-0.5 rounded uppercase">{String(row[healthHeader.findIndex(h => h.toUpperCase().includes('TYPE')) || 1])}</span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-800 mb-1">{String(row[healthHeader.findIndex(h => h.toUpperCase().includes('SOIN') || h.toUpperCase().includes('TRAITEMENT')) || 2])}</p>
                                            <p className="text-[11px] text-gray-500 leading-relaxed">{String(row[healthHeader.findIndex(h => h.toUpperCase().includes('OBS')) || 3])}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'notes' && (
                        <div className="space-y-6 pb-32">
                            <QuickNoteForm subjectType="BANDE" subjectId={bande.id} onSuccess={() => { onRefresh(); loadRelatedData(); }} />

                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[11px] font-bold text-gray-400 uppercase ft-heading">Journal de Bord</h3>
                            </div>

                            {loading ? (
                                <div className="text-center py-10">
                                    <IonSpinner name="bubbles" color="primary" />
                                </div>
                            ) : filteredNotes.length === 0 ? (
                                <div className="premium-card p-10 text-center bg-gray-50 border-2 border-dashed border-gray-200">
                                    <ClipboardList size={32} className="text-gray-400 mb-2 opacity-20" />
                                    <p className="text-[12px] font-bold text-gray-400 uppercase">Journal vide</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredNotes.map((row, i) => (
                                        <div key={i} className="premium-card p-5 bg-white border-gray-100 shadow-sm border-l-4 border-l-emerald-400">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[12px] font-bold text-gray-400 uppercase ft-code">{String(row[notesHeader.indexOf('DATE') || 0])}</span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-800 leading-relaxed italic">"{String(row[notesHeader.findIndex(h => h.toUpperCase().includes('NOTE') || h.toUpperCase().includes('TEXTE')) || 1])}"</p>
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
    const [flushing, setFlushing] = useState(true);
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

            const statusIdx = header.findIndex(h => h.trim().toUpperCase() === 'STATUT');
            const dateSevIdx = header.findIndex(h => h.trim().toUpperCase().includes('DATE SEVRAGE RÉELLE'));

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
                    if (bande.boucleMere && truiesMeta) {
                        const tStatusIdx = truiesHeader.findIndex(h => h.toUpperCase().includes('STATUT'));
                        const tAlimIdx = truiesHeader.findIndex(h => h.toUpperCase().includes('ALIMENTATION'));
                        const tNoteIdx = truiesHeader.findIndex(h => h.toUpperCase().includes('NOTE') || h.toUpperCase().includes('OBSERVATION'));

                        const patch: any = {};
                        if (tStatusIdx !== -1) patch[truiesHeader[tStatusIdx]] = flushing ? 'FLUSHING' : 'SEVRÉE';
                        if (flushing && tAlimIdx !== -1) patch[truiesHeader[tAlimIdx]] = 'FLUSHING';

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
            <div className="h-full flex flex-col items-center justify-center p-10 bg-white space-y-8">
                <div className="relative">
                    <div className="w-32 h-32 rounded-full border-4 border-accent-100 border-t-emerald-500 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold text-accent-600 ft-values">{Math.round((progress.current / progress.total) * 100)}%</span>
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h3 className="font-bold uppercase text-gray-900 ft-heading">Traitement en cours</h3>
                    <p className="text-[11px] font-bold text-gray-400 uppercase animate-pulse">{progress.phase}</p>
                    <p className="text-xs font-bold text-accent-600 ft-values">{progress.current} / {progress.total}</p>
                </div>
                {errors.length > 0 && (
                    <div className="w-full bg-red-50 p-4 rounded-xl border border-red-100 max-h-40 overflow-y-auto">
                         {errors.map((err, i) => <p key={i} className="text-[11px] text-red-500 font-bold uppercase mb-1">{err}</p>)}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="h-full bg-gray-50 flex flex-col">
            <div className="bg-accent-600 p-8 rounded-b-[40px] shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-white font-bold uppercase text-lg ft-heading">Clôture Sevrage</h2>
                    <button onClick={onClose} className="bg-white/20 p-2 rounded-full text-white"><X size={20} /></button>
                </div>
                <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
                    <div className="bg-white text-accent-600 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-inner ft-values">
                        {selectedBandes.length}
                    </div>
                    <div>
                        <p className="text-white/60 text-[11px] font-bold uppercase">Lots sélectionnés</p>
                        <p className="text-white font-bold text-sm">Prêts pour le sevrage</p>
                    </div>
                </div>
            </div>

            <IonContent className="--background: transparent">
                <div className="p-6 space-y-6">
                    {errors.length > 0 && (
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                             <h4 className="text-red-800 font-bold text-[13px] mb-2">Erreurs lors de la dernière tentative :</h4>
                             {errors.map((err, i) => <p key={i} className="text-[11px] text-red-500 font-bold mb-1">• {err}</p>)}
                        </div>
                    )}

                    <div className="premium-card bg-white p-6 space-y-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                             <Calendar size={18} className="text-accent-500" />
                             <h4 className="text-[11px] font-bold uppercase text-gray-400 ft-heading">Paramètres Sevrage</h4>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">Date de Sevrage</label>
                            <input
                                type="date"
                                value={dateSevrage}
                                onChange={e => setDateSevrage(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-xl p-4 font-bold text-gray-800 outline-none ring-2 ring-transparent focus:ring-accent-600/20 transition-shadow"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">Poids Moyen du lot (kg)</label>
                            <input
                                type="number"
                                inputMode="numeric"
                                placeholder="Ex: 7.5"
                                value={poidsMoyen}
                                onChange={e => setPoidsMoyen(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-xl p-4 font-bold text-gray-800 outline-none ring-2 ring-transparent focus:ring-accent-600/20 transition-shadow"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">Observations</label>
                            <textarea
                                placeholder="Notes sur l'état des porcelets, homogénéité..."
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                className="w-full bg-gray-50 border-none rounded-xl p-4 font-bold text-gray-800 outline-none ring-2 ring-transparent focus:ring-accent-600/20 transition-shadow h-24 resize-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div
                            onClick={() => setFlushing(!flushing)}
                            className={`pressable premium-card p-5 flex items-center justify-between transition-colors cursor-pointer border ${flushing ? 'bg-accent-50 border-accent-300' : 'bg-white border-gray-100'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${flushing ? 'bg-accent-600 text-white shadow-lg shadow-accent-300' : 'bg-gray-100 text-gray-400'}`}>
                                    <SlidersHorizontal size={18} />
                                </div>
                                <div>
                                    <h4 className={`text-[11px] font-bold uppercase ${flushing ? 'text-emerald-900' : 'text-gray-600'} ft-heading`}>Flushing Automatique</h4>
                                    <p className="text-[11px] text-gray-400 uppercase">Truies &rarr; Statut &amp; Alim Flushing</p>
                                </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${flushing ? 'bg-accent-600 border-accent-600 text-white' : 'border-gray-200'}`}>
                                {flushing && <CheckCheck size={14} />}
                            </div>
                        </div>

                        <div
                            onClick={() => setPointHebdo(!pointHebdo)}
                            className={`pressable premium-card p-5 flex items-center justify-between transition-colors cursor-pointer border ${pointHebdo ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${pointHebdo ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200' : 'bg-gray-100 text-gray-400'}`}>
                                    <TrendingUp size={18} />
                                </div>
                                <div>
                                    <h4 className={`text-[11px] font-bold uppercase ${pointHebdo ? 'text-indigo-900' : 'text-gray-600'} ft-heading`}>Rapport d'activité</h4>
                                    <p className="text-[11px] text-gray-400 uppercase">Générer Point Hebdo Auto</p>
                                </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${pointHebdo ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-200'}`}>
                                {pointHebdo && <CheckCheck size={14} />}
                            </div>
                        </div>
                    </div>
                </div>
            </IonContent>

            <div className="p-6 bg-white border-t border-gray-100">
                <button
                    disabled={loading}
                    onClick={handleConfirm}
                    className="pressable w-full premium-btn-primary h-16 rounded-xl flex items-center justify-center gap-3 shadow-xl shadow-accent-600/15 active:scale-95 transition-transform"
                >
                    <CheckCheck size={20} />
                    <span className="font-bold uppercase">Lancer le Sevrage</span>
                </button>
                <button
                    onClick={onClose}
                    className="pressable w-full mt-3 h-12 text-[11px] font-bold uppercase text-gray-400"
                >
                    Annuler
                </button>
            </div>
        </div>
    );
};

export default BandesView;
