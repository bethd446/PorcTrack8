import React, { useState, useEffect } from 'react';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonList, IonItem, IonLabel, IonInput, IonNote, IonLoading, IonToast
} from '@ionic/react';
import { Box, ShieldCheck } from 'lucide-react';
import { updateRowById } from '../../services/googleSheets';
import { enqueueUpdateRow } from '../../services/offlineQueue';
import PhotoStrip from '../../components/PhotoStrip';
import { PhotoEntry } from '../../services/photos';

interface TableRowEditProps {
  meta: any;
  header: string[];
  rowData: any[];
  onClose: () => void;
  onSaved: () => void;
}

const formatCellValue = (value: any) => {
    if (value === null || value === undefined || value === '—' || value === '') return '';

    // Check if it's an ISO date string
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
        try {
            return new Date(value).toLocaleDateString('fr-FR');
        } catch {
            return value;
        }
    }

    // Google Sheets often sends dates as strings like "2023-12-31" or "31/12/2023"
    // We keep them as is in the input for simplicity, or just stringify
    return String(value);
};

const TableRowEdit: React.FC<TableRowEditProps> = ({ meta, header, rowData, onClose, onSaved }) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{show: boolean, message: string}>({show: false, message: ''});

  useEffect(() => {
    const initialData: Record<string, any> = {};
    header.forEach((col, index) => {
      initialData[col] = rowData[index];
    });
    setFormData(initialData);
  }, [header, rowData]);

  const idIndex = header.indexOf(meta.idHeader);
  const idValue = rowData[idIndex];

  const handleSave = async () => {
    setLoading(true);
    const patch: Record<string, any> = {};
    header.forEach((col, index) => {
      let currentVal = formData[col];

      const isNum = isNumeric(rowData[index]) ||
                    col.toLowerCase().includes('poids') ||
                    col.toLowerCase().includes('montant') ||
                    col.toLowerCase().includes('quantité') ||
                    col.toLowerCase().includes('ration') ||
                    col.toLowerCase().includes('nb');

      if (isNum && typeof currentVal === 'string' && currentVal.trim() !== '') {
        const parsed = parseFloat(currentVal.replace(',', '.'));
        if (!isNaN(parsed)) currentVal = parsed;
      }

      if (col !== meta.idHeader && currentVal !== rowData[index]) {
        patch[col] = currentVal;
      }
    });

    if (Object.keys(patch).length === 0) {
        onClose();
        return;
    }

    try {
      const result = await updateRowById(meta.sheetName, meta.idHeader, idValue, patch);
      if (result.success) {
        setToast({show: true, message: 'Mis à jour avec succès'});
        setTimeout(() => {
            onSaved();
            onClose();
        }, 800);
      } else {
        enqueueUpdateRow(meta.sheetName, meta.idHeader, idValue, patch);
        setToast({show: true, message: 'En attente de synchronisation (hors ligne)'});
        setTimeout(() => {
            onSaved();
            onClose();
        }, 1200);
      }
    } catch (error) {
      enqueueUpdateRow(meta.sheetName, meta.idHeader, idValue, patch);
      setToast({show: true, message: 'En attente de synchronisation'});
      setTimeout(() => {
            onSaved();
            onClose();
        }, 1200);
    } finally {
      setLoading(false);
    }
  };

  const getSubjectType = (): PhotoEntry['subjectType'] => {
      const s = meta.sheetName.toLowerCase();
      if (s.includes('truie')) return 'TRUIE';
      if (s.includes('verrat')) return 'VERRAT';
      if (s.includes('bande') || s.includes('portee')) return 'BANDE';
      if (s.includes('sante')) return 'SANTE';
      return 'NOTE';
  };

  const isNumeric = (val: any) => {
    if (typeof val === 'number') return true;
    if (typeof val !== 'string') return false;
    return !isNaN(parseFloat(val)) && isFinite(Number(val));
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-t-[40px] overflow-hidden">
      <div className="premium-header-compact bg-accent-600 px-8 pt-10 pb-8 flex items-center justify-between shadow-2xl shadow-accent-950/20 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Box size={144} className="text-white rotate-12" />
         </div>
         <button onClick={onClose} className="pressable bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 text-white font-bold text-[11px] uppercase active:scale-[0.95] transition-transform duration-[160ms] z-10">Fermer</button>
         <div className="text-center z-10">
            <h2 className="ft-heading text-white font-bold uppercase text-xs mb-1">Édition Active</h2>
            <p className="ft-code text-accent-300 text-[11px] font-bold uppercase">{idValue}</p>
         </div>
         <button onClick={handleSave} className="pressable bg-accent-400 text-accent-950 px-5 py-3 rounded-xl font-bold uppercase text-[11px] shadow-xl shadow-accent-400/20 active:scale-[0.95] transition-transform duration-[160ms] z-10">Valider</button>
      </div>

      <IonContent className="bg-white">
        <IonLoading isOpen={loading} message="Traitement crypté..." spinner="bubbles" cssClass="premium-loading" />

        <div className="px-5 pt-10">
            <PhotoStrip subjectType={getSubjectType()} subjectId={String(idValue)} />
        </div>

        <div className="px-5 py-10 space-y-8 pb-32">
          {header.map((col, index) => {
            const initialValue = rowData[index];
            const isId = col === meta.idHeader;
            const useNumberInput = isNumeric(initialValue) ||
                                  col.toLowerCase().includes('poids') ||
                                  col.toLowerCase().includes('montant') ||
                                  col.toLowerCase().includes('quantité') ||
                                  col.toLowerCase().includes('ration') ||
                                  col.toLowerCase().includes('nb');

            return (
              <div key={col} className={`space-y-3 transition-opacity duration-200 ${isId ? 'opacity-40' : 'opacity-100'}`}>
                <div className="flex items-center gap-2 px-2">
                    <div className="w-1 h-1 bg-accent-600 rounded-full"></div>
                    <label className="ft-code text-[11px] font-bold text-gray-400 uppercase">{col}</label>
                </div>
                <div className={`premium-card p-1.5 transition-transform duration-[160ms] shadow-sm ${isId ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100 focus-within:border-accent-600/50 focus-within:shadow-lg focus-within:shadow-accent-500/5'}`}>
                   <input
                      type="text"
                      inputMode={useNumberInput ? "decimal" : "text"}
                      className="w-full bg-transparent border-none px-4 py-4 text-gray-900 font-extrabold text-lg outline-none disabled:text-gray-500 placeholder-gray-300"
                      placeholder={`Saisir ${col.toLowerCase()}...`}
                      value={formData[col] === undefined ? formatCellValue(initialValue) : formData[col]}
                      disabled={isId}
                      onChange={e => {
                        setFormData({...formData, [col]: e.target.value});
                      }}
                   />
                </div>
                {isId && (
                    <div className="flex items-center gap-1.5 px-3">
                        <ShieldCheck size={11} className="text-gray-400 flex-shrink-0" />
                        <p className="ft-code text-[11px] font-bold text-gray-400 uppercase italic">Clé primaire immuable</p>
                    </div>
                )}
              </div>
            );
          })}
        </div>
        <IonToast
          isOpen={toast.show}
          message={toast.message}
          duration={3000}
          onDidDismiss={() => setToast({show: false, message: ''})}
          position="top"
          className="premium-toast"
        />
      </IonContent>
    </div>
  );
};

export default TableRowEdit;
