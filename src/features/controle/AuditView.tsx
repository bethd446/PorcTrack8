import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  IonPage, IonContent, IonSpinner, IonRefresher, IonRefresherContent,
} from '@ionic/react';
import { CheckCircle2, AlertTriangle, Package, Heart, Layers, Pill } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getBandes,
  getTruies,
  getStockAliments,
  getJournalSante,
  getStockVeto,
} from '../../services/supabaseService';
import AgritechLayout from '../../components/AgritechLayout';
import TopBarSync from '../../components/design/TopBarSync';
import { AlertGroup, AlertRow, SectionHeader, Tabs } from '../../components/design-system';

/**
 * AuditView — V31-FIX-PACK-01
 * ════════════════════════════════════════════════════════════════════════════
 * Refonte complète de la page /audit. Migre du rendu "carte par alerte avec
 * UUID visible" vers un rendu groupé en AlertGroup + AlertRow alignés sur le
 * Design System V30/V31 (--pt-* tokens, DNA "Aujourd'hui").
 *
 * Sectioning :
 *   - CRITIQUES (severity urgent · bordure rouge)
 *   - À SURVEILLER (severity surveil · bordure orange)
 *
 * Catégories d'alertes (groupées par AlertGroup) :
 *   1. Stocks véto en rupture           → urgent
 *   2. Stocks véto bas                  → surveil
 *   3. Stocks aliments critiques        → urgent (rupture) / surveil (bas)
 *   4. Bandes — anomalies               → urgent (mortalité, retard sevrage)
 *                                       → surveil (portée faible, incohérence)
 *   5. Truies — gestation prolongée     → urgent
 *   6. Santé — cibles manquantes        → surveil
 *
 * UUIDs : aucun n'est rendu dans le DOM textuel. Pour les stocks, on utilise
 * `libelle` / `produit`. Pour les bandes, `idPortee` (code_id lisible). Pour
 * les truies, `displayId`. Pour santé, le label "type de soin".
 */

type CategoryKey = 'ALL' | 'CRITIQUE' | 'STOCK' | 'SANTE';

interface VetoIssue { name: string; type?: string; value: number; unit: string; statut: 'RUPTURE' | 'BAS' }
interface AlimentIssue { name: string; value: number; unit: string; statut: 'RUPTURE' | 'BAS' }
interface BandeIssue { code: string; kind: 'mortalite' | 'retard-sevrage' | 'portee-faible' | 'incoherence' | 'date-illogique' | 'erreur-saisie'; detail: string; severity: 'urgent' | 'surveil' }
interface TruieIssue { code: string; daysLate: number }
interface SanteIssue { typeSoin: string }

interface AuditState {
  vetoRupture: VetoIssue[];
  vetoBas: VetoIssue[];
  alimentsRupture: AlimentIssue[];
  alimentsBas: AlimentIssue[];
  bandesUrgent: BandeIssue[];
  bandesSurveil: BandeIssue[];
  truiesRetard: TruieIssue[];
  santeMissing: SanteIssue[];
}

const EMPTY_AUDIT: AuditState = {
  vetoRupture: [],
  vetoBas: [],
  alimentsRupture: [],
  alimentsBas: [],
  bandesUrgent: [],
  bandesSurveil: [],
  truiesRetard: [],
  santeMissing: [],
};

