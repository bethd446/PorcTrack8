import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IonPage, IonHeader, IonContent, IonSpinner,
  IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton, IonLabel,
  IonModal, IonToast
} from '@ionic/react';
import {
  AlertCircle, ChevronLeft, Calendar,
  ClipboardList, Camera, RefreshCw,
  Stethoscope, Apple, CheckCircle2,
  Info
} from 'lucide-react';
import { useFarm } from '../../context/FarmContext';
import { updateRowById } from '../../services/googleSheets';
import { enqueueUpdateRow } from '../../services/offlineQueue';
import PremiumHeader from '../../components/PremiumHeader';
import PhotoStrip from '../../components/PhotoStrip';
import TableRowEdit from './TableRowEdit';
import QuickNoteForm from '../../components/forms/QuickNoteForm';
import QuickHealthForm from '../../components/forms/QuickHealthForm';

/**
 * Headers exacts des onglets Google Sheets — doivent correspondre aux colonnes réelles.
 * Si le Sheet change, mettre à jour ici.
 */
const TRUIE_HEADERS = [
  'ID', 'BOUCLE', 'NOM', 'RACE', 'STATUT', 'RATION', 'LOGE',
  'STADE', 'NB_PORTEES', 'DATE_DERNIERE_MB', 'DATE_MB_PREVUE', 'NV_MOYEN'
];
const VERRAT_HEADERS = [
  'ID', 'BOUCLE', 'NOM', 'RACE', 'STATUT', 'RATION', 'DATE_NAISSANCE'
];

