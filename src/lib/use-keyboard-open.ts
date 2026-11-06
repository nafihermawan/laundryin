"use client";

import { useEffect, useState } from "react";

export function useKeyboardOpen() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      setOpen(window.innerHeight - vv.height > 150);
    };
    update();
    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, []);

  return open;
}
