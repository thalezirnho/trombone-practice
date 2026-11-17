import { scalePitchClasses, type ScaleDefinition, type Tonic } from './scales';

export interface MelodyNote {
  midi: number;
  beats: number;
}

export function generateMelody(tonic: Tonic, scale: ScaleDefinition, count = 16): MelodyNote[] {
  const pitchClasses = scalePitchClasses(tonic, scale);
  const pool: number[] = [];

  for (let octave = 2; octave <= 4; octave++) {
    for (const pitchClass of pitchClasses) {
      const midi = 12 * (octave + 1) + pitchClass;
      if (midi >= 43 && midi <= 67) pool.push(midi);
    }
  }

  pool.sort((a, b) => a - b);
  if (pool.length === 0) pool.push(tonic.midi);

  let index = Math.max(
    0,
    pool.findIndex((midi) => midi === tonic.midi),
  );
  const melody: MelodyNote[] = [];

  for (let i = 0; i < count; i++) {
    const step = Math.round(Math.random() * 4) - 2;
    index = Math.min(pool.length - 1, Math.max(0, index + step));
    melody.push({ midi: pool[index], beats: i > 0 && i % 5 === 4 ? 2 : 1 });
  }

  return melody;
}
