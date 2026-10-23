// Пиксельные фоны локаций Красноярска. Холст 160×90, всё рисуется примитивами.
'use strict';

const W = 160, H = 90;

function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function P(c, x, y, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); }

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function sky(c, cols, h) {
  h = h || H;
  const band = Math.ceil(h / cols.length);
  cols.forEach((col, i) => R(c, 0, i * band, W, band + 1, col));
}

function stars(c, t, n, maxY, seed) {
  const r = rng(seed || 7);
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * maxY, ph = r() * 6;
    const a = 0.4 + 0.6 * Math.abs(Math.sin(t / 700 + ph));
    c.fillStyle = `rgba(255,255,230,${a.toFixed(2)})`;
    c.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
}

function sun(c, x, y, r, col, t) {
  for (let py = -r; py <= r; py++)
    for (let px = -r; px <= r; px++)
      if (px * px + py * py <= r * r) P(c, x + px, y + py, col);
  if (t !== undefined) {
    const k = Math.floor(t / 400) % 2;
    c.fillStyle = col;
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4 + k * Math.PI / 8;
      const d = r + 3;
      c.fillRect(Math.round(x + Math.cos(ang) * d), Math.round(y + Math.sin(ang) * d), 1, 1);
      c.fillRect(Math.round(x + Math.cos(ang) * (d + 1)), Math.round(y + Math.sin(ang) * (d + 1)), 1, 1);
    }
  }
}

function hills(c, baseY, amp, col, seed, freq) {
  const ph = (seed || 1) * 1.7;
  freq = freq || 1;
  for (let x = 0; x < W; x++) {
    const y = baseY - amp * (0.5 + 0.3 * Math.sin(x / 13 * freq + ph) + 0.2 * Math.sin(x / 5.3 * freq + ph * 2));
    R(c, x, y, 1, H - y, col);
  }
}

function river(c, y, h, col, hi, t) {
  R(c, 0, y, W, h, col);
  const r = rng(3);
  for (let i = 0; i < 26; i++) {
    const ly = y + 1 + Math.floor(r() * (h - 2));
    const len = 2 + Math.floor(r() * 5);
    const x = (r() * W + t / (40 + (ly - y) * 6)) % (W + 10) - 5;
    R(c, x, ly, len, 1, hi);
  }
}

function pine(c, x, y, s, col, dark) {
  s = s || 1;
  for (let i = 0; i < 4; i++) {
    const w = (2 + i * 2) * s;
    R(c, x - w / 2, y + i * 3 * s, w, 3 * s, i % 2 ? col : dark || col);
  }
  R(c, x - 0.5, y + 12 * s, 1, 3 * s, '#4a2f1d');
}

function birch(c, x, y, h) {
  R(c, x, y, 2, h, '#eeeae0');
  for (let i = 2; i < h; i += 4) P(c, x + (i % 8 ? 0 : 1), y + i, '#222');
  R(c, x - 5, y - 6, 12, 8, '#5fa040');
  R(c, x - 3, y - 9, 8, 4, '#6fb84a');
  P(c, x - 2, y - 4, '#8fd060'); P(c, x + 4, y - 7, '#8fd060');
}

function roundTree(c, x, y, col, hi) {
  R(c, x - 1, y + 6, 2, 6, '#5a3a22');
  R(c, x - 5, y, 10, 7, col);
  R(c, x - 4, y - 2, 8, 2, col);
  R(c, x - 3, y - 1, 3, 2, hi);
}

function block(c, x, y, w, h, wall, win, lit, seed) {
  R(c, x, y, w, h, wall);
  const r = rng(seed || x * 13 + y);
  for (let wy = y + 2; wy < y + h - 2; wy += 3)
    for (let wx = x + 1; wx < x + w - 1; wx += 3)
      P(c, wx, wy, r() < lit ? '#ffe680' : win);
}

// Коммунальный мост: полотно на арках, которые опираются на быки в Енисее
function communalBridge(c, y, col, shade) {
  R(c, 0, y - 2, W, 1, shade);
  for (let x = 0; x < W; x += 3) P(c, x, y - 1, shade);
  R(c, 0, y, W, 2, col);
  R(c, 0, y + 2, W, 1, shade);
  const piers = [-24, 18, 62, 106, 150, 194];
  const depth = 9;
  for (let i = 0; i < piers.length - 1; i++) {
    const a = piers[i], b = piers[i + 1], cx = (a + b) / 2, rx = (b - a) / 2;
    for (let x = a; x <= b; x++) {
      const k = (x - cx) / rx;
      const ay = y + 3 + depth * (1 - Math.sqrt(Math.max(0, 1 - k * k)));
      R(c, x, ay, 1, 2, col);
      if (x % 5 === 0) R(c, x, y + 3, 1, ay - y - 3, shade);
    }
  }
  for (const px of piers) R(c, px - 2, y + 3, 5, depth + 3, shade);
}

