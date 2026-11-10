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

  it("links the printer row to /akun/printer and drops the Aplikasi section", () => {
    render(<AccountScreen name="Renita" email="renita@laundry.local" role="admin" />);

    const printerLink = screen.getByRole("link", { name: /Pengaturan printer, RPP210A terhubung/ });
    expect(printerLink).toHaveAttribute("href", "/akun/printer");
    expect(screen.getByText("Terhubung · 58 mm")).toBeInTheDocument();

    expect(screen.queryByText(/Tentang laundry\.in/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^v\d/)).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: /Keluar dari akun/ })).toBeInTheDocument();
  });

  it("shows the empty-state hint before a printer is chosen", () => {
    h.state = { supported: true, status: "belum diatur", name: null, paper: "58" };
    render(<AccountScreen name="Renita" email="renita@laundry.local" role="cashier" />);

    expect(screen.getByText("Printer belum diatur")).toBeInTheDocument();
    expect(screen.getByText("Ketuk untuk memilih printer")).toBeInTheDocument();
  });
});
