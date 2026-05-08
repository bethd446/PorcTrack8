import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonModal, IonSpinner } from '@ionic/react';
import {
  AlertCircle, Activity, ClipboardList, ChevronRight,
  Stethoscope, TrendingUp, CalendarClock, CheckCircle2,
  Edit3, Home, MapPin, Move, Tag, Plus, ClipboardCheck, Split,
} from 'lucide-react';
import PhotoUpload from '../../../v70/components/v70/PhotoUpload';
import PhotoGallery from '../../../v70/components/v70/PhotoGallery';
import { Chip, AnimalListItem } from '../../../components/agritech';
import { computeBandePhase } from '../../../services/bandesAggregator';
import QuickNoteForm from '../../../components/forms/QuickNoteForm';
import QuickHealthForm from '../../../components/forms/QuickHealthForm';
import QuickEditBandeForm from '../../../components/forms/QuickEditBandeForm';
import QuickMoveSubjectForm from '../../../components/forms/QuickMoveSubjectForm';
import QuickAddPorceletForm from '../../../components/forms/QuickAddPorceletForm';
import QuickEditPorceletForm from '../../../components/forms/QuickEditPorceletForm';
import QuickHealthLogPorceletForm from '../../../components/forms/QuickHealthLogPorceletForm';
import QuickSplitBandeForm from '../../../components/forms/QuickSplitBandeForm';
import NotesTimeline from '../../../components/design/NotesTimeline';
import TopBarSync from '../../../components/design/TopBarSync';
import BandeCroissanceCard from '../../../components/bande/BandeCroissanceCard';
import TruieIcon from '../../../components/icons/TruieIcon';
import { useFarm } from '../../../context/FarmContext';
import { getJournalSante, getNotesTerrain } from '../../../services/supabaseService';
import {
  getBatchSources,
  getLogeContents,
  listLoges,
  listLogesEffectivesParBande,
  listPorceletsByBatch,
  type BandeLogeEffective,
} from '../../../services/supabaseWrites';
import { useNoUUID, Button, Card, PageHeader, Tabs, Tag as DsTag, CycleTimeline } from '@/design-system';
import { EntityAvatar } from '../../../components/ds/EntityAvatar';
import {
  getRecommendedHealthLogs,
  HEALTH_LOG_TEMPLATES,
  type HealthLogType,
} from '../../../services/healthProtocolPlanner';
import TableRowEdit from '../TableRowEdit';
import type { AggregatedBande, DebugMeta, SheetRawRow } from './types';
import type {
  BatchSource,
  Loge,
  PorceletIndividuel,
  PorceletStatut,
} from '../../../types/farm';

interface BandeDetailViewProps {
  bande: AggregatedBande;
  header: string[];
  meta: DebugMeta | null;
  onClose: () => void;
  onRefresh: () => void;
}

type BandeTabId = 'overview' | 'details' | 'sante' | 'notes';

