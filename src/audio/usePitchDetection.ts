import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { getAudioContext, resumeAudio } from './context';
import { detectPitch, rootMeanSquare } from './yin';
import { frequencyToMidiFloat } from '../music/notes';
import type { DetectedNote, MicStatus, NoteEvent } from '../types';

interface PendingNote {
  midi: number;
  since: number;
  count: number;
  frequency: number;
  cents: number;
  confidence: number;
}

export interface PitchDetector {
  status: MicStatus;
  error: string | null;
  currentNote: DetectedNote | null;
  eventsRef: RefObject<NoteEvent[]>;
  start: () => Promise<void>;
  stop: () => void;
  clearEvents: () => void;
}

export function usePitchDetection(sensitivity: number): PitchDetector {
  const [status, setStatus] = useState<MicStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentNote, setCurrentNote] = useState<DetectedNote | null>(null);

  const eventsRef = useRef<NoteEvent[]>([]);
  const sensitivityRef = useRef(sensitivity);
  const statusRef = useRef<MicStatus>('idle');
  const mountedRef = useRef(true);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const bufferRef = useRef<Float32Array>(new Float32Array(4096));
  const committedRef = useRef<number | null>(null);
  const pendingRef = useRef<PendingNote | null>(null);

  sensitivityRef.current = sensitivity;

  const tick = useCallback((timestamp: number) => {
    frameRef.current = requestAnimationFrame(tick);
    if (timestamp - lastFrameRef.current < 30) return;
    lastFrameRef.current = timestamp;

    const analyser = analyserRef.current;
    if (!analyser) return;

    const buffer = bufferRef.current;
    analyser.getFloatTimeDomainData(buffer);

    let midi: number | null = null;
    let frequency = 0;
    let cents = 0;
    let confidence = 0;

    if (rootMeanSquare(buffer) >= sensitivityRef.current) {
      const pitch = detectPitch(buffer, analyser.context.sampleRate);
      if (pitch && pitch.confidence >= 0.6) {
        const midiFloat = frequencyToMidiFloat(pitch.frequency);
        midi = Math.round(midiFloat);
        cents = Math.round((midiFloat - midi) * 100);
        frequency = pitch.frequency;
        confidence = pitch.confidence;
      }
    }

    const now = performance.now() / 1000;
    const committed = committedRef.current;

    if (midi !== null) {
      const pending = pendingRef.current;
      let candidate: PendingNote;

      if (pending && pending.midi === midi) {
        pending.count += 1;
        pending.frequency = frequency;
        pending.cents = cents;
        pending.confidence = confidence;
        candidate = pending;
      } else {
        candidate = { midi, since: now, count: 1, frequency, cents, confidence };
        pendingRef.current = candidate;
      }

      if (committed === midi) {
        setCurrentNote((previous) =>
          previous && previous.midi === midi && previous.cents === cents
            ? previous
            : { midi, frequency, cents, confidence, time: candidate.since },
        );
      } else if (candidate.count >= 2) {
        committedRef.current = midi;
        eventsRef.current.push({ midi, time: candidate.since });
        if (eventsRef.current.length > 800) {
          eventsRef.current.splice(0, eventsRef.current.length - 800);
        }
        setCurrentNote({ midi, frequency, cents, confidence, time: candidate.since });
      }
      return;
    }

    pendingRef.current = null;
    if (committed !== null) {
      committedRef.current = null;
      eventsRef.current.push({ midi: null, time: now });
      setCurrentNote(null);
    }
  }, []);

  const stop = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    sourceRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    committedRef.current = null;
    pendingRef.current = null;
    statusRef.current = 'idle';
    if (mountedRef.current) {
      setStatus('idle');
      setCurrentNote(null);
    }
  }, []);

  const start = useCallback(async () => {
    if (statusRef.current === 'requesting' || statusRef.current === 'ready') return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Este navegador não permite capturar áudio. Use HTTPS ou localhost.');
      statusRef.current = 'error';
      setStatus('error');
      return;
    }

    statusRef.current = 'requesting';
    setStatus('requesting');
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      await resumeAudio();
      const context = getAudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0;
      source.connect(analyser);

      bufferRef.current = new Float32Array(analyser.fftSize);
      streamRef.current = stream;
      sourceRef.current = source;
      analyserRef.current = analyser;
      eventsRef.current = [];
      committedRef.current = null;
      pendingRef.current = null;

      statusRef.current = 'ready';
      setStatus('ready');
      lastFrameRef.current = 0;
      frameRef.current = requestAnimationFrame(tick);
    } catch (cause) {
      const name = cause instanceof DOMException ? cause.name : '';
      const message =
        name === 'NotAllowedError'
          ? 'Permissão de microfone negada. Libere o acesso nas configurações do navegador.'
          : name === 'NotFoundError'
            ? 'Nenhum microfone foi encontrado.'
            : 'Não foi possível iniciar o microfone.';
      statusRef.current = 'error';
      setStatus('error');
      setError(message);
    }
  }, [tick]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stop();
    };
  }, [stop]);

  const clearEvents = useCallback(() => {
    eventsRef.current = [];
  }, []);

  const apiRef = useRef<PitchDetector | null>(null);
  if (!apiRef.current) {
    apiRef.current = { status, error, currentNote, eventsRef, start, stop, clearEvents };
  } else {
    apiRef.current.status = status;
    apiRef.current.error = error;
    apiRef.current.currentNote = currentNote;
    apiRef.current.start = start;
    apiRef.current.stop = stop;
    apiRef.current.clearEvents = clearEvents;
  }

  return apiRef.current;
}
