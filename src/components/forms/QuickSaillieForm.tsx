import React, { useState } from 'react';
import { Heart, Check, CheckCircle2 } from 'lucide-react';
import { useFarm } from '../../context/FarmContext';
import {
  insertSaillie,
  resolveSowIdByCode,
  resolveBoarIdByCode,
} from '../../services/supabaseWrites';
import { BottomSheet } from '../agritech';
import { Button } from '@/design-system';
import { normaliseStatut } from '../../lib/truieStatut';

/**
 * QuickSaillieForm — Modal rapide pour enregistrer une saillie
 *
 * Agritech Dark : utilise <BottomSheet> wrapper.
 * 2 taps au lieu de 5 clics. Accessible depuis le Cockpit "Aujourd'hui".
 */

interface QuickSaillieFormProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pré-sélectionne une truie (displayId) à l'ouverture (depuis la fiche truie). */
  defaultTruieDisplayId?: string;
}

const QuickSaillieForm: React.FC<QuickSaillieFormProps> = ({ isOpen, onClose, defaultTruieDisplayId }) => {
  const { truies, verrats, refreshData } = useFarm();
  const [selectedTruie, setSelectedTruie] = useState(defaultTruieDisplayId ?? '');
  const [selectedVerrat, setSelectedVerrat] = useState('');

  const [lastOpenKey, setLastOpenKey] = useState<{ isOpen: boolean; defaultTruieDisplayId: string | undefined }>({
    isOpen,
    defaultTruieDisplayId,
  });
  if (lastOpenKey.isOpen !== isOpen || lastOpenKey.defaultTruieDisplayId !== defaultTruieDisplayId) {
    setLastOpenKey({ isOpen, defaultTruieDisplayId });
    if (isOpen && defaultTruieDisplayId) {
      setSelectedTruie(defaultTruieDisplayId);
    }
  }
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Truies disponibles pour saillie : celles en VIDE (en attente saillie / post-sevrage)
  // ou toute truie qui n'est ni en gestation ni en maternité (hors REFORME).
  const truiesDisponibles = truies.filter(t => {
    const c = normaliseStatut(t.statut);
    if (c === 'VIDE') return true;
    return c !== 'PLEINE' && c !== 'MATERNITE' && c !== 'REFORME';
  });

  const handleSave = async (): Promise<void> => {
    if (!selectedTruie || !selectedVerrat) return;
    setSaving(true);
    try {
      const [sowId, boarId] = await Promise.all([
        resolveSowIdByCode(selectedTruie),
        resolveBoarIdByCode(selectedVerrat),
      ]);
      await insertSaillie({
        sow_id: sowId,
        boar_id: boarId,
        sow_code_id: selectedTruie,
        boar_code_id: selectedVerrat,
        date_saillie: new Date().toISOString().slice(0, 10),
        statut: 'SAILLIE',
        notes: 'Saillie enregistrée depuis PorcTrack',
      });
      try { await refreshData(true); } catch { /* noop */ }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedTruie('');
        setSelectedVerrat('');
        onClose();
      }, 1500);
    } catch (e) {
      console.error('Erreur enregistrement saillie:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (): void => {
    setSelectedTruie('');
    setSelectedVerrat('');
    setSuccess(false);
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title="Enregistrer une saillie"
      height="full"
    >
      {success ? (
        /* ── Success state ───────────────────────────────────────────── */
        <div
          className="flex flex-col items-center justify-center py-20 animate-scale-in"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2
            size={64}
            className="text-accent mb-4"
            aria-hidden="true"
            strokeWidth={1.5}
          />
          <p className="agritech-heading text-[18px] uppercase tracking-wide">
            Saillie enregistrée
          </p>
          <p className="mt-2 text-[12px] uppercase tracking-wide text-text-2">
            {selectedTruie} × {selectedVerrat}
          </p>
        </div>
      ) : (
        /* ── Form ────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Header description */}
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent">
              <Heart size={18} aria-hidden="true" />
            </div>
            <p className="text-mono-label text-text-1">
              Sélectionnez la truie et le verrat
            </p>
          </div>

          {/* ── Truie selection ───────────────────────────────────────── */}
          <div className="space-y-2">
            <span
              id="saillie-truie-label"
              className="block text-mono-label text-text-2"
            >
              Truie
            </span>
            {truiesDisponibles.length > 0 ? (
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-labelledby="saillie-truie-label"
              >
                {truiesDisponibles.map(t => {
                  const isSelected = selectedTruie === t.displayId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`Sélectionner la truie ${t.displayId}`}
                      onClick={() => setSelectedTruie(t.displayId)}
                      className={[
                        'pressable inline-flex items-center justify-center',
                        'h-9 px-3 rounded-md border',
                        'text-[12px] uppercase tracking-wide tabular-nums',
                        'transition-colors duration-[160ms]',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                        isSelected
                          ? 'bg-accent text-bg-0 border-accent font-semibold'
                          : 'bg-bg-0 text-text-1 border-border hover:border-text-2',
                      ].join(' ')}
                    >
                      {t.displayId}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-mono-label text-text-2">
                Aucune truie disponible
              </p>
            )}
          </div>

          {/* ── Verrat selection ──────────────────────────────────────── */}
          <div className="space-y-2">
            <span
              id="saillie-verrat-label"
              className="block text-mono-label text-text-2"
            >
              Verrat
            </span>
            {verrats.length > 0 ? (
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-labelledby="saillie-verrat-label"
              >
                {verrats.map(v => {
                  const isSelected = selectedVerrat === v.displayId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`Sélectionner le verrat ${v.displayId}`}
                      onClick={() => setSelectedVerrat(v.displayId)}
                      className={[
                        'pressable inline-flex items-center justify-center',
                        'h-9 px-3 rounded-md border',
                        'text-[12px] uppercase tracking-wide tabular-nums',
                        'transition-colors duration-[160ms]',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                        isSelected
                          ? 'bg-accent text-bg-0 border-accent font-semibold'
                          : 'bg-bg-0 text-text-1 border-border hover:border-text-2',
                      ].join(' ')}
                    >
                      {v.displayId}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-mono-label text-text-2">
                Aucun verrat actif
              </p>
            )}
          </div>

          {/* ── Confirm button ────────────────────────────────────────── */}
          <Button
            variant="primary"
            fullWidth
            onClick={handleSave}
            disabled={!selectedTruie || !selectedVerrat || saving}
            ariaLabel="Confirmer la saillie"
          >
            {saving ? (
              <span className="animate-pulse">Enregistrement…</span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Check size={16} aria-hidden="true" />
                Confirmer la saillie
              </span>
            )}
          </Button>

          {selectedTruie && selectedVerrat && (
            <p className="text-center text-mono-label text-text-2 tabular-nums">
              {selectedTruie} × {selectedVerrat} · {new Date().toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>
      )}
    </BottomSheet>
  );
};

export default QuickSaillieForm;
