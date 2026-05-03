/**
 * OutilsView — /outils (V33)
 * ════════════════════════════════════════════════════════════════════════════
 * Tab "Outils" : tout ce qui est outil métier terrain qui n'est pas un hub
 * principal. Sortie de la page Plus pour épurer les réglages (settings).
 *
 * Ordre PDF v2.0 page 18 :
 *   - Toutes les alertes (badge count)
 *   - Audit du jour
 *   - Journal santé
 *   - Protocoles
 *   - Stocks
 *   - Fournisseurs
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import {
  AlertTriangle,
  ClipboardCheck,
  Stethoscope,
  BookOpen,
  Boxes,
  Truck,
} from 'lucide-react';

import AgritechLayout from '../../components/AgritechLayout';
import {
  Card,
  Section,
  ActionRow,
  IconBox,
} from '@/design-system';
import { usePilotage } from '../../context/PilotageContext';

const OutilsView: React.FC = () => {
  const navigate = useNavigate();
  const { alerts, alertesServeur } = usePilotage();

  const pendingAlertsCount =
    alerts.filter((a) => a.priority === 'CRITIQUE' || a.priority === 'HAUTE').length +
    alertesServeur.filter(
      (a) => a.priorite === 'CRITIQUE' || a.priorite === 'HAUTE',
    ).length;

  return (
    <IonPage>
      <IonContent fullscreen>
        <AgritechLayout withNav={true}>
          <div
            style={{
              background: 'var(--pt-bg)',
              minHeight: '100%',
              padding: '24px 16px 96px',
              maxWidth: 720,
              margin: '0 auto',
            }}
          >
            <header style={{ marginBottom: 24 }}>
              <Section label="Outils terrain" />
              <h1
                style={{
                  fontFamily: 'var(--pt-font-display)',
                  fontSize: 'var(--pt-text-display)',
                  fontWeight: 700,
                  margin: '8px 0 4px',
                  color: 'var(--pt-text)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.05,
                }}
              >
                Outils
              </h1>
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--pt-font-body)',
                  fontSize: 'var(--pt-text-small)',
                  color: 'var(--pt-text-muted)',
                }}
              >
                Tout pour ton quotidien terrain
              </p>
            </header>

            <section
              aria-label="Outils terrain"
              style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
            >
              <Section label="Au quotidien" />
              <Card style={{ padding: 8 }}>
                <ActionRow
                  icon={
                    <IconBox tone="primary" size={36}>
                      <AlertTriangle size={18} />
                    </IconBox>
                  }
                  title="Toutes les alertes"
                  description={
                    pendingAlertsCount > 0
                      ? `${pendingAlertsCount} en attente`
                      : 'Aucune alerte en attente'
                  }
                  badge={pendingAlertsCount > 0 ? pendingAlertsCount : undefined}
                  onClick={() => navigate('/alerts')}
                />
                <ActionRow
                  icon={
                    <IconBox tone="primary" size={36}>
                      <ClipboardCheck size={18} />
                    </IconBox>
                  }
                  title="Audit du jour"
                  description="Checklist de contrôle journalier"
                  onClick={() => navigate('/audit')}
                />
                <ActionRow
                  icon={
                    <IconBox tone="primary" size={36}>
                      <Stethoscope size={18} />
                    </IconBox>
                  }
                  title="Journal santé"
                  description="Soins, traitements, mortalités"
                  onClick={() => navigate('/sante')}
                />
                <ActionRow
                  icon={
                    <IconBox tone="primary" size={36}>
                      <BookOpen size={18} />
                    </IconBox>
                  }
                  title="Protocoles"
                  description="Guide métier et SOPs"
                  onClick={() => navigate('/protocoles')}
                />
              </Card>

              <Section label="Ressources" />
              <Card style={{ padding: 8 }}>
                <ActionRow
                  icon={
                    <IconBox tone="accent" size={36}>
                      <Boxes size={18} />
                    </IconBox>
                  }
                  title="Stocks"
                  description="Aliments, pharmacie, suivi"
                  onClick={() => navigate('/ressources')}
                />
                <ActionRow
                  icon={
                    <IconBox tone="accent" size={36}>
                      <Truck size={18} />
                    </IconBox>
                  }
                  title="Fournisseurs"
                  description="Carnet et commandes WhatsApp"
                  onClick={() => navigate('/fournisseurs')}
                />
              </Card>
            </section>
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default OutilsView;
