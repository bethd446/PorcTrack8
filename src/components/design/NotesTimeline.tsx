/**
 * NotesTimeline — V21-6 C2
 *
 * Timeline verticale des notes terrain pour une fiche sujet (BANDE, TRUIE,
 * VERRAT). Source : `notes` slice de FarmContext, filtré par préfixe
 * `[TYPE:ID]` injecté par `QuickNoteForm` dans le contenu.
 *
 * Affiche : date relative + tags + texte (truncate 100) + thumbnail photo
 * + indicateur audio. Empty state avec CTA si pas de notes.
 */

import React, { useMemo, useState } from 'react';
import { ClipboardList, Mic, Plus } from 'lucide-react';
import { useFarm } from '../../context/FarmContext';
import type { Note } from '../../types';
import Eyebrow from './Eyebrow';

export interface NotesTimelineProps {
  subjectType: 'BANDE' | 'TRUIE' | 'VERRAT';
  subjectId: string;
  /** Libellé humain (boucle/displayId) pour l'empty state. Sinon fallback générique. */
  subjectLabel?: string;
  /** Nombre maxi de notes affichées (default 10). */
  maxItems?: number;
  /** Callback bouton "+ Ajouter une note". */
  onAddNote?: () => void;
}

const TAG_TONES: Record<string, { bg: string; fg: string }> = {
  santé: { bg: 'var(--color-pig-soft)', fg: 'var(--color-pig-deep)' },
  sante: { bg: 'var(--color-pig-soft)', fg: 'var(--color-pig-deep)' },
  urgent: { bg: 'var(--color-pig-soft)', fg: 'var(--color-pig-deep)' },
  alimentation: { bg: 'var(--color-amber-pork-soft)', fg: 'var(--color-amber-pork-deep)' },
  audit: { bg: 'var(--color-secondary-soft)', fg: 'var(--color-secondary-deep)' },
  comportement: { bg: 'var(--color-accent-100)', fg: 'var(--color-accent-600)' },
};

function tagTone(tag: string): { bg: string; fg: string } {
  return (
    TAG_TONES[tag.toLowerCase()] ?? {
      bg: 'var(--bg-surface-2)',
      fg: 'var(--muted)',
    }
  );
}

function relativeDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 1) return "aujourd'hui";
  if (diffDays === 1) return 'hier';
  if (diffDays < 7) return `il y a ${diffDays}j`;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Extrait le contenu lisible en retirant le préfixe `[TYPE:ID]` injecté
 * par QuickNoteForm. Tolère les notes sans préfixe (legacy).
 */
function cleanContent(texte: string): string {
  return texte.replace(/^\[(?:BANDE|TRUIE|VERRAT):[^\]]+\]\s*/i, '').trim();
}

const TRUNCATE_LEN = 100;

