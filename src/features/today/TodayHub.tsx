/**
 * TodayHub — /today
 * ══════════════════════════════════════════════════════════════════════════
 * Copilote de décision matinal. Point d'entrée par défaut de l'app.
 *
 * Hiérarchie (refonte V13) :
 *   1. Header BigShoulders : "Bonjour, {firstName}" + date
 *   2. TÂCHE PRIORITAIRE — single hero card (algorithme : sevrage retard ≥5j
 *      > mise-bas imminente J-1/J0 > stock rupture > stock bas + sevrages
 *      proches > "tout sous contrôle")
 *   3. AUSSI À TRAITER — top 5 alertes urgentes dédupliquées (CRITIQUE+HAUTE
 *      fusionne alertes locales/serveur + confirmations en attente)
 *   4. TON ÉLEVAGE — résumé fermier (bandes, truies/verrats, repro)
 *   5. TOURNÉE DU JOUR — checklist terrain
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  IonContent, IonPage, IonRefresher, IonRefresherContent,
} from '@ionic/react';
import {
  ArrowRight, ChevronRight, ClipboardCheck, ShieldCheck,
} from 'lucide-react';

import { AppToast, AlertCard, useAppToast } from '../../components/agritech';
import AgritechLayout from '../../components/AgritechLayout';
import { Section, Card, Button, IconBox, PageHeader } from '@/design-system';
import { useAuth } from '../../context/AuthContext';
import { usePilotage } from '../../context/PilotageContext';
import { useRessources } from '../../context/RessourcesContext';
import { useMeta } from '../../context/FarmContext';
import { useTroupeau } from '../../context/TroupeauContext';
import { resolveAlertSubject } from '../../utils/alertSubject';
import type { AlertPriority, FarmAlert } from '../../services/alertEngine';
import { dismissAlert } from '../../services/alertDismissals';
import { supabase } from '../../services/supabaseClient';
import {
  getPendingConfirmations,
  type PendingConfirmation,
} from '../../services/confirmationQueue';
import { getSevrages } from '../../services/proactiveCues';
import { filterRealPortees } from '../../services/bandesAggregator';
import { normaliseStatut } from '../../lib/truieStatut';
import { safeDate } from '../../lib/truieHelpers';
import type { BandePorcelets, Truie } from '../../types/farm';
import QuickConfirmSevrageForm from '../../components/forms/QuickConfirmSevrageForm';
import QuickConfirmReformeForm from '../../components/forms/QuickConfirmReformeForm';
import QuickPeseeForm from '../../components/forms/QuickPeseeForm';
import PhaseSuggestionCard from '../../components/cards/PhaseSuggestionCard';
import PhaseTransitionModal from '../../components/modals/PhaseTransitionModal';
import type { PendingTransition } from '../../services/phaseEngine';
import { usePhaseTransitions } from '../../hooks/usePhaseTransitions';
import { usePeseePending } from '../../hooks/usePeseePending';
import type { PeseePlanifiee } from '../../services/peseePlanifieesService';

/** Routing par catégorie pour les alertes (B2 sprint, ressoudé V14). */
function alertHref(a: FarmAlert): string {
  switch (a.category) {
    case 'STOCK':
      return '/ressources/aliments?filter=stock-bas';
    case 'BANDES':
      return a.subjectId ? `/troupeau/bandes/${a.subjectId}` : '/troupeau?view=bandes';
    case 'REPRO':
      return a.subjectId ? `/troupeau/truies/${a.subjectId}` : '/troupeau';
    case 'SANTE':
      return '/ressources/pharmacie';
    default:
      return '/alerts';
  }
}

const PRIORITY_ORDER: Record<AlertPriority, number> = {
  CRITIQUE: 0,
  HAUTE: 1,
  NORMALE: 2,
  INFO: 3,
};

const SEVRAGE_RETARD_SEUIL_J = 5;
const MB_IMMINENTE_FENETRE_J = 1;
const SEVRAGE_PROCHE_FENETRE_J = 7;

type PrimaryTaskKind =
  | 'SEVRAGE_RETARD'
  | 'MB_IMMINENTE'
  | 'STOCK_RUPTURE'
  | 'STOCK_BAS_SEVRAGE'
  | 'IDLE';

interface PrimaryTask {
  kind: PrimaryTaskKind;
  title: string;
  detail?: string;
  cta: string;
  to: string;
}

