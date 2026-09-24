# O ACERVO

**uma visita guiada por ninguém**

Obra audiovisual interativa feita só com HTML, CSS e JavaScript. Cinco salas, nenhuma
legenda correta, um coração que bate do começo ao fim. Não é um site: é uma peça
curta para ser atravessada — e a peça registra quem atravessou.

> você entra. a porta abre no compasso do coração. a arquitetura recua de quem olha.
> as legendas não correspondem. alguém repete o que você fez, com atraso.
> no fim, o museu pendura o que você deixou na parede — e guarda uma cópia.

---

## Como abrir

**Recomendado (qualidade total):** sirva a pasta e abra no navegador.

```bash
cd caminho/para/o/projeto
python3 -m http.server 8000
# abra http://localhost:8000
```

**Direto do disco:** dar duplo clique em `index.html` também funciona. O navegador
proíbe ler pixels de imagens vindas do disco, então a obra troca o tratamento de
gravura por uma versão compensada por filtros (`<html class="sem-pixels">`) e as
miniaturas do acervo usam os arquivos originais. Fica bom; com servidor fica melhor.

**Áudio:** essencial, e todo sintetizado em tempo real (Web Audio). Fones recomendados.
Clique em **ENTRAR** uma vez — é o gesto que libera o som no navegador.

---

## Duração

| ritmo | tempo |
|---|---|
| corrido, entendendo tudo de primeira | **≈ 1 min** |
| normal, com as fichas técnicas e as pausas | **≈ 2 min 30** |
| devagar, perdido em cada sala | **≈ 3 min 30** (teto) |

Cada sala traz o objetivo escrito na tela, em português, com o controle exato. Ninguém
fica preso: passados ~10 s sem progresso a sala insiste; passados 30–50 s ela **resolve
por você** — e isso é parte da obra, não uma falha.

---

## O que fazer (e onde está o estranho)

| sala | objetivo na tela | o que realmente acontece |
|---|---|---|
| **I · ÁTRIO** | abrir a porta | o círculo só fecha se você segurar o botão **no tempo da batida** |
| **II · ARQUITETURA** | atravessar a porta | a porta foge do ponteiro: só se aproxima de olhos fechados (**ESPAÇO**) |
| **III · LEGENDAS** | corrigir a parede | a legenda *sem objeto* pertence ao quadro vazio; ler demais corrompe o texto |
| **IV · ESPELHO** | encostar no seu duplo | o olho repete **o seu** traço com alguns segundos de atraso |
| **V · ACERVO** | apagar o que você deixou | a parede mostra sua ficha real: tempo, distância, hesitações |

**Controles:** ponteiro para olhar e desenhar · **clique e segure** (Átrio, Acervo) ·
**ESPAÇO** (Arquitetura) · clique-clique (Legendas) · digitar não é necessário.

---

## O que está por baixo

Nada de bibliotecas, nada de build, nada de imagem de enfeite.

- **Áudio 100% sintetizado** (`js/core/audio.js`): drone com dois osciladores quase
  iguais (batimento lento = desconforto físico), subgraves, respiração de sala por ruído
  marrom filtrado, coração com envelope de afinação, sinos FM, sussurros formânticos,
  risers, *tape stop*, silêncio longos e — quando existe — fala sintetizada em pt-BR.
- **Tratamento de gravura** (`js/core/texture.js`): escala de cinza, reforço de tinta por
  auto-*multiply*, gama, papel procedural, **níveis automáticos por percentil**,
  **dithering ordenado Bayer 8×8** em 5 níveis, vinheta interna e *bloom* pré-cozido.
- **Compositor de cena** (`js/core/field.js`): camadas de gravura com paralaxe, fatiadas
  em tiras e deslocadas por ruído + pressa da mão, aberração cromática, brilho, grão
  animado, rasgo de imagem, tremor e "fechar os olhos" (oclusão global).
- **O traço** (`js/core/trace.js`): o visitante escreve o tempo todo. Tinta clara, grossa
  onde a mão demora; o desenho é a obra pendurada na última sala.
- **Memória entre visitas**: o registro fica em `localStorage` — número de visitas, tempo
  acumulado e um JPEG pequeno do traço. Na segunda visita o museu **já conhece você**, a
  Sala do Espelho tem um duplo anterior, e a parede final mostra a visita passada.
- **Texto** (`js/core/text.js`): escrita com decaimento (cada caractere chega deformado e
  se acomoda), corrupção progressiva e troca de palavras por sinônimos — limitada a um
  teto em que a frase continua legível.
