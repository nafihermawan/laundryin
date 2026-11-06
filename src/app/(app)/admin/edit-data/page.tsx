import { PageShell } from "@/components/app/page-shell";
import { getAllServices } from "@/lib/data/services";

import { ServicesList } from "./services-list";

export const metadata = {
  title: "Layanan & Harga",
};

export default async function AdminEditDataPage() {
  const services = await getAllServices();

  return (
    <PageShell title="Layanan & Harga">
      <ServicesList initialServices={services} />
    </PageShell>
  );
}
