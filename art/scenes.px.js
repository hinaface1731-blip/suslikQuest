// Фоны локаций Красноярска, 320×180. Свет везде падает сверху слева.
// Анимация (блики воды, звёзды, снег) дорисовывается в игре поверх этих картинок.
include("palette.px.js")

const W = 320, H = 180

// ---------- Общие детали ----------

function hills(c, base, amp, key, seed = 1, f = 1) {
  for (let x = 0; x < W; x++) {
    const y = Math.round(base - amp * (0.55 + 0.3 * Math.sin(x / 26 * f + seed) + 0.15 * Math.sin(x / 9 * f + seed * 2)))
    c.vline(x, y, H - y, key)
  }
}

// «Столбы»: скалы-останцы на горизонте
function stolby(c, x0, base, key, lit) {
  const rocks = [[0, 10, 5], [9, 16, 7], [20, 8, 4], [27, 19, 6], [37, 12, 5], [46, 22, 8], [58, 9, 4]]
  for (const [dx, h, w] of rocks) {
    const x = x0 + dx
    c.poly([x, base, x + 1, base - h + 2, x + 2, base - h, x + w - 2, base - h, x + w - 1, base - h + 3, x + w, base], key)
    if (lit) c.vline(x + 1, base - h + 2, h - 3, lit)
  }
}

function river(c, y, h, keys, hi) {
  c.grad(0, y, W, h, keys, "v", 0.6)
  const r = c.rng(7)
  for (let i = 0; i < 30; i++) c.hline(Math.floor(r() * W), y + 2 + Math.floor(r() * (h - 3)), 2 + Math.floor(r() * 6), hi)
}

function pine(c, x, y, s = 1) {
  for (let i = 0; i < 4; i++) {
    const w = (4 + i * 3) * s, ty = y + i * 4 * s
    c.poly([x, ty, x + w / 2, ty + 6 * s, x - w / 2, ty + 6 * s], "P")
    c.poly([x, ty, x, ty + 6 * s, x - w / 2, ty + 6 * s], "g")
  }
  c.rect(x - 1, y + 22 * s, 2, 4 * s, "b")
}

function birch(c, x, y, h) {
  c.rect(x, y, 3, h, "Y")
  c.vline(x + 2, y, h, "i")
  for (let i = 3; i < h; i += 5) c.hline(x + (i % 2), y + i, 2, "k")
  c.ellipse(x + 1, y - 4, 9, 7, "g")
  c.ellipse(x - 1, y - 6, 6, 4, "G")
  c.ellipse(x + 4, y - 1, 5, 3, "P")
}

function roundTree(c, x, y, r) {
  c.rect(x - 1, y + r - 2, 3, r, "b")
  c.circ(x, y, r, "g")
  c.circ(x + 2, y + 2, r - 2, "P")
  c.circ(x - 1, y - 1, r - 3, "g")
  c.circ(x - r / 3, y - r / 3, Math.max(1, r / 3), "G")
}

function windows(c, x, y, w, h, win, lit, seed, sx = 4, sy = 5) {
  const r = c.rng(seed)
  for (let wy = y + 3; wy < y + h - 3; wy += sy)
    for (let wx = x + 2; wx < x + w - 2; wx += sx) c.rect(wx, wy, 2, 3, r() < lit ? "d" : win)
}

function block(c, x, y, w, h, wall, win, lit, seed) {
  c.rect(x, y, w, h, wall)
  c.rect(x + w - 2, y, 2, h, c.key(x, y) === wall ? wall : wall)
  windows(c, x, y, w, h, win, lit, seed)
  c.shade([x + w - 3, y, 3, h], 1)
  c.hline(x, y, w, "k")
}

