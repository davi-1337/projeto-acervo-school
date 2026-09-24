/* O ACERVO — SALA I · ÁTRIO
   A entrada. Três respostas, duas saídas: atravessar (no compasso do coração)
   ou não entrar. A resposta fica registrada e reaparece no fim. */
(function (A) {
  'use strict';
  var U = A.util, L = A.data.LINES;

  A.stage.define({
    id: 'atrio',
    title: 'ÁTRIO',
    scene: 'atrio',
    min: 4,
    beat: 0.9,
    hintAfter: 12,
    hintGap: 9,
    hints: [
      'segure o botão do mouse e não solte.',
      'solte e segure de novo, no tempo da batida.',
      function (ctx) { var o = document.querySelector('.objetivo'); if (o) o.classList.add('explicito'); }
    ],
    grace: 34,

    enter: function (ctx) {
      var rec = A.stage.visitor();
      var root = ctx.root;
      root.innerHTML =
        '<div class="atrio">' +
        '  <div class="catraca"><span class="catraca-n">' + rec.visits + '</span><span class="catraca-l">visita registrada</span></div>' +
        '  <h1 class="titulo grande"></h1>' +
        '  <p class="sub"></p>' +
        '  <div class="pergunta" hidden>' +
        '    <p class="pergunta-txt">' + L.pergunta + '</p>' +
        '    <div class="botoes">' +
        '      <button class="btn" data-r="sim">sim</button>' +
        '      <button class="btn" data-r="nao">não</button>' +
        '      <button class="btn fraco" data-r="nao_sei">não sei</button>' +
        '    </div>' +
        '  </div>' +
        '  <div class="selo" hidden>' +
        '    <svg viewBox="0 0 200 200" class="selo-svg"><circle class="selo-trilha" cx="100" cy="100" r="86"/>' +
        '    <circle class="selo-arco" cx="100" cy="100" r="86"/></svg>' +
        '    <div class="selo-core"></div>' +
        '    <span class="selo-batida">1</span>' +
        '  </div>' +
        '  <p class="instrucao" hidden>clique e segure até o círculo fechar</p>' +
        '  <button class="desviar" hidden>não entrar</button>' +
        '</div>';

      var titulo = U.qs('.titulo', root), sub = U.qs('.sub', root);
      var pergunta = U.qs('.pergunta', root), selo = U.qs('.selo', root);
      var instrucao = U.qs('.instrucao', root), arco = U.qs('.selo-arco', root);
      var core = U.qs('.selo-core', root), contador = U.qs('.selo-batida', root);
      var desviar = U.qs('.desviar', root);

      var state = { fill: 0, answered: false, window: 0, done: false, batidas: 0, saindo: false };
      ctx.state = state;

      var plates = A.plates || {};
      if (plates.goya_cao) {
        A.field.addLayer({ plate: plates.goya_cao, depth: 0.05, scale: 1.55, alpha: 0, warp: 0.18, drift: 7, breathe: 0.014 });
        A.field.layers()[0].alphaTarget = 0.22;
      }

      A.audio.drone(0.16, 5);
      A.traceLayer.set(0.07);

      A.audio.onBeat(function () {
        selo.classList.remove('pulse'); void selo.offsetWidth; selo.classList.add('pulse');
        state.window = 0.5;
      });

      var RESPOSTAS = {
        sim: L.sim, nao: L.nao,
        nao_sei: 'então você está no lugar certo. ninguém aqui sabe.'
      };

      A.text.queueInto(titulo, L.entrada1, { speed: 58, glitch: 0.3, ponder: 7 }).then(function () {
        return U.wait(500);
      }).then(function () {
        var second = rec.visits > 1 ? (L.entrada2 + ' ' + rec.visits + ' vezes.') : L.entrada1b;
        return A.text.queueInto(sub, second, { speed: 26, glitch: 0.2 });
      }).then(function () {
        // A visita anterior é citada: a obra lembra do que você escolheu.
        var ant = rec.previous && rec.previous.escolhas;
        if (ant && ant.fim) {
          var rot = (A.data.SELOS.fim || {})[ant.fim];
          if (rot) A.text.queueInto(sub, 'na última vez você ' + rot + '. ' + sub.textContent, { speed: 22, glitch: 0.18 });
        }
        pergunta.hidden = false;
        void pergunta.offsetWidth;
        pergunta.classList.add('on');
      });

      function revelarPorta() {
        pergunta.classList.add('off');
        selo.hidden = false;
        requestAnimationFrame(function () { selo.classList.add('on'); });
        instrucao.hidden = false;
        ctx.objetivo({
          titulo: 'ABRIR A PORTA',
          linhas: ['a porta abre no compasso do coração.', 'ou não entre — a saída é uma escolha legítima.'],
          controle: 'clique e segure · não solte até o círculo fechar'
        });
        A.audio.hit('door');
        setTimeout(function () {
          if (state.done || state.saindo) return;
          desviar.hidden = false;
          void desviar.offsetWidth;
          desviar.classList.add('on');
        }, 6000);
      }

      root.addEventListener('click', function (e) {
        A.stage.noteClick();

        if (e.target.closest && e.target.closest('.desviar')) return sairSemEntrar();

        var b = e.target.closest ? e.target.closest('.btn') : null;
        if (!b || state.answered) return;
        state.answered = true;
        var r = b.getAttribute('data-r');
        A.stage.escolha('resposta', r);
        U.qsa('.btn', root).forEach(function (x) { x.classList.add('spent'); });
        A.audio.hit('mark');
        A.text.queueInto(sub, RESPOSTAS[r] || '', { speed: 30, glitch: 0.25 }).then(function () {
          return U.wait(800);
        }).then(revelarPorta);
      });

      /* Não entrar: a obra termina aqui, e o fim é outro. */
      function sairSemEntrar() {
        if (state.saindo || state.done) return;
        state.saindo = true;
        A.stage.escolha('entrada', 'desviar');
        A.stage.noteClick();
        A.audio.tapeStop(1.8);
        A.audio.drone(0.05, 5);
        ctx.objetivo({ titulo: 'SAIR', linhas: ['você pode simplesmente não entrar.'], controle: '' });
        ctx.say('então não entre. eu fico aqui.', { speed: 44, glitch: 0.18 }).then(function () {
          return U.wait(1200);
        }).then(function () {
          A.field.tear(0.6);
          A.field.setExposure(0.2);
          return U.wait(1400);
        }).then(function () {
          ctx.banner('<span class="sig">VOCÊ NÃO ENTROU</span><span class="sub">a porta continua aberta</span>', 2400);
          U.wait(2200).then(function () { A.stage.sair(); });
        });
      }
      ctx.__sairSemEntrar = sairSemEntrar;

      ctx.__setFill = function (v) {
        state.fill = U.clamp(v, 0, 1);
        arco.style.strokeDashoffset = String(540 - 540 * state.fill);
        core.style.transform = 'scale(' + (0.3 + state.fill * 0.85).toFixed(3) + ')';
        core.style.opacity = (0.15 + state.fill * 0.85).toFixed(3);
        contador.textContent = Math.max(1, Math.round(state.fill * 10));
      };
      ctx.__complete = function () {
        if (state.done || state.saindo) return;
        state.done = true;
        A.stage.escolha('entrada', 'entrar');
        A.audio.hit('door');
        A.field.shake(0.7);
        ctx.banner('<span class="sig">A PORTA CEDEU</span><span class="sub">não havia ninguém do outro lado</span>', 1800);
        U.wait(1400).then(function () { ctx.done(); });
      };
    },

    frame: function (ctx, dt) {
      var s = ctx.state;
      if (!s || s.done || s.saindo || !s.answered) return;
      var selo = U.qs('.selo', ctx.root);
      if (!selo || selo.hidden) return;

      s.window = Math.max(0, s.window - dt);
      var holding = A.input.state.down;

      if (holding && s.window > 0) {
        if (!s.pegou) { s.pegou = true; ctx.hud.aprendido(); }
        ctx.__setFill(s.fill + dt * 0.40);
      } else if (holding) ctx.__setFill(s.fill - dt * 0.06);
      else ctx.__setFill(s.fill - dt * 0.10);

      var c = U.qs('.selo-core', ctx.root);
      if (c && holding) c.style.boxShadow = '0 0 ' + (10 + s.fill * 70).toFixed(0) + 'px rgba(236,230,216,' + (0.2 + s.fill * 0.6).toFixed(2) + ')';
      if (s.fill >= 1) ctx.__complete();
    },

    auto: function (ctx) {
      var s = ctx.state;
      if (s && s.done) { ctx.done(); return; }
      if (!s) return;
      if (s.saindo) return;
      ctx.say('eu seguro o botão por você. é o que sempre acontece.', { speed: 42, glitch: 0.15 }).then(function () {
        if (!s.answered) {
          s.answered = true;
          A.stage.escolha('resposta', 'nao_sei');
          A.stage.escolha('entrada', 'entrar');
          var p = U.qs('.pergunta', ctx.root);
          if (p) p.classList.add('off');
        }
        var selo = U.qs('.selo', ctx.root);
        if (selo) { selo.hidden = false; selo.classList.add('on'); }
        var i = U.qs('.instrucao', ctx.root);
        if (i) i.hidden = false;
        ctx.objetivo({ titulo: 'ABRIR A PORTA', linhas: ['a porta abre no compasso do coração.'], controle: 'clique e segure' });
        ctx.__setFill(1);
        U.wait(600).then(ctx.__complete);
      });
    }
  });
})(window.ACERVO = window.ACERVO || {});
