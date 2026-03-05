/**
 * UI State Machine — manages screen transitions.
 * States: BOOT → SELECT → LOADING → DASHBOARD
 *         DASHBOARD → SELECT (reset)
 */

const STATES = { BOOT: 'boot', SELECT: 'select', LOADING: 'loading', DASHBOARD: 'dashboard' };

let currentState = null;
let stateData = {};
const listeners = [];

export function getState() { return currentState; }
export function getStateData() { return stateData; }

export function onStateChange(fn) { listeners.push(fn); }

export function transition(newState, data = {}) {
  const prev = currentState;
  currentState = newState;
  stateData = { ...stateData, ...data };
  for (const fn of listeners) fn(newState, prev, stateData);
}

export { STATES };
