/**
 * V70 — Page /today (archétype Dashboard)
 *
 * Réplique pixel-perfect mockup `docs/v70/v70-mockup.html` lignes 994-1080.
 *
 * 4 sections (décision V44/V70 — limite stricte) :
 *  1. Hero "Mise-bas imminente" (Card hero + Button primary)
 *  2. À traiter (3 alertes warning/info/danger + Pills cliquables)
 *  3. Mon élevage (StatsGrid 4 cols : truies/verrats/porcelets/bandes)
 *  4. Tournée du jour (CTA Démarrer la tournée)
 *
 * V70.1 — Câblage complet onClick (Option B).
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CalendarDays, CalendarClock, CheckCircle2, Info, ClipboardList, Play, ChevronRight } from 'lucide-react';
import { useFarm, useMeta } from '../../context/FarmContext';
import { useFarmProfile } from '../../hooks/useFarmProfile';
import { filterAlertsByProfile } from '../../services/alertProfileFilter';
import { formatAnimalIdentity } from '../../lib/formatAnimalIdentity';
import { useAuth } from '../../context/AuthContext';
import { Section } from '../components/ds/Section';
import { Card } from '../components/ds/Card';
import { Button } from '../components/ds/Button';
import { StatsGrid, Stat } from '../components/ds/StatsGrid';
import { EntityAvatar } from '../../components/ds/EntityAvatar';
import { MariusGreeting } from '../../features/chatbot/MariusGreeting';
import { useFarmContextHints } from '../../features/encyclopedia/useFarmContextHints';
import { HintCard } from '../../features/encyclopedia/HintCard';
import { NotificationsPermissionPrompt } from '../../components/NotificationsPermissionPrompt';
import { isReformed, needsReformConsideration, alreadySortedOut, reformReason } from '../lib';
import type { Truie } from '../../types/farm';
import type { AlertPriority } from '../../services/alertEngine';

interface AlertItem {
  id: string;
  /**
   * Priorité métier — les 4 niveaux d'alertEngine (CRITIQUE / HAUTE / NORMALE /
   * INFO). G2 : on ne réduit plus à 3 variantes ; chaque priorité a sa propre
   * classe CSS pour que HAUTE et NORMALE soient visuellement distinctes.
   */
  priority: AlertPriority;
  /** Étiquette courte type "Urgent", "J-2", "Action" — affichée en eyebrow ligne. */
  tag: string;
  title: string;
  meta: string;
  to: string;
}

/** G2 — mapping priorité métier → classe CSS `.priority-line.{classe}`. */
const PRIORITY_CLASS: Record<AlertPriority, string> = {
  CRITIQUE: 'critique',
  HAUTE: 'haute',
  NORMALE: 'normale',
  INFO: 'info',
};

/** Icône par priorité — distincte pour chaque niveau (lecture 3 secondes). */
const PRIORITY_ICON: Record<AlertPriority, typeof AlertTriangle> = {
  CRITIQUE: AlertTriangle,
  HAUTE: CalendarClock,
  NORMALE: CalendarDays,
  INFO: Info,
};

/** Libellé priorité — annoncé par les lecteurs d'écran avant le titre. */
const PRIORITY_LABEL: Record<AlertPriority, string> = {
  CRITIQUE: 'Critique',
  HAUTE: 'Priorité haute',
  NORMALE: 'À planifier',
  INFO: 'Information',
};

