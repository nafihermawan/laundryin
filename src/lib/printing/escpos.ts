// ESC/POS receipt builder (pure, no DOM). Produces the raw byte stream sent to a
// Bluetooth thermal printer. Text-only (no raster) so it works on 58mm/80mm.

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
  footer?: string;
};

const ESC = 0x1b;
const GS = 0x1d;

// Keep everything printable-ASCII; thermal defaults are CP437-ish.
function sanitize(value: string): string {
  return value
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u00b7\u2022]/g, "-")
    .replace(/\u00d7/g, "x")
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

  const cols = (l: string, r: string) => {
    const leftText = sanitize(l);
    const rightText = sanitize(r);
    const space = Math.max(1, width - leftText.length - rightText.length);
    return line(leftText + " ".repeat(space) + rightText);
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

  // Header
  raw([ESC, 0x40]); // init
  center();
  dbl(true);
  bold(true);
  line(receipt.brand ?? "laundry.in");
  dbl(false);
  bold(false);
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

  if (receipt.paid) {
    cols("Pembayaran", receipt.paid.method);
    line(`  ${formatDateTime(receipt.paid.paidAt)} - ${formatRupiah(receipt.paid.amount)}`);
    if (receipt.paid.referenceNo) line(`  Ref: ${receipt.paid.referenceNo}`);
  } else {
    cols("Pembayaran", "Belum lunas");
  }

  if (receipt.notes) {
    rule();
    line("CATATAN");
    wrap(receipt.notes);
  }

  line();
  center();
  line(receipt.footer ?? "Terima kasih.");
  alignLeft();
  line();
  line();
  line();
  raw([GS, 0x56, 0x42, 0x00]); // feed + partial cut

  return new Uint8Array(out);
}
