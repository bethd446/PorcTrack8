import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Eyebrow from '../components/design/Eyebrow';
import { Button } from '../design-system';
import PublicShell from '../components/design/PublicShell';

const FONT_DISPLAY = 'var(--font-heading)';
const FONT_BODY = 'var(--font-body)';

export default function CGU() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        <Eyebrow dotColor="terre">Document légal · version 1.0</Eyebrow>
        <h1
          style={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 'clamp(32px, 5vw, 48px)',
            lineHeight: 1,
            letterSpacing: '-0.025em',
            margin: '14px 0 8px',
            color: 'var(--ink)',
          }}
        >
          Conditions générales d'utilisation
        </h1>
        <p
          style={{
            fontSize: 11,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            margin: '0 0 32px',
          }}
        >
          Date d'effet · 30 avril 2026 · Dernière révision · 30 avril 2026
        </p>

        <Section title="1. Préambule">
          <p>
            Les présentes conditions générales d'utilisation (« CGU ») régissent l'accès et
            l'utilisation de l'application PorcTrack (le « Service »), éditée par PorcTrack
            (l'« Éditeur »). Elles forment un contrat entre l'Éditeur et toute personne physique
            ou morale utilisant le Service (l'« Utilisateur »).
          </p>
          <p>
            La création d'un compte vaut acceptation pleine et entière des présentes CGU. Si
            l'Utilisateur n'accepte pas ces conditions, il doit s'abstenir d'utiliser le Service.
          </p>
        </Section>

        <Section title="2. Définitions">
          <ul>
            <li>
              <strong>Utilisateur</strong> : toute personne ayant créé un compte sur le Service.
            </li>
            <li>
              <strong>Compte</strong> : espace personnel sécurisé permettant l'accès au Service.
            </li>
            <li>
              <strong>Service</strong> : l'application web et mobile PorcTrack et ses fonctionnalités
              connexes.
            </li>
            <li>
              <strong>Contenu</strong> : toute donnée saisie ou générée par l'Utilisateur dans le
              Service.
            </li>
            <li>
              <strong>Données ferme</strong> : ensemble du Contenu relatif à l'élevage (animaux,
              événements biologiques, stocks, finances).
            </li>
          </ul>
        </Section>

        <Section title="3. Inscription et accès">
          <p>
            L'inscription est ouverte à toute personne majeure (18 ans révolus) disposant de la
            capacité juridique pour contracter, ou à toute personne morale dûment représentée.
          </p>
          <p>
            L'authentification s'effectue par email et mot de passe ou par lien magique (« magic
            link ») envoyé par email. Le Service applique le principe d'un compte par ferme
            (architecture mono-tenant) : un compte ne peut héberger qu'une seule exploitation.
          </p>
        </Section>

        <Section title="4. Obligations de l'Utilisateur">
          <p>L'Utilisateur s'engage à :</p>
          <ul>
            <li>
              fournir des informations exactes, complètes et tenues à jour, notamment pour les
              données métier saisies dans le Service ;
            </li>
            <li>
              préserver la confidentialité de ses identifiants et signaler sans délai toute
              compromission ;
            </li>
            <li>
              utiliser le Service conformément à sa destination, sans tentative d'extraction
              automatisée (scraping), de contournement des limitations techniques ou d'abus
              manifeste ;
            </li>
            <li>respecter les droits des tiers et la législation en vigueur.</li>
          </ul>
        </Section>

        <Section title="5. Description du Service">
          <p>
            PorcTrack est un outil de gestion technique de troupeau (GTTT) destiné aux éleveurs
            porcins. Il fournit notamment :
          </p>
          <ul>
            <li>
              le suivi des saillies, mises-bas, sevrages et retours en chaleur, avec déclenchement
              d'alertes biologiques ;
            </li>
            <li>
              l'assistant Marius, modèle de langage contextuel actuellement en phase bêta ;
            </li>
            <li>
              une application web disponible immédiatement et une application Android dont la
              publication sur le Play Store est prévue ultérieurement.
            </li>
          </ul>
        </Section>

        <Section title="6. Disponibilité du Service">
          <p>
            L'Éditeur fournit le Service avec un engagement de moyens raisonnables. Aucun accord
            de niveau de service (SLA) contractuel n'est consenti à ce stade de produit minimum
            viable (MVP).
          </p>
          <p>
            Les opérations de maintenance planifiée font l'objet d'une notification au minimum 48
            heures avant leur exécution. Les interventions d'urgence (correctifs de sécurité)
            peuvent être réalisées sans préavis.
          </p>
        </Section>

        <Section title="7. Tarification">
          <p>
            Le Service est mis à disposition gratuitement aux premiers utilisateurs dans le cadre
            de la phase bêta-testeurs. Cette gratuité est consentie sans contrepartie autre que le
            retour d'expérience de l'Utilisateur.
          </p>
          <p>
            L'Éditeur se réserve le droit de faire évoluer le modèle économique vers un mode
            freemium ou payant. Toute évolution tarifaire fera l'objet d'une notification 30 jours
            avant son entrée en vigueur, permettant à l'Utilisateur de résilier son compte sans
            frais.
          </p>
        </Section>

        <Section title="8. Propriété intellectuelle">
          <p>
            <strong>Données ferme.</strong> L'Utilisateur conserve la pleine propriété des Données
            ferme qu'il saisit dans le Service. L'Éditeur n'acquiert aucun droit sur ces données
            au-delà de leur traitement strictement nécessaire à la fourniture du Service.
          </p>
          <p>
            <strong>Logiciel.</strong> L'Éditeur conserve l'intégralité des droits de propriété
            intellectuelle sur le Service, son code source, son architecture, ses interfaces et
            sa documentation.
          </p>
          <p>
            <strong>Licence d'usage.</strong> L'Éditeur concède à l'Utilisateur une licence
            personnelle, non exclusive, non cessible et révocable d'utilisation du Service pour
            la durée du contrat.
          </p>
        </Section>

        <Section title="9. Limitation de responsabilité">
          <p>
            PorcTrack est un outil d'aide à la décision. Il ne se substitue en aucun cas à
            l'expertise d'un vétérinaire ou d'un technicien d'élevage. Les alertes, recommandations
            et analyses (notamment celles produites par l'assistant Marius) sont fournies à titre
            indicatif.
          </p>
          <p>
            L'Éditeur ne peut être tenu responsable des décisions opérationnelles prises par
            l'Utilisateur sur la base des informations affichées dans le Service. L'Utilisateur
            reste seul responsable de la conduite de son élevage.
          </p>
          <p>
            En tout état de cause et dans la mesure permise par le droit applicable, la
            responsabilité totale de l'Éditeur, tous préjudices confondus, est plafonnée au montant
            équivalent à 12 mois d'abonnement effectivement payé par l'Utilisateur (ou à zéro en
            cas d'usage gratuit du Service).
          </p>
        </Section>

        <Section title="10. Résiliation">
          <p>
            <strong>À l'initiative de l'Utilisateur.</strong> L'Utilisateur peut résilier son compte
            à tout moment depuis les paramètres du Service. La résiliation prend effet immédiatement.
          </p>
          <p>
            <strong>À l'initiative de l'Éditeur.</strong> L'Éditeur peut résilier l'accès au
            Service moyennant un préavis de 30 jours notifié par email. En cas d'abus grave (fraude,
            violation des présentes CGU, atteinte à la sécurité du Service), la résiliation peut
            intervenir sans préavis.
          </p>
          <p>
            <strong>Export des données.</strong> Pendant 30 jours suivant la résiliation,
            l'Utilisateur conserve la possibilité d'exporter ses Données ferme dans un format
            structuré (CSV ou JSON). Passé ce délai, les données sont définitivement supprimées,
            sauf obligation légale de conservation.
          </p>
        </Section>

        <Section title="11. Loi applicable et juridiction">
          <p>
            Les présentes CGU sont régies par le droit français. Toute contestation relative à
            leur interprétation ou à leur exécution est soumise à la compétence exclusive des
            tribunaux du ressort de la Cour d'appel de Paris, sous réserve des dispositions
            impératives applicables aux consommateurs.
          </p>
          <p>
            Préalablement à toute action contentieuse, les parties s'engagent à rechercher une
            solution amiable. À défaut d'accord dans un délai de 30 jours, l'Utilisateur peut
            recourir gratuitement à un médiateur de la consommation conformément aux articles
            L. 611-1 et suivants du Code de la consommation.
          </p>
        </Section>

        <Section title="12. Modifications des CGU">
          <p>
            L'Éditeur se réserve le droit de modifier les présentes CGU. Toute modification
            substantielle est notifiée à l'Utilisateur par email et dans le Service au minimum
            30 jours avant son entrée en vigueur. La poursuite de l'utilisation du Service au-delà
            de cette date vaut acceptation des nouvelles CGU. À défaut, l'Utilisateur peut résilier
            son compte sans frais selon les modalités prévues à l'article 10.
          </p>
        </Section>

        <div className="mt-12">
          <Link to="/" aria-label="Retour à l'accueil">
            <Button variant="secondary" size="md">
              <ArrowLeft size={14} strokeWidth={2} />
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ margin: '36px 0' }}>
      <h2
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 22,
          lineHeight: 1.15,
          letterSpacing: '-0.015em',
          color: 'var(--ink)',
          margin: '0 0 14px',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontFamily: FONT_BODY,
          fontSize: 15,
          lineHeight: 1.65,
          color: 'var(--ink-soft)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          maxWidth: '70ch',
        }}
      >
        {children}
      </div>
    </section>
  );
}
