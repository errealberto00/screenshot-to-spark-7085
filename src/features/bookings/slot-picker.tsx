import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { addDays, format, parseISO } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { dayPart, fmtTz, todayInTz } from "@/lib/time";
import { cn } from "@/lib/utils";

interface Props {
  slug: string;
  serviceId: string;
  tz: string;
  maxAdvanceDays: number;
  openWeekdays: number[];
  date: string;
  time: string | null;
  onDate: (d: string) => void;
  onTime: (iso: string) => void;
}

export function SlotPicker({ slug, serviceId, tz, maxAdvanceDays, openWeekdays, date, time, onDate, onTime }: Props) {
  const today = todayInTz(tz);
  const days = useMemo(() => Array.from({ length: Math.min(maxAdvanceDays + 1, 60) }, (_, i) => format(addDays(parseISO(today), i), "yyyy-MM-dd")), [today, maxAdvanceDays]);
  const lastDay = format(addDays(parseISO(today), maxAdvanceDays), "yyyy-MM-dd");
  const strip = useRef<HTMLDivElement>(null);
  const isOpen = (d: string) => openWeekdays.includes(parseISO(d).getDay()) && d <= lastDay;

  const slots = useQuery({
    queryKey: ["slots", slug, serviceId, date],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_available_slots", { business_slug: slug, service_id: serviceId, day: date });
      if (error) throw error;
      return (data ?? []) as unknown as string[];
    },
  });

  const groups = useMemo(() => {
    const g = { morning: [] as string[], afternoon: [] as string[], evening: [] as string[] };
    for (const s of slots.data ?? []) g[dayPart(s, tz)].push(s);
    return g;
  }, [slots.data, tz]);

  const scroll = (dir: number) => strip.current?.scrollBy({ left: dir * 280, behavior: "smooth" });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium">{format(parseISO(date), "MMMM yyyy")}</div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label="Earlier dates" onClick={() => scroll(-1)}><ChevronLeft /></Button>
          <Button variant="ghost" size="icon" aria-label="Later dates" onClick={() => scroll(1)}><ChevronRight /></Button>
          <Popover>
            <PopoverTrigger asChild><Button variant="outline" size="icon" aria-label="Open month calendar"><CalendarDays /></Button></PopoverTrigger>
            <PopoverContent align="end" className="w-auto rounded-2xl p-0">
              <Calendar
                mode="single"
                selected={parseISO(date)}
                onSelect={(d) => d && onDate(format(d, "yyyy-MM-dd"))}
                disabled={(d) => { const s = format(d, "yyyy-MM-dd"); return s < today || !isOpen(s); }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <div ref={strip} className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
        {days.map((d) => {
          const dt = parseISO(d);
          const open = isOpen(d);
          const sel = d === date;
          return (
            <button key={d} disabled={!open} onClick={() => onDate(d)} aria-pressed={sel} aria-label={format(dt, "EEEE d MMMM")}
              className={cn("flex h-[72px] w-14 shrink-0 snap-start flex-col items-center justify-center rounded-2xl border text-sm transition-all",
                sel ? "border-brand bg-brand text-brand-foreground" : "bg-card hover:border-foreground/30",
                !open && "cursor-not-allowed border-transparent bg-muted text-muted-foreground/50")}>
              <span className="text-[11px] uppercase opacity-70">{format(dt, "EEE")}</span>
              <span className="text-lg font-semibold">{format(dt, "d")}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{copy.booking.timezone} {tz.replace("_", " ")}</p>
      <div className="mt-5 space-y-5">
        {slots.isLoading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11 rounded-xl" />)}</div>
        ) : (slots.data ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">{copy.booking.noSlots}</p>
        ) : (
          (["morning", "afternoon", "evening"] as const).map((k) =>
            groups[k].length ? (
              <div key={k}>
                <div className="eyebrow mb-2">{copy.booking[k]}</div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {groups[k].map((s) => {
                    const sel = time === s;
                    return (
                      <motion.button key={s} whileTap={{ scale: 0.95 }} onClick={() => onTime(s)} aria-pressed={sel}
                        className={cn("relative h-11 rounded-xl border text-sm font-medium transition-colors", sel ? "border-brand text-brand-foreground" : "bg-card hover:border-foreground/30")}>
                        {sel && <motion.span layoutId="slot-sel" className="absolute inset-0 rounded-xl bg-brand" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                        <span className="relative">{fmtTz(s, tz, "HH:mm")}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ) : null,
          )
        )}
      </div>
    </div>
  );
}
