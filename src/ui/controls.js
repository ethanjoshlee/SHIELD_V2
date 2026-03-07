/**
 * UI controls — HTML template, parameter reading, and doctrine toggle.
 */

import { clamp01 } from '../utils/rng.js';
import { COUNTRIES } from '../config/countries.js';
import { LAUNCH_REGION_ORDER, LAUNCH_REGION_PRESETS } from '../config/launchRegions.js';

function launchRegionOptionsHTML(selected) {
  return LAUNCH_REGION_ORDER.map((key) => {
    const label = LAUNCH_REGION_PRESETS[key]?.label ?? key;
    const isSelected = key === selected ? 'selected' : '';
    return `<option value="${key}" ${isSelected}>${label}</option>`;
  }).join('');
}


/**
 * Read all parameter values from the UI form inputs.
 * Supports both id-based and data-param based inputs.
 * @param {string} blueKey - Optional country key for defender
 * @param {string} redKey - Optional country key for attacker
 */
export function readParamsFromUI(blueKey, redKey, root = document) {
  const bluePreset = blueKey ? COUNTRIES.blue[blueKey] : null;
  const redPreset = redKey ? COUNTRIES.red[redKey] : null;

  const getValue = (id, param, defaultVal) => {
    let el = document.getElementById(id);
    if (!el) el = root.querySelector(`[data-param="${param}"]`);
    return el?.value || defaultVal;
  };

  const nMissiles = Math.max(0, parseInt(getValue("nMissiles", "nMissiles", 0), 10) || 0);
  const mirvsPerMissile = Math.max(1, parseInt(getValue("mirvsPerMissile", "mirvsPerMissile", 1), 10) || 1);

  // Decoys per missile formula: decoysPerWarhead = decoysPerMissile / mirvsPerMissile
  let decoysPerWarhead;
  const decoysEl = root.querySelector('[data-param="decoysPerMissile"]');
  if (decoysEl) {
    const decoysPerMissile = Math.max(0, parseFloat(decoysEl.value) || 0);
    decoysPerWarhead = decoysPerMissile / Math.max(1, mirvsPerMissile);
  } else {
    decoysPerWarhead = Math.max(0, parseInt(getValue("decoysPerWarhead", "decoysPerWarhead", 0), 10) || 0);
  }

  const pDetectTrack = clamp01(parseFloat(getValue("pDetectTrack", "pDetectTrack", 0.8)) || 0);
  const pClassifyWarhead = clamp01(parseFloat(getValue("pClassifyWarhead", "pClassifyWarhead", 0.8)) || 0);
  const pFalseAlarmDecoy = clamp01(parseFloat(getValue("pFalseAlarmDecoy", "pFalseAlarmDecoy", 0.2)) || 0);

  const doctrineMode = getValue("doctrineMode", "doctrineMode", "barrage");
  const shotsPerTarget = Math.max(0, parseInt(getValue("shotsPerTarget", "shotsPerTarget", 0), 10) || 0);
  const maxShotsPerTarget = Math.max(0, parseInt(getValue("maxShotsPerTarget", "maxShotsPerTarget", 0), 10) || 0);
  const pReengage = clamp01(parseFloat(getValue("pReengage", "pReengage", 0.85)) || 0);

  const pkWarhead = clamp01(parseFloat(getValue("pkWarhead", "pkWarhead", 0.6)) || 0);
  const pkDecoy = clamp01(parseFloat(getValue("pkDecoy", "pkDecoy", 0.8)) || 0);

  const nInventory = Math.max(0, parseInt(getValue("nInventory", "nInventory", 0), 10) || 0);

  const nSpaceBoostKinetic = Math.max(
    0,
    parseInt(
      getValue(
        "nSpaceBoostKinetic",
        "nSpaceBoostKinetic",
        bluePreset?.nSpaceBoostKinetic ?? bluePreset?.interceptors?.boost_kinetic?.deployed ?? 0
      ),
      10
    ) || 0
  );
  const pkSpaceBoostKinetic = clamp01(
    parseFloat(
      getValue(
        "pkSpaceBoostKinetic",
        "pkSpaceBoostKinetic",
        bluePreset?.pkSpaceBoostKinetic ?? bluePreset?.interceptors?.boost_kinetic?.pk ?? 0.5
      )
    ) || 0
  );
  const nSpaceBoostDirected = Math.max(
    0,
    parseInt(
      getValue(
        "nSpaceBoostDirected",
        "nSpaceBoostDirected",
        bluePreset?.nSpaceBoostDirected ?? bluePreset?.interceptors?.boost_laser?.deployed ?? 0
      ),
      10
    ) || 0
  );
  const pkSpaceBoostDirected = clamp01(
    parseFloat(
      getValue(
        "pkSpaceBoostDirected",
        "pkSpaceBoostDirected",
        bluePreset?.pkSpaceBoostDirected ?? bluePreset?.interceptors?.boost_laser?.pk ?? 0.4
      )
    ) || 0
  );

  const launchRegion = getValue(
    "launchRegion",
    "launchRegion",
    redPreset?.launchRegion ?? "default"
  );
  const asatSpaceAvailabilityPenalty = clamp01(
    parseFloat(
      getValue(
        "asatSpaceAvailabilityPenalty",
        "asatSpaceAvailabilityPenalty",
        redPreset?.asatSpaceAvailabilityPenalty ?? redPreset?.countermeasures?.asatSpaceAvailabilityPenalty ?? 0
      )
    ) || 0
  );
  const boostEvasionPenalty = clamp01(
    parseFloat(
      getValue(
        "boostEvasionPenalty",
        "boostEvasionPenalty",
        redPreset?.boostEvasionPenalty ?? 0
      )
    ) || 0
  );

  const nTrials = Math.max(1, parseInt(getValue("nTrials", "nTrials", 1000), 10) || 1000);

  const pSystemUp = clamp01(parseFloat(getValue("pSystemUp", "pSystemUp", 0.9)) || 0);
  const detectDegradeFactor = clamp01(parseFloat(getValue("detectDegradeFactor", "detectDegradeFactor", 0.5)) || 0);
  const pkDegradeFactor = clamp01(parseFloat(getValue("pkDegradeFactor", "pkDegradeFactor", 0.7)) || 0);

  const seedVal = (getValue("seed", "seed", "").trim());
  const seed = seedVal === "" ? null : parseInt(seedVal, 10) || 0;

  return {
    nMissiles,
    mirvsPerMissile,
    decoysPerWarhead,
    pDetectTrack,
    pClassifyWarhead,
    pFalseAlarmDecoy,
    doctrineMode,
    shotsPerTarget,
    maxShotsPerTarget,
    pReengage,
    pkWarhead,
    pkDecoy,
    nInventory,
    nSpaceBoostKinetic,
    pkSpaceBoostKinetic,
    nSpaceBoostDirected,
    pkSpaceBoostDirected,
    launchRegion,
    asatSpaceAvailabilityPenalty,
    boostEvasionPenalty,
    nTrials,
    pSystemUp,
    detectDegradeFactor,
    pkDegradeFactor,
    seed,
    blueKey,
    redKey,
  };
}

