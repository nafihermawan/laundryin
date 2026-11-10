"use client";

import { useState } from "react";
import { KeyRound, LogOut, UserCog } from "lucide-react";

import { MenuGroup, MenuRow } from "@/components/app/menu-group";
import { PrinterSettings } from "@/components/app/printer-settings";
import { SectionHeading } from "@/components/app/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AccountScreen({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: "admin" | "cashier";
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const roleLabel = role === "admin" ? "Admin" : "Kasir";

  return (
    <div className="flex flex-col gap-6">
      <section className="card p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-display text-[22px] font-bold text-white">
            {initial}
          </span>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[17px] font-semibold text-slate-900">{name}</span>
              <Badge variant="secondary">{roleLabel}</Badge>
            </div>
            <span className="text-[13px] text-slate-500">{email}</span>
          </div>
        </div>
      </section>

      <MenuGroup title="Akun saya">
        <MenuRow title="Ubah profil" icon={UserCog} iconBox={false} />
        <MenuRow title="Ganti kata sandi" icon={KeyRound} iconBox={false} />
      </MenuGroup>

      <section>
        <SectionHeading>Printer</SectionHeading>
        <PrinterSettings />
      </section>

      <Button
        variant="danger-outline"
        size="lg"
        fullWidth
        onClick={() => setConfirmOpen(true)}
      >
        <LogOut className="h-5 w-5" strokeWidth={2} />
        Keluar dari akun
      </Button>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !loggingOut) setConfirmOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h2 id="logout-title" className="text-base font-semibold text-slate-900">
              Keluar dari akun?
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Kamu akan keluar dari sesi saat ini dan perlu masuk kembali.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button
                loading={loggingOut}
                loadingText="Keluar…"
                onClick={() => {
                  setLoggingOut(true);
                  window.location.assign("/logout");
                }}
              >
                Ya, keluar
              </Button>
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={loggingOut}>
                Batal
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
