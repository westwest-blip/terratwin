import * as THREE from 'three';
import { Engine } from './scene.js';
import { CraterLab, CRATERS } from './craters.js';
import { SITES, TARGETS, CRITERIA, WORLDS, GENERAL_SOURCES, DATASETS } from './data.js';
import { PHOTOS, BODY_INFO, PAIRS, HISTORY, DEBRIS } from './data2.js';
import { computeACI, rankSites, climateScore } from './aci.js';
import { ring } from './charts.js';
import { OrbitCloud, TwinArcs, moonRing } from './extras.js';

const POWER = window.POWER || null;
const ORBITS = window.ORBITS || null;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (v, d = 0) => (v === null || v === undefined || Number.isNaN(v) ? '—' : Number(v).toFixed(d).replace('.', ','));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/* ---------------- WebGL ---------------- */
function hasWebGL() { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } }
if (!hasWebGL()) { $('#nogl').hidden = false; $('#loader').classList.add('done'); throw new Error('WebGL2 yoxdur'); }

/* ---------------- vəziyyət ---------------- */
const DEFAULT_W = Object.fromEntries(CRITERIA.map(c => [c.id, c.w]));
const state = { sec: -1, site: SITES[0], target: 'mars_jezero', tgTab: 'moon_sp', weights: { ...DEFAULT_W }, elev: false, debris: false, body: null, hist: 0 };
const siteById = id => SITES.find(s => s.id === id);
const aci = (s, t) => computeACI(s, t, state.weights, POWER);

/* ---------------- 3D ---------------- */
const canvas = $('#gl');
const engine = new Engine(canvas, $('#labels'), (p, url) => {
  $('#ldBar').style.width = (p * 100).toFixed(0) + '%';
  if (url) $('#ldFile').textContent = url.split('/').pop();
});
const lab = new CraterLab($('#craterLabels'));
engine.altScene = lab;
lab.resize(engine.size.w, engine.size.h);
engine.addSiteMarkers(SITES, s => onSiteClick(s));
engine.addTargetMarkers(TARGETS, t => { if (curId() === 'targets') selectTarget(t.id); });
engine.showLabels(false);

// tarixçə nöqtələri
const histMarkers = HISTORY.map((h, i) => {
  const m = engine.addExtraMarker(h.body || 'earth', h.lat, h.lon, h.ours ? '#e4b653' : '#ece8e1', `${h.year}: ${h.place}`, { id: 'h' + i });
  m.group.visible = false; m.hideLabel = true;
  m.div.addEventListener('click', e => { e.stopPropagation(); selectEvent(i); });
  return m;
});

// orbitdəki obyektlər (CelesTrak)
const orbitCloud = ORBITS ? new OrbitCloud(ORBITS, engine.earthTilt) : null;
// əkiz qövsləri: hər ərazi ən uyğun hədəfi ilə
const arcs = new TwinArcs(engine);
const arcPairs = SITES.map(s => {
  const pair = PAIRS.find(p => p.site === s.id);
  const best = pair ? pair.target : Object.keys(TARGETS).map(t => ({ t, a: aci(s, t).aci ?? 0 })).sort((a, b) => b.a - a.a)[0].t;
  const T = TARGETS[best];
  return { id: s.id, site: s, body: T.world, target: T, color: T.world === 'moon' ? 0xc9ccd3 : 0xe08a58 };
});
arcs.build(arcPairs);
const ringMoon = moonRing(engine);
engine.updaters.push(dt => {
  if (orbitCloud) orbitCloud.update(dt, engine.pixelRatio);
  arcs.update(dt, engine.size.w * engine.pixelRatio, engine.size.h * engine.pixelRatio);
  ringMoon.update(dt);
});

/* ---------------- naviqasiya ---------------- */
const sections = $$('.sec');
const curId = () => sections[state.sec]?.dataset.sec;

let loaded = false;
const finishLoad = () => {
  if (loaded) return; loaded = true;
  $('#loader').classList.add('done');
  const idx = sections.findIndex(s => s.dataset.sec === location.hash.slice(1));
  go(idx >= 0 ? idx : 0, true);
};
engine.manager.onLoad = finishLoad;
setTimeout(() => { if (!loaded) finishLoad(); }, 30000);

// 2K/4K ekranda avtomatik Ultra (16K teksturlar)
if (window.screen.width * (window.devicePixelRatio || 1) >= 2560) { $('#quality').value = 'ultra'; engine.setQuality('ultra'); }

