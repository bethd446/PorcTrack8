/**
 * ReproductionHub — /reproduction
 * ══════════════════════════════════════════════════════════════════════════
 * Hub fil conducteur du cycle truie pour le naisseur-engraisseur.
 *
 *   1. KPIs Repro      : ISSE / IEM / Taux MB / Renouvellement
 *   2. À saillir       : truies VIDE/CHALEUR avec contexte temporel
 *   3. Écho J28        : saillies ≥21j sans MB (truie non confirmée pleine)
 *   4. MB imminente    : truies pleines J-3 .. J+5
 *   5. En maternité    : truies allaitantes J+0 .. J+28
 *   6. À sevrer        : bandes sous-mère dont le sevrage est dépassé
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { ChevronRight, Heart, Stethoscope, Baby, Home, Scissors, Layers } from 'lucide-react';

import AgritechLayout from '../../components/AgritechLayout';
import {
  Section,
  Card,
  Button,
  Tag,
  IconBox,
  StatsGrid,
  Stat,
  ActionRow,
  PageHeader,
  safeDisplay,
} from '@/design-system';
import { useFarm } from '../../context/FarmContext';
import { buildReproductionDashboard } from '../../services/reproductionDashboard';
import { computeGlobalKpis } from '../../services/perfKpiAnalyzer';
import { filterRealPortees } from '../../services/bandesAggregator';
import QuickSaillieForm from '../../components/forms/QuickSaillieForm';
import QuickEchographieForm from '../../components/forms/QuickEchographieForm';
import QuickMiseBasForm from '../../components/forms/QuickMiseBasForm';
import QuickSevrageForm from '../../components/forms/QuickSevrageForm';
import QuickSaillieBandeForm from '../../components/forms/QuickSaillieBandeForm';
import MultiPorteeSevrageWizard from '../../components/forms/MultiPorteeSevrageWizard';

// ─── Helpers display ─────────────────────────────────────────────────────────

function formatNumOrDash(n: number | null): string {
  if (n === null || !Number.isFinite(n) || n === 0) return '—';
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

function truieDisplay(t: { displayId: string; nom?: string }): string {
  return safeDisplay(t.nom ? `${t.displayId} (${t.nom})` : t.displayId);
}

function bandeDisplay(b: { idPortee: string; id: string }): string {
  return safeDisplay(b.idPortee || b.id);
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

interface StepProps {
  step: number;
  title: string;
  count: number;
  emptyLabel?: string;
  children: React.ReactNode;
}

const StepSection: React.FC<StepProps> = ({ step, title, count, emptyLabel, children }) => (
  <section aria-label={title}>
    <Section
      label={`Étape ${step} — ${title} (${count})`}
      tone={count > 0 ? 'accent' : 'primary'}
    />
    {count === 0 ? (
      <Card compact>
        <p style={{ margin: 0, color: 'var(--pt-text-muted)', fontSize: 13 }}>
          {emptyLabel ?? 'Rien à signaler.'}
        </p>
      </Card>
    ) : (
      <Card compact>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {children}
        </div>
      </Card>
    )}
  </section>
);

interface RowProps {
  primary: string;
  secondary: string;
  cta: string;
  Icon: React.ComponentType<{ size?: number }>;
  onPrimary: () => void;
  onCta: () => void;
}

const StepRow: React.FC<RowProps> = ({ primary, secondary, cta, Icon, onPrimary, onCta }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <div
      role="button"
      tabIndex={0}
      onClick={onPrimary}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPrimary(); }}
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        minHeight: 44,
      }}
    >
      <IconBox tone="accent">
        <Icon size={18} />
      </IconBox>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--pt-text)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {primary}
        </div>
        <div style={{ fontSize: 12, color: 'var(--pt-text-muted)', marginTop: 2 }}>
          {secondary}
        </div>
      </div>
    </div>
    <Button variant="primary" size="sm" onClick={onCta} ariaLabel={cta}>
      {cta}
    </Button>
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
  const [saillieBandeOpen, setSaillieBandeOpen] = useState(false);
  const [multiSevrageOpen, setMultiSevrageOpen] = useState(false);

  const canSaillieBande = dashboard.asaillir.length >= 2;
  const canMultiSevrage = dashboard.asevrer.length >= 2;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <div className="pt-page" style={{ padding: '8px 18px 24px', maxWidth: 1100, margin: '0 auto' }}>
            <PageHeader
              eyebrow="REPRODUCTION"
              title="Reproduction"
              subtitle="Saillies, gestation, maternité"
            />

            <Section label="KPIs REPRO" />
            <Card>
              <StatsGrid cols={4}>
                <Stat
                  value={kpis.isseMoyJours !== null ? `${formatNumOrDash(kpis.isseMoyJours)} j` : '—'}
                  label="ISSE"
                />
                <Stat
                  value={kpis.iemMoyJours !== null ? `${formatNumOrDash(kpis.iemMoyJours)} j` : '—'}
                  label="IEM"
                />
                <Stat
                  value={kpis.tauxMBPct !== null ? `${formatNumOrDash(kpis.tauxMBPct)} %` : '—'}
                  label="Taux MB"
                />
                <Stat
                  value={kpis.tauxRenouvellementPct !== null ? `${formatNumOrDash(kpis.tauxRenouvellementPct)} %` : '—'}
                  label="Renouv."
                />
              </StatsGrid>
            </Card>

            <Section label="LOTS DE SAILLIES" />
            <Card compact>
              <ActionRow
                icon={<IconBox tone="accent"><Layers size={18} /></IconBox>}
                title="Voir les lots de saillies"
                subtitle="Vagues regroupées par fenêtre de 5 jours"
                onClick={() => navigate('/reproduction/lots')}
                trailing={<ChevronRight size={18} aria-hidden="true" style={{ color: 'var(--pt-text-subtle)' }} />}
              />
            </Card>

            <StepSection
              step={1}
              title="À saillir"
              count={dashboard.asaillir.length}
              emptyLabel="Aucune truie en attente de saillie."
            >
              {canSaillieBande ? (
                <div data-testid="cta-saillie-bande" style={{ marginBottom: 4 }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => setSaillieBandeOpen(true)}
                    ariaLabel="Saillie en bande (multi-truies)"
                  >
                    <Layers size={14} aria-hidden="true" />
                    Saillie en bande ({dashboard.asaillir.length} truies)
                  </Button>
                </div>
              ) : null}
              {dashboard.asaillir.map(item => (
                <div key={item.truie.id}>
                  <StepRow
                    Icon={Heart}
                    primary={truieDisplay(item.truie)}
                    secondary={item.reason}
                    cta="+ Saillir"
                    onPrimary={() => navigate(`/troupeau/truies/${item.truie.id}`)}
                    onCta={() => setSaillieForm({ open: true, truieDisplayId: item.truie.displayId })}
                  />
                </div>
              ))}
            </StepSection>

            <StepSection
              step={2}
              title="Écho J28 en attente"
              count={dashboard.echo.length}
              emptyLabel="Aucune écho en attente."
            >
              {dashboard.echo.map(item => (
                <div key={`${item.truie.id}-${item.saillie.dateSaillie}`}>
                  <StepRow
                    Icon={Stethoscope}
                    primary={truieDisplay(item.truie)}
                    secondary={`Saillie ${item.saillie.dateSaillie} · J+${item.daysSinceSaillie}`}
                    cta="+ Écho"
                    onPrimary={() => navigate(`/troupeau/truies/${item.truie.id}`)}
                    onCta={() => setEchoForm({ open: true, truieDisplayId: item.truie.displayId })}
                  />
                </div>
              ))}
            </StepSection>

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
                  <div key={item.truie.id}>
                    <StepRow
                      Icon={Baby}
                      primary={truieDisplay(item.truie)}
                      secondary={`MB prévue ${item.truie.dateMBPrevue ?? '—'} · ${tag}`}
                      cta="+ Mise-bas"
                      onPrimary={() => navigate(`/troupeau/truies/${item.truie.id}`)}
                      onCta={() => setMiseBasForm({ open: true, truieId: item.truie.displayId })}
                    />
                  </div>
                );
              })}
            </StepSection>

            <StepSection
              step={4}
              title="En maternité J+0 → J+28"
              count={dashboard.enMaternite.length}
              emptyLabel="Aucune truie en maternité active."
            >
              {dashboard.enMaternite.map(item => (
                <div key={item.bande.id}>
                  <StepRow
                    Icon={Home}
                    primary={`${truieDisplay(item.truie)} · ${bandeDisplay(item.bande)}`}
                    secondary={`J+${item.daysSinceMB} sous mère`}
                    cta="Voir bande"
                    onPrimary={() => navigate(`/troupeau/bandes/${item.bande.id}`)}
                    onCta={() => navigate(`/troupeau/bandes/${item.bande.id}`)}
                  />
                </div>
              ))}
            </StepSection>

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
                  <div key={item.bande.id}>
                    <StepRow
                      Icon={Scissors}
                      primary={`${bandeDisplay(item.bande)} · ${truieLabel}`}
                      secondary={`J+${item.daysSinceMB} · ${tag}`}
                      cta="+ Sevrer"
                      onPrimary={() => navigate(`/troupeau/bandes/${item.bande.id}`)}
                      onCta={() => setSevrageForm({ open: true, bandeId: item.bande.idPortee || item.bande.id })}
                    />
                  </div>
                );
              })}
              {canMultiSevrage ? (
                <div data-testid="cta-multi-sevrage">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => setMultiSevrageOpen(true)}
                    ariaLabel="Sevrage multi-portées"
                  >
                    <Layers size={14} aria-hidden="true" />
                    Sevrage multi-portées ({dashboard.asevrer.length} portées)
                  </Button>
                </div>
              ) : null}
            </StepSection>

            <Section label="CALENDRIER VISUEL" tone="accent" />
            <Card compact>
              <ActionRow
                title="Voir le calendrier complet"
                subtitle="Saillies, échos, mises-bas et sevrages sur le calendrier mensuel."
                onClick={() => navigate('/cycles/repro')}
                trailing={<ChevronRight size={18} aria-hidden="true" style={{ color: 'var(--pt-text-subtle)' }} />}
              />
            </Card>
          </div>

          {/* Forms (BottomSheet pré-remplis) */}
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
          <QuickSaillieBandeForm
            isOpen={saillieBandeOpen}
            onClose={() => setSaillieBandeOpen(false)}
          />
          <MultiPorteeSevrageWizard
            isOpen={multiSevrageOpen}
            onClose={() => setMultiSevrageOpen(false)}
          />
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default ReproductionHub;
