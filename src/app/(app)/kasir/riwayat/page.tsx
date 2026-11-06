import { PageShell } from "@/components/app/page-shell";
import { TransactionList } from "@/components/app/transaction-list";
import { getAllTransactions } from "@/lib/data/transactions";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  payment?: string;
  from?: string;
  to?: string;
};

function parseStatus(value: string | undefined) {
  if (value === "diterima" || value === "siap" || value === "diambil") return value;
  return "semua";
}

function parsePayment(value: string | undefined): "semua" | "paid" | "unpaid" {
  if (value === "paid" || value === "unpaid") return value;
  return "semua";
}

function parseDate(value: string | undefined) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return "";
}

export default async function KasirRiwayatPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const transactions = await getAllTransactions();
  const sp = await searchParams;

  return (
    <PageShell title="Riwayat Transaksi">
      <div className="flex flex-col gap-6">
        <TransactionList
          initialTransactions={transactions}
          initialStatus={parseStatus(sp.status)}
          initialPayment={parsePayment(sp.payment)}
          initialFrom={parseDate(sp.from)}
          initialTo={parseDate(sp.to)}
        />
      </div>
    </PageShell>
  );
}