/* ---------------- yarımdairəvi naviqasiya ---------------- */
const dialEl = $('#dial'), dialItems = $('#dialItems');
sections.forEach((s, i) => {
  const b = document.createElement('button');
  b.textContent = i + 1; b.title = s.dataset.title; b.setAttribute('aria-label', `${i + 1}. ${s.dataset.title}`);
  b.onclick = () => go(i);
  dialItems.appendChild(b);
});
const dial = { pos: 0, target: 0, titleT: 0 };
let dialGeo = null;
function dialLayout() {
  const W = dialEl.clientWidth, H = dialEl.clientHeight;
  const R = Math.min(H * 0.42, 380);
  const cx = Math.min(70, W * 0.55) + R, cy = H / 2;
  const c = $('#dialCircle');
  c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', R);
  return { R, cx, cy };
}
function dialTick(dt) {
  if (!dialGeo) dialGeo = dialLayout();
  dial.pos += (dial.target - dial.pos) * Math.min(1, dt * 4.5);
  const { R, cx, cy } = dialGeo, step = 0.3;
  $$('button', dialItems).forEach((b, i) => {
    const a = Math.PI - (i - dial.pos) * step;
    const off = Math.abs(i - dial.pos) * step;
    b.style.transform = `translate(${(cx + R * Math.cos(a)).toFixed(1)}px, ${(cy + R * Math.sin(a)).toFixed(1)}px)`;
    b.style.opacity = Math.max(0, 1 - Math.max(0, off - 1.0) * 1.6).toFixed(2);
  });
  dial.titleT -= dt;
  $('#dialTitle').style.opacity = dial.titleT > 0 || dialEl.matches(':hover') ? 1 : 0;
}
window.addEventListener('resize', () => { dialGeo = dialLayout(); });

let fAcc = 0, fN = 0;
engine.start(dt => {
  fAcc += dt; fN++;
  if (fAcc > 0.5) { $('#fps').textContent = Math.round(fN / fAcc) + ' fps'; fAcc = 0; fN = 0; }
  dialTick(dt);
});

/* ---------------- slayd keçidi ---------------- */
const SCRIMS = { intro: [1, 0], twins: [1, 0], history: [1, 0], targets: [1, 1], analogs: [1, 1], compare: [0, 0], scale: [1, 0], final: [1, 0] };
function setScrims(id) {
  const [l, r] = SCRIMS[id] || [0, 0];
  $('#scrimL').classList.toggle('on', !!l);
  $('#scrimR').classList.toggle('on', !!r || (id === 'intro' && !!state.body));
}
function go(i, force = false) {
  i = Math.max(0, Math.min(sections.length - 1, i));
  if (i === state.sec && !force) return;
  const prevEl = sections[state.sec], prev = curId();
  if (prevEl && prevEl !== sections[i]) {
    prevEl.classList.remove('on'); prevEl.classList.add('leaving');
    setTimeout(() => prevEl.classList.remove('leaving'), 500);
  }
  state.sec = i;
  sections[i].classList.add('on');
  $$('button', dialItems).forEach((b, k) => b.classList.toggle('on', k === i));
  dial.target = i; dial.titleT = 2.4;
  $('#dialTitle').innerHTML = `<b>${sections[i].dataset.title}</b>${i + 1} / ${sections.length}`;
  history.replaceState(null, '', '#' + curId());
  if (prev === 'scale' && curId() !== 'scale') { lab.detach(); engine.controls.enabled = true; }
  if (prev === 'compare' && curId() !== 'compare') engine.setTwin(null);
  if (prev === 'intro' && curId() !== 'intro') closeBody(false);
  closeOverlays();
  arcs.setVisible(curId() === 'twins');
  ringMoon.target = curId() === 'intro' ? 1 : 0;
  histMarkers.forEach(m => { m.group.visible = curId() === 'history'; });
  engine.markers.forEach(m => { m.group.visible = curId() !== 'history'; });
  engine.targetMarkers.forEach(m => { m.hideLabel = curId() === 'history'; });
  setScrims(curId());
  enter[curId()]();
}
$$('[data-go]').forEach(b => b.addEventListener('click', () => go(sections.findIndex(s => s.dataset.sec === b.dataset.go))));

const HERO_CAM = [[-0.35, 0.5, 6.2], [-0.85, 0.05, 0]];
const enter = {
  intro() {
    engine.setLayout('hero'); engine.autoRotate = !state.body; engine.showLabels(false);
    engine.highlight(null);
    if (!state.body) engine.flyFree(...HERO_CAM, 3.2);
  },
  twins() {
    engine.setLayout('twins'); engine.autoRotate = false; engine.showLabels(false);
    engine.setSeason(30);
    engine.faceSun('earth', 25, -40, new THREE.Vector3(-0.2, 0.2, 1));
    engine.flyFree([0.55, 0.85, 6.4], [0.45, -0.05, -0.4], 3.2);
    renderTypes();
  },
  history() {
    engine.setLayout('history'); engine.autoRotate = false; engine.showLabels(true);
    renderTimeline(); selectEvent(state.hist, true);
  },
  targets() {
    engine.setLayout('hero'); engine.autoRotate = false; engine.showLabels(true);
    selectTarget(state.tgTab);
  },
  analogs() {
    engine.setLayout('hero'); engine.autoRotate = false; engine.showLabels(true);
    renderAnalogs(); flyToSite(state.site, 2.7);
  },
  compare() { engine.autoRotate = false; renderCompare(); },
  scale() { engine.setTwin(null); engine.controls.enabled = false; lab.attach(canvas); renderSizes(); },
  final() {
    engine.setLayout('hero'); engine.autoRotate = true; engine.showLabels(false);
    engine.flyFree([-1.9, 0.5, 7.6], [-2.05, -0.1, 0], 3.2);
  },
};
function flyToSite(s, dist, shiftX = 0) {
  engine.highlight(s.id);
  engine.flyTo({ body: 'earth', lat: s.lat, lon: s.lon, dist, shiftX, offset: s.lat < -60 ? [0, -0.25, 0.5] : s.lat > 60 ? [0, 0.25, 0.4] : null });
}

