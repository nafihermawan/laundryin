"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

const OPEN_DURATION = 300;
const CLOSE_DURATION = 220;
const OPEN_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";
const CLOSE_EASING = "cubic-bezier(0.4, 0, 1, 1)";

export function Drawer({
  open,
  onClose,
  returnFocusTo,
  children,
}: {
  open: boolean;
  onClose: () => void;
  returnFocusTo?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ startY: number; startTime: number; lastY: number; lastTime: number } | null>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Open: mount on the next frame, then flip to the entered state a frame later so the transition runs.
  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      setEntered(false);
      setMounted(true);
      inner = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, [open]);

  // Close: animate out, then unmount (transitionend, with a timeout fallback).
  useEffect(() => {
    if (open || !mounted) return;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setMounted(false);
      (returnFocusTo?.current ?? prevFocus.current)?.focus();
    };

    const sheet = sheetRef.current;
    const timer = window.setTimeout(finish, reducedMotion ? 0 : CLOSE_DURATION + 60);
    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.target === sheet && e.propertyName === "transform") {
        window.clearTimeout(timer);
        finish();
      }
    };
    sheet?.addEventListener("transitionend", onTransitionEnd);
    return () => {
      window.clearTimeout(timer);
      sheet?.removeEventListener("transitionend", onTransitionEnd);
    };
  }, [open, mounted, reducedMotion, returnFocusTo]);

  // Scroll lock that preserves the page scroll position.
  useEffect(() => {
    if (!mounted) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [mounted]);

  // Focus trap + Escape.
  useEffect(() => {
    if (!mounted) return;
    const sheet = sheetRef.current;
    const getFocusables = () =>
      sheet
        ? Array.from(
            sheet.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          )
        : [];

    getFocusables()[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const els = getFocusables();
      if (els.length === 0) return;
      const index = els.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey) {
        if (index <= 0) {
          e.preventDefault();
          els[els.length - 1].focus();
        }
      } else if (index === els.length - 1) {
        e.preventDefault();
        els[0].focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mounted, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  const duration = reducedMotion ? 0 : open ? OPEN_DURATION : CLOSE_DURATION;
  const easing = open ? OPEN_EASING : CLOSE_EASING;
  const overlayVisible = open && entered;
  const sheetTransform = dragging
    ? `translateY(${dragOffset}px)`
    : open && entered
      ? "translateY(0)"
      : "translateY(100%)";

  function handleTouchStart(e: React.TouchEvent) {
    const now = e.timeStamp;
    gesture.current = {
      startY: e.touches[0].clientY,
      startTime: now,
      lastY: e.touches[0].clientY,
      lastTime: now,
    };
    setDragging(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    const g = gesture.current;
    if (!g) return;
    const y = e.touches[0].clientY;
    g.lastY = y;
    g.lastTime = e.timeStamp;
    const dy = y - g.startY;
    setDragOffset(dy > 0 ? dy : 0);
  }

  function handleTouchEnd() {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;

    const height = sheetRef.current?.offsetHeight ?? 400;
    const elapsed = Math.max(1, g.lastTime - g.startTime);
    const velocity = (g.lastY - g.startY) / elapsed; // px/ms, positive = downward
    const shouldClose = dragOffset > height * 0.3 || velocity > 0.5;

    setDragging(false);
    setDragOffset(0);
    if (shouldClose) onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0"
        style={{
          background: "rgba(15,23,42,.45)",
          opacity: overlayVisible ? 1 : 0,
          transition: `opacity ${duration}ms ${easing}`,
        }}
      />
      <div
        ref={sheetRef}
        className="fixed inset-x-0 bottom-0 flex max-h-[90vh] flex-col overflow-hidden rounded-t-[20px] bg-white"
        style={{
          boxShadow: "0 -8px 24px rgba(15,23,42,.12)",
          transform: sheetTransform,
          transition: dragging ? "none" : `transform ${duration}ms ${easing}`,
          willChange: dragging ? "transform" : "auto",
        }}
      >
        <div
          className="flex shrink-0 cursor-grab justify-center pb-1 pt-2 active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <span className="h-1 w-9 rounded-full bg-slate-300" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
