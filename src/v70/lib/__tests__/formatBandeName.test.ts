import { describe, it, expect } from 'vitest';
import { formatBandeName } from '../formatBandeName';

describe('formatBandeName', () => {
  it('format avec MB connue + truie mère', () => {
    expect(
      formatBandeName({
        id: '21af315c-aaaa-bbbb-cccc-000000000000',
        dateMB: '2026-05-03',
        truieMere: 'T-031',
      }),
    ).toBe('Bande Mai 2026 · T-031');
  });

  it('format avec MB connue, sans mère', () => {
    expect(
      formatBandeName({
        id: '21af315c-aaaa-bbbb-cccc-000000000000',
        dateMB: '2026-04-12',
      }),
    ).toBe('Bande Avril 2026');
  });

  it('format avec idPortee custom non-UUID — priorité absolue', () => {
    expect(
      formatBandeName({
        id: '21af315c-aaaa-bbbb-cccc-000000000000',
        idPortee: 'B-MAR-01',
        dateMB: '2026-05-03',
        truieMere: 'T-031',
      }),
    ).toBe('Bande B-MAR-01');
  });

  it('format sans MB ni idPortee, avec mère seule', () => {
    expect(
      formatBandeName({
        id: '21af315c-aaaa-bbbb-cccc-000000000000',
        truieMere: 'T-031',
      }),
    ).toBe('Bande T-031 · en cours');
  });

  it('fallback rare : aucune donnée exploitable', () => {
    expect(
      formatBandeName({ id: '21af315c-aaaa-bbbb-cccc-000000000000' }),
    ).toBe('Bande 21af315c');
  });

  it('option compact omet la truie mère', () => {
    expect(
      formatBandeName(
        {
          id: '21af315c-aaaa-bbbb-cccc-000000000000',
          dateMB: '2026-05-03',
          truieMere: 'T-031',
        },
        { compact: true },
      ),
    ).toBe('Bande Mai 2026');
  });
});
