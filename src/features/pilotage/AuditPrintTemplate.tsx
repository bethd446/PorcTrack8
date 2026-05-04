import React from 'react';
import type { AuditSnapshot } from '../../services/exportService';

interface AuditPrintTemplateProps {
  data: AuditSnapshot;
}

const PRINT_INK = '#111827';
const PRINT_INK_SOFT = '#374151';
const PRINT_SURFACE_2 = '#F7F5F0';
const PRINT_LINE = '#e5e7eb';
const PRINT_ACCENT = '#2d5a1b';
const PRINT_PIG = '#c2662b';

const FONT_DISPLAY = 'var(--font-heading)';
const FONT_BODY = 'var(--font-body)';

const AuditPrintTemplate: React.FC<AuditPrintTemplateProps> = ({ data }) => {
  const headingStyle: React.CSSProperties = {
    fontFamily: FONT_DISPLAY,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '-0.01em',
    color: PRINT_INK,
    borderLeft: `4px solid ${PRINT_INK}`,
    background: PRINT_SURFACE_2,
    padding: '6px 12px',
    fontSize: 18,
    marginBottom: 16,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: PRINT_INK_SOFT,
    margin: 0,
  };

  const valueStyle: React.CSSProperties = {
    fontFamily: FONT_DISPLAY,
    fontWeight: 700,
    fontSize: 26,
    color: PRINT_INK,
    margin: '4px 0 0',
    letterSpacing: '-0.01em',
  };

  const cellBase: React.CSSProperties = {
    border: `1px solid ${PRINT_INK}`,
    padding: 8,
    fontSize: 13,
    color: PRINT_INK,
  };

  return (
    <div
      className="hidden print:block"
      style={{
        padding: 40,
        background: '#ffffff',
        color: PRINT_INK,
        fontFamily: FONT_BODY,
        lineHeight: 1.5,
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: `2px solid ${PRINT_INK}`,
          paddingBottom: 16,
          marginBottom: 32,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 30,
              textTransform: 'uppercase',
              letterSpacing: '-0.02em',
              color: PRINT_INK,
              margin: 0,
            }}
          >
            {data.farmName}
          </h1>
          <p style={{ fontSize: 13, fontStyle: 'italic', color: PRINT_INK_SOFT, margin: '4px 0 0' }}>
            Système PorcTrack 8 — Rapport d'audit de performance
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: PRINT_INK, margin: 0 }}>{data.date}</p>
          <p
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: PRINT_INK_SOFT,
              margin: '4px 0 0',
            }}
          >
            Document confidentiel / Propriétaire
          </p>
        </div>
      </div>

      <section style={{ marginBottom: 40, breakInside: 'avoid' }}>
        <h2 style={headingStyle}>1. Santé financière (élevage actif)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <div style={{ border: `1px solid ${PRINT_INK}`, padding: 16 }}>
            <p style={labelStyle}>Marge nette projetée</p>
            <p style={valueStyle}>{formatFCFA(data.finance.margeGlobale)} FCFA</p>
          </div>
          <div style={{ border: `1px solid ${PRINT_INK}`, padding: 16 }}>
            <p style={labelStyle}>Valeur totale de l'élevage</p>
            <p style={valueStyle}>{formatFCFA(data.finance.revenuProjete)} FCFA</p>
          </div>
        </div>
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 32,
            fontSize: 13,
            color: PRINT_INK_SOFT,
          }}
        >
          <p style={{ margin: 0 }}>
            Dette alimentaire engagée :{' '}
            <strong style={{ color: PRINT_INK }}>{formatFCFA(data.finance.detteAlimentaire)} FCFA</strong>
          </p>
          <p style={{ margin: 0 }}>
            Frais fixes &amp; sanitaires :{' '}
            <strong style={{ color: PRINT_INK }}>{formatFCFA(data.finance.coutsFixes)} FCFA</strong>
          </p>
        </div>
      </section>

      <section style={{ marginBottom: 40, breakInside: 'avoid' }}>
        <h2 style={headingStyle}>2. Inventaire technique</h2>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: `1px solid ${PRINT_INK}`,
            fontSize: 13,
          }}
        >
          <thead>
            <tr style={{ background: PRINT_SURFACE_2 }}>
              <th style={{ ...cellBase, textAlign: 'left', fontWeight: 700 }}>Phase de production</th>
              <th style={{ ...cellBase, textAlign: 'center', fontWeight: 700 }}>Effectif (bandes)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={cellBase}>Maternité (sous-mère)</td>
              <td style={{ ...cellBase, textAlign: 'center' }}>{data.inventory.maternite}</td>
            </tr>
            <tr>
              <td style={cellBase}>Post-sevrage</td>
              <td style={{ ...cellBase, textAlign: 'center' }}>{data.inventory.postSevrage}</td>
            </tr>
            <tr>
              <td style={cellBase}>Croissance</td>
              <td style={{ ...cellBase, textAlign: 'center' }}>{data.inventory.croissance}</td>
            </tr>
            <tr>
              <td style={cellBase}>Engraissement &amp; finition</td>
              <td style={{ ...cellBase, textAlign: 'center' }}>
                {data.inventory.engraissement + data.inventory.finition}
              </td>
            </tr>
            <tr style={{ fontWeight: 700 }}>
              <td style={{ ...cellBase, background: PRINT_SURFACE_2 }}>Total porcelets vivants</td>
              <td style={{ ...cellBase, background: PRINT_SURFACE_2, textAlign: 'center' }}>
                {data.inventory.totalPorcelets}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 40, breakInside: 'avoid' }}>
        <h2 style={headingStyle}>3. Urgences &amp; recommandations</h2>
        {data.urgences.length === 0 ? (
          <p style={{ fontSize: 13, fontStyle: 'italic', color: PRINT_INK_SOFT, margin: 0 }}>
            Aucune alerte critique enregistrée. Exploitation sous contrôle.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.urgences.map((alert, i) => (
              <li key={i} style={{ borderLeft: `2px solid ${PRINT_INK}`, paddingLeft: 16 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: PRINT_INK,
                    margin: 0,
                  }}
                >
                  {alert.category} — {alert.title}
                </p>
                <p style={{ fontSize: 12, color: PRINT_INK_SOFT, margin: '4px 0 0' }}>{alert.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ breakInside: 'avoid' }}>
        <h2 style={headingStyle}>4. Performance par lot</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, fontSize: 13 }}>
          <div>
            <p style={{ fontWeight: 700, color: PRINT_ACCENT, margin: 0 }}>Top performer</p>
            <p style={{ margin: '4px 0 0', color: PRINT_INK }}>Bande : {data.topBande || 'N/A'}</p>
          </div>
          <div>
            <p style={{ fontWeight: 700, color: PRINT_PIG, margin: 0 }}>Attention requise</p>
            <p style={{ margin: '4px 0 0', color: PRINT_INK }}>Bande : {data.flopBande || 'N/A'}</p>
          </div>
        </div>
      </section>

      <div
        style={{
          position: 'fixed',
          bottom: 40,
          left: 40,
          right: 40,
          borderTop: `1px solid ${PRINT_LINE}`,
          paddingTop: 8,
          fontSize: 8,
          color: PRINT_INK_SOFT,
          display: 'flex',
          justifyContent: 'space-between',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        <span>Généré par PorcTrack 8 Intelligence</span>
        <span>Signature directeur : ___________________________</span>
      </div>
    </div>
  );
};

function formatFCFA(n: number): string {
  return Math.round(n).toLocaleString('fr-FR').replace(/\s/g, ' ');
}

export default AuditPrintTemplate;
