/*
 * Конструктор частного дома — svoyproect.kz
 * Строит дом по параметрам посетителя, даёт отредактировать планировку
 * и собирает эскизный проект (листы в sketch.js).
 */
import { setContext, sheets, facadeThumb, defaultFacade, FACADES, ROOF_COLORS } from './sketch.js?v=5';

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
    lead: 'Укажите участок, размеры, этажность, состав комнат и стиль — программа соберёт эскизный проект вашего дома: планы, фасады, разрез, генплан и кровлю. Планировку можно поправить самому прямо на плане.',
    s1: 'Введите параметры', s2: 'Настройте планировку и фасад', s3: 'Получите эскиз в PDF',
    formTitle: 'Параметры дома', gPlot: 'Участок', plotArea: 'Площадь участка', sot: 'сот.', plotWidth: 'Ширина участка', auto: 'авто',
    plotHint: '1 сотка = 100 м². Ширина — сторона участка вдоль улицы; если не знаете, оставьте пустым.',
    gSize: 'Размеры дома', modeDims: 'Длина × ширина', modeArea: 'Общая площадь', houseW: 'Ширина (фасад)', houseL: 'Длина (глубина)', houseArea: 'Желаемая общая площадь',
    gFloors: 'Этажность', f1: '1 этаж', f15: 'С мансардой', f2: '2 этажа', f3: '3 этажа',
    gMat: 'Материал стен', gExtra: 'Пожелания', roofLbl: 'Кровля', any: 'Не важно',
    r_gable: 'Двускатная', r_hip: 'Вальмовая (четырёхскатная)', r_flat: 'Плоская', r_shed: 'Односкатная', r_mansard: 'Мансардная',
    bedsLbl: 'Спален', garageLbl: 'Гараж', yes: 'Нужен', no: 'Не нужен', submit: 'Построить проект',
    gStyle: 'Стиль дома', pTerrace: 'Терраса', yourHouse: 'Ваш дом', edTitle: 'Планировка — редактор',
    edHint: 'Перетаскивайте стены мышью или пальцем. Нажмите на комнату, чтобы изменить её назначение, название, разделить или объединить.',
    undo: 'Отменить', autoLbl: 'Автопланировка:', streetSide: 'вход / улица', edPick: 'Нажмите на комнату на плане, чтобы её изменить. Стены между комнатами можно перетаскивать.',
    floorTotal: 'Площадь этажа', roomsCount: 'помещений', edType: 'Назначение', edName: 'Своё название', splitV: 'Разделить по вертикали', splitH: 'Разделить по горизонтали',
    mergeBtn: 'Объединить с соседней', delBtn: 'Удалить комнату', tooSmall: 'Комната слишком маленькая, чтобы её делить.',
    noMerge: 'Нет соседней комнаты с общей стеной на всю длину. Сначала выровняйте стены перетаскиванием.',
    gTitle: 'Для титульного листа', addrLbl: 'Адрес участка', addrPh: 'необязательно', custLbl: 'Заказчик (ФИО)',
    facLbl: 'Фасад', facType: 'Отделка стен', facColor: 'Цвет стен', roofColorLbl: 'Цвет кровли', layoutTitle: 'Планировка',
    sheetsLbl: 'Листы эскизного проекта', full: 'Во весь экран', zoomHint: 'Листы можно смотреть на сайте. Файл PDF — по запросу.',
    sheetOf: (i, n, title) => i === 0 ? `Титульный лист · всего ${n} листов` : `Лист ${i} из ${n} · ${title}`,
    resLead: 'Выберите вариант — ниже откроется его эскизный проект.',
    gPlan: 'Планировка', pBeds: 'Спальни', pBaths: 'Санузлы', pKitchen: 'Кухня', kOpen: 'Кухня-гостиная', kSep: 'Кухня и гостиная отдельно',
    pCab: 'Кабинет', none: 'Нет', pWardrobe: 'Гардеробная', pLaundry: 'Постирочная', pBoiler: 'Котельная', pGuest: 'Спальня на 1 этаже',
    need: (a, per, w, l) => `Под такой состав нужно ≈ ${a} м² (≈ ${per} м² на этаж — например, ${fmt(w)} × ${fmt(l)} м).`,
    useArea: 'Подставить площадь', layoutLbl: 'Вариант планировки', lay: ['Вход у фасада', 'Зеркально', 'Зоны слева и справа'],
    tightTag: 'Тесно для этих комнат', tightNote: a => `Комнаты получились тесными: для выбранного состава лучше общая площадь от ≈ ${a} м².`,
    specRooms: 'Состав помещений', kitchenOpen: 'кухня-гостиная', kitchenSep: 'кухня и гостиная',
    roomsLine: v => `${v.beds} ${plural(v.beds, 'спальня', 'спальни', 'спален')}, ${v.baths} ${plural(v.baths, 'санузел', 'санузла', 'санузлов')}, ${v.prog.kitchen === 'separate' ? 'кухня и гостиная' : 'кухня-гостиная'}${v.prog.cabinet ? ', кабинет' + (v.prog.cabinet > 1 ? ' ×2' : '') : ''}${v.prog.wardrobe ? ', гардеробная' : ''}${v.prog.laundry ? ', постирочная' : ''}${v.prog.boiler ? ', котельная' : ''}`,
    resTitle: 'Ваш эскизный проект',
    cFront: 'Фасад', cCorner: '3/4', cTop: 'Сверху', cPlot: 'Участок', drag: 'Вращайте мышью или пальцем',
    note: 'Визуализация и планировка — эскизные и ориентировочные. Точные площади, конструктив, инженерные системы и смета определяются в рабочем проекте с учётом вашего участка и норм РК.',
    orderTitle: 'Получите эскизный проект в PDF',
    orderText: 'Пришлём эскизный проект этого дома в PDF и подготовим полный рабочий проект для строительства — с адаптацией под ваш участок.',
    o1: 'Архитектурные и конструктивные решения', o2: 'Инженерные сети: отопление, водоснабжение, электрика', o3: 'Генплан и помощь с согласованием',
    orderWa: 'Получить PDF в WhatsApp', orderCall: 'Позвонить', ctaWa: 'Написать в WhatsApp',
    ctaTitle: 'Нужен индивидуальный проект?',
    ctaText: 'Не нашли подходящий вариант — спроектируем дом с нуля по вашему участку и пожеланиям. Позвоните или напишите в WhatsApp.',
    copyright: '© 2026 ТОО «СВОЙ ПРОЕКТ». Проектирование объектов под ключ.',
    title: 'Спроектировать дом онлайн — СВОЙ ПРОЕКТ',
    m: 'м', m2: 'м²', floorsShort: { 1: '1 этаж', 1.5: '1 этаж + мансарда', 2: '2 этажа', 3: '3 этажа' },
    summary: (n, sot, pw, pl) => `Найдено вариантов: ${n}. Участок ${fmt(sot)} сот. (≈ ${fmt(pw)} × ${fmt(pl)} м). Нажмите на карточку, чтобы открыть эскизный проект.`,
    noFit: (mw, ml, maxA) => `На этом участке с отступами (5 м от улицы, 3 м от соседей) помещается пятно дома не больше ≈ ${fmt(mw)} × ${fmt(ml)} м, а площадь застройки — не больше ${fmt(maxA)} м². Уменьшите размеры дома, добавьте этаж или увеличьте участок. Ниже — ближайшие варианты, их можно адаптировать в индивидуальном проекте.`,
    badInput: 'Проверьте параметры: площадь участка от 2 соток, размеры дома от 4 до 30 м, площадь от 30 м².',
    noFitTag: 'Не помещается на участке', bedsN: n => `${n} ${plural(n, 'спальня', 'спальни', 'спален')}`,
    specProject: 'Проект', specStyle: 'Стиль', specFloors: 'Этажность', specSize: 'Габариты дома', specTotal: 'Общая площадь (ориент.)',
    specBuilt: 'Площадь застройки', specBeds: 'Спальни', specBaths: 'Санузлы', specRoof: 'Кровля', specMat: 'Материал стен',
    specGarage: 'Гараж', specTerrace: 'Терраса', specHeight: 'Высота дома (ориент.)', specPlot: 'Участок', specCover: 'Застройка участка',
    yesShort: 'есть', noShort: 'нет', street: 'УЛИЦА', entrance: 'Вход', floorCap: ['1 этаж', '2 этаж', '3 этаж'], attic: 'Мансарда',
    atticNote: 'площадь с учётом скосов', garage: 'Гараж', terrace: 'Терраса',
    wa: v => `Здравствуйте! Я подобрал(а) дом в онлайн-конструкторе на сайте svoyproect.kz и хочу получить эскизный проект в PDF и полный рабочий проект.\n\nПроект: ${v.p.id} «${v.p.ru}» (${STYLES[v.style].ru})\nЭтажность: ${T.ru.floorsShort[v.floors]}\nГабариты: ${fmt(v.W)} × ${fmt(v.L)} м, общая площадь ≈ ${fmt(v.total)} м²\nМатериал стен: ${MATS[v.mat].ru}\nКровля: ${T.ru['r_' + v.roof]}\nПомещения: ${T.ru.roomsLine(v)}\nВариант планировки: ${v.layout + 1}\nФасад: ${facadeLabel(v)}\nГараж: ${v.garage ? 'да' : 'нет'}\nУчасток: ${fmt(v.plot.sot)} сот. (${fmt(v.plot.w)} × ${fmt(v.plot.l)} м)`,
    waGeneric: 'Здравствуйте! Хочу проконсультироваться по проекту частного дома (svoyproect.kz).'
  },
  kz: {
    brandSub: 'Жобалау компаниясы', back: 'Басты бетке', badge: 'Жеке үйдің онлайн-конструкторы',
    h1a: 'Өз үйіңізді', h1b: 'бірнеше минутта', h1c: 'жобалаңыз',
    lead: 'Учаскені, өлшемдерді, қабат санын, бөлмелер құрамын және стильді көрсетіңіз — бағдарлама үйіңіздің эскиздік жобасын жасайды: жоспарлар, қасбеттер, қима, бас жоспар және шатыр. Жоспарды тікелей сызбада өзіңіз түзете аласыз.',
    s1: 'Параметрлерді енгізіңіз', s2: 'Жоспар мен қасбетті баптаңыз', s3: 'Эскизді PDF форматында алыңыз',
    formTitle: 'Үй параметрлері', gPlot: 'Учаске', plotArea: 'Учаске ауданы', sot: 'сот.', plotWidth: 'Учаске ені', auto: 'авто',
    plotHint: '1 сотық = 100 м². Ені — учаскенің көше бойындағы жағы; білмесеңіз, бос қалдырыңыз.',
    gSize: 'Үйдің өлшемдері', modeDims: 'Ұзындығы × ені', modeArea: 'Жалпы ауданы', houseW: 'Ені (қасбет)', houseL: 'Ұзындығы (тереңдігі)', houseArea: 'Қалаған жалпы аудан',
    gFloors: 'Қабат саны', f1: '1 қабат', f15: 'Мансардалы', f2: '2 қабат', f3: '3 қабат',
    gMat: 'Қабырға материалы', gExtra: 'Тілектер', roofLbl: 'Шатыр', any: 'Маңызды емес',
    r_gable: 'Екі беткейлі', r_hip: 'Төрт беткейлі', r_flat: 'Жалпақ', r_shed: 'Бір беткейлі', r_mansard: 'Мансардалы',
    bedsLbl: 'Жатын бөлме', garageLbl: 'Гараж', yes: 'Керек', no: 'Керек емес', submit: 'Жобаны құру',
    gStyle: 'Үй стилі', pTerrace: 'Терраса', yourHouse: 'Сіздің үйіңіз', edTitle: 'Жоспар — редактор',
    edHint: 'Қабырғаларды тышқанмен немесе саусақпен жылжытыңыз. Бөлменің мақсатын, атауын өзгерту, бөлу немесе біріктіру үшін оны басыңыз.',
    undo: 'Болдырмау', autoLbl: 'Автожоспар:', streetSide: 'кіреберіс / көше', edPick: 'Өзгерту үшін жоспардағы бөлмені басыңыз. Бөлмелер арасындағы қабырғаларды жылжытуға болады.',
    floorTotal: 'Қабат ауданы', roomsCount: 'бөлме', edType: 'Мақсаты', edName: 'Өз атауы', splitV: 'Тігінен бөлу', splitH: 'Көлденең бөлу',
    mergeBtn: 'Көршісімен біріктіру', delBtn: 'Бөлмені жою', tooSmall: 'Бөлме бөлуге тым кішкентай.',
    noMerge: 'Бүкіл ұзындығы бойынша ортақ қабырғасы бар көрші бөлме жоқ. Алдымен қабырғаларды жылжытып тураңыз.',
    gTitle: 'Титул парағы үшін', addrLbl: 'Учаске мекенжайы', addrPh: 'міндетті емес', custLbl: 'Тапсырыс беруші (АЖТ)',
    facLbl: 'Қасбет', facType: 'Қабырға әрлеуі', facColor: 'Қабырға түсі', roofColorLbl: 'Шатыр түсі', layoutTitle: 'Жоспар',
    sheetsLbl: 'Эскиздік жоба парақтары', full: 'Толық экран', zoomHint: 'Парақтарды сайтта көруге болады. PDF файлы — сұраныс бойынша.',
    sheetOf: (i, n, title) => i === 0 ? `Титул парағы · барлығы ${n} парақ` : `${n} парақтың ${i}-сі · ${title}`,
    resLead: 'Нұсқаны таңдаңыз — төменде оның эскиздік жобасы ашылады.',
    gPlan: 'Жоспарлау', pBeds: 'Жатын бөлмелер', pBaths: 'Санторабтар', pKitchen: 'Ас үй', kOpen: 'Ас үй-қонақ бөлме', kSep: 'Ас үй мен қонақ бөлме бөлек',
    pCab: 'Кабинет', none: 'Жоқ', pWardrobe: 'Киім бөлмесі', pLaundry: 'Кір жуатын бөлме', pBoiler: 'Қазандық', pGuest: '1-қабатта жатын бөлме',
    need: (a, per, w, l) => `Мұндай құрамға ≈ ${a} м² керек (қабатқа ≈ ${per} м² — мысалы, ${fmt(w)} × ${fmt(l)} м).`,
    useArea: 'Ауданды қою', layoutLbl: 'Жоспар нұсқасы', lay: ['Кіреберіс қасбет жақта', 'Айналы', 'Аймақтар сол және оң жақта'],
    tightTag: 'Бұл бөлмелерге тар', tightNote: a => `Бөлмелер тар болып шықты: таңдалған құрамға жалпы аудан ≈ ${a} м²-ден болғаны дұрыс.`,
    specRooms: 'Бөлмелер құрамы', kitchenOpen: 'ас үй-қонақ бөлме', kitchenSep: 'ас үй мен қонақ бөлме',
    roomsLine: v => `${v.beds} жатын бөлме, ${v.baths} санторап, ${v.prog.kitchen === 'separate' ? 'ас үй мен қонақ бөлме' : 'ас үй-қонақ бөлме'}${v.prog.cabinet ? ', кабинет' + (v.prog.cabinet > 1 ? ' ×2' : '') : ''}${v.prog.wardrobe ? ', киім бөлмесі' : ''}${v.prog.laundry ? ', кір жуатын бөлме' : ''}${v.prog.boiler ? ', қазандық' : ''}`,
    resTitle: 'Сіздің эскиздік жобаңыз',
    cFront: 'Қасбет', cCorner: '3/4', cTop: 'Жоғарыдан', cPlot: 'Учаске', drag: 'Тышқанмен немесе саусақпен айналдырыңыз',
    note: 'Визуализация мен жоспар — эскиздік әрі шамамен берілген. Нақты аудандар, конструктив, инженерлік жүйелер мен смета учаскеңіз бен ҚР нормаларын ескере отырып, жұмыс жобасында анықталады.',
    orderTitle: 'Эскиздік жобаны PDF форматында алыңыз',
    orderText: 'Осы үйдің эскиздік жобасын PDF форматында жібереміз және учаскеңізге бейімделген толық жұмыс жобасын дайындаймыз.',
    o1: 'Сәулеттік және конструктивтік шешімдер', o2: 'Инженерлік желілер: жылыту, сумен жабдықтау, электр', o3: 'Бас жоспар және келісуге көмек',
    orderWa: 'PDF-ті WhatsApp арқылы алу', orderCall: 'Қоңырау шалу', ctaWa: 'WhatsApp-қа жазу',
    ctaTitle: 'Жеке жоба керек пе?',
    ctaText: 'Лайықты нұсқа таппадыңыз ба — учаскеңіз бен тілектеріңіз бойынша үйді нөлден жобалаймыз. Қоңырау шалыңыз немесе WhatsApp-қа жазыңыз.',
    copyright: '© 2026 ТОО «СВОЙ ПРОЕКТ». Нысандарды кілтпен жобалау.',
    title: 'Үйді онлайн жобалау — СВОЙ ПРОЕКТ',
    m: 'м', m2: 'м²', floorsShort: { 1: '1 қабат', 1.5: '1 қабат + мансарда', 2: '2 қабат', 3: '3 қабат' },
    summary: (n, sot, pw, pl) => `Табылған нұсқалар: ${n}. Учаске ${fmt(sot)} сот. (≈ ${fmt(pw)} × ${fmt(pl)} м). Эскиздік жобаны ашу үшін карточканы басыңыз.`,
    noFit: (mw, ml, maxA) => `Бұл учаскеде шегіністерді ескергенде (көшеден 5 м, көршілерден 3 м) үй ізі ≈ ${fmt(mw)} × ${fmt(ml)} м-ден, ал құрылыс ауданы ${fmt(maxA)} м²-ден аспауы керек. Үй өлшемін азайтыңыз, қабат қосыңыз немесе учаскені үлкейтіңіз. Төменде — ең жақын нұсқалар, оларды жеке жобада бейімдеуге болады.`,
    badInput: 'Параметрлерді тексеріңіз: учаске ауданы 2 сотықтан, үй өлшемі 4-тен 30 м-ге дейін, аудан 30 м²-ден.',
    noFitTag: 'Учаскеге сыймайды', bedsN: n => `${n} жатын бөлме`,
    specProject: 'Жоба', specStyle: 'Стиль', specFloors: 'Қабат саны', specSize: 'Үй өлшемдері', specTotal: 'Жалпы аудан (шамамен)',
    specBuilt: 'Құрылыс ауданы', specBeds: 'Жатын бөлмелер', specBaths: 'Санторабтар', specRoof: 'Шатыр', specMat: 'Қабырға материалы',
    specGarage: 'Гараж', specTerrace: 'Терраса', specHeight: 'Үй биіктігі (шамамен)', specPlot: 'Учаске', specCover: 'Учаскенің құрылыс тығыздығы',
    yesShort: 'бар', noShort: 'жоқ', street: 'КӨШЕ', entrance: 'Кіреберіс', floorCap: ['1 қабат', '2 қабат', '3 қабат'], attic: 'Мансарда',
    atticNote: 'көлбеуді ескергендегі аудан', garage: 'Гараж', terrace: 'Терраса',
    wa: v => `Сәлеметсіз бе! svoyproect.kz сайтындағы онлайн-конструкторда үй таңдадым, эскиздік жобаны PDF форматында және толық жұмыс жобасын алғым келеді.\n\nЖоба: ${v.p.id} «${v.p.kz}» (${STYLES[v.style].kz})\nҚабат саны: ${T.kz.floorsShort[v.floors]}\nӨлшемдері: ${fmt(v.W)} × ${fmt(v.L)} м, жалпы ауданы ≈ ${fmt(v.total)} м²\nҚабырға материалы: ${MATS[v.mat].kz}\nШатыр: ${T.kz['r_' + v.roof]}\nБөлмелер: ${T.kz.roomsLine(v)}\nЖоспар нұсқасы: ${v.layout + 1}\nҚасбет: ${facadeLabel(v)}\nГараж: ${v.garage ? 'иә' : 'жоқ'}\nУчаске: ${fmt(v.plot.sot)} сот. (${fmt(v.plot.w)} × ${fmt(v.plot.l)} м)`,
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
  wardrobe: { ru: 'Гардероб', kz: 'Киім бөлмесі', fill: '#f4efe4' },
  kitchen:  { ru: 'Кухня', kz: 'Ас үй', fill: '#fbe7cf' },
  lounge:   { ru: 'Гостиная', kz: 'Қонақ бөлме', fill: '#fdf0de' },
  laundry:  { ru: 'Постирочная', kz: 'Кір жуатын бөлме', fill: '#e6f0f3' },
  corridor: { ru: 'Коридор', kz: 'Дәліз', fill: '#f3f4f6' }
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
  style: 'classic',
  variants: [],
  sel: null
};

