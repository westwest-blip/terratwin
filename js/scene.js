// TerraTwin 3D mühərriki — Three.js r170
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { WORLDS } from './data.js';

const R_EARTH = 1;
const R_MOON = WORLDS.moon.radiusKm / WORLDS.earth.radiusKm;   // 0.2727 — real nisbət
const R_MARS = WORLDS.mars.radiusKm / WORLDS.earth.radiusKm;   // 0.5320 — real nisbət
const TEX = 'assets/tex/';

export const LAYOUTS = {
  // Mars uzaqdadır: öz orbitində, Yer–Ay sistemindən ayrı görünür (məsafələr miqyassızdır)
  hero:   { earth: [0, 0, 0], moon: [2.15, 0.75, -1.9], mars: [9.5, -3.0, -26] },
  twins:  { earth: [-1.9, -0.25, 0], moon: [1.15, 0.95, -0.4], mars: [2.9, -0.75, -1.6] },
  history:{ earth: [0, 0, 0], moon: [2.15, 0.75, -1.9], mars: [9.5, -3.0, -26] },
};

const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// lat/lon -> SphereGeometry ilə eyni UV konvensiyasında vahid vektor
export function latLonToVec(lat, lon, r = 1) {
  const la = THREE.MathUtils.degToRad(lat), phi = THREE.MathUtils.degToRad(lon + 180);
  return new THREE.Vector3(-Math.cos(phi) * Math.cos(la) * r, Math.sin(la) * r, Math.sin(phi) * Math.cos(la) * r);
}

/* ------------------------------ SHADERS ------------------------------ */
const earthVert = /* glsl */`
varying vec2 vUv; varying vec3 vN; varying vec3 vWorldPos;
void main(){
  vUv = uv;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const earthFrag = /* glsl */`
