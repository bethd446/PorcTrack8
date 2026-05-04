/**
 * TruieDetailView — /troupeau/truies/:id
 * ══════════════════════════════════════════════════════════════════════════
 * Refonte v6 « Terrain Vivant » (2026-04-30) : pattern complet Diane T19.
 *
 * Layout desktop :
 *   1. TopBar synchro (breadcrumb + Marius pilule)
 *   2. SowHero : photo, eyebrow, chips, nom Big Shoulders 44px, tagline, CTAs
 *   3. ReproTracker horizontal : J0 saillie → fenêtre courante → MB
 *   4. DecisionBinaire : J18-J24 fenêtre retour chaleur (si applicable)
 *   5. Vitales : 5 KPI cards (statut, J post-saillie, verrat, poids, carrière)
 *   6. Body 2 col : (g) Identité + Historique saillies — (d) Marius + Journal
 *   7. MariusFAB position absolute bottom-right
 *
 * Préserve : routing, FarmContext, EditableNumber/Text, supabaseWrites.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IonContent, IonModal, IonPage, IonToast, useIonAlert } from '@ionic/react';
import { Pencil, Printer } from 'lucide-react';

import { useFarm } from '../../context/FarmContext';
import { enqueueUpdateRow } from '../../services/offlineQueue';
import { updateSow, updateBatch } from '../../services/supabaseWrites';
import EditableNumber from '../../components/EditableNumber';
import EditableText from '../../components/EditableText';
import QuickEditTruieForm from '../../components/forms/QuickEditTruieForm';
import QuickSaillieForm from '../../components/forms/QuickSaillieForm';
import QuickMiseBasForm from '../../components/forms/QuickMiseBasForm';
import QuickMortalityForm from '../../components/forms/QuickMortalityForm';
import QuickEchographieForm from '../../components/forms/QuickEchographieForm';
import TruieEventActionSheet, { type TruieEventAction } from '../../components/forms/TruieEventActionSheet';

import Eyebrow from '../../components/design/Eyebrow';
import Chip from '../../components/design/Chip';
import SowHero, { type SowHeroChip } from '../../components/design/SowHero';
import { Tabs, Button, Card, IconBox, Tag, PageHeader, CycleTimeline, safeDisplay } from '@/design-system';
import EditTruieWizard from '../../components/forms/EditTruieWizard';
import { TruieIcon } from '../../components/icons';
import ReproTracker, { type ReproStage } from '../../components/design/ReproTracker';
import DecisionBinaire from '../../components/design/DecisionBinaire';
import MariusPanel from '../../components/design/MariusPanel';
import TimelineVerticale, { type TimelineItem } from '../../components/design/TimelineVerticale';
import NotesTimeline from '../../components/design/NotesTimeline';
import LineageBreadcrumb, { type LineageNode } from '../../components/design/LineageBreadcrumb';
import LineageTree from '../../components/design/LineageTree';
import TopBarSync from '../../components/design/TopBarSync';
import PhotoStrip from '../../components/PhotoStrip';

import type { Truie, BandePorcelets, Saillie, TraitementSante } from '../../types/farm';
import {
  getCurrentReproPhase,
  getRecommendedRation,
  isRationEcartSignificatif,
} from '../../services/rationCalculator';
import { FEED_CONFIG } from '../../config/feed';
import { labelStatutTruie } from '../../lib/labels';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

function formatDate(s?: string): string {
  if (!s) return '—';
  const d = parseDate(s);
  if (!d) return s;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatDateShort(s?: string): string {
  const d = parseDate(s);
  if (!d) return '—';
  const months = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function statutToChip(statut: string): SowHeroChip {
  const label = labelStatutTruie(statut);
  if (statut === 'Pleine' || statut === 'Maternité' || statut === 'En maternité') {
    return { label, tone: 'green' };
  }
  if (statut === 'À surveiller' || statut === 'En attente saillie') {
    return { label, tone: 'amber' };
  }
  if (statut === 'Réforme' || statut === 'Morte') {
    return { label, tone: 'pig' };
  }
  return { label, tone: 'neutral' };
}

// ─── Composant principal ─────────────────────────────────────────────────────

const TruieDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { truies, verrats, bandes, saillies, sante, refreshData } = useFarm();
  const [presentAlert] = useIonAlert();
  const [editOpen, setEditOpen] = useState(false);
  const [editWizardOpen, setEditWizardOpen] = useState(false);
  const [toast, setToast] = useState('');
  // V32 PHASE 4 — Refonte 4 onglets (apercu | repro | sante | historique).
  const [activeTab, setActiveTab] = useState<'apercu' | 'repro' | 'sante' | 'historique'>('apercu');
  const [treeOpen, setTreeOpen] = useState(false);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [saillieOpen, setSaillieOpen] = useState(false);
  const [miseBasOpen, setMiseBasOpen] = useState(false);
  const [mortalityOpen, setMortalityOpen] = useState(false);
  const [echoOpen, setEchoOpen] = useState(false);

  const handleEventAction = useCallback((action: TruieEventAction): void => {
    setEventSheetOpen(false);
    if (action === 'SAILLIE') setSaillieOpen(true);
    else if (action === 'MISE_BAS') setMiseBasOpen(true);
    else if (action === 'MORTALITE') setMortalityOpen(true);
    else if (action === 'ECHOGRAPHIE') setEchoOpen(true);
  }, []);

  // ── Données métier ─────────────────────────────────────────────────────────

  const truie = useMemo<Truie | undefined>(() =>
    truies.find(t => t.id === id || t.displayId === id),
  [truies, id]);

  const historique = useMemo<BandePorcelets[]>(() => {
    if (!truie) return [];
    // FIX V32 : `b.truie` est mappé sur `sows.code_id` (displayId) côté
    // supabaseService, pas sur l'UUID. On compare donc contre les 3 clés
    // possibles (uuid pour compat tests legacy, displayId pour BD réelle,
    // boucle pour compat ascendante).
    return bandes
      .filter(b =>
        b.truie === truie.id ||
        (!!truie.displayId && b.truie === truie.displayId) ||
        (!!truie.boucle && b.boucleMere === truie.boucle),
      )
      .sort((a, b) => (parseDate(a.dateMB)?.getTime() ?? 0) - (parseDate(b.dateMB)?.getTime() ?? 0));
  }, [bandes, truie]);

  const sowSaillies = useMemo<Saillie[]>(() => {
    if (!truie) return [];
    // FIX V32 : `s.truieId` est mappé sur `sows.code_id` (displayId) côté
    // supabaseService, pas sur l'UUID. On accepte les deux pour rester
    // compatible avec les fixtures tests (id === displayId).
    return [...saillies.filter(s =>
      s.truieId === truie.id ||
      (!!truie.displayId && s.truieId === truie.displayId),
    )]
      .sort((a, b) => (parseDate(b.dateSaillie)?.getTime() ?? 0) - (parseDate(a.dateSaillie)?.getTime() ?? 0));
  }, [saillies, truie]);

  const healthLogs = useMemo<TraitementSante[]>(() => {
    if (!truie) return [];
    return sante.filter(s => s.cibleType === 'TRUIE' && s.cibleId === truie.id);
  }, [sante, truie]);

  const lastBande = useMemo(() =>
    historique.length === 0 ? null : historique[historique.length - 1] ?? null,
  [historique]);

  const lastSaillie = sowSaillies[0] ?? null;

  // ── Cycle reproductif (J post-saillie) ─────────────────────────────────────

  const cycleData = useMemo(() => {
    if (!lastSaillie) return null;
    const sailDate = parseDate(lastSaillie.dateSaillie);
    if (!sailDate) return null;
    const today = new Date();
    const dayPost = Math.max(0, daysBetween(sailDate, today));
    // Cycle reference : 0-115 jours (gestation). On focalise visuellement sur 0-35
    // pour la fenêtre de surveillance retour chaleur. Stages couvrent 0-115.
    const total = 115;
    const progressPct = Math.min(100, (dayPost / total) * 100);

    const stages: ReproStage[] = [
      { day: 0, label: 'Saillie', state: dayPost >= 0 ? 'passed' : 'future', position: 0 },
      { day: 7, label: 'Surveillance verrat', state: dayPost >= 7 ? 'passed' : 'future', position: 6 },
      {
        day: 'J18-J24',
        label: 'Fenêtre retour chaleur',
        state: dayPost >= 18 && dayPost <= 24 ? 'current' : dayPost > 24 ? 'passed' : 'future',
        position: 19,
      },
      { day: 28, label: 'Échographie', state: dayPost >= 28 ? 'passed' : 'future', position: 24 },
      { day: 115, label: 'Mise-bas', state: dayPost >= 115 ? 'passed' : 'future', position: 100 },
    ];

    // Si la saillie est plus récente que J18, current = saillie (pour cas J0-J17).
    if (dayPost < 18) {
      stages[0] = { ...stages[0], state: 'current' };
    }

    return { sailDate, dayPost, total, progressPct, stages };
  }, [lastSaillie]);

  // ── Actions métier ─────────────────────────────────────────────────────────

  const handleConfirmGestation = useCallback(() => {
    if (!truie) return;
    enqueueUpdateRow('SUIVI_TRUIES_REPRODUCTION', 'ID', truie.id, { STATUT: 'Pleine' });
    setToast('Gestation confirmée');
  }, [truie]);

  const handleRetourChaleur = useCallback(() => {
    if (!truie) return;
    enqueueUpdateRow('SUIVI_TRUIES_REPRODUCTION', 'ID', truie.id, { STATUT: 'En attente saillie' });
    setToast('Retour en chaleur enregistré');
  }, [truie]);

  const handleReformer = useCallback(() => {
    if (!truie) return;
    presentAlert({
      header: 'Mise en réforme',
      message: `Confirmer la mise en réforme de la truie ${truie.displayId} ?`,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Confirmer',
          role: 'destructive',
          handler: () => {
            void enqueueUpdateRow('SUIVI_TRUIES_REPRODUCTION', 'ID', truie.id, { STATUT: 'Réforme' });
            setToast('Truie passée en réforme');
          },
        },
      ],
    });
  }, [presentAlert, truie]);

  // ── État non trouvé ─────────────────────────────────────────────────────────

  if (!truie) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <h1
            style={{
              fontFamily: 'var(--pt-font-display)',
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--pt-text)',
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
            }}
          >
            Truie introuvable
          </h1>
          <p style={{ marginTop: 8, color: 'var(--pt-text-muted)' }}>
            Cette truie n'existe pas dans les données de votre exploitation.
          </p>
          <div style={{ marginTop: 16 }}>
            <Button variant="ghost" size="sm" onClick={() => navigate('/troupeau')}>
              Retour au troupeau
            </Button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // ── Chips hero ─────────────────────────────────────────────────────────────

  const heroChips: SowHeroChip[] = [statutToChip(truie.statut)];
  if (lastBande?.idPortee) heroChips.push({ label: `Bande ${lastBande.idPortee}`, tone: 'terre' });

  // ── Lignée (kit v2.1) ─────────────────────────────────────────────────────
  const pariteCount = truie.nbPortees ?? historique.length;
  const lineageNodes: LineageNode[] = [
    {
      id: truie.displayId,
      label: pariteCount ? `Truie · ${pariteCount}e portée` : 'Truie',
      current: true,
    },
  ];

  // V41 Phase C1 : tagline supprimée du hero (redondante avec CycleTimeline qui
  // affiche déjà jour X/Y et étapes). Le statut est maintenant le subtitle du
  // PageHeader.

  // ── Fenêtre retour chaleur active ──────────────────────────────────────────

  const showRetourChaleur = cycleData && cycleData.dayPost >= 18 && cycleData.dayPost <= 24;

  // ── Mise-bas imminente (J-3 à J+5 sur dateMBPrevue) ───────────────────────
  const daysUntilMB = (() => {
    const d = parseDate(truie.dateMBPrevue);
    if (!d) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  })();
  const isPleine = /pleine|gestation|maternit/i.test(truie.statut);
  const showMiseBasCTA = isPleine && daysUntilMB !== null && daysUntilMB >= -5 && daysUntilMB <= 3;
  const miseBasCTALabel = (() => {
    if (daysUntilMB === null) return '';
    if (daysUntilMB === 0) return `${truie.displayId} doit mettre bas aujourd'hui`;
    if (daysUntilMB > 0) return `${truie.displayId} doit mettre bas dans ${daysUntilMB}j`;
    return `${truie.displayId} a dépassé la date prévue (+${Math.abs(daysUntilMB)}j)`;
  })();

  // ── Vitales : empty state si jamais saillie ───────────────────────────────
  const pariteVal = truie.nbPortees ?? historique.length;
  const showVitalesEmpty = pariteVal === 0 && truie.statut === 'En attente saillie';

  // ── Vitales (5 KPI) ────────────────────────────────────────────────────────

  const vitales = [
    {
      label: 'Statut',
      trend: '',
      value: truie.statut,
      valColor: 'var(--amber-pork-deep)',
    },
    {
      label: 'J post-saillie',
      trend: lastSaillie ? formatDate(lastSaillie.dateSaillie) : '',
      value: cycleData ? String(cycleData.dayPost) : '—',
      valColor: 'var(--ink)',
    },
    {
      label: 'Verrat',
      trend: `${sowSaillies.length} insémination${sowSaillies.length > 1 ? 's' : ''}`,
      value: lastSaillie?.verratId ?? '—',
      valColor: 'var(--ink)',
      sub: undefined as string | undefined,
    },
    {
      label: 'Poids',
      trend: '',
      value: truie.poids !== undefined ? `${truie.poids}` : '—',
      unit: 'kg',
      valColor: 'var(--ink)',
    },
    {
      label: 'Portées',
      trend: '',
      value: truie.nbPortees !== undefined ? `${truie.nbPortees}` : '—',
      unit: truie.nbPortees ? `portée${truie.nbPortees > 1 ? 's' : ''}` : '',
      valColor: 'var(--ink)',
    },
  ];

  // ── Timeline (sante + saillies + bandes) ───────────────────────────────────

  const timelineItems: TimelineItem[] = [
    ...healthLogs.map<TimelineItem>(h => ({
      type: 'health',
      date: formatDateShort(h.date),
      tag: 'Soin',
      title: h.typeSoin || 'Traitement',
      description: h.traitement || h.observation || '',
      meta: h.auteur ? `Saisi par ${h.auteur}` : undefined,
    })),
    ...sowSaillies.map<TimelineItem>(s => ({
      type: 'repro',
      date: formatDateShort(s.dateSaillie),
      tag: 'Saillie',
      title: `Insémination · ${s.verratId}`,
      description: `Saillie avec verrat ${s.verratId}.${s.statut ? ` Statut : ${s.statut}.` : ''}`,
      meta: s.notes,
    })),
    ...historique.map<TimelineItem>(b => ({
      type: 'repro',
      date: formatDateShort(b.dateMB),
      tag: 'Mise-bas',
      title: `Portée ${b.idPortee || b.id}`,
      description: `${b.nv ?? '—'} nés vivants${
        b.morts !== undefined
          ? `, ${b.morts} ${b.morts === 1 ? 'mort' : 'morts'}`
          : ''
      }.`,
    })),
  ]
    .filter(t => t.date !== '—')
    .slice(0, 12);

  // ── Marius (analyse synthétique) ───────────────────────────────────────────

  const mariusAnalysis = (() => {
    const nbSaillies = sowSaillies.length;
    const nbReussies = sowSaillies.filter(s => s.statut === 'CONFIRMEE').length;
    if (nbSaillies === 0) {
      return (
        <>
          Aucune saillie enregistrée pour cette truie. <strong className="ink">Surveille la première détection de chaleurs pour planifier la mise à la reproduction.</strong>
        </>
      );
    }
    return (
      <>
        {truie.displayId} compte <strong>{nbSaillies} saillies</strong> au registre dont <strong>{nbReussies} confirmées</strong>. Moyenne ferme : 12 % de retours. <strong className="ink">Si nouvel échec après cette saillie, point vétérinaire recommandé.</strong>
      </>
    );
  })();

  // ── Rendu ───────────────────────────────────────────────────────────────────

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <div
          style={{
            background: 'var(--bg-app)',
            minHeight: '100%',
            position: 'relative',
            paddingBottom: 80,
          }}
        >
          {/* TopBar synchro (composant partagé) */}
          <TopBarSync
            crumbs={[
              { label: 'Troupeau', href: '/troupeau' },
              { label: 'Truies', href: '/troupeau?view=truies' },
              `${truie.displayId}${truie.nom ? ` · ${truie.nom}` : ''}`,
            ]}
            onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
          />

          <div style={{ padding: '16px 22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* V41 Phase C1 — Header sobre via PageHeader (eyebrow + h1 + subtitle 1 ligne) */}
            <PageHeader
              eyebrow="Fiche truie"
              title={safeDisplay(truie.displayId)}
              subtitle={truie.statut || undefined}
            />

            {/* V41 Phase C1 — Hero compact dans 1 Card : IconBox 64x64 + tags + boutons à droite */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <IconBox variant="warm" size="medium">
                  <TruieIcon size={28} />
                </IconBox>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 160 }}>
                  <div style={{ fontFamily: 'var(--pt-font-display)', fontSize: 18, fontWeight: 700, color: 'var(--pt-text)' }}>
                    {safeDisplay(truie.nom ?? truie.boucle ?? truie.displayId)}
                    {truie.race ? <span style={{ fontFamily: 'var(--pt-font-body)', fontSize: 13, fontWeight: 400, color: 'var(--pt-text-muted)', marginLeft: 8 }}>— {truie.race}</span> : null}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {heroChips.map((c, i) => (
                      <span key={`${c.label}-${i}`}>
                        <Tag variant={c.tone === 'amber' ? 'warning' : c.tone === 'green' ? 'primary' : c.tone === 'pig' ? 'accent' : c.tone === 'terre' ? 'soft' : 'default'}>{c.label}</Tag>
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexShrink: 0, flexWrap: 'wrap' }}>
                  <Button variant="primary" size="sm" onClick={() => setEventSheetOpen(true)}>
                    + Saisir évènement
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setEditWizardOpen(true)}>
                    <Pencil size={14} strokeWidth={2} aria-hidden /> Modifier
                  </Button>
                </div>
              </div>
            </Card>

            {/* CTA Mise-bas imminente : J-3 → J+5 si truie Pleine */}
            {showMiseBasCTA && (
              <section aria-label="Mise-bas imminente" style={sectionStyle()}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Eyebrow dotColor="amber">Mise-bas imminente</Eyebrow>
                  <div
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 18,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {miseBasCTALabel}
                  </div>
                  <div>
                    <Button variant="primary" size="sm" onClick={() => setMiseBasOpen(true)}>
                      + Saisir la mise-bas
                    </Button>
                  </div>
                </div>
              </section>
            )}

            {/* V41 Phase C1 — Lignée déplacée dans onglet "Vue d'ensemble" */}

            {/* V32 PHASE 4 — Onglets (Vue d'ensemble · Reproduction · Santé · Historique) */}
            <Tabs
              ariaLabel="Sections de la fiche truie"
              value={activeTab}
              onChange={(id) => setActiveTab(id as typeof activeTab)}
              items={[
                { id: 'apercu', label: 'Vue d’ensemble' },
                { id: 'repro', label: 'Reproduction', count: sowSaillies.length || undefined },
                { id: 'sante', label: 'Santé', count: healthLogs.length || undefined },
                { id: 'historique', label: 'Historique' },
              ]}
            />

            {/* V40 F5/F6 — Cycle timeline horizontal (Saillie/Surveillance/Écho/MB) */}
            {cycleData && activeTab === 'apercu' && (
              <section aria-label="Cycle reproductif" style={sectionStyle()}>
                <CycleTimeline
                  currentDay={cycleData.dayPost}
                  totalDays={115}
                  eyebrow={`Saillie · jour ${cycleData.dayPost}/115`}
                  steps={[
                    { label: 'Saillie', day: 0, done: true },
                    { label: 'Surveillance', day: 7, done: cycleData.dayPost >= 7 },
                    { label: 'Échographie', day: 28, done: cycleData.dayPost >= 28 },
                    { label: 'Mise-bas', day: 115, done: false, target: true },
                  ]}
                />
              </section>
            )}

            {/* V41 Phase C1 — Lignée déplacée dans onglet "Vue d'ensemble" */}
            {activeTab === 'apercu' && (
              <LineageBreadcrumb nodes={lineageNodes} onTreeClick={() => setTreeOpen(true)} />
            )}

            {/* Reproduction en cours (visible dans Aperçu et Reproduction) */}
            {cycleData && (activeTab === 'apercu' || activeTab === 'repro') && (
              <section aria-label="Reproduction en cours" style={sectionStyle()}>
                <div style={{ marginBottom: 12 }}>
                  <Eyebrow dotColor="amber">Reproduction en cours</Eyebrow>
                </div>

                <ReproTracker stages={cycleData.stages} progressPct={cycleData.progressPct} />

                {showRetourChaleur && (
                  <div style={{ marginTop: 14 }}>
                    <DecisionBinaire
                      title="Action requise aujourd'hui"
                      subtitle={`${truie.nom ?? truie.displayId} est dans la fenêtre où elle peut revenir en chaleur. Présente le verrat ce matin et fais le test du dos.`}
                      hint="Si retour : la truie repasse au statut « En attente saillie ». Si pas de chaleur : nouveau check à J21, puis échographie à J28."
                      confirmLabel="Pas de chaleur"
                      returnLabel="Retour chaleur"
                      onConfirm={handleConfirmGestation}
                      onReturn={handleRetourChaleur}
                    />
                  </div>
                )}
              </section>
            )}

            {/* Vitales · 5 KPI (Aperçu uniquement) */}
            {activeTab === 'apercu' && (
            <section aria-label="Vitales">
              <div style={{ marginBottom: 12 }}>
                <Eyebrow>Vitales</Eyebrow>
              </div>
              {showVitalesEmpty ? (
                <div
                  style={{
                    background: 'var(--bg-surface)',
                    borderRadius: 12,
                    border: '1px solid var(--line)',
                    padding: '28px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 18,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Aucune saillie historique
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      color: 'var(--muted)',
                      maxWidth: 360,
                      lineHeight: 1.5,
                    }}
                  >
                    Lance la repro pour activer le suivi.
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <Button variant="primary" size="sm" onClick={() => setSaillieOpen(true)}>
                      + Saisir une saillie
                    </Button>
                  </div>
                </div>
              ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  background: 'var(--bg-surface)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: '1px solid var(--line)',
                }}
                className="sow-vitals"
              >
                {vitales.map((v, i) => {
                  const isEmpty = v.value === '—' || v.value == null || v.value === '';
                  return (
                  <div
                    key={v.label}
                    style={{
                      padding: '14px 16px',
                      background: 'var(--bg-surface)',
                      borderRight: i < vitales.length - 1 ? '1px solid var(--line)' : 'none',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: 'var(--muted)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <span>{v.label}</span>
                      {v.trend && (
                        <span style={{ color: 'var(--color-accent-500)' }}>{v.trend}</span>
                      )}
                    </div>
                    <div
                      title={isEmpty ? 'Donnée non disponible — saisir une saillie pour activer.' : undefined}
                      aria-label={isEmpty ? `${v.label} non disponible` : undefined}
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 22,
                        lineHeight: 1,
                        color: v.valColor,
                        fontWeight: 600,
                        letterSpacing: '-0.02em',
                        opacity: isEmpty ? 0.4 : 1,
                        cursor: isEmpty ? 'help' : 'default',
                      }}
                    >
                      {v.value}
                      {'unit' in v && v.unit && (
                        <small style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 2, fontWeight: 400 }}>
                          {' '}{v.unit}
                        </small>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
              )}
            </section>
            )}

            {/* Body 2 col (V32 PHASE 4 — restructuré en onglets) */}
            <div className="sow-body">
              {/* Colonne gauche */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
                {/* Identité (Aperçu uniquement) */}
                {activeTab === 'apercu' && (
                <section aria-label="Identité" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Eyebrow>Identité</Eyebrow>
                  <div
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: 12,
                      padding: '6px 16px',
                      boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04)',
                    }}
                  >
                    <DataRow label="Code · Boucle" value={`${truie.displayId} · ${truie.boucle}`} />
                    {truie.race && <DataRow label="Race" value={truie.race} />}
                    {truie.dateNaissance && (
                      <DataRow label="Naissance" value={formatDate(truie.dateNaissance)} />
                    )}
                    {truie.origine && <DataRow label="Origine" value={truie.origine} />}
                    <DataRow label="Loge" value={truie.loge || '—'} last />
                  </div>
                </section>
                )}

                {/* Repro & rations (Reproduction uniquement) */}
                {activeTab === 'repro' && (
                <section aria-label="Repro et rations" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Eyebrow>Repro &amp; rations</Eyebrow>
                  <div
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: 12,
                      padding: '6px 16px',
                      boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04)',
                    }}
                  >
                    <DataRow label="Statut" value={labelStatutTruie(truie.statut)} />
                    {truie.stade && <DataRow label="Stade" value={truie.stade} />}
                    <DataRow
                      label="NB portées"
                      value={truie.nbPortees !== undefined ? String(truie.nbPortees) : '—'}
                    />
                    {truie.derniereNV !== undefined && (
                      <DataRow label="Dernière NV" value={String(truie.derniereNV)} />
                    )}
                    {lastBande?.idPortee && (
                      <DataRow label="Dernière portée" value={lastBande.idPortee} />
                    )}
                    {truie.dateMBPrevue && (
                      <DataRow label="Date MB prévue" value={formatDate(truie.dateMBPrevue)} />
                    )}
                    <DataRowEditable
                      label="Ration"
                      ariaLabel={`Ration journalière de la truie ${truie.displayId}`}
                      last={!lastBande}
                    >
                      <EditableNumber
                        value={truie.ration ?? null}
                        min={0}
                        max={20}
                        step={0.1}
                        unit="kg/j"
                        ariaLabel={`Ration journalière de la truie ${truie.displayId}`}
                        onSave={async (v) => {
                          const res = await updateSow(truie.id, { ration_kg_j: v });
                          if (res.success) await refreshData();
                          return res;
                        }}
                      />
                    </DataRowEditable>
                    {lastBande && (
                      <DataRowEditable
                        label="Nés vivants (portée courante)"
                        ariaLabel={`Nés vivants de la portée ${lastBande.idPortee || lastBande.id}`}
                        last
                      >
                        <EditableNumber
                          value={lastBande.nv ?? null}
                          min={0}
                          max={30}
                          step={1}
                          unit="porcelets"
                          ariaLabel={`Nés vivants de la portée ${lastBande.idPortee || lastBande.id}`}
                          onSave={async (v) => {
                            const res = await updateBatch(lastBande.id, { porcelets_nes_vivants: v });
                            if (res.success) await refreshData();
                            return res;
                          }}
                        />
                      </DataRowEditable>
                    )}
                  </div>
                </section>
                )}

                {/* Plan ration recommandée (V21-D3) — Reproduction uniquement */}
                {activeTab === 'repro' && <RationRecoBlock truie={truie} />}

                {/* Historique saillies — Reproduction uniquement */}
                {activeTab === 'repro' && (
                <section aria-label="Historique saillies" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Eyebrow>Historique saillies</Eyebrow>
                  {sowSaillies.length === 0 ? (
                    <div
                      style={{
                        background: 'var(--bg-surface)',
                        borderRadius: 12,
                        padding: '24px 22px',
                        textAlign: 'center',
                        fontSize: 12,
                        color: 'var(--muted)',
                        fontStyle: 'italic',
                      }}
                    >
                      Aucune saillie enregistrée
                    </div>
                  ) : (
                    <div
                      style={{
                        background: 'var(--bg-surface)',
                        borderRadius: 12,
                        padding: '4px 14px',
                        boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04)',
                      }}
                    >
                      {sowSaillies.slice(0, 6).map((s, i) => (
                        <SaillieRow key={`${s.dateSaillie}-${i}`} saillie={s} num={sowSaillies.length - i} last={i === Math.min(5, sowSaillies.length - 1)} />
                      ))}
                    </div>
                  )}
                </section>
                )}

                {/* Notes inline + journal santé — Onglet "Santé" */}
                {activeTab === 'sante' && (
                <>
                <section aria-label="Notes" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Eyebrow>Notes terrain</Eyebrow>
                  <div
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: 12,
                      padding: '14px 16px',
                      boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04)',
                    }}
                  >
                    <EditableText
                      value={truie.notes ?? null}
                      multiline
                      maxLength={500}
                      ariaLabel={`Notes de la truie ${truie.displayId}`}
                      placeholder="Ajouter une note (Cmd+Entrée pour sauver)…"
                      onSave={async (v) => {
                        const res = await updateSow(truie.id, { notes: v });
                        if (res.success) await refreshData();
                        return res;
                      }}
                    />
                  </div>
                </section>

                {/* Historique des notes terrain (V21-6 C2) */}
                <NotesTimeline
                  subjectType="TRUIE"
                  subjectId={truie.id}
                  subjectLabel={truie.boucle ?? truie.displayId ?? undefined}
                />
                </>
                )}

                {/* Photos (V25 — documentation visuelle) — Onglet "Historique" */}
                {activeTab === 'historique' && (
                <section aria-label="Photos" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Eyebrow>Photos</Eyebrow>
                  <PhotoStrip subjectType="TRUIE" subjectId={truie.id} />
                </section>
                )}
              </div>

              {/* Séparateur vertical */}
              <div className="sow-vsep" aria-hidden />

              {/* Colonne droite */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minWidth: 0 }}>
                {/* Marius — Aperçu */}
                {activeTab === 'apercu' && (
                <section aria-label="Lecture du dossier" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Eyebrow dotColor="amber">Lecture du dossier · Marius</Eyebrow>
                  <MariusPanel title="Analyse automatique">{mariusAnalysis}</MariusPanel>
                </section>
                )}

                {/* Journal — Historique */}
                {activeTab === 'historique' && (
                <section aria-label="Journal" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <Eyebrow>Journal · 30 derniers jours</Eyebrow>
                  <TimelineVerticale items={timelineItems} />
                </section>
                )}

                {/* Actions métier contextuelles — Aperçu */}
                {activeTab === 'apercu' && (
                <section aria-label="Actions métier" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Eyebrow>Actions</Eyebrow>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(truie.statut === 'À surveiller' || truie.statut === 'Réforme') && (
                      <Button variant="danger" size="sm" onClick={handleReformer}>
                        Passer en réforme
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditWizardOpen(true)}
                      ariaLabel={`Éditer la fiche de la truie ${safeDisplay(truie.displayId)}`}
                    >
                      Éditer la fiche
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.print()}
                      ariaLabel={`Imprimer la fiche de la truie ${safeDisplay(truie.displayId)}`}
                    >
                      <Printer size={13} strokeWidth={2} aria-hidden />
                      Imprimer la fiche
                    </Button>
                  </div>
                </section>
                )}
              </div>
            </div>
          </div>

          {/* FAB Marius : rendu globalement dans App.tsx via ChatbotWidget — pas de double instance ici. */}
        </div>

        {/* Sheet édition (legacy — gardé pour rétrocompat tests) */}
        <QuickEditTruieForm
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          truie={truie}
        />

        {/* V32 PHASE 4 — Wizard d'édition 3 étapes (par défaut) */}
        <EditTruieWizard
          isOpen={editWizardOpen}
          onClose={() => setEditWizardOpen(false)}
          truie={truie}
        />

        {/* Sheet sélection évènement */}
        <TruieEventActionSheet
          isOpen={eventSheetOpen}
          onClose={() => setEventSheetOpen(false)}
          truieDisplayId={truie.displayId}
          truieStatut={truie.statut}
          onSelect={handleEventAction}
        />

        {/* Formulaires métier */}
        <QuickSaillieForm
          isOpen={saillieOpen}
          onClose={() => setSaillieOpen(false)}
          defaultTruieDisplayId={truie.displayId}
        />
        <QuickMiseBasForm
          isOpen={miseBasOpen}
          onClose={() => setMiseBasOpen(false)}
          defaultTruieId={truie.displayId}
        />
        <QuickMortalityForm
          isOpen={mortalityOpen}
          onClose={() => setMortalityOpen(false)}
        />
        <QuickEchographieForm
          isOpen={echoOpen}
          onClose={() => setEchoOpen(false)}
          defaultTruieDisplayId={truie.displayId}
        />

        {/* Modal arbre généalogique */}
        <IonModal isOpen={treeOpen} onDidDismiss={() => setTreeOpen(false)}>
          <IonContent>
            <div style={{ padding: 18 }}>
              <LineageTree
                rootTruieId={truie.id}
                truies={truies}
                verrats={verrats}
                bandes={bandes}
                saillies={saillies}
              />
              <div style={{ marginTop: 16 }}>
                <Button variant="secondary" size="sm" onClick={() => setTreeOpen(false)}>
                  Fermer l'arbre
                </Button>
              </div>
            </div>
          </IonContent>
        </IonModal>

        <IonToast
          isOpen={!!toast}
          message={toast}
          duration={2000}
          onDidDismiss={() => setToast('')}
        />

        <style>{`
          .sow-body {
            display: grid;
            grid-template-columns: 1.05fr 1px 1fr;
            gap: 24px;
          }
          @media (max-width: 900px) {
            .sow-body { grid-template-columns: 1fr; gap: 24px; }
            .sow-vsep { display: none; }
            .sow-vitals { grid-template-columns: repeat(2, 1fr) !important; }
            .sow-hero { grid-template-columns: 1fr !important; }
            .sow-hero > div:first-child { min-height: 200px !important; }
          }
          .sow-vsep { background: var(--line); }
        `}</style>
      </IonContent>
    </IonPage>
  );
};

