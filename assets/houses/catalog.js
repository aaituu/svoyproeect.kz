/*
 * Каталог типовых проектов частных домов «СВОЙ ПРОЕКТ».
 * Параметры составлены по образцу самых востребованных решений в каталогах
 * ИЖС (одноэтажные 60–150 м², дома с мансардой, двухэтажные, барнхаус, шале,
 * хай-тек, дома с гаражом). Изображения не используются — по этим параметрам
 * строится эскизный проект (assets/houses/sketch.js).
 *
 * w — ширина дома по фасаду, м; l — глубина, м (габариты основного объёма)
 * floors — 1, 1.5 (с мансардой), 2, 3
 * roof — gable (двускатная), hip (вальмовая), flat (плоская), shed (односкатная), mansard (мансардная)
 * style — classic, modern, barn, chalet, hitech, scandi
 * materials — gas (газоблок), brick (кирпич), ceramic (керамоблок), wood (брус), frame (каркас), monolith (монолит)
 */
window.HOUSE_CATALOG = [
  { id: 'SP-101', ru: 'Уют', kz: 'Жайлы', style: 'scandi', floors: 1, w: 6, l: 8, roof: 'gable', terrace: true, garage: false, materials: ['wood', 'frame', 'gas'] },
  { id: 'SP-102', ru: 'Степной', kz: 'Дала', style: 'classic', floors: 1, w: 8, l: 9, roof: 'hip', terrace: false, garage: false, materials: ['gas', 'brick', 'ceramic'] },
  { id: 'SP-103', ru: 'Барн 72', kz: 'Барн 72', style: 'barn', floors: 1, w: 6, l: 12, roof: 'gable', terrace: true, garage: false, materials: ['frame', 'wood', 'gas'] },
  { id: 'SP-104', ru: 'Алатау', kz: 'Алатау', style: 'classic', floors: 1, w: 10, l: 10, roof: 'hip', terrace: true, garage: false, materials: ['gas', 'brick', 'ceramic', 'monolith'] },
  { id: 'SP-105', ru: 'Есиль', kz: 'Есіл', style: 'modern', floors: 1, w: 12, l: 9, roof: 'flat', terrace: true, garage: false, materials: ['gas', 'monolith', 'ceramic', 'brick'] },
  { id: 'SP-106', ru: 'Семейный', kz: 'Отбасылық', style: 'classic', floors: 1, w: 10, l: 13, roof: 'gable', terrace: true, garage: true, materials: ['gas', 'brick', 'ceramic'] },
  { id: 'SP-107', ru: 'Скандинавия', kz: 'Скандинавия', style: 'scandi', floors: 1, w: 9, l: 11, roof: 'gable', terrace: true, garage: false, materials: ['frame', 'wood', 'gas'] },
  { id: 'SP-108', ru: 'Горизонт', kz: 'Көкжиек', style: 'hitech', floors: 1, w: 14, l: 10, roof: 'flat', terrace: true, garage: true, materials: ['monolith', 'gas', 'ceramic'] },
  { id: 'SP-109', ru: 'Байтерек', kz: 'Бәйтерек', style: 'classic', floors: 1, w: 12, l: 14, roof: 'hip', terrace: true, garage: true, materials: ['brick', 'ceramic', 'gas'] },
  { id: 'SP-110', ru: 'Шале Боровое', kz: 'Бурабай шалесі', style: 'chalet', floors: 1, w: 9, l: 9, roof: 'gable', terrace: true, garage: false, materials: ['wood', 'frame', 'brick'] },

  { id: 'SP-151', ru: 'Мансарда 8×8', kz: 'Мансарда 8×8', style: 'classic', floors: 1.5, w: 8, l: 8, roof: 'mansard', terrace: true, garage: false, materials: ['gas', 'wood', 'frame', 'brick'] },
  { id: 'SP-152', ru: 'Барнхаус 120', kz: 'Барнхаус 120', style: 'barn', floors: 1.5, w: 7, l: 12, roof: 'mansard', terrace: true, garage: false, materials: ['frame', 'wood', 'gas'] },
  { id: 'SP-153', ru: 'Шале Альпика', kz: 'Альпика шалесі', style: 'chalet', floors: 1.5, w: 10, l: 10, roof: 'mansard', terrace: true, garage: false, materials: ['wood', 'brick', 'gas'] },
  { id: 'SP-154', ru: 'Нордик', kz: 'Нордик', style: 'scandi', floors: 1.5, w: 9, l: 12, roof: 'mansard', terrace: false, garage: true, materials: ['frame', 'gas', 'ceramic'] },
  { id: 'SP-155', ru: 'Европа', kz: 'Еуропа', style: 'classic', floors: 1.5, w: 11, l: 10, roof: 'mansard', terrace: true, garage: true, materials: ['brick', 'gas', 'ceramic'] },

  { id: 'SP-201', ru: 'Компакт 2', kz: 'Компакт 2', style: 'modern', floors: 2, w: 7, l: 8, roof: 'shed', terrace: false, garage: false, materials: ['gas', 'frame', 'monolith'] },
  { id: 'SP-202', ru: 'Классик 9×9', kz: 'Классик 9×9', style: 'classic', floors: 2, w: 9, l: 9, roof: 'hip', terrace: true, garage: false, materials: ['gas', 'brick', 'ceramic'] },
  { id: 'SP-203', ru: 'Куб', kz: 'Куб', style: 'hitech', floors: 2, w: 10, l: 10, roof: 'flat', terrace: true, garage: false, materials: ['monolith', 'gas', 'ceramic'] },
  { id: 'SP-204', ru: 'Барнхаус 2', kz: 'Барнхаус 2', style: 'barn', floors: 2, w: 8, l: 12, roof: 'gable', terrace: true, garage: false, materials: ['frame', 'wood', 'gas'] },
  { id: 'SP-205', ru: 'Коттедж Резиденция', kz: 'Резиденция коттеджі', style: 'classic', floors: 2, w: 12, l: 11, roof: 'hip', terrace: true, garage: true, materials: ['brick', 'ceramic', 'gas', 'monolith'] },
  { id: 'SP-206', ru: 'Модерн 180', kz: 'Модерн 180', style: 'modern', floors: 2, w: 11, l: 9, roof: 'shed', terrace: true, garage: true, materials: ['gas', 'ceramic', 'monolith'] },
  { id: 'SP-207', ru: 'Шале Медеу', kz: 'Медеу шалесі', style: 'chalet', floors: 2, w: 10, l: 12, roof: 'gable', terrace: true, garage: false, materials: ['wood', 'brick', 'gas'] },
  { id: 'SP-208', ru: 'Вилла Хай-тек', kz: 'Хай-тек вилла', style: 'hitech', floors: 2, w: 14, l: 12, roof: 'flat', terrace: true, garage: true, materials: ['monolith', 'ceramic', 'gas'] },

  { id: 'SP-301', ru: 'Таунхаус-вертикаль', kz: 'Тік таунхаус', style: 'modern', floors: 3, w: 8, l: 10, roof: 'flat', terrace: true, garage: true, materials: ['monolith', 'gas', 'brick', 'ceramic'] },
  { id: 'SP-302', ru: 'Особняк', kz: 'Сарай үй', style: 'classic', floors: 3, w: 12, l: 12, roof: 'hip', terrace: true, garage: true, materials: ['brick', 'monolith', 'ceramic'] }
];
