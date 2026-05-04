/**
 * V70 — Page Encyclopédie (route /reglages/encyclopedie)
 *
 * Phase 6 niveau B : liste d'articles + lecteur intégré.
 * 5 articles V70 (cycle, ISSE, biosécurité, alimentation gestation, sevrage).
 */
import React, { useState } from 'react';
import { EncyclopediaArticle } from '../components/v70/EncyclopediaArticle';
import { PageHeader } from '../components/ds/PageHeader';
import { Section } from '../components/ds/Section';
import { ListItem } from '../components/ds/ListItem';

interface ArticleEntry {
  slug: string;
  title: string;
  category: string;
  level: string;
}

const ARTICLES: ArticleEntry[] = [
  {
    slug: '01-cycle-vie-truie',
    title: 'Le cycle de vie de la truie',
    category: 'Cycles',
    level: 'débutant',
  },
  {
    slug: '02-isse-optimisation',
    title: "Comprendre l'ISSE et l'optimiser",
    category: 'Économique',
    level: 'intermédiaire',
  },
  {
    slug: '03-biosecurite-bases',
    title: 'Biosécurité élevage porcin',
    category: 'Santé',
    level: 'débutant',
  },
  {
    slug: '04-alimentation-gestation',
    title: 'Alimentation pendant la gestation',
    category: 'Alimentation',
    level: 'intermédiaire',
  },
  {
    slug: '05-sevrage-timing-conditions',
    title: 'Le sevrage : timing et conditions',
    category: 'Cycles',
    level: 'intermédiaire',
  },
];

export const EncyclopediaPage: React.FC = () => {
  const [selected, setSelected] = useState<string | null>(null);

  if (selected) {
    return (
      <div style={{ padding: 16 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setSelected(null)}
          style={{ marginBottom: 12 }}
        >
          ← Retour
        </button>
        <EncyclopediaArticle slug={selected} />
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <PageHeader
        eyebrow="Configuration · Aide"
        title="Encyclopédie porcine"
        subtitle={`${ARTICLES.length} articles · Cycles, santé, économie, alimentation`}
      />
      <Section label={`${ARTICLES.length} articles`}>
        {ARTICLES.map((a) => (
          <ListItem
            key={a.slug}
            title={a.title}
            subtitle={`${a.category} · ${a.level}`}
            trailing={<span className="list-arrow">›</span>}
            onClick={() => setSelected(a.slug)}
          />
        ))}
      </Section>
    </div>
  );
};
