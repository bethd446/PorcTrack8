import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IonPage, IonContent, IonSpinner,
  IonRefresher, IonRefresherContent,
  IonModal, IonToast,
} from '@ionic/react';
import {
  AlertCircle, ChevronLeft,
  ClipboardList, Camera, RefreshCw,
  Stethoscope, Apple, CheckCircle2,
  Info, Tag, Baby, PackageCheck, CalendarClock,
  Syringe, History, Heart, Trophy, Clock,
} from 'lucide-react';
import {
  computeTruiePerformance,
  computeVerratPerformance,
} from '../../services/performanceAnalyzer';
import type { PerformanceTier } from '../../types/farm';
import { useFarm } from '../../context/FarmContext';
import { updateRowById } from '../../services/googleSheets';
import { enqueueUpdateRow } from '../../services/offlineQueue';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechHeader from '../../components/AgritechHeader';
import { Chip, SectionDivider } from '../../components/agritech';
import type { ChipTone } from '../../components/agritech';
import { TruieIcon, VerratIcon } from '../../components/icons';
import PhotoStrip from '../../components/PhotoStrip';
import TableRowEdit from './TableRowEdit';
import QuickNoteForm from '../../components/forms/QuickNoteForm';
import QuickHealthForm from '../../components/forms/QuickHealthForm';

type Mode = 'TRUIE' | 'VERRAT';
type TabKey = 'resumé' | 'sante' | 'notes' | 'photos';

/** Status → chip tone. Aligned with CheptelView / TruiesListView. */
function toneForStatut(statut?: string): ChipTone {
  if (!statut) return 'default';
  const s = statut.toLowerCase();
  if (s.includes('pleine')) return 'accent';
  if (s.includes('mater') || s.includes('allait') || s.includes('lactation')) return 'gold';
  if (s.includes('surveill') || s.includes('réform') || s.includes('reforme')) return 'amber';
  if (s.includes('morte') || s.includes('mort'))                               return 'red';
  if (s.includes('inactif'))                                                   return 'default';
  if (s.includes('actif'))                                                     return 'accent';
  return 'default';
}

