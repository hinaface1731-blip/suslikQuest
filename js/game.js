// Движок игры: загрузка арта, сцена на canvas, диалоги, викторина, карта, сохранение, звук.
'use strict';

const $ = (s, el) => (el || document).querySelector(s);
const W = 320, H = 180;
const SAVE_KEY = 'suslik-quest-v1';
const BASE_LAMPS = 2;
const RAYS_TO_WIN = 3;
const BOSS_HP = 5;
const CREW = ['kras', 'raya', 'afonya', 'strazh', 'nazar', 'obrada', 'yar', 'suri', 'r', 'k'];

// ---------- Сохранение ----------
function freshSave() { return { done: {}, letters: Array(10).fill(false), finale: false, sound: true }; }
let save = (() => {
  try { return Object.assign(freshSave(), JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); }
  catch (e) { return freshSave(); }
})();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* приватный режим */ } }
const hasProgress = () => Object.keys(save.done).length > 0 || save.finale;

// ---------- Звук (8-битные «пики» через WebAudio) ----------
let audio = null;
function tone(freq, dur, type, when, vol) {
  if (!save.sound) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = audio.currentTime + (when || 0);
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.05, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(audio.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch (e) { /* без звука */ }
}
const sfx = {
  blip: () => tone(880, 0.03, 'square', 0, 0.012),
  click: () => tone(520, 0.06, 'square', 0, 0.04),
  good: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', i * 0.07)),
  bad: () => [300, 220, 160].forEach((f, i) => tone(f, 0.16, 'sawtooth', i * 0.1, 0.04)),
  win: () => [523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', i * 0.11)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, 'triangle', i * 0.16, 0.06)),
};

// ---------- Арт ----------
const ART = { sprites: {}, scenes: {} };
const SPRITE_NAMES = [...CREW, 'mole', 'soroka', 'cocoon_0', 'cocoon_1', 'cocoon_2', 'cocoon_3'];
const SCENE_NAMES = ['title', 'prologue', 'embankment', 'sunny', 'yudin', 'karaul', 'cosmos', 'sovmen', 'yarygin', 'surikov', 'rezanov', 'strelka', 'map'];

function loadImage(src) {
  return new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => fail(new Error(src)); i.src = src; });
}
function loadArt() {
  return Promise.all([
    ...SPRITE_NAMES.map(n => loadImage(`assets/sprites/${n}.png`).then(i => { ART.sprites[n] = i; })),
    ...SCENE_NAMES.map(n => loadImage(`assets/scenes/${n}.png`).then(i => { ART.scenes[n] = i; })),
  ]);
}

// Живые детали поверх статичных фонов: блики на воде, мерцание звёзд, снег
const SCENE_FX = {
  title: { water: [130, 50], stars: 80 }, prologue: { stars: 70 }, embankment: { water: [86, 40] },
  sunny: {}, yudin: {}, karaul: { stars: 40, water: [154, 26] }, cosmos: { stars: 100 },
  sovmen: { water: [86, 38], gold: true }, yarygin: { water: [66, 38] }, surikov: { snow: 60 },
  rezanov: { stars: 40 }, strelka: { stars: 80, water: [106, 30] }, map: {},
};

// ---------- Рендер сцены ----------
const view = { ctx: null, scene: null, flash: 0, flashCol: '255,240,160', shake: 0, sparks: [] };

function mountCanvas(canvas) {
  canvas.width = W; canvas.height = H;
  view.ctx = canvas.getContext('2d');
  view.ctx.imageSmoothingEnabled = false;
}
function setScene(scene) { view.scene = scene; view.sparks = []; }

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function drawFx(c, fx, t) {
  if (fx.stars) {
    const r = rng(5);
    for (let i = 0; i < 24; i++) {
      const x = Math.floor(r() * W), y = Math.floor(r() * fx.stars), ph = r() * 6;
      const a = Math.max(0, Math.sin(t / 500 + ph));
      if (a > 0.6) { c.fillStyle = `rgba(255,250,220,${a.toFixed(2)})`; c.fillRect(x, y, 1, 1); if (a > 0.95) { c.fillRect(x - 1, y, 3, 1); c.fillRect(x, y - 1, 1, 3); } }
    }
  }
  if (fx.water) {
    const [y0, h] = fx.water, r = rng(3);
    c.fillStyle = fx.gold ? 'rgba(255,240,190,0.75)' : 'rgba(230,245,255,0.6)';
    for (let i = 0; i < 18; i++) {
      const ly = y0 + 2 + Math.floor(r() * (h - 4)), len = 2 + Math.floor(r() * 4), sp = 30 + r() * 40;
      const x = (r() * W + t / sp) % (W + 10) - 5;
      if (Math.sin(t / 400 + i) > -0.3) c.fillRect(Math.round(x), ly, len, 1);
    }
  }
  if (fx.snow) {
    const r = rng(11);
    c.fillStyle = '#ffffff';
    for (let i = 0; i < fx.snow; i++) {
      const x0 = r() * W, sp = 8 + r() * 12, ph = r() * 100;
      const y = ((t / 1000) * sp + ph * 3) % H;
      c.fillRect(Math.round((x0 + Math.sin(t / 900 + ph) * 4 + W) % W), Math.round(y), 1, 1);
    }
  }
}

