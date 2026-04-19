#!/usr/bin/env python3
"""Génère le PDF de briefing LysiMet pour le technicien d'élevage."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

OUTPUT = "docs/NUTRITION_LYSIMET_BRIEFING_TECHNICIEN.pdf"

# Palette
ACCENT = colors.HexColor("#065F46")
ACCENT_LIGHT = colors.HexColor("#D1FAE5")
AMBER = colors.HexColor("#D97706")
AMBER_LIGHT = colors.HexColor("#FEF3C7")
RED = colors.HexColor("#DC2626")
RED_LIGHT = colors.HexColor("#FEE2E2")
GRAY_900 = colors.HexColor("#111827")
GRAY_700 = colors.HexColor("#374151")
GRAY_500 = colors.HexColor("#6B7280")
GRAY_200 = colors.HexColor("#E5E7EB")
GRAY_100 = colors.HexColor("#F3F4F6")
GRAY_50 = colors.HexColor("#F9FAFB")

styles = getSampleStyleSheet()

# Styles custom
title_style = ParagraphStyle(
    "TitleCustom", parent=styles["Title"],
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
    fontName="Helvetica-Bold", fontSize=13, textColor=GRAY_900,
    spaceBefore=12, spaceAfter=8,
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
bold_inline = "Helvetica-Bold"

# Table styles
def base_table_style(header_bg=ACCENT, header_fg=colors.white):
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("TEXTCOLOR", (0, 0), (-1, 0), header_fg),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ALIGN", (0, 0), (-1, 0), "LEFT"),
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


def priority_box(title, content, tone="accent"):
    """Encadré priorité coloré."""
    bg = {"accent": ACCENT_LIGHT, "amber": AMBER_LIGHT, "red": RED_LIGHT}[tone]
    fg = {"accent": ACCENT, "amber": AMBER, "red": RED}[tone]
    data = [[Paragraph(f'<b><font color="{fg.hexval()}">{title}</font></b>', body_style)],
            [Paragraph(content, small_style)]]
    t = Table(data, colWidths=[17 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("BOX", (0, 0), (-1, -1), 0, bg),
        ("LINEBEFORE", (0, 0), (0, -1), 3, fg),
    ]))
    return t


def footer(canvas, doc):
    """Footer page."""
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GRAY_500)
    canvas.drawString(2 * cm, 1.2 * cm,
                      "PorcTrack 8 · Ferme K13 · Briefing LysiMet · Usage interne")
    canvas.drawRightString(19 * cm, 1.2 * cm, f"Page {doc.page}")
    canvas.setStrokeColor(GRAY_200)
    canvas.line(2 * cm, 1.6 * cm, 19 * cm, 1.6 * cm)
    canvas.restoreState()


def build():
    doc = SimpleDocTemplate(
        OUTPUT, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
        title="Briefing LysiMet — Technicien",
        author="Ferme K13",
    )
    story = []

    # ── Titre ────────────────────────────────────────────────────────────
    story.append(Paragraph("Briefing technicien &mdash; Intégration LysiMet", title_style))
    story.append(Paragraph(
        "Ferme K13 · Côte d&#39;Ivoire · Large White · Programme Koudijs (De Heus CI)",
        subtitle_style))

    story.append(priority_box(
        "Résumé exécutif",
        "Stock : <b>10 sacs LysiMet</b> (Synthèse Élevage). Objectif production ferme : "
        "<b>100 kg en 150 j</b> → GMQ moyen requis <b>657 g/j</b>. "
        "Lysine starters proche du minimum (−7% sur Démarrage 1). "
        "Méthionine fortement déficitaire sur toutes phases. "
        "LysiMet (Lys+Met combinés) recommandé en priorité sur <b>porcelets starters</b>, "
        "puis truies en lactation. Non recommandé en finition.",
        tone="accent",
    ))
    story.append(Spacer(1, 10))

    # ── 1. Contexte ─────────────────────────────────────────────────────
    story.append(Paragraph("1. Contexte exploitation", h1_style))
    data = [
        ["Paramètre", "Valeur"],
        ["Cheptel", "17 truies · 2 verrats · ~149 porcelets vivants"],
        ["Loges", "9 maternité · 4 post-sevrage · 2 engraissement (sép. sexe J+70)"],
        ["Race", "Large White"],
        ["Objectif production", "100 kg en 5 mois (150 j) → GMQ moyen 657 g/j"],
        ["Fournisseur concentrés", "Koudijs / De Heus Côte d'Ivoire (exclusif année 1)"],
        ["Concentrés utilisés", "Romelko RED · KPC 5% · AMV 5%"],
        ["Matières premières", "Maïs grain · Tourteau de soja · Son de blé"],
    ]
    t = Table(data, colWidths=[5 * cm, 12 * cm])
    t.setStyle(base_table_style())
    story.append(t)

    # ── 2. Programme Koudijs ─────────────────────────────────────────────
    story.append(Paragraph("2. Programme Koudijs &mdash; Niveaux nutritionnels (%)", h1_style))
    story.append(Paragraph(
        'Source : Fiche &laquo; Conseils de mélange Romelko & KPC 5 &raquo; De Heus CI.',
        small_style))
    story.append(Spacer(1, 6))

    data = [
        ["Phase", "ME kcal", "PB %", "Lys %", "Met %", "Ca %", "P %"],
        ["Porcelet sous mère", "3283", "18.00", "1.26", "0.45", "0.57", "0.52"],
        ["Démarrage 1 (7-15 kg)", "3261", "17.92", "1.18", "0.40", "0.63", "0.50"],
        ["Démarrage 2 (15-25 kg)", "3249", "17.16", "1.12", "0.38", "0.74", "0.48"],
        ["Croissance (25-50 kg)", "3217", "15.97", "1.03", "0.34", "0.68", "0.42"],
        ["Finition (>50 kg)", "3179", "13.61", "0.92", "0.31", "0.66", "0.40"],
        ["Truie gestante", "3009", "17.17", "0.88", "0.28", "0.74", "0.50"],
        ["Truie lactation", "3102", "16.44", "1.04", "0.36", "1.03", "0.52"],
    ]
    t = Table(data, colWidths=[4.5 * cm, 2 * cm, 2 * cm, 2 * cm, 2 * cm, 2 * cm, 2.5 * cm])
    t.setStyle(base_table_style())
    story.append(t)

    story.append(Spacer(1, 10))
    story.append(Paragraph("<b>Recettes de mélange Koudijs</b> (kg / 100 kg mélange final) :", body_style))

    data = [
        ["Ingrédient", "Dém. 1", "Dém. 2", "Croiss.", "Finition", "Gestante", "Lactation"],
        ["Romelko RED", "50", "—", "—", "—", "—", "—"],
        ["KPC 5%", "3", "6", "5", "5", "5", "6"],
        ["Maïs", "34", "66", "68", "70", "58", "58"],
        ["Son de blé", "3", "8", "10", "15", "30", "18"],
        ["Tourteau de soja", "10", "20", "18", "10", "7", "18"],
        ["TOTAL", "100", "100", "100", "100", "100", "100"],
    ]
    t = Table(data, colWidths=[4.5 * cm, 2.1 * cm, 2.1 * cm, 2.1 * cm, 2.1 * cm, 2.1 * cm, 2.1 * cm])
    t.setStyle(base_table_style())
    t.setStyle(TableStyle([
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), ACCENT_LIGHT),
    ]))
    story.append(t)

    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "<i>Recommandation fournisseur : +1% huile végétale en pré-démarrage et lactation.</i>",
        small_style))

    # ── 3. Constat lysine ───────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("3. Constat lysine vs cibles pro (LW tropical)", h1_style))
    data = [
        ["Phase", "Lysine actuelle", "Cible SID (NRC 2012)", "Écart"],
        ["Démarrage 1 (7-15 kg)", "1.18%", "1.25%", "−0.07 pp ⚠"],
        ["Démarrage 2 (15-25 kg)", "1.12%", "1.15%", "−0.03 pp"],
        ["Croissance (25-50 kg)", "1.03%", "1.05%", "−0.02 pp"],
        ["Finition (50-100 kg)", "1.04%", "0.85%", "OK"],
        ["Truie lactation", "1.04%", "1.05%", "−0.01 pp"],
        ["Truie gestante", "0.88%", "0.70%", "OK (+0.18)"],
    ]
    t = Table(data, colWidths=[4.5 * cm, 4 * cm, 4.5 * cm, 4 * cm])
    t.setStyle(base_table_style())
    story.append(t)

    story.append(Spacer(1, 10))
    story.append(priority_box(
        "Interprétation",
        "Les niveaux sont dans la cible mais <b>au minimum syndical</b>, notamment sur les starters "
        "(1er acide aminé limitant). Pour atteindre l&#39;objectif ambitieux <b>100 kg en 150 j</b>, "
        "la marge de sécurité est trop faible sur les phases Démarrage.",
        tone="amber",
    ))

    # ── 4. LysiMet fiche ────────────────────────────────────────────────
    story.append(Paragraph("4. LysiMet (Synthèse Élevage) &mdash; fiche pour formulation", h1_style))
    story.append(Paragraph(
        "<b>Source</b> : syntheseelevage.com/avicole/dietetique/appareil-locomoteur/"
        "194-lysimet-aliment-complementaire-pour-un-apport-en-acides-amines.html",
        small_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "<b>Composition type</b> (à confirmer par fiche fabricant) :",
        body_style))
    for line in [
        "• Base L-Lysine HCl + DL-Méthionine",
        "• Complément en acides aminés essentiels (Thréonine, Tryptophane possibles)",
        "• Support amidon / minéral",
    ]:
        story.append(Paragraph(line, body_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>Stock actuel ferme K13</b> : 10 sacs disponibles.", body_style))

    # ── 5. Recommandations usage ────────────────────────────────────────
    story.append(Paragraph("5. Recommandations d&#39;usage (priorisées)", h1_style))

    priorities = [
        ("accent",
         "🥇 Priorité 1 — Démarrage 1 (J21-J42, 7→15 kg)",
         "<b>Objectif</b> : combler le gap −0.07 pp lysine sur la phase la plus sensible. "
         "<b>Dosage proposé</b> : 0.5 à 1.0 kg LysiMet / 100 kg mélange (5-10 kg/tonne). "
         "<b>Gain attendu</b> : +5-10% GMQ post-sevrage · IC −0.1 à −0.2. "
         "<b>Consommation</b> : ~11.6 kg aliment/sujet × 110 porcelets = 1276 kg mélange → <b>6-13 kg LysiMet</b> (1 à 2 sacs)."),
        ("accent",
         "🥈 Priorité 2 — Démarrage 2 (J42-J63, 15→25 kg)",
         "<b>Dosage</b> : 0.5 kg / 100 kg (5 kg/tonne). "
         "<b>Gain</b> : +3-5% GMQ, meilleur développement muscles. "
         "<b>Conso</b> : 21 kg aliment/sujet × 110 porcelets = 2310 kg → <b>~11 kg LysiMet</b>."),
        ("amber",
         "🥉 Priorité 3 — Truies en lactation (21 j allaitement)",
         "<b>Dosage</b> : 0.3-0.5 kg / 100 kg (3-5 kg/tonne). "
         "<b>Gain</b> : meilleure production lait → +200-400 g poids sevrage porcelets. "
         "<b>Conso</b> : 5 kg/j × 21j × 4 truies simultanées = 420 kg/cycle → ~1-2 kg LysiMet/cycle."),
        ("red",
         "❌ Phases NON recommandées",
         "<b>Finition (&gt;50 kg)</b> : lysine naturellement basse, ROI faible. "
         "<b>Truies gestantes</b> : besoin lysine limité (0.88% déjà au-dessus de la cible 0.70%). "
         "<b>Verrats</b> : maintien uniquement. "
         "<b>Porcelets sous mère J0-J21</b> : aliment Romelko RED seul (pas de mélange ferme)."),
    ]
    for tone, title, content in priorities:
        story.append(priority_box(title, content, tone=tone))
        story.append(Spacer(1, 8))

    # ── 6. Méthionine ───────────────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("6. Point d&#39;attention régulation &mdash; Méthionine", h1_style))
    story.append(Paragraph(
        "<b>La méthionine est fortement déficitaire partout dans la formulation actuelle :</b>",
        body_style))
    story.append(Spacer(1, 4))

    data = [
        ["Phase", "Met actuelle", "Cible SID", "Écart"],
        ["Démarrage 1", "0.40%", "0.55-0.60%", "−0.15 à −0.20 pp 🔴"],
        ["Démarrage 2", "0.38%", "0.50%", "−0.12 pp"],
        ["Croissance", "0.34%", "0.42%", "−0.08 pp"],
    ]
    t = Table(data, colWidths=[4.5 * cm, 3.5 * cm, 4 * cm, 5 * cm])
    t.setStyle(base_table_style(header_bg=AMBER))
    story.append(t)

    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "C&#39;est l&#39;intérêt principal de <b>LysiMet vs L-Lysine HCl seule</b> : "
        "tu combles Lysine ET Méthionine en un seul produit. "
        "Le document Max Farmer CI note d&#39;ailleurs &laquo; Déficit 30-50% Met+Cys sans "
        "supplément &raquo; dans les additifs obligatoires.",
        body_style))

    story.append(Paragraph(
        "<b>Si le technicien préfère les produits séparés :</b>",
        body_style))
    for line in [
        "• L-Lysine HCl 78% : 0.5-1.0 kg/tonne (prix CI ~1400-2800 F/tonne)",
        "• DL-Méthionine 99% : 1.0-1.5 kg/tonne (prix CI ~3500-5250 F/tonne)",
    ]:
        story.append(Paragraph(line, body_style))

    story.append(Paragraph(
        "LysiMet combine les deux → <b>avantage pratique</b> (1 seul produit à peser/mélanger, "
        "moins de risque d&#39;erreur), <b>léger surcoût</b> probable.",
        body_style))

    # ── 7. Additifs complémentaires ─────────────────────────────────────
    story.append(Paragraph("7. Additifs complémentaires obligatoires (climat tropical CI)", h1_style))
    story.append(Paragraph(
        "Selon fiche Max Farmer CI :", small_style))

    data = [
        ["Additif", "Dosage", "Phases", "Rôle"],
        ["Mycofix (anti-mycotoxines)", "1-2 kg/tonne", "TOUTES", "Aflatoxines maïs CI"],
        ["Phytase", "0.1 kg/tonne", "Si son de riz", "Neutralise acide phytique"],
        ["Sel NaCl", "3-5 kg/tonne", "Toutes", "Équilibre électrolytique"],
        ["Phosphate bicalcique", "5-10 kg/tonne", "Gestation + Lactation", "Ca/P ossification"],
    ]
    t = Table(data, colWidths=[5 * cm, 3 * cm, 4 * cm, 5 * cm])
    t.setStyle(base_table_style())
    story.append(t)

    # ── 8. Protocole validation ─────────────────────────────────────────
    story.append(Paragraph("8. Protocole de validation recommandé", h1_style))
    story.append(Paragraph(
        "Pour le technicien : <b>test sur 1 lot avant généralisation</b>.",
        body_style))
    steps = [
        "<b>Lot test (n=10-15 porcelets)</b> : Démarrage 1 avec LysiMet 0.5 kg/100 kg",
        "<b>Lot témoin (n=10-15 porcelets)</b> : même aliment sans LysiMet",
        "<b>Pesées hebdomadaires</b> (J21, J28, J35, J42)",
        "<b>Comparer GMQ</b> : si +5% ou plus → généraliser",
        "<b>Mesurer IC</b> : si −0.1 ou plus → rentable économiquement",
    ]
    for i, s in enumerate(steps, 1):
        story.append(Paragraph(f"{i}. {s}", body_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "<i>L&#39;app PorcTrack permet déjà le suivi des pesées et du GMQ automatique "
        "(module Croissance dans fiche bande).</i>",
        small_style))

    # ── 9. Questions ouvertes ───────────────────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("9. Questions ouvertes pour le technicien", h1_style))
    story.append(Paragraph(
        "Merci de répondre à ces 5 points pour finaliser la formule :",
        body_style))
    story.append(Spacer(1, 4))

    questions = [
        "Peut-il confirmer la <b>composition exacte LysiMet</b> (ratio Lysine/Méthionine/autres AA) ?",
        "Recommande-t-il un <b>dosage différent</b> de 0.5-1.0 kg/100 kg ?",
        "Préfère-t-il l&#39;usage <b>simultané</b> (LysiMet + L-Lysine HCl + DL-Méthionine) "
        "ou en <b>remplacement</b> ?",
        "Valide-t-il le <b>protocole test</b> proposé (lot test vs témoin) ?",
        "Des <b>contraintes de stockage</b> LysiMet en climat tropical CI "
        "(humidité, chaleur) ?",
    ]
    for i, q in enumerate(questions, 1):
        story.append(priority_box(f"Question {i}", q, tone="accent"))
        story.append(Spacer(1, 6))

    # ── Footer final ────────────────────────────────────────────────────
    story.append(Spacer(1, 20))
    story.append(Paragraph(
        "<i>Document préparé pour transmission au technicien d&#39;élevage accompagnant la "
        "ferme K13.<br/>Sources : Fiche mélange Koudijs De Heus CI · Programme Max Farmer CI · "
        "NRC 2012 · Fiche produit Synthèse Élevage.</i>",
        small_style))

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(f"PDF généré : {OUTPUT}")


if __name__ == "__main__":
    build()
