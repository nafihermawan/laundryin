import { createClient } from "@/lib/supabase/server";
import { Database } from "../supabase/database.types";

export type TransactionRow = Database["public"]["Tables"]["orders"]["Row"] & {
  customer: Pick<Database["public"]["Tables"]["customers"]["Row"], "name" | "phone"> | null;
  payments: Pick<Database["public"]["Tables"]["payments"]["Row"], "amount" | "method" | "status">[];
  order_items: Database["public"]["Tables"]["order_items"]["Row"][];
  created_by_profile?: { full_name?: string | null } | null;
};

export async function getAllTransactions(): Promise<TransactionRow[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      customer:customers(name, phone),
      payments(amount, method, status),
      order_items(*)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching transactions:", error);
    throw new Error("Gagal mengambil data transaksi");
  }

  const orders = (data as unknown) as TransactionRow[];

  const userIds = Array.from(
    new Set(
      orders
        .map((o) => o.created_by)
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    ),
  );

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    if (!profilesError) {
      const byId = new Map<string, { full_name?: string | null }>();
      for (const p of profiles ?? []) {
        if (p?.id) byId.set(p.id, { full_name: p.full_name ?? null });
      }

      for (const order of orders) {
        if (order.created_by) {
          order.created_by_profile = byId.get(order.created_by);
        }
      }
    }
  }

  return orders;
}
