import { redirect } from "next/navigation";

import { AccountScreen } from "@/components/app/account-screen";
import { PageShell } from "@/components/app/page-shell";
import { APP_VERSION } from "@/lib/app-version";
import { getAccount } from "@/lib/auth/get-account";

export const metadata = {
  title: "Akun",
};

export default async function AdminAkunPage() {
  const account = await getAccount();
  if (!account) redirect("/login");

  return (
    <PageShell title="Akun" fallbackHref="/admin">
      <AccountScreen
        name={account.name}
        email={account.email}
        role={account.role}
        version={APP_VERSION}
      />
    </PageShell>
  );
}
