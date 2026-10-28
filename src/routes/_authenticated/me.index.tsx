import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarHeart, CalendarPlus, RotateCcw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmptyState, PageHeader, StatusBadge } from "@/components/brand";
import { copy } from "@/lib/copy";
import { canCustomerCancel, fmtTz, googleCalendarUrl } from "@/lib/time";

export const Route = createFileRoute("/_authenticated/me/")({
  head: () => ({ meta: [{ title: "My bookings — Slotly" }, { name: "description", content: "Your upcoming and past appointments." }] }),
  component: MyBookings,
});

const myBookingsQuery = queryOptions({
  queryKey: ["my-bookings"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("bookings")
      .select("*, businesses(name, slug, logo_url, timezone, cancellation_window_hours, address, city, accent_color)")
      .eq("customer_id", u.user?.id ?? "")
      .order("start_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});
type Row = Awaited<ReturnType<NonNullable<typeof myBookingsQuery.queryFn>>>[number];

function MyBookings() {
  const { data } = useSuspenseQuery(myBookingsQuery);
  const now = Date.now();
  const upcoming = data.filter((b) => (b.status === "pending" || b.status === "confirmed") && new Date(b.end_at).getTime() > now).reverse();
  const past = data.filter((b) => b.status !== "cancelled" && !(upcoming.includes(b)));
  const cancelled = data.filter((b) => b.status === "cancelled");
  return (
    <>
      <PageHeader title={copy.me.title} />
      <Tabs defaultValue="upcoming">
        <TabsList className="mb-5 rounded-xl">
          <TabsTrigger value="upcoming" className="rounded-lg">{copy.me.upcoming} ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past" className="rounded-lg">{copy.me.past}</TabsTrigger>
          <TabsTrigger value="cancelled" className="rounded-lg">{copy.me.cancelled}</TabsTrigger>
        </TabsList>
        {([["upcoming", upcoming], ["past", past], ["cancelled", cancelled]] as const).map(([k, list]) => (
          <TabsContent key={k} value={k} className="space-y-3">
            {list.length === 0 ? (
              <EmptyState icon={<CalendarHeart className="size-5" />} title={copy.me.empty} sub="Bookings you make on any Slotly page show up here." action={<Button asChild variant="outline"><a href="/b/demo">Try the demo page</a></Button>} />
            ) : list.map((b) => <BookingCard key={b.id} b={b} upcoming={k === "upcoming"} />)}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}

function BookingCard({ b, upcoming }: { b: Row; upcoming: boolean }) {
  const qc = useQueryClient();
  const biz = b.businesses;
  const tz = biz?.timezone ?? "Europe/Rome";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canCancel = canCustomerCancel(b.start_at, biz?.cancellation_window_hours ?? 24);

  async function cancel() {
    qc.setQueryData(myBookingsQuery.queryKey, (old: Row[] | undefined) => old?.map((x) => (x.id === b.id ? { ...x, status: "cancelled" as const } : x)));
    const { error } = await supabase.rpc("cancel_booking", { booking_id: b.id });
    if (error) toast.error(error.message);
    else toast.success("Booking cancelled");
    qc.invalidateQueries({ queryKey: myBookingsQuery.queryKey });
  }

  return (
    <div className="surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-soft font-semibold text-primary">
          {biz?.logo_url ? <img src={biz.logo_url} alt="" className="size-full object-cover" /> : biz?.name.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2"><span className="truncate font-medium">{b.service_name}</span><StatusBadge status={b.status} /></div>
          <div className="truncate text-sm text-muted-foreground">{biz?.name}</div>
          <div className="text-sm">{fmtTz(b.start_at, tz, "EEE d MMM yyyy · HH:mm")} <span className="text-xs text-muted-foreground">({tz})</span></div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {upcoming && (
          <>
            <Button variant="outline" size="sm" asChild>
              <a href={googleCalendarUrl({ title: `${b.service_name} at ${biz?.name}`, start: b.start_at, end: b.end_at, location: [biz?.address, biz?.city].filter(Boolean).join(", ") })} target="_blank" rel="noreferrer"><CalendarPlus /> {copy.me.addCal}</a>
            </Button>
            {canCancel ? (
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmOpen(true)}><X /> {copy.me.cancel}</Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild><span><Button variant="ghost" size="sm" disabled><X /> {copy.me.cancel}</Button></span></TooltipTrigger>
                <TooltipContent>{copy.me.cancelTooLate}</TooltipContent>
              </Tooltip>
            )}
          </>
        )}
        {biz && (
          <Button variant="soft" size="sm" asChild>
            <Link to="/b/$slug" params={{ slug: biz.slug }} search={{ service: b.service_id ?? undefined, step: b.service_id ? 2 : 1 }}><RotateCcw /> {copy.me.rebook}</Link>
          </Button>
        )}
      </div>
      {!canCancel && upcoming && <p className="text-xs text-muted-foreground sm:hidden">{copy.me.cancelTooLate}</p>}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>{b.service_name} at {biz?.name}, {fmtTz(b.start_at, tz, "EEE d MMM · HH:mm")}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={cancel}>Cancel booking</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
