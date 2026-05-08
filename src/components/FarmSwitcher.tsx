/**
 * FarmSwitcher — V71-P3 multi-farm picker
 *
 * Affiche un dropdown permettant à un user multi-farm de basculer entre les
 * fermes auxquelles il appartient (table farm_members). Mono-farm = composant
 * invisible (return null).
 *
 * Branchement :
 *  - useFarm() expose `availableFarms`, `currentFarmId`, `switchFarm`
 *  - sur switch → toast "Bascule sur {nom}" + persist via FarmContext
 *
 * Style : pill DS V70, palette --pt-* + rôle en pill (OWNER vert / ADMIN
 * ambre / PORCHER neutre).
 */
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { useToast } from '../context/ToastContext';
import type { FarmRole } from '../types/farm';

const ROLE_PILL: Record<FarmRole, { label: string; bg: string; fg: string }> = {
  OWNER:   { label: 'Owner',   bg: '#cce0bf',             fg: '#2d4a1f' },
  ADMIN:   { label: 'Admin',   bg: '#f4dcb6',             fg: '#6b4910' },
  PORCHER: { label: 'Porcher', bg: 'rgba(26,26,26,0.06)', fg: 'var(--pt-ink)' },
};

const RolePill: React.FC<{ role: FarmRole }> = ({ role }) => {
  const style = ROLE_PILL[role];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        background: style.bg,
        color: style.fg,
        flexShrink: 0,
      }}
    >
      {style.label}
    </span>
  );
};

export const FarmSwitcher: React.FC = () => {
  const farm = useFarm();
  // Robustesse vis-à-vis des mocks de test partiels : si availableFarms n'est
  // pas exposé (mock antérieur à V71-P3), on dégrade en monoferme silencieuse.
  const availableFarms = farm.availableFarms ?? [];
  const currentFarmId = farm.currentFarmId ?? null;
  const switchFarm = farm.switchFarm;
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside → close
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Mono-farm : composant invisible.
  if (availableFarms.length <= 1) return null;

  const current = availableFarms.find((f) => f.id === currentFarmId) ?? availableFarms[0];

  const handlePick = (farmId: string, farmName: string) => {
    setOpen(false);
    if (farmId === currentFarmId) return;
    if (!switchFarm) return;
    switchFarm(farmId);
    showToast(`Bascule sur ${farmName}`, 'success');
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block', width: '100%' }}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Ferme courante : ${current.name}. Cliquer pour changer`}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: 'var(--pt-warm, #F5E9D8)',
          color: 'var(--pt-ink, #1a1a1a)',
          border: '1px solid var(--pt-line, rgba(26,26,26,0.08))',
          borderRadius: 999,
          fontFamily: 'var(--font-heading)',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'left',
          }}
        >
          {current.name}
        </span>
        <RolePill role={current.role} />
        <ChevronDown
          size={16}
          aria-hidden
          style={{
            transition: 'transform 200ms ease',
            transform: open ? 'rotate(180deg)' : 'none',
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Fermes disponibles"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 30,
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--pt-line, rgba(26,26,26,0.08))',
            borderRadius: 16,
            padding: 6,
            margin: 0,
            listStyle: 'none',
            boxShadow: '0 8px 24px rgba(26,26,26,0.10)',
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {availableFarms.map((farm) => {
            const active = farm.id === currentFarmId;
            return (
              <li key={farm.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => handlePick(farm.id, farm.name)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    background: active ? 'var(--pt-warm, #F5E9D8)' : 'transparent',
                    border: 'none',
                    borderRadius: 12,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    color: 'var(--pt-ink, #1a1a1a)',
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {farm.name}
                  </span>
                  <RolePill role={farm.role} />
                  {active ? (
                    <Check size={14} aria-hidden style={{ color: 'var(--pt-primary, #2D4A1F)', flexShrink: 0 }} />
                  ) : (
                    <span style={{ width: 14, flexShrink: 0 }} aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default FarmSwitcher;
