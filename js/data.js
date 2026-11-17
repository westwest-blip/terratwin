// TerraTwin — elmi məlumat bazası
// Qayda: hər rəqəmin mənbəyi var. "expert" statuslu ballar komandanın ilkin ekspert
// qiymətləndirməsidir (hipotez), ölçülmüş NASA nəticəsi DEYİL — interfeysdə belə göstərilir.

export const WORLDS = {
  // NASA NSSDC Planetary Fact Sheets (nssdc.gsfc.nasa.gov/planetary/factsheet)
  earth: { name: 'Yer', radiusKm: 6371.0, gravity: 9.82, pressureBar: 1.014, dayH: 24.0, meanTempC: 15,
    tempNote: 'orta 288 K (15 °C)', atmosphere: 'N₂ 78%, O₂ 21%', color: '#4FA3FF' },
  moon: { name: 'Ay', radiusKm: 1737.4, gravity: 1.62, pressureBar: 3e-15, dayH: 29.53 * 24, meanTempC: null,
    tempNote: 'ekvatorda 95–390 K (−178…+117 °C)', atmosphere: 'praktiki olaraq vakuum (3×10⁻¹⁵ bar)', color: '#C9D3E0' },
  mars: { name: 'Mars', radiusKm: 3389.5, gravity: 3.73, pressureBar: 0.00636, dayH: 24.6597, meanTempC: -59,
    tempNote: 'orta ~214 K (−59 °C); Viking-1: −89…−31 °C', atmosphere: 'CO₂ 95.1%, N₂ 2.59%, Ar 1.94%', color: '#E2704A' },
};

export const TARGETS = {
  moon_sp: {
    id: 'moon_sp', world: 'moon', name: 'Ayın cənub qütbü — Şeklton krateri', short: 'Ay · Cənub qütbü',
    lat: -89.9, lon: 0,
    climate: { mode: 'cold', refMinC: -183, label: 'Daimi kölgə: krater dibi < ~90 K (−183 °C)' },
    sunMaxElevDeg: 1.6, // qütbdən ~0.1° məsafə + Ayın oxu meyli 1.54°
    facts: [
      ['Diametr', '~21 km', 'LRO LOLA (Zuber et al., 2012, Nature)'],
      ['Dərinlik', '~4.1 km (d/D = 0.195)', 'LRO LOLA (Zuber et al., 2012)'],
      ['Krater dibi', '< ~90 K — su buzu üçün kifayət qədər soyuq', 'Zuber et al., 2012'],
      ['Günəş', 'Üfüqdə çox alçaq: oxun meyli cəmi 1.54°', 'NASA NSSDC Moon Fact Sheet'],
      ['Su buzu sübutu', 'LCROSS (2009, Cabeus): kütləcə ~5.6 ± 2.9% su', 'Colaprete et al., 2010, Science'],
      ['Artemis III', '9 namizəd bölgə (NASA, 28.10.2024)', 'NASA news release'],
    ],
    artemis: ['Peak near Cabeus B', 'Haworth', 'Malapert Massif', 'Mons Mouton Plateau', 'Mons Mouton',
      'Nobile Rim 1', 'Nobile Rim 2', 'de Gerlache Rim 2', 'Slater Plain'],
    why: 'Daimi kölgədə qalan kraterlər (su buzu) və demək olar ki, daim işıqlı zirvələr (Günəş enerjisi) yan-yanadır — daimi baza üçün əsas namizəd bölgə.',
  },
  mars_jezero: {
    id: 'mars_jezero', world: 'mars', name: 'Mars — Ezero (Jezero) krateri', short: 'Mars · Ezero',
    lat: 18.38, lon: 77.58,
    climate: { mode: 'mean', refMeanC: -59, label: 'Marsın orta temperaturu −59 °C (NSSDC)' },
    sunMaxElevDeg: 90,
    facts: [
      ['Diametr', '~45 km', 'NASA Mars 2020'],
      ['Mühit', 'Qədim göl və çay deltası', 'NASA Mars 2020'],
      ['Missiya', 'Perseverance — 18.02.2021 enib', 'NASA Mars 2020'],
      ['Süxurlar', 'Olivinli maqmatik süxurlar, karbonatlar', 'NASA Mars 2020'],
      ['Atmosfer', '~6 mbar, CO₂ 95%', 'NASA NSSDC Mars Fact Sheet'],
    ],
    why: 'Qədim su mühiti və nümunə toplama missiyası — robotik və geoloji prosedurların sınağı üçün əsas hədəf.',
  },
  mars_gale: {
    id: 'mars_gale', world: 'mars', name: 'Mars — Geyl (Gale) krateri', short: 'Mars · Geyl',
    lat: -5.4, lon: 137.8,
    climate: { mode: 'mean', refMeanC: -59, label: 'Marsın orta temperaturu −59 °C (NSSDC)' },
    sunMaxElevDeg: 90,
    facts: [
      ['Diametr', '~154 km', 'NASA MSL Curiosity'],
      ['Mərkəz', 'Şarp dağı (Aeolis Mons) — ~5 km', 'NASA MSL Curiosity'],
      ['Missiya', 'Curiosity — 06.08.2012 (UTC) enib', 'NASA MSL Curiosity'],
      ['Süxurlar', 'Laylı çöküntülər, gil mineralları, sulfatlar', 'NASA MSL Curiosity'],
      ['Metan', 'Curiosity atmosferdə metan dəyişkənliyi ölçüb', 'Webster et al., 2015, Science'],
    ],
    why: 'Laylı çöküntü süxurları keçmiş yaşayış mühitinin izlərini saxlayır; metan ölçmələri yeraltı proseslərlə bağlı suallar doğurur.',
  },
};

