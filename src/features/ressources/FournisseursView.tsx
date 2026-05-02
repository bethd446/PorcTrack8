/**
 * FournisseursView — /fournisseurs
 * ════════════════════════════════════════════════════════════════════════
 *
 * Carnet fournisseurs (table `fournisseurs`). Liste + ajout via
 * QuickAddFournisseurForm. Click sur une row → confirm delete (édition à
 * faire ultérieurement, hors scope D1).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { IonContent, IonPage, IonToast, useIonAlert } from '@ionic/react';
import { Plus, Phone, Mail, Trash2 } from 'lucide-react';

import AgritechLayout from '../../components/AgritechLayout';
import QuickAddFournisseurForm from '../../components/forms/QuickAddFournisseurForm';
import {
  listFournisseurs,
  deleteFournisseur,
  type FournisseurRow,
} from '../../services/supabaseWrites';

const FournisseursView: React.FC = () => {
  const [rows, setRows] = useState<FournisseurRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState('');
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

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout withNav={true}>
          <div className="px-4 pt-5 pb-32 max-w-md mx-auto">
            <header className="mb-6">
              <h1
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 34,
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: 'var(--ink)',
                  margin: '0 0 4px',
                }}
              >
                Fournisseurs
              </h1>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: 'var(--muted)',
                  margin: 0,
                }}
              >
                Carnet pour commande WhatsApp pré-remplie.
              </p>
            </header>

            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="w-full mb-5 inline-flex items-center justify-center gap-2 h-12 rounded-md font-mono text-[12px] uppercase tracking-wide font-bold"
              style={{
                background: 'var(--color-accent-500)',
                color: 'var(--bg-surface)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <Plus size={14} aria-hidden="true" />
              Ajouter un fournisseur
            </button>

            {loading ? (
              <p className="text-[12px] text-text-2 font-mono uppercase">Chargement…</p>
            ) : rows.length === 0 ? (
              <div
                className="rounded-md p-6 text-center"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px dashed var(--line)',
                }}
              >
                <p
                  className="text-[13px] mb-1"
                  style={{ color: 'var(--ink)', fontFamily: 'var(--font-body)' }}
                >
                  Aucun fournisseur enregistré
                </p>
                <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                  Ajoute ton premier fournisseur pour commander en un clic.
                </p>
              </div>
            ) : (
              <ul
                className="rounded-md overflow-hidden"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--line)' }}
              >
                {rows.map((row, i) => (
                  <li
                    key={row.id}
                    className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
                    style={{
                      borderColor: 'var(--line)',
                      borderBottom: i === rows.length - 1 ? 'none' : undefined,
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-[14px] font-semibold truncate"
                        style={{ color: 'var(--ink)' }}
                      >
                        {row.nom}
                        {row.is_default ? (
                          <span
                            className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase"
                            style={{
                              background: 'var(--amber-pork-soft, #fde7d2)',
                              color: 'var(--amber-pork-deep, #c2662b)',
                            }}
                          >
                            Défaut
                          </span>
                        ) : null}
                      </div>
                      <div
                        className="text-[11px] font-mono uppercase mt-0.5"
                        style={{ color: 'var(--muted)' }}
                      >
                        {row.type ?? 'AUTRE'}
                        {row.whatsapp_number ? (
                          <span className="ml-2 inline-flex items-center gap-1">
                            <Phone size={10} aria-hidden="true" />
                            {row.whatsapp_number}
                          </span>
                        ) : null}
                        {row.email ? (
                          <span className="ml-2 inline-flex items-center gap-1">
                            <Mail size={10} aria-hidden="true" />
                            {row.email}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      aria-label={`Supprimer ${row.nom}`}
                      className="p-2 rounded-full hover:bg-bg-2"
                      style={{ color: 'var(--red, #dc2626)' }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
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