function chapel(c, x, y, s) { // часовня Параскевы Пятницы
  R(c, x, y + 8, 10, 12, '#f2efe6');
  R(c, x + 1, y + 9, 8, 1, '#c9c2b0');
  R(c, x + 4, y + 14, 2, 6, '#5b4a3a');
  P(c, x + 2, y + 11, '#3b5a7a'); P(c, x + 7, y + 11, '#3b5a7a');
  for (let i = 0; i < 7; i++) R(c, x + i * 0.7 + 0.5, y + 8 - i, 10 - i * 1.4, 1, '#3d4a3a');
  R(c, x + 4, y - 1, 2, 3, '#e0b040');
  R(c, x + 4.5, y - 5, 1, 4, '#e0b040');
  R(c, x + 3, y - 4, 4, 1, '#e0b040');
}

function lamp(c, x, y, on) {
  R(c, x, y, 1, 14, '#2a2a35');
  R(c, x - 1, y - 2, 3, 2, on ? '#ffe680' : '#555');
}

function snow(c, t, n) {
  const r = rng(11);
  for (let i = 0; i < n; i++) {
    const x0 = r() * W, sp = 8 + r() * 10, ph = r() * 100;
    const y = ((t / 1000) * sp + ph * 3) % H;
    const x = (x0 + Math.sin(t / 900 + ph) * 3 + W) % W;
    P(c, x, y, '#ffffff');
  }
}