// Коммунальный мост: полотно на пологих арках
function communal(c, y, deck, dark) {
  c.rect(0, y - 3, W, 1, dark)
  for (let x = 0; x < W; x += 3) c.px(x, y - 2, dark)
  c.rect(0, y, W, 3, deck)
  c.hline(0, y + 3, W, dark)
  const piers = [-40, 30, 110, 190, 270, 350]
  for (let i = 0; i < piers.length - 1; i++) {
    const a = piers[i], b = piers[i + 1], cx = (a + b) / 2, rx = (b - a) / 2
    for (let x = a; x <= b; x++) {
      const k = (x - cx) / rx
      const ay = Math.round(y + 4 + 14 * (1 - Math.sqrt(Math.max(0, 1 - k * k))))
      c.rect(x, ay, 1, 2, deck)
      if (x % 6 === 0) c.vline(x, y + 4, ay - y - 4, dark)
    }
  }
  for (const px of piers) { c.rect(px - 4, y + 4, 9, 20, dark); c.vline(px - 4, y + 4, 20, deck) }
}

// Часовня Параскевы Пятницы
function chapel(c, x, y) {
  c.rect(x, y + 18, 18, 22, "Y")
  c.rect(x + 13, y + 18, 5, 22, "I")
  c.hline(x, y + 18, 18, "i")
  c.rect(x - 1, y + 38, 20, 2, "i")
  c.rect(x + 7, y + 28, 4, 12, "V")
  c.rect(x + 3, y + 22, 2, 4, "S"), c.rect(x + 13, y + 22, 2, 4, "S")
  c.poly([x - 1, y + 18, x + 9, y + 2, x + 19, y + 18], "P")
  c.poly([x + 9, y + 2, x + 19, y + 18, x + 12, y + 18], "p")
  c.circ(x + 9, y + 1, 2, "d")
  c.vline(x + 9, y - 7, 6, "d")
  c.hline(x + 7, y - 5, 5, "d")
  c.px(x + 8, y, "D")
}

function lamp(c, x, y, on) {
  c.vline(x, y, 26, "V")
  c.hline(x - 2, y + 25, 5, "V")
  c.rect(x - 2, y - 4, 5, 4, on ? "d" : "a")
  c.hline(x - 3, y - 5, 7, "V")
}

function bench(c, x, y) {
  c.rect(x, y, 30, 2, "B"), c.rect(x, y - 5, 30, 2, "B"), c.hline(x, y + 2, 30, "b")
  c.vline(x + 2, y - 6, 12, "V"), c.vline(x + 27, y - 6, 12, "V")
}

function clipDome(c, cx, by, rx, ry) {
  for (let x = -rx; x <= rx; x++) {
    const h = Math.round(ry * Math.sqrt(1 - (x / rx) ** 2))
    c.vline(cx + x, by - h, h, x < 0 ? "I" : "i")
    c.px(cx + x, by - h, "T")
  }
}

function stars(c, n, maxY, seed) {
  const r = c.rng(seed)
  for (let i = 0; i < n; i++) c.px(Math.floor(r() * W), Math.floor(r() * maxY), r() < 0.3 ? "D" : "U")
}

function moon(c, x, y, r) {
  c.circ(x, y, r, "D")
  c.circ(x + 2, y - 1, r - 1, "Y")
  c.px(x - 2, y + 1, "d"), c.px(x + 1, y + 3, "d")
}

function sun(c, x, y, r) {
  c.circ(x, y, r + 3, "d")
  c.circ(x, y, r, "D")
  c.circ(x - 1, y - 1, r - 2, "Y")
}

function city(c, base, wall, win, lit, seed, minH = 10, maxH = 34) {
  const r = c.rng(seed)
  for (let x = -4; x < W; ) {
    const w = 10 + Math.floor(r() * 14), h = minH + Math.floor(r() * (maxH - minH))
    c.rect(x, base - h, w, h, wall)
    windows(c, x, base - h, w, h, win, lit, seed + x, 3, 4)
    x += w + 1 + Math.floor(r() * 3)
  }
}

function embankmentRail(c, y, top, post) {
  c.rect(0, y, W, 2, top)
  for (let x = 2; x < W; x += 8) c.rect(x, y + 2, 2, 7, post)
  c.hline(0, y + 6, W, post)
}

function paving(c, y, base, line) {
  c.rect(0, y, W, H - y, base)
  for (let row = 0; y + 4 + row * 6 < H; row++) {
    const yy = y + 4 + row * 6
    c.hline(0, yy, W, line)
    for (let x = (row % 2) * 8; x < W; x += 16) c.vline(x, yy - 5, 5, line)
  }
}

