/**
 * V70 — EncyclopediaArticle (Phase 6 niveau B)
 *
 * Charge un article markdown depuis docs/v70/educational-content/articles/
 * (5 articles disponibles : cycle vie truie, ISSE, biosécurité, alimentation
 * gestation, sevrage).
 *
 * Pas de dépendance markdown externe — parser inline minimal qui gère :
 * - frontmatter YAML simple (title, level, reading_time_min, sources, …)
 * - headers `## ` → <h2>
 * - bold `**text**` → <strong>
 * - italic `*text*` → <em>
 * - listes `- item` → <ul><li>
 * - paragraphes (blocs séparés par double saut de ligne)
 *
 * Limite assumée pour V70 : pas de tableaux, pas de liens, pas de code blocks.
 */
import React, { useState, useEffect } from 'react';

export interface EncyclopediaArticleProps {
  slug: string;
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

function renderMarkdown(md: string): string {
  const blocks = md.split(/\n\n+/);
  const html: string[] = [];

  for (const blockRaw of blocks) {
    const block = blockRaw.trim();
    if (!block) continue;

    if (block.startsWith('## ')) {
      const text = block.replace(/^## /, '');
      html.push(`<h2>${inlineFormat(escapeHtml(text))}</h2>`);
      continue;
    }

    const lines = block.split('\n');
    if (lines.every((l) => l.trim().startsWith('- '))) {
      const items = lines
        .map((l) => l.replace(/^\s*-\s+/, ''))
        .map((t) => `<li>${inlineFormat(escapeHtml(t))}</li>`)
        .join('');
      html.push(`<ul>${items}</ul>`);
      continue;
    }

    html.push(`<p>${inlineFormat(escapeHtml(block.replace(/\n/g, ' ')))}</p>`);
  }

  return html.join('\n');
}

function inlineFormat(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
}

export const EncyclopediaArticle: React.FC<EncyclopediaArticleProps> = ({ slug }) => {
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
      <div className="empty-edu">
        <div className="empty-edu-title">Erreur</div>
        <div className="empty-edu-desc">{error}</div>
      </div>
    );
  }
  if (!content) return <div>Chargement…</div>;

  return (
    <article className="card" style={{ padding: 24 }}>
      <h1
        style={{
          fontFamily: 'var(--pt-font-display, sans-serif)',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        {content.meta.title}
      </h1>
      {content.meta.level && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--pt-muted, #6b7568)',
            marginBottom: 20,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Niveau : {content.meta.level} · Lecture {content.meta.reading_time_min ?? '?'} min
        </div>
      )}
      <div
        className="encyclopedia-body"
        style={{ lineHeight: 1.7, fontSize: 14 }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content.body) }}
      />
    </article>
  );
};
