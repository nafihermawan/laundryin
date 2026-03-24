import { TransactionForm } from "./transaction-form";

export const dynamic = "force-dynamic";

export default function KasirTransaksiBaruPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Buat Transaksi</h1>
        <p className="text-sm text-zinc-600">
          Input pelanggan dan item layanan untuk membuat nota.
        </p>
      </div>

      <TransactionForm />
    </div>
  );
}
