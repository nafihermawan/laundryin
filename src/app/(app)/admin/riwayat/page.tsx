import { PageShell } from "@/components/app/page-shell";
import { TransactionList } from "@/components/app/transaction-list";
import { getAllTransactions } from "@/lib/data/transactions";

export const dynamic = "force-dynamic";

function jakartaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function AdminRiwayatPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; status?: string }>;
}) {
  const transactions = await getAllTransactions();
  const sp = await searchParams;

  let initialStatus = "semua";
  let initialPayment: "semua" | "paid" | "unpaid" = "semua";
  let initialFrom = "";
  let initialTo = "";

  if (sp.filter === "hari-ini") {
    const today = jakartaToday();
    initialFrom = today;
    initialTo = today;
  } else if (sp.status === "siap-diambil") {
    initialStatus = "siap";
  } else if (sp.status === "belum-bayar") {
    initialPayment = "unpaid";
  }

  return (
    <PageShell title="Riwayat Transaksi">
      <div className="flex flex-col gap-6">
        <TransactionList
          initialTransactions={transactions}
          initialStatus={initialStatus}
          initialPayment={initialPayment}
          initialFrom={initialFrom}
          initialTo={initialTo}
        />
      </div>
    </PageShell>
  );
}
