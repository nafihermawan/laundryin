import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getUserRole } from "@/lib/auth/get-user-role";
import { type Database } from "@/lib/supabase/database.types";

export async function POST(request: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json({ ok: false, error: "config" }, { status: 500 });
  }

  let email = "";
  let password = "";
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
    email = String(body?.email ?? "");
    password = String(body?.password ?? "");
  } else {
    const formData = await request.formData();
    email = String(formData.get("email") ?? "");
    password = String(formData.get("password") ?? "");
  }

  // Collect auth cookies written by Supabase so we can attach them to the JSON response.
  const cookieJar = NextResponse.json({});
  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieJar.cookies.set(name, value, { ...options, secure: isProd });
        });
      },
    },
  });

  function respond(payload: unknown, status: number) {
    const res = NextResponse.json(payload, { status });
    cookieJar.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie);
    });
    return res;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return respond({ ok: false, error: "invalid" }, 401);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.is_active === false) {
    await supabase.auth.signOut();
    return respond({ ok: false, error: "inactive" }, 403);
  }

  const role = await getUserRole(supabase, data.user.id);
  return respond({ ok: true, redirect: role === "admin" ? "/admin" : "/kasir" }, 200);
}
