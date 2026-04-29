# Elite Redesign — Forêt & Maïs + Chatbot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Aligner l'app métier (app.porctrack.tech) et la vitrine (porctrack.tech) sur la palette "Forêt & Maïs", mettre à jour les logos, et ajouter un chatbot IA (Gemini) avec support vision.

**Architecture:** Swap des tokens CSS dans `src/index.css` (cascade automatique sur 60+ composants), mise à jour des SVG logos, nouveau composant `ChatbotWidget` flottant connecté à l'API Gemini déjà configurée dans `vite.config.ts`.

**Tech Stack:** Ionic 8 · React 18 · TypeScript · Tailwind v4 · Supabase · Gemini API (VITE_GEMINI_API_KEY ou process.env.GEMINI_API_KEY)

**Nouvelle palette:**
- Vert Forêt : `#2d5a1b` (primary, remplace `#10B981`)
- Maïs Doré  : `#d4920f` (accent gold, remplace `#F59E0B`)
- Terre/Boue : `#7a4a28` (accent sombre)
- Fond Ivoire: `#f5f0e6` (bg app, remplace `#FFFFFF`)

---

## Task 1: Mise à jour des tokens CSS couleurs

**Files:**
- Modify: `src/index.css` (lignes 55–130)

**Step 1: Remplacer le bloc `:root` tokens accent/Ionic**

Trouver et remplacer dans `src/index.css` :

```css
/* AVANT → APRÈS */
--color-accent-700: #047857;      →  --color-accent-700: #1a3d10;
--color-accent-600: #059669;      →  --color-accent-600: #235016;
--color-accent-500: #10B981;      →  --color-accent-500: #2d5a1b;
--color-accent-400: #34D399;      →  --color-accent-400: #4b8529;
--color-accent-100: #D1FAE5;      →  --color-accent-100: #d9ebbf;
--color-accent-50:  #ECFDF5;      →  --color-accent-50:  #eef5e0;

/* Amber → Gold */
--color-amber-500:  #F59E0B;      →  --color-amber-500:  #d4920f;
--color-amber-100:  #FEF3C7;      →  --color-amber-100:  #fef6c2;
--color-amber-50:   #FFFBEB;      →  --color-amber-50:   #fff8e1;

/* Legacy aliases */
--color-emerald-premium: #059669; →  --color-emerald-premium: #2d5a1b;
--color-forest-mid: #10B981;      →  --color-forest-mid: #3a6e22;
--color-forest-light: #D1FAE5;    →  --color-forest-light: #d9ebbf;
--color-amber-pork: #F59E0B;      →  --color-amber-pork: #d4920f;
--color-amber-deep: #D97706;      →  --color-amber-deep: #a87a0c;
```

Ajouter après `--color-amber-deep` :
```css
/* Nouveau — Terre / Boue */
--color-terre:       #7a4a28;
--color-terre-light: rgba(122,74,40,0.12);
/* Fond ivoire chaud */
--bg-app: #f5f0e6;
```

Mettre à jour le bloc Ionic `:root` dans `@layer base` :
```css
--ion-color-primary:          #2d5a1b;
--ion-color-primary-rgb:      45, 90, 27;
--ion-color-primary-contrast: #ffffff;
--ion-color-primary-shade:    #235016;
--ion-color-primary-tint:     #4b8529;
```

**Step 2: Vérifier TypeScript (aucun impact attendu — CSS seulement)**
```bash
cd /Users/desk/PorcTrack8 && npx tsc --noEmit 2>&1 | grep "error TS" | head -5
```
Expected: aucune erreur TS

**Step 3: Commit**
```bash
git add src/index.css
git commit -m "style: palette Forêt & Maïs — tokens CSS mis à jour"
```

---

## Task 2: Mise à jour des logos SVG (couleurs)

**Files:**
- Modify: `public/images/agritech-logo.svg`
- Modify: `public/images/agritech-mark.svg`
- Modify: `public/images/porc-mark.svg`
- Modify: `public/images/porctrack-lockup.svg`
- Modify: `public/images/porc-glyph.svg`
- Modify: `public/images/icon.svg`

