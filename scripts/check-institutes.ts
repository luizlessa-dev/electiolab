import { createClient } from "@supabase/supabase-js";
import * as fs from "fs"; import * as path from "path";
const e = path.join(process.cwd(), ".env.local");
if (fs.existsSync(e)) for (const l of fs.readFileSync(e, "utf-8").split("\n")) { const i = l.indexOf("="); if (i > 0) { const k = l.slice(0, i).trim(); const v = l.slice(i + 1).trim().replace(/^"|"$/g, ""); if (k && !process.env[k]) process.env[k] = v; } }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
(async () => {
  const { data } = await sb.from("institutes").select("name, slug, reliability_score").order("reliability_score", { ascending: false, nullsFirst: false });
  for (const i of data ?? []) console.log(`  ${(i.reliability_score ?? 0).toFixed(2)}  ${i.name}`);
})();
