import { PageShell } from "@/components/app/page-shell";

import { TransactionForm } from "./transaction-form";

export const dynamic = "force-dynamic";

export default function KasirTransaksiBaruPage() {
  return (
    <PageShell title="Buat Transaksi">
      <TransactionForm />
    </PageShell>
  );
}
