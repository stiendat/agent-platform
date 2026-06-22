import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Briefly flips a loading flag for `duration` ms — used to flash the dashboard
 * overlay on layout mutations (move / resize / rename) so the canvas reads as
 * "updating" without a server round-trip.
 */
export function useDashboardLoading(duration = 700) {
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const trigger = useCallback(() => {
    setLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setLoading(false), duration);
  }, [duration]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { loading, trigger };
}
