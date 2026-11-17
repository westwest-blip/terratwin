// «Yer, yoxsa Mars?» — игра на настоящих снимках NASA. Без библиотек и без 3D: работает на любом ноутбуке.
const { photos: P, pairs: PAIRS, zoom: ZOOM = {} } = window.GAME;
const ROUNDS = 5, DURATION = 15;           // раундов в игре, секунд на ответ
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const store = { get(k, d) { try { return JSON.parse(sessionStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* приватный режим */ } } };

const T = {
  az: {
    kicker: 'NASA-nın real fotoları ilə oyun', title: 'Yer, yoxsa Mars?',
    lead: 'Yer üzündə elə yerlər var ki, onları Aydan və Marsdan ayırmaq çətindir. Sınayın: 5 raund, hər birinə 15 saniyə.',
    m1: 'Hansı dünya?', m1d: 'Bir foto: Yer, Ay, yoxsa Mars?', m2: 'Əkizini tap', m2d: 'Ay və ya Mars fotosuna Yerdəki əkizini seçin.',
    rules: 'Düzgün cavab 100 xal verir, sürətə görə daha 100-ə qədər əlavə olunur. Klaviatura: 1, 2, 3 və Enter.',
    level: 'Çətinlik', easy: 'Asan', hard: 'Çətin', hardNote: 'Çətin rejimdə foto ağ-qara və yaxın planda göstərilir. Cavabdan sonra bütöv kadr öz rəngində açılır.', easyNote: 'Asan rejimdə foto bütöv və rəngli göstərilir.', links: 'Analoq skaneri',
    teaser: 'Yer? Ay? Mars?', step: (i, n) => `Raund ${i} / ${n}`, q1: 'Bu hansı dünyadır?', q2: 'Bunun Yerdəki əkizi hansıdır?',
    world: { earth: 'Yer', moon: 'Ay', mars: 'Mars' }, itIs: { earth: 'Bu, Yerdir.', moon: 'Bu, Aydır.', mars: 'Bu, Marsdır.' },
    ok: 'Düzdür!', no: 'Səhv', late: 'Vaxt bitdi', tell: 'Necə ayırmaq olar:', same: 'Nə oxşardır', diff: 'Nə fərqlidir', why: 'Niyə vacibdir',
    src: 'Mənbə', photo: 'Foto', next: 'Növbəti', last: 'Nəticəyə bax', score: 'Xal', sec: 'san', pts: 'xal',
    correct: (n, m) => `Düzgün cavab: ${n} / ${m}`, ranks: ['Yer turisti', 'Kursant', 'Sahə tədqiqatçısı', 'Missiya geoloqu'],
    moral: 'Bu fotoları ayırmaq mütəxəssis üçün də çətindir. Məhz buna görə NASA avadanlığı və astronavtları Yerdəki analoq ərazilərdə hazırlayır.',
    again: 'Yenidən oyna', change: 'Rejimi dəyiş', deck: 'Təqdimata keç', yours: 'Cavabınız', none: 'cavab verilmədi', twinOf: 'əkizi',
  },
  en: {
    kicker: 'A game with real NASA photos', title: 'Earth or Mars?',
    lead: 'Some places on Earth are hard to tell from the Moon and Mars. Try it: 5 rounds, 15 seconds each.',
    m1: 'Which world?', m1d: 'One photo: Earth, the Moon or Mars?', m2: 'Find the twin', m2d: 'Pick the Earth twin of a photo from the Moon or Mars.',
    rules: 'A correct answer is worth 100 points, plus up to 100 more for speed. Keyboard: 1, 2, 3 and Enter.',
    level: 'Difficulty', easy: 'Easy', hard: 'Hard', hardNote: 'In hard mode the photo is shown in black and white and zoomed in. After you answer, the full frame opens in its real colours.', easyNote: 'In easy mode the photo is shown whole and in colour.', links: 'Analog scanner',
    teaser: 'Earth? Moon? Mars?', step: (i, n) => `Round ${i} of ${n}`, q1: 'Which world is this?', q2: 'Which of these is its twin on Earth?',
    world: { earth: 'Earth', moon: 'Moon', mars: 'Mars' }, itIs: { earth: 'This is Earth.', moon: 'This is the Moon.', mars: 'This is Mars.' },
    ok: 'Correct!', no: 'Not quite', late: 'Time is up', tell: 'How to tell:', same: 'What is similar', diff: 'What differs', why: 'Why it matters',
    src: 'Source', photo: 'Photo', next: 'Next', last: 'See the result', score: 'Score', sec: 's', pts: 'points',
    correct: (n, m) => `Correct answers: ${n} of ${m}`, ranks: ['Earth tourist', 'Trainee', 'Field scientist', 'Mission geologist'],
    moral: 'Even experts find these photos hard to tell apart. That is exactly why NASA prepares hardware and astronauts at analog sites on Earth.',
    again: 'Play again', change: 'Change mode', deck: 'Open the presentation', yours: 'Your answer', none: 'no answer', twinOf: 'twin',
  },
};

const state = { hard: true, lang: 'az', screen: 'start', mode: 'guess', rounds: [], idx: 0, score: 0, results: [], revealed: false, t0: 0, left: DURATION };
try { state.lang = localStorage.getItem('tt_lang') === 'en' ? 'en' : 'az'; } catch { /* нет доступа к хранилищу */ }
const t = () => T[state.lang];
const L = o => o[state.lang];
const app = $('#app');

/* ---------------- составление игры ---------------- */
function pickUnseen(pool, n, key) {
  const seen = new Set(store.get(key, []));
  let fresh = shuffle(pool.filter(k => !seen.has(k)));
  if (fresh.length < n) { fresh = fresh.concat(shuffle(pool.filter(k => seen.has(k)))); seen.clear(); }
  const out = fresh.slice(0, n);
  out.forEach(k => seen.add(k));
  store.set(key, [...seen]);
  return out;
}
function buildGuess() {
  const by = b => Object.keys(P).filter(k => P[k].guess && P[k].body === b);
  // по одному снимку каждого мира и ещё два случайных мира — чтобы нельзя было угадать «всегда Марс»
  const bodies = shuffle(['earth', 'moon', 'mars'].concat(shuffle(['earth', 'moon', 'mars']).slice(0, ROUNDS - 3)));
  const need = { earth: 0, moon: 0, mars: 0 }; bodies.forEach(b => need[b]++);
  const picked = {}; for (const b of Object.keys(need)) picked[b] = pickUnseen(by(b), need[b], 'tt_seen_' + b);
  return bodies.map(b => ({ kind: 'guess', photo: picked[b].pop(), options: ['earth', 'moon', 'mars'] }));
}
function buildTwin() {
  const ids = pickUnseen(PAIRS.map(p => p.id), ROUNDS, 'tt_seen_pairs');
  return ids.map(id => {
    const pair = PAIRS.find(p => p.id === id);
    const decoys = shuffle(PAIRS.filter(p => p.id !== id).map(p => p.earth)).slice(0, 2);
    return { kind: 'twin', pair, options: shuffle([pair.earth, ...decoys]) };
  });
}
function startGame(mode) {
  stopTeaser();
  Object.assign(state, { mode, screen: 'round', rounds: mode === 'guess' ? buildGuess() : buildTwin(), idx: 0, score: 0, results: [], revealed: false });
  state.rounds.forEach(r => (r.kind === 'guess' ? [r.photo] : [r.pair.other, ...r.options]).forEach(k => { new Image().src = P[k].file; }));
  shownScore = 0; $('#score').textContent = '0';
  beginRound();
}

/* ---------------- таймер ---------------- */
let raf = 0;
function tick() {
  if (state.screen !== 'round' || state.revealed) return;
  const left = Math.max(0, DURATION - (performance.now() - state.t0) / 1000);
  state.left = left;
  $('#timefill').style.transform = `scaleX(${(left / DURATION).toFixed(4)})`;
  $('#secs').textContent = Math.ceil(left);
  const low = left <= 5;
  $('#timebar').classList.toggle('low', low); $('#clock').classList.toggle('low', low);
  if (left <= 0) { answer(null); return; }
  raf = requestAnimationFrame(tick);
}
function beginRound() {
  state.revealed = false; state.t0 = performance.now(); state.left = DURATION;
  render();
  cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
}

/* ---------------- ответ ---------------- */
function answer(choice) {
  if (state.screen !== 'round' || state.revealed) return;
  cancelAnimationFrame(raf);
  const r = state.rounds[state.idx];
  const truth = r.kind === 'guess' ? P[r.photo].body : r.pair.earth;
  const ok = choice === truth;
  const pts = ok ? 100 + Math.round(100 * state.left / DURATION) : 0;
  state.revealed = true;
  state.results.push({ round: r, choice, ok, pts, late: choice === null });
  state.score += pts;
  render();
  animateScore();
}
function nextRound() {
  if (!state.revealed) return;
  if (state.idx + 1 >= state.rounds.length) { state.screen = 'final'; render(); return; }
  state.idx++; beginRound();
}
let shownScore = 0;
function animateScore() {
  const from = shownScore, to = state.score, t0 = performance.now();
  const step = now => { const k = Math.min(1, (now - t0) / 700); shownScore = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); $('#score').textContent = shownScore; if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* ---------------- экраны ---------------- */
function hud() {
  const on = state.screen === 'round';
  $('#hud').hidden = !on; $('#timebar').hidden = !on;
  $('#scoreLabel').textContent = t().score; $('#secUnit').textContent = t().sec;
  if (!on) return;
  $('#steps').innerHTML = state.rounds.map((_, i) => {
    const res = state.results[i];
    return `<li class="${res ? (res.ok ? 'ok' : 'no') : i === state.idx ? 'now' : ''}"></li>`;
  }).join('');
  if (state.revealed) { $('#secs').textContent = Math.ceil(state.left); }
}
const srcLine = keys => `<p class="src">${t().photo}: ${keys.map(k => `${esc(P[k].credit)} (<a href="${P[k].url}" target="_blank" rel="noopener">${t().src.toLowerCase()}</a>)`).join('; ')}</p>`;

function renderStart() {
  app.innerHTML = `<section class="screen start">
    <div>
      <p class="kicker">${t().kicker}</p>
      <h1>${t().title}</h1>
      <p class="lead">${t().lead}</p>
      <div class="modes">
        <button class="mode" data-mode="guess"><b>${t().m1}</b><span>${t().m1d}</span><kbd>1</kbd></button>
        <button class="mode" data-mode="twin"><b>${t().m2}</b><span>${t().m2d}</span><kbd>2</kbd></button>
      </div>
      <div class="level"><span>${t().level}</span><div class="seg"><button data-hard="0" class="${state.hard ? '' : 'on'}">${t().easy}</button><button data-hard="1" class="${state.hard ? 'on' : ''}">${t().hard}</button></div></div>
      <p class="small">${state.hard ? t().hardNote : t().easyNote} ${t().rules}</p>
      <p class="small"><a href="skaner.html">${t().links}</a></p>
    </div>
    <div class="teaser${state.hard ? ' bw' : ''}" id="teaser"><img alt=""><img alt=""><p>${t().teaser}</p></div>
  </section>`;
  $$('.mode').forEach(b => b.onclick = () => startGame(b.dataset.mode));
  $$('[data-hard]').forEach(b => b.onclick = () => { state.hard = b.dataset.hard === '1'; render(); });
  startTeaser();
}
let teaserTimer = 0;
function startTeaser() {
  stopTeaser();
  const keys = shuffle(Object.keys(P).filter(k => P[k].guess));
  const imgs = $$('#teaser img'); let i = 0, top = 0;
  const show = () => { const im = imgs[top]; im.onload = () => { imgs.forEach(x => x.classList.toggle('on', x === im)); }; im.src = P[keys[i % keys.length]].file; i++; top = 1 - top; };
  show(); teaserTimer = setInterval(show, 3400);
}
function stopTeaser() { clearInterval(teaserTimer); }

function renderRound() {
  const r = state.rounds[state.idx], res = state.revealed ? state.results[state.idx] : null;
  const stepLine = `<p class="step">${t().step(state.idx + 1, state.rounds.length)}</p>`;
  const nextBtn = `<button class="btn primary next" id="next">${state.idx + 1 >= state.rounds.length ? t().last : t().next} <kbd>Enter</kbd></button>`;
  const verdict = res ? `<p class="verdict ${res.ok ? 'ok' : 'no'}">${res.ok ? t().ok : res.late ? t().late : t().no}${res.ok ? `<small>+${res.pts} ${t().pts}</small>` : ''}</p>` : '';
  if (r.kind === 'guess') {
    const ph = P[r.photo];
    app.innerHTML = `<section class="screen round${res ? ' revealed' : ''}${state.hard ? ' bw masked' : ''}">
      <div class="col"><figure class="stage">${frame(r.photo, true)}</figure></div>
      <div class="col">
        ${stepLine}<h2>${t().q1}</h2>
        <div class="answers">${r.options.map((o, i) => {
          const cls = !res ? '' : o === ph.body ? 'right' : o === res.choice ? 'wrong' : 'dim';
          return `<button class="ans ${cls}" data-o="${o}" ${res ? 'disabled' : ''}>${t().world[o]}<kbd>${i + 1}</kbd></button>`;
        }).join('')}</div>
        ${res ? `<div class="reveal">
          ${verdict}
          <h3>${t().itIs[ph.body]} ${esc(L(ph.title))}</h3>
          <p class="meta">${esc(L(ph.meta))}</p>
          <p>${esc(L(ph.fact))}</p>
          <p><span class="lbl">${t().tell}</span> ${esc(L(ph.tell))}</p>
          ${srcLine([r.photo])}
          ${nextBtn}
        </div>` : ''}
      </div>
    </section>`;
  } else {
    const pr = r.pair, o = P[pr.other];
    app.innerHTML = `<section class="screen round twin${res ? ' revealed' : ''}${state.hard ? ' bw' : ''}">
      <div class="col">
        <p class="world ${o.body}">${t().world[o.body]}${res ? ': ' + esc(L(o.title)) : ''}</p>
        <figure class="stage">${frame(pr.other, false)}</figure>
        ${res ? `<div class="reveal">
          ${verdict}
          <h3>${esc(L(pr.type))}: ${esc(L(P[pr.earth].title))}</h3>
          <div class="facts3">
            <div><h3>${t().same}</h3><p>${esc(L(pr.same))}</p></div>
            <div><h3>${t().diff}</h3><p>${esc(L(pr.diff))}</p></div>
            <div><h3>${t().why}</h3><p>${esc(L(pr.why))}</p></div>
          </div>
          <div class="twin-foot">${srcLine([pr.other, pr.earth])}${nextBtn}</div>
        </div>` : ''}
      </div>
      <div class="col">
        ${stepLine}<h2>${t().q2}</h2>
        <div class="tiles">${r.options.map((k, i) => {
          const cls = !res ? '' : k === pr.earth ? 'right' : k === res.choice ? 'wrong' : 'dim';
          return `<button class="tile ${cls}" data-o="${k}" ${res ? 'disabled' : ''}><img src="${P[k].file}" alt=""><kbd>${i + 1}</kbd>${res ? `<span class="name">${esc(L(P[k].title))}</span>` : ''}</button>`;
        }).join('')}</div>
      </div>
    </section>`;
  }
  $$('[data-o]').forEach(b => b.onclick = () => answer(b.dataset.o));
  fitFrame();
  // после ответа кадр плавно раскрывается: уходит увеличение и возвращается цвет
  if (res) requestAnimationFrame(() => requestAnimationFrame(() => { const s = $('.round'); if (s) s.classList.remove('bw', 'masked'); }));
  const nb = $('#next'); if (nb) { nb.onclick = nextRound; nb.focus({ preventScroll: true }); }
  if (res) { $('#timefill').style.transform = `scaleX(${(state.left / DURATION).toFixed(4)})`; }
}

// рамка снимка: размер подгоняется под сцену, в сложном режиме кадр увеличен вокруг выбранной точки
function frame(key, zoomable) {
  const z = zoomable && ZOOM[key] ? ZOOM[key] : [0.5, 0.5, 1];
  return `<div class="frame" style="--ox:${z[0] * 100}%;--oy:${z[1] * 100}%;--z:${z[2]}"><img src="${P[key].file}" alt=""></div>`;
}
function fitFrame() {
  const st = $('.stage'), fr = $('.stage .frame'); if (!st || !fr) return;
  const im = $('img', fr);
  const apply = () => {
    const W = st.clientWidth, H = st.clientHeight, a = im.naturalWidth / im.naturalHeight || 1.5;
    let w = W, h = W / a; if (h > H) { h = H; w = H * a; }
    fr.style.width = Math.floor(w) + 'px'; fr.style.height = Math.floor(h) + 'px';
  };
  if (im.complete && im.naturalWidth) apply(); else im.onload = apply;
}
window.addEventListener('resize', fitFrame);

function renderFinal() {
  const n = state.results.filter(r => r.ok).length, max = ROUNDS * 200;
  const rank = t().ranks[state.score >= 0.85 * max ? 3 : state.score >= 0.6 * max ? 2 : state.score >= 0.3 * max ? 1 : 0];
  const name = k => k === null ? t().none : (state.mode === 'guess' ? t().world[k] : L(P[k].title));
  app.innerHTML = `<section class="screen final">
    <div>
      <p class="total">${state.score}<small>/ ${max} ${t().pts}</small></p>
      <p class="rank">${rank}</p>
      <p class="lead">${t().correct(n, ROUNDS)}. ${t().moral}</p>
      <div class="cta">
        <button class="btn primary" id="again">${t().again} <kbd>Enter</kbd></button>
        <button class="btn" id="change">${t().change}</button>
        <a class="btn" href="presentation.html">${t().deck}</a>
      </div>
    </div>
    <ol class="recap">${state.results.map(res => {
      const r = res.round, key = r.kind === 'guess' ? r.photo : r.pair.other, ph = P[key];
      const head = r.kind === 'guess' ? `${t().world[ph.body]}: ${esc(L(ph.title))}` : `${esc(L(r.pair.type))}: ${esc(L(ph.title))} ↔ ${esc(L(P[r.pair.earth].title))}`;
      return `<li><img src="${ph.file}" alt=""><div><b>${head}</b><span>${res.ok ? '' : `${t().yours}: ${esc(name(res.choice))}. `}<a href="${ph.url}" target="_blank" rel="noopener">${t().src}: ${esc(ph.credit)}</a></span></div><span class="pts ${res.ok ? 'ok' : 'no'}">${res.ok ? '+' + res.pts : '0'}</span></li>`;
    }).join('')}</ol>
  </section>`;
  $('#again').onclick = () => startGame(state.mode);
  $('#change').onclick = () => { state.screen = 'start'; render(); };
  $('#again').focus({ preventScroll: true });
}

function render() {
  document.documentElement.lang = state.lang;
  document.title = `${t().title} — TerraTwin`;
  $$('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === state.lang));
  hud();
  if (state.screen === 'start') renderStart(); else if (state.screen === 'round') renderRound(); else renderFinal();
}

/* ---------------- управление ---------------- */
$$('.lang button').forEach(b => b.onclick = () => {
  state.lang = b.dataset.lang;
  try { localStorage.setItem('tt_lang', state.lang); } catch { /* нет доступа к хранилищу */ }
  render();                                     // таймер не сбрасывается: t0 сохраняется
  if (state.screen === 'round' && !state.revealed) { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
});
$('#brand').onclick = e => { e.preventDefault(); cancelAnimationFrame(raf); state.screen = 'start'; render(); };
window.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key;
  if (state.screen === 'start') { if (k === '1') startGame('guess'); else if (k === '2') startGame('twin'); return; }
  if (state.screen === 'round') {
    if (!state.revealed && ['1', '2', '3'].includes(k)) { e.preventDefault(); answer(state.rounds[state.idx].options[+k - 1]); }
    else if (state.revealed && (k === 'Enter' || k === ' ' || k === 'ArrowRight')) { e.preventDefault(); nextRound(); }
    else if (k === 'Escape') { cancelAnimationFrame(raf); state.screen = 'start'; render(); }
    return;
  }
  if (state.screen === 'final') { if (k === 'Enter') { e.preventDefault(); startGame(state.mode); } else if (k === 'Escape') { state.screen = 'start'; render(); } }
});

render();
window.__game = { state, answer, nextRound, startGame, P, PAIRS };
