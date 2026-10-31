import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const woff = readFileSync(
  resolve(__dirname, '../public/fonts/bricolage-grotesque-latin.woff2')
);
const b64 = woff.toString('base64');

const css = `@font-face {
  font-family: 'Bricolage Grotesque';
  font-style: normal;
  font-weight: 200 800;
  font-display: swap;
  src: url(data:font/woff2;base64,${b64}) format('woff2');
}
`;

writeFileSync(resolve(__dirname, '../src/fonts.css'), css);
console.log('Generated src/fonts.css (' + css.length + ' bytes)');