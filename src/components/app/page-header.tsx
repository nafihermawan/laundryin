"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { OfflineBanner } from "./offline-banner";

export function PageHeader({
  title,
  fallbackHref = "/admin",
  onBack,
  className = "",
}: {
  title: string;
  fallbackHref?: string;
  onBack?: () => void;
  className?: string;
}) {
  const router = useRouter();

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b border-slate-200 bg-white ${className}`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
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
      <OfflineBanner />
    </>
  );
}
