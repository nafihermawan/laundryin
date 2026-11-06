"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastOptions = { actionLabel?: string; onAction?: () => void };
type ToastItem = { id: number; message: string; actionLabel?: string; onAction?: () => void };

const ToastContext = createContext<{ show: (message: string, options?: ToastOptions) => void } | null>(
  null,
);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, options?: ToastOptions) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [
      ...prev,
      { id, message, actionLabel: options?.actionLabel, onAction: options?.onAction },
    ]);
    window.setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      options?.actionLabel ? 8000 : 3500,
    );
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg"
          >
            <span className="flex-1">{t.message}</span>
            {t.actionLabel ? (
              <button
                type="button"
                onClick={() => {
                  t.onAction?.();
                  dismiss(t.id);
                }}
                className="shrink-0 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-white/25"
              >
                {t.actionLabel}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx ?? { show: () => {} };
}