function probSlider(label, param, pct, defaultPct, minPct = 0.1) {
  const v = defaultPct ?? pct;
  return `
    <div class="wizard-slider-row">
      <div class="wizard-slider-header">
        <span class="wizard-slider-label">${label}</span>
        <span class="wizard-slider-value">${parseFloat(v).toFixed(1)}%</span>
      </div>
      <input type="range" class="wizard-slider" min="${minPct}" max="99.9" step="0.1" value="${v}" data-prob-target="${param}" />
      <input type="number" class="wizard-hidden-param" data-param="${param}" value="${(v / 100).toFixed(4)}" tabindex="-1" aria-hidden="true" />
    </div>`;
}

function intSlider(label, param, min, max, step, defaultVal) {
  return `
    <div class="wizard-slider-row">
      <div class="wizard-slider-header">
        <span class="wizard-slider-label">${label}</span>
        <span class="wizard-slider-value">${defaultVal}</span>
      </div>
      <input type="range" class="wizard-slider" data-param="${param}" min="${min}" max="${max}" step="${step}" value="${defaultVal}" />
    </div>`;
}

/**
 * BLUE step parameters (defender capabilities + engagement doctrine).
 * 2-column layout for paired controls.
 */
export function blueParamsHTML(d) {
  const pdt  = (d.pDetectTrack * 100).toFixed(1);
  const pcw  = (d.pClassifyWarhead * 100).toFixed(1);
  const pfa  = (d.pFalseAlarmDecoy * 100).toFixed(1);
  const pkw  = (d.pkWarhead * 100).toFixed(1);
  const pkd  = (d.pkDecoy * 100).toFixed(1);
  const pre  = (d.pReengage * 100).toFixed(1);
  const pkbK = ((d.pkSpaceBoostKinetic ?? 0.5) * 100).toFixed(1);
  const pkbD = ((d.pkSpaceBoostDirected ?? 0.4) * 100).toFixed(1);
  return `
    <div class="wizard-param-group">
      <div class="wizard-param-pair">
        ${probSlider('Detection and tracking probability', 'pDetectTrack', pdt)}
        ${probSlider('Warhead classification accuracy', 'pClassifyWarhead', pcw)}
      </div>
      <div class="wizard-param-pair">
        ${probSlider('Decoy misclassification rate', 'pFalseAlarmDecoy', pfa)}
        ${intSlider('Ground-based interceptors in engagement range', 'nInventory', 10, 2000, 1, d.nInventory)}
      </div>
      <div class="wizard-param-pair">
        ${probSlider('Ground-based interceptor per shot kill probability for warheads', 'pkWarhead', pkw)}
        ${probSlider('Ground-based interceptor per shot kill probability for decoys', 'pkDecoy', pkd)}
      </div>
      <div class="wizard-param-pair">
        ${intSlider('Space-based kinetic boost interceptors deployed', 'nSpaceBoostKinetic', 0, 4000, 1, d.nSpaceBoostKinetic ?? 0)}
        ${probSlider('Space-based kinetic boost interceptor kill probability', 'pkSpaceBoostKinetic', pkbK)}
      </div>
      <div class="wizard-param-pair">
        ${intSlider('Space-based directed-energy boost interceptors deployed', 'nSpaceBoostDirected', 0, 4000, 1, d.nSpaceBoostDirected ?? 0)}
        ${probSlider('Space-based directed-energy boost interceptor kill probability', 'pkSpaceBoostDirected', pkbD)}
      </div>
      <div class="wizard-slider-row">
        <div class="wizard-slider-header">
          <span class="wizard-slider-label">Engagement doctrine</span>
        </div>
        <select class="wizard-select" data-param="doctrineMode">
          <option value="barrage" ${d.doctrineMode === 'barrage' ? 'selected' : ''}>Barrage</option>
          <option value="sls" ${d.doctrineMode === 'sls' ? 'selected' : ''}>Shoot-Look-Shoot</option>
        </select>
      </div>
      <div class="doctrine-barrage-only">
        ${intSlider('Intercept shots per detected/tracked warhead', 'shotsPerTarget', 1, 6, 1, d.shotsPerTarget)}
      </div>
      <div class="doctrine-sls-only" style="display:none">
        <div class="wizard-param-pair">
          ${intSlider('Max shots per detected/tracked warhead', 'maxShotsPerTarget', 1, 6, 1, d.maxShotsPerTarget)}
          ${probSlider('Re-engagement probability per detected/tracked warhead', 'pReengage', pre)}
        </div>
      </div>
    </div>
  `;
}