function t(key) {
  const d = T[state.lang] || T.ru;
  return key in d ? d[key] : T.ru[key];
}

/* ------------------------------------------- образцы материалов (кнопки) */

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
  if (kind === 'brick' || kind === 'ceramic') {
    g.fillStyle = '#d3cabd'; g.fillRect(0, 0, S, S);
    const rows = 8, cols = 4, bh = S / rows, bw = S / cols;
    for (let y = 0; y < rows; y++) {
      const off = y % 2 ? bw / 2 : 0;
      for (let x = -1; x <= cols; x++) {
        g.fillStyle = shade(kind === 'brick' ? '#a4553a' : '#cdab7c', 0.82 + r() * 0.3);
        g.fillRect(x * bw + off + 2, y * bh + 2, bw - 4, bh - 4);
      }
    }
    noise(g, S, r, 0.06);
  } else if (kind === 'gas') {
    const base = '#ebe6dc';
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


/* ------------------------------------------------------- variant generation */

const FLOOR_K = { 1: 1, 1.5: 1.8, 2: 2, 3: 3 };
const CORRIDOR = 1.3; // ширина коридора, м

// Нормативные площади помещений, м² (растягиваются под размер этажа)
const ROOM_SIZE = { hall: 6, living: 0, kitchen: 12, lounge: 0, bed: 13, master: 16, bath: 5.5, wc: 3, boiler: 4, laundry: 4, wardrobe: 5, cabinet: 10, stairs: 7 };
const GROW = { living: 1.6, lounge: 1.5, kitchen: 1.1, master: 1.3, bed: 1.2, cabinet: 1, hall: 0.5, bath: 0.5, wardrobe: 0.4, stairs: 0.2, boiler: 0.2, laundry: 0.3, wc: 0.15 };

function readProgram() {
  return {
    beds: parseInt($('#pBeds').value, 10) || 1,
    baths: parseInt($('#pBaths').value, 10) || 1,
    kitchen: $('#pKitchen').value,
    cabinet: parseInt($('#pCab').value, 10) || 0,
    wardrobe: $('#pWardrobe').checked,
    laundry: $('#pLaundry').checked,
    boiler: $('#pBoiler').checked,
    guestDown: $('#pGuest').checked
  };
}

// Состав помещений по этажам
function roomSet(floors, prog) {
  const levels = [];
  const living = prog.kitchen === 'separate'
    ? [{ k: 'lounge', a: 18 + 2 * prog.beds }, { k: 'kitchen', a: ROOM_SIZE.kitchen }]
    : [{ k: 'living', a: clamp(22 + 3 * prog.beds, 24, 46) }];
  const beds = Array.from({ length: prog.beds }, (_, i) => ({ k: i === 0 && prog.beds > 1 ? 'master' : 'bed' }));
  if (prog.beds === 1) beds[0].k = 'master';
  const room = k => ({ k, a: ROOM_SIZE[k] });
  if (floors === 1) {
    const A = [room('hall'), ...living];
    if (prog.boiler) A.push(room('boiler'));
    if (prog.laundry) A.push(room('laundry'));
    for (let i = 0; i < prog.cabinet; i++) A.push(room('cabinet'));
    const B = beds.map(b => room(b.k));
    for (let i = 0; i < prog.baths; i++) B.push(room('bath'));
    if (prog.wardrobe) B.push(room('wardrobe'));
    levels.push({ A, B, factor: 1 });
    return levels;
  }
  const uppers = floors === 3 ? 2 : 1;
  // 1 этаж: вход и служебные — к улице, общая зона — к саду
  const F1A = [room('hall'), room('stairs')];
  const F1B = [...living];
  let bathsLeft = prog.baths, bedsLeft = beds.slice();
  if (prog.baths === 1) { F1A.push(room('bath')); bathsLeft = 0; }
  else { F1A.push(prog.guestDown ? room('bath') : room('wc')); bathsLeft -= 1; }
  if (prog.boiler) F1A.push(room('boiler'));
  if (prog.laundry) F1A.push(room('laundry'));
  if (prog.guestDown && bedsLeft.length) F1B.push(room(bedsLeft.pop().k === 'master' && bedsLeft.length === 0 ? 'master' : 'bed'));
  if (prog.cabinet) F1B.push(room('cabinet'));
  levels.push({ A: F1A, B: F1B, factor: 1 });
  const cabUp = Math.max(0, prog.cabinet - 1);
  for (let f = 0; f < uppers; f++) {
    const top = f === uppers - 1;
    const share = uppers === 1 ? bedsLeft.length : top ? Math.floor(bedsLeft.length / 2) : Math.ceil(bedsLeft.length / 2);
    const myBeds = top ? bedsLeft.splice(0, bedsLeft.length) : bedsLeft.splice(bedsLeft.length - share, share);
    const myBaths = uppers === 1 ? bathsLeft : top ? Math.floor(bathsLeft / 2) : Math.ceil(bathsLeft / 2);
    const rooms = [room('stairs')];
    for (let i = 0; i < myBaths; i++) rooms.push(room('bath'));
    if (prog.wardrobe && top) rooms.push(room('wardrobe'));
    if (cabUp && top) rooms.push(room('cabinet'));
    const sleep = myBeds.map(b => room(b.k));
    if (!sleep.length && !rooms.some(r => r.k === 'cabinet')) sleep.push(room('cabinet'));
    // делим поровну по площади: лестница и мокрые зоны — к фасаду
    const A = rooms, B = [];
    sleep.sort((a, b) => b.a - a.a).forEach(r => {
      const sa = A.reduce((s, x) => s + x.a, 0), sb = B.reduce((s, x) => s + x.a, 0);
      (sa <= sb ? A : B).push(r);
    });
    levels.push({ A, B, factor: floors === 1.5 ? 0.8 : 1, attic: floors === 1.5, upper: true });
  }
  return levels;
}

// Площадь, которая нужна под выбранный состав, м² (с коридорами и стенами)
function neededArea(floors, prog) {
  const set = roomSet(floors, prog);
  const net = set.reduce((s, lv) => s + [...lv.A, ...lv.B].reduce((a, r) => a + r.a, 0), 0);
  return Math.round(net * 1.12 / 5) * 5;
}

// Раскладка полосы: помещения идут колонками вдоль len, мелкие ставятся стопкой
function packBand(rooms, x0, y0, len, depth, along, hallOuter = 'end') {
  const out = [];
  const cols = [];
  let i = 0;
  while (i < rooms.length) {
    const col = [rooms[i++]];
    let area = col[0].a;
    while (i < rooms.length && area / depth < 2.3 && rooms[i].a < 12) { col.push(rooms[i]); area += rooms[i++].a; }
    // прихожая в стопке — у наружной стены, чтобы в ней была входная дверь
    const h = col.findIndex(r => r.k === 'hall');
    if (h >= 0) { const [hall] = col.splice(h, 1); if (hallOuter === 'end') col.push(hall); else col.unshift(hall); }
    cols.push({ rooms: col, area });
  }
  const total = cols.reduce((s, c) => s + c.area, 0);
  let pos = 0;
  cols.forEach(c => {
    const w = len * c.area / total;
    let off = 0;
    c.rooms.forEach(r => {
      const d = depth * r.a / c.area;
      if (along === 'x') out.push({ ...r, x: x0 + pos, y: y0 + off, w, h: d });
      else out.push({ ...r, x: x0 + off, y: y0 + pos, w: d, h: w });
      off += d;
    });
    pos += w;
  });
  return out;
}

// Ставит прихожую напротив входной двери
function orderForDoor(rooms, depth, doorX) {
  const i = rooms.findIndex(r => r.k === 'hall');
  if (i < 0) return rooms;
  const hall = rooms[i], rest = rooms.filter((_, j) => j !== i);
  let acc = 0, at = 0;
  for (; at < rest.length; at++) {
    if (acc + hall.a / depth / 2 >= doorX) break;
    acc += rest[at].a / depth;
  }
  rest.splice(at, 0, hall);
  return rest;
}

// variant: 0 — служебная зона у фасада, 1 — зеркально, 2 — зоны слева и справа
function program(floors, W, L, prog, variant = 0) {
  const F = W * L;
  return roomSet(floors, prog).map((lv, idx) => {
    const both = lv.A.length && lv.B.length;
    const corridor = both && (lv.B.length >= 2 || lv.upper) ? CORRIDOR : 0;
    const vertical = variant === 2;
    const len = vertical ? L : W;
    const avail = F - corridor * len;
    const A = lv.A.map(r => ({ ...r })), B = lv.B.map(r => ({ ...r }));
    const all = [...A, ...B];
    const need = all.reduce((s, r) => s + r.a, 0);
    let tight = 1;
    if (need > avail) {
      tight = avail / need;
      all.forEach(r => { r.a *= tight; });
    } else {
      const extra = avail - need;
      const weight = all.reduce((s, r) => s + r.a * (GROW[r.k] || 0.5), 0);
      all.forEach(r => { r.a += extra * r.a * (GROW[r.k] || 0.5) / weight; });
    }
    const sum = list => list.reduce((s, r) => s + r.a, 0);
    const span = (vertical ? W : L) - corridor;
    const dA = both ? span * sum(A) / (sum(A) + sum(B)) : span;
    const dB = span - (both ? dA : 0);
    let rects = [];
    if (!vertical) {
      // фасад — сторона y = L; служебная полоса A у фасада, жилая B — к саду
      const doorX = W / 2 + doorU(W);
      const aRooms = orderForDoor(A, dA, doorX);
      if (A.length) rects = rects.concat(packBand(aRooms, 0, L - dA, W, dA, 'x'));
      if (B.length) rects = rects.concat(packBand(B, 0, 0, W, dB, 'x'));
      if (corridor) rects.push({ k: lv.upper ? 'hallup' : 'corridor', x: 0, y: dB, w: W, h: corridor });
      if (variant === 1) rects.forEach(r => { r.x = W - r.x - r.w; });
    } else {
      if (A.length) rects = rects.concat(packBand(A, 0, 0, L, dA, 'y', 'start'));
      if (B.length) rects = rects.concat(packBand(B, dA + corridor, 0, L, dB, 'y'));
      if (corridor) rects.push({ k: lv.upper ? 'hallup' : 'corridor', x: dA, y: 0, w: corridor, h: L });
    }
    rects.forEach(rc => { rc.net = rc.w * rc.h * 0.92 * lv.factor; });
    return { rects, factor: lv.factor, attic: lv.attic, tight, total: rects.reduce((s, rc) => s + rc.net, 0), idx };
  });
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
    garage: $('#garage').value,
    terrace: $('#pTerrace').checked,
    style: state.style,
    prog: readProgram()
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

  const levels = program(floors, W, L, inp.prog);
  const beds = levels.reduce((s, lv) => s + lv.rects.filter(r => r.k === 'bed' || r.k === 'master').length, 0);
  const baths = levels.reduce((s, lv) => s + lv.rects.filter(r => r.k === 'bath' || r.k === 'wc').length, 0);
  const tight = Math.min(...levels.map(lv => lv.tight));
  if (tight < 0.9) penalty += (0.9 - tight) * 8;
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
    levels, beds, baths, total, built, cover, fits, rotated, plot, score: penalty,
    prog: inp.prog, tight, layout: 0
  };
  v.geo = geometry(v);
  return v;
}

