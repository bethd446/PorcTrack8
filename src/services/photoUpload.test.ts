// @vitest-environment jsdom
/**
 * Tests unitaires — photoUpload
 * ═════════════════════════════════
 * Couvre uploadAnimalPhoto + deleteAnimalPhoto.
 * - Path generation (`{farmId}/{animalId}-{ts}.jpg`)
 * - Erreurs : INVALID_INPUT, BUCKET_MISSING, UPLOAD_FAILED, PhotoUploadError class
 * - deleteAnimalPhoto : extraction path depuis URL publique
 *
 * On stub canvas/Image/FileReader pour éviter la dépendance au vrai DOM
 * d'encodage (jsdom ne fournit pas canvas.toBlob fonctionnel pour PNG/JPEG).
 * Le but n'est PAS de tester l'algo de compression mais la couche upload.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface UploadCall {
  bucket: string;
  path: string;
  blob: Blob;
  options: { contentType?: string; upsert?: boolean };
}
interface RemoveCall {
  bucket: string;
  paths: string[];
}

const uploadCalls: UploadCall[] = [];
const removeCalls: RemoveCall[] = [];
let nextUploadError: { message: string } | null = null;
let nextRemoveError: { message: string } | null = null;
let nextPublicUrl: string | null = 'https://x.supabase.co/storage/v1/object/public/farm-photos/PATH';

vi.mock('./supabaseClient', () => ({
  supabase: {
    storage: {
      from: (bucket: string) => ({
        upload: (path: string, blob: Blob, options: UploadCall['options']) => {
          uploadCalls.push({ bucket, path, blob, options });
          return Promise.resolve(
            nextUploadError ? { data: null, error: nextUploadError } : { data: { path }, error: null },
          );
        },
        getPublicUrl: (_path: string) => ({
          data: nextPublicUrl ? { publicUrl: nextPublicUrl.replace('PATH', _path) } : null,
        }),
        remove: (paths: string[]) => {
          removeCalls.push({ bucket, paths });
          return Promise.resolve(
            nextRemoveError ? { data: null, error: nextRemoveError } : { data: [], error: null },
          );
        },
      }),
    },
  },
}));

// ── Stubs DOM : on remplace les primitives utilisées par compressImage. ──────
function installDomStubs() {
  // FileReader.readAsDataURL → renvoie un dataURL bidon
  class StubFileReader {
    onerror: (() => void) | null = null;
    onload: (() => void) | null = null;
    result: string | null = null;
    readAsDataURL(_file: Blob) {
      this.result = 'data:image/jpeg;base64,AAAA';
      queueMicrotask(() => this.onload?.());
    }
  }
  (globalThis as unknown as { FileReader: unknown }).FileReader = StubFileReader;

  // Image : déclenche onload immédiatement avec dimensions fixes
  class StubImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    width = 800;
    height = 600;
    set src(_v: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  (globalThis as unknown as { Image: unknown }).Image = StubImage;

  // canvas : on monkey-patch toBlob pour qu'il renvoie un petit blob
  const proto = (globalThis as unknown as { HTMLCanvasElement: { prototype: HTMLCanvasElement } }).HTMLCanvasElement
    .prototype;
  proto.getContext = function () {
    return { drawImage: () => undefined } as unknown as CanvasRenderingContext2D;
  } as unknown as typeof proto.getContext;
  proto.toBlob = function (cb: BlobCallback) {
    cb(new Blob(['x'], { type: 'image/jpeg' }));
  } as unknown as typeof proto.toBlob;
}

import { uploadAnimalPhoto, deleteAnimalPhoto, PhotoUploadError } from './photoUpload';

beforeEach(() => {
  uploadCalls.length = 0;
  removeCalls.length = 0;
  nextUploadError = null;
  nextRemoveError = null;
  nextPublicUrl = 'https://x.supabase.co/storage/v1/object/public/farm-photos/PATH';
  installDomStubs();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('uploadAnimalPhoto — happy path', () => {
  it('uploads to farm-photos bucket with correct path pattern and returns public URL', async () => {
    const file = new File(['fake'], 'pic.jpg', { type: 'image/jpeg' });
    const before = Date.now();
    const url = await uploadAnimalPhoto('farm-A130', 'T01', file);
    const after = Date.now();

    expect(uploadCalls).toHaveLength(1);
    const call = uploadCalls[0];
    expect(call.bucket).toBe('farm-photos');
    expect(call.options.contentType).toBe('image/jpeg');
    expect(call.options.upsert).toBe(false);

    // Path : farm-A130/T01-{timestamp}.jpg
    const match = call.path.match(/^farm-A130\/T01-(\d+)\.jpg$/);
    expect(match).not.toBeNull();
    const ts = Number(match![1]);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);

    // URL publique retournée
    expect(url).toContain('farm-photos/');
    expect(url).toContain('farm-A130/T01-');
  });
});

describe('uploadAnimalPhoto — input validation', () => {
  it('throws PhotoUploadError INVALID_INPUT if farmId is empty', async () => {
    const file = new File(['x'], 'p.jpg', { type: 'image/jpeg' });
    await expect(uploadAnimalPhoto('', 'T01', file)).rejects.toMatchObject({
      name: 'PhotoUploadError',
      code: 'INVALID_INPUT',
    });
  });

  it('throws PhotoUploadError INVALID_INPUT if animalId is empty', async () => {
    const file = new File(['x'], 'p.jpg', { type: 'image/jpeg' });
    await expect(uploadAnimalPhoto('farm-A130', '', file)).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
  });

  it('throws PhotoUploadError INVALID_INPUT if file is not an image', async () => {
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    await expect(uploadAnimalPhoto('farm', 'T01', file)).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
  });
});

describe('uploadAnimalPhoto — bucket / upload errors', () => {
  it('throws PhotoUploadError BUCKET_MISSING when supabase says "Bucket not found"', async () => {
    nextUploadError = { message: 'Bucket not found' };
    const file = new File(['x'], 'p.jpg', { type: 'image/jpeg' });
    await expect(uploadAnimalPhoto('farm', 'T01', file)).rejects.toMatchObject({
      code: 'BUCKET_MISSING',
    });
  });

  it('throws PhotoUploadError UPLOAD_FAILED on generic upload error', async () => {
    nextUploadError = { message: 'Network down' };
    const file = new File(['x'], 'p.jpg', { type: 'image/jpeg' });
    await expect(uploadAnimalPhoto('farm', 'T01', file)).rejects.toMatchObject({
      code: 'UPLOAD_FAILED',
      message: 'Network down',
    });
  });

  it('throws PhotoUploadError UPLOAD_FAILED if no public URL is returned', async () => {
    nextPublicUrl = null;
    const file = new File(['x'], 'p.jpg', { type: 'image/jpeg' });
    await expect(uploadAnimalPhoto('farm', 'T01', file)).rejects.toMatchObject({
      code: 'UPLOAD_FAILED',
    });
  });
});

describe('PhotoUploadError class', () => {
  it('preserves code and name', () => {
    const e = new PhotoUploadError('BUCKET_MISSING', 'oops');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('BUCKET_MISSING');
    expect(e.name).toBe('PhotoUploadError');
    expect(e.message).toBe('oops');
  });
});

describe('deleteAnimalPhoto', () => {
  it('extracts path from public URL and calls storage.remove', async () => {
    const url =
      'https://x.supabase.co/storage/v1/object/public/farm-photos/farm-A130/T01-1700000000000.jpg';
    await deleteAnimalPhoto(url);
    expect(removeCalls).toHaveLength(1);
    expect(removeCalls[0].bucket).toBe('farm-photos');
    expect(removeCalls[0].paths).toEqual(['farm-A130/T01-1700000000000.jpg']);
  });

  it('is a no-op for empty URL', async () => {
    await deleteAnimalPhoto('');
    expect(removeCalls).toHaveLength(0);
  });

  it('is a no-op for URL without bucket marker', async () => {
    await deleteAnimalPhoto('https://example.com/some/random/path.jpg');
    expect(removeCalls).toHaveLength(0);
  });

  it('does not throw when remove fails (best-effort, just warns)', async () => {
    nextRemoveError = { message: 'Object not found' };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const url =
      'https://x.supabase.co/storage/v1/object/public/farm-photos/farm-A130/T01-1.jpg';
    await expect(deleteAnimalPhoto(url)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
