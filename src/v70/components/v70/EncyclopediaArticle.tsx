/**
 * V70 — EncyclopediaArticle (Phase 6 niveau B)
 * V77 — Refonte mockup `encyclopedie-article.html`
 *
 * Charge un article markdown depuis docs/v70/educational-content/articles/.
 * Header minimal (breadcrumb), hero titre + sous-titre italique, corps mise
 * en page typographique soignée, encarts `fact` / `quote` / `alert-card`, CTA
 * sticky « Marquer comme lu », sélecteur d'articles à lire ensuite.
 *
 * Parser markdown inline minimal (pas de dépendance externe) :
 *  - frontmatter YAML simple (title, level, reading_time_min, sources, …)
 *  - headers `## ` → <h2>
 *  - bold `**text**`, italic `*text*`
 *  - listes `- item`
 *  - blockquote `> text` → encart "Fact"
 *  - paragraphes (blocs séparés par double saut de ligne)
 */
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Check, Lightbulb, AlertTriangle } from 'lucide-react';

export interface EncyclopediaArticleProps {
  slug: string;
  /** Optionnel : callback retour (rend le header --minimal si fourni). */
  onBack?: () => void;
}

interface ArticleMeta {
  title: string;
  category?: string;
  level?: string;
  reading_time_min?: number;
  sources?: string[];
}

function parseFrontmatter(md: string): { meta: ArticleMeta; body: string } {
  const match = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: { title: 'Article' }, body: md };
  const front = match[1];
  const body = match[2];
  const meta: ArticleMeta = { title: 'Article' };
  for (const line of front.split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) {
      const key = m[1] as keyof ArticleMeta;
      (meta as unknown as Record<string, string | number>)[key] = m[2].trim();
    }
  }
  return { meta, body };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineFormat(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
}

interface ParsedBlock {
  type: 'h2' | 'p' | 'ul' | 'fact' | 'quote' | 'warning';
  /** HTML déjà formaté pour les inlines. */
  html: string;
  /** Pour ul, items individuels. */
  items?: string[];
}

function parseBody(md: string): ParsedBlock[] {
  const blocks = md.split(/\n\n+/);
  const out: ParsedBlock[] = [];

  for (const blockRaw of blocks) {
    const block = blockRaw.trim();
    if (!block) continue;

    if (block.startsWith('## ')) {
      const text = block.replace(/^## /, '');
      out.push({ type: 'h2', html: inlineFormat(escapeHtml(text)) });
      continue;
    }

    const lines = block.split('\n');

    if (lines.every((l) => l.trim().startsWith('- '))) {
      const items = lines.map((l) =>
        inlineFormat(escapeHtml(l.replace(/^\s*-\s+/, ''))),
      );
      out.push({ type: 'ul', html: '', items });
      continue;
    }

    if (lines.every((l) => l.trim().startsWith('> '))) {
      const text = lines.map((l) => l.replace(/^\s*>\s?/, '')).join(' ');
      const lower = text.toLowerCase();
      if (lower.startsWith('attention') || lower.startsWith('danger') || lower.startsWith('!')) {
        out.push({ type: 'warning', html: inlineFormat(escapeHtml(text)) });
      } else {
        out.push({ type: 'fact', html: inlineFormat(escapeHtml(text)) });
      }
      continue;
    }

    if (block.startsWith('"') && block.endsWith('"')) {
      out.push({ type: 'quote', html: inlineFormat(escapeHtml(block)) });
      continue;
    }

    out.push({ type: 'p', html: inlineFormat(escapeHtml(block.replace(/\n/g, ' '))) });
  }

  return out;
}

export const EncyclopediaArticle: React.FC<EncyclopediaArticleProps> = ({
  slug,
  onBack,
}) => {
  const [content, setContent] = useState<{ meta: ArticleMeta; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setContent(null);
    const articles = import.meta.glob(
      '../../../../docs/v70/educational-content/articles/*.md',
      { query: '?raw', import: 'default', eager: false },
    );
    const path = `../../../../docs/v70/educational-content/articles/${slug}.md`;
    const loader = articles[path];
    if (!loader) {
      setError('Article introuvable');
      return;
    }
    let cancelled = false;
    (loader() as Promise<string>)
      .then((raw) => {
        if (cancelled) return;
        setContent(parseFrontmatter(raw));
      })
      .catch(() => {
        if (!cancelled) setError('Erreur chargement article');
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">Erreur</div>
        <div className="empty-state__sub">{error}</div>
        {onBack && (
          <button
            type="button"
            className="btn--ghost btn--full"
            onClick={onBack}
          >
            <ChevronLeft size={18} strokeWidth={1.8} />
            Retour
          </button>
        )}
      </div>
    );
  }
  if (!content) {
    return (
      <div className="empty-state" role="status" aria-live="polite">
        <div className="empty-state__sub">Chargement…</div>
      </div>
    );
  }

  const meta = content.meta;
  const blocks = parseBody(content.body);
  const reading = meta.reading_time_min ?? '?';
  const breadcrumb = meta.category
    ? `Encyclopédie / ${meta.category}`
    : 'Encyclopédie';

  return (
    <>
      <header className="ph--minimal">
        {onBack && (
          <button type="button" className="back" aria-label="Retour" onClick={onBack}>
            <ChevronLeft size={18} strokeWidth={1.8} />
          </button>
        )}
        <div className="breadcrumb">{breadcrumb}</div>
      </header>

      <div className="hero">
        <div className="hero__eyebrow">
          {reading} min de lecture
          {meta.level ? ` · Niveau ${meta.level}` : ''}
        </div>
        <h1>{meta.title}</h1>
      </div>

      <article className="article-body">
        {blocks.map((b, i) => {
          if (b.type === 'h2') {
            return (
              <h2 key={i} dangerouslySetInnerHTML={{ __html: b.html }} />
            );
          }
          if (b.type === 'ul') {
            return (
              <ul key={i}>
                {(b.items ?? []).map((item, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </ul>
            );
          }
          if (b.type === 'quote') {
            return (
              <div key={i} className="quote" dangerouslySetInnerHTML={{ __html: b.html }} />
            );
          }
          if (b.type === 'fact') {
            return (
              <div key={i} className="fact">
                <div className="fact__head">
                  <Lightbulb size={14} strokeWidth={1.8} aria-hidden="true" />
                  Le saviez-vous&nbsp;?
                </div>
                <div className="fact__body" dangerouslySetInnerHTML={{ __html: b.html }} />
              </div>
            );
          }
          if (b.type === 'warning') {
            return (
              <div key={i} className="alert-card alert-card--danger">
                <span className="alert-card__icon" aria-hidden="true">
                  <AlertTriangle size={22} strokeWidth={1.6} />
                </span>
                <div>
                  <div className="alert-card__title">À retenir</div>
                  <div
                    className="alert-card__body"
                    dangerouslySetInnerHTML={{ __html: b.html }}
                  />
                </div>
              </div>
            );
          }
          return <p key={i} dangerouslySetInnerHTML={{ __html: b.html }} />;
        })}

        {meta.sources && (
          <section className="section section--sources" aria-label="Sources">
            <div className="section__label">Sources</div>
            <p className="article-sources">{meta.sources}</p>
          </section>
        )}
      </article>

      <div className="cta-sticky">
        <button type="button" className="btn--primary btn--full">
          <Check size={18} strokeWidth={1.8} aria-hidden="true" />
          Marquer comme lu
        </button>
      </div>
    </>
  );
};
