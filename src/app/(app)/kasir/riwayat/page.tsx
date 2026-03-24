import { TransactionList } from "./transaction-list";
import { getAllTransactions } from "@/lib/data/transactions";

export const dynamic = "force-dynamic";

export default async function KasirRiwayatPage() {
  const transactions = await getAllTransactions();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Riwayat Transaksi</h1>
        <p className="text-sm text-zinc-600">
          Kelola transaksi masuk, pantau status pengerjaan, dan cetak ulang nota.
        </p>
      </div>

      <TransactionList initialTransactions={transactions} />
    </div>
  );
}
