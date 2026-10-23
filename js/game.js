// Движок игры: экраны, диалоги, викторина, сохранение, звук.
'use strict';

const $ = (s, el) => (el || document).querySelector(s);
const SAVE_KEY = 'suslik-quest-v1';
const BASE_LAMPS = 2;
const RAYS_TO_WIN = 3;
const BOSS_HP = 5;

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
  blip: () => tone(880, 0.03, 'square', 0, 0.015),
  click: () => tone(520, 0.06, 'square'),
  good: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', i * 0.07)),
  bad: () => [300, 220, 160].forEach((f, i) => tone(f, 0.16, 'sawtooth', i * 0.1, 0.04)),
  win: () => [523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'square', i * 0.11)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.22, 'triangle', i * 0.16, 0.06)),
};

// ---------- Рендер сцены ----------
const view = { ctx: null, scene: null, flash: 0, flashCol: '255,240,160', shake: 0, sparks: [] };

function mountCanvas(canvas) {
  canvas.width = W; canvas.height = H;
  view.ctx = canvas.getContext('2d');
  view.ctx.imageSmoothingEnabled = false;
}

function setScene(scene) { view.scene = scene; view.sparks = []; }

function burst(x, y, col, n) {
  for (let i = 0; i < (n || 14); i++) {
    const a = Math.random() * Math.PI * 2, s = 0.4 + Math.random() * 1.2;
    view.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.6, life: 40 + Math.random() * 20, col });
  }
}

function drawActors(c, sc, t) {
  for (const a of sc.actors) {
    if (a.hidden) continue;
    if (a.kind === 'suslik') {
      if (a.cocoon) {
        const wob = a.wobble ? Math.round(Math.sin(t / 60) * a.wobble) : 0;
        drawCocoon(c, a.acc, a.x + wob, a.y, a.cracks || 0, t);
      } else {
        const hop = Math.abs(Math.sin(t / 220 + a.x)) * 3;
        drawSuslik(c, a.acc, a.x, a.y - hop);
      }
    } else if (a.kind === 'mole') {
      a.rise += ((a.target || 0) - a.rise) * 0.08;
      const s = (a.scale || 1);
      const hw = 9 * s;
      R(c, a.x + 8 * s - hw, a.y + 14 * s, hw * 2, 3 * s, '#140c08');
      R(c, a.x + 8 * s - hw + 1, a.y + 13 * s, hw * 2 - 2, 1, '#2a1a10');
      const visible = Math.round(16 * a.rise);
      if (visible > 0) {
        const bob = Math.round(Math.sin(t / 300) * 1);
        const img = spriteCanvas('mole');
        c.drawImage(img, 0, 0, 16, visible, Math.round(a.x), Math.round(a.y + (16 - visible) * s + bob - 1), 16 * s, visible * s);
      }
    } else if (a.kind === 'soroka') {
      const bob = Math.round(Math.sin(t / 250) * 2);
      drawSprite(c, 'soroka', a.x, a.y + bob, { flip: a.flip });
    }
  }
}

