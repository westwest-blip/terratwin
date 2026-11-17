// Analoq skaneri: клик в любую точку Земли → живой запрос NASA POWER → сходство с Луной и Марсом.
// Считается только то, что реально измеряется для произвольной точки: климат (POWER) и освещённость (геометрия).
import { SITES, TARGETS } from './data.js';
import { climateScore, solarScore, maxSunElevation } from './aci.js';

const SAVED = window.POWER || {};
const W_CLIMATE = 20, W_SOLAR = 15;               // те же веса, что в ACI презентации
const PARAMS = 'T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN,RH2M,WS2M';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const T = {
  az: {
    game: 'Oyun', deck: 'Təqdimat', title: 'Analoq skaneri',
    lead: 'Xəritədə istənilən nöqtəyə klikləyin. Skaner NASA-ya canlı sorğu göndərir və bu yerin Aya və Marsa nə qədər bənzədiyini hesablayır.',
    lat: 'Enlik', lon: 'Uzunluq', go: 'Skan et',
    empty: 'Nöqtə seçin', emptyText: 'Xəritəyə klikləyin, hazır yerlərdən birini seçin və ya koordinat yazın. Təkərlə yaxınlaşdırmaq, sürükləməklə hərəkət etmək olar.',
    busy: 'NASA POWER-ə sorğu göndərilir…', point: 'Seçilmiş nöqtə', sea: 'Bu nöqtə dənizdədir. Rəqəmlər dəniz üzərindəki havaya aiddir, quru səthə yox.',
    live: 'Canlı NASA məlumatı', saved: 'Saxlanmış NASA məlumatı', src: 'NASA POWER, MERRA-2, 2001–2025 ortalaması', resp: 'cavab', sec: 'san', query: 'sorğu',
    offline: 'NASA-ya qoşulmaq alınmadı. İnterneti yoxlayın və yenidən cəhd edin.', offlineNear: 'İnternet yoxdur: ən yaxın saxlanmış ərazinin məlumatı göstərilir',
    targets: { moon_sp: 'Ay, cənub qütbü', mars_jezero: 'Mars, Ezero krateri', mars_gale: 'Mars, Geyl krateri' },
    rank: (r, n) => `${n} tanınmış ərazi ilə müqayisədə ${r}${['-ci', '-ci', '-cü', '-cü', '-ci', '-cı', '-ci', '-ci', '-cu', '-cu'][r - 1] || '-ci'} yer`, parts: (c, s) => `iqlim ${c}, Günəş işığı ${s}`,
    data: 'NASA ölçmələri', tMean: 'Orta temperatur', tMin: 'Ən soyuq ay', tMax: 'Ən isti ay', rain: 'Yağıntı', sun: 'Günəş enerjisi', hum: 'Rütubət', wind: 'Külək', elev: 'Günəşin ən yüksək nöqtəsi',
    mmYear: 'mm/il', kwh: 'kVt·saat/m² gündə', ms: 'm/san',
    near: 'İqliminə görə ən yaxın tanınmış analoq',
    note: 'Bal yalnız iqlimi və Günəş işığını ölçür: bu, tam indeksin (ACI) çəkisinin 35%-idir. Relyef, süxurlar və su üçün ixtiyari nöqtədə ölçmə yoxdur, ona görə onlar hesaba daxil edilməyib. NASA POWER şəbəkəsinin addımı təxminən 50 km-dir.',
    ns: ['şm. e.', 'c. e.'], ew: ['ş. u.', 'q. u.'], approx: 'koordinatlar təqribidir',
    presets: [['Gəncə', 40.68, 46.36], ['Bakı', 40.41, 49.87], ['Qobustan', 40.02, 49.40], ['Atakama', -24.10, -70.02], ['Lut', 30.50, 58.60], ['Quru Vadilər', -77.53, 161.58]],
  },
  en: {
    game: 'Game', deck: 'Presentation', title: 'Analog scanner',
    lead: 'Click any point on the map. The scanner sends a live request to NASA and works out how similar the place is to the Moon and Mars.',
    lat: 'Latitude', lon: 'Longitude', go: 'Scan',
    empty: 'Pick a point', emptyText: 'Click the map, choose one of the ready places or type coordinates. Scroll to zoom, drag to move.',
    busy: 'Sending a request to NASA POWER…', point: 'Selected point', sea: 'This point is at sea. The numbers describe the air over water, not a land surface.',
    live: 'Live NASA data', saved: 'Saved NASA data', src: 'NASA POWER, MERRA-2, 2001–2025 average', resp: 'response', sec: 's', query: 'request',
    offline: 'Could not reach NASA. Check the internet connection and try again.', offlineNear: 'No internet: showing saved data for the nearest stored site',
    targets: { moon_sp: 'Moon, south pole', mars_jezero: 'Mars, Jezero Crater', mars_gale: 'Mars, Gale Crater' },
    rank: (r, n) => `rank ${r} when compared with ${n} known sites`, parts: (c, s) => `climate ${c}, sunlight ${s}`,
    data: 'NASA measurements', tMean: 'Mean temperature', tMin: 'Coldest month', tMax: 'Warmest month', rain: 'Precipitation', sun: 'Solar energy', hum: 'Humidity', wind: 'Wind', elev: 'Highest Sun elevation',
    mmYear: 'mm/year', kwh: 'kWh/m² per day', ms: 'm/s',
    near: 'Closest known analog by climate',
    note: 'The score measures only climate and sunlight: 35% of the weight of the full index (ACI). There are no measurements of terrain, rocks or water for an arbitrary point, so they are left out. The NASA POWER grid step is about 50 km.',
    ns: ['N', 'S'], ew: ['E', 'W'], approx: 'coordinates are approximate',
    presets: [['Ganja', 40.68, 46.36], ['Baku', 40.41, 49.87], ['Gobustan', 40.02, 49.40], ['Atacama', -24.10, -70.02], ['Lut', 30.50, 58.60], ['Dry Valleys', -77.53, 161.58]],
  },
};
let lang = 'az';
try { lang = localStorage.getItem('tt_lang') === 'en' ? 'en' : 'az'; } catch { /* нет доступа к хранилищу */ }
const t = () => T[lang];
const num = (v, d = 0) => Number(v).toFixed(d).replace('.', lang === 'az' ? ',' : '.');
const coord = (lat, lon) => `${num(Math.abs(lat), 2)}° ${t().ns[lat >= 0 ? 0 : 1]}, ${num(Math.abs(lon), 2)}° ${t().ew[lon >= 0 ? 0 : 1]}`;

