/**
 * FournisseursView — /fournisseurs (V44 archétype 3 LISTE PURE)
 * ════════════════════════════════════════════════════════════════════════
 *
 * Carnet fournisseurs (table `fournisseurs`).
 * Liste + ajout via QuickAddFournisseurForm. Click row = supprimer (édition
 * future).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { IonContent, IonPage, IonToast, useIonAlert } from '@ionic/react';
import { Plus, Phone, Mail, Trash2, Truck } from 'lucide-react';

import AgritechLayout from '../../components/AgritechLayout';
import QuickAddFournisseurForm from '../../components/forms/QuickAddFournisseurForm';
import {
  Button,
  Card,
  IconBox,
  ListItem,
  Search,
  Section,
  Tabs,
  Tag,
} from '@/design-system';
import { PageHeader } from '../../v70/components/ds/PageHeader';
import PhaseBanner from '../cycles/PhaseBanner';
import {
  listFournisseurs,
  deleteFournisseur,
  type FournisseurRow,
} from '../../services/supabaseWrites';

type FilterKey = 'TOUS' | 'ALIMENT' | 'VETO' | 'AUTRE';

const TABS: ReadonlyArray<{ value: FilterKey; label: string }> = [
  { value: 'TOUS', label: 'Tous' },
  { value: 'ALIMENT', label: 'Aliments' },
  { value: 'VETO', label: 'Véto' },
  { value: 'AUTRE', label: 'Autres' },
];

function matchesFilter(row: FournisseurRow, filter: FilterKey): boolean {
  if (filter === 'TOUS') return true;
  const type = (row.type ?? 'AUTRE').toUpperCase();
  if (filter === 'AUTRE') return type !== 'ALIMENT' && type !== 'VETO';
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
  const [rows, setRows] = useState<FournisseurRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState<FilterKey>('TOUS');
  const [query, setQuery] = useState('');
  const [presentAlert] = useIonAlert();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listFournisseurs();
      setRows(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
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

  const filtered = useMemo(
    () => rows.filter(r => matchesFilter(r, filter) && matchesSearch(r, query)),
    [rows, filter, query],
  );

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout withNav={true}>
          <div className="px-4 pt-5 pb-32 max-w-md mx-auto flex flex-col gap-5">
            <PageHeader
              eyebrow="RESSOURCES · FOURNISSEURS"
              title="Fournisseurs"
              subtitle="Contacts et achats"
            />
            <PhaseBanner
              src="/images/ambiance-stock.webp"
              alt=""
              label="FOURNISSEURS"
            />

            {/* Filtres + Search */}
            <Card>
              <div className="flex flex-col gap-3">
                <Tabs
                  value={filter}
                  onChange={(v) => setFilter(v as FilterKey)}
                  options={[...TABS]}
                  ariaLabel="Filtrer fournisseurs par type"
                />
                <Search
                  value={query}
                  placeholder="Rechercher un fournisseur"
                  onChange={(e) => setQuery(e.target.value)}
                  onClear={() => setQuery('')}
                  aria-label="Rechercher un fournisseur"
                />
              </div>
            </Card>

            <Button
              variant="primary"
              fullWidth
              onClick={() => setAddOpen(true)}
              ariaLabel="Ajouter un fournisseur"
            >
              <Plus size={14} aria-hidden="true" />
              <span>Ajouter un fournisseur</span>
            </Button>

            {loading ? (
              <p className="text-[12px] text-text-2 uppercase">Chargement…</p>
            ) : filtered.length === 0 ? (
              <Card>
                <div className="text-center py-4">
                  <p className="text-[13px] text-text-0 mb-1">
                    {rows.length === 0
                      ? 'Aucun fournisseur enregistré'
                      : 'Aucun fournisseur ne correspond'}
                  </p>
                  <p className="text-[11px] text-text-2">
                    {rows.length === 0
                      ? 'Ajoute ton premier fournisseur pour commander en un clic.'
                      : 'Essaie un autre filtre ou réinitialise la recherche.'}
                  </p>
                </div>
              </Card>
            ) : (
              <>
                <Section
                  label={`${filtered.length} fournisseur${filtered.length > 1 ? 's' : ''}`}
                />
                <Card>
                  <ul className="flex flex-col">
                    {filtered.map((row) => {
                      const typeLabel = (row.type ?? 'AUTRE').toString();
                      const subtitleParts: string[] = [typeLabel];
                      if (row.whatsapp_number) subtitleParts.push(row.whatsapp_number);
                      if (row.email) subtitleParts.push(row.email);
                      return (
                        <li key={row.id}>
                          <ListItem
                            icon={
                              <IconBox variant="warm" size="small">
                                <Truck size={14} aria-hidden="true" />
                              </IconBox>
                            }
                            title={row.nom}
                            subtitle={subtitleParts.join(' · ')}
                            tag={
                              <div className="flex items-center gap-2">
                                {row.is_default ? (
                                  <Tag variant="accent">Défaut</Tag>
                                ) : null}
                                {row.whatsapp_number ? (
                                  <Phone size={12} className="text-text-2" aria-hidden="true" />
                                ) : null}
                                {row.email ? (
                                  <Mail size={12} className="text-text-2" aria-hidden="true" />
                                ) : null}
                                <Button
                                  variant="ghost"
                                  size="small"
                                  onClick={() => handleDelete(row)}
                                  ariaLabel={`Supprimer ${row.nom}`}
                                  style={{ color: 'var(--pt-danger)' }}
                                >
                                  <Trash2 size={14} aria-hidden="true" />
                                </Button>
                              </div>
                            }
                          />
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </>
            )}
          </div>
        </AgritechLayout>

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
