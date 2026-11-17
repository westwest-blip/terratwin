// TerraTwin əlavə 3D obyektləri: orbitdəki obyektlər (CelesTrak) və "əkiz" qövsləri
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { latLonToVec } from './scene.js';

/* ---------------- Orbitdəki obyektlər ----------------
   Hər nöqtə real TLE-dən götürülmüş Kepler elementləri ilə vertex şeyderində hərəkət edir
   (sadələşdirilmiş iki cisim modeli; J2 və atmosfer müqaviməti nəzərə alınmır). */
const orbitVert = /* glsl */`
attribute vec4 el1;   // inc, raan, ecc, argp (dərəcə)
attribute vec4 el2;   // M0 (dərəcə), n (dövr/gün), dt0 (gün), növ (0 peyk, 1 qırıntı)
uniform float uTime;  // simulyasiya vaxtı (gün, istinad anından)
uniform float uScale; uniform float uSize;
varying float vKind; varying float vFade;
const float D2R = 0.017453292519943295;
void main(){
  float n = el2.y;
  float a = pow(398600.4418 / pow(n * 6.283185307 / 86400.0, 2.0), 1.0/3.0) / 6371.0; // Yer radiusu ilə
  float revs = n * (uTime - el2.z);
  float M = (el2.x / 360.0 + fract(revs)) * 6.283185307;
  float e = el1.z;
  float E = M;
  for (int i = 0; i < 5; i++) E = E - (E - e * sin(E) - M) / (1.0 - e * cos(E));
  float px = a * (cos(E) - e);
  float py = a * sqrt(1.0 - e * e) * sin(E);
  float w = el1.w * D2R, O = el1.y * D2R, I = el1.x * D2R;
  float cw = cos(w), sw = sin(w), cO = cos(O), sO = sin(O), cI = cos(I), sI = sin(I);
  vec3 eci = vec3(
    (cO * cw - sO * sw * cI) * px + (-cO * sw - sO * cw * cI) * py,
    (sO * cw + cO * sw * cI) * px + (-sO * sw + cO * cw * cI) * py,
    (sw * sI) * px + (cw * sI) * py);
  vec3 p = vec3(eci.x, eci.z, -eci.y) * uScale;      // ECI z (şimal) → səhnənin Y oxu
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uSize / -mv.z, 1.0, 4.0);
  vKind = el2.w;
  vFade = a > 5.0 ? 0.55 : 1.0;
}`;
const orbitFrag = /* glsl */`
uniform float uOpacity;
varying float vKind; varying float vFade;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  vec3 sat = vec3(0.62, 0.80, 1.0), deb = vec3(1.0, 0.48, 0.26);
  vec3 col = mix(sat, deb, vKind) * (vKind > 0.5 ? 1.6 : 1.0);
  gl_FragColor = vec4(col, (1.0 - d * 2.0) * uOpacity * vFade);
}`;

