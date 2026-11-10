// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Regression guard for Bug 1: pay_order() must attribute EVERY cash payment to
// the paying user's open shift — including admins. Before the fix the shift
// lookup sat behind `if role <> 'admin'`, so admin cash payments were written
// with cash_register_id = NULL and never showed up in the Beranda "Tunai"
// figure or the close-shift expected_cash.
const FILES = [
  "../../../../supabase/schema.sql",
  "../../../../supabase/migrations/20261110000000_fix_pay_order_shift_attribution.sql",
];

function payOrderBody(sql: string): string {
  const start = sql.indexOf("create or replace function public.pay_order(");
  expect(start, "pay_order definition not found").toBeGreaterThanOrEqual(0);
  const bodyStart = sql.indexOf("as $$", start);
  return sql.slice(start, sql.indexOf("$$;", bodyStart));
}

describe("pay_order() SQL", () => {
  for (const rel of FILES) {
    it(`attributes cash to the payer's open shift (${rel.split("/").pop()})`, () => {
      const sql = readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
      const body = payOrderBody(sql);

      // The shift of auth.uid() is looked up unconditionally ...
      const lookup = body.indexOf("into shift_id");
      expect(lookup).toBeGreaterThan(-1);
      const preceding = body.slice(Math.max(0, lookup - 240), lookup);
      expect(preceding).not.toMatch(/role\s*<>\s*'admin'/);

      // ... and it is written into the payment on every paid path.
      expect((body.match(/shift_id/g) ?? []).length).toBeGreaterThanOrEqual(4);
      expect(body).toMatch(/cash_register_id\s*=\s*shift_id/);
    });
  }
});
