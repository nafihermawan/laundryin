"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
      <h2 className="text-xl font-semibold mb-2">Terjadi Kesalahan</h2>
      <p className="text-zinc-600 mb-6 max-w-md">
        {error.message || "Maaf, sistem mengalami gangguan sementara."}
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        Coba Lagi
      </button>
    </div>
  );
}