function frame(t) {
  const c = view.ctx, sc = view.scene;
  if (c && sc && c.canvas.isConnected) {
    c.save();
    if (view.shake > 0) { c.translate(Math.round((Math.random() - 0.5) * view.shake), 0); view.shake *= 0.85; if (view.shake < 0.5) view.shake = 0; }
    if (sc.map) paintMap(c, t); else SCENES[sc.bg](c, t);
    if (sc.actors) drawActors(c, sc, t);
    c.restore();
    for (const p of view.sparks) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.life--;
      if (p.life > 0) P(c, p.x, p.y, p.col);
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
requestAnimationFrame(frame);

// ---------- Общие элементы интерфейса ----------
const app = $('#app');

function renderWordbar() {
  const bar = $('#wordbar');
  bar.innerHTML = '';
  [...WORD].forEach((ch, i) => {
    const s = document.createElement('span');
    s.className = 'tile' + (save.letters[i] ? ' lit' : '');
    s.textContent = save.letters[i] ? ch : '?';
    s.title = save.letters[i] ? `Буква «${ch}» спасена` : 'Буква ещё в плену';
    bar.appendChild(s);
  });
}

function updateSoundBtn() {
  const b = $('#btn-sound');
  b.textContent = save.sound ? '♪ Звук' : '♪ Тихо';
  b.setAttribute('aria-pressed', String(save.sound));
}

$('#btn-sound').addEventListener('click', () => { save.sound = !save.sound; persist(); updateSoundBtn(); sfx.click(); });
$('#btn-map').addEventListener('click', () => { sfx.click(); showMap(); });
$('#btn-album').addEventListener('click', () => { sfx.click(); showAlbum(); });
$('#logo').addEventListener('click', () => { sfx.click(); showTitle(); });

function screen(html, cls) {
  keyHandler = null;
  app.className = 'screen ' + (cls || '');
  app.innerHTML = html;
  app.scrollTop = 0;
  window.scrollTo(0, 0);
  const cv = $('canvas.scene', app);
  if (cv) mountCanvas(cv); else view.ctx = null;
}

function portraitCanvas(who) {
  const sp = SPEAKERS[who] || {};
  const c = document.createElement('canvas');
  c.width = 16; c.height = 16; c.className = 'portrait';
  const x = c.getContext('2d');
  if (sp.sprite) drawSprite(x, sp.sprite, 0, 0);
  else if (sp.acc) drawSuslik(x, sp.acc, 0, 0);
  else if (who === 'all') { drawSuslik(x, 'sailor', -3, 2); drawSuslik(x, 'bride', 4, 0); }
  else return null;
  return c;
}

// ---------- Клавиатура ----------
let keyHandler = null;
document.addEventListener('keydown', e => { if (keyHandler) keyHandler(e); });

// ---------- Диалоги ----------
function runDialogue(panel, lines, done) {
  let i = 0, timer = null, full = '', shown = 0;
  panel.innerHTML = `
    <div class="dlg" role="group" aria-live="polite">
      <div class="dlg-face"></div>
      <div class="dlg-body"><div class="who"></div><p class="txt"></p></div>
    </div>
    <button class="btn next">Далее ▶</button>`;
  const face = $('.dlg-face', panel), who = $('.who', panel), txt = $('.txt', panel), btn = $('.next', panel);

  function show() {
    const ln = lines[i];
    const sp = SPEAKERS[ln.who] || { name: '' };
    face.innerHTML = '';
    const pc = portraitCanvas(ln.who);
    if (pc) face.appendChild(pc);
    face.hidden = !pc;
    who.textContent = sp.name;
    who.hidden = !sp.name;
    panel.querySelector('.dlg').className = 'dlg ' + (ln.who === 'narrator' ? 'narr' : '') + (ln.who === 'mole' ? ' villain' : '');
    full = ln.text; shown = 0; txt.textContent = '';
    if (ln.on) ln.on();
    clearInterval(timer);
    timer = setInterval(() => {
      shown = Math.min(full.length, shown + 2);
      txt.textContent = full.slice(0, shown);
      if (shown % 6 === 0) sfx.blip();
      if (shown >= full.length) clearInterval(timer);
    }, 22);
    btn.textContent = i === lines.length - 1 ? 'Продолжить ▶' : 'Далее ▶';
  }
  function next() {
    if (shown < full.length) { clearInterval(timer); shown = full.length; txt.textContent = full; return; }
    sfx.click();
    i++;
    if (i >= lines.length) { clearInterval(timer); keyHandler = null; done(); return; }
    show();
  }
  btn.addEventListener('click', next);
  $('.dlg', panel).addEventListener('click', next);
  keyHandler = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } };
  show();
  btn.focus({ preventScroll: true });
}

