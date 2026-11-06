import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getUserRole } from "@/lib/auth/get-user-role";
import { type Database } from "@/lib/supabase/database.types";

export async function POST(request: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const response = NextResponse.redirect(new URL("/kasir", request.url), 303);
  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, { ...options, secure: isProd });
        });
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), 303);
  }

  const userId = data.user?.id;
  if (!userId) return response;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.is_active === false) {
    await supabase.auth.signOut();
    response.headers.set("location", new URL("/login?error=inactive", request.url).toString());
    return response;
  }

  const role = await getUserRole(supabase, userId);
  if (role === "admin") {
    response.headers.set("location", new URL("/admin", request.url).toString());
  }
  return response;
}
