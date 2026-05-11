/**
 * OnboardingV2Wizard — V71-P3 wizard onboarding obligatoire 5 étapes
 *
 * Workflow nouveau user :
 *   1. Type d'élevage : Naisseur OU Naisseur-engraisseur
 *   2. Cheptel : nb verrats + nb truies actifs
 *   3. Races : multi-select (Large White, Landrace, Duroc, Piétrain, Local, Autre)
 *   4. Infrastructure : nb loges + cases maternité, post-sevrage, engraissement
 *   5. Confirmation + génération auto DB
 *
 * À la soumission, INSERT en cascade :
 *   - N truies T-001 → T-N (statut "En attente saillie")
 *   - N verrats V-001 → V-N (statut "Actif")
 *   - N cases maternité M-01 → M-N (loges, type=MATERNITE, repartition=NA)
 *   - N loges post-sevrage PS-01 → PS-N (capacité = par_loge)
 *   - N loges engraissement E-01 → E-N (capacité = par_loge)
 *   - UPDATE farms SET metadata.onboarding_v2.completed_at = NOW(),
 *     metadata.onboarding_v2.profile = { type, races, ... }
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';

import { Button, Card, Section } from '@/design-system';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { FarmProfile } from '../../lib/farmProfile';

// V80 P0 #1 — Aligne le wizard sur 3 profils : Naisseur / Engraisseur /
// Cycle complet (vs ancien duo). `ElevageType` reste écrit en metadata.
// `type` pour rétro-compat, et on persiste aussi `metadata.profil`.
type ElevageType = 'NAISSEUR' | 'ENGRAISSEUR' | 'NAISSEUR_ENGRAISSEUR';

const PROFIL_OF_TYPE: Record<ElevageType, FarmProfile> = {
  NAISSEUR: 'naisseur',
  ENGRAISSEUR: 'engraisseur',
  NAISSEUR_ENGRAISSEUR: 'cycle_complet',
};

interface WizardData {
  type: ElevageType | null;
  nbVerrats: number;
  nbTruies: number;
  races: string[];
  raceAutre: string;
  // Infrastructure
  nbLogesMat: number;
  casesParLogeMat: number;
  nbLogesPS: number;
  capacitePS: number;
  nbLogesEng: number;
  capaciteEng: number;
}

const RACES_OPTIONS = ['Large White', 'Landrace', 'Duroc', 'Piétrain', 'Local', 'Hampshire'];

const DEFAULT_DATA: WizardData = {
  type: null,
  nbVerrats: 1,
  nbTruies: 10,
  races: [],
  raceAutre: '',
  nbLogesMat: 1,
  casesParLogeMat: 9,
  nbLogesPS: 1,
  capacitePS: 30,
  nbLogesEng: 2,
  capaciteEng: 25,
};

export default function OnboardingV2Wizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(DEFAULT_DATA);
  const [submitting, setSubmitting] = useState(false);

  const canNext = (() => {
    if (step === 1) return data.type !== null;
    if (step === 2) {
      // Engraisseur pur : pas de truies/verrats requis (achat porcelets).
      if (data.type === 'ENGRAISSEUR') return true;
      return data.nbVerrats > 0 && data.nbTruies > 0;
    }
    if (step === 3) return data.races.length > 0 || data.raceAutre.trim().length > 0;
    if (step === 4) {
      if (data.type === 'ENGRAISSEUR') {
        return data.nbLogesEng > 0 && data.capaciteEng > 0;
      }
      return (
        data.nbLogesMat > 0 &&
        data.casesParLogeMat > 0 &&
        (data.type === 'NAISSEUR' || (data.nbLogesPS > 0 && data.capacitePS > 0))
      );
    }
    return true;
  })();

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const farmId = user.id;
      const allRaces = [...data.races, ...(data.raceAutre.trim() ? [data.raceAutre.trim()] : [])];
      const isEngraisseurPur = data.type === 'ENGRAISSEUR';

      // 1. Truies T-001 → T-N (skip pour engraisseur pur)
      if (!isEngraisseurPur && data.nbTruies > 0) {
        const truies = Array.from({ length: data.nbTruies }, (_, i) => ({
          farm_id: farmId,
          code_id: `T-${String(i + 1).padStart(3, '0')}`,
          statut: 'En attente saillie',
          race: allRaces[0] ?? 'Local',
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: sowsErr } = await (supabase as any).from('sows').insert(truies);
        if (sowsErr) throw sowsErr;
      }

      // 2. Verrats V-001 → V-N (skip pour engraisseur pur)
      if (!isEngraisseurPur && data.nbVerrats > 0) {
        const verrats = Array.from({ length: data.nbVerrats }, (_, i) => ({
          farm_id: farmId,
          code_id: `V-${String(i + 1).padStart(3, '0')}`,
          statut: 'Actif',
          race: allRaces[0] ?? 'Local',
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: boarsErr } = await (supabase as any).from('boars').insert(verrats);
        if (boarsErr) throw boarsErr;
      }

      // 3. Cases maternité M-01 → M-N (skip pour engraisseur pur)
      const totalMat = isEngraisseurPur ? 0 : data.nbLogesMat * data.casesParLogeMat;
      if (!isEngraisseurPur && totalMat > 0) {
        const matLoges = Array.from({ length: totalMat }, (_, i) => ({
          farm_id: farmId,
          numero: `M-${String(i + 1).padStart(2, '0')}`,
          type: 'MATERNITE',
          repartition: 'NA',
          capacite_max: 1,
          active: true,
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: logesMatErr } = await (supabase as any).from('loges').insert(matLoges);
        if (logesMatErr) throw logesMatErr;
      }

      // 4. Loges post-sevrage PS-01 → PS-N (skip pour engraisseur pur)
      if (!isEngraisseurPur && data.nbLogesPS > 0) {
        const psLoges = Array.from({ length: data.nbLogesPS }, (_, i) => ({
          farm_id: farmId,
          numero: `PS-${String(i + 1).padStart(2, '0')}`,
          type: 'POST_SEVRAGE',
          repartition: 'MIXTE',
          capacite_max: data.capacitePS,
          active: true,
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: psErr } = await (supabase as any).from('loges').insert(psLoges);
        if (psErr) throw psErr;
      }

      // 5. Loges engraissement E-01 → E-N : engraisseur OU cycle complet.
      const needEng = data.type === 'NAISSEUR_ENGRAISSEUR' || isEngraisseurPur;
      if (needEng && data.nbLogesEng > 0) {
        const engLoges = Array.from({ length: data.nbLogesEng }, (_, i) => ({
          farm_id: farmId,
          numero: `E-${String(i + 1).padStart(2, '0')}`,
          type: 'ENGRAISSEMENT',
          repartition: 'MIXTE',
          capacite_max: data.capaciteEng,
          active: true,
        }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: engErr } = await (supabase as any).from('loges').insert(engLoges);
        if (engErr) throw engErr;
      }

      // 6. Marque farms.metadata : onboarding_v2 (rétro-compat) + profil V80
      // (source de vérité lue par readFarmProfile).
      const profileV80: FarmProfile = data.type
        ? PROFIL_OF_TYPE[data.type]
        : 'cycle_complet';
      const profile = {
        completed_at: new Date().toISOString(),
        version: 'v2',
        type: data.type,
        profil: profileV80,
        cheptel: {
          verrats: isEngraisseurPur ? 0 : data.nbVerrats,
          truies: isEngraisseurPur ? 0 : data.nbTruies,
        },
        races: allRaces,
        infrastructure: {
          mat_loges: isEngraisseurPur ? 0 : data.nbLogesMat,
          mat_cases_per_loge: isEngraisseurPur ? 0 : data.casesParLogeMat,
          mat_total_cases: totalMat,
          ps_loges: isEngraisseurPur ? 0 : data.nbLogesPS,
          ps_capacite: isEngraisseurPur ? 0 : data.capacitePS,
          eng_loges: needEng ? data.nbLogesEng : 0,
          eng_capacite: data.capaciteEng,
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: farmErr } = await (supabase as any)
        .from('farms')
        .update({ metadata: { onboarding_v2: profile, profil: profileV80, profilSetAt: new Date().toISOString() } })
        .eq('id', farmId);
      if (farmErr) throw farmErr;

      const summary = isEngraisseurPur
        ? `Élevage engraisseur créé · ${data.nbLogesEng} loges engraissement`
        : `Élevage créé · ${data.nbTruies} truies · ${data.nbVerrats} verrats · ${totalMat} cases mat`;
      showToast(summary, 'success', 4000);
      navigate('/today', { replace: true });
    } catch (e) {
      console.error('OnboardingV2 erreur:', e);
      showToast((e as Error).message ?? "Erreur lors de la création de l'élevage", 'error', 5000);
      setSubmitting(false);
    }
  };

  const stepLabels: Record<number, string> = {
    1: 'Type d’élevage',
    2: 'Cheptel actuel',
    3: 'Races présentes',
    4: 'Infrastructure',
    5: 'Confirmation',
  };

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="pt-screen">
          <header className="ph ph--primary">
            <div className="ph__row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ph__eyebrow">Configuration · Bienvenue</div>
                <h1 className="ph__h1">{stepLabels[step]}</h1>
                <p className="ph__sub">
                  2 minutes pour configurer ton élevage. Marius t&apos;accompagne dès la première
                  saisie.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <span className="step-pill" style={{ margin: 0 }}>
                Étape {step} / 5
              </span>
              <div
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: 4,
                }}
              >
                {[1, 2, 3, 4, 5].map((idx) => {
                  const isDone = idx < step;
                  const isNow = idx === step;
                  return (
                    <div
                      key={idx}
                      style={{
                        height: 3,
                        borderRadius: 99,
                        background: isDone
                          ? 'var(--pt-warm)'
                          : isNow
                            ? 'var(--pt-accent-light, var(--pt-accent))'
                            : 'rgba(245, 233, 216, 0.2)',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </header>
          <div
            className="phone-content"
            style={{ padding: '8px 24px 168px', maxWidth: 720, margin: '0 auto' }}
          >
            <p
              style={{
                fontSize: 13,
                color: 'var(--pt-muted)',
                margin: '12px 0 16px',
                lineHeight: 1.5,
              }}
            >
              Renseigne les infos demandées. Tu pourras les modifier ensuite depuis Réglages.
            </p>

          {/* ÉTAPE 1 : Type d'élevage — V80 P0 #1 : 3 profils */}
          {step === 1 && (
            <Card>
              <div style={{ padding: 16 }}>
                <Section label="TYPE D'ÉLEVAGE" />
                <p style={{ fontSize: 12, color: 'var(--pt-muted)', margin: '8px 0 0', lineHeight: 1.5 }}>
                  Adapte l&apos;app à ton métier. Tu pourras changer plus tard depuis Réglages › Ma ferme.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                  {([
                    { value: 'NAISSEUR' as ElevageType, emoji: '🤰', label: 'Naisseur', desc: 'Truies + saillies, vente porcelets sevrés (J28-63)' },
                    { value: 'ENGRAISSEUR' as ElevageType, emoji: '🐷', label: 'Engraisseur', desc: 'Achat porcelets, pesées, finition, vente carcasses' },
                    { value: 'NAISSEUR_ENGRAISSEUR' as ElevageType, emoji: '🔄', label: 'Cycle complet', desc: 'Naisseur + engraisseur — saillie → abattoir 110 kg' },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setData((d) => ({ ...d, type: opt.value }))}
                      className="radio-card"
                      data-pt-profile-card={opt.value}
                      style={{
                        textAlign: 'left',
                        padding: 16,
                        borderRadius: 12,
                        border: data.type === opt.value ? '2px solid var(--pt-primary)' : '1px solid var(--pt-line-strong)',
                        background: data.type === opt.value ? 'var(--pt-warm)' : 'var(--pt-bg)',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: 12,
                        alignItems: 'flex-start',
                      }}
                    >
                      <span aria-hidden style={{ fontSize: 24, lineHeight: 1, marginTop: 2 }}>{opt.emoji}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{opt.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--pt-muted)' }}>{opt.desc}</div>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* ÉTAPE 2 : Cheptel — masqué pour engraisseur pur */}
          {step === 2 && data.type === 'ENGRAISSEUR' && (
            <Card>
              <div style={{ padding: 16 }}>
                <Section label="CHEPTEL ACTUEL" />
                <p style={{ fontSize: 13, color: 'var(--pt-muted)', margin: '12px 0 0', lineHeight: 1.5 }}>
                  Profil engraisseur : pas de truies ni verrats — tu achètes des porcelets
                  sevrés à des naisseurs. Tu pourras gérer tes <strong>lots reçus</strong> depuis
                  l&apos;onglet LOTS.
                </p>
              </div>
            </Card>
          )}
          {step === 2 && data.type !== 'ENGRAISSEUR' && (
            <Card>
              <div style={{ padding: 16 }}>
                <Section label="CHEPTEL ACTUEL" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
                  <NumberField
                    label="Nombre de verrats actifs"
                    value={data.nbVerrats}
                    min={1}
                    max={50}
                    onChange={(v) => setData((d) => ({ ...d, nbVerrats: v }))}
                  />
                  <NumberField
                    label="Nombre de truies actives"
                    value={data.nbTruies}
                    min={1}
                    max={500}
                    onChange={(v) => setData((d) => ({ ...d, nbTruies: v }))}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* ÉTAPE 3 : Races */}
          {step === 3 && (
            <Card>
              <div style={{ padding: 16 }}>
                <Section label="RACES PRÉSENTES" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                  {RACES_OPTIONS.map((race) => (
                    <label key={race} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8, background: 'var(--pt-bg)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={data.races.includes(race)}
                        onChange={(e) => {
                          if (e.target.checked) setData((d) => ({ ...d, races: [...d.races, race] }));
                          else setData((d) => ({ ...d, races: d.races.filter((r) => r !== race) }));
                        }}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontSize: 14 }}>{race}</span>
                    </label>
                  ))}
                  <input
                    type="text"
                    placeholder="Autre race (optionnel)"
                    value={data.raceAutre}
                    onChange={(e) => setData((d) => ({ ...d, raceAutre: e.target.value }))}
                    style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--pt-line-strong)', fontSize: 14 }}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* ÉTAPE 4 : Infrastructure — V80 adapté au profil */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Maternité + Post-sevrage : masqués pour engraisseur pur */}
              {data.type !== 'ENGRAISSEUR' && (
                <>
                  <Card>
                    <div style={{ padding: 16 }}>
                      <Section label="MATERNITÉ" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                        <NumberField label="Nombre de loges/salles MB" value={data.nbLogesMat} min={1} max={50} onChange={(v) => setData((d) => ({ ...d, nbLogesMat: v }))} />
                        <NumberField label="Cases par loge maternité" value={data.casesParLogeMat} min={1} max={30} onChange={(v) => setData((d) => ({ ...d, casesParLogeMat: v }))} />
                        <div style={{ fontSize: 12, color: 'var(--pt-muted)' }}>
                          Total : <strong>{data.nbLogesMat * data.casesParLogeMat} cases</strong> (1 case = 1 truie + sa portée)
                        </div>
                      </div>
                    </div>
                  </Card>
                  <Card>
                    <div style={{ padding: 16 }}>
                      <Section label="POST-SEVRAGE" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                        <NumberField label="Nombre de loges PS" value={data.nbLogesPS} min={0} max={20} onChange={(v) => setData((d) => ({ ...d, nbLogesPS: v }))} />
                        <NumberField label="Capacité par loge PS" value={data.capacitePS} min={1} max={200} onChange={(v) => setData((d) => ({ ...d, capacitePS: v }))} />
                      </div>
                    </div>
                  </Card>
                </>
              )}
              {(data.type === 'NAISSEUR_ENGRAISSEUR' || data.type === 'ENGRAISSEUR') && (
                <Card>
                  <div style={{ padding: 16 }}>
                    <Section label="ENGRAISSEMENT" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                      <NumberField label="Nombre de loges Eng" value={data.nbLogesEng} min={0} max={20} onChange={(v) => setData((d) => ({ ...d, nbLogesEng: v }))} />
                      <NumberField label="Capacité par loge Eng" value={data.capaciteEng} min={1} max={100} onChange={(v) => setData((d) => ({ ...d, capaciteEng: v }))} />
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ÉTAPE 5 : Confirmation — V80 récap adapté au profil */}
          {step === 5 && (
            <Card>
              <div style={{ padding: 16 }}>
                <Section label="RÉCAPITULATIF" tone="accent" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, fontSize: 14 }}>
                  <Recap
                    label="Type"
                    value={
                      data.type === 'NAISSEUR'
                        ? 'Naisseur'
                        : data.type === 'ENGRAISSEUR'
                          ? 'Engraisseur'
                          : 'Cycle complet'
                    }
                  />
                  {data.type !== 'ENGRAISSEUR' && (
                    <Recap label="Cheptel" value={`${data.nbTruies} truies + ${data.nbVerrats} verrats`} />
                  )}
                  <Recap label="Races" value={[...data.races, ...(data.raceAutre.trim() ? [data.raceAutre.trim()] : [])].join(', ')} />
                  {data.type !== 'ENGRAISSEUR' && (
                    <>
                      <Recap label="Maternité" value={`${data.nbLogesMat} loge${data.nbLogesMat > 1 ? 's' : ''} × ${data.casesParLogeMat} cases = ${data.nbLogesMat * data.casesParLogeMat} cases`} />
                      <Recap label="Post-sevrage" value={data.nbLogesPS > 0 ? `${data.nbLogesPS} loge${data.nbLogesPS > 1 ? 's' : ''} × ${data.capacitePS} porcelets` : '—'} />
                    </>
                  )}
                  {(data.type === 'NAISSEUR_ENGRAISSEUR' || data.type === 'ENGRAISSEUR') && (
                    <Recap label="Engraissement" value={data.nbLogesEng > 0 ? `${data.nbLogesEng} loge${data.nbLogesEng > 1 ? 's' : ''} × ${data.capaciteEng}` : '—'} />
                  )}
                </div>
                <div className="alert-card--info" style={{ marginTop: 16 }}>
                  <div className="alert-card__body">
                    {data.type === 'ENGRAISSEUR' ? (
                      <>
                        À la confirmation, on crée <strong>{data.nbLogesEng}</strong> loge
                        {data.nbLogesEng > 1 ? 's' : ''} engraissement. Tu pourras enregistrer
                        ton premier lot reçu depuis l&apos;onglet LOTS.
                      </>
                    ) : (
                      <>
                        À la confirmation, on crée automatiquement : <strong>{data.nbTruies}</strong>{' '}
                        truies (T-001 à T-{String(data.nbTruies).padStart(3, '0')}),{' '}
                        <strong>{data.nbVerrats}</strong> verrats,{' '}
                        <strong>{data.nbLogesMat * data.casesParLogeMat}</strong> cases maternité,{' '}
                        <strong>{data.nbLogesPS}</strong> loges post-sevrage
                        {data.type === 'NAISSEUR_ENGRAISSEUR'
                          ? `, ${data.nbLogesEng} loges engraissement`
                          : ''}
                        .
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, position: 'sticky', bottom: 24 }}>
            {step > 1 && (
              <Button variant="secondary" onClick={() => setStep((s) => s - 1)} disabled={submitting} ariaLabel="Précédent">
                <ChevronLeft size={14} aria-hidden /> Précédent
              </Button>
            )}
            {step < 5 ? (
              <Button
                variant="primary"
                className="btn btn--primary btn--lg btn--block"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
                ariaLabel="Suivant"
                style={{ flex: 1, opacity: !canNext ? 0.5 : 1 }}
              >
                Suivant <ChevronRight size={14} aria-hidden />
              </Button>
            ) : (
              <Button
                variant="primary"
                className="btn btn--primary btn--lg btn--block"
                onClick={handleSubmit}
                disabled={submitting}
                ariaLabel="Créer mon élevage"
                style={{ flex: 1, opacity: submitting ? 0.5 : 1 }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" aria-hidden /> Création…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} aria-hidden /> Créer mon élevage
                  </>
                )}
              </Button>
            )}
          </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

// ── Sous-composants ──

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min?: number; max?: number; onChange: (v: number) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--pt-muted)' }}>
        {label}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--pt-line-strong)', fontSize: 16, background: 'var(--pt-bg)' }}
      />
    </label>
  );
}

function Recap({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--pt-line)' }}>
      <span style={{ color: 'var(--pt-muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}
