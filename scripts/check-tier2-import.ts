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
  const { count } = await sb
    .from("poll_drafts")
    .select("*", { count: "exact", head: true })
    .eq("source_kind", "tier2-presidencial");

  console.log(`✅ ${count} polls tier2-presidencial importados`);

  const { data: allPolls } = await sb
    .from("poll_drafts")
    .select("institute_name")
    .eq("source_kind", "tier2-presidencial");

  const bySeed = allPolls?.reduce(
    (acc, poll) => {
      acc[poll.institute_name] = (acc[poll.institute_name] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) || {};

  console.log("\nPor instituto:");
  console.log(JSON.stringify(bySeed, null, 2));
})();
