/*
 * Конструктор частного дома — svoyproect.kz
 * Подбирает проекты из HOUSE_CATALOG под параметры посетителя, строит
 * 3D-модель (Three.js), схемы планировок и генплан участка.
 */

const PHONE = '77755557475';
const FLOOR_H = 3.0;   // высота этажа, м
const PLINTH = 0.5;    // цоколь, м
const KNEE = 1.3;      // мансардная стенка, м
const SIDE = 3;        // отступ от соседних участков, м
const FRONT = 5;       // отступ от красной линии улицы, м
const BACK = 3;
const GARAGE_W = 4, GARAGE_D = 6;
const TERRACE_D = 2.5;
const MAX_COVER = 0.5; // максимальная доля застройки участка

/* ------------------------------------------------------------------ i18n */

const T = {
  ru: {
    brandSub: 'Проектная компания', back: 'На главную', badge: 'Онлайн-конструктор частного дома',
    h1a: 'Спроектируйте', h1b: 'свой дом', h1c: 'за пару минут',
    lead: 'Укажите участок, размеры, этажность и материал — программа подберёт подходящие проекты из каталога и покажет ваш будущий дом в 3D, с планировками и расположением на участке.',
    s1: 'Введите параметры', s2: 'Выберите вариант в 3D', s3: 'Закажите рабочий проект',
    formTitle: 'Параметры дома', gPlot: 'Участок', plotArea: 'Площадь участка', sot: 'сот.', plotWidth: 'Ширина участка', auto: 'авто',
    plotHint: '1 сотка = 100 м². Ширина — сторона участка вдоль улицы; если не знаете, оставьте пустым.',
    gSize: 'Размеры дома', modeDims: 'Длина × ширина', modeArea: 'Общая площадь', houseW: 'Ширина (фасад)', houseL: 'Длина (глубина)', houseArea: 'Желаемая общая площадь',
    gFloors: 'Этажность', f1: '1 этаж', f15: 'С мансардой', f2: '2 этажа', f3: '3 этажа',
    gMat: 'Материал стен', gExtra: 'Пожелания', roofLbl: 'Кровля', any: 'Не важно',
    r_gable: 'Двускатная', r_hip: 'Вальмовая (четырёхскатная)', r_flat: 'Плоская', r_shed: 'Односкатная', r_mansard: 'Мансардная',
    bedsLbl: 'Спален', garageLbl: 'Гараж', yes: 'Нужен', no: 'Не нужен', submit: 'Подобрать варианты',
    resTitle: 'Подходящие варианты', t3d: '3D-модель', tPlan: 'Планировка', tSite: 'На участке',
    cFront: 'Фасад', cCorner: '3/4', cTop: 'Сверху', cPlot: 'Участок', drag: 'Вращайте мышью или пальцем',
    note: 'Визуализация и планировка — эскизные и ориентировочные. Точные площади, конструктив, инженерные системы и смета определяются в рабочем проекте с учётом вашего участка и норм РК.',
    orderTitle: 'Получите полный рабочий проект этого дома',
    orderText: 'Адаптируем выбранный вариант под ваш участок и пожелания и подготовим комплект документации для строительства.',
    o1: 'Архитектурные и конструктивные решения', o2: 'Инженерные сети: отопление, водоснабжение, электрика', o3: 'Генплан и помощь с согласованием',
    orderWa: 'Написать в WhatsApp', orderCall: 'Позвонить',
    ctaTitle: 'Нужен индивидуальный проект?',
    ctaText: 'Не нашли подходящий вариант — спроектируем дом с нуля по вашему участку и пожеланиям. Позвоните или напишите в WhatsApp.',
    copyright: '© 2026 ТОО «СВОЙ ПРОЕКТ». Проектирование объектов под ключ.',
    title: 'Спроектировать дом онлайн — СВОЙ ПРОЕКТ',
    m: 'м', m2: 'м²', floorsShort: { 1: '1 этаж', 1.5: '1 этаж + мансарда', 2: '2 этажа', 3: '3 этажа' },
    summary: (n, sot, pw, pl) => `Найдено вариантов: ${n}. Участок ${fmt(sot)} сот. (≈ ${fmt(pw)} × ${fmt(pl)} м). Нажмите на карточку, чтобы рассмотреть дом в 3D.`,
    noFit: (mw, ml, maxA) => `На этом участке с отступами (5 м от улицы, 3 м от соседей) помещается пятно дома не больше ≈ ${fmt(mw)} × ${fmt(ml)} м, а площадь застройки — не больше ${fmt(maxA)} м². Уменьшите размеры дома, добавьте этаж или увеличьте участок. Ниже — ближайшие варианты, их можно адаптировать в индивидуальном проекте.`,
    badInput: 'Проверьте параметры: площадь участка от 2 соток, размеры дома от 4 до 30 м, площадь от 30 м².',
    noFitTag: 'Не помещается на участке', bedsN: n => `${n} ${plural(n, 'спальня', 'спальни', 'спален')}`,
    specProject: 'Проект', specStyle: 'Стиль', specFloors: 'Этажность', specSize: 'Габариты дома', specTotal: 'Общая площадь (ориент.)',
    specBuilt: 'Площадь застройки', specBeds: 'Спальни', specBaths: 'Санузлы', specRoof: 'Кровля', specMat: 'Материал стен',
    specGarage: 'Гараж', specTerrace: 'Терраса', specHeight: 'Высота дома (ориент.)', specPlot: 'Участок', specCover: 'Застройка участка',
    yesShort: 'есть', noShort: 'нет', street: 'УЛИЦА', entrance: 'Вход', floorCap: ['1 этаж', '2 этаж', '3 этаж'], attic: 'Мансарда',
    atticNote: 'площадь с учётом скосов', garage: 'Гараж', terrace: 'Терраса',
    no3d: 'Не удалось загрузить 3D-просмотр в этом браузере. Планировка и генплан доступны на соседних вкладках.',
    wa: v => `Здравствуйте! Я подобрал(а) дом в онлайн-конструкторе на сайте svoyproect.kz и хочу получить полный рабочий проект.\n\nПроект: ${v.p.id} «${v.p.ru}» (${STYLES[v.style].ru})\nЭтажность: ${T.ru.floorsShort[v.floors]}\nГабариты: ${fmt(v.W)} × ${fmt(v.L)} м, общая площадь ≈ ${fmt(v.total)} м²\nМатериал стен: ${MATS[v.mat].ru}\nКровля: ${T.ru['r_' + v.roof]}\nСпален: ${v.beds}, гараж: ${v.garage ? 'да' : 'нет'}\nУчасток: ${fmt(v.plot.sot)} сот. (${fmt(v.plot.w)} × ${fmt(v.plot.l)} м)`,
    waGeneric: 'Здравствуйте! Хочу проконсультироваться по проекту частного дома (svoyproect.kz).'
  },
  kz: {
    brandSub: 'Жобалау компаниясы', back: 'Басты бетке', badge: 'Жеке үйдің онлайн-конструкторы',
    h1a: 'Өз үйіңізді', h1b: 'бірнеше минутта', h1c: 'жобалаңыз',
    lead: 'Учаскені, өлшемдерді, қабат санын және материалды көрсетіңіз — бағдарлама каталогтан лайықты жобаларды таңдап, болашақ үйіңізді 3D форматта, жоспарларымен және учаскедегі орналасуымен көрсетеді.',
    s1: 'Параметрлерді енгізіңіз', s2: '3D-нұсқаны таңдаңыз', s3: 'Жұмыс жобасына тапсырыс беріңіз',
    formTitle: 'Үй параметрлері', gPlot: 'Учаске', plotArea: 'Учаске ауданы', sot: 'сот.', plotWidth: 'Учаске ені', auto: 'авто',
    plotHint: '1 сотық = 100 м². Ені — учаскенің көше бойындағы жағы; білмесеңіз, бос қалдырыңыз.',
    gSize: 'Үйдің өлшемдері', modeDims: 'Ұзындығы × ені', modeArea: 'Жалпы ауданы', houseW: 'Ені (қасбет)', houseL: 'Ұзындығы (тереңдігі)', houseArea: 'Қалаған жалпы аудан',
    gFloors: 'Қабат саны', f1: '1 қабат', f15: 'Мансардалы', f2: '2 қабат', f3: '3 қабат',
    gMat: 'Қабырға материалы', gExtra: 'Тілектер', roofLbl: 'Шатыр', any: 'Маңызды емес',
    r_gable: 'Екі беткейлі', r_hip: 'Төрт беткейлі', r_flat: 'Жалпақ', r_shed: 'Бір беткейлі', r_mansard: 'Мансардалы',
    bedsLbl: 'Жатын бөлме', garageLbl: 'Гараж', yes: 'Керек', no: 'Керек емес', submit: 'Нұсқаларды таңдау',
    resTitle: 'Лайықты нұсқалар', t3d: '3D-модель', tPlan: 'Жоспар', tSite: 'Учаскеде',
    cFront: 'Қасбет', cCorner: '3/4', cTop: 'Жоғарыдан', cPlot: 'Учаске', drag: 'Тышқанмен немесе саусақпен айналдырыңыз',
    note: 'Визуализация мен жоспар — эскиздік әрі шамамен берілген. Нақты аудандар, конструктив, инженерлік жүйелер мен смета учаскеңіз бен ҚР нормаларын ескере отырып, жұмыс жобасында анықталады.',
    orderTitle: 'Осы үйдің толық жұмыс жобасын алыңыз',
    orderText: 'Таңдалған нұсқаны учаскеңізге және тілектеріңізге бейімдеп, құрылысқа арналған құжаттама жинағын дайындаймыз.',
    o1: 'Сәулеттік және конструктивтік шешімдер', o2: 'Инженерлік желілер: жылыту, сумен жабдықтау, электр', o3: 'Бас жоспар және келісуге көмек',
    orderWa: 'WhatsApp-қа жазу', orderCall: 'Қоңырау шалу',
    ctaTitle: 'Жеке жоба керек пе?',
    ctaText: 'Лайықты нұсқа таппадыңыз ба — учаскеңіз бен тілектеріңіз бойынша үйді нөлден жобалаймыз. Қоңырау шалыңыз немесе WhatsApp-қа жазыңыз.',
    copyright: '© 2026 ТОО «СВОЙ ПРОЕКТ». Нысандарды кілтпен жобалау.',
    title: 'Үйді онлайн жобалау — СВОЙ ПРОЕКТ',
    m: 'м', m2: 'м²', floorsShort: { 1: '1 қабат', 1.5: '1 қабат + мансарда', 2: '2 қабат', 3: '3 қабат' },
    summary: (n, sot, pw, pl) => `Табылған нұсқалар: ${n}. Учаске ${fmt(sot)} сот. (≈ ${fmt(pw)} × ${fmt(pl)} м). Үйді 3D форматта көру үшін карточканы басыңыз.`,
    noFit: (mw, ml, maxA) => `Бұл учаскеде шегіністерді ескергенде (көшеден 5 м, көршілерден 3 м) үй ізі ≈ ${fmt(mw)} × ${fmt(ml)} м-ден, ал құрылыс ауданы ${fmt(maxA)} м²-ден аспауы керек. Үй өлшемін азайтыңыз, қабат қосыңыз немесе учаскені үлкейтіңіз. Төменде — ең жақын нұсқалар, оларды жеке жобада бейімдеуге болады.`,
    badInput: 'Параметрлерді тексеріңіз: учаске ауданы 2 сотықтан, үй өлшемі 4-тен 30 м-ге дейін, аудан 30 м²-ден.',
    noFitTag: 'Учаскеге сыймайды', bedsN: n => `${n} жатын бөлме`,
    specProject: 'Жоба', specStyle: 'Стиль', specFloors: 'Қабат саны', specSize: 'Үй өлшемдері', specTotal: 'Жалпы аудан (шамамен)',
    specBuilt: 'Құрылыс ауданы', specBeds: 'Жатын бөлмелер', specBaths: 'Санторабтар', specRoof: 'Шатыр', specMat: 'Қабырға материалы',
    specGarage: 'Гараж', specTerrace: 'Терраса', specHeight: 'Үй биіктігі (шамамен)', specPlot: 'Учаске', specCover: 'Учаскенің құрылыс тығыздығы',
    yesShort: 'бар', noShort: 'жоқ', street: 'КӨШЕ', entrance: 'Кіреберіс', floorCap: ['1 қабат', '2 қабат', '3 қабат'], attic: 'Мансарда',
    atticNote: 'көлбеуді ескергендегі аудан', garage: 'Гараж', terrace: 'Терраса',
    no3d: 'Бұл браузерде 3D-көріністі жүктеу мүмкін болмады. Жоспар мен бас жоспар көрші қойындыларда қолжетімді.',
    wa: v => `Сәлеметсіз бе! svoyproect.kz сайтындағы онлайн-конструкторда үй таңдадым, толық жұмыс жобасын алғым келеді.\n\nЖоба: ${v.p.id} «${v.p.kz}» (${STYLES[v.style].kz})\nҚабат саны: ${T.kz.floorsShort[v.floors]}\nӨлшемдері: ${fmt(v.W)} × ${fmt(v.L)} м, жалпы ауданы ≈ ${fmt(v.total)} м²\nҚабырға материалы: ${MATS[v.mat].kz}\nШатыр: ${T.kz['r_' + v.roof]}\nЖатын бөлмелер: ${v.beds}, гараж: ${v.garage ? 'иә' : 'жоқ'}\nУчаске: ${fmt(v.plot.sot)} сот. (${fmt(v.plot.w)} × ${fmt(v.plot.l)} м)`,
    waGeneric: 'Сәлеметсіз бе! Жеке үй жобасы бойынша кеңес алғым келеді (svoyproect.kz).'
  }
};

