// Finances — suivi trésorerie K13. Variante A du bloc CA switchable.

function FinancesScreen({ onNewSale, onNewExpense, onOpenReport }) {
  const { useState } = React;
  const [period, setPeriod] = useState('mois');     // 'mois' | 'prec' | 'annee'

  // Format FCFA — espace comme séparateur milliers
  const fmt = (n) => n.toLocaleString('fr-FR').replace(/\u202F|\u00A0/g, ' ');

  const kpi = {
    ca:        1245000,
    depenses:   820000,
    marge:      425000,
    tresorerie:2100000,
  };

  // 6 derniers mois, CA par bande (stack)
  const stackData = [
    { mois: 'NOV', bandes: [{ id: '24-T02-01', v: 180000 }, { id: '24-T04-01', v: 240000 }] },
    { mois: 'DÉC', bandes: [{ id: '24-T06-01', v: 320000 }] },
    { mois: 'JAN', bandes: [{ id: '24-T08-01', v: 280000 }, { id: '25-T01-01', v: 160000 }] },
    { mois: 'FÉV', bandes: [{ id: '25-T02-01', v: 310000 }, { id: '25-T03-01', v: 290000 }] },
    { mois: 'MAR', bandes: [{ id: '25-T04-01', v: 420000 }, { id: '25-T05-01', v: 380000 }, { id: '25-T06-01', v: 210000 }] },
    { mois: 'AVR', bandes: [{ id: '25-T05-01', v: 520000 }, { id: '25-T07-01', v: 410000 }, { id: '25-T09-01', v: 315000 }] },
  ];
  const sparkTotals = stackData.map(m => m.bandes.reduce((s, b) => s + b.v, 0));

  // Ventilation dépenses
  const expenses = [
    { name: 'Aliment',      value: 580000, tone: 'var(--amber)' },
    { name: 'Vétérinaire',  value: 120000, tone: 'var(--coral)' },
    { name: 'Main d\'œuvre',value:  80000, tone: 'var(--blue)' },
    { name: 'Maintenance',  value:  40000, tone: 'var(--teal)' },
  ];
  const expTotal = expenses.reduce((s, e) => s + e.value, 0);

  // Transactions récentes
  const tx = [
    { d: '18/04', type: 'in',  cat: 'Vente porcs',     ref: 'Bande 25-T09-01', montant: 315000, label: '3 porcs vifs · 82 kg moy.' },
    { d: '17/04', type: 'out', cat: 'Aliment',         ref: 'SIVOP Abidjan',   montant: 210000, label: 'Croissance 20% · 500 kg' },
    { d: '15/04', type: 'in',  cat: 'Vente porcs',     ref: 'Bande 25-T07-01', montant: 410000, label: '4 porcs vifs · 85 kg moy.' },
    { d: '14/04', type: 'out', cat: 'Vétérinaire',     ref: 'Dr Kouassi',      montant:  45000, label: 'Visite mensuelle + vaccins' },
    { d: '12/04', type: 'in',  cat: 'Vente porcs',     ref: 'Bande 25-T05-01', montant: 520000, label: '5 porcs vifs · 84 kg moy.' },
    { d: '10/04', type: 'out', cat: 'Main d\'œuvre',   ref: 'Porcher Moussa',  montant:  80000, label: 'Salaire avril' },
    { d: '08/04', type: 'out', cat: 'Aliment',         ref: 'SIVOP Abidjan',   montant: 240000, label: 'Lactation 18% · 600 kg' },
    { d: '05/04', type: 'out', cat: 'Maintenance',     ref: 'Plomberie loge M', montant: 40000, label: 'Réparation abreuvoir' },
  ];

  return (
    <div style={{ padding: '16px 16px 140px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Period toggle */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[
          { id: 'mois',  label: 'MOIS EN COURS' },
          { id: 'prec',  label: 'MOIS PRÉC.' },
          { id: 'annee', label: 'ANNÉE' },
        ].map(p => {
          const on = p.id === period;
          return (
            <button key={p.id} onClick={() => setPeriod(p.id)} className="pressable" style={{
              flex: 1, padding: '10px 0',
              background: on ? 'var(--bg-2)' : 'transparent',
              border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 8,
              color: on ? 'var(--accent)' : 'var(--text-1)',
              fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer'
            }}>{p.label}</button>
          );
        })}
      </div>

      {/* KPI 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <FinKpi label="CHIFFRE D'AFFAIRES" value={fmt(kpi.ca)}        unit="FCFA" tone="var(--accent)" icon="TrendingUp" />
        <FinKpi label="DÉPENSES"           value={fmt(kpi.depenses)}  unit="FCFA" tone="var(--amber)"  icon="TrendingDown" />
        <FinKpi label="MARGE NETTE"        value={fmt(kpi.marge)}     unit="FCFA" tone={kpi.marge >= 0 ? 'var(--accent)' : 'var(--red)'} icon={kpi.marge >= 0 ? 'ArrowUpRight' : 'ArrowDownRight'} />
        <FinKpi label="TRÉSORERIE EST."    value={fmt(kpi.tresorerie)}unit="FCFA" tone="var(--text-0)" icon="Wallet" />
      </div>

      {/* === BLOC A : CA synthèse === */}
      <div>
        <SectionDivider accent="var(--accent)">CHIFFRE D'AFFAIRES · 6 MOIS</SectionDivider>
        <SparkSummary data={sparkTotals} months={stackData.map(m => m.mois)} recent={tx.filter(t => t.type === 'in').slice(0, 3)} fmt={fmt} />
      </div>

      {/* === BLOC B : Ventilation dépenses === */}
      <div>
        <SectionDivider accent="var(--amber)">VENTILATION DÉPENSES</SectionDivider>
        <Card style={{ marginTop: 12, padding: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <DonutChart items={expenses} total={expTotal} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {expenses.map(e => {
                const pct = Math.round((e.value / expTotal) * 100);
                return (
                  <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: e.tone, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-0)', fontWeight: 500 }}>{e.name}</div>
                      <div className="ft-code" style={{ fontSize: 10, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{fmt(e.value)} FCFA</div>
                    </div>
                    <Chip tone="default" style={{ color: e.tone, borderColor: `color-mix(in srgb, ${e.tone} 40%, transparent)` }}>{pct}%</Chip>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* === Transactions récentes === */}
      <div>
        <SectionDivider>DERNIÈRES TRANSACTIONS · {tx.length}</SectionDivider>
        {tx.length === 0 ? (
          <Card style={{ marginTop: 12, padding: 28, textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', width: 48, height: 48, borderRadius: 12, background: 'var(--bg-1)', border: '1px solid var(--border)', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', marginBottom: 12 }}>
              <Icon name="Coins" size={22} />
            </div>
            <div className="ft-heading" style={{ fontSize: 14, color: 'var(--text-0)' }}>AUCUNE TRANSACTION CE MOIS</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6 }}>Appuie sur + pour enregistrer ta première vente ou dépense.</div>
          </Card>
        ) : (
          <Card style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
            {tx.map((t, i) => <TxRow key={i} t={t} fmt={fmt} />)}
          </Card>
        )}
        <Button variant="secondary" style={{ width: '100%', marginTop: 10 }}>VOIR TOUT L'HISTORIQUE</Button>
      </div>

      {/* === HubTile sous-écran Rapport === */}
      <div
        className="card-dense pressable"
        onClick={onOpenReport}
        style={{
          padding: 16, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
          borderColor: 'color-mix(in srgb, var(--gold) 40%, var(--border))',
          background: 'color-mix(in srgb, var(--gold) 5%, var(--bg-2))',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: 'var(--bg-1)', border: '1px solid color-mix(in srgb, var(--gold) 40%, var(--border))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', flexShrink: 0,
        }}>
          <Icon name="BarChart3" size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ft-heading" style={{ fontSize: 15, color: 'var(--text-0)', lineHeight: 1.1 }}>RAPPORT FINANCIER</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4 }}>Détail CA par bande · 6 mois · Export PDF</div>
        </div>
        <Icon name="ChevronRight" size={18} color="var(--gold)" />
      </div>
    </div>
  );
}

// ── FinKpi card ─────────────────────────────────────────────────────
function FinKpi({ label, value, unit, tone, icon }) {
  return (
    <Card style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: tone, display: 'inline-flex' }}><Icon name={icon} size={12} stroke={2} /></span>
        <span className="kpi-label" style={{ fontSize: 9 }}>{label}</span>
      </div>
      <div className="ft-code" style={{ fontSize: 20, fontWeight: 700, color: tone, marginTop: 8, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em', lineHeight: 1 }}>{value}</div>
      <div className="ft-code" style={{ fontSize: 9, color: 'var(--text-2)', marginTop: 4, letterSpacing: '0.04em' }}>{unit}</div>
    </Card>
  );
}

// ── Variant 1: Stacked bar chart ────────────────────────────────────
function StackedCA({ data, fmt }) {
  const max = Math.max(...data.map(m => m.bandes.reduce((s, b) => s + b.v, 0))) * 1.1;
  const H = 140;
  return (
    <Card style={{ marginTop: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: H, borderBottom: '1px solid var(--border)', paddingBottom: 2 }}>
        {data.map((m, i) => {
          const total = m.bandes.reduce((s, b) => s + b.v, 0);
          const isLast = i === data.length - 1;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 2 }}>
              <div className="ft-code" style={{ fontSize: 9, color: isLast ? 'var(--accent)' : 'var(--text-2)', fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>
                {Math.round(total / 1000)}k
              </div>
              <div style={{ width: '70%', display: 'flex', flexDirection: 'column-reverse', gap: 1 }}>
                {m.bandes.map((b, j) => {
                  const h = (b.v / max) * (H - 28);
                  const opacity = 0.55 + (j * 0.15);
                  return (
                    <div key={j} title={`${b.id} · ${fmt(b.v)} FCFA`} style={{
                      height: `${h}px`,
                      background: isLast ? 'var(--accent)' : 'var(--accent)',
                      opacity: isLast ? 1 : opacity,
                      borderRadius: j === m.bandes.length - 1 ? '3px 3px 0 0' : 0,
                    }} />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        {data.map((m, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <span className="ft-code" style={{ fontSize: 10, color: i === data.length - 1 ? 'var(--accent)' : 'var(--text-2)', fontWeight: i === data.length - 1 ? 600 : 400 }}>{m.mois}</span>
          </div>
        ))}
      </div>
      <div className="hairline" style={{ margin: '12px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="kpi-label">AVRIL · 3 BANDES VENDUES</span>
        <span className="ft-code" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{fmt(data[data.length - 1].bandes.reduce((s, b) => s + b.v, 0))} FCFA</span>
      </div>
    </Card>
  );
}

// ── Variant 2: Sparkline + 3 latest sales ───────────────────────────
function SparkSummary({ data, months, recent, fmt }) {
  const W = 300, H = 70;
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / (max - min || 1)) * (H - 6) - 3;
    return [x, y];
  });
  const line = pts.map(p => p.join(',')).join(' ');
  const area = `M 0,${H} L ${line.split(' ').join(' L ')} L ${W},${H} Z`;
  const last = pts[pts.length - 1];

  return (
    <Card style={{ marginTop: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div className="kpi-label">AVRIL</div>
          <div className="ft-code" style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent)', marginTop: 4, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{fmt(data[data.length - 1])}</div>
          <div className="ft-code" style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 2 }}>FCFA · +23% vs mars</div>
        </div>
        <svg width={W * 0.55} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="spark-ca" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#spark-ca)" />
          <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={last[0]} cy={last[1]} r="4" fill="var(--accent)" stroke="var(--bg-2)" strokeWidth="2" />
        </svg>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        {months.map((m, i) => (
          <span key={i} className="ft-code" style={{ fontSize: 9, color: i === months.length - 1 ? 'var(--accent)' : 'var(--text-2)', fontWeight: i === months.length - 1 ? 600 : 400 }}>{m}</span>
        ))}
      </div>
      <div className="hairline" style={{ margin: '14px 0 10px' }} />
      <div className="kpi-label" style={{ marginBottom: 8 }}>3 DERNIÈRES VENTES</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {recent.map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span className="ft-code" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-0)' }}>{r.ref}</span>
              <span className="ft-code" style={{ fontSize: 10, color: 'var(--text-2)', marginLeft: 6 }}>· {r.d}</span>
            </div>
            <span className="ft-code" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>+{fmt(r.montant)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Donut chart ─────────────────────────────────────────────────────
function DonutChart({ items, total }) {
  const size = 96, stroke = 14, r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-1)" strokeWidth={stroke} />
      {items.map((it, i) => {
        const len = (it.value / total) * C;
        const circle = (
          <circle
            key={i}
            cx={size/2} cy={size/2} r={r}
            fill="none" stroke={it.tone} strokeWidth={stroke}
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            strokeLinecap="butt"
          />
        );
        offset += len;
        return circle;
      })}
      <text x={size/2} y={size/2 - 4} textAnchor="middle" fill="var(--text-2)" fontFamily="var(--font-mono)" fontSize="8" letterSpacing="0.06em">TOTAL</text>
      <text x={size/2} y={size/2 + 12} textAnchor="middle" fill="var(--text-0)" fontFamily="var(--font-mono)" fontSize="12" fontWeight="700">{Math.round(total/1000)}k</text>
    </svg>
  );
}

// ── Tx row ──────────────────────────────────────────────────────────
function TxRow({ t, fmt }) {
  const isIn = t.type === 'in';
  return (
    <div className="data-row data-row--hover pressable">
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: isIn ? 'color-mix(in srgb, var(--accent) 12%, var(--bg-1))' : 'color-mix(in srgb, var(--amber) 10%, var(--bg-1))',
        border: `1px solid ${isIn ? 'color-mix(in srgb, var(--accent) 40%, var(--border))' : 'color-mix(in srgb, var(--amber) 40%, var(--border))'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: isIn ? 'var(--accent)' : 'var(--amber)', flexShrink: 0,
      }}>
        <Icon name={isIn ? 'ArrowDownLeft' : 'ArrowUpRight'} size={16} stroke={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-0)' }}>{t.cat}</span>
          <span className="ft-code" style={{ fontSize: 10, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>· {t.d}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.ref} · {t.label}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span className="ft-code" style={{ fontSize: 13, fontWeight: 600, color: isIn ? 'var(--accent)' : 'var(--amber)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {isIn ? '+' : '−'}{fmt(t.montant)}
        </span>
        <div className="ft-code" style={{ fontSize: 9, color: 'var(--text-2)', marginTop: 2 }}>FCFA</div>
      </div>
    </div>
  );
}

function variantBtn(on) {
  return {
    padding: '4px 8px',
    background: on ? 'var(--bg-2)' : 'transparent',
    border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 6,
    color: on ? 'var(--accent)' : 'var(--text-2)',
    fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer',
  };
}

window.FinancesScreen = FinancesScreen;
window.StackedCA = StackedCA;
window.SparkSummary = SparkSummary;
window.DonutChart = DonutChart;
