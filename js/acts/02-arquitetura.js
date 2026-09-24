/* O ACERVO — SALA II · ARQUITETURA
   Três portas de Piranesi (I, V, XIII). Cada uma recua de quem olha.
   Duas travessias possíveis: fechar os olhos (ESPAÇO) ou não se mexer de jeito
   nenhum. Qual porta você atravessa e como — as duas coisas ficam registradas. */
(function (A) {
  'use strict';
  var U = A.util, L = A.data.LINES, D = A.data;

  var LUGARES = [
    { x: 0.24, y: 0.34, raiva: 1.25 },
    { x: 0.50, y: 0.64, raiva: 1.00 },
    { x: 0.76, y: 0.30, raiva: 1.12 }
  ];

  A.stage.define({
    id: 'arquitetura',
    title: 'ARQUITETURA',
    scene: 'arquitetura',
    min: 6,
    beat: 0.6,
    hintAfter: 11,
    hintGap: 9,
    hints: [
      'as portas fogem do seu ponteiro. pare de olhar para elas.',
      function (ctx) { ctx.say(L.arq3, { speed: 42, glitch: 0.16 }); },
      function (ctx) { ctx.say('ou fique completamente imóvel: elas se aproximam de quem não se mexe.', { speed: 40, glitch: 0.14 }); }
    ],
    grace: 44,

    enter: function (ctx) {
      var plates = A.plates || {};
      var root = ctx.root;

      var portasHtml = D.PORTAS.map(function (p, i) {
        return '<div class="porta" data-id="' + p.id + '" data-i="' + i + '" hidden>' +
          '<i class="porta-luz"></i><span class="porta-num">' + p.id + '</span>' +
          '<span class="porta-nome">' + p.nome + '</span></div>';
      }).join('');

      root.innerHTML =
        '<div class="arq">' + portasHtml +
        '  <div class="olhos-fechados">olhos fechados</div>' +
        '  <div class="travessia"><i class="travessia-barra"></i><span class="travessia-txt">a porta se aproxima quando você não vê</span></div>' +
        '  <div class="arq-eco"></div>' +
        '</div>';

      // Três profundidades: a arquitetura não concorda consigo mesma.
      if (plates.piranesi_torre) A.field.addLayer({ plate: plates.piranesi_torre, depth: 0.55, scale: 1.02, alpha: 0.0, warp: 0.5 });
      if (plates.piranesi_arco) A.field.addLayer({ plate: plates.piranesi_arco, depth: 0.30, scale: 1.25, alpha: 0.0, warp: 0.62, drift: 12 });
      if (plates.piranesi_poco) A.field.addLayer({ plate: plates.piranesi_poco, depth: 0.82, scale: 1.5, alpha: 0.0, warp: 0.4, blend: 'lighter' });
      A.field.layers().forEach(function (l, i) { l.alphaTarget = [0.50, 0.32, 0.24][i] || 0.3; });

      var s = {
        portas: LUGARES.map(function (p) {
          return { x: innerWidth * p.x, y: innerHeight * p.y, vx: 0, vy: 0, raiva: p.raiva };
        }),
        open: 0, seen: 0, need: 2.6, done: false, via: null, viaDaPorta: null
      };
      ctx.state = s;
      U.qsa('.porta', root).forEach(function (el) { el.hidden = false; });

      A.audio.drone(0.2, 6);
      A.traceLayer.set(0.14);
      ctx.objetivo({
        titulo: 'ATRAVESSAR UMA PORTA',
        linhas: ['as portas recuam de quem olha para elas.', 'escolha uma: feche os olhos ou fique totalmente imóvel.'],
        controle: 'segure ESPAÇO · ou não mexa o ponteiro'
      });
      setTimeout(function () { ctx.say('três portas. nenhuma delas leva a lugares diferentes.', { soft: true, speed: 38, glitch: 0.2 }); }, 4600);
    },

    frame: function (ctx, dt) {
      var s = ctx.state;
      if (!s || s.done) return;
      var root = ctx.root;
      var input = A.input.state;

      A.field.tear(input.speed > 1400 ? U.clamp((input.speed - 1400) / 2600, 0, 0.26) : 0);

      var fechado = A.input.held('Space') || A.input.held('KeyF');
      var imovel = input.idle > 1.3;
      var ativo = fechado || imovel;
      if (ativo && !s.aprendido) {
        s.aprendido = true;
        s.via = fechado ? 'olhos_fechados' : 'imovel';
        ctx.hud.aprendido();
      }

      s.open = U.lerp(s.open, fechado ? 1 : 0, Math.min(1, dt * 3.4));
      A.field.eyes(s.open * 0.94);
      A.field.setExposure(1 - s.open * 0.55);
      var fechadoEl = U.qs('.olhos-fechados', root);
      if (fechadoEl) fechadoEl.style.opacity = (s.open * 0.9).toFixed(2);

      var t = A.stage.elapsed();
      var cx = innerWidth / 2, cy = innerHeight / 2;

      U.qsa('.porta', root).forEach(function (el, i) {
        var d = s.portas[i];
        var dx = d.x - input.x, dy = d.y - input.y;
        var dist = Math.max(12, Math.sqrt(dx * dx + dy * dy));
        var threat = U.clamp(1 - dist / 400, 0, 1);
        d.vx += (dx / dist) * threat * 820 * d.raiva * dt;
        d.vy += (dy / dist) * threat * 820 * d.raiva * dt;
        if (fechado) {
          d.vx += ((cx - d.x) / innerWidth) * 240 * dt * 10;
          d.vy += ((cy - d.y) / innerHeight) * 200 * dt * 10;
        } else if (imovel) {
          // Parado, o visitante deixa de ser ameaça: a porta se aproxima devagar.
          d.vx += (((i - 1) * innerWidth * 0.24 + cx) - d.x) / innerWidth * 120 * dt;
          d.vy += ((cy - d.y) / innerHeight) * 110 * dt;
        } else {
          d.vx += ((cx - d.x) / innerWidth) * 24 * dt;
          d.vy += ((cy - d.y) / innerHeight) * 20 * dt;
        }
        d.vx *= Math.pow(0.12, dt); d.vy *= Math.pow(0.12, dt);
        d.vx += Math.sin(t * 0.7 + i) * 13 * dt; d.vy += Math.cos(t * 0.53 + i) * 11 * dt;
        d.x += d.vx * dt; d.y += d.vy * dt;
        d.x = U.clamp(d.x, 80, innerWidth - 80); d.y = U.clamp(d.y, 110, innerHeight - 140);

        var esc = 1 + (s.open * 0.5);
        el.style.transform = 'translate(' + (d.x - 62).toFixed(1) + 'px,' + (d.y - 92).toFixed(1) + 'px) scale(' + esc.toFixed(3) + ')';
        el.style.opacity = (0.3 + (1 - threat) * 0.45 + s.open * 0.25).toFixed(2);
      });

      if (!fechado && !imovel && Math.random() < dt * 1.6) A.audio.hit('mark');
      if (Math.random() < dt * 0.4) A.audio.whisper(input.x / innerWidth * 2 - 1);

      var barra = U.qs('.travessia-barra', root);
      var txt = U.qs('.travessia-txt', root);
      if (fechado) s.seen += dt;
      else if (imovel) s.seen += dt * 0.6;
      else if (s.seen > 0.2) s.seen = Math.max(0, s.seen - dt * 0.4);

      var prog = U.clamp(s.seen / s.need, 0, 1);
      if (barra) barra.style.width = (prog * 100).toFixed(1) + '%';
      if (txt) {
        txt.textContent = fechado
          ? 'atravessando de olhos fechados · ' + Math.max(0, s.need - s.seen).toFixed(1) + ' s'
          : imovel
            ? 'atravessando sem se mexer · ' + Math.max(0, s.need - s.seen).toFixed(1) + ' s'
            : (prog > 0 ? 'você se mexeu. a porta recuou.' : 'escolha uma porta: feche os olhos ou fique imóvel');
      }

      if (prog >= 1 && !s.done) {
        // A porta atravessada é a que estiver mais perto do centro da tela.
        var escolhida = 0, melhor = 1e9;
        s.portas.forEach(function (d, i) {
          var dd = U.dist(d.x, d.y, cx, cy);
          if (dd < melhor) { melhor = dd; escolhida = i; }
        });
        var meta = D.PORTAS[escolhida];
        s.done = true;
        A.stage.escolha('porta', meta.id);
        A.stage.escolha('via', fechado ? 'olhos_fechados' : 'imovel');
        A.audio.hit('reveal');
        ctx.banner('<span class="sig">PORTA ' + meta.id + ' — ' + meta.nome.toUpperCase() + '</span>' +
          '<span class="sub">' + (fechado ? 'atravessada de olhos fechados' : 'atravessada sem que você se mexesse') + '</span>', 2000);
        U.wait(1400).then(function () {
          ctx.say(meta.nota, { soft: true, speed: 38, glitch: 0.18 });
          return U.wait(1500);
        }).then(function () { ctx.done(); });
      }

      var ecoEl = U.qs('.arq-eco', root);
      if (ecoEl && Math.random() < dt * 0.4) {
        ecoEl.textContent = A.text.scramble(U.pick(['aqui', 'ainda aqui', 'sala V', 'sem saída', 'volte']), 0.4);
        ecoEl.style.left = U.rand(52, 84) + '%';
        ecoEl.style.top = U.rand(20, 78) + '%';
        ecoEl.classList.remove('on'); void ecoEl.offsetWidth; ecoEl.classList.add('on');
      }
    },

    auto: function (ctx) {
      var s = ctx.state;
      if (s && s.done) { ctx.done(); return; }
      if (!s) return;
      ctx.say('eu fecho os seus olhos por você.', { speed: 40, glitch: 0.2 }).then(function () {
        A.field.eyes(0.94);
        A.stage.escolha('porta', 'V');
        A.stage.escolha('via', 'olhos_fechados');
        U.wait(1000).then(function () {
          A.audio.hit('reveal');
          s.done = true;
          ctx.banner('<span class="sig">ATRAVESSOU</span><span class="sub">conduzido</span>', 1400);
          U.wait(1100).then(function () { ctx.done(); });
        });
      });
    },

    leave: function () {
      A.field.eyes(0);
      A.field.setExposure(1);
      A.field.tear(0);
    }
  });
})(window.ACERVO = window.ACERVO || {});
