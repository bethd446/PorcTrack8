/**
 * SowHero — alias rétro-compat de `AnimalHero`.
 *
 * Le composant a été renommé `AnimalHero` pour être utilisé par toutes les
 * fiches détail (truies, verrats, etc.). Ce module reste exporté tel quel
 * pour ne pas casser les imports existants ni les tests.
 */
import AnimalHero, {
  type AnimalHeroProps,
  type AnimalHeroChip,
} from './AnimalHero';

export type SowHeroChip = AnimalHeroChip;
export type SowHeroProps = AnimalHeroProps;

export default AnimalHero;
