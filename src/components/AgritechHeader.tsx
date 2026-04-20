import React from 'react';
import { ArrowLeft, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export interface AgritechHeaderProps {
  /** Titre principal (affiché UPPERCASE, Big Shoulders Display). */
  title: string;
  /** Sous-titre (mono, text-text-2). */
  subtitle?: string;
  /** Si présent, affiche un bouton Retour qui navigue vers ce path. */
  backTo?: string;
  /** Bouton d'action optionnel aligné à droite. */
  action?: React.ReactNode;
  /**
   * Si `true`, affiche un bouton engrenage (Réglages) à droite qui navigue
   * vers `/more`. Opt-in (défaut `false`) : à activer uniquement sur les
   * écrans où un accès permanent aux réglages a du sens (ex: Cockpit).
   */
  showSettings?: boolean;
  /** Slot pour intégrer search/filters/tabs sous le titre. */
  children?: React.ReactNode;
  /** className additionnel sur le wrapper. */
  className?: string;
}

/**
 * AgritechHeader — équivalent dark cockpit de `PremiumHeader`.
 *
 * Dédié aux écrans agritech (fond `bg-bg-0`). Fondu sans couture avec
 * `AgritechLayout` (même fond). Safe-area-top respectée.
 *
 * API volontairement minimaliste : pas de status pill / sync badges
 * ici (ces éléments vivent dans le Cockpit). Les hubs doivent rester
 * focalisés sur la navigation.
 */
const AgritechHeader: React.FC<AgritechHeaderProps> = ({
  title,
  subtitle,
  backTo,
  action,
  showSettings = false,
  children,
  className,
}) => {
  const navigate = useNavigate();

  const handleBack = (): void => {
    if (backTo) {
      navigate(backTo);
      return;
    }
    if (window.history.length > 1) navigate(-1);
    else navigate('/', { replace: true });
  };

  const showBack = Boolean(backTo);

  return (
    <header
      role="banner"
      className={cn(
        'bg-bg-0 border-b border-border px-4 pt-4 pb-3',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: back + title/subtitle */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {showBack ? (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Retour"
              className="pressable mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-2 text-text-1 active:scale-[0.96] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </button>
          ) : null}

          <div className="min-w-0">
            <h1
              className="agritech-heading uppercase leading-none truncate"
              style={{ fontSize: 'clamp(22px, 6vw, 28px)', letterSpacing: '0.02em' }}
            >
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 font-mono text-[12px] text-text-2 leading-none truncate">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {/* Right: optional action + optional Réglages gear */}
        {action || showSettings ? (
          <div className="shrink-0 flex items-center gap-2">
            {action ? <div className="pressable">{action}</div> : null}
            {showSettings ? (
              <button
                type="button"
                onClick={() => navigate('/more')}
                aria-label="Ouvrir les réglages"
                className="pressable inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-2 text-text-2 hover:text-text-0 active:scale-[0.96] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <Settings size={18} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Slot for search / filters / tabs */}
      {children ? <div className="mt-3">{children}</div> : null}
    </header>
  );
};

export default AgritechHeader;
