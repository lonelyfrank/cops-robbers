/**
 * CAM 01–12 strip: the junctions of the run, their multipliers and the current state.
 *
 * The list is rebuilt once and then only re-labelled, keyed on everything that can
 * change its appearance, so a re-render for an unrelated reason costs nothing.
 */
import { MAX_CROSSINGS } from '../../config/gameplay.js';
import { getMultiplier } from '../../core/gameMath.js';
import { formatMultiplier } from '../../core/format.js';
import { PHASES } from '../../core/gameState.js';
import { el } from '../dom.js';

/** @type {import('../../core/types.js').GamePhase[]} */
const UPCOMING_PHASES = [PHASES.IDLE, PHASES.READY, PHASES.RUNNING];

/**
 * @param {{ motion?: import('../../core/types.js').MotionPreference }} [options]
 */
export function createRouteDisplay({ motion = { reduced: false } } = {}) {
  const route = el('route');
  // A remount must not leave the previous strip behind.
  route.replaceChildren();
  const steps = Array.from({ length: MAX_CROSSINGS }, (_, i) => {
    const item = document.createElement('li');
    item.className = 'route-step';
    const camera = document.createElement('span');
    camera.className = 'step-camera';
    camera.textContent = 'CAM';
    const number = document.createElement('span');
    number.className = 'step-n';
    number.textContent = String(i + 1).padStart(2, '0');
    const multi = document.createElement('span');
    multi.className = 'step-multi';
    item.append(camera, number, multi);
    route.appendChild(item);
    return { item, multi };
  });
  let key = '';

  return {
    /**
     * @param {import('../../core/types.js').GameSnapshot} s
     * @param {import('../view.js').View} view
     */
    render(s, { arrived, changedPhase, pendingCrossing }) {
      const nextKey = `${s.difficulty}:${s.crossing}:${s.phase}:${arrived}`;
      if (nextKey === key) return;
      key = nextKey;
      for (let i = 0; i < steps.length; i++) {
        const n = i + 1,
          step = steps[i];
        const multiplier = formatMultiplier(getMultiplier(n, s.difficulty));
        step.multi.textContent = `${multiplier}×`;
        step.item.className = 'route-step';
        step.item.classList.toggle('is-current', n === s.crossing);
        step.item.classList.toggle('is-arriving', n === s.crossing && arrived);
        step.item.classList.toggle('is-passed', n < s.crossing);
        step.item.classList.toggle(
          'is-next',
          n === pendingCrossing && UPCOMING_PHASES.includes(s.phase),
        );
        step.item.classList.toggle(
          'is-caught',
          n === pendingCrossing &&
            (s.phase === PHASES.CAUGHT || (s.phase === PHASES.RESULT && s.payout === 0)),
        );
        step.item.setAttribute(
          'aria-label',
          `Incrocio ${n}, moltiplicatore ${multiplier}${n <= s.crossing ? ', superato' : ''}`,
        );
      }
      if (changedPhase && s.crossing > 0) {
        const target = steps[Math.min(s.crossing, MAX_CROSSINGS - 1)].item;
        route.scrollTo({
          left:
            target.offsetLeft - route.offsetLeft - route.clientWidth / 2 + target.clientWidth / 2,
          behavior: motion.reduced ? 'instant' : 'smooth',
        });
      } else if (s.crossing === 0) route.scrollLeft = 0;
    },
  };
}
