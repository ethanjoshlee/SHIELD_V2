/**
 * Three.js globe — scene setup, camera, renderer, animation loop.
 */

import * as THREE from 'three';

let scene, camera, renderer, globeDisplayGroup, globeGroup;
let animationId = null;
let autoRotate = true;

// Constants
const AUTO_ROTATE_SPEED = 0.001;
const DRAG_SENSITIVITY = 0.005;
const DAMPING = 0.90;
const VELOCITY_THRESHOLD = 0.0001;
const MAX_TILT = Math.PI * 0.45; // ~81° — prevents inversion
const PRESENTATION_TILT = THREE.MathUtils.degToRad(6);

// Decomposed rotation state
let rotY = 0;         // unbounded spin around world Y
let rotX = 0;         // clamped tilt around world X
let velX = 0;
let velY = 0;
let isDragging = false;
let lastPointerX = 0;
let lastPointerY = 0;
let targetRotY = null; // set by rotateToCountry(); null = free mode

// Pre-allocated quaternion objects — no per-frame allocation
const _qY = new THREE.Quaternion();
const _qX = new THREE.Quaternion();
const _axisY = new THREE.Vector3(0, 1, 0);
const _axisX = new THREE.Vector3(1, 0, 0);

function applyRotation() {
  _qY.setFromAxisAngle(_axisY, rotY);
  _qX.setFromAxisAngle(_axisX, rotX);
  globeGroup.quaternion.multiplyQuaternions(_qY, _qX);
}

export function initGlobe(container) {
  scene = new THREE.Scene();

  const w = container.clientWidth;
  const h = container.clientHeight;

  camera = new THREE.PerspectiveCamera(45, w / h, 1, 2000);
  camera.position.set(0, 0, 700);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  // Presentation-layer wrapper for small visual framing tilt.
  globeDisplayGroup = new THREE.Group();
  globeDisplayGroup.rotation.x = PRESENTATION_TILT;
  scene.add(globeDisplayGroup);

  // Geographic rotation group (used by rotateToCountry/drag/auto-rotate).
  globeGroup = new THREE.Group();
  globeDisplayGroup.add(globeGroup);

  // Handle resize
  const ro = new ResizeObserver(() => {
    const nw = container.clientWidth;
    const nh = container.clientHeight;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  });
  ro.observe(container);

  return { scene, camera, renderer, globeGroup };
}

export function getGlobeGroup() { return globeGroup; }
export function getScene() { return scene; }

export function startAnimation() {
  if (animationId) return;
  function loop() {
    animationId = requestAnimationFrame(loop);

    if (!isDragging) {
      if (Math.sqrt(velX * velX + velY * velY) > VELOCITY_THRESHOLD) {
        // Momentum phase — apply damping, respect tilt constraint
        rotY += velY;
        rotX = Math.max(-MAX_TILT, Math.min(MAX_TILT, rotX + velX));
        if (Math.abs(rotX) >= MAX_TILT) velX = 0;
        velX *= DAMPING;
        velY *= DAMPING;
        applyRotation();
      } else if (targetRotY !== null) {
        // rotateToCountry slerp — spin only, tilt unchanged
        rotY += (targetRotY - rotY) * 0.05;
        if (Math.abs(targetRotY - rotY) < 0.01) { rotY = targetRotY; targetRotY = null; }
        applyRotation();
      } else {
        // Auto-rotate — spin only
        if (autoRotate) rotY += AUTO_ROTATE_SPEED;
        applyRotation();
      }
    }

    renderer.render(scene, camera);
  }
  loop();
}

function stopAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

export function setupInteraction(container) {
  const canvas = renderer.domElement;

  canvas.addEventListener('pointerdown', (e) => {
    isDragging = true;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    velX = 0;
    velY = 0;
    targetRotY = null;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    velY = dx * DRAG_SENSITIVITY;
    velX = dy * DRAG_SENSITIVITY;
    rotY += velY;
    rotX = Math.max(-MAX_TILT, Math.min(MAX_TILT, rotX + velX));
    if (Math.abs(rotX) >= MAX_TILT) velX = 0;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    applyRotation();
  });

  canvas.addEventListener('pointerup', () => {
    isDragging = false;
  });

  canvas.addEventListener('pointercancel', () => {
    isDragging = false;
    velX = 0;
    velY = 0;
  });
}

export function rotateToCountry(lng) {
  // Rotate globe so the country is roughly centered (spin only, tilt unchanged)
  targetRotY = -THREE.MathUtils.degToRad(lng) - Math.PI / 2;
}

export function disposeGlobe() {
  stopAnimation();
  if (renderer) {
    renderer.dispose();
    renderer.domElement.remove();
  }
}
