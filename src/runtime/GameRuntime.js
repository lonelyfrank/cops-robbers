/**
 * Orchestration between the state machine and the scene.
 *
 * `GameState` decides what happens; the runtime decides what the world has to do about
 * it. It owns no rendering and no rules: it reacts to snapshots and drives the actors,
 * the streamed city and the renderer. Keeping it out of `main.js` leaves the entry point
 * as a composition root.
 */
import { PHASES } from '../core/gameState.js';
import { getStopX } from '../world/mapLayout.js';
import { getRoundTheme } from '../world/cityThemes.js';

/**
 * What the runtime needs from the actors. Declared structurally, so the contract is
 * explicit and a test can drive the orchestration without a Three.js scene.
 *
 * @typedef {object} ActorSystem
 * @property {{ root: { position: { x: number } } }} thief
 * @property {() => void} reset
 * @property {(n: number, onComplete: () => void) => void} run
 * @property {(n: number, onComplete: () => void) => void} caught
 * @property {(onComplete: () => void) => void} escape
 * @property {(multiplier: number, crossing: number) => void} setLoot
 * @property {(dt: number, elapsed: number) => void} update
 *
 * What the runtime needs from the rendering side.
 *
 * @typedef {object} SceneSystem
 * @property {(themeId: import('../core/types.js').CityThemeId) => void} reset
 * @property {(crossing: number | null) => void} setMovement
 * @property {(phase: import('../core/types.js').GamePhase) => void} setPhase
 * @property {(s: import('../core/types.js').GameSnapshot) => void} setCrossingTarget
 * @property {(x: number) => void} follow
 * @property {(dt: number, elapsed: number) => void} update
 * @property {import('../core/types.js').CaptureState} capture State of the last frame.
 *
 * The page-side surface for effects the renderer only describes.
 *
 * @typedef {object} EffectOverlay
 * @property {(state: import('../core/types.js').CaptureState) => void} render
 * @property {() => void} clear
 */

/**
 * @param {object} deps
 * @param {import('../core/gameState.js').GameState} deps.game
 * @param {SceneSystem} deps.scene
 * @param {ActorSystem} deps.actors
 * @param {EffectOverlay} [deps.overlay] Applies the renderer's effect state to the page.
 */
export function createGameRuntime({ game, scene, actors, overlay }) {
  // Sentinels that make the first snapshot count as a change in every branch.
  let previousPhase = '';
  let previousRound = -1;

  /**
   * A new round, or a return to idle, rebuilds the city before anything else moves.
   * @param {import('../core/types.js').GameSnapshot} s
   */
  function sync(s) {
    const newRound = s.round !== previousRound;
    if (newRound || (s.phase === PHASES.IDLE && previousPhase !== PHASES.IDLE)) {
      actors.reset();
      scene.reset(getRoundTheme(s.round).id);
      overlay?.clear();
    }
    if (s.phase !== previousPhase || newRound) {
      if (s.phase === PHASES.RUNNING) actors.run(s.crossing + 1, () => game.finishCrossing());
      else if (s.phase === PHASES.CAUGHT) actors.caught(s.crossing + 1, () => game.finishCaught());
      else if (s.phase === PHASES.ESCAPING) actors.escape(() => game.finishEscape());
    }
    actors.setLoot(s.multiplier, s.crossing);
    scene.setMovement(s.phase === PHASES.RUNNING ? s.crossing + 1 : null);
    scene.setPhase(s.phase);
    scene.setCrossingTarget(s);
    previousPhase = s.phase;
    previousRound = s.round;
  }

  /**
   * One simulation step. The camera follows the thief while a crossing resolves and the
   * safe stop otherwise, so it never drifts ahead of an animation that has not started.
   *
   * @param {number} dt Seconds since the previous frame.
   * @param {number} elapsed Seconds on the shared animation clock.
   */
  function update(dt, elapsed) {
    actors.update(dt, elapsed);
    const s = game.snapshot;
    scene.follow(s.phase === PHASES.RUNNING ? actors.thief.root.position.x : getStopX(s.crossing));
    scene.update(dt, elapsed);
    overlay?.render(scene.capture);
  }

  return {
    sync,
    update,
    /** @returns {() => void} Unsubscribe from the state machine. */
    start() {
      return game.subscribe(sync);
    },
  };
}
