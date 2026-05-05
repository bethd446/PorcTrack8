/**
 * imageCompress — Resize + réencodage JPEG côté client via canvas natif.
 *
 * Garantit que toute image ré-encodée tient sous la limite Anthropic
 * "many-image requests 2000px max" (marge confortable à 1600px).
 *
 * Utilisé par :
 *  - services/photoUpload.ts → upload Supabase fiches animaux
 *  - services/photos.ts      → capture caméra Capacitor (avant Filesystem)
 *
 * Erreurs typées via ImageCompressError.
 */

export const DEFAULT_MAX_DIMENSION = 1600;
export const DEFAULT_JPEG_QUALITY = 0.85;
export const DEFAULT_MAX_BYTES = 1_572_864; // 1.5 MB

export type ImageCompressErrorCode =
  | 'INVALID_INPUT'
  | 'COMPRESS_FAILED'
  | 'TOO_LARGE';

export class ImageCompressError extends Error {
  readonly code: ImageCompressErrorCode;
  constructor(code: ImageCompressErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'ImageCompressError';
  }
}

export interface CompressOptions {
  maxDimension?: number;
  quality?: number;
  maxBytes?: number;
}

/**
 * Compresse un Blob/File image en JPEG redimensionné.
 *
 * @param input File ou Blob image en entrée
 * @returns Blob JPEG ≤ maxDimension côté max, qualité quality
 */
export async function compressImageBlob(
  input: Blob,
  options: CompressOptions = {},
): Promise<Blob> {
  const maxDim = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options.quality ?? DEFAULT_JPEG_QUALITY;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  if (!input.type.startsWith('image/')) {
    throw new ImageCompressError('INVALID_INPUT', 'Le fichier doit être une image');
  }

  const dataUrl = await readAsDataURL(input);
  const img = await loadImage(dataUrl);

  const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * ratio));
  const h = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageCompressError('COMPRESS_FAILED', 'Canvas 2D indisponible');
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );
  if (!blob) throw new ImageCompressError('COMPRESS_FAILED', 'Encodage JPEG échoué');
  if (blob.size > maxBytes) {
    throw new ImageCompressError(
      'TOO_LARGE',
      `Image trop lourde après compression (${Math.round(blob.size / 1024)} KB)`,
    );
  }
  return blob;
}

/**
 * Compresse à partir d'un dataURL (variant pour pipeline Capacitor qui livre
 * déjà une URI / data URL). Retourne un dataURL JPEG redimensionné.
 */
export async function compressImageDataUrl(
  dataUrl: string,
  options: CompressOptions = {},
): Promise<string> {
  const blob = await fetch(dataUrl).then(r => r.blob());
  const compressed = await compressImageBlob(blob, options);
  return blobToDataUrl(compressed);
}

function readAsDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new ImageCompressError('COMPRESS_FAILED', 'Lecture fichier échouée'));
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new ImageCompressError('COMPRESS_FAILED', 'FileReader résultat invalide'));
    };
    reader.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new ImageCompressError('COMPRESS_FAILED', 'Image illisible'));
    i.src = src;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new ImageCompressError('COMPRESS_FAILED', 'Encodage dataURL échoué'));
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new ImageCompressError('COMPRESS_FAILED', 'FileReader résultat invalide'));
    };
    reader.readAsDataURL(blob);
  });
}