function drawActor(c, a, t) {
  if (a.hidden) return;
  if (a.kind === 'suslik') {
    if (a.cocoon) {
      const img = ART.sprites['cocoon_' + Math.min(3, a.cracks || 0)];
      const wob = a.wobble ? Math.round(Math.sin(t / 50) * a.wobble) : 0;
      c.drawImage(img, Math.round(a.x - img.width / 2 + wob), Math.round(a.y - img.height));
    } else {
      const img = ART.sprites[a.name];
      const hop = a.hop ? Math.round(Math.abs(Math.sin(t / 200 + a.x)) * 4) : 0;
      c.save();
      if (a.flip) { c.translate(Math.round(a.x), 0); c.scale(-1, 1); c.drawImage(img, Math.round(-img.width / 2), Math.round(a.y - img.height - hop)); }
      else c.drawImage(img, Math.round(a.x - img.width / 2), Math.round(a.y - img.height - hop));
      c.restore();
    }
  } else if (a.kind === 'mole') {
    a.rise += ((a.target || 0) - a.rise) * 0.08;
    const img = ART.sprites.mole, s = a.scale || 1;
    const w = img.width * s, h = img.height * s;
    c.fillStyle = '#120c0a';
    c.beginPath(); c.ellipse(Math.round(a.x), Math.round(a.y), w / 2 + 2, 4 * s, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#3a2418';
    c.fillRect(Math.round(a.x - w / 2 - 6), Math.round(a.y - 2), 6, 3 * s); c.fillRect(Math.round(a.x + w / 2), Math.round(a.y - 1), 7, 3 * s);
    const vis = Math.round(img.height * a.rise);
    if (vis > 0) {
      const bob = Math.round(Math.sin(t / 300));
      c.drawImage(img, 0, 0, img.width, vis, Math.round(a.x - w / 2), Math.round(a.y - vis * s + bob + 2 * s), w, vis * s);
    }
  } else if (a.kind === 'soroka') {
    const img = ART.sprites.soroka, bob = Math.round(Math.sin(t / 250) * 2);
    c.drawImage(img, Math.round(a.x - img.width / 2), Math.round(a.y - img.height / 2 + bob));
  }
}

function frame(t) {
  const c = view.ctx, sc = view.scene;
  if (c && sc && c.canvas.isConnected) {
    c.save();
    if (view.shake > 0) { c.translate(Math.round((Math.random() - 0.5) * view.shake), 0); view.shake *= 0.85; if (view.shake < 0.5) view.shake = 0; }
    c.drawImage(ART.scenes[sc.bg], 0, 0);
    drawFx(c, SCENE_FX[sc.bg] || {}, t);
    for (const a of (sc.actors || [])) drawActor(c, a, t);
    c.restore();
    for (const p of view.sparks) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life--;
      if (p.life > 0) { c.fillStyle = p.col; c.fillRect(Math.round(p.x), Math.round(p.y), p.life > 30 ? 2 : 1, p.life > 30 ? 2 : 1); }
    }
    view.sparks = view.sparks.filter(p => p.life > 0);
    if (view.flash > 0) {
      c.fillStyle = `rgba(${view.flashCol},${view.flash.toFixed(2)})`;
      c.fillRect(0, 0, W, H);
      view.flash = Math.max(0, view.flash - 0.04);
    }
  }
  requestAnimationFrame(frame);
}

function burst(x, y, col, n) {
  for (let i = 0; i < (n || 16); i++) {
    const a = Math.random() * Math.PI * 2, s = 0.5 + Math.random() * 1.6;
    view.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.8, life: 40 + Math.random() * 24, col });
  }
}

// ---------- Общий интерфейс ----------
const app = $('#app');
const fade = $('#fade');

