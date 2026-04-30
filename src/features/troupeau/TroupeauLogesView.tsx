import React, { useMemo, useState } from 'react';
import { Home, ChevronDown, ChevronUp, AlertCircle, Lightbulb } from 'lucide-react';
import { useFarm } from '../../context/FarmContext';
import { IsoBarn, Chip, SectionDivider } from '../../components/agritech';
import { FARM_CONFIG } from '../../config/farm';
import { Bandes } from '../../services/bandAnalysisEngine';
import type { Truie, BandePorcelets } from '../../types/farm';
import { WEIGHTS_RELEVE, ANALYSE_RECOMMANDATIONS } from '../../config/weightsReleve';
import {
  buildLogesBuildings,
  buildLogesArrows,
  LOGES_TONES,
} from './logesBuildingsConfig';

/**
 * TroupeauLogesView — vue dédiée aux loges physiques de la ferme K13.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Sub-tab de `/troupeau` (complément à la liste des truies et bandes).
 *
 * Structure :
 *   1. Summary strip : 15 loges · X truies en mat · Y bandes post-sev · Z bandes engr
 *   2. Diagramme IsoBarn (9 + 4 + 2 loges, flèches de flux)
 *   3. Section Maternité (gold) — liste des truies avec leur loge
 *   4. Section Post-sevrage (teal) — 4 cards loge + progress bars
 *   5. Section Croissance-finition (amber) — bandes ventilées par sexe
 *
 * Lecture seule (consomme `useFarm`). Réutilise `logesBuildingsConfig` pour la
 * géométrie IsoBarn partagée avec `BatimentsView`.
 */

/** Parse "DD/MM/YYYY" → Date | null. */
function parseFrDate(value?: string): Date | null {
  if (!value) return null;
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) {
    // Fallback ISO (YYYY-MM-DD)
    const iso = new Date(value);
    return Number.isNaN(iso.getTime()) ? null : iso;
  }
  const [, d, mo, y] = m;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Jours écoulés depuis une date (floor), ou null si la date est invalide. */
function daysSince(value?: string): number | null {
  const d = parseFrDate(value);
  if (!d) return null;
  const now = Date.now();
  return Math.floor((now - d.getTime()) / (1000 * 60 * 60 * 24));
}

/** True si le statut indique "maternité" (robuste aux accents). */
function isEnMaternite(t: Truie): boolean {
  return /maternit/i.test(t.statut ?? '');
}

