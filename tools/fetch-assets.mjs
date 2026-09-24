// tools/fetch-assets.mjs — coleta de matéria-prima em domínio público (Wikimedia Commons).
// Build-time apenas. Não faz parte da experiência.
//   node tools/fetch-assets.mjs search        -> lista candidatos por consulta
//   node tools/fetch-assets.mjs download      -> baixa os ESCOLHIDOS para assets/source/
import { writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'O-Acervo/1.0 (arte interativa; contato: local) node-fetch';

// Consultas de busca: cada peça é matéria-prima de uma sala.
const QUERIES = {
  piranesi: 'Piranesi Carceri d\'invenzione etching',
  goya_dog: 'Perro semihundido Goya',
  goya_sleep: 'El sueño de la razon produce monstruos Goya',
  dore_void: 'Gustave Doré Paradise Lost engraving darkness',
  redon_eye: 'Odilon Redon eye like a strange balloon',
  friedrich_monk: 'Caspar David Friedrich Mönch am Meer',
  bosch_hell: 'Jardin des délices enfer Bosch hell panel',
  vesalius: 'Vesalius De humani corporis fabrica muscle man plate',
  durero_melancolia: 'Dürer Melencolia I',
  atget_room: 'Eugène Atget interior room photograph',
  anatomy_hand: 'anatomical drawing hand muscles engraving 18th century',
  skull: 'memento mori skull engraving vanitas',
};

const CHOSEN = JSON.parse(
  existsSync('tools/chosen.json') ? await (await import('node:fs/promises')).readFile('tools/chosen.json', 'utf8') : '{}'
);

async function api(params) {
  const url = API + '?' + new URLSearchParams({ format: 'json', origin: '*', ...params });
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
}

async function search(query, limit = 5) {
  const data = await api({
    action: 'query',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: '6',
    gsrlimit: String(limit),
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '2000',
  });
  const pages = Object.values(data?.query?.pages || {});
  return pages.map((p) => {
    const info = p.imageinfo?.[0] || {};
    const meta = info.extmetadata || {};
    return {
      title: p.title,
      w: info.width,
      h: info.height,
      license: meta.LicenseShortName?.value || '?',
      artist: (meta.Artist?.value || '').replace(/<[^>]*>/g, '').slice(0, 60),
      thumb: info.thumburl,
    };
  }).filter((c) => c.thumb && c.w >= 900);
}

async function download(slug, title) {
  const data = await api({
    action: 'query',
    titles: title,
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata',
    iiurlwidth: '2000',
  });
  const page = Object.values(data?.query?.pages || {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) throw new Error('sem imageinfo: ' + title);
  const meta = info.extmetadata || {};
  const target = `assets/source/${slug}.jpg`;
  if (existsSync(target) && (await stat(target)).size > 20000) {
    return { slug, file: target, title, license: 'já existia', credit: '', source: '', bytes: (await stat(target)).size };
  }
  let buf = null;
  for (let attempt = 0; attempt < 6 && !buf; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 2500 * attempt));
    const res = await fetch(info.thumburl, { headers: { 'User-Agent': UA, Referer: 'https://commons.wikimedia.org/' } });
    if (!res.ok) {
      console.log(`  ...${slug}: HTTP ${res.status}, tentativa ${attempt + 1}`);
      continue;
    }
    buf = Buffer.from(await res.arrayBuffer());
  }
  if (!buf) throw new Error('download falhou após tentativas');
  await writeFile(target, buf);
  return {
    slug,
    file: target,
    title,
    license: meta.LicenseShortName?.value || '?',
    credit: (meta.Artist?.value || 'desconhecido').replace(/<[^>]*>/g, '').trim().slice(0, 120),
    source: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    bytes: buf.length,
  };
}

const mode = process.argv[2] || 'search';
await mkdir('assets/source', { recursive: true });

if (mode === 'search') {
  for (const [key, q] of Object.entries(QUERIES)) {
    const results = await search(q);
    console.log(`\n# ${key}  «${q}»`);
    results.forEach((r, i) => console.log(`  [${i}] ${r.title} — ${r.w}x${r.h} — ${r.license} — ${r.artist}`));
  }
} else {
  const records = [];
  for (const [slug, title] of Object.entries(CHOSEN)) {
    try {
      const rec = await download(slug, title);
      records.push(rec);
      console.log(`ok ${slug.padEnd(20)} ${(rec.bytes / 1024).toFixed(0)}kB  ${rec.license}  ${rec.title}`);
    } catch (err) {
      console.log(`FALHOU ${slug}: ${err.message}`);
    }
  }
  await writeFile('assets/source/manifest.json', JSON.stringify(records, null, 2));
  console.log(`\n${records.length}/${Object.keys(CHOSEN).length} baixadas`);
}
