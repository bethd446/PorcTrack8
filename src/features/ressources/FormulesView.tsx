/**
 * FormulesView — /ressources/aliments/formules
 * ══════════════════════════════════════════════════════════════════════════
 * V70 natif (mockup ressources-reproduction-mockup-v76.html#ressources-formules).
 * Liste de cartes formule avec composition (matière + %) en mono tabular-nums,
 * pill phase ciblée. Calculateur de masse en haut + chips phase. CTA
 * « Plan d’alimentation » en bas.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';
import {
  Calculator, AlertTriangle, Pencil, Plus, FlaskConical, ChevronRight,
} from 'lucide-react';
import {
  PHASE_LABELS,
  PHASE_TONES,
  type FormuleAliment,
  type PhaseCode,
} from '../../config/aliments';
import { calculerRation, type CalculResult } from '../../services/rationCalculator';
import { useFarm } from '../../context/FarmContext';
import { Section } from '../../v70/components/ds/Section';
import { Pill, type PillVariant } from '../../v70/components/ds/Pill';
import { PageHeader } from '../../v70/components/ds/PageHeader';

const PRESETS_KG: ReadonlyArray<{ label: string; value: number }> = [
  { label: '100 kg', value: 100 },
  { label: '500 kg', value: 500 },
  { label: '1 tonne', value: 1000 },
  { label: '2 tonnes', value: 2000 },
];

function pillVariantForPhase(code: PhaseCode): PillVariant {
  switch (PHASE_TONES[code]) {
    case 'amber':
      return 'warning';
    case 'accent':
      return 'soft';
    case 'blue':
      return 'info';
    case 'gold':
      return 'warm';
    default:
      return 'ghost';
  }
}

function formatKg(n: number): string {
  if (!isFinite(n)) return '—';
  if (n === 0) return '0';
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
}

interface FormuleCardProps {
  formule: FormuleAliment;
  calcul: CalculResult;
}

const FormuleCard: React.FC<FormuleCardProps> = ({ formule, calcul }) => {
  return (
    <article
      className="card"
      style={{
        padding: 16,
        marginBottom: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
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
          <div
            style={{
              fontSize: 12,
              color: 'var(--pt-muted)',
              marginTop: 4,
            }}
          >
            {formule.phase} · {formule.poidsRange}
          </div>
        </div>
        <Pill variant={pillVariantForPhase(formule.code)}>
          {PHASE_LABELS[formule.code] ?? formule.code}
        </Pill>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {calcul.ingredients.map((ing) => (
          <div key={ing.nom} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                fontFamily: 'var(--pt-font-mono)',
                fontSize: 12,
                color: 'var(--pt-ink)',
              }}
            >
              <span style={{ fontWeight: 600 }}>{ing.nom}</span>
              <span className="num" style={{ color: 'var(--pt-muted)' }}>
                {ing.pourcent}% · <b style={{ color: 'var(--pt-ink)' }}>{formatKg(ing.kg)} kg</b>
              </span>
            </div>
            <div
              style={{
                height: 4,
                background: 'var(--pt-bg-app)',
                borderRadius: 99,
                overflow: 'hidden',
              }}
              aria-hidden
            >
              <span
                style={{
                  display: 'block',
                  height: '100%',
                  width: `${Math.max(0, Math.min(100, ing.pourcent))}%`,
                  background: 'var(--pt-primary)',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {calcul.additifs.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            paddingTop: 8,
            borderTop: '1px solid var(--pt-line)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--pt-font-mono)',
              fontSize: 10,
              color: 'var(--pt-subtle)',
              textTransform: 'uppercase',
              letterSpacing: '0.10em',
            }}
          >
            Additifs
          </div>
          {calcul.additifs.map((add) => (
            <div
              key={add.nom}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: 'var(--pt-font-mono)',
                fontSize: 12,
                color: 'var(--pt-muted)',
              }}
            >
              <span>{add.nom}</span>
              <span className="num">
                {add.doseRef} · <b style={{ color: 'var(--pt-ink)' }}>{add.quantiteAffiche}</b>
              </span>
            </div>
          ))}
        </div>
      )}

      {calcul.warnings.length > 0 && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--pt-warning)',
            fontSize: 12,
          }}
        >
          <AlertTriangle size={14} aria-hidden />
          <span>{calcul.warnings[0]}</span>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 8,
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
          {formatKg(calcul.masseTotaleKg)}
          <small style={{ fontSize: 11, fontWeight: 600, marginLeft: 4, color: 'var(--pt-muted)' }}>
            kg total
          </small>
        </div>
        <button
          type="button"
          aria-label={`Modifier ${formule.nom}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 12,
            background: 'transparent',
            border: '1px solid var(--pt-line-strong)',
            color: 'var(--pt-muted)',
            fontFamily: 'var(--pt-font-mono)',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.10em',
            cursor: 'pointer',
            minHeight: 36,
          }}
        >
          <Pencil size={12} aria-hidden /> Modifier
        </button>
      </div>
    </article>
  );
};

const FormulesView: React.FC = () => {
  const navigate = useNavigate();
  const [masseKg, setMasseKg] = useState<number>(1000);
  const [filter, setFilter] = useState<string>('all');
  const { alimentFormules } = useFarm();

  const calculs = useMemo(
    () =>
      alimentFormules.map((f) => ({
        formule: f,
        calcul: calculerRation(f, masseKg),
      })),
    [masseKg, alimentFormules],
  );

  const filterOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; count: number }> = [
      { value: 'all', label: 'Toutes', count: alimentFormules.length },
    ];
    for (const f of alimentFormules) {
      opts.push({
        value: f.code,
        label: PHASE_LABELS[f.code] ?? f.code,
        count: 1,
      });
    }
    return opts;
  }, [alimentFormules]);

  const filteredCalculs = useMemo(
    () => (filter === 'all' ? calculs : calculs.filter((c) => c.formule.code === filter)),
    [calculs, filter],
  );

  const handleMasseChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = Number(e.target.value);
    if (Number.isFinite(v) && v >= 0) setMasseKg(v);
    else if (e.target.value === '') setMasseKg(0);
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <div className="phone-content" style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
          <PageHeader
            eyebrow="Stocks · Formules"
            title="Formules"
            subtitle={`${alimentFormules.length} recette${alimentFormules.length > 1 ? 's' : ''} par phase de cycle`}
            onBack={() => navigate('/ressources')}
          />

          <div
            className="card"
            style={{
              padding: 16,
              marginBottom: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'var(--pt-font-display)',
                fontWeight: 800,
                textTransform: 'uppercase',
                fontSize: 14,
                letterSpacing: '0.04em',
              }}
            >
              <Calculator size={16} aria-hidden style={{ color: 'var(--pt-accent)' }} />
              Calculateur
            </div>
            <label
              htmlFor="masse-aliment"
              style={{
                fontFamily: 'var(--pt-font-mono)',
                fontSize: 11,
                color: 'var(--pt-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Quantité d’aliment à préparer (kg)
            </label>
            <input
              id="masse-aliment"
              type="number"
              inputMode="numeric"
              min={0}
              step={50}
              value={masseKg}
              onChange={handleMasseChange}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--pt-line-strong)',
                background: 'var(--pt-bg)',
                fontFamily: 'var(--pt-font-mono)',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--pt-ink)',
                minHeight: 44,
              }}
            />
            <div
              role="group"
              aria-label="Préréglages de masse"
              style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}
            >
              {PRESETS_KG.map((p) => {
                const active = masseKg === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setMasseKg(p.value)}
                    aria-pressed={active}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 999,
                      border: '1px solid var(--pt-line-strong)',
                      background: active ? 'var(--pt-ink)' : 'transparent',
                      color: active ? 'var(--pt-warm)' : 'var(--pt-muted)',
                      fontFamily: 'var(--pt-font-mono)',
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.10em',
                      cursor: 'pointer',
                      minHeight: 36,
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 12, color: 'var(--pt-muted)', margin: 0 }}>
              Les quantités ci-dessous se recalculent automatiquement.
            </p>
          </div>

          {alimentFormules.length > 0 && (
            <div className="chips" style={{ marginBottom: 4 }}>
              {filterOptions.map((opt) => {
                const active = filter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className="chip"
                    aria-pressed={active}
                    onClick={() => setFilter(opt.value)}
                  >
                    {opt.label}
                    {opt.value !== 'all' && (
                      <span className="num">{opt.count}</span>
                    )}
                    {opt.value === 'all' && (
                      <span className="num">{alimentFormules.length}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <Section
            label={`${filteredCalculs.length} formule${filteredCalculs.length > 1 ? 's' : ''}`}
          >
            {alimentFormules.length === 0 ? (
              <div className="empty">
                <FlaskConical size={48} strokeWidth={1.25} color="var(--pt-subtle)" aria-hidden />
                <div style={{ fontFamily: 'var(--pt-font-display)', fontWeight: 900, fontSize: 22, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                  Aucune formule
                </div>
                <div style={{ fontSize: 13, color: 'var(--pt-muted)' }}>
                  Charge l’onglet ALIMENT_FORMULES côté Sheets, ou ajoute une formule de démo.
                </div>
              </div>
            ) : filteredCalculs.length === 0 ? (
              <div className="empty">
                <FlaskConical size={40} strokeWidth={1.25} color="var(--pt-subtle)" aria-hidden />
                <div style={{ fontFamily: 'var(--pt-font-display)', fontWeight: 900, fontSize: 18, textTransform: 'uppercase' }}>
                  Aucune formule dans ce filtre
                </div>
                <div style={{ fontSize: 13, color: 'var(--pt-muted)' }}>
                  Sélectionne « Toutes » pour voir toutes les formules disponibles.
                </div>
              </div>
            ) : (
              filteredCalculs.map(({ formule, calcul }) => (
                <FormuleCard key={formule.code} formule={formule} calcul={calcul} />
              ))
            )}
          </Section>

          <button
            type="button"
            className="card-link"
            style={{ borderStyle: 'dashed', marginTop: 4 }}
            onClick={() => navigate('/ressources/aliments/plan')}
            aria-label="Voir le plan d’alimentation"
          >
            <div className="card-link__icon" aria-hidden>
              <Plus size={18} />
            </div>
            <div className="card-link__main">
              <div className="card-link__title">Plan d’alimentation</div>
              <div className="card-link__sub">
                Couverture des stocks et rations journalières par catégorie.
              </div>
            </div>
            <span className="card-link__chev"><ChevronRight aria-hidden /></span>
          </button>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default FormulesView;
