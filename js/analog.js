// TerraAnalog Explorer. Движок сходства «Земля ↔ цель на Луне/Марсе», живые данные NASA POWER и ИИ-помощник (языковая модель через tools/serve.mjs).
// Числа берутся из data/analog/* (tools/analog_build.py: NASA POWER, NOAA ETOPO5, NASA PDS MOLA/LOLA, Smithsonian GVP) и из живых запросов NASA POWER.
// Если признака нет, он исключается из оценки; ничего не придумывается.
import { SITES, TARGETS } from './data.js';
import { AZ_COUNTRY, EN_COUNTRY } from './analog_names.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------- данные о задачах, целях и полигонах ---------------- */
// Метрики: f — столбец сетки; unit — единица измерения; near — шкала расстояния (км), иначе сравнение по σ всей суши Земли.
const METRICS = [
  { id: 'slope', f: 'slope', unit: '°', d: 1, log: true }, { id: 'rough', f: 'rough', unit: 'm', d: 0, log: true },
  { id: 'temp', f: 't2m', unit: '°C', d: 1 }, { id: 'prec', f: 'prec', unit: 'mm/day', d: 2, log: true },
  { id: 'alb', f: 'alb', unit: '0–1', d: 2 }, { id: 'veg', f: 'veg', unit: '0–1', d: 2 },
  { id: 'tube', f: 'dtube', unit: 'km', d: 0, near: 75 },
];
// Задачи: целевая точка и важность метрик (экспертная гипотеза, описана в «Методе»).
const TASKS = {
  msr: { target: 'mars_jezero', w: { slope: 3, rough: 3, veg: 1.5, prec: 1, alb: 2.5, temp: 0.5 } },
  gale: { target: 'mars_gale', w: { slope: 3, rough: 3, veg: 1.5, prec: 1, alb: 2, temp: 0.5 } },
  olympus: { target: 'mars_olympus', w: { tube: 3, slope: 2, rough: 2, veg: 1, prec: 1, alb: 1.5, temp: 0.5 } },
  hellas: { target: 'custom', at: { body: 'mars', lat: -32.88, lon: 62.12 }, w: { slope: 3, rough: 3, veg: 1, prec: 1, alb: 2, temp: 1 } },   // самая низкая точка MOLA (сетка 0.25°), область Hellas
  lunar: { target: 'moon_sp', w: { temp: 3, prec: 2, slope: 1.5, rough: 1.5, alb: 1, veg: 1 } },
  custom: { target: 'custom', w: { slope: 3, rough: 3, alb: 1.5, temp: 1.5, veg: 1, prec: 1 } },   // своя цель: любая точка на Марсе или Луне
};
// Опорные значения целей: NASA NSSDC (Mars −59 °C, альбедо Бонда 0.250; Moon 0.11), Zuber et al. 2012 (Shackleton < 90 K); slope/rough из MOLA/LOLA — meta.json.
const TV = {
  mars_jezero: { temp: -59, prec: 0, veg: 0, alb: 0.25 }, mars_gale: { temp: -59, prec: 0, veg: 0, alb: 0.25 }, mars_olympus: { temp: -59, prec: 0, veg: 0, alb: 0.25 },
  moon_sp: { temp: -183, cold: true, prec: 0, veg: 0, alb: 0.11 },
  custom: { temp: -59, prec: 0, veg: 0, alb: 0.25 },     // уточняется при выборе точки
};
// Два полигона, где NASA тренирует астронавтов. Точные границы NASA не публикует: метки приблизительные.
const ACTIVE = [
  { id: 'is', lat: 65.05, lon: -16.78, ref: 'askja',
    name: { az: 'İslandiya: Asqya və Holuhraun', en: 'Iceland: Askja and Holuhraun' },
    why: { az: 'Artemis II ekipajı 2024-cü ilin iyul-avqustunda burada geologiya təlimi keçib (NASA foto albomunda Drekagil və Holuhraun lava sahəsi göstərilib).', en: 'The Artemis II crew did geology training here in July–August 2024 (NASA’s photo album names Drekagil and the Holuhraun lava field).' },
    src: [['NASA Science: Artemis II crew uses Iceland terrain', 'https://science.nasa.gov/missions/artemis/nasas-artemis-ii-crew-uses-iceland-terrain-for-lunar-training/'], ['NASA Images: Artemis II crew geology training in Iceland', 'https://images.nasa.gov/album/Artemis_II_Crew_Geology_Training_in_Iceland?page=1']] },
  { id: 'az', lat: 35.78, lon: -111.50,
    name: { az: 'Arizona: San-Fransisko vulkan sahəsi', en: 'Arizona: San Francisco Volcanic Field' },
    why: { az: 'NASA astronavt siniflərinə Şimali Arizonada (Flagstaff) sahə təlimi keçir; Black Point lava axınında 2022-ci ilin oktyabrında Ay roveri əməliyyatları məşq edilib (mətbuat məlumatı). Marker təxminidir: Flagstaff-dan təxminən 40 mil şimal.', en: 'NASA gives astronaut classes field training in northern Arizona (Flagstaff); crews rehearsed lunar rover operations at Black Point Lava Flow in October 2022 (press report). The marker is approximate: about 40 miles north of Flagstaff.' },
    src: [['NASA Science: Preparing for Artemis, geology training', 'https://science.nasa.gov/resource/preparing-for-artemis-nasas-geology-training-for-lunar-exploration'], ['NASA Artemis science planning: training (PDF)', 'https://assets.science.nasa.gov/content/dam/science/cds/researchers/nac/pac/2025/7-Artemis%20Science%20Planning%20-%20Training_TAGGED.pdf']] },
];
const ICE_ALB = 0.6, SPACING_KM = 500, NEW_KM = 300, R_EARTH = 6371, NCAND = 6, LIVE_DAYS = 30;