// Общая геометрия дома — для фасадов, разреза и кровли
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

// Кровля по умолчанию для стиля
const STYLE_ROOF = { classic: 'hip', modern: 'shed', barn: 'gable', chalet: 'gable', hitech: 'flat', scandi: 'gable' };

// Один дом по параметрам посетителя (без подбора вариантов)
function buildHouse(inp) {
  const plot = plotDims(inp.sot, inp.plotW);
  const p = {
    id: 'ЭП', ru: 'Ваш дом', kz: 'Сіздің үйіңіз', style: inp.style, floors: inp.floors, w: 12, l: 10,
    roof: STYLE_ROOF[inp.style], terrace: inp.terrace, garage: inp.garage === 'yes', materials: Object.keys(MATS)
  };
  return { plot, v: makeVariant(p, inp, plot) };
}

/* ------------------------------------------------------------- участок */

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
  const pl = v.plot.l;
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

/* ------------------------------------------------------ эскизный проект */

// Листы чертежей всегда по-русски, как в проектной документации
function sketchContext() {
  return {
    PLINTH, FLOOR_H, GARAGE_W, TERRACE_D, SIDE, FRONT, BACK,
    placement, doorU,
    address: $('#addr').value.trim(),
    customer: $('#customer').value.trim(),
    roomName: r => r.name || ROOMS[r.k].ru,
    roomsLine: v => T.ru.roomsLine(v),
    floorsName: f => T.ru.floorsShort[f]
  };
}

