import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw } from 'lucide-react';

// Context & Layout
import { FarmProvider, useFarm } from './context/FarmContext';
import { Header, BottomNav } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';

// Components
import Dashboard from './components/Dashboard';
import { BreederList, BreederDetail } from './components/BreederManagement';
import { PigletList, StockList, BandeManagement } from './components/InventoryManagement';
import { Planning, HealthModule, RationCalculator, BiosecurityModule, ConseilsExpert } from './components/OperationsManagement';
import { AssetStudio, SettingsPage, Onboarding } from './components/SystemManagement';
import NotesHub from './components/NotesHub';
import NotesDaily from './components/NotesDaily';
import NotesWeekly from './components/NotesWeekly';
import FinanceDashboard from './components/FinanceDashboard';

const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { showOnboarding, handleOnboardingComplete } = useFarm();

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 relative">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <motion.div 
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-emerald-900 flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="absolute inset-0 opacity-20">
              <img 
                src="/images/splash-screen.jpg" 
                alt="Splash" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://picsum.photos/seed/large-white-pig-farm/1080/1920";
                }}
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="relative z-10 space-y-6">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-24 h-24 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center mx-auto"
              >
                <img 
                  src="/images/app-icon.png" 
                  alt="Icon" 
                  className="w-16 h-16 rounded-2xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://picsum.photos/seed/large-white-pig-icon/200/200";
                  }}
                  referrerPolicy="no-referrer"
                />
              </motion.div>
              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-white tracking-tighter">PorcTrack</h1>
                <p className="text-emerald-400 font-mono text-xs uppercase tracking-[0.3em]">Version 5.0 Professional</p>
              </div>
              <div className="pt-12">
                <RefreshCw className="w-6 h-6 text-white/20 animate-spin mx-auto" />
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="max-w-md mx-auto relative">
            {/* Futuristic Background Pattern */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03]" 
                 style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            
            <Header />
            <main className="relative min-h-screen">
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/breeders" element={<BreederList />} />
                  <Route path="/breeders/:id" element={<BreederDetail />} />
                  <Route path="/piglets" element={<PigletList />} />
                  <Route path="/bandes" element={<BandeManagement />} />
                  <Route path="/stock" element={<StockList />} />
                  <Route path="/health" element={<HealthModule />} />
                  <Route path="/rations" element={<RationCalculator />} />
                  <Route path="/planning" element={<Planning />} />
                  <Route path="/finance" element={<FinanceDashboard />} />
                  <Route path="/biosecurity" element={<BiosecurityModule />} />
                  <Route path="/conseils" element={<ConseilsExpert />} />
                  <Route path="/studio" element={<AssetStudio />} />
                  <Route path="/notes" element={<NotesHub />} />
                  <Route path="/notes/daily" element={<NotesDaily />} />
                  <Route path="/notes/weekly" element={<NotesWeekly />} />
                  <Route path="/more" element={<SettingsPage />} />
                </Routes>
              </AnimatePresence>
            </main>
            <BottomNav />
            {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <ErrorBoundary>
        <FarmProvider>
          <AppContent />
        </FarmProvider>
      </ErrorBoundary>
    </Router>
  );
}
