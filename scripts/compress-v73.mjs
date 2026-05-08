#!/usr/bin/env node
/**
 * Compresse les 13 images V73 en JPG optimisé + variantes WebP.
 * Source : public/images/v73/**.jpg (originaux ~7-11MB)
 * Cible :  remplacement in-place + génération .webp à côté.
 */
import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';

const ROOT = new URL('../public/images/v73/', import.meta.url).pathname;

// Spec par fichier : { maxWidth, quality, alsoWebp, alsoIcons }
const SPEC = {
  'icons/app-icon-1024.jpg':         { maxWidth: 1024, quality: 90, alsoWebp: true,  alsoIcons: true  },
  'landing/splash.jpg':              { maxWidth: 1280, quality: 82, alsoWebp: true  },
  'landing/hero-wide.jpg':           { maxWidth: 2400, quality: 82, alsoWebp: true  },
  'landing/reproduction.jpg':        { maxWidth: 1920, quality: 80, alsoWebp: true  },
  'landing/alertes.jpg':             { maxWidth: 1920, quality: 80, alsoWebp: true  },
  'landing/alimentation.jpg':        { maxWidth: 1920, quality: 80, alsoWebp: true  },
  'avatars/truie.jpg':               { maxWidth: 512,  quality: 82, alsoWebp: true  },
  'avatars/verrat.jpg':              { maxWidth: 512,  quality: 82, alsoWebp: true  },
  'avatars/porcelet.jpg':            { maxWidth: 512,  quality: 82, alsoWebp: true  },
  'empty-states/aucun-animal.jpg':   { maxWidth: 1600, quality: 78, alsoWebp: true  },
  'empty-states/aucune-alerte.jpg':  { maxWidth: 1600, quality: 78, alsoWebp: true  },
  'og/og-share-1200x630.jpg':        { maxWidth: 1200, quality: 85, alsoWebp: false },
  'marius/orb-emeraude.jpg':         { maxWidth: 768,  quality: 82, alsoWebp: true  },
};

async function fileSizeKB(path) {
  const s = await stat(path);
  return Math.round(s.size / 1024);
}

async function process(rel, spec) {
  const abs = join(ROOT, rel);
  const tmp = abs + '.tmp.jpg';
  const before = await fileSizeKB(abs);

  // 1) Recompresser en JPG (in-place)
  await sharp(abs, { failOn: 'none' })
    .rotate()
    .resize({
      width: spec.maxWidth,
      withoutEnlargement: true,
      fit: 'inside',
    })
    .jpeg({ quality: spec.quality, mozjpeg: true, progressive: true })
    .toFile(tmp);

  await import('node:fs/promises').then((m) => m.rename(tmp, abs));
  const after = await fileSizeKB(abs);

  let webp = '';
  if (spec.alsoWebp) {
    const webpPath = abs.replace(/\.jpg$/, '.webp');
    await sharp(abs)
      .webp({ quality: Math.min(85, spec.quality + 5), effort: 5 })
      .toFile(webpPath);
    const wkb = await fileSizeKB(webpPath);
    webp = ` · webp ${wkb}KB`;
  }

  let icons = '';
  if (spec.alsoIcons) {
    // Génère 192x192 et 512x512 maskable PNG depuis l'app-icon
    const icon192 = join(ROOT, 'icons/app-icon-192.png');
    const icon512 = join(ROOT, 'icons/app-icon-512.png');
    const iconMaskable = join(ROOT, 'icons/app-icon-maskable-512.png');
    await sharp(abs).resize(192, 192).png().toFile(icon192);
    await sharp(abs).resize(512, 512).png().toFile(icon512);
    // Maskable : la safe zone est le centre 80%, on garde l'icône telle quelle
    // car l'image source a déjà un fond carré vert plein.
    await sharp(abs).resize(512, 512).png().toFile(iconMaskable);
    icons = ` · icons 192/512/maskable`;
  }

  console.log(`  ${rel.padEnd(40)} ${before}KB → ${after}KB${webp}${icons}`);
}

console.log('=== Compression V73 (sharp + mozjpeg) ===');
let total = 0;
for (const [rel, spec] of Object.entries(SPEC)) {
  await process(rel, spec);
}

// Récap taille totale
async function dirSizeKB(dir) {
  let s = 0;
  for (const f of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) s += await dirSizeKB(p);
    else s += (await stat(p)).size;
  }
  return Math.round(s / 1024);
}
const totalKB = await dirSizeKB(ROOT);
console.log(`\n=== Total v73/: ${totalKB} KB (${(totalKB / 1024).toFixed(1)} MB) ===`);
