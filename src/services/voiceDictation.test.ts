// @vitest-environment jsdom
/**
 * Tests unitaires — voiceDictation hook.
 * ════════════════════════════════════════════════════════════════════════
 * On mocke `window.SpeechRecognition` pour simuler la reconnaissance vocale
 * sans dépendance navigateur. On teste :
 *   [1] détection de support (présence de SpeechRecognition / webkit fallback)
 *   [2] start → onresult dispatch met à jour transcript
 *   [3] fallback unsupported → start est un no-op et n'écrit pas dans state
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

interface FakeRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: { length: number; [k: number]: { length: number; isFinal: boolean; [j: number]: { transcript: string } } } }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: ((e: Event) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
  __triggerResult: (text: string, isFinal?: boolean) => void;
  __triggerEnd: () => void;
  __triggerError: (msg: string) => void;
}

const instances: FakeRecognition[] = [];

function makeFakeRecognitionCtor(): new () => FakeRecognition {
  return class {
    lang = '';
    continuous = false;
    interimResults = false;
    onresult: FakeRecognition['onresult'] = null;
    onerror: FakeRecognition['onerror'] = null;
    onend: FakeRecognition['onend'] = null;
    started = false;
    constructor() {
      instances.push(this as unknown as FakeRecognition);
    }
    start(): void {
      this.started = true;
    }
    stop(): void {
      this.started = false;
      if (this.onend) this.onend(new Event('end'));
    }
    abort(): void {
      this.started = false;
    }
    __triggerResult(text: string, isFinal = false): void {
      if (!this.onresult) return;
      this.onresult({
        resultIndex: 0,
        results: {
          length: 1,
          0: {
            length: 1,
            isFinal,
            0: { transcript: text },
          },
        },
      });
    }
    __triggerEnd(): void {
      if (this.onend) this.onend(new Event('end'));
    }
    __triggerError(msg: string): void {
      if (this.onerror) this.onerror({ error: msg });
    }
  };
}

beforeEach(() => {
  instances.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  // Nettoie les globals injectés
  delete (window as unknown as Record<string, unknown>).SpeechRecognition;
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
});

describe('[1] useVoiceDictation — détection support', () => {
  it('isSupported=false quand aucune API SpeechRecognition disponible', async () => {
    const { useVoiceDictation } = await import('./voiceDictation');
    const { result } = renderHook(() => useVoiceDictation('fr-FR'));
    expect(result.current.isSupported).toBe(false);
    expect(result.current.isListening).toBe(false);
    expect(result.current.transcript).toBe('');
  });

  it('isSupported=true quand window.SpeechRecognition est défini', async () => {
    (window as unknown as Record<string, unknown>).SpeechRecognition = makeFakeRecognitionCtor();
    vi.resetModules();
    const { useVoiceDictation } = await import('./voiceDictation');
    const { result } = renderHook(() => useVoiceDictation('fr-FR'));
    expect(result.current.isSupported).toBe(true);
  });

  it('isSupported=true via webkitSpeechRecognition fallback', async () => {
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = makeFakeRecognitionCtor();
    vi.resetModules();
    const { useVoiceDictation } = await import('./voiceDictation');
    const { result } = renderHook(() => useVoiceDictation('fr-FR'));
    expect(result.current.isSupported).toBe(true);
  });
});

describe('[2] useVoiceDictation — start dispatche transcript', () => {
  it('start → onresult met à jour transcript et passe isListening à true', async () => {
    (window as unknown as Record<string, unknown>).SpeechRecognition = makeFakeRecognitionCtor();
    vi.resetModules();
    const { useVoiceDictation } = await import('./voiceDictation');
    const { result } = renderHook(() => useVoiceDictation('fr-FR'));

    act(() => {
      result.current.start();
    });
    expect(result.current.isListening).toBe(true);
    expect(instances.length).toBe(1);
    const r = instances[0];
    expect(r.lang).toBe('fr-FR');

    act(() => {
      r.__triggerResult('bonjour ', false);
    });
    expect(result.current.transcript).toBe('bonjour ');

    act(() => {
      r.__triggerResult('bonjour le monde', true);
    });
    expect(result.current.transcript).toBe('bonjour le monde');

    act(() => {
      r.__triggerEnd();
    });
    expect(result.current.isListening).toBe(false);
  });

  it('stop arrête la session (isListening=false après onend)', async () => {
    (window as unknown as Record<string, unknown>).SpeechRecognition = makeFakeRecognitionCtor();
    vi.resetModules();
    const { useVoiceDictation } = await import('./voiceDictation');
    const { result } = renderHook(() => useVoiceDictation('fr-FR'));

    act(() => {
      result.current.start();
    });
    expect(result.current.isListening).toBe(true);

    act(() => {
      result.current.stop();
    });
    expect(result.current.isListening).toBe(false);
  });

  it('onerror passe error et isListening à false', async () => {
    (window as unknown as Record<string, unknown>).SpeechRecognition = makeFakeRecognitionCtor();
    vi.resetModules();
    const { useVoiceDictation } = await import('./voiceDictation');
    const { result } = renderHook(() => useVoiceDictation('fr-FR'));

    act(() => {
      result.current.start();
    });
    const r = instances[0];

    act(() => {
      r.__triggerError('not-allowed');
    });
    expect(result.current.error).toBe('not-allowed');
    expect(result.current.isListening).toBe(false);
  });
});

describe('[3] useVoiceDictation — fallback unsupported', () => {
  it('start est no-op si non supporté, transcript reste vide', async () => {
    vi.resetModules();
    const { useVoiceDictation } = await import('./voiceDictation');
    const { result } = renderHook(() => useVoiceDictation('fr-FR'));
    expect(result.current.isSupported).toBe(false);

    act(() => {
      result.current.start();
    });
    expect(result.current.isListening).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(instances.length).toBe(0);
  });

  it('reset efface transcript et error', async () => {
    (window as unknown as Record<string, unknown>).SpeechRecognition = makeFakeRecognitionCtor();
    vi.resetModules();
    const { useVoiceDictation } = await import('./voiceDictation');
    const { result } = renderHook(() => useVoiceDictation('fr-FR'));

    act(() => {
      result.current.start();
    });
    const r = instances[0];
    act(() => {
      r.__triggerResult('test', true);
      r.__triggerEnd();
    });
    expect(result.current.transcript).toBe('test');

    act(() => {
      result.current.reset();
    });
    expect(result.current.transcript).toBe('');
    expect(result.current.error).toBeNull();
  });
});
