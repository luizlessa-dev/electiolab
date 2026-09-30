import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

(async () => {
  const { data } = await sb.from("institutes").select("id, name");
  const atlas = data?.filter(i => i.name?.toUpperCase().includes("ATLAS"));
  console.log("Institutos com ATLAS:", JSON.stringify(atlas, null, 2));
})();
