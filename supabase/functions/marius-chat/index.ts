// Marius IA — Edge Function PorcTrack
// Forward le message du client vers Mistral API avec system prompt métier
// La clé Mistral reste côté serveur (secret MISTRAL_API_KEY).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MISTRAL_KEY = Deno.env.get("MISTRAL_API_KEY");
const MODEL = Deno.env.get("MISTRAL_MODEL") ?? "mistral-small-latest";

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

// 2026-05-17 — CORS borné à la prod + dev local pour limiter abus tiers.
// Si nouveau domaine besoin : ajouter ici.
const ALLOWED_ORIGINS = new Set([
  "https://porctrack.tech",
  "https://www.porctrack.tech",
  "https://app.porctrack.tech",
  "http://localhost:5173",
  "http://localhost:4173",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://porctrack.tech";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const CORS_HEADERS = corsHeaders(req.headers.get("Origin"));

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

  // Forward to Mistral API
  const upstream = await fetch("https://api.mistral.ai/v1/chat/completions", {
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
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    console.error("Mistral upstream error:", upstream.status, errText.slice(0, 500));
    return new Response(
      JSON.stringify({ error: `Mistral API error ${upstream.status}` }),
      { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Stream SSE through (format Mistral = format OpenAI déjà compatible avec ChatbotWidget actuel)
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