function renderSheets(v) {
  setContext(sketchContext());
  state.sheets = sheets(v);
  if (state.sheet >= state.sheets.length) state.sheet = 0;
  $('#sheetTabs').innerHTML = state.sheets.map((s, i) =>
    `<button type="button" data-sheet="${i}" class="${i === state.sheet ? 'on' : ''}">${i ? i + '. ' : ''}${esc(s.short)}</button>`).join('');
  $$('#sheetTabs [data-sheet]').forEach(b => b.onclick = () => showSheet(+b.dataset.sheet));
  showSheet(state.sheet);
}

function showSheet(i) {
  state.sheet = (i + state.sheets.length) % state.sheets.length;
  const s = state.sheets[state.sheet];
  $('#sheet').innerHTML = s.svg;
  $('#sheetNo').textContent = t('sheetOf')(state.sheet, state.sheets.length - 1, s.title);
  $$('#sheetTabs [data-sheet]').forEach(b => b.classList.toggle('on', +b.dataset.sheet === state.sheet));
  if (!$('#zoom').hidden) $('#zoomSheet').innerHTML = s.svg;
}

const sheetIndex = prefix => Math.max(0, state.sheets.findIndex(s => s.short.startsWith(prefix)));

// Выбор отделки фасада и цвета кровли
function renderFacadePick(v) {
  const L = state.lang;
  const fc = v.facade;
  $('#facType').innerHTML = Object.entries(FACADES).map(([key, f]) =>
    `<button type="button" data-fac="${key}" class="${key === fc.type ? 'on' : ''}">${esc(f[L])}</button>`).join('');
  $('#facColor').innerHTML = FACADES[fc.type].colors.map(([name, hex], i) =>
    `<button type="button" data-col="${i}" class="${i === fc.color ? 'on' : ''}" title="${esc(name)}"><i style="background:${hex}"></i>${esc(name)}</button>`).join('');
  $('#roofBox').hidden = v.roof === 'flat';
  $('#roofColor').innerHTML = ROOF_COLORS.map(([name, hex], i) =>
    `<button type="button" data-rc="${i}" class="${i === v.roofColor ? 'on' : ''}" title="${esc(name)}"><i style="background:${hex}"></i>${esc(name)}</button>`).join('');
  setContext(sketchContext());
  $('#facPrev').innerHTML = facadeThumb(v);
  // после смены отделки показываем лист с фасадами — на остальных листах её не видно
  const changed = () => {
    renderFacadePick(v);
    renderSheets(v);
    showSheet(sheetIndex('Фасады'));
    updateOrder(v);
  };
  $$('#facType [data-fac]').forEach(b => b.onclick = () => { v.facade = { type: b.dataset.fac, color: 0 }; changed(); });
  $$('#facColor [data-col]').forEach(b => b.onclick = () => { v.facade = { ...v.facade, color: +b.dataset.col }; changed(); });
  $$('#roofColor [data-rc]').forEach(b => b.onclick = () => { v.roofColor = +b.dataset.rc; changed(); });
}

