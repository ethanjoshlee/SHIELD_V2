/**
 * UI controls — HTML template, parameter reading, and doctrine toggle.
 */

import { clamp01 } from '../utils/rng.js';
import { DEFAULTS } from '../state.js';

/**
 * Generate the main app HTML template.
 */
export function renderAppHTML() {
  const d = DEFAULTS;
  return `
  <div class="container">
    <h1>SHIELD Demo (Steps 2\u20135)</h1>
    <p class="subtitle">
      Missiles \u2192 MIRVs \u2192 decoys-as-objects; detection+tracking; classification; engage-only-warhead-tracks;
      doctrine (Barrage vs Shoot-Look-Shoot); common-mode reliability.
      <br/>
      <b>Key output:</b> penetrated <b>real warheads</b>.
    </p>

    <div class="grid">
      <label>
        Incoming missiles (N missiles)
        <input id="nMissiles" type="number" min="0" step="1" value="${d.nMissiles}" />
      </label>

      <label>
        MIRVs per missile
        <input id="mirvsPerMissile" type="number" min="1" step="1" value="${d.mirvsPerMissile}" />
      </label>

      <label>
        Decoys per real warhead
        <input id="decoysPerWarhead" type="number" min="0" step="1" value="${d.decoysPerWarhead}" />
      </label>

      <label>
        Detection + tracking probability (0\u20131)
        <input id="pDetectTrack" type="number" min="0" max="1" step="0.01" value="${d.pDetectTrack}" />
      </label>

      <label>
        Classifier: P(classify warhead | warhead) (0\u20131)
        <input id="pClassifyWarhead" type="number" min="0" max="1" step="0.01" value="${d.pClassifyWarhead}" />
      </label>

      <label>
        Classifier: P(classify warhead | decoy) (0\u20131)
        <input id="pFalseAlarmDecoy" type="number" min="0" max="1" step="0.01" value="${d.pFalseAlarmDecoy}" />
      </label>

      <label>
        Doctrine mode
        <select id="doctrineMode">
          <option value="barrage"${d.doctrineMode === "barrage" ? " selected" : ""}>Barrage (allocate shots immediately)</option>
          <option value="sls"${d.doctrineMode === "sls" ? " selected" : ""}>Shoot-Look-Shoot (SLS)</option>
        </select>
      </label>

      <label>
        Barrage: shots per engaged track
        <input id="shotsPerTarget" type="number" min="0" step="1" value="${d.shotsPerTarget}" />
      </label>

      <label>
        SLS: max shots per engaged track
        <input id="maxShotsPerTarget" type="number" min="0" step="1" value="${d.maxShotsPerTarget}" />
      </label>

      <label>
        SLS: P(re-engage after miss) (0\u20131)
        <input id="pReengage" type="number" min="0" max="1" step="0.01" value="${d.pReengage}" />
      </label>

      <label>
        Pk per shot vs TRUE warhead (0\u20131)
        <input id="pkWarhead" type="number" min="0" max="1" step="0.01" value="${d.pkWarhead}" />
      </label>

      <label>
        Pk per shot vs TRUE decoy (0\u20131)
        <input id="pkDecoy" type="number" min="0" max="1" step="0.01" value="${d.pkDecoy}" />
      </label>

      <label>
        Interceptor inventory (N)
        <input id="nInventory" type="number" min="0" step="1" value="${d.nInventory}" />
      </label>

      <label>
        Monte Carlo trials
        <input id="nTrials" type="number" min="1" step="100" value="${d.nTrials}" />
      </label>

      <label>
        Seed (blank = random)
        <input id="seed" type="number" step="1" value="" placeholder="auto" />
      </label>

      <label>
        System reliability: P(system up) (0\u20131)
        <input id="pSystemUp" type="number" min="0" max="1" step="0.01" value="${d.pSystemUp}" />
      </label>

      <label>
        If system down: detection degrade factor (0\u20131)
        <input id="detectDegradeFactor" type="number" min="0" max="1" step="0.01" value="${d.detectDegradeFactor}" />
      </label>

      <label>
        If system down: Pk degrade factor (0\u20131)
        <input id="pkDegradeFactor" type="number" min="0" max="1" step="0.01" value="${d.pkDegradeFactor}" />
      </label>
    </div>

    <div class="note">
      <b>Classifier note:</b> "P(classify warhead | warhead)" is the true-positive rate.
      "P(classify warhead | decoy)" is the false-alarm rate (decoys mis-labeled as threats).
      The defense <b>only shoots</b> at tracks classified as warheads.
    </div>

    <button id="runBtn">Run simulation</button>

    <pre id="output" class="output"></pre>

    <div class="charts">
      <h3>Charts</h3>
      <div id="chartsArea" class="charts-area"></div>
    </div>
  </div>
`;
}

