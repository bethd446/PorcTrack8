/**
 * File d'attente offline (simple) : stocke les opérations d'écriture dans localStorage.
 * Objectif: l'app fonctionne sans internet, puis synchronise dès que possible.
 */

import { postAction } from './googleSheets';

export type QueueItem = {
  id: string;
  createdAt: string;
  kind: 'POST_ACTION';
  payload: any;
  tries: number;
  lastError?: string;
};

const KEY = 'porc800_offline_queue_v1';

function load(): QueueItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(items: QueueItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

function uid() {
  return 'Q-' + Math.random().toString(36).slice(2, 10).toUpperCase();
}

export function queuePostAction(payload: any) {
  const items = load();
  items.push({
    id: uid(),
    createdAt: new Date().toISOString(),
    kind: 'POST_ACTION',
    payload,
    tries: 0,
  });
  save(items);
}

export function getQueueStatus() {
  const items = load();
  return {
    pending: items.length,
    items,
  };
}

export async function flushQueueOnce() {
  const items = load();
  if (items.length === 0) return { sent: 0, remaining: 0 };

  // envoie en FIFO
  const next = items[0];
  const res = await postAction(next.payload);

  if (res.success) {
    items.shift();
    save(items);
    return { sent: 1, remaining: items.length };
  }

  next.tries += 1;
  next.lastError = res.message || 'ERROR';
  items[0] = next;
  save(items);
  return { sent: 0, remaining: items.length, error: next.lastError };
}

export async function flushQueue(max = 20) {
  let sent = 0;
  let lastError: string | undefined;

  for (let i = 0; i < max; i++) {
    const r: any = await flushQueueOnce();
    if (r.sent === 1) {
      sent += 1;
      continue;
    }
    lastError = r.error;
    break;
  }

  const remaining = load().length;
  return { sent, remaining, lastError };
}