const MATS = {
  gas:      { ru: 'Газоблок',   kz: 'Газоблок' },
  brick:    { ru: 'Кирпич',     kz: 'Кірпіш' },
  ceramic:  { ru: 'Керамоблок', kz: 'Керамоблок' },
  wood:     { ru: 'Брус',       kz: 'Бөрене' },
  frame:    { ru: 'Каркас',     kz: 'Қаңқа' },
  monolith: { ru: 'Монолит',    kz: 'Монолит' }
};

const STYLES = {
  classic: { ru: 'Классика', kz: 'Классика' },
  modern:  { ru: 'Современный', kz: 'Заманауи' },
  barn:    { ru: 'Барнхаус', kz: 'Барнхаус' },
  chalet:  { ru: 'Шале', kz: 'Шале' },
  hitech:  { ru: 'Хай-тек', kz: 'Хай-тек' },
  scandi:  { ru: 'Скандинавский', kz: 'Скандинавиялық' }
};

const ROOMS = {
  hall:     { ru: 'Прихожая', kz: 'Кіреберіс', fill: '#eef1f5' },
  living:   { ru: 'Кухня-гостиная', kz: 'Ас үй-қонақ бөлме', fill: '#fdf0de' },
  bed:      { ru: 'Спальня', kz: 'Жатын бөлме', fill: '#e3effb' },
  master:   { ru: 'Мастер-спальня', kz: 'Негізгі жатын бөлме', fill: '#d6e7f9' },
  bath:     { ru: 'Санузел', kz: 'Санторап', fill: '#dff3f1' },
  wc:       { ru: 'Гостевой с/у', kz: 'Қонақ санторабы', fill: '#dff3f1' },
  boiler:   { ru: 'Котельная', kz: 'Қазандық', fill: '#f1ece6' },
  stairs:   { ru: 'Лестница', kz: 'Баспалдақ', fill: '#e9e6f4' },
  hallup:   { ru: 'Холл', kz: 'Холл', fill: '#eef1f5' },
  cabinet:  { ru: 'Кабинет', kz: 'Кабинет', fill: '#eaf3e1' },
  wardrobe: { ru: 'Гардероб', kz: 'Киім бөлмесі', fill: '#f4efe4' }
};

// Внешний вид по стилю: свес кровли, уклон (тангенс), цвета
const LOOK = {
  classic: { over: 0.5, pitch: 0.6, roof: '#8b3a2e', frame: '#ffffff', chimney: true },
  modern:  { over: 0.4, pitch: 0.5, roof: '#4a4f55', frame: '#3a3f45', chimney: false },
  barn:    { over: 0.12, pitch: 1.0, roof: '#2b2f33', frame: '#2b2f33', chimney: false },
  chalet:  { over: 1.0, pitch: 0.5, roof: '#4a3b31', frame: '#5a3f2a', chimney: true },
  hitech:  { over: 0.0, pitch: 0.4, roof: '#5b6066', frame: '#2a2e33', chimney: false },
  scandi:  { over: 0.3, pitch: 0.75, roof: '#3b4148', frame: '#ffffff', chimney: true }
};

