/**
 * V71 — Hook contextuel encyclopédie.
 *
 * Lie l'état temps réel de la ferme (bandes, truies, saillies) à des
 * "hints" pédagogiques (carte "Le saviez-vous ?" sur TodayV70).
 *
 * Les slugs renvoient vers la page Encyclopédie via query param `?slug=`
 * (cf. `EncyclopediaPage` — auto-sélection à l'arrivée).
 */
import React, { useMemo } from 'react';
import {
  AlertTriangle,
  Baby,
  BookOpen,
  ClipboardList,
  Heart,
  Lightbulb,
  RefreshCw,
  Wheat,
} from 'lucide-react';
import { useFarm } from '../../context/FarmContext';
import { safeDate } from '../../lib/truieHelpers';

export interface FarmHint {
  id: string;
  level: 'info' | 'soon' | 'critical';
  /**
   * Glyphe ou icône affichée à côté du badge "Le saviez-vous ?".
   * Accepte un emoji (string) ou un composant Lucide React.
   */
  emoji: React.ReactNode;
  title: string;
  body: string;
  /** Chemin complet (route + query) vers l'article encyclopédie. */
  encyclopediaPath?: string;
}

const ENCYCLO_BASE = '/reglages/encyclopedie';
const SLUGS = {
  miseBas: '10-preparation-mise-bas',
  echographie: '01-cycle-vie-truie',
  sevrage: '05-sevrage-timing-conditions',
  mortalite: '06-mortalite-allaitement',
  isse: '02-isse-optimisation',
  alimentationGestation: '04-alimentation-gestation',
  reforme: '07-reforme-zootechnique',
  coutsAlim: '09-couts-alimentaires',
} as const;

function pathFor(slug: string): string {
  return `${ENCYCLO_BASE}?slug=${encodeURIComponent(slug)}`;
}

/** Saillies considérées comme "actives" (en attente écho/MB). */
const SAILLIE_ACTIVE = new Set(['', 'CONFIRMEE', 'EN_ATTENTE']);

