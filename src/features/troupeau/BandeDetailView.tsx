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

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { IonContent, IonModal, IonPage } from '@ionic/react';
import { AlertCircle, Edit3 } from 'lucide-react';

import AgritechLayout from '../../components/AgritechLayout';
import Eyebrow from '../../components/design/Eyebrow';
import TopBarSync from '../../components/design/TopBarSync';
import { BandeIcon } from '../../components/icons';
import { Chip, SectionDivider, type ChipTone } from '../../components/agritech';
import QuickMortalityForm from '../../components/forms/QuickMortalityForm';
import QuickEditBandeForm from '../../components/forms/QuickEditBandeForm';
import QuickPeseeForm from '../../components/forms/QuickPeseeForm';
import QuickSevrageForm from '../../components/forms/QuickSevrageForm';
import BandeFinanceCard from './BandeFinanceCard';
import BandeActionToolbar from './BandeActionToolbar';
import { CohortTimeline } from '../../components/design/CohortTimeline';
import type { Phase } from '../../components/design/PhaseBadge';
import LineageBreadcrumb, { type LineageNode } from '../../components/design/LineageBreadcrumb';
import LineageTree from '../../components/design/LineageTree';
import { useFarm } from '../../context/FarmContext';
import { useAuth } from '../../context/AuthContext';
import { computeBandePhase, type BandePhase } from '../../services/bandesAggregator';
import { FARM_CONFIG } from '../../config/farm';
import { updateBatch } from '../../services/supabaseWrites';
import EditableNumber from '../../components/EditableNumber';
import EditableText from '../../components/EditableText';
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

// ─── CohortTimeline mapping ─────────────────────────────────────────────────

function mapBandePhaseToCohortPhase(p: BandePhase): Phase {
  switch (p) {
    case 'SOUS_MERE':     return 'sevr';
    case 'POST_SEVRAGE':  return 'crois';
    case 'CROISSANCE':    return 'engr';
    case 'ENGRAISSEMENT': return 'finit';
    case 'FINITION':      return 'sortie';
    default:              return 'repro';
  }
}

function computeCohortContext(bande: BandePorcelets, today: Date): {
  phase: Phase;
  currentDay: number;
  phaseProgress: number;
} {
  const bp = computeBandePhase(bande, today);
  const phase = mapBandePhaseToCohortPhase(bp);
  const mb = parseDate(bande.dateMB);
  const sev = parseDate(bande.dateSevrageReelle || bande.dateSevragePrevue);

  // Origine du cycle : MB - 115j (gestation) si dispo, sinon MB, sinon today
  const cycleStart = mb
    ? new Date(mb.getTime() - 115 * 86400000)
    : sev
      ? new Date(sev.getTime() - (115 + 28) * 86400000)
      : today;
  const currentDay = Math.max(0, daysBetween(cycleStart, today));

  let phaseStart: Date | null;
  let phaseDuration: number;
  switch (bp) {
    case 'SOUS_MERE':
      phaseStart = mb;
      phaseDuration = FARM_CONFIG.SEVRAGE_AGE_JOURS ?? 28;
      break;
    case 'POST_SEVRAGE':
      phaseStart = sev;
      phaseDuration = FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS ?? 35;
      break;
    case 'CROISSANCE': {
      const base = sev;
      phaseStart = base
        ? new Date(base.getTime() + (FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS ?? 35) * 86400000)
        : null;
      phaseDuration = FARM_CONFIG.CROISSANCE_DUREE_JOURS ?? 37;
      break;
    }
    case 'ENGRAISSEMENT': {
      const base = sev;
      const offset = (FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS ?? 35) + (FARM_CONFIG.CROISSANCE_DUREE_JOURS ?? 37);
      phaseStart = base ? new Date(base.getTime() + offset * 86400000) : null;
      phaseDuration = FARM_CONFIG.ENGRAISSEMENT_DUREE_JOURS ?? 80;
      break;
    }
    case 'FINITION': {
      const base = sev;
      const offset = (FARM_CONFIG.POST_SEVRAGE_DUREE_JOURS ?? 35)
        + (FARM_CONFIG.CROISSANCE_DUREE_JOURS ?? 37)
        + (FARM_CONFIG.ENGRAISSEMENT_DUREE_JOURS ?? 80);
      phaseStart = base ? new Date(base.getTime() + offset * 86400000) : null;
      phaseDuration = 28;
      break;
    }
    default:
      // INCONNU → on suppose gestation, MB est dans phaseDuration jours
      phaseStart = mb ? new Date(mb.getTime() - 115 * 86400000) : null;
      phaseDuration = 115;
  }

  let phaseProgress = 0;
  if (phaseStart) {
    const elapsed = daysBetween(phaseStart, today);
    phaseProgress = Math.max(0, Math.min(1, elapsed / Math.max(1, phaseDuration)));
  }

  return { phase, currentDay, phaseProgress };
}