/* ------------------------------------------------------------------ utils */

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const fmt = n => {
  const r = Math.round(n * 10) / 10;
  return (Number.isInteger(r) ? String(r) : r.toFixed(1)).replace('.', ',');
};
const plural = (n, one, few, many) => {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Окна по фасаду длиной len: координаты центров от -len/2 до len/2 и номер двери
const facadeSlots = len => {
  const n = Math.max(1, Math.floor(len / 3.2));
  return { n, door: Math.floor((n - 1) / 2), at: i => -len / 2 + (i + 0.5) * len / n };
};
const doorU = W => { const s = facadeSlots(W); return s.at(s.door); };
const half = v => Math.round(v * 2) / 2;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const state = {
  lang: 'ru',
  sizeMode: 'dims',
  floors: 1,
  mat: 'gas',
  variants: [],
  sel: null,
  tab: '3d'
};

function t(key) {
  const d = T[state.lang] || T.ru;
  return key in d ? d[key] : T.ru[key];
}

/* --------------------------------------------------------- canvas textures */

// Каждая текстура — плитка размером tw × th метров
const TEX_SPEC = {
  brick:    { tw: 1.0, th: 0.6 },
  gas:      { tw: 1.2, th: 1.0 },
  ceramic:  { tw: 1.0, th: 1.0 },
  wood:     { tw: 2.0, th: 1.0 },
  frame:    { tw: 1.0, th: 1.0 },
  frameDark:{ tw: 1.0, th: 1.0 },
  monolith: { tw: 2.4, th: 1.2 }
};

function rnd(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => clamp(Math.round(c * k), 0, 255);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function noise(ctx, S, r, alpha) {
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = r() > 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
    ctx.fillRect(r() * S, r() * S, 2, 2);
  }
}

const canvasCache = {};
function wallCanvas(kind) {
  if (canvasCache[kind]) return canvasCache[kind];
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const r = rnd(kind.length * 977 + 13);
  if (kind === 'brick') {
    g.fillStyle = '#d3cabd'; g.fillRect(0, 0, S, S);
    const rows = 8, cols = 4, bh = S / rows, bw = S / cols;
    for (let y = 0; y < rows; y++) {
      const off = y % 2 ? bw / 2 : 0;
      for (let x = -1; x <= cols; x++) {
        g.fillStyle = shade('#a4553a', 0.82 + r() * 0.3);
        g.fillRect(x * bw + off + 2, y * bh + 2, bw - 4, bh - 4);
      }
    }
    noise(g, S, r, 0.06);
  } else if (kind === 'gas' || kind === 'ceramic') {
    const base = kind === 'gas' ? '#ebe6dc' : '#d9a375';
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    noise(g, S, r, 0.05);
    const rows = kind === 'gas' ? 5 : 4, cols = kind === 'gas' ? 2 : 4;
    g.strokeStyle = kind === 'gas' ? 'rgba(80,70,60,.16)' : 'rgba(90,40,10,.28)';
    g.lineWidth = 2;
    for (let y = 0; y < rows; y++) {
      const off = y % 2 ? S / cols / 2 : 0;
      g.beginPath(); g.moveTo(0, y * S / rows); g.lineTo(S, y * S / rows); g.stroke();
      for (let x = 0; x <= cols; x++) {
        const xx = (x * S / cols + off) % S;
        g.beginPath(); g.moveTo(xx, y * S / rows); g.lineTo(xx, (y + 1) * S / rows); g.stroke();
      }
    }
  } else if (kind === 'wood') {
    const logs = 5, h = S / logs;
    for (let i = 0; i < logs; i++) {
      const grd = g.createLinearGradient(0, i * h, 0, (i + 1) * h);
      grd.addColorStop(0, '#6e4523'); grd.addColorStop(0.18, '#b07a45');
      grd.addColorStop(0.55, '#a8733f'); grd.addColorStop(1, '#5e3a1c');
      g.fillStyle = grd; g.fillRect(0, i * h, S, h);
    }
    g.strokeStyle = 'rgba(60,35,15,.25)';
    for (let i = 0; i < 40; i++) {
      const y = r() * S;
      g.beginPath(); g.moveTo(r() * S, y); g.lineTo(r() * S, y + (r() - 0.5) * 3); g.stroke();
    }
  } else if (kind === 'frame' || kind === 'frameDark') {
    const base = kind === 'frame' ? '#e3e6e8' : '#363b40';
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    const boards = 6, w = S / boards;
    for (let i = 0; i < boards; i++) {
      g.fillStyle = shade(kind === 'frame' ? '#e3e6e8' : '#363b40', 0.94 + r() * 0.1);
      g.fillRect(i * w, 0, w - 3, S);
      g.fillStyle = kind === 'frame' ? 'rgba(0,0,0,.14)' : 'rgba(0,0,0,.4)';
      g.fillRect(i * w + w - 3, 0, 3, S);
    }
  } else { // monolith
    g.fillStyle = '#b9bcbf'; g.fillRect(0, 0, S, S);
    noise(g, S, r, 0.07);
    g.strokeStyle = 'rgba(60,60,60,.25)'; g.lineWidth = 2;
    g.strokeRect(1, 1, S / 2 - 2, S - 2); g.strokeRect(S / 2 + 1, 1, S / 2 - 2, S - 2);
    g.fillStyle = 'rgba(60,60,60,.35)';
    [[0.25, 0.25], [0.25, 0.75], [0.75, 0.25], [0.75, 0.75]].forEach(([x, y]) => {
      g.beginPath(); g.arc(x * S, y * S, 3, 0, Math.PI * 2); g.fill();
    });
  }
  canvasCache[kind] = c;
  return c;
}

function texKind(mat, style) {
  if (mat === 'frame' && (style === 'barn' || style === 'modern' || style === 'hitech')) return 'frameDark';
  return mat;
}

/* ------------------------------------------------------- variant generation */

const FLOOR_K = { 1: 1, 1.5: 1.8, 2: 2, 3: 3 };

// Раскладка помещений: прямоугольник делится «squarified treemap»
function squarify(items, rect) {
  const out = [];
  let rest = items.slice();
  let r = { ...rect };
  const sum = a => a.reduce((s, i) => s + i.a, 0);
  const worst = (row, side) => {
    const s = sum(row);
    return Math.max(...row.map(i => Math.max((side * side * i.a) / (s * s), (s * s) / (side * side * i.a))));
  };
  while (rest.length) {
    const side = Math.min(r.w, r.h);
    const row = [rest[0]];
    let i = 1;
    while (i < rest.length && worst(row.concat(rest[i]), side) <= worst(row, side)) row.push(rest[i++]);
    const s = sum(row);
    if (r.w >= r.h) {
      const cw = s / r.h;
      let y = r.y;
      row.forEach(it => { const h = it.a / cw; out.push({ ...it, x: r.x, y, w: cw, h }); y += h; });
      r = { x: r.x + cw, y: r.y, w: r.w - cw, h: r.h };
    } else {
      const rh = s / r.w;
      let x = r.x;
      row.forEach(it => { const w = it.a / rh; out.push({ ...it, x, y: r.y, w, h: rh }); x += w; });
      r = { x: r.x, y: r.y + rh, w: r.w, h: r.h - rh };
    }
    rest = rest.slice(i);
  }
  return out;
}

// Спальни в оставшейся площади: без пожелания — примерно по 18–20 м² на спальню с гардеробом
function bedroomsFor(rest, want) {
  if (rest < 8) return [{ k: 'cabinet', a: Math.max(rest, 1) }];
  let n = want ? Math.min(want, Math.floor(rest / 9)) : clamp(Math.floor(rest / 19), 1, 4);
  n = Math.max(n, 1);
  if (n === 1) return [{ k: rest > 22 ? 'master' : 'bed', a: rest }];
  const unit = rest / (n + 0.3);
  return [{ k: 'master', a: unit * 1.3 }].concat(Array.from({ length: n - 1 }, () => ({ k: 'bed', a: unit })));
}

function program(floors, W, L, wantBeds) {
  const A = W * L;
  const fix = list => list.map(([k, a]) => ({ k, a }));
  const rest = list => A - list.reduce((s, i) => s + i.a, 0);
  const levels = [];
  if (floors === 1) {
    const f = fix([['hall', Math.max(4, 0.07 * A)], ['living', Math.max(16, 0.3 * A)], ['bath', Math.max(4, 0.06 * A)], ['boiler', Math.max(3, 0.035 * A)]]);
    if (A >= 110) f.push({ k: 'wc', a: 3.5 });
    levels.push({ rooms: f.concat(bedroomsFor(rest(f), wantBeds)), factor: 1 });
  } else {
    const upper = floors === 3 ? 2 : 1;
    const f1 = fix([['hall', Math.max(4, 0.07 * A)], ['living', Math.max(18, (floors === 3 ? 0.42 : 0.36) * A)], ['bath', Math.max(4, 0.06 * A)], ['boiler', Math.max(3, 0.04 * A)], ['stairs', Math.max(5, 0.07 * A)]]);
    const r1 = rest(f1);
    let guest = 0;
    if (r1 >= 26) { f1.push({ k: 'bed', a: r1 * 0.55 }, { k: 'cabinet', a: r1 * 0.45 }); guest = 1; }
    else if (r1 >= 11) { f1.push({ k: 'bed', a: r1 }); guest = 1; }
    else f1.push({ k: 'cabinet', a: Math.max(r1, 1) });
    levels.push({ rooms: f1, factor: 1 });
    const wantUp = wantBeds ? Math.max(1, wantBeds - guest) : 0;
    for (let i = 0; i < upper; i++) {
      const top = i === upper - 1;
      const f = fix([['stairs', Math.max(5, 0.07 * A)], ['hallup', Math.max(5, 0.1 * A)], ['bath', Math.max(4.5, 0.07 * A)]]);
      if (A >= 90) f.push({ k: 'wardrobe', a: 0.04 * A });
      const share = !wantUp ? 0 : upper === 2 ? (top ? Math.ceil(wantUp / 2) : Math.floor(wantUp / 2) || 1) : wantUp;
      levels.push({ rooms: f.concat(bedroomsFor(rest(f), share)), factor: floors === 1.5 ? 0.8 : 1, attic: floors === 1.5 });
    }
  }
  levels.forEach(lv => {
    lv.rooms.sort((a, b) => b.a - a.a);
    lv.rects = squarify(lv.rooms, { x: 0, y: 0, w: W, h: L });
    lv.rects.forEach(rc => { rc.net = rc.w * rc.h * 0.9 * lv.factor; });
    lv.total = lv.rects.reduce((s, rc) => s + rc.net, 0);
  });
  return levels;
}

function plotDims(sot, width) {
  const area = sot * 100;
  const w = width ? width : half(Math.sqrt(area / 1.5));
  return { sot, area, w, l: area / w };
}

function readInput() {
  const num = id => parseFloat(String($(id).value).replace(',', '.'));
  return {
    sot: num('#plotSot'),
    plotW: num('#plotW') || 0,
    W: num('#houseW'),
    L: num('#houseL'),
    area: num('#houseArea'),
    mode: state.sizeMode,
    floors: state.floors,
    mat: state.mat,
    roof: $('#roof').value,
    beds: parseInt($('#beds').value, 10) || 0,
    garage: $('#garage').value
  };
}

function validate(inp) {
  if (!(inp.sot >= 2 && inp.sot <= 500)) return false;
  if (inp.plotW && !(inp.plotW >= 8 && inp.plotW <= 300)) return false;
  if (inp.mode === 'dims') return inp.W >= 4 && inp.W <= 30 && inp.L >= 4 && inp.L <= 30;
  return inp.area >= 30 && inp.area <= 1000;
}

function makeVariant(p, inp, plot) {
  const floors = inp.floors;
  let W, L, penalty = 0;
  if (inp.mode === 'dims') {
    W = inp.W; L = inp.L;
    const want = W / L, a = p.w / p.l, b = p.l / p.w;
    penalty += 3 * Math.min(Math.abs(Math.log(a / want)), Math.abs(Math.log(b / want)) + 0.15);
  } else {
    const s = Math.sqrt(inp.area / (p.w * p.l * 0.9 * FLOOR_K[floors]));
    W = clamp(half(p.w * s), 4, 30);
    L = clamp(half(p.l * s), 4, 30);
    penalty += 2 * Math.abs(Math.log(s));
  }
  let roof = p.roof;
  if (floors === 1.5) roof = 'mansard';
  else if (roof === 'mansard') roof = 'gable';
  if (inp.roof && floors !== 1.5) {
    if (roof !== inp.roof) penalty += 0.5;
    roof = inp.roof;
  }
  const garage = inp.garage === 'yes' ? true : inp.garage === 'no' ? false : p.garage;
  if (inp.garage === 'yes' && !p.garage) penalty += 0.6;
  if (inp.garage === 'no' && p.garage) penalty += 0.3;
  if (!p.materials.includes(inp.mat)) penalty += 1.5;

  const levels = program(floors, W, L, inp.beds);
  const beds = levels.reduce((s, lv) => s + lv.rects.filter(r => r.k === 'bed' || r.k === 'master').length, 0);
  const baths = levels.reduce((s, lv) => s + lv.rects.filter(r => r.k === 'bath' || r.k === 'wc').length, 0);
  if (inp.beds) penalty += Math.abs(beds - inp.beds);
  const total = levels.reduce((s, lv) => s + lv.total, 0);

  // Размещение на участке
  const gd = garage ? Math.min(GARAGE_D, Math.max(L, 5)) : 0;
  const fw = W + (garage ? GARAGE_W : 0);
  const fd = Math.max(L, gd) + (p.terrace ? TERRACE_D : 0);
  const availW = plot.w - 2 * SIDE, availL = plot.l - FRONT - BACK;
  const normal = fw <= availW && fd <= availL;
  const rotated = !normal && fd <= availW && fw <= availL;
  const built = W * L + (garage ? GARAGE_W * gd : 0);
  const cover = built / plot.area;
  const fits = (normal || rotated) && cover <= MAX_COVER;
  if (!fits) penalty += 10;

  const v = {
    p, W, L, floors, roof, garage, gd, terrace: p.terrace, mat: inp.mat, style: p.style,
    levels, beds, baths, total, built, cover, fits, rotated, plot, score: penalty
  };
  v.geo = geometry(v);
  return v;
}

// Общая геометрия дома — используется и 3D-моделью, и чертежами
function geometry(v) {
  const look = LOOK[v.style];
  const wallTop = PLINTH + (v.floors === 1.5 ? FLOOR_H + KNEE : v.floors * FLOOR_H);
  let ridgeAlongZ, span, h = 0, over = look.over;
  if (v.roof === 'hip') {
    ridgeAlongZ = v.L > v.W;
    span = Math.min(v.W, v.L);
    h = span / 2 * 0.55;
  } else if (v.roof === 'gable' || v.roof === 'mansard') {
    ridgeAlongZ = v.style === 'barn' || v.style === 'chalet' || v.L > v.W * 1.15;
    span = ridgeAlongZ ? v.W : v.L;
    const pitch = v.roof === 'mansard' ? Math.max(look.pitch, 0.85) : look.pitch;
    h = span / 2 * pitch;
  } else if (v.roof === 'shed') {
    h = v.L * 0.16;
  } else {
    h = 0.35;
    over = v.style === 'hitech' ? 0 : 0.35;
  }
  return { wallTop, ridgeAlongZ, span, h, over, height: wallTop + h };
}

function pickVariants(inp) {
  const plot = plotDims(inp.sot, inp.plotW);
  let list = window.HOUSE_CATALOG.filter(p => p.floors === inp.floors).map(p => makeVariant(p, inp, plot));
  list.sort((a, b) => a.score - b.score);
  const fit = list.filter(v => v.fits);
  return { plot, list: (fit.length ? fit : list).slice(0, 6), anyFit: fit.length > 0 };
}

/* ---------------------------------------------------------------- SVG views */

function elevationSVG(v) {
  const g = v.geo, look = LOOK[v.style];
  const gw = v.garage ? GARAGE_W : 0;
  const totalW = v.W + gw + 2 * Math.max(g.over, 0.3);
  const H = g.height + 0.6;
  const S = 10;
  const pad = 1.4;
  const vbW = (totalW + pad * 2) * S, vbH = (H + pad) * S;
  const x0 = (pad + Math.max(g.over, 0.3)) * S;
  const yG = vbH - 0.4 * S;             // линия земли
  const Y = m => yG - m * S;              // высота → y
  const X = m => x0 + m * S;              // позиция по фасаду → x (0..W)
  const wallFill = { gas: '#ebe6dc', brick: '#a4553a', ceramic: '#d9a375', wood: '#a8733f', frame: '#e3e6e8', monolith: '#b9bcbf' }[v.mat];
  const wf = texKind(v.mat, v.style) === 'frameDark' ? '#363b40' : wallFill;
  let s = `<svg viewBox="0 0 ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">`;
  s += `<rect x="0" y="${yG}" width="${vbW}" height="${vbH - yG}" fill="#b9cf9f"/>`;
  // гараж
  if (v.garage) {
    s += `<rect x="${X(v.W)}" y="${Y(PLINTH + 3)}" width="${gw * S}" height="${(3 + PLINTH) * S}" fill="${wf}" stroke="#2b3138" stroke-width="1"/>`;
    s += `<rect x="${X(v.W + 0.7)}" y="${Y(PLINTH + 2.3)}" width="${2.6 * S}" height="${2.3 * S}" fill="#d6d9dd" stroke="#8a929b"/>`;
    s += `<rect x="${X(v.W) - 2}" y="${Y(PLINTH + 3.3)}" width="${gw * S + 6}" height="${0.3 * S}" fill="${look.roof}"/>`;
  }
  // стены
  s += `<rect x="${X(0)}" y="${Y(g.wallTop)}" width="${v.W * S}" height="${(g.wallTop - PLINTH) * S}" fill="${wf}" stroke="#2b3138" stroke-width="1"/>`;
  s += `<rect x="${X(0)}" y="${Y(PLINTH)}" width="${v.W * S}" height="${PLINTH * S}" fill="#7d8186"/>`;
  // кровля
  const o = g.over;
  const top = g.wallTop;
  if (v.roof === 'flat') {
    s += `<rect x="${X(-o)}" y="${Y(top + 0.35)}" width="${(v.W + 2 * o) * S}" height="${0.35 * S}" fill="${look.roof}"/>`;
  } else if (v.roof === 'shed') {
    s += `<polygon points="${X(-o)},${Y(top)} ${X(v.W + o)},${Y(top)} ${X(v.W + o)},${Y(top + g.h)} ${X(-o)},${Y(top + g.h)}" fill="${look.roof}" opacity=".92"/>`;
    s += `<rect x="${X(-o)}" y="${Y(top + 0.25)}" width="${(v.W + 2 * o) * S}" height="${0.25 * S}" fill="#2b3138"/>`;
  } else if (g.ridgeAlongZ && v.roof !== 'hip') {
    const slope = g.h / (v.W / 2);
    s += `<polygon points="${X(0)},${Y(top)} ${X(v.W / 2)},${Y(top + g.h)} ${X(v.W)},${Y(top)}" fill="${wf}" stroke="#2b3138" stroke-width="1"/>`;
    s += `<polyline points="${X(-o)},${Y(top - o * slope)} ${X(v.W / 2)},${Y(top + g.h)} ${X(v.W + o)},${Y(top - o * slope)}" fill="none" stroke="${look.roof}" stroke-width="${0.35 * S}" stroke-linejoin="round"/>`;
  } else {
    const ridgeHalf = v.roof === 'hip' ? Math.max(0, (Math.max(v.W, v.L) - Math.min(v.W, v.L)) / 2) : v.W / 2 + o;
    const along = v.roof === 'hip' ? (v.L > v.W ? 0 : ridgeHalf) : ridgeHalf;
    const cx = v.W / 2;
    const eaveY = top - o * (g.h / (g.span / 2));
    s += `<polygon points="${X(-o)},${Y(eaveY)} ${X(v.W + o)},${Y(eaveY)} ${X(cx + along)},${Y(top + g.h)} ${X(cx - along)},${Y(top + g.h)}" fill="${look.roof}"/>`;
  }
  // окна и дверь
  const frame = look.frame;
  const glass = '#3c5266';
  const full = v.floors === 1.5 ? 1 : v.floors;
  const big = v.style === 'modern' || v.style === 'hitech';
  const slots = facadeSlots(v.W);
  for (let f = 0; f < full; f++) {
    for (let i = 0; i < slots.n; i++) {
      const u = v.W / 2 + slots.at(i);
      const isDoor = f === 0 && i === slots.door;
      const base = PLINTH + f * FLOOR_H;
      if (isDoor) {
        s += `<rect x="${X(u - 0.5)}" y="${Y(base + 2.2)}" width="${S}" height="${2.2 * S}" fill="#6b4a2f" stroke="${frame}"/>`;
      } else {
        const ww = big ? 2.0 : 1.2, wh = big ? 2.2 : 1.4, sill = big ? 0.4 : 0.9;
        s += `<rect x="${X(u - ww / 2)}" y="${Y(base + sill + wh)}" width="${ww * S}" height="${wh * S}" fill="${glass}" stroke="${frame}" stroke-width="2"/>`;
      }
    }
  }
  if ((v.roof === 'mansard' || v.roof === 'gable') && g.ridgeAlongZ) {
    s += `<rect x="${X(v.W / 2 - 0.6)}" y="${Y(top + g.h * 0.2 + 1.2)}" width="${1.2 * S}" height="${1.2 * S}" fill="${glass}" stroke="${frame}" stroke-width="2"/>`;
  }
  if (v.terrace) {
    s += `<rect x="${X(v.W * 0.15)}" y="${Y(PLINTH)}" width="${v.W * 0.7 * S}" height="${PLINTH * S}" fill="#9a6b40"/>`;
  }
  s += '</svg>';
  return s;
}

function planSVG(v, lv, idx) {
  const L = state.lang;
  const pad = 1.6;
  const gw = idx === 0 && v.garage ? GARAGE_W : 0;
  const td = idx === 0 && v.terrace ? TERRACE_D : 0;
  const S = 40;
  const vbW = (v.W + gw + pad * 2) * S, vbH = (v.L + td + pad * 2) * S;
  const X = m => (pad + m) * S, Y = m => (pad + m) * S;
  let s = `<svg viewBox="0 0 ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg" font-family="Manrope, sans-serif">`;
  lv.rects.forEach(r => {
    const R = ROOMS[r.k];
    s += `<rect x="${X(r.x)}" y="${Y(r.y)}" width="${r.w * S}" height="${r.h * S}" fill="${R.fill}" stroke="#2b3138" stroke-width="3"/>`;
    const name = R[L];
    const fs = clamp(Math.min(r.w * S / (name.length * 0.62), r.h * S / 3.2), 6.5, 15);
    const cx = X(r.x + r.w / 2), cy = Y(r.y + r.h / 2);
    s += `<text x="${cx}" y="${cy - fs * 0.15}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="#11161d">${esc(name)}</text>`;
    s += `<text x="${cx}" y="${cy + fs * 1.15}" text-anchor="middle" font-size="${fs * 0.92}" fill="#56616f">${fmt(r.net)} ${t('m2')}</text>`;
  });
  s += `<rect x="${X(0)}" y="${Y(0)}" width="${v.W * S}" height="${v.L * S}" fill="none" stroke="#11161d" stroke-width="9"/>`;
  if (gw) {
    const gy = v.L - v.gd;
    s += `<rect x="${X(v.W)}" y="${Y(gy)}" width="${gw * S}" height="${v.gd * S}" fill="#e6e8eb" stroke="#11161d" stroke-width="6"/>`;
    s += `<text x="${X(v.W + gw / 2)}" y="${Y(gy + v.gd / 2)}" text-anchor="middle" font-size="14" font-weight="700" fill="#3a4453">${esc(t('garage'))}</text>`;
    s += `<text x="${X(v.W + gw / 2)}" y="${Y(gy + v.gd / 2) + 17}" text-anchor="middle" font-size="12" fill="#56616f">${fmt(GARAGE_W * v.gd * 0.9)} ${t('m2')}</text>`;
  }
  if (td) {
    const tw = Math.min(v.W * 0.7, 7);
    s += `<rect x="${X(v.W / 2 - tw / 2)}" y="${Y(v.L)}" width="${tw * S}" height="${td * S}" fill="#f3e6d6" stroke="#9a6b40" stroke-width="2" stroke-dasharray="8 5"/>`;
    s += `<text x="${X(v.W / 2)}" y="${Y(v.L + td / 2) + 5}" text-anchor="middle" font-size="13" font-weight="700" fill="#7a5330">${esc(t('terrace'))}</text>`;
  }
  if (idx === 0) {
    const ex = X(v.W / 2 + doorU(v.W)), ey = Y(v.L + td) + 8;
    s += `<path d="M${ex - 9},${ey + 14} L${ex},${ey} L${ex + 9},${ey + 14}" fill="none" stroke="#2f7fd1" stroke-width="3"/>`;
    s += `<text x="${ex}" y="${ey + 30}" text-anchor="middle" font-size="12" font-weight="700" fill="#2f7fd1">${esc(t('entrance'))}</text>`;
  }
  // размеры
  const dy = Y(0) - 0.8 * S;
  s += `<line x1="${X(0)}" y1="${dy}" x2="${X(v.W)}" y2="${dy}" stroke="#7c8694" stroke-width="1.5"/>`;
  s += `<line x1="${X(0)}" y1="${dy - 6}" x2="${X(0)}" y2="${dy + 6}" stroke="#7c8694" stroke-width="1.5"/><line x1="${X(v.W)}" y1="${dy - 6}" x2="${X(v.W)}" y2="${dy + 6}" stroke="#7c8694" stroke-width="1.5"/>`;
  s += `<text x="${X(v.W / 2)}" y="${dy - 7}" text-anchor="middle" font-size="14" font-weight="700" fill="#3a4453">${fmt(v.W)} ${t('m')}</text>`;
  const dx = X(0) - 0.8 * S;
  s += `<line x1="${dx}" y1="${Y(0)}" x2="${dx}" y2="${Y(v.L)}" stroke="#7c8694" stroke-width="1.5"/>`;
  s += `<line x1="${dx - 6}" y1="${Y(0)}" x2="${dx + 6}" y2="${Y(0)}" stroke="#7c8694" stroke-width="1.5"/><line x1="${dx - 6}" y1="${Y(v.L)}" x2="${dx + 6}" y2="${Y(v.L)}" stroke="#7c8694" stroke-width="1.5"/>`;
  s += `<text x="${dx - 7}" y="${Y(v.L / 2)}" text-anchor="middle" font-size="14" font-weight="700" fill="#3a4453" transform="rotate(-90 ${dx - 7} ${Y(v.L / 2)})">${fmt(v.L)} ${t('m')}</text>`;
  s += '</svg>';
  return s;
}

// Расположение дома на участке. Мировые координаты: участок по центру,
// улица со стороны +z. Локальные координаты дома: фасад смотрит в +z.
function placement(v) {
  const tw = Math.min(v.W * 0.7, 7);
  const parts = [{ k: 'house', x0: -v.W / 2, x1: v.W / 2, z0: -v.L / 2, z1: v.L / 2 }];
  if (v.garage) parts.push({ k: 'garage', x0: v.W / 2, x1: v.W / 2 + GARAGE_W, z0: v.L / 2 - v.gd, z1: v.L / 2 });
  if (v.terrace) parts.push({ k: 'terrace', x0: -tw / 2, x1: tw / 2, z0: v.L / 2, z1: v.L / 2 + TERRACE_D });
  const lx0 = Math.min(...parts.map(p => p.x0)), lx1 = Math.max(...parts.map(p => p.x1));
  const lz0 = Math.min(...parts.map(p => p.z0)), lz1 = Math.max(...parts.map(p => p.z1));
  const rot = v.rotated ? 1 : 0;
  const tf = (x, z) => (rot ? [z, -x] : [x, z]);
  let cx, cz;
  const pw = v.plot.w, pl = v.plot.l;
  if (!rot) {
    cx = -(lx0 + lx1) / 2;
    cz = pl / 2 - FRONT - lz1;
  } else {
    // после поворота: x ∈ [lz0, lz1], z ∈ [-lx1, -lx0]
    cx = -(lz0 + lz1) / 2;
    const zmin = -pl / 2 + BACK, zmax = pl / 2 - FRONT;
    cz = (zmin + zmax) / 2 + (lx0 + lx1) / 2;
  }
  const toWorld = (x, z) => { const [a, b] = tf(x, z); return [cx + a, cz + b]; };
  const rects = parts.map(p => {
    const a = toWorld(p.x0, p.z0), b = toWorld(p.x1, p.z1);
    return { k: p.k, x0: Math.min(a[0], b[0]), x1: Math.max(a[0], b[0]), z0: Math.min(a[1], b[1]), z1: Math.max(a[1], b[1]) };
  });
  return { rot, cx, cz, toWorld, rects, tw };
}

function siteSVG(v) {
  const pw = v.plot.w, pl = v.plot.l;
  const pad = 4;
  const S = clamp(560 / Math.max(pw, pl), 6, 30);
  const vbW = (pw + pad * 2) * S, vbH = (pl + pad * 2 + 2) * S;
  const X = x => (pad + x + pw / 2) * S, Y = z => (pad + z + pl / 2) * S;
  const pos = placement(v);
  let s = `<svg viewBox="0 0 ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg" font-family="Manrope, sans-serif">`;
  s += `<rect x="${X(-pw / 2)}" y="${Y(-pl / 2)}" width="${pw * S}" height="${pl * S}" fill="#dfeccd" stroke="#4d5a3b" stroke-width="3"/>`;
  s += `<rect x="${X(-pw / 2 + SIDE)}" y="${Y(-pl / 2 + BACK)}" width="${(pw - 2 * SIDE) * S}" height="${(pl - FRONT - BACK) * S}" fill="none" stroke="#c0392b" stroke-width="1.5" stroke-dasharray="7 5"/>`;
  const fills = { house: '#2f7fd1', garage: '#7c8694', terrace: '#c99a6a' };
  pos.rects.forEach(r => {
    s += `<rect x="${X(r.x0)}" y="${Y(r.z0)}" width="${(r.x1 - r.x0) * S}" height="${(r.z1 - r.z0) * S}" fill="${fills[r.k]}" opacity="${r.k === 'house' ? 0.9 : 0.75}" stroke="#11161d" stroke-width="1.5"/>`;
  });
  const h = pos.rects[0];
  const fs = clamp(S * 0.9, 11, 15);
  s += `<text x="${X((h.x0 + h.x1) / 2)}" y="${Y((h.z0 + h.z1) / 2) + 5}" text-anchor="middle" font-size="${fs}" font-weight="800" fill="#fff">${fmt(v.W)}×${fmt(v.L)}</text>`;
  // улица
  s += `<rect x="0" y="${Y(pl / 2) + 0.6 * S}" width="${vbW}" height="${2.4 * S}" fill="#c9ced4"/>`;
  s += `<text x="${vbW / 2}" y="${Y(pl / 2) + 2.1 * S}" text-anchor="middle" font-size="${fs}" font-weight="800" letter-spacing="3" fill="#56616f">${esc(t('street'))}</text>`;
  // размеры участка
  s += `<text x="${X(0)}" y="${Y(-pl / 2) - 0.8 * S}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="#3a4453">${fmt(pw)} ${t('m')}</text>`;
  s += `<text x="${X(-pw / 2) - 0.8 * S}" y="${Y(0)}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="#3a4453" transform="rotate(-90 ${X(-pw / 2) - 0.8 * S} ${Y(0)})">${fmt(pl)} ${t('m')}</text>`;
  s += `<text x="${X(-pw / 2 + SIDE) + 4}" y="${Y(pl / 2 - FRONT) - 6}" font-size="${fs * 0.85}" fill="#c0392b" font-weight="600">${FRONT} ${t('m')} / ${SIDE} ${t('m')}</text>`;
  s += '</svg>';
  return s;
}

/* ---------------------------------------------------------------- 3D viewer */

let THREE = null, Orbit = null;
let view = null; // { renderer, scene, camera, controls, house, running }

async function ensure3D() {
  if (view) return view;
  THREE = await import('three');
  Orbit = (await import('three/addons/controls/OrbitControls.js')).OrbitControls;
  const pane = $('#pane3d');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  pane.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dfe9f3');
  scene.fog = new THREE.Fog('#dfe9f3', 90, 220);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
  const controls = new Orbit(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 - 0.03;
  controls.minDistance = 5;
  controls.maxDistance = 140;

  scene.add(new THREE.HemisphereLight('#ffffff', '#7d8f6a', 0.9));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.2);
  sun.position.set(25, 40, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 140 });
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#94b06f', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  view = { renderer, scene, camera, controls, house: null, running: false, frameH: 8, size: 20 };
  const resize = () => {
    const w = pane.clientWidth, h = pane.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(pane);
  resize();
  // Рисуем только по запросу: при вращении (пока идёт инерция) и смене сцены
  let queued = false;
  const frame = () => {
    queued = false;
    if (!view.running) return;
    controls.update();
    renderer.render(scene, camera);
  };
  view.request = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  controls.addEventListener('change', view.request);
  new ResizeObserver(() => view.request()).observe(pane);
  view.start = () => { view.running = true; resize(); view.request(); };
  view.stop = () => { view.running = false; };
  return view;
}

const texCache = {};
function wallMaterial(kind, w, h, world) {
  const key = kind;
  if (!texCache[key]) {
    const tx = new THREE.CanvasTexture(wallCanvas(kind));
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
    tx.colorSpace = THREE.SRGBColorSpace;
    tx.anisotropy = 4;
    texCache[key] = tx;
  }
  const spec = TEX_SPEC[kind];
  const tx = texCache[key].clone();
  tx.needsUpdate = true;
  if (world) tx.repeat.set(1 / spec.tw, 1 / spec.th);
  else tx.repeat.set(w / spec.tw, h / spec.th);
  return new THREE.MeshStandardMaterial({ map: tx, roughness: 0.92, side: world ? THREE.DoubleSide : THREE.FrontSide });
}

function mesh(geo, mat, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = true;
  return m;
}

function box(w, h, d, color, x, y, z, opts = {}) {
  const mat = color.isMaterial ? color : new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.8, metalness: opts.metal ?? 0, transparent: !!opts.opacity, opacity: opts.opacity ?? 1 });
  const m = mesh(new THREE.BoxGeometry(w, h, d), mat, opts.cast !== false);
  m.position.set(x, y, z);
  return m;
}

