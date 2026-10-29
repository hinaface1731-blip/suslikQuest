// Нарисованные в pxl фоны: сквер Сурикова и карта города, 320×180. Свет сверху слева.
// Остальные локации — присланные фоны (см. prep_backgrounds.py).
// Анимация (снег, блики) дорисовывается в игре поверх картинок.
include("palette.px.js")

const W = 320, H = 180

// ---------- Общие детали ----------

// «Столбы»: скалы-останцы на горизонте
function stolby(c, x0, base, key, lit) {
  const rocks = [[0, 10, 5], [9, 16, 7], [20, 8, 4], [27, 19, 6], [37, 12, 5], [46, 22, 8], [58, 9, 4]]
  for (const [dx, h, w] of rocks) {
    const x = x0 + dx
    c.poly([x, base, x + 1, base - h + 2, x + 2, base - h, x + w - 2, base - h, x + w - 1, base - h + 3, x + w, base], key)
    if (lit) c.vline(x + 1, base - h + 2, h - 3, lit)
  }
}

function pine(c, x, y, s = 1) {
  for (let i = 0; i < 4; i++) {
    const w = (4 + i * 3) * s, ty = y + i * 4 * s
    c.poly([x, ty, x + w / 2, ty + 6 * s, x - w / 2, ty + 6 * s], "P")
    c.poly([x, ty, x, ty + 6 * s, x - w / 2, ty + 6 * s], "g")
  }
  c.rect(x - 1, y + 22 * s, 2, 4 * s, "b")
}

// ---------- Сцены ----------

// Сквер Сурикова зимой
scene("surikov", { w: W, h: H, bg: "T" },
  (c) => {
    c.grad(0, 0, W, 110, "tTT", "v", 0.6)
    // усадьба Суриковых
    c.rect(4, 50, 90, 62, "C")
    for (let y = 52; y < 112; y += 4) c.hline(4, y, 90, "O")
    c.poly([0, 50, 49, 24, 98, 50], "Y")
    c.poly([49, 24, 98, 50, 72, 50], "I")
    for (const wx of [14, 42, 70]) {
      c.rect(wx - 2, 62, 16, 26, "Y")
      c.rect(wx, 64, 12, 22, "S"), c.vline(wx + 6, 64, 22, "Y"), c.hline(wx, 74, 12, "Y")
    }
    c.shade([84, 50, 10, 62], 1)
    // каменный дом на улице Ленина
    c.rect(234, 40, 86, 72, "M")
    c.rect(230, 36, 90, 5, "I")
    for (const wx of [244, 268, 292]) for (const wy of [50, 78]) { c.rect(wx, wy, 12, 18, "S"), c.rect(wx - 2, wy - 2, 16, 2, "Y") }
    // снег
    c.rect(0, 112, W, 68, "Y")
    c.grad(0, 112, W, 68, "TY", "v", 0.5)
    c.hline(0, 112, W, "I")
    // снежный городок
    c.rect(110, 92, 60, 22, "Y")
    for (let x = 110; x < 170; x += 12) c.rect(x, 86, 7, 6, "Y")
    c.rect(134, 100, 12, 14, "t")
    c.shade([110, 106, 60, 8], 1, 0.5)
    // мольберт
    c.line(200, 96, 192, 150, "B", 2), c.line(214, 96, 222, 150, "B", 2), c.line(207, 96, 207, 152, "b", 2)
    c.rect(186, 84, 42, 36, "Y"), c.box(186, 84, 42, 36, "b")
    c.grad(188, 86, 38, 14, "tT", "v", 0.5)
    c.rect(188, 104, 38, 14, "Y")
    c.rect(198, 98, 14, 8, "Y"), c.rect(200, 94, 4, 4, "R"), c.rect(206, 100, 8, 5, "B")
    c.hline(186, 120, 42, "b")
    for (const x of [26, 296]) { c.rect(x - 1, 92, 3, 22, "b"), c.ellipse(x, 84, 14, 12, "T"), c.ellipse(x - 3, 80, 9, 6, "Y") }
  })

// ---------- Карта города ----------

const RIVER_Y = (x) => 116 - x * 0.3 + 10 * Math.sin(x / 44)

scene("map", { w: W, h: H, bg: "y" },
  (c) => {
    // бумага
    c.rect(0, 0, W, H, "y")
    // тайга и Столбы на юго-западе
    for (const [x, y] of [[14, 160], [30, 150], [48, 166], [70, 158], [24, 172], [92, 170]]) pine(c, x, y - 20, 0.7)
    stolby(c, 10, 140, "B", "n")
    // кварталы
    for (let y = 8; y < H - 8; y += 9)
      for (let x = 8; x < W - 8; x += 11) {
        const d = Math.abs(y + 3 - RIVER_Y(x + 4))
        if (d < 15 || (x < 110 && y > 126) || (Math.abs(x - 116) < 22 && Math.abs(y - 40) < 12)) continue
        if (((x * 7 + y * 13) % 11) < 4) continue
        c.rect(x, y, 8, 6, "W"), c.hline(x, y + 6, 8, "M")
      }
    // Кача
    for (let i = 0; i <= 60; i++) c.circ(Math.round(60 + i * 1.13), Math.round(8 + i * 0.95), 1, "t")
    // Енисей
    for (let x = 0; x < W; x++) {
      const y = Math.round(RIVER_Y(x))
      c.vline(x, y - 8, 17, "S")
      c.vline(x, y - 8, 2, "t")
      c.px(x, y + 9, "s")
    }
    // парки и рощи
    for (const [x, y, rx, ry] of [[40, 30, 22, 10], [234, 28, 30, 11], [196, 118, 16, 7], [146, 26, 10, 5]]) {
      c.ellipse(x, y, rx, ry, "G"), c.ellipse(x + 2, y + 2, rx - 4, ry - 3, "g")
      for (let i = 0; i < 5; i++) pine(c, x - rx + 6 + i * (2 * rx - 12) / 4, y - 8 + (i % 2) * 3, 0.45)
    }
    // горы на юге
    for (let x = 120; x < W; x++) {
      const y = Math.round(150 + 10 * Math.sin(x / 17) + 6 * Math.sin(x / 7))
      if (y < H - 4) { c.vline(x, y, H - 4 - y, "G"), c.vline(x, y, 2, "g") }
    }
    stolby(c, 230, 150, "B", "n")
    // остров Татышев
    c.ellipse(222, Math.round(RIVER_Y(222)), 26, 3, "g")
    // мосты
    for (const bx of [70, 140, 196, 268]) {
      const y = Math.round(RIVER_Y(bx))
      c.rect(bx, y - 12, 3, 25, "I"), c.vline(bx + 3, y - 12, 25, "A")
    }
    // Караульная гора с часовней
    c.ellipse(116, 40, 18, 9, "g")
    c.rect(114, 30, 4, 6, "Y"), c.poly([113, 30, 116, 25, 119, 30], "P"), c.px(116, 24, "d")
    // рамка-паспарту
    c.box(0, 0, W, H, "b"), c.box(2, 2, W - 4, H - 4, "B")
    // роза ветров
    c.poly([300, 18, 302, 26, 300, 34, 298, 26], "b")
    c.poly([292, 26, 300, 24, 308, 26, 300, 28], "B")
    c.px(300, 14, "b")
  })
