/**
 * FormulesView — /ressources/formules
 * ══════════════════════════════════════════════════════════════════════════
 * V78 hub liste (refonte sur mockup `ressources-reproduction-mockup-v76.html`
 * section A.3 « Formules d'aliment » lignes 583-722).
 *
 * Liste compacte : chip phase + coût/kg + date MAJ. Tap sur une carte =>
 * détail `/ressources/formules/:id` (FormuleDetailView). Pills phase en
 * haut pour filtrer. Bouton « Nouvelle formule » en bas (non câblé, hors
 * scope V78). Header `pt-screen` + `ph--primary` aligné sur RessourcesHub.
 *
 * Données : `formulesData.FORMULES` (hardcodé V78). Le pipeline Sheets
 * `alimentFormules` reste branché côté contexte (FarmContext), mais ces
 * écrans Formules consomment d'abord la donnée maquette pour livrer.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import { ChevronLeft, ChevronRight, Plus, FlaskConical } from 'lucide-react';

import { Section } from '../../v70/components/ds/Section';
import { Pill, type PillVariant } from '../../v70/components/ds/Pill';
import {
  FORMULES,
  buildPhaseFilters,
  type Formule,
  type FormulePillTone,
} from './formulesData';

function pillVariantForTone(tone: FormulePillTone): PillVariant {
  switch (tone) {
    case 'amber':
      return 'warning';
    case 'soft':
      return 'soft';
    case 'success':
      return 'success';
    case 'info':
      return 'info';
    case 'warm':
      return 'warm';
    default:
      return 'ghost';
  }
}

function formatDateMAJ(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
}

function formatNumFcfa(n: number): string {
  return n.toLocaleString('fr-FR');
}

interface FormuleListItemProps {
  formule: Formule;
  onClick: () => void;
}

const FormuleListItem: React.FC<FormuleListItemProps> = ({ formule, onClick }) => {
  return (
    <button
      data-pt-btn=""
      type="button"
      onClick={onClick}
      aria-label={`Ouvrir la formule ${formule.nom}`}
      className="card"
      style={{
        width: '100%',
        textAlign: 'left',
        padding: 16,
        marginBottom: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        cursor: 'pointer',
        background: 'var(--pt-bg)',
        border: '1px solid var(--pt-line)',
        borderRadius: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3
            style={{
              fontFamily: 'var(--pt-font-display)',
              fontWeight: 900,
              fontSize: 18,
              textTransform: 'uppercase',
              letterSpacing: '-0.005em',
              lineHeight: 1.05,
              margin: 0,
              color: 'var(--pt-ink)',
            }}
          >
            {formule.nom}
          </h3>
          <div style={{ fontSize: 12, color: 'var(--pt-muted)', marginTop: 4 }}>
            {formule.description}
          </div>
        </div>
        <Pill variant={pillVariantForTone(formule.pillTone)}>{formule.pillLabel}</Pill>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          paddingTop: 10,
          borderTop: '1px solid var(--pt-line)',
        }}
      >
        <div
          className="num"
          style={{
            fontFamily: 'var(--pt-font-display)',
            fontWeight: 900,
            fontSize: 22,
            color: 'var(--pt-accent)',
            letterSpacing: '-0.005em',
          }}
        >
          {formatNumFcfa(formule.coutKgFcfa)}
          <small
            style={{
              fontSize: 11,
              fontWeight: 600,
              marginLeft: 4,
              color: 'var(--pt-muted)',
              fontFamily: 'var(--pt-font-mono)',
            }}
          >
            FCFA / kg
          </small>
        </div>
        <div
          style={{
            fontFamily: 'var(--pt-font-mono)',
            fontSize: 11,
            color: 'var(--pt-subtle)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          MAJ {formatDateMAJ(formule.dateMAJ)}
        </div>
      </div>
    </button>
  );
};

const FormulesView: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>('all');

  const filters = useMemo(() => buildPhaseFilters(FORMULES), []);
  const visible = useMemo(
    () => (filter === 'all' ? FORMULES : FORMULES.filter((f) => f.pillLabel === filter)),
    [filter],
  );

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <div className="pt-screen">
          <header className="ph--primary">
            <button
              data-pt-btn=""
              type="button"
              className="back"
              aria-label="Retour aux ressources"
              onClick={() => navigate('/ressources')}
            >
              <ChevronLeft size={18} strokeWidth={1.8} aria-hidden />
            </button>
            <div className="eyebrow">Stocks · Formules</div>
            <h1>Formules</h1>
            <div className="sub">
              <b className="num">{FORMULES.length} recettes</b> par phase de cycle · prix avril 2026
            </div>
          </header>

          <div
            className="phone-content"
            style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}
          >
            <div className="chips" style={{ marginBottom: 12 }}>
              {filters.map((opt) => {
                const active = filter === opt.value;
                return (
                  <button
                    data-pt-btn=""
                    key={opt.value}
                    type="button"
                    className="chip"
                    aria-pressed={active}
                    onClick={() => setFilter(opt.value)}
                  >
                    {opt.label}
                    <span className="num">{opt.count}</span>
                  </button>
                );
              })}
            </div>

            <Section
              label={`${visible.length} formule${visible.length > 1 ? 's' : ''}`}
            >
              {visible.length === 0 ? (
                <div className="empty">
                  <FlaskConical size={40} strokeWidth={1.25} color="var(--pt-subtle)" aria-hidden />
                  <div
                    style={{
                      fontFamily: 'var(--pt-font-display)',
                      fontWeight: 900,
                      fontSize: 18,
                      textTransform: 'uppercase',
                    }}
                  >
                    Aucune formule dans ce filtre
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--pt-muted)' }}>
                    Sélectionne « Toutes » pour voir toutes les recettes disponibles.
                  </div>
                </div>
              ) : (
                visible.map((f) => (
                  <FormuleListItem
                    key={f.id}
                    formule={f}
                    onClick={() => navigate(`/ressources/formules/${f.id}`)}
                  />
                ))
              )}
            </Section>

            <button
              data-pt-btn=""
              type="button"
              className="card-link"
              style={{ borderStyle: 'dashed', marginTop: 4 }}
              onClick={() => navigate('/ressources/formules')}
              aria-label="Nouvelle formule (à venir)"
              disabled
            >
              <div className="card-link__icon" aria-hidden>
                <Plus size={18} />
              </div>
              <div className="card-link__main">
                <div className="card-link__title">Nouvelle formule</div>
                <div className="card-link__sub">
                  Composer une recette à partir de tes matières premières (à venir)
                </div>
              </div>
              <span className="card-link__chev"><ChevronRight aria-hidden /></span>
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default FormulesView;
