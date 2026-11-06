import { PageShell } from "@/components/app/page-shell";

import { CreateUserForm } from "./create-user-form";

export const metadata = {
  title: "Tambah Pengguna",
};

export default function TambahPenggunaPage() {
  return (
    <PageShell title="Tambah Pengguna">
      <CreateUserForm />
    </PageShell>
  );
}
