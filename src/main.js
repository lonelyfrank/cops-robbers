import './style.css';
import './consoleShell.css';
import { GameState, PHASES } from './gameState.js';
import { createSceneManager } from './sceneManager.js';
import { getStopX } from './mapLayout.js';
import { CharacterController } from './characterController.js';
import { createUI } from './ui/createUI.js';
import { createMotionPreference } from './motionPreference.js';
import { getRoundTheme } from './cityThemes.js';
import { createBootScreen } from './ui/bootScreen.js';

const game = new GameState();
const motion = createMotionPreference(),
  events = new AbortController();
const canvas = document.getElementById('game-canvas');
const boot = createBootScreen({ motion });
let unsubscribeScene = () => {};
let sceneManager,
  characters,
  animationFrame,
  failed = false;
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

let previousPhase = '',
  previousRound = -1;
function synchronizeScene(s) {
  if (!sceneManager || failed) return;
  if (s.round !== previousRound || (s.phase === PHASES.IDLE && previousPhase !== PHASES.IDLE)) {
    characters.reset();
    sceneManager.reset(getRoundTheme(s.round).id);
  }
  if (s.phase !== previousPhase || s.round !== previousRound) {
    if (s.phase === PHASES.RUNNING) {
      characters.run(s.crossing + 1, () => game.finishCrossing());
    } else if (s.phase === PHASES.CAUGHT) {
      characters.caught(s.crossing + 1, () => game.finishCaught());
    } else if (s.phase === PHASES.ESCAPING) {
      characters.escape(() => game.finishEscape());
    }
  }
  characters.setLoot(s.multiplier, s.crossing);
  sceneManager.setMovement(s.phase === PHASES.RUNNING ? s.crossing + 1 : null);
  sceneManager.setPhase(s.phase);
  sceneManager.setCrossingTarget(s);
  previousPhase = s.phase;
  previousRound = s.round;
}

function fail(message, error) {
  failed = true;
  cancelAnimationFrame(animationFrame);
  ui.showError(message);
  disposeScene();
  if (error) console.error('Cops&Robbers:', error);
}

async function initialize() {
  // Let the branded loading screen paint before preparing WebGL.
  await new Promise((resolve) => {
    setTimeout(resolve, 40);
  });
  if (events.signal.aborted) return;
  try {
    sceneManager = createSceneManager(canvas, document.getElementById('stage'), { motion });
    characters = new CharacterController(sceneManager.scene, {
      reducedMotion: sceneManager.reducedMotion,
    });
    sceneManager.setThief(characters.thief.root);
    unsubscribeScene = game.subscribe(synchronizeScene);
    motion.subscribe((reduced) => {
      characters.reducedMotion = reduced;
    });
    let lastTime = performance.now(),
      elapsed = 0;
    const frame = (now) => {
      if (failed) return;
      try {
        // Hidden tabs never advance an animation behind the player.
        const dt = document.hidden ? 0 : Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        if (!document.hidden) {
          elapsed += dt;
          characters.update(dt, elapsed);
          const s = game.snapshot;
          sceneManager.follow(
            s.phase === PHASES.RUNNING ? characters.thief.root.position.x : getStopX(s.crossing),
          );
          sceneManager.update(dt, elapsed);
        }
        animationFrame = requestAnimationFrame(frame);
      } catch (error) {
        fail(
          'La scena si è interrotta. Ricarica per ricominciare la demo con 1.000 crediti virtuali.',
          error,
        );
      }
    };
    // Render once before enabling a stake, so initialization errors cannot consume it.
    sceneManager.update(0, 0);
    boot.finish().then((complete) => {
      if (complete && !failed && !events.signal.aborted) ui.setReady(true);
    });
    animationFrame = requestAnimationFrame(frame);
    document.addEventListener(
      'visibilitychange',
      () => {
        lastTime = performance.now();
      },
      { signal: events.signal },
    );
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

function disposeScene() {
  boot.dispose();
  events.abort();
  unsubscribeScene();
  motion.dispose();
  sceneManager?.dispose();
}

if (import.meta.hot)
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(animationFrame);
    ui.dispose();
    disposeScene();
  });
