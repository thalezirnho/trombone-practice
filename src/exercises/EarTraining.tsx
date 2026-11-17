import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAudioContext, playTone, resumeAudio } from '../audio/context';
import type { PitchDetector } from '../audio/usePitchDetection';
import { midiToName } from '../music/notes';
import type { ExerciseSettings } from '../types';

interface EarTrainingProps {
  settings: ExerciseSettings;
  detector: PitchDetector;
}

type Phase = 'idle' | 'listening' | 'answering' | 'result';
type ResponseMode = 'instrument' | 'buttons';
type Check = boolean | undefined;

const MAX_LEVEL = 6;

function getPool(level: number): number[] {
  if (level <= 2) return [48, 50, 52, 53, 55, 57, 59, 60];
  if (level <= 4) return [46, 48, 50, 51, 53, 55, 57, 58, 60, 62];
  return [43, 45, 46, 48, 50, 51, 53, 55, 57, 58, 60, 62, 64, 65];
}

function generateSequence(level: number): number[] {
  const pool = getPool(level);
  const sequence: number[] = [];

  for (let index = 0; index < level; index++) {
    let candidate = pool[Math.floor(Math.random() * pool.length)];
    while (sequence.includes(candidate) && sequence.length < pool.length) {
      candidate = pool[Math.floor(Math.random() * pool.length)];
    }
    sequence.push(candidate);
  }

  return sequence;
}

