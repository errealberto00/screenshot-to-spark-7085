import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/field";
import { useBusiness } from "@/features/business/queries";
import { todayInTz, zonedToUtc } from "@/lib/time";

const schema = z
  .object({
    startDate: z.string().min(1, "Required"),
    startTime: z.string().min(1, "Required"),
    endDate: z.string().min(1, "Required"),
    endTime: z.string().min(1, "Required"),
    reason: z.string().max(120).optional(),
  })
  .refine((v) => `${v.endDate}T${v.endTime}` > `${v.startDate}T${v.startTime}`, { message: "End must be after start", path: ["endTime"] });

export function BlockTimeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const business = useBusiness();
  const qc = useQueryClient();
  const today = todayInTz(business.timezone);
  const f = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { startDate: today, startTime: "00:00", endDate: today, endTime: "23:59", reason: "" } });
  const submit = f.handleSubmit(async (v) => {
    const { error } = await supabase.from("time_off").insert({
      business_id: business.id,
      start_at: zonedToUtc(v.startDate, v.startTime, business.timezone).toISOString(),
      end_at: zonedToUtc(v.endDate, v.endTime, business.timezone).toISOString(),
      reason: v.reason || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Time blocked");
    qc.invalidateQueries({ queryKey: ["time_off", business.id] });
    onOpenChange(false);
    f.reset();
  });
  const e = f.formState.errors;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Block time</DialogTitle>
          <DialogDescription>Customers won't be able to book during this period. Times in {business.timezone}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="From" htmlFor="bt-sd" error={e.startDate?.message}><Input id="bt-sd" type="date" className="h-11 rounded-xl" {...f.register("startDate")} /></Field>
            <Field label="Time" htmlFor="bt-st" error={e.startTime?.message}><Input id="bt-st" type="time" className="h-11 rounded-xl" {...f.register("startTime")} /></Field>
            <Field label="Until" htmlFor="bt-ed" error={e.endDate?.message}><Input id="bt-ed" type="date" className="h-11 rounded-xl" {...f.register("endDate")} /></Field>
            <Field label="Time" htmlFor="bt-et" error={e.endTime?.message}><Input id="bt-et" type="time" className="h-11 rounded-xl" {...f.register("endTime")} /></Field>
          </div>
          <Field label="Reason (optional)" htmlFor="bt-r"><Input id="bt-r" placeholder="e.g. Summer holiday" className="h-11 rounded-xl" {...f.register("reason")} /></Field>
          <Button type="submit" size="lg" className="w-full" disabled={f.formState.isSubmitting}>Block time</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
