/**
 * V70 — Page Encyclopédie (route /reglages/encyclopedie)
 *
 * V77 — Refonte mockup `encyclopedie-index.html` + recherche intégrée
 * (mockup `encyclopedie-recherche.html`). Liste d'articles sectionnée par
 * catégorie, header vert plein, searchbar sticky, empty state V77.
 *
 * Continuités préservées :
 *  - h1 « Encyclopédie porcine » (test V70Routes.test.tsx)
 *  - export `ARTICLES` (consommé par ReglagesV70 pour le compteur)
 *  - deep-link `?slug=...` (TodayV70 hints contextuels)
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  X,
  SearchX,
  MessageSquare,
  RefreshCw,
  Activity,
  Droplets,
  Microscope,
  Pill,
  Syringe,
  Scale,
  PiggyBank,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import { EncyclopediaArticle } from '../components/v70/EncyclopediaArticle';

type CategoryGroup =
  | 'Cycles de vie'
  | 'Santé & maladies'
  | 'Économie & gestion'
  | 'Alimentation'
  | 'Reproduction';

interface ArticleEntry {
  slug: string;
  title: string;
  category: string;
  level: string;
  /** Catégorie d'affichage V77 (groupe de section). */
  group: CategoryGroup;
  /** Durée de lecture estimée (min). */
  readingMin: number;
  /** Icône lucide (constructor). */
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}

// V75-v P2#7 — Exporté pour synchroniser le compteur avec ReglagesV70.
export const ARTICLES: ArticleEntry[] = [
  {
    slug: '01-cycle-vie-truie',
    title: 'Le cycle de vie de la truie',
    category: 'Cycles',
    level: 'débutant',
    group: 'Cycles de vie',
    readingMin: 7,
    icon: RefreshCw,
  },
  {
    slug: '02-isse-optimisation',
    title: 'Comprendre l’ISSE et l’optimiser',
    category: 'Économique',
    level: 'intermédiaire',
    group: 'Économie & gestion',
    readingMin: 5,
    icon: Scale,
  },
  {
    slug: '03-biosecurite-bases',
    title: 'Biosécurité élevage porcin',
    category: 'Santé',
    level: 'débutant',
    group: 'Santé & maladies',
    readingMin: 9,
    icon: Microscope,
  },
  {
    slug: '04-alimentation-gestation',
    title: 'Alimentation pendant la gestation',
    category: 'Alimentation',
    level: 'intermédiaire',
    group: 'Alimentation',
    readingMin: 6,
    icon: Droplets,
  },
  {
    slug: '05-sevrage-timing-conditions',
    title: 'Le sevrage : timing et conditions',
    category: 'Cycles',
    level: 'intermédiaire',
    group: 'Cycles de vie',
    readingMin: 8,
    icon: Activity,
  },
  {
    slug: '06-mortalite-allaitement',
    title: 'Mortalité allaitement : causes et prévention',
    category: 'Santé',
    level: 'intermédiaire',
    group: 'Santé & maladies',
    readingMin: 12,
    icon: Pill,
  },
  {
    slug: '07-reforme-zootechnique',
    title: 'Réforme zootechnique : critères de décision',
    category: 'Reproduction',
    level: 'avancé',
    group: 'Reproduction',
    readingMin: 7,
    icon: Syringe,
  },
  {
    slug: '08-lignees-tropicales',
    title: 'Lignées génétiques en climat tropical',
    category: 'Reproduction',
    level: 'intermédiaire',
    group: 'Reproduction',
    readingMin: 8,
    icon: BookOpen,
  },
  {
    slug: '09-couts-alimentaires',
    title: 'Calcul des coûts alimentaires',
    category: 'Économique',
    level: 'intermédiaire',
    group: 'Économie & gestion',
    readingMin: 6,
    icon: PiggyBank,
  },
  {
    slug: '10-preparation-mise-bas',
    title: 'Préparation à la mise-bas',
    category: 'Cycles',
    level: 'débutant',
    group: 'Cycles de vie',
    readingMin: 5,
    icon: BarChart3,
  },
];

const GROUP_ORDER: CategoryGroup[] = [
  'Cycles de vie',
  'Santé & maladies',
  'Économie & gestion',
  'Alimentation',
  'Reproduction',
];

type FilterKey = 'all' | CategoryGroup;
const FILTER_LABELS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'Cycles de vie', label: 'Cycles' },
  { key: 'Santé & maladies', label: 'Santé' },
  { key: 'Économie & gestion', label: 'Économie' },
  { key: 'Alimentation', label: 'Alimentation' },
  { key: 'Reproduction', label: 'Reproduction' },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const haystack = normalize(text);
  const needle = normalize(query);
  const idx = haystack.indexOf(needle);
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + needle.length)}</mark>
      {text.slice(idx + needle.length)}
    </>
  );
}

