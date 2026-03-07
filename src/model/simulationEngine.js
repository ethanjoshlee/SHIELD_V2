/**
 * Core simulation engine — single-trial logic.
 *
 * Supports two modes:
 * 1. Legacy (flat params): single-phase engagement (backward compatible)
 * 2. Multi-phase (params.missileClasses + params.interceptors): Boost → Midcourse → Terminal
 */

import { clamp01, bernoulli } from '../utils/rng.js';
import { generateTargets, generateMissiles, expandToWarheadsAndDecoys } from './scenarioBuilder.js';
import { classifyTarget, engageWithType, engageTarget } from './engagement.js';
import {
  applyBoostEvasion,
  applyAsatDetectPenalty,
  applyAsatPkPenalty,
  isSpaceBased,
  sortByPriority,
} from './rules.js';
import { buildBoostScenario, discretizeBoostInventoryByType } from './scenarioLayer.js';

// ---------------------------------------------------------------------------
// Trial-level system degradation (common-mode reliability)
// ---------------------------------------------------------------------------

function applyTrialDegradation(params) {
  const up = bernoulli(params.pSystemUp);

  if (up) {
    return {
      pDetectTrack_trial: params.pDetectTrack,
      pkDegradeFactor: 1.0,
      detectDegradeFactor: 1.0,
      systemUp: true,
    };
  }

  return {
    pDetectTrack_trial: clamp01(params.pDetectTrack * params.detectDegradeFactor),
    pkDegradeFactor: params.pkDegradeFactor,
    detectDegradeFactor: params.detectDegradeFactor,
    systemUp: false,
  };
}

const BOOST_TYPES = ["boost_kinetic", "boost_laser"];

function doctrineParamsFrom(params) {
  return {
    doctrineMode: params.doctrineMode,
    shotsPerTarget: params.shotsPerTarget,
    maxShotsPerTarget: params.maxShotsPerTarget,
    pReengage: params.pReengage,
  };
}

function hasBoostEngagementCapacity(boostScenario) {
  return BOOST_TYPES.some((type) => {
    const continuous = boostScenario.effectiveBoostInterceptorsPostAsatByType[type] ?? 0;
    const pk = boostScenario.pkByType[type] ?? 0;
    return continuous > 0 && pk > 0;
  });
}

/**
 * Boost phase abstraction:
 * each class's discretized pool represents whole-missile engagement opportunities
 * before MIRV separation.
 */
function runBoostPhaseOnMissiles({
  missiles,
  pDetectTrack,
  doctrineParams,
  inventoryByType,
  pkByType,
  boostEvasionPenalty,
}) {
  const inventory = { ...inventoryByType };
  const survivingMissiles = [];

  let boostMissilesEngaged = 0;
  let boostMissilesKilled = 0;
  let boostWarheadsDestroyed = 0;
  let boostShotsFired = 0;

  for (const missile of missiles) {
    const detected = bernoulli(pDetectTrack);
    if (!detected) {
      survivingMissiles.push(missile);
      continue;
    }

    boostMissilesEngaged++;
    let killed = false;

    for (const type of BOOST_TYPES) {
      const inventoryCount = inventory[type] ?? 0;
      if (inventoryCount <= 0) continue;

      let pk = pkByType[type] ?? 0;
      pk = applyBoostEvasion(pk, missile.boostEvasion ?? 0);
      pk = applyBoostEvasion(pk, boostEvasionPenalty);

      const res = engageWithType(missile, pk, doctrineParams, inventoryCount);
      inventory[type] = res.inventoryRemaining;
      boostShotsFired += res.shotsFired;

      if (res.killed) {
        killed = true;
        break;
      }
    }

    if (killed) {
      boostMissilesKilled++;
      boostWarheadsDestroyed += missile.mirvsPerMissile;
    } else {
      survivingMissiles.push(missile);
    }
  }

  return {
    survivingMissiles,
    boostMissilesEngaged,
    boostMissilesKilled,
    boostWarheadsDestroyed,
    boostShotsFired,
  };
}

// ---------------------------------------------------------------------------
// Legacy single-phase trial (backward compatible)
// ---------------------------------------------------------------------------

