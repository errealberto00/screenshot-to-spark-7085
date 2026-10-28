import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand";
import { Field } from "@/components/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SlugField, slugify } from "@/features/business/slug-field";
import { ServiceForm } from "@/features/business/service-form";
import { HoursEditor } from "@/features/business/hours-editor";
import { defaultWeek, saveWeek } from "@/features/business/hours";
import { CopyLink } from "@/features/business/share";
import { accountQuery, type Business } from "@/lib/account";
import { copy } from "@/lib/copy";

export const Route = createFileRoute("/_authenticated/setup")({
  head: () => ({ meta: [{ title: "Set up your business — Slotly" }, { name: "description", content: "Create your booking page in four short steps." }] }),
  beforeLoad: async ({ context }) => {
    const acc = await context.queryClient.ensureQueryData(accountQuery);
    if (!acc) throw redirect({ to: "/auth" });
    if (!acc.roles.includes("business_owner")) throw redirect({ to: "/onboarding" });
    return { account: acc };
  },
  component: Setup,
});

const infoSchema = z.object({
  name: z.string().trim().min(2, "Enter your business name").max(120),
  category: z.string().trim().max(60).optional(),
  city: z.string().trim().max(80).optional(),
});

function Setup() {
  const { account } = Route.useRouteContext();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<Business | null>(account.business);
  const [step, setStep] = useState(account.business ? 1 : 0);
  const [slug, setSlug] = useState(account.business?.slug ?? "");
  const [slugOk, setSlugOk] = useState(!!account.business);
  const [week, setWeek] = useState(defaultWeek);
  const [saving, setSaving] = useState(false);
  const f = useForm<z.infer<typeof infoSchema>>({ resolver: zodResolver(infoSchema), defaultValues: { name: account.business?.name ?? "", category: account.business?.category ?? "", city: account.business?.city ?? "" } });

  const saveInfo = f.handleSubmit(async (v) => {
    if (!slugOk) return toast.error("Choose an available page address");
    const payload = { name: v.name, category: v.category || null, city: v.city || null, slug };
    const res = business
      ? await supabase.from("businesses").update(payload).eq("id", business.id).select().single()
      : await supabase.from("businesses").insert({ ...payload, owner_id: account.userId }).select().single();
    if (res.error) return toast.error(res.error.message);
    setBusiness(res.data);
    setStep(1);
  });

  async function finishHours() {
    if (!business) return;
    setSaving(true);
    try {
      await saveWeek(business.id, week);
      const { error } = await supabase.from("businesses").update({ is_published: true }).eq("id", business.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["account"] });
      setStep(3);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="mx-auto flex max-w-2xl items-center justify-between">
        <Logo />
        <span className="text-sm text-muted-foreground">Step {step + 1} of 4</span>
      </div>
      <div className="mx-auto mt-10 max-w-2xl">
        <Progress value={((step + 1) / 4) * 100} className="h-1.5" />
        <div className="mt-3 hidden justify-between text-xs text-muted-foreground sm:flex">
          {copy.setup.steps.map((s, i) => <span key={s} className={i <= step ? "text-foreground" : ""}>{s}</span>)}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.22 }} className="mt-10">
            {step === 0 && (
              <form onSubmit={saveInfo} className="surface space-y-5 p-6 sm:p-8">
                <h1 className="text-2xl font-semibold">{copy.setup.infoTitle}</h1>
                <Field label="Business name" htmlFor="b-name" error={f.formState.errors.name?.message}>
                  <Input id="b-name" className="h-11 rounded-xl" {...f.register("name", { onChange: (e) => { if (!business) setSlug(slugify(e.target.value)); } })} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Category" htmlFor="b-cat"><Input id="b-cat" placeholder="e.g. Hair salon" className="h-11 rounded-xl" {...f.register("category")} /></Field>
                  <Field label="City" htmlFor="b-city"><Input id="b-city" className="h-11 rounded-xl" {...f.register("city")} /></Field>
                </div>
                <Field label="Page address" htmlFor="b-slug"><SlugField id="b-slug" value={slug} onChange={setSlug} onValidity={setSlugOk} /></Field>
                <Button type="submit" size="lg" className="w-full" disabled={f.formState.isSubmitting}>{copy.common.continue}</Button>
              </form>
            )}
            {step === 1 && business && (
              <div className="surface p-6 sm:p-8">
                <h1 className="mb-6 text-2xl font-semibold">{copy.setup.serviceTitle}</h1>
                <ServiceForm submitLabel={copy.common.continue} onSubmit={async (v) => {
                  const { error } = await supabase.from("services").insert({ ...v, business_id: business.id });
                  if (error) { toast.error(error.message); return; }
                  setStep(2);
                }} />
                <Button variant="ghost" className="mt-2 w-full" onClick={() => setStep(0)}>{copy.common.back}</Button>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-5">
                <h1 className="text-2xl font-semibold">{copy.setup.hoursTitle}</h1>
                <HoursEditor value={week} onChange={setWeek} />
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(1)}>{copy.common.back}</Button>
                  <Button size="lg" className="flex-1" onClick={finishHours} disabled={saving}>{saving ? copy.common.saving : "Publish my page"}</Button>
                </div>
              </div>
            )}
            {step === 3 && business && (
              <div className="surface p-8 text-center">
                <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary"><PartyPopper className="size-6" /></div>
                <h1 className="text-3xl font-semibold">{copy.setup.doneTitle}</h1>
                <p className="mt-2 text-muted-foreground">{copy.setup.doneSub}</p>
                <div className="mx-auto mt-6 max-w-md"><CopyLink slug={business.slug} /></div>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button variant="outline" asChild><a href={`/b/${business.slug}`} target="_blank" rel="noreferrer">{copy.setup.preview}</a></Button>
                  <Button onClick={() => navigate({ to: "/app/dashboard" })}>{copy.setup.toDashboard}</Button>
                </div>
                <Link to="/app/settings" className="mt-6 inline-block text-xs text-muted-foreground hover:underline">Add a logo, cover and contacts in Settings</Link>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
