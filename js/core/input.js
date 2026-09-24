/* O ACERVO — js/core/input.js
   Toda a percepção de entrada da obra. Nada aqui reage por conta própria:
   os atos leem o estado; a obra é quem decide o que é gesto. */
(function (A) {
  'use strict';
  var U = A.util;

  var listeners = {};
  function emit(type, data) { (listeners[type] || []).forEach(function (f) { try { f(data); } catch (e) { console.error(e); } }); }

  var state = {
    x: innerWidth / 2, y: innerHeight / 2,
    px: innerWidth / 2, py: innerHeight / 2,
    nx: 0, ny: 0,                 // normalizado -1..1 em relação ao centro
    vx: 0, vy: 0, speed: 0,       // px/s suavizado
    down: false, rightDown: false,
    first: true,                  // nenhum movimento ainda
    idle: 0,                      // segundos sem movimento relevante
    lastMove: performance.now(),
    keys: Object.create(null),
    taps: Object.create(null),    // teclas pressionadas e ainda não consumidas
    anywhere: false,              // qualquer clique na tela (usado pelos atos)
    wheel: 0,
    touch: false,
    motion: { x: 0, y: 0, ok: false }  // giroscópio, quando existir
  };

  function on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return function () { off(ev, fn); }; }
  function off(ev, fn) { var a = listeners[ev] || []; var i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); }

  function setPos(x, y) {
    if (state.first) { state.px = x; state.py = y; state.first = false; }
    state.x = x; state.y = y;
  }

  addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') state.touch = true;
    setPos(e.clientX, e.clientY);
  }, { passive: true });

  addEventListener('touchmove', function (e) {
    if (e.touches[0]) setPos(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  addEventListener('pointerdown', function (e) {
    state.down = true;
    if (e.button === 2) state.rightDown = true;
    state.anywhere = true;
    emit('down', e);
  });
  addEventListener('pointerup', function (e) {
    if (e.button === 2) state.rightDown = false; else state.down = false;
    emit('up', e);
  });
  addEventListener('pointercancel', function () { state.down = false; state.rightDown = false; });
  addEventListener('blur', function () { state.down = false; state.rightDown = false; });

  addEventListener('keydown', function (e) {
    if (e.repeat) return;
    state.keys[e.code] = true;
    state.taps[e.code] = true;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') e.preventDefault();
    emit('key', e);
  });
  addEventListener('keyup', function (e) { state.keys[e.code] = false; });
  addEventListener('wheel', function (e) { state.wheel += e.deltaY; emit('wheel', e.deltaY); }, { passive: true });
  addEventListener('contextmenu', function (e) { e.preventDefault(); });

  if (A.util.prefersReduced()) state.reduced = true;

  function tick(dt) {
    var dx = state.x - state.px, dy = state.y - state.py;
    var d = Math.sqrt(dx * dx + dy * dy);
    var inst = dt > 0 ? d / dt : 0;
    state.speed = U.lerp(state.speed, inst, Math.min(1, dt * 6));
    state.vx = U.lerp(state.vx, dt > 0 ? dx / dt : 0, Math.min(1, dt * 6));
    state.vy = U.lerp(state.vy, dt > 0 ? dy / dt : 0, Math.min(1, dt * 6));
    state.distance = (state.distance || 0) + d;
    state.px = state.x; state.py = state.y;
    state.nx = (state.x / innerWidth) * 2 - 1;
    state.ny = (state.y / innerHeight) * 2 - 1;

    if (d > 1.2) { state.lastMove = performance.now(); state.idle = 0; }
    else state.idle += dt;

    A.util.__metricsDirty = true;
  }

  /* Giroscópio: o aparelho vira olho. Silencioso quando indisponível. */
  function enableMotion() {
    function handler(e) {
      state.motion.ok = true;
      state.motion.x = U.clamp((e.gamma || 0) / 35, -1, 1);
      state.motion.y = U.clamp(((e.beta || 0) - 45) / 35, -1, 1);
    }
    if (window.DeviceOrientationEvent) {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(function (r) { if (r === 'granted') addEventListener('deviceorientation', handler); }).catch(function () { });
      } else addEventListener('deviceorientation', handler);
    }
  }

  /* Olhar efetivo: mistura ponteiro e giroscópio. Usado pelas salas de arquitetura. */
  function look() {
    if (state.motion.ok) return { x: state.nx * 0.35 + state.motion.x * 0.65, y: state.ny * 0.35 + state.motion.y * 0.65 };
    return { x: state.nx, y: state.ny };
  }

  function take(code) { if (state.taps[code]) { state.taps[code] = false; return true; } return false; }
  function held(code) { return !!state.keys[code]; }
  function takeAnyClick() { if (state.anywhere) { state.anywhere = false; return true; } return false; }

  A.input = {
    state: state, on: on, off: off, tick: tick, look: look,
    take: take, held: held, takeAnyClick: takeAnyClick,
    enableMotion: enableMotion,
    consumeWheel: function () { var w = state.wheel; state.wheel = 0; return w; },
    /* Silencia o ponteiro por N ms: a obra perde você por um instante. */
    blind: false
  };
})(window.ACERVO = window.ACERVO || {});
