/**
 * WIZARD screen — three-step pre-run configuration with persistent globe.
 * Step 0: BLUE (defender selection + blue params)
 * Step 1: RED (attacker selection + red params)
 * Step 2: SIM (sim + CM params)
 * All parameter inputs rendered once and kept in DOM; nav shows/hides step sections.
 * All state is local to renderWizard — safe for multiple invocations per session.
 */

import { STATES } from '../stateMachine.js';
import { COUNTRIES } from '../../config/countries.js';
import { DEFAULTS } from '../../state.js';
import { LAUNCH_REGION_PRESETS } from '../../config/launchRegions.js';
import { initGlobe, startAnimation, setupInteraction, getGlobeGroup, getScene, rotateToCountry } from '../globe/globeCore.js';
import { createCountriesLayer, setHighlightedCountries, getCountryCenter } from '../globe/countriesLayer.js';
import { createHudOverlay } from '../globe/hudOverlay.js';
import { blueParamsHTML, redParamsHTML, simParamsHTML, readParamsFromUI } from '../controls.js';

const STEPS = [
  { key: 'blue', title: 'SELECT BLUE', subtitle: 'Defending country and capabilities', number: '01 / 03' },
  { key: 'red',  title: 'SELECT RED', subtitle: 'Attack profile', number: '02 / 03' },
  { key: 'sim',  title: 'SIMULATION', subtitle: 'Rules and reliability', number: '03 / 03' },
];