function wallBox(kind, w, h, d, x, y, z) {
  const mats = [
    wallMaterial(kind, d, h), wallMaterial(kind, d, h),
    new THREE.MeshStandardMaterial({ color: '#8a8f94' }), new THREE.MeshStandardMaterial({ color: '#8a8f94' }),
    wallMaterial(kind, w, h), wallMaterial(kind, w, h)
  ];
  const m = mesh(new THREE.BoxGeometry(w, h, d), mats);
  m.position.set(x, y, z);
  return m;
}

// Фронтон / треугольная стена в плоскости XY с мировыми UV
function gableWall(kind, pts) {
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  return mesh(new THREE.ShapeGeometry(shape), wallMaterial(kind, 0, 0, true));
}

function polyGeometry(quads) {
  const pos = [];
  quads.forEach(q => {
    if (q.length === 3) pos.push(...q[0], ...q[1], ...q[2]);
    else pos.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function windowMesh(ww, wh, frameColor) {
  const g = new THREE.Group();
  g.add(box(ww + 0.14, wh + 0.14, 0.08, frameColor, 0, 0, 0, { cast: false }));
  g.add(box(ww, wh, 0.1, '#2f4558', 0, 0, 0.01, { rough: 0.08, metal: 0.55, cast: false }));
  if (ww > 1.1) g.add(box(0.06, wh, 0.12, frameColor, 0, 0, 0.01, { cast: false }));
  g.add(box(ww + 0.25, 0.05, 0.22, '#d9dcdf', 0, -wh / 2 - 0.05, 0.08, { cast: false }));
  return g;
}

// Ставит объект на фасад: side = front | back | left | right, u — координата вдоль фасада
function onFacade(obj, side, u, y, W, L) {
  const e = 0.03;
  if (side === 'front') { obj.position.set(u, y, L / 2 + e); }
  if (side === 'back') { obj.position.set(u, y, -L / 2 - e); obj.rotation.y = Math.PI; }
  if (side === 'right') { obj.position.set(W / 2 + e, y, -u); obj.rotation.y = Math.PI / 2; }
  if (side === 'left') { obj.position.set(-W / 2 - e, y, u); obj.rotation.y = -Math.PI / 2; }
  return obj;
}

function buildRoof(v, kind, look) {
  const g = v.geo, grp = new THREE.Group();
  const Y = g.wallTop, o = g.over;
  const roofMat = new THREE.MeshStandardMaterial({ color: look.roof, roughness: 0.65, metalness: v.style === 'barn' ? 0.35 : 0.05, side: THREE.DoubleSide, flatShading: true });
  if (v.roof === 'flat') {
    grp.add(box(v.W + 2 * o, 0.3, v.L + 2 * o, look.roof, 0, Y + 0.15, 0));
    if (v.style === 'hitech' || o === 0) {
      const p = 0.45, th = 0.18;
      grp.add(box(v.W, p, th, '#e9eaeb', 0, Y + 0.3 + p / 2, v.L / 2 - th / 2));
      grp.add(box(v.W, p, th, '#e9eaeb', 0, Y + 0.3 + p / 2, -v.L / 2 + th / 2));
      grp.add(box(th, p, v.L, '#e9eaeb', v.W / 2 - th / 2, Y + 0.3 + p / 2, 0));
      grp.add(box(th, p, v.L, '#e9eaeb', -v.W / 2 + th / 2, Y + 0.3 + p / 2, 0));
    }
    return grp;
  }
  if (v.roof === 'shed') {
    const s = g.h / v.L, hw = v.W / 2 + o, hl = v.L / 2 + o;
    const yF = Y - o * s, yB = Y + g.h + o * s;
    grp.add(mesh(polyGeometry([[[-hw, yF, hl], [hw, yF, hl], [hw, yB, -hl], [-hw, yB, -hl]]]), roofMat));
    grp.add(mesh(polyGeometry([[[-hw, yF - 0.2, hl], [hw, yF - 0.2, hl], [hw, yF, hl], [-hw, yF, hl]]]), new THREE.MeshStandardMaterial({ color: '#2b3138', side: THREE.DoubleSide })));
    [-1, 1].forEach(sgn => {
      const w = gableWall(kind, [[v.L / 2, Y], [-v.L / 2, Y], [-v.L / 2, Y + g.h]]);
      w.rotation.y = -Math.PI / 2;
      w.position.x = sgn * v.W / 2;
      grp.add(w);
    });
    const backWall = gableWall(kind, [[-v.W / 2, Y], [v.W / 2, Y], [v.W / 2, Y + g.h], [-v.W / 2, Y + g.h]]);
    backWall.position.z = -v.L / 2;
    grp.add(backWall);
    return grp;
  }
  // Двускатная, мансардная и вальмовая: строим с коньком вдоль локальной X,
  // затем поворачиваем, если конёк идёт вдоль глубины дома.
  const alongZ = v.roof === 'hip' ? v.L > v.W : g.ridgeAlongZ;
  const A = alongZ ? v.L : v.W;   // длина вдоль конька
  const B = alongZ ? v.W : v.L;   // пролёт
  const k = g.h / (B / 2);
  const ye = Y - o * k, yr = Y + g.h;
  const local = new THREE.Group();
  if (v.roof === 'hip') {
    const r = Math.max(0, (A - B) / 2);
    const ax = A / 2 + o, bz = B / 2 + o;
    const E1 = [-ax, ye, bz], E2 = [ax, ye, bz], E3 = [ax, ye, -bz], E4 = [-ax, ye, -bz];
    const R1 = [-r, yr, 0], R2 = [r, yr, 0];
    local.add(mesh(polyGeometry([[E1, E2, R2, R1], [E3, E4, R1, R2], [E2, E3, R2], [E4, E1, R1]]), roofMat));
  } else {
    const ax = A / 2 + o, bz = B / 2 + o;
    local.add(mesh(polyGeometry([
      [[-ax, ye, bz], [ax, ye, bz], [ax, yr, 0], [-ax, yr, 0]],
      [[ax, ye, -bz], [-ax, ye, -bz], [-ax, yr, 0], [ax, yr, 0]]
    ]), roofMat));
    // Фронтоны и окна на них
    [-1, 1].forEach(sgn => {
      const w = gableWall(kind, [[B / 2, Y], [-B / 2, Y], [0, Y + g.h]]);
      w.rotation.y = Math.PI / 2;
      w.position.x = sgn * A / 2;
      local.add(w);
      const ww = clamp(B * 0.16, 0.9, 1.6), wh = clamp(g.h * 0.45, 0.9, 1.6);
      const count = v.style === 'barn' && B >= 7 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const win = windowMesh(ww, wh, look.frame);
        const zz = count === 1 ? 0 : (i ? 1 : -1) * B * 0.18;
        win.position.set(sgn * (A / 2 + 0.03), Y + Math.min(g.h * 0.3, 1.0) + wh / 2, zz);
        win.rotation.y = sgn > 0 ? Math.PI / 2 : -Math.PI / 2;
        local.add(win);
      }
    });
  }
  if (alongZ) local.rotation.y = Math.PI / 2;
  grp.add(local);
  if (look.chimney && v.roof !== 'flat') {
    grp.add(box(0.6, g.h + 1.2, 0.6, '#7a4a3a', v.W * 0.22, Y + (g.h + 1.2) / 2, -v.L * 0.12));
  }
  return grp;
}

function buildHouse(v) {
  const look = LOOK[v.style];
  const kind = texKind(v.mat, v.style);
  const g = v.geo;
  const W = v.W, L = v.L;
  const house = new THREE.Group();

  house.add(box(W + 0.12, PLINTH, L + 0.12, '#7d8186', 0, PLINTH / 2, 0));
  const wallH = g.wallTop - PLINTH;
  house.add(wallBox(kind, W, wallH, L, 0, PLINTH + wallH / 2, 0));

  if (v.floors >= 2 && (v.style === 'classic' || v.style === 'chalet')) {
    for (let f = 1; f < v.floors; f++) house.add(box(W + 0.1, 0.18, L + 0.1, '#e8e2d6', 0, PLINTH + f * FLOOR_H, 0, { cast: false }));
  }

  // окна и дверь
  const big = v.style === 'modern' || v.style === 'hitech';
  const full = v.floors === 1.5 ? 1 : v.floors;
  ['front', 'back', 'left', 'right'].forEach(side => {
    const len = side === 'front' || side === 'back' ? W : L;
    const slots = facadeSlots(len), n = slots.n;
    for (let f = 0; f < full; f++) {
      if (side === 'right' && f === 0 && v.garage) continue;
      for (let i = 0; i < n; i++) {
        const u = slots.at(i);
        const base = PLINTH + f * FLOOR_H;
        if (side === 'front' && f === 0 && i === slots.door) {
          const dw = big ? 1.2 : 1.0;
          const door = new THREE.Group();
          door.add(box(dw + 0.12, 2.3, 0.08, look.frame, 0, 0, 0, { cast: false }));
          door.add(box(dw, 2.2, 0.1, big ? '#2e3338' : '#6b4a2f', 0, -0.03, 0.01, { cast: false }));
          door.add(box(0.05, 0.3, 0.06, '#c9b27a', dw * 0.35, 0, 0.08, { cast: false }));
          house.add(onFacade(door, 'front', u, base + 1.15, W, L));
          if (!big && !v.terrace) house.add(box(dw + 1.0, 0.12, 1.1, look.roof, u, base + 2.55, L / 2 + 0.55));
          continue;
        }
        const panoramic = big && (side === 'front' || side === 'back');
        const ww = panoramic ? Math.min(2.4, len / n - 0.8) : v.style === 'barn' ? 1.0 : 1.2;
        const wh = panoramic ? 2.3 : v.style === 'barn' ? 1.8 : 1.4;
        const sill = panoramic ? 0.25 : 0.85;
        house.add(onFacade(windowMesh(ww, wh, look.frame), side, u, base + sill + wh / 2, W, L));
      }
    }
  });

  house.add(buildRoof(v, kind, look));

  // гараж
  if (v.garage) {
    const gd = v.gd, gh = 3.0;
    const gx = W / 2 + GARAGE_W / 2, gz = L / 2 - gd / 2;
    house.add(box(GARAGE_W, PLINTH, gd, '#7d8186', gx, PLINTH / 2, gz));
    house.add(wallBox(kind, GARAGE_W, gh, gd, gx, PLINTH + gh / 2, gz));
    house.add(box(GARAGE_W + 0.4, 0.25, gd + 0.4, look.roof, gx, PLINTH + gh + 0.12, gz));
    const gate = new THREE.Group();
    gate.add(box(2.7, 2.3, 0.08, '#cfd3d7', 0, 0, 0, { cast: false }));
    for (let i = 1; i < 6; i++) gate.add(box(2.7, 0.03, 0.1, '#9aa1a8', 0, -1.15 + i * 2.3 / 6, 0.01, { cast: false }));
    gate.position.set(gx, PLINTH + 1.15, L / 2 + 0.03);
    house.add(gate);
  }

  // терраса
  if (v.terrace) {
    const tw = Math.min(W * 0.7, 7);
    const deck = box(tw, PLINTH - 0.05, TERRACE_D, '#9a6b40', 0, (PLINTH - 0.05) / 2, L / 2 + TERRACE_D / 2);
    house.add(deck);
    house.add(box(1.4, 0.18, 0.4, '#8a8f94', doorU(W), 0.09, L / 2 + TERRACE_D + 0.2));
    if (!big && v.floors !== 3) {
      const ph = Math.min(2.8, FLOOR_H - 0.2);
      [-1, 1].forEach(s => house.add(box(0.16, ph, 0.16, '#efe9df', s * (tw / 2 - 0.15), PLINTH + ph / 2, L / 2 + TERRACE_D - 0.15)));
      house.add(box(tw + 0.3, 0.14, TERRACE_D + 0.2, look.roof, 0, PLINTH + ph + 0.07, L / 2 + TERRACE_D / 2));
    }
  }

  house.traverse(o => { if (o.isMesh) { o.castShadow = o.castShadow !== false; o.receiveShadow = true; } });
  return house;
}

function buildSite(v, pos) {
  const site = new THREE.Group();
  const pw = v.plot.w, pl = v.plot.l;
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(pw, pl), new THREE.MeshStandardMaterial({ color: '#a5c37f', roughness: 1 }));
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.y = 0.01;
  lawn.receiveShadow = true;
  site.add(lawn);
  // дорога
  const road = new THREE.Mesh(new THREE.PlaneGeometry(400, 7), new THREE.MeshStandardMaterial({ color: '#6f757c', roughness: 0.95 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.012, pl / 2 + 5);
  road.receiveShadow = true;
  site.add(road);

  // забор с проёмом под калитку
  const fenceMat = new THREE.MeshStandardMaterial({ color: '#5b4636', roughness: 0.9 });
  const fh = 1.6, ft = 0.06;
  const seg = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 0.1) return;
    const m = box(len, fh, ft, fenceMat, (x0 + x1) / 2, fh / 2, (z0 + z1) / 2);
    m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    site.add(m);
  };
  seg(-pw / 2, -pl / 2, pw / 2, -pl / 2);
  seg(-pw / 2, -pl / 2, -pw / 2, pl / 2);
  seg(pw / 2, -pl / 2, pw / 2, pl / 2);
  const gateX = pos.rot ? 0 : pos.toWorld(doorU(v.W), 0)[0];
  const gate0 = clamp(gateX - 2.2, -pw / 2, pw / 2), gate1 = clamp(gateX + 2.2 + (v.garage && !pos.rot ? GARAGE_W + 1 : 0), -pw / 2, pw / 2);
  seg(-pw / 2, pl / 2, gate0, pl / 2);
  seg(gate1, pl / 2, pw / 2, pl / 2);

  // дорожка и подъезд к гаражу
  const pave = new THREE.MeshStandardMaterial({ color: '#b8b3aa', roughness: 0.95 });
  if (!pos.rot) {
    const frontZ = pos.rects.find(r => r.k === (v.terrace ? 'terrace' : 'house')).z1;
    const len = pl / 2 - frontZ;
    if (len > 0.2) {
      const p = box(1.3, 0.04, len, pave, gateX, 0.02, frontZ + len / 2, { cast: false });
      site.add(p);
      if (v.garage) {
        const gr = pos.rects.find(r => r.k === 'garage');
        const glen = pl / 2 - gr.z1;
        site.add(box(3.2, 0.04, glen, pave, (gr.x0 + gr.x1) / 2, 0.02, gr.z1 + glen / 2, { cast: false }));
      }
    }
  }

  // деревья в углах участка, если хватает места
  const tree = (x, z, s) => {
    const t = new THREE.Group();
    t.add(box(0.25 * s, 1.6 * s, 0.25 * s, '#6b4a2f', 0, 0.8 * s, 0));
    const crown = mesh(new THREE.ConeGeometry(1.4 * s, 3.6 * s, 9), new THREE.MeshStandardMaterial({ color: '#4f7a3a', roughness: 0.9, flatShading: true }));
    crown.position.y = 3.2 * s;
    t.add(crown);
    t.position.set(x, 0, z);
    site.add(t);
  };
  const hb = pos.rects.reduce((a, r) => ({ x0: Math.min(a.x0, r.x0), x1: Math.max(a.x1, r.x1), z0: Math.min(a.z0, r.z0), z1: Math.max(a.z1, r.z1) }), { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 });
  [[-pw / 2 + 1.8, -pl / 2 + 1.8, 1], [pw / 2 - 1.8, -pl / 2 + 1.8, 0.85], [-pw / 2 + 1.8, pl / 2 - 2.2, 0.7]].forEach(([x, z, s]) => {
    const clear = x < hb.x0 - 2 || x > hb.x1 + 2 || z < hb.z0 - 2 || z > hb.z1 + 2;
    if (clear) tree(x, z, s);
  });
  return site;
}

async function show3D(v) {
  const pane = $('#pane3d');
  try {
    await ensure3D();
  } catch (e) {
    console.error(e);
    pane.innerHTML = `<div class="fallback">${esc(t('no3d'))}</div>`;
    return;
  }
  const { scene } = view;
  if (view.house) {
    scene.remove(view.house);
    view.house.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); }); });
  }
  const root = new THREE.Group();
  const pos = placement(v);
  const house = buildHouse(v);
  house.position.set(pos.cx, 0, pos.cz);
  if (pos.rot) house.rotation.y = Math.PI / 2;
  root.add(house);
  root.add(buildSite(v, pos));
  scene.add(root);
  view.house = root;
  const hb = new THREE.Box3().setFromObject(house);
  view.center = hb.getCenter(new THREE.Vector3());
  view.hsize = hb.getSize(new THREE.Vector3());
  view.rot = pos.rot;
  setCam('corner');
  if (state.tab === '3d') view.start();
}

