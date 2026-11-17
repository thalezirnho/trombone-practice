export type NoteResult = 'correct' | 'wrong' | 'missed';

export interface ScoreNote {
  id: string;
  midi: number;
  time: number;
  duration: number;
  result?: NoteResult;
  detectedMidi?: number;
}

export interface NoteEvent {
  midi: number | null;
  time: number;
}

export interface DetectedNote {
  midi: number;
  frequency: number;
  cents: number;
  confidence: number;
  time: number;
}

export type MicStatus = 'idle' | 'requesting' | 'ready' | 'error';

export interface ExerciseSettings {
  bpm: number;
  showNoteNames: boolean;
  useFlats: boolean;
  sensitivity: number;
}