export const EncyclopediaPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  // V71 — deep-link via `?slug=...` (depuis hints contextuels TodayV70)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const slug = params.get('slug');
    if (slug && ARTICLES.some((a) => a.slug === slug)) {
      setSelected(slug);
    }
  }, [location.search]);

  const filtered = useMemo(() => {
    const q = normalize(search.trim());
    return ARTICLES.filter((a) => {
      if (filter !== 'all' && a.group !== filter) return false;
      if (!q) return true;
      const haystack = normalize(`${a.title} ${a.category} ${a.level} ${a.group}`);
      return haystack.includes(q);
    });
  }, [search, filter]);

  const grouped = useMemo(() => {
    const map = new Map<CategoryGroup, ArticleEntry[]>();
    for (const a of filtered) {
      const arr = map.get(a.group) ?? [];
      arr.push(a);
      map.set(a.group, arr);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map(
      (g) => [g, map.get(g) as ArticleEntry[]] as const,
    );
  }, [filtered]);

  if (selected) {
    return (
      <div className="pt-screen">
        <EncyclopediaArticle
          slug={selected}
          onBack={() => setSelected(null)}
        />
      </div>
    );
  }

  const isSearching = search.trim().length > 0;

  return (
    <div className="pt-screen">
      <header className="ph--primary">
        <button
          type="button"
          className="back"
          aria-label="Retour"
          onClick={() => navigate('/reglages')}
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        <div className="eyebrow">Apprendre</div>
        <h1>Encyclopédie porcine</h1>
        <div className="sub">{ARTICLES.length} articles — cycles, santé, économie</div>
      </header>

      <div className="searchbar">
        <div className="searchbar__wrap">
          <input
            className="searchbar__input"
            type="search"
            aria-label="Rechercher dans l’encyclopédie"
            placeholder="Chercher un terme…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="searchbar__clear"
              aria-label="Effacer la recherche"
              onClick={() => setSearch('')}
            >
              <X size={12} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>

      <div className="pills" role="tablist" aria-label="Filtrer par catégorie">
        {FILTER_LABELS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            className={`pill${filter === f.key ? ' is-active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state" role="status">
          <div className="empty-state__icon" aria-hidden="true">
            <SearchX size={44} strokeWidth={2} />
          </div>
          <div className="empty-state__title">Aucun résultat</div>
          <div className="empty-state__sub">
            {isSearching
              ? 'Essayez un autre terme ou demandez à Marius.'
              : 'Aucun article dans cette catégorie.'}
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--block"
            onClick={() => navigate('/marius')}
          >
            <MessageSquare size={18} strokeWidth={2} />
            Demander à Marius
          </button>
        </div>
      ) : isSearching ? (
        <section className="section" aria-label="Résultats de recherche">
          <div className="section__label">
            {filtered.length} résultat{filtered.length > 1 ? 's' : ''} pour «&nbsp;{search}&nbsp;»
          </div>
          {filtered.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.slug}
                type="button"
                className="card-link"
                onClick={() => setSelected(a.slug)}
              >
                <span className="card-link__thumb" aria-hidden="true">
                  <Icon size={30} strokeWidth={2} />
                </span>
                <div className="card-link__main">
                  <span className="card-link__title">
                    {highlight(a.title, search)}
                  </span>
                  <span className="card-link__sub">
                    {a.group} · {a.readingMin} min de lecture
                  </span>
                </div>
                <ChevronRight
                  className="card-link__chev"
                  size={18}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </section>
      ) : (
        <>
          {grouped.map(([group, items]) => (
            <section className="section" key={group} aria-label={group}>
              <div className="section__label">{group}</div>
              {items.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.slug}
                    type="button"
                    className="card-link"
                    onClick={() => setSelected(a.slug)}
                  >
                    <span className="card-link__thumb" aria-hidden="true">
                      <Icon size={30} strokeWidth={2} />
                    </span>
                    <div className="card-link__main">
                      <span className="card-link__title">{a.title}</span>
                      <span className="card-link__sub">
                        {a.readingMin} min de lecture · {a.level}
                      </span>
                    </div>
                    <ChevronRight
                      className="card-link__chev"
                      size={18}
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </section>
          ))}

          <button type="button" className="btn btn--ghost btn--block" onClick={() => navigate('/marius')}>
            Suggérer un article ›
          </button>
        </>
      )}
    </div>
  );
};
