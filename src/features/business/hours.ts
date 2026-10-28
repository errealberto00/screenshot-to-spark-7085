import { supabase } from "@/integrations/supabase/client";
import type { Rule } from "@/lib/account";

export interface Range { start: string; end: string }
export interface DayHours { open: boolean; ranges: Range[] }
export type WeekHours = DayHours[]; // index = weekday (0 = Sunday)

export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function defaultWeek(): WeekHours {
  return Array.from({ length: 7 }, (_, d) => ({
    open: d >= 1 && d <= 5,
    ranges: [{ start: "09:00", end: "18:00" }],
  }));
}

export function rulesToWeek(rules: Rule[]): WeekHours {
  const week: WeekHours = Array.from({ length: 7 }, () => ({ open: false, ranges: [] as Range[] }));
  for (const r of [...rules].sort((a, b) => a.start_time.localeCompare(b.start_time))) {
    week[r.weekday].open = true;
    week[r.weekday].ranges.push({ start: r.start_time.slice(0, 5), end: r.end_time.slice(0, 5) });
  }
  for (const d of week) if (!d.ranges.length) d.ranges.push({ start: "09:00", end: "18:00" });
  return week;
}

/** Returns an error message, or null when every open range is valid and non-overlapping. */
export function validateWeek(week: WeekHours): string | null {
  for (let d = 0; d < 7; d++) {
    const day = week[d];
    if (!day.open) continue;
    const sorted = [...day.ranges].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].end <= sorted[i].start) return `${WEEKDAY_NAMES[d]}: closing time must be after opening time`;
      if (i > 0 && sorted[i].start < sorted[i - 1].end) return `${WEEKDAY_NAMES[d]}: time ranges overlap`;
    }
  }
  return null;
}

export async function saveWeek(businessId: string, week: WeekHours) {
  const err = validateWeek(week);
  if (err) throw new Error(err);
  const rows = week.flatMap((d, weekday) => (d.open ? d.ranges.map((r) => ({ business_id: businessId, weekday, start_time: r.start, end_time: r.end })) : []));
  const del = await supabase.from("availability_rules").delete().eq("business_id", businessId);
  if (del.error) throw del.error;
  if (rows.length) {
    const ins = await supabase.from("availability_rules").insert(rows);
    if (ins.error) throw ins.error;
  }
}
