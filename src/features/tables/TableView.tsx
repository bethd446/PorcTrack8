/**
 * TableView — Agritech Dark Cockpit
 * ══════════════════════════════════════════════════════════════════
 * Vue générique de tables Sheets (JOURNAL_SANTE, STOCK_ALIMENTS,
 * STOCK_VETO, SUIVI_TRUIES_REPRODUCTION, VERRATS, NOTES_TERRAIN…).
 *
 *   · AgritechLayout + AgritechHeader (wrapper dark cockpit)
 *   · Search dense intégrée dans le slot children du header
 *   · Rows en `.card-dense` avec border-left accent, data mono
 *   · Empty state contextuel (icône par tableKey)
 *   · Loading skeleton dark
 *   · BottomSheet dark pour TableRowEdit (édition inline)
 *
 * Conservations strictes :
 *   · Navigation cheptel (TRUIE/VERRAT → detail view)
 *   · Duplicate key fix : `key={tableKey}-${rowIndex}-${row.id}`
 *   · IonRefresher pull-to-refresh
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonPage, IonContent,
  IonRefresher, IonRefresherContent,
} from '@ionic/react';
import {
  AlertCircle, Search, ChevronRight,
  Box, Package, Stethoscope, NotebookPen, Heart, Zap, Layers,
} from 'lucide-react';
import { readTableByKey } from '../../services/googleSheets';
import TableRowEdit from './TableRowEdit';
import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { BottomSheet, Chip } from '../../components/agritech';
import type { ChipTone } from '../../components/agritech';

interface TableViewProps {
  tableKey: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Table metadata — titles, subtitles, icons, empty states
// ─────────────────────────────────────────────────────────────────────────────

interface TableDescriptor {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  emptyLabel: string;
}

const TABLE_DESCRIPTORS: Record<string, TableDescriptor> = {
  JOURNAL_SANTE: {
    title: 'Journal Santé',
    subtitle: 'Suivi sanitaire · soins',
    icon: Stethoscope,
    emptyLabel: 'Aucun soin enregistré',
  },
  STOCK_ALIMENTS: {
    title: 'Stock Aliments',
    subtitle: 'Aliments · rations',
    icon: Package,
    emptyLabel: 'Stock aliments vide',
  },
  STOCK_VETO: {
    title: 'Stock Véto',
    subtitle: 'Médicaments · DLC',
    icon: Box,
    emptyLabel: 'Stock véto vide',
  },
  SUIVI_TRUIES_REPRODUCTION: {
    title: 'Truies',
    subtitle: 'Registre reproducteurs',
    icon: Heart,
    emptyLabel: 'Aucune truie enregistrée',
  },
  VERRATS: {
    title: 'Verrats',
    subtitle: 'Registre verrats',
    icon: Zap,
    emptyLabel: 'Aucun verrat enregistré',
  },
  PORCELETS_BANDES_DETAIL: {
    title: 'Bandes',
    subtitle: 'Lots post-sevrage',
    icon: Layers,
    emptyLabel: 'Aucune bande active',
  },
  NOTES_TERRAIN: {
    title: 'Notes Terrain',
    subtitle: 'Journal de bord',
    icon: NotebookPen,
    emptyLabel: 'Aucune note terrain',
  },
};

const DEFAULT_DESCRIPTOR: TableDescriptor = {
  title: 'Données',
  subtitle: 'Table Sheets',
  icon: Box,
  emptyLabel: 'Aucune donnée',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatDate = (val: unknown): string => {
  if (val === null || val === undefined || val === '—' || val === '') return '';
  const s = String(val);
  if (s.match(/^\d{4}-\d{2}-\d{2}T/)) {
    try { return new Date(s).toLocaleDateString('fr-FR'); } catch { return s; }
  }
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }
  return s;
};

/** Deduce a chip tone from a status string (last column). */
const statusToTone = (val: string): ChipTone => {
  const v = val.toLowerCase();
  if (v.includes('ok') || v.includes('terminé') || v.includes('oui') || v.includes('validé')) return 'accent';
  if (v.includes('attente') || v.includes('en cours') || v.includes('bas')) return 'amber';
  if (v.includes('urgent') || v.includes('non') || v.includes('rupture') || v.includes('critique')) return 'red';
  return 'default';
};

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton — dark agritech
// ─────────────────────────────────────────────────────────────────────────────

