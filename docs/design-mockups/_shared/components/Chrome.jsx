// Chrome: AgritechHeader, BottomNav, FAB, PhoneFrame, BottomSheet

function AgritechHeader({ title, subtitle, backTo, onBack, rightSlot }) {
  return (
    <div style={{
      background: 'var(--bg-1)',
      borderBottom: '1px solid var(--border)',
      padding: '14px 16px 12px',
      paddingTop: 'max(14px, env(safe-area-inset-top))',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12
    }}>
      {backTo && (
        <button onClick={onBack} className="pressable" style={{ background: 'transparent', border: 0, color: 'var(--text-1)', padding: 4, cursor: 'pointer', marginTop: 2 }}>
          <Icon name="ArrowLeft" size={20} />
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="ft-heading" style={{ fontSize: 24, color: 'var(--text-0)', lineHeight: 1 }}>{title}</div>
        {subtitle && (
          <div className="ft-code" style={{ fontSize: 11, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 6 }}>{subtitle}</div>
        )}
      </div>
      {rightSlot}
    </div>
  );
}

const NAV_TABS = [
  { id: 'cockpit',    label: 'COCKPIT',    icon: 'LayoutDashboard', accent: 'var(--accent-cockpit)' },
  { id: 'troupeau',   label: 'TROUPEAU',   icon: 'Users',           accent: 'var(--accent-troupeau)' },
  { id: 'cycles',     label: 'CYCLES',     icon: 'RefreshCw',       accent: 'var(--accent-cycles)' },
  { id: 'ressources', label: 'RESSOURCES', icon: 'Package',         accent: 'var(--accent-ressources)' },
  { id: 'pilotage',   label: 'PILOTAGE',   icon: 'BarChart3',       accent: 'var(--accent-pilotage)' },
];

function BottomNav({ active, onChange }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'var(--bg-1)', borderTop: '1px solid var(--border)',
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      zIndex: 5
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', alignItems: 'flex-end', padding: '10px 2px 6px' }}>
        {NAV_TABS.map(t => {
          const isActive = t.id === active;
          const c = isActive ? t.accent : 'var(--text-2)';
          return (
            <button key={t.id} onClick={() => onChange(t.id)} className="pressable" style={{ background: 'transparent', border: 0, padding: '4px 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', position: 'relative', minHeight: 52 }}>
              {isActive && <span style={{ position: 'absolute', top: -10, width: 28, height: 2, background: c, borderRadius: 2 }} />}
              <Icon name={t.icon} size={22} stroke={isActive ? 2.2 : 1.7} color={c} />
              <span className="ft-code" style={{ fontSize: 9.5, letterSpacing: '0.04em', color: c, textTransform: 'uppercase', fontWeight: isActive ? 600 : 500 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FAB({ onAction, open, setOpen }) {
  const items = [
    { id: 'truie',    label: 'AJOUTER TRUIE',       icon: 'PawPrint', tone: 'var(--accent)' },
    { id: 'misebas',  label: 'ENREGISTRER MISE-BAS',icon: 'Baby',     tone: 'var(--gold)' },
    { id: 'pesee',    label: 'SAISIR PESÉE',        icon: 'Scale',    tone: 'var(--blue)' },
  ];
  const accent = 'var(--accent)';
  const accentFg = 'var(--accent-fg)';
  return (
    <>
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10 }} />
      )}
      <div style={{ position: 'absolute', right: 20, bottom: 90, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end', zIndex: 11, pointerEvents: open ? 'auto' : 'none' }}>
        {items.map((it, i) => (
          <div key={it.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            opacity: open ? 1 : 0,
            transform: open ? 'translateY(0)' : 'translateY(10px)',
            transition: `opacity 240ms var(--ease-gentle) ${i * 40}ms, transform 240ms var(--ease-spring) ${i * 40}ms`
          }}>
            <span className="ft-code" style={{ fontSize: 11, color: 'var(--text-0)', background: 'var(--bg-2)', border: '1px solid var(--border)', padding: '5px 9px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>{it.label}</span>
            <button onClick={() => { onAction(it.id); setOpen(false); }} className="pressable" style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--bg-2)', border: '1px solid var(--border)', color: it.tone, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={it.icon} size={18} color={it.tone} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'absolute', right: 20, bottom: 86,
          width: 56, height: 56, borderRadius: 18,
          background: accent, color: accentFg,
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 0 1px rgba(16,185,129,0.25), 0 8px 24px rgba(16,185,129,0.25)',
          transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: 'transform 260ms var(--ease-spring)',
          zIndex: 12
        }}
      >
        <Icon name="Plus" size={22} stroke={2.4} />
      </button>
    </>
  );
}

function PhoneFrame({ children, scale = 1 }) {
  return (
    <div style={{ width: 390 * scale, height: 844 * scale, position: 'relative' }}>
      <div style={{
        width: 390, height: 844,
        background: 'var(--bg-0)',
        border: '10px solid #1A1E1C',
        borderRadius: 44,
        overflow: 'hidden',
        position: 'relative',
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
      }}>
        {/* notch */}
        <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 120, height: 28, background: '#0A0E0B', borderRadius: 16, zIndex: 20 }} />
        {/* status bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 15, color: 'var(--text-0)' }}>
          <span className="ft-code" style={{ fontSize: 14, fontWeight: 600, letterSpacing: 0 }}>9:41</span>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <Icon name="Signal" size={14} />
            <Icon name="Wifi" size={14} />
            <Icon name="Battery" size={16} />
          </div>
        </div>
        {/* content */}
        <div style={{ position: 'absolute', inset: 0, paddingTop: 44 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function BottomSheet({ open, onClose, title, children }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 240ms var(--ease-gentle)',
          zIndex: 20
        }}
      />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: 'var(--bg-1)', borderTop: '1px solid var(--border)',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 300ms var(--ease-spring)',
        zIndex: 21,
        maxHeight: '80%', overflowY: 'auto',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))'
      }}>
        <div style={{ padding: '10px 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 4, background: 'var(--text-2)', borderRadius: 2, opacity: 0.5 }} />
        </div>
        {title && (
          <div style={{ padding: '0 20px 14px' }}>
            <div className="ft-heading" style={{ fontSize: 22, color: 'var(--text-0)' }}>{title}</div>
          </div>
        )}
        <div style={{ padding: '0 20px' }}>{children}</div>
      </div>
    </>
  );
}

Object.assign(window, { AgritechHeader, BottomNav, FAB, PhoneFrame, BottomSheet, NAV_TABS, FinancesFAB });

function FinancesFAB({ onNewSale, onNewExpense }) {
  const { useState } = React;
  const [open, setOpen] = useState(false);
  const items = [
    { id: 'sale',    label: 'ENREGISTRER VENTE',   icon: 'ArrowDownLeft', tone: 'var(--accent)', onClick: onNewSale },
    { id: 'expense', label: 'ENREGISTRER DÉPENSE', icon: 'ArrowUpRight',  tone: 'var(--amber)',  onClick: onNewExpense },
  ];
  return (
    <div style={{ position: 'absolute', right: 18, bottom: 96, zIndex: 15 }}>
      {open && (
        <div style={{ position: 'absolute', right: 0, bottom: 66, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
          {items.map((it, i) => (
            <button key={it.id} onClick={() => { setOpen(false); it.onClick?.(); }}
              className="pressable"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
                background: 'var(--bg-1)', border: `1px solid ${it.tone}`,
                borderRadius: 999, cursor: 'pointer',
                animation: `slideUp 200ms ${100 + i*60}ms var(--ease-spring) both`,
                color: 'var(--text-0)',
              }}>
              <span style={{ color: it.tone, display: 'inline-flex' }}><Icon name={it.icon} size={14} stroke={2.2} /></span>
              <span className="ft-code" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em' }}>{it.label}</span>
            </button>
          ))}
        </div>
      )}
      <button onClick={() => setOpen(!open)} className="pressable" style={{
        width: 56, height: 56, borderRadius: 28,
        background: 'var(--accent)', color: 'var(--accent-fg)',
        border: 0, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 20px rgba(16,185,129,0.3)',
        transform: open ? 'rotate(45deg)' : 'none',
        transition: 'transform 200ms var(--ease-spring)',
      }}>
        <Icon name="Plus" size={24} stroke={2.4} />
      </button>
    </div>
  );
}
