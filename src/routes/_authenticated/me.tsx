import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { Suspense } from "react";
import { Logo, PageSkeleton } from "@/components/brand";
import { accountQuery } from "@/lib/account";
import { cn } from "@/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/me")({
  beforeLoad: async ({ context }) => {
    const acc = await context.queryClient.ensureQueryData(accountQuery);
    if (!acc) throw redirect({ to: "/auth" });
    if (acc.roles.length === 0) throw redirect({ to: "/onboarding" });
  },
  component: MeLayout,
});

function MeLayout() {
  const { data } = useSuspenseQuery(accountQuery);
  const link = "flex h-10 items-center rounded-xl px-3 text-sm font-medium text-muted-foreground hover:text-foreground";
  return (
    <div className="min-h-screen">
      <header className="glass sticky top-0 z-30 border-b">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-4">
          <Logo to="/me" />
          <nav className="ml-auto flex items-center gap-1" aria-label="Account">
            {data?.business && <Link to="/app/dashboard" className={link}>Business</Link>}
            <Link to="/me" activeOptions={{ exact: true }} className={link} activeProps={{ className: cn(link, "bg-card text-foreground shadow-hairline") }}>Bookings</Link>
            <Link to="/me/profile" className={link} activeProps={{ className: cn(link, "bg-card text-foreground shadow-hairline") }}>Profile</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Suspense fallback={<PageSkeleton />}><Outlet /></Suspense>
      </main>
    </div>
  );
}