/* ---------------- klaviatura və alətlər ---------------- */
window.addEventListener('keydown', e => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (!$('#pairView').hidden || !$('#sourcesView').hidden) { if (e.key === 'Escape') closeOverlays(); return; }
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); go(state.sec + 1); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); go(state.sec - 1); }
  else if (e.key === 'Home') go(0);
  else if (e.key === 'End') go(sections.length - 1);
  else if (e.key.toLowerCase() === 'f') toggleFull();
  else if (e.key.toLowerCase() === 'p') togglePresent();
  else if (e.key.toLowerCase() === 'l') toggleLayer();
  else if (e.key.toLowerCase() === 'o') toggleDebris();
  else if (e.key === 'Escape') { if (state.body) closeBody(); else if (document.body.classList.contains('present')) togglePresent(); }
});
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2800); }
function toggleFull() { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {}); else document.exitFullscreen?.(); }
function togglePresent() {
  const on = document.body.classList.toggle('present');
  $('#btnPresent').classList.toggle('on', on);
  if (on) { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {}); toast('Təqdimat rejimi: ox düymələri ilə keçin, Esc ilə çıxın'); }
  else if (document.fullscreenElement) document.exitFullscreen?.();
}
function toggleLayer() {
  state.elev = !state.elev;
  engine.setElevationLayer(state.elev);
  $('#btnLayer').setAttribute('aria-pressed', state.elev);
  toast(state.elev ? 'Hündürlük xəritəsi: Yer — GEBCO, Ay — LRO LOLA, Mars — MGS MOLA' : 'Real rəngli görüntü');
}
function toggleDebris() {
  if (!orbitCloud) { toast('Orbit məlumatı tapılmadı'); return; }
  state.debris = !state.debris;
  orbitCloud.setVisible(state.debris);
  $('#btnDebris').setAttribute('aria-pressed', state.debris);
  $('#debrisBox').hidden = !state.debris;
  if (state.debris && curId() !== 'intro') toast(`Orbitdə: ${nf(orbitCloud.counts.sat)} işləyən peyk, ${nf(orbitCloud.counts.deb)} qırıntı (CelesTrak)`);
}
$('#btnFull').onclick = toggleFull;
$('#btnPresent').onclick = togglePresent;
$('#btnLayer').onclick = toggleLayer;
$('#btnDebris').onclick = toggleDebris;
$('#quality').onchange = e => { engine.setQuality(e.target.value); toast(e.target.value === 'ultra' ? 'Ultra: 16K NASA teksturları yüklənir' : 'Keyfiyyət dəyişdi'); };
document.addEventListener('fullscreenchange', () => setTimeout(() => { engine.resize(); dialGeo = dialLayout(); }, 200));

if (ORBITS && orbitCloud) {
  $('#debrisLive').innerHTML = `Ekranda <b>${nf(orbitCloud.counts.sat)}</b> işləyən peyk (mavi) və dörd qəza və sınaqdan qalan <b>${nf(orbitCloud.counts.deb)}</b> qırıntı (narıncı) var. Orbitlər realdır, hərəkət 60 dəfə sürətləndirilib.`;
  $('#debrisFacts').innerHTML = DEBRIS.facts.map(f => `<li><b>${f[0]}</b> ${f[1]}</li>`).join('');
  $('#debrisSrc').innerHTML = `Mənbə: <a href="${DEBRIS.url}" target="_blank" rel="noopener">${DEBRIS.src}</a>. Orbitlər: CelesTrak, ${ORBITS.accessed}, ABŞ Kosmik Qüvvələrinin kataloqu əsasında.`;
}

/* ---------------- klik: planet və nöqtələr ---------------- */
let down = null;
canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
  const id = curId();
  if (id === 'scale' || id === 'compare') return;
  const hit = engine.pick(e.clientX, e.clientY);
  if (!hit) return;
  if (hit.data) {
    if (hit.isTarget) { if (id === 'targets') selectTarget(hit.data.id); else if (id === 'intro') openBody(hit.data.world); }
    else if (String(hit.data.id).startsWith('h')) selectEvent(+hit.data.id.slice(1));
    else onSiteClick(hit.data);
  } else if (hit.body && id === 'intro') openBody(hit.body);
});
function onSiteClick(s) {
  state.site = s;
  if (curId() === 'analogs') { renderAnalogs(); flyToSite(s, 2.7); }
  else if (curId() === 'compare') renderCompare();
  else go(sections.findIndex(x => x.dataset.sec === 'analogs'));
}

