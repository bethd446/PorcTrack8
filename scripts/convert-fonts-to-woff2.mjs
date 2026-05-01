import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import wawoff2 from 'wawoff2';

const fontsDir = new URL('../public/fonts/', import.meta.url).pathname;
const ttfFiles = readdirSync(fontsDir).filter((f) => f.endsWith('.ttf'));

console.log(`Converting ${ttfFiles.length} TTF files in ${fontsDir}`);

for (const file of ttfFiles) {
  const ttfPath = join(fontsDir, file);
  const woff2Path = ttfPath.replace(/\.ttf$/, '.woff2');
  const ttfBuffer = readFileSync(ttfPath);
  const woff2Buffer = await wawoff2.compress(ttfBuffer);
  writeFileSync(woff2Path, woff2Buffer);
  const ttfSize = statSync(ttfPath).size;
  const woff2Size = statSync(woff2Path).size;
  const saved = (((ttfSize - woff2Size) / ttfSize) * 100).toFixed(1);
  console.log(`  ${file}: ${ttfSize} -> ${woff2Size} bytes (-${saved}%)`);
}

console.log('Done.');
