/**
 * photoUpload — Upload + compression de photos d'animaux vers Supabase Storage.
 *
 * Bucket : `farm-photos` (à créer manuellement côté Supabase).
 * Path   : `${farmId}/${animalId}-${timestamp}.jpg`
 *
 * Compression côté client via le helper partagé `lib/imageCompress` :
 *  - resize ≤ 1600 px côté max (preserve ratio) — sous la limite Anthropic 2000 px
 *  - réencode JPEG qualité 0.85
 *  - max blob ≈ 1.5 MB (sinon abandon)
 */
import { supabase } from './supabaseClient';
import {
  compressImageBlob,
  ImageCompressError,
  DEFAULT_MAX_DIMENSION,
} from '../lib/imageCompress';

const BUCKET = 'farm-photos';
export const PHOTO_MAX_DIMENSION = DEFAULT_MAX_DIMENSION;

export class PhotoUploadError extends Error {
  readonly code: 'BUCKET_MISSING' | 'COMPRESS_FAILED' | 'UPLOAD_FAILED' | 'INVALID_INPUT';
  constructor(code: PhotoUploadError['code'], message: string) {
    super(message);
    this.code = code;
    this.name = 'PhotoUploadError';
  }
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
  if (!file.type.startsWith('image/')) {
    throw new PhotoUploadError('INVALID_INPUT', 'Le fichier doit être une image');
  }

  let blob: Blob;
  try {
    blob = await compressImageBlob(file);
  } catch (err) {
    if (err instanceof ImageCompressError) {
      throw new PhotoUploadError('COMPRESS_FAILED', err.message);
    }
    throw err;
  }

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
