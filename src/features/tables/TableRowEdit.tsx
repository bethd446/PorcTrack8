/**
 * TableRowEdit — Agritech Dark
 * ══════════════════════════════════════════════════════════════════
 * Édition inline d'une ligne de table Sheets. Rendu à l'intérieur
 * d'un `<BottomSheet>` (agritech) : pas de wrapper IonModal propre.
 *
 * Conservations strictes :
 *   · Dynamic headers (placeholder "Chargement du schéma…")
 *   · Coercion numérique (poids/montant/quantité/ration/nb)
 *   · Offline queue fallback (enqueueUpdateRow)
 *   · PhotoStrip (subjectType déduit du sheetName)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { IonLoading, IonToast } from '@ionic/react';
import { ShieldCheck, AlertCircle, X, Save } from 'lucide-react';
import { updateRowById } from '../../services/googleSheets';
import { enqueueUpdateRow } from '../../services/offlineQueue';
import PhotoStrip from '../../components/PhotoStrip';
import { PhotoEntry } from '../../services/photos';

interface TableRowEditMeta {
  sheetName: string;
  idHeader: string;
}

interface TableRowEditProps {
  meta: TableRowEditMeta;
  /** Colonnes dynamiques fournies par le parent — lues depuis FarmContext / cache Sheets. */
  header: string[];
  rowData: unknown[];
  onClose: () => void;
  onSaved: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '—' || value === '') return '';

  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
    try {
      return new Date(value).toLocaleDateString('fr-FR');
    } catch {
      return value;
    }
  }

  return String(value);
};

const isNumericLike = (val: unknown): boolean => {
  if (typeof val === 'number') return true;
  if (typeof val !== 'string') return false;
  if (val.trim() === '') return false;
  return !isNaN(parseFloat(val)) && isFinite(Number(val));
};

