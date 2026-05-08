/**
 * V72 — Bannière consentement notifications PWA.
 *
 * Affichée uniquement si :
 *  - support API détecté
 *  - permission === 'default'
 *  - non dismissée < 7j (kvStore `pt:notif_dismissed_at`)
 *
 * Copy métier concrète (anti-AI) : pas d'emoji, pas de "Découvrez nos
 * notifications". Référence Christophe / K13 Côte d'Ivoire.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import {
  isWebSupported,
  getWebPermission,
  requestWebPermission,
  isPromptDismissed,
  dismissPrompt,
} from '../services/notifications';

export const NotificationsPermissionPrompt: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isWebSupported()) return;
    if (getWebPermission() !== 'default') return;
    if (isPromptDismissed()) return;
    setVisible(true);
  }, []);

  const handleEnable = useCallback(async () => {
    setBusy(true);
    try {
      const result = await requestWebPermission();
      if (result === 'granted') {
        // Notif témoin pour confirmer la chaîne (SW + permission OK).
        const { showLocal } = await import('../services/notifications');
        await showLocal(
          'Rappels actifs',
          'Tu seras prévenu des mises-bas et ruptures de stock.',
        );
      }
    } finally {
      setBusy(false);
      setVisible(false);
    }
  }, []);

  const handleLater = useCallback(async () => {
    await dismissPrompt();
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Activer les rappels"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 14px',
        marginBottom: 16,
        background: 'var(--pt-warm)',
        border: '1px solid var(--pt-line-strong)',
        borderRadius: 14,
      }}
    >
      <Bell
        size={20}
        strokeWidth={1.6}
        color="var(--pt-accent)"
        aria-hidden
        style={{ flexShrink: 0, marginTop: 2 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--pt-font-display, "BigShouldersDisplay", system-ui, sans-serif)',
            fontWeight: 700,
            fontSize: 15,
            lineHeight: 1.2,
            color: 'var(--pt-ink)',
            marginBottom: 4,
          }}
        >
          Active les rappels mise-bas et stocks
        </div>
        <div
          style={{
            fontFamily: 'var(--pt-font-body, "InstrumentSans", system-ui, sans-serif)',
            fontSize: 12,
            lineHeight: 1.4,
            color: 'var(--pt-muted)',
            marginBottom: 10,
          }}
        >
          Tu n'oublies rien — Marius te ping quand une truie approche, ou
          quand un sac d'aliment s'épuise.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleEnable}
            disabled={busy}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: 'none',
              background: 'var(--pt-primary)',
              color: 'white',
              fontFamily: 'var(--pt-font-display, "BigShouldersDisplay", system-ui, sans-serif)',
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
          >
            Activer les rappels
          </button>
          <button
            type="button"
            onClick={handleLater}
            disabled={busy}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: '1px solid var(--pt-line-strong)',
              background: 'transparent',
              color: 'var(--pt-ink)',
              fontFamily: 'var(--pt-font-display, "BigShouldersDisplay", system-ui, sans-serif)',
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Plus tard
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={handleLater}
        aria-label="Fermer cette bannière"
        style={{
          background: 'none',
          border: 'none',
          padding: 4,
          cursor: 'pointer',
          color: 'var(--pt-muted)',
          flexShrink: 0,
        }}
      >
        <X size={16} strokeWidth={1.6} aria-hidden />
      </button>
    </div>
  );
};

export default NotificationsPermissionPrompt;
