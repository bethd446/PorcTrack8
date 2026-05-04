import React from 'react';
import { ArrowLeft, Search, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useGlobalSearch } from '../context/GlobalSearchContext';
import { Button } from '@/design-system';

export interface AgritechHeaderProps {
  /** Titre principal (Big Shoulders, sentence case — v6 2026-04-30). */
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
  /**
   * Si `true`, affiche un bouton loupe (Recherche globale) à droite qui ouvre
   * la modale `GlobalSearch`. No-op si le `GlobalSearchProvider` n'est pas monté.
   * Opt-in (défaut `true` — accès recherche dans tous les hubs principaux).
   */
  showSearch?: boolean;
  /** Slot pour intégrer search/filters/tabs sous le titre. */
  children?: React.ReactNode;
  /** className additionnel sur le wrapper. */
  className?: string;
}

/**
 * AgritechHeader — header agritech (fond bg-bg-0).
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
  showSearch = true,
  children,
  className,
}) => {
  const navigate = useNavigate();
  const search = useGlobalSearch();

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
      data-testid="agritech-header"
      className={cn(
        'bg-bg-0 border-b border-border px-4 pt-4 pb-3',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: back + title/subtitle */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {showBack ? (
            <Button
              type="button"
              variant="ghost"
              size="small"
              onClick={handleBack}
              aria-label="Retour"
              className="pressable mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center bg-bg-2 text-text-1 active:scale-[0.96] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              style={{ borderRadius: '0.375rem', height: '2.25rem', width: '2.25rem', padding: 0 }}
            >
              <ArrowLeft size={20} aria-hidden="true" />
            </Button>
          ) : null}

          <div className="min-w-0">
            <h1
              className="agritech-heading leading-none truncate"
              style={{ fontSize: 'clamp(22px, 6vw, 28px)', letterSpacing: '-0.01em' }}
            >
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-[12px] text-text-2 leading-none truncate">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {/* Right: optional search + optional action + optional Réglages gear */}
        {action || showSettings || (showSearch && search) ? (
          <div className="shrink-0 flex items-center gap-2">
            {showSearch && search ? (
              <Button
                type="button"
                variant="ghost"
                size="small"
                onClick={search.openSearch}
                aria-label="Rechercher"
                className="pressable inline-flex h-9 w-9 shrink-0 items-center justify-center bg-bg-2 text-text-2 hover:text-text-0 active:scale-[0.96] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                style={{ borderRadius: '0.375rem', height: '2.25rem', width: '2.25rem', padding: 0 }}
              >
                <Search size={18} aria-hidden="true" />
              </Button>
            ) : null}
            {action ? <div className="pressable">{action}</div> : null}
            {showSettings ? (
              <Button
                type="button"
                variant="ghost"
                size="small"
                onClick={() => navigate('/more')}
                aria-label="Ouvrir les réglages"
                className="pressable inline-flex h-9 w-9 shrink-0 items-center justify-center bg-bg-2 text-text-2 hover:text-text-0 active:scale-[0.96] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                style={{ borderRadius: '0.375rem', height: '2.25rem', width: '2.25rem', padding: 0 }}
              >
                <Settings size={18} aria-hidden="true" />
              </Button>
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
