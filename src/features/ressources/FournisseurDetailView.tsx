/**
 * FournisseurDetailView — /ressources/fournisseurs/:id
 * ══════════════════════════════════════════════════════════════════════════
 * V78 vague 1 — Fiche détail fournisseur (mockup
 * docs/mockups/ressources-reproduction-mockup-v76.html#ressources-fournisseurs).
 *
 * Header `.ph--primary` avec avatar 88px (Building2) + nom + chip catégorie
 * + stars. Sections : Contact (tel / WhatsApp / email / adresse cliquables
 * via `.contact-row`), Historique commandes, Notes. CTA primaire "Passer
 * une commande" → ouvre WhatsApp direct.
 */

import React, { useMemo } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Building2, ChevronLeft, Mail, MapPin, MessageCircle, Phone,
  Send, ShoppingCart, Star,
} from 'lucide-react';

import {
  findFournisseurById,
  getCategorieLabel,
  totalCommandesFcfa,
  type FournisseurCategorie,
} from './fournisseursData';

interface PillStyle {
  bg: string;
  fg: string;
}

function pillStyle(c: FournisseurCategorie): PillStyle {
  switch (c) {
    case 'ALIMENT':
      return { bg: 'var(--pt-cat-aliment-bg)', fg: 'var(--pt-cat-aliment-fg)' };
    case 'PHARMACIE':
      return { bg: 'var(--pt-cat-veto-bg)', fg: 'var(--pt-cat-veto-fg)' };
    case 'GENETIQUE':
      return { bg: 'var(--pt-cat-genetique-bg)', fg: 'var(--pt-cat-genetique-fg)' };
    case 'EQUIPEMENT':
    case 'AUTRE':
    default:
      return { bg: 'var(--pt-warm)', fg: 'var(--pt-ink)' };
  }
}

function formatFcfa(n: number): string {
  return `${n.toLocaleString('fr-FR')} FCFA`;
}

