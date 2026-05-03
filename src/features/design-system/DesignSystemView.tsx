/**
 * DesignSystemView — /design-system
 * ════════════════════════════════════════════════════════════════════════════
 * Storybook-lite : montre chaque composant V29 dans chaque variant.
 * Sert de référence visuelle pendant la migration des hubs vers le DNA
 * "Aujourd'hui".
 */

import React from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { Box, Heart, Truck } from 'lucide-react';

import {
  Card,
  Button,
  SectionHeader,
  Tag,
  IconBox,
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
