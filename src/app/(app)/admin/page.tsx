import Link from "next/link";
import { BarChart3, History, Tag, UserPlus, Wallet } from "lucide-react";

import { BottomNav } from "@/components/app/bottom-nav";
import { HomeHeader } from "@/components/app/home-header";
import { MenuGroup, MenuRow } from "@/components/app/menu-group";
import { Badge } from "@/components/ui/badge";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createClient } from "@/lib/supabase/server";

function formatToday(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function SummaryCard({
  href,
  label,
  value,
  tone,
  dot,
}: {
  href: string;
  label: string;
  value: number;
  tone: "neutral" | "emerald" | "amber";
  dot?: boolean;
}) {
  const styles = {
    neutral: { box: "bg-slate-100", label: "text-slate-600", dot: "", value: "text-slate-900" },
    emerald: {
      box: "bg-emerald-50",
      label: "text-emerald-700",
      dot: "bg-emerald-500",
      value: "text-emerald-800",
    },
    amber: {
      box: "bg-orange-50",
      label: "text-amber-700",
      dot: "bg-amber-500",
      value: "text-orange-800",
    },
  }[tone];

  return (
    <Link
      href={href}
      className={`flex min-h-[88px] flex-col justify-between rounded-xl p-3 ${styles.box}`}
    >
      <span className={`flex items-center gap-1.5 text-xs font-medium ${styles.label}`}>
        {dot ? <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} /> : null}
        {label}
      </span>
      <span className={`font-display text-[28px] font-bold leading-none ${styles.value}`}>
        {value}
      </span>
    </Link>
  );
}

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user ? await getUserRole(supabase, user.id) : "cashier";
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
    : { data: null };

  const displayName = profile?.full_name?.trim() || user?.email || "User";
  const roleLabel = role === "admin" ? "Admin" : "Kasir";

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

  const todayLabel = formatToday(new Date());

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <HomeHeader name={displayName} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[120px] pt-5">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                Halo, {displayName}
              </h1>
              <Badge variant="secondary">{roleLabel}</Badge>
            </div>
            <p className="text-sm text-slate-500">{todayLabel}</p>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Ringkasan hari ini</h2>
              <span className="text-xs text-slate-500">Ketuk untuk detail</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <SummaryCard
                href="/admin/riwayat?filter=hari-ini"
                label="Transaksi masuk"
                value={ordersToday ?? 0}
                tone="neutral"
              />
              <SummaryCard
                href="/admin/riwayat?status=siap-diambil"
                label="Siap diambil"
                value={readyPickup ?? 0}
                tone="emerald"
                dot
              />
              <SummaryCard
                href="/admin/riwayat?status=belum-bayar"
                label="Belum bayar"
                value={pendingPayments ?? 0}
                tone="amber"
                dot
              />
            </div>
          </section>

          <div className="flex flex-col gap-6">
            <MenuGroup title="Transaksi">
              <MenuRow
                href="/admin/riwayat"
                title="Riwayat Transaksi"
                description="Daftar transaksi dan statusnya"
                icon={History}
                tone="primary"
              />
            </MenuGroup>

            <MenuGroup title="Laporan">
              <MenuRow
                href="/admin/laporan"
                title="Laporan Transaksi"
                description="Ringkasan dan rekap transaksi"
                icon={BarChart3}
                tone="primary"
              />
              <MenuRow
                href="/admin/laporan-kasir"
                title="Laporan Shift Kasir"
                description="Rekonsiliasi dan selisih uang kas"
                icon={Wallet}
                tone="primary"
              />
            </MenuGroup>

            <MenuGroup title="Pengaturan">
              <MenuRow
                href="/admin/edit-data"
                title="Layanan & Harga"
                description="Kelola daftar layanan dan harga standar"
                icon={Tag}
                tone="neutral"
              />
              <MenuRow
                href="/admin/pengguna"
                title="Pengguna"
                description="Tambah dan kelola akun kasir atau admin"
                icon={UserPlus}
                tone="neutral"
              />
            </MenuGroup>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
