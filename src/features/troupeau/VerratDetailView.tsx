/**
 * VerratDetailView — /troupeau/verrats/:id
 * ══════════════════════════════════════════════════════════════════════════
 * Fiche détail d'un verrat — inspirée de `TruieDetailView`.
 *
 * Structure :
 *   1. Hero card       : VerratIcon + displayId + chip statut
 *   2. IDENTITÉ        : Boucle / Nom / Origine / Alimentation / Ration kg/j
 *   3. SAILLIES        : total + dernière + 5 dernières
 *   4. HISTORIQUE SOINS: DataRow list (type · traitement · date · obs)
 *   5. Grille actions  : Saillir · Soigner · Note · Pesée
 */

import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IonContent, IonPage, IonToast } from '@ionic/react';
import {
  Syringe, Scale, Heart, FileText, AlertCircle, Edit3,
} from 'lucide-react';

import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { VerratIcon } from '../../components/icons';
import { Chip, SectionDivider, BottomSheet, type ChipTone } from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import QuickHealthForm from '../../components/forms/QuickHealthForm';
import QuickNoteForm from '../../components/forms/QuickNoteForm';
import QuickPeseeForm from '../../components/forms/QuickPeseeForm';
import QuickSaillieForm from '../../components/forms/QuickSaillieForm';
import QuickEditVerratForm from '../../components/forms/QuickEditVerratForm';
import type { Verrat, TraitementSante, Saillie, Truie } from '../../types/farm';

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
  const s = (statut || '').toLowerCase();
  if (/réform|reform/.test(s)) return 'red';
  if (/mort/.test(s)) return 'red';
  return 'accent';
}

function toneFromSoin(type: string): ChipTone {
  const t = type.toLowerCase();
  if (/vacc|ppa|ppr/i.test(t)) return 'accent';
  if (/vermif|ivermec|antipara/i.test(t)) return 'amber';
  if (/pes|poids/i.test(t)) return 'blue';
  if (/traitement|soin/i.test(t)) return 'coral';
  return 'default';
}

/** Tri décroissant sur date (les plus récentes en tête). */
function sortByDateDesc<T extends { dateSaillie?: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const da = parseDate(a.dateSaillie)?.getTime() ?? 0;
    const db = parseDate(b.dateSaillie)?.getTime() ?? 0;
    return db - da;
  });
}

// ─── Composant ──────────────────────────────────────────────────────────────

type QuickSheet = null | 'soin' | 'pesee' | 'saillie' | 'note';

const VerratDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { verrats, truies, saillies, getHealthForAnimal } = useFarm();
  const [sheet, setSheet] = useState<QuickSheet>(null);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<string>('');

  const decodedId = id ? decodeURIComponent(id) : '';

  const verrat = useMemo<Verrat | undefined>(
    () => verrats.find((v) => v.id === decodedId || v.displayId === decodedId),
    [verrats, decodedId],
  );

  const soins = useMemo<TraitementSante[]>(
    () => (verrat ? getHealthForAnimal(verrat.id, 'VERRAT') : []),
    [verrat, getHealthForAnimal],
  );

  const saillesVerrat = useMemo<Saillie[]>(
    () => (verrat ? sortByDateDesc(saillies.filter((s) => s.verratId === verrat.id)) : []),
    [verrat, saillies],
  );

  if (!verrat) {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
          <AgritechLayout>
            <AgritechHeader
              title="VERRAT INTROUVABLE"
              subtitle={`ID "${decodedId}"`}
              backTo="/troupeau/verrats"
            />
            <div
              role="main"
              aria-label="Verrat introuvable"
              className="px-4 pt-6 flex flex-col items-center gap-3"
            >
              <AlertCircle size={40} className="text-coral" aria-hidden="true" />
              <p className="font-mono text-[12px] text-text-2 text-center max-w-xs">
                Ce verrat n'existe pas (ou plus) dans ta feuille VERRATS.
              </p>
            </div>
          </AgritechLayout>
        </IonContent>
      </IonPage>
    );
  }

  const tone = statutTone(verrat.statut);
  const displayId = verrat.displayId || verrat.id;
  const title = verrat.nom ? `${displayId} · ${verrat.nom}` : displayId;

  // Dernière saillie : nom truie si dispo via snapshot ou lookup
  const lastSaillie = saillesVerrat[0];
  const truieName = (s: Saillie): string => {
    if (s.truieNom) return s.truieNom;
    const t: Truie | undefined = truies.find((x) => x.id === s.truieId);
    return t?.nom || t?.displayId || s.truieId;
  };

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
            title="VERRAT"
            subtitle={displayId}
            backTo="/troupeau/verrats"
          />

          <div
            role="main"
            aria-label={`Détail verrat ${displayId}`}
            className="px-4 pt-4 pb-32 flex flex-col gap-5"
          >
            {/* ── Hero ───────────────────────────────────────────────── */}
            <div className="card-dense flex items-center gap-3.5 !p-4">
              <div className="w-14 h-14 rounded-2xl-v2 bg-bg-1 border border-border flex items-center justify-center shrink-0 text-accent">
                <VerratIcon size={32} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="ft-heading text-[22px] text-text-0 leading-none truncate">
                  {title}
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap items-center">
                  <Chip label={verrat.statut || '—'} tone={tone} size="xs" />
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    aria-label={`Éditer le verrat ${displayId}`}
                    className="pressable inline-flex items-center justify-center w-7 h-7 rounded-md bg-bg-1 border border-border text-text-1 hover:text-accent hover:border-accent transition-colors duration-[160ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    <Edit3 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Identité ───────────────────────────────────────────── */}
            <section aria-label="Identité">
              <SectionDivider label="Identité" />
              <div className="card-dense !p-0 overflow-hidden mt-3">
                <DetailRow label="Boucle" value={verrat.boucle || '—'} mono />
                <DetailRow label="Nom" value={verrat.nom || '—'} />
                <DetailRow label="Origine" value={verrat.origine || '—'} />
                <DetailRow label="Alimentation" value={verrat.alimentation || '—'} />
                <DetailRow
                  label="Ration/j"
                  value={verrat.ration > 0 ? `${verrat.ration} kg` : '—'}
                  mono
                />
              </div>
            </section>

            {/* ── Saillies ───────────────────────────────────────────── */}
            <section aria-label="Saillies">
              <SectionDivider label={`Saillies · ${saillesVerrat.length}`} />
              {saillesVerrat.length === 0 ? (
                <div className="card-dense text-center py-6 mt-3">
                  <p className="font-mono text-[11px] text-text-2">
                    Aucune saillie enregistrée pour ce verrat.
                  </p>
                </div>
              ) : (
                <>
                  <div className="card-dense !p-0 overflow-hidden mt-3">
                    <DetailRow
                      label="Total saillies"
                      value={String(saillesVerrat.length).padStart(2, '0')}
                      mono
                    />
                    {lastSaillie ? (
                      <DetailRow
                        label="Dernière saillie"
                        value={`${formatDate(lastSaillie.dateSaillie)} · ${truieName(lastSaillie)}`}
                        mono
                      />
                    ) : null}
                  </div>
                  <ul className="card-dense !p-0 overflow-hidden mt-3">
                    {saillesVerrat.slice(0, 5).map((s, idx) => (
                      <li
                        key={`${s.truieId}-${s.dateSaillie}-${idx}`}
                        className="flex items-start gap-3 px-3 py-3 border-b border-border last:border-b-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-bg-1 border border-border flex items-center justify-center shrink-0 mt-0.5 text-accent">
                          <Heart size={15} aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-text-0 truncate">
                            {truieName(s)}
                            {s.statut ? ` · ${s.statut}` : ''}
                          </div>
                          <div className="font-mono text-[11px] text-text-2 mt-0.5 truncate">
                            {formatDate(s.dateSaillie)}
                            {s.dateMBPrevue ? ` · MB ${formatDate(s.dateMBPrevue)}` : ''}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            {/* ── Historique soins ───────────────────────────────────── */}
            <section aria-label="Historique soins">
              <SectionDivider label={`Historique soins · ${soins.length}`} />
              {soins.length === 0 ? (
                <div className="card-dense text-center py-6 mt-3">
                  <p className="font-mono text-[11px] text-text-2">
                    Aucun soin enregistré pour ce verrat.
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
                  icon={<Heart size={16} aria-hidden="true" />}
                  label="Saillir"
                  onClick={() => setSheet('saillie')}
                />
                <ActionButton
                  icon={<Syringe size={16} aria-hidden="true" />}
                  label="Soigner"
                  onClick={() => setSheet('soin')}
                />
                <ActionButton
                  icon={<FileText size={16} aria-hidden="true" />}
                  label="Note"
                  onClick={() => setSheet('note')}
                />
                <ActionButton
                  icon={<Scale size={16} aria-hidden="true" />}
                  label="Pesée"
                  onClick={() => setSheet('pesee')}
                />
              </div>
            </section>
          </div>
        </AgritechLayout>
      </IonContent>

      {/* ── Sheets ──────────────────────────────────────────────────── */}
      <QuickEditVerratForm
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        verrat={verrat}
        onSuccess={() => setToast('Verrat mis à jour')}
      />

      <QuickSaillieForm
        isOpen={sheet === 'saillie'}
        onClose={closeSheet}
      />

      <BottomSheet
        isOpen={sheet === 'soin'}
        onClose={closeSheet}
        title={`Soin · ${displayId}`}
        height="full"
      >
        <QuickHealthForm
          subjectType="VERRAT"
          subjectId={verrat.id}
          onSuccess={() => success('Soin enregistré')}
        />
      </BottomSheet>

      <QuickPeseeForm
        isOpen={sheet === 'pesee'}
        onClose={closeSheet}
      />

      <BottomSheet
        isOpen={sheet === 'note'}
        onClose={closeSheet}
        title={`Note · ${displayId}`}
      >
        <QuickNoteForm
          subjectType="VERRAT"
          subjectId={verrat.id}
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

export default VerratDetailView;