function renderWordbar() {
  const bar = $('#wordbar');
  bar.innerHTML = '';
  [...WORD].forEach((ch, i) => {
    const s = document.createElement('span');
    s.className = 'tile' + (save.letters[i] ? ' lit' : '');
    s.textContent = save.letters[i] ? ch : '';
    s.title = save.letters[i] ? `Буква «${ch}» спасена` : 'Буква ещё в плену';
    bar.appendChild(s);
  });
  bar.setAttribute('aria-label', 'Спасённые буквы: ' + [...WORD].map((ch, i) => save.letters[i] ? ch : '_').join(' '));
}
function updateSoundBtn() {
  const b = $('#btn-sound');
  b.classList.toggle('off', !save.sound);
  b.setAttribute('aria-pressed', String(save.sound));
  b.title = save.sound ? 'Звук включён' : 'Звук выключен';
}
$('#btn-sound').addEventListener('click', () => { save.sound = !save.sound; persist(); updateSoundBtn(); sfx.click(); });
$('#btn-map').addEventListener('click', () => { sfx.click(); go(showMap); });
$('#btn-album').addEventListener('click', () => { sfx.click(); go(showAlbum); });
$('#logo').addEventListener('click', () => { sfx.click(); go(showTitle); });

let keyHandler = null;
document.addEventListener('keydown', e => { if (keyHandler && !e.altKey && !e.ctrlKey && !e.metaKey) keyHandler(e); });

// Переход со «шторкой»
let busy = false;
function go(fn) {
  if (busy) return;
  busy = true;
  fade.classList.add('on');
  setTimeout(() => { fn(); fade.classList.remove('on'); busy = false; }, 260);
}

function screen(html, cls) {
  keyHandler = null;
  app.className = 'screen ' + (cls || '');
  app.innerHTML = html;
  window.scrollTo(0, 0);
  const cv = $('canvas.scene', app);
  if (cv) mountCanvas(cv); else view.ctx = null;
}

function windowHtml(extra) {
  return `
    <section class="window">
      <div class="viewport">
        <canvas class="scene" aria-hidden="true"></canvas>
        <div class="place" hidden><b></b><span></span></div>
        <div class="qhud" hidden></div>
        ${extra || ''}
      </div>
      <div class="box" id="panel"></div>
    </section>`;
}
function setPlace(title, sub) {
  const p = $('.place'); p.hidden = false;
  $('b', p).textContent = title; $('span', p).textContent = sub || '';
}

function portrait(name, size) {
  const c = document.createElement('canvas');
  size = size || 40;
  c.width = size; c.height = size; c.className = 'portrait-cv';
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  const img = ART.sprites[name];
  if (img) x.drawImage(img, Math.round((size - img.width) / 2), img.height <= size ? size - img.height : 2);
  return c;
}

// ---------- Диалоги ----------
function runDialogue(panel, lines, done) {
  let i = 0, timer = null, full = '', shown = 0;
  panel.className = 'box';
  panel.innerHTML = `
    <div class="dlg" role="group" aria-live="polite">
      <div class="nameplate" hidden></div>
      <div class="face" hidden></div>
      <p class="txt"></p>
      <button class="more" aria-label="Дальше">▼</button>
    </div>`;
  const dlg = $('.dlg', panel), face = $('.face', panel), plate = $('.nameplate', panel), txt = $('.txt', panel), more = $('.more', panel);

  function show() {
    const ln = lines[i];
    const sp = SPEAKERS[ln.who] || { name: '' };
    face.innerHTML = '';
    face.hidden = !sp.sprite && ln.who !== 'all';
    if (sp.sprite) face.appendChild(portrait(sp.sprite));
    else if (ln.who === 'all') face.appendChild(portrait('nazar'));
    plate.textContent = sp.name; plate.hidden = !sp.name;
    dlg.className = 'dlg' + (ln.who === 'narrator' ? ' narr' : '') + (ln.who === 'mole' ? ' villain' : '');
    full = ln.text; shown = 0; txt.textContent = '';
    more.classList.remove('ready');
    if (ln.on) ln.on();
    clearInterval(timer);
    timer = setInterval(() => {
      shown = Math.min(full.length, shown + 2);
      txt.textContent = full.slice(0, shown);
      if (shown % 6 === 0) sfx.blip();
      if (shown >= full.length) { clearInterval(timer); more.classList.add('ready'); }
    }, 22);
  }
  function next() {
    if (shown < full.length) { clearInterval(timer); shown = full.length; txt.textContent = full; more.classList.add('ready'); return; }
    sfx.click();
    i++;
    if (i >= lines.length) { clearInterval(timer); keyHandler = null; done(); return; }
    show();
  }
  dlg.addEventListener('click', next);
  keyHandler = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } };
  show();
  more.focus({ preventScroll: true });
}

