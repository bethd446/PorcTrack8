import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Syringe,
  Pill,
  Bug,
  ShieldCheck,
} from 'lucide-react';
import { PROTOCOLS, type ProtocolCategory } from './protocolsData';

type CategoryKey = 'all' | ProtocolCategory;

const SECTION_BY_CATEGORY: Record<ProtocolCategory, string> = {
  vaccins: 'Vaccins recommandés',
  traitements: 'Traitements courants',
  deparasitage: 'Traitements courants',
  biosecurite: 'Biosécurité',
  reproduction: 'Reproduction',
  urgences: 'Urgences',
};

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'vaccins', label: 'Vaccins' },
  { key: 'traitements', label: 'Traitements' },
  { key: 'deparasitage', label: 'Déparasitage' },
  { key: 'biosecurite', label: 'Biosécurité' },
  { key: 'reproduction', label: 'Reproduction' },
  { key: 'urgences', label: 'Urgences' },
];

function categoryIcon(cat: ProtocolCategory) {
  switch (cat) {
    case 'vaccins':
      return { Component: Syringe, className: 'icon-vaccins' };
    case 'traitements':
      return { Component: Pill, className: 'icon-traitements' };
    case 'deparasitage':
      return { Component: Bug, className: 'icon-deparasitage' };
    case 'biosecurite':
      return { Component: ShieldCheck, className: 'icon-biosecurite' };
    case 'reproduction':
      return { Component: Pill, className: 'icon-reproduction' };
    case 'urgences':
      return { Component: ShieldCheck, className: 'icon-urgences' };
    default:
      return { Component: Pill, className: 'icon-traitements' };
  }
}

const ProtocolsView: React.FC = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState<CategoryKey>('all');

  const grouped = useMemo(() => {
    const list = active === 'all' ? PROTOCOLS : PROTOCOLS.filter((p) => p.category === active);
    const map = new Map<string, typeof PROTOCOLS>();
    for (const p of list) {
      const section = SECTION_BY_CATEGORY[p.category];
      const arr = map.get(section) ?? [];
      arr.push(p);
      map.set(section, arr);
    }
    return Array.from(map.entries());
  }, [active]);

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <div className="pt-screen">
          <header className="ph--primary">
            <button
              type="button"
              className="back"
              aria-label="Retour"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft size={18} strokeWidth={2} />
            </button>
            <div className="eyebrow">Santé &amp; biosécurité</div>
            <h1>Protocoles</h1>
            <div className="sub">
              {PROTOCOLS.length} SOPs — vaccins, traitements, biosécurité
            </div>
          </header>

          <div className="pills" role="tablist" aria-label="Catégories de protocoles">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                role="tab"
                aria-selected={active === cat.key}
                className={`pill${active === cat.key ? ' is-active' : ''}`}
                onClick={() => setActive(cat.key)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {grouped.length === 0 && (
            <div className="empty-state">
              <div className="empty-state__title">Aucun protocole</div>
              <div className="empty-state__sub">
                Aucune fiche dans cette catégorie pour l’instant.
              </div>
            </div>
          )}

          {grouped.map(([section, items]) => (
            <section className="section" key={section} aria-label={section}>
              <div className="section__label">{section}</div>

              {items.map((p) => {
                const { Component: Icon, className } = categoryIcon(p.category);
                return (
                  <button
                    type="button"
                    key={p.id}
                    className="card-link"
                    onClick={() => navigate(`/protocoles/${p.id}`)}
                  >
                    {p.badge && <span className="card-link__badge">{p.badge}</span>}
                    <span className={`card-link__icon ${className}`} aria-hidden="true">
                      <Icon size={20} strokeWidth={2} />
                    </span>
                    <div className="card-link__main">
                      <span className="card-link__title">{p.title}</span>
                      <span className="card-link__sub">{p.subtitle}</span>
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

          <button
            type="button"
            className="fab"
            aria-label="Ajouter un protocole"
            onClick={() => navigate('/protocoles/nouveau')}
          >
            <Plus size={22} strokeWidth={2} />
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ProtocolsView;