// ---------- Сцены ----------

scene("title", { w: W, h: H, bg: "s" },
  (c) => {
    c.grad(0, 0, W, 120, "VsuU", "v", 0.6)
    stars(c, 70, 80, 3)
    moon(c, 262, 30, 11)
    hills(c, 98, 22, "u", 2, 0.8)
    stolby(c, 20, 96, "V", "u")
    hills(c, 108, 12, "V", 5)
    chapel(c, 70, 52)
    c.vline(78, 92, 20, "V")
    city(c, 128, "v", "V", 0.35, 9)
    river(c, 128, 52, "VsS", "t")
    communal(c, 118, "u", "V")
  })

scene("prologue", { w: W, h: H, bg: "v" },
  (c) => {
    c.grad(0, 0, W, 110, "vVu", "v", 0.6)
    stars(c, 60, 70, 5)
    moon(c, 60, 26, 8)
    hills(c, 96, 16, "V", 3)
    chapel(c, 150, 50)
    city(c, 122, "v", "V", 0.15, 4)
    c.rect(0, 122, W, 58, "b")
    c.grad(0, 122, W, 58, "bK", "v", 0.4)
    const r = c.rng(2)
    for (let i = 0; i < 24; i++) c.hline(Math.floor(r() * W), 128 + Math.floor(r() * 50), 3, "K")
    for (const hx of [40, 120, 200, 280]) {
      c.ellipse(hx, 150, 14, 5, "K"), c.ellipse(hx, 151, 9, 3, "e")
      c.ellipse(hx - 14, 146, 5, 3, "B"), c.ellipse(hx + 15, 147, 4, 2, "B")
    }
  })

// 1. Центральная набережная у Коммунального моста
scene("embankment", { w: W, h: H, bg: "t" },
  (c) => {
    c.grad(0, 0, W, 80, "StT", "v", 0.7)
    sun(c, 46, 26, 8)
    c.ellipse(220, 30, 22, 5, "T"), c.ellipse(236, 26, 14, 5, "T"), c.ellipse(120, 48, 16, 3, "T")
    hills(c, 76, 18, "g", 1, 0.7)
    stolby(c, 200, 70, "g", "G")
    hills(c, 84, 8, "P", 4)
    river(c, 84, 48, "StS", "T")
    communal(c, 66, "I", "A")
    // набережная
    embankmentRail(c, 128, "I", "a")
    paving(c, 137, "i", "A")
    c.rect(0, 137, W, 3, "I")
    lamp(c, 28, 104, false), lamp(c, 292, 104, false)
  })

// 2. Парк «Солнечная поляна»
scene("sunny", { w: W, h: H, bg: "T" },
  (c) => {
    c.grad(0, 0, W, 100, "StT", "v", 0.7)
    sun(c, 262, 30, 13)
    c.ellipse(80, 26, 22, 5, "T"), c.ellipse(64, 22, 12, 4, "T")
    block(c, 8, 44, 46, 58, "y", "S", 0.05, 1)
    block(c, 60, 32, 34, 70, "M", "S", 0.05, 2)
    block(c, 196, 52, 52, 50, "I", "S", 0.05, 3)
    c.grad(0, 100, W, 80, "Gg", "v", 0.5)
    c.rect(0, 100, W, 2, "g")
    // дорожка
    c.poly([120, 100, 200, 100, 260, 180, 70, 180], "y")
    c.poly([120, 100, 140, 100, 100, 180, 70, 180], "M")
    roundTree(c, 110, 84, 16)
    roundTree(c, 296, 86, 18)
    roundTree(c, 30, 96, 12)
    // клумбы
    const r = c.rng(11)
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(r() * W), y = 110 + Math.floor(r() * 66)
      if (c.is(x, y, "y") || c.is(x, y, "M")) continue
      c.px(x, y, ["m", "D", "Y", "O"][i % 4]), c.px(x, y + 1, "P")
    }
    bench(c, 18, 150)
  })

