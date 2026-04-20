/**
 * TruieDetailView — /troupeau/truies/:id
 * ══════════════════════════════════════════════════════════════════════════
 * Refonte Claude Design v2 (2026-04-20) — mockup 05-truie-detail.
 *
 * Structure :
 *   1. Hero card : icône TruieIcon + TRUIE [id] + chips [statut · J±n]
 *   2. IDENTITÉ : Race / Naissance / Entrée élev / Lot / Poids
 *   3. REPRODUCTION : Parité / Saillie / Gestation / Mise-bas / Porcelets attendus
 *   4. HISTORIQUE SOINS : DataRow list (type soin + date + dose)
 *   5. Grille actions 2×2 : Soin · Pesée · Saillie · Note (bientôt)
 */

import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IonContent, IonPage, IonToast } from '@ionic/react';
import {
  Syringe, Scale, Heart, FileText, AlertCircle, Edit3,
} from 'lucide-react';

import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { TruieIcon } from '../../components/icons';
import { Chip, SectionDivider, BottomSheet, type ChipTone } from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import QuickEditTruieForm from '../../components/forms/QuickEditTruieForm';
import QuickHealthForm from '../../components/forms/QuickHealthForm';
import QuickNoteForm from '../../components/forms/QuickNoteForm';
import QuickPeseeForm from '../../components/forms/QuickPeseeForm';
import QuickSaillieForm from '../../components/forms/QuickSaillieForm';
import type { Truie, TraitementSante } from '../../types/farm';
import { normaliseStatut } from '../../lib/truieStatut';

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

