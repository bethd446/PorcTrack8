import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Eyebrow from '../components/design/Eyebrow';
import Button from '../components/design/Button';
import PublicShell from '../components/design/PublicShell';

const FONT_DISPLAY = 'var(--font-heading)';
const FONT_BODY = 'var(--font-body)';
const FONT_MONO = 'var(--font-mono)';

export default function Privacy() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
        <Eyebrow dotColor="accent">Document légal · version 1.0</Eyebrow>
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
          Politique de confidentialité
        </h1>
        <p
          style={{
            fontFamily: FONT_MONO,
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
            La présente politique décrit la manière dont PorcTrack (ci-après « PorcTrack », « nous »)
            collecte, utilise et protège les données personnelles des utilisateurs de l'application
            mobile et web PorcTrack (ci-après le « Service »). Elle est rédigée en conformité avec
            le Règlement (UE) 2016/679 dit RGPD, la loi française Informatique et Libertés modifiée
            et la loi ivoirienne n° 2013-450 relative à la protection des données à caractère
            personnel.
          </p>
          <p>
            En créant un compte ou en utilisant le Service, vous reconnaissez avoir pris connaissance
            de la présente politique et l'accepter. La version en vigueur est toujours accessible
            depuis le pied de page de l'application.
          </p>
        </Section>

        <Section title="2. Identité du responsable de traitement">
          <p>
            Le responsable de traitement est PorcTrack, éditeur du Service. Pour toute question
            relative à vos données, contactez{' '}
            <a href="mailto:contact@porctrack.tech" style={{ color: 'var(--color-accent-600)' }}>
              contact@porctrack.tech
            </a>
            . Aucun délégué à la protection des données (DPO) n'est désigné à ce stade ; la fonction
            est assurée directement par l'équipe fondatrice.
          </p>
        </Section>

        <Section title="3. Données collectées">
          <p>Nous collectons trois catégories de données.</p>
          <p>
            <strong>Données de compte.</strong> Adresse email, mot de passe stocké sous forme hachée
            (bcrypt avec sel unique, jamais en clair), et facultativement nom complet et nom de la
            ferme. Ces données sont indispensables à la création et à l'authentification du compte.
          </p>
          <p>
            <strong>Données métier de la ferme.</strong> Inventaire des truies et verrats, événements
            de saillie, mises-bas, sevrages, soins vétérinaires, mouvements de stocks (aliments,
            médicaments) et écritures financières. Ces données vous appartiennent : nous en assurons
            uniquement l'hébergement et le traitement pour le compte de votre exploitation.
          </p>
          <p>
            <strong>Données techniques.</strong> Logs d'authentification (horodatage, succès ou
            échec), identifiants de session JWT, et adresse IP partiellement anonymisée (deux derniers
            octets masqués) à des fins d'audit de sécurité. Aucun cookie publicitaire ni traceur
            tiers n'est utilisé.
          </p>
        </Section>

        <Section title="4. Finalités du traitement">
          <p>Vos données sont traitées exclusivement pour :</p>
          <ul>
            <li>fournir le suivi technique du troupeau (GTTT) ;</li>
            <li>déclencher les alertes biologiques (mises-bas, retours en chaleur, sevrages) ;</li>
            <li>calculer les statistiques de performance de votre élevage ;</li>
            <li>assurer la sécurité du Service et prévenir la fraude ;</li>
            <li>vous adresser les notifications opérationnelles indispensables au Service.</li>
          </ul>
          <p>
            Aucune donnée n'est utilisée à des fins de profilage commercial, de revente ou de
            publicité.
          </p>
        </Section>

        <Section title="5. Base légale">
          <p>
            Le traitement repose sur l'exécution du contrat qui vous lie à PorcTrack (article 6.1.b
            du RGPD) pour les données strictement nécessaires au fonctionnement du Service, et sur
            votre consentement explicite (article 6.1.a) recueilli à l'inscription pour toute
            donnée facultative (nom complet, photo de profil).
          </p>
        </Section>

        <Section title="6. Hébergement et transferts">
          <p>
            Les données métier sont hébergées chez Supabase (région eu-west-3 Paris, France). Le
            frontend est servi depuis Hostinger France. L'ensemble de la chaîne reste sur le
            territoire de l'Union européenne.
          </p>
          <p>
            Aucun transfert hors UE n'est effectué. Si une telle situation devait se produire à
            l'avenir, elle serait encadrée par les Clauses Contractuelles Types de la Commission
            européenne et notifiée 30 jours à l'avance.
          </p>
        </Section>

        <Section title="7. Durée de conservation">
          <ul>
            <li>
              <strong>Compte actif</strong> : pendant toute la durée de la relation contractuelle.
            </li>
            <li>
              <strong>Compte inactif depuis plus de 24 mois</strong> : suppression automatique
              après notification 30 jours avant.
            </li>
            <li>
              <strong>Sauvegardes chiffrées</strong> : 90 jours glissants, purgées en rotation.
            </li>
            <li>
              <strong>Logs d'authentification</strong> : 12 mois pour les besoins d'audit de sécurité.
            </li>
          </ul>
        </Section>

        <Section title="8. Vos droits">
          <p>Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :</p>
          <ul>
            <li>droit d'accès à vos données ;</li>
            <li>droit de rectification en cas d'inexactitude ;</li>
            <li>droit à l'effacement (« droit à l'oubli ») ;</li>
            <li>droit à la portabilité dans un format structuré (export CSV ou JSON) ;</li>
            <li>droit d'opposition au traitement ;</li>
            <li>droit à la limitation du traitement.</li>
          </ul>
          <p>
            Ces droits s'exercent depuis votre compte (paramètres) ou par email à{' '}
            <a href="mailto:contact@porctrack.tech" style={{ color: 'var(--color-accent-600)' }}>
              contact@porctrack.tech
            </a>
            . Nous nous engageons à répondre dans un délai de 30 jours à compter de la réception
            de votre demande.
          </p>
        </Section>

        <Section title="9. Sécurité">
          <p>Nous mettons en œuvre les mesures techniques et organisationnelles suivantes :</p>
          <ul>
            <li>chiffrement TLS 1.3 obligatoire pour tout transit de données ;</li>
            <li>
              isolation par tenant via Row Level Security (RLS) PostgreSQL : vos données sont
              cloisonnées au niveau de la base et inaccessibles depuis tout autre compte ;
            </li>
            <li>hachage des mots de passe avec bcrypt (coût 12) ou argon2id ;</li>
            <li>journalisation des accès administratifs et revue trimestrielle ;</li>
            <li>sauvegardes chiffrées au repos.</li>
          </ul>
        </Section>

        <Section title="10. Cookies et traceurs">
          <p>
            PorcTrack n'utilise qu'un seul type de cookie : le cookie de session JWT émis par
            Supabase Auth, strictement nécessaire à votre authentification. Aucun cookie publicitaire,
            aucun traceur analytique tiers, aucun pixel de mesure d'audience n'est déposé.
          </p>
        </Section>

        <Section title="11. Modifications de la politique">
          <p>
            Toute modification substantielle de la présente politique fait l'objet d'une notification
            par email et dans l'application au minimum 30 jours avant son entrée en vigueur. La
            poursuite de l'utilisation du Service après cette date vaut acceptation des modifications.
          </p>
        </Section>

        <Section title="12. Contact et réclamations">
          <p>
            Pour toute question, demande ou réclamation, écrivez-nous à{' '}
            <a href="mailto:contact@porctrack.tech" style={{ color: 'var(--color-accent-600)' }}>
              contact@porctrack.tech
            </a>
            .
          </p>
          <p>
            Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une
            réclamation auprès de l'autorité de contrôle compétente :
          </p>
          <ul>
            <li>
              en France :{' '}
              <a
                href="https://www.cnil.fr"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--color-accent-600)' }}
              >
                Commission nationale de l'informatique et des libertés (CNIL)
              </a>{' '}
              ;
            </li>
            <li>
              en Côte d'Ivoire :{' '}
              <a
                href="https://www.artci.ci"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--color-accent-600)' }}
              >
                Autorité de Régulation des Télécommunications / TIC (ARTCI)
              </a>{' '}
              .
            </li>
          </ul>
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
