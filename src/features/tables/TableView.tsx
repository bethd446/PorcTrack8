import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonPage, IonHeader, IonContent, IonSpinner,
  IonRefresher, IonRefresherContent, IonModal
} from '@ionic/react';
import { AlertCircle, Search, Calendar, ChevronRight } from 'lucide-react';
import { readTableByKey } from '../../services/googleSheets';
import TableRowEdit from './TableRowEdit';
import PremiumHeader from '../../components/PremiumHeader';

interface TableViewProps {
  tableKey: string;
}

const formatDate = (val: any) => {
    if (!val || val === '—' || val === '') return '';
    const s = String(val);
    if (s.match(/^\d{4}-\d{2}-\d{2}T/)) {
        try { return new Date(s).toLocaleDateString('fr-FR'); } catch { return s; }
    }
    if (s.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = s.split('-');
        return `${d}/${m}/${y}`;
    }
    return s;
};

const TableView: React.FC<TableViewProps> = ({ tableKey }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [header, setHeader] = useState<string[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedRow, setSelectedRow] = useState<any[] | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await readTableByKey(tableKey);
      if (result.success) {
        setHeader(result.header);
        setRows(result.rows);
        setMeta(result.meta);
      } else {
        setError(result.message || 'Impossible de charger les données');
      }
    } catch (e) {
      setError('Erreur réseau ou configuration');
    } finally {
      setLoading(false);
    }
  }, [tableKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRows = rows.filter(row =>
    row.some(cell =>
      String(cell).toLowerCase().includes(searchText.toLowerCase())
    )
  );

  const idIndex = header.indexOf(meta?.idHeader || 'ID');

  const getStatusColor = (val: string) => {
      const v = String(val).toLowerCase();
      if (v.includes('ok') || v.includes('terminé') || v.includes('oui')) return 'success';
      if (v.includes('attente') || v.includes('en cours')) return 'warning';
      if (v.includes('urgent') || v.includes('non')) return 'danger';
      return 'medium';
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <PremiumHeader
          title={({
            JOURNAL_SANTE:           'Journal Santé',
            STOCK_ALIMENTS:          'Stock Aliments',
            STOCK_VETO:              'Stock Véto',
            SUIVI_TRUIES_REPRODUCTION:'Truies',
            VERRATS:                 'Verrats',
            PORCELETS_BANDES_DETAIL: 'Bandes',
            NOTES_TERRAIN:           'Notes Terrain',
          } as Record<string, string>)[tableKey] ?? tableKey.replace(/_/g, ' ')}
          subtitle={({
            JOURNAL_SANTE:           'Suivi sanitaire',
            STOCK_ALIMENTS:          'Aliments · Rations',
            STOCK_VETO:              'Médicaments · DLC',
            SUIVI_TRUIES_REPRODUCTION:'Registre reproducteurs',
            VERRATS:                 'Registre verrats',
            PORCELETS_BANDES_DETAIL: 'Lots post-sevrage',
            NOTES_TERRAIN:           'Journal de bord terrain',
          } as Record<string, string>)[tableKey] ?? 'Données Sheets'}
        >
              <div className="bg-gray-50 rounded-xl flex items-center px-4 py-1.5 border border-gray-100">
                 <Search size={18} className="text-gray-500 mr-3 flex-shrink-0" />
                 <input
                    className="bg-transparent border-none text-gray-900 placeholder-gray-300 text-[14px] w-full py-2 outline-none font-medium"
                    placeholder="Filtrer les données..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                 />
              </div>
        </PremiumHeader>
      </IonHeader>

      <IonContent className="bg-white">
        <IonRefresher slot="fixed" onIonRefresh={(e) => {
            loadData().then(() => e.detail.complete());
        }}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="px-5 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center mt-24 space-y-6">
            <div className="relative">
               <IonSpinner name="bubbles" color="primary" className="w-16 h-16" />
               <div className="absolute inset-0 bg-accent-600/10 blur-xl rounded-full -z-10 animate-pulse"></div>
            </div>
            <p className="text-gray-600 font-medium text-[13px]">Chargement des données...</p>
          </div>
        ) : error ? (
          <div className="premium-card p-10 text-center space-y-6 bg-white border-red-50">
            <div className="bg-red-50 w-20 h-20 rounded-xl flex items-center justify-center mx-auto border-2 border-red-100">
               <AlertCircle size={60} className="text-red-500" />
            </div>
            <div>
                <h3 className="ft-heading mb-2">Erreur de Flux</h3>
                <p className="text-xs text-gray-500 font-bold uppercase leading-relaxed">{error}</p>
            </div>
            <button
               onClick={loadData}
               className="pressable premium-btn premium-btn-primary w-full"
            >
               Réinitialiser le flux
            </button>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-24 space-y-4 opacity-40">
            <div className="bg-gray-100 p-8 rounded-full">
                <Search size={60} className="text-gray-500" />
            </div>
            <p className="text-gray-600 font-bold text-[11px] uppercase">Aucun résultat disponible</p>
          </div>
        ) : (
          <div className="space-y-6 pb-24">
            <div className="flex items-center justify-between px-2">
                <span className="text-[11px] font-medium text-gray-500">{filteredRows.length} Entrées trouvées</span>
                <div className="h-[1px] flex-1 mx-4 bg-gray-100"></div>
            </div>

            {filteredRows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className="pressable premium-card p-6 border-gray-100 hover:border-accent-200 group active:scale-[0.97] transition-transform duration-[160ms]"
                onClick={() => {
                    if (tableKey === 'SUIVI_TRUIES_REPRODUCTION') {
                        navigate(`/cheptel/truie/${row[idIndex]}`);
                    } else if (tableKey === 'VERRATS') {
                        navigate(`/cheptel/verrat/${row[idIndex]}`);
                    } else {
                        setSelectedRow(row);
                    }
                }}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-accent-50 p-2.5 rounded-xl group-hover:bg-accent-600 group-hover:text-white transition-transform duration-[160ms]">
                        <Calendar size={20} className="text-current" />
                    </div>
                    <div>
                        <h2 className="ft-heading text-lg tracking-tight leading-none mb-1">{row[idIndex]}</h2>
                        <span className="text-[11px] font-medium text-gray-500">Identifiant Unique</span>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-[11px] font-medium uppercase border transition-colors duration-[160ms] ${
                     getStatusColor(String(row[row.length - 1])) === 'success' ? 'bg-accent-50 border-accent-200 text-accent-700 shadow-sm shadow-accent-600/10' :
                     getStatusColor(String(row[row.length - 1])) === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm shadow-amber-500/10' :
                     getStatusColor(String(row[row.length - 1])) === 'danger' ? 'bg-red-50 border-red-200 text-red-700 shadow-sm shadow-red-500/10' :
                     'bg-gray-50 border-gray-100 text-gray-700'
                  }`}>
                    {String(row[row.length - 1]).toUpperCase()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                  {header.slice(0, 6).map((col, i) => {
                      if (col === meta?.idHeader || !row[i] || i === row.length -1) return null;
                      const isDate = col.toLowerCase().includes('date');
                      return (
                        <div key={col} className="space-y-1.5">
                          <span className="block text-[11px] font-medium text-gray-500 uppercase">{col}</span>
                          <span className="text-[13px] font-extrabold text-gray-800 block truncate leading-tight">
                              {isDate ? formatDate(row[i]) : String(row[i])}
                          </span>
                        </div>
                      );
                  })}
                </div>

                <div className="flex items-center justify-between mt-6 pt-5 border-t border-gray-100">
                    <div className="flex -space-x-2">
                        {[1, 2].map(i => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-100"></div>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 text-accent-600 font-medium text-[12px] group-hover:translate-x-1 transition-transform">
                        <span>Détails</span>
                        <ChevronRight size={14} className="flex-shrink-0" />
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>

        <IonModal isOpen={!!selectedRow} onDidDismiss={() => setSelectedRow(null)} initialBreakpoint={0.85} breakpoints={[0, 0.5, 0.85, 1]} className="premium-modal">
          {selectedRow && meta && (
            <div className="bg-white h-full rounded-t-[40px] overflow-hidden">
                <TableRowEdit
                    meta={meta}
                    header={header}
                    rowData={selectedRow}
                    onClose={() => setSelectedRow(null)}
                    onSaved={() => loadData()}
                />
            </div>
          )}
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default TableView;
