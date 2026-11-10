import { PageShell } from "@/components/app/page-shell";
import { createClient } from "@/lib/supabase/server";
import { getActiveCashRegister, getShiftCashTotal } from "@/lib/auth/cash-register";
import { getSessionProfile } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ShiftForm } from "./shift-form";

export const metadata = {
  title: "Shift Kasir",
};

export default async function ShiftPage() {
  const profile = await getSessionProfile();

  if (!profile) {
    redirect("/login");
  }

  const supabase = await createClient();
  const shiftStatus = await getActiveCashRegister(supabase, profile.id);

  let expectedCash = 0;
  if (shiftStatus.isOpen && shiftStatus.registerId) {
    const totalCashPayments = await getShiftCashTotal(supabase, shiftStatus.registerId);
    expectedCash = Number(shiftStatus.startingCash) + totalCashPayments;
  }

  return (
    <PageShell title="Shift Kasir">
      <div className="flex flex-col gap-6">
        <p className="text-sm text-slate-500">
          {shiftStatus.isOpen
            ? "Hitung uang fisik di laci kasir untuk melakukan rekonsiliasi dan menutup shift Anda."
            : "Masukkan modal awal (uang receh/kembalian) di laci kasir sebelum memulai transaksi."}
        </p>

        <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6">
          <ShiftForm
            isOpen={shiftStatus.isOpen}
            registerId={shiftStatus.registerId}
            expectedCash={expectedCash}
            startingCash={shiftStatus.startingCash}
            openedAt={shiftStatus.openedAt}
          />
        </div>
      </div>
    </PageShell>
  );
}
