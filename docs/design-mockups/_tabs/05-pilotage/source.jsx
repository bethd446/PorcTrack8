// Pilotage — weekly KPIs with mini sparklines + hub tiles.

function PilotageScreen({ onOpenFinances, onOpenReport }) {
  return (
    <div style={{ padding: '16px 16px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Period selector */}
      <div style={{ display: 'flex', gap: 6 }}>
        {['7J', '30J', '90J', '1A'].map((p, i) => (
          <button key={p} className="pressable" style={{
            flex: 1, padding: '10px 0',
            background: i === 1 ? 'var(--bg-2)' : 'transparent',
            border: `1px solid ${i === 1 ? 'var(--accent-pilotage)' : 'var(--border)'}`,
            borderRadius: 8,
            color: i === 1 ? 'var(--accent-pilotage)' : 'var(--text-1)',
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer'
          }}>{p}</button>
        ))}
      </div>

      {/* Hub tiles */}
      <SectionDivider accent="var(--accent-pilotage)">MODULES</SectionDivider>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <HubTile
          title="FINANCES"
          subtitle="Trésorerie K13"
          count={8}
          icon="Wallet"
          tone="var(--gold)"
          onClick={onOpenFinances}
        />
        <HubTile
          title="RAPPORTS"
          subtitle="Détail 6 mois"
          icon="FileText"
          tone="var(--accent-pilotage)"
          onClick={onOpenReport}
        />
      </div>

      <SectionDivider accent="var(--accent-pilotage)">INDICATEURS · 30 JOURS</SectionDivider>

      <SparkCard
        label="SEVRÉS / PORTÉE"
        value="11,4"
        delta="+0,6"
        deltaTone="up"
        data={[10.2, 10.8, 10.5, 11.0, 11.2, 10.9, 11.4]}
        accent="var(--accent)"
      />
      <SparkCard
        label="MORTALITÉ PORCELETS"
        value="4,2 %"
        delta="-1,1 pt"
        deltaTone="up"
        data={[6.0, 5.8, 5.3, 5.0, 4.6, 4.4, 4.2]}
        accent="var(--teal)"
      />
      <SparkCard
        label="INDICE CONSO. (IC)"
        value="2,85"
        delta="+0,04"
        deltaTone="down"
        data={[2.70, 2.74, 2.78, 2.80, 2.82, 2.83, 2.85]}
        accent="var(--amber)"
      />
      <SparkCard
        label="CYCLES RÉUSSIS"
        value="92 %"
        delta="+3 pt"
        deltaTone="up"
        data={[85, 86, 88, 89, 90, 91, 92]}
        accent="var(--gold)"
      />
    </div>
  );
}

function SparkCard({ label, value, delta, deltaTone, data, accent }) {
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const w = 140, h = 40;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');
  const areaPath = `M 0 ${h} L ${points.split(' ').join(' L ')} L ${w} ${h} Z`;

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <div>
          <div className="kpi-label">{label}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
            <span className="ft-code" style={{ fontSize: 26, fontWeight: 700, color: accent, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
            <span className={deltaTone === 'up' ? 'kpi-delta-up' : 'kpi-delta-down'}>
              {deltaTone === 'up' ? '↑' : '↓'} {delta}
            </span>
          </div>
        </div>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ flexShrink: 0 }}>
          <defs>
            <linearGradient id={`spg-${label.replace(/[^a-z]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#spg-${label.replace(/[^a-z]/gi, '')})`} />
          <polyline points={points} fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={w} cy={h - ((data[data.length - 1] - min) / range) * h} r="3" fill={accent} />
        </svg>
      </div>
    </Card>
  );
}

window.PilotageScreen = PilotageScreen;