function setCam(kind) {
  if (!view || !view.center) return;
  const c = view.center, s = view.hsize;
  const d = Math.max(s.x, s.z, s.y * 1.6) * 1.9 + 6;
  const cam = view.camera;
  const target = new THREE.Vector3(c.x, Math.min(c.y, s.y * 0.45), c.z);
  // направление «лицом к фасаду» зависит от поворота дома
  const front = view.rot ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
  const sideV = view.rot ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(1, 0, 0);
  let p;
  if (kind === 'front') p = target.clone().addScaledVector(front, d).add(new THREE.Vector3(0, s.y * 0.35, 0));
  else if (kind === 'top') p = new THREE.Vector3(c.x, d * 1.5, c.z + 0.01);
  else if (kind === 'plot') {
    const pd = Math.max(d * 1.7, 30);
    p = new THREE.Vector3(0, pd * 0.7, 0).addScaledVector(front, pd * 0.8).addScaledVector(sideV, pd * 0.45);
    target.set(0, 0, 0);
  } else p = target.clone().addScaledVector(front, d * 0.78).addScaledVector(sideV, d * 0.62).add(new THREE.Vector3(0, d * 0.32, 0));
  cam.position.copy(p);
  view.controls.target.copy(target);
  view.controls.update();
}

/* -------------------------------------------------------------------- UI */

