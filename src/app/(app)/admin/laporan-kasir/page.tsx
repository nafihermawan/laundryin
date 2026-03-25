import { createClient } from "@/lib/supabase/server";

type CashRegisterRow = {
  id: string;
  user_id: string;
  opened_at: string;
  closed_at: string | null;
  starting_cash: number;
  expected_cash: number | null;
  actual_cash: number | null;
  variance: number | null;
  status: "open" | "closed" | string;
};

function formatIDR(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const metadata = {
  title: "Laporan Shift Kasir",
};

export default async function LaporanKasirPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("cash_registers")
    .select("id, user_id, opened_at, closed_at, starting_cash, expected_cash, actual_cash, variance, status")
    .order("opened_at", { ascending: false });

  const registers = (data ?? []) as unknown as CashRegisterRow[];
  const userIds = Array.from(new Set(registers.map((r) => r.user_id).filter(Boolean)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);
  const profileNameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name?.trim() || ""]));

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Laporan Shift Kasir</h1>
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">
          Gagal memuat data: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Laporan Shift Kasir</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Riwayat buka dan tutup kasir untuk rekonsiliasi kas.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm text-zinc-600">
          <thead className="border-b border-zinc-200 bg-zinc-50/50 text-zinc-900">
            <tr>
              <th className="px-4 py-3 font-semibold">Kasir</th>
              <th className="px-4 py-3 font-semibold">Waktu Buka</th>
              <th className="px-4 py-3 font-semibold">Waktu Tutup</th>
              <th className="px-4 py-3 font-semibold">Modal Awal</th>
              <th className="px-4 py-3 font-semibold">Expected</th>
              <th className="px-4 py-3 font-semibold">Fisik (Actual)</th>
              <th className="px-4 py-3 font-semibold">Selisih</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {registers?.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                  Belum ada data shift kasir.
                </td>
              </tr>
            ) : (
              registers?.map((reg) => (
                <tr key={reg.id} className="transition-colors hover:bg-zinc-50/50">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {profileNameById.get(reg.user_id) || "Tanpa Nama"}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(reg.opened_at).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    {reg.closed_at ? new Date(reg.closed_at).toLocaleString("id-ID") : "-"}
                  </td>
                  <td className="px-4 py-3">{formatIDR(reg.starting_cash)}</td>
                  <td className="px-4 py-3">{reg.expected_cash != null ? formatIDR(reg.expected_cash) : "-"}</td>
                  <td className="px-4 py-3">{reg.actual_cash != null ? formatIDR(reg.actual_cash) : "-"}</td>
                  <td className="px-4 py-3">
                    {reg.variance != null ? (
                      <span className={`font-medium ${reg.variance === 0 ? "text-emerald-600" : reg.variance < 0 ? "text-red-600" : "text-amber-600"}`}>
                        {reg.variance > 0 ? "+" : ""}{formatIDR(reg.variance)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      reg.status === "open" ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-700"
                    }`}>
                      {reg.status === "open" ? "Aktif" : "Selesai"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
