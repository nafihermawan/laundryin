import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local explicitly
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

function getArgValue(name) {
  const idx = process.argv.findIndex((a) => a === name || a.startsWith(`${name}=`));
  if (idx === -1) return null;
  const arg = process.argv[idx];
  if (arg.includes("=")) return arg.split("=").slice(1).join("=") || null;
  return process.argv[idx + 1] ?? null;
}

function hasFlag(name) {
  return process.argv.some((a) => a === name);
}

function getJakartaDateKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomJakartaDateForDay(dateKey) {
  const hour = randomInt(8, 20);
  const minute = randomInt(0, 59);
  const second = randomInt(0, 59);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const ss = String(second).padStart(2, "0");
  return new Date(`${dateKey}T${hh}:${mm}:${ss}+07:00`);
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 1. Dapatkan user ID admin/kasir pertama untuk created_by
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .limit(1);

  if (profileError || !profiles?.[0]) {
    throw new Error("No user profile found. Please create a user first.");
  }
  const userId = profiles[0].id;

  console.log("Using user ID:", userId);

  // 2. Buat Dummy Customers
  const dummyCustomers = [
    { name: "Budi Santoso", phone: "08123456789", notes: "Langganan tetap" },
    { name: "Siti Aminah", phone: "08567890123", notes: "Cuci express" },
    { name: "Andi Wijaya", phone: "08998877665", notes: "" },
  ];

  console.log("Inserting dummy customers...");
  const { data: customers, error: custError } = await supabase
    .from("customers")
    .insert(dummyCustomers)
    .select();

  if (custError) throw custError;

  // 3. Pastikan ada services
  const { data: services } = await supabase.from("services").select("*");
  if (!services || services.length === 0) {
    console.log("No services found, adding default services...");
    await supabase.from("services").insert([
      { name: "Cuci Kering", unit: "kg", base_price: 8000 },
      { name: "Cuci Setrika", unit: "kg", base_price: 12000 },
      { name: "Bed Cover", unit: "pcs", base_price: 35000 },
    ]);
  }

  const activeServices = (await supabase.from("services").select("*")).data;

  // 4. Buat Dummy Orders
  const statusOptions = ["diterima", "siap", "diambil"];
  const paymentMethods = ["cash", "transfer", "qris_manual"];

  const countArg = getArgValue("--count");
  const count = Math.max(1, Number(countArg ?? 5) || 5);
  const todayOnly = hasFlag("--today");
  const todayKey = getJakartaDateKey(new Date());

  console.log("Inserting dummy orders and items...");

  for (let i = 0; i < count; i++) {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const orderNo = `TRX-DUMMY-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const status = statusOptions[Math.floor(Math.random() * statusOptions.length)];

    const receivedAt = todayOnly
      ? getRandomJakartaDateForDay(todayKey)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() - Math.floor(Math.random() * 7));
          return d;
        })();
    
    const dueAt = new Date(receivedAt);
    dueAt.setDate(dueAt.getDate() + 2);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_no: orderNo,
        customer_id: customer.id,
        status: status,
        received_at: receivedAt.toISOString(),
        due_at: dueAt.toISOString(),
        created_by: userId,
        notes: "Data dummy untuk testing"
      })
      .select()
      .single();

    if (orderError) {
        console.error("Order error:", orderError);
        continue;
    }

    // Insert 1-2 items per order
    const numItems = Math.floor(Math.random() * 2) + 1;
    let totalAmount = 0;
    
    for (let j = 0; j < numItems; j++) {
      const svc = activeServices[Math.floor(Math.random() * activeServices.length)];
      const qty = Math.floor(Math.random() * 5) + 1;
      const subtotal = qty * svc.base_price;
      totalAmount += subtotal;

      await supabase.from("order_items").insert({
        order_id: order.id,
        service_name: svc.name,
        qty: qty,
        unit: svc.unit,
        unit_price: svc.base_price,
        subtotal: subtotal
      });
    }

    // Insert Payment
    const isPaid = Math.random() > 0.5;
    const paidAt = isPaid ? getRandomJakartaDateForDay(todayKey).toISOString() : null;
    await supabase.from("payments").insert({
      order_id: order.id,
      amount: totalAmount,
      method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      status: isPaid ? "paid" : "pending",
      paid_at: paidAt,
      received_by: userId
    });
  }

  console.log(`Successfully created ${count} dummy transactions!`);
}

main().catch((err) => {
  console.error("Error creating dummy data:", err);
});
