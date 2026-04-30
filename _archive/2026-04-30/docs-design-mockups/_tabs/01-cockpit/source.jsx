// Cockpit — landing tab. KPI grid, hub tiles, agenda, occupation loges.

function CockpitScreen({ onOpenTruie, onOpenBande }) {
  return (
    <div style={{ padding: '16px 16px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* offline banner */}
      <div className="card-dense" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, borderColor: 'color-mix(in srgb, var(--amber) 40%, var(--border))' }}>
        <Icon name="CloudOff" size={16} color="var(--amber)" />
        <div style={{ flex: 1 }}>
          <div className="ft-code" style={{ fontSize: 10, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>HORS LIGNE · 3 EN ATTENTE</div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>Sync auto au retour du réseau</div>
        </div>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <KpiCard label="PLEINES"    value="12" tone="var(--accent)" delta="+2 sem." icon="Heart" />
        <KpiCard label="MATERNITÉ"  value="04" tone="var(--gold)"   delta="±0"       icon="Baby" />
        <KpiCard label="ALERTES"    value="03" tone="var(--amber)"  delta="-1"       icon="AlertTriangle" />
        <KpiCard label="RUPTURES"   value="01" tone="var(--red)"    delta="+1"       icon="AlertOctagon" />
      </div>

      {/* Hub tiles */}
      <div>
        <SectionDivider>MON ÉLEVAGE</SectionDivider>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          <HubTile title="TRUIES" subtitle="Reproductrices actives" count="17" icon="Users" tone="var(--accent)" />
          <HubTile title="VERRATS" subtitle="Reproducteurs" count="02" icon="Heart" tone="var(--coral)" />
          <HubTile title="PORCELETS" subtitle="Sevrés + non sevrés" count="104" icon="Baby" tone="var(--gold)" />
          <HubTile title="LOGES" subtitle="4 sevrage · 2 mat." count="06" icon="Home" tone="var(--teal)" />
        </div>
      </div>

      {/* Agenda */}
      <div>
        <SectionDivider accent="var(--accent-cycles)">AGENDA 7 JOURS</SectionDivider>
        <Card style={{ padding: 0, marginTop: 12, overflow: 'hidden' }}>
          <DataRow
            icon="Baby" iconTone="var(--gold)"
            primary="T-017 · Mise-bas"
            secondary="Loge M-02 · préparée"
            chip={<Chip tone="gold">J-2</Chip>}
            onClick={() => onOpenTruie('T-017')}
          />
          <DataRow
            icon="Syringe" iconTone="var(--amber)"
            primary="Bande S-03 · Vermifuge"
            secondary="24 porcelets · 2e dose"
            chip={<Chip tone="amber">J-4</Chip>}
          />
          <DataRow
            icon="Heart" iconTone="var(--accent)"
            primary="T-024 · Test de chaleur"
            secondary="Contrôle post-sevrage"
            chip={<Chip tone="accent">J-6</Chip>}
          />
        </Card>
      </div>

      {/* Occupation loges */}
      <div>
        <SectionDivider accent="var(--accent-troupeau)">OCCUPATION LOGES</SectionDivider>
        <Card style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <LogeBar label="M-02 · MATERNITÉ" value="08 / 10" pct={80} tone="accent" />
          <LogeBar label="S-03 · SEVRAGE"   value="24 / 25" pct={96} tone="amber" />
          <LogeBar label="E-01 · ENGRAISS." value="32 / 30" pct={100} tone="red" />
          <LogeBar label="V-01 · VERRATERIE" value="02 / 04" pct={50} tone="accent" />
        </Card>
      </div>
    </div>
  );
}

function LogeBar({ label, value, pct, tone }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span className="kpi-label">{label}</span>
        <span className="ft-code" style={{ fontSize: 11, color: 'var(--text-1)' }}>{value}</span>
      </div>
      <div className="progress">
        <div className={`progress__fill ${tone === 'amber' ? 'progress__fill--amber' : tone === 'red' ? 'progress__fill--red' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

window.CockpitScreen = CockpitScreen;