**Step 1: Remplacer toutes les occurrences de couleurs obsolètes dans les SVGs**

```bash
# #10B981 → #2d5a1b
sed -i '' 's/#10B981/#2d5a1b/g; s/#10b981/#2d5a1b/g' \
  /Users/desk/PorcTrack8/public/images/agritech-logo.svg \
  /Users/desk/PorcTrack8/public/images/agritech-mark.svg \
  /Users/desk/PorcTrack8/public/images/porc-mark.svg \
  /Users/desk/PorcTrack8/public/images/porctrack-lockup.svg \
  /Users/desk/PorcTrack8/public/images/porc-glyph.svg \
  /Users/desk/PorcTrack8/public/images/icon.svg

# #12D394 → #3a6e22 (gradient start)
sed -i '' 's/#12D394/#3a6e22/g; s/#12d394/#3a6e22/g' \
  /Users/desk/PorcTrack8/public/images/agritech-logo.svg \
  /Users/desk/PorcTrack8/public/images/porctrack-lockup.svg \
  /Users/desk/PorcTrack8/public/images/porc-mark.svg

# #059669 → #235016
sed -i '' 's/#059669/#235016/g' \
  /Users/desk/PorcTrack8/public/images/agritech-logo.svg \
  /Users/desk/PorcTrack8/public/images/porctrack-lockup.svg
```

**Step 2: Vérifier visuellement (grep)**
```bash
grep -r "#10B981\|#12D394\|#10b981" /Users/desk/PorcTrack8/public/images/
```
Expected: aucun résultat

**Step 3: Commit**
```bash
git add public/images/
git commit -m "style: logos SVG mis à jour palette Forêt & Maïs"
```

---

## Task 3: PremiumHeader — logo vectoriel + couleurs

**Files:**
- Modify: `src/components/PremiumHeader.tsx`

**Step 1: Lire le fichier**
```bash
cat /Users/desk/PorcTrack8/src/components/PremiumHeader.tsx
```

**Step 2: Remplacer le titre texte par le logo SVG**

Trouver le bloc qui affiche "PorcTrack" en texte (exemple : `<span>PorcTrack</span>` ou `<h1>`) et le remplacer par :

```tsx
<img
  src="/images/porctrack-lockup.svg"
  alt="PorcTrack"
  className="h-8 w-auto"
  loading="eager"
/>
```

**Step 3: S'assurer que le fond header utilise `--color-accent-500` (cascade auto)**

Chercher les classes ou styles `bg-[#10B981]` ou `bg-emerald` hardcodés et remplacer par `bg-[var(--color-accent-500)]` ou la classe Tailwind équivalente.

**Step 4: TypeScript check**
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | head -5
```

**Step 5: Commit**
```bash
git add src/components/PremiumHeader.tsx
git commit -m "style(header): logo vectoriel porctrack-lockup.svg"
```

---

## Task 4: AgritechNavV2 — branding + palette

**Files:**
- Modify: `src/components/AgritechNavV2.tsx`

**Step 1: Lire le fichier**
```bash
cat /Users/desk/PorcTrack8/src/components/AgritechNavV2.tsx | head -80
```

**Step 2: Remplacer le titre texte "PorcTrack" par logo image**

Trouver `title = "PorcTrack"` ou le rendu du titre dans le JSX et ajouter l'image à côté ou à la place du texte dans la barre de navigation top/sidebar si présente.

**Step 3: Remplacer hardcoded emerald colors par tokens CSS**

Chercher :
```bash
grep -n "#10B981\|emerald\|#059669\|#34D399" src/components/AgritechNavV2.tsx
```
Remplacer par `var(--color-accent-500)`, `var(--color-accent-600)` etc.

**Step 4: TypeScript check + commit**
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | head -5
git add src/components/AgritechNavV2.tsx
git commit -m "style(nav): branding logo + palette Forêt & Maïs"
```

---

## Task 5: ChatbotWidget — composant flottant Gemini

**Files:**
- Create: `src/features/chatbot/ChatbotWidget.tsx`
- Create: `src/features/chatbot/index.ts`

