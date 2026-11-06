"use client";

import { useOnline } from "@/lib/use-online";

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <div
      className="fixed inset-x-0 z-30 bg-[#FFF7ED] px-4 py-1.5 text-center text-xs font-medium text-[#9A3412]"
      style={{ top: "env(safe-area-inset-top)" }}
      role="status"
    >
      Tidak ada koneksi. Perubahan akan dikirim saat online.
    </div>
  );
}
