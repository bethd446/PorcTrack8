// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DataTable, DataTableColumn } from '../DataTable';

interface Row { name: string; value: number }
const COLS: DataTableColumn<Row>[] = [
  { key: 'name', label: 'Nom', sortable: true },
  { key: 'value', label: 'Valeur', sortable: true, align: 'right' },
];

describe('DataTable V70 — mode avancé', () => {
  afterEach(() => cleanup());

  it('rend headers + rows', () => {
    render(<DataTable data={[{ name: 'A', value: 1 }, { name: 'B', value: 2 }]} columns={COLS} />);
    expect(screen.getByText('Nom')).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByText('B')).toBeTruthy();
  });

  it('affiche emptyLabel si data vide', () => {
    render(<DataTable data={[]} columns={COLS} emptyLabel="Vide" />);
    expect(screen.getByText('Vide')).toBeTruthy();
  });

  it('tri ascendant au clic sur header sortable', () => {
    render(<DataTable data={[{ name: 'B', value: 2 }, { name: 'A', value: 1 }]} columns={COLS} />);
    fireEvent.click(screen.getByText('Nom'));
    const cells = screen.getAllByRole('cell');
    expect(cells[0].textContent).toBe('A');
  });
});
