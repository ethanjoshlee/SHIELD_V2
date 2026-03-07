/**
 * Phase sequencing and countermeasure penalty logic.
 */

import { clamp01 } from '../utils/rng.js';

/**
 * Apply boost-evasion penalty to an interceptor's Pk.
 */
export function applyBoostEvasion(pk, boostEvasion) {
  return clamp01(pk * (1 - boostEvasion));
}

/**
 * Apply ASAT penalty to detection/tracking probability.
 * Multiplicative: effectiveP = pDetect * (1 - penalty)
 */
export function applyAsatDetectPenalty(pDetect, asatDetectPenalty) {
  return clamp01(pDetect * (1 - asatDetectPenalty));
}

/**
 * Apply ASAT penalty to space-based interceptor Pk.
 * Multiplicative: effectivePk = pk * (1 - penalty)
 */
export function applyAsatPkPenalty(pk, asatSpacePkPenalty) {
  return clamp01(pk * (1 - asatSpacePkPenalty));
}

/**
 * Returns true if an interceptor type is space-based (affected by ASAT).
 */
export function isSpaceBased(interceptorType) {
  return interceptorType.startsWith("boost_") ||
         interceptorType === "midcourse_kinetic" ||
         interceptorType === "midcourse_laser";
}

/**
 * Sort interceptor types within a phase by cost (cheapest first).
 */
export function sortByPriority(interceptorTypes, interceptorConfigs) {
  return [...interceptorTypes].sort((a, b) => {
    const costA = interceptorConfigs[a]?.costPerUnit_M ?? 0;
    const costB = interceptorConfigs[b]?.costPerUnit_M ?? 0;
    return costA - costB;
  });
}