function runChoice(panel, choice, done) {
  panel.className = 'box';
  panel.innerHTML = `<p class="prompt"></p><div class="menu-list"></div>`;
  $('.prompt', panel).textContent = choice.prompt;
  const box = $('.menu-list', panel);
  choice.options.forEach((opt, n) => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.innerHTML = `<span class="key">${n + 1}</span>`;
    b.appendChild(document.createTextNode(opt.text));
    b.addEventListener('click', () => { sfx.click(); keyHandler = null; done(opt); });
    box.appendChild(b);
  });
  keyHandler = e => { const k = parseInt(e.key, 10); if (k >= 1 && k <= choice.options.length) box.children[k - 1].click(); };
  box.firstChild.focus({ preventScroll: true });
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Викторина. o: { panel, questions, lamps, maxLamps, goal, label, onCorrect(n), onWrong(left), win(), fail() }
function runQuiz(o) {
  const qs = shuffle(o.questions);
  let qi = 0, correct = 0, lamps = o.lamps;
  const hudEl = $('.qhud');

  function hud() {
    hudEl.hidden = false;
    hudEl.innerHTML = `
      <div class="meter"><span class="lbl">${o.label}</span>${'<i class="ray on"></i>'.repeat(correct)}${'<i class="ray"></i>'.repeat(Math.max(0, o.goal - correct))}</div>
      <div class="meter"><span class="lbl">Фонарики</span>${'<i class="lamp on"></i>'.repeat(lamps)}${'<i class="lamp"></i>'.repeat(Math.max(0, o.maxLamps - lamps))}</div>`;
  }

  function ask() {
    if (qi >= qs.length) { o.fail(); return; }
    const q = qs[qi];
    const answers = shuffle(q.a.map((text, idx) => ({ text, ok: idx === 0 })));
    hud();
    o.panel.className = 'box quiz';
    o.panel.innerHTML = `
      <div class="nameplate">Вопрос ${qi + 1}</div>
      <p class="qtext"></p>
      <div class="answers"></div>`;
    $('.qtext', o.panel).textContent = q.q;
    const box = $('.answers', o.panel);
    let answered = false;
    answers.forEach((ans, n) => {
      const b = document.createElement('button');
      b.className = 'opt answer';
      b.innerHTML = `<span class="key">${n + 1}</span>`;
      b.appendChild(document.createTextNode(ans.text));
      b.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        [...box.children].forEach((el, k) => { el.disabled = true; if (answers[k].ok) el.classList.add('right'); });
        if (ans.ok) { correct++; sfx.good(); o.onCorrect(correct); }
        else { lamps--; b.classList.add('wrong'); sfx.bad(); o.onWrong(lamps); }
        hud();
        setTimeout(() => showFact(ans.ok, q), 700);
      });
      box.appendChild(b);
    });
    keyHandler = e => { const k = parseInt(e.key, 10); if (!answered && k >= 1 && k <= answers.length) box.children[k - 1].click(); };
    box.firstChild.focus({ preventScroll: true });
  }

  function showFact(ok, q) {
    o.panel.className = 'box fact ' + (ok ? 'good' : 'bad');
    o.panel.innerHTML = `
      <div class="nameplate">${ok ? 'Верно! Луч света' : 'Мимо! Фонарик погас'}</div>
      <p class="txt"></p>
      <button class="btn primary next"></button>`;
    $('.txt', o.panel).textContent = q.fact;
    const nextBtn = $('.next', o.panel);
    nextBtn.textContent = correct >= o.goal ? 'Свет пробился! ▶' : lamps <= 0 ? 'Ой... ▶' : 'Следующий вопрос ▶';
    nextBtn.addEventListener('click', () => {
      sfx.click();
      qi++;
      if (correct >= o.goal) { hudEl.hidden = true; o.win(); }
      else if (lamps <= 0) { hudEl.hidden = true; o.fail(); }
      else ask();
    });
    keyHandler = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nextBtn.click(); } };
    nextBtn.focus({ preventScroll: true });
  }
  ask();
}

