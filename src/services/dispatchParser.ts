/**
 * PorcTrack — Moteur de Parsing Dispatch
 * ════════════════════════════════════════════════════════
 * Interprète les emails terrain envoyés depuis le champ.
 *
 * FORMAT D'UN EMAIL DISPATCH :
 * ─────────────────────────────
 * Sujet  : [DISPATCH] <identifiant> <action courte>
 * Corps  : détails libres en français
 * PJ     : photo optionnelle
 *
 * EXEMPLES DE SUJETS RECONNUS :
 * ─────────────────────────────
 * [DISPATCH] T07 mise-bas 11 porcelets
 * [DISPATCH] T02 sevrage 8 porcelets
 * [DISPATCH] T05 soin amoxicilline
 * [DISPATCH] T13 observation boiterie gauche
 * [DISPATCH] V01 saillie T04 T08
 * [DISPATCH] BANDE-2026-04 mort 2 porcelets
 * [DISPATCH] STOCK aliment maïs 500kg
 * [DISPATCH] NOTE général
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type DispatchType =
  | 'MISE_BAS'
  | 'SEVRAGE'
  | 'SOIN'
  | 'OBSERVATION'
  | 'SAILLIE'
  | 'MORT'
  | 'STOCK'
  | 'NOTE'
  | 'UNKNOWN';

export interface ParsedDispatch {
  type:       DispatchType;
  subjectId:  string;           // T07, V01, BANDE-2026-04, STOCK, etc.
  subjectType:'TRUIE' | 'VERRAT' | 'BANDE' | 'STOCK' | 'GLOBAL';
  rawSubject: string;
  rawBody:    string;
  numbers:    number[];         // tous les nombres extraits
  keywords:   string[];         // mots clés détectés
  /** Action Sheets prête à exécuter (si parseable) */
  sheetAction?: {
    sheet:   string;
    idHeader:string;
    idValue: string;
    patch:   Record<string, string | number>;
  };
  appendAction?: {
    sheet:  string;
    values: string[];
  };
}

// ── Patterns ─────────────────────────────────────────────────────────────────

const DISPATCH_PREFIX = /^\[DISPATCH\]/i;

const PATTERNS: Array<{
  keywords: RegExp;
  type: DispatchType;
}> = [
  { keywords: /mise[\s-]?bas|parturition|portée|parto/i,     type: 'MISE_BAS' },
  { keywords: /sevrage|sevré|destete/i,                       type: 'SEVRAGE'  },
  { keywords: /soin|traitement|veto|injection|vaccin|molécule|molécule/i, type: 'SOIN' },
  { keywords: /mort|décès|crevé|crevée|dead/i,                type: 'MORT'     },
  { keywords: /saillie|saillir|insémination|monte|chaleur/i,  type: 'SAILLIE'  },
  { keywords: /stock|aliment|farine|mais|soja|veto|médicament/i, type: 'STOCK' },
  { keywords: /observation|obs|remarque|boiterie|malade/i,    type: 'OBSERVATION'},
  { keywords: /note|journal|info|message/i,                   type: 'NOTE'     },
];

function detectSubjectType(id: string): ParsedDispatch['subjectType'] {
  if (/^T\d+/i.test(id))    return 'TRUIE';
  if (/^V\d+/i.test(id))    return 'VERRAT';
  if (/^BANDE/i.test(id))   return 'BANDE';
  if (/^STOCK/i.test(id))   return 'STOCK';
  return 'GLOBAL';
}

// ── Parseur principal ─────────────────────────────────────────────────────────

