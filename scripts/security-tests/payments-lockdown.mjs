// Security regression tests for #2 (payments lockdown).
//
// Run ONLY against a database that has migrations 20261106000002/3/4 applied
// (e.g. a staging/branch DB). It creates and removes its own temp data.
//
//   node scripts/security-tests/payments-lockdown.mjs
//
// Env read from .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY, MIDTRANS_SERVER_KEY, APP_BASE_URL.
// Optional: BASE_URL (for the webhook POST), default http://localhost:3000

import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
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
const CASHIER_EMAIL = `sec-test-cashier+${Date.now()}@laundry.local`;
const CASHIER_PASS = `T3st-${Math.random().toString(36).slice(2)}!A9`;

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
const results = [];
let userId, orderId, pendingId;

async function test(name, fn, expect) {
  try {
    const { data, error } = await fn();
    const rejected = Boolean(error);
    const ok = expect === "reject" ? rejected : !error;
    results.push({ name, ok, detail: error?.message ?? (data ? "ok" : "ok") });
  } catch (e) {
    const ok = expect === "reject";
    results.push({ name, ok, detail: e.message });
  }
}

async function setup() {
  const { data: created, error } = await admin.auth.admin.createUser({
    email: CASHIER_EMAIL,
    password: CASHIER_PASS,
    email_confirm: true,
  });
  if (error) throw error;
  userId = created.user.id;

  const { data: order } = await admin
    .from("orders")
    .insert({ order_no: `SEC-${Date.now()}`, status: "diterima" })
    .select("id")
    .single();
  orderId = order.id;
  await admin.from("order_items").insert({ order_id: orderId, service_name: "Test", qty: 1, unit: "pcs", unit_price: 25000, subtotal: 25000 });
  await admin.from("cash_registers").insert({ user_id: userId, status: "open", starting_cash: 0 });

  const { data: pending } = await admin
    .from("payments")
    .insert({ order_id: orderId, amount: 25000, method: "cash", status: "pending", received_by: userId })
    .select("id")
    .single();
  pendingId = pending.id;
}

async function main() {
  await setup();

  const cashier = createClient(URL_, ANON, { auth: { persistSession: false } });
  await cashier.auth.signInWithPassword({ email: CASHIER_EMAIL, password: CASHIER_PASS });

  const adminAuth = createClient(URL_, ANON, { auth: { persistSession: false } });
  await adminAuth.auth.signInWithPassword({ email: env.SEC_TEST_ADMIN_EMAIL || "admin@laundry.local", password: env.SEC_TEST_ADMIN_PASSWORD || "12345678" });

  await test("cashier: insert payment paid langsung DITOLAK", () =>
    cashier.from("payments").insert({ order_id: orderId, amount: 25000, method: "qris_dynamic", status: "paid", paid_at: new Date().toISOString(), received_by: userId }).select("id").single(), "reject");

  await test("cashier: update amount payment pending DITOLAK", () =>
    cashier.from("payments").update({ amount: 1 }).eq("id", pendingId).select("id").single(), "reject");

  await test("admin: set payment paid langsung DITOLAK", () =>
    adminAuth.from("payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", pendingId).select("id").single(), "reject");

  await test("cashier: tandai sudah diambil saat belum lunas DITOLAK", () =>
    cashier.from("orders").update({ status: "diambil" }).eq("id", orderId).select("id").single(), "reject");

  await test("cashier: pay_order cash dengan shift aktif BERHASIL", () =>
    cashier.rpc("pay_order", { order_id: orderId, method: "cash", cash_received: 25000, reference_no: "", notes: "" }), "accept");

  // Fresh pending QRIS attempt for the webhook test.
  const { data: qris } = await admin
    .from("payments")
    .insert({ order_id: orderId, amount: 25000, method: "qris_dynamic", status: "pending", received_by: userId, provider: "midtrans", midtrans_order_id: `SEC-${orderId}-9` })
    .select("id")
    .single();

  const order_id = `SEC-${orderId}-9`;
  const status_code = "200";
  const gross_amount = "25000.00";
  const signature_key = createHash("sha512").update(`${order_id}${status_code}${gross_amount}${env.MIDTRANS_SERVER_KEY}`).digest("hex");

  await test("webhook settlement (signature valid) BERHASIL", async () => {
    const res = await fetch(`${BASE_URL}/api/webhooks/midtrans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id, status_code, gross_amount, signature_key, transaction_status: "settlement", fraud_status: "accept", transaction_id: "test-txn" }),
    });
    return { error: res.ok ? null : { message: `HTTP ${res.status}` } };
  }, "accept");

  await test("webhook dengan signature salah DITOLAK", async () => {
    const res = await fetch(`${BASE_URL}/api/webhooks/midtrans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_id, status_code, gross_amount, signature_key: "deadbeef", transaction_status: "settlement" }),
    });
    return { error: res.status === 403 ? null : { message: `HTTP ${res.status}` } };
  }, "accept");

  console.log("\n=== Hasil uji payments lockdown ===");
  for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  (${r.detail})`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} lulus`);
  process.exitCode = failed ? 1 : 0;
}

async function cleanup() {
  try {
    if (orderId) {
      await admin.from("payments").delete().eq("order_id", orderId);
      await admin.from("order_items").delete().eq("order_id", orderId);
      await admin.from("orders").delete().eq("id", orderId);
    }
    if (userId) {
      await admin.from("cash_registers").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  } catch {}
}

main()
  .catch((e) => {
    console.error("Fatal:", e.message);
    process.exitCode = 1;
  })
  .finally(cleanup);