export function useFarmContextHints(): FarmHint[] {
  const farm = useFarm();

  return useMemo(() => {
    const hints: FarmHint[] = [];
    const now = new Date();
    const bandes = farm?.bandes ?? [];
    const truies = farm?.truies ?? [];
    const saillies = farm?.saillies ?? [];

    // Hint A — Mise-bas dans les 7 jours (priorité haute, "soon")
    const proxMB = bandes.filter((b) => {
      const d = safeDate(b.dateMB);
      if (!d) return false;
      const days = Math.floor((d.getTime() - now.getTime()) / 86400000);
      return days >= 0 && days <= 7;
    });
    if (proxMB.length > 0) {
      hints.push({
        id: 'mise-bas-incoming',
        level: 'soon',
        emoji: React.createElement(Heart, { size: 16 }),
        title: `${proxMB.length} mise-bas attendue${proxMB.length > 1 ? 's' : ''} sous 7 jours`,
        body:
          "Préparez les loges maternité (lampe chauffante, paille sèche), vérifiez l'eau et anticipez les soins post-partum (oxytocine, antibiotique si besoin).",
        encyclopediaPath: pathFor(SLUGS.miseBas),
      });
    }

    // Hint B — Fenêtre échographie (saillies J25-J35)
    const echoWindow = truies.filter((t) => {
      if (t.statut === 'En maternité' || t.statut === 'Morte' || t.statut === 'Réforme') return false;
      const active = saillies.find(
        (s) =>
          (s.truieId === t.id || s.truieId === t.displayId) &&
          SAILLIE_ACTIVE.has((s.statut ?? '').toUpperCase()),
      );
      if (!active) return false;
      const d = safeDate(active.dateSaillie);
      if (!d) return false;
      const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
      return days >= 25 && days <= 35;
    });
    if (echoWindow.length > 0) {
      hints.push({
        id: 'echo-window',
        level: 'soon',
        emoji: React.createElement(ClipboardList, { size: 16 }),
        title: `Fenêtre écho ouverte — ${echoWindow.length} truie${echoWindow.length > 1 ? 's' : ''}`,
        body:
          "C'est la période idéale (J25-J35 post-saillie) pour confirmer la gestation. Une écho ratée, c'est jusqu'à 90 jours de gaspillés.",
        encyclopediaPath: pathFor(SLUGS.echographie),
      });
    }

    // Hint C — Sevrage proche (bandes en allaitement à J21-J28)
    const sevrageWindow = bandes.filter((b) => {
      const d = safeDate(b.dateMB);
      if (!d) return false;
      if (b.dateSevrageReelle) return false;
      const ageJours = Math.floor((now.getTime() - d.getTime()) / 86400000);
      return ageJours >= 21 && ageJours <= 28;
    });
    if (sevrageWindow.length > 0 && hints.length < 2) {
      hints.push({
        id: 'sevrage-proche',
        level: 'info',
        emoji: React.createElement(Baby, { size: 16 }),
        title: `${sevrageWindow.length} bande${sevrageWindow.length > 1 ? 's' : ''} bientôt sevrable${sevrageWindow.length > 1 ? 's' : ''}`,
        body:
          "Sevrer trop tôt fragilise les porcelets, trop tard alourdit la truie. J28 reste l'optimum métier — pesez avant transition pour fixer la phase suivante.",
        encyclopediaPath: pathFor(SLUGS.sevrage),
      });
    }

    // Hint D — Le saviez-vous quotidien (rotation jour, fallback si rien d'urgent)
    if (hints.length === 0) {
      const dailyHints: Array<{ emoji: React.ReactNode; title: string; body: string; slug: string }> = [
        {
          emoji: React.createElement(Lightbulb, { size: 16 }),
          title: "L'ISSE, votre meilleur indicateur économique",
          body:
            "Indice Sevrés-Saillie : >12 = excellent, 10-12 = bon, <10 = à améliorer. Il pèse plus que le prix de l'aliment dans la marge finale.",
          slug: SLUGS.isse,
        },
        {
          emoji: React.createElement(BookOpen, { size: 16 }),
          title: 'Cycle gestation : 115 jours pile',
          body:
            "Fenêtre normale entre J113 et J117. Préparez la loge maternité 3 jours avant la date prévue, et surveillez la chute de température corporelle (-1°C, signe d'imminence).",
          slug: SLUGS.miseBas,
        },
        {
          emoji: React.createElement(AlertTriangle, { size: 16 }),
          title: 'Mortalité allaitement : 15 % = seuil critique',
          body:
            "Au-delà, agir vite : revoir température loge (28-32 °C porcelets), hygiène, écrasements (barres anti-écrasement), colostrum (2h post-MB obligatoire).",
          slug: SLUGS.mortalite,
        },
        {
          emoji: React.createElement(Baby, { size: 16 }),
          title: 'Sevrage à J28, pas avant',
          body:
            "Sevrage précoce = porcelets fragiles, truies sur-sollicitées, plus de soins. Sevrage trop tardif = perte d'ISSE. J28 reste le compromis métier dominant.",
          slug: SLUGS.sevrage,
        },
        {
          emoji: React.createElement(Wheat, { size: 16 }),
          title: "L'aliment = 65-70 % du coût d'élevage",
          body:
            "Optimiser la formule (cassava, sons, tourteaux locaux) avant de chercher à pousser le prix de vente. C'est là que se joue la marge en climat tropical.",
          slug: SLUGS.coutsAlim,
        },
        {
          emoji: React.createElement(RefreshCw, { size: 16 }),
          title: 'Réforme : pas plus de 6 portées en moyenne',
          body:
            "Au-delà, la prolificité chute. Décision basée sur 3 critères : NV en baisse 2 portées d'affilée, taux de sevrage <85 %, intervalle saillie-MB > 130 j.",
          slug: SLUGS.reforme,
        },
        {
          emoji: React.createElement(Heart, { size: 16 }),
          title: 'Alimentation gestation : régime contrôlé',
          body:
            "Gestation = 2.2-2.5 kg/j. Trop = truie trop grasse à la MB (mortalité accrue, écrasements). Pas assez = porcelets nés faibles. Réservez l'ad libitum à la lactation.",
          slug: SLUGS.alimentationGestation,
        },
      ];
      const dayIdx = Math.floor(now.getTime() / 86400000) % dailyHints.length;
      const daily = dailyHints[dayIdx];
      hints.push({
        id: `daily-${dayIdx}`,
        level: 'info',
        emoji: daily.emoji,
        title: daily.title,
        body: daily.body,
        encyclopediaPath: pathFor(daily.slug),
      });
    }

    return hints;
  }, [farm]);
}
