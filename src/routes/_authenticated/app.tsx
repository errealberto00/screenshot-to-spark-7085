import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Clock, LayoutDashboard, Scissors, Search, Settings, UserRound, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo, PageSkeleton } from "@/components/brand";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { accountQuery } from "@/lib/account";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import type { Booking } from "@/lib/account";

export const Route = createFileRoute("/_authenticated/app")({
  beforeLoad: async ({ context }) => {
    const acc = await context.queryClient.ensureQueryData(accountQuery);
    if (!acc) throw redirect({ to: "/auth" });
    if (!acc.roles.includes("business_owner")) throw redirect({ to: acc.roles.length ? "/me" : "/onboarding" });
    if (!acc.business) throw redirect({ to: "/setup" });
  },
  component: AppLayout,
});

const NAV = [
  { to: "/app/dashboard", label: copy.app.dashboard, icon: LayoutDashboard },
  { to: "/app/bookings", label: copy.app.bookings, icon: CalendarDays },
  { to: "/app/services", label: copy.app.services, icon: Scissors },
  { to: "/app/availability", label: copy.app.availability, icon: Clock },
  { to: "/app/settings", label: copy.app.settings, icon: Settings },
  { to: "/app/profile", label: copy.app.profile, icon: UserRound },
] as const;

function AppLayout() {
  const { data: acc } = useSuspenseQuery(accountQuery);
  const business = acc!.business!;
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [cmdOpen, setCmdOpen] = useState(false);
  const qc = useQueryClient();

  // Live bookings
  useEffect(() => {
    const ch = supabase
      .channel(`bookings-${business.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `business_id=eq.${business.id}` }, (p) => {
        qc.invalidateQueries({ queryKey: ["bookings", business.id] });
        if (p.eventType === "INSERT") {
          const b = p.new as Booking;
          if (b.customer_id) toast.success(copy.app.newBookingToast(b.customer_name));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [business.id, qc]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmdOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r bg-sidebar p-4 md:flex">
        <Logo to="/app/dashboard" className="px-2 py-1" />
        <button onClick={() => setCmdOpen(true)} className="mt-6 flex h-10 items-center gap-2 rounded-xl border bg-card px-3 text-sm text-muted-foreground hover:bg-accent">
          <Search className="size-4" /> <span className="flex-1 text-left">Search</span>
          <kbd className="rounded border bg-muted px-1.5 font-mono text-[10px]">⌘K</kbd>
        </button>
        <nav className="mt-6 space-y-0.5" aria-label="Business">
          {NAV.map((n) => {
            const active = path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={cn("relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors", active ? "text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
                {active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl border bg-card shadow-hairline" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                <n.icon className="relative size-4" />
                <span className="relative">{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl border bg-card p-3">
          <div className="truncate text-sm font-semibold">{business.name}</div>
          <a href={`/b/${business.slug}`} target="_blank" rel="noreferrer" className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-primary">
            /b/{business.slug} <ExternalLink className="size-3" />
          </a>
          {!business.is_published && <div className="mt-2 rounded-lg bg-status-pending px-2 py-1 text-xs text-status-pending-foreground">Page unpublished</div>}
        </div>
      </aside>

      <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 md:hidden">
        <Logo to="/app/dashboard" />
        <button onClick={() => setCmdOpen(true)} aria-label="Search" className="grid size-10 place-items-center rounded-xl hover:bg-accent"><Search className="size-4" /></button>
      </header>

      <main className="min-w-0 px-4 pb-28 pt-6 sm:px-8 md:pb-10 md:pt-10">
        <div className="mx-auto max-w-6xl">
          <AnimatePresence mode="wait">
            <motion.div key={path} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <nav className="glass fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Business mobile">
        {NAV.slice(0, 5).map((n) => {
          const active = path.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
              <n.icon className="size-5" />{n.label}
            </Link>
          );
        })}
      </nav>
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} businessId={business.id} />
    </div>
  );
}

function CommandPalette({ open, onOpenChange, businessId }: { open: boolean; onOpenChange: (o: boolean) => void; businessId: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Booking[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const term = q.trim().replace(/[%,()]/g, "");
      const { data } = await supabase.from("bookings").select("*").eq("business_id", businessId)
        .or(`customer_name.ilike.%${term}%,customer_email.ilike.%${term}%`).order("start_at", { ascending: false }).limit(8);
      setResults(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q, businessId]);
  const go = (to: string, search?: Record<string, string>) => { onOpenChange(false); navigate({ to, search } as never); };
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={copy.app.search} value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Go to">
          {NAV.map((n) => <CommandItem key={n.to} onSelect={() => go(n.to)}><n.icon /> {n.label}</CommandItem>)}
        </CommandGroup>
        {results.length > 0 && (
          <CommandGroup heading="Bookings">
            {results.map((b) => (
              <CommandItem key={b.id} value={`${b.customer_name} ${b.customer_email ?? ""} ${b.id}`} onSelect={() => go("/app/bookings", { view: "list", open: b.id })}>
                <CalendarDays /> {b.customer_name} · {b.service_name} · {new Date(b.start_at).toLocaleDateString()}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