function renderMats() {
  const box = $('#mats');
  box.innerHTML = '';
  Object.keys(MATS).forEach(k => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.v = k;
    b.className = k === state.mat ? 'on' : '';
    const sw = document.createElement('i');
    sw.style.backgroundImage = `url(${wallCanvas(k).toDataURL()})`;
    b.append(sw, document.createTextNode(MATS[k][state.lang]));
    b.onclick = () => { state.mat = k; renderMats(); };
    box.append(b);
  });
}

function applyLang() {
  document.documentElement.lang = state.lang === 'kz' ? 'kk' : 'ru';
  document.title = t('title');
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $$('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === state.lang));
  $('#backLink').href = state.lang === 'kz' ? './?lang=kz' : './';
  const generic = 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(t('waGeneric'));
  $$('[data-wa]').forEach(a => { a.href = generic; });
  renderMats();
  if (state.variants.length) {
    renderCards();
    if (state.sel) selectVariant(state.sel, false);
  }
}

let lastSummary = null;

function renderCards() {
  const box = $('#cards');
  box.innerHTML = '';
  state.variants.forEach(v => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card' + (v === state.sel ? ' on' : '');
    const tags = [t('floorsShort')[v.floors], `${fmt(v.W)}×${fmt(v.L)} ${t('m')}`, MATS[v.mat][state.lang], STYLES[v.style][state.lang]];
    if (v.garage) tags.push(t('garage'));
    if (!v.fits) tags.unshift(`⚠ ${t('noFitTag')}`);
    b.innerHTML = `
      <div class="thumb">${elevationSVG(v)}</div>
      <div class="body">
        <div class="code">${v.p.id}</div>
        <h3>${esc(v.p[state.lang])}</h3>
        <div class="meta">${tags.map(x => `<span>${esc(x)}</span>`).join('')}</div>
        <div class="area">≈ ${fmt(v.total)} <small>${t('m2')} · ${esc(t('bedsN')(v.beds))}</small></div>
      </div>`;
    b.onclick = () => selectVariant(v, true);
    box.append(b);
  });
  if (lastSummary) {
    const [n, plot] = lastSummary;
    $('#summary').textContent = t('summary')(n, plot.sot, plot.w, plot.l);
  }
}