export function parseDispatchEmail(subject: string, body: string): ParsedDispatch {
  const fullText = `${subject} ${body}`;
  const numbers  = (fullText.match(/\d+[.,]?\d*/g) ?? []).map(n => parseFloat(n.replace(',', '.')));

  // Détection du type
  let type: DispatchType = 'UNKNOWN';
  const keywords: string[] = [];
  for (const p of PATTERNS) {
    const match = fullText.match(p.keywords);
    if (match) { type = p.type; keywords.push(match[0]); }
  }
  if (type === 'UNKNOWN' && !DISPATCH_PREFIX.test(subject)) {
    return { type: 'UNKNOWN', subjectId: '', subjectType: 'GLOBAL', rawSubject: subject, rawBody: body, numbers, keywords };
  }

  // Extraction de l'identifiant animal/bande
  const idMatch = subject.match(/\b(T\d{1,3}|V\d{1,3}|BANDE[-\w]+|STOCK|NOTE)\b/i);
  const subjectId   = idMatch ? idMatch[0].toUpperCase() : 'GLOBAL';
  const subjectType = detectSubjectType(subjectId);

  const base: ParsedDispatch = { type, subjectId, subjectType, rawSubject: subject, rawBody: body, numbers, keywords };

  // Génération de l'action Sheets
  const today = new Date().toLocaleDateString('fr-FR');
  const author = 'Dispatch';

  switch (type) {

    case 'MISE_BAS': {
      const nv    = numbers[0] ?? 0;
      const morts = numbers[1] ?? 0;
      base.sheetAction = {
        sheet: 'SUIVI_TRUIES_REPRODUCTION', idHeader: 'ID', idValue: subjectId,
        patch: { STATUT: 'Lactation', DATE_DERNIERE_MB: today },
      };
      base.appendAction = {
        sheet: 'PORCELETS_BANDES_DETAIL',
        values: [
          `BANDE-${today.replace(/\//g,'-')}-${subjectId}`,
          subjectId, '', today,
          String(nv), String(morts), String(nv - morts),
          'En cours', '', '', '',
          `Dispatch: ${body.slice(0, 100)}`,
        ],
      };
      break;
    }

    case 'SEVRAGE': {
      const nbSevres = numbers[0] ?? 0;
      base.sheetAction = {
        sheet: 'SUIVI_TRUIES_REPRODUCTION', idHeader: 'ID', idValue: subjectId,
        patch: { STATUT: 'Vide', DATE_MB_PREVUE: '' },
      };
      base.appendAction = {
        sheet: 'NOTES_TERRAIN',
        values: [ new Date().toISOString(), 'TRUIE', subjectId,
          `Sevrage confirmé Dispatch — ${nbSevres} porcelets — ${body.slice(0,80)}`, author ],
      };
      break;
    }

    case 'SOIN': {
      const produit = body.match(/(?:amox|penicil|oxytocin|ferro|vitamine|vaccin)[\w]*/i)?.[0] ?? keywords[0] ?? 'Non précisé';
      base.appendAction = {
        sheet: 'JOURNAL_SANTE',
        values: [ new Date().toISOString(), subjectType, subjectId,
          'Traitement', produit, body.slice(0, 120), author ],
      };
      break;
    }

    case 'MORT': {
      const nb = numbers[0] ?? 1;
      base.appendAction = {
        sheet: 'JOURNAL_SANTE',
        values: [ new Date().toISOString(), subjectType, subjectId,
          'Mortalité', `${nb} mort(s)`, body.slice(0, 120), author ],
      };
      if (subjectType === 'TRUIE') {
        base.sheetAction = {
          sheet: 'SUIVI_TRUIES_REPRODUCTION', idHeader: 'ID', idValue: subjectId,
          patch: { STATUT: 'Morte' },
        };
      }
      break;
    }

    case 'SAILLIE': {
      const mbPrevue = addDays(new Date(), 115).toLocaleDateString('fr-FR');
      base.sheetAction = {
        sheet: 'SUIVI_TRUIES_REPRODUCTION', idHeader: 'ID', idValue: subjectId,
        patch: { STATUT: 'Gestation', DATE_SAILLIE: today, DATE_MB_PREVUE: mbPrevue },
      };
      base.appendAction = {
        sheet: 'NOTES_TERRAIN',
        values: [ new Date().toISOString(), 'TRUIE', subjectId,
          `Saillie Dispatch — MB prévue ${mbPrevue} — ${body.slice(0,80)}`, author ],
      };
      break;
    }

    default: {
      // NOTE ou OBSERVATION → journal terrain uniquement
      base.appendAction = {
        sheet: 'NOTES_TERRAIN',
        values: [ new Date().toISOString(), subjectType, subjectId,
          `[${type}] ${body.slice(0, 200)}`, author ],
      };
    }
  }

  return base;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ── Formatage du rapport de dispatch ─────────────────────────────────────────

export function formatDispatchReport(parsed: ParsedDispatch): string {
  const lines: string[] = [
    `📍 Dispatch reçu — ${new Date().toLocaleString('fr-FR')}`,
    `Type     : ${parsed.type}`,
    `Sujet    : ${parsed.subjectId} (${parsed.subjectType})`,
  ];
  if (parsed.sheetAction) {
    const p = parsed.sheetAction;
    lines.push(`✏️  Mise à jour : ${p.sheet} [${p.idValue}]`);
    lines.push(`   Champs : ${JSON.stringify(p.patch)}`);
  }
  if (parsed.appendAction) {
    lines.push(`➕ Ajout ligne : ${parsed.appendAction.sheet}`);
  }
  if (parsed.type === 'UNKNOWN') {
    lines.push('⚠️  Format non reconnu — ignoré');
  }
  return lines.join('\n');
}
