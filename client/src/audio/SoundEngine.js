// Procedural Web Audio Synthesizer for PRATHAM – THE TEMPLE ESCAPE
// Zero external MP3 dependencies: generates jungle percussion, bansuri-inspired temple flute,
// ambient wind/water atmosphere, coin chimes, jump/slide whooshes, guardian roars & crash SFX.

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicRunning = false;
    this.musicTimer = null;
    this.stepIndex = 0;
    this.ambienceNode = null;
    this.ambienceGain = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.muted) {
      this.stopMusic();
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  startMusic() {
    this.init();
    if (!this.ctx || this.muted || this.musicRunning) return;
    this.musicRunning = true;

    // Subtle temple wind / waterfall mist ambience
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.25;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 520;
      filter.Q.value = 0.9;

      const gain = this.ctx.createGain();
      gain.gain.value = 0.025;

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();

      this.ambienceNode = noise;
      this.ambienceGain = gain;
    } catch {
      // ignore audio setup issues
    }

    // Indian pentatonic (Durga / Bhupali inspired: C4, D4, E4, G4, A4, C5, D5)
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
    const tablaPattern = [1, 0, 0.5, 0, 0.85, 0, 0.45, 0.65];

    const tick = () => {
      if (!this.musicRunning || this.muted || !this.ctx) return;
      const now = this.ctx.currentTime;
      const beat = this.stepIndex % 8;

      // Jungle / Tabla drum pulse
      const hit = tablaPattern[beat];
      if (hit > 0) {
        this._playDrum(now, beat === 0 ? 115 : beat === 4 ? 145 : 210, 0.075 * hit);
      }

      // Temple bansuri flute phrase on selected beats
      if (beat === 0 || beat === 3 || beat === 5 || (beat === 7 && this.stepIndex % 16 === 7)) {
        const noteIdx = (Math.floor(this.stepIndex / 3) + beat) % scale.length;
        this._playFluteNote(now, scale[noteIdx], 0.22, 0.032);
      }

      this.stepIndex++;
      this.musicTimer = setTimeout(tick, 185);
    };

    tick();
  }

  stopMusic() {
    this.musicRunning = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.ambienceNode) {
      try {
        this.ambienceNode.stop();
        this.ambienceNode.disconnect();
      } catch {
        // ignore
      }
      this.ambienceNode = null;
    }
  }

  _playDrum(time, freq, volume) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq * 1.4, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.55, time + 0.11);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.14);
  }

  _playFluteNote(time, freq, duration, volume) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.98, time);
    osc.frequency.linearRampToValueAtTime(freq, time + 0.04);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  playCoin(isDouble = false) {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const base = isDouble ? 1046.5 : 880;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.setValueAtTime(base * 1.25, now + 0.055);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playDiamond() {
    this.init();
    if (!this.ctx || this.muted) return;
    const notes = [880, 1108.73, 1318.5, 1760];
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.21);
    });
  }

  playPowerup() {
    this.init();
    if (!this.ctx || this.muted) return;
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.065, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.23);
    });
  }

  playJump() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.16);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  playSlide() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  playSwipe() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(460, now + 0.08);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playTurn() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    [523.25, 783.99].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      gain.gain.setValueAtTime(0.1, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.17);
    });
  }

  playShieldBreak() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    [740, 520, 340].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(0.1, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.2);
    });
  }

  playGuardianRoar() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.linearRampToValueAtTime(62, now + 0.48);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.56);
  }

  playCrash() {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.38);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.44);
    this.playGuardianRoar();
  }
}

export const sound = new SoundEngine();
