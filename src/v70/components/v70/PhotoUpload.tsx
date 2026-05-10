/**
 * V73 Vague R — `<PhotoUpload>` (galerie multi-photos par entité).
 *
 * Wrapper léger autour de `uploadEntityPhoto` avec :
 *  - input file `accept="image/*"` + `capture="environment"` (caméra arrière mobile)
 *  - drag & drop desktop
 *  - queue séquentielle si plusieurs fichiers sélectionnés
 *  - état idle / compressing / uploading / done / error par fichier
 *  - tokens DNA V70 (`var(--pt-*)`)
 *  - mobile-first (cible 44 px tap, padding généreux)
 */
import React, { useCallback, useRef, useState } from 'react';
import { Camera, Loader2, AlertCircle, Check } from 'lucide-react';
import {
  uploadEntityPhoto,
  PhotoUploadError,
  type EntityType,
  type PhotoUploadResult,
} from '../../../services/photoUpload';

export interface PhotoUploadProps {
  entityType: EntityType;
  entityId: string;
  onUploaded: (result: PhotoUploadResult) => void;
  multiple?: boolean;
  /** Limite locale (info utilisateur ; n'empêche pas l'upload). */
  maxPhotos?: number;
  disabled?: boolean;
  /** Compteur photos déjà présentes (pour respecter `maxPhotos`). */
  currentCount?: number;
}

type Phase = 'idle' | 'compressing' | 'uploading' | 'done' | 'error';

interface FileState {
  id: string;
  name: string;
  phase: Phase;
  error?: string;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  entityType,
  entityId,
  onUploaded,
  multiple = false,
  maxPhotos,
  disabled = false,
  currentCount = 0,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [queue, setQueue] = useState<FileState[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const limitReached =
    typeof maxPhotos === 'number' ? currentCount >= maxPhotos : false;

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) => !!f);
      if (arr.length === 0) return;

      const slots = typeof maxPhotos === 'number'
        ? Math.max(0, maxPhotos - currentCount - queue.filter((q) => q.phase !== 'error').length)
        : arr.length;
      const toProcess = arr.slice(0, slots || arr.length);

      const initial = toProcess.map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        name: f.name,
        phase: 'compressing' as Phase,
      }));
      setQueue((q) => [...q, ...initial]);

      // Queue séquentielle pour éviter de saturer le Web Worker.
      for (let i = 0; i < toProcess.length; i++) {
        const file = toProcess[i];
        const id = initial[i].id;
        try {
          setQueue((q) => q.map((s) => (s.id === id ? { ...s, phase: 'uploading' } : s)));
          const result = await uploadEntityPhoto(entityType, entityId, file);
          setQueue((q) => q.map((s) => (s.id === id ? { ...s, phase: 'done' } : s)));
          onUploaded(result);
        } catch (err) {
          const msg =
            err instanceof PhotoUploadError
              ? err.message
              : err instanceof Error
                ? err.message
                : 'Upload échoué';
          setQueue((q) => q.map((s) => (s.id === id ? { ...s, phase: 'error', error: msg } : s)));
        }
      }

      // Auto-reset des "done" après 1.5s
      setTimeout(() => {
        setQueue((q) => q.filter((s) => s.phase !== 'done'));
      }, 1500);
    },
    [entityType, entityId, onUploaded, maxPhotos, currentCount, queue],
  );

  const handlePick = useCallback(() => {
    if (disabled || limitReached) return;
    inputRef.current?.click();
  }, [disabled, limitReached]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        void processFiles(files);
      }
      if (inputRef.current) inputRef.current.value = '';
    },
    [processFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled || limitReached) return;
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        void processFiles(files);
      }
    },
    [disabled, limitReached, processFiles],
  );

  const isBusy = queue.some((s) => s.phase === 'compressing' || s.phase === 'uploading');

  return (
    <div className="flex flex-col gap-2">
      <div
        onClick={handlePick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handlePick();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !limitReached) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={disabled || limitReached ? -1 : 0}
        aria-label={multiple ? 'Ajouter des photos' : 'Ajouter une photo'}
        aria-disabled={disabled || limitReached}
        className="flex flex-col items-center justify-center gap-2 p-4 cursor-pointer transition-all"
        style={{
          minHeight: 110,
          borderRadius: 16,
          border: `1.5px dashed ${dragOver ? 'var(--pt-primary)' : 'var(--pt-line-strong)'}`,
          background: dragOver ? 'var(--pt-warm)' : 'var(--pt-bg)',
          opacity: disabled || limitReached ? 0.5 : 1,
          cursor: disabled || limitReached ? 'not-allowed' : 'pointer',
        }}
      >
        {isBusy ? (
          <Loader2
            size={28}
            strokeWidth={1.5}
            className="animate-spin"
            style={{ color: 'var(--pt-primary)' }}
            aria-hidden="true"
          />
        ) : (
          <Camera
            size={28}
            strokeWidth={1.5}
            style={{ color: 'var(--pt-muted)' }}
            aria-hidden="true"
          />
        )}
        <span
          style={{
            fontFamily: 'var(--pt-font-display)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: 13,
            color: 'var(--pt-ink)',
          }}
        >
          {limitReached
            ? `Limite atteinte (${maxPhotos})`
            : isBusy
              ? 'Traitement…'
              : multiple
                ? 'Ajouter des photos'
                : 'Ajouter une photo'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--pt-muted)' }}>
          JPG · PNG · WEBP · HEIC · GIF — auto-compressées
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        className="sr-only"
        onChange={handleChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      {queue.length > 0 ? (
        <ul className="flex flex-col gap-1.5 mt-1" aria-live="polite">
          {queue.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2 px-3 py-2 text-xs"
              style={{
                borderRadius: 10,
                background: 'var(--pt-bg)',
                border: '1px solid var(--pt-line)',
              }}
            >
              {s.phase === 'compressing' || s.phase === 'uploading' ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                  style={{ color: 'var(--pt-primary)', flexShrink: 0 }}
                  aria-hidden="true"
                />
              ) : s.phase === 'done' ? (
                <Check
                  size={14}
                  style={{ color: 'var(--pt-success)', flexShrink: 0 }}
                  aria-hidden="true"
                />
              ) : s.phase === 'error' ? (
                <AlertCircle
                  size={14}
                  style={{ color: 'var(--pt-danger)', flexShrink: 0 }}
                  aria-hidden="true"
                />
              ) : null}
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: 'var(--pt-ink)',
                }}
              >
                {s.name}
              </span>
              <span style={{ color: 'var(--pt-muted)' }}>
                {s.phase === 'compressing'
                  ? 'compression'
                  : s.phase === 'uploading'
                    ? 'upload'
                    : s.phase === 'done'
                      ? 'OK'
                      : s.phase === 'error'
                        ? (s.error ?? 'erreur')
                        : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export default PhotoUpload;
