// Miqyas laboratoriyası: kraterlər eyni miqyasda (1 vahid = 1 km)
// Diametrlər dərc olunmuş ölçülərdir. Profil formaları SXEMATİKDİR (DEM deyil) — interfeysdə qeyd olunur.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export const CRATERS = [
  { id: 'shackleton', name: 'Şeklton', world: 'Ay', D: 21, depth: 4.1, depthMeasured: true, type: 'simple',
    color: [0.62, 0.62, 0.64], note: 'D ≈ 21 km, d ≈ 4.1 km — LOLA (Zuber et al., 2012)' },
  { id: 'haughton', name: 'Haughton', world: 'Yer', D: 23, depth: 0.25, depthMeasured: false, type: 'eroded',
    color: [0.55, 0.47, 0.40], note: 'Görünən diametr ≈ 23 km; güclü eroziya — dərinlik sxematik' },
  { id: 'jezero', name: 'Ezero', world: 'Mars', D: 45, depth: 1.0, depthMeasured: false, type: 'delta',
    color: [0.66, 0.40, 0.26], note: 'D ≈ 45 km; qərbdə delta yelpiyi — dərinlik sxematik' },
  { id: 'gale', name: 'Geyl', world: 'Mars', D: 154, depth: 4.5, depthMeasured: false, type: 'central', peak: 5.0,
    color: [0.70, 0.44, 0.28], note: 'D ≈ 154 km; Şarp dağı ~5 km — dərinlik sxematik' },
];

function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return s; }

function profile(c, r, x, y, nx) {
  const R = c.D / 2, q = r / R;
  const rim = c.type === 'eroded' ? 0.08 : 0.036 * c.D * (c.type === 'central' ? 0.35 : 1);
  let z;
  if (c.type === 'eroded') {
    z = q < 1 ? -c.depth * (1 - Math.pow(q, 4)) + rim * Math.pow(q, 6) : rim * Math.exp(-(q - 1) * 3);
    z += (fbm((x + nx) * 0.25, y * 0.25) - 0.5) * 0.35;
  } else if (c.type === 'simple') {
    z = q < 1 ? -c.depth + (c.depth + rim) * q * q : rim * Math.pow(1 / q, 3);
    z += (fbm((x + nx) * 0.6, y * 0.6) - 0.5) * 0.25;
  } else if (c.type === 'delta') {
    z = q < 1 ? -c.depth + (c.depth + rim) * Math.pow(q, 3) : rim * Math.pow(1 / q, 2.5);
    // qərb divarından içəri uzanan delta yelpiyi
    const dx = x + R * 0.78, dy = y;
    const fan = Math.max(0, 1 - Math.hypot(dx * 0.9, dy * 1.3) / (R * 0.42));
    if (q < 1.02) z += fan * 0.45 + fan * (fbm((x + nx) * 0.8, y * 0.8) - 0.5) * 0.15;
    z += (fbm((x + nx) * 0.3, y * 0.3) - 0.5) * 0.3;
  } else {
    z = q < 1 ? -c.depth + (c.depth + rim) * Math.pow(q, 6) : rim * Math.pow(1 / q, 2);
    // Şarp dağı — mərkəzdən bir az cənuba sürüşmüş laylı təpə
    const pk = Math.exp(-Math.pow(Math.hypot(x * 0.8, y + R * 0.12) / (R * 0.3), 2));
    // laylı çöküntü təpəsi — pilləli (terras) profil
    z += pk * c.peak;
    z += (fbm((x + nx) * 0.12, y * 0.12) - 0.5) * 0.8;
  }
  return z;
}