const AnimalDetailView: React.FC<{ mode: 'TRUIE' | 'VERRAT' }> = ({ mode }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getAnimalById, getHealthForAnimal, getNotesForAnimal, loading, refreshData } = useFarm();

  const [tab, setTab] = useState('resumé');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [toast, setToast] = useState<{show: boolean, message: string}>({show: false, message: ''});

  const animal = useMemo(() => id ? getAnimalById(id, mode) : undefined, [id, mode, getAnimalById]);
  const healthRecords = useMemo(() => id ? getHealthForAnimal(id, mode) : [], [id, mode, getHealthForAnimal]);
  const notes = useMemo(() => id ? getNotesForAnimal(id, mode) : [], [id, mode, getNotesForAnimal]);

  const handleUpdateRation = async (newRation: number) => {
    if (!animal) return;

    const sheetName = mode === 'TRUIE' ? 'SUIVI_TRUIES_REPRODUCTION' : 'VERRATS';
    const idHeader = 'ID';
    // Le nom exact de la colonne ration dans le Sheet
    const rationCol = 'RATION';
    const patch = { [rationCol]: newRation };

    try {
        const res = await updateRowById(sheetName, idHeader, animal.id, patch);
        if (res.success) {
            setToast({show: true, message: 'Ration mise à jour'});
            refreshData();
        } else {
            enqueueUpdateRow(sheetName, idHeader, animal.id, patch);
            setToast({show: true, message: 'Mise à jour planifiée (hors ligne)'});
        }
    } catch (e) {
        enqueueUpdateRow(sheetName, idHeader, animal.id, patch);
        setToast({show: true, message: 'Mise à jour planifiée'});
    }
  };

  if (loading && !animal) {
    return (
      <IonPage>
        <PremiumHeader title={`Fiche ${mode === 'TRUIE' ? 'Truie' : 'Verrat'}`} subtitle="Chargement..." />
        <IonContent className="bg-white">
          <div className="flex flex-col items-center justify-center mt-32 space-y-4">
            <IonSpinner name="bubbles" color="primary" className="w-16 h-16" />
            <p className="text-accent-900/40 font-bold text-[11px] uppercase">Accès au registre...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!animal) {
    return (
      <IonPage>
        <PremiumHeader title="Erreur" subtitle={`${mode === 'TRUIE' ? 'Truie' : 'Verrat'} Introuvable`} />
        <IonContent className="bg-white px-5">
          <div className="premium-card p-10 text-center mt-20 space-y-6">
            <AlertCircle size={48} className="text-red-500 mx-auto" />
            <h3 className="ft-heading uppercase">{mode === 'TRUIE' ? 'Truie' : 'Verrat'} {id} introuvable</h3>
            <button onClick={() => navigate('/cheptel')} className="premium-btn premium-btn-primary w-full flex items-center justify-center gap-2">
              <ChevronLeft size={18} />
              Retour au Cheptel
            </button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <PremiumHeader title={`${mode === 'TRUIE' ? 'Truie' : 'Verrat'} ${animal.displayId}`} subtitle={animal.statut} cibleId={animal.id} module="REPRO">
            <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as string)} className="premium-segment rounded-xl bg-white/15 backdrop-blur-md overflow-hidden border border-white/10">
                <IonSegmentButton value="resumé"><IonLabel className="text-[11px] font-bold uppercase">Résumé</IonLabel></IonSegmentButton>
                <IonSegmentButton value="sante"><IonLabel className="text-[11px] font-bold uppercase">Santé</IonLabel></IonSegmentButton>
                <IonSegmentButton value="notes"><IonLabel className="text-[11px] font-bold uppercase">Notes</IonLabel></IonSegmentButton>
                <IonSegmentButton value="photos"><IonLabel className="text-[11px] font-bold uppercase">Photos</IonLabel></IonSegmentButton>
            </IonSegment>
        </PremiumHeader>
      </IonHeader>

      <IonContent className="bg-white">
        <IonRefresher slot="fixed" onIonRefresh={(e) => refreshData().then(() => e.detail.complete())}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="px-5 py-4 pb-32">
            {tab === 'resumé' && (
                <div className="space-y-4">

                    {/* ── CTA Confirmer Mise-Bas (style app référence) ── */}
                    {mode === 'TRUIE' && animal.statut?.toUpperCase().includes('GEST') && animal.dateMBPrevue && (() => {
                      try {
                        const parts = animal.dateMBPrevue.split('/');
                        if (parts.length !== 3) return null;
                        const mbDate = new Date(+parts[2], +parts[1]-1, +parts[0]);
                        const diff = (mbDate.getTime() - new Date().getTime()) / 86400000;
                        if (diff > 3) return null;
                        return (
                          <button
                            onClick={() => setTab('sante')}
                            className="pressable w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-accent-600 text-white ft-heading shadow-lg shadow-accent-600/15 active:scale-[0.97] transition-transform duration-[160ms]"
                            style={{fontSize:'13px', letterSpacing:'0.04em'}}
                          >
                            <CheckCircle2 size={20} />
                            {diff <= 0 ? `Confirmer Mise-Bas (${Math.abs(Math.round(diff))}j dépassé)` : `Préparer Mise-Bas (J-${Math.round(diff)})`}
                          </button>
                        );
                      } catch { return null; }
                    })()}

                    {/* ── Card Profil style référence ── */}
                    <div className="rounded-xl overflow-hidden bg-accent-600 shadow-xl shadow-accent-600/15">
                        {/* Header coloré */}
                        <div className="p-5 flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
                                <svg viewBox="0 0 24 24" className="w-8 h-8 text-white/80" fill="currentColor">
                                  <path d="M19.5 8c.17 0 .33.01.5.03V7c0-.55-.45-1-1-1h-1V4.5C18 3.12 16.88 2 15.5 2S13 3.12 13 4.5V6h-2V4.5C11 3.12 9.88 2 8.5 2S6 3.12 6 4.5V6H5c-.55 0-1 .45-1 1v1.03C4.17 8.01 4.33 8 4.5 8 3.12 8 2 9.12 2 10.5S3.12 13 4.5 13c.06 0 .12-.01.18-.01C5.07 14.19 5.96 15.12 7 15.68V18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-2.32c1.04-.56 1.93-1.49 2.32-2.69.06.01.12.01.18.01C20.88 13 22 11.88 22 10.5S20.88 8 19.5 8zM9 11.5c-.83 0-1.5-.67-1.5-1.5S8.17 8.5 9 8.5s1.5.67 1.5 1.5S9.83 11.5 9 11.5zm6 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="ft-heading text-white leading-none" style={{fontSize:'22px'}}>
                                  {animal.nom || (mode === 'TRUIE' ? `Truie ${animal.displayId}` : `Verrat ${animal.displayId}`)}
                                </h2>
                                <p className="ft-code text-white/60 mt-0.5" style={{fontSize:'10px'}}>Boucle: {animal.boucle || 'N/A'}</p>
                                <div className="flex gap-1.5 mt-2">
                                  <span className="ft-code text-white bg-white/15 px-2 py-0.5 rounded-full" style={{fontSize:'9px'}}>{animal.statut?.toUpperCase() || 'INCONNU'}</span>
                                  <span className="ft-code text-white bg-white/15 px-2 py-0.5 rounded-full" style={{fontSize:'9px'}}>{animal.displayId}</span>
                                </div>
                            </div>
                        </div>

                        {/* Barre progression gestation (truies gestantes) */}
                        {mode === 'TRUIE' && animal.statut?.toUpperCase().includes('GEST') && animal.dateMBPrevue && (() => {
                          try {
                            const parts = animal.dateMBPrevue.split('/');
                            if (parts.length !== 3) return null;
                            const mbDate = new Date(+parts[2], +parts[1]-1, +parts[0]);
                            const gestStart = new Date(mbDate.getTime() - 115*86400000);
                            const elapsed = Math.max(0, (new Date().getTime() - gestStart.getTime()) / 86400000);
                            const pct = Math.min(100, Math.round(elapsed / 115 * 100));
                            const isTerme = pct >= 100;
                            return (
                              <div className="px-5 pb-5">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="ft-code text-white/60" style={{fontSize:'9px'}}>PROGRESSION GESTATION</span>
                                  <span className={`ft-code font-bold ${isTerme ? 'text-red-300' : 'text-white'}`} style={{fontSize:'9px'}}>
                                    {isTerme ? 'À TERME' : `${pct}%`}
                                  </span>
                                </div>
                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-[width,colors] ${isTerme ? 'bg-red-400' : 'bg-accent-300'}`} style={{width:`${pct}%`}} />
                                </div>
                                {animal.dateMBPrevue && (
                                  <p className="ft-code text-amber-300 mt-1.5" style={{fontSize:'8px'}}>MB prévue : {animal.dateMBPrevue}</p>
                                )}
                              </div>
                            );
                          } catch { return null; }
                        })()}
                    </div>

                    {/* ── Grille infos (style référence : cartes 2 cols) ── */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="premium-card p-4 bg-white border-gray-100">
                            <span className="ft-code text-gray-500 uppercase block mb-1" style={{fontSize:'8px'}}>{mode === 'TRUIE' ? 'Race' : 'Race'}</span>
                            <span className="ft-heading text-gray-800" style={{fontSize:'14px'}}>{animal.race || 'Large White'}</span>
                        </div>
                        <div className="premium-card p-4 bg-white border-gray-100">
                            <span className="ft-code text-gray-500 uppercase block mb-1" style={{fontSize:'8px'}}>Ration (kg/j)</span>
                            <span className="ft-heading text-gray-800" style={{fontSize:'14px'}}>{animal.ration || '—'}</span>
                        </div>
                        <div className="premium-card p-4 bg-white border-gray-100">
                            <span className="ft-code text-gray-500 uppercase block mb-1" style={{fontSize:'8px'}}>Statut Repro</span>
                            <span className="ft-heading text-gray-800" style={{fontSize:'13px'}}>{animal.statut || '—'}</span>
                        </div>
                        <div className="premium-card p-4 bg-white border-gray-100">
                            <span className="ft-code text-gray-500 uppercase block mb-1" style={{fontSize:'8px'}}>Emplacement</span>
                            <span className="ft-heading text-gray-800" style={{fontSize:'13px'}}>{animal.emplacement || '—'}</span>
                        </div>
                    </div>

                    {/* Historique / Portées (style référence) */}
                    {mode === 'TRUIE' && (
                        <div className="premium-card p-4 bg-white border-gray-100">
                            <div className="flex items-center gap-2 mb-3">
                                <Calendar size={14} className="text-gray-500" />
                                <span className="ft-code text-gray-600 uppercase" style={{fontSize:'9px', letterSpacing:'0.08em'}}>Historique Événements</span>
                            </div>
                            <div className="space-y-2">
                                {animal.dateDerniereMB && (
                                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="ft-code text-gray-500" style={{fontSize:'9px'}}>Dernière MB</span>
                                    <span className="ft-code text-gray-700" style={{fontSize:'10px'}}>{animal.dateDerniereMB}</span>
                                  </div>
                                )}
                                {animal.nvMoyen && (
                                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="ft-code text-gray-500" style={{fontSize:'9px'}}>NV Moyen</span>
                                    <span className="ft-code text-gray-700" style={{fontSize:'10px'}}>{animal.nvMoyen}</span>
                                  </div>
                                )}
                                {animal.nbPortees && (
                                  <div className="flex justify-between items-center py-2">
                                    <span className="ft-code text-gray-500" style={{fontSize:'9px'}}>Portées</span>
                                    <span className="ft-heading text-accent-700" style={{fontSize:'14px'}}>{animal.nbPortees}</span>
                                  </div>
                                )}
                                {!animal.dateDerniereMB && !animal.nvMoyen && !animal.nbPortees && (
                                  <p className="ft-code text-gray-400 text-center py-4" style={{fontSize:'9px'}}>Aucun événement enregistré</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Card Infos Verrat (Verrat uniquement) */}
                    {mode === 'VERRAT' && (
                        <div className="premium-card p-6 bg-white border-gray-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Info size={18} className="text-blue-600" />
                                <h3 className="ft-heading text-[11px] uppercase">Performances Verrat</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                    <span className="text-[11px] font-bold text-gray-500 uppercase">Libellé / Nom</span>
                                    <span className="text-xs font-bold text-gray-800">{animal.nom || '—'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-bold text-gray-500 uppercase">Date Naissance</span>
                                    <span className="text-xs font-bold text-gray-800">{animal.dateNaissance || '—'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Card Alimentation */}
                    <div className="premium-card p-6 bg-white border-gray-100 shadow-sm">
                         <div className="flex items-center gap-2 mb-4">
                            <Apple size={18} className="text-amber-600" />
                            <h3 className="ft-heading text-[11px] uppercase">Alimentation</h3>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                                <span className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Ration Actuelle</span>
                                <div className="flex items-end gap-1">
                                    <span className="text-2xl font-bold text-gray-900">{animal.ration || '0'}</span>
                                    <span className="text-[11px] font-bold text-gray-500 uppercase mb-1">kg/jour</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleUpdateRation(animal.ration - 0.5)} className="pressable w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-700 font-bold" aria-label="Diminuer la ration">-</button>
                                <button onClick={() => handleUpdateRation(animal.ration + 0.5)} className="pressable w-10 h-10 rounded-xl bg-accent-50 border border-accent-100 flex items-center justify-center text-accent-700 font-bold" aria-label="Augmenter la ration">+</button>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-3 gap-3">
                        <button onClick={() => setTab('notes')} className="pressable premium-card p-4 bg-white border-gray-100 flex flex-col items-center gap-2 active:bg-gray-50">
                            <ClipboardList size={20} className="text-gray-500" />
                            <span className="text-[11px] font-bold uppercase text-gray-600">Note</span>
                        </button>
                        <button onClick={() => setTab('photos')} className="pressable premium-card p-4 bg-white border-gray-100 flex flex-col items-center gap-2 active:bg-gray-50">
                            <Camera size={20} className="text-gray-500" />
                            <span className="text-[11px] font-bold uppercase text-gray-600">Photo</span>
                        </button>
                        <button onClick={() => setIsEditModalOpen(true)} className="pressable premium-card p-4 bg-white border-gray-100 flex flex-col items-center gap-2 active:bg-gray-50">
                            <RefreshCw size={20} className="text-accent-600" />
                            <span className="text-[11px] font-bold uppercase text-accent-600">Éditer</span>
                        </button>
                    </div>
                </div>
            )}

            {tab === 'sante' && (
                <div className="space-y-6 pb-32">
                    <QuickHealthForm subjectType={mode} subjectId={animal.id} onSuccess={refreshData} />

                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[11px] font-bold text-gray-500 uppercase">Journal Santé</h3>
                    </div>

                    {healthRecords.length === 0 ? (
                        <div className="premium-card p-10 text-center bg-gray-50 border-2 border-dashed border-gray-200">
                            <Stethoscope size={32} className="text-gray-400 mb-2 opacity-20 mx-auto" />
                            <p className="text-[11px] font-bold text-gray-500 uppercase">Aucun soin enregistré</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {healthRecords.map((record) => (
                                <div key={record.id} className="premium-card p-5 bg-white border-gray-100 shadow-sm border-l-4 border-l-red-400">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[11px] font-bold text-gray-500 uppercase">{record.date}</span>
                                        <span className="bg-red-50 text-red-700 text-[11px] font-bold px-2 py-0.5 rounded uppercase">{record.type}</span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-800 mb-1">{record.traitement}</p>
                                    <p className="text-[11px] text-gray-600 leading-relaxed">{record.observation}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === 'notes' && (
                <div className="space-y-6 pb-32">
                    <QuickNoteForm subjectType={mode} subjectId={animal.id} onSuccess={refreshData} />

                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[11px] font-bold text-gray-500 uppercase">Journal de bord</h3>
                    </div>

                    {notes.length === 0 ? (
                        <div className="premium-card p-10 text-center bg-gray-50 border-2 border-dashed border-gray-200">
                            <ClipboardList size={32} className="text-gray-400 mb-2 opacity-20 mx-auto" />
                            <p className="text-[11px] font-bold text-gray-500 uppercase">Aucune note terrain</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {notes.map((note) => (
                                <div key={note.id} className="premium-card p-5 bg-white border-gray-100 shadow-sm border-l-4 border-l-accent-400">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[11px] font-bold text-gray-500 uppercase">{note.date}</span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-800 leading-relaxed italic">"{note.texte}"</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === 'photos' && (
                <div className="space-y-6">
                    <h3 className="text-[11px] font-bold text-gray-500 uppercase mb-4">Documentation Visuelle</h3>
                    <PhotoStrip subjectType={mode} subjectId={animal.id} />
                </div>
            )}
        </div>

        {/* Modal d'édition complète */}
        <IonModal isOpen={isEditModalOpen} onDidDismiss={() => setIsEditModalOpen(false)} className="premium-modal">
            <TableRowEdit
                meta={{
                    sheetName: mode === 'TRUIE' ? 'SUIVI_TRUIES_REPRODUCTION' : 'VERRATS',
                    idHeader: 'ID'
                }}
                header={mode === 'TRUIE' ? TRUIE_HEADERS : VERRAT_HEADERS}
                rowData={animal.raw ?? []}
                onClose={() => setIsEditModalOpen(false)}
                onSaved={refreshData}
            />
        </IonModal>

        <IonToast
          isOpen={toast.show}
          message={toast.message}
          duration={2000}
          onDidDismiss={() => setToast({show: false, message: ''})}
          position="bottom"
          className="premium-toast"
        />
      </IonContent>
    </IonPage>
  );
};

export default AnimalDetailView;