const SCENES = {
  // ---------- Титул: силуэт города ночью ----------
  title(c, t) {
    sky(c, ['#0b1030', '#141a46', '#1f2560', '#2e2f75', '#4a3a86']);
    stars(c, t, 50, 50, 3);
    sun(c, 130, 16, 6, '#f3e9c0');
    P(c, 128, 14, '#d8cfa2'); P(c, 132, 18, '#d8cfa2');
    hills(c, 60, 16, '#1b1840', 2);
    chapel(c, 38, 26, 1);
    hills(c, 66, 6, '#140f30', 5);
    const r = rng(9);
    for (let x = 0; x < W; x += 7) {
      const h = 6 + r() * 14;
      block(c, x, 70 - h, 6, h + 1, '#120d28', '#1d1840', 0.35, x);
    }
    river(c, 71, 19, '#162a5a', '#3b67b0', t);
  },

  // ---------- Пролог ----------
  prologue(c, t) {
    sky(c, ['#07081c', '#0d1030', '#141844', '#1c1f55']);
    stars(c, t, 40, 45, 5);
    hills(c, 56, 10, '#151236', 3);
    chapel(c, 70, 24, 1);
    const r = rng(4);
    for (let x = 0; x < W; x += 8) { const h = 8 + r() * 10; block(c, x, 64 - h, 7, h, '#0e0a20', '#17122e', 0.2, x); }
    R(c, 0, 64, W, 26, '#2a1c14');
    for (let i = 0; i < 40; i++) P(c, r() * W, 66 + r() * 22, '#3d2a1e');
    // норы
    for (const hx of [20, 60, 100, 140]) { R(c, hx - 5, 70, 10, 3, '#120a06'); R(c, hx - 4, 69, 8, 1, '#120a06'); }
  },

  // ---------- 1. Центральная набережная, Коммунальный мост ----------
  embankment(c, t) {
    sky(c, ['#5fb4ff', '#7cc4ff', '#9ad3ff', '#b8e2ff']);
    sun(c, 24, 14, 5, '#fff3a8', t);
    hills(c, 40, 12, '#5d8c6a', 1);
    hills(c, 44, 6, '#4a7a58', 4);
    river(c, 44, 22, '#2f6fb8', '#8fc4ff', t);
    communalBridge(c, 33, '#e8e4dc', '#9a968c');
    R(c, 0, 66, W, 4, '#c9b89a');
    for (let x = 0; x < W; x += 6) R(c, x, 63, 4, 3, '#d8c8a8');
    R(c, 0, 70, W, 20, '#9a8a72');
    for (let x = 0; x < W; x += 8) R(c, x + (Math.floor(x / 8) % 2) * 4, 76, 4, 1, '#8a7a62');
    lamp(c, 12, 52, false); lamp(c, 148, 52, false);
  },

  // ---------- 2. Солнечная поляна ----------
  sunny(c, t) {
    sky(c, ['#62c0ff', '#86d0ff', '#a6ddff', '#c6ebff']);
    sun(c, 132, 15, 8, '#ffe14d', t);
    block(c, 4, 28, 22, 26, '#d9d2c4', '#7c8aa0', 0.1, 1);
    block(c, 30, 22, 18, 32, '#e8d9b8', '#7c8aa0', 0.1, 2);
    block(c, 96, 30, 26, 24, '#cfd8dc', '#7c8aa0', 0.1, 3);
    R(c, 0, 54, W, 36, '#6cbf48');
    const r = rng(21);
    for (let i = 0; i < 90; i++) P(c, r() * W, 55 + r() * 34, r() < 0.5 ? '#5aa83a' : '#88d860');
    for (let i = 0; i < 18; i++) {
      const x = r() * W, y = 60 + r() * 28;
      P(c, x, y, ['#ff7fbf', '#ffe14d', '#ffffff', '#ff9f3d'][i % 4]);
    }
    roundTree(c, 60, 40, '#3f8f3a', '#5fb04f');
    roundTree(c, 146, 42, '#3f8f3a', '#5fb04f');
    R(c, 70, 50, 34, 4, '#d8c8a8');
  },

  // ---------- 3. Сквер Юдина с шкафом буккроссинга ----------
  yudin(c, t) {
    sky(c, ['#8ccfff', '#a8dcff', '#c4e8ff']);
    // старинный деревянный дом
    R(c, 6, 26, 46, 30, '#8a5a34');
    for (let y = 28; y < 56; y += 3) R(c, 6, y, 46, 1, '#6e4626');
    for (let i = 0; i < 12; i++) R(c, 4 + i * 2, 26 - i, 50 - i * 4, 1, '#5a3a2a');
    for (const wx of [12, 26, 40]) { R(c, wx, 34, 6, 8, '#e8d8a8'); R(c, wx + 1, 35, 4, 6, '#3a5a7a'); R(c, wx - 1, 33, 8, 1, '#f4f0e0'); R(c, wx - 1, 42, 8, 1, '#f4f0e0'); }
    roundTree(c, 66, 34, '#3f8f3a', '#5fb04f');
    roundTree(c, 150, 30, '#3f8f3a', '#5fb04f');
    R(c, 0, 56, W, 34, '#5aa83a');
    R(c, 0, 66, W, 6, '#cbb894');
    // шкаф буккроссинга
    const bx = 112, by = 36;
    R(c, bx, by, 24, 30, '#b5652e');
    R(c, bx - 1, by - 2, 26, 3, '#8a4a22');
    const bc = ['#d33', '#3a7fd8', '#ffd84d', '#4caf50', '#a64ad8', '#ff9f3d'];
    for (let s = 0; s < 3; s++) {
      R(c, bx + 2, by + 3 + s * 9, 20, 7, '#3a2210');
      for (let b = 0; b < 9; b++) {
        if ((b + s) % 4 === 3) continue;
        R(c, bx + 2 + b * 2 + (b > 4 ? 1 : 0), by + 4 + s * 9 + (b % 3 === 0 ? 1 : 0), 2, 6 - (b % 3 === 0 ? 1 : 0), bc[(b + s * 2) % bc.length]);
      }
    }
    // разбросанные книги
    R(c, 100, 76, 5, 2, '#3a7fd8'); R(c, 140, 79, 5, 2, '#d33'); R(c, 92, 82, 4, 2, '#ffd84d');
    // скамейка
    R(c, 20, 66, 26, 2, '#7a4a28'); R(c, 20, 62, 26, 2, '#7a4a28'); R(c, 22, 68, 1, 4, '#333'); R(c, 43, 68, 1, 4, '#333');
  },

  // ---------- 4. Караульная гора, часовня ----------
  karaul(c, t) {
    sky(c, ['#1a1a4a', '#2c2a66', '#4a3a80', '#7a4a88', '#c06a7a', '#f0a070']);
    stars(c, t, 30, 30, 8);
    sun(c, 30, 12, 3, '#f8f0d0');
    // город внизу
    const r = rng(12);
    for (let x = 0; x < W; x += 5) { const h = 4 + r() * 8; block(c, x, 76 - h, 4, h, '#2a2040', '#3a2e55', 0.4, x); }
    river(c, 76, 14, '#2a3a7a', '#6a8ad0', t);
    // гора
    for (let x = 30; x < 150; x++) {
      const k = (x - 90) / 60;
      const y = 40 + 36 * k * k;
      R(c, x, y, 1, 76 - y, '#3d5a3a');
      if (x % 3 === 0) P(c, x, y, '#5a7a4a');
    }
    chapel(c, 85, 20, 1);
    // пушка
    R(c, 110, 44, 10, 3, '#2a2a2a'); R(c, 118, 43, 3, 5, '#2a2a2a');
    R(c, 111, 46, 4, 4, '#5a3a22'); P(c, 112, 47, '#888');
    // смотровая площадка
    R(c, 60, 52, 22, 1, '#ddd');
    for (let x = 60; x < 82; x += 3) R(c, x, 48, 1, 4, '#ddd');
  },

  // ---------- 5. Сквер Космонавтов, Зелёная Роща ----------
  cosmos(c, t) {
    sky(c, ['#060820', '#0c1236', '#141c4a', '#20285e', '#2c3570']);
    stars(c, t, 60, 55, 15);
    // ракета-памятник
    const rx = 112, ry = 14;
    R(c, rx + 2, ry + 6, 8, 30, '#e8e8f0');
    R(c, rx + 3, ry + 3, 6, 3, '#e8e8f0');
    R(c, rx + 4, ry, 4, 3, '#d33');
    R(c, rx + 5, ry - 2, 2, 2, '#d33');
    P(c, rx + 6, ry + 12, '#3a7fd8'); P(c, rx + 5, ry + 12, '#3a7fd8');
    R(c, rx + 4, ry + 18, 4, 1, '#d33');
    R(c, rx - 1, ry + 28, 3, 8, '#bbb'); R(c, rx + 10, ry + 28, 3, 8, '#bbb');
    R(c, rx, ry + 36, 12, 6, '#777'); R(c, rx - 2, ry + 42, 16, 2, '#555');
    // спутник
    const sx = 30 + (t / 120) % 140, sy = 10 + Math.sin(t / 900) * 2;
    R(c, sx, sy, 3, 2, '#ddd'); R(c, sx - 3, sy, 2, 2, '#3a7fd8'); R(c, sx + 4, sy, 2, 2, '#3a7fd8');
    R(c, 0, 58, W, 32, '#24482c');
    const r = rng(31);
    for (let i = 0; i < 40; i++) P(c, r() * W, 59 + r() * 30, '#2f5a36');
    for (const x of [10, 26, 44, 140, 154]) pine(c, x, 36 + (x % 3) * 2, 1.3, '#2f6a3a', '#24552e');
    R(c, 60, 66, 70, 3, '#5a5a6a');
  },

  // ---------- 6. Набережная Хазрета Совмена ----------
  sovmen(c, t) {
    sky(c, ['#ff9a5a', '#ffb070', '#ffc888', '#ffe0a8']);
    sun(c, 120, 26, 7, '#fff0b0', t);
    hills(c, 40, 14, '#7a6a8a', 6);
    river(c, 40, 24, '#c87050', '#ffd0a0', t);
    R(c, 0, 64, W, 3, '#b8a080');
    for (let x = 0; x < W; x += 4) R(c, x, 60, 1, 4, '#5a4a3a');
    R(c, 0, 60, W, 1, '#5a4a3a');
    R(c, 0, 67, W, 23, '#a89070');
    for (const x of [14, 30, 146]) birch(c, x, 46, 20);
    // казачье знамя на древке
    R(c, 54, 30, 1, 34, '#4a3020');
    const wave = Math.floor(t / 300) % 2;
    R(c, 55, 30 + wave, 14, 9, '#a8202a'); R(c, 55, 30 + wave, 14, 1, '#e8c040'); R(c, 55, 38 + wave, 14, 1, '#e8c040'); R(c, 60, 32 + wave, 4, 5, '#e8c040'); R(c, 61, 33 + wave, 2, 3, '#a8202a');
    // блёстки золота
    const r = rng(41);
    for (let i = 0; i < 10; i++) { const a = Math.sin(t / 300 + i) > 0.6; if (a) P(c, 80 + r() * 70, 72 + r() * 16, '#ffe680'); else r(), r(); }
  },

  // ---------- 7. Ярыгинская набережная ----------
  yarygin(c, t) {
    sky(c, ['#7ec8ff', '#9ad6ff', '#bfe6ff']);
    sun(c, 20, 12, 5, '#fff3a8', t);
    hills(c, 34, 10, '#6a8a7a', 2);
    river(c, 34, 22, '#2f6fb8', '#8fc4ff', t);
    // дальний мост
    R(c, 70, 30, 90, 2, '#c8c4bc');
    for (let x = 74; x < 160; x += 14) R(c, x, 32, 2, 8, '#a8a49c');
    // спортивная арена
    R(c, 96, 46, 50, 12, '#d8dde8');
    for (let i = 0; i < 8; i++) R(c, 98 + i * 1.5, 46 - i, 46 - i * 3, 1, '#b8c0d8');
    R(c, 100, 50, 42, 2, '#3a7fd8');
    R(c, 0, 56, W, 4, '#c9b89a');
    R(c, 0, 60, W, 30, '#9aa08a');
    // борцовский ковёр
    R(c, 20, 70, 50, 14, '#c42b2b');
    R(c, 24, 72, 42, 10, '#e8c040');
    R(c, 28, 74, 34, 6, '#c42b2b');
    lamp(c, 84, 46, false); lamp(c, 150, 46, false);
  },

  // ---------- 8. Сквер Сурикова, зима ----------
  surikov(c, t) {
    sky(c, ['#b8c8e0', '#c8d6ea', '#d8e2f2']);
    // старинные дома улицы Ленина
    R(c, 0, 26, 44, 34, '#d8a070'); R(c, 0, 24, 44, 2, '#a86a4a');
    for (const wx of [4, 16, 28, 38]) { R(c, wx, 32, 4, 7, '#4a5a7a'); R(c, wx, 44, 4, 7, '#4a5a7a'); R(c, wx - 1, 31, 6, 1, '#fff'); }
    R(c, 120, 30, 40, 30, '#e8e0c8'); R(c, 118, 28, 44, 2, '#8a8a9a');
    for (const wx of [124, 136, 148]) { R(c, wx, 36, 5, 8, '#4a5a7a'); R(c, wx - 1, 35, 7, 1, '#fff'); }
    R(c, 0, 60, W, 30, '#f4f8ff');
    for (let x = 0; x < W; x += 3) P(c, x, 60 + (x % 2), '#dce6f4');
    // снежная крепость
    R(c, 54, 52, 30, 10, '#ffffff'); R(c, 54, 49, 4, 3, '#fff'); R(c, 66, 49, 4, 3, '#fff'); R(c, 80, 49, 4, 3, '#fff');
    for (let x = 54; x < 84; x += 5) P(c, x, 56, '#c8d8ec');
    // мольберт
    R(c, 104, 46, 2, 26, '#8a5a34'); R(c, 118, 46, 2, 26, '#8a5a34'); R(c, 111, 44, 2, 30, '#6a4424');
    R(c, 100, 40, 24, 18, '#f4ecd8'); R(c, 100, 40, 24, 1, '#6a4424');
    R(c, 102, 50, 20, 6, '#ffffff'); R(c, 106, 46, 5, 4, '#8a5a34'); R(c, 108, 43, 3, 3, '#c42b2b');
    R(c, 102, 42, 20, 4, '#9ab8e0');
    for (const x of [30, 140]) { R(c, x, 50, 2, 12, '#3a2a20'); R(c, x - 6, 40, 14, 10, '#e8eef8'); R(c, x - 4, 38, 10, 3, '#f8fbff'); }
    snow(c, t, 50);
  },

  // ---------- 9. Площадь Мира, памятник Резанову ----------
  rezanov(c, t) {
    sky(c, ['#3a2a6a', '#5a3a7a', '#8a4a80', '#c86a7a', '#f0a080']);
    stars(c, t, 14, 20, 19);
    // музейный центр «Площадь Мира»
    R(c, 6, 30, 70, 30, '#c8b8a0'); R(c, 6, 28, 70, 2, '#8a7a6a');
    for (let x = 10; x < 74; x += 6) R(c, x, 34, 3, 22, '#a89880');
    R(c, 34, 46, 14, 14, '#5a4a3a');
    // Енисей вдали
    river(c, 52, 8, '#4a5aa0', '#a8b8f0', t);
    R(c, 76, 44, 84, 8, '#5a4a6a');
    // постамент и командор
    const mx = 108;
    R(c, mx - 6, 50, 26, 18, '#7a7a86'); R(c, mx - 8, 48, 30, 2, '#9a9aa8'); R(c, mx - 8, 66, 30, 2, '#5a5a66');
    R(c, mx + 3, 30, 8, 18, '#5a4a2a');
    R(c, mx + 4, 24, 6, 6, '#6a5a3a');
    R(c, mx + 2, 22, 10, 2, '#3a2a1a');
    R(c, mx + 1, 32, 2, 10, '#4a3a20'); R(c, mx + 11, 32, 2, 10, '#4a3a20');
    R(c, mx + 4, 31, 6, 1, '#c8a040');
    R(c, 0, 68, W, 22, '#8a8494');
    for (let x = 0; x < W; x += 10) R(c, x, 74 + (x % 20 ? 0 : 6), 9, 1, '#7a7484');
    // сердечки
    const hy = 18 + Math.sin(t / 400) * 2;
    for (const [hx, col] of [[132, '#ff6fae'], [146, '#ff9fc8']]) {
      R(c, hx, hy, 2, 2, col); R(c, hx + 3, hy, 2, 2, col); R(c, hx, hy + 2, 5, 1, col); R(c, hx + 1, hy + 3, 3, 1, col); P(c, hx + 2, hy + 4, col);
    }
  },

  // ---------- Финал: Стрелка, место основания острога ----------
  strelka(c, t) {
    sky(c, ['#0a0614', '#140a24', '#200e34', '#2e1440']);
    stars(c, t, 45, 40, 23);
    river(c, 54, 36, '#1a2a5a', '#4a6ab0', t);
    // Кача впадает в Енисей
    for (let i = 0; i < 20; i++) R(c, 10 + i * 2, 54 - i * 1.4, 6, 3, '#1e3060');
    // красный яр
    for (let x = 90; x < W; x++) {
      const y = 30 + 8 * Math.sin((x - 90) / 22);
      R(c, x, y, 1, 58 - y, '#a83a2a');
      if (x % 4 === 0) R(c, x, y + 4, 1, 6, '#c85a3a');
      if (x % 5 === 0) R(c, x, y + 14, 1, 8, '#7a2a1e');
    }
    R(c, 90, 26, 70, 4, '#2a4a2a');
    // частокол острога (призрачный)
    for (let x = 100; x < 150; x += 3) R(c, x, 18, 2, 8, 'rgba(200,170,120,0.55)');
    R(c, 122, 10, 6, 8, 'rgba(200,170,120,0.55)');
    R(c, 0, 82, W, 8, '#1a1210');
  },
};

