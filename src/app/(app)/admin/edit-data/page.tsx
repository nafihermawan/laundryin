import { ServicesList } from "./services-list";
import { getAllServices } from "@/lib/data/services";

export default async function AdminEditDataPage() {
  const services = await getAllServices();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Pengaturan Layanan</h1>
        <p className="text-sm text-zinc-600">
          Kelola daftar layanan, satuan, dan harga standar untuk kasir.
        </p>
      </div>

      <ServicesList initialServices={services} />
    </div>
  );
}
