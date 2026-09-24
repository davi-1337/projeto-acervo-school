/* O ACERVO — js/core/field.js
   O compositor da cena. Camadas de gravura com paralaxe, fatiadas e deslocadas
   por ruído e pela pressa da mão; depois grão, aberração, bloom, vinheta e rasgo. */
(function (A) {
  'use strict';
  var U = A.util;

  var main = null, scene = null, sc = null, post = null, pc = null;
  var W = 0, H = 0, SW = 0, SH = 0, dpr = 1;
  var layers = [];
  var noise = U.makeNoise(1337);
  var vignette = null, grainTile = null, glowTmp = null;
  var time = 0;
  var occlusion = 0, occlusionTarget = 0, exposure = 1;
  var tearAmount = 0;
  var shakeAmount = 0, shakeDecay = 0;
  var backdrop = '#07070a';

  function mount(node) {
    main = node;
    main.width = 64; main.height = 64;
    scene = document.createElement('canvas');
    post = document.createElement('canvas');
    sc = scene.getContext('2d', { alpha: false });
    pc = post.getContext('2d', { alpha: false });
    resize();
    return main;
  }

  function resize() {
    if (!main) return;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.max(320, Math.round(innerWidth));
    H = Math.max(240, Math.round(innerHeight));
    var maxPixels = 2.6e6;
    var s = Math.min(1, Math.sqrt(maxPixels / (W * H * dpr * dpr)));
    var cw = Math.round(W * dpr * s), chh = Math.round(H * dpr * s);
    main.width = cw; main.height = chh;
    main.style.width = W + 'px'; main.style.height = H + 'px';
    SW = Math.round(cw * 0.62); SH = Math.round(chh * 0.62);
    scene.width = SW; scene.height = SH;
    post.width = cw; post.height = chh;
    glowTmp = document.createElement('canvas');
    glowTmp.width = Math.max(2, SW >> 2); glowTmp.height = Math.max(2, SH >> 2);
    buildVignette();
    buildGrain();
  }

  function buildVignette() {
    vignette = document.createElement('canvas');
    vignette.width = SW; vignette.height = SH;
    var g = vignette.getContext('2d');
    var rg = g.createRadialGradient(SW / 2, SH / 2, Math.min(SW, SH) * 0.14, SW / 2, SH / 2, Math.max(SW, SH) * 0.78);
    rg.addColorStop(0, 'rgba(0,0,0,0)');
    rg.addColorStop(0.62, 'rgba(0,0,0,0.30)');
    rg.addColorStop(1, 'rgba(0,0,0,0.92)');
    g.fillStyle = rg; g.fillRect(0, 0, SW, SH);
  }

  function buildGrain() {
    grainTile = A.texture.tile(256, 9, 255);
  }

  /* Camada de placa: profundidade controla paralaxe e escala. */
  function addLayer(cfg) {
    var l = {
      plate: cfg.plate,
      x: cfg.x == null ? 0.5 : cfg.x,
      y: cfg.y == null ? 0.5 : cfg.y,
      scale: cfg.scale == null ? 1 : cfg.scale,
      depth: cfg.depth == null ? 0.5 : cfg.depth,
      alpha: cfg.alpha == null ? 1 : cfg.alpha,
      alphaTarget: cfg.alpha == null ? 1 : cfg.alpha,
      blend: cfg.blend || 'source-over',
      warp: cfg.warp == null ? 0.35 : cfg.warp,
      breathe: cfg.breathe == null ? 0.01 : cfg.breathe,
      speedWarp: cfg.speedWarp == null ? 1 : cfg.speedWarp,
      strips: cfg.strips || 26,
      drift: cfg.drift || 0,
      visible: true,
      blur: cfg.blur || 0,
      tone: cfg.tone || null
    };
    layers.push(l);
    return l;
  }

  function removeLayer(l) {
    var i = layers.indexOf(l);
    if (i >= 0) layers.splice(i, 1);
  }
  function clearLayers() { layers.length = 0; }

  function drawLayer(g, l, dt) {
    var p = l.plate;
    // O alpha sobe antes de qualquer descarte: uma camada que nasce invisível
    // precisa poder aparecer.
    l.alpha = U.lerp(l.alpha, l.alphaTarget, Math.min(1, dt * 2.4));
    if (!p || !l.visible || (l.alpha <= 0.002 && l.alphaTarget <= 0.002)) return;
    var look = A.input.look();
    var speed = A.input.state.speed;
    var breathe = Math.sin(time * 0.19 + l.depth * 6.28) * l.breathe;

    var fit = Math.max(SW / p.w, SH / p.h) * l.scale * (1 + l.depth * 0.06) * (1 + breathe);
    var dw = p.w * fit, dh = p.h * fit;
    var cx = SW * (0.5 + (l.x - 0.5)) + look.x * l.depth * 62 + Math.sin(time * 0.07 + l.depth * 3) * l.drift;
    var cy = SH * (0.5 + (l.y - 0.5)) + look.y * l.depth * 42 + Math.cos(time * 0.06 + l.depth * 2) * l.drift * 0.6;
    var dx = cx - dw / 2, dy = cy - dh / 2;

    var w = l.warp * (1 + Math.min(2.2, speed / 700) * l.speedWarp);
    var n = Math.max(6, Math.round(l.strips));
    var sw = dw / n;

    g.save();
    g.globalAlpha = l.alpha;
    g.globalCompositeOperation = l.blend;
    if (l.tone) { g.save(); g.globalCompositeOperation = 'source-over'; }
    for (var i = 0; i < n; i++) {
      var t = i / n;
      var sx = (i / n) * p.w;
      var sWidth = p.w / n;
      var off = noise.fbm2(t * 3.1 + time * 0.11, l.depth * 4.2, 3) * w * 26;
      var offY = noise.n2(t * 5.3 - time * 0.07, l.depth * 2.7) * w * 7;
      var x = dx + i * sw + off;
      var y = dy + offY;
      // Fatias fora da tela são descartadas: o custo só existe onde há imagem.
      if (x > SW + 4 || x + sw < -4) continue;
      g.drawImage(p.canvas, sx, 0, sWidth, p.h, x, y, sw + 0.7, dh);
    }
    if (l.bloom) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = l.alpha * 0.12;
      g.drawImage(p.bloom, dx - dw * 0.02, dy - dh * 0.02, dw * 1.04, dh * 1.04);
    }
    g.restore();
  }

  function frame(dt) {
    if (!sc) return;
    time += dt;
    occlusion = U.lerp(occlusion, occlusionTarget, Math.min(1, dt * 3.4));
    shakeAmount *= Math.pow(0.06, dt);

    sc.save();
    sc.fillStyle = backdrop;
    sc.fillRect(0, 0, SW, SH);
    sc.globalCompositeOperation = 'lighter';
    sc.globalAlpha = 0.03 * exposure;
    sc.fillStyle = '#20242e';
    sc.fillRect(0, 0, SW, SH);
    sc.restore();

    for (var i = 0; i < layers.length; i++) drawLayer(sc, layers[i], dt);

    // Rebaixamento geral: as gravuras voltam a ser tinta sobre breu, não névoa.
    sc.save();
    sc.globalCompositeOperation = 'multiply';
    sc.globalAlpha = 0.34;
    sc.fillStyle = 'rgb(122,122,132)';
    sc.fillRect(0, 0, SW, SH);
    sc.restore();

    // Vinheta interna
    sc.save();
    sc.globalCompositeOperation = 'multiply';
    sc.drawImage(vignette, 0, 0);
    sc.restore();

    if (occlusion > 0.002) {
      sc.save();
      sc.globalAlpha = occlusion * 0.97;
      sc.fillStyle = '#000';
      sc.fillRect(0, 0, SW, SH);
      sc.restore();
    }

    compose(dt);
  }

  function compose(dt) {
    var sx = shakeAmount * 22, sy = shakeAmount * 14;
    var rnd = Math.random;
    pc.save();
    pc.globalCompositeOperation = 'source-over';
    pc.fillStyle = backdrop;
    pc.fillRect(0, 0, post.width, post.height);
    pc.globalAlpha = U.clamp(0.55 + exposure * 0.6, 0, 1.4);
    pc.drawImage(scene, (rnd() - 0.5) * sx, (rnd() - 0.5) * sy, post.width, post.height);
    pc.restore();

    // Aberração cromática: as bordas da imagem não concordam entre si.
    if (exposure > 0.2) {
      pc.save();
      pc.globalCompositeOperation = 'lighter';
      pc.globalAlpha = 0.16;
      if (A.texture.hasFilter()) pc.filter = 'sepia(1) saturate(6) hue-rotate(-42deg) brightness(0.8)';
      pc.drawImage(scene, 1.9 + sx, (rnd() - 0.5) * sy, post.width, post.height);
      if (A.texture.hasFilter()) pc.filter = 'sepia(1) saturate(6) hue-rotate(150deg) brightness(0.75)';
      pc.drawImage(scene, -1.9 - sx, (rnd() - 0.5) * sy, post.width, post.height);
      pc.restore();
    }

    // Brilho: a luz da sala vaza sobre as próprias obras.
    if (glowTmp && exposure > 0.2) {
      var g2 = glowTmp.getContext('2d');
      g2.globalCompositeOperation = 'source-over';
      g2.clearRect(0, 0, glowTmp.width, glowTmp.height);
      if (A.texture.hasFilter()) g2.filter = 'blur(5px) brightness(1.7)';
      g2.drawImage(scene, 0, 0, glowTmp.width, glowTmp.height);
      if (A.texture.hasFilter()) g2.filter = 'none';
      pc.save();
      pc.globalCompositeOperation = 'lighter';
      pc.globalAlpha = 0.30 * exposure;
      pc.drawImage(glowTmp, 0, 0, post.width, post.height);
      pc.restore();
    }

    // Grão animado
    if (grainTile) {
      pc.save();
      pc.globalAlpha = 0.075;
      pc.globalCompositeOperation = 'overlay';
      var gx = -((Math.random() * 256) | 0), gy = -((Math.random() * 256) | 0);
      var pat = pc.createPattern(grainTile, 'repeat');
      pc.translate(gx, gy);
      pc.fillStyle = pat;
      pc.fillRect(0, 0, post.width + 256, post.height + 256);
      pc.restore();
    }

    if (tearAmount > 0.001) tear();

    var c = main.getContext('2d');
    c.save();
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#000';
    c.fillRect(0, 0, main.width, main.height);
    c.drawImage(post, 0, 0);
    c.restore();
  }

  /* Rasgo: a imagem se divide em tiras que perdem o lugar. */
  function tear() {
    var n = Math.round(U.lerp(6, 34, tearAmount));
    var h = post.height / n;
    pc.save();
    pc.globalCompositeOperation = 'source-over';
    for (var i = 0; i < n; i++) {
      var y = i * h;
      var off = (Math.random() - 0.5) * tearAmount * 190;
      if (Math.random() < tearAmount * 0.16) {
        pc.fillStyle = 'rgba(0,0,0,' + (0.5 + Math.random() * 0.5).toFixed(2) + ')';
        pc.fillRect(0, y, post.width, h);
        continue;
      }
      pc.drawImage(post, 0, y, post.width, h, off, y, post.width, h);
    }
    pc.restore();
  }

  function setBackdrop(color) { backdrop = color; }

  A.field = {
    mount: mount, resize: resize, addLayer: addLayer, removeLayer: removeLayer,
    clearLayers: clearLayers, frame: frame, setBackdrop: setBackdrop,
    sceneCtx: function () { return sc; },
    canvas: function () { return main; },
    size: function () { return { w: SW, h: SH, ow: W, oh: H }; },
    /* Fechar os olhos, perder a luz, tremer: estados globais da imagem. */
    eyes: function (v) { occlusionTarget = U.clamp(v, 0, 1); },
    eyesNow: function () { return occlusion; },
    setExposure: function (v) { exposure = v; },
    tear: function (v) { tearAmount = U.clamp(v, 0, 1); },
    shake: function (v) { shakeAmount = Math.min(1.4, shakeAmount + v); },
    isTearing: function () { return tearAmount > 0.001; },
    layers: function () { return layers; }
  };
})(window.ACERVO = window.ACERVO || {});
