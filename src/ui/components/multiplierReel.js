import { getMultiplier } from '../../core/gameMath.js';
import { MAX_CROSSINGS } from '../../config/gameplay.js';
import { formatMultiplier } from '../../core/format.js';

export const REEL_DURATION = 550;
const EASING = 'cubic-bezier(.22,.8,.22,1)';

/**
 * @typedef {object} ReelValues
 * @property {number} previousMultiplier
 * @property {number} currentMultiplier
 * @property {number | null} nextMultiplier
 */

/**
 * Presentation only: a settled result retains the difficulty of the completed round.
 * @param {import('../../core/types.js').GameSnapshot} snapshot
 * @returns {ReelValues}
 */
export function getReelValues(snapshot) {
  const { crossing, phase, multiplier, difficulty, history } = snapshot;
  const settledDifficulty =
    phase === 'result' ? (history?.[0]?.difficulty ?? difficulty) : difficulty;
  return {
    previousMultiplier: crossing === 0 ? 0 : getMultiplier(crossing - 1, settledDifficulty),
    currentMultiplier: phase === 'idle' ? 1 : multiplier,
    nextMultiplier:
      crossing === MAX_CROSSINGS ? null : getMultiplier(crossing + 1, settledDifficulty),
  };
}

/** @param {number} slot */
const pose = (slot) => ({
  transform: `translateY(-50%) translateY(calc(var(--reel-step) * ${slot})) rotateX(${-slot * 42}deg) scale(${slot === 0 ? 1 : 0.74})`,
  opacity: Math.abs(slot) > 1 ? 0 : slot === 0 ? 1 : 0.38,
});

/**
 * Three-value CCTV drum. It never delays controls, changes state or consumes randomness.
 * @param {HTMLElement} root
 * @param {{ motion?: import('../../core/types.js').MotionPreference }} [options]
 */
export function createMultiplierReel(root, { motion = { reduced: false } } = {}) {
  const drum = /** @type {HTMLElement} */ (root.querySelector('.reel-drum'));
  const announcement = /** @type {HTMLElement} */ (root.querySelector('.reel-announcement'));
  /** @type {ReelValues | null} */
  let values = null;
  /** @type {Animation[]} */
  let animations = [];
  let revision = 0,
    disposed = false,
    lastKey = '';

  function cancel() {
    revision++;
    for (const animation of animations) animation.cancel();
    animations = [];
    root.classList.remove('is-rolling');
  }
  /**
   * @param {number | null} value
   * @param {number} slot
   */
  function row(value, slot) {
    const element = document.createElement('span');
    element.className = 'reel-value';
    element.dataset.slot = String(slot);
    element.append(document.createTextNode(value === null ? '—' : formatMultiplier(value)));
    if (value !== null) {
      const symbol = document.createElement('b');
      symbol.textContent = '×';
      element.append(symbol);
    }
    Object.assign(element.style, pose(slot));
    return element;
  }
  function paint() {
    drum.replaceChildren(
      row(values.previousMultiplier, -1),
      row(values.currentMultiplier, 0),
      row(values.nextMultiplier, 1),
    );
  }
  const unsubscribeMotion = motion.subscribe?.((reduced) => {
    if (reduced && animations.length) {
      cancel();
      paint();
    }
  });

  return {
    /**
     * @param {ReelValues} next
     * @param {{ animate?: boolean, locked?: boolean }} [options]
     */
    update(next, { animate = false, locked = false } = {}) {
      if (disposed) return;
      const key = JSON.stringify([next, locked]);
      if (key === lastKey) return;
      lastKey = key;
      const before = values;
      const changed = before?.currentMultiplier !== next.currentMultiplier;
      cancel();
      values = { ...next };
      root.dataset.current = formatMultiplier(values.currentMultiplier);
      root.classList.toggle('is-locked', locked);
      root.classList.toggle('is-wide', values.currentMultiplier >= 100);
      if (changed)
        announcement.textContent = `Moltiplicatore ${formatMultiplier(values.currentMultiplier)}×`;
      if (!before || !changed || !animate) {
        paint();
        return;
      }
      const version = revision;
      root.classList.add('is-rolling');
      if (motion.reduced) {
        paint();
        animations = [
          drum.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' }),
        ];
      } else {
        const rows = [
          row(before.previousMultiplier, -1),
          row(before.currentMultiplier, 0),
          row(next.currentMultiplier, 1),
          row(next.nextMultiplier, 2),
        ];
        drum.replaceChildren(...rows);
        animations = rows.map((element, index) =>
          element.animate([pose(index - 1), pose(index - 2)], {
            duration: REEL_DURATION,
            easing: EASING,
            fill: 'forwards',
          }),
        );
      }
      Promise.all(animations.map((animation) => animation.finished))
        .then(() => {
          if (disposed || revision !== version) return;
          cancel();
          paint();
        })
        .catch(() => {
          /* Replacement, reduced motion or disposal cancelled this presentation. */
        });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancel();
      unsubscribeMotion?.();
      drum.replaceChildren();
    },
  };
}