/**
 * RED step parameters (attacker payload).
 * Uses decoysPerMissile — decoys per missile (independent of missile count).
 */
export function redParamsHTML(d) {
  const decoysPerMissile = d.decoysPerMissile ?? (d.decoysPerWarhead * d.mirvsPerMissile).toFixed(1);
  const asatAvail = ((d.asatSpaceAvailabilityPenalty ?? 0) * 100).toFixed(1);
  const boostEvade = ((d.boostEvasionPenalty ?? 0) * 100).toFixed(1);
  const launchRegion = d.launchRegion ?? 'default';
  return `
    <div class="wizard-param-group">
      <div class="wizard-param-pair">
        ${intSlider('Ballistic missiles in strike', 'nMissiles', 1, 500, 1, d.nMissiles)}
        ${intSlider('Warheads per missile', 'mirvsPerMissile', 1, 16, 1, d.mirvsPerMissile)}
      </div>
      ${intSlider('Decoys per missile', 'decoysPerMissile', 0, 40, 1, decoysPerMissile)}
      <div class="wizard-slider-row">
        <div class="wizard-slider-header">
          <span class="wizard-slider-label">Launch region preset</span>
        </div>
        <select class="wizard-select" data-param="launchRegion">
          ${launchRegionOptionsHTML(launchRegion)}
        </select>
      </div>
      <div class="wizard-param-pair">
        ${probSlider('Anti-satellite attack impact on space-based boost interceptor availability', 'asatSpaceAvailabilityPenalty', asatAvail, undefined, 0)}
        ${probSlider('Missile survivability impact on boost-phase interception', 'boostEvasionPenalty', boostEvade, undefined, 0)}
      </div>
    </div>
  `;
}

