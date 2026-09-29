import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// Carregar .env.local
const envFile = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
    const idx = line.indexOf("=");
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
      if (k && !process.env[k]) process.env[k] = v;
    }
  }
}

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

(async () => {
  const { data, error } = await sb
    .from("elections")
    .insert([
      {
        type: "presidente",
        name: "Eleições Presidenciais 2026",
        state: "BR",
        year: 2026
      }
    ])
    .select("id");
  if (error) console.log("Error:", error.message);
  else console.log("✓ Created:", data[0].id);
})();
