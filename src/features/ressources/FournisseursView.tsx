/**
 * FournisseursView — /fournisseurs
 * ══════════════════════════════════════════════════════════════════════════
 * V70 natif (mockup ressources-reproduction-mockup-v76.html#ressources-fournisseurs).
 * Filtres chips (Tous / Aliment / Véto / Génétique / Matériel) + liste
 * card-link (Building2). FAB création. Suppression conservée via confirm.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonContent, IonPage, IonToast, useIonAlert } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Building2, Trash2, ChevronRight, Search as SearchIcon,
} from 'lucide-react';

import QuickAddFournisseurForm from '../../components/forms/QuickAddFournisseurForm';
import { Section } from '../../v70/components/ds/Section';
import { Pill, type PillVariant } from '../../v70/components/ds/Pill';
import { PageHeader } from '../../v70/components/ds/PageHeader';
import {
  listFournisseurs,
  deleteFournisseur,
  type FournisseurRow,
  type FournisseurType,
} from '../../services/supabaseWrites';

type FilterKey = 'TOUS' | 'ALIMENT' | 'PHARMACIE' | 'GENETIQUE' | 'AUTRE';

interface TabDef {
  value: FilterKey;
  label: string;
}

const TABS: ReadonlyArray<TabDef> = [
  { value: 'TOUS', label: 'Tous' },
  { value: 'ALIMENT', label: 'Aliment' },
  { value: 'PHARMACIE', label: 'Véto' },
  { value: 'GENETIQUE', label: 'Génét.' },
  { value: 'AUTRE', label: 'Matériel' },
];

function pillForType(type: FournisseurType | null): { variant: PillVariant; label: string } {
  switch (type) {
    case 'ALIMENT':
      return { variant: 'success', label: 'Aliment' };
    case 'PHARMACIE':
      return { variant: 'info', label: 'Véto' };
    case 'GENETIQUE':
      return { variant: 'warm', label: 'Génét.' };
    case 'AUTRE':
    default:
      return { variant: 'soft', label: 'Matériel' };
  }
}

function matchesFilter(row: FournisseurRow, filter: FilterKey): boolean {
  if (filter === 'TOUS') return true;
  const type = row.type ?? 'AUTRE';
  return type === filter;
}

function matchesSearch(row: FournisseurRow, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return (
    row.nom.toLowerCase().includes(q) ||
    (row.whatsapp_number ?? '').toLowerCase().includes(q) ||
    (row.email ?? '').toLowerCase().includes(q)
  );
}

const FournisseursView: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<FournisseurRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState<FilterKey>('TOUS');
  const [query, setQuery] = useState('');
  const [presentAlert] = useIonAlert();

  const refresh = useCallback(async (signal?: { cancelled: boolean }) => {
    setLoading(true);
    try {
      const list = await listFournisseurs();
      if (signal?.cancelled) return;
      setRows(list);
    } finally {
      if (!signal?.cancelled) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    void refresh(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [refresh]);

  const handleDelete = useCallback(
    (row: FournisseurRow) => {
      presentAlert({
        header: 'Supprimer ce fournisseur',
        message: `Confirmer la suppression de ${row.nom} ?`,
        buttons: [
          { text: 'Annuler', role: 'cancel' },
          {
            text: 'Supprimer',
            role: 'destructive',
            handler: () => {
              void (async () => {
                try {
                  await deleteFournisseur(row.id);
                  setToast('Fournisseur supprimé');
                  await refresh();
                } catch (err) {
                  setToast(
                    err instanceof Error ? err.message : 'Erreur suppression',
                  );
                }
              })();
            },
          },
        ],
      });
    },
    [presentAlert, refresh],
  );

  const counts = useMemo(() => {
    const out: Record<FilterKey, number> = {
      TOUS: rows.length,
      ALIMENT: 0,
      PHARMACIE: 0,
      GENETIQUE: 0,
      AUTRE: 0,
    };
    for (const r of rows) {
      const type: FilterKey = (r.type as FilterKey) ?? 'AUTRE';
      out[type] = (out[type] ?? 0) + 1;
    }
    return out;
  }, [rows]);

  const filtered = useMemo(
    () => rows.filter((r) => matchesFilter(r, filter) && matchesSearch(r, query)),
    [rows, filter, query],
  );

  const isEmpty = !loading && rows.length === 0;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <div className="phone-content" style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
          <PageHeader
            eyebrow="Stocks · Fournisseurs"
            title="Fournisseurs"
            subtitle="Aliments · vétérinaire · génétique · matériel"
            onBack={() => navigate('/ressources')}
          />

          <div
            style={{
              position: 'relative',
              marginBottom: 12,
            }}
          >
            <SearchIcon
              size={16}
              aria-hidden
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--pt-muted)',
              }}
            />
            <input
              type="search"
              placeholder="Rechercher un fournisseur"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Rechercher un fournisseur"
              style={{
                width: '100%',
                padding: '12px 14px 12px 38px',
                borderRadius: 999,
                border: '1px solid var(--pt-line-strong)',
                background: 'var(--pt-bg)',
                fontFamily: 'var(--pt-font-body)',
                fontSize: 13,
                color: 'var(--pt-ink)',
                outline: 'none',
                minHeight: 44,
              }}
            />
          </div>

          <div className="chips" style={{ marginBottom: 4 }}>
            {TABS.map((t) => {
              const active = filter === t.value;
              const count = counts[t.value] ?? 0;
              return (
                <button
                  key={t.value}
                  type="button"
                  className="chip"
                  aria-pressed={active}
                  onClick={() => setFilter(t.value)}
                >
                  {t.label} <span className="num">{count}</span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <p
              style={{
                fontFamily: 'var(--pt-font-mono)',
                fontSize: 12,
                color: 'var(--pt-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.10em',
                marginTop: 16,
              }}
            >
              Chargement…
            </p>
          ) : isEmpty ? (
            <div className="empty">
              <Building2 size={48} strokeWidth={1.25} color="var(--pt-subtle)" aria-hidden />
              <div style={{ fontFamily: 'var(--pt-font-display)', fontWeight: 900, fontSize: 22, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                Aucun fournisseur
              </div>
              <div style={{ fontSize: 13, color: 'var(--pt-muted)' }}>
                Ajoute ton premier fournisseur pour commander en un clic.
              </div>
              <button
                type="button"
                className="btn--primary"
                onClick={() => setAddOpen(true)}
                style={{ marginTop: 8, padding: '12px 20px', minHeight: 44 }}
              >
                <Plus size={14} aria-hidden /> Nouveau fournisseur
              </button>
            </div>
          ) : (
            <Section
              label={`${filtered.length} fournisseur${filtered.length > 1 ? 's' : ''}`}
            >
              {filtered.length === 0 ? (
                <div className="empty">
                  <Building2 size={40} strokeWidth={1.25} color="var(--pt-subtle)" aria-hidden />
                  <div style={{ fontFamily: 'var(--pt-font-display)', fontWeight: 900, fontSize: 18, textTransform: 'uppercase' }}>
                    Aucun résultat
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--pt-muted)' }}>
                    Aucun fournisseur ne correspond à ce filtre. Essaie « Tous ».
                  </div>
                </div>
              ) : (
                filtered.map((row) => {
                  const typePill = pillForType(row.type);
                  const subParts: string[] = [];
                  subParts.push(typePill.label);
                  if (row.whatsapp_number) subParts.push(row.whatsapp_number);
                  if (row.email) subParts.push(row.email);
                  return (
                    <div
                      key={row.id}
                      className="card-link"
                      style={{ alignItems: 'center', gap: 12, padding: '14px 16px' }}
                    >
                      <div className="card-link__icon" aria-hidden>
                        <Building2 size={18} />
                      </div>
                      <div className="card-link__main">
                        <div className="card-link__title">{row.nom}</div>
                        <div className="card-link__sub">{subParts.join(' · ')}</div>
                      </div>
                      <Pill variant={typePill.variant}>{typePill.label}</Pill>
                      {row.is_default && (
                        <Pill variant="accent">Défaut</Pill>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        aria-label={`Supprimer ${row.nom}`}
                        style={{
                          width: 36,
                          height: 36,
                          minHeight: 36,
                          borderRadius: 10,
                          border: '1px solid var(--pt-line)',
                          background: 'transparent',
                          color: 'var(--pt-danger)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                      <span className="card-link__chev" aria-hidden>
                        <ChevronRight />
                      </span>
                    </div>
                  );
                })
              )}
            </Section>
          )}

          {!isEmpty && (
            <button
              type="button"
              className="card-link"
              style={{ borderStyle: 'dashed', marginTop: 4 }}
              onClick={() => setAddOpen(true)}
              aria-label="Ajouter un fournisseur"
            >
              <div className="card-link__icon" aria-hidden>
                <Plus size={18} />
              </div>
              <div className="card-link__main">
                <div className="card-link__title">Nouveau fournisseur</div>
                <div className="card-link__sub">Ajouter un contact · catégorie au choix</div>
              </div>
              <span className="card-link__chev"><ChevronRight aria-hidden /></span>
            </button>
          )}
        </div>

        <button
          type="button"
          className="fab"
          onClick={() => setAddOpen(true)}
          aria-label="Nouveau fournisseur"
        >
          <Plus size={22} aria-hidden />
        </button>

        <QuickAddFournisseurForm
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
          onSuccess={() => {
            setToast('Fournisseur ajouté');
            void refresh();
          }}
        />

        <IonToast
          isOpen={toast !== ''}
          message={toast}
          duration={1800}
          onDidDismiss={() => setToast('')}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
};

export default FournisseursView;
