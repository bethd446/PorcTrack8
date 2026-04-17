import React, { useState } from 'react';
import { IonModal } from '@ionic/react';
import { Heart, X, Check } from 'lucide-react';
import { useFarm } from '../../context/FarmContext';
import { enqueueAppendRow } from '../../services/offlineQueue';

/**
 * QuickSaillieForm — Modal rapide pour enregistrer une saillie
 *
 * Le porcher sélectionne la truie et le verrat, confirme, et c'est enregistré.
 * 2 taps au lieu de 5 clics. Accessible depuis le Dashboard "Aujourd'hui".
 */

interface QuickSaillieFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const QuickSaillieForm: React.FC<QuickSaillieFormProps> = ({ isOpen, onClose }) => {
  const { truies, verrats } = useFarm();
  const [selectedTruie, setSelectedTruie] = useState('');
  const [selectedVerrat, setSelectedVerrat] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const truiesDisponibles = truies.filter(t => {
    const s = t.statut?.toUpperCase() || '';
    return s.includes('VIDE') || s.includes('FLUSH') || !s.includes('GEST');
  });

  const handleSave = async () => {
    if (!selectedTruie || !selectedVerrat) return;
    setSaving(true);
    try {
      await enqueueAppendRow('SUIVI_TRUIES_REPRODUCTION', [
        new Date().toISOString(),
        selectedTruie,
        selectedVerrat,
        'SAILLIE',
        new Date().toLocaleDateString('fr-FR'),
        `Saillie enregistrée depuis PorcTrack`,
      ]);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedTruie('');
        setSelectedVerrat('');
        onClose();
      }, 1500);
    } catch (e) {
      console.error('Erreur enregistrement saillie:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedTruie('');
    setSelectedVerrat('');
    setSuccess(false);
    onClose();
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleClose} initialBreakpoint={0.65} breakpoints={[0, 0.65, 0.9]}>
      <div className="bg-white h-full rounded-t-[24px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <Heart size={20} className="text-purple-600" />
            </div>
            <div>
              <h2 className="ft-heading text-[16px]">Enregistrer une saillie</h2>
              <p className="text-[12px] text-gray-500">Sélectionnez la truie et le verrat</p>
            </div>
          </div>
          <button onClick={handleClose} className="pressable w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center active:scale-[0.95] transition-transform duration-[160ms]" aria-label="Fermer">
            <X size={16} className="text-gray-600" />
          </button>
        </div>

        {success ? (
          /* Success state */
          <div className="flex flex-col items-center justify-center py-16 animate-scale-in">
            <div className="w-16 h-16 rounded-xl bg-accent-50 flex items-center justify-center mb-4">
              <Check size={28} className="text-accent-600" />
            </div>
            <p className="ft-heading text-[16px]">Saillie enregistrée</p>
            <p className="text-[13px] text-gray-500 mt-1">{selectedTruie} × {selectedVerrat}</p>
          </div>
        ) : (
          /* Form */
          <div className="px-5 py-5 space-y-5">
            {/* Truie selection */}
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-gray-700">Truie</label>
              <div className="flex gap-2 flex-wrap">
                {truiesDisponibles.length > 0 ? (
                  truiesDisponibles.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTruie(t.displayId)}
                      className={`pressable px-4 py-2.5 rounded-xl text-[13px] font-medium transition-transform duration-[160ms] active:scale-[0.97] ${
                        selectedTruie === t.displayId
                          ? 'bg-accent-600 text-white'
                          : 'bg-gray-50 text-gray-700 border border-gray-100'
                      }`}
                    >
                      {t.displayId}
                    </button>
                  ))
                ) : (
                  <p className="text-[13px] text-gray-500">Aucune truie disponible</p>
                )}
              </div>
            </div>

            {/* Verrat selection */}
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-gray-700">Verrat</label>
              <div className="flex gap-2 flex-wrap">
                {verrats.length > 0 ? (
                  verrats.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVerrat(v.displayId)}
                      className={`pressable px-4 py-2.5 rounded-xl text-[13px] font-medium transition-transform duration-[160ms] active:scale-[0.97] ${
                        selectedVerrat === v.displayId
                          ? 'bg-accent-600 text-white'
                          : 'bg-gray-50 text-gray-700 border border-gray-100'
                      }`}
                    >
                      {v.displayId}
                    </button>
                  ))
                ) : (
                  <p className="text-[13px] text-gray-500">Aucun verrat actif</p>
                )}
              </div>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleSave}
              disabled={!selectedTruie || !selectedVerrat || saving}
              className="pressable w-full h-[52px] rounded-xl bg-accent-600 text-white text-[14px] font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-[160ms] disabled:opacity-40"
              style={{ boxShadow: '0 4px 14px -2px rgba(5,150,105,0.3)' }}
            >
              {saving ? (
                <span className="animate-pulse">Enregistrement...</span>
              ) : (
                <>
                  <Check size={18} />
                  Confirmer la saillie
                </>
              )}
            </button>

            {selectedTruie && selectedVerrat && (
              <p className="text-center text-[12px] text-gray-500">
                {selectedTruie} × {selectedVerrat} · {new Date().toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        )}
      </div>
    </IonModal>
  );
};

export default QuickSaillieForm;
