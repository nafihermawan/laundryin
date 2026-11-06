import { redirect } from "next/navigation";

import { getActiveCashRegister } from "@/lib/auth/cash-register";
import { getUserRole } from "@/lib/auth/get-user-role";
import { createClient } from "@/lib/supabase/server";

import { TransactionForm } from "./transaction-form";

export const dynamic = "force-dynamic";

export default async function KasirTransaksiBaruPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getUserRole(supabase, user.id);
  if (role !== "admin") {
    const shift = await getActiveCashRegister(supabase, user.id);
    if (!shift.isOpen) redirect("/kasir?buka-shift=1");
  }

  return <TransactionForm />;
}
