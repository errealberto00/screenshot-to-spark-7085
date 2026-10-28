import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, CalendarPlus, Check, Clock, Download, Globe, Instagram, Loader2, MapPin, Phone, SearchX } from "lucide-react";
import { getPublicBusiness } from "@/lib/public.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/brand";
import { Field } from "@/components/field";
import { SlotPicker } from "@/features/bookings/slot-picker";
import { AuthPanel } from "@/features/auth/auth-panel";
import { accountQuery, type Booking } from "@/lib/account";
import { copy } from "@/lib/copy";
import { downloadIcs, fmtTz, googleCalendarUrl, money, todayInTz } from "@/lib/time";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  service: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().optional(),
  step: z.coerce.number().int().min(1).max(3).optional(),
});

export const Route = createFileRoute("/b/$slug")({
  validateSearch: searchSchema,
  loader: ({ params }) => getPublicBusiness({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    const b = loaderData?.business;
    if (!b) return { meta: [{ title: "Page not available — Slotly" }, { name: "robots", content: "noindex" }] };
    const desc = b.description?.slice(0, 155) || `Book an appointment at ${b.name}${b.city ? ` in ${b.city}` : ""}.`;
    const meta = [
      { title: `${b.name} — Book online` },
      { name: "description", content: desc },
      { property: "og:title", content: `${b.name} — Book online` },
      { property: "og:description", content: desc },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (b.cover_url?.startsWith("https://")) meta.push({ property: "og:image", content: b.cover_url }, { name: "twitter:image", content: b.cover_url });
    return { meta };
  },
  component: BookingPage,
});

function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

function BookingPage() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const hydrated = useHydrated();
  const qc = useQueryClient();
  const router = useRouter();
  const account = useQuery({ ...accountQuery, enabled: hydrated });
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Booking | null>(null);

  if (!data) return <Unavailable />;
  const { business: b, services, rules } = data;
  const tz = b.timezone;
  const step = search.step ?? 1;
  const service = services.find((s) => s.id === search.service);
  const date = search.date ?? todayInTz(tz);
  const set = (patch: Partial<z.infer<typeof searchSchema>>) => navigate({ search: (s) => ({ ...s, ...patch }), replace: true, resetScroll: false });
  const style = { "--brand": b.accent_color } as CSSProperties;

  async function confirm() {
    if (!service || !search.time) return;
    setBusy(true);
    const { data: res, error } = await supabase.rpc("create_booking", { business_id: b.id, service_id: service.id, start_at: search.time, customer_notes: notes || undefined, customer_phone: phone || undefined });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["slots"] });
      if (/taken|soon|outside/i.test(error.message)) set({ step: 2, time: undefined });
      return;
    }
    setDone(res as Booking);
    qc.invalidateQueries({ queryKey: ["slots"] });
  }

  const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : `/b/${b.slug}`;
  const event = done && { title: `${done.service_name} at ${b.name}`, start: done.start_at, end: done.end_at, location: [b.address, b.city].filter(Boolean).join(", "), details: `Booked via Slotly`, uid: done.id };

  return (
    <div style={style} className="min-h-screen pb-32">
      <div className="relative h-44 overflow-hidden bg-brand-soft sm:h-60">
        {b.cover_url ? <img src={b.cover_url} alt="" className="size-full object-cover" /> : <div className="dotgrid size-full opacity-70" />}
      </div>
      <div className="mx-auto max-w-2xl px-4">
        <div className="-mt-10 flex items-end gap-4">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-background bg-brand text-2xl font-semibold text-brand-foreground shadow-lift">
            {b.logo_url ? <img src={b.logo_url} alt={`${b.name} logo`} className="size-full object-cover" /> : b.name.slice(0, 1)}
          </div>
        </div>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">{b.name}</h1>
        {b.category && <p className="text-muted-foreground">{b.category}</p>}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {(b.address || b.city) && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{[b.address, b.city].filter(Boolean).join(", ")}</span>}
          {b.phone && <a href={`tel:${b.phone}`} className="flex items-center gap-1 hover:text-foreground"><Phone className="size-3.5" />{b.phone}</a>}
          {b.website && <a href={b.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-foreground"><Globe className="size-3.5" />Website</a>}
          {b.instagram && <a href={`https://instagram.com/${b.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-foreground"><Instagram className="size-3.5" />@{b.instagram.replace(/^@/, "")}</a>}
        </div>
        {b.description && <p className="mt-4 text-[15px] leading-relaxed">{b.description}</p>}

        {!done && (
          <div className="mt-8 flex items-center gap-2" aria-label="Booking steps">
            {copy.booking.steps.map((s, i) => (
              <div key={s} className="flex flex-1 items-center gap-2">
                <span className={cn("grid size-6 place-items-center rounded-full text-xs font-semibold transition-colors", i + 1 <= step ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground")}>{i + 1 < step ? <Check className="size-3" /> : i + 1}</span>
                <span className={cn("hidden text-sm sm:inline", i + 1 === step ? "font-medium" : "text-muted-foreground")}>{s}</span>
                {i < 2 && <span className="h-px flex-1 bg-border" />}
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.section key={done ? "done" : step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="mt-6">
            {done && event ? (
              <div className="surface p-6 text-center sm:p-8">
                <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-brand text-brand-foreground"><Check className="size-6" /></motion.div>
                <h2 className="text-2xl font-semibold">{done.status === "pending" ? copy.booking.donePending : copy.booking.doneConfirmed}</h2>
                {done.status === "pending" && <p className="mt-1 text-sm text-muted-foreground">{copy.booking.donePendingSub}</p>}
                <div className="mx-auto mt-6 max-w-sm rounded-2xl border p-4 text-left text-sm">
                  <div className="font-medium">{done.service_name}</div>
                  <div className="text-muted-foreground">{fmtTz(done.start_at, tz, "EEEE d MMMM · HH:mm")} – {fmtTz(done.end_at, tz, "HH:mm")}</div>
                  <div className="text-muted-foreground">{b.name}</div>
                </div>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button variant="outline" asChild><a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer"><CalendarPlus /> {copy.booking.gcal}</a></Button>
                  <Button variant="outline" onClick={() => downloadIcs(event)}><Download /> {copy.booking.ics}</Button>
                  <Button variant="brand" asChild><Link to="/me">{copy.booking.myBookings}</Link></Button>
                </div>
              </div>
            ) : step === 1 ? (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">{copy.booking.chooseService}</h2>
                {services.length === 0 && <p className="text-sm text-muted-foreground">No services available yet.</p>}
                {services.map((s) => (
                  <div key={s.id} className={cn("surface lift flex items-center gap-4 p-4", search.service === s.id && "ring-2 ring-brand")}>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{s.name}</div>
                      {s.description && <p className="line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
                      <div className="mt-1 flex items-center gap-3 text-sm"><span className="flex items-center gap-1 text-muted-foreground"><Clock className="size-3.5" />{s.duration_min} min</span><span className="font-medium">{money(s.price, b.currency)}</span></div>
                    </div>
                    <Button variant="brand" className="h-11" onClick={() => set({ service: s.id, step: 2, time: undefined })}>{copy.booking.book}</Button>
                  </div>
                ))}
              </div>
            ) : step === 2 && service ? (
              <div>
                <button onClick={() => set({ step: 1 })} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{service.name} · {service.duration_min} min</button>
                <h2 className="mb-4 text-lg font-semibold">{copy.booking.chooseTime}</h2>
                <SlotPicker slug={b.slug} serviceId={service.id} tz={tz} maxAdvanceDays={b.max_advance_days} openWeekdays={[...new Set(rules.map((r) => r.weekday))]}
                  date={date} time={search.time ?? null} onDate={(d) => set({ date: d, time: undefined })} onTime={(t) => set({ time: t })} />
              </div>
            ) : step === 3 && service && search.time ? (
              <div className="space-y-4">
                <button onClick={() => set({ step: 2 })} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{copy.common.back}</button>
                <h2 className="text-lg font-semibold">{copy.booking.confirmTitle}</h2>
                <div className="surface p-5">
                  <div className="eyebrow">{b.name}</div>
                  <div className="mt-1 text-xl font-semibold">{service.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{fmtTz(search.time, tz, "EEEE d MMMM · HH:mm")} · {service.duration_min} min · {money(service.price, b.currency)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{copy.booking.timezone} {tz}</div>
                </div>
                {!hydrated || account.isLoading ? (
                  <div className="grid h-24 place-items-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
                ) : !account.data ? (
                  <div className="surface p-5">
                    <h3 className="font-semibold">{copy.booking.signInToBook}</h3>
                    <p className="mb-5 text-sm text-muted-foreground">{copy.booking.signInSub}</p>
                    <AuthPanel redirect={here} defaultTab="signup" onSignedIn={() => { qc.invalidateQueries({ queryKey: ["account"] }); router.invalidate(); }} />
                  </div>
                ) : (
                  <>
                    {!account.data.profile?.phone && (
                      <Field label={copy.booking.phone} htmlFor="bk-phone"><Input id="bk-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12 rounded-xl" /></Field>
                    )}
                    <Field label={copy.booking.notes} htmlFor="bk-notes"><Textarea id="bk-notes" rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl" /></Field>
                    <p className="text-xs text-muted-foreground">Booking as {account.data.profile?.full_name || account.data.email}. Free cancellation up to {b.cancellation_window_hours}h before.</p>
                  </>
                )}
              </div>
            ) : (
              <Button variant="ghost" onClick={() => set({ step: 1 })}>{copy.booking.chooseService}</Button>
            )}
          </motion.section>
        </AnimatePresence>
      </div>

      {!done && ((step === 2 && search.time) || (step === 3 && account.data)) && (
        <div className="glass fixed inset-x-0 bottom-0 z-20 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-2xl items-center gap-4">
            <div className="min-w-0 flex-1 text-sm">
              <div className="truncate font-medium">{service?.name}</div>
              <div className="text-muted-foreground">{search.time && fmtTz(search.time, tz, "EEE d MMM · HH:mm")}</div>
            </div>
            {step === 2 ? (
              <Button variant="brand" size="lg" onClick={() => set({ step: 3 })}>{copy.common.continue}</Button>
            ) : (
              <Button variant="brand" size="lg" onClick={confirm} disabled={busy}>{busy && <Loader2 className="animate-spin" />}{copy.booking.confirm}</Button>
            )}
          </div>
        </div>
      )}
      <footer className="mt-16 flex justify-center pb-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">Powered by <Logo className="scale-90" /></span>
      </footer>
    </div>
  );
}

function Unavailable() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground"><SearchX className="size-6" /></div>
        <h1 className="text-2xl font-semibold">{copy.booking.unavailableTitle}</h1>
        <p className="mx-auto mt-2 max-w-sm text-muted-foreground">{copy.booking.unavailableSub}</p>
        <Button asChild variant="outline" className="mt-6"><Link to="/">Go to Slotly</Link></Button>
      </div>
    </div>
  );
}
