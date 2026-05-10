/**
 * VerratDetailView — /troupeau/verrats/:id
 * ══════════════════════════════════════════════════════════════════════════
 * Fiche détail d'un verrat — alignée sur le pattern V70 de `TruieDetailView`.
 *
 * Structure :
 *   1. PageHeader       : eyebrow "Élevage · Verrat" + h1 displayId · nom + statut
 *   2. Hero compact Card: EntityAvatar xl + nom/origine + Tag statut + actions
 *   3. Tabs (4)         : Vue d'ensemble · Saillies · Santé · Lignée
 *
 * Onglet "Vue d'ensemble" (4 cards V70) :
 *   - IDENTITÉ        : boucle, nom, origine, naissance, loge
 *   - REPRODUCTION    : alimentation, ration, total saillies, dernière saillie
 *   - JOURNAL TERRAIN : notes inline + NotesTimeline + PhotoStrip
 *   - ACTIONS         : grid 2×2 (Saillir, Soigner, Note, Pesée)
 */

import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { IonContent, IonPage, IonToast } from '@ionic/react';
import {
  Syringe, Scale, Heart, FileText, Pencil, ChevronRight, MoreHorizontal,
} from 'lucide-react';

import TopBarSync from '../../components/design/TopBarSync';
import EditableNumber from '../../components/EditableNumber';
import EditableText from '../../components/EditableText';
import NotesTimeline from '../../components/design/NotesTimeline';
import PhotoUpload from '../../v70/components/v70/PhotoUpload';
import PhotoGallery from '../../v70/components/v70/PhotoGallery';
import { SectionDivider, BottomSheet, type ChipTone } from '../../components/agritech';
import { Button, Section, Tabs, Tag } from '@/design-system';
import { EntityAvatar } from '../../components/ds/EntityAvatar';
import { useFarm } from '../../context/FarmContext';
import { useEntityWithRetry } from '../../hooks/useEntityWithRetry';
import { SpinnerCenter, EntityNotFoundCard } from '../../v70/components/v70/EntityNotFoundGuard';
import { updateBoar } from '../../services/supabaseWrites';
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

type StatutTagVariant = 'primary' | 'accent' | 'soft' | 'warning';