**Context:**
- La clé Gemini est dans `process.env.GEMINI_API_KEY` (vite.config.ts la définit)
- L'API à utiliser : `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
- Le chatbot flotte en bas à droite (bouton FAB), s'ouvre en panneau slide-up
- Phase 1 : texte seulement (RAG sur contexte ferme)
- Phase 2 : support image (base64 inline dans la requête)

**Step 1: Créer `src/features/chatbot/ChatbotWidget.tsx`**

```tsx
import React, { useState, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Image, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
}

const SYSTEM_PROMPT = `Tu es l'assistant IA de PorcTrack, expert en élevage porcin GTTT.
Tu aides les éleveurs avec : suivi des bandes, règles biologiques (gestation 115j, lactation 28j),
alertes, traitements vétérinaires, nutrition et gestion d'élevage.
Réponds en français, de façon concise et pratique pour le terrain.`;

async function sendToGemini(
  messages: Message[],
  imageBase64?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY non configurée');

  const lastMsg = messages[messages.length - 1];

  const parts: unknown[] = [{ text: lastMsg.content }];
  if (imageBase64) {
    parts.push({
      inline_data: { mime_type: 'image/jpeg', data: imageBase64 },
    });
  }

  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [
      ...history,
      { role: 'user', parts },
    ],
    generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  if (!res.ok) throw new Error(`Gemini API error ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '(pas de réponse)';
}

