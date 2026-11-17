// Yüngül canvas qrafikləri (kitabxanasız, Hi-DPI, animasiyalı)
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

function setup(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2) * 1.5;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  return { g, w, h };
}

function animate(key, draw, dur = 900) {
  const store = animate.s || (animate.s = {});
  cancelAnimationFrame(store[key]);
  const t0 = performance.now();
  const step = now => {
    const t = Math.min(1, (now - t0) / dur);
    draw(1 - Math.pow(1 - t, 3));
    if (t < 1) store[key] = requestAnimationFrame(step);
  };
  store[key] = requestAnimationFrame(step);
}

const STATUS_COL = { power: '--c-power', geo: '--c-geo', expert: '--c-expert', missing: '--c-missing' };

export function radar(canvas, rows, color) {
  animate('radar' + canvas.id, k => {
    const { g, w, h } = setup(canvas);
    const cx = w / 2, cy = h / 2 + 6, R = Math.min(w, h) * 0.36;
    const n = rows.length;
    const ang = i => -Math.PI / 2 + (i * 2 * Math.PI) / n;
    g.strokeStyle = 'rgba(150,175,220,0.16)'; g.lineWidth = 1;
    for (let l = 1; l <= 4; l++) {
      g.beginPath();
      for (let i = 0; i <= n; i++) { const a = ang(i % n), r = (R * l) / 4; g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      g.stroke();
    }
    for (let i = 0; i < n; i++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang(i)) * R, cy + Math.sin(ang(i)) * R); g.stroke(); }
    // dəyər poliqonu
    g.beginPath();
    rows.forEach((r, i) => { const v = ((r.S ?? 0) / 100) * R * k; const x = cx + Math.cos(ang(i)) * v, y = cy + Math.sin(ang(i)) * v; g[i ? 'lineTo' : 'moveTo'](x, y); });
    g.closePath();
    const grd = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    grd.addColorStop(0, color + '22'); grd.addColorStop(1, color + '66');
    g.fillStyle = grd; g.fill();
    g.strokeStyle = color; g.lineWidth = 2; g.stroke();
    rows.forEach((r, i) => {
      const v = ((r.S ?? 0) / 100) * R * k; const x = cx + Math.cos(ang(i)) * v, y = cy + Math.sin(ang(i)) * v;
      g.beginPath(); g.arc(x, y, 4.5, 0, Math.PI * 2);
      g.fillStyle = r.S === null ? css('--c-missing') : css(STATUS_COL[r.status]); g.fill();
      g.strokeStyle = '#0b1428'; g.lineWidth = 1.5; g.stroke();
      // etiketlər
      const lx = cx + Math.cos(ang(i)) * (R + 22), ly = cy + Math.sin(ang(i)) * (R + 16);
      g.fillStyle = css('--text-2'); g.font = '600 12px Inter, sans-serif';
      g.textAlign = Math.abs(Math.cos(ang(i))) < 0.2 ? 'center' : Math.cos(ang(i)) > 0 ? 'left' : 'right';
      g.textBaseline = 'middle';
      g.fillText(r.name, lx, ly);
      g.fillStyle = r.S === null ? css('--c-missing') : css('--text-1'); g.font = '600 11px "JetBrains Mono", monospace';
      g.fillText(r.S === null ? 'yoxdur' : Math.round(r.S * k), lx, ly + 14);
    });
  });
}

export function ranking(canvas, list, selectedId, onPick) {
  canvas._list = list;
  canvas.onclick = e => {
    const rect = canvas.getBoundingClientRect(); const y = e.clientY - rect.top;
    const i = Math.floor((y - 6) / canvas._row);
    if (canvas._list[i]) onPick(canvas._list[i].site);
  };
  animate('rank', k => {
    const { g, w, h } = setup(canvas);
    const row = Math.min(30, (h - 10) / list.length); canvas._row = row;
    const lw = Math.min(190, w * 0.42), bw = w - lw - 52;
    list.forEach((it, i) => {
      const y = 6 + i * row, sel = it.site.id === selectedId;
      if (sel) { g.fillStyle = 'rgba(54,214,231,0.10)'; g.fillRect(0, y - 2, w, row - 2); }
      g.fillStyle = sel ? css('--text-1') : css('--text-2'); g.font = `${sel ? 700 : 500} 12px Inter, sans-serif`;
      g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(it.site.name.length > 26 ? it.site.name.slice(0, 25) + '…' : it.site.name, 6, y + row / 2 - 1);
      const v = (it.aci ?? 0) / 100 * bw * k;
      g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(lw, y + row * 0.25, bw, row * 0.42);
      const grd = g.createLinearGradient(lw, 0, lw + bw, 0);
      const c = it.site.status === 'new' ? '#FFB547' : '#36D6E7';
      grd.addColorStop(0, c + '55'); grd.addColorStop(1, c);
      g.fillStyle = grd; g.fillRect(lw, y + row * 0.25, v, row * 0.42);
      // məlumat əhatəsi göstəricisi (çubuğun altındakı nazik xətt)
      g.fillStyle = 'rgba(155,140,255,0.8)'; g.fillRect(lw, y + row * 0.72, bw * it.coverage * k, 2);
      g.fillStyle = css('--text-1'); g.font = '600 12px "JetBrains Mono", monospace'; g.textAlign = 'right';
      g.fillText(it.aci === null ? '—' : (it.aci * k).toFixed(1), w - 4, y + row / 2 - 1);
    });
  }, 1100);
}

