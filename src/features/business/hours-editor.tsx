import { Copy, Plus, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WEEKDAY_NAMES, WEEKDAY_ORDER, type WeekHours } from "./hours";
import { cn } from "@/lib/utils";

export function HoursEditor({ value, onChange }: { value: WeekHours; onChange: (w: WeekHours) => void }) {
  const update = (d: number, fn: (day: WeekHours[number]) => WeekHours[number]) => onChange(value.map((x, i) => (i === d ? fn(structuredClone(x)) : x)));
  const copyToAll = (d: number) => onChange(value.map(() => structuredClone(value[d])));

  return (
    <div className="divide-y rounded-2xl border bg-card">
      {WEEKDAY_ORDER.map((d) => {
        const day = value[d];
        return (
          <div key={d} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
            <label className="flex w-40 shrink-0 items-center gap-3 pt-2">
              <Switch checked={day.open} onCheckedChange={(open) => update(d, (x) => ({ ...x, open }))} aria-label={`${WEEKDAY_NAMES[d]} open`} />
              <span className={cn("text-sm font-medium", !day.open && "text-muted-foreground")}>{WEEKDAY_NAMES[d]}</span>
            </label>
            <div className="flex-1 space-y-2">
              {day.open ? (
                day.ranges.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input type="time" value={r.start} aria-label="Opens" className="h-10 w-32 rounded-xl"
                      onChange={(e) => update(d, (x) => { x.ranges[i].start = e.target.value; return x; })} />
                    <span className="text-muted-foreground">–</span>
                    <Input type="time" value={r.end} aria-label="Closes" className="h-10 w-32 rounded-xl"
                      onChange={(e) => update(d, (x) => { x.ranges[i].end = e.target.value; return x; })} />
                    {day.ranges.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" aria-label="Remove range"
                        onClick={() => update(d, (x) => ({ ...x, ranges: x.ranges.filter((_, j) => j !== i) }))}>
                        <X />
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <p className="pt-2 text-sm text-muted-foreground">Closed</p>
              )}
            </div>
            {day.open && (
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => update(d, (x) => ({ ...x, ranges: [...x.ranges, { start: "14:00", end: "18:00" }] }))}>
                  <Plus /> Range
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => copyToAll(d)} aria-label={`Copy ${WEEKDAY_NAMES[d]} to all days`}>
                  <Copy /> Copy to all
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
