import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CalendarOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/brand";
import { HoursEditor } from "@/features/business/hours-editor";
import { rulesToWeek, saveWeek } from "@/features/business/hours";
import { rulesQuery, timeOffQuery, useBusiness } from "@/features/business/queries";
import { BlockTimeDialog } from "@/features/bookings/block-time-dialog";
import { fmtTz } from "@/lib/time";

export const Route = createFileRoute("/_authenticated/app/availability")({
  head: () => ({ meta: [{ title: "Availability — Slotly" }] }),
  component: AvailabilityPage,
});

function AvailabilityPage() {
  const business = useBusiness();
  const qc = useQueryClient();
  const { data: rules } = useSuspenseQuery(rulesQuery(business.id));
  const { data: off } = useSuspenseQuery(timeOffQuery(business.id));
  const [week, setWeek] = useState(() => rulesToWeek(rules));
  const [saving, setSaving] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  useEffect(() => setWeek(rulesToWeek(rules)), [rules]);

  async function save() {
    setSaving(true);
    try {
      await saveWeek(business.id, week);
      toast.success("Opening hours saved");
      qc.invalidateQueries({ queryKey: ["rules", business.id] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function removeOff(id: string) {
    const { error } = await supabase.from("time_off").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["time_off", business.id] });
  }

  return (
    <>
      <PageHeader title="Availability" sub={`Weekly opening hours · ${business.timezone}`} actions={<Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save hours"}</Button>} />
      <HoursEditor value={week} onChange={setWeek} />
      <div className="mb-4 mt-12 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">Closures & holidays</h2>
          <p className="text-sm text-muted-foreground">No bookings can be made during these times.</p>
        </div>
        <Button variant="outline" onClick={() => setBlockOpen(true)}><CalendarOff /> Add closure</Button>
      </div>
      {off.length === 0 ? (
        <EmptyState icon={<CalendarOff className="size-5" />} title="No closures planned" sub="Add holidays, days off or blocked hours." />
      ) : (
        <ul className="space-y-2">
          {off.map((t) => (
            <li key={t.id} className="surface flex items-center gap-3 p-4">
              <div className="flex-1">
                <div className="font-medium">{t.reason || "Closed"}</div>
                <div className="text-sm text-muted-foreground">{fmtTz(t.start_at, business.timezone, "EEE d MMM, HH:mm")} → {fmtTz(t.end_at, business.timezone, "EEE d MMM, HH:mm")}</div>
              </div>
              <Button variant="ghost" size="icon" aria-label="Remove closure" onClick={() => removeOff(t.id)}><Trash2 /></Button>
            </li>
          ))}
        </ul>
      )}
      <BlockTimeDialog open={blockOpen} onOpenChange={setBlockOpen} />
    </>
  );
}
