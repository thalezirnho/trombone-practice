import { pitchClass } from './notes';
import type { ScaleDefinition, Tonic } from './scales';

export type AccidentalType = 'sharp' | 'flat';

export interface KeyAccidental {
  letter: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';
  type: AccidentalType;
  step: number;
}

export interface KeySignature {
  type: AccidentalType | null;
  count: number;
  accidentals: KeyAccidental[];
  label: string;
}

interface Signature {
  type: AccidentalType | null;
  count: number;
}

const EMPTY: Signature = { type: null, count: 0 };

const MAJOR: Record<string, Signature> = {
  C: { type: null, count: 0 },
  G: { type: 'sharp', count: 1 },
  D: { type: 'sharp', count: 2 },
  A: { type: 'sharp', count: 3 },
  E: { type: 'sharp', count: 4 },
  B: { type: 'sharp', count: 5 },
  F: { type: 'flat', count: 1 },
  Bb: { type: 'flat', count: 2 },
  Eb: { type: 'flat', count: 3 },
  Ab: { type: 'flat', count: 4 },
  Db: { type: 'flat', count: 5 },
  Gb: { type: 'flat', count: 6 },
};

const MINOR: Record<string, Signature> = {
  C: { type: 'flat', count: 3 },
  Db: { type: 'sharp', count: 4 },
  D: { type: 'flat', count: 1 },
  Eb: { type: 'flat', count: 6 },
  E: { type: 'sharp', count: 1 },
  F: { type: 'flat', count: 4 },
  Gb: { type: 'sharp', count: 6 },
  G: { type: 'flat', count: 2 },
  Ab: { type: 'flat', count: 7 },
  A: EMPTY,
  Bb: { type: 'flat', count: 5 },
  B: { type: 'sharp', count: 2 },
};

const SHARP_LETTERS: KeyAccidental['letter'][] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_LETTERS: KeyAccidental['letter'][] = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

const SHARP_STEPS = [6, 3, 7, 4, 8, 5, 9];
const FLAT_STEPS = [2, 5, 1, 4, 0, 3, 6];

const LETTER_PITCH_CLASS: Record<KeyAccidental['letter'], number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function describe(signature: Signature): string {
  if (!signature.type || signature.count === 0) return 'sem acidentes';
  if (signature.type === 'sharp') {
    return signature.count === 1 ? '1 sustenido' : `${signature.count} sustenidos`;
  }
  return signature.count === 1 ? '1 bemol' : `${signature.count} bemóis`;
}

function resolveSignature(tonic: Tonic, scale: ScaleDefinition): Signature {
  switch (scale.id) {
    case 'major':
    case 'major-pentatonic':
      return MAJOR[tonic.name] ?? EMPTY;
    case 'natural-minor':
    case 'harmonic-minor':
    case 'minor-pentatonic':
      return MINOR[tonic.name] ?? EMPTY;
    default:
      return EMPTY;
  }
}

export function getKeySignature(tonic: Tonic, scale: ScaleDefinition): KeySignature {
  const signature = resolveSignature(tonic, scale);

  if (!signature.type || signature.count === 0) {
    return { type: null, count: 0, accidentals: [], label: 'sem acidentes' };
  }

  const letters = signature.type === 'sharp' ? SHARP_LETTERS : FLAT_LETTERS;
  const steps = signature.type === 'sharp' ? SHARP_STEPS : FLAT_STEPS;
  const accidentals = letters.slice(0, signature.count).map((letter, index) => ({
    letter,
    type: signature.type as AccidentalType,
    step: steps[index],
  }));

  return {
    type: signature.type,
    count: signature.count,
    accidentals,
    label: describe(signature),
  };
}

export function isNoteInKeySignature(midi: number, keySignature: KeySignature): boolean {
  const notePitchClass = pitchClass(midi);
  return keySignature.accidentals.some((accidental) => {
    const natural = LETTER_PITCH_CLASS[accidental.letter];
    const altered = (natural + (accidental.type === 'sharp' ? 1 : -1) + 12) % 12;
    return altered === notePitchClass;
  });
}
