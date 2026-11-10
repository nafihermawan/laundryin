"use client";

import { useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";

export function ScrollCue({
  label = "Gulir ke bawah",
  barHeight,
}: {
  label?: string;
  barHeight: number;
}) {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    function check() {
      setOverflowing(document.documentElement.scrollHeight > window.innerHeight + 40);
    }
    check();
    window.addEventListener("resize", check);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(check);
      observer.observe(document.body);
    }

    return () => {
      window.removeEventListener("resize", check);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    function onScroll() {
      if (window.scrollY > 8) setHasScrolled(true);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const show = overflowing && !hasScrolled;

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 z-30 h-[110px] transition-opacity duration-200"
        style={{
          bottom: `calc(${barHeight}px + env(safe-area-inset-bottom))`,
          background: "linear-gradient(to bottom, rgba(255,255,255,0), #FFFFFF 75%)",
          opacity: show ? 1 : 0,
        }}
      />
      <div
        className="fixed inset-x-0 z-40 flex justify-center transition-opacity duration-200"
        style={{
          bottom: `calc(${barHeight + 20}px + env(safe-area-inset-bottom))`,
          opacity: show ? 1 : 0,
          pointerEvents: show ? "auto" : "none",
        }}
      >
        <button
          type="button"
          onClick={() => window.scrollBy({ top: Math.round(window.innerHeight * 0.9), behavior: "smooth" })}
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-[0_6px_16px_rgba(15,23,42,0.12)]"
        >
          <ArrowDown className="h-4 w-4" strokeWidth={2.5} />
          {label}
        </button>
      </div>
    </>
  );
}
