/**
 * QuickSplitBandeForm — V36-E P3 — Splitter une bande en plusieurs.
 * ════════════════════════════════════════════════════════════════════════
 * Wizard 3 étapes :
 *   1. Sélection des porcelets à déplacer (checkboxes)
 *   2. Loge destination (avec contrôle capacité)
 *   3. Récap → INSERT nouvelle bande + UPDATE porcelets.batch_id
 *
 * Cas d'usage : bande "ADDM" (117 porcelets dont 22 mâles) sans loge → on
 * répartit dans plusieurs loges sans tout re-saisir.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonModal, IonToast } from '@ionic/react';

import { Wizard, type WizardStep } from '@/design-system';
import {
  getLogeContents,
  listLoges,
  listPorceletsByBatch,
  splitBatch,
} from '../../services/supabaseWrites';
import { todayIso } from './quickAddBandeFromLogeLogic';
import {
  autoDetectSplitPhase,
  buildSplitBatchDraft,
  computePoidsMoyen,
  validateSplitStep1,
  validateSplitStep2,
} from './quickSplitBandeLogic';
import type { Loge, PorceletIndividuel } from '../../types/farm';

export interface QuickSplitBandeFormProps {
  isOpen: boolean;
  onClose: () => void;
  /** UUID de la bande source. */
  bandeId: string;
  /** Code_id source (pour les notes générées). Optionnel. */
  bandeCodeId?: string;
  onSuccess: () => void;
}

// ─── Styles (tokens --pt-*) ──────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--pt-font-mono)',
  fontSize: 'var(--pt-text-label)',
  letterSpacing: 'var(--pt-tracking-label)',
  color: 'var(--pt-text-muted)',
  textTransform: 'uppercase',
  marginBottom: 6,
};

const hintStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-mono)',
  fontSize: 10,
  color: 'var(--pt-text-subtle)',
  marginTop: 4,
};

