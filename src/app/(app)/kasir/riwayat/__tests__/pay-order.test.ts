import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  rpc: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc })),
}));

// env.ts validates at import time; supply a stub so importing the action works.
vi.mock("@/lib/env", () => ({ env: { APP_BASE_URL: "http://localhost:3000" } }));

vi.mock("@/lib/payments/midtrans", () => ({
  createMidtransQrisCharge: vi.fn(),
  getMidtransTransactionStatus: vi.fn(),
  cancelMidtransTransaction: vi.fn(),
}));

import { payOrder } from "@/app/(app)/kasir/riwayat/actions";

describe("payOrder", () => {
  beforeEach(() => {
    mocks.revalidatePath.mockClear();
    mocks.rpc.mockReset().mockResolvedValue({ error: null });
    mocks.getUser.mockReset().mockResolvedValue({ data: { user: { id: "user-1" } } });
  });

  it("records cash through pay_order and refreshes the Beranda + shift + history", async () => {
    const res = await payOrder("order-1", { method: "cash", cashReceived: 70000 });

    expect(res.success).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "pay_order",
      expect.objectContaining({ order_id: "order-1", method: "cash", cash_received: 70000 }),
    );

    // Fix for "Tunai tidak bertambah": after paying, the Beranda (/kasir), the
    // shift page and the history list must all be revalidated.
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/kasir");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/kasir/riwayat");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/kasir/shift");
  });

  it("rejects disabled methods without touching pay_order", async () => {
    const res = await payOrder("order-1", { method: "transfer" as never });

    expect(res.success).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
