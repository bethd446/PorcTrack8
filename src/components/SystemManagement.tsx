import React, { useState } from 'react';
import {
  IonContent, IonPage, IonSpinner, IonToast, IonAlert, IonToggle
} from '@ionic/react';
import {
  RefreshCw, Cloud, Shield, BookOpen, AlertTriangle,
  Save, Trash2, Bug
} from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { getTablesIndex } from '../services/googleSheets';
import AgritechLayout from './AgritechLayout';
import AgritechHeader from './AgritechHeader';
import { HubTile, SectionDivider, Chip } from './agritech';
import { useTheme } from '../context/ThemeContext';
import type { ThemeMode } from '../services/themeAuto';
import { useNavigate } from 'react-router-dom';
import { isDebugEnabled, setDebugEnabled, APP_VERSION } from '../config';
import { getQueueStatus } from '../services/offlineQueue';
import { kvGet, kvSet, kvClear } from '../services/kvStore';

export const SettingsPage: React.FC = () => {
  const { syncStatus, pullData, processQueue } = useFarm();
  const navigate = useNavigate();

  const defaultUrl = (import.meta.env.VITE_GAS_URL as string | undefined) || '';
  const defaultToken = (import.meta.env.VITE_GAS_TOKEN as string | undefined) || '';

  const [url, setUrl] = useState(kvGet('gas_url') || defaultUrl);
  const [token, setToken] = useState(kvGet('gas_token') || defaultToken);
  const [userName, setUserName] = useState(kvGet('user_name') || '');
  const [showToast, setShowToast] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [debug, setDebug] = useState(isDebugEnabled());
  const { mode: themeMode, resolved: themeResolved, setMode: setThemeMode } = useTheme();

  const pendingCount = getQueueStatus().pending;

  const handleSaveAndTest = async (): Promise<void> => {
    await Promise.all([
      kvSet('gas_url', url),
      kvSet('gas_token', token),
      kvSet('user_name', userName),
    ]);

    setTestStatus('testing');
    try {
      const res = await getTablesIndex();
      if (res.success) {
        setTestStatus('success');
        setTestMessage(`Connecté : ${res.values.length} tables actives`);
        setShowToast(true);
        pullData();
      } else {
        setTestStatus('error');
        setTestMessage(res.message || 'Erreur de connexion');
      }
    } catch (e) {
      setTestStatus('error');
      setTestMessage(String(e));
    }
  };

  const handleReset = async (): Promise<void> => {
    await kvClear();
    window.location.href = '/';
  };

  const toggleDebug = (val: boolean): void => {
    setDebug(val);
    setDebugEnabled(val);
  };

  const userRole = kvGet('user_role') || 'PORCHER';
  const isSynced = syncStatus === 'synced';
  const needsName = userRole === 'PORCHER' && !userName;

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
            {/* ── Flux & Synchronisation ─────────────────────────────── */}
            <section aria-label="Flux & synchronisation" role="region">
              <SectionDivider label="Flux & synchronisation" />
              <div className="card-dense">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={
                        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-bg-2 ' +
                        (isSynced ? 'text-accent' : 'text-amber')
                      }
                      aria-hidden="true"
                    >
                      {isSynced ? (
                        <Cloud size={18} />
                      ) : (
                        <RefreshCw size={18} className="animate-spin" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-text-0 truncate">
                        {isSynced ? 'Système à jour' : 'Synchronisation...'}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-text-2 truncate">
                        {pendingCount} action(s) en attente
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => processQueue()}
                    aria-label="Traiter la file"
                    className="pressable inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-2 text-text-1 active:scale-[0.96] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    <RefreshCw size={15} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/sync')}
                    className="pressable inline-flex items-center justify-center h-10 rounded-md border border-border bg-bg-1 text-text-0 text-[12px] font-semibold active:scale-[0.97] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                  >
                    Détails file
                  </button>
                  <button
                    type="button"
                    onClick={() => pullData()}
                    aria-label="Rafraîchir les données"
                    className="pressable inline-flex items-center justify-center gap-2 h-10 rounded-md bg-accent text-bg-0 text-[12px] font-semibold active:scale-[0.97] transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 hover:bg-[color:var(--color-accent-dim)]"
                  >
                    <RefreshCw size={13} aria-hidden="true" />
                    Forcer pull
                  </button>
                </div>
              </div>
            </section>

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

            {/* ── Paramètres système ──────────────────────────────────── */}
            <section aria-label="Paramètres système" role="region">
              <SectionDivider label="Paramètres" />

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
                    onChange={e => setUserName(e.target.value)}
                    placeholder="Ex: Jean Martin"
                    className="w-full h-11 px-3 rounded-md bg-bg-1 border border-border text-text-0 placeholder-text-2 text-[14px] outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  />
                  {needsName ? (
                    <p className="mt-2 font-mono text-[11px] text-red">
                      Nom requis pour traçabilité
                    </p>
                  ) : null}
                </div>

                {/* GAS URL */}
                <div className="px-4 py-4 border-b border-border">
                  <label
                    htmlFor="settings-gas-url"
                    className="kpi-label block mb-2"
                  >
                    GAS API URL
                  </label>
                  <input
                    id="settings-gas-url"
                    type="text"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://script.google.com/..."
                    className="w-full h-11 px-3 rounded-md bg-bg-1 border border-border text-text-0 placeholder-text-2 font-mono text-[12px] outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  />
                </div>

                {/* Token */}
                <div className="px-4 py-4 border-b border-border">
                  <label
                    htmlFor="settings-token"
                    className="kpi-label block mb-2"
                  >
                    Token d'accès
                  </label>
                  <input
                    id="settings-token"
                    type="text"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="Bearer…"
                    className="w-full h-11 px-3 rounded-md bg-bg-1 border border-border text-text-0 placeholder-text-2 font-mono text-[12px] outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  />
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
                        {userRole === 'PORCHER' ? 'Opérateur terrain' : 'Administrateur'}
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
                      aria-selected={userRole === 'PORCHER'}
                      onClick={() => {
                        void kvSet('user_role', 'PORCHER').then(() =>
                          window.location.reload()
                        );
                      }}
                      className={
                        'pressable px-3 py-1.5 rounded text-[11px] font-semibold uppercase tracking-wide transition-colors duration-150 ' +
                        (userRole === 'PORCHER'
                          ? 'bg-accent text-bg-0'
                          : 'text-text-2 hover:text-text-1')
                      }
                    >
                      Terrain
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={userRole === 'ADMIN'}
                      onClick={() => {
                        void kvSet('user_role', 'ADMIN').then(() =>
                          window.location.reload()
                        );
                      }}
                      className={
                        'pressable px-3 py-1.5 rounded text-[11px] font-semibold uppercase tracking-wide transition-colors duration-150 ' +
                        (userRole === 'ADMIN'
                          ? 'bg-accent text-bg-0'
                          : 'text-text-2 hover:text-text-1')
                      }
                    >
                      Admin
                    </button>
                  </div>
                </div>
              </div>

              {/* Save button */}
              <button
                type="button"
                onClick={handleSaveAndTest}
                disabled={testStatus === 'testing'}
                className="pressable mt-4 w-full h-12 rounded-md bg-accent text-bg-0 text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-40 transition-[transform,opacity] duration-150 hover:bg-[color:var(--color-accent-dim)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                {testStatus === 'testing' ? (
                  <IonSpinner name="bubbles" className="w-5 h-5" />
                ) : (
                  <>
                    <Save size={15} aria-hidden="true" />
                    Enregistrer & vérifier
                  </>
                )}
              </button>

              {/* Reset */}
              <button
                type="button"
                onClick={() => setShowAlert(true)}
                className="pressable mt-3 w-full h-11 rounded-md border border-dashed border-red/40 bg-transparent text-red text-[12px] font-semibold flex items-center justify-center gap-2 active:opacity-70 transition-opacity duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red focus-visible:outline-offset-2"
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

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={testMessage}
          duration={3000}
          position="top"
        />
        <IonAlert
          isOpen={showAlert}
          onDidDismiss={() => setShowAlert(false)}
          header="Réinitialisation"
          message="Effacer toutes les données locales et se déconnecter ?"
          buttons={[
            { text: 'Annuler', role: 'cancel' },
            {
              text: 'Réinitialiser',
              cssClass: 'text-red-500',
              handler: handleReset,
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default SettingsPage;
