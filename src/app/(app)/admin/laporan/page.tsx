import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  from?: string;
  to?: string;
};

function formatIDR(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getJakartaDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function parseDateParam(value: string | undefined) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default async function AdminLaporanPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();

  const todayKey = getJakartaDateKey(new Date());
  const defaultFromKey = getJakartaDateKey(addDays(new Date(`${todayKey}T00:00:00+07:00`), -6));

  const fromKey = parseDateParam(searchParams.from) ?? defaultFromKey;
  const toKey = parseDateParam(searchParams.to) ?? todayKey;

  const fromStart = new Date(`${fromKey}T00:00:00+07:00`);
  const toEndExclusive = addDays(new Date(`${toKey}T00:00:00+07:00`), 1);

  const { data: payments, error } = await supabase
    .from("payments")
    .select("amount, paid_at, method, provider_ref, orders!inner(order_no)")
    .eq("status", "paid")
    .gte("paid_at", fromStart.toISOString())
    .lt("paid_at", toEndExclusive.toISOString())
    .order("paid_at", { ascending: true });

  if (error) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Laporan</h1>
        <p className="text-sm text-red-600">{error.message}</p>
      </div>
    );
  }

  const daily = new Map<string, { dateKey: string; omzet: number; count: number }>();

  for (const p of payments ?? []) {
    if (!p.paid_at) continue;
    const key = getJakartaDateKey(new Date(p.paid_at));
    const current = daily.get(key) ?? { dateKey: key, omzet: 0, count: 0 };
    current.omzet += Number(p.amount ?? 0);
    current.count += 1;
    daily.set(key, current);
  }

  const rows: { dateKey: string; omzet: number; count: number }[] = [];
  for (
    let d = new Date(`${fromKey}T00:00:00+07:00`);
    getJakartaDateKey(d) <= toKey;
    d = addDays(d, 1)
  ) {
    const key = getJakartaDateKey(d);
    const v = daily.get(key);
    rows.push({ dateKey: key, omzet: v?.omzet ?? 0, count: v?.count ?? 0 });
  }

  const totalOmzet = rows.reduce((sum, r) => sum + r.omzet, 0);
  const totalCount = rows.reduce((sum, r) => sum + r.count, 0);
  const dayCount = Math.max(1, rows.length);
  const avgOmzet = Math.round(totalOmzet / dayCount);
  const downloadHref = `/api/admin/laporan/excel?from=${encodeURIComponent(fromKey)}&to=${encodeURIComponent(toKey)}`;
  return (
    <div className="relative pb-24 lg:pb-0">
      <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Laporan</h1>
          <p className="text-sm text-zinc-600">Ringkasan omzet per hari.</p>
        </div>
        <a
          href={downloadHref}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
        >
          Download Excel
        </a>
      </div>

      <form className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-700">Dari</span>
            <input
              type="date"
              name="from"
              defaultValue={fromKey}
              className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-sky-400/70 focus:ring-4 focus:ring-sky-400/10"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-700">Sampai</span>
            <input
              type="date"
              name="to"
              defaultValue={toKey}
              className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-sky-400/70 focus:ring-4 focus:ring-sky-400/10"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Terapkan
          </button>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-zinc-500">Total Omzet</div>
          <div className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">
            {formatIDR(totalOmzet)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-zinc-500">Rata-rata / Hari</div>
          <div className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">
            {formatIDR(avgOmzet)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-zinc-500">Transaksi Lunas</div>
          <div className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">
            {totalCount}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-xs font-medium text-zinc-500">
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Omzet</th>
                <th className="px-4 py-3">Transaksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-zinc-500">
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.dateKey} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{r.dateKey}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{formatIDR(r.omzet)}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{r.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 bg-white px-4 py-3">
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">Detail Transaksi Lunas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-xs font-medium text-zinc-500">
                <th className="px-4 py-3">Waktu Bayar</th>
                <th className="px-4 py-3">Order No</th>
                <th className="px-4 py-3">Metode</th>
                <th className="px-4 py-3">Nominal</th>
                <th className="px-4 py-3">Provider Ref (Midtrans)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {!payments || payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                    Tidak ada transaksi lunas.
                  </td>
                </tr>
              ) : (
                payments.map((p, idx) => {
                  const orderNo = (p.orders as unknown as { order_no?: string })?.order_no || "-";
                  const methodLabel = p.method === "qris_dynamic" ? "QRIS Dinamis" : p.method;
                  return (
                    <tr key={idx} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-3 text-zinc-700">
                        {p.paid_at ? new Date(p.paid_at).toLocaleString("id-ID") : "-"}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {orderNo}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 capitalize">
                          {methodLabel.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {formatIDR(Number(p.amount ?? 0))}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 font-mono">
                        {p.provider_ref || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      <div className="fixed inset-x-0 bottom-14 z-30">
        <div className="mx-auto w-full max-w-6xl px-4 pb-2">
          <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
            <div className="flex flex-col">
              <div className="text-xs font-medium text-zinc-500">Total Omzet</div>
              <div className="text-base font-semibold tracking-tight text-zinc-900">
                {formatIDR(totalOmzet)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-zinc-500">Transaksi</div>
              <div className="text-sm font-semibold text-zinc-900">{totalCount}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