export const ChatbotWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollBottom = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text && !pendingImage) return;

    const userMsg: Message = {
      role: 'user',
      content: text || '(analyse cette image)',
      imageUrl: pendingImage ?? undefined,
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setPendingImage(null);
    setLoading(true);
    scrollBottom();

    try {
      const reply = await sendToGemini(next, pendingImage?.split(',')[1]);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Erreur : ${String(e)}` },
      ]);
    } finally {
      setLoading(false);
      scrollBottom();
    }
  }, [input, messages, pendingImage]);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPendingImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Ouvrir l'assistant IA"
        className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full
                   bg-[var(--color-amber-500)] text-white shadow-lg
                   flex items-center justify-center
                   hover:scale-105 active:scale-95 transition-transform"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-[340px] max-h-[520px]
                    bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden
                    border border-[var(--color-accent-100)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3
                      bg-[var(--color-accent-500)] text-white">
        <div className="flex items-center gap-2">
          <img src="/images/porc-mark.svg" alt="" className="w-6 h-6" />
          <span className="font-semibold text-sm">Assistant PorcTrack</span>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Fermer">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-[200px]">
        {messages.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-8">
            Bonjour ! Je suis votre assistant élevage.<br />
            Posez une question ou envoyez une photo.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed
              ${m.role === 'user'
                ? 'bg-[var(--color-accent-500)] text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
              {m.imageUrl && (
                <img src={m.imageUrl} alt="photo" className="rounded-lg mb-1 max-h-32 object-cover" />
              )}
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-3 py-2">
              <Loader2 size={16} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Image preview */}
      {pendingImage && (
        <div className="px-3 pb-1 flex items-center gap-2">
          <img src={pendingImage} alt="preview" className="h-12 w-12 rounded-lg object-cover border" />
          <button onClick={() => setPendingImage(null)} className="text-xs text-gray-400">✕</button>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100">
        <input
          type="file"
          accept="image/*"
          ref={fileRef}
          onChange={handleImage}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="Ajouter une photo"
          className="text-gray-400 hover:text-[var(--color-accent-500)] transition-colors"
        >
          <Image size={20} />
        </button>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Question ou commande…"
          className="flex-1 text-sm bg-gray-50 rounded-full px-3 py-2
                     border border-gray-200 outline-none
                     focus:border-[var(--color-accent-500)]"
        />
        <button
          onClick={handleSend}
          disabled={loading || (!input.trim() && !pendingImage)}
          aria-label="Envoyer"
          className="w-9 h-9 rounded-full bg-[var(--color-accent-500)] text-white
                     flex items-center justify-center
                     disabled:opacity-40 hover:bg-[var(--color-accent-600)]
                     transition-colors"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
};
```

**Step 2: Créer `src/features/chatbot/index.ts`**
```ts
export { ChatbotWidget } from './ChatbotWidget';
```

**Step 3: TypeScript check**
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | head -10
```

**Step 4: Commit**
```bash
git add src/features/chatbot/
git commit -m "feat(chatbot): ChatbotWidget Gemini 2.0 Flash — texte + vision photo"
```

---

## Task 6: Intégrer le ChatbotWidget dans l'App

**Files:**
- Modify: `src/App.tsx`

**Step 1: Ajouter l'import**

Dans `src/App.tsx`, après les imports existants :
```tsx
import { ChatbotWidget } from './features/chatbot';
```

**Step 2: Ajouter le widget dans `AppContent` — juste avant `</IonApp>`**

```tsx
      {/* Chatbot IA flottant — visible sur toutes les routes protégées */}
      <ChatbotWidget />
    </IonApp>
```

**Step 3: TypeScript check**
```bash
npx tsc --noEmit 2>&1 | grep "error TS" | head -10
```

**Step 4: Commit**
```bash
git add src/App.tsx
git commit -m "feat(app): intégration ChatbotWidget dans le layout global"
```

---

## Task 7: Website — mise à jour logos porctrack.tech

**Files:**
- Modify: `website/index.html`
- Modify: `website/src/style.css`

**Step 1: Remplacer le logo dans la nav (website/index.html)**

Trouver `<img src="/images/logo.png"` et remplacer par :
```html
<img src="/images/porctrack-lockup.svg" alt="PorcTrack" class="h-8 w-auto" />
```
(2 occurrences : nav + footer)

**Step 2: Vérifier que les logos SVG existent dans website/public/images/**
```bash
ls /Users/desk/PorcTrack8/website/public/images/ 2>/dev/null || echo "dossier absent"
```

Si absent, copier depuis public/images :
```bash
mkdir -p /Users/desk/PorcTrack8/website/public/images/
cp /Users/desk/PorcTrack8/public/images/porctrack-lockup.svg \
   /Users/desk/PorcTrack8/public/images/porc-mark.svg \
   /Users/desk/PorcTrack8/website/public/images/
```

**Step 3: Build website**
```bash
cd /Users/desk/PorcTrack8/website && npm run build 2>&1 | tail -5
```

**Step 4: Commit**
```bash
cd /Users/desk/PorcTrack8
git add website/
git commit -m "style(website): logos SVG vectoriels + palette cohérente"
```

---

## Task 8: Build app + Deploy complet

**Step 1: Build app**
```bash
cd /Users/desk/PorcTrack8 && npm run build 2>&1 | tail -8
```
Expected: `✓ built in X.XXs`, zéro warning critique

**Step 2: Deploy app → app.porctrack.tech**
```bash
SSHPASS='OCmsyCIox8HXtypDh1HYWF68RCaMzn5V@' sshpass -e rsync -az --delete \
  -e "ssh -p 65002" dist/ \
  u806830338@fr-int-web1580.main-hosting.eu:~/domains/app.porctrack.tech/public_html/
echo "App ✅"
```

**Step 3: Deploy website → porctrack.tech**
```bash
SSHPASS='OCmsyCIox8HXtypDh1HYWF68RCaMzn5V@' sshpass -e rsync -az --delete \
  -e "ssh -p 65002" website/dist/ \
  u806830338@fr-int-web1580.main-hosting.eu:~/domains/porctrack.tech/public_html/
echo "Website ✅"
```

**Step 4: Push final**
```bash
git push origin main
```

---

## Checklist finale

- [ ] Tokens CSS : `#10B981` → `#2d5a1b`, amber → `#d4920f`
- [ ] Ionic primary color mis à jour
- [ ] Logos SVG sans `#10B981` ni `#12D394`
- [ ] PremiumHeader affiche `porctrack-lockup.svg`
- [ ] ChatbotWidget visible (bouton FAB ambre en bas à droite)
- [ ] Chatbot répond en français avec contexte GTTT
- [ ] Chatbot accepte les photos (vision Gemini)
- [ ] Website : logos vectoriels en place
- [ ] Build app : zéro erreur
- [ ] Deploy app.porctrack.tech : OK
- [ ] Deploy porctrack.tech : OK
