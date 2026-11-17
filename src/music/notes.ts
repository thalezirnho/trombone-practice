export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const FLAT_STAFF_STEPS = [0, 1, 1, 2, 2, 3, 4, 4, 5, 5, 6, 6];
const SHARP_STAFF_STEPS = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function frequencyToMidiFloat(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / 440);
}

export function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12;
}

export function midiToName(midi: number, useFlats = true): string {
  const names = useFlats ? FLAT_NAMES : SHARP_NAMES;
  const octave = Math.floor(midi / 12) - 1;
  return `${names[pitchClass(midi)]}${octave}`;
}

export interface StaffPosition {
  step: number;
  accidental: 'flat' | 'sharp' | null;
}

export function getStaffPosition(midi: number, useFlats = true): StaffPosition {
  const pc = pitchClass(midi);
  const octave = Math.floor(midi / 12) - 1;
  const steps = useFlats ? FLAT_STAFF_STEPS : SHARP_STAFF_STEPS;
  const name = useFlats ? FLAT_NAMES[pc] : SHARP_NAMES[pc];
  const accidental: StaffPosition['accidental'] = name.includes('b')
    ? 'flat'
    : name.includes('#')
      ? 'sharp'
      : null;

  return { step: octave * 7 + steps[pc], accidental };
}
