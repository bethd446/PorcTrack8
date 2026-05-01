/**
 * voiceDictation — Hook React pour la dictée vocale via Web Speech API.
 *
 * Compatibilité :
 *   - Chrome / Edge (desktop + Android) : OK natif via `webkitSpeechRecognition`.
 *   - Safari (iOS 14.5+ / macOS 14.3+) : OK avec permission micro explicite.
 *   - Firefox : NON supporté (pas d'implémentation Web Speech à ce jour).
 *
 * Stratégie : on détecte `webkitSpeechRecognition` ou `SpeechRecognition` au
 * mount. Si absent → `isSupported = false` et `start()/stop()` sont des no-op.
 * Le composant peut alors désactiver le bouton micro avec un tooltip clair.
 *
 * Le transcript est cumulé localement (`finalTranscript`) tant que la session
 * d'écoute est ouverte. À chaque résultat (interim ou final), on met à jour
 * `transcript`. Au stop, on garde la valeur finale jusqu'au prochain `start()`.
 *
 * Utilisation :
 *
 *   const { isSupported, isListening, transcript, start, stop } = useVoiceDictation();
 *
 *   <button onClick={isListening ? stop : start} disabled={!isSupported}>
 *     {isListening ? 'Arrêter' : 'Démarrer'}
 *   </button>
 *   {transcript && <p>{transcript}</p>}
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ── Types Web Speech API minimal (non disponibles dans lib.dom) ──────────────
interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: { readonly transcript: string };
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface WindowWithSpeech extends Window {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
}

export interface DictationState {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as WindowWithSpeech;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useVoiceDictation(lang = 'fr-FR'): DictationState {
  const Ctor = useMemo(() => getRecognitionCtor(), []);
  const isSupported = Ctor !== null;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const stop = useCallback(() => {
    const r = recognitionRef.current;
    if (!r) return;
    try {
      r.stop();
    } catch {
      /* déjà stoppé */
    }
  }, []);

  const start = useCallback(() => {
    if (!Ctor) return;
    if (recognitionRef.current) {
      // Sécurité : si une session traîne, on l'abort avant d'en démarrer une autre.
      try {
        recognitionRef.current.abort();
      } catch {
        /* noop */
      }
    }
    setError(null);
    setTranscript('');
    const r = new Ctor();
    r.lang = lang;
    r.continuous = false;
    r.interimResults = true;

    r.onresult = (event: SpeechRecognitionEvent) => {
      let acc = '';
      for (let i = 0; i < event.results.length; i++) {
        acc += event.results[i][0].transcript;
      }
      setTranscript(acc);
    };
    r.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(event.error || 'Erreur dictée');
      setIsListening(false);
    };
    r.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = r;
    try {
      r.start();
      setIsListening(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Démarrage dictée échoué');
      setIsListening(false);
      recognitionRef.current = null;
    }
  }, [Ctor, lang]);

  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      const r = recognitionRef.current;
      if (r) {
        try {
          r.abort();
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  return { isSupported, isListening, transcript, error, start, stop, reset };
}
