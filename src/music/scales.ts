export interface ScaleDefinition {
  id: string;
  name: string;
  intervals: number[];
}

export interface Tonic {
  name: string;
  pitchClass: number;
  midi: number;
}

export const SCALES: ScaleDefinition[] = [
  { id: 'major', name: 'Maior', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'natural-minor', name: 'Menor natural', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'harmonic-minor', name: 'Menor harmônica', intervals: [0, 2, 3, 5, 7, 8, 11] },
  { id: 'major-pentatonic', name: 'Pentatônica maior', intervals: [0, 2, 4, 7, 9] },
  { id: 'minor-pentatonic', name: 'Pentatônica menor', intervals: [0, 3, 5, 7, 10] },
  { id: 'chromatic', name: 'Cromática', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
];

const TONIC_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const TONICS: Tonic[] = TONIC_NAMES.map((name, pitchClass) => ({
  name,
  pitchClass,
  midi: pitchClass >= 10 ? 36 + pitchClass : 48 + pitchClass,
}));

export function findTonic(name: string): Tonic {
  return TONICS.find((tonic) => tonic.name === name) ?? TONICS[10];
}

export function findScale(id: string): ScaleDefinition {
  return SCALES.find((scale) => scale.id === id) ?? SCALES[0];
}

export function buildScaleNotes(tonic: Tonic, scale: ScaleDefinition): number[] {
  const ascending = [...scale.intervals.map((interval) => tonic.midi + interval), tonic.midi + 12];
  const descending = ascending.slice(0, -1).reverse();
  const octaveIndex = ascending.length - 1;
  const fifthIndex = Math.min(4, ascending.length - 2);
  const thirdIndex = Math.min(2, fifthIndex);
  const arpeggioIndexes = [0, thirdIndex, fifthIndex, octaveIndex, fifthIndex, thirdIndex, 0];
  const arpeggio = arpeggioIndexes.map((index) => ascending[index]);

  return [...ascending, ...descending, ...arpeggio];
}

export function scalePitchClasses(tonic: Tonic, scale: ScaleDefinition): number[] {
  return scale.intervals.map((interval) => (tonic.pitchClass + interval) % 12);
}
