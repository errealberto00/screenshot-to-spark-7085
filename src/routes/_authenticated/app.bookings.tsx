import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { CalendarOff, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageHeader, StatusBadge, statusBlock } from "@/components/brand";
import { bookingsQuery, servicesQuery, useBusiness } from "@/features/business/queries";
import { BookingDrawer } from "@/features/bookings/booking-drawer";
import { NewBookingDialog } from "@/features/bookings/new-booking-dialog";
import { BlockTimeDialog } from "@/features/bookings/block-time-dialog";
import { fmtTz, todayInTz, zonedToUtc } from "@/lib/time";
import { copy } from "@/lib/copy";
import type { Booking } from "@/lib/account";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/bookings")({
  validateSearch: z.object({ view: z.enum(["calendar", "list"]).optional(), open: z.string().optional() }),
  head: () => ({ meta: [{ title: "Bookings — Slotly" }] }),
  component: BookingsPage,
});

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 07–21
const HOUR_PX = 56;

function BookingsPage() {
  const business = useBusiness();
  const tz = business.timezone;
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const view = search.view ?? "calendar";
  const [mode, setMode] = useState<"day" | "week">("week");
  const [anchor, setAnchor] = useState(todayInTz(tz));
  const [selected, setSelected] = useState<Booking | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  const days = useMemo(() => {
    const start = mode === "day" ? parseISO(anchor) : startOfWeek(parseISO(anchor), { weekStartsOn: 1 });
    return Array.from({ length: mode === "day" ? 1 : 7 }, (_, i) => format(addDays(start, i), "yyyy-MM-dd"));
  }, [anchor, mode]);

  // List filters
  const [from, setFrom] = useState(format(addDays(parseISO(todayInTz(tz)), -30), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(addDays(parseISO(todayInTz(tz)), 60), "yyyy-MM-dd"));
  const [status, setStatus] = useState("all");
  const [service, setService] = useState("all");
  const [q, setQ] = useState("");

  const rangeFrom = view === "calendar" ? days[0] : from;
  const rangeTo = view === "calendar" ? format(addDays(parseISO(days[days.length - 1]), 1), "yyyy-MM-dd") : format(addDays(parseISO(to), 1), "yyyy-MM-dd");
  const bookings = useQuery(bookingsQuery(business.id, zonedToUtc(rangeFrom, "00:00", tz).toISOString(), zonedToUtc(rangeTo, "00:00", tz).toISOString()));
  const services = useQuery(servicesQuery(business.id));

  useEffect(() => {
    if (search.open && bookings.data) {
      const b = bookings.data.find((x) => x.id === search.open);
      if (b) setSelected(b);
    }
  }, [search.open, bookings.data]);

  const filtered = (bookings.data ?? []).filter((b) =>
    (status === "all" || b.status === status) &&
    (service === "all" || b.service_id === service) &&
    (!q || `${b.customer_name} ${b.customer_email ?? ""}`.toLowerCase().includes(q.toLowerCase())));

  const shift = (n: number) => setAnchor(format(addDays(parseISO(anchor), n * (mode === "day" ? 1 : 7)), "yyyy-MM-dd"));

  return (
    <>
      <PageHeader title="Bookings" actions={<>
        <Button variant="outline" onClick={() => setBlockOpen(true)}><CalendarOff /> Block time</Button>
        <Button onClick={() => setNewOpen(true)}><Plus /> New booking</Button>
      </>} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ToggleGroup type="single" value={view} onValueChange={(v) => v && navigate({ search: { view: v as "calendar" | "list" } })} className="rounded-xl border bg-card p-1">
          <ToggleGroupItem value="calendar" className="rounded-lg px-3">Calendar</ToggleGroupItem>
          <ToggleGroupItem value="list" className="rounded-lg px-3">List</ToggleGroupItem>
        </ToggleGroup>
        {view === "calendar" && (
          <>
            <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as "day" | "week")} className="rounded-xl border bg-card p-1">
              <ToggleGroupItem value="day" className="rounded-lg px-3">Day</ToggleGroupItem>
              <ToggleGroupItem value="week" className="rounded-lg px-3">Week</ToggleGroupItem>
            </ToggleGroup>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Previous" onClick={() => shift(-1)}><ChevronLeft /></Button>
              <Button variant="outline" size="sm" onClick={() => setAnchor(todayInTz(tz))}>Today</Button>
              <Button variant="ghost" size="icon" aria-label="Next" onClick={() => shift(1)}><ChevronRight /></Button>
              <span className="ml-2 text-sm font-medium">{format(parseISO(days[0]), "d MMM")}{days.length > 1 && ` – ${format(parseISO(days[6]), "d MMM yyyy")}`}</span>
            </div>
          </>
        )}
      </div>

      {view === "calendar" ? (
        <div className="surface overflow-x-auto">
          <div className="min-w-[640px]" style={{ display: "grid", gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
            <div className="border-b" />
            {days.map((d) => (
              <div key={d} className={cn("border-b border-l p-2 text-center text-xs", d === todayInTz(tz) && "text-primary")}>
                <div className="uppercase text-muted-foreground">{format(parseISO(d), "EEE")}</div>
                <div className="text-lg font-semibold">{format(parseISO(d), "d")}</div>
              </div>
            ))}
            <div>{HOURS.map((h) => <div key={h} style={{ height: HOUR_PX }} className="pr-2 pt-1 text-right font-mono text-[10px] text-muted-foreground">{String(h).padStart(2, "0")}:00</div>)}</div>
            {days.map((d) => (
              <div key={d} className="relative border-l" style={{ height: HOURS.length * HOUR_PX }}>
                {HOURS.map((h) => <div key={h} style={{ height: HOUR_PX }} className="border-b border-dashed" />)}
                {bookings.isLoading && <Skeleton className="absolute inset-x-1 top-20 h-16 rounded-lg" />}
                {(bookings.data ?? []).filter((b) => fmtTz(b.start_at, tz, "yyyy-MM-dd") === d).map((b) => {
                  const [sh, sm] = fmtTz(b.start_at, tz, "H:m").split(":").map(Number);
                  const top = (sh - HOURS[0] + sm / 60) * HOUR_PX;
                  const height = Math.max(24, ((new Date(b.end_at).getTime() - new Date(b.start_at).getTime()) / 3600_000) * HOUR_PX - 2);
                  return (
                    <button key={b.id} onClick={() => setSelected(b)} style={{ top, height }}
                      className={cn("absolute inset-x-1 overflow-hidden rounded-lg border border-card px-2 py-1 text-left text-xs transition-transform hover:z-10 hover:scale-[1.02]", statusBlock[b.status], b.status === "cancelled" && "opacity-60 line-through")}>
                      <div className="font-semibold">{fmtTz(b.start_at, tz, "HH:mm")} {b.customer_name}</div>
                      <div className="truncate opacity-80">{b.service_name}</div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input placeholder="Search customer name or email" value={q} onChange={(e) => setQ(e.target.value)} className="h-10 rounded-xl pl-9" aria-label="Search bookings" />
            </div>
            <div className="flex gap-2 lg:col-span-1">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-xl" aria-label="From date" />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-xl" aria-label="To date" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 rounded-xl" aria-label="Status"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All statuses</SelectItem>{Object.entries(copy.status).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger className="h-10 rounded-xl" aria-label="Service"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All services</SelectItem>{(services.data ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {bookings.isLoading ? <Skeleton className="h-64 rounded-2xl" /> : filtered.length === 0 ? (
            <EmptyState title="No bookings match" sub="Try widening the dates or clearing filters." />
          ) : (
            <div className="surface overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Customer</TableHead><TableHead className="hidden sm:table-cell">Service</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filtered.map((b) => (
                    <TableRow key={b.id} className="cursor-pointer" onClick={() => setSelected(b)}>
                      <TableCell className="whitespace-nowrap font-mono text-xs">{fmtTz(b.start_at, tz, "dd MMM · HH:mm")}</TableCell>
                      <TableCell><div className="font-medium">{b.customer_name}</div><div className="text-xs text-muted-foreground">{b.customer_email}</div></TableCell>
                      <TableCell className="hidden sm:table-cell">{b.service_name}</TableCell>
                      <TableCell><StatusBadge status={b.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
      <BookingDrawer booking={selected} onOpenChange={(o) => { if (!o) { setSelected(null); if (search.open) navigate({ search: { view } }); } }} />
      <NewBookingDialog open={newOpen} onOpenChange={setNewOpen} />
      <BlockTimeDialog open={blockOpen} onOpenChange={setBlockOpen} />
    </>
  );
}
