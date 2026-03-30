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
      className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
    >
      Refresh
    </button>
  );
}
