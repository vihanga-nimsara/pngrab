import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../public/fonts');
mkdirSync(outDir, { recursive: true });

const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const res = await fetch(CSS_URL, { headers: { 'User-Agent': UA } });
const css = await res.text();

const regex = /@font-face\s*{([^}]*)}/g;
const seen = new Set();
let outCss = '';
let m;

while ((m = regex.exec(css))) {
  const body = m[1];
  const range = /unicode-range:\s*([^;]+);/.exec(body)?.[1] || '';
  if (!range.includes('U+0000') && !range.includes('latin-ext')) continue;

  const family = /font-family:\s*'([^']+)'/.exec(body)?.[1];
  const weight = /font-weight:\s*(\d+)/.exec(body)?.[1];
  const srcMatch = /url\((https:\/\/[^)]+)\)\s*format\('woff2'\)/.exec(body);
  if (!family || !weight || !srcMatch) continue;

  const subset = range.includes('U+0000') ? 'latin' : 'latin-ext';
  const file = `bricolage-${weight}-${subset}.woff2`;
  if (seen.has(file)) continue;
  seen.add(file);

  const data = Buffer.from(await (await fetch(srcMatch[1])).arrayBuffer());
  writeFileSync(resolve(outDir, file), data);
  outCss += `@font-face { ${body.replace(srcMatch[1], file)} }\n`;
}

writeFileSync(resolve(outDir, 'bricolage.css'), outCss);
console.log('Generated font files in', outDir, '->', [...seen].join(', '));