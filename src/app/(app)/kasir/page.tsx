import { redirect } from "next/navigation";
import { Briefcase, History } from "lucide-react";

import { HomeHeader } from "@/components/app/home-header";
import { BottomNav } from "@/components/app/bottom-nav";
import { MenuGroup, MenuRow } from "@/components/app/menu-group";
import { SummaryCard } from "@/components/app/summary-card";
import { getActiveCashRegister } from "@/lib/auth/cash-register";
import { createClient } from "@/lib/supabase/server";

import { ShiftCard } from "./shift-card";
import { BukaShiftToast } from "./buka-shift-toast";

function formatToday(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function KasirPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const shiftStatus = await getActiveCashRegister(supabase, user.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const displayName = profile?.full_name?.trim() || user.email || "User";

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startISO = startOfDay.toISOString();

  const [{ count: ordersToday }, { count: readyPickup }, { count: pendingPayments }] =
    await Promise.all([
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
    ]);

  let cashTotal = 0;
  if (shiftStatus.isOpen && shiftStatus.registerId) {
    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("cash_register_id", shiftStatus.registerId)
      .eq("method", "cash")
      .eq("status", "paid");
    cashTotal = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  }

  const todayLabel = formatToday(new Date());

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <BukaShiftToast />
      <HomeHeader name={displayName} homeHref="/kasir" accountHref="/kasir/akun" />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-[120px] pt-5">
        <div className="flex flex-col gap-1">
            <h1 className="font-display text-[18px] font-semibold tracking-[-0.01em] text-slate-900">
              Halo, {displayName}
            </h1>
            <p className="text-sm text-slate-500">{todayLabel}</p>
          </div>

          <ShiftCard
            isOpen={shiftStatus.isOpen}
            registerId={shiftStatus.registerId}
            openedAt={shiftStatus.openedAt}
            startingCash={shiftStatus.startingCash ?? 0}
            cashTotal={cashTotal}
          />

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Ringkasan hari ini</h2>
              <span className="text-xs text-slate-500">Ketuk untuk detail</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <SummaryCard
                href="/kasir/riwayat?filter=hari-ini"
                label="Transaksi masuk"
                value={ordersToday ?? 0}
                tone="neutral"
              />
              <SummaryCard
                href="/kasir/riwayat?status=siap-diambil"
                label="Siap diambil"
                value={readyPickup ?? 0}
                tone="emerald"
                dot
              />
              <SummaryCard
                href="/kasir/riwayat?status=belum-bayar"
                label="Belum bayar"
                value={pendingPayments ?? 0}
                tone="amber"
                dot
              />
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

      <BottomNav role="cashier" hasActiveShift={shiftStatus.isOpen} />
    </div>
  );
}