// ─── Sous-composants locaux ──────────────────────────────────────────────────

function sectionStyle(): React.CSSProperties {
  return {
    background: 'var(--bg-surface)',
    borderRadius: 12,
    padding: '18px 24px 22px',
    border: '1px solid var(--line)',
  };
}

function DataRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'max-content 1fr',
        columnGap: 20,
        padding: '9px 0',
        borderBottom: last ? 'none' : '1px solid var(--line-2)',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--muted)',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13.5,
          color: 'var(--ink)',
          fontWeight: 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function DataRowEditable({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  ariaLabel?: string;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'max-content 1fr',
        columnGap: 20,
        padding: '9px 0',
        borderBottom: last ? 'none' : '1px solid var(--line-2)',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--muted)',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
      <span style={{ textAlign: 'left' }}>{children}</span>
    </div>
  );
}

const SaillieRow: React.FC<{ saillie: Saillie; num: number; last: boolean }> = ({ saillie, num, last }) => {
  const tone = saillie.statut === 'ECHEC' || saillie.statut === 'RETOUR' ? 'return' : saillie.statut === 'EN_ATTENTE' || saillie.statut === undefined ? 'pending' : 'ok';
  const numColors: Record<typeof tone, { bg: string; fg: string }> = {
    ok: { bg: 'var(--color-accent-100)', fg: 'var(--color-accent-600)' },
    return: { bg: 'var(--pig-soft)', fg: 'var(--pig-deep)' },
    pending: { bg: 'var(--amber-pork-soft)', fg: 'var(--amber-pork-deep)' },
  };
  const c = numColors[tone];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr auto',
        gap: 12,
        padding: '11px 0',
        alignItems: 'center',
        borderBottom: last ? 'none' : '1px solid var(--line-2)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          background: c.bg,
          color: c.fg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 500,
        }}
      >
        S{String(num).padStart(2, '0')}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 14,
          lineHeight: 1.2,
          color: 'var(--ink)',
          fontWeight: 600,
          letterSpacing: '-0.005em',
        }}
      >
        {formatDate(saillie.dateSaillie)} · {saillie.verratId}
        <small
          style={{
            display: 'block',
            fontFamily: 'var(--font-body)',
            fontSize: 11.5,
            color: 'var(--muted)',
            marginTop: 2,
            fontWeight: 400,
          }}
        >
          {saillie.statut ?? 'Statut non renseigné'}
          {saillie.notes ? ` · ${saillie.notes}` : ''}
        </small>
      </div>
      <div style={{ textAlign: 'right' }}>
        <Chip tone={tone === 'return' ? 'pig' : tone === 'pending' ? 'amber' : 'green'}>
          {saillie.statut ?? 'En cours'}
        </Chip>
      </div>
    </div>
  );
};