export const TodayV70: React.FC = () => {
  const navigate = useNavigate();
  const farm = useFarm();
  const { truies, verrats, bandes } = farm;
  const engineAlerts = farm.alerts ?? [];
  const { loading: farmLoading } = useMeta();
  const { profile } = useAuth();

  // V71.2 — alertes calculées depuis FarmContext (plus de mocks statiques)
  // V75-B1 — fix résiduel : source MB = alertEngine R1 (truie.dateMBPrevue)
  // au lieu de bande.dateMB. R1 capture T-022 (J+2) / T-026 (J+1) qui sont
  // visibles dans /alerts mais pas dans Today tant qu'on reste sur bandes.
  const computedAlerts = useMemo((): AlertItem[] => {
    const result: AlertItem[] = [];
    const now = new Date();
    const seenTruieIds = new Set<string>();

    // 1. R1 Mise-Bas (J-3 à J+2, voire J+17 si retard) — source canonique alertEngine.
    engineAlerts.forEach(a => {
      if (a.category !== 'REPRO') return;
      if (!a.title.startsWith('Mise-Bas')) return;
      const offset = a.daysOffset ?? 0;
      // offset < 0 : avance (ex. -2 → "J-2") | offset >= 0 : jour-même ou retard.
      const tag =
        offset > 0
          ? `J+${offset}`
          : offset === 0
            ? 'Aujourd’hui'
            : `J${offset}`;
      result.push({
        id: a.id,
        // G2 — on propage la priorité native d'alertEngine (R1 : HAUTE→CRITIQUE).
        priority: a.priority,
        tag,
        title: a.title,
        meta: a.message,
        to: `/troupeau/truies/${a.subjectId}`,
      });
      seenTruieIds.add(a.subjectId);
    });

    // 2. Fallback bandes.dateMB — couvre les bandes orphelines (sans truie liée)
    //    ou les truies sans dateMBPrevue côté Truie. Évite la double-comptage R1.
    bandes.forEach(b => {
      if (!b.dateMB) return;
      if (b.truie && seenTruieIds.has(b.truie)) return;
      const d = new Date(b.dateMB);
      if (isNaN(d.getTime())) return;
      const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (d < now || d > in7) return;
      const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000);
      result.push({
        id: `mb-${b.id}`,
        // Aligné R1 : mise-bas à J-1 ou imminente = CRITIQUE, sinon HAUTE.
        priority: diffDays <= 1 ? 'CRITIQUE' : 'HAUTE',
        tag: diffDays <= 0 ? 'Urgent' : `J-${diffDays}`,
        title: `Mise-bas${b.truie ? ` — ${b.truie}` : ''}`,
        meta: `${b.idPortee || b.id} · ${diffDays <= 0 ? 'aujourd’hui' : `dans ${diffDays}j`}`,
        to: b.truie ? `/troupeau/truies/${b.truie}` : `/troupeau/bandes/${b.id}`,
      });
    });

    // Truies à décider (statut ≠ réforme + critères métier)
    truies
      .filter(t => !isReformed(t) && needsReformConsideration(t))
      .forEach(t => {
        result.push({
          id: `reform-suggest-${t.id}`,
          // R11/R12 — suggestion de réforme à évaluer, pas d'urgence biologique : NORMALE.
          priority: 'NORMALE',
          tag: 'Bientôt',
          title: `À sortir bientôt — ${formatAnimalIdentity(t)}`,
          meta: reformReason(t),
          to: `/troupeau/truies/${t.id}`,
        });
      });

    // Truies déjà réformées (à sortir physiquement du cheptel)
    truies
      .filter(t => isReformed(t) && !alreadySortedOut(t as Truie & { dateSortie?: string | null }))
      .forEach(t => {
        result.push({
          id: `reform-action-${t.id}`,
          // Truie déjà réformée : action commerciale concrète attendue cette semaine.
          priority: 'HAUTE',
          tag: 'Cette semaine',
          title: `À vendre — ${formatAnimalIdentity(t)}`,
          meta: 'Marquer comme vendue ou abattue depuis sa fiche',
          to: `/troupeau/truies/${t.id}`,
        });
      });

    // Tri par priorité décroissante : une CRITIQUE ne doit jamais être coupée
    // par le slice(0, 5) au profit d'une NORMALE arrivée plus tôt dans la boucle.
    const order: Record<AlertPriority, number> = { CRITIQUE: 0, HAUTE: 1, NORMALE: 2, INFO: 3 };
    result.sort((a, b) => order[a.priority] - order[b.priority]);
    return result.slice(0, 5);
  }, [truies, bandes, engineAlerts]);

  // V75-o-a (F-6) : state dismissed retiré avec le bouton Acquitter.
  // L'acquittement reviendra via long-press ou menu contextuel à un sprint
  // ultérieur. En attendant, toutes les alertes calculées sont affichées.
  // v3.4.4 — filtrage par profil ferme : un engraisseur ne doit pas voir
  // "Mise-Bas Imminente", un naisseur ne doit pas voir "Sortie abattoir".
  // Spec PLAN_PROFIL_MULTI.md §5.3.
  const profil = useFarmProfile();
  const alerts = useMemo(
    () => filterAlertsByProfile(computedAlerts, profil),
    [computedAlerts, profil],
  );

  // Décompte de criticité — sert à l'en-tête "À traiter" : l'éleveur doit
  // savoir EN UN COUP D'ŒIL s'il y a une urgence vitale avant tout le reste.
  const critiqueCount = useMemo(
    () => alerts.filter((a) => a.priority === 'CRITIQUE').length,
    [alerts],
  );

  // MB imminente dans 3j → hero card
  const heroMiseBas = useMemo(() => {
    const now = new Date();
    const in3 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    return bandes.find(b => {
      if (!b.dateMB) return false;
      const d = new Date(b.dateMB);
      return !isNaN(d.getTime()) && d >= now && d <= in3;
    }) ?? null;
  }, [bandes]);

  // V71.1 — données live FarmContext (était hardcodé 50/3/92/6)
  // V75-j-2 (F-NEW-3) — porcelets actifs alignés sur Élevage : on filtre les
  // porcelets par statut (VIVANT/MALADE/QUARANTAINE) au lieu d'agréger
  // bande.vivants (qui inclut compte historique). Source unique de vérité =
  // même calcul que AnimalsV70.tsx l. 123-128.
  const stats = useMemo(() => {
    const porceletsActifs = bandes.reduce((acc, b) => {
      const active = (b.porcelets ?? []).filter(
        p => p.statut === 'VIVANT' || p.statut === 'MALADE' || p.statut === 'QUARANTAINE',
      ).length;
      return acc + active;
    }, 0);
    return {
      truies: truies.length,
      verrats: verrats.length,
      porcelets: porceletsActifs,
      bandes: bandes.length,
    };
  }, [truies, verrats, bandes]);

  // V75-j-2 (F-NEW-4) — pendant le chargement initial, éviter le flash
  // "0 truies / 0 porcelets" qui donne l'impression d'une ferme vide.
  // Le pattern existant farmLoading + arrays vides est déjà utilisé ligne 215
  // pour la section alertes, on l'étend aux KPIs et au greeting subtitle.
  const showSkeletons = farmLoading && truies.length === 0 && bandes.length === 0;

  const userName = profile?.full_name?.split(' ')[0] || 'éleveur';
  const dateLabel = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long',
  });

  // V71 — hints encyclopédie contextuels (max 1 affiché à la fois)
  const hints = useFarmContextHints();

  return (
    <div className="pt-screen">
      <MariusGreeting />

      <header className="ph--primary">
        <div className="eyebrow">{dateLabel}</div>
        <h1>Aujourd’hui</h1>
        <div className="sub">
          {`Bonjour ${userName}`}
        </div>
      </header>

      <div
        className="phone-content"
        style={{ padding: 24, maxWidth: 600, margin: '0 auto', minHeight: '100%' }}
      >
      {/* V71 — Carte pédagogique contextuelle (encyclopédie liée à l'état ferme) */}
      {hints.length > 0 && <HintCard hint={hints[0]} />}

      {/* Section 1 : TÂCHE PRIORITAIRE (Hero) — affiché uniquement si MB imminente réelle */}
      {heroMiseBas && (
        <Card variant="hero">
          <div className="hero-row">
            <div className="hero-icon" style={{ background: 'transparent', padding: 0 }}>
              <EntityAvatar species="truie" size="md" />
            </div>
            <div className="hero-info">
              <div className="hero-title-text">Mise-bas imminente</div>
              <div className="hero-sub">
                {heroMiseBas.truie ?? heroMiseBas.idPortee} · prévue{' '}
                {(() => {
                  const d = new Date(heroMiseBas.dateMB!);
                  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
                  return diff <= 0 ? 'aujourd’hui' : diff === 1 ? 'demain' : `dans ${diff}j`;
                })()}
              </div>
            </div>
          </div>
          <Button
            variant="primary"
            size="full"
            onClick={() => navigate(
              heroMiseBas.truie
                ? `/troupeau/truies/${heroMiseBas.truie}`
                : `/troupeau/bandes/${heroMiseBas.id}`,
            )}
          >
            › Voir {heroMiseBas.truie ?? heroMiseBas.idPortee}
          </Button>
        </Card>
      )}

      {/* Section 2 : À TRAITER (registre journal — anti-AI feel, plus de cards uniformes) */}
      <Section label={`À traiter (${alerts.length})`}>
        {/* Bandeau de criticité — visible uniquement s'il y a au moins une
            CRITIQUE. Position en tête : l'urgence vitale se lit avant la liste. */}
        {critiqueCount > 0 && (
          <div
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 12px',
              marginBottom: 12,
              borderRadius: 10,
              background: 'var(--pt-danger-bg-soft)',
              color: 'var(--pt-danger)',
              borderLeft: '3px solid var(--pt-danger)',
              fontFamily: 'var(--pt-font-display)',
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: 12,
              letterSpacing: '0.02em',
            }}
          >
            <AlertTriangle size={15} strokeWidth={2.4} aria-hidden />
            <span>
              {critiqueCount === 1
                ? '1 urgence vitale — à traiter en premier'
                : `${critiqueCount} urgences vitales — à traiter en premier`}
            </span>
          </div>
        )}
        {farmLoading && truies.length === 0 && bandes.length === 0 ? (
          // V74 Vague V — pendant le chargement initial : skeleton plutôt que
          // "Carnet vide". Évite le flash "tout va bien" pendant 1-2s avant que
          // les vraies alertes apparaissent.
          <div data-testid="today-loading-skeleton" className="flex flex-col gap-2 py-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="rounded-md bg-bg-2 animate-pulse"
                style={{ height: 56 }}
                aria-hidden="true"
              />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div data-testid="today-empty-state" className="empty">
            <div
              aria-hidden
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--pt-success-bg-soft)',
                color: 'var(--pt-success)',
              }}
            >
              <CheckCircle2 size={34} strokeWidth={2.2} />
            </div>
            <div
              style={{
                fontFamily: 'var(--pt-font-display)',
                fontWeight: 900,
                textTransform: 'uppercase',
                fontSize: 22,
                letterSpacing: '-0.005em',
                color: 'var(--pt-ink)',
              }}
            >
              Rien d’urgent ce matin
            </div>
            <div style={{ fontSize: 13, color: 'var(--pt-muted)', maxWidth: '34ch', lineHeight: 1.5 }}>
              Aucune mise-bas, rupture ni truie à surveiller dans les jours qui
              viennent. Le cheptel suit son cycle — fais ta tournée tranquille.
            </div>
          </div>
        ) : (
          <div role="list" aria-label="Registre des alertes à traiter">
            {alerts.map((alert) => {
              // G2 — 4 classes distinctes : CRITIQUE / HAUTE / NORMALE / INFO.
              const priorityClass = PRIORITY_CLASS[alert.priority];
              const Icon = PRIORITY_ICON[alert.priority];
              const priorityLabel = PRIORITY_LABEL[alert.priority];
              return (
                <button
                  key={alert.id}
                  type="button"
                  role="listitem"
                  className={`priority-line ${priorityClass}`}
                  onClick={() => navigate(alert.to)}
                  aria-label={`${priorityLabel} — ${alert.title} — ${alert.tag} — ouvrir le détail`}
                >
                  <span className="priority-line__icon" aria-hidden>
                    <Icon size={14} strokeWidth={2} />
                  </span>
                  <span className="priority-line__main">
                    <span className="priority-line__title">{alert.title}</span>
                    <span className="priority-line__sub">
                      {alert.tag} · {alert.meta}
                    </span>
                  </span>
                  <ChevronRight className="priority-line__chev" aria-hidden />
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {/* F-1 V75-n — bannière onboarding repositionnée APRÈS À traiter pour ne
          pas masquer une mise-bas urgente quand l'éleveur ouvre l'app à 5h. */}
      <NotificationsPermissionPrompt />

      {/* Section 3 : MON ÉLEVAGE (KPIs résumés) */}
      {/* V75-q (F-3) — suffixe "aujourd'hui" sur chaque label pour cadrer
          temporellement les counts (instantané, pas de tendance dispo). */}
      <Section label="Mon élevage">
        <StatsGrid cols={4}>
          <Stat value={showSkeletons ? '—' : stats.truies} label="Truies · auj." />
          <Stat value={showSkeletons ? '—' : stats.verrats} label="Verrats · auj." />
          <Stat value={showSkeletons ? '—' : stats.porcelets} label="Porcelets · auj." />
          <Stat value={showSkeletons ? '—' : stats.bandes} label="Bandes · auj." />
        </StatsGrid>
      </Section>

      {/* Section 4 : TOURNÉE DU JOUR */}
      <Section label="Tournée du jour">
        <Card>
          <div style={{ textAlign: 'center', padding: '8px 0 14px' }}>
            <div
              style={{
                marginBottom: 4,
                display: 'flex',
                justifyContent: 'center',
                color: 'var(--pt-muted)',
              }}
            >
              <ClipboardList size={18} strokeWidth={2} aria-hidden="true" />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Tournée terrain</div>
            <div style={{ fontSize: 11, color: 'var(--pt-muted)' }}>
              12 points · biosécurité, alimentation, santé
            </div>
          </div>
          <Button
            variant="primary"
            size="full"
            onClick={() => navigate('/controle')}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Play size={14} strokeWidth={2} aria-hidden="true" />
              Démarrer la tournée
            </span>
          </Button>
        </Card>
      </Section>
      </div>
    </div>
  );
};
