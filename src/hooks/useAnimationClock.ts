import { useEffect, useRef, useState } from 'react';

export function useAnimationClock(running: boolean, onFrame?: (now: number) => void): number {
  const [now, setNow] = useState(() => performance.now() / 1000);
  const callbackRef = useRef(onFrame);
  callbackRef.current = onFrame;

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const loop = () => {
      const timestamp = performance.now() / 1000;
      setNow(timestamp);
      callbackRef.current?.(timestamp);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  return now;
}
