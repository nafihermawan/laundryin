"use client";

import { RouteError } from "@/components/app/route-error";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError title="Pengguna" reset={reset} fallbackHref="/admin" />;
}
