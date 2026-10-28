import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { rulesQuery, servicesQuery, useBusiness } from "@/features/business/queries";
import { SlotPicker } from "./slot-picker";
import { todayInTz } from "@/lib/time";

export function NewBookingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const business = useBusiness();
  const qc = useQueryClient();
  const { data: services } = useSuspenseQuery(servicesQuery(business.id));
  const { data: rules } = useSuspenseQuery(rulesQuery(business.id));
  const active = services.filter((s) => s.is_active);
  const [serviceId, setServiceId] = useState(active[0]?.id ?? "");
  const [date, setDate] = useState(todayInTz(business.timezone));
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!serviceId || !time) return toast.error("Choose a service and a time");
    if (name.trim().length < 2) return toast.error("Enter the customer's name");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return toast.error("Invalid email");
    setBusy(true);
    const { error } = await supabase.rpc("create_manual_booking", { service_id: serviceId, start_at: time, customer_name: name, customer_email: email || undefined, customer_phone: phone || undefined });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Booking added");
    qc.invalidateQueries({ queryKey: ["bookings", business.id] });
    qc.invalidateQueries({ queryKey: ["slots"] });
    setTime(null); setName(""); setEmail(""); setPhone("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader><DialogTitle>New booking</DialogTitle></DialogHeader>
        {active.length === 0 ? <p className="text-sm text-muted-foreground">Add an active service first.</p> : (
          <div className="space-y-5">
            <Field label="Service">
              <Select value={serviceId} onValueChange={(v) => { setServiceId(v); setTime(null); }}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{active.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {s.duration_min} min</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <SlotPicker slug={business.slug} serviceId={serviceId} tz={business.timezone} maxAdvanceDays={business.max_advance_days}
              openWeekdays={[...new Set(rules.map((r) => r.weekday))]} date={date} time={time} onDate={(d) => { setDate(d); setTime(null); }} onTime={setTime} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Customer name" htmlFor="nb-n"><Input id="nb-n" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-xl" /></Field>
              <Field label="Email" htmlFor="nb-e"><Input id="nb-e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl" /></Field>
              <Field label="Phone" htmlFor="nb-p"><Input id="nb-p" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 rounded-xl" /></Field>
            </div>
            <Button size="lg" className="w-full" onClick={submit} disabled={busy}>{busy ? "Adding…" : "Add booking"}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
