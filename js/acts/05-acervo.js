/* O ACERVO — SALA V · ACERVO
   A última sala é o registro do visitante. O museu pendura o que ele deixou
   na parede, com ficha técnica e medidas — e oferece o apagamento. */
(function (A) {
  'use strict';
  var U = A.util, L = A.data.LINES, D = A.data;

  function metros(px) { return (px / 420).toFixed(1).replace('.', ',') + ' m'; }

  var OBRAS = 0;                       // número de tombo da coleção (por sessão)

  A.stage.define({
    id: 'acervo',
    title: 'ACERVO',
    scene: 'acervo',
    min: 6,
    beat: 0.4,
    hintAfter: 12,
    hintGap: 9,
    hints: [
      L.acervo,
      'segure o botão do mouse sobre a parede e não solte.',
      function (ctx) { ctx.say('mantenha pressionado. a barra mostra o quanto já saiu.', { speed: 42, glitch: 0.16 }); }
    ],
    grace: 50,

    enter: function (ctx) {
      var root = ctx.root;
      var plates = A.plates || {};
      var m = A.stage.metrics;
      var rec = A.stage.visitor();
      var prev = rec.previous;

      var obra = U.el('canvas', 'obra');
      obra.width = 760; obra.height = 440;

      var linhas = [
        ['tempo dentro do acervo', U.fmtClock(A.stage.total())],
        ['batidas do coração da obra', String(A.audio.beats())],
        ['distância da sua mão', metros(A.input.state.distance || 0)],
        ['cliques', String(m.clicks)],
        ['hesitações', String(m.hesitations)],
        ['visitas', String(rec.visits)]
      ];

      root.innerHTML =
        '<div class="acv">' +
        '  <div class="parede-final">' +
        '    <figure class="moldura">' +
        '      <div class="moldura-interna"></div>' +
        '      <figcaption><b>sem título (você)</b><span>2026 · tinta sobre nada · coleção do próprio visitante</span></figcaption>' +
        '    </figure>' +
        (prev ? '    <figure class="moldura anterior">' +
          '      <div class="moldura-interna"><canvas class="obra-antiga" width="380" height="220"></canvas></div>' +
          '      <figcaption><b>sem título (você, anteriormente)</b><span>' + (prev.when || '').slice(0, 10) + ' · ' + prev.seconds + ' s · deixado nesta parede</span></figcaption>' +
          '    </figure>' : '') +
        '  </div>' +
        '  <div class="ficha-visitante">' +
        '    <h3>FICHA DE VISITA</h3>' +
        '    <dl>' + linhas.map(function (l) { return '<dt>' + l[0] + '</dt><dd>' + l[1] + '</dd>'; }).join('') + '</dl>' +
        '  </div>' +
        '  <div class="apagar">' +
        '    <div class="apagar-barra"></div>' +
        '    <span class="apagar-txt">0% · segure para apagar</span>' +
        '  </div>' +
        '  <div class="decisoes">' +
        '    <button class="deixar">deixar na parede</button>' +
        '    <span class="decisoes-nota">ou não decida nada: o acervo decide por você</span>' +
        '  </div>' +
        '</div>';

      U.qs('.moldura-interna', root).appendChild(obra);

      if (plates.bosch_inferno) A.field.addLayer({ plate: plates.bosch_inferno, depth: 0.62, scale: 1.35, alpha: 0.0, warp: 0.5 });
      if (plates.durer_melancolia) A.field.addLayer({ plate: plates.durer_melancolia, depth: 0.24, scale: 1.3, alpha: 0.0, warp: 0.35, drift: 8 });
      if (plates.atget_sala) A.field.addLayer({ plate: plates.atget_sala, depth: 0.1, scale: 1.85, alpha: 0.0, warp: 0.2 });
      A.field.layers().forEach(function (l, i) { l.alphaTarget = [0.22, 0.16, 0.12][i] || 0.2; });

      var s = { erase: 0, done: false, said: 0, frames: 0 };
      ctx.state = s;
      ctx.__obra = obra;

      A.audio.drone(0.15, 7);
      A.traceLayer.set(0.30);

      U.qs('.deixar', root).addEventListener('click', function () {
        A.stage.noteClick();
        concluir('deixar');
      });

      if (prev && prev.trace) {
        A.trace.restore(prev.trace).then(function (ok) {
          if (ok) ctx.say('isto é o que você deixou na última vez.', { soft: true, speed: 36, glitch: 0.2 });
        });
      }

      /* As três saídas da sala. Cada uma leva a um desfecho diferente. */
      function concluir(tipo) {
        if (s.done) return;
        s.done = true;
        // O museu guarda cópia da obra em qualquer um dos três caminhos.
        if (!A.stage.__snapshot) A.stage.keepSnapshot(A.trace.snapshot(420, 0.62));
        A.stage.escolha('fim', tipo);
        s.tipo = tipo;

        if (tipo === 'apagar') {
          A.trace.clear();
          A.audio.tapeStop(1.4);
          A.field.tear(0.7);
          A.field.setExposure(0.35);
          setTimeout(function () { ctx.banner('<span class="sig">A PAREDE ESTÁ LIMPA</span><span class="sub">o acervo não tem mais o que mostrar de você</span>', 2400); ctx.say(L.fim, { speed: 44, glitch: 0.2 }); A.audio.speak('o acervo agradece a sua doação', { rate: 0.64, pitch: 0.28 }); }, 900);
          U.wait(3400).then(function () {
            A.field.tear(0.2);
            A.field.setExposure(1);
            ctx.say(L.fim2, { speed: 38, glitch: 0.26 });
            A.audio.hit('reveal');
            U.wait(2200).then(function () { ctx.done(); });
          });
          var saida = U.qs('.decisoes', root);
          if (saida) saida.style.opacity = '0';

        } else if (tipo === 'deixar') {
          OBRAS++;                                  // número de tombo da coleção
          A.audio.hit('reveal');
          A.field.shake(0.4);
          var toma = 'AC.' + String(OBRAS).padStart(4, '0') + '.' + U.roman(A.stage.acts().length);
          ctx.banner('<span class="sig">A OBRA FICA NA PAREDE</span><span class="sub">tombo ' + toma + ' · coleção do acervo</span>', 3000);
          ctx.say('então fica. eu catalogo.', { speed: 42, glitch: 0.2 });
          A.audio.speak('o acervo adquiriu a sua obra', { rate: 0.62, pitch: 0.3 });
          U.wait(3000).then(function () {
            ctx.say('a parede vai continuar exatamente assim.', { soft: true, speed: 36, glitch: 0.2 });
            U.wait(2400).then(function () { ctx.done(); });
          });

        } else {
          A.audio.hit('wrong');
          A.field.tear(0.5);
          ctx.banner('<span class="sig">O ACERVO DECIDE POR VOCÊ</span><span class="sub">guardou tudo, sem apagar e sem catalogar</span>', 2800);
          ctx.say('você não decidiu. eu guardei do mesmo jeito.', { speed: 42, glitch: 0.22 });
          U.wait(3000).then(function () {
            ctx.say('não é bondade. é arquivo.', { soft: true, speed: 40, glitch: 0.2 });
            U.wait(2000).then(function () { ctx.done(); });
          });
        }
      }
      ctx.__concluir = concluir;

      // A obra perde o visitante por alguns segundos antes de mostrar a parede.
      A.stage.lose(4.5).then(function () {
        ctx.objetivo({
          titulo: 'DECIDIR O QUE FICA',
          linhas: ['a parede mostra o seu traço, o seu tempo e as suas hesitações.', 'apague, deixe ficar, ou não decida nada — o museu aceita as três.'],
          controle: 'segure para apagar · ou clique em deixar na parede'
        });
        ctx.say(L.acervo, { speed: 40, glitch: 0.24 });
        A.audio.speak('aqui está o que você deixou', { rate: 0.66, pitch: 0.3 });
      });
    },

    frame: function (ctx, dt) {
      var s = ctx.state;
      if (!s || s.done) return;
      var obra = ctx.__obra;
      s.frames++;

      // A obra pendurada na parede é o traço do visitante, atualizado ao vivo.
      if (obra && s.frames % 3 === 0) A.trace.renderInto(obra, true);

      var anti = U.qs('.obra-antiga', ctx.root);
      if (anti && s.frames % 12 === 0) A.trace.renderInto(anti, false);

      var holding = A.input.state.down;
      var barra = U.qs('.apagar-barra', ctx.root);
      var txt = U.qs('.apagar-txt', ctx.root);

      if (holding) {
        if (!s.pegou) {
          s.pegou = true;
          ctx.hud.aprendido();
          // O museu guarda cópia no instante em que você começa a apagar.
          A.stage.keepSnapshot(A.trace.snapshot(420, 0.62));
        }
        s.erase += dt * 0.17;                       // ~6 s de botão pressionado
        A.trace.fade(dt * 0.09);
        A.audio.ink(1800, true);
        if (Math.random() < dt * 3) A.audio.hit('erase');
        A.field.tear(U.clamp(s.erase * 0.5, 0, 0.4));
        var said = ['', 'está saindo.', 'quase.', 'você estava bem ali.', 'não sobrou muito de você.'];
        var idx = Math.min(said.length - 1, Math.floor(s.erase * said.length));
        if (idx > s.said && said[idx]) { s.said = idx; ctx.say(said[idx], { soft: true, speed: 44, glitch: 0.2 }); }
      } else {
        s.erase = Math.max(0, s.erase - dt * 0.03);
        A.audio.ink(0, false);
        A.field.tear(U.clamp(s.erase * 0.5, 0, 0.4));
      }
      var pc = Math.round(U.clamp(s.erase, 0, 1) * 100);
      if (barra) barra.style.width = pc + '%';
      if (txt) txt.textContent = pc === 0 ? '0% · segure para apagar' : pc + '% · segure até 100%';

      if (s.erase >= 1 && !s.done) ctx.__concluir('apagar');
    },

    auto: function (ctx) {
      var s = ctx.state;
      /* Já resolvido e ainda assim preso aqui: só falta sair. */
      if (s && s.done) { ctx.done(); return; }
      if (!s) return;
      ctx.say('você não decidiu nada. então eu decido.', { speed: 42, glitch: 0.18 }).then(function () {
        ctx.__concluir('nada');
      });
    },

    leave: function () {
      A.audio.ink(0, false);
      A.field.tear(0);
    }
  });
})(window.ACERVO = window.ACERVO || {});