function facadeLabel(v) {
  const fc = FACADES[v.facade.type];
  return `${fc.ru}, ${fc.colors[v.facade.color][0].toLowerCase()}${v.roof !== 'flat' ? `; кровля — ${ROOF_COLORS[v.roofColor][0].toLowerCase()}` : ''}`;
}

function updateOrder(v) {
  const href = 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(t('wa')(v));
  $('#orderWa').href = href;
  $('#zoomWa').href = href;
}

/* ------------------------------------------------- редактор планировки */

const ED_MIN = 1.0;   // минимальная ширина комнаты, м
const ED_SNAP = 0.05; // шаг перемещения стены, м
const near = (a, b) => Math.abs(a - b) < 0.02;
const snap = x => Math.round(x / ED_SNAP) * ED_SNAP;

// Пересчёт площадей и состава после правки
function recount(v) {
  v.levels.forEach(lv => {
    lv.rects.forEach(rc => { rc.net = rc.w * rc.h * 0.92 * lv.factor; });
    lv.total = lv.rects.reduce((s, rc) => s + rc.net, 0);
  });
  v.total = v.levels.reduce((s, lv) => s + lv.total, 0);
  v.beds = v.levels.reduce((s, lv) => s + lv.rects.filter(r => r.k === 'bed' || r.k === 'master').length, 0);
  v.baths = v.levels.reduce((s, lv) => s + lv.rects.filter(r => r.k === 'bath' || r.k === 'wc').length, 0);
}

