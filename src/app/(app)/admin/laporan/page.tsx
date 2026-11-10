import { PageShell } from "@/components/app/page-shell";
import { createClient } from "@/lib/supabase/server";

import { LaporanControls } from "./laporan-controls";

type SearchParams = {
  from?: string;
  to?: string;
  method?: string;
  status?: string;
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

function parseMethodParam(value: string | undefined) {
  if (!value) return null;
  if (value === "all") return "all";
  if (value === "cash") return "cash";
  if (value === "transfer") return "transfer";
  if (value === "qris_manual") return "qris_manual";
  if (value === "qris_dynamic") return "qris_dynamic";
  return null;
}

function parseStatusParam(value: string | undefined) {
  if (!value) return null;
  if (value === "all") return "all";
  if (value === "paid") return "paid";
  if (value === "pending") return "pending";
  if (value === "expired") return "expired";
  if (value === "failed") return "failed";
  return null;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default async function AdminLaporanPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const sp = await searchParams;

  const todayKey = getJakartaDateKey(new Date());
  const defaultFromKey = getJakartaDateKey(addDays(new Date(`${todayKey}T00:00:00+07:00`), -6));

  const fromKey = parseDateParam(sp.from) ?? defaultFromKey;
  const toKey = parseDateParam(sp.to) ?? todayKey;
  const methodFilter = parseMethodParam(sp.method) ?? "all";
  const statusFilter = parseStatusParam(sp.status) ?? "paid";

  const fromStart = new Date(`${fromKey}T00:00:00+07:00`);
  const toEndExclusive = addDays(new Date(`${toKey}T00:00:00+07:00`), 1);

  let query = supabase
    .from("payments")
    .select("amount, paid_at, created_at, method, status, provider_ref, orders!inner(order_no)");

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }
  if (methodFilter !== "all") {
    query = query.eq("method", methodFilter);
  }

  if (statusFilter === "paid") {
    query = query
      .gte("paid_at", fromStart.toISOString())
      .lt("paid_at", toEndExclusive.toISOString())
      .order("paid_at", { ascending: true });
  } else {
    query = query
      .gte("created_at", fromStart.toISOString())
      .lt("created_at", toEndExclusive.toISOString())
      .order("created_at", { ascending: true });
  }

  const { data: payments, error } = await query;

  if (error) {
    return (
      <PageShell title="Laporan">
        <p className="text-sm text-red-600">{error.message}</p>
      </PageShell>
    );
  }

  const daily = new Map<string, { dateKey: string; omzet: number; count: number }>();

  for (const p of payments ?? []) {
    const time = (typeof p.paid_at === "string" && p.paid_at) || (typeof p.created_at === "string" && p.created_at);
    if (!time) continue;
    const key = getJakartaDateKey(new Date(time));
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

  return (
    <PageShell title="Laporan">
      <div className="flex flex-col gap-6 pb-24">
        <div className="flex items-center justify-end">
          <LaporanControls fromKey={fromKey} toKey={toKey} method={methodFilter} status={statusFilter} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card p-4">
            <div className="text-xs font-medium text-slate-500">Total Omzet</div>
            <div className="mt-1 font-display text-xl font-bold tracking-tight text-slate-900">
              {formatIDR(totalOmzet)}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-medium text-slate-500">Rata-rata / Hari</div>
            <div className="mt-1 font-display text-xl font-bold tracking-tight text-slate-900">
              {formatIDR(avgOmzet)}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-medium text-slate-500">Transaksi</div>
            <div className="mt-1 font-display text-xl font-bold tracking-tight text-slate-900">
              {totalCount}
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Omzet</th>
                  <th className="px-4 py-3">Transaksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-slate-500">
                      Tidak ada data.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.dateKey} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{r.dateKey}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{formatIDR(r.omzet)}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{r.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 bg-white px-4 py-3">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Detail Transaksi</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Order No</th>
                  <th className="px-4 py-3">Metode</th>
                  <th className="px-4 py-3">Nominal</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Provider Ref (Midtrans)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!payments || payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      Tidak ada data.
                    </td>
                  </tr>
                ) : (
                  payments.map((p, idx) => {
                    const orderNo = (p.orders as unknown as { order_no?: string })?.order_no || "-";
                    const methodLabel = p.method === "qris_dynamic" ? "QRIS Dinamis" : p.method;
                    const time = (typeof p.paid_at === "string" && p.paid_at) || (typeof p.created_at === "string" && p.created_at);
                    const statusLabel = typeof p.status === "string" ? p.status : "-";
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-700">
                          {time ? new Date(time).toLocaleString("id-ID") : "-"}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{orderNo}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium capitalize text-slate-700">
                            {methodLabel.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {formatIDR(Number(p.amount ?? 0))}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{statusLabel}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
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

      <div
        className="fixed inset-x-0 bottom-0 z-30"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto w-full max-w-6xl px-4 pb-2">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
            <div className="flex flex-col">
              <div className="text-xs font-medium text-slate-500">Total Omzet</div>
              <div className="font-display text-base font-bold tracking-tight text-slate-900">
                {formatIDR(totalOmzet)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-slate-500">Transaksi</div>
              <div className="text-sm font-semibold text-slate-900">{totalCount}</div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
