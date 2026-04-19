import React, { useState } from 'react';
import { IonSpinner, IonToast, IonSelect, IonSelectOption } from '@ionic/react';
import { Stethoscope, Send } from 'lucide-react';
import { appendRow } from '../../services/googleSheets';

/**
 * QuickHealthForm — Saisie rapide d'une intervention santé (Agritech Dark)
 *
 * Rendu inline dans une card ou dans un <BottomSheet>.
 */
interface QuickHealthFormProps {
  subjectType: 'BANDE' | 'TRUIE' | 'PORTEE' | 'VERRAT';
  subjectId: string;
  onSuccess?: () => void;
}

const NATURE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Traitement', label: 'Soin / Vétérinaire' },
  { value: 'Vaccin', label: 'Vaccin' },
  { value: 'Routine', label: 'Routine' },
  { value: 'Urgent', label: 'URGENT' },
];

const QuickHealthForm: React.FC<QuickHealthFormProps> = ({
  subjectType,
  subjectId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({
    show: false,
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    type: 'Traitement',
    soin: '',
    obs: '',
  });

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!formData.soin.trim()) nextErrors.soin = 'Soin requis';
    if (!formData.type.trim()) nextErrors.type = 'Nature requise';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

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
        localStorage.getItem('user_name') || 'Anonyme',
      ];

      const res = await appendRow('JOURNAL_SANTE', values);
      if (res.success) {
        setFormData({ type: 'Traitement', soin: '', obs: '' });
        setToast({ show: true, message: 'Soin enregistré avec succès' });
        if (onSuccess) onSuccess();
      } else {
        setToast({ show: true, message: 'Erreur: ' + res.message });
      }
    } catch {
      setToast({ show: true, message: 'Erreur réseau' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-dense !p-5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-red">
          <Stethoscope size={18} aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-wide text-text-1">
            Saisie rapide santé
          </h3>
          <p className="font-mono text-[10px] uppercase tracking-wide text-text-2 mt-0.5">
            Urgent & routine
          </p>
        </div>
      </div>

      {/* ── Form ────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Nature (select dark) */}
          <div className="space-y-1.5">
            <label
              htmlFor="health-type"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Nature
            </label>
            <div
              className={[
                'rounded-md border overflow-hidden',
                'bg-bg-0 transition-colors duration-[160ms]',
                errors.type ? 'border-red' : 'border-border focus-within:border-accent',
              ].join(' ')}
            >
              <IonSelect
                id="health-type"
                aria-label="Nature de l'intervention"
                className="agritech-select"
                style={
                  {
                    '--background': 'var(--color-bg-0)',
                    '--color': 'var(--color-text-0)',
                    '--placeholder-color': 'var(--color-text-2)',
                    '--placeholder-opacity': 1,
                    '--padding-start': '12px',
                    '--padding-end': '12px',
                    '--padding-top': '8px',
                    '--padding-bottom': '8px',
                    fontFamily: 'var(--font-mono-jb)',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    minHeight: '36px',
                  } as React.CSSProperties
                }
                value={formData.type}
                onIonChange={e => setFormData({ ...formData, type: e.detail.value })}
                interface="popover"
              >
                {NATURE_OPTIONS.map(opt => (
                  <IonSelectOption key={opt.value} value={opt.value}>
                    {opt.label}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </div>
            {errors.type && (
              <p role="alert" className="font-mono text-[11px] text-red mt-1">
                {errors.type}
              </p>
            )}
          </div>

          {/* Soin / Molécule */}
          <div className="space-y-1.5">
            <label
              htmlFor="health-soin"
              className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
            >
              Soin / molécule
            </label>
            <input
              id="health-soin"
              aria-label="Soin ou molécule administrée"
              aria-invalid={!!errors.soin}
              aria-describedby={errors.soin ? 'health-soin-error' : undefined}
              className={[
                'w-full h-9 rounded-md px-3',
                'bg-bg-0 border text-text-0 placeholder:text-text-2',
                'font-mono text-[12px] uppercase tracking-wide',
                'outline-none transition-colors duration-[160ms]',
                'focus:border-accent focus:ring-1 focus:ring-accent',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-1px]',
                errors.soin ? 'border-red' : 'border-border hover:border-text-2',
              ].join(' ')}
              placeholder="Ex: Paracef"
              value={formData.soin}
              onChange={e => setFormData({ ...formData, soin: e.target.value })}
              disabled={loading}
            />
            {errors.soin && (
              <p
                id="health-soin-error"
                role="alert"
                className="font-mono text-[11px] text-red mt-1"
              >
                {errors.soin}
              </p>
            )}
          </div>
        </div>

        {/* Observation */}
        <div className="space-y-1.5">
          <label
            htmlFor="health-obs"
            className="block font-mono text-[11px] uppercase tracking-wide text-text-2"
          >
            Observation
          </label>
          <textarea
            id="health-obs"
            aria-label="Observation du traitement"
            className={[
              'w-full rounded-md px-3 py-3',
              'bg-bg-0 border text-text-0 placeholder:text-text-2',
              'font-mono text-[12px]',
              'outline-none transition-colors duration-[160ms]',
              'focus:border-accent focus:ring-1 focus:ring-accent',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-1px]',
              'min-h-[96px] resize-y',
              'border-border hover:border-text-2',
            ].join(' ')}
            placeholder="Détails du traitement…"
            value={formData.obs}
            onChange={e => setFormData({ ...formData, obs: e.target.value })}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !formData.soin.trim()}
          aria-label="Valider l'intervention"
          className={[
            'pressable w-full h-[48px] rounded-md',
            'inline-flex items-center justify-center gap-2',
            'bg-red text-text-0 font-mono text-[12px] font-bold uppercase tracking-wide',
            'transition-colors duration-[160ms]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-red focus-visible:outline-offset-2',
            (loading || !formData.soin.trim())
              ? 'opacity-40 cursor-not-allowed'
              : 'hover:brightness-110',
          ].join(' ')}
        >
          {loading ? (
            <IonSpinner name="bubbles" className="w-5 h-5" aria-hidden="true" />
          ) : (
            <>
              <span>Valider intervention</span>
              <Send size={14} className="flex-shrink-0" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <IonToast
        isOpen={toast.show}
        message={toast.message}
        duration={3000}
        onDidDismiss={() => setToast({ show: false, message: '' })}
        position="bottom"
      />
    </div>
  );
};

export default QuickHealthForm;
