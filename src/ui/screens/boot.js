/**
 * S0 — Boot screen. Shows title, then auto-transitions to SELECT.
 */

import { STATES, transition } from '../stateMachine.js';

export function renderBoot(container) {
  const el = document.createElement('div');
  el.className = 'screen-boot';
  el.innerHTML = `
    <div class="dot-grid"></div>
    <div class="boot-title">SHIELD</div>
    <div class="boot-line"></div>
    <div class="boot-subtitle">Scenario Engine</div>
  `;
  container.appendChild(el);

  // Auto-transition after 1.5s
  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => {
      el.remove();
      transition(STATES.SELECT);
    }, 600);
  }, 1500);
}
