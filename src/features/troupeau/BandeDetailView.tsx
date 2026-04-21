/**
 * BandeDetailView — /troupeau/bandes/:bandeId
 * ══════════════════════════════════════════════════════════════════════════
 * Refonte Claude Design v1 (2026-04-20) : vue portée détaillée.
 *
 * Structure :
 *   1. Header + back (/troupeau)
 *   2. Hero card : icône Bande + ID portée + truie/verrat + chip phase
 *   3. Mise-bas · Loge · J+X/durée phase
 *   4. 4 KPI grid : Nés · Vivants · Sevrés · Morts
 *   5. Barre taux de survie (vs moy ferme K13 92%, objectif ≥90%)
 *   6. Timeline événements (MB, sevrage, séparation sexe, etc.)
 *   7. CTA "Enregistrer un événement" (placeholder — pas encore de sheet EVENTS)
 */

import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { AlertCircle, Edit3, Skull } from 'lucide-react';

import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { BandeIcon } from '../../components/icons';
import { Chip, SectionDivider, type ChipTone } from '../../components/agritech';
import QuickMortalityForm from '../../components/forms/QuickMortalityForm';
import QuickEditBandeForm from '../../components/forms/QuickEditBandeForm';
import { useFarm } from '../../context/FarmContext';
import { computeBandePhase } from '../../services/bandesAggregator';
import { FARM_CONFIG } from '../../config/farm';
import type { BandePorcelets } from '../../types/farm';

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

