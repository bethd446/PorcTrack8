/**
 * V73 Vague R — `<PhotoGallery>` (lecture + lightbox + suppression).
 *
 * - Liste les photos d'une entité via `listEntityPhotos`
 * - Grid responsive (3 cols mobile, 4 cols ≥ 640 px)
 * - Lazy loading thumbnails (`loading="lazy"`)
 * - Lightbox plein écran au clic (swipe gauche/droite, fermeture overlay)
 * - Suppression via `deleteEntityPhoto` (confirmation modale légère)
 * - Empty state si 0 photo
 *
 * Note PWA : la lightbox utilise un overlay fixed + transforms CSS, pas de
 * bibliothèque externe (zoom natif via meta viewport + tap to zoom navigateur).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ImageOff, Trash2, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import {
  listEntityPhotos,
  deleteEntityPhoto,
  type EntityType,
  type EntityPhoto,
} from '../../../services/photoUpload';

export interface PhotoGalleryProps {
  entityType: EntityType;
  entityId: string;
  /** Token de rafraîchissement : changer la valeur force un re-fetch. */
  refreshKey?: number | string;
  emptyLabel?: string;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  entityType,
  entityId,
  refreshKey,
  emptyLabel = 'Aucune photo pour le moment',
}) => {
  const [photos, setPhotos] = useState<EntityPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true);
    try {
      const list = await listEntityPhotos(entityType, entityId);
      if (signal?.cancelled) return;
      setPhotos(list);
    } finally {
      if (!signal?.cancelled) setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    const signal = { cancelled: false };
    void refresh(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [refresh, refreshKey]);

  const handleDelete = useCallback(
    async (path: string) => {
      setDeleting(true);
      try {
        await deleteEntityPhoto(path);
        setPhotos((p) => p.filter((x) => x.path !== path));
        setLightboxIdx(null);
      } catch (err) {
        console.warn('[PhotoGallery] delete failed', err);
      } finally {
        setDeleting(false);
        setPendingDelete(null);
      }
    },
    [],
  );

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prev = useCallback(
    () => setLightboxIdx((i) => (i === null ? i : (i - 1 + photos.length) % photos.length)),
    [photos.length],
  );
  const next = useCallback(
    () => setLightboxIdx((i) => (i === null ? i : (i + 1) % photos.length)),
    [photos.length],
  );

  // Keyboard navigation lightbox
  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIdx, closeLightbox, prev, next]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-6"
        style={{ color: 'var(--pt-muted)' }}
      >
        <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-6"
        style={{ color: 'var(--pt-muted)' }}
      >
        <ImageOff size={24} strokeWidth={1.5} aria-hidden="true" />
        <p style={{ fontSize: 12 }}>{emptyLabel}</p>
      </div>
    );
  }

  return (
    <>
      <ul
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}
      >
        {photos.map((p, idx) => (
          <li key={p.path}>
            <button
              type="button"
              onClick={() => setLightboxIdx(idx)}
              aria-label={`Photo ${idx + 1} sur ${photos.length}`}
              className="block w-full overflow-hidden"
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 12,
                border: '1px solid var(--pt-line)',
                background: 'var(--pt-bg)',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <img
                src={p.url}
                alt={`Photo ${idx + 1}`}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </button>
          </li>
        ))}
      </ul>

      {lightboxIdx !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visionneuse photo"
          onClick={closeLightbox}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <img
            src={photos[lightboxIdx].url}
            alt={`Photo ${lightboxIdx + 1}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              userSelect: 'none',
            }}
          />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
            aria-label="Fermer la visionneuse"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 44,
              height: 44,
              borderRadius: 22,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={20} aria-hidden="true" />
          </button>

          {photos.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Photo précédente"
                style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Photo suivante"
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPendingDelete(photos[lightboxIdx].path);
            }}
            aria-label="Supprimer cette photo"
            style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              padding: '10px 16px',
              borderRadius: 12,
              background: 'rgba(164,69,61,0.9)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontFamily: "'BigShoulders', system-ui, sans-serif",
              fontWeight: 600,
              textTransform: 'uppercase',
              fontSize: 12,
              letterSpacing: '0.05em',
            }}
          >
            <Trash2 size={14} aria-hidden="true" />
            Supprimer
          </button>

          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: 24,
              left: 16,
              color: 'rgba(255,255,255,0.7)',
              fontSize: 11,
              fontFamily: "'DMMono', monospace",
            }}
          >
            {lightboxIdx + 1} / {photos.length}
          </span>
        </div>
      ) : null}

      {pendingDelete ? (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirmer la suppression"
          onClick={() => !deleting && setPendingDelete(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--pt-bg)',
              borderRadius: 16,
              padding: 20,
              maxWidth: 320,
              width: '100%',
            }}
          >
            <h3
              style={{
                fontFamily: "'BigShoulders', system-ui, sans-serif",
                fontWeight: 700,
                textTransform: 'uppercase',
                fontSize: 15,
                color: 'var(--pt-ink)',
                marginBottom: 8,
              }}
            >
              Supprimer la photo ?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--pt-muted)', marginBottom: 16 }}>
              Cette action est définitive.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--pt-line-strong)',
                  background: 'transparent',
                  color: 'var(--pt-ink)',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete(pendingDelete)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--pt-danger)',
                  color: 'white',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {deleting ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 size={14} aria-hidden="true" />
                )}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default PhotoGallery;
