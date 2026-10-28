import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { z } from "zod";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AuthPanel } from "@/features/auth/auth-panel";
import { Logo } from "@/components/brand";
import { copy } from "@/lib/copy";
import { accountQuery, homeFor, REDIRECT_KEY, safeRedirect } from "@/lib/account";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional(), tab: z.enum(["login", "signup"]).optional() }),
  head: () => ({
    meta: [
      { title: "Log in or sign up — Slotly" },
      { name: "description", content: "Log in or create your Slotly account to manage bookings." },
      { property: "og:title", content: "Log in — Slotly" },
      { property: "og:description", content: "Access your Slotly bookings and business dashboard." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const proceed = useCallback(async () => {
    const stored = sessionStorage.getItem(REDIRECT_KEY);
    sessionStorage.removeItem(REDIRECT_KEY);
    const target = safeRedirect(search.redirect) ?? safeRedirect(stored);
    await qc.invalidateQueries({ queryKey: ["account"] });
    const acc = await qc.fetchQuery(accountQuery);
    if (!acc) return;
    const dest = acc.roles.length === 0 && !target ? "/onboarding" : target ?? homeFor(acc);
    navigate({ href: dest, replace: true });
  }, [search.redirect, navigate, qc]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) proceed();
    });
  }, [proceed]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="m-auto w-full max-w-sm py-12">
          <h1 className="text-3xl font-semibold">{copy.auth.title}</h1>
          <p className="mb-8 mt-2 text-sm text-muted-foreground">{copy.auth.sub}</p>
          <AuthPanel redirect={safeRedirect(search.redirect)} defaultTab={search.tab} onSignedIn={proceed} />
        </motion.div>
      </div>
      <div className="relative hidden overflow-hidden border-l bg-primary-soft lg:block">
        <div className="dotgrid absolute inset-0 opacity-60" />
        <div className="relative flex h-full flex-col justify-end p-14">
          <p className="max-w-md text-4xl font-semibold leading-tight">
            Fewer messages. <span className="serif-accent text-primary">More bookings.</span>
          </p>
          <p className="mt-4 max-w-sm text-sm text-primary-soft-foreground">One link for your services, your hours and your calendar.</p>
        </div>
      </div>
    </div>
  );
}
