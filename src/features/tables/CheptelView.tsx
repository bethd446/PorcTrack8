import React, { useState, useMemo } from 'react';
import {
  IonPage, IonHeader, IonContent, IonSpinner,
  IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton, IonLabel,
  IonItemSliding, IonItem, IonItemOptions, IonItemOption
} from '@ionic/react';
import { Search, Leaf, ChevronRight, Trash2, Heart, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFarm } from '../../context/FarmContext';
import PremiumHeader from '../../components/PremiumHeader';
import { PremiumCard, StatusBadge, getStatusConfig } from '../../components/PremiumUI';
import DeleteModal, { type DeleteTarget } from '../../components/DeleteModal';

const CheptelView: React.FC = () => {
  const navigate = useNavigate();
  const { truies, verrats, loading, refreshData } = useFarm();
  const [tab, setTab] = useState<'TRUIE' | 'VERRAT'>('TRUIE');
  const [searchText, setSearchText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const isDebug = localStorage.getItem('debug') === '1';

  const activeCounts = useMemo(() => {
    return {
        truies: truies.filter(a => (a.statut === '' || a.statut.toLowerCase().includes('acti') || a.statut.toLowerCase().includes('vivant'))).length,
        verrats: verrats.length
    };
  }, [truies, verrats]);

  const filteredItems = useMemo(() => {
    const list = tab === 'TRUIE' ? truies : verrats;
    return list
      .filter(a => {
        const text = (a.id + (a.nom || '') + a.boucle).toLowerCase();
        return text.includes(searchText.toLowerCase());
      })
      .sort((a, b) => a.displayId.localeCompare(b.displayId, undefined, { numeric: true, sensitivity: 'base' }));
  }, [truies, verrats, tab, searchText]);

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <PremiumHeader title="Cheptel" subtitle={tab === 'TRUIE' ? "Reproducteurs (Truies)" : "Verrats"}>
              {/* Search — light organic style */}
              <div className="bg-gray-50 rounded-xl flex items-center px-4 py-1.5 border border-gray-100">
                 <Search size={16} className="text-gray-400 mr-3" />
                 <input
                    className="bg-transparent border-none text-gray-900 placeholder-gray-300 text-[14px] w-full py-2 outline-none font-medium"
                    placeholder="Chercher une boucle ou ID..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                 />
              </div>
        </PremiumHeader>
        <div className="px-5 mt-3 mb-3">
            <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as any)} className="premium-segment rounded-xl bg-white shadow-sm overflow-hidden border border-gray-100">
                <IonSegmentButton value="TRUIE">
                    <div className="flex items-center gap-2">
                        <Heart size={16} />
                        <IonLabel className="text-[12px] font-bold">Truies</IonLabel>
                    </div>
                </IonSegmentButton>
                <IonSegmentButton value="VERRAT">
                    <div className="flex items-center gap-2">
                        <Zap size={16} />
                        <IonLabel className="text-[12px] font-bold">Verrats</IonLabel>
                    </div>
                </IonSegmentButton>
            </IonSegment>
        </div>
      </IonHeader>

      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={(e) => refreshData().then(() => e.detail.complete())}>
          <IonRefresherContent />
        </IonRefresher>

        {/* KPIs STATUTS */}
        <div className="px-5 mt-4">
          {tab === 'TRUIE' && truies.length > 0 ? (() => {
            const statGroups: Record<string, number> = {};
            truies.forEach(t => {
              const cfg = getStatusConfig(t.statut);
              const key = cfg.label;
              statGroups[key] = (statGroups[key] || 0) + 1;
            });
            return (
              <div className="bg-accent-50 rounded-xl p-5 border border-accent-100 overflow-hidden relative">
                <div className="flex items-center justify-between mb-3">
                  <p className="ft-heading text-[13px] font-bold text-accent-600 uppercase">Statuts Troupeau</p>
                  <p className="text-[12px] text-accent-400">{truies.length} truies</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(statGroups).map(([label, count], idx) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-accent-100">
                        <span className="ft-values font-bold text-accent-600 text-[16px]">{count}</span>
                        <span className="text-[11px] text-gray-500">{label}</span>
                      </div>
                      {idx < Object.entries(statGroups).length - 1 && (
                        <div className="border-r border-accent-100 h-8" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })() : (
            <div className="bg-accent-50 rounded-xl p-5 border border-accent-100 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-[12px] text-accent-400 mb-1">Verrats Actifs</p>
                <p className="ft-values font-bold text-3xl text-accent-600">{verrats.length}</p>
              </div>
              <Leaf size={40} className="text-accent-100" />
            </div>
          )}
        </div>

        <div className="px-5 py-5 pb-32">
            {loading && filteredItems.length === 0 ? (
                <div className="grid grid-cols-1 gap-3">
                    <PremiumCard loading />
                    <PremiumCard loading />
                    <PremiumCard loading />
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center mt-20 opacity-30">
                    <Leaf size={48} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-[14px] font-bold text-gray-400">Aucun sujet trouvé</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {filteredItems.map((item) => {
                      const cfg = getStatusConfig(item.statut);
                      let gestPct: number | null = null;
                      if (tab === 'TRUIE' && item.dateMBPrevue && item.statut?.toUpperCase().includes('GEST')) {
                        try {
                          const parts = item.dateMBPrevue.split('/');
                          if (parts.length === 3) {
                            const mbDate = new Date(+parts[2], +parts[1]-1, +parts[0]);
                            const gestStart = new Date(mbDate.getTime() - 115*86400000);
                            const now = new Date();
                            const elapsed = (now.getTime() - gestStart.getTime()) / 86400000;
                            gestPct = Math.min(100, Math.max(0, Math.round(elapsed / 115 * 100)));
                          }
                        } catch {}
                      }
                      return (
                        <PremiumCard
                            key={item.id}
                            padding="p-4"
                            onClick={() => tab === 'TRUIE' ? navigate(`/cheptel/truie/${item.id}`) : navigate(`/cheptel/verrat/${item.id}`)}
                            className="group active:ring-1 active:ring-accent-600/20 active:scale-[0.97] transition-transform duration-[160ms] pressable animate-fade-in-up"
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative flex-shrink-0">
                                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
                                    <svg viewBox="0 0 24 24" className="w-7 h-7 text-gray-400 group-active:text-accent-500 transition-colors" fill="currentColor">
                                      <path d="M19.5 8c.17 0 .33.01.5.03V7c0-.55-.45-1-1-1h-1V4.5C18 3.12 16.88 2 15.5 2S13 3.12 13 4.5V6h-2V4.5C11 3.12 9.88 2 8.5 2S6 3.12 6 4.5V6H5c-.55 0-1 .45-1 1v1.03C4.17 8.01 4.33 8 4.5 8 3.12 8 2 9.12 2 10.5S3.12 13 4.5 13c.06 0 .12-.01.18-.01C5.07 14.19 5.96 15.12 7 15.68V18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-2.32c1.04-.56 1.93-1.49 2.32-2.69.06.01.12.01.18.01C20.88 13 22 11.88 22 10.5S20.88 8 19.5 8zM9 11.5c-.83 0-1.5-.67-1.5-1.5S8.17 8.5 9 8.5s1.5.67 1.5 1.5S9.83 11.5 9 11.5zm6 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                                    </svg>
                                  </div>
                                  <div className="absolute -bottom-1 -left-1 px-1.5 py-0.5 rounded-md bg-accent-600 text-white text-[11px] font-bold shadow-sm ft-code">
                                      {item.displayId}
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="ft-heading font-bold text-gray-900 leading-tight text-[15px] truncate uppercase">
                                      {item.nom || `Sujet ${item.displayId}`}
                                    </h3>
                                    <p className="text-[12px] text-gray-400 mt-0.5">
                                      {item.race || 'Race indéfinie'}
                                      {item.ration ? ` · ${item.ration}kg` : ''}
                                    </p>
                                    {gestPct !== null && (
                                      <div className="mt-2 flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-blue-500 rounded-full transition-[width]" style={{width:`${gestPct}%`}} />
                                        </div>
                                        <span className="text-[11px] font-bold text-blue-500 ft-values">{gestPct}%</span>
                                      </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                    <StatusBadge statut={item.statut} />
                                    <ChevronRight size={16} className="text-gray-400 group-active:text-gray-500 transition-colors" />
                                </div>
                            </div>
                        </PremiumCard>
                      );
                    })}
                </div>
            )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CheptelView;
