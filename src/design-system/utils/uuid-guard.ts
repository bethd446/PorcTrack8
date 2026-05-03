import { useEffect } from 'react';

export const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export function containsUUID(text: string | null | undefined): boolean {
  if (!text) return false;
  return UUID_REGEX.test(text);
}

function isDev(): boolean {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return false;
  try { return Boolean(import.meta.env?.DEV); } catch { return true; }
}

export function safeDisplay(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined || value === '') return fallback;
  const str = String(value);
  if (containsUUID(str)) {
    if (isDev()) {
      // eslint-disable-next-line no-console
      console.error(`[UUID LEAK] Tentative d'afficher un UUID: "${str}". Utiliser shortCode ou name.`);
    }
    return fallback;
  }
  return str;
}

export function assertNoUUID(text: string, context?: string): void {
  if (isDev() && UUID_REGEX.test(text)) {
    // eslint-disable-next-line no-console
    console.error(
      `[UUID-GUARD] UUID détecté dans le texte: "${text.slice(0, 80)}..." (${context ?? 'unknown'})`,
    );
  }
}

export function useNoUUID(text: string, context?: string): void {
  useEffect(() => {
    assertNoUUID(text, context);
  }, [text, context]);
}
