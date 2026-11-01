// Снимает скриншоты и кадры короткой записи игры для README.
// Запуск: npm start (в другом окне), затем node scripts/capture.js
// Кадры записи складываются в docs/frames/, GIF собирает scripts/make_gif.py.
const { chromium } = require('@playwright/test');
const fs = require('fs');

const URL = process.env.GAME_URL || 'http://localhost:8080/';
const KEY = 'suslik-quest-v1';
const out = p => `docs/${p}`;

// Снимок игрового окна; длинные страницы (альбом) — только первый экран
async function shot(page, name) {
  await page.waitForTimeout(400);
  const box = await page.locator('.console').boundingBox();
  await page.screenshot({ path: out(`screens/${name}.png`), clip: { ...box, height: Math.min(box.height, 760 - box.y) } });
}

async function setSave(page, data) {
  await page.evaluate(([k, d]) => localStorage.setItem(k, JSON.stringify(d)), [KEY, data]);
  await page.reload();
  await page.waitForSelector('#t-new');
}

// Листать диалог до нужного элемента
async function advance(page, until) {
  for (let i = 0; i < 60 && !(await page.locator(until).count()); i++) {
    await page.locator('.dlg').click();
    await page.waitForTimeout(30);
  }
}

async function rightAnswer(page) {
  return page.evaluate(() => {
    const qt = document.querySelector('.qtext').textContent;
    const q = LEVELS.flatMap(l => l.quiz).find(x => x.q === qt);
    return [...document.querySelectorAll('.answer')].findIndex(b => b.textContent.slice(1) === q.a[0]);
  });
}

(async () => {
  fs.mkdirSync(out('screens'), { recursive: true });
  fs.rmSync(out('frames'), { recursive: true, force: true });
  fs.mkdirSync(out('frames'), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  await page.goto(URL);
  const base = { v: 2, sound: false, instant: true, finale: false };
  const some = { kras: true, raya: true, strazh: true, kr: true };

  // 1. Карта с частью спасённых сусликов
  await setSave(page, { ...base, done: some });
  await page.locator('#t-cont').click();
  await page.waitForSelector('.pins');
  await page.locator('.pin', { hasText: 'Н' }).click();
  await shot(page, 'map');

  // 2. Диалог: крот появляется у часовни
  await page.evaluate(() => startLevel(LEVELS.find(l => l.id === 'strazh')));
  await advance(page, '.dlg.villain');
  await shot(page, 'dialogue');

  // 3. Викторина: ответ дан, кокон трескается
  await advance(page, '#app .menu-list .opt');
  await page.locator('#app .menu-list .opt').nth(1).click();
  await advance(page, '.answers');
  await page.locator('.answer').nth(await rightAnswer(page)).click();
  await page.waitForTimeout(200);
  await shot(page, 'quiz');

  // 4. Альбом краеведа
  await page.evaluate(() => { guard = null; showAlbum(); });
  await shot(page, 'album');

  // 5. Запись: уровень у Коммунального моста от начала до спасения
  await setSave(page, { ...base, instant: false, done: some });
  await page.evaluate(() => startLevel(LEVELS.find(l => l.id === 'kras')));
  const box = await page.locator('.console').boundingBox();
  let n = 0;
  const rec = async ms => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      await page.screenshot({ path: out(`frames/${String(n++).padStart(4, '0')}.png`), clip: box });
      await page.waitForTimeout(60);
    }
  };
  // следующая реплика: если текст ещё печатается, сначала допечатать его
  const step = async () => {
    if (!(await page.locator('.more.ready').count())) await page.locator('.dlg').click();
    await page.locator('.dlg').click();
  };
  while (!(await page.locator('#app .menu-list .opt').count())) { await rec(1300); await step(); }
  await rec(900);
  await page.locator('#app .menu-list .opt').first().click();
  while (!(await page.locator('.answers').count())) { await rec(1100); await step(); }
  for (let k = 0; k < 3; k++) {
    await rec(900);
    await page.locator('.answer').nth(await rightAnswer(page)).click();
    await rec(1400);
    await page.locator('.fact .next').click();
  }
  while (!(await page.locator('.card-box').count())) { await rec(1300); await step(); }
  await rec(1800);
  console.log(`скриншоты: docs/screens, кадров записи: ${n}`);
  await browser.close();
})();
