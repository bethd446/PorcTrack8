/**
 * TroupeauVerratsView — Vue dédiée aux verrats de la ferme
 * ══════════════════════════════════════════════════════════════════════════
 * Complément du `CheptelView` (tab VERRAT) et du `AnimalDetailView` — ici on
 * affiche une vue optimisée "carte par verrat" (2 verrats attendus en prod :
 * V01 Bobi, V02 Aligator). La densité < 5 lignes favorise une carte riche :
 * chips statut, meta multi-ligne, CTA "Saisir saillie avec ce verrat".
 *
 * Props : aucune. Consomme `useFarm()` directement.
 *
 * Routes de destination :
 *   - Card click → /troupeau/verrats/:id (détail)
 *   - CTA saillie → /troupeau/verrats/:id?action=saillie (le détail gère l'ouverture)
 */

import React, { useMemo, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';

import AgritechHeader from '../../components/AgritechHeader';
import AgritechLayout from '../../components/AgritechLayout';
import { VerratIcon } from '../../components/icons';
import { Chip, SectionDivider, type ChipTone } from '../../components/agritech';
import QuickSaillieForm from '../../components/forms/QuickSaillieForm';
import { useFarm } from '../../context/FarmContext';
import type { Verrat, Saillie } from '../../types/farm';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Normalise le statut d'un verrat : 'ACTIF' | 'REFORME' | 'INCONNU'.
 * Verrat.statut est un `VerratStatut` (string tolérant), donc regex safe.
 */
function normaliseVerratStatut(statut: string | undefined): 'ACTIF' | 'REFORME' | 'INCONNU' {
  if (!statut) return 'INCONNU';
  if (/r[ée]form/i.test(statut)) return 'REFORME';
  if (/actif/i.test(statut)) return 'ACTIF';
  return 'INCONNU';
}

function statutTone(statut: string | undefined): ChipTone {
  switch (normaliseVerratStatut(statut)) {
    case 'ACTIF':   return 'accent';
    case 'REFORME': return 'red';
    default:        return 'default';
  }
}

/** dd/MM/yyyy ou ISO → Date | null. */
function parseSaillieDate(s: string | undefined): Date | null {
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (fr) {
    const d = new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = Date.parse(s);
  if (Number.isNaN(iso)) return null;
  return new Date(iso);
}

function formatDateFr(s: string | undefined): string {
  const d = parseSaillieDate(s);
  if (!d) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Compte les saillies du mois courant (mois civil, pas roulant-30j).
 * Tolère dateSaillie manquante.
 */
function countSailliesThisMonth(saillies: Saillie[], now: Date): number {
  const y = now.getFullYear();
  const m = now.getMonth();
  return saillies.reduce((n, s) => {
    const d = parseSaillieDate(s.dateSaillie);
    if (!d) return n;
    return d.getFullYear() === y && d.getMonth() === m ? n + 1 : n;
  }, 0);
}

// ─── Composant ──────────────────────────────────────────────────────────────

const TroupeauVerratsView: React.FC = () => {
  const navigate = useNavigate();
  const { verrats, saillies } = useFarm();
  const [sheetVerratId, setSheetVerratId] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);

  /** Index saillies par verratId (id ou displayId). */
  const sailliesByVerrat = useMemo(() => {
    const idx = new Map<string, Saillie[]>();
    for (const s of saillies) {
      const key = s.verratId;
      if (!key) continue;
      const bucket = idx.get(key);
      if (bucket) bucket.push(s);
      else idx.set(key, [s]);
    }
    return idx;
  }, [saillies]);

  const totalSaillies = saillies.length;
  const sailliesCeMois = useMemo(() => countSailliesThisMonth(saillies, now), [saillies, now]);

  /** Tri : actifs d'abord, puis par displayId. */
  const sortedVerrats = useMemo(() => {
    return [...verrats].sort((a, b) => {
      const aActif = normaliseVerratStatut(a.statut) === 'ACTIF' ? 0 : 1;
      const bActif = normaliseVerratStatut(b.statut) === 'ACTIF' ? 0 : 1;
      if (aActif !== bActif) return aActif - bActif;
      return a.displayId.localeCompare(b.displayId, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });
  }, [verrats]);

  const goToDetail = (v: Verrat): void => {
    navigate(`/troupeau/verrats/${v.id}`);
  };

  const openSaillieFor = (v: Verrat): void => {
    // QuickSaillieForm ne supporte pas prefill → on ouvre depuis ici mais on
    // guide l'utilisateur (tri verrats avec celui-ci d'abord implicitement).
    // Fallback simple : si le form n'est pas accessible, on pourrait
    // navigate(`/troupeau/verrats/${v.id}`). Ici on ouvre le sheet.
    setSheetVerratId(v.displayId);
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <AgritechHeader
            title="VERRATS"
            subtitle={`${verrats.length} enregistré${verrats.length > 1 ? 's' : ''}`}
            backTo="/troupeau"
          />

          <div className="px-4 pt-4 pb-32 flex flex-col gap-5">
            {/* ── Summary strip ──────────────────────────────────────── */}
            <section
              role="region"
              aria-label="Résumé verrats"
              className="card-dense flex items-center justify-between gap-3 py-3"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="kpi-label">Verrats</span>
                <span className="font-mono tabular-nums text-[15px] font-bold text-text-0">
                  {verrats.length}
                </span>
              </div>
              <div className="h-8 w-px bg-border shrink-0" aria-hidden="true" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="kpi-label">Saillies totales</span>
                <span className="font-mono tabular-nums text-[15px] font-bold text-text-0">
                  {totalSaillies}
                </span>
              </div>
              <div className="h-8 w-px bg-border shrink-0" aria-hidden="true" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="kpi-label">Ce mois</span>
                <span className="font-mono tabular-nums text-[15px] font-bold text-text-0">
                  {sailliesCeMois}
                </span>
              </div>
            </section>

            {/* ── Liste verrats ──────────────────────────────────────── */}
            {verrats.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 px-8 text-center animate-fade-in-up"
                role="status"
              >
                <div className="w-20 h-20 rounded-2xl bg-bg-1 border border-border flex items-center justify-center mb-4 text-text-2">
                  <VerratIcon size={48} />
                </div>
                <h3 className="ft-heading text-text-0 text-[18px] mb-2 uppercase tracking-wide">
                  Aucun verrat enregistré
                </h3>
                <p className="text-text-2 text-[13px] max-w-xs leading-relaxed">
                  Les verrats de la ferme apparaîtront ici dès qu'ils seront
                  saisis dans la feuille VERRATS.
                </p>
              </div>
            ) : (
              <section
                role="region"
                aria-label="Liste des verrats"
                className="flex flex-col gap-3"
              >
                <SectionDivider label={`Verrats · ${sortedVerrats.length}`} />

                {sortedVerrats.map((v) => {
                  const vSaillies = sailliesByVerrat.get(v.displayId)
                    ?? sailliesByVerrat.get(v.id)
                    ?? [];
                  const nbSaillies = vSaillies.length;
                  const derniere = vSaillies
                    .map((s) => parseSaillieDate(s.dateSaillie))
                    .filter((d): d is Date => d !== null)
                    .sort((a, b) => b.getTime() - a.getTime())[0];

                  const statutLabel = v.statut || '—';
                  const tone = statutTone(v.statut);
                  const displayId = v.displayId || v.id;
                  const nomPart = v.nom ? ` · ${v.nom}` : '';
                  const title = `${displayId}${nomPart}`;

                  return (
                    <VerratCard
                      key={v.id}
                      title={title}
                      displayId={displayId}
                      statutLabel={statutLabel}
                      statutTone={tone}
                      boucle={v.boucle}
                      origine={v.origine}
                      ration={v.ration}
                      alimentation={v.alimentation}
                      nbSaillies={nbSaillies}
                      derniereDate={derniere ? formatDateFr(
                        `${String(derniere.getDate()).padStart(2, '0')}/${String(derniere.getMonth() + 1).padStart(2, '0')}/${derniere.getFullYear()}`,
                      ) : null}
                      onCardClick={() => goToDetail(v)}
                      onSaillieClick={() => openSaillieFor(v)}
                    />
                  );
                })}
              </section>
            )}
          </div>
        </AgritechLayout>
      </IonContent>

      {/* QuickSaillieForm ne supporte pas prefill verratId — on l'ouvre
          simplement ; l'utilisateur devra re-sélectionner le verrat. */}
      <QuickSaillieForm
        isOpen={sheetVerratId !== null}
        onClose={() => setSheetVerratId(null)}
      />
    </IonPage>
  );
};

// ─── Sous-composants ────────────────────────────────────────────────────────

interface VerratCardProps {
  title: string;
  displayId: string;
  statutLabel: string;
  statutTone: ChipTone;
  boucle?: string;
  origine?: string;
  ration?: number;
  alimentation?: string;
  nbSaillies: number;
  derniereDate: string | null;
  onCardClick: () => void;
  onSaillieClick: () => void;
}

const VerratCard: React.FC<VerratCardProps> = ({
  title,
  displayId,
  statutLabel,
  statutTone,
  boucle,
  origine,
  ration,
  alimentation,
  nbSaillies,
  derniereDate,
  onCardClick,
  onSaillieClick,
}) => {
  const meta1 = `Boucle: ${boucle || '—'} · Origine: ${origine || '—'}`;
  const meta2 = `Ration: ${typeof ration === 'number' && ration > 0 ? `${ration} kg/j` : '—'} · Alimentation: ${alimentation || '—'}`;
  const statsLabel = nbSaillies > 0
    ? `${nbSaillies} saillie${nbSaillies > 1 ? 's' : ''}${derniereDate ? ` · dernière ${derniereDate}` : ''}`
    : 'Aucune saillie enregistrée';

  return (
    <div className="card-dense !p-0 overflow-hidden">
      {/* Zone cliquable (hors CTA) */}
      <button
        type="button"
        onClick={onCardClick}
        aria-label={`Voir le détail de ${displayId}`}
        className="pressable w-full text-left flex items-start gap-3 px-4 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
      >
        <div className="w-11 h-11 rounded-md bg-bg-2 border border-border flex items-center justify-center shrink-0 text-accent">
          <VerratIcon size={28} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="ft-heading text-[16px] text-text-0 leading-tight uppercase tracking-wide">
              {title}
            </div>
            <Chip label={statutLabel} tone={statutTone} size="xs" />
          </div>
          <div className="font-mono text-[11px] text-text-2 leading-relaxed">
            {meta1}
          </div>
          <div className="font-mono text-[11px] text-text-2 leading-relaxed">
            {meta2}
          </div>
          <div className="font-mono text-[11px] text-text-1 tabular-nums mt-0.5">
            {statsLabel}
          </div>
        </div>
      </button>

      {/* CTA ghost bas de carte */}
      <div className="px-4 pb-3 pt-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSaillieClick();
          }}
          aria-label={`Saisir une saillie avec le verrat ${displayId}`}
          className="pressable w-full inline-flex items-center justify-center gap-2 h-10 rounded-md border border-border bg-bg-1 text-text-1 hover:border-accent hover:text-accent font-mono text-[11px] uppercase tracking-wide transition-colors duration-[160ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          <Heart size={14} aria-hidden="true" />
          Saisir saillie avec ce verrat
        </button>
      </div>
    </div>
  );
};

export default TroupeauVerratsView;
