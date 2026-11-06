"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";

export type ToastOptions = {
  actionLabel?: string;
  onAction?: () => void;
  type?: "success" | "error" | "info";
};

function notify(type: "success" | "error" | "info", message: string, options?: ToastOptions) {
  const opts = options?.actionLabel
    ? { action: { label: options.actionLabel, onClick: () => options.onAction?.() } }
    : undefined;

  if (type === "error") toast.error(message, opts);
  else if (type === "info") toast.info(message, opts);
  else toast.success(message, opts);
}

// Compatibility passthrough — sonner's <Toaster> is mounted globally in Providers.
export function ToastProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useToast() {
  return {
    show: (message: string, options?: ToastOptions) => notify(options?.type ?? "success", message, options),
    success: (message: string, options?: ToastOptions) => notify("success", message, options),
    error: (message: string, options?: ToastOptions) => notify("error", message, options),
  };
}