function snapshot(v) {
  state.edit.history.push(JSON.stringify(v.levels.map(lv => lv.rects)));
  if (state.edit.history.length > 60) state.edit.history.shift();
}

function undo(v) {
  const s = state.edit.history.pop();
  if (!s) return;
  JSON.parse(s).forEach((rects, i) => { v.levels[i].rects = rects; });
  state.edit.sel = null;
  afterEdit(v);
}

let sheetTimer = null;
function afterEdit(v) {
  recount(v);
  renderEditor(v);
  renderSpecs(v);
  updateOrder(v);
  clearTimeout(sheetTimer);
  sheetTimer = setTimeout(() => renderSheets(v), 60);
}

// Соседи комнаты, у которых общая стена на всю длину — с ними можно объединить
function fullNeighbors(lv, r) {
  return lv.rects.filter(n => n !== r && (
    (near(n.x, r.x) && near(n.w, r.w) && (near(n.y, r.y + r.h) || near(n.y + n.h, r.y))) ||
    (near(n.y, r.y) && near(n.h, r.h) && (near(n.x, r.x + r.w) || near(n.x + n.w, r.x)))));
}

function merge(lv, a, b) {
  const x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y);
  a.w = Math.max(a.x + a.w, b.x + b.w) - x0;
  a.h = Math.max(a.y + a.h, b.y + b.h) - y0;
  a.x = x0; a.y = y0;
  lv.rects.splice(lv.rects.indexOf(b), 1);
}

// Стены, которые двигаются вместе с захваченной: та же линия, сплошная цепочка
function wallGroup(lv, orient, c, a0, b0) {
  const edges = [];
  lv.rects.forEach(r => {
    if (orient === 'v') {
      if (near(r.x + r.w, c)) edges.push({ r, side: 'r', a: r.y, b: r.y + r.h });
      if (near(r.x, c)) edges.push({ r, side: 'l', a: r.y, b: r.y + r.h });
    } else {
      if (near(r.y + r.h, c)) edges.push({ r, side: 'b', a: r.x, b: r.x + r.w });
      if (near(r.y, c)) edges.push({ r, side: 't', a: r.x, b: r.x + r.w });
    }
  });
  let lo = a0, hi = b0, grown = true;
  const group = new Set();
  while (grown) {
    grown = false;
    edges.forEach(e => {
      if (!group.has(e) && e.a < hi + 0.02 && e.b > lo - 0.02) { group.add(e); lo = Math.min(lo, e.a); hi = Math.max(hi, e.b); grown = true; }
    });
  }
  return [...group];
}

function moveWall(group, orient, c) {
  let lo = -Infinity, hi = Infinity;
  group.forEach(({ r, side }) => {
    if (side === 'r') lo = Math.max(lo, r.x + ED_MIN);
    if (side === 'l') hi = Math.min(hi, r.x + r.w - ED_MIN);
    if (side === 'b') lo = Math.max(lo, r.y + ED_MIN);
    if (side === 't') hi = Math.min(hi, r.y + r.h - ED_MIN);
  });
  const nc = clamp(snap(c), lo, hi);
  group.forEach(e => {
    const r = e.r;
    if (e.side === 'r') r.w = nc - r.x;
    if (e.side === 'l') { r.w = r.x + r.w - nc; r.x = nc; }
    if (e.side === 'b') r.h = nc - r.y;
    if (e.side === 't') { r.h = r.y + r.h - nc; r.y = nc; }
  });
}