const errStyle: React.CSSProperties = {
  fontFamily: 'var(--pt-font-mono)',
  fontSize: 11,
  color: 'var(--pt-danger)',
  marginTop: 4,
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '10px 14px',
  background: 'var(--pt-surface)',
  color: 'var(--pt-text)',
  border: `1px solid var(--pt-divider)`,
  borderRadius: 'var(--pt-radius-pill)',
  fontFamily: 'var(--pt-font-body)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

// ─────────────────────────────────────────────────────────────────────────────

const QuickSplitBandeForm: React.FC<QuickSplitBandeFormProps> = ({
  isOpen,
  onClose,
  bandeId,
  bandeCodeId,
  onSuccess,
}) => {
  const [porcelets, setPorcelets] = useState<PorceletIndividuel[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loges, setLoges] = useState<Loge[]>([]);
  const [destLogeId, setDestLogeId] = useState<string>('');
  const [destOccupation, setDestOccupation] = useState<number>(0);
  const [step1Error, setStep1Error] = useState<string>('');
  const [step2Error, setStep2Error] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string>('');

  // Reset à l'ouverture / changement bande
  const [lastKey, setLastKey] = useState<{ open: boolean; bid: string }>({
    open: isOpen,
    bid: bandeId,
  });
  if (lastKey.open !== isOpen || lastKey.bid !== bandeId) {
    setLastKey({ open: isOpen, bid: bandeId });
    if (isOpen) {
      setSelectedIds(new Set());
      setDestLogeId('');
      setDestOccupation(0);
      setStep1Error('');
      setStep2Error('');
      setSaving(false);
    }
  }

  // Chargement porcelets + loges à l'ouverture
  useEffect(() => {
    if (!isOpen || !bandeId) return;
    let cancelled = false;
    Promise.all([listPorceletsByBatch(bandeId), listLoges()])
      .then(([ps, ls]) => {
        if (cancelled) return;
        setPorcelets(ps);
        setLoges(ls.filter(l => l.active));
      })
      .catch(err => {
        if (cancelled) return;
        console.warn('[split-bande] load failed', err);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, bandeId]);

  // Recharge l'occupation de la loge destination
  useEffect(() => {
    if (!destLogeId) {
      setDestOccupation(0);
      return;
    }
    let cancelled = false;
    getLogeContents(destLogeId)
      .then(c => {
        if (!cancelled) setDestOccupation(c.totalAnimaux);
      })
      .catch(err => {
        if (!cancelled) console.warn('[split-bande] occupation failed', err);
      });
    return () => {
      cancelled = true;
    };
  }, [destLogeId]);

  const togglePorcelet = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(porcelets.map(p => p.id)));
  }, [porcelets]);

  const clearAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedPorcelets = useMemo<PorceletIndividuel[]>(
    () => porcelets.filter(p => selectedIds.has(p.id)),
    [porcelets, selectedIds],
  );

  const destLoge = useMemo<Loge | null>(
    () => loges.find(l => l.id === destLogeId) ?? null,
    [loges, destLogeId],
  );

  const phaseAuto = useMemo(
    () => autoDetectSplitPhase(selectedPorcelets),
    [selectedPorcelets],
  );

  const poidsMoyen = useMemo(
    () => computePoidsMoyen(selectedPorcelets),
    [selectedPorcelets],
  );

  // ── Validations par étape ────────────────────────────────────────────────

  const validateStep1 = useCallback((): boolean => {
    const r = validateSplitStep1(
      Array.from(selectedIds),
      porcelets.length,
    );
    setStep1Error(r.ok ? '' : r.error ?? 'Sélection invalide');
    return r.ok;
  }, [selectedIds, porcelets.length]);

  const validateStep2 = useCallback((): boolean => {
    const r = validateSplitStep2(destLoge, destOccupation, selectedIds.size);
    setStep2Error(r.ok ? '' : r.error ?? 'Loge invalide');
    return r.ok;
  }, [destLoge, destOccupation, selectedIds.size]);

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleComplete = useCallback(async () => {
    if (!destLoge) return;
    if (selectedIds.size === 0) return;
    setSaving(true);
    try {
      const draft = buildSplitBatchDraft({
        todayIso: todayIso(),
        loge: destLoge,
        selectedPorcelets,
        sourceCodeId: bandeCodeId ?? bandeId,
      });
      const res = await splitBatch({
        sourceBatchId: bandeId,
        porceletsIds: Array.from(selectedIds),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newBatchPayload: draft as any,
      });
      setToast(
        `Split OK · ${res.movedCount} porcelets → ${res.newCodeId}` +
          (res.sourceArchivedAsRecap ? ' · source archivée' : ''),
      );
      onSuccess();
      onClose();
    } catch (err) {
      setToast(
        err instanceof Error ? `Erreur : ${err.message}` : 'Erreur split',
      );
    } finally {
      setSaving(false);
    }
  }, [
    destLoge,
    selectedIds,
    selectedPorcelets,
    bandeId,
    bandeCodeId,
    onClose,
    onSuccess,
  ]);

  // ── Steps ────────────────────────────────────────────────────────────────

  const steps: WizardStep[] = [
    {
      label: 'Sélection',
      validate: () => validateStep1(),
      render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              borderRadius: 'var(--pt-radius-md)',
              background: 'var(--pt-surface-alt)',
              fontFamily: 'var(--pt-font-mono)',
              fontSize: 12,
              color: 'var(--pt-text)',
            }}
            data-testid="split-counter"
          >
            <span>
              {selectedIds.size}/{porcelets.length} sélectionnés
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={selectAll}
                disabled={porcelets.length === 0}
                style={{
                  minHeight: 32,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontFamily: 'var(--pt-font-body)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--pt-tracking-button)',
                  background: 'transparent',
                  border: '1px solid var(--pt-divider)',
                  borderRadius: 'var(--pt-radius-pill)',
                  color: 'var(--pt-text)',
                  cursor: porcelets.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Tout
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={selectedIds.size === 0}
                style={{
                  minHeight: 32,
                  padding: '4px 10px',
                  fontSize: 11,
                  fontFamily: 'var(--pt-font-body)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--pt-tracking-button)',
                  background: 'transparent',
                  border: '1px solid var(--pt-divider)',
                  borderRadius: 'var(--pt-radius-pill)',
                  color: 'var(--pt-text)',
                  cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Aucun
              </button>
            </div>
          </div>

          {porcelets.length === 0 ? (
            <p style={{ ...hintStyle, fontSize: 12, padding: 12 }}>
              Aucun porcelet dans cette bande.
            </p>
          ) : (
            <ul
              data-testid="split-porcelets"
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                maxHeight: 360,
                overflowY: 'auto',
              }}
            >
              {porcelets.map(p => {
                const checked = selectedIds.has(p.id);
                return (
                  <li key={p.id}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 12px',
                        minHeight: 44,
                        borderRadius: 'var(--pt-radius-md)',
                        background: checked
                          ? 'var(--pt-surface-alt)'
                          : 'var(--pt-surface)',
                        border: `1px solid ${
                          checked ? 'var(--pt-primary)' : 'var(--pt-divider)'
                        }`,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePorcelet(p.id)}
                        aria-label={`Sélectionner ${p.boucle}`}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                      <span
                        style={{
                          flex: 1,
                          fontFamily: 'var(--pt-font-mono)',
                          fontSize: 13,
                          color: 'var(--pt-text)',
                          textTransform: 'uppercase',
                        }}
                      >
                        {p.boucle}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--pt-font-mono)',
                          fontSize: 11,
                          color: 'var(--pt-text-muted)',
                        }}
                      >
                        {p.sexe === 'M' ? '♂' : p.sexe === 'F' ? '♀' : '?'}
                        {p.poidsCourantKg != null
                          ? ` · ${p.poidsCourantKg} kg`
                          : ''}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {step1Error ? (
            <p role="alert" style={errStyle} data-testid="split-step1-error">
              {step1Error}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      label: 'Loge destination',
      validate: () => validateStep2(),
      render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label htmlFor="split-loge" style={labelStyle}>
              Loge destination · requise
            </label>
            <select
              id="split-loge"
              data-testid="split-loge-select"
              style={selectStyle}
              value={destLogeId}
              onChange={e => setDestLogeId(e.target.value)}
              disabled={saving}
            >
              <option value="">— Choisir —</option>
              {loges.map(l => (
                <option key={l.id} value={l.id}>
                  {l.numero} · {l.type.toLowerCase().replace('_', '-')}
                  {l.batiment ? ` · ${l.batiment}` : ''}
                  {l.capaciteMax != null ? ` (max ${l.capaciteMax})` : ''}
                </option>
              ))}
            </select>
            <p style={hintStyle}>
              {destLoge
                ? destLoge.capaciteMax != null
                  ? `Occupation : ${destOccupation} / ${destLoge.capaciteMax} · après split : ${destOccupation + selectedIds.size}`
                  : `Occupation : ${destOccupation} · pas de limite`
                : 'Sélectionne une loge active.'}
            </p>
            {step2Error ? (
              <p role="alert" style={errStyle} data-testid="split-step2-error">
                {step2Error}
              </p>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      label: 'Récap & confirmation',
      render: () => {
        const recapCodeId = destLoge
          ? buildSplitBatchDraft({
              todayIso: todayIso(),
              loge: destLoge,
              selectedPorcelets,
              sourceCodeId: bandeCodeId ?? bandeId,
            }).code_id
          : '—';
        const willEmptySource = selectedIds.size === porcelets.length;
        return (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            data-testid="split-recap"
          >
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--pt-radius-md)',
                background: 'var(--pt-surface-alt)',
                fontFamily: 'var(--pt-font-body)',
                fontSize: 14,
                color: 'var(--pt-text)',
              }}
            >
              <strong style={{ fontFamily: 'var(--pt-font-display)' }}>
                Déplacer {selectedIds.size} porcelet
                {selectedIds.size > 1 ? 's' : ''}
              </strong>{' '}
              vers{' '}
              <span
                style={{
                  fontFamily: 'var(--pt-font-mono)',
                  textTransform: 'uppercase',
                }}
              >
                {destLoge?.numero ?? '—'}
              </span>
            </div>

            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '8px 14px',
                fontFamily: 'var(--pt-font-mono)',
                fontSize: 12,
                color: 'var(--pt-text-muted)',
                margin: 0,
              }}
            >
              <dt>Nouveau code</dt>
              <dd
                style={{
                  margin: 0,
                  color: 'var(--pt-text)',
                  textTransform: 'uppercase',
                }}
                data-testid="split-recap-codeid"
              >
                {recapCodeId}
              </dd>
              <dt>Phase auto</dt>
              <dd
                style={{ margin: 0, color: 'var(--pt-text)' }}
                data-testid="split-recap-phase"
              >
                {phaseAuto.label}
              </dd>
              <dt>Poids moyen</dt>
              <dd style={{ margin: 0, color: 'var(--pt-text)' }}>
                {poidsMoyen != null ? `${poidsMoyen.toFixed(1)} kg` : '—'}
              </dd>
              <dt>Bande source</dt>
              <dd style={{ margin: 0, color: 'var(--pt-text)' }}>
                {willEmptySource
                  ? 'Sera archivée (RECAP)'
                  : `Reste ${porcelets.length - selectedIds.size} porcelets`}
              </dd>
            </dl>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <IonModal isOpen={isOpen} onDidDismiss={onClose}>
        <Wizard
          id={`split-bande-${bandeId}`}
          steps={steps}
          eyebrow={`Splitter · ${bandeCodeId ?? bandeId}`}
          onCancel={onClose}
          onComplete={handleComplete}
          completeLabel="Splitter"
          busy={saving}
        />
      </IonModal>

      <IonToast
        isOpen={toast !== ''}
        message={toast}
        duration={2400}
        onDidDismiss={() => setToast('')}
        position="bottom"
      />
    </>
  );
};

export default QuickSplitBandeForm;
