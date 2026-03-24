"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error:", error);
  }, [error]);

  return (
    <html lang="id">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-zinc-50">
          <h2 className="text-2xl font-bold mb-2">Terjadi Kesalahan Sistem</h2>
          <p className="text-zinc-600 mb-6 max-w-md">
            Maaf, aplikasi tidak dapat dimuat. Silakan coba beberapa saat lagi.
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Muat Ulang Halaman
          </button>
        </div>
      </body>
    </html>
  );
}
