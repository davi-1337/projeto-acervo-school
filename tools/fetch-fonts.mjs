// tools/fetch-fonts.mjs — baixa as fontes (SIL Open Font License) usadas pela obra.
// Gera assets/fonts/*.woff2 e assets/fonts/fonts.css (com @font-face local).
//   node tools/fetch-fonts.mjs
import { writeFile, mkdir } from 'node:fs/promises';

const FAMILIES = [
  'Cormorant+Garamond:ital,wght@0,300;0,600;1,300',
  'JetBrains+Mono:wght@200;400;700',
];
const SUBSETS = new Set(['latin', 'latin-ext']);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

await mkdir('assets/fonts', { recursive: true });

let css = '';
const faces = [];
for (const fam of FAMILIES) {
  const url = `https://fonts.googleapis.com/css2?family=${fam}&display=swap`;
  const text = await fetch(url, { headers: { 'User-Agent': UA } }).then((r) => r.text());
  // Blocos do Google vêm precedidos por /* subset */.
  const blocks = text.split(/\/\*\s*([a-z0-9-]+)\s*\*\//).slice(1);
  for (let i = 0; i < blocks.length; i += 2) {
    const subset = blocks[i];
    const body = blocks[i + 1];
    if (!SUBSETS.has(subset)) continue;
    const face = /@font-face\s*\{([\s\S]*?)\}/.exec(body)?.[1];
    if (!face) continue;
    const get = (k) => new RegExp(`${k}:\\s*([^;]+);`).exec(face)?.[1]?.trim();
    const src = /url\((https:[^)]+\.woff2)\)/.exec(face)?.[1];
    if (!src) continue;
    const family = get('font-family').replace(/['"]/g, '');
    const weight = get('font-weight') || '400';
    const style = get('font-style') || 'normal';
    const file = `${family.replace(/\s+/g, '-').toLowerCase()}-${weight}${style === 'italic' ? '-italic' : ''}-${subset}.woff2`;
    const buf = Buffer.from(await fetch(src, { headers: { 'User-Agent': UA } }).then((r) => r.arrayBuffer()));
    await writeFile(`assets/fonts/${file}`, buf);
    faces.push({ family, weight, style, subset, file, unicodeRange: get('unicode-range'), bytes: buf.length });
    console.log(`ok ${file.padEnd(46)} ${(buf.length / 1024).toFixed(1)}kB`);
  }
}

css = '/* gerado por tools/fetch-fonts.mjs — Cormorant Garamond e JetBrains Mono, SIL OFL 1.1 */\n';
for (const f of faces) {
  css += `@font-face{font-family:"${f.family}";font-style:${f.style};font-weight:${f.weight};font-display:block;`;
  css += `src:url("./${f.file}") format("woff2");`;
  if (f.unicodeRange) css += `unicode-range:${f.unicodeRange};`;
  css += '}\n';
}
await writeFile('assets/fonts/fonts.css', css);
await writeFile('assets/fonts/manifest.json', JSON.stringify(faces, null, 2));
console.log(`\n${faces.length} arquivos, css local escrito`);
