/**
 * Chart rendering — lightweight HTML histograms.
 */

/**
 * Make a lightweight histogram (HTML bars) for an array of numbers.
 * @param {number[]} arr
 * @param {number} bins
 * @param {string} title
 * @param {Object} opts
 */
export function renderHistogramHTML(arr, bins, title, opts = {}) {
  const width =
    opts && opts.width !== undefined && opts.width !== null ? opts.width : 320;

  const height =
    opts && opts.height !== undefined && opts.height !== null
      ? opts.height
      : 140;

  if (!arr || arr.length === 0) {
    return `<div class="chart"><div class="chart-title">${title}</div><div class="chart-empty">No data</div></div>`;
  }

  let minV = Math.min(...arr);
  let maxV = Math.max(...arr);
  if (minV === maxV) {
    minV = minV - 0.5;
    maxV = maxV + 0.5;
  }

  const counts = new Array(bins).fill(0);
  const span = maxV - minV;

  for (const v of arr) {
    let idx = Math.floor(((v - minV) / span) * bins);
    if (idx < 0) idx = 0;
    if (idx >= bins) idx = bins - 1;
    counts[idx] += 1;
  }

  const maxC = Math.max(...counts);
  const barW = Math.floor(width / bins);

  const bars = counts
    .map((c, i) => {
      const barH = maxC > 0 ? Math.round((c / maxC) * height) : 0;
      const labelLo = minV + (i / bins) * span;
      const labelHi = minV + ((i + 1) / bins) * span;
      const tooltip = `${title}\nBin: ${labelLo.toFixed(1)}\u2013${labelHi.toFixed(
        1
      )}\nCount: ${c}`;
      return `<div class="bar" title="${tooltip}" style="width:${barW}px;height:${barH}px"></div>`;
    })
    .join("");

  return `
    <div class="chart">
      <div class="chart-title">${title}</div>
      <div class="chart-frame" style="width:${width}px;height:${height}px">
        ${bars}
      </div>
      <div class="chart-axis">
        <span>${minV.toFixed(1)}</span>
        <span>${maxV.toFixed(1)}</span>
      </div>
    </div>
  `;
}
