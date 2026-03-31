"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PaymentMethod = "all" | "cash" | "transfer" | "qris_manual" | "qris_dynamic";
type PaymentStatus = "all" | "paid" | "pending" | "expired" | "failed";

function normalizeMethod(value: unknown): PaymentMethod {
  if (value === "cash" || value === "transfer" || value === "qris_manual" || value === "qris_dynamic") return value;
  if (value === "all") return "all";
  return "all";
}

function normalizeStatus(value: unknown): PaymentStatus {
  if (value === "paid" || value === "pending" || value === "expired" || value === "failed") return value;
  if (value === "all") return "all";
  return "paid";
}

function normalizeDate(value: unknown): string {
  if (typeof value !== "string") return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export function LaporanControls({
  fromKey,
  toKey,
  method,
  status,
}: {
  fromKey: string;
  toKey: string;
  method: string;
  status: string;
}) {
  const router = useRouter();
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterHeight, setFilterHeight] = useState<number | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const filterFrameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    function update() {
      setViewportHeight(window.innerHeight || 0);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (typeof window === "undefined") return;
      try {
        const eventUrl = new URL(event.origin);
        const appUrl = new URL(window.location.origin);
        const allowedHosts = new Set(["localhost", "127.0.0.1"]);
        const hostOk =
          eventUrl.hostname === appUrl.hostname ||
          (allowedHosts.has(eventUrl.hostname) && allowedHosts.has(appUrl.hostname));
        if (!hostOk) return;
        if (eventUrl.protocol !== appUrl.protocol) return;
        if (eventUrl.port !== appUrl.port) return;
      } catch {
        return;
      }

      const data = event.data as unknown;
      if (!data || typeof data !== "object") return;
      const record = data as Record<string, unknown>;

      if (record.type === "embed:height") {
        const h = record.height;
        if (typeof h !== "number" || !Number.isFinite(h) || h <= 0) return;
        const next = Math.min(Math.max(Math.round(h), 240), 2000);
        const source = event.source as Window | null;
        if (filterFrameRef.current?.contentWindow && source === filterFrameRef.current.contentWindow) {
          setFilterHeight(next);
          return;
        }
        return;
      }

      if (record.type !== "admin:laporan-filters") return;
      const source = event.source as Window | null;
      if (filterFrameRef.current?.contentWindow && source !== filterFrameRef.current.contentWindow) return;

      const normalizedFrom = normalizeDate(record.from);
      const normalizedTo = normalizeDate(record.to);
      const normalizedMethod = normalizeMethod(record.method);
      const normalizedStatus = normalizeStatus(record.status);

      const sp = new URLSearchParams();
      if (normalizedFrom) sp.set("from", normalizedFrom);
      if (normalizedTo) sp.set("to", normalizedTo);
      sp.set("method", normalizedMethod);
      sp.set("status", normalizedStatus);

      router.push(`/admin/laporan?${sp.toString()}`);
      setFilterOpen(false);
      setFilterHeight(null);
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  const updateFilterHeightFromFrame = useCallback(() => {
    const frame = filterFrameRef.current;
    if (!frame) return;
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      const root =
        (doc.getElementById("embed-root") as HTMLElement | null) ??
        (doc.body.firstElementChild as HTMLElement | null) ??
        doc.body;
      const h = Math.ceil(root.getBoundingClientRect().height);
      if (!Number.isFinite(h) || h <= 0) return;
      setFilterHeight(Math.min(Math.max(Math.round(h), 240), 2000));
    } catch {}
  }, []);

  const normalizedMethod = normalizeMethod(method);
  const normalizedStatus = normalizeStatus(status);
  const downloadHref = `/api/admin/laporan/excel?from=${encodeURIComponent(fromKey)}&to=${encodeURIComponent(toKey)}&method=${encodeURIComponent(normalizedMethod)}&status=${encodeURIComponent(normalizedStatus)}`;
  const maxModalHeight = viewportHeight > 0 ? Math.round(viewportHeight * 0.85) : null;

  return (
    <>
      <div className="flex items-center gap-2">
        <a
          href={downloadHref}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
        >
          Download Excel
        </a>
        <button
          type="button"
          onClick={() => {
            setFilterOpen(true);
            setFilterHeight(null);
          }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 3H2l8 9v7l4 2v-9l8-9z" />
          </svg>
          Filter
        </button>
      </div>

      {filterOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setFilterOpen(false);
              setFilterHeight(null);
            }
          }}
        >
          <div
            className="w-full max-w-md overflow-auto rounded-2xl shadow-xl"
            style={{
              maxHeight: maxModalHeight ? `${maxModalHeight}px` : "85vh",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <iframe
              src={`/embed/admin-laporan-filter?from=${encodeURIComponent(fromKey)}&to=${encodeURIComponent(toKey)}&method=${encodeURIComponent(normalizedMethod)}&status=${encodeURIComponent(normalizedStatus)}`}
              className="w-full rounded-2xl bg-transparent"
              style={{ height: filterHeight ? `${filterHeight}px` : "420px" }}
              frameBorder={0}
              scrolling="no"
              ref={filterFrameRef}
              onLoad={() => {
                updateFilterHeightFromFrame();
                window.setTimeout(updateFilterHeightFromFrame, 50);
                window.setTimeout(updateFilterHeightFromFrame, 200);
                window.setTimeout(updateFilterHeightFromFrame, 500);
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