// 3. Сквер Юдина: деревянный дом и шкаф буккроссинга
scene("yudin", { w: W, h: H, bg: "T" },
  (c) => {
    c.grad(0, 0, W, 110, "StT", "v", 0.7)
    c.ellipse(260, 22, 26, 5, "T")
    // деревянный дом купца с резными наличниками
    c.rect(14, 46, 112, 68, "B")
    for (let y = 48; y < 114; y += 4) c.hline(14, y, 112, "b")
    c.poly([8, 46, 70, 14, 132, 46], "R")
    c.poly([70, 14, 132, 46, 100, 46], "r")
    c.poly([60, 34, 70, 26, 80, 34], "N")
    for (const wx of [26, 60, 94]) {
      c.rect(wx - 3, 60, 20, 30, "N")
      c.poly([wx - 4, 60, wx + 7, 53, wx + 18, 60], "N")
      c.rect(wx, 63, 14, 24, "S"), c.vline(wx + 7, 63, 24, "N"), c.hline(wx, 74, 14, "N")
      c.rect(wx + 1, 64, 5, 9, "t")
      c.hline(wx - 4, 90, 22, "Y")
    }
    c.shade([116, 46, 10, 68], 1)
    roundTree(c, 150, 70, 20)
    roundTree(c, 300, 66, 18)
    c.grad(0, 112, W, 68, "gP", "v", 0.4)
    c.poly([0, 132, W, 128, W, 146, 0, 152], "y")
    c.hline(0, 132, W, "C")
    // шкаф буккроссинга
    const bx = 216, by = 70
    c.rect(bx, by, 50, 62, "B")
    c.poly([bx - 4, by, bx + 25, by - 12, bx + 54, by], "R")
    c.rect(bx - 2, by, 54, 3, "b")
    const cols = ["m", "S", "d", "g", "U", "O", "R", "t"]
    for (let s = 0; s < 3; s++) {
      c.rect(bx + 4, by + 6 + s * 18, 42, 15, "K")
      const r = c.rng(s + 3)
      for (let b = 0, x = bx + 5; x < bx + 44; b++) {
        const w = 3 + Math.floor(r() * 2), h = 11 + Math.floor(r() * 3)
        if (r() < 0.15) { x += 4; continue }
        c.rect(x, by + 6 + s * 18 + 15 - h, w, h, cols[(b + s * 3) % cols.length])
        c.vline(x, by + 6 + s * 18 + 15 - h, h, "k")
        x += w + 1
      }
    }
    c.light([bx, by, 20, 62], 1, 0.4)
    c.vline(bx + 49, by, 62, "b")
    // разбросанные книги
    c.rect(190, 160, 9, 3, "S"), c.rect(280, 166, 8, 3, "m"), c.rect(170, 172, 9, 3, "d")
    bench(c, 40, 150)
  })

// 4. Караульная гора на закате
scene("karaul", { w: W, h: H, bg: "u" },
  (c) => {
    c.grad(0, 0, W, 130, "VuUmMd", "v", 0.7)
    stars(c, 26, 40, 8)
    moon(c, 52, 24, 6)
    city(c, 152, "V", "u", 0.45, 12, 6, 20)
    river(c, 152, 28, "VsS", "U")
    // гора
    for (let x = 40; x < 300; x++) {
      const k = (x - 170) / 130
      const y = Math.round(70 + 82 * k * k)
      c.vline(x, y, 152 - y, "P")
      c.vline(x, y, 2, x < 170 ? "G" : "g")
      if (x < 170) c.vline(x, y + 2, Math.max(0, Math.round((170 - x) / 10)), "g")
    }
    // тропа к часовне и кусты
    for (let i = 0; i < 40; i++) c.rect(100 + i * 1.6, 150 - i * 2, 3, 1, "y")
    for (const [x, y, r] of [[80, 128, 5], [96, 118, 4], [250, 124, 6], [270, 136, 5], [120, 140, 4], [230, 110, 4]]) {
      c.circ(x, y, r, "p"), c.circ(x - 1, y - 1, r - 1, "g"), c.px(x - 2, y - 2, "G")
    }
    chapel(c, 160, 30)
    // смотровая площадка и пушка
    c.hline(110, 98, 40, "Y")
    for (let x = 110; x < 150; x += 5) c.vline(x, 92, 6, "Y")
    c.hline(110, 92, 40, "Y")
    c.line(212, 92, 230, 88, "a", 3), c.circ(214, 96, 4, "b"), c.circ(214, 96, 1, "a")
  })