function renderEditor(v) {
  const L = state.lang;
  const ed = state.edit;
  if (ed.level >= v.levels.length) ed.level = 0;
  const lv = v.levels[ed.level];
  $('#edFloors').innerHTML = v.levels.map((l2, i) =>
    `<button type="button" data-lv="${i}" class="${i === ed.level ? 'on' : ''}">${esc(l2.attic ? t('attic') : t('floorCap')[i])}</button>`).join('');
  $$('#edFloors [data-lv]').forEach(b => b.onclick = () => { ed.level = +b.dataset.lv; ed.sel = null; renderEditor(v); });
  $('#edUndo').disabled = !ed.history.length;

  const pad = 0.9, W = v.W, Lh = v.L;
  const o = [`<svg viewBox="${-pad} ${-pad} ${W + 2 * pad} ${Lh + 2 * pad}" xmlns="http://www.w3.org/2000/svg" id="edSvg">`];
  lv.rects.forEach((r, i) => {
    const R0 = ROOMS[r.k];
    const sel = i === ed.sel;
    o.push(`<rect class="room" data-i="${i}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${R0.fill}" stroke="${sel ? '#2f7fd1' : '#3a3f45'}" stroke-width="${sel ? 0.12 : 0.05}"/>`);
    const name = r.name || R0[L];
    const fs = clamp(Math.min((r.w - 0.2) / (name.length * 0.64), r.h / 3.4), 0.12, 0.42);
    o.push(`<text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 - fs * 0.1}" font-size="${fs}" text-anchor="middle" font-weight="700" fill="#11161d" pointer-events="none">${esc(name)}</text>`);
    o.push(`<text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + fs * 1.1}" font-size="${fs * 0.85}" text-anchor="middle" fill="#56616f" pointer-events="none">${fmt(r.net)} ${t('m2')}</text>`);
  });
  o.push(`<rect x="0" y="0" width="${W}" height="${Lh}" fill="none" stroke="#11161d" stroke-width="0.22" pointer-events="none"/>`);
  // ручки внутренних стен
  lv.rects.forEach((r, i) => {
    [['v', r.x + r.w, r.y, r.y + r.h, 'r'], ['h', r.y + r.h, r.x, r.x + r.w, 'b']].forEach(([orient, c, a, b]) => {
      if (orient === 'v' && near(c, W)) return;
      if (orient === 'h' && near(c, Lh)) return;
      const line = orient === 'v' ? `x1="${c}" y1="${a}" x2="${c}" y2="${b}"` : `x1="${a}" y1="${c}" x2="${b}" y2="${c}"`;
      o.push(`<line class="wall ${orient}" data-o="${orient}" data-c="${c}" data-a="${a}" data-b="${b}" ${line} stroke="transparent" stroke-width="0.45"/>`);
    });
  });
  o.push(`<text x="${W / 2}" y="${Lh + pad * 0.7}" font-size="0.32" text-anchor="middle" fill="#2f7fd1" font-weight="700">▲ ${esc(t('streetSide'))}</text>`);
  o.push('</svg>');
  $('#edCanvas').innerHTML = o.join('');
  bindEditor(v, lv);
  renderSide(v, lv);
}

function svgPoint(svg, e) {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function bindEditor(v, lv) {
  const svg = $('#edSvg');
  const ed = state.edit;
  svg.querySelectorAll('.room').forEach(el => el.addEventListener('pointerdown', () => {
    ed.sel = +el.dataset.i;
    renderEditor(v);
  }));
  svg.querySelectorAll('.wall').forEach(el => el.addEventListener('pointerdown', e => {
    e.preventDefault();
    e.stopPropagation();
    const orient = el.dataset.o;
    const group = wallGroup(lv, orient, +el.dataset.c, +el.dataset.a, +el.dataset.b);
    if (!group.length) return;
    snapshot(v);
    let moved = false;
    // svg перерисовывается на каждом шаге, поэтому слушаем документ
    const onMove = ev => {
      const p = svgPoint($('#edSvg'), ev);
      moveWall(group, orient, orient === 'v' ? p.x : p.y);
      moved = true;
      recount(v);
      renderEditor(v);
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (!moved) state.edit.history.pop();
      afterEdit(v);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }));
}
function renderSide(v, lv) {
  const ed = state.edit;
  const L = state.lang;
  const side = $('#edSide');
  if (ed.sel == null || !lv.rects[ed.sel]) {
    side.innerHTML = `<p class="edempty">${esc(t('edPick'))}</p><div class="edsum">${esc(t('floorTotal'))}: <b>${fmt(lv.total)} ${t('m2')}</b> · ${esc(t('roomsCount'))}: <b>${lv.rects.length}</b></div>`;
    return;
  }
  const r = lv.rects[ed.sel];
  const opts = Object.keys(ROOMS).map(k => `<option value="${k}"${k === r.k ? ' selected' : ''}>${esc(ROOMS[k][L])}</option>`).join('');
  side.innerHTML = `
    <div class="field"><label>${esc(t('edType'))}</label><select id="edType">${opts}</select></div>
    <div class="field"><label>${esc(t('edName'))}</label><input id="edName" type="text" maxlength="40" value="${esc(r.name || '')}" placeholder="${esc(ROOMS[r.k][L])}" /></div>
    <div class="edsize">${fmt(r.w)} × ${fmt(r.h)} ${t('m')} · <b>${fmt(r.net)} ${t('m2')}</b></div>
    <div class="edbtns">
      <button type="button" data-act="splitV">⇹ ${esc(t('splitV'))}</button>
      <button type="button" data-act="splitH">⇵ ${esc(t('splitH'))}</button>
      <button type="button" data-act="merge">⧉ ${esc(t('mergeBtn'))}</button>
      <button type="button" data-act="del" class="danger">✕ ${esc(t('delBtn'))}</button>
    </div>
    <p class="edmsg" id="edMsg" hidden></p>`;
  $('#edType').onchange = e => { snapshot(v); r.k = e.target.value; afterEdit(v); };
  $('#edName').onchange = e => { snapshot(v); r.name = e.target.value.trim(); afterEdit(v); };
  const msg = s => { $('#edMsg').hidden = false; $('#edMsg').textContent = s; };
  side.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
    const act = b.dataset.act;
    if (act === 'splitV' || act === 'splitH') {
      const vert = act === 'splitV';
      if ((vert ? r.w : r.h) < ED_MIN * 2) return msg(t('tooSmall'));
      snapshot(v);
      const n = { ...r, name: '' };
      if (vert) { const w = snap(r.w / 2); n.x = r.x + w; n.w = r.w - w; r.w = w; }
      else { const h = snap(r.h / 2); n.y = r.y + h; n.h = r.h - h; r.h = h; }
      lv.rects.push(n);
      afterEdit(v);
      return;
    }
    const nb = fullNeighbors(lv, r);
    if (!nb.length) return msg(t('noMerge'));
    snapshot(v);
    if (act === 'merge') {
      merge(lv, r, nb.sort((a, b2) => b2.w * b2.h - a.w * a.h)[0]);
      ed.sel = lv.rects.indexOf(r);
    } else {
      // удаляемую комнату забирает коридор или общая зона, иначе любой сосед
      const pref = ['corridor', 'hallup', 'hall', 'living', 'lounge'];
      merge(lv, nb.find(n => pref.includes(n.k)) || nb[0], r);
      ed.sel = null;
    }
    afterEdit(v);
  });
}

