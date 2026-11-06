"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { ServiceSelect, type ServiceOption } from "@/components/ui/service-select";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/browser";
import { useKeyboardOpen } from "@/lib/use-keyboard-open";

import { saveTransaction } from "./actions";

type ItemRow = {
  id: string;
  serviceId: string | null;
  serviceName: string;
  unit: string;
  qty: number;
  price: number;
};

function formatRp(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(value))}`;
}

function formatPhone(digits: string) {
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function toLocalInput(date: Date) {
  const off = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - off).toISOString().slice(0, 16);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDisplay(localStr: string) {
  if (!localStr) return "-";
  const d = new Date(localStr);
  if (!Number.isFinite(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mx-1 mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

let itemSeq = 1;
function newItem(): ItemRow {
  return { id: `item-${itemSeq++}`, serviceId: null, serviceName: "", unit: "kg", qty: 1, price: 0 };
}

export function TransactionForm() {
  const router = useRouter();
  const { show } = useToast();
  const keyboardOpen = useKeyboardOpen();

  const [services, setServices] = useState<ServiceOption[]>([]);

  const [receivedAt, setReceivedAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [items, setItems] = useState<ItemRow[]>([newItem()]);
  const [openSelectId, setOpenSelectId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);
  const dueRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("services")
      .select("id, name, unit, base_price")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        if (data) setServices(data as ServiceOption[]);
      });
  }, []);

  useEffect(() => {
    const now = new Date();
    const init = () => {
      setReceivedAt(toLocalInput(now));
      setDueAt(toLocalInput(addDays(now, 2)));
    };
    init();
  }, []);

  useEffect(() => {
    if (showNote) noteRef.current?.focus();
  }, [showNote]);

  const total = useMemo(
    () => items.reduce((sum, it) => sum + Math.max(0, it.qty) * Math.max(0, it.price), 0),
    [items],
  );
  const serviceCount = items.filter((it) => it.serviceName).length;

  const dirty =
    name.trim() !== "" ||
    phone.trim() !== "" ||
    note.trim() !== "" ||
    items.some((it) => it.serviceName !== "");

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function chipDue(days: number) {
    if (!receivedAt) return "";
    return toLocalInput(addDays(new Date(receivedAt), days));
  }

  function updateItem(id: string, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id: string) {
    setItems((prev) => {
      if (prev.length <= 1) {
        return prev.map((it) => (it.id === id ? newItem() : it));
      }
      return prev.filter((it) => it.id !== id);
    });
  }

  function addItem() {
    const item = newItem();
    setItems((prev) => [...prev, item]);
    setOpenSelectId(item.id);
  }

  function resetForm() {
    const now = new Date();
    setName("");
    setPhone("");
    setNote("");
    setShowNote(false);
    setItems([newItem()]);
    setOpenSelectId(null);
    setErrors({});
    setReceivedAt(toLocalInput(now));
    setDueAt(toLocalInput(addDays(now, 2)));
    setConfirmClear(false);
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Nama wajib diisi";
    if (!phone.trim()) e.phone = "No. HP wajib diisi";
    if (items.filter((it) => it.serviceName && it.qty > 0).length === 0) e.items = "Pilih minimal 1 layanan";
    if (receivedAt && dueAt && new Date(dueAt).getTime() < new Date(receivedAt).getTime()) {
      e.due = "Estimasi tidak boleh sebelum waktu masuk";
    }
    return e;
  }

  function focusFirstError(keys: string[]) {
    const map: Record<string, React.RefObject<HTMLElement | null>> = {
      name: nameRef,
      phone: phoneRef,
      items: itemsRef,
      due: dueRef,
    };
    for (const key of ["name", "phone", "items", "due"]) {
      if (keys.includes(key)) {
        const el = map[key]?.current;
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.focus?.();
        return;
      }
    }
  }

  async function handleSave() {
    if (saving) return;
    const e = validate();
    setErrors(e);
    const keys = Object.keys(e);
    if (keys.length > 0) {
      focusFirstError(keys);
      show(e[keys[0]], { type: "error" });
      return;
    }

    setSaving(true);
    const validItems = items
      .filter((it) => it.serviceName && it.qty > 0)
      .map((it) => ({ serviceName: it.serviceName, unit: it.unit, qty: it.qty, price: it.price }));

    const res = await saveTransaction({
      customer: { name: name.trim(), phone, notes: note },
      items: validItems,
      status: "diterima",
      paymentMethod: "cash",
      skipPayment: true,
      receivedAt,
      dueAt,
      total,
    });

    if (!res.success) {
      setSaving(false);
      show(res.error || "Gagal menyimpan transaksi", {
        type: "error",
        actionLabel: "Coba lagi",
        onAction: () => {
          void handleSave();
        },
      });
      return;
    }

    // Keep the loading state until the payment page starts rendering.
    router.replace(`/transaksi/${res.data.orderId}/bayar?baru=1`);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <PageHeader
        title="Transaksi Baru"
        fallbackHref="/kasir"
        onBack={() => {
          if (dirty) setConfirmLeave(true);
          else router.back();
        }}
      />

      <main
        className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4"
        style={{ paddingBottom: "calc(112px + env(safe-area-inset-bottom))" }}
      >
        <div className="flex flex-col gap-5">
          <Section title="Pelanggan">
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4">
              <Field label="Nama" htmlFor="custName" error={errors.name}>
                <input
                  id="custName"
                  ref={nameRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama pelanggan"
                  className={inputClass}
                />
              </Field>

              <Field label="No. HP" htmlFor="custPhone" error={errors.phone}>
                <input
                  id="custPhone"
                  ref={phoneRef}
                  type="tel"
                  inputMode="tel"
                  value={formatPhone(phone)}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="08xxxxxxxxxx"
                  className={`${inputClass} tabular-nums`}
                />
              </Field>

              {showNote || note ? (
                <Field label="Catatan (opsional)" htmlFor="custNote">
                  <textarea
                    id="custNote"
                    ref={noteRef}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="min-h-[88px] w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </Field>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNote(true)}
                  className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-indigo-600"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                  Tambah catatan
                </button>
              )}
            </div>
          </Section>

          <Section title="Layanan">
            <div ref={itemsRef} tabIndex={-1} className="flex flex-col gap-2 outline-none">
              <ol className="flex list-none flex-col gap-2">
                {items.map((item) => (
                  <li key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
                    <div className="flex items-center gap-2">
                      <ServiceSelect
                        open={openSelectId === item.id}
                        onOpenChange={(open) => setOpenSelectId(open ? item.id : null)}
                        services={services}
                        value={item.serviceId}
                        onChange={(service) =>
                          updateItem(item.id, {
                            serviceId: service.id,
                            serviceName: service.name,
                            unit: service.unit,
                            price: service.base_price,
                            qty: service.unit === "kg" ? Math.max(0.5, item.qty) : Math.max(1, item.qty),
                          })
                        }
                      />
                      <button
                        type="button"
                        aria-label={`Hapus ${item.serviceName || "layanan"}`}
                        onClick={() => removeItem(item.id)}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-slate-200 text-slate-500"
                      >
                        <Trash2 className="h-5 w-5" strokeWidth={2} />
                      </button>
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <QtyStepper
                        qty={item.qty}
                        unit={item.unit}
                        onChange={(qty) => updateItem(item.id, { qty })}
                      />
                      <div className="flex flex-col items-end gap-0.5 text-right">
                        <span className="text-xs tabular-nums text-slate-500">
                          × {formatRp(item.price)} / {item.unit}
                        </span>
                        <span className="text-[15px] font-bold tabular-nums text-slate-900">
                          {formatRp(item.qty * item.price)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>

              {errors.items ? <p className="mx-1 text-xs text-red-600">{errors.items}</p> : null}

              <button
                type="button"
                onClick={addItem}
                className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-slate-300 bg-transparent text-sm font-semibold text-indigo-600"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Tambah layanan
              </button>
            </div>
          </Section>

          <Section title="Waktu">
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Masuk</span>
                <span className="text-sm font-semibold tabular-nums text-slate-900">{formatDisplay(receivedAt)}</span>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <fieldset className="m-0 min-w-0 border-0 p-0">
                  <legend className="mb-2.5 border-0 p-0 text-sm font-medium text-slate-900">Estimasi selesai</legend>

                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3].map((n) => {
                      const active = dueAt !== "" && dueAt === chipDue(n);
                      return (
                        <button
                          key={n}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setDueAt(chipDue(n))}
                          className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors ${
                            active
                              ? "border border-indigo-600 bg-indigo-50 font-semibold text-indigo-600"
                              : "border border-slate-200 bg-white font-medium text-slate-600"
                          }`}
                        >
                          {active ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
                          {n} hari
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative mt-3 flex h-11 items-center justify-between rounded-[10px] border border-slate-200 bg-white px-3">
                    <span className="text-[15px] tabular-nums text-slate-900">{formatDisplay(dueAt)}</span>
                    <CalendarDays className="h-4 w-4 text-slate-400" strokeWidth={2} />
                    <input
                      ref={dueRef}
                      type="datetime-local"
                      value={dueAt}
                      onChange={(e) => setDueAt(e.target.value)}
                      aria-label="Estimasi selesai"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </div>
                  {errors.due ? <p className="mt-1.5 text-xs text-red-600">{errors.due}</p> : null}
                </fieldset>
              </div>
            </div>
          </Section>

          <button
            type="button"
            onClick={() => (dirty ? setConfirmClear(true) : resetForm())}
            className="mx-auto inline-flex min-h-11 items-center text-sm font-medium text-slate-500 underline"
          >
            Kosongkan form
          </button>
        </div>
      </main>

      {!keyboardOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white">
          <div
            className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 pt-3"
            style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs text-slate-500">Total · {serviceCount} layanan</span>
              <span className="whitespace-nowrap font-display text-[20px] font-bold tabular-nums text-slate-900">
                {formatRp(total)}
              </span>
            </div>
            <Button size="lg" onClick={handleSave} loading={saving} loadingText="Menyimpan…">
              Simpan transaksi
            </Button>
          </div>
        </div>
      ) : null}

      {confirmClear ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">Kosongkan semua isian?</h2>
            <div className="mt-5 flex flex-col gap-2">
              <Button onClick={resetForm}>Kosongkan</Button>
              <Button variant="outline" onClick={() => setConfirmClear(false)}>
                Batal
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmLeave ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">Batalkan transaksi ini?</h2>
            <p className="mt-1 text-sm text-slate-500">Isian akan hilang.</p>
            <div className="mt-5 flex flex-col gap-2">
              <Button
                onClick={() => {
                  setConfirmLeave(false);
                  router.back();
                }}
              >
                Batalkan
              </Button>
              <Button variant="outline" onClick={() => setConfirmLeave(false)}>
                Lanjut isi
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
