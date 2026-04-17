import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  IonPage, IonHeader, IonContent, IonSpinner, IonRefresher, IonRefresherContent
} from '@ionic/react';
import { Layers, Leaf, Box, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { readTableByKey } from '../../services/googleSheets';
import PremiumHeader from '../../components/PremiumHeader';

interface AuditAlert {
  id: string;
  source: 'BANDE' | 'TRUIE' | 'STOCK' | 'SANTE';
  targetId: string;
  title: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

const AuditView: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AuditAlert[]>([]);

  const runAudit = useCallback(async () => {
    setLoading(true);
    const newAlerts: AuditAlert[] = [];

    try {
        const [bandeRes, truieRes, stockRes] = await Promise.all([
            readTableByKey('PORCELETS_BANDES_DETAIL'),
            readTableByKey('SUIVI_TRUIES_REPRODUCTION'),
            readTableByKey('STOCK_ALIMENTS')
        ]);

        // 1. Audit Bandes
        if (bandeRes.success) {
            const h = bandeRes.header;
            const mortsIdx = h.findIndex(x => x.toLowerCase().includes('morts'));
            const nvIdx = h.findIndex(x => x.toLowerCase().includes('nv'));
            const vivantsIdx = h.findIndex(x => x.toLowerCase().includes('vivants'));
            const mbIdx = h.findIndex(x => x.toLowerCase().includes('date mb'));
            const dateSevragePrevueIdx = h.findIndex(x => x.toLowerCase().includes('sevrage prévue'));
            const dateSevrageReelleIdx = h.findIndex(x => x.toLowerCase().includes('sevrage réelle'));

            bandeRes.rows.forEach(row => {
                const id = row[0];
                const morts = parseInt(row[mortsIdx]) || 0;
                const nv = parseInt(row[nvIdx]) || 0;
                const vivants = parseInt(row[vivantsIdx]) || 0;
                const sp = row[dateSevragePrevueIdx];
                const sr = row[dateSevrageReelleIdx];
                const mb = row[mbIdx];

                if (morts > 0) {
                    newAlerts.push({
                        id: `CHK_B1_${id}`, source: 'BANDE', targetId: id,
                        title: 'Mortalité Détectée', severity: 'HIGH',
                        description: `${morts} porcelet(s) mort(s) signalés dans la bande ${id}.`
                    });
                }

                if (morts > nv) {
                    newAlerts.push({
                        id: `CHK_B4_${id}`, source: 'BANDE', targetId: id,
                        title: 'Erreur Saisie Morts', severity: 'HIGH',
                        description: `Le nombre de morts (${morts}) est supérieur aux nés vivants (${nv}).`
                    });
                }

                if (vivants !== (nv - morts)) {
                    newAlerts.push({
                        id: `CHK_B5_${id}`, source: 'BANDE', targetId: id,
                        title: 'Incohérence Effectif', severity: 'MEDIUM',
                        description: `Vivants (${vivants}) ≠ NV (${nv}) - Morts (${morts}).`
                    });
                }

                if (nv < 5 && nv > 0) {
                    newAlerts.push({
                        id: `CHK_B2_${id}`, source: 'BANDE', targetId: id,
                        title: 'Portée Faible', severity: 'MEDIUM',
                        description: `Seulement ${nv} nés vivants. Vérifier l'état de la truie.`
                    });
                }

                if (sp && mb) {
                    const spDate = new Date(sp);
                    const mbDate = new Date(mb);
                    if (!isNaN(spDate.getTime()) && !isNaN(mbDate.getTime()) && spDate < mbDate) {
                        newAlerts.push({
                            id: `CHK_B6_${id}`, source: 'BANDE', targetId: id,
                            title: 'Date Sevrage Illogique', severity: 'HIGH',
                            description: `Date sevrage prévue (${sp}) avant Date MB (${mb}).`
                        });
                    }
                }

                if (sp && !sr) {
                    const spDate = new Date(sp);
                    if (!isNaN(spDate.getTime()) && spDate < new Date()) {
                        newAlerts.push({
                            id: `CHK_B3_${id}`, source: 'BANDE', targetId: id,
                            title: 'Retard Sevrage', severity: 'HIGH',
                            description: `Date de sevrage prévue (${sp}) dépassée.`
                        });
                    }
                }
            });
        }

        // 2. Audit Truies
        if (truieRes.success) {
             const h = truieRes.header;
             const mbPrevueIdx = h.findIndex(x => x.toLowerCase().includes('mb_prevue') || x.toLowerCase().includes('mise bas'));
             const statutIdx = h.findIndex(x => x.toLowerCase().includes('statut'));

             truieRes.rows.forEach(row => {
                 const id = row[0];
                 const mb = row[mbPrevueIdx];
                 const statut = String(row[statutIdx]).toUpperCase();

                 if (mb && (statut.includes('GESTANTE') || statut.includes('ATTENTE'))) {
                     const mbDate = new Date(mb);
                     if (!isNaN(mbDate.getTime())) {
                        const diffDays = Math.floor((new Date().getTime() - mbDate.getTime()) / (1000 * 3600 * 24));
                        if (diffDays > 3) {
                            newAlerts.push({
                                id: `CHK_T1_${id}`, source: 'TRUIE', targetId: id,
                                title: 'Mise-Bas en Retard', severity: 'HIGH',
                                description: `Gestation prolongée pour ${id} (+${diffDays}j). Risque de complications.`
                            });
                        }
                     }
                 }
             });
        }

        // 3. Audit Stocks
        if (stockRes.success) {
            const qteIdx = stockRes.header.findIndex(x => x.toLowerCase().includes('quantite'));
            stockRes.rows.forEach(row => {
                const id = row[0];
                const nom = row[1];
                const qte = parseFloat(row[qteIdx]) || 0;
                if (qte < 100) {
                    newAlerts.push({
                        id: `CHK_S1_${id}`, source: 'STOCK', targetId: id,
                        title: 'Stock Critique', severity: 'HIGH',
                        description: `Il ne reste que ${qte}kg de ${nom}.`
                    });
                }
            });
        }

        // 4. Audit Santé & DLC (Fictif si table existe)
        const healthRes = await readTableByKey('JOURNAL_SANTE');
        if (healthRes.success) {
             const h = healthRes.header;
             const typeIdx = h.findIndex(x => x.toUpperCase().includes('TYPE'));
             const targetIdx = h.findIndex(x => x.toUpperCase().includes('ID') || x.toUpperCase().includes('SUJET'));

             healthRes.rows.forEach((row, i) => {
                 const type = row[typeIdx];
                 const target = row[targetIdx];
                 if (type && type !== 'GENERAL' && (!target || target === 'N/A' || target === '')) {
                     newAlerts.push({
                         id: `CHK_H1_${i}`, source: 'SANTE', targetId: 'N/A',
                         title: 'Cible Manquante', severity: 'MEDIUM',
                         description: `Intervention type "${type}" sans animal/bande rattaché.`
                     });
                 }
             });
        }

        const vetoRes = await readTableByKey('STOCK_VETO');
        if (vetoRes.success) {
            const h = vetoRes.header;
            const dlcIdx = h.findIndex(x => x.toUpperCase().includes('DLC') || x.toUpperCase().includes('PEREMPTION'));
            if (dlcIdx !== -1) {
                vetoRes.rows.forEach(row => {
                    const id = row[0];
                    const nom = row[1];
                    const dlc = row[dlcIdx];
                    if (dlc) {
                        const dlcDate = new Date(dlc);
                        if (!isNaN(dlcDate.getTime()) && dlcDate < new Date()) {
                            newAlerts.push({
                                id: `CHK_V1_${id}`, source: 'STOCK', targetId: id,
                                title: 'Produit Périmé', severity: 'HIGH',
                                description: `Le médicament ${nom} a dépassé sa DLC (${dlc}).`
                            });
                        }
                    }
                });
            }
        }

        setAlerts(newAlerts.sort((a, b) => a.severity === 'HIGH' ? -1 : 1));
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    runAudit();
  }, [runAudit]);

  const getSourceIcon = (source: string) => {
      switch(source) {
          case 'BANDE': return Layers;
          case 'TRUIE': return Leaf;
          case 'STOCK': return Box;
          default: return AlertCircle;
      }
  };

  const handleAlertClick = (alert: AuditAlert) => {
      if (alert.source === 'BANDE') navigate(`/bandes/${alert.targetId}`);
      if (alert.source === 'TRUIE') navigate(`/cheptel/truie/${alert.targetId}`);
      if (alert.source === 'STOCK') navigate(`/stock`);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <PremiumHeader title="Audit Cohérence" subtitle={`${alerts.length} incohérences détectées`} />
      </IonHeader>

      <IonContent className="bg-white">
        <IonRefresher slot="fixed" onIonRefresh={(e) => runAudit().then(() => e.detail.complete())}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="px-5 py-8 pb-32">
            {loading ? (
                <div className="flex flex-col items-center justify-center mt-20 space-y-4">
                    <IonSpinner name="bubbles" color="primary" className="w-12 h-12" />
                    <p className="text-[11px] font-bold text-accent-900/30 uppercase">Analyse transversale...</p>
                </div>
            ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center mt-20 p-10 bg-white rounded-[24px] border border-accent-50 shadow-xl shadow-accent-900/5 text-center">
                    <div className="w-20 h-20 bg-accent-50 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 size={32} className="text-accent-500" />
                    </div>
                    <h3 className="ft-heading text-lg uppercase">Registre Intègre</h3>
                    <p className="text-[11px] font-bold text-gray-400 uppercase mt-2 leading-relaxed">
                        Aucune incohérence majeure détectée dans les bases de données actuelles.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {alerts.map(alert => (
                        <div
                            key={alert.id}
                            onClick={() => handleAlertClick(alert)}
                            className={`pressable premium-card p-6 bg-white border-gray-100 relative overflow-hidden active:scale-[0.97] transition-transform duration-[160ms] shadow-sm border-l-4 ${alert.severity === 'HIGH' ? 'border-l-red-500' : 'border-l-amber-500'}`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${alert.severity === 'HIGH' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {React.createElement(getSourceIcon(alert.source), { size: 20 })}
                                    </div>
                                    <div>
                                        <h3 className="ft-heading text-sm uppercase tracking-tight leading-none mb-1">{alert.title}</h3>
                                        <span className="text-[11px] font-bold text-gray-500 uppercase">{alert.source} #{alert.targetId}</span>
                                    </div>
                                </div>
                                <div className={`text-[11px] font-bold px-2 py-1 rounded uppercase ${alert.severity === 'HIGH' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {alert.severity}
                                </div>
                            </div>
                            <p className="text-xs font-medium text-gray-600 leading-relaxed pr-8">
                                {alert.description}
                            </p>
                            <ChevronRight size={18} className="absolute bottom-6 right-6 text-gray-300" />
                        </div>
                    ))}
                </div>
            )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AuditView;
