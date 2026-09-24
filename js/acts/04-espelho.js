/* O ACERVO — SALA IV · ESPELHO
   O traço do visitante volta a andar, com alguns segundos de atraso.
   Tarefa única e clara: ficar perto do próprio duplo por alguns segundos. */
(function (A) {
  'use strict';
  var U = A.util, L = A.data.LINES;

  A.stage.define({
    id: 'espelho',
    title: 'ESPELHO',
    scene: 'espelho',
    min: 6,
    beat: 0.55,
    hintAfter: 10,
    hintGap: 9,
    hints: [L.esp, L.esp2, function (ctx) { ctx.say('encoste o ponteiro no olho e fique perto. a barra mostra o tempo.', { speed: 42, glitch: 0.16 }); }],
    grace: 44,

    enter: function (ctx) {
      var root = ctx.root;
      var plates = A.plates || {};

      var canal = U.el('canvas', 'traco-canal');
      canal.width = 900; canal.height = 520;

      root.innerHTML =
        '<div class="esp">' +
        '  <div class="duplo"><img src="' + (plates.redon_olho ? plates.redon_olho.thumb : '') + '" alt=""><i class="anel"></i></div>' +
        '  <div class="contato"><div class="contato-barra"></div></div>' +
        '  <div class="contato-txt">0,0 s perto</div>' +
        '  <div class="veu-olho"></div>' +
        '</div>';
      root.appendChild(canal);

      if (plates.atget_sala) A.field.addLayer({ plate: plates.atget_sala, depth: 0.08, scale: 1.9, alpha: 0.0, warp: 0.2 });
      if (plates.bosch_inferno) A.field.addLayer({ plate: plates.bosch_inferno, depth: 0.35, scale: 1.35, alpha: 0.0, warp: 0.55, blend: 'lighter' });
      A.field.layers().forEach(function (l, i) { l.alphaTarget = i === 0 ? 0.12 : 0.14; });

      var s = {
        contact: 0, need: 4.0, delay: 4.5, elapsed: 0, done: false,
        fuga: 0, fugaNeed: 5.0,
        dbl: { x: innerWidth / 2, y: innerHeight / 2 }, warned: false
      };
      ctx.state = s;
      ctx.__canal = { el: canal, ctx: canal.getContext('2d') };

      A.audio.drone(0.18, 6);
      A.traceLayer.set(0.42);
      ctx.objetivo({
        titulo: 'ENCOSTAR NO SEU DUPLO',
        linhas: ['o olho repete o que você fez há alguns segundos.', 'chegue perto e fique — ou fuja até ele desistir.'],
        controle: 'aproxime o ponteiro · ou fuja por 5 s'
      });
      setTimeout(function () {
        ctx.say('esse olho é você, com atraso.', { soft: true, speed: 36, glitch: 0.22 });
      }, 3800);
    },

    frame: function (ctx, dt) {
      var s = ctx.state;
      if (!s || s.done) return;
      s.elapsed += dt;
      var input = A.input.state;

      // O atraso diminui: o duplo deixa de repetir e passa a conduzir.
      s.delay = Math.max(0.4, 4.5 - s.elapsed * 0.22);
      var past = A.trace.replayAt(s.delay);
      var tx, ty;
      if (past) { tx = past.x; ty = past.y; }
      else {
        tx = innerWidth * (0.5 + Math.sin(s.elapsed * 0.6) * 0.24);
        ty = innerHeight * (0.5 + Math.cos(s.elapsed * 0.43) * 0.2);
      }
      s.dbl.x = U.lerp(s.dbl.x, tx, Math.min(1, dt * 5.5));
      s.dbl.y = U.lerp(s.dbl.y, ty, Math.min(1, dt * 5.5));

      var d = U.dist(input.x, input.y, s.dbl.x, s.dbl.y);
      var duploEl = U.qs('.duplo', ctx.root);
      if (duploEl) {
        duploEl.style.transform = 'translate(' + (s.dbl.x - 60).toFixed(1) + 'px,' + (s.dbl.y - 60).toFixed(1) + 'px)';
        duploEl.style.setProperty('--prox', U.clamp(1 - d / 420, 0, 1).toFixed(3));
      }

      var near = d < 120;
      var longe = d > 330;
      if (near) {
        s.contact += dt;
        s.fuga = Math.max(0, s.fuga - dt * 0.5);
        if (!s.aprendido) { s.aprendido = true; ctx.hud.aprendido(); }
        if (!s.warned) { s.warned = true; ctx.say('é isso. não saia.', { soft: true, speed: 46 }); }
      } else {
        s.contact = Math.max(0, s.contact - dt * 0.5);
        if (longe) s.fuga += dt;
      }
      A.audio.ink(input.speed * (near ? 1.4 : 0.7), near);

      var prog = U.clamp(s.contact / s.need, 0, 1);
      var barra = U.qs('.contato-barra', ctx.root);
      if (barra) barra.style.width = (prog * 100).toFixed(1) + '%';
      var txt = U.qs('.contato-txt', ctx.root);
      if (txt) {
        txt.textContent = near
          ? 'perto · faltam ' + Math.max(0, s.need - s.contact).toFixed(1) + ' s'
          : (s.fuga > 0.6
            ? 'fugindo · ele desiste em ' + Math.max(0, s.fugaNeed - s.fuga).toFixed(1) + ' s'
            : (prog > 0 ? 'você se afastou · ' + (prog * 100).toFixed(0) + '%' : '0,0 s perto'));
      }
      var veu = U.qs('.veu-olho', ctx.root);
      if (veu) veu.style.opacity = (prog * 0.55).toFixed(3);

      if (ctx.__canal) {
        var c = ctx.__canal.ctx, el = ctx.__canal.el;
        c.clearRect(0, 0, el.width, el.height);
        c.save();
        c.globalAlpha = 0.5 + Math.sin(s.elapsed) * 0.08;
        c.drawImage(A.trace.canvas(), 0, 0, el.width, el.height);
        c.restore();
      }

      if (Math.random() < dt * 0.5) A.audio.whisper(input.x / innerWidth * 2 - 1);
      if (s.elapsed > 5 && !s.said2) { s.said2 = true; ctx.say('agora ele anda antes de você.', { soft: true, speed: 40 }); }

      if (prog >= 1 && !s.done) {
        s.done = true;
        A.stage.escolha('duplo', 'encostar');
        A.audio.hit('reveal');
        A.field.shake(0.6);
        A.field.eyes(0.3);
        setTimeout(function () { A.field.eyes(0); }, 700);
        ctx.banner('<span class="sig">CONTATO</span><span class="sub">o duplo para de andar</span>', 1500);
        ctx.say(L.esp3, { speed: 50, glitch: 0.3 });
        A.audio.speak('não era você', { rate: 0.62, pitch: 0.3 });
        U.wait(2000).then(function () { ctx.done(); });
      } else if (s.fuga >= s.fugaNeed && !s.done) {
        s.done = true;
        A.stage.escolha('duplo', 'fugir');
        A.audio.hit('wrong');
        A.field.shake(0.25);
        ctx.banner('<span class="sig">ELE DESISTIU DE VOCÊ</span><span class="sub">o olho volta para o fundo da sala</span>', 2000);
        ctx.say('você fugiu bem. ele não insiste.', { speed: 44, glitch: 0.24 });
        U.wait(1800).then(function () { ctx.done(); });
      }
    },

    auto: function (ctx) {
      var s = ctx.state;
      /* Já resolvido e ainda assim preso aqui: só falta sair. */
      if (s && s.done) { ctx.done(); return; }
      if (!s) return;
      ctx.say('encosto por você. é o que eu faço.', { speed: 42, glitch: 0.18 }).then(function () {
        A.stage.escolha('duplo', 'encostar');
        s.contact = s.need;
        U.wait(900).then(function () {
          A.audio.hit('reveal');
          s.done = true;
          ctx.banner('<span class="sig">CONTATO</span><span class="sub">conduzido</span>', 1400);
          U.wait(1100).then(function () { ctx.done(); });
        });
      });
    },

    leave: function () {
      A.field.eyes(0);
      A.audio.ink(0, false);
    }
  });
})(window.ACERVO = window.ACERVO || {});
