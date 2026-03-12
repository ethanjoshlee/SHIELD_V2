/**
 * Results panel rendering for the dashboard.
 */

import { fmt } from '../utils/format.js';
import { renderHistogramHTML } from './charts.js';
import { buildBoostScenario } from '../model/scenarioLayer.js';
import { MIDCOURSE_SPACE_AVAILABILITY } from '../model/simulationEngine.js';
import { LAUNCH_REGION_PRESETS } from '../config/launchRegions.js';
import { DELIVERED_KILOTONS_BENCHMARKS } from './deliveredKilotonsBenchmarks.js';

function resolveDeliveredStepSize(params) {
  const raw = Number(params?.kilotonsPerWarhead);
  if (!Number.isFinite(raw) || raw <= 0) return 400;
  return raw;
}

function distributionChartOptions(distributionTitle, params = {}) {
  const shared = {
    height: 250,
    showTitle: false,
    yLabel: 'Number of Trials',
    yTargetTicks: 5,
    targetVisualSlots: 120,
    minVisualSubBins: 1,
    maxVisualSubBins: 12,
  };
  if (distributionTitle === 'Delivered Kilotons') {
    const stepSize = resolveDeliveredStepSize(params);
    return {
      ...shared,
      xLabel: 'Delivered Kilotons',
      binStrategy: 'step-discrete',
      stepSize,
      bins: 64,
      integerMaxBins: 96,
      integerMinNonZeroRatio: 0.35,
      integerMinReadableBins: 18,
      referenceMarkers: DELIVERED_KILOTONS_BENCHMARKS,
      maxVisibleReferenceMarkers: 7,
      maxVisibleReferenceLabels: 4,
      referenceLabelMinGapPct: 10,
    };
  }
  if (distributionTitle === 'Penetrated Real Warheads') {
    return {
      ...shared,
      xLabel: 'Penetrated Real Warheads',
      binStrategy: 'integer',
      bins: 64,
      integerMaxBins: 96,
      integerMinNonZeroRatio: 0.35,
      integerMinReadableBins: 18,
    };
  }
  return {
    ...shared,
    xLabel: 'Intercepted Real Warheads',
    binStrategy: 'integer',
    bins: 64,
    integerMaxBins: 96,
    integerMinNonZeroRatio: 0.35,
    integerMinReadableBins: 18,
  };
}

