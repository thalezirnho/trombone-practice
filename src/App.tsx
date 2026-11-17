import { useState } from 'react';
import { usePitchDetection } from './audio/usePitchDetection';
import { EarTraining } from './exercises/EarTraining';
import { ScaleStudy } from './exercises/ScaleStudy';
import { SightReading } from './exercises/SightReading';
import { midiToName } from './music/notes';
import type { ExerciseSettings } from './types';

type Tab = 'reading' | 'scale' | 'ear';

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: 'reading', label: 'Leitura', description: 'Partitura rolando no tempo' },
  { id: 'scale', label: 'Escala', description: 'Subida, oitava, descida e arpejo' },
  { id: 'ear', label: 'Ouvido', description: 'Descubra as notas pelo som' },
];

export default function App() {
  const [bpm, setBpm] = useState(96);
  const [showNoteNames, setShowNoteNames] = useState(true);
  const [useFlats, setUseFlats] = useState(true);
  const [sensitivity, setSensitivity] = useState(0.012);
  const [tab, setTab] = useState<Tab>('reading');
  const detector = usePitchDetection(sensitivity);

  const settings: ExerciseSettings = { bpm, showNoteNames, useFlats, sensitivity };
  const detected = detector.currentNote;

  const micLabel = {
    idle: 'Ativar microfone',
    requesting: 'Conectando...',
    ready: 'Microfone ativo',
    error: 'Tentar novamente',
  }[detector.status];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">TP</div>
          <div>
            <h1>Trombone Practice</h1>
            <p>Estudo de nota, tempo e ouvido em tempo real</p>
          </div>
        </div>

        <div className="topbar-right">
          <div className={`note-readout ${detected ? 'detecting' : ''}`}>
            <span className="readout-label">Nota detectada</span>
            <strong>{detected ? midiToName(detected.midi, useFlats) : '—'}</strong>
            <span className="readout-detail">
              {detected
                ? `${detected.cents >= 0 ? '+' : ''}${detected.cents} cents · ${detected.frequency.toFixed(1)} Hz`
                : 'aguardando som'}
            </span>
          </div>

          <button
            type="button"
            className={`button mic-button ${detector.status}`}
            onClick={() => (detector.status === 'ready' ? detector.stop() : void detector.start())}
          >
            <span className="mic-dot" />
            {micLabel}
          </button>
        </div>
      </header>

      {detector.error && <div className="error-banner">{detector.error}</div>}

      <nav className="tabs" aria-label="Exercícios">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tab ${tab === item.id ? 'active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            <strong>{item.label}</strong>
            <small>{item.description}</small>
          </button>
        ))}
      </nav>

      <section className="settings-bar">
        <label className="inline-field">
          <span>Tempo</span>
          <input
            type="range"
            min="60"
            max="160"
            value={bpm}
            onChange={(event) => setBpm(Number(event.target.value))}
          />
          <strong>{bpm} BPM</strong>
        </label>

        <label className="inline-field">
          <span>Sensibilidade do microfone</span>
          <input
            type="range"
            min="0.002"
            max="0.06"
            step="0.001"
            value={sensitivity}
            onChange={(event) => setSensitivity(Number(event.target.value))}
          />
          <strong>{sensitivity.toFixed(3)}</strong>
        </label>

        <label className="toggle-field">
          <input
            type="checkbox"
            checked={showNoteNames}
            onChange={(event) => setShowNoteNames(event.target.checked)}
          />
          <span>Mostrar nomes das notas</span>
        </label>

        <label className="inline-field compact">
          <span title="Em tonalidades com armadura, ela define bemóis ou sustenidos.">Acidentes</span>
          <select value={useFlats ? 'flats' : 'sharps'} onChange={(event) => setUseFlats(event.target.value === 'flats')}>
            <option value="flats">Bemóis (Bb, Eb)</option>
            <option value="sharps">Sustenidos (A#, D#)</option>
          </select>
        </label>
      </section>

      <main>
        {tab === 'reading' && <SightReading settings={settings} detector={detector} />}
        {tab === 'scale' && <ScaleStudy settings={settings} detector={detector} />}
        {tab === 'ear' && <EarTraining settings={settings} detector={detector} />}
      </main>

      <footer className="footer">
        Use fones de ouvido no treino de ouvido. O navegador precisa de permissão de microfone e de
        uma conexão HTTPS ou localhost.
      </footer>
    </div>
  );
}