// ---------- Схематическая карта города ----------
const MAP_RIVER = x => 58 - x * 0.16 + 5 * Math.sin(x / 22);

function paintMap(c, t) {
  R(c, 0, 0, W, H, '#7fb069');
  const r = rng(77);
  for (let i = 0; i < 140; i++) P(c, r() * W, r() * H, r() < 0.5 ? '#6ea05a' : '#8fc078');
  // кварталы
  for (let i = 0; i < 46; i++) {
    const x = r() * W, y = r() * H;
    if (Math.abs(y - MAP_RIVER(x)) < 10) continue;
    R(c, x, y, 3 + r() * 4, 2 + r() * 3, r() < 0.5 ? '#c9c0a8' : '#b8ae96');
  }
  // Столбы на юго-западе
  for (const [x, y] of [[8, 80], [14, 76], [20, 82], [6, 70]]) { R(c, x, y, 3, 6, '#7a6a5a'); R(c, x + 1, y - 2, 2, 2, '#8a7a6a'); }
  // Кача
  for (let i = 0; i <= 30; i++) R(c, 40 + i * 0.8, 10 + i * 1.18, 2, 2, '#4a8ad0');
  // Енисей
  for (let x = 0; x < W; x++) {
    const y = MAP_RIVER(x);
    R(c, x, y - 4, 1, 9, '#3a74c0');
    if ((x + Math.floor(t / 200)) % 9 === 0) P(c, x, y, '#9fd0ff');
  }
  // остров Татышев
  R(c, 104, MAP_RIVER(104) - 1, 22, 3, '#8fc078');
  // мосты
  for (const bx of [40, 70, 98, 134]) {
    const y = MAP_RIVER(bx);
    R(c, bx, y - 6, 2, 13, '#e8e4dc');
  }
  // рамка
  R(c, 0, 0, W, 1, '#3a2a1a'); R(c, 0, H - 1, W, 1, '#3a2a1a'); R(c, 0, 0, 1, H, '#3a2a1a'); R(c, W - 1, 0, 1, H, '#3a2a1a');
}
