/**
 * RESULTS screen — read-only final results presentation after simulation.
 * 60/40 layout: left panel shows scenario + metrics, right panel shows globe.
 * Globe persists in same style as wizard, with both countries highlighted.
 * RESET button returns to wizard step 1 (fresh configuration).
 */

import { STATES } from '../stateMachine.js';
import { COUNTRIES } from '../../config/countries.js';
import { initGlobe, startAnimation, setupInteraction, getGlobeGroup, getScene } from '../globe/globeCore.js';
import { createCountriesLayer, setHighlightedCountries } from '../globe/countriesLayer.js';
import { createHudOverlay } from '../globe/hudOverlay.js';
import { renderResultsContent } from '../results.js';

export function renderResultsScreen(container, data, transitionFn) {
  const { blueKey, redKey, runParams, runResult, runElapsed } = data;

  const blueLabel = COUNTRIES.blue[blueKey]?.label ?? blueKey;
  const redLabel  = COUNTRIES.red[redKey]?.label  ?? redKey;

  const el = document.createElement('div');
  el.className = 'results-shell';
  el.innerHTML = `
    <div class="results-left">
      <div class="results-header">
        <div class="results-title">SIMULATION RESULTS</div>
        <div class="results-scenario">
          <span class="results-scenario-blue">DEF: ${blueLabel}</span>
          <span class="results-scenario-red">ATK: ${redLabel}</span>
        </div>
        <div class="results-meta">${runParams.nTrials} trials · ${runElapsed}s</div>
      </div>
      <div class="results-body">
        ${renderResultsContent(runParams, runResult)}
      </div>
      <div class="results-nav">
        <button class="btn btn-reset">← NEW SCENARIO</button>
      </div>
    </div>
    <div class="results-right"></div>
  `;

  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('active'));

  // Globe — same init pattern as wizard (fresh per screen entry)
  const globeContainer = el.querySelector('.results-right');
  initGlobe(globeContainer);
  createCountriesLayer(getGlobeGroup());
  createHudOverlay(getScene());
  setHighlightedCountries([blueKey, redKey]);
  startAnimation();
  setupInteraction(globeContainer);

  el.querySelector('.btn-reset').addEventListener('click', () => {
    transitionFn(STATES.WIZARD);
  });
}
