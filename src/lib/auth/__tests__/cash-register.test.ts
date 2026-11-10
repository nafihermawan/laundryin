import { describe, it, expect } from "vitest";

import { getShiftCashTotal } from "@/lib/auth/cash-register";

type Call = { op: "from" | "select" | "eq"; args: unknown[] };

// Minimal chainable + awaitable stub of the Supabase query builder. `eq()` keeps
// returning the builder, and `then()` makes the final awaited value resolve to
// our rows — exactly how PostgREST chains behave.
function makeClient(rows: Array<{ amount: number | string }>) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {};
  builder.from = (table: string) => {
    calls.push({ op: "from", args: [table] });
    return builder;
  };
  builder.select = (columns: string) => {
    calls.push({ op: "select", args: [columns] });
    return builder;
  };
  builder.eq = (column: string, value: unknown) => {
    calls.push({ op: "eq", args: [column, value] });
    return builder;
  };
  builder.then = (resolve: (value: { data: unknown; error: null }) => unknown) =>
    resolve({ data: rows, error: null });
  return { client: builder, calls };
}

describe("getShiftCashTotal", () => {
  it("sums only cash + paid payments for the given shift", async () => {
    const { client, calls } = makeClient([{ amount: 70000 }, { amount: 50000 }]);

    const total = await getShiftCashTotal(client as never, "reg-1");

    expect(total).toBe(120000);
    expect(calls).toContainEqual({ op: "from", args: ["payments"] });
    expect(calls).toContainEqual({ op: "eq", args: ["cash_register_id", "reg-1"] });
    expect(calls).toContainEqual({ op: "eq", args: ["method", "cash"] });
    expect(calls).toContainEqual({ op: "eq", args: ["status", "paid"] });
  });

  it("coerces numeric strings (Postgres numeric) and handles null data", async () => {
    const withStrings = makeClient([{ amount: "70000.00" }, { amount: "50" }]);
    expect(await getShiftCashTotal(withStrings.client as never, "reg-2")).toBe(70050);

    const empty = makeClient([]);
    expect(await getShiftCashTotal(empty.client as never, "reg-3")).toBe(0);
  });
});