export function renderWizard(container, transitionFn) {
  // All wizard state is local — fresh on every invocation
  let el = null;
  let currentStep = 0;
  let selectedBlue = null;
  let selectedRed = null;

  function getCountriesList(side) {
    const countries = COUNTRIES[side];
    const selected = side === 'blue' ? selectedBlue : selectedRed;
    const items = Object.entries(countries).map(([key, cdata]) => {
      const isSelected = key === selected;
      const selectedClass = isSelected ? `selected ${side}` : '';
      return `<div class="wizard-country-item ${selectedClass}" data-side="${side}" data-key="${key}">${cdata.label}</div>`;
    });
    return items.join('');
  }

  function updateDoctrineGating() {
    const mode = el.querySelector('[data-param="doctrineMode"]')?.value ?? 'barrage';
    el.querySelectorAll('.doctrine-barrage-only').forEach(r => { r.style.display = mode === 'barrage' ? '' : 'none'; });
    el.querySelectorAll('.doctrine-sls-only').forEach(r => { r.style.display = mode === 'sls' ? '' : 'none'; });
  }

  function updateStepDisplay() {
    const step = STEPS[currentStep];

    el.querySelector('.step-badge').textContent = step.number;
    el.querySelector('.wizard-title').textContent = step.title;
    el.querySelector('.wizard-subtitle').textContent = step.subtitle;

    const countrySection = el.querySelector('.wizard-country-section');
    countrySection.style.display = currentStep < 2 ? 'flex' : 'none';

    const paramSections = el.querySelectorAll('.step-params');
    paramSections.forEach((section, i) => {
      section.classList.toggle('active', i === currentStep);
    });

    // Country-gating: params hidden until the step's country is selected
    const paramsContainer = el.querySelector('.wizard-params-container');
    const stepHasCountry = currentStep === 0 ? !!selectedBlue
                         : currentStep === 1 ? !!selectedRed
                         : true;
    paramsContainer.classList.toggle('unlocked', stepHasCountry);

    const btnBack = el.querySelector('.btn-back');
    const btnNext = el.querySelector('.btn-next');
    const btnRun  = el.querySelector('.btn-run');

    btnBack.style.display = currentStep > 0 ? 'block' : 'none';
    btnNext.style.display = currentStep < 2 ? 'block' : 'none';
    btnRun.style.display  = currentStep === 2 ? 'block' : 'none';

    if (currentStep === 0) {
      btnNext.disabled = !selectedBlue;
    } else if (currentStep === 1) {
      btnNext.disabled = !selectedRed;
    } else {
      btnNext.disabled = false;
    }

    const highlights = [];
    if (selectedBlue) highlights.push(selectedBlue);
    if (selectedRed)  highlights.push(selectedRed);
    setHighlightedCountries(highlights);
  }

  function handleCountryClick(e) {
    const item = e.target.closest('.wizard-country-item');
    if (!item) return;

    const side = item.dataset.side;
    const key  = item.dataset.key;

    const setParamValue = (param, val) => {
      const probRange = el.querySelector(`[data-prob-target="${param}"]`);
      if (probRange) {
        probRange.value = (parseFloat(val) * 100).toFixed(1);
        probRange.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const input = el.querySelector(`[data-param="${param}"]`);
      if (!input) return;
      input.value = String(val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const list = item.closest('.wizard-country-section');
    list.querySelectorAll(`.wizard-country-item[data-side="${side}"]`).forEach(i => {
      i.classList.remove('selected', side);
    });
    item.classList.add('selected', side);

    if (side === 'blue') {
      selectedBlue = key;
      const blue = COUNTRIES.blue[key];
      if (blue) {
        const mappings = [
          ['pkSpaceBoostKinetic', blue.pkSpaceBoostKinetic ?? blue.interceptors?.boost_kinetic?.pk],
          ['pkSpaceBoostDirected', blue.pkSpaceBoostDirected ?? blue.interceptors?.boost_laser?.pk],
        ];
        for (const [param, val] of mappings) {
          if (val === undefined || val === null) continue;
          setParamValue(param, val);
        }
      }
    } else {
      selectedRed = key;
      const red = COUNTRIES.red[key];
      if (red) {
        const launchRegion = red.launchRegion && LAUNCH_REGION_PRESETS[red.launchRegion] ? red.launchRegion : 'default';
        const mappings = [
          ['launchRegion', launchRegion],
          ['asatSpaceAvailabilityPenalty', red.asatSpaceAvailabilityPenalty ?? red.countermeasures?.asatSpaceAvailabilityPenalty ?? 0],
          ['boostEvasionPenalty', red.boostEvasionPenalty ?? 0],
        ];
        for (const [param, val] of mappings) {
          setParamValue(param, val);
        }
      }
    }

    const center = getCountryCenter(key);
    rotateToCountry(center);
    updateStepDisplay();
  }

  const d = DEFAULTS;

  el = document.createElement('div');
  el.className = 'wizard-shell';
  el.innerHTML = `
    <div class="wizard-left">
      <div class="wizard-step-header">
        <div class="step-badge">${STEPS[0].number}</div>
        <h2 class="wizard-title">${STEPS[0].title}</h2>
        <p class="wizard-subtitle">${STEPS[0].subtitle}</p>
      </div>

      <div class="wizard-country-section">
        ${getCountriesList('blue')}
      </div>

      <div class="wizard-params-container">
        <div class="step-params active" data-step="blue">
          ${blueParamsHTML(d)}
        </div>
        <div class="step-params" data-step="red">
          ${redParamsHTML(d)}
        </div>
        <div class="step-params" data-step="sim">
          ${simParamsHTML(d)}
        </div>
      </div>

      <div class="wizard-nav">
        <button class="btn btn-back" style="display: none;">← BACK</button>
        <button class="btn btn-next">NEXT →</button>
        <button class="btn btn-run" style="display: none;">RUN SIMULATION</button>
      </div>
    </div>

    <div class="wizard-right"></div>
  `;

  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('active'));

  // Wire sliders — sync range → value span (and hidden prob input where applicable)
  el.querySelectorAll('[data-prob-target]').forEach(range => {
    const paramId = range.dataset.probTarget;
    const hidden = el.querySelector(`[data-param="${paramId}"]`);
    const valueEl = range.closest('.wizard-slider-row').querySelector('.wizard-slider-value');
    const sync = () => {
      if (valueEl) valueEl.textContent = parseFloat(range.value).toFixed(1) + '%';
      if (hidden) hidden.value = (parseFloat(range.value) / 100).toFixed(4);
    };
    range.addEventListener('input', sync);
    sync();
  });
  el.querySelectorAll('input[type="range"][data-param]').forEach(range => {
    const valueEl = range.closest('.wizard-slider-row')?.querySelector('.wizard-slider-value');
    if (!valueEl) return;
    const sync = () => { valueEl.textContent = range.value; };
    range.addEventListener('input', sync);
    sync();
  });

  // Doctrine gating — initial + on change
  updateDoctrineGating();
  el.querySelector('[data-param="doctrineMode"]')?.addEventListener('change', updateDoctrineGating);

  // Globe — fresh init per invocation
  const globeContainer = el.querySelector('.wizard-right');
  initGlobe(globeContainer);
  createCountriesLayer(getGlobeGroup());
  createHudOverlay(getScene());
  setupInteraction(globeContainer);
  startAnimation();

  // Country section event delegation
  const countrySection = el.querySelector('.wizard-country-section');
  countrySection.addEventListener('click', handleCountryClick);

  const btnBack = el.querySelector('.btn-back');
  const btnNext = el.querySelector('.btn-next');
  const btnRun  = el.querySelector('.btn-run');

  btnBack.addEventListener('click', () => {
    currentStep = Math.max(0, currentStep - 1);
    if (currentStep === 0) {
      countrySection.innerHTML = getCountriesList('blue');
    }
    updateStepDisplay();
  });

  btnNext.addEventListener('click', () => {
    currentStep = Math.min(STEPS.length - 1, currentStep + 1);
    if (currentStep === 1) {
      countrySection.innerHTML = getCountriesList('red');
    }
    updateStepDisplay();
  });

  btnRun.addEventListener('click', () => {
    const params = readParamsFromUI(selectedBlue, selectedRed, el);
    transitionFn(STATES.LOADING, {
      action: 'run',
      fromWizard: true,
      blueKey: selectedBlue,
      redKey: selectedRed,
      params,
    });
  });

  updateStepDisplay();
}