export function EarTraining({ settings, detector }: EarTrainingProps) {
  const { showNoteNames, useFlats } = settings;
  const [level, setLevel] = useState(1);
  const [mode, setMode] = useState<ResponseMode>('instrument');
  const [sequence, setSequence] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [responses, setResponses] = useState<number[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);

  const phaseRef = useRef<Phase>('idle');
  const responsesRef = useRef<number[]>([]);
  const lastEventTimeRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const pool = useMemo(() => getPool(level), [level]);

  const changePhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const playSequence = useCallback(async (notes: number[]): Promise<number> => {
    await resumeAudio();
    const context = getAudioContext();
    const noteDuration = 0.55;
    const spacing = 0.8;
    const start = context.currentTime + 0.3;
    notes.forEach((midi, index) => {
      playTone(midi, start + index * spacing, noteDuration);
    });
    return (0.3 + (notes.length - 1) * spacing + noteDuration) * 1000;
  }, []);

  const playSelectedNote = useCallback((midi: number) => {
    void resumeAudio().then(() => {
      playTone(midi, getAudioContext().currentTime + 0.01, 0.4, 0.14);
    });
  }, []);

  const listen = useCallback(
    async (notes: number[]) => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      responsesRef.current = [];
      setResponses([]);
      setChecks([]);
      changePhase('listening');
      const duration = await playSequence(notes);
      timerRef.current = window.setTimeout(() => {
        if (phaseRef.current !== 'listening') return;
        detector.clearEvents();
        const now = performance.now() / 1000;
        lastEventTimeRef.current = now;
        changePhase('answering');
      }, duration);
    },
    [changePhase, detector, playSequence],
  );

  const startRound = useCallback(async () => {
    if (mode === 'instrument') await detector.start();
    const notes = generateSequence(level);
    setSequence(notes);
    await listen(notes);
  }, [detector, level, listen, mode]);

  const finish = useCallback(
    (answers: number[]) => {
      setChecks(sequence.map((midi, index) => answers[index] === midi));
      changePhase('result');
    },
    [changePhase, sequence],
  );

  const registerResponse = useCallback(
    (midi: number) => {
      if (responsesRef.current.length >= sequence.length || phaseRef.current !== 'answering') return;
      const next = [...responsesRef.current, midi];
      responsesRef.current = next;
      setResponses(next);
      if (next.length === sequence.length) finish(next);
    },
    [finish, sequence.length],
  );

  useEffect(() => {
    if (phase !== 'answering' || mode !== 'instrument') return;
    const interval = window.setInterval(() => {
      const freshEvents = detector.eventsRef.current.filter(
        (event) => event.midi !== null && event.time > lastEventTimeRef.current,
      );
      for (const event of freshEvents) {
        lastEventTimeRef.current = event.time;
        if (event.midi !== null) registerResponse(event.midi);
        if (responsesRef.current.length >= sequence.length) break;
      }
    }, 80);
    return () => clearInterval(interval);
  }, [detector, mode, phase, registerResponse, sequence.length]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  const changeLevel = (next: number) => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    setLevel(next);
    setSequence([]);
    setResponses([]);
    responsesRef.current = [];
    setChecks([]);
    changePhase('idle');
  };

  const changeMode = (next: ResponseMode) => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    setMode(next);
    setSequence([]);
    setResponses([]);
    responsesRef.current = [];
    setChecks([]);
    changePhase('idle');
  };

  const phaseLabels: Record<Phase, string> = {
    idle: 'pronto',
    listening: 'ouvindo',
    answering: 'respondendo',
    result: 'resultado',
  };

  const hint = {
    idle: 'Clique em ouvir, identifique as notas e toque de volta ou selecione na tela.',
    listening: 'Ouvindo... não mostramos as notas.',
    answering:
      mode === 'instrument'
        ? 'Toque as notas no trombone na ordem em que ouviu.'
        : 'Selecione as notas na ordem em que ouviu. Você ouvirá cada nota escolhida.',
    result: 'Confira o resultado. A nota tocada aparece quando há erro.',
  }[phase];

  return (
    <div className="exercise-grid">
      <section className="panel controls-panel">
        <h2>Treino de ouvido</h2>
        <p className="muted">{hint}</p>

        <div className="field">
          <span>Dificuldade ({level} {level === 1 ? 'nota' : 'notas'})</span>
          <div className="level-buttons">
            {Array.from({ length: MAX_LEVEL }, (_, index) => index + 1).map((value) => (
              <button
                key={value}
                type="button"
                className={`level-button ${value === level ? 'selected' : ''}`}
                onClick={() => changeLevel(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Como responder</span>
          <div className="segmented">
            <button
              type="button"
              className={mode === 'instrument' ? 'selected' : ''}
              onClick={() => changeMode('instrument')}
            >
              Trombone
            </button>
            <button
              type="button"
              className={mode === 'buttons' ? 'selected' : ''}
              onClick={() => changeMode('buttons')}
            >
              Tela
            </button>
          </div>
        </div>

        <button className="button primary" type="button" onClick={startRound}>
          Ouvir e responder
        </button>

        {sequence.length > 0 && (
          <button className="button secondary" type="button" onClick={() => void listen(sequence)}>
            Repetir som
          </button>
        )}
      </section>

      <section className="panel score-panel">
        <div className="panel-header">
          <div>
            <h3>Sequência oculta</h3>
            <span className="muted">Nível {level} · {sequence.length} notas</span>
          </div>
          <span className={`phase-badge ${phase}`}>{phaseLabels[phase]}</span>
        </div>

        <div className="ear-sequence">
          {sequence.length === 0 ? (
            <p className="muted">A sequência aparecerá aqui somente depois da resposta.</p>
          ) : (
            sequence.map((midi, index) => {
              const state = checks[index];
              return (
                <div
                  key={`${index}-${midi}`}
                  className={`ear-note ${state === true ? 'correct' : state === false ? 'wrong' : ''}`}
                >
                  <span className="ear-note-index">{index + 1}</span>
                  <strong>
                    {phase === 'result'
                      ? showNoteNames
                        ? midiToName(midi, useFlats)
                        : `Nota ${index + 1}`
                      : responses[index] !== undefined
                        ? '•'
                        : '?'}
                  </strong>
                  <small>
                    {state === true
                      ? 'certo'
                      : state === false
                        ? `tocou ${responses[index] !== undefined ? midiToName(responses[index], useFlats) : '—'}`
                        : ''}
                  </small>
                </div>
              );
            })
          )}
        </div>

        {mode === 'buttons' && (
          <div className="note-buttons">
            {pool.map((midi) => (
              <button
                key={midi}
                type="button"
                disabled={phase !== 'answering' || responses.length >= sequence.length}
                onClick={() => {
                  playSelectedNote(midi);
                  registerResponse(midi);
                }}
              >
                {midiToName(midi, useFlats)}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="panel feedback-panel">
        <h3>Resultado</h3>
        {phase === 'result' ? (
          <ul className="note-list">
            {sequence.map((midi, index) => (
              <li key={index} className={`note-item ${checks[index] ? 'correct' : 'wrong'}`}>
                <span>{midiToName(midi, useFlats)}</span>
                <small>
                  {checks[index]
                    ? 'correta'
                    : `você respondeu ${responses[index] !== undefined ? midiToName(responses[index], useFlats) : 'nada'}`}
                </small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            Acertos: {checks.filter(Boolean).length} de {sequence.length || level}
          </p>
        )}
      </section>
    </div>
  );
}
