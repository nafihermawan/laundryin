import { createClient } from "@/lib/supabase/server";
import { Database } from "../supabase/database.types";

export type TransactionRow = Database["public"]["Tables"]["orders"]["Row"] & {
  customer: Pick<Database["public"]["Tables"]["customers"]["Row"], "name" | "phone"> | null;
  payments: Pick<Database["public"]["Tables"]["payments"]["Row"], "amount" | "method" | "status">[];
  order_items: Database["public"]["Tables"]["order_items"]["Row"][];
};

export async function getAllTransactions(): Promise<TransactionRow[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_no,
      status,
      received_at,
      created_by,
      customer:customers(name, phone),
      payments(amount, status),
      order_items(subtotal)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching transactions:", error);
    throw new Error("Gagal mengambil data transaksi");
  }

  const orders = (data as unknown) as TransactionRow[];

  return orders;
}