function runChoice(panel, choice, done) {
  panel.innerHTML = `
    <div class="dlg narr"><div class="dlg-body"><p class="txt"></p></div></div>
    <div class="choices"></div>`;
  $('.txt', panel).textContent = choice.prompt;
  const box = $('.choices', panel);
  choice.options.forEach((opt, n) => {
    const b = document.createElement('button');
    b.className = 'btn choice';
    b.textContent = `${n + 1}. ${opt.text}`;
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

// Викторина. opts: { panel, questions, lamps, goal, label, onCorrect(n), onWrong(left), win(), fail() }
function runQuiz(o) {
  const qs = shuffle(o.questions);
  let qi = 0, correct = 0, lamps = o.lamps;

  function hud() {
    const rays = '<span class="ray on">✦</span>'.repeat(correct) + '<span class="ray">✦</span>'.repeat(Math.max(0, o.goal - correct));
    const lp = '<span class="lamp on"></span>'.repeat(lamps) + '<span class="lamp"></span>'.repeat(Math.max(0, o.maxLamps - lamps));
    return `<div class="qhud"><span>${o.label}: ${rays}</span><span>Фонарики: ${lp}</span></div>`;
  }

  function ask() {
    if (qi >= qs.length) { o.fail(); return; }
    const q = qs[qi];
    const answers = shuffle(q.a.map((text, idx) => ({ text, ok: idx === 0 })));
    o.panel.innerHTML = `${hud()}
      <div class="question"><div class="qnum">Вопрос ${qi + 1}</div><p class="qtext"></p></div>
      <div class="answers"></div>
      <div class="fact" hidden></div>
      <button class="btn next" hidden>Дальше ▶</button>`;
    $('.qtext', o.panel).textContent = q.q;
    const box = $('.answers', o.panel), fact = $('.fact', o.panel), nextBtn = $('.next', o.panel);
    let answered = false;
    answers.forEach((ans, n) => {
      const b = document.createElement('button');
      b.className = 'btn answer';
      b.innerHTML = `<span class="key">${n + 1}</span> `;
      b.appendChild(document.createTextNode(ans.text));
      b.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        [...box.children].forEach((el, k) => { el.disabled = true; if (answers[k].ok) el.classList.add('right'); });
        if (ans.ok) { correct++; sfx.good(); o.onCorrect(correct); fact.className = 'fact good'; fact.innerHTML = '<b>Верно!</b> '; }
        else { lamps--; b.classList.add('wrong'); sfx.bad(); o.onWrong(lamps); fact.className = 'fact bad'; fact.innerHTML = '<b>Мимо!</b> Кромешник хихикает и гасит фонарик. '; }
        fact.appendChild(document.createTextNode(q.fact));
        fact.hidden = false;
        $('.qhud', o.panel).outerHTML = hud();
        nextBtn.hidden = false;
        if (correct >= o.goal) nextBtn.textContent = 'Свет пробился! ▶';
        else if (lamps <= 0) nextBtn.textContent = 'Ой... ▶';
        nextBtn.focus({ preventScroll: true });
        fact.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      box.appendChild(b);
    });
    nextBtn.addEventListener('click', () => {
      sfx.click();
      qi++;
      if (correct >= o.goal) o.win();
      else if (lamps <= 0) o.fail();
      else ask();
    });
    keyHandler = e => {
      const k = parseInt(e.key, 10);
      if (!answered && k >= 1 && k <= answers.length) box.children[k - 1].click();
      else if (answered && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); nextBtn.click(); }
    };
  }
  ask();
}

// ---------- Экраны ----------
function stageHtml(placeTitle, sub) {
  return `
    <div class="stage">
      <div class="stage-wrap">
        <canvas class="scene" aria-hidden="true"></canvas>
        <div class="place-tag"><b></b><span></span></div>
      </div>
      <div class="panel" id="panel"></div>
    </div>`;
}

function setPlace(title, sub) {
  $('.place-tag b').textContent = title;
  $('.place-tag span').textContent = sub || '';
}

function showTitle() {
  screen(`
    <div class="title-screen">
      <div class="stage-wrap"><canvas class="scene" aria-hidden="true"></canvas></div>
      <div class="title-box">
        <h1>Суслики<br><span>Красного Яра</span></h1>
        <p class="tagline">Текстовый квест-викторина о Красноярске. Спаси десять бронзовых сусликов от Крота Кромешника — и верни городу имя!</p>
        <div class="menu">
          ${hasProgress() ? '<button class="btn primary" id="t-cont">Продолжить</button>' : ''}
          <button class="btn ${hasProgress() ? '' : 'primary'}" id="t-new">${hasProgress() ? 'Начать заново' : 'Начать игру'}</button>
          <button class="btn" id="t-album">Альбом краеведа</button>
          <button class="btn" id="t-about">Об игре</button>
        </div>
      </div>
    </div>`, 'title');
  setScene({ bg: 'title', actors: [
    { kind: 'suslik', acc: 'sailor', x: 60, y: 56 }, { kind: 'suslik', acc: 'bride', x: 78, y: 56 }, { kind: 'suslik', acc: 'commander', x: 94, y: 56 },
    { kind: 'soroka', x: 18, y: 10 },
  ] });
  const cont = $('#t-cont');
  if (cont) cont.addEventListener('click', () => { sfx.click(); showMap(); });
  $('#t-new').addEventListener('click', () => {
    if (hasProgress() && !confirm('Начать заново? Весь прогресс будет сброшен.')) return;
    const snd = save.sound; save = freshSave(); save.sound = snd; persist(); renderWordbar();
    sfx.click(); showPrologue();
  });
  $('#t-album').addEventListener('click', () => { sfx.click(); showAlbum(); });
  $('#t-about').addEventListener('click', () => { sfx.click(); showAbout(); });
  (cont || $('#t-new')).focus({ preventScroll: true });
}

function showPrologue() {
  screen(stageHtml(), 'play');
  setPlace('Красноярск', 'Ночь, когда пропали суслики');
  const mole = { kind: 'mole', x: 72, y: 52, rise: 0, target: 0 };
  setScene({ bg: 'prologue', actors: [mole, { kind: 'soroka', x: 20, y: 12, hidden: true }] });
  const lines = PROLOGUE.map(l => Object.assign({}, l));
  lines[2].on = () => { mole.target = 1; view.shake = 4; sfx.bad(); };
  lines[4].on = () => { mole.target = 0; };
  lines[5].on = () => { view.scene.actors[1].hidden = false; };
  runDialogue($('#panel'), lines, showMap);
}

function showMap() {
  const allDone = LEVELS.every(l => save.done[l.id]);
  screen(`
    <div class="map-screen">
      <h2>Карта Красноярска</h2>
      <p class="hint">${allDone ? (save.finale ? 'Город спасён! Можно перепройти любую локацию.' : 'Все суслики свободны! Скорее на Стрелку — Кромешник ждёт.') : 'Выбери, кого спасать. Порядок любой — главное, собрать все буквы!'}</p>
      <div class="map-wrap">
        <canvas class="scene" aria-hidden="true"></canvas>
        <div class="pins"></div>
      </div>
      <p class="map-note">Схема не в масштабе · Синяя лента — Енисей</p>
      <ol class="loc-list"></ol>
    </div>`, 'map');
  setScene({ map: true });
  const pins = $('.pins'), list = $('.loc-list');
  const entries = LEVELS.map((l, i) => ({ l, n: i + 1 }));
  for (const { l, n } of entries) {
    const done = !!save.done[l.id];
    const pin = document.createElement('button');
    pin.className = 'pin' + (done ? ' done' : '');
    pin.style.left = (l.map[0] / W * 100) + '%';
    pin.style.top = (l.map[1] / H * 100) + '%';
    pin.textContent = l.letters.map(i => WORD[i]).join('');
    pin.title = `${l.title} — ${l.place}`;
    pin.setAttribute('aria-label', `${l.title}, ${l.place}${done ? ', спасён' : ''}`);
    pin.addEventListener('click', () => { sfx.click(); startLevel(l); });
    pins.appendChild(pin);

    const li = document.createElement('li');
    const b = document.createElement('button');
    b.className = 'loc' + (done ? ' done' : '');
    b.innerHTML = `<span class="lt"></span><span class="ln"><b></b><small></small></span><span class="st"></span>`;
    $('.lt', b).textContent = l.letters.map(i => WORD[i]).join('·');
    $('b', b).textContent = l.title;
    $('small', b).textContent = l.place;
    $('.st', b).textContent = done ? '✔' : '▶';
    b.addEventListener('click', () => { sfx.click(); startLevel(l); });
    li.appendChild(b);
    list.appendChild(li);
  }
  if (allDone) {
    const pin = document.createElement('button');
    pin.className = 'pin boss';
    pin.style.left = (60 / W * 100) + '%'; pin.style.top = (40 / H * 100) + '%';
    pin.textContent = '!';
    pin.setAttribute('aria-label', 'Финал: Стрелка');
    pin.addEventListener('click', () => { sfx.click(); startFinale(); });
    pins.appendChild(pin);
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.className = 'loc boss';
    b.innerHTML = '<span class="lt">!</span><span class="ln"><b>Финал: битва на Стрелке</b><small>Место основания города</small></span><span class="st">▶</span>';
    b.addEventListener('click', () => { sfx.click(); startFinale(); });
    li.appendChild(b);
    list.prepend(li);
  }
}

function startLevel(l) {
  screen(stageHtml(), 'play');
  setPlace(l.place, l.title);
  const sp = l.spots;
  const actors = [];
  const sus = { kind: 'suslik', acc: SPEAKERS[l.who].acc, x: sp.suslik[0], y: sp.suslik[1], cocoon: true, cracks: 0, wobble: 0 };
  actors.push(sus);
  let sus2 = null;
  if (l.couple) { sus2 = { kind: 'suslik', acc: 'commander', x: sp.suslik2[0], y: sp.suslik2[1], cocoon: true, cracks: 0, wobble: 0 }; actors.push(sus2); }
  const mole = { kind: 'mole', x: sp.mole[0], y: sp.mole[1], rise: 0, target: 0 };
  const sor = { kind: 'soroka', x: sp.soroka[0], y: sp.soroka[1] };
  actors.push(mole, sor);
  setScene({ bg: l.scene, actors });
  const cocoons = sus2 ? [sus, sus2] : [sus];

  const intro = l.intro.map(x => Object.assign({}, x));
  intro.forEach(ln => {
    if (ln.who === 'mole') ln.on = () => { mole.target = 1; sfx.bad(); };
    else if (ln.who === l.who || ln.who === 'r') ln.on = () => { cocoons.forEach(c => c.wobble = 1); setTimeout(() => cocoons.forEach(c => c.wobble = 0), 900); };
  });
  const panel = $('#panel');
  runDialogue(panel, intro, () => {
    mole.target = 0.5;
    runChoice(panel, l.choice, opt => {
      const res = opt.result.map(x => Object.assign({}, x));
      if (opt.bonus) res[res.length - 1].on = () => { view.flash = 0.5; burst(sor.x + 8, sor.y + 8, '#ffe680'); sfx.good(); };
      runDialogue(panel, res, () => {
        mole.target = 1;
        quiz(BASE_LAMPS + opt.bonus);
      });
    });
  });

  function quiz(lamps) {
    runQuiz({
      panel, questions: l.quiz, lamps, maxLamps: lamps, goal: RAYS_TO_WIN, label: 'Лучи',
      onCorrect: n => {
        cocoons.forEach(c => { c.cracks = n; burst(c.x + 8, c.y + 8, '#ffe680'); });
        view.flash = 0.35; view.flashCol = '255,240,160';
        mole.target = 0.6;
      },
      onWrong: () => {
        view.shake = 5; view.flash = 0.3; view.flashCol = '40,0,40';
        mole.target = 1;
        cocoons.forEach(c => { c.wobble = 2; setTimeout(() => c.wobble = 0, 600); });
      },
      win: () => {
        sfx.win();
        cocoons.forEach(c => { c.cocoon = false; burst(c.x + 8, c.y + 6, '#fff3a8', 30); });
        mole.target = 0;
        view.flash = 0.8; view.flashCol = '255,250,210';
        if (sus2) { sus.x = 80; sus2.x = 96; }
        l.letters.forEach(i => { save.letters[i] = true; });
        save.done[l.id] = true;
        persist(); renderWordbar();
        $('#wordbar').classList.add('pulse');
        setTimeout(() => $('#wordbar') && $('#wordbar').classList.remove('pulse'), 1200);
        runDialogue(panel, l.rescue, () => showCard(l));
      },
      fail: () => showFail(panel, () => startLevel(l)),
    });
  }
}

function showFail(panel, retry) {
  sfx.lose();
  view.shake = 8;
  panel.innerHTML = `
    <div class="dlg narr villain"><div class="dlg-body">
      <div class="who">Крот Кромешник</div>
      <p class="txt">Ха-ха! Фонарики погасли — и я утащил пленника поглубже! Подучи историю и приходи снова, краевед!</p>
    </div></div>
    <div class="choices">
      <button class="btn primary" id="f-retry">Попробовать снова</button>
      <button class="btn" id="f-map">На карту</button>
    </div>`;
  $('#f-retry').addEventListener('click', () => { sfx.click(); retry(); });
  $('#f-map').addEventListener('click', () => { sfx.click(); showMap(); });
  $('#f-retry').focus({ preventScroll: true });
}

function cardHtml(l, open) {
  const letters = l.letters.map(i => WORD[i]).join(' и ');
  return `
    <article class="card ${open ? '' : 'locked'}">
      <div class="card-letter">${open ? letters : '?'}</div>
      <div class="card-body">
        <h3>${esc(l.title)}</h3>
        <p class="addr">📍 ${esc(l.address)}</p>
        <p>${open ? esc(l.card) : 'Спаси суслика, чтобы открыть карточку.'}</p>
      </div>
    </article>`;
}
function esc(s) { return String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch])); }

