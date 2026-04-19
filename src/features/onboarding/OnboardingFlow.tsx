import React, { useState } from 'react';
import { CheckCircle2, ChevronRight, User, Briefcase, Phone } from 'lucide-react';
import { kvSet } from '../../services/kvStore';
import { setSupportWhatsapp } from '../../services/supportContact';
import { FARM_CONFIG } from '../../config/farm';

/* ═════════════════════════════════════════════════════════════════════════
   OnboardingFlow — premier lancement (5 étapes plein-écran skippables)
   ─────────────────────────────────────────────────────────────────────────
   Collecte minimale et bienveillante : nom, rôle, téléphone.
   Chaque étape peut être passée. En sortie → `kvSet('onboarding_done','1')`
   et `onComplete()` pour unmount le wrapper dans `App.tsx`.

   Accessibility :
    - `role="dialog"` + `aria-modal="true"` sur la racine
    - `aria-label` explicites + focus-visible outlines
    - progression accessible via `aria-valuenow`
   ═════════════════════════════════════════════════════════════════════════ */

export interface OnboardingFlowProps {
  onComplete: () => void;
}

type Role = 'PORCHER' | 'ASSISTANT' | 'GERANT' | 'AUTRE';
type StepIndex = 0 | 1 | 2 | 3 | 4;

const TOTAL_STEPS = 5;

const ROLES: ReadonlyArray<{ key: Role; label: string }> = [
  { key: 'PORCHER', label: 'Porcher' },
  { key: 'ASSISTANT', label: 'Assistant' },
  { key: 'GERANT', label: 'Gérant' },
  { key: 'AUTRE', label: 'Autre' },
];

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<StepIndex>(0);
  const [userName, setUserName] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [phone, setPhone] = useState('');

  const next = (): void => {
    setStep((prev) => (prev < 4 ? ((prev + 1) as StepIndex) : prev));
  };

  const finish = (): void => {
    // Persistance finale : valeur non vide ou rôle par défaut si non choisi.
    if (userName.trim()) void kvSet('user_name', userName.trim());
    void kvSet('user_role', role ?? 'PORCHER');
    if (phone.trim()) {
      void kvSet('user_phone', phone.trim());
      // Convenient default: if the operator entered their own phone, seed
      // support to the same number so the "Aide" screen is usable immediately.
      // Admin can override later in Réglages.
      setSupportWhatsapp(phone.trim());
    }
    void kvSet('onboarding_done', '1');
    onComplete();
  };

  // Handle skip per step (writes the minimal amount required).
  const skip = (): void => {
    if (step === 2 && role === null) {
      setRole('PORCHER');
    }
    next();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenue dans PorcTrack"
      className="min-h-[100dvh] w-full flex flex-col bg-bg-0 text-text-0"
    >
      {/* ── Progression (4 dots visibles sur les étapes 1→4) ──────────── */}
      <div
        className="pt-6 px-5 flex items-center justify-center gap-2"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={step + 1}
        aria-label="Progression"
      >
        {Array.from({ length: TOTAL_STEPS }).map((_, idx) => {
          const active = idx <= step;
          return (
            <span
              key={idx}
              className={
                'h-1.5 rounded-full transition-[width,background-color] ' +
                (active ? 'w-6 bg-accent' : 'w-3 bg-bg-2')
              }
              aria-hidden="true"
            />
          );
        })}
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 pt-10 pb-6 flex flex-col">
        {step === 0 && <StepWelcome onStart={next} />}
        {step === 1 && (
          <StepName
            value={userName}
            onChange={setUserName}
            onSkip={skip}
            onContinue={next}
          />
        )}
        {step === 2 && (
          <StepRole
            value={role}
            onChange={setRole}
            onSkip={skip}
            onContinue={next}
          />
        )}
        {step === 3 && (
          <StepPhone
            value={phone}
            onChange={setPhone}
            onSkip={skip}
            onContinue={next}
          />
        )}
        {step === 4 && <StepDone onEnter={finish} />}
      </div>
    </div>
  );
};

/* ─── Sub-steps ────────────────────────────────────────────────────────── */

interface StepWelcomeProps {
  onStart: () => void;
}

const StepWelcome: React.FC<StepWelcomeProps> = ({ onStart }) => (
  <div className="flex-1 flex flex-col justify-between">
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <img
        src="/images/icon.svg"
        alt="PorcTrack"
        className="w-20 h-20 rounded-2xl mb-6"
      />
      <h1
        className="agritech-heading uppercase leading-none text-[28px] mb-3"
        style={{ letterSpacing: '0.02em' }}
      >
        Bienvenue
      </h1>
      <p className="text-[14px] text-text-1 max-w-sm leading-relaxed">
        Suivi troupeau de la <span className="font-semibold text-text-0">{FARM_CONFIG.FARM_NAME}</span>.
        Quelques questions pour configurer votre app — vous pouvez passer à tout moment.
      </p>
    </div>
    <div className="pt-4">
      <PrimaryButton onClick={onStart} label="Commencer" icon={<ChevronRight size={16} aria-hidden="true" />} />
    </div>
  </div>
);

interface StepNameProps {
  value: string;
  onChange: (v: string) => void;
  onSkip: () => void;
  onContinue: () => void;
}

