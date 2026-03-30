"use client";

export function CloseEmbedButton() {
  return (
    <button
      type="button"
      onClick={() => {
        window.parent.postMessage({ type: "embed:close" }, "*");
      }}
      className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
    >
      Tutup
    </button>
  );
}