export class CraterLab {
  constructor(labelRoot) {
    this.active = false;
    this.exag = 2;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070d);
    this.scene.fog = new THREE.Fog(0x05070d, 420, 900);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
    this.camera.position.set(40, 95, 175);
    this.labelRoot = labelRoot;
    this.labels = new CSS2DRenderer({ element: labelRoot });
    const key = new THREE.DirectionalLight(0xfff2e0, 3.0); key.position.set(-120, 60, 40);
    const fill = new THREE.DirectionalLight(0x6688cc, 0.35); fill.position.set(80, 40, -60);
    this.scene.add(key, fill, new THREE.AmbientLight(0x404a60, 0.25));
    this.meshes = [];
    let x = 0; const gap = 14;
    const lay = [];
    for (const c of CRATERS) { const size = c.D * (c.D > 100 ? 1.22 : 1.7); lay.push([c, x + size / 2, size]); x += size + gap; }
    const shift = x / 2;
    for (const [c, cx, size] of lay) this._build(c, cx - shift, size);
    // 10 km miqyas xətti
    const bar = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 0.8), new THREE.MeshBasicMaterial({ color: 0x36d6e7 }));
    bar.position.set(-shift + 5, 0.5, 34);
    this.scene.add(bar);
    this._label(bar, '10 km', 'mini', new THREE.Vector3(0, 2, 0));
    this.controls = null;
    this.t = 0;
  }

  _label(obj, html, cls, off) {
    const d = document.createElement('div'); d.className = 'clabel ' + cls; d.innerHTML = html;
    const l = new CSS2DObject(d); l.position.copy(off); obj.add(l); return l;
  }

  _build(c, cx, size) {
    const seg = c.D > 100 ? 360 : 260;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const base = new Float32Array(pos.count);
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getZ(i);
      const r = Math.hypot(x, y);
      // kənarlarda yumşaq sönmə
      const edge = Math.min(1, Math.max(0, (size / 2 - Math.max(Math.abs(x), Math.abs(y))) / (size * 0.12)));
      const z = profile(c, r, x, y, cx * 3.1) * edge;
      base[i] = z;
      const n = fbm(x * 0.9 + cx, y * 0.9, 3);
      let k = 0.78 + n * 0.4 + Math.max(-0.2, Math.min(0.2, z * 0.05));
      if (c.type === 'central' && r < c.D * 0.3) k *= 0.9 + 0.1 * Math.sin(z * 7.0); // Şarp dağının laylı çöküntüləri (rəng zolaqları)
      colors[i * 3] = c.color[0] * k; colors[i * 3 + 1] = c.color[1] * k; colors[i * 3 + 2] = c.color[2] * k;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.x = cx;
    mesh.userData = { base, crater: c };
    this.scene.add(mesh);
    this.meshes.push(mesh);
    const top = this._label(mesh, `<b>${c.name}</b><span>${c.world}</span><em>D = ${c.D} km</em>`, 'big', new THREE.Vector3(0, 8 + c.D * 0.06, -size * 0.36));
    mesh.userData.label = top;
    this._applyExag(mesh);
  }

  _applyExag(mesh) {
    const pos = mesh.geometry.attributes.position, base = mesh.userData.base;
    for (let i = 0; i < pos.count; i++) pos.setY(i, base[i] * this.exag);
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }
  setExaggeration(v) { this.exag = v; for (const m of this.meshes) this._applyExag(m); }

  attach(canvas) {
    if (!this.controls) {
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enableDamping = true; this.controls.maxPolarAngle = Math.PI * 0.47;
      this.controls.minDistance = 20; this.controls.maxDistance = 420;
      this.controls.target.set(0, 0, 0);
    }
    this.controls.enabled = true;
    this.active = true;
    this.labelRoot.style.display = '';
    this.intro = 0;
    this.camera.position.set(-380, 280, 430);
    this.controls.target.set(-125, -10, 0);
  }
  detach() { this.active = false; if (this.controls) this.controls.enabled = false; this.labelRoot.style.display = 'none'; }
  focus(id) {
    const m = this.meshes.find(m => m.userData.crater.id === id); if (!m) return;
    const D = m.userData.crater.D;
    this.flyT = { t0: this.t, from: this.camera.position.clone(), fromT: this.controls.target.clone(),
      to: new THREE.Vector3(m.position.x - D * 0.35, D * 0.8 + 10, D * 1.2 + 16), toT: new THREE.Vector3(m.position.x - D * 0.55 - 6, 0, 0) };
  }
  overview() {
    this.flyT = { t0: this.t, from: this.camera.position.clone(), fromT: this.controls.target.clone(),
      to: new THREE.Vector3(-150, 190, 300), toT: new THREE.Vector3(-125, -10, 0) };
  }
  resize(w, h) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.labels.setSize(w, h); }
  render(renderer, dt) {
    this.t += dt;
    if (this.intro < 1) {
      this.intro = Math.min(1, this.intro + dt / 3);
      if (this.intro >= 1 && !this.flyT) this.overview();
    }
    if (this.flyT) {
      const k = Math.min(1, (this.t - this.flyT.t0) / 2.2), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      this.camera.position.lerpVectors(this.flyT.from, this.flyT.to, e);
      this.controls.target.lerpVectors(this.flyT.fromT, this.flyT.toT, e);
      if (k >= 1) this.flyT = null;
    }
    this.controls.update();
    renderer.setRenderTarget(null);
    renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }
}