/* ---------------- карта: масштаб, перемещение, клик ---------------- */
const map = $('#map'), world = $('#world');
const view = { s: 1, tx: 0, ty: 0, W: 0, H: 0, min: 1 };
function layout(keepCenter = true) {
  const cw = map.clientWidth, ch = map.clientHeight;
  const cx = view.W ? (cw / 2 - view.tx) / (view.W * view.s) : 0.63, cy = view.H ? (ch / 2 - view.ty) / (view.H * view.s) : 0.34;
  view.W = cw; view.H = cw / 2; view.min = Math.max(1, ch / view.H);
  view.s = Math.max(view.min, view.s);
  world.style.width = view.W + 'px'; world.style.height = view.H + 'px';
  if (keepCenter) { view.tx = cw / 2 - cx * view.W * view.s; view.ty = ch / 2 - cy * view.H * view.s; }
  apply();
}
function apply() {
  const cw = map.clientWidth, ch = map.clientHeight;
  view.tx = Math.min(0, Math.max(cw - view.W * view.s, view.tx));
  view.ty = Math.min(0, Math.max(ch - view.H * view.s, view.ty));
  world.style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.s})`;
  world.style.setProperty('--inv', 1 / view.s);
}
function zoomAt(px, py, factor) {
  const s2 = Math.min(10, Math.max(view.min, view.s * factor));
  const wx = (px - view.tx) / view.s, wy = (py - view.ty) / view.s;
  view.s = s2; view.tx = px - wx * s2; view.ty = py - wy * s2; apply();
}
map.addEventListener('wheel', e => { e.preventDefault(); const r = map.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.25 : 0.8); }, { passive: false });
$('#zin').onclick = e => { e.stopPropagation(); zoomAt(map.clientWidth / 2, map.clientHeight / 2, 1.6); };
$('#zout').onclick = e => { e.stopPropagation(); zoomAt(map.clientWidth / 2, map.clientHeight / 2, 0.625); };
let drag = null;
map.addEventListener('pointerdown', e => { if (e.target.closest('.zoom')) return; drag = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false }; map.setPointerCapture(e.pointerId); });
map.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.hypot(dx, dy) > 5) drag.moved = true; if (drag.moved) { view.tx = drag.tx + dx; view.ty = drag.ty + dy; apply(); } });
map.addEventListener('pointerup', e => {
  if (!drag) return; const d = drag; drag = null;
  if (d.moved) return;
  const r = map.getBoundingClientRect();
  const x = (e.clientX - r.left - view.tx) / view.s / view.W, y = (e.clientY - r.top - view.ty) / view.s / view.H;
  scan(90 - y * 180, x * 360 - 180);
});
window.addEventListener('resize', () => layout());
function place(el, lat, lon) { el.style.left = ((lon + 180) / 360) * 100 + '%'; el.style.top = ((90 - lat) / 180) * 100 + '%'; }
function flyTo(lat, lon) {
  const cw = map.clientWidth, ch = map.clientHeight;
  view.s = Math.max(view.s, Math.max(view.min, 2.2));
  view.tx = cw / 2 - ((lon + 180) / 360) * view.W * view.s; view.ty = ch / 2 - ((90 - lat) / 180) * view.H * view.s;
  world.style.transition = 'transform .9s cubic-bezier(.22,.8,.2,1)'; apply(); setTimeout(() => { world.style.transition = ''; }, 950);
}
// известные аналоги на карте
$('#dots').innerHTML = SITES.map(s => `<i class="dot ${s.status}" title="${esc(s.name)}" data-id="${s.id}"></i>`).join('');
$$('#dots .dot').forEach(d => { const s = SITES.find(x => x.id === d.dataset.id); place(d, s.lat, s.lon); });

/* ---------------- суша или море (маска воды из GEBCO/Blue Marble) ---------------- */
let waterCtx = null;
{ const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, 1024, 512); waterCtx = g; }; im.src = 'assets/tex/earth_water_4k.png'; }
function isSea(lat, lon) {
  if (!waterCtx) return false;
  try { const x = Math.min(1023, Math.max(0, Math.round(((lon + 180) / 360) * 1023))), y = Math.min(511, Math.max(0, Math.round(((90 - lat) / 180) * 511))); return waterCtx.getImageData(x, y, 1, 1).data[0] > 140; } catch { return false; }
}

/* ---------------- расчёт ---------------- */
function partial(power, lat, targetId) {
  const T0 = TARGETS[targetId];
  const c = climateScore(power, T0), s = solarScore({ lat }, T0);
  return { score: (W_CLIMATE * c.score + W_SOLAR * s.score) / (W_CLIMATE + W_SOLAR), climate: c.score, solar: s.score };
}
const KNOWN = SITES.filter(s => SAVED[s.id]).map(s => ({ site: s, power: SAVED[s.id] }));
function nearestClimate(a) {
  const vec = p => [p.T2M / 30, p.T2M_MIN / 40, Math.log10(1 + p.PRECTOTCORR * 365.25) / 1.5, p.RH2M / 50];
  const v = vec(a); let best = null;
  for (const k of KNOWN) { const u = vec(k.power.annual); const d = Math.hypot(...u.map((x, i) => x - v[i])); if (!best || d < best.d) best = { d, site: k.site }; }
  return best && best.site;
}

/* ---------------- запрос NASA POWER ---------------- */
const cache = new Map();
let current = null, seq = 0;
async function fetchPower(lat, lon) {
  const key = lat.toFixed(2) + ',' + lon.toFixed(2);
  if (cache.has(key)) return { ...cache.get(key), ms: 0, cached: true };
  const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=${PARAMS}&community=RE&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}&format=JSON`;
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 25000), t0 = performance.now();
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json(), p = d.properties.parameter, annual = {};
    for (const k of Object.keys(p)) { const v = p[k].ANN; if (v === undefined || v <= -900) throw new Error('no data for ' + k); annual[k] = v; }
    const out = { annual, url, gridElev: d.geometry.coordinates[2], range: d.header && d.header.range };
    cache.set(key, out);
    return { ...out, ms: performance.now() - t0 };
  } finally { clearTimeout(timer); }
}

