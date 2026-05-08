/**
 * photoUpload — Upload + compression de photos d'animaux vers Supabase Storage.
 *
 * Bucket : `farm-photos` (public, RLS sur INSERT/UPDATE/DELETE par farm_members).
 *
 * Deux APIs cohabitent :
 *
 *  1. **Legacy (V70)** — `uploadAnimalPhoto / deleteAnimalPhoto`
 *     - 1 photo par animal, stockée dans la colonne `photo_url` de la table
 *     - Path : `${farmId}/${animalId}-${timestamp}.jpg`
 *     - Compression via `lib/imageCompress` (canvas natif, JPEG)
 *
 *  2. **V73 Vague R** — `uploadEntityPhoto / deleteEntityPhoto / listEntityPhotos`
 *     - Galerie multi-photos par entité (sows, boars, batches, loges, porcelets)
 *     - Path : `${farmId}/${entityType}/${entityId}/${uuid}.webp`
 *     - Compression via `browser-image-compression` (Web Worker, WEBP, HEIC OK)
 *     - Polyfill HEIC via dynamic import `heic2any` (chargé à la demande)
 *
 * Erreurs typées via PhotoUploadError. Bucket public → `getPublicUrl` pour
 * compat ascendante, RLS strictes sur écriture.
 */
import imageCompression from 'browser-image-compression';
import { supabase } from './supabaseClient';
import {
  compressImageBlob,
  ImageCompressError,
  DEFAULT_MAX_DIMENSION,
} from '../lib/imageCompress';
import { getCurrentFarmIdRef } from './supabaseWrites';

const BUCKET = 'farm-photos';
export const PHOTO_MAX_DIMENSION = DEFAULT_MAX_DIMENSION;

export class PhotoUploadError extends Error {
  readonly code:
    | 'BUCKET_MISSING'
    | 'COMPRESS_FAILED'
    | 'UPLOAD_FAILED'
    | 'INVALID_INPUT'
    | 'NO_FARM';
  constructor(code: PhotoUploadError['code'], message: string) {
    super(message);
    this.code = code;
    this.name = 'PhotoUploadError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy V70 API — 1 photo par animal (colonne photo_url)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload une photo et retourne l'URL publique (pipeline legacy V70).
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
 * Supprime une photo à partir de son URL publique (pipeline legacy V70).
 * Best-effort : log + swallow en cas d'erreur.
 */
export async function deleteAnimalPhoto(url: string): Promise<void> {
  if (!url) return;
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

// ─────────────────────────────────────────────────────────────────────────────
// V73 API — galerie multi-photos par entité
// ─────────────────────────────────────────────────────────────────────────────

export type EntityType = 'sows' | 'boars' | 'batches' | 'loges' | 'porcelets';

export interface PhotoUploadResult {
  url: string;
  path: string;
  size_bytes: number;
}

export interface EntityPhoto {
  name: string;
  path: string;
  url: string;
  created_at?: string;
  size_bytes?: number;
}

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/webp' as const,
  initialQuality: 0.82,
};

/**
 * Convertit un fichier HEIC en JPEG via heic2any (dynamic import, ~50KB).
 * Si la conversion échoue, on laisse le fichier d'origine (browser-image-compression
 * gère parfois HEIC nativement sur Safari).
 */
async function convertHeicIfNeeded(file: File): Promise<File> {
  const isHeic =
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    /\.hei[cf]$/i.test(file.name);
  if (!isHeic) return file;

  try {
    const heic2anyMod = await import('heic2any');
    const heic2any = (heic2anyMod.default ?? heic2anyMod) as (opts: {
      blob: Blob;
      toType?: string;
      quality?: number;
    }) => Promise<Blob | Blob[]>;
    const out = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    });
    const blob = Array.isArray(out) ? out[0] : out;
    return new File([blob], file.name.replace(/\.hei[cf]$/i, '.jpg'), {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } catch (err) {
    console.warn('[photoUpload] HEIC conversion failed, fallback raw', err);
    return file;
  }
}

/** Génère un UUID v4 (crypto.randomUUID si dispo, fallback compatible). */
function genUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'p-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Upload une photo dans la galerie multi-photos d'une entité.
 * Path : `${farmId}/${entityType}/${entityId}/${uuid}.webp`
 *
 * @param entityType  type d'entité (sows, boars, batches, loges, porcelets)
 * @param entityId    identifiant de l'entité
 * @param file        image source (HEIC/JPG/PNG/WEBP/GIF acceptés)
 * @param farmIdOverride  override optionnel du farm_id (sinon `getCurrentFarmIdRef()`)
 */
export async function uploadEntityPhoto(
  entityType: EntityType,
  entityId: string,
  file: File,
  farmIdOverride?: string,
): Promise<PhotoUploadResult> {
  if (!entityId) {
    throw new PhotoUploadError('INVALID_INPUT', 'entityId requis');
  }
  if (!file.type.startsWith('image/') && !/\.hei[cf]$/i.test(file.name)) {
    throw new PhotoUploadError('INVALID_INPUT', `Type non supporté : ${file.type || 'inconnu'}`);
  }

  const farmId = farmIdOverride ?? getCurrentFarmIdRef();
  if (!farmId) {
    throw new PhotoUploadError('NO_FARM', 'Aucune ferme courante (farm_id requis)');
  }

  const sourceFile = await convertHeicIfNeeded(file);

  let compressed: Blob;
  try {
    compressed = await imageCompression(sourceFile, COMPRESSION_OPTIONS);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Compression échouée';
    throw new PhotoUploadError('COMPRESS_FAILED', msg);
  }

  const path = `${farmId}/${entityType}/${entityId}/${genUuid()}.webp`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressed, { contentType: 'image/webp', upsert: false });
  if (upErr) {
    if (/bucket.*not.*found/i.test(upErr.message)) {
      throw new PhotoUploadError(
        'BUCKET_MISSING',
        `Bucket '${BUCKET}' introuvable. Configurez-le dans Supabase Storage.`,
      );
    }
    throw new PhotoUploadError('UPLOAD_FAILED', upErr.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return {
    url: data?.publicUrl ?? '',
    path,
    size_bytes: compressed.size,
  };
}

/** Supprime une photo de la galerie via son path (`farm/entity/id/uuid.webp`). */
export async function deleteEntityPhoto(path: string): Promise<void> {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    throw new PhotoUploadError('UPLOAD_FAILED', `Suppression échouée : ${error.message}`);
  }
}

/**
 * Liste les photos d'une entité (galerie).
 * Retourne les photos triées par date de création décroissante.
 */
export async function listEntityPhotos(
  entityType: EntityType,
  entityId: string,
  farmIdOverride?: string,
): Promise<EntityPhoto[]> {
  if (!entityId) return [];
  const farmId = farmIdOverride ?? getCurrentFarmIdRef();
  if (!farmId) return [];

  const folder = `${farmId}/${entityType}/${entityId}`;
  const { data: files, error } = await supabase.storage
    .from(BUCKET)
    .list(folder, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

  if (error || !files) return [];

  return files
    .filter((f) => f.name && !f.name.startsWith('.'))
    .map((f) => {
      const path = `${folder}/${f.name}`;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return {
        name: f.name,
        path,
        url: data?.publicUrl ?? '',
        created_at: f.created_at ?? undefined,
        size_bytes: (f.metadata as { size?: number } | null)?.size,
      };
    });
}