export function renderResultsContent(params, result) {
  const s = result.summary;

  const realWarheads = params.nMissiles * params.mirvsPerMissile;
  const decoysPerMissile = params.decoysPerWarhead * params.mirvsPerMissile;
  const kilotonsPerWarhead = params.kilotonsPerWarhead ?? 400;
  const decoys = realWarheads * params.decoysPerWarhead;
  const totalObjects = realWarheads + decoys;

  const formatDoctrineLine = (mode, shots, maxShots, pReengage) =>
    mode === "barrage"
      ? `Barrage, ${shots} shots per detected/tracked target`
      : `SLS, max ${maxShots} shots per detected/tracked target, P(re-engage)=${fmt(pReengage, 2)}`;

  const midcourseKineticDoctrineMode = params.midcourseKineticDoctrineMode ?? params.doctrineMode ?? "barrage";
  const midcourseKineticShotsPerTarget = params.midcourseKineticShotsPerTarget ?? params.shotsPerTarget ?? 2;
  const midcourseKineticMaxShotsPerTarget = params.midcourseKineticMaxShotsPerTarget ?? params.maxShotsPerTarget ?? 4;
  const midcourseKineticPReengage = params.midcourseKineticPReengage ?? params.pReengage ?? 0.85;
  const midcourseDoctrineLine = formatDoctrineLine(
    midcourseKineticDoctrineMode,
    midcourseKineticShotsPerTarget,
    midcourseKineticMaxShotsPerTarget,
    midcourseKineticPReengage
  );

  const boostKineticDoctrineMode = params.boostKineticDoctrineMode ?? params.doctrineMode ?? "barrage";
  const boostKineticShotsPerTarget = params.boostKineticShotsPerTarget ?? params.shotsPerTarget ?? 2;
  const boostKineticMaxShotsPerTarget = params.boostKineticMaxShotsPerTarget ?? params.maxShotsPerTarget ?? 4;
  const boostKineticPReengage = params.boostKineticPReengage ?? params.pReengage ?? 0.85;
  const boostKineticDoctrineLine = formatDoctrineLine(
    boostKineticDoctrineMode,
    boostKineticShotsPerTarget,
    boostKineticMaxShotsPerTarget,
    boostKineticPReengage
  );

  const nSpaceBoostKinetic = params.nSpaceBoostKinetic ?? 0;
  const pkSpaceBoostKinetic = params.pkSpaceBoostKinetic ?? 0;
  const nSpaceBoostDirected = params.nSpaceBoostDirected ?? 0;
  const pkSpaceBoostDirected = params.pkSpaceBoostDirected ?? 0;
  const nMidcourseSpaceKinetic = params.nMidcourseSpaceKinetic ?? params.interceptors?.midcourse_kinetic?.deployed ?? 0;
  const pkMidcourseSpaceKinetic = params.pkMidcourseSpaceKinetic ?? params.interceptors?.midcourse_kinetic?.pk ?? 0;
  const nMidcourseSpaceLaser = params.nMidcourseSpaceLaser ?? params.interceptors?.midcourse_laser?.deployed ?? 0;
  const pkMidcourseSpaceLaser = params.pkMidcourseSpaceLaser ?? params.interceptors?.midcourse_laser?.pk ?? 0;
  const nTerminalKinetic = params.nTerminalKinetic ?? params.interceptors?.terminal_kinetic?.deployed ?? 0;
  const pkTerminalKinetic = params.pkTerminalKinetic ?? params.interceptors?.terminal_kinetic?.pk ?? 0;
  const nTerminalNuclear = params.nTerminalNuclear ?? params.interceptors?.terminal_nuclear?.deployed ?? 0;
  const pkTerminalNuclear = params.pkTerminalNuclear ?? params.interceptors?.terminal_nuclear?.pk ?? 0;
  const boostDirectedTargetsPerPlatform = params.boostDirectedTargetsPerPlatform ?? 2;
  const midcourseDirectedTargetsPerPlatform = params.midcourseDirectedTargetsPerPlatform ?? 3;
  const midcourseSpaceAvailabilityMultiplier =
    params.midcourseSpaceAvailabilityMultiplier ?? MIDCOURSE_SPACE_AVAILABILITY;
  const launchRegion = params.launchRegion ?? 'default';
  const boostScenario = buildBoostScenario(params);
  const asatEffects = boostScenario.asatEffects ?? {};
  const pAsatCyberEffect = params.pAsatCyberEffect ?? asatEffects.pAsatCyberEffect ?? 0;
  const nAsatHitToKill = params.nAsatHitToKill ?? asatEffects.nAsatHitToKill ?? 0;
  const pAsatHitToKill = params.pAsatHitToKill ?? asatEffects.pAsatHitToKill ?? 0;
  const nAsatNuclear = params.nAsatNuclear ?? asatEffects.nAsatNuclear ?? 0;
  const pAsatNuclearEffect = params.pAsatNuclearEffect ?? asatEffects.pAsatNuclearEffect ?? 0;
  const availabilityMultiplier = asatEffects.availabilityMultiplier ?? boostScenario.availabilityMultiplier ?? 1;
  const detectionMultiplier = asatEffects.detectionMultiplier ?? boostScenario.detectionMultiplier ?? 1;
  const deployedMidcourseSpaceInterceptors =
    result.deployedMidcourseSpaceInterceptors ?? (nMidcourseSpaceKinetic + nMidcourseSpaceLaser);
  const effectiveMidcourseSpaceInterceptorsAvailable =
    result.effectiveMidcourseSpaceInterceptorsAvailable ?? 0;
  const asatDetectPenalty = params.asatDetectPenalty ?? params.countermeasures?.asatDetectPenalty ?? 0;
  const asatSpacePkPenalty = params.asatSpacePkPenalty ?? params.countermeasures?.asatSpacePkPenalty ?? 0;
  const boostEvasionPenalty = params.boostEvasionPenalty ?? 0;
  const meanDeliveredKilotons = s.meanDeliveredKilotons ?? s.meanKtDelivered ?? 0;
  const p10DeliveredKilotons = s.p10DeliveredKilotons ?? s.p10KtDelivered ?? 0;
  const medianDeliveredKilotons = s.medianDeliveredKilotons ?? s.medianKtDelivered ?? 0;
  const p90DeliveredKilotons = s.p90DeliveredKilotons ?? s.p90KtDelivered ?? 0;

  let html = `
    <div class="results-content">
      <h3>Inputs</h3>
      <div class="results-grid">

        <div class="results-input-group-label results-input-group-label--first">Strike Salvo</div>
        <div class="result-item">
          <span class="label">Ballistic missiles:</span>
          <span class="value">${params.nMissiles}</span>
        </div>
        <div class="result-item">
          <span class="label">Warheads per missile:</span>
          <span class="value">${params.mirvsPerMissile}</span>
        </div>
        <div class="result-item">
          <span class="label">Kilotons per warhead:</span>
          <span class="value">${fmt(kilotonsPerWarhead, 0)} kt</span>
        </div>
        <div class="result-item">
          <span class="label">Launch region preset:</span>
          <span class="value">${LAUNCH_REGION_PRESETS[launchRegion]?.label ?? launchRegion}</span>
        </div>
        <div class="result-item">
          <span class="label">Real warheads total:</span>
          <span class="value" style="color: var(--accent-red);">${realWarheads}</span>
        </div>
        <div class="result-item">
          <span class="label">Total objects:</span>
          <span class="value">${totalObjects}</span>
        </div>

        <div class="results-input-group-label">Penetration Aids</div>
        <div class="result-item">
          <span class="label">Decoys per missile:</span>
          <span class="value">${decoysPerMissile.toFixed(1)}</span>
        </div>
        <div class="result-item">
          <span class="label">Boost-phase survivability and evasion:</span>
          <span class="value">${fmt(boostEvasionPenalty, 2)}</span>
        </div>

        <div class="results-input-group-label">Counterspace Attack</div>
        <div class="result-item">
          <span class="label">Cyber / EW disruption effectiveness against the space layer:</span>
          <span class="value">${fmt(pAsatCyberEffect, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Direct-ascent hit-to-kill ASAT attempts:</span>
          <span class="value">${nAsatHitToKill}</span>
        </div>
        <div class="result-item">
          <span class="label">Direct-ascent hit-to-kill ASAT effectiveness:</span>
          <span class="value">${fmt(pAsatHitToKill, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Nuclear direct-ascent ASAT attacks:</span>
          <span class="value">${nAsatNuclear}</span>
        </div>
        <div class="result-item">
          <span class="label">Nuclear direct-ascent ASAT effectiveness:</span>
          <span class="value">${fmt(pAsatNuclearEffect, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">ASAT detection penalty:</span>
          <span class="value">${fmt(asatDetectPenalty, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">ASAT space-interceptor kill-probability penalty:</span>
          <span class="value">${fmt(asatSpacePkPenalty, 2)}</span>
        </div>

        <div class="results-input-group-label">Sensors and Detection</div>
        <div class="result-item">
          <span class="label">Blue network baseline missile/object detection and tracking probability:</span>
          <span class="value">${fmt(params.pDetectTrack, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Blue network warhead discrimination accuracy (warhead classified as warhead):</span>
          <span class="value">${fmt(params.pClassifyWarhead, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Blue network discrimination false-alarm rate (decoy misclassified as warhead):</span>
          <span class="value">${fmt(params.pFalseAlarmDecoy, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Discrimination note:</span>
          <span class="value">These global Blue sensing/tracking/discrimination assumptions are upstream of interceptor engagement. Midcourse outcomes are especially sensitive to warhead/decoy discrimination quality.</span>
        </div>
        <div class="result-item">
          <span class="label">Boost-phase detection/tracking multiplier:</span>
          <span class="value">${fmt(detectionMultiplier, 2)}</span>
        </div>

        <div class="results-input-group-label">Ground-Based Midcourse Interceptors</div>
        <div class="result-item">
          <span class="label">Existing ground-based midcourse interceptors in engagement range:</span>
          <span class="value">${params.nInventory}</span>
        </div>
        <div class="result-item">
          <span class="label">Ground-based midcourse interceptor kill probability:</span>
          <span class="value">${fmt(params.pkWarhead, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Ground-based kinetic midcourse doctrine:</span>
          <span class="value">${midcourseDoctrineLine}</span>
        </div>

        <div class="results-input-group-label">Hypothetical Space-Based Interceptors</div>
        <div class="result-item">
          <span class="label">Hypothetical space-based kinetic boost interceptors in orbit:</span>
          <span class="value">${nSpaceBoostKinetic}</span>
        </div>
        <div class="result-item">
          <span class="label">Hypothetical space-based kinetic boost interceptor kill probability:</span>
          <span class="value">${fmt(pkSpaceBoostKinetic, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Hypothetical space-based directed-energy interceptor platforms in orbit:</span>
          <span class="value">${nSpaceBoostDirected}</span>
        </div>
        <div class="result-item">
          <span class="label">Hypothetical space-based directed-energy boost interceptor kill probability:</span>
          <span class="value">${fmt(pkSpaceBoostDirected, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Boost-phase directed-energy engagement opportunities per hypothetical orbital platform (aggregated capacity assumption):</span>
          <span class="value">${boostDirectedTargetsPerPlatform}</span>
        </div>
        <div class="result-item">
          <span class="label">Boost directed-energy capacity note:</span>
          <span class="value">Boost directed-energy opportunities per platform are modeled as a reduced-form capacity assumption, not an explicit timeline simulation of boost-window timing, dwell, slew/retarget, or handoff dynamics.</span>
        </div>
        <div class="result-item">
          <span class="label">Hypothetical space-based kinetic boost engagement doctrine:</span>
          <span class="value">${boostKineticDoctrineLine}</span>
        </div>
        <div class="result-item">
          <span class="label">Hypothetical space-based kinetic midcourse interceptors in orbit:</span>
          <span class="value">${nMidcourseSpaceKinetic}</span>
        </div>
        <div class="result-item">
          <span class="label">Hypothetical space-based kinetic midcourse interceptor kill probability:</span>
          <span class="value">${fmt(pkMidcourseSpaceKinetic, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Hypothetical space-based directed-energy midcourse interceptor platforms in orbit:</span>
          <span class="value">${nMidcourseSpaceLaser}</span>
        </div>
        <div class="result-item">
          <span class="label">Hypothetical space-based directed-energy midcourse interceptor kill probability:</span>
          <span class="value">${fmt(pkMidcourseSpaceLaser, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Directed-energy midcourse engagement opportunities per hypothetical orbital platform:</span>
          <span class="value">${midcourseDirectedTargetsPerPlatform}</span>
        </div>
        <div class="result-item">
          <span class="label">Midcourse space interceptor availability (fraction of constellation able to engage):</span>
          <span class="value">${fmt(midcourseSpaceAvailabilityMultiplier, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Space-layer constellation availability note:</span>
          <span class="value">Space interceptor availability accounts for orbital geometry limits. Only a fraction of deployed satellites can engage a given trajectory during the midcourse phase.</span>
        </div>
        <div class="result-item">
          <span class="label">Deployed midcourse space interceptors:</span>
          <span class="value">${deployedMidcourseSpaceInterceptors}</span>
        </div>
        <div class="result-item">
          <span class="label">Effective midcourse space interceptors available:</span>
          <span class="value">${effectiveMidcourseSpaceInterceptorsAvailable}</span>
        </div>
        <div class="result-item">
          <span class="label">Space-based boost interceptor availability multiplier:</span>
          <span class="value">${fmt(availabilityMultiplier, 2)}</span>
        </div>

        <div class="results-input-group-label">Hypothetical Terminal Interceptors</div>
        <div class="result-item">
          <span class="label">Hypothetical ground-based terminal kinetic interceptors in engagement range:</span>
          <span class="value">${nTerminalKinetic}</span>
        </div>
        <div class="result-item">
          <span class="label">Hypothetical ground-based terminal kinetic interceptor kill probability:</span>
          <span class="value">${fmt(pkTerminalKinetic, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Hypothetical ground-based terminal nuclear interceptors in engagement range:</span>
          <span class="value">${nTerminalNuclear}</span>
        </div>
        <div class="result-item">
          <span class="label">Hypothetical ground-based terminal nuclear interceptor kill probability:</span>
          <span class="value">${fmt(pkTerminalNuclear, 2)}</span>
        </div>

        <div class="results-input-group-label">System Status</div>
        <div class="result-item">
          <span class="label">Blue system operational availability:</span>
          <span class="value">${fmt(params.pSystemUp, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Detection/tracking degradation when the Blue system fails:</span>
          <span class="value">${fmt(1 - params.detectDegradeFactor, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Interceptor kill-probability degradation when the Blue system fails:</span>
          <span class="value">${fmt(1 - params.pkDegradeFactor, 2)}</span>
        </div>

        <div class="results-input-group-label">Model Computation</div>
        <div class="result-item">
          <span class="label">Trials:</span>
          <span class="value">${params.nTrials}</span>
        </div>

      </div>

      <h3>Key Outputs</h3>
      <div class="results-grid">
        <div class="result-item highlight">
          <span class="label">Mean Penetrated:</span>
          <span class="value" style="color: var(--accent-red);">${fmt(s.meanPenReal, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">P10 / Median / P90:</span>
          <span class="value">${s.p10PenReal.toFixed(0)} / ${s.medianPenReal.toFixed(0)} / ${s.p90PenReal.toFixed(0)}</span>
        </div>
        <div class="result-item">
          <span class="label">Penetration Rate:</span>
          <span class="value">${fmt(100 * s.meanPenRateReal, 1)}%</span>
        </div>
        <div class="result-item">
          <span class="label">Mean Intercepted:</span>
          <span class="value" style="color: var(--accent-green);">${fmt(s.meanIntReal, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Mean delivered kilotons:</span>
          <span class="value" style="color: var(--accent-red);">${fmt(meanDeliveredKilotons, 1)} kt</span>
        </div>
        <div class="result-item">
          <span class="label">Delivered kilotons P10 / Median / P90:</span>
          <span class="value">${fmt(p10DeliveredKilotons, 0)} / ${fmt(medianDeliveredKilotons, 0)} / ${fmt(p90DeliveredKilotons, 0)} kt</span>
        </div>
      </div>
  `;

  // Per-phase breakdown if available
  if (s.meanBoostMissilesKilled != null) {
    html += `
      <h3>Per-Phase Breakdown</h3>
      <div class="results-grid">
        <div class="result-item">
          <span class="label">Boost: Missiles Killed</span>
          <span class="value">${fmt(s.meanBoostMissilesKilled, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Boost: Warheads Destroyed</span>
          <span class="value">${fmt(s.meanBoostWarheadsDestroyed, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Midcourse: Warheads Killed</span>
          <span class="value">${fmt(s.meanMidcourseWarheadsKilled, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Terminal: Warheads Killed</span>
          <span class="value">${fmt(s.meanTerminalWarheadsKilled, 2)}</span>
        </div>
      </div>
    `;
  }

  // Architecture cost (only shown when interceptors data is available)
  if (s.architectureCost_M > 0) {
    html += `
      <h3>Architecture Cost</h3>
      <div class="results-grid">
        <div class="result-item">
          <span class="label">Estimated interceptor architecture cost:</span>
          <span class="value">$${fmt(s.architectureCost_B, 1)}B</span>
        </div>
      </div>
    `;
  }

  // Output-only diagnostic for common-mode uptime realization.
  html += `
    <h3>System Status</h3>
    <div class="results-grid">
      <div class="result-item">
        <span class="label">Observed system operational availability:</span>
        <span class="value">${fmt(s.meanSystemUp, 2)}</span>
      </div>
    </div>
  `;

  // Charts
  if (result.penReal && result.penReal.length > 0) {
    const deliveredKilotonsSeries = result.deliveredKilotons ?? result.ktDelivered ?? [];
    const defaultDistTitle = 'Delivered Kilotons';
    const defaultDistChartOptions = distributionChartOptions(defaultDistTitle, params);
    html += `
      <h3>Distributions</h3>
      <div class="results-distribution-viewer" data-dist-viewer>
        <div class="results-dist-toolbar">
          <div class="results-dist-head">
            <div class="results-dist-active-title" data-dist-title>${defaultDistTitle}</div>
            <div class="results-dist-index" data-dist-index>1 / 3</div>
          </div>
          <div class="results-dist-nav">
            <button class="results-dist-nav-btn" type="button" data-dist-nav="prev" aria-label="Previous distribution">←</button>
            <button class="results-dist-nav-btn" type="button" data-dist-nav="next" aria-label="Next distribution">→</button>
          </div>
        </div>
        <div class="results-dist-stage" data-dist-stage>
          ${renderHistogramHTML(
            deliveredKilotonsSeries,
            defaultDistChartOptions.bins,
            defaultDistTitle,
            defaultDistChartOptions
          )}
        </div>
      </div>
    `;
  }

  html += `</div>`;
  return html;
}
