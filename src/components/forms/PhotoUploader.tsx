/**
 * PhotoUploader — Composant carré 200×200 pour upload + preview photo animal.
 *
 * Mobile-first :
 *  - input file avec `capture="environment"` (caméra arrière sur mobile)
 *  - compression côté client (canvas) avant upload Supabase
 *  - preview rounded-2xl, fallback placeholder neutre
 *  - bouton Supprimer si une photo existe
 *
 * Erreurs typées via PhotoUploadError → toast contextuel (bucket manquant,
 * compression, etc.).
 */
import React, { useCallback, useRef, useState } from 'react';
import { Camera, Trash2, Loader2 } from 'lucide-react';

import {
  uploadAnimalPhoto,
  deleteAnimalPhoto,
  PhotoUploadError,
} from '../../services/photoUpload';

export interface PhotoUploaderProps {
  photoUrl?: string;
  farmId: string;
  animalId: string;
  onUploaded: (url: string) => void;
  onDeleted: () => void;
  /** Override label visuel (défaut: "Photo de l'animal"). */
  label?: string;
  disabled?: boolean;
}

const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photoUrl,
  farmId,
  animalId,
  onUploaded,
  onDeleted,
  label = "Photo de l'animal",
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<'upload' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePick = useCallback(() => {
    if (disabled || busy) return;
    setError(null);
    inputRef.current?.click();
  }, [busy, disabled]);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setBusy('upload');
      setError(null);
      try {
        const url = await uploadAnimalPhoto(farmId, animalId, file);
        onUploaded(url);
      } catch (err) {
        if (err instanceof PhotoUploadError) {
          setError(err.message);
        } else {
          setError(err instanceof Error ? err.message : 'Upload échoué');
        }
      } finally {
        setBusy(null);
        // reset l'input pour permettre de re-sélectionner le même fichier
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [animalId, farmId, onUploaded],
  );

  const handleDelete = useCallback(async () => {
    if (!photoUrl || busy) return;
    setBusy('delete');
    setError(null);
    try {
      await deleteAnimalPhoto(photoUrl);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression échouée');
    } finally {
      setBusy(null);
    }
  }, [busy, onDeleted, photoUrl]);

  return (
    <div className="flex flex-col gap-2">
      <label
        className="block text-[11px] uppercase tracking-wide text-text-2"
      >
        {label}
      </label>

      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handlePick}
          disabled={disabled || busy !== null}
          aria-label={photoUrl ? 'Changer la photo' : 'Ajouter une photo'}
          className={[
            'pressable relative w-[120px] h-[120px] rounded-2xl overflow-hidden',
            'bg-bg-app border border-border-default',
            'flex items-center justify-center',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-color-accent-500 focus-visible:outline-offset-2',
            disabled || busy !== null ? 'opacity-60 cursor-not-allowed' : 'hover:border-color-accent-500',
            'transition-colors duration-[160ms]',
          ].join(' ')}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Photo animal"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-text-2">
              <Camera size={26} aria-hidden="true" />
              <span className="text-[10px] uppercase">Ajouter</span>
            </div>
          )}
          {busy === 'upload' ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 size={22} className="animate-spin text-white" aria-hidden="true" />
            </div>
          ) : null}
        </button>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handlePick}
            disabled={disabled || busy !== null}
            className={[
              'pressable inline-flex items-center gap-2 px-3 h-9 rounded-md',
              'bg-bg-app border border-border-default text-text-1',
              'text-[11px] uppercase tracking-wide',
              'hover:border-text-2 transition-colors duration-[160ms]',
              disabled || busy !== null ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
          >
            <Camera size={13} aria-hidden="true" />
            {photoUrl ? 'Changer' : 'Ajouter'}
          </button>
          {photoUrl ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={disabled || busy !== null}
              className={[
                'pressable inline-flex items-center gap-2 px-3 h-9 rounded-md',
                'bg-bg-app border border-red text-red',
                'text-[11px] uppercase tracking-wide',
                'hover:bg-red hover:text-bg-0 transition-colors duration-[160ms]',
                disabled || busy !== null ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {busy === 'delete' ? (
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 size={13} aria-hidden="true" />
              )}
              Supprimer
            </button>
          ) : null}
          {error ? (
            <p role="alert" className="text-[10px] text-red max-w-[180px]">
              {error}
            </p>
          ) : (
            <p className="text-[10px] text-text-2 max-w-[180px]">
              JPEG/PNG · max 1 MB · compressé auto
            </p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFile}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
};

export default PhotoUploader;
