/* O ACERVO — js/core/util.js
   Utilidades matemáticas, ruído, DOM e persistência. Sem dependências. */
(function (A) {
  'use strict';

  var TAU = Math.PI * 2;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function inv(a, b, v) { return b === a ? 0 : clamp((v - a) / (b - a), 0, 1); }
  function smoothstep(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }

  /* Aproximação de ruído de valor 1D/2D com interpolação suave. Barato e suficiente. */
  function makeNoise(seed) {
    var p = new Uint8Array(512);
    var s = (seed | 0) || 1;
    function next() { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) / 4294967296); }
    var perm = new Uint8Array(256);
    for (var i = 0; i < 256; i++) perm[i] = i;
    for (var j = 255; j > 0; j--) { var k = (next() * (j + 1)) | 0; var t = perm[j]; perm[j] = perm[k]; perm[k] = t; }
    for (var m = 0; m < 512; m++) p[m] = perm[m & 255];
    function grad2(h, x, y) {
      switch (h & 3) {
        case 0: return x + y; case 1: return -x + y; case 2: return x - y; default: return -x - y;
      }
    }
    return {
      rnd: next,
      n1: function (x) {
        var xi = Math.floor(x), xf = x - xi, u = smoothstep(xf);
        return lerp(p[xi & 255] / 255, p[(xi + 1) & 255] / 255, u) * 2 - 1;
      },
      n2: function (x, y) {
        var xi = Math.floor(x), yi = Math.floor(y);
        var xf = x - xi, yf = y - yi;
        var u = smoothstep(xf), v = smoothstep(yf);
        var aa = grad2(p[(xi & 255) + p[yi & 255]], xf, yf);
        var ba = grad2(p[((xi + 1) & 255) + p[yi & 255]], xf - 1, yf);
        var ab = grad2(p[(xi & 255) + p[(yi + 1) & 255]], xf, yf - 1);
        var bb = grad2(p[((xi + 1) & 255) + p[(yi + 1) & 255]], xf - 1, yf - 1);
        return lerp(lerp(aa, ba, u), lerp(ab, bb, u), v);
      },
      fbm2: function (x, y, oct) {
        var amp = 0.5, f = 1, sum = 0, norm = 0;
        for (var i = 0; i < (oct || 3); i++) { sum += this.n2(x * f, y * f) * amp; norm += amp; amp *= 0.5; f *= 2.03; }
        return sum / norm;
      }
    };
  }

  var uid = 0;
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    n.dataset.uid = String(++uid);
    return n;
  }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function nextFrame() { return new Promise(function (r) { requestAnimationFrame(function () { r(); }); }); }

  function fmtClock(sec) {
    sec = Math.max(0, sec);
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  var ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  function roman(n) { return ROMAN[n] || String(n); }

  function shuffle(arr, rnd) {
    rnd = rnd || Math.random;
    for (var i = arr.length - 1; i > 0; i--) { var j = (rnd() * (i + 1)) | 0; var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  }

  /* Persistência tolerante a falhas (file:// + modo privado). */
  var store = {
    key: 'acervo.registro.v1',
    read: function () {
      try { return JSON.parse(localStorage.getItem(this.key) || '{}') || {}; } catch (e) { return {}; }
    },
    write: function (obj) {
      try { localStorage.setItem(this.key, JSON.stringify(obj)); return true; } catch (e) { return false; }
    },
    clear: function () { try { localStorage.removeItem(this.key); } catch (e) { } }
  };

  function prefersReduced() {
    try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  /* Marcas de tempo de hesitação: usado nas estatísticas que a obra devolve ao visitante. */
  function makeMetrics() {
    var t0 = performance.now();
    return {
      t0: t0,
      elapsed: function () { return (performance.now() - t0) / 1000; },
      distance: 0,
      beats: 0,
      clicks: 0,
      hesitations: 0,
      longestPause: 0,
      perAct: {},
      noteAct: function (id, seconds) { this.perAct[id] = (this.perAct[id] || 0) + seconds; }
    };
  }

  A.util = {
    TAU: TAU, clamp: clamp, lerp: lerp, inv: inv, smoothstep: smoothstep,
    easeOutCubic: easeOutCubic, easeInOutSine: easeInOutSine, makeNoise: makeNoise,
    el: el, qs: qs, qsa: qsa, wait: wait, nextFrame: nextFrame,
    fmtClock: fmtClock, roman: roman, shuffle: shuffle, store: store,
    prefersReduced: prefersReduced, makeMetrics: makeMetrics,
    rand: function (a, b) { return a + Math.random() * (b - a); },
    randInt: function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
    pick: function (arr) { return arr[(Math.random() * arr.length) | 0]; },
    dist: function (x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx * dx + dy * dy); }
  };
})(window.ACERVO = window.ACERVO || {});
