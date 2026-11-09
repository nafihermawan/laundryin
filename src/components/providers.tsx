"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-center"
        offset={96}
        duration={3000}
        richColors
        closeButton={false}
      />
    </>
  );
}
