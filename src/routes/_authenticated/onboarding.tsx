import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Loader2, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand";
import { copy } from "@/lib/copy";
import { accountQuery, homeFor, type Role } from "@/lib/account";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — Slotly" }, { name: "description", content: "Choose how you'll use Slotly." }] }),
  beforeLoad: async ({ context }) => {
    const acc = await context.queryClient.ensureQueryData(accountQuery);
    if (acc && acc.roles.length > 0) throw redirect({ href: homeFor(acc) });
  },
  component: Onboarding,
});

function Onboarding() {
  const [busy, setBusy] = useState<Role | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  async function choose(role: Role) {
    setBusy(role);
    const { error } = await supabase.rpc("choose_account_type", { _role: role });
    if (error) {
      setBusy(null);
      return toast.error(error.message);
    }
    await qc.invalidateQueries({ queryKey: ["account"] });
    navigate({ to: role === "business_owner" ? "/setup" : "/me" });
  }
  const options = [
    { role: "business_owner" as Role, icon: Store, t: copy.onboarding.business, d: copy.onboarding.businessSub },
    { role: "customer" as Role, icon: CalendarCheck, t: copy.onboarding.customer, d: copy.onboarding.customerSub },
  ];
  return (
    <div className="min-h-screen px-6 py-8">
      <Logo />
      <div className="mx-auto max-w-3xl py-16 text-center">
        <h1 className="text-4xl font-semibold sm:text-5xl">{copy.onboarding.title}</h1>
        <p className="mt-3 text-muted-foreground">{copy.onboarding.sub}</p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {options.map((o, i) => (
            <motion.button
              key={o.role}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => choose(o.role)}
              disabled={!!busy}
              className={cn("surface lift group p-8 text-left disabled:opacity-60", busy === o.role && "ring-2 ring-primary")}
            >
              <div className="mb-10 grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                {busy === o.role ? <Loader2 className="size-5 animate-spin" /> : <o.icon className="size-5" />}
              </div>
              <div className="text-xl font-semibold">{o.t}</div>
              <p className="mt-2 text-sm text-muted-foreground">{o.d}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
