// ESC/POS receipt builder (pure, no DOM). Produces the raw byte stream sent to a
// Bluetooth thermal printer. Text-only (no raster) so it works on 58mm/80mm.

import { STORE_PHONE } from "@/lib/store-config";

export type ReceiptItem = {
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
};

export type ReceiptPayment = {
  method: string;
  amount: number;
  paidAt?: string | null;
  referenceNo?: string | null;
  notes?: string | null;
};

export type ReceiptModel = {
  orderNo: string;
  receivedAt: string;
  dueAt?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  items: ReceiptItem[];
  total: number;
  paid: ReceiptPayment | null;
  notes?: string | null;
  brand?: string;
};

const ESC = 0x1b;
const GS = 0x1d;

// Keep everything printable-ASCII; thermal defaults are CP437-ish. Non-ASCII
// punctuation (·, ×, →, quotes, dashes) is folded to ASCII so it never prints
// as a garbage glyph.
function sanitize(value: string): string {
  return value
    .replace(/\u2192/g, "->")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u00b7\u2022]/g, "-")
    .replace(/\u00d7/g, "x")
    .replace(/\u2026/g, "...")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7e]/g, "");
}

function encode(value: string): number[] {
  const bytes: number[] = [];
  for (const ch of sanitize(value)) bytes.push(ch.charCodeAt(0) & 0xff);
  return bytes;
}

export function formatRupiah(value: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(value))}`;
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function paymentMethodLabel(method?: string | null): string {
  if (!method) return "\u2013";
  switch (method.toLowerCase()) {
    case "cash":
      return "Tunai";
    case "qris_dynamic":
    case "qris":
      return "QRIS";
    case "qris_manual":
      return "QRIS Manual";
    case "transfer":
      return "Transfer";
    default:
      return method;
  }
}

export function parseCashBreakdown(notes?: string | null): {
  cashReceived: number | null;
  change: number | null;
} {
  if (!notes) return { cashReceived: null, change: null };
  const toNumber = (match: RegExpExecArray | null) => {
    if (!match) return null;
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : null;
  };
  return {
    cashReceived: toNumber(/cash_received=([0-9.]+)/.exec(notes)),
    change: toNumber(/change=([0-9.]+)/.exec(notes)),
  };
}

export function buildReceiptEscPos(receipt: ReceiptModel, opts: { width: number }): Uint8Array {
  const width = opts.width;
  const out: number[] = [];

  const raw = (bytes: number[]) => out.push(...bytes);
  const line = (value = "") => raw([...encode(value), 0x0a]);
  const center = () => raw([ESC, 0x61, 0x01]);
  const alignLeft = () => raw([ESC, 0x61, 0x00]);
  const bold = (on: boolean) => raw([ESC, 0x45, on ? 1 : 0]);
  const dbl = (on: boolean) => raw([GS, 0x21, on ? 0x11 : 0x00]);

  const rule = () => line("-".repeat(width));
  const dashed = () => line("- ".repeat(Math.ceil(width / 2)).slice(0, width).trimEnd());

  // Wrap a string per word so words are never split across lines.
  const wrapWords = (value: string): string[] => {
    const words = sanitize(value).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > width && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  };

  // Label on the left, value on the right; long values wrap below the label.
  const cols = (l: string, r: string) => {
    const left = sanitize(l);
    const right = sanitize(r);
    if (left.length + 1 + right.length <= width) {
      line(left + " ".repeat(width - left.length - right.length) + right);
      return;
    }
    line(left);
    wrapWords(right).forEach((wrapped) => line(`  ${wrapped}`));
  };

  const wrap = (value: string, prefix = "", indent = "") => {
    const words = sanitize(value).split(/\s+/).filter(Boolean);
    const firstWidth = width - prefix.length;
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      const limit = lines.length === 0 ? firstWidth : width - indent.length;
      if (candidate.length > limit && current) {
        lines.push(current);
        current = w;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    if (lines.length === 0) lines.push("");
    line(prefix + lines[0]);
    for (let i = 1; i < lines.length; i++) line(indent + lines[i]);
  };

  const centered = (value: string) => {
    for (const wrapped of wrapWords(value)) line(wrapped);
  };

  // Header
  raw([ESC, 0x40]); // init
  center();
  dbl(true);
  bold(true);
  line(receipt.brand ?? "laundry.in");
  dbl(false);
  bold(false);
  line(`Telp ${STORE_PHONE}`);
  line("Nota transaksi");
  alignLeft();
  rule();

  cols("No. Order", receipt.orderNo);
  cols("Masuk", formatDateTime(receipt.receivedAt));
  if (receipt.dueAt) cols("Estimasi", formatDateTime(receipt.dueAt));
  cols("Pelanggan", receipt.customerName || "-");
  if (receipt.customerPhone) line(`  ${sanitize(receipt.customerPhone)}`);
  rule();

  line("ITEM");
  for (const it of receipt.items) {
    wrap(it.name);
    cols(`  ${it.qty} ${it.unit} x ${formatRupiah(it.unitPrice)}`, formatRupiah(it.subtotal));
  }
  rule();

  bold(true);
  cols("TOTAL", formatRupiah(receipt.total));
  bold(false);

  const paid = receipt.paid;
  const isPaid = paid !== null;
  const isCash = paid !== null && paid.method.toLowerCase() === "cash";
  const { cashReceived, change } = parseCashBreakdown(paid?.notes);

  cols("Metode pembayaran", paymentMethodLabel(paid?.method));
  cols("Status", isPaid ? "Lunas" : "Belum bayar");
  if (isPaid && paid?.paidAt) cols("Dibayar", formatDateTime(paid.paidAt));

  if (!isPaid) {
    bold(true);
    cols("Sisa tagihan", formatRupiah(receipt.total));
    bold(false);
  } else if (isCash) {
    if (cashReceived !== null) cols("Diterima", formatRupiah(cashReceived));
    if (change !== null) cols("Kembalian", formatRupiah(change));
  }

  if (receipt.notes) {
    rule();
    line("CATATAN");
    wrap(receipt.notes);
  }

  // Reminder — bold, centered, framed by dashed rules.
  dashed();
  bold(true);
  center();
  centered("Harap bawa nota ini saat mengambil cucian.");
  alignLeft();
  bold(false);
  dashed();

  // Closing
  center();
  centered("Periksa kembali cucian Anda sebelum meninggalkan tempat.");
  bold(true);
  centered("Terima kasih telah mempercayakan cucian Anda kepada kami.");
  bold(false);
  alignLeft();
  line();
  line();
  line();
  raw([GS, 0x56, 0x42, 0x00]); // feed + partial cut

  return new Uint8Array(out);
}
