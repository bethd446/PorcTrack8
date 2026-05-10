import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IonPage, IonContent } from '@ionic/react';
import {
  Apple,
  ShieldCheck,
  ClipboardCheck,
  CircleDot,
  Stethoscope,
  Baby,
  Milestone,
  Activity,
  Scale,
  Truck,
  Target,
  Info,
} from 'lucide-react';
import { Chip } from '../../components/agritech';
import { Button, Section, Tabs } from '@/design-system';
import { PageHeader } from '../../v70/components/ds/PageHeader';

type TabKey = 'cycle' | 'terrain' | 'biosecurite' | 'rations' | 'checklists';

interface ProductionStage {
  id: number;
  title: string;
  age: string;
  description: string;
  objective: string;
  aliment?: string;
  monitor: string;
  action?: string;
  destination?: string;
  tone: 'gold' | 'teal' | 'amber' | 'accent' | 'blue';
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface ProtocolItem {
  id: number;
  title: string;
  content: string;
  priority: string;
}

interface FieldProtocol {
  id: number;
  title: string;
  subtitle: string;
  bullets: string[];
}

interface ChecklistItem {
  id: number;
  title: string;
  tasks: string[];
}

const ProtocolsView: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('cycle');

  const protocols = useMemo<{
    cycle: ProductionStage[];
    terrain: FieldProtocol[];
    biosecurite: ProtocolItem[];
    rations: ProtocolItem[];
    checklists: ChecklistItem[];
  }>(
    () => ({
      cycle: [
        {
          id: 1,
          title: '1. NAISSANCE / MATERNITÉ',
          age: '0 à 21-28 jours',
          description: 'Porcelets sous la mère.',
          objective:
            'Bonne tétée, colostrum, chaleur, hygiène, protection contre l’écrasement.',
          monitor:
            'Mortalité, diarrhée, mamelles de la truie, poids des porcelets.',
          tone: 'gold',
          icon: Baby,
        },
        {
          id: 2,
          title: '2. POST-SEVRAGE',
          age: '21-28 à 63 jours',
          description: 'Porcelets séparés de la mère.',
          objective:
            'Éviter le stress du sevrage, relancer l’appétit, assurer une croissance régulière.',
          aliment: 'Démarrage 1 puis démarrage 2.',
          monitor: 'Diarrhée, toux, amaigrissement, densité, eau propre.',
          tone: 'teal',
          icon: Milestone,
        },
        {
          id: 3,
          title: '3. CROISSANCE',
          age: '63 à 100 jours',
          description: 'Porcs en développement musculaire.',
          objective: 'Prise de poids rapide et homogène.',
          aliment: 'Aliment croissance.',
          action:
            'Séparer les mâles et femelles, contrôler le poids, vermifuger si besoin.',
          tone: 'amber',
          icon: Activity,
        },
        {
          id: 4,
          title: '4. ENGRAISSEMENT',
          age: '100 jours jusqu’à 100 kg',
          description: 'Porcs en phase de dépôt de viande et de gras.',
          objective: 'Atteindre rapidement le poids commercial.',
          aliment: 'Aliment engraissement.',
          monitor: 'Consommation, boiteries, toux, croissance irrégulière.',
          tone: 'accent',
          icon: Scale,
        },
        {
          id: 5,
          title: '5. FINITION / PRÉ-BOUCHERIE',
          age: 'Poids : 100 à 120 kg',
          description: 'Dernier stade avant départ à la boucherie.',
          objective:
            'Finir les porcs proprement, sans stress, avec un bon rendement carcasse.',
          aliment: 'Finition.',
          monitor: 'État corporel, propreté, santé générale, poids final.',
          destination: 'Boucherie dès que le porc atteint le poids visé.',
          tone: 'blue',
          icon: Truck,
        },
      ],
      terrain: [
        {
          id: 1,
          title: 'Protocole de sevrage (J21)',
          subtitle: 'Sortie maternité',
          bullets: [
            'Retirer porcelets de la loge à J21 (minimum 5.5 kg)',
            'Peser et identifier chaque porcelet (boucle auriculaire)',
            'Déplacer en post-sevrage, lot homogène ±500g',
            'Truie : flush 3 jours (Son blé ad lib), surveiller chaleurs J+3 à J+7',
          ],
        },
        {
          id: 2,
          title: 'Soins nouveaux-nés (J0–J3)',
          subtitle: 'Premières 72h',
          bullets: [
            'Désinfection cordon, sécher avec paille propre',
            'Colostrothérapie dans les 2h (150ml minimum)',
            'Fer injectable J3 (200mg/porcelet)',
            'Équilibrer les portées (max 12 par truie allaitante)',
          ],
        },
        {
          id: 3,
          title: 'Détection chaleurs verrat',
          subtitle: 'Repérage & saillies',
          bullets: [
            'Contact fence-line matin et soir (7h et 17h)',
            "Test d’immobilité en présence verrat",
            'Saillies : J0 + J1 (double saillie si <5 verrats/semaine)',
          ],
        },
        {
          id: 4,
          title: 'Mise bas — surveillance',
          subtitle: 'Maternité',
          bullets: [
            'Préparer loge maternité 7 jours avant MB prévue',
            'Température couchage porcelets : 34°C (J1–J3)',
            'Surveillance continue les 4 premières heures',
            'Oxytocine si intervalle >30min entre porcelets',
          ],
        },
      ],
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
            "Vérification hebdomadaire des postes d’appâtage. Nettoyage des abords.",
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
    { key: 'cycle', label: 'Cycle', count: protocols.cycle.length },
    { key: 'terrain', label: 'Terrain', count: protocols.terrain.length },
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
        <div className="phone-content px-4 pt-5 pb-32 flex flex-col gap-5" style={{ maxWidth: 1100, margin: '0 auto', minHeight: '100%' }}>
          <PageHeader
            eyebrow="RÉGLAGES · PROTOCOLES"
            title="Protocoles"
            subtitle="Procédures et SOP"
            onBack={() => navigate(-1)}
          />

          <Tabs
              ariaLabel="Catégories de protocoles"
              value={tab}
              onChange={(v) => setTab(v as TabKey)}
              items={tabs.map(t => ({ id: t.key, label: t.label, count: t.count }))}
            />

          <div className="pt-2">
            {tab === 'cycle' && (
              <div className="space-y-6">
                <Section label="ÉTAPES DE PRODUCTION" />

                <div className="card-dense bg-bg-2 border-accent/20 p-4 mb-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
                    <Target size={20} />
                  </div>
                  <div>
                    <h4 className="ft-heading text-[14px] uppercase text-text-0 leading-tight">Système Naisseur-Engraisseur</h4>
                    <p className="text-[10px] text-text-2 uppercase tracking-wider mt-0.5">De la naissance à l’abattage</p>
                  </div>
                </div>

                <div className="relative pl-4 ml-4 border-l-2 border-dashed border-border space-y-6">
                  {protocols.cycle.map((s, _idx) => (
                    <div key={s.id} className="relative">
                      {/* Dot connector */}
                      <div className={`absolute -left-[25px] top-4 h-4 w-4 rounded-full border-2 border-bg-app ring-2 ring-offset-2 ring-transparent flex items-center justify-center`}
                           style={{ background: 'var(--bg-surface)', color: `var(--color-${s.tone})`, borderColor: `var(--color-${s.tone})` }}>
                        <div className="h-1.5 w-1.5 rounded-full bg-current" />
                      </div>

                      <div className="card-dense !p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl bg-bg-2 flex items-center justify-center`}
                                 style={{ color: `var(--color-${s.tone})` }}>
                              <s.icon size={22} />
                            </div>
                            <div>
                              <h3 className="ft-heading text-[15px] text-text-0 leading-none">{s.title}</h3>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Info size={10} className="text-text-2" />
                                <span className="text-[10px] uppercase text-text-2 tracking-wide font-bold">{s.age}</span>
                              </div>
                            </div>
                          </div>
                          <Chip label={`Phase ${s.id}`} tone={s.tone} size="xs" />
                        </div>

                        <div className="space-y-3">
                          <p className="text-[13px] text-text-1 italic border-l-2 border-border pl-3 py-0.5 bg-bg-0/50 rounded-r-md">
                            {s.description}
                          </p>

                          <div className="grid grid-cols-1 gap-3">
                            <div className="space-y-1">
                              <p className="text-[9px] uppercase text-text-2 font-bold flex items-center gap-1.5">
                                <Target size={10} /> Objectif
                              </p>
                              <p className="text-[12px] text-text-0 leading-snug">{s.objective}</p>
                            </div>

                            {s.aliment && (
                              <div className="space-y-1">
                                <p className="text-[9px] uppercase text-text-2 font-bold flex items-center gap-1.5">
                                  <Apple size={10} /> Aliment
                                </p>
                                <p className="text-[12px] font-semibold text-accent leading-snug bg-accent/5 px-2 py-1 rounded inline-block">{s.aliment}</p>
                              </div>
                            )}

                            {s.action && (
                              <div className="space-y-1">
                                <p className="text-[9px] uppercase text-text-2 font-bold flex items-center gap-1.5 text-amber">
                                  <ClipboardCheck size={10} /> Action Importante
                                </p>
                                <p className="text-[12px] text-text-0 leading-snug">{s.action}</p>
                              </div>
                            )}

                            <div className="space-y-1">
                              <p className="text-[9px] uppercase text-text-2 font-bold flex items-center gap-1.5">
                                <Stethoscope size={10} /> Surveiller
                              </p>
                              <p className="text-[12px] text-text-1 leading-snug">{s.monitor}</p>
                            </div>

                            {s.destination && (
                              <div className="space-y-1 pt-1 mt-1 border-t border-border">
                                <p className="text-[9px] uppercase text-blue font-bold flex items-center gap-1.5">
                                  <Truck size={10} /> Destination
                                </p>
                                <p className="text-[12px] font-bold text-blue leading-snug uppercase tracking-tight">{s.destination}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="card-dense bg-accent border-none p-5 text-white flex flex-col items-center text-center gap-3">
                  <div className="h-14 w-14 rounded-full flex items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.2)' }}>
                    <Target size={30} className="text-white" />
                  </div>
                  <div>
                    <h3 className="ft-heading text-[18px] uppercase">Objectif Final</h3>
                    <p className="text-[13px] opacity-90 leading-relaxed mt-1">
                      Produire des porcs sains, bien nourris, bien logés et bien suivis, pour obtenir :
                      <strong> plus de poids, moins de pertes, meilleure rentabilité.</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {tab === 'terrain' && (
              <>
                <Section label="FICHES TERRAIN" />
                <ul className="space-y-3" aria-label="Protocoles terrain essentiels">
                  {protocols.terrain.map(p => (
                    <li key={p.id}>
                      <div className="card-dense flex items-start gap-3">
                        <span
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-bg-2 text-accent"
                          aria-hidden="true"
                        >
                          <Stethoscope size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="agritech-heading text-[14px] uppercase leading-none">
                              {p.title}
                            </h3>
                            <Chip label={p.subtitle} tone="default" size="xs" />
                          </div>
                          <ul className="mt-3 space-y-1.5" aria-label={`Étapes ${p.title}`}>
                            {p.bullets.map((b, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2 text-[13px] text-text-1 leading-relaxed"
                              >
                                <CircleDot
                                  size={12}
                                  className="shrink-0 mt-1 text-accent"
                                  aria-hidden="true"
                                />
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {tab === 'biosecurite' && (
              <>
                <Section label="BIOSÉCURITÉ" />
                <ul className="space-y-3" aria-label="Protocoles de biosécurité">
                  {protocols.biosecurite.map(p => (
                    <li key={p.id}>
                      <div className="card-dense flex items-start gap-3">
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
                <Section label="RATIONS" />
                <ul className="space-y-3" aria-label="Protocoles de rationnement">
                  {protocols.rations.map(r => (
                    <li key={r.id}>
                      <div className="card-dense flex items-start gap-3">
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
                          <p className="mt-2 text-[12px] text-text-1 leading-relaxed bg-bg-0 border border-border rounded-md p-3">
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
                    <Section label={`${c.title.toUpperCase()} · ${c.tasks.length} TÂCHES`} />
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
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ProtocolsView;
