/**
 * QuickMoveSubjectForm — V6-B (Vague 6 Bandes multi-mères + Loges, Sprint 3)
 * ════════════════════════════════════════════════════════════════════════
 * Form modal pour déplacer un sujet (truie / verrat / bande) vers une loge.
 *
 * Filtre les loges actives par type compatible avec le sujet :
 *   - TRUIE  → MATERNITE / GESTANTE / VERRAT / INFIRMERIE / AUTRE
 *   - VERRAT → VERRAT / INFIRMERIE / AUTRE
 *   - BANDE  → POST_SEVRAGE / CROISSANCE / ENGRAISSEMENT / FINITION /
 *              INFIRMERIE
 *
 * Submit → moveSubject({...}) qui (1) lit la loge actuelle (2) INSERT
 * loge_movements (3) PATCH subject.loge_id.
 *
 * Conforme FORM_CONTRACT Phase 1 :
 *  - shell `<QuickActionSheet>` (form onSubmit + bouton type=submit)
 *  - toast canonique `useToast()` (context global, remplace IonToast local)
 *  - validation : état `error` + rendu via `<FieldError>`
 *  - reset-on-open via `lastOpenKey` render-phase
 *  - garde double-clic : `saving` maintenu jusqu'au `onClose`, `closeTimerRef`
 *    + cleanup `useEffect`
 *
 * Le picker de loge reste un radiogroup custom : `<EntityPicker>` est dédié
 * aux truies / verrats (forme `PickableEntity`), pas aux loges groupées par
 * type. On préserve les `data-testid="loge-X"` + `role="radio"` attendus par
 * les tests.
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Move } from 'lucide-react';

import { useToast } from '../../context/ToastContext';
import { listLoges, moveSubject } from '../../services/supabaseWrites';
import { FieldError } from './_formFields';
import QuickActionSheet from './QuickActionSheet';
import type { Loge, LogeType } from '../../types/farm';

export interface QuickMoveSubjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  subjectType: 'TRUIE' | 'VERRAT' | 'BANDE';
  subjectId: string;
  /** Affichage humain du sujet, ex: "T-001 · Bella". */
  subjectLabel: string;
  currentLogeId?: string;
  currentLogeNumero?: string;
  onSuccess?: () => void;
}

const ALLOWED_TYPES: Record<
  QuickMoveSubjectFormProps['subjectType'],
  LogeType[]
> = {
  TRUIE: ['MATERNITE', 'GESTANTE', 'VERRAT', 'INFIRMERIE', 'AUTRE'],
  VERRAT: ['VERRAT', 'INFIRMERIE', 'AUTRE'],
  BANDE: [
    'POST_SEVRAGE',
    'CROISSANCE',
    'ENGRAISSEMENT',
    'FINITION',
    'INFIRMERIE',
  ],
};

const TYPE_LABEL: Record<LogeType, string> = {
  MATERNITE: 'Maternité',
  POST_SEVRAGE: 'Post-sevrage',
  CROISSANCE: 'Croissance',
  ENGRAISSEMENT: 'Engraissement',
  FINITION: 'Finition',
  GESTANTE: 'Gestante',
  VERRAT: 'Verrat',
  INFIRMERIE: 'Infirmerie',
  AUTRE: 'Autre',
};