/* ---------------- словарь ---------------- */
const T = {
  az: {
    tabs: ['Platforma', 'Skaner', 'Oyun', 'Təqdimat'], how: 'Metod və mənbələr',
    task: 'Missiya tapşırığı', target: 'Hədəf', metricsUsed: 'Hesabda istifadə olunan göstəricilər', refs: 'NASA-nın təlim poliqonları',
    tasks: {
      msr: ['Mars nümunələrinin qaytarılması', 'Ezero kraterində nümunə toplama və rover əməliyyatlarını məşq etmək üçün qaya və qrunt sahələri.', 'Mars · Ezero krateri (Perseverance enib)', 'Mars Sample Return'],
      gale: ['Geyl krateri və Şarp dağı', 'Laylı çöküntü yamacı: Curiosity-nin keçdiyi relyefə oxşar sahələr.', 'Mars · Geyl krateri', 'Curiosity'],
      olympus: ['Olimp dağının tədqiqi', 'Bazalt qalxanvari vulkan relyefi: yumşaq yamac, kələ-kötür lava, yaxınlıqda bazalt vulkanlar.', 'Mars · Olimp dağının yamacı', 'Mars'],
      hellas: ['Hellas çökəkliyi', 'MOLA məlumatında Marsın ən alçaq nöqtəsi (Hellas bölgəsi): çökəklik dibinin relyefi.', 'Mars · Hellas bölgəsi, ən alçaq nöqtə', 'Mars'],
      lunar: ['Ayın qütbü və buz', 'Şeklton kraterinin ətrafı kimi soyuq, quru, çılpaq sahələr.', 'Ay · Cənub qütbü (Artemis III)', 'Artemis III'],
    },
    m: { slope: 'Yamac', rough: 'Kələ-kötürlük', temp: 'Orta illik temperatur', prec: 'Yağıntı', alb: 'Albedo', veg: 'Bitki örtüyü', tube: 'Bazalt qalxanvari vulkana məsafə' },
    mhelp: { slope: '18,5 km bazada orta yamac', rough: 'hündürlüyün standart kənarlaşması, 74 × 74 km pəncərə', temp: 'NASA POWER, 2001–2025', prec: 'NASA POWER, çoxillik orta', alb: 'səthin işıq əks etdirməsi', veg: 'Blue Marble rənglərindən indeks', tube: 'Smithsonian GVP' },
    unit: { '°': '°', m: 'm', '°C': '°C', 'mm/day': 'mm/gün', '0–1': '(0–1)', km: 'km' },
    custom: { body: { mars: 'Mars', moon: 'Ay' }, pickMap: 'Xəritədə seç', latL: 'Enlik, °', lonL: 'Uzunluq, °E', notes: 'Bu yer haqqında bildikləriniz (könüllü)', notesHint: 'Mətn yoxlanılmır: modelə “istifadəçi qeydi” kimi göndərilir.', find: 'Oxşar yerləri tap', pickTitle: 'Mars və ya Ayda yer seçin (NASA MOLA / LOLA relyefi)', elev: 'Hündürlük', nameOf: (b, la, lo) => `${b} · ${fmt(Math.abs(la), 2)}° ${la >= 0 ? 'ş.e.' : 'c.e.'}, ${fmt(lo, 2)}° ş.u.`, desc: 'Mars və ya Ayda istənilən yeri göstərin. Sistem MOLA / LOLA relyefindən yerin yamacını və kələ-kötürlüyünü hesablayır, süni intellekt isə Yerdə ən oxşar yeri axtarır.', title: 'Öz hədəfim' },
    ice: 'Buz təbəqələrini istisna et', iceHint: 'Albedosu ≥ 0,6 olan və ya NASA Blue Marble-da ağ görünən xanalar çıxarılır: qar və buz qaya və qrunt üzərində işləməyi təqlid etmir. Eşik ekspert fərziyyəsidir.',
    ask: { title: 'Süni intellektə sorğu', ph: 'Marsda və ya Ayda bir yeri təsvir edin: harada yerləşir, relyef necədir, nə axtarırsınız…', go: 'Yerdə oxşar yeri tap', ex: 'Nümunələr', note: 'Demo: mətn açar sözlərə görə uyğun ssenariyə çevrilir, sonra təhlil işə düşür.',
      mars: ['Mars · Ezero krateri', 'Mars, Ezero krateri: qədim göl dibi, düz, quru və daşlı səth; yamac təxminən 0,7°. Nümunə toplama məşqi üçün yer lazımdır.'],
      moon: ['Ay · Cənub qütbü', 'Ay, cənub qütbü, Şeklton krateri: çox soyuq, quru, kölgəli krater; buz ola bilər. Artemis III üçün məşq yeri lazımdır.'] },
    scen: 'Hazır ssenarilər', tplace: 'Hədəf yer', miniHint: 'Nöqtə ssenaridir. Xəritədə istənilən başqa yeri basın, süni intellekt ona oxşar yer axtarsın.', factsSrc: 'Mənbə: layihənin hədəf məlumatları (NASA)', tagline: 'Ay və Mars relyefinin Yerdəki analoqlarını axtaran süni intellekt platforması · Artemis · Mars Sample Return',
    importance: 'Əhəmiyyəti', live: 'Canlı NASA məlumatı', liveSub: n => `NASA POWER, son ${n} gün`, refresh: 'Yenilə',
    liveOk: (d, t) => `${d} tarixinə qədər · yeniləndi ${t}`, liveBusy: (a, b) => `Yüklənir: ${a} / ${b}`, liveFail: 'Yüklənmədi (NASA POWER cavab vermir)', liveNone: 'Hələ yüklənməyib',
    mtitle: t => `${t}: Yerdə ən uyğun yerlər`, mstatus: (n) => `${n} quru xana qiymətləndirilib`,
    ai: 'Süni intellekt tövsiyəsi', run: 'Təhlili işə sal', rerun: 'Yenidən təhlil et', busy: 'Təhlil aparılır…',
    srcAI: m => `Təhlil: dil modeli (${m}) · yalnız NASA rəqəmləri əsasında`, srcAlgo: 'Təhlil: alqoritm (hesablanmış oxşarlıq). Dil modeli qoşulmayıb.', srcReady: 'İlkin təklif. «Təhlili işə sal» canlı NASA məlumatını yükləyir və tövsiyəni dəqiqləşdirir.', srcLocal: 'Təhlil: yerli mühərrik (pulsuz, internetsiz işləyir). NASA rəqəmləri əsasında əsaslandırma; dil modeli qoşulmayıb.', optLM: 'İstəyə görə dil modeli: Ollama (pulsuz, kompüterdə) və ya pulsuz Gemini açarı. Bax: config/README.txt', fellBack: 'Dil modeli cavab vermədi, yerli mühərrik istifadə olundu.',
    lm: { strong: 'Güclü uyğunluq', weak: 'Zəif uyğunluq', vs: 'hədəf', live: n => `Son ${n} gün`, dry: 'quru', wet: 'yağıntı olub', notAssessed: 'Qiymətləndirilməyib: giriş, icazələr, təhlükəsizlik, logistika.', none: 'Aydın zəif göstərici yoxdur.', summary: (a, b, far) => `İki yer seçildi: ${a} və ${b}.${far ? ' Onlar ≥ 1500 km aralıdadır: müxtəlif regionlarda məşq mümkün olsun.' : ''}` },
        errKey: 'API açarı tapılmadı.', errApi: 'API xətası', errBad: 'Model düzgün cavab vermədi', errNet: 'Yerli serverə qoşulmaq olmadı. start_terraanalog.bat ilə açın.',
    pick: 'Tövsiyə', score: 'Oxşarlıq', outOf: '/ 100', risks: 'Risklər', why: 'Əsaslandırma', newTag: 'Yeni yer', near: (n, d) => `${n} yaxınlığı, ${d} km`,
    cands: 'Nəzərdən keçirilən namizədlər', candNote: 'Bir-birindən ≥ 500 km, məlum poliqonlardan ≥ 300 km uzaqda.',
    sel: 'Seçilmiş yer', earth: 'Yer', tgt: 'Hədəf', match: 'Uyğunluq', metric: 'Göstərici', cmp: '3D müqayisə', liveq: 'Canlı NASA sorğusu', noData: 'məlumat yoxdur',
    lastDays: n => `Son ${n} gün`, tmean: 'orta temperatur', tmin: 'min.', tmax: 'maks.', precip: 'yağıntı cəmi',
    legend: { active: 'NASA təlim poliqonu', rec: 'Tövsiyə olunan yeni yer', cand: 'Namizəd', known: 'Layihənin digər nöqtələri', low: 'az uyğun', high: 'çox uyğun' }, volc: 'Bazalt qalxanvari vulkanlar',
    foot: 'Tor ≈ 55 km. Bu, regional ilkin seçimdir; konkret poliqon üçün daha dəqiq məlumat və sahə işi lazımdır.',
    loading: 'NASA məlumatları yüklənir…', fail: 'Məlumat faylları tapılmadı. tools/analog_build.py işə salınmalıdır.', close: 'Bağla',
    verdictBest: 'ən yaxın göstəricilər', verdictWorst: 'ən böyük fərq',
    algoWhy: (a, b, c) => `Hədəfə ən çox ${a} və ${b} üzrə yaxındır. Ən böyük fərq: ${c}.`,
    algoRisk: 'Bu mətn alqoritmin şablonudur; dil modeli bunu şərh etməyib.',
    summaryAlgo: 'Alqoritm hər tapşırıq üçün əhəmiyyətli göstəricilər üzrə ən yüksək oxşarlıqlı iki yeni yeri seçib.',
    cmpTitle: (a, b) => `${a} ↔ ${b}`, cmpNote: (km, ex) => `Hər iki pəncərə ${km} × ${km} km, şaquli miqyas ${ex} dəfə böyüdülüb. Fırlatmaq üçün sürüşdürün. Relyef: NOAA ETOPO5 (Yer), NASA MOLA (Mars), NASA LOLA (Ay).`,
    lat: v => `${fmt(Math.abs(v), 2)}° ${v >= 0 ? 'ş.e.' : 'c.e.'}`, lon: v => `${fmt(Math.abs(v), 2)}° ${v >= 0 ? 'ş.u.' : 'q.u.'}`,
    pct: p => `${p}-ci persentil`, valid: 'Yoxlama', validNote: 'Alqoritm bu yerlər haqqında heç nə bilmir. Persentil: yerin bütün quru xanalar arasındakı yeri.',
    srcs: 'Mənbələr', open: 'Mənbəni aç', approx: 'təxmini',
  },
  en: {
    tabs: ['Platform', 'Scanner', 'Game', 'Presentation'], how: 'Method and sources',
    task: 'Mission task', target: 'Target', metricsUsed: 'Metrics used', refs: 'NASA training polygons',
    tasks: {
      msr: ['Mars Sample Return', 'Rock and soil ground to rehearse sample collection and rover operations like at Jezero Crater.', 'Mars · Jezero Crater (Perseverance landed)', 'Mars Sample Return'],
      gale: ['Gale Crater and Mount Sharp', 'Layered-sediment slopes: ground like the terrain Curiosity drives over.', 'Mars · Gale Crater', 'Curiosity'],
      olympus: ['Olympus Mons exploration', 'Basaltic shield-volcano terrain: gentle slopes, rough lava, basaltic shield volcanoes nearby.', 'Mars · flank of Olympus Mons', 'Mars'],
      hellas: ['Hellas basin', 'The lowest point of Mars in the MOLA data (Hellas region): basin-floor terrain.', 'Mars · Hellas region, lowest point', 'Mars'],
      lunar: ['Lunar pole and ice', 'Cold, dry, barren ground like the surroundings of Shackleton crater.', 'Moon · South Pole (Artemis III)', 'Artemis III'],
    },
    m: { slope: 'Slope', rough: 'Roughness', temp: 'Mean annual temperature', prec: 'Precipitation', alb: 'Albedo', veg: 'Vegetation cover', tube: 'Distance to a basaltic shield volcano' },
    mhelp: { slope: 'mean slope over an 18.5 km baseline', rough: 'standard deviation of elevation, 74 × 74 km window', temp: 'NASA POWER, 2001–2025', prec: 'NASA POWER, long-term mean', alb: 'how much light the surface reflects', veg: 'index from Blue Marble colours', tube: 'Smithsonian GVP' },
    unit: { '°': '°', m: 'm', '°C': '°C', 'mm/day': 'mm/day', '0–1': '(0–1)', km: 'km' },
    custom: { body: { mars: 'Mars', moon: 'Moon' }, pickMap: 'Pick on map', latL: 'Latitude, °', lonL: 'Longitude, °E', notes: 'What you know about this place (optional)', notesHint: 'Not verified: sent to the model as a user note.', find: 'Find similar places', pickTitle: 'Choose a place on Mars or the Moon (NASA MOLA / LOLA relief)', elev: 'Elevation', nameOf: (b, la, lo) => `${b} · ${fmt(Math.abs(la), 2)}° ${la >= 0 ? 'N' : 'S'}, ${fmt(lo, 2)}° E`, desc: 'Point to any place on Mars or the Moon. The system computes its slope and roughness from MOLA / LOLA relief, and the AI looks for the most similar place on Earth.', title: 'My own target' },
    ice: 'Exclude ice sheets', iceHint: 'Cells with albedo ≥ 0.6 or white in NASA Blue Marble are removed: snow and ice do not imitate work on rock and soil. The threshold is an expert hypothesis.',
    ask: { title: 'Ask the AI', ph: 'Describe a place on Mars or the Moon: where it is, what the terrain is like, what you need…', go: 'Find a similar place on Earth', ex: 'Examples', note: 'Demo: the text is matched to a scenario by keywords, then the analysis runs.',
      mars: ['Mars · Jezero Crater', 'Mars, Jezero Crater: an ancient lake bed, flat, dry and rocky ground; slope about 0.7°. We need a place to rehearse sample collection.'],
      moon: ['Moon · South Pole', 'Moon, south pole, Shackleton crater: very cold, dry, shadowed crater; ice may be present. We need a training site for Artemis III.'] },
    scen: 'Ready scenarios', tplace: 'Target place', miniHint: 'Dots are scenarios. Click any other place on the map and the AI looks for a similar one on Earth.', factsSrc: 'Source: project target data (NASA)', tagline: 'AI platform that finds Earth analogs of lunar and Martian terrain · Artemis · Mars Sample Return',
    importance: 'Importance', live: 'Live NASA data', liveSub: n => `NASA POWER, last ${n} days`, refresh: 'Refresh',
    liveOk: (d, t) => `through ${d} · updated ${t}`, liveBusy: (a, b) => `Loading: ${a} of ${b}`, liveFail: 'Not loaded (NASA POWER did not answer)', liveNone: 'Not loaded yet',
    mtitle: t => `${t}: best matching places on Earth`, mstatus: n => `${n} land cells scored`,
    ai: 'AI recommendation', run: 'Run analysis', rerun: 'Run again', busy: 'Analysing…',
    srcAI: m => `Analysis by a language model (${m}), using NASA numbers only`, srcAlgo: 'Analysis by the algorithm (computed similarity). No language model connected.', srcReady: 'First proposal. “Run analysis” loads live NASA data and refines the recommendation.', srcLocal: 'Analysis by the local engine (free, works offline). Rationale from NASA numbers; no language model connected.', optLM: 'Optional language model: Ollama (free, on your computer) or a free Gemini key. See config/README.txt', fellBack: 'The language model did not answer, so the local engine was used.',
    lm: { strong: 'Strong match', weak: 'Weak match', vs: 'target', live: n => `Last ${n} days`, dry: 'dry', wet: 'it rained', notAssessed: 'Not assessed: access, permits, safety, logistics.', none: 'No clearly weak metric.', summary: (a, b, far) => `Two places chosen: ${a} and ${b}.${far ? ' They are at least 1,500 km apart, so training can happen in different regions.' : ''}` },
        errKey: 'API key not found.', errApi: 'API error', errBad: 'The model returned an invalid answer', errNet: 'Cannot reach the local server. Open the page with start_terraanalog.bat.',
    pick: 'Pick', score: 'Similarity', outOf: '/ 100', risks: 'Risks', why: 'Rationale', newTag: 'New place', near: (n, d) => `Near ${n}, ${d} km`,
    cands: 'Candidates considered', candNote: 'At least 500 km apart and 300 km from known polygons.',
    sel: 'Selected place', earth: 'Earth', tgt: 'Target', match: 'Match', metric: 'Metric', cmp: '3D comparison', liveq: 'Live NASA request', noData: 'no data',
    lastDays: n => `Last ${n} days`, tmean: 'mean temperature', tmin: 'min', tmax: 'max', precip: 'total precipitation',
    legend: { active: 'NASA training polygon', rec: 'Recommended new place', cand: 'Candidate', known: 'Other project points', low: 'less similar', high: 'more similar' }, volc: 'Basaltic shield volcanoes',
    foot: 'Grid ≈ 55 km. This is a regional pre-selection; a real training site needs finer data and field work.',
    loading: 'Loading NASA data…', fail: 'Data files not found. Run tools/analog_build.py first.', close: 'Close',
    verdictBest: 'closest metrics', verdictWorst: 'largest gap',
    algoWhy: (a, b, c) => `Closest to the target in ${a} and ${b}. Largest gap: ${c}.`,
    algoRisk: 'This text is an algorithm template; no language model has commented on it.',
    summaryAlgo: 'For this task the algorithm picked the two new places with the highest similarity on the metrics that matter.',
    cmpTitle: (a, b) => `${a} ↔ ${b}`, cmpNote: (km, ex) => `Both windows are ${km} × ${km} km, with the same ${ex}× vertical exaggeration. Drag to rotate. Terrain: NOAA ETOPO5 (Earth), NASA MOLA (Mars), NASA LOLA (Moon).`,
    lat: v => `${fmt(Math.abs(v), 2)}° ${v >= 0 ? 'N' : 'S'}`, lon: v => `${fmt(Math.abs(v), 2)}° ${v >= 0 ? 'E' : 'W'}`,
    pct: p => `${p}${[, 'st', 'nd', 'rd'][p % 100 > 10 && p % 100 < 14 ? 0 : p % 10] || 'th'} percentile`, valid: 'Validation', validNote: 'The algorithm is told nothing about these places. Percentile: where the place stands among all land cells.',
    srcs: 'Sources', open: 'Open source', approx: 'approximate',
  },
};

