import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  PiggyBank, 
  Package, 
  MoreHorizontal, 
  Activity, 
  NotebookPen,
  Wifi, 
  WifiOff, 
  RefreshCw 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useFarm } from '../context/FarmContext';

export const Header = () => {
  const { syncStatus, pullData, userRole } = useFarm();
  
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
          <img 
            src="/images/app-icon.png" 
            alt="Logo" 
            className="w-7 h-7 rounded-lg"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://picsum.photos/seed/large-white-pig-logo/100/100";
            }}
            referrerPolicy="no-referrer"
          />
        </div>
        <div>
          <h1 className="text-lg font-black text-gray-900 tracking-tighter leading-none">PorcTrack</h1>
          <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-1">
            {userRole === 'ADMIN' ? '👀 Observation' : 'v5.0 Pro'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          onClick={() => pullData()}
          disabled={syncStatus === 'pending'}
          className={cn(
            "px-3 py-1.5 rounded-full flex items-center gap-2 transition-all border active:scale-95 disabled:opacity-50",
            syncStatus === 'synced' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
            syncStatus === 'pending' ? "bg-amber-50 border-amber-100 text-amber-600" :
            "bg-red-50 border-red-100 text-red-600"
          )}
        >
          {syncStatus === 'synced' ? <Wifi className="w-3 h-3" /> : 
           syncStatus === 'pending' ? <RefreshCw className="w-3 h-3 animate-spin" /> : 
           <WifiOff className="w-3 h-3" />}
          <span className="text-[9px] font-black uppercase tracking-widest">
            {syncStatus === 'synced' ? 'Live' : syncStatus === 'pending' ? 'Sync' : 'Offline'}
          </span>
        </button>
      </div>
    </header>
  );
};

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: 'Board', path: '/' },
    { icon: PiggyBank, label: 'Cheptel', path: '/breeders' },
    { icon: Package, label: 'Stock', path: '/stock' },
    { icon: NotebookPen, label: 'Notes', path: '/notes' },
    { icon: MoreHorizontal, label: 'Plus', path: '/more' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto px-6 pb-8 pt-4 bg-white/90 backdrop-blur-xl border-t border-gray-100">
      <div className="flex justify-between items-center">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1 group relative"
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                isActive ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 scale-110" : "text-gray-400 hover:bg-gray-50"
              )}>
                <item.icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
              </div>
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-widest transition-all",
                isActive ? "text-emerald-700 opacity-100" : "text-gray-400 opacity-0 group-hover:opacity-100"
              )}>
                {item.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="nav-dot"
                  className="absolute -top-1 w-1 h-1 bg-emerald-600 rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
