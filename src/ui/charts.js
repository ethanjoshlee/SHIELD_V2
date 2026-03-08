/**
 * Chart rendering — lightweight HTML histograms.
 */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function niceStep(rawStep) {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
  const exponent = Math.floor(Math.log10(rawStep));
  const base = Math.pow(10, exponent);
  const fraction = rawStep / base;
  let niceFraction;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * base;
}

function nextNiceIntegerStep(step) {
  if (step <= 1) return 2;
  if (step <= 2) return 5;
  return step * 2;
}

function buildContinuousBins(arr, opts) {
  let minV = Math.min(...arr);
  let maxV = Math.max(...arr);
  if (minV === maxV) {
    minV -= 0.5;
    maxV += 0.5;
  }
  const minBins = opts.minBins ?? 28;
  const maxBins = opts.maxBins ?? 56;
  const targetBins = opts.targetBins ?? Math.round(Math.sqrt(arr.length));
  const binCount = clamp(targetBins, minBins, maxBins);
  const span = maxV - minV;
  const binWidth = span / binCount;
  const counts = new Array(binCount).fill(0);

  for (const v of arr) {
    let idx = Math.floor(((v - minV) / span) * binCount);
    if (idx < 0) idx = 0;
    if (idx >= binCount) idx = binCount - 1;
    counts[idx] += 1;
  }

  return {
    counts,
    binCount,
    minEdge: minV,
    maxEdge: maxV,
    binWidth,
    xTickMin: minV,
    xTickMax: maxV,
    xIsInteger: false,
  };
}

function buildIntegerAlignedBins(arr, opts) {
  const minInt = Math.floor(Math.min(...arr));
  const maxInt = Math.ceil(Math.max(...arr));
  const minBins = opts.minBins ?? 12;
  const maxBins = opts.maxBins ?? 48;
  const valueSpan = Math.max(1, maxInt - minInt + 1);

  let binWidth = 1;
  while (Math.ceil(valueSpan / binWidth) > maxBins) {
    binWidth = nextNiceIntegerStep(binWidth);
  }
  while (Math.ceil(valueSpan / binWidth) < minBins && binWidth > 1) {
    binWidth = Math.max(1, Math.floor(binWidth / 2));
  }

  const binCount = Math.max(1, Math.ceil(valueSpan / binWidth));
  const minEdge = minInt - 0.5;
  const maxEdge = minEdge + binCount * binWidth;
  const counts = new Array(binCount).fill(0);

  for (const raw of arr) {
    const v = Number(raw);
    if (!Number.isFinite(v)) continue;
    let idx = Math.floor((v - minEdge) / binWidth);
    if (idx < 0) idx = 0;
    if (idx >= binCount) idx = binCount - 1;
    counts[idx] += 1;
  }

  return {
    counts,
    binCount,
    minEdge,
    maxEdge,
    binWidth,
    xTickMin: minInt,
    xTickMax: maxInt,
    xIsInteger: true,
  };
}

function buildTicks(min, max, targetCount, forceInteger = false) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];
  if (min === max) return [min];

  const span = max - min;
  let step = niceStep(span / Math.max(2, targetCount - 1));
  if (forceInteger) {
    step = Math.max(1, Math.round(step));
  }

  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 0.5; v += step) {
    const rounded = forceInteger ? Math.round(v) : Number(v.toFixed(10));
    if (rounded >= min - step * 0.01 && rounded <= max + step * 0.01) {
      ticks.push(rounded);
    }
  }
  if (!ticks.length) ticks.push(forceInteger ? Math.round(min) : min);
  if (ticks[0] > min && forceInteger) ticks.unshift(Math.round(min));
  if (ticks[ticks.length - 1] < max && forceInteger) ticks.push(Math.round(max));
  return Array.from(new Set(ticks));
}

function formatTick(value, forceInteger = false) {
  if (forceInteger) return Math.round(value).toLocaleString('en-US');
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString('en-US');
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(1);
}

function formatBinEdge(value, forceInteger = false) {
  if (forceInteger) return Math.round(value).toLocaleString('en-US');
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString('en-US');
  if (Math.abs(value) >= 100) return value.toFixed(1);
  return value.toFixed(2);
}

/**
 * Make a lightweight histogram (HTML bars) for an array of numbers.
 * @param {number[]} arr
 * @param {number} bins
 * @param {string} title
 * @param {Object} opts
 */
