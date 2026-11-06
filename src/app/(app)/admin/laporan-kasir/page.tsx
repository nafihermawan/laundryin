import { PageShell } from "@/components/app/page-shell";
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

  if (error) {
    return (
      <PageShell title="Laporan Shift Kasir">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">
          Gagal memuat data: {error.message}
        </div>
      </PageShell>
    );
  }

  const registers = (data ?? []) as unknown as CashRegisterRow[];
  const userIds = Array.from(new Set(registers.map((r) => r.user_id).filter(Boolean)));
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
  const profileNameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name?.trim() || ""]));

  return (
    <PageShell title="Laporan Shift Kasir">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="border-b border-slate-200 bg-slate-50/50 text-slate-900">
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
          <tbody className="divide-y divide-slate-100">
            {registers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  Belum ada data shift kasir.
                </td>
              </tr>
            ) : (
              registers.map((reg) => (
                <tr key={reg.id} className="transition-colors hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {profileNameById.get(reg.user_id) || "Tanpa Nama"}
                  </td>
                  <td className="px-4 py-3">{new Date(reg.opened_at).toLocaleString("id-ID")}</td>
                  <td className="px-4 py-3">
                    {reg.closed_at ? new Date(reg.closed_at).toLocaleString("id-ID") : "-"}
                  </td>
                  <td className="px-4 py-3">{formatIDR(reg.starting_cash)}</td>
                  <td className="px-4 py-3">
                    {reg.expected_cash != null ? formatIDR(reg.expected_cash) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {reg.actual_cash != null ? formatIDR(reg.actual_cash) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {reg.variance != null ? (
                      <span
                        className={`font-medium ${
                          reg.variance === 0
                            ? "text-emerald-600"
                            : reg.variance < 0
                              ? "text-red-600"
                              : "text-amber-600"
                        }`}
                      >
                        {reg.variance > 0 ? "+" : ""}
                        {formatIDR(reg.variance)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        reg.status === "open" ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {reg.status === "open" ? "Aktif" : "Selesai"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
