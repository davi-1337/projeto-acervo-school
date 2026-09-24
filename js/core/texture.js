/* O ACERVO — js/core/texture.js
   As obras do acervo. Cada gravura baixada é reprocessada: escala de cinza,
   tinta, papel, dithering ordenado e deslocamento. O original nunca aparece cru. */
(function (A) {
  'use strict';
  var U = A.util;

  var cache = {};
  var probe = document.createElement('canvas');
  probe.width = probe.height = 2;
  var pctx = probe.getContext('2d');

  /* Nem todo contexto permite ler pixels (file:// tinge o canvas).
     A obra funciona nos dois casos: com dithering real, ou com trama por mesclagem. */
  var canReadPixels = (function () {
    try {
      pctx.fillStyle = '#fff'; pctx.fillRect(0, 0, 2, 2);
      var d = pctx.getImageData(0, 0, 1, 1).data;
      return d[0] === 255;
    } catch (e) { return false; }
  })();

  var filterProbe = (function () {
    try { pctx.filter = 'blur(2px)'; var ok = pctx.filter === 'blur(2px)'; pctx.filter = 'none'; return ok; }
    catch (e) { return false; }
  })();

  function ctxFilter(c, value) { if (filterProbe) c.filter = value; }

  /* Trama Bayer 8x8 usada no dithering ordenado. */
  var BAYER = (function () {
    var m = [[0]], n = 1;
    for (var s = 0; s < 3; s++) {
      var size = n, out = [];
      for (var y = 0; y < size * 2; y++) out.push(new Array(size * 2));
      for (var yy = 0; yy < size; yy++) {
        for (var xx = 0; xx < size; xx++) {
          var v = m[yy][xx] * 4;
          out[yy][xx] = v; out[yy][xx + size] = v + 2;
          out[yy + size][xx] = v + 3; out[yy + size][xx + size] = v + 1;
        }
      }
      m = out; n = size * 2;
    }
    return m;
  })();

  function paper(w, h, seed) {
    var n = U.makeNoise(seed || 7);
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d');
    var img = g.createImageData(w, h);
    var d = img.data;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        var f = n.fbm2(x / 34, y / 34, 4) * 34 + n.n2(x / 3.1, y / 3.1) * 22;
        var v = 150 + f;
        d[i] = v + 12; d[i + 1] = v + 6; d[i + 2] = v - 6; d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  /* Normaliza a faixa tonal da placa antes do dithering: sem isto, quadros
     escuros (Goya, Bosch) viram mancha preta. Estica o percentil 1..99. */
  function autoLevels(canvas, loP, hiP) {
    if (!canReadPixels) return canvas;
    var w = canvas.width, h = canvas.height;
    var g = canvas.getContext('2d');
    var img, d;
    try { img = g.getImageData(0, 0, w, h); d = img.data; } catch (e) { return canvas; }
    var hist = new Uint32Array(256);
    for (var i = 0; i < d.length; i += 4) hist[d[i]]++;
    var total = (d.length / 4), lo = 0, hi = 255, acc = 0;
    var loTarget = total * (loP == null ? 0.012 : loP), hiTarget = total * (hiP == null ? 0.992 : hiP);
    for (var v = 0; v < 256; v++) { acc += hist[v]; if (acc >= loTarget) { lo = v; break; } }
    acc = 0;
    for (var v2 = 255; v2 >= 0; v2--) { acc += hist[v2]; if (acc >= total - hiTarget) { hi = v2; break; } }
    if (hi - lo < 12) { hi = Math.min(255, lo + 12); }
    var scale = 255 / (hi - lo);
    var lut = new Uint8ClampedArray(256);
    for (var k = 0; k < 256; k++) {
      var t = U.clamp((k - lo) * scale / 255, 0, 1);
      lut[k] = Math.pow(t, 0.88) * 255;            // gama leve: devolve os meios-tons
    }
    for (var j = 0; j < d.length; j += 4) {
      var nv = lut[d[j]];
      d[j] = nv * 0.99; d[j + 1] = nv * 0.975; d[j + 2] = nv * 0.93;
    }
    g.putImageData(img, 0, 0);
    return canvas;
  }

  /* Dithering ordenado com quantização em níveis: a assinatura visual da obra. */
  function dither(canvas, levels, amount) {
    if (!canReadPixels) return canvas;
    var w = canvas.width, h = canvas.height;
    var g = canvas.getContext('2d');
    var img, d;
    try { img = g.getImageData(0, 0, w, h); d = img.data; } catch (e) { return canvas; }
    var steps = levels - 1;
    for (var y = 0; y < h; y++) {
      var by = y & 7;
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        var v = d[i] / 255;
        var t = (BAYER[by][x & 7] + 0.5) / 64 - 0.5;
        var q = Math.round((v + t * amount) * steps) / steps;
        var out = U.clamp(q, 0, 1) * 255;
        d[i] = out * 0.99; d[i + 1] = out * 0.975; d[i + 2] = out * 0.93;   // leve calor de papel
      }
    }
    g.putImageData(img, 0, 0);
    return canvas;
  }

  /* Sem leitura de pixels: trama fina por mesclagem (dá o mesmo parentesco gráfico). */
  function weave(canvas, strength) {
    var w = canvas.width, h = canvas.height;
    var g = canvas.getContext('2d');
    var tile = document.createElement('canvas'); tile.width = tile.height = 8;
    var t = tile.getContext('2d');
    t.fillStyle = '#808080'; t.fillRect(0, 0, 8, 8);
    t.fillStyle = '#c8c8c8';
    for (var i = 0; i < 8; i += 2) { t.fillRect(i, 0, 1, 8); }
    t.fillStyle = '#4a4a4a';
    for (var j = 1; j < 8; j += 2) { t.fillRect(0, j, 8, 1); }
    g.save();
    g.globalAlpha = strength == null ? 0.32 : strength;
    g.globalCompositeOperation = 'overlay';
    g.fillStyle = g.createPattern(tile, 'repeat');
    g.fillRect(0, 0, w, h);
    g.restore();
    return canvas;
  }

  function blit(dst, src, dx, dy, dw, dh, alpha, blend, filter) {
    var g = dst.getContext('2d');
    g.save();
    if (alpha != null) g.globalAlpha = alpha;
    if (blend) g.globalCompositeOperation = blend;
    ctxFilter(g, filter || 'none');
    g.drawImage(src, dx, dy, dw, dh);
    g.restore();
  }

  function processPlate(name, image, opts) {
    opts = opts || {};
    var maxSide = opts.maxSide || 1000;
    var scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    var w = Math.max(2, Math.round(image.naturalWidth * scale));
    var h = Math.max(2, Math.round(image.naturalHeight * scale));

    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d');

    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    ctxFilter(g, 'grayscale(1) contrast(1.30) brightness(1.02)');
    g.drawImage(image, 0, 0, w, h);
    ctxFilter(g, 'none');

    // Reforço de tinta: cópia deslocada em multiply fecha os traços da gravura.
    blit(c, c, 1, 1, w, h, 0.42, 'multiply');
    blit(c, c, -1, 0, w, h, 0.26, 'multiply');

    // Gama: os meios-tons afundam, o papel continua claro.
    blit(c, c, 0, 0, w, h, 0.5, 'multiply');

    // Papel: um pouco de matéria sob a imagem, sem clarear o preto.
    var sheet = paper(Math.min(512, w), Math.min(512, h), (name.length * 977) | 0);
    blit(c, sheet, 0, 0, w, h, 0.16, 'soft-light');

    // A sonda inicial não basta: um canvas só se revela tingido ao receber
    // uma imagem de outra origem (arquivo aberto direto do disco, por exemplo).
    var legivel = canReadPixels;
    if (legivel) {
      try { g.getImageData(0, 0, 1, 1); } catch (e) { legivel = false; canReadPixels = false; }
    }

    if (legivel && opts.dither !== false) {
      autoLevels(c, 0.012, 0.992);
      dither(c, opts.levels || 5, opts.ditherAmount == null ? 0.34 : opts.ditherAmount);
    } else {
      // Sem leitura de pixels: os níveis automáticos não são possíveis,
      // então a compensação vem dos filtros.
      blit(c, c, 0, 0, w, h, null, 'source-over', 'brightness(1.34) contrast(1.26)');
      weave(c, 0.30);
    }

    // Vinheta interna da placa: a obra tem bordas que já escurecem.
    var rg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.22, w / 2, h / 2, Math.max(w, h) * 0.74);
    rg.addColorStop(0, 'rgba(0,0,0,0)');
    rg.addColorStop(1, 'rgba(0,0,0,0.58)');
    g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = rg; g.fillRect(0, 0, w, h); g.restore();

    // Bloom pré-cozido: brilho barato em tempo real.
    var bloom = document.createElement('canvas');
    bloom.width = Math.max(2, Math.round(w / 3)); bloom.height = Math.max(2, Math.round(h / 3));
    var bg = bloom.getContext('2d');
    ctxFilter(bg, 'blur(6px) brightness(1.35) contrast(1.3)');
    bg.drawImage(c, 0, 0, bloom.width, bloom.height);
    ctxFilter(bg, 'none');

    // Miniatura para uso em DOM (parede do museu): clareada, porque na parede
    // ela é a obra, não o fundo.
    var thumbC = document.createElement('canvas');
    var ts = 420 / Math.max(w, h);
    thumbC.width = Math.max(2, Math.round(w * ts)); thumbC.height = Math.max(2, Math.round(h * ts));
    var tg = thumbC.getContext('2d');
    ctxFilter(tg, 'grayscale(0.85) contrast(1.14) brightness(1.42)');
    tg.drawImage(c, 0, 0, thumbC.width, thumbC.height);
    ctxFilter(tg, 'none');
    var mini = '';
    try { mini = thumbC.toDataURL('image/jpeg', 0.66); } catch (e) { mini = ''; }

    return {
      name: name, w: w, h: h, aspect: w / h,
      canvas: c, bloom: bloom,
      thumb: mini || ((opts && opts.dir ? opts.dir : 'assets/source/') + name + '.jpg'),
      dither: legivel && opts.dither !== false
    };
  }

  function load(name, opts) {
    if (cache[name] && !opts) return Promise.resolve(cache[name]);
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        try { resolve(processPlate(name, img, opts)); }
        catch (e) { reject(e); }
      };
      img.onerror = function () { reject(new Error('placa ausente: ' + name)); };
      img.src = (opts && opts.dir ? opts.dir : 'assets/source/') + name + '.jpg';
    });
  }

  function loadMany(map) {
    var names = Object.keys(map);
    return Promise.all(names.map(function (n) {
      return load(n, map[n]).then(function (p) { cache[n] = p; return p; })
        .catch(function () { return null; });
    })).then(function (plates) {
      var out = {};
      names.forEach(function (n, i) { if (plates[i]) out[n] = plates[i]; });
      return out;
    });
  }

  function tile(size, seed, alpha) {
    var c = document.createElement('canvas'); c.width = c.height = size;
    var g = c.getContext('2d');
    var img = g.createImageData(size, size);
    var d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = 118 + Math.random() * 96;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = alpha == null ? 255 : alpha;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  A.texture = {
    load: load, loadMany: loadMany, process: processPlate, tile: tile,
    paper: paper, dither: dither, weave: weave,
    canReadPixels: function () { return canReadPixels; },
    hasFilter: function () { return filterProbe; }
  };
})(window.ACERVO = window.ACERVO || {});
