import React, { useEffect, useState } from 'react';
import { IonSpinner, IonModal, IonContent, IonButton } from '@ionic/react';
import { Camera, Trash2, X, Maximize2 } from 'lucide-react';
import { PhotoEntry, takePhoto, getPhotosForSubject, deletePhoto } from '../services/photos';

interface PhotoStripProps {
  subjectType: PhotoEntry['subjectType'];
  subjectId: string;
}

const PhotoStrip: React.FC<PhotoStripProps> = ({ subjectType, subjectId }) => {
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoEntry | null>(null);

  const loadPhotos = async () => {
    setLoading(true);
    const data = await getPhotosForSubject(subjectType, subjectId);
    setPhotos(data);
    setLoading(false);
  };

  useEffect(() => {
    loadPhotos();
  }, [subjectType, subjectId]);

  const handleAddPhoto = async () => {
    const newPhoto = await takePhoto(subjectType, subjectId);
    if (newPhoto) {
      setPhotos([newPhoto, ...photos]);
    }
  };

  const handleDelete = async (e: React.MouseEvent, photoId: string) => {
    e.stopPropagation();
    await deletePhoto(photoId);
    setPhotos(photos.filter(p => p.photoId !== photoId));
    if (selectedPhoto?.photoId === photoId) setSelectedPhoto(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="ft-code text-[11px] font-bold text-gray-400 uppercase">Documentation Visuelle</h3>
        <span className="ft-values text-[11px] font-bold text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full">{photos.length} Photo{photos.length > 1 ? 's' : ''}</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={handleAddPhoto}
          className="pressable flex-shrink-0 w-24 h-24 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 active:bg-gray-100 transition-colors"
          aria-label="Ajouter une photo"
        >
          <Camera size={22} className="text-gray-400" />
          <span className="ft-heading text-[11px] font-bold uppercase text-gray-400">Ajouter</span>
        </button>

        {loading ? (
          <div className="w-24 h-24 flex items-center justify-center">
            <IonSpinner name="dots" color="primary" />
          </div>
        ) : (
          photos.map((photo) => (
            <button
              key={photo.photoId}
              onClick={() => setSelectedPhoto(photo)}
              className="pressable flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden relative group shadow-sm border border-gray-100"
              aria-label="Voir la photo"
            >
              <img
                src={photo.webviewPath}
                alt="Subject"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-active:opacity-100 transition-opacity flex items-center justify-center">
                 <Maximize2 size={20} className="text-white" />
              </div>
            </button>
          ))
        )}
      </div>

      <IonModal isOpen={!!selectedPhoto} onDidDismiss={() => setSelectedPhoto(null)} className="premium-modal">
        <IonContent className="ion-padding bg-black">
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-center p-4">
               <button onClick={() => setSelectedPhoto(null)} className="pressable p-3 bg-white/10 rounded-full backdrop-blur-md" aria-label="Fermer">
                  <X size={22} className="text-white" />
               </button>
               <button
                onClick={(e) => selectedPhoto && handleDelete(e, selectedPhoto.photoId)}
                className="pressable p-3 bg-red-500/20 rounded-full backdrop-blur-md text-red-400"
                aria-label="Supprimer la photo"
               >
                  <Trash2 size={22} />
               </button>
            </div>

            <div className="flex-1 flex items-center justify-center p-4">
              {selectedPhoto && (
                <img
                  src={selectedPhoto.webviewPath}
                  alt="Full view"
                  className="max-w-full max-h-full rounded-xl shadow-2xl"
                />
              )}
            </div>

            <div className="p-8 text-center">
                <p className="ft-code text-white/40 text-[11px] font-bold uppercase">Capturé le {selectedPhoto ? new Date(selectedPhoto.ts).toLocaleString() : ''}</p>
            </div>
          </div>
        </IonContent>
      </IonModal>
    </div>
  );
};

export default PhotoStrip;
