import { MusicTrackId } from '../types';

export interface MusicTrackMeta {
  id: MusicTrackId;
  name: string;
  emoji: string;
  bpm: number;
  description: string;
}

export const MUSIC_TRACKS: MusicTrackMeta[] = [
  {
    id: 'funk',
    name: 'Sôi Động Học Đường (Funk Groove)',
    emoji: '🕺',
    bpm: 126,
    description: 'Tiết tấu funky tươi vui, nhịp bass sôi nổi và hợp âm tươi sáng thôi thúc nhún nhảy.',
  },
  {
    id: 'disco',
    name: 'Disco Lớp Học (Disco Dance Party)',
    emoji: '🪩',
    bpm: 128,
    description: 'Nhịp đập 4/4 rộn rã, tiếng hi-hat giòn tan và giai điệu tươi tắn bắt tai.',
  },
  {
    id: 'arcade',
    name: 'Arcade Vui Nhộn (Chiptune 8-Bit)',
    emoji: '🎮',
    bpm: 136,
    description: 'Giai điệu điện tử 8-bit ngộ nghĩnh, dồn dập như trong các game Mario, Sonic.',
  },
  {
    id: 'drums',
    name: 'Trống Trận Khởi Động (Marching Drums)',
    emoji: '🥁',
    bpm: 132,
    description: 'Dàn trống diễu hành dồn dập kết hợp tiếng hô nhịp hào hùng như hội thao.',
  },
  {
    id: 'edm',
    name: 'Kids EDM Party (Dance Electronic)',
    emoji: '⚡',
    bpm: 130,
    description: 'Âm hưởng nhạc nhảy điện tử sôi động, âm bass nảy và tiết tấu dâng trào.',
  },
  {
    id: 'custom',
    name: 'Tự Tải Lên (File Âm Thanh Riêng)',
    emoji: '📁',
    bpm: 120,
    description: 'Sử dụng bài hát MP3/WAV vui nhộn của riêng thầy/cô hoặc lớp học.',
  },
];

