/**
 * 轻松幽默的背景音乐：纯 Web Audio 现场合成，不需要任何音频文件。
 *
 * 一段 8 小节的循环，C 大调、116 BPM、带摇摆（swing）的 16 分音符：
 *   C - Am - F - G7 - C - Am - D7 - G7
 * 音色都是"小乐器"：三角波+方波的弹拨主旋律、走路似的贝斯、脚鼓/军鼓/沙锤，
 * 主旋律上还挂了一点点延迟当卡通味的回声；每 4 小节末尾有个下滑音当笑点。
 *
 * 浏览器要求先有用户手势才能出声，所以 startBgm() 是在开场界面点击时调用的。
 */

const BPM = 116;
const SWING = 0.16; // 摇摆量：偶数 16 分音符后面的那个音往后拖一点
const LOOKAHEAD = 0.28; // 提前排程的秒数
const TICK_MS = 30;
const VOLUME = 0.2;

const REST = '.';
const HOLD = '~';

/** 和弦根音 / 五音（贝斯用） */
const CHORDS = {
  C: ['C3', 'G2'],
  Am: ['A2', 'E3'],
  F: ['F2', 'C3'],
  G7: ['G2', 'D3'],
  D7: ['D3', 'A2'],
};

/** 8 小节，每小节 16 个 16 分音符 */
const PROGRESSION = [
  {
    chord: 'C',
    melody: 'E5 .  G5 .  C6 ~  ~  G5 E5 .  D5 .  E5 .  .  .',
  },
  {
    chord: 'Am',
    melody: 'C5 .  E5 .  A5 ~  ~  E5 C5 .  B4 .  C5 .  .  .',
  },
  {
    chord: 'F',
    melody: 'F5 .  A5 .  C6 ~  ~  A5 G5 .  F5 .  E5 .  .  .',
  },
  {
    chord: 'G7',
    melody: 'D5 .  G5 .  B4 ~  ~  D5 G5 .  F5 .  D5 .  .  .',
  },
  {
    chord: 'C',
    melody: 'E5 .  G5 .  C6 ~  E6 .  D6 .  C6 .  G5 .  .  .',
  },
  {
    chord: 'Am',
    melody: 'A5 .  C6 .  E6 ~  ~  C6 B5 .  A5 .  G5 .  E5 .',
  },
  {
    chord: 'D7',
    melody: 'F#5 .  A5 .  D6 ~  ~  A5 G5 .  F#5 .  E5 .  D5 .',
  },
  {
    chord: 'G7',
    melody: 'G5 .  B5 .  D6 ~  F6 .  E6 .  D6 .  G5 ~  .  .',
  },
];

/** 每小节的贝斯：根音 / 五音，最后一拍来个八度小跳，走起来更俏皮 */
const BASS_PATTERN = [0, 1, 0, 1];

const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteToFreq(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) return 0;
  const [, letter, accidental, octave] = m;
  const semi = SEMI[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
  const midi = semi + (Number(octave) + 1) * 12;
  return 440 * 2 ** ((midi - 69) / 12);
}

/** 把 'E5 .  G5 ~' 这种谱子拆成 [{note, step, len}] */
function parseMelody(line) {
  const tokens = line.trim().split(/\s+/);
  const notes = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === REST || t === HOLD) continue;
    let len = 1;
    while (tokens[i + len] === HOLD) len += 1;
    notes.push({ note: t, step: i, len });
  }
  return notes;
}

const BARS = PROGRESSION.map((bar) => ({
  chord: bar.chord,
  melody: parseMelody(bar.melody),
}));

const STEPS_PER_BAR = 16;
const TOTAL_STEPS = BARS.length * STEPS_PER_BAR;

let ctx = null;
let master = null;
let leadBus = null;
let noiseBuffer = null;
let timer = null;
let stepIndex = 0;
let nextTime = 0;
let playing = false;
let muted = false;
let visibilityBound = false;

function readMuted() {
  try {
    return window.localStorage.getItem('bgmMuted') === '1';
  } catch {
    return false;
  }
}

function ensureContext() {
  if (ctx) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  ctx = new AudioCtx();

  master = ctx.createGain();
  master.gain.value = muted ? 0 : VOLUME;
  const warm = ctx.createBiquadFilter();
  warm.type = 'lowpass';
  warm.frequency.value = 5200;
  master.connect(warm).connect(ctx.destination);

  // 主旋律一点点回声，卡通味
  leadBus = ctx.createGain();
  const delay = ctx.createDelay(0.5);
  delay.delayTime.value = 0.11;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.16;
  const wet = ctx.createGain();
  wet.gain.value = 0.18;
  leadBus.connect(master);
  leadBus.connect(delay);
  delay.connect(feedback).connect(delay);
  delay.connect(wet).connect(master);

  // 噪声（军鼓 / 沙锤用）
  const len = Math.floor(ctx.sampleRate * 0.4);
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

  muted = readMuted();
  master.gain.value = muted ? 0 : VOLUME;
}

