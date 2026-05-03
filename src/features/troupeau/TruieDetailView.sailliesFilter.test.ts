/**
 * Test régression — V32 PHASE 4
 * ════════════════════════════════════════════════════════════════════════════
 * BUG-PERSISTANT : TruieDetailView affichait "Aucune saillie enregistrée"
 * alors que les saillies existaient en BD.
 *
 * Cause : `saillie.truieId` est mappé sur `sows.code_id` (displayId, ex "T18")
 * côté supabaseService, mais le filtre comparait contre `truie.id` (UUID).
 * Le filtre échouait silencieusement.
 *
 * Fix : étendre le filtre pour accepter UUID **OU** displayId. Idem pour
 * portées (`bande.truie === truie.displayId`).
 */
import { describe, expect, it } from 'vitest';

interface MiniTruie {
  id: string;
  displayId?: string;
  boucle?: string;
}
interface MiniSaillie {
  truieId: string;
  dateSaillie: string;
}
interface MiniBande {
  id: string;
  truie?: string;
  boucleMere?: string;
  dateMB?: string;
}

/** Miroir exact de la logique post-fix dans TruieDetailView. */
function filterSailliesForTruie(
  saillies: MiniSaillie[],
  truie: MiniTruie,
): MiniSaillie[] {
  return saillies.filter(
    (s) =>
      s.truieId === truie.id ||
      (!!truie.displayId && s.truieId === truie.displayId),
  );
}

function filterPorteesForTruie(
  bandes: MiniBande[],
  truie: MiniTruie,
): MiniBande[] {
  return bandes.filter(
    (b) =>
      b.truie === truie.id ||
      (!!truie.displayId && b.truie === truie.displayId) ||
      (!!truie.boucle && b.boucleMere === truie.boucle),
  );
}

describe('[V32-FIX] TruieDetailView — lecture saillies/portées', () => {
  it('saillies : filtre matche le displayId quand truie.id est un UUID', () => {
    const truie: MiniTruie = {
      id: 'a3f1c8e0-1234-4abc-8def-9876543210ab',
      displayId: 'T18',
      boucle: 'FR-018',
    };
    const saillies: MiniSaillie[] = [
      { truieId: 'T18', dateSaillie: '2026-01-15' }, // BD réelle : code_id
      { truieId: 'T07', dateSaillie: '2026-02-01' }, // autre truie
    ];
    const out = filterSailliesForTruie(saillies, truie);
    expect(out).toHaveLength(1);
    expect(out[0].truieId).toBe('T18');
  });

  it('saillies : compatibilité legacy — match aussi sur l’UUID si fourni', () => {
    const truie: MiniTruie = {
      id: 'T14',
      displayId: 'T14',
    };
    const saillies: MiniSaillie[] = [
      { truieId: 'T14', dateSaillie: '2026-01-15' },
    ];
    const out = filterSailliesForTruie(saillies, truie);
    expect(out).toHaveLength(1);
  });

  it('saillies : aucune correspondance si id, displayId et truieId divergent tous', () => {
    const truie: MiniTruie = {
      id: 'uuid-A',
      displayId: 'T14',
    };
    const saillies: MiniSaillie[] = [
      { truieId: 'T07', dateSaillie: '2026-01-15' },
    ];
    expect(filterSailliesForTruie(saillies, truie)).toHaveLength(0);
  });

  it('portées : matche bande.truie sur le displayId quand truie.id est un UUID', () => {
    const truie: MiniTruie = {
      id: 'uuid-truie-X',
      displayId: 'T18',
      boucle: 'FR-018-42',
    };
    const bandes: MiniBande[] = [
      { id: 'b1', truie: 'T18', dateMB: '2026-01-10' },
      { id: 'b2', truie: 'T07', dateMB: '2026-02-01' },
    ];
    const out = filterPorteesForTruie(bandes, truie);
    expect(out.map((b) => b.id)).toEqual(['b1']);
  });

  it('portées : fallback boucleMere si bande.truie ne matche pas', () => {
    const truie: MiniTruie = {
      id: 'uuid-A',
      displayId: 'T18',
      boucle: 'FR-018-42',
    };
    const bandes: MiniBande[] = [
      { id: 'b1', boucleMere: 'FR-018-42', dateMB: '2026-01-10' },
    ];
    expect(filterPorteesForTruie(bandes, truie)).toHaveLength(1);
  });

  it("régression V32 — bug initial : saillie « T18 » liée à une truie UUID était filtrée à tort", () => {
    // Avant fix : le filtre comparait `s.truieId === truie.id`, donc une
    // saillie {truieId: 'T18'} contre une truie {id: 'UUID', displayId: 'T18'}
    // ne matchait pas → "Aucune saillie enregistrée" affiché à tort.
    const truie: MiniTruie = {
      id: '11111111-2222-3333-4444-555555555555',
      displayId: 'T18',
    };
    const saillies: MiniSaillie[] = [
      { truieId: 'T18', dateSaillie: '2026-04-01' },
      { truieId: 'T18', dateSaillie: '2026-02-15' },
    ];
    const out = filterSailliesForTruie(saillies, truie);
    expect(out).toHaveLength(2);
  });
});
