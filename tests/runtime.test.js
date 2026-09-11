import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameLoop } from '../src/runtime/GameLoop.js';
import { createGameRuntime } from '../src/runtime/GameRuntime.js';
import { GameState, PHASES } from '../src/core/gameState.js';
import { MAX_CROSSINGS } from '../src/config/gameplay.js';
import { getStopX } from '../src/world/mapLayout.js';
import { getRoundTheme } from '../src/world/cityThemes.js';

/**
 * Drive requestAnimationFrame by hand, so a frame time is an input and not a wait.
 * @param {import('node:test').TestContext} t
 */
function stubFrames(t) {
  /** @type {((now: number) => void)[]} */
  let pending = [];
  let id = 0;
  let hidden = false;
  const saved = ['requestAnimationFrame', 'cancelAnimationFrame', 'document', 'performance'].map(
    (key) => [key, Reflect.get(globalThis, key)],
  );
  /** @type {any} */
  const listeners = [];
  Reflect.set(globalThis, 'requestAnimationFrame', (/** @type {any} */ callback) => {
    pending.push(callback);
    return ++id;
  });
  Reflect.set(globalThis, 'cancelAnimationFrame', () => {
    pending = [];
  });
  Reflect.set(globalThis, 'document', {
    get hidden() {
      return hidden;
    },
    addEventListener: (/** @type {string} */ type, /** @type {any} */ handler) =>
      listeners.push([type, handler]),
  });
  let clock = 0;
  Reflect.set(globalThis, 'performance', { now: () => clock });

  t.after(() => {
    for (const [key, value] of saved)
      if (value === undefined) Reflect.deleteProperty(globalThis, key);
      else Reflect.set(globalThis, key, value);
  });

  return {
    /** Run one frame at an absolute timestamp, in milliseconds. */
    frame(now) {
      clock = now;
      const due = pending;
      pending = [];
      for (const callback of due) callback(now);
    },
    hide(value = true) {
      hidden = value;
    },
    fireVisibilityChange() {
      for (const [type, handler] of listeners) if (type === 'visibilitychange') handler();
    },
    get scheduled() {
      return pending.length;
    },
    set clock(value) {
      clock = value;
    },
  };
}

test('The loop clamps a long frame and keeps its own elapsed clock', (t) => {
  const frames = stubFrames(t);
  /** @type {[number, number][]} */
  const steps = [];
  const loop = createGameLoop((dt, elapsed) => steps.push([dt, elapsed]));

  loop.start();
  frames.frame(16);
  frames.frame(32);
  // A stalled tab, a breakpoint or a slow first paint must not teleport the simulation.
  frames.frame(2000);
  loop.stop();

  assert.equal(steps.length, 3);
  assert.ok(Math.abs(steps[0][0] - 0.016) < 1e-9);
  assert.ok(Math.abs(steps[1][0] - 0.016) < 1e-9);
  assert.equal(steps[2][0], 0.05, 'the long frame is clamped');
  assert.ok(Math.abs(steps[2][1] - (0.016 + 0.016 + 0.05)) < 1e-9);
  assert.ok(Math.abs(loop.elapsed - steps[2][1]) < 1e-9);
  loop.dispose();
});

test('A hidden tab neither updates nor accumulates time, and returning does not jump', (t) => {
  const frames = stubFrames(t);
  /** @type {number[]} */
  const deltas = [];
  const loop = createGameLoop((dt) => deltas.push(dt));

  loop.start();
  frames.frame(16);
  frames.hide(true);
  frames.frame(5000);
  assert.deepEqual(deltas.length, 1, 'no update while hidden');

  frames.hide(false);
  frames.clock = 9000;
  frames.fireVisibilityChange();
  frames.frame(9016);
  assert.equal(deltas.length, 2);
  assert.ok(Math.abs(deltas[1] - 0.016) < 1e-9, 'the time spent away is not replayed');
  loop.dispose();
});

