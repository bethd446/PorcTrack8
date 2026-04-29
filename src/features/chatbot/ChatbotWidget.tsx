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
      const imageData = pendingImage ? pendingImage.split(',')[1] : undefined;
      const reply = await sendToGemini(next, imageData);
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
