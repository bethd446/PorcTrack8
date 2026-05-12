import React, { useEffect, useRef } from 'react';
import {
  Heart,
  Stethoscope,
  Baby,
  Milk,
  AlertOctagon,
  Scale,
  Syringe,
  Wheat,
  FileText,
  Sparkles,
  Layers,
  Repeat,
  PackagePlus,
  Truck,
  Pill,
  Coins,
  X,
} from 'lucide-react';

import { useQuickActions, type QuickActionKind } from '../AgritechNavV2';
import { useFarmProfile } from '../../hooks/useFarmProfile';
import { hasReproduction, hasEngraissement, type FarmProfile } from '../../lib/farmProfile';

export interface SaisirSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

type ActionKind = QuickActionKind | 'marius';

interface ActionDef {
  kind: ActionKind;
  title: string;
  hint?: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; 'aria-hidden'?: boolean }>;
  tone: 'accent' | 'amber' | 'red' | 'default';
  separator?: boolean;
  /** V80 — quels profils voient cette action ? Absence = tous. */
  profilesAllow?: FarmProfile[];
}

const ACTIONS: ActionDef[] = [
  // Repro (cf. PLAN_PROFIL_MULTI §5.2)
  { kind: 'saillie', title: 'Saillie', hint: 'Truie × verrat', Icon: Heart, tone: 'accent', profilesAllow: ['naisseur', 'cycle_complet'] },
  { kind: 'echographie', title: 'Écho', hint: 'J28 gestation', Icon: Stethoscope, tone: 'accent', profilesAllow: ['naisseur', 'cycle_complet'] },
  { kind: 'misebas', title: 'Mise-bas', hint: 'Nés + morts-nés', Icon: Baby, tone: 'accent', profilesAllow: ['naisseur', 'cycle_complet'] },
  { kind: 'sevrage', title: 'Sevrage', hint: 'Bande + porcelets', Icon: Milk, tone: 'default', profilesAllow: ['naisseur', 'cycle_complet'] },
  // Mortalité transverse
  { kind: 'mortalite', title: 'Mortalité', hint: 'Animal + cause', Icon: AlertOctagon, tone: 'red' },
  { kind: 'adoption', title: 'Adoption', hint: 'Transfert mat.', Icon: Repeat, tone: 'default', profilesAllow: ['naisseur', 'cycle_complet'] },
  // Pesée + conso = transverses
  { kind: 'pesee', title: 'Pesée', hint: 'Poids moyen', Icon: Scale, tone: 'amber' },
  { kind: 'conso', title: 'Conso', hint: 'Aliment livré', Icon: Wheat, tone: 'amber' },
  // Tri poids = engraissement
  { kind: 'tripoids', title: 'Tri poids', hint: 'Eng. / finition', Icon: Layers, tone: 'amber', profilesAllow: ['engraisseur', 'cycle_complet'] },
  // v3.4.4 — Engraissement (PLAN_PROFIL_MULTI §5.2)
  { kind: 'receptionlot', title: 'Réception lot', hint: 'Achat porcelets', Icon: PackagePlus, tone: 'accent', profilesAllow: ['engraisseur', 'cycle_complet'] },
  { kind: 'ventelot', title: 'Vente lot', hint: 'Abattoir / négoce', Icon: Truck, tone: 'accent', profilesAllow: ['engraisseur', 'cycle_complet'] },
  { kind: 'soin', title: 'Soin', hint: 'Traitement véto', Icon: Syringe, tone: 'accent' },
  { kind: 'note', title: 'Note', hint: 'Observation', Icon: FileText, tone: 'default' },
  // v3.4.4 — Stocks + finance transverses (tous profils)
  { kind: 'stockaliment', title: 'Stock aliment', hint: 'Entrée stock', Icon: Wheat, tone: 'amber' },
  { kind: 'stockveto', title: 'Stock véto', hint: 'Pharmacie', Icon: Pill, tone: 'accent' },
  { kind: 'finance', title: 'Finance', hint: 'Recette / dépense', Icon: Coins, tone: 'amber' },
  { kind: 'marius', title: 'Marius', hint: 'Assistant IA', Icon: Sparkles, tone: 'amber', separator: true },
];

/** V80 — applique le filtrage par profil sur la liste d'actions. */
function filterActionsByProfile(actions: ActionDef[], profil: FarmProfile): ActionDef[] {
  return actions.filter((a) => !a.profilesAllow || a.profilesAllow.includes(profil));
}

const TONE_BG: Record<ActionDef['tone'], string> = {
  default: 'var(--pt-warm, #F1ECE0)',
  accent: 'color-mix(in srgb, var(--pt-accent, #B97839) 16%, transparent)',
  amber: 'color-mix(in srgb, var(--pt-amber-ink, #B45309) 18%, transparent)',
  red: 'color-mix(in srgb, var(--pt-rose-ink, #B91C1C) 14%, transparent)',
};

const TONE_FG: Record<ActionDef['tone'], string> = {
  default: 'var(--pt-ink, #1a1a1a)',
  accent: 'var(--pt-accent-deep, #8B5A2B)',
  amber: 'var(--pt-amber-ink, #B45309)',
  red: 'var(--pt-rose-ink, #B91C1C)',
};

