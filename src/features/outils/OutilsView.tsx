/**
 * OutilsView — /outils (V77 namespace .pt-screen)
 * ════════════════════════════════════════════════════════════════════════════
 * Tab "Outils" : tout ce qui est outil métier terrain qui n'est pas un hub
 * principal. Sortie de la page Plus pour épurer les réglages (settings).
 *
 * Pattern V77 : pt-screen + ph--primary + card-link (Section labels).
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
  ChevronRight,
  ClipboardCheck,
  Stethoscope,
  BookOpen,
  Boxes,
  Truck,
} from 'lucide-react';

import { Section } from '@/design-system';
import { usePilotage } from '../../context/PilotageContext';

interface ToolItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  count?: number;
}

const OutilsView: React.FC = () => {
  const navigate = useNavigate();
  const { alerts, alertesServeur } = usePilotage();

  const pendingAlertsCount =
    alerts.filter((a) => a.priority === 'CRITIQUE' || a.priority === 'HAUTE').length +
    alertesServeur.filter(
      (a) => a.priorite === 'CRITIQUE' || a.priorite === 'HAUTE',
    ).length;

  const quotidien: ToolItem[] = [
    {
      id: 'alerts',
      title: 'Toutes les alertes',
      description:
        pendingAlertsCount > 0
          ? `${pendingAlertsCount} en attente`
          : 'Aucune alerte en attente',
      icon: <AlertTriangle size={18} aria-hidden />,
      route: '/alerts',
      count: pendingAlertsCount > 0 ? pendingAlertsCount : undefined,
    },
    {
      id: 'audit',
      title: 'Audit du jour',
      description: 'Checklist de contrôle journalier',
      icon: <ClipboardCheck size={18} aria-hidden />,
      route: '/controle',
    },
    {
      id: 'sante',
      title: 'Journal santé',
      description: 'Soins, traitements, mortalités',
      icon: <Stethoscope size={18} aria-hidden />,
      route: '/sante',
    },
    {
      id: 'protocoles',
      title: 'Protocoles',
      description: 'Guide métier et SOPs',
      icon: <BookOpen size={18} aria-hidden />,
      route: '/protocoles',
    },
  ];

  const ressources: ToolItem[] = [
    {
      id: 'stocks',
      title: 'Stocks',
      description: 'Aliments, pharmacie, suivi',
      icon: <Boxes size={18} aria-hidden />,
      route: '/ressources',
    },
    {
      id: 'fournisseurs',
      title: 'Fournisseurs',
      description: 'Carnet et commandes WhatsApp',
      icon: <Truck size={18} aria-hidden />,
      route: '/fournisseurs',
    },
  ];

  const renderTool = (item: ToolItem) => (
    <button
      key={item.id}
      type="button"
      className="card-link"
      onClick={() => navigate(item.route)}
      aria-label={item.title}
    >
      <div className="card-link__icon">{item.icon}</div>
      <div className="card-link__main">
        <div className="card-link__title">{item.title}</div>
        <div className="card-link__sub">{item.description}</div>
      </div>
      {item.count !== undefined && (
        <span
          className="card-link__count"
          style={{ fontFamily: 'var(--ff-mono)' }}
        >
          {item.count}
        </span>
      )}
      <span className="card-link__chev"><ChevronRight aria-hidden /></span>
    </button>
  );

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <div className="pt-screen">
          <header className="ph--primary">
            <div className="eyebrow">OUTILS</div>
            <h1>Outils terrain</h1>
            <div className="sub">Tes raccourcis quotidiens</div>
          </header>

          <div
            className="phone-content"
            style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}
          >
            <Section label="Au quotidien" />
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, marginBottom: 24 }}
            >
              {quotidien.map(renderTool)}
            </div>

            <Section label="Ressources" />
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}
            >
              {ressources.map(renderTool)}
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default OutilsView;
