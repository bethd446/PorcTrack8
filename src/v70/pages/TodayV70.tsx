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
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Play, ChevronRight, CheckCheck } from 'lucide-react';
import { useFarm, useMeta } from '../../context/FarmContext';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../components/ds/PageHeader';
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

const PAGE_BACKGROUND_SRC = '/images/hero-2.webp';

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
  const { truies, verrats, bandes } = useFarm();
  const { loading: farmLoading } = useMeta();
  const { profile } = useAuth();

  // V71.2 — alertes calculées depuis FarmContext (plus de mocks statiques)
  const computedAlerts = useMemo((): AlertItem[] => {
    const result: AlertItem[] = [];
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // MB prévues dans les 7 prochains jours
    bandes.forEach(b => {
      if (!b.dateMB) return;
      const d = new Date(b.dateMB);
      if (isNaN(d.getTime()) || d < now || d > in7) return;
      const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000);
      result.push({
        id: `mb-${b.id}`,
        variant: diffDays <= 1 ? 'danger' : 'warning',
        tag: diffDays <= 0 ? 'Urgent' : `J-${diffDays}`,
        title: `Mise-bas${b.truie ? ` — ${b.truie}` : ''}`,
        meta: `${b.idPortee || b.id} · dans ${diffDays <= 0 ? "aujourd'hui" : `${diffDays}j`}`,
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
  }, [truies, bandes]);

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const alerts = useMemo(
    () => computedAlerts.filter(a => !dismissed.has(a.id)),
    [computedAlerts, dismissed],
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

  const dismissAlert = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(prev => new Set([...prev, id]));
  };

  // V71 — hints encyclopédie contextuels (max 1 affiché à la fois)
  const hints = useFarmContextHints();

  return (
    <div
      className="phone-content"
      style={{ padding: 24, maxWidth: 600, margin: '0 auto', position: 'relative', minHeight: '100%' }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${PAGE_BACKGROUND_SRC})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          opacity: 0.06,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
      <MariusGreeting />

      <PageHeader
        eyebrow={dateLabel}
        title="Aujourd'hui"
        subtitle={
          showSkeletons
            ? `Bonjour ${userName}`
            : `Bonjour ${userName} — ${alerts.length} priorités`
        }
      />

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
                  return diff <= 0 ? "aujourd'hui" : diff === 1 ? 'demain' : `dans ${diff}j`;
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
            → Voir {heroMiseBas.truie ?? heroMiseBas.idPortee}
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
          // V74 — empty state V73 : carnet vide avec image couloir calme.
          // L'image renforce le sentiment "tout va bien" sans remplir avec
          // des cards mock. Texte gardé pour conformité tests existants.
          <div data-testid="today-empty-state">
            <div
              style={{
                position: 'relative',
                borderRadius: 16,
                overflow: 'hidden',
                aspectRatio: '16 / 9',
                margin: '4px 0 10px',
                background: '#eef2f0',
              }}
            >
              <picture>
                <source srcSet="/images/v73/empty-states/aucune-alerte.webp" type="image/webp" />
                <img
                  src="/images/v73/empty-states/aucune-alerte.jpg"
                  alt="Couloir bâtiment porcin calme, ambiance sereine"
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </picture>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.5) 100%)',
                }}
              />
            </div>
            <div
              style={{
                padding: '10px 4px',
                color: 'var(--pt-muted)',
                fontSize: 13,
                fontStyle: 'italic',
                borderTop: '1px solid var(--pt-line)',
                borderBottom: '1px solid var(--pt-line)',
              }}
            >
              Carnet vide — toutes les alertes sont traitées.
            </div>
          </div>
        ) : (
          <div
            role="list"
            aria-label="Registre des alertes à traiter"
            style={{
              borderTop: '1px solid var(--pt-line)',
              borderBottom: '1px solid var(--pt-line)',
            }}
          >
            {alerts.map((alert, idx) => {
              const handleActivate = () => navigate(alert.to);
              const isDanger = alert.variant === 'danger';
              const seq = String(idx + 1).padStart(2, '0');
              // Espacement vertical varié selon la priorité : danger plus dense,
              // warning standard, info plus aéré (anti-grille uniforme).
              const padTop =
                alert.variant === 'danger' ? 10 : alert.variant === 'warning' ? 12 : 14;
              const padBottom = padTop;
              return (
                <div
                  key={alert.id}
                  role="listitem"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: `${padTop}px 0 ${padBottom}px`,
                    borderBottom:
                      idx < alerts.length - 1 ? '1px solid var(--pt-line)' : 'none',
                  }}
                >
                  {/* Numérotation manuscrite-style à gauche */}
                  <div
                    aria-hidden
                    style={{
                      fontFamily: "'Big Shoulders Display', sans-serif",
                      fontSize: 18,
                      fontWeight: 700,
                      lineHeight: 1,
                      color: 'var(--pt-muted)',
                      letterSpacing: '-0.02em',
                      minWidth: 26,
                      paddingTop: 2,
                      opacity: 0.7,
                    }}
                  >
                    {seq}.
                  </div>

                  {/* Corps cliquable (titre + méta) */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={handleActivate}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleActivate();
                      }
                    }}
                    aria-label={`${alert.title} — ouvrir le détail`}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Big Shoulders Display', sans-serif",
                          fontSize: 15,
                          fontWeight: 700,
                          color: 'var(--pt-ink)',
                          letterSpacing: '0.005em',
                          lineHeight: 1.2,
                        }}
                      >
                        {alert.title}
                      </span>
                      <span
                        style={{
                          fontFamily: 'InstrumentSans, system-ui, sans-serif',
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: isDanger ? 'var(--pt-danger)' : 'var(--pt-muted)',
                        }}
                      >
                        {isDanger ? '• ' : ''}
                        {alert.tag}
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: 'InstrumentSans, system-ui, sans-serif',
                        fontSize: 12,
                        color: 'var(--pt-muted)',
                        lineHeight: 1.35,
                      }}
                    >
                      {alert.meta}
                    </div>
                  </div>

                  {/* Actions discrètes : ouvrir + acquitter */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      paddingTop: 2,
                      flexShrink: 0,
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => dismissAlert(alert.id, e)}
                      aria-label={`Acquitter ${alert.title}`}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 6,
                        color: 'var(--pt-muted)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 6,
                      }}
                    >
                      <CheckCheck size={15} strokeWidth={1.6} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={handleActivate}
                      aria-label={`Ouvrir ${alert.title}`}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 6,
                        color: 'var(--pt-ink)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 6,
                      }}
                    >
                      <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* F-1 V75-n — bannière onboarding repositionnée APRÈS À traiter pour ne
          pas masquer une mise-bas urgente quand l'éleveur ouvre l'app à 5h. */}
      <NotificationsPermissionPrompt />

      {/* Section 3 : MON ÉLEVAGE (KPIs résumés) */}
      <Section label="Mon élevage">
        <StatsGrid cols={4}>
          <Stat value={showSkeletons ? '—' : stats.truies} label="Truies" />
          <Stat value={showSkeletons ? '—' : stats.verrats} label="Verrats" />
          <Stat value={showSkeletons ? '—' : stats.porcelets} label="Porcelets" />
          <Stat value={showSkeletons ? '—' : stats.bandes} label="Bandes" />
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
              <ClipboardList size={18} strokeWidth={1.5} aria-hidden="true" />
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
