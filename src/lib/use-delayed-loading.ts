"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Shows a loading indicator only if `active` lasts longer than `delay`,
 * and keeps it visible for at least `minDuration` to avoid flicker.
 */
export function useDelayedLoading(
  active: boolean,
  { delay = 150, minDuration = 400 }: { delay?: number; minDuration?: number } = {},
) {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef<number | null>(null);

  useEffect(() => {
    let timer: number | undefined;

    if (active) {
      if (!visible) {
        timer = window.setTimeout(() => {
          shownAt.current = Date.now();
          setVisible(true);
        }, delay);
      }
    } else if (visible) {
      const elapsed = shownAt.current ? Date.now() - shownAt.current : minDuration;
      const remaining = Math.max(0, minDuration - elapsed);
      timer = window.setTimeout(() => {
        shownAt.current = null;
        setVisible(false);
      }, remaining);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [active, visible, delay, minDuration]);

  return visible;
}