const AuditView: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState<AuditState>(EMPTY_AUDIT);
  const [filter, setFilter] = useState<CategoryKey>('ALL');

  const runAudit = useCallback(async (): Promise<void> => {
    setLoading(true);
    const next: AuditState = {
      vetoRupture: [],
      vetoBas: [],
      alimentsRupture: [],
      alimentsBas: [],
      bandesUrgent: [],
      bandesSurveil: [],
      truiesRetard: [],
      santeMissing: [],
    };

    try {
      const [bandeRes, truieRes, stockRes, healthRes, vetoRes] = await Promise.all([
        getBandes(),
        getTruies(),
        getStockAliments(),
        getJournalSante(),
        getStockVeto(),
      ]);

      // 1. Bandes — agrégation par type d'incohérence
      if (bandeRes.success) {
        bandeRes.data.forEach(b => {
          const code = b.idPortee; // code_id lisible (pas l'UUID)
          const morts = b.morts ?? 0;
          const nv = b.nv ?? 0;
          const vivants = b.vivants ?? 0;
          const sp = b.dateSevragePrevue;
          const sr = b.dateSevrageReelle;
          const mb = b.dateMB;

          if (morts > 0) {
            next.bandesUrgent.push({
              code, kind: 'mortalite',
              detail: `${morts} porcelet(s) mort(s)`, severity: 'urgent',
            });
          }
          if (morts > nv) {
            next.bandesUrgent.push({
              code, kind: 'erreur-saisie',
              detail: `Morts (${morts}) > NV (${nv})`, severity: 'urgent',
            });
          }
          if (vivants !== (nv - morts)) {
            next.bandesSurveil.push({
              code, kind: 'incoherence',
              detail: `Vivants (${vivants}) ≠ NV-Morts`, severity: 'surveil',
            });
          }
          if (nv < 5 && nv > 0) {
            next.bandesSurveil.push({
              code, kind: 'portee-faible',
              detail: `${nv} nés vivants`, severity: 'surveil',
            });
          }
          if (sp && mb) {
            const spDate = new Date(sp);
            const mbDate = new Date(mb);
            if (!isNaN(spDate.getTime()) && !isNaN(mbDate.getTime()) && spDate < mbDate) {
              next.bandesUrgent.push({
                code, kind: 'date-illogique',
                detail: 'Sevrage prévu avant MB', severity: 'urgent',
              });
            }
          }
          if (sp && !sr) {
            const spDate = new Date(sp);
            if (!isNaN(spDate.getTime()) && spDate < new Date()) {
              next.bandesUrgent.push({
                code, kind: 'retard-sevrage',
                detail: 'Date sevrage dépassée', severity: 'urgent',
              });
            }
          }
        });
      }

      // 2. Truies — gestation prolongée
      if (truieRes.success) {
        truieRes.data.forEach(t => {
          const code = t.displayId;
          const mb = t.dateMBPrevue;
          const statut = String(t.statut ?? '').toUpperCase();
          if (mb && (statut.includes('GESTANTE') || statut.includes('ATTENTE') || statut.includes('PLEINE'))) {
            const mbDate = new Date(mb);
            if (!isNaN(mbDate.getTime())) {
              const diffDays = Math.floor((Date.now() - mbDate.getTime()) / 86_400_000);
              if (diffDays > 3) next.truiesRetard.push({ code, daysLate: diffDays });
            }
          }
        });
      }

      // 3. Stocks Aliments
      if (stockRes.success) {
        stockRes.data.forEach(s => {
          if (s.stockActuel <= 0) {
            next.alimentsRupture.push({
              name: s.libelle, value: s.stockActuel, unit: s.unite || 'kg', statut: 'RUPTURE',
            });
          } else if (s.stockActuel < 100) {
            next.alimentsBas.push({
              name: s.libelle, value: s.stockActuel, unit: s.unite || 'kg', statut: 'BAS',
            });
          }
        });
      }

      // 4. Stocks Véto
      if (vetoRes.success) {
        vetoRes.data.forEach(v => {
          if (v.statutStock === 'RUPTURE') {
            next.vetoRupture.push({
              name: v.produit, type: v.type, value: v.stockActuel, unit: v.unite || 'doses', statut: 'RUPTURE',
            });
          } else if (v.statutStock === 'BAS') {
            next.vetoBas.push({
              name: v.produit, type: v.type, value: v.stockActuel, unit: v.unite || 'doses', statut: 'BAS',
            });
          }
        });
      }

      // 5. Santé — cibles manquantes
      if (healthRes.success) {
        healthRes.data.forEach(row => {
          if (row.cibleType && row.cibleType !== 'GENERAL' && (!row.cibleId || row.cibleId === 'N/A')) {
            next.santeMissing.push({ typeSoin: row.typeSoin });
          }
        });
      }

      setAudit(next);
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

  // Compteurs
  const counts = useMemo(() => {
    const critiques = audit.vetoRupture.length
      + audit.alimentsRupture.length
      + audit.bandesUrgent.length
      + audit.truiesRetard.length;
    const stocks = audit.vetoBas.length + audit.alimentsBas.length;
    const sante = audit.santeMissing.length + audit.bandesSurveil.length;
    return {
      critiques,
      stocks,
      sante,
      total: critiques + stocks + sante,
    };
  }, [audit]);

  const tabItems = useMemo(() => [
    { id: 'ALL' as const, label: 'Toutes', count: counts.total },
    { id: 'CRITIQUE' as const, label: 'Critiques', count: counts.critiques },
    { id: 'STOCK' as const, label: 'Stocks', count: counts.stocks },
    { id: 'SANTE' as const, label: 'Santé', count: counts.sante },
  ], [counts]);

  // Helpers d'affichage
  const showCritique = filter === 'ALL' || filter === 'CRITIQUE';
  const showStock = filter === 'ALL' || filter === 'STOCK';
  const showSante = filter === 'ALL' || filter === 'SANTE';

  const hasCritique = counts.critiques > 0 && showCritique;
  const hasSurveil = (counts.stocks > 0 && showStock) || (counts.sante > 0 && showSante);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout withNav={true}>
          <TopBarSync
            crumbs={['Outils', 'Audit du jour']}
            onMariusClick={() => window.dispatchEvent(new CustomEvent('open-chatbot'))}
          />

          <IonRefresher
            slot="fixed"
            onIonRefresh={e => runAudit().then(() => e.detail.complete())}
          >
            <IonRefresherContent />
          </IonRefresher>

          <div
            className="px-4 pt-5 pb-32 flex flex-col gap-6"
            style={{ maxWidth: 900, margin: '0 auto' }}
          >
            {/* HEADER ─────────────────────────────────────────────────── */}
            <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span
                style={{
                  fontFamily: 'var(--pt-font-body)',
                  fontSize: 'var(--pt-text-label)',
                  letterSpacing: 'var(--pt-tracking-label)',
                  textTransform: 'uppercase',
                  color: 'var(--pt-text-subtle)',
                  fontWeight: 600,
                }}
              >
                Outils · Audit du jour
              </span>
              <h1
                style={{
                  margin: 0,
                  fontFamily: 'var(--pt-font-display)',
                  fontSize: 'var(--pt-text-display)',
                  fontWeight: 700,
                  lineHeight: 1.05,
                  letterSpacing: '-0.02em',
                  color: 'var(--pt-text)',
                }}
              >
                Audit du jour
              </h1>
              {!loading && counts.total > 0 ? (
                <div
                  style={{
                    fontFamily: 'var(--pt-font-body)',
                    fontSize: 14,
                    color: 'var(--pt-text-muted)',
                    marginTop: 2,
                  }}
                >
                  <span style={{ color: counts.critiques > 0 ? 'var(--pt-danger)' : 'var(--pt-text-muted)', fontWeight: 600 }}>
                    {counts.critiques} critique{counts.critiques > 1 ? 's' : ''}
                  </span>
                  {' · '}
                  <span style={{ color: 'var(--pt-accent)', fontWeight: 600 }}>
                    {counts.stocks} stock{counts.stocks > 1 ? 's' : ''} bas
                  </span>
                  {' · '}
                  <span style={{ color: 'var(--pt-text)', fontWeight: 600 }}>
                    {counts.sante} santé
                  </span>
                </div>
              ) : null}
            </header>

            {/* TABS FILTRES ──────────────────────────────────────────── */}
            {!loading && counts.total > 0 ? (
              <div style={{ overflowX: 'auto', margin: '0 -4px', padding: '0 4px' }}>
                <Tabs
                  items={tabItems}
                  value={filter}
                  onChange={(id: string) => setFilter(id as CategoryKey)}
                  ariaLabel="Filtres audit"
                />
              </div>
            ) : null}

            {/* LOADING ───────────────────────────────────────────────── */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <IonSpinner name="crescent" style={{ color: 'var(--pt-primary)' }} />
                <p
                  style={{
                    marginTop: 12,
                    fontFamily: 'var(--pt-font-body)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: 'var(--pt-tracking-label)',
                    color: 'var(--pt-text-subtle)',
                  }}
                >
                  Analyse transversale…
                </p>
              </div>
            ) : counts.total === 0 ? (
              <section
                aria-label="Registre intègre"
                style={{
                  background: 'var(--pt-surface)',
                  borderRadius: 'var(--pt-radius-lg)',
                  boxShadow: 'var(--pt-shadow-card)',
                  padding: 'var(--pt-space-7) var(--pt-space-5)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 64, height: 64, borderRadius: 16,
                    background: 'rgba(45, 74, 31, 0.10)',
                    color: 'var(--pt-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 'var(--pt-space-4)',
                  }}
                >
                  <CheckCircle2 size={32} />
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: 'var(--pt-font-display)',
                    fontSize: 'var(--pt-text-h2)',
                    fontWeight: 700,
                    color: 'var(--pt-text)',
                    textTransform: 'uppercase',
                  }}
                >
                  Registre intègre
                </h3>
                <p
                  style={{
                    marginTop: 8,
                    fontFamily: 'var(--pt-font-body)',
                    fontSize: 13,
                    color: 'var(--pt-text-muted)',
                    maxWidth: 320,
                    lineHeight: 1.5,
                  }}
                >
                  Aucune incohérence majeure détectée dans les bases de données actuelles.
                </p>
              </section>
            ) : (
              <>
                {/* SECTION CRITIQUES ─────────────────────────────────── */}
                {hasCritique ? (
                  <>
                    <SectionHeader label="Critiques" tone="accent" />

                    {showCritique && audit.vetoRupture.length > 0 ? (
                      <AlertGroup
                        icon={<Pill size={20} aria-hidden="true" />}
                        title="Stocks véto en rupture"
                        subtitle={`${audit.vetoRupture.length} produit${audit.vetoRupture.length > 1 ? 's' : ''} à recommander`}
                        severity="urgent"
                        count={audit.vetoRupture.length}
                        action={{
                          label: 'VOIR LE STOCK',
                          onClick: () => navigate('/ressources/pharmacie'),
                        }}
                      >
                        {audit.vetoRupture.map((v, i) => (
                          <AlertRow
                            key={`vrup-${i}-${v.name}`}
                            primary={v.name}
                            secondary={v.type}
                            value={String(v.value)}
                            unit={v.unit}
                            valueDanger
                          />
                        ))}
                      </AlertGroup>
                    ) : null}

                    {showCritique && audit.alimentsRupture.length > 0 ? (
                      <AlertGroup
                        icon={<Package size={20} aria-hidden="true" />}
                        title="Aliments en rupture"
                        subtitle={`${audit.alimentsRupture.length} aliment${audit.alimentsRupture.length > 1 ? 's' : ''} à recommander`}
                        severity="urgent"
                        count={audit.alimentsRupture.length}
                        action={{
                          label: 'VOIR LE STOCK',
                          onClick: () => navigate('/ressources/aliments'),
                        }}
                      >
                        {audit.alimentsRupture.map((s, i) => (
                          <AlertRow
                            key={`arup-${i}-${s.name}`}
                            primary={s.name}
                            value={String(s.value)}
                            unit={s.unit}
                            valueDanger
                          />
                        ))}
                      </AlertGroup>
                    ) : null}

                    {showCritique && audit.bandesUrgent.length > 0 ? (
                      <AlertGroup
                        icon={<Layers size={20} aria-hidden="true" />}
                        title="Bandes — anomalies"
                        subtitle={`${audit.bandesUrgent.length} incohérence${audit.bandesUrgent.length > 1 ? 's' : ''} sur portées`}
                        severity="urgent"
                        count={audit.bandesUrgent.length}
                        action={{
                          label: 'VOIR LES BANDES',
                          onClick: () => navigate('/troupeau?view=bandes'),
                        }}
                      >
                        {audit.bandesUrgent.map((b, i) => (
                          <AlertRow
                            key={`bu-${i}-${b.code}-${b.kind}`}
                            primary={b.code}
                            secondary={b.detail}
                            value="!"
                            valueDanger
                            onClick={() => navigate(`/troupeau/bandes/${b.code}`)}
                          />
                        ))}
                      </AlertGroup>
                    ) : null}

                    {showCritique && audit.truiesRetard.length > 0 ? (
                      <AlertGroup
                        icon={<Heart size={20} aria-hidden="true" />}
                        title="Truies — gestation prolongée"
                        subtitle={`${audit.truiesRetard.length} truie${audit.truiesRetard.length > 1 ? 's' : ''} en retard`}
                        severity="urgent"
                        count={audit.truiesRetard.length}
                      >
                        {audit.truiesRetard.map((t, i) => (
                          <AlertRow
                            key={`tr-${i}-${t.code}`}
                            primary={t.code}
                            secondary="Mise-bas en retard"
                            value={`+${t.daysLate}`}
                            unit="j"
                            valueDanger
                            onClick={() => navigate(`/troupeau/truies/${t.code}`)}
                          />
                        ))}
                      </AlertGroup>
                    ) : null}
                  </>
                ) : null}

                {/* SECTION À SURVEILLER ──────────────────────────────── */}
                {hasSurveil ? (
                  <>
                    <SectionHeader label="À surveiller" tone="primary" />

                    {showStock && audit.vetoBas.length > 0 ? (
                      <AlertGroup
                        icon={<Pill size={20} aria-hidden="true" />}
                        title="Stocks véto bas"
                        subtitle={`${audit.vetoBas.length} produit${audit.vetoBas.length > 1 ? 's' : ''} sous le seuil`}
                        severity="surveil"
                        count={audit.vetoBas.length}
                        action={{
                          label: 'VOIR LE STOCK',
                          onClick: () => navigate('/ressources/pharmacie'),
                        }}
                      >
                        {audit.vetoBas.map((v, i) => (
                          <AlertRow
                            key={`vbas-${i}-${v.name}`}
                            primary={v.name}
                            secondary={v.type}
                            value={String(v.value)}
                            unit={v.unit}
                          />
                        ))}
                      </AlertGroup>
                    ) : null}

                    {showStock && audit.alimentsBas.length > 0 ? (
                      <AlertGroup
                        icon={<Package size={20} aria-hidden="true" />}
                        title="Aliments — stock bas"
                        subtitle={`${audit.alimentsBas.length} aliment${audit.alimentsBas.length > 1 ? 's' : ''} sous 100${audit.alimentsBas[0]?.unit ?? 'kg'}`}
                        severity="surveil"
                        count={audit.alimentsBas.length}
                        action={{
                          label: 'VOIR LE STOCK',
                          onClick: () => navigate('/ressources/aliments'),
                        }}
                      >
                        {audit.alimentsBas.map((s, i) => (
                          <AlertRow
                            key={`abas-${i}-${s.name}`}
                            primary={s.name}
                            value={String(s.value)}
                            unit={s.unit}
                          />
                        ))}
                      </AlertGroup>
                    ) : null}

                    {showSante && audit.bandesSurveil.length > 0 ? (
                      <AlertGroup
                        icon={<Layers size={20} aria-hidden="true" />}
                        title="Portées à surveiller"
                        subtitle={`${audit.bandesSurveil.length} bande${audit.bandesSurveil.length > 1 ? 's' : ''} hors norme`}
                        severity="surveil"
                        count={audit.bandesSurveil.length}
                        action={{
                          label: 'VOIR LES BANDES',
                          onClick: () => navigate('/troupeau?view=bandes'),
                        }}
                      >
                        {audit.bandesSurveil.map((b, i) => (
                          <AlertRow
                            key={`bs-${i}-${b.code}-${b.kind}`}
                            primary={b.code}
                            secondary={b.detail}
                            value={b.kind === 'portee-faible' ? 'faible' : 'incoh.'}
                            onClick={() => navigate(`/troupeau/bandes/${b.code}`)}
                          />
                        ))}
                      </AlertGroup>
                    ) : null}

                    {showSante && audit.santeMissing.length > 0 ? (
                      <AlertGroup
                        icon={<AlertTriangle size={20} aria-hidden="true" />}
                        title="Santé — cibles manquantes"
                        subtitle={`${audit.santeMissing.length} intervention${audit.santeMissing.length > 1 ? 's' : ''} sans rattachement`}
                        severity="surveil"
                        count={audit.santeMissing.length}
                        action={{
                          label: 'VOIR JOURNAL SANTÉ',
                          onClick: () => navigate('/sante'),
                        }}
                      >
                        {audit.santeMissing.map((s, i) => (
                          <AlertRow
                            key={`sm-${i}-${s.typeSoin}`}
                            primary={s.typeSoin || 'Soin sans type'}
                            secondary="Aucun animal/bande rattaché"
                            value="?"
                          />
                        ))}
                      </AlertGroup>
                    ) : null}
                  </>
                ) : null}
              </>
            )}
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default AuditView;
