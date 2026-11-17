// Analoq Uyğunluq İndeksi (ACI) — şəffaf, izah edilə bilən model
// ACI = Σ wᵢ·Sᵢ / Σ wᵢ   (yalnız məlumatı olan kriteriyalar üzrə; "məlumat yoxdur" sıfır sayılmır)
import { CRITERIA, TARGETS } from './data.js';

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
export const EARTH_TILT = 23.44;

// Günəşin il ərzində maksimal günorta hündürlüyü (dərəcə)
export function maxSunElevation(latDeg, tiltDeg = EARTH_TILT) {
  return Math.min(90, 90 - Math.abs(latDeg) + tiltDeg);
}

export function climateScore(power, target) {
  if (!power) return null;
  const a = power.annual;
  const precipMm = a.PRECTOTCORR * 365.25;
  const sP = clamp(100 * (1 - precipMm / 300));
  let sT, tInfo;
  if (target.climate.mode === 'mean') {
    sT = clamp(100 * (1 - Math.abs(a.T2M - target.climate.refMeanC) / 120));
    tInfo = { siteVal: a.T2M, refVal: target.climate.refMeanC, what: 'orta illik T2M', R: 120 };
  } else {
    sT = clamp(100 * (1 - Math.abs(a.T2M_MIN - target.climate.refMinC) / 240));
    tInfo = { siteVal: a.T2M_MIN, refVal: target.climate.refMinC, what: 'minimal aylıq T2M', R: 240 };
  }
  return { score: 0.5 * sT + 0.5 * sP, sT, sP, precipMm, tInfo };
}

export function solarScore(site, target) {
  const eSite = maxSunElevation(site.lat);
  const eT = target.sunMaxElevDeg;
  return { score: clamp(100 * (1 - Math.abs(eSite - eT) / 90)), eSite, eT };
}

export function computeACI(site, targetId, weights, POWER) {
  const target = TARGETS[targetId];
  const rows = [];
  for (const c of CRITERIA) {
    const w = weights[c.id];
    let S = null, status = 'missing', why = '', detail = null;
    if (c.id === 'climate') {
      const r = climateScore(POWER && POWER[site.id], target);
      if (r) {
        S = r.score; status = 'power'; detail = r;
        why = `T: ${r.tInfo.what} ${r.tInfo.siteVal.toFixed(1)} °C ↔ ${r.tInfo.refVal} °C → ${r.sT.toFixed(0)}; ` +
              `yağıntı ${r.precipMm.toFixed(0)} mm/il → ${r.sP.toFixed(0)}`;
      }
    } else if (c.id === 'solar') {
      const r = solarScore(site, target);
      S = r.score; status = 'geo'; detail = r;
      why = `Günəşin maks. hündürlüyü: ${r.eSite.toFixed(1)}° ↔ hədəf ${r.eT.toFixed(1)}°`;
    } else {
      const e = site.e[c.id] && site.e[c.id][targetId];
      if (e) { S = e[0]; status = 'expert'; why = e[1]; }
      else { why = 'Bu kriteriya üzrə yoxlanılmış məlumat hələ toplanmayıb'; }
    }
    rows.push({ id: c.id, name: c.name, w, S, status, why, detail });
  }
  const avail = rows.filter(r => r.S !== null && r.w > 0);
  const wSum = avail.reduce((s, r) => s + r.w, 0);
  const wTot = rows.reduce((s, r) => s + r.w, 0) || 1;
  const aci = wSum > 0 ? avail.reduce((s, r) => s + r.w * r.S, 0) / wSum : null;
  const measuredW = rows.filter(r => (r.status === 'power' || r.status === 'geo') && r.w > 0).reduce((s, r) => s + r.w, 0);
  return {
    aci, rows,
    coverage: wSum / wTot,            // məlumat əhatəsi (çəki payı)
    measured: measuredW / wTot,       // ölçülmüş/hesablanmış məlumatın çəki payı
  };
}

export function rankSites(sites, targetId, weights, POWER) {
  return sites.map(s => ({ site: s, ...computeACI(s, targetId, weights, POWER) }))
    .sort((a, b) => (b.aci ?? -1) - (a.aci ?? -1));
}