// ---------- Экраны ----------
function showTitle() {
  screen(windowHtml(`
    <div class="logo-art">
      <h1><span class="l1">Суслики</span><span class="l2">Красного Яра</span></h1>
    </div>`), 'title');
  setScene({ bg: 'title', actors: [
    { kind: 'suslik', name: 'nazar', x: 170, y: 160 }, { kind: 'suslik', name: 'r', x: 206, y: 160 },
    { kind: 'suslik', name: 'k', x: 236, y: 160 }, { kind: 'suslik', name: 'yar', x: 272, y: 160 },
    { kind: 'soroka', x: 136, y: 46 },
  ] });
  const panel = $('#panel');
  panel.className = 'box menu-box';
  panel.innerHTML = `
    <p class="tagline">Квест-викторина о Красноярске. Крот Кромешник утащил в норы десять бронзовых сусликов — спаси их и верни городу имя!</p>
    <div class="menu-list row">
      ${hasProgress() ? '<button class="opt primary" id="t-cont"><span class="key">▶</span>Продолжить</button>' : ''}
      <button class="opt ${hasProgress() ? '' : 'primary'}" id="t-new"><span class="key">▶</span>${hasProgress() ? 'Начать заново' : 'Начать игру'}</button>
      <button class="opt" id="t-album"><span class="key">▶</span>Альбом краеведа</button>
      <button class="opt" id="t-about"><span class="key">▶</span>Об игре</button>
    </div>`;
  const cont = $('#t-cont');
  if (cont) cont.addEventListener('click', () => { sfx.click(); go(showMap); });
  $('#t-new').addEventListener('click', () => {
    if (hasProgress() && !confirm('Начать заново? Весь прогресс будет сброшен.')) return;
    const snd = save.sound; save = freshSave(); save.sound = snd; persist(); renderWordbar();
    sfx.click(); go(showPrologue);
  });
  $('#t-album').addEventListener('click', () => { sfx.click(); go(showAlbum); });
  $('#t-about').addEventListener('click', () => { sfx.click(); go(showAbout); });
  (cont || $('#t-new')).focus({ preventScroll: true });
}

function showPrologue() {
  screen(windowHtml(), 'play');
  setPlace('Красноярск', 'Ночь, когда пропали суслики');
  const mole = { kind: 'mole', x: 160, y: 150, rise: 0, target: 0 };
  const sor = { kind: 'soroka', x: 60, y: 60, hidden: true };
  setScene({ bg: 'prologue', actors: [mole, sor] });
  const lines = PROLOGUE.map(l => Object.assign({}, l));
  lines[2].on = () => { mole.target = 1; view.shake = 5; sfx.bad(); };
  lines[4].on = () => { mole.target = 0; };
  lines[5].on = () => { sor.hidden = false; burst(sor.x, sor.y, '#fbf3df', 10); };
  runDialogue($('#panel'), lines, () => go(showMap));
}

function levelLetters(l) { return l.letters.map(i => WORD[i]).join(''); }

function showMap() {
  const allDone = LEVELS.every(l => save.done[l.id]);
  screen(windowHtml('<div class="pins"></div>'), 'map');
  setScene({ bg: 'map', actors: [] });
  const pins = $('.pins'), panel = $('#panel');
  const entries = LEVELS.map(l => ({ l, map: l.map, label: levelLetters(l), done: !!save.done[l.id], start: () => startLevel(l) }));
  if (allDone) entries.unshift({ boss: true, map: FINALE.map, label: '!', done: save.finale, start: startFinale });
  let selected = null;

  function select(en, focus) {
    selected = en;
    [...pins.children].forEach(p => p.classList.toggle('sel', p._en === en));
    panel.className = 'box map-info';
    const left = LEVELS.filter(l => !save.done[l.id]).length;
    const progress = `<p class="hint progress">${allDone ? (save.finale ? 'Город спасён! Любую локацию можно пройти ещё раз.' : 'Все буквы собраны — скорее на Стрелку!') : `Спасено ${LEVELS.length - left} из ${LEVELS.length}. Выбери метку на карте — порядок любой.`}</p>`;
    if (en.boss) {
      panel.innerHTML = `
        <div class="nameplate">Финал</div>
        <div class="info"><div class="info-body"><h3>Битва на Стрелке</h3><p class="addr">Место основания Красноярска, 1628 год</p>
        <p>Все суслики свободны! Кромешник ждёт там, где Кача впадает в Енисей.</p></div></div>
        <div class="map-actions">${progress}<button class="btn primary go">В бой ▶</button></div>`;
    } else {
      const l = en.l;
      panel.innerHTML = `
        <div class="nameplate">${en.label.split('').join(' и ')}</div>
        <div class="info"><div class="face"></div><div class="info-body"><h3></h3><p class="addr"></p><p class="status"></p></div></div>
        <div class="map-actions">${progress}<button class="btn primary go"></button></div>`;
      $('.face', panel).appendChild(portrait(l.who === 'k' ? 'r' : l.who));
      $('h3', panel).textContent = l.title;
      $('.addr', panel).textContent = '📍 ' + l.address;
      $('.status', panel).textContent = en.done ? 'Суслик спасён. Можно пройти ещё раз.' : 'В плену у Кромешника!';
      $('.go', panel).textContent = en.done ? 'Пройти снова ▶' : 'Отправиться ▶';
    }
    const goBtn = $('.go', panel);
    goBtn.addEventListener('click', () => { sfx.click(); go(en.start); });
    if (focus) goBtn.focus({ preventScroll: true });
  }

  for (const en of entries) {
    const pin = document.createElement('button');
    pin.className = 'pin' + (en.done ? ' done' : '') + (en.boss ? ' boss' : '');
    pin.style.left = (en.map[0] / W * 100) + '%';
    pin.style.top = (en.map[1] / H * 100) + '%';
    pin.textContent = en.label;
    pin._en = en;
    pin.setAttribute('aria-label', en.boss ? 'Финал: Стрелка' : `${en.l.title}, ${en.l.place}${en.done ? ', спасён' : ''}`);
    pin.addEventListener('click', () => { sfx.click(); if (selected === en) go(en.start); else select(en, true); });
    pins.appendChild(pin);
  }
  select(entries.find(e => !e.done) || entries[0], false);
  keyHandler = e => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const i = entries.indexOf(selected), d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
    select(entries[(i + d + entries.length) % entries.length], true);
  };
}

