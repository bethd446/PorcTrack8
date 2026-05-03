/**
 * @deprecated Vue legacy basée sur Google Sheets (PORCELETS_BANDES_DETAIL).
 * Casse en prod : "CONFIGURATION REQUISE — Impossible de détecter la colonne
 * identifiant les portées". La route /troupeau/bandes redirige désormais vers
 * /troupeau?view=bandes (TroupeauHub) qui consomme la source Supabase.
 * Conservé pour archive — ne plus référencer dans le router.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IonPage, IonContent,
  IonRefresher, IonRefresherContent, IonModal,
  IonSelect, IonSelectOption,
} from '@ionic/react';
import {
  AlertCircle, AlertTriangle, Search, X, CheckSquare, CheckCheck,
} from 'lucide-react';
import { getTableByKey } from '../../services/tableLoader';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { SectionDivider } from '../../components/agritech';
import Button from '../../components/design/Button';
import EmptyState from '../../components/design/EmptyState';
import { BandeIcon } from '../../components/icons';
import QuickSexSeparationForm from '../../components/forms/QuickSexSeparationForm';
import BandesErrorBoundary from './bandes/BandesErrorBoundary';
import DebugPanel from './bandes/DebugPanel';
import FilterChip from './bandes/FilterChip';
import BandeRow from './bandes/BandeRow';
import BandeDetailView from './bandes/BandeDetailView';
import BatchWeaningModal from './bandes/BatchWeaningModal';
import { aggregateBandes } from './bandes/aggregateBandes';
import type { DebugMeta, SheetRawRow } from './bandes/types';

export type { SheetRawRow };

const BandesView: React.FC = () => {
  const { bandeId: urlBandeId } = useParams<{ bandeId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [header, setHeader] = useState<string[]>([]);
  const [rows, setRows] = useState<SheetRawRow[]>([]);
  const [meta, setMeta] = useState<DebugMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [showSexSeparation, setShowSexSeparation] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SOUS' | 'SEVRES'>('ALL');

  const [bandeKey, setBandeKey] = useState<string>('ID Portée');

  const tableKey = 'PORCELETS_BANDES_DETAIL';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTableByKey(tableKey);

      if (result.success) {
        setHeader(result.header || []);
        setRows(result.rows || []);
        setMeta(result.meta ? {
          sheetName: result.meta.sheetName,
          idHeader: result.meta.idHeader,
          headerRow: result.meta.headerRow,
          key: result.meta.key,
        } : null);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const bandeIdIndex = useMemo(() => {
    if (!bandeKey || header.length === 0) return -1;
    return header.findIndex(h => h.trim().toUpperCase() === bandeKey.toUpperCase());
  }, [header, bandeKey]);

  const aggregatedBandes = useMemo(
    () => aggregateBandes(rows, header, bandeIdIndex, searchText, statusFilter),
    [rows, bandeIdIndex, header, searchText, statusFilter],
  );

  const selectedBandeId = urlBandeId || null;

  const selectedBandeData = useMemo(() => {
    return aggregatedBandes.find(b => b.id === selectedBandeId);
  }, [aggregatedBandes, selectedBandeId]);

  const toggleSelection = (id: string): void => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleOpenBande = (id: string): void => {
    if (selectionMode) {
      toggleSelection(id);
      return;
    }
    navigate(`/troupeau/bandes/${encodeURIComponent(id)}`);
  };

  const handleCloseBande = (): void => {
    navigate('/troupeau/bandes');
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
            subtitle={selectionMode ? `${selectedIds.length} sélectionné(s)` : 'Suivi porcelets'}
            action={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSexSeparation(true)}
                  className="pressable inline-flex h-9 px-3 items-center justify-center rounded-md transition-colors bg-bg-2 text-text-1 hover:bg-bg-1 text-[11px] uppercase tracking-wide"
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
                  aria-label={selectionMode ? 'Annuler la sélection' : 'Mode sélection'}
                >
                  {selectionMode ? <X size={18} /> : <CheckSquare size={18} />}
                </button>
              </div>
            }
          >
            <div className="flex items-center gap-2 bg-bg-1 border border-border rounded-md px-3 h-10">
              <Search size={16} className="text-text-2 shrink-0" />
              <input
                className="bg-transparent border-none text-text-0 placeholder-text-2 text-sm w-full outline-none"
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
                <div className="mx-4 card-dense text-center py-10">
                  <span
                    aria-hidden="true"
                    className="inline-flex items-center justify-center mb-4"
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: 'var(--color-pig-soft, color-mix(in srgb, var(--red) 12%, var(--bg-surface)))',
                    }}
                  >
                    <AlertTriangle size={28} className="text-red" aria-hidden="true" />
                  </span>
                  <h3 className="agritech-heading text-[14px] uppercase mb-2">Erreur flux</h3>
                  <p className="text-[11px] text-text-2 uppercase mb-6">{error}</p>
                  <Button variant="primary" size="md" onClick={loadData}>
                    Réessayer
                  </Button>
                </div>
              ) : header.length > 0 && bandeIdIndex === -1 ? (
                <div className="mx-4 card-dense">
                  <div className="flex items-center gap-3 mb-4 text-[var(--amber-pork)]">
                    <AlertCircle size={18} />
                    <h3 className="agritech-heading text-[13px] uppercase">Configuration requise</h3>
                  </div>
                  <p className="text-[11px] text-text-2 leading-relaxed mb-4">
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
                <EmptyState
                  icon={<BandeIcon size={32} />}
                  title={searchText || statusFilter !== 'ALL' ? 'Aucune portée ne correspond' : 'Aucune portée détectée'}
                  description={
                    searchText || statusFilter !== 'ALL'
                      ? "Essayez un autre terme ou changez le filtre de statut."
                      : 'Les portées apparaîtront après la première mise-bas.'
                  }
                />
              ) : (
                <div className="px-4">
                  <SectionDivider label={`${aggregatedBandes.length} portée${aggregatedBandes.length > 1 ? 's' : ''}`} />
                  <div className="space-y-2">
                    {aggregatedBandes.map((bande) => (
                      <BandeRow
                        key={bande.id}
                        bande={bande}
                        isSelected={selectedIds.includes(bande.id)}
                        selectionMode={selectionMode}
                        onClick={() => handleOpenBande(bande.id)}
                      />
                    ))}
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
                <span className="text-[12px] uppercase tracking-wide font-semibold">
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
            {meta && (
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
            )}
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
                  <p className="text-[12px] uppercase text-text-1">Portée introuvable</p>
                  <button
                    onClick={handleCloseBande}
                    className="pressable h-11 px-6 rounded-md bg-accent text-bg-0 text-[12px] uppercase tracking-wide"
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

export default BandesView;
