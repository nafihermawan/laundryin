"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function PageHeader({
  title,
  fallbackHref = "/admin",
}: {
  title: string;
  fallbackHref?: string;
}) {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <header className="h-16 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-1 pl-1.5 pr-4">
        <button
          type="button"
          aria-label="Kembali"
          onClick={handleBack}
          className="flex h-11 w-11 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2} />
        </button>
        <h1 className="font-display text-[18px] font-bold tracking-tight text-slate-900">
          {title}
        </h1>
      </div>
    </header>
  );
}
