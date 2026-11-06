import { PageShell } from "@/components/app/page-shell";
import { TransactionList } from "@/components/app/transaction-list";
import { getAllTransactions } from "@/lib/data/transactions";
import { parseFilters } from "@/lib/riwayat-filters";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  bayar?: string;
  dari?: string;
  sampai?: string;
  filter?: string;
  q?: string;
};

export default async function AdminRiwayatPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const transactions = await getAllTransactions();
  const sp = await searchParams;

  return (
    <PageShell title="Riwayat Transaksi" fallbackHref="/admin" contentClassName="pt-4">
      <TransactionList
        initialTransactions={transactions}
        initialFilters={parseFilters(sp)}
        initialQuery={sp.q ?? ""}
        detailBasePath="/kasir/riwayat"
      />
    </PageShell>
  );
}
