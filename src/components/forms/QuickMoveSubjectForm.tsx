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
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonToast } from '@ionic/react';
import { ArrowRight, Move } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { Button, Textarea } from '@/design-system';
import { listLoges, moveSubject } from '../../services/supabaseWrites';
import { useEscapeKey } from './useFormA11y';
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
  const [loges, setLoges] = useState<Loge[]>([]);
  const [loadingLoges, setLoadingLoges] = useState(false);
  const [selectedLogeId, setSelectedLogeId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [toast, setToast] = useState<string>('');

  const [lastOpen, setLastOpen] = useState(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setSelectedLogeId('');
      setReason('');
      setError('');
      setSaving(false);
    }
  }

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
    onClose();
  }, [onClose, saving]);

  useEscapeKey(isOpen && !saving, handleClose);

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
      setToast('Sujet déplacé');
      onSuccess?.();
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur déplacement');
    } finally {
      setSaving(false);
    }
  };

  const labelCls =
    'block text-mono-label text-text-2';

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title={`Déplacer ${subjectLabel}`}
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-label="Déplacement vers loge"
        >
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Move size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-mono-label text-text-1 truncate">
                {subjectLabel}
              </p>
              {currentLogeNumero ? (
                <p className="text-[10px] text-text-2 mt-0.5">
                  De : {currentLogeNumero}
                </p>
              ) : (
                <p className="text-[10px] text-text-2 mt-0.5">
                  Aucune loge actuelle
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <span id="move-loge-label" className={labelCls}>
              Vers loge <span className="text-red normal-case">· requis</span>
            </span>
            {loadingLoges ? (
              <p className="text-[11px] text-text-2">
                Chargement des loges…
              </p>
            ) : grouped.length === 0 ? (
              <p
                className="rounded-md border border-dashed border-border bg-bg-1 px-3 py-3 text-[11px] text-text-2"
                role="status"
              >
                Aucune loge compatible disponible
              </p>
            ) : (
              <div
                role="radiogroup"
                aria-labelledby="move-loge-label"
                className="space-y-3 max-h-[40vh] overflow-y-auto"
              >
                {grouped.map(([type, lst]) => (
                  <div key={type} className="space-y-1.5">
                    <p className="text-mono-micro text-text-2">
                      {TYPE_LABEL[type]}
                    </p>
                    <div className="flex flex-wrap gap-2">
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
                            className={[
                              'pressable inline-flex items-center justify-center',
                              'h-9 px-3 rounded-md border',
                              'ft-code text-[12px] uppercase tracking-wide tabular-nums',
                              'transition-colors duration-[160ms]',
                              isSel
                                ? 'bg-accent text-bg-0 border-accent font-semibold'
                                : 'bg-bg-0 text-text-1 border-border hover:border-text-2',
                            ].join(' ')}
                          >
                            {l.numero}
                            {l.batiment ? ` · ${l.batiment}` : ''}
                            {l.capaciteMax != null
                              ? ` · ${l.capaciteMax}`
                              : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="move-reason" className={labelCls}>
              Raison du déplacement{' '}
              <span className="text-text-2 normal-case">· optionnel</span>
            </label>
            <Textarea
              id="move-reason"
              maxLength={200}
              placeholder="Ex: rotation maternité, regroupement, soin…"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="text-mono-label text-red"
            >
              {error}
            </p>
          ) : null}

          <div className="flex gap-3 justify-end px-4 py-3 border-t border-border">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={saving || !selectedLogeId}
              aria-busy={saving}
            >
              {saving ? (
                <span className="animate-pulse">Déplacement…</span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  Déplacer
                  <ArrowRight size={14} aria-hidden="true" />
                </span>
              )}
            </Button>
          </div>
        </form>
      </BottomSheet>

      <IonToast
        isOpen={toast !== ''}
        message={toast}
        duration={1800}
        onDidDismiss={() => setToast('')}
        position="bottom"
      />
    </>
  );
};

export default QuickMoveSubjectForm;
