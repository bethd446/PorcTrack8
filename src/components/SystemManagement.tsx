import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonContent, IonPage, IonAlert, IonToggle,
} from '@ionic/react';
import { Trash2, Bug, Phone, LogOut } from 'lucide-react';
import AgritechLayout from './AgritechLayout';
import Eyebrow from './design/Eyebrow';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import type { ThemeMode } from '../services/themeAuto';
import { isDebugEnabled, setDebugEnabled, APP_VERSION } from '../config';
import { kvGet, kvSet, kvClear } from '../services/kvStore';
import { supabase } from '../services/supabaseClient';
import { getSupportWhatsapp, setSupportWhatsapp } from '../services/supportContact';

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  borderRadius: 'var(--radius-card, 12px)',
  border: '1px solid var(--line)',
  padding: 22,
};

const inputBaseClass =
  'w-full h-11 px-3 rounded-md bg-bg-1 border border-border text-text-0 placeholder-text-2 text-[14px] outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors';

const primaryBtnClass =
  'pressable mt-3 h-10 px-4 rounded-md bg-accent text-bg-0 text-[12px] font-semibold uppercase tracking-wide active:scale-[0.97] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

const ghostBtnClass =
  'pressable h-10 px-4 rounded-md border border-border bg-transparent text-text-1 text-[12px] font-semibold uppercase tracking-wide hover:bg-bg-2 active:scale-[0.97] transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 inline-flex items-center gap-2';