function runLegacyTrial(params) {
  const boostScenario = buildBoostScenario(params);
  const boostEnabled = hasBoostEngagementCapacity(boostScenario);

  // Neutral compatibility path: preserve existing legacy behavior.
  if (!boostEnabled) {
    const { targets, realWarheads } = generateTargets(params);
    const d = applyTrialDegradation(params);

    const pDetectTrack = d.pDetectTrack_trial;
    const pkWarhead = clamp01(params.pkWarhead * d.pkDegradeFactor);
    const pkDecoy = clamp01(params.pkDecoy * d.pkDegradeFactor);

    let inventory = params.nInventory;

    let penetratedRealWarheads = 0;
    let interceptedRealWarheads = 0;
    let detectedObjects = 0;
    let detectedRealWarheads = 0;
    let truePositives = 0;
    let falseNegatives = 0;
    let falsePositives = 0;
    let shotsTotal = 0;
    let shotsAtTrueWarheads = 0;
    let shotsAtDecoys = 0;

    for (const tgt of targets) {
      const detected = bernoulli(pDetectTrack);
      if (!detected) {
        if (tgt.kind === "warhead") penetratedRealWarheads += 1;
        continue;
      }

      detectedObjects += 1;
      if (tgt.kind === "warhead") detectedRealWarheads += 1;

      const classifiedAsWarhead = classifyTarget(tgt, params);

      if (tgt.kind === "warhead") {
        if (classifiedAsWarhead) truePositives += 1;
        else falseNegatives += 1;
      } else {
        if (classifiedAsWarhead) falsePositives += 1;
      }

      if (!classifiedAsWarhead) {
        if (tgt.kind === "warhead") penetratedRealWarheads += 1;
        continue;
      }

      const engageParams = { ...params, pkWarhead, pkDecoy };
      const res = engageTarget(tgt, engageParams, inventory);
      inventory = res.inventoryRemaining;

      shotsTotal += res.shotsFired;
      if (tgt.kind === "warhead") shotsAtTrueWarheads += res.shotsFired;
      else shotsAtDecoys += res.shotsFired;

      if (tgt.kind === "warhead") {
        if (res.killed) interceptedRealWarheads += 1;
        else penetratedRealWarheads += 1;
      }
    }

    return {
      realWarheads,
      penetratedRealWarheads,
      interceptedRealWarheads,
      detectedObjects,
      detectedRealWarheads,
      truePositives,
      falseNegatives,
      falsePositives,
      shotsTotal,
      shotsAtTrueWarheads,
      shotsAtDecoys,
      inventoryRemaining: inventory,
      systemUp: d.systemUp,
      // Multi-phase fields (zero for legacy)
      boostMissilesEngaged: 0,
      boostMissilesKilled: 0,
      boostWarheadsDestroyed: 0,
      midcourseWarheadsEngaged: 0,
      midcourseWarheadsKilled: interceptedRealWarheads,
      terminalWarheadsEngaged: 0,
      terminalWarheadsKilled: 0,
      ktDelivered: 0,
      architectureCost_M: 0,
    };
  }

  const d = applyTrialDegradation(params);
  const pDetectTrack = d.pDetectTrack_trial;
  const pkWarhead = clamp01(params.pkWarhead * d.pkDegradeFactor);
  const pkDecoy = clamp01(params.pkDecoy * d.pkDegradeFactor);

  // Continuous scenario values become discrete pools only at engagement resolution.
  const boostInventoryDiscrete = discretizeBoostInventoryByType(
    boostScenario.effectiveBoostInterceptorsPostAsatByType
  );
  const boostPkByType = {
    boost_kinetic: clamp01(boostScenario.pkByType.boost_kinetic * d.pkDegradeFactor),
    boost_laser: clamp01(boostScenario.pkByType.boost_laser * d.pkDegradeFactor),
  };

  const missiles = [];
  for (let i = 0; i < params.nMissiles; i++) {
    missiles.push({
      id: `legacy_missile_${i}`,
      kind: "missile",
      mirvsPerMissile: params.mirvsPerMissile,
      boostEvasion: 0,
    });
  }

  const boostRes = runBoostPhaseOnMissiles({
    missiles,
    pDetectTrack,
    doctrineParams: doctrineParamsFrom(params),
    inventoryByType: boostInventoryDiscrete,
    pkByType: boostPkByType,
    boostEvasionPenalty: boostScenario.boostEvasionPenalty,
  });

  const postBoostParams =
    boostRes.survivingMissiles.length === params.nMissiles
      ? params
      : { ...params, nMissiles: boostRes.survivingMissiles.length };

  const { targets } = generateTargets(postBoostParams);
  const realWarheads = params.nMissiles * params.mirvsPerMissile;

  let inventory = params.nInventory;
  let penetratedRealWarheads = 0;
  let interceptedRealWarheads = 0;
  let detectedObjects = 0;
  let detectedRealWarheads = 0;
  let truePositives = 0;
  let falseNegatives = 0;
  let falsePositives = 0;
  let shotsTotal = boostRes.boostShotsFired;
  let shotsAtTrueWarheads = boostRes.boostShotsFired;
  let shotsAtDecoys = 0;

  for (const tgt of targets) {
    const detected = bernoulli(pDetectTrack);
    if (!detected) {
      if (tgt.kind === "warhead") penetratedRealWarheads += 1;
      continue;
    }

    detectedObjects += 1;
    if (tgt.kind === "warhead") detectedRealWarheads += 1;

    const classifiedAsWarhead = classifyTarget(tgt, params);

    if (tgt.kind === "warhead") {
      if (classifiedAsWarhead) truePositives += 1;
      else falseNegatives += 1;
    } else {
      if (classifiedAsWarhead) falsePositives += 1;
    }

    if (!classifiedAsWarhead) {
      if (tgt.kind === "warhead") penetratedRealWarheads += 1;
      continue;
    }

    const engageParams = { ...params, pkWarhead, pkDecoy };
    const res = engageTarget(tgt, engageParams, inventory);
    inventory = res.inventoryRemaining;

    shotsTotal += res.shotsFired;
    if (tgt.kind === "warhead") shotsAtTrueWarheads += res.shotsFired;
    else shotsAtDecoys += res.shotsFired;

    if (tgt.kind === "warhead") {
      if (res.killed) interceptedRealWarheads += 1;
      else penetratedRealWarheads += 1;
    }
  }

  return {
    realWarheads,
    penetratedRealWarheads,
    interceptedRealWarheads,
    detectedObjects,
    detectedRealWarheads,
    truePositives,
    falseNegatives,
    falsePositives,
    shotsTotal,
    shotsAtTrueWarheads,
    shotsAtDecoys,
    inventoryRemaining: inventory,
    systemUp: d.systemUp,
    boostMissilesEngaged: boostRes.boostMissilesEngaged,
    boostMissilesKilled: boostRes.boostMissilesKilled,
    boostWarheadsDestroyed: boostRes.boostWarheadsDestroyed,
    midcourseWarheadsEngaged: 0,
    midcourseWarheadsKilled: interceptedRealWarheads,
    terminalWarheadsEngaged: 0,
    terminalWarheadsKilled: 0,
    ktDelivered: 0,
    architectureCost_M: 0,
  };
}

