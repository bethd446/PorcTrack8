// @vitest-environment jsdom
/**
 * Tests unitaires — imageCompress (jsdom env)
 * ════════════════════════════════════════════════════════════════════════
 * Couvre :
 *  [1] Validation type MIME (rejette non-image)
 *  [2] Resize : ratio préservé, plus grand côté ≤ maxDimension
 *  [3] Resize no-op si image déjà petite
 *  [4] Erreur typée TOO_LARGE si blob > maxBytes
 *  [5] compressImageDataUrl retourne un dataURL JPEG
 *
 * jsdom ne fournit pas un canvas.toBlob fonctionnel pour PNG/JPEG, donc on
 * stub Image / canvas / FileReader. Le but est de valider la logique de
 * resize, pas l'algo natif d'encodage.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  compressImageBlob,
  compressImageDataUrl,
  ImageCompressError,
  DEFAULT_MAX_DIMENSION,
} from './imageCompress';

interface CanvasState {
  width: number;
  height: number;
}

let lastCanvas: CanvasState | null = null;
let stubBlobBytes = 1024;
let stubImgWidth = 800;
let stubImgHeight = 600;

class StubFileReader {
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;
  result: string | null = null;
  readAsDataURL(_blob: Blob) {
    this.result = 'data:image/jpeg;base64,AAAA';
    queueMicrotask(() => this.onload?.());
  }
}

class StubImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width: number;
  height: number;
  constructor() {
    this.width = stubImgWidth;
    this.height = stubImgHeight;
  }
  set src(_v: string) {
    queueMicrotask(() => this.onload?.());
  }
}

function installStubs(imgWidth = 800, imgHeight = 600) {
  stubImgWidth = imgWidth;
  stubImgHeight = imgHeight;
  (globalThis as unknown as { FileReader: unknown }).FileReader = StubFileReader;
  (globalThis as unknown as { Image: unknown }).Image = StubImage;

  const proto = (globalThis as unknown as {
    HTMLCanvasElement: { prototype: HTMLCanvasElement };
  }).HTMLCanvasElement.prototype;

  Object.defineProperty(proto, 'width', {
    configurable: true,
    set(v: number) {
      lastCanvas = { ...(lastCanvas ?? { width: 0, height: 0 }), width: v };
    },
    get() {
      return lastCanvas?.width ?? 0;
    },
  });
  Object.defineProperty(proto, 'height', {
    configurable: true,
    set(v: number) {
      lastCanvas = { ...(lastCanvas ?? { width: 0, height: 0 }), height: v };
    },
    get() {
      return lastCanvas?.height ?? 0;
    },
  });

  proto.getContext = function () {
    return { drawImage: () => undefined } as unknown as CanvasRenderingContext2D;
  } as unknown as typeof proto.getContext;
  proto.toBlob = function (cb: BlobCallback) {
    cb(new Blob([new Uint8Array(stubBlobBytes)], { type: 'image/jpeg' }));
  } as unknown as typeof proto.toBlob;

  // fetch utilisé par compressImageDataUrl (dataURL → blob)
  (globalThis as unknown as { fetch: unknown }).fetch = async (url: string) => {
    return {
      blob: async () => {
        // Décode très basique : tout dataURL "image/*" → blob image/jpeg
        const m = /^data:([^;,]+)/.exec(url);
        const type = m ? m[1] : 'image/jpeg';
        return new Blob([new Uint8Array(16)], { type });
      },
    };
  };
}

beforeEach(() => {
  lastCanvas = null;
  stubBlobBytes = 1024;
  installStubs();
});

afterEach(() => {
  lastCanvas = null;
});

describe('compressImageBlob — validation', () => {
  it('rejette les fichiers non-image avec ImageCompressError INVALID_INPUT', async () => {
    const file = new Blob(['x'], { type: 'application/pdf' });
    await expect(compressImageBlob(file)).rejects.toMatchObject({
      name: 'ImageCompressError',
      code: 'INVALID_INPUT',
    });
  });
});

describe('compressImageBlob — resize logic', () => {
  it('redimensionne une image landscape 4000×3000 sous 1600×1200 (ratio préservé)', async () => {
    installStubs(4000, 3000);
    const file = new Blob([new Uint8Array(8)], { type: 'image/jpeg' });
    const blob = await compressImageBlob(file);

    expect(blob.type).toBe('image/jpeg');
    expect(lastCanvas).not.toBeNull();
    expect(lastCanvas!.width).toBeLessThanOrEqual(DEFAULT_MAX_DIMENSION);
    expect(lastCanvas!.height).toBeLessThanOrEqual(DEFAULT_MAX_DIMENSION);
    // Ratio 4:3 préservé
    expect(lastCanvas!.width / lastCanvas!.height).toBeCloseTo(4 / 3, 1);
  });

  it('redimensionne une image portrait 1500×4000 sous 1600 côté max', async () => {
    installStubs(1500, 4000);
    const file = new Blob([new Uint8Array(8)], { type: 'image/jpeg' });
    await compressImageBlob(file);

    expect(lastCanvas!.height).toBe(DEFAULT_MAX_DIMENSION);
    expect(lastCanvas!.width).toBeLessThan(DEFAULT_MAX_DIMENSION);
  });

  it('ne grossit pas une image déjà petite (1000×800 reste 1000×800)', async () => {
    installStubs(1000, 800);
    const file = new Blob([new Uint8Array(8)], { type: 'image/jpeg' });
    await compressImageBlob(file);

    expect(lastCanvas!.width).toBe(1000);
    expect(lastCanvas!.height).toBe(800);
  });

  it('respecte une maxDimension custom', async () => {
    installStubs(4000, 3000);
    const file = new Blob([new Uint8Array(8)], { type: 'image/jpeg' });
    await compressImageBlob(file, { maxDimension: 800 });

    expect(lastCanvas!.width).toBe(800);
    expect(lastCanvas!.height).toBe(600);
  });
});

describe('compressImageBlob — taille blob', () => {
  it('rejette si blob > maxBytes avec code TOO_LARGE', async () => {
    stubBlobBytes = 2_000_000;
    const file = new Blob([new Uint8Array(8)], { type: 'image/jpeg' });
    await expect(
      compressImageBlob(file, { maxBytes: 100_000 }),
    ).rejects.toMatchObject({
      name: 'ImageCompressError',
      code: 'TOO_LARGE',
    });
  });
});

describe('compressImageDataUrl', () => {
  it('retourne un dataURL JPEG', async () => {
    const result = await compressImageDataUrl('data:image/jpeg;base64,AAAA');
    expect(result.startsWith('data:image/jpeg')).toBe(true);
  });
});

describe('ImageCompressError class', () => {
  it('preserves code and name', () => {
    const e = new ImageCompressError('TOO_LARGE', 'oops');
    expect(e).toBeInstanceOf(Error);
    expect(e.code).toBe('TOO_LARGE');
    expect(e.name).toBe('ImageCompressError');
    expect(e.message).toBe('oops');
  });
});
