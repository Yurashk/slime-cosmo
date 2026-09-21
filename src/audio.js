const SFX_KEY = 'slime-sfx-muted';
const SFX_ENABLED_KEY = 'slime-sfx-enabled';

const clampFreq = (f, lo = 110, hi = 1500) => Math.max(lo, Math.min(hi, f));

class SlimeSfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
    this.unlocked = false;
    this.muted = false;
    this.last = { key: '', t: 0, f: 1 };
  }

  init() {
    this.unlocked = false;
    this.muted = false;
    try {
      if (localStorage.getItem(SFX_ENABLED_KEY) === '0') this.muted = true;
      else if (localStorage.getItem(SFX_KEY) === '1') this.muted = true;
    } catch (e) {}
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) {
          this.ctx.suspend().catch(() => {});
        } else if (this.ctx.state === 'suspended' && this.unlocked) {
          this.ctx.resume().catch(() => {});
        }
      });
    }
  }

  setMuted(m) {
    this.muted = !!m;
    try { localStorage.setItem(SFX_ENABLED_KEY, this.muted ? '0' : '1'); } catch (e) {}
  }

  isMuted() {
    return this.muted;
  }

  unlock() {
    this.unlocked = true;
    const c = this._ensure();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }

  _ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'interrupted') this.ctx.resume().catch(() => {});
      return this.ctx;
    }
    if (typeof window === 'undefined') return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      const c = new AC();
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value = 18;
      comp.ratio.value = 5;
      comp.attack.value = 0.004;
      comp.release.value = 0.18;
      this.master = c.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(comp);
      comp.connect(c.destination);
      this.ctx = c;
    } catch (e) {
      return null;
    }
    return this.ctx;
  }

  _ready() {
    if (!this.unlocked || this.muted) return false;
    if (typeof document !== 'undefined' && document.hidden) return false;
    return !!this._ensure();
  }

  _now() {
    return performance.now();
  }

  _vary(key, windowMs) {
    const t = this._now();
    let f = 1;
    if (this.last.key === key && t - this.last.t < windowMs) {
      f = this.last.f * Math.pow(2, 1 / 12);
    }
    this.last = { key, t, f };
    return f;
  }

  _env(g, t, peak, att, dec) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0003, peak), t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + att + dec);
  }

  _osc(type, freq, t, peak, att, dec, dest) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = Math.max(1, freq);
    const g = this.ctx.createGain();
    this._env(g, t, peak, att, dec);
    o.connect(g);
    g.connect(dest || this.master);
    o.start(t);
    const end = t + att + dec + 0.05;
    o.stop(end);
    o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (e) {} };
  }

  _sweep(type, f0, f1, t, dur, peak, dest) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = this.ctx.createGain();
    this._env(g, t, peak, 0.006, dur);
    o.connect(g);
    g.connect(dest || this.master);
    o.start(t);
    const end = t + dur + 0.05;
    o.stop(end);
    o.onended = () => { try { o.disconnect(); g.disconnect(); } catch (e) {} };
  }

  _noiseSource() {
    const c = this.ctx;
    const len = Math.floor(c.sampleRate * 1);
    if (!this.noiseBuf || this.noiseBuf.length !== len) {
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    }
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    return src;
  }

  _burst(t, peak, att, dec, filterOpts) {
    if (!this.ctx) return;
    const src = this._noiseSource();
    const g = this.ctx.createGain();
    this._env(g, t, peak, att, dec);
    if (filterOpts) {
      const f = this.ctx.createBiquadFilter();
      f.type = filterOpts.type;
      f.Q.value = filterOpts.q || 1;
      if (filterOpts.f0 && filterOpts.f1) {
        f.frequency.setValueAtTime(filterOpts.f0, t);
        f.frequency.exponentialRampToValueAtTime(filterOpts.f1, t + att + dec);
      } else {
        f.frequency.value = filterOpts.f0 || filterOpts.freq || 1000;
      }
      src.connect(f);
      f.connect(g);
    } else {
      src.connect(g);
    }
    g.connect(this.master);
    src.start(t);
    const end = t + att + dec + 0.05;
    src.stop(end);
    src.onended = () => { try { src.disconnect(); g.disconnect(); } catch (e) {} };
  }

  playDrop() {
    if (!this._ready()) return;
    const c = this.ctx;
    const t = c.currentTime;
    this._sweep('sine', 340, 180, t, 0.05, 0.06);
  }

  playMerge(level) {
    if (!this._ready()) return;
    const c = this.ctx;
    const t = c.currentTime;
    const lvl = Math.max(1, level | 0);
    const base = clampFreq(150 * Math.pow(1.08, lvl - 1));
    const pit = base * Math.pow(2, (Math.random() - 0.5) * 0.1) * this._vary('merge', 90);

    this._sweep('sine', 180 * (pit / 150), 70 * (pit / 150), t, 0.055, 0.3);
    this._burst(t + 0.002, 0.16, 0.004, 0.14, { type: 'bandpass', f0: 400, f1: 900, q: 2 });

    if (lvl >= 6) {
      this._osc('sine', 80, t, 0.12, 0.008, 0.38);
    }

    const spark = [1800, 2350, 3100];
    for (let i = 0; i < spark.length; i++) {
      this._osc('sine', spark[i] * (pit / 150), t + 0.01 + i * 0.014, 0.04, 0.004, 0.3);
    }

    if (lvl === 11 || lvl === 12) {
      this._osc('sine', 5200, t + 0.02, 0.03, 0.005, 0.5);
    }

    this._haptic(16);
  }

  playPlanetMerge(level) {
    if (!this._ready()) return;
    const c = this.ctx;
    const t = c.currentTime;
    const pit = Math.pow(2, (Math.random() - 0.5) * 0.08);
    this._burst(t, 0.14, 0.05, 0.32, { type: 'bandpass', f0: 240 * pit, f1: 2300 * pit, q: 0.9 });
    this._sweep('sine', 430 * pit, 90 * pit, t + 0.02, 0.24, 0.12);
    this._burst(t + 0.16, 0.1, 0.004, 0.13, { type: 'bandpass', f0: 1600, f1: 700, q: 2 });
    this._osc('sine', 130, t + 0.16, 0.16, 0.006, 0.13);
    this._osc('sine', 66, t + 0.18, 0.12, 0.01, 0.3);
    this._haptic(45);
  }

  playRespawn(isPlanet) {
    if (!this._ready()) return;
    const c = this.ctx;
    const t = c.currentTime;
    const pit = Math.pow(2, (Math.random() - 0.5) * 0.07);
    this._burst(t, 0.075, 0.012, 0.16, { type: 'bandpass', f0: 1500 * pit, f1: 300 * pit, q: 0.6 });
    this._sweep('sine', 330 * pit, 120 * pit, t + 0.02, 0.1, 0.1);
    this._osc('sine', 620 * pit, t + 0.1, 0.05, 0.004, 0.14);
    if (isPlanet) {
      this._osc('sine', 2600, t + 0.02, 0.04, 0.005, 0.22);
    }
  }

  playCombo(streak) {
    if (!this._ready()) return;
    const c = this.ctx;
    const t = c.currentTime;
    const mult = Math.max(2, Math.min(streak | 0, 10));
    const glow = 0.09 + 0.014 * mult;

    this._burst(t, glow, 0.005, 0.1 + mult * 0.006, { type: 'bandpass', f0: 6500, q: 1.4 });

    if (mult >= 4) {
      const notes = [523, 587, 659, 784];
      for (let i = 0; i < notes.length; i++) {
        this._osc('sine', notes[i] * 1.25, t + 0.03 + i * 0.055, 0.06, 0.004, 0.24);
      }
    }
    if (mult >= 7) {
      const chord = [523, 659, 784, 1046];
      for (let i = 0; i < chord.length; i++) {
        this._osc('sine', chord[i] * 1.25, t, 0.08, 0.005, 0.5);
      }
      this._burst(t, 0.05, 0.005, 0.35, { type: 'highpass', f0: 4000, q: 0.8 });
    }
    if (mult >= 10) {
      const gliss = c.createOscillator();
      gliss.type = 'sine';
      gliss.frequency.setValueAtTime(300, t);
      gliss.frequency.exponentialRampToValueAtTime(1400, t + 0.35);
      const g = c.createGain();
      this._env(g, t, 0.1, 0.01, 0.38);
      gliss.connect(g);
      g.connect(this.master);
      gliss.start(t);
      gliss.stop(t + 0.42);
      gliss.onended = () => { try { gliss.disconnect(); g.disconnect(); } catch (e) {} };
    }

    this._haptic(mult >= 7 ? 60 : 30);
  }

  playUnlock() {
    if (!this._ready()) return;
    const c = this.ctx;
    const t = c.currentTime;
    const notes = [392, 523, 659, 784];
    for (let i = 0; i < notes.length; i++) {
      this._osc('sine', notes[i], t + i * 0.09, 0.1, 0.005, 0.45);
    }
    this._osc('sine', 87, t, 0.08, 0.01, 0.6);
    this._burst(t + 0.36, 0.045, 0.006, 0.3, { type: 'bandpass', f0: 8000, q: 1 });
    this._haptic([40, 40, 80]);
  }

  playGameOver() {
    if (!this._ready()) return;
    const c = this.ctx;
    const t = c.currentTime;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(400, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.5);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const g = c.createGain();
    this._env(g, t, 0.16, 0.01, 0.6);
    o.connect(lp);
    lp.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + 0.7);
    this._osc('sine', 55, t, 0.12, 0.02, 0.7);
  }

  playAntigravity() {
    if (!this._ready()) return;
    const c = this.ctx;
    const t = c.currentTime;
    this._sweep('sine', 110, 480, t, 0.55, 0.09);
    this._sweep('triangle', 220, 980, t + 0.06, 0.5, 0.045);
    this._burst(t, 0.05, 0.05, 0.5, { type: 'highpass', f0: 2400, f1: 4800, q: 0.8 });
    this._haptic(25);
  }

  playAntigravityEnd() {
    if (!this._ready()) return;
    const c = this.ctx;
    const t = c.currentTime;
    this._sweep('sine', 420, 90, t, 0.32, 0.07);
    this._burst(t, 0.07, 0.008, 0.22, { type: 'lowpass', f0: 700, q: 1 });
    this._haptic(15);
  }

  playBlackHoleArm() {
    if (!this._ready()) return;
    const c = this.ctx;
    const t = c.currentTime;
    this._sweep('sine', 700, 1300, t, 0.09, 0.06);
    this._osc('sine', 2100, t + 0.03, 0.03, 0.004, 0.14);
    this._haptic(10);
  }

  playBlackHole() {
    if (!this._ready()) return;
    const c = this.ctx;
    const t = c.currentTime;
    this._sweep('sine', 1500, 70, t, 0.42, 0.14);
    this._burst(t + 0.02, 0.12, 0.01, 0.4, { type: 'lowpass', f0: 900, f1: 120, q: 1.2 });
    this._osc('sine', 50, t + 0.02, 0.1, 0.01, 0.5);
    this._osc('sine', 3200, t + 0.05, 0.03, 0.004, 0.16);
    this._haptic(35);
  }

  playBoosterCancel() {
    if (!this._ready()) return;
    const c = this.ctx;
    const t = c.currentTime;
    this._sweep('sine', 520, 260, t, 0.12, 0.05);
  }

  playBoosterDenied() {
    if (!this._ready()) return;
    const c = this.ctx;
    const t = c.currentTime;
    this._osc('square', 160, t, 0.04, 0.008, 0.12);
    this._osc('square', 110, t + 0.05, 0.04, 0.008, 0.12);
  }

  playReward() {
    if (!this._ready()) return;
    const c = this.ctx;
    const t = c.currentTime;
    const notes = [784, 1174, 1568];
    for (let i = 0; i < notes.length; i++) {
      this._osc('sine', notes[i], t + i * 0.07, 0.09, 0.005, 0.3);
    }
    this._burst(t + 0.12, 0.05, 0.005, 0.3, { type: 'bandpass', f0: 7000, q: 1 });
    this._haptic([20, 25, 45]);
  }

  _haptic(pattern) {
    try {
      if (typeof navigator === 'undefined' || !navigator.vibrate) return;
      navigator.vibrate(pattern);
    } catch (e) {}
  }
}

export const sfx = new SlimeSfx();