function renderSpecs(v) {
  const L = state.lang;
  const rows = [
    [t('specProject'), `${v.p.id} «${v.p[L]}»`],
    [t('specStyle'), STYLES[v.style][L]],
    [t('specFloors'), t('floorsShort')[v.floors]],
    [t('specSize'), `${fmt(v.W)} × ${fmt(v.L)} ${t('m')}`],
    [t('specTotal'), `≈ ${fmt(v.total)} ${t('m2')}`],
    [t('specBuilt'), `${fmt(v.built)} ${t('m2')}`],
    [t('specBeds'), v.beds],
    [t('specBaths'), v.baths],
    [t('specRoof'), t('r_' + v.roof)],
    [t('specMat'), MATS[v.mat][L]],
    [t('specGarage'), v.garage ? t('yesShort') : t('noShort')],
    [t('specTerrace'), v.terrace ? t('yesShort') : t('noShort')],
    [t('specHeight'), `≈ ${fmt(v.geo.height)} ${t('m')}`],
    [t('specPlot'), `${fmt(v.plot.sot)} ${t('sot')} · ${fmt(v.plot.w)} × ${fmt(v.plot.l)} ${t('m')}`],
    [t('specCover'), `${Math.round(v.cover * 100)} %`]
  ];
  $('#specs').innerHTML = rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('');
}

