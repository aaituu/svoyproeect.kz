/*
 * Эскизный проект для svoyproect.kz: листы А3 (SVG) в стиле проектной
 * документации — титул, общие данные, генплан, сети, планы этажей,
 * разрез, фасады, план кровли. Всё строится по параметрам варианта.
 * Единицы листа — миллиметры (420 × 297), масштаб чертежей подбирается.
 */

let C = null; // контекст из configurator.js: константы, форматирование, названия
export function setContext(ctx) { C = ctx; }

const SW = 420, SH = 297;
const FONT = "'PT Sans Narrow','Arial Narrow',Arial,sans-serif";
const INK = '#1d1d1f';
let uid = 0;

/* ------------------------------------------------------------ примитивы */

const r2 = n => Math.round(n * 100) / 100;
const mm = m => String(Math.round(m * 100) * 10);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (n, d = 1) => n.toFixed(d).replace('.', ',');
const lvl = m => (Math.abs(m) < 0.0005 ? '±0.000' : (m > 0 ? '+' : '-') + Math.abs(m).toFixed(3));

function T(x, y, s, o = {}) {
  const a = [`x="${r2(x)}"`, `y="${r2(y)}"`, `font-size="${o.size || 3}"`];
  if (o.anchor) a.push(`text-anchor="${o.anchor}"`);
  if (o.weight) a.push(`font-weight="${o.weight}"`);
  if (o.fill) a.push(`fill="${o.fill}"`);
  if (o.rot) a.push(`transform="rotate(${o.rot} ${r2(x)} ${r2(y)})"`);
  if (o.italic) a.push('font-style="italic"');
  if (o.deco) a.push(`text-decoration="${o.deco}"`);
  return `<text ${a.join(' ')}>${esc(s)}</text>`;
}
function L(x1, y1, x2, y2, w = 0.25, c = INK, dash) {
  return `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" stroke="${c}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
}
function R(x, y, w, h, o = {}) {
  return `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(Math.max(w, 0))}" height="${r2(Math.max(h, 0))}" fill="${o.fill || 'none'}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 0.25}"` : ''}${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}${o.op != null ? ` opacity="${o.op}"` : ''}/>`;
}
function P(pts, o = {}) {
  return `<polygon points="${pts.map(p => `${r2(p[0])},${r2(p[1])}`).join(' ')}" fill="${o.fill || 'none'}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 0.25}" stroke-linejoin="round"` : ''}${o.op != null ? ` opacity="${o.op}"` : ''}/>`;
}
function PL(pts, w = 0.3, c = INK, dash) {
  return `<polyline points="${pts.map(p => `${r2(p[0])},${r2(p[1])}`).join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
}

// Размерная линия с засечками; текст — над линией
function dimH(x1, x2, y, label, size = 2.4) {
  return L(x1, y, x2, y, 0.18) + L(x1 - 1, y + 1, x1 + 1, y - 1, 0.35) + L(x2 - 1, y + 1, x2 + 1, y - 1, 0.35) +
    (Math.abs(x2 - x1) > size * 1.8 ? T((x1 + x2) / 2, y - 0.8, label, { size, anchor: 'middle' }) : '');
}
function dimV(y1, y2, x, label, size = 2.4) {
  return L(x, y1, x, y2, 0.18) + L(x - 1, y1 + 1, x + 1, y1 - 1, 0.35) + L(x - 1, y2 + 1, x + 1, y2 - 1, 0.35) +
    (Math.abs(y2 - y1) > size * 1.8 ? T(x - 0.8, (y1 + y2) / 2, label, { size, anchor: 'middle', rot: -90 }) : '');
}
// Отметка уровня: стрелка-галочка, полка и подпись
function mark(x, y, value, side = 'left', len = 16) {
  const dir = side === 'left' ? -1 : 1;
  const x2 = x + dir * len;
  return L(x, y, x2, y, 0.2) + PL([[x2 - 1.6, y - 1.6], [x2, y], [x2 + 1.6, y - 1.6]], 0.35) +
    L(x2, y, x2, y - 4, 0.2) + L(x2, y - 4, x2 + dir * 9, y - 4, 0.2) +
    T(x2 + dir * 4.5, y - 4.7, lvl(value), { size: 2.3, anchor: 'middle' });
}
function bubble(x, y, label, r = 3.2) {
  return `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="0.3"/>` + T(x, y + 1.05, label, { size: 3, anchor: 'middle' });
}

/* -------------------------------------------------- материалы и цвета */

// Варианты отделки фасада, которые посетитель выбирает сам
export const FACADES = {
  stucco: { ru: 'Штукатурка', kz: 'Сылақ', name: 'Декоративная штукатурка',
    colors: [['Кремовый', '#eadfc6', 'RAL 9001'], ['Белый', '#efeeea', 'RAL 9010'], ['Бежевый', '#d6c09a', 'RAL 1015'], ['Серый', '#bcbcb5', 'RAL 7044'], ['Терракота', '#c98a68', 'RAL 3012']] },
  brick: { ru: 'Кирпич', kz: 'Кірпіш', name: 'Облицовочный кирпич',
    colors: [['Красный', '#9a4a31', 'RAL 8004'], ['Светлый', '#cfae80', 'RAL 1001'], ['Коричневый', '#6e4a36', 'RAL 8017'], ['Белый', '#e3ddd2', 'RAL 9001']] },
  siding: { ru: 'Сайдинг', kz: 'Сайдинг', name: 'Фасадный сайдинг',
    colors: [['Белый', '#e9e6dc', 'RAL 9002'], ['Серый', '#a7aaa8', 'RAL 7038'], ['Оливковый', '#a4a58a', 'RAL 7034'], ['Голубой', '#a9bccb', 'RAL 5024']] },
  battens: { ru: 'Фасадная доска', kz: 'Қасбет тақтайы', name: 'Фасадная доска',
    colors: [['Графит', '#3d4247', 'RAL 7016'], ['Тёмный орех', '#4a3a30', 'RAL 8019'], ['Чёрный', '#2a2b2d', 'RAL 9005']] },
  logs: { ru: 'Брус', kz: 'Бөрене', name: 'Брус, защитно-декоративный состав',
    colors: [['Натуральный', '#b07a45', 'RAL 8001'], ['Тёмный', '#7a5232', 'RAL 8011']] },
  concrete: { ru: 'Бетон', kz: 'Бетон', name: 'Архитектурный бетон',
    colors: [['Светлый', '#c9c6bb', 'RAL 7044'], ['Графитовый', '#8d8c88', 'RAL 7037']] }
};
export const ROOF_COLORS = [['Красный', '#8c3a28', 'RAL 3011'], ['Коричневый', '#4a3c35', 'RAL 8019'], ['Графит', '#474a51', 'RAL 7024'], ['Зелёный', '#3f5a45', 'RAL 6005'], ['Серый', '#7d8287', 'RAL 7040']];

// Отделка по умолчанию — от материала стен и стиля
export function defaultFacade(v) {
  const dark = v.style === 'barn' || v.style === 'modern' || v.style === 'hitech';
  const t = { gas: 'stucco', brick: 'brick', ceramic: 'brick', wood: 'logs', frame: dark ? 'battens' : 'siding', monolith: 'concrete' }[v.mat];
  const c = { gas: dark ? 1 : 0, ceramic: 1 }[v.mat] || 0;
  return { type: t, color: c };
}

function finish(v) {
  const dark = v.style === 'barn' || v.style === 'modern' || v.style === 'hitech';
  const wall = {
    gas: v.style === 'modern' || v.style === 'hitech'
      ? { tex: 'stucco', color: '#eeede8', ral: 'RAL 9010', name: 'Декоративная штукатурка' }
      : { tex: 'stucco', color: '#eadfc6', ral: 'RAL 9001', name: 'Декоративная штукатурка' },
    brick: { tex: 'brick', color: '#9a4a31', mortar: '#cbbfae', ral: 'RAL 8004', name: 'Облицовочный кирпич' },
    ceramic: { tex: 'brick', color: '#cfae80', mortar: '#ece4d6', ral: 'RAL 1001', name: 'Облицовочный кирпич (светлый)' },
    wood: { tex: 'logs', color: '#b07a45', ral: 'RAL 8001', name: 'Брус, защитно-декоративный состав' },
    frame: dark ? { tex: 'battens', color: '#3d4247', ral: 'RAL 7016', name: 'Фасадная доска (сайдинг)' }
      : { tex: 'siding', color: '#e9e6dc', ral: 'RAL 9002', name: 'Фасадный сайдинг' },
    monolith: { tex: 'concrete', color: '#c9c6bb', ral: 'RAL 7044', name: 'Архитектурный бетон' }
  }[v.mat];
  const roof = {
    classic: { tex: 'tile', color: '#8c3a28', ral: 'RAL 3011', name: 'Металлочерепица' },
    scandi: { tex: 'seam', color: '#474a51', ral: 'RAL 7024', name: 'Фальцевая кровля' },
    chalet: { tex: 'shingle', color: '#4a3c35', ral: 'RAL 8019', name: 'Гибкая черепица' },
    barn: { tex: 'seam', color: '#2e3134', ral: 'RAL 7016', name: 'Фальцевая кровля' },
    modern: { tex: 'seam', color: '#474a51', ral: 'RAL 7024', name: 'Металлочерепица' },
    hitech: { tex: 'flat', color: '#7d8287', ral: 'RAL 7040', name: 'ПВХ-мембрана' }
  }[v.style];
  if (v.roof === 'flat') Object.assign(roof, { tex: 'flat', color: '#7d8287', ral: 'RAL 7040', name: 'ПВХ-мембрана' });
  else if (roof.tex === 'flat') Object.assign(roof, { tex: 'seam', name: 'Фальцевая кровля' });
  else if (v.roofColor != null) Object.assign(roof, { color: ROOF_COLORS[v.roofColor][1], ral: ROOF_COLORS[v.roofColor][2] });
  if (v.facade) {
    const fc = FACADES[v.facade.type], [, color, ral] = fc.colors[v.facade.color] || fc.colors[0];
    Object.assign(wall, { tex: v.facade.type, color, ral, name: fc.name, mortar: v.facade.type === 'brick' ? '#d8d0c3' : undefined });
  }
  const win = v.style === 'scandi' ? { color: '#f2f2ee', ral: 'RAL 9016' }
    : dark ? { color: '#383e42', ral: 'RAL 7016' } : { color: '#4c2f27', ral: 'RAL 8016' };
  const door = dark ? { color: '#2f3336', ral: 'RAL 7021', name: 'Металлические' } : { color: '#6b4a32', ral: 'RAL 8017', name: 'Металлические, отделка под дерево' };
  return { wall, roof, win, door, plinth: { color: '#8f8c86', ral: 'RAL 7037', name: 'Облицовка камнем' } };
}

