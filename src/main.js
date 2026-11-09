import '@fontsource/press-start-2p/400.css';

// ---------------------------------------------------------------------------
// Areas of the map, laid out exactly like Charlotte's screenshot (charlottes-wishlist/images/Screenshot ...png).
// Coordinates are in map pixels (1722 x 707). Keep the corridors the cursor has to walk through wider than the cursor (PLAYER).
//
//   video:    plays public/videos/<n>.mp4 on Enter
//   message:  text shown in a dialog (after the video, if there is one)
//   removes:  the box disappears after the video/message
//   timer:    red bar that drains over N seconds, then the box disappears
//   pushable: the cursor can push this box around
//   canExit:  can be pushed out of the screen (and then disappears)
//   action:   special behaviour (see activate())
//   noFrame:  no outline/background, only the picture (public/assets/<n>.png)
//   Every box shows the picture public/assets/<n>.png
// ---------------------------------------------------------------------------
const AREAS = [
  { n: 1, label: 'Breakdown', x: 19, y: 57, w: 220, h: 176, video: true,
    message: 'Try all options but asking people can help', removes: true },
  { n: 2, label: 'ASK FOR HELP', x: 20, y: 246, w: 220, h: 177, pushable: true, helpTarget: 8 },
  { n: 3, label: 'Make a key', x: 22, y: 446, w: 220, h: 231,
    message: "YOU CAN'T MAKE A KEY OUTSIDE AND ALONE THAT'S SILLY.", removes: true },
  { n: 4, label: 'sitting and waiting', x: 270, y: 60, w: 225, h: 616, timer: 20, assetPos: '50% 75%' },
  { n: 5, label: '', x: 522, y: 55, w: 181, h: 176, action: 'countdown' },
  { n: 6, label: 'ANGER', x: 523, y: 244, w: 180, h: 177 }, // only the hammer removes it
  { n: 7, label: 'DOOR', x: 758, y: 60, w: 240, h: 340, noFrame: true, action: 'door' },
  { n: 8, label: 'OPEN WINDOW', x: 525, y: 470, w: 874, h: 205,
    message: "WINDOW TOO SMALL TO ENTER, SOMEONE YELLED AT YOU." },
  { n: 9, label: 'MAP', x: 1049, y: 42, w: 336, h: 381, video: true,
    message: "WHERE ARE YOU GOING YOU DON'T KNOW WHERE YOU'RE GOING", removes: true },
  { n: 10, label: 'TRY AGAIN', x: 1448, y: 39, w: 220, h: 239,
    action: 'reset', pushable: true, canExit: true },
  { n: 11, label: 'HAMMER', x: 1447, y: 304, w: 224, h: 368, action: 'hammer' },
];

// The map has the exact proportions of Charlotte's screenshot (1722 x 707).
const STAGE_W = 1722;
const STAGE_H = 716; // top box starts 39px below the top edge, the lowest box ends 39px above the bottom edge
const DOOR_N = 7;
const HAMMER_TARGET = 6; // the hammer only breaks this box, on any other box it restarts the game
const START = { x: 878, y: 435 }; // just below the door: the cursor comes out of the door
const SPEED = 70; // px per second while a key is held
const NUDGE = 3; // px moved immediately by a single key press
const PLAYER = 18; // size of the red cursor (the narrowest corridor it must fit through is ~19px)
const R = PLAYER / 2;
const REACH = 26; // how close to a rectangle's edge you must be to use it
const COUNTDOWN = 30; // seconds, started by the heart (box 5)

const stage = document.getElementById('stage');
const overlay = document.getElementById('overlay');
const video = document.getElementById('video');
const missing = document.getElementById('missing');
const doneBox = document.getElementById('done');
const dialogEl = document.getElementById('dialog');
const dialogText = document.getElementById('dialog-text');
const countdownEl = document.getElementById('countdown');

// ---------- Dev check: rectangles must not overlap ----------
if (import.meta.env.DEV) {
  for (let i = 0; i < AREAS.length; i++) {
    for (let j = i + 1; j < AREAS.length; j++) {
      const a = AREAS[i], b = AREAS[j];
      const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
      const gapY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
      if (Math.max(gapX, gapY) < 10) {
        console.error(`Areas ${a.n} and ${b.n} overlap or are too close (gap ${Math.max(gapX, gapY)}px)`);
      }
    }
    const a = AREAS[i];
    if (a.x < 0 || a.y < 0 || a.x + a.w > STAGE_W || a.y + a.h > STAGE_H) console.error(`Area ${a.n} is outside the map`);
  }
}

