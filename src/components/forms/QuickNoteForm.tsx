import React, { useEffect, useState } from 'react';
import { IonSpinner, IonToast } from '@ionic/react';
import { Send, ClipboardList, Mic, MicOff, X, Camera, Loader2 } from 'lucide-react';
import { insertNote } from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useAuth } from '../../context/AuthContext';
import { kvGet } from '../../services/kvStore';
import { uploadAnimalPhoto, deleteAnimalPhoto, PhotoUploadError } from '../../services/photoUpload';
import { useVoiceDictation } from '../../services/voiceDictation';

/**
 * QuickNoteForm — Saisie rapide d'une note terrain enrichie (V21).
 *
 * Sections :
 *   1. Sujet (lecture seule)
 *   2. Photo (optionnelle, bucket farm-photos)
 *   3. Dictée vocale (Web Speech API, optionnelle)
 *   4. Tags (multi-select prédéfinis)
 *   5. Note libre (max 500 caractères)
 *
 * La validation requiert au minimum : note OU photo OU audio.
 */
interface QuickNoteFormProps {
  subjectType: 'BANDE' | 'TRUIE' | 'VERRAT';
  subjectId: string;
  onSuccess?: () => void;
}

export interface NoteTagDef {
  id: string;
  label: string;
  /** Tailwind classes appliquées quand le chip est sélectionné. */
  activeClass: string;
}

export const NOTE_TAGS: readonly NoteTagDef[] = [
  { id: 'santé', label: 'santé', activeClass: 'bg-red text-bg-0 border-red' },
  { id: 'repro', label: 'repro', activeClass: 'bg-pink-500 text-bg-0 border-pink-500' },
  { id: 'alimentation', label: 'alimentation', activeClass: 'bg-yellow-500 text-bg-0 border-yellow-500' },
  { id: 'bâtiment', label: 'bâtiment', activeClass: 'bg-blue-500 text-bg-0 border-blue-500' },
  { id: 'accident', label: 'accident', activeClass: 'bg-orange-500 text-bg-0 border-orange-500' },
  { id: 'comportement', label: 'comportement', activeClass: 'bg-purple-500 text-bg-0 border-purple-500' },
  { id: 'production', label: 'production', activeClass: 'bg-green-500 text-bg-0 border-green-500' },
  { id: 'autre', label: 'autre', activeClass: 'bg-bg-2 text-text-0 border-text-2' },
] as const;

const MAX_NOTE_LEN = 500;

export interface QuickNotePayload {
  content: string;
  category: string;
  author_id: string;
  photo_url: string | null;
  audio_url: string | null;
  tags: string[];
}

export function buildNotePayload(args: {
  subjectType: QuickNoteFormProps['subjectType'];
  subjectId: string;
  note: string;
  author: string;
  photoUrl: string | null;
  audioUrl: string | null;
  tags: string[];
}): QuickNotePayload {
  return {
    content: `[${args.subjectType}:${args.subjectId}] ${args.note.trim()}`,
    category: args.subjectType,
    author_id: args.author,
    photo_url: args.photoUrl,
    audio_url: args.audioUrl,
    tags: args.tags,
  };
}

