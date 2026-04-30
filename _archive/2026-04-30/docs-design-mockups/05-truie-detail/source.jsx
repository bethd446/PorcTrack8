// TruieDetail — drill-in from Troupeau.

function TruieDetailScreen({ id, onBack }) {
  return (
    <div style={{ padding: '16px 16px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Hero */}
      <Card style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--bg-1)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="../../assets/icons/TruieIcon.svg" width="32" height="32" style={{ filter: 'brightness(0) saturate(100%) invert(75%) sepia(38%) saturate(500%) hue-rotate(10deg) brightness(95%) contrast(88%)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="ft-heading" style={{ fontSize: 26, color: 'var(--text-0)' }}>TRUIE {id}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <Chip tone="gold">MATERNITÉ</Chip>
              <Chip tone="default">J-2</Chip>
            </div>
          </div>
        </div>
      </Card>

      {/* Identité */}
      <div>
        <SectionDivider>IDENTITÉ</SectionDivider>
        <Card style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
          <DetailRow label="Race"        value="Large White × Landrace" />
          <DetailRow label="Naissance"   value="12/08/2022" mono />
          <DetailRow label="Entrée élev." value="03/01/2023" mono />
          <DetailRow label="Numéro lot"  value="L-17 · K13" mono />
          <DetailRow label="Poids (kg)"  value="218,5" mono accent="var(--accent)" />
        </Card>
      </div>

      {/* Reproduction */}
      <div>
        <SectionDivider accent="var(--accent-cycles)">REPRODUCTION</SectionDivider>
        <Card style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
          <DetailRow label="Parité"      value="04 (4e portée)" mono />
          <DetailRow label="Saillie"     value="05/01/2026 · V-01" mono />
          <DetailRow label="Gestation"   value="114 jours" mono />
          <DetailRow label="Mise-bas"    value="28/04/2026" mono accent="var(--gold)" />
          <DetailRow label="Porcelets attendus" value="12" mono />
        </Card>
      </div>

      {/* Historique soins */}
      <div>
        <SectionDivider accent="var(--accent-ressources)">HISTORIQUE SOINS</SectionDivider>
        <Card style={{ marginTop: 12, padding: 0, overflow: 'hidden' }}>
          <DataRow
            icon="Syringe" iconTone="var(--amber)"
            primary="Vermifuge · Ivermectine"
            secondary="12/04/2026 · 3,5 mL"
            accessory={null}
          />
          <DataRow
            icon="Syringe" iconTone="var(--accent)"
            primary="Vaccin PPA · rappel"
            secondary="28/03/2026 · 2 mL"
            accessory={null}
          />
          <DataRow
            icon="Scale" iconTone="var(--blue)"
            primary="Pesée"
            secondary="20/03/2026 · 214,0 kg"
            accessory={null}
          />
        </Card>
      </div>

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Button variant="secondary" icon="Syringe">SOIN</Button>
        <Button variant="secondary" icon="Scale">PESÉE</Button>
        <Button variant="secondary" icon="Heart">SAILLIE</Button>
        <Button variant="secondary" icon="FileText">NOTE</Button>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono = false, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text-1)' }}>{label}</span>
      <span className={mono ? 'ft-code' : ''} style={{
        fontSize: 13,
        color: accent || 'var(--text-0)',
        fontWeight: mono ? 500 : 400,
        fontVariantNumeric: mono ? 'tabular-nums' : 'normal'
      }}>{value}</span>
    </div>
  );
}

window.TruieDetailScreen = TruieDetailScreen;