// Узоры для заливок — в единицах листа при масштабе k (мм листа на 1 м)
function defs(P, k, f) {
  const w = f.wall, rf = f.roof;
  const o = [];
  o.push(`<pattern id="${P}h" patternUnits="userSpaceOnUse" width="1.4" height="1.4" patternTransform="rotate(45)"><rect width="1.4" height="1.4" fill="#fff"/><line x1="0" y1="0" x2="0" y2="1.4" stroke="${INK}" stroke-width="0.22"/></pattern>`);
  o.push(`<pattern id="${P}c" patternUnits="userSpaceOnUse" width="3" height="3"><rect width="3" height="3" fill="#f1f1ef"/><circle cx="0.7" cy="0.8" r="0.18" fill="#777"/><circle cx="2.1" cy="2.2" r="0.14" fill="#777"/><path d="M1.6 0.6 l0.5 0.6 h-1z" fill="none" stroke="#777" stroke-width="0.12"/></pattern>`);
  o.push(`<pattern id="${P}i" patternUnits="userSpaceOnUse" width="2.4" height="2.4"><rect width="2.4" height="2.4" fill="#fbf5df"/><path d="M0 1.2 q0.6 -1 1.2 0 t1.2 0" fill="none" stroke="#b9a979" stroke-width="0.15"/></pattern>`);
  const u = k; // мм листа на метр
  if (w.tex === 'brick') {
    const bw = 0.25 * u, bh = 0.075 * u;
    o.push(`<pattern id="${P}w" patternUnits="userSpaceOnUse" width="${r2(bw)}" height="${r2(bh * 2)}"><rect width="${r2(bw)}" height="${r2(bh * 2)}" fill="${w.mortar}"/><rect x="0.06" y="0.06" width="${r2(bw - 0.12)}" height="${r2(bh - 0.12)}" fill="${w.color}"/><rect x="${r2(-bw / 2 + 0.06)}" y="${r2(bh + 0.06)}" width="${r2(bw - 0.12)}" height="${r2(bh - 0.12)}" fill="${w.color}"/><rect x="${r2(bw / 2 + 0.06)}" y="${r2(bh + 0.06)}" width="${r2(bw - 0.12)}" height="${r2(bh - 0.12)}" fill="${w.color}" opacity="0.9"/></pattern>`);
  } else if (w.tex === 'siding') {
    const sh = 0.2 * u;
    o.push(`<pattern id="${P}w" patternUnits="userSpaceOnUse" width="10" height="${r2(sh)}"><rect width="10" height="${r2(sh)}" fill="${w.color}"/><rect y="${r2(sh * 0.8)}" width="10" height="${r2(sh * 0.2)}" fill="#000" opacity="0.08"/><line x1="0" y1="${r2(sh - 0.05)}" x2="10" y2="${r2(sh - 0.05)}" stroke="#000" stroke-opacity="0.35" stroke-width="0.1"/></pattern>`);
  } else if (w.tex === 'battens') {
    const bw = 0.2 * u;
    o.push(`<pattern id="${P}w" patternUnits="userSpaceOnUse" width="${r2(bw)}" height="10"><rect width="${r2(bw)}" height="10" fill="${w.color}"/><rect width="${r2(bw * 0.18)}" height="10" fill="#fff" opacity="0.08"/><line x1="${r2(bw * 0.2)}" y1="0" x2="${r2(bw * 0.2)}" y2="10" stroke="#000" stroke-opacity="0.45" stroke-width="0.1"/></pattern>`);
  } else if (w.tex === 'logs') {
    const lh = 0.22 * u;
    o.push(`<linearGradient id="${P}lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e4523"/><stop offset="0.25" stop-color="${w.color}"/><stop offset="0.5" stop-color="#c99159"/><stop offset="0.85" stop-color="#94612f"/><stop offset="1" stop-color="#5a3518"/></linearGradient>`);
    o.push(`<pattern id="${P}w" patternUnits="userSpaceOnUse" width="10" height="${r2(lh)}"><rect width="10" height="${r2(lh)}" fill="url(#${P}lg)"/></pattern>`);
  } else if (w.tex === 'concrete') {
    const pw = 2.4 * u, ph = 1.2 * u;
    o.push(`<pattern id="${P}w" patternUnits="userSpaceOnUse" width="${r2(pw)}" height="${r2(ph)}"><rect width="${r2(pw)}" height="${r2(ph)}" fill="${w.color}"/><rect width="${r2(pw)}" height="${r2(ph)}" fill="none" stroke="#000" stroke-opacity="0.18" stroke-width="0.12"/>${[[0.25, 0.3], [0.75, 0.3], [0.25, 0.7], [0.75, 0.7]].map(([a, b]) => `<circle cx="${r2(a * pw)}" cy="${r2(b * ph)}" r="${r2(0.025 * u)}" fill="#000" opacity="0.25"/>`).join('')}</pattern>`);
  } else {
    o.push(`<pattern id="${P}w" patternUnits="userSpaceOnUse" width="6" height="6"><rect width="6" height="6" fill="${w.color}"/><circle cx="1" cy="1.5" r="0.12" fill="#000" opacity="0.06"/><circle cx="4" cy="4.2" r="0.15" fill="#fff" opacity="0.25"/><circle cx="3.2" cy="0.8" r="0.1" fill="#000" opacity="0.05"/></pattern>`);
  }
  if (rf.tex === 'tile') {
    const tw = 0.3 * u, th = 0.36 * u;
    o.push(`<pattern id="${P}r" patternUnits="userSpaceOnUse" width="${r2(tw)}" height="${r2(th)}"><rect width="${r2(tw)}" height="${r2(th)}" fill="${rf.color}"/><path d="M0 ${r2(th)} Q${r2(tw / 2)} ${r2(th * 0.55)} ${r2(tw)} ${r2(th)}" fill="#000" opacity="0.28"/><rect width="${r2(tw * 0.12)}" height="${r2(th)}" fill="#000" opacity="0.12"/><rect x="${r2(tw * 0.45)}" width="${r2(tw * 0.12)}" height="${r2(th)}" fill="#fff" opacity="0.1"/></pattern>`);
  } else if (rf.tex === 'seam') {
    const sw = 0.5 * u;
    o.push(`<pattern id="${P}r" patternUnits="userSpaceOnUse" width="${r2(sw)}" height="10"><rect width="${r2(sw)}" height="10" fill="${rf.color}"/><rect width="${r2(sw * 0.5)}" height="10" fill="#fff" opacity="0.04"/><line x1="0.1" y1="0" x2="0.1" y2="10" stroke="#fff" stroke-opacity="0.35" stroke-width="0.12"/><line x1="0.3" y1="0" x2="0.3" y2="10" stroke="#000" stroke-opacity="0.4" stroke-width="0.12"/></pattern>`);
  } else if (rf.tex === 'shingle') {
    const tw = 0.33 * u, th = 0.2 * u;
    o.push(`<pattern id="${P}r" patternUnits="userSpaceOnUse" width="${r2(tw)}" height="${r2(th * 2)}"><rect width="${r2(tw)}" height="${r2(th * 2)}" fill="${rf.color}"/><rect y="${r2(th - 0.25)}" width="${r2(tw)}" height="0.25" fill="#000" opacity="0.35"/><rect y="${r2(th * 2 - 0.25)}" width="${r2(tw)}" height="0.25" fill="#000" opacity="0.35"/><line x1="${r2(tw / 2)}" y1="0" x2="${r2(tw / 2)}" y2="${r2(th)}" stroke="#000" stroke-opacity="0.3" stroke-width="0.1"/><line x1="0.05" y1="${r2(th)}" x2="0.05" y2="${r2(th * 2)}" stroke="#000" stroke-opacity="0.3" stroke-width="0.1"/></pattern>`);
  } else {
    o.push(`<pattern id="${P}r" patternUnits="userSpaceOnUse" width="6" height="6"><rect width="6" height="6" fill="${rf.color}"/><circle cx="2" cy="2" r="0.15" fill="#000" opacity="0.08"/></pattern>`);
  }
  o.push(`<linearGradient id="${P}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d8e4"/><stop offset="0.5" stop-color="#7f97aa"/><stop offset="1" stop-color="#3c4d5b"/></linearGradient>`);
  o.push(`<linearGradient id="${P}sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.28"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>`);
  return `<defs>${o.join('')}</defs>`;
}

/* ------------------------------------------- оси, проёмы, связи комнат */

const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'И', 'К', 'Л'];
const near = (a, b, t = 0.06) => Math.abs(a - b) < t;

// Разбивочные оси по наружным стенам и главным перегородкам 1 этажа
function axes(v) {
  const rects = v.levels[0].rects;
  const pick = (cands, total) => {
    const sup = new Map();
    cands.forEach(([p, len]) => {
      if (p < 1.5 || p > total - 1.5) return;
      const key = Math.round(p * 10) / 10;
      sup.set(key, (sup.get(key) || 0) + len);
    });
    const list = [...sup.entries()].sort((a, b) => b[1] - a[1]);
    const out = [];
    for (const [p] of list) {
      if (out.length >= 3) break;
      if (out.every(q => Math.abs(q - p) > 2.2)) out.push(p);
    }
    return [0, ...out.sort((a, b) => a - b), total];
  };
  const xs = pick(rects.flatMap(r => [[r.x, r.h], [r.x + r.w, r.h]]), v.W);
  const ys = pick(rects.flatMap(r => [[r.y, r.w], [r.y + r.h, r.w]]), v.L);
  return { xs, ys, xl: xs.map((_, i) => String(i + 1)), yl: ys.map((_, i) => LETTERS[ys.length - 1 - i]) };
}

const LIVE = new Set(['bed', 'master', 'living', 'lounge', 'kitchen', 'cabinet']);
const WET = new Set(['bath', 'wc', 'boiler', 'laundry']);

// Окна и входная дверь на уровне idx: side — front/back/left/right, pos — центр вдоль стены (м)
function openings(v, idx) {
  const lv = v.levels[idx];
  const W = v.W, L = v.L, out = [];
  const gableSides = gables(v);
  lv.rects.forEach(r => {
    const kind = LIVE.has(r.k) ? 'win' : WET.has(r.k) ? 'small' : r.k === 'stairs' ? 'stair' : r.k === 'hall' ? 'hall' : null;
    if (!kind) return;
    let edges = [];
    if (near(r.y + r.h, L)) edges.push(['front', r.x, r.x + r.w]);
    if (near(r.y, 0)) edges.push(['back', r.x, r.x + r.w]);
    if (near(r.x, 0)) edges.push(['left', r.y, r.y + r.h]);
    if (near(r.x + r.w, W)) edges.push(['right', r.y, r.y + r.h]);
    if (idx === 0 && v.garage) edges = edges.filter(([s, a, b]) => !(s === 'right' && Math.min(b, L) - Math.max(a, L - v.gd) > 0.5));
    if (kind === 'hall') {
      if (idx !== 0) return;
      const e = edges.find(x => x[0] === 'front') || edges[0];
      if (e) out.push({ side: e[0], pos: (e[1] + e[2]) / 2, w: 1.0, kind: 'door', room: r });
      return;
    }
    const take = kind === 'win' ? 2 : 1;
    edges.slice(0, take).forEach(([side, a, b]) => {
      const len = b - a;
      if (len < 1.1) return;
      const roofWin = lv.attic && !gableSides.includes(side);
      let w;
      if (kind === 'small') w = 0.6;
      else if (kind === 'stair') w = Math.min(1.0, len - 0.6);
      else if (r.k === 'living' || r.k === 'lounge') w = Math.min(len - 0.8, v.style === 'modern' || v.style === 'hitech' ? 2.4 : 1.8);
      else w = Math.min(len - 0.8, 1.5);
      if (w < 0.5) return;
      if ((r.k === 'living' || r.k === 'lounge') && len > 6.5 && !roofWin) {
        [a + len / 3, a + 2 * len / 3].forEach(pos => out.push({ side, pos, w: Math.min(w, 1.6), kind: 'win', room: r }));
      } else out.push({ side, pos: (a + b) / 2, w, kind: roofWin ? 'roof' : kind === 'stair' ? 'win' : kind, room: r });
    });
  });
  return out;
}

// Стороны плана, где у скатной кровли фронтоны
function gables(v) {
  if (v.roof !== 'gable' && v.roof !== 'mansard') return [];
  return v.geo.ridgeAlongZ ? ['front', 'back'] : ['left', 'right'];
}
const ridgeAlongY = v => (v.roof === 'hip' ? v.L > v.W : v.geo.ridgeAlongZ);

// Внутренние двери: каждая комната — к коридору, холлу или общей зоне
function doorsOf(lv) {
  const out = [];
  const pri = n => ({ corridor: 4, hallup: 4, hall: 3, living: 2, lounge: 2, stairs: 1 }[n.k] || 0);
  lv.rects.forEach(r => {
    if (['corridor', 'hallup', 'stairs'].includes(r.k)) return;
    let best = null;
    lv.rects.forEach(n => {
      if (n === r) return;
      const p = pri(n);
      if (!p && !(r.k === 'hall')) return;
      if (r.k === 'hall' && !['corridor', 'living', 'lounge', 'stairs'].includes(n.k)) return;
      let e = null;
      const ox = [Math.max(r.x, n.x), Math.min(r.x + r.w, n.x + n.w)];
      const oy = [Math.max(r.y, n.y), Math.min(r.y + r.h, n.y + n.h)];
      if (near(r.y + r.h, n.y) && ox[1] - ox[0] > 1) e = { o: 'h', at: r.y + r.h, a: ox[0], b: ox[1], into: -1 };
      else if (near(r.y, n.y + n.h) && ox[1] - ox[0] > 1) e = { o: 'h', at: r.y, a: ox[0], b: ox[1], into: 1 };
      else if (near(r.x + r.w, n.x) && oy[1] - oy[0] > 1) e = { o: 'v', at: r.x + r.w, a: oy[0], b: oy[1], into: -1 };
      else if (near(r.x, n.x + n.w) && oy[1] - oy[0] > 1) e = { o: 'v', at: r.x, a: oy[0], b: oy[1], into: 1 };
      if (e && (!best || p > best.p)) best = { ...e, p, open: (r.k === 'living' || r.k === 'lounge' || r.k === 'hall') && n.k !== 'corridor' };
    });
    if (best) out.push({ ...best, w: r.k === 'bath' || r.k === 'wc' ? 0.7 : best.open ? 1.2 : 0.8 });
  });
  return out;
}

/* --------------------------------------------------------- рамка, штамп */

function frame(P, n, total, title, extra = '') {
  const o = [];
  o.push(R(0, 0, SW, SH, { fill: '#fff' }));
  o.push(R(20, 5, SW - 25, SH - 10, { stroke: INK, sw: 0.5 }));
  o.push(stamp(n, total, title));
  o.push(extra);
  return o.join('');
}

