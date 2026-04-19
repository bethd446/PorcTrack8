#!/usr/bin/env python3
"""PDF analyse produit LysiMet — apports, usage, alternatives pour porc."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
)

OUTPUT = "docs/NUTRITION_LYSIMET_ANALYSE_PRODUIT.pdf"

ACCENT = colors.HexColor("#065F46")
ACCENT_LIGHT = colors.HexColor("#D1FAE5")
AMBER = colors.HexColor("#D97706")
AMBER_LIGHT = colors.HexColor("#FEF3C7")
RED = colors.HexColor("#DC2626")
RED_LIGHT = colors.HexColor("#FEE2E2")
BLUE = colors.HexColor("#2563EB")
BLUE_LIGHT = colors.HexColor("#DBEAFE")
GRAY_900 = colors.HexColor("#111827")
GRAY_700 = colors.HexColor("#374151")
GRAY_500 = colors.HexColor("#6B7280")
GRAY_200 = colors.HexColor("#E5E7EB")
GRAY_50 = colors.HexColor("#F9FAFB")

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "TitleC", parent=styles["Title"],
    fontName="Helvetica-Bold", fontSize=22, textColor=ACCENT,
    alignment=TA_LEFT, spaceAfter=6,
)
subtitle_style = ParagraphStyle(
    "Subtitle", parent=styles["Normal"],
    fontName="Helvetica", fontSize=11, textColor=GRAY_700,
    alignment=TA_LEFT, spaceAfter=18,
)
h1_style = ParagraphStyle(
    "H1", parent=styles["Heading1"],
    fontName="Helvetica-Bold", fontSize=16, textColor=ACCENT,
    spaceBefore=18, spaceAfter=10,
)
h2_style = ParagraphStyle(
    "H2", parent=styles["Heading2"],
    fontName="Helvetica-Bold", fontSize=12, textColor=GRAY_900,
    spaceBefore=10, spaceAfter=6,
)
body_style = ParagraphStyle(
    "Body", parent=styles["Normal"],
    fontName="Helvetica", fontSize=10, textColor=GRAY_900,
    leading=14, alignment=TA_JUSTIFY, spaceAfter=6,
)
small_style = ParagraphStyle(
    "Small", parent=body_style,
    fontSize=9, textColor=GRAY_700, leading=12,
)


def base_table_style(header_bg=ACCENT):
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("TEXTCOLOR", (0, 1), (-1, -1), GRAY_900),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GRAY_50]),
        ("GRID", (0, 0), (-1, -1), 0.25, GRAY_200),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
    ])


def box(title, content, tone="accent"):
    bg = {"accent": ACCENT_LIGHT, "amber": AMBER_LIGHT,
          "red": RED_LIGHT, "blue": BLUE_LIGHT}[tone]
    fg = {"accent": ACCENT, "amber": AMBER,
          "red": RED, "blue": BLUE}[tone]
    data = [[Paragraph(f'<b><font color="{fg.hexval()}">{title}</font></b>', body_style)],
            [Paragraph(content, small_style)]]
    t = Table(data, colWidths=[17 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LINEBEFORE", (0, 0), (0, -1), 3, fg),
    ]))
    return t


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GRAY_500)
    canvas.drawString(2 * cm, 1.2 * cm,
                      "PorcTrack 8 · Ferme K13 · Analyse produit LysiMet · Sources publiques")
    canvas.drawRightString(19 * cm, 1.2 * cm, f"Page {doc.page}")
    canvas.setStrokeColor(GRAY_200)
    canvas.line(2 * cm, 1.6 * cm, 19 * cm, 1.6 * cm)
    canvas.restoreState()


def build():
    doc = SimpleDocTemplate(
        OUTPUT, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
        title="Analyse produit LysiMet",
    )
    story = []

    # ── Titre ────────────────────────────────────────────────────────────
    story.append(Paragraph("Analyse produit &mdash; LysiMet", title_style))
    story.append(Paragraph(
        "Synthèse Élevage · Apports, modes d&#39;usage, dosages pour porcins",
        subtitle_style))

    # Avertissement essentiel
    story.append(box(
        "⚠ Information clé à communiquer au technicien",
        "<b>LysiMet est commercialisé par Synthèse Élevage comme produit pour VOLAILLES</b>, "
        "pas spécifiquement pour les porcins. "
        "La fiche produit publique indique : espèce cible = toutes volailles. "
        "Son utilisation chez le porc est un <b>détournement d&#39;usage hors AMM</b> "
        "(Autorisation de Mise sur le Marché) qui doit être validé par le vétérinaire de la ferme. "
        "Les dosages proposés dans ce document sont des <b>extrapolations basées sur les besoins "
        "nutritionnels du porc</b>, à valider avant usage.",
        tone="red",
    ))
    story.append(Spacer(1, 10))

    # ── 1. Fiche produit ────────────────────────────────────────────────
    story.append(Paragraph("1. Fiche produit (d&#39;après le site Synthèse Élevage)", h1_style))

    data = [
        ["Propriété", "Valeur"],
        ["Nom commercial", "LysiMet"],
        ["Fabricant / distributeur", "Synthèse Élevage"],
        ["Catégorie", "Aliment complémentaire &mdash; Apport en acides aminés"],
        ["Forme galénique", "Poudre soluble"],
        ["Conditionnement", "Sacs de 5 kg"],
        ["Espèce cible officielle", "Toutes volailles"],
        ["Prix public (France)", "56,86 € HT TVA 5,5% / sac de 5 kg"],
        ["Dosage volaille", "1 kg / 1000 L d&#39;eau de boisson · 3 à 5 jours"],
    ]
    t = Table(data, colWidths=[6 * cm, 11 * cm])
    t.setStyle(base_table_style())
    story.append(t)

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "<b>Rubrique commerciale</b> : Avicole → Diététique → Appareil locomoteur "
        "(le produit est positionné comme soutien de la croissance musculaire).",
        small_style))

    # ── 2. Composition déclarée ─────────────────────────────────────────
    story.append(Paragraph("2. Composition déclarée", h1_style))
    story.append(Paragraph("D&#39;après les informations publiques :", body_style))

    data = [
        ["Ingrédient", "Rôle"],
        ["Monochlorhydrate de L-lysine", "Acide aminé essentiel &mdash; 1<super>er</super> limitant chez le porc"],
        ["DL-Méthionine", "Acide aminé essentiel &mdash; 2<super>e</super> limitant chez le porc"],
        ["Dextrose (glucose)", "Support &mdash; améliore l&#39;appétence et la solubilité"],
        ["Lactose", "Support &mdash; glucide de transition"],
    ]
    t = Table(data, colWidths=[6.5 * cm, 10.5 * cm])
    t.setStyle(base_table_style())
    story.append(t)

    story.append(Spacer(1, 8))
    story.append(box(
        "Point de vigilance",
        "Les <b>teneurs exactes en acides aminés</b> (% Lysine et % Méthionine dans le produit) "
        "ne sont <b>pas publiées sur le site</b>. "
        "Ces données sont dans la fiche technique complète (réservée aux clients enregistrés). "
        "<b>Demander la fiche technique détaillée à Synthèse Élevage ou au revendeur</b> "
        "avant toute formulation.",
        tone="amber",
    ))

    # ── 3. Apports théoriques ───────────────────────────────────────────
    story.append(Paragraph("3. Apports théoriques pour le porc", h1_style))
    story.append(Paragraph(
        "Les acides aminés de synthèse L-Lysine HCl et DL-Méthionine sont identiques "
        "quelle que soit l&#39;espèce cible (volaille ou porc). Leur métabolisme chez le porc "
        "est <b>bien documenté</b> :",
        body_style))

    story.append(Paragraph("<b>Lysine</b>", h2_style))
    for line in [
        "• 1<super>er</super> acide aminé limitant chez le porc (référence pour le ratio protéine idéale)",
        "• Clé de la déposition musculaire maigre",
        "• Déficit → baisse GMQ, gras excessif, IC dégradé",
        "• Besoin accru chez les porcelets en croissance + truies allaitantes",
    ]:
        story.append(Paragraph(line, body_style))

    story.append(Paragraph("<b>Méthionine</b>", h2_style))
    for line in [
        "• 2<super>e</super> acide aminé limitant chez le porc (après la lysine)",
        "• Précurseur de la cystéine (métabolisme soufré, glutathion)",
        "• Essentielle pour la santé immunitaire + intégrité intestinale post-sevrage",
        "• Déficitaire dans les régimes maïs + tourteau de soja (cas de la ferme K13)",
    ]:
        story.append(Paragraph(line, body_style))

    story.append(Spacer(1, 8))
    story.append(box(
        "Bilan apports",
        "LysiMet apporte les <b>deux premiers AA limitants</b> du porc. Son effet biologique "
        "est donc pertinent <b>pour l&#39;espèce porcine</b>, même si son usage officiel "
        "est la volaille. "
        "L&#39;apport se fait via un vecteur glucose/lactose qui renforce l&#39;appétence et "
        "la solubilité dans l&#39;eau.",
        tone="accent",
    ))

    # ── 4. Modes d'usage chez le porc ───────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("4. Deux modes d&#39;usage possibles chez le porc", h1_style))

    story.append(Paragraph("<b>Voie A &mdash; Eau de boisson (conforme forme galénique)</b>", h2_style))
    story.append(Paragraph(
        "Le produit étant une poudre soluble, son mode d&#39;usage natif est l&#39;administration "
        "dans l&#39;abreuvoir.",
        body_style))
    story.append(Paragraph("<b>Dosage volaille de référence</b> : 1 kg / 1000 L = <b>1 g / L</b>.", body_style))
    story.append(Paragraph("<b>Extrapolation porc</b> (à valider par vétérinaire) :", body_style))

    data = [
        ["Catégorie", "Conso eau / j", "Dose journalière LysiMet", "Durée cure"],
        ["Porcelet sevré (7-15 kg)", "1-2 L", "1-2 g/sujet", "3-5 j"],
        ["Porc croissance (25-50 kg)", "4-6 L", "4-6 g/sujet", "3-5 j"],
        ["Porc finition (50-100 kg)", "6-10 L", "6-10 g/sujet", "3-5 j"],
        ["Truie lactation", "15-20 L", "15-20 g/sujet", "3-5 j"],
    ]
    t = Table(data, colWidths=[5 * cm, 3 * cm, 5 * cm, 4 * cm])
    t.setStyle(base_table_style(header_bg=BLUE))
    story.append(t)

    story.append(Spacer(1, 6))
    story.append(box(
        "Indications voie A",
        "Mode d&#39;emploi recommandé : <b>cure courte (3-5 j) en période de stress</b>. "
        "Moments clés : post-sevrage (J21-J28), post-transport, post-vaccination, pic lactation "
        "truies (J3-J14 post-MB), période de chaleur intense. "
        "Avantages : simple à mettre en œuvre, bonne biodisponibilité, pas de calcul "
        "d&#39;incorporation dans l&#39;aliment sec.",
        tone="blue",
    ))

    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Voie B &mdash; Incorporation dans l&#39;aliment sec</b>", h2_style))
    story.append(Paragraph(
        "Possible mais <b>non conforme à la forme galénique</b> (poudre initialement prévue pour "
        "dilution dans l&#39;eau). Le produit contenant du dextrose et du lactose, il se mélange "
        "facilement à un aliment sec en poudre/miette.",
        body_style))
    story.append(Paragraph(
        "<b>Difficulté</b> : sans fiche technique détaillée (teneur exacte en Lysine et Méthionine), "
        "impossible de calculer précisément l&#39;apport AA vs les autres produits disponibles "
        "(L-Lysine HCl 78% et DL-Méthionine 99% en produits séparés).",
        body_style))

    story.append(box(
        "Si voie B souhaitée",
        "Dosage prudent proposé : <b>0,5 à 1 kg LysiMet par 100 kg de mélange final</b>, "
        "en remplacement (pas en cumul) des autres sources L-Lys + DL-Met. "
        "À réserver au <b>Démarrage 1 et 2</b> (phases à fort besoin AA). "
        "Avant tout usage : exiger la fiche technique complète du fabricant.",
        tone="amber",
    ))

    # ── 5. Alternatives plus adaptées porcin ────────────────────────────
    story.append(Paragraph("5. Alternatives plus adaptées aux porcins", h1_style))
    story.append(Paragraph(
        "Pour un élevage naisseur-engraisseur, les produits industriels dédiés porcs sont "
        "généralement plus adaptés et moins coûteux :",
        body_style))

    data = [
        ["Produit", "Type", "Usage porc", "Prix CI indicatif"],
        ["L-Lysine HCl 78%", "AA pur", "Incorporation aliment 0,5-1 kg/t", "1400-2800 F/t"],
        ["DL-Méthionine 99%", "AA pur", "Incorporation aliment 1-1,5 kg/t", "3500-5250 F/t"],
        ["Thréonine L-Thr", "AA pur (3<super>e</super> limitant)", "0,2-0,5 kg/t", "Variable"],
        ["Prémix AA porc", "Mélange dédié", "Selon fournisseur", "Variable"],
    ]
    t = Table(data, colWidths=[5 * cm, 3.5 * cm, 5.5 * cm, 3 * cm])
    t.setStyle(base_table_style())
    story.append(t)

    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "<b>Recommandation pragmatique</b> : utiliser les 10 sacs de LysiMet en stock "
        "pour des <b>cures courtes eau de boisson</b> (voie A) sur les catégories à forts "
        "besoins (starters + truies lactation). Pour la formulation long terme des aliments "
        "secs, privilégier L-Lysine HCl et DL-Méthionine en produits purs industriels.",
        body_style))

    # ── 6. Planification 10 sacs ────────────────────────────────────────
    story.append(Paragraph("6. Proposition de répartition des 10 sacs (50 kg)", h1_style))
    story.append(Paragraph(
        "Pour un usage voie A (eau de boisson) sur la ferme K13 :",
        body_style))

    data = [
        ["Usage", "Cible", "Volume / cure", "Nb cures possibles"],
        ["Post-sevrage porcelets", "~110 porcelets × 1,5 g/j × 5 j ≈ 0,8 kg/cure", "0,8 kg", "~60 cures"],
        ["Truies lactation pic laitier", "4 truies × 18 g/j × 5 j ≈ 0,4 kg/cure", "0,4 kg", "~120 cures"],
        ["Porcs croissance stress chaleur", "~100 porcs × 5 g/j × 3 j ≈ 1,5 kg/cure", "1,5 kg", "~33 cures"],
    ]
    t = Table(data, colWidths=[5 * cm, 6 * cm, 3 * cm, 3 * cm])
    t.setStyle(base_table_style())
    story.append(t)

    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "<b>Autonomie totale</b> avec 50 kg en stock : <b>6 à 12 mois</b> selon la stratégie "
        "de priorisation choisie par le technicien.",
        body_style))

    # ── 7. Précautions ──────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("7. Précautions et contre-indications", h1_style))

    precautions = [
        ("Stockage", "Poudre soluble sensible à l&#39;humidité. Stocker au sec, à l&#39;abri "
                     "de la lumière, température < 25°C si possible. Refermer le sac après usage."),
        ("Climat tropical CI", "Risque d&#39;agglomération / dégradation accélérée en saison "
                               "humide. Ne pas stocker un sac ouvert plus de 4 semaines."),
        ("Administration eau", "Préparer la solution juste avant distribution. Ne pas laisser "
                               "stagner plus de 24 h dans l&#39;abreuvoir (risque contamination "
                               "bactérienne)."),
        ("Usage concomitant", "Si l&#39;aliment sec contient déjà des AA synthétiques "
                              "(L-Lys, DL-Met), l&#39;ajout LysiMet dans l&#39;eau peut créer "
                              "un cumul. Vérifier avec le technicien pour éviter le surdosage."),
        ("Espèces", "Produit hors AMM pour le porc. Tenir informer le vétérinaire référent "
                   "de son usage, notamment en vue d&#39;un éventuel contrôle sanitaire."),
        ("Conservation poudre", "Ne pas congeler. Ne pas exposer au rayonnement solaire direct."),
    ]
    for title, content in precautions:
        story.append(Paragraph(f"<b>{title}</b>", h2_style))
        story.append(Paragraph(content, body_style))

    # ── 8. Checklist technicien ─────────────────────────────────────────
    story.append(Paragraph("8. Checklist avant mise en œuvre", h1_style))
    checklist = [
        "Obtenir la <b>fiche technique complète</b> auprès de Synthèse Élevage ou du revendeur "
        "(teneurs exactes Lysine et Méthionine par kg de produit).",
        "Valider le <b>détournement d&#39;usage porc</b> avec le vétérinaire sanitaire.",
        "Choisir la <b>voie d&#39;administration</b> (A eau de boisson OU B incorporation aliment).",
        "Calculer précisément l&#39;<b>apport AA</b> déjà présent dans le mélange Koudijs actuel "
        "pour éviter le cumul.",
        "Mettre en place le <b>protocole test</b> (lot test vs témoin) avant généralisation.",
        "Suivre les <b>indicateurs GMQ + IC</b> via l&#39;app PorcTrack (module Croissance) "
        "pour mesurer l&#39;impact économique.",
        "Documenter la <b>traçabilité</b> des cures dans le journal de santé (date, lot, dose)."
    ]
    for i, item in enumerate(checklist, 1):
        story.append(Paragraph(f"<b>{i}.</b> {item}", body_style))

    # ── 9. Sources ──────────────────────────────────────────────────────
    story.append(Paragraph("9. Sources consultées", h1_style))
    sources = [
        "Fiche produit officielle LysiMet &mdash; <font color='#2563EB'>syntheseelevage.com/avicole/dietetique/appareil-locomoteur/194-lysimet-aliment-complementaire-pour-un-apport-en-acides-amines.html</font>",
        "Export FR Synthèse Élevage &mdash; <font color='#2563EB'>fr.syntheseelevage.com/avicole/dietetique/appareil-locomoteur/683-lysimet</font>",
        "Réussir Porc / Tech Porc &mdash; Les acides aminés améliorent l&#39;autonomie protéique",
        "RMT Élevages et Environnement &mdash; Fiche GBPEE volaille n°3 (AA synthèse/biosynthèse)",
        "NRC 2012 &mdash; Nutrient Requirements of Swine (besoins lysine/méthionine porc)",
        "INRA-CIRAD-AFZ &mdash; Tables de composition des matières premières",
    ]
    for s in sources:
        story.append(Paragraph(f"• {s}", small_style))

    story.append(Spacer(1, 16))
    story.append(Paragraph(
        "<i>Document d&#39;analyse préparé pour le technicien d&#39;élevage de la ferme K13. "
        "Les dosages porcins proposés sont des extrapolations à valider par le vétérinaire "
        "sanitaire avant mise en œuvre.</i>",
        small_style))

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(f"PDF généré : {OUTPUT}")


if __name__ == "__main__":
    build()