test('Stopping cancels the pending frame; a failing update reports once and stops', (t) => {
  const frames = stubFrames(t);
  let updates = 0;
  const loop = createGameLoop(() => {
    updates++;
    throw new Error('scene lost');
  });
  /** @type {unknown[]} */
  const errors = [];
  const failing = createGameLoop(
    () => {
      throw new Error('scene lost');
    },
    { onError: (error) => errors.push(error) },
  );

  loop.start();
  assert.equal(frames.scheduled, 1);
  loop.stop();
  assert.equal(frames.scheduled, 0, 'no frame is left queued');
  loop.dispose();
  assert.equal(updates, 0);

  failing.start();
  frames.frame(16);
  assert.equal(errors.length, 1);
  assert.equal(frames.scheduled, 0, 'the loop does not reschedule after a failure');
  frames.frame(32);
  assert.equal(errors.length, 1, 'the error is reported once');
  failing.dispose();
});

/** Minimal stand-ins that record what the runtime asked the world to do. */
function stubWorld() {
  const log = [];
  const thief = { root: { position: { x: 0 } } };
  const actors = {
    thief,
    reset: () => log.push(['reset']),
    run: (n, done) => {
      log.push(['run', n]);
      actors.finish = done;
    },
    caught: (n, done) => {
      log.push(['caught', n]);
      actors.finish = done;
    },
    escape: (done) => {
      log.push(['escape']);
      actors.finish = done;
    },
    setLoot: (multiplier, crossing) => log.push(['loot', multiplier, crossing]),
    update: (dt) => log.push(['update', dt]),
    /** @type {undefined | (() => void)} */
    finish: undefined,
  };
  const scene = {
    /** @type {import('../src/core/types.js').CaptureState} */
    capture: { caught: false, sirenIntensity: 0, captureIntensity: 0 },
    reset: (theme) => log.push(['scene-reset', theme]),
    setMovement: (n) => log.push(['movement', n]),
    setPhase: (phase) => log.push(['phase', phase]),
    setCrossingTarget: (s) => log.push(['target', s.crossing]),
    follow: (x) => log.push(['follow', x]),
    update: () => log.push(['render']),
  };
  const overlay = {
    render: (state) => log.push(['overlay', state.captureIntensity]),
    clear: () => log.push(['overlay-clear']),
  };
  return {
    actors,
    scene,
    overlay,
    log,
    only: (name) => log.filter(([kind]) => kind === name),
  };
}

test('Green run: the runtime animates the crossing and the callback settles it once', () => {
  const world = stubWorld();
  const game = new GameState({ random: () => 0 });
  const runtime = createGameRuntime({ game, ...world });
  const unsubscribe = runtime.start();

  game.start(2500);
  assert.deepEqual(world.only('run'), [['run', 1]]);
  world.actors.finish?.();
  assert.equal(game.snapshot.phase, PHASES.READY);
  assert.equal(game.snapshot.crossing, 1);
  // A settled decision must not start a second animation on its own.
  assert.deepEqual(world.only('run'), [['run', 1]]);
  assert.equal(game.snapshot.balance, 97500, 'the stake is taken exactly once');

  unsubscribe();
});

test('Red: the arrest plays once, records one loss and leaves the balance alone', () => {
  const world = stubWorld();
  const game = new GameState({ random: () => 0.999 });
  const runtime = createGameRuntime({ game, ...world });
  const unsubscribe = runtime.start();

  game.start(2500);
  assert.deepEqual(world.only('caught'), [['caught', 1]]);
  const balance = game.snapshot.balance;
  world.actors.finish?.();
  assert.equal(game.snapshot.phase, PHASES.RESULT);
  assert.equal(game.snapshot.balance, balance, 'losing settles no money at the end');
  assert.equal(game.snapshot.history.length, 1);
  assert.equal(game.snapshot.history[0].outcome, 'lost');
  assert.deepEqual(world.only('caught'), [['caught', 1]]);

  unsubscribe();
});

test('Cashout: one escape animation, one credit, one history entry', () => {
  const world = stubWorld();
  const game = new GameState({ random: () => 0 });
  const runtime = createGameRuntime({ game, ...world });
  const unsubscribe = runtime.start();

  game.start(2500);
  world.actors.finish?.();
  game.cashout();
  const credited = game.snapshot.balance;
  assert.deepEqual(world.only('escape'), [['escape']]);
  world.actors.finish?.();
  assert.equal(game.snapshot.phase, PHASES.RESULT);
  assert.equal(game.snapshot.balance, credited, 'completing the escape credits nothing again');
  assert.equal(game.snapshot.history.length, 1);
  assert.equal(game.snapshot.history[0].outcome, 'won');
  assert.deepEqual(world.only('escape'), [['escape']]);

  unsubscribe();
});

