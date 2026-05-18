import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Button } from '@/design-system';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  searchColumn?: string;
  emptyMessage?: string;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = 'Rechercher...',
  searchColumn,
  emptyMessage = 'Aucun résultat.',
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnFilters, columnVisibility },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {searchColumn && (
        <input
          placeholder={searchPlaceholder}
          value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ''}
          onChange={(e) => table.getColumn(searchColumn)?.setFilterValue(e.target.value)}
          style={{
            maxWidth: 320,
            padding: '8px 12px',
            borderRadius: 'var(--radius-pill, 9999px)',
            border: '1px solid var(--line)',
            background: 'var(--bg-surface-2)',
            fontSize: 13,
            fontFamily: 'var(--font-body)',
            color: 'var(--ink)',
            outline: 'none',
          }}
        />
      )}
      <div style={{ borderRadius: 'var(--radius-card, 12px)', border: '1px solid var(--line)', background: 'var(--bg-surface)', overflow: 'hidden' }}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  style={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {table.getPageCount() > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <span>Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="small" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} style={btnStyle}>Précédent</Button>
            <Button variant="secondary" size="small" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} style={btnStyle}>Suivant</Button>
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 'var(--radius-pill, 9999px)',
  background: 'var(--bg-surface-2)',
  border: '1px solid var(--line)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--ink-soft)',
  cursor: 'pointer',
};