const state = { askText: '', lang: 'az', task: 'msr', custom: { body: 'mars', lat: 18.65, lon: 226.2, notes: '' }, pickOpen: false, noIce: { msr: true, gale: true, olympus: true, hellas: true, custom: true, lunar: false }, sel: -1, picks: [], pickSrc: null, ai: { available: false, model: '' }, aiBusy: false, aiErr: '', liveBusy: null, liveEnd: '', liveAt: '', liveFailed: false, volcs: false };
try { state.lang = localStorage.getItem('tt_lang') === 'en' ? 'en' : 'az'; } catch { /* нет доступа к хранилищу */ }
const t = () => T[state.lang];
function fmt(v, d = 0) { return Number.isFinite(v) ? v.toLocaleString(state.lang === 'az' ? 'az-AZ' : 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−') : '—'; }
const unitOf = u => t().unit[u] ?? u;
const tr = (m, v) => m.log ? Math.log1p(Math.max(0, v)) : v;
const hav = (a1, o1, a2, o2) => { const p = Math.PI / 180, h = Math.sin((a2 - a1) * p / 2) ** 2 + Math.cos(a1 * p) * Math.cos(a2 * p) * Math.sin((o2 - o1) * p / 2) ** 2; return 2 * R_EARTH * Math.asin(Math.sqrt(h)); };
const num = (v, m) => `${fmt(v, m.d)}${m.unit ? `<small> ${esc(unitOf(m.unit))}</small>` : ''}`;

/* ---------------- загрузка данных ---------------- */
let meta, N, NF, idx, lat, lon, country, area, col = {}, lookup, sigma = {}, tmin = {}, subCache = {}, score, order, rank, cum, areaAll = 1, shortlist = [], volcanoes = [], activeCells = [];
async function load() {
  meta = await (await fetch('data/analog/meta.json')).json();
  const buf = await (await fetch('data/analog/cells.bin')).arrayBuffer(), dv = new DataView(buf);
  N = dv.getUint32(0, true); NF = dv.getUint32(4, true);
  idx = new Uint32Array(buf, 8, N);
  const feat = new Float32Array(buf, 8 + 4 * N, N * NF);
  country = new Uint8Array(buf, 8 + 4 * N + 4 * N * NF, N);
  lat = new Float32Array(N); lon = new Float32Array(N); area = new Float32Array(N); lookup = new Int32Array(meta.nlat * meta.nlon).fill(-1);
  for (let i = 0; i < N; i++) { const r = Math.floor(idx[i] / meta.nlon), c = idx[i] % meta.nlon; lat[i] = 90 - meta.dlat * r; lon[i] = -180 + meta.dlon * c; lookup[idx[i]] = i; area[i] = Math.max(0, Math.cos(lat[i] * Math.PI / 180)); }
  meta.features.forEach((k, j) => { const a = new Float32Array(N); for (let i = 0; i < N; i++) a[i] = feat[i * NF + j]; col[k] = a; });
  for (const m of METRICS) {                                   // статистика по суше, взвешенная по площади клетки
    let s = 0, s2 = 0, n = 0, mn = Infinity; const a = col[m.f];
    for (let i = 0; i < N; i++) { const v = tr(m, a[i]), w = area[i]; if (Number.isFinite(v)) { s += w * v; s2 += w * v * v; n += w; if (v < mn) mn = v; } }
    m.ok = n > 0; m.mean = s / (n || 1); sigma[m.id] = Math.sqrt(Math.max(1e-9, s2 / (n || 1) - m.mean * m.mean)); tmin[m.id] = mn;
  }
  for (const k of Object.keys(TV).filter(k => meta.targets[k])) Object.assign(TV[k], { slope: meta.targets[k].slope, rough: meta.targets[k].rough });
  try { volcanoes = await (await fetch('data/analog/volcanoes.json')).json(); } catch { volcanoes = []; }
  activeCells = ACTIVE.map(a => cellAt(a.lat, a.lon));
}
function cellAt(la, lo) {
  const r = Math.round((90 - la) / meta.dlat), c = ((Math.round((lo + 180) / meta.dlon) % meta.nlon) + meta.nlon) % meta.nlon;
  let best = -1, bd = 9;
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    const rr = r + dr, cc = (c + dc + meta.nlon) % meta.nlon; if (rr < 0 || rr >= meta.nlat) continue;
    const i = lookup[rr * meta.nlon + cc], d = Math.abs(dr) + Math.abs(dc); if (i >= 0 && d < bd) { bd = d; best = i; }
  }
  return best;
}

/* ---------------- движок сходства ---------------- */
const task = () => TASKS[state.task], tgt = () => task().target;
const taskText = k => { if (k !== 'custom') return t().tasks[k]; const c = t().custom, u = state.custom; return [c.title, c.desc, c.nameOf(c.body[u.body], u.lat, u.lon)]; };
function sub(m, target) {                                       // оценка 0…1 одной метрики для всех клеток
  const key = m.id + '|' + (m.near ? '' : target);
  if (subCache[key]) return subCache[key];
  const tv = TV[target], a = col[m.f], out = new Float32Array(N);
  if (!m.ok || (!m.near && (tv[m.id] === null || tv[m.id] === undefined))) return (subCache[key] = null);
  const ref = m.near ? 0 : (m.id === 'temp' && tv.cold) ? tmin.temp : tr(m, tv[m.id]), sg = sigma[m.id];
  for (let i = 0; i < N; i++) { const v = a[i]; out[i] = !Number.isFinite(v) ? NaN : m.near ? Math.exp(-v / m.near) : Math.exp(-0.5 * ((tr(m, v) - ref) / sg) ** 2); }
  return (subCache[key] = out);
}
const usedMetrics = () => METRICS.filter(m => task().w[m.id] && m.ok && sub(m, tgt()));
function compute() {
  const parts = usedMetrics().map(m => ({ w: task().w[m.id], s: sub(m, tgt()) })), wAll = parts.reduce((a, p) => a + p.w, 0) || 1;
  score = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let sw = 0, ss = 0;
    for (const p of parts) { const v = p.s[i]; if (v === v) { sw += p.w; ss += p.w * v; } }
    score[i] = sw >= 0.6 * wAll ? 100 * ss / sw : NaN;
    if (state.noIce[state.task] && (col.alb[i] >= ICE_ALB || col.ice[i] >= 0.5 || (!(col.alb[i] >= 0) && Math.abs(lat[i]) > 65))) score[i] = NaN;       // ледяные щиты не годятся для отработки работы на камне и грунте
  }
  order = Array.from({ length: N }, (_, i) => i).filter(i => score[i] === score[i]).sort((a, b) => score[b] - score[a]);
  rank = new Int32Array(N).fill(-1); cum = new Float64Array(order.length); let acc = 0; order.forEach((i, r) => { rank[i] = r; cum[r] = acc; acc += area[i]; }); areaAll = acc || 1;
  // кандидаты: лучшие клетки, не ближе 300 км к известным и действующим полигонам и не ближе 500 км друг к другу
  const known = [...SITES.map(s => [s.lat, s.lon]), ...ACTIVE.map(a => [a.lat, a.lon])];
  shortlist = [];
  for (const i of order) {
    if (known.some(k => hav(lat[i], lon[i], k[0], k[1]) < NEW_KM)) continue;
    if (shortlist.every(j => hav(lat[i], lon[i], lat[j], lon[j]) > SPACING_KM)) { shortlist.push(i); if (shortlist.length === NCAND) break; }
  }
}
const pctOf = i => rank[i] < 0 ? null : Math.max(1, Math.round(100 * (1 - cum[rank[i]] / areaAll)));
const simOf = (m, i) => { const s = sub(m, tgt()); return s && Number.isFinite(s[i]) ? Math.round(100 * s[i]) : null; };

