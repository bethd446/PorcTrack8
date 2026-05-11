/**
 * V77 — ProtocolDetailView (route /protocoles/:id)
 *
 * Mockup référence : protocole-detail.html.
 * Affiche un protocole avec indication, posologie, étapes timeline, contre-
 * indication, et CTA "Marquer comme appliqué" + "Exporter PDF".
 */
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import {
  ChevronLeft,
  Crosshair,
  AlertTriangle,
  Check,
  FileDown,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getProtocolById } from './protocolsData';
import { ProtocolApplicationSheet } from './ProtocolApplicationSheet';

const ProtocolDetailView: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);

  const proto = getProtocolById(id);

  if (!proto) {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
          <div className="pt-screen">
            <header className="ph--primary">
              <button
                type="button"
                className="back"
                aria-label="Retour"
                onClick={() => navigate(-1)}
              >
                <ChevronLeft size={18} strokeWidth={2} aria-hidden />
              </button>
              <div className="eyebrow">Protocole</div>
              <h1>Introuvable</h1>
              <div className="sub">Le protocole demandé n’existe pas.</div>
            </header>
            <div className="actions-stack">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => navigate('/protocoles')}
              >
                Retour aux protocoles
              </button>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const handleExport = (): void => {
    showToast('Export PDF bientôt disponible', 'info', 2200);
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <div className="pt-screen">
          <header className="ph--primary">
            <button
              type="button"
              className="back"
              aria-label="Retour"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft size={18} strokeWidth={2} aria-hidden />
            </button>
            <div className="eyebrow">{proto.eyebrow}</div>
            <h1>{proto.title}</h1>
            <div className="sub">{proto.detailSub}</div>
          </header>

          <section className="section">
            <div className="section__label">Indication</div>
            <div className="alert-card alert-card--info">
              <span className="alert-card__icon" aria-hidden>
                <Crosshair size={22} strokeWidth={2} aria-hidden />
              </span>
              <div>
                <div className="alert-card__title">Cible thérapeutique</div>
                <div className="alert-card__body">{proto.indication}</div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section__label">Posologie</div>
            <table className="dt">
              <thead>
                <tr>
                  <th>Âge</th>
                  <th>Dose</th>
                  <th>Voie</th>
                  <th>Délai</th>
                </tr>
              </thead>
              <tbody>
                {proto.posology.map((row, idx) => (
                  <tr key={idx}>
                    <td className="num">{row.age}</td>
                    <td className="num">{row.dose}</td>
                    <td>{row.voie}</td>
                    <td className="num">{row.delai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="section">
            <div className="section__label">Étapes d’application</div>
            {proto.steps.map((step, idx) => (
              <div key={idx} className="timeline__step">
                <div className="timeline__num">{idx + 1}</div>
                <div className="timeline__body">
                  <div className="timeline__title">{step.title}</div>
                  <div className="timeline__desc">{step.description}</div>
                </div>
              </div>
            ))}

            {proto.contreIndication && (
              <div className="alert-card alert-card--danger">
                <span className="alert-card__icon" aria-hidden>
                  <AlertTriangle size={22} strokeWidth={2} aria-hidden />
                </span>
                <div>
                  <div className="alert-card__title">Contre-indication</div>
                  <div className="alert-card__body">{proto.contreIndication}</div>
                </div>
              </div>
            )}
          </section>

          <div className="actions-stack">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setSheetOpen(true)}
            >
              <Check size={18} strokeWidth={2} aria-hidden />
              Marquer comme appliqué
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleExport}
            >
              <FileDown size={18} strokeWidth={2} aria-hidden />
              Exporter PDF
            </button>
          </div>
        </div>

        <ProtocolApplicationSheet
          isOpen={sheetOpen}
          protocol={proto}
          onDismiss={() => setSheetOpen(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default ProtocolDetailView;
