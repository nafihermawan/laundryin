"use client";

import { useState } from "react";

export function CopyUrl({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <input
          value={value}
          readOnly
          className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-700 outline-none"
        />
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1200);
            } catch {}
          }}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
        >
          {copied ? "Tersalin" : "Copy"}
        </button>
      </div>
    </div>
  );
}

