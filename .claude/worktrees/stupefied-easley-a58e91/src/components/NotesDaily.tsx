import React, { useEffect, useMemo, useState } from 'react';
import { addDailyNote } from '../features/notes/notesApi';
import { ensureNotesSheetsHeaders } from '../features/notes/ensureHeaders';
import { getQueueStatus, flushQueue } from '../services/offlineQueue';

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function NotesDaily() {
  const [date, setDate] = useState(todayISO());
  const [porcher, setPorcher] = useState(localStorage.getItem('porcher_name') || 'Romaric');
  const [eauOk, setEauOk] = useState<'Oui' | 'Non'>('Oui');
  const [alimentOk, setAlimentOk] = useState<'Oui' | 'Non'>('Oui');
  const [animauxAlertes, setAnimauxAlertes] = useState('RAS');
  const [naissances, setNaissances] = useState(0);
  const [mortalite, setMortalite] = useState(0);
  const [observations, setObservations] = useState('');
  const [actions, setActions] = useState('');

  const [status, setStatus] = useState<string>('');
  const [pending, setPending] = useState<number>(0);

  const refreshQueue = () => setPending(getQueueStatus().pending);

  useEffect(() => {
    // S'assure que les onglets ont les entêtes
    ensureNotesSheetsHeaders().catch(() => null);
    refreshQueue();
  }, []);

  useEffect(() => {
    localStorage.setItem('porcher_name', porcher);
  }, [porcher]);

  const canSubmit = useMemo(() => porcher.trim().length > 0, [porcher]);

  const onSubmit = async () => {
    if (!canSubmit) return;
    setStatus('Envoi...');

    const res = await addDailyNote({
      date,
      porcher,
      eauOk,
      alimentOk,
      animauxAlertes,
      naissances,
      mortalite,
      observations,
      actions,
    });

    refreshQueue();

    if (res.remaining === 0) setStatus('OK (synchronisé)');
    else setStatus(`Enregistré offline (en attente: ${res.remaining})`);
  };

  const onSync = async () => {
    setStatus('Synchronisation...');
    const r = await flushQueue(20);
    refreshQueue();
    if (r.remaining === 0) setStatus('Tout est synchronisé ✅');
    else setStatus(`Reste ${r.remaining} en attente (${r.lastError || 'offline'})`);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Note quotidienne</h2>
        <div className="text-sm opacity-80">En attente: {pending}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="space-y-1">
          <div className="text-sm">Date</div>
          <input className="w-full rounded border p-2" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </label>

        <label className="space-y-1">
          <div className="text-sm">Porcher</div>
          <input className="w-full rounded border p-2" value={porcher} onChange={e => setPorcher(e.target.value)} />
        </label>

        <label className="space-y-1">
          <div className="text-sm">Eau OK</div>
          <select className="w-full rounded border p-2" value={eauOk} onChange={e => setEauOk(e.target.value as any)}>
            <option value="Oui">Oui</option>
            <option value="Non">Non</option>
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-sm">Aliment OK</div>
          <select className="w-full rounded border p-2" value={alimentOk} onChange={e => setAlimentOk(e.target.value as any)}>
            <option value="Oui">Oui</option>
            <option value="Non">Non</option>
          </select>
        </label>

        <label className="space-y-1 md:col-span-2">
          <div className="text-sm">Animaux alertes</div>
          <input className="w-full rounded border p-2" value={animauxAlertes} onChange={e => setAnimauxAlertes(e.target.value)} placeholder="RAS ou ID + probleme" />
        </label>

        <label className="space-y-1">
          <div className="text-sm">Naissances</div>
          <input className="w-full rounded border p-2" type="number" inputMode="numeric" pattern="[0-9]*" value={naissances} onChange={e => setNaissances(Number(e.target.value))} />
        </label>

        <label className="space-y-1">
          <div className="text-sm">Mortalité</div>
          <input className="w-full rounded border p-2" type="number" inputMode="numeric" pattern="[0-9]*" value={mortalite} onChange={e => setMortalite(Number(e.target.value))} />
        </label>

        <label className="space-y-1 md:col-span-2">
          <div className="text-sm">Observations</div>
          <textarea className="w-full rounded border p-2" rows={4} value={observations} onChange={e => setObservations(e.target.value)} />
        </label>

        <label className="space-y-1 md:col-span-2">
          <div className="text-sm">Actions</div>
          <textarea className="w-full rounded border p-2" rows={3} value={actions} onChange={e => setActions(e.target.value)} />
        </label>
      </div>

      <div className="flex gap-2">
        <button className="pressable rounded bg-black text-white px-4 py-2" onClick={onSubmit} disabled={!canSubmit}>
          Enregistrer
        </button>
        <button className="pressable rounded border px-4 py-2" onClick={onSync}>
          Synchroniser
        </button>
      </div>

      {status && <div className="text-sm opacity-80">{status}</div>}
    </div>
  );
}
