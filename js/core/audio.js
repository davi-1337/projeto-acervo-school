/* O ACERVO — js/core/audio.js
   Todo o som da obra é sintetizado em tempo real (Web Audio). Nenhum arquivo.
   A estratégia é desconforto físico: batimento lento entre osciladores quase iguais,
   subgraves que se sentem mais do que se ouvem, respiração de sala e silêncios longos. */
(function (A) {
  'use strict';
  var U = A.util;

  var ctx = null, master = null, comp = null, tone = null, dry = null, verb = null, verbGain = null;
  var droneNodes = null, roomNoise = null, inkNode = null;
  var ready = false, masterLevel = 0.85, silenced = false, beatCount = 0;
  var beatHooks = [];
  var analyser = null, levelData = null;
  var voices = [];
  var scene = 'atrio';

  var SCENES = {
    // nome: [fundamental, batimento, corte do filtro, caráter]
    atrio: { root: 55.00, beat: 0.55, cutoff: 240, fifth: 1.5, air: 0.10 },
    arquitetura: { root: 49.00, beat: 0.83, cutoff: 190, fifth: 1.414, air: 0.14 },
    legendas: { root: 58.27, beat: 1.21, cutoff: 320, fifth: 1.5, air: 0.08 },
    espelho: { root: 61.74, beat: 0.37, cutoff: 210, fifth: 1.335, air: 0.16 },
    contagem: { root: 41.20, beat: 0.90, cutoff: 170, fifth: 1.5, air: 0.06 },
    acervo: { root: 36.71, beat: 0.31, cutoff: 150, fifth: 1.19, air: 0.12 },
    fim: { root: 32.70, beat: 0.24, cutoff: 130, fifth: 1.0, air: 0.05 }
  };

  function now() { return ctx ? ctx.currentTime : 0; }

  function makeImpulse(seconds, decay) {
    var rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    var buf = ctx.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        var t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (1 - t * 0.15);
      }
    }
    return buf;
  }

  function noiseBuffer(seconds) {
    var rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    var buf = ctx.createBuffer(1, len, rate);
    var d = buf.getChannelData(0), lastOut = 0;
    for (var i = 0; i < len; i++) {
      var white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;   // ruído marrom: mais grave, mais orgânico
      d[i] = lastOut * 3.2;
    }
    return buf;
  }

  function init() {
    if (ready) { resume(); return true; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC({ latencyHint: 'interactive' });

    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 22; comp.ratio.value = 3.2;
    comp.attack.value = 0.006; comp.release.value = 0.35;
    master = ctx.createGain();
    master.gain.value = 0.0001;

    tone = ctx.createBiquadFilter();
    tone.type = 'lowpass'; tone.frequency.value = 5200; tone.Q.value = 0.4;

    analyser = ctx.createAnalyser();
    analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.85;
    levelData = new Uint8Array(analyser.frequencyBinCount);

    verb = ctx.createConvolver();
    verb.buffer = makeImpulse(5.5, 2.6);
    verbGain = ctx.createGain(); verbGain.gain.value = 0.5;
    dry = ctx.createGain(); dry.gain.value = 1;

    dry.connect(tone); tone.connect(comp);
    verb.connect(verbGain); verbGain.connect(comp);
    comp.connect(analyser); analyser.connect(master); master.connect(ctx.destination);

    buildDrone();
    buildRoom();
    buildInk();

    ready = true;
    master.gain.setValueAtTime(0.0001, now());
    master.gain.exponentialRampToValueAtTime(masterLevel, now() + 3.2);
    setTimeout(loadVoices, 400);
    return true;
  }

  function noiseSource(seconds, loop) {
    var s = ctx.createBufferSource();
    s.buffer = noiseBuffer(seconds || 4);
    s.loop = !!loop;
    return s;
  }

  function buildDrone() {
    var g = ctx.createGain(); g.gain.value = 0.0001;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240; lp.Q.value = 2.5;
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.043;
    var lfoGain = ctx.createGain(); lfoGain.gain.value = 90;
    lfo.connect(lfoGain); lfoGain.connect(lp.frequency);

    var a = ctx.createOscillator(); a.type = 'sine';
    var b = ctx.createOscillator(); b.type = 'sine';
    var c = ctx.createOscillator(); c.type = 'triangle';   // quinta desafinada
    var sub = ctx.createOscillator(); sub.type = 'sine';   // subgraves: pressão no peito

    var ga = ctx.createGain(); ga.gain.value = 0.5;
    var gb = ctx.createGain(); gb.gain.value = 0.42;
    var gc = ctx.createGain(); gc.gain.value = 0.14;
    var gsub = ctx.createGain(); gsub.gain.value = 0.30;

    a.connect(ga); b.connect(gb); c.connect(gc); sub.connect(gsub);
    ga.connect(lp); gb.connect(lp); gc.connect(lp); gsub.connect(lp);
    lp.connect(g);
    g.connect(dry); g.connect(verb);

    [a, b, c, sub, lfo].forEach(function (o) { o.start(); });
    droneNodes = { gain: g, lp: lp, a: a, b: b, c: c, sub: sub, air: null };
    setScene(scene, 0);
  }

  function buildRoom() {
    // Respiração do edifício: ruído marrom muito filtrado, com um ciclo longo de 11s.
    var src = noiseSource(6, true);
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.7;
    var g = ctx.createGain(); g.gain.value = 0.0001;
    var lfo = ctx.createOscillator(); lfo.frequency.value = 1 / 11;
    var lfoGain = ctx.createGain(); lfoGain.gain.value = 0.035;
    lfo.connect(lfoGain); lfoGain.connect(g.gain);
    src.connect(bp); bp.connect(g); g.connect(dry); g.connect(verb);
    src.start(); lfo.start();
    roomNoise = { gain: g };
  }

  function buildInk() {
    // Tinta: o som do próprio traço. Segue a velocidade da mão.
    var src = noiseSource(3, true);
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 1.6;
    var g = ctx.createGain(); g.gain.value = 0.0001;
    src.connect(bp); bp.connect(g); g.connect(dry);
    src.start();
    inkNode = { gain: g, bp: bp };
  }

  function setScene(name, seconds) {
    scene = name;
    if (!ready) return;
    var s = SCENES[name] || SCENES.atrio;
    var t = now(), ramp = seconds == null ? 4.5 : seconds;
    if (ramp <= 0) {
      droneNodes.a.frequency.value = s.root;
      droneNodes.b.frequency.value = s.root * (1 + s.beat / 100);
      droneNodes.c.frequency.value = s.root * s.fifth;
      droneNodes.sub.frequency.value = s.root / 2;
      droneNodes.lp.frequency.value = s.cutoff;
      if (roomNoise) roomNoise.gain.gain.value = Math.max(0.0002, s.air * 0.5);
      return;
    }
    var n = droneNodes;
    [n.a, n.b, n.c, n.sub].forEach(function (o, i) {
      var f = i === 0 ? s.root : i === 1 ? s.root * (1 + s.beat / 100)
        : i === 2 ? s.root * s.fifth : s.root / 2;
      o.frequency.cancelScheduledValues(t);
      o.frequency.setValueAtTime(Math.max(12, o.frequency.value), t);
      o.frequency.exponentialRampToValueAtTime(Math.max(12, f), t + ramp);
    });
    n.lp.frequency.cancelScheduledValues(t);
    n.lp.frequency.setValueAtTime(n.lp.frequency.value, t);
    n.lp.frequency.exponentialRampToValueAtTime(s.cutoff, t + ramp);
    if (roomNoise) {
      roomNoise.gain.gain.cancelScheduledValues(t);
      roomNoise.gain.gain.setValueAtTime(Math.max(0.0001, roomNoise.gain.gain.value), t);
      roomNoise.gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, s.air * 0.5), t + ramp * 1.4);
    }
  }

  function drone(level, seconds) {
    if (!ready) return;
    var t = now();
    droneNodes.gain.gain.cancelScheduledValues(t);
    droneNodes.gain.gain.setValueAtTime(Math.max(0.0001, droneNodes.gain.gain.value), t);
    droneNodes.gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, level), t + (seconds || 3));
  }

  function beat(strength) {
    if (!ready || silenced) return;
    strength = strength == null ? 1 : strength;
    beatCount++;                 // o número que o visitante precisa descobrir depois
    for (var i = 0; i < beatHooks.length; i++) { try { beatHooks[i](beatCount, strength); } catch (e) { } }
    var t = now();
    thump(t, 62, 0.9 * strength, 0.16);
    thump(t + 0.17, 47, 0.55 * strength, 0.26);
    A.util.__metricsDirty = true;
  }
  function thump(t, freq, gain, dur) {
    var o = ctx.createOscillator(); o.type = 'sine';
    var g = ctx.createGain();
    o.frequency.setValueAtTime(freq * 1.6, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.72, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * 0.32, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dry); g.connect(verb);
    o.start(t); o.stop(t + dur + 0.05);
    clean([o, g], (dur + 0.25) * 1000);
  }

  function hit(type) {
    if (!ready || silenced) return;
    var t = now();
    var cfg = {
      door: { f: 138, mod: 2.01, dur: 2.6, g: 0.20, sweep: 0.55 },
      place: { f: 196, mod: 3.02, dur: 1.8, g: 0.14, sweep: 1.0 },
      wrong: { f: 92, mod: 1.41, dur: 1.4, g: 0.20, sweep: 0.7 },
      reveal: { f: 73, mod: 1.01, dur: 5.0, g: 0.22, sweep: 0.4 },
      mark: { f: 320, mod: 2.63, dur: 0.9, g: 0.09, sweep: 1.2 },
      erase: { f: 110, mod: 1.18, dur: 3.4, g: 0.16, sweep: 0.6 }
    }[type] || { f: 150, mod: 2.0, dur: 1.5, g: 0.12, sweep: 1 };

    var carrier = ctx.createOscillator(); carrier.type = 'sine';
    var modOsc = ctx.createOscillator(); modOsc.type = 'sine';
    var modGain = ctx.createGain();
    var g = ctx.createGain();
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200;

    carrier.frequency.setValueAtTime(cfg.f, t);
    carrier.frequency.exponentialRampToValueAtTime(cfg.f * cfg.sweep, t + cfg.dur);
    modOsc.frequency.value = cfg.f * cfg.mod;
    modGain.gain.setValueAtTime(cfg.f * 2.4, t);
    modGain.gain.exponentialRampToValueAtTime(cfg.f * 0.2, t + cfg.dur * 0.8);
    modOsc.connect(modGain); modGain.connect(carrier.frequency);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(cfg.g, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + cfg.dur);
    carrier.connect(g); g.connect(lp); lp.connect(dry); lp.connect(verb);
    carrier.start(t); modOsc.start(t);
    carrier.stop(t + cfg.dur + 0.1); modOsc.stop(t + cfg.dur + 0.1);
    clean([carrier, g, modOsc, modGain, lp], (cfg.dur + 0.4) * 1000);
  }

  function whisper(pan) {
    if (!ready || silenced) return;
    var t = now(), dur = 1.4 + Math.random() * 1.2;
    var src = noiseSource(2);
    var f1 = ctx.createBiquadFilter(); f1.type = 'bandpass';
    f1.frequency.value = 620 + Math.random() * 500; f1.Q.value = 6;
    var f2 = ctx.createBiquadFilter(); f2.type = 'bandpass';
    f2.frequency.value = 1750 + Math.random() * 900; f2.Q.value = 9;
    var trem = ctx.createGain(); trem.gain.value = 1;
    var lfo = ctx.createOscillator(); lfo.frequency.value = 6 + Math.random() * 4;
    var lfoG = ctx.createGain(); lfoG.gain.value = 0.85;
    lfo.connect(lfoG); lfoG.connect(trem.gain);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) panner.pan.value = pan == null ? (Math.random() * 2 - 1) : pan;
    src.connect(f1); f1.connect(f2); f2.connect(trem); trem.connect(g);
    if (panner) { g.connect(panner); panner.connect(dry); panner.connect(verb); } else { g.connect(dry); g.connect(verb); }
    src.start(t); lfo.start(t);
    src.stop(t + dur); lfo.stop(t + dur);
    clean([src, g, f1, f2, trem], (dur + 0.3) * 1000);
  }

  function riser(seconds) {
    if (!ready || silenced) return;
    seconds = seconds || 3.5;
    var t = now();
    var src = noiseSource(6, true);
    var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3.5;
    bp.frequency.setValueAtTime(180, t);
    bp.frequency.exponentialRampToValueAtTime(5200, t + seconds);
    var o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(40, t);
    o.frequency.exponentialRampToValueAtTime(680, t + seconds);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + seconds * 0.85);
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds + 0.25);
    var og = ctx.createGain(); og.gain.value = 0.35;
    src.connect(bp); bp.connect(g); o.connect(og); og.connect(g);
    g.connect(dry); g.connect(verb);
    src.start(t); o.start(t);
    src.stop(t + seconds + 0.3); o.stop(t + seconds + 0.3);
    clean([src, g, bp], (seconds + 0.5) * 1000);
    clean([o, og], (seconds + 0.5) * 1000);
  }

  function tapeStop(seconds) {
    if (!ready) return;
    var t = now(), dur = seconds || 1.6, n = droneNodes;
    [n.a, n.b, n.c, n.sub].forEach(function (o) {
      var f = o.frequency.value;
      o.frequency.cancelScheduledValues(t);
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(12, f * 0.32), t + dur);
      o.frequency.setValueAtTime(f * 0.32, t + dur);
      o.frequency.exponentialRampToValueAtTime(f, t + dur * 2.2);
    });
  }

  /* Silêncio: a obra sai da sala. Retorna quando terminar. */
  function silence(seconds, fadeIn) {
    if (!ready) return Promise.resolve();
    var t = now(), hold = seconds || 5, fi = fadeIn == null ? 2.2 : fadeIn;
    silenced = true;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t);
    master.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    master.gain.setValueAtTime(0.0001, t + 1.1 + hold);
    master.gain.exponentialRampToValueAtTime(masterLevel, t + 1.1 + hold + fi);
    setTimeout(function () { silenced = false; }, (1.1 + hold + fi) * 1000);
    return U.wait((1.1 + hold + fi) * 1000);
  }

  /* Tinta audível: chamada a cada quadro com a velocidade da mão. */
  function ink(speed, active) {
    if (!ready) return;
    var t = now();
    var target = active ? U.clamp(speed / 2200, 0, 1) * 0.05 : 0.0001;
    inkNode.gain.gain.cancelScheduledValues(t);
    inkNode.gain.gain.setTargetAtTime(Math.max(0.0001, target), t, 0.06);
    inkNode.bp.frequency.setTargetAtTime(1600 + Math.min(2600, speed), t, 0.1);
  }

  function clean(nodes, delayMs) {
    setTimeout(function () {
      nodes.forEach(function (n) { try { n.disconnect(); } catch (e) { } });
    }, Math.max(200, delayMs || 200));
  }

  function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    var grab = function () {
      voices = speechSynthesis.getVoices().filter(function (v) { return /pt/i.test(v.lang); });
    };
    grab();
    speechSynthesis.onvoiceschanged = grab;
  }

  /* A voz do acervo: síntese de fala do sistema, desacelerada e rebaixada.
     Quando não existe, o som continua: a contagem vira sino. */
  function speak(text, opts) {
    opts = opts || {};
    if (!('speechSynthesis' in window)) { if (opts.fallback) opts.fallback(); return false; }
    if (!voices.length) loadVoices();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR';
    if (voices[0]) u.voice = voices[0];
    u.rate = opts.rate == null ? 0.72 : opts.rate;
    u.pitch = opts.pitch == null ? 0.35 : opts.pitch;
    u.volume = opts.volume == null ? 0.75 : opts.volume;
    try { speechSynthesis.speak(u); } catch (e) { return false; }
    return true;
  }

  function level() {
    if (!ready) return 0;
    analyser.getByteFrequencyData(levelData);
    var sum = 0;
    for (var i = 0; i < 24; i++) sum += levelData[i];
    return sum / (24 * 255);
  }

  function resume() {
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    var t = now();
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t);
    master.gain.exponentialRampToValueAtTime(masterLevel, t + 1.8);
  }
  function suspend() {
    if (!ctx) return;
    if (ctx.state === 'running') ctx.suspend();
  }
  function setMaster(v) {
    masterLevel = U.clamp(v, 0, 1);
    if (ready && !silenced) master.gain.setTargetAtTime(masterLevel, now(), 0.2);
  }

  A.audio = {
    init: init, resume: resume, suspend: suspend, setMaster: setMaster,
    isReady: function () { return ready; },
    context: function () { return ctx; },
    setScene: setScene, drone: drone, beat: beat, hit: hit, whisper: whisper,
    riser: riser, tapeStop: tapeStop, silence: silence, ink: ink, speak: speak,
    level: level, hasVoice: function () { return voices.length > 0; },
    beats: function () { return beatCount; },
    resetBeats: function () { beatCount = 0; },
    onBeat: function (fn) { beatHooks.push(fn); return function () { var i = beatHooks.indexOf(fn); if (i >= 0) beatHooks.splice(i, 1); }; }
  };
})(window.ACERVO = window.ACERVO || {});