const TroupeauLogesView: React.FC = () => {
  const { truies, bandes } = useFarm();
  const [expandedLoge, setExpandedLoge] = useState<string | null>(null);

  const buildings = useMemo(() => buildLogesBuildings(), []);
  const arrows = useMemo(() => buildLogesArrows(), []);

  // ── Classification live ───────────────────────────────────────────────────
  const truiesMat: Truie[] = useMemo(
    () => truies.filter(isEnMaternite),
    [truies],
  );

  const bandesPostSev: BandePorcelets[] = useMemo(
    () => bandes.filter((b) => Bandes.computePhase(b) === 'POST_SEVRAGE'),
    [bandes],
  );

  const bandesEngr: BandePorcelets[] = useMemo(
    () => bandes.filter((b) => Bandes.computePhase(b) === 'ENGRAISSEMENT'),
    [bandes],
  );

  // Split M/F pour croissance-finition
  const bandesMales = useMemo(
    () => bandesEngr.filter((b) => b.logeEngraissement === 'M'),
    [bandesEngr],
  );
  const bandesFemelles = useMemo(
    () => bandesEngr.filter((b) => b.logeEngraissement === 'F'),
    [bandesEngr],
  );
  const bandesNonSeparees = useMemo(
    () =>
      bandesEngr.filter(
        (b) => b.logeEngraissement !== 'M' && b.logeEngraissement !== 'F',
      ),
    [bandesEngr],
  );

  const totalLoges =
    FARM_CONFIG.MATERNITE_LOGES_CAPACITY +
    FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY +
    FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY;

  const isEmpty = truiesMat.length === 0 && bandes.length === 0;

  return (
    <section
      role="region"
      aria-label="Vue des loges physiques de la ferme"
      className="flex flex-col gap-4"
    >
      {/* ── Summary strip ────────────────────────────────────────────────── */}
      <div
        className="card-dense p-3 flex flex-wrap items-center gap-x-4 gap-y-2"
        data-testid="loges-summary-strip"
      >
        <div className="flex items-center gap-2">
          <Home
            size={16}
            aria-hidden="true"
            style={{ color: 'var(--accent)' }}
          />
          <span
            className="font-mono text-[11px] uppercase tracking-wide"
            style={{ color: 'var(--text-2)' }}
          >
            Loges totales
          </span>
          <span
            className="text-[14px] font-semibold"
            style={{ color: 'var(--text-0)' }}
          >
            {totalLoges}
          </span>
        </div>
        <span
          aria-hidden="true"
          className="h-4 w-px"
          style={{ background: 'var(--border)' }}
        />
        <Chip
          tone="gold"
          label={`${truiesMat.length} truies en mat`}
          size="sm"
        />
        <Chip
          tone="teal"
          label={`${bandesPostSev.length} bandes post-sev`}
          size="sm"
        />
        <Chip
          tone="amber"
          label={`${bandesEngr.length} bandes engr`}
          size="sm"
        />
      </div>

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {isEmpty ? (
        <div
          className="card-dense p-4 text-center"
          role="status"
          aria-live="polite"
        >
          <Home
            size={28}
            aria-hidden="true"
            className="mx-auto mb-2"
            style={{ color: 'var(--text-2)' }}
          />
          <p
            className="text-[14px] font-medium"
            style={{ color: 'var(--text-0)' }}
          >
            Aucun animal dans les loges
          </p>
          <p
            className="mt-1 text-[12px]"
            style={{ color: 'var(--text-2)' }}
          >
            Synchronise les données depuis Sheets pour voir l&apos;occupation
            des 15 loges physiques.
          </p>
        </div>
      ) : null}

      {/* ── IsoBarn diagram ──────────────────────────────────────────────── */}
      <div className="card-dense p-3">
        <IsoBarn
          buildings={buildings}
          arrows={arrows}
          width={360}
          height={280}
          ariaLabel="Plan isométrique des loges : maternité, post-sevrage, croissance-finition"
        />
        {/* Légende 3 phases */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: LOGES_TONES.maternite }}
            />
            <span
              className="font-mono uppercase tracking-wide"
              style={{ color: 'var(--text-1)' }}
            >
              Maternité · {FARM_CONFIG.MATERNITE_LOGES_CAPACITY}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: LOGES_TONES.postSevrage }}
            />
            <span
              className="font-mono uppercase tracking-wide"
              style={{ color: 'var(--text-1)' }}
            >
              Post-sev · {FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: LOGES_TONES.engraissement }}
            />
            <span
              className="font-mono uppercase tracking-wide"
              style={{ color: 'var(--text-1)' }}
            >
              Engr · {FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY}
            </span>
          </div>
        </div>
      </div>

      {/* ── Maternité (9 loges, gold) ────────────────────────────────────── */}
      <div>
        <SectionDivider label={`Maternité · ${truiesMat.length}/${FARM_CONFIG.MATERNITE_LOGES_CAPACITY}`} />
        <div className="flex flex-col gap-2">
          {truiesMat.length === 0 ? (
            <p
              className="text-[12px] px-1"
              style={{ color: 'var(--text-2)' }}
            >
              Aucune truie en maternité.
            </p>
          ) : (
            truiesMat.map((t, i) => {
              // Cherche une portée active (sous mère) liée à cette truie
              const portee = bandes.find(
                (b) =>
                  (b.boucleMere && b.boucleMere === t.boucle) ||
                  (b.truie && b.truie === t.displayId),
              );
              const porcelets = portee?.vivants ?? null;
              const jMb = daysSince(portee?.dateMB);
              // Loge : si non renseignée, on assigne dans l'ordre de la liste
              const logeLabel = `Loge ${i + 1}`;
              return (
                <div
                  key={t.id}
                  className="card-dense p-2.5 flex items-center gap-3"
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md"
                    style={{
                      background:
                        'color-mix(in srgb, var(--gold) 18%, var(--bg-1))',
                      color: 'var(--gold)',
                    }}
                  >
                    <Home size={14} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-mono text-[12px] font-semibold"
                        style={{ color: 'var(--text-0)' }}
                      >
                        {t.displayId}
                      </span>
                      {t.nom ? (
                        <span
                          className="text-[12px] truncate"
                          style={{ color: 'var(--text-1)' }}
                        >
                          {t.nom}
                        </span>
                      ) : null}
                      <Chip tone="gold" label={logeLabel} size="xs" />
                    </div>
                    <div
                      className="mt-0.5 font-mono text-[11px] flex items-center gap-2"
                      style={{ color: 'var(--text-2)' }}
                    >
                      {porcelets != null ? (
                        <span>{porcelets} porcelets</span>
                      ) : (
                        <span>—</span>
                      )}
                      {jMb != null ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>J+{jMb} MB</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Post-sevrage (6 loges, teal) ─────────────────────────────────── */}
      <div>
        <SectionDivider
          label={`Post-sevrage · ${FARM_CONFIG.POST_SEVRAGE_LOGES_CAPACITY} loges`}
        />

        {/* Analyse Terrain Banner */}
        <div className="mb-4 flex flex-col gap-2">
          {ANALYSE_RECOMMANDATIONS.map((rec, i) => (
            <div key={i} className="bg-accent/10 border border-accent/20 rounded-xl p-3 flex gap-3">
              <Lightbulb size={18} className="text-accent shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-accent uppercase font-mono">{rec.titre}</p>
                <p className="text-[11px] text-text-1 mt-1 leading-relaxed">
                  <span className="font-bold">Constat:</span> {rec.constat}
                  {rec.diagnostic && <><br /><span className="font-bold">Diag:</span> {rec.diagnostic}</>}
                  <br /><span className="font-bold text-accent">Action:</span> {rec.action}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {FARM_CONFIG.POST_SEVRAGE_LOGES_REPARTITION.map((rep, i) => {
            const key = `LOGE_${i + 1}`;
            const releve = WEIGHTS_RELEVE[key];
            const isExpanded = expandedLoge === key;
            const pct = Math.min(100, Math.round((rep.porcelets / 30) * 100));

            // @ts-expect-error — optional fields (aliment/debutAliment absent on empty loges)
            const aliment = rep.aliment === 'DEMARRAGE_2' ? 'Démarrage 2' : '';
            // @ts-expect-error — optional fields (aliment/debutAliment absent on empty loges)
            const debut = rep.debutAliment;

            return (
              <div
                key={rep.id}
                onClick={() => setExpandedLoge(isExpanded ? null : key)}
                className={`card-dense p-3 flex flex-col gap-2 transition-all cursor-pointer border-l-4 ${
                  isExpanded ? 'col-span-2' : ''
                } ${releve?.moyenne > 15 ? 'border-l-accent' : 'border-l-teal'}`}
                data-testid={`ps-loge-${i + 1}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-wide font-bold text-text-0">
                      {rep.id}
                    </span>
                    {releve && (
                      <Chip
                        tone={releve.moyenne > 15 ? 'accent' : 'default'}
                        label={`${releve.moyenne} kg`}
                        size="xs"
                      />
                    )}
                  </div>
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>

                {!isExpanded && (
                  <div className="h-1 w-full bg-bg-2 rounded-full overflow-hidden">
                    <div className="h-full bg-teal" style={{ width: `${pct}%` }} />
                  </div>
                )}

                {isExpanded && releve && (
                  <div className="bg-bg-1 rounded-lg p-2 space-y-2 mt-1 animate-fade-in">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={12} className="text-amber shrink-0 mt-0.5" />
                      <p className="text-[10px] text-text-1 italic leading-tight">{releve.alerte}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {releve.weights.map((w, idx) => (
                        <span key={idx} className="text-[9px] font-mono bg-bg-2 px-1.5 py-0.5 rounded text-text-2">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-end mt-0.5">
                   <div className="flex flex-col">
                      <span className="font-mono text-[10px] text-text-2">
                        {rep.porcelets} têtes
                      </span>
                      {aliment && <span className="font-mono text-[9px] uppercase text-accent font-bold mt-0.5">{aliment}</span>}
                   </div>
                   {debut && <span className="font-mono text-[8px] text-text-2 opacity-60">depuis {debut}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Croissance-finition (2 loges, amber) ─────────────────────────── */}
      <div>
        <SectionDivider
          label={`Croissance-finition · ${FARM_CONFIG.ENGRAISSEMENT_LOGES_CAPACITY} loges`}
        />
        <div className="flex flex-col gap-2">
          {/* Mâles */}
          <div className="card-dense p-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[11px] uppercase tracking-wide"
                  style={{ color: 'var(--text-0)' }}
                >
                  Mâles
                </span>
                <Chip tone="amber" label="CR-M" size="xs" />
              </div>
              <span
                className="font-mono text-[11px]"
                style={{ color: 'var(--text-2)' }}
              >
                {bandesMales.length} bande{bandesMales.length > 1 ? 's' : ''}
              </span>
            </div>
            {bandesMales.length === 0 ? (
              <p
                className="mt-1.5 text-[11px]"
                style={{ color: 'var(--text-2)' }}
              >
                —
              </p>
            ) : (
              <ul className="mt-1.5 flex flex-col gap-1">
                {bandesMales.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between text-[12px]"
                  >
                    <span
                      className="font-mono"
                      style={{ color: 'var(--text-1)' }}
                    >
                      {b.idPortee || b.id}
                    </span>
                    <span
                      className="font-mono text-[11px]"
                      style={{ color: 'var(--text-2)' }}
                    >
                      {b.nbMales ?? b.vivants ?? 0} porcelets
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Femelles */}
          <div className="card-dense p-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[11px] uppercase tracking-wide"
                  style={{ color: 'var(--text-0)' }}
                >
                  Femelles
                </span>
                <Chip tone="amber" label="CR-F" size="xs" />
              </div>
              <span
                className="font-mono text-[11px]"
                style={{ color: 'var(--text-2)' }}
              >
                {bandesFemelles.length} bande
                {bandesFemelles.length > 1 ? 's' : ''}
              </span>
            </div>
            {bandesFemelles.length === 0 ? (
              <p
                className="mt-1.5 text-[11px]"
                style={{ color: 'var(--text-2)' }}
              >
                —
              </p>
            ) : (
              <ul className="mt-1.5 flex flex-col gap-1">
                {bandesFemelles.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between text-[12px]"
                  >
                    <span
                      className="font-mono"
                      style={{ color: 'var(--text-1)' }}
                    >
                      {b.idPortee || b.id}
                    </span>
                    <span
                      className="font-mono text-[11px]"
                      style={{ color: 'var(--text-2)' }}
                    >
                      {b.nbFemelles ?? b.vivants ?? 0} porcelets
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Non séparées (info) */}
          {bandesNonSeparees.length > 0 ? (
            <div
              className="card-dense p-2.5"
              style={{ borderColor: 'var(--amber)' }}
            >
              <div className="flex items-center gap-2">
                <Chip
                  tone="amber"
                  label={`${bandesNonSeparees.length} non séparée${bandesNonSeparees.length > 1 ? 's' : ''}`}
                  size="xs"
                />
                <span
                  className="text-[11px]"
                  style={{ color: 'var(--text-2)' }}
                >
                  Saisie de séparation M/F attendue
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default TroupeauLogesView;
