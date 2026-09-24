/* O ACERVO — js/core/trace.js
   O traço: a obra registra o corpo do visitante em tinta clara. Nada é apagado
   por completo — é esse desenho que reaparece emoldurado na última sala. */
(function (A) {
  'use strict';
  var U = A.util;

  var canvas = null, ctx = null, W = 0, H = 0, scale = 1;
  var last = null, fadeAcc = 0;
  var samples = [];                    // histórico para o duplo da Sala do Espelho
  var MAXS = 900;
  var total = 0;

  function ensure() {
    if (canvas) return canvas;
    scale = Math.min(0.75, Math.max(0.4, 1400 / Math.max(1, innerWidth)));
    W = Math.max(320, Math.round(innerWidth * scale));
    H = Math.max(240, Math.round(innerHeight * scale));
    canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    ctx = canvas.getContext('2d', { alpha: true });
    ctx.clearRect(0, 0, W, H);
    return canvas;
  }

  function px(x) { return (x / innerWidth) * W; }
  function py(y) { return (y / innerHeight) * H; }

  function ink(x0, y0, x1, y1, w, a) {
    ensure();
    ctx.strokeStyle = 'rgba(233,226,209,' + a.toFixed(3) + ')';
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px(x0), py(y0));
    ctx.lineTo(px(x1), py(y1));
    ctx.stroke();
    total += a * w;
  }

  function record(dt) {
    ensure();
    var s = A.input.state;
    var x = s.x, y = s.y;
    samples.push({ x: x, y: y, t: performance.now() });
    if (samples.length > MAXS) samples.shift();

    if (!last) { last = { x: x, y: y }; return; }
    var d = U.dist(last.x, last.y, x, y);
    if (d > 0.4) {
      // Devagar = tinta densa. Rápido = risco fino. É a pressão da mão.
      var slow = U.clamp(1 - s.speed / 900, 0, 1);
      var w = 0.8 + slow * 4.6;
      var a = 0.15 + slow * 0.34;
      ink(last.x, last.y, x, y, w, a);
      last.x = x; last.y = y;
    }

    // Esmaecimento lentíssimo: memória que nunca some.
    fadeAcc += dt;
    if (fadeAcc > 2.5) {
      fadeAcc = 0;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.012)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  /* Posição registrada há `delay` segundos. O duplo anda onde você andou. */
  function replayAt(delay) {
    if (samples.length < 2) return null;
    var now = performance.now();
    var target = now - delay * 1000;
    for (var i = samples.length - 1; i > 0; i--) {
      if (samples[i - 1].t <= target) {
        var a = samples[i - 1], b = samples[i];
        var span = Math.max(1, b.t - a.t);
        var t = U.clamp((target - a.t) / span, 0, 1);
        return { x: U.lerp(a.x, b.x, t), y: U.lerp(a.y, b.y, t) };
      }
    }
    return null;
  }

  function fade(amount) {
    ensure();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,' + amount + ')';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  function clear() {
    ensure();
    ctx.clearRect(0, 0, W, H);
    samples.length = 0;
    last = null;
    total = 0;
  }

  /* Desenha o traço dentro de outro canvas. `boost` soma a tinta duas vezes:
     em tamanho pequeno, o risco fino precisa de reforço para ser visto. */
  function renderInto(target, boost) {
    ensure();
    var g = target.getContext('2d');
    g.fillStyle = '#09090c';
    g.fillRect(0, 0, target.width, target.height);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.drawImage(canvas, 0, 0, target.width, target.height);
    if (boost) {
      g.globalCompositeOperation = 'lighter';
      g.drawImage(canvas, 0, 0, target.width, target.height);
    }
    g.globalCompositeOperation = 'source-over';
  }

  /* Fotografia pequena do traço, para sobreviver entre visitas. */
  function snapshot(maxW, quality) {
    ensure();
    var w = Math.min(maxW || 260, W);
    var h = Math.round(w * (H / W));
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    renderInto(c, true);
    try { return c.toDataURL('image/jpeg', quality || 0.5); } catch (e) { return ''; }
  }

  /* O que ficou de você na visita anterior: tinta de baixo, sempre presente. */
  function restore(dataURL) {
    if (!dataURL) return Promise.resolve(false);
    ensure();
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(img, 0, 0, W, H);
        ctx.restore();
        resolve(true);
      };
      img.onerror = function () { resolve(false); };
      img.src = dataURL;
    });
  }

  A.trace = {
    ensure: ensure, record: record, replayAt: replayAt,
    fade: fade, clear: clear, snapshot: snapshot, restore: restore, renderInto: renderInto,
    canvas: function () { return ensure(); }
  };
})(window.ACERVO = window.ACERVO || {});
