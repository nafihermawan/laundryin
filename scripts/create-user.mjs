import { createClient } from "@supabase/supabase-js";

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing env: NEXT_PUBLIC_SUPABASE_URL dan/atau SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const usernameOrEmail = process.argv[2] ?? "";
  const password = process.argv[3] ?? "";
  const domain = getArg("--domain") ?? "laundry.local";

  if (!usernameOrEmail || !password) {
    throw new Error(
      "Usage: node scripts/create-user.mjs <username|email> <password> [--domain laundry.local]"
    );
  }

  const isEmail = usernameOrEmail.includes("@");
  const username = isEmail ? usernameOrEmail.split("@")[0] : usernameOrEmail;
  const email = isEmail ? usernameOrEmail : `${usernameOrEmail}@${domain}`;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, full_name: username },
  });

  if (error) throw error;

  console.log(
    JSON.stringify(
      { id: data.user?.id ?? null, email: data.user?.email ?? null },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err?.message ?? String(err));
  process.exit(1);
});