// Kriteriyalar və ilkin çəkilər (ChatGPT planındakı kimi: 25/25/20/15/15)
export const CRITERIA = [
  { id: 'terrain',   name: 'Relyef',            w: 25, desc: 'Krater, yamac, düzənlik, yelpik, lava formaları' },
  { id: 'geology',   name: 'Geologiya',         w: 25, desc: 'Süxur və mineral oxşarlığı' },
  { id: 'climate',   name: 'İqlim',             w: 20, desc: 'Temperatur + quraqlıq (NASA POWER-dən hesablanır)' },
  { id: 'solar',     name: 'İşıqlanma',         w: 15, desc: 'Günəşin maksimal hündürlüyü (həndəsi hesablama)' },
  { id: 'resources', name: 'Su / buz / resurs', w: 15, desc: 'Buz, hidratlı minerallar, ISRU potensialı' },
];

export const STATUS = {
  power:   { label: 'NASA POWER — hesablanıb', cls: 'st-power' },
  geo:     { label: 'Həndəsi hesablama',       cls: 'st-geo' },
  expert:  { label: 'Ekspert qiyməti (hipotez)', cls: 'st-expert' },
  missing: { label: 'Məlumat yoxdur',          cls: 'st-missing' },
};

// e = { target: [bal, əsaslandırma] } — relyef/geologiya/resurs üçün ilkin ekspert qiymətləri
export const SITES = [
  {
    id: 'atacama', name: 'Atakama səhrası (Yunqay)', country: 'Çili', lat: -24.10, lon: -70.02,
    kind: 'Hiperquraq səhra', env: 'desert', status: 'known', for: ['mars'],
    summary: 'NASA-ya görə Yerin ən quraq qeyri-qütb səhrası. Yunqay bölgəsinin torpaqları "Mars-a bənzər torpaq" kimi tədqiq olunub: üzvi maddə və mikrob həyatı son dərəcə azdır.',
    analog: ['Hiperquraqlıq və oksidləşdirici torpaq kimyası', 'Duzlar və nitratlar — Mars torpaqlarındakı duzlarla müqayisə', 'Həyatın quraq hədd şəraitində axtarışı (biomarker sınaqları)'],
    breaks: ['Atmosfer təzyiqi ~1 bar (Mars ~0.006 bar)', 'Orta temperatur Marsdan ~75 °C isti', 'UV və kosmik radiasiya Yer atmosferi ilə qorunur'],
    e: {
      terrain:   { mars_jezero: [60, 'Daşlı düzənliklər, allüvial yelpiklər'], mars_gale: [60, 'Yelpiklər və laylı çöküntülər'], moon_sp: [25, 'Krater/qütb relyefi yoxdur'] },
      geology:   { mars_jezero: [60, 'Duzlu, oksidləşmiş torpaqlar'], mars_gale: [65, 'Sulfat və duz çöküntüləri'], moon_sp: [15, 'Regolit tərkibi fərqlidir'] },
      resources: { mars_jezero: [40, 'Hidratlı duzlar, çox az su'], mars_gale: [45, 'Sulfatlar, hidratlı minerallar'], moon_sp: [10, 'Buz yoxdur'] },
    },
    sources: [
      ['NASA Science — 10 Things to Know About Planetary Analogs', 'https://science.nasa.gov/earth/10-things-to-know-about-planetary-analogs/'],
      ['Navarro-González et al., 2003, Science — Mars-like soils in the Atacama', 'https://doi.org/10.1126/science.1089143'],
      ['NASA Space Apps 2026 — challenge mətni', 'https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/'],
    ],
  },
  {
    id: 'dryvalleys', name: 'Makmerdo Quru Vadiləri', country: 'Antarktida', lat: -77.53, lon: 161.58,
    kind: 'Soyuq qütb səhrası', env: 'polar', status: 'known', for: ['mars', 'moon'],
    summary: 'Antarktidanın ən böyük buzsuz ərazisi. Çox soyuq, quru, güclü küləkli mühit; buzla sementlənmiş permafrost və daş içində yaşayan mikroblar.',
    analog: ['Soyuq + quraq kombinasiyası — Marsın soyuq səhralarına ən yaxın Yer mühitlərindən biri', 'Buzla sementlənmiş torpaq — Marsdakı yeraltı buz üçün model', 'Uzun təcrid və ekstremal logistika — Ay bazası əməliyyatları üçün dərs'],
    breaks: ['Atmosfer və radiasiya mühiti Yerinkidir', 'Ayın vakuumu və −180 °C-dən aşağı kölgə temperaturları təkrarlanmır', 'Cazibə qüvvəsi Yerinkidir'],
    e: {
      terrain:   { mars_jezero: [55, 'Vadi dibləri, poliqonal torpaq'], mars_gale: [50, 'Külək eroziyası, daşlı səth'], moon_sp: [35, 'Alçaq Günəş, kölgəli yamaclar'] },
      geology:   { mars_jezero: [50, 'Dolerit (bazalt) və qumdaşı'], mars_gale: [55, 'Çöküntü süxurları'], moon_sp: [30, 'Bazaltik süxurlar, lakin regolit yoxdur'] },
      resources: { mars_jezero: [55, 'Yeraltı buz, duzlar'], mars_gale: [50, 'Buz və duzlar'], moon_sp: [70, 'Soyuq tələlərdə buz — permafrost analoqu'] },
    },
    sources: [
      ['McMurdo Dry Valleys LTER (NSF)', 'https://mcm.lternet.edu/'],
      ['NASA Science — 10 Things to Know About Planetary Analogs (Antarktida)', 'https://science.nasa.gov/earth/10-things-to-know-about-planetary-analogs/'],
    ],
  },
  {
    id: 'haughton', name: 'Haughton krateri (Devon adası)', country: 'Kanada', lat: 75.37, lon: -89.68,
    kind: 'Zərbə krateri, qütb səhrası', env: 'crater', status: 'known', for: ['mars', 'moon'],
    summary: 'Diametri ~23 km olan zərbə krateri. NASA Ames-in rəhbərlik etdiyi Haughton-Mars Project (1997-dən) burada robot və insan kəşfiyyatı strategiyalarını sınayır. Yaşı mübahisəlidir (tədqiqatlarda ~23–39 mln il).',
    analog: ['Zərbə krateri morfologiyası və şok-metamorfik süxurlar', 'Soyuq qütb səhrası, permafrost', 'Mars kosmonavt çıxışlarının (EVA) məşqi'],
    breaks: ['Eroziyaya uğramış — təzə Ay kraterindən dayazdır', 'Atmosfer, cazibə və radiasiya Yerinkidir', 'Yayda bitki örtüyü və axar su var'],
    e: {
      terrain:   { mars_jezero: [70, 'Krater (23 km) — Ezero (45 km) ilə eyni sinif'], mars_gale: [60, 'Krater, vadi şəbəkələri'], moon_sp: [65, 'Zərbə krateri + qütb işıqlanması'] },
      geology:   { mars_jezero: [55, 'Zərbə brekçiyası, karbonatlı süxurlar'], mars_gale: [55, 'Çöküntü + zərbə süxurları'], moon_sp: [50, 'Şok-metamorfizm, brekçiya'] },
      resources: { mars_jezero: [50, 'Permafrost, yeraltı buz'], mars_gale: [45, 'Buz, hidratlı minerallar'], moon_sp: [60, 'Soyuq, buzlu qrunt'] },
    },
    sources: [
      ['NASA Science — 10 Things to Know About Planetary Analogs (HMP)', 'https://science.nasa.gov/earth/10-things-to-know-about-planetary-analogs/'],
      ['Earth Impact Database — Haughton', 'http://www.passc.net/EarthImpactDatabase/New%20website_05-2018/Haughton.html'],
      ['NASA Space Apps 2026 — challenge mətni', 'https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/'],
    ],
  },
  {
    id: 'maunakea', name: 'Mauna Kea (Havay)', country: 'ABŞ', lat: 19.82, lon: -155.47,
    kind: 'Vulkanik yüksəklik', env: 'volcanic', status: 'known', for: ['moon', 'mars'],
    summary: 'Hündürlüyü 4 207 m olan sönmüş vulkan. Bazaltik tefra (vulkanik qırıntı) Ay regolitinə bənzədiyi üçün NASA burada yerli resurslardan istifadə (ISRU) — regolitdən oksigen alma çöl sınaqları aparıb.',
    analog: ['Bazaltik tefra — Ay regolitinin fiziki analoqu', 'ISRU avadanlığının çöl sınaqları', 'Olivinli bazalt — Ezero krateri süxurları ilə müqayisə'],
    breaks: ['Rütubətli tropik iqlim, bitki örtüyü aşağı yamaclarda', 'NASA POWER şəbəkəsi (~50 km) zirvə mikroiqlimini həll etmir — iqlim balı qərəzlidir', 'Vakuum və qütb kölgəsi yoxdur'],
    e: {
      terrain:   { mars_jezero: [40, 'Kül konusları, lava axınları'], mars_gale: [35, 'Vulkanik yamaclar'], moon_sp: [50, 'Tefra yamacları, kraterəbənzər konuslar'] },
      geology:   { mars_jezero: [60, 'Olivinli bazalt'], mars_gale: [50, 'Bazaltik qumlar'], moon_sp: [65, 'Bazaltik tefra — regolit simulyatoru'] },
      resources: { mars_jezero: [30, 'Az su'], mars_gale: [30, 'Az su'], moon_sp: [60, 'ISRU: regolitdən oksigen sınağı'] },
    },
    sources: [
      ['NASA NTRS — Mauna Kea ISRU analog field tests', 'https://ntrs.nasa.gov/search?q=Mauna%20Kea%20ISRU%20analog'],
      ['NASA Science — 10 Things to Know About Planetary Analogs (Havay)', 'https://science.nasa.gov/earth/10-things-to-know-about-planetary-analogs/'],
    ],
  },
  {
    id: 'askja', name: 'Askja kalderası və Holuhraun', country: 'İslandiya', lat: 65.05, lon: -16.78,
    kind: 'Vulkanik kaldera, lava sahəsi', env: 'volcanic', status: 'known', for: ['moon', 'mars'],
    summary: 'Apollo astronavtları Ay geologiyası məşqləri üçün İslandiyaya da gəliblər. Tefra düzənlikləri, bazalt qumları və təzə lava sahələri Ay və Mars vulkanizmini öyrənmək üçün istifadə olunur.',
    analog: ['Bitki örtüyü olmayan tefra düzənlikləri', 'Bazaltik qum və lava axınları — Mars vulkanik düzənlikləri', 'Buz–vulkan qarşılıqlı təsiri'],
    breaks: ['Rütubətli, qarlı iqlim', 'Atmosfer və cazibə Yerinkidir', 'Qütb kölgə kraterləri yoxdur'],
    e: {
      terrain:   { mars_jezero: [55, 'Lava sahələri, qum düzənlikləri'], mars_gale: [45, 'Bazalt qumları, dyunlar'], moon_sp: [65, 'Apollo məşq relyefi: tefra düzənliyi'] },
      geology:   { mars_jezero: [65, 'Bazalt, hidrotermal dəyişmə'], mars_gale: [55, 'Bazalt qumları'], moon_sp: [60, 'Bazalt'] },
      resources: { mars_jezero: [45, 'Hidrotermal minerallar, buz'], mars_gale: [40, 'Hidratlı minerallar'], moon_sp: [40, 'Buz var, amma soyuq tələ deyil'] },
    },
    sources: [
      ['NASA Science — 10 Things to Know About Planetary Analogs (Apollo məşqləri, İslandiya)', 'https://science.nasa.gov/earth/10-things-to-know-about-planetary-analogs/'],
    ],
  },
  {
    id: 'deathvalley', name: 'Ölüm Vadisi (Badwater)', country: 'ABŞ', lat: 36.23, lon: -116.77,
    kind: 'Quraq çökəklik, duz düzənliyi', env: 'desert', status: 'known', for: ['mars'],
    summary: 'Badwater hövzəsi dəniz səviyyəsindən 86 m aşağıdadır. Qapalı hövzə, duz düzənlikləri (playa) və allüvial yelpiklər — qədim göl hövzələrinin buxarlanma izləri.',
    analog: ['Allüvial yelpik və delta formaları — Ezero və Geyl kraterləri', 'Buxarlanma ilə yaranan duzlar — Marsdakı xlorid/sulfat çöküntüləri', 'Ekstremal istilik — avadanlığın istilik sınağı'],
    breaks: ['Marsdan çox isti (yayda 45+ °C)', 'Atmosfer və cazibə Yerinkidir', 'Ay mühitinə uyğun deyil'],
    e: {
      terrain:   { mars_jezero: [70, 'Qapalı hövzə + yelpiklər — paleogöl analoqu'], mars_gale: [65, 'Allüvial yelpiklər, laylı çöküntü'], moon_sp: [20, 'Uyğun deyil'] },
      geology:   { mars_jezero: [65, 'Göl və buxarlanma çöküntüləri'], mars_gale: [65, 'Sulfat/duz çöküntüləri'], moon_sp: [15, 'Uyğun deyil'] },
      resources: { mars_jezero: [45, 'Duzlar, hidratlı minerallar'], mars_gale: [50, 'Sulfatlar'], moon_sp: [10, 'Buz yoxdur'] },
    },
    sources: [
      ['NASA Space Apps 2026 — challenge mətni (Death Valley adı çəkilir)', 'https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/'],
      ['U.S. National Park Service — Death Valley', 'https://www.nps.gov/deva/'],
    ],
  },
  {
    id: 'lavabeds', name: 'Lava Beds — lava boruları', country: 'ABŞ', lat: 41.71, lon: -121.51,
    kind: 'Lava boruları və mağaralar', env: 'cave', status: 'known', for: ['moon', 'mars'],
    summary: 'Yüzlərlə lava borusu və buz mağarası olan vulkanik sahə. NASA-nın BRAILLE layihəsi burada mağara robotlarını və lava borularında həyat izlərinin axtarışını sınayıb.',
    analog: ['Lava boruları — Ay və Marsdakı çökmə çuxurları (skylight) üçün analoq', 'Mağaralar radiasiyadan qorunan baza yeri ideyası üçün model', 'Buz mağaraları — soyuq tələ prosesləri'],
    breaks: ['Ayın cənub qütbü lava borusu bölgəsi deyil', 'Mağara mikroiqlimi Yer atmosferindən asılıdır', 'Cazibə qüvvəsi boru ölçülərini dəyişir (Ayda daha böyük ola bilər)'],
    e: {
      terrain:   { mars_jezero: [35, 'Lava sahəsi'], mars_gale: [30, 'Az uyğun'], moon_sp: [40, 'Mağara/çuxur — qütb deyil'] },
      geology:   { mars_jezero: [50, 'Bazalt'], mars_gale: [40, 'Bazalt'], moon_sp: [55, 'Bazalt (Ay dənizləri)'] },
      resources: { mars_jezero: [35, 'Mağara buzu'], mars_gale: [30, 'Az'], moon_sp: [55, 'Buz mağaraları — soyuq tələ analoqu'] },
    },
    sources: [
      ['NASA NTRS — BRAILLE (Lava Beds)', 'https://ntrs.nasa.gov/search?q=BRAILLE%20Lava%20Beds'],
      ['U.S. National Park Service — Lava Beds', 'https://www.nps.gov/labe/'],
    ],
  },
  {
    id: 'qobustan', name: 'Qobustan palçıq vulkanları', country: 'Azərbaycan', lat: 40.02, lon: 49.40,
    coordNote: 'təqribi koordinat (sahə)',
    kind: 'Palçıq vulkanizmi, metan çıxışları', env: 'mud', status: 'new', for: ['mars'],
    summary: 'YENİ NAMİZƏD (hipotez). Azərbaycan palçıq vulkanlarının dünyada ən sıx yerləşdiyi bölgələrdəndir. USGS nəşrinə görə Marsdakı bəzi konusvari formalar palçıq vulkanlarına bənzədilir və Azərbaycan vulkanları analoq kimi istifadə olunur.',
    analog: ['Marsdakı ehtimal olunan palçıq vulkanları (məs., Acidalia Planitia)', 'Metan və qaz çıxışları — Geyl kraterində Curiosity-nin metan ölçmələri ilə müqayisə', 'İncə dənəli gilli çöküntülər — Geylin gilli süxurları'],
    breaks: ['Mars şəraitində palçıq axınının fizikası fərqlidir (aşağı təzyiq, soyuq)', 'Formaların mənşəyi Marsda hələ müzakirəlidir', 'Real məlumat təhlili hələ aparılmayıb — bu, tədqiqat hipotezidir'],
    e: {
      terrain:   { mars_jezero: [40, 'Konuslar, palçıq axınları'], mars_gale: [45, 'Çöküntü düzənliyi'], moon_sp: [5, 'Uyğun deyil'] },
      geology:   { mars_jezero: [45, 'Gilli çöküntülər'], mars_gale: [55, 'Gil + metan — Geyl ilə bağlantı'], moon_sp: [5, 'Uyğun deyil'] },
      resources: { mars_jezero: null, mars_gale: null, moon_sp: null },
    },
    sources: [
      ['USGS — Martian mud volcanism: terrestrial analogs and implications for formational scenarios', 'https://www.usgs.gov/publications/martian-mud-volcanism-terrestrial-analogs-and-implications-formational-scenarios'],
      ['Brož et al., 2020, Nature Geoscience — Mars şəraitində palçıq axınları təcrübəsi', 'https://doi.org/10.1038/s41561-020-0577-2'],
      ['Webster et al., 2015, Science — Geyl kraterində metan', 'https://doi.org/10.1126/science.1261713'],
    ],
  },
  {
    id: 'lut', name: 'Lut səhrası — yardanqlar', country: 'İran', lat: 30.50, lon: 58.60,
    coordNote: 'təqribi koordinat (yardanq sahəsi)',
    kind: 'Külək eroziyası, hiperquraq', env: 'desert', status: 'new', for: ['mars'],
    summary: 'YENİ NAMİZƏD (hipotez). MODIS ölçmələrinə görə Lut 2005-ci ildə 70.7 °C səth temperaturu ilə qeydə alınıb. Şimal-qərb küləkləri süxurları uzun yardanq tirələrinə çevirir.',
    analog: ['Yardanqlar — Marsda (məs., Geyl ətrafı, Medusae Fossae) geniş yayılmış külək formaları', 'Hiperquraq mühit', 'Külək eroziyasının sürətini Mars proseslərinə tətbiq etmək'],
    breaks: ['Səth temperaturu Marsın əksinə ifrat isti', 'Mars küləyi çox seyrək atmosferdədir — qum daşınması fərqlidir', 'Real məlumat təhlili hələ aparılmayıb — bu, tədqiqat hipotezidir'],
    e: {
      terrain:   { mars_jezero: [50, 'Külək formaları'], mars_gale: [70, 'Yardanq sahələri Geyl regionunda da var'], moon_sp: [10, 'Uyğun deyil'] },
      geology:   { mars_jezero: [45, 'Çöküntü süxurları'], mars_gale: [55, 'Külək eroziyasına uğramış çöküntülər'], moon_sp: [10, 'Uyğun deyil'] },
      resources: { mars_jezero: null, mars_gale: null, moon_sp: null },
    },
    sources: [
      ['NASA Earth Observatory — Iran’s Lut Desert (MODIS, 2024)', 'https://science.nasa.gov/earth/earth-observatory/irans-lut-desert-153634/'],
      ['NASA Earth Observatory — The Hottest Spot on Earth', 'https://earthobservatory.nasa.gov/features/HottestSpot'],
    ],
  },
];

