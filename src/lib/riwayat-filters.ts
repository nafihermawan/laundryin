export type Cucian = "semua" | "diterima" | "siap-diambil" | "diambil";
export type Bayar = "semua" | "lunas" | "belum";
export type TanggalPreset = "none" | "hari-ini" | "7-hari" | "30-hari" | "custom";

export type Filters = {
  cucian: Cucian;
  bayar: Bayar;
  tanggal: TanggalPreset;
  dari: string;
  sampai: string;
};

export const DEFAULT_FILTERS: Filters = {
  cucian: "semua",
  bayar: "semua",
  tanggal: "none",
  dari: "",
  sampai: "",
};

function toDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function jakartaToday() {
  return toDateKey(new Date());
}

function addDays(dateKey: string, delta: number) {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function effectiveRange(f: Filters): { dari: string; sampai: string } {
  if (f.tanggal === "none") return { dari: "", sampai: "" };
  if (f.tanggal === "custom") return { dari: f.dari, sampai: f.sampai };
  const today = jakartaToday();
  const back = f.tanggal === "hari-ini" ? 0 : f.tanggal === "7-hari" ? 6 : 29;
  return { dari: addDays(today, -back), sampai: today };
}

function detectPreset(dari: string, sampai: string): TanggalPreset {
  if (!dari && !sampai) return "none";
  const today = jakartaToday();
  if (dari === today && sampai === today) return "hari-ini";
  if (sampai === today && dari === addDays(today, -6)) return "7-hari";
  if (sampai === today && dari === addDays(today, -29)) return "30-hari";
  return "custom";
}

function isDateKey(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseFilters(sp: {
  status?: string;
  bayar?: string;
  dari?: string;
  sampai?: string;
  filter?: string;
}): Filters {
  let cucian: Cucian = "semua";
  let bayar: Bayar = "semua";

  const status = sp.status;
  if (status === "belum-bayar") bayar = "belum";
  else if (status === "siap" || status === "siap-diambil") cucian = "siap-diambil";
  else if (status === "diterima" || status === "diproses") cucian = "diterima";
  else if (status === "diambil") cucian = "diambil";

  if (sp.bayar === "lunas") bayar = "lunas";
  else if (sp.bayar === "belum") bayar = "belum";

  let dari = isDateKey(sp.dari) ? sp.dari : "";
  let sampai = isDateKey(sp.sampai) ? sp.sampai : "";

  if (sp.filter === "hari-ini") {
    const today = jakartaToday();
    dari = today;
    sampai = today;
  }

  return { cucian, bayar, tanggal: detectPreset(dari, sampai), dari, sampai };
}

export function filtersToQuery(f: Filters, q: string) {
  const params = new URLSearchParams();
  const query = q.trim();
  if (query) params.set("q", query);
  if (f.cucian !== "semua") params.set("status", f.cucian);
  if (f.bayar !== "semua") params.set("bayar", f.bayar);
  const range = effectiveRange(f);
  if (range.dari) params.set("dari", range.dari);
  if (range.sampai) params.set("sampai", range.sampai);
  return params;
}

export function normalizeCucian(status: string): "diterima" | "siap" | "diambil" | string {
  if (status === "diproses") return "diterima";
  return status;
}