/** Affiche "Bande {code}" en évitant le doublon "Bande Bande X" si idPortee contient déjà le mot. */
const formatBandeLabel = (raw: string): string => {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return 'Bande';
  return /^bande\b/i.test(trimmed) ? trimmed : `Bande ${trimmed}`;
};

const TodayHub: React.FC = () => {
  const navigate = useNavigate();
  const { userName, user } = useAuth();
  const { alerts, alertesServeur } = usePilotage();
  const { notes, stockAliment } = useRessources();
  const { recomputeAlerts } = useMeta();
  const { bandes, truies, verrats } = useTroupeau();
  const lookup = useMemo(() => ({ bandes, truies, verrats }), [bandes, truies, verrats]);
  const { show: showToast, toastProps } = useAppToast();

  // ── Transitions de phase suggérées (R15/R16 — alertes ⨝ phaseEngine) ───
  const { pending: pendingTransitions, confirm: confirmTransition, dismiss: dismissTransition } =
    usePhaseTransitions();
  const [selectedTransition, setSelectedTransition] = useState<PendingTransition | null>(null);

  const handleDismissAussi = useCallback(async (alertId: string) => {
    if (!user) return;
    try {
      await dismissAlert(user.id, alertId, 'manual');
      showToast('Alerte ignorée pour 30 jours', 'info', { duration: 2200 });
      await recomputeAlerts();
    } catch (e) {
      console.warn('[TodayHub] dismiss failed', e);
      showToast('Erreur lors de l\'ignorance', 'error', { duration: 2200 });
    }
  }, [user, recomputeAlerts, showToast]);

  // ── Confirmations en attente (file persistante) ───────────────────────
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([]);
  useEffect(() => {
    let cancelled = false;
    void getPendingConfirmations().then((items) => {
      if (!cancelled) setPendingConfirmations(items);
    });
    return () => {
      cancelled = true;
    };
  }, [alerts]);

  const firstName = (() => {
    const capitalize = (s: string): string =>
      s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    const parts = (userName || 'Utilisateur').split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'Utilisateur';
    const skipPrefixes = new Set(['Ferme', 'ferme', 'M.', 'Mme', 'Mr', 'Dr', 'Pr']);
    const raw = parts.length > 1 && skipPrefixes.has(parts[0])
      ? parts[parts.length - 1]
      : parts[0];
    return capitalize(raw);
  })();
  const now = new Date();
  const headerDate = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleRefresh = (event: CustomEvent<{ complete: () => void }>): void => {
    recomputeAlerts();
    void getPendingConfirmations().then(setPendingConfirmations);
    event.detail.complete();
  };

  const today = useMemo(() => new Date(), []);

  // Bandes filtrées (exclut RECAP) — source de vérité partagée avec /cycles.
  const realBandes = useMemo(() => filterRealPortees(bandes), [bandes]);

  // ── Sevrages à confirmer / en retard ─────────────────────────────────
  const sevrages = useMemo(
    () => getSevrages(realBandes, today),
    [realBandes, today],
  );

  // ── Mise-bas imminentes (truies dont la dateMBPrevue est dans 0-1j) ───
  const mbImminentes = useMemo(() => {
    const out: { truie: Truie; daysAway: number }[] = [];
    for (const t of truies) {
      if (t.statut === 'Morte' || t.statut === 'Réforme') continue;
      const d = safeDate(t.dateMBPrevue);
      if (!d) continue;
      const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const b = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const diffJ = Math.round((a - b) / 86_400_000);
      if (diffJ >= -MB_IMMINENTE_FENETRE_J && diffJ <= MB_IMMINENTE_FENETRE_J) {
        out.push({ truie: t, daysAway: diffJ });
      }
    }
    out.sort((x, y) => x.daysAway - y.daysAway);
    return out;
  }, [truies, today]);

  // ── Stocks aliment en rupture ou bas ──────────────────────────────────
  const stocksRupture = useMemo(
    () => stockAliment.filter(s => s.statutStock === 'RUPTURE' || s.stockActuel <= 0),
    [stockAliment],
  );
  const stocksBas = useMemo(
    () => stockAliment.filter(s => s.statutStock === 'BAS'),
    [stockAliment],
  );

  // ── Sevrages dans les 7 prochains jours (pour priorité 4) ─────────────
  const sevragesProches = useMemo(() => {
    const cutoff = today.getTime() + SEVRAGE_PROCHE_FENETRE_J * 86_400_000;
    return realBandes.filter(b => {
      const d = safeDate(b.dateSevragePrevue);
      if (!d) return false;
      return d.getTime() >= today.getTime() && d.getTime() <= cutoff;
    });
  }, [realBandes, today]);

  // ── Algorithme de calcul de LA tâche prioritaire ──────────────────────
  const primaryTask: PrimaryTask = useMemo(() => {
    // 1. Sevrage en retard ≥ 5 jours
    const retardCritiques = sevrages.enRetard.filter(s => s.daysOver >= SEVRAGE_RETARD_SEUIL_J);
    if (retardCritiques.length > 0) {
      const plural = retardCritiques.length > 1;
      const plusAncien = retardCritiques[0];
      return {
        kind: 'SEVRAGE_RETARD',
        title: `${retardCritiques.length} sevrage${plural ? 's' : ''} en retard à confirmer`,
        detail: `Le plus ancien : ${formatBandeLabel(plusAncien.bande.idPortee || plusAncien.bande.id)} (J+${plusAncien.daysOver})`,
        cta: 'Confirmer maintenant',
        to: '/cycles/maternite',
      };
    }

    // 2. Mise-bas imminente J-1/J0/J+1
    if (mbImminentes.length > 0) {
      const m = mbImminentes[0];
      const labelDelai =
        m.daysAway === 0 ? "aujourd'hui"
        : m.daysAway > 0 ? `J-${m.daysAway}`
        : `J+${Math.abs(m.daysAway)}`;
      return {
        kind: 'MB_IMMINENTE',
        title: `Mise-bas imminente : ${m.truie.displayId}`,
        detail: `À surveiller ${labelDelai}`,
        cta: 'Voir la truie',
        // V42-bugfix B3 : displayId (T-016) au lieu de l'UUID Supabase pour
        // garder une URL lisible et conforme à la règle PDF "JAMAIS d'UUID exposé".
        to: `/troupeau/truies/${m.truie.displayId}`,
      };
    }

    // 3. Stock rupture
    if (stocksRupture.length > 0) {
      const plural = stocksRupture.length > 1;
      return {
        kind: 'STOCK_RUPTURE',
        title: `${stocksRupture.length} stock${plural ? 's' : ''} en rupture, à commander`,
        detail: stocksRupture.slice(0, 2).map(s => s.libelle).join(' · '),
        cta: 'Voir le stock',
        to: '/ressources/aliments?filter=stock-bas',
      };
    }

    // 4. Stock bas + sevrage proche → risque alimentaire
    if (stocksBas.length > 0 && sevragesProches.length > 0) {
      const lib = stocksBas[0].libelle;
      const plural = sevragesProches.length > 1;
      return {
        kind: 'STOCK_BAS_SEVRAGE',
        title: `Risque alimentaire : ${lib} bas, ${sevragesProches.length} sevrage${plural ? 's' : ''} dans 7 jours`,
        detail: 'Anticiper la commande pour éviter la rupture en lactation',
        cta: 'Voir le stock',
        to: '/ressources/aliments?filter=stock-bas',
      };
    }

    // 5. Aucune action
    return {
      kind: 'IDLE',
      title: 'Tout est sous contrôle',
      detail: 'Aucune action urgente ce matin. Bonne journée.',
      cta: 'Voir le troupeau',
      to: '/troupeau',
    };
  }, [sevrages, mbImminentes, stocksRupture, stocksBas, sevragesProches]);

  // ── "Aussi à traiter" — fusion + déduplication par alertId ────────────
  type AussiKind = 'navigate' | 'confirm-sevrage' | 'confirm-reforme' | 'confirm-mb';
  interface AussiItem {
    id: string;
    priority: AlertPriority;
    label: string;
    kind: AussiKind;
    to?: string;
    confirmation?: PendingConfirmation;
    /** Identifiant FarmAlert dismissable (uniquement pour les alertes locales). */
    dismissableAlertId?: string;
    /** Compte d'items du même type fusionnés en ce groupe (≥2 si groupé, sinon undefined). */
    groupCount?: number;
    /** UUID de la truie pour kind='confirm-mb' (alertes R1 — résolution saillie au clic). */
    mbTruieId?: string;
  }

  const aussiATraiter = useMemo<AussiItem[]>(() => {
    // Keyspace distinct : 'confirm:<alertId>' vs 'alert:<alertId>' vs 'srv:<idx>:<sujet>'
    // Évite que la confirmation actionable soit avalée par une alerte locale partageant le même alertId.
    const seen = new Set<string>();
    const flat: AussiItem[] = [];

    // 1. Confirmations en attente d'abord — elles sont actionables (form direct).
    for (const c of pendingConfirmations) {
      const key = `confirm:${c.alertId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const isSevrage = c.action.type === 'CONFIRM_SEVRAGE';
      const isReforme = c.action.type === 'CONFIRM_REFORME';
      flat.push({
        id: c.id,
        priority: 'HAUTE',
        label: resolveAlertSubject(c.alertTitle, lookup),
        kind: isSevrage ? 'confirm-sevrage' : isReforme ? 'confirm-reforme' : 'navigate',
        to: !isSevrage && !isReforme ? '/alerts' : undefined,
        confirmation: c,
      });
    }

    // 2. Alertes locales (CRITIQUE/HAUTE) — navigate vers la vue ciblée.
    //    Exclut R15/R16 (OPEN_PHASE_MODAL) : rendues comme suggestions dédiées.
    //    R1 (CONFIRM_MISE_BAS) : action 1-tap "Confirmer la mise bas" (V28-CTA).
    for (const a of alerts) {
      if (a.priority !== 'CRITIQUE' && a.priority !== 'HAUTE') continue;
      if (a.meta?.actionType === 'OPEN_PHASE_MODAL') continue;
      const key = `alert:${a.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const isMbAlert = a.actions.some(act => act.type === 'CONFIRM_MISE_BAS');
      flat.push({
        id: a.id,
        priority: a.priority,
        label: resolveAlertSubject(a.title, lookup),
        kind: isMbAlert ? 'confirm-mb' : 'navigate',
        to: isMbAlert ? undefined : alertHref(a),
        mbTruieId: isMbAlert ? a.subjectId : undefined,
        dismissableAlertId: a.id,
      });
    }

    // 3. Alertes serveur (rare, fallback).
    alertesServeur
      .filter(a => a.priorite === 'CRITIQUE' || a.priorite === 'HAUTE')
      .forEach((a, i) => {
        const key = `srv:${i}:${a.sujet}`;
        if (seen.has(key)) return;
        seen.add(key);
        flat.push({
          id: key,
          priority: a.priorite as AlertPriority,
          label: a.sujet,
          kind: 'navigate',
          to: '/alerts',
        });
      });

    // 4. Groupement post-dédup. Bucket key :
    //    - 'confirm-sevrage' / 'confirm-reforme' pour les confirmations actionables
    //    - 'reforme-alert' pour les alertes "Réforme Suggérée — XXX"
    //    - 'sevrage-alert' pour les alertes "Sevrage à Confirmer — XXX"
    //    - sinon item individuel (pas de groupement)
    const groupKeyOf = (it: AussiItem): string | null => {
      if (it.kind === 'confirm-sevrage') return 'confirm-sevrage';
      if (it.kind === 'confirm-reforme') return 'confirm-reforme';
      const label = it.label || '';
      if (/^Réforme Suggérée/i.test(label)) return 'reforme-alert';
      if (/^Sevrage à Confirmer/i.test(label)) return 'sevrage-alert';
      return null;
    };

    const buckets = new Map<string, AussiItem[]>();
    const ungrouped: AussiItem[] = [];
    for (const it of flat) {
      const k = groupKeyOf(it);
      if (k === null) {
        ungrouped.push(it);
        continue;
      }
      const arr = buckets.get(k);
      if (arr) arr.push(it);
      else buckets.set(k, [it]);
    }

    const grouped: AussiItem[] = [];
    for (const [k, arr] of buckets) {
      if (arr.length === 1) {
        grouped.push(arr[0]);
        continue;
      }
      // Priorité du groupe = la plus haute des items.
      const topPriority = arr.reduce<AlertPriority>(
        (p, it) => (PRIORITY_ORDER[it.priority] < PRIORITY_ORDER[p] ? it.priority : p),
        arr[0].priority,
      );
      let label = '';
      let to = '/alerts';
      if (k === 'confirm-sevrage' || k === 'sevrage-alert') {
        label = `${arr.length} sevrages à confirmer`;
        to = '/cycles/maternite';
      } else if (k === 'confirm-reforme' || k === 'reforme-alert') {
        label = `${arr.length} truies à réformer`;
        to = '/troupeau?view=truies&statut=reforme';
      }
      grouped.push({
        id: `group:${k}`,
        priority: topPriority,
        label,
        kind: 'navigate',
        to,
        groupCount: arr.length,
      });
    }

    const out = [...ungrouped, ...grouped];
    out.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    return out.slice(0, 5);
  }, [alerts, alertesServeur, pendingConfirmations, lookup]);

  // ── Suggestions de transition (R15/R16 dédupliquées par bande+toPhase) ─
  // Jointure alerte ⨝ pendingTransitions : on ne garde que les transitions
  // qui ont déclenché une alerte (cohérence UI/moteur) et dont la bande existe.
  interface PhaseSuggestion {
    transition: PendingTransition;
    alertId: string;
    bandeDisplayId: string;
  }
  const phaseSuggestions = useMemo<PhaseSuggestion[]>(() => {
    const out: PhaseSuggestion[] = [];
    const seenKey = new Set<string>();
    for (const a of alerts) {
      if (a.meta?.actionType !== 'OPEN_PHASE_MODAL') continue;
      const meta = a.meta;
      const bande = bandes.find(b => b.id === meta.bandeId);
      if (!bande) continue;
      const transition = pendingTransitions.find(
        t => t.bandeId === meta.bandeId && t.toPhase === meta.toPhase,
      );
      if (!transition) continue;
      const key = `${meta.bandeId}:${meta.toPhase}`;
      if (seenKey.has(key)) continue;
      seenKey.add(key);
      out.push({
        transition,
        alertId: a.id,
        bandeDisplayId: bande.idPortee || bande.id,
      });
    }
    return out;
  }, [alerts, pendingTransitions, bandes]);

  // ── State pour les forms confirmation (ressoudé V14, ex-Agent C) ─────
  const [sevrageConfirmation, setSevrageConfirmation] =
    useState<PendingConfirmation | null>(null);
  const [reformeConfirmation, setReformeConfirmation] =
    useState<PendingConfirmation | null>(null);

  // ── V25 — Pesées planifiées en attente ──────────────────────────────
  const { pesees: peseesPending, refresh: refreshPesees } = usePeseePending();
  const [peseeForm, setPeseeForm] = useState<{ pesee: PeseePlanifiee; subject: BandePorcelets } | null>(null);

  const handlePhaseModalConfirm = useCallback(
    async (t: PendingTransition, poidsKg?: number): Promise<void> => {
      try {
        await confirmTransition(t, poidsKg);
        setSelectedTransition(null);
        showToast('Transition de phase confirmée', 'success', { duration: 2200 });
        await recomputeAlerts();
      } catch (e) {
        console.warn('[TodayHub] phase transition confirm failed', e);
        showToast('Erreur lors de la confirmation', 'error', { duration: 2200 });
      }
    },
    [confirmTransition, recomputeAlerts, showToast],
  );

  function handleAussiClick(item: AussiItem): void {
    if (item.kind === 'confirm-sevrage' && item.confirmation) {
      setSevrageConfirmation(item.confirmation);
      return;
    }
    if (item.kind === 'confirm-reforme' && item.confirmation) {
      setReformeConfirmation(item.confirmation);
      return;
    }
    if (item.kind === 'confirm-mb' && item.mbTruieId) {
      void resolveActiveSaillieAndNavigate(item.mbTruieId);
      return;
    }
    if (item.to) navigate(item.to);
  }

  /** V28-CTA — Résout la dernière saillie ouverte de la truie (sans batch lié)
   *  puis navigue vers /cycles/confirmer-mb/:saillieId. Toast d'erreur si introuvable. */
  const resolveActiveSaillieAndNavigate = useCallback(
    async (truieUuid: string): Promise<void> => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from('saillies') as any)
          .select('id, date_saillie')
          .eq('sow_id', truieUuid)
          .order('date_saillie', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error || !data?.id) {
          showToast('Aucune saillie active trouvée pour cette truie', 'error', { duration: 2400 });
          return;
        }
        navigate(`/cycles/confirmer-mb/${data.id}`);
      } catch {
        showToast('Erreur résolution saillie', 'error', { duration: 2400 });
      }
    },
    [navigate, showToast],
  );

  // ── "Ton élevage" — composition fermière ─────────────────────────────
  // V36-A — Alignement /today vs /troupeau (BUG-3) : on expose total + actives
  // séparément. Total = toutes les truies (incluses réformées/mortes) pour
  // cohérence avec /troupeau (qui affiche le total brut). Actives = en cycle
  // pour les KPI repro.
  const cheptelStats = useMemo(() => {
    const truiesActives = truies.filter(t => {
      const s = (t.statut || '').toLowerCase();
      return !/morte|r[ée]forme/.test(s);
    });
    const verratsActifs = verrats.filter(v => {
      const s = (v.statut || '').toLowerCase();
      return !/mort|r[ée]forme/.test(s);
    });
    let pleines = 0, maternite = 0, vides = 0;
    for (const t of truiesActives) {
      const c = normaliseStatut(t.statut);
      if (c === 'PLEINE') pleines += 1;
      else if (c === 'MATERNITE') maternite += 1;
      else if (c === 'VIDE') vides += 1;
    }
    return {
      bandesCount: realBandes.length,
      truiesTotalCount: truies.length,
      truiesActivesCount: truiesActives.length,
      truiesReformeCount: truies.length - truiesActives.length,
      verratsCount: verratsActifs.length,
      pleines,
      maternite,
      vides,
    };
  }, [truies, verrats, realBandes]);

  // ── Dernière tournée (note de catégorie AUDIT_QUOTIDIEN ou CONTROLE) ──
  const lastAudit = useMemo(() => {
    const audits = notes.filter(n => {
      const cat = String(n.animalType ?? '');
      return cat === 'CONTROLE' || cat === 'AUDIT_QUOTIDIEN' || /audit|tourn[ée]e/i.test(n.texte);
    });
    if (audits.length === 0) return null;
    const sorted = [...audits].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return db - da;
    });
    return sorted[0];
  }, [notes]);

  const lastAuditAgo = useMemo(() => {
    if (!lastAudit) return null;
    const dt = new Date(lastAudit.date);
    if (Number.isNaN(dt.getTime())) return null;
    const diffMs = Date.now() - dt.getTime();
    const diffH = Math.floor(diffMs / 3_600_000);
    if (diffH < 1) return "il y a moins d'une heure";
    if (diffH < 24) return `il y a ${diffH} h`;
    const diffJ = Math.floor(diffH / 24);
    if (diffJ < 7) return `il y a ${diffJ} j`;
    return dt.toLocaleDateString('fr-FR');
  }, [lastAudit]);

  const tourneeAujourdHui = useMemo(() => {
    if (!lastAudit) return false;
    const dt = new Date(lastAudit.date);
    if (Number.isNaN(dt.getTime())) return false;
    return (
      dt.getFullYear() === today.getFullYear() &&
      dt.getMonth() === today.getMonth() &&
      dt.getDate() === today.getDate()
    );
  }, [lastAudit, today]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
            <IonRefresherContent />
          </IonRefresher>

          <div
            className="px-4 pt-5 pb-32 flex flex-col gap-7"
            style={{ maxWidth: 1100, margin: '0 auto' }}
          >
            {/* V41 Phase D — Header canonique via PageHeader. Conservation
                de la salutation personnalisée (firstName) en title. */}
            <PageHeader eyebrow="Aujourd'hui" title={`Bonjour, ${firstName}`} subtitle={headerDate} />

            {/* ── Tâche prioritaire (single hero) ────────────────────── */}
            <section aria-label="Tâche prioritaire">
              <Section label="Tâche prioritaire" tone={primaryTask.kind === 'IDLE' ? 'primary' : 'accent'} />
              <Card
                interactive
                onClick={() => navigate(primaryTask.to)}
                role="button"
                ariaLabel={primaryTask.title}
                style={{ marginTop: 12 }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    {primaryTask.kind === 'IDLE' ? (
                      <IconBox tone="primary">
                        <ShieldCheck size={20} aria-hidden="true" />
                      </IconBox>
                    ) : null}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h2
                        style={{
                          fontFamily: 'var(--pt-font-display)',
                          fontSize: 'var(--pt-text-h2)',
                          fontWeight: 700,
                          letterSpacing: '-0.01em',
                          color: 'var(--pt-text)',
                          margin: 0,
                        }}
                      >
                        {primaryTask.title}
                      </h2>
                      {primaryTask.detail ? (
                        <p
                          style={{
                            fontFamily: 'var(--pt-font-body)',
                            fontSize: 14,
                            color: 'var(--pt-text-muted)',
                            margin: '6px 0 0',
                          }}
                        >
                          {primaryTask.detail}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div style={{ alignSelf: 'flex-start' }}>
                    <Button variant="primary" size="small" onClick={() => navigate(primaryTask.to)}>
                      {primaryTask.cta}
                      <ArrowRight size={14} aria-hidden="true" style={{ marginLeft: 6 }} />
                    </Button>
                  </div>
                </div>
              </Card>
            </section>

            {/* ── Transitions de phase (R15/R16) ─────────────────────── */}
            {phaseSuggestions.length > 0 && (
              <section aria-label="Transitions de phase">
                <Section label="Transitions de phase" tone="accent" />
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    marginTop: 12,
                  }}
                >
                  {phaseSuggestions.map(({ transition, alertId, bandeDisplayId }) => (
                    <PhaseSuggestionCard
                      key={alertId}
                      transition={transition}
                      bandeDisplayId={bandeDisplayId}
                      onConfirm={() => setSelectedTransition(transition)}
                      onDismiss={() => {
                        dismissTransition(transition.bandeId);
                        if (user) {
                          void dismissAlert(user.id, alertId, 'manual').catch(() => {});
                        }
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Aussi à traiter ────────────────────────────────────── */}
            {aussiATraiter.length > 0 && (
              <section aria-label="Aussi à traiter">
                <Section label="Aussi à traiter" tone="accent" />
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '12px 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {aussiATraiter.map((item) => {
                    const dismissId = item.dismissableAlertId;
                    const sourceAlert = dismissId
                      ? alerts.find(a => a.id === dismissId) ?? null
                      : null;

                    // Construit un FarmAlert synthétique pour AlertCard quand
                    // l'item ne correspond pas à une alerte locale (confirmations
                    // ou alertes serveur).
                    const synthetic: FarmAlert = sourceAlert ?? {
                      id: item.id,
                      priority: item.priority,
                      category: 'PLANNING',
                      subjectId: '',
                      subjectLabel: '',
                      title: item.label,
                      message: item.groupCount
                        ? `${item.groupCount} entrées regroupées`
                        : '',
                      requiresAction: item.kind !== 'navigate',
                      actions: [],
                      createdAt: new Date(),
                    };

                    const actionLabel = item.kind === 'confirm-sevrage'
                      ? 'Confirmer sevrage'
                      : item.kind === 'confirm-reforme'
                        ? 'Confirmer réforme'
                        : item.kind === 'confirm-mb'
                          ? 'Confirmer la mise bas'
                          : 'Ouvrir';

                    return (
                      <li key={item.id}>
                        <AlertCard
                          alert={synthetic}
                          onAcknowledge={() => {
                            if (dismissId) {
                              void handleDismissAussi(dismissId);
                            } else {
                              showToast('Alerte acquittée', 'success', { duration: 2000 });
                            }
                          }}
                          onAction={() => handleAussiClick(item)}
                          actionLabel={actionLabel}
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* ── Pesées prévues (V25) ──────────────────────────────── */}
            {peseesPending.length > 0 && (
              <section aria-label="Pesées prévues">
                <Section label="Pesées prévues" tone="accent" />
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  {peseesPending.map((p) => {
                    const bande = p.batchId ? bandes.find(b => b.id === p.batchId) : undefined;
                    const label = bande
                      ? formatBandeLabel(bande.idPortee || bande.id)
                      : p.porceletId
                        ? `Porcelet ${p.porceletId.slice(0, 8)}`
                        : 'Pesée';
                    const isOverdue = new Date(p.datePrevue).getTime() < Date.now();
                    return (
                      <div key={p.id}>
                      <Card compact danger={isOverdue}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontFamily: 'var(--pt-font-display)',
                                fontSize: 15,
                                fontWeight: 600,
                                color: 'var(--pt-text)',
                              }}
                            >
                              {label}
                            </div>
                            <div
                              style={{
                                color: isOverdue ? 'var(--pt-danger)' : 'var(--pt-text-muted)',
                                fontFamily: 'var(--pt-font-body)',
                                fontSize: 11,
                                marginTop: 2,
                              }}
                            >
                              Prévue le {p.datePrevue}
                            </div>
                          </div>
                          <Button
                            variant="primary"
                            size="small"
                            disabled={!bande}
                            ariaLabel={`Saisir la pesée de ${label}`}
                            onClick={() => {
                              if (bande) setPeseeForm({ pesee: p, subject: bande });
                            }}
                          >
                            Saisir pesée
                          </Button>
                        </div>
                      </Card>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Ton élevage ────────────────────────────────────────── */}
            <section aria-label="Ton élevage">
              <Section label="Ton élevage" />
              <Link
                to="/troupeau"
                style={{ textDecoration: 'none', display: 'block', marginTop: 12 }}
                aria-label="Voir le troupeau"
              >
                <Card interactive>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'var(--pt-font-display)',
                          fontSize: 16,
                          fontWeight: 600,
                          color: 'var(--pt-text)',
                          letterSpacing: '-0.005em',
                        }}
                      >
                        {cheptelStats.bandesCount} bande{cheptelStats.bandesCount > 1 ? 's' : ''} active{cheptelStats.bandesCount > 1 ? 's' : ''}
                        {' · '}
                        {cheptelStats.truiesTotalCount} truie{cheptelStats.truiesTotalCount > 1 ? 's' : ''}
                        {cheptelStats.truiesReformeCount > 0
                          ? ` (${cheptelStats.truiesActivesCount} actives)`
                          : ''}
                        {' · '}
                        {cheptelStats.verratsCount} verrat{cheptelStats.verratsCount > 1 ? 's' : ''}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--pt-font-body)',
                          fontSize: 13,
                          color: 'var(--pt-text-muted)',
                          marginTop: 4,
                        }}
                      >
                        Reproduction&nbsp;: {cheptelStats.pleines} pleine{cheptelStats.pleines > 1 ? 's' : ''}, {cheptelStats.maternite} maternité, {cheptelStats.vides} vide{cheptelStats.vides > 1 ? 's' : ''}
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--pt-text-muted)" aria-hidden="true" />
                  </div>
                </Card>
              </Link>
            </section>

            {/* ── Tournée du jour ────────────────────────────────────── */}
            <section aria-label="Tournée du jour">
              <Section label="Tournée du jour" tone="accent" />
              <Card style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <IconBox tone="primary">
                      <ClipboardCheck size={20} aria-hidden="true" />
                    </IconBox>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'var(--pt-font-display)',
                          fontSize: 16,
                          fontWeight: 600,
                          color: 'var(--pt-text)',
                          letterSpacing: '-0.005em',
                        }}
                      >
                        Tournée terrain
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--pt-font-body)',
                          fontSize: 12,
                          color: 'var(--pt-text-muted)',
                          marginTop: 2,
                        }}
                      >
                        {tourneeAujourdHui
                          ? `Tournée ${lastAuditAgo}`
                          : lastAuditAgo
                            ? `Aucune tournée enregistrée aujourd'hui · dernière ${lastAuditAgo}`
                            : "Aucune tournée enregistrée aujourd'hui"}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => navigate('/audit')}
                    ariaLabel="Démarrer la tournée"
                  >
                    Démarrer la tournée
                  </Button>
                </div>
              </Card>
            </section>

          </div>

          <QuickConfirmSevrageForm
            isOpen={!!sevrageConfirmation}
            onClose={() => setSevrageConfirmation(null)}
            pending={sevrageConfirmation}
            onSuccess={() => recomputeAlerts()}
          />
          <QuickConfirmReformeForm
            isOpen={!!reformeConfirmation}
            onClose={() => setReformeConfirmation(null)}
            pending={reformeConfirmation}
            onSuccess={() => recomputeAlerts()}
          />
          <PhaseTransitionModal
            transition={selectedTransition}
            isOpen={selectedTransition !== null}
            onConfirm={(t, poidsKg) => { void handlePhaseModalConfirm(t, poidsKg); }}
            onDismiss={() => setSelectedTransition(null)}
          />
          <QuickPeseeForm
            isOpen={peseeForm !== null}
            onClose={() => {
              setPeseeForm(null);
              refreshPesees();
            }}
            peseeId={peseeForm?.pesee.id}
            prefillSubject={peseeForm?.subject}
          />
        </AgritechLayout>

        <AppToast {...toastProps} />
      </IonContent>
    </IonPage>
  );
};

export default TodayHub;