const StepName: React.FC<StepNameProps> = ({ value, onChange, onSkip, onContinue }) => (
  <div className="flex-1 flex flex-col">
    <StepHeader
      icon={<User size={20} aria-hidden="true" />}
      title="Votre nom"
      subtitle="Pour tracer qui fait quoi. Laisse vide si tu préfères rester anonyme."
    />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Ex: Jean Martin"
      aria-label="Votre nom"
      className="w-full h-12 px-4 rounded-md bg-bg-1 border border-border text-text-0 placeholder-text-2 text-[15px] outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
    />
    <div className="flex-1" />
    <StepActions onSkip={onSkip} onContinue={onContinue} canContinue={true} />
  </div>
);

interface StepRoleProps {
  value: Role | null;
  onChange: (v: Role) => void;
  onSkip: () => void;
  onContinue: () => void;
}

const StepRole: React.FC<StepRoleProps> = ({ value, onChange, onSkip, onContinue }) => (
  <div className="flex-1 flex flex-col">
    <StepHeader
      icon={<Briefcase size={20} aria-hidden="true" />}
      title="Votre rôle"
      subtitle="Aide l'app à vous montrer les bonnes actions."
    />
    <div
      role="radiogroup"
      aria-label="Choix du rôle"
      className="grid grid-cols-2 gap-2"
    >
      {ROLES.map(({ key, label }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(key)}
            className={
              'pressable h-12 rounded-md font-mono text-[12px] uppercase tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ' +
              (active
                ? 'bg-accent text-bg-0'
                : 'bg-bg-1 border border-border text-text-1 hover:bg-bg-2')
            }
          >
            {label}
          </button>
        );
      })}
    </div>
    <div className="flex-1" />
    <StepActions onSkip={onSkip} onContinue={onContinue} canContinue={value !== null} />
  </div>
);

interface StepPhoneProps {
  value: string;
  onChange: (v: string) => void;
  onSkip: () => void;
  onContinue: () => void;
}

const StepPhone: React.FC<StepPhoneProps> = ({ value, onChange, onSkip, onContinue }) => (
  <div className="flex-1 flex flex-col">
    <StepHeader
      icon={<Phone size={20} aria-hidden="true" />}
      title="Votre numéro WhatsApp (optionnel)"
      subtitle="Pour être joint en cas d'urgence. Format international."
    />
    <input
      type="tel"
      inputMode="tel"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="+225 07 XX XX XX XX"
      aria-label="Votre numéro WhatsApp"
      className="w-full h-12 px-4 rounded-md bg-bg-1 border border-border text-text-0 placeholder-text-2 font-mono text-[14px] outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
    />
    <div className="flex-1" />
    <StepActions onSkip={onSkip} onContinue={onContinue} canContinue={true} />
  </div>
);

interface StepDoneProps {
  onEnter: () => void;
}

const StepDone: React.FC<StepDoneProps> = ({ onEnter }) => (
  <div className="flex-1 flex flex-col justify-between">
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <CheckCircle2 size={64} className="text-accent mb-5" aria-hidden="true" />
      <h1
        className="agritech-heading uppercase leading-none text-[28px] mb-3"
        style={{ letterSpacing: '0.02em' }}
      >
        Prêt !
      </h1>
      <p className="text-[14px] text-text-1 max-w-sm leading-relaxed">
        Vous pouvez commencer. Les paramètres sont dans <span className="font-semibold text-text-0">Plus → Réglages</span>.
      </p>
    </div>
    <div className="pt-4">
      <PrimaryButton onClick={onEnter} label="Entrer dans l'app" icon={<ChevronRight size={16} aria-hidden="true" />} />
    </div>
  </div>
);

/* ─── Atoms locaux ─────────────────────────────────────────────────────── */

interface StepHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

const StepHeader: React.FC<StepHeaderProps> = ({ icon, title, subtitle }) => (
  <div className="mb-6">
    <span
      className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-bg-2 text-accent mb-4"
      aria-hidden="true"
    >
      {icon}
    </span>
    <h2
      className="agritech-heading uppercase leading-none text-[24px] mb-2"
      style={{ letterSpacing: '0.02em' }}
    >
      {title}
    </h2>
    <p className="text-[13px] text-text-2 leading-relaxed">{subtitle}</p>
  </div>
);

interface StepActionsProps {
  onSkip: () => void;
  onContinue: () => void;
  canContinue: boolean;
}

const StepActions: React.FC<StepActionsProps> = ({ onSkip, onContinue, canContinue }) => (
  <div className="pt-6 grid grid-cols-[auto_1fr] gap-3">
    <button
      type="button"
      onClick={onSkip}
      className="pressable h-12 px-5 rounded-md bg-bg-1 border border-border text-text-1 text-[12px] font-semibold uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
    >
      Passer
    </button>
    <button
      type="button"
      onClick={onContinue}
      disabled={!canContinue}
      className="pressable h-12 px-5 rounded-md bg-accent text-bg-0 text-[13px] font-semibold uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
    >
      Continuer
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  </div>
);

interface PrimaryButtonProps {
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({ onClick, label, icon }) => (
  <button
    type="button"
    onClick={onClick}
    className="pressable w-full h-13 px-5 rounded-md bg-accent text-bg-0 text-[13px] font-semibold uppercase tracking-wide flex items-center justify-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
    style={{ height: 52 }}
  >
    {label}
    {icon}
  </button>
);

export default OnboardingFlow;