function startLevel(l) {
  screen(windowHtml(), 'play');
  setPlace(l.place, l.title);
  const sp = l.spots;
  const sus = { kind: 'suslik', name: l.couple ? 'k' : l.who, x: sp.suslik[0], y: sp.suslik[1], cocoon: true, cracks: 0, wobble: 0 };
  const actors = [sus];
  let sus2 = null;
  if (l.couple) { sus2 = { kind: 'suslik', name: 'r', x: sp.suslik2[0], y: sp.suslik2[1], cocoon: true, cracks: 0, wobble: 0 }; actors.push(sus2); }
  const mole = { kind: 'mole', x: sp.mole[0], y: sp.mole[1], rise: 0, target: 0 };
  const sor = { kind: 'soroka', x: sp.soroka[0], y: sp.soroka[1] };
  actors.push(mole, sor);
  setScene({ bg: l.scene, actors });
  const cocoons = sus2 ? [sus, sus2] : [sus];
  const wobble = () => { cocoons.forEach(c => c.wobble = 1); setTimeout(() => cocoons.forEach(c => c.wobble = 0), 900); };

  const intro = l.intro.map(x => Object.assign({}, x));
  intro.forEach(ln => {
    if (ln.who === 'mole') ln.on = () => { mole.target = 1; sfx.bad(); };
    else if (ln.who === l.who || ln.who === 'r') ln.on = wobble;
  });
  const panel = $('#panel');
  runDialogue(panel, intro, () => {
    mole.target = 0.5;
    runChoice(panel, l.choice, opt => {
      const res = opt.result.map(x => Object.assign({}, x));
      if (opt.bonus) res[res.length - 1].on = () => { view.flash = 0.5; burst(sor.x, sor.y, '#e5e1ba', 20); sfx.good(); };
      runDialogue(panel, res, () => { mole.target = 1; quiz(BASE_LAMPS + opt.bonus); });
    });
  });

  function quiz(lamps) {
    runQuiz({
      panel, questions: l.quiz, lamps, maxLamps: lamps, goal: RAYS_TO_WIN, label: 'Лучи',
      onCorrect: n => {
        cocoons.forEach(c => { c.cracks = n; burst(c.x, c.y - 24, '#e5e1ba', 18); });
        view.flash = 0.35; view.flashCol = '255,240,170';
        mole.target = 0.6;
      },
      onWrong: () => {
        view.shake = 6; view.flash = 0.35; view.flashCol = '30,10,40';
        mole.target = 1;
        cocoons.forEach(c => { c.wobble = 2; setTimeout(() => c.wobble = 0, 600); });
      },
      win: () => {
        sfx.win();
        cocoons.forEach(c => { c.cocoon = false; c.hop = true; burst(c.x, c.y - 24, '#fbf3df', 34); });
        setTimeout(() => cocoons.forEach(c => c.hop = false), 1600);
        mole.target = 0;
        view.flash = 0.8; view.flashCol = '255,250,210';
        if (sus2) { sus.x = sp.together[1]; sus.flip = true; sus2.x = sp.together[0]; }
        l.letters.forEach(i => { save.letters[i] = true; });
        save.done[l.id] = true;
        persist(); renderWordbar();
        const bar = $('#wordbar'); bar.classList.add('pulse'); setTimeout(() => bar.classList.remove('pulse'), 1300);
        runDialogue(panel, l.rescue, () => showCard(l));
      },
      fail: () => showFail(panel, () => go(() => startLevel(l))),
    });
  }
}

