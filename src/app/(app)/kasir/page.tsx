import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveCashRegister } from "@/lib/auth/cash-register";

function formatIDR(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function KasirPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const shiftStatus = await getActiveCashRegister(supabase, user.id);

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

  const stats = [
    { label: "Transaksi Hari Ini", value: String(ordersToday ?? 0) },
    { label: "Siap Diambil", value: String(readyPickup ?? 0) },
    { label: "Belum Bayar", value: String(pendingPayments ?? 0) },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Kasir</h1>
        <p className="text-sm text-zinc-600">
          Pilih aksi untuk melayani pelanggan dengan cepat.
        </p>
      </div>

      {!shiftStatus.isOpen && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-semibold text-amber-800">Shift Kasir Belum Dibuka</span>
              <span className="text-sm text-amber-700">Buka shift untuk mulai menerima transaksi.</span>
            </div>
            <Link
              href="/kasir/shift"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
            >
              Buka Shift
            </Link>
          </div>
        </div>
      )}

      {shiftStatus.isOpen && (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-semibold text-sky-800">Shift Kasir Aktif</span>
              <span className="text-sm text-sky-700">
                Modal Awal: {formatIDR(shiftStatus.startingCash ?? 0)}
              </span>
            </div>
            <Link
              href="/kasir/shift"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50"
            >
              Tutup Shift
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="text-xs font-medium text-zinc-500">{s.label}</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/kasir/transaksi/baru"
          className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 5V19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M5 12H19"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold tracking-tight">
                  Buat Transaksi
                </h2>
                <span className="text-zinc-300 transition group-hover:text-zinc-400">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 18L15 12L9 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
              <p className="text-sm text-zinc-600">
                Input pelanggan, layanan, dan pembayaran.
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/kasir/riwayat"
          className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 7V12L15 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold tracking-tight">
                  Riwayat Transaksi
                </h2>
                <span className="text-zinc-300 transition group-hover:text-zinc-400">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 18L15 12L9 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
              <p className="text-sm text-zinc-600">
                Lihat daftar transaksi dan statusnya.
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
