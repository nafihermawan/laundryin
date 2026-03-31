import * as XLSX from "xlsx";

import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth/get-user-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getJakartaDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatJakartaDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function parseDateParam(value: string | null) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("User tidak terautentikasi", { status: 401 });
  }

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") {
    return new Response("Akses ditolak", { status: 403 });
  }

  const url = new URL(req.url);
  const todayKey = getJakartaDateKey(new Date());
  const defaultFromKey = getJakartaDateKey(addDays(new Date(`${todayKey}T00:00:00+07:00`), -6));

  const fromKey = parseDateParam(url.searchParams.get("from")) ?? defaultFromKey;
  const toKey = parseDateParam(url.searchParams.get("to")) ?? todayKey;

  const fromStart = new Date(`${fromKey}T00:00:00+07:00`);
  const toEndExclusive = addDays(new Date(`${toKey}T00:00:00+07:00`), 1);

  const { data: payments, error: payError } = await supabase
    .from("payments")
    .select("id, amount, paid_at, method, provider_ref, orders!inner(order_no)")
    .eq("status", "paid")
    .gte("paid_at", fromStart.toISOString())
    .lt("paid_at", toEndExclusive.toISOString())
    .order("paid_at", { ascending: true });

  if (payError) {
    return new Response(payError.message || "Gagal memuat data laporan", { status: 500 });
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

  const summaryRows: Array<{ dateKey: string; omzet: number; count: number }> = [];
  for (
    let d = new Date(`${fromKey}T00:00:00+07:00`);
    getJakartaDateKey(d) <= toKey;
    d = addDays(d, 1)
  ) {
    const key = getJakartaDateKey(d);
    const v = daily.get(key);
    summaryRows.push({ dateKey: key, omzet: v?.omzet ?? 0, count: v?.count ?? 0 });
  }

  const summaryAoa: Array<Array<string | number>> = [
    ["Tanggal", "Omzet", "Transaksi"],
    ...summaryRows.map((r) => [r.dateKey, r.omzet, r.count]),
  ];

  const detailAoa: Array<Array<string | number>> = [
    ["Waktu Bayar", "Order No", "Metode", "Nominal", "Provider Ref (Midtrans)", "Payment ID"],
    ...(payments ?? []).map((p) => {
      const orderNo = (p.orders as unknown as { order_no?: string })?.order_no || "-";
      const paidAt = typeof p.paid_at === "string" ? formatJakartaDateTime(p.paid_at) : "-";
      const method = typeof p.method === "string" ? p.method : "-";
      const providerRef = typeof p.provider_ref === "string" ? p.provider_ref : "";
      const amount = Number(p.amount ?? 0);
      const id = typeof p.id === "string" ? p.id : "";
      return [paidAt, orderNo, method, amount, providerRef, id];
    }),
  ];

  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");

  const wsDetail = XLSX.utils.aoa_to_sheet(detailAoa);
  wsDetail["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 34 }, { wch: 38 }];
  XLSX.utils.book_append_sheet(wb, wsDetail, "Detail");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const filename = `laporan-${fromKey}_to_${toKey}.xlsx`;

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
