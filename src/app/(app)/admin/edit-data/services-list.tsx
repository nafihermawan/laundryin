"use client";

import { useState, useEffect, useTransition } from "react";
import { saveService, deleteService, type ServiceData } from "./actions";
import { ServiceRow } from "@/lib/data/services";

export function ServicesList({ initialServices }: { initialServices: ServiceRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ServiceData>({
    name: "",
    unit: "kg",
    base_price: 0,
  });
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(t);
  }, [toast]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveService({
        ...formData,
        id: editingId || undefined,
      });

      if (res.success) {
        setFormData({ name: "", unit: "kg", base_price: 0 });
        setIsAdding(false);
        setEditingId(null);
        setToast({ type: "success", message: "Layanan berhasil disimpan." });
      } else {
        setToast({ type: "error", message: res.error || "Gagal menyimpan layanan." });
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus layanan ini?")) return;
    startTransition(async () => {
      const res = await deleteService(id);
      if (res.success) {
        setToast({ type: "success", message: "Layanan berhasil dihapus." });
      } else {
        setToast({ type: "error", message: res.error || "Gagal menghapus layanan." });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {toast ? (
        <div
          className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
              : "border-red-500/30 bg-red-500/10 text-red-600"
          }`}
        >
          <div className="flex-1">{toast.message}</div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-black/5"
            aria-label="Tutup"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">Daftar Layanan</h2>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setFormData({ name: "", unit: "kg", base_price: 0 });
          }}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-sky-500 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-sky-400"
        >
          Tambah Layanan
        </button>
      </div>

      {isAdding || editingId ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <h3 className="mb-4 font-semibold">
            {editingId ? "Edit Layanan" : "Tambah Layanan Baru"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500">Nama Layanan</span>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-10 rounded-xl border border-zinc-200 px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-400/10"
                placeholder="Contoh: Cuci Kering"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500">Satuan</span>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="h-10 rounded-xl border border-zinc-200 px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-400/10"
              >
                <option value="kg">Kg</option>
                <option value="pcs">Pcs</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-zinc-500">Harga per Satuan</span>
              <input
                required
                type="number"
                value={formData.base_price}
                onChange={(e) =>
                  setFormData({ ...formData, base_price: Number(e.target.value) })
                }
                className="h-10 rounded-xl border border-zinc-200 px-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-400/10"
                placeholder="0"
              />
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
              }}
              className="h-9 rounded-lg border border-zinc-200 px-4 text-sm font-medium transition hover:bg-zinc-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="h-9 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Simpan
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-xs font-medium text-zinc-500">
              <th className="px-4 py-3">Nama Layanan</th>
              <th className="px-4 py-3 text-center">Satuan</th>
              <th className="px-4 py-3 text-right">Harga</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {isPending ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  Memproses data...
                </td>
              </tr>
            ) : initialServices.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  Belum ada layanan yang ditambahkan.
                </td>
              </tr>
            ) : (
              initialServices.map((svc) => (
                <tr key={svc.id} className="group hover:bg-zinc-50/50">
                  <td className="px-4 py-3 font-medium">{svc.name}</td>
                  <td className="px-4 py-3 text-center uppercase">{svc.unit}</td>
                  <td className="px-4 py-3 text-right">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      maximumFractionDigits: 0,
                    }).format(svc.base_price)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingId(svc.id!);
                          setFormData({
                            name: svc.name,
                            unit: svc.unit,
                            base_price: svc.base_price,
                          });
                          setIsAdding(false);
                        }}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-sky-600 transition hover:border-sky-200 hover:bg-sky-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(svc.id!)}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-red-600 transition hover:border-red-200 hover:bg-red-50"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
