import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const h = vi.hoisted(() => ({
  state: {
    supported: true,
    status: "terhubung" as "terhubung" | "menyambungkan" | "terputus" | "belum diatur",
    name: "RPP210A" as string | null,
    paper: "58",
  },
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: unknown; children: unknown }) => (
    <a href={typeof href === "string" ? href : "#"} {...(rest as object)}>
      {children as never}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/printing/printer-provider", () => ({
  usePrinter: () => ({
    ...h.state,
    connect: vi.fn(),
    ensureConnected: vi.fn(),
    forget: vi.fn(),
    setPaper: vi.fn(),
    send: vi.fn(),
  }),
}));

import { AccountScreen } from "@/components/app/account-screen";

describe("AccountScreen", () => {
  beforeEach(() => {
    h.state = { supported: true, status: "terhubung", name: "RPP210A", paper: "58" };
  });

  it("shows a collapsed printer section and drops the Aplikasi section", () => {
    render(<AccountScreen name="Renita" email="renita@laundry.local" role="admin" />);

    const summary = screen.getByRole("button", { name: /RPP210A/ });
    expect(summary).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Terhubung · 58 mm")).toBeInTheDocument();

    expect(screen.queryByText(/Tentang laundry\.in/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^v\d/)).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: /Keluar dari akun/ })).toBeInTheDocument();
  });

  it("opens by default when no printer has been chosen yet", () => {
    h.state = { supported: true, status: "belum diatur", name: null, paper: "58" };
    render(<AccountScreen name="Renita" email="renita@laundry.local" role="cashier" />);

    const summary = screen.getByRole("button", { name: /Printer belum diatur/ });
    expect(summary).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Ketuk untuk mengatur")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pilih printer" })).toBeInTheDocument();
  });
});