- **Sem enigma no controle**: o painel `OBJETIVO` (canto superior esquerdo) diz o que se
  espera e qual gesto usar; os enigmas ficam na obra, não na interface.

---

## Estrutura

```
index.html                 a obra inteira, em ordem de carregamento
css/core.css               tipografia, luz, sujeira (grão, linhas, vinheta, cursor)
css/objective.css          o painel de objetivo
css/acts.css               uma folha por sala
js/core/util.js            matemática, ruído, DOM, persistência
js/core/input.js           ponteiro, teclas, olhar, ociosidade, giroscópio
js/core/audio.js           motor de áudio sintetizado
js/core/trace.js           o traço do visitante e sua memória
js/core/texture.js         pipeline das gravuras (níveis, dithering, tinta)
js/core/field.js           compositor da cena e efeitos de imagem
js/core/text.js            tipografia animada e corrupção de texto
js/core/stage.js           máquina de salas, visor, dicas, ficha
js/data/acervo.js          todo o texto autoral e as fichas técnicas reais
js/acts/*.js               as cinco salas
js/boot.js                 portaria, carregamento, coração, desfecho
assets/source/             as 14 gravuras (domínio público / CC), 4,7 MB
assets/fonts/              Cormorant Garamond + JetBrains Mono (SIL OFL 1.1)
tools/                     scripts de coleta de material (não fazem parte da obra)
```

---

## Ferramentas de inspeção

A obra nasce com um painel de depuração, útil para quem quiser estudá-la:

- `?debug=1` — mostra sala atual, tempos, batidas e cliques no canto inferior esquerdo.
- `?ato=legendas` — abre direto em uma sala (`atrio`, `arquitetura`, `legendas`,
  `espelho`, `acervo`).
- No console: `ACERVO.debug.state()` (tempos por sala), `ACERVO.debug.jump('espelho')`,
  `ACERVO.audio.beats()`, `ACERVO.trace.snapshot()`.

Medição registrada de uma passagem corrida e completa (Chromium, 1600×950):
Átrio 13,4 s · Arquitetura 6,9 s · Legendas 6,9 s · Espelho 10,8 s · Acervo 36,7 s —
**74,8 s no total**, sem nenhum erro de página.

---

## Referências

A obra conversa com uma linhagem específica — arte de rede e jogos que não querem ser
jogos. As fontes abaixo foram consultadas durante a feitura:

- **Rhizome, *Net Art Anthology*** (exposição on-line que reconta a história da net art,
  1984–2016) — <https://anthology.rhizome.org/>. Dele vêm os parentescos diretos:
  *My Boyfriend Came Back From the War* (Olia Lialina, 1996), pelo texto quebrado como
  forma de angústia; *Neen* (2000), pelo colapso da linguagem; **JODI**, pela interface
  como superfície hostil; *Form Art* (Alexei Shulgin, 1997); *into time.com*
  (Rafaël Rozendaal, 2010), pela abstração mínima em página inteira.
- **Molleindustria**, *Every Day the Same Dream* — o cotidiano como ciclo fechado.
- **Pippin Barr** — obras em que a regra é clara e o sentido, não.
- **Kitty Horrorshow**, *ANATOMY* — a casa como corpo e a arquitetura como sintoma.
- Fonte iconográfica: **Wikimedia Commons**, **Met Museum Open Access**,
  **Wellcome Collection**, **Rijksmuseum** e **Getty Museum** (ver `assets/LICENSES.md`).

Os originais não aparecem crus em lugar nenhum: cada gravura é reprocessada em tinta,
papel, níveis e dithering — o acervo é feito do que ele saqueou.

---

## Acessibilidade e limites

- `prefers-reduced-motion` desliga grão e varredura.
- Nenhuma informação existe **só** em áudio: tudo o que importa está escrito na tela.
- O cursor do sistema é substituído por uma cruz; se você preferir o cursor normal,
  apague a regra `body { cursor: none; }` em `css/core.css`.
- Sem teclado, tudo funciona com ponteiro ou toque.

---

## Licenças

Código, texto e composição desta obra: de quem a escreveu. As imagens têm licenças
próprias e estão creditadas uma a uma em **`assets/LICENSES.md`** (domínio público na
maioria; duas figuras anatômicas em CC BY 4.0, atribuídas). Fontes sob SIL OFL 1.1.