export function renderHistogramHTML(arr, bins, title, opts = {}) {
  const height =
    opts && opts.height !== undefined && opts.height !== null
      ? opts.height
      : 140;
  const showTitle = opts?.showTitle !== false;
  const xLabel = opts?.xLabel ?? title;
  const yLabel = opts?.yLabel ?? 'Number of Trials';
  const binStrategy = opts?.binStrategy ?? 'continuous';

  if (!arr || arr.length === 0) {
    return `<div class="chart">${showTitle ? `<div class="chart-title">${title}</div>` : ''}<div class="chart-empty">No data</div></div>`;
  }

  const histogram =
    binStrategy === 'integer'
      ? buildIntegerAlignedBins(arr, { minBins: 12, maxBins: 42 })
      : buildContinuousBins(arr, {
          minBins: 30,
          maxBins: 52,
          targetBins: bins,
        });
  const { counts, minEdge, maxEdge, binWidth, xTickMin, xTickMax, xIsInteger } = histogram;

  const maxC = Math.max(...counts);
  const yHeadroom = opts?.yHeadroom ?? 0.12;
  const yTargetTicks = opts?.yTargetTicks ?? 5;
  const paddedYMax = Math.max(1, maxC * (1 + yHeadroom));
  const yStep = Math.max(1, niceStep(paddedYMax / Math.max(2, yTargetTicks - 1)));
  const yMax = Math.ceil(paddedYMax / yStep) * yStep;
  const yTicks = buildTicks(0, yMax, yTargetTicks, true);

  // Target ~5 major ticks with "nice" spacing; this may yield 4–7 ticks
  // depending on data range for cleaner labels.
  const xTicks = buildTicks(xTickMin, xTickMax, opts?.xTargetTicks ?? 6, xIsInteger);

  const barsHtml = counts
    .map((c, i) => {
      const barH = yMax > 0 ? Math.max(0, (c / yMax) * 100) : 0;
      const labelLo = minEdge + i * binWidth;
      const labelHi = labelLo + binWidth;
      const loText = formatBinEdge(labelLo, xIsInteger);
      const hiText = formatBinEdge(labelHi, xIsInteger);
      const isFinalBin = i === counts.length - 1;
      const intervalText = isFinalBin
        ? `[${loText}, ${hiText}]`
        : `[${loText}, ${hiText})`;
      const tooltip = `${title}\nBin: ${intervalText}\nCount: ${c.toLocaleString('en-US')}`;
      return `<div class="chart-bar" title="${tooltip}" style="height:${barH}%"></div>`;
    })
    .join("");
  const yTicksHtml = yTicks
    .map((tick) => {
      const pct = yMax > 0 ? (tick / yMax) * 100 : 0;
      return `
        <div class="chart-y-tick" style="bottom:${pct}%">
          <span class="chart-y-tick-label">${formatTick(tick, true)}</span>
        </div>`;
    })
    .join("");
  const gridLinesHtml = yTicks
    .map((tick) => {
      const pct = yMax > 0 ? (tick / yMax) * 100 : 0;
      return `<div class="chart-grid-line" style="bottom:${pct}%"></div>`;
    })
    .join("");
  const xSpan = maxEdge - minEdge;
  const xTicksHtml = xTicks
    .map((tick) => {
      const pct = xSpan > 0 ? ((tick - minEdge) / xSpan) * 100 : 0;
      const edgeClass =
        pct <= 2
          ? ' chart-x-tick--start'
          : pct >= 98
            ? ' chart-x-tick--end'
            : '';
      return `
        <div class="chart-x-tick${edgeClass}" style="left:${pct}%">
          <span class="chart-x-tick-mark"></span>
          <span class="chart-x-tick-label">${formatTick(tick, xIsInteger)}</span>
        </div>`;
    })
    .join("");

  return `
    <div class="chart">
      ${showTitle ? `<div class="chart-title">${title}</div>` : ''}
      <div class="chart-canvas" style="height:${height}px">
        <div class="chart-y-axis-label">${yLabel}</div>
        <div class="chart-plot-area">
          <div class="chart-grid-lines">
            ${gridLinesHtml}
          </div>
          <div class="chart-bars">
            ${barsHtml}
          </div>
          <div class="chart-y-ticks">
            ${yTicksHtml}
          </div>
        </div>
        <div class="chart-x-ticks">
          ${xTicksHtml}
        </div>
        <div class="chart-x-axis-label">${xLabel}</div>
      </div>
    </div>
  `;
}
