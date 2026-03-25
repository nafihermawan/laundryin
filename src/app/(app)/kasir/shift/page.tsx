import { createClient } from "@/lib/supabase/server";
import { getActiveCashRegister } from "@/lib/auth/cash-register";
import { redirect } from "next/navigation";
import { ShiftForm } from "./shift-form";

export const metadata = {
  title: "Shift Kasir",
};

export default async function ShiftPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const shiftStatus = await getActiveCashRegister(supabase, user.id);

  let expectedCash = 0;
  if (shiftStatus.isOpen && shiftStatus.registerId) {
    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("cash_register_id", shiftStatus.registerId)
      .eq("method", "cash")
      .eq("status", "paid");
      
    const totalCashPayments = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    expectedCash = Number(shiftStatus.startingCash) + totalCashPayments;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          {shiftStatus.isOpen ? "Tutup Shift Kasir" : "Buka Shift Kasir"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {shiftStatus.isOpen
            ? "Hitung uang fisik di laci kasir untuk melakukan rekonsiliasi dan menutup shift Anda."
            : "Masukkan modal awal (uang receh/kembalian) di laci kasir sebelum memulai transaksi."}
        </p>
      </div>

      <div className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <ShiftForm 
          isOpen={shiftStatus.isOpen} 
          registerId={shiftStatus.registerId} 
          expectedCash={expectedCash}
          startingCash={shiftStatus.startingCash}
          openedAt={shiftStatus.openedAt}
        />
      </div>
    </div>
  );
}