// 5. Сквер Космонавтов в Зелёной Роще
scene("cosmos", { w: W, h: H, bg: "v" },
  (c) => {
    c.grad(0, 0, W, 120, "vVsu", "v", 0.7)
    stars(c, 80, 100, 15)
    // ракета-памятник
    const rx = 222
    c.rect(rx - 7, 30, 14, 70, "I")
    c.rect(rx + 2, 30, 5, 70, "i")
    c.poly([rx - 7, 30, rx, 6, rx + 7, 30], "R")
    c.poly([rx, 6, rx + 7, 30, rx + 2, 30], "r")
    c.circ(rx, 46, 4, "S"), c.ring(rx, 46, 4, "A"), c.px(rx - 1, 45, "T")
    c.hline(rx - 7, 64, 14, "R")
    c.poly([rx - 7, 80, rx - 16, 104, rx - 7, 100], "A")
    c.poly([rx + 7, 80, rx + 16, 104, rx + 7, 100], "a")
    c.rect(rx - 20, 104, 40, 12, "A"), c.rect(rx - 24, 116, 48, 4, "a")
    c.hline(rx - 20, 104, 40, "i")
    c.grad(0, 118, W, 62, "PpP", "v", 0.4)
    for (const x of [16, 44, 70, 286, 310]) pine(c, x, 64 + (x % 3) * 6, 1.6)
    c.poly([90, 130, 300, 130, 320, 150, 70, 150], "a")
    c.hline(90, 130, 210, "A")
  })

// 6. Набережная Хазрета Совмена на закате
scene("sovmen", { w: W, h: H, bg: "M" },
  (c) => {
    c.grad(0, 0, W, 90, "mMdD", "v", 0.7)
    sun(c, 236, 56, 12)
    hills(c, 84, 20, "U", 6, 0.8)
    stolby(c, 40, 82, "u", "U")
    river(c, 84, 44, "mOd", "D")
    c.hline(160, 100, 150, "D"), c.hline(190, 106, 100, "D")
    embankmentRail(c, 124, "y", "b")
    paving(c, 133, "M", "y")
    c.rect(0, 133, W, 3, "y")
    for (const x of [28, 64, 296]) birch(c, x, 92, 40)
    // казачье знамя
    c.vline(126, 60, 76, "b")
    c.rect(127, 60, 30, 18, "R")
    c.hline(127, 60, 30, "d"), c.hline(127, 77, 30, "d"), c.vline(156, 60, 18, "d")
    c.rect(137, 64, 10, 10, "d"), c.rect(139, 66, 6, 6, "R")
    c.circ(126, 58, 2, "d")
    // самородки
    for (const [x, y] of [[200, 160], [236, 170], [260, 156], [180, 172]]) { c.rect(x, y, 3, 2, "d"), c.px(x, y, "D") }
  })

// 7. Ярыгинская набережная
scene("yarygin", { w: W, h: H, bg: "T" },
  (c) => {
    c.grad(0, 0, W, 70, "StT", "v", 0.7)
    sun(c, 40, 24, 8)
    hills(c, 64, 14, "g", 2)
    stolby(c, 250, 60, "g", "G")
    river(c, 64, 42, "StS", "T")
    // дальний мост
    c.rect(140, 58, 180, 3, "I")
    for (let x = 150; x < W; x += 26) { c.rect(x, 61, 4, 16, "A"), c.vline(x, 61, 16, "I") }
    // спортивная арена
    c.rect(184, 90, 104, 18, "I")
    clipDome(c, 236, 90, 52, 14)
    c.rect(184, 96, 104, 3, "S")
    for (let x = 190; x < 286; x += 8) c.vline(x, 99, 9, "i")
    c.shade([262, 76, 26, 32], 1)
    c.rect(0, 106, W, 4, "M")
    paving(c, 110, "I", "i")
    // борцовский ковёр
    c.poly([24, 138, 176, 138, 196, 176, 4, 176], "R")
    c.poly([40, 142, 160, 142, 174, 172, 26, 172], "d")
    c.poly([52, 146, 148, 146, 158, 168, 42, 168], "R")
    c.ellipse(100, 157, 22, 6, "m")
    lamp(c, 196, 80, false), lamp(c, 306, 80, false)
  })