/* ---------------- живые данные NASA POWER ---------------- */
const live = {};                                                 // индекс клетки → { mean, min, max, precip, days, end } | { error }
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
async function fetchLive(i) {
  const end = new Date(Date.now() - 4 * 864e5), start = new Date(end.getTime() - (LIVE_DAYS - 1) * 864e5);   // у POWER задержка около 3 суток
  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,T2M_MIN,T2M_MAX,PRECTOTCORR&community=RE&longitude=${lon[i].toFixed(3)}&latitude=${lat[i].toFixed(3)}&start=${ymd(start)}&end=${ymd(end)}&format=JSON`;
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error('http ' + r.status);
    const p = (await r.json()).properties.parameter, vals = k => Object.values(p[k] || {}).filter(v => v > -900);
    const t2 = vals('T2M'), tn = vals('T2M_MIN'), tx = vals('T2M_MAX'), pr = vals('PRECTOTCORR');
    if (!t2.length) throw new Error('empty');
    const last = Object.keys(p.T2M).filter(k => p.T2M[k] > -900).pop();
    live[i] = { mean: t2.reduce((a, b) => a + b, 0) / t2.length, min: Math.min(...tn), max: Math.max(...tx), precip: pr.reduce((a, b) => a + b, 0), days: t2.length, end: last };
  } catch (e) { live[i] = { error: String(e.message || e) }; } finally { clearTimeout(to); }
}
let liveRun = Promise.resolve();
function loadLive(force = false) {
  const ids = [...new Set([...activeCells, ...shortlist])].filter(i => i >= 0 && (force || !live[i] || live[i].error));
  if (!ids.length) return liveRun;
  liveRun = liveRun.then(async () => {
    state.liveFailed = false; let n = 0;
    state.liveBusy = [0, ids.length]; renderLeft();
    const queue = ids.slice(), worker = async () => {              // 3 запроса одновременно с паузой: POWER ограничивает частоту
      while (queue.length) {
        const i = queue.shift(); await fetchLive(i); if (live[i].error) state.liveFailed = true; n++;
        state.liveBusy = [n, ids.length]; renderLeft();
        await new Promise(r => setTimeout(r, 300));
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    state.liveBusy = null; state.liveAt = new Date().toLocaleTimeString(state.lang === 'az' ? 'az-AZ' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
    const ends = Object.values(live).filter(v => v.end).map(v => v.end).sort(); state.liveEnd = ends.length ? ends[ends.length - 1] : '';
    renderLeft(); renderRight();
  });
  return liveRun;
}
const dateStr = s => s ? `${s.slice(6, 8)}.${s.slice(4, 6)}.${s.slice(0, 4)}` : '';

/* ---------------- рекомендации: алгоритм и ИИ ---------------- */
const cname = i => { const n = meta.countries[country[i]]; return n === '—' ? '' : state.lang === 'az' ? (AZ_COUNTRY[n] || EN_COUNTRY[n] || n) : (EN_COUNTRY[n] || n); };
const coords = i => `${t().lat(lat[i])}, ${t().lon(lon[i])}`;
function nearestVolcano(i) { let b = null; for (const v of volcanoes) { if (!v[3]) continue; const d = hav(lat[i], lon[i], v[1], v[0]); if (!b || d < b.d) b = { name: v[2], d }; } return b; }
const title = i => { const c = cname(i); if (c) return c; const v = nearestVolcano(i); return v && v.d < 150 ? v.name : coords(i); };
const aiCache = {};
function tvalOf(m) { const tg = TV[tgt()], tm = meta.targets[tgt()]; return m.near ? '0' : m.id === 'slope' ? fmt(tm.slope, 1) : m.id === 'rough' ? fmt(tm.rough, 0) : (m.id === 'temp' && tg.cold) ? '< −183' : fmt(tg[m.id], m.d); }
const uTxt = m => m.unit && m.unit !== '0–1' ? ' ' + unitOf(m.unit) : '';
const mval = (m, i) => `${fmt(col[m.f][i], m.d)}${uTxt(m)}`, tshow = m => `${tvalOf(m)}${uTxt(m)}`;
function algoPicks() {                                              // быстрый первый вариант: два лучших кандидата
  return shortlist.slice(0, 2).map(i => localOne(i, false));
}
function localOne(i, withLive) {                                    // обоснование из чисел: сильные и слабые стороны, живые данные
  const w = task().w, tv = t(), L = tv.lm;
  const rows = usedMetrics().map(m => ({ m, s: simOf(m, i), w: w[m.id] })).filter(r => r.s !== null);
  const strong = rows.filter(r => r.s >= 85).sort((a, b) => b.w - a.w || b.s - a.s).slice(0, 3), weak = rows.filter(r => r.s < 50).sort((a, b) => b.w - a.w || a.s - b.s).slice(0, 2);
  const f = r => `${tv.m[r.m.id].toLowerCase()} ${mval(r.m, i)} (${L.vs} ${tshow(r.m)}, ${r.s} %)`;
  let why = strong.length ? `${L.strong}: ${strong.map(f).join('; ')}.` : '';
  const v = withLive ? live[i] : null;
  if (v && !v.error) why += ` ${L.live(v.days)}: ${tv.tmean} ${fmt(v.mean, 1)} °C, ${tv.precip} ${fmt(v.precip, 1)} mm (${v.precip < 5 ? L.dry : L.wet}).`;
  const risks = `${weak.length ? `${L.weak}: ${weak.map(f).join('; ')}.` : L.none} ${L.notAssessed}`;
  return { id: i, why, risks };
}
function localPicks() {                                             // второй выбор — из другого региона (≥ 1500 км от первого), чтобы тренировки были разнообразными
  const first = shortlist[0], rest = shortlist.slice(1), far = rest.find(j => hav(lat[first], lon[first], lat[j], lon[j]) >= 1500), second = far ?? rest[0];
  return { picks: [first, second].map(i => localOne(i, true)), summary: t().lm.summary(`${title(first)} (${fmt(score[first], 0)})`, `${title(second)} (${fmt(score[second], 0)})`, far !== undefined) };
}
function setPicks() {
  const c = aiCache[state.task];
  if (c && c.ids.join() === shortlist.join()) { state.picks = c.picks; state.pickSrc = { ai: c.engine === 'model', local: c.engine === 'local', model: c.model, summary: c.summary }; }
  else { state.picks = algoPicks(); state.pickSrc = { ai: false, local: false, summary: '' }; }
}
function payload() {
  const metricsOf = i => Object.fromEntries(usedMetrics().map(m => [m.id, { name: t().m[m.id], value: Number.isFinite(col[m.f][i]) ? +col[m.f][i].toFixed(3) : null, unit: m.unit, match_percent: simOf(m, i) }]));
  const liveOf = i => live[i] && !live[i].error ? { period_days: live[i].days, through: live[i].end, mean_air_temp_C: +live[i].mean.toFixed(1), min_C: +live[i].min.toFixed(1), max_C: +live[i].max.toFixed(1), total_precip_mm: +live[i].precip.toFixed(1) } : null;
  const tv = TV[tgt()], tm = meta.targets[tgt()];
  return {
    lang: state.lang, task: taskText(state.task)[0], task_description: taskText(state.task)[1],
    metric_weights: task().w, ice_sheets_excluded: !!state.noIce[state.task],
    target: { name: taskText(state.task)[2], body: tm.body, lat: tm.lat, lon_east: tm.lon, elevation_m: tm.elev, mean_temp_C: tv.cold ? '< −183 (permanently shadowed crater floor)' : tv.temp ?? 'not available', mean_slope_deg: tm.slope, roughness_m: tm.rough, albedo: tv.alb, user_notes: state.task === 'custom' && state.custom.notes.trim() ? state.custom.notes.trim().slice(0, 600) : undefined, known_facts: (TARGETS[tgt()]?.facts || []).map(f => ({ label: f[0], value: f[1], source: f[2] })), source: 'NASA MOLA/LOLA terrain, NASA NSSDC fact sheets' },
    nasa_training_polygons: ACTIVE.map((a, k) => ({ name: a.name.en, lat: a.lat, lon: a.lon, similarity_score: activeCells[k] >= 0 && score[activeCells[k]] === score[activeCells[k]] ? Math.round(score[activeCells[k]]) : null, metrics: activeCells[k] >= 0 ? metricsOf(activeCells[k]) : null, live: activeCells[k] >= 0 ? liveOf(activeCells[k]) : null })),
    candidates: shortlist.map(i => ({ id: i, country: meta.countries[country[i]], lat: +lat[i].toFixed(2), lon: +lon[i].toFixed(2), elevation_m: Math.round(col.elev[i]), similarity_score: Math.round(score[i]), metrics: metricsOf(i), live: liveOf(i) })),
  };
}
async function askAI(text) {                                        // демо: текст → сценарий по ключевым словам → анализ
  const q = (text || '').toLowerCase();
  if (!q.trim()) { $('#askTxt')?.focus(); return; }
  const k = /olimp|olymp|vulkan|volcan|lava/.test(q) ? 'olympus' : /geyl|gale|şarp|sharp|curiosity/.test(q) ? 'gale' : /hellas/.test(q) ? 'hellas'
    : /(^|[^a-zəğıöşüç])ay([^a-zəğıöşüç]|$)|ayın|moon|lunar|şeklton|shackleton|artemis/.test(q) ? 'lunar' : 'msr';
  await selectTask(k); runAI();
}
async function runAI() {
  if (state.aiBusy) return;
  state.aiBusy = true; state.aiErr = ''; renderRight();
  const taskAtStart = state.task, shortAtStart = shortlist.join();
  try {
    await Promise.race([loadLive(), new Promise(r => setTimeout(r, 25000))]);      // не ждём живые данные дольше 25 с: недостающие уйдут как «нет данных»
    if (state.task !== taskAtStart || shortlist.join() !== shortAtStart) { state.aiBusy = false; renderRight(); return; }   // пользователь сменил задачу
    const ids = shortlist.slice();
    let done = null;
    if (state.ai.available) {                                                         // бесплатная/платная языковая модель через локальный сервер
      try {
        const r = await fetch('/api/recommend', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload()) });
        const j = await r.json().catch(() => ({}));
        if (r.ok) done = { ids, picks: j.picks, model: `${j.provider} · ${j.model}`, summary: j.summary, engine: 'model' };
        else state.aiErr = `${t().fellBack} (${j.error || r.status}${j.detail ? ': ' + String(j.detail).slice(0, 140) : ''})`;
      } catch { state.aiErr = t().fellBack; }
    }
    if (!done) { const l = localPicks(); done = { ids, picks: l.picks, summary: l.summary, model: 'local', engine: 'local' }; }
    if (state.task === taskAtStart) { aiCache[state.task] = done; setPicks(); }
  } catch (e) { state.aiErr = String(e.message || e); }
  state.aiBusy = false; drawMarks(); renderCands(); renderRight();
}

/* ---------------- карта ---------------- */
const map = $('#map'), world = $('#world'), heat = $('#heat'), marks = $('#marks');
const view = { s: 1, x: 0, y: 0, W: 0, H: 0 };
function layout() {
  const box = map.parentElement, head = $('.maphead'), foot = $('#foot');
  const availH = box.clientHeight - head.offsetHeight - foot.offsetHeight - 150, w = Math.max(320, Math.min(box.clientWidth, availH * 2));
  map.style.width = w + 'px'; map.style.height = w / 2 + 'px';
  view.W = w; view.H = w / 2; world.style.width = w + 'px'; world.style.height = w / 2 + 'px'; apply();
}
function apply() {
  view.s = Math.max(1, Math.min(14, view.s));
  view.x = Math.min(0, Math.max(view.W - view.W * view.s, view.x)); view.y = Math.min(0, Math.max(view.H - view.H * view.s, view.y));
  world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`; world.style.setProperty('--inv', 1 / view.s);
}
function zoomAt(mx, my, f) { const s0 = view.s, s1 = Math.max(1, Math.min(14, s0 * f)); view.x = mx - (mx - view.x) * s1 / s0; view.y = my - (my - view.y) * s1 / s0; view.s = s1; apply(); }
function flyTo(la, lo, s = Math.max(view.s, 3.2)) {
  world.classList.add('fly'); view.s = s;
  view.x = view.W / 2 - (lo + 180) / 360 * view.W * s; view.y = view.H / 2 - (90 - la) / 180 * view.H * s; apply();
  setTimeout(() => world.classList.remove('fly'), 750);
}
const toGeo = (mx, my) => [90 - (my - view.y) / (view.H * view.s) * 180, (mx - view.x) / (view.W * view.s) * 360 - 180];
const pos = (la, lo) => `left:${((lo + 180) / 360 * 100).toFixed(4)}%;top:${((90 - la) / 180 * 100).toFixed(4)}%`;
map.addEventListener('wheel', e => { e.preventDefault(); const r = map.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.25 : 0.8); }, { passive: false });
let drag = null;
map.addEventListener('pointerdown', e => { if (e.target.closest('.zoom, .legend')) return; drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false }; map.setPointerCapture(e.pointerId); });
map.addEventListener('pointermove', e => {
  const r = map.getBoundingClientRect();
  if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; if (drag.moved) { view.x = drag.vx + dx; view.y = drag.vy + dy; apply(); } }
  if (!score) return;
  const [la, lo] = toGeo(e.clientX - r.left, e.clientY - r.top), i = cellAt(la, lo), tip = $('#tip');
  if (i < 0 || drag?.moved) { tip.hidden = true; return; }
  tip.hidden = false; tip.style.left = Math.min(r.width - 220, e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top + 14) + 'px';
  tip.innerHTML = `<b>${score[i] === score[i] ? fmt(score[i], 0) : '—'}</b> ${esc([title(i), coords(i)].filter((x, n, a) => a.indexOf(x) === n).join(' · '))}`;
});
map.addEventListener('pointerup', e => {
  const d = drag; drag = null; if (!d || d.moved || !score) return;
  const mk = e.target.closest('[data-i]'); if (mk) { select(+mk.dataset.i, false); return; }
  const r = map.getBoundingClientRect(), [la, lo] = toGeo(e.clientX - r.left, e.clientY - r.top), i = cellAt(la, lo);
  if (i >= 0) select(i, false);
});
map.addEventListener('pointerleave', () => { $('#tip').hidden = true; });
$('#zin').onclick = () => zoomAt(view.W / 2, view.H / 2, 1.5); $('#zout').onclick = () => zoomAt(view.W / 2, view.H / 2, 1 / 1.5);
window.addEventListener('resize', layout);

