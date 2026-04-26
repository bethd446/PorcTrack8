import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IonContent, IonPage, IonModal, IonToast } from '@ionic/react';
import {
  Edit3, Activity, Heart, Award, AlertTriangle,
  CheckCircle2, AlertCircle, Info, TrendingDown,
} from 'lucide-react';

import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { Chip, SectionDivider } from '../../components/agritech';
import { useFarm } from '../../context/FarmContext';
import { genererFicheMerite } from '../../services/performanceAnalyzer';
import { useAuth } from '../../context/AuthContext';
import { enqueueUpdateRow } from '../../services/offlineQueue';
import type { BandePorcelets } from '../../types/farm';
import type { ChipTone } from '../../components/agritech/Chip';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Formate une date ISO (2026-05-10) ou FR (10/05/2026) en dd/MM/yyyy. */
function formatDate(s?: string): string {
  if (!s) return '—';
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return s;
}

/** Tone du chip selon le statut de la truie. */
function statutTone(statut: string): ChipTone {
  if (statut === 'Maternité' || statut === 'En maternité') return 'gold';
  if (statut === 'Pleine') return 'teal';
  if (statut === 'À surveiller') return 'amber';
  if (statut === 'Réforme' || statut === 'Morte') return 'red';
  return 'default';
}

// ─── Composant principal ──────────────────────────────────────────────────────

/**
 * TruieDetailView — Fiche complète d'une truie.
 * Combine l'identité, la reproduction, les actions métier contextuelles
 * et la fiche de mérite (réservée à l'ADMIN).
 */
const TruieDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { truies, bandes, saillies } = useFarm();
  const { isOwner } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState('');

  // ── Données métier ──────────────────────────────────────────────────────────

  const truie = useMemo(() =>
    truies.find(t => t.id === id || t.displayId === id),
  [truies, id]);

  const historique = useMemo(() => {
    if (!truie) return [];
    return bandes
      .filter(b => b.truie === truie.id || (!!truie.boucle && b.boucleMere === truie.boucle))
      .sort((a, b) => new Date(a.dateMB || 0).getTime() - new Date(b.dateMB || 0).getTime());
  }, [bandes, truie]);

  const sowSaillies = useMemo(() =>
    saillies.filter(s => s.truieId === truie?.id),
  [saillies, truie]);

  const merit = useMemo(() => {
    if (!truie) return null;
    return genererFicheMerite(truie, historique, sowSaillies);
  }, [truie, historique, sowSaillies]);

  // ── État non trouvé ─────────────────────────────────────────────────────────

  if (!truie || !merit) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <h1 className="ft-heading text-2xl uppercase">TRUIE INTROUVABLE</h1>
          <p className="mt-2 text-text-2">Cette truie n'existe pas dans les données de votre exploitation.</p>
          <button
            onClick={() => navigate('/troupeau')}
            className="mt-4 text-accent underline text-sm"
          >
            Retour au troupeau
          </button>
        </IonContent>
      </IonPage>
    );
  }

  // ── Actions métier ──────────────────────────────────────────────────────────

  const handleSevrer = () => {
    enqueueUpdateRow('SUIVI_TRUIES_REPRODUCTION', 'ID', truie.id, { STATUT: 'Sevrage' });
    setToast('Sevrage enregistré');
  };

  const handleConfirmerMB = () => {
    enqueueUpdateRow('SUIVI_TRUIES_REPRODUCTION', 'ID', truie.id, { STATUT: 'En maternité' });
    setToast('Mise-bas confirmée');
  };

  const handleReformer = () => {
    if (!window.confirm(`Confirmer la mise en réforme de la truie ${truie.displayId} ?`)) return;
    enqueueUpdateRow('SUIVI_TRUIES_REPRODUCTION', 'ID', truie.id, { STATUT: 'Réforme' });
    setToast('Truie passée en réforme');
  };

  const handleDetecterChaleur = () => {
    enqueueUpdateRow('SUIVI_TRUIES_REPRODUCTION', 'ID', truie.id, { STATUT: 'Chaleur' });
    setToast('Chaleur détectée');
  };

  const isMaternite = truie.statut === 'Maternité' || truie.statut === 'En maternité';
  const isPleine = truie.statut === 'Pleine';
  const isSurveillance = truie.statut === 'À surveiller';
  const isEnAttente = truie.statut === 'En attente saillie';

  // ── Rendu ───────────────────────────────────────────────────────────────────

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="TRUIE"
            subtitle={truie.displayId}
            backTo="/troupeau"
          />

          <div className="px-4 pt-4 pb-32 flex flex-col gap-6">

            {/* ── HERO ─────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* TruieIcon */}
                <svg
                  aria-hidden="true"
                  width="40"
                  height="40"
                  viewBox="0 0 40 40"
                  fill="currentColor"
                  className="text-accent opacity-60"
                >
                  <circle cx="20" cy="20" r="18" opacity="0.15" />
                  <ellipse cx="20" cy="22" rx="11" ry="8" opacity="0.6" />
                  <circle cx="20" cy="14" r="6" opacity="0.6" />
                </svg>
                <div>
                  <div className="ft-heading text-xl uppercase text-text-0">
                    {truie.displayId}
                    {truie.nom && (
                      <span className="ml-2 text-sm font-normal text-text-2 normal-case">
                        · {truie.nom}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-2 font-mono">{truie.boucle}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Chip label={truie.statut} tone={statutTone(truie.statut)} />
                <button
                  aria-label={`Éditer la truie ${truie.displayId}`}
                  onClick={() => setEditOpen(true)}
                  className="p-2 rounded-lg hover:bg-bg-1 text-text-2 hover:text-text-0 transition-colors"
                >
                  <Edit3 size={18} />
                </button>
              </div>
            </div>

            {/* ── ACTIONS RAPIDES ──────────────────────────────────────────── */}
            <div className="grid grid-cols-4 gap-2">
              {(['Soin', 'Pesée', 'Saillie', 'Note'] as const).map(action => (
                <button
                  key={action}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-bg-1 border border-border text-xs font-semibold text-text-1 hover:bg-bg-2 transition-colors"
                >
                  {action}
                </button>
              ))}
            </div>

            {/* ── IDENTITÉ ────────────────────────────────────────────────── */}
            <section aria-label="Identité" className="premium-card !p-4 flex flex-col gap-3">
              <h2 className="ft-heading text-xs uppercase text-text-2 tracking-widest">Identité</h2>
              <div className="grid grid-cols-2 gap-y-2">
                <span className="text-sm text-text-2">Boucle</span>
                <span className="text-sm font-mono text-right text-text-0">{truie.boucle}</span>

                {truie.race && (
                  <>
                    <span className="text-sm text-text-2">Race</span>
                    <span className="text-sm text-right text-text-0">{truie.race}</span>
                  </>
                )}

                {truie.poids !== undefined && (
                  <>
                    <span className="text-sm text-text-2">Poids</span>
                    <span className="text-sm font-mono text-right text-text-0">{truie.poids} kg</span>
                  </>
                )}

                {truie.nbPortees !== undefined && (
                  <>
                    <span className="text-sm text-text-2">Portées</span>
                    <span className="text-sm font-mono text-right text-text-0">{truie.nbPortees}</span>
                  </>
                )}

                <span className="text-sm text-text-2">Ration</span>
                <span className="text-sm font-mono text-right text-text-0">{truie.ration} kg/j</span>
              </div>
            </section>

            {/* ── REPRODUCTION ────────────────────────────────────────────── */}
            {truie.dateMBPrevue && (
              <section aria-label="Reproduction" className="premium-card !p-4 flex flex-col gap-3">
                <h2 className="ft-heading text-xs uppercase text-text-2 tracking-widest">Reproduction</h2>
                <div className="grid grid-cols-2 gap-y-2">
                  <span className="text-sm text-text-2">Mise-bas prévue</span>
                  <span className="text-sm font-mono text-right text-text-0">
                    {formatDate(truie.dateMBPrevue)}
                  </span>
                  {truie.stade && (
                    <>
                      <span className="text-sm text-text-2">Stade</span>
                      <span className="text-sm text-right text-text-0">{truie.stade}</span>
                    </>
                  )}
                </div>
              </section>
            )}

            {/* ── ACTIONS MÉTIER ───────────────────────────────────────────── */}
            <section aria-label="Actions métier" className="flex flex-col gap-2">
              <h2 className="ft-heading text-xs uppercase text-text-2 tracking-widest">Actions métier</h2>
              {isMaternite && (
                <button
                  onClick={handleSevrer}
                  className="premium-btn w-full text-center"
                >
                  Sevrer
                </button>
              )}
              {isPleine && (
                <button
                  onClick={handleConfirmerMB}
                  className="premium-btn w-full text-center"
                >
                  Confirmer MB
                </button>
              )}
              {isSurveillance && (
                <button
                  onClick={handleReformer}
                  className="premium-btn w-full text-center !border-red-500/30 text-red-600"
                >
                  Passer en réforme
                </button>
              )}
              {isEnAttente && (
                <button
                  onClick={handleDetecterChaleur}
                  className="premium-btn w-full text-center"
                >
                  Détecter chaleur
                </button>
              )}
              {!isMaternite && !isPleine && !isSurveillance && !isEnAttente && (
                <p className="text-xs text-text-2 italic py-2">
                  Aucune action disponible pour ce statut.
                </p>
              )}
            </section>

            {/* ── CTA MODIFIER TOUTES LES INFOS ───────────────────────────── */}
            <button
              aria-label={`Modifier toutes les infos de la truie ${truie.displayId}`}
              onClick={() => setEditOpen(true)}
              className="w-full p-4 rounded-2xl border border-dashed border-border bg-bg-1/50 text-left hover:bg-bg-1 transition-colors"
            >
              <div className="ft-heading text-sm uppercase text-text-0">
                Modifier toutes les infos de la truie {truie.displayId}
              </div>
              <div className="text-[11px] font-mono text-text-2 mt-1">
                Nom · Boucle · Race · Poids · Ration · Portées
              </div>
            </button>

            {/* ── FICHE DE MÉRITE (ADMIN / OWNER SEULEMENT) ───────────────── */}
            {isOwner && (
              <div className="flex flex-col gap-4">
                {/* Score de prolificité */}
                <div className="flex items-center justify-between bg-bg-1 p-4 rounded-2xl border border-border">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-mono text-text-2 tracking-wider">
                      Rang de Prolificité
                    </span>
                    <div className="flex items-center gap-2">
                      <Award size={20} className={merit.score === 'ELITE' ? 'text-amber-500' : 'text-text-2'} />
                      <span className="text-xl font-bold text-text-0 font-mono">{merit.score}</span>
                    </div>
                  </div>
                </div>

                {/* KPIs santé maternelle */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-bg-1 p-3 rounded-2xl border border-border flex flex-col gap-2">
                    <span className="text-[9px] uppercase font-mono tracking-wider text-text-2">ISSE Moyen</span>
                    <div className="text-lg font-bold text-text-0 font-mono">
                      {merit.isseMoyen ? `${merit.isseMoyen} j` : '—'}
                    </div>
                  </div>
                  <div className="bg-bg-1 p-3 rounded-2xl border border-border flex flex-col gap-2">
                    <span className="text-[9px] uppercase font-mono tracking-wider text-text-2">Survie Globale</span>
                    <div className="text-lg font-bold text-text-0 font-mono">
                      {merit.tauxSurvieGlobal}%
                    </div>
                  </div>
                </div>

                {/* Verdict biologique */}
                <div className={`p-4 rounded-2xl border-2 flex gap-3 ${
                  merit.decision === 'GARDER'
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700'
                    : merit.decision === 'A_SURVEILLER'
                    ? 'bg-amber-500/5 border-amber-500/20 text-amber-700'
                    : 'bg-red-500/5 border-red-500/20 text-red-700'
                }`}>
                  <div className="shrink-0 pt-0.5">
                    {merit.decision === 'REFORMER'
                      ? <AlertTriangle size={18} />
                      : <CheckCircle2 size={18} />}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold font-mono tracking-widest opacity-70">
                      Verdict Biologique
                    </span>
                    <p className="text-[13px] font-medium leading-relaxed">{merit.verdictBio}</p>
                  </div>
                </div>

                {/* Timeline NV */}
                <section className="space-y-4">
                  <SectionDivider label="Évolution Carrière (Nés Vivants)" />
                  <PorteesTimeline portees={historique} />
                </section>
              </div>
            )}

          </div>
        </AgritechLayout>

        {/* ── MODAL ÉDITION ───────────────────────────────────────────────── */}
        <IonModal isOpen={editOpen} onDidDismiss={() => setEditOpen(false)}>
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="ft-heading text-lg uppercase">
                Modifier {truie.displayId}
              </h2>
              <button
                onClick={() => setEditOpen(false)}
                className="p-2 rounded-lg text-text-2 hover:text-text-0"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-text-2">
              Formulaire d'édition complet disponible prochainement.
            </p>
            <button
              onClick={() => setEditOpen(false)}
              className="premium-btn w-full"
            >
              Fermer
            </button>
          </div>
        </IonModal>

        <IonToast
          isOpen={!!toast}
          message={toast}
          duration={2000}
          onDidDismiss={() => setToast('')}
        />
      </IonContent>
    </IonPage>
  );
};

// ─── Sous-composant : timeline portées ──────────────────────────────────────

const PorteesTimeline: React.FC<{ portees: BandePorcelets[] }> = ({ portees }) => {
  if (portees.length === 0) {
    return (
      <div className="p-8 text-center text-text-2 text-xs italic bg-bg-1 rounded-2xl border border-dashed border-border">
        Aucune portée enregistrée
      </div>
    );
  }

  const maxNV = Math.max(...portees.map(p => p.nv || 0), 15);

  return (
    <div className="bg-bg-1 p-5 rounded-2xl border border-border">
      <div className="flex items-end justify-around h-32 gap-2">
        {portees.map((p, idx) => {
          const nv = p.nv || 0;
          const heightPct = (nv / maxNV) * 100;
          return (
            <div key={p.id} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="relative w-full flex justify-center items-end h-full">
                <div
                  className={`w-full max-w-[24px] rounded-t-md ${
                    nv > 12 ? 'bg-amber-500' : nv >= 9 ? 'bg-teal-500' : 'bg-red-500'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="text-[8px] font-mono text-text-2 uppercase">C{idx + 1}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-[10px] text-text-2 font-mono uppercase tracking-widest">
        Cycles de production
      </p>
    </div>
  );
};

export default TruieDetailView;