/**
 * RationRecoBlock — recommandation ration / phase repro courante (V21-D3).
 * Calcule live : phase + ration recommandée + écart vs ration saisie.
 */
const RationRecoBlock: React.FC<{ truie: Truie }> = ({ truie }) => {
  const today = new Date();
  const phase = getCurrentReproPhase(truie, today);
  const reco = getRecommendedRation(truie, today);
  const ecart = isRationEcartSignificatif(truie, today);
  const phaseCfg = phase ? FEED_CONFIG[phase] : null;

  // Si aucune phase identifiée, on n'affiche rien (évite bruit visuel inutile).
  if (!phaseCfg) return null;

  return (
    <section aria-label="Plan ration recommandée" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Eyebrow dotColor="amber">Plan ration recommandée</Eyebrow>
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 12,
          padding: '14px 16px',
          boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          Phase courante
        </div>
        <div
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
          }}
        >
          {phaseCfg.label}
        </div>
        {phaseCfg.description ? (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{phaseCfg.description}</div>
        ) : null}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginTop: 4,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginBottom: 4,
              }}
            >
              Recommandée
            </div>
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 22,
                fontWeight: 600,
                color: 'var(--ink)',
                letterSpacing: '-0.02em',
              }}
            >
              {reco.toFixed(1)}{' '}
              <small style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>kg/j</small>
            </div>
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                marginBottom: 4,
              }}
            >
              Saisie
            </div>
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 22,
                fontWeight: 600,
                color: ecart ? 'var(--amber-pork-deep)' : 'var(--ink)',
                letterSpacing: '-0.02em',
              }}
            >
              {Number.isFinite(truie.ration) ? truie.ration.toFixed(1) : '—'}{' '}
              <small style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>kg/j</small>
            </div>
          </div>
        </div>
        {ecart ? (
          <div
            role="status"
            style={{
              marginTop: 4,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'var(--pt-surface-warm)',
              color: 'var(--pt-accent-deep)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Écart &gt; 0,5 kg vs recommandée
          </div>
        ) : null}
        <div
          style={{
            fontSize: 11.5,
            color: 'var(--muted)',
            fontFamily: 'var(--font-body)',
          }}
        >
          Aliment référence : <strong style={{ color: 'var(--ink)' }}>{phaseCfg.aliment_ref}</strong>
        </div>
      </div>
    </section>
  );
};

export default TruieDetailView;
