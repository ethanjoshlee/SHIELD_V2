/**
 * Results panel rendering for the dashboard.
 */

import { fmt } from '../utils/format.js';
import { renderHistogramHTML } from './charts.js';

export function renderResultsContent(params, result) {
  const s = result.summary;

  const realWarheads = params.nMissiles * params.mirvsPerMissile;
  const decoysPerMissile = params.decoysPerWarhead * params.mirvsPerMissile;
  const decoys = realWarheads * params.decoysPerWarhead;
  const totalObjects = realWarheads + decoys;

  const doctrineLine =
    params.doctrineMode === "barrage"
      ? `Barrage, ${params.shotsPerTarget} shots per detected/tracked target`
      : `SLS, max ${params.maxShotsPerTarget} shots per detected/tracked target, P(re-engage)=${fmt(params.pReengage, 2)}`;

  const nSpaceBoostKinetic = params.nSpaceBoostKinetic ?? 0;
  const pkSpaceBoostKinetic = params.pkSpaceBoostKinetic ?? 0;
  const nSpaceBoostDirected = params.nSpaceBoostDirected ?? 0;
  const pkSpaceBoostDirected = params.pkSpaceBoostDirected ?? 0;
  const launchRegion = params.launchRegion ?? 'default';
  const asatSpaceAvailabilityPenalty = params.asatSpaceAvailabilityPenalty ?? 0;
  const boostEvasionPenalty = params.boostEvasionPenalty ?? 0;

  let html = `
    <div class="results-content">
      <h3>Inputs</h3>
      <div class="results-grid">
        <div class="result-item">
          <span class="label">Ballistic missiles:</span>
          <span class="value">${params.nMissiles}</span>
        </div>
        <div class="result-item">
          <span class="label">Warheads per missile:</span>
          <span class="value">${params.mirvsPerMissile}</span>
        </div>
        <div class="result-item">
          <span class="label">Decoys per missile:</span>
          <span class="value">${decoysPerMissile.toFixed(1)}</span>
        </div>
        <div class="result-item">
          <span class="label">Real warheads total:</span>
          <span class="value" style="color: var(--accent-red);">${realWarheads}</span>
        </div>
        <div class="result-item">
          <span class="label">Total objects:</span>
          <span class="value">${totalObjects}</span>
        </div>
        <div class="result-item">
          <span class="label">Detection and tracking:</span>
          <span class="value">${fmt(params.pDetectTrack, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Warhead classification accuracy:</span>
          <span class="value">${fmt(params.pClassifyWarhead, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Decoy misclassification rate:</span>
          <span class="value">${fmt(params.pFalseAlarmDecoy, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Doctrine:</span>
          <span class="value">${doctrineLine}</span>
        </div>
        <div class="result-item">
          <span class="label">Ground-based interceptors in engagement range:</span>
          <span class="value">${params.nInventory}</span>
        </div>
        <div class="result-item">
          <span class="label">Ground-based interceptor kill probability vs warheads:</span>
          <span class="value">${fmt(params.pkWarhead, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Ground-based interceptor kill probability vs decoys:</span>
          <span class="value">${fmt(params.pkDecoy, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Space-based kinetic boost interceptors deployed:</span>
          <span class="value">${nSpaceBoostKinetic}</span>
        </div>
        <div class="result-item">
          <span class="label">Space-based kinetic boost interceptor kill probability:</span>
          <span class="value">${fmt(pkSpaceBoostKinetic, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Space-based directed-energy boost interceptors deployed:</span>
          <span class="value">${nSpaceBoostDirected}</span>
        </div>
        <div class="result-item">
          <span class="label">Space-based directed-energy boost interceptor kill probability:</span>
          <span class="value">${fmt(pkSpaceBoostDirected, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Launch region preset:</span>
          <span class="value">${launchRegion}</span>
        </div>
        <div class="result-item">
          <span class="label">Anti-satellite attack impact on space-based boost interceptor availability:</span>
          <span class="value">${fmt(asatSpaceAvailabilityPenalty, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Missile survivability impact on boost-phase interception:</span>
          <span class="value">${fmt(boostEvasionPenalty, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Trials:</span>
          <span class="value">${params.nTrials}</span>
        </div>
      </div>

      <h3>Key Results (Real Warheads Only)</h3>
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
          <span class="label">Post-separation: Warheads Killed</span>
          <span class="value">${fmt(s.meanMidcourseWarheadsKilled, 2)}</span>
        </div>
        <div class="result-item">
          <span class="label">Terminal: Warheads Killed</span>
          <span class="value">${fmt(s.meanTerminalWarheadsKilled, 2)}</span>
        </div>
      </div>
    `;
  }

  // Yield delivery if available
  if (s.meanKtDelivered != null) {
    html += `
      <h3>Yield Delivered</h3>
      <div class="results-grid">
        <div class="result-item">
          <span class="label">Mean Kilotons:</span>
          <span class="value">${fmt(s.meanKtDelivered, 1)} kt</span>
        </div>
        <div class="result-item">
          <span class="label">P10 / Median / P90:</span>
          <span class="value">${fmt(s.p10KtDelivered, 0)} / ${fmt(s.medianKtDelivered, 0)} / ${fmt(s.p90KtDelivered, 0)} kt</span>
        </div>
      </div>
    `;
  }

  // Common mode reliability
  html += `
    <h3>Reliability</h3>
    <div class="results-grid">
      <div class="result-item">
        <span class="label">P(System Up):</span>
        <span class="value">${fmt(params.pSystemUp, 2)}</span>
      </div>
      <div class="result-item">
        <span class="label">Observed System Up:</span>
        <span class="value">${fmt(s.meanSystemUp, 2)}</span>
      </div>
      <div class="result-item">
        <span class="label">Detect Degrade Factor:</span>
        <span class="value">${fmt(params.detectDegradeFactor, 2)}</span>
      </div>
      <div class="result-item">
        <span class="label">Pk Degrade Factor:</span>
        <span class="value">${fmt(params.pkDegradeFactor, 2)}</span>
      </div>
    </div>
  `;

  // Charts
  if (result.penReal && result.penReal.length > 0) {
    html += `
      <h3>Distributions</h3>
      <div class="results-charts">
        ${renderHistogramHTML(result.penReal, 20, 'Penetrated Real Warheads', { width: 280, height: 100 })}
        ${renderHistogramHTML(result.intReal, 20, 'Intercepted Real Warheads', { width: 280, height: 100 })}
      </div>
    `;
  }

  html += `</div>`;
  return html;
}
