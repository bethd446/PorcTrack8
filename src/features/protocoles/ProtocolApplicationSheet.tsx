/**
 * V77 — ProtocolApplicationSheet (IonModal bottom-sheet).
 *
 * Mockup référence : protocole-application.html.
 * 4 étapes : sélection bande → posologie calculée → date+opérateur → photo.
 * Submit affiche un toast (pas de service réel pour V77).
 *
 * V77.1 — Branchement données réelles :
 *  - Bandes : `useFarm().bandes`, filtrées (actives, vivants > 0)
 *  - Opérateur : `useAuth().profile.full_name`
 *  - Posologie : recalculée avec `vivants` réels par bande
 *  - Empty state si aucune bande active disponible
 */
import React, { useEffect, useMemo, useState } from 'react';
import { IonModal } from '@ionic/react';
import { Calendar, ChevronDown, Camera, Save } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useFarm } from '../../context/FarmContext';
import { useAuth } from '../../context/AuthContext';
import { safeDate } from '../../lib/truieHelpers';
import type { BandePorcelets } from '../../types/farm';
import type { ProtocolDetail } from './protocolsData';

interface BandeChip {
  id: string;
  code: string;
  porcelets: number;
  ageDays: number | null;
}

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function diffDays(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Sélectionne les bandes "actives" pour l'application d'un protocole :
 * statut différent de RECAP et au moins 1 porcelet vivant. Triées par
 * âge croissant (les plus jeunes d'abord — porcelets prioritaires pour
 * la plupart des protocoles).
 */
function toBandeChips(bandes: BandePorcelets[]): BandeChip[] {
  const now = new Date();
  return bandes
    .filter((b) => b.statut !== 'RECAP' && (b.vivants ?? 0) > 0)
    .map<BandeChip>((b) => {
      const mb = safeDate(b.dateMB);
      const ageDays = mb ? diffDays(mb, now) : null;
      return {
        id: b.id,
        code: b.idPortee || b.id,
        porcelets: b.vivants ?? 0,
        ageDays,
      };
    })
    .sort((a, b) => {
      if (a.ageDays == null && b.ageDays == null) return 0;
      if (a.ageDays == null) return 1;
      if (b.ageDays == null) return -1;
      return a.ageDays - b.ageDays;
    });
}

export interface ProtocolApplicationSheetProps {
  isOpen: boolean;
  protocol: ProtocolDetail;
  onDismiss: () => void;
}

export const ProtocolApplicationSheet: React.FC<ProtocolApplicationSheetProps> = ({
  isOpen,
  protocol,
  onDismiss,
}) => {
  const { showToast } = useToast();
  const { bandes } = useFarm();
  const { profile } = useAuth();
  const [lotIdx, setLotIdx] = useState(0);
  const [date, setDate] = useState<string>(todayISO());

  const chips = useMemo(() => toBandeChips(bandes), [bandes]);
  const operatorName = profile?.full_name?.trim() || 'Opérateur';

  // Réinitialise l'index si la liste change (ex: bande supprimée) ou si le
  // sheet est fermé puis ré-ouvert avec un protocole différent.
  useEffect(() => {
    if (lotIdx >= chips.length) setLotIdx(0);
  }, [chips.length, lotIdx]);

  const lot = chips[lotIdx];

  // Posologie calculée : prend la 1ère ligne de posology pour extraire la dose
  // numérique, puis multiplie par le nombre de porcelets de la bande
  // sélectionnée.
  const calc = useMemo(() => {
    if (!lot) return null;
    const first = protocol.posology[0];
    if (!first) return null;
    const match = first.dose.match(/([0-9]+(?:[.,][0-9]+)?)\s*(\w+)/);
    if (!match) return null;
    const unit = match[2];
    const dosePerHead = parseFloat(match[1].replace(',', '.'));
    const total = dosePerHead * lot.porcelets;
    const totalStr = Number.isInteger(total) ? `${total}` : total.toFixed(1);
    const dosePerHeadStr = Number.isInteger(dosePerHead)
      ? `${dosePerHead}`
      : dosePerHead.toFixed(1);
    return {
      label: `${lot.porcelets} porcelets × ${dosePerHeadStr} ${unit} = ${totalStr} ${unit}`,
      hint:
        unit.toLowerCase() === 'ml'
          ? `Prévoir 1 flacon de ${total <= 50 ? '50' : '100'} mL`
          : 'Adapter la quantité au format flacon disponible',
    };
  }, [protocol, lot]);

  const handleSubmit = (): void => {
    showToast(
      'Application enregistrée — visible dans le journal santé',
      'success',
      2400,
    );
    onDismiss();
  };

  const empty = chips.length === 0;

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onDismiss}
      breakpoints={[0, 1]}
      initialBreakpoint={1}
      className="pt-screen"
      aria-label="Appliquer le protocole"
    >
      <div className="pt-screen sheet">
        <div className="sheet__handle" />
        <h2 className="sheet__title">Appliquer le protocole</h2>
        <div className="sheet__sub">{protocol.title}</div>

        {empty ? (
          <div className="calc-card" role="status" aria-live="polite">
            <div className="calc-card__big">Aucune bande disponible</div>
            <div className="calc-card__hint">
              Créez une bande pour appliquer ce protocole.
            </div>
          </div>
        ) : (
          <>
            <div className="step-pill">Étape 1 / 4</div>
            <div className="label--v77">Choisir le lot</div>
            <div className="radio-chips--cards" role="radiogroup" aria-label="Lot">
              {chips.map((l, idx) => (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={lotIdx === idx}
                  className={`radio-chip--card${lotIdx === idx ? ' is-selected' : ''}`}
                  onClick={() => setLotIdx(idx)}
                >
                  <div className="radio-chip__code">{l.code}</div>
                  <div className="radio-chip__sub">
                    {l.porcelets} porcelets
                    {l.ageDays != null ? ` · ${l.ageDays}j` : ''}
                  </div>
                </button>
              ))}
            </div>

            <div className="step-pill">Étape 2 / 4</div>
            <div className="label--v77">Posologie calculée</div>
            <div className="calc-card">
              <div className="calc-card__big">
                {calc?.label ?? `${lot?.porcelets ?? 0} porcelets`}
              </div>
              <div className="calc-card__hint">
                {calc?.hint ?? 'Adapter la quantité au format flacon disponible'}
              </div>
            </div>

            <div className="step-pill">Étape 3 / 4</div>
            <div className="label--v77">Date et opérateur</div>
            <label className="field--row">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="Date d’application"
              />
              <span className="field__icon" aria-hidden>
                <Calendar size={18} strokeWidth={2} aria-hidden />
              </span>
            </label>
            <button type="button" className="field--row">
              <span>{operatorName}</span>
              <span className="field__icon" aria-hidden>
                <ChevronDown size={18} strokeWidth={2} aria-hidden />
              </span>
            </button>

            <div className="step-pill">Étape 4 / 4</div>
            <div className="label--v77">Photo (facultative)</div>
            <div className="camera-row">
              <button
                type="button"
                className="camera-placeholder"
                aria-label="Ajouter une photo"
              >
                <Camera size={26} strokeWidth={2} aria-hidden />
              </button>
              <div className="camera-label">Ajouter une photo</div>
            </div>

            <button
              type="button"
              className="btn--primary"
              onClick={handleSubmit}
            >
              <Save size={18} strokeWidth={2} aria-hidden />
              Enregistrer l’application
            </button>
          </>
        )}
      </div>
    </IonModal>
  );
};
