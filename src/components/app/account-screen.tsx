"use client";

import { useState } from "react";
import { Info, KeyRound, UserCog } from "lucide-react";

import { MenuGroup, MenuRow } from "@/components/app/menu-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AccountScreen({
  name,
  email,
  role,
  version,
}: {
  name: string;
  email: string;
  role: "admin" | "cashier";
  version: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const roleLabel = role === "admin" ? "Admin" : "Kasir";

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
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

      <MenuGroup title="Aplikasi">
        <MenuRow
          title="Tentang laundry.in"
          icon={Info}
          iconBox={false}
          trailing={<span className="text-[13px] text-slate-500">v{version}</span>}
        />
      </MenuGroup>

      <Button variant="outline" size="lg" fullWidth onClick={() => setConfirmOpen(true)}>
        Keluar dari akun
      </Button>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirmOpen(false);
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
              <Button onClick={() => window.location.assign("/logout")}>Ya, keluar</Button>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Batal
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