function showFail(panel, retry) {
  sfx.lose();
  view.shake = 8;
  panel.className = 'box';
  panel.innerHTML = `
    <div class="dlg villain">
      <div class="nameplate">Крот Кромешник</div>
      <div class="face"></div>
      <p class="txt">Ха-ха! Фонарики погасли — и я утащил пленника поглубже! Подучи историю и приходи снова, краевед!</p>
    </div>
    <div class="menu-list row">
      <button class="opt primary" id="f-retry"><span class="key">▶</span>Попробовать снова</button>
      <button class="opt" id="f-map"><span class="key">▶</span>На карту</button>
    </div>`;
  $('.face', panel).appendChild(portrait('mole'));
  $('#f-retry').addEventListener('click', () => { sfx.click(); retry(); });
  $('#f-map').addEventListener('click', () => { sfx.click(); go(showMap); });
  $('#f-retry').focus({ preventScroll: true });
}

function cardEl(l, open) {
  const el = document.createElement('article');
  el.className = 'card' + (open ? '' : ' locked');
  el.innerHTML = `
    <div class="card-art"></div>
    <div class="card-body">
      <div class="card-letter"></div>
      <h3></h3>
      <p class="addr"></p>
      <p class="card-text"></p>
    </div>`;
  const art = $('.card-art', el);
  if (l.couple) {
    const c = portrait('r', 64), x = c.getContext('2d'), k = ART.sprites.k;
    x.clearRect(0, 0, 64, 64);
    x.drawImage(ART.sprites.r, 2, 64 - ART.sprites.r.height);
    x.drawImage(k, 62 - k.width, 64 - k.height);
    art.appendChild(c);
  } else art.appendChild(portrait(l.who, 64));
  $('.card-letter', el).textContent = open ? l.letters.map(i => WORD[i]).join(' и ') : '?';
  $('h3', el).textContent = l.title;
  $('.addr', el).textContent = '📍 ' + l.address;
  $('.card-text', el).textContent = open ? l.card : 'Спаси суслика, чтобы открыть карточку.';
  return el;
}

function showCard(l) {
  const panel = $('#panel');
  const left = LEVELS.filter(x => !save.done[x.id]).length;
  panel.className = 'box card-box';
  panel.innerHTML = `
    <div class="nameplate">Новая карточка в альбоме</div>
    <div class="card-slot"></div>
    <p class="hint">${left ? `Осталось спасти: ${left} ${plural(left, 'локация', 'локации', 'локаций')}.` : 'Все суслики на свободе! Кромешник ждёт тебя на Стрелке.'}</p>
    <button class="btn primary next">На карту ▶</button>`;
  $('.card-slot', panel).appendChild(cardEl(l, true));
  const b = $('.next', panel);
  b.addEventListener('click', () => { sfx.click(); go(showMap); });
  keyHandler = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); } };
  b.focus({ preventScroll: true });
}

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function startFinale() {
  screen(windowHtml(), 'play');
  setPlace('Стрелка', 'Место основания Красноярска, 1628');
  const sp = FINALE.spots;
  const mole = { kind: 'mole', x: sp.mole[0], y: sp.mole[1], rise: 0, target: 0, scale: 2 };
  const shore = ['afonya', 'strazh', 'nazar', 'yar', 'r', 'k'].map((name, i) => ({ kind: 'suslik', name, x: 16 + i * 22, y: 160 + (i % 2) * 6 }));
  const cliff = ['kras', 'obrada', 'suri', 'raya'].map((name, i) => ({ kind: 'suslik', name, x: 196 + i * 34, y: 56 }));
  setScene({ bg: 'strelka', actors: [...cliff, mole, ...shore, { kind: 'soroka', x: sp.soroka[0], y: sp.soroka[1] }] });
  const intro = FINALE.intro.map(x => Object.assign({}, x));
  intro[1].on = () => { mole.target = 1; view.shake = 10; sfx.bad(); };
  intro[3].on = () => [...shore, ...cliff].forEach(a => { a.hop = true; setTimeout(() => a.hop = false, 1200); });
  const panel = $('#panel');
  runDialogue(panel, intro, () => {
    runQuiz({
      panel, questions: FINALE.quiz, lamps: 3, maxLamps: 3, goal: BOSS_HP, label: 'Удары светом',
      onCorrect: () => { view.flash = 0.6; view.flashCol = '255,240,170'; view.shake = 4; burst(mole.x, mole.y - 40, '#e5e1ba', 26); },
      onWrong: () => { view.shake = 8; view.flash = 0.4; view.flashCol = '30,10,40'; },
      win: () => {
        sfx.win();
        save.finale = true; persist();
        view.flash = 1; view.flashCol = '255,250,210';
        for (let i = 0; i < 8; i++) setTimeout(() => burst(30 + Math.random() * 260, 20 + Math.random() * 60, ['#e5e1ba', '#d7c169', '#c66447'][i % 3], 28), i * 220);
        [...shore, ...cliff].forEach(a => a.hop = true);
        const end = FINALE.ending.map(x => Object.assign({}, x));
        end[1].on = () => { mole.target = 0.7; [...shore, ...cliff].forEach(a => a.hop = false); };
        runDialogue(panel, end, () => go(showEnding));
      },
      fail: () => showFail(panel, () => go(startFinale)),
    });
  });
}

