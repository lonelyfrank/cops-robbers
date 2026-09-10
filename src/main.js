import './style.css';
import { GameState, PHASES } from './gameState.js';
import { createSceneManager, getStopX } from './sceneManager.js';
import { CharacterController } from './characterController.js';
import { createUI } from './ui.js';

const game = new GameState();
let sceneManager, characters, animationFrame, failed = false;
const ui = createUI(game, {
  start: amount => game.start(amount),
  advance: () => game.advance(),
  cashout: () => game.cashout(),
  reset: () => game.resetDemo(),
});

let previousPhase = '', previousRound = -1;
function synchronizeScene(s) {
  if (!sceneManager || failed) return;
  if (s.round !== previousRound || (s.phase === PHASES.IDLE && previousPhase !== PHASES.IDLE)) {
    characters.reset(); sceneManager.reset();
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
  previousPhase = s.phase; previousRound = s.round;
}

function fail(message, error) {
  failed = true; cancelAnimationFrame(animationFrame); ui.showError(message);
  if (error) console.error('Cops&Robbers:', error);
}

try {
  sceneManager = createSceneManager(document.getElementById('game-canvas'), document.getElementById('stage'));
  characters = new CharacterController(sceneManager.scene, { reducedMotion: sceneManager.reducedMotion });
  sceneManager.setThief(characters.thief.root);
  game.subscribe(synchronizeScene);
  let lastTime = performance.now(), elapsed = 0;
  const frame = now => {
    if (failed) return;
    try {
      // Hidden tabs never advance an animation behind the player.
      const dt = document.hidden ? 0 : Math.min((now - lastTime) / 1000, .05);
      lastTime = now;
      if (!document.hidden) {
        elapsed += dt;
        characters.update(dt);
        const s = game.snapshot;
        sceneManager.follow(s.phase === PHASES.RUNNING ? characters.thief.root.position.x : getStopX(s.crossing));
        sceneManager.update(dt, elapsed);
      }
      animationFrame = requestAnimationFrame(frame);
    } catch (error) {
      fail('La scena si è interrotta. Ricarica per ricominciare la demo con 1.000 crediti virtuali.', error);
    }
  };
  // Render once before enabling a stake, so initialization errors cannot consume it.
  sceneManager.update(0, 0);
  ui.setReady(true);
  animationFrame = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { lastTime = performance.now(); });
  document.getElementById('game-canvas').addEventListener('webglcontextlost', event => {
    event.preventDefault(); fail('La connessione alla grafica è stata interrotta. Ricarica per riavviare la demo con 1.000 crediti virtuali.');
  });
} catch (error) {
  fail('Questo browser non riesce ad avviare WebGL 2. Prova un browser aggiornato con accelerazione grafica attiva.', error);
}

if (import.meta.hot) import.meta.hot.dispose(() => { cancelAnimationFrame(animationFrame); ui.dispose(); sceneManager?.dispose(); });