// 8. Сквер Сурикова зимой
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

// 9. Площадь Мира и памятник Резанову
scene("rezanov", { w: W, h: H, bg: "u" },
  (c) => {
    c.grad(0, 0, W, 110, "VuUmM", "v", 0.7)
    stars(c, 20, 40, 19)
    // музейный центр «Площадь Мира»
    c.rect(8, 50, 140, 62, "M")
    c.rect(4, 44, 148, 6, "i")
    for (let x = 14; x < 146; x += 12) c.rect(x, 54, 5, 50, "C")
    c.rect(60, 80, 34, 32, "b")
    c.shade([130, 44, 22, 68], 1)
    // Енисей вдали
    river(c, 96, 16, "uU", "M")
    c.rect(148, 88, 172, 10, "V")
    // постамент и командор
    const mx = 224
    c.rect(mx - 22, 98, 48, 36, "A")
    c.rect(mx - 26, 94, 56, 5, "i"), c.rect(mx - 26, 132, 56, 4, "a")
    c.shade([mx + 10, 98, 16, 36], 1)
    // командор в плаще и двууголке, рука на эфесе
    c.rect(mx - 3, 82, 4, 12, "o"), c.rect(mx + 4, 82, 4, 12, "o")
    c.poly([mx - 6, 58, mx + 11, 58, mx + 14, 84, mx - 9, 84], "O")
    c.poly([mx + 2, 58, mx + 11, 58, mx + 14, 84, mx + 4, 84], "o")
    c.rect(mx - 2, 56, 10, 4, "d")
    c.ellipse(mx + 2, 50, 4, 5, "O")
    c.poly([mx - 7, 46, mx + 2, 40, mx + 11, 46, mx + 2, 44], "o")
    c.line(mx - 6, 60, mx - 9, 74, "O", 2)
    c.line(mx + 11, 62, mx + 14, 72, "o", 2)
    c.line(mx + 14, 72, mx + 12, 90, "d")
    c.px(mx, 49, "d"), c.vline(mx - 5, 60, 22, "d")
    c.grad(0, 136, W, 44, "aA", "v", 0.4)
    c.rect(0, 136, W, 2, "i")
    for (let x = 0; x < W; x += 20) c.hline(x, 150 + (x % 40 ? 0 : 12), 18, "a")
  })

// Финал: Стрелка, место основания острога
scene("strelka", { w: W, h: H, bg: "v" },
  (c) => {
    c.grad(0, 0, W, 100, "vVuV", "v", 0.6)
    stars(c, 60, 80, 23)
    moon(c, 44, 26, 9)
    river(c, 104, 76, "VsV", "S")
    // Кача впадает в Енисей
    for (let i = 0; i < 44; i++) c.rect(Math.round(i * 2.2), Math.round(74 + i * 0.7), 8, 4, "s")
    // красный яр
    for (let x = 170; x < W; x++) {
      const y = Math.round(54 + 14 * Math.sin((x - 170) / 40))
      c.vline(x, y, 120 - y, "R")
      if (x % 7 < 2) c.vline(x, y + 8, 30, "m")
      if (x % 9 === 0) c.vline(x, y + 30, 18, "r")
    }
    c.rect(170, 48, 150, 8, "P")
    // частокол острога
    for (let x = 196; x < 300; x += 5) c.poly([x, 48, x + 2, 26, x + 4, 48], "u")
    c.rect(240, 12, 14, 20, "u"), c.poly([236, 12, 247, 2, 258, 12], "U")
    // левый берег, где собираются суслики
    c.poly([0, 132, 120, 138, 150, 150, 160, 180, 0, 180], "b")
    c.poly([0, 132, 120, 138, 126, 142, 0, 138], "B")
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
