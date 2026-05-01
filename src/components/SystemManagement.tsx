import React, { useState } from 'react';
import {
  IonContent, IonPage, IonAlert, IonToggle
} from '@ionic/react';
import {
  Shield, BookOpen, AlertTriangle,
  Trash2, Bug, Phone
} from 'lucide-react';
import AgritechLayout from './AgritechLayout';
import AgritechHeader from './AgritechHeader';
import { HubTile, SectionDivider, Chip } from './agritech';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import type { ThemeMode } from '../services/themeAuto';
import { isDebugEnabled, setDebugEnabled, APP_VERSION } from '../config';
import { kvGet, kvSet, kvClear } from '../services/kvStore';
import { getSupportWhatsapp, setSupportWhatsapp } from '../services/supportContact';

export const SettingsPage: React.FC = () => {
  const { role: userRole, setRole } = useAuth();

  const [userName, setUserName] = useState(kvGet('user_name') || '');
  const [showAlert, setShowAlert] = useState(false);
  const [debug, setDebug] = useState(isDebugEnabled());
  const [whatsapp, setWhatsapp] = useState<string>(getSupportWhatsapp());
  const [whatsappSaved, setWhatsappSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const {
    mode: themeMode,
    resolved: themeResolved,
    setMode: setThemeMode,
  } = useTheme();

  const handleSaveProfile = async (): Promise<void> => {
    await kvSet('user_name', userName);
    setProfileSaved(true);
  };

  const handleReset = async (): Promise<void> => {
    await kvClear();
    window.location.href = '/';
  };

  const toggleDebug = (val: boolean): void => {
    setDebug(val);
    setDebugEnabled(val);
  };

  const needsName = userRole === 'WORKER' && !userName;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout withNav={true}>
          <AgritechHeader
            title="Réglages"
            subtitle="Système & paramètres"
            action={
              <Chip label={`v${APP_VERSION}`} tone="default" size="xs" />
            }
          />

          <div className="px-4 pt-4 pb-8 space-y-5">
            {/* ── Audit & Protocoles (Hub tiles) ──────────────────────── */}
            <section aria-label="Audit & protocoles" role="region">
              <SectionDivider label="Audit & performance" />
              <div className="grid grid-cols-1 gap-3">
                <HubTile
                  icon={<AlertTriangle size={18} aria-hidden="true" />}
                  title="Audit"
                  subtitle="Cohérence données"
                  to="/audit"
                  tone="amber"
                />
                <HubTile
                  icon={<BookOpen size={18} aria-hidden="true" />}
                  title="Protocoles"
                  subtitle="Guide terrain"
                  to="/protocoles"
                  tone="accent"
                />
              </div>
            </section>

            {/* ── Apparence ────────────────────────────────────────────── */}
            <section aria-label="Apparence" role="region">
              <SectionDivider label="Apparence" />
              <div className="card-dense !p-0 overflow-hidden">
                <div className="px-4 py-4">
                  <p className="kpi-label mb-3">Thème · actif : {themeResolved === 'day' ? 'Jour' : 'Nuit'}</p>
                  <div
                    role="radiogroup"
                    aria-label="Choix du thème"
                    className="grid grid-cols-3 gap-2"
                  >
                    {(['auto', 'day', 'night'] as ThemeMode[]).map((m) => {
                      const active = themeMode === m;
                      const label = m === 'auto' ? 'Auto' : m === 'day' ? 'Jour' : 'Nuit';
                      return (
                        <button
                          key={m}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setThemeMode(m)}
                          className={
                            'pressable h-11 rounded-md font-mono text-[12px] uppercase tracking-wide transition-colors ' +
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
                  <p className="text-[11px] text-text-2 mt-2">
                    Auto : jour 6h-19h, nuit sinon.
                  </p>
                </div>

              </div>
            </section>

            {/* ── Contact support (WhatsApp) ─────────────────────────── */}
            <section aria-label="Contact support" role="region">
              <SectionDivider label="Contact support" />
              <div className="card-dense !p-0 overflow-hidden">
                <div className="px-4 py-4">
                  <label
                    htmlFor="settings-support-wa"
                    className="kpi-label block mb-2"
                  >
                    Numéro WhatsApp
                  </label>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-bg-2 text-accent"
                      aria-hidden="true"
                    >
                      <Phone size={16} />
                    </span>
                    <input
                      id="settings-support-wa"
                      type="tel"
                      inputMode="tel"
                      value={whatsapp}
                      onChange={(e) => {
                        setWhatsapp(e.target.value);
                        setWhatsappSaved(false);
                      }}
                      placeholder="+225 07 XX XX XX XX"
                      className="flex-1 h-11 px-3 rounded-md bg-bg-1 border border-border text-text-0 placeholder-text-2 font-mono text-[13px] outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-text-2 mt-2">
                    Utilisé dans l'écran <span className="font-semibold text-text-1">Aide</span> pour joindre le support. Format international.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSupportWhatsapp(whatsapp);
                      setWhatsappSaved(true);
                    }}
                    className="pressable mt-3 h-10 px-4 rounded-md bg-accent text-bg-0 text-[12px] font-semibold uppercase tracking-wide active:scale-[0.97] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    Enregistrer
                  </button>
                  {whatsappSaved ? (
                    <span
                      role="status"
                      aria-live="polite"
                      className="ml-3 font-mono text-[11px] text-accent uppercase tracking-wide"
                    >
                      Enregistré
                    </span>
                  ) : null}
                </div>
              </div>
            </section>

            {/* ── Profil utilisateur ──────────────────────────────────── */}
            <section aria-label="Profil utilisateur" role="region">
              <SectionDivider label="Profil" />

              <div className="card-dense !p-0 overflow-hidden">
                {/* Nom opérateur */}
                <div className="px-4 py-4 border-b border-border">
                  <label
                    htmlFor="settings-operator"
                    className="kpi-label block mb-2"
                  >
                    Nom de l'opérateur
                  </label>
                  <input
                    id="settings-operator"
                    type="text"
                    value={userName}
                    onChange={e => {
                      setUserName(e.target.value);
                      setProfileSaved(false);
                    }}
                    placeholder="Ex: Jean Martin"
                    className="w-full h-11 px-3 rounded-md bg-bg-1 border border-border text-text-0 placeholder-text-2 text-[14px] outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  />
                  {needsName ? (
                    <p className="mt-2 font-mono text-[11px] text-red">
                      Nom requis pour traçabilité
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="pressable mt-3 h-10 px-4 rounded-md bg-accent text-bg-0 text-[12px] font-semibold uppercase tracking-wide active:scale-[0.97] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    Enregistrer
                  </button>
                  {profileSaved ? (
                    <span
                      role="status"
                      aria-live="polite"
                      className="ml-3 font-mono text-[11px] text-accent uppercase tracking-wide"
                    >
                      Enregistré
                    </span>
                  ) : null}
                </div>

                {/* Debug toggle */}
                <div className="px-4 py-4 border-b border-border flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={
                        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-2 ' +
                        (debug ? 'text-amber' : 'text-text-2')
                      }
                      aria-hidden="true"
                    >
                      <Bug size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-text-0 truncate">
                        Mode développeur
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-text-2 truncate">
                        Traces & logs détaillés
                      </p>
                    </div>
                  </div>
                  <IonToggle
                    checked={debug}
                    onIonChange={e => toggleDebug(e.detail.checked)}
                    aria-label="Mode développeur"
                    style={
                      {
                        '--track-background': 'var(--color-bg-2)',
                        '--track-background-checked': 'var(--color-accent)',
                        '--handle-background': 'var(--color-text-0)',
                        '--handle-background-checked': 'var(--color-bg-0)',
                      } as React.CSSProperties
                    }
                  />
                </div>

                {/* Profil */}
                <div className="px-4 py-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-2 text-accent"
                      aria-hidden="true"
                    >
                      <Shield size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-text-0 truncate">
                        Profil
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-text-2 truncate">
                        {userRole === 'OWNER' ? 'Propriétaire' : 'Ouvrier'}
                      </p>
                    </div>
                  </div>
                  <div
                    className="flex rounded-md border border-border bg-bg-1 p-0.5"
                    role="tablist"
                    aria-label="Profil"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={userRole === 'WORKER'}
                      onClick={async () => {
                        setRole('WORKER');
                        setTimeout(() => window.location.reload(), 100);
                      }}
                      className={
                        'pressable px-3 py-1.5 rounded text-[11px] font-semibold uppercase tracking-wide transition-colors duration-150 ' +
                        (userRole === 'WORKER'
                          ? 'bg-accent text-bg-0'
                          : 'text-text-2 hover:text-text-1')
                      }
                    >
                      Ouvrier
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={userRole === 'OWNER'}
                      onClick={async () => {
                        setRole('OWNER');
                        setTimeout(() => window.location.reload(), 100);
                      }}
                      className={
                        'pressable px-3 py-1.5 rounded text-[11px] font-semibold uppercase tracking-wide transition-colors duration-150 ' +
                        (userRole === 'OWNER'
                          ? 'bg-accent text-bg-0'
                          : 'text-text-2 hover:text-text-1')
                      }
                    >
                      Propriétaire
                    </button>
                  </div>
                </div>
              </div>

              {/* Reset */}
              <button
                type="button"
                onClick={() => setShowAlert(true)}
                className="pressable mt-4 w-full h-11 rounded-md border border-dashed border-red/40 bg-transparent text-red text-[12px] font-semibold flex items-center justify-center gap-2 active:opacity-70 transition-opacity duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red focus-visible:outline-offset-2"
              >
                <Trash2 size={13} aria-hidden="true" />
                Réinitialiser la session
              </button>
            </section>

            {/* Footer */}
            <div className="text-center pt-2">
              <p className="font-mono text-[11px] text-text-2">
                PorcTrack · Infrastructure
              </p>
            </div>
          </div>
        </AgritechLayout>

        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Réinitialisation"
          message="Effacer toutes les données locales et se déconnecter ?"
          buttons={[
            { text: 'Annuler', role: 'cancel' },
            {
              text: 'Réinitialiser',
              cssClass: 'text-[var(--color-danger,#EF4444)]',
              handler: handleReset,
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default SettingsPage;
