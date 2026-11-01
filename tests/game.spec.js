// Сквозные проверки: победа, поражение, повтор уровня, финал, восстановление
// сохранения, выход во время ответа и прохождение только с клавиатуры.
const { test, expect } = require('@playwright/test');

const SAVE_KEY = 'suslik-quest-v1';

// Открыть игру с заданным сохранением (строкой или объектом) или без него
async function open(page, saveData) {
  await page.goto('/');
  await page.evaluate(([key, data]) => {
    localStorage.clear();
    if (data !== undefined) localStorage.setItem(key, typeof data === 'string' ? data : JSON.stringify(data));
  }, [SAVE_KEY, saveData]);
  await page.reload();
  await expect(page.locator('#t-new')).toBeVisible();
}

const readSave = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE_KEY);

// Листать диалог, пока не появится нужный элемент
async function advance(page, until) {
  for (let i = 0; i < 60; i++) {
    if (await page.locator(until).count()) return;
    // во время шторки перехода клик не проходит — просто ждём новый экран
    try { await page.locator('.dlg').click({ timeout: 1000 }); } catch (e) { await page.waitForTimeout(100); }
  }
  throw new Error(`не дождались ${until}`);
}

// Номер (1..4) правильного или неправильного ответа на текущий вопрос
async function answerIndex(page, right) {
  return page.evaluate(right => {
    const qt = document.querySelector('.qtext').textContent;
    const q = [...LEVELS.flatMap(l => l.quiz), ...FINALE.quiz].find(x => x.q === qt);
    const btns = [...document.querySelectorAll('.answer')];
    const i = btns.findIndex(b => (b.textContent.slice(1) === q.a[0]) === right);
    return i + 1;
  }, right);
}

async function answer(page, right) {
  await expect(page.locator('.answers')).toBeVisible();
  await page.locator('.answer').nth((await answerIndex(page, right)) - 1).click();
  await page.locator('.fact .next').click();
}

const instant = { v: 2, done: {}, finale: false, sound: false, instant: true };
const allDone = () => ({ ...instant, done: { kras: true, raya: true, afonya: true, strazh: true, nazar: true, obrada: true, yar: true, suri: true, kr: true } });

async function startLevel(page, id) {
  await page.evaluate(id => startLevel(LEVELS.find(l => l.id === id)), id);
  await expect(page.locator('.dlg')).toBeVisible();
  await advance(page, '#app .menu-list .opt');
  await page.locator('#app .menu-list .opt').first().click();
  await advance(page, '.answers');
}

test('победа: спасённый суслик сохраняется, счётчики считают локации и сусликов', async ({ page }) => {
  await open(page, instant);
  await startLevel(page, 'kr');
  for (let i = 0; i < 3; i++) await answer(page, true);
  await advance(page, '.card-box');
  expect((await readSave(page)).done).toEqual({ kr: true });
  await page.locator('.card-box .next').click();
  await expect(page.locator('.progress')).toContainText('Локации: 1/9 · Суслики: 2/10');
  await expect(page.locator('#wordbar .tile.lit')).toHaveCount(2);
});

test('поражение и повтор уровня', async ({ page }) => {
  await open(page, instant);
  await startLevel(page, 'yar');
  // отвечаем неверно, пока не погаснут все фонарики (их 2 или 3 — зависит от выбора)
  for (let i = 0; i < 3 && !(await page.locator('#f-retry').count()); i++) await answer(page, false);
  await expect(page.locator('#f-retry')).toBeVisible();
  expect((await readSave(page)).done).toEqual({});
  await page.locator('#f-retry').click();
  await expect(page.locator('#f-retry')).toHaveCount(0);
  await expect(page.locator('.place b')).toHaveText('Ярыгинская набережная');
  await advance(page, '#app .menu-list .opt');
  // после повтора кокон снова целый, а фонарики восстановлены
  expect(await page.evaluate(() => view.scene.actors[0].cracks)).toBe(0);
  await page.locator('#app .menu-list .opt').first().click();
  await advance(page, '.answers');
  await expect(page.locator('.lamp.on')).toHaveCount(3);
});

test('финал и концовка', async ({ page }) => {
  await open(page, allDone());
  await page.locator('#t-cont').click();
  // финал уже выбран на карте: кнопка «В бой» в фокусе
  await expect(page.locator('.map-info .go')).toBeFocused();
  await page.keyboard.press('Enter');
  await advance(page, '.answers');
  for (let i = 0; i < 5; i++) await answer(page, true);
  await advance(page, '.ending-box');
  expect((await readSave(page)).finale).toBe(true);
});

