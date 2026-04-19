import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  IonPage, IonContent, IonSpinner, IonRefresher, IonRefresherContent
} from '@ionic/react';
import {
  Layers, Leaf, Box, ChevronRight, AlertCircle, CheckCircle2,
  AlertTriangle, ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { readTableByKey } from '../../services/googleSheets';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechHeader from '../../components/AgritechHeader';
import { Chip, SectionDivider } from '../../components/agritech';

interface AuditAlert {
  id: string;
  source: 'BANDE' | 'TRUIE' | 'STOCK' | 'SANTE';
  targetId: string;
  title: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

type FilterKey = 'ALL' | 'BANDE' | 'TRUIE' | 'STOCK' | 'SANTE';

const AuditView: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AuditAlert[]>([]);
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const runAudit = useCallback(async (): Promise<void> => {
    setLoading(true);
    const newAlerts: AuditAlert[] = [];

    try {
      const [bandeRes, truieRes, stockRes] = await Promise.all([
        readTableByKey('PORCELETS_BANDES_DETAIL'),
        readTableByKey('SUIVI_TRUIES_REPRODUCTION'),
        readTableByKey('STOCK_ALIMENTS'),
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
              title: 'Mortalité détectée', severity: 'HIGH',
              description: `${morts} porcelet(s) mort(s) signalés dans la bande ${id}.`,
            });
          }

          if (morts > nv) {
            newAlerts.push({
              id: `CHK_B4_${id}`, source: 'BANDE', targetId: id,
              title: 'Erreur saisie morts', severity: 'HIGH',
              description: `Le nombre de morts (${morts}) est supérieur aux nés vivants (${nv}).`,
            });
          }

          if (vivants !== (nv - morts)) {
            newAlerts.push({
              id: `CHK_B5_${id}`, source: 'BANDE', targetId: id,
              title: 'Incohérence effectif', severity: 'MEDIUM',
              description: `Vivants (${vivants}) ≠ NV (${nv}) - Morts (${morts}).`,
            });
          }

          if (nv < 5 && nv > 0) {
            newAlerts.push({
              id: `CHK_B2_${id}`, source: 'BANDE', targetId: id,
              title: 'Portée faible', severity: 'MEDIUM',
              description: `Seulement ${nv} nés vivants. Vérifier l'état de la truie.`,
            });
          }

          if (sp && mb) {
            const spDate = new Date(sp);
            const mbDate = new Date(mb);
            if (!isNaN(spDate.getTime()) && !isNaN(mbDate.getTime()) && spDate < mbDate) {
              newAlerts.push({
                id: `CHK_B6_${id}`, source: 'BANDE', targetId: id,
                title: 'Date sevrage illogique', severity: 'HIGH',
                description: `Date sevrage prévue (${sp}) avant Date MB (${mb}).`,
              });
            }
          }

          if (sp && !sr) {
            const spDate = new Date(sp);
            if (!isNaN(spDate.getTime()) && spDate < new Date()) {
              newAlerts.push({
                id: `CHK_B3_${id}`, source: 'BANDE', targetId: id,
                title: 'Retard sevrage', severity: 'HIGH',
                description: `Date de sevrage prévue (${sp}) dépassée.`,
              });
            }
          }
        });
      }

      // 2. Audit Truies
      if (truieRes.success) {
        const h = truieRes.header;
        const mbPrevueIdx = h.findIndex(
          x => x.toLowerCase().includes('mb_prevue') || x.toLowerCase().includes('mise bas')
        );
        const statutIdx = h.findIndex(x => x.toLowerCase().includes('statut'));

        truieRes.rows.forEach(row => {
          const id = row[0];
          const mb = row[mbPrevueIdx];
          const statut = String(row[statutIdx]).toUpperCase();

          if (mb && (statut.includes('GESTANTE') || statut.includes('ATTENTE'))) {
            const mbDate = new Date(mb);
            if (!isNaN(mbDate.getTime())) {
              const diffDays = Math.floor(
                (new Date().getTime() - mbDate.getTime()) / (1000 * 3600 * 24)
              );
              if (diffDays > 3) {
                newAlerts.push({
                  id: `CHK_T1_${id}`, source: 'TRUIE', targetId: id,
                  title: 'Mise-bas en retard', severity: 'HIGH',
                  description: `Gestation prolongée pour ${id} (+${diffDays}j). Risque de complications.`,
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
              title: 'Stock critique', severity: 'HIGH',
              description: `Il ne reste que ${qte}kg de ${nom}.`,
            });
          }
        });
      }

      // 4. Audit Santé & DLC (Fictif si table existe)
      const healthRes = await readTableByKey('JOURNAL_SANTE');
      if (healthRes.success) {
        const h = healthRes.header;
        const typeIdx = h.findIndex(x => x.toUpperCase().includes('TYPE'));
        const targetIdx = h.findIndex(
          x => x.toUpperCase().includes('ID') || x.toUpperCase().includes('SUJET')
        );

        healthRes.rows.forEach((row, i) => {
          const type = row[typeIdx];
          const target = row[targetIdx];
          if (type && type !== 'GENERAL' && (!target || target === 'N/A' || target === '')) {
            newAlerts.push({
              id: `CHK_H1_${i}`, source: 'SANTE', targetId: 'N/A',
              title: 'Cible manquante', severity: 'MEDIUM',
              description: `Intervention type "${type}" sans animal/bande rattaché.`,
            });
          }
        });
      }

      const vetoRes = await readTableByKey('STOCK_VETO');
      if (vetoRes.success) {
        const h = vetoRes.header;
        const dlcIdx = h.findIndex(
          x => x.toUpperCase().includes('DLC') || x.toUpperCase().includes('PEREMPTION')
        );
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
                  title: 'Produit périmé', severity: 'HIGH',
                  description: `Le médicament ${nom} a dépassé sa DLC (${dlc}).`,
                });
              }
            }
          });
        }
      }

      setAlerts(newAlerts.sort((a, _b) => (a.severity === 'HIGH' ? -1 : 1)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Legitimate I/O: async audit across multiple sheets
    // eslint-disable-next-line react-hooks/set-state-in-effect
    runAudit();
  }, [runAudit]);

  const getSourceIcon = (source: string): React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }> => {
    switch (source) {
      case 'BANDE':
        return Layers;
      case 'TRUIE':
        return Leaf;
      case 'STOCK':
        return Box;
      case 'SANTE':
        return ShieldAlert;
      default:
        return AlertCircle;
    }
  };

  const handleAlertClick = (alert: AuditAlert): void => {
    if (alert.source === 'BANDE') navigate(`/bandes/${alert.targetId}`);
    if (alert.source === 'TRUIE') navigate(`/cheptel/truie/${alert.targetId}`);
    if (alert.source === 'STOCK') navigate(`/stock`);
  };

  const filtered = useMemo<AuditAlert[]>(() => {
    if (filter === 'ALL') return alerts;
    return alerts.filter(a => a.source === filter);
  }, [alerts, filter]);

  const counts = useMemo(() => {
    return {
      ALL: alerts.length,
      BANDE: alerts.filter(a => a.source === 'BANDE').length,
      TRUIE: alerts.filter(a => a.source === 'TRUIE').length,
      STOCK: alerts.filter(a => a.source === 'STOCK').length,
      SANTE: alerts.filter(a => a.source === 'SANTE').length,
    };
  }, [alerts]);

  const filterDefs: { key: FilterKey; label: string }[] = [
    { key: 'ALL', label: 'Tout' },
    { key: 'BANDE', label: 'Bandes' },
    { key: 'TRUIE', label: 'Truies' },
    { key: 'STOCK', label: 'Stocks' },
    { key: 'SANTE', label: 'Santé' },
  ];

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout withNav={true}>
          <AgritechHeader
            title="Audit cohérence"
            subtitle={`${alerts.length} incohérence${alerts.length > 1 ? 's' : ''} détectée${alerts.length > 1 ? 's' : ''}`}
            backTo="/"
          >
            <div
              className="flex gap-2 overflow-x-auto -mx-1 px-1"
              role="tablist"
              aria-label="Filtres"
            >
              {filterDefs.map(f => {
                const active = filter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(f.key)}
                    className={
                      'pressable shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-md border text-[11px] font-semibold uppercase tracking-wide transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ' +
                      (active
                        ? 'bg-accent text-bg-0 border-accent'
                        : 'bg-bg-1 text-text-1 border-border hover:border-accent/60 hover:text-text-0')
                    }
                  >
                    <span>{f.label}</span>
                    <span
                      className={
                        'font-mono tabular-nums text-[10px] ' +
                        (active ? 'text-bg-0/80' : 'text-text-2')
                      }
                    >
                      {counts[f.key]}
                    </span>
                  </button>
                );
              })}
            </div>
          </AgritechHeader>

          <IonRefresher
            slot="fixed"
            onIonRefresh={e => runAudit().then(() => e.detail.complete())}
          >
            <IonRefresherContent />
          </IonRefresher>

          <div className="px-4 pt-4 pb-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <IonSpinner
                  name="crescent"
                  style={{ color: 'var(--color-accent)' }}
                />
                <p className="mt-3 font-mono text-[11px] uppercase tracking-wide text-text-2">
                  Analyse transversale…
                </p>
              </div>
            ) : alerts.length === 0 ? (
              <div className="card-dense flex flex-col items-center text-center py-12">
                <div
                  className="inline-flex h-16 w-16 items-center justify-center rounded-md bg-bg-2 border border-accent/40 text-accent mb-5"
                  aria-hidden="true"
                >
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="agritech-heading text-[18px] uppercase mb-2">
                  Registre intègre
                </h3>
                <p className="font-mono text-[11px] text-text-2 max-w-xs leading-relaxed">
                  Aucune incohérence majeure détectée dans les bases de données actuelles.
                </p>
              </div>
            ) : (
              <>
                <SectionDivider label={filter === 'ALL' ? 'Incohérences' : `Incohérences · ${filter}`} />
                <ul className="space-y-3" aria-label="Liste des incohérences">
                  {filtered.map(alert => {
                    const Icon = getSourceIcon(alert.source);
                    const isHigh = alert.severity === 'HIGH';
                    return (
                      <li key={alert.id}>
                        <button
                          type="button"
                          onClick={() => handleAlertClick(alert)}
                          className={
                            'card-dense pressable w-full text-left flex items-start gap-3 relative border-l-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ' +
                            (isHigh ? 'border-l-red' : 'border-l-amber')
                          }
                        >
                          <span
                            className={
                              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-2 ' +
                              (isHigh ? 'text-red' : 'text-amber')
                            }
                            aria-hidden="true"
                          >
                            {isHigh ? (
                              <AlertTriangle size={16} />
                            ) : (
                              <Icon size={16} />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="agritech-heading text-[14px] uppercase leading-none">
                                {alert.title}
                              </h3>
                              <Chip
                                label={alert.severity}
                                size="xs"
                                tone={isHigh ? 'red' : 'amber'}
                              />
                            </div>
                            <div className="mt-1 font-mono text-[11px] text-text-2">
                              {alert.source} · #{alert.targetId}
                            </div>
                            <p className="mt-2 text-[13px] text-text-1 leading-relaxed pr-6">
                              {alert.description}
                            </p>
                          </div>
                          <ChevronRight
                            size={16}
                            className="shrink-0 text-text-2 mt-1"
                            aria-hidden="true"
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default AuditView;
