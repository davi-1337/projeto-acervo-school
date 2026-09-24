/* O ACERVO — js/core/stage.js
   A máquina de salas. Controla entrada e saída, transições, o visor, a voz que
   constata coisas, o relógio e as estatísticas. Nenhuma sala pode travar:
   passado o tempo de graça, a própria obra resolve o enigma do visitante. */
(function (A) {
  'use strict';
  var U = A.util;

  var acts = [], byId = {};
  var current = null, currentIndex = -1, actTime = 0, hintIndex = 0, totalTime = 0;
  var rootEl = null, hudEl = null, lineEl = null, fichaEl = null, veilEl = null, bannerEl = null, objEl = null;
  var busy = false, startedAt = 0, running = false, pendente = false;
  var metrics = U.makeMetrics();
  var lastVoiceAt = 0, lastIdle = 0;
  var record = U.store.read();
  var rec = {
    visits: (record.visits || 0) + 1,
    totalSeconds: record.totalSeconds || 0,
    lastAt: record.lastAt || null,
    previous: record.previous || null,
    /* Cada visita começa com as próprias escolhas; as da visita anterior
       ficam guardadas em `previous.escolhas` e podem ser citadas. */
    escolhas: {}
  };

  function define(act) {
    act.index = acts.length + 1;
    acts.push(act);
    byId[act.id] = act;
    return act;
  }

  function init(root) {
    rootEl = root;
    hudEl = U.el('div', 'hud');
    hudEl.innerHTML =
      '<div class="hud-left"><span class="hud-mark">ACERVO</span><span class="hud-room" id="hud-room">SALA —</span></div>' +
      '<div class="hud-right"><span class="hud-clock" id="hud-clock">0:00</span></div>';
    lineEl = U.el('div', 'voice', '');
    objEl = U.el('div', 'objetivo', '');
    fichaEl = U.el('div', 'ficha', '');
    veilEl = U.el('div', 'veil', '');
    bannerEl = U.el('div', 'banner', '');
    root.appendChild(hudEl);
    root.appendChild(lineEl);
    root.appendChild(objEl);
    root.appendChild(fichaEl);
    root.appendChild(veilEl);
    root.appendChild(bannerEl);
    renderFicha();
  }

  /* O painel de objetivo: em cada sala, sem mistério, o que se espera do
     visitante e qual é o gesto. O enigma é a obra; o controle, não. */
  function objetivo(cfg) {
    if (!objEl) return;
    cfg = cfg || {};
    objEl.innerHTML =
      '<span class="obj-tag">OBJETIVO</span>' +
      '<b class="obj-titulo">' + (cfg.titulo || '') + '</b>' +
      (cfg.linhas || []).map(function (l) { return '<p class="obj-linha">' + l + '</p>'; }).join('') +
      (cfg.controle ? '<span class="obj-controle">' + cfg.controle + '</span>' : '');
    objEl.classList.remove('on');
    void objEl.offsetWidth;
    objEl.classList.add('on');
  }
  function clearObjetivo() { if (objEl) { objEl.classList.remove('on'); objEl.innerHTML = ''; } }
  /* Quando o gesto é compreendido, o painel recua — a obra não fica explicando. */
  function aprendido() { if (objEl) objEl.classList.add('aprendido'); }

  /* Escolhas: tudo o que o visitante decide fica registrado e viaja até o fim.
     É o que separa uma visita da outra. */
  function escolha(chave, valor) {
    if (valor == null) return rec.escolhas[chave];
    rec.escolhas[chave] = valor;
    U.store.write(rec);
    if (A.debug.on) updateDebug();
    return valor;
  }
  function escolhas() { return rec.escolhas; }

  function renderFicha() {
    if (!fichaEl) return;
    fichaEl.innerHTML =
      '<span>visita ' + rec.visits + '</span>' +
      '<span>batidas ' + A.audio.beats() + '</span>' +
      '<span>' + U.fmtClock(totalTime) + '</span>';
  }

  function roomLabel(act) {
    return 'SALA ' + U.roman(act.index) + ' · ' + act.title;
  }

  function setRoom(act) {
    var r = U.qs('#hud-room');
    if (r) r.textContent = roomLabel(act);
  }

  /* A voz: frases curtas, nunca explicativas, digitadas com pressa irregular. */
  var voiceToken = { cancelled: false };
  function say(str, opts) {
    if (!lineEl) return Promise.resolve();
    opts = opts || {};
    voiceToken.cancelled = true;
    voiceToken = { cancelled: false };
    var token = voiceToken;
    lineEl.classList.toggle('voice-soft', !!opts.soft);
    var target = lineEl;
    if (opts.replace) target.textContent = '';
    return A.text.typeText(target, str, {
      speed: opts.speed || 34, glitch: opts.glitch == null ? 0.22 : opts.glitch,
      token: token, ponder: opts.ponder
    }).then(function () {
      if (opts.hold) return U.wait(opts.hold);
    });
  }
  function clearVoice() { if (lineEl) { voiceToken.cancelled = true; lineEl.textContent = ''; } }

  function banner(html, ms) {
    if (!bannerEl) return Promise.resolve();
    bannerEl.innerHTML = html;
    bannerEl.classList.add('on');
    return U.wait(ms || 1500).then(function () {
      bannerEl.classList.remove('on');
    });
  }
  function clearBanner() { if (bannerEl) { bannerEl.classList.remove('on'); bannerEl.innerHTML = ''; } }

  function veil(on) {
    if (!veilEl) return;
    veilEl.classList.toggle('on', !!on);
  }

  function ctxFor(act) {
    return {
      act: act,
      stage: A.stage,
      field: A.field,
      audio: A.audio,
      input: A.input,
      trace: A.trace,
      text: A.text,
      util: U,
      root: null,
      say: say,
      banner: banner,
      objetivo: objetivo,
      hud: {
        ficha: renderFicha, room: function () { return setRoom(act); },
        objetivo: objetivo, limparObjetivo: clearObjetivo, aprendido: aprendido
      },
      metrics: metrics,
      size: function () { return { w: innerWidth, h: innerHeight }; },
      /* Encerra a sala. Se ainda não passou o tempo mínimo, o pedido fica
         registrado e a sala sai sozinha quando o tempo chegar — nunca é perdido. */
      done: function () {
        if (busy) return;
        pendente = true;
        if (actTime >= (act.min || 0)) goNext();
      }
    };
  }

  function start() {
    running = true;
    startedAt = performance.now();
    go(acts[0].id);
  }

  function go(id) {
    var act = byId[id];
    if (!act) return;
    if (current && current.leave) { try { current.leave(current.ctx); } catch (e) { console.error(e); } }
    if (current && current.ctx && current.ctx.root && current.ctx.root.parentNode) {
      current.ctx.root.parentNode.removeChild(current.ctx.root);
    }
    A.field.clearLayers();
    A.field.eyes(0);
    A.field.tear(0);
    A.field.setExposure(1);
    A.audio.ink(0, false);
    clearVoice();
    clearObjetivo();
    clearBanner();

    if (current) metrics.noteAct(current.id, actTime);
    current = act;
    currentIndex = acts.indexOf(act);
    actTime = 0; hintIndex = 0; pendente = false;
    A.audio.setScene(act.scene || act.id, 4.5);

    var node = U.el('section', 'act act-' + act.id);
    rootEl.appendChild(node);
    act.ctx = ctxFor(act);
    act.ctx.root = node;
    if (act.enter) { try { act.enter(act.ctx); } catch (e) { console.error(e); } }
    setRoom(act);
    renderFicha();

    var r = U.qs('#hud-room');
    if (r) { r.classList.remove('pulse'); void r.offsetWidth; r.classList.add('pulse'); }
    if (A.debug.on) updateDebug();
  }

  function goNext() {
    if (busy) return;
    busy = true;
    var next = acts[currentIndex + 1];
    A.audio.riser(2.6);
    A.field.tear(0.55);
    A.field.shake(0.5);
    setTimeout(function () { A.field.tear(0.2); }, 420);
    U.wait(900).then(function () {
      A.field.tear(0);
      if (next) go(next.id);
      else A.stage.finish();
      busy = false;
    });
  }

  function tick(dt) {
    if (!running || !current) return;
    totalTime += dt;
    actTime += dt;

    if (current.frame) { try { current.frame(current.ctx, dt); } catch (e) { console.error(e); } }

    // Conclusão pedida durante o tempo mínimo: sai assim que o mínimo passa.
    if (pendente && !busy && actTime >= (current.min || 0)) { goNext(); return; }

    var clock = U.qs('#hud-clock');
    if (clock) clock.textContent = U.fmtClock(totalTime);
    if (Math.floor(totalTime * 2) % 2 === 0) renderFicha();

    /* Dicas: a sala insiste, cada vez menos por metáfora. */
    var hints = current.hints || [];
    var after = current.hintAfter == null ? 9 : current.hintAfter;
    if (hints.length && hintIndex < hints.length) {
      var threshold = after + hintIndex * (current.hintGap || 9);
      if (actTime > threshold) {
        var h = hints[hintIndex];
        hintIndex++;
        if (typeof h === 'function') h(current.ctx); else say(h, { speed: 40, glitch: 0.18 });
        if (current.onHint) current.onHint(current.ctx, hintIndex);
      }
    }

    /* Tempo de graça: a obra faz por você. É pior do que deixar você travar. */
    if (current.grace && actTime > current.grace && !current.autoSolved) {
      current.autoSolved = true;
      if (current.auto) { try { current.auto(current.ctx); } catch (e) { console.error(e); } }
    }

    /* Ociosidade: a obra percebe que você parou. */
    var idle = A.input.state.idle;
    if (idle > 24 && totalTime - lastVoiceAt > 34 && idle - lastIdle > 20) {
      lastVoiceAt = totalTime; lastIdle = idle;
      say(U.pick(A.text.VOICE.idle), { soft: true, speed: 46, glitch: 0.12 });
      if (Math.random() < 0.5) A.audio.whisper();
    }

    if (Math.random() < dt * 0.055) A.audio.whisper();
    if (A.debug.on) updateDebug();
  }

  /* A perda: por alguns segundos, o acervo não sabe onde você está. */
  function lose(seconds) {
    var hold = seconds || 6;
    A.field.setExposure(0.04);
    A.field.tear(0.85);
    A.audio.tapeStop(1.1);
    banner('<span class="sig">SEM SINAL</span><span class="sub">reconectando o visitante…</span>', hold * 1000 - 900);
    return A.audio.silence(hold, 2.4).then(function () {
      A.field.tear(0);
      A.field.setExposure(1);
      A.audio.hit('reveal');
    });
  }

  function finish() {
    running = false;
    metrics.noteAct(current ? current.id : '', actTime);
    rec.lastAt = new Date().toISOString();
    rec.totalSeconds = Math.round((rec.totalSeconds || 0) + totalTime);
    rec.previous = {
      seconds: Math.round(totalTime),
      distance: Math.round(A.input.state.distance || 0),
      beats: A.audio.beats(),
      clicks: metrics.clicks,
      hesitations: metrics.hesitations,
      when: rec.lastAt,
      trace: A.stage.__snapshot || '',
      escolhas: JSON.parse(JSON.stringify(rec.escolhas))
    };
    U.store.write(rec);
    A.audio.setScene('fim', 6);
    A.audio.drone(0.05, 14);
    if (typeof A.stage.onFinish === 'function') A.stage.onFinish();
  }

  function reset() {
    rec.visits += 1;
    U.store.write(rec);
  }

  A.stage = {
    __snapshot: '',
    define: define, init: init, start: start, go: go, next: goNext, tick: tick,
    say: say, banner: banner, veil: veil, lose: lose, finish: finish,
    acts: function () { return acts; },
    current: function () { return current; },
    currentId: function () { return current ? current.id : null; },
    elapsed: function () { return actTime; },
    total: function () { return totalTime; },
    metrics: metrics,
    visitor: function () { return rec; },
    escolha: escolha,
    escolhas: escolhas,
    /* Sair da obra por decisão do visitante (a porta que ele não atravessou). */
    sair: function () { running = false; finish(); },
    keepSnapshot: function (s) { A.stage.__snapshot = s || ''; },
    resetRec: reset,
    noteClick: function () { metrics.clicks++; },
    noteHesitation: function (sec) {
      metrics.hesitations++;
      if (sec > metrics.longestPause) metrics.longestPause = sec;
    }
  };

  /* Ferramentas de inspeção: usadas na verificação da obra. */
  A.debug = {
    on: false,
    panel: null,
    toggle: function (v) {
      A.debug.on = v == null ? !A.debug.on : !!v;
      if (A.debug.on && !A.debug.panel) {
        A.debug.panel = U.el('div', 'debug-panel', '');
        document.body.appendChild(A.debug.panel);
      }
      if (!A.debug.on && A.debug.panel) { A.debug.panel.remove(); A.debug.panel = null; }
    },
    jump: function (id) { go(id); },
    next: function () { goNext(); },
    state: function () {
      return {
        act: current ? current.id : null,
        index: currentIndex + 1,
        actSeconds: +actTime.toFixed(2),
        totalSeconds: +totalTime.toFixed(2),
        actTimes: metrics.perAct,
        beats: A.audio.beats(),
        clicks: metrics.clicks,
        distance: Math.round(A.input.state.distance || 0),
        hesitations: metrics.hesitations,
        escolhas: JSON.parse(JSON.stringify(rec.escolhas)),
        acts: acts.map(function (a) { return a.id + (a.autoSolved ? '(auto)' : ''); })
      };
    }
  };

  function updateDebug() {
    if (!A.debug.panel) return;
    var s = A.debug.state();
    if (!s.act) { A.debug.panel.textContent = ''; return; }
    A.debug.panel.textContent = 'ato ' + s.index + '/' + acts.length + ' · ' + s.act +
      ' · sala ' + s.actSeconds.toFixed(1) + 's · total ' + s.totalSeconds.toFixed(1) + 's' +
      ' · batidas ' + s.beats + ' · cliques ' + s.clicks + ' · ' + JSON.stringify(s.escolhas);
  }
})(window.ACERVO = window.ACERVO || {});