const RAMP = (() => {                                            // 0…1 → цвет: тёмно-синий → серо-голубой → почти белый (жёлтый и синий оставлены для меток)
  const stops = [[0, 20, 30, 46, 0], [0.35, 36, 62, 88, 110], [0.65, 76, 128, 158, 170], [0.88, 150, 196, 214, 215], [1, 236, 246, 250, 238]], lut = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) { const x = i / 255; let k = 0; while (k < stops.length - 2 && x > stops[k + 1][0]) k++; const a = stops[k], b = stops[k + 1], f = (x - a[0]) / (b[0] - a[0]); for (let c = 0; c < 4; c++) lut[i * 4 + c] = a[c + 1] + (b[c + 1] - a[c + 1]) * f; }
  return lut;
})();
function drawHeat() {
  const ctx = heat.getContext('2d'), img = ctx.createImageData(meta.nlon, meta.nlat), px = img.data;
  const lo = score[order[Math.floor(order.length * 0.55)]], hi = score[order[Math.floor(order.length * 0.004)]];
  for (let i = 0; i < N; i++) { const v = score[i]; if (v !== v) continue; const k = Math.max(0, Math.min(255, Math.round(255 * (v - lo) / (hi - lo || 1)))) * 4, p = idx[i] * 4; px[p] = RAMP[k]; px[p + 1] = RAMP[k + 1]; px[p + 2] = RAMP[k + 2]; px[p + 3] = RAMP[k + 3]; }
  ctx.putImageData(img, 0, 0);
}
function drawMarks() {
  const activeRefs = new Set(ACTIVE.map(a => a.ref)), pickIds = state.picks.map(p => p.id);
  let h = '';
  if (state.volcs) h += volcanoes.filter(v => v[3] === 2).map(v => `<i class="vd" style="${pos(v[1], v[0])}"></i>`).join('');
  h += SITES.filter(s => !activeRefs.has(s.id)).map(s => `<i class="kd" style="${pos(s.lat, s.lon)}" title="${esc(s.name)}"></i>`).join('');
  h += shortlist.filter(i => !pickIds.includes(i)).map(i => `<button class="cd${i === state.sel ? ' on' : ''}" data-i="${i}" style="${pos(lat[i], lon[i])}" aria-label="${esc(title(i))}"></button>`).join('');
  h += ACTIVE.map((a, k) => `<button class="ap${activeCells[k] === state.sel ? ' on' : ''}" data-i="${activeCells[k]}" style="${pos(a.lat, a.lon)}" aria-label="${esc(a.name[state.lang])}"><span>${esc(a.name[state.lang].split(':')[0])}</span></button>`).join('');
  h += state.picks.map((p, n) => `<button class="pk${p.id === state.sel ? ' on' : ''}" data-i="${p.id}" style="${pos(lat[p.id], lon[p.id])}" aria-label="${esc(title(p.id))}">${n + 1}</button>`).join('');
  if (state.sel >= 0 && ![...pickIds, ...shortlist, ...activeCells].includes(state.sel)) h += `<span class="sl" style="${pos(lat[state.sel], lon[state.sel])}"></span>`;
  marks.innerHTML = h;
}