// ---------------------------------------------------------------------------
// Multi-phase trial: Boost → Midcourse → Terminal
// ---------------------------------------------------------------------------

function runMultiPhaseTrial(params) {
  const d = applyTrialDegradation(params);

  // --- ASAT effects ---
  const asatDetectPenalty = params.countermeasures?.asatDetectPenalty ?? 0;
  const asatSpacePkPenalty = params.countermeasures?.asatSpacePkPenalty ?? 0;
  const pDetectTrack = applyAsatDetectPenalty(d.pDetectTrack_trial, asatDetectPenalty);
  const boostScenario = buildBoostScenario(params);

  // --- Build per-type inventory and effective Pk ---
  const inventory = {};
  const effectivePk = {};
  const interceptorConfigs = params.interceptors;
  const boostInventoryContinuous = {};

  for (const [type, cfg] of Object.entries(interceptorConfigs)) {
    // Keep boost inventory continuous in scenario-layer values until resolution.
    if (cfg.phase === "boost") {
      const scenarioAvail = boostScenario.effectiveBoostInterceptorsPostAsatByType[type];
      boostInventoryContinuous[type] = scenarioAvail != null ? scenarioAvail : cfg.deployed;
      inventory[type] = 0;
    } else {
      inventory[type] = cfg.deployed;
    }

    // Compute effective Pk: base * system-degradation.
    // ASAT Pk penalty is retained for non-boost space layers.
    const scenarioPk = boostScenario.pkByType[type];
    const basePk = cfg.phase === "boost" && scenarioPk != null ? scenarioPk : cfg.pk;
    let pk = basePk * d.pkDegradeFactor;
    if (isSpaceBased(type) && cfg.phase !== "boost") {
      pk = applyAsatPkPenalty(pk, asatSpacePkPenalty);
    }
    effectivePk[type] = clamp01(pk);
  }

  const doctrineParams = doctrineParamsFrom(params);

  // Stats
  let totalRealWarheads = 0;
  let penetratedRealWarheads = 0;
  let interceptedRealWarheads = 0;
  let detectedObjects = 0;
  let detectedRealWarheads = 0;
  let truePositives = 0;
  let falseNegatives = 0;
  let falsePositives = 0;
  let shotsTotal = 0;
  let shotsAtTrueWarheads = 0;
  let shotsAtDecoys = 0;

  let boostMissilesEngaged = 0;
  let boostMissilesKilled = 0;
  let boostWarheadsDestroyed = 0;
  let midcourseWarheadsEngaged = 0;
  let midcourseWarheadsKilled = 0;
  let terminalWarheadsEngaged = 0;
  let terminalWarheadsKilled = 0;

  // ===================================================================
  // BOOST PHASE — target: whole missiles (pre-MIRV separation)
  // ===================================================================
  const missiles = generateMissiles(params);
  const survivingMissiles = [];

  // Get boost interceptor types sorted by cost
  const boostTypes = sortByPriority(
    Object.keys(interceptorConfigs).filter(t => interceptorConfigs[t].phase === "boost"),
    interceptorConfigs
  );
  const boostInventoryDiscrete = discretizeBoostInventoryByType(boostInventoryContinuous);
  for (const type of boostTypes) {
    inventory[type] = boostInventoryDiscrete[type] ?? 0;
  }

  for (const missile of missiles) {
    // Detection in boost phase
    const detected = bernoulli(pDetectTrack);
    if (!detected) {
      survivingMissiles.push(missile);
      continue;
    }

    // Engage with boost interceptors (layered: try each type)
    let killed = false;
    boostMissilesEngaged++;

    for (const type of boostTypes) {
      if (inventory[type] <= 0) continue;

      // Pk adjusted for missile-level and scenario-level boost evasion penalties.
      let pk = applyBoostEvasion(effectivePk[type], missile.boostEvasion);
      pk = applyBoostEvasion(pk, boostScenario.boostEvasionPenalty);

      const res = engageWithType(missile, pk, doctrineParams, inventory[type]);
      inventory[type] = res.inventoryRemaining;
      shotsTotal += res.shotsFired;
      shotsAtTrueWarheads += res.shotsFired; // boost targets are always real missiles

      if (res.killed) {
        killed = true;
        break;
      }
    }

    if (killed) {
      boostMissilesKilled++;
      boostWarheadsDestroyed += missile.mirvsPerMissile;
    } else {
      survivingMissiles.push(missile);
    }
  }

  // ===================================================================
  // MIDCOURSE PHASE — target: individual warheads + decoys
  // ===================================================================
  const { targets: midcourseTargets } = expandToWarheadsAndDecoys(survivingMissiles);

  // Count total real warheads across all missiles (for stats)
  for (const m of missiles) {
    totalRealWarheads += m.mirvsPerMissile;
  }

  // Get midcourse interceptor types sorted by cost
  const midcourseTypes = sortByPriority(
    Object.keys(interceptorConfigs).filter(t => interceptorConfigs[t].phase === "midcourse"),
    interceptorConfigs
  );

  const survivingWarheads = []; // warheads that survive midcourse (for terminal)

  for (const tgt of midcourseTargets) {
    const detected = bernoulli(pDetectTrack);
    if (!detected) {
      if (tgt.kind === "warhead") survivingWarheads.push(tgt);
      continue;
    }

    detectedObjects++;
    if (tgt.kind === "warhead") detectedRealWarheads++;

    // Classification
    const classifiedAsWarhead = classifyTarget(tgt, params);

    if (tgt.kind === "warhead") {
      if (classifiedAsWarhead) truePositives++;
      else falseNegatives++;
    } else {
      if (classifiedAsWarhead) falsePositives++;
    }

    if (!classifiedAsWarhead) {
      if (tgt.kind === "warhead") survivingWarheads.push(tgt);
      continue;
    }

    // Engage with midcourse interceptors (layered)
    let killed = false;
    if (tgt.kind === "warhead") midcourseWarheadsEngaged++;

    for (const type of midcourseTypes) {
      if (inventory[type] <= 0) continue;

      const res = engageWithType(tgt, effectivePk[type], doctrineParams, inventory[type]);
      inventory[type] = res.inventoryRemaining;
      shotsTotal += res.shotsFired;

      if (tgt.kind === "warhead") shotsAtTrueWarheads += res.shotsFired;
      else shotsAtDecoys += res.shotsFired;

      if (res.killed) {
        killed = true;
        break;
      }
    }

    if (tgt.kind === "warhead") {
      if (killed) {
        midcourseWarheadsKilled++;
        interceptedRealWarheads++;
      } else {
        survivingWarheads.push(tgt);
      }
    }
    // Decoys: if engaged and killed, wasted shots. If not killed, ignored.
  }

  // ===================================================================
  // TERMINAL PHASE — warheads only (decoys mostly burn up during reentry)
  // ===================================================================
  // Get terminal interceptor types sorted by cost
  const terminalTypes = sortByPriority(
    Object.keys(interceptorConfigs).filter(t => interceptorConfigs[t].phase === "terminal"),
    interceptorConfigs
  );

  for (const wh of survivingWarheads) {
    // Terminal detection (may be re-detected; use same probability)
    const detected = bernoulli(pDetectTrack);
    if (!detected) {
      penetratedRealWarheads++;
      continue;
    }

    // In terminal phase, better discrimination (fewer decoys)
    // Since survivingWarheads only contains warheads, no classification needed here

    terminalWarheadsEngaged++;

    let killed = false;
    for (const type of terminalTypes) {
      if (inventory[type] <= 0) continue;

      const res = engageWithType(wh, effectivePk[type], doctrineParams, inventory[type]);
      inventory[type] = res.inventoryRemaining;
      shotsTotal += res.shotsFired;
      shotsAtTrueWarheads += res.shotsFired;

      if (res.killed) {
        killed = true;
        break;
      }
    }

    if (killed) {
      terminalWarheadsKilled++;
      interceptedRealWarheads++;
    } else {
      penetratedRealWarheads++;
    }
  }

  // ===================================================================
  // Kiloton delivery
  // ===================================================================
  // penetratedRealWarheads is the count. We need the actual yield.
  // Reconstruct from surviving warheads that were not intercepted in terminal.
  // Actually, let's compute it differently: total yield - intercepted yield.
  // Simpler: track kt as we go. But we can approximate from the warhead objects.
  // For now, we iterate surviving warheads and count those not intercepted.
  // Actually, we already know penetratedRealWarheads count. We need yield per warhead.
  // Since warheads may have different yields (mixed classes), we track ktDelivered separately.

  // Re-walk: the penetrated warheads are those in survivingWarheads that weren't killed in terminal.
  // Instead of re-walking, let's compute total possible kt and subtract intercepted.
  let totalKt = 0;
  for (const m of missiles) {
    totalKt += m.mirvsPerMissile * m.yieldKt;
  }
  // Use average-yield approximation: exact when all warheads have the same yield.
  const avgYieldKt = totalRealWarheads > 0 ? totalKt / totalRealWarheads : 0;
  const ktDelivered = penetratedRealWarheads * avgYieldKt;

  // --- Compute total inventory remaining ---
  let totalInventoryRemaining = 0;
  for (const type of Object.keys(inventory)) {
    totalInventoryRemaining += inventory[type];
  }

  return {
    realWarheads: totalRealWarheads,
    penetratedRealWarheads,
    interceptedRealWarheads,
    detectedObjects,
    detectedRealWarheads,
    truePositives,
    falseNegatives,
    falsePositives,
    shotsTotal,
    shotsAtTrueWarheads,
    shotsAtDecoys,
    inventoryRemaining: totalInventoryRemaining,
    systemUp: d.systemUp,
    boostMissilesEngaged,
    boostMissilesKilled,
    boostWarheadsDestroyed,
    midcourseWarheadsEngaged,
    midcourseWarheadsKilled,
    terminalWarheadsEngaged,
    terminalWarheadsKilled,
    ktDelivered,
    architectureCost_M: 0, // computed in metrics, not per-trial
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run one trial. Automatically selects legacy vs multi-phase mode
 * based on whether params.missileClasses is defined.
 */
export function runOneTrial(params) {
  if (params.missileClasses) {
    return runMultiPhaseTrial(params);
  }
  return runLegacyTrial(params);
}
