/**
 * V72 — Edge Function `send-push`
 * ────────────────────────────────
 * Envoie un Web Push (VAPID) aux souscriptions enregistrées dans
 * `public.push_subscriptions`. Filtre par `user_ids[]` et/ou `farm_id`.
 *
 * Secrets requis (Supabase Dashboard → Edge Functions → Secrets) :
 *   VAPID_PUBLIC_KEY    — clé publique VAPID (URL-safe base64, sans padding)
 *   VAPID_PRIVATE_KEY   — clé privée VAPID  (URL-safe base64, sans padding)
 *   VAPID_SUBJECT       — mailto:contact@porctrack.tech (par défaut)
 *
 * Body POST attendu :
 * {
 *   user_ids?: string[],         // optionnel — filtre par utilisateurs
 *   farm_id?:  string,           // optionnel — filtre par ferme
 *   title:     string,
 *   body:      string,
 *   icon?:     string,           // URL relative à l'origine ('/icons/icon-192.png')
 *   badge?:    string,
 *   url?:      string,           // URL d'ouverture au click
 *   category?: 'mise_bas' | 'stocks' | 'cycles_repro' | 'general',
 *   data?:     Record<string, unknown>,
 * }
 *
 * Réponse :
 * { sent: number, results: Array<{ id, ok, error? }> }
 *
 * Auth : `verify_jwt: true` — appelée par le frontend authentifié (toaster
 * de test) ou par d'autres Edge Functions/cron via service_role JWT.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import webpush from 'https://esm.sh/web-push@3.6.7';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT =
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contact@porctrack.tech';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

interface SendPushPayload {
  user_ids?: string[];
  farm_id?: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  category?: 'mise_bas' | 'stocks' | 'cycles_repro' | 'general';
  data?: Record<string, unknown>;
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const payload = (await req.json()) as SendPushPayload;
    if (!payload?.title || !payload?.body) {
      return new Response(
        JSON.stringify({ error: 'title and body are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      );
    }

    let query = supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('enabled', true);

    if (payload.user_ids?.length) {
      query = query.in('user_id', payload.user_ids);
    }
    if (payload.farm_id) {
      query = query.eq('farm_id', payload.farm_id);
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