/* ---------------- панели ---------------- */
const mpos = (la, lo) => `left:${(((lo % 360) + 360) % 360 / 360 * 100).toFixed(3)}%;top:${((90 - la) / 180 * 100).toFixed(3)}%`;
function bodyOf(k) { const tk = TASKS[k].target; return tk === 'custom' ? (TASKS[k].at ? TASKS[k].at.body : state.custom.body) : meta.targets[tk].body; }
function coordOf(k) { const tk = TASKS[k].target; if (tk !== 'custom') { const m = meta.targets[tk]; return [m.lat, m.lon]; } const a = k === 'custom' ? state.custom : TASKS[k].at; return [a.lat, a.lon]; }
async function selectTask(k) {
  state.task = k; state.sel = -1; const a = TASKS[k].at; if (a) Object.assign(state.custom, a);
  if (TASKS[k].target === 'custom') await setCustom();
  refresh();
}
async function pickPoint(body, la, lo) {                      // свободный выбор точки на мини-карте или в форме
  Object.assign(state.custom, { body, lat: +la.toFixed(2), lon: +(((lo % 360) + 360) % 360).toFixed(2) });
  state.task = 'custom'; state.sel = -1; await setCustom(); refresh(); runAI();
}
const DEFAULT_AT = { mars: { lat: 18.65, lon: 226.2 }, moon: { lat: 20, lon: 30 } };
function renderLeft() {
  const tv = t(), tk = tgt(), tm = meta.targets[tk], tvv = TV[tk], body = tm.body, facts = state.lang === 'az' && TARGETS[tk] ? TARGETS[tk].facts : null;
  const trow = (label, val, unit) => `<tr><th>${label}</th><td>${val}${unit ? `<small> ${esc(unit)}</small>` : ''}</td></tr>`;
  const live_ = state.liveBusy ? tv.liveBusy(state.liveBusy[0], state.liveBusy[1]) : state.liveEnd ? tv.liveOk(dateStr(state.liveEnd), state.liveAt) : state.liveFailed ? tv.liveFail : tv.liveNone;
  const pins = Object.keys(TASKS).filter(k => k !== 'custom' && bodyOf(k) === body).map(k => { const c = coordOf(k); return `<button class="mp${k === state.task ? ' on' : ''}" data-scen="${k}" style="${mpos(c[0], c[1])}" title="${esc(taskText(k)[0])}" aria-label="${esc(taskText(k)[0])}"></button>`; }).join('')
    + (state.task === 'custom' ? `<span class="mp cu" style="${mpos(state.custom.lat, state.custom.lon)}"></span>` : '');
  $('#left').innerHTML = `
    <section><h2>${tv.scen}</h2>
      <div class="tasks" role="radiogroup">${Object.keys(TASKS).map(k => { const x = taskText(k); return `<button role="radio" aria-checked="${k === state.task}" class="task ${bodyOf(k)}${k === state.task ? ' on' : ''}" data-task="${k}"><i class="glyph"></i><b>${x[0]}</b>${x[3] ? `<em>${x[3]}</em>` : ''}<span>${x[1]}</span></button>`; }).join('')}</div></section>
    <section><div class="h2row"><h2>${tv.tplace}</h2><div class="seg2" role="group">${['mars', 'moon'].map(b => `<button type="button" data-body="${b}" class="${body === b ? 'on' : ''}">${tv.custom.body[b]}</button>`).join('')}</div></div>
      <div class="mini" id="mini" data-body="${body}"><div class="pins">${pins}</div></div><p class="small">${tv.miniHint}</p>
      <p class="tname">${taskText(state.task)[2]}</p>
      <table class="kv">
        ${trow(tv.custom.elev, fmt(tm.elev, 0), unitOf('m'))}${trow(tv.m.slope, fmt(tm.slope, 1), unitOf('°'))}${trow(tv.m.rough, fmt(tm.rough, 0), unitOf('m'))}
        ${tvv.temp === null || tvv.temp === undefined ? '' : trow(tv.m.temp, tvv.cold ? '< −183' : fmt(tvv.temp, 0), unitOf('°C'))}${trow(tv.m.alb, fmt(tvv.alb, 2), unitOf('0–1'))}
      </table><p class="small">NASA MOLA / LOLA, NSSDC</p>
      ${facts ? `<ul class="facts">${facts.slice(0, 5).map(f => `<li><span>${esc(f[0])}</span><b>${esc(f[1])}</b></li>`).join('')}</ul><p class="small">${tv.factsSrc}</p>` : ''}
      ${state.task === 'custom' ? customForm() : ''}</section>
    <section><h2>${tv.metricsUsed}</h2>
      <ul class="mlist">${METRICS.filter(m => task().w[m.id]).map(m => `<li><span><b>${tv.m[m.id]}</b>, ${esc(unitOf(m.unit))}<small>${tv.mhelp[m.id]}</small></span><i class="imp" title="${tv.importance}">${[1, 2, 3].map(n => `<u class="${task().w[m.id] >= n - 0.4 ? 'on' : ''}"></u>`).join('')}</i></li>`).join('')}</ul>
      <label class="chk"><input type="checkbox" id="ckIce" ${state.noIce[state.task] ? 'checked' : ''}> ${tv.ice}</label><p class="small">${tv.iceHint}</p></section>
    <section><h2>${tv.live}</h2><p class="small">${tv.liveSub(LIVE_DAYS)}</p><p class="livestat">${live_}</p>
      <button class="btn" id="btnLive" ${state.liveBusy ? 'disabled' : ''}>${tv.refresh}</button></section>`;
  $$('[data-task]').forEach(b => b.onclick = () => selectTask(b.dataset.task));
  $$('[data-body]').forEach(b => b.onclick = () => { if (b.dataset.body === body) return; const d = DEFAULT_AT[b.dataset.body]; pickPoint(b.dataset.body, d.lat, d.lon); });
  $('#ckIce').onchange = e => { state.noIce[state.task] = e.target.checked; state.sel = -1; refresh(); };
  $('#btnLive').onclick = () => loadLive(true);
  bindCustom(); attachMini(body);
}
function customForm() {
  const c = t().custom, u = state.custom;
  return `<div class="cform"><div class="row2"><label>${c.latL}<input id="cLat" inputmode="decimal" value="${u.lat}"></label><label>${c.lonL}<input id="cLon" inputmode="decimal" value="${u.lon}"></label></div>
    <label class="notes">${c.notes}<textarea id="cNotes" rows="3" maxlength="600">${esc(u.notes)}</textarea><small>${c.notesHint}</small></label>
    <button type="button" class="btn primary" id="cFind">${c.find}</button></div>`;
}
function bindCustom() {
  if (state.task !== 'custom') return;
  $('#cNotes').oninput = e => { state.custom.notes = e.target.value; };
  $('#cFind').onclick = () => {
    const la = parseFloat($('#cLat').value.replace(',', '.')), lo = parseFloat($('#cLon').value.replace(',', '.'));
    if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || lo < -180 || lo > 360) return;
    state.custom.notes = $('#cNotes').value; pickPoint(state.custom.body, la, lo);
  };
}

// ---- рельеф точки на Марсе/Луне считается в браузере тем же способом, что в tools/analog_build.py (окно 5×5 точек через 18.5 км)
const DEMS = { mars: { url: 'data/analog/dem_mars.bin', w: 1440, h: 720, R: 3389.5, alb: 0.25, temp: -59 }, moon: { url: 'data/analog/dem_moon.bin', w: 720, h: 360, R: 1737.4, alb: 0.11, temp: null } };
async function demOf(b) { const d = DEMS[b]; if (!d.data) d.data = new Int16Array(await (await fetch(d.url)).arrayBuffer()); return d; }
function demAt(d, la, lo) {
  let y = (90 - la) / 180 * d.h - 0.5, x = (((lo % 360) + 360) % 360) / 360 * d.w - 0.5; y = Math.max(0, Math.min(d.h - 1.001, y));
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, g = (yy, xx) => d.data[yy * d.w + (((xx % d.w) + d.w) % d.w)];
  return g(y0, x0) * (1 - fx) * (1 - fy) + g(y0, x0 + 1) * fx * (1 - fy) + g(y0 + 1, x0) * (1 - fx) * fy + g(y0 + 1, x0 + 1) * fx * fy;
}
function terrainOf(d, la, lo) {
  const P = Math.PI / 180, z = [], a1 = la * P;
  for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) {
    const ex = (i - 2) * 18.5, ny = (j - 2) * 18.5, dd = Math.hypot(ex, ny) / d.R, b = Math.atan2(ex, ny);
    const a2 = Math.asin(Math.max(-1, Math.min(1, Math.sin(a1) * Math.cos(dd) + Math.cos(a1) * Math.sin(dd) * Math.cos(b))));
    const o2 = lo * P + Math.atan2(Math.sin(b) * Math.sin(dd) * Math.cos(a1), Math.cos(dd) - Math.sin(a1) * Math.sin(a2));
    z.push(demAt(d, a2 / P, o2 / P));
  }
  let gx = 0, gy = 0; for (let j = 0; j < 5; j++) for (let i = 0; i < 4; i++) gx += Math.abs(z[j * 5 + i + 1] - z[j * 5 + i]); for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) gy += Math.abs(z[(j + 1) * 5 + i] - z[j * 5 + i]);
  gx /= 20; gy /= 20; const mean = z.reduce((a, b) => a + b, 0) / 25;
  return { slope: Math.atan((gx + gy) / 2 / 18500) / P, rough: Math.sqrt(z.reduce((a, b) => a + (b - mean) ** 2, 0) / 25), elev: demAt(d, la, lo) };
}
async function setCustom() {
  const u = state.custom, d = await demOf(u.body), r = terrainOf(d, u.lat, u.lon);
  meta.targets.custom = { body: u.body, lat: u.lat, lon: u.lon, slope: +r.slope.toFixed(3), rough: +r.rough.toFixed(1), elev: Math.round(r.elev) };
  TV.custom = { temp: d.temp, prec: 0, veg: 0, alb: d.alb, slope: meta.targets.custom.slope, rough: meta.targets.custom.rough };
  for (const k of Object.keys(subCache)) if (k.endsWith('|custom')) delete subCache[k];
  delete aiCache[state.task];
}
// мини-карта цели: теневой рельеф по MOLA/LOLA (рисуется один раз на тело)
const shadeCache = {};
function shadeCanvas(d, body) {
  const cv = document.createElement('canvas'); cv.width = d.w; cv.height = d.h; const ctx = cv.getContext('2d'), img = ctx.createImageData(d.w, d.h);
  let lo = Infinity, hi = -Infinity; for (let i = 0; i < d.data.length; i += 7) { lo = Math.min(lo, d.data[i]); hi = Math.max(hi, d.data[i]); }
  const tint = body === 'mars' ? [1.0, 0.72, 0.55] : [0.9, 0.92, 0.96];
  for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) {
    const h = d.data[y * d.w + x], hl = d.data[y * d.w + Math.max(0, x - 1)], hu = d.data[Math.max(0, y - 1) * d.w + x];
    const sh = Math.max(0.15, Math.min(1.4, 0.8 + ((hl - h) + (hu - h)) / (body === 'mars' ? 900 : 500))), k = 0.25 + 0.6 * (h - lo) / (hi - lo), p = (y * d.w + x) * 4;
    for (let c = 0; c < 3; c++) img.data[p + c] = Math.min(255, 255 * k * sh * tint[c] * 1.1); img.data[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); return cv;
}
async function attachMini(body) {
  if (!shadeCache[body]) shadeCache[body] = shadeCanvas(await demOf(body), body);
  const host = $('#mini'); if (!host || host.dataset.body !== body || $('canvas', host)) return;
  const src = shadeCache[body], c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); host.prepend(c);
  host.onclick = e => {
    const pin = e.target.closest('[data-scen]'); if (pin) { selectTask(pin.dataset.scen); return; }
    const r = host.getBoundingClientRect(); pickPoint(body, 90 - (e.clientY - r.top) / r.height * 180, (e.clientX - r.left) / r.width * 360);
  };
}

