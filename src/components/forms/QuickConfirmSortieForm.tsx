/**
 * QuickConfirmSortieForm — V75-l
 * ════════════════════════════════════════════════════════════════════
 * Bottom sheet pour matérialiser la sortie d'une truie déjà en réforme :
 * vente, abattoir ou mortalité. Le parent persiste les 3 colonnes
 * `date_sortie / type_sortie / prix_sortie_fcfa` côté Supabase.
 */
import React, { useEffect, useState } from 'react';

import { BottomSheet } from '../agritech';
import { FormField, Input, Button } from '@/design-system';
import type { Truie } from '../../types/farm';

export type SortieType = 'VENTE' | 'ABATTOIR' | 'MORTALITE';

export interface QuickConfirmSortieFormData {
  dateSortie: string;
  typeSortie: SortieType;
  prixSortieFcfa?: number;
  /** V75-o-a (F-16) — note libre éleveur, concaténée à `truie.notes` côté parent. */
  notes?: string;
}

export interface QuickConfirmSortieFormProps {
  isOpen: boolean;
  truie: Pick<Truie, 'displayId'>;
  onClose: () => void;
  onConfirm: (data: QuickConfirmSortieFormData) => void;
}

const TYPES: { value: SortieType; label: string }[] = [
  { value: 'VENTE', label: 'Vente' },
  { value: 'ABATTOIR', label: 'Abattoir' },
  { value: 'MORTALITE', label: 'Mortalité' },
];

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const QuickConfirmSortieForm: React.FC<QuickConfirmSortieFormProps> = ({
  isOpen,
  truie,
  onClose,
  onConfirm,
}) => {
  const [dateSortie, setDateSortie] = useState<string>(todayIso());
  const [typeSortie, setTypeSortie] = useState<SortieType>('VENTE');
  const [prixSortieRaw, setPrixSortieRaw] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDateSortie(todayIso());
      setTypeSortie('VENTE');
      setPrixSortieRaw('');
      setNotes('');
      setError(null);
    }
  }, [isOpen]);

  const handleConfirm = (): void => {
    if (!dateSortie) {
      setError('La date de sortie est obligatoire.');
      return;
    }
    let prixSortieFcfa: number | undefined;
    if (typeSortie === 'VENTE' && prixSortieRaw.trim() !== '') {
      const parsed = Number(prixSortieRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError('Le prix doit être un nombre positif.');
        return;
      }
      prixSortieFcfa = parsed;
    }
    const trimmedNotes = notes.trim();
    onConfirm({
      dateSortie,
      typeSortie,
      prixSortieFcfa,
      notes: trimmedNotes !== '' ? trimmedNotes : undefined,
    });
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`Sortir ${truie.displayId} du cheptel`}
      height="auto"
    >
      <div className="space-y-5">
        <FormField label="Date de sortie">
          <Input
            id="sortie-date"
            type="date"
            aria-label="Date de sortie"
            value={dateSortie}
            onChange={e => setDateSortie(e.target.value)}
            max={todayIso()}
          />
        </FormField>

        <FormField label="Type de sortie">
          <div
            role="radiogroup"
            aria-label="Type de sortie"
            style={{ display: 'flex', gap: 8 }}
          >
            {TYPES.map(t => {
              const active = typeSortie === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTypeSortie(t.value)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: `1px solid ${active ? 'var(--pt-green-deep, #064e3b)' : 'var(--line, #e2e8f0)'}`,
                    background: active ? 'var(--pt-green-deep, #064e3b)' : 'var(--bg-surface, #fff)',
                    color: active ? '#fff' : 'var(--ink, #0f172a)',
                    fontFamily: 'var(--font-heading, inherit)',
                    fontSize: 13,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </FormField>

        {typeSortie === 'VENTE' && (
          <FormField label="Prix de vente (FCFA)">
            <Input
              id="sortie-prix"
              type="number"
              min={0}
              max={999999999}
              inputMode="numeric"
              aria-label="Prix de vente en FCFA"
              value={prixSortieRaw}
              onChange={e => setPrixSortieRaw(e.target.value)}
              placeholder="Optionnel"
            />
          </FormField>
        )}

        {/* V75-o-a (F-16) — note libre éleveur (contexte / raison). */}
        <FormField label="Notes (optionnel)">
          <textarea
            id="sortie-notes"
            aria-label="Notes ou raison de la sortie"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ex. vendu au voisin Konan, abattage forcé suite à boiterie…"
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid var(--line, #e2e8f0)',
              background: 'var(--bg-surface, #fff)',
              color: 'var(--ink, #0f172a)',
              fontFamily: 'var(--font-body, inherit)',
              fontSize: 14,
              lineHeight: 1.4,
              resize: 'vertical',
              minHeight: 64,
            }}
          />
        </FormField>

        {error && (
          <p role="alert" className="text-[11px] text-red">
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            variant="ghost"
            fullWidth
            onClick={onClose}
            ariaLabel="Annuler la sortie"
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={handleConfirm}
            ariaLabel={`Confirmer la sortie de ${truie.displayId}`}
          >
            Confirmer la sortie
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default QuickConfirmSortieForm;
export { QuickConfirmSortieForm };
