/**
 * QuickAddLogeForm — Création rapide d'une loge (V24)
 * ════════════════════════════════════════════════════════════════════════
 * Form minimal pour ajouter une loge depuis QuickEditBandeForm (sélecteur
 * "+ Nouvelle loge"). V6-C enrichira ce formulaire (page admin /troupeau/loges).
 *
 * Champs : numéro (text required) · type (select 9 valeurs) · bâtiment (opt)
 * · capacité (0..500 opt) · notes (opt). Submit → `createLoge(...)`.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { IonToast } from '@ionic/react';
import { Plus, Save } from 'lucide-react';

import { BottomSheet } from '../agritech';
import { FormField, Input, Select, Textarea, Button } from '@/design-system';
import { createLoge, listLoges } from '../../services/supabaseWrites';
import { useEscapeKey, useFocusFirstInput } from './useFormA11y';
import type { Loge, LogeType } from '../../types/farm';

const LOGE_TYPES: { value: LogeType; label: string }[] = [
  { value: 'MATERNITE', label: 'Maternité' },
  { value: 'POST_SEVRAGE', label: 'Post-sevrage' },
  { value: 'CROISSANCE', label: 'Croissance' },
  { value: 'ENGRAISSEMENT', label: 'Engraissement' },
  { value: 'FINITION', label: 'Finition' },
  { value: 'GESTANTE', label: 'Gestante' },
  { value: 'VERRAT', label: 'Verrat' },
  { value: 'INFIRMERIE', label: 'Infirmerie' },
  { value: 'AUTRE', label: 'Autre' },
];

interface QuickAddLogeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (loge: Loge) => void;
}

const QuickAddLogeForm: React.FC<QuickAddLogeFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [numero, setNumero] = useState('');
  const [type, setType] = useState<LogeType>('MATERNITE');
  const [batiment, setBatiment] = useState('');
  const [capaciteMax, setCapaciteMax] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [existingNumeros, setExistingNumeros] = useState<Set<string>>(new Set());

  // V25 — Charge les numéros existants pour vérifier l'unicité côté UI.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    listLoges()
      .then(rows => {
        if (cancelled) return;
        setExistingNumeros(
          new Set(rows.filter(l => l.active).map(l => l.numero.trim().toLowerCase())),
        );
      })
      .catch(() => {
        if (!cancelled) setExistingNumeros(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const [lastOpen, setLastOpen] = useState(isOpen);
  if (lastOpen !== isOpen) {
    setLastOpen(isOpen);
    if (isOpen) {
      setNumero('');
      setType('MATERNITE');
      setBatiment('');
      setCapaciteMax('');
      setNotes('');
      setErrors({});
      setSaving(false);
    }
  }

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  useEscapeKey(isOpen && !saving, handleClose);
  const firstFieldRef = useFocusFirstInput<HTMLInputElement>(isOpen);

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    const trimmed = numero.trim();
    if (!trimmed) errs.numero = 'Numéro requis';
    else if (trimmed.length > 20) errs.numero = 'Maximum 20 caractères';
    else if (existingNumeros.has(trimmed.toLowerCase())) {
      errs.numero = `Numéro "${trimmed}" déjà utilisé`;
    }
    if (capaciteMax) {
      const n = Number(capaciteMax);
      if (!Number.isFinite(n) || n < 0 || n > 500) {
        errs.capaciteMax = 'Capacité 0..500';
      }
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const created = await createLoge({
        numero: numero.trim(),
        type,
        batiment: batiment.trim() || undefined,
        capaciteMax: capaciteMax ? Number(capaciteMax) : undefined,
        notes: notes.trim() || undefined,
      });
      setToast('Loge créée');
      onSuccess?.(created);
      onClose();
    } catch (err) {
      setToast(
        err instanceof Error ? `Erreur : ${err.message}` : 'Erreur enregistrement',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={handleClose}
        title="Nouvelle loge"
        height="full"
      >
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-label="Création loge"
        >
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Plus size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="text-mono-label text-text-1">
                Ajouter une loge
              </p>
              <p className="text-[12px] text-text-2 mt-0.5">
                Numéro libre · type · capacité optionnelle
              </p>
            </div>
          </div>

          <FormField label="Numéro" required error={errors.numero}>
            <Input
              id="add-loge-numero"
              ref={firstFieldRef}
              type="text"
              aria-label="Numéro de la loge"
              maxLength={20}
              aria-invalid={!!errors.numero}
              aria-describedby={errors.numero ? 'add-loge-numero-error' : undefined}
              className="ft-code uppercase tracking-wide"
              placeholder="Ex: M-01"
              value={numero}
              onChange={e => setNumero(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              invalid={!!errors.numero}
            />
          </FormField>

          <FormField label="Type" required>
            <Select
              id="add-loge-type"
              aria-label="Type de loge"
              value={type}
              onChange={e => setType(e.target.value as LogeType)}
            >
              {LOGE_TYPES.map(t => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Bâtiment" hint="optionnel">
            <Input
              id="add-loge-batiment"
              type="text"
              aria-label="Bâtiment"
              maxLength={30}
              placeholder="Ex: Bât. A"
              value={batiment}
              onChange={e => setBatiment(e.target.value)}
              autoComplete="off"
            />
          </FormField>

          <FormField label="Capacité max" hint="optionnel (0-500)" error={errors.capaciteMax}>
            <Input
              id="add-loge-capacite"
              type="number"
              aria-label="Capacité max"
              inputMode="numeric"
              min={0}
              max={500}
              step={1}
              aria-invalid={!!errors.capaciteMax}
              aria-describedby={
                errors.capaciteMax ? 'add-loge-capacite-error' : undefined
              }
              placeholder="0"
              value={capaciteMax}
              onChange={e => setCapaciteMax(e.target.value)}
              invalid={!!errors.capaciteMax}
            />
          </FormField>

          <FormField label="Notes" hint="optionnel">
            <Textarea
              id="add-loge-notes"
              aria-label="Notes"
              maxLength={200}
              placeholder="Observations…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </FormField>

          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saving}
              aria-busy={saving}
            >
              {saving ? 'Création…' : (
                <span className="inline-flex items-center gap-2">
                  Créer la loge
                  <Save size={14} aria-hidden="true" />
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

export default QuickAddLogeForm;
