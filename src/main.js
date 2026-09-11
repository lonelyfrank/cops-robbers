import './style.css';
import './consoleShell.css';
import { GameState } from './gameState.js';
import { createSceneManager } from './sceneManager.js';
import { CharacterController } from './characterController.js';
import { createUI } from './ui/createUI.js';
import { createBootScreen } from './ui/bootScreen.js';
import { createMotionPreference } from './motionPreference.js';
import { createGameLoop } from './runtime/GameLoop.js';
import { createGameRuntime } from './runtime/GameRuntime.js';

/**
 * Composition root: build the dependencies, start the runtime, and tear everything
 * down again on a fatal error or an HMR replacement. The coordination itself lives in
 * `runtime/GameRuntime.js`, the frame timing in `runtime/GameLoop.js`.
 */
const game = new GameState();
const motion = createMotionPreference();
const boot = createBootScreen({ motion });
// One scope for the listeners this module owns, so an HMR replacement drops them all.
const events = new AbortController();
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game-canvas'));
const stage = /** @type {HTMLElement} */ (document.getElementById('stage'));

const ui = createUI(
  game,
  {
    start: (amount) => game.start(amount),
    advance: () => game.advance(),
    cashout: () => game.cashout(),
    reset: () => game.resetDemo(),
  },
  { motion },
);

let scene, actors, loop;
let unsubscribe = () => {};
let unsubscribeMotion = () => {};
let failed = false;

/**
 * @param {string} message Shown to the player, in place of the controls.
 * @param {unknown} [error]
 */
function fail(message, error) {
  failed = true;
  ui.showError(message);
  release();
  if (error) console.error('Cops&Robbers:', error);
}

function release() {
  events.abort();
  loop?.dispose();
  boot.dispose();
  unsubscribe();
  unsubscribeMotion();
  motion.dispose();
  scene?.dispose();
}

async function initialize() {
  // Let the branded loading screen paint before preparing WebGL.
  await new Promise((resolve) => {
    setTimeout(resolve, 40);
  });
  if (failed || events.signal.aborted) return;
  try {
    scene = createSceneManager(canvas, stage, { motion });
    actors = new CharacterController(scene.scene, { reducedMotion: scene.reducedMotion });
    scene.setThief(actors.thief.root);
    unsubscribeMotion = motion.subscribe((reduced) => {
      actors.reducedMotion = reduced;
    });

    const runtime = createGameRuntime({ game, scene, actors });
    unsubscribe = runtime.start();
    loop = createGameLoop(runtime.update, {
      onError: (error) =>
        fail(
          'La scena si è interrotta. Ricarica per ricominciare la demo con 1.000 crediti virtuali.',
          error,
        ),
    });

    // Render once before enabling a stake, so an initialization error cannot consume it.
    scene.update(0, 0);
    loop.start();
    boot.finish().then((complete) => {
      if (complete && !failed && !events.signal.aborted) ui.setReady(true);
    });

    canvas.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault();
        fail(
          'La connessione alla grafica è stata interrotta. Ricarica per riavviare la demo con 1.000 crediti virtuali.',
        );
      },
      { signal: events.signal },
    );
  } catch (error) {
    fail(
      'Questo browser non riesce ad avviare WebGL 2. Prova un browser aggiornato con accelerazione grafica attiva.',
      error,
    );
  }
}
void initialize();

if (import.meta.hot)
  import.meta.hot.dispose(() => {
    ui.dispose();
    release();
  });
