import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, CheckCheck, Mail, Phone, UserX, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/brand";
import { useBusiness } from "@/features/business/queries";
import type { Booking } from "@/lib/account";
import { fmtTz, money } from "@/lib/time";
import type { Database } from "@/integrations/supabase/types";

type Status = Database["public"]["Enums"]["booking_status"];

/** Optimistic status change shared by drawer, dashboard and lists. */
export function useSetStatus() {
  const qc = useQueryClient();
  const business = useBusiness();
  return async (b: Booking, status: Status) => {
    const key = ["bookings", business.id];
    const prev = qc.getQueriesData<Booking[]>({ queryKey: key });
    qc.setQueriesData<Booking[]>({ queryKey: key }, (old) => old?.map((x) => (x.id === b.id ? { ...x, status } : x)));
    const { error } = status === "cancelled"
      ? await supabase.rpc("cancel_booking", { booking_id: b.id })
      : await supabase.from("bookings").update({ status }).eq("id", b.id);
    if (error) {
      prev.forEach(([k, v]) => qc.setQueryData(k, v));
      toast.error(error.message);
      return false;
    }
    toast.success(`Marked as ${status.replace("_", "-")}`);
    qc.invalidateQueries({ queryKey: key });
    return true;
  };
}

export function BookingDrawer({ booking, onOpenChange }: { booking: Booking | null; onOpenChange: (o: boolean) => void }) {
  const business = useBusiness();
  const setStatus = useSetStatus();
  const [notes, setNotes] = useState("");
  const [b, setB] = useState(booking);
  useEffect(() => {
    setB(booking);
    if (!booking) return;
    setNotes("");
    supabase.from("booking_internal_notes").select("notes").eq("booking_id", booking.id).maybeSingle().then(({ data }) => setNotes(data?.notes ?? ""));
  }, [booking]);

  async function saveNotes() {
    if (!b) return;
    const { error } = await supabase.from("booking_internal_notes").upsert({ booking_id: b.id, business_id: business.id, notes, updated_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    toast.success("Notes saved");
  }
  const act = async (s: Status) => { if (b && (await setStatus(b, s))) setB({ ...b, status: s }); };
  const tz = business.timezone;
  const active = b && (b.status === "pending" || b.status === "confirmed");

  return (
    <Sheet open={!!booking} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {b && (
          <>
            <SheetHeader className="text-left">
              <StatusBadge status={b.status} className="w-fit" />
              <SheetTitle className="text-2xl">{b.customer_name}</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-6 px-4 pb-8">
              <div className="rounded-2xl border p-4">
                <div className="text-sm text-muted-foreground">{fmtTz(b.start_at, tz, "EEEE d MMMM yyyy")}</div>
                <div className="text-xl font-semibold">{fmtTz(b.start_at, tz, "HH:mm")} – {fmtTz(b.end_at, tz, "HH:mm")}</div>
                <div className="mt-2 text-sm">{b.service_name} · {money(b.service_price, business.currency)}</div>
              </div>
              <div className="space-y-2 text-sm">
                {b.customer_email && <a href={`mailto:${b.customer_email}`} className="flex items-center gap-2 hover:text-primary"><Mail className="size-4 text-muted-foreground" />{b.customer_email}</a>}
                {b.customer_phone && <a href={`tel:${b.customer_phone}`} className="flex items-center gap-2 hover:text-primary"><Phone className="size-4 text-muted-foreground" />{b.customer_phone}</a>}
                {!b.customer_id && <p className="text-xs text-muted-foreground">Added manually</p>}
              </div>
              {b.customer_notes && (
                <div><div className="eyebrow mb-1">Customer notes</div><p className="rounded-xl bg-muted p-3 text-sm">{b.customer_notes}</p></div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {b.status === "pending" && <Button onClick={() => act("confirmed")}><Check /> Confirm</Button>}
                {active && <Button variant="outline" onClick={() => act("completed")}><CheckCheck /> Complete</Button>}
                {active && <Button variant="outline" onClick={() => act("no_show")}><UserX /> No-show</Button>}
                {active && <Button variant="outline" className="text-destructive" onClick={() => act("cancelled")}><X /> Cancel</Button>}
              </div>
              <div>
                <div className="eyebrow mb-1">Internal notes · only you can see these</div>
                <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl" aria-label="Internal notes" />
                <Button size="sm" variant="soft" className="mt-2" onClick={saveNotes}>Save notes</Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
