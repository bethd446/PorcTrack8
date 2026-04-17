import React, { useState } from 'react';
import { IonSpinner, IonToast } from '@ionic/react';
import { Send, ClipboardList } from 'lucide-react';
import { appendRow } from '../../services/googleSheets';

interface QuickNoteFormProps {
  subjectType: 'BANDE' | 'TRUIE' | 'PORTEE' | 'VERRAT';
  subjectId: string;
  onSuccess?: () => void;
}

const QuickNoteForm: React.FC<QuickNoteFormProps> = ({ subjectType, subjectId, onSuccess }) => {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{show: boolean, message: string}>({show: false, message: ''});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    setLoading(true);
    try {
      // Structure NOTES_TERRAIN: DATE, SUBJECT_TYPE, SUBJECT_ID, NOTE, AUTHOR
      const values = [
        new Date().toISOString(),
        subjectType,
        subjectId,
        note.trim(),
        localStorage.getItem('user_name') || 'Anonyme'
      ];

      const res = await appendRow('NOTES_TERRAIN', values);
      if (res.success) {
        setNote('');
        setToast({ show: true, message: 'Note enregistrée avec succès' });
        if (onSuccess) onSuccess();
      } else {
        setToast({ show: true, message: 'Erreur: ' + res.message });
      }
    } catch (err) {
      setToast({ show: true, message: 'Erreur réseau' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="premium-card p-6 bg-white border-gray-100 shadow-sm transition-transform duration-[160ms] focus-within:shadow-xl focus-within:shadow-accent-900/5 focus-within:border-accent-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-accent-50 flex items-center justify-center">
            <ClipboardList size={18} className="text-accent-700" />
        </div>
        <h3 className="ft-heading text-[11px] font-bold uppercase text-accent-900">Saisie Rapide Note</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            className="w-full bg-gray-50 border border-gray-100 rounded-[20px] px-5 py-4 text-sm font-medium text-gray-800 outline-none focus:bg-white focus:border-accent-400 transition-colors min-h-[100px] placeholder-gray-400"
            placeholder="Écrivez votre observation ici..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !note.trim()}
          className={`w-full py-4 rounded-xl font-bold uppercase text-[11px] flex items-center justify-center gap-3 transition-[transform,colors] ${
            loading || !note.trim()
              ? 'bg-gray-100 text-gray-400 opacity-50'
              : 'bg-accent-600 text-white shadow-lg shadow-accent-600/15 active:scale-95 pressable'
          }`}
        >
          {loading ? (
            <IonSpinner name="bubbles" className="w-5 h-5" />
          ) : (
            <>
              <span>Enregistrer Note</span>
              <Send size={14} className="flex-shrink-0" />
            </>
          )}
        </button>
      </form>

      <IonToast
        isOpen={toast.show}
        message={toast.message}
        duration={3000}
        onDidDismiss={() => setToast({show: false, message: ''})}
        position="bottom"
        className="premium-toast"
      />
    </div>
  );
};

export default QuickNoteForm;