/* ---------------- 1. planet paneli ---------------- */
const bodyPanel = $('#bodyPanel');
bodyPanel.hidden = false;
function openBody(b) {
  state.body = b;
  const I = BODY_INFO[b], P = PHOTOS[I.photo];
  bodyPanel.innerHTML = `
    <h2>${I.name}</h2>
    <p class="lead">${esc(I.lead)}</p>
    <figure class="photo"><img src="${P.file}" alt="${esc(P.title)}"><figcaption>${esc(P.title)}. ${esc(P.credit)}. <a href="${P.url}" target="_blank" rel="noopener">Mənbə</a></figcaption></figure>
    <dl class="facts">${I.facts.map(f => `<dt>${f[0]}</dt><dd>${f[1]}</dd>`).join('')}</dl>
    <p>${esc(I.role)}</p>
    <div class="cta"><button class="btn primary" id="bodyGo">${I.goLabel}</button><button class="btn" id="bodyBack">Geri</button></div>
    <p class="src">Rəqəmlər: NASA NSSDC Planetary Fact Sheets.</p>`;
  bodyPanel.classList.add('show');
  $('[data-sec=intro]').classList.add('body-open');
  bodyPanel.scrollTop = 0;
  setScrims('intro');
  $('#bodyBack').onclick = () => closeBody();
  $('#bodyGo').onclick = () => {
    if (b === 'moon') state.tgTab = 'moon_sp';
    if (b === 'mars') state.tgTab = 'mars_gale';
    go(sections.findIndex(s => s.dataset.sec === I.go));
  };
  engine.autoRotate = false;
  const center = new THREE.Vector3(...({ earth: [0, 0, 0], moon: [2.15, 0.75, -1.9], mars: [9.5, -3.0, -26] })[b]);
  const camDir = engine.camera.position.clone().sub(center).normalize();
  const dir = engine.sunDir.clone().multiplyScalar(0.9).add(camDir).normalize();
  const dist = { earth: 3.0, moon: 3.6, mars: 3.3 }[b];
  engine.flyTo({ body: b, dir: dir.toArray(), dist, shiftX: 0.85, dur: b === 'mars' ? 4 : 3 });
}
function closeBody(fly = true) {
  if (!state.body) return;
  state.body = null;
  bodyPanel.classList.remove('show');
  $('[data-sec=intro]').classList.remove('body-open');
  setScrims(curId());
  if (fly && curId() === 'intro') { engine.autoRotate = true; engine.flyFree(...HERO_CAM, 3.2); }
}

