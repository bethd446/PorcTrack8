/**
 * DesignSystemView — /design-system
 * ════════════════════════════════════════════════════════════════════════════
 * Storybook-lite : montre chaque composant V29 dans chaque variant.
 * Sert de référence visuelle pendant la migration des hubs vers le DNA
 * "Aujourd'hui".
 */

import React from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { Box, Heart, Truck, Bell, ClipboardCheck, Stethoscope } from 'lucide-react';

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
} from '../../components/design-system';

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
