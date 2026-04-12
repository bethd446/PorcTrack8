import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  RefreshCw, 
  Sparkles, 
  Download, 
  Image as ImageIcon, 
  ShieldCheck, 
  ClipboardList, 
  TrendingUp, 
  Trash2, 
  ArrowRight,
  User,
  Smartphone,
  AlertTriangle
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';
import { useFarm } from '../context/FarmContext';

export const AssetStudio = () => {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [generatedAssets, setGeneratedAssets] = useState<Record<string, string>>({});

  const assets = [
    {
      id: "app-icon",
      name: "App Icon",
      prompt: "Rounded square app icon mockup (512x512px) for a mobile app. Minimalist white silhouette of a pig's head profile integrated with a circuit network pattern, set against an Emerald-600 (#059669) background. High definition, sleek tech style.",
      aspectRatio: "1:1"
    },
    {
      id: "logo-horizontal",
      name: "Logo Horizontal",
      prompt: "Horizontal logo for 'PorcTrack v5' on transparent background. Sleek, modern sans-serif text 'PorcTrack' in Emerald-900 (#064e3b) and 'v5' in Emerald-600 (#059669). Accompanied by a minimalist icon of a pig snout integrated with a rising data graph trend line. Flat design style, professional look.",
      aspectRatio: "4:3"
    },
    {
      id: "splash-screen",
      name: "Splash Screen",
      prompt: "High-resolution photograph for mobile splash screen (9:16 vertical ratio). Realistic portrait of a clean, healthy Large White pig in a modern, high-tech farm facility. Clean environment, technical lighting with clean white and subtle emerald green (Emerald-600, #059669) LED accents. 'PorcTrack v5' text overlay in white at the bottom. Sharp focus on the pig. High definition.",
      aspectRatio: "9:16"
    },
    {
      id: "dashboard-banner",
      name: "Dashboard Banner",
      prompt: "Professional panoramic photograph of a majestic, clean Large White pig in a modern, high-tech farm environment (16:9 ratio). Bright, clean lighting with subtle emerald green accents. High definition, realistic style, sharp focus on the animal's features.",
      aspectRatio: "16:9"
    },
    {
      id: "offline",
      name: "Offline State",
      prompt: "Minimalist line-art illustration on Gray-50 (#f9fafb) background. A stylized profile of a Large White pig integrated with a broken WiFi signal icon in Red-600 (#dc2626) to indicate an alert. Style: simple, clean, professional.",
      aspectRatio: "1:1"
    }
  ];

  const generateAsset = async (asset: typeof assets[0]) => {
    setIsGenerating(asset.id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: asset.prompt }] },
        config: { imageConfig: { aspectRatio: asset.aspectRatio as any } }
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const url = `data:image/png;base64,${part.inlineData.data}`;
          setGeneratedAssets(prev => ({ ...prev, [asset.id]: url }));
          break;
        }
      }
    } catch (error) {
      console.error("Generation error:", error);
      alert("Erreur lors de la génération.");
    }
    setIsGenerating(null);
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Studio d'Actifs PorcTrack</h2>
        <p className="text-xs text-gray-500">Générez les visuels officiels de votre application.</p>
      </div>

      <div className="grid gap-6">
        {assets.map(asset => (
          <div key={asset.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900">{asset.name}</h3>
              <button 
                onClick={() => generateAsset(asset)}
                disabled={isGenerating === asset.id}
                className="p-2 bg-emerald-50 text-emerald-600 rounded-xl active:scale-95 transition-all disabled:opacity-50"
              >
                {isGenerating === asset.id ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              </button>
            </div>

            {generatedAssets[asset.id] ? (
              <div className="space-y-4">
                <div className={cn(
                  "rounded-2xl overflow-hidden border border-gray-100 bg-gray-50",
                  asset.aspectRatio === '9:16' ? "max-w-[200px] mx-auto" : "w-full"
                )}>
                  <img src={generatedAssets[asset.id]} alt={asset.name} className="w-full h-auto" />
                </div>
                <button 
                  onClick={() => downloadImage(generatedAssets[asset.id], `${asset.id}.png`)}
                  className="w-full py-3 bg-emerald-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Télécharger pour /public/images/
                </button>
              </div>
            ) : (
              <div className="h-32 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 space-y-2">
                <ImageIcon className="w-8 h-8 opacity-20" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Prêt à générer</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { userRole, setUserRole, syncStatus, lastSyncError } = useFarm();
  const deviceId = localStorage.getItem('device_id') || 'Inconnu';
  const defaultUrl = "https://script.google.com/macros/s/AKfycbyaSeQ0mGHN8oP5R7UOMXy_-4OMNhtidl-5LDXFDT3GkGfm4pgb216TfybJ-ILgCKv0iw/exec";
  const [url, setUrl] = useState(localStorage.getItem('gas_url') || defaultUrl);
  const [token, setToken] = useState(localStorage.getItem('gas_token') || 'PORC800_WRITE_2026');
  const [syncMode, setSyncMode] = useState(localStorage.getItem('sync_mode') || 'sheets');
  const [appId, setAppId] = useState(localStorage.getItem('appsheet_app_id') || '');
  const [accessKey, setAccessKey] = useState(localStorage.getItem('appsheet_access_key') || '');

  const save = () => {
    localStorage.setItem('gas_url', url);
    localStorage.setItem('gas_token', token);
    localStorage.setItem('sync_mode', syncMode);
    localStorage.setItem('appsheet_app_id', appId);
    localStorage.setItem('appsheet_access_key', accessKey);
    alert('Paramètres sauvegardés !');
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Mon Profil & Rôle</h2>
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Rôle Actuel</p>
                <p className="text-[10px] text-gray-500">{userRole === 'ADMIN' ? 'Administrateur (Observation)' : 'Utilisateur (Saisie)'}</p>
              </div>
            </div>
            <button 
              onClick={() => {
                const newRole = userRole === 'ADMIN' ? 'USER' : 'ADMIN';
                if (newRole === 'ADMIN') {
                  alert("Mode Observation activé : Vous ne pourrez plus enregistrer de nouvelles données, mais vous pourrez consulter toutes les informations.");
                }
                setUserRole(newRole);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-900 rounded-xl text-[10px] font-bold active:scale-95 transition-all"
            >
              CHANGER
            </button>
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">ID Appareil</p>
              <p className="text-[10px] text-gray-500 font-mono">{deviceId}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Configuration Sync</h2>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setSyncMode('sheets')}
            className={cn("flex-1 py-2 text-[10px] font-bold rounded-lg transition-all", syncMode === 'sheets' ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500")}
          >
            GOOGLE SHEETS
          </button>
          <button 
            onClick={() => setSyncMode('appsheet')}
            className={cn("flex-1 py-2 text-[10px] font-bold rounded-lg transition-all", syncMode === 'appsheet' ? "bg-white text-emerald-700 shadow-sm" : "text-gray-500")}
          >
            APPSHEET API
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {lastSyncError && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Erreur de Synchronisation</span>
            </div>
            <p className="text-xs text-red-700 font-mono break-all">{lastSyncError}</p>
            <p className="text-[9px] text-red-500 italic">
              Note: Si l'erreur est "Authenticate in new window", vérifiez le déploiement de votre script Google Apps Script (doit être "Anyone").
            </p>
          </div>
        )}

        {syncMode === 'sheets' ? (
          <>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">URL Apps Script</label>
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/..."
                className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Token d'accès</label>
              <input 
                type="text" 
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">App ID</label>
              <input 
                type="text" 
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="ex: 12345678-abcd-..."
                className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Access Key</label>
              <input 
                type="password" 
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </>
        )}
        <button 
          onClick={save}
          className="w-full py-4 bg-emerald-700 text-white rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-transform"
        >
          Sauvegarder la configuration
        </button>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Outils Avancés</h3>
        <button 
          onClick={() => navigate('/biosecurity')}
          className="w-full py-4 bg-emerald-50 text-emerald-900 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <ShieldCheck className="w-5 h-5" />
          Biosécurité & PPA
        </button>
        <button 
          onClick={() => navigate('/conseils')}
          className="w-full py-4 bg-emerald-50 text-emerald-900 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <ClipboardList className="w-5 h-5" />
          Conseils Expert Porcin
        </button>
        <button 
          onClick={() => navigate('/finance')}
          className="w-full py-4 bg-emerald-50 text-emerald-900 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <TrendingUp className="w-5 h-5" />
          Analyse Financière & ROI
        </button>
        <button 
          onClick={() => navigate('/studio')}
          className="w-full py-4 bg-emerald-50 text-emerald-900 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Sparkles className="w-5 h-5" />
          Ouvrir le Studio d'Actifs
        </button>
        <button 
          onClick={() => {
            if (confirm("Voulez-vous vraiment réinitialiser toutes les données locales ?")) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Trash2 className="w-5 h-5" />
          Réinitialiser toutes les données
        </button>
      </div>

      <div className="pt-6 border-t border-gray-200 space-y-4">
        <h3 className="text-xs font-bold text-gray-900 uppercase mb-3">Système</h3>
        
        <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Version</span>
            <span className="font-bold">5.0.4 (Build 2026)</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">ID Ferme</span>
            <span className="font-bold">A130-CI</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Onboarding = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(0);
  const questions = [
    { q: "Gestantes imminentes : mise bas confirmée ?", options: ["Oui", "Non", "En cours"] },
    { q: "Anomalies détectées (refus allaitement, etc.) ?", options: ["Aucune", "Oui (voir notes)", "Mineur"] },
    { q: "Mortalités du jour ?", options: ["0", "1", "Plus de 1"] },
  ];

  const next = () => {
    if (step < questions.length - 1) setStep(step + 1);
    else onComplete();
  };

  return (
    <div className="fixed inset-0 bg-emerald-900 z-[100] flex flex-col p-6 text-white">
      <div className="flex-1 flex flex-col justify-center space-y-8">
        <div className="space-y-2">
          <div className="w-12 h-1 bg-white/20 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${((step + 1) / questions.length) * 100}%` }}
              className="h-full bg-emerald-400"
            />
          </div>
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Contrôle Quotidien {step + 1}/{questions.length}</p>
        </div>
        
        <h2 className="text-3xl font-bold leading-tight">{questions[step].q}</h2>
        
        <div className="space-y-3">
          {questions[step].options.map((opt, i) => (
            <button 
              key={i}
              onClick={next}
              className="w-full p-5 bg-white/10 border border-white/10 rounded-3xl text-left font-bold text-lg flex justify-between items-center group active:bg-white/20 transition-all"
            >
              {opt}
              <ArrowRight className="w-5 h-5 opacity-0 group-active:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>
      
      <div className="py-8 text-center">
        <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">PorcTrack v5 • Intelligence Opérationnelle</p>
      </div>
    </div>
  );
};
