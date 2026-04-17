import React, { useState } from 'react';
import {
  IonContent, IonHeader, IonSpinner, IonPage, IonToast, IonAlert, IonToggle, IonLabel
} from '@ionic/react';
import {
  RefreshCw, CloudOff, Cloud, Shield, BookOpen, AlertTriangle,
  Settings, ChevronRight, Save, Trash2, Bug, User, Wifi
} from 'lucide-react';
import { useFarm } from '../context/FarmContext';
import { getTablesIndex } from '../services/googleSheets';
import PremiumHeader from './PremiumHeader';
import { useNavigate } from 'react-router-dom';
import { isDebugEnabled, setDebugEnabled, APP_VERSION } from '../config';
import { getQueueStatus } from '../services/offlineQueue';
import { PremiumButton, PremiumInput, PremiumCard, SectionHeader } from './PremiumUI';

export const SettingsPage: React.FC = () => {
  const { syncStatus, pullData, processQueue } = useFarm();
  const navigate = useNavigate();

  const defaultUrl = "https://script.google.com/macros/s/AKfycbzLNf0EpNRXK17LYuIHjHVTKlvbbZ0gtZHQah73ZCZM5HIC91qKCyAe-PF5PntqF1cnwg/exec";
  const defaultToken = "PORC800_WRITE_2026";

  const [url, setUrl] = useState(localStorage.getItem('gas_url') || defaultUrl);
  const [token, setToken] = useState(localStorage.getItem('gas_token') || defaultToken);
  const [userName, setUserName] = useState(localStorage.getItem('user_name') || '');
  const [showToast, setShowToast] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [debug, setDebug] = useState(isDebugEnabled());

  const pendingCount = getQueueStatus().pending;

  const handleSaveAndTest = async () => {
    localStorage.setItem('gas_url', url);
    localStorage.setItem('gas_token', token);
    localStorage.setItem('user_name', userName);

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

  const handleReset = () => {
    localStorage.clear();
    window.location.href = '/';
  };

  const toggleDebug = (val: boolean) => {
      setDebug(val);
      setDebugEnabled(val);
  };

  const userRole = localStorage.getItem('user_role') || 'PORCHER';
  const isSynced = syncStatus === 'synced';

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <PremiumHeader title="Contrôle" subtitle="Pilotage & Configuration" />
      </IonHeader>
      <IonContent>
        <div className="px-5 space-y-6 pb-32 mt-5">

          {/* ── SYNC STATUS CARD ─────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <h2 className="ft-heading text-gray-700">Flux & Synchronisation</h2>
              <div className={`w-2 h-2 rounded-full ${isSynced ? 'bg-accent-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
            </div>

            <div className="premium-card">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isSynced ? 'bg-accent-50' : 'bg-amber-50'}`}>
                            {isSynced
                              ? <Cloud size={20} className="text-accent-500" />
                              : <RefreshCw size={20} className={`text-amber-500 ${!isSynced ? 'animate-spin' : ''}`} />
                            }
                        </div>
                        <div>
                            <p className="text-[14px] font-bold text-gray-900">{isSynced ? 'Système à jour' : 'Synchronisation...'}</p>
                            <p className="text-[12px] text-gray-400 mt-0.5">{pendingCount} action(s) en attente</p>
                        </div>
                    </div>
                    <button onClick={() => processQueue()} className="pressable w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center active:bg-gray-100 transition-colors" aria-label="Traiter la file">
                        <RefreshCw size={16} className="text-gray-500" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigate('/sync')}
                      className="pressable flex items-center justify-center gap-2 h-11 rounded-xl border border-gray-200 bg-white text-gray-700 text-[13px] font-medium active:bg-gray-50 transition-colors"
                    >
                        Détails File
                    </button>
                    <button
                      onClick={() => pullData()}
                      className="pressable flex items-center justify-center gap-2 h-11 rounded-xl bg-accent-600 text-white text-[13px] font-medium active:bg-accent-700 transition-colors"
                      aria-label="Rafraîchir les données"
                    >
                        <RefreshCw size={14} />
                        Forcer Pull
                    </button>
                </div>
            </div>
          </div>

          {/* ── AUDIT & PROTOCOLES ────────────────────────────────────── */}
          <div className="space-y-3">
            <h2 className="ft-heading text-gray-700 px-1">Audit & Performance</h2>
            <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/audit')}
                  className="pressable rounded-xl border border-amber-100 bg-amber-50 p-5 text-left active:scale-[0.97] transition-transform duration-[160ms]"
                >
                    <AlertTriangle size={22} className="text-amber-500 mb-3" />
                    <p className="text-[14px] font-bold text-gray-900">Audit</p>
                    <p className="text-[11px] text-gray-400 mt-1">Cohérence données</p>
                </button>
                <button
                  onClick={() => navigate('/protocoles')}
                  className="pressable rounded-xl bg-accent-600 p-5 text-left active:scale-[0.97] transition-transform duration-[160ms]"
                >
                    <BookOpen size={22} className="text-accent-200 mb-3" />
                    <p className="text-[14px] font-bold text-white">Protocoles</p>
                    <p className="text-[11px] text-white/50 mt-1">Guide terrain</p>
                </button>
            </div>
          </div>

          {/* ── PARAMÈTRES SYSTÈME ────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="ft-heading text-gray-700">Paramètres</h2>
              <span className="text-[11px] text-gray-400">v{APP_VERSION}</span>
            </div>

            <div className="premium-card overflow-hidden">
                {/* Nom opérateur */}
                <div className="p-5 border-b border-gray-200">
                    <PremiumInput
                        label="Nom de l'Opérateur"
                        placeholder="Ex: Jean Martin"
                        value={userName}
                        onChange={setUserName}
                        errorMsg={userRole === 'PORCHER' && !userName ? "Nom requis pour traçabilité" : ""}
                        status={userRole === 'PORCHER' && !userName ? 'error' : 'idle'}
                    />
                </div>

                {/* API URL */}
                <div className="p-5 border-b border-gray-200">
                    <PremiumInput
                        label="GAS API URL"
                        value={url}
                        onChange={setUrl}
                    />
                </div>

                {/* Token */}
                <div className="p-5 border-b border-gray-200">
                    <PremiumInput
                        label="Token d'Accès"
                        type="text"
                        value={token}
                        onChange={setToken}
                    />
                </div>

                {/* Debug toggle */}
                <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${debug ? 'bg-amber-50' : 'bg-gray-50'}`}>
                            <Bug size={16} className={debug ? 'text-amber-500' : 'text-gray-400'} />
                        </div>
                        <div>
                            <p className="text-[13px] font-bold text-gray-700">Mode Développeur</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">Traces & Logs détaillés</p>
                        </div>
                    </div>
                    <IonToggle checked={debug} onIonChange={e => toggleDebug(e.detail.checked)} color="warning" />
                </div>

                {/* Role switcher */}
                <div className="p-5 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-accent-50 flex items-center justify-center">
                            <Shield size={16} className="text-accent-500" />
                        </div>
                        <div>
                            <p className="text-[13px] font-bold text-gray-700">Profil</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{userRole === 'PORCHER' ? 'Opérateur Terrain' : 'Admin'}</p>
                        </div>
                    </div>
                    <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                        <button
                            onClick={() => { localStorage.setItem('user_role', 'PORCHER'); window.location.reload(); }}
                            className={`pressable px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors duration-200 ${userRole === 'PORCHER' ? 'bg-accent-600 text-white shadow-sm' : 'text-gray-400'}`}
                        >
                            Terrain
                        </button>
                        <button
                            onClick={() => { localStorage.setItem('user_role', 'ADMIN'); window.location.reload(); }}
                            className={`pressable px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors duration-200 ${userRole === 'ADMIN' ? 'bg-accent-600 text-white shadow-sm' : 'text-gray-400'}`}
                        >
                            Admin
                        </button>
                    </div>
                </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSaveAndTest}
              disabled={testStatus === 'testing'}
              className="pressable w-full h-[52px] rounded-xl bg-accent-600 text-white text-[14px] font-bold flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-40 transition-[transform,opacity]"
            >
                {testStatus === 'testing' ? <IonSpinner name="bubbles" className="w-5 h-5" /> : <><Save size={16} /> Enregistrer & Vérifier</>}
            </button>

            {/* Reset */}
            <button onClick={() => setShowAlert(true)} className="pressable w-full py-3 px-4 text-[12px] text-red-500 flex items-center justify-center gap-2 border border-dashed border-red-100 rounded-lg bg-transparent active:opacity-70 transition-colors duration-200">
                <Trash2 size={14} />
                Réinitialiser la Session
            </button>
          </div>

          {/* Footer */}
          <div className="text-center pb-6">
              <p className="text-[11px] text-gray-400">PorcTrack · Infrastructure</p>
          </div>
        </div>

        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={testMessage} duration={3000} position="top" />
        <IonAlert isOpen={showAlert} onDidDismiss={() => setShowAlert(false)} header="Réinitialisation" message="Effacer toutes les données locales et se déconnecter ?" buttons={[{ text: 'Annuler', role: 'cancel' }, { text: 'Réinitialiser', cssClass: 'text-red-500', handler: handleReset }]} />
      </IonContent>
    </IonPage>
  );
};

export default SettingsPage;