async function scan(lat, lon) {
  lat = Math.max(-89.9, Math.min(89.9, lat)); lon = ((lon + 540) % 360) - 180;
  const my = ++seq;
  current = { lat, lon, state: 'busy' };
  $('#lat').value = lat.toFixed(2); $('#lon').value = lon.toFixed(2);
  const pin = $('#pin'); pin.hidden = false; place(pin, lat, lon);
  { // если точка вне видимой части карты — плавно показать её
    const sx = view.tx + ((lon + 180) / 360) * view.W * view.s, sy = view.ty + ((90 - lat) / 180) * view.H * view.s;
    if (sx < 20 || sy < 20 || sx > map.clientWidth - 20 || sy > map.clientHeight - 20) flyTo(lat, lon);
  }
  render();
  try {
    const res = await fetchPower(lat, lon);
    if (my !== seq) return;
    current = { lat, lon, state: 'ok', live: true, ...res };
  } catch (err) {
    if (my !== seq) return;
    // офлайн-резерв: сохранённые данные ближайшего из 9 мест (если оно рядом)
    const near = KNOWN.map(k => ({ k, d: Math.hypot(k.site.lat - lat, (k.site.lon - lon) * Math.cos(lat * Math.PI / 180)) })).sort((a, b) => a.d - b.d)[0];
    if (near && near.d < 1.5) current = { lat: near.k.site.lat, lon: near.k.site.lon, state: 'ok', live: false, annual: near.k.power.annual, url: near.k.power.url, savedName: near.k.site.name };
    else current = { lat, lon, state: 'error', error: String(err && err.message || err) };
  }
  render();
}

