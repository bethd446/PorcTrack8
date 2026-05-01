/**
 * TodayHub — /today
 * ══════════════════════════════════════════════════════════════════════════
 * Copilote de décision matinal. Point d'entrée par défaut de l'app.
 *
 *   1. Header BigShoulders : "Bonjour, {firstName}" + date
 *   2. Alertes critiques (CRITIQUE + HAUTE, top 10)
 *   3. Retours chaleur cette semaine (truies J18-J24 post-saillie)
 *   4. Sevrages à confirmer / en retard (bandes SOUS_MERE J28+)
 *   5. Cycles en cours (tile lien)
 *   6. Confirmations en attente (top 5)
 *   7. Audit du jour
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  IonContent, IonPage, IonRefresher, IonRefresherContent,
} from '@ionic/react';
import {
  AlertTriangle, ChevronRight, ClipboardCheck, Layers, PawPrint, RotateCcw, ShieldCheck,
} from 'lucide-react';

import AgritechLayout from '../../components/AgritechLayout';
import Eyebrow from '../../components/design/Eyebrow';
import { useAuth } from '../../context/AuthContext';
import { usePilotage } from '../../context/PilotageContext';
import { useRessources } from '../../context/RessourcesContext';
import { useMeta } from '../../context/FarmContext';
import { useTroupeau } from '../../context/TroupeauContext';
import { resolveAlertSubject } from '../../utils/alertSubject';
import type { FarmAlert, AlertPriority } from '../../services/alertEngine';
import {
  getPendingConfirmations,
  type PendingConfirmation,
} from '../../services/confirmationQueue';
import { getRetoursChaleur, getSevrages } from '../../services/proactiveCues';

const PRIORITY_ORDER: Record<AlertPriority, number> = {
  CRITIQUE: 0,
  HAUTE: 1,
  NORMALE: 2,
  INFO: 3,
};

/** Affiche "Bande {code}" en évitant le doublon "Bande Bande X" si idPortee contient déjà le mot. */
const formatBandeLabel = (raw: string): string => {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return 'Bande';
  return /^bande\b/i.test(trimmed) ? trimmed : `Bande ${trimmed}`;
};

