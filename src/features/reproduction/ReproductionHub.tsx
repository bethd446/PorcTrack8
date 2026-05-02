/**
 * ReproductionHub — /reproduction
 * ══════════════════════════════════════════════════════════════════════════
 * Hub fil conducteur du cycle truie pour le naisseur-engraisseur (V22-B3).
 *
 * Contrairement à `/cycles/repro` (calendrier visuel), cette page donne une
 * vision séquentielle : 5 étapes du cycle truie + KPIs de synthèse + lien
 * vers le calendrier complet.
 *
 *   1. KPIs Repro      : ISSE / IEM / Taux MB / Renouvellement
 *   2. À saillir       : truies VIDE/CHALEUR avec contexte temporel
 *   3. Écho J28        : saillies ≥21j sans MB (truie non confirmée pleine)
 *   4. MB imminente    : truies pleines J-3 .. J+5
 *   5. En maternité    : truies allaitantes J+0 .. J+28
 *   6. À sevrer        : bandes sous-mère dont le sevrage est dépassé
 *
 * CTA contextuels par item, ouverts dans des BottomSheet locaux pour
 * pré-remplir la truie/bande sélectionnée (ne passe pas par le FAB global).
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { ChevronRight, Heart, Stethoscope, Baby, Home, Scissors, ArrowRight, Layers } from 'lucide-react';

import AgritechLayout from '../../components/AgritechLayout';
import Eyebrow from '../../components/design/Eyebrow';
import { default as KpiCardV6 } from '../../components/design/KpiCard';
import { useFarm } from '../../context/FarmContext';
import { buildReproductionDashboard } from '../../services/reproductionDashboard';
import { computeGlobalKpis } from '../../services/perfKpiAnalyzer';
import { filterRealPortees } from '../../services/bandesAggregator';
import QuickSaillieForm from '../../components/forms/QuickSaillieForm';
import QuickEchographieForm from '../../components/forms/QuickEchographieForm';
import QuickMiseBasForm from '../../components/forms/QuickMiseBasForm';
import QuickSevrageForm from '../../components/forms/QuickSevrageForm';

// ─── Helpers display ─────────────────────────────────────────────────────────

function formatNumOrDash(n: number | null): string {
  if (n === null || !Number.isFinite(n) || n === 0) return '—';
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

function truieDisplay(t: { displayId: string; nom?: string }): string {
  return t.nom ? `${t.displayId} (${t.nom})` : t.displayId;
}

function bandeDisplay(b: { idPortee: string; id: string }): string {
  return b.idPortee || b.id;
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

interface SectionProps {
  step: number;
  title: string;
  count: number;
  emptyLabel?: string;
  children: React.ReactNode;
}

const StepSection: React.FC<SectionProps> = ({ step, title, count, emptyLabel, children }) => (
  <section aria-label={title} style={{ marginTop: 8 }}>
    <Eyebrow dotColor={count > 0 ? 'pig' : 'muted'}>
      Étape {step} — {title} ({count})
    </Eyebrow>
    {count === 0 ? (
      <p
        style={{
          fontFamily: 'InstrumentSans, system-ui, sans-serif',
          fontSize: 13,
          color: 'var(--muted)',
          margin: '12px 0 0',
          padding: '12px 14px',
          background: 'var(--bg-surface)',
          border: '1px dashed var(--line)',
          borderRadius: 12,
        }}
      >
        {emptyLabel ?? 'Rien à signaler.'}
      </p>
    ) : (
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
      </div>
    )}
  </section>
);

interface RowProps {
  primary: string;
  secondary: string;
  cta: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  onPrimary: () => void;
  onCta: () => void;
}

const StepRow: React.FC<RowProps> = ({ primary, secondary, cta, Icon, onPrimary, onCta }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      background: 'var(--bg-surface)',
      border: '1px solid var(--line)',
      borderRadius: 12,
      padding: '12px 14px',
      boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
    }}
  >
    <button
      type="button"
      onClick={onPrimary}
      className="pressable"
      style={{
        flex: 1,
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        minHeight: 44,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'var(--color-accent-100)',
          color: 'var(--color-accent-600)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={18} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontFamily: 'var(--font-heading, BigShoulders), system-ui, sans-serif',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.005em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {primary}
        </span>
        <span
          style={{
            display: 'block',
            fontFamily: 'DMMono, ui-monospace, monospace',
            fontSize: 11,
            color: 'var(--muted)',
            letterSpacing: '0.06em',
            marginTop: 2,
          }}
        >
          {secondary}
        </span>
      </span>
    </button>
    <button
      type="button"
      onClick={onCta}
      className="pressable"
      aria-label={cta}
      style={{
        minHeight: 44,
        padding: '8px 14px',
        borderRadius: 'var(--radius-pill)',
        background: 'var(--color-accent-500)',
        color: 'var(--bg-surface)',
        border: 'none',
        fontFamily: 'DMMono, ui-monospace, monospace',
        fontSize: 11,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {cta}
    </button>
  </div>
);

// ─── Composant principal ─────────────────────────────────────────────────────

const ReproductionHub: React.FC = () => {
  const navigate = useNavigate();
  const { truies, bandes, saillies } = useFarm();

  const today = useMemo(() => new Date(), []);
  const realBandes = useMemo(() => filterRealPortees(bandes), [bandes]);

  const dashboard = useMemo(
    () => buildReproductionDashboard(truies, saillies, realBandes, today),
    [truies, saillies, realBandes, today],
  );

  const kpis = useMemo(
    () => computeGlobalKpis(truies, realBandes, saillies),
    [truies, realBandes, saillies],
  );

  // ── Forms locaux (avec pré-remplissage par truie/bande) ────────────────────
  const [saillieForm, setSaillieForm] = useState<{ open: boolean; truieDisplayId?: string }>(
    { open: false },
  );
  const [echoForm, setEchoForm] = useState<{ open: boolean; truieDisplayId?: string }>(
    { open: false },
  );
  const [miseBasForm, setMiseBasForm] = useState<{ open: boolean; truieId?: string }>(
    { open: false },
  );
  const [sevrageForm, setSevrageForm] = useState<{ open: boolean; bandeId?: string }>(
    { open: false },
  );

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <div
            className="px-4 pt-5 pb-32 flex flex-col gap-7"
            style={{ maxWidth: 1100, margin: '0 auto' }}
          >
            {/* ── En-tête ──────────────────────────────────────────── */}
            <header>
              <Eyebrow dotColor="accent">Reproduction</Eyebrow>
              <h1
                style={{
                  fontFamily: 'var(--font-heading, BigShoulders), system-ui, sans-serif',
                  fontSize: 34,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  margin: '8px 0 4px',
                }}
              >
                Reproduction
              </h1>
              <div
                style={{
                  fontFamily: 'InstrumentSans, system-ui, sans-serif',
                  fontSize: 13,
                  color: 'var(--muted)',
                }}
              >
                Le cycle truie de ta ferme
              </div>
            </header>

            {/* ── KPIs Repro ───────────────────────────────────────── */}
            <section aria-label="KPIs Repro">
              <Eyebrow dotColor="accent">KPIs repro</Eyebrow>
              <div
                style={{
                  marginTop: 12,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: 10,
                }}
              >
                <KpiCardV6
                  label="ISSE"
                  value={formatNumOrDash(kpis.isseMoyJours)}
                  unit="j"
                  ariaLabel={`Intervalle Sevrage-Saillie ${formatNumOrDash(kpis.isseMoyJours)} jours`}
                />
                <KpiCardV6
                  label="IEM"
                  value={formatNumOrDash(kpis.iemMoyJours)}
                  unit="j"
                  ariaLabel={`Intervalle Entre Mise-Bas ${formatNumOrDash(kpis.iemMoyJours)} jours`}
                />
                <KpiCardV6
                  label="Taux MB"
                  value={formatNumOrDash(kpis.tauxMBPct)}
                  unit="%"
                  ariaLabel={`Taux mise-bas ${formatNumOrDash(kpis.tauxMBPct)} pourcent`}
                />
                <KpiCardV6
                  label="Renouv."
                  value={formatNumOrDash(kpis.tauxRenouvellementPct)}
                  unit="%"
                  ariaLabel={`Taux renouvellement ${formatNumOrDash(kpis.tauxRenouvellementPct)} pourcent`}
                />
              </div>
            </section>

            {/* ── Lots de saillies ─────────────────────────────────── */}
            <section aria-label="Lots de saillies">
              <Eyebrow dotColor="accent">Lots de saillies</Eyebrow>
              <button
                type="button"
                onClick={() => navigate('/reproduction/lots')}
                className="pressable"
                style={{
                  width: '100%',
                  marginTop: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                aria-label="Voir les lots de saillies"
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'var(--color-accent-100)',
                    color: 'var(--color-accent-600)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Layers size={18} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontFamily: 'var(--font-heading, BigShoulders), system-ui, sans-serif',
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--ink)',
                    }}
                  >
                    Lots de saillies
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontFamily: 'DMMono, ui-monospace, monospace',
                      fontSize: 11,
                      color: 'var(--muted)',
                      marginTop: 2,
                    }}
                  >
                    Vagues regroupées par fenêtre de 5 jours
                  </span>
                </span>
                <ChevronRight size={18} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              </button>
            </section>

            {/* ── Étape 1 — À saillir ──────────────────────────────── */}
            <StepSection
              step={1}
              title="À saillir"
              count={dashboard.asaillir.length}
              emptyLabel="Aucune truie en attente de saillie."
            >
              {dashboard.asaillir.map(item => (
                <StepRow
                  key={item.truie.id}
                  Icon={Heart}
                  primary={truieDisplay(item.truie)}
                  secondary={item.reason}
                  cta="+ Saillir"
                  onPrimary={() => navigate(`/troupeau/truies/${item.truie.id}`)}
                  onCta={() => setSaillieForm({ open: true, truieDisplayId: item.truie.displayId })}
                />
              ))}
            </StepSection>

            {/* ── Étape 2 — Écho J28 en attente ────────────────────── */}
            <StepSection
              step={2}
              title="Écho J28 en attente"
              count={dashboard.echo.length}
              emptyLabel="Aucune écho en attente."
            >
              {dashboard.echo.map(item => (
                <StepRow
                  key={`${item.truie.id}-${item.saillie.dateSaillie}`}
                  Icon={Stethoscope}
                  primary={truieDisplay(item.truie)}
                  secondary={`Saillie ${item.saillie.dateSaillie} · J+${item.daysSinceSaillie}`}
                  cta="+ Écho"
                  onPrimary={() => navigate(`/troupeau/truies/${item.truie.id}`)}
                  onCta={() => setEchoForm({ open: true, truieDisplayId: item.truie.displayId })}
                />
              ))}
            </StepSection>

            {/* ── Étape 3 — Mise-bas imminente ─────────────────────── */}
            <StepSection
              step={3}
              title="Mise-bas imminente J-3 .. J+5"
              count={dashboard.mbImminente.length}
              emptyLabel="Aucune mise-bas dans la fenêtre."
            >
              {dashboard.mbImminente.map(item => {
                const tag = item.daysToMB > 0
                  ? `J-${item.daysToMB}`
                  : item.daysToMB === 0
                    ? "Aujourd'hui"
                    : `J+${Math.abs(item.daysToMB)} (retard)`;
                return (
                  <StepRow
                    key={item.truie.id}
                    Icon={Baby}
                    primary={truieDisplay(item.truie)}
                    secondary={`MB prévue ${item.truie.dateMBPrevue ?? '—'} · ${tag}`}
                    cta="+ Mise-bas"
                    onPrimary={() => navigate(`/troupeau/truies/${item.truie.id}`)}
                    onCta={() => setMiseBasForm({ open: true, truieId: item.truie.displayId })}
                  />
                );
              })}
            </StepSection>

            {/* ── Étape 4 — En maternité ───────────────────────────── */}
            <StepSection
              step={4}
              title="En maternité J+0 → J+28"
              count={dashboard.enMaternite.length}
              emptyLabel="Aucune truie en maternité active."
            >
              {dashboard.enMaternite.map(item => (
                <StepRow
                  key={item.bande.id}
                  Icon={Home}
                  primary={`${truieDisplay(item.truie)} · ${bandeDisplay(item.bande)}`}
                  secondary={`J+${item.daysSinceMB} sous mère`}
                  cta="Voir bande"
                  onPrimary={() => navigate(`/troupeau/bandes/${item.bande.id}`)}
                  onCta={() => navigate(`/troupeau/bandes/${item.bande.id}`)}
                />
              ))}
            </StepSection>

            {/* ── Étape 5 — À sevrer ───────────────────────────────── */}
            <StepSection
              step={5}
              title="À sevrer"
              count={dashboard.asevrer.length}
              emptyLabel="Aucune bande à sevrer aujourd'hui."
            >
              {dashboard.asevrer.map(item => {
                const tag = item.daysOverdue > 0
                  ? `Retard ${item.daysOverdue}j`
                  : "Aujourd'hui";
                const truieLabel = item.truie ? truieDisplay(item.truie) : 'Truie inconnue';
                return (
                  <StepRow
                    key={item.bande.id}
                    Icon={Scissors}
                    primary={`${bandeDisplay(item.bande)} · ${truieLabel}`}
                    secondary={`J+${item.daysSinceMB} · ${tag}`}
                    cta="+ Sevrer"
                    onPrimary={() => navigate(`/troupeau/bandes/${item.bande.id}`)}
                    onCta={() => setSevrageForm({ open: true, bandeId: item.bande.idPortee || item.bande.id })}
                  />
                );
              })}
            </StepSection>

            {/* ── Calendrier complet ───────────────────────────────── */}
            <section aria-label="Calendrier complet" style={{ marginTop: 8 }}>
              <Eyebrow dotColor="amber">Calendrier visuel</Eyebrow>
              <button
                type="button"
                onClick={() => navigate('/cycles/repro')}
                className="pressable"
                style={{
                  marginTop: 12,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontFamily: 'var(--font-heading, BigShoulders), system-ui, sans-serif',
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      letterSpacing: '-0.005em',
                    }}
                  >
                    Voir le calendrier complet
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontFamily: 'InstrumentSans, system-ui, sans-serif',
                      fontSize: 13,
                      color: 'var(--ink-soft)',
                      marginTop: 2,
                    }}
                  >
                    Saillies, échos, mises-bas et sevrages sur le calendrier mensuel.
                  </span>
                </span>
                <ArrowRight size={18} color="var(--muted)" aria-hidden="true" />
                <ChevronRight size={16} color="var(--muted)" aria-hidden="true" />
              </button>
            </section>
          </div>

          {/* ── Forms (BottomSheet pré-remplis) ───────────────────────── */}
          <QuickSaillieForm
            isOpen={saillieForm.open}
            onClose={() => setSaillieForm({ open: false })}
            defaultTruieDisplayId={saillieForm.truieDisplayId}
          />
          <QuickEchographieForm
            isOpen={echoForm.open}
            onClose={() => setEchoForm({ open: false })}
            defaultTruieDisplayId={echoForm.truieDisplayId}
          />
          <QuickMiseBasForm
            isOpen={miseBasForm.open}
            onClose={() => setMiseBasForm({ open: false })}
            defaultTruieId={miseBasForm.truieId}
          />
          <QuickSevrageForm
            isOpen={sevrageForm.open}
            onClose={() => setSevrageForm({ open: false })}
            defaultBandeId={sevrageForm.bandeId}
          />
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default ReproductionHub;
