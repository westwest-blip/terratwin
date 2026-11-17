// TerraTwin — real fotolar, foto cütləri, tarixçə, planet məlumatı (hamısı rəsmi NASA mənbələrindən)

// Ən son real kadrlar (tools/fetch_extra.py ilə NASA API-lərindən yüklənib)
export const PHOTOS = {
  earth: { file: 'assets/photos/earth_epic.jpg', title: 'Yer, 12 noyabr 2026, 09:03 UTC',
    credit: 'NASA EPIC kamerası, NOAA DSCOVR peyki (1,5 mln km məsafədən)', url: 'https://epic.gsfc.nasa.gov/' },
  jezero: { file: 'assets/photos/jezero_latest.jpg', title: 'Ezero krateri, sol 2024 (30 oktyabr 2026)',
    credit: 'NASA/JPL-Caltech/ASU, Perseverance Mastcam-Z, işlənməmiş kadr', url: 'https://mars.nasa.gov/mars2020/multimedia/raw-images/' },
  gale: { file: 'assets/photos/gale_latest.jpg', title: 'Geyl krateri, sol 5073 (13 noyabr 2026)',
    credit: 'NASA/JPL-Caltech, Curiosity Navcam, işlənməmiş kadr', url: 'https://mars.nasa.gov/msl/multimedia/raw-images/' },
  shackleton: { file: 'assets/pairs/crater_moon.jpg', title: 'Şeklton krateri, LOLA hündürlük məlumatından',
    credit: 'NASA SVS / LRO LOLA', url: 'https://svs.gsfc.nasa.gov/4716' },
};

// Planetə klikləyəndə açılan məlumat
export const BODY_INFO = {
  earth: {
    name: 'Yer', photo: 'earth',
    lead: 'Bizim laboratoriyamız. Ayı və Marsı hələ ziyarət edə bilməsək də, onlara bənzəyən yerlərdə avadanlığı və insanları sınaya bilərik.',
    facts: [['Radius', '6 371 km'], ['Cazibə', '9,82 m/s²'], ['Səth təzyiqi', '1 014 mbar'], ['Orta temperatur', '15 °C'], ['Gün', '24 saat'], ['Atmosfer', 'N₂ 78%, O₂ 21%']],
    role: 'Layihədə 9 ərazi var: 7 tanınmış analoq və 2 yeni namizəd (Qobustan, Lut).',
    go: 'analogs', goLabel: 'Ərazilərə bax',
  },
  moon: {
    name: 'Ay', photo: 'shackleton',
    lead: 'Artemis proqramı ilə insanlar Aya qayıdır. Daimi baza üçün əsas bölgə cənub qütbüdür: orada həm daim kölgədə qalan buzlu kraterlər, həm də uzun müddət işıqlı zirvələr var.',
    facts: [['Radius', '1 737 km'], ['Cazibə', '1,62 m/s² (Yerin 1/6-i)'], ['Atmosfer', 'demək olar ki, vakuum'], ['Temperatur', 'ekvatorda −178…+117 °C'], ['Gün', '29,5 Yer günü'], ['Yerdən məsafə', '~384 000 km']],
    role: 'Hədəf: Şeklton krateri (21 km). Ölçüyə görə ən yaxın Yer analoqu Haughton krateridir (23 km).',
    go: 'targets', goLabel: 'Ay hədəfinə bax',
  },
  mars: {
    name: 'Mars', photo: 'gale',
    lead: 'Marsda iki rover işləyir. Curiosity Geyl kraterində, Perseverance Ezero kraterində qədim su izlərini öyrənir. Aşağıdakı kadr Curiosity-nin 13 noyabr 2026-da çəkdiyi real fotodur.',
    facts: [['Radius', '3 390 km'], ['Cazibə', '3,73 m/s² (Yerin 0,38-i)'], ['Səth təzyiqi', '~6,4 mbar'], ['Orta temperatur', '−59 °C'], ['Gün (sol)', '24 saat 40 dəqiqə'], ['Atmosfer', 'CO₂ 95%']],
    role: 'Hədəflər: Ezero (qədim göl və delta) və Geyl (laylı süxurlar, metan ölçmələri).',
    go: 'targets', goLabel: 'Mars hədəflərinə bax',
  },
};