function showCard(l) {
  const panel = $('#panel');
  const left = LEVELS.filter(x => !save.done[x.id]).length;
  panel.innerHTML = `
    <p class="got">Новая карточка в «Альбоме краеведа»!</p>
    ${cardHtml(l, true)}
    <p class="hint">${left ? `Осталось спасти: ${left} ${plural(left, 'локация', 'локации', 'локаций')}.` : 'Все суслики на свободе! Кромешник ждёт тебя на Стрелке.'}</p>
    <button class="btn primary next">На карту ▶</button>`;
  const b = $('.next', panel);
  b.addEventListener('click', () => { sfx.click(); showMap(); });
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
  screen(stageHtml(), 'play');
  setPlace('Стрелка', 'Место основания Красноярска, 1628');
  const sp = FINALE.spots;
  const mole = { kind: 'mole', x: sp.mole[0], y: sp.mole[1] - 16, rise: 0, target: 0, scale: 2 };
  const crew = ['sailor', 'flower', 'books', 'telescope', 'helmet', 'papakha', 'wrestler', 'beret', 'bride', 'commander']
    .map((acc, i) => ({ kind: 'suslik', acc, x: 2 + (i % 5) * 15, y: 58 + Math.floor(i / 5) * 14 }));
  setScene({ bg: 'strelka', actors: [...crew, mole, { kind: 'soroka', x: sp.soroka[0], y: sp.soroka[1] }] });
  const intro = FINALE.intro.map(x => Object.assign({}, x));
  intro[1].on = () => { mole.target = 1; view.shake = 10; sfx.bad(); };
  const panel = $('#panel');
  runDialogue(panel, intro, () => {
    runQuiz({
      panel, questions: FINALE.quiz, lamps: 3, maxLamps: 3, goal: BOSS_HP, label: 'Удары светом',
      onCorrect: () => { view.flash = 0.6; view.flashCol = '255,240,160'; view.shake = 4; burst(mole.x + 16, mole.y + 16, '#ffe680', 24); },
      onWrong: () => { view.shake = 8; view.flash = 0.4; view.flashCol = '40,0,40'; },
      win: () => {
        sfx.win();
        save.finale = true; persist();
        view.flash = 1; view.flashCol = '255,250,210';
        for (let i = 0; i < 6; i++) setTimeout(() => burst(20 + Math.random() * 120, 10 + Math.random() * 40, ['#ffe680', '#ff7fbf', '#9fd8ff'][i % 3], 26), i * 250);
        const end = FINALE.ending.map(x => Object.assign({}, x));
        end[1].on = () => { mole.target = 0.7; };
        runDialogue(panel, end, showEnding);
      },
      fail: () => showFail(panel, startFinale),
    });
  });
}

