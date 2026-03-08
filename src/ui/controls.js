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
  const kilotonsPerWarhead = Math.min(
    5000,
    Math.max(
      20,
      parseFloat(
        getValue(
          "kilotonsPerWarhead",
          "kilotonsPerWarhead",
          redPreset?.kilotonsPerWarhead ?? 400
        )
      ) || 400
    )
  );

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

  // Legacy global doctrine params are retained as fallback for backward compatibility.
  const doctrineMode = getValue("doctrineMode", "doctrineMode", "barrage");
  const shotsPerTarget = Math.max(0, parseInt(getValue("shotsPerTarget", "shotsPerTarget", 0), 10) || 0);
  const maxShotsPerTarget = Math.max(0, parseInt(getValue("maxShotsPerTarget", "maxShotsPerTarget", 0), 10) || 0);
  const pReengage = clamp01(parseFloat(getValue("pReengage", "pReengage", 0.85)) || 0);

  // Family-specific doctrine params take precedence when present.
  const midcourseKineticDoctrineMode = getValue(
    "midcourseKineticDoctrineMode",
    "midcourseKineticDoctrineMode",
    doctrineMode
  );
  const midcourseKineticShotsPerTarget = Math.max(
    0,
    parseInt(
      getValue("midcourseKineticShotsPerTarget", "midcourseKineticShotsPerTarget", shotsPerTarget),
      10
    ) || 0
  );
  const midcourseKineticMaxShotsPerTarget = Math.max(
    0,
    parseInt(
      getValue("midcourseKineticMaxShotsPerTarget", "midcourseKineticMaxShotsPerTarget", maxShotsPerTarget),
      10
    ) || 0
  );
  const midcourseKineticPReengage = clamp01(
    parseFloat(
      getValue("midcourseKineticPReengage", "midcourseKineticPReengage", pReengage)
    ) || 0
  );

  const boostKineticDoctrineMode = getValue(
    "boostKineticDoctrineMode",
    "boostKineticDoctrineMode",
    doctrineMode
  );
  const boostKineticShotsPerTarget = Math.max(
    0,
    parseInt(
      getValue("boostKineticShotsPerTarget", "boostKineticShotsPerTarget", shotsPerTarget),
      10
    ) || 0
  );
  const boostKineticMaxShotsPerTarget = Math.max(
    0,
    parseInt(
      getValue("boostKineticMaxShotsPerTarget", "boostKineticMaxShotsPerTarget", maxShotsPerTarget),
      10
    ) || 0
  );
  const boostKineticPReengage = clamp01(
    parseFloat(
      getValue("boostKineticPReengage", "boostKineticPReengage", pReengage)
    ) || 0
  );

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
  const boostDirectedTargetsPerPlatform = Math.min(
    9,
    Math.max(
      1,
      parseInt(
        getValue(
          "boostDirectedTargetsPerPlatform",
          "boostDirectedTargetsPerPlatform",
          2
        ),
        10
      ) || 2
    )
  );

  const launchRegion = getValue(
    "launchRegion",
    "launchRegion",
    redPreset?.launchRegion ?? "default"
  );
  const pAsatCyberEffect = clamp01(
    parseFloat(
      getValue(
        "pAsatCyberEffect",
        "pAsatCyberEffect",
        redPreset?.pAsatCyberEffect ?? 0.18
      )
    ) || 0
  );
  const nAsatHitToKill = Math.max(
    0,
    parseInt(
      getValue(
        "nAsatHitToKill",
        "nAsatHitToKill",
        redPreset?.nAsatHitToKill ?? 24
      ),
      10
    ) || 0
  );
  const pAsatHitToKill = clamp01(
    parseFloat(
      getValue(
        "pAsatHitToKill",
        "pAsatHitToKill",
        redPreset?.pAsatHitToKill ?? 0.40
      )
    ) || 0
  );
  const nAsatNuclear = Math.max(
    0,
    parseInt(
      getValue(
        "nAsatNuclear",
        "nAsatNuclear",
        redPreset?.nAsatNuclear ?? 0
      ),
      10
    ) || 0
  );
  const pAsatNuclearEffect = clamp01(
    parseFloat(
      getValue(
        "pAsatNuclearEffect",
        "pAsatNuclearEffect",
        redPreset?.pAsatNuclearEffect ?? 0.55
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
    kilotonsPerWarhead,
    decoysPerWarhead,
    pDetectTrack,
    pClassifyWarhead,
    pFalseAlarmDecoy,
    doctrineMode,
    shotsPerTarget,
    maxShotsPerTarget,
    pReengage,
    midcourseKineticDoctrineMode,
    midcourseKineticShotsPerTarget,
    midcourseKineticMaxShotsPerTarget,
    midcourseKineticPReengage,
    boostKineticDoctrineMode,
    boostKineticShotsPerTarget,
    boostKineticMaxShotsPerTarget,
    boostKineticPReengage,
    pkWarhead,
    pkDecoy,
    nInventory,
    nSpaceBoostKinetic,
    pkSpaceBoostKinetic,
    nSpaceBoostDirected,
    pkSpaceBoostDirected,
    boostDirectedTargetsPerPlatform,
    launchRegion,
    pAsatCyberEffect,
    nAsatHitToKill,
    pAsatHitToKill,
    nAsatNuclear,
    pAsatNuclearEffect,
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

function degradationSlider(label, param, multiplier, minPct = 0.1) {
  const m = Math.max(0, Math.min(1, Number(multiplier)));
  const degradationPct = (1 - m) * 100;
  return `
    <div class="wizard-slider-row">
      <div class="wizard-slider-header">
        <span class="wizard-slider-label">${label}</span>
        <span class="wizard-slider-value">${degradationPct.toFixed(1)}%</span>
      </div>
      <input type="range" class="wizard-slider" min="${minPct}" max="99.9" step="0.1" value="${degradationPct.toFixed(1)}" data-degrade-target="${param}" />
      <input type="number" class="wizard-hidden-param" data-param="${param}" value="${m.toFixed(4)}" tabindex="-1" aria-hidden="true" />
    </div>`;
}

/**
 * BLUE step parameters (defender capabilities + engagement doctrine).
 * 2-column layout for paired controls.
 */
export function blueParamsHTML(d) {
  const midcourseDoctrineMode = d.midcourseKineticDoctrineMode ?? d.doctrineMode ?? 'barrage';
  const boostKineticDoctrineMode = d.boostKineticDoctrineMode ?? d.doctrineMode ?? 'barrage';
  const midcourseShotsPerTarget = d.midcourseKineticShotsPerTarget ?? d.shotsPerTarget ?? 2;
  const midcourseMaxShotsPerTarget = d.midcourseKineticMaxShotsPerTarget ?? d.maxShotsPerTarget ?? 4;
  const midcoursePReengage = d.midcourseKineticPReengage ?? d.pReengage ?? 0.85;
  const boostKineticShotsPerTarget = d.boostKineticShotsPerTarget ?? d.shotsPerTarget ?? 2;
  const boostKineticMaxShotsPerTarget = d.boostKineticMaxShotsPerTarget ?? d.maxShotsPerTarget ?? 4;
  const boostKineticPReengage = d.boostKineticPReengage ?? d.pReengage ?? 0.85;
  const pdt  = (d.pDetectTrack * 100).toFixed(1);
  const pcw  = (d.pClassifyWarhead * 100).toFixed(1);
  const pfa  = (d.pFalseAlarmDecoy * 100).toFixed(1);
  const pkw  = (d.pkWarhead * 100).toFixed(1);
  const pkd  = (d.pkDecoy * 100).toFixed(1);
  const preMid  = (midcoursePReengage * 100).toFixed(1);
  const preBoostKinetic = (boostKineticPReengage * 100).toFixed(1);
  const pkbK = ((d.pkSpaceBoostKinetic ?? 0.5) * 100).toFixed(1);
  const pkbD = ((d.pkSpaceBoostDirected ?? 0.4) * 100).toFixed(1);
  const boostDirectedTargetsPerPlatform = d.boostDirectedTargetsPerPlatform ?? 2;
  const pSystemUpPct = ((d.pSystemUp ?? 0.9) * 100).toFixed(1);
  const detectDegradeFactor = d.detectDegradeFactor ?? 0.5;
  const pkDegradeFactor = d.pkDegradeFactor ?? 0.7;
  const doctrineToggleHTML = (label, param, mode) => `
      <div class="wizard-slider-row">
        <div class="wizard-slider-header">
          <span class="wizard-slider-label">${label}</span>
        </div>
        <div class="wizard-toggle-group" role="radiogroup" aria-label="${label}">
          <button
            type="button"
            class="wizard-toggle-item ${mode === 'barrage' ? 'selected' : ''}"
            data-doctrine-param="${param}"
            data-doctrine-mode="barrage"
            aria-pressed="${mode === 'barrage' ? 'true' : 'false'}"
          >
            Barrage
          </button>
          <button
            type="button"
            class="wizard-toggle-item ${mode === 'sls' ? 'selected' : ''}"
            data-doctrine-param="${param}"
            data-doctrine-mode="sls"
            aria-pressed="${mode === 'sls' ? 'true' : 'false'}"
          >
            Shoot-Look-Shoot
          </button>
        </div>
        <input type="hidden" class="wizard-hidden-param" data-param="${param}" value="${mode}" />
      </div>
  `;
  return `
    <div class="wizard-param-group">
      <div class="wizard-param-pair">
        ${probSlider('Baseline missile and object detection/tracking probability', 'pDetectTrack', pdt)}
        ${probSlider('Warhead classification accuracy', 'pClassifyWarhead', pcw)}
      </div>
      <div class="wizard-param-pair">
        ${probSlider('Decoy misclassification rate', 'pFalseAlarmDecoy', pfa)}
        ${intSlider('Ground-based interceptors in engagement range', 'nInventory', 0, 2000, 1, d.nInventory)}
      </div>
      <div class="wizard-param-pair">
        ${probSlider('Ground-based interceptor per shot kill probability for warheads', 'pkWarhead', pkw)}
        ${probSlider('Ground-based interceptor per shot kill probability for decoys', 'pkDecoy', pkd)}
      </div>
      <div class="wizard-param-pair">
        ${intSlider('Hypothetical space-based kinetic boost interceptors in orbit', 'nSpaceBoostKinetic', 0, 4000, 1, d.nSpaceBoostKinetic ?? 0)}
        ${probSlider('Hypothetical space-based kinetic boost interceptor kill probability', 'pkSpaceBoostKinetic', pkbK)}
      </div>
      <div class="wizard-param-pair">
        ${intSlider('Hypothetical space-based directed-energy boost interceptors in orbit', 'nSpaceBoostDirected', 0, 4000, 1, d.nSpaceBoostDirected ?? 0)}
        ${probSlider('Hypothetical space-based directed-energy boost interceptor kill probability', 'pkSpaceBoostDirected', pkbD)}
      </div>
      ${intSlider('Directed-energy boost engagement opportunities per platform', 'boostDirectedTargetsPerPlatform', 1, 9, 1, boostDirectedTargetsPerPlatform)}
      <h5>Blue system resilience assumptions</h5>
      ${probSlider('Blue system operational availability', 'pSystemUp', pSystemUpPct)}
      <div class="wizard-param-pair">
        ${degradationSlider('Detection/tracking degradation when the Blue system fails', 'detectDegradeFactor', detectDegradeFactor)}
        ${degradationSlider('Interceptor kill-probability degradation when the Blue system fails', 'pkDegradeFactor', pkDegradeFactor)}
      </div>

      ${doctrineToggleHTML(
        'Ground-based kinetic midcourse engagement doctrine',
        'midcourseKineticDoctrineMode',
        midcourseDoctrineMode
      )}
      <div class="doctrine-midcourse-kinetic-barrage-only">
        ${intSlider('Ground-based kinetic midcourse shots per detected/tracked target', 'midcourseKineticShotsPerTarget', 1, 6, 1, midcourseShotsPerTarget)}
      </div>
      <div class="doctrine-midcourse-kinetic-sls-only" style="display:none">
        <div class="wizard-param-pair">
          ${intSlider('Ground-based kinetic midcourse max shots per detected/tracked target', 'midcourseKineticMaxShotsPerTarget', 1, 6, 1, midcourseMaxShotsPerTarget)}
          ${probSlider('Ground-based kinetic midcourse re-engagement probability per detected/tracked target', 'midcourseKineticPReengage', preMid)}
        </div>
      </div>

      ${doctrineToggleHTML(
        'Hypothetical space-based kinetic boost engagement doctrine',
        'boostKineticDoctrineMode',
        boostKineticDoctrineMode
      )}
      <div class="doctrine-boost-kinetic-barrage-only">
        ${intSlider('Hypothetical space-based kinetic boost shots per detected/tracked boost-phase missile', 'boostKineticShotsPerTarget', 1, 6, 1, boostKineticShotsPerTarget)}
      </div>
      <div class="doctrine-boost-kinetic-sls-only" style="display:none">
        <div class="wizard-param-pair">
          ${intSlider('Hypothetical space-based kinetic boost max shots per detected/tracked boost-phase missile', 'boostKineticMaxShotsPerTarget', 1, 6, 1, boostKineticMaxShotsPerTarget)}
          ${probSlider('Hypothetical space-based kinetic boost re-engagement probability per detected/tracked boost-phase missile', 'boostKineticPReengage', preBoostKinetic)}
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
  const kilotonsPerWarhead = d.kilotonsPerWarhead ?? 400;
  const asatCyber = ((d.pAsatCyberEffect ?? 0.18) * 100).toFixed(1);
  const asatHitToKillPk = ((d.pAsatHitToKill ?? 0.40) * 100).toFixed(1);
  const asatNuclearPk = ((d.pAsatNuclearEffect ?? 0.55) * 100).toFixed(1);
  const boostEvade = ((d.boostEvasionPenalty ?? 0) * 100).toFixed(1);
  const launchRegion = d.launchRegion ?? 'default';
  return `
    <div class="wizard-param-group">
      <div class="wizard-param-pair">
        ${intSlider('Ballistic missiles in strike', 'nMissiles', 1, 500, 1, d.nMissiles)}
        ${intSlider('Warheads per missile', 'mirvsPerMissile', 1, 16, 1, d.mirvsPerMissile)}
      </div>
      <div class="wizard-param-pair">
        ${intSlider('Decoys per missile', 'decoysPerMissile', 0, 40, 1, decoysPerMissile)}
        ${intSlider('Kilotons per warhead', 'kilotonsPerWarhead', 20, 5000, 10, kilotonsPerWarhead)}
      </div>
      <div class="wizard-slider-row">
        <div class="wizard-slider-header">
          <span class="wizard-slider-label">Launch region preset</span>
        </div>
        <select class="wizard-select" data-param="launchRegion">
          ${launchRegionOptionsHTML(launchRegion)}
        </select>
      </div>
      <h5>Hypothetical counterspace attacks</h5>
      ${probSlider('Cyber / EW disruption effectiveness against the space layer', 'pAsatCyberEffect', asatCyber)}
      <div class="wizard-param-pair">
        ${intSlider('Direct-ascent hit-to-kill ASAT attempts', 'nAsatHitToKill', 0, 1000, 1, d.nAsatHitToKill ?? 24)}
        ${probSlider('Direct-ascent hit-to-kill ASAT effectiveness', 'pAsatHitToKill', asatHitToKillPk)}
      </div>
      <div class="wizard-param-pair">
        ${intSlider('Nuclear direct-ascent ASAT attacks', 'nAsatNuclear', 0, 1000, 1, d.nAsatNuclear ?? 0)}
        ${probSlider('Nuclear direct-ascent ASAT effectiveness', 'pAsatNuclearEffect', asatNuclearPk)}
      </div>
      ${probSlider('Boost-phase survivability and evasion', 'boostEvasionPenalty', boostEvade, undefined, 0)}
    </div>
  `;
}

/**
 * SIM step parameters (minimal: trials + seed only).
 * Reliability assumptions are configured on the BLUE step.
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
            Hypothetical space-based kinetic boost interceptors in orbit:
            <input type="number" class="param-input" data-param="nSpaceBoostKinetic" min="0" step="1" value="${d.nSpaceBoostKinetic ?? 0}" />
          </label>
          <label>
            Hypothetical space-based kinetic boost interceptor kill probability:
            <input type="number" class="param-input" data-param="pkSpaceBoostKinetic" min="0" max="1" step="0.01" value="${d.pkSpaceBoostKinetic ?? 0.5}" />
          </label>
          <label>
            Hypothetical space-based directed-energy boost interceptors in orbit:
            <input type="number" class="param-input" data-param="nSpaceBoostDirected" min="0" step="1" value="${d.nSpaceBoostDirected ?? 0}" />
          </label>
          <label>
            Hypothetical space-based directed-energy boost interceptor kill probability:
            <input type="number" class="param-input" data-param="pkSpaceBoostDirected" min="0" max="1" step="0.01" value="${d.pkSpaceBoostDirected ?? 0.4}" />
          </label>
          <label>
            Directed-energy boost engagement opportunities per platform:
            <input type="number" class="param-input" data-param="boostDirectedTargetsPerPlatform" min="1" max="9" step="1" value="${d.boostDirectedTargetsPerPlatform ?? 2}" />
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
            Kilotons per Warhead:
            <input type="number" class="param-input" data-param="kilotonsPerWarhead" min="20" max="5000" step="10" value="${d.kilotonsPerWarhead ?? 400}" />
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
            Cyber / EW disruption effectiveness against the space layer:
            <input type="number" class="param-input" data-param="pAsatCyberEffect" min="0.001" max="0.999" step="0.001" value="${d.pAsatCyberEffect ?? 0.18}" />
          </label>
          <label>
            Direct-ascent hit-to-kill ASAT attempts:
            <input type="number" class="param-input" data-param="nAsatHitToKill" min="0" max="1000" step="1" value="${d.nAsatHitToKill ?? 24}" />
          </label>
          <label>
            Direct-ascent hit-to-kill ASAT effectiveness:
            <input type="number" class="param-input" data-param="pAsatHitToKill" min="0.001" max="0.999" step="0.001" value="${d.pAsatHitToKill ?? 0.40}" />
          </label>
          <label>
            Nuclear direct-ascent ASAT attacks:
            <input type="number" class="param-input" data-param="nAsatNuclear" min="0" max="1000" step="1" value="${d.nAsatNuclear ?? 0}" />
          </label>
          <label>
            Nuclear direct-ascent ASAT effectiveness:
            <input type="number" class="param-input" data-param="pAsatNuclearEffect" min="0.001" max="0.999" step="0.001" value="${d.pAsatNuclearEffect ?? 0.55}" />
          </label>
          <label>
            Boost-phase survivability and evasion:
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
            Ground-based kinetic midcourse doctrine mode:
            <select class="param-input" data-param="midcourseKineticDoctrineMode">
              <option value="barrage" ${(d.midcourseKineticDoctrineMode ?? d.doctrineMode) === 'barrage' ? 'selected' : ''}>Barrage</option>
              <option value="sls" ${(d.midcourseKineticDoctrineMode ?? d.doctrineMode) === 'sls' ? 'selected' : ''}>Shoot-Look-Shoot</option>
            </select>
          </label>
          <label>
            Ground-based kinetic midcourse shots/track (Barrage):
            <input type="number" class="param-input" data-param="midcourseKineticShotsPerTarget" min="0" step="1" value="${d.midcourseKineticShotsPerTarget ?? d.shotsPerTarget}" />
          </label>
          <label>
            Ground-based kinetic midcourse max shots/track (SLS):
            <input type="number" class="param-input" data-param="midcourseKineticMaxShotsPerTarget" min="0" step="1" value="${d.midcourseKineticMaxShotsPerTarget ?? d.maxShotsPerTarget}" />
          </label>
          <label>
            Ground-based kinetic midcourse P(re-engage):
            <input type="number" class="param-input" data-param="midcourseKineticPReengage" min="0" max="1" step="0.01" value="${d.midcourseKineticPReengage ?? d.pReengage}" />
          </label>
          <label>
            Hypothetical space-based kinetic boost doctrine mode:
            <select class="param-input" data-param="boostKineticDoctrineMode">
              <option value="barrage" ${(d.boostKineticDoctrineMode ?? d.doctrineMode) === 'barrage' ? 'selected' : ''}>Barrage</option>
              <option value="sls" ${(d.boostKineticDoctrineMode ?? d.doctrineMode) === 'sls' ? 'selected' : ''}>Shoot-Look-Shoot</option>
            </select>
          </label>
          <label>
            Hypothetical space-based kinetic boost shots/track (Barrage):
            <input type="number" class="param-input" data-param="boostKineticShotsPerTarget" min="0" step="1" value="${d.boostKineticShotsPerTarget ?? d.shotsPerTarget}" />
          </label>
          <label>
            Hypothetical space-based kinetic boost max shots/track (SLS):
            <input type="number" class="param-input" data-param="boostKineticMaxShotsPerTarget" min="0" step="1" value="${d.boostKineticMaxShotsPerTarget ?? d.maxShotsPerTarget}" />
          </label>
          <label>
            Hypothetical space-based kinetic boost P(re-engage):
            <input type="number" class="param-input" data-param="boostKineticPReengage" min="0" max="1" step="0.01" value="${d.boostKineticPReengage ?? d.pReengage}" />
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