// Real foto cütləri: Yer ↔ Mars/Ay
export const PAIRS = [
  { id: 'fan', type: 'Allüvial yelpik', world: 'mars', site: 'deathvalley', target: 'mars_jezero',
    earth: { img: 'assets/pairs/fan_earth.jpg', name: 'Ölüm Vadisi, ABŞ', credit: 'NASA EO-1 ALI, 23 oktyabr 2002', url: 'https://earthobservatory.nasa.gov/images/78860/mars-rover-curiosity-on-a-familiar-landscape' },
    other: { img: 'assets/pairs/fan_mars.jpg', name: 'Mars, alçaq enlikdə bir krater', credit: 'NASA/JPL/University of Arizona, HiRISE (PIA18513)', url: 'https://science.nasa.gov/photojournal/an-alluvial-fan-in-a-low-latitude-crater/' },
    same: 'Dağdan axan su qumu və çınqılı yelpik şəklində yayır. Hər iki yelpikdə budaqlanan kanallar görünür.',
    diff: 'Ölüm Vadisində yağış indi də yağır. Marsdakı yelpik milyardlarla il əvvəl, səthdə maye su olanda yaranıb.',
    why: 'Ezero kraterindəki delta da belə yaranıb. Yerdəki yelpikdə rover marşrutunu və nümunə götürməni sınamaq olar.' },
  { id: 'crater', type: 'Zərbə krateri', world: 'moon', site: 'haughton', target: 'moon_sp',
    earth: { img: 'assets/pairs/crater_earth.jpg', name: 'Devon adası və Haughton krateri, Kanada', credit: 'NASA Terra MISR, 28 iyun 2001', url: 'https://earthobservatory.nasa.gov/images/2585/mars-researchers-rendezvous-on-remote-arctic-island' },
    other: { img: 'assets/pairs/crater_moon.jpg', name: 'Şeklton krateri, Ayın cənub qütbü', credit: 'NASA SVS, LRO LOLA hündürlük məlumatı', url: 'https://svs.gsfc.nasa.gov/4716' },
    same: 'Hər ikisi zərbə krateridir və ölçüləri demək olar ki, eynidir: 23 km və 21 km. İkisi də soyuq qütb bölgəsindədir.',
    diff: 'Haughton milyonlarla il ərzində aşınıb və dayazdır. Şekltonun dərinliyi 4 km-dən çoxdur, dibinə heç vaxt Günəş düşmür.',
    why: 'Haughton-Mars Project 1997-dən burada kosmonavtların səth çıxışlarını və robotları sınayır.' },
  { id: 'wind', type: 'Külək eroziyası', world: 'mars', site: 'lut', target: 'mars_gale',
    earth: { img: 'assets/pairs/wind_earth.jpg', name: 'Lut səhrası, İran', credit: 'NASA Terra MODIS, 20 aprel 2024', url: 'https://science.nasa.gov/earth/earth-observatory/irans-lut-desert-153634/' },
    other: { img: 'assets/pairs/wind_mars.jpg', name: 'Marsda küləyin oyduğu süxurlar', credit: 'NASA/JPL/University of Arizona, HiRISE (PIA21111)', url: 'https://science.nasa.gov/photojournal/wind-carved-rock/' },
    same: 'Güclü külək yumşaq süxuru bir istiqamətdə oyur və uzun, paralel tirələr (yardanqlar) yaranır.',
    diff: 'Kadrların miqyası fərqlidir: Lut kadrı yüz kilometrlərlə, HiRISE kadrı bir neçə kilometrdir. Mars atmosferi Yerinkindən təxminən 160 dəfə seyrəkdir.',
    why: 'Yeni namizəd. Lutda küləyin süxuru hansı sürətlə aşındırdığını ölçüb, Marsdakı səthlərin yaşını daha dəqiq qiymətləndirmək olar.' },
  { id: 'mud', type: 'Palçıq vulkanı', world: 'mars', site: 'qobustan', target: 'mars_gale',
    earth: { img: 'assets/pairs/mud_earth.jpg', name: 'Bakı arxipelaqı, Azərbaycan', credit: 'NASA/USGS Landsat 8 OLI, 30 avqust 2025', url: 'https://science.nasa.gov/earth/earth-observatory/a-school-of-mud-volcano-islands-in-azerbaijan/' },
    other: { img: 'assets/pairs/mud_mars.jpg', name: 'Marsın şimal düzənliklərində təpəciklər', credit: 'NASA/JPL/University of Arizona, HiRISE (PIA25987)', url: 'https://science.nasa.gov/photojournal/muddy-mounds/' },
    same: 'NASA alimləri Marsdakı bu təpəcikləri Yerdəki palçıq vulkanlarına bənzədir. USGS-ə görə Azərbaycanın palçıq vulkanları belə müqayisələrdə analoq kimi istifadə olunur.',
    diff: 'Marsdakı təpəciklərin mənşəyi hələ sübut olunmayıb. Aşağı təzyiqdə palçıq başqa cür axır.',
    why: 'Yeni namizəd. Palçıq vulkanları dərinlikdən material çıxarır, Curiosity isə Geyl kraterində metan ölçüb. Qobustan bu prosesləri yaxından öyrənməyə imkan verir.' },
];

