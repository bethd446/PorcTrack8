import React, { useState } from 'react';
import { IonSpinner, IonToast, IonSelect, IonSelectOption } from '@ionic/react';
import { Stethoscope, Send } from 'lucide-react';
import { appendRow } from '../../services/googleSheets';

interface QuickHealthFormProps {
  subjectType: 'BANDE' | 'TRUIE' | 'PORTEE' | 'VERRAT';
  subjectId: string;
  onSuccess?: () => void;
}

const QuickHealthForm: React.FC<QuickHealthFormProps> = ({ subjectType, subjectId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{show: boolean, message: string}>({show: false, message: ''});
  const [formData, setFormData] = useState({
    type: 'Traitement',
    soin: '',
    obs: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.soin.trim()) return;

    setLoading(true);
    try {
      // Structure JOURNAL_SANTE: DATE, SUJET_TYPE, SUJET_ID, TYPE, SOIN, OBSERVATION, AUTEUR
      const values = [
        new Date().toISOString(),
        subjectType,
        subjectId,
        formData.type,
        formData.soin.trim(),
        formData.obs.trim(),
        localStorage.getItem('user_name') || 'Anonyme'
      ];

      const res = await appendRow('JOURNAL_SANTE', values);
      if (res.success) {
        setFormData({ type: 'Traitement', soin: '', obs: '' });
        setToast({ show: true, message: 'Soin enregistré avec succès' });
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
    <div className="premium-card p-6 bg-white border-gray-100 shadow-sm transition-transform duration-[160ms] focus-within:shadow-xl focus-within:shadow-red-900/5 focus-within:border-red-100">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Stethoscope size={20} className="text-red-700" />
        </div>
        <div>
            <h3 className="ft-heading text-[11px] font-bold uppercase text-red-900">Saisie Rapide Santé</h3>
            <p className="ft-heading text-[11px] font-bold text-red-400 uppercase">Urgent & Routine</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
             <div className="space-y-2">
                <label className="ft-code text-[11px] font-bold text-gray-400 uppercase px-1">Nature</label>
                <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden focus-within:border-red-200">
                    <IonSelect
                        className="premium-select text-xs font-bold uppercase h-10 px-2"
                        value={formData.type}
                        onIonChange={e => setFormData({...formData, type: e.detail.value})}
                        interface="popover"
                    >
                        <IonSelectOption value="Traitement">Soin / Veto</IonSelectOption>
                        <IonSelectOption value="Vaccin">Vaccin</IonSelectOption>
                        <IonSelectOption value="Routine">Routine</IonSelectOption>
                        <IonSelectOption value="Urgent">URGENT</IonSelectOption>
                    </IonSelect>
                </div>
             </div>
             <div className="space-y-2">
                <label className="ft-code text-[11px] font-bold text-gray-400 uppercase px-1">Soin / Molécule</label>
                <input
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold uppercase text-gray-800 outline-none focus:bg-white focus:border-red-400"
                    placeholder="Ex: Paracef"
                    value={formData.soin}
                    onChange={e => setFormData({...formData, soin: e.target.value})}
                    disabled={loading}
                />
             </div>
        </div>

        <div className="space-y-2">
          <label className="ft-code text-[11px] font-bold text-gray-400 uppercase px-1">Observation</label>
          <textarea
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-xs font-medium text-gray-800 outline-none focus:bg-white focus:border-red-400 transition-colors min-h-[80px] placeholder-gray-300"
            placeholder="Détails du traitement..."
            value={formData.obs}
            onChange={(e) => setFormData({...formData, obs: e.target.value})}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !formData.soin.trim()}
          className={`w-full py-4 rounded-xl font-bold uppercase text-[11px] flex items-center justify-center gap-3 transition-[transform,colors] ${
            loading || !formData.soin.trim()
              ? 'bg-gray-100 text-gray-400 opacity-50'
              : 'bg-red-500 text-white shadow-lg shadow-red-500/15 active:scale-95 hover:bg-red-700'
          }`}
        >
          {loading ? (
            <IonSpinner name="bubbles" className="w-5 h-5 text-white" />
          ) : (
            <>
              <span>Valider Intervention</span>
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

export default QuickHealthForm;