function renderPlans(v) {
  const caps = t('floorCap');
  $('#panePlan').innerHTML = v.levels.map((lv, i) => {
    const cap = lv.attic ? t('attic') : caps[i];
    const sub = `${fmt(lv.total)} ${t('m2')}${lv.attic ? ' · ' + t('atticNote') : ''}`;
    return `<figure><figcaption>${esc(cap)}<span>${esc(sub)}</span></figcaption>${planSVG(v, lv, i)}</figure>`;
  }).join('');
  $('#paneSite').innerHTML = `<figure style="max-width:640px"><figcaption>${esc(t('tSite'))}<span>${fmt(v.plot.sot)} ${t('sot')} · ${Math.round(v.cover * 100)} %</span></figcaption>${siteSVG(v)}</figure>`;
}

function selectVariant(v, scroll) {
  state.sel = v;
  $$('#cards .card').forEach((c, i) => c.classList.toggle('on', state.variants[i] === v));
  $('#viewer').hidden = false;
  $('#vCode').textContent = `${v.p.id} · ${STYLES[v.style][state.lang]}`;
  $('#vName').textContent = v.p[state.lang];
  renderSpecs(v);
  renderPlans(v);
  $('#orderWa').href = 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(t('wa')(v));
  if (scroll) {
    $('#viewer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    show3D(v);
    if (window.gtag) gtag('event', 'house_variant_view', { project_id: v.p.id });
  }
}

function setTab(tab) {
  state.tab = tab;
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $('#pane3d').hidden = tab !== '3d';
  $('#panePlan').hidden = tab !== 'plan';
  $('#paneSite').hidden = tab !== 'site';
  if (view) { if (tab === '3d') view.start(); else view.stop(); }
}

function run(scroll) {
  const inp = readInput();
  const alert = $('#alert');
  if (!validate(inp)) {
    alert.hidden = false;
    alert.textContent = t('badInput');
    return;
  }
  const { plot, list, anyFit } = pickVariants(inp);
  state.variants = list;
  state.sel = null;
  lastSummary = [list.length, plot];
  if (!anyFit) {
    const mw = plot.w - 2 * SIDE, ml = plot.l - FRONT - BACK;
    alert.hidden = false;
    alert.textContent = t('noFit')(Math.max(mw, 0), Math.max(ml, 0), plot.area * MAX_COVER);
  } else alert.hidden = true;
  renderCards();
  if (list.length) {
    selectVariant(list[0], false);
    show3D(list[0]);
    if (scroll) $('#summary').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (window.gtag && scroll) gtag('event', 'house_configure', { floors: inp.floors, material: inp.mat });
}

function initLang() {
  let lang = new URLSearchParams(location.search).get('lang');
  if (!lang) { try { lang = localStorage.getItem('sp_lang'); } catch (e) { /* хранилище недоступно */ } }
  state.lang = lang === 'kz' ? 'kz' : 'ru';
}

function init() {
  initLang();
  $$('.lang button').forEach(b => b.onclick = () => {
    state.lang = b.dataset.lang;
    try { localStorage.setItem('sp_lang', state.lang); } catch (e) { /* хранилище недоступно */ }
    applyLang();
  });
  $$('#sizeMode button').forEach(b => b.onclick = () => {
    state.sizeMode = b.dataset.v;
    $$('#sizeMode button').forEach(x => x.classList.toggle('on', x === b));
    $('#dimsBox').hidden = state.sizeMode !== 'dims';
    $('#areaBox').hidden = state.sizeMode !== 'area';
  });
  $$('#floors button').forEach(b => b.onclick = () => {
    state.floors = parseFloat(b.dataset.v);
    $$('#floors button').forEach(x => x.classList.toggle('on', x === b));
  });
  $$('#tabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  $$('.cams button').forEach(b => b.onclick = () => setCam(b.dataset.cam));
  $('#cfg').addEventListener('submit', e => { e.preventDefault(); run(true); });
  $('#orderWa').addEventListener('click', () => { if (window.gtag) gtag('event', 'house_order_whatsapp', { project_id: state.sel && state.sel.p.id }); });
  $('#orderTel').addEventListener('click', () => { if (window.gtag) gtag('event', 'house_order_call', { project_id: state.sel && state.sel.p.id }); });
  applyLang();
  run(false);
}

init();
