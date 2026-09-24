/* O ACERVO — SALA III · LEGENDAS
   A parede do museu. Seis obras, sete legendas: uma não descreve nada.
   Interação simples: clica na legenda, clica no quadro. Sem arrastar. */
(function (A) {
  'use strict';
  var U = A.util, L = A.data.LINES, D = A.data;

  var WALL = [
    { plate: 'vesalius_figura' },
    { plate: 'goya_sono' },
    { plate: 'redon_olho' },
    { plate: 'friedrich_monge' },
    { plate: 'durer_melancolia' },
    { plate: '' }                       // o quadro vazio: espera a legenda órfã
  ];

  A.stage.define({
    id: 'legendas',
    title: 'LEGENDAS',
    scene: 'legendas',
    min: 6,
    beat: 0.45,
    hintAfter: 10,
    hintGap: 9,
    hints: [
      'clique na legenda que diz “sem objeto”.',
      'agora clique no quadro vazio — o último, sem imagem.',
      function (ctx) { ctx.say('a legenda órfã pertence ao quadro vazio. é a única regra da sala.', { speed: 38, glitch: 0.16 }); }
    ],
    grace: 44,

    enter: function (ctx) {
      var root = ctx.root;
      var plates = A.plates || {};

      var wallHtml = WALL.map(function (w, i) {
        var p = plates[w.plate];
        return '<figure class="quadro' + (w.plate ? '' : ' quadro-vazio') + '" data-slot="' + i + '">' +
          (p ? '<img src="' + p.thumb + '" alt="">' : '<div class="vazio-campo"><span class="vazio-x">×</span><span class="vazio-txt">sem imagem</span></div>') +
          '<figcaption class="legenda-posta" data-label=""></figcaption>' +
          '<div class="ficha-tecnica"></div>' +
          '</figure>';
      }).join('');

      var labelsHtml = U.shuffle(D.LABELS.slice()).map(function (l) {
        return '<button class="legenda" data-id="' + l.id + '" data-raw="' + l.texto + '">' + l.texto + '</button>';
      }).join('');

      root.innerHTML =
        '<div class="leg">' +
        '  <div class="parede">' + wallHtml + '</div>' +
        '  <div class="bandeja">' +
        '    <span class="bandeja-titulo">LEGENDAS SEM PAREDE</span>' +
        '    <div class="legendas">' + labelsHtml + '</div>' +
        '    <button class="recusar">seguir sem corrigir a parede</button>' +
        '  </div>' +
        '</div>';

      var s = { sel: null, done: false, wear: 0, hovered: null, hoverStart: 0, wrongs: 0, lidas: 0 };
      ctx.state = s;

      A.field.addLayer({ plate: plates.piranesi_torre, depth: 0.1, scale: 1.7, alpha: 0.0, warp: 0.25 });
      A.field.layers()[0].alphaTarget = 0.12;
      A.audio.drone(0.14, 6);
      A.traceLayer.set(0.10);

      ctx.objetivo({
        titulo: 'CORRIGIR A PAREDE',
        linhas: ['há uma legenda sem obra e uma obra sem legenda.', 'ou recuse: o museu pode ficar errado.'],
        controle: 'clique na legenda · depois clique no quadro vazio'
      });

      /* --- fichas técnicas: recompensa de quem demora (não é preciso) --- */
      U.qsa('.quadro', root).forEach(function (fig) {
        var i = parseInt(fig.getAttribute('data-slot'), 10);
        var meta = D.PLATES[WALL[i].plate];
        if (!meta) return;
        var box = U.qs('.ficha-tecnica', fig);
        var t0 = 0;
        fig.addEventListener('pointerenter', function () { t0 = A.stage.elapsed(); });
        fig.addEventListener('pointermove', function () {
          if (t0 && A.stage.elapsed() - t0 > 1.2 && !box.classList.contains('on')) {
            box.innerHTML = '<b>' + meta.titulo + '</b><span>' + meta.autor + ', ' + meta.ano + '</span>' +
              '<span class="tec">' + meta.tecnica + '</span><span class="fonte">' + meta.fonte + ' · ' + meta.licenca + '</span>' +
              '<span class="nota">' + meta.nota + '</span>';
            box.classList.add('on');
            A.audio.whisper();
          }
        });
        fig.addEventListener('pointerleave', function () { t0 = 0; box.classList.remove('on'); });
      });

      /* --- leitura: quanto mais tempo sob o olhar, mais a legenda se deforma --- */
      root.addEventListener('pointerover', function (e) {
        var lab = e.target.closest && e.target.closest('.legenda');
        if (lab && lab !== s.hovered) { s.hovered = lab; s.hoverStart = A.stage.elapsed(); }
      });
      root.addEventListener('pointerout', function (e) {
        var lab = e.target.closest && e.target.closest('.legenda');
        if (lab && lab === s.hovered) s.hovered = null;
      });

      function colocar(lab, target) {
        if (s.done) return;
        s.done = true;
        A.stage.escolha('parede', 'corrigir');
        var cap = U.qs('.legenda-posta', target);
        cap.dataset.raw = lab.dataset.raw;
        cap.textContent = lab.dataset.raw;
        cap.classList.add('certa');
        lab.remove();
        target.classList.add('preenchido', 'certo');
        A.audio.hit('reveal');
        A.field.shake(0.45);
        ctx.banner('<span class="sig">A LEGENDA ENCONTROU O NADA</span><span class="sub">agora o museu está correto</span>', 2000);
        U.wait(1600).then(function () { ctx.done(); });
      }
      ctx.__resolver = function () {
        var orphan = U.qs('.legenda[data-id="orfa"]', root);
        var empty = U.qs('.quadro-vazio', root);
        if (orphan && empty) colocar(orphan, empty);
      };

      /* Recusar: a parede fica errada, e o acervo registra a recusa. */
      function recusar() {
        if (s.done) return;
        s.done = true;
        A.stage.escolha('parede', 'recusar');
        A.audio.hit('wrong');
        A.field.shake(0.3);
        U.qsa('.legenda', root).forEach(function (l) { l.style.opacity = '0.25'; l.style.pointerEvents = 'none'; });
        ctx.banner('<span class="sig">A PAREDE FICA ERRADA</span><span class="sub">é o que o visitante decidiu</span>', 2400);
        ctx.say('então fica errada. eu não conserto nada por conta própria.', { speed: 40, glitch: 0.2 }).then(function () {
          return U.wait(1600);
        }).then(function () { ctx.done(); });
      }
      ctx.__sairSemCorrigir = recusar;

      root.addEventListener('click', function (e) {
        A.stage.noteClick();

        if (e.target.closest && e.target.closest('.recusar')) return recusar();

        var lab = e.target.closest && e.target.closest('.legenda');
        var quadro = e.target.closest && e.target.closest('.quadro');

        if (lab) {
          var era = s.sel;
          U.qsa('.legenda', root).forEach(function (l) { l.classList.remove('selecionada'); });
          if (era === lab) { s.sel = null; ctx.say('deixou de escolher. a parede continua errada.', { soft: true, speed: 40 }); return; }
          s.sel = lab;
          lab.classList.add('selecionada');
          ctx.hud.aprendido();
          A.audio.hit('mark');
          ctx.say('“' + lab.dataset.raw + '”. agora escolha onde ela vai.', { soft: true, speed: 36, glitch: 0.1 });
          return;
        }

        if (quadro && s.sel) {
          var lab2 = s.sel;
          var vazio = quadro.classList.contains('quadro-vazio');
          var orfa = lab2.getAttribute('data-id') === 'orfa';
          if (orfa && vazio) return colocar(lab2, quadro);
          s.wrongs++;
          A.audio.hit('wrong');
          A.field.shake(0.2);
          if (orfa) ctx.say('“sem objeto” não pode ficar sobre um objeto.', { speed: 38, glitch: 0.18 });
          else if (vazio) ctx.say('essa legenda descreve alguma coisa. aqui não há nada.', { speed: 38, glitch: 0.2 });
          else ctx.say('essa legenda já tem onde ficar. não importa onde você a coloque.', { speed: 38, glitch: 0.18 });
          lab2.classList.remove('selecionada');
          s.sel = null;
          return;
        }

        if (quadro && !s.sel && !quadro.classList.contains('quadro-vazio')) {
          ctx.say('primeiro escolha uma legenda, embaixo.', { soft: true, speed: 42 });
        }
      });
    },

    frame: function (ctx, dt) {
      var s = ctx.state;
      if (!s || s.done) return;
      s.wear += dt * 0.005;
      if (s.hovered) {
        var held = A.stage.elapsed() - s.hoverStart;
        A.text.wear(U.qsa('.legenda, .legenda-posta', ctx.root), U.clamp(held / 14 + s.wear * 0.5, 0, 0.3));
      } else if (Math.random() < dt * 0.3) {
        A.text.wear(U.qsa('.legenda, .legenda-posta', ctx.root), U.clamp(s.wear * 0.3, 0, 0.2));
      }
    },

    auto: function (ctx) {
      /* Já resolvido e ainda assim preso aqui: só falta sair. */
      if (ctx.state && ctx.state.done) { ctx.done(); return; }
      ctx.say('eu ponho a legenda. é o que sempre acontece.', { speed: 40, glitch: 0.16 }).then(function () {
        U.wait(500).then(ctx.__resolver);
      });
    }
  });
})(window.ACERVO = window.ACERVO || {});
