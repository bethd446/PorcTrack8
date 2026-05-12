/**
 * formatAnimalIdentity — v3.4.5
 *
 * Décision produit 2026-05-12 : la **boucle physique** (oreille) prime sur le
 * code interne `displayId` (T-XXX / V-XXX) dans l'affichage utilisateur, car
 * c'est ce que l'éleveur LIT sur l'animal au quotidien. Le `displayId` reste
 * disponible en sub-text technique pour la traçabilité système.
 *
 * Fallback chain : boucle → displayId → id (raccourci 8 caractères).
 */

type AnimalLike = {
  displayId?: string;
  boucle?: string | null;
  id: string;
};

/**
 * Renvoie l'identifiant principal à afficher pour un animal.
 *
 * Variants :
 *  - `'primary'`   (défaut) : boucle si dispo, sinon displayId, sinon id
 *  - `'compact'`            : identique à primary (alias sémantique)
 *  - `'with-tech'`          : "boucle · displayId" si les 2 dispo, sinon primary
 */
export function formatAnimalIdentity(
  animal: AnimalLike | null | undefined,
  variant: 'primary' | 'compact' | 'with-tech' = 'primary',
): string {
  if (!animal) return '—';
  const boucle = (animal.boucle ?? '').trim();
  const tech = (animal.displayId ?? '').trim();

  if (variant === 'with-tech' && boucle && tech) return `${boucle} · ${tech}`;
  if (boucle) return boucle;
  if (tech) return tech;
  return animal.id ? animal.id.slice(0, 8) : '—';
}

/**
 * Sub-text à afficher sous l'identité principale (le displayId en mono).
 *
 * Logique : on ne montre le sub que si on a À LA FOIS une boucle ET un
 * displayId. Si on a juste l'un des deux, `formatAnimalIdentity` affiche déjà
 * l'info — pas de duplication.
 */
export function formatAnimalSubId(
  animal: AnimalLike | null | undefined,
): string | null {
  if (!animal) return null;
  const boucle = (animal.boucle ?? '').trim();
  const tech = (animal.displayId ?? '').trim();
  return boucle && tech ? tech : null;
}