// ---------- Build the map ----------
const state = new Map(); // n -> { def, el, x, y, w, h, done, busy, timeout }
for (const def of AREAS) {
  const el = document.createElement('div');
  el.className = 'area' + (def.noFrame ? ' noframe' : '');
  Object.assign(el.style, { width: def.w + 'px', height: def.h + 'px' });
  el.innerHTML =
    (def.timer ? `<div class="fill" style="animation-duration:${def.timer}s"></div>` : '') +
    `<img class="asset" src="${import.meta.env.BASE_URL}assets/${def.n}.png" alt="" draggable="false"` +
    (def.assetPos ? ` style="object-position:${def.assetPos}"` : '') + '>' +
    (def.label ? `<span class="label">${def.label}</span>` : '') +
    `<span class="num">${def.n}</span>`;
  stage.appendChild(el);
  const s = { def, el, x: def.x, y: def.y, w: def.w, h: def.h, done: false, busy: false, timeout: null };
  state.set(def.n, s);
  setPos(s);
}

function setPos(s) {
  s.el.style.left = Math.round(s.x / 2) * 2 + 'px';
  s.el.style.top = Math.round(s.y / 2) * 2 + 'px';
}

const playerEl = document.createElement('div');
playerEl.id = 'player';
stage.appendChild(playerEl);

const hammerEl = document.createElement('div');
hammerEl.id = 'hammer';
hammerEl.hidden = true;
stage.appendChild(hammerEl);

// ---------- Scaling ----------
function fit() {
  const wrap = document.getElementById('stage-wrap');
  const s = Math.min(wrap.clientWidth / (STAGE_W + 8), wrap.clientHeight / (STAGE_H + 8));
  stage.style.transform = `scale(${s})`;
}
window.addEventListener('resize', fit);
fit();

// ---------- Game state ----------
const player = { x: START.x, y: START.y };
const keys = new Set();
let playing = null; // area whose video is playing
let playDone = null; // callback after the video finished
let dialogOpen = false;
let dialogCb = null;
let current = null; // area next to the cursor
let hasHammer = false;
let helpDone = false; // "ask for help" box was pushed into the window and the animation finished
let countdown = null; // seconds left, or null
let exiting = null; // cursor walking into the door
let ended = false;

const MOVE = {
  w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0],
  arrowup: [0, -1], arrowleft: [-1, 0], arrowdown: [0, 1], arrowright: [1, 0],
};

const locked = () => !!playing || dialogOpen || !!exiting || ended;

// ---------- Movement (the cursor cannot enter rectangles, but it can push some) ----------
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function hits(s, px, py) {
  if (s.done) return false;
  return px > s.x - R && px < s.x + s.w + R && py > s.y - R && py < s.y + s.h + R;
}

function tryPush(s, axis, np) {
  const cand = { x: axis === 'x' ? np : s.x, y: axis === 'y' ? np : s.y, w: s.w, h: s.h };
  const target = s.def.helpTarget ? state.get(s.def.helpTarget) : null;
  if (target && !target.done && overlaps(cand, target)) {
    // the box touches the window: park it flush against it and start the "ask for help" animation
    if (axis === 'x') s.x = np > s.x ? target.x - s.w : target.x + target.w;
    else s.y = np > s.y ? target.y - s.h : target.y + target.h;
    setPos(s);
    setTimeout(() => startHelp(s), 0);
    return false;
  }
  for (const t of state.values()) {
    if (t !== s && !t.done && overlaps(cand, t)) return false;
  }
  if (!s.def.canExit && (cand.x < 0 || cand.y < 0 || cand.x + s.w > STAGE_W || cand.y + s.h > STAGE_H)) return false;
  s.x = cand.x; s.y = cand.y;
  setPos(s);
  if (s.def.canExit) {
    const visW = Math.min(s.x + s.w, STAGE_W) - Math.max(s.x, 0);
    const visH = Math.min(s.y + s.h, STAGE_H) - Math.max(s.y, 0);
    if (visW < 12 || visH < 12) finishArea(s); // pushed out of the screen
  }
  return true;
}

