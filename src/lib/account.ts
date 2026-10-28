import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Business = Tables<"businesses">;
export type Service = Tables<"services">;
export type Booking = Tables<"bookings">;
export type Profile = Tables<"profiles">;
export type Rule = Tables<"availability_rules">;
export type TimeOff = Tables<"time_off">;
export type Role = "business_owner" | "customer";

export interface Account {
  userId: string;
  email: string;
  provider: string;
  roles: Role[];
  profile: Profile | null;
  business: Business | null;
}

export const accountQuery = queryOptions({
  queryKey: ["account"],
  staleTime: 30_000,
  queryFn: async (): Promise<Account | null> => {
    const { data, error } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      if (error) await supabase.auth.signOut({ scope: "local" });
      return null;
    }
    const [roles, profile, business] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("businesses").select("*").eq("owner_id", user.id).maybeSingle(),
    ]);
    return {
      userId: user.id,
      email: user.email ?? "",
      provider: (user.app_metadata?.provider as string) ?? "email",
      roles: (roles.data ?? []).map((r) => r.role as Role),
      profile: profile.data ?? null,
      business: business.data ?? null,
    };
  },
});

/** Only allow same-origin relative paths as post-login destinations. */
export function safeRedirect(r: unknown): string | undefined {
  if (typeof r !== "string" || !r.startsWith("/") || r.startsWith("//") || r.startsWith("/auth")) return undefined;
  return r;
}

export function homeFor(a: Account): string {
  if (a.roles.length === 0) return "/onboarding";
  if (a.roles.includes("business_owner")) return a.business ? "/app/dashboard" : "/setup";
  return "/me";
}

export const REDIRECT_KEY = "slotly:redirect";
