import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContext, playClick, playTone, resumeAudio } from '../audio/context';
import type { PitchDetector } from '../audio/usePitchDetection';
import { Metronome } from '../components/Metronome';
import { Staff } from '../components/Staff';
import { useAnimationClock } from '../hooks/useAnimationClock';
import { getKeySignature } from '../music/keySignature';
import { generateMelody, type MelodyNote } from '../music/melody';
import { midiToName } from '../music/notes';
import { findScale, findTonic, SCALES, TONICS } from '../music/scales';
import type { ExerciseSettings, ScoreNote } from '../types';
import {
  buildScoreNotes,
  countResults,
  evaluateDueNotes,
  LEAD_IN_BEATS,
  ROUND_GAP_BEATS,
} from './helpers';

interface SightReadingProps {
  settings: ExerciseSettings;
  detector: PitchDetector;
}

export function SightReading({ settings, detector }: SightReadingProps) {
  const { bpm, showNoteNames, useFlats } = settings;
  const [tonicName, setTonicName] = useState('Bb');
  const [scaleId, setScaleId] = useState('major');
  const tonic = findTonic(tonicName);
  const scale = findScale(scaleId);
  const keySignature = getKeySignature(tonic, scale);
  const displayUseFlats =
    keySignature.type === 'sharp' ? false : keySignature.type === 'flat' ? true : useFlats;
  const [melody, setMelody] = useState<MelodyNote[]>(() =>
    generateMelody(findTonic('Bb'), findScale('major')),
  );
  const [round, setRound] = useState(0);
  const [running, setRunning] = useState(false);
  const [guideSound, setGuideSound] = useState(false);
  const [startTime, setStartTime] = useState(() => performance.now() / 1000);
  const [notes, setNotes] = useState<ScoreNote[]>([]);

  const notesRef = useRef(notes);
  const startTimeRef = useRef(startTime);
  const guideSoundRef = useRef(guideSound);
  const guidePlayedRef = useRef(new Set<string>());
  const evaluatedRef = useRef(new Set<string>());
  const endTimeRef = useRef(0);
  const lastBeatRef = useRef(-1);
  const generatingRef = useRef(false);

  notesRef.current = notes;
  startTimeRef.current = startTime;
  guideSoundRef.current = guideSound;

  useEffect(() => {
    const built = buildScoreNotes(melody, bpm, startTime, `leitura-${round}`);
    const last = built[built.length - 1];
    setNotes(built);
    endTimeRef.current = last ? last.time + last.duration : startTime;
    evaluatedRef.current = new Set();
    guidePlayedRef.current = new Set();
    generatingRef.current = false;
  }, [melody, bpm, round, startTime]);

  const onFrame = useCallback(
    (now: number) => {
      const currentNotes = notesRef.current;
      if (currentNotes.length === 0) return;

      evaluateDueNotes(
        currentNotes,
        now,
        detector.eventsRef.current,
        evaluatedRef.current,
        (id, result, detectedMidi) => {
          setNotes((previous) =>
            previous.map((note) => (note.id === id ? { ...note, result, detectedMidi } : note)),
          );
        },
      );

      if (guideSoundRef.current) {
        const context = getAudioContext();
        for (const note of currentNotes) {
          if (guidePlayedRef.current.has(note.id) || now < note.time - 0.01) continue;
          guidePlayedRef.current.add(note.id);
          playTone(
            note.midi,
            context.currentTime + 0.01,
            Math.min(note.duration * 0.85, 0.5),
            0.1,
          );
        }
      }

      const beat = Math.floor(Math.max(0, now - startTimeRef.current) / (60 / bpm));
      if (beat !== lastBeatRef.current) {
        lastBeatRef.current = beat;
        playClick(beat % 4 === 0);
      }

      if (
        now > endTimeRef.current + (ROUND_GAP_BEATS * 60) / bpm &&
        !generatingRef.current
      ) {
        generatingRef.current = true;
        setMelody(generateMelody(findTonic(tonicName), findScale(scaleId)));
        setRound((value) => value + 1);
        setStartTime(now);
        setNotes([]);
        detector.clearEvents();
      }
    },
    [bpm, detector, scaleId, tonicName],
  );

  const now = useAnimationClock(running, onFrame);
  const totals = countResults(notes);

  const startExercise = async () => {
    await detector.start();
    await resumeAudio();
    detector.clearEvents();
    lastBeatRef.current = -1;
    setStartTime(performance.now() / 1000);
    setRunning(true);
  };

  const stopExercise = () => {
    setRunning(false);
    detector.stop();
    guidePlayedRef.current.clear();
  };

  const newScore = () => {
    detector.clearEvents();
    lastBeatRef.current = -1;
    setMelody(generateMelody(findTonic(tonicName), findScale(scaleId)));
    setRound((value) => value + 1);
    setStartTime(performance.now() / 1000);
  };

  const toggleGuideSound = (enabled: boolean) => {
    if (enabled && running) {
      const currentTime = performance.now() / 1000;
      for (const note of notesRef.current) {
        if (note.time <= currentTime + 0.05) guidePlayedRef.current.add(note.id);
      }
    }
    setGuideSound(enabled);
  };

  return (
    <div className="exercise-grid">
      <section className="panel controls-panel">
        <h2>Leitura de partitura</h2>
        <p className="muted">
          A partitura rola da direita para a esquerda. Toque a nota quando ela cruzar a linha laranja.
        </p>

        <label className="field">
          <span>Tonalidade</span>
          <select value={tonicName} disabled={running} onChange={(event) => setTonicName(event.target.value)}>
            {TONICS.map((tonic) => (
              <option key={tonic.name} value={tonic.name}>
                {tonic.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Escala</span>
          <select value={scaleId} disabled={running} onChange={(event) => setScaleId(event.target.value)}>
            {SCALES.map((scale) => (
              <option key={scale.id} value={scale.id}>
                {scale.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field guide-field">
          <span className="check-row">
            <input
              type="checkbox"
              checked={guideSound}
              onChange={(event) => toggleGuideSound(event.target.checked)}
            />
            Tocar nota correta (som guia)
          </span>
          <small className="muted">
            A nota soa ao cruzar a linha laranja. Use fones para o microfone não captar o som.
          </small>
        </label>

        <button className="button secondary" type="button" onClick={newScore}>
          Gerar nova partitura
        </button>

        {running ? (
          <button className="button danger" type="button" onClick={stopExercise}>
            Parar
          </button>
        ) : (
          <button className="button primary" type="button" onClick={startExercise}>
            Começar exercício
          </button>
        )}

        <div className="result-box">
          <div>
            <strong className="ok">{totals.correct}</strong>
            <span>corretas</span>
          </div>
          <div>
            <strong className="bad">{totals.wrong}</strong>
            <span>erradas</span>
          </div>
          <div>
            <strong className="warn">{totals.missed}</strong>
            <span>não tocadas</span>
          </div>
        </div>
      </section>

      <section className="panel score-panel">
        <div className="panel-header">
          <div>
            <h3>Partitura em movimento</h3>
            <span className="muted">
              Compasso 4/4 · {tonic.name} {scale.name.toLowerCase()} · {keySignature.label} ·{' '}
              {LEAD_IN_BEATS} tempos de preparação
            </span>
          </div>
          <Metronome bpm={bpm} now={now} startTime={startTime} active={running} />
        </div>

        <Staff
          notes={notes}
          currentTime={running ? now : startTime}
          showNoteNames={showNoteNames}
          useFlats={displayUseFlats}
          keySignature={keySignature}
        />

        <div className="legend">
          <span><i className="legend-dot ok-dot" /> correta</span>
          <span><i className="legend-dot bad-dot" /> errada (mostrada como esperada / tocada)</span>
          <span><i className="legend-dot warn-dot" /> não tocada</span>
        </div>
      </section>

      <section className="panel feedback-panel">
        <h3>Últimas notas</h3>
        {notes.filter((note) => note.result).length === 0 ? (
          <p className="muted">Os resultados aparecerão aqui enquanto você toca.</p>
        ) : (
          <ul className="note-list">
            {notes
              .filter((note) => note.result)
              .slice(-8)
              .reverse()
              .map((note) => (
                <li key={note.id} className={`note-item ${note.result}`}>
                  <span>{midiToName(note.midi, displayUseFlats)}</span>
                  <small>
                    {note.result === 'correct'
                      ? 'correta'
                      : note.result === 'wrong' && note.detectedMidi !== undefined
                        ? `tocou ${midiToName(note.detectedMidi, displayUseFlats)}`
                        : 'não tocada'}
                  </small>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
