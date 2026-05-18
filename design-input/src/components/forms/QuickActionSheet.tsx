/**
 * QuickActionSheet — shell canonique des Quick*Form (FORM_CONTRACT Phase 1+3a).
 * ════════════════════════════════════════════════════════════════════════════
 * Factorise la coquille commune à tous les formulaires d'action terrain :
 *  - `IonModal` bottom-sheet (breakpoints [0,1]) + classes `pt-sheet-modal`
 *  - `<form onSubmit>` + `.sheet` + `.sheet__handle`
 *  - `<header>` : eyebrow + titre + bouton close
 *  - slot `children` pour le corps (`.sheet__body`)
 *  - `<footer>` : bouton « Annuler » (ghost) + bouton submit primary
 *    (`btn--lg btn--block`) avec état `saving` / `aria-busy`
 *  - a11y : `useEscapeKey` + `useFocusFirstInput` câblés
 *
 * Contrat : le bouton submit est TOUJOURS `type="submit"`. La soumission passe
 * par `onSubmit` (le form appelle `e.preventDefault()` lui-même dans son
 * handler, comme QuickMiseBasForm). Jamais de `<div>` + `onClick`.
 *
 * Le composant ne rend PAS de toast : le système canonique est `useToast()`
 * (context global monté au niveau App), pas un toast local par form.
 *
 * Phase 3a — support wizard : la prop optionnelle `footer` REMPLACE le footer
 * par défaut (Annuler + submit). Les forms wizard multi-étapes rendent ainsi
 * leur propre navigation (Retour / Suivant / Enregistrer) tout en conservant
 * le reste du shell (IonModal + sheet + handle + header + a11y escape +
 * `<form onSubmit>`). Sans `footer`, le comportement est strictement identique
 * à Phase 1 (rétro-compat totale des 44 forms déjà migrés). Note : un wizard
 * pilote sa soumission depuis ses propres boutons — passer `isValid={false}`
 * neutralise le submit par défaut s'il restait un bouton `type="submit"`, mais
 * comme le footer custom remplace tout, ses boutons sont `type="button"`.
 */
import React from 'react';
import { IonModal } from '@ionic/react';
import { Check, X } from 'lucide-react';

import { useEscapeKey } from './useFormA11y';

export interface QuickActionSheetProps {
  /** Ouverture de la sheet. */
  isOpen: boolean;
  /** Fermeture demandée (close, Annuler, Escape, backdrop). */
  onClose: () => void;
  /** Petit label en capitales au-dessus du titre (ex. « Nouvelle saillie »). */
  eyebrow: string;
  /** Titre de la sheet (ex. « Saisir une saillie »). */
  title: string;
  /** `aria-label` du modal — défaut : `title`. */
  ariaLabel?: string;
  /** Soumission en cours : verrouille les boutons + `aria-busy`. */
  saving: boolean;
  /** Form valide : le bouton submit est activé si `true` et `!saving`. */
  isValid: boolean;
  /** Handler de soumission — DOIT appeler `e.preventDefault()`. */
  onSubmit: (e: React.FormEvent) => void;
  /** Libellé du bouton submit (ex. « Confirmer la saillie »). */
  submitLabel: string;
  /** Libellé pendant `saving` — défaut : « Enregistrement… ». */
  savingLabel?: string;
  /** `aria-label` du bouton submit — défaut : `submitLabel`. */
  submitAriaLabel?: string;
  /** Désactivation supplémentaire du submit (ex. aucune entité éligible). */
  submitDisabled?: boolean;
  /**
   * Footer custom (Phase 3a) : si fourni, REMPLACE le footer par défaut
   * (Annuler + submit). Le form rend sa propre navigation (wizard multi-étapes :
   * Retour / Suivant / Enregistrer). Le reste du shell est inchangé. Quand
   * `footer` est absent, le footer canonique Phase 1 est rendu (rétro-compat).
   */
  footer?: React.ReactNode;
  /** Classe CSS additionnelle sur `.sheet__body` (layouts denses / wizard). */
  bodyClassName?: string;
  /** Corps du formulaire (champs). Rendu dans `.sheet__body`. */
  children: React.ReactNode;
}

/**
 * Coquille réutilisable pour les formulaires bottom-sheet.
 *
 * Note a11y : `useFocusFirstInput` est volontairement laissé au form appelant
 * (la `ref` doit être posée sur SON premier champ — le shell ne connaît pas la
 * structure interne du body). Le contrat impose au form d'appeler
 * `useFocusFirstInput` et de poser la ref sur le premier input.
 */
const QuickActionSheet: React.FC<QuickActionSheetProps> = ({
  isOpen,
  onClose,
  eyebrow,
  title,
  ariaLabel,
  saving,
  isValid,
  onSubmit,
  submitLabel,
  savingLabel = 'Enregistrement…',
  submitAriaLabel,
  submitDisabled = false,
  footer,
  bodyClassName,
  children,
}) => {
  // Escape ferme la sheet sauf pendant une sauvegarde (anti-perte de données).
  useEscapeKey(isOpen && !saving, onClose);

  const handleClose = (): void => {
    if (saving) return;
    onClose();
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={handleClose}
      breakpoints={[0, 1]}
      initialBreakpoint={1}
      className="agritech-bottom-sheet pt-sheet-modal pt-screen"
      aria-label={ariaLabel ?? title}
    >
      <div className="ion-page pt-screen" style={{ position: 'relative', overflow: 'auto' }}>
        <form
          className="sheet"
          onSubmit={onSubmit}
          noValidate
          aria-label={ariaLabel ?? title}
          style={{ position: 'relative', height: '100%', maxHeight: '100%' }}
        >
          <span className="sheet__handle" />
          <header className="sheet__head">
            <div>
              <div className="eyebrow">{eyebrow}</div>
              <h2 className="sheet__title">{title}</h2>
            </div>
            <button
              type="button"
              className="sheet__close"
              onClick={handleClose}
              aria-label="Fermer"
              disabled={saving}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </header>
          <div className={bodyClassName ? `sheet__body ${bodyClassName}` : 'sheet__body'}>{children}</div>
          {footer !== undefined ? (
            <footer className="sheet__foot">{footer}</footer>
          ) : (
            <footer className="sheet__foot">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleClose}
                disabled={saving}
                aria-label="Annuler et fermer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn--primary btn--lg btn--block"
                disabled={!isValid || saving || submitDisabled}
                aria-busy={saving}
                aria-label={submitAriaLabel ?? submitLabel}
              >
                {saving ? savingLabel : (
                  <>
                    <Check size={14} aria-hidden="true" /> {submitLabel}
                  </>
                )}
              </button>
            </footer>
          )}
        </form>
      </div>
    </IonModal>
  );
};

export default QuickActionSheet;
