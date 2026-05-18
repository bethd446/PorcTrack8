// Marius IA — Edge Function PorcTrack
// Forward le message du client vers Mistral API avec system prompt métier
// La clé Mistral reste côté serveur (secret MISTRAL_API_KEY).
//
// 2026-05-18 — Hardening audit phase 1 :
//   - AbortController 30s sur le fetch Mistral (timeout strict).
//   - Rate-limit 30 req/min/user via _edge_rate_limit (service_role).
//   - JWT user extrait pour traçabilité rate-limit.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  buildCorsHeaders,
  evaluateRateLimit,
  extractUserIdFromJwt,
  RATE_LIMITS,
  RATE_LIMIT_WINDOW_MS,
} from "../_shared/security.ts";

const MISTRAL_KEY = Deno.env.get("MISTRAL_API_KEY");
const MODEL = Deno.env.get("MISTRAL_MODEL") ?? "mistral-small-latest";
const UPSTREAM_TIMEOUT_MS = 30_000;
const FUNCTION_NAME = "marius-chat";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const SYSTEM_PROMPT = `Tu es Marius, assistant IA spécialisé en gestion technique de troupeau porcin (GTTT). Tu accompagnes des éleveurs naisseurs-engraisseurs francophones (France, Belgique, Côte d'Ivoire, Sénégal).

## Constantes biologiques strictes (NE JAMAIS dévier)
- Gestation truie = 115 jours (jamais 145, jamais 114)
- Lactation/sevrage standard = 28 jours (sevrage minimum 21j, idéal 28j)
- Retour chaleur post-sevrage = 3 à 7 jours (médiane J+5)
- Échographie diagnostic gestation = J25 à J35 post-saillie
- Mortalité allaitement seuil critique = >15%

## Vocabulaire métier français canonique
- ISSE = Indice Sevré-Saillie : porcelets sevrés / truie / cycle. >12 = excellent, 10-12 = bon, <10 = à améliorer.
- IEM = Intervalle Entre Mises-bas : durée entre 2 mises-bas successives (cible ~145j).
- GMQ = Gain Moyen Quotidien : gain de poids en grammes/jour.
- Parité = numéro de mise-bas (parité 1 = primipare, 2-5 = pleine production, 6+ = vieillissante).
- NV = Nés Vivants par portée. NM = Nés Morts. SV = Sevrés Vivants.
- Bande = lot de porcs nés/élevés ensemble (cohorte).
- Loge = case d'hébergement (maternité M-XX, post-sevrage PS-XX, croissance C-XX, engraissement E-XX, finition F-XX).

## Signes de chaleur (truie post-sevrage)
Signes principaux : vulve gonflée et rougie, écoulements vaginaux clairs, **réflexe d'immobilisation** à la pression dorsale (signe pathognomonique pour saillir), recherche du verrat, comportement nerveux/agité, vocalisation. Signes secondaires : appétit irrégulier, montes entre truies. Apparition typique : J3 à J7 post-sevrage.

## Phases cycle de vie post-sevrage (PorcTrack standard)
- Post-sevrage : J28 → J63 (~35 jours)
- Croissance : J63 → J100 (~37 jours)
- Engraissement : J100 → J180 (~80 jours)
- Finition : J180+ ou poids ≥100 kg (sortie abattoir 110 kg)

## 16 règles d'alerte automatiques (rappel)
R1 Mise-Bas (J-3 à J+2) · R2 Sevrage (J+28) · R3 Retour Chaleur · R4 Mortalité (>15%) · R5 Stock Aliment · R5b Stock Véto · R6 Regroupement bandes · R7 Échographie (J25-35) · R8 Re-Saillie · R9 Retard Phase · R10 Surdensité · R11 Réforme Perf · R12 Réforme Inactivité · R13 Manque Pesée · R14 Portée Orpheline · R15 Passage Phase · R16 Sortie Abattoir.

## Style de réponse
- Concis, factuel, en français professionnel.
- Pour les calculs de date : explicite la méthode (ex: "saillie 26/01 + 115j = 21/05").
- Préfère les puces et chiffres clés au paragraphe verbeux.
- Si tu ne sais pas, dis-le franchement : ne JAMAIS inventer de chiffre, de définition ou de protocole.
- Devise : adapter au contexte ferme (EUR France/Belgique, FCFA Côte d'Ivoire/Sénégal). Si pays inconnu, demander.`;

