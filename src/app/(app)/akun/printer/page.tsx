import { redirect } from "next/navigation";

import { PageShell } from "@/components/app/page-shell";
import { PrinterSettings } from "@/components/app/printer-settings";
import { getAccount } from "@/lib/auth/get-account";

export const metadata = {
  title: "Printer",
};

export default async function PrinterPage() {
  const account = await getAccount();
  if (!account) redirect("/login");

  const backHref = account.role === "admin" ? "/admin/akun" : "/kasir/akun";

  return (
    <PageShell title="Printer" fallbackHref={backHref}>
      <PrinterSettings />
    </PageShell>
  );
}
