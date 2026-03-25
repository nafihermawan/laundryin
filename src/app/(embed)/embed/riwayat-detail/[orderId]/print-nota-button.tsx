"use client";

import { useState } from "react";

export function PrintNotaButton({ orderId }: { orderId: string }) {
  const [isPrinting, setIsPrinting] = useState(false);

  function handlePrint() {
    setIsPrinting(true);
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = `/embed/nota/${orderId}`;

    iframe.onload = () => {
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.print();
        }
        setIsPrinting(false);
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500); // Tunggu konten dirender sempurna sebelum print
    };

    document.body.appendChild(iframe);
  }

  return (
    <button
      type="button"
      disabled={isPrinting}
      onClick={handlePrint}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-70 disabled:cursor-not-allowed"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 6 2 18 2 18 9"></polyline>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
        <rect x="6" y="14" width="12" height="8"></rect>
      </svg>
      {isPrinting ? "Menyiapkan..." : "Print Nota"}
    </button>
  );
}
