import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("../actions", () => ({ saveTransaction: vi.fn() }));

import { TransactionForm } from "../transaction-form";

const SERVICES = [
  { id: "svc-1", name: "Cuci Kering", unit: "kg", base_price: 7000 },
  { id: "svc-2", name: "Setrika", unit: "kg", base_price: 5000 },
  { id: "svc-3", name: "Bed Cover", unit: "pcs", base_price: 25000 },
];

const combos = () => Array.from(document.querySelectorAll('[aria-haspopup="listbox"]')) as HTMLElement[];
const labels = () => combos().map((c) => c.textContent?.trim() ?? "");

// Real browsers fire mousedown before click. The dropdown's "click outside"
// handler listens on mousedown, so a test that only fires `click` cannot catch
// the multi-row selection bug.
function click(el: Element) {
  fireEvent.mouseDown(el);
  fireEvent.click(el);
}

function addRow() {
  click(screen.getByText("Tambah layanan"));
}

// Opens the row's dropdown (unless the "Tambah layanan" auto-open already did)
// and clicks the option, with the mousedown that a real pointer produces.
function pick(index: number, name: string) {
  let listbox = screen.queryByRole("listbox");
  if (!listbox) {
    click(combos()[index]);
    listbox = screen.getByRole("listbox");
  }
  const option = within(listbox)
    .getAllByRole("option")
    .find((el) => el.textContent?.includes(name));
  if (!option) throw new Error(`service "${name}" not found`);
  click(within(option).getByRole("button"));
}

describe("TransactionForm — service rows (Bug 2 regression)", () => {
  it("keeps rows 1..3 on their own service and updates the totals", () => {
    render(<TransactionForm services={SERVICES} />);

    pick(0, "Cuci Kering");
    addRow();
    pick(1, "Setrika");
    addRow();
    pick(2, "Bed Cover");

    expect(labels()[0]).toContain("Cuci Kering");
    expect(labels()[1]).toContain("Setrika");
    expect(labels()[2]).toContain("Bed Cover");

    // 7000 + 5000 + 25000
    expect(screen.getByText(/Total · 3 layanan/)).toBeInTheDocument();
    expect(screen.getByText("Rp 37.000")).toBeInTheDocument();
  });

  it("changing a later row never rewrites an earlier row", () => {
    render(<TransactionForm services={SERVICES} />);

    pick(0, "Cuci Kering");
    addRow();
    pick(1, "Setrika");

    // Re-open row 2 and switch it to Bed Cover (real mousedown + click).
    click(combos()[1]);
    const listbox = screen.getByRole("listbox");
    const option = within(listbox)
      .getAllByRole("option")
      .find((el) => el.textContent?.includes("Bed Cover"))!;
    click(within(option).getByRole("button"));

    expect(labels()[0]).toContain("Cuci Kering");
    expect(labels()[1]).toContain("Bed Cover");
  });
});
