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

  it('idPortee technique B-YYYYMMDD-X-NN reformaté en Mois AAAA · suffix', () => {
    expect(
      formatBandeName({
        id: '21af315c-aaaa-bbbb-cccc-000000000000',
        idPortee: 'B-20260503-M-02',
      }),
    ).toBe('Bande Mai 2026 · M-02');
  });

  it('idPortee technique B-YYYYMMDD-MB-NN reformaté', () => {
    expect(
      formatBandeName({
        id: '21af315c-aaaa-bbbb-cccc-000000000000',
        idPortee: 'B-20260412-MB-01',
      }),
    ).toBe('Bande Avril 2026 · MB-01');
  });

  it('idPortee technique avec truie connue : truie prioritaire sur suffix', () => {
    expect(
      formatBandeName({
        id: '21af315c-aaaa-bbbb-cccc-000000000000',
        idPortee: 'B-20260503-M-02',
        truieMere: 'T-031',
      }),
    ).toBe('Bande Mai 2026 · T-031');
  });

  it('idPortee technique avec compact : suffix masqué, mois seul', () => {
    expect(
      formatBandeName(
        {
          id: '21af315c-aaaa-bbbb-cccc-000000000000',
          idPortee: 'B-20260503-M-02',
          truieMere: 'T-031',
        },
        { compact: true },
      ),
    ).toBe('Bande Mai 2026 · M-02');
  });

  it('idPortee humain B-AUDIT-MB (seed) reste tel quel — pas de match technique', () => {
    expect(
      formatBandeName({
        id: '21af315c-aaaa-bbbb-cccc-000000000000',
        idPortee: 'B-AUDIT-MB',
      }),
    ).toBe('Bande B-AUDIT-MB');
  });

  it('idPortee humain 26-T16-01 reste tel quel — pas de pattern B-', () => {
    expect(
      formatBandeName({
        id: '21af315c-aaaa-bbbb-cccc-000000000000',
        idPortee: '26-T16-01',
      }),
    ).toBe('Bande 26-T16-01');
  });
});