const isNumericColumn = (columnName: string, sampleValue: unknown): boolean => {
  const lower = columnName.toLowerCase();
  return (
    isNumericLike(sampleValue) ||
    lower.includes('poids') ||
    lower.includes('montant') ||
    lower.includes('quantité') ||
    lower.includes('ration') ||
    lower.includes('nb')
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const TableRowEdit: React.FC<TableRowEditProps> = ({ meta, header, rowData, onClose, onSaved }) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  // Guard: without dynamic header we cannot edit safely.
  const headerReady = header.length > 0;

  useEffect(() => {
    // TODO(refactor): use `key` prop on parent to remount instead of reinitializing form on prop change
    const initialData: Record<string, string> = {};
    header.forEach((col, index) => {
      const raw = rowData[index];
      initialData[col] = raw === null || raw === undefined ? '' : String(raw);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(initialData);
  }, [header, rowData]);

  const idIndex = headerReady ? header.indexOf(meta.idHeader) : -1;
  const idValue = idIndex >= 0 ? String(rowData[idIndex] ?? '') : '';

  const getSubjectType = useCallback((): PhotoEntry['subjectType'] => {
    const s = meta.sheetName.toLowerCase();
    if (s.includes('truie')) return 'TRUIE';
    if (s.includes('verrat')) return 'VERRAT';
    if (s.includes('bande') || s.includes('portee')) return 'BANDE';
    if (s.includes('sante')) return 'SANTE';
    return 'NOTE';
  }, [meta.sheetName]);

  const handleSave = async (): Promise<void> => {
    if (!headerReady) return;
    setLoading(true);
    const patch: Record<string, string | number> = {};
    header.forEach((col, index) => {
      const rawInitial = rowData[index];
      let currentVal: string | number = formData[col] ?? '';

      const numericColumn = isNumericColumn(col, rawInitial);
      if (numericColumn && typeof currentVal === 'string' && currentVal.trim() !== '') {
        const parsed = parseFloat(currentVal.replace(',', '.'));
        if (!isNaN(parsed)) currentVal = parsed;
      }

      const initialStr = rawInitial === null || rawInitial === undefined ? '' : String(rawInitial);
      const currentStr = typeof currentVal === 'number' ? String(currentVal) : currentVal;

      if (col !== meta.idHeader && currentStr !== initialStr) {
        patch[col] = currentVal;
      }
    });

    if (Object.keys(patch).length === 0) {
      onClose();
      setLoading(false);
      return;
    }

    try {
      const result = await updateRowById(meta.sheetName, meta.idHeader, idValue, patch);
      if (result.success) {
        setToast({ show: true, message: 'Mis à jour avec succès' });
        setTimeout(() => {
          onSaved();
          onClose();
        }, 800);
      } else {
        enqueueUpdateRow(meta.sheetName, meta.idHeader, idValue, patch);
        setToast({ show: true, message: 'En attente de synchronisation (hors ligne)' });
        setTimeout(() => {
          onSaved();
          onClose();
        }, 1200);
      }
    } catch {
      enqueueUpdateRow(meta.sheetName, meta.idHeader, idValue, patch);
      setToast({ show: true, message: 'En attente de synchronisation' });
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1200);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agritech-root flex flex-col h-full bg-bg-1 text-text-0">
      {/* ── Header : close / title / save ───────────────────────────────── */}
      <div
        className="flex items-center justify-between border-b border-border bg-bg-2 px-4 py-3"
        style={{ minHeight: 56 }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className={[
            'pressable inline-flex h-9 w-9 items-center justify-center rounded-md',
            'bg-bg-1 border border-border text-text-1',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
          ].join(' ')}
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className="min-w-0 text-center px-3">
          <h2
            className="agritech-heading text-[14px] uppercase tracking-wide leading-none truncate"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Édition
          </h2>
          {idValue && (
            <p className="mt-1 font-mono text-[11px] text-text-2 leading-none truncate tabular-nums">
              {idValue}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!headerReady || loading}
          aria-label="Valider les modifications"
          className={[
            'pressable inline-flex items-center gap-1.5 h-9 px-3 rounded-md',
            'bg-accent text-bg-0 font-mono text-[12px] font-semibold uppercase tracking-wide',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
            (!headerReady || loading) ? 'opacity-40 cursor-not-allowed' : '',
          ].join(' ')}
        >
          <Save size={14} aria-hidden="true" />
          Valider
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <IonLoading isOpen={loading} message="Synchronisation…" spinner="bubbles" />

        {!headerReady ? (
          <div
            className="flex flex-col items-center justify-center gap-3 py-20 px-5 text-center"
            role="status"
          >
            <AlertCircle size={32} className="text-amber" aria-hidden="true" />
            <p className="font-mono text-[12px] uppercase tracking-wide text-text-1">
              Chargement du schéma de la table…
            </p>
            <p className="font-mono text-[11px] text-text-2 max-w-xs leading-relaxed">
              L'édition sera disponible dès que les colonnes seront synchronisées avec Sheets.
            </p>
          </div>
        ) : (
          <>
            <div className="px-4 pt-4">
              <PhotoStrip subjectType={getSubjectType()} subjectId={String(idValue)} />
            </div>

            <div className="px-4 py-4 space-y-4 pb-8">
              {header.map((col, index) => {
                const initialValue = rowData[index];
                const isId = col === meta.idHeader;
                const useNumberInput = isNumericColumn(col, initialValue);
                const currentValue = formData[col] ?? formatCellValue(initialValue);

                return (
                  <div key={col} className="space-y-1.5">
                    {/* Label */}
                    <label
                      htmlFor={`tr-edit-${col}`}
                      className="block font-mono text-[11px] uppercase tracking-wide text-text-1"
                    >
                      {col}
                    </label>

                    {/* Input */}
                    <input
                      id={`tr-edit-${col}`}
                      type="text"
                      inputMode={useNumberInput ? 'decimal' : 'text'}
                      className={[
                        'w-full rounded-md px-3 py-2.5',
                        'bg-bg-0 border text-text-0 placeholder:text-text-2',
                        'font-mono text-[13px] tabular-nums',
                        'outline-none transition-colors duration-[160ms]',
                        'focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-1px]',
                        isId
                          ? 'border-border opacity-50 cursor-not-allowed'
                          : 'border-border hover:border-text-2',
                      ].join(' ')}
                      placeholder={`Saisir ${col.toLowerCase()}…`}
                      value={currentValue}
                      disabled={isId}
                      aria-label={col}
                      onChange={e => {
                        setFormData({ ...formData, [col]: e.target.value });
                      }}
                    />

                    {/* Primary key notice */}
                    {isId && (
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck size={11} className="shrink-0 text-text-2" aria-hidden="true" />
                        <span className="font-mono text-[10px] uppercase tracking-wide text-text-2 italic">
                          Clé primaire immuable
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <IonToast
          isOpen={toast.show}
          message={toast.message}
          duration={3000}
          onDidDismiss={() => setToast({ show: false, message: '' })}
          position="top"
        />
      </div>
    </div>
  );
};

export default TableRowEdit;
