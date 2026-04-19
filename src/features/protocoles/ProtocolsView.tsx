import React, { useMemo, useState } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { Apple, ShieldCheck, ClipboardCheck, CircleDot } from 'lucide-react';
import AgritechLayout from '../../components/AgritechLayout';
import AgritechHeader from '../../components/AgritechHeader';
import { Chip, SectionDivider } from '../../components/agritech';

type TabKey = 'biosecurite' | 'rations' | 'checklists';

interface ProtocolItem {
  id: number;
  title: string;
  content: string;
  priority: string;
}

interface ChecklistItem {
  id: number;
  title: string;
  tasks: string[];
}

const ProtocolsView: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('biosecurite');

  const protocols = useMemo<{
    biosecurite: ProtocolItem[];
    rations: ProtocolItem[];
    checklists: ChecklistItem[];
  }>(
    () => ({
      biosecurite: [
        {
          id: 1,
          title: 'Accès zone élevage',
          content:
            'Changement de bottes obligatoire. Pédiluve avec solution désinfectante active.',
          priority: 'HAUTE',
        },
        {
          id: 2,
          title: 'Quarantaine',
          content:
            'Tout nouvel animal doit rester 3 semaines en zone tampon isolée.',
          priority: 'HAUTE',
        },
        {
          id: 3,
          title: 'Lutte contre les nuisibles',
          content:
            "Vérification hebdomadaire des postes d'appâtage. Nettoyage des abords.",
          priority: 'MOYENNE',
        },
      ],
      rations: [
        {
          id: 1,
          title: 'Truies gestantes',
          content: '2.5kg / jour (AMV 5%). Ajuster selon état corporel (NEC).',
          priority: 'REFERENCE',
        },
        {
          id: 2,
          title: 'Maternité (lactation)',
          content: 'Libre service après 3 jours post-MB. Viser 6-8kg/jour.',
          priority: 'REFERENCE',
        },
        {
          id: 3,
          title: 'Porcelets 1er âge',
          content:
            'Pre-starter en petites quantités 4x/jour pour stimuler la curiosité.',
          priority: 'REFERENCE',
        },
      ],
      checklists: [
        {
          id: 1,
          title: 'Contrôle quotidien',
          tasks: [
            'Température salles',
            'Fonctionnement abreuvoirs',
            'Observation état général',
          ],
        },
        {
          id: 2,
          title: 'Hebdomadaire',
          tasks: [
            'Inventaire pharmacie',
            'Nettoyage couloirs',
            'Entretien matériel',
          ],
        },
      ],
    }),
    []
  );

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'biosecurite', label: 'Biosécurité', count: protocols.biosecurite.length },
    { key: 'rations', label: 'Rations', count: protocols.rations.length },
    { key: 'checklists', label: 'Listes', count: protocols.checklists.length },
  ];

  const priorityTone = (p: string): 'red' | 'amber' | 'default' => {
    const up = p.toUpperCase();
    if (up === 'HAUTE') return 'red';
    if (up === 'MOYENNE') return 'amber';
    return 'default';
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <AgritechLayout withNav={true}>
          <AgritechHeader
            title="Guide métier"
            subtitle="Protocoles élevage"
            backTo="/"
          >
            <div
              className="flex gap-2 overflow-x-auto -mx-1 px-1"
              role="tablist"
              aria-label="Catégories"
            >
              {tabs.map(t => {
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(t.key)}
                    className={
                      'pressable shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-md border text-[11px] font-semibold uppercase tracking-wide transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ' +
                      (active
                        ? 'bg-accent text-bg-0 border-accent'
                        : 'bg-bg-1 text-text-1 border-border hover:border-accent/60 hover:text-text-0')
                    }
                  >
                    <span>{t.label}</span>
                    <span
                      className={
                        'font-mono tabular-nums text-[10px] ' +
                        (active ? 'text-bg-0/80' : 'text-text-2')
                      }
                    >
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </AgritechHeader>

          <div className="px-4 pt-4 pb-8">
            {tab === 'biosecurite' && (
              <>
                <SectionDivider label="Biosécurité" />
                <ul className="space-y-3" aria-label="Protocoles de biosécurité">
                  {protocols.biosecurite.map(p => (
                    <li key={p.id}>
                      <div className="card-dense border-l-2 border-l-accent flex items-start gap-3">
                        <span
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-2 text-accent"
                          aria-hidden="true"
                        >
                          <ShieldCheck size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="agritech-heading text-[14px] uppercase leading-none">
                              {p.title}
                            </h3>
                            <Chip
                              label={p.priority}
                              tone={priorityTone(p.priority)}
                              size="xs"
                            />
                          </div>
                          <p className="mt-2 text-[13px] text-text-1 leading-relaxed">
                            {p.content}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {tab === 'rations' && (
              <>
                <SectionDivider label="Rations" />
                <ul className="space-y-3" aria-label="Protocoles de rationnement">
                  {protocols.rations.map(r => (
                    <li key={r.id}>
                      <div className="card-dense border-l-2 border-l-amber flex items-start gap-3">
                        <span
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-2 text-amber"
                          aria-hidden="true"
                        >
                          <Apple size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="agritech-heading text-[14px] uppercase leading-none">
                            {r.title}
                          </h3>
                          <p className="mt-2 font-mono text-[12px] text-text-1 leading-relaxed bg-bg-0 border border-border rounded-md p-3">
                            {r.content}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {tab === 'checklists' && (
              <div className="space-y-5">
                {protocols.checklists.map(c => (
                  <section key={c.id} aria-label={c.title}>
                    <SectionDivider
                      label={c.title}
                      action={
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-text-2">
                          <ClipboardCheck size={12} aria-hidden="true" />
                          {c.tasks.length} tâches
                        </span>
                      }
                    />
                    <ul className="card-dense !p-0 overflow-hidden" aria-label={`Tâches ${c.title}`}>
                      {c.tasks.map((task, idx) => (
                        <li
                          key={idx}
                          className={
                            'flex items-center gap-3 px-4 py-3 ' +
                            (idx < c.tasks.length - 1
                              ? 'border-b border-border'
                              : '')
                          }
                        >
                          <CircleDot
                            size={14}
                            className="shrink-0 text-text-2"
                            aria-hidden="true"
                          />
                          <span className="text-[13px] text-text-0">{task}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </div>
        </AgritechLayout>
      </IonContent>
    </IonPage>
  );
};

export default ProtocolsView;
