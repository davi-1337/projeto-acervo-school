/* O ACERVO — js/boot.js
   Portaria da obra: carrega as gravuras, apresenta o pórtico, inicia o áudio
   no primeiro gesto e mantém o coração batendo — o contador que a última sala cobra. */
(function (A) {
  'use strict';
  var U = A.util, L = A.data.LINES;

  var NEAR = ['piranesi_torre', 'piranesi_arco', 'piranesi_poco', 'goya_cao', 'atget_sala', 'redon_olho'];
  var FAR = ['friedrich_monge', 'bosch_inferno', 'vesalius_figura', 'goya_sono', 'durer_melancolia', 'vanitas', 'agoty_anatomia', 'dore_caronte'];

  var last = 0, heartAcc = 0, heartInterval = 1.05, running = false;
  var palco, cena, ui, portico, fimEl, cursor;
  var traceLayer = null;

  function buildDom() {
    palco = document.getElementById('palco');
    cena = document.getElementById('cena');
    ui = document.getElementById('ui');
    portico = document.getElementById('portico');
    fimEl = document.getElementById('fim');
    cursor = document.querySelector('.cursor');

    traceLayer = document.createElement('canvas');
    traceLayer.className = 'traco-layer';
    palco.insertBefore(traceLayer, ui);

    A.field.mount(cena);
    A.stage.init(ui);

    // Grão de filme gerado em tempo de execução: nada de imagens externas na interface.
    try {
      var g = A.texture.tile(220, 3, 255).toDataURL();
      document.documentElement.style.setProperty('--grao', 'url(' + g + ')');
    } catch (e) { }

    document.addEventListener('pointerover', function (e) {
      if (!cursor) return;
      var hot = e.target.closest && e.target.closest('button, .legenda, .quadro, .tecla, .portico-entrar');
      cursor.classList.toggle('quente', !!hot);
    });
    // O ponteiro responde na hora, sem esperar o próximo quadro.
    addEventListener('pointermove', function () { moveCursor(); }, { passive: true });
    addEventListener('pointerdown', function () { moveCursor(); });
  }

  function moveCursor() {
    if (!cursor) return;
    if (A.input.state.touch) { cursor.style.display = 'none'; return; }
    var s = A.input.state;
    cursor.style.transform = 'translate(' + s.x.toFixed(1) + 'px,' + s.y.toFixed(1) + 'px)';
  }

  /* Carregamento: a obra demora o suficiente para que a demora signifique algo. */
  function preload(onProgress) {
    var all = NEAR.concat(FAR);
    var loaded = 0;
    A.plates = A.plates || {};
    return Promise.all(all.map(function (name) {
      return A.texture.load(name, { maxSide: 1000 }).then(function (p) {
        A.plates[name] = p;
        loaded++;
        onProgress(loaded, all.length, name);
        return p;
      }).catch(function () {
        loaded++;
        onProgress(loaded, all.length, name);
        return null;
      });
    }));
  }

  function porticoSequence() {
    var titulo = U.qs('.portico-titulo', portico);
    var status = U.qs('.portico-status', portico);
    var botao = U.qs('.portico-entrar', portico);
    var aviso = U.qs('.portico-aviso', portico);
    var barra = U.qs('.portico-barra', portico);

    var rec = U.store.read();
    var visita = (rec.visits || 0) + 1;

    A.text.queueInto(titulo, 'O ACERVO', { speed: 90, glitch: 0.25, ponder: 10 }).then(function () {
      return A.text.queueInto(U.qs('.portico-sub', portico), 'uma visita guiada por ninguém', { speed: 32, glitch: 0.2 });
    }).then(function () {
      status.classList.add('on');
    });

    preload(function (n, total, name) {
      barra.style.width = ((n / total) * 100).toFixed(1) + '%';
      var frases = {
        3: 'abrindo as salas.', 6: 'acendendo o que restou da luz.',
        9: 'contando as obras. uma está faltando.', 12: 'a legenda não corresponde.',
        14: 'quase. não se acostume.'
      };
      if (frases[n]) A.text.queueInto(status, frases[n], { speed: 30, glitch: 0.2 });
    }).then(function () {
      // Sem leitura de pixels (arquivo aberto direto do disco): a interface
      // compensa o que o pipeline não pôde fazer.
      if (!A.texture.canReadPixels()) document.documentElement.classList.add('sem-pixels');
      A.text.queueInto(status, 'o acervo está aberto. ele sabe que você chegou.', { speed: 26, glitch: 0.22 })
        .then(function () {
          botao.hidden = false;
          botao.classList.add('on');
          aviso.textContent = 'som essencial · fones recomendados · ' + visita + 'ª visita registrada';
        });
    });
  }

  function enter() {
    A.audio.init();
    A.audio.resume();
    A.input.enableMotion();
    portico.classList.add('saindo');
    U.wait(900).then(function () {
      portico.hidden = true;
      running = true;
      A.stage.start();
      var jump = new URLSearchParams(location.search).get('ato');
      if (jump) setTimeout(function () { A.debug.jump(jump); }, 600);
    });
  }

  /* O coração: bate uma vez por segundo, com jitter humano. */
  function heart(dt) {
    heartAcc += dt;
    var act = A.stage.current();
    var strength = act && act.beat != null ? act.beat : 0.6;
    if (heartAcc >= heartInterval) {
      heartAcc = 0;
      heartInterval = 1.02 + Math.random() * 0.08;
      A.audio.beat(strength);
    }
  }

  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    moveCursor();
    if (!running) return;
    tickTraceLayer(dt);

    A.input.tick(dt);
    A.trace.record(dt);
    heart(dt);
    A.field.frame(dt);
    A.stage.tick(dt);
    moveCursor();

    if (traceLayer && A.traceLayer.opacity > 0.001) {
      var src = A.trace.canvas();
      if (traceLayer.width !== src.width) { traceLayer.width = src.width; traceLayer.height = src.height; }
      var g = traceLayer.getContext('2d');
      g.clearRect(0, 0, traceLayer.width, traceLayer.height);
      g.drawImage(src, 0, 0);
    }
  }

  A.traceLayer = {
    opacity: 0, target: 0.2,
    set: function (v) { A.traceLayer.target = U.clamp(v, 0, 1); },
    element: function () { return traceLayer; }
  };

  function tickTraceLayer(dt) {
    if (!traceLayer) return;
    var o = A.traceLayer.opacity;
    if (Math.abs(o - A.traceLayer.target) > 0.002) {
      o = U.lerp(o, A.traceLayer.target, Math.min(1, dt * (running ? 1.2 : 4)));
      A.traceLayer.opacity = o;
      traceLayer.style.opacity = o.toFixed(3);
    }
  }

  /* Desfecho: a cena final depende do que o visitante fez. Quatro cenas
     distintas, os selos de todas as escolhas e um fecho por temperamento. */
  A.ending = function () {
    running = false;
    A.audio.setScene('fim', 8);
    A.audio.drone(0.06, 10);

    var rec = A.stage.visitor();
    var prev = rec.previous || {};
    var esc = rec.escolhas || {};
    var D = A.data;

    var tipo = esc.entrada === 'desviar' ? 'desvio'
      : esc.fim === 'deixar' ? 'aquisicao'
        : esc.fim === 'nada' ? 'indecisao' : 'doacao';
    var F = D.FINAIS[tipo];

    // Fecho por temperamento: obediência, recusa, meio-termo ou imobilidade.
    var score = 0;
    if (esc.parede === 'corrigir') score++; else if (esc.parede === 'recusar') score--;
    if (esc.duplo === 'encostar') score++; else if (esc.duplo === 'fugir') score--;
    if (esc.fim === 'apagar') score++; else if (esc.fim === 'deixar') score--;
    if (esc.resposta === 'sim') score++; else if (esc.resposta === 'nao') score--;
    var banda = (prev.distance || 0) < 900 ? 'imovel'
      : score >= 3 ? 'conforme' : score <= -3 ? 'recusa' : 'misto';
    var fecho = U.pick(D.FECHOS[banda]);

    var selos = Object.keys(esc).map(function (k) {
      var rotulo = (D.SELOS[k] || {})[esc[k]];
      return rotulo ? '<li><span>' + k + '</span>' + rotulo + '</li>' : '';
    }).join('');

    var mostraCopia = tipo !== 'desvio';
    var legendaCopia = tipo === 'aquisicao'
      ? 'tombo AC.0001 · em exposição permanente'
      : tipo === 'indecisao'
        ? 'guardado sem catálogo · não foi decidido'
        : 'cópia de segurança · o acervo guarda uma cópia de tudo';

    fimEl.innerHTML =
      '<div class="fim-inner">' +
      '  <span class="fim-sig">' + F.sig + '</span>' +
      '  <h2 class="fim-titulo">' + F.titulo + '</h2>' +
      F.corpo.map(function (l) { return '<p class="fim-corpo">' + l + '</p>'; }).join('') +
      (mostraCopia && prev.trace ? '<figure class="copia"><img src="' + prev.trace + '" alt=""><figcaption>' + legendaCopia + '</figcaption></figure>' : '') +
      '  <dl class="fim-ficha">' +
      '    <dt>tempo</dt><dd>' + (prev.seconds || 0) + ' s</dd>' +
      '    <dt>batidas</dt><dd>' + (prev.beats || 0) + '</dd>' +
      '    <dt>distância da mão</dt><dd>' + Math.round((prev.distance || 0) / 420 * 10) / 10 + ' m</dd>' +
      '    <dt>hesitações</dt><dd>' + (prev.hesitations || 0) + '</dd>' +
      '    <dt>visitas</dt><dd>' + rec.visits + '</dd>' +
      '  </dl>' +
      (selos ? '  <ul class="fim-selos">' + selos + '</ul>' : '') +
      '  <p class="fim-fecho">' + fecho + '</p>' +
      '  <p class="fim-nota">' + F.nota + '</p>' +
      '  <button class="btn grande-btn" id="voltar">voltar</button>' +
      '</div>';

    fimEl.classList.add('on');
    U.qs('#voltar', fimEl).addEventListener('click', function () {
      A.audio.silence(2, 1.6);
      U.wait(700).then(function () { location.reload(); });
    });
  };

  function main() {
    buildDom();
    A.stage.onFinish = A.ending;
    if (new URLSearchParams(location.search).has('debug')) A.debug.toggle(true);

    addEventListener('resize', function () { A.field.resize(); });
    addEventListener('visibilitychange', function () {
      if (document.hidden) A.audio.drone(0.04, 1.2);
      else if (running) A.audio.drone(0.17, 2.5);
    });

    secondLoop();
    requestAnimationFrame(function (t) { last = t; requestAnimationFrame(loop); });
    porticoSequence();
    U.qs('.portico-entrar', portico).addEventListener('click', enter);
  }

  /* Laço lento: o que a obra faz devagar — respostas às pausas do visitante. */
  function secondLoop() {
    var acc = 0;
    (function step() {
      setTimeout(step, 500);
      if (!running) return;
      acc += 0.5;
      tickTraceLayer(0.5);
      var act = A.stage.current();
      if (!act) return;
      // Durante a espera longa, o acervo mexe sozinho no que está pendurado.
      if (A.input.state.idle > 18 && Math.random() < 0.25) A.audio.whisper();
      if (A.input.state.speed > 2400 && Math.random() < 0.5) A.field.shake(0.03);
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main);
  else main();
})(window.ACERVO = window.ACERVO || {});
