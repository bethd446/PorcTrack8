/**
 * photoUpload — Upload + compression de photos d'animaux vers Supabase Storage.
 *
 * Bucket : `farm-photos` (à créer manuellement côté Supabase).
 * Path   : `${farmId}/${animalId}-${timestamp}.jpg`
 *
 * Compression côté client via canvas natif :
 *  - resize ≤ 1024×1024 (preserve ratio)
 *  - réencode en JPEG qualité 0.82 → généralement < 500 KB
 *  - max blob ≈ 1 MB (sinon abandon)
 *
 * Erreur typique : si le bucket n'existe pas, Supabase renvoie
 *   `{ error: { message: 'Bucket not found' } }` → on surface une erreur claire
 *   pour que l'UI puisse afficher un toast d'instruction.
 */
import { supabase } from './supabaseClient';

const BUCKET = 'farm-photos';
const MAX_DIMENSION = 1024;
const MAX_BYTES = 1_048_576; // 1 MB
const JPEG_QUALITY = 0.82;

export class PhotoUploadError extends Error {
  readonly code: 'BUCKET_MISSING' | 'COMPRESS_FAILED' | 'UPLOAD_FAILED' | 'INVALID_INPUT';
  constructor(code: PhotoUploadError['code'], message: string) {
    super(message);
    this.code = code;
    this.name = 'PhotoUploadError';
  }
}

/** Compresse un File image via canvas. Retourne un Blob JPEG. */
async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new PhotoUploadError('INVALID_INPUT', 'Le fichier doit être une image');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new PhotoUploadError('COMPRESS_FAILED', 'Lecture fichier échouée'));
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new PhotoUploadError('COMPRESS_FAILED', 'FileReader résultat invalide'));
    };
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new PhotoUploadError('COMPRESS_FAILED', 'Image illisible'));
    i.src = dataUrl;
  });

  const ratio = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new PhotoUploadError('COMPRESS_FAILED', 'Canvas 2D indisponible');
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  );
  if (!blob) throw new PhotoUploadError('COMPRESS_FAILED', 'Encodage JPEG échoué');
  if (blob.size > MAX_BYTES) {
    throw new PhotoUploadError(
      'COMPRESS_FAILED',
      `Image trop lourde après compression (${Math.round(blob.size / 1024)} KB)`,
    );
  }
  return blob;
}

/**
 * Upload une photo et retourne l'URL publique.
 *
 * @param farmId   identifiant ferme (préfixe path)
 * @param animalId identifiant animal (préfixe nom fichier)
 * @param file     image à uploader (sera compressée)
 */
export async function uploadAnimalPhoto(
  farmId: string,
  animalId: string,
  file: File,
): Promise<string> {
  if (!farmId || !animalId) {
    throw new PhotoUploadError('INVALID_INPUT', 'farmId et animalId requis');
  }

  const blob = await compressImage(file);
  const path = `${farmId}/${animalId}-${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });

  if (error) {
    if (/bucket.*not.*found/i.test(error.message)) {
      throw new PhotoUploadError(
        'BUCKET_MISSING',
        `Bucket '${BUCKET}' introuvable. Configurez-le dans Supabase Storage.`,
      );
    }
    throw new PhotoUploadError('UPLOAD_FAILED', error.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new PhotoUploadError('UPLOAD_FAILED', 'URL publique introuvable après upload');
  }
  return data.publicUrl;
}

/**
 * Supprime une photo à partir de son URL publique.
 * Best-effort : log + swallow en cas d'erreur (la suppression côté DB doit
 * pouvoir continuer même si le fichier orphelin reste).
 */
export async function deleteAnimalPhoto(url: string): Promise<void> {
  if (!url) return;
  // L'URL publique a la forme : .../storage/v1/object/public/<bucket>/<path>
  const marker = `/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  if (!path) return;

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
     
    console.warn('[photoUpload] delete failed', error.message);
  }
}
