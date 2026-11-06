export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="flex min-h-full flex-1 flex-col bg-[#F8FAFC]">{children}</div>;
}