/**
 * SIM step parameters (minimal: trials + seed only).
 * Reliability params (pSystemUp, detectDegradeFactor, pkDegradeFactor) use silent DEFAULTS.
 * Hidden inputs ensure readParamsFromUI() still finds all needed params.
 */
export function simParamsHTML(d) {
  return `
    <div class="wizard-param-group">
      ${intSlider('Monte Carlo trials', 'nTrials', 100, 5000, 100, d.nTrials)}
      <div class="wizard-slider-row">
        <div class="wizard-slider-header">
          <span class="wizard-slider-label">Seed (blank = random)</span>
        </div>
        <input type="text" class="wizard-text-input" data-param="seed" placeholder="auto" value="${d.seed ?? ''}" />
      </div>
    </div>
    <input type="number" class="wizard-hidden-param" data-param="pSystemUp" value="${d.pSystemUp}" tabindex="-1" aria-hidden="true" />
    <input type="number" class="wizard-hidden-param" data-param="detectDegradeFactor" value="${d.detectDegradeFactor}" tabindex="-1" aria-hidden="true" />
    <input type="number" class="wizard-hidden-param" data-param="pkDegradeFactor" value="${d.pkDegradeFactor}" tabindex="-1" aria-hidden="true" />
  `;
}

/**
 * Render the dashboard drawer controls panel (tabs for Blue, Red, CM, Sim).
 */
