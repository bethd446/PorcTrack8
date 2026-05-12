/**
 * V71 — Carte "Le saviez-vous ?" contextuelle.
 *
 * Affichée sur TodayV70 (au-dessus des sections "À traiter") et alimentée
 * par `useFarmContextHints`. Lien direct vers l'article encyclopédie.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { FarmHint } from './useFarmContextHints';

const LEVEL_BG: Record<FarmHint['level'], string> = {
  info: 'rgba(244, 162, 97, 0.10)',
  soon: 'rgba(6, 95, 70, 0.08)',
  critical: 'rgba(164, 69, 61, 0.10)',
};

const LEVEL_BORDER: Record<FarmHint['level'], string> = {
  info: 'rgba(244, 162, 97, 0.30)',
  soon: 'rgba(6, 95, 70, 0.25)',
  critical: 'rgba(164, 69, 61, 0.30)',
};

const LEVEL_LINK: Record<FarmHint['level'], string> = {
  info: 'var(--pt-amber-deep, #c2662b)',
  soon: 'var(--pt-emerald-premium, #064e3b)',
  critical: 'var(--pt-danger, #a4453d)',
};

export const HintCard: React.FC<{ hint: FarmHint }> = ({ hint }) => {
  return (
    <article
      style={{
        background: LEVEL_BG[hint.level],
        border: `1px solid ${LEVEL_BORDER[hint.level]}`,
        borderRadius: 'var(--radius-card, 24px)',
        padding: '14px 16px',
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--pt-muted, #6b7280)',
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        <span aria-hidden style={{ fontSize: 16 }}>
          {hint.emoji}
        </span>
        <span>Le saviez-vous ?</span>
      </div>
      <h3
        style={{
          fontFamily: 'var(--font-heading, inherit)',
          fontWeight: 700,
          fontSize: 15,
          lineHeight: 1.3,
          color: 'var(--ink, #0f172a)',
          margin: '0 0 6px',
          letterSpacing: '-0.01em',
        }}
      >
        {hint.title}
      </h3>
      <p
        style={{
          fontFamily: 'var(--font-body, inherit)',
          fontSize: 13,
          lineHeight: 1.5,
          color: 'var(--ink-soft, #475569)',
          margin: '0 0 10px',
        }}
      >
        {hint.body}
      </p>
      {hint.encyclopediaPath && (
        <Link
          to={hint.encyclopediaPath}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            fontWeight: 600,
            color: LEVEL_LINK[hint.level],
            textDecoration: 'none',
            // v3.4.7+ : tap target WCAG AA (≥44px) via padding vertical
            // + min-height. Avant fix : 96×18px → trop petit pour le terrain.
            padding: '12px 4px',
            minHeight: 44,
          }}
        >
          En savoir plus
          <ArrowRight size={14} aria-hidden />
        </Link>
      )}
    </article>
  );
};