function estimateBandeWeight(bande: BandePorcelets, today: Date): number {
  const sevDate = parseDate(bande.dateSevrageReelle || bande.dateSevragePrevue);
  if (!sevDate) return 5;
  const days = daysBetween(sevDate, today);
  if (days < 0) return 5;
  return Math.round(Math.min(25 + days * 0.65, 110));
}

// ─── Composant ──────────────────────────────────────────────────────────────

const BandeDetailView: React.FC = () => {
  const { bandeId } = useParams<{ bandeId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { bandes, transitions, truies, verrats, saillies, refreshData } = useFarm();
  const { isOwner } = useAuth();
  const [mortalityOpen, setMortalityOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [peseeOpen, setPeseeOpen] = useState(false);
  const [sevrageOpen, setSevrageOpen] = useState(
    () => searchParams.get('action') === 'sevrage',
  );
  const [treeOpen, setTreeOpen] = useState(false);

  const decodedId = bandeId ? decodeURIComponent(bandeId) : '';

  useEffect(() => {
    if (searchParams.get('action') === 'sevrage') {
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const bande = useMemo(
    () => bandes.find((b) => b.id === decodedId || b.idPortee === decodedId),
    [bandes, decodedId],
  );

  const today = useMemo(() => new Date(), []);

  const currentEstWeight = useMemo(() => {
    if (!bande) return 0;
    // Heuristique simple K13
    const sevDate = parseDate(bande.dateSevrageReelle || bande.dateSevragePrevue);
    if (!sevDate) return 5; // Fallback
    const days = daysBetween(sevDate, today);
    return Math.min(25 + days * 0.65, 120);
  }, [bande, today]);

  const cohortCtx = useMemo(
    () => (bande ? computeCohortContext(bande, today) : null),
    [bande, today],
  );

  if (!bande || !cohortCtx) {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
          <AgritechLayout>
            <TopBarSync
              crumbs={['Cheptel', 'Bandes', decodedId]}
              onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
            />
            <div className="px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
              <header>
                <Eyebrow dotColor="accent">Cheptel · Bande {decodedId}</Eyebrow>
                <h1
                  style={{
                    fontFamily: 'BigShoulders, system-ui, sans-serif',
                    fontSize: 34,
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    color: 'var(--ink)',
                    margin: '8px 0 4px',
                  }}
                >
                  Portée introuvable
                </h1>
                <div
                  style={{
                    fontFamily: 'InstrumentSans, system-ui, sans-serif',
                    fontSize: 13,
                    color: 'var(--muted)',
                  }}
                >
                  ID "{decodedId}"
                </div>
              </header>
              <div className="flex flex-col items-center gap-3">
                <AlertCircle size={40} className="text-coral" aria-hidden="true" />
                <p className="font-mono text-[12px] text-text-2 text-center max-w-xs">
                  Cette portée n'existe pas (ou plus) dans ta feuille PORTEES.
                  Retourne au troupeau et vérifie l'ID.
                </p>
              </div>
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

  const idDisplay = bande.idPortee || bande.id;

  // ── Lignée (kit v2.1) ─────────────────────────────────────────────────────
  const lineageNodes: LineageNode[] = (() => {
    const nodes: LineageNode[] = [];
    const truieRef = bande.truie
      ? truies.find((t) => t.id === bande.truie || t.displayId === bande.truie)
      : undefined;

    // Verrat via dernière saillie liée à cette truie (matchée sur ID truie)
    if (truieRef) {
      const truieSaillies = saillies
        .filter((s) => s.truieId === truieRef.id || s.truieId === truieRef.displayId)
        .sort((a, b) => (parseDate(b.dateSaillie)?.getTime() ?? 0) - (parseDate(a.dateSaillie)?.getTime() ?? 0));
      const lastSaillie = truieSaillies[0];
      if (lastSaillie?.verratId) {
        const verratRef = verrats.find(
          (v) => v.id === lastSaillie.verratId || v.displayId === lastSaillie.verratId,
        );
        nodes.push({
          id: lastSaillie.verratId,
          label: 'Verrat père',
          href: verratRef ? `/troupeau/verrats/${verratRef.id}` : undefined,
        });
      }
    }

    if (truieRef) {
      nodes.push({
        id: truieRef.displayId,
        label: 'Truie mère',
        href: `/troupeau/truies/${truieRef.id}`,
      });
    } else if (bande.truie) {
      nodes.push({ id: bande.truie, label: 'Truie mère' });
    }

    nodes.push({ id: idDisplay, label: 'Bande', current: true });
    return nodes;
  })();

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <TopBarSync
            crumbs={['Cheptel', 'Bandes', idDisplay]}
            onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
          />

          <div className="px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto' }}>
            <header>
              <Eyebrow dotColor="accent">Cheptel · Bande {idDisplay}</Eyebrow>
              <h1
                style={{
                  fontFamily: 'BigShoulders, system-ui, sans-serif',
                  fontSize: 34,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  margin: '8px 0 4px',
                }}
              >
                Bande {idDisplay}
              </h1>
              <div
                style={{
                  fontFamily: 'InstrumentSans, system-ui, sans-serif',
                  fontSize: 13,
                  color: 'var(--muted)',
                }}
              >
                {vivants} porcelet{vivants > 1 ? 's' : ''} · phase {meta.label}
              </div>
            </header>

            {/* ── Lignée (kit v2.1) ───────────────────────────────────── */}
            <LineageBreadcrumb nodes={lineageNodes} onTreeClick={() => setTreeOpen(true)} />

            {/* ── Hero ───────────────────────────────────────────────── */}
            <div className="card-dense flex flex-col gap-3.5">
              <div className="flex items-center gap-3.5">
                {bande.photoUrl ? (
                  <img
                    src={bande.photoUrl}
                    alt={`Photo de la bande ${idDisplay}`}
                    className="w-[88px] h-[88px] rounded-2xl object-cover shrink-0 border border-border"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-[52px] h-[52px] rounded-2xl-v2 bg-bg-1 border border-border flex items-center justify-center shrink-0 text-gold">
                    <BandeIcon size={30} aria-hidden="true" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[11px] text-text-2 uppercase tracking-wide">
                    Truie {bande.truie || '—'}
                    {bande.boucleMere ? ` · ${bande.boucleMere}` : ''}
                  </div>
                  {bande.loge ? (
                    <div className="font-mono text-[11px] text-text-2 mt-0.5">
                      Loge {bande.loge}
                    </div>
                  ) : null}
                </div>
                <Chip label={meta.label} tone={meta.tone} size="xs" className="!normal-case" />
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

            {/* ── CohortTimeline (kit v2.1, killer feature) ───────────── */}
            {/* INSERT-COHORT-TIMELINE — zone réservée, ne pas insérer d'autres composants ici */}
            <CohortTimeline
              bandId={idDisplay}
              bandName={`Bande ${idDisplay} · ${nv} né${nv > 1 ? 's' : ''}`}
              bandSub={
                bande.truie
                  ? `Mère ${bande.truie}${bande.boucleMere ? ` · ${bande.boucleMere}` : ''}`
                  : undefined
              }
              stats={{
                heads: vivants,
                weight: estimateBandeWeight(bande, today),
                ic: 2.4,
              }}
              currentPhase={cohortCtx.phase}
              currentDay={cohortCtx.currentDay}
              phaseProgress={cohortCtx.phaseProgress}
            />
            {/* END-INSERT-COHORT-TIMELINE */}

            {/* ── KPI portée ─────────────────────────────────────────── */}
            <section aria-label="Indicateurs portée">
              <SectionDivider label="Indicateurs portée" />
              <div className="grid grid-cols-4 gap-2 mt-3">
                <EditableKpiTile
                  label="Nés vivants"
                  value={nv}
                  ariaLabel={`Nés vivants de la portée ${idDisplay}`}
                  onSave={async (v) => {
                    const res = await updateBatch(bande.id, {
                      porcelets_nes_vivants: v,
                    });
                    if (res.success) await refreshData();
                    return res;
                  }}
                />
                <KpiTile label="Vivants" value={vivants} tone="var(--accent)" />
                <KpiTile
                  label="Sevrés"
                  value={sevres === null ? '—' : sevres}
                  tone={sevres === null ? 'var(--text-2)' : 'var(--text-0)'}
                />
                <EditableKpiTile
                  label="Morts"
                  value={morts}
                  ariaLabel={`Morts-nés de la portée ${idDisplay}`}
                  onSave={async (v) => {
                    const res = await updateBatch(bande.id, { nb_mort_nes: v });
                    if (res.success) await refreshData();
                    return res;
                  }}
                />
              </div>
            </section>

            {/* ── Notes (édition inline) ──────────────────────────────── */}
            <section aria-label="Notes portée">
              <SectionDivider label="Notes" />
              <div className="card-dense mt-3 !p-3">
                <EditableText
                  value={bande.notes ?? null}
                  multiline
                  maxLength={500}
                  ariaLabel={`Notes de la portée ${idDisplay}`}
                  placeholder="Ajouter une note (Cmd+Entrée pour sauver)…"
                  onSave={async (v) => {
                    const res = await updateBatch(bande.id, { notes: v });
                    if (res.success) await refreshData();
                    return res;
                  }}
                />
              </div>
            </section>

            {/* ── Finance ROI ── */}
            {isOwner && (
              <section aria-label="Rentabilité">
                <SectionDivider label="Rentabilité de la bande" />
                <div className="mt-3">
                    <BandeFinanceCard
                      bande={bande}
                      historique={transitions}
                      poidsActuel={currentEstWeight}
                    />
                </div>
              </section>
            )}

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

          <QuickPeseeForm
            isOpen={peseeOpen}
            onClose={() => setPeseeOpen(false)}
          />

          <QuickSevrageForm
            isOpen={sevrageOpen}
            onClose={() => setSevrageOpen(false)}
            defaultBandeId={bande.id}
            onSuccess={() => {
              setSevrageOpen(false);
              void refreshData();
            }}
          />

          <IonModal isOpen={treeOpen} onDidDismiss={() => setTreeOpen(false)}>
            <IonContent>
              <div style={{ padding: 18 }}>
                <LineageTree
                  rootBandeId={bande.id}
                  truies={truies}
                  verrats={verrats}
                  bandes={bandes}
                  saillies={saillies}
                />
                <button
                  type="button"
                  onClick={() => setTreeOpen(false)}
                  style={{
                    marginTop: 16,
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-pill, 9999px)',
                    border: '1px solid var(--line)',
                    background: 'var(--bg-surface)',
                    fontFamily: 'DMMono, ui-monospace, monospace',
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--ink)',
                    cursor: 'pointer',
                  }}
                >
                  Fermer
                </button>
              </div>
            </IonContent>
          </IonModal>

          <BandeActionToolbar
            onPesee={() => setPeseeOpen(true)}
            onMortalite={() => setMortalityOpen(true)}
            onSoin={() => navigate(`/sante?bande=${bande.id}`)}
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

const EditableKpiTile: React.FC<{
  label: string;
  value: number;
  ariaLabel: string;
  onSave: (v: number) => Promise<{ success: boolean; error?: string }>;
}> = ({ label, value, ariaLabel, onSave }) => (
  <div className="card-dense !p-2.5">
    <div className="kpi-label text-[9px]">{label}</div>
    <div className="mt-1 leading-none">
      <EditableNumber
        value={value}
        min={0}
        max={30}
        step={1}
        ariaLabel={ariaLabel}
        onSave={onSave}
      />
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
