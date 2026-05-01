/**
 * TodayHub — /today
 * ══════════════════════════════════════════════════════════════════════════
 * Inbox du matin (Option Bravo). Point d'entrée par défaut de l'app.
 *
 *   1. Header BigShoulders : "Bonjour, {firstName}" + date
 *   2. Section "Alertes critiques" — CRITIQUE + HAUTE, max 10
 *   3. Section "Audit du jour" — CTA + dernier audit fait
 *   4. Section "Tâches" — placeholder v1
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonContent, IonPage, IonRefresher, IonRefresherContent,
} from '@ionic/react';
import {
  AlertTriangle, ChevronRight, ClipboardCheck, ShieldCheck,
} from 'lucide-react';

import AgritechLayout from '../../components/AgritechLayout';
import Eyebrow from '../../components/design/Eyebrow';
import { useAuth } from '../../context/AuthContext';
import { usePilotage } from '../../context/PilotageContext';
import { useRessources } from '../../context/RessourcesContext';
import { useMeta } from '../../context/FarmContext';
import type { FarmAlert, AlertPriority } from '../../services/alertEngine';

const PRIORITY_ORDER: Record<AlertPriority, number> = {
  CRITIQUE: 0,
  HAUTE: 1,
  NORMALE: 2,
  INFO: 3,
};

const TodayHub: React.FC = () => {
  const navigate = useNavigate();
  const { userName } = useAuth();
  const { alerts, alertesServeur } = usePilotage();
  const { notes } = useRessources();
  const { recomputeAlerts } = useMeta();

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
    event.detail.complete();
  };

  // ── Top 10 alertes CRITIQUE + HAUTE ────────────────────────────────────
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
        title: a.title,
        message: a.message,
      })),
      ...server,
    ];
    merged.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    return merged.slice(0, 10);
  }, [alerts, alertesServeur]);

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
                  {criticalAlerts.map(alert => (
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
                          borderLeft: `3px solid ${alert.priority === 'CRITIQUE' ? 'var(--color-pig-deep)' : 'var(--color-amber-pork-deep)'}`,
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
                              style={{
                                fontFamily: 'DMMono, ui-monospace, monospace',
                                fontSize: 10,
                                letterSpacing: '0.10em',
                                textTransform: 'uppercase',
                                fontWeight: 600,
                                color: alert.priority === 'CRITIQUE' ? 'var(--color-pig-deep)' : 'var(--color-amber-pork-deep)',
                              }}
                            >
                              {alert.priority} · {alert.category}
                            </span>
                            <AlertTriangle
                              size={13}
                              color={alert.priority === 'CRITIQUE' ? 'var(--color-pig-deep)' : 'var(--color-amber-pork-deep)'}
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
                  ))}
                </ul>
              )}
            </section>

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

            {/* ── Tâches ────────────────────────────────────────────── */}
            <section aria-label="Tâches">
              <Eyebrow dotColor="muted">Tâches</Eyebrow>
              <div
                style={{
                  marginTop: 12,
                  background: 'var(--bg-surface)',
                  borderRadius: 12,
                  padding: '20px 22px',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontFamily: 'InstrumentSans, system-ui, sans-serif',
                    fontSize: 13,
                    color: 'var(--muted)',
                    margin: 0,
                  }}
                >
                  Aucune tâche en attente
                </p>
              </div>
            </section>
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default TodayHub;
