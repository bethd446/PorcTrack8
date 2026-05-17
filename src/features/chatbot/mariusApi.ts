/**
 * Marius API client — appel exclusif à l'Edge Function `marius-chat`.
 *
 * 2026-05-17 — Migration sécurité critique :
 * Avant cette refonte, le client appelait directement Mistral cloud avec
 * `VITE_MISTRAL_API_KEY` inlinée dans le bundle (clé exfiltrable en 30s via
 * DevTools). Désormais TOUT passe par l'Edge Function Supabase `marius-chat`
 * qui détient le secret `MISTRAL_API_KEY` côté serveur. Le frontend ne
 * connaît plus aucune clé Mistral.
 *
 * SSE : l'Edge Function relaie le stream Mistral sans modification (format
 * OpenAI-compat, déjà parsé par parseSseChunk).
 */
import { supabase } from '../../services/supabaseClient';

export interface MariusMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const isMariusConfigured: boolean = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Appelle l'Edge Function marius-chat. Le `systemPrompt` argument est conservé
 * pour rétro-compat de l'API mais ignoré côté client — c'est le serveur qui
 * applique son propre system prompt (anti prompt-injection).
 */
export async function callMariusAPI(
  messages: MariusMessage[],
  _systemPromptIgnoredServerOwns: string,
  signal: AbortSignal,
): Promise<Response> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase non configuré (VITE_SUPABASE_URL / ANON_KEY manquants)');
  }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error('Authentification requise pour utiliser Marius');
  }

  return await fetch(`${SUPABASE_URL}/functions/v1/marius-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      messages: messages.filter((m) => m.role !== 'system'),
    }),
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
