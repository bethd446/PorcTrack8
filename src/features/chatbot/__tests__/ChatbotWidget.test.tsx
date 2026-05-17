// @vitest-environment jsdom
/**
 * ChatbotWidget — Marius RAG MVP
 *
 * Vérifie que le body fetch envoyé à l'API Mistral contient bien le bloc
 * CONTEXTE FERME en préfixe du dernier message user (ancrage RAG).
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Stub kvStore (pas de localStorage en jsdom test).
vi.mock('../../../services/kvStore', () => ({
  kvGet: vi.fn(() => null),
  kvSet: vi.fn(),
}));

// Mock useFarm avec un snapshot représentatif (Christophe, K13).
vi.mock('../../../context/FarmContext', () => ({
  useFarm: () => ({
    nomFerme: 'Ferme Liégeois',
    pays: 'France',
    truies: [
      {
        id: 'T-001',
        displayId: 'T-001',
        boucle: 'BCL-0001',
        statut: 'En attente saillie',
        stade: 'J118 post-saillie',
        ration: 0,
        synced: true,
      },
      {
        id: 'T-018',
        displayId: 'T-018',
        boucle: 'BCL-0018',
        statut: 'En maternité',
        stade: 'J-2',
        ration: 0,
        synced: true,
      },
    ],
    verrats: [
      { id: 'V-001', displayId: 'V-001', boucle: 'BCL-V-001', statut: 'Actif', ration: 0, synced: true },
    ],
    bandes: [],
    stockAliment: [
      { id: 'AL-1', libelle: 'Maïs', stockActuel: 0, unite: 'kg', seuilAlerte: 100, statutStock: 'RUPTURE' },
    ],
    stockVeto: [],
    alerts: [],
  }),
}));

// Mock useAuth.
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    userName: 'Christophe',
  }),
}));

// 2026-05-17 — Migration sécurité critique : l'appel Mistral est désormais
// routé via l'Edge Function `marius-chat`. Le frontend a besoin de
// VITE_SUPABASE_URL/ANON_KEY pour calculer `isMariusConfigured` et d'une
// session valide (JWT) pour l'Authorization header. `vi.hoisted` garantit
// l'exécution avant les imports ESM hoistés.
vi.hoisted(() => {
  const env = import.meta.env as Record<string, string>;
  env.VITE_SUPABASE_URL = 'https://test.supabase.co';
  env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
  env.VITE_SUPABASE_PUBLISHABLE_KEY = 'test-anon-key';
});

// Stub supabaseClient : auth.getSession() retourne un token de test pour
// que callMariusAPI puisse construire son Authorization header.
vi.mock('../../../services/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: 'test-jwt-token' } },
      })),
    },
  },
}));

import { ChatbotWidget } from '../ChatbotWidget';

beforeAll(() => {
  // jsdom : pas de localStorage par défaut dans certains setups
  if (typeof window !== 'undefined' && !window.localStorage) {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0,
      },
      configurable: true,
    });
  }
  // jsdom n'implémente pas scrollIntoView (utilisé par le widget pour
  // auto-scroll vers le bas du chat). Stub no-op.
  if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

beforeEach(() => {
  // Force l'ouverture du panel via l'event 'open-chatbot'.
  // Mock fetch — renvoie un stream SSE minimal qui se termine immédiatement.
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeStreamingResponse(): Response {
  // Construit un ReadableStream qui émet "data: [DONE]\n\n" puis ferme.
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"OK"}}]}\n\n'));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('ChatbotWidget — Marius RAG MVP', () => {
  it('injecte le bloc CONTEXTE FERME dans le body envoyé à Mistral', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => makeStreamingResponse());

    render(
      <MemoryRouter>
        <ChatbotWidget />
      </MemoryRouter>,
    );

    // Le widget reste fermé tant que l'event 'open-chatbot' n'est pas dispatché.
    act(() => {
      window.dispatchEvent(new Event('open-chatbot'));
    });

    // Saisir et soumettre la question.
    const input = await screen.findByLabelText(/votre question/i);
    fireEvent.change(input, { target: { value: 'T-001' } });
    const form = input.closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    // Récupère le body JSON du premier appel fetch (Mistral).
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBeTypeOf('string');
    const payload = JSON.parse(init.body as string) as {
      messages: Array<{ role: string; content: string }>;
    };
    const lastUser = [...payload.messages].reverse().find((m) => m.role === 'user');
    expect(lastUser).toBeDefined();

    // Le dernier user message DOIT contenir le bloc CONTEXTE FERME et la
    // question originale en suffixe.
    expect(lastUser!.content).toContain('[CONTEXTE FERME');
    expect(lastUser!.content).toContain('Ferme Liégeois');
    expect(lastUser!.content).toContain('T-001');
    expect(lastUser!.content).toContain('Christophe');
    expect(lastUser!.content).toContain('Maïs 0kg (RUPTURE)');
    expect(lastUser!.content).toContain('[FIN CONTEXTE]');
    expect(lastUser!.content).toMatch(/Question utilisateur : T-001$/);
  });

  it('affiche le user message ORIGINAL dans l\'UI (pas le bloc contexte)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => makeStreamingResponse());

    render(
      <MemoryRouter>
        <ChatbotWidget />
      </MemoryRouter>,
    );

    act(() => {
      window.dispatchEvent(new Event('open-chatbot'));
    });

    const input = await screen.findByLabelText(/votre question/i);
    fireEvent.change(input, { target: { value: 'Ma question' } });
    const form = input.closest('form');
    fireEvent.submit(form!);

    // La bulle user UI affiche "Ma question" tel quel (pas le bloc CONTEXTE).
    await screen.findByText('Ma question');
    expect(screen.queryByText(/CONTEXTE FERME/)).toBeNull();
  });
});
