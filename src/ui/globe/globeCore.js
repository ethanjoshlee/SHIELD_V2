/**
 * Three.js globe — scene setup, camera, renderer, animation loop.
 */

import * as THREE from 'three';

let scene, camera, renderer, globeGroup;
let animationId = null;
let targetRotationY = 0;
let currentRotationY = 0;
const AUTO_ROTATE_SPEED = 0.0003;
let autoRotate = true;

export function initGlobe(container) {
  scene = new THREE.Scene();

  const w = container.clientWidth;
  const h = container.clientHeight;

  camera = new THREE.PerspectiveCamera(45, w / h, 1, 2000);
  camera.position.set(0, 0, 500);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  globeGroup = new THREE.Group();
  scene.add(globeGroup);

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
export function getCamera() { return camera; }

export function setAutoRotate(val) { autoRotate = val; }

export function startAnimation() {
  if (animationId) return;
  function loop() {
    animationId = requestAnimationFrame(loop);
    if (autoRotate) {
      targetRotationY += AUTO_ROTATE_SPEED;
    }
    // Smooth interpolation
    currentRotationY += (targetRotationY - currentRotationY) * 0.05;
    if (globeGroup) {
      globeGroup.rotation.y = currentRotationY;
    }
    renderer.render(scene, camera);
  }
  loop();
}

export function stopAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

export function rotateToCountry(lng) {
  // Rotate globe so the country is roughly centered
  targetRotationY = -THREE.MathUtils.degToRad(lng) - Math.PI / 2;
}

export function disposeGlobe() {
  stopAnimation();
  if (renderer) {
    renderer.dispose();
    renderer.domElement.remove();
  }
}
