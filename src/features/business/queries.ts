import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { accountQuery, type Business } from "@/lib/account";

export function useBusiness(): Business {
  const { data } = useSuspenseQuery(accountQuery);
  if (!data?.business) throw new Error("No business");
  return data.business;
}

export const servicesQuery = (bid: string) =>
  queryOptions({
    queryKey: ["services", bid],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").eq("business_id", bid).order("sort_order").order("created_at");
      if (error) throw error;
      return data;
    },
  });

export const rulesQuery = (bid: string) =>
  queryOptions({
    queryKey: ["rules", bid],
    queryFn: async () => {
      const { data, error } = await supabase.from("availability_rules").select("*").eq("business_id", bid);
      if (error) throw error;
      return data;
    },
  });

export const timeOffQuery = (bid: string) =>
  queryOptions({
    queryKey: ["time_off", bid],
    queryFn: async () => {
      const { data, error } = await supabase.from("time_off").select("*").eq("business_id", bid).gte("end_at", new Date(Date.now() - 30 * 86400_000).toISOString()).order("start_at");
      if (error) throw error;
      return data;
    },
  });

export const bookingsQuery = (bid: string, fromIso: string, toIso: string) =>
  queryOptions({
    queryKey: ["bookings", bid, fromIso, toIso],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").eq("business_id", bid).gte("start_at", fromIso).lt("start_at", toIso).order("start_at");
      if (error) throw error;
      return data;
    },
  });