const SaisirSheet: React.FC<SaisirSheetProps> = ({ isOpen, onClose }) => {
  const { openAction } = useQuickActions();
  const profil = useFarmProfile();
  const visibleActions = React.useMemo(
    () => filterActionsByProfile(ACTIONS, profil),
    [profil],
  );
  const cycleCount = React.useMemo(
    () => visibleActions.filter((a) => !a.separator).length,
    [visibleActions],
  );
  const reproCovered = hasReproduction(profil);
  const engCovered = hasEngraissement(profil);
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousActiveRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousActiveRef.current = document.activeElement;
    const t = setTimeout(() => {
      const closeBtn = sheetRef.current?.querySelector<HTMLButtonElement>('[data-saisir-close]');
      closeBtn?.focus();
    }, 30);

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab' && sheetRef.current) {
        const focusables = sheetRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKeyDown);
      if (previousActiveRef.current instanceof HTMLElement) {
        previousActiveRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePick = (kind: ActionKind): void => {
    // Ouvre le form cible AVANT de fermer le sheet : ainsi le state du
    // QuickActionsProvider est posé en synchrone, et la fermeture du sheet
    // (qui re-focus l'élément précédent) n'interfère pas avec le mount du
    // form (bug C8 V16 — race condition).
    if (kind === 'marius') {
      window.dispatchEvent(new Event('open-chatbot'));
    } else {
      openAction(kind);
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="saisir-sheet-title"
      data-pt-profil={profil}
      data-pt-repro={reproCovered ? 'on' : 'off'}
      data-pt-eng={engCovered ? 'on' : 'off'}
      className="pt-screen fixed inset-0 z-[1100] flex items-end justify-center"
    >
      {/* V43.4 — Overlay = div avec onClick (pas un bouton). Le seul vrai
          bouton "Fermer" est le X dans la sheet ci-dessous. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />

      <div
        ref={sheetRef}
        className="relative w-full max-w-[520px] animate-fade-in-up"
        style={{
          background: 'var(--pt-bg, #FAF7F0)',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTop: '1px solid var(--pt-line-strong, rgba(26,26,26,0.16))',
          borderLeft: '1px solid var(--pt-line-strong, rgba(26,26,26,0.16))',
          borderRight: '1px solid var(--pt-line-strong, rgba(26,26,26,0.16))',
          boxShadow: '0 -10px 30px rgba(0,0,0,0.18)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
        }}
      >
        <div className="sheet__handle" aria-hidden="true" />

        <h2
          id="saisir-sheet-title"
          className="sheet__title"
          style={{ padding: '0 20px 0', margin: 0 }}
        >
          Que veux-tu saisir ?
        </h2>
        <div className="sheet__sub" style={{ padding: '0 20px 12px' }}>
          {cycleCount} action{cycleCount > 1 ? 's' : ''} terrain · cycle GTTT
        </div>

        <div
          style={{
            position: 'absolute',
            top: 18,
            right: 16,
          }}
        >
          <button
            type="button"
            data-saisir-close
            onClick={onClose}
            aria-label="Fermer"
            className="pressable"
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid var(--pt-line-strong, rgba(26,26,26,0.16))',
              background: 'transparent',
              color: 'var(--pt-ink, #1a1a1a)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        <div
          className="saisir-sheet__grid"
          style={{
            padding: '4px 16px 8px',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            flex: 1,
            minHeight: 0,
          }}
        >
          {visibleActions.map(({ kind, title, hint, Icon, tone, separator }) => (
            <button
              key={kind}
              type="button"
              onClick={() => handlePick(kind)}
              data-saisir-item={kind}
              className="saisir-sheet__item pressable"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                gap: 8,
                padding: '14px 12px',
                background: 'var(--pt-warm, #F1ECE0)',
                border: '1px solid var(--pt-line, rgba(26,26,26,0.08))',
                borderRadius: 14,
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: 104,
                position: 'relative',
                ...(separator
                  ? {
                      // Marius : item full-width sur la dernière ligne (visuellement
                      // distinct comme "bonus" hors-cycle GTTT).
                      gridColumn: '1 / -1',
                      flexDirection: 'row',
                      alignItems: 'center',
                      minHeight: 64,
                      borderStyle: 'dashed',
                    }
                  : {}),
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: TONE_BG[tone],
                  color: TONE_FG[tone],
                  flexShrink: 0,
                }}
              >
                <Icon size={20} strokeWidth={2} aria-hidden />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span
                  className="saisir-sheet__item-title"
                  style={{
                    fontFamily: 'var(--ff-mono)',
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--pt-ink, #1a1a1a)',
                    lineHeight: 1.1,
                  }}
                >
                  {title}
                </span>
                {hint ? (
                  <span
                    className="saisir-sheet__item-hint"
                    style={{
                      fontFamily: 'var(--ff-mono)',
                      fontSize: 10.5,
                      fontWeight: 500,
                      letterSpacing: '0.04em',
                      color: 'var(--pt-muted, #6b6357)',
                      lineHeight: 1.2,
                    }}
                  >
                    {hint}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SaisirSheet;