export function renderDrawerControls(container, blueKey, redKey) {
  const d = readParamsFromUI(blueKey, redKey);

  container.innerHTML = `
    <div class="tab-panel active" id="tab-blue">
      <div class="panel-section">
        <h4>Blue (Defender)</h4>
        <p>${blueKey}</p>
        <div class="param-group">
          <label>
            Detection + Tracking P:
            <input type="number" class="param-input" data-param="pDetectTrack" min="0" max="1" step="0.01" value="${d.pDetectTrack}" />
          </label>
          <label>
            Classifier TPR (W→W):
            <input type="number" class="param-input" data-param="pClassifyWarhead" min="0" max="1" step="0.01" value="${d.pClassifyWarhead}" />
          </label>
          <label>
            Classifier FPR (D→W):
            <input type="number" class="param-input" data-param="pFalseAlarmDecoy" min="0" max="1" step="0.01" value="${d.pFalseAlarmDecoy}" />
          </label>
          <label>
            Ground-based interceptor per shot kill probability for warheads:
            <input type="number" class="param-input" data-param="pkWarhead" min="0" max="1" step="0.01" value="${d.pkWarhead}" />
          </label>
          <label>
            Ground-based interceptor per shot kill probability for decoys:
            <input type="number" class="param-input" data-param="pkDecoy" min="0" max="1" step="0.01" value="${d.pkDecoy}" />
          </label>
          <label>
            Ground-based interceptors in engagement range:
            <input type="number" class="param-input" data-param="nInventory" min="0" step="1" value="${d.nInventory}" />
          </label>
          <label>
            Space-based kinetic boost interceptors deployed:
            <input type="number" class="param-input" data-param="nSpaceBoostKinetic" min="0" step="1" value="${d.nSpaceBoostKinetic ?? 0}" />
          </label>
          <label>
            Space-based kinetic boost interceptor kill probability:
            <input type="number" class="param-input" data-param="pkSpaceBoostKinetic" min="0" max="1" step="0.01" value="${d.pkSpaceBoostKinetic ?? 0.5}" />
          </label>
          <label>
            Space-based directed-energy boost interceptors deployed:
            <input type="number" class="param-input" data-param="nSpaceBoostDirected" min="0" step="1" value="${d.nSpaceBoostDirected ?? 0}" />
          </label>
          <label>
            Space-based directed-energy boost interceptor kill probability:
            <input type="number" class="param-input" data-param="pkSpaceBoostDirected" min="0" max="1" step="0.01" value="${d.pkSpaceBoostDirected ?? 0.4}" />
          </label>
        </div>
      </div>
    </div>

    <div class="tab-panel" id="tab-red">
      <div class="panel-section">
        <h4>Red (Attacker)</h4>
        <p>${redKey}</p>
        <div class="param-group">
          <label>
            Missiles:
            <input type="number" class="param-input" data-param="nMissiles" min="1" step="1" value="${d.nMissiles}" />
          </label>
          <label>
            MIRVs per Missile:
            <input type="number" class="param-input" data-param="mirvsPerMissile" min="1" step="1" value="${d.mirvsPerMissile}" />
          </label>
          <label>
            Decoys per Warhead:
            <input type="number" class="param-input" data-param="decoysPerWarhead" min="0" step="1" value="${d.decoysPerWarhead}" />
          </label>
          <label>
            Launch region preset:
            <select class="param-input" data-param="launchRegion">
              ${launchRegionOptionsHTML(d.launchRegion ?? 'default')}
            </select>
          </label>
          <label>
            Anti-satellite attack impact on space-based boost interceptor availability:
            <input type="number" class="param-input" data-param="asatSpaceAvailabilityPenalty" min="0" max="1" step="0.01" value="${d.asatSpaceAvailabilityPenalty ?? 0}" />
          </label>
          <label>
            Missile survivability impact on boost-phase interception:
            <input type="number" class="param-input" data-param="boostEvasionPenalty" min="0" max="1" step="0.01" value="${d.boostEvasionPenalty ?? 0}" />
          </label>
        </div>
      </div>
    </div>

    <div class="tab-panel" id="tab-cm">
      <div class="panel-section">
        <h4>Common Mode (Reliability)</h4>
        <div class="param-group">
          <label>
            P(System Up):
            <input type="number" class="param-input" data-param="pSystemUp" min="0" max="1" step="0.01" value="${d.pSystemUp}" />
          </label>
          <label>
            Detect Degrade Factor:
            <input type="number" class="param-input" data-param="detectDegradeFactor" min="0" max="1" step="0.01" value="${d.detectDegradeFactor}" />
          </label>
          <label>
            Pk Degrade Factor:
            <input type="number" class="param-input" data-param="pkDegradeFactor" min="0" max="1" step="0.01" value="${d.pkDegradeFactor}" />
          </label>
        </div>
      </div>
    </div>

    <div class="tab-panel" id="tab-sim">
      <div class="panel-section">
        <h4>Simulation</h4>
        <div class="param-group">
          <label>
            Doctrine Mode:
            <select class="param-input" data-param="doctrineMode">
              <option value="barrage" ${d.doctrineMode === 'barrage' ? 'selected' : ''}>Barrage</option>
              <option value="sls" ${d.doctrineMode === 'sls' ? 'selected' : ''}>Shoot-Look-Shoot</option>
            </select>
          </label>
          <label>
            Shots/Track (Barrage):
            <input type="number" class="param-input" data-param="shotsPerTarget" min="0" step="1" value="${d.shotsPerTarget}" />
          </label>
          <label>
            Max Shots/Track (SLS):
            <input type="number" class="param-input" data-param="maxShotsPerTarget" min="0" step="1" value="${d.maxShotsPerTarget}" />
          </label>
          <label>
            P(Re-engage):
            <input type="number" class="param-input" data-param="pReengage" min="0" max="1" step="0.01" value="${d.pReengage}" />
          </label>
          <label>
            Monte Carlo Trials:
            <input type="number" class="param-input" data-param="nTrials" min="1" step="100" value="${d.nTrials}" />
          </label>
          <label>
            Seed (blank=random):
            <input type="number" class="param-input" data-param="seed" step="1" value="${d.seed || ''}" />
          </label>
        </div>
      </div>
    </div>
  `;
}
