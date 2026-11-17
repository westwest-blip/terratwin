// TerraAnalog — 3D-сравнение «Земля ↔ цель»: два участка одинакового размера в километрах,
// одинаковое вертикальное увеличение, синхронное вращение. Рельеф: data/analog/dem_*.bin (ETOPO5, MOLA, LOLA).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const R = { earth: 6371.0, mars: 3389.5, moon: 1737.4 };                    // км, NSSDC
const DEM = {
  earth: { url: 'data/analog/dem_earth.bin', w: 2160, h: 1080, reg: true },   // узлы: 90°N, 0°E, шаг 10'
  mars: { url: 'data/analog/dem_mars.bin', w: 1440, h: 720, reg: false },     // пиксели-площадки, 0…360°E
  moon: { url: 'data/analog/dem_moon.bin', w: 720, h: 360, reg: false },
};
const TEX = { earth: 'assets/tex/earth_day_8k.jpg', mars: 'assets/tex/mars_color_8k.jpg', moon: 'assets/tex/moon_color_8k.jpg' };   // долгота −180…180
const cache = {};
const once = (key, make) => cache[key] || (cache[key] = make());
const loadDem = body => once('dem' + body, async () => new Int16Array(await (await fetch(DEM[body].url)).arrayBuffer()));
const loadImg = body => once('img' + body, () => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = TEX[body]; }));

// точка на расстоянии (east, north) км от центра — по дуге большого круга, работает и у полюсов
function dest(lat, lon, ex, ny, radius) {
  const d = Math.hypot(ex, ny) / radius, b = Math.atan2(ex, ny), p = Math.PI / 180, a1 = lat * p;
  const a2 = Math.asin(Math.max(-1, Math.min(1, Math.sin(a1) * Math.cos(d) + Math.cos(a1) * Math.sin(d) * Math.cos(b))));
  const o2 = lon * p + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(a1), Math.cos(d) - Math.sin(a1) * Math.sin(a2));
  return [a2 / p, o2 / p];
}
function sampleDem(dem, spec, lat, lon) {
  const { w, h, reg } = spec, l = ((lon % 360) + 360) % 360;
  let y = (90 - lat) / 180 * h - (reg ? 0 : 0.5), x = l / 360 * w - (reg ? 0 : 0.5);
  y = Math.max(0, Math.min(h - 1.001, y)); const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const g = (yy, xx) => dem[yy * w + ((xx % w) + w) % w];
  return g(y0, x0) * (1 - fx) * (1 - fy) + g(y0, x0 + 1) * fx * (1 - fy) + g(y0 + 1, x0) * (1 - fx) * fy + g(y0 + 1, x0 + 1) * fx * fy;
}

