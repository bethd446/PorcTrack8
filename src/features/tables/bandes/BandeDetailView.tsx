import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonContent, IonModal, IonSegment, IonSegmentButton, IonLabel, IonSpinner,
} from '@ionic/react';
import {
  AlertCircle, Activity, ClipboardList, ChevronLeft, ChevronRight,
  Stethoscope, TrendingUp,
} from 'lucide-react';
import PhotoStrip from '../../../components/PhotoStrip';
import { Chip } from '../../../components/agritech';
import QuickNoteForm from '../../../components/forms/QuickNoteForm';
import QuickHealthForm from '../../../components/forms/QuickHealthForm';
import BandeCroissanceCard from '../../../components/bande/BandeCroissanceCard';
import { useFarm } from '../../../context/FarmContext';
import { getJournalSante, getNotesTerrain } from '../../../services/supabaseService';
import TableRowEdit from '../TableRowEdit';
import CycleTimeline from './CycleTimeline';
import type { AggregatedBande, DebugMeta, SheetRawRow } from './types';

interface BandeDetailViewProps {
  bande: AggregatedBande;
  header: string[];
  meta: DebugMeta | null;
  onClose: () => void;
  onRefresh: () => void;
}

const BandeDetailView: React.FC<BandeDetailViewProps> = ({ bande, header, meta, onClose, onRefresh }) => {
  const [tab, setTab] = useState('resumé');
  const [editRow, setEditRow] = useState<SheetRawRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [healthData, setHealthData] = useState<SheetRawRow[]>([]);
  const [healthHeader, setHealthHeader] = useState<string[]>([]);
  const [notesData, setNotesData] = useState<SheetRawRow[]>([]);
  const [notesHeader, setNotesHeader] = useState<string[]>([]);
  const { notes: notesAsNotes, getBandeById } = useFarm();
  const bandeTyped = getBandeById(bande.id);

  const loadRelatedData = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, notesRes] = await Promise.all([
        getJournalSante(),
        getNotesTerrain(),
      ]);
      if (healthRes.success) {
        setHealthHeader(['DATE', 'TYPE', 'CIBLE_ID', 'TRAITEMENT', 'OBSERVATION']);
        setHealthData(healthRes.data.map(h => [
          h.date, h.cibleType, h.cibleId, h.traitement, h.observation,
        ] as SheetRawRow));
      }
      if (notesRes.success) {
        setNotesHeader(['DATE', 'CATEGORIE', 'NOTE', 'AUTEUR']);
        setNotesData(notesRes.data.map(n => [
          n.date, n.animalType, n.texte, n.auteur ?? '',
        ] as SheetRawRow));
      }
    } catch (e) {
      console.error('Error loading related data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRelatedData();
  }, [loadRelatedData]);

  const filteredHealth = useMemo(() => {
    if (!bande.id || healthData.length === 0) return [];
    const typeIdx = healthHeader.findIndex(h => ['CIBLE_TYPE', 'SUJET_TYPE', 'TYPE'].includes(h.toUpperCase()));
    const idIdx = healthHeader.findIndex(h => ['CIBLE_ID', 'SUJET_ID', 'ID', 'BOUCLE'].includes(h.toUpperCase()));

    if (idIdx === -1) return [];

    return healthData.filter(r => {
      const rowId = String(r[idIdx]).trim().toUpperCase();
      const targetId = String(bande.id).trim().toUpperCase();
      const rowType = typeIdx !== -1 ? String(r[typeIdx]).trim().toUpperCase() : 'BANDE';
      return rowId === targetId && (rowType === 'BANDE' || typeIdx === -1);
    });
  }, [healthData, healthHeader, bande.id]);

  const filteredNotes = useMemo(() => {
    if (!bande.id || notesData.length === 0) return [];
    const typeIdx = notesHeader.findIndex(h => ['SUBJECTTYPE', 'TYPE_SUJET'].includes(h.toUpperCase()));
    const idIdx = notesHeader.findIndex(h => ['SUBJECTID', 'ID_SUJET'].includes(h.toUpperCase()));

    if (idIdx !== -1 && typeIdx !== -1) {
      return notesData.filter(r =>
        String(r[idIdx]).trim().toUpperCase() === String(bande.id).trim().toUpperCase() &&
        String(r[typeIdx]).trim().toUpperCase() === 'BANDE'
      );
    }
    return notesData.filter(r => r.some(cell => String(cell).trim().toUpperCase() === String(bande.id).trim().toUpperCase()));
  }, [notesData, notesHeader, bande.id]);

  return (
    <div className="agritech-root h-full flex flex-col">
      <header className="bg-bg-0 border-b border-border px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onClose}
            className="pressable inline-flex h-9 w-9 items-center justify-center rounded-md bg-bg-2 text-text-1 transition-colors"
            aria-label="Retour"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="agritech-heading uppercase leading-none truncate" style={{ fontSize: 'clamp(20px, 5vw, 24px)' }}>
              Portée {bande.id}
            </h1>
            <p className="mt-1 font-mono text-[11px] text-text-2 leading-none truncate">
              {(bande.status as string) || 'Détails'} {bande.truie ? `· ${bande.truie}` : ''}
            </p>
          </div>
        </div>

        <IonSegment
          value={tab}
          onIonChange={e => setTab(e.detail.value as string)}
          className="premium-segment bg-bg-1 border border-border rounded-md overflow-hidden"
        >
          <IonSegmentButton value="resumé"><IonLabel className="text-[11px] font-mono uppercase tracking-wide">Résumé</IonLabel></IonSegmentButton>
          <IonSegmentButton value="details"><IonLabel className="text-[11px] font-mono uppercase tracking-wide">Détails</IonLabel></IonSegmentButton>
          <IonSegmentButton value="sante"><IonLabel className="text-[11px] font-mono uppercase tracking-wide">Santé</IonLabel></IonSegmentButton>
          <IonSegmentButton value="notes"><IonLabel className="text-[11px] font-mono uppercase tracking-wide">Notes</IonLabel></IonSegmentButton>
        </IonSegment>
      </header>

      <IonContent className="ion-no-padding">
        <div className="agritech-root px-4 py-5">
          {tab === 'resumé' && (
            <div className="space-y-4 pb-32">
              <PhotoStrip subjectType="BANDE" subjectId={bande.id} />

              <CycleTimeline age={bande.age} status={(bande.status as string) || ''} />

              {bandeTyped ? (
                <BandeCroissanceCard bande={bandeTyped} notes={notesAsNotes} />
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div className="card-dense">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} className="text-accent" />
                    <span className="kpi-label">Performances</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-[22px] font-semibold tabular-nums text-text-0">{String(bande.vivants || 0)}</span>
                    <span className="font-mono text-[11px] uppercase text-text-2">Vivants</span>
                  </div>
                </div>
                <div className="card-dense">
                  <div className="flex items-center gap-2 mb-2">
                    <Stethoscope size={14} className="text-red" />
                    <span className="kpi-label">Alertes santé</span>
                  </div>
                  <span className={`font-mono text-[22px] font-semibold tabular-nums ${filteredHealth.length > 0 ? 'text-red' : 'text-text-0'}`}>
                    {filteredHealth.length}
                  </span>
                </div>
              </div>

              <div className="card-dense space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Activity size={14} className="text-accent" />
                  <h4 className="kpi-label">Informations générales</h4>
                </div>
                <div className="grid grid-cols-1 gap-0">
                  {[
                    { label: 'Truie', value: bande.truie },
                    { label: 'Boucle mère', value: bande.boucleMere },
                    { label: 'Date MB', value: bande.dateMB },
                    { label: 'Nés vivants', value: bande.nv },
                    { label: 'Morts', value: bande.morts },
                    { label: 'Âge', value: bande.age ? `${bande.age} jours` : '—' },
                    { label: 'Statut actuel', value: bande.status },
                  ].map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b border-border last:border-b-0 py-2">
                      <span className="font-mono text-[11px] uppercase tracking-wide text-text-2">{item.label}</span>
                      <span className="font-mono text-[12px] text-text-0">{String(item.value || '—')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <QuickHealthForm subjectType="BANDE" subjectId={bande.id} onSuccess={() => { onRefresh(); loadRelatedData(); }} />
            </div>
          )}

          {tab === 'details' && (
            <div className="space-y-3 pb-32">
              <div className="flex items-center justify-between mb-1">
                <h3 className="kpi-label">Registre complet</h3>
                <Chip label={`${bande.rows.length} lignes`} tone="accent" size="xs" />
              </div>
              {bande.rows && bande.rows.length > 0 ? (
                bande.rows.map((row: SheetRawRow, i: number) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setEditRow(row)}
                    className="card-dense pressable w-full text-left flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-md bg-bg-2 border border-border flex items-center justify-center text-text-2 font-mono text-[11px]">
                        #{i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-text-0">Ligne de registre</p>
                        <p className="font-mono text-[10px] uppercase tracking-wide text-text-2 truncate">
                          {header && header.includes('DATE MB') ? String(row[header.indexOf('DATE MB')]) : 'ID: ' + bande.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-mono text-[11px] text-text-0">{String(row[header.indexOf('STATUT') || 0] || '—')}</p>
                        <p className="font-mono text-[9px] uppercase tracking-wide text-text-2">Statut</p>
                      </div>
                      <ChevronRight size={14} className="text-text-2" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="card-dense text-center py-10">
                  <AlertCircle size={32} className="text-text-2 mb-2 mx-auto opacity-50" />
                  <p className="font-mono text-[11px] uppercase tracking-wide text-text-2">Aucune donnée brute</p>
                </div>
              )}
            </div>
          )}

          {tab === 'sante' && (
            <div className="space-y-4 pb-32">
              <QuickHealthForm subjectType="BANDE" subjectId={bande.id} onSuccess={() => { onRefresh(); loadRelatedData(); }} />

              <div className="flex items-center justify-between mb-1">
                <h3 className="kpi-label">Journal santé portée</h3>
              </div>

              {loading ? (
                <div className="text-center py-10">
                  <IonSpinner name="bubbles" />
                </div>
              ) : filteredHealth.length === 0 ? (
                <div className="card-dense text-center py-10">
                  <Stethoscope size={32} className="text-text-2 mb-2 mx-auto opacity-50" />
                  <p className="font-mono text-[11px] uppercase tracking-wide text-text-2">Aucun soin pour cette portée</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredHealth.map((row, i) => (
                    <div key={i} className="card-dense">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-[11px] uppercase tracking-wide text-text-2">
                          {String(row[healthHeader.findIndex(h => h.toUpperCase().includes('DATE')) || 0])}
                        </span>
                        <Chip
                          label={String(row[healthHeader.findIndex(h => h.toUpperCase().includes('TYPE')) || 1])}
                          tone="red"
                          size="xs"
                        />
                      </div>
                      <p className="text-[13px] font-medium text-text-0 mb-1">
                        {String(row[healthHeader.findIndex(h => h.toUpperCase().includes('SOIN') || h.toUpperCase().includes('TRAITEMENT')) || 2])}
                      </p>
                      <p className="font-mono text-[11px] text-text-2 leading-relaxed">
                        {String(row[healthHeader.findIndex(h => h.toUpperCase().includes('OBS')) || 3])}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'notes' && (
            <div className="space-y-4 pb-32">
              <QuickNoteForm subjectType="BANDE" subjectId={bande.id} onSuccess={() => { onRefresh(); loadRelatedData(); }} />

              <div className="flex items-center justify-between mb-1">
                <h3 className="kpi-label">Journal de bord</h3>
              </div>

              {loading ? (
                <div className="text-center py-10">
                  <IonSpinner name="bubbles" />
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="card-dense text-center py-10">
                  <ClipboardList size={32} className="text-text-2 mb-2 mx-auto opacity-50" />
                  <p className="font-mono text-[11px] uppercase tracking-wide text-text-2">Journal vide</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotes.map((row, i) => (
                    <div key={i} className="card-dense">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-mono text-[11px] uppercase tracking-wide text-text-2">
                          {String(row[notesHeader.indexOf('DATE') || 0])}
                        </span>
                      </div>
                      <p className="text-[13px] text-text-0 leading-relaxed italic">
                        "{String(row[notesHeader.findIndex(h => h.toUpperCase().includes('NOTE') || h.toUpperCase().includes('TEXTE')) || 1])}"
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <PhotoStrip subjectType="BANDE" subjectId={bande.id} />
            </div>
          )}
        </div>

        <IonModal isOpen={!!editRow} onDidDismiss={() => setEditRow(null)} className="premium-modal">
          {editRow && meta && (
            <TableRowEdit
              meta={meta}
              header={header}
              rowData={editRow}
              onClose={() => setEditRow(null)}
              onSaved={() => { setEditRow(null); onRefresh(); }}
            />
          )}
        </IonModal>
      </IonContent>
    </div>
  );
};

export default BandeDetailView;