// Web Audio API Synthesizer for educational classroom game
class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private noiseBuffer: AudioBuffer | null = null;

  // Music Engine State
  private isMusicPlaying: boolean = false;
  private musicGainNode: GainNode | null = null;
  private musicSchedulerTimer: NodeJS.Timeout | null = null;
  private currentMusicStep: number = 0;
  private nextStepTime: number = 0;
  private activeMusicTrack: MusicTrackId = 'funk';
  private customAudioElem: HTMLAudioElement | null = null;

  constructor() {
    // Lazy initialize AudioContext on user interaction
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopMoveMusic();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public isMusicActive(): boolean {
    return this.isMusicPlaying;
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private getNoiseBuffer(): AudioBuffer | null {
    const ctx = this.getContext();
    if (!ctx) return null;
    if (!this.noiseBuffer) {
      const bufferSize = ctx.sampleRate * 0.5; // 0.5s white noise
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }

  // Generic tone helper
  public playTone(freq: number, type: OscillatorType, duration: number, gainVal: number = 0.2) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context error handling
    }
  }

  // ==========================================
  // DYNAMIC MOVE MUSIC ENGINE (Web Audio API)
  // ==========================================

  /**
   * Starts playing continuous rhythmic movement music.
   * Runs during the MOVE state and stops abruptly on FREEZE!
   */
  public startMoveMusic(
    trackId: MusicTrackId = 'funk',
    volumePercent: number = 80,
    customUrl?: string
  ) {
    this.stopMoveMusic();
    if (!this.enabled) return;

    this.activeMusicTrack = trackId;
    const vol = Math.max(0, Math.min(1, volumePercent / 100));

    // Custom audio track fallback
    if (trackId === 'custom' && customUrl) {
      try {
        this.customAudioElem = new Audio(customUrl);
        this.customAudioElem.loop = true;
        this.customAudioElem.volume = vol;
        this.customAudioElem.play().catch(() => {
          // If browser blocked custom audio, fallback to synth
          this.startMoveMusic('funk', volumePercent);
        });
        this.isMusicPlaying = true;
        return;
      } catch {
        this.startMoveMusic('funk', volumePercent);
        return;
      }
    }

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      this.musicGainNode = ctx.createGain();
      this.musicGainNode.gain.setValueAtTime(vol * 0.4, ctx.currentTime);
      this.musicGainNode.connect(ctx.destination);

      const meta = MUSIC_TRACKS.find((t) => t.id === trackId) || MUSIC_TRACKS[0];
      const bpm = meta.bpm;
      const stepDuration = (60 / bpm) / 4; // 16th note step in seconds

      this.currentMusicStep = 0;
      this.nextStepTime = ctx.currentTime + 0.05;
      this.isMusicPlaying = true;

      // Lookahead scheduler loop (runs every 25ms to schedule Web Audio events ahead)
      this.musicSchedulerTimer = setInterval(() => {
        if (!this.isMusicPlaying || !this.ctx || !this.musicGainNode) return;

        const scheduleAhead = 0.12; // schedule 120ms ahead
        while (this.nextStepTime < this.ctx.currentTime + scheduleAhead) {
          this.scheduleTrackStep(trackId, this.currentMusicStep, this.nextStepTime);
          this.nextStepTime += stepDuration;
          this.currentMusicStep = (this.currentMusicStep + 1) % 32; // 2 bars of 16 steps
        }
      }, 25);
    } catch {
      // Audio start error
    }
  }

  /**
   * Stops movement music instantly (crucial for FREEZE effect).
   */
  public stopMoveMusic() {
    this.isMusicPlaying = false;

    if (this.musicSchedulerTimer) {
      clearInterval(this.musicSchedulerTimer);
      this.musicSchedulerTimer = null;
    }

    if (this.customAudioElem) {
      try {
        this.customAudioElem.pause();
        this.customAudioElem.currentTime = 0;
      } catch {
        // Safe catch
      }
      this.customAudioElem = null;
    }

    if (this.musicGainNode && this.ctx && this.ctx.state !== 'closed') {
      try {
        const curGain = this.musicGainNode.gain.value;
        this.musicGainNode.gain.setValueAtTime(curGain, this.ctx.currentTime);
        // Instant tight fadeout in 0.02s to prevent pop/click
        this.musicGainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.02);
        const nodeToDisconnect = this.musicGainNode;
        setTimeout(() => {
          try {
            nodeToDisconnect.disconnect();
          } catch {
            // Already disconnected
          }
        }, 30);
      } catch {
        // Safe catch
      }
      this.musicGainNode = null;
    }
  }

  // --- Web Audio Track Instruments ---

  private playKick(time: number, pitch: number = 150, decay: number = 0.15, gainVal: number = 0.9) {
    if (!this.ctx || !this.musicGainNode) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, time);
      osc.frequency.exponentialRampToValueAtTime(38, time + decay);

      gain.gain.setValueAtTime(gainVal, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

      osc.connect(gain);
      gain.connect(this.musicGainNode);

      osc.start(time);
      osc.stop(time + decay + 0.01);
    } catch {
      // Safe catch
    }
  }

  private playSnare(time: number, isClap: boolean = false, gainVal: number = 0.6) {
    if (!this.ctx || !this.musicGainNode) return;
    try {
      const noise = this.getNoiseBuffer();
      if (!noise) return;

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = noise;

      const filter = this.ctx.createBiquadFilter();
      filter.type = isClap ? 'bandpass' : 'highpass';
      filter.frequency.setValueAtTime(isClap ? 1200 : 1500, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(gainVal, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + (isClap ? 0.2 : 0.16));

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGainNode);

      // Body tone for snare
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, time);
      osc.frequency.exponentialRampToValueAtTime(70, time + 0.1);
      oscGain.gain.setValueAtTime(0.4, time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

      osc.connect(oscGain);
      oscGain.connect(this.musicGainNode);

      noiseNode.start(time);
      noiseNode.stop(time + 0.2);
      osc.start(time);
      osc.stop(time + 0.12);
    } catch {
      // Safe catch
    }
  }

  private playHiHat(time: number, isOpen: boolean = false, gainVal: number = 0.3) {
    if (!this.ctx || !this.musicGainNode) return;
    try {
      const noise = this.getNoiseBuffer();
      if (!noise) return;

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = noise;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7500, time);

      const gain = this.ctx.createGain();
      const duration = isOpen ? 0.18 : 0.045;
      gain.gain.setValueAtTime(gainVal, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGainNode);

      noiseNode.start(time);
      noiseNode.stop(time + duration + 0.02);
    } catch {
      // Safe catch
    }
  }

  private playSynthNote(
    time: number,
    freq: number,
    duration: number,
    type: OscillatorType = 'sawtooth',
    cutoff: number = 1200,
    gainVal: number = 0.35
  ) {
    if (!this.ctx || !this.musicGainNode) return;
    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cutoff, time);
      filter.frequency.exponentialRampToValueAtTime(cutoff * 0.4, time + duration);
      filter.Q.setValueAtTime(3, time);

      gain.gain.setValueAtTime(gainVal, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGainNode);

      osc.start(time);
      osc.stop(time + duration + 0.02);
    } catch {
      // Safe catch
    }
  }

  private playChord(
    time: number,
    frequencies: number[],
    duration: number,
    type: OscillatorType = 'sawtooth',
    gainVal: number = 0.15
  ) {
    frequencies.forEach((f) => {
      this.playSynthNote(time, f, duration, type, 1800, gainVal);
    });
  }

  /**
   * Schedules one step of the selected musical style
   */
  private scheduleTrackStep(trackId: MusicTrackId, step: number, time: number) {
    const bar = Math.floor(step / 16); // 0 or 1
    const stepInBar = step % 16; // 0 to 15

    switch (trackId) {
      case 'disco':
        this.scheduleDiscoStep(stepInBar, bar, time);
        break;
      case 'arcade':
        this.scheduleArcadeStep(stepInBar, bar, time);
        break;
      case 'drums':
        this.scheduleDrumsStep(stepInBar, bar, time);
        break;
      case 'edm':
        this.scheduleEdmStep(stepInBar, bar, time);
        break;
      case 'funk':
      default:
        this.scheduleFunkStep(stepInBar, bar, time);
        break;
    }
  }

  // 1. FUNK GROOVE
  private scheduleFunkStep(step: number, bar: number, time: number) {
    // Kicks
    if (step === 0 || step === 8 || step === 10 || (bar === 1 && step === 14)) {
      this.playKick(time, 140, 0.18, 0.85);
    }
    // Snares
    if (step === 4 || step === 12) {
      this.playSnare(time, false, 0.65);
    }
    // Hi-Hats (groove 16th swing)
    if (step % 2 === 0) {
      this.playHiHat(time, step === 2 || step === 10, step % 4 === 0 ? 0.25 : 0.4);
    }

    // Slap Bass Notes
    const bassC = [65.4, 77.8, 87.3, 98.0, 116.5, 130.8]; // C2, Eb2, F2, G2, Bb2, C3
    const bassF = [87.3, 103.8, 116.5, 130.8, 155.6, 174.6]; // F2, Ab2, Bb2, C3, Eb3, F3
    const bassPool = bar === 0 ? bassC : bassF;

    if (step === 0) this.playSynthNote(time, bassPool[0], 0.12, 'sawtooth', 800, 0.4);
    if (step === 3) this.playSynthNote(time, bassPool[0], 0.1, 'sawtooth', 700, 0.35);
    if (step === 6) this.playSynthNote(time, bassPool[1], 0.12, 'sawtooth', 900, 0.4);
    if (step === 8) this.playSynthNote(time, bassPool[2], 0.12, 'sawtooth', 950, 0.4);
    if (step === 10) this.playSynthNote(time, bassPool[3], 0.15, 'sawtooth', 1000, 0.45);
    if (step === 12) this.playSynthNote(time, bassPool[4], 0.1, 'sawtooth', 900, 0.4);
    if (step === 14) this.playSynthNote(time, bassPool[5], 0.18, 'sawtooth', 1100, 0.45);

    // Brass/Horn Stabs
    if (step === 4) {
      this.playChord(time, [261.63, 329.63, 392.0], 0.12, 'triangle', 0.25); // C Major
    }
    if (step === 7) {
      this.playChord(time, [261.63, 329.63, 392.0], 0.09, 'triangle', 0.2);
    }
    if (step === 12) {
      this.playChord(time, [349.23, 440.0, 523.25], 0.14, 'triangle', 0.25); // F Major
    }
    if (step === 15 && bar === 1) {
      this.playChord(time, [392.0, 493.88, 587.33], 0.16, 'triangle', 0.3); // G Major turnaround
    }
  }

  // 2. DISCO PARTY
  private scheduleDiscoStep(step: number, bar: number, time: number) {
    // Four on the floor kick
    if (step % 4 === 0) {
      this.playKick(time, 150, 0.16, 0.9);
    }
    // Snare / Clap on 2 and 4
    if (step === 4 || step === 12) {
      this.playSnare(time, true, 0.7);
    }
    // Open Hi-hat on the off-beat "and"
    if (step % 4 === 2) {
      this.playHiHat(time, true, 0.45);
    } else if (step % 2 === 0) {
      this.playHiHat(time, false, 0.2);
    }

    // Disco Octave Bassline
    const root = bar === 0 ? 65.41 : 87.31; // C2 then F2
    const octave = bar === 0 ? 130.81 : 174.61; // C3 then F3
    if (step % 4 === 0) {
      this.playSynthNote(time, root, 0.1, 'sawtooth', 600, 0.45);
    } else if (step % 4 === 2) {
      this.playSynthNote(time, octave, 0.12, 'sawtooth', 750, 0.45);
    }

    // Sparkling synth arpeggios
    const notes = bar === 0 
      ? [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
      : [698.46, 880.00, 1046.50, 1396.91]; // F5, A5, C6, F6
    const note = notes[step % 4];
    this.playSynthNote(time, note, 0.08, 'triangle', 1800, 0.15);
  }

  // 3. RETRO ARCADE (Chiptune 8-Bit)
  private scheduleArcadeStep(step: number, bar: number, time: number) {
    // 8-bit Noise Drums
    if (step === 0 || step === 8 || step === 10) {
      this.playKick(time, 180, 0.08, 0.8);
    }
    if (step === 4 || step === 12) {
      this.playSnare(time, false, 0.5);
    }
    if (step % 2 === 0) {
      this.playHiHat(time, false, 0.2);
    }

    // 8-bit Square Melodic Lead
    const melA = [523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 523.25];
    const melB = [880.0, 783.99, 659.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const melody = bar === 0 ? melA : melB;
    const currentNote = melody[Math.floor(step / 2)];

    if (step % 2 === 0) {
      this.playSynthNote(time, currentNote, 0.08, 'square', 2400, 0.25);
    }

    // Bouncy Triangle Bass
    if (step % 4 === 0) {
      const bassFreq = bar === 0 ? 130.81 : 164.81;
      this.playSynthNote(time, bassFreq, 0.12, 'triangle', 1000, 0.4);
    }
  }

  // 4. MARCHING DRUMS & BRASS
  private scheduleDrumsStep(step: number, bar: number, time: number) {
    // Big taiko / orchestral kicks
    if (step === 0 || step === 3 || step === 6 || step === 8 || step === 11 || step === 14) {
      this.playKick(time, 120, 0.22, 0.95);
    }

    // Marching Snare rolls
    if (step === 4 || step === 5 || step === 12 || step === 13 || step === 14 || step === 15) {
      this.playSnare(time, false, step % 2 === 0 ? 0.7 : 0.4);
    }

    // Crash Cymbal on bar start
    if (step === 0 && bar === 0) {
      this.playHiHat(time, true, 0.6);
    }

    // Fanfare Brass Stabs
    if (step === 0) {
      this.playChord(time, [392.0, 523.25, 659.25], 0.25, 'sawtooth', 0.25);
    }
    if (step === 6) {
      this.playChord(time, [392.0, 523.25, 659.25], 0.18, 'sawtooth', 0.22);
    }
    if (step === 8) {
      this.playChord(time, [440.0, 587.33, 698.46], 0.25, 'sawtooth', 0.25);
    }
  }

  // 5. KIDS EDM PARTY
  private scheduleEdmStep(step: number, bar: number, time: number) {
    // Four on the floor punchy kick
    if (step % 4 === 0) {
      this.playKick(time, 160, 0.15, 0.95);
    }
    // Snare / Clap on 4 and 12
    if (step === 4 || step === 12) {
      this.playSnare(time, true, 0.75);
    }
    // Offbeat open hi-hat
    if (step % 4 === 2) {
      this.playHiHat(time, true, 0.4);
    }

    // Pumping EDM Saw Stabs on step 0, 3, 6, 8, 11, 14
    if ([0, 3, 6, 8, 11, 14].includes(step)) {
      const chordA = [261.63, 329.63, 392.0, 523.25]; // C
      const chordB = [220.0, 261.63, 329.63, 440.0]; // Am
      const chord = bar === 0 ? chordA : chordB;
      this.playChord(time, chord, 0.12, 'sawtooth', 0.25);
    }

    // Deep sub-bass pulse
    if (step % 4 === 0) {
      const sub = bar === 0 ? 65.41 : 55.0;
      this.playSynthNote(time, sub, 0.18, 'sine', 400, 0.5);
    }
  }

  // ==========================================
  // SFX (START, FREEZE, WINNER, ANSWER, ETC.)
  // ==========================================

  // 1. START GAME: Upbeat brass-like chord fanfare
  public playStart() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.2, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.45);
    });
  }

  // 2. MOVE: Single beat tick (used if music is disabled)
  public playMoveBeat() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Kick sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);

    // High energetic synth blip
    setTimeout(() => {
      this.playTone(587.33, 'square', 0.08, 0.1); // D5
    }, 150);
  }

  // 3. FREEZE: Crystal ice crackle & sudden high brake
  public playFreeze() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Ice sparkle notes
    [880, 1174.66, 1760, 2349.32].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.25, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.65);
    });
  }

  // 4. SCANNING: Radar sonar ping
  public playScanPing() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(1200, now + 0.12);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  // 5. RANDOM PICK: Arcade wheel tick
  public playPickTick(pitchMultiplier: number = 1.0) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440 * pitchMultiplier, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  // 6. WINNER: Victory fanfare chords & cheering brass
  public playWinnerFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const sequence = [
      { freq: 392.0, time: 0, dur: 0.15 },
      { freq: 523.25, time: 0.15, dur: 0.15 },
      { freq: 659.25, time: 0.3, dur: 0.15 },
      { freq: 783.99, time: 0.45, dur: 0.7 },
      { freq: 1046.5, time: 0.45, dur: 0.7 }, // C6 harmony
    ];

    sequence.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + time);
      gain.gain.setValueAtTime(0.25, now + time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + time);
      osc.stop(now + time + dur + 0.05);
    });
  }

  // 7. CORRECT ANSWER: Bright high cheerful arpeggio
  public playCorrect() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.25, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.4);
    });
  }

  // 8. WRONG ANSWER: Low playful buzzer
  public playWrong() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(140, now);
    osc2.frequency.setValueAtTime(135, now); // Dissonant beat

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  }

  // 9. COUNTDOWN BEEP
  public playCountdownTick(isFinal: boolean = false) {
    if (isFinal) {
      this.playTone(880, 'sine', 0.25, 0.3); // High A5
    } else {
      this.playTone(440, 'sine', 0.1, 0.2); // Normal A4
    }
  }

  // 10. END GAME PODIUM
  public playEndGame() {
    this.playWinnerFanfare();
    setTimeout(() => {
      this.playCorrect();
    }, 600);
  }
}

export const soundFx = new SoundSynthesizer();
