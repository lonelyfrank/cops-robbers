import { DIFFICULTIES, calculatePayout, getMultiplier, isGreen } from './gameMath.js';
import {
  DEFAULT_BET,
  HISTORY_SIZE,
  INITIAL_BALANCE,
  MAX_BET,
  MAX_CROSSINGS,
  MIN_BET,
} from './config/gameplay.js';

/**
 * @typedef {import('./core/types.js').GamePhase} GamePhase
 * @typedef {import('./core/types.js').DifficultyId} DifficultyId
 * @typedef {import('./core/types.js').RoundOutcome} RoundOutcome
 * @typedef {import('./core/types.js').GameHistoryEntry} GameHistoryEntry
 * @typedef {import('./core/types.js').GameSnapshot} GameSnapshot
 * @typedef {Omit<GameSnapshot, 'history'> & { history: GameHistoryEntry[] }} GameData
 */

export { INITIAL_BALANCE } from './config/gameplay.js';
export const PHASES = Object.freeze({
  IDLE: 'idle',
  RUNNING: 'running',
  READY: 'ready',
  CAUGHT: 'caught',
  ESCAPING: 'escaping',
  RESULT: 'result',
});

/** @returns {number} Uniform sample in [0, 1). */
export function secureRandom() {
  const value = new Uint32Array(1);
  globalThis.crypto.getRandomValues(value);
  return value[0] / 0x1_0000_0000;
}

/** State machine: only valid transitions can move money or consume randomness. */
export class GameState {
  /** @param {{ random?: () => number, initialBalance?: number }} [options] */
  constructor({ random = secureRandom, initialBalance = INITIAL_BALANCE } = {}) {
    if (!Number.isSafeInteger(initialBalance) || initialBalance < 0)
      throw new RangeError('Saldo non valido.');
    this.random = random;
    /** @type {Set<(snapshot: GameSnapshot) => void>} */
    this.listeners = new Set();
    /** @type {GameData} */
    this.data = {
      phase: PHASES.IDLE,
      balance: initialBalance,
      bet: DEFAULT_BET,
      stake: 0,
      difficulty: 'medium',
      crossing: 0,
      multiplier: 1,
      round: 0,
      payout: 0,
      history: [],
    };
  }
  /** @returns {GameSnapshot} */
  get snapshot() {
    return Object.freeze({
      ...this.data,
      history: this.data.history.map((item) => Object.freeze({ ...item })),
    });
  }
  /**
   * @param {(snapshot: GameSnapshot) => void} listener Called immediately with the current state.
   * @returns {() => boolean} Unsubscribe.
   */
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => this.listeners.delete(listener);
  }
  notify() {
    const snapshot = this.snapshot;
    this.listeners.forEach((listener) => listener(snapshot));
  }
  get canConfigure() {
    return this.data.phase === PHASES.IDLE || this.data.phase === PHASES.RESULT;
  }
  /** @param {number} amount Minor units. */
  setBet(amount) {
    if (
      !this.canConfigure ||
      !Number.isSafeInteger(amount) ||
      amount < MIN_BET ||
      amount > MAX_BET ||
      amount > this.data.balance
    )
      return false;
    this.data.bet = amount;
    this.notify();
    return true;
  }
  /** @param {DifficultyId} difficulty */
  setDifficulty(difficulty) {
    if (!this.canConfigure || !Object.hasOwn(DIFFICULTIES, difficulty)) return false;
    this.data.difficulty = difficulty;
    this.notify();
    return true;
  }
  /** @param {number} [amount] Minor units; defaults to the configured bet. */
  start(amount = this.data.bet) {
    if (
      !this.canConfigure ||
      !Number.isSafeInteger(amount) ||
      amount < MIN_BET ||
      amount > Math.min(MAX_BET, this.data.balance)
    )
      return false;
    const phase = isGreen(1, this.data.difficulty, this.random()) ? PHASES.RUNNING : PHASES.CAUGHT;
    Object.assign(this.data, {
      phase,
      bet: amount,
      stake: amount,
      balance: this.data.balance - amount,
      crossing: 0,
      multiplier: 1,
      round: this.data.round + 1,
      payout: 0,
    });
    this.notify();
    return true;
  }
  advance() {
    if (this.data.phase !== PHASES.READY || this.data.crossing >= MAX_CROSSINGS) return false;
    this.data.phase = isGreen(this.data.crossing + 1, this.data.difficulty, this.random())
      ? PHASES.RUNNING
      : PHASES.CAUGHT;
    this.notify();
    return true;
  }
  finishCrossing() {
    if (this.data.phase !== PHASES.RUNNING) return false;
    const crossing = this.data.crossing + 1;
    if (crossing === MAX_CROSSINGS) return this.#settleCashout(crossing);
    this.data.crossing = crossing;
    this.data.multiplier = getMultiplier(crossing, this.data.difficulty);
    this.data.phase = PHASES.READY;
    this.notify();
    return true;
  }
  cashout() {
    if (this.data.phase !== PHASES.READY || this.data.crossing < 1) return false;
    return this.#settleCashout(this.data.crossing);
  }
  /** @param {number} crossing */
  #settleCashout(crossing) {
    const payout = calculatePayout(this.data.stake, crossing, this.data.difficulty);
    if (!Number.isSafeInteger(this.data.balance + payout))
      throw new RangeError('Saldo fuori limite.');
    Object.assign(this.data, {
      crossing,
      multiplier: getMultiplier(crossing, this.data.difficulty),
      phase: PHASES.ESCAPING,
      payout,
      balance: this.data.balance + payout,
    });
    this.record('won');
    this.notify();
    return true;
  }
  finishCaught() {
    if (this.data.phase !== PHASES.CAUGHT) return false;
    this.data.phase = PHASES.RESULT;
    this.record('lost');
    this.notify();
    return true;
  }
  finishEscape() {
    if (this.data.phase !== PHASES.ESCAPING) return false;
    this.data.phase = PHASES.RESULT;
    this.notify();
    return true;
  }
  /** @param {RoundOutcome} outcome */
  record(outcome) {
    this.data.history.unshift({
      id: this.data.round,
      outcome,
      difficulty: this.data.difficulty,
      crossing: this.data.crossing,
      attemptedCrossing: outcome === 'lost' ? this.data.crossing + 1 : this.data.crossing,
      multiplier: this.data.multiplier,
      stake: this.data.stake,
      payout: this.data.payout,
    });
    this.data.history = this.data.history.slice(0, HISTORY_SIZE);
  }
  resetDemo() {
    if (!this.canConfigure) return false;
    Object.assign(this.data, {
      phase: PHASES.IDLE,
      balance: INITIAL_BALANCE,
      bet: DEFAULT_BET,
      stake: 0,
      crossing: 0,
      multiplier: 1,
      payout: 0,
      history: [],
    });
    this.notify();
    return true;
  }
}
