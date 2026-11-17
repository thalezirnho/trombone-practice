export interface PitchResult {
  frequency: number;
  confidence: number;
}

const MIN_FREQUENCY = 60;
const MAX_FREQUENCY = 1100;

export function detectPitch(buffer: Float32Array, sampleRate: number): PitchResult | null {
  const tauMax = Math.min(Math.floor(sampleRate / MIN_FREQUENCY), buffer.length - 2);
  const tauMin = Math.max(2, Math.floor(sampleRate / MAX_FREQUENCY));
  const windowSize = Math.min(buffer.length - tauMax - 1, 2048);

  if (tauMax <= tauMin || windowSize < 512) return null;

  const cmnd = new Float32Array(tauMax + 1);
  cmnd[0] = 1;
  let runningSum = 0;

  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < windowSize; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    runningSum += sum;
    cmnd[tau] = runningSum > 0 ? (sum * tau) / runningSum : 1;
  }

  let tau = tauMin;
  while (tau <= tauMax && cmnd[tau] > 0.15) tau++;
  if (tau > tauMax) return null;

  while (tau < tauMax && cmnd[tau + 1] < cmnd[tau]) tau++;

  let refinedTau = tau;
  if (tau > 0 && tau < tauMax) {
    const before = cmnd[tau - 1];
    const current = cmnd[tau];
    const after = cmnd[tau + 1];
    const denominator = 2 * (2 * current - before - after);
    if (Math.abs(denominator) > 1e-9) {
      refinedTau = tau + (after - before) / denominator;
    }
  }

  const frequency = sampleRate / refinedTau;
  if (!Number.isFinite(frequency) || frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY) {
    return null;
  }

  return { frequency, confidence: Math.max(0, 1 - cmnd[tau]) };
}

export function rootMeanSquare(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}