/* ------------------------------------------------------------------ 音色 */

function playLead(freq, t, dur, { bend = 0, gain = 0.16 } = {}) {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  const top = freq * 2 ** (bend / 12);
  osc.frequency.setValueAtTime(top, t);
  if (bend) osc.frequency.exponentialRampToValueAtTime(freq, t + Math.min(0.14, dur * 0.6));

  // 叠一个八度方波，听起来更像小玩具琴
  const sparkle = ctx.createOscillator();
  sparkle.type = 'square';
  sparkle.frequency.setValueAtTime(top * 2, t);
  if (bend) {
    sparkle.frequency.exponentialRampToValueAtTime(freq * 2, t + Math.min(0.14, dur * 0.6));
  }

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);

  const sparkleGain = ctx.createGain();
  sparkleGain.gain.setValueAtTime(0.0001, t);
  sparkleGain.gain.linearRampToValueAtTime(gain * 0.35, t + 0.01);
  sparkleGain.gain.exponentialRampToValueAtTime(0.0008, t + dur * 0.7);

  osc.connect(g).connect(leadBus);
  sparkle.connect(sparkleGain).connect(leadBus);
  osc.start(t);
  osc.stop(t + dur + 0.05);
  sparkle.start(t);
  sparkle.stop(t + dur + 0.05);
}

function playBass(freq, t, dur) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.22, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function playNoise(t, dur, { type = 'highpass', freq = 6000, gain = 0.12 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  src.connect(filter).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function playKick(t) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(46, t + 0.13);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.3, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0008, t + 0.22);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + 0.26);
}

/* ------------------------------------------------------------------ 排程 */

function playStep(step, time, stepDur) {
  const bar = Math.floor(step / STEPS_PER_BAR) % BARS.length;
  const s = step % STEPS_PER_BAR;
  // 摇摆：每个 16 分音符的后半拍往后拖一点
  const swing = s % 2 === 1 ? stepDur * SWING : 0;
  const t = time + swing;
  const { chord, melody } = BARS[bar];

  // 主旋律
  melody.forEach(({ note, step: at, len }) => {
    if (at !== s) return;
    // 每 4 小节末尾来个下滑音，当个小笑点
    const bend = bar % 4 === 3 && at === 14 ? -2 : 0;
    playLead(noteToFreq(note), t, len * stepDur * 0.92, { bend });
  });

  // 贝斯：每拍一下，第三拍换五音
  if (s % 4 === 0) {
    const [root, fifth] = CHORDS[chord];
    const which = BASS_PATTERN[(s / 4) % BASS_PATTERN.length];
    playBass(noteToFreq(which ? fifth : root), t, stepDur * 3.1);
  }

  // 鼓组
  if (s === 0 || s === 8 || (bar % 4 === 3 && s === 11)) playKick(t);
  if (s === 4 || s === 12) playNoise(t, 0.16, { type: 'bandpass', freq: 1900, gain: 0.16 });
  if (s % 2 === 0) playNoise(t, 0.05, { type: 'highpass', freq: s % 4 === 0 ? 5200 : 7600, gain: 0.07 });
  if (bar % 4 === 3 && s === 15) playNoise(t, 0.22, { type: 'highpass', freq: 4200, gain: 0.12 });
}

function scheduler() {
  if (!playing || !ctx) return;
  const stepDur = 60 / BPM / 4;
  while (nextTime < ctx.currentTime + LOOKAHEAD) {
    playStep(stepIndex, nextTime, stepDur);
    stepIndex = (stepIndex + 1) % TOTAL_STEPS;
    nextTime += stepDur;
  }
}

/* ------------------------------------------------------------------ 对外 */

/** 切到后台就暂停，回到前台继续（手机上尤其重要） */
function bindVisibility() {
  if (visibilityBound) return;
  visibilityBound = true;
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !playing) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });
}

export function startBgm() {
  ensureContext();
  if (!ctx) return; // 浏览器不支持 Web Audio
  if (ctx.state === 'suspended') ctx.resume();
  if (playing) return;
  bindVisibility();
  playing = true;
  stepIndex = 0;
  nextTime = ctx.currentTime + 0.12;
  timer = setInterval(scheduler, TICK_MS);
}

export function stopBgm() {
  if (timer) clearInterval(timer);
  timer = null;
  playing = false;
}

export function isBgmPlaying() {
  return playing;
}

export function isBgmMuted() {
  return muted;
}

export function toggleBgmMute() {
  muted = !muted;
  try {
    window.localStorage.setItem('bgmMuted', muted ? '1' : '0');
  } catch {
    /* 隐私模式下写不了，忽略 */
  }
  if (ctx && master) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(muted ? 0 : VOLUME, ctx.currentTime, 0.05);
  }
  return muted;
}

muted = readMuted();
