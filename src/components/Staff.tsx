import { useEffect, useRef, useState } from 'react';
import { isNoteInKeySignature } from '../music/keySignature';
import type { KeySignature } from '../music/keySignature';
import { getStaffPosition, midiToName } from '../music/notes';
import type { NoteResult, ScoreNote } from '../types';

interface StaffProps {
  notes: ScoreNote[];
  currentTime: number;
  pixelsPerSecond?: number;
  playheadX?: number;
  height?: number;
  showNoteNames?: boolean;
  useFlats?: boolean;
  showPlayhead?: boolean;
  keySignature?: KeySignature;
}

const EMPTY_KEY_SIGNATURE: KeySignature = {
  type: null,
  count: 0,
  accidentals: [],
  label: 'sem acidentes',
};

const LINE_SPACING = 12;
const BOTTOM_LINE_Y = 96;
const BOTTOM_STEP = 18;

const BASS_CLEF_PATH =
  'M50 123Q216 231 288 301Q336 348 373.0 408.5Q410 469 431.5 536.0Q453 603 453 669Q453 728 435.0 773.5Q417 819 383.0 845.0Q349 871 302 871Q284 871 264.5 867.0Q245 863 224 855Q181 839 158.0 813.5Q135 788 135 765Q135 756 143.0 752.0Q151 748 158 748Q168 748 183 752Q190 754 196.5 755.0Q203 756 210 756Q248 756 272.0 733.5Q296 711 296 674Q296 638 266.0 612.0Q236 586 195 586Q146 586 111.0 617.0Q76 648 76 697Q76 756 109.0 802.0Q142 848 198.5 874.0Q255 900 324 900Q400 900 460.0 867.0Q520 834 555.5 776.5Q591 719 591 646Q591 551 538 464Q511 419 476.5 379.0Q442 339 389.0 297.5Q336 256 256.0 208.0Q176 160 57 101ZM687 809Q710 809 726.0 793.0Q742 777 742 754Q742 731 726.0 715.5Q710 700 687 700Q664 700 648.0 715.5Q632 731 632 754Q632 777 648.0 793.0Q664 809 687 809ZM687 589Q710 589 726.0 573.0Q742 557 742 534Q742 511 726.0 495.5Q710 480 687 480Q664 480 648.0 495.5Q632 511 632 534Q632 557 648.0 573.0Q664 589 687 589Z';

function noteColor(result?: NoteResult): string {
  if (result === 'correct') return '#34d399';
  if (result === 'wrong') return '#f87171';
  if (result === 'missed') return '#fbbf24';
  return '#e2e8f0';
}

export function Staff({
  notes,
  currentTime,
  pixelsPerSecond = 110,
  playheadX = 120,
  height = 140,
  showNoteNames = true,
  useFlats = true,
  showPlayhead = true,
  keySignature = EMPTY_KEY_SIGNATURE,
}: StaffProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(Math.max(320, entries[0].contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const yForStep = (step: number) => BOTTOM_LINE_Y - (step - BOTTOM_STEP) * (LINE_SPACING / 2);

  return (
    <div className="staff" ref={containerRef}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Partitura">
        <rect x="0" y="0" width={width} height={height} rx="10" fill="#0f172a" />

        {[0, 1, 2, 3, 4].map((line) => (
          <line
            key={line}
            x1="0"
            x2={width}
            y1={BOTTOM_LINE_Y - line * LINE_SPACING}
            y2={BOTTOM_LINE_Y - line * LINE_SPACING}
            stroke="#475569"
            strokeWidth="1"
          />
        ))}

        <g transform="translate(6.4 108.8) scale(0.0726 -0.0726)" fill="#cbd5e1">
          <path d={BASS_CLEF_PATH} />
        </g>

        <g fill="#cbd5e1" fontFamily="serif" fontSize="17">
          {keySignature.accidentals.map((accidental, index) => (
            <text
              key={`${accidental.letter}-${index}`}
              x={66 + index * 8}
              y={yForStep(BOTTOM_STEP + accidental.step) + 5}
              textAnchor="middle"
            >
              {accidental.type === 'sharp' ? '♯' : '♭'}
            </text>
          ))}
        </g>

        {notes.map((note) => {
          const x = playheadX + (note.time - currentTime) * pixelsPerSecond;
          if (x < -30 || x > width + 30) return null;

          const position = getStaffPosition(note.midi, useFlats);
          const y = yForStep(position.step);
          const color = noteColor(note.result);
          const stemUp = y > BOTTOM_LINE_Y - LINE_SPACING * 2;
          const stemEnd = stemUp ? y - 30 : y + 30;
          const stemX = stemUp ? x + 5 : x - 5;
          const isCurrent = Math.abs(x - playheadX) < 14;
          const needsAccidental =
            position.accidental !== null && !isNoteInKeySignature(note.midi, keySignature);
          const lowestStep = Math.min(position.step, BOTTOM_STEP);
          const highestStep = Math.max(position.step, BOTTOM_STEP + 8);
          const ledgerSteps: number[] = [];

          for (let step = Math.floor(lowestStep / 2) * 2; step <= highestStep; step += 2) {
            if (step >= BOTTOM_STEP && step <= BOTTOM_STEP + 8) continue;
            ledgerSteps.push(step);
          }

          return (
            <g key={note.id} opacity={note.result === 'missed' ? 0.85 : 1}>
              {ledgerSteps.map((step) => (
                <line
                  key={step}
                  x1={x - 11}
                  x2={x + 11}
                  y1={yForStep(step)}
                  y2={yForStep(step)}
                  stroke="#64748b"
                  strokeWidth="1.2"
                />
              ))}

              {needsAccidental && position.accidental && (
                <text x={x - 21} y={y + 5} fontSize="17" fill={color} fontFamily="serif">
                  {position.accidental === 'flat' ? '♭' : '♯'}
                </text>
              )}

              {isCurrent && <circle cx={x} cy={y} r="15" fill={color} opacity="0.16" />}

              <line x1={stemX} x2={stemX} y1={y} y2={stemEnd} stroke={color} strokeWidth="1.6" />
              <ellipse
                cx={x}
                cy={y}
                rx="6.4"
                ry="4.4"
                transform={`rotate(-18 ${x} ${y})`}
                fill={color}
              />

              {showNoteNames && (
                <text x={x} y={height - 10} textAnchor="middle" fontSize="11" fill={color}>
                  {note.result === 'wrong' && note.detectedMidi !== undefined
                    ? `${midiToName(note.midi, useFlats)} / ${midiToName(note.detectedMidi, useFlats)}`
                    : midiToName(note.midi, useFlats)}
                </text>
              )}
            </g>
          );
        })}

        {showPlayhead && (
          <g>
            <line x1={playheadX} x2={playheadX} y1="14" y2={height - 4} stroke="#fb923c" strokeWidth="2" />
            <polygon
              points={`${playheadX - 6},8 ${playheadX + 6},8 ${playheadX},18`}
              fill="#fb923c"
            />
            <text x={playheadX + 10} y="21" fontSize="10" fill="#fb923c" letterSpacing="1">
              AGORA
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
