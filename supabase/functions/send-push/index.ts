/**
 * V72 — Edge Function `send-push`
 * ────────────────────────────────
 * Envoie un Web Push (VAPID) aux souscriptions enregistrées dans
 * `public.push_subscriptions`. Filtre par `user_ids[]` et/ou `farm_id`.
 *
 * 2026-05-18 — Hardening audit phase 1 :
 *   - CORS strict (whitelist porctrack.tech + localhost dev).
 *   - Cross-tenant : vérification `farm_id ∈ farm_members(user_id=auth.uid)`.
 *   - Validation stricte du payload (helper `validateSendPushPayload`).
 *   - Sanitization `payload.url` (schéma http/https + host whitelisté).
 *   - Rate-limit 10 req/min/user via _edge_rate_limit (service_role).
 *
 * Secrets requis (Supabase Dashboard → Edge Functions → Secrets) :
 *   VAPID_PUBLIC_KEY    — clé publique VAPID (URL-safe base64, sans padding)
 *   VAPID_PRIVATE_KEY   — clé privée VAPID  (URL-safe base64, sans padding)
 *   VAPID_SUBJECT       — mailto:contact@porctrack.tech (par défaut)
 *
 * Auth : `verify_jwt: true` — le frontend authentifié OU service_role appelle.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import webpush from 'https://esm.sh/web-push@3.6.7';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import {
  buildCorsHeaders,
  evaluateRateLimit,
  extractUserIdFromJwt,
  isOriginAllowed,
  RATE_LIMITS,
  RATE_LIMIT_WINDOW_MS,
  validateSendPushPayload,
} from '../_shared/security.ts';

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT =
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contact@porctrack.tech';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const FUNCTION_NAME = 'send-push';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Vérifie que l'utilisateur appartient à la ferme (farm_members).
async function userBelongsToFarm(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  farmId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('farm_members')
    .select('user_id')
    .eq('user_id', userId)
    .eq('farm_id', farmId)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('farm_members lookup error', error.message);
    return false;
  }
  return !!data;
}

async function checkAndUpdateRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  fn: string,
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const limit = RATE_LIMITS[fn] ?? 10;
  const now = Date.now();

  const { data, error } = await supabase
    .from('_edge_rate_limit')
    .select('window_start, count_in_window')
    .eq('user_id', userId)
    .eq('function_name', fn)
    .maybeSingle();
  if (error) {
    console.error('rate-limit read error', error.message);
    return { allowed: true, retryAfterMs: 0 };
  }

  const windowStart = data?.window_start
    ? new Date(data.window_start as string).getTime()
    : now;
  const count = (data?.count_in_window as number | undefined) ?? 0;

  const decision = evaluateRateLimit(
    now,
    windowStart,
    count,
    limit,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!decision.allowed) {
    return { allowed: false, retryAfterMs: decision.retryAfterMs };
  }

  const elapsed = now - windowStart;
  const newWindowStart =
    elapsed >= RATE_LIMIT_WINDOW_MS
      ? new Date(now).toISOString()
      : data?.window_start;
  const newCount = elapsed >= RATE_LIMIT_WINDOW_MS ? 1 : count + 1;

  const { error: upsertError } = await supabase
    .from('_edge_rate_limit')
    .upsert(
      {
        user_id: userId,
        function_name: fn,
        window_start: newWindowStart,
        count_in_window: newCount,
      },
      { onConflict: 'user_id,function_name' },
    );
  if (upsertError) console.error('rate-limit write error', upsertError.message);
  return { allowed: true, retryAfterMs: 0 };
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = buildCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    // Refuse les preflights d'origins inconnus.
    if (origin && !isOriginAllowed(origin)) {
      return new Response('forbidden', { status: 403 });
    }
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // CORS strict pour les POST aussi : si Origin présent mais non whitelisté,
  // on refuse. (Les appels server-to-server n'envoient pas d'Origin.)
  if (origin && !isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: 'origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return new Response(
      JSON.stringify({
        error:
          'VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Edge Function secrets.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const rawPayload = await req.json().catch(() => null);
    const validation = validateSendPushPayload(rawPayload);
    if (!validation.ok || !validation.value) {
      return new Response(
        JSON.stringify({ error: validation.error ?? 'invalid payload' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }
    const payload = validation.value;

    // Auth user (depuis JWT) — requise pour le check cross-tenant et le rate-limit.
    const userId = extractUserIdFromJwt(req.headers.get('Authorization'));
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    // Rate-limit
    const rl = await checkAndUpdateRateLimit(supabase, userId, FUNCTION_NAME);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retry_after_ms: rl.retryAfterMs,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)),
            ...corsHeaders,
          },
        },
      );
    }

    // Cross-tenant : refuse si user n'appartient pas à la farm cible.
    const belongs = await userBelongsToFarm(supabase, userId, payload.farm_id);
    if (!belongs) {
      console.warn(
        `send-push forbidden: user=${userId} farm=${payload.farm_id}`,
      );
      return new Response(
        JSON.stringify({ error: 'forbidden: user not in farm' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    // user_ids[] : on filtre pour ne garder que ceux qui sont aussi membres
    // de la farm. Empêche l'escalade "j'envoie un push à un user d'une autre farm".
    let allowedUserIds: string[] | undefined = payload.user_ids;
    if (payload.user_ids && payload.user_ids.length > 0) {
      const { data: members, error: memberErr } = await supabase
        .from('farm_members')
        .select('user_id')
        .eq('farm_id', payload.farm_id)
        .in('user_id', payload.user_ids);
      if (memberErr) {
        console.error('farm_members filter error', memberErr.message);
        return new Response(
          JSON.stringify({ error: 'internal error filtering user_ids' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          },
        );
      }
      allowedUserIds = (members ?? []).map(
        (r) => (r as { user_id: string }).user_id,
      );
      if (allowedUserIds.length === 0) {
        return new Response(
          JSON.stringify({ sent: 0, total: 0, results: [] }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          },
        );
      }
    }

    let query = supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('enabled', true)
      .eq('farm_id', payload.farm_id);

    if (allowedUserIds && allowedUserIds.length > 0) {
      query = query.in('user_id', allowedUserIds);
    }

    const { data: subs, error } = await query;
    if (error) throw error;

    const subRows = (subs ?? []) as PushSubscriptionRow[];

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon ?? '/images/porc-mark.svg',
      badge: payload.badge ?? '/images/porc-mark.svg',
      url: payload.url,
      category: payload.category,
      data: payload.data,
    });

    const settled = await Promise.allSettled(
      subRows.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            notificationPayload,
          );
          await supabase
            .from('push_subscriptions')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', sub.id);
          return { id: sub.id, ok: true as const };
        } catch (err) {
          const e = err as { statusCode?: number; message?: string };
          if (e.statusCode === 410 || e.statusCode === 404) {
            await supabase
              .from('push_subscriptions')
              .update({ enabled: false })
              .eq('id', sub.id);
          }
          return {
            id: sub.id,
            ok: false as const,
            error: e.message ?? 'unknown',
            statusCode: e.statusCode,
          };
        }
      }),
    );

    const results = settled.map((r) =>
      r.status === 'fulfilled'
        ? r.value
        : { id: 'unknown', ok: false as const, error: String(r.reason) },
    );

    return new Response(
      JSON.stringify({
        sent: results.filter((r) => r.ok).length,
        total: results.length,
        results,
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
