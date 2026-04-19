import React from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AgritechLayout from '../../components/AgritechLayout';

export interface ComingSoonProps {
  /** Titre affiché dans l'en-tête (ex: "Calendrier Repro"). */
  title: string;
  /** Sous-titre optionnel sous le titre (ex: "Reproduction · saillies"). */
  subtitle?: string;
  /** Route cible du bouton retour. Défaut: "/". */
  backTo?: string;
}

/**
 * ComingSoon — placeholder dark cockpit pour les routes non encore implémentées.
 *
 * Cohérent avec le design Agritech (bg-bg-0, text-text-0, tokens monos,
 * `.agritech-heading`). Remplit proprement les HubTiles qui pointent vers
 * des sprints ultérieurs (Perf, Finances, Cycles repro/maternité, etc.).
 */
const ComingSoon: React.FC<ComingSoonProps> = ({ title, subtitle, backTo = '/' }) => {
  const navigate = useNavigate();

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          {/* ── Header aligné sur le Cockpit ────────────────────────────── */}
          <header
            className="px-4 pt-4 pb-3 bg-bg-0 border-b border-border"
            role="banner"
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <h1 className="agritech-heading text-[24px] leading-none uppercase truncate">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-1 font-mono text-[12px] text-text-2 leading-none truncate">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>
          </header>

          {/* ── Zone principale centrée ─────────────────────────────────── */}
          <div
            className="flex flex-col items-center justify-center text-center px-6 gap-4"
            style={{ minHeight: 'calc(100dvh - 180px)' }}
          >
            <Construction
              size={48}
              strokeWidth={1.6}
              className="text-text-2"
              aria-hidden="true"
            />
            <div className="flex flex-col gap-1">
              <p className="agritech-heading text-[18px] uppercase text-text-0">
                Module en cours de construction
              </p>
              <p className="font-mono text-[12px] text-text-2 max-w-xs">
                Disponible prochainement dans Sprint 2/3
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(backTo)}
              className="pressable mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-bg-1 px-4 py-2.5 text-[13px] font-semibold text-text-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              aria-label="Retour"
            >
              <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
              Retour
            </button>
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default ComingSoon;