test('The twelfth crossing pays out automatically and goes straight to the escape', () => {
  const world = stubWorld();
  const game = new GameState({ random: () => 0 });
  const runtime = createGameRuntime({ game, ...world });
  /** @type {string[]} */
  const phases = [];
  const unsubscribeSpy = game.subscribe((s) => phases.push(s.phase));
  const unsubscribe = runtime.start();

  game.start(2500);
  for (let n = 1; n < MAX_CROSSINGS; n++) {
    world.actors.finish?.();
    game.advance();
  }
  world.actors.finish?.();

  assert.equal(game.snapshot.crossing, MAX_CROSSINGS);
  assert.equal(game.snapshot.phase, PHASES.ESCAPING);
  assert.equal(phases.filter((phase) => phase === PHASES.ESCAPING).length, 1);
  assert.equal(
    phases.lastIndexOf(PHASES.READY) < phases.lastIndexOf(PHASES.ESCAPING),
    true,
    'the final settlement never exposes a public READY at twelve',
  );
  assert.deepEqual(world.only('escape'), [['escape']]);
  assert.equal(world.only('run').length, MAX_CROSSINGS);

  unsubscribeSpy();
  unsubscribe();
});

test('A new round rebuilds the city with the theme of that round, before anything moves', () => {
  const world = stubWorld();
  const game = new GameState({ random: () => 0 });
  const runtime = createGameRuntime({ game, ...world });
  const unsubscribe = runtime.start();

  // Subscribing paints the preview round; accepting a run rebuilds with its own theme.
  assert.deepEqual(world.only('scene-reset'), [['scene-reset', getRoundTheme(0).id]]);

  game.start(2500);
  assert.deepEqual(world.only('scene-reset'), [
    ['scene-reset', getRoundTheme(0).id],
    ['scene-reset', getRoundTheme(1).id],
  ]);
  // Actors reset, then the city, then the animation: nothing moves on the old district.
  const order = world.log.map(([kind]) => kind);
  assert.ok(order.lastIndexOf('reset') < order.lastIndexOf('scene-reset'));
  assert.ok(order.lastIndexOf('scene-reset') < order.indexOf('run'));

  // Continuing inside the same round must not rebuild the city again.
  world.actors.finish?.();
  game.advance();
  assert.equal(world.only('scene-reset').length, 2);

  unsubscribe();
});

test('Capture stays as renderer state: the runtime forwards it, the renderer has no DOM', () => {
  const world = stubWorld();
  const game = new GameState({ random: () => 0.999 });
  const runtime = createGameRuntime({ game, ...world });
  const unsubscribe = runtime.start();

  runtime.update(0.016, 0.016);
  assert.deepEqual(world.only('overlay').at(-1), ['overlay', 0]);

  // The arrest lights up: the renderer only reports a number.
  game.start(2500);
  world.scene.capture = { caught: true, sirenIntensity: 0.8, captureIntensity: 0.21 };
  runtime.update(0.016, 0.032);
  assert.deepEqual(world.only('overlay').at(-1), ['overlay', 0.21]);

  // A new round wipes the flash immediately, without waiting for the next frame.
  world.actors.finish?.();
  assert.equal(game.snapshot.phase, PHASES.RESULT);
  game.start(2500);
  assert.equal(
    world.only('overlay-clear').length,
    world.only('scene-reset').length,
    'every city rebuild clears the flash exactly once',
  );
  const order = world.log.map(([kind]) => kind);
  assert.ok(order.lastIndexOf('scene-reset') < order.lastIndexOf('overlay-clear'));

  unsubscribe();
});

test('The camera follows the thief while running and the safe stop otherwise', () => {
  const world = stubWorld();
  const game = new GameState({ random: () => 0 });
  const runtime = createGameRuntime({ game, ...world });
  const unsubscribe = runtime.start();

  runtime.update(0.016, 0.016);
  assert.deepEqual(world.only('follow').at(-1), ['follow', getStopX(0)]);

  game.start(2500);
  world.actors.thief.root.position.x = 7.25;
  runtime.update(0.016, 0.032);
  assert.deepEqual(world.only('follow').at(-1), ['follow', 7.25]);

  world.actors.finish?.();
  runtime.update(0.016, 0.048);
  assert.deepEqual(world.only('follow').at(-1), ['follow', getStopX(1)]);
  assert.equal(world.only('render').length, 3, 'one render per simulation step');

  unsubscribe();
});