function renderLayoutPick(v) {
  $('#layouts').innerHTML = t('lay').map((name, i) =>
    `<button type="button" data-lay="${i}" class="${i === v.layout ? 'on' : ''}">${i + 1}. ${esc(name)}</button>`).join('');
  $('#tight').hidden = v.tight >= 0.9;
  $('#tight').textContent = t('tightNote')(neededArea(v.floors, v.prog));
  $$('#layouts [data-lay]').forEach(b => b.onclick = () => {
    snapshot(v);
    v.layout = +b.dataset.lay;
    v.levels = program(v.floors, v.W, v.L, v.prog, v.layout);
    state.edit.sel = null;
    renderLayoutPick(v);
    afterEdit(v);
  });
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

function renderStyles() {
  $('#styles').innerHTML = Object.keys(STYLES).map(k =>
    `<button type="button" data-style="${k}" class="${k === state.style ? 'on' : ''}">${esc(STYLES[k][state.lang])}</button>`).join('');
  $$('#styles [data-style]').forEach(b => b.onclick = () => {
    state.style = b.dataset.style;
    renderStyles();
    if (state.sel) run(false);
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
  renderStyles();
  updateNeed();
  if (state.sel) selectVariant(state.sel, false);
}

function renderSpecs(v) {
  const L = state.lang;
  const rows = [
    [t('specStyle'), STYLES[v.style][L]],
    [t('specFloors'), t('floorsShort')[v.floors]],
    [t('specSize'), `${fmt(v.W)} × ${fmt(v.L)} ${t('m')}`],
    [t('specTotal'), `≈ ${fmt(v.total)} ${t('m2')}`],
    [t('specBuilt'), `${fmt(v.built)} ${t('m2')}`],
    [t('specRooms'), t('roomsLine')(v)],
    [t('specRoof'), t('r_' + v.roof)],
    [t('specMat'), MATS[v.mat][L]],
    [t('specGarage'), v.garage ? t('yesShort') : t('noShort')],
    [t('specTerrace'), v.terrace ? t('yesShort') : t('noShort')],
    [t('specHeight'), `≈ ${fmt(v.geo.height - PLINTH)} ${t('m')}`],
    [t('specPlot'), `${fmt(v.plot.sot)} ${t('sot')} · ${fmt(v.plot.w)} × ${fmt(v.plot.l)} ${t('m')}`],
    [t('specCover'), `${Math.round(v.cover * 100)} %`]
  ];
  $('#specs').innerHTML = rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('');
}

function selectVariant(v, scroll) {
  state.sel = v;
  $('#viewer').hidden = false;
  $('#vCode').textContent = `${STYLES[v.style][state.lang]} · ${t('floorsShort')[v.floors]} · ${fmt(v.W)} × ${fmt(v.L)} ${t('m')}`;
  $('#vName').textContent = t('yourHouse');
  renderSpecs(v);
  renderLayoutPick(v);
  renderEditor(v);
  renderFacadePick(v);
  renderSheets(v);
  updateOrder(v);
  if (scroll) $('#viewer').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function run(scroll) {
  const inp = readInput();
  const alert = $('#alert');
  if (!validate(inp)) {
    alert.hidden = false;
    alert.textContent = t('badInput');
    return;
  }
  const { plot, v } = buildHouse(inp);
  const prev = state.sel;
  v.facade = prev ? prev.facade : defaultFacade(v);
  v.roofColor = prev && prev.roof === v.roof ? prev.roofColor : defaultRoofColor(v);
  state.edit = { level: 0, sel: null, history: [] };
  state.sheet = 0;
  if (!v.fits) {
    const mw = plot.w - 2 * SIDE, ml = plot.l - FRONT - BACK;
    alert.hidden = false;
    alert.textContent = t('noFit')(Math.max(mw, 0), Math.max(ml, 0), plot.area * MAX_COVER);
  } else alert.hidden = true;
  selectVariant(v, scroll);
  if (window.gtag && scroll) gtag('event', 'house_configure', { floors: inp.floors, material: inp.mat, style: inp.style });
}

// Цвет кровли по умолчанию — от стиля
function defaultRoofColor(v) {
  return { classic: 0, chalet: 1, scandi: 2, barn: 2, modern: 2, hitech: 4 }[v.style];
}

// Подсказка: какая площадь нужна под выбранный состав комнат
function updateNeed() {
  $('#guestBox').hidden = state.floors === 1;
  const need = neededArea(state.floors, readProgram());
  const per = Math.round(need / FLOOR_K[state.floors]);
  const w = half(Math.sqrt(per * 0.85)), l = half(per / w);
  $('#needText').textContent = t('need')(need, per, w, l);
}

function initLang() {
  let lang = new URLSearchParams(location.search).get('lang');
  if (!lang) { try { lang = localStorage.getItem('sp_lang'); } catch (e) { /* хранилище недоступно */ } }
  state.lang = lang === 'kz' ? 'kz' : 'ru';
}

// Полноэкранный просмотр листа с масштабом
function openZoom() {
  state.zoom = 1;
  $('#zoomSheet').innerHTML = state.sheets[state.sheet].svg;
  $('#zoomSheet').style.width = '100%';
  $('#zoom').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeZoom() {
  $('#zoom').hidden = true;
  document.body.style.overflow = '';
}
function setZoom(d) {
  state.zoom = clamp(state.zoom * d, 1, 4);
  $('#zoomSheet').style.width = state.zoom * 100 + '%';
}

function init() {
  initLang();
  state.edit = { level: 0, sel: null, history: [] };
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
    updateNeed();
  });
  ['#pBeds', '#pBaths', '#pKitchen', '#pCab', '#pWardrobe', '#pBoiler', '#pLaundry', '#pGuest'].forEach(id => $(id).addEventListener('change', updateNeed));
  ['#addr', '#customer'].forEach(id => $(id).addEventListener('change', () => { if (state.sel) renderSheets(state.sel); }));
  $('#useArea').onclick = () => {
    $('#houseArea').value = neededArea(state.floors, readProgram());
    $('#sizeMode button[data-v="area"]').click();
  };
  $('#edUndo').onclick = () => { if (state.sel) undo(state.sel); };
  $('#prevSheet').onclick = () => showSheet(state.sheet - 1);
  $('#nextSheet').onclick = () => showSheet(state.sheet + 1);
  $('#fullSheet').onclick = openZoom;
  $('#sheet').onclick = openZoom;
  $('#zoomClose').onclick = closeZoom;
  $('#zoomIn').onclick = () => setZoom(1.4);
  $('#zoomOut').onclick = () => setZoom(1 / 1.4);
  $('#zoomPrev').onclick = () => showSheet(state.sheet - 1);
  $('#zoomNext').onclick = () => showSheet(state.sheet + 1);
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && state.sel && $('#zoom').hidden && !/INPUT|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); undo(state.sel); }
    if ($('#zoom').hidden) return;
    if (e.key === 'Escape') closeZoom();
    if (e.key === 'ArrowLeft') showSheet(state.sheet - 1);
    if (e.key === 'ArrowRight') showSheet(state.sheet + 1);
  });
  // эскиз смотрят на сайте, файл выдаём по запросу
  ['#sheet', '#zoomSheet'].forEach(id => $(id).addEventListener('contextmenu', e => e.preventDefault()));
  $('#cfg').addEventListener('submit', e => { e.preventDefault(); run(true); });
  $('#orderWa').addEventListener('click', () => { if (window.gtag) gtag('event', 'house_order_whatsapp', { style: state.sel && state.sel.style }); });
  $('#orderTel').addEventListener('click', () => { if (window.gtag) gtag('event', 'house_order_call', { style: state.sel && state.sel.style }); });
  applyLang();
  run(false);
}

init();
