import type { MelodyNote } from '../music/melody';
import type { NoteEvent, NoteResult, ScoreNote } from '../types';

export const LEAD_IN_BEATS = 4;
export const ROUND_GAP_BEATS = 1;

export function buildScoreNotes(
  melody: MelodyNote[],
  bpm: number,
  startTime: number,
  prefix: string,
): ScoreNote[] {
  const secondsPerBeat = 60 / bpm;
  let cursor = startTime + LEAD_IN_BEATS * secondsPerBeat;

  return melody.map((item, index) => {
    const note: ScoreNote = {
      id: `${prefix}-${index}`,
      midi: item.midi,
      time: cursor,
      duration: item.beats * secondsPerBeat,
    };
    cursor += note.duration;
    return note;
  });
}

export function evaluateDueNotes(
  notes: ScoreNote[],
  now: number,
  events: NoteEvent[],
  evaluated: Set<string>,
  update: (id: string, result: NoteResult, detectedMidi?: number) => void,
): void {
  for (const note of notes) {
    if (evaluated.has(note.id)) continue;
    const deadline = note.time + note.duration + 0.12;
    if (now < deadline) continue;

    evaluated.add(note.id);
    const hits = events
      .filter(
        (event) =>
          event.midi !== null && event.time >= note.time - 0.06 && event.time <= deadline,
      )
      .map((event) => event.midi as number);

    const correct = hits.includes(note.midi);
    const detected = hits.length > 0 ? hits[0] : undefined;
    const result: NoteResult = correct ? 'correct' : detected !== undefined ? 'wrong' : 'missed';
    update(note.id, result, detected);
  }
}

export function countResults(notes: ScoreNote[]): { correct: number; wrong: number; missed: number } {
  return notes.reduce(
    (totals, note) => {
      if (note.result) totals[note.result] += 1;
      return totals;
    },
    { correct: 0, wrong: 0, missed: 0 },
  );
}
