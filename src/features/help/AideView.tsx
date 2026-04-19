import React from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { MessageCircle, HelpCircle } from 'lucide-react';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechHeader from '../../components/AgritechHeader';
import { SectionDivider } from '../../components/agritech';
import { buildWhatsappUrl, getSupportWhatsapp } from '../../services/supportContact';

/* ═════════════════════════════════════════════════════════════════════════
   AideView — écran d'aide / support.
   ─────────────────────────────────────────────────────────────────────────
   Contenu statique pour éviter toute dépendance réseau :
    · 5 FAQ collapsibles (via <details>/<summary> natif, a11y gratuit)
    · CTA "Contact via WhatsApp" si numéro configuré (Plus → Réglages)
   ═════════════════════════════════════════════════════════════════════════ */

interface FaqEntry {
  question: string;
  answer: string;
}

const FAQ: ReadonlyArray<FaqEntry> = [
  {
    question: 'Comment enregistrer une saillie ?',
    answer:
      "Depuis l'Accueil, touchez « Saillie ». Sélectionnez la truie puis le verrat. Validez.",
  },
  {
    question: "Pourquoi « Hors ligne » s'affiche ?",
    answer:
      "L'app tourne sans réseau. Vos saisies sont stockées et envoyées dès que le 4G/Wi-Fi revient.",
  },
  {
    question: 'Comment forcer la synchronisation ?',
    answer:
      'Plus → Forcer Pull. Cela rapatrie les dernières données de Google Sheets.',
  },
  {
    question: 'Mes données sont-elles sauvegardées ?',
    answer:
      'Oui : dans Google Sheets dès qu\'il y a réseau. En local, les saisies en attente sont conservées.',
  },
  {
    question: 'Batterie faible pendant le tour ?',
    answer:
      "Activez le mode économie d'énergie d'Android. L'app fonctionne sans notifications, vous pouvez saisir normalement.",
  },
];

const SUPPORT_MESSAGE =
  "Bonjour, j'ai besoin d'aide avec PorcTrack.";

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
          <AgritechHeader title="AIDE" subtitle="Support · FAQ" />

          <div className="px-4 pt-4 pb-8 space-y-5">
            {/* ── Intro ─────────────────────────────────────────────────── */}
            <section aria-label="Introduction" className="card-dense flex items-start gap-3">
              <span
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-bg-2 text-accent"
                aria-hidden="true"
              >
                <HelpCircle size={18} />
              </span>
              <p className="text-[13px] text-text-1 leading-relaxed">
                Questions fréquentes pour utiliser PorcTrack sur le terrain.
                Touchez une question pour voir la réponse.
              </p>
            </section>

            {/* ── FAQ ───────────────────────────────────────────────────── */}
            <section aria-label="Foire aux questions">
              <SectionDivider label="Questions fréquentes" />
              <ul className="space-y-2" aria-label="FAQ">
                {FAQ.map((entry, idx) => (
                  <li key={idx}>
                    <details className="card-dense group">
                      <summary
                        className="pressable cursor-pointer list-none flex items-center justify-between gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-md"
                      >
                        <span className="text-[13px] font-semibold text-text-0">
                          {entry.question}
                        </span>
                        <span
                          className="font-mono text-[18px] text-text-2 group-open:rotate-45 transition-transform duration-150"
                          aria-hidden="true"
                        >
                          +
                        </span>
                      </summary>
                      <p className="mt-3 text-[13px] text-text-1 leading-relaxed">
                        {entry.answer}
                      </p>
                    </details>
                  </li>
                ))}
              </ul>
            </section>

            {/* ── Contact support ───────────────────────────────────────── */}
            <section aria-label="Contact support">
              <SectionDivider label="Contacter le support" />
              {supportUrl ? (
                <button
                  type="button"
                  onClick={openWhatsapp}
                  className="pressable w-full h-12 rounded-md bg-[#25D366] text-white text-[13px] font-semibold uppercase tracking-wide flex items-center justify-center gap-2 active:scale-[0.97] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  aria-label={`Contacter le support via WhatsApp au ${supportNumber}`}
                >
                  <MessageCircle size={15} aria-hidden="true" />
                  Contacter via WhatsApp
                </button>
              ) : (
                <div className="card-dense">
                  <p className="text-[13px] text-text-1 leading-relaxed">
                    Contact non configuré. Demandez à votre gérant de renseigner
                    le numéro WhatsApp dans <span className="font-semibold text-text-0">Plus → Réglages → Contact support</span>.
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