for (const [name, data] of [
  ['пустые поля', { done: null, letters: null }],
  ['массив вместо объекта', { done: [1, 2], letters: 'abc', finale: 'yes' }],
  ['не JSON', '{oops'],
  ['чужие локации и финал без локаций', { done: { kras: true, hacker: true, __proto__x: true }, finale: true, sound: 'loud' }],
]) {
  test(`повреждённое сохранение восстанавливается: ${name}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await open(page, data);
    await page.locator('#btn-map').click();
    await expect(page.locator('.progress')).toBeVisible();
    const s = await page.evaluate(() => save);
    const ids = await page.evaluate(() => LEVELS.map(l => l.id));
    expect(s.v).toBe(2);
    expect(Object.keys(s.done).every(id => ids.includes(id))).toBe(true);
    expect(s.finale).toBe(false);
    expect(typeof s.sound).toBe('boolean');
    expect(errors).toEqual([]);
  });
}

test('выход на карту во время ответа не оживляет старую викторину', async ({ page }) => {
  await open(page, instant);
  await startLevel(page, 'raya');
  await page.locator('.answer').nth((await answerIndex(page, true)) - 1).click();
  // пояснение появляется через 700 мс — уходим раньше
  await page.locator('#btn-map').click();
  await expect(page.locator('#confirm')).toBeVisible();
  await page.locator('#confirm .opt.primary').click();
  await expect(page.locator('.pins')).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(page.locator('.fact')).toHaveCount(0);
  // управление принадлежит карте: стрелка выбирает следующую метку
  const before = await page.locator('.map-info h3').textContent();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.map-info h3')).not.toHaveText(before);
  await expect(page.locator('.pins')).toBeVisible();
});

test('«Остаться» в окне выхода продолжает уровень', async ({ page }) => {
  await open(page, instant);
  await startLevel(page, 'suri');
  await page.locator('#btn-album').click();
  await page.locator('#confirm .opt:not(.primary)').click();
  await expect(page.locator('.answers')).toBeVisible();
});

test('Enter на кнопке верхней панели не листает диалог', async ({ page }) => {
  await open(page, instant);
  await page.evaluate(() => startLevel(LEVELS[0]));
  const before = await page.locator('.dlg .txt').textContent();
  await page.locator('#btn-sound').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  expect(await page.locator('.dlg .txt').textContent()).toBe(before);
  expect(await page.evaluate(() => save.sound)).toBe(true);
});

test('уменьшение движения: без вспышек и тряски даже при ответах', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, instant);
  await startLevel(page, 'nazar');
  // следим за эффектами на каждом кадре, пока даём верный и неверный ответ
  await page.evaluate(() => {
    window.__fx = 0;
    const tick = () => { if (view.flash > 0 || view.shake > 0 || view.sparks.length) window.__fx++; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await answer(page, true);
  await answer(page, false);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__fx)).toBe(0);
});

test('уменьшение движения: текст сразу целиком', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await page.evaluate(() => startLevel(LEVELS[0]));
  const full = await page.evaluate(() => LEVELS[0].intro[0].text);
  await expect(page.locator('.dlg .txt')).toHaveText(full);
  await expect(page.locator('#sr')).toContainText(full);
});

test('уровень проходится только с клавиатуры', async ({ page, isMobile }) => {
  test.skip(isMobile, 'клавиатура проверяется на настольном экране');
  await open(page, { ...instant, done: {} });
  await page.keyboard.press('Enter');                       // «Начать игру» в фокусе
  for (let i = 0; i < 30 && !(await page.locator('.pins').count()); i++) {
    await page.keyboard.press('Enter'); await page.waitForTimeout(40);
  }
  await expect(page.locator('.pins')).toBeVisible();
  await expect(page.locator('.map-info .go')).toBeFocused(); // первая метка уже выбрана
  await page.keyboard.press('ArrowRight');                  // вторая метка
  await page.keyboard.press('ArrowLeft');                   // и обратно к первой
  await page.keyboard.press('Enter');
  await expect(page.locator('.dlg')).toBeVisible();
  for (let i = 0; i < 30 && !(await page.locator('#app .menu-list .opt').count()); i++) {
    await page.keyboard.press('Enter'); await page.waitForTimeout(40);
  }
  await page.keyboard.press('1');
  for (let i = 0; i < 30 && !(await page.locator('.answers').count()); i++) {
    await page.keyboard.press('Enter'); await page.waitForTimeout(40);
  }
  for (let k = 0; k < 3; k++) {
    await expect(page.locator('.answers')).toBeVisible();
    await page.keyboard.press(String(await answerIndex(page, true)));
    await expect(page.locator('.fact .next')).toBeFocused();
    await page.keyboard.press('Enter');
  }
  for (let i = 0; i < 30 && !(await page.locator('.card-box').count()); i++) {
    await page.keyboard.press('Enter'); await page.waitForTimeout(40);
  }
  await page.keyboard.press('Enter');
  await expect(page.locator('.pins')).toBeVisible();
  expect(Object.keys((await readSave(page)).done)).toEqual(['kras']);
});
