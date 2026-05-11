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
import { AlertTriangle, CalendarDays, CheckCircle2, Info, ClipboardList, Play, ChevronRight } from 'lucide-react';
import { useFarm, useMeta } from '../../context/FarmContext';
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

interface AlertItem {
  id: string;
  variant: 'warning' | 'info' | 'danger';
  /** Étiquette courte type "Urgent", "J-2", "Action" — affichée en eyebrow ligne. */
  tag: string;
  title: string;
  meta: string;
  to: string;
}

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
      const isUrgent = a.priority === 'CRITIQUE' || offset >= 0;
      const tag =
        offset > 0
          ? `J+${offset}`
          : offset === 0
            ? 'Aujourd’hui'
            : `J${offset}`;
      result.push({
        id: a.id,
        variant: isUrgent ? 'danger' : 'warning',
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
        variant: diffDays <= 1 ? 'danger' : 'warning',
        tag: diffDays <= 0 ? 'Urgent' : `J-${diffDays}`,
        title: `Mise-bas${b.truie ? ` — ${b.truie}` : ''}`,
        meta: `${b.idPortee || b.id} · dans ${diffDays <= 0 ? 'aujourd’hui' : `${diffDays}j`}`,
        to: b.truie ? `/troupeau/truies/${b.truie}` : `/troupeau/bandes/${b.id}`,
      });
    });

    // Truies à décider (statut ≠ réforme + critères métier)
    truies
      .filter(t => !isReformed(t) && needsReformConsideration(t))
      .forEach(t => {
        result.push({
          id: `reform-suggest-${t.id}`,
          variant: 'warning',
          tag: 'Bientôt',
          title: `À sortir bientôt — ${t.displayId}`,
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
          variant: 'warning',
          tag: 'Cette semaine',
          title: `À vendre — ${t.displayId}`,
          meta: 'Marquer comme vendue ou abattue depuis sa fiche',
          to: `/troupeau/truies/${t.id}`,
        });
      });

    return result.slice(0, 5);
  }, [truies, bandes, engineAlerts]);

  // V75-o-a (F-6) : state dismissed retiré avec le bouton Acquitter.
  // L'acquittement reviendra via long-press ou menu contextuel à un sprint
  // ultérieur. En attendant, toutes les alertes calculées sont affichées.
  const alerts = computedAlerts;

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
            <CheckCircle2 size={38} strokeWidth={2} color="var(--pt-success)" aria-hidden />
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
              Carnet vide
            </div>
            <div style={{ fontSize: 13, color: 'var(--pt-muted)', maxWidth: '32ch' }}>
              Toutes les alertes sont traitées. Bonne tournée.
            </div>
          </div>
        ) : (
          <div role="list" aria-label="Registre des alertes à traiter">
            {alerts.map((alert) => {
              const variantClass =
                alert.variant === 'danger' ? 'crit' : alert.variant === 'warning' ? 'warm' : 'info';
              const Icon =
                alert.variant === 'danger'
                  ? AlertTriangle
                  : alert.variant === 'warning'
                    ? CalendarDays
                    : Info;
              return (
                <button
                  key={alert.id}
                  type="button"
                  role="listitem"
                  className={`priority-line ${variantClass}`}
                  onClick={() => navigate(alert.to)}
                  aria-label={`${alert.title} — ${alert.tag} — ouvrir le détail`}
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
