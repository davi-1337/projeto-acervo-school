/* O ACERVO — js/core/text.js
   A linguagem da obra falha de propósito: o texto é digitado, corrompe-se
   enquanto é lido e troca de palavras por sinônimos que nunca significam o mesmo. */
(function (A) {
  'use strict';
  var U = A.util;

  var GLYPHS = '¤§Ø×¿!¦†‡¶∆◊#%@*+=~¬░▒▓█▚▞╳⌁⌾⟁⟟·:`\'"|/\\'.split('');

  var GLITCH_MAP = {
    a: 'áàâãä4@', e: 'éèêë3€', i: 'íìîï1|', o: 'óòôõö0ø', u: 'úùûüµ',
    c: 'ç(', s: '5$§', n: 'ññ', t: '†+', l: '1|', m: 'mм', r: 'řг', g: '9', b: 'ß'
  };

  /* Troca de sinônimos: a legenda muda de sentido conforme você insiste. */
  var SYNONYMS = {
    casa: ['moradia', 'abrigo', 'construção', 'corpo'],
    rosto: ['face', 'semblante', 'máscara', 'fachada'],
    vazio: ['oco', 'silêncio', 'ausência', 'intervalo'],
    espera: ['pausa', 'demora', 'vigília', 'resto'],
    corpo: ['invólucro', 'carne', 'mecanismo', 'peso'],
    noite: ['escuro', 'intervalo', 'fora', 'depois'],
    porta: ['passagem', 'lacuna', 'fenda', 'promessa'],
    olho: ['lente', 'vigia', 'órgão', 'buraco'],
    mão: ['garra', 'apêndice', 'ferramenta', 'peso'],
    medo: ['susto', 'pressentimento', 'cálculo', 'frio'],
    tempo: ['duração', 'atraso', 'sobra', 'dívida'],
    nome: ['rótulo', 'etiqueta', 'mancha', 'mentira'],
    agua: ['mar', 'dissolução', 'espelho', 'fundo'],
    luz: ['clarão', 'lâmpada', 'vigília', 'aviso'],
    morte: ['término', 'intervalo', 'arquivo', 'corte'],
    nada: ['nada', 'nada', 'nada', 'tudo']
  };

  /* Corrompe uma palavra: a substituição cresce com a insistência (fase 0..1),
     mas nunca além do ponto em que a palavra deixa de ser legível. */
  function mutate(word, phase, rnd) {
    rnd = rnd || Math.random;
    phase = Math.min(phase, 0.42);
    if (!word) return word;
    var lower = word.toLowerCase().replace(/[^\wáàâãéêíóôõúüçñ]/g, '');
    if (SYNONYMS[lower] && phase > 0.45 && rnd() < 0.5) {
      var alt = SYNONYMS[lower][(rnd() * SYNONYMS[lower].length) | 0];
      var keepCase = word[0] === word[0].toUpperCase();
      var out = keepCase ? alt.charAt(0).toUpperCase() + alt.slice(1) : alt;
      return word.replace(new RegExp(lower, 'i'), out);
    }
    if (phase < 0.18) return word;
    var chars = word.split('');
    for (var i = 0; i < chars.length; i++) {
      if (rnd() > phase * 0.42) continue;
      var c = chars[i], low = c.toLowerCase();
      if (GLITCH_MAP[low] && rnd() < 0.7) {
        var pool = GLITCH_MAP[low];
        chars[i] = pool[(rnd() * pool.length) | 0];
      } else if (rnd() < phase * 0.3) {
        chars[i] = GLYPHS[(rnd() * GLYPHS.length) | 0];
      }
    }
    return chars.join('');
  }

  function scramble(str, amount, rnd) {
    rnd = rnd || Math.random;
    var out = '';
    for (var i = 0; i < str.length; i++) {
      var c = str[i];
      if (c === ' ' || c === '\n' || rnd() > amount) { out += c; continue; }
      out += GLYPHS[(rnd() * GLYPHS.length) | 0];
    }
    return out;
  }

  /* Escrita com decaimento: cada caractere chega deformado e se acomoda. */
  function typeText(node, str, opts) {
    opts = opts || {};
    var speed = opts.speed || 26;
    var jitter = opts.jitter == null ? 0.6 : opts.jitter;
    var glitch = opts.glitch == null ? 0.35 : opts.glitch;
    var token = opts.token || {};
    var onChar = opts.onChar;
    var i = 0;
    node.textContent = '';
    node.classList.add('typing');
    return new Promise(function (resolve) {
      function step() {
        if (token.cancelled) { node.classList.remove('typing'); resolve(false); return; }
        if (i >= str.length) { node.classList.remove('typing'); resolve(true); return; }
        var c = str.charAt(i);
        if (c === '\n') { node.appendChild(document.createElement('br')); i++; return setTimeout(step, speed * 6); }
        var span = document.createElement('span');
        span.textContent = glitch > 0 && Math.random() < glitch ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : c;
        if (span.textContent !== c) {
          setTimeout(function () { span.textContent = c; span.className = 'settled'; }, 60 + Math.random() * 240);
        }
        node.appendChild(span);
        if (onChar) onChar(i, c);
        i++;
        var pause = speed * (1 + (Math.random() - 0.5) * 2 * jitter);
        if (c === '.' || c === '?') pause += speed * (opts.ponder == null ? 6 : opts.ponder);
        if (c === ',') pause += speed * 2.5;
        if (opts.instant) { while (i < str.length) { node.appendChild(document.createTextNode(str.charAt(i))); i++; } node.classList.remove('typing'); resolve(true); return; }
        setTimeout(step, pause);
      }
      step();
    });
  }

  /* Fila por nó: mensagens sucessivas no mesmo lugar esperam a vez em vez de
     se escreverem umas por cima das outras. */
  function queueInto(node, str, opts) {
    var chain = node.__chain || Promise.resolve();
    var p = chain.then(function () { return typeText(node, str, opts); });
    node.__chain = p.catch(function () { });
    return p;
  }

  /* Efeito de desintegração contínua sobre um nó já escrito. */
  function decayNode(node, strength) {
    var original = node.dataset.raw || node.textContent;
    node.dataset.raw = original;
    var out = '';
    for (var i = 0; i < original.length; i++) {
      var c = original[i];
      if (c === '\n' || c === ' ') { out += c; continue; }
      out += Math.random() < strength * 0.25 ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : c;
    }
    node.textContent = out;
  }

  /* Frases curtas da entidade. Nunca explicam: só constatam. */
  var VOICE = {
    idle: ['eu ainda estou aqui.', 'você parou.', 'não há pressa. há tempo.', 'eu não sei o que fazer com você.',
      'continua.', 'o acervo não fecha.', 'você é a parte úmida da parede.']
  };

  A.text = {
    typeText: typeText, queueInto: queueInto, mutate: mutate, scramble: scramble, decayNode: decayNode, VOICE: VOICE,
    glyph: function (rnd) { return GLYPHS[((rnd ? rnd() : Math.random()) * GLYPHS.length) | 0]; },
    /* Aplica corrupção progressiva a um conjunto de nós de legenda. */
    wear: function (nodes, phase, rnd) {
      nodes.forEach(function (n) {
        var raw = n.dataset.raw || n.textContent;
        n.dataset.raw = raw;
        n.textContent = raw.split(/(\s+)/).map(function (w) {
          return /\s/.test(w) ? w : A.text.mutate(w, phase, rnd);
        }).join('');
      });
    }
  };
})(window.ACERVO = window.ACERVO || {});
