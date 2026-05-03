import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonContent, IonModal, IonSegment, IonSegmentButton, IonLabel, IonSpinner,
} from '@ionic/react';
import {
  AlertCircle, Activity, ClipboardList, ChevronLeft, ChevronRight,
  Stethoscope, TrendingUp, CalendarClock, CheckCircle2,
  Edit3, Home, MapPin, Move, Tag, Plus, ClipboardCheck,
} from 'lucide-react';
import PhotoStrip from '../../../components/PhotoStrip';
import { Chip, AnimalListItem } from '../../../components/agritech';
import { computeBandePhase } from '../../../services/bandesAggregator';
import QuickNoteForm from '../../../components/forms/QuickNoteForm';
import QuickHealthForm from '../../../components/forms/QuickHealthForm';
import QuickEditBandeForm from '../../../components/forms/QuickEditBandeForm';
import QuickMoveSubjectForm from '../../../components/forms/QuickMoveSubjectForm';
import QuickAddPorceletForm from '../../../components/forms/QuickAddPorceletForm';
import QuickEditPorceletForm from '../../../components/forms/QuickEditPorceletForm';
import QuickHealthLogPorceletForm from '../../../components/forms/QuickHealthLogPorceletForm';
import NotesTimeline from '../../../components/design/NotesTimeline';
import BandeCroissanceCard from '../../../components/bande/BandeCroissanceCard';
import TruieIcon from '../../../components/icons/TruieIcon';
import { useFarm } from '../../../context/FarmContext';
import { getJournalSante, getNotesTerrain } from '../../../services/supabaseService';
import {
  getBatchSources,
  getLogeContents,
  listLoges,
  listPorceletsByBatch,
} from '../../../services/supabaseWrites';
import {
  getRecommendedHealthLogs,
  HEALTH_LOG_TEMPLATES,
  type HealthLogType,
} from '../../../services/healthProtocolPlanner';
import TableRowEdit from '../TableRowEdit';
import CycleTimeline from './CycleTimeline';
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

