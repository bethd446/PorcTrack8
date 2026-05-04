import React, { useCallback, useEffect, useId, useState } from 'react';
import { IonSpinner, IonModal, IonContent } from '@ionic/react';
import { Camera, Trash2, X, Maximize2 } from 'lucide-react';
import { PhotoEntry, takePhoto, getPhotosForSubject, deletePhoto } from '../services/photos';
import { Button } from '@/design-system';

/**
 * PhotoStrip — Documentation visuelle (Agritech Dark)
 *
 * Affiche une bande horizontale de photos pour un sujet (truie/verrat/bande).
 * Thumbnail 80×80 · card-dense style · lightbox dark pour visualisation.
 */

interface PhotoStripProps {
  subjectType: PhotoEntry['subjectType'];
  subjectId: string;
}

const PhotoStrip: React.FC<PhotoStripProps> = ({ subjectType, subjectId }) => {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoEntry | null>(null);

  const captionId = useId();

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    const data = await getPhotosForSubject(subjectType, subjectId);
    setPhotos(data);
    setLoading(false);
  }, [subjectType, subjectId]);

  useEffect(() => {
    // Legitimate I/O: async fetch of photos for subject
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPhotos();
  }, [loadPhotos]);

  const handleAddPhoto = async (): Promise<void> => {
    const newPhoto = await takePhoto(subjectType, subjectId);
    if (newPhoto) {
      setPhotos([newPhoto, ...photos]);
    }
  };

  const handleDelete = async (e: React.MouseEvent, photoId: string): Promise<void> => {
    e.stopPropagation();
    await deletePhoto(photoId);
    setPhotos(photos.filter(p => p.photoId !== photoId));
    if (selectedPhoto?.photoId === photoId) setSelectedPhoto(null);
  };

  return (
    <div className="space-y-3">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-text-2">
          Documentation visuelle
        </h3>
        <span className="text-[11px] font-bold uppercase tracking-wide text-accent tabular-nums bg-bg-2 border border-border px-2 py-0.5 rounded-sm">
          {photos.length} photo{photos.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Strip ───────────────────────────────────────────────────────── */}
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {/* Add button */}
        <Button
          type="button"
          variant="secondary"
          onClick={handleAddPhoto}
          aria-label="Ajouter une photo"
          className={[
            'pressable flex-shrink-0 w-20 h-20',
            'bg-bg-1 border-2 border-dashed border-border',
            'flex flex-col items-center justify-center gap-1',
            'hover:border-accent hover:bg-bg-2 transition-colors duration-[160ms]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
          ].join(' ')}
          style={{ borderRadius: '0.375rem', height: '5rem', width: '5rem', textTransform: 'none', padding: 0 }}
        >
          <Camera size={20} className="text-text-2" aria-hidden="true" />
          <span className="text-[10px] font-bold uppercase tracking-wide text-text-2">
            Ajouter
          </span>
        </Button>

        {loading ? (
          <div className="w-20 h-20 flex items-center justify-center">
            <IonSpinner name="dots" color="primary" aria-label="Chargement" />
          </div>
        ) : (
          photos.map(photo => (
            <div
              key={photo.photoId}
              className="relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border border-border bg-bg-1 group"
            >
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelectedPhoto(photo)}
                aria-label="Voir la photo en grand"
                className="pressable w-full h-full relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
                style={{ borderRadius: 0, padding: 0, height: '100%', width: '100%', textTransform: 'none' }}
              >
                <img
                  src={photo.webviewPath}
                  alt="Sujet"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-active:opacity-100 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-[160ms]">
                  <Maximize2 size={18} className="text-text-0" aria-hidden="true" />
                </div>
              </Button>
              {/* Delete X */}
              <Button
                type="button"
                variant="danger"
                size="small"
                onClick={(e) => handleDelete(e as React.MouseEvent, photo.photoId)}
                aria-label="Supprimer la photo"
                className={[
                  'pressable absolute top-1 right-1 inline-flex h-5 w-5 items-center justify-center',
                  'bg-bg-0/80 text-red backdrop-blur-sm',
                  'hover:bg-red hover:text-text-0 transition-colors duration-[160ms]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-red focus-visible:outline-offset-1',
                ].join(' ')}
                style={{ borderRadius: '9999px', height: '1.25rem', width: '1.25rem', padding: 0 }}
              >
                <X size={10} aria-hidden="true" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* ── Lightbox ────────────────────────────────────────────────────── */}
      <IonModal
        isOpen={!!selectedPhoto}
        onDidDismiss={() => setSelectedPhoto(null)}
        className="agritech-photo-modal"
      >
        <IonContent className="ion-padding" style={{ '--background': 'black' } as React.CSSProperties}>
          <div
            className="h-full flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-describedby={captionId}
          >
            <div className="flex justify-between items-center p-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedPhoto(null)}
                aria-label="Fermer la photo"
                className={[
                  'pressable inline-flex h-10 w-10 items-center justify-center',
                  'bg-bg-1/60 border border-border text-text-0 backdrop-blur-md',
                  'hover:bg-bg-2/80 transition-colors duration-[160ms]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                ].join(' ')}
                style={{ borderRadius: '0.375rem', height: '2.5rem', width: '2.5rem', padding: 0 }}
              >
                <X size={18} aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={(e) => selectedPhoto && handleDelete(e as React.MouseEvent, selectedPhoto.photoId)}
                aria-label="Supprimer la photo"
                className={[
                  'pressable inline-flex h-10 w-10 items-center justify-center',
                  'bg-red/20 border border-red/40 text-red backdrop-blur-md',
                  'hover:bg-red hover:text-text-0 transition-colors duration-[160ms]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-red focus-visible:outline-offset-2',
                ].join(' ')}
                style={{ borderRadius: '0.375rem', height: '2.5rem', width: '2.5rem', padding: 0 }}
              >
                <Trash2 size={18} aria-hidden="true" />
              </Button>
            </div>

            <div className="flex-1 flex items-center justify-center p-4">
              {selectedPhoto && (
                <img
                  src={selectedPhoto.webviewPath}
                  alt="Vue complète"
                  className="max-w-full max-h-full rounded-md shadow-2xl"
                />
              )}
            </div>

            <div className="p-6 text-center">
              <p
                id={captionId}
                className="text-[11px] uppercase tracking-wide text-text-2 tabular-nums"
              >
                Capturé le{' '}
                {selectedPhoto ? new Date(selectedPhoto.ts).toLocaleString('fr-FR') : ''}
              </p>
            </div>
          </div>
        </IonContent>
      </IonModal>
    </div>
  );
};

export default PhotoStrip;