function metricTable(i) {
  const tv = t(), tg = TV[tgt()], tm = meta.targets[tgt()];
  return `<table class="mt"><thead><tr><th>${tv.metric}</th><td>${tv.earth}</td><td>${tv.tgt}</td><td>${tv.match}</td></tr></thead><tbody>${usedMetrics().map(m => {
    const tval = m.near ? '0' : m.id === 'slope' ? fmt(tm.slope, 1) : m.id === 'rough' ? fmt(tm.rough, 0) : m.id === 'temp' && tg.cold ? '< −183' : fmt(tg[m.id], m.d);
    const s = simOf(m, i);
    return `<tr><th>${tv.m[m.id]}</th><td>${num(col[m.f][i], m)}</td><td>${tval}<small> ${esc(unitOf(m.unit))}</small></td><td class="sim">${s === null ? `<small>${tv.noData}</small>` : `<span class="sbar"><i style="width:${s}%"></i></span>${s}<small> %</small>`}</td></tr>`;
  }).join('')}</tbody></table>`;
}
function liveBlock(i) {
  const v = live[i], tv = t(); if (!v || v.error) return '';
  return `<p class="livebox"><b>${tv.lastDays(v.days)}</b> · NASA POWER<br>${tv.tmean}: ${fmt(v.mean, 1)} <small>°C</small> · ${tv.tmin} ${fmt(v.min, 1)} · ${tv.tmax} ${fmt(v.max, 1)} <small>°C</small> · ${tv.precip}: ${fmt(v.precip, 1)} <small>${state.lang === 'az' ? 'mm' : 'mm'}</small></p>`;
}
function renderRight() {
  const tv = t(), src = state.pickSrc, best = state.picks;
  const aiNote = state.aiErr ? `<p class="err">${esc(state.aiErr)}</p>` : !state.ai.available && !state.ai.noServer ? `<p class="small">${tv.optLM}</p>` : '';
  const A = tv.ask;
  let h = `<section class="ask"><h2>${A.title}</h2>
    <textarea id="askTxt" rows="3" placeholder="${esc(A.ph)}">${esc(state.askText)}</textarea>
    <button class="btn primary" id="askGo" ${state.aiBusy ? 'disabled' : ''}>${A.go}</button>
    <p class="lbl">${A.ex}</p>
    <div class="examples">${['mars', 'moon'].map(b => `<button type="button" class="ex ${b}" data-ex="${b}"><i class="glyph"></i><span><b>${A[b][0]}</b><small>${esc(A[b][1])}</small></span></button>`).join('')}</div>
    <p class="small">${A.note}</p></section>`;
  h += `<section class="ai"><h2>${tv.ai}</h2>
    <p class="srcline${src?.ai ? ' ai' : ''}">${src?.ai ? tv.srcAI(esc(src.model)) : src?.local ? tv.srcLocal : tv.srcReady}</p>
    <button class="btn primary" id="btnAI" ${state.aiBusy ? 'disabled' : ''}>${state.aiBusy ? (state.liveBusy ? `${tv.busy} ${state.liveBusy[0]}/${state.liveBusy[1]}` : tv.busy) : src?.ai || src?.local ? tv.rerun : tv.run}</button>${aiNote}
    ${src?.summary ? `<p class="summary">${esc(src.summary)}</p>` : ''}
    ${best.map((p, n) => `<article class="pick${p.id === state.sel ? ' on' : ''}" data-i="${p.id}"><header><span class="n">${n + 1}</span><div><h3>${esc(title(p.id))}</h3><p class="small">${esc(coords(p.id))} · ${num(col.elev[p.id], { d: 0, unit: 'm' })}</p></div><span class="gauge" style="--v:${Math.round(score[p.id])}"><b>${fmt(score[p.id], 0)}</b></span></header>
      ${p.why ? `<p><b>${tv.why}.</b> ${esc(p.why)}</p>` : ''}${p.risks ? `<p class="risk"><b>${tv.risks}.</b> ${esc(p.risks)}</p>` : ''}${liveBlock(p.id)}<div class="acts"><button class="btn" data-cmp="${p.id}">${tv.cmp}</button></div></article>`).join('')}</section>`;
  if (state.sel >= 0) {
    const i = state.sel, ak = activeCells.indexOf(i);
    h += `<section class="detail"><h2>${tv.sel}</h2><div class="dhead"><div><h3>${esc(ak >= 0 ? ACTIVE[ak].name[state.lang] : title(i))}</h3><p class="small">${esc(coords(i))} · ${num(col.elev[i], { d: 0, unit: 'm' })}${pctOf(i) ? ' · ' + tv.pct(pctOf(i)) : ''}</p></div><p class="big">${score[i] === score[i] ? fmt(score[i], 0) : '—'}<small>${tv.outOf}</small></p></div>
      ${ak >= 0 ? `<p class="small">${esc(ACTIVE[ak].why[state.lang])}</p><p class="srcs">${ACTIVE[ak].src.map(s => `<a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a>`).join('')}</p>` : ''}
      ${metricTable(i)}${liveBlock(i)}
      <div class="acts"><button class="btn primary" id="btnCmp">${tv.cmp}</button><a class="btn" href="skaner.html#${lat[i].toFixed(2)},${lon[i].toFixed(2)}">${tv.liveq}</a></div></section>`;
  }
  $('#right').innerHTML = h;
  const ba = $('#btnAI'); if (ba) ba.onclick = runAI;
  $('#askTxt').oninput = e => { state.askText = e.target.value; };
  $('#askGo').onclick = () => askAI(state.askText);
  $$('[data-ex]').forEach(b => b.onclick = () => { state.askText = tv.ask[b.dataset.ex][1]; askAI(state.askText); });
  $$('#right [data-i]').forEach(b => b.onclick = () => select(+b.dataset.i, true));
  const bc = $('#btnCmp'); if (bc) bc.onclick = openCompare;
  $$('[data-cmp]').forEach(b => b.onclick = e => { e.stopPropagation(); state.sel = +b.dataset.cmp; openCompare(); });
}
function renderCands() {
  const tv = t(), best = state.picks;
  $('#candbar').innerHTML = `<div class="candhead"><h2>${tv.cands}</h2><p class="small">${tv.candNote}</p></div><ol class="cands">${shortlist.map(i => { const k = best.findIndex(p => p.id === i); return `<li><button data-i="${i}" class="${i === state.sel ? 'on' : ''}"><span class="n${k >= 0 ? ' rec' : ''}">${k >= 0 ? k + 1 : ''}</span><span class="what"><b>${esc(title(i))}</b><small>${esc(coords(i))}</small></span><span class="sc">${fmt(score[i], 0)}</span></button></li>`; }).join('')}</ol>`;
  $$('#candbar [data-i]').forEach(b => b.onclick = () => select(+b.dataset.i, true));
}
function renderLegend() {
  const tv = t(), L = tv.legend;
  $('#legend').innerHTML = `<p><i class="k ap"></i>${L.active}</p><p><i class="k pk"></i>${L.rec}</p><p><i class="k cd"></i>${L.cand}</p><p><i class="k kd"></i>${L.known}</p>
    <p class="ramp"><span>${L.low}</span><i></i><span>${L.high}</span></p><label><input type="checkbox" id="ckV" ${state.volcs ? 'checked' : ''}> ${tv.volc}</label>`;
  $('#ckV').onchange = e => { state.volcs = e.target.checked; drawMarks(); };
}
function renderChrome() {
  const tv = t();
  document.documentElement.lang = state.lang; $('#how').textContent = tv.how; $('#tagline').textContent = tv.tagline;
  ['tabPlat', 'tabScan', 'tabGame', 'tabDeck'].forEach((id, n) => { $('#' + id).textContent = tv.tabs[n]; });
  $$('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === state.lang));
  $('#mtitle').textContent = tv.mtitle(taskText(state.task)[0]); $('#mstatus').textContent = tv.mstatus(fmt(N));
  $('#foot').textContent = tv.foot; $('#cmpClose').textContent = tv.close;
}
function refresh() {
  compute(); setPicks();
  if (state.sel < 0 && state.picks.length) state.sel = state.picks[0].id;
  drawHeat(); drawMarks(); renderChrome(); renderLegend(); renderLeft(); renderCands(); renderRight(); loadLive();
}
function select(i, fly) { state.sel = i; drawMarks(); renderCands(); renderRight(); if (fly) flyTo(lat[i], lon[i]); }

/* ---------------- 3D-сравнение ---------------- */
let cmpHandle = null;
async function openCompare() {
  const i = state.sel; if (i < 0) return;
  const tv = t(), tm = meta.targets[tgt()], KM = 600, EX = 12;
  $('#cmp').hidden = false; $('#cmpTitle').textContent = tv.cmpTitle(`${tv.earth}: ${title(i)}`, taskText(state.task)[2]);
  $('#capEarth').textContent = `${tv.earth} · ${title(i)} · ${coords(i)}`; $('#capTarget').textContent = `${taskText(state.task)[2]} · ${tv.lat(tm.lat)}, ${tv.lon(tm.lon)}`;
  $('#cmpNote').textContent = tv.cmpNote(KM, EX); $('#cmpRows').innerHTML = metricTable(i);
  const mod = await import('./analog3d.js');
  if (cmpHandle) cmpHandle.close();
  cmpHandle = await mod.openCompare($('#vEarth'), $('#vTarget'), { body: 'earth', lat: lat[i], lon: lon[i] }, { body: tm.body, lat: tm.lat, lon: tm.lon }, { sizeKm: KM, exag: EX });
}
function closeCompare() { $('#cmp').hidden = true; if (cmpHandle) { cmpHandle.close(); cmpHandle = null; } }
$('#cmpClose').onclick = closeCompare;
$('#cmp').addEventListener('click', e => { if (e.target.id === 'cmp') closeCompare(); });

/* ---------------- метод и источники ---------------- */
function openAbout() {
  const az = state.lang === 'az', tm = meta.targets, tv = t();
  const src = [
    ['NASA POWER Climatology and Daily APIs (MERRA-2, CERES SYN1deg)', 'https://power.larc.nasa.gov/docs/', az ? 'temperatur, yağıntı, albedo; canlı son-30-gün sorğusu' : 'temperature, precipitation, albedo; live last-30-days request'],
    ['NASA Blue Marble Next Generation', 'https://visibleearth.nasa.gov/collection/1484/blue-marble', az ? 'bitki örtüyü indeksi (rənglərdən)' : 'vegetation index (from colours)'],
    ['NOAA NCEI ETOPO5', 'https://www.ngdc.noaa.gov/mgg/global/etopo5.HTML', az ? 'Yerin relyefi: yamac, kələ-kötürlük' : 'Earth terrain: slope, roughness'],
    ['NASA PDS: MGS MOLA MEGDR', 'https://pds-geosciences.wustl.edu/missions/mgs/megdr.html', az ? 'Marsın relyefi' : 'Mars terrain'],
    ['NASA PDS: LRO LOLA LDEM', 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm', az ? 'Ayın relyefi' : 'Moon terrain'],
    ['NASA NSSDC Mars and Moon Fact Sheets', 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/', az ? 'hədəf dəyərləri: −59 °C, albedo 0,25 və 0,11' : 'target values: −59 °C, albedo 0.25 and 0.11'],
    ['Zuber et al., 2012, Nature', 'https://doi.org/10.1038/nature11216', az ? 'Şeklton kraterinin dibi: < 90 K' : 'Shackleton crater floor: < 90 K'],
    ['Smithsonian Institution, Global Volcanism Program (not NASA)', 'https://volcano.si.edu/', az ? `${meta.volcanoes} Holosen vulkanı; ${meta.tubeVolcanoes} bazalt qalxanvari / vulkan sahəsi` : `${meta.volcanoes} Holocene volcanoes; ${meta.tubeVolcanoes} basaltic shield/field`],
    ['Natural Earth', 'https://www.naturalearthdata.com/', az ? 'yalnız ölkə adları' : 'country names only'],
  ];
  const checks = SITES.map(s => { const c = cellAt(s.lat, s.lon), p = c >= 0 ? pctOf(c) : null; return `<li><span>${esc(s.name)}</span><b>${p ? tv.pct(p) : '—'}</b></li>`; }).join('');
  $('#aboutBox').innerHTML = az ? `
    <header><h2>Metod və mənbələr</h2><button class="btn" id="aboutClose">Bağla</button></header>
    <p>NASA analoq poliqonlarını ekspertlər əl ilə seçir. TerraAnalog Yerin bütün qurusunu (${fmt(N)} xana) eyni ölçü ilə yoxlayır, seçilmiş tapşırıq üçün hər xanaya 0–100 bal verir və ən yaxşı yerləri təklif edir.</p>
    <h3>Bal necə hesablanır</h3>
    <p>Hər göstərici üçün xananın dəyəri hədəfin dəyəri ilə müqayisə olunur: S = exp(−½·(Δ/σ)²); Δ fərqdir, σ həmin göstəricinin Yerin bütün qurusu üzrə standart kənarlaşmasıdır (sahəyə görə çəkili). Yağıntı, yamac və kələ-kötürlük loqarifmik şkalada götürülür. Bazalt qalxanvari vulkana məsafə üçün S = exp(−d/75 km). Yekun bal göstəricilərin əhəmiyyət çəkisi ilə çəkili ortadır. Lunar tapşırıq istisna olmaqla, albedosu ≥ 0,6 olan və ya Blue Marble-da ağ görünən buz təbəqələri defolt olaraq çıxarılır (qaya və qrunt üzərində işləməyi təqlid etmir; eşik ekspert fərziyyəsidir). Çəkilər ekspert fərziyyəsidir və hər tapşırıq üçün sol paneldə göstərilir. Məlumatı olmayan göstərici hesabdan çıxarılır.</p>
    <h3>Süni intellekt necə işləyir</h3>
    <p>1) Alqoritm hər tapşırıq üçün 6 namizəd seçir (bir-birindən ≥ 500 km, məlum poliqonlardan ≥ 300 km). 2) Brauzer bu yerlər və NASA-nın iki təlim poliqonu üçün NASA POWER-dən son ${LIVE_DAYS} günün məlumatını canlı sorğu ilə alır. 3) Yerli server bütün rəqəmləri dil modelinə göndərir (API açarı brauzerə düşmür). Model yalnız göndərilmiş rəqəmlərlə iki yer seçir və əsaslandırır; sistem modelin yalnız namizəd siyahısından seçdiyini yoxlayır. Dil modeli pulsuz da ola bilər (Ollama kompüterdə və ya pulsuz Gemini açarı). Heç biri yoxdursa, yerli mühərrik eyni rəqəmlərdən əsaslandırma yazır: güclü və zəif uyğunluqlar, canlı hava məlumatı, ikinci yer birincidən ≥ 1500 km uzaqda. Bu mühərrik qaydalara əsaslanır, neyron şəbəkə deyil və interfeys bunu açıq yazır.</p>
    <h3>Hədəflərin relyefi</h3>
    <p>Yamac və kələ-kötürlük üç cisim üçün eyni kodla hesablanır: 18,5 km addımla 5 × 5 nöqtə. Ezero: ${fmt(tm.mars_jezero.slope, 1)}° və ${fmt(tm.mars_jezero.rough)} m. Olimp dağı: 8 yamac nöqtəsinin (zirvədən 150 km) ortası, ${fmt(tm.mars_olympus.slope, 1)}° və ${fmt(tm.mars_olympus.rough)} m. Ayın cənub qütbü: ${fmt(tm.moon_sp.slope, 1)}° və ${fmt(tm.moon_sp.rough)} m.</p>
    <h3>Məhdudiyyətlər</h3>
    <ul><li>Tor ≈ 55 km: regional ilkin seçimdir, konkret poliqon deyil.</li><li>Mineral tərkib və spektr daxil edilməyib (ASTER, Landsat lazımdır).</li><li>Canlı məlumat yalnız hava şəraitini göstərir; relyef statikdir.</li><li>NASA təlim poliqonlarının dəqiq sərhədləri açıq deyil, markerlər təxminidir.</li><li>Nəticələr sahə məlumatı ilə yoxlanmayıb; yeganə yoxlama aşağıdakı persentillərdir.</li></ul>
    <h3>${tv.valid}</h3><p class="small">${tv.validNote} (${taskText(state.task)[0]})</p><ul class="srcs plain">${checks}</ul>
    <h3>Mənbələr</h3>` : `
    <header><h2>Method and sources</h2><button class="btn" id="aboutClose">Close</button></header>
    <p>NASA analog sites are chosen by experts, by hand. TerraAnalog checks all of Earth’s land (${fmt(N)} cells) with the same yardstick, gives every cell a 0–100 score for the chosen task and proposes the best places.</p>
    <h3>How the score is computed</h3>
    <p>For each metric the cell’s value is compared with the target value: S = exp(−½·(Δ/σ)²), where Δ is the difference and σ the standard deviation of that metric over all land on Earth (area-weighted). Precipitation, slope and roughness use a log scale. Distance to a basaltic shield volcano uses S = exp(−d/75 km). The final score is the weighted mean using the importance of each metric. Except for the lunar task, ice sheets (albedo ≥ 0.6 or white in Blue Marble) are excluded by default because they do not imitate work on rock and soil; the threshold is an expert hypothesis. The weights are an expert hypothesis, shown for each task in the left panel. A metric with no data is left out.</p>
    <h3>How the AI works</h3>
    <p>1) The algorithm picks 6 candidates for the task (at least 500 km apart and 300 km from known polygons). 2) The browser requests the last ${LIVE_DAYS} days from NASA POWER for these places and for the two NASA training polygons. 3) The local server sends all numbers to a language model (the API key never reaches the browser). The model picks two places using only the numbers it was given and explains why; the system checks that it chose only from the candidate list. The language model can be free (Ollama on your computer, or a free Gemini key). If none is available, a built-in local engine writes the rationale from the same numbers: strong and weak matches, live weather, and a second pick at least 1,500 km from the first. That engine is rule-based, not a neural network, and the interface says so.</p>
    <h3>Terrain of the targets</h3>
    <p>Slope and roughness are computed with the same code for all three bodies: 5 × 5 points, 18.5 km apart. Jezero: ${fmt(tm.mars_jezero.slope, 1)}° and ${fmt(tm.mars_jezero.rough)} m. Olympus Mons: mean of 8 flank points 150 km from the summit, ${fmt(tm.mars_olympus.slope, 1)}° and ${fmt(tm.mars_olympus.rough)} m. Lunar south pole: ${fmt(tm.moon_sp.slope, 1)}° and ${fmt(tm.moon_sp.rough)} m.</p>
    <h3>Limits</h3>
    <ul><li>Grid ≈ 55 km: a regional pre-selection, not a specific site.</li><li>Mineral composition and spectra are not included (that needs ASTER, Landsat).</li><li>Live data describes weather only; terrain is static.</li><li>NASA does not publish exact boundaries of its training polygons, so the markers are approximate.</li><li>Results are not validated against field data; the only check is the percentiles below.</li></ul>
    <h3>${tv.valid}</h3><p class="small">${tv.validNote} (${taskText(state.task)[0]})</p><ul class="srcs plain">${checks}</ul>
    <h3>Sources</h3>`;
  $('#aboutBox').insertAdjacentHTML('beforeend', `<ul class="srcs">${src.map(s => `<li><a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a><span>${esc(s[2])}</span></li>`).join('')}</ul><p class="small">${az ? 'Məlumat yığılıb' : 'Data built'}: ${meta.built}</p>`);
  $('#about').hidden = false; $('#aboutClose').onclick = () => { $('#about').hidden = true; };
}
$('#how').onclick = openAbout;
$('#about').addEventListener('click', e => { if (e.target.id === 'about') $('#about').hidden = true; });
window.addEventListener('keydown', e => { if (e.key === 'Escape') { closeCompare(); $('#about').hidden = true; } });
$$('.lang button').forEach(b => b.onclick = () => { state.lang = b.dataset.lang; try { localStorage.setItem('tt_lang', state.lang); } catch { /* нет доступа */ } if (score) { setPicks(); renderChrome(); renderLegend(); drawMarks(); renderLeft(); renderCands(); renderRight(); if (!$('#about').hidden) openAbout(); } });

/* ---------------- запуск ---------------- */
(async () => {
  const ld = $('#loading'); renderChrome(); ld.textContent = t().loading;
  try { await load(); } catch (e) { ld.textContent = t().fail; console.error(e); return; }
  try { const s = await (await fetch('/api/status')).json(); state.ai = { available: !!s.ai, model: s.model, provider: s.provider }; } catch { state.ai = { available: false, model: '', noServer: true }; }   // сайт без нашего сервера (например, хостинг): только встроенный движок
  layout(); refresh(); ld.hidden = true;
  window.__ta = { state, meta, get shortlist() { return shortlist; }, get score() { return score; }, live, lat, lon, select, refresh, title, cellAt, runAI, payload, loadLive, get activeCells() { return activeCells; } };
})();
