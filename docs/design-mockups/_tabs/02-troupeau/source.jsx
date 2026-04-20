// Troupeau — list of truies with segmented filter.

function TroupeauScreen({ onOpenTruie }) {
  const [filter, setFilter] = React.useState('tout');

  const ALL = [
    { id: 'T-017', status: 'Maternité', tone: 'gold',    meta: 'Mise-bas J-2 · Loge M-02', filter: 'maternite' },
    { id: 'T-024', status: 'Pleine',    tone: 'accent',  meta: 'Saillie 05 avr. · J+87',    filter: 'pleines' },
    { id: 'T-031', status: 'Pleine',    tone: 'accent',  meta: 'Saillie 22 mars · J+57',    filter: 'pleines' },
    { id: 'T-008', status: 'Vide',      tone: 'default', meta: 'Sevrage 12 avr.',           filter: 'vides' },
    { id: 'T-012', status: 'Chaleur',   tone: 'coral',   meta: 'Détecté 18 avr.',           filter: 'vides' },
    { id: 'T-019', status: 'Pleine',    tone: 'accent',  meta: 'Saillie 10 fév. · J+98',    filter: 'pleines' },
    { id: 'T-022', status: 'Maternité', tone: 'gold',    meta: 'Mise-bas J+5 · Loge M-01',  filter: 'maternite' },
    { id: 'T-005', status: 'Réforme',   tone: 'red',     meta: '8 portées · à sortir',      filter: 'reforme' },
  ];

  const visible = filter === 'tout' ? ALL : ALL.filter(x => x.filter === filter);

  const FILTERS = [
    { id: 'tout',       label: 'TOUT',      count: ALL.length },
    { id: 'pleines',    label: 'PLEINES',   count: ALL.filter(x=>x.filter==='pleines').length },
    { id: 'maternite',  label: 'MATERNITÉ', count: ALL.filter(x=>x.filter==='maternite').length },
    { id: 'vides',      label: 'VIDES',     count: ALL.filter(x=>x.filter==='vides').length },
    { id: 'reforme',    label: 'RÉFORME',   count: ALL.filter(x=>x.filter==='reforme').length },
  ];

  return (
    <div style={{ padding: '12px 16px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Search */}
      <div style={{ position: 'relative' }}>
        <input className="input input--mono" placeholder="ID truie…" style={{ paddingLeft: 40 }} />
        <span style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-2)' }}><Icon name="Search" size={16} color="var(--text-2)" /></span>
      </div>

      {/* Segmented */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '0 -16px', padding: '0 16px' }}>
        {FILTERS.map(f => {
          const active = f.id === filter;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="pressable"
              style={{
                flexShrink: 0,
                padding: '8px 12px',
                background: active ? 'var(--bg-2)' : 'transparent',
                border: `1px solid ${active ? 'var(--accent-troupeau)' : 'var(--border)'}`,
                borderRadius: 999,
                color: active ? 'var(--accent-troupeau)' : 'var(--text-1)',
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {f.label}
              <span style={{ color: 'var(--text-2)', fontSize: 10 }}>{String(f.count).padStart(2, '0')}</span>
            </button>
          );
        })}
      </div>

      <SectionDivider accent="var(--accent-troupeau)">
        {visible.length} TRUIE{visible.length > 1 ? 'S' : ''}
      </SectionDivider>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {visible.map(t => (
          <DataRow
            key={t.id}
            icon={<img src="../../assets/icons/TruieIcon.svg" width="22" height="22" style={{ filter: 'brightness(0) saturate(100%) invert(90%) sepia(5%) saturate(143%) hue-rotate(88deg) brightness(92%) contrast(87%)' }} />}
            primary={t.id}
            secondary={t.meta}
            chip={<Chip tone={t.tone}>{t.status.toUpperCase()}</Chip>}
            onClick={() => onOpenTruie(t.id)}
          />
        ))}
      </Card>
    </div>
  );
}

window.TroupeauScreen = TroupeauScreen;
