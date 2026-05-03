// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DataTable, Tag } from './index';

afterEach(() => cleanup());

type Repro = {
  id: string;
  rank: number;
  name: string;
  type: string;
  score: number;
  litters: number;
  piglets: number;
  success: number;
};

const rows: Repro[] = [
  { id: 'r1', rank: 1, name: 'NEMO', type: 'VERRAT', score: 85, litters: 4, piglets: 48, success: 92 },
  { id: 'r2', rank: 2, name: 'BELLA', type: 'TRUIE', score: 78, litters: 3, piglets: 36, success: 85 },
];

describe('DataTable', () => {
  it('rend les headers en uppercase via le label', () => {
    render(
      <DataTable
        columns={[
          { key: 'rank', label: '#', width: 40 },
          { key: 'name', label: 'NOM' },
          { key: 'type', label: 'TYPE' },
        ]}
        rows={rows}
      />,
    );
    expect(screen.getByText('NOM')).toBeTruthy();
    expect(screen.getByText('TYPE')).toBeTruthy();
  });

  it('appelle render() custom quand fourni', () => {
    render(
      <DataTable
        columns={[
          { key: 'name', label: 'NOM' },
          { key: 'type', label: 'TYPE', render: (row) => <Tag>{row.type}</Tag> },
        ]}
        rows={rows}
      />,
    );
    expect(screen.getByText('VERRAT')).toBeTruthy();
    expect(screen.getByText('TRUIE')).toBeTruthy();
  });

  it('applique format() sur les valeurs brutes', () => {
    render(
      <DataTable
        columns={[
          { key: 'name', label: 'NOM' },
          { key: 'success', label: 'RÉUSSITE', format: (v) => `${v}%` },
        ]}
        rows={rows}
      />,
    );
    expect(screen.getByText('92%')).toBeTruthy();
    expect(screen.getByText('85%')).toBeTruthy();
  });

  it('appelle onRowClick au clic sur une ligne', () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={[
          { key: 'name', label: 'NOM' },
        ]}
        rows={rows}
        onRowClick={onRowClick}
      />,
    );
    fireEvent.click(screen.getByText('NEMO'));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0][0].name).toBe('NEMO');
  });

  it('rend Empty si aucune ligne', () => {
    render(
      <DataTable columns={[{ key: 'name', label: 'NOM' }]} rows={[]} emptyMessage="Aucun reproducteur" />,
    );
    expect(screen.getByText('Aucun reproducteur')).toBeTruthy();
  });

  it('applique width sur th et td quand fourni', () => {
    const { container } = render(
      <DataTable
        columns={[
          { key: 'rank', label: '#', width: 40 },
          { key: 'name', label: 'NOM' },
        ]}
        rows={rows}
      />,
    );
    const th = container.querySelector('th');
    expect(th).toBeTruthy();
    expect((th as HTMLElement).style.width).toBe('40px');
  });
});