export class OrbitCloud {
  constructor(data, parent) {
    const rows = data.rows;
    const now = Date.now() / 86400000;
    this.ref = now;
    const el1 = new Float32Array(rows.length * 4), el2 = new Float32Array(rows.length * 4);
    rows.forEach((r, i) => {
      el1.set([r[0], r[1], r[2], r[3]], i * 4);
      el2.set([r[4], r[5], r[6] - now, r[7]], i * 4);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rows.length * 3), 3));
    g.setAttribute('el1', new THREE.BufferAttribute(el1, 4));
    g.setAttribute('el2', new THREE.BufferAttribute(el2, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
    this.uniforms = { uTime: { value: 0 }, uScale: { value: 1 }, uSize: { value: 5 }, uOpacity: { value: 0 } };
    this.mat = new THREE.ShaderMaterial({ vertexShader: orbitVert, fragmentShader: orbitFrag, uniforms: this.uniforms,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    parent.add(this.points);
    this.target = 0;
    this.speed = 60;   // real vaxtdan 60 dəfə sürətli
    this.counts = { sat: rows.filter(r => !r[7]).length, deb: rows.filter(r => r[7]).length };
  }
  setVisible(v) { this.target = v ? 1 : 0; if (v) this.points.visible = true; }
  update(dt, pixelRatio) {
    this.uniforms.uTime.value += (dt * this.speed) / 86400;
    this.uniforms.uSize.value = 6 * pixelRatio;
    const o = this.uniforms.uOpacity.value;
    this.uniforms.uOpacity.value = o + (this.target - o) * Math.min(1, dt * 2.5);
    if (this.target === 0 && this.uniforms.uOpacity.value < 0.01) this.points.visible = false;
  }
}

/* ---------------- Əkiz qövsləri ---------------- */
export class TwinArcs {
  constructor(engine) {
    this.engine = engine;
    this.group = new THREE.Group();
    engine.scene.add(this.group);
    this.arcs = [];
    this.visible = false;
    this.opacity = 0;
    this.group.visible = false;
  }
  build(pairs) {
    // pairs: [{id, site:{lat,lon}, body, target:{lat,lon}, color}]
    for (const p of pairs) {
      const geo = new LineGeometry();
      geo.setPositions(new Array(64 * 3).fill(0));
      const mat = new LineMaterial({ color: p.color, linewidth: 2.2, transparent: true, opacity: 0, dashed: true,
        dashSize: 0.08, gapSize: 0.05, depthWrite: false, blending: THREE.AdditiveBlending });
      mat.defines.USE_DASH = '';
      const line = new Line2(geo, mat);
      line.frustumCulled = false;
      this.group.add(line);
      this.arcs.push({ ...p, line, geo, mat, emph: 1 });
    }
  }
  setVisible(v) { this.visible = v; if (v) this.group.visible = true; }
  emphasize(ids) {
    for (const a of this.arcs) a.emph = !ids || ids.includes(a.id) ? 1 : 0.18;
  }
  update(dt, w, h) {
    const k = Math.min(1, dt * 3);
    this.opacity += ((this.visible ? 1 : 0) - this.opacity) * k;
    if (!this.visible && this.opacity < 0.01) { this.group.visible = false; return; }
    const e = this.engine;
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), mid = new THREE.Vector3();
    for (const a of this.arcs) {
      e.earthMesh.updateWorldMatrix(true, false);
      A.copy(e.earthMesh.localToWorld(latLonToVec(a.site.lat, a.site.lon, e.earthR * 1.01)));
      const mesh = a.body === 'moon' ? e.moonMesh : e.marsMesh;
      const r = a.body === 'moon' ? e.moonR : e.marsR;
      mesh.updateWorldMatrix(true, false);
      B.copy(mesh.localToWorld(latLonToVec(a.target.lat, a.target.lon, r * 1.01)));
      mid.addVectors(A, B).multiplyScalar(0.5);
      const lift = A.distanceTo(B) * 0.35;
      C.copy(mid).add(new THREE.Vector3(0, 1, 0.35).normalize().multiplyScalar(lift));
      const pts = [];
      for (let i = 0; i < 64; i++) {
        const t = i / 63, u = 1 - t;
        pts.push(u * u * A.x + 2 * u * t * C.x + t * t * B.x, u * u * A.y + 2 * u * t * C.y + t * t * B.y, u * u * A.z + 2 * u * t * C.z + t * t * B.z);
      }
      a.geo.setPositions(pts);
      a.line.computeLineDistances();
      a.mat.resolution.set(w, h);
      a.mat.dashOffset -= dt * 0.12;
      a.mat.opacity = this.opacity * a.emph * 0.95;
      a.mat.linewidth = a.emph > 0.5 ? 2.6 : 1.4;
    }
  }
}

/* ---------------- Ayın orbit halqası (vizual işarə) ---------------- */
export function moonRing(engine) {
  const pts = [];
  for (let i = 0; i <= 256; i++) { const a = (i / 256) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a))); }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color: 0x8fa3c4, transparent: true, opacity: 0.0, depthWrite: false });
  const ring = new THREE.LineLoop(geo, mat);
  engine.scene.add(ring);
  return {
    ring, target: 0,
    update(dt) {
      const e = engine.earth.position, m = engine.moon.position;
      const r = e.distanceTo(m);
      ring.position.copy(e);
      ring.scale.setScalar(r);
      // halqanı Ayın olduğu müstəviyə çevir
      const n = new THREE.Vector3().subVectors(m, e).normalize();
      const axis = new THREE.Vector3().crossVectors(n, new THREE.Vector3(0, 1, 0)).normalize();
      const normal = new THREE.Vector3().crossVectors(axis, n).normalize();
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      mat.opacity += (this.target * 0.13 - mat.opacity) * Math.min(1, dt * 2);
      ring.visible = mat.opacity > 0.005;
    },
  };
}