const AnimalDetailView: React.FC<{ mode: Mode }> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getAnimalById, getTruieById, getVerratById,
    getHealthForAnimal, getNotesForAnimal, loading, refreshData,
    bandes, sante, truiesHeader, verratsHeader, saillies, truies,
  } = useFarm();

  const editHeaders = mode === 'TRUIE' ? truiesHeader : verratsHeader;

  const [tab, setTab] = useState<TabKey>('resumé');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toast, setToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' });

  const animal = useMemo(() => id ? getAnimalById(id, mode) : undefined, [id, mode, getAnimalById]);
  const truie = useMemo(() => id && mode === 'TRUIE' ? getTruieById(id) : undefined, [id, mode, getTruieById]);
  const verrat = useMemo(() => id && mode === 'VERRAT' ? getVerratById(id) : undefined, [id, mode, getVerratById]);
  const healthRecords = useMemo(() => id ? getHealthForAnimal(id, mode) : [], [id, mode, getHealthForAnimal]);
  const notes = useMemo(() => id ? getNotesForAnimal(id, mode) : [], [id, mode, getNotesForAnimal]);

  // ── Timeline historique : agrège MB / sevrages / traitements / MB prévue / saillies ──
  type TimelineKind = 'mb' | 'sevrage' | 'traitement' | 'a-venir' | 'saillie';
  interface TimelineEvent {
    key: string;
    kind: TimelineKind;
    dateStr: string;
    sortTs: number;
    title: string;
    detail: string;
    pinned?: boolean;
  }

  const parseFrDate = (s?: string | null): number => {
    if (!s) return 0;
    const parts = s.split('/');
    if (parts.length !== 3) return 0;
    const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
    const ts = d.getTime();
    return Number.isFinite(ts) ? ts : 0;
  };

  const timeline = useMemo<TimelineEvent[]>(() => {
    if (!animal) return [];
    const events: TimelineEvent[] = [];

    if (mode === 'TRUIE' && truie) {
      // 1. MB prévue (future) → pinned en tête
      const futureMb = parseFrDate(truie.dateMBPrevue);
      if (futureMb && futureMb > Date.now()) {
        events.push({
          key: `mb-prevue-${truie.id}`,
          kind: 'a-venir',
          dateStr: truie.dateMBPrevue || '',
          sortTs: futureMb,
          title: 'Mise-bas prévue',
          detail: 'Préparer le box de maternité',
          pinned: true,
        });
      }

      // Saillies de cette truie
      const mySaillies = saillies.filter(
        s => s.truieId === truie.id || (!!truie.boucle && s.truieBoucle === truie.boucle)
      );
      for (const s of mySaillies) {
        events.push({
          key: `saillie-truie-${truie.id}-${s.dateSaillie}-${s.verratId}`,
          kind: 'saillie',
          dateStr: s.dateSaillie,
          sortTs: parseFrDate(s.dateSaillie),
          title: `Saillie avec ${s.verratId || '—'}`,
          detail: s.dateMBPrevue ? `MB prévue le ${s.dateMBPrevue}` : 'MB non planifiée',
        });
      }

      // 2. Bandes liées
      const relatedBandes = bandes.filter(
        b =>
          (b.truie && b.truie === truie.id) ||
          (b.boucleMere && truie.boucle && b.boucleMere === truie.boucle)
      );

      for (const b of relatedBandes) {
        if (b.dateMB) {
          const vivants = b.vivants ?? 0;
          const morts = b.morts ?? 0;
          const nv = b.nv ?? vivants + morts;
          events.push({
            key: `mb-${b.id}`,
            kind: 'mb',
            dateStr: b.dateMB,
            sortTs: parseFrDate(b.dateMB),
            title: 'Mise-bas',
            detail: `${vivants} vivants · ${morts} morts (NV ${nv})`,
          });
        }
        if (b.dateSevrageReelle) {
          events.push({
            key: `sevrage-${b.id}`,
            kind: 'sevrage',
            dateStr: b.dateSevrageReelle,
            sortTs: parseFrDate(b.dateSevrageReelle),
            title: 'Sevrage',
            detail: `${b.vivants ?? 0} porcelets sevrés`,
          });
        }
      }
    }

    // 3. Traitements santé
    const animalKey = animal.id;
    const animalDisplay = animal.displayId;
    const animalBoucle = animal.boucle;
    const relatedSante = sante.filter(
      h =>
        h.cibleType === mode &&
        (h.cibleId === animalKey ||
          h.cibleId === animalDisplay ||
          (animalBoucle && h.cibleId === animalBoucle))
    );
    for (const h of relatedSante) {
      const typeSoin = h.typeSoin || 'Soin';
      events.push({
        key: `sante-${h.id}`,
        kind: 'traitement',
        dateStr: h.date,
        sortTs: parseFrDate(h.date),
        title: typeSoin,
        detail: `${h.traitement}${h.observation ? ' — ' + h.observation : ''}`,
      });
    }

    // 4. Saillies côté verrat : lister chaque saillie effectuée
    if (mode === 'VERRAT' && verrat) {
      const verratSaillies = saillies.filter(
        s => s.verratId === verrat.id || s.verratId === verrat.displayId
      );
      for (const s of verratSaillies) {
        const truieLabel = s.truieNom
          ? `${s.truieId} ${s.truieNom}`
          : s.truieId || '—';
        events.push({
          key: `saillie-verrat-${verrat.id}-${s.dateSaillie}-${s.truieId}`,
          kind: 'saillie',
          dateStr: s.dateSaillie,
          sortTs: parseFrDate(s.dateSaillie),
          title: `Saillie sur ${truieLabel}`,
          detail: s.dateMBPrevue ? `MB prévue le ${s.dateMBPrevue}` : 'MB non planifiée',
        });
      }
    }

    events.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.sortTs === 0 && b.sortTs !== 0) return 1;
      if (b.sortTs === 0 && a.sortTs !== 0) return -1;
      return b.sortTs - a.sortTs;
    });

    return events;
  }, [animal, mode, truie, verrat, bandes, sante, saillies]);

  /** Timeline styling per kind — dark tokens. */
  const timelineStyleFor = (kind: TimelineKind): {
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    fg: string;           // icon colour
    borderLeft: string;   // row left-border colour (class)
  } => {
    switch (kind) {
      case 'mb':         return { Icon: Baby,          fg: 'text-accent', borderLeft: 'border-l-accent'    };
      case 'sevrage':    return { Icon: PackageCheck,  fg: 'text-gold',   borderLeft: 'border-l-gold'      };
      case 'traitement': return { Icon: Syringe,       fg: 'text-blue',   borderLeft: 'border-l-blue'      };
      case 'a-venir':    return { Icon: CalendarClock, fg: 'text-amber',  borderLeft: 'border-l-amber'     };
      case 'saillie':    return { Icon: Heart,         fg: 'text-accent', borderLeft: 'border-l-accent'    };
    }
  };

  // ── Performance computations (truie / verrat) ───────────────────────────
  const truiePerf = useMemo(
    () => (mode === 'TRUIE' && truie ? computeTruiePerformance(truie, bandes, saillies) : null),
    [mode, truie, bandes, saillies],
  );
  const verratPerf = useMemo(
    () => (mode === 'VERRAT' && verrat ? computeVerratPerformance(verrat, bandes, saillies, truies) : null),
    [mode, verrat, bandes, saillies, truies],
  );

  /** Tone d'un tier → ChipTone. */
  const toneForTier = (tier: PerformanceTier): ChipTone => {
    switch (tier) {
      case 'ELITE':       return 'gold';
      case 'BON':         return 'accent';
      case 'MOYEN':       return 'blue';
      case 'FAIBLE':      return 'amber';
      case 'INSUFFISANT': return 'red';
    }
  };

  /** Résumé textuel court d'une performance truie. */
  const truiePerfDescription = (): string => {
    if (!truiePerf || truiePerf.nbPortees === 0) {
      return 'Données insuffisantes — pas de portée enregistrée.';
    }
    const parts: string[] = [];
    if (truiePerf.moyNV >= 13) parts.push('Excellente prolificité');
    else if (truiePerf.moyNV >= 11) parts.push('Bonne prolificité');
    else parts.push('Prolificité faible');

    if (truiePerf.tauxSurvieNaissance >= 90) parts.push('mortalité dans la norme');
    else if (truiePerf.tauxSurvieNaissance >= 75) parts.push('mortalité à surveiller');
    else parts.push('mortalité élevée');

    if (truiePerf.nbSaillies > 0 && truiePerf.tauxFertilite >= 80) parts.push('fertilité solide');
    else if (truiePerf.nbSaillies > 0 && truiePerf.tauxFertilite < 50) parts.push('fertilité faible');

    return parts.join(' · ') + '.';
  };

  /** Résumé textuel court d'une performance verrat. */
  const verratPerfDescription = (): string => {
    if (!verratPerf || verratPerf.nbSaillies === 0) {
      return 'Données insuffisantes — aucune saillie enregistrée.';
    }
    const parts: string[] = [];
    if (verratPerf.tauxSuccesSaillie >= 80) parts.push('Verrat très fertile');
    else if (verratPerf.tauxSuccesSaillie >= 60) parts.push('Fertilité correcte');
    else parts.push('Fertilité faible');

    if (verratPerf.nbPorteesEngendrees > 0) {
      if (verratPerf.moyNVEngendrees >= 12) parts.push('portées nombreuses');
      else if (verratPerf.moyNVEngendrees < 10) parts.push('portées de petite taille');
    }
    return parts.join(' · ') + '.';
  };

  const handleUpdateRation = async (newRation: number): Promise<void> => {
    if (!animal) return;

    const sheetName = mode === 'TRUIE' ? 'SUIVI_TRUIES_REPRODUCTION' : 'VERRATS';
    const idHeader = 'ID';
    const rationCol = 'RATION';
    const patch = { [rationCol]: newRation };

    try {
      const res = await updateRowById(sheetName, idHeader, animal.id, patch);
      if (res.success) {
        setToast({ show: true, message: 'Ration mise à jour' });
        refreshData();
      } else {
        enqueueUpdateRow(sheetName, idHeader, animal.id, patch);
        setToast({ show: true, message: 'Mise à jour planifiée (hors ligne)' });
      }
    } catch {
      enqueueUpdateRow(sheetName, idHeader, animal.id, patch);
      setToast({ show: true, message: 'Mise à jour planifiée' });
    }
  };

  const AnimalIcon = mode === 'TRUIE' ? TruieIcon : VerratIcon;

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading && !animal) {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
          <AgritechLayout>
            <AgritechHeader
              title={`Fiche ${mode === 'TRUIE' ? 'Truie' : 'Verrat'}`}
              subtitle="Chargement…"
            />
            <div className="flex flex-col items-center justify-center mt-32 space-y-4">
              <IonSpinner name="bubbles" className="w-16 h-16" style={{ color: 'var(--color-accent)' }} />
              <p className="font-mono text-[11px] uppercase text-text-2 tracking-wide">
                Accès au registre…
              </p>
            </div>
          </AgritechLayout>
        </IonContent>
      </IonPage>
    );
  }

  // ── Not-found state ─────────────────────────────────────────────────────
  if (!animal) {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
          <AgritechLayout>
            <AgritechHeader
              title="Erreur"
              subtitle={`${mode === 'TRUIE' ? 'Truie' : 'Verrat'} introuvable`}
            />
            <div className="px-4 py-8">
              <div className="card-dense text-center space-y-5">
                <AlertCircle size={40} className="text-red mx-auto" aria-hidden="true" />
                <h3 className="agritech-heading uppercase text-[16px]">
                  {mode === 'TRUIE' ? 'Truie' : 'Verrat'} {id} introuvable
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('/cheptel')}
                  className="pressable inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent text-bg-0 px-4 py-3 font-mono text-[12px] font-semibold uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Retour au Cheptel
                </button>
              </div>
            </div>
          </AgritechLayout>
        </IonContent>
      </IonPage>
    );
  }

  // ── Gestation progress (truie enceinte) ─────────────────────────────────
  const gestation: { pct: number; isTerme: boolean; mbDateStr: string } | null = (() => {
    if (mode !== 'TRUIE' || !animal.statut?.toUpperCase().includes('PLEINE') || !animal.dateMBPrevue) return null;
    try {
      const parts = animal.dateMBPrevue.split('/');
      if (parts.length !== 3) return null;
      const mbDate = new Date(+parts[2], +parts[1] - 1, +parts[0]);
      const gestStart = new Date(mbDate.getTime() - 115 * 86400000);
      const elapsed = Math.max(0, (new Date().getTime() - gestStart.getTime()) / 86400000);
      const pct = Math.min(100, Math.round(elapsed / 115 * 100));
      return { pct, isTerme: pct >= 100, mbDateStr: animal.dateMBPrevue };
    } catch {
      return null;
    }
  })();

  // ── CTA Mise-bas imminente ──────────────────────────────────────────────
  const mbImminentCta: { label: string; diff: number } | null = (() => {
    if (mode !== 'TRUIE' || !animal.statut?.toUpperCase().includes('PLEINE') || !animal.dateMBPrevue) return null;
    try {
      const parts = animal.dateMBPrevue.split('/');
      if (parts.length !== 3) return null;
      const mbDate = new Date(+parts[2], +parts[1] - 1, +parts[0]);
      const diff = (mbDate.getTime() - new Date().getTime()) / 86400000;
      if (diff > 3) return null;
      return {
        diff: Math.round(diff),
        label: diff <= 0
          ? `Confirmer Mise-Bas (${Math.abs(Math.round(diff))}j dépassé)`
          : `Préparer Mise-Bas (J-${Math.round(diff)})`,
      };
    } catch {
      return null;
    }
  })();

  const subtitle = `${animal.statut ?? 'Inconnu'} · ID ${animal.displayId}`;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <IonRefresher slot="fixed" onIonRefresh={(e) => refreshData().then(() => e.detail.complete())}>
          <IonRefresherContent />
        </IonRefresher>

        <AgritechLayout>
          <AgritechHeader
            title={`${mode === 'TRUIE' ? 'Truie' : 'Verrat'} ${animal.displayId}`}
            subtitle={subtitle}
          >
            {/* Tabs dark pill group */}
            <div
              role="tablist"
              aria-label="Sections fiche animal"
              className="inline-flex w-full items-center gap-1 rounded-md border border-border bg-bg-1 p-1"
            >
              {(['resumé', 'sante', 'notes', 'photos'] as const).map(key => {
                const isActive = tab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setTab(key)}
                    className={[
                      'pressable flex-1 inline-flex items-center justify-center rounded-sm px-2 py-1.5',
                      'transition-colors duration-150',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2',
                      isActive
                        ? 'bg-accent text-bg-0'
                        : 'bg-transparent text-text-1 hover:bg-bg-2',
                    ].join(' ')}
                  >
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-wide">
                      {key === 'resumé' ? 'Résumé' : key === 'sante' ? 'Santé' : key === 'notes' ? 'Notes' : 'Photos'}
                    </span>
                  </button>
                );
              })}
            </div>
          </AgritechHeader>

          <div className="px-4 pt-4 pb-32 space-y-4">
            {tab === 'resumé' && (
              <>
                {/* ── CTA Mise-Bas imminente ────────────────────────────── */}
                {mbImminentCta ? (
                  <button
                    type="button"
                    onClick={() => setTab('sante')}
                    className="pressable w-full flex items-center justify-center gap-2 rounded-md bg-accent text-bg-0 px-4 py-3 font-mono text-[12px] font-semibold uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    <CheckCircle2 size={16} aria-hidden="true" />
                    {mbImminentCta.label}
                  </button>
                ) : null}

                {/* ── Profil hero ───────────────────────────────────────── */}
                <section
                  aria-label="Profil de l'animal"
                  className="card-dense"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-md bg-bg-2 border border-border flex items-center justify-center shrink-0">
                      <AnimalIcon size={28} className="text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="agritech-heading uppercase leading-none text-[20px] truncate">
                        {animal.nom || (mode === 'TRUIE' ? `Truie ${animal.displayId}` : `Verrat ${animal.displayId}`)}
                      </h2>
                      <div className="mt-2 flex items-center gap-2 min-w-0">
                        <Tag size={12} className="text-accent shrink-0" aria-hidden="true" />
                        {animal.boucle ? (
                          <span className="inline-flex items-center rounded-sm border border-border bg-bg-2 px-2 py-0.5 font-mono text-[12px] font-semibold text-text-0">
                            {animal.boucle}
                          </span>
                        ) : (
                          <span className="font-mono text-[11px] italic text-text-2">— sans boucle</span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <Chip
                          label={animal.statut || 'Inconnu'}
                          tone={toneForStatut(animal.statut)}
                          size="xs"
                        />
                        <Chip label={`ID ${animal.displayId}`} size="xs" />
                        {mode === 'TRUIE' && truiePerf && truiePerf.nbPortees === 0 ? (
                          <Chip label="Primipare" tone="amber" size="xs" />
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Gestation progress */}
                  {gestation ? (
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="kpi-label">Progression Gestation</span>
                        <span
                          className={`font-mono tabular-nums text-[11px] font-semibold ${gestation.isTerme ? 'text-red' : 'text-accent'}`}
                        >
                          {gestation.isTerme ? 'À TERME' : `${gestation.pct}%`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-bg-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-[width] ${gestation.isTerme ? 'bg-red' : 'bg-accent'}`}
                          style={{ width: `${gestation.pct}%` }}
                        />
                      </div>
                      <p className="mt-1.5 font-mono text-[10px] text-text-2">
                        MB prévue · {gestation.mbDateStr}
                      </p>
                    </div>
                  ) : null}
                </section>

                {/* ── Grille infos ─────────────────────────────────────── */}
                <section aria-label="Informations clés" className="grid grid-cols-2 gap-3">
                  <div className="card-dense !p-3">
                    <span className="kpi-label">{mode === 'TRUIE' ? 'Stade' : 'Origine'}</span>
                    <div className="mt-1.5 text-[14px] font-semibold text-text-0">
                      {mode === 'TRUIE' ? (truie?.stade || '—') : (verrat?.origine || '—')}
                    </div>
                  </div>
                  <div className="card-dense !p-3">
                    <span className="kpi-label">Ration (kg/j)</span>
                    <div className="mt-1.5 font-mono tabular-nums text-[16px] font-bold text-text-0">
                      {animal.ration || '—'}
                    </div>
                  </div>
                  <div className="card-dense !p-3">
                    <span className="kpi-label">Statut</span>
                    <div className="mt-1.5 text-[13px] font-semibold text-text-0 truncate">
                      {animal.statut || '—'}
                    </div>
                  </div>
                  <div className="card-dense !p-3">
                    <span className="kpi-label">
                      {mode === 'TRUIE' ? 'Portées' : 'Alimentation'}
                    </span>
                    <div className="mt-1.5 font-mono tabular-nums text-[14px] font-bold text-text-0 truncate">
                      {mode === 'TRUIE'
                        ? (truie?.nbPortees ?? animal.nbPortees ?? '—')
                        : (verrat?.alimentation || '—')}
                    </div>
                  </div>
                </section>

                {/* ── Performance (intelligence métier) ─────────────── */}
                {mode === 'TRUIE' && truiePerf && truiePerf.nbPortees === 0 ? (
                  <section aria-label="Primipare — aucune portée">
                    <SectionDivider label="Performance" />
                    <div className="card-dense flex items-start gap-3">
                      <span
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-bg-2 text-amber"
                        aria-hidden="true"
                      >
                        <Baby size={18} />
                      </span>
                      <p className="text-[13px] text-text-1 leading-relaxed">
                        Cette truie n'a pas encore de portée enregistrée.
                        L'historique apparaîtra après la première mise-bas.
                      </p>
                    </div>
                  </section>
                ) : null}
                {mode === 'TRUIE' && truiePerf && truiePerf.nbPortees > 0 ? (
                  <section aria-label="Performance technique">
                    <SectionDivider
                      label="Performance"
                      action={
                        <span className="font-mono text-[10px] uppercase tracking-wide text-text-2 inline-flex items-center gap-1">
                          <Trophy size={11} aria-hidden="true" />
                          classement
                        </span>
                      }
                    />
                    <div className="card-dense space-y-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono tabular-nums text-[36px] font-bold text-text-0 leading-none">
                            {truiePerf.nbPortees === 0 ? '—' : Math.round(truiePerf.scoreCompetence)}
                          </span>
                          <span className="font-mono text-[11px] uppercase text-text-2 tracking-wide">/100</span>
                        </div>
                        <Chip label={truiePerf.tier} tone={toneForTier(truiePerf.tier)} size="sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-md border border-border bg-bg-1 p-2">
                          <span className="kpi-label">Moy NV</span>
                          <div className="mt-1 font-mono tabular-nums text-[15px] font-bold text-text-0">
                            {truiePerf.nbPortees === 0 ? '—' : truiePerf.moyNV}
                          </div>
                        </div>
                        <div className="rounded-md border border-border bg-bg-1 p-2">
                          <span className="kpi-label">Survie</span>
                          <div className="mt-1 font-mono tabular-nums text-[15px] font-bold text-text-0">
                            {truiePerf.nbPortees === 0 ? '—' : `${truiePerf.tauxSurvieNaissance}%`}
                          </div>
                        </div>
                        <div className="rounded-md border border-border bg-bg-1 p-2">
                          <span className="kpi-label">Sevrage</span>
                          <div className="mt-1 font-mono tabular-nums text-[15px] font-bold text-text-0">
                            {truiePerf.nbPortees === 0 ? '—' : `${truiePerf.tauxSevrage}%`}
                          </div>
                        </div>
                        <div className="rounded-md border border-border bg-bg-1 p-2">
                          <span className="kpi-label">Fertilité</span>
                          <div className="mt-1 font-mono tabular-nums text-[15px] font-bold text-text-0">
                            {truiePerf.nbSaillies === 0 ? '—' : `${truiePerf.tauxFertilite}%`}
                          </div>
                        </div>
                      </div>
                      <p className="text-[12px] text-text-1 italic leading-relaxed">
                        {truiePerfDescription()}
                      </p>
                    </div>
                  </section>
                ) : null}

                {mode === 'VERRAT' && verratPerf ? (
                  <section aria-label="Performance fertilité">
                    <SectionDivider
                      label="Performance"
                      action={
                        <span className="font-mono text-[10px] uppercase tracking-wide text-text-2 inline-flex items-center gap-1">
                          <Trophy size={11} aria-hidden="true" />
                          fertilité
                        </span>
                      }
                    />
                    <div className="card-dense space-y-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono tabular-nums text-[36px] font-bold text-text-0 leading-none">
                            {verratPerf.nbSaillies === 0 ? '—' : Math.round(verratPerf.scoreFertilite)}
                          </span>
                          <span className="font-mono text-[11px] uppercase text-text-2 tracking-wide">/100</span>
                        </div>
                        <Chip label={verratPerf.tier} tone={toneForTier(verratPerf.tier)} size="sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-md border border-border bg-bg-1 p-2">
                          <span className="kpi-label">Saillies</span>
                          <div className="mt-1 font-mono tabular-nums text-[15px] font-bold text-text-0">
                            {verratPerf.nbSaillies}
                          </div>
                        </div>
                        <div className="rounded-md border border-border bg-bg-1 p-2">
                          <span className="kpi-label">Portées</span>
                          <div className="mt-1 font-mono tabular-nums text-[15px] font-bold text-text-0">
                            {verratPerf.nbPorteesEngendrees}
                          </div>
                        </div>
                        <div className="rounded-md border border-border bg-bg-1 p-2">
                          <span className="kpi-label">Succès</span>
                          <div className="mt-1 font-mono tabular-nums text-[15px] font-bold text-text-0">
                            {verratPerf.nbSaillies === 0 ? '—' : `${verratPerf.tauxSuccesSaillie}%`}
                          </div>
                        </div>
                        <div className="rounded-md border border-border bg-bg-1 p-2">
                          <span className="kpi-label">Moy NV</span>
                          <div className="mt-1 font-mono tabular-nums text-[15px] font-bold text-text-0">
                            {verratPerf.nbPorteesEngendrees === 0 ? '—' : verratPerf.moyNVEngendrees}
                          </div>
                        </div>
                      </div>
                      <p className="text-[12px] text-text-1 italic leading-relaxed">
                        {verratPerfDescription()}
                      </p>
                    </div>
                  </section>
                ) : null}

                {/* ── Historique ──────────────────────────────────────── */}
                <section aria-label="Historique">
                  <SectionDivider
                    label={`Historique · ${timeline.length}`}
                    action={
                      <span className="font-mono text-[10px] uppercase tracking-wide text-text-2 inline-flex items-center gap-1">
                        <History size={11} aria-hidden="true" />
                        {timeline.length > 1 ? 'événements' : 'événement'}
                      </span>
                    }
                  />
                  {timeline.length === 0 ? (
                    <div
                      className="flex flex-col items-center justify-center py-14 px-8 text-center animate-fade-in-up"
                      role="status"
                    >
                      <div className="w-20 h-20 rounded-2xl bg-bg-1 border border-border flex items-center justify-center mb-4 text-text-2">
                        <Clock size={44} aria-hidden="true" />
                      </div>
                      <h3 className="ft-heading text-text-0 text-[18px] mb-2 uppercase tracking-wide">
                        Aucun événement enregistré
                      </h3>
                      <p className="text-text-2 text-[13px] max-w-xs leading-relaxed">
                        Les saillies, mises-bas et soins apparaîtront ici.
                      </p>
                    </div>
                  ) : (
                    <div className="card-dense !p-0 overflow-hidden" role="list">
                      {timeline.map(ev => {
                        const { Icon, fg, borderLeft } = timelineStyleFor(ev.kind);
                        return (
                          <div
                            key={ev.key}
                            role="listitem"
                            className={`flex gap-3 px-3 py-3 border-b border-border last:border-b-0 border-l-2 ${borderLeft} ${ev.pinned ? 'bg-bg-2' : ''}`}
                          >
                            <div className="h-9 w-9 rounded-md bg-bg-2 border border-border flex items-center justify-center shrink-0">
                              <Icon size={16} className={fg} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-2">
                                <p className="agritech-heading text-[13px] text-text-0 truncate">
                                  {ev.title}
                                  {ev.kind === 'a-venir' ? (
                                    <Chip
                                      label="À venir"
                                      tone="amber"
                                      size="xs"
                                      className="ml-2 align-middle"
                                    />
                                  ) : null}
                                </p>
                                <span className="font-mono text-[11px] text-text-2 shrink-0 tabular-nums">
                                  {ev.dateStr || '—'}
                                </span>
                              </div>
                              {ev.detail ? (
                                <p className="mt-0.5 text-[12px] text-text-1 line-clamp-2">
                                  {ev.detail}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* ── Notes ────────────────────────────────────────────── */}
                {(truie?.notes || verrat?.notes) ? (
                  <section aria-label="Notes" className="card-dense">
                    <div className="flex items-center gap-2 mb-2">
                      <ClipboardList size={14} className="text-text-2" aria-hidden="true" />
                      <span className="kpi-label">Notes</span>
                    </div>
                    <p className="text-[13px] text-text-1 leading-relaxed whitespace-pre-wrap">
                      {mode === 'TRUIE' ? truie?.notes : verrat?.notes}
                    </p>
                  </section>
                ) : null}

                {/* ── Fiche Verrat complémentaire ──────────────────────── */}
                {mode === 'VERRAT' ? (
                  <section aria-label="Fiche Verrat" className="card-dense">
                    <div className="flex items-center gap-2 mb-3">
                      <Info size={14} className="text-blue" aria-hidden="true" />
                      <span className="kpi-label">Fiche Verrat</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-baseline border-b border-border pb-2">
                        <span className="kpi-label">Nom</span>
                        <span className="text-[12px] font-semibold text-text-0">{animal.nom || '—'}</span>
                      </div>
                      <div className="flex justify-between items-baseline border-b border-border pb-2">
                        <span className="kpi-label">Origine</span>
                        <span className="text-[12px] font-semibold text-text-0">{verrat?.origine || '—'}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="kpi-label">Alimentation</span>
                        <span className="text-[12px] font-semibold text-text-0">{verrat?.alimentation || '—'}</span>
                      </div>
                    </div>
                  </section>
                ) : null}

                {/* ── Alimentation ─────────────────────────────────────── */}
                <section aria-label="Alimentation" className="card-dense">
                  <div className="flex items-center gap-2 mb-3">
                    <Apple size={14} className="text-gold" aria-hidden="true" />
                    <span className="kpi-label">Alimentation</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="kpi-label block">Ration actuelle</span>
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="font-mono tabular-nums text-[28px] font-bold text-text-0">
                          {animal.ration || '0'}
                        </span>
                        <span className="font-mono text-[11px] uppercase text-text-2 tracking-wide">
                          kg/jour
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateRation(animal.ration - 0.5)}
                        className="pressable w-10 h-10 rounded-md bg-bg-2 border border-border flex items-center justify-center font-mono text-[16px] font-bold text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                        aria-label="Diminuer la ration"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateRation(animal.ration + 0.5)}
                        className="pressable w-10 h-10 rounded-md bg-accent text-bg-0 flex items-center justify-center font-mono text-[16px] font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                        aria-label="Augmenter la ration"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </section>

                {/* ── Quick Actions ────────────────────────────────────── */}
                <section aria-label="Actions rapides" className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTab('notes')}
                    className="card-dense pressable flex flex-col items-center gap-2 !py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-bg-2 text-text-1">
                      <ClipboardList size={14} aria-hidden="true" />
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wide text-text-1">Note</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('photos')}
                    className="card-dense pressable flex flex-col items-center gap-2 !py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-bg-2 text-text-1">
                      <Camera size={14} aria-hidden="true" />
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wide text-text-1">Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="card-dense pressable flex flex-col items-center gap-2 !py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-bg-2 text-accent">
                      <RefreshCw size={14} aria-hidden="true" />
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wide text-accent">Éditer</span>
                  </button>
                </section>
              </>
            )}

            {tab === 'sante' && (
              <div className="space-y-4">
                <QuickHealthForm subjectType={mode} subjectId={animal.id} onSuccess={refreshData} />

                <SectionDivider label={`Journal Santé · ${healthRecords.length}`} />

                {healthRecords.length === 0 ? (
                  <div className="card-dense text-center py-8">
                    <Stethoscope size={28} className="text-text-2 mb-2 mx-auto opacity-60" aria-hidden="true" />
                    <p className="font-mono text-[11px] uppercase text-text-2 tracking-wide">
                      Aucun soin enregistré
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {healthRecords.map((record) => (
                      <div
                        key={record.id}
                        className="card-dense border-l-2 border-l-red"
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="font-mono text-[11px] uppercase text-text-2 tracking-wide tabular-nums">
                            {record.date}
                          </span>
                          <Chip label={record.type} tone="red" size="xs" />
                        </div>
                        <p className="text-[13px] font-semibold text-text-0 mb-1">{record.traitement}</p>
                        <p className="text-[12px] text-text-1 leading-relaxed">{record.observation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'notes' && (
              <div className="space-y-4">
                <QuickNoteForm subjectType={mode} subjectId={animal.id} onSuccess={refreshData} />

                <SectionDivider label={`Journal de bord · ${notes.length}`} />

                {notes.length === 0 ? (
                  <div className="card-dense text-center py-8">
                    <ClipboardList size={28} className="text-text-2 mb-2 mx-auto opacity-60" aria-hidden="true" />
                    <p className="font-mono text-[11px] uppercase text-text-2 tracking-wide">
                      Aucune note terrain
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notes.map((note) => (
                      <div
                        key={note.id}
                        className="card-dense border-l-2 border-l-accent"
                      >
                        <div className="mb-1.5">
                          <span className="font-mono text-[11px] uppercase text-text-2 tracking-wide tabular-nums">
                            {note.date}
                          </span>
                        </div>
                        <p className="text-[13px] text-text-1 leading-relaxed italic">
                          « {note.texte} »
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'photos' && (
              <div className="space-y-4">
                <SectionDivider label="Documentation visuelle" />
                <PhotoStrip subjectType={mode} subjectId={animal.id} />
              </div>
            )}
          </div>
        </AgritechLayout>

        {/* Modal d'édition complète (Ionic modal — inchangé côté logique). */}
        <IonModal
          isOpen={isEditModalOpen}
          onDidDismiss={() => setIsEditModalOpen(false)}
          className="premium-modal"
        >
          <TableRowEdit
            meta={{
              sheetName: mode === 'TRUIE' ? 'SUIVI_TRUIES_REPRODUCTION' : 'VERRATS',
              idHeader: 'ID',
            }}
            header={editHeaders}
            rowData={animal.raw ?? []}
            onClose={() => setIsEditModalOpen(false)}
            onSaved={refreshData}
          />
        </IonModal>

        <IonToast
          isOpen={toast.show}
          message={toast.message}
          duration={2000}
          onDidDismiss={() => setToast({ show: false, message: '' })}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
};

export default AnimalDetailView;
