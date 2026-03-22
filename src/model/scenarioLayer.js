/**
 * Scenario-layer transforms for boost-phase assumptions.
 *
 * Keeps coverage math deterministic and continuous.
 * Discretization happens later at engagement resolution.
 */

import { bernoulli, clamp01 } from '../utils/rng.js';
import { LAUNCH_REGION_PRESETS } from '../config/launchRegions.js';

function asFiniteNonNegative(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, n);
}

function asProbability(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return clamp01(fallback);
  return clamp01(n);
}

function resolveLaunchRegion(launchRegion) {
  if (LAUNCH_REGION_PRESETS[launchRegion]) return launchRegion;
  return 'default';
}

const ASAT_MODEL_FACTORS = {
  // Policy-facing first-pass factors: simple, auditable mappings from
  // successful ASAT channels to availability/detection penalties.
  cyberAvailabilityFactor: 0.20,
  hitToKillDetectionFactor: 0.25,
  nuclearAvailabilityFactor: 1.40,
  nuclearDetectionFactor: 1.10,
};

function independentTrialsEffect(probability, count) {
  const p = asProbability(probability, 0);
  const n = asFiniteNonNegative(count, 0);
  return clamp01(1 - Math.pow(1 - p, n));
}

/**
 * Build boost-phase scenario values from user params / presets.
 */
export function buildBoostScenario(params) {
  const launchRegion = resolveLaunchRegion(params.launchRegion);
  const preset = LAUNCH_REGION_PRESETS[launchRegion];

  const deployedByType = {
    boost_kinetic: asFiniteNonNegative(
      params.nSpaceBoostKinetic,
      params.interceptors?.boost_kinetic?.deployed ?? 0
    ),
    boost_laser: asFiniteNonNegative(
      params.nSpaceBoostDirected,
      params.interceptors?.boost_laser?.deployed ?? 0
    ),
  };

  const pkByType = {
    boost_kinetic: asProbability(
      params.pkSpaceBoostKinetic,
      params.interceptors?.boost_kinetic?.pk ?? 0
    ),
    boost_laser: asProbability(
      params.pkSpaceBoostDirected,
      params.interceptors?.boost_laser?.pk ?? 0
    ),
  };

  const legacyAsatSpaceAvailabilityPenalty = asProbability(
    params.asatSpaceAvailabilityPenalty,
    params.countermeasures?.asatSpaceAvailabilityPenalty ?? 0
  );
  const pAsatCyberEffect = asProbability(
    params.pAsatCyberEffect,
    legacyAsatSpaceAvailabilityPenalty
  );
  const nAsatHitToKill = Math.floor(asFiniteNonNegative(params.nAsatHitToKill, 0));
  const pAsatHitToKill = asProbability(params.pAsatHitToKill, 0);
  const nAsatNuclear = Math.floor(asFiniteNonNegative(params.nAsatNuclear, 0));
  const pAsatNuclearEffect = asProbability(params.pAsatNuclearEffect, 0);

  // Blue constellation defense: fraction of kinetic ASAT attempts neutralized before reaching orbit.
  const pConstellationDefense = asProbability(params.pConstellationDefense, 0);
  const effectiveHitToKillN = nAsatHitToKill * (1 - pConstellationDefense);
  const effectiveNuclearN   = nAsatNuclear   * (1 - pConstellationDefense);

  const hitToKillAvailabilityEffect = independentTrialsEffect(
    pAsatHitToKill,
    effectiveHitToKillN
  );
  const hitToKillDetectionEffect = clamp01(
    hitToKillAvailabilityEffect * ASAT_MODEL_FACTORS.hitToKillDetectionFactor
  );
  const nuclearSuccessFraction = independentTrialsEffect(
    pAsatNuclearEffect,
    effectiveNuclearN
  );
  const nuclearAvailabilityEffect = Math.min(
    0.95,
    clamp01(nuclearSuccessFraction * ASAT_MODEL_FACTORS.nuclearAvailabilityFactor)
  );
  const nuclearDetectionEffect = Math.min(
    0.95,
    clamp01(nuclearSuccessFraction * ASAT_MODEL_FACTORS.nuclearDetectionFactor)
  );
  const cyberDetectionEffect = pAsatCyberEffect;
  const cyberAvailabilityEffect = clamp01(
    pAsatCyberEffect * ASAT_MODEL_FACTORS.cyberAvailabilityFactor
  );

  const availabilityMultiplier = clamp01(
    (1 - hitToKillAvailabilityEffect) *
      (1 - nuclearAvailabilityEffect) *
      (1 - cyberAvailabilityEffect)
  );
  const detectionMultiplier = clamp01(
    (1 - cyberDetectionEffect) *
      (1 - nuclearDetectionEffect) *
      (1 - hitToKillDetectionEffect)
  );

  const boostEvasionPenalty = asProbability(params.boostEvasionPenalty, 0);

  const coverageByType = {
    boost_kinetic: asProbability(preset.coverage.spaceBoostKinetic, 1.0),
    boost_laser: asProbability(preset.coverage.spaceBoostDirected, 1.0),
  };

  const effectiveBoostInterceptorsInRangeByType = {
    boost_kinetic: deployedByType.boost_kinetic * coverageByType.boost_kinetic,
    boost_laser: deployedByType.boost_laser * coverageByType.boost_laser,
  };

  const effectiveBoostInterceptorsPostAsatByType = {
    boost_kinetic:
      effectiveBoostInterceptorsInRangeByType.boost_kinetic *
      availabilityMultiplier,
    boost_laser:
      effectiveBoostInterceptorsInRangeByType.boost_laser *
      availabilityMultiplier,
  };

  const neutralCompatibilityMode =
    launchRegion === 'default' &&
    pAsatCyberEffect === 0 &&
    nAsatHitToKill === 0 &&
    nAsatNuclear === 0 &&
    coverageByType.boost_kinetic === 1 &&
    coverageByType.boost_laser === 1;
  // Neutral compatibility mode is a baseline pass-through, not a realism claim.

  const asatEffects = {
    pAsatCyberEffect,
    nAsatHitToKill,
    pAsatHitToKill,
    nAsatNuclear,
    pAsatNuclearEffect,
    cyberDetectionEffect,
    cyberAvailabilityEffect,
    hitToKillAvailabilityEffect,
    hitToKillDetectionEffect,
    nuclearSuccessFraction,
    nuclearAvailabilityEffect,
    nuclearDetectionEffect,
    availabilityMultiplier,
    detectionMultiplier,
  };

  return {
    launchRegion,
    launchRegionLabel: preset.label,
    neutralCompatibilityMode,
    deployedByType,
    pkByType,
    coverageByType,
    asatEffects,
    availabilityMultiplier,
    detectionMultiplier,
    boostEvasionPenalty,
    effectiveBoostInterceptorsInRangeByType,
    effectiveBoostInterceptorsPostAsatByType,
  };
}

/**
 * Convert continuous interceptor counts into integer engagement pools.
 *
 * This is the only discretization step, done immediately before engagement.
 */
export function discretizeBoostInventoryByType(continuousByType) {
  const result = {};
  for (const [type, raw] of Object.entries(continuousByType)) {
    const x = asFiniteNonNegative(raw, 0);
    const whole = Math.floor(x);
    const fractional = x - whole;
    result[type] = whole + (fractional > 0 ? (bernoulli(fractional) ? 1 : 0) : 0);
  }
  return result;
}
