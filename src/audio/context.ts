let context: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!context) {
    context = new AudioContext({ latencyHint: 'interactive' });
  }
  return context;
}

export async function resumeAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}

export function playClick(accent = false): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(accent ? 1320 : 880, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(accent ? 0.12 : 0.07, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

export function playTone(midi: number, startTime: number, duration: number, volume = 0.16): void {
  const ctx = getAudioContext();
  const frequency = 440 * Math.pow(2, (midi - 69) / 12);
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(frequency, startTime);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(2200, frequency * 4), startTime);
  filter.Q.setValueAtTime(0.8, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.07);
  gain.gain.setValueAtTime(volume, startTime + Math.max(0.1, duration - 0.12));
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}
