/**
 * Top of the console: balance, multiplier drum, district identity, camera number,
 * the cashable amount and the local clock.
 */
import { MAX_CROSSINGS } from '../../config/gameplay.js';
import { formatMoney } from '../../core/format.js';
import { PHASES } from '../../core/gameState.js';
import { getRoundTheme } from '../../world/themes/index.js';
import { el, timeEl } from '../dom.js';
import { createMultiplierReel, getReelValues } from './multiplierReel.js';

/** Once a round is settled the drum must not roll again. */
/** @type {import('../../core/types.js').GamePhase[]} */
const LOCKED_PHASES = [PHASES.CAUGHT, PHASES.ESCAPING, PHASES.RESULT];

/** @param {number} value */
const pad = (value) => String(value).padStart(2, '0');

/**
 * @param {{ motion?: import('../../core/types.js').MotionPreference }} [options]
 */
export function createSurveillanceHud({ motion = { reduced: false } } = {}) {
  const balance = el('balance');
  const routeBet = el('route-bet-value');
  const district = el('district-name');
  const cameraLabel = el('camera-label');
  const monitorUnit = el('monitor-unit');
  const payoutPreview = el('payout-preview');
  const potentialLabel = el('potential-label');
  const potential = el('potential');
  const crossingCount = el('crossing-count');
  const clock = timeEl('camera-clock');
  const reel = createMultiplierReel(el('multiplier-reel'), { motion });

  const clockFormat = new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const updateClock = () => {
    const now = new Date();
    clock.textContent = clockFormat.format(now);
    clock.dateTime = now.toISOString();
  };
  updateClock();
  const clockTimer = setInterval(updateClock, 1000);

  return {
    /**
     * @param {import('../../core/types.js').GameSnapshot} s
     * @param {import('../view.js').View} view
     */
    render(s, { arrived, decision, pendingCrossing, potential: cashable }) {
      balance.textContent = formatMoney(s.balance);
      reel.update(getReelValues(s), {
        animate: arrived,
        locked: LOCKED_PHASES.includes(s.phase),
      });
      routeBet.textContent = `${formatMoney(s.bet)} CR`;
      district.textContent = getRoundTheme(s.round).name.toLocaleUpperCase('it-IT');
      cameraLabel.textContent = `CAM ${pad(pendingCrossing)}`;
      monitorUnit.textContent = pad(pendingCrossing);
      payoutPreview.hidden = !(
        decision ||
        s.phase === PHASES.ESCAPING ||
        (s.phase === PHASES.RESULT && s.payout > 0)
      );
      potentialLabel.textContent = decision ? 'Puoi incassare' : 'Incasso accreditato';
      potential.textContent = formatMoney(decision ? cashable : s.payout);
      crossingCount.textContent = `${pad(s.crossing)} / ${MAX_CROSSINGS}`;
    },
    dispose() {
      reel.dispose();
      clearInterval(clockTimer);
    },
  };
}
