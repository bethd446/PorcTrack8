/**
 * FournisseursView — /ressources/fournisseurs
 * ══════════════════════════════════════════════════════════════════════════
 * V78 vague 1 — Hub fournisseurs (mockup
 * docs/mockups/ressources-reproduction-mockup-v76.html#ressources-fournisseurs).
 *
 * Namespace `.pt-screen` + header `.ph--primary`. Searchbar, pills catégorie
 * (Tous / Aliment / Véto / Génétique / Équipement / Autre), liste card-link
 * avec chip catégorie + stars + count commandes + dernier contact.
 * Données statiques (`fournisseursData.ts`) — backend Supabase non câblé.
 */

import React, { useMemo, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, ChevronLeft, ChevronRight, Star, X,
} from 'lucide-react';

import {
  FOURNISSEURS_STATIC,
  type FournisseurCategorie,
  type FournisseurStatic,
} from './fournisseursData';

type FilterKey = 'TOUS' | FournisseurCategorie;

interface FilterDef {
  key: FilterKey;
  label: string;
}

const FILTERS: ReadonlyArray<FilterDef> = [
  { key: 'TOUS', label: 'Tous' },
  { key: 'ALIMENT', label: 'Aliment' },
  { key: 'PHARMACIE', label: 'Véto' },
  { key: 'GENETIQUE', label: 'Génét.' },
  { key: 'EQUIPEMENT', label: 'Équip.' },
  { key: 'AUTRE', label: 'Autre' },
];

interface CategoryPill {
  label: string;
  bg: string;
  fg: string;
}

function categoryPill(c: FournisseurCategorie): CategoryPill {
  switch (c) {
    case 'ALIMENT':
      return { label: 'Aliment', bg: 'var(--pt-cat-aliment-bg)', fg: 'var(--pt-cat-aliment-fg)' };
    case 'PHARMACIE':
      return { label: 'Véto', bg: 'var(--pt-cat-veto-bg)', fg: 'var(--pt-cat-veto-fg)' };
    case 'GENETIQUE':
      return { label: 'Génét.', bg: 'var(--pt-cat-genetique-bg)', fg: 'var(--pt-cat-genetique-fg)' };
    case 'EQUIPEMENT':
      return { label: 'Équip.', bg: 'var(--pt-warm)', fg: 'var(--pt-ink)' };
    case 'AUTRE':
    default:
      return { label: 'Autre', bg: 'var(--pt-warm)', fg: 'var(--pt-ink)' };
  }
}

function formatDateShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });
}

interface StarsProps {
  value: number;
  size?: number;
}

const Stars: React.FC<StarsProps> = ({ value, size = 12 }) => {
  const safe = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className="stars" aria-label={`Note ${safe} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={2}
          fill={i <= safe ? 'currentColor' : 'transparent'}
          className={i <= safe ? '' : 'stars__empty'}
          aria-hidden
        />
      ))}
    </span>
  );
};

function matchesSearch(f: FournisseurStatic, q: string): boolean {
  if (!q.trim()) return true;
  const needle = q.trim().toLowerCase();
  return (
    f.nom.toLowerCase().includes(needle) ||
    f.ville.toLowerCase().includes(needle) ||
    f.telephone.toLowerCase().includes(needle) ||
    (f.email ?? '').toLowerCase().includes(needle)
  );
}

const FournisseursView: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKey>('TOUS');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => {
    const out: Record<FilterKey, number> = {
      TOUS: FOURNISSEURS_STATIC.length,
      ALIMENT: 0,
      PHARMACIE: 0,
      GENETIQUE: 0,
      EQUIPEMENT: 0,
      AUTRE: 0,
    };
    for (const f of FOURNISSEURS_STATIC) {
      out[f.categorie] += 1;
    }
    return out;
  }, []);

  const filtered = useMemo(
    () =>
      FOURNISSEURS_STATIC.filter(
        (f) =>
          (filter === 'TOUS' || f.categorie === filter) && matchesSearch(f, query),
      ),
    [filter, query],
  );

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <div className="pt-screen">
          <header className="ph--primary">
            <button
              type="button"
              className="back"
              aria-label="Retour aux Ressources"
              onClick={() => navigate('/ressources')}
            >
              <ChevronLeft size={18} strokeWidth={2} aria-hidden />
            </button>
            <div className="eyebrow">Stocks · Fournisseurs</div>
            <h1>Fournisseurs</h1>
            <div className="sub">Aliments · vétérinaire · génétique · matériel</div>
          </header>

          <div className="searchbar">
            <div className="searchbar__wrap">
              <input
                className="searchbar__input"
                type="search"
                aria-label="Rechercher un fournisseur"
                placeholder="Rechercher un fournisseur, une ville…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  className="searchbar__clear"
                  aria-label="Effacer la recherche"
                  onClick={() => setQuery('')}
                >
                  <X size={12} strokeWidth={2.2} aria-hidden />
                </button>
              )}
            </div>
          </div>

          <div className="pills" role="tablist" aria-label="Filtrer par catégorie">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              const count = counts[f.key] ?? 0;
              return (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`pill${active ? ' is-active' : ''}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label} <span style={{ opacity: 0.6, marginLeft: 4 }}>{count}</span>
                </button>
              );
            })}
          </div>

          <section className="section" aria-label="Liste des fournisseurs">
            <div className="section__label">
              {filtered.length} fournisseur{filtered.length > 1 ? 's' : ''}
            </div>

            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  border: '1px dashed var(--pt-line)',
                  borderRadius: 16,
                  textAlign: 'center',
                  color: 'var(--pt-muted)',
                  fontFamily: 'var(--pt-font-mono)',
                  fontSize: 13,
                }}
              >
                Aucun fournisseur ne correspond. Essaie « Tous ».
              </div>
            ) : (
              filtered.map((f) => {
                const pill = categoryPill(f.categorie);
                const lastContact = formatDateShort(f.dernierContact);
                const cmdCount = f.commandes.length;
                return (
                  <button
                    key={f.id}
                    type="button"
                    className="card-link"
                    onClick={() => navigate(`/ressources/fournisseurs/${f.id}`)}
                    aria-label={`Ouvrir ${f.nom}`}
                    style={{ alignItems: 'flex-start' }}
                  >
                    <div
                      className="card-link__icon"
                      style={{
                        background: 'var(--pt-emerald-bg)',
                        color: 'var(--pt-emerald-ink)',
                      }}
                      aria-hidden
                    >
                      <Building2 size={18} />
                    </div>
                    <div className="card-link__main">
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'wrap',
                          marginBottom: 4,
                        }}
                      >
                        <span className="card-link__title">{f.nom}</span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: pill.bg,
                            color: pill.fg,
                            fontFamily: 'var(--pt-font-mono)',
                            fontSize: 10,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                          }}
                        >
                          {pill.label}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          marginBottom: 4,
                        }}
                      >
                        <Stars value={f.note} />
                        <span
                          style={{
                            fontFamily: 'var(--pt-font-mono)',
                            fontSize: 11,
                            color: 'var(--pt-muted)',
                            letterSpacing: '0.06em',
                          }}
                        >
                          {cmdCount} cmd · dernier contact {lastContact}
                        </span>
                      </div>
                      <div className="card-link__sub">
                        {f.ville} · {f.telephone}
                      </div>
                    </div>
                    <span className="card-link__chev" aria-hidden>
                      <ChevronRight size={18} />
                    </span>
                  </button>
                );
              })
            )}
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default FournisseursView;
