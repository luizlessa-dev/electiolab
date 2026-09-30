import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const envFile = path.join(process.cwd(), ".env.local");
for (const line of fs.readFileSync(envFile, "utf-8").split("\n")) {
  const idx = line.indexOf("=");
  if (idx > 0) {
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^"|"$/g, "");
    if (k && !process.env[k]) process.env[k] = v;
  }
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

(async () => {
  const { data } = await sb.from("polls").select("DISTINCT methodology, poll_type").limit(20);
  if (data) {
    console.log("\n✓ Metodologies válidas:");
    const methods = new Set(data.map(d => d.methodology).filter(m => m));
    console.log([...methods]);
    
    console.log("\n✓ Poll types válidos:");
    const types = new Set(data.map(d => d.poll_type).filter(t => t));
    console.log([...types]);
  }
})();
