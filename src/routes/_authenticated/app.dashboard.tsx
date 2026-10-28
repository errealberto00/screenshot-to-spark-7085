import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { addDays, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountUp, EmptyState, PageHeader, StatusBadge } from "@/components/brand";
import { bookingsQuery, useBusiness } from "@/features/business/queries";
import { BookingDrawer, useSetStatus } from "@/features/bookings/booking-drawer";
import { NewBookingDialog } from "@/features/bookings/new-booking-dialog";
import { CopyLink, OpenPage, QrBlock } from "@/features/business/share";
import { fmtTz, money, todayInTz } from "@/lib/time";
import type { Booking } from "@/lib/account";

export const Route = createFileRoute("/_authenticated/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Slotly" }] }),
  component: Dashboard,
});

const live = (b: Booking) => b.status !== "cancelled";

function Dashboard() {
  const business = useBusiness();
  const tz = business.timezone;
  const today = todayInTz(tz);
  const range = useMemo(() => {
    const from = new Date(Math.min(Date.now() - 31 * 86400_000, startOfMonth(parseISO(today)).getTime() - 86400_000));
    return { from: from.toISOString(), to: new Date(Date.now() + 9 * 86400_000).toISOString() };
  }, [today]);
  const { data: bookings } = useSuspenseQuery(bookingsQuery(business.id, range.from, range.to));
  const [open, setOpen] = useState<Booking | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const setStatus = useSetStatus();

  const stats = useMemo(() => {
    const day = (b: Booking) => fmtTz(b.start_at, tz, "yyyy-MM-dd");
    const weekStart = format(startOfWeek(parseISO(today), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const weekEnd = format(addDays(parseISO(weekStart), 7), "yyyy-MM-dd");
    const month = today.slice(0, 7);
    const last30 = format(addDays(parseISO(today), -29), "yyyy-MM-dd");
    const inLast30 = bookings.filter((b) => day(b) >= last30 && day(b) <= today);
    const firstSeen = new Map<string, string>();
    for (const b of bookings) { const k = (b.customer_email ?? b.customer_name).toLowerCase(); if (!firstSeen.has(k)) firstSeen.set(k, day(b)); }
    const chart = Array.from({ length: 30 }, (_, i) => {
      const d = format(addDays(parseISO(last30), i), "yyyy-MM-dd");
      return { d: format(parseISO(d), "d MMM"), v: bookings.filter((b) => live(b) && day(b) === d).length };
    });
    return {
      today: bookings.filter((b) => live(b) && day(b) === today).length,
      week: bookings.filter((b) => live(b) && day(b) >= weekStart && day(b) < weekEnd).length,
      revenue: bookings.filter((b) => (b.status === "confirmed" || b.status === "completed") && day(b).startsWith(month)).reduce((s, b) => s + Number(b.service_price ?? 0), 0),
      cancelRate: inLast30.length ? (inLast30.filter((b) => b.status === "cancelled").length / inLast30.length) * 100 : 0,
      newCustomers: [...firstSeen.values()].filter((d) => d.startsWith(month)).length,
      chart,
      todayList: bookings.filter((b) => day(b) === today),
      pending: bookings.filter((b) => b.status === "pending" && new Date(b.start_at) > new Date()),
    };
  }, [bookings, tz, today]);

  const kpis = [
    { l: "Bookings today", v: stats.today },
    { l: "This week", v: stats.week },
    { l: "Revenue this month", v: stats.revenue, f: (n: number) => money(Math.round(n), business.currency) },
    { l: "Cancellation rate", v: stats.cancelRate, f: (n: number) => `${n.toFixed(0)}%` },
    { l: "New customers", v: stats.newCustomers },
  ];

  return (
    <>
      <PageHeader title={`Good ${greeting()}`} sub={fmtTz(new Date(), tz, "EEEE d MMMM")} actions={<Button onClick={() => setNewOpen(true)}><Plus /> New booking</Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.l} className="surface p-5">
            <div className="text-xs text-muted-foreground">{k.l}</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight"><CountUp value={k.v} format={k.f} /></div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2">
          <div className="mb-4 text-sm font-medium">Bookings · last 30 days</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chart} margin={{ left: -24, right: 4, top: 4 }}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="d" tickLine={false} axisLine={false} fontSize={11} interval={6} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 12 }} />
                <Area type="monotone" dataKey="v" name="Bookings" stroke="var(--chart-1)" strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="surface flex flex-col gap-4 p-5">
          <div className="text-sm font-medium">Share your page</div>
          <CopyLink slug={business.slug} />
          <div className="flex items-end justify-between gap-3">
            <QrBlock slug={business.slug} size={112} />
            <OpenPage slug={business.slug} />
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between"><div className="text-sm font-medium">Today</div><Link to="/app/bookings" className="text-xs text-primary hover:underline">All bookings</Link></div>
          {stats.todayList.length === 0 ? (
            <EmptyState title="Nothing booked today" sub="Share your link to fill your calendar." />
          ) : (
            <ol className="relative space-y-2 border-l pl-5">
              {stats.todayList.map((b) => (
                <li key={b.id}>
                  <span className="absolute -left-[5px] mt-4 size-2.5 rounded-full border-2 border-card bg-primary" />
                  <button onClick={() => setOpen(b)} className="flex w-full items-center gap-4 rounded-xl p-3 text-left hover:bg-accent">
                    <div className="w-14 font-mono text-sm font-medium">{fmtTz(b.start_at, tz, "HH:mm")}</div>
                    <div className="min-w-0 flex-1"><div className="truncate font-medium">{b.customer_name}</div><div className="truncate text-xs text-muted-foreground">{b.service_name}</div></div>
                    <StatusBadge status={b.status} />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="surface p-5">
          <div className="mb-4 text-sm font-medium">Pending approval</div>
          {stats.pending.length === 0 ? <p className="text-sm text-muted-foreground">{business.auto_confirm ? "Auto-confirm is on — bookings are confirmed instantly." : "All caught up."}</p> : (
            <ul className="space-y-2">
              {stats.pending.map((b) => (
                <li key={b.id} className="rounded-xl border p-3">
                  <div className="font-medium">{b.customer_name}</div>
                  <div className="text-xs text-muted-foreground">{b.service_name} · {fmtTz(b.start_at, tz, "EEE d MMM, HH:mm")}</div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => setStatus(b, "confirmed")}><Check /> Confirm</Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(b, "cancelled")}><X /> Decline</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <BookingDrawer booking={open} onOpenChange={(o) => !o && setOpen(null)} />
      <NewBookingDialog open={newOpen} onOpenChange={setNewOpen} />
    </>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}