function formatDate(s?: string): string {
  const d = parseDate(s);
  if (!d) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function statutTone(statut: string | undefined): ChipTone {
  switch (normaliseStatut(statut)) {
    case 'PLEINE':       return 'accent';
    case 'MATERNITE':    return 'gold';
    case 'CHALEUR':      return 'coral';
    case 'REFORME':      return 'red';
    case 'SURVEILLANCE': return 'amber';
    case 'FLUSHING':     return 'amber';
    case 'VIDE':
    case 'INCONNU':
    default:             return 'default';
  }
}

function jourLabel(t: Truie, today: Date): string | null {
  const mb = parseDate(t.dateMBPrevue);
  if (!mb) return null;
  const diffMs = mb.getTime() - today.getTime();
  const days = Math.round(diffMs / 86_400_000);
  if (days === 0) return 'MB aujourd\'hui';
  if (days > 0) return `MB J-${days}`;
  return `MB J+${-days}`;
}

function toneFromSoin(type: string): ChipTone {
  const t = type.toLowerCase();
  if (/vacc|ppa|ppr/i.test(t)) return 'accent';
  if (/vermif|ivermec|antipara/i.test(t)) return 'amber';
  if (/pes|poids/i.test(t)) return 'blue';
  if (/traitement|soin/i.test(t)) return 'coral';
  return 'default';
}

// ─── Composant ──────────────────────────────────────────────────────────────

type QuickSheet = null | 'edit' | 'soin' | 'pesee' | 'saillie' | 'note';

const TruieDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { truies, getHealthForAnimal } = useFarm();
  const [sheet, setSheet] = useState<QuickSheet>(null);
  const [toast, setToast] = useState<string>('');

  const decodedId = id ? decodeURIComponent(id) : '';
  const today = useMemo(() => new Date(), []);

  const truie = useMemo(
    () => truies.find((t) => t.id === decodedId || t.displayId === decodedId),
    [truies, decodedId],
  );

  const soins = useMemo<TraitementSante[]>(
    () => (truie ? getHealthForAnimal(truie.id, 'TRUIE') : []),
    [truie, getHealthForAnimal],
  );

  if (!truie) {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
          <AgritechLayout>
            <AgritechHeader
              title="TRUIE INTROUVABLE"
              subtitle={`ID "${decodedId}"`}
              backTo="/troupeau"
            />
            <div className="px-4 pt-6 flex flex-col items-center gap-3">
              <AlertCircle size={40} className="text-coral" aria-hidden="true" />
              <p className="font-mono text-[12px] text-text-2 text-center max-w-xs">
                Cette truie n'existe pas (ou plus) dans ta feuille TRUIES.
              </p>
            </div>
          </AgritechLayout>
        </IonContent>
      </IonPage>
    );
  }

  const jour = jourLabel(truie, today);
  const tone = statutTone(truie.statut);
  const displayId = truie.displayId || truie.id;

  // Gestation : jours depuis dateMBPrevue - 115
  const gestJours = (() => {
    const mb = parseDate(truie.dateMBPrevue);
    if (!mb) return null;
    const sailDate = new Date(mb.getTime() - 115 * 86_400_000);
    const diff = Math.round((today.getTime() - sailDate.getTime()) / 86_400_000);
    return diff >= 0 ? `${diff} jours` : null;
  })();

  const closeSheet = () => setSheet(null);
  const success = (msg: string) => {
    setToast(msg);
    closeSheet();
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="TRUIE"
            subtitle={displayId}
            backTo="/troupeau"
          />

          <div className="px-4 pt-4 pb-32 flex flex-col gap-5">
            {/* ── Hero ───────────────────────────────────────────────── */}
            <div className="card-dense flex items-center gap-3.5 !p-4">
              <div className="w-14 h-14 rounded-2xl-v2 bg-bg-1 border border-border flex items-center justify-center shrink-0 text-gold">
                <TruieIcon size={32} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="ft-heading text-[22px] text-text-0 leading-none">
                  {displayId}
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <Chip label={truie.statut || '—'} tone={tone} size="xs" />
                  {jour ? <Chip label={jour} tone="default" size="xs" /> : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSheet('edit')}
                aria-label={`Éditer la truie ${displayId}`}
                className="pressable inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-bg-1 border border-border text-text-1 hover:border-accent hover:text-accent transition-colors duration-[160ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <Edit3 size={16} aria-hidden="true" />
              </button>
            </div>

            {/* ── Identité ───────────────────────────────────────────── */}
            <section aria-label="Identité">
              <SectionDivider label="Identité" />
              <div className="card-dense !p-0 overflow-hidden mt-3">
                <DetailRow label="Boucle" value={truie.boucle || '—'} mono />
                <DetailRow label="Nom" value={truie.nom || '—'} />
                <DetailRow label="Stade" value={truie.stade || '—'} />
                <DetailRow
                  label="Ration/j"
                  value={truie.ration > 0 ? `${truie.ration} kg` : '—'}
                  mono
                />
              </div>
            </section>

            {/* ── Reproduction ───────────────────────────────────────── */}
            <section aria-label="Reproduction">
              <SectionDivider label="Reproduction" />
              <div className="card-dense !p-0 overflow-hidden mt-3">
                <DetailRow
                  label="Parité"
                  value={
                    typeof truie.nbPortees === 'number'
                      ? `${String(truie.nbPortees).padStart(2, '0')} portée${truie.nbPortees > 1 ? 's' : ''}`
                      : '—'
                  }
                  mono
                />
                <DetailRow
                  label="Gestation"
                  value={gestJours ?? '—'}
                  mono
                />
                <DetailRow
                  label="Mise-bas prévue"
                  value={formatDate(truie.dateMBPrevue)}
                  mono
                  accent={truie.dateMBPrevue ? 'var(--gold)' : undefined}
                />
                <DetailRow
                  label="Dernière portée (NV)"
                  value={
                    typeof truie.derniereNV === 'number'
                      ? String(truie.derniereNV).padStart(2, '0')
                      : '—'
                  }
                  mono
                />
              </div>
            </section>

            {/* ── Historique soins ───────────────────────────────────── */}
            <section aria-label="Historique soins">
              <SectionDivider
                label={`Historique soins · ${soins.length}`}
              />
              {soins.length === 0 ? (
                <div className="card-dense text-center py-6 mt-3">
                  <p className="font-mono text-[11px] text-text-2">
                    Aucun soin enregistré pour cette truie.
                  </p>
                </div>
              ) : (
                <ul className="card-dense !p-0 overflow-hidden mt-3">
                  {soins.slice(0, 10).map((s) => {
                    const soinTone = toneFromSoin(s.typeSoin);
                    return (
                      <li
                        key={s.id}
                        className="flex items-start gap-3 px-3 py-3 border-b border-border last:border-b-0"
                      >
                        <div
                          className="w-8 h-8 rounded-lg bg-bg-1 border border-border flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            color: soinTone === 'accent'
                              ? 'var(--accent)'
                              : soinTone === 'amber'
                                ? 'var(--amber)'
                                : soinTone === 'blue'
                                  ? 'var(--blue)'
                                  : 'var(--text-1)',
                          }}
                        >
                          {soinTone === 'blue' ? (
                            <Scale size={15} aria-hidden="true" />
                          ) : (
                            <Syringe size={15} aria-hidden="true" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-text-0 truncate">
                            {s.typeSoin}
                            {s.traitement ? ` · ${s.traitement}` : ''}
                          </div>
                          <div className="font-mono text-[11px] text-text-2 mt-0.5 truncate">
                            {formatDate(s.date)}
                            {s.observation ? ` · ${s.observation}` : ''}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* ── Actions 2×2 ────────────────────────────────────────── */}
            <section aria-label="Actions">
              <div className="grid grid-cols-2 gap-2.5">
                <ActionButton
                  icon={<Syringe size={16} aria-hidden="true" />}
                  label="Soin"
                  onClick={() => setSheet('soin')}
                />
                <ActionButton
                  icon={<Scale size={16} aria-hidden="true" />}
                  label="Pesée"
                  onClick={() => setSheet('pesee')}
                />
                <ActionButton
                  icon={<Heart size={16} aria-hidden="true" />}
                  label="Saillie"
                  onClick={() => setSheet('saillie')}
                />
                <ActionButton
                  icon={<FileText size={16} aria-hidden="true" />}
                  label="Note"
                  onClick={() => setSheet('note')}
                />
              </div>
            </section>
          </div>
        </AgritechLayout>
      </IonContent>

      {/* ── Sheets ──────────────────────────────────────────────────── */}
      <QuickEditTruieForm
        isOpen={sheet === 'edit'}
        onClose={closeSheet}
        truie={truie}
        onSuccess={() => success('Truie mise à jour')}
      />

      <BottomSheet
        isOpen={sheet === 'soin'}
        onClose={closeSheet}
        title={`Soin · ${displayId}`}
        height="full"
      >
        <QuickHealthForm
          subjectType="TRUIE"
          subjectId={truie.id}
          onSuccess={() => success('Soin enregistré')}
        />
      </BottomSheet>

      <QuickPeseeForm
        isOpen={sheet === 'pesee'}
        onClose={closeSheet}
      />

      <QuickSaillieForm
        isOpen={sheet === 'saillie'}
        onClose={closeSheet}
      />

      <BottomSheet
        isOpen={sheet === 'note'}
        onClose={closeSheet}
        title={`Note · ${displayId}`}
      >
        <QuickNoteForm
          subjectType="TRUIE"
          subjectId={truie.id}
          onSuccess={() => success('Note enregistrée')}
        />
      </BottomSheet>

      <IonToast
        isOpen={toast !== ''}
        message={toast}
        duration={1800}
        onDidDismiss={() => setToast('')}
        position="bottom"
      />
    </IonPage>
  );
};

// ─── Sous-composants ─────────────────────────────────────────────────────────

interface DetailRowProps {
  label: string;
  value: string;
  mono?: boolean;
  accent?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, mono, accent }) => (
  <div className="flex items-center justify-between px-3.5 py-3 border-b border-border last:border-b-0">
    <span className="text-[13px] text-text-1">{label}</span>
    <span
      className={`${mono ? 'font-mono tabular-nums' : ''} text-[13px] font-medium`}
      style={{ color: accent || 'var(--text-0)' }}
    >
      {value}
    </span>
  </div>
);

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="pressable card-dense flex flex-col items-center gap-2 !py-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
    aria-label={label}
  >
    <span className="inline-flex w-8 h-8 rounded-lg bg-bg-1 border border-border items-center justify-center text-accent">
      {icon}
    </span>
    <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-text-1">
      {label}
    </span>
  </button>
);

export default TruieDetailView;
