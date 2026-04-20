// Rapport financier — sous-écran depuis Finances. Détail CA empilé par bande + export PDF placeholder.

function RapportScreen({ onExportPDF }) {
  const fmt = (n) => n.toLocaleString('fr-FR').replace(/\u202F|\u00A0/g, ' ');

  const stackData = [
    { mois: 'NOV', bandes: [{ id: '24-T02-01', v: 180000 }, { id: '24-T04-01', v: 240000 }] },
    { mois: 'DÉC', bandes: [{ id: '24-T06-01', v: 320000 }] },
    { mois: 'JAN', bandes: [{ id: '24-T08-01', v: 280000 }, { id: '25-T01-01', v: 160000 }] },
    { mois: 'FÉV', bandes: [{ id: '25-T02-01', v: 310000 }, { id: '25-T03-01', v: 290000 }] },
    { mois: 'MAR', bandes: [{ id: '25-T04-01', v: 420000 }, { id: '25-T05-01', v: 380000 }, { id: '25-T06-01', v: 210000 }] },
    { mois: 'AVR', bandes: [{ id: '25-T05-01', v: 520000 }, { id: '25-T07-01', v: 410000 }, { id: '25-T09-01', v: 315000 }] },
  ];

  const total6m = stackData.reduce((s, m) => s + m.bandes.reduce((ss, b) => ss + b.v, 0), 0);
  const avgMois = total6m / stackData.length;
  const bestMois = stackData.reduce((best, m) => {
    const t = m.bandes.reduce((s, b) => s + b.v, 0);
    return t > best.t ? { mois: m.mois, t } : best;
  }, { mois: '—', t: 0 });

  // Agrégat bandes toutes périodes
  const byBande = {};
  for (const m of stackData) {
    for (const b of m.bandes) {
      byBande[b.id] = (byBande[b.id] || 0) + b.v;
    }
  }
  const bandeRows = Object.entries(byBande)
    .map(([id, v]) => ({ id, v }))
    .sort((a, b) => b.v - a.v);

  return (
    <div style={{ padding: '16px 16px 140px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Méta */}
      <Card style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div className="kpi-label">PÉRIODE</div>
            <div className="ft-code" style={{ fontSize: 13, color: 'var(--text-0)', marginTop: 6, fontWeight: 500 }}>Nov. 2025 → Avr. 2026</div>
          </div>
          <Chip tone="gold">6 MOIS</Chip>
        </div>
        <div className="hairline" style={{ margin: '12px 0' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div>
            <div className="kpi-label" style={{ fontSize: 9 }}>TOTAL 6M</div>
            <div className="ft-code" style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{fmt(total6m)}</div>
            <div className="ft-code" style={{ fontSize: 9, color: 'var(--text-2)', marginTop: 2 }}>FCFA</div>
          </div>
          <div>
            <div className="kpi-label" style={{ fontSize: 9 }}>MOYENNE / MOIS</div>
            <div className="ft-code" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-0)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{fmt(Math.round(avgMois))}</div>
            <div className="ft-code" style={{ fontSize: 9, color: 'var(--text-2)', marginTop: 2 }}>FCFA</div>
          </div>
          <div>
            <div className="kpi-label" style={{ fontSize: 9 }}>MEILLEUR MOIS</div>
            <div className="ft-code" style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)', marginTop: 4 }}>{bestMois.mois}</div>
            <div className="ft-code" style={{ fontSize: 9, color: 'var(--text-2)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{fmt(bestMois.t)} F</div>
          </div>
        </div>
      </Card>

      {/* Graphique empilé */}
      <div>
        <SectionDivider accent="var(--gold)">CA EMPILÉ PAR BANDE</SectionDivider>
        <StackedCA data={stackData} fmt={fmt} />
      </div>

      {/* Ventilation par bande */}
      <div>
        <SectionDivider accent="var(--gold)">CLASSEMENT BANDES · {bandeRows.length}</SectionDivider>
        <Card style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
          {bandeRows.map((b, i) => {
            const pct = Math.round((b.v / total6m) * 100);
            return (
              <div key={b.id} className="data-row" style={{ alignItems: 'center' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: i === 0 ? 'color-mix(in srgb, var(--gold) 15%, var(--bg-1))' : 'var(--bg-1)',
                  border: `1px solid ${i === 0 ? 'var(--gold)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: i === 0 ? 'var(--gold)' : 'var(--text-2)',
                  fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="ft-code" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)', letterSpacing: 0 }}>{b.id}</div>
                  <div className="progress" style={{ marginTop: 6 }}>
                    <div className="progress__fill" style={{ width: `${pct}%`, background: i === 0 ? 'var(--gold)' : 'var(--accent)' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="ft-code" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-0)', fontVariantNumeric: 'tabular-nums' }}>{fmt(b.v)}</div>
                  <div className="ft-code" style={{ fontSize: 9, color: 'var(--text-2)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{pct} % · FCFA</div>
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Export */}
      <div>
        <SectionDivider accent="var(--gold)">EXPORT</SectionDivider>
        <Card style={{ marginTop: 12, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
            <div style={{ color: 'var(--text-2)', marginTop: 2 }}>
              <Icon name="Info" size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--text-1)' }}>
                Génère un rapport PDF complet avec les graphiques, le classement bandes et la ventilation dépenses du mois en cours.
              </div>
              <div className="ft-code" style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Bientôt disponible</div>
            </div>
          </div>
          <button
            disabled
            onClick={onExportPDF}
            style={{
              width: '100%',
              minHeight: 48,
              background: 'var(--bg-1)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              color: 'var(--text-2)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: 0.6,
            }}
          >
            <Icon name="FileDown" size={16} />
            EXPORTER PDF
          </button>
        </Card>
      </div>
    </div>
  );
}

window.RapportScreen = RapportScreen;