const LoadingSkeleton: React.FC = () => (
  <div className="flex flex-col gap-2" aria-label="Chargement en cours" role="status">
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className="card-dense animate-pulse"
        style={{
          padding: '14px',
          borderLeft: '2px solid transparent',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 w-14 rounded bg-bg-2" />
          <div className="h-4 w-20 rounded bg-bg-2" />
          <div className="ml-auto h-3 w-12 rounded bg-bg-2" />
        </div>
        <div className="h-4 w-2/3 rounded bg-bg-2 mb-2" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-3 w-full rounded bg-bg-2" />
          <div className="h-3 w-full rounded bg-bg-2" />
        </div>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Row renderer — dense card with border-left accent on hover
// ─────────────────────────────────────────────────────────────────────────────

interface TableDenseRowProps {
  idValue: string;
  statusValue: string;
  statusTone: ChipTone;
  columns: Array<{ label: string; value: string; isDate: boolean }>;
  onClick: () => void;
  ariaLabel: string;
}

const TableDenseRow: React.FC<TableDenseRowProps> = ({
  idValue,
  statusValue,
  statusTone,
  columns,
  onClick,
  ariaLabel,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={[
        'w-full text-left',
        'card-dense',
        'pressable',
        'flex flex-col gap-2',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
      ].join(' ')}
      style={{
        borderLeft: '2px solid var(--color-border)',
        padding: '12px 14px',
      }}
    >
      {/* Top line: ID (mono) + status chip */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[13px] font-semibold tracking-wide text-text-0 tabular-nums truncate">
          {idValue || '—'}
        </span>
        {statusValue && (
          <span className="ml-auto">
            <Chip label={statusValue} tone={statusTone} size="xs" />
          </span>
        )}
        <ChevronRight
          size={14}
          className={statusValue ? 'shrink-0 text-text-2' : 'ml-auto shrink-0 text-text-2'}
          aria-hidden="true"
        />
      </div>

      {/* Data grid — columns */}
      {columns.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {columns.map((col, i) => (
            <div key={`${col.label}-${i}`} className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-wide text-text-2 truncate">
                {col.label}
              </div>
              <div className="font-mono text-[12px] text-text-1 tabular-nums truncate">
                {col.isDate ? formatDate(col.value) : col.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface TableMeta {
  sheetName: string;
  idHeader: string;
}

const TableView: React.FC<TableViewProps> = ({ tableKey }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [header, setHeader] = useState<string[]>([]);
  const [rows, setRows] = useState<unknown[][]>([]);
  const [meta, setMeta] = useState<TableMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedRow, setSelectedRow] = useState<unknown[] | null>(null);

  const descriptor = TABLE_DESCRIPTORS[tableKey] ?? {
    ...DEFAULT_DESCRIPTOR,
    title: tableKey.replace(/_/g, ' '),
  };
  const EmptyIcon = descriptor.icon;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await readTableByKey(tableKey);
      if (result.success) {
        setHeader(result.header);
        setRows(result.rows);
        setMeta(result.meta);
      } else {
        setError(result.message || 'Impossible de charger les données');
      }
    } catch {
      setError('Erreur réseau ou configuration');
    } finally {
      setLoading(false);
    }
  }, [tableKey]);

  useEffect(() => {
    // Legitimate I/O: async fetch of table data by key
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const filteredRows = useMemo(() => {
    if (!searchText.trim()) return rows;
    const q = searchText.toLowerCase();
    return rows.filter(row =>
      row.some(cell => String(cell ?? '').toLowerCase().includes(q))
    );
  }, [rows, searchText]);

  const idIndex = meta ? header.indexOf(meta.idHeader) : -1;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout withNav={false}>
          <AgritechHeader title={descriptor.title.toUpperCase()} subtitle={descriptor.subtitle}>
            {/* Dark search bar inside header slot */}
            <div
              className={[
                'flex items-center gap-2 px-3 py-2 rounded-md',
                'bg-bg-1 border border-border',
                'focus-within:border-accent transition-colors duration-[160ms]',
              ].join(' ')}
            >
              <Search size={16} className="shrink-0 text-text-2" aria-hidden="true" />
              <input
                type="search"
                className="w-full bg-transparent border-none outline-none text-text-0 placeholder:text-text-2 font-mono text-[13px]"
                placeholder="Filtrer les données…"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                aria-label={`Rechercher dans ${descriptor.title}`}
              />
            </div>
          </AgritechHeader>

          <IonRefresher
            slot="fixed"
            onIonRefresh={(e) => {
              loadData().then(() => e.detail.complete());
            }}
          >
            <IonRefresherContent />
          </IonRefresher>

          <div className="px-4 pt-4 pb-8 flex flex-col gap-3">
            {loading ? (
              <LoadingSkeleton />
            ) : error ? (
              <div
                className="card-dense flex flex-col items-center justify-center gap-3 py-12 text-center"
                role="alert"
              >
                <AlertCircle size={36} className="text-red-400" aria-hidden="true" />
                <p
                  className="text-[14px] font-bold uppercase tracking-wide text-text-0"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Erreur de flux
                </p>
                <p className="font-mono text-[11px] uppercase tracking-wide text-text-2 max-w-xs">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={loadData}
                  className={[
                    'pressable mt-2 inline-flex items-center justify-center',
                    'px-4 py-2 rounded-md',
                    'bg-accent text-bg-0 font-mono text-[12px] font-semibold uppercase tracking-wide',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                  ].join(' ')}
                >
                  Réessayer
                </button>
              </div>
            ) : filteredRows.length === 0 ? (
              <div
                className="card-dense flex flex-col items-center justify-center gap-3 py-16 text-center"
                role="status"
              >
                <EmptyIcon size={40} className="text-text-2" aria-hidden="true" />
                <p
                  className="text-[14px] font-bold uppercase tracking-wide text-text-0"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {searchText.trim() ? 'Aucun résultat' : descriptor.emptyLabel}
                </p>
                {searchText.trim() && (
                  <p className="font-mono text-[11px] text-text-2">
                    Aucune ligne ne correspond à « {searchText} ».
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* Count strip */}
                <div className="flex items-center gap-3 py-1" aria-hidden="false">
                  <span className="h-px w-4 bg-accent" aria-hidden="true" />
                  <span className="kpi-label shrink-0">
                    {filteredRows.length} {filteredRows.length > 1 ? 'entrées' : 'entrée'}
                  </span>
                  <span className="h-px flex-1 bg-border" aria-hidden="true" />
                </div>

                {/* Rows list */}
                <ul
                  className="flex flex-col gap-2"
                  aria-label={`Liste ${descriptor.title}`}
                >
                  {filteredRows.map((row, rowIndex) => {
                    const idValue = idIndex >= 0 ? String(row[idIndex] ?? '') : '';
                    const statusRaw = row.length > 0 ? String(row[row.length - 1] ?? '') : '';
                    const statusTone = statusToTone(statusRaw);

                    // Build columns (skip ID and status, first 4 meaningful fields)
                    const columns = header
                      .map((col, i) => ({
                        label: col,
                        value: String(row[i] ?? ''),
                        isDate: col.toLowerCase().includes('date'),
                        colIndex: i,
                      }))
                      .filter(c =>
                        c.label !== meta?.idHeader &&
                        c.colIndex !== row.length - 1 &&
                        c.value !== '' &&
                        c.value !== '—'
                      )
                      .slice(0, 4)
                      .map(c => ({ label: c.label, value: c.value, isDate: c.isDate }));

                    return (
                      <li
                        key={`${tableKey}-${rowIndex}-${idIndex >= 0 ? row[idIndex] ?? 'x' : 'x'}`}
                      >
                        <TableDenseRow
                          idValue={idValue}
                          statusValue={statusRaw}
                          statusTone={statusTone}
                          columns={columns}
                          ariaLabel={`Ouvrir ${idValue || 'ligne'}`}
                          onClick={() => {
                            if (tableKey === 'SUIVI_TRUIES_REPRODUCTION') {
                              navigate(`/cheptel/truie/${row[idIndex]}`);
                            } else if (tableKey === 'VERRATS') {
                              navigate(`/cheptel/verrat/${row[idIndex]}`);
                            } else {
                              setSelectedRow(row);
                            }
                          }}
                        />
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </AgritechLayout>

        <BottomSheet
          isOpen={!!selectedRow}
          onClose={() => setSelectedRow(null)}
          height="full"
        >
          {selectedRow && meta && (
            <TableRowEdit
              meta={meta}
              header={header}
              rowData={selectedRow as unknown[]}
              onClose={() => setSelectedRow(null)}
              onSaved={() => loadData()}
            />
          )}
        </BottomSheet>
      </IonContent>
    </IonPage>
  );
};

export default TableView;
