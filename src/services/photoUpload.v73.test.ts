// @vitest-environment jsdom
/**
 * Tests unitaires — photoUpload V73 (Vague R)
 * ═════════════════════════════════════════════
 * Couvre uploadEntityPhoto / deleteEntityPhoto / listEntityPhotos.
 *
 * - Path generation : `${farmId}/${entityType}/${entityId}/${uuid}.webp`
 * - Compression via browser-image-compression (mockée)
 * - Validation : type non image, entityId vide, farm_id null
 * - listEntityPhotos : ordre + URL publique générée
 *
 * Mock complet de supabase.storage incluant `.list()`.
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
interface ListCall {
  bucket: string;
  folder: string;
}

const uploadCalls: UploadCall[] = [];
const removeCalls: RemoveCall[] = [];
const listCalls: ListCall[] = [];
let nextUploadError: { message: string } | null = null;
let nextRemoveError: { message: string } | null = null;
let nextListResult: Array<{ name: string; created_at?: string; metadata?: { size: number } }> = [];

vi.mock('./supabaseClient', () => ({
  supabase: {
    storage: {
      from: (bucket: string) => ({
        upload: (path: string, blob: Blob, options: UploadCall['options']) => {
          uploadCalls.push({ bucket, path, blob, options });
          return Promise.resolve(
            nextUploadError
              ? { data: null, error: nextUploadError }
              : { data: { path }, error: null },
          );
        },
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/${bucket}/${path}` },
        }),
        remove: (paths: string[]) => {
          removeCalls.push({ bucket, paths });
          return Promise.resolve(
            nextRemoveError ? { data: null, error: nextRemoveError } : { data: [], error: null },
          );
        },
        list: (folder: string) => {
          listCalls.push({ bucket, folder });
          return Promise.resolve({ data: nextListResult, error: null });
        },
      }),
    },
  },
}));

// Mock farm_id resolver
let mockFarmId: string | null = 'farm-K13';
vi.mock('./supabaseWrites', () => ({
  getCurrentFarmIdRef: () => mockFarmId,
}));

// Mock browser-image-compression : renvoie un blob factice WEBP
vi.mock('browser-image-compression', () => ({
  default: vi.fn(async (file: File) => {
    return new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/webp' });
  }),
}));

import {
  uploadEntityPhoto,
  deleteEntityPhoto,
  listEntityPhotos,
  PhotoUploadError,
} from './photoUpload';

beforeEach(() => {
  uploadCalls.length = 0;
  removeCalls.length = 0;
  listCalls.length = 0;
  nextUploadError = null;
  nextRemoveError = null;
  nextListResult = [];
  mockFarmId = 'farm-K13';
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('uploadEntityPhoto — happy path', () => {
  it('compresse, upload sur farm-photos avec path WEBP correct, retourne URL publique', async () => {
    const file = new File(['fake'], 'photo.jpg', { type: 'image/jpeg' });
    const result = await uploadEntityPhoto('sows', 'truie-abc', file);

    expect(uploadCalls).toHaveLength(1);
    const call = uploadCalls[0];
    expect(call.bucket).toBe('farm-photos');
    expect(call.options.contentType).toBe('image/webp');
    expect(call.options.upsert).toBe(false);

    // Path : farm-K13/sows/truie-abc/<uuid>.webp
    expect(call.path).toMatch(/^farm-K13\/sows\/truie-abc\/[a-z0-9-]+\.webp$/i);

    expect(result.url).toContain('/farm-photos/farm-K13/sows/truie-abc/');
    expect(result.url).toMatch(/\.webp$/);
    expect(result.path).toBe(call.path);
    expect(result.size_bytes).toBeGreaterThan(0);
  });

  it('accepte les 5 entityType supportés', async () => {
    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' });
    for (const t of ['sows', 'boars', 'batches', 'loges', 'porcelets'] as const) {
      uploadCalls.length = 0;
      await uploadEntityPhoto(t, 'id-1', file);
      expect(uploadCalls[0].path.startsWith(`farm-K13/${t}/id-1/`)).toBe(true);
    }
  });

  it('utilise le farmIdOverride quand fourni', async () => {
    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' });
    await uploadEntityPhoto('sows', 'truie-1', file, 'farm-OVERRIDE');
    expect(uploadCalls[0].path.startsWith('farm-OVERRIDE/sows/truie-1/')).toBe(true);
  });
});

describe('uploadEntityPhoto — validation', () => {
  it('rejette si entityId vide', async () => {
    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' });
    await expect(uploadEntityPhoto('sows', '', file)).rejects.toMatchObject({
      name: 'PhotoUploadError',
      code: 'INVALID_INPUT',
    });
  });

  it('rejette si type non image', async () => {
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    await expect(uploadEntityPhoto('sows', 'id-1', file)).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
  });

  it('rejette si aucune ferme courante', async () => {
    mockFarmId = null;
    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' });
    await expect(uploadEntityPhoto('sows', 'id-1', file)).rejects.toMatchObject({
      code: 'NO_FARM',
    });
  });

  it('accepte les fichiers HEIC même sans MIME type explicite', async () => {
    // file.type peut être vide pour HEIC sur certains navigateurs
    const file = new File(['x'], 'photo.heic', { type: '' });
    // Doit passer la validation (.heic dans le nom) ; conversion HEIC échouera
    // silencieusement (mock heic2any non installé), puis compression mockée OK
    await expect(uploadEntityPhoto('sows', 'id-1', file)).resolves.toBeDefined();
  });
});

describe('uploadEntityPhoto — erreurs upload', () => {
  it('mappe BUCKET_MISSING quand "Bucket not found"', async () => {
    nextUploadError = { message: 'Bucket not found' };
    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' });
    await expect(uploadEntityPhoto('sows', 'id', file)).rejects.toMatchObject({
      code: 'BUCKET_MISSING',
    });
  });

  it('mappe UPLOAD_FAILED sur erreur générique', async () => {
    nextUploadError = { message: 'Network down' };
    const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' });
    await expect(uploadEntityPhoto('sows', 'id', file)).rejects.toMatchObject({
      code: 'UPLOAD_FAILED',
      message: 'Network down',
    });
  });
});

describe('deleteEntityPhoto', () => {
  it('appelle storage.remove avec le path fourni', async () => {
    await deleteEntityPhoto('farm-K13/sows/truie-1/uuid-1.webp');
    expect(removeCalls).toHaveLength(1);
    expect(removeCalls[0].bucket).toBe('farm-photos');
    expect(removeCalls[0].paths).toEqual(['farm-K13/sows/truie-1/uuid-1.webp']);
  });

  it('no-op si path vide', async () => {
    await deleteEntityPhoto('');
    expect(removeCalls).toHaveLength(0);
  });

  it('throw PhotoUploadError UPLOAD_FAILED si storage.remove échoue', async () => {
    nextRemoveError = { message: 'Permission denied' };
    await expect(deleteEntityPhoto('farm-K13/sows/x/y.webp')).rejects.toMatchObject({
      code: 'UPLOAD_FAILED',
    });
  });
});

describe('listEntityPhotos', () => {
  it('retourne la liste avec URLs publiques', async () => {
    nextListResult = [
      { name: 'a.webp', created_at: '2026-05-08T10:00:00Z', metadata: { size: 100_000 } },
      { name: 'b.webp', created_at: '2026-05-07T10:00:00Z', metadata: { size: 200_000 } },
    ];
    const photos = await listEntityPhotos('sows', 'truie-1');
    expect(listCalls[0].folder).toBe('farm-K13/sows/truie-1');
    expect(photos).toHaveLength(2);
    expect(photos[0].name).toBe('a.webp');
    expect(photos[0].path).toBe('farm-K13/sows/truie-1/a.webp');
    expect(photos[0].url).toContain('/farm-photos/farm-K13/sows/truie-1/a.webp');
    expect(photos[0].size_bytes).toBe(100_000);
  });

  it('retourne [] si entityId vide', async () => {
    const photos = await listEntityPhotos('sows', '');
    expect(photos).toEqual([]);
    expect(listCalls).toHaveLength(0);
  });

  it('retourne [] si farm_id null', async () => {
    mockFarmId = null;
    const photos = await listEntityPhotos('sows', 'truie-1');
    expect(photos).toEqual([]);
  });

  it('filtre les fichiers cachés (commençant par .)', async () => {
    nextListResult = [
      { name: '.emptyFolderPlaceholder' },
      { name: 'real.webp' },
    ];
    const photos = await listEntityPhotos('sows', 'truie-1');
    expect(photos).toHaveLength(1);
    expect(photos[0].name).toBe('real.webp');
  });
});

describe('PhotoUploadError NO_FARM', () => {
  it('expose code et nom corrects', () => {
    const e = new PhotoUploadError('NO_FARM', 'pas de ferme');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('NO_FARM');
    expect(e.name).toBe('PhotoUploadError');
  });
});
