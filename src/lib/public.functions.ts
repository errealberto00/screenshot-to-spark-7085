import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Public booking page data — only published businesses, active services and hours. */
export const getPublicBusiness = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(60) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: business } = await sb.from("businesses").select("*").eq("slug", data.slug.toLowerCase()).eq("is_published", true).maybeSingle();
    if (!business) return null;
    const [services, rules] = await Promise.all([
      sb.from("services").select("*").eq("business_id", business.id).eq("is_active", true).order("sort_order"),
      sb.from("availability_rules").select("weekday,start_time,end_time").eq("business_id", business.id),
    ]);
    return { business, services: services.data ?? [], rules: rules.data ?? [] };
  });