function daysBetween(from: Date, to: Date): number {
  const diffMs = to.getTime() - from.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function formatDateShort(s?: string): string {
  const d = parseDate(s);
  if (!d) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

type PhaseMeta = {
  label: string;
  tone: ChipTone;
  duration: number;
  startDate: Date | null;
  varColor: string;
};

function phaseMeta(bande: BandePorcelets, today: Date): PhaseMeta {
  const phase = computeBandePhase(bande, today);
  const mb = parseDate(bande.dateMB);
  const sev = parseDate(bande.dateSevrageReelle || bande.dateSevragePrevue);
  switch (phase) {
    case 'SOUS_MERE':
      return {
        label: 'Maternité',
        tone: 'gold',
        duration: FARM_CONFIG.SEVRAGE_AGE_JOURS ?? 28,
        startDate: mb,
        varColor: 'var(--gold)',
      };
    case 'POST_SEVRAGE':
      return {
        label: 'Post-sevrage',
        tone: 'accent',
        duration: FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS ?? 32,
        startDate: sev,
        varColor: 'var(--accent)',
      };
    case 'ENGRAISSEMENT':
      return {
        label: 'Croissance-finition',
        tone: 'amber',
        duration: 120,
        startDate: sev,
        varColor: 'var(--amber)',
      };
    default:
      return {
        label: '—',
        tone: 'default',
        duration: 0,
        startDate: null,
        varColor: 'var(--text-2)',
      };
  }
}

// ─── Timeline events ────────────────────────────────────────────────────────

type TimelineEvent = {
  key: string;
  date: string; // dd/MM/yyyy ou '—'
  type: string; // label uppercase
  varTone: string;
  title: string;
  note: string;
  pending: boolean;
};

function buildEvents(bande: BandePorcelets, today: Date): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // MB
  if (bande.dateMB) {
    const nv = bande.nv ?? 0;
    const vivants = bande.vivants ?? 0;
    const morts = bande.morts ?? Math.max(0, nv - vivants);
    events.push({
      key: 'mb',
      date: formatDateShort(bande.dateMB),
      type: 'Mise-bas',
      varTone: 'var(--gold)',
      title: `${nv} nés · ${vivants} vivants · ${morts} mort${morts > 1 ? 's' : ''}`,
      note: morts > 0 ? 'Suivi post-partum recommandé' : 'MB complète',
      pending: false,
    });
  }

  // Sevrage (prévu si futur, réel si passé)
  const sevReelle = bande.dateSevrageReelle;
  const sevPrevue = bande.dateSevragePrevue;
  if (sevReelle) {
    events.push({
      key: 'sevrage',
      date: formatDateShort(sevReelle),
      type: 'Sevrage réel',
      varTone: 'var(--teal)',
      title: `Sevrage effectué · ${bande.vivants ?? '—'} porcelets`,
      note: 'Transfert loge post-sevrage',
      pending: false,
    });
  } else if (sevPrevue) {
    const d = parseDate(sevPrevue);
    const pending = d !== null && d.getTime() > today.getTime();
    events.push({
      key: 'sevrage',
      date: formatDateShort(sevPrevue),
      type: pending ? 'Sevrage prévu' : 'Sevrage en retard',
      varTone: pending ? 'var(--teal)' : 'var(--coral)',
      title: pending
        ? `Sevrage prévu J${FARM_CONFIG.SEVRAGE_AGE_JOURS ?? 28}`
        : 'Sevrage à effectuer',
      note: pending ? 'Transfert loge post-sevrage' : 'Date dépassée, action requise',
      pending,
    });
  }

  // Séparation par sexe (si dateSeparation présente)
  const sep = bande.dateSeparation;
  if (sep) {
    events.push({
      key: 'separation',
      date: formatDateShort(sep),
      type: 'Séparation sexes',
      varTone: 'var(--cyan)',
      title: `${bande.nbMales ?? '—'} mâles · ${bande.nbFemelles ?? '—'} femelles`,
      note: bande.logeEngraissement
        ? `Loge ${bande.logeEngraissement === 'M' ? 'mâles' : 'femelles'}`
        : 'Vers loges croissance',
      pending: false,
    });
  }

  // Tri chronologique (pending en dernier)
  events.sort((a, b) => {
    if (a.pending !== b.pending) return a.pending ? 1 : -1;
    const da = parseDate(a.date)?.getTime() ?? 0;
    const db = parseDate(b.date)?.getTime() ?? 0;
    return da - db;
  });

  return events;
}

// ─── Composant ──────────────────────────────────────────────────────────────

const BandeDetailView: React.FC = () => {
  const { bandeId } = useParams<{ bandeId: string }>();
  const { bandes } = useFarm();
  const [mortalityOpen, setMortalityOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const decodedId = bandeId ? decodeURIComponent(bandeId) : '';

  const bande = useMemo(
    () => bandes.find((b) => b.id === decodedId || b.idPortee === decodedId),
    [bandes, decodedId],
  );

  const today = useMemo(() => new Date(), []);

  if (!bande) {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
          <AgritechLayout>
            <AgritechHeader
              title="PORTÉE INTROUVABLE"
              subtitle={`ID "${decodedId}"`}
              backTo="/troupeau"
            />
            <div className="px-4 pt-6 flex flex-col items-center gap-3">
              <AlertCircle size={40} className="text-coral" aria-hidden="true" />
              <p className="font-mono text-[12px] text-text-2 text-center max-w-xs">
                Cette portée n'existe pas (ou plus) dans ta feuille PORTEES.
                Retourne au troupeau et vérifie l'ID.
              </p>
            </div>
          </AgritechLayout>
        </IonContent>
      </IonPage>
    );
  }

  const meta = phaseMeta(bande, today);
  const jour = meta.startDate ? Math.max(0, daysBetween(meta.startDate, today)) : 0;
  const events = buildEvents(bande, today);

  const nv = bande.nv ?? 0;
  const vivants = bande.vivants ?? 0;
  const morts = bande.morts ?? Math.max(0, nv - vivants);
  const sevres = bande.dateSevrageReelle ? vivants : null;
  const survival = nv > 0 ? Math.round((vivants / nv) * 100) : 0;

  const idDisplay = bande.idPortee || bande.id;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="PORTÉE"
            subtitle={idDisplay}
            backTo="/troupeau"
          />

          <div className="px-4 pt-4 pb-32 flex flex-col gap-5">
            {/* ── Hero ───────────────────────────────────────────────── */}
            <div className="card-dense flex flex-col gap-3.5">
              <div className="flex items-center gap-3.5">
                <div className="w-[52px] h-[52px] rounded-2xl-v2 bg-bg-1 border border-border flex items-center justify-center shrink-0 text-gold">
                  <BandeIcon size={30} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="ft-heading text-[22px] text-text-0 leading-none">
                    {idDisplay}
                  </div>
                  <div className="font-mono text-[11px] text-text-2 mt-1.5 uppercase tracking-wide">
                    Truie {bande.truie || '—'}
                    {bande.boucleMere ? ` · ${bande.boucleMere}` : ''}
                  </div>
                </div>
                <Chip label={meta.label} tone={meta.tone} size="xs" />
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  aria-label="Éditer la portée"
                  className="pressable inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-1 border border-border text-text-1 hover:border-text-2 transition-colors duration-[160ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  <Edit3 size={14} aria-hidden="true" />
                </button>
              </div>

              <div className="hairline" />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="kpi-label">Mise-bas</div>
                  <div className="font-mono tabular-nums text-[13px] text-text-0 font-medium mt-1">
                    {formatDateShort(bande.dateMB)}
                  </div>
                </div>
                <div>
                  <div className="kpi-label">Statut</div>
                  <div className="font-mono text-[13px] text-text-0 font-medium mt-1 truncate">
                    {bande.statut || '—'}
                  </div>
                </div>
                <div>
                  <div className="kpi-label">Jour</div>
                  <div
                    className="font-mono tabular-nums text-[13px] font-medium mt-1"
                    style={{ color: meta.varColor }}
                  >
                    {meta.startDate ? `J+${jour}/${meta.duration}` : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* ── KPI portée ─────────────────────────────────────────── */}
            <section aria-label="Indicateurs portée">
              <SectionDivider label="Indicateurs portée" />
              <div className="grid grid-cols-4 gap-2 mt-3">
                <KpiTile label="Nés" value={nv} tone="var(--text-0)" />
                <KpiTile label="Vivants" value={vivants} tone="var(--accent)" />
                <KpiTile
                  label="Sevrés"
                  value={sevres === null ? '—' : sevres}
                  tone={sevres === null ? 'var(--text-2)' : 'var(--text-0)'}
                />
                <KpiTile label="Morts" value={morts} tone="var(--coral)" />
              </div>
              {nv > 0 ? (
                <div className="card-dense mt-3">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="kpi-label">Taux de survie</span>
                    <span className="font-mono tabular-nums text-[15px] font-semibold text-accent">
                      {survival}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-bg-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-[width]"
                      style={{ width: `${Math.min(100, survival)}%` }}
                    />
                  </div>
                  <div className="font-mono text-[11px] text-text-2 mt-2">
                    Moyenne ferme K13 : 92% · objectif ≥ 90%
                  </div>
                </div>
              ) : null}
            </section>

            {/* ── Timeline événements ─────────────────────────────────── */}
            {events.length > 0 ? (
              <section aria-label="Timeline événements">
                <SectionDivider label="Timeline événements" />
                <div className="relative mt-3 pl-2">
                  <div
                    className="absolute left-[11px] top-2.5 bottom-2.5 w-px bg-border"
                    aria-hidden="true"
                  />
                  {events.map((e) => (
                    <TimelineItem key={e.key} event={e} />
                  ))}
                </div>
              </section>
            ) : null}

            {/* ── CTA Déclarer mortalité ─────────────────────────────── */}
            <button
              type="button"
              aria-label="Déclarer une mortalité porcelet sur cette bande"
              className="pressable card-dense flex items-center justify-center gap-2 !py-3.5 text-coral hover:brightness-110"
              onClick={() => setMortalityOpen(true)}
            >
              <Skull size={18} aria-hidden="true" />
              <span className="ft-heading text-[13px] uppercase tracking-wide">
                Déclarer mortalité
              </span>
            </button>
          </div>

          <QuickMortalityForm
            isOpen={mortalityOpen}
            onClose={() => setMortalityOpen(false)}
            defaultBandeId={bande.id}
          />

          <QuickEditBandeForm
            isOpen={editOpen}
            onClose={() => setEditOpen(false)}
            bande={bande}
          />
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

// ─── Sous-composants ─────────────────────────────────────────────────────────

const KpiTile: React.FC<{ label: string; value: number | string; tone: string }> = ({
  label,
  value,
  tone,
}) => (
  <div className="card-dense !p-2.5">
    <div className="kpi-label text-[9px]">{label}</div>
    <div
      className="font-mono tabular-nums text-[22px] font-bold mt-1.5 leading-none"
      style={{ color: tone }}
    >
      {typeof value === 'number' ? String(value).padStart(2, '0') : value}
    </div>
  </div>
);

const TimelineItem: React.FC<{ event: TimelineEvent }> = ({ event }) => (
  <div className="flex gap-3.5 py-2">
    <div className="relative shrink-0 w-[22px] flex items-start justify-center pt-1">
      <div
        className="w-[11px] h-[11px] rounded-full"
        style={{
          background: event.pending ? 'var(--bg-0)' : event.varTone,
          border: `2px solid ${event.varTone}`,
          boxShadow: '0 0 0 3px var(--bg-0)',
        }}
        aria-hidden="true"
      />
    </div>
    <div className="flex-1 pb-2.5 min-w-0">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className="font-mono text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: event.varTone }}
        >
          {event.type}
        </span>
        <span className="font-mono text-[10px] text-text-2 tabular-nums">
          {event.date}
        </span>
      </div>
      <div
        className="text-[13px] mt-1 font-medium"
        style={{ color: event.pending ? 'var(--text-1)' : 'var(--text-0)' }}
      >
        {event.title}
      </div>
      <div className="text-[12px] text-text-2 mt-0.5">{event.note}</div>
    </div>
  </div>
);

export default BandeDetailView;
