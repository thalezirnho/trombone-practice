import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAudioContext, playClick, playTone, resumeAudio } from '../audio/context';
import type { PitchDetector } from '../audio/usePitchDetection';
import { Metronome } from '../components/Metronome';
import { Staff } from '../components/Staff';
import { useAnimationClock } from '../hooks/useAnimationClock';
import { getKeySignature } from '../music/keySignature';
import { midiToName } from '../music/notes';
import { buildScaleNotes, findScale, findTonic, SCALES, TONICS } from '../music/scales';
import type { ExerciseSettings, ScoreNote } from '../types';
import {
  buildScoreNotes,
  countResults,
  evaluateDueNotes,
  LEAD_IN_BEATS,
  ROUND_GAP_BEATS,
} from './helpers';

interface ScaleStudyProps {
  settings: ExerciseSettings;
  detector: PitchDetector;
}

export function ScaleStudy({ settings, detector }: ScaleStudyProps) {
  const { bpm, showNoteNames, useFlats } = settings;
  const [tonicName, setTonicName] = useState('Bb');
  const [scaleId, setScaleId] = useState('major');
  const [running, setRunning] = useState(false);
  const [guideSound, setGuideSound] = useState(false);
  const [round, setRound] = useState(0);
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

  const sequence = useMemo(
    () =>
      buildScaleNotes(findTonic(tonicName), findScale(scaleId)).map((midi) => ({
        midi,
        beats: 1,
      })),
    [tonicName, scaleId],
  );

  useEffect(() => {
    const built = buildScoreNotes(sequence, bpm, startTime, `escala-${round}`);
    const last = built[built.length - 1];
    setNotes(built);
    endTimeRef.current = last ? last.time + last.duration : startTime;
    evaluatedRef.current = new Set();
    guidePlayedRef.current = new Set();
    generatingRef.current = false;
  }, [sequence, bpm, round, startTime]);

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
        detector.clearEvents();
        setRound((value) => value + 1);
        setStartTime(now);
        setNotes([]);
      }
    },
    [bpm, detector],
  );

  const now = useAnimationClock(running, onFrame);
  const totals = countResults(notes);
  const tonic = findTonic(tonicName);
  const scale = findScale(scaleId);
  const keySignature = getKeySignature(tonic, scale);
  const displayUseFlats =
    keySignature.type === 'sharp' ? false : keySignature.type === 'flat' ? true : useFlats;

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

  const restart = () => {
    detector.clearEvents();
    lastBeatRef.current = -1;
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
        <h2>Estudo de escala</h2>
        <p className="muted">
          Suba a escala, toque a oitava, desça e depois faça o arpejo indo e voltando.
        </p>

        <label className="field">
          <span>Tônica</span>
          <select value={tonicName} disabled={running} onChange={(event) => setTonicName(event.target.value)}>
            {TONICS.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Escala</span>
          <select value={scaleId} disabled={running} onChange={(event) => setScaleId(event.target.value)}>
            {SCALES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
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

        {running ? (
          <button className="button danger" type="button" onClick={stopExercise}>
            Parar
          </button>
        ) : (
          <button className="button primary" type="button" onClick={startExercise}>
            Começar escala
          </button>
        )}

        <button className="button secondary" type="button" onClick={restart}>
          Reiniciar sequência
        </button>

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
            <h3>
              {tonic.name} {scale.name.toLowerCase()}
            </h3>
            <span className="muted">
              Repetição {round + 1} · uma nota por tempo · {keySignature.label} · {LEAD_IN_BEATS}{' '}
              tempos de preparação
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

        <div className="sequence-strip" aria-label="Sequência da escala">
          {notes.map((note, index) => (
            <span
              key={note.id}
              className={`sequence-note ${note.result ?? 'pending'} ${
                running && Math.abs(note.time - now) < 0.35 ? 'current' : ''
              }`}
              title={`${index + 1}: ${midiToName(note.midi, displayUseFlats)}`}
            >
              {showNoteNames ? midiToName(note.midi, displayUseFlats).replace(/\d+$/, '') : '·'}
            </span>
          ))}
        </div>

        <div className="legend">
          <span><i className="legend-dot ok-dot" /> correta</span>
          <span><i className="legend-dot bad-dot" /> errada</span>
          <span><i className="legend-dot warn-dot" /> não tocada</span>
        </div>
      </section>

      <section className="panel feedback-panel">
        <h3>Como estudar</h3>
        <ol className="tips">
          <li>Acompanhe a bolha do metrônomo e a linha laranja.</li>
          <li>Toque sempre no tempo, sem correr atrás da nota.</li>
          <li>Se errar, a nota errada fica vermelha e mostra o que foi tocado na legenda da partitura.</li>
          <li>Ative ou desative os nomes das notas no painel superior.</li>
        </ol>
      </section>
    </div>
  );
}
