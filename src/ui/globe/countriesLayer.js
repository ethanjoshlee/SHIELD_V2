/**
 * Countries layer — renders world coastlines and highlighted countries on the globe.
 * Uses Canvas2D texture projected onto a Three.js sphere.
 */

import * as THREE from 'three';
import { COUNTRY_POLYGONS, WORLD_COASTLINES } from './geoData.js';

const TEX_W = 2048;
const TEX_H = 1024;
const GLOBE_RADIUS = 180;

let canvas, ctx, texture, sphereMesh;
let highlightedCountries = new Set();

/**
 * Convert [lng, lat] to canvas pixel coordinates (equirectangular).
 */
function toPixel(lng, lat) {
  const x = ((lng + 180) / 360) * TEX_W;
  const y = ((90 - lat) / 180) * TEX_H;
  return [x, y];
}

/**
 * Draw a polygon on the canvas.
 */
function drawPolygon(points, opts = {}) {
  if (!points || points.length < 3) return;
  ctx.beginPath();
  const [x0, y0] = toPixel(points[0][0], points[0][1]);
  ctx.moveTo(x0, y0);
  for (let i = 1; i < points.length; i++) {
    const [x, y] = toPixel(points[i][0], points[i][1]);
    ctx.lineTo(x, y);
  }
  ctx.closePath();

  if (opts.fill) {
    ctx.fillStyle = opts.fill;
    ctx.fill();
  }
  if (opts.stroke) {
    ctx.strokeStyle = opts.stroke;
    ctx.lineWidth = opts.lineWidth || 1;
    ctx.stroke();
  }
}

/**
 * Render the full texture.
 */
function renderTexture() {
  // Clear to dark
  ctx.fillStyle = '#0d0d14';
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Dot grid
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let x = 0; x < TEX_W; x += 32) {
    for (let y = 0; y < TEX_H; y += 32) {
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Draw world coastlines (faint)
  for (const coastline of WORLD_COASTLINES) {
    drawPolygon(coastline, {
      stroke: 'rgba(255, 255, 255, 0.08)',
      lineWidth: 1,
    });
  }

  // Draw country outlines and fills
  for (const [key, data] of Object.entries(COUNTRY_POLYGONS)) {
    const isHighlighted = highlightedCountries.has(key);

    for (const poly of data.polygons) {
      if (isHighlighted) {
        // Glow fill
        const [r, g, b] = data.color;
        drawPolygon(poly, {
          fill: `rgba(${r * 255}, ${g * 255}, ${b * 255}, 0.25)`,
          stroke: `rgba(${r * 255}, ${g * 255}, ${b * 255}, 0.8)`,
          lineWidth: 2,
        });
      } else {
        drawPolygon(poly, {
          stroke: 'rgba(255, 255, 255, 0.12)',
          lineWidth: 1,
        });
      }
    }
  }

  // Graticule lines (faint)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 0.5;
  // Latitude lines every 30 degrees
  for (let lat = -60; lat <= 60; lat += 30) {
    ctx.beginPath();
    const y = ((90 - lat) / 180) * TEX_H;
    ctx.moveTo(0, y);
    ctx.lineTo(TEX_W, y);
    ctx.stroke();
  }
  // Longitude lines every 30 degrees
  for (let lng = -150; lng <= 180; lng += 30) {
    ctx.beginPath();
    const x = ((lng + 180) / 360) * TEX_W;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, TEX_H);
    ctx.stroke();
  }

  texture.needsUpdate = true;
}

/**
 * Create the globe sphere with the canvas texture.
 */
export function createCountriesLayer(globeGroup) {
  canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  ctx = canvas.getContext('2d');

  texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  const geometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 48);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.95,
  });

  sphereMesh = new THREE.Mesh(geometry, material);
  globeGroup.add(sphereMesh);

  renderTexture();
  return sphereMesh;
}

/**
 * Highlight a country (or remove highlight).
 */
export function highlightCountry(countryKey) {
  highlightedCountries.add(countryKey);
  renderTexture();
}

export function unhighlightCountry(countryKey) {
  highlightedCountries.delete(countryKey);
  renderTexture();
}

export function clearHighlights() {
  highlightedCountries.clear();
  renderTexture();
}

export function setHighlightedCountries(keys) {
  highlightedCountries = new Set(keys);
  renderTexture();
}

/**
 * Get the approximate center longitude for a country (for camera rotation).
 */
export function getCountryCenter(key) {
  const data = COUNTRY_POLYGONS[key];
  if (!data) return 0;
  // Average longitude of first polygon
  const poly = data.polygons[0];
  let sumLng = 0;
  for (const [lng] of poly) sumLng += lng;
  return sumLng / poly.length;
}
