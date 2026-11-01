"""Собирает docs/gameplay.gif из кадров docs/frames/ (их снимает scripts/capture.js)."""
import glob
import shutil
from PIL import Image

WIDTH = 560
frames = []
for f in sorted(glob.glob('docs/frames/*.png')):
    im = Image.open(f).convert('RGB')
    h = round(im.height * WIDTH / im.width)
    frames.append(im.resize((WIDTH, h), Image.LANCZOS))

# каждый второй кадр: запись идёт примерно 8 кадров в секунду
frames = frames[::2]
# своя палитра у каждого кадра: вспышки и затемнения не портят цвета остальных
frames = [f.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for f in frames]
frames[0].save('docs/gameplay.gif', save_all=True, append_images=frames[1:], duration=125, loop=0, optimize=True)
shutil.rmtree('docs/frames')
print('docs/gameplay.gif:', len(frames), 'кадров')