function stamp(n, total, title) {
  const x = SW - 5 - 185, y = SH - 5 - 55;
  const o = [R(x, y, 185, 55, { fill: '#fff', stroke: INK, sw: 0.5 })];
  const cols = [7, 10, 10, 12, 15, 11];
  let cx = x;
  cols.forEach(w => { cx += w; o.push(L(cx, y, cx, y + 30, 0.2)); });
  for (let i = 1; i < 11; i++) o.push(L(x, y + i * 5, x + 65, y + i * 5, i === 6 ? 0.4 : 0.15));
  ['Изм.', 'Кол.уч', 'Лист', '№ док.', 'Подпись', 'Дата'].reduce((acc, s, i) => { o.push(T(acc + cols[i] / 2, y + 28.9, s, { size: 1.9, anchor: 'middle' })); return acc + cols[i]; }, x);
  o.push(L(x + 25, y + 30, x + 25, y + 55, 0.2));
  [['Разработал', 1], ['Проверил', 2], ['ГИП', 3], ['Н. контр.', 4]].forEach(([s, i]) => o.push(T(x + 1, y + 30 + i * 5 - 1.3, s, { size: 1.9 })));
  o.push(L(x + 65, y, x + 65, y + 55, 0.5));
  o.push(L(x + 65, y + 15, x + 185, y + 15, 0.4));
  o.push(T(x + 125, y + 6, 'Индивидуальный жилой дом', { size: 2.8, anchor: 'middle' }));
  const addr = C.address ? 'по адресу: ' + C.address : 'Эскизный проект (онлайн-конструктор)';
  o.push(T(x + 125, y + 11, addr.length > 70 ? addr.slice(0, 68) + '…' : addr, { size: 2.3, anchor: 'middle' }));
  o.push(L(x + 135, y + 15, x + 135, y + 55, 0.4));
  o.push(L(x + 135, y + 20, x + 185, y + 20, 0.2));
  o.push(L(x + 135, y + 25, x + 185, y + 25, 0.4));
  o.push(L(x + 150, y + 15, x + 150, y + 25, 0.2));
  o.push(L(x + 165, y + 15, x + 165, y + 25, 0.2));
  [['Стадия', 142.5], ['Лист', 157.5], ['Листов', 175]].forEach(([s, dx]) => o.push(T(x + dx, y + 18.8, s, { size: 2, anchor: 'middle' })));
  [['ЭП', 142.5], [String(n), 157.5], [String(total), 175]].forEach(([s, dx]) => o.push(T(x + dx, y + 23.8, s, { size: 2.6, anchor: 'middle' })));
  const tl = wrap(title, 30);
  tl.forEach((s, i) => o.push(T(x + 100, y + 35 - (tl.length - 1) * 2.4 + i * 4.8, s, { size: 3.4, anchor: 'middle' })));
  o.push(T(x + 160, y + 36, 'ТОО «СВОЙ ПРОЕКТ»', { size: 2.7, anchor: 'middle', weight: 700 }));
  o.push(T(x + 160, y + 41, 'г. Астана', { size: 2.2, anchor: 'middle' }));
  o.push(T(x + 160, y + 45.5, '+7 (775) 555-74-75', { size: 2.2, anchor: 'middle' }));
  o.push(T(x + 160, y + 50, 'svoyproect.kz', { size: 2.2, anchor: 'middle' }));
  return o.join('');
}

