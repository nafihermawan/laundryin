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

function parseMethodParam(value: string | null) {
  if (!value) return null;
  if (value === "all") return "all";
  if (value === "cash") return "cash";
  if (value === "transfer") return "transfer";
  if (value === "qris_manual") return "qris_manual";
  if (value === "qris_dynamic") return "qris_dynamic";
  return null;
}

function parseStatusParam(value: string | null) {
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
  const methodFilter = parseMethodParam(url.searchParams.get("method")) ?? "all";
  const statusFilter = parseStatusParam(url.searchParams.get("status")) ?? "paid";

  const fromStart = new Date(`${fromKey}T00:00:00+07:00`);
  const toEndExclusive = addDays(new Date(`${toKey}T00:00:00+07:00`), 1);

  let query = supabase
    .from("payments")
    .select("id, amount, paid_at, created_at, method, status, provider_ref, orders!inner(order_no)");

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

  const { data: payments, error: payError } = await query;

  if (payError) {
    return new Response(payError.message || "Gagal memuat data laporan", { status: 500 });
  }

  const detailAoa: Array<Array<string | number>> = [
    ["Waktu", "Order No", "Metode", "Nominal", "Status", "Provider Ref (Midtrans)", "Payment ID"],
    ...(payments ?? []).map((p) => {
      const orderNo = (p.orders as unknown as { order_no?: string })?.order_no || "-";
      const time =
        (typeof p.paid_at === "string" && p.paid_at) || (typeof p.created_at === "string" && p.created_at);
      const dateTime = time ? formatJakartaDateTime(time) : "-";
      const method = typeof p.method === "string" ? p.method : "-";
      const status = typeof p.status === "string" ? p.status : "-";
      const providerRef = typeof p.provider_ref === "string" ? p.provider_ref : "";
      const amount = Number(p.amount ?? 0);
      const id = typeof p.id === "string" ? p.id : "";
      return [dateTime, orderNo, method, amount, status, providerRef, id];
    }),
  ];

  const wb = XLSX.utils.book_new();

  const wsDetail = XLSX.utils.aoa_to_sheet(detailAoa);
  wsDetail["!cols"] = [
    { wch: 22 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 34 },
    { wch: 38 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, "Detail Transaksi");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const filename = `laporan-detail-${fromKey}_to_${toKey}-${statusFilter}-${methodFilter}.xlsx`;

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