async function buildPatch(spot, sizeKm, exag, n = 121, tn = 384) {
  const [dem, img] = await Promise.all([loadDem(spot.body), loadImg(spot.body)]);
  const radius = R[spot.body], spec = DEM[spot.body];
  // высоты
  const hgt = new Float32Array(n * n); let mean = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const [la, lo] = dest(spot.lat, spot.lon, (i / (n - 1) - 0.5) * sizeKm, (0.5 - j / (n - 1)) * sizeKm, radius);
    const v = sampleDem(dem, spec, la, lo); hgt[j * n + i] = v; mean += v;
  }
  mean /= n * n;
  // текстура: для каждого пикселя участка ищем цвет на карте (равнопромежуточная проекция, долгота −180…180)
  const geo = new Float32Array(tn * tn * 2); let laMin = 90, laMax = -90;
  for (let j = 0; j < tn; j++) for (let i = 0; i < tn; i++) {
    const [la, lo] = dest(spot.lat, spot.lon, (i / (tn - 1) - 0.5) * sizeKm, (0.5 - j / (tn - 1)) * sizeKm, radius);
    geo[(j * tn + i) * 2] = la; geo[(j * tn + i) * 2 + 1] = lo; if (la < laMin) laMin = la; if (la > laMax) laMax = la;
  }
  const IW = img.naturalWidth, IH = img.naturalHeight;
  const y0 = Math.max(0, Math.floor((90 - laMax) / 180 * IH) - 1), y1 = Math.min(IH, Math.ceil((90 - laMin) / 180 * IH) + 1), sh = Math.max(1, y1 - y0);
  const strip = document.createElement('canvas'); strip.width = IW; strip.height = sh;
  const sctx = strip.getContext('2d', { willReadFrequently: true }); sctx.drawImage(img, 0, y0, IW, sh, 0, 0, IW, sh);
  const src = sctx.getImageData(0, 0, IW, sh).data;
  const cv = document.createElement('canvas'); cv.width = cv.height = tn; const ctx = cv.getContext('2d'), out = ctx.createImageData(tn, tn);
  for (let k = 0; k < tn * tn; k++) {
    const la = geo[k * 2], lo = geo[k * 2 + 1];
    const sx = Math.floor((((lo + 180) % 360 + 360) % 360) / 360 * IW) % IW, sy = Math.max(0, Math.min(sh - 1, Math.floor((90 - la) / 180 * IH) - y0)), p = (sy * IW + sx) * 4;
    out.data[k * 4] = src[p]; out.data[k * 4 + 1] = src[p + 1]; out.data[k * 4 + 2] = src[p + 2]; out.data[k * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  // сетка: ширина 1 = sizeKm
  const g = new THREE.PlaneGeometry(1, 1, n - 1, n - 1); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let k = 0; k < n * n; k++) pos.setY(k, (hgt[k] - mean) * exag / (sizeKm * 1000));
  g.computeVertexNormals();
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 }));
}

function makeView(el, mesh) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  el.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(32, 1, 0.01, 20);
  camera.position.set(0.95, 0.85, 1.15);
  scene.add(mesh, new THREE.HemisphereLight(0xffffff, 0x202631, 0.75));
  const sun = new THREE.DirectionalLight(0xfff2e0, 2.4); sun.position.set(-1.2, 0.7, 0.5); scene.add(sun);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.004, 0.02, 1.004), new THREE.MeshBasicMaterial({ color: 0x0b0f17 })); base.position.y = -0.14; scene.add(base);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 0.7; controls.maxDistance = 3.2; controls.maxPolarAngle = Math.PI * 0.47;
  const resize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  resize();
  return { renderer, scene, camera, controls, resize };
}

export async function openCompare(elA, elB, a, b, { sizeKm = 600, exag = 12 } = {}) {
  const [ma, mb] = await Promise.all([buildPatch(a, sizeKm, exag), buildPatch(b, sizeKm, exag)]);
  const A = makeView(elA, ma), B = makeView(elB, mb);
  A.controls.autoRotate = true; A.controls.autoRotateSpeed = 0.9;
  let lead = A, follow = B, alive = true;
  const take = (x, y) => () => { lead = x; follow = y; A.controls.autoRotate = false; };
  A.renderer.domElement.addEventListener('pointerdown', take(A, B)); B.renderer.domElement.addEventListener('pointerdown', take(B, A));
  A.renderer.domElement.addEventListener('wheel', take(A, B), { passive: true }); B.renderer.domElement.addEventListener('wheel', take(B, A), { passive: true });
  const onResize = () => { A.resize(); B.resize(); };
  window.addEventListener('resize', onResize);
  (function loop() {
    if (!alive) return;
    lead.controls.update();
    follow.camera.position.copy(lead.camera.position); follow.camera.quaternion.copy(lead.camera.quaternion); follow.controls.target.copy(lead.controls.target);
    A.renderer.render(A.scene, A.camera); B.renderer.render(B.scene, B.camera);
    requestAnimationFrame(loop);
  })();
  return { close() {
    alive = false; window.removeEventListener('resize', onResize);
    for (const v of [A, B]) { v.controls.dispose(); v.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } }); v.renderer.dispose(); v.renderer.domElement.remove(); }
  } };
}
