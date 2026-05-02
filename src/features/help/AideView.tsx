import React from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { HelpCircle, Phone } from 'lucide-react';
import AgritechLayout from '../../components/AgritechLayout';
import Eyebrow from '../../components/design/Eyebrow';
import TopBarSync from '../../components/design/TopBarSync';
import { buildWhatsappUrl, getSupportWhatsapp } from '../../services/supportContact';

const FONT_DISPLAY = 'var(--font-heading)';
const FONT_BODY = 'var(--font-body)';
const FONT_MONO = 'var(--font-mono)';

const WHATSAPP_BRAND = '#25D366';

interface FaqEntry {
  question: string;
  answer: string;
}

const FAQ: ReadonlyArray<FaqEntry> = [
  {
    question: 'Comment enregistrer une saillie ?',
    answer:
      "Depuis l'Accueil, touche « Saillie ». Sélectionne la truie puis le verrat. Valide.",
  },
  {
    question: "Pourquoi « Hors ligne » s'affiche ?",
    answer:
      "L'app tourne sans réseau. Tes saisies sont stockées et envoyées dès que le 4G/Wi-Fi revient.",
  },
  {
    question: 'Comment ajouter une truie ?',
    answer:
      "Ouvre Cheptel → onglet Truies → bouton +. Renseigne la boucle, le numéro et le statut, puis valide.",
  },
  {
    question: 'Comment fonctionnent les alertes ?',
    answer:
      "Les alertes sont calculées automatiquement à partir de tes données (mises-bas, sevrages, stocks). Touche une alerte pour voir le détail et la traiter.",
  },
  {
    question: 'Batterie faible pendant le tour ?',
    answer:
      "Active le mode économie d'énergie d'Android. L'app fonctionne sans notifications, tu peux saisir normalement.",
  },
];

const SUPPORT_MESSAGE = "Bonjour, j'ai besoin d'aide avec PorcTrack.";

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 10,
  letterSpacing: '0.20em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 12,
};

const sectionRule: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: 'var(--line)',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--radius-card)',
  padding: '14px 16px',
};

const AideView: React.FC = () => {
  const supportNumber = getSupportWhatsapp();
  const supportUrl = buildWhatsappUrl(SUPPORT_MESSAGE);

  const openWhatsapp = (): void => {
    if (!supportUrl) return;
    window.open(supportUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout withNav={true}>
          <TopBarSync
            crumbs={['Plus', 'Aide']}
            onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
          />

          <div
            className="px-4 pt-5 pb-32"
            style={{
              fontFamily: FONT_BODY,
              color: 'var(--ink)',
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
              maxWidth: 1100,
              margin: '0 auto',
            }}
          >
            <header>
              <Eyebrow dotColor="accent">Plus · Aide</Eyebrow>
              <h1
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 34,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  margin: '8px 0 4px',
                }}
              >
                Aide
              </h1>
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: 'var(--muted)',
                }}
              >
                FAQ et support
              </div>
            </header>

            <section aria-label="Introduction">
              <div
                style={{
                  ...cardStyle,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    borderRadius: 10,
                    background: 'var(--color-accent-100)',
                    color: 'var(--color-accent-500)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <HelpCircle size={18} />
                </span>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: 'var(--ink-soft)',
                  }}
                >
                  Questions fréquentes pour utiliser PorcTrack sur le terrain.
                  Touchez une question pour voir la réponse.
                </p>
              </div>
            </section>

            <section aria-label="Foire aux questions">
              <div style={sectionLabelStyle}>
                <span>Questions fréquentes</span>
                <span aria-hidden style={sectionRule} />
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
                aria-label="FAQ"
              >
                {FAQ.map((entry, idx) => (
                  <li key={idx}>
                    <details className="group" style={cardStyle}>
                      <summary
                        className="cursor-pointer list-none"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          minHeight: 32,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: 'var(--ink)',
                            lineHeight: 1.35,
                          }}
                        >
                          {entry.question}
                        </span>
                        <span
                          aria-hidden="true"
                          className="group-open:rotate-45"
                          style={{
                            fontFamily: FONT_MONO,
                            fontSize: 18,
                            color: 'var(--muted)',
                            transition: 'transform 150ms var(--ease-emil)',
                            flexShrink: 0,
                          }}
                        >
                          +
                        </span>
                      </summary>
                      <p
                        style={{
                          marginTop: 12,
                          marginBottom: 0,
                          fontSize: 14,
                          lineHeight: 1.6,
                          color: 'var(--ink-soft)',
                        }}
                      >
                        {entry.answer}
                      </p>
                    </details>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Contact support">
              <div style={sectionLabelStyle}>
                <span>Contacter le support</span>
                <span aria-hidden style={sectionRule} />
              </div>
              {supportUrl ? (
                <button
                  type="button"
                  onClick={openWhatsapp}
                  aria-label={`Contacter le support via WhatsApp au ${supportNumber}`}
                  style={{
                    width: '100%',
                    minHeight: 52,
                    padding: '14px 22px',
                    background: WHATSAPP_BRAND,
                    color: '#ffffff',
                    border: `1.5px solid ${WHATSAPP_BRAND}`,
                    borderRadius: 'var(--radius-pill)',
                    fontFamily: FONT_MONO,
                    fontSize: 13,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    transition: 'transform 160ms var(--ease-emil), filter 200ms var(--ease-emil)',
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <Phone size={15} aria-hidden="true" />
                  Contacter via WhatsApp
                </button>
              ) : (
                <div style={cardStyle}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: 'var(--ink-soft)',
                    }}
                  >
                    Contact non configuré. Demandez à votre gérant de renseigner
                    le numéro WhatsApp dans{' '}
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                      Plus → Réglages → Contact support
                    </span>
                    .
                  </p>
                </div>
              )}
            </section>
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default AideView;
