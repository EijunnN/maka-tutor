import { useCallback, useEffect, useState } from 'react';
import type { ScreenshotEvent } from '@shared/types';

export function useScreenshots() {
  const [shots, setShots] = useState<ScreenshotEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const offShot = window.events.onScreenshot((data) => {
      setShots((prev) => [...prev, data]);
      setError(null);
    });
    const offErr = window.events.onScreenshotError((err) => {
      setError(err.message);
    });
    return () => {
      offShot();
      offErr();
    };
  }, []);

  const remove = useCallback((path: string) => {
    setShots((prev) => prev.filter((s) => s.path !== path));
  }, []);

  const clear = useCallback(() => {
    setShots([]);
  }, []);

  return { shots, error, remove, clear };
}