const labelClass = 'kpi-label block mb-2';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { role: userRole, setRole, signOut, userName: authUserName } = useAuth();

  const [userName, setUserName] = useState(kvGet('user_name') || authUserName || '');
  const [showAlert, setShowAlert] = useState(false);
  const [debug, setDebug] = useState(isDebugEnabled());
  const [whatsapp, setWhatsapp] = useState<string>(getSupportWhatsapp());
  const [whatsappSaved, setWhatsappSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const {
    mode: themeMode,
    resolved: themeResolved,
    setMode: setThemeMode,
  } = useTheme();

  const handleSaveProfile = async (): Promise<void> => {
    await kvSet('user_name', userName);
    setProfileSaved(true);
    setProfileDirty(false);
  };

  const handleReset = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore — on doit tout de même purger le store local
    }
    await kvClear();
    window.location.href = '/';
  };

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut();
    } finally {
      window.location.href = '/';
    }
  };

  const toggleDebug = (val: boolean): void => {
    setDebug(val);
    setDebugEnabled(val);
  };

  const needsName = userRole === 'WORKER' && !userName;
  const displayName = (userName || '').trim() || 'Opérateur';
  const roleLabel = userRole === 'OWNER' ? 'Propriétaire' : 'Ouvrier';

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout withNav={true}>
          <div
            className="px-4 pt-5 pb-32 flex flex-col gap-5"
            style={{ maxWidth: 1100, margin: '0 auto' }}
          >
            <header>
              <Eyebrow dotColor="accent">Plus · Paramètres</Eyebrow>
              <h1
                style={{
                  fontFamily: 'var(--font-display, BigShoulders), system-ui, sans-serif',
                  fontSize: 34,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  margin: '8px 0 4px',
                }}
              >
                Réglages
              </h1>
              <div
                style={{
                  fontFamily: 'InstrumentSans, system-ui, sans-serif',
                  fontSize: 13,
                  color: 'var(--muted)',
                }}
              >
                Profil, préférences et compte
              </div>
            </header>

            {/* ── Profil ───────────────────────────────────────────────── */}
            <section aria-label="Profil" role="region">
              <Eyebrow dotColor="accent">Profil</Eyebrow>
              <div style={{ ...cardStyle, marginTop: 12 }}>
                <h2
                  style={{
                    fontFamily: 'var(--font-display, BigShoulders), system-ui, sans-serif',
                    fontSize: 26,
                    fontWeight: 700,
                    lineHeight: 1.05,
                    letterSpacing: '-0.015em',
                    color: 'var(--ink)',
                    margin: 0,
                  }}
                >
                  {displayName}
                </h2>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 8,
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'var(--bg-surface-2, var(--color-bg-2))',
                    border: '1px solid var(--line)',
                    fontFamily: 'DMMono, ui-monospace, monospace',
                    fontSize: 10,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-soft, var(--muted))',
                  }}
                >
                  {roleLabel}
                </div>

                <div className="mt-5">
                  <label htmlFor="settings-operator" className={labelClass}>
                    Nom de l&rsquo;opérateur
                  </label>
                  <input
                    id="settings-operator"
                    type="text"
                    value={userName}
                    onChange={(e) => {
                      setUserName(e.target.value);
                      setProfileSaved(false);
                      setProfileDirty(true);
                    }}
                    placeholder="Ex: Jean Martin"
                    className={inputBaseClass}
                  />
                  {needsName ? (
                    <p className="mt-2 font-mono text-[11px] text-red">
                      Nom requis pour traçabilité
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className={ghostBtnClass}
                  >
                    <LogOut size={13} aria-hidden="true" />
                    Se déconnecter
                  </button>
                  {profileDirty ? (
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className={primaryBtnClass + ' !mt-0'}
                    >
                      Enregistrer
                    </button>
                  ) : null}
                  {profileSaved ? (
                    <span
                      role="status"
                      aria-live="polite"
                      className="font-mono text-[11px] text-accent uppercase tracking-wide"
                    >
                      Enregistré
                    </span>
                  ) : null}
                </div>
              </div>
            </section>

            {/* ── Apparence ────────────────────────────────────────────── */}
            <section aria-label="Apparence" role="region">
              <Eyebrow dotColor="amber">Apparence</Eyebrow>
              <div style={{ ...cardStyle, marginTop: 12 }}>
                <p className="kpi-label mb-3">
                  Thème · actif : {themeResolved === 'day' ? 'Jour' : 'Nuit'}
                </p>
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
                <p className="text-[11px] text-text-2 mt-3">
                  Auto : jour 6h-19h, nuit sinon.
                </p>
              </div>
            </section>

            {/* ── Support & contact ────────────────────────────────────── */}
            <section aria-label="Support & contact" role="region">
              <Eyebrow dotColor="accent">Support & contact</Eyebrow>
              <div style={{ ...cardStyle, marginTop: 12 }}>
                <label htmlFor="settings-support-wa" className={labelClass}>
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
                  Utilisé dans l&rsquo;écran <span className="font-semibold text-text-1">Aide</span>. Format E.164 international.
                </p>
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setSupportWhatsapp(whatsapp);
                      setWhatsappSaved(true);
                    }}
                    className={primaryBtnClass + ' !mt-0'}
                  >
                    Enregistrer
                  </button>
                  {whatsappSaved ? (
                    <span
                      role="status"
                      aria-live="polite"
                      className="font-mono text-[11px] text-accent uppercase tracking-wide"
                    >
                      Enregistré
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => navigate('/aide')}
                    className="ml-auto pressable h-10 px-3 rounded-md text-accent text-[12px] font-semibold uppercase tracking-wide hover:bg-bg-2 transition-colors"
                  >
                    Aide & FAQ →
                  </button>
                </div>
              </div>
            </section>

            {/* ── Avancé ───────────────────────────────────────────────── */}
            <section aria-label="Avancé" role="region">
              <Eyebrow dotColor="pig">Avancé</Eyebrow>
              <div style={{ ...cardStyle, marginTop: 12, padding: 0 }}>
                <div className="px-5 py-4 flex items-center justify-between gap-3">
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
                    onIonChange={(e) => toggleDebug(e.detail.checked)}
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

                {debug ? (
                  <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-text-0 truncate">
                        Switch rôle
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-text-2 truncate">
                        Debug · profil actif : {roleLabel}
                      </p>
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
                        onClick={() => {
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
                        onClick={() => {
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
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setShowAlert(true)}
                className="pressable mt-3 w-full h-11 rounded-md text-[12px] font-semibold flex items-center justify-center gap-2 active:opacity-70 transition-opacity duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: 'var(--color-pig-soft, color-mix(in srgb, var(--red) 12%, var(--bg-surface)))',
                  color: 'var(--color-pig-deep, #c0392b)',
                  border: '1px dashed var(--color-pig, #f5c6c0)',
                }}
              >
                <Trash2 size={13} aria-hidden="true" />
                Réinitialiser la session
              </button>
            </section>

            {/* ── À propos ─────────────────────────────────────────────── */}
            <section aria-label="À propos" role="region">
              <Eyebrow dotColor="muted">À propos</Eyebrow>
              <div style={{ ...cardStyle, marginTop: 12 }}>
                <p
                  style={{
                    fontFamily: 'DMMono, ui-monospace, monospace',
                    fontSize: 12,
                    letterSpacing: '0.04em',
                    color: 'var(--ink-soft, var(--muted))',
                    margin: 0,
                  }}
                >
                  PorcTrack v9 · build {APP_VERSION}
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/cgu')}
                    className="pressable h-10 px-3 rounded-md text-left text-[13px] text-text-1 hover:bg-bg-2 transition-colors flex items-center justify-between"
                  >
                    <span>Conditions d&rsquo;utilisation</span>
                    <span className="text-text-2">→</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/privacy')}
                    className="pressable h-10 px-3 rounded-md text-left text-[13px] text-text-1 hover:bg-bg-2 transition-colors flex items-center justify-between"
                  >
                    <span>Confidentialité</span>
                    <span className="text-text-2">→</span>
                  </button>
                </div>
              </div>
            </section>
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