// NASA-nın Yerdəki analoq tarixçəsi (yalnız yoxlanılmış faktlar)
export const HISTORY = [
  { year: '1965, 1967', place: 'İslandiya', lat: 65.05, lon: -16.78, text: 'Apollo astronavtları Ayda geoloji iş üçün İslandiyanın vulkanik düzənliklərində məşq edir.', src: 'NASA Science, 10 Things to Know About Planetary Analogs' },
  { year: '1969', place: 'Sierra Blanca, Texas', lat: 31.17, lon: -105.36, text: 'Apollo 11 ekipajı (Armstrong və Aldrin) uçuşdan beş ay əvvəl süxur nümunəsi toplamağı məşq edir.', src: 'NASA Science, 10 Things to Know About Planetary Analogs' },
  { year: '1997', place: 'Haughton krateri, Kanada', lat: 75.37, lon: -89.68, text: 'Haughton-Mars Project başlayır: robot və insan kəşfiyyatı Marsa bənzər qütb səhrasında sınanır.', src: 'NASA Science; Haughton-Mars Project' },
  { year: '2008', place: 'Black Point lava axını, Arizona', lat: 35.68, lon: -111.47, text: 'Desert RATS sınaqları: NASA Ay roverini lava sahəsində sınayır.', src: 'NASA Science, 10 Things to Know About Planetary Analogs' },
  { year: '2008–2012', place: 'Mauna Kea, Havay', lat: 19.82, lon: -155.47, text: 'Ay regolitinə bənzər vulkanik qumda yerli resurslardan oksigen almaq (ISRU) sınanır.', src: 'NASA NTRS, ISRU analog field tests' },
  { year: '2016', place: 'Aquarius stansiyası, Florida', lat: 24.95, lon: -80.45, text: 'NEEMO 21: ekipaj 19 metr dərinlikdəki stansiyada 16 günlük kosmik missiyanı simulyasiya edir.', src: 'NASA Science, 10 Things to Know About Planetary Analogs' },
  { year: '2024', place: 'Ayın cənub qütbü', body: 'moon', lat: -89.9, lon: 0, text: 'NASA Artemis III üçün 9 namizəd eniş bölgəsini açıqlayır. Hamısı cənub qütbünə yaxındır.', src: 'NASA, 28 oktyabr 2024' },
  { year: '2026', place: 'Qobustan və Lut', lat: 40.02, lon: 49.40, text: 'TerraTwin açıq NASA məlumatları ilə iki yeni namizəd təklif edir: palçıq vulkanları və yardanqlar.', src: 'Bu layihə', ours: true },
];

// Kosmik zibil — rəsmi rəqəmlər
export const DEBRIS = {
  facts: [['25 000-dən çox', 'izlənilən obyekt (10 sm-dən böyük)'], ['~500 000', 'qırıntı (1–10 sm)'], ['100 milyondan çox', 'hissəcik (1 sm-dən kiçik)']],
  src: 'NASA Orbital Debris Program Office', url: 'https://orbitaldebris.jsc.nasa.gov/faq.html',
};
