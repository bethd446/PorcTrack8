import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NotebookPen, CalendarDays } from 'lucide-react';

export default function NotesHub() {
  const navigate = useNavigate();

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Notes</h2>
      <p className="text-sm opacity-80">
        Choisis le type de note 7 Quotidien (terrain) ou Point hebdo (vendredi).
      </p>

      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={() => navigate('/notes/daily')}
          className="w-full rounded-xl border bg-white p-4 flex items-center gap-3 hover:bg-gray-50"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center">
            <NotebookPen className="w-6 h-6" />
          </div>
          <div className="text-left">
            <div className="font-bold">Note quotidienne</div>
            <div className="text-xs opacity-70">Observations du jour + actions (Romaric)</div>
          </div>
        </button>

        <button
          onClick={() => navigate('/notes/weekly')}
          className="w-full rounded-xl border bg-white p-4 flex items-center gap-3 hover:bg-gray-50"
        >
          <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div className="text-left">
            <div className="font-bold">Point hebdo (vendredi)</div>
            <div className="text-xs opacity-70">Bilan semaine + plan semaine prochaine</div>
          </div>
        </button>
      </div>
    </div>
  );
}
