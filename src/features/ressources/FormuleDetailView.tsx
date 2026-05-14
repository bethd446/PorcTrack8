/**
 * FormuleDetailView — /ressources/formules/:id
 * ══════════════════════════════════════════════════════════════════════════
 * V78 fiche détail d'une formule d'aliment (mockup `ressources-reproduction-
 * mockup-v76.html` section A.3, transposé en page dédiée).
 *
 * Contenu :
 *  - Header `pt-screen` + `ph--primary` avec back vers liste, chip phase.
 *  - Section « Composition » : table ingrédient / % / kg pour 100 kg / coût.
 *  - Section « Apports nutritionnels » : barres de progression par nutriment.
 *  - KPI « Coût final » (FCFA / kg) en bas de la composition.
 *  - Section « Bandes utilisatrices » : liste des bandes courantes.
 *
 * Données : `formulesData.getFormuleById`. Si id inconnu, affiche un état
 * vide avec retour vers le hub.
 */

import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { ChevronLeft, FlaskConical } from 'lucide-react';

import { Section } from '../../v70/components/ds/Section';
import { Pill, type PillVariant } from '../../v70/components/ds/Pill';
import {
  getFormuleById,
  type Formule,
  type FormulePillTone,
  type FormuleSource,
} from './formulesData';

function pillVariantForTone(tone: FormulePillTone): PillVariant {
  switch (tone) {
    case 'amber':
      return 'warning';
    case 'soft':
      return 'soft';
    case 'success':
      return 'success';
    case 'info':
      return 'info';
    case 'warm':
      return 'warm';
    default:
      return 'ghost';
  }
}

function fmtKg(n: number): string {
  if (!isFinite(n)) return '—';
  return Number.isInteger(n) ? `${n}` : n.toFixed(1).replace('.', ',');
}

function fmtFcfa(n: number): string {
  return n.toLocaleString('fr-FR');
}

interface CompositionRowProps {
  nom: string;
  pourcent: number;
  prixKgFcfa: number;
}

const CompositionRow: React.FC<CompositionRowProps> = ({ nom, pourcent, prixKgFcfa }) => {
  // base de calcul : 100 kg de mélange ; le tonnage et le coût ingrédient
  // découlent du pourcent (ex. 35% sur 100 kg = 35 kg).
  const kg = pourcent;
  const coutLigneFcfa = Math.round((pourcent / 100) * prixKgFcfa * 100);
  return (
    <tr>
      <td
        style={{
          padding: '10px 10px 10px 14px',
          fontSize: 13,
          color: 'var(--pt-ink)',
          fontWeight: 600,
        }}
      >
        {nom}
      </td>
      <td
        className="num"
        style={{
          padding: 10,
          textAlign: 'right',
          fontFamily: 'var(--pt-font-mono)',
          fontSize: 12,
          color: 'var(--pt-muted)',
        }}
      >
        {pourcent} %
      </td>
      <td
        className="num"
        style={{
          padding: 10,
          textAlign: 'right',
          fontFamily: 'var(--pt-font-mono)',
          fontSize: 12,
          color: 'var(--pt-ink)',
          fontWeight: 700,
        }}
      >
        {fmtKg(kg)} kg
      </td>
      <td
        className="num"
        style={{
          padding: '10px 14px 10px 10px',
          textAlign: 'right',
          fontFamily: 'var(--pt-font-mono)',
          fontSize: 12,
          color: 'var(--pt-accent)',
          fontWeight: 700,
        }}
      >
        {fmtFcfa(coutLigneFcfa)}
      </td>
    </tr>
  );
};

interface ApportBarProps {
  label: string;
  valeur: string;
  ratio: number;
}

const ApportBar: React.FC<ApportBarProps> = ({ label, valeur, ratio }) => {
  const clamped = Math.max(0, Math.min(100, ratio));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontFamily: 'var(--pt-font-mono)',
          fontSize: 12,
        }}
      >
        <span style={{ color: 'var(--pt-muted)', fontWeight: 600 }}>{label}</span>
        <span style={{ color: 'var(--pt-ink)', fontWeight: 700 }}>{valeur}</span>
      </div>
      <div
        style={{
          height: 6,
          background: 'var(--pt-bg-app)',
          borderRadius: 99,
          overflow: 'hidden',
        }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={`${label} : ${clamped}% de la cible`}
      >
        <span
          style={{
            display: 'block',
            height: '100%',
            width: `${clamped}%`,
            background:
              clamped >= 85
                ? 'var(--pt-success)'
                : clamped >= 70
                ? 'var(--pt-primary)'
                : 'var(--pt-warning)',
          }}
        />
      </div>
    </div>
  );
};

const FormuleDetailHeader: React.FC<{ formule: Formule; onBack: () => void }> = ({
  formule,
  onBack,
}) => (
  <header className="ph--primary">
    <button
      type="button"
      className="back"
      aria-label="Retour aux formules"
      onClick={onBack}
    >
      <ChevronLeft size={18} strokeWidth={2} aria-hidden />
    </button>
    <div className="eyebrow">Stocks · Formules</div>
    <h1>{formule.nom}</h1>
    <div className="sub" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <Pill variant={pillVariantForTone(formule.pillTone)}>{formule.pillLabel}</Pill>
      <span>{formule.description}</span>
    </div>
  </header>
);

