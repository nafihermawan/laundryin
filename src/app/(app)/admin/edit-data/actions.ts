"use server";

import { revalidatePath } from "next/cache";
import { ActionResponse, success, error } from "@/lib/action-response";
import {
  insertService,
  updateService,
  deleteServiceById,
} from "@/lib/data/services";

export type ServiceData = {
  id?: string;
  name: string;
  unit: string;
  base_price: number;
  is_active?: boolean;
};

export async function saveService(data: ServiceData): Promise<ActionResponse> {
  try {
    if (data.id) {
      await updateService(data.id, {
        name: data.name,
        unit: data.unit,
        base_price: data.base_price,
        is_active: data.is_active ?? true,
      });
    } else {
      await insertService({
        name: data.name,
        unit: data.unit,
        base_price: data.base_price,
        is_active: true,
      });
    }

    revalidatePath("/admin/edit-data");
    revalidatePath("/kasir/transaksi/baru"); // update transactions as well
    return success(undefined);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menyimpan layanan";
    return error(message);
  }
}

export async function deleteService(id: string): Promise<ActionResponse> {
  try {
    await deleteServiceById(id);
    revalidatePath("/admin/edit-data");
    revalidatePath("/kasir/transaksi/baru");
    return success(undefined);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal menghapus layanan";
    return error(message);
  }
}
