import React, { useEffect, useMemo, useState } from 'react';
import { addWeeklyPoint } from '../features/notes/notesApi';
import { ensureNotesSheetsHeaders } from '../features/notes/ensureHeaders';
import { getQueueStatus, flushQueue } from '../services/offlineQueue';

const iso = (d: Date) => d.toISOString().slice(0, 10);

function weekKey(d: Date) {
  // Sxx-YYYY simple (ISO-ish)
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `S${String(weekNo).padStart(2, '0')}-${date.getUTCFullYear()}`;
}

export default function NotesWeekly() {
  const now = new Date();
  const [semaine, setSemaine] = useState(weekKey(now));
  const [dateDebut, setDateDebut] = useState(iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)));
  const [dateFin, setDateFin] = useState(iso(now));
  const [porcher, setPorcher] = useState(localStorage.getItem('porcher_name') || 'Romaric');
  const [cheptelResume, setCheptelResume] = useState('');
  const [evenements, setEvenements] = useState('');
  const [observations, setObservations] = useState('');
  const [actionsSemaineProchaine, setActionsSemaineProchaine] = useState('');

  const [status, setStatus] = useState<string>('');
  const [pending, setPending] = useState<number>(0);

  const refreshQueue = () => setPending(getQueueStatus().pending);

  useEffect(() => {
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

    const res = await addWeeklyPoint({
      semaine,
      dateDebut,
      dateFin,
      porcher,
      cheptelResume,
      evenements,
      observations,
      actionsSemaineProchaine,
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
        <h2 className="text-xl font-bold">Point hebdomadaire</h2>
        <div className="text-sm opacity-80">En attente: {pending}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="space-y-1">
          <div className="text-sm">Semaine</div>
          <input className="w-full rounded border p-2" value={semaine} onChange={e => setSemaine(e.target.value)} />
        </label>

        <label className="space-y-1">
          <div className="text-sm">Porcher</div>
          <input className="w-full rounded border p-2" value={porcher} onChange={e => setPorcher(e.target.value)} />
        </label>

        <label className="space-y-1">
          <div className="text-sm">Date début</div>
          <input className="w-full rounded border p-2" type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} />
        </label>

        <label className="space-y-1">
          <div className="text-sm">Date fin</div>
          <input className="w-full rounded border p-2" type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} />
        </label>

        <label className="space-y-1 md:col-span-2">
          <div className="text-sm">Cheptel résumé</div>
          <input className="w-full rounded border p-2" value={cheptelResume} onChange={e => setCheptelResume(e.target.value)} placeholder="Ex: Cheptel 103 / Maternité 10 / PS 18" />
        </label>

        <label className="space-y-1 md:col-span-2">
          <div className="text-sm">Événements</div>
          <textarea className="w-full rounded border p-2" rows={3} value={evenements} onChange={e => setEvenements(e.target.value)} />
        </label>

        <label className="space-y-1 md:col-span-2">
          <div className="text-sm">Observations</div>
          <textarea className="w-full rounded border p-2" rows={3} value={observations} onChange={e => setObservations(e.target.value)} />
        </label>

        <label className="space-y-1 md:col-span-2">
          <div className="text-sm">Actions semaine prochaine</div>
          <textarea className="w-full rounded border p-2" rows={3} value={actionsSemaineProchaine} onChange={e => setActionsSemaineProchaine(e.target.value)} />
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
