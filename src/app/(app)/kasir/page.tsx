import { redirect } from "next/navigation";
import Link from "next/link";
import { Briefcase, ChevronRight, History } from "lucide-react";

import { HomeHeader } from "@/components/app/home-header";
import { KasirBottomNav } from "@/components/app/kasir-bottom-nav";
import { MenuGroup, MenuRow } from "@/components/app/menu-group";
import { getActiveCashRegister, getShiftCashTotal } from "@/lib/auth/cash-register";
import { getSessionProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { ShiftCard } from "./shift-card";
import { BukaShiftToast } from "./buka-shift-toast";

export default async function KasirPage() {
  const profile = await getSessionProfile();

  if (!profile) redirect("/login");

  const supabase = await createClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startISO = startOfDay.toISOString();

  const [shiftStatus, countResults] = await Promise.all([
    getActiveCashRegister(supabase, profile.id),
    Promise.all([
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startISO),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "siap"),
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]),
  ]);

  const [ordersToday, readyPickup, pendingPayments] = countResults.map((r) => r.count);

  let cashTotal = 0;
  if (shiftStatus.isOpen && shiftStatus.registerId) {
    cashTotal = await getShiftCashTotal(supabase, shiftStatus.registerId);
  }

  const summary = [
    {
      href: "/kasir/riwayat?filter=hari-ini",
      label: "Masuk",
      value: ordersToday ?? 0,
      valueClass: "text-slate-900",
      dotClass: "bg-slate-400",
      aria: `${ordersToday ?? 0} transaksi masuk hari ini, lihat daftar`,
    },
    {
      href: "/kasir/riwayat?status=siap-diambil",
      label: "Siap diambil",
      value: readyPickup ?? 0,
      valueClass: "text-emerald-700",
      dotClass: "bg-emerald-500",
      aria: `${readyPickup ?? 0} transaksi siap diambil, lihat daftar`,
    },
    {
      href: "/kasir/riwayat?status=belum-bayar",
      label: "Belum bayar",
      value: pendingPayments ?? 0,
      valueClass: "text-amber-700",
      dotClass: "bg-amber-500",
      aria: `${pendingPayments ?? 0} transaksi belum bayar, lihat daftar`,
    },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <BukaShiftToast />
      <HomeHeader name={profile.name} homeHref="/kasir" accountHref="/kasir/akun" />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-[120px] pt-5">
        <h1 className="sr-only">Beranda</h1>

        <ShiftCard
          key={shiftStatus.isOpen ? "open" : "closed"}
          name={profile.name}
          isOpen={shiftStatus.isOpen}
          registerId={shiftStatus.registerId}
          openedAt={shiftStatus.openedAt}
          startingCash={shiftStatus.startingCash ?? 0}
          cashTotal={cashTotal}
        />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <h2 className="border-b border-slate-200 px-[14px] py-3 text-[13px] font-semibold text-slate-900">
            Ringkasan hari ini
          </h2>
          <div className="grid grid-cols-3">
            {summary.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.aria}
                className={`flex flex-col gap-2 p-[14px] transition-colors active:bg-slate-50 focus-visible:[outline:2px_solid_#4F46E5] focus-visible:[outline-offset:-2px] ${
                  index > 0 ? "border-l border-slate-200" : ""
                }`}
              >
                <span
                  className={`font-display text-[24px] font-bold leading-none tabular-nums ${item.valueClass}`}
                >
                  {item.value}
                </span>
                <span className="flex items-center gap-[5px] whitespace-nowrap text-[12px] font-medium text-slate-500">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.dotClass}`} />
                  {item.label}
                  <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <MenuGroup title="Menu">
          <MenuRow
            href="/kasir/riwayat"
            title="Riwayat Transaksi"
            description="Daftar transaksi dan statusnya"
            icon={History}
            tone="primary"
          />
          <MenuRow
            href="/kasir/shift"
            title="Riwayat Shift"
            description="Rekap shift dan selisih kas Anda"
            icon={Briefcase}
            tone="primary"
          />
        </MenuGroup>
      </main>

      <KasirBottomNav hasActiveShift={shiftStatus.isOpen} />
    </div>
  );
}
