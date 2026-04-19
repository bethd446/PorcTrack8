#!/usr/bin/env python3
"""PDF fiche formules aliment K13 — à afficher en ferme.

Formules validées par le technicien d'élevage (avril 2026).
Base Koudijs / De Heus CI + ajustements lysine, méthionine, enzymes.
Calculs par tonne + 500 kg + 100 kg pour référence rapide.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether,
)

OUTPUT = "docs/FORMULES_ALIMENT_FERME_K13.pdf"

ACCENT = colors.HexColor("#065F46")
ACCENT_LIGHT = colors.HexColor("#D1FAE5")
AMBER = colors.HexColor("#D97706")
AMBER_LIGHT = colors.HexColor("#FEF3C7")
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
    alignment=TA_LEFT, spaceAfter=14,
)
h1_style = ParagraphStyle(
    "H1", parent=styles["Heading1"],
    fontName="Helvetica-Bold", fontSize=14, textColor=ACCENT,
    spaceBefore=14, spaceAfter=8,
)
phase_label = ParagraphStyle(
    "PhaseLabel", parent=styles["Normal"],
    fontName="Helvetica-Bold", fontSize=11, textColor=colors.white,
    alignment=TA_CENTER, leading=14,
)
body_style = ParagraphStyle(
    "Body", parent=styles["Normal"],
    fontName="Helvetica", fontSize=10, textColor=GRAY_900,
    leading=14, spaceAfter=6,
)
small_style = ParagraphStyle(
    "Small", parent=body_style,
    fontSize=9, textColor=GRAY_700, leading=12,
)
warn_style = ParagraphStyle(
    "Warn", parent=body_style,
    fontSize=9, textColor=AMBER,
)

# ── Données formulations (validé technicien K13) ──────────────────────────
FORMULES = [
    {
        "code": "DEMARRAGE_1",
        "nom": "Porcelets — Démarrage 1",
        "phase": "Post-sevrage (7 → 15 kg · J21-J42)",
        "color": ACCENT,
        "ingredients": [
            ("Romelko", 50, "%"),
            ("KPC 5", 3, "%"),
            ("Maïs", 34, "%"),
            ("Son de blé", 3, "%"),
            ("Tourteau de soja", 10, "%"),
        ],
        "additifs": [
            ("Lysine", 1, "kg/T"),
            ("Méthionine", 0.5, "kg/T"),
            ("Enzymes", 300, "g/T"),
        ],
    },
    {
        "code": "CROISSANCE",
        "nom": "Porcs — Croissance",
        "phase": "Engraissement actif (25 → 50 kg · J63-J93)",
        "color": BLUE,
        "ingredients": [
            ("KPC 5", 5, "%"),
            ("Maïs", 68, "%"),
            ("Son de blé", 10, "%"),
            ("Tourteau de soja", 18, "%"),
        ],
        "additifs": [
            ("Lysine", 1, "kg/T"),
            ("Enzymes", 250, "g/T"),
        ],
    },
    {
        "code": "FINITION",
        "nom": "Porcs — Finition",
        "phase": "Finition pré-abattage (50 → 100 kg · J93-J183)",
        "color": AMBER,
        "ingredients": [
            ("KPC 5", 5, "%"),
            ("Maïs", 70, "%"),
            ("Son de blé", 15, "%"),
            ("Tourteau de soja", 10, "%"),
        ],
        "additifs": [
            ("Lysine", 0.5, "kg/T"),
            ("Enzymes", 200, "g/T"),
        ],
    },
    {
        "code": "TRUIE_GESTATION",
        "nom": "Truie — Gestation",
        "phase": "Gestation 115 jours · 2,5 kg/j",
        "color": ACCENT,
        "ingredients": [
            ("KPC 5", 5, "%"),
            ("Maïs", 58, "%"),
            ("Son de blé", 30, "%"),
            ("Tourteau de soja", 7, "%"),
        ],
        "additifs": [
            ("Enzymes", 200, "g/T"),
        ],
    },
    {
        "code": "TRUIE_LACTATION",
        "nom": "Truie — Lactation",
        "phase": "Allaitement 21 jours · 5 kg/j (pic)",
        "color": BLUE,
        "ingredients": [
            ("KPC 5", 6, "%"),
            ("Maïs", 58, "%"),
            ("Son de blé", 18, "%"),
            ("Tourteau de soja", 18, "%"),
        ],
        "additifs": [
            ("Lysine", 1, "kg/T"),
            ("Enzymes", 300, "g/T"),
        ],
    },
]


def table_header_style(bg):
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), bg),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 10),
        ("TEXTCOLOR", (0, 1), (-1, -1), GRAY_900),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, GRAY_50]),
        ("GRID", (0, 0), (-1, -1), 0.25, GRAY_200),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 1), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 6),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("FONTNAME", (-1, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), ACCENT_LIGHT),
    ])


def phase_header(nom, phase, color):
    """Bandeau titre phase coloré."""
    data = [[Paragraph(f'<font color="white">{nom}</font>', phase_label),
             Paragraph(f'<font color="white" size="9">{phase}</font>', phase_label)]]
    t = Table(data, colWidths=[8 * cm, 9 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), color),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
    ]))
    return t


def formule_block(f):
    """Bloc complet pour une phase : titre + tableau ingrédients + additifs."""
    blocks = [phase_header(f["nom"], f["phase"], f["color"])]

    # Ingrédients
    data = [["Ingrédient", "% Base", "100 kg", "500 kg", "1 000 kg"]]
    total_pct = 0
    for nom, pct, _ in f["ingredients"]:
        total_pct += pct
        data.append([
            nom,
            f"{pct} %",
            f"{pct * 1:.1f} kg",
            f"{pct * 5:.1f} kg",
            f"{pct * 10:.1f} kg",
        ])
    data.append([
        "TOTAL base",
        f"{total_pct} %",
        f"{total_pct:.0f} kg",
        f"{total_pct * 5:.0f} kg",
        f"{total_pct * 10:.0f} kg",
    ])
    t = Table(data, colWidths=[4.5 * cm, 2.5 * cm, 3 * cm, 3.5 * cm, 3.5 * cm])
    t.setStyle(table_header_style(f["color"]))
    blocks.append(t)

    # Additifs
    if f["additifs"]:
        blocks.append(Spacer(1, 4))
        add_data = [["Additif", "Dose", "100 kg", "500 kg", "1 000 kg"]]
        for nom, qte, unite in f["additifs"]:
            if unite == "kg/T":
                kg_per_ton = qte
                add_data.append([
                    nom,
                    f"{qte} kg/tonne",
                    f"{kg_per_ton * 0.1:.3f} kg",
                    f"{kg_per_ton * 0.5:.2f} kg",
                    f"{kg_per_ton * 1:.2f} kg",
                ])
            elif unite == "g/T":
                add_data.append([
                    nom,
                    f"{qte} g/tonne",
                    f"{qte * 0.1:.1f} g",
                    f"{qte * 0.5:.1f} g",
                    f"{qte * 1:.0f} g",
                ])
        t2 = Table(add_data, colWidths=[4.5 * cm, 2.5 * cm, 3 * cm, 3.5 * cm, 3.5 * cm])
        t2.setStyle(table_header_style(GRAY_700))
        blocks.append(t2)

    return KeepTogether(blocks)


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GRAY_500)
    canvas.drawString(2 * cm, 1.2 * cm,
                      "Ferme K13 · Fiche formules aliment · Validé technicien 04/2026 · À afficher")
    canvas.drawRightString(19 * cm, 1.2 * cm, f"Page {doc.page}")
    canvas.setStrokeColor(GRAY_200)
    canvas.line(2 * cm, 1.6 * cm, 19 * cm, 1.6 * cm)
    canvas.restoreState()


def build():
    doc = SimpleDocTemplate(
        OUTPUT, pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
        title="Formules aliment K13",
    )
    story = []

    # ── Titre + intro ────────────────────────────────────────────────────
    story.append(Paragraph("Formules aliment porcin &mdash; Ferme K13", title_style))
    story.append(Paragraph(
        "Validé par le technicien d&#39;élevage · Base Koudijs (De Heus CI) · "
        "Ajustements acides aminés + enzymes",
        subtitle_style))

    story.append(Paragraph(
        "<b>Mode d&#39;emploi de cette fiche</b> : les pourcentages (%) s&#39;appliquent "
        "à la quantité totale d&#39;aliment que vous préparez. "
        "Les colonnes <b>100 kg</b>, <b>500 kg</b>, <b>1 000 kg</b> donnent les quantités "
        "exactes à peser pour chaque ingrédient et additif. "
        "Pour toute autre quantité, multiplier le % par la masse totale (ex: 250 kg = % × 2,5).",
        body_style))

    story.append(Paragraph(
        "<b>Règles d&#39;or</b> : eau propre permanente · transition 5-7 jours entre phases · "
        "distribuer aux mêmes heures · ne jamais donner d&#39;aliment moisi · "
        "peser régulièrement pour ajuster les rations.",
        small_style))

    story.append(Spacer(1, 10))

    # ── Les 5 formules ───────────────────────────────────────────────────
    for f in FORMULES:
        story.append(formule_block(f))
        story.append(Spacer(1, 10))

    # ── Page dernière : additifs + rappels ───────────────────────────────
    story.append(PageBreak())
    story.append(Paragraph("Rappels importants", h1_style))

    # Additifs recommandés CI (hors formulation technicien)
    story.append(Paragraph(
        "<b>Additifs supplémentaires climat tropical CI</b> (à valider avec technicien) :",
        body_style))
    data = [
        ["Additif", "Dosage", "Phases", "Rôle"],
        ["Mycofix", "1-2 kg/tonne", "Toutes", "Anti-aflatoxines maïs CI"],
        ["Phytase", "0,1 kg/tonne", "Si son de riz", "Libère phosphore phytique"],
        ["Sel NaCl", "3-5 kg/tonne", "Toutes", "Équilibre électrolytique"],
        ["Phosphate bicalcique", "5-10 kg/tonne", "Gestation + Lactation", "Ca/P ossification"],
    ]
    t = Table(data, colWidths=[4 * cm, 3 * cm, 4 * cm, 6 * cm])
    t.setStyle(table_header_style(GRAY_700))
    story.append(t)

    story.append(Spacer(1, 14))

    # Rations journalières par catégorie
    story.append(Paragraph("Rations journalières de référence", h1_style))
    data = [
        ["Catégorie", "Phase", "Ration/j/sujet", "Repas/j"],
        ["Porcelets sous mère", "J0-J21", "Ad libitum (Romelko RED)", "—"],
        ["Porcelets Démarrage 1", "J21-J42 · 7-15 kg", "0,30 → 0,80 kg", "4"],
        ["Porcelets Démarrage 2", "J42-J63 · 15-25 kg", "0,80 → 1,20 kg", "3"],
        ["Porcs Croissance", "J63-J93 · 25-50 kg", "1,50 → 2,20 kg", "2"],
        ["Porcs Finition", "J93-J183 · 50-100 kg", "2,20 → 3,00 kg", "2"],
        ["Truies gestantes", "115 jours", "2,5 kg", "2"],
        ["Truies allaitantes", "21 jours pic", "5 kg (montée progressive 2→5 kg en 7 j)", "3"],
        ["Verrats entretien", "—", "2,5 kg", "2"],
    ]
    t = Table(data, colWidths=[4 * cm, 4 * cm, 5 * cm, 2 * cm])
    t.setStyle(table_header_style(ACCENT))
    story.append(t)

    story.append(Spacer(1, 14))

    # Note méthionine
    story.append(Paragraph("Note sur la méthionine", h1_style))
    story.append(Paragraph(
        "Le technicien a inclus la méthionine <b>uniquement en Démarrage 1</b>. "
        "Raison probable : l&#39;action combinée des enzymes et du concentré KPC 5 améliore "
        "l&#39;assimilation des acides aminés soufrés naturellement présents. "
        "Si un déficit de croissance est observé (GMQ < 80% de la cible), évaluer "
        "l&#39;ajout de 0,3-0,5 kg DL-Méthionine / tonne en Croissance.",
        body_style))

    # Surveillance GMQ
    story.append(Spacer(1, 8))
    story.append(Paragraph("Objectifs GMQ à atteindre", h1_style))
    data = [
        ["Phase", "GMQ cible", "IC cible", "Poids sortie"],
        ["Post-sevrage Démarrage 1", "350-450 g/j", "1,6-1,8", "15 kg à J42"],
        ["Post-sevrage Démarrage 2", "450-500 g/j", "1,6-1,8", "25 kg à J63"],
        ["Croissance", "600-750 g/j", "2,5-2,8", "50 kg à J93"],
        ["Finition", "700-850 g/j", "2,8-3,2", "100 kg à J183"],
    ]
    t = Table(data, colWidths=[5 * cm, 4 * cm, 3 * cm, 4 * cm])
    t.setStyle(table_header_style(BLUE))
    story.append(t)

    story.append(Spacer(1, 16))
    story.append(Paragraph(
        "<b>Objectif global ferme K13</b> : atteindre <b>100 kg en 22 semaines (150-183 jours)</b>. "
        "L&#39;app PorcTrack suit automatiquement le GMQ de chaque bande via les pesées "
        "hebdomadaires (module Croissance).",
        body_style))

    # Signature
    story.append(Spacer(1, 20))
    story.append(Paragraph(
        "<i>Fiche générée à partir du document de formulation validé par le technicien "
        "d&#39;élevage accompagnant la ferme K13 · Avril 2026. À réviser si changement "
        "de fournisseur ou évolution du programme.</i>",
        small_style))

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(f"PDF généré : {OUTPUT}")


if __name__ == "__main__":
    build()
