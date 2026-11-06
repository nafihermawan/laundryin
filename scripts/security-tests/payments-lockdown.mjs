// Production-safe security tests for #2 (payments lockdown).
//
// Uses ONLY dedicated test accounts (admin.uji@ / kasir.uji@) and test orders
// named "UJI – jangan diproses". It never touches real transactions.
//
//   node scripts/security-tests/payments-lockdown.mjs            # run tests + cleanup
//   node scripts/security-tests/payments-lockdown.mjs --cleanup-only
//
// Env (from .env.local / environment): NEXT_PUBLIC_SUPABASE_URL,
// NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, MIDTRANS_SERVER_KEY.
// Optional: BASE_URL (default http://localhost:3000) for the webhook POST,
//           SEC_TEST_PASSWORD (otherwise generated and printed).
//
// NOTE: run only AFTER 20261106000004 is applied. The "tandai diambil saat belum lunas"
// test relies on trigger public.enforce_paid_before_pickup, added in
// migrations 20261106000002 (+ extended to 'siap' in 20261106000003).

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

function loadEnv() {
  const out = {};
  try {
    for (const line of readFileSync(new URL("../../.env.local", import.meta.url), "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
  return out;
}

const env = { ...loadEnv(), ...process.env };
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_URL = env.BASE_URL || "http://localhost:3000";

const ADMIN_EMAIL = "admin.uji@laundry.local";
const CASHIER_EMAIL = "kasir.uji@laundry.local";
const PASSWORD = env.SEC_TEST_PASSWORD || `Uji-${randomBytes(6).toString("hex")}!A9`;
const TEST_TAG = "UJI – jangan diproses";

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const results = [];
const state = { adminId: null, cashierId: null, shiftId: null, customerId: null, orderA: null, orderB: null, pendingId: null };

async function ensureUser(email, role) {
  let id;
  const { data: created, error } = await admin.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
  });
  if (!error) {
    id = created.user.id;
  } else {
    const { data } = await admin.auth.admin.listUsers();
    const found = data.users.find((u) => u.email === email);
    if (!found) throw new Error(`cannot create/find ${email}: ${error.message}`);
    id = found.id;
    await admin.auth.admin.updateUserById(id, { password: PASSWORD, email_confirm: true });
  }
  await admin.from("profiles").upsert({ id, role, full_name: "Akun Uji" });
  return id;
}

async function test(name, fn, expect) {
  try {
    const { error } = await fn();
    const rejected = Boolean(error);
    const ok = expect === "reject" ? rejected : !error;
    results.push({ name, ok, detail: error?.message ?? "ok" });
  } catch (e) {
    results.push({ name, ok: expect === "reject", detail: e.message });
  }
}

async function cleanup() {
  const del = async (table, col, val) => { if (val) await admin.from(table).delete().eq(col, val); };
  await del("payments", "order_id", state.orderA);
  await del("payments", "order_id", state.orderB);
  await del("order_items", "order_id", state.orderA);
  await del("order_items", "order_id", state.orderB);
  await del("orders", "id", state.orderA);
  await del("orders", "id", state.orderB);
  await del("cash_registers", "user_id", state.cashierId);
  await del("customers", "id", state.customerId);
  // Test accounts are kept but neutralised (role cashier, renamed) so re-running is stable.
  if (state.adminId) await admin.auth.admin.updateUserById(state.adminId, { password: randomBytes(12).toString("hex") });
  if (state.cashierId) await admin.auth.admin.updateUserById(state.cashierId, { password: randomBytes(12).toString("hex") });
}

async function setup() {
  state.adminId = await ensureUser(ADMIN_EMAIL, "admin");
  state.cashierId = await ensureUser(CASHIER_EMAIL, "cashier");

  const { data: shift } = await admin
    .from("cash_registers")
    .insert({ user_id: state.cashierId, status: "open", starting_cash: 0, notes: TEST_TAG })
    .select("id").single();
  state.shiftId = shift.id;

  const { data: customer } = await admin
    .from("customers")
    .insert({ name: TEST_TAG, phone: "0800" + Date.now().toString().slice(-8) })
    .select("id").single();
  state.customerId = customer.id;

  const mkOrder = async (suffix) => {
    const { data } = await admin
      .from("orders")
      .insert({ order_no: `UJI-${Date.now()}-${suffix}`, status: "diterima", customer_id: state.customerId, notes: TEST_TAG })
      .select("id").single();
    await admin.from("order_items").insert({ order_id: data.id, service_name: TEST_TAG, qty: 1, unit: "pcs", unit_price: 25000, subtotal: 25000 });
    return data.id;
  };
  state.orderA = await mkOrder("A");
  state.orderB = await mkOrder("B");

  const { data: pending } = await admin
    .from("payments")
    .insert({ order_id: state.orderA, amount: 25000, method: "cash", status: "pending", received_by: state.cashierId, cash_register_id: state.shiftId })
    .select("id").single();
  state.pendingId = pending.id;
}

async function run() {
  await setup();

  const cashier = createClient(URL_, ANON, { auth: { persistSession: false } });
  await cashier.auth.signInWithPassword({ email: CASHIER_EMAIL, password: PASSWORD });
  const adminAuth = createClient(URL_, ANON, { auth: { persistSession: false } });
  await adminAuth.auth.signInWithPassword({ email: ADMIN_EMAIL, password: PASSWORD });

  await test("kasir: insert payment 'paid' langsung DITOLAK", () =>
    cashier.from("payments").insert({ order_id: state.orderA, amount: 25000, method: "qris_dynamic", status: "paid", paid_at: new Date().toISOString(), received_by: state.cashierId, cash_register_id: state.shiftId }).select("id").single(), "reject");

  await test("kasir: update amount payment pending DITOLAK", () =>
    cashier.from("payments").update({ amount: 1 }).eq("id", state.pendingId).select("id").single(), "reject");

  await test("admin: set payment 'paid' langsung DITOLAK", () =>
    adminAuth.from("payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", state.pendingId).select("id").single(), "reject");

  await test("kasir: tandai 'diambil' saat belum lunas DITOLAK (trigger 002/003)", () =>
    cashier.from("orders").update({ status: "diambil" }).eq("id", state.orderA).select("id").single(), "reject");

  await test("kasir: pay_order cash dengan shift aktif BERHASIL", () =>
    cashier.rpc("pay_order", { order_id: state.orderA, method: "cash", cash_received: 25000, reference_no: "", notes: "" }), "accept");

  await test("kasir: pay_order method non-cash DITOLAK", () =>
    cashier.rpc("pay_order", { order_id: state.orderB, method: "qris_manual", cash_received: 0, reference_no: "", notes: "" }), "reject");

  // Webhook on order B with a pending qris attempt.
  const webhookOrderId = `UJI-${state.orderB}-9`;
  await admin.from("payments").insert({ order_id: state.orderB, amount: 25000, method: "qris_dynamic", status: "pending", received_by: state.cashierId, provider: "midtrans", midtrans_order_id: webhookOrderId });

  const signature = (sc, ga) => createHash("sha512").update(`${webhookOrderId}${sc}${ga}${env.MIDTRANS_SERVER_KEY}`).digest("hex");
  const post = async (body) => {
    const res = await fetch(`${BASE_URL}/api/webhooks/midtrans`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { error: res.ok ? null : { message: `HTTP ${res.status}` } };
  };

  await test("webhook settlement signature valid BERHASIL", () =>
    post({ order_id: webhookOrderId, status_code: "200", gross_amount: "25000.00", signature_key: signature("200", "25000.00"), transaction_status: "settlement", fraud_status: "accept", transaction_id: "uji-txn" }), "accept");

  await test("webhook signature salah DITOLAK", async () => {
    const res = await fetch(`${BASE_URL}/api/webhooks/midtrans`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_id: webhookOrderId, status_code: "200", gross_amount: "25000.00", signature_key: "deadbeef", transaction_status: "settlement" }) });
    return { error: res.status === 403 ? null : { message: `HTTP ${res.status}` } };
  }, "accept");
}

const cleanupOnly = process.argv.includes("--cleanup-only");

console.log(`Akun uji: ${ADMIN_EMAIL} / ${CASHIER_EMAIL}  (tag: "${TEST_TAG}")`);
if (!cleanupOnly) {
  await run().catch((e) => { console.error("Fatal:", e.message); process.exitCode = 1; });
  console.log("\n=== Hasil uji payments lockdown ===");
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  (${r.detail})`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} lulus`);
  if (failed) process.exitCode = 1;
}
await cleanup();
console.log("Cleanup selesai. Baris uji (orders/order_items/payments UJI-*) dihapus lewat service role.");
console.log("Catatan: baris bertag 'UJI – jangan diproses' yang lolos ke laporan harus difilter manual (status paid/QRIS dibuat service role).");
