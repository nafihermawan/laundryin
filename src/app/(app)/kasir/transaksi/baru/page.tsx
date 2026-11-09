import { redirect } from "next/navigation";

import type { ServiceOption } from "@/components/ui/service-select";
import { getActiveCashRegister } from "@/lib/auth/cash-register";
import { getSessionProfile } from "@/lib/auth/session";
import { getActiveServices } from "@/lib/data/services";
import { createClient } from "@/lib/supabase/server";

import { TransactionForm } from "./transaction-form";

export const dynamic = "force-dynamic";

export default async function KasirTransaksiBaruPage() {
  const profile = await getSessionProfile();

  if (!profile) redirect("/login");

  const supabase = await createClient();
  const servicesPromise = getActiveServices();

  if (profile.role !== "admin") {
    const shift = await getActiveCashRegister(supabase, profile.id);
    if (!shift.isOpen) redirect("/kasir?buka-shift=1");
  }

  const services: ServiceOption[] = (await servicesPromise).map((service) => ({
    id: service.id,
    name: service.name,
    unit: service.unit,
    base_price: service.base_price,
  }));

  return <TransactionForm services={services} />;
}
