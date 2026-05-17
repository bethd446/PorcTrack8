// Cycles — pipeline horizontal 5 phases + cartes bandes positionnées dessus.

function CyclesScreen({ onOpenBande }) {
  // Les 5 phases et leur durée (jours)
  const PHASES = [
    { id: 'gestation',  label: 'GESTATION',     days: 115, tone: 'var(--accent-cycles)' },
    { id: 'maternite',  label: 'MATERNITÉ',     days:  28, tone: 'var(--gold)' },
    { id: 'postsevr',   label: 'POST-SEVRAGE',  days:  32, tone: 'var(--teal)' },
    { id: 'croiss',     label: 'CROISSANCE',    days:  60, tone: 'var(--amber)' },
    { id: 'finition',   label: 'FINITION',      days:  60, tone: 'var(--coral)' },
  ];
  const TOTAL = PHASES.reduce((s, p) => s + p.days, 0);

  // Bandes actives, position = jour dans le pipeline global (0..TOTAL)
  const BANDES = [
    { id: 'B-24A', truie: 'T-017', phase: 'maternite', dayInPhase: 26, detail: 'Mise-bas J-2' },
    { id: 'B-23C', truie: 'T-024', phase: 'gestation', dayInPhase: 87, detail: 'J+87' },
    { id: 'B-23A', truie: 'T-031', phase: 'gestation', dayInPhase: 57, detail: 'J+57' },
    { id: 'B-22D', truie: 'T-019', phase: 'gestation', dayInPhase: 98, detail: 'J+98' },
    { id: 'B-22B', truie: '—',     phase: 'postsevr',  dayInPhase: 12, detail: '24 porcelets' },
    { id: 'B-21D', truie: '—',     phase: 'croiss',    dayInPhase: 22, detail: '22 têtes · 38 kg' },
    { id: 'B-20A', truie: '—',     phase: 'finition',  dayInPhase: 45, detail: '18 têtes · 82 kg' },
  ];

  // Absolute day offset where each phase starts
  let acc = 0;
  const PHASE_OFFSETS = {};
  for (const p of PHASES) { PHASE_OFFSETS[p.id] = acc; acc += p.days; }

  const globalDay = (b) => PHASE_OFFSETS[b.phase] + b.dayInPhase;

  return (
    <div style={{ padding: '16px 16px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
        {PHASES.map(p => {
          const count = BANDES.filter(b => b.phase === p.id).length;
          return (
            <Card key={p.id} style={{ padding: 10, borderColor: count ? `color-mix(in srgb, ${p.tone} 40%, var(--border))` : 'var(--border)' }}>
              <div className="ft-code" style={{ fontSize: 9, color: p.tone, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{p.label.split('-')[0]}</div>
              <div className="ft-code" style={{ fontSize: 20, fontWeight: 700, color: count ? p.tone : 'var(--text-2)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{String(count).padStart(2, '0')}</div>
            </Card>
          );
        })}
      </div>

      {/* Pipeline */}
      <div>
        <SectionDivider accent="var(--accent-cycles)">PIPELINE · 295 JOURS</SectionDivider>

        <Card style={{ marginTop: 12, padding: '18px 14px 14px', overflow: 'hidden' }}>
          {/* Phase band */}
          <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', gap: 2 }}>
            {PHASES.map(p => (
              <div key={p.id} style={{
                flex: p.days,
                background: `color-mix(in srgb, ${p.tone} 30%, var(--bg-1))`,
                borderTop: `2px solid ${p.tone}`,
                position: 'relative'
              }} />
            ))}
          </div>

          {/* Phase labels under band */}
          <div style={{ display: 'flex', gap: 2, marginTop: 8 }}>
            {PHASES.map(p => (
              <div key={p.id} style={{ flex: p.days, textAlign: 'center' }}>
                <div className="ft-code" style={{ fontSize: 9, color: p.tone, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{p.label.replace('-SEVRAGE', '-SEVR.')}</div>
                <div className="ft-code" style={{ fontSize: 9, color: 'var(--text-2)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{p.days}J</div>
              </div>
            ))}
          </div>

          {/* Bandes markers */}
          <div style={{ position: 'relative', height: 100, marginTop: 16, borderTop: '1px dashed var(--border)', paddingTop: 10 }}>
            {BANDES.map((b, i) => {
              const leftPct = (globalDay(b) / TOTAL) * 100;
              const phase = PHASES.find(p => p.id === b.phase);
              const row = i % 3;
              return (
                <div
                  key={b.id}
                  onClick={() => onOpenBande(b.id)}
                  className="pressable"
                  style={{
                    position: 'absolute',
                    left: `${leftPct}%`,
                    top: row * 28,
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    zIndex: 2,
                  }}
                >
                  <div style={{
                    padding: '3px 7px',
                    background: 'var(--bg-2)',
                    border: `1px solid ${phase.tone}`,
                    borderRadius: 6,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 600,
                    color: phase.tone,
                    whiteSpace: 'nowrap'
                  }}>{b.id}</div>
                  <div style={{ width: 1, height: 6, background: phase.tone }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: phase.tone, boxShadow: `0 0 0 2px var(--bg-2)` }} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Liste des bandes actives */}
      <div>
        <SectionDivider accent="var(--accent-cycles)">BANDES ACTIVES · {BANDES.length}</SectionDivider>
        <Card style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
          {BANDES.map(b => {
            const phase = PHASES.find(p => p.id === b.phase);
            const pct = Math.round((b.dayInPhase / phase.days) * 100);
            return (
              <div key={b.id} className="data-row data-row--hover pressable" onClick={() => onOpenBande(b.id)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="ft-code" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-0)', letterSpacing: 0 }}>{b.id}</span>
                    <span className="ft-code" style={{ fontSize: 11, color: 'var(--text-2)' }}>· {b.truie}</span>
                    <Chip tone="default" style={{ color: phase.tone, borderColor: `color-mix(in srgb, ${phase.tone} 40%, transparent)` }}>{phase.label}</Chip>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <div className="progress" style={{ flex: 1 }}>
                      <div className="progress__fill" style={{ width: `${pct}%`, background: phase.tone }} />
                    </div>
                    <span className="ft-code" style={{ fontSize: 10, color: 'var(--text-2)', minWidth: 48, textAlign: 'right' }}>{b.dayInPhase}/{phase.days}j</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>{b.detail}</div>
                </div>
                <Icon name="ChevronRight" size={16} color="var(--text-2)" />
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

window.CyclesScreen = CyclesScreen;
