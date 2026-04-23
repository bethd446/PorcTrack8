/**
 * SaillieSuiviPanel — Bandeau « Saillie en cours » pour TruieDetailView.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Contexte métier :
 *   Quand une truie a une saillie active (statut `Active`) ET qu'elle est
 *   en gestation canonique (PLEINE), on affiche un panneau dédié qui
 *   synthétise les fenêtres clés du cycle :
 *
 *     J0  ─── Saillie
 *     J18-J24  ─── Fenêtre retour chaleur (pic J21, cycle œstral ~21j)
 *     J25-J35  ─── Fenêtre échographie (confirmation gestation)
 *     J115 ─── Mise-bas prévue
 *
 * Deux actions principales (patch → `SUIVI_REPRODUCTION_ACTUEL`) :
 *   • Confirmer saillie       → STATUT = 'Confirmée'
 *   • Signaler retour chaleur → STATUT = 'Non confirmée' + NOTES append
 *                                + statut truie → 'En attente saillie' (déclenche R3)
 *
 * Bonus :
 *   • À J+21 sans retour chaleur signalé, un CTA présomption gestation est
 *     promu en tête du panneau.
 *   • Un accordéon (fermé par défaut) expose 9 conseils métier saillie.
 *
 * Note : ce composant NE déclenche PAS l'alerte R3 directement — il met à
 * jour le statut truie (`En attente saillie`) ; `alertEngine.checkRetourChaleur` se
 * chargera de produire l'alerte lors du prochain passage.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IonToast } from '@ionic/react';
import {
  CheckCircle2,
  Heart,
  HeartPulse,
  ChevronDown,
  CalendarDays,
  Baby,
  AlertTriangle,
  Lightbulb,
  X,
  Sparkles,
  Stethoscope,
} from 'lucide-react';

import { BottomSheet } from '../../components/agritech';
import { enqueueUpdateRow } from '../../services/offlineQueue';
import { useFarm } from '../../context/FarmContext';
import { useEscapeKey } from '../../components/forms/useFormA11y';
import type { Saillie, Truie, Verrat } from '../../types/farm';

// ─── Helpers date ──────────────────────────────────────────────────────────

function parseFrDate(s?: string): Date | null {
  if (!s) return null;
  const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (fr) return new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  return null;
}

function formatFr(d: Date | null): string {
  if (!d) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function formatFrShort(d: Date | null): string {
  if (!d) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Conseils métier (senior farmer — saillie réussie) ────────────────────

interface Conseil {
  titre: string;
  detail: string;
}

const CONSEILS: readonly Conseil[] = [
  {
    titre: 'Fenêtre post-sevrage',
    detail:
      'Saillir la truie entre J+4 et J+7 post-sevrage (pic de chaleurs J+5). Au-delà de J+10 sans œstrus, suspecter un anœstrus post-sevrage (carence énergétique, stress, pathologie).',
  },
  {
    titre: 'Flushing pré-saillie',
    detail:
      'Augmenter la ration de +20% pendant 5-7 jours avant saillie pour booster l\'ovulation (favorise les grandes portées).',
  },
  {
    titre: 'Double saillie',
    detail:
      'Saillir J0 puis répéter 12-24h plus tard pour couvrir la fenêtre d\'ovulation (24-48h).',
  },
  {
    titre: 'Détection chaleur fiable',
    detail:
      'Test d\'immobilité au verrat / à la pression du dos. Vulve gonflée + rouge + écoulement mucoïde = œstrus optimal.',
  },
  {
    titre: 'Rotation verrats',
    detail:
      'Alterner 2-3 verrats réduit le risque d\'infertilité et renforce la sélection génétique.',
  },
  {
    titre: 'Environnement calme',
    detail:
      'Pas de déplacement brusque, température 18-22°C, éclairage stable. Le stress = échec saillie.',
  },
  {
    titre: 'Condition corporelle (BCS)',
    detail:
      'BCS cible 3 à 3,5 (note 1-5). Trop maigre (<3) = anœstrus. Trop grasse (>4) = embryons perdus.',
  },
  {
    titre: 'Timing des saillies',
    detail:
      'Chaleurs de 48-72h : saillir en début (12-24h après détection) ET en fin (36-48h).',
  },
  {
    titre: 'Vérifier le verrat',
    detail:
      'Libido + qualité sperme (examen périodique). Jeune verrat : 2-3 saillies/semaine maximum.',
  },
];

// ─── Types ────────────────────────────────────────────────────────────────

interface SaillieSuiviPanelProps {
  truie: Truie;
  saillie: Saillie;
  onSuccess?: () => void;
}

type ModalKind = null | 'confirmer' | 'retour' | 'presomption';

// ─── Composant ────────────────────────────────────────────────────────────

const SaillieSuiviPanel: React.FC<SaillieSuiviPanelProps> = ({
  truie,
  saillie,
  onSuccess,
}) => {
  const { verrats, refreshData } = useFarm();
  const [expanded, setExpanded] = useState<boolean>(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<string>('');
  // Anti-spam double-clic : un useRef garantit que 2 taps rapides avant que
  // setSaving(true) ne soit reflété dans le render ne déclenchent pas 2
  // enqueueUpdateRow dupliqués.
  const savingRef = useRef<boolean>(false);

  // ── Horloge système (Sprint 6 fix minuit) ───────────────────────────────
  // today passe de useMemo à useState pour forcer le recalcul des fenêtres
  // J18-J24 / J25-J35 quand la date change (veille ou minuit passé).
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const update = () => setToday(new Date());
    // Resync à chaque retour au premier plan (mobile)
    document.addEventListener('visibilitychange', update);
    // Garde-fou horaire pour sessions prolongées
    const interval = setInterval(update, 3600_000);

    return () => {
      document.removeEventListener('visibilitychange', update);
      clearInterval(interval);
    };
  }, []);

  const dateSaillie = useMemo(() => parseFrDate(saillie.dateSaillie), [saillie.dateSaillie]);
  const dateMBPrevue = useMemo(
    () =>
      parseFrDate(saillie.dateMBPrevue) ??
      parseFrDate(truie.dateMBPrevue) ??
      (dateSaillie ? addDays(dateSaillie, 115) : null),
    [saillie.dateMBPrevue, truie.dateMBPrevue, dateSaillie],
  );

  const jour = dateSaillie ? daysBetween(dateSaillie, today) : null;

  // ── Fenêtres ────────────────────────────────────────────────────────────
  const fenetreChaleur = useMemo(() => {
    if (!dateSaillie) return { start: null, end: null, active: false };
    const start = addDays(dateSaillie, 18);
    const end = addDays(dateSaillie, 24);
    const active = today >= start && today <= end;
    return { start, end, active };
  }, [dateSaillie, today]);

  const fenetreEcho = useMemo(() => {
    if (!dateSaillie) return { start: null, end: null, active: false };
    const start = addDays(dateSaillie, 25);
    const end = addDays(dateSaillie, 35);
    const active = today >= start && today <= end;
    return { start, end, active };
  }, [dateSaillie, today]);

  // ── Verrat lookup ───────────────────────────────────────────────────────
  const verrat: Verrat | undefined = useMemo(
    () =>
      verrats.find(
        v => v.id === saillie.verratId || v.displayId === saillie.verratId,
      ),
    [verrats, saillie.verratId],
  );

  const verratLabel = verrat
    ? `${verrat.displayId}${verrat.nom ? ' · ' + verrat.nom : ''}`
    : saillie.verratId || '—';
  const verratBoucle = verrat?.boucle ?? '—';

  // ── Détection retour chaleur déjà signalé ──────────────────────────────
  // Match strict sur le tag canonique `Retour chaleur dd/MM/yyyy` qu'on pose
  // dans runSignalerRetour — évite les faux positifs type "pas de retour
  // chaleur observé".
  const retourDejaSignale = useMemo(() => {
    if (!saillie.notes) return false;
    return /Retour chaleur \d{2}\/\d{2}\/\d{4}/.test(saillie.notes);
  }, [saillie.notes]);

  // ── Présomption gestation (J+21 sans retour signalé) ───────────────────
  const showPresomption =
    jour !== null &&
    jour >= 21 &&
    !retourDejaSignale &&
    /active/i.test(saillie.statut || '');

  // ── Actions ─────────────────────────────────────────────────────────────
  const openModal = useCallback(
    (kind: ModalKind) => {
      if (saving) return;
      setModal(kind);
    },
    [saving],
  );

  const closeModal = useCallback(() => {
    if (saving) return;
    setModal(null);
  }, [saving]);

  useEscapeKey(modal !== null && !saving, closeModal);

  async function runConfirmerSaillie(): Promise<void> {
    if (!dateMBPrevue) return;
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await enqueueUpdateRow(
        'SUIVI_REPRODUCTION_ACTUEL',
        'ID TRUIE',
        saillie.truieId,
        { STATUT: 'Confirmée' },
      );
      setToast(`Gestation confirmée · suivi jusqu'à MB ${formatFrShort(dateMBPrevue)}`);
      try {
        await refreshData();
      } catch (err) {
        // Le patch réseau a réussi — seule la resync locale a échoué. On
        // signale sans remonter : retry auto au prochain cycle de refresh.
        console.warn(
          '[SaillieSuiviPanel] refreshData failed after saillie confirmation:',
          err,
        );
        setToast('Synchronisé · actualisation en cours…');
      }
      if (onSuccess) onSuccess();
      setModal(null);
    } catch (err) {
      setToast(
        err instanceof Error
          ? `Erreur : ${err.message}`
          : 'Erreur enregistrement',
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function runSignalerRetour(): Promise<void> {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const dateLabel = formatFr(today);
      const existingNotes = (saillie.notes ?? '').trim();
      const TAG = `Retour chaleur ${dateLabel}`;
      const TAG_LEN = TAG.length;
      const MAX = 200;
      // Priorité au tag canonique : il DOIT rester intact (matché par la
      // regex `retourDejaSignale`). On tronque l'historique si besoin.
      const SEP = ' · ';
      const availForHistory = MAX - TAG_LEN - SEP.length;
      const trimmedExisting =
        existingNotes.length > availForHistory
          ? existingNotes.slice(0, Math.max(0, availForHistory)).trimEnd()
          : existingNotes;
      const notesCapped = trimmedExisting
        ? `${trimmedExisting}${SEP}${TAG}`
        : TAG;

      await enqueueUpdateRow(
        'SUIVI_REPRODUCTION_ACTUEL',
        'ID TRUIE',
        saillie.truieId,
        { STATUT: 'Non confirmée', NOTES: notesCapped },
      );
      // Met la truie en "En attente saillie" pour que R3 puisse repérer la
      // fenêtre de retour chaleur post-signalement. Valeur canonique alignée
      // avec `alertEngine.ts:302/397` et `types.ts:17`.
      //
      // Atomicité : le 1er patch (saillie → Non confirmée) est déjà persisté.
      // Si le 2e échoue, offlineQueue n'expose pas de rollback sûr, donc on
      // préfère signaler clairement à l'utilisateur plutôt que de tenter une
      // rollback qui pourrait elle-même échouer. On remonte l'erreur pour
      // garder la modal ouverte et inviter à ressayer.
      try {
        await enqueueUpdateRow(
          'SUIVI_TRUIES_REPRODUCTION',
          'ID',
          truie.id,
          { STATUT: 'En attente saillie' },
        );
      } catch (err) {
        console.error(
          '[SaillieSuiviPanel] Truie status patch failed after saillie status patch succeeded — manual correction needed:',
          err,
        );
        setToast(
          '⚠ ÉCHEC CRITIQUE : Saillie annulée mais statut truie NON mis à jour. Veuillez corriger manuellement le statut Truie en "En attente saillie".',
        );
        throw err;
      }
      setToast('Retour chaleur signalé · truie en attente saillie');
      try {
        await refreshData();
      } catch (err) {
        // Patch réseau OK — resync locale KO. Non bloquant : retry auto.
        console.warn(
          '[SaillieSuiviPanel] refreshData failed after retour chaleur signal:',
          err,
        );
        setToast('Synchronisé · actualisation en cours…');
      }
      if (onSuccess) onSuccess();
      setModal(null);
    } catch (err) {
      // Ne pas écraser un toast déjà posé par le catch interne du 2e patch.
      setToast(prev =>
        prev.startsWith('⚠ Saillie marquée')
          ? prev
          : err instanceof Error
            ? `Erreur : ${err.message}`
            : 'Erreur enregistrement',
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  // ── Render guard ────────────────────────────────────────────────────────
  if (!dateSaillie) return null;

  // ── Timeline progress (0 → 115) ────────────────────────────────────────
  const progressPct = jour !== null
    ? Math.max(0, Math.min(100, (jour / 115) * 100))
    : 0;

  return (
    <>
      <section
        aria-label="Suivi saillie en cours"
        className="relative overflow-hidden rounded-2xl-v2 border border-accent/30 bg-bg-1"
      >
        {/* Barre latérale accent */}
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 h-full w-[3px] bg-accent"
        />

        <div className="flex flex-col gap-4 px-4 py-4">
          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-bg-2 text-accent"
                  aria-hidden="true"
                >
                  <HeartPulse size={15} />
                </span>
                <h2 className="ft-heading text-[14px] uppercase tracking-wide text-text-0">
                  Saillie en cours
                </h2>
              </div>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-text-2">
                Suivi cycle gestation · 115 jours
              </p>
            </div>
            {jour !== null ? (
              <div className="shrink-0 text-right">
                <div className="ft-heading text-[22px] leading-none text-accent tabular-nums">
                  J+{jour}
                </div>
                <div className="mt-1 font-mono text-[9px] uppercase tracking-wide text-text-2">
                  jour cycle
                </div>
              </div>
            ) : null}
          </div>

          {/* ── Timeline ──────────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <div className="relative h-1.5 w-full rounded-full bg-bg-2 overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-accent/70"
                style={{ width: `${progressPct}%` }}
                aria-hidden="true"
              />
              {/* Marqueurs fenêtres */}
              <span
                aria-hidden="true"
                className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 bg-red/80"
                style={{ left: `${(21 / 115) * 100}%` }}
              />
              <span
                aria-hidden="true"
                className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 bg-blue/80"
                style={{ left: `${(30 / 115) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wide text-text-2 tabular-nums">
              <span>J0 · {formatFrShort(dateSaillie)}</span>
              <span>J21 chaleur</span>
              <span>J30 écho</span>
              <span>MB · {formatFrShort(dateMBPrevue)}</span>
            </div>
          </div>

          {/* ── KPI grid : Saillie · MB · Verrat ──────────────────────── */}
          <div className="grid grid-cols-3 gap-2">
            <KpiTile
              label="Saillie"
              value={formatFr(dateSaillie)}
              sub={jour !== null ? `J+${jour}` : ''}
              icon={<CalendarDays size={13} aria-hidden="true" />}
            />
            <KpiTile
              label="MB prévue"
              value={formatFr(dateMBPrevue)}
              sub="115j"
              icon={<Baby size={13} aria-hidden="true" />}
              tone="gold"
            />
            <KpiTile
              label="Verrat"
              value={verrat?.displayId || saillie.verratId || '—'}
              sub={verratBoucle}
              icon={<Sparkles size={13} aria-hidden="true" />}
            />
          </div>

          {/* ── Fenêtres d'observation ───────────────────────────────── */}
          <div className="grid grid-cols-2 gap-2">
            <WindowTile
              kind="chaleur"
              active={fenetreChaleur.active}
              label="Retour chaleur"
              range={`J18-J24 · pic J21`}
              dates={
                fenetreChaleur.start && fenetreChaleur.end
                  ? `${formatFrShort(fenetreChaleur.start)} → ${formatFrShort(fenetreChaleur.end)}`
                  : '—'
              }
            />
            <WindowTile
              kind="echo"
              active={fenetreEcho.active}
              label="Échographie"
              range="J25-J35"
              dates={
                fenetreEcho.start && fenetreEcho.end
                  ? `${formatFrShort(fenetreEcho.start)} → ${formatFrShort(fenetreEcho.end)}`
                  : '—'
              }
            />
          </div>

          {/* ── Présomption J+21 (CTA promu) ─────────────────────────── */}
          {showPresomption ? (
            <button
              type="button"
              onClick={() => openModal('presomption')}
              disabled={saving}
              className="pressable group flex w-full items-center gap-3 rounded-lg border border-gold/40 bg-gold/10 px-3 py-3 text-left transition-colors hover:bg-gold/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
              aria-label="Confirmer la gestation présumée — aucun retour chaleur observé"
            >
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-1 text-gold"
                aria-hidden="true"
              >
                <CheckCircle2 size={18} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="ft-heading block text-[12px] uppercase tracking-wide text-gold">
                  Confirmer gestation (présumée)
                </span>
                <span className="mt-0.5 block font-mono text-[10px] text-text-1">
                  J+{jour} · pas de retour chaleur observé
                </span>
              </span>
            </button>
          ) : null}

          {/* ── CTA principales ──────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => openModal('confirmer')}
              disabled={saving}
              aria-label="Confirmer la saillie"
              className="pressable inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-accent text-bg-0 font-mono text-[11px] font-bold uppercase tracking-wide transition-opacity hover:brightness-110 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              <CheckCircle2 size={14} aria-hidden="true" />
              Confirmer saillie
            </button>
            <button
              type="button"
              onClick={() => openModal('retour')}
              disabled={saving}
              aria-label="Signaler un retour chaleur"
              className="pressable inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-red/60 bg-bg-1 text-red font-mono text-[11px] font-bold uppercase tracking-wide transition-colors hover:bg-red/10 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red focus-visible:outline-offset-2"
            >
              <HeartPulse size={14} aria-hidden="true" />
              Retour chaleur
            </button>
          </div>

          {/* ── Accordéon conseils ───────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-bg-0/60">
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              aria-expanded={expanded}
              aria-controls="saillie-conseils-panel"
              className="pressable flex w-full items-center gap-2.5 px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-bg-2 text-amber"
                aria-hidden="true"
              >
                <Lightbulb size={14} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="ft-heading block text-[11px] uppercase tracking-wide text-text-0">
                  Conseils saillie réussie
                </span>
                <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-wide text-text-2">
                  {CONSEILS.length} règles métier
                </span>
              </span>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className={`shrink-0 text-text-2 transition-transform duration-200 ${
                  expanded ? 'rotate-180' : ''
                }`}
              />
            </button>
            {expanded ? (
              <ol
                id="saillie-conseils-panel"
                className="grid gap-2 border-t border-border px-3 py-3"
              >
                {CONSEILS.map((c, i) => (
                  <li
                    key={c.titre}
                    className="flex gap-2.5 rounded-md bg-bg-1 px-2.5 py-2"
                  >
                    <span
                      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber/15 font-mono text-[10px] font-bold text-amber tabular-nums"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="ft-heading text-[11px] uppercase tracking-wide text-text-0">
                        {c.titre}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-text-1">
                        {c.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── Modal confirmation saillie / présomption ────────────────── */}
      <BottomSheet
        isOpen={modal === 'confirmer' || modal === 'presomption'}
        onClose={closeModal}
        title={
          modal === 'presomption'
            ? 'Confirmer gestation présumée'
            : 'Confirmer saillie'
        }
      >
        <ConfirmBody
          kind="confirmer"
          truieId={truie.displayId}
          verratLabel={verratLabel}
          dateSaillie={formatFr(dateSaillie)}
          dateMB={formatFr(dateMBPrevue)}
          jour={jour}
          presumed={modal === 'presomption'}
          saving={saving}
          onCancel={closeModal}
          onConfirm={runConfirmerSaillie}
        />
      </BottomSheet>

      {/* ── Modal retour chaleur ────────────────────────────────────── */}
      <BottomSheet
        isOpen={modal === 'retour'}
        onClose={closeModal}
        title="Signaler retour chaleur"
      >
        <ConfirmBody
          kind="retour"
          truieId={truie.displayId}
          verratLabel={verratLabel}
          dateSaillie={formatFr(dateSaillie)}
          dateMB={formatFr(dateMBPrevue)}
          jour={jour}
          presumed={false}
          saving={saving}
          onCancel={closeModal}
          onConfirm={runSignalerRetour}
        />
      </BottomSheet>

      <IonToast
        isOpen={toast !== ''}
        message={toast}
        duration={2200}
        onDidDismiss={() => setToast('')}
        position="bottom"
      />
    </>
  );
};

// ─── Sous-composants ──────────────────────────────────────────────────────

interface KpiTileProps {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'gold';
}

const KpiTile: React.FC<KpiTileProps> = ({ label, value, sub, icon, tone = 'default' }) => (
  <div className="flex flex-col gap-1 rounded-md border border-border bg-bg-0/60 px-2.5 py-2">
    <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wide text-text-2">
      {icon ? (
        <span aria-hidden="true" className="text-text-2">
          {icon}
        </span>
      ) : null}
      <span className="truncate">{label}</span>
    </div>
    <div
      className={`ft-heading text-[13px] leading-tight tabular-nums ${
        tone === 'gold' ? 'text-gold' : 'text-text-0'
      }`}
    >
      {value}
    </div>
    {sub ? (
      <div className="font-mono text-[9px] text-text-2 tabular-nums truncate">
        {sub}
      </div>
    ) : null}
  </div>
);

interface WindowTileProps {
  kind: 'chaleur' | 'echo';
  active: boolean;
  label: string;
  range: string;
  dates: string;
}

const WindowTile: React.FC<WindowTileProps> = ({ kind, active, label, range, dates }) => {
  const icon =
    kind === 'chaleur' ? (
      <Heart size={13} aria-hidden="true" />
    ) : (
      <Stethoscope size={13} aria-hidden="true" />
    );
  const accentClasses =
    kind === 'chaleur'
      ? active
        ? 'border-red/70 bg-red/10 text-red'
        : 'border-border bg-bg-0/40 text-text-2'
      : active
        ? 'border-blue/70 bg-blue/10 text-blue'
        : 'border-border bg-bg-0/40 text-text-2';

  return (
    <div
      className={`flex flex-col gap-1 rounded-md border px-2.5 py-2 transition-colors ${accentClasses}`}
      role="group"
      aria-label={`Fenêtre ${label}${active ? ' — active' : ''}`}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <span aria-hidden="true">{icon}</span>
          <span className="ft-heading text-[10px] uppercase tracking-wide">
            {label}
          </span>
        </div>
        {active ? (
          <span
            className="font-mono text-[8px] font-bold uppercase tracking-wide rounded-full px-1.5 py-[1px]"
            style={{ backgroundColor: 'color-mix(in srgb, currentColor 15%, transparent)' }}
          >
            Active
          </span>
        ) : null}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wide">
        {range}
      </div>
      <div className="font-mono text-[10px] text-text-1 tabular-nums truncate">
        {dates}
      </div>
    </div>
  );
};

interface ConfirmBodyProps {
  kind: 'confirmer' | 'retour';
  truieId: string;
  verratLabel: string;
  dateSaillie: string;
  dateMB: string;
  jour: number | null;
  presumed: boolean;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

const ConfirmBody: React.FC<ConfirmBodyProps> = ({
  kind,
  truieId,
  verratLabel,
  dateSaillie,
  dateMB,
  jour,
  presumed,
  saving,
  onCancel,
  onConfirm,
}) => {
  const isDanger = kind === 'retour';
  const tone = isDanger ? 'var(--red)' : 'var(--accent)';
  const Icon = isDanger ? AlertTriangle : CheckCircle2;
  const headline = isDanger
    ? 'Signaler un retour chaleur ?'
    : presumed
      ? 'Confirmer la gestation présumée ?'
      : 'Confirmer la saillie ?';
  const explain = isDanger
    ? 'La saillie sera marquée « Non confirmée ». La truie repassera en attente de saillie — une alerte chaleur post-sevrage sera générée au prochain refresh.'
    : presumed
      ? `Aucun retour chaleur observé depuis J+${jour ?? '—'}. La gestation est considérée acquise. Le suivi continuera jusqu'à la mise-bas.`
      : 'La saillie sera confirmée. La truie reste en gestation jusqu\'à la date de mise-bas prévue.';

  return (
    <div className="flex flex-col gap-5" aria-busy={saving}>
      {/* Header icône + question */}
      <div className="flex items-start gap-3">
        <span
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-bg-2"
          style={{ color: tone }}
          aria-hidden="true"
        >
          <Icon size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="ft-heading text-[16px] uppercase tracking-wide text-text-0">
            {headline}
          </h3>
          <p className="mt-1 text-[12px] leading-snug text-text-1">
            {explain}
          </p>
        </div>
      </div>

      {/* Résumé saillie */}
      <dl className="grid gap-0 overflow-hidden rounded-md border border-border bg-bg-0/60">
        <SummaryRow label="Truie" value={truieId} />
        <SummaryRow label="Verrat" value={verratLabel} />
        <SummaryRow label="Date saillie" value={dateSaillie} mono />
        <SummaryRow label="MB prévue" value={dateMB} mono />
        {jour !== null ? (
          <SummaryRow label="Jour cycle" value={`J+${jour}`} mono last />
        ) : null}
      </dl>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          aria-label="Annuler"
          className="pressable flex-1 inline-flex h-12 items-center justify-center gap-1.5 rounded-md bg-bg-1 border border-border text-text-1 font-mono text-[11px] font-bold uppercase tracking-wide transition-colors hover:border-text-2 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          <X size={14} aria-hidden="true" />
          Annuler
        </button>
        <button
          type="button"
          onClick={() => void onConfirm()}
          disabled={saving}
          aria-label={isDanger ? 'Signaler le retour chaleur' : 'Confirmer'}
          className={[
            'pressable flex-[2] inline-flex h-12 items-center justify-center gap-1.5 rounded-md',
            'font-mono text-[12px] font-bold uppercase tracking-wide',
            'transition-opacity disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
            isDanger
              ? 'bg-red text-bg-0 hover:brightness-110 focus-visible:outline-red'
              : 'bg-accent text-bg-0 hover:brightness-110 focus-visible:outline-accent',
          ].join(' ')}
        >
          {saving ? (
            <span className="animate-pulse">Enregistrement…</span>
          ) : (
            <>
              {isDanger ? (
                <HeartPulse size={14} aria-hidden="true" />
              ) : (
                <CheckCircle2 size={14} aria-hidden="true" />
              )}
              {isDanger ? 'Signaler retour' : 'Confirmer'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

interface SummaryRowProps {
  label: string;
  value: string;
  mono?: boolean;
  last?: boolean;
}

const SummaryRow: React.FC<SummaryRowProps> = ({ label, value, mono, last }) => (
  <div
    className={`flex items-center justify-between gap-2 px-3 py-2.5 ${
      last ? '' : 'border-b border-border'
    }`}
  >
    <dt className="font-mono text-[10px] uppercase tracking-wide text-text-2">
      {label}
    </dt>
    <dd
      className={`text-[12px] text-text-0 ${mono ? 'font-mono tabular-nums' : ''}`}
    >
      {value}
    </dd>
  </div>
);

export default SaillieSuiviPanel;
