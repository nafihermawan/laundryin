"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function BottomNav({ homeHref }: { homeHref: string }) {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === homeHref) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4">
          <nav className="flex h-14 items-center justify-end text-sm">
            <Link
              href="/logout"
              prefetch={false}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
              aria-label="Logout"
              title="Logout"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 7V6C10 4.89543 10.8954 4 12 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H12C10.8954 20 10 19.1046 10 18V17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15 12H4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M7 9L4 12L7 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </nav>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white">
      <div className="mx-auto w-full max-w-6xl px-4">
        <nav className="relative flex h-14 items-center justify-center text-sm">
          <button
            type="button"
            onClick={() => router.back()}
            className="absolute left-0 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
            aria-label="Kembali"
            title="Kembali"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <a
            href={homeHref}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
            aria-label="Home"
            title="Home"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 11L12 3L21 11"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5 10V20H19V10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </nav>
      </div>
    </div>
  );
}
