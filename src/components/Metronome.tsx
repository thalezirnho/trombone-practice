interface MetronomeProps {
  bpm: number;
  now: number;
  startTime: number;
  active: boolean;
  beatsPerBar?: number;
}

export function Metronome({ bpm, now, startTime, active, beatsPerBar = 4 }: MetronomeProps) {
  const beatDuration = 60 / bpm;
  const elapsed = Math.max(0, now - startTime);
  const beat = Math.floor(elapsed / beatDuration);
  const phase = active ? elapsed / beatDuration - beat : 0;
  const scale = active ? 1 + 0.24 * Math.pow(1 - phase, 4) : 1;
  const currentBeat = ((beat % beatsPerBar) + beatsPerBar) % beatsPerBar;

  return (
    <div className="metronome">
      <div className="metronome-circle" style={{ transform: `scale(${scale})` }}>
        <strong>{currentBeat + 1}</strong>
      </div>
      <div className="metronome-dots">
        {Array.from({ length: beatsPerBar }, (_, index) => (
          <span key={index} className={index === currentBeat && active ? 'dot active' : 'dot'} />
        ))}
      </div>
      <span className="metronome-label">{bpm} BPM</span>
    </div>
  );
}