/* ---------------- 2. əkizlər ---------------- */
function renderTypes() {
  $('#typeList').innerHTML = PAIRS.map(p => {
    const s = siteById(p.site);
    return `<button class="type" data-id="${p.id}" data-world="${p.world}"><b>${p.type}</b><span>${esc(s.name)} ↔ ${p.world === 'moon' ? 'Ay' : 'Mars'}</span><i>Fotolara bax</i></button>`;
  }).join('');
  $$('#typeList .type').forEach(b => {
    b.onclick = () => openPair(b.dataset.id);
    b.onmouseenter = () => arcs.emphasize([PAIRS.find(p => p.id === b.dataset.id).site]);
    b.onmouseleave = () => { if ($('#pairView').hidden) arcs.emphasize(null); };
  });
}
function openPair(id) {
  const p = PAIRS.find(x => x.id === id);
  arcs.emphasize([p.site]);
  const wn = p.world === 'moon' ? 'Ay' : 'Mars';
  $('#pairTitle').textContent = `${p.type}: ${p.earth.name} və ${wn}`;
  $('#pairA').src = p.earth.img; $('#pairB').src = p.other.img;
  $('#pairA').alt = p.earth.name; $('#pairB').alt = p.other.name;
  $('#pairCapA').innerHTML = `Yer: ${esc(p.earth.name)}<small>${esc(p.earth.credit)}</small>`;
  $('#pairCapB').innerHTML = `${wn}: ${esc(p.other.name)}<small>${esc(p.other.credit)}</small>`;
  $('#pairSame').textContent = p.same; $('#pairDiff').textContent = p.diff; $('#pairWhy').textContent = p.why;
  $('#pairCredits').innerHTML = `Fotolar: <a href="${p.earth.url}" target="_blank" rel="noopener">${esc(p.earth.credit)}</a>; <a href="${p.other.url}" target="_blank" rel="noopener">${esc(p.other.credit)}</a>. Ortadakı xətti sağa-sola çəkin.`;
  setSplit(50);
  showOverlay('#pairView');
  const t0 = performance.now();
  const anim = now => { const k = Math.min(1, (now - t0) / 1800); setSplit(50 + Math.sin(k * Math.PI * 2) * 24 * (1 - k)); if (k < 1 && !$('#pairView').hidden && !pairDrag) requestAnimationFrame(anim); };
  setTimeout(() => requestAnimationFrame(anim), 400);
}
function setSplit(pct) {
  $('#pairClip').style.clipPath = `inset(0 0 0 ${pct}%)`;
  $('#pairHandle').style.left = pct + '%';
}
let pairDrag = false;
{
  const box = $('#pairImg');
  const move = e => { const r = box.getBoundingClientRect(); setSplit(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))); };
  box.addEventListener('pointerdown', e => { pairDrag = true; box.setPointerCapture(e.pointerId); move(e); });
  box.addEventListener('pointermove', e => { if (pairDrag) move(e); });
  box.addEventListener('pointerup', () => { pairDrag = false; });
}
function showOverlay(sel) { const o = $(sel); o.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => o.classList.add('show'))); }
function closeOverlays() {
  $$('.overlay').forEach(o => { if (o.hidden) return; o.classList.remove('show'); setTimeout(() => { o.hidden = true; }, 450); });
  arcs.emphasize(null);
}
$('#pairClose').onclick = closeOverlays;
$$('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o || e.target.matches('[data-close]')) closeOverlays(); }));

/* ---------------- 3. tarix ---------------- */
function renderTimeline() {
  const tl = $('#timeline');
  const n = HISTORY.length;
  tl.innerHTML = `<div class="fill"></div>` + HISTORY.map((h, i) => `<button data-i="${i}" class="${h.ours ? 'ours' : ''}" style="left:${(i / (n - 1)) * 100}%">${h.year}</button>`).join('');
  $$('button', tl).forEach(b => b.onclick = () => selectEvent(+b.dataset.i));
}
function selectEvent(i, first = false) {
  state.hist = i;
  const h = HISTORY[i];
  const card = $('#eventCard');
  card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
  card.innerHTML = `<p class="yr ${h.ours ? 'ours' : ''}">${h.year}</p><p class="pl">${esc(h.place)}</p><p class="tx">${esc(h.text)}</p><p class="src">Mənbə: ${esc(h.src)}</p>`;
  $$('#timeline button').forEach((b, k) => { b.classList.toggle('on', k === i); b.classList.toggle('done', k < i); });
  const fill = $('#timeline .fill'); if (fill) fill.style.width = (i / (HISTORY.length - 1)) * 100 + '%';
  histMarkers.forEach((m, k) => { m.hideLabel = k !== i; m.div.classList.toggle('sel', k === i); });
  if (h.body === 'moon') engine.flyTo({ body: 'moon', lat: h.lat, lon: h.lon, dist: 3.8, offset: [-0.35, 0, 0.55], shiftX: -0.5, shiftY: -0.55, dur: 3.2 });
  else engine.flyTo({ body: 'earth', lat: h.lat, lon: h.lon, dist: 3.0, shiftX: -0.4, dur: first ? 3 : 2.6, offset: h.lat > 60 ? [0, 0.25, 0.4] : null });
}

/* ---------------- 4. hədəflər ---------------- */
const TGT_PHOTO = { moon_sp: 'shackleton', mars_jezero: 'jezero', mars_gale: 'gale' };
$('#targetTabs').innerHTML = Object.values(TARGETS).map(t => `<button role="tab" data-t="${t.id}">${t.short.replace(' · ', ', ')}</button>`).join('');
$$('#targetTabs button').forEach(b => b.onclick = () => selectTarget(b.dataset.t));
function selectTarget(id) {
  state.tgTab = id;
  const t = TARGETS[id], P = PHOTOS[TGT_PHOTO[id]];
  $$('#targetTabs button').forEach(b => b.classList.toggle('on', b.dataset.t === id));
  $('#tgName').textContent = t.name.replace(' — ', ': ');
  $('#tgWhy').textContent = t.why;
  $('#tgFacts').innerHTML = t.facts.map(f => `<dt>${f[0]}</dt><dd>${f[1]}<small>${f[2]}</small></dd>`).join('');
  $('#tgArtemis').innerHTML = t.artemis ? `<p class="muted" style="margin:10px 0 6px">Artemis III üçün 9 namizəd eniş bölgəsi:</p><div class="artemis">${t.artemis.map(a => `<span>${a}</span>`).join('')}</div>` : '';
  $('#tgPhoto').innerHTML = `<h3>${id === 'moon_sp' ? 'LRO məlumatından görünüş' : 'Roverin ən son kadrlarından biri'}</h3>
    <figure><img src="${P.file}" alt="${esc(P.title)}"><figcaption>${esc(P.title)}. ${esc(P.credit)}. <a href="${P.url}" target="_blank" rel="noopener">Mənbə</a></figcaption></figure>`;
  engine.highlight(id);
  if (t.world === 'moon') engine.flyTo({ body: 'moon', lat: t.lat, lon: t.lon, dist: 3.4, offset: [-0.35, 0, 0.55], shiftY: -0.35 });
  else engine.flyTo({ body: 'mars', lat: t.lat, lon: t.lon, dist: 2.7, offset: [-0.3, 0.1, 0], dur: 3.6 });
}
$('#tgRank').onclick = () => {
  state.target = state.tgTab;
  state.site = rankSites(SITES, state.target, state.weights, POWER)[0].site;
  go(sections.findIndex(s => s.dataset.sec === 'analogs'));
};

/* ---------------- 5. analoqlar ---------------- */
function segTargets(el, cur, on) {
  el.innerHTML = Object.values(TARGETS).map(t => `<button role="tab" data-t="${t.id}" class="${t.id === cur ? 'on' : ''}">${t.short.replace(' · ', ', ')}</button>`).join('');
  $$('button', el).forEach(b => b.onclick = () => { $$('button', el).forEach(x => x.classList.toggle('on', x === b)); on(b.dataset.t); });
}
const STATUS_TXT = { power: 'NASA POWER ölçmələrindən hesablanıb', geo: 'Günəşin hündürlüyündən hesablanıb', expert: 'ekspert qiyməti, hipotez', missing: 'məlumat yoxdur, hesaba daxil edilmir' };
const CRIT_NAME = { terrain: 'Relyef', geology: 'Süxurlar', climate: 'İqlim', solar: 'Günəş işığı', resources: 'Su və buz' };
function renderAnalogs() {
  segTargets($('#anTarget'), state.target, t => { state.target = t; renderAnalogs(); });
  const list = rankSites(SITES, state.target, state.weights, POWER);
  $('#rankList').innerHTML = list.map(r => `<li class="${r.site.id === state.site.id ? 'on' : ''} ${r.site.status}" data-id="${r.site.id}">
    <span class="nm">${esc(r.site.name)}${r.site.status === 'new' ? '<em>yeni</em>' : ''}</span>
    <span class="bar"><i data-w="${r.aci ?? 0}"></i></span><span class="sc">${fmt(r.aci)}</span></li>`).join('');
  requestAnimationFrame(() => requestAnimationFrame(() => $$('#rankList .bar i').forEach(i => i.style.width = i.dataset.w + '%')));
  $$('#rankList li').forEach(li => li.onclick = () => { state.site = siteById(li.dataset.id); renderAnalogs(); flyToSite(state.site, 2.7); });
  renderDetail();
}
function verdictWords(r) {
  const good = r.rows.filter(x => x.S !== null && x.S >= 65).map(x => CRIT_NAME[x.id].toLowerCase());
  const bad = r.rows.filter(x => x.S !== null && x.S < 40).map(x => CRIT_NAME[x.id].toLowerCase());
  const j = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' və ' + a[a.length - 1] : a[0];
  return { good: good.length ? j(good) : null, bad: bad.length ? j(bad) : null };
}
function renderDetail() {
  const s = state.site, t = TARGETS[state.target], r = aci(s, state.target);
  const p = POWER && POWER[s.id], a = p && p.annual;
  const v = verdictWords(r);
  const level = r.aci >= 60 ? 'güclü analoqdur' : r.aci >= 45 ? 'qismən analoqdur' : 'zəif analoqdur';
  const openW = $('#siteDetail details.more')?.open || false;
  $('#siteDetail').innerHTML = `
    <h2>${esc(s.name)}</h2>
    <p class="where">${esc(s.country)}, ${esc(s.kind.toLowerCase())}${s.status === 'new' ? '. Yeni namizəd, hipotez' : ''}</p>
    <p>${esc(s.summary)}</p>
    <div class="score">
      <div class="ring" id="dRing"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="bg"/><circle cx="60" cy="60" r="52" class="arc"/></svg><span class="val">0</span></div>
      <p>${t.short.replace(' · ', ', ')} üçün ${level}.${v.good ? ` Ən çox oxşayır: ${v.good}.` : ''}${v.bad ? ` Ən zəif tərəf: ${v.bad}.` : ''}<small>Məlumat əhatəsi ${Math.round(r.coverage * 100)}%; çəkinin ${Math.round(r.measured * 100)}%-i ölçmə və hesablamaya əsaslanır.</small></p>
    </div>
    <div class="crit">${r.rows.map(x => `<div class="row k-${x.status}"><span>${CRIT_NAME[x.id]}</span><span class="bar"><i data-w="${x.S ?? 0}"></i></span><b>${x.S === null ? '—' : Math.round(x.S)}</b><small>${esc(x.why)} (${STATUS_TXT[x.status]})</small></div>`).join('')}</div>
    <p class="keys"><span><i style="background:var(--earth)"></i>ölçmə</span><span><i style="background:#9aa8ff"></i>hesablama</span><span><i style="background:var(--gold)"></i>ekspert qiyməti</span></p>
    ${a ? `<p class="muted">NASA POWER, 2001–2025 ortalaması: orta temperatur ${fmt(a.T2M, 1)} °C, ən soyuq ay ${fmt(a.T2M_MIN, 1)} °C, yağıntı ${fmt(a.PRECTOTCORR * 365.25)} mm/il.${s.id === 'maunakea' ? ' Diqqət: POWER şəbəkəsi zirvəni deyil, ətraf ərazinin ortalamasını göstərir.' : ''}</p>` : ''}
    <div class="two">
      <div><h3 class="ok">Niyə analoqdur</h3><ul>${s.analog.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div><h3 class="no">Harada fərqlənir</h3><ul>${s.breaks.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    </div>
    <details class="more"${openW ? ' open' : ''}><summary>Meyarların çəkisini dəyiş</summary>
      ${CRITERIA.map(c => `<div class="wrow"><span>${CRIT_NAME[c.id]}</span><input type="range" min="0" max="50" value="${state.weights[c.id]}" data-c="${c.id}"><b>${state.weights[c.id]}</b></div>`).join('')}
      <p class="src">ACI = Σ(çəki × bal) / Σ çəki. Məlumatı olmayan meyar sıfır sayılmır, hesabdan çıxarılır.</p>
    </details>
    <details class="more"><summary>Mənbələr</summary><ul class="srclist">${s.sources.map(([n, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(n)}</a></li>`).join('')}</ul></details>
    <button class="btn primary" id="toCompare">Hədəflə yan-yana müqayisə et</button>`;
  ring($('#dRing'), r.aci, s.status === 'new' ? '#e4b653' : '#5b9be6');
  requestAnimationFrame(() => requestAnimationFrame(() => $$('#siteDetail .crit .bar i').forEach(i => i.style.width = i.dataset.w + '%')));
  $$('#siteDetail input[type=range]').forEach(inp => inp.oninput = () => {
    state.weights[inp.dataset.c] = +inp.value; inp.nextElementSibling.textContent = inp.value;
    clearTimeout(renderDetail.t); renderDetail.t = setTimeout(renderAnalogs, 250);
  });
  $('#toCompare').onclick = () => go(sections.findIndex(x => x.dataset.sec === 'compare'));
}

/* ---------------- 6. müqayisə ---------------- */
$('#twSite').innerHTML = SITES.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
$('#twSite').onchange = e => { state.site = siteById(e.target.value); renderCompare(); };
const TAG = S => S === null ? '<span class="tag mid">Məlumat yoxdur.</span>' : S >= 65 ? '<span class="tag good">Oxşardır.</span>' : S >= 40 ? '<span class="tag mid">Qismən oxşardır.</span>' : '<span class="tag bad">Fərqlidir.</span>';
function renderCompare() {
  segTargets($('#twTarget'), state.target, t => { state.target = t; renderCompare(); });
  const s = state.site, t = TARGETS[state.target], w = WORLDS[t.world], wn = t.world === 'moon' ? 'Ay' : 'Mars';
  $('#twSite').value = s.id;
  engine.setTwin({ left: { body: 'earth', lat: s.lat, lon: s.lon, dist: 1.55 }, right: { body: t.world, lat: t.lat, lon: t.lon, dist: t.world === 'moon' ? 2.3 : 1.6 } });
  engine.highlight(null);
  $('#twL1').textContent = `Yer, ${s.country}`; $('#twL2').textContent = s.name;
  $('#twR1').textContent = wn; $('#twR2').textContent = t.name.split('—')[1]?.trim() || t.name;
  const r = aci(s, t.id), v = verdictWords(r);
  const cs = climateScore(POWER && POWER[s.id], t);
  const row = id => r.rows.find(x => x.id === id);
  const sol = row('solar').detail;
  const where = t.world === 'moon' ? 'Ayın cənub qütbünə' : `Marsın ${t.id === 'mars_jezero' ? 'Ezero' : 'Geyl'} kraterinə`;
  $('#twVerdict').innerHTML = `<b>${esc(s.name)}</b> ${where} ${v.good ? `<b>${v.good}</b> baxımından bənzəyir` : 'az bənzəyir'}${v.bad ? `, <b>${v.bad}</b> baxımından isə fərqlənir` : ''}. Heç bir Yer ərazisi cazibəni və ${t.world === 'moon' ? 'vakuumu' : 'seyrək atmosferi'} təkrarlaya bilmir. Uyğunluq indeksi: <b>${fmt(r.aci)} / 100</b>.`;
  const tempTxt = !cs ? '' : cs.tInfo.siteVal > cs.tInfo.refVal ? `Ərazi hədəfdən ${fmt(cs.tInfo.siteVal - cs.tInfo.refVal)} °C istidir.` : `Ərazi hədəfdən ${fmt(cs.tInfo.refVal - cs.tInfo.siteVal)} °C soyuqdur.`;
  const rows = [
    ['Cazibə', '9,82 m/s²', `${String(w.gravity).replace('.', ',')} m/s²`, '<span class="tag bad">Fərqlidir.</span> Yerdə cazibəni azaltmaq mümkün deyil. Bu, bütün analoqların ortaq sərhədidir.'],
    ['Atmosfer', '~1 014 mbar', t.world === 'moon' ? 'vakuum' : '~6,4 mbar, CO₂', `<span class="tag bad">Fərqlidir.</span> Skafandr və avadanlıq ${t.world === 'moon' ? 'vakuum' : 'seyrək hava'} şəraitində ayrıca sınanmalıdır.`],
    [t.climate.mode === 'mean' ? 'Orta temperatur' : 'Ən soyuq ay', cs ? `${fmt(cs.tInfo.siteVal, 1)} °C` : '—', t.climate.mode === 'mean' ? '−59 °C' : 'kölgədə −183 °C-dən soyuq', `${TAG(cs ? cs.sT : null)} ${tempTxt}`],
    ['Quraqlıq', cs ? `${fmt(cs.precipMm)} mm/il` : '—', 'maye yağıntı yoxdur', `${TAG(cs ? cs.sP : null)} ${cs && cs.precipMm < 50 ? 'Ərazi demək olar ki, yağışsızdır.' : cs && cs.precipMm < 300 ? 'Yağıntı azdır.' : 'Yağıntı çoxdur, eroziya başqa cürdür.'}`],
    ['Günəşin hündürlüyü', `ən çox ${fmt(sol.eSite)}°`, `ən çox ${fmt(sol.eT)}°`, `${TAG(row('solar').S)} ${sol.eT < 10 ? 'Ayın qütbündə Günəş üfüqdən demək olar ki, qalxmır və uzun kölgələr yaranır.' : 'Günəş hər iki yerdə yüksəyə qalxır.'}`],
    ['Relyef', '', '', `${TAG(row('terrain').S)} ${esc(row('terrain').why)}.`],
    ['Süxurlar', '', '', `${TAG(row('geology').S)} ${esc(row('geology').why)}.`],
    ['Su və buz', '', '', `${TAG(row('resources').S)} ${esc(row('resources').why)}.`],
  ];
  $('#twTable').innerHTML = `<tr><th>Nə müqayisə olunur</th><th>${esc(s.name)}</th><th>${wn}</th><th>Nəticə</th></tr>` +
    rows.map(x => `<tr><td>${x[0]}</td><td class="v">${x[1]}</td><td class="v">${x[2]}</td><td>${x[3]}</td></tr>`).join('');
}

/* ---------------- 7. miqyas ---------------- */
const SIZE_NOTE = { haughton: 'Yer, analoq', shackleton: 'Ay, hədəf: təxminən Haughton qədər', jezero: 'Mars, hədəf: təxminən 2 Haughton', gale: 'Mars, hədəf: təxminən 7 Haughton' };
const SIZE_COL = { Yer: 'var(--earth)', Ay: 'var(--moon)', Mars: 'var(--mars)' };
function renderSizes() {
  const order = ['haughton', 'shackleton', 'jezero', 'gale'];
  $('#sizeList').innerHTML = order.map(id => {
    const c = CRATERS.find(x => x.id === id);
    return `<button class="size" data-c="${id}"><b>${c.name}<small>${c.D} km</small></b><span class="bar"><i data-w="${(c.D / 154) * 100}" style="background:${SIZE_COL[c.world]}"></i></span><p>${SIZE_NOTE[id]}</p></button>`;
  }).join('');
  requestAnimationFrame(() => setTimeout(() => $$('#sizeList .bar i').forEach(i => i.style.width = i.dataset.w + '%'), 300));
  $$('#sizeList .size').forEach(b => b.onclick = () => { $$('#sizeList .size').forEach(x => x.classList.toggle('on', x === b)); lab.focus(b.dataset.c); });
}
$('#exag').oninput = e => { $('#exagV').textContent = e.target.value.replace('.', ',') + '×'; lab.setExaggeration(+e.target.value); };

/* ---------------- 8. mənbələr ---------------- */
$('#btnSources').onclick = () => {
  const items = [
    ...GENERAL_SOURCES,
    ...DATASETS.filter(d => d.used !== 'next').map(d => [d.name, d.url]),
    ...PAIRS.flatMap(p => [[p.earth.credit, p.earth.url], [p.other.credit, p.other.url]]),
    ...Object.values(PHOTOS).map(p => [p.credit, p.url]),
    [DEBRIS.src, DEBRIS.url], ['CelesTrak GP kataloqu (orbitlər)', 'https://celestrak.org/NORAD/elements/'],
  ];
  const seen = new Set();
  $('#sourceList').innerHTML = items.filter(([n, u]) => { const k = n + u; if (seen.has(k)) return false; seen.add(k); return true; })
    .map(([n, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(n)}</a></li>`).join('');
  showOverlay('#sourcesView');
};

window.__tt = { engine, lab, state, go, openBody, openPair, selectEvent, toggleDebris };