function moveAxis(axis, d) {
  const size = axis === 'x' ? STAGE_W : STAGE_H;
  player[axis] = Math.max(R, Math.min(size - R, player[axis] + d));
  for (const s of state.values()) {
    if (!hits(s, player.x, player.y)) continue;
    const pos = s[axis], len = axis === 'x' ? s.w : s.h;
    if (s.def.pushable) {
      const pen = d > 0 ? player[axis] + R - pos : pos + len - (player[axis] - R);
      if (tryPush(s, axis, pos + Math.sign(d) * pen)) continue;
      if (s.done) continue;
    }
    player[axis] = d > 0 ? s[axis] - R : s[axis] + len + R;
  }
}

function moveBy(dx, dy) {
  const ox = player.x, oy = player.y;
  if (dx) moveAxis('x', dx);
  if (dy) moveAxis('y', dy);
  if (player.x !== ox || player.y !== oy) {
    // moving the cursor while a timer bar is running starts the whole game over (same as pressing R)
    for (const s of state.values()) if (s.busy) { resetMap(); break; }
  }
}

// ---------- Input ----------
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (dialogOpen) {
    if (k === 'enter' && !e.repeat) { e.preventDefault(); closeDialog(); }
    return;
  }
  if (playing) {
    if (k === 'escape') closeVideo(false);
    else if (k === 'enter' && !e.repeat && !missing.hidden && import.meta.env.DEV) closeVideo(true); // dev: skip a missing video
    return;
  }
  if (exiting) return;
  if (ended) {
    if (k === 'r' && !e.repeat) resetMap();
    return;
  }
  if (k in MOVE) {
    e.preventDefault();
    if (!keys.has(k) && !e.repeat) moveBy(MOVE[k][0] * NUDGE, MOVE[k][1] * NUDGE); // small single step
    keys.add(k);
  } else if (k === 'enter' && !e.repeat && current) {
    e.preventDefault();
    if (hasHammer) hit(current);
    else activate(current);
  } else if (k === 'r' && !e.repeat && !e.ctrlKey && !e.metaKey) {
    resetMap();
  } else if (k === 'n' && !e.repeat && !e.ctrlKey && !e.metaKey) {
    stage.classList.toggle('show-numbers'); // shows which video number belongs to which box
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

// ---------- Game logic ----------
function shake(s) {
  s.el.classList.remove('shake');
  void s.el.offsetWidth;
  s.el.classList.add('shake');
}

function updateReady() {
  const ready = helpDone && [...state.values()].every((s) => s.def.n === DOOR_N || s.done);
  state.get(DOOR_N).el.classList.toggle('ready', ready);
  return ready;
}

function finishArea(s) {
  clearTimeout(s.timeout);
  s.busy = false;
  s.done = true;
  s.el.classList.remove('active', 'running');
  s.el.classList.add('gone');
  if (current === s) current = null;
  updateReady();
}

function activate(s) {
  const d = s.def;
  const after = () => { if (d.removes) finishArea(s); };
  if (d.timer) {
    s.busy = true;
    s.el.classList.remove('active');
    s.el.classList.add('running');
    current = null;
    s.timeout = setTimeout(() => finishArea(s), d.timer * 1000);
  } else if (d.video) {
    playVideo(s, () => (d.message ? showDialog(d.message, after) : after()));
  } else if (d.message) {
    showDialog(d.message, after);
  } else if (d.action === 'countdown') {
    countdown = COUNTDOWN;
    finishArea(s);
  } else if (d.action === 'reset') {
    resetMap();
  } else if (d.action === 'hammer') {
    hasHammer = true;
    hammerEl.hidden = false;
    finishArea(s);
  } else if (d.action === 'door') {
    if (updateReady()) leaveThroughDoor(s);
    else shake(s);
  } else {
    shake(s); // nothing happens
  }
}

// Enter while holding the hammer: only box 6 breaks, anything else restarts the game
function hit(s) {
  if (s.def.n === HAMMER_TARGET) {
    finishArea(s);
    hasHammer = false;
    hammerEl.hidden = true;
  } else {
    resetMap();
  }
}

function startHelp(s) {
  if (locked() || s.done) return;
  playVideo(s, () => {
    finishArea(s);
    const win = state.get(s.def.helpTarget);
    if (win) finishArea(win);
    helpDone = true;
    updateReady();
  });
}

function leaveThroughDoor(door) {
  keys.clear();
  exiting = {
    t: 0, x0: player.x, y0: player.y,
    tx: door.x + door.w / 2, ty: door.y + door.h / 2,
  };
}

function emerge() {
  playerEl.style.display = '';
  playerEl.classList.remove('emerge');
  void playerEl.offsetWidth;
  playerEl.classList.add('emerge');
}

function resetMap() {
  for (const s of state.values()) {
    clearTimeout(s.timeout);
    s.busy = false;
    s.done = false;
    s.x = s.def.x;
    s.y = s.def.y;
    setPos(s);
    s.el.classList.remove('gone', 'active', 'running', 'ready', 'shake');
  }
  current = null;
  hasHammer = false;
  hammerEl.hidden = true;
  helpDone = false;
  countdown = null;
  countdownEl.hidden = true;
  exiting = null;
  ended = false;
  player.x = START.x;
  player.y = START.y;
  doneBox.hidden = true;
  emerge();
}

// ---------- Dialog ----------
function showDialog(text, cb) {
  keys.clear();
  dialogOpen = true;
  dialogCb = cb;
  dialogText.textContent = text;
  dialogEl.hidden = false;
}

function closeDialog() {
  dialogEl.hidden = true;
  dialogOpen = false;
  const cb = dialogCb;
  dialogCb = null;
  if (cb) cb();
}

// ---------- Video ----------
function playVideo(s, onDone) {
  if (playing) return;
  playing = s;
  playDone = onDone;
  keys.clear();
  missing.hidden = true;
  overlay.hidden = false;
  video.hidden = false;
  video.src = `${import.meta.env.BASE_URL}videos/${s.def.n}.mp4`;
  video.play().catch(() => {});
}

video.addEventListener('ended', () => closeVideo(true));
video.addEventListener('error', () => {
  if (!playing) return;
  video.hidden = true;
  missing.hidden = false;
  missing.innerHTML = `Video not found:<br><b>public/videos/${playing.def.n}.mp4</b><br><small>Esc = back${import.meta.env.DEV ? ' · Enter = mark as watched (dev only)' : ''}</small>`;
});

function closeVideo(finished) {
  const cb = playDone;
  video.pause();
  video.removeAttribute('src');
  video.load();
  overlay.hidden = true;
  playing = null;
  playDone = null;
  if (finished && cb) cb();
}

// ---------- Main loop ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  if (exiting) {
    exiting.t += dt / 0.9;
    const t = Math.min(1, exiting.t);
    player.x = exiting.x0 + (exiting.tx - exiting.x0) * t;
    player.y = exiting.y0 + (exiting.ty - exiting.y0) * t;
    if (t >= 1) {
      exiting = null;
      ended = true;
      playerEl.style.display = 'none';
      hammerEl.hidden = true;
      countdown = null;
      countdownEl.hidden = true;
      doneBox.hidden = false;
    }
  } else if (!locked()) {
    let dx = 0, dy = 0;
    for (const k of keys) { dx += MOVE[k][0]; dy += MOVE[k][1]; }
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      moveBy((dx / len) * SPEED * dt, 0);
      moveBy(0, (dy / len) * SPEED * dt);
    }
    // 30 second countdown (paused while a video or message is open)
    if (countdown !== null) {
      countdown -= dt;
      if (countdown <= 0) resetMap();
    }
  }
  if (countdown !== null) {
    countdownEl.hidden = false;
    countdownEl.textContent = Math.max(0, Math.ceil(countdown));
  }

  // snap to a 2px grid for a chunky retro look
  const px = Math.round((player.x - R) / 2) * 2;
  const py = Math.round((player.y - R) / 2) * 2;
  playerEl.style.left = px + 'px';
  playerEl.style.top = py + 'px';
  hammerEl.style.left = px + PLAYER + 2 + 'px';
  hammerEl.style.top = py + 2 + 'px';

  // nearest rectangle within reach
  let found = null, best = Infinity;
  if (!locked()) {
    for (const s of state.values()) {
      if (s.done || s.busy) continue;
      const dx = Math.max(s.x - player.x, 0, player.x - (s.x + s.w));
      const dy = Math.max(s.y - player.y, 0, player.y - (s.y + s.h));
      const dist = Math.hypot(dx, dy) - R;
      if (dist <= REACH && dist < best) { best = dist; found = s; }
    }
  }
  if (found !== current) {
    current?.el.classList.remove('active');
    found?.el.classList.add('active');
    current = found;
  }
  requestAnimationFrame(loop);
}
emerge();
requestAnimationFrame(loop);
