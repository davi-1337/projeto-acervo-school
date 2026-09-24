// tools/manifest.mjs — recompõe assets/source/manifest.json e escreve assets/LICENSES.md
// a partir dos metadados reais do Wikimedia Commons. Build-time apenas.
//   node tools/manifest.mjs
import { readFile, writeFile } from 'node:fs/promises';

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'O-Acervo/1.0 (obra interativa; contato: local)';
const chosen = JSON.parse(await readFile('tools/chosen.json', 'utf8'));

const strip = (s) => (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

async function info(title) {
  const url = API + '?' + new URLSearchParams({
    action: 'query', format: 'json', titles: title,
    prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: '2000',
  });
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (res.status === 429) { await new Promise((r) => setTimeout(r, 4000 * (i + 1))); continue; }
      const json = await res.json();
      const page = Object.values(json?.query?.pages || {})[0];
      const meta = page?.imageinfo?.[0]?.extmetadata || {};
      return {
        titulo: strip(meta.ObjectName?.value) || title.replace(/^File:/, '').replace(/\.jpg$/i, ''),
        autor: strip(meta.Artist?.value) || 'autor desconhecido',
        ano: strip(meta.DateTimeOriginal?.value) || '',
        licenca: strip(meta.LicenseShortName?.value) || '?',
        credito: strip(meta.Credit?.value),
        pagina: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
      };
    } catch (e) {
      await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
    }
  }
  return null;
}

const out = {};
for (const [slug, title] of Object.entries(chosen)) {
  const meta = await info(title);
  out[slug] = meta || { titulo: title, autor: '?', ano: '', licenca: '?', pagina: '' };
  console.log(`${slug.padEnd(20)} ${out[slug].licenca.padEnd(22)} ${out[slug].autor.slice(0, 46)}`);
  await new Promise((r) => setTimeout(r, 1400));
}

await writeFile('assets/source/manifest.json', JSON.stringify(out, null, 2));

let md = `# Licenças das imagens e das fontes

Todas as gravuras desta obra vêm de acervos de **domínio público** ou de licenças
abertas, e foram **reprocessadas** (escala de cinza, níveis, tinta, papel, dithering
ordenado) para integrar a peça. Cada arquivo em \`assets/source/\` corresponde a uma
linha abaixo. As versões usadas na obra têm no máximo 1100 px no lado maior,
reduzidas a partir dos originais.

| arquivo | obra | autor | licença | fonte |
|---|---|---|---|---|
`;
for (const [slug, m] of Object.entries(out)) {
  md += `| \`${slug}.jpg\` | ${m.titulo} | ${m.autor} | ${m.licenca} | [Commons](${m.pagina}) |\n`;
}

md += `

## Fontes tipográficas

| família | uso na obra | licença |
|---|---|---|
| **Cormorant Garamond** (300, 600, 300 itálico) | títulos, voz, legendas | SIL Open Font License 1.1 |
| **JetBrains Mono** (200, 400, 700) | visor, fichas técnicas, etiquetas | SIL Open Font License 1.1 |

Baixadas de \`fonts.googleapis.com\` e servidas localmente em \`assets/fonts/\`
(com \`assets/fonts/fonts.css\` gerado por \`tools/fetch-fonts.mjs\`). A SIL OFL permite
uso, estudo, modificação e redistribuição, inclusive embutida em obras.

## Como este material foi obtido

\`\`\`bash
node tools/fetch-assets.mjs search     # lista candidatos por consulta
node tools/fetch-assets.mjs download   # baixa os escolhidos para assets/source/
node tools/fetch-fonts.mjs             # baixa as duas famílias e gera o CSS local
node tools/manifest.mjs                # recompõe este arquivo a partir do Commons
\`\`\`

O restante da obra — texto, som, imagem em movimento, interface — é autoral e não
depende de nenhum arquivo de terceiros.
`;
await writeFile('assets/LICENSES.md', md);
console.log('\nescrito assets/LICENSES.md');