const BandeDetailView: React.FC<BandeDetailViewProps> = ({ bande, header, meta, onClose, onRefresh }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('resumé');
  const [editRow, setEditRow] = useState<SheetRawRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [healthData, setHealthData] = useState<SheetRawRow[]>([]);
  const [healthHeader, setHealthHeader] = useState<string[]>([]);
  const [notesData, setNotesData] = useState<SheetRawRow[]>([]);
  const [notesHeader, setNotesHeader] = useState<string[]>([]);
  const { notes: notesAsNotes, getBandeById } = useFarm();

  // V29-FIX-P0 : garde défensive contre bande=undefined (cas SW cache stale ou
  // route directe /troupeau/bandes/:id avec wrapper qui foire). Évite le
  // crash JS "Cannot read properties of undefined (reading 'id')".
  if (!bande?.id) {
    return (
      <div className="agritech-root p-10 text-center flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-[14px] uppercase text-text-1">Bande introuvable</p>
        <button
          type="button"
          onClick={onClose ?? (() => navigate(-1))}
          className="pressable h-11 px-6 rounded-md bg-accent text-bg-0 text-[12px] uppercase tracking-wide"
        >
          Retour
        </button>
      </div>
    );
  }

  const bandeTyped = getBandeById(bande.id);

  // V6-B — Sources multi-mères + loge structurée
  const [sources, setSources] = useState<BatchSource[]>([]);
  const [loges, setLoges] = useState<Loge[]>([]);
  const [logeOccupation, setLogeOccupation] = useState<number | null>(null);
  const [editBandeOpen, setEditBandeOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  // V25 — Porcelets individuels rattachés à la bande
  const [porcelets, setPorcelets] = useState<PorceletIndividuel[]>(
    bandeTyped?.porcelets ?? [],
  );
  const [addPorceletOpen, setAddPorceletOpen] = useState(false);
  const [editPorcelet, setEditPorcelet] = useState<PorceletIndividuel | null>(null);
  const [healthLogPorceletOpen, setHealthLogPorceletOpen] = useState(false);

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

  const nesVivants = bandeTyped?.nv ?? Number(bande.nv) ?? 0;
  const ecart = sourcesTotal - nesVivants;

  // V28-CTA — Daily Check disponible uniquement pour les bandes en phase Sous mère.
  const isSousMere = useMemo(
    () => (bandeTyped ? computeBandePhase(bandeTyped) === 'SOUS_MERE' : false),
    [bandeTyped],
  );

  const loadSources = useCallback(async () => {
    if (!bande.id) return;
    try {
      const rows = await getBatchSources(bande.id);
      setSources(rows);
    } catch (e) {
      console.warn('[bande-detail] getBatchSources failed', e);
    }
  }, [bande.id]);

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
    if (!bande.id) return;
    try {
      const rows = await listPorceletsByBatch(bande.id);
      setPorcelets(rows);
    } catch (e) {
      console.warn('[bande-detail] listPorceletsByBatch failed', e);
    }
  }, [bande.id]);

  useEffect(() => {
    loadSources();
    loadLogeData();
    loadPorcelets();
  }, [loadSources, loadLogeData, loadPorcelets]);

  // Set unicité boucles (toutes les bandes du context, même celles non chargées
  // localement). On utilise les porcelets locaux comme proxy. Pour une unicité
  // globale ferme parfaite, l'erreur DB (UNIQUE constraint) reste le filet final.
  const existingBoucles = useMemo(() => {
    const s = new Set<string>();
    for (const p of porcelets) s.add(p.boucle.toUpperCase());
    return s;
  }, [porcelets]);

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
    if (!bande.id || healthData.length === 0) return [];
    const typeIdx = healthHeader.findIndex(h => ['CIBLE_TYPE', 'SUJET_TYPE', 'TYPE'].includes(h.toUpperCase()));
    const idIdx = healthHeader.findIndex(h => ['CIBLE_ID', 'SUJET_ID', 'ID', 'BOUCLE'].includes(h.toUpperCase()));

    if (idIdx === -1) return [];

    return healthData.filter(r => {
      const rowId = String(r[idIdx]).trim().toUpperCase();
      const targetId = String(bande.id).trim().toUpperCase();
      const rowType = typeIdx !== -1 ? String(r[typeIdx]).trim().toUpperCase() : 'BANDE';
      return rowId === targetId && (rowType === 'BANDE' || typeIdx === -1);
    });
  }, [healthData, healthHeader, bande.id]);

  // ── Protocole sanitaire recommandé selon phase de la bande ────────────
  const recommendedHealth = useMemo(() => {
    if (!bandeTyped) return [];
    const recos = getRecommendedHealthLogs(bandeTyped, new Date());
    if (recos.length === 0) return recos;
    // Croise avec l'historique health_logs pour marquer "déjà fait".
    const typeIdx = healthHeader.findIndex(h => h.toUpperCase().includes('TYPE'));
    const idIdx = healthHeader.findIndex(h => ['CIBLE_ID', 'SUJET_ID', 'ID', 'BOUCLE'].includes(h.toUpperCase()));
    const doneTypes = new Set<string>();
    if (typeIdx !== -1 && idIdx !== -1) {
      for (const r of healthData) {
        if (String(r[idIdx]).trim().toUpperCase() === String(bande.id).trim().toUpperCase()) {
          doneTypes.add(String(r[typeIdx]).trim().toUpperCase());
        }
      }
    }
    return recos.map(r => ({ ...r, done: doneTypes.has(r.type) }));
  }, [bandeTyped, bande.id, healthHeader, healthData]);

  const [presetType, setPresetType] = useState<HealthLogType | undefined>(undefined);

  const filteredNotes = useMemo(() => {
    if (!bande.id || notesData.length === 0) return [];
    const typeIdx = notesHeader.findIndex(h => ['SUBJECTTYPE', 'TYPE_SUJET'].includes(h.toUpperCase()));
    const idIdx = notesHeader.findIndex(h => ['SUBJECTID', 'ID_SUJET'].includes(h.toUpperCase()));

    if (idIdx !== -1 && typeIdx !== -1) {
      return notesData.filter(r =>
        String(r[idIdx]).trim().toUpperCase() === String(bande.id).trim().toUpperCase() &&
        String(r[typeIdx]).trim().toUpperCase() === 'BANDE'
      );
    }
    return notesData.filter(r => r.some(cell => String(cell).trim().toUpperCase() === String(bande.id).trim().toUpperCase()));
  }, [notesData, notesHeader, bande.id]);

  return (
    <div className="agritech-root h-full flex flex-col">
      <header className="bg-bg-0 border-b border-border px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onClose}
            className="pressable inline-flex h-9 w-9 items-center justify-center rounded-md bg-bg-2 text-text-1 transition-colors"
            aria-label="Retour"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="agritech-heading uppercase leading-none truncate" style={{ fontSize: 'clamp(20px, 5vw, 24px)' }}>
              Portée {bande.id}
            </h1>
            <p className="mt-1 text-[11px] text-text-2 leading-none truncate">
              {(bande.status as string) || 'Détails'} {bande.truie ? `· ${bande.truie}` : ''}
            </p>
          </div>
        </div>

        <IonSegment
          value={tab}
          onIonChange={e => setTab(e.detail.value as string)}
          className="premium-segment bg-bg-1 border border-border rounded-md overflow-hidden"
        >
          <IonSegmentButton value="resumé"><IonLabel className="text-[11px] uppercase tracking-wide">Résumé</IonLabel></IonSegmentButton>
          <IonSegmentButton value="details"><IonLabel className="text-[11px] uppercase tracking-wide">Détails</IonLabel></IonSegmentButton>
          <IonSegmentButton value="sante"><IonLabel className="text-[11px] uppercase tracking-wide">Santé</IonLabel></IonSegmentButton>
          <IonSegmentButton value="notes"><IonLabel className="text-[11px] uppercase tracking-wide">Notes</IonLabel></IonSegmentButton>
        </IonSegment>
      </header>

      <IonContent className="ion-no-padding">
        <div className="agritech-root px-4 py-5">
          {tab === 'resumé' && (
            <div className="space-y-4 pb-32">
              <PhotoStrip subjectType="BANDE" subjectId={bande.id} />

              <CycleTimeline age={bande.age} status={(bande.status as string) || ''} />

              {/* V28-CTA — Daily Check du jour (bandes Sous mère uniquement) */}
              {isSousMere && (
                <button
                  type="button"
                  data-testid="bande-daily-check-cta"
                  onClick={() => navigate(`/troupeau/daily-check/${bande.id}`)}
                  className="pressable w-full inline-flex items-center justify-center gap-2 rounded-md bg-accent text-bg-0 text-[12px] uppercase tracking-wide hover:brightness-110"
                  style={{ minHeight: 44, padding: '10px 16px' }}
                  aria-label="Démarrer le daily check du jour"
                >
                  <ClipboardCheck size={16} aria-hidden="true" />
                  Daily Check du jour
                </button>
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
                  <button
                    type="button"
                    onClick={() => setEditBandeOpen(true)}
                    className="pressable inline-flex h-7 items-center gap-1 rounded-md bg-bg-2 px-2 text-text-1 hover:text-accent"
                    aria-label="Modifier les truies sources"
                  >
                    <Edit3 size={12} aria-hidden="true" />
                    <span className="text-[10px] uppercase tracking-wide">
                      Modifier
                    </span>
                  </button>
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
                  <button
                    type="button"
                    onClick={() => setMoveOpen(true)}
                    className="pressable inline-flex h-7 items-center gap-1 rounded-md bg-bg-2 px-2 text-text-1 hover:text-accent"
                    aria-label="Déplacer cette bande"
                  >
                    <Move size={12} aria-hidden="true" />
                    <span className="text-[10px] uppercase tracking-wide">
                      Déplacer
                    </span>
                  </button>
                </div>

                {bandeTyped?.logeNumero || currentLoge ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (bandeTyped?.logeId) {
                          navigate(`/troupeau/loges/${bandeTyped.logeId}`);
                        }
                      }}
                      disabled={!bandeTyped?.logeId}
                      className="pressable flex w-full items-center justify-between rounded-md border border-border bg-bg-0 px-3 py-2 text-left disabled:cursor-default"
                      aria-label="Voir fiche loge"
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
                    </button>

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
                    {porcelets.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setHealthLogPorceletOpen(true)}
                        className="pressable inline-flex h-7 items-center gap-1 rounded-md bg-bg-2 px-2 text-text-1 hover:text-red"
                        aria-label="Signaler maladie porcelet"
                      >
                        <Stethoscope size={12} aria-hidden="true" />
                        <span className="text-[10px] uppercase tracking-wide">
                          Signaler maladie
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setAddPorceletOpen(true)}
                      className="pressable inline-flex h-7 items-center gap-1 rounded-md bg-bg-2 px-2 text-text-1 hover:text-accent"
                      aria-label="Ajouter un porcelet"
                    >
                      <Plus size={12} aria-hidden="true" />
                      <span className="text-[10px] uppercase tracking-wide">
                        Ajouter porcelet
                      </span>
                    </button>
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
                    <button
                      type="button"
                      onClick={() => setAddPorceletOpen(true)}
                      className="pressable inline-flex h-9 items-center gap-2 rounded-md bg-accent px-3 text-bg-0 text-[11px] uppercase tracking-wide hover:brightness-110"
                      aria-label="Numéroter les porcelets"
                    >
                      <Tag size={12} aria-hidden="true" />
                      Numéroter les porcelets
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-border" aria-label="Liste porcelets">
                    {porcelets.map(p => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setEditPorcelet(p)}
                          className="pressable flex w-full items-center justify-between py-2 px-1 text-left"
                          aria-label={`Modifier porcelet ${p.boucle}`}
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
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <QuickHealthForm subjectType="BANDE" subjectId={bande.id} onSuccess={() => { onRefresh(); loadRelatedData(); }} />
            </div>
          )}

          {tab === 'details' && (
            <div className="space-y-3 pb-32">
              <div className="flex items-center justify-between mb-1">
                <h3 className="kpi-label">Registre complet</h3>
                <Chip label={`${bande.rows.length} lignes`} tone="accent" size="xs" />
              </div>
              {bande.rows && bande.rows.length > 0 ? (
                bande.rows.map((row: SheetRawRow, i: number) => (
                  <button
                    type="button"
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
                  </button>
                ))
              ) : (
                <div className="card-dense text-center py-10">
                  <AlertCircle size={32} className="text-text-2 mb-2 mx-auto opacity-50" />
                  <p className="text-[11px] uppercase tracking-wide text-text-2">Aucune donnée brute</p>
                </div>
              )}
            </div>
          )}

          {tab === 'sante' && (
            <div className="space-y-4 pb-32">
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
                            <button
                              type="button"
                              onClick={() => setPresetType(reco.type)}
                              className="pressable shrink-0 inline-flex items-center justify-center h-7 px-2.5 rounded-md bg-accent text-bg-0 text-[10px] uppercase tracking-wide hover:brightness-110"
                            >
                              Saisir
                            </button>
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

          {tab === 'notes' && (
            <div className="space-y-4 pb-32">
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

              <PhotoStrip subjectType="BANDE" subjectId={bande.id} />
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
      </IonContent>
    </div>
  );
};

export default BandeDetailView;
