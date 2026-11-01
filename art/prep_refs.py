"""Готовит референсы сусликов для pxl: вырезает фигуры из присланных артов,
убирает фон и уменьшает до игрового размера с сохранением мелких тёмных
деталей (глаза, нос, контур), которые обычное усреднение стирает.

Запуск: python3 art/prep_refs.py <папка с исходными картинками 1.webp…5.webp>
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = sys.argv[1]
OUT = 'art/ref/'

# имя: (картинка, область вырезки, высота в игре)
CUTS = {
    'kras': (3, (52, 13, 594, 517), 56),
    'raya': (1, (64, 207, 672, 529), 34),
    'afonya': (1, (930, 632, 1214, 1174), 60),
    'strazh': (2, (221, 22, 578, 599), 62),
    'nazar': (2, (174, 637, 563, 1236), 62),
    'obrada': (3, (868, 509, 1241, 992), 54),
    'yar': (4, (203, 89, 888, 1344), 64),
    'suri': (5, (994, 35, 1497, 536), 52),
    'kr': (5, (879, 544, 1447, 984), 54),
}


BG = np.array([253, 247, 231]) / 255   # кремовый фон присланных картинок


def cut(img, box):
    im = img.crop(box)
    a = np.asarray(im).astype(float) / 255
    mx, mn = a.max(2), a.min(2)
    sat = (mx - mn) / (mx + 1e-6)
    lum = a @ [0.299, 0.587, 0.114]
    core = (lum < 0.80) | ((sat > 0.30) & (lum < 0.93))
    core = ndimage.binary_opening(core, iterations=1)
    core = ndimage.binary_closing(core, iterations=3)
    # дырки внутри фигуры заливаем, но не те, что на деле фон между деталями
    # (например, между мачтой, парусом и крокодилом у Краса)
    holes, n = ndimage.label(ndimage.binary_fill_holes(core) & ~core)
    for k in range(1, n + 1):
        region = holes == k
        if np.abs(a[region] - BG).sum(1).mean() > 0.12:
            core |= region
    lab, n = ndimage.label(core)
    sizes = ndimage.sum(core, lab, range(1, n + 1))
    keep = np.isin(lab, [k + 1 for k, s in enumerate(sizes) if s > 0.02 * sizes.max()])
    ys, xs = np.where(keep)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    return np.asarray(im)[y0:y1, x0:x1].astype(float) / 255, keep[y0:y1, x0:x1]


def shrink(rgb, mask, h):
    """Уменьшение по клеткам. В верхней части фигуры (голова) тёмные пиксели
    глаз и носа сохраняются, но смешиваются с окружающей шерстью, чтобы не
    превращаться в чёрные дыры; ниже (лапы) берётся обычная медиана."""
    H, W = mask.shape
    w = round(W * h / H)
    out = np.zeros((h, w, 4), np.uint8)
    lum = rgb @ [0.299, 0.587, 0.114]
    for ty in range(h):
        for tx in range(w):
            ys = slice(int(ty * H / h), max(int(ty * H / h) + 1, int((ty + 1) * H / h)))
            xs = slice(int(tx * W / w), max(int(tx * W / w) + 1, int((tx + 1) * W / w)))
            m = mask[ys, xs]
            if m.mean() < 0.5:
                continue
            px, lm = rgb[ys, xs][m], lum[ys, xs][m]
            dark = lm < 0.2
            col = np.median(px, 0)
            if ty < h * 0.45 and dark.mean() > 0.12:
                col = 0.6 * px[dark].mean(0) + 0.4 * col
            out[ty, tx, :3] = (col * 255).round()
            out[ty, tx, 3] = 255
    return Image.fromarray(out, 'RGBA')


imgs = {}
for name, (i, box, h) in CUTS.items():
    if i not in imgs:
        imgs[i] = Image.open(f'{SRC}/{i}.webp').convert('RGB')
    rgb, mask = cut(imgs[i], box)
    im = shrink(rgb, mask, h)
    im.save(OUT + name + '.png')
    print(name, im.size)