const BandeDetailView: React.FC<BandeDetailViewProps> = ({ bande, header, meta, onClose, onRefresh }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<BandeTabId>('overview');
  const [editRow, setEditRow] = useState<SheetRawRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [healthData, setHealthData] = useState<SheetRawRow[]>([]);
  const [healthHeader, setHealthHeader] = useState<string[]>([]);
  const [notesData, setNotesData] = useState<SheetRawRow[]>([]);
  const [notesHeader, setNotesHeader] = useState<string[]>([]);
  const { notes: notesAsNotes, getBandeById, bandes: allBandes } = useFarm();

  // V42-pre : garde défensive `if (!bande?.id) return ...` déplacée APRÈS tous
  // les hooks (juste avant le return JSX principal) pour respecter
  // react-hooks/rules-of-hooks. Tous les hooks ci-dessous tolèrent désormais
  // un `bande` undefined via narrowing local (`const id = bande?.id`).
  const bandeTyped = bande?.id ? getBandeById(bande.id) : undefined;

  // V38-A — H1 affiche idPortee (code lisible: B01, L5RM…) jamais l'UUID brut.
  const portéeLabel = bandeTyped?.idPortee || '—';
  useNoUUID(`Portée ${portéeLabel}`, 'BandeDetailView.h1');

  // V6-B — Sources multi-mères + loge structurée
  const [sources, setSources] = useState<BatchSource[]>([]);
  const [loges, setLoges] = useState<Loge[]>([]);
  const [logeOccupation, setLogeOccupation] = useState<number | null>(null);
  // V72-P4 — Loges effectives (1 ou 2) déduites de porcelets_individuels.loge_id
  const [logesEffectives, setLogesEffectives] = useState<BandeLogeEffective[]>([]);
  const [editBandeOpen, setEditBandeOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  // V25 — Porcelets individuels rattachés à la bande
  const [porcelets, setPorcelets] = useState<PorceletIndividuel[]>(
    bandeTyped?.porcelets ?? [],
  );
  const [addPorceletOpen, setAddPorceletOpen] = useState(false);
  const [editPorcelet, setEditPorcelet] = useState<PorceletIndividuel | null>(null);
  const [healthLogPorceletOpen, setHealthLogPorceletOpen] = useState(false);
  // V36-E P3 — Splitter une bande
  const [splitOpen, setSplitOpen] = useState(false);
  const [photosRefreshKey, setPhotosRefreshKey] = useState(0);

  const currentLoge = useMemo<Loge | undefined>(() => {
    const id = bandeTyped?.logeId;
    if (!id) return undefined;
    return loges.find(l => l.id === id);
  }, [bandeTyped?.logeId, loges]);

  // Total porcelets apportés par les truies sources
  const sourcesTotal = useMemo(
    () => sources.reduce((acc, s) => acc + (s.nbPorceletsApportes ?? 0), 0),
    [sources],
  );

  const nesVivants = bandeTyped?.nv ?? Number(bande?.nv ?? 0);
  const ecart = sourcesTotal - nesVivants;

  // V28-CTA — Daily Check disponible uniquement pour les bandes en phase Sous mère.
  const isSousMere = useMemo(
    () => (bandeTyped ? computeBandePhase(bandeTyped) === 'SOUS_MERE' : false),
    [bandeTyped],
  );

  // V38-A — Splitter visible si phase ∈ {SOUS_MERE, POST_SEVRAGE, CROISSANCE,
  // ENGRAISSEMENT} ET ≥ 2 porcelets. Élargi vs V36-E pour permettre le split
  // post-sevrage (séparation par sexe ou regroupement) à toutes les phases.
  const canSplit = useMemo(() => {
    if (!bandeTyped) return false;
    if (porcelets.length < 2) return false;
    const phase = computeBandePhase(bandeTyped);
    return (
      phase === 'SOUS_MERE' ||
      phase === 'POST_SEVRAGE' ||
      phase === 'CROISSANCE' ||
      phase === 'ENGRAISSEMENT'
    );
  }, [bandeTyped, porcelets.length]);

  const loadSources = useCallback(async () => {
    const id = bande?.id;
    if (!id) return;
    try {
      const rows = await getBatchSources(id);
      setSources(rows);
    } catch (e) {
      console.warn('[bande-detail] getBatchSources failed', e);
    }
  }, [bande?.id]);

  const loadLogeData = useCallback(async () => {
    try {
      const rows = await listLoges();
      setLoges(rows);
    } catch (e) {
      console.warn('[bande-detail] listLoges failed', e);
    }
    if (bandeTyped?.logeId) {
      try {
        const c = await getLogeContents(bandeTyped.logeId);
        setLogeOccupation(c.totalAnimaux);
      } catch (e) {
        console.warn('[bande-detail] getLogeContents failed', e);
      }
    } else {
      setLogeOccupation(null);
    }
  }, [bandeTyped?.logeId]);

  const loadPorcelets = useCallback(async () => {
    const id = bande?.id;
    if (!id) return;
    try {
      const rows = await listPorceletsByBatch(id);
      setPorcelets(rows);
    } catch (e) {
      console.warn('[bande-detail] listPorceletsByBatch failed', e);
    }
  }, [bande?.id]);

  // V72-P4 — Loges effectives déduites des porcelets (1 bande peut avoir 2 loges F+M)
  const loadLogesEffectives = useCallback(async () => {
    const id = bande?.id;
    if (!id) return;
    try {
      const rows = await listLogesEffectivesParBande(id);
      setLogesEffectives(rows);
    } catch (e) {
      console.warn('[bande-detail] listLogesEffectivesParBande failed', e);
    }
  }, [bande?.id]);

  useEffect(() => {
    loadSources();
    loadLogeData();
    loadPorcelets();
    loadLogesEffectives();
  }, [loadSources, loadLogeData, loadPorcelets, loadLogesEffectives]);

  // Set unicité boucles (toutes les bandes du context, même celles non chargées
  // localement). On utilise les porcelets locaux comme proxy. Pour une unicité
  // globale ferme parfaite, l'erreur DB (UNIQUE constraint) reste le filet final.
  const existingBoucles = useMemo(() => {
    const s = new Set<string>();
    for (const p of porcelets) s.add(p.boucle.toUpperCase());
    return s;
  }, [porcelets]);

  // V36-E P3 — Liste enrichie de tous les porcelets de la ferme pour détecter
  // les doublons boucle+sexe (warning non-bloquant côté UI).
  const allPorcelets = useMemo<PorceletIndividuel[]>(() => {
    const acc: PorceletIndividuel[] = [];
    for (const b of allBandes) {
      if (b.porcelets) {
        for (const p of b.porcelets) acc.push(p);
      }
    }
    // Inclut aussi les porcelets de la bande courante s'ils ne sont pas
    // encore propagés au context (loadPorcelets local).
    for (const p of porcelets) {
      if (!acc.some(x => x.id === p.id)) acc.push(p);
    }
    return acc;
  }, [allBandes, porcelets]);

  const resolveBatchCodeId = useCallback(
    (id: string): string | undefined => {
      const b = allBandes.find(x => x.id === id);
      return b?.idPortee || b?.id;
    },
    [allBandes],
  );

  // Couleurs statut chip — palette agritech (Chip tones)
  const STATUT_TONE: Record<PorceletStatut, 'accent' | 'amber' | 'red' | 'default' | 'blue'> = {
    VIVANT: 'accent',
    MALADE: 'amber',
    MORT: 'red',
    VENDU: 'default',
    QUARANTAINE: 'blue',
  };

  const loadRelatedData = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, notesRes] = await Promise.all([
        getJournalSante(),
        getNotesTerrain(),
      ]);
      if (healthRes.success) {
        setHealthHeader(['DATE', 'TYPE', 'CIBLE_ID', 'TRAITEMENT', 'OBSERVATION']);
        setHealthData(healthRes.data.map(h => [
          h.date, h.cibleType, h.cibleId, h.traitement, h.observation,
        ] as SheetRawRow));
      }
      if (notesRes.success) {
        setNotesHeader(['DATE', 'CATEGORIE', 'NOTE', 'AUTEUR']);
        setNotesData(notesRes.data.map(n => [
          n.date, n.animalType, n.texte, n.auteur ?? '',
        ] as SheetRawRow));
      }
    } catch (e) {
      console.error('Error loading related data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRelatedData();
  }, [loadRelatedData]);

  const filteredHealth = useMemo(() => {
    const id = bande?.id;
    if (!id || healthData.length === 0) return [];
    const typeIdx = healthHeader.findIndex(h => ['CIBLE_TYPE', 'SUJET_TYPE', 'TYPE'].includes(h.toUpperCase()));
    const idIdx = healthHeader.findIndex(h => ['CIBLE_ID', 'SUJET_ID', 'ID', 'BOUCLE'].includes(h.toUpperCase()));

    if (idIdx === -1) return [];

    return healthData.filter(r => {
      const rowId = String(r[idIdx]).trim().toUpperCase();
      const targetId = String(id).trim().toUpperCase();
      const rowType = typeIdx !== -1 ? String(r[typeIdx]).trim().toUpperCase() : 'BANDE';
      return rowId === targetId && (rowType === 'BANDE' || typeIdx === -1);
    });
  }, [healthData, healthHeader, bande?.id]);

  // ── Protocole sanitaire recommandé selon phase de la bande ────────────
  const recommendedHealth = useMemo(() => {
    if (!bandeTyped) return [];
    const recos = getRecommendedHealthLogs(bandeTyped, new Date());
    if (recos.length === 0) return recos;
    // Croise avec l'historique health_logs pour marquer "déjà fait".
    const typeIdx = healthHeader.findIndex(h => h.toUpperCase().includes('TYPE'));
    const idIdx = healthHeader.findIndex(h => ['CIBLE_ID', 'SUJET_ID', 'ID', 'BOUCLE'].includes(h.toUpperCase()));
    const doneTypes = new Set<string>();
    const id = bande?.id;
    if (id && typeIdx !== -1 && idIdx !== -1) {
      for (const r of healthData) {
        if (String(r[idIdx]).trim().toUpperCase() === String(id).trim().toUpperCase()) {
          doneTypes.add(String(r[typeIdx]).trim().toUpperCase());
        }
      }
    }
    return recos.map(r => ({ ...r, done: doneTypes.has(r.type) }));
  }, [bandeTyped, bande?.id, healthHeader, healthData]);

  const [presetType, setPresetType] = useState<HealthLogType | undefined>(undefined);

  const filteredNotes = useMemo(() => {
    const id = bande?.id;
    if (!id || notesData.length === 0) return [];
    const typeIdx = notesHeader.findIndex(h => ['SUBJECTTYPE', 'TYPE_SUJET'].includes(h.toUpperCase()));
    const idIdx = notesHeader.findIndex(h => ['SUBJECTID', 'ID_SUJET'].includes(h.toUpperCase()));

    if (idIdx !== -1 && typeIdx !== -1) {
      return notesData.filter(r =>
        String(r[idIdx]).trim().toUpperCase() === String(id).trim().toUpperCase() &&
        String(r[typeIdx]).trim().toUpperCase() === 'BANDE'
      );
    }
    return notesData.filter(r => r.some(cell => String(cell).trim().toUpperCase() === String(id).trim().toUpperCase()));
  }, [notesData, notesHeader, bande?.id]);

  // V42-pre : early return déplacé ICI (juste avant le JSX) pour respecter
  // react-hooks/rules-of-hooks. Tous les hooks ci-dessus tolèrent un
  // `bande` undefined via narrowing local.
  if (!bande?.id) {
    return (
      <div className="agritech-root p-10 text-center flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-[14px] uppercase text-text-1">Bande introuvable</p>
        <Button
          variant="primary"
          onClick={onClose ?? (() => navigate(-1))}
          className="pressable h-11 px-6 rounded-md bg-accent text-bg-0 text-[12px] uppercase tracking-wide"
        >
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="agritech-root h-full flex flex-col">
      <TopBarSync
        crumbs={['Élevage', 'Bandes', portéeLabel]}
        onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
      />

      <IonContent className="ion-no-padding">
        <div
          className="px-4 pt-5 pb-44 flex flex-col gap-5"
          style={{ maxWidth: 1100, margin: '0 auto' }}
          data-testid="bande-detail-view"
        >
          {/* V71 lisibilité : subtitle enrichi (statut + jour + nb vivants) au lieu d'un placeholder générique. */}
          <PageHeader
            eyebrow="Élevage · Bande"
            title={portéeLabel}
            subtitle={(() => {
              const parts: string[] = [];
              if (bande.status) parts.push(String(bande.status));
              if (bande.age != null) parts.push(`J${bande.age}`);
              const v = bandeTyped?.vivants ?? Number(bande.vivants ?? 0);
              if (v > 0) parts.push(`${v} vivants`);
              return parts.length > 0 ? parts.join(' · ') : 'Suivi de la bande';
            })()}
          />

          {/* V45 P3C — Hero compact archétype 4 : EntityAvatar + tags + actions */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <EntityAvatar
                species="bande"
                photoUrl={bandeTyped?.photoUrl}
                size="xl"
                shortCode={bandeTyped?.idPortee ?? portéeLabel}
              />
              <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontFamily: 'var(--pt-font-display)', fontSize: 18, fontWeight: 700, color: 'var(--pt-text)' }}>
                  Bande {portéeLabel}
                  {bandeTyped?.dateMB ? (
                    <span style={{ fontFamily: 'var(--pt-font-body)', fontSize: 13, fontWeight: 400, color: 'var(--pt-text-muted)', marginLeft: 8 }}>
                      — MB {String(bandeTyped.dateMB)}
                    </span>
                  ) : null}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {bandeTyped?.statut ? (
                    <DsTag variant={(() => {
                      const s = String(bandeTyped.statut).toUpperCase();
                      if (s.includes('SEVR')) return 'accent';
                      if (s.includes('SOUS')) return 'primary';
                      if (s.includes('CROIS') || s.includes('FINIT') || s.includes('ENGRA')) return 'soft';
                      return 'default';
                    })() as 'default' | 'primary' | 'accent' | 'soft'}>
                      {bandeTyped.statut}
                    </DsTag>
                  ) : null}
                  {(() => {
                    const v = bandeTyped?.vivants ?? Number(bande.vivants ?? 0);
                    return v > 0 ? <DsTag variant="soft">{v} vivants</DsTag> : null;
                  })()}
                  {bande.age != null ? (
                    <DsTag variant="default">{bande.age} j</DsTag>
                  ) : null}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexShrink: 0, flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveTab('sante')}
                  ariaLabel="Saisir un évènement"
                >
                  + Saisir évènement
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditBandeOpen(true)}
                  ariaLabel="Modifier la bande"
                  disabled={!bandeTyped}
                >
                  Modifier
                </Button>
              </div>
            </div>
          </Card>

          {/* V45 PHASE 4 — Onglets uniformisés UPPERCASE (sémantique préservée) */}
          <Tabs
            ariaLabel="Sections de la fiche bande"
            value={activeTab}
            onChange={(id) => setActiveTab(id as BandeTabId)}
            options={[
              { value: 'overview', label: "VUE D'ENSEMBLE" },
              { value: 'details', label: 'DÉTAILS' },
              { value: 'sante', label: 'SANTÉ', count: filteredHealth.length || undefined },
              { value: 'notes', label: 'NOTES' },
            ]}
          />

          {activeTab === 'overview' && (
            <div className="flex flex-col gap-4">
              <PhotoUpload
                entityType="batches"
                entityId={bande.id}
                multiple
                maxPhotos={20}
                onUploaded={() => setPhotosRefreshKey((k) => k + 1)}
              />
              <PhotoGallery
                entityType="batches"
                entityId={bande.id}
                refreshKey={photosRefreshKey}
              />

              {(() => {
                const age = bande.age ?? 0;
                const status = (bande.status as string) || '';
                const isSevre = status.toUpperCase().includes('SEVRÉ');
                // Phases bande : Maternité (0-21j), Sevrage (J21), Post-sevrage (J28), Engraissement (J70)
                const PHASE_DAYS = { maternite: 0, sevrage: 21, postSevrage: 28, engraissement: 70 } as const;
                const reached = (d: number) => age >= d || (isSevre && d <= PHASE_DAYS.postSevrage);
                return (
                  <CycleTimeline
                    eyebrow="Cycle bande"
                    currentDay={Math.min(Math.max(age, 0), 180)}
                    totalDays={180}
                    steps={[
                      { label: 'Maternité', day: PHASE_DAYS.maternite, done: reached(PHASE_DAYS.sevrage) },
                      { label: 'Sevrage', day: PHASE_DAYS.sevrage, done: reached(PHASE_DAYS.postSevrage) },
                      { label: 'Post-sevrage', day: PHASE_DAYS.postSevrage, done: reached(PHASE_DAYS.engraissement) },
                      { label: 'Engraissement', day: PHASE_DAYS.engraissement, done: false, target: true },
                    ]}
                  />
                );
              })()}

              {/* V28-CTA — Daily Check du jour (bandes Sous mère uniquement) */}
              {isSousMere && (
                <Button
                  variant="primary"
                  fullWidth
                  data-testid="bande-daily-check-cta"
                  onClick={() => navigate(`/troupeau/daily-check/${bande.id}`)}
                  className="pressable w-full inline-flex items-center justify-center gap-2 rounded-md bg-accent text-bg-0 text-[12px] uppercase tracking-wide hover:brightness-110"
                  style={{ minHeight: 44, padding: '10px 16px' }}
                  ariaLabel="Démarrer le daily check du jour"
                >
                  <ClipboardCheck size={16} aria-hidden="true" />
                  Daily Check du jour
                </Button>
              )}

              {bandeTyped ? (
                <BandeCroissanceCard bande={bandeTyped} notes={notesAsNotes} />
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div className="card-dense">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} className="text-accent" />
                    <span className="kpi-label">Performances</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[22px] font-semibold tabular-nums text-text-0">{String(bande.vivants || 0)}</span>
                    <span className="text-[11px] uppercase text-text-2">Vivants</span>
                  </div>
                </div>
                <div className="card-dense">
                  <div className="flex items-center gap-2 mb-2">
                    <Stethoscope size={14} className="text-red" />
                    <span className="kpi-label">Alertes santé</span>
                  </div>
                  <span className={`text-[22px] font-semibold tabular-nums ${filteredHealth.length > 0 ? 'text-red' : 'text-text-0'}`}>
                    {filteredHealth.length}
                  </span>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'details' && (
            <div className="flex flex-col gap-4">
              <div className="card-dense space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Activity size={14} className="text-accent" />
                  <h4 className="kpi-label">Informations générales</h4>
                </div>
                <div className="grid grid-cols-1 gap-0">
                  {[
                    { label: 'Truie', value: bande.truie },
                    { label: 'Boucle mère', value: bande.boucleMere },
                    { label: 'Date MB', value: bande.dateMB },
                    { label: 'Nés vivants', value: bande.nv },
                    { label: 'Morts', value: bande.morts },
                    { label: 'Âge', value: bande.age ? `${bande.age} jours` : '—' },
                    { label: 'Statut actuel', value: bande.status },
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b border-border last:border-b-0 py-2">
                      <span className="text-[11px] uppercase tracking-wide text-text-2">{item.label}</span>
                      <span className="text-[12px] text-text-0">{String(item.value || '—')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── V6-B · Origine — Truies sources ────────────────────── */}
              <section
                className="card-dense space-y-3"
                aria-label="Truies sources"
                data-testid="bande-section-sources"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TruieIcon size={14} className="text-accent" />
                    <h4 className="kpi-label">Origine — Truies sources</h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => setEditBandeOpen(true)}
                    className="pressable inline-flex h-7 items-center gap-1 rounded-md bg-bg-2 px-2 text-text-1 hover:text-accent"
                    ariaLabel="Modifier les truies sources"
                  >
                    <Edit3 size={12} aria-hidden="true" />
                    <span className="text-[10px] uppercase tracking-wide">
                      Modifier
                    </span>
                  </Button>
                </div>

                {sources.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border bg-bg-1 px-3 py-3 text-[11px] text-text-2">
                    Aucune truie source liée à cette portée
                  </p>
                ) : (
                  <ul className="divide-y divide-border" aria-label="Liste truies sources">
                    {sources.map(s => (
                      <AnimalListItem
                        key={s.id}
                        avatar={<TruieIcon size={20} />}
                        primary={
                          <span>
                            {s.sowCode}
                            {s.sowName ? ` · ${s.sowName}` : ''}
                          </span>
                        }
                        secondary={
                          <span>
                            {s.sowBoucle ?? ''}
                            {s.sowBoucle ? ' · ' : ''}
                            {s.nbPorceletsApportes} porcelet(s)
                            {s.dateAjout ? ` · ${s.dateAjout}` : ''}
                          </span>
                        }
                        accessory={<ChevronRight size={14} className="text-text-2" />}
                        onClick={() => navigate(`/troupeau/truies/${s.sowId}`)}
                        ariaLabel={`Voir fiche truie ${s.sowCode}`}
                      />
                    ))}
                  </ul>
                )}

                {/* Indicateur cohérence */}
                {sources.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                    <span className="text-[11px] uppercase tracking-wide text-text-2">
                      Total apporté · {sourcesTotal} / {nesVivants} NV
                    </span>
                    {ecart > 0 ? (
                      <Chip
                        label={`Adoptions à tracer (+${ecart})`}
                        tone="amber"
                        size="xs"
                      />
                    ) : ecart < 0 ? (
                      <Chip
                        label={`Apporté > vivants (${ecart})`}
                        tone="accent"
                        size="xs"
                      />
                    ) : (
                      <Chip label="Cohérent" tone="accent" size="xs" />
                    )}
                  </div>
                )}
              </section>

              {/* ── V6-B · Localisation — Loge ──────────────────────────── */}
              <section
                className="card-dense space-y-3"
                aria-label="Localisation loge"
                data-testid="bande-section-loge"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Home size={14} className="text-accent" />
                    <h4 className="kpi-label">Localisation — Loge</h4>
                  </div>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => setMoveOpen(true)}
                    className="pressable inline-flex h-7 items-center gap-1 rounded-md bg-bg-2 px-2 text-text-1 hover:text-accent"
                    ariaLabel="Déplacer cette bande"
                  >
                    <Move size={12} aria-hidden="true" />
                    <span className="text-[10px] uppercase tracking-wide">
                      Déplacer
                    </span>
                  </Button>
                </div>

                {logesEffectives.length >= 2 ? (
                  // V72-P4 — Affichage multi-loges : 1 carte par loge effective
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns:
                        logesEffectives.length === 2
                          ? 'repeat(2, minmax(0, 1fr))'
                          : 'repeat(1, minmax(0, 1fr))',
                    }}
                    data-testid="bande-loges-effectives"
                  >
                    {logesEffectives.map((le) => {
                      const sexesLabel = le.sexes
                        .map((s) => (s === 'M' ? 'M' : s === 'F' ? 'F' : '?'))
                        .join(' · ');
                      return (
                        <Button
                          key={le.id}
                          variant="ghost"
                          onClick={() => navigate(`/troupeau/loges/${le.id}`)}
                          className="pressable flex w-full flex-col items-start gap-1 rounded-md border border-border bg-bg-0 px-3 py-3 text-left"
                          ariaLabel={`Voir fiche loge ${le.numero}`}
                        >
                          <span className="flex items-center gap-2">
                            <MapPin size={14} className="text-accent" aria-hidden="true" />
                            <span className="text-[13px] font-semibold text-text-0">
                              {le.numero}
                            </span>
                          </span>
                          <span className="text-[11px] uppercase tracking-wide text-text-2">
                            {le.porceletsCount} porcelet{le.porceletsCount > 1 ? 's' : ''} · {sexesLabel}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                ) : bandeTyped?.logeNumero || currentLoge ? (
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (bandeTyped?.logeId) {
                          navigate(`/troupeau/loges/${bandeTyped.logeId}`);
                        }
                      }}
                      disabled={!bandeTyped?.logeId}
                      className="pressable flex w-full items-center justify-between rounded-md border border-border bg-bg-0 px-3 py-2 text-left disabled:cursor-default"
                      ariaLabel="Voir fiche loge"
                    >
                      <span className="flex items-center gap-2">
                        <MapPin size={14} className="text-accent" aria-hidden="true" />
                        <span className="text-[13px] text-text-0">
                          {bandeTyped?.logeNumero ?? currentLoge?.numero}
                        </span>
                        {currentLoge?.batiment ? (
                          <span className="text-[11px] text-text-2">
                            · {currentLoge.batiment}
                          </span>
                        ) : null}
                      </span>
                      <ChevronRight size={14} className="text-text-2" aria-hidden="true" />
                    </Button>

                    {currentLoge ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-md border border-border bg-bg-0 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-text-2">
                            Capacité
                          </p>
                          <p className="text-[13px] tabular-nums text-text-0">
                            {currentLoge.capaciteMax != null
                              ? `${currentLoge.capaciteMax}`
                              : '—'}
                          </p>
                        </div>
                        <div className="rounded-md border border-border bg-bg-0 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-text-2">
                            Occupation
                          </p>
                          <p className="text-[13px] tabular-nums text-text-0">
                            {logeOccupation != null ? logeOccupation : '—'}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-border bg-bg-1 px-3 py-3 text-[11px] text-text-2">
                    Aucune loge assignée
                  </p>
                )}
              </section>

              {/* ── V25 · Porcelets de la bande ──────────────────────────── */}
              <section
                className="card-dense space-y-3"
                aria-label="Porcelets de la bande"
                data-testid="bande-section-porcelets"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-accent" />
                    <h4 className="kpi-label">
                      Porcelets de la bande
                      {porcelets.length > 0 ? (
                        <span className="ml-2 text-[11px] text-text-2 normal-case">
                          ({porcelets.length})
                        </span>
                      ) : null}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {canSplit && (
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => setSplitOpen(true)}
                        data-testid="bande-split-cta"
                        className="pressable inline-flex h-7 items-center gap-1 rounded-md bg-bg-2 px-2 text-text-1 hover:text-accent"
                        ariaLabel="Splitter cette bande"
                      >
                        <Split size={12} aria-hidden="true" />
                        <span className="text-[10px] uppercase tracking-wide">
                          Splitter
                        </span>
                      </Button>
                    )}
                    {porcelets.length > 0 && (
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => setHealthLogPorceletOpen(true)}
                        className="pressable inline-flex h-7 items-center gap-1 rounded-md bg-bg-2 px-2 text-text-1 hover:text-red"
                        ariaLabel="Signaler maladie porcelet"
                      >
                        <Stethoscope size={12} aria-hidden="true" />
                        <span className="text-[10px] uppercase tracking-wide">
                          Signaler maladie
                        </span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={() => setAddPorceletOpen(true)}
                      className="pressable inline-flex h-7 items-center gap-1 rounded-md bg-bg-2 px-2 text-text-1 hover:text-accent"
                      ariaLabel="Ajouter un porcelet"
                    >
                      <Plus size={12} aria-hidden="true" />
                      <span className="text-[10px] uppercase tracking-wide">
                        Ajouter porcelet
                      </span>
                    </Button>
                  </div>
                </div>

                {porcelets.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-bg-1 px-3 py-4 space-y-2">
                    <p className="text-[11px] text-text-2">
                      Aucun porcelet numéroté pour cette bande
                    </p>
                    <p className="text-[10px] text-text-2 leading-relaxed">
                      Boucles individuelles permettent le suivi sanitaire détaillé
                    </p>
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => setAddPorceletOpen(true)}
                      className="pressable inline-flex h-9 items-center gap-2 rounded-md bg-accent px-3 text-bg-0 text-[11px] uppercase tracking-wide hover:brightness-110"
                      ariaLabel="Numéroter les porcelets"
                    >
                      <Tag size={12} aria-hidden="true" />
                      Numéroter les porcelets
                    </Button>
                  </div>
                ) : (
                  <ul className="divide-y divide-border" aria-label="Liste porcelets">
                    {porcelets.map(p => (
                      <li key={p.id}>
                        <Button
                          variant="ghost"
                          onClick={() => setEditPorcelet(p)}
                          className="pressable flex w-full items-center justify-between py-2 px-1 text-left"
                          ariaLabel={`Modifier porcelet ${p.boucle}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] text-text-0 uppercase">
                                {p.boucle}
                              </span>
                              <span className="text-[10px] text-text-2 uppercase">
                                {p.sexe === 'M' ? '♂' : p.sexe === 'F' ? '♀' : '?'}
                              </span>
                              {p.poidsCourantKg != null ? (
                                <span className="text-[11px] tabular-nums text-text-1">
                                  · {p.poidsCourantKg} kg
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Chip label={p.statut} tone={STATUT_TONE[p.statut]} size="xs" />
                            <ChevronRight size={14} className="text-text-2" />
                          </div>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="flex items-center justify-between mb-1 mt-2">
                <h3 className="kpi-label">Registre complet</h3>
                <Chip label={`${bande.rows.length} lignes`} tone="accent" size="xs" />
              </div>
              {bande.rows && bande.rows.length > 0 ? (
                bande.rows.map((row: SheetRawRow, i: number) => (
                  <Button
                    variant="ghost"
                    key={i}
                    onClick={() => setEditRow(row)}
                    className="card-dense pressable w-full text-left flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-md bg-bg-2 border border-border flex items-center justify-center text-text-2 text-[11px]">
                        #{i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-text-0">Ligne de registre</p>
                        <p className="text-[10px] uppercase tracking-wide text-text-2 truncate">
                          {header && header.includes('DATE MB') ? String(row[header.indexOf('DATE MB')]) : 'ID: ' + bande.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-[11px] text-text-0">{String(row[header.indexOf('STATUT') || 0] || '—')}</p>
                        <p className="text-[9px] uppercase tracking-wide text-text-2">Statut</p>
                      </div>
                      <ChevronRight size={14} className="text-text-2" />
                    </div>
                  </Button>
                ))
              ) : (
                <div className="card-dense text-center py-10">
                  <AlertCircle size={32} className="text-text-2 mb-2 mx-auto opacity-50" />
                  <p className="text-[11px] uppercase tracking-wide text-text-2">Aucune donnée brute</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sante' && (
            <div className="flex flex-col gap-4">
              {/* ── Protocole sanitaire recommandé (selon phase) ─────────── */}
              {recommendedHealth.length > 0 && (
                <div className="card-dense space-y-3">
                  <div className="flex items-center gap-2">
                    <CalendarClock size={14} className="text-accent" />
                    <h4 className="kpi-label">Protocole recommandé</h4>
                  </div>
                  <div className="space-y-2">
                    {recommendedHealth.map(reco => {
                      const tpl = HEALTH_LOG_TEMPLATES[reco.type];
                      const dateStr = reco.recommendedDate.toLocaleDateString('fr-FR');
                      return (
                        <div
                          key={reco.type}
                          className={[
                            'flex items-center justify-between gap-3',
                            'rounded-md border px-3 py-2',
                            reco.done
                              ? 'border-border bg-bg-1 opacity-60'
                              : 'border-accent/30 bg-bg-0',
                          ].join(' ')}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {reco.done ? (
                                <CheckCircle2 size={12} className="text-accent shrink-0" />
                              ) : (
                                <CalendarClock size={12} className="text-accent shrink-0" />
                              )}
                              <span className="text-[11px] uppercase tracking-wide text-text-1 truncate">
                                {tpl.label}
                              </span>
                            </div>
                            <span className="text-[10px] text-text-2 ml-[18px]">
                              {reco.done ? 'Fait' : `Prévu ${dateStr}`}
                              {tpl.defaultDose ? ` · ${tpl.defaultDose}` : ''}
                            </span>
                          </div>
                          {!reco.done && (
                            <Button
                              variant="primary"
                              size="small"
                              onClick={() => setPresetType(reco.type)}
                              className="pressable shrink-0 inline-flex items-center justify-center h-7 px-2.5 rounded-md bg-accent text-bg-0 text-[10px] uppercase tracking-wide hover:brightness-110"
                            >
                              Saisir
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <QuickHealthForm
                subjectType="BANDE"
                subjectId={bande.id}
                defaultLogType={presetType}
                onSuccess={() => { setPresetType(undefined); onRefresh(); loadRelatedData(); }}
              />

              <div className="flex items-center justify-between mb-1">
                <h3 className="kpi-label">Journal santé portée</h3>
              </div>

              {loading ? (
                <div className="text-center py-10">
                  <IonSpinner name="bubbles" />
                </div>
              ) : filteredHealth.length === 0 ? (
                <div className="card-dense text-center py-10">
                  <Stethoscope size={32} className="text-text-2 mb-2 mx-auto opacity-50" />
                  <p className="text-[11px] uppercase tracking-wide text-text-2">Aucun soin pour cette portée</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredHealth.map((row, i) => (
                    <div key={i} className="card-dense">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] uppercase tracking-wide text-text-2">
                          {String(row[healthHeader.findIndex(h => h.toUpperCase().includes('DATE')) || 0])}
                        </span>
                        <Chip
                          label={String(row[healthHeader.findIndex(h => h.toUpperCase().includes('TYPE')) || 1])}
                          tone="red"
                          size="xs"
                        />
                      </div>
                      <p className="text-[13px] font-medium text-text-0 mb-1">
                        {String(row[healthHeader.findIndex(h => h.toUpperCase().includes('SOIN') || h.toUpperCase().includes('TRAITEMENT')) || 2])}
                      </p>
                      <p className="text-[11px] text-text-2 leading-relaxed">
                        {String(row[healthHeader.findIndex(h => h.toUpperCase().includes('OBS')) || 3])}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="flex flex-col gap-4">
              <QuickNoteForm subjectType="BANDE" subjectId={bande.id} onSuccess={() => { onRefresh(); loadRelatedData(); }} />

              {/* Historique notes V21-6 C2 */}
              <NotesTimeline
                subjectType="BANDE"
                subjectId={bande.id}
                subjectLabel={bande.id}
              />

              <div className="flex items-center justify-between mb-1">
                <h3 className="kpi-label">Journal de bord</h3>
              </div>

              {loading ? (
                <div className="text-center py-10">
                  <IonSpinner name="bubbles" />
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="card-dense text-center py-10">
                  <ClipboardList size={32} className="text-text-2 mb-2 mx-auto opacity-50" />
                  <p className="text-[11px] uppercase tracking-wide text-text-2">Journal vide</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotes.map((row, i) => (
                    <div key={i} className="card-dense">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] uppercase tracking-wide text-text-2">
                          {String(row[notesHeader.indexOf('DATE') || 0])}
                        </span>
                      </div>
                      <p className="text-[13px] text-text-0 leading-relaxed italic">
                        "{String(row[notesHeader.findIndex(h => h.toUpperCase().includes('NOTE') || h.toUpperCase().includes('TEXTE')) || 1])}"
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <PhotoGallery
                entityType="batches"
                entityId={bande.id}
                refreshKey={photosRefreshKey}
              />
            </div>
          )}
        </div>

        <IonModal isOpen={!!editRow} onDidDismiss={() => setEditRow(null)} className="premium-modal">
          {editRow && meta && (
            <TableRowEdit
              meta={meta}
              header={header}
              rowData={editRow}
              onClose={() => setEditRow(null)}
              onSaved={() => { setEditRow(null); onRefresh(); }}
            />
          )}
        </IonModal>

        {/* V6-B — Édition bande (sources/loge) */}
        {bandeTyped ? (
          <QuickEditBandeForm
            isOpen={editBandeOpen}
            onClose={() => setEditBandeOpen(false)}
            bande={bandeTyped}
            onSuccess={() => {
              setEditBandeOpen(false);
              onRefresh();
              loadSources();
              loadLogeData();
            }}
          />
        ) : null}

        {/* V6-B — Déplacement bande vers loge */}
        <QuickMoveSubjectForm
          isOpen={moveOpen}
          onClose={() => setMoveOpen(false)}
          subjectType="BANDE"
          subjectId={bande.id}
          subjectLabel={`Bande ${bande.id}`}
          currentLogeId={bandeTyped?.logeId}
          currentLogeNumero={bandeTyped?.logeNumero}
          onSuccess={() => {
            onRefresh();
            loadLogeData();
          }}
        />

        {/* V25 — Ajout porcelet */}
        <QuickAddPorceletForm
          isOpen={addPorceletOpen}
          onClose={() => setAddPorceletOpen(false)}
          batchId={bande.id}
          existingBoucles={existingBoucles}
          existingPorcelets={allPorcelets}
          resolveBatchCodeId={resolveBatchCodeId}
          onSuccess={() => {
            loadPorcelets();
            onRefresh();
          }}
        />

        {/* V25 — Édition porcelet */}
        {editPorcelet ? (
          <QuickEditPorceletForm
            isOpen={!!editPorcelet}
            onClose={() => setEditPorcelet(null)}
            porcelet={editPorcelet}
            existingBoucles={existingBoucles}
            onSuccess={() => {
              setEditPorcelet(null);
              loadPorcelets();
              onRefresh();
            }}
            onDeleted={() => {
              setEditPorcelet(null);
              loadPorcelets();
              onRefresh();
            }}
          />
        ) : null}

        {/* V25 — Signalement maladie porcelet (Sprint D) */}
        <QuickHealthLogPorceletForm
          isOpen={healthLogPorceletOpen}
          onClose={() => setHealthLogPorceletOpen(false)}
          bandeId={bande.id}
          onSuccess={() => {
            loadPorcelets();
            loadRelatedData();
            onRefresh();
          }}
        />

        {/* V36-E P3 — Splitter cette bande (porcelets vers nouvelle loge) */}
        <QuickSplitBandeForm
          isOpen={splitOpen}
          onClose={() => setSplitOpen(false)}
          bandeId={bande.id}
          bandeCodeId={bandeTyped?.idPortee || bande.id}
          onSuccess={() => {
            setSplitOpen(false);
            loadPorcelets();
            loadLogeData();
            onRefresh();
          }}
        />
      </IonContent>
    </div>
  );
};

export default BandeDetailView;
