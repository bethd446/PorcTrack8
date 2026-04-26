/**
 * biologyValidators — Intelligence de validation de terrain
 */
export const biologyValidators = {
  /**
   * Vérifie la plausibilité du poids par rapport à l'âge (courbe K13)
   *
   * Formule :
   * - Maternité (<= 28j) : 1.5kg + 250g/j
   * - Post-sevrage (> 28j) : 25kg + 650g/j
   */
  validatePoidsPlausible(poidsSaisiKg: number, ageJours: number): { isValid: boolean; message?: string } {
    if (ageJours < 0) return { isValid: false, message: "L'âge ne peut pas être négatif." };

    let poidsTheorique: number;

    // 1. Calcul du poids théorique selon la phase
    if (ageJours <= 28) {
      // Phase Maternité : gain de ~250g/j
      poidsTheorique = 1.5 + (ageJours * 0.25);
    } else {
      // Phase Post-Sevrage & Engraissement : départ 25kg (sevrage J28) + gain ~650g/j
      poidsTheorique = 25 + ((ageJours - 28) * 0.65);
    }

    // 2. Application de la marge de tolérance (30%)
    const tolerance = 0.30;
    const minPlausible = poidsTheorique * (1 - tolerance);
    const maxPlausible = poidsTheorique * (1 + tolerance);

    if (poidsSaisiKg < minPlausible || poidsSaisiKg > maxPlausible) {
      return {
        isValid: false,
        message: `Poids (${poidsSaisiKg}kg) biologiquement improbable pour un âge de ${ageJours} jours. Le poids attendu est situé entre ${minPlausible.toFixed(1)}kg et ${maxPlausible.toFixed(1)}kg.`
      };
    }

    return { isValid: true };
  }
};
