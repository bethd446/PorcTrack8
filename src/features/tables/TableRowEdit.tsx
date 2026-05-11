/**
 * TableRowEdit — Agritech Dark
 * ══════════════════════════════════════════════════════════════════
 * Édition inline d'une ligne de table Supabase. Rendu à l'intérieur
 * d'un `<BottomSheet>` (agritech) : pas de wrapper IonModal propre.
 *
 * Conservations strictes :
 *   · Dynamic headers (placeholder "Chargement du schéma…")
 *   · Coercion numérique (poids/montant/quantité/ration/nb)
 *   · Helpers typés Supabase (updateSowByCode, updateBatchByCode, …)
 *   · PhotoStrip (subjectType déduit du sheetName)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { IonLoading, IonToast } from '@ionic/react';
import { ShieldCheck, AlertCircle, X, Save } from 'lucide-react';
import {
  updateSowByCode,
  updateBoarByCode,
  updateBatchByCode,
  updateProduitAliment,
  updateProduitVeto,
  updateNote,
  resolveProduitAlimentByCode,
  resolveProduitVetoByCode,
} from '../../services/supabaseWrites';
import PhotoStrip from '../../components/PhotoStrip';
import { Button } from '@/design-system';
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

  const mapPatchKey = (sheetName: string, col: string): string | null => {
    const c = col.trim().toUpperCase();
    const s = sheetName.toLowerCase();
    if (s === 'sows' || s === 'boars') {
      if (c === 'NOM' || c === 'NAME') return 'name';
      if (c === 'STATUT') return 'statut';
      if (c === 'STADE' || c === 'STATUT_REPRO') return 'statut_repro';
      if (c === 'RATION' || c === 'RATION_KG_J') return 'ration_kg_j';
      if (c === 'NB_PORTEES') return 'nb_portees';
      if (c === 'DATE_MB_PREVUE') return 'date_mb_prevue';
      if (c === 'BOUCLE') return 'boucle';
      if (c === 'RACE' || c === 'BREED') return 'breed';
      if (c === 'NOTES') return 'notes';
      if (c === 'ORIGINE') return 'origine';
      if (c === 'ALIMENTATION') return 'alimentation';
      return col.toLowerCase();
    }
    if (s === 'batches') {
      if (c === 'STATUT') return 'statut';
      if (c === 'DATE MB' || c === 'DATE_MB') return 'date_mise_bas';
      if (c === 'DATE SEVRAGE PRÉVUE' || c === 'DATE_SEVRAGE_PREVUE') return 'date_sevrage_prevue';
      if (c === 'DATE SEVRAGE RÉELLE' || c === 'DATE_SEVRAGE_REELLE') return 'date_sevrage';
      if (c === 'NV') return 'porcelets_nes_vivants';
      if (c === 'MORTS') return 'nb_mort_nes';
      if (c === 'POIDS_SEVRAGE_MOYEN') return 'poids_moyen_sevrage_kg';
      if (c === 'NOTES' || c === 'NOTES_SEVRAGE') return 'notes';
      if (c === 'PHASE') return 'phase';
      if (c === 'LOGE') return 'loge';
      return col.toLowerCase();
    }
    if (s === 'produits_aliments' || s === 'produits_veto') {
      if (c === 'LIBELLE') return 'libelle';
      if (c === 'STOCK_ACTUEL') return 'stock_actuel';
      if (c === 'SEUIL_ALERTE') return 'seuil_alerte';
      if (c === 'STOCK_MIN') return 'stock_min';
      if (c === 'UNITE') return 'unite';
      if (c === 'TYPE') return 'type';
      if (c === 'USAGE') return 'usage';
      if (c === 'NOTES') return 'notes';
      return col.toLowerCase();
    }
    if (s === 'notes') {
      if (c === 'NOTE' || c === 'TEXTE' || c === 'CONTENT') return 'content';
      if (c === 'CATEGORIE' || c === 'CATEGORY') return 'category';
      return null;
    }
    if (s === 'health_logs') {
      if (c === 'DATE') return 'log_date';
      if (c === 'TYPE_SOIN' || c === 'LOG_TYPE') return 'log_type';
      if (c === 'TRAITEMENT' || c === 'TREATMENT') return 'treatment';
      if (c === 'OBSERVATION' || c === 'NOTES') return 'notes';
      if (c === 'AUTEUR' || c === 'OPERATOR') return 'operator';
      if (c === 'CIBLE_ID' || c === 'ANIMAL_CODE') return 'animal_code';
      if (c === 'TYPE_ANIMAL' || c === 'ANIMAL_TYPE') return 'animal_type';
      return col.toLowerCase();
    }
    return col.toLowerCase();
  };

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
        const dbKey = mapPatchKey(meta.sheetName, col);
        if (dbKey) patch[dbKey] = currentVal;
      }
    });

    if (Object.keys(patch).length === 0) {
      onClose();
      setLoading(false);
      return;
    }

    try {
      const sheet = meta.sheetName.toLowerCase();
      let success = false;
      let message = '';

      if (sheet === 'sows') {
        const r = await updateSowByCode(idValue, patch);
        success = !!r;
      } else if (sheet === 'boars') {
        const r = await updateBoarByCode(idValue, patch);
        success = !!r;
      } else if (sheet === 'batches') {
        const r = await updateBatchByCode(idValue, patch);
        success = !!r;
      } else if (sheet === 'produits_aliments') {
        const id = await resolveProduitAlimentByCode(idValue);
        if (id) {
          const r = await updateProduitAliment(id, patch);
          success = r.success;
          message = r.error ?? '';
        }
      } else if (sheet === 'produits_veto') {
        const id = await resolveProduitVetoByCode(idValue);
        if (id) {
          const r = await updateProduitVeto(id, patch);
          success = r.success;
          message = r.error ?? '';
        }
      } else if (sheet === 'notes') {
        const r = await updateNote(idValue, patch);
        success = r.success;
        message = r.error ?? '';
      } else {
        success = false;
        message = `Édition non supportée pour la table '${sheet}'`;
      }

      if (success) {
        setToast({ show: true, message: 'Mis à jour avec succès' });
        setTimeout(() => {
          onSaved();
          onClose();
        }, 800);
      } else {
        setToast({ show: true, message: message || 'Échec de la mise à jour' });
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (e) {
      setToast({ show: true, message: `Erreur: ${String(e)}` });
      setTimeout(() => {
        onClose();
      }, 1500);
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
        <Button
          variant="ghost"
          size="small"
          onClick={onClose}
          ariaLabel="Fermer"
          className={[
            'pressable inline-flex h-9 w-9 items-center justify-center rounded-md',
            'bg-bg-1 border border-border text-text-1',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
          ].join(' ')}
        >
          <X size={18} aria-hidden="true" />
        </Button>

        <div className="min-w-0 text-center px-3">
          <h2
            className="agritech-heading text-[14px] uppercase tracking-wide leading-none truncate"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Édition
          </h2>
          {idValue && (
            <p className="mt-1 ft-code text-[11px] text-text-2 leading-none truncate tabular-nums">
              {idValue}
            </p>
          )}
        </div>

        <Button
          variant="primary"
          size="small"
          onClick={handleSave}
          disabled={!headerReady || loading}
          ariaLabel="Valider les modifications"
          className={[
            'pressable inline-flex items-center gap-1.5 h-9 px-3 rounded-md',
            'bg-accent text-bg-0 text-[12px] font-semibold uppercase tracking-wide',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
            (!headerReady || loading) ? 'opacity-40 cursor-not-allowed' : '',
          ].join(' ')}
        >
          <Save size={14} aria-hidden="true" />
          Valider
        </Button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <IonLoading isOpen={loading} message="Synchronisation…" spinner="bubbles" />

        {!headerReady ? (
          <div
            className="flex flex-col items-center justify-center gap-3 py-20 px-5 text-center"
            role="status"
          >
            <AlertCircle size={30} className="text-amber" aria-hidden="true" />
            <p className="text-[12px] uppercase tracking-wide text-text-1">
              Chargement du schéma de la table…
            </p>
            <p className="text-[11px] text-text-2 max-w-xs leading-relaxed">
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
                      className="block text-[11px] uppercase tracking-wide text-text-1"
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
                        'text-[13px] tabular-nums',
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
                        <span className="text-[10px] uppercase tracking-wide text-text-2 italic">
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
