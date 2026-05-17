// Main app — tab routing + Truie/Bande drill + FAB sheets + Stock reorder.

const { useState } = React;

function App() {
  const INITIAL = (typeof window !== 'undefined' && window.__INITIAL_STATE) || {};
  const [tab, setTab] = useState(INITIAL.tab || 'cockpit');
  const [detail, setDetail] = useState(INITIAL.detail || null);
  const [fabOpen, setFabOpen] = useState(false);
  const [sheet, setSheet] = useState(INITIAL.sheet || null);
  const [reorderItem, setReorderItem] = useState(INITIAL.reorderItem || null);
  const [toast, setToast] = useState(null);

  const openTruie = (id) => setDetail({ type: 'truie', id });
  const openBande = (id) => setDetail({ type: 'bande', id });
  const openFinances = () => setDetail({ type: 'finances' });
  const openRapport = () => setDetail({ type: 'rapport' });
  const openReorder = (item) => { setReorderItem(item); setSheet('reorder'); };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const headers = {
    cockpit:    { title: 'COCKPIT',    subtitle: 'Ferme K13 · mer. 19 avril' },
    troupeau:   { title: 'TROUPEAU',   subtitle: '17 truies · 2 verrats · 104 porcelets' },
    cycles:     { title: 'CYCLES',     subtitle: '12 cycles actifs · 1 mise-bas imminente' },
    ressources: { title: 'RESSOURCES', subtitle: '3 alertes stocks · 1 rupture' },
    pilotage:   { title: 'PILOTAGE',   subtitle: 'Indicateurs · 30 jours' },
  };

  let header;
  if (detail?.type === 'truie')        header = { title: `TRUIE ${detail.id}`, subtitle: 'Fiche détaillée' };
  else if (detail?.type === 'bande')   header = { title: `BANDE ${detail.id}`, subtitle: 'Suivi de portée' };
  else if (detail?.type === 'finances')header = { title: 'FINANCES', subtitle: 'Suivi trésorerie K13' };
  else if (detail?.type === 'rapport') header = { title: 'RAPPORT FINANCIER', subtitle: 'Nov. 2025 → Avr. 2026' };
  else                                 header = headers[tab];

  const onBackFromDetail = () => {
    if (detail?.type === 'rapport') setDetail({ type: 'finances' });
    else setDetail(null);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <AgritechHeader
        title={header.title}
        subtitle={header.subtitle}
        backTo={!!detail}
        onBack={onBackFromDetail}
        rightSlot={!detail && (
          <button className="pressable" style={{ background: 'transparent', border: 0, color: 'var(--text-1)', padding: 4, cursor: 'pointer' }}>
            <Icon name="HelpCircle" size={20} />
          </button>
        )}
      />

      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-0)' }}>
        {detail?.type === 'truie' && <TruieDetailScreen id={detail.id} onOpenBande={openBande} />}
        {detail?.type === 'bande' && <BandeDetailScreen id={detail.id} />}
        {detail?.type === 'finances' && <FinancesScreen onNewSale={() => setSheet('vente')} onNewExpense={() => setSheet('depense')} onOpenReport={openRapport} />}
        {detail?.type === 'rapport' && <RapportScreen />}
        {!detail && (
          <>
            {tab === 'cockpit'    && <CockpitScreen    onOpenTruie={openTruie} onOpenBande={openBande} />}
            {tab === 'troupeau'   && <TroupeauScreen   onOpenTruie={openTruie} />}
            {tab === 'cycles'     && <CyclesScreen     onOpenBande={openBande} />}
            {tab === 'ressources' && <RessourcesScreen onReorder={openReorder} />}
            {tab === 'pilotage'   && <PilotageScreen   onOpenFinances={openFinances} onOpenReport={openRapport} />}
          </>
        )}
      </div>

      {!detail && (
        <FAB open={fabOpen} setOpen={setFabOpen} onAction={(id) => setSheet(id)} />
      )}

      {/* Finances detail : mini-FAB contextuel avec 2 actions vente/dépense */}
      {detail?.type === 'finances' && (
        <FinancesFAB onNewSale={() => setSheet('vente')} onNewExpense={() => setSheet('depense')} />
      )}

      <BottomNav active={tab} onChange={(t) => { setTab(t); setDetail(null); }} />

      {/* === FAB sheets (globales) === */}
      <BottomSheet open={sheet === 'truie'} onClose={() => setSheet(null)} title="Ajouter une truie">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label className="label-ui">Identifiant</label><input className="input input--mono" placeholder="T-000" /></div>
          <div><label className="label-ui">Race</label><input className="input" placeholder="Large White × Landrace" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label-ui">Naissance</label><input className="input input--mono" placeholder="jj/mm/aaaa" /></div>
            <div><label className="label-ui">Poids (kg)</label><input className="input input--mono" placeholder="000,0" /></div>
          </div>
          <div><label className="label-ui">Origine</label><input className="input" placeholder="Ferme / éleveur" /></div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <Button variant="secondary" onClick={() => setSheet(null)} style={{ flex: 1 }}>ANNULER</Button>
            <Button variant="primary" onClick={() => { setSheet(null); showToast('Truie ajoutée'); }} style={{ flex: 2 }}>AJOUTER</Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === 'misebas'} onClose={() => setSheet(null)} title="Enregistrer mise-bas">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label className="label-ui">Truie</label><input className="input input--mono" defaultValue="T-017" /></div>
          <div><label className="label-ui">Date</label><input className="input input--mono" defaultValue="19/04/2026" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div><label className="label-ui">Nés totaux</label><input className="input input--mono" placeholder="00" /></div>
            <div><label className="label-ui">Vivants</label><input className="input input--mono" placeholder="00" /></div>
            <div><label className="label-ui">Mort-nés</label><input className="input input--mono" placeholder="00" /></div>
          </div>
          <div><label className="label-ui">Loge</label><input className="input input--mono" defaultValue="M-02" /></div>
          <div><label className="label-ui">Note</label><textarea className="input" rows="2" placeholder="Observations terrain…" /></div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <Button variant="secondary" onClick={() => setSheet(null)} style={{ flex: 1 }}>ANNULER</Button>
            <Button variant="primary" onClick={() => { setSheet(null); showToast('Mise-bas enregistrée'); }} style={{ flex: 2 }}>ENREGISTRER</Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === 'pesee'} onClose={() => setSheet(null)} title="Saisir pesée">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label className="label-ui">ID</label><input className="input input--mono" placeholder="T-000 / B-000 / P-000" /></div>
          <div><label className="label-ui">Poids (kg)</label><input className="input input--mono" placeholder="000,0" /></div>
          <div><label className="label-ui">Date</label><input className="input input--mono" defaultValue="19/04/2026" /></div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <Button variant="secondary" onClick={() => setSheet(null)} style={{ flex: 1 }}>ANNULER</Button>
            <Button variant="primary" onClick={() => { setSheet(null); showToast('Pesée enregistrée'); }} style={{ flex: 2 }}>ENREGISTRER</Button>
          </div>
        </div>
      </BottomSheet>

      {/* === Stock reorder sheet === */}
      <BottomSheet open={sheet === 'reorder'} onClose={() => setSheet(null)} title={reorderItem ? `Commander · ${reorderItem.name}` : 'Commander'}>
        {reorderItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Card style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="kpi-label">STOCK ACTUEL</span>
                <span className="ft-code" style={{ fontSize: 13, color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>{reorderItem.qty}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
                <span className="kpi-label">AUTONOMIE</span>
                <span className="ft-code" style={{ fontSize: 13, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>{reorderItem.autonomy || '12 j.'}</span>
              </div>
            </Card>
            <div><label className="label-ui">Formule</label><input className="input" defaultValue={reorderItem.name} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label className="label-ui">Quantité (kg)</label><input className="input input--mono" defaultValue="500" /></div>
              <div><label className="label-ui">Prix / kg (FCFA)</label><input className="input input--mono" defaultValue="420" /></div>
            </div>
            <div><label className="label-ui">Fournisseur</label><input className="input" defaultValue="SIVOP Abidjan" /></div>
            <div><label className="label-ui">Livraison souhaitée</label><input className="input input--mono" defaultValue="22/04/2026" /></div>
            <Card style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="kpi-label">TOTAL ESTIMÉ</span>
              <span className="ft-code" style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>210 000 FCFA</span>
            </Card>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <Button variant="secondary" onClick={() => setSheet(null)} style={{ flex: 1 }}>ANNULER</Button>
              <Button variant="primary" onClick={() => { setSheet(null); showToast('Commande envoyée'); }} style={{ flex: 2 }}>ENVOYER</Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* === Finances sheets === */}
      <BottomSheet open={sheet === 'vente'} onClose={() => setSheet(null)} title="Enregistrer vente">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label className="label-ui">Type</label><input className="input" defaultValue="Porcs vifs" /></div>
          <div><label className="label-ui">Bande</label><input className="input input--mono" placeholder="25-Txx-01" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="label-ui">Nb têtes</label><input className="input input--mono" placeholder="00" /></div>
            <div><label className="label-ui">Poids moy. (kg)</label><input className="input input--mono" placeholder="00,0" /></div>
          </div>
          <div><label className="label-ui">Montant (FCFA)</label><input className="input input--mono" placeholder="000 000" /></div>
          <div><label className="label-ui">Acheteur</label><input className="input" placeholder="Boucher / marché…" /></div>
          <div><label className="label-ui">Date</label><input className="input input--mono" defaultValue="19/04/2026" /></div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <Button variant="secondary" onClick={() => setSheet(null)} style={{ flex: 1 }}>ANNULER</Button>
            <Button variant="primary" onClick={() => { setSheet(null); showToast('Vente enregistrée'); }} style={{ flex: 2 }}>ENREGISTRER</Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === 'depense'} onClose={() => setSheet(null)} title="Enregistrer dépense">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="label-ui">Catégorie</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 4 }}>
              {['Aliment', 'Véto', 'Main d’œuvre', 'Maintenance', 'Autre'].map((c, i) => (
                <button key={c} type="button" className="pressable" style={{
                  padding: '8px 6px',
                  background: i === 0 ? 'var(--bg-2)' : 'transparent',
                  border: `1px solid ${i === 0 ? 'var(--amber)' : 'var(--border)'}`,
                  borderRadius: 8,
                  color: i === 0 ? 'var(--amber)' : 'var(--text-1)',
                  fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer'
                }}>{c}</button>
              ))}
            </div>
          </div>
          <div><label className="label-ui">Libellé</label><input className="input" placeholder="Croissance 20% · 500 kg" /></div>
          <div><label className="label-ui">Montant (FCFA)</label><input className="input input--mono" placeholder="000 000" /></div>
          <div><label className="label-ui">Fournisseur</label><input className="input" placeholder="SIVOP Abidjan" /></div>
          <div><label className="label-ui">Date</label><input className="input input--mono" defaultValue="19/04/2026" /></div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <Button variant="secondary" onClick={() => setSheet(null)} style={{ flex: 1 }}>ANNULER</Button>
            <Button variant="primary" onClick={() => { setSheet(null); showToast('Dépense enregistrée'); }} style={{ flex: 2 }}>ENREGISTRER</Button>
          </div>
        </div>
      </BottomSheet>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute', left: 16, right: 16, bottom: 110,
          background: 'var(--accent)', color: 'var(--accent-fg)',
          padding: '12px 16px', borderRadius: 10,
          fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'slideUp 240ms var(--ease-spring)',
          zIndex: 30
        }}>
          <Icon name="Check" size={14} stroke={2.4} />
          {toast}
        </div>
      )}
    </div>
  );
}

window.App = App;