const FormuleNotFound: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <IonPage>
    <IonContent fullscreen className="ion-no-padding">
      <div className="pt-screen">
        <header className="ph--primary">
          <button
            type="button"
            className="back"
            aria-label="Retour aux formules"
            onClick={onBack}
          >
            <ChevronLeft size={18} strokeWidth={2} aria-hidden />
          </button>
          <div className="eyebrow">Stocks · Formules</div>
          <h1>Introuvable</h1>
        </header>
        <div className="phone-content" style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
          <div className="empty">
            <FlaskConical size={40} strokeWidth={2} color="var(--pt-subtle)" aria-hidden />
            <div
              style={{
                fontFamily: 'var(--pt-font-display)',
                fontWeight: 900,
                fontSize: 18,
                textTransform: 'uppercase',
              }}
            >
              Formule introuvable
            </div>
            <div style={{ fontSize: 13, color: 'var(--pt-muted)' }}>
              Cette recette n'existe plus ou n'a pas encore été enregistrée.
            </div>
            <button
              type="button"
              onClick={onBack}
              className="btn btn--primary"
              style={{
                marginTop: 12,
                padding: '10px 16px',
                borderRadius: 12,
                fontFamily: 'var(--pt-font-mono)',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              Retour aux formules
            </button>
          </div>
        </div>
      </div>
    </IonContent>
  </IonPage>
);

const FormuleDetailView: React.FC = () => {
  const navigate = useNavigate();
  const { id = '' } = useParams<{ id: string }>();
  // V82 — `?ref=marche` lève l'ambiguïté des ids partagés entre les 2
  // référentiels (ex: engraissement-eco existe dans mockup ET marché).
  const [searchParams] = useSearchParams();
  const refParam = searchParams.get('ref');
  const source: FormuleSource | undefined =
    refParam === 'marche' || refParam === 'mockup' ? refParam : undefined;
  const formule = getFormuleById(id, source);

  const goBack = (): void => {
    void navigate('/ressources/formules');
  };

  if (!formule) {
    return <FormuleNotFound onBack={goBack} />;
  }

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <div className="pt-screen">
          <FormuleDetailHeader formule={formule} onBack={goBack} />

          <div
            className="phone-content"
            style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}
          >
            <Section label="Composition · base 100 kg">
              <div
                className="card"
                style={{ padding: 0, overflow: 'hidden', marginBottom: 10 }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontFamily: 'var(--pt-font-body)',
                  }}
                >
                  <thead>
                    <tr style={{ background: 'var(--pt-bg-app)' }}>
                      <th
                        style={{
                          textAlign: 'left',
                          padding: '10px 10px 10px 14px',
                          fontFamily: 'var(--pt-font-mono)',
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--pt-subtle)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}
                      >
                        Ingrédient
                      </th>
                      <th
                        style={{
                          textAlign: 'right',
                          padding: 10,
                          fontFamily: 'var(--pt-font-mono)',
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--pt-subtle)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}
                      >
                        %
                      </th>
                      <th
                        style={{
                          textAlign: 'right',
                          padding: 10,
                          fontFamily: 'var(--pt-font-mono)',
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--pt-subtle)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}
                      >
                        kg
                      </th>
                      <th
                        style={{
                          textAlign: 'right',
                          padding: '10px 14px 10px 10px',
                          fontFamily: 'var(--pt-font-mono)',
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--pt-subtle)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                        }}
                      >
                        Coût FCFA
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {formule.ingredients.map((ing) => (
                      <CompositionRow
                        key={ing.nom}
                        nom={ing.nom}
                        pourcent={ing.pourcent}
                        prixKgFcfa={ing.prixKgFcfa}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div
                className="card"
                style={{
                  padding: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  background: 'var(--pt-bg-app)',
                }}
              >
                <span
                  className="eyebrow"
                  style={{
                    fontFamily: 'var(--pt-font-mono)',
                    fontSize: 11,
                    color: 'var(--pt-subtle)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Coût final
                </span>
                <div
                  className="num"
                  style={{
                    fontFamily: 'var(--pt-font-display)',
                    fontWeight: 900,
                    fontSize: 28,
                    letterSpacing: '-0.005em',
                    color: 'var(--pt-accent)',
                  }}
                >
                  {fmtFcfa(formule.coutKgFcfa)}
                  <small
                    style={{
                      fontFamily: 'var(--pt-font-mono)',
                      fontWeight: 600,
                      fontSize: 12,
                      color: 'var(--pt-muted)',
                      marginLeft: 4,
                    }}
                  >
                    FCFA / kg
                  </small>
                </div>
              </div>
            </Section>

            <Section label="Apports nutritionnels">
              <div
                className="card"
                style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                {formule.apports.map((a) => (
                  <ApportBar
                    key={a.label}
                    label={a.label}
                    valeur={a.valeur}
                    ratio={a.ratio}
                  />
                ))}
              </div>
            </Section>

            <Section
              label={`Bandes utilisatrices · ${formule.bandes.length}`}
            >
              {formule.bandes.length === 0 ? (
                <div className="empty">
                  <div style={{ fontSize: 13, color: 'var(--pt-muted)' }}>
                    Aucune bande n'utilise actuellement cette formule.
                  </div>
                </div>
              ) : (
                <div
                  className="card"
                  style={{ padding: 0, overflow: 'hidden' }}
                >
                  {formule.bandes.map((b, i) => (
                    <div
                      key={b.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 14px',
                        borderTop: i === 0 ? 'none' : '1px solid var(--pt-line)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span
                          style={{
                            fontFamily: 'var(--pt-font-mono)',
                            fontSize: 13,
                            fontWeight: 700,
                            color: 'var(--pt-ink)',
                          }}
                        >
                          {b.id}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--pt-muted)' }}>
                          {b.phase}
                        </span>
                      </div>
                      <div
                        className="num"
                        style={{
                          fontFamily: 'var(--pt-font-mono)',
                          fontSize: 13,
                          fontWeight: 700,
                          color: 'var(--pt-ink)',
                        }}
                      >
                        {b.effectif}
                        <small
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            marginLeft: 4,
                            color: 'var(--pt-muted)',
                          }}
                        >
                          têtes
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default FormuleDetailView;
