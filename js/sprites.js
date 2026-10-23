// Пиксельные спрайты: карты символов + палитры. Всё рисуется на canvas без внешних картинок.
'use strict';

const SPRITES = {
  suslik: {
    pal: { o: '#3b2412', b: '#c8843c', l: '#f2c98f', d: '#8a5424', e: '#141018', w: '#ffffff', n: '#5a2a1a' },
    rows: [
      '................',
      '....oo....oo....',
      '...obbo..obbo...',
      '...obbbooobbo...',
      '..obbbbbbbbbbo..',
      '..obwebbbbwebo..',
      '..obeebbbbeebo..',
      '..obbbbnnbbbbo..',
      '...obbllllbbo...',
      '...obllllllbo...',
      '..obbdlllldbbo..',
      '...obllllllbo...',
      '...obllllllbo...',
      '..obbllllllbbo..',
      '..obbbbbbbbbbo..',
      '...oooddddooo...',
    ],
  },
  mole: {
    pal: { o: '#120e18', m: '#4a3a5a', g: '#07070b', h: '#7d8cff', p: '#ff8fa8', w: '#f4f0e0', k: '#d8c7a8' },
    rows: [
      '................',
      '................',
      '....oooooooo....',
      '...ommmmmmmmo...',
      '..ommmmmmmmmmo..',
      '..oghgmmmmghgo..',
      '..oggggggggggo..',
      '..ommmmppmmmmo..',
      '..ommmmppmmmmo..',
      '...ommmwwmmmo...',
      '.kkommmmmmmmokk.',
      'kwkommmmmmmmokwk',
      '.kkommmmmmmmokk.',
      '...ommmmmmmmo...',
      '...oommmmmmoo...',
      '....oooooooo....',
    ],
  },
  soroka: {
    pal: { k: '#14141c', w: '#f4f4f4', y: '#6a6a72', t: '#2f86a6', e: '#ffffff' },
    rows: [
      '................',
      '.....kkk........',
      '....kkkkk.......',
      '...kkekkkk......',
      '.yykkkkkkk......',
      '.....kkkkkk.....',
      '....kwwwwkkk....',
      '...kwwwwwwkkk...',
      '...kwwwwwwkkkk..',
      '....kwwwwkkkktt.',
      '.....kkkkkkkttt.',
      '......kk...tttt.',
      '......y.y...ttt.',
      '.............tt.',
      '................',
      '................',
    ],
  },
};

// Аксессуары сусликов: прямоугольники [x, y, w, h, цвет] поверх базового спрайта 16×16
const ACCESSORIES = {
  sailor: [ // Крас — бескозырка
    [3, 1, 10, 2, '#f4f4f4'], [5, 0, 6, 1, '#f4f4f4'], [3, 3, 10, 1, '#2b4c9b'], [12, 3, 2, 3, '#2b4c9b'],
    [6, 9, 4, 1, '#2b4c9b'], [5, 10, 6, 1, '#f4f4f4'],
  ],
  flower: [ // Рая — цветы на ушке
    [10, 0, 3, 3, '#ff7fbf'], [11, 1, 1, 1, '#ffe14d'], [2, 1, 2, 2, '#ffd84d'], [3, 1, 1, 1, '#ff9f3d'],
    [5, 9, 6, 1, '#ff7fbf'],
  ],
  books: [ // Афоня — очки и книга
    [3, 4, 4, 1, '#222'], [3, 7, 4, 1, '#222'], [3, 5, 1, 2, '#222'], [6, 5, 1, 2, '#222'],
    [9, 4, 4, 1, '#222'], [9, 7, 4, 1, '#222'], [9, 5, 1, 2, '#222'], [12, 5, 1, 2, '#222'], [7, 5, 2, 1, '#222'],
    [4, 10, 8, 4, '#b03030'], [5, 11, 6, 1, '#f4e8c8'], [7, 10, 2, 4, '#7a1d1d'],
  ],
  telescope: [ // Страж — звездочётный колпак и подзорная труба
    [4, 1, 8, 2, '#23306b'], [6, 0, 4, 1, '#23306b'], [7, 1, 1, 1, '#ffe14d'], [10, 2, 1, 1, '#ffe14d'],
    [11, 10, 2, 1, '#e0b040'], [12, 9, 2, 1, '#e0b040'], [13, 8, 2, 1, '#e0b040'], [14, 7, 2, 1, '#c89020'], [15, 6, 1, 1, '#9fd8ff'],
  ],
  helmet: [ // Назар — гермошлем
    [3, 0, 10, 1, '#bfe9ff'], [2, 1, 1, 8, '#bfe9ff'], [13, 1, 1, 8, '#bfe9ff'], [3, 9, 10, 1, '#9cc8e0'],
    [4, 1, 2, 1, '#ffffff'], [7, 11, 2, 2, '#d22'], [4, 13, 8, 1, '#e0e0e0'],
  ],
  papakha: [ // Обрада — кубанка и кушак
    [3, 0, 10, 3, '#2a2020'], [5, 0, 6, 1, '#b02a2a'], [4, 1, 1, 1, '#3d2f2f'], [11, 1, 1, 1, '#3d2f2f'],
    [3, 12, 10, 1, '#b02a2a'], [12, 12, 1, 3, '#b02a2a'],
  ],
  wrestler: [ // Яр — борцовское трико
    [4, 9, 8, 5, '#c42b2b'], [5, 8, 1, 1, '#c42b2b'], [10, 8, 1, 1, '#c42b2b'], [6, 11, 4, 1, '#ffd84d'],
    [3, 3, 10, 1, '#c42b2b'],
  ],
  beret: [ // Сури — берет и кисть
    [3, 1, 9, 2, '#7a1f3d'], [11, 2, 2, 1, '#7a1f3d'], [7, 0, 1, 1, '#7a1f3d'],
    [12, 9, 1, 5, '#a0703a'], [12, 8, 1, 1, '#3a7fd8'], [5, 12, 2, 1, '#3a7fd8'], [8, 11, 2, 1, '#ffd84d'],
  ],
  bride: [ // К — бант и кружевной воротник
    [10, 0, 4, 2, '#ff6fae'], [11, 2, 2, 1, '#ff6fae'], [12, 1, 1, 1, '#ffd0e6'],
    [5, 8, 6, 1, '#ffffff'], [6, 9, 4, 1, '#ffe0ef'],
  ],
  commander: [ // Р — двууголка и эполеты командора
    [2, 1, 12, 2, '#1a1a22'], [5, 0, 6, 1, '#1a1a22'], [2, 3, 12, 1, '#e0b040'],
    [2, 9, 2, 1, '#e0b040'], [12, 9, 2, 1, '#e0b040'], [7, 10, 2, 3, '#1a1a22'],
  ],
};