uniform sampler2D dayMap; uniform sampler2D nightMap; uniform sampler2D bumpMap; uniform sampler2D waterMap;
uniform vec3 sunDir; uniform vec3 poleAxis; uniform vec2 texel; uniform float bumpStrength;
uniform float mode; uniform float nightBoost; uniform float sunIntensity;
varying vec2 vUv; varying vec3 vN; varying vec3 vWorldPos;
vec3 ramp(float t){
  vec3 c0=vec3(0.16,0.32,0.20), c1=vec3(0.45,0.62,0.30), c2=vec3(0.86,0.80,0.45), c3=vec3(0.72,0.45,0.25), c4=vec3(0.98,0.97,0.96);
  if(t<0.25) return mix(c0,c1,t/0.25);
  if(t<0.5) return mix(c1,c2,(t-0.25)/0.25);
  if(t<0.75) return mix(c2,c3,(t-0.5)/0.25);
  return mix(c3,c4,(t-0.75)/0.25);
}
void main(){
  vec3 N = normalize(vN);
  vec3 T = normalize(cross(poleAxis, N) + 1e-5);
  vec3 B = cross(N, T);
  float h  = texture2D(bumpMap, vUv).r;
  float hx = texture2D(bumpMap, vUv + vec2(texel.x, 0.0)).r;
  float hy = texture2D(bumpMap, vUv + vec2(0.0, texel.y)).r;
  vec3 Np = normalize(N - bumpStrength * ((hx - h) * T + (hy - h) * B));
  vec3 V = normalize(cameraPosition - vWorldPos);
  float NdLgeo = dot(N, sunDir);
  float diff = max(dot(Np, sunDir), 0.0);
  float water = texture2D(waterMap, vUv).r;
  vec3 col;
  if (mode < 0.5) {
    vec3 day = texture2D(dayMap, vUv).rgb;
    col = day * diff * sunIntensity;
    vec3 H = normalize(sunDir + V);
    float spec = pow(max(dot(N, H), 0.0), 260.0) * water * smoothstep(-0.05, 0.25, NdLgeo);
    col += vec3(1.0, 0.9, 0.75) * spec * 0.32 + vec3(0.9, 0.85, 0.75) * pow(max(dot(N, H), 0.0), 18.0) * water * 0.05;
    vec3 night = texture2D(nightMap, vUv).rgb;
    float lights = max(max(night.r, max(night.g, night.b)) - 0.06, 0.0);
    float nightMask = smoothstep(0.12, -0.18, NdLgeo);
    col += vec3(1.0, 0.78, 0.48) * lights * nightMask * nightBoost;
    col += night * 0.035 * nightMask;
  } else {
    float land = 1.0 - water;
    vec3 c = mix(vec3(0.03, 0.09, 0.22), ramp(pow(h, 0.6)), land);
    col = c * (0.30 + 0.70 * max(dot(Np, sunDir) * 0.5 + 0.5, 0.0)) * 1.25;
  }
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  vec3 atm = vec3(0.28, 0.55, 1.0);
  float dayside = smoothstep(-0.25, 0.6, NdLgeo);
  col = mix(col, atm * 1.15 * dayside, fres * 0.55);
  col += atm * 0.035 * dayside;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const atmoVert = /* glsl */`
varying vec3 vNv; varying vec3 vNw;
void main(){
  vNv = normalize(normalMatrix * normal);
  vNw = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const atmoFrag = /* glsl */`
uniform vec3 glowColor; uniform vec3 sunDir; uniform float power; uniform float strength; uniform float base;
varying vec3 vNv; varying vec3 vNw;
void main(){
  float i = pow(clamp(base - dot(vNv, vec3(0.0, 0.0, 1.0)), 0.0, 2.0), power);
  float lit = smoothstep(-0.35, 0.55, dot(vNw, sunDir));
  gl_FragColor = vec4(glowColor * i * strength * (0.08 + 0.92 * lit), 1.0);
}`;

const ringFrag = /* glsl */`
uniform vec3 color; uniform float time; uniform float phase;
varying vec2 vUv;
void main(){
  float r = length(vUv - 0.5) * 2.0;
  float t = fract(time * 0.6 + phase);
  float ring = smoothstep(0.08, 0.0, abs(r - t)) * (1.0 - t);
  float core = smoothstep(0.22, 0.0, r) * 0.9;
  float a = ring + core;
  if (a < 0.01) discard;
  gl_FragColor = vec4(color * (1.0 + core * 1.5), a);
}`;
const ringVert = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

/* ------------------------------ ENGINE ------------------------------ */
export class Engine {
  constructor(canvas, labelRoot, onProgress) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.time = 0;
    this.quality = 'high';
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.005, 2000);
    this.camera.position.set(0.9, 0.45, 5.6);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.7;
    this.controls.enablePan = false;
    this.controls.target.set(0.45, 0, 0);

    this.labels = new CSS2DRenderer({ element: labelRoot });

    this.manager = new THREE.LoadingManager();
    this.manager.onProgress = (url, loaded, total) => onProgress && onProgress(loaded / total, url);
    this.loader = new THREE.TextureLoader(this.manager);

    // Günəş ekliptika müstəvisində (y = 0): Yerin oxu meyli iyul fəslini, Ayın qütbü isə real sürüşkən işığı verir
    this.sunDir = new THREE.Vector3(0.78, 0.0, 0.62).normalize();
    this.flight = null;
    this.follow = null;       // {body, localDir, dist} — kamera planetin fırlanmasını izləyir
    this.markers = [];
    this.targetMarkers = [];
    this.extraMarkers = [];
    this.raycaster = new THREE.Raycaster();
    this.twin = null;
    this.altScene = null;     // krater laboratoriyası
    this.autoRotate = true;
    this.spinTweens = {};
    this.updaters = [];
    this.tiltTween = null;

    this._buildLights();
    this._buildSky();
    this._buildEarth();
    this._buildMoon();
    this._buildMars();
    this._buildComposer();
    this.setLayout('hero', true);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  tex(name, srgb = true) {
    const t = this.loader.load(TEX + name);
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = this.maxAniso;
    return t;
  }

  _buildLights() {
    this.sun = new THREE.DirectionalLight(0xffffff, 3.2);
    this.sun.position.copy(this.sunDir).multiplyScalar(50);
    this.scene.add(this.sun);
    this.scene.add(new THREE.AmbientLight(0x223355, 0.05));
    // Günəş diski (bloom ilə parıldayır)
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.12, 'rgba(255,246,225,1)');
    grd.addColorStop(0.3, 'rgba(255,210,150,0.35)'); grd.addColorStop(1, 'rgba(255,180,120,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
    const sunTex = new THREE.CanvasTexture(c); sunTex.colorSpace = THREE.SRGBColorSpace;
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, color: new THREE.Color(4, 3.7, 3.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    sun.position.copy(this.sunDir).multiplyScalar(420);
    sun.scale.setScalar(60);
    this.scene.add(sun);
    this.sunSprite = sun;
  }

  _buildSky() {
    const t = this.tex('stars_8k.jpg');
    const m = new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, depthWrite: false, color: new THREE.Color(1.35, 1.35, 1.35) });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 96, 48), m);
    // Ekvatorial ulduz xəritəsini ekliptikaya təqribən uyğunlaşdırmaq üçün kiçik meyl
    this.sky.rotation.z = THREE.MathUtils.degToRad(23.44);
    this.scene.add(this.sky);
  }

  _atmosphere(radius, color, opts) {
    const mat = new THREE.ShaderMaterial({
      vertexShader: atmoVert, fragmentShader: atmoFrag, side: THREE.BackSide, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { glowColor: { value: new THREE.Color(color) }, sunDir: { value: this.sunDir }, power: { value: opts.power }, strength: { value: opts.strength }, base: { value: opts.base } },
    });
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 128, 64), mat);
  }

  _buildEarth() {
    this.earth = new THREE.Group();
    this.earth.name = 'earth';
    this.earthTilt = new THREE.Group();               // 23.44° ox meyli
    this.earthTilt.rotation.z = THREE.MathUtils.degToRad(-23.44);
    this.earth.add(this.earthTilt);
    this.earthSpin = new THREE.Group();
    this.earthTilt.add(this.earthSpin);
    const uniforms = {
      dayMap: { value: this.tex('earth_day_8k.jpg') },
      nightMap: { value: this.tex('earth_night_8k.jpg') },
      bumpMap: { value: this.tex('earth_bump_8k.jpg', false) },
      waterMap: { value: this.tex('earth_water_4k.png', false) },
      sunDir: { value: this.sunDir }, poleAxis: { value: new THREE.Vector3(0, 1, 0) },
      texel: { value: new THREE.Vector2(1 / 8192, 1 / 4096) }, bumpStrength: { value: 3.2 },
      mode: { value: 0 }, nightBoost: { value: 2.6 }, sunIntensity: { value: 1.75 },
    };
    this.earthUniforms = uniforms;
    const mat = new THREE.ShaderMaterial({ vertexShader: earthVert, fragmentShader: earthFrag, uniforms });
    this.earthMesh = new THREE.Mesh(new THREE.SphereGeometry(R_EARTH, 256, 128), mat);
    this.earthMesh.userData.body = 'earth';
    this.earthSpin.add(this.earthMesh);
    this.earth.add(this._atmosphere(R_EARTH * 1.045, 0x5aa0ff, { power: 4.2, strength: 1.9, base: 0.78 }));
    this.earthR = R_EARTH;
    this.scene.add(this.earth);
  }

  _buildMoon() {
    this.moon = new THREE.Group(); this.moon.name = 'moon';
    this.moonSpin = new THREE.Group(); this.moon.add(this.moonSpin);
    const height = this.tex('moon_height_4k.png', false);
    // LOLA hündürlük diapazonu ~19.7 km; radiusun 1.13%-i. Vizual aydınlıq üçün 2× şaquli şişirtmə.
    const range = (19667 / 1737400) * R_MOON * 2.0;
    this.moonMat = new THREE.MeshStandardMaterial({
      map: this.tex('moon_color_8k.jpg'), displacementMap: height, displacementScale: range, displacementBias: -range * 0.456,
      bumpMap: height, bumpScale: 6.0, roughness: 0.96, metalness: 0,
    });
    this.moonColor = this.moonMat.map;
    this.moonMesh = new THREE.Mesh(new THREE.SphereGeometry(R_MOON, 512, 256), this.moonMat);
    this.moonMesh.userData.body = 'moon';
    this.moonSpin.add(this.moonMesh);
    this.moonR = R_MOON;
    this.scene.add(this.moon);
  }

  _buildMars() {
    this.mars = new THREE.Group(); this.mars.name = 'mars';
    this.marsTilt = new THREE.Group(); this.marsTilt.rotation.z = THREE.MathUtils.degToRad(-25.19);
    this.mars.add(this.marsTilt);
    this.marsSpin = new THREE.Group(); this.marsTilt.add(this.marsSpin);
    this.marsMat = new THREE.MeshStandardMaterial({ map: this.tex('mars_color_8k.jpg'), roughness: 0.97, metalness: 0 });
    this.marsColor = this.marsMat.map;
    this.marsMesh = new THREE.Mesh(new THREE.SphereGeometry(R_MARS, 256, 128), this.marsMat);
    this.marsMesh.userData.body = 'mars';
    this.marsSpin.add(this.marsMesh);
    this.mars.add(this._atmosphere(R_MARS * 1.03, 0xd9895a, { power: 5.0, strength: 0.9, base: 0.74 }));
    this.marsR = R_MARS;
    this.scene.add(this.mars);
  }

  _buildComposer() {
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.5, 0.9);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  body(name) { return { earth: this.earth, moon: this.moon, mars: this.mars }[name]; }
  bodyR(name) { return { earth: this.earthR, moon: this.moonR, mars: this.marsR }[name]; }
  spin(name) { return { earth: this.earthSpin, moon: this.moonSpin, mars: this.marsSpin }[name]; }

  /* ---------------------- layouts & layers ---------------------- */
  setLayout(name, instant = false) {
    const L = LAYOUTS[name];
    this.layoutTween = { from: {}, to: {}, t0: this.time, dur: instant ? 0.0001 : 2.2 };
    for (const k of ['earth', 'moon', 'mars']) {
      this.layoutTween.from[k] = this.body(k).position.clone();
      this.layoutTween.to[k] = new THREE.Vector3(...L[k]);
    }
    this.layout = name;
  }

  setElevationLayer(on) {
    this.earthUniforms.mode.value = on ? 1 : 0;
    if (on && !this.moonElev) {
      this.moonElev = this.tex('moon_elev_4k.jpg');
      this.marsElev = this.tex('mars_mola_8k.jpg');
    }
    this.moonMat.map = on ? this.moonElev : this.moonColor;
    this.marsMat.map = on ? this.marsElev : this.marsColor;
    this.moonMat.needsUpdate = true; this.marsMat.needsUpdate = true;
  }

  /* --------------------------- markers --------------------------- */
  _makeMarker(parentSpin, bodyR, lat, lon, color, label, data, size = 1) {
    const g = new THREE.Group();
    const n = latLonToVec(lat, lon, 1);
    g.position.copy(n.clone().multiplyScalar(bodyR * 1.002));
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    const col = new THREE.Color(color);
    const s = bodyR * 0.035 * size;
    const beamH = bodyR * 0.11 * size;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.06, s * 0.06, beamH, 8),
      new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(2.2), transparent: true, opacity: 0.85 }));
    beam.position.y = beamH / 2;
    const head = new THREE.Mesh(new THREE.SphereGeometry(s * 0.22, 16, 12), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(3) }));
    head.position.y = beamH;
    const ringMat = new THREE.ShaderMaterial({ vertexShader: ringVert, fragmentShader: ringFrag, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { color: { value: col.clone().multiplyScalar(1.6) }, time: { value: 0 }, phase: { value: Math.random() } } });
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(s * 3.2, s * 3.2), ringMat);
    ring.rotation.x = -Math.PI / 2; ring.position.y = bodyR * 0.001;
    const hit = new THREE.Mesh(new THREE.SphereGeometry(s * 1.3, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = beamH * 0.6;
    g.add(beam, head, ring, hit);
    const div = document.createElement('div');
    div.className = 'mlabel'; div.style.setProperty('--c', color);
    div.innerHTML = `<span class="dot"></span>${label}`;
    const lab = new CSS2DObject(div); lab.position.y = beamH * 1.15; lab.center.set(-0.04, 0.5);
    g.add(lab);
    parentSpin.add(g);
    const m = { group: g, hit, ringMat, label: lab, div, normalLocal: n, data, head, beam, color };
    hit.userData.marker = m;
    return m;
  }

  addSiteMarkers(sites, onClick) {
    for (const s of sites) {
      const color = s.status === 'new' ? '#FFB547' : '#36D6E7';
      const m = this._makeMarker(this.earthMesh, this.earthR, s.lat, s.lon, color, s.name, s);
      this.markers.push(m);
      m.div.addEventListener('click', e => { e.stopPropagation(); onClick(s); });
    }
    this.onMarkerClick = onClick;
  }

  addTargetMarkers(targets, onClick) {
    for (const t of Object.values(targets)) {
      const mesh = t.world === 'moon' ? this.moonMesh : this.marsMesh;
      const r = t.world === 'moon' ? this.moonR : this.marsR;
      const m = this._makeMarker(mesh, r * 1.004, t.lat, t.lon, t.world === 'moon' ? '#DCE6F5' : '#FF8A5C', t.short, t, 1.0);
      m.isTarget = true;
      this.targetMarkers.push(m);
      m.div.addEventListener('click', e => { e.stopPropagation(); onClick && onClick(t); });
    }
  }

  allMarkers() { return [...this.markers, ...this.targetMarkers, ...this.extraMarkers]; }
  addExtraMarker(body, lat, lon, color, label, data) {
    const mesh = { earth: this.earthMesh, moon: this.moonMesh, mars: this.marsMesh }[body];
    const m = this._makeMarker(mesh, this.bodyR(body), lat, lon, color, label, data);
    this.extraMarkers.push(m); return m;
  }
  setMarkerFilter(fn) {
    for (const m of this.markers) {
      const on = fn(m.data);
      m.group.visible = on; m.filteredOut = !on;
    }
  }
  highlight(id) {
    for (const m of this.allMarkers()) {
      const sel = m.data.id === id;
      m.div.classList.toggle('sel', sel);
      m.head.scale.setScalar(sel ? 1.8 : 1);
    }
  }
  showLabels(v) { this.labelsOn = v; }

  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const p = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(p, this.camera);
    const hits = this.raycaster.intersectObjects(this.allMarkers().filter(m => m.group.visible).map(m => m.hit), false);
    if (hits.length) return hits[0].object.userData.marker;
    const bodies = this.raycaster.intersectObjects([this.earthMesh, this.moonMesh, this.marsMesh], false);
    return bodies.length ? { body: bodies[0].object.userData.body } : null;
  }

  /* ------------------- planetin Günəşə çevrilməsi ------------------- */
  // Hədəf nöqtə gündüz tərəfdə görünsün deyə planeti öz oxu ətrafında fırladır
  faceSun(body, lat, lon, viewDir = null, instant = false) {
    const spin = this.spin(body), parent = spin.parent;
    parent.updateWorldMatrix(true, false);
    const vd = viewDir ? viewDir.clone().normalize() : new THREE.Vector3(0, 0, 1);
    const desired = this.sunDir.clone().add(vd.multiplyScalar(0.75)).normalize();
    const dLocal = desired.applyQuaternion(parent.getWorldQuaternion(new THREE.Quaternion()).invert());
    const v = latLonToVec(lat, lon, 1);
    let target = Math.atan2(dLocal.x, dLocal.z) - Math.atan2(v.x, v.z);
    const cur = spin.rotation.y;
    while (target - cur > Math.PI) target -= Math.PI * 2;
    while (target - cur < -Math.PI) target += Math.PI * 2;
    if (instant) { spin.rotation.y = target; delete this.spinTweens[body]; }
    else this.spinTweens[body] = { from: cur, to: target, t0: this.time, dur: 2.2 };
    return target;
  }

  // Sahə mövsümü: cənub ərazisi seçiləndə cənub yarımkürəsinin yayı göstərilir (Antarktida işıqlı olur)
  setSeason(lat, forFlight = false) {
    const target = THREE.MathUtils.degToRad(lat < -40 ? 23.44 : -23.44);
    const cur = this.tiltTween ? this.tiltTween.to : this.earthTilt.rotation.z;
    if (Math.abs(target - cur) < 1e-3) return;
    const now = this.earthTilt.rotation.z;
    this.tiltTween = { from: now, to: target, t0: this.time, dur: 2.4 };
    if (forFlight) {
      this.earthTilt.rotation.z = target;  // istiqamət hesabları üçün son vəziyyət
      this.earthTilt.updateMatrixWorld(true);
      this._tiltRestore = now;
    }
  }

  /* --------------------------- camera --------------------------- */
  worldOfLatLon(body, lat, lon) {
    const mesh = { earth: this.earthMesh, moon: this.moonMesh, mars: this.marsMesh }[body];
    mesh.updateWorldMatrix(true, false);
    const local = latLonToVec(lat, lon, this.bodyR(body));
    return mesh.localToWorld(local.clone());
  }

  // body ətrafında verilən istiqamətdən baxış
  flyTo({ body, dir, dist, lat, lon, dur = 2.8, follow = true, offset = null, shiftX = 0, shiftY = 0, then }) {
    const center = this.body(body).position.clone();
    const L = LAYOUTS[this.layout];
    if (this.layoutTween && this.time - this.layoutTween.t0 < this.layoutTween.dur) center.set(...L[body]);
    let d;
    if (lat !== undefined) {
      const mesh = { earth: this.earthMesh, moon: this.moonMesh, mars: this.marsMesh }[body];
      const spin = this.spin(body);
      const cur = spin.rotation.y;
      if (body === 'earth') this.setSeason(lat, true);
      const fin = this.faceSun(body, lat, lon, this.camera.position.clone().sub(center));
      spin.rotation.y = fin;                       // son vəziyyətə görə istiqaməti hesabla
      mesh.updateWorldMatrix(true, false);
      const wp = mesh.localToWorld(latLonToVec(lat, lon, 1));
      d = wp.sub(mesh.getWorldPosition(new THREE.Vector3())).normalize();
      spin.rotation.y = cur;
      if (this._tiltRestore !== undefined) { this.earthTilt.rotation.z = this._tiltRestore; this._tiltRestore = undefined; }
      mesh.updateWorldMatrix(true, false);
      if (offset) d.add(new THREE.Vector3(...offset)).normalize();
    } else {
      d = new THREE.Vector3(...dir).normalize();
    }
    // yuxarıdan düz baxmamaq üçün (kamera "up" vektoru ilə paralel olmasın) bucağı məhdudlaşdır
    const maxY = 0.72;
    if (Math.abs(d.y) > maxY) {
      const h = Math.hypot(d.x, d.z);
      const ny = Math.sign(d.y) * maxY, nh = Math.sqrt(1 - ny * ny);
      if (h < 1e-4) d.set(0, ny, nh); else d.set((d.x / h) * nh, ny, (d.z / h) * nh);
    }
    const R = this.bodyR(body);
    const toTarget = center.clone();
    if (shiftY) toTarget.y += shiftY * R;
    if (shiftX) toTarget.add(new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), d).normalize().multiplyScalar(shiftX * R));
    const toPos = toTarget.clone().add(d.clone().multiplyScalar(dist * R));
    this.follow = null;
    this.flight = {
      t0: this.time, dur, fromPos: this.camera.position.clone(), fromTarget: this.controls.target.clone(),
      toPos, toTarget, body, then,
      followSpec: follow && lat !== undefined ? { body, lat, lon, dist: dist * R, offset } : null,
    };
    this.controls.enabled = false;
    this.controls.minDistance = R * 1.15;
    this.controls.maxDistance = 60;
  }

  flyFree(pos, target, dur = 3.0) {
    this.follow = null;
    this.flight = { t0: this.time, dur, fromPos: this.camera.position.clone(), fromTarget: this.controls.target.clone(),
      toPos: new THREE.Vector3(...pos), toTarget: new THREE.Vector3(...target) };
    this.controls.enabled = false;
    this.controls.minDistance = 0.5; this.controls.maxDistance = 60;
  }

  _updateFlight() {
    const f = this.flight; if (!f) return;
    const t = Math.min(1, (this.time - f.t0) / f.dur), k = ease(t);
    // hədəfə nisbətən sferik interpolyasiya — kamera planetin içindən keçmir
    const target = f.fromTarget.clone().lerp(f.toTarget, k);
    const a = f.fromPos.clone().sub(f.fromTarget), b = f.toPos.clone().sub(f.toTarget);
    const la = a.length(), lb = b.length();
    const qa = a.clone().normalize(), qb = b.clone().normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(qa, qb);
    const qi = new THREE.Quaternion().slerp(q, k);
    const dir = qa.clone().applyQuaternion(qi);
    const len = THREE.MathUtils.lerp(la, lb, k) * (1 + Math.sin(Math.PI * k) * 0.12);
    this.camera.position.copy(target).add(dir.multiplyScalar(len));
    this.controls.target.copy(target);
    if (t >= 1) {
      this.flight = null;
      this.controls.enabled = !(this.altScene && this.altScene.active);
      if (f.then) f.then();
    }
  }

  /* ---------------------------- twin ---------------------------- */
  setTwin(spec) {
    // spec: { left:{body,lat,lon,dist}, right:{...} } | null
    const sc = spec ? 0.45 : 1;
    for (const m of this.allMarkers()) m.group.scale.setScalar(sc);
    if (!spec) { this.twin = null; return; }
    this.faceSun(spec.left.body, spec.left.lat, spec.left.lon, new THREE.Vector3(0.3, 0.2, 1));
    if (spec.right.body !== spec.left.body) this.faceSun(spec.right.body, spec.right.lat, spec.right.lon, new THREE.Vector3(0.3, 0.2, 1));
    const mk = () => new THREE.PerspectiveCamera(30, 1, 0.003, 2000);
    this.twin = { spec, camL: this.twin?.camL || mk(), camR: this.twin?.camR || mk(), t0: this.time };
  }
  _twinCam(cam, s, aspect, t) {
    const mesh = { earth: this.earthMesh, moon: this.moonMesh, mars: this.marsMesh }[s.body];
    mesh.updateWorldMatrix(true, false);
    const c = mesh.getWorldPosition(new THREE.Vector3());
    const p = mesh.localToWorld(latLonToVec(s.lat, s.lon, 1)).sub(c).normalize();
    const R = this.bodyR(s.body);
    // yavaş orbit hərəkəti
    const up = new THREE.Vector3(0, 1, 0);
    const side = new THREE.Vector3().crossVectors(up, p).normalize();
    if (side.lengthSq() < 0.01) side.set(1, 0, 0);
    const wob = Math.sin(t * 0.25) * 0.18;
    const dir = p.clone().add(side.multiplyScalar(wob)).add(up.clone().multiplyScalar(s.lat < -60 ? -0.25 : 0.12)).normalize();
    if (Math.abs(dir.y) > 0.8) dir.add(new THREE.Vector3(0.1, 0, 0.62)).normalize(); // qütb üzərində dejenerasiyanın qarşısı
    const intro = Math.min(1, (this.time - this.twin.t0) / 2.5);
    const dist = R * THREE.MathUtils.lerp(s.dist * 3.2, s.dist, ease(intro));
    cam.position.copy(c).add(dir.multiplyScalar(dist));
    cam.up.set(0, 1, 0);
    cam.lookAt(c.clone().add(p.clone().multiplyScalar(R)));
    // hədəf nöqtəni ekranın yuxarı hissəsinə sürüşdür (aşağıda panel var)
    const vh = 1000, vw = Math.round(vh * aspect);
    cam.aspect = vw / (vh * 1.45);
    cam.setViewOffset(vw, vh * 1.45, 0, vh * 0.45, vw, vh);
    cam.updateProjectionMatrix();
  }

  /* -------------------------- quality --------------------------- */
  setQuality(q) {
    this.quality = q;
    this.resize();
    this._swapHiRes(q === 'ultra');
  }
  // Ultra: 16K (16384×8192) NASA teksturları; digər rejimlər: 8K
  _swapHiRes(on) {
    if (on && !this.hiRes) {
      const L = new THREE.TextureLoader();
      const load = (name, cb) => L.load(TEX + name, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = this.maxAniso; cb(t); });
      this.hiRes = {};
      load('earth_day_16k.jpg', t => { this.hiRes.earth = t; this.earthDay8 = this.earthDay8 || this.earthUniforms.dayMap.value; if (this.quality === 'ultra') this.earthUniforms.dayMap.value = t; });
      load('moon_color_16k.jpg', t => { this.hiRes.moon = t; if (this.quality === 'ultra' && this.moonMat.map === this.moonColor) { this.moonMat.map = t; this.moonMat.needsUpdate = true; } this.moonColor8 = this.moonColor; this.moonColor = t; });
      load('mars_color_16k.jpg', t => { this.hiRes.mars = t; if (this.quality === 'ultra' && this.marsMat.map === this.marsColor) { this.marsMat.map = t; this.marsMat.needsUpdate = true; } this.marsColor8 = this.marsColor; this.marsColor = t; });
    } else if (!on && this.hiRes) {
      if (this.earthDay8) this.earthUniforms.dayMap.value = this.earthDay8;
      if (this.moonColor8) { if (this.moonMat.map === this.moonColor) { this.moonMat.map = this.moonColor8; this.moonMat.needsUpdate = true; } this.moonColor = this.moonColor8; }
      if (this.marsColor8) { if (this.marsMat.map === this.marsColor) { this.marsMat.map = this.marsColor8; this.marsMat.needsUpdate = true; } this.marsColor = this.marsColor8; }
      for (const t of Object.values(this.hiRes)) t.dispose();
      this.hiRes = null;
    }
  }
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const scale = { ultra: Math.min(dpr * 1.5, 3), high: Math.min(dpr, 2), medium: Math.min(dpr, 1) * 0.75 }[this.quality];
    this.pixelRatio = scale;
    this.renderer.setPixelRatio(scale);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(scale);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w * scale * 0.5, h * scale * 0.5);
    this.labels.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.size = { w, h };
    if (this.altScene) this.altScene.resize(w, h);
  }

  /* --------------------------- loop ----------------------------- */
  start(onFrame) {
    const loop = () => {
      requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.time += dt;
      this.frame(dt);
      onFrame && onFrame(dt);
    };
    loop();
  }

  frame(dt) {
    // planet düzülüşü animasiyası
    const lt = this.layoutTween;
    if (lt) {
      const k = ease(Math.min(1, (this.time - lt.t0) / lt.dur));
      for (const b of ['earth', 'moon', 'mars']) this.body(b).position.lerpVectors(lt.from[b], lt.to[b], k);
    }
    // fırlanma (vizual sürət; real deyil)
    if (this.tiltTween) {
      const k = ease(Math.min(1, (this.time - this.tiltTween.t0) / this.tiltTween.dur));
      this.earthTilt.rotation.z = this.tiltTween.from + (this.tiltTween.to - this.tiltTween.from) * k;
      if (k >= 1) this.tiltTween = null;
    }
    for (const u of this.updaters) u(dt);
    for (const [b, tw] of Object.entries(this.spinTweens)) {
      const k = ease(Math.min(1, (this.time - tw.t0) / tw.dur));
      this.spin(b).rotation.y = tw.from + (tw.to - tw.from) * k;
      if (k >= 1) delete this.spinTweens[b];
    }
    if (this.autoRotate) {
      this.earthSpin.rotation.y += dt * 0.035;
      this.moonSpin.rotation.y += dt * 0.012;
      this.marsSpin.rotation.y += dt * 0.03;
    }
    this.sky.rotation.y += dt * 0.0012;
    this.earthUniforms.poleAxis.value.set(0, 1, 0).transformDirection(this.earthSpin.matrixWorld);
    for (const m of this.allMarkers()) m.ringMat.uniforms.time.value = this.time;
    this._updateFlight();
    if (!this.flight) this.controls.update();

    if (this.altScene && this.altScene.active) {
      this.altScene.render(this.renderer, dt);
      this.labels.domElement.style.display = 'none';
      return;
    }
    // etiketlərin görünməsi: arxa tərəfdə olanları gizlət
    const camPos = this.camera.position;
    const tmp = new THREE.Vector3(), nW = new THREE.Vector3();
    for (const m of this.allMarkers()) {
      if (!m.group.visible) { m.label.visible = false; continue; }
      m.group.getWorldPosition(tmp);
      nW.copy(m.normalLocal).transformDirection(m.group.parent.matrixWorld);
      const toCam = camPos.clone().sub(tmp).normalize();
      const facing = nW.dot(toCam);
      const dist = camPos.distanceTo(tmp);
      const showFar = m.isTarget ? dist < 4.5 : dist < 3.6;
      m.label.visible = !m.hideLabel && this.labelsOn !== false && !this.twin && facing > 0.12 && showFar;
      m.div.style.opacity = Math.min(1, (facing - 0.12) * 5).toFixed(2);
    }

    if (this.twin) {
      const { w, h } = this.size;
      const r = this.renderer;
      r.setScissorTest(true);
      const half = Math.floor(w / 2);
      this._twinCam(this.twin.camL, this.twin.spec.left, half / h, this.time);
      this._twinCam(this.twin.camR, this.twin.spec.right, (w - half) / h, this.time + 3);
      r.setViewport(0, 0, half, h); r.setScissor(0, 0, half, h); r.render(this.scene, this.twin.camL);
      r.setViewport(half, 0, w - half, h); r.setScissor(half, 0, w - half, h); r.render(this.scene, this.twin.camR);
      r.setScissorTest(false);
      r.setViewport(0, 0, w, h);
      this.labels.domElement.style.display = 'none';
      return;
    }
    this.labels.domElement.style.display = '';
    this.composer.render(dt);
    this.labels.render(this.scene, this.camera);
  }
}
