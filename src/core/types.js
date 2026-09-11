/**
 * Shared domain vocabulary for the JSDoc type checker.
 *
 * This module emits no runtime code: it exists so that `jsconfig.json` can give
 * the plain `.js` sources real types without migrating the project to
 * TypeScript. Reference a type with `import('../core/types.js').Name`.
 */

/**
 * Lifecycle of a single round.
 * @typedef {'idle' | 'running' | 'ready' | 'caught' | 'escaping' | 'result'} GamePhase
 */

/**
 * Risk curve selected by the player before a round starts.
 * @typedef {'easy' | 'medium' | 'hard'} DifficultyId
 */

/**
 * Cosmetic city identity. Never sampled from the wager generator.
 * @typedef {'district87' | 'neonTokyo'} CityThemeId
 */

/**
 * How a streamed district relates to the thief's actual position.
 * @typedef {'previous' | 'current' | 'next' | 'retiring'} TileRole
 */

/**
 * Lamp state of one traffic signal axis.
 * @typedef {'off' | 'red' | 'yellow' | 'green'} TrafficSignalState
 */

/**
 * Procedural animation currently owned by the character controller.
 * @typedef {'run' | 'caught' | 'alley'} AnimationKind
 */

/**
 * Outcome recorded in the history strip.
 * @typedef {'won' | 'lost'} RoundOutcome
 */

/**
 * One settled round, in hundredths of a credit.
 * @typedef {object} GameHistoryEntry
 * @property {number} id Round number that produced the entry.
 * @property {RoundOutcome} outcome
 * @property {DifficultyId} difficulty
 * @property {number} crossing Junctions actually cleared.
 * @property {number} attemptedCrossing Junction the round ended on.
 * @property {number} multiplier Payable multiplier reached.
 * @property {number} stake Minor units wagered.
 * @property {number} payout Gross minor units credited, 0 on a loss.
 */

/**
 * Immutable view of the state machine handed to every subscriber.
 * @typedef {object} GameSnapshot
 * @property {GamePhase} phase
 * @property {number} balance Minor units.
 * @property {number} bet Configured stake in minor units.
 * @property {number} stake Minor units committed to the running round.
 * @property {DifficultyId} difficulty
 * @property {number} crossing Junctions cleared so far.
 * @property {number} multiplier Payable multiplier at `crossing`.
 * @property {number} round Accepted rounds since the page opened.
 * @property {number} payout Gross minor units credited by the last settlement.
 * @property {readonly GameHistoryEntry[]} history Latest rounds, newest first.
 */

/**
 * Live `prefers-reduced-motion` preference shared by the UI and the scene.
 * @typedef {object} MotionPreference
 * @property {boolean} reduced
 * @property {(listener: (reduced: boolean) => void) => () => void} [subscribe]
 * @property {() => void} [dispose]
 */

/**
 * Rendering budget preset. Chosen from measurements, never from a user agent.
 * @typedef {'low' | 'medium' | 'high'} RenderingQuality
 */

/**
 * Overlay state produced by the rendering layer and consumed by the DOM.
 * The renderer never touches document elements itself.
 * @typedef {object} CaptureState
 * @property {boolean} caught Whether the arrest sequence owns the scene.
 * @property {number} sirenIntensity Normalised 0…1 siren pulse.
 * @property {number} captureIntensity Normalised 0…1 overlay opacity.
 */

export {};
