// Ressources — stocks: aliments, vaccins, matériel.

function RessourcesScreen({ onReorder }) {
  const stocks = [
    { cat: 'ALIMENTS',  name: 'Croissance 20%',   qty: '140 kg',  pct: 18, tone: 'red',    delta: '-12 kg / j',      autonomy: '12 j.' },
    { cat: 'ALIMENTS',  name: 'Gestation 14%',    qty: '420 kg',  pct: 62, tone: 'accent', delta: '-8 kg / j',       autonomy: '52 j.' },
    { cat: 'ALIMENTS',  name: 'Lactation 18%',    qty: '280 kg',  pct: 45, tone: 'amber',  delta: '-14 kg / j',      autonomy: '20 j.' },
    { cat: 'VACCINS',   name: 'Peste porcine',    qty: '08 doses',pct: 32, tone: 'amber',  delta: 'exp. 12/2026',    autonomy: '—' },
    { cat: 'VACCINS',   name: 'Ivermectine',      qty: '200 mL',  pct: 70, tone: 'accent', delta: 'exp. 03/2027',    autonomy: '—' },
    { cat: 'MATÉRIEL',  name: 'Sciure litière',   qty: '06 sacs', pct: 40, tone: 'amber',  delta: '-1 sac / 4 j',    autonomy: '24 j.' },
  ];

  return (
    <div style={{ padding: '16px 16px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Low stock banner */}
      <Card style={{ padding: 14, borderColor: 'color-mix(in srgb, var(--red) 40%, var(--border))', background: 'color-mix(in srgb, var(--red) 6%, var(--bg-2))' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ color: 'var(--red)' }}><Icon name="AlertOctagon" size={20} color="var(--red)" /></div>
          <div style={{ flex: 1 }}>
            <div className="ft-heading" style={{ fontSize: 14, color: 'var(--red)' }}>RUPTURE · 1 ITEM</div>
            <div style={{ fontSize: 12, color: 'var(--text-1)', marginTop: 4 }}>Croissance 20% — autonomie restante 12 jours. Commande à passer.</div>
          </div>
          <Button variant="secondary" compact onClick={() => onReorder && onReorder({ name: 'Croissance 20%', qty: '140 kg', autonomy: '12 j.' })}>COMMANDER</Button>
        </div>
      </Card>

      <SectionDivider accent="var(--accent-ressources)">ALIMENTS</SectionDivider>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {stocks.filter(s => s.cat === 'ALIMENTS').map(s => <StockRow key={s.name} {...s} onReorder={onReorder} />)}
      </Card>

      <SectionDivider accent="var(--accent-ressources)">VACCINS & SOINS</SectionDivider>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {stocks.filter(s => s.cat === 'VACCINS').map(s => <StockRow key={s.name} {...s} onReorder={onReorder} />)}
      </Card>

      <SectionDivider accent="var(--accent-ressources)">MATÉRIEL</SectionDivider>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {stocks.filter(s => s.cat === 'MATÉRIEL').map(s => <StockRow key={s.name} {...s} onReorder={onReorder} />)}
      </Card>
    </div>
  );
}

function StockRow({ name, qty, pct, tone, delta, autonomy, onReorder }) {
  const fillClass = tone === 'amber' ? 'progress__fill--amber' : tone === 'red' ? 'progress__fill--red' : '';
  return (
    <div style={{ padding: '14px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'stretch' }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--text-0)', fontWeight: 500 }}>{name}</div>
            <div className="ft-code" style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{delta}</div>
          </div>
          <span className="ft-code" style={{ fontSize: 14, fontWeight: 600, color: `var(--${tone})`, fontVariantNumeric: 'tabular-nums' }}>{qty}</span>
        </div>
        <div className="progress" style={{ marginTop: 10 }}>
          <div className={`progress__fill ${fillClass}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <button
        className="pressable"
        onClick={() => onReorder && onReorder({ name, qty, autonomy })}
        style={{
          alignSelf: 'center',
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--bg-1)', border: '1px solid var(--border)',
          color: 'var(--text-1)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}
        aria-label={`Commander ${name}`}
      >
        <Icon name="Plus" size={16} />
      </button>
    </div>
  );
}

window.RessourcesScreen = RessourcesScreen;