const _spriteCache = new Map();

function spriteCanvas(name, palOverride) {
  const key = name + (palOverride ? JSON.stringify(palOverride) : '');
  if (_spriteCache.has(key)) return _spriteCache.get(key);
  const def = SPRITES[name];
  const pal = Object.assign({}, def.pal, palOverride || {});
  const c = document.createElement('canvas');
  c.width = 16; c.height = def.rows.length;
  const x = c.getContext('2d');
  def.rows.forEach((row, y) => {
    for (let i = 0; i < row.length; i++) {
      const col = pal[row[i]];
      if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); }
    }
  });
  _spriteCache.set(key, c);
  return c;
}

function drawSprite(ctx, name, x, y, opts) {
  opts = opts || {};
  const img = spriteCanvas(name, opts.pal);
  x = Math.round(x); y = Math.round(y);
  if (opts.flip) {
    ctx.save(); ctx.translate(x + 16, y); ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0); ctx.restore();
  } else {
    ctx.drawImage(img, x, y);
  }
}

function drawAccessory(ctx, acc, x, y) {
  const list = ACCESSORIES[acc];
  if (!list) return;
  x = Math.round(x); y = Math.round(y);
  for (const [ax, ay, w, h, col] of list) {
    ctx.fillStyle = col;
    ctx.fillRect(x + ax, y + ay, w, h);
  }
}

function drawSuslik(ctx, acc, x, y) {
  drawSprite(ctx, 'suslik', x, y);
  drawAccessory(ctx, acc, x, y);
}

// Глиняный кокон Кромешника: эллипс с трещинами, сквозь которые пробивается свет
function drawCocoon(ctx, acc, x, y, cracks, t) {
  x = Math.round(x); y = Math.round(y);
  const cx = 8, cy = 9, rx = 6.6, ry = 7.2;
  for (let py = 0; py < 16; py++) {
    for (let px = 0; px < 16; px++) {
      const d = ((px + 0.5 - cx) / rx) ** 2 + ((py + 0.5 - cy) / ry) ** 2;
      if (d > 1) continue;
      let col = d > 0.78 ? '#3d2e22' : ((px + py) % 2 === 0 && d > 0.45 ? '#7a6248' : '#8d7458');
      if (px < cx - 2 && py < cy - 2 && d < 0.6) col = '#a68d6e';
      ctx.fillStyle = col;
      ctx.fillRect(x + px, y + py, 1, 1);
    }
  }
  // макушка аксессуара торчит из кокона — чтобы узнать пленника
  const peek = (ACCESSORIES[acc] || []).filter(r => r[1] <= 2);
  for (const [ax, ay, w, h, col] of peek) { ctx.fillStyle = col; ctx.fillRect(x + ax, y + ay, w, Math.min(h, 3 - ay)); }
  const glow = 0.6 + 0.4 * Math.sin(t / 150);
  const crackSets = [
    [[7, 4], [8, 5], [8, 6], [7, 7], [7, 8]],
    [[4, 9], [5, 10], [6, 10], [6, 11], [5, 12]],
    [[11, 8], [10, 9], [11, 10], [10, 11], [11, 12], [10, 13]],
  ];
  ctx.fillStyle = `rgba(255,230,120,${glow})`;
  for (let i = 0; i < Math.min(cracks, 3); i++) {
    for (const [px, py] of crackSets[i]) ctx.fillRect(x + px, y + py, 1, 1);
  }
}