function statutTagVariant(statut: string | undefined): StatutTagVariant {
  const s = (statut || '').toLowerCase();
  if (/réform|reform/.test(s)) return 'accent';
  if (/mort/.test(s)) return 'accent';
  return 'primary';
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
type VerratTabId = 'overview' | 'saillies' | 'sante' | 'lignee';

const VerratDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { verrats, truies, saillies, getHealthForAnimal, refreshData } = useFarm();
  const [sheet, setSheet] = useState<QuickSheet>(null);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<string>('');
  // V45 PHASE 4 — Tabs uniformisés 4 onglets
  const [activeTab, setActiveTab] = useState<VerratTabId>('overview');
  const [photosRefreshKey, setPhotosRefreshKey] = useState(0);

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

  // V74 défense-en-profondeur : guard loading/retry/not-found uniforme.
  const verratGuard = useEntityWithRetry(verrat);

  if (verratGuard.state === 'loading') {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
            <SpinnerCenter />
        </IonContent>
      </IonPage>
    );
  }

  if (verratGuard.state === 'not-found') {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
            <TopBarSync
              crumbs={[
                { label: 'Élevage', href: '/troupeau' },
                { label: 'Verrats', href: '/troupeau?view=verrats' },
                decodedId,
              ]}
              onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
            />
            <div
              role="main"
              aria-label="Verrat introuvable"
              className="px-4 pt-5 pb-44 flex flex-col gap-5"
              style={{ maxWidth: 1100, margin: '0 auto' }}
            >
              <EntityNotFoundCard
                label="verrat"
                message="Ce verrat n’existe pas ou plus dans votre exploitation."
                onBack={() => window.history.back()}
              />
            </div>
        </IonContent>
      </IonPage>
    );
  }

  // Type narrowing manuel : verratGuard.state === 'ready' mais TS ne le déduit pas
  // depuis verrat (issu de useMemo<Verrat | undefined>).
  if (!verrat) return null;

  const displayId = verrat.displayId || verrat.id;
  const title = verrat.nom ? `${displayId} · ${verrat.nom}` : displayId;
  const tagVariant = statutTagVariant(verrat.statut);

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
        <div
          style={{
            background: 'var(--bg-app)',
            minHeight: '100%',
            position: 'relative',
            paddingBottom: 168,
          }}
        >
          <TopBarSync
            crumbs={[]}
            onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
          />

          {/* V76 — Header cahier d'éleveur : --pt-primary opaque */}
          <header className="ph ph--primary">
            <div className="ph__crumb">
              <Link to="/troupeau">Élevage</Link>
              <ChevronRight aria-hidden />
              <Link to="/troupeau?view=verrats">Verrats</Link>
              <ChevronRight aria-hidden />
              <b>{displayId}</b>
            </div>
            <div className="ph__row">
              <div>
                <div className="ph__eyebrow">Élevage · Verrat</div>
                <h1 className="ph__h1">{title}</h1>
              </div>
              <button
                type="button"
                className="iconbtn"
                onClick={() => setSheet('saillie')}
                aria-label="Ouvrir les actions"
              >
                <MoreHorizontal aria-hidden />
              </button>
            </div>
            <p className="ph__sub">
              {(() => {
                const parts: React.ReactNode[] = [];
                if (verrat.nom) parts.push(<b key="nom">{verrat.nom}</b>);
                if (verrat.statut) parts.push(verrat.statut);
                if (saillesVerrat.length > 0) parts.push(`${saillesVerrat.length} saillie${saillesVerrat.length > 1 ? 's' : ''}`);
                if (verrat.origine) parts.push(`Origine ${verrat.origine}`);
                return parts.flatMap((p, i) => i === 0 ? [<React.Fragment key={`s-${i}`}>{p}</React.Fragment>] : [' · ', <React.Fragment key={`s-${i}`}>{p}</React.Fragment>]);
              })()}
            </p>
            <div className="id-strip">
              <span data-av-xl>
                <EntityAvatar
                  species="verrat"
                  photoUrl={verrat.photoUrl}
                  size="xl"
                  shortCode={displayId}
                  useV73Defaults
                />
              </span>
              <div className="id-strip__meta">
                <div className="id-strip__row">
                  <Tag variant={tagVariant}>{verrat.statut || '—'}</Tag>
                </div>
                {verrat.boucle ? <div>Boucle <b>{verrat.boucle}</b></div> : null}
                {verrat.dateNaissance ? <div>Né <b>{formatDate(verrat.dateNaissance)}</b></div> : null}
              </div>
            </div>
          </header>

          <div
            role="main"
            aria-label={`Détail verrat ${displayId}`}
            className="px-4 pt-1 pb-44 flex flex-col gap-5"
            style={{ maxWidth: 1100, margin: '0 auto' }}
          >
            {/* Actions principales déplacées sous le header (V76) */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="primary" size="sm" onClick={() => setSheet('saillie')}>
                + Saisir évènement
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil size={14} strokeWidth={2} aria-hidden /> Modifier
              </Button>
            </div>

            {/* V45 PHASE 4 — Onglets uniformisés (VUE D'ENSEMBLE · SAILLIES · SANTÉ · LIGNÉE) */}
            <Tabs
              ariaLabel="Sections de la fiche verrat"
              value={activeTab}
              onChange={(v) => setActiveTab(v as VerratTabId)}
              options={[
                { value: 'overview', label: 'VUE D’ENSEMBLE' },
                { value: 'saillies', label: 'SAILLIES', count: saillesVerrat.length || undefined },
                { value: 'sante', label: 'SANTÉ', count: soins.length || undefined },
                { value: 'lignee', label: 'LIGNÉE' },
              ]}
            />

            {activeTab === 'overview' && (
            <>
            {/* ── Card 1 : IDENTITÉ ────────────────────────────────────── */}
            <section aria-label="Identité" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Section label="IDENTITÉ" />
              <div
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 12,
                  padding: '6px 16px',
                  boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04)',
                }}
              >
                <DetailRow label="Boucle" value={verrat.boucle || '—'} mono />
                <EditableDetailRow label="Nom">
                  <EditableText
                    value={verrat.nom ?? null}
                    maxLength={60}
                    ariaLabel={`Modifier le nom du verrat ${displayId}`}
                    placeholder="—"
                    onSave={async (v) => {
                      const res = await updateBoar(verrat.id, { name: v });
                      if (res.success) await refreshData();
                      return res;
                    }}
                  />
                </EditableDetailRow>
                <DetailRow label="Origine" value={verrat.origine || '—'} />
                {verrat.dateNaissance ? (
                  <DetailRow label="Naissance" value={formatDate(verrat.dateNaissance)} />
                ) : null}
                {verrat.loge ? <DetailRow label="Loge" value={verrat.loge} /> : null}
              </div>
            </section>

            {/* ── Card 2 : REPRODUCTION ────────────────────────────────── */}
            <section aria-label="Reproduction" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Section label="REPRODUCTION" />
              <div
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 12,
                  padding: '6px 16px',
                  boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04)',
                }}
              >
                <DetailRow label="Alimentation" value={verrat.alimentation || '—'} />
                <EditableDetailRow label="Ration/j">
                  <EditableNumber
                    value={verrat.ration > 0 ? verrat.ration : null}
                    min={0}
                    max={20}
                    step={0.1}
                    unit="kg/j"
                    ariaLabel={`Modifier la ration du verrat ${displayId}`}
                    onSave={async (v) => {
                      const res = await updateBoar(verrat.id, { ration_kg_j: v });
                      if (res.success) await refreshData();
                      return res;
                    }}
                  />
                </EditableDetailRow>
                <DetailRow
                  label="Total saillies"
                  value={saillesVerrat.length > 0 ? String(saillesVerrat.length) : '—'}
                  mono
                />
                <DetailRow
                  label="Dernière saillie"
                  value={lastSaillie ? `${formatDate(lastSaillie.dateSaillie)} · ${truieName(lastSaillie)}` : '—'}
                />
              </div>
            </section>

            {/* ── Card 3 : JOURNAL TERRAIN (notes + photos) ───────────── */}
            <section aria-label="Journal terrain" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Section label="JOURNAL TERRAIN" />
              <div
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <EditableText
                  value={verrat.notes ?? null}
                  multiline
                  maxLength={500}
                  ariaLabel={`Modifier les notes du verrat ${displayId}`}
                  placeholder="Ajouter une note (Cmd+Entrée pour sauver)…"
                  onSave={async (v) => {
                    const res = await updateBoar(verrat.id, { notes: v });
                    if (res.success) await refreshData();
                    return res;
                  }}
                />
                <NotesTimeline
                  subjectType="VERRAT"
                  subjectId={verrat.id}
                  subjectLabel={verrat.displayId ?? undefined}
                  onAddNote={() => setSheet('note')}
                />
                <PhotoUpload
                  entityType="boars"
                  entityId={verrat.id}
                  multiple
                  maxPhotos={20}
                  onUploaded={() => setPhotosRefreshKey((k) => k + 1)}
                />
                <PhotoGallery
                  entityType="boars"
                  entityId={verrat.id}
                  refreshKey={photosRefreshKey}
                />
              </div>
            </section>

            {/* ── Card 4 : ACTIONS ─────────────────────────────────────── */}
            <section aria-label="Actions" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Section label="ACTIONS" />
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
                  label="Ajouter une note"
                  onClick={() => setSheet('note')}
                />
                <ActionButton
                  icon={<Scale size={16} aria-hidden="true" />}
                  label="Peser ce verrat"
                  onClick={() => setSheet('pesee')}
                />
              </div>
            </section>
            </>
            )}

            {/* ── Saillies ───────────────────────────────────────────── */}
            {activeTab === 'saillies' && (
            <section aria-label="Saillies">
              <SectionDivider label={`Saillies · ${saillesVerrat.length}`} />
              {saillesVerrat.length === 0 ? (
                <div className="card-dense text-center py-6 mt-3 flex flex-col items-center gap-2.5">
                  <p
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      letterSpacing: '-0.01em',
                      margin: 0,
                    }}
                  >
                    Verrat non encore utilisé
                  </p>
                  <p className="text-[12px] text-text-2 max-w-xs">
                    Lance la première saillie pour activer le suivi.
                  </p>
                  <Button variant="primary" size="small" onClick={() => setSheet('saillie')} className="!mt-2">
                    + Saisir une saillie
                  </Button>
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
                          <div className="text-[11px] text-text-2 mt-0.5 truncate">
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
            )}

            {/* ── Historique soins ───────────────────────────────────── */}
            {activeTab === 'sante' && (
            <section aria-label="Historique soins">
              <SectionDivider label={`Historique soins · ${soins.length}`} />
              {soins.length === 0 ? (
                <div className="card-dense text-center py-6 mt-3">
                  <p className="text-[11px] text-text-2">
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
                          <div className="text-[11px] text-text-2 mt-0.5 truncate">
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
            )}

            {/* ── Lignée (placeholder V45 P4) ────────────────────────── */}
            {activeTab === 'lignee' && (
            <section aria-label="Lignée">
              <SectionDivider label="Lignée" />
              <div className="card-dense text-center py-6 mt-3">
                <p className="text-[12px] text-text-2 max-w-xs mx-auto">
                  Données de lignée à venir. L’origine et la boucle sont visibles dans l’onglet « Vue d’ensemble ».
                </p>
              </div>
            </section>
            )}
          </div>
        </div>
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

const DetailRow: React.FC<DetailRowProps> = ({ label, value, mono, accent }) => {
  const isEmpty = value === '—' || value == null || value === '';
  return (
    <div className="flex items-center justify-between px-3.5 py-3 border-b border-border last:border-b-0">
      <span className="text-[13px] text-text-1">{label}</span>
      <span
        className={`${mono ? 'tabular-nums' : ''} text-[13px] font-medium`}
        style={{
          color: accent || 'var(--text-0)',
          opacity: isEmpty ? 0.4 : 1,
          cursor: isEmpty ? 'help' : 'default',
        }}
        title={isEmpty ? 'Donnée non disponible — saisir une information pour activer.' : undefined}
        aria-label={isEmpty ? `${label} non disponible` : undefined}
      >
        {value}
      </span>
    </div>
  );
};

interface EditableDetailRowProps {
  label: string;
  children: React.ReactNode;
}

const EditableDetailRow: React.FC<EditableDetailRowProps> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-border last:border-b-0 min-h-[44px]">
    <span className="text-[13px] text-text-1 shrink-0">{label}</span>
    <span className="text-[13px] font-medium text-right">{children}</span>
  </div>
);

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onClick }) => (
  <Button
    variant="ghost"
    onClick={onClick}
    ariaLabel={label}
    className="card-dense !flex !flex-col !items-center !gap-2 !py-3.5 !rounded-md !h-auto"
    style={{ textTransform: 'none' }}
  >
    <span className="inline-flex w-8 h-8 rounded-lg bg-bg-1 border border-border items-center justify-center text-accent">
      {icon}
    </span>
    <span className="text-[11px] font-semibold uppercase tracking-wide text-text-1">
      {label}
    </span>
  </Button>
);

export default VerratDetailView;
