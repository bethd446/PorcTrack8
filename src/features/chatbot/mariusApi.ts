/**
 * Marius API client — extrait de ChatbotWidget pour réutilisation par
 * MariusChatFullscreen (Sprint 7).
 *
 * Garde le double endpoint : Mistral cloud (system prompt appliqué) + VPS
 * Hostinger en backup. SSE format OpenAI-compat.
 */

export interface MariusMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const MISTRAL_API_BASE = 'https://api.mistral.ai/v1';
const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY as string | undefined;
const MISTRAL_MODEL = 'mistral-small-latest';

const VPS_API_BASE = import.meta.env.VITE_MARIUS_API_BASE as string | undefined;
const VPS_API_KEY = import.meta.env.VITE_MARIUS_API_KEY as string | undefined;

export const isMariusConfigured: boolean = Boolean(
  MISTRAL_API_KEY || (VPS_API_BASE && VPS_API_KEY),
);

export async function callMariusAPI(
  messages: MariusMessage[],
  systemPrompt: string,
  signal: AbortSignal,
): Promise<Response> {
  // Tentative 1 : Mistral cloud (system prompt appliqué).
  if (MISTRAL_API_KEY) {
    try {
      const res = await fetch(`${MISTRAL_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MISTRAL_API_KEY}`,
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          model: MISTRAL_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
              .filter((m) => m.role !== 'system')
              .map((m) => ({ role: m.role, content: m.content })),
          ],
          stream: true,
          max_tokens: 800,
          temperature: 0.7,
        }),
        signal,
      });
      if (res.ok && res.body) return res;
      // eslint-disable-next-line no-console
      console.warn('[Marius] Mistral cloud failed, falling back to VPS', res.status);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[Marius] Mistral cloud error, falling back to VPS', err);
    }
  }

  if (!VPS_API_BASE || !VPS_API_KEY) {
    throw new Error('Aucune API Marius configurée');
  }
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  return await fetch(`${VPS_API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': VPS_API_KEY,
    },
    body: JSON.stringify({ message: lastUser }),
    signal,
  });
}

/**
 * Parse un chunk SSE OpenAI-compat ou format simple `{content}`.
 * Retourne `null` pour skip (ex: finish_reason sans delta).
 */
export function parseSseChunk(data: string): string | null {
  if (data === '[DONE]') return '[DONE]';
  try {
    const parsed = JSON.parse(data) as {
      content?: string;
      choices?: Array<{
        delta?: { content?: string };
        message?: { content?: string };
        finish_reason?: string | null;
      }>;
    };
    const openaiDelta = parsed.choices?.[0]?.delta?.content;
    if (typeof openaiDelta === 'string') return openaiDelta;
    if (typeof parsed.content === 'string') return parsed.content;
    if (parsed.choices?.[0]?.finish_reason) return null;
    return null;
  } catch {
    return data;
  }
}
