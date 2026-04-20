import React, { useState } from 'react';
import { IonSpinner, IonToast } from '@ionic/react';
import { Send, ClipboardList } from 'lucide-react';
import { enqueueAppendRow } from '../../services/offlineQueue';

/**
 * QuickNoteForm — Saisie rapide d'une note terrain (Agritech Dark)
 *
 * Rendu inline dans une card ou dans un <BottomSheet>.
 * Types acceptés par le schéma canonique NOTES_TERRAIN (TYPE_ANIMAL, col 2).
 * 'PORTEE' volontairement absent (n'existe pas dans le schéma) — utiliser 'BANDE'.
 */
interface QuickNoteFormProps {
  subjectType: 'BANDE' | 'TRUIE' | 'VERRAT';
  subjectId: string;
  onSuccess?: () => void;
}

const QuickNoteForm: React.FC<QuickNoteFormProps> = ({ subjectType, subjectId, onSuccess }) => {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const author = typeof window !== 'undefined'
    ? (localStorage.getItem('user_name') || 'Anonyme')
    : 'Anonyme';

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!note.trim()) nextErrors.note = 'Note requise';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      // Schéma canonique NOTES_TERRAIN (5 colonnes) :
      //   DATE | TYPE_ANIMAL | ID_ANIMAL | NOTE | AUTEUR
      const values = [
        new Date().toISOString().slice(0, 10),
        subjectType,
        subjectId,
        note.trim(),
        author,
      ];

      await enqueueAppendRow('NOTES_TERRAIN', values);
      setNote('');
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      setToast({
        show: true,
        message: online ? 'Note enregistrée' : 'Note mise en file · sync auto',
      });
      if (onSuccess) onSuccess();
    } catch {
      setToast({ show: true, message: 'Erreur enregistrement local' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-dense !p-5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-bg-2 text-accent">
          <ClipboardList size={16} aria-hidden="true" />
        </div>
        <h3 className="font-mono text-[11px] font-bold uppercase tracking-wide text-text-1">
          Saisie rapide note
        </h3>
      </div>

      {/* ── Form ────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sujet read-only (info) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block font-mono text-[11px] uppercase tracking-wide text-text-2">
              Sujet
            </label>
            <div
              className={[
                'inline-flex items-center h-9 w-full px-3 rounded-md',
                'bg-bg-0 border border-border',
                'font-mono text-[12px] uppercase tracking-wide text-text-1 tabular-nums truncate',
              ].join(' ')}
              aria-label={`Sujet ${subjectType} ${subjectId}`}
            >
              {subjectType} · {subjectId}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block font-mono text-[11px] uppercase tracking-wide text-text-2">
              Auteur
            </label>
            <div
              className={[
                'inline-flex items-center h-9 w-full px-3 rounded-md',
                'bg-bg-0 border border-border',
                'font-mono text-[12px] uppercase tracking-wide text-text-1 truncate',
              ].join(' ')}
              aria-label={`Auteur ${author}`}
            >
              {author}
            </div>
          </div>
        </div>

        {/* Textarea */}
        <div className="space-y-1.5">
          <label
            htmlFor="quick-note-text"
            className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
          >
            Observation
          </label>
          <textarea
            id="quick-note-text"
            aria-label="Note terrain"
            aria-invalid={!!errors.note}
            aria-describedby={errors.note ? 'quick-note-error' : undefined}
            className={[
              'w-full rounded-md px-3 py-3',
              'bg-bg-0 border text-text-0 placeholder:text-text-2',
              'font-mono text-[13px]',
              'outline-none transition-colors duration-[160ms]',
              'focus:border-accent focus:ring-1 focus:ring-accent',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-1px]',
              'min-h-[120px] resize-y',
              errors.note ? 'border-red' : 'border-border hover:border-text-2',
            ].join(' ')}
            placeholder="Écrivez votre observation ici…"
            value={note}
            onChange={e => setNote(e.target.value)}
            disabled={loading}
          />
          {errors.note && (
            <p
              id="quick-note-error"
              role="alert"
              className="font-mono text-[11px] text-red mt-1"
            >
              {errors.note}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !note.trim()}
          aria-label="Enregistrer la note"
          className={[
            'pressable w-full h-[48px] rounded-md',
            'inline-flex items-center justify-center gap-2',
            'bg-accent text-bg-0 font-mono text-[12px] font-bold uppercase tracking-wide',
            'transition-colors duration-[160ms]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
            (loading || !note.trim()) ? 'opacity-40 cursor-not-allowed' : '',
          ].join(' ')}
        >
          {loading ? (
            <IonSpinner name="bubbles" className="w-5 h-5" aria-hidden="true" />
          ) : (
            <>
              <span>Enregistrer note</span>
              <Send size={14} className="flex-shrink-0" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <IonToast
        isOpen={toast.show}
        message={toast.message}
        duration={3000}
        onDidDismiss={() => setToast({ show: false, message: '' })}
        position="bottom"
      />
    </div>
  );
};

export default QuickNoteForm;