function showEnding() {
  screen(windowHtml(), 'ending');
  setPlace('Красноярск', 'Город спасён!');
  let x = 14;
  const crew = CREW.map(name => { const w = ART.sprites[name].width; const a = { kind: 'suslik', name, x: x + w / 2 - 4, y: 170, hop: true }; x += w - 6; return a; });
  setScene({ bg: 'title', actors: [...crew, { kind: 'soroka', x: 150, y: 50 }] });
  const panel = $('#panel');
  panel.className = 'box ending-box';
  panel.innerHTML = `
    <div class="nameplate">Город спасён!</div>
    <div class="big-word">${[...WORD].map(ch => `<span>${ch}</span>`).join('')}</div>
    <p>Все десять сусликов на свободе, а Красноярск снова помнит своё имя. Звание <b>«Почётный краевед Красноярска»</b> — твоё!</p>
    <p class="hint">Бронзовых сусликов можно найти в настоящем городе — адреса есть в «Альбоме краеведа».</p>
    <div class="menu-list row">
      <button class="opt primary" id="e-album"><span class="key">▶</span>Альбом краеведа</button>
      <button class="opt" id="e-map"><span class="key">▶</span>На карту</button>
    </div>`;
  $('#e-album').addEventListener('click', () => { sfx.click(); go(showAlbum); });
  $('#e-map').addEventListener('click', () => { sfx.click(); go(showMap); });
}

function showAlbum() {
  const n = LEVELS.filter(l => save.done[l.id]).length;
  screen(`
    <section class="book">
      <header class="book-head">
        <h2>Альбом краеведа</h2>
        <p>Открыто карточек: <b>${n}</b> из ${LEVELS.length}. На каждой — настоящий адрес, где в Красноярске стоит бронзовый суслик.</p>
      </header>
      <div class="cards"></div>
      <div class="menu-list row"><button class="opt primary" id="a-map"><span class="key">▶</span>На карту</button></div>
    </section>`, 'album');
  const cards = $('.cards');
  LEVELS.forEach(l => cards.appendChild(cardEl(l, !!save.done[l.id])));
  $('#a-map').addEventListener('click', () => { sfx.click(); go(showMap); });
}

function showAbout() {
  screen(`
    <section class="book about">
      <header class="book-head"><h2>Об игре</h2></header>
      <p>«Суслики Красного Яра» — образовательный квест-викторина о Красноярске.</p>
      <h3>Как играть</h3>
      <ul>
        <li>Выбери на карте локацию — порядок любой.</li>
        <li>Прочитай историю и сделай выбор: удачный шаг подарит лишний фонарик.</li>
        <li>Отвечай на вопросы о городе. Три верных ответа — три луча света, и кокон раскалывается.</li>
        <li>Ошибка гасит фонарик. Погасли все — пробуй снова (вопросы перемешаются).</li>
        <li>Собери слово КРАСНОЯРСК и победи Крота Кромешника на Стрелке.</li>
      </ul>
      <p>Управление: мышь или касание; на клавиатуре — цифры 1–4, Enter и стрелки на карте.</p>
      <h3>Десять сусликов</h3>
      <p>Крас, Рая, Афоня, Страж, Назар, Обрада, Яр, Р, Сури, К — первые буквы их имён складываются в слово КРАСНОЯРСК.</p>
      <div class="menu-list row"><button class="opt primary" id="ab-back"><span class="key">▶</span>Назад</button></div>
    </section>`, 'about');
  $('#ab-back').addEventListener('click', () => { sfx.click(); go(showTitle); });
}

// ---------- Старт ----------
renderWordbar();
updateSoundBtn();
loadArt().then(() => {
  requestAnimationFrame(frame);
  showTitle();
}).catch(err => {
  app.innerHTML = `<p class="error">Не удалось загрузить картинки игры (${err.message}). Запустите игру через веб-сервер, например <code>npx http-server .</code></p>`;
});
