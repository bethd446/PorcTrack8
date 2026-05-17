// Bande detail — vue portée. Header + KPI + timeline événements.

function BandeDetailScreen({ id }) {
  // Portée fictive pour B-24A
  const data = {
    id,
    truie: 'T-017',
    verrat: 'V-01',
    dateMiseBas: '19/04/2026',
    loge: 'M-02',
    phase: 'MATERNITÉ',
    phaseTone: 'var(--gold)',
    jour: 2,
    phaseDuree: 28,
  };

  const kpis = [
    { label: 'NÉS',     value: '12', tone: 'var(--text-0)' },
    { label: 'VIVANTS', value: '11', tone: 'var(--accent)' },
    { label: 'SEVRÉS',  value: '—',  tone: 'var(--text-2)' },
    { label: 'MORTS',   value: '01', tone: 'var(--red)' },
  ];
  const survival = Math.round((11 / 12) * 100);

  const events = [
    { date: '19/04/2026', heure: '06:20', type: 'MISE-BAS',    tone: 'var(--gold)',    title: '12 nés · 11 vivants · 1 mort-né', note: 'MB rapide 3h45 · pas d\'intervention' },
    { date: '19/04/2026', heure: '14:30', type: 'SOIN',        tone: 'var(--amber)',   title: 'Oxytocine 2 mL', note: 'Post-partum · rétention placentaire écartée' },
    { date: '20/04/2026', heure: '08:15', type: 'PESÉE LOT',   tone: 'var(--blue)',    title: 'Poids moyen 1,45 kg', note: '11 porcelets · min 1,2 / max 1,7' },
    { date: '21/04/2026', heure: '09:00', type: 'SOIN',        tone: 'var(--amber)',   title: 'Ferrodextran 1 mL × 11', note: 'Supplémentation fer · J3' },
    { date: '22/04/2026', heure: '—',     type: 'À VENIR',     tone: 'var(--text-2)',  title: 'Coupe dents + queue', note: 'J4 prévu · protocole K13', pending: true },
    { date: '17/05/2026', heure: '—',     type: 'SEVRAGE',     tone: 'var(--teal)',    title: 'Sevrage prévu J28', note: 'Transfert loge S-03', pending: true },
  ];

  return (
    <div style={{ padding: '16px 16px 140px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Hero */}
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--bg-1)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="../../assets/icons/BandeIcon.svg" width="30" height="30" style={{ filter: 'brightness(0) saturate(100%) invert(75%) sepia(40%) saturate(500%) hue-rotate(10deg) brightness(95%) contrast(88%)' }} alt="" />
          </div>
          <div style={{ flex: 1 }}>
            <div className="ft-heading" style={{ fontSize: 24, color: 'var(--text-0)', lineHeight: 1 }}>PORTÉE {data.id}</div>
            <div className="ft-code" style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Truie {data.truie} · Verrat {data.verrat}
            </div>
          </div>
          <Chip tone="gold">{data.phase}</Chip>
        </div>
        <div className="hairline" style={{ margin: '14px 0' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div>
            <div className="kpi-label">MISE-BAS</div>
            <div className="ft-code" style={{ fontSize: 13, color: 'var(--text-0)', marginTop: 4, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{data.dateMiseBas}</div>
          </div>
          <div>
            <div className="kpi-label">LOGE</div>
            <div className="ft-code" style={{ fontSize: 13, color: 'var(--text-0)', marginTop: 4, fontWeight: 500 }}>{data.loge}</div>
          </div>
          <div>
            <div className="kpi-label">JOUR</div>
            <div className="ft-code" style={{ fontSize: 13, color: data.phaseTone, marginTop: 4, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>J+{data.jour}/{data.phaseDuree}</div>
          </div>
        </div>
      </Card>

      {/* KPI portée */}
      <div>
        <SectionDivider>INDICATEURS PORTÉE</SectionDivider>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 12 }}>
          {kpis.map(k => (
            <Card key={k.label} style={{ padding: 10 }}>
              <div className="kpi-label" style={{ fontSize: 9 }}>{k.label}</div>
              <div className="ft-code" style={{ fontSize: 22, fontWeight: 700, color: k.tone, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
            </Card>
          ))}
        </div>
        <Card style={{ marginTop: 10, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span className="kpi-label">TAUX DE SURVIE</span>
            <span className="ft-code" style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{survival} %</span>
          </div>
          <div className="progress"><div className="progress__fill" style={{ width: `${survival}%` }} /></div>
          <div className="ft-code" style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 8, letterSpacing: 0 }}>Moyenne ferme K13 : 92% · objectif ≥ 90%</div>
        </Card>
      </div>

      {/* Timeline événements */}
      <div>
        <SectionDivider>TIMELINE ÉVÉNEMENTS</SectionDivider>
        <div style={{ marginTop: 12, position: 'relative' }}>
          {/* rail vertical */}
          <div style={{ position: 'absolute', left: 11, top: 10, bottom: 10, width: 1, background: 'var(--border)' }} />
          {events.map((e, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '8px 0' }}>
              {/* Dot */}
              <div style={{ position: 'relative', flexShrink: 0, width: 22, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 4 }}>
                <div style={{
                  width: 11, height: 11, borderRadius: '50%',
                  background: e.pending ? 'var(--bg-0)' : e.tone,
                  border: `2px solid ${e.tone}`,
                  boxShadow: '0 0 0 3px var(--bg-0)'
                }} />
              </div>
              <div style={{ flex: 1, paddingBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span className="ft-code" style={{ fontSize: 11, fontWeight: 600, color: e.tone, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{e.type}</span>
                  <span className="ft-code" style={{ fontSize: 10, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>{e.date}{e.heure !== '—' ? ` · ${e.heure}` : ''}</span>
                </div>
                <div style={{ fontSize: 13, color: e.pending ? 'var(--text-1)' : 'var(--text-0)', marginTop: 4, fontWeight: 500 }}>{e.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{e.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <Button variant="primary" icon="Plus" style={{ width: '100%' }}>
        ENREGISTRER UN ÉVÉNEMENT
      </Button>
    </div>
  );
}

window.BandeDetailScreen = BandeDetailScreen;