export function validateNoteInputs(args: {
  note: string;
  photoUrl: string | null;
  audioUrl: string | null;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const hasNote = args.note.trim().length > 0;
  const hasMedia = !!args.photoUrl || !!args.audioUrl;
  if (!hasNote && !hasMedia) {
    errors.note = 'Note, photo ou audio requis';
  }
  if (args.note.length > MAX_NOTE_LEN) {
    errors.note = `Note trop longue (max ${MAX_NOTE_LEN} caractères)`;
  }
  return errors;
}

const QuickNoteForm: React.FC<QuickNoteFormProps> = ({ subjectType, subjectId, onSuccess }) => {
  const { refreshData } = useFarm();
  const { user } = useAuth();
  const farmId = user?.id ?? '';

  const [note, setNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState<'upload' | 'delete' | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dictation = useVoiceDictation('fr-FR');
  const author = kvGet('user_name') || 'Anonyme';

  // À chaque update du transcript pendant l'écoute, on rafraîchit le textarea
  // sans écraser ce que l'user a tapé manuellement avant le start().
  const [noteSnapshot, setNoteSnapshot] = useState('');
  useEffect(() => {
    if (dictation.isListening) {
      const sep = noteSnapshot && !noteSnapshot.endsWith(' ') ? ' ' : '';
      setNote(noteSnapshot + sep + dictation.transcript);
    }
  }, [dictation.transcript, dictation.isListening, noteSnapshot]);

  const handleStartDictation = (): void => {
    setNoteSnapshot(note);
    dictation.start();
  };
  const handleStopDictation = (): void => {
    dictation.stop();
  };

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const handlePickPhoto = (): void => {
    if (photoBusy) return;
    setPhotoError(null);
    fileInputRef.current?.click();
  };
  const handlePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!farmId) {
      setPhotoError('Session manquante — reconnexion requise');
      return;
    }
    setPhotoBusy('upload');
    setPhotoError(null);
    try {
      const noteRef = `note-${subjectType}-${subjectId}-${Date.now()}`;
      const url = await uploadAnimalPhoto(farmId, noteRef, file);
      setPhotoUrl(url);
    } catch (err) {
      if (err instanceof PhotoUploadError) {
        setPhotoError(err.message);
      } else {
        setPhotoError(err instanceof Error ? err.message : 'Upload échoué');
      }
    } finally {
      setPhotoBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const handleRemovePhoto = async (): Promise<void> => {
    if (!photoUrl || photoBusy) return;
    setPhotoBusy('delete');
    try {
      await deleteAnimalPhoto(photoUrl);
    } catch {
      /* best-effort */
    } finally {
      setPhotoUrl(null);
      setPhotoBusy(null);
    }
  };

  const toggleTag = (tagId: string): void => {
    setTags(prev => (prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]));
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const nextErrors = validateNoteInputs({ note, photoUrl, audioUrl: null });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const payload = buildNotePayload({
        subjectType,
        subjectId,
        note,
        author,
        photoUrl,
        audioUrl: null,
        tags,
      });
      await insertNote(payload);
      setNote('');
      setNoteSnapshot('');
      setPhotoUrl(null);
      setTags([]);
      const online = typeof navigator !== 'undefined' && navigator.onLine;
      setToast({
        show: true,
        message: online ? 'Note enregistrée' : 'Note mise en file · sync auto',
      });
      try {
        await refreshData(true);
      } catch {
        /* noop */
      }
      if (onSuccess) onSuccess();
    } catch {
      setToast({ show: true, message: 'Erreur enregistrement local' });
    } finally {
      setLoading(false);
    }
  };

  const submitDisabled = loading || (!note.trim() && !photoUrl);

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
        {/* 1 · Sujet */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-mono-label text-text-2">
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
            <label className="block text-mono-label text-text-2">
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

        {/* 2 · Photo */}
        <div className="space-y-1.5">
          <label className="block text-mono-label text-text-2">
            Photo (optionnelle)
          </label>
          <div className="flex items-start gap-3">
            {photoUrl ? (
              <div className="relative w-[96px] h-[96px] rounded-2xl overflow-hidden border border-border bg-bg-app">
                <img src={photoUrl} alt="Photo note" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  aria-label="Retirer la photo"
                  disabled={photoBusy !== null}
                  className="absolute top-1 right-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-black/70 text-white"
                >
                  {photoBusy === 'delete' ? (
                    <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <X size={12} aria-hidden="true" />
                  )}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handlePickPhoto}
                disabled={photoBusy !== null || loading}
                aria-label="Ajouter une photo"
                className={[
                  'pressable inline-flex items-center gap-2 px-3 h-9 rounded-md',
                  'bg-bg-0 border border-border text-text-1',
                  'text-mono-label',
                  'hover:border-text-2 transition-colors duration-[160ms]',
                  photoBusy !== null ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
              >
                {photoBusy === 'upload' ? (
                  <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Camera size={13} aria-hidden="true" />
                )}
                Ajouter une photo
              </button>
            )}
            {photoError ? (
              <p role="alert" className="font-mono text-[10px] text-red max-w-[180px]">
                {photoError}
              </p>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={handlePhotoFile}
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        {/* 3 · Tags */}
        <div className="space-y-1.5">
          <label className="block text-mono-label text-text-2">
            Tags (optionnels)
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tags note">
            {NOTE_TAGS.map(tag => {
              const active = tags.includes(tag.id);
              return (
                <button
                  type="button"
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  aria-pressed={active}
                  aria-label={`Tag ${tag.label}`}
                  className={[
                    'pressable inline-flex items-center px-2.5 h-7 rounded-full border',
                    'text-mono-micro',
                    'transition-colors duration-[160ms]',
                    active
                      ? tag.activeClass
                      : 'bg-bg-0 border-border text-text-2 hover:border-text-2',
                  ].join(' ')}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 · Dictée + 5 · Note libre */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="quick-note-text"
              className="block text-mono-label text-text-2"
            >
              Observation
            </label>
            <button
              type="button"
              onClick={dictation.isListening ? handleStopDictation : handleStartDictation}
              disabled={!dictation.isSupported || loading}
              aria-label={dictation.isListening ? 'Arrêter la dictée' : 'Démarrer la dictée'}
              aria-pressed={dictation.isListening}
              title={
                !dictation.isSupported
                  ? 'Dictée non supportée sur ce navigateur'
                  : dictation.isListening
                    ? 'Arrêter la dictée'
                    : 'Dictée vocale'
              }
              className={[
                'pressable inline-flex items-center gap-1.5 px-2 h-7 rounded-md',
                'text-mono-micro',
                'transition-colors duration-[160ms]',
                dictation.isListening
                  ? 'bg-red text-bg-0 border border-red animate-pulse'
                  : 'bg-bg-0 border border-border text-text-1 hover:border-text-2',
                !dictation.isSupported || loading ? 'opacity-40 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {dictation.isListening ? (
                <>
                  <MicOff size={11} aria-hidden="true" />
                  Écoute…
                </>
              ) : (
                <>
                  <Mic size={11} aria-hidden="true" />
                  Dicter
                </>
              )}
            </button>
          </div>
          <textarea
            id="quick-note-text"
            aria-label="Note terrain"
            aria-invalid={!!errors.note}
            aria-describedby={errors.note ? 'quick-note-error' : undefined}
            maxLength={MAX_NOTE_LEN}
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
            placeholder="Écris ton observation ici…"
            value={note}
            onChange={e => setNote(e.target.value)}
            disabled={loading}
          />
          <div className="flex items-center justify-between">
            {errors.note ? (
              <p id="quick-note-error" role="alert" className="font-mono text-[11px] text-red">
                {errors.note}
              </p>
            ) : (
              <span />
            )}
            <span className="font-mono text-[10px] text-text-2 tabular-nums">
              {note.length}/{MAX_NOTE_LEN}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitDisabled}
          aria-label="Enregistrer la note"
          className={[
            'pressable w-full h-[48px] rounded-md',
            'inline-flex items-center justify-center gap-2',
            'bg-accent text-bg-0 font-mono text-[12px] font-bold uppercase tracking-wide',
            'transition-colors duration-[160ms]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
            submitDisabled ? 'opacity-40 cursor-not-allowed' : '',
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