const QuickMoveSubjectForm: React.FC<QuickMoveSubjectFormProps> = ({
  isOpen,
  onClose,
  subjectType,
  subjectId,
  subjectLabel,
  currentLogeId,
  currentLogeNumero,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const [loges, setLoges] = useState<Loge[]>([]);
  const [loadingLoges, setLoadingLoges] = useState(false);
  const [selectedLogeId, setSelectedLogeId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset-on-open : pattern lastOpenKey render-phase (FORM_CONTRACT).
  const [lastOpenKey, setLastOpenKey] = useState<{ isOpen: boolean }>({ isOpen });
  if (lastOpenKey.isOpen !== isOpen) {
    setLastOpenKey({ isOpen });
    if (isOpen) {
      setSelectedLogeId('');
      setReason('');
      setError('');
      setSaving(false);
    }
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingLoges(true);
    listLoges()
      .then(rows => {
        if (cancelled) return;
        setLoges(rows);
      })
      .catch(err => {
        console.warn('[move-subject] listLoges failed', err);
      })
      .finally(() => {
        if (!cancelled) setLoadingLoges(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (saving) return;
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    onClose();
  }, [onClose, saving]);

  // Filtre loges compatibles + actives + exclut la loge courante.
  const allowed = ALLOWED_TYPES[subjectType];
  const grouped = useMemo(() => {
    const map = new Map<LogeType, Loge[]>();
    for (const l of loges) {
      if (!l.active) continue;
      if (!allowed.includes(l.type)) continue;
      if (currentLogeId && l.id === currentLogeId) continue;
      const arr = map.get(l.type) ?? [];
      arr.push(l);
      map.set(l.type, arr);
    }
    return Array.from(map.entries()).sort((a, b) =>
      TYPE_LABEL[a[0]].localeCompare(TYPE_LABEL[b[0]]),
    );
  }, [loges, allowed, currentLogeId]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    if (!selectedLogeId) {
      setError('Sélectionne une loge de destination');
      return;
    }
    setSaving(true);
    try {
      await moveSubject({
        subjectType,
        subjectId,
        toLogeId: selectedLogeId,
        reason: reason.trim() || undefined,
      });
      showToast('Sujet déplacé', 'success', 1800);
      onSuccess?.();
      // Garder saving=true jusqu'au onClose pour empêcher le double-clic
      // pendant la fenêtre de toast (FORM_CONTRACT).
      closeTimerRef.current = setTimeout(() => {
        closeTimerRef.current = null;
        setSaving(false);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur déplacement');
      setSaving(false);
    }
  };

  return (
    <QuickActionSheet
      isOpen={isOpen}
      onClose={handleClose}
      eyebrow="Déplacement"
      title={`Déplacer ${subjectLabel}`}
      ariaLabel="Déplacement vers loge"
      saving={saving}
      isValid={!!selectedLogeId}
      onSubmit={handleSubmit}
      submitLabel="Déplacer"
      submitAriaLabel="Déplacer"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          aria-hidden="true"
          style={{ display: 'inline-flex', height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: 'var(--pt-bg)', color: 'var(--pt-accent)' }}
        >
          <Move size={18} aria-hidden="true" />
        </div>
        <div style={{ minWidth: 0 }}>
          <p className="label--v77" style={{ margin: 0 }}>{subjectLabel}</p>
          <p style={{ margin: 0, marginTop: 2, fontSize: 10, color: 'var(--pt-subtle)' }}>
            {currentLogeNumero ? `De : ${currentLogeNumero}` : 'Aucune loge actuelle'}
          </p>
        </div>
      </div>

      <div className="field">
        <span id="move-loge-label" className="label--v77">
          VERS LOGE <span className="req">requis</span>
        </span>
        {loadingLoges ? (
          <p style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 12, color: 'var(--pt-subtle)' }}>
            Chargement des loges…
          </p>
        ) : grouped.length === 0 ? (
          <p
            role="status"
            style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 12, color: 'var(--pt-subtle)', margin: 0 }}
          >
            Aucune loge compatible disponible
          </p>
        ) : (
          <div
            role="radiogroup"
            aria-labelledby="move-loge-label"
            style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '40vh', overflowY: 'auto' }}
          >
            {grouped.map(([type, lst]) => (
              <div key={type} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ margin: 0, fontFamily: 'var(--pt-font-mono)', fontSize: 11, color: 'var(--pt-subtle)' }}>
                  {TYPE_LABEL[type]}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {lst.map(l => {
                    const isSel = selectedLogeId === l.id;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        role="radio"
                        aria-checked={isSel}
                        aria-label={`Sélectionner loge ${l.numero}`}
                        data-testid={`loge-${l.numero}`}
                        onClick={() => setSelectedLogeId(l.id)}
                        className={`radio-chip--card${isSel ? ' is-selected' : ''}`}
                        disabled={saving}
                      >
                        {l.numero}
                        {l.batiment ? ` · ${l.batiment}` : ''}
                        {l.capaciteMax != null ? ` · ${l.capaciteMax}` : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <label className="label--v77" htmlFor="move-reason">
          RAISON DU DÉPLACEMENT <span className="hint">optionnel</span>
        </label>
        <textarea
          id="move-reason"
          maxLength={200}
          className={`field__input${reason ? ' filled' : ' field__input--ghost'}`}
          placeholder="Ex: rotation maternité, regroupement, soin…"
          value={reason}
          onChange={e => setReason(e.target.value)}
          disabled={saving}
        />
      </div>

      <FieldError message={error} />
    </QuickActionSheet>
  );
};

export default QuickMoveSubjectForm;
