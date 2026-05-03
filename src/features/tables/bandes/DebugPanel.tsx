import React, { useState } from 'react';
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { isDebugEnabled } from '../../../config';
import type { DebugMeta } from './types';

interface DebugPanelProps {
  meta: DebugMeta | null | undefined;
  header: string[];
  rowsCount: number;
  error: string | null;
  bandeKey: string;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ meta, header, rowsCount, error, bandeKey }) => {
  const [open, setOpen] = useState(false);
  if (!isDebugEnabled()) return null;
  return (
    <div className="mx-4 mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="pressable w-full flex items-center justify-between bg-bg-1 text-accent border border-border px-3 py-2 rounded-md text-[11px] uppercase tracking-wide transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bug size={14} />
          <span>Debug Panel</span>
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="bg-bg-1 border border-t-0 border-border text-text-0 p-3 rounded-b-md font-mono text-[11px] space-y-1 overflow-x-auto">
          <p><span className="text-accent">SHEET:</span> {meta?.sheetName || 'N/A'}</p>
          <p><span className="text-accent">ID_HEADER:</span> {meta?.idHeader || 'N/A'}</p>
          <p><span className="text-accent">PORTEE_KEY:</span> {bandeKey || 'N/A'}</p>
          <p><span className="text-accent">ROWS:</span> {rowsCount}</p>
          <p><span className="text-accent">HEADER:</span> {header.join(', ')}</p>
          {error && <p className="text-red font-semibold"><span className="text-accent">ERROR:</span> {error}</p>}
        </div>
      )}
    </div>
  );
};

export default DebugPanel;
