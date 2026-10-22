/*
 * Реалистичная 3D-модель дома для конструктора svoyproect.kz.
 * Дом строится процедурно по параметрам варианта: материалы с рельефом,
 * окна с переплётами и наличниками, кровля с карнизами и водостоками,
 * крыльцо, гараж, участок. Мягкое затенение — GTAO, отражения — окружение.
 *
 * Локальные координаты дома: фасад смотрит в +z, ширина W по оси x,
 * глубина L по оси z, y — вверх.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let D = null;       // зависимости из configurator.js
let main = null;    // основной просмотр
let shots = null;   // рендер превью для карточек
const shotCache = new Map();

export function init(deps) { D = deps; }

/* ------------------------------------------------------------ текстуры */

const S = 512;

function rnd(seed) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
const hash = str => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = c => Math.max(0, Math.min(255, Math.round(c * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
const gray = v => { const x = Math.max(0, Math.min(255, Math.round(v))); return `rgb(${x},${x},${x})`; };

function specks(c, r, n, alpha, size = 2) {
  for (let i = 0; i < n; i++) {
    c.fillStyle = r() > 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
    c.fillRect(r() * S, r() * S, size, size);
  }
}

// Мягкие пятна, которые бесшовно переходят через края плитки
function blots(c, r, n, rgb, alpha) {
  for (let i = 0; i < n; i++) {
    const x = r() * S, y = r() * S, rad = 60 + r() * 120, color = rgb();
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
      const g = c.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
      g.addColorStop(0, `rgba(${color},${alpha})`); g.addColorStop(1, `rgba(${color},0)`);
      c.fillStyle = g; c.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
    }
  }
}

// Каждый «маляр» рисует цвет (c) и карту высот (h) одной плитки текстуры
const paint = {
  stucco(c, h, r, color) {
    c.fillStyle = color; c.fillRect(0, 0, S, S);
    blots(c, r, 40, () => (r() > 0.5 ? '0,0,0' : '255,255,255'), 0.035);
    specks(c, r, 9000, 0.05, 1.5);
    h.fillStyle = gray(128); h.fillRect(0, 0, S, S);
    specks(h, r, 14000, 0.35, 2);
  },
  bricks(c, h, r, color, mortar, rows, cols) {
    c.fillStyle = mortar; c.fillRect(0, 0, S, S);
    h.fillStyle = gray(40); h.fillRect(0, 0, S, S);
    const bh = S / rows, bw = S / cols, m = 4;
    for (let y = 0; y < rows; y++) {
      const off = y % 2 ? bw / 2 : 0;
      for (let x = -1; x <= cols; x++) {
        const k = 0.78 + r() * 0.34;
        c.fillStyle = shade(color, k);
        c.fillRect(x * bw + off + m / 2, y * bh + m / 2, bw - m, bh - m);
        c.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.08})`;
        c.fillRect(x * bw + off + m / 2, y * bh + bh - m / 2 - 5, bw - m, 4);
        h.fillStyle = gray(200 + r() * 30);
        h.fillRect(x * bw + off + m / 2, y * bh + m / 2, bw - m, bh - m);
      }
    }
    specks(c, r, 6000, 0.07, 2);
    specks(h, r, 6000, 0.25, 2);
  },
  lap(c, h, r, color, boards) {
    const bh = S / boards;
    for (let i = 0; i < boards; i++) {
      const y = i * bh;
      const g = c.createLinearGradient(0, y, 0, y + bh);
      g.addColorStop(0, shade(color, 1.05)); g.addColorStop(0.85, shade(color, 0.95)); g.addColorStop(1, shade(color, 0.86));
      c.fillStyle = g; c.fillRect(0, y, S, bh);
      c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(0, y + bh - 4, S, 4);
      const gh = h.createLinearGradient(0, y, 0, y + bh);
      gh.addColorStop(0, gray(70)); gh.addColorStop(0.95, gray(210)); gh.addColorStop(1, gray(20));
      h.fillStyle = gh; h.fillRect(0, y, S, bh);
    }
    c.strokeStyle = 'rgba(0,0,0,.03)';
    for (let i = 0; i < 160; i++) { const y = r() * S; c.beginPath(); c.moveTo(0, y); c.lineTo(S, y + (r() - 0.5) * 2); c.stroke(); }
  },
  battens(c, h, r, color, boards) {
    const bw = S / boards;
    h.fillStyle = gray(110); h.fillRect(0, 0, S, S);
    for (let i = 0; i < boards; i++) {
      c.fillStyle = shade(color, 0.94 + r() * 0.1); c.fillRect(i * bw, 0, bw, S);
      c.fillStyle = shade(color, 1.12); c.fillRect(i * bw, 0, 10, S);
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(i * bw + 10, 0, 4, S);
      h.fillStyle = gray(240); h.fillRect(i * bw, 0, 10, S);
    }
    specks(c, r, 3000, 0.04, 2);
  },
  logs(c, h, r, color, n) {
    const lh = S / n;
    for (let i = 0; i < n; i++) {
      const y = i * lh;
      const g = c.createLinearGradient(0, y, 0, y + lh);
      g.addColorStop(0, shade(color, 0.5)); g.addColorStop(0.12, shade(color, 0.9)); g.addColorStop(0.4, shade(color, 1.12));
      g.addColorStop(0.75, shade(color, 0.95)); g.addColorStop(1, shade(color, 0.45));
      c.fillStyle = g; c.fillRect(0, y, S, lh);
      const gh = h.createLinearGradient(0, y, 0, y + lh);
      gh.addColorStop(0, gray(10)); gh.addColorStop(0.5, gray(240)); gh.addColorStop(1, gray(10));
      h.fillStyle = gh; h.fillRect(0, y, S, lh);
    }
    c.strokeStyle = 'rgba(60,30,10,.18)'; c.lineWidth = 1.2;
    for (let i = 0; i < 260; i++) {
      const y = r() * S, x = r() * S, len = 40 + r() * 160;
      c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + len / 3, y + (r() - 0.5) * 4, x + len * 2 / 3, y + (r() - 0.5) * 4, x + len, y); c.stroke();
    }
  },
  concrete(c, h, r) {
    this.stucco(c, h, r, '#b9bab6');
    c.strokeStyle = 'rgba(40,40,40,.35)'; c.lineWidth = 3;
    h.strokeStyle = gray(40); h.lineWidth = 4;
    [[0, S / 2, S, S / 2], [S / 2, 0, S / 2, S]].forEach(([a, b, d, e]) => {
      c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke();
      h.beginPath(); h.moveTo(a, b); h.lineTo(d, e); h.stroke();
    });
    [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]].forEach(([x, y]) => {
      c.fillStyle = 'rgba(30,30,30,.55)'; c.beginPath(); c.arc(x * S, y * S, 6, 0, 7); c.fill();
      h.fillStyle = gray(20); h.beginPath(); h.arc(x * S, y * S, 7, 0, 7); h.fill();
    });
  },
  stones(c, h, r) {
    c.fillStyle = '#5f5a54'; c.fillRect(0, 0, S, S);
    h.fillStyle = gray(30); h.fillRect(0, 0, S, S);
    const rows = 4, rh = S / rows;
    for (let y = 0; y < rows; y++) {
      let x = -r() * 60;
      while (x < S) {
        const w = 70 + r() * 110, k = 0.75 + r() * 0.4;
        const base = ['#8c857b', '#9b9387', '#7e786f', '#a39a8b'][Math.floor(r() * 4)];
        const pad = 4 + r() * 3;
        const rx = x + pad, ry = y * rh + pad, rw = w - pad * 2, rhh = rh - pad * 2;
        c.fillStyle = shade(base, k);
        c.beginPath(); c.roundRect(rx, ry, rw, rhh, 14); c.fill();
        c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.roundRect(rx, ry + rhh * 0.65, rw, rhh * 0.35, 12); c.fill();
        h.fillStyle = gray(170 + r() * 70); h.beginPath(); h.roundRect(rx, ry, rw, rhh, 14); h.fill();
        x += w;
      }
    }
    specks(c, r, 7000, 0.08, 2);
    specks(h, r, 9000, 0.3, 2);
  },
  seam(c, h, r, color, ribs) {
    const pw = S / ribs;
    h.fillStyle = gray(100); h.fillRect(0, 0, S, S);
    for (let i = 0; i < ribs; i++) {
      const g = c.createLinearGradient(i * pw, 0, (i + 1) * pw, 0);
      g.addColorStop(0, shade(color, 0.92)); g.addColorStop(0.5, shade(color, 1.06)); g.addColorStop(1, shade(color, 0.9));
      c.fillStyle = g; c.fillRect(i * pw, 0, pw, S);
      c.fillStyle = shade(color, 1.45); c.fillRect(i * pw, 0, 4, S);
      c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(i * pw + 4, 0, 5, S);
      h.fillStyle = gray(255); h.fillRect(i * pw, 0, 6, S);
    }
  },
  tiles(c, h, r, color, cols, rows) {
    const tw = S / cols, th = S / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const k = 0.86 + r() * 0.2;
        const g = c.createLinearGradient(x * tw, 0, (x + 1) * tw, 0);
        g.addColorStop(0, shade(color, 0.55 * k)); g.addColorStop(0.35, shade(color, 1.1 * k));
        g.addColorStop(0.65, shade(color, 1.0 * k)); g.addColorStop(1, shade(color, 0.55 * k));
        c.fillStyle = g; c.fillRect(x * tw, y * th, tw, th);
        const gh = h.createLinearGradient(x * tw, 0, (x + 1) * tw, 0);
        gh.addColorStop(0, gray(40)); gh.addColorStop(0.45, gray(230)); gh.addColorStop(1, gray(40));
        h.fillStyle = gh; h.fillRect(x * tw, y * th, tw, th);
      }
      c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(0, (y + 1) * th - 10, S, 10);
      h.fillStyle = gray(0); h.fillRect(0, (y + 1) * th - 6, S, 6);
    }
    specks(c, r, 3000, 0.05, 2);
  },
  shingles(c, h, r, color, rows, cols) {
    const th = S / rows, tw = S / cols;
    for (let y = 0; y < rows; y++) {
      const off = y % 2 ? tw / 2 : 0;
      for (let x = -1; x <= cols; x++) {
        c.fillStyle = shade(color, 0.78 + r() * 0.4);
        c.fillRect(x * tw + off + 2, y * th, tw - 4, th);
        h.fillStyle = gray(150 + r() * 60);
        h.fillRect(x * tw + off + 2, y * th, tw - 4, th);
      }
      c.fillStyle = 'rgba(0,0,0,.42)'; c.fillRect(0, (y + 1) * th - 7, S, 7);
      h.fillStyle = gray(10); h.fillRect(0, (y + 1) * th - 5, S, 5);
    }
    specks(c, r, 12000, 0.08, 2);
  },
  grass(c, h, r) {
    c.fillStyle = '#6a8848'; c.fillRect(0, 0, S, S);
    h.fillStyle = gray(128); h.fillRect(0, 0, S, S);
    blots(c, r, 30, () => (r() > 0.5 ? '130,155,80' : '60,85,40'), 0.16);
    const cols = ['#5a7a3c', '#6d8c4a', '#7b9858', '#627f42', '#86a061'];
    for (let i = 0; i < 26000; i++) {
      const x = r() * S, y = r() * S;
      c.strokeStyle = cols[Math.floor(r() * cols.length)];
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 3, y - 2 - r() * 4); c.stroke();
    }
    specks(h, r, 20000, 0.4, 2);
  },
  pavers(c, h, r, color) {
    c.fillStyle = '#6f6a63'; c.fillRect(0, 0, S, S);
    h.fillStyle = gray(30); h.fillRect(0, 0, S, S);
    const rows = 12, cols = 6, rh = S / rows, cw = S / cols;
    for (let y = 0; y < rows; y++) {
      const off = y % 2 ? cw / 2 : 0;
      for (let x = -1; x <= cols; x++) {
        c.fillStyle = shade(color, 0.85 + r() * 0.25);
        c.fillRect(x * cw + off + 2, y * rh + 2, cw - 4, rh - 4);
        h.fillStyle = gray(210); h.fillRect(x * cw + off + 2, y * rh + 2, cw - 4, rh - 4);
      }
    }
    specks(c, r, 6000, 0.08, 2);
  },
  deck(c, h, r, color) {
    const n = 7, bh = S / n;
    h.fillStyle = gray(20); h.fillRect(0, 0, S, S);
    for (let i = 0; i < n; i++) {
      c.fillStyle = shade(color, 0.85 + r() * 0.25); c.fillRect(0, i * bh, S, bh - 4);
      c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(0, i * bh + bh - 4, S, 4);
      h.fillStyle = gray(200); h.fillRect(0, i * bh, S, bh - 4);
    }
    c.strokeStyle = 'rgba(50,25,10,.15)';
    for (let i = 0; i < 200; i++) { const y = r() * S; c.beginPath(); c.moveTo(r() * S, y); c.lineTo(r() * S, y + (r() - 0.5) * 3); c.stroke(); }
  },
  asphalt(c, h, r) {
    c.fillStyle = '#55595d'; c.fillRect(0, 0, S, S);
    specks(c, r, 30000, 0.12, 2);
    h.fillStyle = gray(128); h.fillRect(0, 0, S, S);
    specks(h, r, 30000, 0.4, 2);
  }
};

// tw, th — размер плитки в метрах
const SURF = {
  stucco:      { tw: 2, th: 2, bump: 0.6, rough: 0.95, p: (c, h, r) => paint.stucco(c, h, r, '#e8e1d3') },
  stuccoWhite: { tw: 2, th: 2, bump: 0.6, rough: 0.95, p: (c, h, r) => paint.stucco(c, h, r, '#efeeea') },
  brick:       { tw: 1.04, th: 0.6, bump: 1.4, rough: 0.92, p: (c, h, r) => paint.bricks(c, h, r, '#9a4a31', '#c9c0b3', 8, 4) },
  brickSand:   { tw: 1.04, th: 0.6, bump: 1.4, rough: 0.92, p: (c, h, r) => paint.bricks(c, h, r, '#cdab7c', '#ebe3d5', 8, 4) },
  siding:      { tw: 0.9, th: 0.9, bump: 1.6, rough: 0.7, p: (c, h, r) => paint.lap(c, h, r, '#e7e5e0', 5) },
  sidingDark:  { tw: 1.2, th: 1.2, bump: 1.4, rough: 0.7, p: (c, h, r) => paint.battens(c, h, r, '#3a3f44', 6) },
  logs:        { tw: 2, th: 1, bump: 3, rough: 0.85, p: (c, h, r) => paint.logs(c, h, r, '#a26c3a', 5) },
  concrete:    { tw: 2.4, th: 1.2, bump: 0.8, rough: 0.9, p: (c, h, r) => paint.concrete(c, h, r) },
  stone:       { tw: 1.6, th: 0.8, bump: 2.6, rough: 0.95, p: (c, h, r) => paint.stones(c, h, r) },
  metal:       { tw: 1, th: 1, bump: 1.4, rough: 0.42, metal: 0.5, p: (c, h, r) => paint.seam(c, h, r, '#42474d', 2) },
  metalDark:   { tw: 1, th: 1, bump: 1.4, rough: 0.42, metal: 0.5, p: (c, h, r) => paint.seam(c, h, r, '#2b2e32', 2) },
  tile:        { tw: 1.2, th: 0.7, bump: 2.2, rough: 0.6, p: (c, h, r) => paint.tiles(c, h, r, '#8f3b29', 4, 2) },
  shingle:     { tw: 1, th: 1, bump: 1.6, rough: 0.9, p: (c, h, r) => paint.shingles(c, h, r, '#4a3a31', 5, 3) },
  membrane:    { tw: 3, th: 3, bump: 0.3, rough: 0.95, p: (c, h, r) => paint.stucco(c, h, r, '#6d7176') },
  grass:       { tw: 7, th: 7, bump: 0.8, rough: 1, p: (c, h, r) => paint.grass(c, h, r) },
  paver:       { tw: 1.2, th: 1.2, bump: 1.2, rough: 0.9, p: (c, h, r) => paint.pavers(c, h, r, '#b9b1a4') },
  deck:        { tw: 1, th: 1, bump: 1.2, rough: 0.8, p: (c, h, r) => paint.deck(c, h, r, '#9a6a3e') },
  deckDark:    { tw: 1, th: 1, bump: 1.2, rough: 0.8, p: (c, h, r) => paint.deck(c, h, r, '#6a4a36') },
  fence:       { tw: 1, th: 1, bump: 1.2, rough: 0.55, metal: 0.3, p: (c, h, r) => paint.seam(c, h, r, '#5b3e2f', 5) },
  asphalt:     { tw: 4, th: 4, bump: 0.5, rough: 0.95, p: (c, h, r) => paint.asphalt(c, h, r) }
};

const MATS = {};
function canvasTex(cnv, color) {
  const t = new THREE.CanvasTexture(cnv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function surf(kind) {
  if (MATS[kind]) return MATS[kind];
  const s = SURF[kind];
  const a = document.createElement('canvas'), b = document.createElement('canvas');
  a.width = a.height = b.width = b.height = S;
  s.p(a.getContext('2d'), b.getContext('2d'), rnd(hash(kind)));
  const m = new THREE.MeshStandardMaterial({
    map: canvasTex(a, true), bumpMap: canvasTex(b, false), bumpScale: s.bump,
    roughness: s.rough, metalness: s.metal || 0, envMapIntensity: 0.55, side: THREE.DoubleSide
  });
  m.userData.tile = [s.tw, s.th];
  return (MATS[kind] = m);
}
function col(hex, opt = {}) {
  const key = hex + JSON.stringify(opt);
  if (MATS[key]) return MATS[key];
  return (MATS[key] = new THREE.MeshStandardMaterial({ color: hex, roughness: opt.rough ?? 0.6, metalness: opt.metal ?? 0, envMapIntensity: opt.env ?? 0.55, transparent: !!opt.opacity, opacity: opt.opacity ?? 1, side: opt.double ? THREE.DoubleSide : THREE.FrontSide }));
}
let LAMPM = null;
const LAMP = () => LAMPM || (LAMPM = new THREE.MeshStandardMaterial({ color: '#fff6e0', emissive: '#ffd59a', emissiveIntensity: 0.9, roughness: 0.3 }));

// Стекло с «интерьером» за ним: комната и шторы, поверх — отражения окружения
const GLASSES = [];
let glassTurn = 0;
function glass() {
  if (!GLASSES.length) {
    [['#e9dfcc', '#3b342d'], ['#d9e1e6', '#2f3337'], ['#e6d2c0', '#38302a'], ['#f1ece2', '#33302c']].forEach(([curtain, room], n) => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const g = c.getContext('2d');
      const bg = g.createLinearGradient(0, 0, 0, 256);
      bg.addColorStop(0, shade(room, 1.9)); bg.addColorStop(0.18, shade(room, 1.25)); bg.addColorStop(0.7, room); bg.addColorStop(1, shade(room, 0.7));
      g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
      const r = rnd(97 + n * 13);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(70 + r() * 60, 150, 60 + r() * 50, 106);
      [[0, 50 + r() * 20], [256 - 50 - r() * 20, 256]].forEach(([x0, x1]) => {
        for (let x = x0; x < x1; x += 8) {
          g.fillStyle = shade(curtain, 0.82 + ((x / 8) % 2) * 0.18);
          g.fillRect(x, 0, 8, 256);
        }
      });
      const t = canvasTex(c, true);
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      GLASSES.push(new THREE.MeshStandardMaterial({ map: t, metalness: 0.35, roughness: 0.04, envMapIntensity: 1.35 }));
    });
  }
  return GLASSES[glassTurn++ % GLASSES.length];
}

function garageDoorMat(color) {
  const key = 'gdoor' + color;
  if (MATS[key]) return MATS[key];
  const a = document.createElement('canvas'), b = document.createElement('canvas');
  a.width = b.width = 512; a.height = b.height = 440;
  const c = a.getContext('2d'), h = b.getContext('2d');
  c.fillStyle = color; c.fillRect(0, 0, 512, 440);
  h.fillStyle = gray(150); h.fillRect(0, 0, 512, 440);
  for (let i = 0; i < 4; i++) {
    const y = i * 110;
    c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(0, y + 106, 512, 4);
    h.fillStyle = gray(20); h.fillRect(0, y + 106, 512, 4);
    for (let j = 0; j < 4; j++) {
      c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = 3; c.strokeRect(j * 128 + 12, y + 14, 104, 80);
      h.fillStyle = gray(200); h.fillRect(j * 128 + 14, y + 16, 100, 76);
      if (i === 0) { c.fillStyle = '#26323d'; c.fillRect(j * 128 + 22, y + 26, 84, 50); }
    }
  }
  const m = new THREE.MeshStandardMaterial({ map: canvasTex(a, true), bumpMap: canvasTex(b, false), bumpScale: 1.5, roughness: 0.5, envMapIntensity: 0.6 });
  return (MATS[key] = m);
}

function shutterMat(color) {
  const key = 'shut' + color;
  if (MATS[key]) return MATS[key];
  const a = document.createElement('canvas'), b = document.createElement('canvas');
  a.width = b.width = 128; a.height = b.height = 256;
  const c = a.getContext('2d'), h = b.getContext('2d');
  c.fillStyle = color; c.fillRect(0, 0, 128, 256);
  h.fillStyle = gray(200); h.fillRect(0, 0, 128, 256);
  for (let y = 16; y < 240; y += 12) {
    c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(12, y + 8, 104, 4);
    h.fillStyle = gray(40); h.fillRect(12, y + 8, 104, 4);
  }
  c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 4; c.strokeRect(6, 6, 116, 244);
  const m = new THREE.MeshStandardMaterial({ map: canvasTex(a, true), bumpMap: canvasTex(b, false), bumpScale: 1.5, roughness: 0.7, envMapIntensity: 0.5 });
  return (MATS[key] = m);
}

/* ---------------------------------------------------------- геометрия */

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

function tileBox(w, h, d, mat) {
  const g = new THREE.BoxGeometry(w, h, d);
  const t = mat.userData && mat.userData.tile;
  if (t) {
    const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let i = 0; i < uv.count; i++) {
      const f = dims[Math.floor(i / 4)];
      uv.setXY(i, uv.getX(i) * f[0] / t[0], uv.getY(i) * f[1] / t[1]);
    }
  }
  return g;
}

function put(parent, geo, mat, x = 0, y = 0, z = 0, cast = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const box = (parent, w, h, d, mat, x, y, z, cast = true) => put(parent, tileBox(w, h, d, mat), mat, x, y, z, cast);

// Брус от точки a до точки b: сечение w × h
function beam(parent, a, b, w, h, mat, cast = true) {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const m = put(parent, new THREE.BoxGeometry(w, h, len), mat, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, cast);
  m.quaternion.setFromUnitVectors(V3(0, 0, 1), dir.normalize());
  return m;
}
function pipe(parent, a, b, r, mat) {
  const dir = b.clone().sub(a);
  const m = put(parent, new THREE.CylinderGeometry(r, r, dir.length(), 12), mat, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  m.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.normalize());
  return m;
}

// Плоские многоугольники (скаты кровли) с UV по месту: «вниз по скату» — ось v
function polyMesh(parent, faces, mat) {
  const pos = [];
  faces.forEach(q => {
    if (q.length === 3) pos.push(...q[0], ...q[1], ...q[2]);
    else pos.push(...q[0], ...q[1], ...q[2], ...q[0], ...q[2], ...q[3]);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const t = (mat.userData && mat.userData.tile) || [1, 1];
  const uv = [];
  const up = V3(0, 1, 0);
  for (let i = 0; i < pos.length; i += 9) {
    const a = V3(pos[i], pos[i + 1], pos[i + 2]), b = V3(pos[i + 3], pos[i + 4], pos[i + 5]), c = V3(pos[i + 6], pos[i + 7], pos[i + 8]);
    const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    let U = up.clone().cross(n);
    U = U.length() < 1e-3 ? V3(1, 0, 0) : U.normalize();
    const Vv = n.clone().cross(U);
    [a, b, c].forEach(p => uv.push(p.dot(U) / t[0], p.dot(Vv) / t[1]));
  }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return put(parent, g, mat);
}

// Стена-многоугольник в плоскости XY (фронтоны), UV в метрах
function shapeWall(parent, pts, mat) {
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ShapeGeometry(shape);
  const t = (mat.userData && mat.userData.tile) || [1, 1];
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / t[0], uv.getY(i) / t[1]);
  return put(parent, g, mat);
}

/* ------------------------------------------------------------- стиль */

function styleOf(v) {
  const s = v.style;
  const light = { trim: '#f3f1ec', frame: '#f6f5f2' };
  const dark = { trim: '#2c3035', frame: '#2c3035' };
  const wall = {
    gas: s === 'modern' || s === 'hitech' ? 'stuccoWhite' : 'stucco',
    brick: 'brick', ceramic: 'brickSand', wood: 'logs', monolith: 'concrete',
    frame: s === 'barn' || s === 'modern' || s === 'hitech' ? 'sidingDark' : 'siding'
  }[v.mat];
  const base = {
    classic: { ...light, roof: 'tile', shutters: '#8b4b2a', grid: [2, 2], casing: 0.11, head: true, door: '#6a4128', chimney: true, porch: true },
    scandi:  { ...light, roof: 'metal', shutters: null, grid: [1, 2], casing: 0.1, head: false, door: '#2f3439', chimney: true, porch: true },
    chalet:  { trim: '#5c3e27', frame: '#5c3e27', roof: 'shingle', shutters: '#4a3020', grid: [2, 1], casing: 0.11, head: true, door: '#5c3e27', chimney: true, porch: true },
    barn:    { ...dark, roof: 'metalDark', shutters: null, grid: [1, 1], casing: 0.05, head: false, door: '#2c3035', chimney: false, porch: false },
    modern:  { ...dark, roof: 'metal', shutters: null, grid: [1, 1], casing: 0, head: false, door: '#2c3035', chimney: false, porch: false },
    hitech:  { ...dark, roof: 'membrane', shutters: null, grid: [1, 1], casing: 0, head: false, door: '#24282c', chimney: false, porch: false }
  }[s];
  return { ...base, wall, gutter: s === 'classic' || s === 'scandi' ? '#e9e8e4' : '#33373c', big: s === 'modern' || s === 'hitech' };
}

/* -------------------------------------------------------------- детали */

function windowUnit(ww, wh, st, opts = {}) {
  const g = new THREE.Group();
  const trim = col(st.trim, { rough: 0.5 }), frame = col(st.frame, { rough: 0.45 });
  const cw = st.casing, f = 0.07;
  if (cw > 0) {
    box(g, ww + 2 * cw, cw, 0.045, trim, 0, wh / 2 + cw / 2, 0.022);
    box(g, cw, wh, 0.045, trim, -(ww / 2 + cw / 2), 0, 0.022);
    box(g, cw, wh, 0.045, trim, ww / 2 + cw / 2, 0, 0.022);
    if (st.head) box(g, ww + 2 * cw + 0.14, 0.07, 0.09, trim, 0, wh / 2 + cw + 0.035, 0.045);
  }
  box(g, ww, f, 0.09, frame, 0, wh / 2 - f / 2, 0.045);
  box(g, ww, f, 0.09, frame, 0, -wh / 2 + f / 2, 0.045);
  box(g, f, wh - 2 * f, 0.09, frame, -ww / 2 + f / 2, 0, 0.045);
  box(g, f, wh - 2 * f, 0.09, frame, ww / 2 - f / 2, 0, 0.045);
  put(g, new THREE.PlaneGeometry(ww - 2 * f, wh - 2 * f), glass(), 0, 0, 0.03, false);
  const [cols, rows] = opts.grid || st.grid;
  const iw = ww - 2 * f, ih = wh - 2 * f, m = 0.035;
  const vcols = opts.panoramic ? Math.max(1, Math.round(iw / 1.2)) : cols;
  for (let i = 1; i < vcols; i++) box(g, m, ih, 0.06, frame, -iw / 2 + i * iw / vcols, 0, 0.05, false);
  for (let i = 1; i < rows; i++) {
    const y = rows === 2 && st.grid[0] === 1 ? ih / 2 - ih / 3 : -ih / 2 + i * ih / rows;
    box(g, iw, m, 0.06, frame, 0, y, 0.05, false);
  }
  if (!opts.noSill) box(g, ww + 2 * cw + 0.1, 0.05, 0.18, cw > 0 ? trim : col('#9aa0a6', { metal: 0.6, rough: 0.35 }), 0, -wh / 2 - cw * 0.3 - 0.025, 0.09);
  if (st.shutters && !opts.noShutters) {
    const sw = Math.min(ww * 0.5, 0.65), sm = shutterMat(st.shutters);
    [-1, 1].forEach(s => box(g, sw, wh, 0.035, sm, s * (ww / 2 + cw + sw / 2 + 0.03), 0, 0.02));
  }
  return g;
}

function doorUnit(st) {
  const g = new THREE.Group();
  const dw = st.big ? 1.2 : 1.0, dh = 2.25;
  const trim = col(st.trim, { rough: 0.5 });
  const slab = col(st.door, { rough: 0.5 });
  const cw = Math.max(st.casing, 0.06);
  box(g, dw + 2 * cw, cw, 0.05, trim, 0, dh / 2 + cw / 2, 0.025);
  box(g, cw, dh, 0.05, trim, -(dw / 2 + cw / 2), 0, 0.025);
  box(g, cw, dh, 0.05, trim, dw / 2 + cw / 2, 0, 0.025);
  box(g, dw, dh, 0.05, slab, 0, 0, 0.02);
  if (st.big) {
    put(g, new THREE.PlaneGeometry(0.22, dh - 0.3), glass(), -dw / 2 + 0.2, 0, 0.05, false);
    box(g, 0.04, 1.1, 0.06, col('#b8bcc0', { metal: 0.9, rough: 0.25 }), dw / 2 - 0.15, 0, 0.08);
  } else {
    const pm = col(st.door, { rough: 0.45 });
    [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]].forEach(([x, y]) =>
      box(g, dw * 0.32, 0.5, 0.03, pm, x * dw * 0.2, y * 0.62, 0.055));
    put(g, new THREE.SphereGeometry(0.035, 12, 8), col('#c9a96a', { metal: 0.9, rough: 0.3 }), dw / 2 - 0.12, -0.05, 0.09);
  }
  return g;
}

// Ставит элемент на фасад: side = front | back | left | right, u — вдоль фасада
function onFacade(obj, side, u, y, W, L) {
  const e = 0.005;
  if (side === 'front') obj.position.set(u, y, L / 2 + e);
  if (side === 'back') { obj.position.set(-u, y, -L / 2 - e); obj.rotation.y = Math.PI; }
  if (side === 'right') { obj.position.set(W / 2 + e, y, -u); obj.rotation.y = Math.PI / 2; }
  if (side === 'left') { obj.position.set(-W / 2 - e, y, u); obj.rotation.y = -Math.PI / 2; }
  return obj;
}

function steps(parent, x, z, width, top, mat) {
  const n = Math.max(1, Math.round(top / 0.17)), sh = top / n;
  for (let i = 0; i < n; i++) box(parent, width, sh * (n - i), 0.32, mat, x, sh * (n - i) / 2, z + 0.16 + i * 0.32);
}

/* -------------------------------------------------------------- кровля */

function buildRoof(v, st, root, wallMat) {
  const g = v.geo, Y = g.wallTop, o = g.over;
  const W = v.W, L = v.L;
  const rm = surf(st.roof);
  const trim = col(st.trim, { rough: 0.5 });
  const gut = col(st.gutter, { rough: 0.35, metal: 0.3 });

  if (v.roof === 'flat') {
    if (o === 0) {
      box(root, W - 0.3, 0.2, L - 0.3, surf('membrane'), 0, Y + 0.1, 0);
      const ph = 0.6, t = 0.25, cap = col('#a6abb0', { metal: 0.6, rough: 0.35 });
      [[W, t, 0, L / 2 - t / 2], [W, t, 0, -L / 2 + t / 2]].forEach(([w, d, x, z]) => { box(root, w, ph, d, wallMat, x, Y + ph / 2, z); box(root, w + 0.04, 0.05, d + 0.08, cap, x, Y + ph + 0.025, z); });
      [[t, L, W / 2 - t / 2, 0], [t, L, -W / 2 + t / 2, 0]].forEach(([w, d, x, z]) => { box(root, w, ph, d, wallMat, x, Y + ph / 2, z); box(root, w + 0.08, 0.05, d + 0.04, cap, x, Y + ph + 0.025, z); });
    } else {
      box(root, W + 2 * o, 0.34, L + 2 * o, col('#2e3237', { rough: 0.5 }), 0, Y + 0.17, 0);
      box(root, W + 2 * o - 0.1, 0.02, L + 2 * o - 0.1, surf('membrane'), 0, Y + 0.35, 0, false);
    }
    return;
  }

  if (v.roof === 'shed') {
    const s = g.h / L, hw = W / 2 + o, hl = L / 2 + o;
    const yF = Y - o * s, yB = Y + g.h + o * s;
    polyMesh(root, [[[-hw, yF, hl], [hw, yF, hl], [hw, yB, -hl], [-hw, yB, -hl]]], rm);
    const fas = col('#2e3237', { rough: 0.5 });
    beam(root, V3(-hw, yF - 0.1, hl), V3(hw, yF - 0.1, hl), 0.05, 0.25, fas);
    beam(root, V3(-hw, yB - 0.1, -hl), V3(hw, yB - 0.1, -hl), 0.05, 0.25, fas);
    [-1, 1].forEach(sx => beam(root, V3(sx * hw, yF - 0.1, hl), V3(sx * hw, yB - 0.1, -hl), 0.05, 0.25, fas));
    [-1, 1].forEach(sx => {
      const w = shapeWall(root, [[L / 2, Y], [-L / 2, Y], [-L / 2, Y + g.h]], wallMat);
      w.rotation.y = -Math.PI / 2;
      w.position.x = sx * W / 2;
    });
    const back = shapeWall(root, [[-W / 2, Y], [W / 2, Y], [W / 2, Y + g.h], [-W / 2, Y + g.h]], wallMat);
    back.position.z = -L / 2;
    pipe(root, V3(-hw, yF - 0.18, hl + 0.07), V3(hw, yF - 0.18, hl + 0.07), 0.07, gut);
    [-1, 1].forEach(sx => pipe(root, V3(sx * (W / 2 - 0.15), yF - 0.18, L / 2 + 0.1), V3(sx * (W / 2 - 0.15), 0.15, L / 2 + 0.1), 0.045, gut));
    return;
  }

  // Двускатная, мансардная и вальмовая: строим с коньком вдоль локальной X
  const alongZ = v.roof === 'hip' ? L > W : g.ridgeAlongZ;
  const A = alongZ ? L : W;
  const B = alongZ ? W : L;
  const k = g.h / (B / 2);
  const ye = Y - o * k, yr = Y + g.h;
  const ax = A / 2 + o, bz = B / 2 + o;
  const local = new THREE.Group();

  if (v.roof === 'hip') {
    const r = Math.max(0, (A - B) / 2);
    const E1 = [-ax, ye, bz], E2 = [ax, ye, bz], E3 = [ax, ye, -bz], E4 = [-ax, ye, -bz];
    const R1 = [-r, yr, 0], R2 = [r, yr, 0];
    polyMesh(local, [[E1, E2, R2, R1], [E3, E4, R1, R2], [E2, E3, R2], [E4, E1, R1]], rm);
    const ridge = col(st.roof === 'tile' ? '#7a3122' : '#2f3337', { rough: 0.5 });
    if (r > 0) beam(local, V3(-r, yr + 0.04, 0), V3(r, yr + 0.04, 0), 0.28, 0.12, ridge);
    [[E1, R1], [E2, R2], [E3, R2], [E4, R1]].forEach(([e, rr]) => beam(local, V3(...e).setY(e[1] + 0.04), V3(...rr).setY(yr + 0.04), 0.22, 0.1, ridge));
    // карниз, софиты и водостоки по периметру
    [[V3(-ax, ye - 0.1, bz), V3(ax, ye - 0.1, bz)], [V3(ax, ye - 0.1, -bz), V3(-ax, ye - 0.1, -bz)],
     [V3(ax, ye - 0.1, bz), V3(ax, ye - 0.1, -bz)], [V3(-ax, ye - 0.1, -bz), V3(-ax, ye - 0.1, bz)]].forEach(([a, b]) => {
      beam(local, a, b, 0.05, 0.22, trim);
      const out = V3(Math.sign(a.x + b.x) * 0.07, 0, Math.sign(a.z + b.z) * 0.07);
      pipe(local, a.clone().add(out).setY(ye - 0.16), b.clone().add(out).setY(ye - 0.16), 0.07, gut);
    });
    if (o > 0.2) {
      [1, -1].forEach(s => box(local, 2 * ax, 0.03, o, trim, 0, ye - 0.2, s * (B / 2 + o / 2)));
      [1, -1].forEach(s => box(local, o, 0.03, B, trim, s * (A / 2 + o / 2), ye - 0.2, 0));
    }
  } else {
    polyMesh(local, [
      [[-ax, ye, bz], [ax, ye, bz], [ax, yr, 0], [-ax, yr, 0]],
      [[ax, ye, -bz], [-ax, ye, -bz], [-ax, yr, 0], [ax, yr, 0]]
    ], rm);
    const ridge = col(st.roof === 'tile' ? '#7a3122' : '#2f3337', { rough: 0.5 });
    beam(local, V3(-ax, yr + 0.04, 0), V3(ax, yr + 0.04, 0), 0.3, 0.12, ridge);
    [1, -1].forEach(s => {
      beam(local, V3(-ax, ye - 0.1, s * bz), V3(ax, ye - 0.1, s * bz), 0.05, 0.22, trim);
      pipe(local, V3(-ax, ye - 0.16, s * (bz + 0.07)), V3(ax, ye - 0.16, s * (bz + 0.07)), 0.07, gut);
      if (o > 0.2) box(local, 2 * ax, 0.03, o, trim, 0, ye - 0.2, s * (B / 2 + o / 2));
      // торцевые доски вдоль фронтонов
      [1, -1].forEach(sx => beam(local, V3(sx * ax, ye - 0.05, s * bz), V3(sx * ax, yr, 0), 0.06, 0.24, trim));
    });
    // фронтоны и окна на них
    const attic = v.roof === 'mansard';
    [-1, 1].forEach(sx => {
      const w = shapeWall(local, [[B / 2, Y], [-B / 2, Y], [0, Y + g.h]], wallMat);
      w.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      w.position.x = sx * A / 2;
      if (g.h < 1.4) return;
      const wh = attic ? Math.min(1.45, g.h * 0.45) : 0.7;
      const ww = attic ? Math.min(1.3, B * 0.16) : 0.7;
      const count = attic && v.style === 'barn' && B >= 7 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const win = windowUnit(ww, wh, st, { noShutters: !attic, grid: attic ? null : [1, 1] });
        const zz = count === 1 ? 0 : (i ? 1 : -1) * B * 0.17;
        win.position.set(sx * (A / 2 + 0.005), Y + (attic ? 0.9 + wh / 2 : g.h * 0.45), zz * sx);
        win.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
        local.add(win);
      }
    });
    // водосточные трубы
    [1, -1].forEach(s => [1, -1].forEach(sx => pipe(local, V3(sx * (A / 2 - 0.12), ye - 0.16, s * (B / 2 + 0.12)), V3(sx * (A / 2 - 0.12), 0.12, s * (B / 2 + 0.12)), 0.045, gut)));
    if (attic) dormers(local, v, st, A, B, Y, g.h, wallMat, rm);
  }

  if (st.chimney) {
    const ch = g.h + 1.1, cx = A * 0.28, cz = -0.5;
    box(local, 0.72, ch, 0.72, surf('brick'), cx, Y + ch / 2, cz);
    box(local, 0.86, 0.08, 0.86, col('#8c9095', { rough: 0.6 }), cx, Y + ch + 0.04, cz);
    box(local, 0.3, 0.25, 0.3, col('#3a3d40'), cx, Y + ch + 0.2, cz);
  }
  if (alongZ) local.rotation.y = Math.PI / 2;
  root.add(local);
}

// Слуховые окна мансарды на обоих скатах (в локальной системе «конёк вдоль X»)
function dormers(local, v, st, A, B, Y, h, wallMat, rm) {
  const half = B / 2;
  const zf = half - 1.0;
  const yb = Y + h * (1 - zf / half);
  const dh = 1.5, rise = 0.6, dw = 1.9;
  const yt = yb + dh;
  if (yt + rise > Y + h - 0.35 || A < 7) return;
  const zb = Math.max(0.3, half * (1 - (yt + rise - Y) / h));
  const xs = A >= 11 ? [-A * 0.24, A * 0.24] : [0];
  const trim = col(st.trim, { rough: 0.5 });
  [1, -1].forEach(sgn => xs.forEach(x => {
    const d = new THREE.Group();
    const depth = zf - zb;
    box(d, dw, dh + 1.0, depth, wallMat, x, yb - 1.0 + (dh + 1.0) / 2, zb + depth / 2);
    const ho = 0.18, s = rise / (dw / 2);
    const zF = zf + 0.25;
    polyMesh(d, [
      [[x - dw / 2 - ho, yt - ho * s, zF], [x, yt + rise, zF], [x, yt + rise, zb], [x - dw / 2 - ho, yt - ho * s, zb]],
      [[x, yt + rise, zF], [x + dw / 2 + ho, yt - ho * s, zF], [x + dw / 2 + ho, yt - ho * s, zb], [x, yt + rise, zb]]
    ], rm);
    const gw = shapeWall(d, [[x - dw / 2, yt], [x + dw / 2, yt], [x, yt + rise]], wallMat);
    gw.position.z = zf;
    [-1, 1].forEach(sx => beam(d, V3(x + sx * (dw / 2 + ho), yt - ho * s - 0.04, zF), V3(x, yt + rise, zF), 0.05, 0.18, trim));
    const win = windowUnit(1.0, 1.1, st, { noShutters: true });
    win.position.set(x, yb + 0.3 + 0.55, zf + 0.005);
    d.add(win);
    if (sgn < 0) d.rotation.y = Math.PI;
    local.add(d);
  }));
}

/* ------------------------------------------------------------ дом целиком */

function buildHouse(v) {
  const st = styleOf(v);
  const W = v.W, L = v.L, g = v.geo;
  const { PLINTH, FLOOR_H, GARAGE_W, TERRACE_D } = D;
  const house = new THREE.Group();
  const wallMat = surf(st.wall);
  const trim = col(st.trim, { rough: 0.5 });

  // цоколь и стены
  box(house, W + 0.14, PLINTH, L + 0.14, surf('stone'), 0, PLINTH / 2, 0);
  box(house, W + 0.2, 0.05, L + 0.2, col('#b8b4ac', { rough: 0.8 }), 0, PLINTH + 0.025, 0);
  const wallH = g.wallTop - PLINTH;
  box(house, W, wallH, L, wallMat, 0, PLINTH + wallH / 2, 0);
  if (st.wall === 'siding' || st.wall === 'logs') {
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) =>
      box(house, 0.13, wallH, 0.13, st.wall === 'logs' ? surf('logs') : trim, sx * (W / 2 - 0.05), PLINTH + wallH / 2, sz * (L / 2 - 0.05)));
  }
  if (v.floors >= 2 && (v.style === 'classic' || v.style === 'chalet' || v.style === 'scandi')) {
    for (let f = 1; f < v.floors; f++) box(house, W + 0.08, 0.16, L + 0.08, trim, 0, PLINTH + f * FLOOR_H, 0);
  }

  // окна и дверь
  const full = v.floors === 1.5 ? 1 : v.floors;
  const doorAt = D.doorU(W);
  ['front', 'back', 'left', 'right'].forEach(side => {
    const len = side === 'front' || side === 'back' ? W : L;
    const slots = D.facadeSlots(len);
    for (let f = 0; f < full; f++) {
      if (side === 'right' && f === 0 && v.garage) continue;
      for (let i = 0; i < slots.n; i++) {
        const u = slots.at(i), base = PLINTH + f * FLOOR_H;
        if (side === 'front' && f === 0 && i === slots.door) {
          house.add(onFacade(doorUnit(st), 'front', u, base + 1.125, W, L));
          // бра по сторонам двери
          [-1, 1].forEach(s => {
            const lamp = new THREE.Group();
            box(lamp, 0.16, 0.26, 0.14, col('#26292c', { rough: 0.4, metal: 0.6 }), 0, 0, 0.07);
            box(lamp, 0.11, 0.18, 0.1, LAMP(), 0, 0, 0.1, false);
            house.add(onFacade(lamp, 'front', u + s * ((st.big ? 1.2 : 1.0) / 2 + 0.38), base + 1.95, W, L));
          });
          continue;
        }
        const pano = st.big && (side === 'front' || side === 'back');
        const ww = pano ? Math.min(2.6, len / slots.n - 0.7) : v.style === 'barn' ? 1.0 : 1.2;
        const wh = pano ? 2.3 : v.style === 'barn' ? 1.9 : 1.45;
        const sill = pano ? 0.25 : 0.85;
        house.add(onFacade(windowUnit(ww, wh, st, { panoramic: pano }), side, u, base + sill + wh / 2, W, L));
      }
    }
  });

  buildRoof(v, st, house, wallMat);

  // крыльцо / терраса
  if (v.terrace) {
    const tw = Math.min(W * 0.7, 7), td = TERRACE_D, z0 = L / 2;
    box(house, tw, PLINTH - 0.04, td, surf('stone'), 0, (PLINTH - 0.04) / 2, z0 + td / 2);
    box(house, tw + 0.06, 0.06, td + 0.06, surf(st.big ? 'deckDark' : 'deck'), 0, PLINTH - 0.02, z0 + td / 2);
    steps(house, doorAt, z0 + td, 1.6, PLINTH, col('#a29c92', { rough: 0.85 }));
    if (st.porch) {
      const ph = 2.75, post = col(st.trim, { rough: 0.5 });
      const xs = tw > 5 ? [-tw / 2 + 0.15, 0, tw / 2 - 0.15] : [-tw / 2 + 0.15, tw / 2 - 0.15];
      const cols = xs.filter(x => Math.abs(x - doorAt) > 0.9 || xs.length === 2);
      cols.forEach(x => {
        box(house, 0.17, ph, 0.17, post, x, PLINTH + ph / 2, z0 + td - 0.15);
        box(house, 0.26, 0.12, 0.26, post, x, PLINTH + 0.06, z0 + td - 0.15);
        box(house, 0.26, 0.1, 0.26, post, x, PLINTH + ph - 0.05, z0 + td - 0.15);
      });
      // перила с балясинами, проход напротив двери
      const rail = (x0, z0r, x1, z1r) => {
        const a = V3(x0, 0, z0r), b = V3(x1, 0, z1r), len = a.distanceTo(b);
        if (len < 0.3) return;
        beam(house, a.clone().setY(PLINTH + 0.95), b.clone().setY(PLINTH + 0.95), 0.08, 0.06, post);
        beam(house, a.clone().setY(PLINTH + 0.12), b.clone().setY(PLINTH + 0.12), 0.06, 0.05, post);
        const n = Math.floor(len / 0.13);
        const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 0.8, 0.04), post, n);
        const m4 = new THREE.Matrix4();
        for (let i = 0; i < n; i++) {
          const p = a.clone().lerp(b, (i + 0.5) / n);
          m4.makeTranslation(p.x, PLINTH + 0.54, p.z);
          inst.setMatrixAt(i, m4);
        }
        inst.castShadow = true;
        house.add(inst);
      };
      const zf = z0 + td - 0.15, gap = 0.85;
      rail(-tw / 2 + 0.15, zf, doorAt - gap, zf);
      rail(doorAt + gap, zf, tw / 2 - 0.15, zf);
      rail(-tw / 2 + 0.15, z0 + 0.05, -tw / 2 + 0.15, zf);
      rail(tw / 2 - 0.15, z0 + 0.05, tw / 2 - 0.15, zf);
      // навес крыльца
      const yh = PLINTH + ph + 0.45, yl = PLINTH + ph + 0.05, ov = 0.3;
      polyMesh(house, [[[-tw / 2 - ov, yl, z0 + td + ov], [tw / 2 + ov, yl, z0 + td + ov], [tw / 2 + ov, yh, z0], [-tw / 2 - ov, yh, z0]]], surf(st.roof === 'membrane' ? 'metal' : st.roof));
      box(house, tw + 0.1, 0.22, 0.06, trim, 0, yl - 0.08, z0 + td - 0.12);
      box(house, tw, 0.03, td, trim, 0, yl - 0.18, z0 + td / 2);
      pipe(house, V3(-tw / 2 - ov, yl - 0.1, z0 + td + ov + 0.06), V3(tw / 2 + ov, yl - 0.1, z0 + td + ov + 0.06), 0.06, col(st.gutter, { rough: 0.35, metal: 0.3 }));
    } else {
      // современная терраса: стеклянное ограждение и консольный козырёк
      const gl = col('#a9c6d6', { opacity: 0.28, rough: 0.05, metal: 0.2, env: 1.2, double: true });
      const zf = z0 + td - 0.05;
      [[-tw / 2, doorAt - 0.85], [doorAt + 0.85, tw / 2]].forEach(([a, b]) => { if (b - a > 0.3) box(house, b - a, 1.0, 0.02, gl, (a + b) / 2, PLINTH + 0.5, zf, false); });
      [-1, 1].forEach(s => box(house, 0.02, 1.0, td - 0.1, gl, s * (tw / 2 - 0.02), PLINTH + 0.5, z0 + td / 2, false));
      box(house, 2.6, 0.16, 1.5, col('#2e3237', { rough: 0.5 }), doorAt, PLINTH + 2.75, z0 + 0.75);
    }
  } else {
    steps(house, doorAt, L / 2, 1.5, PLINTH, col('#a29c92', { rough: 0.85 }));
    const cz = L / 2 + 0.55;
    if (st.porch) {
      polyMesh(house, [[[doorAt - 0.9, PLINTH + 2.6, L / 2 + 1.1], [doorAt + 0.9, PLINTH + 2.6, L / 2 + 1.1], [doorAt + 0.9, PLINTH + 2.95, L / 2], [doorAt - 0.9, PLINTH + 2.95, L / 2]]], surf(st.roof === 'membrane' ? 'metal' : st.roof));
      [-1, 1].forEach(s => beam(house, V3(doorAt + s * 0.8, PLINTH + 2.2, L / 2), V3(doorAt + s * 0.8, PLINTH + 2.62, L / 2 + 0.9), 0.08, 0.08, trim));
    } else {
      box(house, 1.9, 0.14, 1.1, col('#2e3237', { rough: 0.5 }), doorAt, PLINTH + 2.6, cz);
    }
  }

  // гараж
  if (v.garage) {
    const G = GARAGE_W, gd = v.gd, gh = 3.0, fl = 0.15;
    const gx = W / 2 + G / 2, gz = L / 2 - gd / 2;
    box(house, G + 0.1, fl, gd + 0.1, col('#9d9a94', { rough: 0.9 }), gx, fl / 2, gz);
    box(house, G, gh, gd, wallMat, gx, fl + gh / 2, gz);
    const door = put(house, new THREE.PlaneGeometry(2.7, 2.25), garageDoorMat(st.big || v.style === 'barn' ? '#3a3f45' : '#f2f1ee'), gx, fl + 1.125, L / 2 + 0.012, false);
    door.receiveShadow = true;
    const cw = 0.1;
    box(house, 2.7 + 2 * cw, cw, 0.05, trim, gx, fl + 2.25 + cw / 2, L / 2 + 0.025);
    [-1, 1].forEach(s => box(house, cw, 2.25, 0.05, trim, gx + s * (1.35 + cw / 2), fl + 1.125, L / 2 + 0.025));
    const flat = st.big || v.roof === 'flat';
    if (flat) {
      box(house, G + 0.5, 0.3, gd + 0.5, col('#2e3237', { rough: 0.5 }), gx, fl + gh + 0.15, gz);
    } else {
      const o = 0.35, y1 = fl + gh + 0.55, y0 = fl + gh;
      const s = (y1 - y0) / G;
      polyMesh(house, [[[W / 2, y1, gz - gd / 2 - o], [W / 2, y1, gz + gd / 2 + o], [W / 2 + G + o, y0 - o * s, gz + gd / 2 + o], [W / 2 + G + o, y0 - o * s, gz - gd / 2 - o]]], surf(st.roof === 'membrane' ? 'metal' : st.roof));
      [1, -1].forEach(sz => {
        const tri = shapeWall(house, [[W / 2, y0], [W / 2 + G, y0], [W / 2, y1]], wallMat);
        tri.position.z = gz + sz * gd / 2;
      });
      beam(house, V3(W / 2 + G + o, y0 - o * s - 0.1, gz - gd / 2 - o), V3(W / 2 + G + o, y0 - o * s - 0.1, gz + gd / 2 + o), 0.05, 0.22, trim);
      const gut = col(st.gutter, { rough: 0.35, metal: 0.3 });
      pipe(house, V3(W / 2 + G + o + 0.07, y0 - o * s - 0.16, gz - gd / 2 - o), V3(W / 2 + G + o + 0.07, y0 - o * s - 0.16, gz + gd / 2 + o), 0.07, gut);
      pipe(house, V3(W / 2 + G + 0.12, y0 - 0.2, L / 2 + 0.12), V3(W / 2 + G + 0.12, 0.1, L / 2 + 0.12), 0.045, gut);
    }
    if (gd >= 5) house.add(onFacade(windowUnit(0.9, 0.6, st, { noShutters: true, grid: [1, 1] }), 'right', -gz, fl + 2.1, W + 2 * G, L));
  }

  return house;
}

/* -------------------------------------------------------------- участок */

function tree(parent, x, z, s, r) {
  const t = new THREE.Group();
  if (r() > 0.45) {
    put(t, new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 2.2 * s, 8), col('#5b4130', { rough: 0.9 }), 0, 1.1 * s, 0);
    const leaf = col(['#4e7a34', '#5a8a3b', '#47702f'][Math.floor(r() * 3)], { rough: 0.85 });
    for (let i = 0; i < 5; i++) {
      const m = put(t, new THREE.IcosahedronGeometry((0.9 + r() * 0.6) * s, 1), leaf, (r() - 0.5) * 1.4 * s, (2.6 + r() * 1.3) * s, (r() - 0.5) * 1.4 * s);
      m.scale.y = 0.85;
    }
  } else {
    put(t, new THREE.CylinderGeometry(0.1 * s, 0.15 * s, 1.2 * s, 8), col('#4a3627', { rough: 0.9 }), 0, 0.6 * s, 0);
    const leaf = col('#2f5a33', { rough: 0.85 });
    [[1.5, 2.2, 1.6], [1.15, 1.9, 2.8], [0.8, 1.6, 3.9]].forEach(([rad, h, y]) => put(t, new THREE.ConeGeometry(rad * s, h * s, 10), leaf, 0, y * s, 0));
  }
  t.position.set(x, 0, z);
  parent.add(t);
}

function buildSite(v, pos) {
  const { GARAGE_W } = D;
  const site = new THREE.Group();
  const pw = v.plot.w, pl = v.plot.l;
  const r = rnd(hash(v.p.id) + 11);

  const road = put(site, new THREE.PlaneGeometry(400, 7), surf('asphalt'), 0, 0.015, pl / 2 + 5, false);
  road.rotation.x = -Math.PI / 2;
  road.geometry.attributes.uv.array.forEach((_, i, arr) => { arr[i] *= i % 2 ? 7 / 4 : 400 / 4; });
  box(site, 400, 0.15, 0.3, col('#b5b2ab', { rough: 0.9 }), 0, 0.075, pl / 2 + 1.35);

  // забор из профнастила на столбах, проём под ворота и калитку
  const fm = surf('fence'), postM = col('#3a3330', { rough: 0.7 });
  const fh = 1.8;
  const seg = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    if (len < 0.2) return;
    const m = box(site, len, fh, 0.03, fm, (x0 + x1) / 2, fh / 2 + 0.05, (z0 + z1) / 2);
    m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    const n = Math.max(1, Math.round(len / 2.5));
    for (let i = 0; i <= n; i++) box(site, 0.08, fh + 0.15, 0.08, postM, x0 + (x1 - x0) * i / n, (fh + 0.15) / 2, z0 + (z1 - z0) * i / n);
  };
  seg(-pw / 2, -pl / 2, pw / 2, -pl / 2);
  seg(-pw / 2, -pl / 2, -pw / 2, pl / 2);
  seg(pw / 2, -pl / 2, pw / 2, pl / 2);
  const gateX = pos.rot ? 0 : pos.toWorld(D.doorU(v.W), 0)[0];
  const g0 = Math.max(-pw / 2, gateX - 0.8);
  const g1 = Math.min(pw / 2, gateX + 0.8 + (v.garage && !pos.rot ? GARAGE_W + 1.5 : 0));
  seg(-pw / 2, pl / 2, g0, pl / 2);
  seg(g1, pl / 2, pw / 2, pl / 2);

  // дорожки из брусчатки
  const pv = surf('paver');
  if (!pos.rot) {
    const front = pos.rects.find(rc => rc.k === (v.terrace ? 'terrace' : 'house')).z1 + (v.terrace ? 0.3 * 3 : 0.9);
    const len = pl / 2 + 1.2 - front;
    if (len > 0.2) box(site, 1.4, 0.04, len, pv, gateX, 0.02, front + len / 2, false);
    if (v.garage) {
      const gr = pos.rects.find(rc => rc.k === 'garage');
      const glen = pl / 2 + 1.2 - gr.z1;
      box(site, 3.3, 0.04, glen, pv, (gr.x0 + gr.x1) / 2, 0.021, gr.z1 + glen / 2, false);
    }
  }
  // отмостка вокруг дома
  const h = pos.rects[0];
  box(site, h.x1 - h.x0 + 1.4, 0.03, h.z1 - h.z0 + 1.4, pv, (h.x0 + h.x1) / 2, 0.015, (h.z0 + h.z1) / 2, false);

  // деревья и кусты там, где свободно
  const hb = pos.rects.reduce((a, rc) => ({ x0: Math.min(a.x0, rc.x0), x1: Math.max(a.x1, rc.x1), z0: Math.min(a.z0, rc.z0), z1: Math.max(a.z1, rc.z1) }), { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 });
  const free = (x, z, m) => x < hb.x0 - m || x > hb.x1 + m || z < hb.z0 - m || z > hb.z1 + m + 2;
  [[-pw / 2 + 2, -pl / 2 + 2, 1], [pw / 2 - 2, -pl / 2 + 2.2, 0.9], [-pw / 2 + 1.8, pl / 2 - 2.5, 0.75], [pw / 2 - 1.8, 0, 0.8]].forEach(([x, z, s]) => {
    if (free(x, z, 2.2) && Math.abs(x - gateX) > 2) tree(site, x, z, s, r);
  });
  [[-pw / 2 + 25, pl / 2 + 14, 1.3], [pw / 2 + 8, -pl / 2 - 6, 1.4], [-pw / 2 - 9, -pl / 2 + 4, 1.2], [pw / 2 + 12, pl / 2 + 15, 1.1]].forEach(([x, z, s]) => tree(site, x, z, s, r));
  // клумбы вдоль фасада: мульча, кусты и цветы
  const bush = col('#4f7d36', { rough: 0.9 });
  if (!pos.rot) {
    const z = h.z1 + 1.15;
    const flowers = [];
    let bed = null;
    const flushBed = x1 => {
      if (bed !== null && x1 - bed > 0.8) box(site, x1 - bed, 0.08, 0.9, col('#4a3426', { rough: 1 }), (bed + x1) / 2, 0.04, z, false);
      bed = null;
    };
    for (let x = h.x0 + 0.5; x < h.x1 - 0.3; x += 0.55) {
      const blocked = Math.abs(x - gateX) < 1.4 || (v.terrace && Math.abs(x - (h.x0 + h.x1) / 2) < pos.tw / 2 + 0.3);
      if (blocked) { flushBed(x - 0.3); continue; }
      if (bed === null) bed = x - 0.3;
      if (Math.round((x - h.x0) / 0.55) % 3 === 0) {
        const b = put(site, new THREE.IcosahedronGeometry(0.38 + r() * 0.12, 1), bush, x, 0.34, z);
        b.scale.y = 0.8;
      } else for (let k = 0; k < 7; k++) flowers.push([x + (r() - 0.5) * 0.5, z + (r() - 0.5) * 0.7]);
    }
    flushBed(h.x1 - 0.2);
    if (flowers.length) {
      const fm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.07, 0), col('#ffffff', { rough: 0.7 }), flowers.length);
      const palette = ['#d9475a', '#f2c94c', '#f5f1e8', '#9b6ad1', '#ef8a3c'].map(c => new THREE.Color(c));
      const m4 = new THREE.Matrix4();
      flowers.forEach(([x, zz], i) => {
        m4.makeTranslation(x, 0.18 + r() * 0.12, zz);
        fm.setMatrixAt(i, m4);
        fm.setColorAt(i, palette[Math.floor(r() * palette.length)]);
      });
      site.add(fm);
    }
    // фонари вдоль дорожки
    const front = pos.rects.find(rc => rc.k === (v.terrace ? 'terrace' : 'house')).z1 + 1.2;
    for (let zz = front + 0.6; zz < pl / 2 - 0.4; zz += 3.2) {
      [-1, 1].forEach(s => {
        const x = gateX + s * 1.0;
        put(site, new THREE.CylinderGeometry(0.035, 0.05, 0.75, 8), col('#26292c', { rough: 0.4, metal: 0.6 }), x, 0.375, zz);
        box(site, 0.16, 0.2, 0.16, LAMP(), x, 0.85, zz, false);
        box(site, 0.22, 0.04, 0.22, col('#26292c', { rough: 0.4, metal: 0.6 }), x, 0.97, zz);
      });
    }
  }
  return site;
}

/* ------------------------------------------------------------ сцена */

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#8fb3d9'); gr.addColorStop(0.55, '#c9dbeb'); gr.addColorStop(1, '#eef2f4');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const HORIZON = '#dfe7ee';

// Небо с облаками на куполе
function skyDome() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#6f9fd2'); gr.addColorStop(0.6, '#a9c6e4'); gr.addColorStop(1, HORIZON);
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = HORIZON; g.fillRect(0, 256, 1024, 256);
  const r = rnd(4242);
  for (let i = 0; i < 70; i++) {
    const x = r() * 1024, y = 90 + r() * 150, rx = 30 + r() * 90, ry = rx * (0.22 + r() * 0.15);
    for (const dx of [-1024, 0, 1024]) {
      for (let k = 0; k < 6; k++) {
        const cx = x + dx + (r() - 0.5) * rx, cy = y + (r() - 0.5) * ry * 0.8, rr = rx * (0.35 + r() * 0.4);
        const cg = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
        cg.addColorStop(0, 'rgba(255,255,255,.55)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = cg;
        g.save(); g.translate(cx, cy); g.scale(1, ry / rx); g.translate(-cx, -cy);
        g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
        g.restore();
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, depthWrite: false }));
  m.renderOrder = -1;
  return m;
}

// Полоса леса на горизонте, чтобы земля не обрывалась пустым краем
function horizonForest() {
  const grp = new THREE.Group();
  const r = rnd(777);
  const n = 220;
  const cone = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 7), col('#3d5f38', { rough: 0.95 }), n);
  const blob = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), col('#577f42', { rough: 0.95 }), n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = V3(1, 1, 1);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = 150 + r() * 70;
    const h = 6 + r() * 7;
    m4.compose(V3(Math.cos(a) * d, h / 2, Math.sin(a) * d), q, s.set(h * 0.32, h, h * 0.32));
    cone.setMatrixAt(i, m4);
    const a2 = r() * Math.PI * 2, d2 = 145 + r() * 75, rad = 2.5 + r() * 3;
    m4.compose(V3(Math.cos(a2) * d2, rad * 1.1, Math.sin(a2) * d2), q, s.set(rad, rad * 1.2, rad));
    blob.setMatrixAt(i, m4);
  }
  grp.add(cone, blob);
  return grp;
}

function createRenderer(canvas, w, h, pr) {
  const renderer = new THREE.WebGLRenderer({ canvas: canvas || undefined, antialias: true, preserveDrawingBuffer: !!canvas });
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  return renderer;
}

function createScene(renderer) {
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pm.dispose();
  scene.background = skyTexture();
  scene.fog = new THREE.Fog(HORIZON, 110, 340);
  scene.add(skyDome(), horizonForest());
  scene.add(new THREE.HemisphereLight('#eaf2ff', '#5f6f4c', 0.45));
  const sun = new THREE.DirectionalLight('#fff0d8', 2.6);
  sun.position.set(26, 38, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  sun.shadow.radius = 6;
  sun.shadow.blurSamples = 16;
  scene.add(sun, sun.target);
  const ground = put(scene, new THREE.PlaneGeometry(700, 700), surf('grass'), 0, 0, 0, false);
  ground.rotation.x = -Math.PI / 2;
  ground.geometry.attributes.uv.array.forEach((_, i, arr) => { arr[i] *= 700 / 7; });
  return { scene, sun };
}

function fitSun(sun, center, radius) {
  sun.target.position.copy(center);
  sun.position.copy(center).add(V3(0.55, 0.8, 0.6).multiplyScalar(radius * 2 + 20));
  const c = sun.shadow.camera;
  c.left = c.bottom = -radius; c.right = c.top = radius;
  c.near = 1; c.far = radius * 4 + 60;
  c.updateProjectionMatrix();
}

function makeComposer(renderer, scene, camera, w, h) {
  // MSAA-буфер: без него после постобработки края идут «лесенкой»
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
  const comp = new EffectComposer(renderer, rt);
  comp.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, w, h, undefined, { radius: 0.7, distanceExponent: 1.2, thickness: 1.5, scale: 1.2, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
  ao.blendIntensity = 1;
  comp.addPass(ao);
  comp.addPass(new OutputPass());
  return comp;
}

function dispose(obj) {
  obj.traverse(o => { if (o.geometry) o.geometry.dispose(); });
}

// Камера: front, corner, top, plot
function camPose(kind, center, size, rot) {
  const d = Math.max(size.x, size.z, size.y * 1.6) * 1.3 + 4;
  const target = V3(center.x, Math.min(center.y, size.y * 0.42), center.z);
  const front = rot ? V3(1, 0, 0) : V3(0, 0, 1);
  const side = rot ? V3(0, 0, -1) : V3(1, 0, 0);
  let p;
  if (kind === 'front') p = target.clone().addScaledVector(front, d).add(V3(0, size.y * 0.35 + d * 0.16, 0));
  else if (kind === 'top') p = V3(center.x, d * 1.5, center.z + 0.01);
  else if (kind === 'plot') {
    const pd = Math.max(d * 1.6, 30);
    p = V3(0, pd * 0.7, 0).addScaledVector(front, pd * 0.8).addScaledVector(side, pd * 0.45);
    target.set(0, 0, 0);
  } else p = target.clone().addScaledVector(front, d * 0.8).addScaledVector(side, d * 0.6).add(V3(0, d * 0.22, 0));
  return { p, target };
}

/* -------------------------------------------------------- основной вид */

function ensureMain() {
  if (main) return main;
  const pane = D.pane;
  const pr = Math.min(window.devicePixelRatio || 1, 1.75);
  const renderer = createRenderer(null, 10, 10, pr);
  pane.prepend(renderer.domElement);
  const { scene, sun } = createScene(renderer);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 600);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.minDistance = 4;
  controls.maxDistance = 160;
  let comp = null;
  try { comp = makeComposer(renderer, scene, camera, 10, 10); } catch (e) { console.warn('GTAO недоступен', e); }

  main = { renderer, scene, sun, camera, controls, comp, root: null, running: false };
  const resize = () => {
    const w = pane.clientWidth, h = pane.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    if (comp) comp.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  let queued = false;
  const frame = () => {
    queued = false;
    if (!main.running) return;
    controls.update();
    if (comp) comp.render(); else renderer.render(scene, camera);
  };
  main.request = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  main.resize = resize;
  controls.addEventListener('change', main.request);
  new ResizeObserver(() => { resize(); main.request(); }).observe(pane);
  return main;
}

export function show(v) {
  const m = ensureMain();
  if (m.root) { m.scene.remove(m.root); dispose(m.root); }
  const pos = D.placement(v);
  const root = new THREE.Group();
  const house = buildHouse(v);
  house.position.set(pos.cx, 0, pos.cz);
  if (pos.rot) house.rotation.y = Math.PI / 2;
  root.add(house, buildSite(v, pos));
  m.scene.add(root);
  m.root = root;
  const hb = new THREE.Box3().setFromObject(house);
  m.center = hb.getCenter(V3());
  m.size = hb.getSize(V3());
  m.rot = pos.rot;
  fitSun(m.sun, V3(0, 0, 0), Math.max(v.plot.w, v.plot.l) / 2 + 8);
  setCam('corner');
}

export function setCam(kind) {
  if (!main || !main.center) return;
  const { p, target } = camPose(kind, main.center, main.size, main.rot);
  main.camera.position.copy(p);
  main.controls.target.copy(target);
  main.controls.update();
  main.request();
}

export function start() { const m = ensureMain(); m.running = true; m.resize(); m.request(); }
export function stop() { if (main) main.running = false; }

/* ---------------------------------------------------- превью карточек */

function ensureShots() {
  if (shots) return shots;
  const w = 640, h = 400;
  const canvas = document.createElement('canvas');
  const renderer = createRenderer(canvas, w, h, 1);
  const { scene, sun } = createScene(renderer);
  scene.fog = new THREE.Fog(HORIZON, 100, 320);
  const camera = new THREE.PerspectiveCamera(32, w / h, 0.1, 400);
  let comp = null;
  try { comp = makeComposer(renderer, scene, camera, w, h); } catch (e) { /* без AO */ }
  shots = { renderer, scene, sun, camera, comp, canvas };
  return shots;
}

export async function thumb(v) {
  const key = [v.p.id, v.W, v.L, v.floors, v.mat, v.roof, v.garage].join('|');
  if (shotCache.has(key)) return shotCache.get(key);
  const s = ensureShots();
  const house = buildHouse(v);
  s.scene.add(house);
  const hb = new THREE.Box3().setFromObject(house);
  const c = hb.getCenter(V3()), size = hb.getSize(V3());
  fitSun(s.sun, c, Math.max(size.x, size.z) / 2 + 6);
  const d = Math.max(size.x, size.z, size.y * 1.5) * 1.12 + 2.5;
  s.camera.position.set(c.x + d * 0.62, size.y * 0.55 + d * 0.2, c.z + d * 0.8);
  s.camera.lookAt(c.x, size.y * 0.42, c.z);
  if (s.comp) s.comp.render(); else s.renderer.render(s.scene, s.camera);
  const url = s.canvas.toDataURL('image/jpeg', 0.86);
  s.scene.remove(house);
  dispose(house);
  shotCache.set(key, url);
  await new Promise(r => setTimeout(r, 0));
  return url;
}
