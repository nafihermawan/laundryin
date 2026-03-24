export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-zinc-950 px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_circle_at_50%_-20%,rgba(56,189,248,0.35),transparent_60%),radial-gradient(700px_circle_at_0%_60%,rgba(99,102,241,0.25),transparent_55%),radial-gradient(700px_circle_at_100%_70%,rgba(16,185,129,0.18),transparent_55%)]" />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
        {children}
      </div>
    </div>
  );
}