function wrap(s, n) {
  const words = s.split(' '), out = [];
  let cur = '';
  words.forEach(w => { if ((cur + ' ' + w).trim().length > n && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
  if (cur) out.push(cur);
  return out;
}

function watermark() {
  const o = [];
  for (let y = 30; y < SH; y += 62) {
    for (let x = -40; x < SW; x += 150) {
      o.push(`<text x="${x + (y / 62 % 2) * 75}" y="${y}" font-size="11" font-weight="700" fill="#2f7fd1" opacity="0.09" transform="rotate(-24 ${x} ${y})">ОБРАЗЕЦ · svoyproect.kz · +7 775 555-74-75</text>`);
    }
  }
  return `<g pointer-events="none">${o.join('')}</g>`;
}

function svgWrap(inner, P, k, f) {
  return `<svg viewBox="0 0 ${SW} ${SH}" xmlns="http://www.w3.org/2000/svg" font-family="${FONT}" fill="${INK}">${defs(P, k, f)}${inner}${watermark()}</svg>`;
}

const SCALES = [50, 100, 150, 200, 250, 500, 1000];
function fitScale(wm, hm, wmm, hmm, min = 100) {
  for (const s of SCALES) {
    if (s < min) continue;
    const k = 1000 / s;
    if (wm * k <= wmm && hm * k <= hmm) return { s, k };
  }
  return { s: 1000, k: 1 };
}

/* --------------------------------------------------------------- фасады */

// Модель вида фасада: длина стены, отображение позиций плана, кровля
function viewModel(v, view) {
  const W = v.W, L = v.L, g = v.geo, PL0 = C.PLINTH;
  const e = g.wallTop - PL0, h = g.h, o = g.over;
  const along = view === 'front' || view === 'back' ? 'x' : 'y';
  const Wv = along === 'x' ? W : L;
  const map = {
    front: p => p, back: p => W - p, left: p => p, right: p => L - p
  }[view];
  const rY = ridgeAlongY(v);
  let roof;
  if (v.roof === 'flat') roof = { type: o === 0 ? 'parapet' : 'slab' };
  else if (v.roof === 'shed') {
    roof = { type: view === 'front' ? 'shedLow' : view === 'back' ? 'shedHigh' : 'shedSide', highAt: view === 'left' ? 0 : Wv };
  } else {
    const parallel = (along === 'x') !== rY;
    const span = v.roof === 'hip' ? Math.min(W, L) : rY ? W : L;
    const ks = h / (span / 2);
    if (v.roof === 'hip') roof = parallel ? { type: 'hipBand', r: Math.max(0, (Wv - span) / 2), ks } : { type: 'hipTri', ks };
    else roof = parallel ? { type: 'band', ks } : { type: 'tri', ks };
  }
  return { W, L, e, h, o, Wv, map, roof, along };
}

function elevation(v, view, k, ox, oy, pf, f, opt = {}) {
  const m = viewModel(v, view);
  const { e, h, o, Wv, roof } = m;
  const g0 = -C.PLINTH;
  const X = u => ox + u * k, Y = z => oy - z * k;
  const o2 = [];
  const wallFill = `url(#${pf}w)`, roofFill = `url(#${pf}r)`;
  const rc = f.roof.color;
  const G = C.GARAGE_W, gd = v.gd, gt = g0 + 3.15;
  const tw = Math.min(v.W * 0.7, 7), TD = C.TERRACE_D;
  const porch = ['classic', 'scandi', 'chalet'].includes(v.style);
  const shade = (x, y, w, hh) => R(X(x), Y(y + hh), w * k, hh * k, { fill: `url(#${pf}sh)` });

  // гараж за домом (виден сбоку от дома на фасадах вдоль x)
  const garageSide = () => {
    if (!v.garage) return '';
    const s = [];
    const u0 = view === 'front' ? Wv : -G;
    s.push(R(X(u0), Y(gt), G * k, (gt - g0) * k, { fill: wallFill, stroke: INK, sw: 0.25 }));
    if (view === 'front') {
      s.push(R(X(u0 + (G - 2.7) / 2), Y(g0 + 2.25), 2.7 * k, 2.25 * k, { fill: f.win.color === '#f2f2ee' ? '#e9e9e4' : '#d8d9d6', stroke: INK, sw: 0.2 }));
      for (let i = 1; i < 5; i++) s.push(L(X(u0 + (G - 2.7) / 2), Y(g0 + i * 0.45), X(u0 + (G + 2.7) / 2), Y(g0 + i * 0.45), 0.12, '#8a8f94'));
    }
    if (v.style === 'modern' || v.style === 'hitech' || v.roof === 'flat') {
      s.push(R(X(u0 - 0.2), Y(gt + 0.3), (G + 0.4) * k, 0.3 * k, { fill: '#33373b', stroke: INK, sw: 0.2 }));
    } else {
      const hi = gt + 0.55, ov = 0.35;
      const pts = view === 'front' ? [[Wv, hi], [Wv + G + ov, gt - 0.1], [Wv + G + ov, gt - 0.3], [Wv, hi - 0.25]] : [[0, hi], [-G - ov, gt - 0.1], [-G - ov, gt - 0.3], [0, hi - 0.25]];
      s.push(P(pts.map(([a, b]) => [X(a), Y(b)]), { fill: roofFill, stroke: INK, sw: 0.2 }));
    }
    return s.join('');
  };

  if (v.garage && (view === 'front' || view === 'back')) o2.push(garageSide());

  // стена и цоколь
  if (roof.type === 'shedSide') {
    const hiU = roof.highAt;
    const top = u => e + h * (1 - Math.abs(u - hiU) / Wv);
    o2.push(P([[X(0), Y(0)], [X(Wv), Y(0)], [X(Wv), Y(top(Wv))], [X(0), Y(top(0))]], { fill: wallFill, stroke: INK, sw: 0.3 }));
  } else {
    const top = roof.type === 'shedHigh' ? e + h : roof.type === 'parapet' ? e + 0.6 : e;
    o2.push(R(X(0), Y(top), Wv * k, top * k, { fill: wallFill, stroke: INK, sw: 0.3 }));
    if (roof.type === 'parapet') o2.push(R(X(-0.05), Y(top + 0.06), (Wv + 0.1) * k, 0.06 * k, { fill: '#a6abb0', stroke: INK, sw: 0.15 }));
  }
  o2.push(R(X(-0.05), Y(0), (Wv + 0.1) * k, -g0 * k, { fill: f.plinth.color, stroke: INK, sw: 0.25 }));
  o2.push(L(X(-0.05), Y(-0.25), X(Wv + 0.05), Y(-0.25), 0.1, '#5f5c57'));
  if (v.floors >= 2 && ['classic', 'chalet', 'scandi'].includes(v.style)) {
    for (let i = 1; i < v.floors; i++) o2.push(R(X(-0.04), Y(i * C.FLOOR_H + 0.08), (Wv + 0.08) * k, 0.16 * k, { fill: '#f1ece2', stroke: INK, sw: 0.12 }));
  }

  // кровля
  const eL = s => e - o * s;
  if (roof.type === 'band') {
    o2.push(shade(0, e - 0.5, Wv, 0.5));
    o2.push(P([[X(-o), Y(eL(roof.ks))], [X(Wv + o), Y(eL(roof.ks))], [X(Wv + o), Y(e + h)], [X(-o), Y(e + h)]], { fill: roofFill, stroke: INK, sw: 0.3 }));
    o2.push(R(X(-o), Y(e + h + 0.12), (Wv + 2 * o) * k, 0.12 * k, { fill: '#2b2b2b' }));
    o2.push(R(X(-o - 0.05), Y(eL(roof.ks)), (Wv + 2 * o + 0.1) * k, 0.2 * k, { fill: '#3a3a3a' }));
  } else if (roof.type === 'hipBand') {
    o2.push(shade(0, e - 0.5, Wv, 0.5));
    const c = Wv / 2;
    o2.push(P([[X(-o), Y(eL(roof.ks))], [X(Wv + o), Y(eL(roof.ks))], [X(c + roof.r), Y(e + h)], [X(c - roof.r), Y(e + h)]], { fill: roofFill, stroke: INK, sw: 0.3 }));
    o2.push(R(X(-o - 0.05), Y(eL(roof.ks)), (Wv + 2 * o + 0.1) * k, 0.2 * k, { fill: '#3a3a3a' }));
  } else if (roof.type === 'tri') {
    o2.push(P([[X(0), Y(e)], [X(Wv), Y(e)], [X(Wv / 2), Y(e + h)]], { fill: wallFill, stroke: INK, sw: 0.3 }));
    o2.push(P([[X(0), Y(e)], [X(Wv / 2), Y(e + h)], [X(Wv), Y(e)], [X(Wv), Y(e + 0.35)], [X(Wv / 2), Y(e + h + 0.35)], [X(0), Y(e + 0.35)]], { fill: `url(#${pf}sh)`, op: 0.6 }));
    const t = 0.32;
    o2.push(P([[X(-o), Y(eL(roof.ks))], [X(Wv / 2), Y(e + h)], [X(Wv + o), Y(eL(roof.ks))], [X(Wv + o), Y(eL(roof.ks) + t)], [X(Wv / 2), Y(e + h + t)], [X(-o), Y(eL(roof.ks) + t)]], { fill: '#2f2f2f', stroke: INK, sw: 0.2 }));
  } else if (roof.type === 'hipTri') {
    o2.push(shade(0, e - 0.5, Wv, 0.5));
    o2.push(P([[X(-o), Y(eL(roof.ks))], [X(Wv + o), Y(eL(roof.ks))], [X(Wv / 2), Y(e + h)]], { fill: roofFill, stroke: INK, sw: 0.3 }));
    o2.push(P([[X(-o), Y(eL(roof.ks))], [X(Wv + o), Y(eL(roof.ks))], [X(Wv / 2), Y(e + h)]], { fill: '#000', op: 0.12 }));
    o2.push(R(X(-o - 0.05), Y(eL(roof.ks)), (Wv + 2 * o + 0.1) * k, 0.2 * k, { fill: '#3a3a3a' }));
  } else if (roof.type === 'shedLow') {
    const s = h / v.L;
    o2.push(shade(0, e - 0.5, Wv, 0.5));
    o2.push(P([[X(-o), Y(e - o * s)], [X(Wv + o), Y(e - o * s)], [X(Wv + o), Y(e + h + o * s)], [X(-o), Y(e + h + o * s)]], { fill: roofFill, stroke: INK, sw: 0.3 }));
    o2.push(R(X(-o - 0.05), Y(e - o * s), (Wv + 2 * o + 0.1) * k, 0.25 * k, { fill: '#2f2f2f' }));
  } else if (roof.type === 'shedHigh') {
    o2.push(R(X(-o), Y(e + h + 0.3), (Wv + 2 * o) * k, 0.3 * k, { fill: '#2f2f2f', stroke: INK, sw: 0.2 }));
    o2.push(shade(0, e + h - 0.4, Wv, 0.4));
  } else if (roof.type === 'shedSide') {
    const hiU = roof.highAt, s = h / Wv;
    const ext = u => (u === hiU ? (hiU === 0 ? -o : Wv + o) : (hiU === 0 ? Wv + o : -o));
    const a = ext(hiU), b = ext(hiU === 0 ? Wv : 0);
    const za = e + h + o * s, zb = e - o * s;
    o2.push(P([[X(a), Y(za)], [X(b), Y(zb)], [X(b), Y(zb + 0.3)], [X(a), Y(za + 0.3)]], { fill: '#2f2f2f', stroke: INK, sw: 0.2 }));
  } else if (roof.type === 'slab') {
    o2.push(shade(0, e - 0.5, Wv, 0.5));
    o2.push(R(X(-o), Y(e + 0.35), (Wv + 2 * o) * k, 0.35 * k, { fill: '#33373b', stroke: INK, sw: 0.25 }));
  }

  // окна и двери
  const levels = v.levels.length;
  const winH = (w, kind) => (kind === 'small' ? [1.45, 0.6] : (v.style === 'modern' || v.style === 'hitech') && w >= 2 ? [0.3, 2.2] : [0.85, 1.45]);
  for (let i = 0; i < levels; i++) {
    const base = i * C.FLOOR_H;
    const attic = v.levels[i].attic;
    openings(v, i).filter(op => op.side === view).forEach(op => {
      const u = m.map(op.pos);
      if (op.kind === 'door') {
        o2.push(R(X(u - 0.6), Y(2.35), 1.2 * k, 2.35 * k, { fill: '#e9e4da', stroke: INK, sw: 0.2 }));
        o2.push(R(X(u - 0.5), Y(2.25), 1.0 * k, 2.25 * k, { fill: f.door.color, stroke: INK, sw: 0.25 }));
        o2.push(R(X(u - 0.38), Y(2.05), 0.76 * k, 0.5 * k, { fill: '#000', op: 0.12 }));
        o2.push(R(X(u - 0.38), Y(1.35), 0.76 * k, 1.1 * k, { fill: '#000', op: 0.12 }));
        o2.push(R(X(u + 0.3), Y(1.1), 0.05 * k, 0.25 * k, { fill: '#d6c38f' }));
        for (let s = 0; s < 3; s++) o2.push(R(X(u - 0.8 - s * 0.15), Y(-s * 0.17), (1.6 + s * 0.3) * k, 0.17 * k, { fill: '#b9b4ab', stroke: INK, sw: 0.12 }));
        return;
      }
      if (op.kind === 'roof') {
        if (roof.type === 'band' || roof.type === 'hipBand') {
          o2.push(R(X(u - 0.45), Y(e + 1.9), 0.9 * k, 1.1 * k, { fill: `url(#${pf}g)`, stroke: '#222', sw: 0.35 }));
        }
        return;
      }
      const [sill, wh] = winH(op.w, op.kind);
      const zb = base + (attic ? 0.9 : sill), zt = zb + wh;
      if (roof.type === 'tri' && attic) {
        // окно во фронтоне не должно выходить за скаты
        const lim = e + h * (1 - Math.abs(u - Wv / 2) / (Wv / 2)) - 0.3;
        if (zt > lim) return;
      }
      if (!attic && zt > e - 0.15 && !['shedHigh', 'shedSide', 'parapet'].includes(roof.type)) return;
      o2.push(R(X(u - op.w / 2 - 0.06), Y(zt + 0.06), (op.w + 0.12) * k, (wh + 0.12) * k, { fill: f.win.color, stroke: INK, sw: 0.2 }));
      o2.push(R(X(u - op.w / 2 + 0.03), Y(zt - 0.03), (op.w - 0.06) * k, (wh - 0.06) * k, { fill: `url(#${pf}g)` }));
      if (op.w > 0.9) o2.push(R(X(u - 0.03), Y(zt), 0.06 * k, wh * k, { fill: f.win.color }));
      if (wh > 1.3 && v.style !== 'modern' && v.style !== 'hitech') o2.push(R(X(u - op.w / 2), Y(zb + wh * 0.68), op.w * k, 0.05 * k, { fill: f.win.color }));
      o2.push(R(X(u - op.w / 2 - 0.12), Y(zb), (op.w + 0.24) * k, 0.06 * k, { fill: '#e6e2da', stroke: INK, sw: 0.1 }));
      o2.push(R(X(u - op.w / 2 + 0.03), Y(zt - 0.03), (op.w - 0.06) * k, 0.12 * k, { fill: '#000', op: 0.2 }));
    });
  }

  // гараж перед правой стеной
  if (v.garage && view === 'right') {
    o2.push(R(X(0), Y(gt), gd * k, (gt - g0) * k, { fill: wallFill, stroke: INK, sw: 0.3 }));
    o2.push(R(X(-0.2), Y(gt + 0.3), (gd + 0.4) * k, 0.3 * k, { fill: v.style === 'modern' || v.style === 'hitech' || v.roof === 'flat' ? '#33373b' : roofFill, stroke: INK, sw: 0.2 }));
    o2.push(R(X(gd / 2 - 0.5), Y(g0 + 2.2), 1.0 * k, 0.6 * k, { fill: f.win.color, stroke: INK, sw: 0.15 }));
  }

  // терраса / крыльцо
  if (v.terrace) {
    let u0, u1;
    if (view === 'front') { u0 = Wv / 2 - tw / 2; u1 = Wv / 2 + tw / 2; }
    else if (view === 'left') { u0 = v.L; u1 = v.L + TD; }
    else if (view === 'right') { u0 = -TD; u1 = 0; }
    if (u0 != null) {
      o2.push(R(X(u0), Y(0), (u1 - u0) * k, -g0 * k, { fill: '#8d8a84', stroke: INK, sw: 0.2 }));
      o2.push(R(X(u0 - 0.03), Y(0.05), (u1 - u0 + 0.06) * k, 0.07 * k, { fill: '#9a6a3e' }));
      if (porch) {
        const ph = 2.75;
        const posts = view === 'front' ? [u0 + 0.1, u1 - 0.25] : [view === 'left' ? u1 - 0.25 : u0 + 0.1];
        posts.forEach(px => o2.push(R(X(px), Y(ph), 0.15 * k, ph * k, { fill: '#f3f1ec', stroke: INK, sw: 0.15 })));
        const railTop = 0.95;
        o2.push(R(X(u0), Y(railTop), (u1 - u0) * k, 0.05 * k, { fill: '#f3f1ec', stroke: INK, sw: 0.1 }));
        for (let x = u0 + 0.15; x < u1 - 0.1; x += 0.15) o2.push(L(X(x), Y(0.1), X(x), Y(railTop), 0.25, '#e8e5de'));
        if (view === 'front') o2.push(R(X(u0 - 0.3), Y(ph + 0.4), (u1 - u0 + 0.6) * k, 0.4 * k, { fill: roofFill, stroke: INK, sw: 0.2 }));
        else {
          const wallU = view === 'left' ? u0 : u1, outU = view === 'left' ? u1 + 0.3 : u0 - 0.3;
          o2.push(P([[X(wallU), Y(ph + 0.5)], [X(outU), Y(ph + 0.05)], [X(outU), Y(ph - 0.12)], [X(wallU), Y(ph + 0.32)]], { fill: '#2f2f2f', stroke: INK, sw: 0.15 }));
        }
      }
    }
  }

  // земля
  if (!opt.thumb) { const ex = viewExtent(v, view); o2.push(L(X(ex.a - 1.5), Y(g0), X(ex.b + 1.5), Y(g0), 0.6)); }
  return o2.join('');
}

// Габарит вида по горизонтали (м): начало, конец; высота над ±0
function viewExtent(v, view) {
  const m = viewModel(v, view);
  let a = -m.o - 0.4, b = m.Wv + m.o + 0.4;
  if (v.garage && view === 'front') b = Math.max(b, m.Wv + C.GARAGE_W + 0.5);
  if (v.garage && view === 'back') a = Math.min(a, -C.GARAGE_W - 0.5);
  if (v.terrace && view === 'left') b = Math.max(b, v.L + C.TERRACE_D + 0.4);
  if (v.terrace && view === 'right') a = Math.min(a, -C.TERRACE_D - 0.4);
  const top = v.geo.height - C.PLINTH + 0.4;
  return { a, b, top };
}

function facadeTitle(v, view, ax) {
  const n = ax.xl.length;
  const name = { front: `1–${n}`, back: `${n}–1`, right: `${ax.yl[0]}–${ax.yl[ax.yl.length - 1]}`, left: `${ax.yl[ax.yl.length - 1]}–${ax.yl[0]}` }[view];
  return `Фасад ${name}`;
}

/* ------------------------------------------------------------ листы */

export function facadeThumb(v) {
  const P = 'f' + (uid++);
  const f = finish(v);
  const ex = viewExtent(v, 'front');
  const k = 10;
  const w = (ex.b - ex.a) * k, hh = (ex.top + C.PLINTH + 0.4) * k;
  const ox = -ex.a * k, oy = (ex.top + 0.2) * k;
  return `<svg viewBox="0 0 ${r2(w)} ${r2(hh)}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">${defs(P, k, f)}<rect x="0" y="${r2(oy + C.PLINTH * k)}" width="${r2(w)}" height="${r2(hh)}" fill="#b9cf9f"/>${elevation(v, 'front', k, ox, oy, P, f, { thumb: true })}</svg>`;
}

function sheetTitle(v, n, total) {
  const o = [];
  o.push(R(0, 0, SW, SH, { fill: '#fff' }));
  o.push(R(20, 5, SW - 25, SH - 10, { stroke: INK, sw: 0.5 }));
  o.push(R(282, 10, 3, SH - 20, { fill: '#7fb7b8' }));
  o.push(T(292, 22, 'Согласовано:', { size: 3.4, deco: 'underline' }));
  o.push(T(292, 30, 'ГУ «Управление архитектуры,', { size: 3.2 }));
  o.push(T(292, 35, 'градостроительства и земельных', { size: 3.2 }));
  o.push(T(292, 40, 'отношений»', { size: 3.2 }));
  o.push(L(292, 52, 410, 52, 0.3));
  o.push(T(292, 128, 'Заказчик:', { size: 3.4, deco: 'underline' }));
  o.push(T(292, 135, C.customer || '______________________________', { size: 3.4 }));
  o.push(L(292, 142, 410, 142, 0.3));
  o.push(T(292, 248, 'Исполнитель:', { size: 3.4, deco: 'underline' }));
  ['ТОО «СВОЙ ПРОЕКТ»', 'г. Астана, пр. Тәуелсіздік, 22А', 'make6265@gmail.com', 'тел.: +7 (775) 555-74-75'].forEach((s, i) => o.push(T(292, 255 + i * 5.5, s, { size: 3.2 })));
  o.push(T(150, 120, 'ЭСКИЗНЫЙ ПРОЕКТ', { size: 12, anchor: 'middle', weight: 700, deco: 'underline' }));
  o.push(T(150, 138, 'Индивидуальный жилой дом', { size: 5.2, anchor: 'middle', weight: 700 }));
  wrap(C.address ? 'по адресу: ' + C.address : `${C.floorsName(v.floors)}, ${num(v.W)} × ${num(v.L)} м, общая площадь ≈ ${num(v.total)} м²`, 70)
    .forEach((s, i) => o.push(T(150, 146 + i * 6, s, { size: 4.4, anchor: 'middle' })));
  o.push(T(150, 280, `Астана ${new Date().getFullYear()}`, { size: 4.2, anchor: 'middle', deco: 'underline' }));
  return o.join('');
}

function areas(v) {
  const live = v.levels.reduce((s, lv) => s + lv.rects.filter(r => ['bed', 'master', 'living', 'lounge', 'cabinet'].includes(r.k)).reduce((a, r) => a + r.net, 0), 0);
  const height = v.geo.height - C.PLINTH;
  const volume = v.W * v.L * (v.geo.wallTop - C.PLINTH + v.geo.h / 2) + (v.garage ? C.GARAGE_W * v.gd * 3 : 0);
  return { live, height, volume };
}

function siteAreas(v) {
  const pos = C.placement(v);
  const hb = pos.rects.reduce((a, r) => ({ x0: Math.min(a.x0, r.x0), x1: Math.max(a.x1, r.x1), z0: Math.min(a.z0, r.z0), z1: Math.max(a.z1, r.z1) }), { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 });
  const blind = (hb.x1 - hb.x0 + 2) * (hb.z1 - hb.z0 + 2) - (hb.x1 - hb.x0) * (hb.z1 - hb.z0);
  let paths = 0;
  if (!pos.rot) {
    paths += 1.4 * Math.max(0, v.plot.l / 2 - hb.z1 - 1);
    if (v.garage) { const gr = pos.rects.find(r => r.k === 'garage'); paths += 3.3 * Math.max(0, v.plot.l / 2 - gr.z1 - 1); }
  }
  const terrace = v.terrace ? Math.min(v.W * 0.7, 7) * C.TERRACE_D : 0;
  const paving = blind + paths;
  return { pos, paving, built: v.built + terrace, green: Math.max(0, v.plot.area - v.built - terrace - paving) };
}

function sheetGeneral(v, list) {
  const o = [];
  const a = areas(v), s = siteAreas(v);
  const f = finish(v);
  const floors = { 1: 'одноэтажный', 1.5: 'одноэтажный с мансардой', 2: 'двухэтажный', 3: 'трёхэтажный' }[v.floors];
  const roofName = { gable: 'двускатная', hip: 'вальмовая', flat: 'плоская', shed: 'односкатная', mansard: 'мансардная' }[v.roof];
  const walls = { gas: 'газоблок D500 толщиной 300 мм с утеплением', brick: 'кирпич керамический', ceramic: 'керамоблок толщиной 380 мм', wood: 'клееный брус 200 мм', frame: 'деревянный каркас с утеплением минераловатными плитами 200 мм', monolith: 'монолитный железобетон с утеплением' }[v.mat];
  let y = 22;
  const line = (s2, o3 = {}) => { o.push(T(27, y, s2, { size: 3.5, ...o3 })); y += o3.gap || 5.4; };
  line('ПОЯСНИТЕЛЬНАЯ ЗАПИСКА:', { weight: 700 });
  line('Индивидуальный жилой дом', { weight: 700, italic: true });
  if (C.address) wrap('по адресу: ' + C.address, 95).forEach(s2 => line(s2, { italic: true }));
  y += 2;
  const para = s2 => { wrap(s2, 104).forEach(l2 => line(l2, { gap: 4.9 })); y += 1.6; };
  para('Данный эскизный проект определяет основные объёмно-планировочные решения объекта и архитектурное решение фасадов.');
  para(`Проектом предусмотрен ${floors} жилой дом с размерами по разбивочным осям ${num(v.W, 2)} × ${num(v.L, 2)} м${v.garage ? ' с пристроенным гаражом' : ''}${v.terrace ? ' и террасой' : ''}. Высота верхней точки кровли — ${num(a.height, 2)} м. Кровля ${roofName}.`);
  para(`Отделка фасадов — ${f.wall.name.toLowerCase()}. Цветовое решение фасадов принято в соответствии с пожеланиями заказчика.`);
  para('При дальнейшей разработке рабочих чертежей все изменения принятых в настоящем эскизном проекте решений должны быть согласованы с уполномоченным органом по делам архитектуры и авторами проекта в установленном порядке.');
  para('Эскизный проект разработан на основании задания заказчика и требований строительных норм и правил:');
  ['СН РК 3.01-02-2012 «Планировка и застройка районов индивидуального жилищного строительства»', 'СН РК 2.04-01-2011 «Естественное и искусственное освещение»', 'СН РК 4.01-01-2011 «Внутренний водопровод и канализация зданий и сооружений»', 'СН РК 4.02-01-2011 «Отопление, вентиляция и кондиционирование воздуха»', 'СН РК 2.02-01-2014 «Пожарная безопасность зданий и сооружений»', 'СН РК 1.02-03-2011 «Порядок разработки, согласования, утверждения и состав проектной документации на строительство»']
    .forEach(s2 => wrap('– ' + s2, 104).forEach(l2 => line(l2, { gap: 4.9 })));
  y += 2;
  line('КОНСТРУКТИВНОЕ РЕШЕНИЕ:', { weight: 700 });
  [`Наружные стены — ${walls}`, 'Фундамент — монолитный железобетонный ленточный', `Перекрытия — ${v.mat === 'wood' || v.mat === 'frame' ? 'деревянные по балкам' : 'сборные или монолитные железобетонные'}`, `Кровля — ${roofName}, покрытие: ${f.roof.name.toLowerCase()}`, 'Окна — металлопластиковые с двухкамерным стеклопакетом']
    .forEach(s2 => line(s2, { gap: 4.9 }));
  y += 3;
  wrap('Эскиз сформирован онлайн-конструктором svoyproect.kz и носит ознакомительный характер. Полный комплект документации разрабатывается ТОО «СВОЙ ПРОЕКТ» по заданию заказчика.', 104).forEach(l2 => line(l2, { size: 3.1, gap: 4.4, fill: '#555', italic: true }));

  // состав проекта
  const tx = 262, tw = 148;
  let ty = 12;
  o.push(R(tx, ty, tw, 7 + (list.length + 1) * 5.2, { fill: '#fff', stroke: INK, sw: 0.4 }));
  o.push(T(tx + 2, ty + 5, 'Состав проекта', { size: 3.2 }));
  ty += 7;
  o.push(L(tx, ty, tx + tw, ty, 0.3));
  o.push(L(tx + 16, ty, tx + 16, ty + (list.length + 1) * 5.2, 0.3));
  o.push(T(tx + 8, ty + 3.8, 'Номер', { size: 2.6, anchor: 'middle' }));
  o.push(T(tx + 16 + (tw - 16) / 2, ty + 3.8, 'Наименование', { size: 2.6, anchor: 'middle' }));
  list.forEach((s2, i) => {
    const yy = ty + (i + 1) * 5.2;
    o.push(L(tx, yy, tx + tw, yy, 0.15));
    o.push(T(tx + 8, yy + 3.8, i === 0 ? '' : String(i), { size: 2.6, anchor: 'middle' }));
    o.push(T(tx + 18, yy + 3.8, s2.length > 64 ? s2.slice(0, 62) + '…' : s2, { size: 2.6 }));
  });

  // ТЭП
  let py = Math.max(ty + (list.length + 1) * 5.2 + 8, 150);
  o.push(T(tx, py, 'ТЕХНИКО-ЭКОНОМИЧЕСКИЕ ПОКАЗАТЕЛИ:', { size: 2.9, weight: 700, deco: 'underline' }));
  py += 5;
  [['этажность жилого дома', String(Math.ceil(v.floors)) + (v.floors === 1.5 ? ' (с мансардой)' : '')], ['общая площадь жилого дома', num(v.total) + ' м²'], ['жилая площадь', num(a.live) + ' м²'],
    ['площадь застройки жилого дома', num(v.built) + ' м²'], ['строительный объём жилого дома', num(a.volume) + ' м³'], ['площадь участка', num(v.plot.area / 10000, 4) + ' га'],
    ['состав помещений', C.roomsLine(v)]].forEach(([k2, val]) => {
    o.push(T(tx, py, k2, { size: 2.6 }));
    const vl = wrap(val, 34);
    vl.forEach((s2, i) => o.push(T(tx + tw, py + i * 3.6, s2, { size: 2.6, anchor: 'end' })));
    py += 4.4 + (vl.length - 1) * 3.6;
  });
  return o.join('');
}

function genplan(v, nets) {
  const s = siteAreas(v), pos = s.pos;
  const pw = v.plot.w, pl = v.plot.l;
  const { s: sc, k } = fitScale(pw + 12, pl + 16, 215, 262, 200);
  const ox = 28 + (215 - (pw + 12) * k) / 2 + 6 * k, oy = 14 + (262 - (pl + 16) * k) / 2 + 6 * k;
  const X = x => ox + (x + pw / 2) * k, Y = z => oy + (z + pl / 2) * k;
  const o = [];
  o.push(R(X(-pw / 2 - 6), Y(pl / 2 + 0.5), (pw + 12) * k, 6 * k, { fill: '#e7e7e4' }));
  o.push(T(X(0), Y(pl / 2 + 4), 'УЛИЦА', { size: 2.8, anchor: 'middle', fill: '#666' }));
  o.push(R(X(-pw / 2), Y(-pl / 2), pw * k, pl * k, { fill: '#e2f0d6' }));
  // мощение: отмостка и дорожки
  const hb = pos.rects.reduce((a, r) => ({ x0: Math.min(a.x0, r.x0), x1: Math.max(a.x1, r.x1), z0: Math.min(a.z0, r.z0), z1: Math.max(a.z1, r.z1) }), { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 });
  o.push(R(X(hb.x0 - 1), Y(hb.z0 - 1), (hb.x1 - hb.x0 + 2) * k, (hb.z1 - hb.z0 + 2) * k, { fill: '#d4d4d2' }));
  const gateX = pos.rot ? 0 : pos.toWorld(C.doorU(v.W), 0)[0];
  if (!pos.rot) {
    o.push(R(X(gateX - 0.7), Y(hb.z1), 1.4 * k, (pl / 2 - hb.z1) * k, { fill: '#d4d4d2' }));
    if (v.garage) { const gr = pos.rects.find(r => r.k === 'garage'); o.push(R(X((gr.x0 + gr.x1) / 2 - 1.65), Y(gr.z1), 3.3 * k, (pl / 2 - gr.z1) * k, { fill: '#d4d4d2' })); }
  }
  // линия отступов
  o.push(R(X(-pw / 2 + C.SIDE), Y(-pl / 2 + C.BACK), (pw - 2 * C.SIDE) * k, (pl - C.FRONT - C.BACK) * k, { stroke: '#2f6fd1', sw: 0.25, dash: '2 1' }));
  // здание
  pos.rects.forEach(r => {
    const fill = r.k === 'terrace' ? '#fff' : '#fdeec4';
    o.push(R(X(r.x0), Y(r.z0), (r.x1 - r.x0) * k, (r.z1 - r.z0) * k, { fill, stroke: INK, sw: r.k === 'terrace' ? 0.2 : 0.6, dash: r.k === 'terrace' ? '1 0.6' : null }));
  });
  const hr = pos.rects[0];
  o.push(bubble(X((hr.x0 + hr.x1) / 2), Y((hr.z0 + hr.z1) / 2), '1', 2.8));
  // граница участка
  o.push(R(X(-pw / 2), Y(-pl / 2), pw * k, pl * k, { stroke: '#d0312d', sw: 0.5 }));
  // размеры
  o.push(dimH(X(-pw / 2), X(pw / 2), Y(-pl / 2) - 5, mm(pw)));
  o.push(dimV(Y(-pl / 2), Y(pl / 2), X(-pw / 2) - 5, mm(pl)));
  o.push(dimV(Y(hr.z1), Y(pl / 2), X(hr.x0) - 3, mm(pl / 2 - hr.z1), 2));
  o.push(dimH(X(-pw / 2), X(hr.x0), Y((hr.z0 + hr.z1) / 2), mm(hr.x0 + pw / 2), 2));
  // сети
  if (nets) {
    const fx = X(gateX + 2.2), fz = Y(hr.z1);
    o.push(PL([[X(gateX + 2.2), Y(pl / 2 + 3)], [fx, fz]], 0.45, '#2e9a3e'));
    const sx = -pw / 2 + 1.8, sz = pl / 2 - 2.4;
    o.push(`<circle cx="${r2(X(sx))}" cy="${r2(Y(sz))}" r="${r2(1 * k)}" fill="#fff" stroke="#e07b22" stroke-width="0.4"/>`);
    o.push(T(X(sx), Y(sz) + 4.5, 'септик', { size: 2.2, anchor: 'middle', fill: '#e07b22' }));
    o.push(PL([[X(hr.x0), Y(hr.z1 - 1.2)], [X(sx), Y(hr.z1 - 1.2)], [X(sx), Y(sz) - 1 * k]], 0.45, '#e07b22', '2 0.8'));
    const gx = hr.x1 - 1;
    o.push(PL([[X(gx + 1.5), Y(pl / 2 + 3)], [X(gx + 1.5), Y(hr.z1 + 0.6)], [X(gx), Y(hr.z1 + 0.6)], [X(gx), Y(hr.z1)]], 0.45, '#1fb5c9'));
    o.push(R(X(gx + 1.5) - 1, Y(pl / 2) - 2.5, 2, 1.5, { fill: '#fff', stroke: '#1fb5c9', sw: 0.3 }));
    o.push(PL([[X(-pw / 2 + 0.5), Y(pl / 2 + 3)], [X(-pw / 2 + 0.5), Y(pl / 2 - 0.5)], [X(hr.x0 + 0.8), Y(pl / 2 - 0.5)], [X(hr.x0 + 0.8), Y(hr.z1)]], 0.4, '#8e44ad', '3 1 0.6 1'));
  }
  // север
  const nx = 40, ny = 30;
  o.push(P([[nx, ny - 9], [nx + 2, ny + 6], [nx, ny + 4], [nx - 2, ny + 6]], { fill: INK }));
  o.push(T(nx, ny - 11, 'С', { size: 3, anchor: 'middle' }));
  // легенда
  let ly = 30;
  const lx = 252;
  o.push(T(lx, ly, 'Условные обозначения:', { size: 4.4 }));
  ly += 9;
  const leg = (draw, label) => { o.push(draw(lx, ly - 2.5)); o.push(T(lx + 18, ly, '– ' + label, { size: 3 })); ly += 7; };
  leg((x, y) => L(x, y, x + 14, y, 0.5, '#d0312d'), 'Граница участка');
  leg((x, y) => R(x, y - 2.5, 14, 5, { fill: '#fdeec4', stroke: INK, sw: 0.3 }) + bubble(x + 7, y, '1', 2), 'Жилой дом');
  leg((x, y) => R(x, y - 2.5, 14, 5, { fill: '#e2f0d6', stroke: INK, sw: 0.2 }), 'Озеленение');
  leg((x, y) => R(x, y - 2.5, 14, 5, { fill: '#d4d4d2', stroke: INK, sw: 0.2 }), 'Дорожное покрытие, отмостка');
  leg((x, y) => L(x, y, x + 14, y, 0.3, '#2f6fd1', '2 1'), 'Линия отступов застройки');
  if (nets) {
    leg((x, y) => L(x, y, x + 14, y, 0.5, '#2e9a3e'), 'Водоснабжение (В1)');
    leg((x, y) => L(x, y, x + 14, y, 0.5, '#e07b22', '2 0.8'), 'Канализация (К1), септик');
    leg((x, y) => L(x, y, x + 14, y, 0.5, '#1fb5c9'), 'Газоснабжение (Г1)');
    leg((x, y) => L(x, y, x + 14, y, 0.45, '#8e44ad', '3 1 0.6 1'), 'Электроснабжение (W1)');
  }
  ly += 6;
  o.push(T(lx, ly, 'Экспликация генерального плана:', { size: 3.4 }));
  ly += 7;
  [`1. Индивидуальный жилой дом — ${num(s.built)} м² (площадь застройки)`, `2. Дорожное покрытие, отмостка — ${num(s.paving)} м²`, `3. Озеленение — ${num(s.green)} м²`].forEach(t2 => { o.push(T(lx, ly, t2, { size: 2.9 })); ly += 5.5; });
  ly += 3;
  o.push(T(lx, ly, `Площадь участка — ${num(v.plot.area / 10000, 4)} га`, { size: 3.2 }));
  return { svg: o.join(''), scale: sc };
}

function planSheet(v, idx) {
  const lv = v.levels[idx];
  const ax = axes(v);
  const gw = idx === 0 && v.garage ? C.GARAGE_W : 0;
  const td = idx === 0 && v.terrace ? C.TERRACE_D : 0;
  const { s: sc, k } = fitScale(v.W + gw + 3.5, v.L + td + 4.5, 285, 215, 50);
  const ox = 30 + 16 + (285 - (v.W + gw + 3.5) * k) / 2, oy = 14 + 16 + (215 - (v.L + td + 4.5) * k) / 2;
  const X = x => ox + x * k, Y = y => oy + y * k;
  const o = [];
  const wt = 0.4, pt = 0.12;
  // помещения
  lv.rects.forEach(r => o.push(R(X(r.x), Y(r.y), r.w * k, r.h * k, { fill: '#fff' })));
  // перегородки
  lv.rects.forEach(r => o.push(R(X(r.x), Y(r.y), r.w * k, r.h * k, { stroke: '#3a3a3a', sw: pt * k })));
  // лестница
  lv.rects.filter(r => r.k === 'stairs').forEach(r => {
    const horiz = r.w >= r.h;
    const n = Math.floor((horiz ? r.w : r.h) / 0.28);
    for (let i = 1; i < n; i++) {
      if (horiz) o.push(L(X(r.x + i * 0.28), Y(r.y + 0.15), X(r.x + i * 0.28), Y(r.y + r.h - 0.15), 0.15));
      else o.push(L(X(r.x + 0.15), Y(r.y + i * 0.28), X(r.x + r.w - 0.15), Y(r.y + i * 0.28), 0.15));
    }
    if (horiz) o.push(PL([[X(r.x + 0.3), Y(r.y + r.h / 2)], [X(r.x + r.w - 0.3), Y(r.y + r.h / 2)]], 0.25) + P([[X(r.x + r.w - 0.3), Y(r.y + r.h / 2)], [X(r.x + r.w - 0.6), Y(r.y + r.h / 2 - 0.12)], [X(r.x + r.w - 0.6), Y(r.y + r.h / 2 + 0.12)]], { fill: INK }));
    else o.push(PL([[X(r.x + r.w / 2), Y(r.y + r.h - 0.3)], [X(r.x + r.w / 2), Y(r.y + 0.3)]], 0.25) + P([[X(r.x + r.w / 2), Y(r.y + 0.3)], [X(r.x + r.w / 2 - 0.12), Y(r.y + 0.6)], [X(r.x + r.w / 2 + 0.12), Y(r.y + 0.6)]], { fill: INK }));
  });
  // внутренние двери
  doorsOf(lv).forEach(d => {
    const at = d.a + 0.25, w = d.w;
    if (d.o === 'h') {
      o.push(R(X(at), Y(d.at) - pt * k / 2 - 0.2, w * k, pt * k + 0.4, { fill: '#fff' }));
      if (!d.open) {
        const yy = Y(d.at), dir = d.into;
        o.push(L(X(at), yy, X(at), yy + dir * w * k, 0.25));
        o.push(`<path d="M${r2(X(at))} ${r2(yy + dir * w * k)} A${r2(w * k)} ${r2(w * k)} 0 0 ${dir > 0 ? 0 : 1} ${r2(X(at + w))} ${r2(yy)}" fill="none" stroke="${INK}" stroke-width="0.15"/>`);
      }
    } else {
      o.push(R(X(d.at) - pt * k / 2 - 0.2, Y(at), pt * k + 0.4, w * k, { fill: '#fff' }));
      if (!d.open) {
        const xx = X(d.at), dir = d.into;
        o.push(L(xx, Y(at), xx + dir * w * k, Y(at), 0.25));
        o.push(`<path d="M${r2(xx + dir * w * k)} ${r2(Y(at))} A${r2(w * k)} ${r2(w * k)} 0 0 ${dir > 0 ? 1 : 0} ${r2(xx)} ${r2(Y(at + w))}" fill="none" stroke="${INK}" stroke-width="0.15"/>`);
      }
    }
  });
  // наружные стены со штриховкой
  const outer = (x0, y0, w, h) => `<path d="M${r2(X(x0))} ${r2(Y(y0))}h${r2(w * k)}v${r2(h * k)}h${r2(-w * k)}z M${r2(X(x0 + wt))} ${r2(Y(y0 + wt))}v${r2((h - 2 * wt) * k)}h${r2((w - 2 * wt) * k)}v${r2(-(h - 2 * wt) * k)}z" fill="url(#__h)" fill-rule="evenodd" stroke="${INK}" stroke-width="0.35"/>`;
  o.push(outer(0, 0, v.W, v.L));
  if (gw) {
    const gy = v.L - v.gd;
    o.push(R(X(v.W), Y(gy), gw * k, v.gd * k, { fill: '#fff' }));
    o.push(`<path d="M${r2(X(v.W))} ${r2(Y(gy))}h${r2(gw * k)}v${r2(v.gd * k)}h${r2(-gw * k)}z M${r2(X(v.W))} ${r2(Y(gy + wt))}v${r2((v.gd - 2 * wt) * k)}h${r2((gw - wt) * k)}v${r2(-(v.gd - 2 * wt) * k)}z" fill="url(#__h)" fill-rule="evenodd" stroke="${INK}" stroke-width="0.35"/>`);
    o.push(R(X(v.W + (gw - 2.7) / 2), Y(v.L) - wt * k - 0.2, 2.7 * k, wt * k + 0.4, { fill: '#fff' }));
    o.push(L(X(v.W + (gw - 2.7) / 2), Y(v.L - wt / 2), X(v.W + (gw + 2.7) / 2), Y(v.L - wt / 2), 0.2, INK, '1 0.5'));
  }
  if (td) {
    const tw = Math.min(v.W * 0.7, 7);
    o.push(R(X(v.W / 2 - tw / 2), Y(v.L), tw * k, td * k, { stroke: INK, sw: 0.25, dash: '1.5 0.8' }));
    o.push(T(X(v.W / 2), Y(v.L + td / 2) + 1, 'Терраса', { size: 2.6, anchor: 'middle' }));
  }
  // окна и входная дверь
  openings(v, idx).forEach(op => {
    const w = op.w;
    const seg = (side, pos) => {
      if (side === 'front' || side === 'back') {
        const y0 = side === 'front' ? v.L - wt : 0;
        return [X(pos - w / 2), Y(y0), w * k, wt * k, 'h'];
      }
      const x0 = side === 'right' ? v.W - wt : 0;
      return [X(x0), Y(pos - w / 2), wt * k, w * k, 'v'];
    };
    const [x, y, ww, hh, o3] = seg(op.side, op.pos);
    o.push(R(x, y, ww, hh, { fill: '#fff', stroke: INK, sw: 0.25 }));
    if (op.kind === 'door') {
      const dir = op.side === 'front' ? -1 : 1;
      if (o3 === 'h') {
        const yy = op.side === 'front' ? y : y + hh;
        o.push(L(x, yy, x, yy + dir * w * k, 0.25));
        o.push(`<path d="M${r2(x)} ${r2(yy + dir * w * k)} A${r2(w * k)} ${r2(w * k)} 0 0 ${dir > 0 ? 0 : 1} ${r2(x + ww)} ${r2(yy)}" fill="none" stroke="${INK}" stroke-width="0.15"/>`);
      }
    } else if (o3 === 'h') {
      o.push(L(x, y + hh * 0.42, x + ww, y + hh * 0.42, 0.12) + L(x, y + hh * 0.58, x + ww, y + hh * 0.58, 0.12));
    } else {
      o.push(L(x + ww * 0.42, y, x + ww * 0.42, y + hh, 0.12) + L(x + ww * 0.58, y, x + ww * 0.58, y + hh, 0.12));
    }
  });
  // номера помещений
  lv.rects.forEach((r, i) => {
    r.no = i + 1;
    const cx = X(r.x + r.w / 2), cy = Y(r.y + r.h / 2);
    o.push(bubble(cx, cy, String(r.no), Math.min(3.2, r.w * k / 3.2, r.h * k / 3.2)));
  });
  if (gw) o.push(bubble(X(v.W + gw / 2), Y(v.L - v.gd / 2), String(lv.rects.length + 1), 3.2));
  // оси и размеры
  const top = Y(0) - 14, bottom = Y(v.L + td) + 16, left = X(0) - 16;
  ax.xs.forEach((x, i) => {
    o.push(L(X(x), top + 3.2, X(x), Y(v.L + td) + 13, 0.15, INK, '4 1 0.6 1'));
    o.push(bubble(X(x), top, ax.xl[i]));
    o.push(bubble(X(x), bottom, ax.xl[i]));
  });
  ax.ys.forEach((y, i) => {
    o.push(L(left + 3.2, Y(y), X(v.W + gw) + 4, Y(y), 0.15, INK, '4 1 0.6 1'));
    o.push(bubble(left, Y(y), ax.yl[i]));
  });
  for (let i = 1; i < ax.xs.length; i++) o.push(dimH(X(ax.xs[i - 1]), X(ax.xs[i]), Y(v.L + td) + 5, mm(ax.xs[i] - ax.xs[i - 1])));
  o.push(dimH(X(0), X(v.W), Y(v.L + td) + 10, mm(v.W)));
  for (let i = 1; i < ax.ys.length; i++) o.push(dimV(Y(ax.ys[i - 1]), Y(ax.ys[i]), left + 6, mm(ax.ys[i] - ax.ys[i - 1])));
  o.push(dimV(Y(0), Y(v.L), left + 11, mm(v.L)));
  // экспликация
  const tx = 328, tw = 82;
  let ty = 14;
  const rows = lv.rects.map(r => [String(r.no), C.roomName(r.k), num(r.net)]);
  if (gw) rows.push([String(lv.rects.length + 1), 'Гараж', num(C.GARAGE_W * v.gd * 0.9)]);
  const rh = Math.min(5.2, 190 / (rows.length + 3));
  o.push(R(tx, ty, tw, (rows.length + 2) * rh + 7, { fill: '#fff', stroke: INK, sw: 0.4 }));
  o.push(T(tx + tw / 2, ty + 5, 'Экспликация помещений', { size: 3.2, anchor: 'middle' }));
  ty += 7;
  o.push(L(tx, ty, tx + tw, ty, 0.3));
  o.push(L(tx + 8, ty, tx + 8, ty + (rows.length + 1) * rh, 0.3));
  o.push(L(tx + tw - 18, ty, tx + tw - 18, ty + (rows.length + 1) * rh, 0.3));
  o.push(T(tx + 4, ty + rh * 0.72, '№', { size: 2.6, anchor: 'middle' }));
  o.push(T(tx + 10, ty + rh * 0.72, 'Наименование', { size: 2.6 }));
  o.push(T(tx + tw - 9, ty + rh * 0.72, 'Пл., м²', { size: 2.4, anchor: 'middle' }));
  rows.forEach((row, i) => {
    const yy = ty + (i + 1) * rh;
    o.push(L(tx, yy, tx + tw, yy, 0.15));
    o.push(T(tx + 4, yy + rh * 0.72, row[0], { size: 2.6, anchor: 'middle' }));
    o.push(T(tx + 10, yy + rh * 0.72, row[1], { size: 2.6 }));
    o.push(T(tx + tw - 9, yy + rh * 0.72, row[2], { size: 2.6, anchor: 'middle' }));
  });
  const yy = ty + (rows.length + 1) * rh;
  o.push(T(tx + 2, yy + rh * 0.8, 'Итого', { size: 2.8 }));
  o.push(T(tx + tw - 9, yy + rh * 0.8, num(lv.total), { size: 2.8, anchor: 'middle' }));
  if (lv.attic) wrap('* площадь мансарды приведена с учётом скосов кровли', 40).forEach((s2, i) => o.push(T(tx, yy + rh + 5 + i * 3.4, s2, { size: 2.3, fill: '#555' })));
  return { svg: o.join('').replace(/__h/g, '%P%h'), scale: sc };
}

// Лист с двумя фасадами друг под другом
function facadesSheet(v, views, grid = false) {
  const f = finish(v), ax = axes(v);
  const ext = views.map(w => viewExtent(v, w));
  const maxW = Math.max(...ext.map(e => e.b - e.a));
  const maxH = Math.max(...ext.map(e => e.top + C.PLINTH));
  // два фасада друг под другом или рядом — что даёт более крупный масштаб
  const stacked = fitScale(maxW, maxH, 330, 80, 50);
  const side = fitScale(maxW, maxH, 158, 175, 50);
  const cell = fitScale(maxW, maxH, 158, 78, 50);
  const bySide = !grid && side.k > stacked.k;
  const { s: sc, k } = grid ? cell : bySide ? side : stacked;
  const o = [];
  views.forEach((w, i) => {
    const e = ext[i];
    const cw = bySide || grid ? 158 : 330;
    const cx = grid ? 30 + 22 + (i % 2) * 190 : bySide ? 30 + 22 + i * 190 : 30 + 22;
    const cy = grid ? 10 + Math.floor(i / 2) * 113 : bySide ? 18 : 12 + i * 113;
    const ox = cx + (cw - (e.b - e.a) * k) / 2 - e.a * k;
    const oy = cy + 14 + (bySide || grid ? Math.max(...ext.map(x => x.top)) : e.top) * k;
    o.push(T(ox + ((e.a + e.b) / 2) * k, cy + 7, `${facadeTitle(v, w, ax)} М 1:${sc}`, { size: 4.6, anchor: 'middle' }));
    o.push(elevation(v, w, k, ox, oy, '%P%', f));
    const g0 = oy + C.PLINTH * k;
    const m = viewModel(v, w);
    const leftX = ox + e.a * k - 2;
    const marks = [-C.PLINTH, 0, m.e, v.geo.height - C.PLINTH];
    for (let fl = 1; fl < Math.floor(v.floors); fl++) marks.push(fl * C.FLOOR_H);
    [...new Set(marks.map(x => Math.round(x * 1000) / 1000))].forEach(z => o.push(mark(leftX, oy - z * k, z, 'left', 9)));
    const pos = w === 'front' || w === 'back' ? ax.xs : ax.ys;
    const lab = w === 'front' || w === 'back' ? ax.xl : ax.yl;
    const items = pos.map((p, j) => [m.map(p), lab[j]]).sort((a, b) => a[0] - b[0]);
    const by = g0 + 16;
    items.forEach(([u, l2]) => { o.push(L(ox + u * k, g0 + 1, ox + u * k, by - 3.2, 0.15)); o.push(bubble(ox + u * k, by, l2)); });
    for (let j = 1; j < items.length; j++) o.push(dimH(ox + items[j - 1][0] * k, ox + items[j][0] * k, g0 + 5, mm(items[j][0] - items[j - 1][0])));
    o.push(dimH(ox + items[0][0] * k, ox + items[items.length - 1][0] * k, g0 + 10, mm(items[items.length - 1][0] - items[0][0])));
  });
  return { svg: o.join(''), scale: sc, k };
}
function sectionSheet(v) {
  const f = finish(v);
  const g = v.geo;
  const alongX = (v.roof === 'gable' || v.roof === 'mansard' || v.roof === 'hip') && ridgeAlongY(v);
  const span = alongX ? v.W : v.L;
  const e = g.wallTop - C.PLINTH, o2 = g.over, h = g.h;
  const { s: sc, k } = fitScale(span + 2 * o2 + 10, g.height + 3, 230, 120, 50);
  const ox = 60, base = 40 + (g.height - C.PLINTH + 0.8) * k;
  const X = t => ox + t * k, Y = z => base - z * k;
  const o = [];
  const g0 = -C.PLINTH, wt = 0.4;
  o.push(T(ox + span * k / 2, 22, `Разрез 1-1 М 1:${sc}`, { size: 5, anchor: 'middle' }));
  // грунт и фундамент
  o.push(L(X(-4), Y(g0), X(span + 4), Y(g0), 0.5));
  [0, span - wt].forEach(t0 => o.push(R(X(t0 - 0.1), Y(0), (wt + 0.2) * k, (1.6) * k, { fill: `url(#%P%c)`, stroke: INK, sw: 0.3 })));
  o.push(R(X(wt), Y(0), (span - 2 * wt) * k, 0.3 * k, { fill: `url(#%P%c)`, stroke: INK, sw: 0.25 }));
  // перекрытия
  const nFloors = Math.floor(v.floors);
  for (let i = 1; i <= nFloors; i++) {
    const z = i === nFloors && v.floors !== 1.5 ? e - 0.22 : i * C.FLOOR_H - 0.22;
    if (z >= e) continue;
    o.push(R(X(wt), Y(z + 0.22), (span - 2 * wt) * k, 0.22 * k, { fill: `url(#%P%c)`, stroke: INK, sw: 0.25 }));
  }
  if (v.roof !== 'flat' && v.floors !== 1.5 && !(nFloors * C.FLOOR_H - 0.22 < e - 0.3)) { /* перекрытие верхнего этажа уже нарисовано */ }
  // наружные стены
  [0, span - wt].forEach(t0 => o.push(R(X(t0), Y(e), wt * k, e * k, { fill: `url(#%P%h)`, stroke: INK, sw: 0.35 })));
  // перегородки по линии разреза
  v.levels.forEach((lv, i) => {
    const z0 = i * C.FLOOR_H, z1 = Math.min(e, (i + 1) * C.FLOOR_H) - 0.22;
    const mid = alongX ? v.L / 2 : v.W / 2;
    const cuts = new Set();
    lv.rects.forEach(r => {
      const inside = alongX ? (r.y <= mid && r.y + r.h >= mid) : (r.x <= mid && r.x + r.w >= mid);
      if (!inside) return;
      const a = alongX ? r.x : r.y, b = alongX ? r.x + r.w : r.y + r.h;
      [a, b].forEach(t => { if (t > 0.6 && t < span - 0.6) cuts.add(Math.round(t * 100) / 100); });
    });
    cuts.forEach(t => o.push(R(X(t - 0.06), Y(z1), 0.12 * k, (z1 - z0) * k, { fill: `url(#%P%h)`, stroke: INK, sw: 0.2 })));
    // окна в наружных стенах
    [[0, 'a'], [span - wt, 'b']].forEach(([t0]) => {
      const zb = z0 + 0.85, zt = Math.min(zb + 1.45, z1 - 0.1);
      if (lv.attic) return;
      o.push(R(X(t0), Y(zt), wt * k, (zt - zb) * k, { fill: '#fff', stroke: INK, sw: 0.25 }));
      o.push(L(X(t0 + wt / 2), Y(zt), X(t0 + wt / 2), Y(zb), 0.15));
    });
  });
  // кровля
  if (v.roof === 'flat') {
    o.push(R(X(0), Y(e + 0.25), span * k, 0.25 * k, { fill: `url(#%P%i)`, stroke: INK, sw: 0.3 }));
    o.push(L(X(-o2), Y(e + 0.27), X(span + o2), Y(e + 0.27), 0.6));
    if (o2 === 0) [0, span - 0.25].forEach(t0 => o.push(R(X(t0), Y(e + 0.6), 0.25 * k, 0.6 * k, { fill: `url(#%P%h)`, stroke: INK, sw: 0.3 })));
  } else if (v.roof === 'shed') {
    const s = h / span;
    const pts = [[-o2, e + h + o2 * s], [span + o2, e - o2 * s]];
    o.push(P([[X(pts[0][0]), Y(pts[0][1])], [X(pts[1][0]), Y(pts[1][1])], [X(pts[1][0]), Y(pts[1][1] - 0.3)], [X(pts[0][0]), Y(pts[0][1] - 0.3)]], { fill: `url(#%P%i)`, stroke: INK, sw: 0.3 }));
    o.push(PL(pts.map(([a, b]) => [X(a), Y(b + 0.03)]), 0.7));
    o.push(R(X(span - wt), Y(e + h), wt * k, h * k, { fill: `url(#%P%h)`, stroke: INK, sw: 0.3 }));
  } else {
    const ks = h / (span / 2), th = 0.3;
    const L1 = [[-o2, e - o2 * ks], [span / 2, e + h], [span + o2, e - o2 * ks]];
    o.push(P([[X(L1[0][0]), Y(L1[0][1])], [X(L1[1][0]), Y(L1[1][1])], [X(L1[2][0]), Y(L1[2][1])], [X(L1[2][0]), Y(L1[2][1] - th)], [X(L1[1][0]), Y(L1[1][1] - th)], [X(L1[0][0]), Y(L1[0][1] - th)]], { fill: `url(#%P%i)`, stroke: INK, sw: 0.3 }));
    o.push(PL(L1.map(([a, b]) => [X(a), Y(b + 0.03)]), 0.7));
    if (v.floors !== 1.5) o.push(R(X(wt), Y(e), (span - 2 * wt) * k, 0.22 * k, { fill: `url(#%P%c)`, stroke: INK, sw: 0.25 }));
  }
  // отметки
  const mx = X(span + o2) + 6;
  const marks = [g0, 0, e, g.height - C.PLINTH];
  for (let i = 1; i < nFloors; i++) marks.push(i * C.FLOOR_H);
  if (v.floors === 1.5) marks.push(C.FLOOR_H);
  [...new Set(marks.map(z => Math.round(z * 1000) / 1000))].forEach(z => o.push(mark(mx - 4, Y(z), z, 'right', 12)));
  // размеры
  o.push(dimH(X(0), X(span), Y(g0) + 10, mm(span)));
  // пирог кровли
  const pie = v.roof === 'flat' ? ['ПВХ-мембрана', 'Разуклонка из керамзита', 'Утеплитель ROCKWOOL 200 мм', 'Пароизоляция', 'Ж/б плита покрытия']
    : [f.roof.name, 'Обрешётка доска 100×25', 'Контробрешётка брусок 50×50', 'Гидро-ветроизоляционная плёнка', 'Утеплитель ROCKWOOL 200 мм', 'Стропила — доска 50×200'];
  const px = X(span + o2) + 30, py = 30;
  pie.forEach((s2, i) => { o.push(T(px, py + i * 4.6, s2, { size: 2.6 })); o.push(L(px, py + i * 4.6 + 1, px + 62, py + i * 4.6 + 1, 0.15)); });
  o.push(L(px, py + 1, X(span * 0.7), Y(v.roof === 'flat' ? e + 0.25 : v.roof === 'shed' ? e + h * 0.3 : e + h * 0.55), 0.15));
  // ведомость отделки
  const tx = 28, ty = 205;
  o.push(T(tx + 85, ty - 4, 'Ведомость наружной отделки фасадов', { size: 3.4, anchor: 'middle' }));
  const cols = [8, 46, 26, 22, 70];
  const rows = [['1', 'Стена', f.wall.color, f.wall.ral, f.wall.name], ['2', 'Цоколь', f.plinth.color, f.plinth.ral, f.plinth.name], ['3', 'Окна', f.win.color, f.win.ral, 'Металлопластиковые'], ['4', 'Двери', f.door.color, f.door.ral, f.door.name], ['5', 'Кровля', f.roof.color, f.roof.ral, f.roof.name]];
  const tw = cols.reduce((a, b) => a + b, 0), rh = 6;
  o.push(R(tx, ty, tw, rh * (rows.length + 1), { fill: '#fff', stroke: INK, sw: 0.35 }));
  let cx = tx;
  cols.forEach(w => { cx += w; o.push(L(cx, ty, cx, ty + rh * (rows.length + 1), 0.2)); });
  ['№', 'Элемент', 'Цвет', 'RAL', 'Вид отделки'].reduce((acc, s2, i) => { o.push(T(acc + cols[i] / 2, ty + 4, s2, { size: 2.5, anchor: 'middle' })); return acc + cols[i]; }, tx);
  rows.forEach((row, i) => {
    const yy = ty + rh * (i + 1);
    o.push(L(tx, yy, tx + tw, yy, 0.2));
    o.push(T(tx + 4, yy + 4.2, row[0], { size: 2.5, anchor: 'middle' }));
    o.push(T(tx + 10, yy + 4.2, row[1], { size: 2.5 }));
    o.push(R(tx + 57, yy + 1.2, 20, 3.6, { fill: row[2], stroke: INK, sw: 0.2 }));
    o.push(T(tx + 91, yy + 4.2, row[3], { size: 2.5, anchor: 'middle' }));
    o.push(T(tx + 104, yy + 4.2, row[4], { size: 2.5 }));
  });
  return { svg: o.join(''), scale: sc, k };
}

function roofSheet(v) {
  const f = finish(v), ax = axes(v);
  const o2 = v.geo.over;
  const gw = v.garage ? C.GARAGE_W : 0;
  const tdr = v.terrace ? C.TERRACE_D : 0;
  const { s: sc, k } = fitScale(v.W + gw + 2 * o2 + 4, v.L + tdr + 2 * o2 + 4, 300, 200, 50);
  const ox = 40 + 14 + (300 - (v.W + gw + 2 * o2 + 4) * k) / 2 + o2 * k, oy = 18 + 14 + o2 * k;
  const X = x => ox + x * k, Y = y => oy + y * k;
  const o = [];
  o.push(T(ox + (v.W + gw) * k / 2, 22, `План кровли М 1:${sc}`, { size: 5, anchor: 'middle' }));
  const arrow = (x, y, dx, dy) => {
    const l = 1.6;
    const x2 = x + dx * l, y2 = y + dy * l;
    return L(X(x), Y(y), X(x2), Y(y2), 0.5, '#fff') + P([[X(x2), Y(y2)], [X(x2 - dx * 0.35 - dy * 0.22), Y(y2 - dy * 0.35 - dx * 0.22)], [X(x2 - dx * 0.35 + dy * 0.22), Y(y2 - dy * 0.35 + dx * 0.22)]], { fill: '#fff' });
  };
  const x0 = -o2, x1 = v.W + o2, y0 = -o2, y1 = v.L + o2;
  const rf = `url(#%P%r)`;
  if (v.garage) {
    o.push(R(X(v.W), Y(v.L - v.gd - 0.3), (gw + 0.35) * k, (v.gd + 0.6) * k, { fill: rf, stroke: INK, sw: 0.3 }));
    o.push(arrow(v.W + gw / 2 - 0.8, v.L - v.gd / 2, 1, 0));
  }
  if (v.roof === 'flat' || v.roof === 'shed') {
    o.push(R(X(x0), Y(y0), (x1 - x0) * k, (y1 - y0) * k, { fill: rf, stroke: INK, sw: 0.4 }));
    o.push(arrow(v.W / 2, v.L / 2 - 0.8, 0, v.roof === 'shed' ? 1 : -1));
    if (v.roof === 'flat') o.push(T(X(v.W / 2), Y(v.L / 2) + 6, 'i = 2%', { size: 3, anchor: 'middle', fill: '#fff' }));
  } else if (v.roof === 'hip') {
    const alongY = v.L > v.W;
    const r = Math.abs(v.L - v.W) / 2;
    const c = alongY ? [[v.W / 2, v.W / 2], [v.W / 2, v.L - v.W / 2]] : [[v.L / 2, v.L / 2], [v.W - v.L / 2, v.L / 2]];
    const [p1, p2] = r > 0 ? c : [[v.W / 2, v.L / 2], [v.W / 2, v.L / 2]];
    o.push(R(X(x0), Y(y0), (x1 - x0) * k, (y1 - y0) * k, { fill: rf, stroke: INK, sw: 0.4 }));
    const shadeTri = alongY ? [[x0, y0], [x1, y0], p1] : [[x1, y0], [x1, y1], p2];
    o.push(P(shadeTri.map(([a, b]) => [X(a), Y(b)]), { fill: '#000', op: 0.22 }));
    o.push(P((alongY ? [[x1, y0], [x1, y1], p2, p1] : [[x0, y1], [x1, y1], p2, p1]).map(([a, b]) => [X(a), Y(b)]), { fill: '#000', op: 0.12 }));
    o.push(L(X(p1[0]), Y(p1[1]), X(p2[0]), Y(p2[1]), 0.5));
    [[x0, y0, p1], [x1, y0, alongY ? p1 : p2], [x0, y1, alongY ? p2 : p1], [x1, y1, p2]].forEach(([a, b, p]) => o.push(L(X(a), Y(b), X(p[0]), Y(p[1]), 0.4)));
    o.push(arrow(v.W / 2, v.L * 0.25 - 0.8, 0, -1), arrow(v.W / 2, v.L * 0.75, 0, 1), arrow(v.W * 0.2, v.L / 2, -1, 0), arrow(v.W * 0.8, v.L / 2, 1, 0));
  } else {
    const alongY = ridgeAlongY(v);
    o.push(R(X(x0), Y(y0), (x1 - x0) * k, (y1 - y0) * k, { fill: rf, stroke: INK, sw: 0.4 }));
    if (alongY) {
      o.push(R(X(v.W / 2), Y(y0), (x1 - v.W / 2) * k, (y1 - y0) * k, { fill: '#000', op: 0.2 }));
      o.push(L(X(v.W / 2), Y(y0), X(v.W / 2), Y(y1), 0.5));
      o.push(arrow(v.W * 0.3, v.L / 2, -1, 0), arrow(v.W * 0.7, v.L / 2, 1, 0));
    } else {
      o.push(R(X(x0), Y(v.L / 2), (x1 - x0) * k, (y1 - v.L / 2) * k, { fill: '#000', op: 0.2 }));
      o.push(L(X(x0), Y(v.L / 2), X(x1), Y(v.L / 2), 0.5));
      o.push(arrow(v.W / 2, v.L * 0.3, 0, -1), arrow(v.W / 2, v.L * 0.7, 0, 1));
    }
  }
  if (v.terrace && ['classic', 'scandi', 'chalet'].includes(v.style)) {
    const tw = Math.min(v.W * 0.7, 7);
    o.push(R(X(v.W / 2 - tw / 2 - 0.3), Y(v.L), (tw + 0.6) * k, (C.TERRACE_D + 0.3) * k, { fill: rf, stroke: INK, sw: 0.3 }));
    o.push(arrow(v.W / 2, v.L + 0.4, 0, 1));
  }
  // оси
  const top = Y(y0) - 8, bottom = Y(y1 + (v.terrace ? C.TERRACE_D : 0)) + 14, left = X(x0) - 14;
  ax.xs.forEach((x, i) => { o.push(L(X(x), Y(y1) + 1, X(x), bottom - 3.2, 0.15, INK, '4 1 0.6 1')); o.push(bubble(X(x), bottom, ax.xl[i])); });
  ax.ys.forEach((y, i) => { o.push(L(left + 3.2, Y(y), X(x0) - 1, Y(y), 0.15, INK, '4 1 0.6 1')); o.push(bubble(left, Y(y), ax.yl[i])); });
  o.push(dimH(X(0), X(v.W), bottom - 8, mm(v.W)));
  o.push(dimV(Y(0), Y(v.L), left + 7, mm(v.L)));
  o.push(T(ox, oy + (y1 - y0) * k + 52, `Покрытие кровли: ${f.roof.name}, ${f.roof.ral}`, { size: 3 }));
  return { svg: o.join(''), scale: sc, k };
}

/* ------------------------------------------------------- сборка листов */

export function sheets(v) {
  const f = finish(v);
  const levels = v.levels.length;
  const planNames = v.levels.map((lv, i) => (lv.attic ? 'План мансарды' : `План ${i + 1} этажа`));
  const gp = genplan(v, false), nets = genplan(v, true);
  const plans = v.levels.map((_, i) => planSheet(v, i));
  const ax = axes(v);
  const all4 = ['front', 'back', 'right', 'left'];
  const e4 = all4.map(w => viewExtent(v, w));
  const oneSheet = fitScale(Math.max(...e4.map(e => e.b - e.a)), Math.max(...e4.map(e => e.top + C.PLINTH)), 158, 78, 50).s <= 100;
  const facAll = oneSheet ? facadesSheet(v, all4, true) : null;
  const facA = oneSheet ? null : facadesSheet(v, ['front', 'back']), facB = oneSheet ? null : facadesSheet(v, ['right', 'left']);
  const sec = sectionSheet(v), roof = roofSheet(v);

  const defs = [
    { short: 'Титул', title: 'Титульный лист' },
    { short: 'Общие данные', title: 'Общие данные' },
    { short: 'Генплан', title: `Генплан М 1:${gp.scale}`, body: gp },
    { short: 'Сети', title: `План инженерных сетей М 1:${nets.scale}`, body: nets },
    ...plans.map((p, i) => ({ short: planNames[i], title: `${planNames[i]} М 1:${p.scale}`, body: p })),
    { short: 'Разрез', title: `Разрез 1-1 М 1:${sec.scale}; Ведомость наружной отделки фасадов`, body: sec },
    ...(oneSheet
      ? [{ short: 'Фасады', title: `Фасады ${all4.map(w => facadeTitle(v, w, ax).replace('Фасад ', '')).join('; ')} М 1:${facAll.scale}`, body: facAll }]
      : [{ short: 'Фасады 1', title: `${facadeTitle(v, 'front', ax)}; ${facadeTitle(v, 'back', ax)} М 1:${facA.scale}`, body: facA },
        { short: 'Фасады 2', title: `${facadeTitle(v, 'right', ax)}; ${facadeTitle(v, 'left', ax)} М 1:${facB.scale}`, body: facB }]),
    { short: 'Кровля', title: `План кровли М 1:${roof.scale}`, body: roof }
  ];
  const total = defs.length - 1;
  const list = defs.map(d => d.title);
  return defs.map((d, i) => {
    const P = 's' + (uid++);
    const k = d.body && d.body.k ? d.body.k : 10;
    let inner;
    if (i === 0) inner = sheetTitle(v, i, total);
    else if (i === 1) inner = frame(P, i, total, d.title, sheetGeneral(v, list));
    else inner = frame(P, i, total, d.title.replace(/; Ведомость.*/, ''), d.body.svg.replace(/%P%/g, P));
    return { short: d.short, title: d.title, svg: svgWrap(inner, P, k, f) };
  });
}
