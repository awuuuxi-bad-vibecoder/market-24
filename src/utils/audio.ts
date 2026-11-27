// Procedural Web Audio API atmospheric horror soundtrack & SFX engine for МАРКЕТ 24

class SoundEngine {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private masterVol = 0.85;
  private ambienceVol = 0.85;

  private currentMode: 'off' | 'outside' | 'inside' | 'blackout' | 'chapter2' | 'chase' = 'off';
  private activeNodes: AudioNode[] = [];
  private activeSources: Array<{ stop: () => void }> = [];
  private loopTimers: number[] = [];
  private distortionCurve: Float32Array<ArrayBuffer> | null = null;

  public init(): void {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master dynamics compressor keeps loud drones & rain rich without harsh clipping
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.01;
      this.compressor.release.value = 0.25;
      this.compressor.connect(this.ctx.destination);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVol;
      this.masterGain.connect(this.compressor);

      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.value = this.ambienceVol;
      this.ambienceGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.95;
      this.sfxGain.connect(this.masterGain);
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public isReady(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  public setVolumes(master: number, ambience: number): void {
    this.masterVol = master;
    this.ambienceVol = ambience;
    if (this.ctx && this.masterGain && this.ambienceGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(master, now, 0.05);
      this.ambienceGain.gain.setTargetAtTime(ambience, now, 0.08);
    }
  }

  public playUiMove(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(175, now + 0.05);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playUiConfirm(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.11);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(220, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.23);
    osc2.stop(now + 0.23);
  }

  public playUiBack(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(125, now + 0.09);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playFluorescentBuzz(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(118, now);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 460;
    filter.Q.value = 3.2;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.02);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.06);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.09);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playDoorHiss(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.95);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.7;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, now);
    filter.frequency.exponentialRampToValueAtTime(580, now + 0.9);
    filter.Q.value = 1.3;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.92);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.95);
  }

  public playFootstep(surface: 'asphalt' | 'tile'): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = surface === 'tile' ? 'triangle' : 'sine';
    const baseFreq = surface === 'tile' ? 150 + Math.random() * 24 : 92 + Math.random() * 18;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.075);

    gain.gain.setValueAtTime(surface === 'tile' ? 0.12 : 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  public playItemPickup(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(590, now + 0.08);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playScannerBeep(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    [0, 0.16, 0.34].forEach((offset, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = i === 2 ? 2350 : 2100;

      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.linearRampToValueAtTime(0.075, now + offset + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.08);
    });
  }

  public playPriceCheckerBeep(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1920, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playElectricalBuzz(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    filter.type = 'bandpass';
    filter.frequency.value = 620;
    filter.Q.value = 2.5;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.03);
    gain.gain.linearRampToValueAtTime(0.03, now + 0.12);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  public playShove(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.22);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playBlackout(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // 1. Heavy industrial circuit-breaker clunk
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(115, now);
    thud.frequency.exponentialRampToValueAtTime(24, now + 0.35);
    thudGain.gain.setValueAtTime(0.45, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    thud.connect(thudGain);
    thudGain.connect(this.sfxGain);
    thud.start(now);
    thud.stop(now + 0.42);

    // 2. Descending power-down transformer whine
    const whine = this.ctx.createOscillator();
    const whineGain = this.ctx.createGain();
    whine.type = 'sawtooth';
    whine.frequency.setValueAtTime(420, now);
    whine.frequency.exponentialRampToValueAtTime(36, now + 1.35);

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, now);
    lp.frequency.exponentialRampToValueAtTime(80, now + 1.35);

    whineGain.gain.setValueAtTime(0.22, now);
    whineGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

    whine.connect(lp);
    lp.connect(whineGain);
    whineGain.connect(this.sfxGain);
    whine.start(now);
    whine.stop(now + 1.45);

    // 3. Ominous sub-bass horror sting after power drops
    const sting = this.ctx.createOscillator();
    const stingGain = this.ctx.createGain();
    sting.type = 'sine';
    sting.frequency.setValueAtTime(46.25, now + 0.3);
    stingGain.gain.setValueAtTime(0.001, now + 0.3);
    stingGain.gain.linearRampToValueAtTime(0.32, now + 0.55);
    stingGain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);
    sting.connect(stingGain);
    stingGain.connect(this.sfxGain);
    sting.start(now + 0.3);
    sting.stop(now + 3.3);
  }

  public playPhoneFlashClick(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1450, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.035);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  public playAudioCalibrationTest(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Warm dark piano-like test tone + soft breath swell to let user judge volume
    [220, 329.63].forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const lp = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1200, now + i * 0.12);
      lp.frequency.exponentialRampToValueAtTime(260, now + i * 0.12 + 0.9);
      gain.gain.setValueAtTime(0.001, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.14, now + i * 0.12 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + i * 0.12 + 0.95);
      osc.connect(lp);
      lp.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 1.0);
    });
  }

  private getDistortionCurve(): Float32Array<ArrayBuffer> {
    if (this.distortionCurve) return this.distortionCurve;
    const samples = 1024;
    const buffer = new ArrayBuffer(samples * 4);
    const curve = new Float32Array(buffer);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Asymmetric soft-saturation clipping for torn vocal-cord timbre
      curve[i] = Math.tanh(x * 4.8 + x * x * 1.4);
    }
    this.distortionCurve = curve;
    return curve;
  }

  private createWhiteNoiseBuffer(seconds = 2): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  private createPinkNoiseBuffer(seconds = 2): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const out = buf.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.14;
      b6 = w * 0.115926;
    }
    return buf;
  }

  public playScreamer(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Hall echo feedback bus for realistic cavernous store acoustics
    const bus = this.ctx.createGain();
    bus.gain.value = 1.0;
    const delayL = this.ctx.createDelay();
    delayL.delayTime.value = 0.085;
    const fb = this.ctx.createGain();
    fb.gain.value = 0.28;
    const damp = this.ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 1800;

    bus.connect(this.sfxGain);
    bus.connect(delayL);
    delayL.connect(damp);
    damp.connect(fb);
    fb.connect(delayL);
    damp.connect(this.sfxGain);

    // 1. Sub-impact chest slam
    const sub = this.ctx.createOscillator();
    const sg = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(118, now);
    sub.frequency.exponentialRampToValueAtTime(27, now + 0.65);
    sg.gain.setValueAtTime(0.65, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
    sub.connect(sg);
    sg.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 0.75);

    // 2. FM-growled distorted human-like shriek (non-8-bit formant vocal cords)
    const shaper = this.ctx.createWaveShaper();
    shaper.curve = this.getDistortionCurve();
    shaper.oversample = '2x';

    const formantA = this.ctx.createBiquadFilter();
    formantA.type = 'bandpass';
    formantA.frequency.setValueAtTime(920, now);
    formantA.frequency.exponentialRampToValueAtTime(1450, now + 0.14);
    formantA.frequency.exponentialRampToValueAtTime(740, now + 0.92);
    formantA.Q.value = 3.2;

    const formantB = this.ctx.createBiquadFilter();
    formantB.type = 'bandpass';
    formantB.frequency.setValueAtTime(2150, now);
    formantB.frequency.exponentialRampToValueAtTime(2680, now + 0.18);
    formantB.frequency.exponentialRampToValueAtTime(1600, now + 0.92);
    formantB.Q.value = 3.8;

    const vocalMix = this.ctx.createGain();
    vocalMix.gain.setValueAtTime(0.001, now);
    vocalMix.gain.linearRampToValueAtTime(0.58, now + 0.025);
    vocalMix.gain.setValueAtTime(0.54, now + 0.45);
    vocalMix.gain.exponentialRampToValueAtTime(0.001, now + 0.98);

    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(74, now);
    mod.frequency.linearRampToValueAtTime(108, now + 0.3);
    modGain.gain.setValueAtTime(95, now);

    const vox1 = this.ctx.createOscillator();
    const vox2 = this.ctx.createOscillator();
    vox1.type = 'sawtooth';
    vox2.type = 'sawtooth';
    vox1.frequency.setValueAtTime(275, now);
    vox1.frequency.exponentialRampToValueAtTime(435, now + 0.12);
    vox1.frequency.exponentialRampToValueAtTime(215, now + 0.92);

    vox2.frequency.setValueAtTime(289, now);
    vox2.frequency.exponentialRampToValueAtTime(452, now + 0.12);
    vox2.frequency.exponentialRampToValueAtTime(222, now + 0.92);

    mod.connect(modGain);
    modGain.connect(vox1.frequency);
    modGain.connect(vox2.frequency);
    vox1.connect(shaper);
    vox2.connect(shaper);

    // 3. Shredded air aspiration through vocal formants
    const breathSrc = this.ctx.createBufferSource();
    breathSrc.buffer = this.createPinkNoiseBuffer(1.0);
    const breathGain = this.ctx.createGain();
    breathGain.gain.value = 1.6;
    breathSrc.connect(breathGain);
    breathGain.connect(shaper);

    shaper.connect(formantA);
    shaper.connect(formantB);
    formantA.connect(vocalMix);
    formantB.connect(vocalMix);
    vocalMix.connect(bus);

    mod.start(now);
    vox1.start(now);
    vox2.start(now);
    breathSrc.start(now);
    mod.stop(now + 1.0);
    vox1.stop(now + 1.0);
    vox2.stop(now + 1.0);
    breathSrc.stop(now + 1.0);
  }

  public playEntityBreath(proximity01: number): void {
    this.init();
    if (!this.ctx || !this.sfxGain || proximity01 <= 0.03) return;
    const now = this.ctx.currentTime;
    const vol = Math.min(0.62, 0.06 + proximity01 * 0.52);

    // Organic pink noise shaped through dual vocal-tract formants (throat + mouth airflow)
    const src = this.ctx.createBufferSource();
    src.buffer = this.createPinkNoiseBuffer(1.25);

    const throat = this.ctx.createBiquadFilter();
    throat.type = 'bandpass';
    throat.frequency.setValueAtTime(340, now);
    throat.frequency.linearRampToValueAtTime(520, now + 0.28);
    throat.frequency.linearRampToValueAtTime(260, now + 0.95);
    throat.Q.value = 3.2;

    const air = this.ctx.createBiquadFilter();
    air.type = 'bandpass';
    air.frequency.setValueAtTime(1450, now);
    air.frequency.linearRampToValueAtTime(1950, now + 0.32);
    air.frequency.linearRampToValueAtTime(1050, now + 1.05);
    air.Q.value = 1.8;

    // Subtle phlegm/raspy vocal flutter modulated onto airflow
    const raspLfo = this.ctx.createOscillator();
    const raspDepth = this.ctx.createGain();
    raspLfo.type = 'sine';
    raspLfo.frequency.value = 28 + Math.random() * 9;
    raspDepth.gain.value = 0.22;

    const breathGain = this.ctx.createGain();
    // Inhale (0..0.38s) -> brief catch (0.46s) -> heavy ragged exhale (0.50..1.14s)
    breathGain.gain.setValueAtTime(0.001, now);
    breathGain.gain.linearRampToValueAtTime(vol * 0.7, now + 0.16);
    breathGain.gain.linearRampToValueAtTime(vol * 0.1, now + 0.42);
    breathGain.gain.linearRampToValueAtTime(vol * 1.15, now + 0.56);
    breathGain.gain.exponentialRampToValueAtTime(0.001, now + 1.16);

    raspLfo.connect(raspDepth);
    raspDepth.connect(breathGain.gain);

    src.connect(throat);
    src.connect(air);
    throat.connect(breathGain);
    air.connect(breathGain);
    breathGain.connect(this.sfxGain);

    src.start(now);
    raspLfo.start(now);
    src.stop(now + 1.2);
    raspLfo.stop(now + 1.2);
  }

  public playEntityRoar(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Hall echo for booming store roar
    const bus = this.ctx.createGain();
    const delay = this.ctx.createDelay();
    delay.delayTime.value = 0.11;
    const fb = this.ctx.createGain();
    fb.gain.value = 0.34;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1500;
    bus.connect(this.sfxGain);
    bus.connect(delay);
    delay.connect(lp);
    lp.connect(fb);
    fb.connect(delay);
    lp.connect(this.sfxGain);

    const shaper = this.ctx.createWaveShaper();
    shaper.curve = this.getDistortionCurve();

    const formant1 = this.ctx.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.frequency.setValueAtTime(480, now);
    formant1.frequency.exponentialRampToValueAtTime(980, now + 0.18);
    formant1.frequency.exponentialRampToValueAtTime(360, now + 1.05);
    formant1.Q.value = 2.6;

    const formant2 = this.ctx.createBiquadFilter();
    formant2.type = 'bandpass';
    formant2.frequency.setValueAtTime(1350, now);
    formant2.frequency.exponentialRampToValueAtTime(2150, now + 0.2);
    formant2.frequency.exponentialRampToValueAtTime(880, now + 1.05);
    formant2.Q.value = 3.0;

    // FM throat snarl -> guttural scream
    const mod = this.ctx.createOscillator();
    const modG = this.ctx.createGain();
    mod.type = 'sine';
    mod.frequency.setValueAtTime(52, now);
    mod.frequency.linearRampToValueAtTime(84, now + 0.3);
    modG.gain.value = 85;

    const v1 = this.ctx.createOscillator();
    const v2 = this.ctx.createOscillator();
    v1.type = 'sawtooth';
    v2.type = 'sawtooth';
    v1.frequency.setValueAtTime(145, now);
    v1.frequency.exponentialRampToValueAtTime(270, now + 0.16);
    v1.frequency.exponentialRampToValueAtTime(118, now + 1.05);
    v2.frequency.setValueAtTime(218, now);
    v2.frequency.exponentialRampToValueAtTime(365, now + 0.16);
    v2.frequency.exponentialRampToValueAtTime(162, now + 1.05);

    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = this.createPinkNoiseBuffer(1.1);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 1.45;

    const masterOut = this.ctx.createGain();
    masterOut.gain.setValueAtTime(0.001, now);
    masterOut.gain.linearRampToValueAtTime(0.55, now + 0.08);
    masterOut.gain.exponentialRampToValueAtTime(0.001, now + 1.12);

    mod.connect(modG);
    modG.connect(v1.frequency);
    modG.connect(v2.frequency);
    v1.connect(shaper);
    v2.connect(shaper);
    noiseSrc.connect(noiseGain);
    noiseGain.connect(shaper);

    shaper.connect(formant1);
    shaper.connect(formant2);
    formant1.connect(masterOut);
    formant2.connect(masterOut);
    masterOut.connect(bus);

    mod.start(now);
    v1.start(now);
    v2.start(now);
    noiseSrc.start(now);
    mod.stop(now + 1.15);
    v1.stop(now + 1.15);
    v2.stop(now + 1.15);
    noiseSrc.stop(now + 1.15);
  }

  public playEntityFootstep(proximity01: number): void {
    this.init();
    if (!this.ctx || !this.sfxGain || proximity01 <= 0.03) return;
    const now = this.ctx.currentTime;
    const vol = 0.06 + proximity01 * 0.36;

    // 1. Heavy concrete/boot sub impact
    const thud = this.ctx.createOscillator();
    const tg = this.ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(84 + Math.random() * 14, now);
    thud.frequency.exponentialRampToValueAtTime(24, now + 0.13);
    tg.gain.setValueAtTime(vol, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    thud.connect(tg);
    tg.connect(this.sfxGain);
    thud.start(now);
    thud.stop(now + 0.15);

    // 2. Realistic shoe sole grit/scuff on store tile
    const grit = this.ctx.createBufferSource();
    grit.buffer = this.createWhiteNoiseBuffer(0.11);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(950 + Math.random() * 350, now);
    bp.Q.value = 1.4;
    const gg = this.ctx.createGain();
    gg.gain.setValueAtTime(vol * 0.38, now);
    gg.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    grit.connect(bp);
    bp.connect(gg);
    gg.connect(this.sfxGain);
    grit.start(now);
    grit.stop(now + 0.1);
  }

  public playShelfSmash(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Multi-layered shelf metal + shattered glass/plastic + concrete thud
    const buf = this.createWhiteNoiseBuffer(0.65);
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const crunchFilter = this.ctx.createBiquadFilter();
    crunchFilter.type = 'bandpass';
    crunchFilter.frequency.setValueAtTime(1150, now);
    crunchFilter.frequency.exponentialRampToValueAtTime(220, now + 0.5);
    crunchFilter.Q.value = 0.7;

    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.48, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.56);

    noise.connect(crunchFilter);
    crunchFilter.connect(ng);
    ng.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.6);

    // Metallic clatter ring
    const clang = this.ctx.createOscillator();
    const cg = this.ctx.createGain();
    clang.type = 'triangle';
    clang.frequency.setValueAtTime(340 + Math.random() * 110, now);
    clang.frequency.exponentialRampToValueAtTime(95, now + 0.25);
    cg.gain.setValueAtTime(0.24, now);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    clang.connect(cg);
    cg.connect(this.sfxGain);
    clang.start(now);
    clang.stop(now + 0.3);

    const thud = this.ctx.createOscillator();
    const tg = this.ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(98, now);
    thud.frequency.exponentialRampToValueAtTime(24, now + 0.32);
    tg.gain.setValueAtTime(0.5, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    thud.connect(tg);
    tg.connect(this.sfxGain);
    thud.start(now);
    thud.stop(now + 0.36);
  }

  public playStaffDoorEscape(): void {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;

    // Heavy steel fire-door slam + mechanical bolt slide
    const slam = this.ctx.createOscillator();
    const sg = this.ctx.createGain();
    slam.type = 'sine';
    slam.frequency.setValueAtTime(125, now);
    slam.frequency.exponentialRampToValueAtTime(24, now + 0.38);
    sg.gain.setValueAtTime(0.54, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    slam.connect(sg);
    sg.connect(this.sfxGain);
    slam.start(now);
    slam.stop(now + 0.44);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createPinkNoiseBuffer(0.28);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 640;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.32, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    noise.connect(lp);
    lp.connect(ng);
    ng.connect(this.sfxGain);
    noise.start(now);
    noise.stop(now + 0.26);

    const latch = this.ctx.createOscillator();
    const lg = this.ctx.createGain();
    latch.type = 'triangle';
    latch.frequency.setValueAtTime(480, now + 0.24);
    latch.frequency.exponentialRampToValueAtTime(190, now + 0.32);
    lg.gain.setValueAtTime(0.2, now + 0.24);
    lg.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    latch.connect(lg);
    lg.connect(this.sfxGain);
    latch.start(now + 0.24);
    latch.stop(now + 0.35);
  }

  public setAmbienceMode(
    mode: 'off' | 'outside' | 'inside' | 'blackout' | 'chapter2' | 'chase'
  ): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;

    this.stopAmbienceNodes();
    if (mode === 'off') return;

    this.init();
    if (!this.ctx || !this.ambienceGain) return;

    if (mode === 'outside') {
      this.startOutsideSoundtrack();
    } else if (mode === 'inside') {
      this.startInsideSoundtrack();
    } else if (mode === 'blackout') {
      // Suffocating dead silence with barely audible eerie sub-air pressure
      const sub = this.ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = 34;
      const g = this.ctx.createGain();
      g.gain.value = 0.08;
      sub.connect(g);
      g.connect(this.ambienceGain);
      sub.start();
      this.activeSources.push(sub);
      this.activeNodes.push(g);
    } else if (mode === 'chapter2') {
      this.startChapterTwoSoundtrack();
    } else if (mode === 'chase') {
      this.startChaseSoundtrack();
    }
  }

  private createNoiseBuffer(seconds = 4): AudioBuffer {
    const ctx = this.ctx!;
    const bufferSize = Math.floor(ctx.sampleRate * seconds);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const out = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      out[i] = (lastOut + 0.035 * white) / 1.035;
      lastOut = out[i];
      out[i] *= 3.4;
    }
    return noiseBuffer;
  }

  private startOutsideSoundtrack(): void {
    const ctx = this.ctx!;
    const dest = this.ambienceGain!;
    const now = ctx.currentTime;

    // 1. Heavy nocturnal rain bed with slow wind swell
    const rainNoise = ctx.createBufferSource();
    rainNoise.buffer = this.createNoiseBuffer(4);
    rainNoise.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 920;
    rainFilter.Q.value = 0.45;

    const rainLfo = ctx.createOscillator();
    rainLfo.type = 'sine';
    rainLfo.frequency.value = 0.11;
    const rainLfoGain = ctx.createGain();
    rainLfoGain.gain.value = 260;
    rainLfo.connect(rainLfoGain);
    rainLfoGain.connect(rainFilter.frequency);

    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0.001, now);
    rainGain.gain.linearRampToValueAtTime(0.32, now + 1.2);

    rainNoise.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(dest);
    rainNoise.start();
    rainLfo.start();

    this.activeSources.push(rainNoise, rainLfo);
    this.activeNodes.push(rainFilter, rainLfoGain, rainGain);

    // 2. Ominous deep sub-bass drone (beating sawtooth + sine pair around D1 ~36.7Hz & 37.3Hz)
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 140;
    droneFilter.Q.value = 2.4;

    const droneLfo = ctx.createOscillator();
    droneLfo.type = 'sine';
    droneLfo.frequency.value = 0.08;
    const droneLfoGain = ctx.createGain();
    droneLfoGain.gain.value = 65;
    droneLfo.connect(droneLfoGain);
    droneLfoGain.connect(droneFilter.frequency);

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.001, now);
    droneGain.gain.linearRampToValueAtTime(0.34, now + 1.8);

    const subA = ctx.createOscillator();
    subA.type = 'sawtooth';
    subA.frequency.value = 36.71; // D1

    const subB = ctx.createOscillator();
    subB.type = 'sawtooth';
    subB.frequency.value = 37.25; // slow eerie detune

    const subRoot = ctx.createOscillator();
    subRoot.type = 'sine';
    subRoot.frequency.value = 55.0; // A1 fifth tension

    subA.connect(droneFilter);
    subB.connect(droneFilter);
    subRoot.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(dest);

    subA.start();
    subB.start();
    subRoot.start();
    droneLfo.start();

    this.activeSources.push(subA, subB, subRoot, droneLfo);
    this.activeNodes.push(droneFilter, droneLfoGain, droneGain);

    // 3. Dark ambient piano / metallic horror motif (sparse dissonant minor + tritone notes)
    const motifNotes = [
      293.66, // D4
      311.13, // Eb4 (minor 2nd tension!)
      220.0,  // A3
      207.65, // Ab3 (tritone from D)
      261.63, // C4
      174.61, // F3
    ];
    let step = 0;

    const playHorrorNote = () => {
      if (this.currentMode !== 'outside' || !this.ctx || !this.ambienceGain) return;
      const t = this.ctx.currentTime;
      const freq = motifNotes[step % motifNotes.length];
      step++;

      const toneFilter = this.ctx.createBiquadFilter();
      toneFilter.type = 'lowpass';
      toneFilter.frequency.setValueAtTime(1100, t);
      toneFilter.frequency.exponentialRampToValueAtTime(280, t + 4.8);

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.value = freq;
      osc2.frequency.value = freq * 0.5; // octave lower shadow

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.11, t + 0.35);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 5.2);

      osc1.connect(toneFilter);
      osc2.connect(toneFilter);
      toneFilter.connect(g);
      g.connect(this.ambienceGain);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 5.3);
      osc2.stop(t + 5.3);
    };

    const initMotif = window.setTimeout(playHorrorNote, 600);
    const motifLoop = window.setInterval(playHorrorNote, 3600);
    this.loopTimers.push(initMotif, motifLoop);

    // 4. Distant thunder / parking lot rumble every ~12 seconds
    const playDistantRumble = () => {
      if (this.currentMode !== 'outside' || !this.ctx || !this.ambienceGain) return;
      const t = this.ctx.currentTime;
      const rumbleBuf = this.createNoiseBuffer(3.2);
      const src = this.ctx.createBufferSource();
      src.buffer = rumbleBuf;

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(135, t);
      lp.frequency.exponentialRampToValueAtTime(48, t + 3.0);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.28, t + 0.45);
      g.gain.exponentialRampToValueAtTime(0.001, t + 3.1);

      src.connect(lp);
      lp.connect(g);
      g.connect(this.ambienceGain);
      src.start(t);
      src.stop(t + 3.2);
    };

    const rumbleLoop = window.setInterval(playDistantRumble, 12500);
    this.loopTimers.push(rumbleLoop);
  }

  private startInsideSoundtrack(): void {
    const ctx = this.ctx!;
    const dest = this.ambienceGain!;
    const now = ctx.currentTime;

    // 1. Ventilation AC + 60Hz fluorescent store hum
    const acNoise = ctx.createBufferSource();
    acNoise.buffer = this.createNoiseBuffer(3);
    acNoise.loop = true;

    const acFilter = ctx.createBiquadFilter();
    acFilter.type = 'lowpass';
    acFilter.frequency.value = 310;

    const acGain = ctx.createGain();
    acGain.gain.setValueAtTime(0.001, now);
    acGain.gain.linearRampToValueAtTime(0.18, now + 0.9);

    acNoise.connect(acFilter);
    acFilter.connect(acGain);
    acGain.connect(dest);
    acNoise.start();

    const hum = ctx.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 60;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.065;
    hum.connect(humGain);
    humGain.connect(dest);
    hum.start();

    // Subtle uneasy sub-pulse beneath the muzak
    const underDrone = ctx.createOscillator();
    underDrone.type = 'triangle';
    underDrone.frequency.value = 46.25; // F#1 subtle tension
    const underFilter = ctx.createBiquadFilter();
    underFilter.type = 'lowpass';
    underFilter.frequency.value = 95;
    const underGain = ctx.createGain();
    underGain.gain.value = 0.14;
    underDrone.connect(underFilter);
    underFilter.connect(underGain);
    underGain.connect(dest);
    underDrone.start();

    this.activeSources.push(acNoise, hum, underDrone);
    this.activeNodes.push(acFilter, acGain, humGain, underFilter, underGain);

    // 2. Uncanny, louder muffled ceiling-speaker Supermarket Muzak
    // Alternates warm nostalgic chords with a slightly off/warped minor-diminished turn
    const chords = [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0],  // Am7
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [185.0, 220.0, 277.18, 349.23],  // Slightly warped F#dim/Fm uncanny turn
    ];
    let step = 0;

    const playChord = () => {
      if (this.currentMode !== 'inside' || !this.ctx || !this.ambienceGain) return;
      const t = this.ctx.currentTime;
      const notes = chords[step % chords.length];
      const isUncannyTurn = step % chords.length === 3;
      step++;

      const speakerFilter = this.ctx.createBiquadFilter();
      speakerFilter.type = 'bandpass';
      speakerFilter.frequency.value = isUncannyTurn ? 620 : 780;
      speakerFilter.Q.value = 0.8;
      speakerFilter.connect(this.ambienceGain);

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        // Subtle worn tape pitch drift
        const detune = isUncannyTurn ? 0.992 : 1 + (Math.random() - 0.5) * 0.005;
        osc.frequency.setValueAtTime(freq * detune, t);
        if (isUncannyTurn) {
          osc.frequency.linearRampToValueAtTime(freq * 0.985, t + 2.4);
        }

        const offset = idx * 0.07;
        g.gain.setValueAtTime(0.0001, t + offset);
        g.gain.linearRampToValueAtTime(0.068, t + offset + 0.16);
        g.gain.exponentialRampToValueAtTime(0.0008, t + offset + 2.6);

        osc.connect(g);
        g.connect(speakerFilter);
        osc.start(t + offset);
        osc.stop(t + offset + 2.7);
      });
    };

    playChord();
    const muzakTimer = window.setInterval(playChord, 2800);
    this.loopTimers.push(muzakTimer);

    // 3. Occasional distant store ceiling PA chime ("ding-dong")
    const playPaChime = () => {
      if (this.currentMode !== 'inside' || !this.ctx || !this.ambienceGain) return;
      const t = this.ctx.currentTime;

      const speakerFilter = this.ctx.createBiquadFilter();
      speakerFilter.type = 'bandpass';
      speakerFilter.frequency.value = 980;
      speakerFilter.Q.value = 1.1;
      speakerFilter.connect(this.ambienceGain);

      [783.99, 659.25].forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const start = t + idx * 0.34;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.linearRampToValueAtTime(0.055, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0008, start + 1.25);

        osc.connect(g);
        g.connect(speakerFilter);
        osc.start(start);
        osc.stop(start + 1.3);
      });
    };

    const initChime = window.setTimeout(playPaChime, 8500);
    const chimeLoop = window.setInterval(playPaChime, 26000);
    this.loopTimers.push(initChime, chimeLoop);
  }

  private startChapterTwoSoundtrack(): void {
    const ctx = this.ctx!;
    const dest = this.ambienceGain!;
    const now = ctx.currentTime;

    // 1. Oppressive hollow dark hall drone + cold air pressure
    const subA = ctx.createOscillator();
    subA.type = 'sine';
    subA.frequency.value = 32.7; // C1

    const subB = ctx.createOscillator();
    subB.type = 'triangle';
    subB.frequency.value = 33.15;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 88;

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.22, now + 1.5);

    subA.connect(lp);
    subB.connect(lp);
    lp.connect(subGain);
    subGain.connect(dest);
    subA.start();
    subB.start();

    this.activeSources.push(subA, subB);
    this.activeNodes.push(lp, subGain);

    // 2. Distant metallic roof groans / subtle shelf settle creaks
    const playDistantCreak = () => {
      if (this.currentMode !== 'chapter2' || !this.ctx || !this.ambienceGain) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();

      osc.type = 'sawtooth';
      const base = 90 + Math.random() * 65;
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * 0.72, t + 1.8);

      filter.type = 'bandpass';
      filter.frequency.value = 240;
      filter.Q.value = 4.5;

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.055, t + 0.3);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 1.9);

      osc.connect(filter);
      filter.connect(g);
      g.connect(this.ambienceGain);
      osc.start(t);
      osc.stop(t + 2.0);
    };

    const creakLoop = window.setInterval(playDistantCreak, 14500);
    this.loopTimers.push(creakLoop);
  }

  private startChaseSoundtrack(): void {
    const ctx = this.ctx!;
    const dest = this.ambienceGain!;
    const now = ctx.currentTime;

    // 1. Grinding distorted sub-bass drone during chase
    const shaper = ctx.createWaveShaper();
    shaper.curve = this.getDistortionCurve();

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 175;
    lp.Q.value = 3.2;

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.001, now);
    droneGain.gain.linearRampToValueAtTime(0.32, now + 0.35);

    const bassA = ctx.createOscillator();
    bassA.type = 'sawtooth';
    bassA.frequency.value = 36.71;
    const bassB = ctx.createOscillator();
    bassB.type = 'sawtooth';
    bassB.frequency.value = 38.9; // tense minor-second clash

    bassA.connect(shaper);
    bassB.connect(shaper);
    shaper.connect(lp);
    lp.connect(droneGain);
    droneGain.connect(dest);
    bassA.start();
    bassB.start();

    this.activeSources.push(bassA, bassB);
    this.activeNodes.push(shaper, lp, droneGain);

    // 2. Frantic panicked heartbeat kick + metallic industrial scrape (142 BPM)
    let beatStep = 0;
    const playChasePulse = () => {
      if (this.currentMode !== 'chase' || !this.ctx || !this.ambienceGain) return;
      const t = this.ctx.currentTime;
      const accent = beatStep % 4 === 0;
      beatStep++;

      // Double lub-dub chest thump
      const kick = this.ctx.createOscillator();
      const kg = this.ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(accent ? 105 : 78, t);
      kick.frequency.exponentialRampToValueAtTime(26, t + 0.16);
      kg.gain.setValueAtTime(accent ? 0.42 : 0.25, t);
      kg.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      kick.connect(kg);
      kg.connect(this.ambienceGain);
      kick.start(t);
      kick.stop(t + 0.2);

      // Sharp metallic industrial tick / horror string stab every 2nd beat
      if (beatStep % 2 === 1) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createPinkNoiseBuffer(0.14);
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = accent ? 1650 : 1100;
        bp.Q.value = 2.4;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(accent ? 0.16 : 0.09, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        noise.connect(bp);
        bp.connect(ng);
        ng.connect(this.ambienceGain);
        noise.start(t);
        noise.stop(t + 0.13);
      }

      // High dissonant bowed string shriek every bar
      if (beatStep % 8 === 1) {
        const str = this.ctx.createOscillator();
        const strFilter = this.ctx.createBiquadFilter();
        const sg = this.ctx.createGain();
        str.type = 'sawtooth';
        str.frequency.setValueAtTime(440, t);
        str.frequency.linearRampToValueAtTime(466.16, t + 0.85); // eerie half-step slide
        strFilter.type = 'bandpass';
        strFilter.frequency.value = 1200;
        strFilter.Q.value = 2.2;
        sg.gain.setValueAtTime(0.001, t);
        sg.gain.linearRampToValueAtTime(0.1, t + 0.12);
        sg.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
        str.connect(strFilter);
        strFilter.connect(sg);
        sg.connect(this.ambienceGain);
        str.start(t);
        str.stop(t + 0.98);
      }
    };

    playChasePulse();
    const chaseLoop = window.setInterval(playChasePulse, 210);
    this.loopTimers.push(chaseLoop);
  }

  private stopAmbienceNodes(): void {
    for (const timer of this.loopTimers) {
      window.clearTimeout(timer);
      window.clearInterval(timer);
    }
    this.loopTimers = [];

    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {
        // ignore already stopped
      }
    }
    this.activeSources = [];

    for (const node of this.activeNodes) {
      try {
        node.disconnect();
      } catch {
        // ignore
      }
    }
    this.activeNodes = [];
  }
}

export const soundEngine = new SoundEngine();
