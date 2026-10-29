"""Переводит присланные фоны в игровое разрешение 320×180: обрезает до 16:9
и уменьшает усреднением по клеткам (исходники нарисованы крупными «пикселями»).

Запуск: python3 art/prep_backgrounds.py <папка с распакованным art_background>
"""
import sys
import numpy as np
from PIL import Image

SRC = sys.argv[1]
OUT = 'assets/scenes/'
W, H = 320, 180

# сцена: (файл, где резать по вертикали 0..1 — 0 сверху, 1 снизу; тонировка)
SCENES = {
    'title': ('Начало игры.png', 0.6, None),
    'prologue': ('Ночной вход в «Солнечный сад».png', 0.5, None),
    'embankment': ('Пиксельная прогулка у реки.png', 0.7, None),
    'sunny': ('Пиксельный въезд в Солнечный.png', 0.7, None),
    'yudin': ('Осенняя прогулка по пиксельному городу.png', 0.7, None),
    'karaul': ('Пиксельная часовня на зелёном холме.png', 0.5, None),
    'cosmos': ('Пиксельный парк с ракетой.png', 0.6, None),
    'sovmen': ('Осенняя набережная в пиксель-арте.png', 0.7, None),
    'yarygin': ('Осенний пиксельный берег реки.png', 0.7, None),
    'rezanov': ('Пиксельный памятник генералу Раевскому.png', 0.6, None),
    # финальная битва идёт в сумерках
    'strelka': ('Пиксельная набережная у мемориального камня.png', 0.7, (70, 40, 110, 0.45)),
}

for name, (file, pos, tint) in SCENES.items():
    im = Image.open(f'{SRC}/{file}').convert('RGB')
    w, h = im.size
    if w / h > W / H:
        cw = round(h * W / H)
        x0 = (w - cw) // 2
        im = im.crop((x0, 0, x0 + cw, h))
    else:
        ch = round(w * H / W)
        y0 = round((h - ch) * pos)
        im = im.crop((0, y0, w, y0 + ch))
    im = im.resize((W, H), Image.BOX)
    if tint:
        a = np.asarray(im).astype(float)
        r, g, b, k = tint
        a = a * (1 - k) + a * np.array([r, g, b]) / 255 * k
        im = Image.fromarray(a.clip(0, 255).astype(np.uint8))
    im.save(OUT + name + '.png')
    print(name)
