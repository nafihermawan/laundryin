import { notFound } from "next/navigation";

import { PageShell } from "@/components/app/page-shell";
import { getAccount } from "@/lib/auth/get-account";
import { getUserById } from "@/lib/data/users";

import { PenggunaDetail } from "./pengguna-detail";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Detail Pengguna",
};

export default async function DetailPenggunaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, account] = await Promise.all([getUserById(id), getAccount()]);

  if (!user) notFound();

  return (
    <PageShell title="Detail Pengguna">
      <PenggunaDetail user={user} currentUserId={account?.id ?? ""} />
    </PageShell>
  );
}