/* ---------------- вывод ---------------- */
function render() {
  document.documentElement.lang = lang;
  document.title = `${t().title} — TerraTwin`;
  $$('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === lang));
  $('#lnkGame').textContent = t().game; $('#lnkDeck').textContent = t().deck;
  $('#title').textContent = t().title; $('#lead').textContent = t().lead;
  $('#latL').textContent = t().lat; $('#lonL').textContent = t().lon; $('#go').textContent = t().go;
  $('#presets').innerHTML = t().presets.map((p, i) => `<button type="button" data-i="${i}">${esc(p[0])}</button>`).join('');
  $$('#presets button').forEach(b => b.onclick = () => { const p = t().presets[+b.dataset.i]; flyTo(p[1], p[2]); scan(p[1], p[2]); });
  const box = $('#result'), c = current;
  if (!c) { box.innerHTML = `<div class="empty"><b>${t().empty}</b>${t().emptyText}</div>`; return; }
  const head = `<h2>${c.savedName ? esc(c.savedName) : t().point}</h2><p class="where">${coord(c.lat, c.lon)}</p>`;
  if (c.state === 'busy') { box.innerHTML = head + `<p class="busy">${t().busy}</p>`; return; }
  if (c.state === 'error') { box.innerHTML = head + `<p class="warn">${t().offline}</p><p class="note">${esc(c.error)}</p>`; return; }
  const a = c.annual, power = { annual: a };
  const rows = Object.keys(TARGETS).map(id => {
    const me = partial(power, c.lat, id);
    const rank = 1 + KNOWN.filter(k => partial(k.power, k.site.lat, id).score > me.score + 1e-9).length;
    return { id, ...me, rank };
  });
  const near = nearestClimate(a);
  const live = c.live
    ? `<p class="live"><b>${t().live}</b>. ${t().src}${c.ms ? `, ${t().resp} ${num(c.ms / 1000, 1)} ${t().sec}` : ''}. <a href="${c.url}" target="_blank" rel="noopener">${t().query}</a></p>`
    : `<p class="live off"><b>${t().saved}</b>. ${t().offlineNear}. ${t().src}.</p>`;
  box.innerHTML = head + live + (isSea(c.lat, c.lon) ? `<p class="warn">${t().sea}</p>` : '') + `
    <div class="targets">${rows.map(r => `<div class="tg ${TARGETS[r.id].world}">
      <b>${t().targets[r.id]}</b><p class="num">${Math.round(r.score)}<small>/ 100</small></p>
      <div class="bar"><i data-w="${r.score.toFixed(1)}"></i></div>
      <span>${t().parts(Math.round(r.climate), Math.round(r.solar))}; ${t().rank(r.rank, KNOWN.length)}</span></div>`).join('')}</div>
    ${near ? `<p class="near">${t().near}: <b>${esc(near.name)}</b></p>` : ''}
    <h3>${t().data}</h3>
    <dl class="data">
      <dt>${t().tMean}</dt><dd>${num(a.T2M, 1)} °C</dd>
      <dt>${t().tMin}</dt><dd>${num(a.T2M_MIN, 1)} °C</dd>
      <dt>${t().tMax}</dt><dd>${num(a.T2M_MAX, 1)} °C</dd>
      <dt>${t().rain}</dt><dd>${num(a.PRECTOTCORR * 365.25)} ${t().mmYear}</dd>
      <dt>${t().sun}</dt><dd>${num(a.ALLSKY_SFC_SW_DWN, 2)} ${t().kwh}</dd>
      <dt>${t().hum}</dt><dd>${num(a.RH2M)} %</dd>
      <dt>${t().wind}</dt><dd>${num(a.WS2M, 1)} ${t().ms}</dd>
      <dt>${t().elev}</dt><dd>${num(maxSunElevation(c.lat), 1)}°</dd>
    </dl>
    <p class="note">${t().note}</p>`;
  requestAnimationFrame(() => requestAnimationFrame(() => $$('.tg .bar i').forEach(i => { i.style.width = i.dataset.w + '%'; })));
}

$$('.lang button').forEach(b => b.onclick = () => { lang = b.dataset.lang; try { localStorage.setItem('tt_lang', lang); } catch { /* нет доступа */ } render(); });
$('#goto').addEventListener('submit', e => {
  e.preventDefault();
  const lat = parseFloat($('#lat').value.replace(',', '.')), lon = parseFloat($('#lon').value.replace(',', '.'));
  if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) { flyTo(lat, lon); scan(lat, lon); }
});

layout(false); view.s = view.min; view.tx = map.clientWidth / 2 - 0.63 * view.W * view.s; view.ty = map.clientHeight / 2 - 0.34 * view.H * view.s; apply();
render();
{ // ссылка вида skaner.html#40.02,49.40 (её ставит TerraAnalog) сразу запускает проверку этой точки
  const h = location.hash.slice(1).split(',').map(Number);
  if (h.length === 2 && h.every(Number.isFinite) && Math.abs(h[0]) <= 90 && Math.abs(h[1]) <= 180) { flyTo(h[0], h[1]); scan(h[0], h[1]); }
}
window.__scan = { scan, view, get current() { return current; } };