export function climateChart(canvas, power) {
  animate('clim', k => {
    const { g, w, h } = setup(canvas);
    if (!power) { g.fillStyle = css('--text-3'); g.fillText('Məlumat yoxdur', 10, 20); return; }
    const m = power.monthly;
    const pad = { l: 34, r: 34, t: 14, b: 22 };
    const W = w - pad.l - pad.r, H = h - pad.t - pad.b;
    const tmin = Math.min(...m.T2M_MIN), tmax = Math.max(...m.T2M_MAX);
    const lo = Math.floor((tmin - 5) / 10) * 10, hi = Math.ceil((tmax + 5) / 10) * 10;
    const ty = v => pad.t + H - ((v - lo) / (hi - lo)) * H;
    const x = i => pad.l + (i + 0.5) * (W / 12);
    const pmax = Math.max(1, ...m.PRECTOTCORR.map(v => v * 30.4));
    // yağıntı sütunları
    m.PRECTOTCORR.forEach((p, i) => {
      const bh = ((p * 30.4) / pmax) * H * 0.55 * k;
      g.fillStyle = 'rgba(79,163,255,0.35)'; g.fillRect(x(i) - W / 30, pad.t + H - bh, W / 15, bh);
    });
    // grid
    g.strokeStyle = 'rgba(150,175,220,0.12)'; g.fillStyle = css('--text-3'); g.font = '10px "JetBrains Mono", monospace'; g.textAlign = 'right';
    for (let v = lo; v <= hi; v += 10) { const y = ty(v); g.beginPath(); g.moveTo(pad.l, y); g.lineTo(w - pad.r, y); g.stroke(); g.fillText(v + '°', pad.l - 4, y + 3); }
    if (lo < 0 && hi > 0) { g.strokeStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.moveTo(pad.l, ty(0)); g.lineTo(w - pad.r, ty(0)); g.stroke(); }
    // min–max zolağı
    g.beginPath();
    m.T2M_MAX.forEach((v, i) => g[i ? 'lineTo' : 'moveTo'](x(i), ty(lo + (v - lo) * k)));
    for (let i = 11; i >= 0; i--) g.lineTo(x(i), ty(lo + (m.T2M_MIN[i] - lo) * k));
    g.closePath(); g.fillStyle = 'rgba(255,138,92,0.18)'; g.fill();
    g.beginPath(); m.T2M.forEach((v, i) => g[i ? 'lineTo' : 'moveTo'](x(i), ty(lo + (v - lo) * k)));
    g.strokeStyle = '#FF8A5C'; g.lineWidth = 2; g.stroke();
    const mon = ['Y', 'F', 'M', 'A', 'M', 'İ', 'İ', 'A', 'S', 'O', 'N', 'D'];
    g.textAlign = 'center'; g.fillStyle = css('--text-3');
    mon.forEach((s, i) => g.fillText(s, x(i), h - 6));
    g.textAlign = 'left'; g.fillStyle = 'rgba(79,163,255,0.9)';
    g.fillText(`yağıntı, maks ${pmax.toFixed(0)} mm/ay`, pad.l + 4, pad.t + 8);
  });
}

export function ring(el, value, color) {
  const circ = 2 * Math.PI * 52;
  const arc = el.querySelector('.arc'), txt = el.querySelector('.val');
  arc.style.stroke = color;
  if (value === null) { arc.style.strokeDasharray = `0 ${circ}`; txt.textContent = '—'; return; }
  const from = parseFloat(el.dataset.v || 0);
  animate('ring' + el.id, k => {
    const v = from + (value - from) * k;
    arc.style.strokeDasharray = `${(v / 100) * circ} ${circ}`;
    txt.textContent = v.toFixed(1);
  }, 1000);
  el.dataset.v = value;
}
