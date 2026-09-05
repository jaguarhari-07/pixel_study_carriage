/* All audio is synthesized with WebAudio — no asset files.
   Layers: train rumble (brown noise + wheel clatter), rain on the roof,
   café hum. Plus a soft bell chime for pomodoro transitions and tiny
   blips for UI feedback. */

export type SoundLayer = "rumble" | "rain" | "hum";

interface LayerNodes {
  src: AudioNode;
  gain: GainNode;
  clatterTimer?: number;
}

export class SoundKit {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private layers = new Map<SoundLayer, LayerNodes>();
  private noiseBuf: AudioBuffer | null = null;
  muted = false;

  /** Must be called from a user gesture. Safe to call repeatedly. */
  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      // shared noise buffer (2s white noise)
      const len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02; // brown-ish
        data[i] = (last * 3.2 + white * 0.25) / 2;
      }
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.08);
    }
  }

  setLayer(name: SoundLayer, on: boolean) {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const existing = this.layers.get(name);
    if (on && !existing) {
      this.layers.set(name, this.buildLayer(name));
    } else if (!on && existing) {
      const t = this.ctx.currentTime;
      existing.gain.gain.setTargetAtTime(0, t, 0.15);
      if (existing.clatterTimer) window.clearInterval(existing.clatterTimer);
      const src = existing.src;
      window.setTimeout(() => {
        try {
          (src as AudioScheduledSourceNode).stop?.();
        } catch {
          /* already stopped */
        }
        src.disconnect();
      }, 600);
      this.layers.delete(name);
    }
  }

  private buildLayer(name: SoundLayer): LayerNodes {
    const ctx = this.ctx!;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.master!);

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf!;
    src.loop = true;

    let clatterTimer: number | undefined;

    if (name === "rumble") {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 110;
      src.connect(lp);
      lp.connect(gain);
      gain.gain.setTargetAtTime(0.5, ctx.currentTime, 0.4);
      // wheel clatter: short noise ticks in pairs
      clatterTimer = window.setInterval(() => {
        this.tick(0.05, 900, 0.05);
        window.setTimeout(() => this.tick(0.04, 800, 0.04), 140);
      }, 620);
    } else if (name === "rain") {
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 500;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 3200;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.13;
      lfoGain.gain.value = 0.05;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
      src.connect(hp);
      hp.connect(lp);
      lp.connect(gain);
      gain.gain.setTargetAtTime(0.16, ctx.currentTime, 0.4);
    } else {
      // café hum
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 320;
      bp.Q.value = 0.6;
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.07;
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
      src.connect(bp);
      bp.connect(gain);
      gain.gain.setTargetAtTime(0.1, ctx.currentTime, 0.4);
      // faint cups-and-murmur blips
      clatterTimer = window.setInterval(() => {
        if (Math.random() > 0.5) this.tick(0.02, 1800 + Math.random() * 900, 0.03);
      }, 2400);
    }

    src.start();
    return { src, gain, clatterTimer };
  }

  private tick(vol: number, freq: number, dur: number) {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    s.connect(f);
    f.connect(g);
    g.connect(this.master);
    s.start(ctx.currentTime, Math.random());
    s.stop(ctx.currentTime + dur + 0.02);
  }

  /** Soft two-note bell for pomodoro transitions. */
  chime(kind: "focus" | "break" | "done") {
    if (!this.ctx || !this.master) return;
    const notes = kind === "focus" ? [523.25, 783.99] : kind === "break" ? [659.25, 493.88] : [523.25, 659.25, 783.99];
    notes.forEach((f, i) => this.bell(f, 0.16, i * 0.14));
  }

  private bell(freq: number, vol: number, delay: number) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = freq * 2.01;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
    const g2 = ctx.createGain();
    g2.gain.value = 0.3;
    o.connect(g);
    o2.connect(g2);
    g2.connect(g);
    g.connect(this.master);
    o.start(t0);
    o2.start(t0);
    o.stop(t0 + 1.2);
    o2.stop(t0 + 1.2);
  }

  /** Tiny UI feedback. */
  blip(freq = 880) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.035, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + 0.09);
  }
}
