/**
 * V72 — Switches catégories de notifications (Réglages).
 *
 * 3 toggles persistés dans kvStore (`pt:notif_categories`) :
 *  - Rappels mise-bas       (R1, R7)
 *  - Stocks critiques       (R5, R5b)
 *  - Cycles repro           (R2, R3)
 *
 * État disabled si Notification.permission === 'denied' avec lien aide.
 */
import React, { useEffect, useState } from 'react';
import {
  type NotifCategories,
  type NotifCategoryKey,
  getNotifCategories,
  setNotifCategories,
  getWebPermission,
} from '../../../services/notifications';

interface RowProps {
  title: string;
  subtitle: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
  isLast?: boolean;
}

const Row: React.FC<RowProps> = ({ title, subtitle, checked, disabled, onChange, isLast }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      minHeight: 60,
      padding: '14px 4px',
      borderBottom: isLast ? 'none' : '1px solid var(--pt-line)',
      opacity: disabled ? 0.5 : 1,
    }}
  >
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontFamily: 'var(--pt-font-display, "BigShouldersDisplay", system-ui, sans-serif)',
          fontWeight: 700,
          fontSize: 16,
          lineHeight: 1.2,
          color: 'var(--pt-ink)',
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: 'var(--pt-font-body, "InstrumentSans", system-ui, sans-serif)',
          fontSize: 12,
          lineHeight: 1.35,
          color: 'var(--pt-muted)',
          marginTop: 2,
        }}
      >
        {subtitle}
      </div>
    </div>
    <input
      type="checkbox"
      role="switch"
      aria-label={title}
      aria-checked={checked}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      style={{ transform: 'scale(1.4)', cursor: disabled ? 'not-allowed' : 'pointer' }}
    />
  </div>
);

export const NotifCategoriesSwitches: React.FC = () => {
  const [cats, setCats] = useState<NotifCategories>(() => getNotifCategories());
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    () => getWebPermission(),
  );

  // Re-sync sur focus (l'utilisateur peut changer la permission depuis les
  // réglages navigateur sans recharger la page).
  useEffect(() => {
    const onFocus = () => setPermission(getWebPermission());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const update = (key: NotifCategoryKey) => (next: boolean) => {
    const updated = { ...cats, [key]: next };
    setCats(updated);
    void setNotifCategories(updated);
  };

  const denied = permission === 'denied';
  const unsupported = permission === 'unsupported';

  return (
    <div>
      {denied && (
        <div
          style={{
            padding: '10px 12px',
            marginBottom: 8,
            background: 'rgba(164,69,61,0.06)',
            border: '1px solid rgba(164,69,61,0.2)',
            borderRadius: 10,
            fontSize: 12,
            lineHeight: 1.45,
            color: 'var(--pt-danger)',
            fontFamily: 'var(--pt-font-body, "InstrumentSans", system-ui, sans-serif)',
          }}
        >
          Notifications bloquées. Ouvre les réglages du navigateur pour
          autoriser PorcTrack à t'envoyer des rappels.
        </div>
      )}
      {unsupported && (
        <div
          style={{
            padding: '10px 12px',
            marginBottom: 8,
            background: 'var(--pt-warm)',
            border: '1px solid var(--pt-line)',
            borderRadius: 10,
            fontSize: 12,
            lineHeight: 1.45,
            color: 'var(--pt-muted)',
            fontFamily: 'var(--pt-font-body, "InstrumentSans", system-ui, sans-serif)',
          }}
        >
          Ce navigateur ne supporte pas les notifications. Installe
          PorcTrack en PWA depuis Chrome Android.
        </div>
      )}
      <div style={{ borderTop: '1px solid var(--pt-line)' }}>
        <Row
          title="Rappels mise-bas"
          subtitle="J-3, J-1, jour J pour chaque truie pleine."
          checked={cats.mise_bas}
          disabled={denied || unsupported}
          onChange={update('mise_bas')}
        />
        <Row
          title="Stocks critiques"
          subtitle="Aliment ou véto en rupture, à commander."
          checked={cats.stocks}
          disabled={denied || unsupported}
          onChange={update('stocks')}
        />
        <Row
          title="Cycles repro"
          subtitle="Sevrage, retour chaleur, échographie."
          checked={cats.cycles_repro}
          disabled={denied || unsupported}
          onChange={update('cycles_repro')}
          isLast
        />
      </div>
    </div>
  );
};

export default NotifCategoriesSwitches;