function showEnding() {
  screen(`
    <div class="ending">
      <div class="stage-wrap"><canvas class="scene" aria-hidden="true"></canvas></div>
      <h2>Город спасён!</h2>
      <div class="big-word">${[...WORD].map(ch => `<span>${ch}</span>`).join('')}</div>
      <p>Все десять сусликов на свободе, а Красноярск снова помнит своё имя. Звание <b>«Почётный краевед Красноярска»</b> — твоё!</p>
      <p class="hint">Бронзовых сусликов можно найти в настоящем городе — адреса есть в «Альбоме краеведа».</p>
      <div class="menu">
        <button class="btn primary" id="e-album">Альбом краеведа</button>
        <button class="btn" id="e-map">На карту</button>
      </div>
    </div>`, 'ending-screen');
  setScene({ bg: 'title', actors: ['sailor', 'flower', 'books', 'telescope', 'helmet', 'papakha', 'wrestler', 'beret', 'bride', 'commander']
    .map((acc, i) => ({ kind: 'suslik', acc, x: 3 + i * 15.5, y: 54 })) });
  $('#e-album').addEventListener('click', () => { sfx.click(); showAlbum(); });
  $('#e-map').addEventListener('click', () => { sfx.click(); showMap(); });
}

function showAlbum() {
  const n = LEVELS.filter(l => save.done[l.id]).length;
  screen(`
    <div class="album">
      <h2>Альбом краеведа</h2>
      <p class="hint">Открыто карточек: ${n} из ${LEVELS.length}. Каждая карточка — настоящий адрес, где в Красноярске стоит бронзовый суслик.</p>
      <div class="cards">${LEVELS.map(l => cardHtml(l, !!save.done[l.id])).join('')}</div>
      <div class="menu"><button class="btn primary" id="a-map">На карту</button></div>
    </div>`, 'album-screen');
  $('#a-map').addEventListener('click', () => { sfx.click(); showMap(); });
}

