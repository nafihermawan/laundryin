import { PageShell } from "@/components/app/page-shell";
import { getAccount } from "@/lib/auth/get-account";
import { listUsers } from "@/lib/data/users";

import { PenggunaList } from "./pengguna-list";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pengguna",
};

export default async function PenggunaPage() {
  const [users, account] = await Promise.all([listUsers(), getAccount()]);

  return (
    <PageShell title="Pengguna">
      <PenggunaList users={users} currentUserId={account?.id ?? ""} />
    </PageShell>
  );
}
