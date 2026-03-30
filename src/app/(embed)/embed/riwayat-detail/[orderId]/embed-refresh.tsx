"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function EmbedAutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [intervalMs, router]);

  return null;
}

export function EmbedRefreshButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        router.refresh();
      }}
      aria-label="Refresh"
      title="Refresh"
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12a9 9 0 1 1-3-6.708" />
        <path d="M21 3v6h-6" />
      </svg>
    </button>
  );
}