/**
 * Toggle visibility of SLS vs Barrage fields based on doctrine selection.
 */
export function setSLSVisibility() {
  const mode = document.getElementById("doctrineMode").value;
  const slsIds = ["maxShotsPerTarget", "pReengage"];
  const barrageIds = ["shotsPerTarget"];

  for (const id of slsIds) {
    const el = document.getElementById(id);
    el.disabled = mode !== "sls";
    el.parentElement.style.opacity = mode === "sls" ? "1" : "0.5";
  }
  for (const id of barrageIds) {
    const el = document.getElementById(id);
    el.disabled = mode !== "barrage";
    el.parentElement.style.opacity = mode === "barrage" ? "1" : "0.5";
  }
}

/**
 * Read all parameter values from the UI form inputs.
 * Works with both old flat UI (getElementById) and new dashboard UI (data-param attributes).
 * @param {string} blueKey - Optional country key for defender
 * @param {string} redKey - Optional country key for attacker
 */
export function readParamsFromUI(blueKey, redKey) {
  const getValue = (id, param, defaultVal) => {
    let el = document.getElementById(id);
    if (!el) el = document.querySelector(`[data-param="${param}"]`);
    return el?.value || defaultVal;
  };

  const nMissiles = Math.max(0, parseInt(getValue("nMissiles", "nMissiles", 0), 10) || 0);
  const mirvsPerMissile = Math.max(1, parseInt(getValue("mirvsPerMissile", "mirvsPerMissile", 1), 10) || 1);
  const decoysPerWarhead = Math.max(0, parseInt(getValue("decoysPerWarhead", "decoysPerWarhead", 0), 10) || 0);

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
    nTrials,
    pSystemUp,
    detectDegradeFactor,
    pkDegradeFactor,
    seed,
    blueKey,
    redKey,
  };
}

/**
 * BLUE step parameters (Blue force / Defender capabilities).
 * Returns HTML for: pDetectTrack, pClassifyWarhead, pFalseAlarmDecoy, pkWarhead, pkDecoy, nInventory
 */
export function blueParamsHTML(d) {
  return `
    <div class="wizard-param-group">
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
        Pk per shot (warhead):
        <input type="number" class="param-input" data-param="pkWarhead" min="0" max="1" step="0.01" value="${d.pkWarhead}" />
      </label>
      <label>
        Pk per shot (decoy):
        <input type="number" class="param-input" data-param="pkDecoy" min="0" max="1" step="0.01" value="${d.pkDecoy}" />
      </label>
      <label>
        Interceptor Inventory:
        <input type="number" class="param-input" data-param="nInventory" min="0" step="1" value="${d.nInventory}" />
      </label>
    </div>
  `;
}

/**
 * RED step parameters (Red force / Attacker payload).
 * Returns HTML for: nMissiles, mirvsPerMissile, decoysPerWarhead
 */
export function redParamsHTML(d) {
  return `
    <div class="wizard-param-group">
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
    </div>
  `;
}

/**
 * SIM step parameters (Simulation rules + Common Mode reliability).
 * Returns two separate groups: SIM controls and CM controls, as one HTML string.
 */
export function simParamsHTML(d) {
  return `
    <div class="wizard-param-group">
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
    <div class="wizard-param-group">
      <h5>System Reliability</h5>
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
  `;
}

/**
 * Render the dashboard drawer controls panel (tabs for Blue, Red, CM, Sim).
 */
export function renderDrawerControls(container, blueKey, redKey) {
  const d = readParamsFromUI();

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
            Pk per shot (warhead):
            <input type="number" class="param-input" data-param="pkWarhead" min="0" max="1" step="0.01" value="${d.pkWarhead}" />
          </label>
          <label>
            Pk per shot (decoy):
            <input type="number" class="param-input" data-param="pkDecoy" min="0" max="1" step="0.01" value="${d.pkDecoy}" />
          </label>
          <label>
            Interceptor Inventory:
            <input type="number" class="param-input" data-param="nInventory" min="0" step="1" value="${d.nInventory}" />
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
