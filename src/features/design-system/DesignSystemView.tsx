/**
 * DesignSystemView — /design-system
 * ════════════════════════════════════════════════════════════════════════════
 * Storybook-lite : montre chaque composant V29 dans chaque variant.
 * Sert de référence visuelle pendant la migration des hubs vers le DNA
 * "Aujourd'hui".
 */

import React from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { Box, Heart, Truck, Bell, ClipboardCheck, Stethoscope, Plus, AlertTriangle } from 'lucide-react';

import {
  Card,
  Button,
  SectionHeader,
  Tag,
  IconBox,
  KeyValueRow,
  InsightCard,
  Input,
  FormField,
  Tabs,
  Segment,
  Chip,
  Search,
  ListItem,
  ActionRow,
  Stat,
  StatsGrid,
  AlertGroup,
  AlertRow,
} from '../../design-system';

const Block: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <SectionHeader label={title} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {children}
    </div>
  </section>
);

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
    {children}
  </div>
);

const DesignSystemView: React.FC = () => {
  const [tabValue, setTabValue] = React.useState<string>('liste');
  const [segmentValue, setSegmentValue] = React.useState<string>('liste');
  const [chipFilter, setChipFilter] = React.useState<'tout' | 'pleines' | 'vides'>('tout');
  const [searchValue, setSearchValue] = React.useState<string>('');
  const [wizardStep, setWizardStep] = React.useState<number>(0);
  const wizardSteps = ['Étape 1', 'Étape 2', 'Étape 3'];
  return (
    <IonPage>
      <IonContent fullscreen>
        <div
          style={{
            background: 'var(--ds-bg)',
            minHeight: '100%',
            padding: '32px 20px 96px',
            color: 'var(--ds-text)',
            fontFamily: 'var(--ds-font-sans)',
          }}
        >
          <div
            style={{
              maxWidth: 920,
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 32,
            }}
          >
            <header>
              <h1
                style={{
                  fontFamily: 'var(--ds-font-serif)',
                  fontSize: 'var(--ds-text-display)',
                  margin: '0 0 8px',
                  fontWeight: 600,
                }}
              >
                Design System V29
              </h1>
              <p
                style={{
                  margin: 0,
                  color: 'var(--ds-text-muted)',
                  fontSize: 'var(--ds-text-body)',
                }}
              >
                Référence visuelle des composants canoniques. DNA &laquo;&nbsp;Aujourd&rsquo;hui&nbsp;&raquo;.
              </p>
            </header>

            <Block title="Cards">
              <Card>
                <strong>default</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--ds-text-muted)' }}>
                  Fond crème, radius 24px, padding 24px, ombre quasi invisible.
                </p>
              </Card>
              <Card variant="elevated">
                <strong>elevated</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--ds-text-muted)' }}>
                  Même fond, ombre marquée pour la hiérarchie hero.
                </p>
              </Card>
              <Card variant="alt">
                <strong>alt</strong>
                <p style={{ margin: '6px 0 0', color: 'var(--ds-text-muted)' }}>
                  Fond légèrement plus sombre (--ds-surface-alt).
                </p>
              </Card>
            </Block>

            <Block title="Buttons">
              <Row>
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
              </Row>
              <Row>
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </Row>
            </Block>

            <Block title="Section headers">
              <SectionHeader label="Aperçu" />
              <SectionHeader label="Tâche prioritaire" tone="accent" />
            </Block>

            <Block title="Tags">
              <Row>
                <Tag>default</Tag>
                <Tag variant="accent">accent</Tag>
                <Tag variant="primary">primary</Tag>
                <Tag variant="success">success</Tag>
                <Tag variant="warning">warning</Tag>
              </Row>
              <Row>
                <Tag>vide</Tag>
                <Tag variant="success">gestante</Tag>
                <Tag variant="warning">surveillance</Tag>
                <Tag variant="accent">à confirmer</Tag>
              </Row>
            </Block>

            <Block title="IconBoxes">
              <Row>
                <IconBox tone="accent">
                  <Heart size={20} />
                </IconBox>
                <IconBox tone="primary">
                  <Box size={20} />
                </IconBox>
                <IconBox tone="accent" size={56}>
                  <Truck size={24} />
                </IconBox>
              </Row>
            </Block>

            <Block title="V30 — KeyValueRow">
              <Card>
                <KeyValueRow label="ID" value="T03" />
                <KeyValueRow label="Boucle" value="FR-3-01" tone="muted" />
                <KeyValueRow label="Cycle" value="4" />
                <KeyValueRow
                  label="MB prévue"
                  value="15/05/2026"
                  tone="accent"
                />
              </Card>
            </Block>

            <Block title="V30 — InsightCard (Marius)">
              <InsightCard title="Analyse Marius">
                Le sevrage de la bande B07 est prévu dans 2 jours. Penser à
                préparer la transition aliment.
              </InsightCard>
            </Block>

            <Block title="V30 — Input + FormField">
              <FormField label="Nom de la truie" hint="Champ libre, 32 car. max">
                <Input placeholder="Monette" />
              </FormField>
              <FormField label="Code" required hint="Format : T01, T02…">
                <Input placeholder="T01" />
              </FormField>
              <FormField
                label="Boucle"
                error="Le format attendu est FR-XX-YY"
              >
                <Input placeholder="FR-3-01" invalid />
              </FormField>
            </Block>

            <Block title="V30 — Tabs (segment control)">
              <Tabs
                items={[
                  { id: 'liste', label: 'Liste' },
                  { id: 'grille', label: 'Grille' },
                ]}
                value={tabValue}
                onChange={setTabValue}
                ariaLabel="Mode d'affichage"
              />
              <Tabs
                items={[
                  { id: 'recent', label: 'Récent' },
                  { id: 'mb', label: 'MB prévue' },
                  { id: 'parite', label: 'Parité' },
                  { id: 'id', label: 'ID' },
                ]}
                value="recent"
                onChange={() => {}}
                ariaLabel="Tri"
              />
            </Block>

            <Block title="V33 — Segment (toggle Liste/Grille)">
              <Segment
                options={[
                  { value: 'liste', label: 'Liste' },
                  { value: 'grille', label: 'Grille' },
                ]}
                value={segmentValue}
                onChange={setSegmentValue}
                ariaLabel="Mode d'affichage"
              />
            </Block>

            <Block title="V33 — Chip (filtres avec compteur)">
              <Row>
                <Chip
                  label="Tout"
                  count={17}
                  active={chipFilter === 'tout'}
                  onClick={() => setChipFilter('tout')}
                />
                <Chip
                  label="Pleines"
                  count={6}
                  active={chipFilter === 'pleines'}
                  onClick={() => setChipFilter('pleines')}
                />
                <Chip
                  label="Vides"
                  count={6}
                  active={chipFilter === 'vides'}
                  onClick={() => setChipFilter('vides')}
                />
                <Chip label="Passive" count={42} />
              </Row>
            </Block>

            <Block title="V33 — Search (input pill loupe)">
              <Search
                placeholder="Chercher une truie, une bande…"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onClear={() => setSearchValue('')}
              />
            </Block>

            <Block title="V33 — ListItem (ligne animal)">
              <Card style={{ padding: 8 }}>
                <ListItem
                  avatar={
                    <IconBox tone="accent">
                      <Heart size={20} />
                    </IconBox>
                  }
                  primary="T01 · Monette"
                  secondary="B.22 · Allaitante"
                  trailing={<Tag variant="success">Pleine</Tag>}
                  onClick={() => {}}
                />
                <ListItem
                  avatar={
                    <IconBox tone="primary">
                      <Box size={20} />
                    </IconBox>
                  }
                  primary="T02 · Coquette"
                  secondary="B.23 · Vide"
                  trailing={<Tag>Vide</Tag>}
                  onClick={() => {}}
                />
              </Card>
            </Block>

            <Block title="V33 — ActionRow (entrée menu)">
              <Card style={{ padding: 8 }}>
                <ActionRow
                  icon={
                    <IconBox tone="primary" size={36}>
                      <Bell size={18} />
                    </IconBox>
                  }
                  title="Toutes les alertes"
                  description="3 en attente"
                  badge={3}
                  onClick={() => {}}
                />
                <ActionRow
                  icon={
                    <IconBox tone="primary" size={36}>
                      <ClipboardCheck size={18} />
                    </IconBox>
                  }
                  title="Audit du jour"
                  description="Checklist matinale"
                  onClick={() => {}}
                />
                <ActionRow
                  icon={
                    <IconBox tone="accent" size={36}>
                      <Stethoscope size={18} />
                    </IconBox>
                  }
                  title="Se déconnecter"
                  destructive
                  onClick={() => {}}
                />
              </Card>
            </Block>

            <Block title="V33 — Stat + StatsGrid (Inventaire)">
              <StatsGrid cols={4}>
                <Stat value="17" label="Truies" />
                <Stat value="2" label="Verrats" />
                <Stat value="29" label="Pleines" tone="accent" />
                <Stat value="3" label="Alertes" tone="danger" />
              </StatsGrid>
            </Block>

            <Block title="V31 — AlertGroup + AlertRow">
              <AlertGroup
                icon={<AlertTriangle size={18} strokeWidth={2} />}
                title="Stocks véto en rupture"
                subtitle="3 produits à recommander"
                severity="urgent"
                count={3}
                action={{ label: 'Voir le stock', onClick: () => {} }}
              >
                <AlertRow
                  primary="Ivermectine"
                  secondary="Vermifuge injectable"
                  value="0"
                  unit="ml"
                  valueDanger
                />
                <AlertRow
                  primary="Amoxicilline LA"
                  secondary="Antibiotique large spectre"
                  value="2"
                  unit="doses"
                  valueDanger
                />
                <AlertRow
                  primary="Fer dextran"
                  secondary="Anti-anémie porcelets"
                  value="0"
                  unit="ml"
                  valueDanger
                />
              </AlertGroup>
            </Block>

            <Block title="V32 — Wizard (3 étapes)">
              <Card>
                <p
                  style={{
                    fontFamily: 'var(--pt-font-body)',
                    fontSize: 11,
                    letterSpacing: 'var(--pt-tracking-label)',
                    textTransform: 'uppercase',
                    color: 'var(--ds-text-muted)',
                    margin: '0 0 6px',
                    fontWeight: 600,
                  }}
                >
                  Étape {wizardStep + 1} sur {wizardSteps.length}
                </p>
                <h3
                  style={{
                    fontFamily: 'var(--pt-font-display)',
                    fontSize: 22,
                    fontWeight: 700,
                    margin: '0 0 12px',
                    textTransform: 'uppercase',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {wizardSteps[wizardStep]}
                </h3>
                <div
                  role="progressbar"
                  aria-valuemin={1}
                  aria-valuemax={wizardSteps.length}
                  aria-valuenow={wizardStep + 1}
                  style={{
                    display: 'flex',
                    gap: 4,
                    marginBottom: 16,
                  }}
                >
                  {wizardSteps.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 'var(--pt-radius-pill)',
                        background:
                          i <= wizardStep ? 'var(--pt-primary)' : 'var(--pt-surface-alt)',
                        transition: 'background 200ms ease',
                      }}
                    />
                  ))}
                </div>
                <p style={{ margin: '0 0 18px', color: 'var(--ds-text-muted)', fontSize: 13 }}>
                  Démo visuelle de progression. Le composant Wizard plein-écran s'utilise
                  dans les flows édition (ex : éditer une truie, créer une bande).
                </p>
                <Row>
                  <Button
                    variant="ghost"
                    onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
                    disabled={wizardStep === 0}
                  >
                    ← Précédent
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() =>
                      setWizardStep((s) => Math.min(wizardSteps.length - 1, s + 1))
                    }
                    disabled={wizardStep === wizardSteps.length - 1}
                  >
                    Suivant →
                  </Button>
                </Row>
              </Card>
            </Block>

            <Block title="V33 — FAB (preview)">
              <Card>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18,
                    padding: '8px 4px',
                  }}
                >
                  <button
                    type="button"
                    aria-label="Aperçu FAB (non interactif)"
                    style={{
                      height: 56,
                      width: 56,
                      minHeight: 56,
                      minWidth: 56,
                      borderRadius: '50%',
                      background: 'var(--pt-primary)',
                      color: 'var(--pt-primary-text)',
                      border: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow:
                        '0 6px 16px color-mix(in srgb, var(--pt-primary) 40%, transparent)',
                      cursor: 'default',
                    }}
                  >
                    <Plus size={26} strokeWidth={2.5} aria-hidden />
                  </button>
                  <div style={{ minWidth: 0 }}>
                    <strong
                      style={{
                        fontFamily: 'var(--pt-font-display)',
                        fontSize: 18,
                        textTransform: 'uppercase',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      FAB rond contextuel
                    </strong>
                    <p
                      style={{
                        margin: '6px 0 0',
                        color: 'var(--ds-text-muted)',
                        fontSize: 13,
                        lineHeight: 1.45,
                      }}
                    >
                      Visible uniquement sur certaines pages via{' '}
                      <code style={{ fontFamily: 'var(--pt-font-mono)' }}>usePageFab</code>.
                      Position : <code style={{ fontFamily: 'var(--pt-font-mono)' }}>fixed</code>{' '}
                      bottom-center, au-dessus de la nav.
                    </p>
                  </div>
                </div>
              </Card>
            </Block>

            <Block title="Composition (preview ligne Élevage)">
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <IconBox tone="accent">
                    <Heart size={20} />
                  </IconBox>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: 'var(--ds-font-serif)',
                        fontSize: 18,
                        fontWeight: 600,
                      }}
                    >
                      Truie T03
                    </div>
                    <div
                      style={{
                        color: 'var(--ds-text-muted)',
                        fontSize: 'var(--ds-text-small)',
                        marginTop: 2,
                      }}
                    >
                      Boucle FR-3-01 · Cycle 4
                    </div>
                  </div>
                  <Tag variant="success">gestante</Tag>
                </div>
              </Card>
            </Block>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default DesignSystemView;