// Rate-limit "leaky bucket" minute glissante. Persisté en DB pour survivre
// au cold-start ; coût = 2 RPCs (read + write) seulement quand allowed,
// 1 RPC quand bloqué.
async function checkAndUpdateRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  fn: string
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  const limit = RATE_LIMITS[fn] ?? 30;
  const now = Date.now();

  const { data, error } = await supabase
    .from("_edge_rate_limit")
    .select("window_start, count_in_window")
    .eq("user_id", userId)
    .eq("function_name", fn)
    .maybeSingle();

  if (error) {
    // Fail-open : on log mais on n'empêche pas l'appel (sinon panne = DoS).
    console.error("rate-limit read error", error.message);
    return { allowed: true, retryAfterMs: 0 };
  }

  const windowStart = data?.window_start
    ? new Date(data.window_start as string).getTime()
    : now;
  const count = (data?.count_in_window as number | undefined) ?? 0;

  const decision = evaluateRateLimit(now, windowStart, count, limit, RATE_LIMIT_WINDOW_MS);
  if (!decision.allowed) {
    return { allowed: false, retryAfterMs: decision.retryAfterMs };
  }

  const elapsed = now - windowStart;
  const newWindowStart =
    elapsed >= RATE_LIMIT_WINDOW_MS ? new Date(now).toISOString() : data?.window_start;
  const newCount = elapsed >= RATE_LIMIT_WINDOW_MS ? 1 : count + 1;

  const { error: upsertError } = await supabase
    .from("_edge_rate_limit")
    .upsert(
      {
        user_id: userId,
        function_name: fn,
        window_start: newWindowStart,
        count_in_window: newCount,
      },
      { onConflict: "user_id,function_name" }
    );
  if (upsertError) {
    console.error("rate-limit write error", upsertError.message);
  }
  return { allowed: true, retryAfterMs: 0 };
}

Deno.serve(async (req: Request) => {
  const CORS_HEADERS = buildCorsHeaders(req.headers.get("Origin"));

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Auth : Supabase JWT vérifié auto si verify_jwt = true (default).

  if (!MISTRAL_KEY) {
    return new Response(
      JSON.stringify({ error: "Server not configured: MISTRAL_API_KEY secret missing" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Extraction user_id pour rate-limit
  const userId = extractUserIdFromJwt(req.headers.get("Authorization"));
  if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const rl = await checkAndUpdateRateLimit(supabase, userId, FUNCTION_NAME);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          retry_after_ms: rl.retryAfterMs,
        }),
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)),
          },
        }
      );
    }
  }

  type ChatRole = "user" | "assistant" | "system";
  interface ChatMessage { role: ChatRole; content: string }
  interface ChatBody {
    message?: string;
    context?: string;
    messages?: ChatMessage[];
  }

  let body: ChatBody | null = null;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Construction des messages envoyés à Mistral. Le system prompt est
  // toujours injecté côté serveur (anti prompt-injection client-side).
  let forwardMessages: ChatMessage[];

  if (Array.isArray(body?.messages) && body.messages.length > 0) {
    // 2026-05-17 — Nouveau format : historique conversationnel complet.
    // On filtre les system du client (jamais respectés — c'est nous le serveur),
    // on borne à 12 messages max + 2000 chars/msg (anti prompt-injection).
    const sanitized = body.messages
      .filter((m) => m && m.role !== "system" && typeof m.content === "string")
      .slice(-12)
      .map((m) => ({
        role: m.role,
        content: m.content.length > 2000 ? m.content.slice(0, 2000) : m.content,
      }));
    if (sanitized.length === 0) {
      return new Response(
        JSON.stringify({ error: "Body.messages must contain user/assistant turns" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
    forwardMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...sanitized];
  } else {
    // Ancien format (rétro-compat) : { message, context? } → 1 user message.
    const message = body?.message?.trim();
    if (!message) {
      return new Response(
        JSON.stringify({ error: "Body must contain { messages: [...] } OR { message: string }" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
    const ctx = body?.context && body.context.length > 2000
      ? body.context.slice(0, 2000)
      : body?.context;
    const userContent = ctx ? `${ctx}\n\n${message}` : message;
    forwardMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ];
  }

  // 2026-05-18 — AbortController 30s pour éviter qu'un upstream Mistral lent
  // bloque la fonction (timeout edge runtime = 25-60s selon plan ; on borne).
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MISTRAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: forwardMessages,
        stream: true,
        temperature: 0.2,
        max_tokens: 800,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const aborted = err instanceof Error && err.name === "AbortError";
    console.error("Mistral upstream fetch failed:", aborted ? "timeout" : err);
    return new Response(
      JSON.stringify({
        error: aborted ? "Upstream timeout" : "Upstream unreachable",
      }),
      {
        status: aborted ? 504 : 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  if (!upstream.ok) {
    clearTimeout(timeoutId);
    const errText = await upstream.text();
    console.error("Mistral upstream error:", upstream.status, errText.slice(0, 500));
    return new Response(
      JSON.stringify({ error: `Mistral API error ${upstream.status}` }),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Stream SSE through (format Mistral = format OpenAI déjà compatible avec ChatbotWidget actuel)
  // Note : on ne clear pas le timeout ici — il s'éteint naturellement quand
  // le stream se termine côté client (signal.aborted est ignoré une fois la
  // réponse commencée).
  return new Response(upstream.body, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