export const ENV_LABELS = {
  all: 'Hamısı', desert: 'Səhra', polar: 'Qütb', crater: 'Krater', volcanic: 'Vulkanik', cave: 'Mağara / lava borusu', mud: 'Palçıq vulkanı',
};

// Bu prototipdə həqiqətən istifadə olunan və planlaşdırılan məlumatlar
export const DATASETS = [
  { name: 'NASA POWER — Climatology API', body: 'Yer', used: 'api',
    what: '9 ərazi üçün 25 illik (2001–2025, MERRA-2) temperatur, yağıntı, Günəş radiasiyası, rütubət, külək',
    how: 'ACI-nin "İqlim" kriteriyası birbaşa bu cavablardan hesablanır', url: 'https://power.larc.nasa.gov/' },
  { name: 'Blue Marble Next Generation (topo + batimetriya)', body: 'Yer', used: 'visual',
    what: 'MODIS əsaslı qlobal rəng mozaikası, 21600×10800 → 8K', how: '3D Yer qlobusunun səthi', url: 'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/' },
  { name: 'Black Marble 2016 (VIIRS gecə işıqları)', body: 'Yer', used: 'visual',
    what: 'Gecə işıqlarının qlobal xəritəsi', how: 'Qlobusun gecə tərəfi', url: 'https://science.nasa.gov/earth/earth-observatory/earth-at-night/' },
  { name: 'GEBCO / BMNG topoqrafiya', body: 'Yer', used: 'visual',
    what: 'Qlobal quru hündürlüyü (boz şkala)', how: 'Relyef kölgələnməsi və "Hündürlük" qatı', url: 'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography/' },
  { name: 'LRO LROC WAC rəng mozaikası (NASA SVS CGI Moon Kit)', body: 'Ay', used: 'visual',
    what: 'Ayın qlobal rəng mozaikası, 8K', how: '3D Ay qlobusunun səthi', url: 'https://svs.gsfc.nasa.gov/4720' },
  { name: 'LRO LOLA DEM (16 piksel/dərəcə)', body: 'Ay', used: 'data',
    what: 'Lazer altimetriya hündürlükləri, −8.98…+10.69 km', how: '3D relyef (displacement) və hündürlük rəng qatı', url: 'https://svs.gsfc.nasa.gov/4720' },
  { name: 'Viking MDIM 2.1 rəng mozaikası (NASA Mars Trek)', body: 'Mars', used: 'visual',
    what: 'Marsın qlobal rəng mozaikası, WMTS plitələrindən 8K', how: '3D Mars qlobusunun səthi', url: 'https://trek.nasa.gov/mars/' },
  { name: 'MGS MOLA rəngli kölgəli relyef (NASA Mars Trek)', body: 'Mars', used: 'data',
    what: 'Lazer altimetriya hündürlük xəritəsi (rəng = hündürlük)', how: '"Hündürlük" qatı', url: 'https://trek.nasa.gov/mars/' },
  { name: 'NASA SVS Deep Star Maps 2020 (Hipparcos/Tycho/Gaia)', body: 'Kosmos', used: 'visual',
    what: '1.7 milyard ulduzdan qurulmuş səma xəritəsi (HDR → 8K)', how: '3D fonun ulduzları', url: 'https://svs.gsfc.nasa.gov/4851' },
  { name: 'NASA NSSDC Planetary Fact Sheets', body: 'Yer · Ay · Mars', used: 'data',
    what: 'Radius, cazibə, təzyiq, temperatur, gün uzunluğu', how: '"Üç dünya" müqayisəsi', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/' },
  { name: 'SRTM 1″ (~30 m) — NASA Earthdata', body: 'Yer', used: 'next',
    what: 'Yüksək dəqiqlikli relyef', how: 'Növbəti mərhələ: yamac və nahamarlıq hesabı', url: 'https://search.earthdata.nasa.gov/' },
  { name: 'EMIT (ISS) — mineral xəritələri', body: 'Yer', used: 'next',
    what: 'Səth minerallarının spektral xəritəsi', how: 'Növbəti mərhələ: "Geologiya" balını ölçmə ilə əvəzləmək', url: 'https://earth.jpl.nasa.gov/emit/' },
  { name: 'LRO Diviner — Ay temperaturları', body: 'Ay', used: 'next',
    what: 'Qütb temperatur və soyuq tələ məhsulları', how: 'Növbəti mərhələ: Ay iqlim referansı', url: 'https://pds-geosciences.wustl.edu/missions/lro/diviner.htm' },
  { name: 'HiRISE (MRO) — Mars görüntüləri', body: 'Mars', used: 'next',
    what: '~25–30 sm/piksel görüntülər', how: 'Növbəti mərhələ: vizual relyef müqayisəsi', url: 'https://www.uahirise.org/' },
];

export const USED_LABEL = {
  api: ['Canlı API məlumatı', 'u-api'], data: ['Elmi məlumat', 'u-data'], visual: ['Vizual qat', 'u-visual'], next: ['Növbəti mərhələ', 'u-next'],
};

export const GENERAL_SOURCES = [
  ['NASA Space Apps 2026 — Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars', 'https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/'],
  ['NASA NSSDC — Earth / Moon / Mars Fact Sheets', 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/'],
  ['NASA — Artemis III Moon landing regions update (28.10.2024)', 'https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/'],
  ['Zuber et al., 2012, Nature — Shackleton crater (LOLA)', 'https://doi.org/10.1038/nature11216'],
  ['Colaprete et al., 2010, Science — LCROSS water detection', 'https://doi.org/10.1126/science.1186986'],
  ['NASA Mars 2020 Perseverance', 'https://science.nasa.gov/mission/mars-2020-perseverance/'],
  ['NASA MSL Curiosity', 'https://science.nasa.gov/mission/msl-curiosity/'],
];