const TodayHub: React.FC = () => {
  const navigate = useNavigate();
  const { userName } = useAuth();
  const { alerts, alertesServeur, saillies } = usePilotage();
  const { notes } = useRessources();
  const { recomputeAlerts } = useMeta();
  const { bandes, truies, verrats } = useTroupeau();
  const lookup = useMemo(() => ({ bandes, truies, verrats }), [bandes, truies, verrats]);

  // ── Confirmations en attente (file persistante) ───────────────────────
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([]);
  useEffect(() => {
    let cancelled = false;
    void getPendingConfirmations().then((items) => {
      if (!cancelled) setPendingConfirmations(items);
    });
    return () => {
      cancelled = true;
    };
  }, [alerts]);

  const firstName = (() => {
    const parts = (userName || 'Utilisateur').split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'Utilisateur';
    const skipPrefixes = new Set(['Ferme', 'ferme', 'M.', 'Mme', 'Mr', 'Dr', 'Pr']);
    if (parts.length > 1 && skipPrefixes.has(parts[0])) {
      return parts[parts.length - 1];
    }
    return parts[0];
  })();
  const now = new Date();
  const headerDate = now.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleRefresh = (event: CustomEvent<{ complete: () => void }>): void => {
    recomputeAlerts();
    void getPendingConfirmations().then(setPendingConfirmations);
    event.detail.complete();
  };

  // ── Top 5 alertes URGENT (CRITIQUE + HAUTE) ─────────────────────────────
  // Pas de remplissage avec NORMAL : si <5 urgent, on laisse le padding visuel.
  const criticalAlerts = useMemo(() => {
    const local: FarmAlert[] = alerts.filter(
      a => a.priority === 'CRITIQUE' || a.priority === 'HAUTE',
    );
    const server = alertesServeur
      .filter(a => a.priorite === 'CRITIQUE' || a.priorite === 'HAUTE')
      .map((a, i) => ({
        id: `srv-${i}`,
        priority: a.priorite as AlertPriority,
        category: a.categorie,
        title: a.sujet,
        message: a.description,
      }));
    const merged = [
      ...local.map(a => ({
        id: a.id,
        priority: a.priority,
        category: a.category as string,
        title: resolveAlertSubject(a.title, lookup),
        message: resolveAlertSubject(a.message, lookup),
      })),
      ...server,
    ];
    merged.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    return merged.slice(0, 5);
  }, [alerts, alertesServeur, lookup]);

  // ── Retours chaleur cette semaine ────────────────────────────────────
  const today = useMemo(() => new Date(), []);
  const retoursChaleur = useMemo(
    () => getRetoursChaleur(truies, saillies, today),
    [truies, saillies, today],
  );

  // ── Sevrages à confirmer / en retard ─────────────────────────────────
  const sevrages = useMemo(
    () => getSevrages(bandes, today),
    [bandes, today],
  );

  // ── Dernier audit (note de catégorie AUDIT_QUOTIDIEN ou CONTROLE) ─────
  const lastAudit = useMemo(() => {
    const audits = notes.filter(n => {
      const cat = String(n.animalType ?? '');
      return cat === 'CONTROLE' || cat === 'AUDIT_QUOTIDIEN' || /audit/i.test(n.texte);
    });
    if (audits.length === 0) return null;
    const sorted = [...audits].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return db - da;
    });
    return sorted[0];
  }, [notes]);

  const lastAuditAgo = useMemo(() => {
    if (!lastAudit) return null;
    const dt = new Date(lastAudit.date);
    if (Number.isNaN(dt.getTime())) return null;
    const diffMs = Date.now() - dt.getTime();
    const diffH = Math.floor(diffMs / 3_600_000);
    if (diffH < 1) return "il y a moins d'une heure";
    if (diffH < 24) return `il y a ${diffH} h`;
    const diffJ = Math.floor(diffH / 24);
    if (diffJ < 7) return `il y a ${diffJ} j`;
    return dt.toLocaleDateString('fr-FR');
  }, [lastAudit]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout>
          <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
            <IonRefresherContent />
          </IonRefresher>

          <div
            className="px-4 pt-5 pb-32 flex flex-col gap-6"
            style={{ maxWidth: 1100, margin: '0 auto' }}
          >
            {/* ── En-tête ───────────────────────────────────────────── */}
            <header>
              <Eyebrow dotColor="accent">Aujourd&rsquo;hui</Eyebrow>
              <h1
                style={{
                  fontFamily: 'var(--font-display, BigShoulders), system-ui, sans-serif',
                  fontSize: 34,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  margin: '8px 0 4px',
                }}
              >
                Bonjour, {firstName}
              </h1>
              <div
                style={{
                  fontFamily: 'InstrumentSans, system-ui, sans-serif',
                  fontSize: 13,
                  color: 'var(--muted)',
                  textTransform: 'capitalize',
                }}
              >
                {headerDate}
              </div>
            </header>

            {/* ── Alertes critiques ────────────────────────────────── */}
            <section aria-label={`Alertes critiques · ${criticalAlerts.length}`}>
              <Eyebrow dotColor={criticalAlerts.length > 0 ? 'pig' : 'accent'}>
                Alertes critiques · {criticalAlerts.length}
              </Eyebrow>
              {criticalAlerts.length === 0 ? (
                <div
                  style={{
                    marginTop: 12,
                    background: 'var(--bg-surface)',
                    borderRadius: 12,
                    padding: '20px 22px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    border: '1px solid var(--color-accent-100)',
                  }}
                >
                  <ShieldCheck size={22} color="var(--color-accent-500)" aria-hidden="true" />
                  <span
                    style={{
                      fontFamily: 'var(--font-display, BigShoulders), system-ui, sans-serif',
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      letterSpacing: '-0.005em',
                    }}
                  >
                    Aucune alerte prioritaire ce matin
                  </span>
                </div>
              ) : (
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '12px 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {criticalAlerts.map(alert => {
                    const dotColor =
                      alert.priority === 'CRITIQUE'
                        ? 'var(--color-pig-deep)'
                        : 'var(--color-amber-pork-deep)';
                    return (
                    <li key={alert.id}>
                      <button
                        type="button"
                        onClick={() => navigate('/alerts')}
                        className="pressable"
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          background: 'var(--bg-surface)',
                          borderRadius: 12,
                          boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'transform 160ms var(--ease-emil)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginBottom: 4,
                            }}
                          >
                            <span
                              aria-hidden="true"
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: dotColor,
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontFamily: 'DMMono, ui-monospace, monospace',
                                fontSize: 10,
                                letterSpacing: '0.10em',
                                textTransform: 'uppercase',
                                fontWeight: 600,
                                color: dotColor,
                              }}
                            >
                              {alert.priority} · {alert.category}
                            </span>
                            <AlertTriangle
                              size={13}
                              color={dotColor}
                              aria-hidden="true"
                            />
                          </div>
                          <h4
                            style={{
                              fontFamily: 'var(--font-display, BigShoulders), system-ui, sans-serif',
                              fontSize: 15,
                              fontWeight: 600,
                              color: 'var(--ink)',
                              margin: 0,
                              letterSpacing: '-0.005em',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {alert.title}
                          </h4>
                          {alert.message ? (
                            <p
                              style={{
                                fontFamily: 'InstrumentSans, system-ui, sans-serif',
                                fontSize: 12,
                                color: 'var(--ink-soft)',
                                lineHeight: 1.4,
                                margin: '2px 0 0',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {alert.message}
                            </p>
                          ) : null}
                        </div>
                        <ChevronRight size={16} color="var(--muted)" aria-hidden="true" />
                      </button>
                    </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* ── Retours chaleur cette semaine ─────────────────────── */}
            {(retoursChaleur.aVerifier.length > 0 || retoursChaleur.aAnticiper.length > 0) && (
              <section aria-label="Retours chaleur à surveiller">
                <Eyebrow dotColor="pig">
                  Retours chaleur · {retoursChaleur.aVerifier.length} truie{retoursChaleur.aVerifier.length > 1 ? 's' : ''}
                  {retoursChaleur.aAnticiper.length > 0 ? ` · +${retoursChaleur.aAnticiper.length} à anticiper` : ''}
                </Eyebrow>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '12px 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {retoursChaleur.aVerifier.map(({ truie, daysSinceSaillie }) => (
                    <li key={`rc-v-${truie.id}`}>
                      <Link
                        to={`/troupeau/truies/${truie.id}`}
                        className="pressable"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          background: 'var(--bg-surface)',
                          borderRadius: 12,
                          boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
                          padding: '14px 16px',
                          textDecoration: 'none',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <PawPrint size={20} color="var(--color-pig)" aria-hidden="true" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: 'var(--font-display, BigShoulders), system-ui, sans-serif',
                              fontSize: 15,
                              fontWeight: 600,
                              color: 'var(--ink)',
                              letterSpacing: '-0.005em',
                            }}
                          >
                            {truie.displayId}{truie.nom ? ` · ${truie.nom}` : ''}
                          </div>
                          <div
                            style={{
                              fontFamily: 'InstrumentSans, system-ui, sans-serif',
                              fontSize: 12,
                              color: 'var(--ink-soft)',
                              marginTop: 2,
                            }}
                          >
                            Saillie il y a {daysSinceSaillie}j · vérifier J18-J24
                          </div>
                        </div>
                        <ChevronRight size={16} color="var(--muted)" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                  {retoursChaleur.aAnticiper.map(({ truie, daysSinceSaillie }) => (
                    <li key={`rc-a-${truie.id}`}>
                      <Link
                        to={`/troupeau/truies/${truie.id}`}
                        className="pressable"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          background: 'var(--bg-surface)',
                          borderRadius: 12,
                          boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
                          padding: '14px 16px',
                          textDecoration: 'none',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <PawPrint size={20} color="var(--color-amber-pork-deep)" aria-hidden="true" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: 'var(--font-display, BigShoulders), system-ui, sans-serif',
                              fontSize: 15,
                              fontWeight: 600,
                              color: 'var(--ink)',
                              letterSpacing: '-0.005em',
                            }}
                          >
                            {truie.displayId}{truie.nom ? ` · ${truie.nom}` : ''}
                          </div>
                          <div
                            style={{
                              fontFamily: 'InstrumentSans, system-ui, sans-serif',
                              fontSize: 12,
                              color: 'var(--ink-soft)',
                              marginTop: 2,
                            }}
                          >
                            À anticiper · saillie il y a {daysSinceSaillie}j
                          </div>
                        </div>
                        <ChevronRight size={16} color="var(--muted)" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── Sevrages à confirmer / en retard ──────────────────── */}
            {(sevrages.enRetard.length > 0 || sevrages.aVenir.length > 0) && (
              <section aria-label="Sevrages à confirmer">
                <Eyebrow dotColor={sevrages.enRetard.length > 0 ? 'pig' : 'amber'}>
                  Sevrages · {sevrages.enRetard.length} en retard, {sevrages.aVenir.length} cette semaine
                </Eyebrow>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '12px 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {sevrages.enRetard.map(({ bande, daysOver }) => (
                    <li key={`sv-r-${bande.id}`}>
                      <Link
                        to={`/troupeau/bandes/${bande.id}`}
                        className="pressable"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          background: 'var(--bg-surface)',
                          borderRadius: 12,
                          boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
                          padding: '14px 16px',
                          textDecoration: 'none',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <Layers size={20} color="var(--color-pig)" aria-hidden="true" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: 'var(--font-display, BigShoulders), system-ui, sans-serif',
                              fontSize: 15,
                              fontWeight: 600,
                              color: 'var(--ink)',
                              letterSpacing: '-0.005em',
                            }}
                          >
                            {formatBandeLabel(bande.idPortee || bande.id)}
                          </div>
                          <div
                            style={{
                              fontFamily: 'InstrumentSans, system-ui, sans-serif',
                              fontSize: 12,
                              color: 'var(--ink-soft)',
                              marginTop: 2,
                            }}
                          >
                            Sevrage J+{daysOver} retard{typeof bande.vivants === 'number' ? ` · ${bande.vivants} porcelets` : ''}
                          </div>
                        </div>
                        <ChevronRight size={16} color="var(--color-pig)" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                  {sevrages.aVenir.map(({ bande, daysOver }) => (
                    <li key={`sv-v-${bande.id}`}>
                      <Link
                        to={`/troupeau/bandes/${bande.id}`}
                        className="pressable"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          background: 'var(--bg-surface)',
                          borderRadius: 12,
                          boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
                          padding: '14px 16px',
                          textDecoration: 'none',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <Layers size={20} color="var(--color-amber-pork-deep)" aria-hidden="true" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: 'var(--font-display, BigShoulders), system-ui, sans-serif',
                              fontSize: 15,
                              fontWeight: 600,
                              color: 'var(--ink)',
                              letterSpacing: '-0.005em',
                            }}
                          >
                            {formatBandeLabel(bande.idPortee || bande.id)}
                          </div>
                          <div
                            style={{
                              fontFamily: 'InstrumentSans, system-ui, sans-serif',
                              fontSize: 12,
                              color: 'var(--ink-soft)',
                              marginTop: 2,
                            }}
                          >
                            Sevrage {daysOver === 0 ? "aujourd'hui" : `dans ${-daysOver}j`}{typeof bande.vivants === 'number' ? ` · ${bande.vivants} porcelets` : ''}
                          </div>
                        </div>
                        <ChevronRight size={16} color="var(--muted)" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── Cycles en cours ──────────────────────────────────── */}
            <section aria-label="Cycles en cours">
              <Eyebrow dotColor="accent">Cycles en cours</Eyebrow>
              <Link
                to="/cycles"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-card, 12px)',
                  padding: '16px 20px',
                  textDecoration: 'none',
                  marginTop: 12,
                }}
              >
                <RotateCcw size={20} color="var(--color-accent-500)" aria-hidden="true" />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: 'BigShoulders, sans-serif',
                      fontSize: 18,
                      fontWeight: 700,
                      color: 'var(--ink)',
                    }}
                  >
                    Voir les cycles biologiques
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {bandes.length} bandes actives · 7 phases
                  </div>
                </div>
                <ChevronRight size={18} color="var(--muted)" aria-hidden="true" />
              </Link>
            </section>

            {/* ── Confirmations en attente ──────────────────────────── */}
            {pendingConfirmations.length > 0 && (
              <section aria-label="Confirmations en attente">
                <Eyebrow dotColor="amber">Confirmations en attente · {Math.min(pendingConfirmations.length, 5)}</Eyebrow>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: '12px 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {pendingConfirmations.slice(0, 5).map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => navigate('/alerts')}
                        className="pressable"
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          background: 'var(--bg-surface)',
                          borderRadius: 12,
                          boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'transform 160ms var(--ease-emil)',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: 'DMMono, ui-monospace, monospace',
                              fontSize: 10,
                              letterSpacing: '0.10em',
                              textTransform: 'uppercase',
                              fontWeight: 600,
                              color: 'var(--color-amber-pork-deep)',
                              marginBottom: 4,
                            }}
                          >
                            {c.action.type.replace(/_/g, ' ')}
                          </div>
                          <h4
                            style={{
                              fontFamily: 'var(--font-display, BigShoulders), system-ui, sans-serif',
                              fontSize: 15,
                              fontWeight: 600,
                              color: 'var(--ink)',
                              margin: 0,
                              letterSpacing: '-0.005em',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {c.alertTitle}
                          </h4>
                          {c.alertMessage ? (
                            <p
                              style={{
                                fontFamily: 'InstrumentSans, system-ui, sans-serif',
                                fontSize: 12,
                                color: 'var(--ink-soft)',
                                lineHeight: 1.4,
                                margin: '2px 0 0',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {c.alertMessage}
                            </p>
                          ) : null}
                        </div>
                        <ChevronRight size={16} color="var(--muted)" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── Audit du jour ─────────────────────────────────────── */}
            <section aria-label="Audit du jour">
              <Eyebrow dotColor="amber">Audit du jour</Eyebrow>
              <div
                style={{
                  marginTop: 12,
                  background: 'var(--bg-surface)',
                  borderRadius: 12,
                  padding: '16px 18px',
                  boxShadow: '0 1px 2px rgba(17,24,39,0.04), 0 1px 3px rgba(17,24,39,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: 'var(--color-accent-100)',
                      color: 'var(--color-accent-600)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <ClipboardCheck size={20} aria-hidden="true" />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-display, BigShoulders), system-ui, sans-serif',
                        fontSize: 16,
                        fontWeight: 600,
                        color: 'var(--ink)',
                        letterSpacing: '-0.005em',
                      }}
                    >
                      Audit terrain
                    </div>
                    <div
                      style={{
                        fontFamily: 'DMMono, ui-monospace, monospace',
                        fontSize: 11,
                        letterSpacing: '0.06em',
                        color: 'var(--muted)',
                        marginTop: 2,
                      }}
                    >
                      {lastAuditAgo ? `Dernier · ${lastAuditAgo}` : 'Aucun audit enregistré'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/audit')}
                  aria-label="Lancer un audit"
                  className="pressable"
                  style={{
                    width: '100%',
                    minHeight: 44,
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--color-accent-500)',
                    color: 'var(--bg-surface)',
                    border: '1.5px solid var(--color-accent-500)',
                    fontFamily: 'DMMono, ui-monospace, monospace',
                    fontSize: 12,
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'transform 160ms var(--ease-emil)',
                  }}
                >
                  Lancer un audit
                </button>
              </div>
            </section>

          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default TodayHub;