const NotesTimeline: React.FC<NotesTimelineProps> = ({
  subjectType,
  subjectId,
  subjectLabel,
  maxItems = 10,
  onAddNote,
}) => {
  const { notes } = useFarm();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo<Note[]>(() => {
    if (!subjectId) return [];
    const prefix = `[${subjectType}:${subjectId}]`.toUpperCase();
    return notes.filter(n => {
      const txt = (n.texte || '').toUpperCase();
      // Match préfixe `[TYPE:ID]` OU animalId direct (fallback legacy).
      return (
        txt.startsWith(prefix) ||
        (n.animalId === subjectId && n.animalType === subjectType)
      );
    });
  }, [notes, subjectType, subjectId]);

  const items = filtered.slice(0, maxItems);
  const hasMore = filtered.length > maxItems;

  if (items.length === 0) {
    return (
      <section aria-label={`Notes ${subjectType}`} className="card-dense" style={{ padding: '16px' }}>
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList size={14} className="text-text-2" aria-hidden="true" />
          <Eyebrow>Historique notes</Eyebrow>
        </div>
        <div style={{ textAlign: 'center', padding: '20px 8px' }}>
          <p className="text-[12px] text-text-2 mb-3">
            Aucune note pour {subjectType.toLowerCase()}
            {subjectLabel ? ` ${subjectLabel}` : ''}.
          </p>
          {onAddNote && (
            <button
              type="button"
              onClick={onAddNote}
              className="pressable inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-accent text-bg-0 text-[11px] font-bold uppercase tracking-wide"
              aria-label="Ajouter une note"
            >
              <Plus size={13} aria-hidden="true" />
              Ajouter une note
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section aria-label={`Notes ${subjectType}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ClipboardList size={14} className="text-accent" aria-hidden="true" />
          <Eyebrow>Historique notes · {filtered.length}</Eyebrow>
        </div>
        {onAddNote && (
          <button
            type="button"
            onClick={onAddNote}
            className="pressable inline-flex items-center gap-1 text-accent text-[11px] font-bold uppercase tracking-wide"
            aria-label="Ajouter une note"
          >
            <Plus size={12} aria-hidden="true" />
            Ajouter
          </button>
        )}
      </div>

      <ul
        role="list"
        className="card-dense !p-0 overflow-hidden"
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        {items.map(n => {
          const text = cleanContent(n.texte);
          const isExpanded = !!expanded[n.id];
          const truncated = text.length > TRUNCATE_LEN && !isExpanded;
          const display = truncated ? `${text.slice(0, TRUNCATE_LEN)}…` : text;

          return (
            <li
              key={n.id}
              className="border-b border-border last:border-b-0"
              style={{ padding: '12px 14px', display: 'flex', gap: 12 }}
            >
              {/* Bullet timeline */}
              <div
                aria-hidden="true"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--color-accent-500)',
                  marginTop: 6,
                  flexShrink: 0,
                }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Date + tags + audio indicator */}
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[11px] uppercase tracking-wide text-text-2">
                    {relativeDate(n.date)}
                  </span>
                  {(n.tags ?? []).map(tag => {
                    const tone = tagTone(tag);
                    return (
                      <span
                        key={tag}
                        className="text-[10px] uppercase tracking-wide"
                        style={{
                          background: tone.bg,
                          color: tone.fg,
                          padding: '2px 6px',
                          borderRadius: 999,
                        }}
                      >
                        {tag}
                      </span>
                    );
                  })}
                  {n.audioUrl && (
                    <span
                      className="inline-flex items-center gap-1 text-text-2"
                      aria-label="Mémo audio"
                      title="Mémo audio"
                    >
                      <Mic size={11} aria-hidden="true" />
                    </span>
                  )}
                </div>

                {/* Texte */}
                <p className="text-[13px] text-text-0 leading-relaxed" style={{ margin: 0 }}>
                  {display}
                  {truncated && (
                    <button
                      type="button"
                      onClick={() => setExpanded(prev => ({ ...prev, [n.id]: true }))}
                      className="ml-1 text-accent text-[11px] font-bold uppercase"
                      aria-label="Voir la note complète"
                    >
                      voir +
                    </button>
                  )}
                </p>

                {/* Photo thumbnail */}
                {n.photoUrl && (
                  <img
                    src={n.photoUrl}
                    alt={`Photo note ${relativeDate(n.date)}`}
                    width={60}
                    height={60}
                    style={{
                      width: 60,
                      height: 60,
                      objectFit: 'cover',
                      borderRadius: 8,
                      marginTop: 8,
                      border: '1px solid var(--line)',
                    }}
                    loading="lazy"
                  />
                )}

                {/* Auteur */}
                {n.auteur && (
                  <p className="text-[10px] text-text-2 mt-1 uppercase tracking-wide" style={{ margin: '4px 0 0' }}>
                    {n.auteur}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <div style={{ marginTop: 8, textAlign: 'center' }}>
          <span className="text-[11px] uppercase tracking-wide text-text-2">
            +{filtered.length - maxItems} notes plus anciennes
          </span>
        </div>
      )}
    </section>
  );
};

export default NotesTimeline;
