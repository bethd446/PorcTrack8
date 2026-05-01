import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Send, Image, Loader2 } from 'lucide-react';
import MariusFAB from '../../components/design/MariusFAB';

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
  _messages: Message[],
  _imageBase64?: string
): Promise<string> {
  // SYSTEM_PROMPT conservé pour ré-activation future via proxy backend.
  void SYSTEM_PROMPT;
  throw new Error(
    'Marius est en cours de configuration. La connexion à l\'IA sera bientôt disponible.',
  );
}

export const ChatbotWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-chatbot', handler);
    return () => window.removeEventListener('open-chatbot', handler);
  }, []);
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
    return <MariusFAB online onClick={() => setOpen(true)} />;
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-[340px] max-h-[520px]
                    rounded-3xl shadow-2xl flex flex-col overflow-hidden
                    border border-[var(--color-accent-100)]"
         style={{ background: 'var(--bg-surface)' }}>
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
          <p className="text-xs text-center mt-8" style={{ color: 'var(--muted)' }}>
            Bonjour ! Je suis votre assistant élevage.<br />
            Posez une question ou envoyez une photo.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed
              ${m.role === 'user'
                ? 'bg-[var(--color-accent-500)] text-white rounded-br-sm'
                : 'rounded-bl-sm'}`}
              style={m.role === 'user' ? undefined : { background: 'var(--bg-surface-2)', color: 'var(--ink)' }}>
              {m.imageUrl && (
                <img src={m.imageUrl} alt="photo" className="rounded-lg mb-1 max-h-32 object-cover" />
              )}
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-3 py-2" style={{ background: 'var(--bg-surface-2)' }}>
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--muted)' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Image preview */}
      {pendingImage && (
        <div className="px-3 pb-1 flex items-center gap-2">
          <img src={pendingImage} alt="preview" className="h-12 w-12 rounded-lg object-cover border" />
          <button onClick={() => setPendingImage(null)} className="text-xs" style={{ color: 'var(--muted)' }}>✕</button>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t" style={{ borderColor: 'var(--line)' }}>
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
          className="hover:text-[var(--color-accent-500)] transition-colors"
          style={{ color: 'var(--muted)' }}
        >
          <Image size={20} />
        </button>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Question ou commande…"
          className="flex-1 text-sm rounded-full px-3 py-2
                     border outline-none
                     focus:border-[var(--color-accent-500)]"
          style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--line)' }}
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
