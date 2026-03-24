import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            html, body {
              min-height: 0 !important;
              height: auto !important;
              background: transparent !important;
              overflow: hidden !important;
            }
            body { margin: 0 !important; }
          `,
        }}
      />
      <div className="bg-transparent text-zinc-900">{children}</div>
    </>
  );
}