function formatDateLong(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

const FournisseurDetailView: React.FC = () => {
  const navigate = useNavigate();
  const { id = '' } = useParams<{ id: string }>();
  const f = useMemo(() => findFournisseurById(id), [id]);

  if (!f) {
    return (
      <IonPage>
        <IonContent fullscreen className="ion-no-padding">
          <div className="pt-screen">
            <header className="ph--primary">
              <button
                type="button"
                className="back"
                aria-label="Retour aux fournisseurs"
                onClick={() => navigate('/ressources/fournisseurs')}
              >
                <ChevronLeft size={18} strokeWidth={2} aria-hidden />
              </button>
              <div className="eyebrow">Fournisseur</div>
              <h1>Introuvable</h1>
              <div className="sub">Ce fournisseur n'existe pas ou a été retiré.</div>
            </header>
            <div className="section">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => navigate('/ressources/fournisseurs')}
              >
                Retour à la liste
              </button>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const pill = pillStyle(f.categorie);
  const categorieLabel = getCategorieLabel(f.categorie);
  const totalFcfa = totalCommandesFcfa(f);

  const telHref = `tel:${f.telephone.replace(/\s/g, '')}`;
  const waHref = `https://wa.me/${f.whatsappPhone}`;
  const mailHref = f.email ? `mailto:${f.email}` : null;
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${f.nom} ${f.adresse} ${f.ville}`)}`;

  const orderMessage = encodeURIComponent(
    `Bonjour ${f.nom}, je suis éleveur (ferme K13) et je souhaite passer une commande. Merci de me confirmer disponibilité et délais.`,
  );
  const orderHref = `https://wa.me/${f.whatsappPhone}?text=${orderMessage}`;

  return (
    <IonPage>
      <IonContent fullscreen className="ion-no-padding">
        <div className="pt-screen">
          <header className="ph--primary">
            <button
              type="button"
              className="back"
              aria-label="Retour aux fournisseurs"
              onClick={() => navigate('/ressources/fournisseurs')}
            >
              <ChevronLeft size={18} strokeWidth={2} aria-hidden />
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginTop: 8,
                marginBottom: 12,
              }}
            >
              <div
                aria-hidden
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 22,
                  background: 'rgba(255,255,255,0.14)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1px solid rgba(255,255,255,0.18)',
                }}
              >
                <Building2 size={36} strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="eyebrow">{categorieLabel}</div>
                <h1 style={{ marginBottom: 6 }}>{f.nom}</h1>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '2px 10px',
                      borderRadius: 999,
                      background: pill.bg,
                      color: pill.fg,
                      fontFamily: 'var(--ff-mono, JetBrains Mono, monospace)',
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}
                  >
                    {categorieLabel}
                  </span>
                  <span
                    className="stars"
                    aria-label={`Note ${f.note} sur 5`}
                    style={{ color: 'var(--pt-accent)' }}
                  >
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        size={14}
                        strokeWidth={2}
                        fill={i <= f.note ? 'currentColor' : 'transparent'}
                        className={i <= f.note ? '' : 'stars__empty'}
                        aria-hidden
                      />
                    ))}
                  </span>
                </div>
              </div>
            </div>
            <div className="sub">{f.ville} · dernier contact {formatDateLong(f.dernierContact)}</div>
          </header>

          <section className="section" aria-label="Contact">
            <div className="section__label">Contact</div>

            <a className="contact-row" href={telHref} aria-label={`Appeler ${f.telephone}`}>
              <div className="contact-row__icon">
                <Phone size={16} strokeWidth={2} aria-hidden />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--ff-mono, JetBrains Mono, monospace)',
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--pt-muted)',
                    marginBottom: 2,
                  }}
                >
                  Téléphone
                </div>
                <div className="contact-row__value">{f.telephone}</div>
              </div>
            </a>

            <a
              className="contact-row"
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discuter sur WhatsApp"
              style={{
                background: 'var(--pt-success-bg-soft)',
                borderColor: 'var(--pt-brand-whatsapp)',
              }}
            >
              <div
                className="contact-row__icon"
                style={{ background: 'var(--pt-brand-whatsapp)', color: 'white' }}
              >
                <MessageCircle size={16} strokeWidth={2} aria-hidden />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--ff-mono, JetBrains Mono, monospace)',
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--pt-success-ink-deep)',
                    marginBottom: 2,
                  }}
                >
                  WhatsApp
                </div>
                <div className="contact-row__value">Discuter sur WhatsApp</div>
              </div>
            </a>

            {mailHref && (
              <a className="contact-row" href={mailHref} aria-label={`Envoyer un email à ${f.email}`}>
                <div className="contact-row__icon">
                  <Mail size={16} strokeWidth={2} aria-hidden />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--ff-mono, JetBrains Mono, monospace)',
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'var(--pt-muted)',
                      marginBottom: 2,
                    }}
                  >
                    Email
                  </div>
                  <div className="contact-row__value">{f.email}</div>
                </div>
              </a>
            )}

            <a
              className="contact-row"
              href={mapHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Voir ${f.adresse} sur la carte`}
            >
              <div className="contact-row__icon">
                <MapPin size={16} strokeWidth={2} aria-hidden />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--ff-mono, JetBrains Mono, monospace)',
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--pt-muted)',
                    marginBottom: 2,
                  }}
                >
                  Adresse
                </div>
                <div
                  className="contact-row__value"
                  style={{ fontFamily: 'var(--ff-body, Instrument Sans, sans-serif)' }}
                >
                  {f.adresse} · {f.ville}
                </div>
              </div>
            </a>
          </section>

          <section className="section" aria-label="Historique des commandes">
            <div className="section__label">
              Historique commandes · {f.commandes.length} · {formatFcfa(totalFcfa)}
            </div>

            {f.commandes.length === 0 ? (
              <div
                style={{
                  padding: '18px 16px',
                  border: '1px dashed var(--pt-line)',
                  borderRadius: 14,
                  textAlign: 'center',
                  color: 'var(--pt-muted)',
                  fontFamily: 'var(--ff-body, Instrument Sans, sans-serif)',
                  fontSize: 13,
                }}
              >
                Aucune commande enregistrée pour le moment.
              </div>
            ) : (
              f.commandes.map((cmd, idx) => (
                <div
                  key={`${cmd.date}-${idx}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 14px',
                    background: 'white',
                    border: '1px solid var(--pt-line)',
                    borderRadius: 12,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: 'var(--ff-body, Instrument Sans, sans-serif)',
                        fontSize: 14,
                        color: 'var(--pt-ink)',
                        marginBottom: 4,
                        lineHeight: 1.35,
                      }}
                    >
                      {cmd.libelle}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--ff-mono, JetBrains Mono, monospace)',
                        fontSize: 11,
                        color: 'var(--pt-muted)',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {formatDateLong(cmd.date)}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--ff-mono, JetBrains Mono, monospace)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--pt-ink)',
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatFcfa(cmd.montantFcfa)}
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="section" aria-label="Notes">
            <div className="section__label">Notes internes</div>
            <div
              style={{
                padding: '14px 16px',
                background: 'var(--pt-warm)',
                border: '1px solid var(--pt-warm-deep)',
                borderRadius: 14,
                fontFamily: 'var(--ff-body, Instrument Sans, sans-serif)',
                fontSize: 14,
                lineHeight: 1.55,
                color: 'var(--pt-ink)',
              }}
            >
              {f.notes || 'Aucune note enregistrée.'}
            </div>
          </section>

          <div className="actions" style={{ marginTop: 8 }}>
            <a
              className="btn btn--primary"
              href={orderHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Passer une commande sur WhatsApp"
              style={{ textDecoration: 'none' }}
            >
              <ShoppingCart size={18} strokeWidth={2} aria-hidden />
              Passer une commande
            </a>
            <a
              className="btn btn--secondary"
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Envoyer un message WhatsApp"
              style={{ textDecoration: 'none' }}
            >
              <Send size={16} strokeWidth={2} aria-hidden />
              Message rapide WhatsApp
            </a>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default FournisseurDetailView;
