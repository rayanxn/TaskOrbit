#!/usr/bin/env npx tsx

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PASSWORD = "DevAccount!2026";

const accounts = [
  { email: "rayan@test.flow.dev", full_name: "Rayan" },
  { email: "abdullah@test.flow.dev", full_name: "Abdullah" },
];

async function main() {
  const { data: existing, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) throw listErr;

  for (const acct of accounts) {
    const found = existing.users.find((u) => u.email === acct.email);
    if (found) {
      console.log(`exists  ${acct.email}  (id=${found.id})`);
      continue;
    }
    const { data, error } = await admin.auth.admin.createUser({
      email: acct.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: acct.full_name },
    });
    if (error) {
      console.error(`failed  ${acct.email}  ${error.message}`);
      continue;
    }
    console.log(`created ${acct.email}  (id=${data.user.id})`);
  }

  console.log(`\npassword for both: ${PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
