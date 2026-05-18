import React, { useEffect, useState } from 'react';
import { IonSpinner } from '@ionic/react';
import { Send, ClipboardList, Mic, MicOff, X, Camera, Loader2 } from 'lucide-react';
import { insertNote } from '../../services/supabaseWrites';
import { useFarm } from '../../context/FarmContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { kvGet } from '../../services/kvStore';
import { uploadAnimalPhoto, deleteAnimalPhoto, PhotoUploadError } from '../../services/photoUpload';
import { useVoiceDictation } from '../../services/voiceDictation';
import { FieldError } from './_formFields';

/**
 * QuickNoteForm — Saisie rapide d'une note terrain enrichie (V21 · V78 sheet V77).
 *
 * Sections :
 *   1. Sujet (lecture seule)
 *   2. Photo (optionnelle, bucket farm-photos)
 *   3. Dictée vocale (Web Speech API, optionnelle)
 *   4. Tags (multi-select prédéfinis)
 *   5. Note libre (max 500 caractères)
 *
 * La validation requiert au minimum : note OU photo OU audio.
 *
 * NOTE : ce composant est embarqué dans un BottomSheet/IonModal fourni par
 * le parent (AgritechNavV2, VerratDetailView, BandeDetailView). Il ne porte
 * donc PAS son propre wrapper sheet — il fournit juste le markup V77 du
 * corps (header `step-pill`, fields `label--v77`, CTA `.btn--primary`).
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
  const { showToast } = useToast();
  const farmId = user?.id ?? '';

  const [note, setNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState<'upload' | 'delete' | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
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

  // Erreur de dictée → toast utilisateur + restauration du snapshot.
  // Sur mobile (Android Chrome, Safari iOS), `no-speech` et `network` sont
  // fréquents et silencieux côté UI sans ce feedback explicite.
  useEffect(() => {
    if (!dictation.errorMessage) return;
    showToast(dictation.errorMessage, 'error', 3500);
    if (noteSnapshot) setNote(noteSnapshot);
    dictation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictation.errorMessage]);

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
      showToast(
        online
          ? `Note ajoutée · ${subjectType} ${subjectId}`
          : `Note mise en file · sync auto · ${subjectType} ${subjectId}`,
        online ? 'success' : 'info',
      );
      try {
        await refreshData(true);
      } catch {
        /* noop */
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(
        (err as Error)?.message ?? "Erreur lors de l'enregistrement de la note",
        'error',
        4000,
      );
    } finally {
      setLoading(false);
    }
  };

  const submitDisabled = loading || (!note.trim() && !photoUrl);

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Header eyebrow + sujet ────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div
          className="inline-flex items-center justify-center"
          style={{
            height: 32,
            width: 32,
            borderRadius: 10,
            background: 'var(--pt-bg)',
            color: 'var(--pt-primary)',
            flex: '0 0 auto',
          }}
        >
          <ClipboardList size={16} aria-hidden="true" />
        </div>
        <div>
          <div className="eyebrow">Saisie rapide note</div>
          <div style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 12, color: 'var(--pt-ink)' }}>
            {subjectType} · {subjectId}
          </div>
        </div>
      </div>

      <div className="step-pill">Étape 1 / 3 · Identification</div>

      {/* 1 · Sujet (lecture seule) */}
      <div className="field--inline">
        <div className="field">
          <label className="label--v77">SUJET</label>
          <input
            type="text"
            className="field__input mono filled"
            value={`${subjectType} · ${subjectId}`}
            readOnly
            aria-label={`Sujet ${subjectType} ${subjectId}`}
          />
        </div>
        <div className="field">
          <label className="label--v77">AUTEUR</label>
          <input
            type="text"
            className="field__input mono filled"
            value={author}
            readOnly
            aria-label={`Auteur ${author}`}
          />
        </div>
      </div>

      <div className="step-pill">Étape 2 / 3 · Média & tags</div>

      {/* 2 · Photo */}
      <div className="field">
        <label className="label--v77">
          PHOTO <span className="hint">optionnel</span>
        </label>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {photoUrl ? (
            <div
              style={{
                position: 'relative',
                width: 96,
                height: 96,
                borderRadius: 16,
                overflow: 'hidden',
                border: '1px solid var(--pt-line)',
                background: 'var(--pt-bg)',
              }}
            >
              <img src={photoUrl} alt="Photo note" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button
                type="button"
                onClick={handleRemovePhoto}
                aria-label="Retirer la photo"
                disabled={photoBusy !== null}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                }}
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
              className="btn btn--ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
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
            <p role="alert" style={{ fontSize: 10, color: 'var(--pt-danger)', maxWidth: 180, margin: 0 }}>
              {photoError}
            </p>
          ) : null}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}
          onChange={handlePhotoFile}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {/* 3 · Tags */}
      <div className="field">
        <label className="label--v77">
          TAGS <span className="hint">optionnel</span>
        </label>
        <div className="radio-chips--cards" role="group" aria-label="Tags note">
          {NOTE_TAGS.map(tag => {
            const active = tags.includes(tag.id);
            return (
              <button
                type="button"
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                aria-pressed={active}
                aria-label={`Tag ${tag.label}`}
                className={`radio-chip--card${active ? ' is-selected' : ''}`}
              >
                <div className="radio-chip__code">{tag.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="step-pill">Étape 3 / 3 · Observation</div>

      {/* 4 · Dictée + 5 · Note libre */}
      <div className="field">
        <label className="label--v77" htmlFor="quick-note-text" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>OBSERVATION</span>
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
            className={dictation.isListening ? 'btn btn--primary' : 'btn btn--ghost'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 8px',
              fontSize: 10,
              height: 28,
              opacity: !dictation.isSupported || loading ? 0.4 : 1,
              cursor: !dictation.isSupported || loading ? 'not-allowed' : 'pointer',
            }}
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
        </label>
        <textarea
          id="quick-note-text"
          className="field__input"
          style={{ minHeight: 96, resize: 'vertical' }}
          aria-label="Note terrain"
          aria-invalid={!!errors.note}
          maxLength={MAX_NOTE_LEN}
          placeholder="Écris ton observation ici…"
          value={note}
          onChange={e => setNote(e.target.value)}
          disabled={loading}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <FieldError message={errors.note} />
          <span style={{ fontFamily: 'var(--pt-font-mono)', fontSize: 10, color: 'var(--pt-subtle)' }}>
            {note.length}/{MAX_NOTE_LEN}
          </span>
        </div>
      </div>

      <button
        type="submit"
        className="btn btn--primary"
        disabled={submitDisabled}
        aria-label="Enregistrer la note"
        style={{ width: '100%', marginTop: 12 }}
      >
        {loading ? (
          <IonSpinner name="bubbles" style={{ width: 20, height: 20 }} aria-hidden="true" />
        ) : (
          <>
            <Send size={14} aria-hidden="true" />
            Enregistrer note
          </>
        )}
      </button>
    </form>
  );
};

export default QuickNoteForm;
