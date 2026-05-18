/**
 * DevDatePanel — Widget de simulation de date pour QA / démo.
 *
 * V81 Sprint 3 — Permet à un testeur de "voyager dans le temps" sans
 * recompiler : on saisit une date au format `yyyy-MM-dd`, on clique
 * "Appliquer", on recharge → toutes les alertes biologiques se recalculent
 * comme si on était à cette date (mises-bas attendues, sevrages, retours
 * chaleur, échographies, sorties abattoir, etc.).
 *
 * Visible uniquement en DEV (`import.meta.env.DEV === true`) — auto-masqué
 * en build prod. Le helper `clock.ts` est de toute façon verrouillé en
 * prod sauf si `VITE_ALLOW_MOCK_DATE=1` est passé au build.
 */
import React, { useEffect, useState } from 'react';
import { AlertCircle, RotateCcw, Calendar } from 'lucide-react';
import { getMockDate, setMockDate } from '../../../lib/clock';

const DevDatePanel: React.FC = () => {
  const isDev = import.meta.env.DEV;
  const [value, setValue] = useState<string>('');
  const [active, setActive] = useState<Date | null>(null);

  useEffect(() => {
    if (!isDev) return;
    const cur = getMockDate();
    setActive(cur);
    if (cur) setValue(cur.toISOString().slice(0, 10));
  }, [isDev]);

  if (!isDev) return null;

  const handleApply = (): void => {
    if (!value) return;
    setMockDate(value);
    window.location.reload();
  };

  const handleClear = (): void => {
    setMockDate(null);
    window.location.reload();
  };

  return (
    <section
      aria-label="Simulation de date (dev)"
      style={{
        marginTop: 32,
        padding: 18,
        border: '1px dashed var(--pt-line-strong)',
        borderRadius: 14,
        background: 'var(--pt-warn-bg-pale, rgba(192, 138, 61, 0.05))',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Calendar size={16} aria-hidden style={{ color: 'var(--pt-warning)' }} />
        <h3
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--pt-ink)',
            fontFamily: 'var(--pt-font-mono)',
          }}
        >
          Simulation de date · DEV
        </h3>
      </header>

      <p style={{ margin: 0, fontSize: 13, color: 'var(--pt-muted)', lineHeight: 1.5 }}>
        Saisis une date au format <code>aaaa-mm-jj</code> pour que toutes les alertes
        biologiques se recalculent comme si on était à cette date. Utile pour valider
        une mise-bas attendue, un sevrage dû, ou montrer une démo.
      </p>

      {active && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            background: 'var(--pt-warning)',
            color: 'white',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <AlertCircle size={14} aria-hidden />
          Date simulée active : <strong>{active.toISOString().slice(0, 10)}</strong>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Date simulée"
          style={{
            flex: 1,
            minWidth: 160,
            minHeight: 44,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--pt-line-strong)',
            background: 'var(--pt-bg, white)',
            color: 'var(--pt-ink)',
            fontFamily: 'var(--pt-font-mono)',
            fontSize: 14,
          }}
        />
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={handleApply}
          disabled={!value}
          style={{ minHeight: 44 }}
        >
          Appliquer + reload
        </button>
        {active && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={handleClear}
            style={{ minHeight: 44, display: 'flex', alignItems: 'center', gap: 4 }}
            aria-label="Revenir à la date réelle"
          >
            <RotateCcw size={14} aria-hidden /> Effacer
          </button>
        )}
      </div>
    </section>
  );
};

export default DevDatePanel;