function showAbout() {
  screen(`
    <div class="about">
      <h2>Об игре</h2>
      <p>«Суслики Красного Яра» — образовательный текстовый квест-викторина о Красноярске.</p>
      <h3>Как играть</h3>
      <ul>
        <li>Выбери на карте локацию — порядок любой.</li>
        <li>Прочитай историю и сделай выбор: верный шаг подарит лишний фонарик.</li>
        <li>Отвечай на вопросы о городе. Три верных ответа — три луча света, кокон раскалывается.</li>
        <li>Ошибка гасит фонарик. Погасли все — пробуй снова (вопросы перемешаются).</li>
        <li>Собери все буквы слова КРАСНОЯРСК и победи Крота Кромешника на Стрелке.</li>
      </ul>
      <p>Управление: мышь или касание; на клавиатуре — цифры 1–4 и Enter.</p>
      <h3>Десять сусликов</h3>
      <p>Крас, Рая, Афоня, Страж, Назар, Обрада, Яр, Р, Сури, К — первые буквы их имён складываются в слово КРАСНОЯРСК.</p>
      <div class="menu"><button class="btn primary" id="ab-back">Назад</button></div>
    </div>`, 'about-screen');
  $('#ab-back').addEventListener('click', () => { sfx.click(); showTitle(); });
}

// ---------- Старт ----------
renderWordbar();
updateSoundBtn();
showTitle();
