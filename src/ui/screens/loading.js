/**
 * S2 — Loading interstitial. Shows progress text, then transitions.
 */

const MESSAGES = [
  'CONFIGURING SCENARIO...',
  'BUILDING ARCHITECTURE MODEL...',
  'INITIALIZING MONTE CARLO...',
  'READY',
];

export function renderLoading(container, onComplete) {
  const el = document.createElement('div');
  el.className = 'screen-loading';
  el.innerHTML = `
    <div class="dot-grid"></div>
    <div class="loading-lines">
      ${MESSAGES.map((m, i) => `<div class="line" data-idx="${i}">${m}</div>`).join('')}
    </div>
    <div class="loading-bar"><div class="loading-bar-fill"></div></div>
  `;
  container.appendChild(el);

  // Force reflow then activate
  requestAnimationFrame(() => {
    el.classList.add('active');
  });

  const lines = el.querySelectorAll('.line');
  const barFill = el.querySelector('.loading-bar-fill');
  const totalDuration = 1200;
  const stepDuration = totalDuration / MESSAGES.length;

  MESSAGES.forEach((_, i) => {
    setTimeout(() => {
      lines[i].classList.add('visible');
      if (i < MESSAGES.length - 1) {
        lines[i].classList.add('done');
      }
      barFill.style.width = `${((i + 1) / MESSAGES.length) * 100}%`;
    }, stepDuration * i);
  });

  setTimeout(() => {
    el.classList.remove('active');
    setTimeout(() => {
      el.remove();
      if (onComplete) onComplete();
    }, 300);
  }, totalDuration + 200);
}
