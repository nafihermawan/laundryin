"use client";

import dynamic from "next/dynamic";

import type { BottomNav as BottomNavType } from "./bottom-nav";

const BottomNav = dynamic(() => import("./bottom-nav").then((m) => m.BottomNav), {
  ssr: false,
}) as unknown as typeof BottomNavType;

export function BottomNavShell({ homeHref }: { homeHref: string }) {
  return <BottomNav homeHref={homeHref} />;
}

