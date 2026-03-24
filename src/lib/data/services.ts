import { createClient } from "@/lib/supabase/server";
import { Database } from "../supabase/database.types";

export type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
export type ServiceInsert = Database["public"]["Tables"]["services"]["Insert"];
export type ServiceUpdate = Database["public"]["Tables"]["services"]["Update"];

export async function getAllServices(): Promise<ServiceRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching services:", error);
    throw new Error("Gagal mengambil data layanan");
  }

  return data || [];
}

export async function getActiveServices(): Promise<ServiceRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching active services:", error);
    throw new Error("Gagal mengambil data layanan aktif");
  }

  return data || [];
}

export async function insertService(service: ServiceInsert) {
  const supabase = await createClient();
  const { error } = await supabase.from("services").insert(service);
  if (error) {
    console.error("Error inserting service:", error);
    throw new Error("Gagal menambah layanan");
  }
}

export async function updateService(id: string, service: ServiceUpdate) {
  const supabase = await createClient();
  const { error } = await supabase.from("services").update(service).eq("id", id);
  if (error) {
    console.error("Error updating service:", error);
    throw new Error("Gagal memperbarui layanan");
  }
}

export async function deleteServiceById(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) {
    console.error("Error deleting service:", error);
    throw new Error("Gagal menghapus layanan");
  }
}
